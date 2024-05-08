/**
 * Developer Settings Page Logic.
 */
(function(scope) {
    'use strict';

    scope.developerSettings = {
        $page: null,
        $targetAccountInput: null,
        $abTestSettings: null,
        $setUsedTransferQuota: null,
        $setStatus: null,
        $simpleButton: null,
        $userAttributes: null,
        $userAttributeButtons: null,
        targetCurrent: true,

        setValues: {},

        errorMessages: {
            '-2': 'Command Invalid',
            '-5': 'Cannot Apply To Target Account',
            '-9': 'No Item Found',
            '-11': 'No Access',
            '-16': 'Target account is not allowed, or does not exist',
            '-18': 'Command Temporarily Unavailable',
        },

        userAttrSymbols: {
            '-2': '^',
            '-1': '',
            'true': '+',
            'false': '*',
            '0': '',
            '1': '!'
        },

        /** Init Developer Settings Page. */
        init: function() {
            this.$page = $('.bottom-page.developer-settings');
            this.initSettings();
            this.initApplyButton();
            this.initAPICommandSettings();
        },

        /** Show Developer Setting Page. */
        show: function() {
            parsepage(pages['developersettings']);
            topmenuUI();
            this.init();
        },

        /** Reload to apply changes. **/
        apply: function() {
            window.location.reload();
        },

        /** Init HTML defined setting controls **/
        initSettings: function() {
            var $localStorageSettings = this.$page.find('.developer-setting.localstorage');

            // Load in current settings.
            $localStorageSettings.each(function() {
                var $this = $(this);
                $this.val(localStorage.getItem($this.attr('name')) || null);
            });

            // Change event save setting to local storage.
            $localStorageSettings.rebind('change', function() {
                var $this = $(this);
                var itemKey = $this.attr('name');
                var val =  $this.val();
                if (val) {
                    localStorage.setItem(itemKey, val);
                } else {
                    localStorage.removeItem(itemKey);
                }
            });
        },

        makeRequest(request, $buttons, setTo, id) {
            if ($buttons.hasClass('disabled')) {
                return;
            }
            $buttons.addClass('disabled').parent().removeClass('error');
            const targetAccount = this.$targetAccountInput.val();
            if (targetAccount) {
                request.t = targetAccount;
            }

            const $resText = $('.response', $buttons.parent());

            console.info('dev-settings request:', request);

            return api.req(request).then((res) => {
                console.info('dev-settings response:', res.result);
                if (id === 'transferQuota') {
                    if (this.targetCurrent) {
                        return;
                    }
                    setTo = bytesToSize(setTo);
                }
                else if (setTo) {
                    this.setValues[id] = setTo;
                }
                $resText.text('Set to: ' + (setTo || res.result));
            }).catch((ex) => {
                console.info('dev-settings error:', ex);
                $resText.text('Error: ' + this.errorMessages[ex] + ' (' + ex + ')' || ex);
            }).finally(() => {
                if (id === 'transferQuota') {
                    return;
                }
                $buttons.removeClass('disabled');
            });
        },

        async setABTestFlag() {
            const $buttons = $('button', this.$abTestSettings);
            const flagName = $('.ab-flag-name', this.$page).val().replace('ab_', '');
            const flag = $('.ab-flag-value', this.$page).val();
            if (!flag || !flagName) {
                this.$abTestSettings.addClass('error');
                return;
            }
            const request = {a: 'dev', aa: 'abs', c: 'ab_' + flagName, g: flag | 0};
            await this.makeRequest(request, $buttons, flag, 'ab_' + flagName);
            this.getABTestFlag(true);
        },

        getABTestFlag(skipCheck) {
            if (!skipCheck && $('.get', this.$abTestSettings).hasClass('disabled')) {
                return;
            }
            this.$abTestSettings.removeClass('error');
            const $response = $('.response', this.$abTestSettings);
            const flagName = 'ab_' + $('.ab-flag-name', this.$page).val().replace('ab_', '');
            const flagValue = this.setValues[flagName] || mega.flags[flagName];
            $response.text(typeof flagValue === 'undefined' ? 'Flag not found' : flagName + ' set to: ' + flagValue);
        },

        getTransferQuota() {
            if (!this.targetCurrent) {
                $('button', this.$setUsedTransferQuota).removeClass('disabled');
                return;
            }
            M.getTransferQuota().then((res) => {
                $('button', this.$setUsedTransferQuota).removeClass('disabled');
                const usedText = `Used: ${bytesToSize(res.caxfer)}.`;
                const emptyText = `Remaining: ${bytesToSize(res.max - res.caxfer)}`;
                const maxText = `Max: ${bytesToSize(res.max)}`;
                $('.current-used', this.$setUsedTransferQuota).text(usedText);
                $('.current-empty', this.$setUsedTransferQuota).text(emptyText);
                $('.current-max', this.$setUsedTransferQuota).text(maxText);
            });
        },

        setTransferQuota() {
            const $button = $('button', this.$setUsedTransferQuota);
            const sizeMultiplier = $('.dropdown', this.$setUsedTransferQuota).val() | 0;
            const size = ($('input.value', this.$setUsedTransferQuota).val());
            if (!size) {
                $button.parent().addClass('error');
                return;
            }
            const quota = +size * Math.pow(1024, sizeMultiplier);
            const request = {a: 'dev', aa: 'tq', q: quota};
            const promise = this.makeRequest(request, $button, quota, 'transferQuota');
            if (promise) {
                promise.then(() => this.getTransferQuota());
            }
        },

        setStatus(target) {
            const $setting = $(target).closest('.api-setting-item');
            const $button = $('button', $setting);
            const $dropdown = $('.dropdown', $setting);
            const value = $dropdown.val();
            const type = $dropdown.attr('name');
            const request = {a: 'dev', aa: type, s: value};
            this.makeRequest(request, $button, value, type);
        },

        handleSimpleButton(target) {
            const $setting = $(target).closest('.api-setting-item');
            const $button = $('button', $setting);
            const request = {a: 'dev', aa: $button.attr('name')};
            this.makeRequest(request, $button, false, $button.attr('name'));
        },

        getPublicHistoric() {
            let publicType = $('select.user-attr-public-type', this.$userAttributes).val();

            publicType = +publicType < 0
                ? +publicType
                : publicType === 'true';

            const isHistoric = $('select.user-attr-is-historic', this.$userAttributes).val() | 0;

            return [publicType, isHistoric];
        },

        setUserAttribute() {
            this.$userAttributeButtons = this.$userAttributeButtons || $('button', this.$userAttributes);
            const $set = ('.set', this.$userAttributeButtons);
            if ($set.hasClass('disabled')) {
                return;
            }
            const attrbuteName = $('input.user-attr-name', this.$userAttributes).val();
            const attrbutevalue = $('input.user-attr-value', this.$userAttributes).val();

            if (!attrbuteName || !attrbutevalue) {
                this.$userAttributes.addClass('error');
                return;
            }
            $set.addClass('disabled');
            this.$userAttributes.removeClass('error');

            const [publicType, isHistoric] = this.getPublicHistoric();

            mega.attr.set(attrbuteName, attrbutevalue, publicType, isHistoric, (res) => {
                this.getUserAttribute(res === u_handle, attrbutevalue);
            });
        },

        getUserAttribute(setComplete, valueSet) {

            this.$userAttributeButtons = this.$userAttributeButtons || $('button', this.$userAttributes);

            const $get = $('.get', this.$userAttributeButtons);
            if ($get.hasClass('disabled')) {
                return;
            }
            $get.addClass('disabled');
            this.$userAttributes.removeClass('error');
            this.$userAttributeButtons.addClass('disabled');

            const $responseText = $('.response', this.$userAttributes);
            const attrbuteName = $('input.user-attr-name', this.$userAttributes).val();
            const [publicType, isHistoric] = this.getPublicHistoric();
            const key = this.userAttrSymbols[publicType] + this.userAttrSymbols[isHistoric] + attrbuteName;

            if (setComplete || this.setValues[key]) {
                this.setValues[key] = valueSet || this.setValues[key];
                $responseText.text(key + ': ' + this.setValues[key]);
                this.$userAttributeButtons.removeClass('disabled');
                $get.addClass('disabled');
                return;
            }

            mega.attr.get(u_handle, attrbuteName, publicType, isHistoric, (res) => {
                if (res === -9) {
                    $responseText.text('Not set');
                }
                else {
                    $responseText.text(key + ': ' + res);
                }
            }).catch((ex) => {
                if (ex === -9) {
                    $responseText.text('Not set');
                }
                else {
                    $responseText.text('Error: ' + (this.errorMessages[ex] || 'Unknown issue: ' + ex));
                }
            }).finally(() => {
                this.$userAttributeButtons.removeClass('disabled');
                $get.addClass('disabled');
            });
        },

        initAPICommandSettings() {
            if (!u_attr) {
                $('.developer-settings-container > .logged-in', this.$page).addClass('hidden');
                return;
            }
            const $response = $('.response', this.$page);
            this.$abTestSettings = $('.ab-group-set', this.$page);
            this.$setUsedTransferQuota = $('.set-used-transfer', this.$page);
            this.$setStatus = $('.set-user-status, .set-business-status, .set-pro-flexi-status', this.$page);
            this.$userAttributes = $('.user-attr-settings', this.$page);
            this.$simpleButton = $('.adv-odq-warning-state, .force-reload, .remove-password-manager-attribute',
                                   this.$page);

            this.$targetAccountInput = $('.target-account', this.$page)
                .val(u_attr.email)
                .rebind('change.devsettings', () => {
                    $response.text('');
                    $('.current-info', this.$setUsedTransferQuota).text('');
                    this.targetCurrent = this.$targetAccountInput.val() === u_attr.email;
                    this.getTransferQuota();
                    $('button.get', this.$abTestSettings)
                        .toggleClass('disabled', !this.targetCurrent);
                });

            this.getTransferQuota();

            const clickName = 'click.devsettings';
            $('button.set', this.$abTestSettings).rebind(clickName, () => this.setABTestFlag());
            $('button.get', this.$abTestSettings).rebind(clickName, () => this.getABTestFlag());
            $('button.set', this.$setUsedTransferQuota).rebind(clickName, () => this.setTransferQuota());
            $('button.set', this.$setStatus).rebind(clickName, (e) => this.setStatus(e.target));
            $('button', this.$simpleButton).rebind(clickName, (e) => this.handleSimpleButton(e.target));
            $('button.set', this.$userAttributes).rebind(clickName, () => this.setUserAttribute());
            $('button.get', this.$userAttributes).rebind(clickName, () => this.getUserAttribute());
        },


        /** Init the page reload button **/
        initApplyButton() {
            this.$page.find('.apply').rebind('click.devsettings', () => {
                this.apply();
            });
        }
    };

})(mega);

mBroadcaster.once('fm:initialized', () => {
    'use strict';
    if (!localStorage.devSettDefault) {
        return;
    }
    onIdle(() => {
        mega.developerSettings.show();
    });
});
