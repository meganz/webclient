/**
 * Mobile web flow to import files from another cloud service.
 */
lazy(mobile, 'migrate', () => {

    'use strict';

    const overlayName = 'migrate-overlay';
    let wake = 0;

    if (is_ios) {

        // iOS can leave tSleep() stalled on an interrupted audio clock once Safari leaves the foreground
        document.addEventListener('visibilitychange', function _wake() {

            gClearTimeout(wake);

            if (mobile.migrate._visible) {

                tSleep(1).expedite();

                if (document.hidden) {
                    // eslint-disable-next-line no-restricted-syntax
                    wake = gSetTimeout(_wake, 1e3);
                }
            }
        });
    }

    return {
        seq: 0,

        async show(fromApp, ongoing) {

            this.seq++;
            this.providers = null;
            this.fromApp = !!fromApp;
            this.ongoing = ongoing;
            this.providerId = null;
            this.parent = M.currentdirid && M.getNodeRoot(M.currentdirid) === M.RootID ? M.currentdirid : M.RootID;

            if (mega.config.get('mnzw') | 0) {
                return this._selectProvider();
            }

            if (this.fromApp && await this._selectProvider() === false) {
                return;
            }
            this._disclaimer();
        },

        resume(saved) {

            const {res, prefetchId, ...state} = JSON.parse(saved);

            this.seq++;
            this.providers = null;
            Object.assign(this, state);

            return res.state && res.code ? this._prepare(res, prefetchId) : this._authFailed(res);
        },

        get _visible() {
            return mega.ui.overlay.visible && mega.ui.overlay.name === overlayName;
        },

        _close() {

            this.seq++;
            sessionStorage.removeItem('mtoolAuth');
            mega.ui.overlay.hide(overlayName);
        },

        // Chrome on iOS can reload this tab on the way back from the provider's
        _save(res, prefetchId) {

            sessionStorage.mtoolAuth = JSON.stringify({
                res,
                prefetchId,
                providerId: this.providerId,
                parent: this.parent,
                fromApp: this.fromApp,
                ongoing: this.ongoing
            });
        },

        _backToApp() {

            this._close();
            goToMobileApp(MegaMobileViewOverlay.getAppLink(M.RootID));
        },

        _alert(title, message, onInteraction) {
            megaMsgDialog.render(
                title,
                message,
                '',
                {onInteraction},
                {icon: msgDialog.icons.warninga, sheetClassList: ['migrate-dialog']},
                false,
                true
            );
        },

        _render({step, body, note, buttons}) {

            mega.ui.overlay.show({
                name: overlayName,
                classList: [overlayName],
                showClose: true,
                header: l.import_from_another,
                contents: [body],
                actionOnBottom: true,
                onClose: () => this._close()
            });

            if (step) {

                const stepper = mCreateElement('div', {class: 'migrate-stepper'});

                mCreateElement('span', null, stepper).textContent = l.mig_step_label
                    .replace('%1', step)
                    .replace('%2', 2)
                    .replace('%3', step > 1 ? l.mig_review : l.mig_select_provider);

                const progress = mCreateElement('div', {class: 'migrate-progress'}, stepper);

                mCreateElement('i', {class: 'active'}, progress);
                mCreateElement('i', {class: step > 1 ? 'active' : ''}, progress);

                mega.ui.overlay.headerTitleNode.after(stepper);
                mega.ui.overlay.one('clear.migrate', () => stepper.remove());
                mega.ui.overlay.one('hide.migrate', () => stepper.remove());
            }

            if (note) {
                mega.ui.overlay.actionsNode.appendChild(note);
            }

            const wrap = mCreateElement('div', {class: 'migrate-buttons'}, mega.ui.overlay.actionsNode);

            return buttons.map(({text, secondary, disabled, onClick}) => new MegaButton({
                parentNode: wrap,
                type: 'normal',
                componentClassname: `block ${secondary ? 'secondary' : 'primary'}`,
                text,
                disabled
            }).on('click', function() {

                if (!this.disabled && !this.loading) {
                    onClick();
                }
            }));
        },

        _state(icon, title, text) {

            const node = mCreateElement('div', {class: 'migrate-state'});

            mCreateElement('i', {class: icon}, node);
            mCreateElement('h2', null, node).textContent = title;
            mCreateElement('p', null, node).textContent = text || '';

            return node;
        },

        _disclaimer() {

            const _cancel = () => {

                eventlog(501422);
                mega.ui.sheet.hide();

                if (this.fromApp) {
                    this._backToApp();
                }
            };

            mega.ui.sheet.show({
                name: 'migrate-warning',
                type: 'modal',
                showClose: true,
                preventBgClosing: true,
                icon: 'migration-warning-image',
                classList: ['migrate-dialog'],
                title: l.mig_import_warning_title,
                contents: [l.mig_import_warning_contents],
                confirmClose: async() => {

                    _cancel();

                    return false;
                },
                actions: [{
                    type: 'normal',
                    className: 'secondary',
                    text: l[82],
                    onClick: _cancel
                }, {
                    type: 'normal',
                    text: l.mig_i_understand,
                    onClick: () => {

                        mega.config.set('mnzw', 1);
                        mega.ui.sheet.hide();
                        eventlog(501421);

                        if (!this._visible) {
                            this._selectProvider();
                        }
                    }
                }]
            });
        },

        async _selectProvider(selected) {

            const {knownProviders} = mega.migrate;
            const body = mCreateElement('div', {class: 'migrate-select'});
            const note = mCreateElement('div', {class: 'migrate-note hidden'});

            if (!this.providers) {

                loadingDialog.show('migrate-providers');

                this.providers = await mega.migrate.getProviders().catch(dump);

                loadingDialog.hide('migrate-providers');

                if (!this.providers) {

                    this._alert(l.mig_fail, l.mig_error, () => this.fromApp && this._backToApp());
                    return false;
                }
            }

            const ids = Object.keys(this.providers).filter(id => {

                if (!knownProviders[id] && d) {
                    console.warn(`Migration provider ${id} not recognised; skipping.`);
                }

                return !!knownProviders[id];
            });
            const list = mCreateElement('div', {class: 'migrate-providers'});
            const _note = () => {

                note.textContent = this.ongoing ? l.mig_ongoing :
                    l.mig_permission_required.replace('%1', knownProviders[this.providerId].name);
                note.prepend(mCreateElement('i', {class: 'sprite-mobile-fm-mono icon-info-thin-outline'}));
                note.classList.remove('hidden');
            };

            this.providerId = ids.includes(selected) ? selected : null;

            mCreateElement('h2', null, body).textContent = l.mig_select_provider_title;
            body.appendChild(list);
            mega.migrate.renderServiceGuides(body, this.providers);

            const [authorise] = this._render({
                step: 1,
                body,
                note,
                buttons: [{
                    text: l.mig_authorise,
                    disabled: !this.providerId,
                    onClick: () => this._authorise(authorise)
                }, {
                    text: l.mig_go_back,
                    secondary: true,
                    onClick: () => {

                        eventlog(501424);

                        if (this.fromApp) {
                            return this._backToApp();
                        }
                        this._close();
                    }
                }]
            });
            const group = new MegaMobileRadioGroup({
                name: 'migrate-provider',
                align: 'right',
                radios: ids.map(id => ({
                    parentNode: list,
                    className: 'migrate-provider',
                    label: knownProviders[id].name,
                    value: id,
                    checked: id === this.providerId,
                    disabled: this.ongoing
                })),
                onChange: () => {

                    this.providerId = group.value;
                    eventlog(501423, this.providerId);
                    authorise.disabled = false;
                    _note();
                }
            });

            for (const id of ids) {

                const icon = mCreateElement('span', {class: 'migrate-provider-icon'});

                mCreateElement('i', {class: `${knownProviders[id].icon} icon-size-24`}, icon);
                group.getChild(id).domNode.querySelector('.label-wrapper').prepend(icon);
            }

            if (this.providerId || this.ongoing) {
                _note();
            }
        },

        async _authorise(authorise) {

            // Started within the user gesture, so the provider tab isn't blocked
            const oAuth = mega.migrate.runOAuthPopup(this.providerId);
            const ticket = this.seq;

            eventlog(501425, this.providerId);

            authorise.loading = true;

            const res = await oAuth.catch(dump) || false;

            if (ticket !== this.seq || !this._visible) {
                return;
            }
            this._save(res);

            if (!res.state || !res.code) {
                return this._authFailed(res);
            }

            eventlog(501426, this.providerId);

            return this._prepare(res);
        },

        async _prepare(res, prefetchId) {

            const {knownProviders} = mega.migrate;
            const ticket = this.seq;

            this._loading(l.mig_preparing);

            if (!prefetchId) {

                const {state, code, redirectUri} = res;

                prefetchId = await mega.migrate.enqueuePrefetch(this.providerId, state, code, redirectUri);

                if (ticket !== this.seq || !this._visible) {
                    return;
                }
                this._save(res, prefetchId);
                mega.migrate.closeOAuthPopup();
            }

            if (!prefetchId || Number.isInteger(prefetchId) && prefetchId < 0) {

                if (await this._selectProvider(this.providerId) === false) {
                    return;
                }

                return prefetchId === EACCESS ? this._alert(l.mig_oauth_failed, l.mig_oauth_retry) :
                    this._alert(l.mig_fail, prefetchId === ERATELIMIT ? l.mig_rate_limit : l.mig_error);
            }

            if (!M.getNodeByHandle(this.parent)) {
                this.parent = M.RootID;
            }

            this.prefetchId = prefetchId;
            this.targetName = `${knownProviders[this.providerId].name} - ${time2date(unixtime())}`;
            this._uniqueName();
            this._gather();
        },

        async _authFailed(res) {

            if (d) {
                console.error('OAuth authorisation failed', res);
            }

            if (await this._selectProvider(this.providerId) === false) {
                return;
            }

            let err = res.error;
            let msg = res.message;

            if (!msg) {

                err = l.mig_oauth_failed;
                msg = {closed: l.mig_oauth_closed, access_denied: l.mig_oauth_denied}[res.error] || l.mig_oauth_retry;
            }

            return this._alert(err, msg);
        },

        _uniqueName() {
            if (fileconflict.getNodeByName(this.parent, this.targetName, true)) {
                this.targetName = fileconflict.findNewName(this.targetName, this.parent, true);
            }
        },

        _loading(text) {

            const body = this._state('sprite-mobile-fm-theme icon-loader-throbber-thin-outline icon loading', '', text);

            this._render({
                step: 2,
                body,
                buttons: [
                    {text: l.mig_start_import, disabled: true},
                    {text: l.mig_go_back, secondary: true, disabled: true}
                ]
            });

            return body.querySelector('p');
        },

        _gather() {
            return this._poll(++this.seq, this._loading(l.mig_gathering_files));
        },

        async _poll(seq, label) {

            const res = await mega.migrate.checkPrefetchRequest(this.prefetchId).catch(echo) || false;

            if (seq !== this.seq || !this._visible) {
                return;
            }

            const {PENDING, IN_PROGRESS, SUCCESS} = mega.migrate.states;
            const {name} = mega.migrate.knownProviders[this.providerId];
            const _back = () => this._selectProvider(this.providerId);

            if (res.s === PENDING || res.s === IN_PROGRESS) {

                label.textContent = res.s === PENDING ? l.mig_preparing : l.mig_gathering_files;

                await tSleep(2);

                return seq === this.seq && this._visible && this._poll(seq, label);
            }

            if (res.s !== SUCCESS || !res.d || !res.d.n) {

                if (d) {
                    console.error('Unexpected migration prefetch response. Got: ', res);
                }

                const [retry] = this._render({
                    step: 2,
                    body: this._state(
                        'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
                        l.mig_gather_failed_title,
                        l.mig_gather_failed_desc.replace('%1', name)
                    ),
                    buttons: [
                        {text: l[1472], onClick: () => this._authorise(retry)},
                        {text: l.mig_go_back, secondary: true, onClick: _back}
                    ]
                });

                return;
            }

            if (typeof res.d.n !== 'object' || !Object.keys(res.d.n).length) {

                return this._render({
                    step: 2,
                    body: this._state(
                        'sprite-mobile-fm-mono icon-folder-thin-outline',
                        l.mig_no_files_title,
                        l.mig_no_files_desc.replace(/%1/g, name)
                    ),
                    buttons: [{text: l.mig_go_back, onClick: _back}]
                });
            }

            this.prefetch = res;
            this._review();
        },

        _review() {

            const {dc, fc, b} = this.prefetch.d;
            const body = mCreateElement('div', {class: 'migrate-review'});
            const summary = mCreateElement('div', {class: 'migrate-summary'});
            const rows = [
                ['icon-folder-thin-outline', fm_contains(0, dc)],
                ['icon-file-02-thin-outline', fm_contains(fc)],
                ['icon-database-thin-outline', l.mig_total_size.replace('%1', bytesToSize(b))]
            ];

            mCreateElement('h2', null, body).textContent = l.mig_review;
            body.appendChild(summary);
            mCreateElement('div', {class: 'summary-header'}, summary).textContent = l.mig_what_import;

            for (const [icon, text] of rows) {

                const row = mCreateElement('div', {class: 'summary-row'}, summary);

                mCreateElement('i', {class: `sprite-mobile-fm-mono ${icon}`}, row);
                mCreateElement('span', null, row).textContent = text;
            }

            mCreateElement('p', {class: 'estimate-note'}, body).textContent = l.mig_estimate_note;
            mCreateElement('p', {class: 'destination'}, body).append(
                parseHTML(l.mig_find_import.replace('%1', escapeHTML(this.targetName)))
            );

            const [start, back] = this._render({
                step: 2,
                body,
                buttons: [{
                    text: l.mig_start_import,
                    onClick: () => this._start(start, back)
                }, {
                    text: l.mig_go_back,
                    secondary: true,
                    onClick: () => {

                        eventlog(501428);
                        this._selectProvider(this.providerId);
                    }
                }]
            });
        },

        async _start(start, back) {

            const {fc, b, n} = this.prefetch.d;
            const ticket = this.seq;
            const errors = {
                [EEXIST]: l.mig_ongoing,
                [ERATELIMIT]: l.mig_rate_limit,
                [EARGS]: l.mig_too_large
            };

            start.loading = true;
            back.disabled = true;
            eventlog(501429, this.providerId);
            this._uniqueName();
            sessionStorage.removeItem('mtoolAuth');

            const target = await mega.migrate.createImportFolder(this.parent, this.targetName);
            const id = target && await mega.migrate.enqueueMigration(this.prefetchId, target, Object.keys(n));

            if (!target || Number.isInteger(id) && id < 0) {

                this._close();

                return this._alert(l.mig_fail, errors[id] || l.mig_error);
            }

            eventlog(501430, `${this.providerId} ${id} ${fc} ${b}`);

            if (ticket !== this.seq || !this._visible) {
                return;
            }

            const body = mCreateElement('div', {class: 'migrate-started'});

            mCreateElement('i', {class: 'green-check'}, body);
            mCreateElement('h2', null, body).textContent = l.mig_import_started;
            mCreateElement('p', null, body).textContent = this.fromApp ? l.mig_started_app : l.mig_started_web;

            this._render({
                body,
                buttons: [{
                    text: this.fromApp ? l.mig_back_to_app : l[726],
                    onClick: () => {

                        if (this.fromApp) {
                            return this._backToApp();
                        }
                        this._close();

                        if (M.currentdirid !== this.parent) {
                            loadSubPage(this.parent === M.RootID ? 'fm' : `fm/${this.parent}`);
                        }
                    }
                }]
            });
        }
    };
});
