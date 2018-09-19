/**
 * Functionality for the mobile Account Session History section
 */
mobile.account.history = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // Cache selector
        this.$page = $('.mobile.session-history-page');

        // Initialise functionality
        this.initBackButton();
        this.fetchSessionHistory();

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the back arrow icon in the header to go back to the main My Account page
     */
    initBackButton: function() {

        'use strict';

        // On Back button click/tap
        this.$page.find('.fm-icon.back').off('tap').on('tap', function() {

            // Render the Invites page again
            loadSubPage('fm/account/');
            return false;
        });
    },

    /**
     * Fetch the account's session history from the API
     */
    fetchSessionHistory: function() {

        'use strict';

        // Make User Session List API request, x: 1 loads the session IDs which is useful for expiring the session
        api_req({ a: 'usl', x: 1 }, {
            callback: function(sessions) {

                if (typeof sessions !== 'object') {
                    sessions = [];
                }

                // Sort by most recent datetime
                sessions.sort(function(a, b) {
                    if (a[0] < b[0]) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                });

                // Display the results
                mobile.account.history.displaySessionHistory(sessions);
                mobile.account.history.initRowCloseSessionButton();
                mobile.account.history.initCloseOtherSessionsButton();
            }
        });
    },

    /**
     * Displays the session history
     * @param {Array} sessions An array of session objects to be rendered
     */
    displaySessionHistory: function(sessions) {

        'use strict';

        // Cache selectors
        var $page = mobile.account.history.$page;
        var $sessionHistoryList = $page.find('.session-history-list');
        var $rowTemplate = $sessionHistoryList.find('.session-history.template');

        var outputHtml = '';

        // Loop through the session items
        for (var i = 0; i < sessions.length; i++) {

            // Clone the HTML template
            var $sessionHistoryRow = $rowTemplate.clone().removeClass('template');

            // Format data
            var session = sessions[i];
            var timestamp = session[0];
            var dateTime = time2date(timestamp);
            var userAgent = session[2];
            var browser = browserdetails(userAgent);
            var browserName = browser.nameTrans;
            var ipAddress = session[3];
            var countryCode = session[4];
            var countryDetails = countrydetails(countryCode);
            var countryName = countryDetails.name;
            var countryIcon = countryDetails.icon;
            var sessionId = session[6];
            var currentSession = session[5];
            var activeSession = session[7];

            // If unknown country code use question mark gif
            if (!countryIcon || countryIcon === '??.gif') {
                countryIcon = 'ud.gif';
            }

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            if (browser.isExtension) {
                browserName += ' (+' + l[7683] + ')';
            }

            var statusClass = 'current';

            // If not the current session
            if (!currentSession) {
                if (activeSession) {
                    statusClass = 'active';
                }
                else {
                    statusClass = 'expired';
                }
            }

            // Set the max number to display
            var sessionLimit = 100;

            // Don't show more than the limit
            if (i >= sessionLimit) {
                continue;
            }

            // Update the row template
            $sessionHistoryRow.addClass(statusClass);
            $sessionHistoryRow.find('.sh-round-button').attr('data-session-id', sessionId);
            $sessionHistoryRow.find('.sh-item-date').text(dateTime);
            $sessionHistoryRow.find('.sh-item-device').text(browserName);
            $sessionHistoryRow.find('.sh-item-country').text(countryName);
            $sessionHistoryRow.find('.sh-item-ip').text(ipAddress);
            $sessionHistoryRow.find('.sh-item-icon img').attr('src', staticpath + 'images/flags/' + countryIcon);

            // Update the current output
            outputHtml += $sessionHistoryRow.prop('outerHTML');
        }

        // Remove other rows but not the template so that it can be re-rendered
        $sessionHistoryList.find('.session-history').not('.template').remove();

        // Render the output all at once
        $sessionHistoryList.safeAppend(outputHtml);
    },

    /**
     * Initialises the buttons for each row of session information and the button will close the individual session
     */
    initRowCloseSessionButton: function() {

        'use strict';

        // Cache selectors
        var $page = mobile.account.history.$page;
        var $sessionHistoryList = $page.find('.session-history-list');
        var $logoutButtons = $sessionHistoryList.find('.sh-round-button');

        // On all the logout session buttons
        $logoutButtons.off('tap').on('tap', function() {

            // Get the session ID
            var $button = $(this);
            var sessionId = $button.attr('data-session-id');

            loadingDialog.show();

            // Run API request User Session Remove (usr) to expire a session
            api_req({a: 'usr', s: [sessionId]}, {
                callback: function() {

                    loadingDialog.hide();

                    // Show the session as expired
                    $button.parent().removeClass('active').addClass('expired');
                }
            });

            return false;
        });
    },

    /**
     * Initialises the Close Other Sessions button to show a confirmation dialog
     */
    initCloseOtherSessionsButton: function() {

        'use strict';

        // Cache selectors
        var $page = mobile.account.history.$page;
        var $closeOtherSessionsButton = $page.find('.close-other-sessions-button');
        var $closeOtherSessionsDialog = $('.sh-dialog');

        // On button click/tap
        $closeOtherSessionsButton.off('tap').on('tap', function() {

            // Initialise dialog buttons
            mobile.account.history.initConfirmCloseOtherSessionsButton();
            mobile.account.history.initCancelAndCloseButtons();

            // Show the dialog
            $closeOtherSessionsDialog.removeClass('hidden');

            return false;
        });
    },

    /**
     * Initialise the button on the confirm dialog to close all the other open sessions (except the current session)
     */
    initConfirmCloseOtherSessionsButton: function() {

        'use strict';

        // Cache selectors
        var $closeOtherSessionsDialog = $('.sh-dialog');
        var $closeOtherSessionsButton = $closeOtherSessionsDialog.find('.confirm-close-other-sessions-button');

        // On button click/tap
        $closeOtherSessionsButton.off('tap').on('tap', function() {

            loadingDialog.show();

            // Expire all sessions but not the current one
            api_req({a: 'usr', ko: 1}, {
                callback: function() {

                    // Hide the dialog
                    $closeOtherSessionsDialog.addClass('hidden');

                    // Refetch and display the session history
                    mobile.account.history.fetchSessionHistory();

                    // Close the loading spinner
                    loadingDialog.hide();
                }
            });

            return false;
        });
    },

    /**
     * Initialise the Cancel and Close buttons on the dialog
     */
    initCancelAndCloseButtons: function() {

        'use strict';

        // Cache selectors
        var $closeOtherSessionsDialog = $('.sh-dialog');
        var $buttons = $closeOtherSessionsDialog.find('.fm-dialog-close, .cancel');

        // On button click/tap
        $buttons.off('tap').on('tap', function() {

            // Hide the dialog
            $closeOtherSessionsDialog.addClass('hidden');

            return false;
        });
    }
};
