// If using IE 11 (https://stackoverflow.com/a/21825207)
if (localStorage.testie11 || (Boolean(window.MSInputMethodContext) && Boolean(document.documentMode))) {

    // Get the Continue Anyway button
    var continueButton = document.getElementById('continue-button');

    // Remove hidden style and add click handler
    continueButton.classList.remove('hidden');
    continueButton.addEventListener('click', function(event) {

        // Prevent default button behaviour
        event.preventDefault();

        // Set flag to allow continuing to site for a small amount of time
        localStorage.setItem('showSiteUpdateAfter', getTimeToShowPageAgain());

        // Get the previous page they were on before being redirected
        var previousPage = (localStorage.getItem('prevPage') !== null) ? '/' + localStorage.getItem('prevPage') : '';
        var redirectPage = window.location.protocol + '//' + window.location.hostname + previousPage;

        // No longer need this stored
        localStorage.removeItem('prevPage');

        // Take them back to the page they were trying to get to
        window.location.replace(redirectPage);
    });
}

/**
 * Get information on when to show the update page again
 * @returns {String} Returns a JSON string of an object with keys:
 *     showAgainDateTime: The timestamp in milliseconds of the earliest time when the update page can be shown again
 *     showAgainDays: The number of days that previously elapsed to arrive at the above timestamp
 */
function getTimeToShowPageAgain() {
    
    'use strict';

    var initialDaysToShowAgain = 14;
    var oneDayInMilliseconds = 86400 * 1000;
    var showSiteUpdateAfter = localStorage.getItem('showSiteUpdateAfter');

    // If they've already seen the update page in the past
    if (showSiteUpdateAfter !== null) {

        // Decode from JSON, and divide previous time in half so the update page is shown again much sooner
        // Starts at 14 days then goes to 7, then 4 (rounded up from 3.5), then 2, then stays at 1 due to rounding
        var updateObject = JSON.parse(showSiteUpdateAfter);
        var showAgainDays = Math.round(updateObject.showAgainDays / 2);

        // Set to show again in x days
        return JSON.stringify({
            showAgainDateTime: (showAgainDays * oneDayInMilliseconds) + Date.now(),
            showAgainDays: showAgainDays
        });
    }
    else {
        // Initialise to show again in 14 days
        return JSON.stringify({
            showAgainDateTime: (initialDaysToShowAgain * oneDayInMilliseconds) + Date.now(),
            showAgainDays: initialDaysToShowAgain
        });
    }
}
