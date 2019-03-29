/**
 * Functionality for the mobile Account Session History section
 */
mobile.account.history = {

    /**
     * jQuery selector for this page
     */
    $page: null,

    /**
     * The maximum number of sessions to display
     * NB: if there are more than 100 active sessions they will all be displayed
     */
    maxSessionsToDisplay: 100,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache selector
        this.$page = $('.mobile.session-history-page');

        // Initialise functionality
        this.fetchSessionHistory();

        // Initialise back button to go back to My Account page
        mobile.initBackButton(this.$page, 'fm/account/');

        // Initialise the top menu
        topmenuUI();

        // Show the account page content
        this.$page.removeClass('hidden');
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

                // Sort by datetime, but group the current and active sessions at the top, then the expired sessions
                var sessionsToDisplay = mobile.account.history.sortAndGroupSessionInformation(sessions);

                // Display the results
                mobile.account.history.displaySessionHistory(sessionsToDisplay);
                mobile.account.history.initRowCloseSessionButton();
                mobile.account.history.initCloseOtherSessionsButton();
            }
        });
    },

    /**
     * Sort the sessions by most recent datetime, but put the current session at the top, then group the active
     * sessions at the top after that, then group the expired sessions after that. Finally, the number of sessions
     * will be truncated to the maximum that need to be shown. Note that if there are more than 100 active sessions
     * they will all be displayed as that is of interest to the user.
     * @param {Array} allSessions The entire array of sessions from the API
     * @returns {Array} Returns the list of sessions to be displayed
     */
    sortAndGroupSessionInformation: function(allSessions) {

        'use strict';

        // Sort the sessions by the most recent datetime
        allSessions.sort(function(sessionA, sessionB) {
            if (sessionA[0] < sessionB[0]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        var activeSessions = [];
        var expiredSessions = [];

        // Loop through the sessions to group the current session at the top,
        // active sessions below that and expired sessions at the bottom
        for (var i = 0; i < allSessions.length; i++) {

            var session = allSessions[i];
            var currentSession = session[5];
            var activeSession = session[7];

            // If the current session put it at as the first item in the array
            if (currentSession) {
                activeSessions.unshift(session);
            }
            else {
                // If an active session, add to the array of active sessions
                if (activeSession) {
                    activeSessions.push(session);
                }
                else {
                    // Otherwise add to the array of expired sessions
                    expiredSessions.push(session);
                }
            }
        }

        // If there are more active sessions than the maximum number of sessions to be displayed, then return all
        if (activeSessions.length >= mobile.account.history.maxSessionsToDisplay) {
            return activeSessions;
        }
        else {
            // Otherwise join the active and expired sessions together and truncate the array to show the max e.g. 100
            var activeAndExpiredSessions = activeSessions.concat(expiredSessions);
            var sessionsToDisplay = activeAndExpiredSessions.slice(0, mobile.account.history.maxSessionsToDisplay);

            return sessionsToDisplay;
        }
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

            if (ipAddress.indexOf(':') > 0) {
                $sessionHistoryRow.addClass('ipv6');
            }

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
