import { getSettings } from './common';
import * as Config from './config'

// ----- Runtime flags (updated from storage settings) -----
let showUSD = false;   // whether to show USD equivalents
let showRobux = true;  // whether to show Robux values

// Optional override values (from extension popup)
let robuxOverride = 0;
let enableOverride = false;

// Caches to avoid reparsing DOM text repeatedly.
// Using WeakMap so entries are garbage-collected with elements.
const ROBUX_AMOUNT_MAP = new WeakMap<Element, number>();
// Track per-element observers so we don't attach multiple observers to the
// same element (which was causing observer proliferation and CPU overload).
const OBSERVER_MAP = new WeakMap<Element, MutationObserver>();

// ----- Formatting helpers -----
function formatNumberLong(num: number): string {
	// Use the user's preferred locale for numeric formatting.
	const userLocale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;

	const options = Number.isInteger(num)
		? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
		: { minimumFractionDigits: 2, maximumFractionDigits: 2 };

	return new Intl.NumberFormat(userLocale, options).format(num);
}

/**
 * Format a numeric value for compact display.
 * - When fullLength is true, show a locale-aware long format (e.g. "1,234.00").
 * - Otherwise, use compact suffixes (K, M, B, T) with a fixed precision.
 */
function formatNumber(num: number, fullLength = false): string {
	if (fullLength) return formatNumberLong(num);

	const sign = Math.sign(num) >= 0 ? '' : '-';
	const absNum = Math.abs(num);

	if (absNum >= 1e12) return sign + parseFloat((absNum / 1e12).toPrecision(3)) + 'T+';
	if (absNum >= 1e9) return sign + parseFloat((absNum / 1e9).toPrecision(3)) + 'B+';
	if (absNum >= 1e6) return sign + parseFloat((absNum / 1e6).toPrecision(3)) + 'M+';
	if (absNum >= 1e3) return sign + parseFloat((absNum / 1e3).toPrecision(3)) + 'K+';

	return sign + parseFloat(absNum.toFixed(2)).toString();
}

/**
 * Build the final text to place into the DOM for a given Robux value.
 * Respects the global flags `showUSD` and `showRobux`.
 */
function formatRobuxData(robuxAmount: number, usdAmount: number, fullLength = false): string {
	if ((showUSD || showRobux) && robuxAmount === 0) return "Free";
	if (showUSD && !showRobux) return `$${formatNumber(usdAmount, fullLength)}`;
	if (showRobux && !showUSD) return `${formatNumber(robuxAmount, fullLength)}`;
	if (showRobux && showUSD) return `${formatNumber(robuxAmount, fullLength)} ($${formatNumber(usdAmount)})`;
	return Config.HIDDEN_TEXT;
}

// ----- DOM / parsing helpers -----
function getElementText(el: Element): string {
	// Normalize textContent access and trim whitespace.
	return (el.textContent || '').trim();
}

function containsCurrencySymbol(text: string): boolean {
	// If the element already contains a $ or a question mark placeholder, we skip updating it.
	return text.includes('$') || text.includes('?');
}

/**
 * Parse a raw text representation of Robux into a numeric value.
 * @param text The raw text content to parse, e.g. "1.2K", "Free", "1234.56"
 * @returns The parsed Robux amount, or 0 for "Free" / empty strings.
 */
function parseRobuxText(text: string): number {
	if (text == "Free" || text === "") {
		return 0;
	}

	let numericText = text;
	let multiplier = 1;

	// Look for common shorthand suffixes (case-insensitive).
	const suffixMatch = numericText.match(/[KMB]/i);
	if (suffixMatch) {
		const suffix = suffixMatch[0].toUpperCase();
		if (suffix === 'B') multiplier = 1e9;
		else if (suffix === 'M') multiplier = 1e6;
		else if (suffix === 'K') multiplier = 1e3;

		// Remove the suffix character so we can parse the numeric part.
		numericText = numericText.replace(/[^0-9.]/g, '');
	} else {
		// Strip everything except digits and dot for parsing.
		numericText = numericText.replace(/[^0-9.]/g, '');
	}

	const parsed = parseFloat(numericText) * multiplier;
	if (isNaN(parsed)) {
		throw new Error('Invalid Robux amount: ' + text);
	}

	return parsed;
}

/**
 * Parse a Robux display element's base numeric value.
 * Supports compact suffixes like "K", "M", "B".
 * Caches parsed results in ROBUX_AMOUNT_MAP.
 */
function getBaseRobuxAmount(robuxElement: Element): number {
	if (ROBUX_AMOUNT_MAP.has(robuxElement)) {
		return ROBUX_AMOUNT_MAP.get(robuxElement) as number;
	}

	const rawText = getElementText(robuxElement);
	const robuxAmount = parseRobuxText(rawText);

	ROBUX_AMOUNT_MAP.set(robuxElement, robuxAmount);
	return robuxAmount;
}

/**
 * Update a single element's displayed text according to current settings and options.
 */
function updateRobuxDisplay(robuxElement: Element, options: { useOverride?: boolean; fullLength?: boolean }): void {
	const baseAmount = getBaseRobuxAmount(robuxElement);

	const robuxAmount = options.useOverride && enableOverride
		? robuxOverride
		: baseAmount;

	const usdAmount = robuxAmount * Config.DEVEX_RATE;
	const newText = formatRobuxData(robuxAmount, usdAmount, !!options.fullLength);

	// Only update the DOM when the displayed text would actually change.
	// This prevents creating extra mutations that re-trigger observers.
	if (robuxElement.textContent !== newText) {
		robuxElement.textContent = newText;
	}
}

