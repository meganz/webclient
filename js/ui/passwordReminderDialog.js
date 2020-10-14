(function(scope) {
    "use strict";

    var DEBUG = localStorage.debugPasswordReminderDialog || false;

    // all values are in seconds.
    var DAY = 86400;
    var SHOW_AFTER_LASTLOGIN = 14 * DAY;
    var SHOW_AFTER_LASTSKIP = 90 * DAY;
    // var SHOW_AFTER_LASTSKIP_LOGOUT = 30 * DAY;
    var SHOW_AFTER_ACCOUNT_AGE = 7 * DAY;
    var SHOW_AFTER_LASTSUCCESS = 90 * DAY;
    var RECHECK_INTERVAL = 15 * 60;

    if (DEBUG) {
        SHOW_AFTER_LASTLOGIN = 15;
        SHOW_AFTER_LASTSKIP = 30;
        // SHOW_AFTER_LASTSKIP_LOGOUT = 5;
        SHOW_AFTER_LASTSUCCESS = 45;
        SHOW_AFTER_ACCOUNT_AGE = DAY;
        RECHECK_INTERVAL = 15;
    }

    /** bindable events **/
    var MouseDownEvent = 'mousedown.prd';

    var PasswordReminderAttribute = function(dialog, changedCb, str) {
        var self = this;
        self.dialog = dialog;
        self._queuedSetPropOps = [];

        if (changedCb) {
            this.changedCb = changedCb;
        }
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop) {
            self["_" + prop] = 0;

            Object.defineProperty(self, prop, {
                get: function() { return self["_" + prop]; },
                set: function(newValue) {
                    if (!self.loading) {
                        self._queuedSetPropOps.push([prop, newValue]);
                    }
                    else if (self.loading && self.loading.state() === 'pending') {
                        self.loading.always(function() {
                            self["_" + prop] = newValue;
                            self.hasChanged(prop);
                        });
                    }
                    else {
                        self["_" + prop] = newValue;
                        self.hasChanged(prop);
                    }
                },
                enumerable: true,
                configurable: true
            });
        });


        if (str) {
            self.mergeFromString(str);
        }
    };

    PasswordReminderAttribute.prototype.mergeFromString = function(str) {
        var self = this;

        var vals = str.split(":");
        var wasMerged = false;
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop, index) {
            var val = typeof vals[index] !== 'undefined' ? parseInt(vals[index]) : 0;

            if (Number.isNaN(val)) {
                val = 0;
            }

            if (self["_" + prop] !== val) {
                self["_" + prop] = val;
                wasMerged = true;
            }
        });
        if (wasMerged) {
            self.hasBeenMerged();
        }
    };

    PasswordReminderAttribute.prototype.hasChanged = function(prop) {
        // Update ui?
        if (this.changedCb) {
            this.changedCb(prop);
        }

        // Save via mega.attr
        this.savingPromise = this.save();

        var self = this;
        self.savingPromise.always(function() {
            delete self.savingPromise;
        });
    };

    PasswordReminderAttribute.prototype.hasBeenMerged = function() {
        // update ui?
        if (this.changedCb) {
            this.changedCb();
        }
    };

    PasswordReminderAttribute.prototype.toString = function() {
        var self = this;
        var vals = [];
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop) {
            vals.push(self["_" + prop]);
        });
        return vals.join(":");
    };

    PasswordReminderAttribute.prototype.save = function() {
        var proxyPromise = new MegaPromise();
        var self = this;

        delay('pra_save', function() {
            proxyPromise.linkDoneAndFailTo(
                mega.attr.set(
                    "prd",
                    self.toString(),
                    -2,
                    true
                )
            );
        }, 500);

        return proxyPromise;
    };

    PasswordReminderAttribute.prototype.loadFromAttribute = function() {
        var self = this;

        if (self.loading) {
            return;
        }

        self.loading = mega.attr.get(u_handle, 'prd', -2, true)
            .done(function (r) {
                if (isString(r)) {
                    self.dialog._initFromString(r);
                }
                else {
                    self.dialog._initFromString("");
                }
            })
            .fail(function (e) {
                if (e === ENOENT) {
                    self.dialog._initFromString("");
                }
            })
            .always(function() {
                if (self._queuedSetPropOps.length > 0) {
                    self._queuedSetPropOps.forEach(function(op) {
                        self[op[0]] = op[1];
                    });
                    self._queuedSetPropOps = [];
                }
                if (self.changedCb) {
                    self.changedCb();
                }
            });
    };

    PasswordReminderAttribute.prototype.attributeUpdatedViaAp = function() {
        if (this.loading) {
            this.loading.reject();
            this.loading = false;
        }

        this.loadFromAttribute();
    };

    /**
     * Those properties are intentionally stored in an array, they are ordered and that order is important for when
     * saving/retrieving data from mega.attr.*.
     * In case a new key is added, please append it at the end of the list.
     * Never remove a key from the array above.
     *
     * @type {Array}
     */
    PasswordReminderAttribute.PROPERTIES = [
        'lastSuccess',
        'lastSkipped',
        'masterKeyExported',
        'dontShowAgain',
        'lastLogin'
    ];



    var PasswordReminderDialog = function() {
        var self = this;
        self.isLogout = false;
        self.passwordReminderAttribute = new PasswordReminderAttribute(self, function(prop) {
            self.recheck(prop !== "lastSuccess" && prop !== "dontShowAgain" ? true : false);
        });
    };

    PasswordReminderDialog.prototype.bindEvents = function() {
        var self = this;

        $(window).rebind('resize.prd', self.repositionDialog.bind(self));

        $(this.dialog.querySelectorAll(is_mobile
            ? '.button-prd-confirm, .button-prd-skip, .change-password-button, .button-prd-backup'
            : '.default-white-button, .default-big-button'
        )).rebind('click.prd', function(e) {
            self.onButtonClicked(this, e);
        });

        $(self.passwordField).rebind('keypress.prd', function(e) {
            if (!self.dialog) {
                console.warn('This event should no longer be reached...');
                return;
            }
            if (e.which === 13 || e.keyCode === 13) {
                $(self.dialog.querySelector('.button-prd-confirm')).triggerHandler('click');
                return false;
            }
        });

        $(self.dialog.querySelector('.fm-dialog-close')).rebind('click.prd', function() {
            self.dismiss();
            return false;
        });

        // Handle forgot password button.
        $(self.dialog.querySelector('.forgot-password')).rebind('click.prd', function() {
            self.onChangePassClicked();
            return false;
        });

        uiCheckboxes(
            $(this.dialog.querySelector(is_mobile ? '.content-cell' : '.content-block')),
            undefined,
            function(newState) {
                if (newState === true) {
                    self.passwordReminderAttribute.dontShowAgain = 1;
                }
                else {
                    self.passwordReminderAttribute.dontShowAgain = 0;
                }
            },
            self.passwordReminderAttribute.dontShowAgain === 1
        );

    };

    /**
     * Dismiss the dialog, rejecting the action promise and hide from view.
     * @return {false}
     */
    PasswordReminderDialog.prototype.dismiss = function() {
        if (self._dialogActionPromise && self._dialogActionPromise.state() === 'pending') {
            self._dialogActionPromise.reject();
        }
        this.hide();
    };

    PasswordReminderDialog.prototype.onButtonClicked = function(element, evt) {
        if (element.classList.contains('button-prd-confirm')) {
            this.onConfirmClicked(element, evt);
        }
        else if (element.classList.contains('button-prd-skip')) {
            this.onSkipClicked(element, evt);
        }
        else if (element.classList.contains('button-prd-backup')) {
            this.onBackupClicked(element, evt);
        }
        else if (element.classList.contains('change-pass')) {
            this.onChangePassClicked(element, evt);
        }
    };

    PasswordReminderDialog.prototype.onConfirmClicked = function(element, evt) {

        var enteredPassword = this.passwordField.value;
        var self = this;

        this.resetUI();

        // Derive the keys from the password
        security.getDerivedEncryptionKey(enteredPassword)
            .then(function(derivedKey) {
                self.completeOnConfirmClicked(derivedKey);
            })
            .catch(function(ex) {
                console.warn(ex);
                self.completeOnConfirmClicked('');
            });
    };

    PasswordReminderDialog.prototype.completeOnConfirmClicked = function(derivedEncryptionKeyArray32) {

        if (checkMyPassword(derivedEncryptionKeyArray32)) {
            if (this.correctLabel) {
                this.correctLabel.classList.remove('hidden');
            }
            this.passwordReminderAttribute.lastSuccess = unixtime();

            var skipButtonSpan = this.dialog.querySelector('.button-prd-skip span');
            if (skipButtonSpan) {
                skipButtonSpan.innerText = l[148];
                this.succeeded = true;
            }
        }
        else {
            if (this.dialog) {
                this.dialog.classList.add('wrong');
            }
            if (this.wrongLabel) {
                this.wrongLabel.classList.remove('hidden');
            }
            if (this.correctLabel) {
                this.correctLabel.classList.add('hidden');
            }
            if (this.passwordField) {
                this.passwordField.value = "";
                $(this.passwordField).focus();
            }

            if (is_mobile) {
                this.exportButton.classList.remove('green-button');
                this.exportButton.classList.add('red-button');
            }
        }
    };

    PasswordReminderDialog.prototype.onSkipClicked = function(element, evt) {
        if (!this.succeeded) {
            this.passwordReminderAttribute.lastSkipped = unixtime();
        }
        else {
            this.hideIcon();
        }
        if (this.passwordField) {
            this.passwordField.classList.add('hidden');
        }

        this.hide();
        delete $.dialog;

        this.onLogoutDialogUserAction();
    };

    PasswordReminderDialog.prototype.onLogoutDialogUserAction = function() {
        var self = this;

        if (self.passwordReminderAttribute.savingPromise) {
            if (self._dialogActionPromise && self._dialogActionPromise.state() === 'pending') {
                loadingDialog.show();
                self._dialogActionPromise.always(function() {
                    loadingDialog.hide();
                });
            }
            self.passwordReminderAttribute.savingPromise.always(function() {
                if (self._dialogActionPromise && self._dialogActionPromise.state() === 'pending') {
                    self._dialogActionPromise.resolve();
                }
            });
        }
        else {
            if (self._dialogActionPromise && self._dialogActionPromise.state() === 'pending') {
                self._dialogActionPromise.resolve();
            }
        }
    };

    PasswordReminderDialog.prototype.onKeyExported = function() {
        this.passwordReminderAttribute.masterKeyExported = 1;
    };

    PasswordReminderDialog.prototype.onBackupClicked = function(element, evt) {
        this.hide();

        if (this._dialogActionPromise && this._dialogActionPromise.state() === 'pending') {
            this._dialogActionPromise.reject();
        }

        if (this.passwordField) {
            // clear the password field, so that if it was filled in the dialog would hide
            this.passwordField.value = "";
        }

        delete $.dialog;

        loadSubPage('/backup');
    };

    PasswordReminderDialog.prototype.onChangePassClicked = function(element, evt) {
        this.hide();

        if (this._dialogActionPromise && this._dialogActionPromise.state() === 'pending') {
            this._dialogActionPromise.reject();
        }

        if (this.passwordField) {
            // clear the password field, so that if it was filled in the dialog would hide
            this.passwordField.value = "";
        }

        delete $.dialog;

        loadSubPage(is_mobile ? '/fm/account/email-and-pass' : '/fm/account/security');
    };

    PasswordReminderDialog.prototype.init = function() {
        var self = this;

        if (!self.initialised) {
            self.initialised = true;
        }

        if (!self.passwordReminderAttribute.loading) {
            self.passwordReminderAttribute.loadFromAttribute();
        }
        else {
            self.recheck();
        }
    };

    PasswordReminderDialog.prototype.onTopmenuReinit = function () {
        if (this.topIcon && !document.body.contains(this.topIcon)) {
            // reinit if the this.topIcon is detached from the DOM.
            if (this.isShown) {
                this.hide();
            }
            this.initialised = false;
            this.topIcon = null;
            this.dialog = null;
            this.wrongLabel = null;
            this.correctLabel = null;
        }
        this.prepare();
        this.repositionDialog();
    };

    /**
     * Prepare the PRD.
     * @returns {void}
     */
    PasswordReminderDialog.prototype.prepare = function() {
        if (this.initialised) {
            this.resetUI();
        }
        else {
            this.init();
        }
    };

    PasswordReminderDialog.prototype._initFromString = function(str) {
        var self = this;

        self.passwordReminderAttribute.mergeFromString(str);

        if (self.recheckInterval) {
            clearInterval(self.recheckInterval);
        }

        if (!self.passwordReminderAttribute.dontShowAgain) {
            self.recheckInterval = setInterval(function () {
                self.recheck();
            }, RECHECK_INTERVAL * 1000);

            self.recheck();
        }
    };

    PasswordReminderDialog.prototype.recheck = function(hideIfShown) {
        var self = this;
        if (!u_handle) {
            // user is in the middle of a logout...
            return;
        }

        // skip any re-checks in case this is the 'cancel' page
        if (window.location.toString().indexOf("/cancel") > -1) {
            return;
        }


        // console.error([
        //     "checks",
        //     self.passwordReminderAttribute.toString(),
        //     !self.passwordReminderAttribute.masterKeyExported,
        //     !self.passwordReminderAttribute.dontShowAgain,
        //     unixtime() - u_attr.since > SHOW_AFTER_ACCOUNT_AGE,
        //     unixtime() - self.passwordReminderAttribute.lastSuccess > SHOW_AFTER_LASTSUCCESS,
        //     unixtime() - self.passwordReminderAttribute.lastLogin > SHOW_AFTER_LASTLOGIN
        // ]);


        // account is older then > SHOW_AFTER_ACCOUNT_AGE and lastLogin > SHOW_AFTER_LASTLOGIN
        if (
            u_type === 3 &&
            !self.passwordReminderAttribute.masterKeyExported &&
            !self.passwordReminderAttribute.dontShowAgain &&
            unixtime() - u_attr.since > SHOW_AFTER_ACCOUNT_AGE &&
            unixtime() - self.passwordReminderAttribute.lastSuccess > SHOW_AFTER_LASTSUCCESS &&
            unixtime() - self.passwordReminderAttribute.lastLogin > SHOW_AFTER_LASTLOGIN
        ) {
            // skip recheck in case:
            // - there is no top-icon, i.e. we are on a custom page
            // - there is a visible .dropdown
            // - the user had a textarea, input or select field focused
            // - there is a visible/active dialog
            var skipShowingDialog = !self.showIcon()
                || $(
                    'textarea:focus, input:focus, select:focus, .dropdown:visible:first, .fm-dialog:visible:first'
                ).length > 0;

            if (
                !skipShowingDialog &&
                is_fm() &&
                !pfid &&
                (
                    !self.passwordReminderAttribute.lastSkipped ||
                    unixtime() - self.passwordReminderAttribute.lastSkipped > SHOW_AFTER_LASTSKIP
                )
            ) {
                self.isLogout = false;
                self.show();
            }
            else {
                if (hideIfShown && (!self.passwordField || self.passwordField.value === "")) {
                    self.hide();
                }
            }
        }
        else {
            // only hide if the passwordField was not just entered with some value.
            if (hideIfShown && (!self.passwordField || self.passwordField.value === "")) {
                self.hideIcon();
                if (self.isShown) {
                    self.hide();
                }
            }
        }
    };

    PasswordReminderDialog.prototype.topIconClicked = function() {
        this[this.isShown ? 'hide' : 'show']();
    };

    PasswordReminderDialog.prototype.showIcon = function() {
        if (!this.topIcon || this.topIcon.classList.contains('hidden') || !document.body.contains(this.topIcon)) {
            // because, we have plenty of top menus, that may not be visible/active
            this.topIcon = $('.top-head:visible .top-icon.pass-reminder')[0];
            if (this.topIcon) {
                this.topIcon.classList.remove('hidden');
                $(this.topIcon).rebind('click.prd', this.topIconClicked.bind(this));
            }
        }
        return !!this.topIcon;
    };

    PasswordReminderDialog.prototype._initInternals = function() {
        this.dialog = document.querySelector(is_mobile
            ? '.mobile.password-reminder-overlay'
            : '.dropdown.body.pass-reminder'
        );
        assert(this.dialog, 'this.dialog not found');
        this.passwordField = this.dialog.querySelector('input#test-pass');
        $(this.passwordField).rebind('focus.hack', function() {
            if (ua.details.browser === "Chrome") {
                $(this).attr('style', '-webkit-text-security: disc;');
            }
            else {
                $(this).attr('type', 'password');
            }
            $(this).removeAttr('readonly');
            $(this).attr('autocomplete', 'section-off' + rand_range(1, 123244) + ' off disabled nope no none');
        });
        this.passwordField.classList.remove('hidden');
        this.passwordField.value = "";

        this.wrongLabel = this.dialog.querySelector('.pass-reminder.wrong');
        this.correctLabel = this.dialog.querySelector('.pass-reminder.accepted');

        this.exportButton = this.dialog.querySelector('.button-prd-backup');

        this.firstText = this.dialog.querySelector('.pass-reminder.info-txt');

        if (this.firstText) {

            $(this.firstText).html(
                escapeHTML(!this.isLogout ? l[16900] : l[20633])
                    .replace('[A]', '<a \n' +
                        'href="https://mega.nz/security" target="_blank" class="red">')
                    .replace('[/A]', '</a>')
            );
        }
        this.resetUI();

        this.bindEvents();
    };

    PasswordReminderDialog.prototype.show = function() {
        if (this.isShown) {
            return;
        }
        this.isShown = true;

        this._initInternals();

        assert(this.dialog, 'dialog not defined.');

        if (is_mobile) {
            this.dialog.classList.add('overlay');
        }
        else {
            assert(this.topIcon, 'topIcon not defined.');
            this.repositionDialog();
            $(document.body).rebind(MouseDownEvent, this.onGenericClick.bind(this));
        }

        this.dialog.classList.remove('hidden');
    };


    PasswordReminderDialog.prototype.resetUI = function() {
        if (this.dialog) {
            this.dialog.classList.remove('wrong');
        }
        if (this.wrongLabel) {
            this.wrongLabel.classList.add('hidden');
        }
        if (this.correctLabel) {
            this.correctLabel.classList.add('hidden');
        }

        if (this.exportButton) {
            this.exportButton.classList.remove('red-button');
            this.exportButton.classList.add('green-button');
        }
    };


    PasswordReminderDialog.prototype.repositionDialog = function() {
        if (this.isShown) {
            topPopupAlign('.top-icon.pass-reminder', '.dropdown.pass-reminder', 40);
        }
        if (this.dialogShown) {
            // center position
            this.dialog.style.left = (document.body.clientWidth - this.dialog.clientWidth) / 2 + "px";
            this.dialog.style.top = (document.body.clientHeight - this.dialog.clientHeight) / 2 + "px";
        }
    };

    PasswordReminderDialog.prototype.hide = function() {
        if (this.dialogShown) {
            return this.hideDialog();
        }
        if (!this.isShown) {
            return;
        }

        this.isShown = false;
        assert(this.dialog, 'dialog not defined.');

        this.resetUI();

        this.dialog.classList.add('hidden');

        $(window).off('resize.prd');
        $(document.body).off(MouseDownEvent);
    };

    PasswordReminderDialog.prototype.onGenericClick = function(e) {
        if (this.dialogShown) {
            // in case this is the dialog shown (not the popup), don't hide it when the user clicks on the overlay
            return;
        }

        if (
            $(e.target).parents('.pass-reminder').length === 0 &&
            !$(e.target).is('.pass-reminder')
        ) {
            if (this.isShown) {
                this.onSkipClicked();
            }
        }
    };

    PasswordReminderDialog.prototype.hideIcon = function() {
        if (!this.topIcon) {
            return;
        }

        this.topIcon.classList.add('hidden');
        $(this.topIcon).off('click.prd');
    };

    PasswordReminderDialog.prototype.showDialog = function(promise) {
        if (this.dialogShown) {
            return;
        }

        $.dialog = "prd";
        this.dialogShown = true;

        this._initInternals();

        if (is_mobile) {
            this.dialog.classList.add('overlay');
        }
        else {
            fm_showoverlay();
            this.dialog.classList.add('fm-dialog');
        }

        this.dialog.classList.remove('hidden');

        if (promise) {
            this._dialogActionPromise = promise;
        }
        if (!is_mobile) {
            this.repositionDialog();
        }
    };

    PasswordReminderDialog.prototype.hideDialog = function() {
        this.dialogShown = false;

        fm_hideoverlay();

        this.dialog.classList.add('hidden');
        this.dialog.classList.remove('fm-dialog');
        if (is_mobile) {
            this.dialog.classList.remove('overlay');
        }

        this.resetUI();

        $(window).off('resize.prd');
        $(document.body).off(MouseDownEvent);
        $(this.passwordField).off('keypress.prd');
    };

    PasswordReminderDialog.prototype.recheckLogoutDialog = function() {
        var self = this;
        if (!u_handle) {
            // user is in the middle of a logout...
            return MegaPromise.resolve();
        }

        // skip any re-checks in case this is the 'cancel' page
        if (window.location.toString().indexOf("/cancel") > -1) {
            return MegaPromise.resolve();
        }

        var returnedPromise = new MegaPromise();


        // console.error([
        //     "checks",
        //     self.passwordReminderAttribute.toString(),
        //     !self.passwordReminderAttribute.masterKeyExported,
        //     !self.passwordReminderAttribute.dontShowAgain,
        //     unixtime() - u_attr.since > SHOW_AFTER_ACCOUNT_AGE,
        //     unixtime() - self.passwordReminderAttribute.lastSuccess > SHOW_AFTER_LASTSUCCESS,
        //     unixtime() - self.passwordReminderAttribute.lastLogin > SHOW_AFTER_LASTLOGIN
        // ]);

        // Intentionally copying the logic from .recheck, so that we can alter it for the logout action

        // account is older then > SHOW_AFTER_ACCOUNT_AGE and lastLogin > SHOW_AFTER_LASTLOGIN
        if (
            u_type === 3 &&
            /*!self.passwordReminderAttribute.masterKeyExported &&*/
            !self.passwordReminderAttribute.dontShowAgain/* &&
            unixtime() - u_attr.since > SHOW_AFTER_ACCOUNT_AGE &&
            unixtime() - self.passwordReminderAttribute.lastSuccess > SHOW_AFTER_LASTSUCCESS &&
            unixtime() - self.passwordReminderAttribute.lastLogin > SHOW_AFTER_LASTLOGIN*/
        ) {
            if (
                is_fm() &&
                !pfid/* &&
                (
                    !self.passwordReminderAttribute.lastSkipped ||
                    unixtime() - self.passwordReminderAttribute.lastSkipped > SHOW_AFTER_LASTSKIP_LOGOUT
                )*/
            ) {

                self.isLogout = true;
                self.showDialog(returnedPromise);
            }
            else {
                returnedPromise.resolve();
            }
        }
        else {
            returnedPromise.resolve();
        }

        return returnedPromise;
    };

    var passwordReminderDialog = new PasswordReminderDialog();
    scope.mega.ui.passwordReminderDialog = passwordReminderDialog;

    mBroadcaster.once('login', function() {
        // cancel page can trigger a login event, which should NOT trigger PRD attribute update.
        if (window.location.toString().indexOf("/cancel") > -1) {
            return;
        }

        // since u_type is not available yet, assuming that 'login' would only be triggered by a normal user login
        // e.g. u_type === 3
        passwordReminderDialog.passwordReminderAttribute.lastLogin = unixtime();
    });

    mBroadcaster.addListener('keyexported', function() {
        passwordReminderDialog.onKeyExported();
    });

    mBroadcaster.addListener('attr:passwordReminderDialog', function() {
        passwordReminderDialog.passwordReminderAttribute.attributeUpdatedViaAp();
    });

})(window);
