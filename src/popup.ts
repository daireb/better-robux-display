export function initPopup(): void {
	document.addEventListener('DOMContentLoaded', () => {
		const showUSDElem = document.getElementById('showUSD') as HTMLInputElement | null;
		const showRobuxElem = document.getElementById('showRobux') as HTMLInputElement | null;
		const robuxOverrideElem = document.getElementById('robuxOverride') as HTMLInputElement | null;
		const balanceRadios = document.querySelectorAll<HTMLInputElement>('input[name="balanceMode"]');

		// Enable/disable the override text input based on the selected mode
		function updateOverrideInput() {
			const selected = document.querySelector<HTMLInputElement>('input[name="balanceMode"]:checked');
			if (robuxOverrideElem) {
				robuxOverrideElem.disabled = selected?.value !== 'override';
			}
		}

		// Load saved settings
		chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'balanceMode'], (data: any) => {
			if (showUSDElem) showUSDElem.checked = data.showUSD !== false;
			if (showRobuxElem) showRobuxElem.checked = data.showRobux !== false;
			if (robuxOverrideElem) robuxOverrideElem.value = data.robuxOverride || '';

			// Select the correct radio button
			const mode = data.balanceMode || 'show';
			balanceRadios.forEach(radio => {
				radio.checked = radio.value === mode;
			});

			updateOverrideInput();
		});

		// Wire up appearance checkboxes
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

		// Wire up balance mode radios
		balanceRadios.forEach(radio => {
			radio.addEventListener('change', (event) => {
				const target = event.target as HTMLInputElement;
				chrome.storage.sync.set({ balanceMode: target.value });
				updateOverrideInput();
			});
		});

		// Wire up override text input
		if (robuxOverrideElem) {
			robuxOverrideElem.addEventListener('input', (event) => {
				const target = event.target as HTMLInputElement;
				chrome.storage.sync.set({ robuxOverride: target.value });
			});
		}
	});
}

initPopup();

console.log("Better Robux Display popup script loaded");
