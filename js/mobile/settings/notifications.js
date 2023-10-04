mobile.settings.account.notifications = Object.create(mobile.settingsHelper, {
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                this.show();
                return true;
            }

            // Fetch account data, then render.
            M.accountData(() => {
                mega.config.fetch();
                this.render();
            }, false, true);

            // Add a server log
            api.req({a: 'log', e: 99805, m: 'Mobile web fm/account/notifications visited'});
        },
    },

    /**
     * Render the page.
     */
    render: {
        value: function() {
            'use strict';

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('notifications');
            this.domNode.classList.add('theme-light-forced');

            const oldPage = document.querySelector('.mobile.account-notifications-page .fm-scrolling');

            oldPage.classList.remove('fm-scrolling');

            this.domNode.appendChild(oldPage);
            this.$page = $('.mega-mobile-settings.notifications');

            this.show();

            this.initRowTapEvent();
            this.initAccountNotifications();
            this.initENotify();
        },
    },
    /**
     * Init account notification switches.
     */
    initAccountNotifications: {
        value: function() {
            'use strict';

            // New setting need to force cloud and contacts notification available.
            if (!mega.notif.has('enabled', 'cloud')) {
                mega.notif.set('enabled', 'cloud');
            }

            if (!mega.notif.has('enabled', 'contacts')) {
                mega.notif.set('enabled', 'contacts');
            }

            // Select switches.
            var $NAll = this.$page.find('.account-notifications .mega-switch#notif-all');
            var $NEach = this.$page.find('.account-notifications .mega-switch:not(#notif-all)');

            // Init each individual notification switchs.
            for (const item of $NEach) {
                const $this = $(item);
                const nName = $this.attr('name');
                const sectionName = $this.attr('data-section');

                // eslint-disable-next-line no-loop-func
                mobile.initSwitch($this, mega.notif.has(nName, sectionName), (newState) => {
                    const updateFunction = newState ? mega.notif.set : mega.notif.unset;
                    const uiUpdateFunction = newState ? $.fn.addClass : $.fn.removeClass;

                    updateFunction(nName, sectionName);
                    uiUpdateFunction.apply($NAll, ['toggle-on']);
                });
            }

            // Handle all toggle switch.
            mobile.initSwitch($NAll, $NEach.hasClass('toggle-on'), (newState) => {
                const updateFunction = newState ? mega.notif.set : mega.notif.unset;
                const uiUpdateFunction = newState ? $.fn.addClass : $.fn.removeClass;
                for (const item of $NEach) {
                    const $this = $(item);
                    const nName = $this.attr('name');
                    const sectionName = $this.attr('data-section');

                    updateFunction(nName, sectionName);
                    uiUpdateFunction.apply($this, ['toggle-on']);
                }
            });
        },
    },
    /**
     * Init Email Notifications Logic.
     */
    initENotify: {
        value: function() {
            'use strict';

            loadingDialog.show('mobile:account/notifications:enotify');

            // Select switches.
            const $EAll = this.$page.find('.email-notifications .mega-switch#enotif-all');
            const $EEach = this.$page.find('.email-notifications .mega-switch:not(#enotif-all)');
            const {$page} = this;

            // Hide achievements toggle if achievements not an option for this user.
            (M.account.maf ? $.fn.removeClass : $.fn.addClass).apply(
                this.$page.find('#enotif-achievements').closest('.notification-setting-row'),
                ['hidden']
            );

            // Load the enotify settings.
            mega.enotif.all().then((enotifStates) => {
                // Handle individual email toggles.

                for (const notif of $EEach){
                    const $this = $(notif);
                    const eName = $this.attr('name');
                    // eslint-disable-next-line no-loop-func
                    mobile.initSwitch($this, !enotifStates[eName], (newState) => {
                        mega.enotif.setState(eName, !newState);
                        (newState || $EEach.hasClass('toggle-on') ? $.fn.addClass : $.fn.removeClass)
                            .apply($EAll, ['toggle-on']);
                        loadingDialog.hide('mobile:account/notifications:enotify');
                    });
                }

                // Handle All toggle.
                mobile.initSwitch($EAll, $EEach.hasClass('toggle-on'), (newState) => {
                    mega.enotif.setAllState(!newState);
                    (newState ? $.fn.addClass : $.fn.removeClass).apply($EEach, ['toggle-on']);
                    loadingDialog.hide('mobile:account/notifications:enotify');
                });

                if ((u_attr.p || u_attr.b) && M.account.stype === 'S'
                    && (Array.isArray(M.account.sgw) && M.account.sgw.includes('Stripe')
                        || Array.isArray(M.account.sgwids)
                        && M.account.sgwids.includes((addressDialog || {}).gatewayId_stripe || 19))) {

                    $('.notification-setting-row.payment-card-noti', $page).removeClass('hidden');
                }

                loadingDialog.hide('mobile:account/notifications:enotify');
            });
        },
    },
    /**
     * Allow taping anywhere on row to switch toggle.
     */
    initRowTapEvent: {
        value: function() {
            'use strict';

            $('.notification-setting-row', this.domNode).rebind('tap.notif', function() {
                $('.mega-switch', this).tap();
            });
        },
    },
});
