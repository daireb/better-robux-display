let robuxOverride = -1;
let showUSD = true;
let showRobux = false;

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

    if (num >= 1000000) {
        return parseFloat((num / 1000000).toPrecision(3)) + 'M+'; // Millions with one decimal place
    } else if (num >= 1000) {
        return parseFloat((num / 1000).toPrecision(3)) + 'K+'; // Thousands without a decimal place
    } else {
        return parseFloat(num.toFixed(2)); // Return the original number if it's below 1000
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
function updateRobuxDisplay(robuxElement, fullLength) {
    let rawText = robuxElement.textContent.trim(); // Trim to remove any leading/trailing whitespace
    let robuxText = rawText;
    let multiplier = 1;

    // Handling different formats of Robux amounts
    if (robuxText.includes('M')) {
        multiplier = 1e6;
        robuxText = robuxText.replace('M', ''); // Remove 'M'
    } else if (robuxText.includes('K')) {
        multiplier = 1e3;
        robuxText = robuxText.replace('K', ''); // Remove 'K'
    }

    // Remove any other non-numeric characters (like commas)
    robuxText = robuxText.replace(/[^0-9.]/g, '');

    const robuxAmount = parseFloat(robuxText) * multiplier;

    // Check if robuxAmount is a valid number before proceeding
    if (isNaN(robuxAmount)) {
        throw new Error("Invalid Robux amount: " + rawText);
    }

    const usdAmount = robuxAmount * 0.0035;
    robuxElement.textContent = formatRobuxData(robuxAmount, usdAmount, fullLength);
}

// Function to handle updates for the observer
function handleRobuxMutation(robuxElement, fullLength, observer) {
    if (robuxElement.textContent.includes('$')) return; // Early exit if this is already formatted text

    if (observer) observer.disconnect();

    try {
        updateRobuxDisplay(robuxElement, fullLength);
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
function observeRobuxElement(selector, fullLength, no_disconnect) {
    const initialObserver = new MutationObserver((mutations, obs) => {
        const robuxElements = document.querySelectorAll(selector);
        //const robuxElement = document.querySelector(selector);

        robuxElements.forEach(robuxElement => {
            // Ensure that each element is observed separately
            const robuxObserver = new MutationObserver(() => {
                handleRobuxMutation(robuxElement, fullLength, robuxObserver);
            });

            // Observe each element for content changes
            robuxObserver.observe(robuxElement, {
                childList: true,
                characterData: true,
                subtree: true
            });

            // Update the display immediately for each element found
            handleRobuxMutation(robuxElement, fullLength, robuxObserver);
        });

        if (robuxElements.length > 0 && !no_disconnect) {
            obs.disconnect(); // Disconnect after the element is found and updated
        }
    });

    // Start observing the entire document body for changes
    initialObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Getting settings

chrome.storage.sync.get(['hidden', 'showUSD', 'showRobux'], (data) => {
    hidden = data.hidden || false;
    showUSD = data.showUSD !== false; // default to true
    showRobux = data.showRobux || false;

    // Now you can use these variables in your script
    console.log('Settings loaded:', { hidden, showUSD, showRobux });

    // Example usage
    if (hidden) {
        console.log('Content is hidden');
        // Perform actions related to hiding content
    }
    if (showUSD) {
        console.log('Displaying USD values');
        // Perform actions related to displaying USD
    }
    if (showRobux) {
        console.log('Displaying Robux values');
        // Perform actions related to displaying Robux
    }
});

// Setting up observers

// Robux Counter on the top right
observeRobuxElement('.rbx-text-navbar-right.text-header');
observeRobuxElement('#nav-robux-balance', true, true);

// Group balance
observeRobuxElement('.text-robux.ng-binding');

// Group revenue summary
observeRobuxElement('span.ng-binding[ng-bind^="$ctrl.revenueSummary"]', true, true);
observeRobuxElement('span.ng-binding[ng-bind^="($ctrl.revenueSummary.itemSaleRobux"]', true)

