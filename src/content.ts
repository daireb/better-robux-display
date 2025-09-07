import { getSettings } from './common';
import * as Config from './config'

let showUSD = true;
let showRobux = true;

// TODO for some reason this doesn't load until you change it once in the config
let robuxOverride = 0;
let enableOverride = false;

function formatNumberLong(num: number): string {
	const userLocale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;

	const options = Number.isInteger(num)
		? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
		: { minimumFractionDigits: 2, maximumFractionDigits: 2 };

	return new Intl.NumberFormat(userLocale, options).format(num);
}

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

function formatRobuxData(robuxAmount: number, usdAmount: number, fullLength = false): string {
	if (showUSD && !showRobux) return `$${formatNumber(usdAmount, fullLength)}`;
	if (showRobux && !showUSD) return `${formatNumber(robuxAmount, fullLength)}`;
	if (showRobux && showUSD) return `${formatNumber(robuxAmount, fullLength)} ($${formatNumber(usdAmount)})`;
	return Config.HIDDEN_TEXT;
}

function updateRobuxDisplay(robuxElement: Element, options: { useOverride?: boolean; fullLength?: boolean }): void {
	const rawText = (robuxElement.textContent || '').trim();
	let robuxText = rawText;
	let multiplier = 1;

	if (robuxText.includes('B')) {
		multiplier = 1e9;
		robuxText = robuxText.replace('B', '');
	} else if (robuxText.includes('M')) {
		multiplier = 1e6;
		robuxText = robuxText.replace('M', '');
	} else if (robuxText.includes('K')) {
		multiplier = 1e3;
		robuxText = robuxText.replace('K', '');
	}

	robuxText = robuxText.replace(/[^0-9.]/g, '');

	const robuxAmount = options.useOverride && enableOverride
		? robuxOverride
		: parseFloat(robuxText) * multiplier;

	if (isNaN(robuxAmount)) {
		throw new Error('Invalid Robux amount: ' + rawText);
	}

	const usdAmount = robuxAmount * Config.DEVEX_RATE;
	robuxElement.textContent = formatRobuxData(robuxAmount, usdAmount, !!options.fullLength);
}

function handleRobuxMutation(robuxElement: Element, options: { useOverride?: boolean; fullLength?: boolean }, observer?: MutationObserver) {
	if ((robuxElement.textContent || '').includes('$') || (robuxElement.textContent || '').includes('?')) return;

	if (observer) observer.disconnect();

	try {
		updateRobuxDisplay(robuxElement, options);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error updating Robux display:', error);
	} finally {
		if (observer) observer.observe(robuxElement, {
			childList: true,
			characterData: true,
			subtree: true
		});
	}
}

function observeRobuxElement(selector: string, options: { useOverride?: boolean; followOverride?: boolean; fullLength?: boolean; noDisconnect?: boolean } = {}) {
	options.followOverride = options.followOverride !== undefined ? options.followOverride : false;
	options.fullLength = options.fullLength !== undefined ? options.fullLength : false;
	options.noDisconnect = options.noDisconnect !== undefined ? options.noDisconnect : false;

	const initialObserver = new MutationObserver((mutations, obs) => {
		const robuxElements = document.querySelectorAll(selector);

		robuxElements.forEach(robuxElement => {
			const robuxObserver = new MutationObserver(() => {
				handleRobuxMutation(robuxElement, options, robuxObserver);
			});

			robuxObserver.observe(robuxElement, {
				childList: true,
				characterData: true,
				subtree: true
			});

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
export function refreshPageContent(): void {
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

export async function initContent(): Promise<void> {
	const data = await getSettings();

	showUSD = data.showUSD !== false;
	showRobux = data.showRobux !== false;
	robuxOverride = parseInt((data.robuxOverride as any) as string) || 0;
	enableOverride = data.enableOverride || false;

	// Logging for debugging
	// eslint-disable-next-line no-console
	console.log('Settings loaded:', { showUSD, showRobux, robuxOverride, enableOverride });

	// Register observers after settings are loaded so they use the correct initial state
	observeRobuxElement('.rbx-text-navbar-right.text-header', { useOverride: true });
	observeRobuxElement('#nav-robux-balance', { useOverride: true, fullLength: true, noDisconnect: true });
	observeRobuxElement('.text-robux.ng-binding');
	observeRobuxElement('span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', { fullLength: true, noDisconnect: true });
	observeRobuxElement('span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', { fullLength: true });
	observeRobuxElement('td.amount.icon-robux-container > span.icon-robux-16x16 + span', { noDisconnect: true, fullLength: true });
	observeRobuxElement('.text-robux', { useOverride: true, noDisconnect: true, fullLength: true });

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

			// eslint-disable-next-line no-console
			console.log('Storage changed, refreshing displays', { showUSD, showRobux, robuxOverride, enableOverride });

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