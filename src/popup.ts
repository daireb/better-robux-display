document.addEventListener('DOMContentLoaded', () => {
	chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'enableOverride'], (data: any) => {
		const showUSD = document.getElementById('showUSD') as HTMLInputElement | null;
		const showRobux = document.getElementById('showRobux') as HTMLInputElement | null;
		const robuxOverride = document.getElementById('robuxOverride') as HTMLInputElement | null;
		const enableOverride = document.getElementById('enableOverride') as HTMLInputElement | null;

		if (showUSD) showUSD.checked = data.showUSD !== false;
		if (showRobux) showRobux.checked = data.showRobux !== false;
		if (robuxOverride) robuxOverride.value = data.robuxOverride || '';
		if (enableOverride) enableOverride.checked = data.enableOverride || false;
	});

	const showUSDElem = document.getElementById('showUSD') as HTMLInputElement | null;
	const showRobuxElem = document.getElementById('showRobux') as HTMLInputElement | null;
	const robuxOverrideElem = document.getElementById('robuxOverride') as HTMLInputElement | null;
	const enableOverrideElem = document.getElementById('enableOverride') as HTMLInputElement | null;

	if (showUSDElem) {
		showUSDElem.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;
			chrome.storage.sync.set({ showUSD: target.checked });
		});
	}

	if (showRobuxElem) {
		showRobuxElem.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;
			chrome.storage.sync.set({ showRobux: target.checked });
		});
	}

	if (robuxOverrideElem) {
		robuxOverrideElem.addEventListener('input', (event) => {
			const target = event.target as HTMLInputElement;
			chrome.storage.sync.set({ robuxOverride: target.value });
		});
	}

	if (enableOverrideElem) {
		enableOverrideElem.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;
			chrome.storage.sync.set({ enableOverride: target.checked });
		});
	}
});
