// popup.js
document.addEventListener('DOMContentLoaded', () => {
	// Load the stored settings
	chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'enableOverride'], (data) => {
		document.getElementById('showUSD').checked = data.showUSD !== false;
		document.getElementById('showRobux').checked = data.showRobux || false;
		document.getElementById('robuxOverride').value = data.robuxOverride || '';
		document.getElementById('enableOverride').checked = data.enableOverride || false;
	});

	// Save the settings when changed

	document.getElementById('showUSD').addEventListener('change', (event) => {
		chrome.storage.sync.set({ showUSD: event.target.checked });
	});

	document.getElementById('showRobux').addEventListener('change', (event) => {
		chrome.storage.sync.set({ showRobux: event.target.checked });
	});

	document.getElementById('robuxOverride').addEventListener('input', (event) => {
		chrome.storage.sync.set({ robuxOverride: event.target.value });
	});

	document.getElementById('enableOverride').addEventListener('change', (event) => {
		chrome.storage.sync.set({ enableOverride: event.target.checked });
	});
});
