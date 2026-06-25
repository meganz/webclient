lazy(mega, 'migrate', () => {

    'use strict';

    let selectedProviderId = null;
    let dialog;
    let cardGroup;
    let prefetchId;
    let prefetch;
    let targetFolderName;
    let targetFolderParent;
    let nodeList;
    let oAuthPoll;

    const knownProviders = {
        1: {name: 'Google Drive', icon: 'sprite-fm-uni icon-googledrive'},
        2: {name: 'Dropbox', icon: 'sprite-fm-uni icon-dropbox'},
        3: {name: 'Microsoft OneDrive', icon: 'sprite-fm-uni icon-onedrive'},
    };
    const migrationStates = {
        PENDING: 0,
        IN_PROGRESS: 1,
        SUCCESS: 2,
        CANCELLED: 3,
        ERROR: 4
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
        while ($.dialog === 'migrate-dialog' && // only loop if migration dialog is opened
            (prefetch.s === migrationStates.PENDING || prefetch.s === migrationStates.IN_PROGRESS));

        loadingDialog.hide('migrate-fetch-files');

        if (prefetch.s === migrationStates.CANCELLED) {
            msgDialog('warninga', '', l.mig_cancelled, l.mig_cancelled_desc, () => dialog.goToStep(1));
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
            msgDialog('warninga', '', l.mig_fail, errMsg, () => dialog.goToStep(1));
            return;
        }

        if (prefetch.s !== migrationStates.SUCCESS || !prefetch.d || !prefetch.d.n) {
            console.error('Unexpected migration prefetch response. Got: ', prefetch);
            msgDialog('warninga', '', l.mig_fail, l.mig_unexpected_response, () => dialog.goToStep(1));
            return;
        }

        if (typeof prefetch.d.n !== 'object' || Object.keys(prefetch.d.n).length === 0) {
            msgDialog('warninga', '', l.mig_nothing_to, l.mig_nothing_desc, () => dialog.goToStep(1));
            return;
        }

        nodeList = Object.keys(prefetch.d.n);
    };

    const options = {
        componentClassname: 'mega-sheet journey migrate-dialog',
        showClose: true,
        dialogName: 'migrate-dialog',
        steps: [
            // Step 1: Select Provider
            {
                label: l.mig_select_provider,
                title: l.mig_select_provider_title,
                customContent: () => {
                    const container = document.createElement('div');

                    loadingDialog.show('migrate-fetch-providers');
                    mega.migrate.getProviders().then(providers => {

                        const cardList = document.createElement('div');
                        cardList.className = 'card-select-container scrollable';

                        const items = Object.entries(providers).map(([id]) => ({
                            value: id,
                            icon: knownProviders[id].icon,
                            title: knownProviders[id].name,
                            parentNode: cardList,
                            selected: false,
                            iconSize: 48
                        }));

                        const infoBox = document.createElement('div');
                        infoBox.className = 'info-box';
                        const icon = document.createElement('i');
                        icon.className = 'sprite-fm-mono icon-info';

                        cardGroup = new CardGroup({
                            cards: items,
                            onClick: (e) => {
                                selectedProviderId = e.currentTarget.value;
                                dialog.next.disabled = false;
                                infoBox.textContent = l.mig_permission_required.replace('%1', e.currentTarget.text);
                                infoBox.prepend(icon);
                            }
                        });

                        container.appendChild(cardList);
                        container.appendChild(infoBox);

                        loadingDialog.hide('migrate-fetch-providers');
                    });
                    return container;
                },
                next: {
                    text: l.mig_authorise,
                    action: async() => {

                        eventlog(500947);

                        dialog.next.disabled = true;
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

                        loadingDialog.show('migrate-enqueue-request');
                        prefetchId = await mega.migrate.enqueuePrefetch(
                            selectedProviderId,
                            oAuthResults.state,
                            oAuthResults.code,
                            oAuthResults.redirectUri
                        );
                        loadingDialog.hide('migrate-enqueue-request');

                        if (prefetchId === ERATELIMIT) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_rate_limit, () => dialog.goToStep(1));
                        }
                        else if (!prefetchId || Number.isInteger(prefetchId) && prefetchId < 0) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_error, () => dialog.goToStep(1));
                        }
                        else {
                            targetFolderName = `${knownProviders[selectedProviderId].name} - ${time2date(unixtime())}`;
                            targetFolderParent = M.currentdirid.startsWith('account/transfers') ?
                                M.RootID : M.currentdirid;

                            while (duplicated(targetFolderName, targetFolderParent)) {
                                targetFolderName = fileconflict.findNewName(targetFolderName, targetFolderParent);
                            }

                            dialog.goToStep(2, true);
                        }
                    },
                    disabled: true
                },
                skip: {
                    text: l.mig_go_back
                }
            },
            {
                label: l.mig_review,
                title: l.mig_review,
                customContent: async() => {

                    await _prefetch();

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
                    elm.append(parseHTML(l.mig_find_import.replace('%1', targetFolderName)));
                    description.appendChild(elm);

                    container.appendChild(description);

                    return container;
                },
                next: {
                    action: async() => {
                        loadingDialog.show('migrate-enqueue');
                        eventlog(500948);
                        const target = await mega.migrate.createImportFolder(targetFolderParent, targetFolderName);
                        if (!target) {
                            loadingDialog.hide('migrate-enqueue');
                            return;
                        }
                        const migrationId = await mega.migrate.enqueueMigration(prefetchId, target);
                        loadingDialog.hide('migrate-enqueue');

                        if (migrationId === EEXIST) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_ongoing); // Keep dialog, they can try later
                            return;
                        }

                        if (migrationId === ERATELIMIT) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_rate_limit, () => dialog.hide());
                            return;
                        }

                        if (migrationId === EARGS) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_too_large, () => dialog.hide());
                            return;
                        }

                        if (Number.isInteger(migrationId) && migrationId < 0) {
                            msgDialog('warninga', '', l.mig_fail, l.mig_error, () => dialog.hide());
                            return;
                        }

                        dialog.goToStep(3);
                    },
                    text: l.mig_start_import
                },
                skip: {
                    action: () => {
                        eventlog(500949);
                        dialog.goToStep(1, true);
                    },
                    text: l.mig_go_back
                }
            },
            {
                noStepper: true,
                title: l.mig_import_started,
                description: [
                    l.mig_import_in_progress,
                    l.mig_import_add_more
                ],
                imageClass: 'green-check',
                next: {
                    text: l[726]
                }
            }
        ]
    };

    return new class Migrate {

        constructor() {
            this.knownProviders = knownProviders;
            this.states = migrationStates;
        }

        async showDialog() {

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

            if (Array.isArray(migrations) && migrations.some(m =>
                m.s === migrationStates.PENDING || m.s === migrationStates.IN_PROGRESS)) {
                msgDialog('warninga', '', l.mig_fail, l.mig_ongoing);
                return;
            }

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
            const provider = await mega.migrate.getProvider(providerId);
            const receiverId = 'storage_migration';

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

            popupResults.redirectUri = redirectUri;

            return popupResults;
        }

        _openOAuthPopup(authUrl, receiverId, width = 480, height = 640) {

            // Clear any existing popop poll: popup window will be reused
            if (oAuthPoll) {
                clearInterval(oAuthPoll);
                oAuthPoll = null;
            }

            const winX = window.screenX || window.screenLeft;
            const winY = window.screenY || window.screenTop;
            const winW = window.outerWidth || document.documentElement.clientWidth;
            const winH = window.outerHeight || document.documentElement.clientHeight;
            const left = Math.round(winX + (winW - width) / 2);
            const top = Math.round(winY + (winH - height) / 2);

            const features = `width=${width},height=${height},top=${top},left=${left}`;

            // noopener/noreferrer intentionally omitted, we need the popup reference for polling
            // eslint-disable-next-line local-rules/open
            const popup = window.open(authUrl, `${receiverId}_oauth_popup`, features);

            if (!popup) {
                eventlog(500952);
                if (d) {
                    console.error('Popup blocked');
                }
                return {error: l.mig_popup_blocked, message: l.mig_popup_blocked_message};
            }

            return new Promise((resolve) => {
                // throws cross-origin while on OAuth provider; discard
                const reachedRedirect = tryCatch(() => popup.location.pathname.endsWith('oauth.html'), false);

                oAuthPoll = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(oAuthPoll);
                        resolve({error: 'closed'});
                        return;
                    }

                    if (!reachedRedirect()) {
                        return; // still on OAuth provider
                    }

                    clearInterval(oAuthPoll);

                    const params = new URLSearchParams(popup.location.search);
                    const hashParams = new URLSearchParams(popup.location.hash.slice(1));

                    const code = params.get('code') || hashParams.get('code');
                    const error = params.get('error') || hashParams.get('error');
                    const errorDescription = params.get('error_description') || hashParams.get('error_description');

                    popup.close();

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
            const n = { name };
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
                msgDialog('warninga', '', l.mig_fail, l.mig_error, () => dialog.hide());
                return null;
            }

            crypto_setsharekey(h, sk);

            return {
                tph: ph,
                tak: w,
                tek: a32_to_base64(sk),
            };
        }

        async enqueueMigration(prefetchId, target) {
            const {tph, tek, tak} = target;
            const {result} = await api.req({
                a: 'msq',
                mspqid: prefetchId,
                ph: tph,
                e: {
                    tph,
                    tek,
                    tak,
                    sn: nodeList
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
    };
});
