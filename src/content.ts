import { getSettings } from './common';
import type { BalanceMode } from './common';
import * as Config from './config'
import type { SelectorOptions } from './config'

// ----- Runtime flags (updated from storage settings) -----
let showUSD = false;   // whether to show USD equivalents
let showRobux = true;  // whether to show Robux values

// Balance display mode: 'show' (real value), 'hide' (???), 'override' (custom value)
let balanceMode: BalanceMode = 'show';
let robuxOverride = 0;

// Data attribute name for storing the original Robux value
const DATA_ATTR = 'data-brd-original';

// Track per-element observers so we don't attach multiple observers to the
// same element (which was causing observer proliferation and CPU overload).
const OBSERVER_MAP = new WeakMap<Element, MutationObserver>();

// ----- Data attribute helpers -----
function getOriginalRobux(el: Element): number | null {
	const stored = el.getAttribute(DATA_ATTR);
	return stored !== null ? parseFloat(stored) : null;
}

function setOriginalRobux(el: Element, value: number): void {
	el.setAttribute(DATA_ATTR, value.toString());
}

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

/** Options for formatting Robux data */
interface FormatOptions {
	fullLength?: boolean;
	isPrice?: boolean;  // If true, show "Free" for 0; if false, show "0" (for balances)
}

/**
 * Build the final text to place into the DOM for a given Robux value.
 * Respects the global flags `showUSD` and `showRobux`.
 */
function formatRobuxData(robuxAmount: number, usdAmount: number, options: FormatOptions = {}): string {
	const { fullLength = false, isPrice = true } = options;

	// Hide the user's own balance while keeping prices visible
	if (balanceMode === 'hide' && !isPrice) return Config.HIDDEN_TEXT;
	
	// Only show "Free" for prices (items), not for balances (navbar)
	if ((showUSD || showRobux) && robuxAmount === 0 && isPrice) return "Free";
	
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
 * Compute the expected formatted output for a given original Robux value.
 * Used to detect if we caused a mutation vs Roblox updating the value.
 */
function computeExpectedOutput(originalRobux: number, options: SelectorOptions): string {
	const displayAmount = (options.useOverride && balanceMode === 'override') ? robuxOverride : originalRobux;
	const usdAmount = displayAmount * Config.DEVEX_RATE;
	return formatRobuxData(displayAmount, usdAmount, {
		fullLength: options.fullLength,
		isPrice: options.isPrice
	});
}

/**
 * Handle a mutation for a specific Robux element.
 * Uses data attributes to detect whether Roblox updated the value or we did.
 */
function handleRobuxMutation(robuxElement: Element, options: SelectorOptions, observer?: MutationObserver) {
	// Disconnect first to avoid reacting to our own DOM writes.
	if (observer) observer.disconnect();

	try {
		const currentText = getElementText(robuxElement);
		
		// Skip empty elements - Roblox hasn't populated them yet
		if (currentText === '') return;
		
		const storedOriginal = getOriginalRobux(robuxElement);
		
		if (storedOriginal !== null) {
			// Element was processed before - check if Roblox changed it
			const expectedOutput = computeExpectedOutput(storedOriginal, options);
			if (currentText === expectedOutput) {
				// We caused this mutation, ignore it
				return;
			}
			// Text differs from what we'd write - Roblox updated it, re-parse below
		}
		
		// Parse the current text as the new original value
		const robuxAmount = parseRobuxText(currentText);
		setOriginalRobux(robuxElement, robuxAmount);
		
		// Compute and apply the formatted display
		const displayAmount = (options.useOverride && balanceMode === 'override') ? robuxOverride : robuxAmount;
		const usdAmount = displayAmount * Config.DEVEX_RATE;
		const formatted = formatRobuxData(displayAmount, usdAmount, {
			fullLength: options.fullLength,
			isPrice: options.isPrice
		});
		
		// Only update DOM if the text would actually change
		if (robuxElement.textContent !== formatted) {
			robuxElement.textContent = formatted;
		}
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
function observeRobuxElement(selector: string, options: SelectorOptions = {}) {
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
// This is called when settings change (e.g., user toggles USD display).
function refreshPageContent(): void {
	Config.SELECTOR_MAP.forEach(entry => {
		const nodes = document.querySelectorAll(entry.sel);
		const options = entry.opts || {};
		
		nodes.forEach(node => {
			try {
				// Use the stored original value if available
				const storedOriginal = getOriginalRobux(node);
				if (storedOriginal === null) {
					// Element hasn't been processed yet, skip
					return;
				}
				
				// Re-compute the formatted display with current settings
				const displayAmount = (options.useOverride && balanceMode === 'override') ? robuxOverride : storedOriginal;
				const usdAmount = displayAmount * Config.DEVEX_RATE;
				const formatted = formatRobuxData(displayAmount, usdAmount, {
					fullLength: options.fullLength,
					isPrice: options.isPrice
				});
				
				if (node.textContent !== formatted) {
					node.textContent = formatted;
				}
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
	balanceMode = data.balanceMode || 'show';

	// Register observers after settings are loaded so they use the correct initial state
	await waitForDocumentBody();

	// Register observers for all selectors defined in config
	Config.SELECTOR_MAP.forEach(entry => {
		observeRobuxElement(entry.sel, entry.opts || {});
	});

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
			if (changes.balanceMode) balanceMode = changes.balanceMode.newValue || 'show';

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