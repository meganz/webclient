
mobile.settings.history = Object.create(mobile.settingsHelper, {

    /**
     * The max number of active + expired sessions to display.
     * Active sessions will always be displayed even if there are more than this number,
     * in the interests of security.
     *
     * @type {Int} Max sessions
     */
    maxSessionsToDisplay: {
        value: 100,
    },

    /**
     * Initiate and render the page
     *
     * @returns {undefined}
     */
    init : {
        value : async function() {

            'use strict';

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('settings-history');

            await this.updateCallback();

            this.show();

        }
    },

    /**
     * Removes any existing session history page and regenerates the HTML.
     *
     * @returns {undefined}
     */
    updateCallback: {
        value: async function() {

            'use strict';

            // Reset the page
            this.domNode.textContent = "";

            // Get the session history and generate the session nodes
            const sessionHistory = await this.fetchSessionHistory();

            // Helper function to generate the session dom nodes
            let noActiveSessions = true;
            const generateSessionList = () => {
                const sessions = [];
                for (let i = 0; i < sessionHistory.length; i++) {
                    const sessionNode = this.generateSessionNode(sessionHistory[i]);
                    sessions.push(sessionNode);

                    if (sessionNode.classList.contains('active')) {
                        noActiveSessions = false;
                    }
                }
                return sessions;
            };

            mCreateElement("h3", {}, [document.createTextNode(l.recent_activity_title)], this.domNode);
            mCreateElement("div", {"class": "session-list"}, generateSessionList(), this.domNode);

            const actionButtonsContainer = mCreateElement('div', {"class": "action-buttons"}, this.domNode);

            // "Close all sessions" button - disable if a user has no active sessions
            const closePrevSessions = new MegaMobileButton({
                parentNode: actionButtonsContainer,
                text: l.log_out_prev_sessions,
                componentClassname: "block secondary"
            });
            closePrevSessions.disabled = noActiveSessions;

            closePrevSessions.on('tap', () => {

                mega.ui.sheet.show({
                    name: 'close-all-sessions-confirm',
                    type: 'modal',
                    showClose: true,
                    title: l.log_out_prev_sessions_title,
                    content: l.log_out_prev_sessions_desc,
                    actions: [
                        {
                            type: 'normal',
                            text: l.log_out_cancel,
                            className: "secondary block confirm",
                            onClick: () => {

                                mega.ui.sheet.hide();
                            }
                        },
                        {
                            type: 'normal',
                            text: l.log_out_conf,
                            className: "primary block confirm",
                            onClick: () => {

                                mega.ui.sheet.hide();

                                loadingDialog.show('sessions-expire-api-req');

                                // expire all sessions but not the current one
                                api.screq({a: 'usr', ko: 1}).then(() => {

                                    loadingDialog.hide('sessions-expire-api-req');

                                    // re-render the page
                                    this.updateCallback();

                                    mega.ui.toast.show(l.log_out_conf_toast);

                                }).catch((ex) => {

                                    loadingDialog.hide('sessions-expire-api-req');
                                    console.error(`Error expiring all sessions: ${ex}`);
                                });
                            }
                        }
                    ]
                });
            });
        }
    },

    /**
     * Generate an HTMLElement containing the session data for display within the mobile
     * web settings screen.
     *
     * @returns {HTMLDivElement} Session DOMNode
     */
    generateSessionNode: {
        value: function(session) {

            'use strict';

            const [timestamp, , userAgent, ipAddress, countryCode, currentSession, sessionId, activeSession] = session;
            const browser = browserdetails(userAgent);
            const country = countrydetails(countryCode);
            const sessionStatus = currentSession ? 'current' : activeSession ? 'active' : 'expired';

            // Fallback country icon
            if (!country.icon || country.icon === '??.png') {
                country.icon = 'ud.png';
            }

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            const browserFullName = browser.nameTrans += browser.isExtension ? ` (+${l[7683]})` : '';

            const sessionNode = mCreateElement('div', {'class': `mobile session ${sessionStatus}`, 'id': sessionId});
            mCreateElement('div', {'class': 'heading'}, [

                mCreateElement('div', {'class': 'browser'}, [

                    mCreateElement('img', {
                        'title': browser.nameTrans,
                        'src': `${staticpath}images/browser-icons/${browser.icon}`
                    }),
                    mCreateElement('span', {'class': 'browser-name'}, [document.createTextNode(browserFullName)])

                ])
            ], sessionNode);

            mCreateElement('div', {'class': 'data'}, [

                mCreateElement('div', {'class': 'location'}, [

                    mCreateElement('img', {
                        'title': country.name,
                        'src': `${staticpath}images/flags/${country.icon}`
                    }),
                    mCreateElement('span', {'class': 'country-name'}, [document.createTextNode(country.name)])

                ]),
                mCreateElement('span', {'class': 'date-time'}, [document.createTextNode(time2date(timestamp))]),
                mCreateElement('span', {'class': 'ip-address'}, [document.createTextNode(ipAddress)])
            ], sessionNode);

            // Button/heading status indicator
            const headingParentNode = sessionNode.querySelector('.heading');

            const nodeGenerator = {
                expired: targetNode => mCreateElement(
                    'span',
                    {"class": "session-status expired"},
                    [document.createTextNode(l[25016])],
                    targetNode
                ),
                current: targetNode => mCreateElement(
                    'span',
                    {"class": "session-status current"},
                    [document.createTextNode(l[7665])],
                    targetNode
                ),
                active: targetNode => {

                    const closeSessionButton = new MegaMobileButton({
                        parentNode: targetNode,
                        componentClassname: `action-link active session-action-button`,
                        text: l.log_out_state,
                    });

                    closeSessionButton.on('tap.close', () => {

                        // Run API request User Session Remove (usr) to expire a session
                        loadingDialog.show('session-expire-api-req');

                        // Provide a helpful error catch
                        api.screq({a: 'usr', s: [sessionId]}).then(() => {

                            loadingDialog.hide('session-expire-api-req');

                            // re-render the page
                            this.updateCallback();

                            mega.ui.toast.show(l.log_out_single_session_conf_toast);

                        }).catch((ex) => {

                            loadingDialog.hide('session-expire-api-req');
                            console.error(`API Error while expiring session ${sessionId}: ${ex}`);
                        });

                    });
                }
            };

            nodeGenerator[sessionStatus](headingParentNode);

            return sessionNode;

        }
    },

    /**
     * Fetch the account's session history from the API, sort it and return.
     *
     * @returns {Promise<Array>} A promise of the data
     */
    fetchSessionHistory: {
        value: async function() {

            'use strict';

            loadingDialog.show('session-api-req');

            const {result: sessions} = await api.req({ a: 'usl', x: 1 }).catch(ex => {
                console.error(`Error fetching user session history: ${ex}`);
            });

            loadingDialog.hide('session-api-req');

            if (typeof sessions !== 'object') {
                return [];
            }

            return this.sortGroupSessions(sessions);
        }
    },

    /**
     * Sort the sessions by most recent datetime, but put the current session at the top, then group the active
     * sessions at the top after that, then group the expired sessions after that. Finally, the number of sessions
     * will be truncated to the maximum that need to be shown. Note that if there are more than 100 active sessions
     * they will all be displayed as that is of interest to the user.
     *
     * @param {Array} allSessions The entire array of sessions from the API
     *
     * @returns {Array} Returns the list of sessions to be displayed
     */
    sortGroupSessions: {
        value: function(allSessions) {

            'use strict';

            // Sort Current -> Active -> Expired; newest -> oldest
            allSessions.sort((sessionA, sessionB) => sessionB[5] - sessionA[5] || sessionB[7] - sessionA[7] ||
                sessionB[0] - sessionA[0] || -1);

            if (allSessions.length >= this.maxSessionsToDisplay) {

                // If n_limit is "active", then n_last_active >= n -> show only active over n_limit
                // else show n_limit of active and expired
                return allSessions[this.maxSessionsToDisplay][7] ? allSessions.filter((x) => x[7]) :
                    allSessions.slice(0, this.maxSessionsToDisplay);
            }

            // Show all
            return allSessions;
        }
    }

});