/**
 * Handle a mutation for a specific Robux element. We disconnect the observer
 * while updating to avoid cycles, then reconnect it.Hi
 */
function handleRobuxMutation(robuxElement: Element, options: { useOverride?: boolean; fullLength?: boolean }, observer?: MutationObserver) {
	// Disconnect first to avoid reacting to our own DOM writes.
	if (observer) observer.disconnect();

	try {
		// Re-read the current text after disconnecting.
		const text = getElementText(robuxElement);

		// If the element already contains a currency symbol or placeholder,
		// there's nothing to do.
		if (containsCurrencySymbol(text)) return;

		updateRobuxDisplay(robuxElement, options);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error updating Robux display:', error);
	} finally {
		// Always reattach the observer so we continue observing future changes.
		if (observer) observer.observe(robuxElement, {
			childList: true,
			characterData: true,
			subtree: true
		});
	}
}

/**
 * Wait for document.body to be available before proceeding.
 * This handles cases where the script runs before DOMContentLoaded.
 * 
 * @returns Promise that resolves when document.body is available.
 */
async function waitForDocumentBody(): Promise<void> {
	if (document.body) return;

	await new Promise<void>((resolve) => {
		let observer: MutationObserver | null = null;

		const cleanup = () => {
			if (observer) {
				observer.disconnect();
				observer = null;
			}
			document.removeEventListener('DOMContentLoaded', onReady);
			window.removeEventListener('load', onReady);
			resolve();
		};

		const onReady = () => {
			if (document.body) cleanup();
		};

		document.addEventListener('DOMContentLoaded', onReady);
		window.addEventListener('load', onReady);

		observer = new MutationObserver(() => {
			if (document.body) cleanup();
		});

		observer.observe(document.documentElement || document, {
			childList: true,
			subtree: true
		});

		// Fallback safety in case none of the above fire for some reason.
		setTimeout(() => {
			if (document.body) cleanup();
		}, 10000);
	});
}

/**
 * Observe elements that match `selector`. When elements appear, attach a
 * mutation observer to each so we can update them live.
 */
function observeRobuxElement(selector: string, options: { useOverride?: boolean; followOverride?: boolean; fullLength?: boolean; noDisconnect?: boolean } = {}) {
	options.followOverride = options.followOverride !== undefined ? options.followOverride : false;
	options.fullLength = options.fullLength !== undefined ? options.fullLength : false;
	options.noDisconnect = options.noDisconnect !== undefined ? options.noDisconnect : false;

	const initialObserver = new MutationObserver((mutations, obs) => {
		const robuxElements = document.querySelectorAll(selector);

		robuxElements.forEach(robuxElement => {
			// Avoid creating multiple observers for the same element.
			let robuxObserver = OBSERVER_MAP.get(robuxElement);
			if (!robuxObserver) {
				robuxObserver = new MutationObserver(() => {
					handleRobuxMutation(robuxElement, options, robuxObserver);
				});

				robuxObserver.observe(robuxElement, {
					childList: true,
					characterData: true,
					subtree: true
				});

				OBSERVER_MAP.set(robuxElement, robuxObserver);
			}

			// Run an initial update for the element using the existing/new observer.
			handleRobuxMutation(robuxElement, options, robuxObserver);
		});

		if (robuxElements.length > 0 && !options.noDisconnect) obs.disconnect();
	});

	initialObserver.observe(document.body, {
		childList: true,
		subtree: true
	});
}

// Refresh all known Robux display elements using current settings.
function refreshPageContent(): void {
	Config.SELECTOR_MAP.forEach(entry => {
		const nodes = document.querySelectorAll(entry.sel);
		nodes.forEach(node => {
			try {
				updateRobuxDisplay(node, entry.opts || {});
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('Failed to refresh element', entry.sel, err);
			}
		});
	});
}

/**
 * Initialize content script: load settings and register observers.
 */
async function initContent(): Promise<void> {
	const data = await getSettings();

	showUSD = data.showUSD !== false;
	showRobux = data.showRobux !== false;
	robuxOverride = parseInt((data.robuxOverride as any) as string) || 0;
	enableOverride = data.enableOverride || false;

	// Register observers after settings are loaded so they use the correct initial state
	await waitForDocumentBody();

	observeRobuxElement('.rbx-text-navbar-right.text-header', { useOverride: true }); // Top-right robux display in navbar
	observeRobuxElement('#nav-robux-balance', { useOverride: true, fullLength: true, noDisconnect: true }); // Detailed robux in navbar dropdown

	observeRobuxElement('.text-robux.ng-binding');
	observeRobuxElement('span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', { fullLength: true, noDisconnect: true });
	observeRobuxElement('span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', { fullLength: true });
	observeRobuxElement('td.amount.icon-robux-container > span.icon-robux-16x16 + span', { noDisconnect: true, fullLength: true });
	observeRobuxElement('.text-robux', { noDisconnect: true, fullLength: true });

	// Listen for storage changes and apply them live
	if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
		chrome.storage.onChanged.addListener((changes, areaName) => {
			if (areaName !== 'sync') return;

			if (changes.showUSD) showUSD = changes.showUSD.newValue !== false;
			if (changes.showRobux) showRobux = changes.showRobux.newValue !== false;
			if (changes.robuxOverride) {
				// robuxOverride may be saved as string from the popup
				const raw = changes.robuxOverride.newValue as any;
				robuxOverride = parseInt(raw as string) || 0;
			}
			if (changes.enableOverride) enableOverride = !!changes.enableOverride.newValue;

			// Immediately refresh all observed elements
			try {
				refreshPageContent();
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('Error during refreshAll', err);
			}
		});
	}
}

initContent();