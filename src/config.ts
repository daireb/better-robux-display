export const HIDDEN_TEXT = "???";
export const DEVEX_RATE = 0.0038;

// Options for each selector
export interface SelectorOptions {
	useOverride?: boolean;
	fullLength?: boolean;
	isPrice?: boolean;      // If true, show "Free" for 0 values; if false, show "0" (for balances)
	noDisconnect?: boolean;
}

export const SELECTOR_MAP: Array<{ sel: string; opts?: SelectorOptions }> = [
	// Balance displays (navbar) - isPrice: false so 0 shows as "0" not "Free"
	{ sel: '.rbx-text-navbar-right.text-header', opts: { useOverride: true, isPrice: false } },
	{ sel: '#nav-robux-balance', opts: { useOverride: true, fullLength: true, isPrice: false, noDisconnect: true } },
	// Price/value displays - isPrice: true (default) so 0 shows as "Free"
	{ sel: '.text-robux.ng-binding', opts: { isPrice: true } },
	{ sel: 'span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', opts: { fullLength: true, isPrice: false, noDisconnect: true } },
	{ sel: 'span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', opts: { fullLength: true, isPrice: false } },
	{ sel: 'td.amount.icon-robux-container > span.icon-robux-16x16 + span', opts: { fullLength: true, isPrice: true, noDisconnect: true } },
	{ sel: '.text-robux', opts: { useOverride: true, fullLength: true, isPrice: true, noDisconnect: true } }
];