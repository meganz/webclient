(function($, mBroadcaster, scope) {
    'use strict';

    /**
     * Onboarding related stuff
     *
     * This file contains a generic logic for attaching "dropdowns" and non-generic
     * (specific, to each onboarding screen) logic to determinate when should a dropdown (and its screen) needs
     * to be shown.
     *
     * @constructor
     * @class mega.ui.Onboarding
     * @param [opts] {Object}
     * @constructor
     */
    var Onboarding = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * The UL id that holds all onboarding screen contents.
             */
            'screensContainerId': 'onboarding-screens',

            /**
             * The ID of the element that contains the actual dialog HTML code
             */
            'onboardingDialogTemplateId': 'onboarding-dialog-template'
        };


        self.options = $.extend({}, defaultOptions, opts);

        self.screens = [];
        self._lastShown = {};
        self._queuedForShowing = [];

        self.$screensContainer = $("#" + self.options.screensContainerId);
        self.$screensContainer.detach();

        self.$onboardingDialogTemplate = $("#" + self.options.onboardingDialogTemplateId);
        self.$onboardingDialogTemplate.detach();


        self._initScreens();

        self._persisted.get('onboarding').done(function(r) {
            if (r === 1) {
                self.destroy();
            }
            else {
                if (self.screens && self.screens.length > 0) {
                    // if was never destroyed before...
                    self.reinit();
                }
                else {
                    // if destroyed, a full reload is required.
                }
            }
        });
    };

    Onboarding.prototype.reinit = function() {
        var self = this;
        if (self._pageChangeListener) {
            mBroadcaster.removeListener(self._pageChangeListener);
        }
        self._pageChangeListener = mBroadcaster.addListener('pagechange', function() {
            // close any dialog if such is opened
            if (Object.keys(self._lastShown).length > 0) {
                var screenId = Object.keys(self._lastShown)[0];

                self.hideDialog(screenId);

                if (!self._lastShown) {
                    // was destroyed.
                    return;
                }
                delete self._lastShown[screenId];
            }
            self.eventuallyRenderDialogs();
        });

        self._closeDialogListener = mBroadcaster.addListener('closedialog', function() {
            self.eventuallyRenderDialogs();
        });

        $(document.body).rebind('onMegaNotification.onboarding', function() {
            self.eventuallyRenderDialogs();
        });

        $(window).rebind('resize.onboarding', SoonFc(function() {
            self.eventuallyRenderDialogs();
        }));

        self.eventuallyRenderDialogs();
    };

    Onboarding.prototype.hideDialog = function(screenId) {

        var self = this;

        if (self._lastShown[screenId]) {
            var screenInfo = self.getScreenMeta(screenId);

            // mark as seen
            self._persisted.set(screenId, 1);
            if (screenInfo && screenInfo.dontShow === true) {
                self._persisted.set("onboarding", 1);
            }

            self._persisted.commit();

            var $dialog = $('#onboarding-dialog-' + screenId);

            var wasScreenVisible = $dialog.is(":visible");
            $dialog.removeClass('active');
            $dialog.addClass('hidden');
            $dialog.fadeOut();
            if ($.dialog === "onboarding-" + screenId) {
                delete $.dialog;
            }


            $(document.body).off('mousedown.onboarding' + screenId);
            $(document.body).off('keyup.onboarding' + screenId);

            $(window).off('resize.onboardingRepos');

            if (screenInfo && wasScreenVisible && screenInfo.onHideFn) {
                screenInfo.onHideFn(screenId, screenInfo);
            }
            else {
                self._persisted.get('onboarding').done(function(r) {
                    // was set to not show more onboarding popups
                    if (r === 1) {
                        self.destroy();
                    }
                });
            }
        }
        else {
            console.error("Not visible: ", screenId);
        }

        setTimeout(function() {
            // give some time for animations and stuff to finish.
            if ($('.onboarding-dialog:visible').length === 0 && !$.dialog) {
                // all onboarding dialogs had been closed, lets trigger a 'closedialog' in case a dialog is queued to
                // be 'safe'-shown (@see M.safeShowDialog)
                mBroadcaster.sendMessage('closedialog');
            }
        }, 1000);
    };

    Onboarding.prototype._initGenericEvents = function(screenId, $screen, $dialog, screenInfo) {
        var self = this;

        $('.default-grey-button', $dialog).text(
            !screenInfo.dontShow && self._queuedForShowing.length > 1 ? l[556] /* next */ : l[5700] /* Got it */
        );

        $('.dropdown.close-button, .default-grey-button', $dialog)
            .rebind('click.onboarding', function() {
                self.hideDialog(screenId);
            });


        if (!$dialog.is(".active")) {
            // show

            screenInfo.dontShow = false;
            uiCheckboxes($('.checkbox-block', $dialog), undefined, function(state) {
                if (state) {
                    screenInfo.dontShow = true;
                }
                else {
                    screenInfo.dontShow = false;
                }
                self._initGenericEvents(screenId, $screen, $dialog, screenInfo);
            });

            $dialog.css({
                'top': 'auto',
                'left': 'auto',
            });

            self._positionDialog(screenId);

            $dialog.removeClass('hidden');
            $dialog.removeClass('fadeout');
            $dialog.addClass('active');

            if ($screen.height() > 300) {
                $dialog.addClass('long-content');
            }

            $screen.addClass("active");

            $(document.body).rebind('mousedown.onboarding' + screenId, function(e) {
                /**
                 *  Close the onboarding dialog IF:
                 *  1) the user clicks OUTSIDE the dialog
                 *  2) in a link in the dialog (a link in the dialog, would typically navigate the user to a
                 *  different page, so it makes sense to hide the dialog, at least for the current use cases)
                 */
                if (
                    (
                        $(e.target).closest($screen).length === 0 &&
                        $(e.target).closest($dialog).length === 0
                    ) ||
                    (
                        $(e.target).is(".onboarding-dialog p a")
                    )
                ) {
                    if (!self._lastShown) {
                        // was destroyed.
                        $(document.body).off('mousedown.onboarding' + screenId);
                        return;
                    }
                    self.hideDialog(screenId);
                }
            });
            $(document.body).rebind('keyup.onboarding' + screenId, function(e) {
                if (!self._lastShown) {
                    // was destroyed.
                    $(document.body).off('keyup.onboarding' + screenId);
                    return;
                }

                if (e.keyCode === 27) { // escape key maps to keycode `27`
                    self.hideDialog(screenId);
                }
            });

            $(window).rebind('resize.onboardingRepos', SoonFc(function() {
                self._positionDialog(screenId);
            }));
        }
        else {
            self._positionDialog(screenId);
        }
    };


    Onboarding.prototype.getScreenMeta = function(screenId) {
        var self = this;
        for (var i = 0; i < self.screens.length; i++) {
            if (self.screens[i].screenId === screenId) {
                return self.screens[i];
            }
        }
        return false;
    };

    Onboarding.prototype.registerScreen = function(
        screenId,
        shouldShowFn,
        onHideFn,
        onBeforeShow,
        learnMoreUrl,
        customLinkUrl
    ) {
        var self = this;

        var meta = {
            screenId: screenId,
            shouldShowFn: shouldShowFn,
            onHideFn: onHideFn,
            onBeforeShow: onBeforeShow,
            learnMoreUrl: learnMoreUrl,
            customLinkUrl: customLinkUrl,
        };

        self.screens.push(
            meta
        );
    };

    Onboarding.prototype.unregisterScreen = function(screenId) {
        var self = this;

        self.screens.some(function(screen, k) {
            if (screen.screenId === screenId) {
                array.remove(self.screens, screen);
                return true;
            }
        });
    };


    /**
     * This function would/should be called often, so that it would determinate which dropdowns would need to be
     * added/removed to the DOM, depending on the current state of the app.
     * For now, we would be doing that on:
     *  - hash change
     *  - onboarding screen closing/hiding
     */
    Onboarding.prototype.eventuallyRenderDialogs = SoonFc(function() {
        var self = this;
        if (!self.screens) {
            // not initialised/destroyed
            return;
        }
        if ($.dialog || $.msgDialog) {
            return;
        }

        if (
            $('.notification-popup:visible').length > 0 ||
            $('.dropdown:visible:not(.transfer-widget, .tooltip)').length > 0
        ) {
            return;
        }


        self._queuedForShowing = [];
        var promises = [];
        self.screens.forEach(function(v, k) {
            // if ($('#onboarding-dialog-' + v.screenId).is(":visible")) {
            //     return;
            // }

            promises.push(
                self._persisted.get(v.screenId).done(function(r) {
                    if (r === 0) {
                        var res = v.shouldShowFn(self);
                        if (res) {
                            self._queuedForShowing.push([v.screenId, v]);
                        }
                    }
                })
            );
        });

        MegaPromise.allDone(promises).always(function() {
            var $currentlyOpened = $('.onboarding-dialog.active');
            if ($currentlyOpened.length > 0) {
                var screenId = $currentlyOpened.attr('id').replace("onboarding-dialog-", "");
                self._initGenericEvents(
                    screenId,
                    $('.content-block', $currentlyOpened),
                    $currentlyOpened,
                    false
                );
            }
            else {
                if (self._queuedForShowing.length > 0) {
                    self.renderDialog(self._queuedForShowing[0][0], self._queuedForShowing[0][1]);
                }
            }
        });
    }, 350);


    Onboarding.prototype.renderDialog = function(screenId, screenInfo) {
        var self = this;
        if ($.dialog) {
            return;
        }
        $.dialog = "onboarding-" + screenId;

        var $onboardingDialogTemplate = self.$onboardingDialogTemplate.clone();
        $onboardingDialogTemplate.attr('id', 'onboarding-dialog-' + screenId);

        var $screen = $('#' + screenId, self.$screensContainer).clone();
        $('.onboarding-dialog-contents', $onboardingDialogTemplate).replaceWith($screen);

        var extraClasses = $screen.data('classes');
        if (extraClasses) {
            extraClasses.split(" ").forEach(function(kls) {
                $onboardingDialogTemplate.addClass(kls);
            });
        }

        if (screenInfo.onBeforeShow) {
            screenInfo.onBeforeShow(self, $onboardingDialogTemplate);
        }

        // add some formatting ([B]...[/B])
        $('.hint-info', $screen).each(function() {
            var txt = $(this).text();
            txt = htmlentities(txt);
            txt = txt
                .replace(/\[B\]/gi, '<span class="bold">')
                .replace(/\[\/B\]/gi, '</span>')
                .replace("[A1]", '<a href="/fm/account">')
                .replace("[/A1]", '</a>')
                .replace("[A2]", '<a href="/fm/account/notifications">')
                .replace("[/A2]", '</a>');

            if (screenInfo.customLinkUrl) {
                txt = txt
                    .replace("[CL]", '<a href="' + screenInfo.customLinkUrl + '">')
                    .replace("[/CL]", "</a>");
            }
            $(this).html(txt);
        });

        if (screenInfo.learnMoreUrl) {
            $('.hint-info', $screen).append(
                $('<div><a href="' + screenInfo.learnMoreUrl + '" target="_blank">' + l[8742] + '</a></div>')
            );
        }

        $onboardingDialogTemplate.hide();

        $(document.body).append($onboardingDialogTemplate);
        self._lastShown[screenId] = $onboardingDialogTemplate;


        $onboardingDialogTemplate.fadeIn();

        screenInfo.$dialog = $onboardingDialogTemplate;

        self._initGenericEvents(screenId, $screen, $onboardingDialogTemplate, screenInfo);
    };


    Onboarding.prototype._positionDialog = function(screenId) {
        var self = this;

        // var $screen = screenInfo.$screen;
        // var $dropdown = screenInfo.$dropdown;

        // if ($screen.data('dropdownPosition')) {
        //     var $targetElement = $($screen.data('dropdownPosition'));
        //     if (!$targetElement.is(":visible")) {
        //         if ($dropdown && $dropdown.is(":visible")) {
        //             self.hideDialog(screenId, screenInfo);
        //         }
        //         return;
        //     }
        //     $dropdown.position({
        //         of: $targetElement,
        //         my: $screen.data('dropdownPositionMy') ? $screen.data('dropdownPositionMy') : "left bottom",
        //         at: $screen.data('dropdownPositionAt') ? $screen.data('dropdownPositionAt') : "right center"
        //     });
        // }
        var $elem = $('#onboarding-dialog-' + screenId);
        var $screen = $('.content-block', $elem);
        var pos = $screen.data('position');

        if (pos === 'center') {
            $elem.position({
                of: $(window)
            });
        }
        else if (String(pos).substr(0, 1) === '$') {
            var query = pos.substr(1, pos.length);
            var posAt = ($screen.data('positionAt') || "left top");
            var posMy = ($screen.data('positionMy') || "left top");
            var attrs = {
                at: posAt,
                my: posMy
            };
            if ($(query).length > 0) {
                // if a selector is passed to $.position what returns 0 elements, $.position crashed with a JS error,
                // so we should never do that.
                attrs['of'] = query;
            }

            $elem.position(attrs);
        }
        else {
            console.error("invalid pos data attr:" + $screen.data('position'));
        }
    };

    /**
     * Function that would be called IF the user had/did checked the "don't show" checkbox. Should cleanup mem & dom.
     */
    Onboarding.prototype.destroy = function() {
        var self = this;
        if (self._pageChangeListener) {
            mBroadcaster.removeListener(self._pageChangeListener);
        }
        if (self._closeDialogListener) {
            mBroadcaster.removeListener(self._closeDialogListener);
        }

        $(document.body).off('onMegaNotification.onboarding');
        $(window).off('resize.onboarding');

        if (!self.screens) {
            // not initialised/was destroyed
            return;
        }

        $("#" + self.options.screensContainerId).remove();
        $("#" + self.options.onboardingDialogTemplateId).remove();

        if (self.$screensContainer) {
            delete self.$screensContainer;
        }
        if (self.$onboardingDialogTemplate) {
            delete self.$onboardingDialogTemplate;
        }
        if (self.screens) {
            delete self.screens;
        }

        Object.keys(self._lastShown).forEach(function(k) {
            var v = self._lastShown[k];
            $('#onboarding-dialog-' + k).remove();
        });

        delete self._lastShown;
        delete self.options;
        delete self._queuedForShowing;
    };


    Onboarding.prototype._initPersistence = function(screenIds) {
        var self = this;
        self._persisted = new MegaDataBitMap("onboarding", false, screenIds);
        self._persisted.addChangeListener(function(data, v, k) {
            if (k === "onboarding") {
                self._persisted.get("onboarding").done(function(r) {
                    if (r === 0) {
                        self.reinit();
                    }
                    else {
                        self.destroy();
                    }
                });

            }
            else {
                self._persisted.get(k).done(function(r) {
                    if (r === 0) {
                        // reset, if already shown, but then unhidden (because of ._persisted.reset())
                        if (self._lastShown && self._lastShown[k]) {
                            delete self._lastShown[k];
                        }
                        self.eventuallyRenderDialogs();
                    }
                    else {
                        self.eventuallyRenderDialogs();
                    }
                });
            }
        });
    };

    Onboarding.prototype._calculateNodesCount = function() {
        var self = this;
        if (typeof(self._calculatedNodesCount) === 'undefined' && M && M.tree && M.tree[M.RootID]) {
            self._calculatedNodesCount = Object.keys(M.tree[M.RootID]).length;
        }
        return self._calculatedNodesCount || 0;
    };

    // Define the screens and logic here...
    Onboarding.prototype._initScreens = function() {
        var self = this;

        var rootNodesCount = self._calculateNodesCount();

        // notifications should be first, from UX point of view.
        self.registerScreen(
            'have-notifications',
            function shouldShowNotificationsTip() {
                if (
                    self.shouldShow &&
                    rootNodesCount < 3 &&
                    $('.top-icon.notification .notification-num:visible').length > 0 &&
                    parseInt($('.top-icon.notification .notification-num:visible').text(), 10) > 0
                ) {
                    return true;
                }
            },
            function _onHideOnboardingNotificationsTip(screenId) {
                self.unregisterScreen(screenId);
            }
        );

        self.registerScreen(
            'how-to-upload',
            function _shouldShowOnboardingUpload() {
                if (
                    self.shouldShow &&
                    M.currentdirid === M.RootID &&
                    M.v.length <= 1 /* 1st item is the welcome pdf */
                ) {
                    return true;
                }
            },
            function _onHideOnboardingUpload(screenId) {
                self.unregisterScreen(screenId);
            },
            function _onBeforeShowUpload(onboarding, $elem) {
                $('.is-chrome, .is-ff', $elem).addClass('hidden');

                if (ua.details.browser === "Chrome") {
                    $('.is-chrome', $elem).removeClass('hidden');
                    $('.is-ff', $elem).remove();
                }
                else {
                    // FF, IE, Safari, Etc
                    $('.is-ff', $elem).removeClass('hidden');
                    $('.is-chrome', $elem).remove();
                }
            }
        );

        self.registerScreen(
            'manage-transfers',
            function _shouldShowOnboardingTransfers() {
                if (
                    self.shouldShow &&
                    rootNodesCount < 3 &&
                    $('.nw-fm-left-icon.transfers').is(":visible") &&
                    M.hasPendingTransfers()
                ) {
                    return true;
                }
            },
            function _onHideOnboardingTransfer(screenId) {
                self.unregisterScreen(screenId);
            },
            undefined
        );



        // Have outgoing shares
        // Object.keys(M.su).filter(n => n !== 'EXP').length > 0

        // Have pub links
        // Object.keys(Object(M.su.EXP)).length > 0



        self.registerScreen(
            'share-content',
            function _shouldShowOnboardingShareContent() {
                var fileNodeInUi = $('tr.file.megaListItem:visible:first, .data-block-view.file:visible:first');

                if (
                    self.shouldShow &&
                    Object.keys(Object(M.su.EXP)).length === 0 &&
                    $('.fm-blocks-view.fm:visible,.files-grid-view.fm:visible').length > 0 &&
                    fileNodeInUi.length
                ) {
                    return true;
                }
            },
            function _onHideOnboardingShareContent(screenId) {
                self.unregisterScreen(screenId);
            },
            undefined,
            "https://mega.nz/help/client/webclient/getting-started/how-can-i-share-data-without-requirin" +
            "g-the-recipient-to-register-with-mega-first-57885f6f886688d0168b45b6"
        );


        self.registerScreen(
            'share-folders',
            function _shouldShowOnboardingShareFolders() {
                var folderInUI = $('tr.folder.megaListItem:visible:first, .data-block-view.folder:visible:first');

                if (
                    self.shouldShow &&
                    Object.keys(M.su).filter(function(n) { return n !== 'EXP'; }).length === 0 &&
                    $('.fm-blocks-view.fm:visible,.files-grid-view.fm:visible').length > 0 &&
                    folderInUI.length
                ) {
                    return true;
                }
            },
            function _onHideOnboardingShareFolders(screenId) {
                self.unregisterScreen(screenId);
            }
        );


        self.registerScreen(
            'rubbish-bin',
            function shouldShowRubbishBinTip() {
                if (
                    self.shouldShow &&
                    u_attr.flags.ssrs &&
                    !u_attr['^!rubbishtime'] &&
                    $('.nw-fm-left-icon.rubbish-bin.active').length === 0 &&
                    $('.nw-fm-left-icon.rubbish-bin.filled:visible').length > 0
                ) {
                    return true;
                }
            },
            function _onHideOnboardingRubbishBinTip(screenId) {
                self.unregisterScreen(screenId);
            }
        );

        self.registerScreen(
            'add-contacts',
            function _shouldShowOnboardingContacts() {
                if (
                    self.shouldShow &&
                    M.u.keys().length <= 2 /* 1 of them == u_handle */ &&
                    $('.nw-fm-left-icon.contacts.active').length === 0 &&
                    $('.nw-fm-left-icon.contacts:visible').length > 0
                ) {
                    return true;
                }
            },
            function _onHideOnboardingContacts(screenId) {
                self.unregisterScreen(screenId);
            }
        );

        self.registerScreen(
            'megachat',
            function shouldShowOnboardingChats() {
                if (!megaChatIsReady) {
                    return false;
                }
                return (
                    self.shouldShow &&
                    M.u.keys().length >= 2 /* 1st of them == u_handle */ &&
                    megaChat.chats.length <= 1 &&
                    !megaChat.plugins.chatdIntegration.isLoading() &&
                    Number.isNaN(
                        parseInt($('.new-messages-indicator .chat-unread-count:visible').text(), 10)
                    ) === true &&
                    $('.nw-fm-left-icon.conversations.active').length === 0 &&
                    $('.nw-fm-left-icon.conversations:visible').length > 0
                );
            },
            function _onHideOnboardingChats(screenId) {
                self.unregisterScreen(screenId);
            }
        );



        self._initPersistence([
            'onboarding',
            'how-to-upload',
            'manage-transfers',
            'add-contacts',
            'have-notifications',
            'megachat',
            'share-folders',
            'share-content',
            'rubbish-bin'
        ]);
    };
    Onboarding.prototype.dumpState = function() {
        var self = this;
        self._persisted._keys.forEach(function(k) {
            self._persisted.get(k)
                .done(function(r) {
                    console.error(k, "=", r);
                })
                .fail(function(e) {
                    console.error("failed: ", k, e);
                });
        });
    };
    Onboarding.prototype.resetState = function() {
        if (d) {
            console.warn('Reinitializing onboarding state....');
            this._persisted.reset();
            this._persisted.commit();
        }
    };

    Object.defineProperty(Onboarding.prototype, 'shouldShow', {
        get: function() {
            return u_type && fminitialized && !pfid && is_fm();
        }
    });

    mBroadcaster.addListener('fm:initialized', function _delayedInitOnboarding() {
        if (!folderlink) {
            assert(typeof mega.ui.onboarding === 'undefined', 'unexpected onboarding initialization');

            if (typeof u_handle === 'undefined') {
                console.error('onboarding expects a valid user...');
                return;
            }
            mega.ui.onboarding = new mega.ui.Onboarding({});

            if (u_attr && u_attr.b) {
                M.require('businessAcc_js', 'businessAccUI_js').done(function() {
                    var business_ui = new BusinessAccountUI();
                    if (u_attr.b.m) {
                        business_ui.showWelcomeDialog();
                    }
                    // the function will check if the account is expired
                    business_ui.showExp_GraceUIElements();
                });
            }

            // we reached our goal, stop listening for fminitialized
            return 0xDEAD;
        }
    });

    // export
    scope.mega.ui.Onboarding = Onboarding;

})(jQuery, mBroadcaster, window);
