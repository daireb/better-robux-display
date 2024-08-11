let showUSD = true;
let showRobux = false;

let robuxOverride = 0;
let enableOverride = false;

const devex_rate = 0.0035;

function formatNumberLong(num) {
    const userLocale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;

    // Determine if the number is an integer
    const options = Number.isInteger(num)
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    return new Intl.NumberFormat(userLocale, options).format(num);
}

function formatNumber(num, fullLength) {
    if (fullLength) {
        return formatNumberLong(num);
    }

    let sign = Math.sign(num) >= 0 ? '' : '-'; // Determine the sign for positive or negative numbers
    let absNum = Math.abs(num);

    if (absNum >= 1e12) {
        return sign + parseFloat((absNum / 1e12).toPrecision(3)) + 'T+'; // Trillions
    } else if (absNum >= 1e9) {
        return sign + parseFloat((absNum / 1e9).toPrecision(3)) + 'B+'; // Billions
    } else if (absNum >= 1e6) {
        return sign + parseFloat((absNum / 1e6).toPrecision(3)) + 'M+'; // Millions
    } else if (absNum >= 1e3) {
        return sign + parseFloat((absNum / 1e3).toPrecision(3)) + 'K+'; // Thousands
    } else {
        return sign + parseFloat(absNum.toFixed(2)); // Return the original number if it's below 1000
    }
}

function formatRobuxData(robuxAmount, usdAmount, fullLength) {
    if (showUSD && !showRobux) {
        return `$${formatNumber(usdAmount, fullLength)}`;
    } else if (showRobux && !showUSD) {
        return `${formatNumber(robuxAmount, fullLength)}`;
    } else if (showRobux && showUSD) {
        return `${formatNumber(robuxAmount, fullLength)} ($${formatNumber(usdAmount)})`;
    } else {
        return "[Hidden]"
    }
}

// Function to convert and display USD next to Robux
function updateRobuxDisplay(robuxElement, options) {
    let rawText = robuxElement.textContent.trim(); // Trim to remove any leading/trailing whitespace
    let robuxText = rawText;
    let multiplier = 1;

    // Handling different formats of Robux amounts
    if (robuxText.includes('B')) {
        multiplier = 1e9;
        robuxText = robuxText.replace('B', ''); // Remove 'B'
    } else if (robuxText.includes('M')) {
        multiplier = 1e6;
        robuxText = robuxText.replace('M', ''); // Remove 'M'
    } else if (robuxText.includes('K')) {
        multiplier = 1e3;
        robuxText = robuxText.replace('K', ''); // Remove 'K'
    }

    // Remove any other non-numeric characters (like commas)
    robuxText = robuxText.replace(/[^0-9.]/g, '');

    const robuxAmount = options.useOverride && enableOverride
        ? robuxOverride
        : parseFloat(robuxText) * multiplier;

    // Check if robuxAmount is a valid number before proceeding
    if (isNaN(robuxAmount)) {
        throw new Error("Invalid Robux amount: " + rawText);
    }

    const usdAmount = robuxAmount * devex_rate;
    robuxElement.textContent = formatRobuxData(robuxAmount, usdAmount, options.fullLength);
}

// Function to handle updates for the observer
function handleRobuxMutation(robuxElement, options, observer) {
    if (robuxElement.textContent.includes('$') || robuxElement.textContent.includes('[')) return; // Early exit if this is already formatted text

    if (observer) observer.disconnect();

    try {
        updateRobuxDisplay(robuxElement, options);
    } catch (error) {
        console.error('Error updating Robux display:', error);
    } finally {
        if (observer) observer.observe(robuxElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

// Function to set up an observer on an element
function observeRobuxElement(selector, options = {}) {
    // Default options
    options.followOverride = options.followOverride !== undefined ? options.followOverride : false;
    options.fullLength = options.fullLength !== undefined ? options.fullLength : false;
    options.noDisconnect = options.noDisconnect !== undefined ? options.noDisconnect : false;

    // Creating Observer
    const initialObserver = new MutationObserver((mutations, obs) => {
        const robuxElements = document.querySelectorAll(selector);

        robuxElements.forEach(robuxElement => {
            // Ensure that each element is observed separately
            const robuxObserver = new MutationObserver(() => {
                handleRobuxMutation(robuxElement, options, robuxObserver);
            });

            // Observe each element for content changes
            robuxObserver.observe(robuxElement, {
                childList: true,
                characterData: true,
                subtree: true
            });

            // Update the display immediately for each element found
            handleRobuxMutation(robuxElement, options, robuxObserver);
        });

        if (robuxElements.length > 0 && !options.noDisconnect) {
            obs.disconnect(); // Disconnect after an element is found and updated
        }
    });

    // Start observing the entire document body for changes
    initialObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Getting settings

chrome.storage.sync.get(['showUSD', 'showRobux', 'robuxOverride', 'enableOverride'], (data) => {
    showUSD = data.showUSD !== false; // default to true
    showRobux = data.showRobux || false;
    robuxOverride = parseInt(data.robuxOverride) || 0;
    enableOverride = data.enableOverride || false;

    // Now you can use these variables in your script
    console.log('Settings loaded:', { showUSD, showRobux, robuxOverride, enableOverride });
});

// Setting up observers

// Robux Counter on the top right
observeRobuxElement('.rbx-text-navbar-right.text-header', { useOverride: true });
observeRobuxElement('#nav-robux-balance', { useOverride: true, fullLength: true, noDisconnect: true });

// Group balance
observeRobuxElement('.text-robux.ng-binding');

// Group revenue summary
observeRobuxElement('span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', { fullLength: true, noDisconnect: true });
observeRobuxElement('span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', { fullLength: true });

// Personal transactions
observeRobuxElement('td.amount.icon-robux-container > span.icon-robux-16x16 + span', { noDisconnect: true, fullLength: true });

// Marketplace Popups
observeRobuxElement('.text-robux', { useOverride: true, noDisconnect: true, fullLength: true });

// It is a known issue that the balance on the "My Transactions" tab doesn't update. It's sort of annoying to do so I didn't do it. 