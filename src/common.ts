// Settings types and helpers
export type BalanceMode = 'show' | 'hide' | 'override';

interface Settings {
	showUSD?: boolean;
	showRobux?: boolean;
	robuxOverride?: number | string;
	balanceMode?: BalanceMode;
}

export function getSettings(): Promise<Settings> {
	return new Promise(resolve => {
		chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'balanceMode'], (data: any) => {
			resolve(data || {});
		});
	});
}