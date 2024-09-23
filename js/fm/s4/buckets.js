lazy(s4, 'buckets', () => {
    'use strict';

    const {logger} = s4.utils;
    const {S4Dialog} = s4.ui.classes;

    class S4CreateDialog extends S4Dialog {
        constructor(name) {
            super(name, $('.s4-create-bucket-dialog', '.mega-dialog-container'));

            this.$bucketNameInput = $('input', this.$dialogContainer).val('');
            this.megaInput = new mega.ui.MegaInputs(
                this.$bucketNameInput,
                {onShowError: true}
            );
        }

        destroy() {
            super.destroy();

            this.reset();
            this.$dialogContainer.addClass('hidden').unbind('dialog-closed.s4dlg');
        }

        unbindEvents() {
            super.unbindEvents();

            this.megaInput.$input.unbind('input.s4dlg keydown.s4dlg');
            this.$dialogProgress.unbind('click.s4dlg');
        }

        bindEvents() {
            this.megaInput.$input.rebind('input.s4dlg keydown.s4dlg', (e) => {

                this.megaInput.hideError();
                if (e.currentTarget.value) {
                    this.$dialogProgress.removeClass('disabled');
                }
                else {
                    this.$dialogProgress.addClass('disabled');
                }

                if (e.which === 13) {
                    this.$dialogProgress.trigger('click');
                }
            });

            this.$dialogProgress.rebind('click.s4dlg', () => {

                const name = this.megaInput.$input.val();
                let errorMsg = '';

                if (this.progress || !name || !this.containerId
                    || this.$dialogProgress.hasClass('disabled')) {
                    return false;
                }

                if (!s4.kernel.isValidBucketName(name)) {
                    errorMsg = l.s4_invalid_bucket_name;
                }
                else if (duplicated(name)) { // Check if folder name already exists
                    errorMsg = l[23219];
                }

                if (errorMsg) {
                    return this.megaInput.showError(errorMsg);
                }
                mLoadingSpinner.show('s4-create-bucket');
                this.progress = true;
                Promise.resolve(M.d[this.containerId] || dbfetch.get(this.containerId))
                    .then(() => s4.kernel.bucket.create(this.containerId, name))
                    .then((h) => {
                        logger.assert(M.d[h], `Failed creating bucket on ${this.containerId}`);

                        if (typeof this.callback === 'function') {
                            this.callback(h);
                        }
                    })
                    .catch(tell)
                    .finally(() => {
                        this.hide();
                        mLoadingSpinner.hide('s4-create-bucket');
                        delete this.progress;
                    });
            });
        }

        reset() {
            delete this.containerId;
            delete this.callback;
            delete this.progress;
            this.megaInput.$input.val('');
            this.megaInput.hideError();
            this.$dialogProgress.addClass('disabled');
        }

        show(containerId, callback) {
            super.show();

            this.containerId = containerId || M.currentdirid;
            this.callback = callback;
        }
    }

    class S4SettingsDialog extends S4Dialog {
        constructor(name) {
            super(name, $('.s4-bucket-settings-dialog', '.mega-dialog-container'));

            this.$tabs = $('.fm-dialog-tab', this.$dialogContainer);
            this.$error = $('.bucket-policy-warning', this.$dialogContainer);
            this.infoTab = {
                $name: $('.bucket-info-field.name .value', this.$dialogContainer),
                $totalSize: $('.bucket-info-field.total-size .value', this.$dialogContainer),
                $contains: $('.bucket-info-field.contains .value', this.$dialogContainer),
                $dateAdded: $('.bucket-info-field.date-added .value', this.$dialogContainer),
            };

            this.policiesTab = Object.create(null);
        }

        destroy() {
            super.destroy();

            if (this.policiesTab.codeEditor) {
                this.policiesTab.codeEditor.toTextArea();
                this.policiesTab.codeEditor = undefined;
            }
        }

        hide() {
            super.hide();

            delete this.bucket;
            delete this.publicAccess;
            delete this.origAcces;
            delete this.origPolicy;
            delete this.tainted;

            if (this.policiesTab.codeEditor) {
                this.policiesTab.codeEditor.toTextArea();
                this.policiesTab.codeEditor = undefined;
            }
            this.$error.removeClass('visible');
            $('.fm-dialog-tab', this.$dialogContainer).removeClass('active');
            $('.content-container', this.$dialogContainer).addClass('hidden');
            $('.fm-dialog-tab.info', this.$dialogContainer).addClass('active');
            $('.bucket-info', this.$dialogContainer).removeClass('hidden');
        }

        show(bucket) {
            if (this.loading) {
                return false;
            }

            mLoadingSpinner.show('s4-bucket-settings');

            this.loading = true;

            M.require('codemirror_js', 'codemirrorscroll_js')
                .then(async() => {
                    this._initCodeMirror();
                    await this._setTabContent(bucket);
                    super.show();
                })
                .catch(tell)
                .finally(() => {
                    mLoadingSpinner.hide('s4-bucket-settings');
                    delete this.loading;
                });
        }

        unbindEvents() {
            super.unbindEvents();

            this.$tabs.unbind('click.s4dlg');
            $('.radio-wrap', this.$dialogContainer).unbind('click.s4dlg');
            this.$dialogProgress.unbind('click.s4dlg');
            this.$dialogCancel.unbind('click.s4dlg');
        }

        bindEvents() {
            this.$tabs.rebind('click.s4dlg', e => {
                const $clickedTab = $(e.target);

                if ($clickedTab.hasClass('active')) {
                    return;
                }
                const $activeTab = $('.fm-dialog-tab.active', this.$dialogContainer);
                $(`.${$activeTab.removeClass('active').data('target')}`, this.$dialogContainer)
                    .addClass('hidden');
                $(`.${$clickedTab.addClass('active').data('target')}`, this.$dialogContainer)
                    .removeClass('hidden');
                if ($clickedTab.data('target') === 'bucket-info') {
                    this.$dialogProgress.addClass('hidden');
                    this.$dialogCancel.addClass('hidden');
                }
                else {
                    this.$dialogProgress.removeClass('hidden');
                    this.$dialogCancel.removeClass('hidden');
                }
                this.policiesTab.codeEditor.refresh();
            });

            this.$radioInputs = $('input[name=bucket-access]', this.$dialogContainer);
            $('.radio-wrap', this.$dialogContainer).rebind('click.s4dlg', (e) => {
                const $clickedRadio = $('input', e.currentTarget);
                this.$radioInputs.prop('checked', false).parent()
                    .removeClass('radioOn').addClass('radioOff');
                $clickedRadio.prop('checked', true).parent()
                    .removeClass('radioOff').addClass('radioOn');
                this.publicAccess = parseInt($clickedRadio.val());
                this.changeProgressState();
            });

            this.$dialogProgress.rebind('click.s4dlg', () => {
                if (this.progress && this.$dialogProgress.hasClass('disabled')) {
                    return;
                }

                const promises = [];
                const inputVal = this.policiesTab.codeEditor.getValue();
                this.progress = true;
                loadingDialog.show('bucket-settings');

                if (this.origPolicy !== inputVal) {
                    const policyDoc = this.parsePolicyDoc(inputVal);

                    if (!policyDoc && inputVal) {
                        this.showError();
                        return false;
                    }

                    if (this.origPolicy && inputVal === '') {
                        promises.push(s4.kernel.policies.deleteBucketPolicy(this.bucket.h));
                    }
                    else {
                        promises.push(s4.kernel.policies.putBucketPolicy(this.bucket.h, policyDoc));
                    }
                }

                if (typeof this.publicAccess === 'number' && this.origAccess !== this.publicAccess) {
                    promises.push(s4.kernel.bucket.publicURLAccess(this.bucket.h, this.publicAccess));
                }

                Promise.all(promises)
                    .then(() => {
                        showToast('info', l.s4_b_settings_updated.replace('%1', this.bucket.name));
                        this.hide();
                    })
                    .catch((ex) => {
                        if (String(ex).includes('MalformedPolicy')) {
                            this.showError();
                        }
                        tell(ex);
                    })
                    .finally(() => {
                        this.progress = false;
                        loadingDialog.hide('bucket-settings');
                    });
            });

            this.$dialogCancel.rebind('click.s4dlg', () => {
                this._cancelCheck();
            });
        }

        showError() {
            this.$error.addClass('visible');
            this.$tabs.filter('.policies').trigger('click');
            this.progress = false;
            loadingDialog.hide('bucket-settings');
        }

        changeProgressState() {
            this.$dialogProgress.addClass('disabled');
            this.tainted = false;

            if (typeof this.publicAccess === 'number' && this.origAccess !== this.publicAccess
                || this.origPolicy !== this.policiesTab.codeEditor.getValue()) {
                this.$dialogProgress.removeClass('disabled');
                this.$error.removeClass('visible');
                this.tainted = true;
                return true;
            }

            return false;
        }

        validateStatement(obj) {
            const validKeys = new Set(
                [ 'Action', 'NotAction', 'Condition', 'Effect', 'Resource', 'Principal', 'NotPrincipal', 'Sid']
            );

            for (const key of Object.keys(obj)) {
                if (!obj[key] || !validKeys.has(key)) {
                    obj = false;
                    break;
                }
            }
            return obj;
        }

        parsePolicyDoc(inputVal) {
            const validKeys = new Set(['Version', 'Statement', 'Id']);
            const policyDoc = tryCatch(() => xmlParser.fromJSON(inputVal, true), false)();

            if (!policyDoc) {
                return false;
            }

            for (const k of Object.keys(policyDoc)) {
                let value = [];

                if (k === 'Statement' && typeof policyDoc[k] === 'object') {
                    if (Array.isArray(policyDoc[k])) {
                        for (const stVal of policyDoc[k]) {
                            const validatedVal = this.validateStatement(stVal);

                            if (!validatedVal) {
                                value = false;
                                break;
                            }
                            value.push(validatedVal);
                        }
                    }
                    else {
                        value = this.validateStatement(policyDoc[k]);
                    }
                }
                else if (typeof policyDoc[k] === 'string') {
                    value = policyDoc[k];
                }

                if (!validKeys.has(k) || !value) {

                    return false;
                }
            }

            return policyDoc;
        }

        _initCodeMirror() {
            const textArea = $('.bucket-policies .txtar', this.$dialogContainer)[0];
            this.policiesTab.codeEditor = CodeMirror.fromTextArea(textArea, {
                lineNumbers: true,
                mode: "javascript",
                autofocus: true,
                lineWrapping: true,
            });
        }

        /**
         * Sets the values for the fields on the Info tab.
         *
         * @param {MegaNode|Object} n Bucket node
         * @returns {void} void
         */
        async _setTabContent(n) {
            if (!(this.bucket = s4.kernel.getS4NodeType(n) === 'bucket' && n)) {
                return false;
            }

            this.infoTab.$name.text(this.bucket.name);
            this.infoTab.$totalSize.text(bytesToSize(this.bucket.tb));
            this.infoTab.$contains.text(mega.utils.trans.listToString([
                mega.icu.format(l.folder_count, this.bucket.td),
                mega.icu.format(l.file_count, this.bucket.tf)
            ], '%s'));
            this.infoTab.$dateAdded.text(time2date(this.bucket.ts));
            this.$radioInputs.prop('checked', false).parent()
                .removeClass('radioOn').addClass('radioOff');
            this.origAccess = s4.kernel.getPublicAccessLevel(this.bucket);
            this.origPolicy = await s4.kernel.policies.getBucketPolicy(this.bucket.h).catch(nop) || '';
            $(`input[value=${this.origAccess}]`, this.$dialogContainer)
                .prop('checked', true).parent().removeClass('radioOff').addClass('radioOn');
            this.$dialogProgress.addClass('hidden disabled');
            this.$dialogCancel.addClass('hidden');

            if (this.origPolicy) {
                this.origPolicy =
                    JSON.stringify(this.origPolicy, (_key, value) => value instanceof Set ? [...value] : value, 4);
            }
            this.policiesTab.codeEditor.setValue(this.origPolicy);
            this.policiesTab.codeEditor.on('change', () => this.changeProgressState());
        }
    }

    const dialogs = Object.create(null);
    lazy(dialogs, 'create', () => new S4CreateDialog('createfolder'));
    lazy(dialogs, 'settings', () => new S4SettingsDialog('bucket-settings'));

    return freeze({dialogs, S4CreateDialog, S4SettingsDialog});
});
