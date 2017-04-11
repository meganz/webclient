(function($, mBroadcaster, scope) {
    /**
     * Onboarding related stuff
     *
     * This file contains a generic logic for attaching "click handlers" (the onboarding circles) and non-generic
     * (specific, to each onboarding screen) logic to determinate when should a click handler (and its screen) needs
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
             * The ID of the element defined in onboarding.html as a click handler.
             */
            'clickHandlerTemplateId': 'onboarding-click-handler-template',


            /**
             * The ID of the element that contains the actual dialog HTML code
             */
            'onboardingDialogTemplateId': 'onboarding-dialog-template'
        };


        self.options = $.extend({}, defaultOptions, opts);

        self.screens = [];
        self._lastShown = {};

        self.$clickHandlerTemplate = $("#" + self.options.clickHandlerTemplateId);
        self.$clickHandlerTemplate.detach();
        self.$clickHandlerTemplate.removeClass('hidden');

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
            self.eventuallyRenderClickHandlers();
        });
        $(window).rebind('resize.onboarding', function() {
            self.eventuallyRenderClickHandlers();
        });

        self.eventuallyRenderClickHandlers();
    };

    Onboarding.prototype.hideClickHandler = function(screenId, screenInfo, dontRemove) {

        var self = this;

        if (self._lastShown[screenId]) {
            // mark as seen
            self._persisted.set(screenId, 1);
            if (screenInfo.dontShow === true) {
                self._persisted.set("onboarding", 1);
            }

            self._persisted.commit();

            var $dialog = screenInfo.$dialog;
            var $clickHandler = screenInfo.$clickHandler;

            var wasScreenVisible = $dialog.is(":visible");
            $dialog.removeClass('active');
            $dialog.removeClass('animate-in');
            $dialog.addClass('animate-out');
            $dialog.one('animationend', function () {
                $dialog.removeClass('animate-out');
                $dialog.addClass('hidden');
            });

            $clickHandler
                .removeClass('active')
                .addClass('animate-hide')
                .one('animationend', function () {
                    if (!dontRemove) {
                        $clickHandler.remove();
                        $dialog.remove();
                    }
                    else {
                        $clickHandler.removeClass('animate-hide');
                    }
                });

            $(document.body).unbind('mousedown.onboarding' + screenId);
            $(document.body).unbind('keyup.onboarding' + screenId);

            if (wasScreenVisible && screenInfo.onHideFn) {
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
    };

    Onboarding.prototype._initGenericEvents = function(screenId, $clickHandler, $screen, $dialog, screenInfo) {
        var self = this;


        $clickHandler.on('click', function() {

            $('.fm-dialog-close', $dialog).rebind('click.onboarding', function() {
                self.hideClickHandler(screenId, screenInfo);
            });


            if (!$clickHandler.is(".active")) {
                // show

                screenInfo.dontShow = false;
                uiCheckboxes($('.checkbox-block', $dialog), undefined, function(state) {
                    if (state) {
                        screenInfo.dontShow = true;
                    }
                    else {
                        screenInfo.dontShow = false;
                    }
                });

                $dialog.css({
                    'top': 'auto',
                    'left': 'auto',
                });

                $dialog.position({
                    of: $clickHandler,
                    my: "left-2 top-2",
                    at: "right-55% center-2px",
                    using: function (obj, info) {
                        if (info.horizontal === "right") {
                            $dialog.addClass('flipped-animation');
                        }


                        $dialog.css({
                            left: obj.left + 'px',
                            top: obj.top + 'px'
                        });

                    }
                });

                $dialog.removeClass('hidden');
                $dialog.removeClass('fadeout');
                $dialog.addClass('active');

                if ($screen.height() > 300) {
                    $dialog.addClass('long-content');
                }

                $dialog.addClass('animate-in');

                $dialog.one('animationend', function() {
                    $dialog.removeClass('animate-in');
                });


                $clickHandler.addClass("active");

                $(document.body).rebind('mousedown.onboarding' + screenId, function(e) {
                    if (
                        $(e.target).closest($clickHandler).size() === 0 &&
                        $(e.target).closest($dialog).size() === 0
                    ) {
                        if (!self._lastShown) {
                            // was destroyed.
                            $(document.body).unbind('mousedown.onboarding' + screenId);
                            return;
                        }
                        self.hideClickHandler(screenId, screenInfo);
                    }
                });
                $(document.body).rebind('keyup.onboarding' + screenId, function(e) {
                    if (!self._lastShown) {
                        // was destroyed.
                        $(document.body).unbind('keyup.onboarding' + screenId);
                        return;
                    }

                    if (e.keyCode === 27) { // escape key maps to keycode `27`
                        self.hideClickHandler(screenId, screenInfo);
                    }
                });
            }
            else {
                self.hideClickHandler(screenId, screenInfo);
            }
        });
    };


    Onboarding.prototype.registerScreen = function(screenId, shouldShowFn, onHideFn) {
        var self = this;

        self.screens.push(
            {
                screenId: screenId,
                shouldShowFn: shouldShowFn,
                onHideFn: onHideFn
            }
        );
    };

    Onboarding.prototype.unregisterScreen = function(screenId) {
        var self = this;

        self.screens.some(function(screen, k) {
            if (screen.screenId === screenId) {
                removeValue(self.screens, screen);
                return true;
            }
        });
    };


    /**
     * This function would/should be called often, so that it would determinate which click handlers would need to be
     * added/removed to the DOM, depending on the current state of the app.
     * For now, we would be doing that on:
     *  - hash change
     *  - onboarding screen closing/hiding
     */
    Onboarding.prototype.eventuallyRenderClickHandlers = SoonFc(function() {
        var self = this;
        if (!self.screens) {
            // not initialised/destroyed
            return;
        }
        self.screens.forEach(function(v, k) {
            self._persisted.get(v.screenId).done(function(r) {
                if (r === 0) {
                    var res = v.shouldShowFn(self);
                    if (res) {
                        if (!self._lastShown[v.screenId]) {
                            var res2 = self._renderClickHandler(v.screenId, v, self._lastShown);
                            v['$clickHandler'] = res2[0];
                            v['$screen'] = res2[1];
                            v['$dialog'] = res2[2];
                            if (!self._lastShown[v.screenId]) {
                                self._lastShown[v.screenId] = v;
                            }
                        }
                        self._positionClickHandler(v.screenId, v);
                    }
                    else if (self._lastShown[v.screenId]) {
                        // was shown... and now we should hide it.
                        self._removeClickHandler(v.screenId, self._lastShown[v.screenId]);
                        delete self._lastShown[v.screenId];
                    }
                }
                else {
                    // was shown... and now we should hide it.
                    if (self._lastShown[v.screenId]) {
                        self._removeClickHandler(v.screenId, self._lastShown[v.screenId]);
                        delete self._lastShown[v.screenId];
                    }
                }
            });
        });

        Object.keys(self._lastShown).forEach(function (k) {
            var v = self._lastShown[k];
            self._positionClickHandler(k, v);
        });
    }, 150);


    Onboarding.prototype._renderClickHandler = function(screenId, screenInfo) {
        var self = this;
        var $clickHandler = self.$clickHandlerTemplate.clone();
        $clickHandler.attr('id', 'onboarding-' + screenId);

        var $onboardingDialogTemplate = self.$onboardingDialogTemplate.clone();
        $onboardingDialogTemplate.attr('id', 'onboarding-dialog-' + screenId);

        var $screen = $('#' + screenId, self.$screensContainer).clone();
        $('.onboarding-dialog-contents', $onboardingDialogTemplate).replaceWith($screen);

        // add some formatting ([B]...[/B])
        $('p', $screen).each(function() {
            var txt = $(this).text();
            txt = htmlentities(txt);
            txt = txt
                .replace("[B]", "<strong>")
                .replace("[/B]", "</strong>");

            $(this).html(txt);
        });

        $(document.body).append($onboardingDialogTemplate);

        $clickHandler.hide();
        $(document.body).append($clickHandler);
        $clickHandler.fadeIn();

        self._initGenericEvents(screenId, $clickHandler, $screen, $onboardingDialogTemplate, screenInfo);

        return [$clickHandler, $screen, $onboardingDialogTemplate];
    };

    Onboarding.prototype._removeClickHandler = function(screenId, screenInfo) {
        var self = this;
        screenInfo.$clickHandler.fadeOut(200, "easeInCubic", function() {
            screenInfo.$clickHandler.show();
            screenInfo.$clickHandler.remove();
            delete screenInfo.$clickHandler;
        });
        screenInfo.$dialog.fadeOut(200, "easeInCubic", function() {
            screenInfo.$dialog.remove();
            delete screenInfo.$dialog;
            delete screenInfo.$screen;
        });
    };

    Onboarding.prototype._positionClickHandler = function(screenId, screenInfo) {
        var self = this;

        var $screen = screenInfo.$screen;
        var $clickHandler = screenInfo.$clickHandler;

        if ($screen.data('clickHandlerPosition')) {
            var $targetElement = $($screen.data('clickHandlerPosition'));
            if (!$targetElement.is(":visible")) {
                if ($clickHandler && $clickHandler.is(":visible")) {
                    self.hideClickHandler(screenId, screenInfo);
                }
                return;
            }
            $clickHandler.position({
                of: $targetElement,
                my: $screen.data('clickHandlerPositionMy') ? $screen.data('clickHandlerPositionMy') : "left bottom",
                at: $screen.data('clickHandlerPositionAt') ? $screen.data('clickHandlerPositionAt') : "right center"
            });
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

        $(window).unbind('resize.onboarding');

        if (!self.screens) {
            // not initialised/was destroyed
            return;
        }

        $("#" + self.options.clickHandlerTemplateId).remove();
        $("#" + self.options.screensContainerId).remove();
        $("#" + self.options.onboardingDialogTemplateId).remove();
        if (self.$clickHandlerTemplate) {
            delete self.$clickHandlerTemplate;
        }

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
            v.$screen.remove();
            v.$clickHandler.remove();
            v.$dialog.remove();
        });

        delete self._lastShown;
        delete self.options;
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
                        if (self._lastShown[k]) {
                            delete self._lastShown[k];
                        }
                        self.eventuallyRenderClickHandlers();
                    }
                    else {
                        self.eventuallyRenderClickHandlers();
                    }
                });
            }

        });
    };

    // Define the screens and logic here...
    Onboarding.prototype._initScreens = function() {
        var self = this;

        self.registerScreen(
            'contacts-section',
            function _shouldShowOnboardingContacts() {
                if (
                    u_type !== 0 &&
                    is_fm() &&
                    !folderlink &&
                    M.u.keys().length <= 2 /* 1 of them == u_handle */ &&
                    $('.nw-fm-left-icon.contacts.active').size() === 0 &&
                    $('.nw-fm-left-icon.contacts:visible').size() > 0
                ) {
                    return true;
                }
            },
            function _onHideOnboardingContacts(screenId) {
                self.unregisterScreen(screenId);
            }
        );


        self.registerScreen(
            'chats-section',
            function shouldShowOnboardingChats() {
                if (
                    u_type !== 0 &&
                    is_fm() &&
                    !folderlink &&
                    megaChatIsReady &&
                    !megaChatIsDisabled &&
                    megaChat.chats.length <= 1 &&
                    ChatdIntegration.mcfHasFinishedPromise &&
                    ChatdIntegration.mcfHasFinishedPromise.state() === "resolved" &&
                    !megaChat.plugins.chatdIntegration.isLoading() &&
                    Number.isNaN(parseInt($('.new-messages-indicator:visible').text(), 10)) === true &&
                    $('.nw-fm-left-icon.conversations.active').size() === 0 &&
                    $('.nw-fm-left-icon.conversations:visible').size() > 0
                ) {
                    return true;
                }
                else if (typeof megaChat !== 'undefined') {
                    if (megaChat.plugins.chatdIntegration.isLoading() === false) {
                        $(megaChat.plugins.chatdIntegration).rebind('onMcfLoadingDone.onboardingChat', function() {
                            self.eventuallyRenderClickHandlers();
                        });
                    }
                    if (
                        ChatdIntegration.mcfHasFinishedPromise &&
                        ChatdIntegration.mcfHasFinishedPromise.state() === "pending"
                    ) {
                        // schedule an update in case the MCF is still loading
                        ChatdIntegration.mcfHasFinishedPromise.always(function() {
                            Soon(function() {
                                self.eventuallyRenderClickHandlers();
                            });
                        });
                    }

                }
            },
            function _onHideOnboardingChats(screenId) {
                self.unregisterScreen(screenId);
            }
        );

        self._initPersistence([
            'onboarding',
            'contacts-section',
            'chats-section'
        ]);
    };

    if(0) // disabled for now
    mBroadcaster.addListener('fm:initialized', function _delayedInitOnboarding() {
        if (!folderlink) {
            assert(typeof mega.ui.onboarding === 'undefined', 'unexpected onboarding initialization');
            assert(typeof u_handle !== 'undefined', 'onboarding expects a valid user...');

            mega.ui.onboarding = new mega.ui.Onboarding({});

            // we reached our goal, stop listening for fminitialized
            return 0xDEAD;
        }
    });

    // export
    scope.mega.ui.Onboarding = Onboarding;

})(jQuery, mBroadcaster, window);
