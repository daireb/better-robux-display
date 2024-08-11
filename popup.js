// popup.js
document.addEventListener('DOMContentLoaded', () => {
	// Load the stored settings
	chrome.storage.sync.get(['hidden', 'showUSD', 'showRobux'], (data) => {
		document.getElementById('showUSD').checked = data.showUSD !== false; // default to true
		document.getElementById('showRobux').checked = data.showRobux || false;
	});

	// Save the settings when changed

	document.getElementById('showUSD').addEventListener('change', (event) => {
		chrome.storage.sync.set({ showUSD: event.target.checked });
	});

	document.getElementById('showRobux').addEventListener('change', (event) => {
		chrome.storage.sync.set({ showRobux: event.target.checked });
	});
});
