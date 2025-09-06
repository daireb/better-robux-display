let showUSD = true;
let showRobux = true;

let robuxOverride = 0;
let enableOverride = false;

const HIDDEN_TEXT = "???";
const DEVEX_RATE = 0.0038;

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
	return HIDDEN_TEXT;
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

	const usdAmount = robuxAmount * DEVEX_RATE;
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

// Load settings
chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'enableOverride'], (data: any) => {
	showUSD = data.showUSD !== false;
	showRobux = data.showRobux !== false;
	robuxOverride = parseInt(data.robuxOverride) || 0;
	enableOverride = data.enableOverride || false;

	// Logging for debugging
	// eslint-disable-next-line no-console
	console.log('Settings loaded:', { showUSD, showRobux, robuxOverride, enableOverride });
});

// Observers
observeRobuxElement('.rbx-text-navbar-right.text-header', { useOverride: true });
observeRobuxElement('#nav-robux-balance', { useOverride: true, fullLength: true, noDisconnect: true });
observeRobuxElement('.text-robux.ng-binding');
observeRobuxElement('span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', { fullLength: true, noDisconnect: true });
observeRobuxElement('span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', { fullLength: true });
observeRobuxElement('td.amount.icon-robux-container > span.icon-robux-16x16 + span', { noDisconnect: true, fullLength: true });
observeRobuxElement('.text-robux', { useOverride: true, noDisconnect: true, fullLength: true });
