/**
 * Mobile webclient notifications page logic.
 */
(function(scope) {
    'use strict';

    scope.notifications = {
        /** Cached page jQuery Element **/
        $page: null,

        /**
         * Init the notifications page.
         */
        init: function() {
            // If not logged in, return to the login page
            if (typeof u_attr === 'undefined') {
                loadSubPage('login');
                return false;
            }

            // Fetch account data, then render.
            loadingDialog.show('mobile:account/notifications:fetch');
            M.accountData(function() {
                mega.config.fetch();
            }, false, true);

            // Add a server log
            api_req({ a: 'log', e: 99805, m: 'Mobile web fm/account/notifications visited' });
        },

        /**
         * Render the page.
         */
        render: function() {
            // Select page element.
            this.$page = $('.mobile.account-notifications-page');

            // Initialise back button to go back to My Account page
            mobile.initBackButton(this.$page, 'fm/account/');

            // Init menu.
            topmenuUI();

            this.initRowTapEvent();
            this.initAccountNotifications();
            this.initENotify();

            // Show the page.
            this.$page.removeClass('hidden');
            loadingDialog.hide('mobile:account/notifications:fetch');
        },

        /**
         * Init account notification switches.
         */
        initAccountNotifications: function() {

            // New setting need to force cloud and contacts notification available.
            if (!mega.notif.has('enabled', 'cloud')) {
                mega.notif.set('enabled', 'cloud');
            }

            if (!mega.notif.has('enabled', 'contacts')) {
                mega.notif.set('enabled', 'contacts');
            }

            // Select switches.
            var $NAll = this.$page.find('.account-notifications .dialog-feature-toggle#notif-all');
            var $NEach = this.$page.find('.account-notifications .dialog-feature-toggle:not(#notif-all)');

            // Init each individual notification switchs.
            $NEach.each(function() {
                var $this = $(this);
                var nName = $this.attr('name');
                var sectionName = $this.attr('data-section');

                mobile.initSwitch($this, mega.notif.has(nName, sectionName), function(newState) {
                    (newState ? mega.notif.set : mega.notif.unset)(nName, sectionName);
                    (newState || $NEach.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                        .apply($NAll, ['toggle-on']);
                });
            });

            // Handle all toggle switch.
            mobile.initSwitch($NAll, $NEach.hasClass('toggle-on'), function(newState) {
                var updateFunction = newState ? mega.notif.set : mega.notif.unset;
                var uiUpdateFunction = newState ? $.fn.addClass : $.fn.removeClass;
                $NEach.each(function() {
                    var $this = $(this);
                    updateFunction($this.attr('name'), $this.attr('data-section'));
                    uiUpdateFunction.apply($this, ['toggle-on']);
                });
            });
        },

        /**
         * Init Email Notifications Logic.
         */
        initENotify: function() {
            loadingDialog.show('mobile:account/notifications:enotify');

            // Select switches.
            var $EAll = this.$page.find('.email-notifications .dialog-feature-toggle#enotif-all');
            var $EEach = this.$page.find('.email-notifications .dialog-feature-toggle:not(#enotif-all)');

            // Hide achievements toggle if achievements not an option for this user.
            (M.account.maf ? $.fn.removeClass : $.fn.addClass).apply(
                this.$page.find('#enotif-achievements').closest('.notification-setting-row'),
                ['hidden']
            );

            // Load the enotify settings.
            mega.enotif.all().then(function(enotifStates) {
                // Handle individual email toggles.
                $EEach.each(function() {
                    var $this = $(this);
                    var eName = $this.attr('name');
                    mobile.initSwitch($this, !enotifStates[eName], function(newState) {
                        mega.enotif.setState(eName, !newState);
                        (newState || $EEach.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                            .apply($EAll, ['toggle-on']);
                    });
                });

                // Handle All toggle.
                mobile.initSwitch($EAll, $EEach.hasClass('toggle-on'), function(newState) {
                    mega.enotif.setAllState(!newState);
                    (newState ? $.fn.addClass : $.fn.removeClass).apply($EEach, ['toggle-on']);
                });

                loadingDialog.hide('mobile:account/notifications:enotify');
            });
        },

        /**
         * Allow taping anywhere on row to switch toggle.
         */
        initRowTapEvent: function() {
            this.$page.find('.notification-setting-row').off('tap').on('tap', function() {
                $(this).find('.dialog-feature-toggle').tap();
            });
        },
    };
})(mobile.account);
