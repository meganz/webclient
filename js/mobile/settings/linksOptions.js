/**
 * Mobile webclient account file-management page logic.
 */
(function(scope) {
    'use strict';

    scope.linksOptions = {
        /** Cached page jQuery Element **/
        $page: null,

        /**
         * Init the account file-management page.
         *
         * @returns {void} void
         */
        init: function() {
            // If not logged in, return to the login page
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return false;
            }

            // Fetch account data, then render is called by mega.config.fetch().
            M.accountData(() => {
                mega.config.fetch();
            }, false, true);
        },

        /**
         * Render the page.
         *
         * @returns {void} void
         */
        render: function() {
            // Select page element.
            this.$page = $('.mobile.account-file-management-page', '.fmholder');

            this.initRowTapEvent();
            this.initSettings();

            // Show the page.
            this.$page.removeClass('hidden');
        },

        /**
         * Init setting switches.
         *
         * @returns {void} void
         */
        initSettings: function() {
            const $configSwitches = $('.mega-switch.config', this.$page);
            const switchChange = (newState, name) => {
                mega.config.setn(name, newState);
                if (newState) {
                    $configSwitches.eq(i).addClass('toggle-on');
                }
                else {
                    $configSwitches.eq(i).removeClass('toggle-on');
                }
            };
            for (let i = 0; i < $configSwitches.length; i++) {
                const name = $configSwitches.eq(i).attr('name');
                mobile.initSwitch($configSwitches.eq(i), mega.config.get(name), (a) => {
                    switchChange(a, name);
                });
            }
        },

        /**
         * Allow tapping anywhere on row to switch toggle.
         *
         * @returns {void} void
         */
        initRowTapEvent: function() {
            $('.notification-setting-row', this.$page).rebind('click.accfm', function() {
                $('.mega-switch', this).tap();
            });
        },
    };
})(mobile.settings.account);
