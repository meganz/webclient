lazy(mega, 'migrate', () => {

    'use strict';

    let selectedProviderId = null;
    let dialog;
    let cardGroup;
    let importingProgress;
    let prefetchId;
    let prefetch;
    let targetFolderName;
    let targetFolderParent;
    let nodeList;
    let oAuthPoll;
    let oAuthPopup;
    let onboardingOffset = 0;
    let options = Object.create(null);

    const ce = (n, t, a) => mCreateElement(n, a, t);

    const navigate = {
        get dialog() {
            if (dialog) {
                return dialog;
            }

            if (onboardingOffset && mega.ui.onboarding && mega.ui.onboarding.sheet) {
                return mega.ui.onboarding.sheet;
            }

            return null;
        },

        nextEnable() {
            const {dialog: dlg} = this;

            if (dlg && dlg.next) {
                dlg.next.disabled = false;
            }
        },

        nextDisable() {
            const {dialog: dlg} = this;

            if (dlg && dlg.next) {
                dlg.next.disabled = true;
            }
        },

        goToStep(step, forceRedraw = false) {
            const {dialog: dlg} = this;

            if (!dlg) {
                return;
            }

            if (onboardingOffset) {
                step += onboardingOffset;
            }

            if (step === 0) {
                dlg.hide();
            }

            return dlg.goToStep(step, forceRedraw);
        },

        hide() {
            const {dialog: dlg} = this;

            if (!dlg) {
                return;
            }

            if (onboardingOffset) {
                return dlg.goToStep(onboardingOffset + options.steps.length + 1);
            }

            return dlg.hide();
        }
    };

    const knownProviders = {
        1: {name: 'Google Drive', icon: 'sprite-fm-uni icon-googledrive'},
        2: {name: 'Dropbox', icon: 'sprite-fm-uni icon-dropbox'},
        3: {name: 'Microsoft OneDrive', icon: 'sprite-fm-uni icon-onedrive'},
        4: {name: 'Box', icon: 'sprite-fm-uni icon-box'},
    };

    const migrationStates = {
        PENDING: 0,
        IN_PROGRESS: 1,
        SUCCESS: 2,
        CANCELLED: 3,
        ERROR: 4
    };

    const notifiedFolders = new Set();
    const progressPending = new Set();
    const guidesDomain = 'blog.mega.io';
    const guidesPrefix = 'how-to-export-files-from-google-drive-and-other-cloud-storage-services#';

    const serviceGuides = [
        {
            providerId: 2,
            icon: 'icon-dropbox',
            name: 'Dropbox',
            link: 'h-how-to-export-files-from-dropbox',
            eventName: is_mobile ? 501431 : 501368
        },
        {
            providerId: 3,
            icon: 'icon-onedrive',
            name: 'OneDrive',
            link: 'h-how-to-export-files-from-onedrive',
            eventName: is_mobile ? 501432 : 501369
        },
        {
            providerId: 4,
            icon: 'icon-box',
            name: 'Box',
            link: 'h-how-to-export-files-from-box',
            eventName: is_mobile ? 501433 : 501370
        },
        {
            icon: 'icon-icloud',
            name: 'iCloud',
            link: 'h-how-to-export-files-from-apple-icloud-and-airdrop',
            eventName: is_mobile ? 501434 : 501371
        },
    ];

    const renderServiceGuides = (parent, providers) => {
        const guides = serviceGuides.filter(item => !item.providerId || !providers[item.providerId]);

        if (!guides.length) {
            return;
        }

        const links = ce('div', parent, {class: 'links-container'});

        ce('h2', links).textContent = l.mig_guides_header;
        ce('p', links).textContent = l.mig_guides_info;

        const linksBody = ce('div', links, {class: 'links-body'});

        for (const item of guides) {
            const lnk = `${guidesPrefix}${item.link}`;
            const node = ce('a', linksBody, {
                href: `https://${guidesDomain}/${lnk}`
            });

            ce('i', node, {class: `sprite-fm-uni ${item.icon} icon-size-24`});
            ce('span', node).textContent = l.mig_how_to_export.replace('%1', item.name);
            ce('i', node, {class: 'sprite-fm-mono icon-arrow-up-right-thin-outline'});

            node.addEventListener('click', (ev) => {
                ev.preventDefault();
                eventlog(item.eventName);
                mega.redirect(guidesDomain, lnk, false, false, false);
            });
        }
    };

    const nodeSelectorTable = document.createElement('table');
    nodeSelectorTable.className = 'select-items grid-table';

    mCreateElement('thead', false, [
        mCreateElement('tr', false, [
            mCreateElement('th'),
            mCreateElement('th', false, [document.createTextNode(l[86])]),
            mCreateElement('th', false, [document.createTextNode(l[94])]),
            // mCreateElement('th', false, [document.createTextNode('Type')]),
            mCreateElement('th', false, [document.createTextNode(l[87])])
        ])
    ], nodeSelectorTable);

    mCreateElement('tbody', false, nodeSelectorTable);

    const _prefetch = async() => {
        loadingDialog.show('migrate-fetch-files');

        do {
            prefetch = await mega.migrate.checkPrefetchRequest(prefetchId).catch(tell) || {};
            switch (prefetch.s) {
                case migrationStates.PENDING:
                    loadingDialog.show('migrate-fetch-files', l.mig_preparing);
                    await tSleep(2);
                    break;
                case migrationStates.IN_PROGRESS:
                    loadingDialog.show('migrate-fetch-files', l.mig_gathering_files);
                    await tSleep(2);
                    break;
            }
        }
        // only loop if migration dialog is opened
        while (($.dialog === 'migrate-dialog' || $.dialog === 'Mega-Onboarding') &&
            (prefetch.s === migrationStates.PENDING || prefetch.s === migrationStates.IN_PROGRESS));

        loadingDialog.hide('migrate-fetch-files');

        if (prefetch.s === migrationStates.CANCELLED) {
            msgDialog('warninga', '', l.mig_cancelled, l.mig_cancelled_desc, () => navigate.goToStep(1));
            return;
        }
        else if (prefetch.s === migrationStates.ERROR) {
            const friendlyCode = parseInt(prefetch.e && prefetch.e.cc);
            const debugCode = parseInt(prefetch.e && prefetch.e.c) || -1;

            const knownCodes = {
                1: l.mig_service_error.replace('%1', debugCode.toString()),
                2: l.mig_authorisation_error.replace('%1', debugCode.toString()),
                [Number.NaN]: l.mig_error,
            };

            const errMsg = knownCodes[friendlyCode] || l.mig_fail_show_code
                .replace('%1', friendlyCode.toString())
                .replace('%2', debugCode.toString());
            msgDialog('warninga', '', l.mig_fail, errMsg, () => navigate.goToStep(1));
            return;
        }

        if (prefetch.s !== migrationStates.SUCCESS || !prefetch.d || !prefetch.d.n) {
            console.error('Unexpected migration prefetch response. Got: ', prefetch);
            msgDialog('warninga', '', l.mig_fail, l.mig_unexpected_response, () => navigate.goToStep(1));
            return;
        }

        if (typeof prefetch.d.n !== 'object' || Object.keys(prefetch.d.n).length === 0) {
            msgDialog('warninga', '', l.mig_nothing_to, l.mig_nothing_desc, () => navigate.goToStep(1));
            return;
        }

        nodeList = Object.keys(prefetch.d.n);

        return true;
    };

    options = {
        componentClassname: 'mega-sheet journey migrate-dialog',
        contentClassname: 'mega-journey migrate',
        showClose: true,
        dialogName: 'migrate-dialog',
        preventBgClosing: false,
        steps: [
            // Step 1: Select Provider (Migrate your files step)
            {
                label: l.mig_select_provider,
                title: l.mig_select_provider_title,
                customContent: () => {
                    const container = ce('div', null, {class: 'no-padding'});
                    const cn = ce('div', container, {class: 'services-container'});
                    let scrollArea = null;

                    if (onboardingOffset) {
                        eventlog(501367);
                    }

                    loadingDialog.show('migrate-fetch-providers');
                    mega.migrate.getProviders().then(providers => {

                        const cardList = ce('fieldset', cn, {class: 'card-select-container'});

                        // Skip unknown providers
                        const items = Object.entries(providers)
                            .filter(([id]) => {
                                if (knownProviders[id]) {
                                    return true;
                                }
                                if (d) {
                                    console.warn(`Migration provider ${id} not recognised; skipping.`);
                                }
                                return false;
                            })
                            .map(([id]) => ({
                                value: id,
                                icon: knownProviders[id].icon,
                                title: knownProviders[id].name,
                                parentNode: cardList,
                                selected: false,
                                iconSize: 48
                            }));

                        if (importingProgress) {
                            cardList.disabled = true;

                            const warning = ce('div', cn, {class: 'banner'});
                            ce('i', warning, {class: 'sprite-fm-mono icon-info-thin-outline'});
                            const [before, link = '', after = ''] = l.mig_ongoing_history.split(/\[A]|\[\/A]/);
                            const historyPage = 'fm/account/transfers/migrate-cloud-provider-settings';
                            const linkNode = ce('a', null, {href: `/${historyPage}`});

                            linkNode.textContent = link;
                            linkNode.addEventListener('click', (ev) => {
                                ev.preventDefault();
                                navigate.hide();
                                loadSubPage(historyPage);
                            });

                            ce('span', warning).append(before, linkNode, after);
                        }

                        renderServiceGuides(cn, providers);

                        const infoBox = ce('div', container, {class: 'info-box'});
                        const icon = ce('i', null, {class: 'sprite-fm-mono icon-info'});

                        const slideWrapper = container.closest('.main-content-div');

                        if (slideWrapper) {
                            slideWrapper.classList.add('custom-scroll');
                            requestAnimationFrame(() => {
                                scrollArea = new PerfectScrollbar(cn);
                            });
                        }

                        cardGroup = new CardGroup({
                            cards: items,
                            onClick: (e) => {
                                selectedProviderId = e.currentTarget.value;

                                eventlog(501363, String(selectedProviderId));

                                navigate.nextEnable();
                                infoBox.textContent = l.mig_permission_required.replace('%1', e.currentTarget.text);
                                infoBox.prepend(icon);

                                if (scrollArea) {
                                    scrollArea.update();
                                }
                            }
                        });

                        loadingDialog.hide('migrate-fetch-providers');
                    });
                    return container;
                },
                next: {
                    text: l.mig_authorise,
                    action: async() => {

                        eventlog(500947, String(selectedProviderId));

                        navigate.nextDisable();
                        cardGroup.clear();
                        const oAuthResults = await mega.migrate.runOAuthPopup(selectedProviderId);
                        if (!oAuthResults.state || !oAuthResults.code) {

                            if (d) {
                                console.error('OAuth authorisation failed', oAuthResults);
                            }

                            const reasons = {
                                closed: l.mig_oauth_closed,
                                access_denied: l.mig_oauth_denied,
                            };
                            const errMsg = reasons[oAuthResults.error] || l.mig_oauth_retry;

                            return msgDialog('warninga', '', l.mig_oauth_failed, errMsg);
                        }

                        eventlog(501377, String(selectedProviderId));

                        loadingDialog.show('migrate-enqueue-request');
                        prefetchId = await mega.migrate.enqueuePrefetch(
                            selectedProviderId,
                            oAuthResults.state,
                            oAuthResults.code,
                            oAuthResults.redirectUri
                        );
                        loadingDialog.hide('migrate-enqueue-request');

                        if (prefetchId === ERATELIMIT) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_rate_limit, () => navigate.goToStep(1));
                        }
                        else if (prefetchId === EACCESS) {
                            msgDialog('warninga', '', l.mig_oauth_failed, l.mig_oauth_retry, () => {
                                navigate.goToStep(1);
                            });
                        }
                        else if (!prefetchId || Number.isInteger(prefetchId) && prefetchId < 0) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_error, () => navigate.goToStep(1));
                        }
                        else {
                            targetFolderName = `${knownProviders[selectedProviderId].name} - ${time2date(unixtime())}`;
                            targetFolderParent = M.currentdirid.startsWith('account/transfers') ?
                                M.RootID : M.currentdirid;

                            while (duplicated(targetFolderName, targetFolderParent)) {
                                targetFolderName =
                                    fileconflict.findNewName(targetFolderName, targetFolderParent, true);
                            }

                            navigate.goToStep(2, true);
                        }
                    },
                    disabled: true
                },
                skip: {
                    action: () => {
                        eventlog(501372);
                        navigate.goToStep(0);
                    },
                    text: l.mig_go_back
                },
                redraw: true,
                get back() {
                    return {
                        action: () => {
                            eventlog(501366);
                            navigate.hide();
                        },
                        hidden: !onboardingOffset,
                        text: l.import_password_skip
                    };
                }
            },
            {
                label: l.mig_review,
                title: l.mig_review,
                customContent: async() => {

                    if (!await _prefetch()) {
                        return;
                    }

                    const container = document.createElement('div');
                    const tableWrapper = document.createElement('div');
                    container.appendChild(tableWrapper);

                    const importSummaryTable = document.createElement('table');
                    importSummaryTable.className = 'data-table import-summary';

                    tableWrapper.appendChild(importSummaryTable);

                    const thead = document.createElement('thead');
                    importSummaryTable.appendChild(thead);

                    const tr = document.createElement('tr');
                    thead.appendChild(tr);

                    const th = document.createElement('th');
                    th.textContent = l.mig_what_import;
                    tr.appendChild(th);

                    const tbody = document.createElement('tbody');
                    importSummaryTable.appendChild(tbody);

                    const folderCount = document.createElement('tr');
                    tbody.appendChild(folderCount);
                    let td = document.createElement('td');
                    td.textContent = fm_contains(0, prefetch.d.dc);
                    folderCount.appendChild(td);

                    let icon = document.createElement('i');
                    icon.className = 'sprite-fm-mono icon-folder';
                    td.prepend(icon);

                    const fileCount = document.createElement('tr');
                    tbody.appendChild(fileCount);
                    td = document.createElement('td');
                    td.textContent = fm_contains(prefetch.d.fc);
                    fileCount.appendChild(td);

                    icon = document.createElement('i');
                    icon.className = 'sprite-fm-mono icon-file-02-thin-outline';
                    td.prepend(icon);

                    const totalSize = document.createElement('tr');
                    tbody.appendChild(totalSize);
                    td = document.createElement('td');
                    td.textContent = l.mig_total_size.replace('%1', bytesToSize(prefetch.d.b));
                    totalSize.appendChild(td);

                    icon = document.createElement('i');
                    icon.className = 'sprite-fm-mono icon-database';
                    td.prepend(icon);

                    const description = document.createElement('div');

                    const note = document.createElement('p');
                    note.className = 'import-summary-note';
                    note.textContent = l.mig_estimate_note;
                    description.appendChild(note);

                    const elm = document.createElement('p');
                    elm.append(parseHTML(l.mig_find_import.replace('%1', escapeHTML(targetFolderName))));
                    description.appendChild(elm);

                    container.appendChild(description);

                    return container;
                },
                next: {
                    action: async() => {
                        loadingDialog.show('migrate-enqueue');
                        eventlog(500948, String(selectedProviderId));
                        const target = await mega.migrate.createImportFolder(targetFolderParent, targetFolderName);
                        if (!target) {
                            loadingDialog.hide('migrate-enqueue');
                            msgDialog('warninga', '', l.mig_fail, l.mig_error, () => navigate.hide());
                            return;
                        }
                        const migrationId = await mega.migrate.enqueueMigration(prefetchId, target);
                        loadingDialog.hide('migrate-enqueue');

                        if (migrationId === EEXIST) {
                            importingProgress = true;
                            navigate.goToStep(1, true);
                            return;
                        }

                        if (migrationId === ERATELIMIT) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_rate_limit, () => navigate.hide());
                            return;
                        }

                        if (migrationId === EARGS) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_too_large, () => navigate.hide());
                            return;
                        }

                        if (Number.isInteger(migrationId) && migrationId < 0) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_error, () => navigate.hide());
                            return;
                        }

                        eventlog(501378, `${selectedProviderId} ${migrationId} ${prefetch.d.fc} ${prefetch.d.b}`);
                        mega.migrate.notifyProgress(migrationId, true).catch(dump);

                        navigate.goToStep(3);
                    },
                    text: l.mig_start_import
                },
                skip: {
                    action: () => {
                        eventlog(500949);
                        navigate.goToStep(1, true);
                    },
                    text: l.mig_go_back
                }
            },
            {
                noStepper: true,
                title: l.mig_import_started,
                description: [
                    l.mig_import_in_progress_info,
                    l.mig_import_add_more
                ],
                imageClass: 'green-check',
                get next() {
                    return {
                        action: () => navigate.hide(),
                        text: onboardingOffset ? l[507] : l[726]
                    };
                }
            }
        ]
    };

    return new class Migrate {

        constructor() {
            this.knownProviders = knownProviders;
            this.states = migrationStates;
            this.renderServiceGuides = renderServiceGuides;
        }

        getOnboardingInfo(offset) {
            onboardingOffset = offset;

            return {
                steps: options.steps,
                count: options.steps.length
            };
        }

        async showDialog(fromApp) {

            if (M.isInvalidUserStatus()) {
                return;
            }

            const quota = await M.getStorageQuota();
            if (quota.isFull) {
                return M.showOverStorageQuota(quota);
            }

            loadingDialog.show('migrate-check-active');
            const migrations = await this.getMigrations().catch(dump);
            loadingDialog.hide('migrate-check-active');

            importingProgress = Array.isArray(migrations) && migrations.some(m =>
                m.s === migrationStates.PENDING || m.s === migrationStates.IN_PROGRESS);

            if (is_mobile) {
                return mobile.migrate.show(fromApp, importingProgress);
            }

            onboardingOffset = 0;

            this.dialog = dialog = new MegaJourney(options);

            if (mega.config.get('mnzw') | 0) {
                dialog.show();
            }
            else {
                this.showMigrateWarningDialog();
            }
        }

        showMigrateWarningDialog() {
            mega.ui.sheet.show({
                name: 'migrate-warning',
                type: 'modal',
                showClose: false,
                preventBgClosing: true,
                navImage: 'migration-warning-image',
                classList: ['migrate-warning', 'medium-size', 'horizontal-actions'],
                title: l.mig_import_warning_title,
                contents: l.mig_import_warning_contents,
                actions: [
                    {
                        type: 'normal',
                        text: l[81], // OK,
                        className: 'slim',
                        onClick: () => {
                            mega.config.set('mnzw', 1);
                            mega.ui.sheet.hide();
                            dialog.show();
                            eventlog(500950);
                        }
                    },
                    {
                        type: 'normal',
                        text: l[82], // Cancel
                        className: 'slim secondary',
                        onClick: () => {
                            eventlog(500951);
                            mega.ui.sheet.hide();
                        },
                    }
                ]
            });
        }

        async getProviders() {
            const {result} = await api.req({a: 'mspl'});

            return result;
        }

        async getProvider(providerId) {
            return (await this.getProviders())[providerId];
        }

        async runOAuthPopup(providerId) {
            const receiverId = 'storage_migration';

            if (oAuthPoll) {
                clearInterval(oAuthPoll);
                oAuthPoll = null;
            }
            mega.migrate.closeOAuthPopup();

            // Pre-open within the user gesture to avoid Safari shenanigans
            // eslint-disable-next-line local-rules/open
            const popup = window.open('', `${receiverId}_oauth_popup`, mega.migrate._popupFeatures(480, 640));

            const provider = await mega.migrate.getProvider(providerId).catch(nop);

            if (!provider) {
                if (popup) {
                    popup.close();
                }
                return {error: 'provider_unavailable'};
            }

            const oAuthUrl = new URL(provider.oauth_url);

            // Pack client and provider ID into state param, so we can confirm receipt of correct oauth redirect
            const state = oAuthUrl.searchParams.get('state');
            oAuthUrl.searchParams.set('state', base64urlencode(`${state}|${receiverId}|${providerId}`));

            const redirectUri = new URL(oAuthUrl.searchParams.get('redirect_uri'));
            if (!is_extension) {
                redirectUri.host = window.location.host; // Replace with current domain for testing environments
            }
            oAuthUrl.searchParams.set('redirect_uri', redirectUri.toString());

            const popupResults = await mega.migrate._openOAuthPopup(oAuthUrl.toString(), receiverId, 480, 640);

            // Chrome on iOS reloads this tab once back in front, so mobile closes it after using the code
            if (!is_mobile || !popupResults.code) {
                mega.migrate.closeOAuthPopup();
            }

            popupResults.redirectUri = redirectUri;

            return popupResults;
        }

        closeOAuthPopup() {
            if (oAuthPopup && !oAuthPopup.closed) {
                oAuthPopup.close();
            }
        }

        _popupFeatures(width, height) {
            const winX = window.screenX || window.screenLeft;
            const winY = window.screenY || window.screenTop;
            const winW = window.outerWidth || document.documentElement.clientWidth;
            const winH = window.outerHeight || document.documentElement.clientHeight;
            const left = Math.round(winX + (winW - width) / 2);
            const top = Math.round(winY + (winH - height) / 2);

            return `width=${width},height=${height},top=${top},left=${left}`;
        }

        _openOAuthPopup(authUrl, receiverId, width = 480, height = 640) {

            // Clear any existing popop poll: popup window will be reused
            if (oAuthPoll) {
                clearInterval(oAuthPoll);
                oAuthPoll = null;
            }

            const features = mega.migrate._popupFeatures(width, height);

            // noopener/noreferrer intentionally omitted, we need the popup reference for polling
            // eslint-disable-next-line local-rules/open
            const popup = window.open(authUrl, `${receiverId}_oauth_popup`, features);

            if (!popup) {
                eventlog(is_mobile ? 501427 : 500952);
                if (d) {
                    console.error('Popup blocked');
                }
                return {error: l.mig_popup_blocked, message: l.mig_popup_blocked_message};
            }
            oAuthPopup = popup;

            return new Promise((resolve) => {
                // throws cross-origin while on OAuth provider; discard
                const reachedRedirect = tryCatch(() => popup.location.pathname.endsWith('oauth.html'), false);
                // the provider opened as a tab over ours, not as a separate window; always so on mobile
                const inTab = is_mobile || document.hidden;
                let back = 0;

                oAuthPoll = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(oAuthPoll);
                        resolve({error: 'closed'});
                        return;
                    }

                    if (!reachedRedirect()) {
                        back = inTab && !document.hidden ? back || Date.now() : 0;

                        // a provider page with COOP detaches the tab, which iOS then keeps unreadable and never closed
                        if (back && Date.now() - back > 3e3) {
                            clearInterval(oAuthPoll);
                            popup.close();
                            resolve({error: 'closed'});
                        }

                        return; // still on OAuth provider
                    }

                    clearInterval(oAuthPoll);

                    const params = new URLSearchParams(popup.location.search);
                    const hashParams = new URLSearchParams(popup.location.hash.slice(1));

                    const code = params.get('code') || hashParams.get('code');
                    const error = params.get('error') || hashParams.get('error');
                    const errorDescription = params.get('error_description') || hashParams.get('error_description');

                    const rawState = params.get('state');
                    const [state, eReceiverId, providerId] = base64urldecode(rawState || '').split('|');

                    if (!state || !eReceiverId || !providerId || eReceiverId !== receiverId) {
                        resolve({error: error || 'invalid_state', errorDescription});
                        return;
                    }

                    if (!code) {
                        resolve({error: error || 'unknown', errorDescription});
                        return;
                    }

                    resolve({state, code, providerId});
                }, 200);
            });
        }

        async enqueuePrefetch(providerId, state, code, redirectUri) {
            const request = {
                a: 'mspq',
                p: providerId,
                s: state,
                e: {
                    auth_code: code,
                    redirect_uri: redirectUri
                }
            };
            const { result: prefetchId } = await api.req(request).catch((ex) => {
                console.error(`Error enqueuing prefetch: ${ex}`);
                return { result: ex };
            });

            return prefetchId;
        }

        async checkPrefetchRequest(prefetchId) {
            const { result } = await api.req({ a: 'mspf', id: prefetchId });

            return result;
        }

        async createImportFolder(parent, name) {
            const n = { name, ar: { imp: 1 } };
            const attr = ab_to_base64(crypto_makeattr(n));
            const sk = [...crypto.getRandomValues(new Uint32Array(4))];

            const response = await api.screq({
                a: 'mscn',
                p: parent,
                k: a32_to_base64(encrypt_key(u_k_aes, n.k)),
                at: attr,
                sk: a32_to_base64(sk),
                crk: a32_to_base64(encrypt_key(new sjcl.cipher.aes(sk), n.k)),
            }).catch(echo);

            const res = response && response.result || {};
            const ph = res.l && res.l.ph;
            const w = res.l && res.l.w;
            const h = res.n && res.n.h;

            if (!ph || !w || !h) {
                console.error('mscn failed', response);
                return null;
            }

            // The share-key must be in ^!keys before the import uploads
            crypto_setsharekey(h, sk, false, true);

            await mega.keyMgr.createShare(h, true).catch(reportError);

            return {
                tph: ph,
                tak: w,
                tek: a32_to_base64(sk),
                h
            };
        }

        async enqueueMigration(prefetchId, target, sn = nodeList) {
            const {tph, tek, tak} = target;
            const {result} = await api.req({
                a: 'msq',
                mspqid: prefetchId,
                ph: tph,
                e: {
                    tph,
                    tek,
                    tak,
                    sn
                }
            }).catch((ex) => {
                console.error(`Error enqueuing migration: ${ex}`);
                return {result: ex};
            });

            return result;
        }

        async getMigrations() {
            let { result } = await api.req({ a: 'msl' });

            result = result.filter(m => m.t === 2);

            return result;
        }

        async getMigrationDetails(migrationid) {

            const {result} = await api.req({a: 'msf', id: migrationid}).catch(echo);

            if (typeof result !== 'object') {
                console.error('Failed to fetch migration info');
                return;
            }

            return result;
        }

        async cancelMigration(migrationid) {

            let result = await this.getMigrationDetails(migrationid);

            if (!result || result.s !== migrationStates.PENDING && result.s !== migrationStates.IN_PROGRESS) {
                console.error(`This migration is no longer cancellable: ${migrationid}`);
                return;
            }

            result = await api.req({ a: 'msr', id: migrationid }).catch(echo);

            if (result === EARGS) {
                console.error('Migration ID not provided');
            }
            else if (result === ENOENT) {
                console.error('Migration job does not exist, or does not belong to user');
            }
        }

        // Imports made before the imp flag have no flag, but still have the writable link the server imported
        // through; links users create are read-only, and S4 buckets are the only other writable ones
        isImportFolder(n) {
            return !!(n.t && n.ph && (n.ar && n.ar.imp || M.getNodeShare(n).w && !M.getS4NodeType(n)));
        }

        getImportFolders(handles) {

            const sel = new Set(Array.isArray(handles) ? handles : [handles]);
            const res = [];

            for (const h of Object.keys(M.su.EXP || {})) {
                const n = M.getNodeByHandle(h);

                if (n && this.isImportFolder(n)) {
                    for (let p = n; p; p = M.getNodeByHandle(p.p)) {
                        if (sel.has(p.h)) {
                            res.push(n);
                            break;
                        }
                    }
                }
            }

            return res;
        }

        // Whether any of these folders is, or is inside, a folder still being imported into
        isImporting(handles) {

            for (const h of handles) {
                for (let n = M.getNodeByHandle(h); n && n.t; n = M.getNodeByHandle(n.p)) {
                    if (this.isImportFolder(n)) {
                        return true;
                    }
                }
            }

            return false;
        }

        async getActiveImports(handles) {

            const folders = this.getImportFolders(handles).map(n => [n, n.ph]);

            for (const [n] of folders) {
                if (sharemissing[n.h]) {
                    crypto_fixmissingkeys(sharemissing[n.h]);
                }
            }

            if (!folders.length) {
                return [];
            }

            const {result} = await api.req({a: 'msl'});
            const res = [];

            // A link import may run several jobs into the same folder
            for (const [n, ph] of folders) {
                const jobs = result.filter(m => m.ph === ph);
                const active = jobs.filter(m => m.s === migrationStates.PENDING || m.s === migrationStates.IN_PROGRESS);

                if (active.length) {
                    res.push(...active);
                }
                else {
                    this.clearImportFolder(n, jobs).catch(dump);
                }
            }

            return res;
        }

        async clearImportFolder(n, jobs) {

            const imp = n.ar && n.ar.imp;
            const job = jobs.find(m => m.s === migrationStates.ERROR) ||
                jobs.find(m => m.s === migrationStates.SUCCESS);

            if (notifiedFolders.has(n.h)) {
                return;
            }
            notifiedFolders.add(n.h);

            // A link without a job was created by the user
            if (jobs.length) {
                const nodes = await M.getNodes(n.h, true);

                // The server encrypts imported files to the folder's share key only, and removing the import link
                // removes that share, so give them owner keys first or they rely on the share key alone
                await api_updfkey(nodes, -0x4ff71e);

                await api.screq({a: 's2', n: n.h, s: [{u: 'EXP', r: ''}], ha: ''}).catch(dump);
            }

            if (imp) {
                await api.setNodeAttributes(n, {ar: {...n.ar, imp: undefined}}).catch(dump);
            }

            await notify.initialLoading;

            const prev = notify.notifications.find(m => m.type === 'msc' && m.data.n === n.h);
            const shown = prev && prev.data.s === migrationStates.IN_PROGRESS;

            // Imports made before the imp flag ended long ago, so only report those this session showed as running
            if (job && (imp || shown)) {
                return notify.notifyFromActionPacket({a: 'msc', n: n.h, p: job.p, s: job.s});
            }

            // Cancelled, so don't leave the progress notification behind
            if (shown) {
                return notify.notifyFromActionPacket({
                    ...prev.data,
                    s: migrationStates.CANCELLED,
                    seen: prev.seen,
                    timestamp: prev.timestamp
                });
            }
        }

        async notifyProgress(mid, now) {

            if (progressPending.has(mid)) {
                return;
            }
            progressPending.add(mid);

            // Uploads arrive in bursts, refresh at most every few seconds
            if (!now) {
                await tSleep(5);
            }

            progressPending.delete(mid);

            const {result} = await api.req({a: 'msf', id: mid}).catch(echo);

            await notify.initialLoading;

            const prev = result && notify.notifications.find(m => m.type === 'msc' && m.data.n === result.h);

            if (!result || result.s > migrationStates.IN_PROGRESS ||
                prev && prev.data.s !== migrationStates.IN_PROGRESS) {
                return;
            }

            let {p} = prev ? prev.data : {};

            if (!prev) {
                const jobs = await this.getMigrations().catch(dump) || [];
                const job = jobs.find(m => m.id === mid);

                p = job && job.p;
            }

            return notify.notifyFromActionPacket({
                a: 'msc',
                n: result.h,
                p,
                s: migrationStates.IN_PROGRESS,
                fp: result.fp,
                ft: result.ft,
                seen: prev && prev.seen,
                timestamp: prev && prev.timestamp
            });
        }

        async importEnd(mid) {

            const folders = new Set(this.getImportFolders(M.RootID).map(n => n.h));
            const gone = notify.notifications.filter(m => m.type === 'msc' && !folders.has(m.data.n) &&
                m.data.s === migrationStates.IN_PROGRESS);

            await this.getActiveImports(M.RootID).catch(dump);

            if (!gone.length) {
                return;
            }

            const {result} = await api.req({a: 'msf', id: mid}).catch(echo);
            const prev = result && gone.find(m => m.data.n === result.h);

            if (prev) {
                return notify.notifyFromActionPacket({a: 'msc', n: result.h, p: prev.data.p, s: result.s});
            }
        }

        async confirmRemove(handles) {

            const active = await this.getActiveImports(handles);

            if (!active.length) {
                return true;
            }

            const provider = knownProviders[active[0].p];
            const yes = await asyncMsgDialog(
                `confirmation:!^${l.mig_acc_cancel}!${l.schedule_cancel_abort}`,
                '',
                l.mig_acc_cancel_confirm_title,
                provider ?
                    l.mig_acc_cancel_confirm_desc.replace('%1', provider.name) :
                    l.mig_acc_cancel_confirm_desc_nameless
            );

            if (yes) {
                await Promise.all(active.map(m => this.cancelMigration(m.id)));

                // msr leaves the import flag and link in place
                await this.getActiveImports(handles).catch(dump);
            }

            return yes;
        }

        async confirmMove(handles) {

            const active = await this.getActiveImports(handles);

            if (active.length) {
                const provider = knownProviders[active[0].p];

                await asyncMsgDialog(
                    'warninga',
                    '',
                    l.mig_folder_in_use,
                    provider ? l.mig_move_in_use.replace('%1', provider.name) : l.mig_move_in_use_nameless
                );
            }

            return !active.length;
        }
    };
});

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    // Clear import folders whose job ended while we were away, and show the ones still running
    if (!folderlink && M.su.EXP) {
        mega.migrate.getActiveImports(M.RootID)
            .then(jobs => is_mobile || Promise.all(jobs.map(m => mega.migrate.notifyProgress(m.id, true)))).catch(dump);
    }
});
