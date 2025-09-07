const HIDDEN_TEXT = "???";
const DEVEX_RATE = 0.0038;

const SELECTOR_MAP: Array<{ sel: string; opts?: { useOverride?: boolean; fullLength?: boolean } }> = [
	{ sel: '.rbx-text-navbar-right.text-header', opts: { useOverride: true } },
	{ sel: '#nav-robux-balance', opts: { useOverride: true, fullLength: true } },
	{ sel: '.text-robux.ng-binding' },
	{ sel: 'span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', opts: { fullLength: true } },
	{ sel: 'span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', opts: { fullLength: true } },
	{ sel: 'td.amount.icon-robux-container > span.icon-robux-16x16 + span', opts: { fullLength: true } },
	{ sel: '.text-robux', opts: { useOverride: true, fullLength: true } }
];