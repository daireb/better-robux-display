// Settings types and helpers
interface Settings {
	showUSD?: boolean;
	showRobux?: boolean;
	robuxOverride?: number | string;
	enableOverride?: boolean;
}

function getSettings(): Promise<Settings> {
	return new Promise(resolve => {
		chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'enableOverride'], (data: any) => {
			resolve(data || {});
		});
	});
}