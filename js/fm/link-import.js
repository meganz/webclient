lazy(mega, 'linkImport', () => {

    'use strict';

    let dialog;
    let urlInput;
    let importLinks = new Set();
    let importTarget;
    const iframeWrapper = document.createElement('div');
    const iframeLoader = (() => {

        let iframe;
        const lockName = 'link-import-iframe-loader';

        const _load = urlObj => {

            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframeWrapper.appendChild(iframe);
            }

            return new Promise(resolve => {

                const onLoad = () => {
                    iframe.removeEventListener('load', onLoad);
                    resolve(iframe);
                };

                iframe.addEventListener('load', onLoad);
                iframe.src = location.origin + urlObj.pathname + urlObj.hash;
            });
        };

        const _cleanup = frame => {

            const cw = frame.contentWindow;

            if (cw && cw.decWorkerPool) {
                cw.decWorkerPool.kill();
            }

            frame.src = 'about:blank';
        };

        return {
            // runner for iframe, only one at a time
            run(urlObj, handler) {

                let unlock;
                let frame;

                return mutex.lock(lockName).then(async u => {

                    unlock = u;
                    frame = await _load(urlObj);
                    await handler(frame);
                }).finally(async() => {

                    if (frame) {
                        _cleanup(frame);
                    }

                    await tSleep(0.1); // let iframe make page unload properly

                    if (typeof unlock === 'function') {
                        unlock();
                    }
                });
            },
            destroy() {

                if (iframe) {
                    _cleanup(iframe);
                    iframe.remove();
                    iframe = null;
                }
            }
        };
    })();

    const _getUrlType = (s) => {

        // If link is same url as current site lets treat as mega link
        if ((s.host === location.host || s.host === 'mega.nz' || s.host === 'mega.app')
            && isPublicLink(s.pathname + s.hash)) {
            return 'mega';
        }
        else if (s.host === 'drive.google.com' &&
            (s.pathname.startsWith('/file/') || s.pathname.startsWith('/drive/folders/')) ||
            s.host === 'docs.google.com' &&
            (s.pathname.startsWith('/document/d/') || s.pathname.startsWith('/spreadsheets/d/') ||
            s.pathname.startsWith('/presentation/d/') || s.pathname.startsWith('/videos/d/'))
        ) {
            return 'google';
        }
    };

    const linkImportRequestStates = Object.freeze({
        PENDING: 0,
        IN_PROGRESS: 1,
        SUCCESS: 2,
        CANCELLED: 3,
        ERROR: 4
    });

    const handlers = {

        mega: {

            linkHandler(link) {

                return new Promise((resolve, reject) => {

                    if (link.provider !== 'mega') {
                        return reject(l.url_import_invalid_link);
                    }

                    iframeLoader.run(link.url, async iframe => {

                        const loadRes = await handlers.mega.iframeLoad(iframe, link.url);

                        if (loadRes === 'file' || loadRes === 'folder') {

                            const data = handlers.mega.getNodeData(iframe.contentWindow, loadRes);

                            link.type = loadRes;
                            link.nodeHandle = data.nodeHandle;
                            link.nodeData = data.nodeData;
                            resolve();
                        }
                        else {
                            reject(loadRes);
                        }
                    }).catch(reject);
                });
            },
            async iframeLoad(iframe, url) {

                if (!iframe || !iframe.contentWindow) {
                    console.warn('Iframe contentWindow not accessible for', url && url.href);
                    return;
                }

                const cw = iframe.contentWindow;
                let retry = 30;

                do {
                    await tSleep(0.1);
                }
                while (cw.isPublicLink === undefined && --retry > 0);

                if (!retry) {
                    return l.url_import_invalid_link;
                }

                const isPub = cw.isPublicLink();
                let res;
                let linkType;

                // Link fetcher cannot handle password protected links at this stage
                if (typeof isPub === 'string' && isPub.startsWith('P!')) {
                    return l.url_import_password_required;
                }

                if (!cw.dl_node && !cw.pfid) {
                    res = await new Promise(resolve => {

                        if (isPub.dl) {
                            cw.mBroadcaster.once('dlpage:initialized', resolve);
                        }
                        else {
                            cw.mBroadcaster.once('fm:initialized', () => resolve());
                            cw.mBroadcaster.once('folderreqerr', errorCode => resolve(errorCode));
                        }
                        cw.mBroadcaster.once('mKeyDialog', keyr => {
                            resolve(keyr ? l.url_import_decryption_key_incorrect : l.url_import_decryption_key_missing);
                        });
                    });
                }

                if (isPub.pf && cw[`preflight-folder-link-error:${isPub[0]}`]) {
                    res = cw[`preflight-folder-link-error:${isPub[0]}`];
                }

                if (cw.dl_node) {
                    linkType = 'file';
                }
                else if (res) {
                    return this.handleIframeError(res);
                }
                else if (cw.pfid) {
                    linkType = 'folder';
                }

                if (!linkType) {
                    console.warn('Could not classify MEGA link (file/folder):', url.href);
                    return 'unknown';
                }

                return linkType;
            },
            handleIframeError: res => {

                if (typeof res === 'string') {
                    return res;
                }
                else if (typeof res === 'object') {
                    if (res.err < 0) {
                        if (e.u === 7) {
                            return l.url_import_terms_violation;
                        }

                        res = res.err;

                    }
                    else if (isPub.dl) {
                        if (res.e === ETEMPUNAVAIL) {
                            return l.url_import_temporarily_unavailable;
                        }
                        else if (res.d || !res.at) {
                            return l.url_import_invalid_link;
                        }
                    }
                }

                switch (parseInt(res)) {
                    case ETOOMANY:
                        return l.url_import_terms_violation;
                    case EEXPIRED:
                        return l.url_import_expired;
                }

                return l.url_import_invalid_link;
            },
            getNodeData(cw, type) {

                if (!cw) {
                    return Object.create(null);
                }

                if (type === 'file' && cw.dl_node) {

                    const nodeData = clone(cw.dl_node);

                    if (nodeData) {
                        nodeData.t = 0;
                    }

                    return {
                        nodeData,
                        nodeHandle: nodeData && nodeData.h
                    };
                }
                else if (type === 'folder' && cw.M && cw.M.RootID && cw.M.d) {

                    const nodeHandle = cw.M.RootID;
                    const nodeData = clone(cw.M.d[nodeHandle]);

                    if (nodeData) {
                        nodeData.t = 1;
                    }

                    return {nodeData, nodeHandle};
                }

                return Object.create(null);
            },
            async import(link, targetHandle) {

                const {url} = link;
                let res;

                await iframeLoader.run(url, async iframe => {

                    const loadRes = await handlers.mega.iframeLoad(iframe, url);

                    if (loadRes === 'folder') {

                        const cw = iframe.contentWindow;

                        res = await cw.M.getCopyNodes([cw.M.RootID], {clearna: true}).then(nodes => {
                            nodes.isImporting = true;
                            cw.resetSensitives();

                            if (cw.pfcol && nodes[0].t > 1) {
                                nodes[0].t = 1;
                            }

                            M.copyNodes([cw.M.RootID], targetHandle, false, nodes);
                        }).catch(echo);
                    }
                    else {
                        mega.ui.toast.show(`${loadRes} - ${url}`, 4);
                    }
                });

                return res;
            }
        },

        google: {
            icon: 'sprite-fm-uni icon-googledrive',
            PROVIDER_ID: 1,
            _friendlyError(err) {

                if (typeof err === 'string') {
                    return err;
                }

                if (typeof err === 'number') {
                    if (err === ETOOMANY) {
                        return l.url_import_terms_violation;
                    }

                    if (err === ETEMPUNAVAIL) {
                        return l.url_import_temporarily_unavailable;
                    }

                    return l.url_import_invalid_link;
                }

                if (err && err.cc === 2) {
                    return l.url_import_temporarily_unavailable;
                }

                return l.url_import_invalid_link;
            },
            async linkHandler(link) {

                if (link.provider !== 'google') {
                    throw l.url_import_invalid_link;
                }

                const {result: jobId} = await api.req({
                    a: 'mspq',
                    tp: 4,
                    p: this.PROVIDER_ID,
                    e: {ls: [link.raw]}
                }).catch(ex => {
                    throw this._friendlyError(ex);
                });

                if (typeof jobId === 'number' && jobId < 0) {
                    throw this._friendlyError(jobId);
                }

                let metadata;

                const _fetchStatus = async() => {

                    const {result} = await api.req({a: 'mspf', id: jobId}).catch(ex => {
                        throw this._friendlyError(ex);
                    });

                    if (typeof result === 'number' && result < 0) {
                        throw this._friendlyError(result);
                    }

                    const {SUCCESS, ERROR, CANCELLED} = linkImportRequestStates;

                    if (result.s === SUCCESS) {

                        const {items} = result.d;
                        metadata = items[link.raw];
                    }
                    else if (result.s === ERROR || result.s === CANCELLED) {
                        throw l.url_import_invalid_link;
                    }
                    else {
                        await tSleep(5);
                        return _fetchStatus();
                    }
                };

                await _fetchStatus();

                if (!metadata) {
                    throw l.url_import_invalid_link;
                }

                link.nodeHandle = `ext-google-${jobId}-${Date.now()}`;
                link.nodeData = {
                    name: metadata.n || link.raw
                };

                if (metadata.t === 1) {
                    link.type = 'file';
                    link.nodeData = {
                        name: metadata.n,
                        t: 0,
                        s: metadata.b || 0,
                    };
                }
                else {
                    link.type = 'folder';
                    link.nodeData = {
                        name: link.raw,
                        t: 1,
                        td: metadata.d,
                        tf: metadata.f,
                        tb: metadata.b || 0
                    };
                }
            },
            async import(links, targetHandle) {

                const node = M.getNodeByHandle(targetHandle);
                const writableKey = a32_to_base64([...crypto.getRandomValues(new Uint32Array(4))]);
                const sres = await api_setshare(targetHandle, [{u: 'EXP', r: 0, w: writableKey, t: 2}]).catch(echo);
                const share = M.getNodeShare(targetHandle);

                if (!sres || sres.r && sres.r[0] !== 0) {
                    throw l.url_import_temporarily_unavailable;
                }

                const results = [];

                for (const link of links) {

                    const {result: ires} = await api.req({
                        a: 'msq',
                        tp: 8,
                        ph: node.ph,
                        e: {
                            ls: [link],
                            tph: node.ph,
                            tek: a32_to_base64(u_sharekeys[targetHandle][0]),
                            tak: share.w
                        }
                    }).catch(ex => {
                        throw this._friendlyError(ex);
                    });

                    results.push(ires);
                }

                return results;
            }
        }
    };

    const killIframes = () => {
        iframeLoader.destroy();
        importLinks = new Set();
        iframeWrapper.textContent = '';
    };

    const options = {
        componentClassname: 'mega-sheet journey link-import-dialog',
        showClose: false,
        dialogName: 'link-import-dialog',
        steps: [
            // Step 1: insert url to import
            {
                label: l.url_import_add_links_label,
                customContent() {

                    importTarget = M.currentdirid;

                    const container = document.createElement('div');
                    const description = document.createElement('div');
                    const elm = document.createElement('p');

                    elm.textContent = l.url_import_description_intro;
                    description.appendChild(elm);
                    container.appendChild(description);
                    elm.textContent += ' ';

                    MegaLink.factory({
                        parentNode: elm,
                        text: l[8742],
                        href: 'https://help.mega.io/files-folders/sharing/import-from-shared-links',
                        type: 'text',
                        target: '_blank',
                        componentClassname: 'no-px',
                    });

                    const wrapper = document.createElement('div');
                    wrapper.className = 'import-link-input-wrapper';
                    container.appendChild(wrapper);

                    const label = document.createElement('label');
                    label.textContent = l.url_import_input_label;
                    label.setAttribute('for', 'import-link-input');
                    wrapper.appendChild(label);

                    urlInput = new MegaTextArea({
                        parentNode: wrapper,
                        placeholder: '',
                        fixedHeight: 142
                    });

                    // Prevent scrollbar misplaced on left side
                    urlInput.one('mouseenter', () => {
                        Ps.initialize(urlInput.heightNode);
                    });

                    urlInput.on('change input', () => {
                        dialog.next.disabled = urlInput.value.trim().length === 0;
                    });

                    urlInput.textArea.id = urlInput.textArea.name = 'import-link-input';

                    const info = document.createElement('div');
                    info.className = 'import-link-input-info';
                    info.textContent = l.url_import_input_hint;
                    const infoIcon = document.createElement('i');
                    infoIcon.className = 'sprite-fm-mono icon-help-circle-thin-outline';
                    info.prepend(infoIcon);

                    wrapper.appendChild(info);

                    iframeWrapper.className = 'hidden';
                    container.appendChild(iframeWrapper);

                    return container;
                },
                next: {
                    text: l[507],
                    className: 'slim',
                    action: async() => {

                        const raw = urlInput.textArea.value;
                        const rawLinks = new Set();
                        for (const part of raw.split(/[\n,]+/)) {
                            const trimmed = part.trim();
                            if (trimmed) {
                                rawLinks.add(trimmed);
                            }
                        }
                        let errored = 0;

                        const _ = (ex, link) => {
                            link.err = !link.url || !link.provider ? l.url_import_invalid_link : ex;
                            errored++;
                        };

                        loadingDialog.show('url-import');

                        killIframes();
                        importLinks = new Set();
                        let i = 0;

                        for (const linkStr of rawLinks) {

                            i++;

                            const link = Object.create(null);
                            importLinks.add(link);
                            link.raw = linkStr;
                            link.url = tryCatch(() => new URL(linkStr), false)();
                            if (link.url) {
                                link.provider = _getUrlType(link.url);

                                if (link.provider) {
                                    if (d) {
                                        console.log('Processing link for import:', linkStr, 'count:', i);
                                    }

                                    await handlers[link.provider].linkHandler(link).catch(ex => _(ex, link));
                                }
                                else {
                                    _(l.url_import_invalid_link, link);
                                }
                            }
                            else {
                                _(l.url_import_invalid_link, link);
                            }

                            loadingDialog.showProgress(i / rawLinks.size * 100);
                        }

                        loadingDialog.hideProgress();
                        loadingDialog.hide('url-import');
                        dialog.goToStep(errored ? 1.1 : 2, true);
                    },
                    get disabled() {
                        return !urlInput || urlInput.value.trim().length === 0;
                    }
                },
                skip: {
                    text: l[82],
                    className: 'slim'
                },
                // Step 1.1: Resolve issues with links
                secondaryStep: {
                    label: l.url_import_resolve_issues_label,
                    customContent: () => {

                        const _recalcErrorHeight = erroredInput => {
                            const wrapper = erroredInput.megaInput.$wrapper[0];
                            requestAnimationFrame(() => {
                                const messageHeight = parseInt(getComputedStyle(wrapper.children[1]).height);
                                wrapper.style.marginBottom = `${messageHeight + 13}px`;
                            });
                        };

                        const container = document.createElement('div');

                        const elm = document.createElement('p');
                        elm.textContent = l.url_import_issue_description;

                        const description = document.createElement('div');
                        description.appendChild(elm);
                        container.appendChild(description);

                        const inputWrapper = document.createElement('div');
                        inputWrapper.className = 'errored-link-input-wrapper';
                        container.appendChild(inputWrapper);

                        const hasErrors = () => [...importLinks].some(link => link.err);
                        const isDuplicate = link => {

                            for (const other of importLinks) {

                                if (other === link || other.err || !other.url) {
                                    continue;
                                }

                                if (other.url.href === link.url.href) {
                                    return true;
                                }
                            }

                            return false;
                        };
                        const _finally = (link, erroredInput) => {
                            dialog.next.disabled = hasErrors();
                            loadingDialog.hide('url-import');
                            let icon = '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>';

                            if (link.err) {
                                erroredInput.error = `${icon}${link.err}`;
                            }
                            else {
                                icon = '<i class="sprite-fm-mono icon-check-circle-thin-outline"></i>';
                                erroredInput.message = `${icon}${l.url_import_review_issue_resolved}`;
                            }

                            _recalcErrorHeight(erroredInput);
                        };

                        for (const link of importLinks) {

                            const {raw, err} = link;

                            if (err) {

                                const erroredInput = new MegaInputComponent({
                                    parentNode: inputWrapper,
                                    className: 'pmText no-title-top'
                                });
                                const icon = '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>';
                                erroredInput.value = raw;
                                erroredInput.error = `${icon}${err}`;

                                erroredInput.on('change', function() {

                                    delete link.err;
                                    delete link.type;
                                    link.raw = this.value.trim();
                                    link.url = tryCatch(() => new URL(link.raw), false)();
                                    if (link.url) {
                                        link.provider = _getUrlType(link.url);

                                        if (!link.provider) {
                                            link.err = l.url_import_invalid_link;
                                            return _finally(link, erroredInput);
                                        }
                                        if (isDuplicate(link)) {
                                            link.err = l[16485];
                                            return _finally(link, erroredInput);
                                        }
                                        loadingDialog.show('url-import');

                                        handlers[link.provider].linkHandler(link).catch(ex => {
                                            link.err = !link.url || !link.provider ? l.url_import_invalid_link : ex;
                                        }).always(() => _finally(link, erroredInput));
                                    }
                                    else {
                                        link.err = l.url_import_invalid_link;
                                        _finally(link, erroredInput);
                                    }
                                });

                                _recalcErrorHeight(erroredInput);

                                MegaButton.factory({
                                    parentNode: inputWrapper,
                                    componentClassname: 'secondary',
                                    className: 'link-import-delete-input primary',
                                    icon: 'sprite-fm-mono icon-dialog-close',
                                    type: 'icon',
                                    onClick() {

                                        const {parentNode} = erroredInput;

                                        importLinks.delete(link);
                                        dialog.next.disabled = hasErrors();
                                        this.destroy();
                                        erroredInput.destroy();

                                        if (!parentNode.children.length) {

                                            parentNode.classList.remove('errored-link-input-wrapper');
                                            parentNode.classList.add('import-no-errors-wrapper');

                                            const emptyIcon = document.createElement('div');
                                            emptyIcon.className = 'import-no-errors-icon';
                                            const emptyTitle = document.createElement('h2');
                                            emptyTitle.textContent = l.url_import_no_errors_title;
                                            const emptyText = document.createElement('div');
                                            emptyText.textContent = l.url_import_no_errors_text;

                                            parentNode.appendChild(emptyIcon);
                                            parentNode.appendChild(emptyTitle);
                                            parentNode.appendChild(emptyText);
                                        }
                                    }
                                });
                            }
                        }

                        return container;
                    },
                    next: {
                        text: l[507],
                        className: 'slim',
                        action: () => {
                            dialog.goToStep(2, true);
                        },
                        disabled: true
                    },
                    skip: {
                        className: 'slim',
                        text: l[82]
                    },
                    back: {
                        className: 'slim',
                        text: l[822],
                        action: 1
                    }
                }
            },
            // Step 2: Review links
            {
                label: l.url_import_review_links_label,
                customContent: async() => {

                    const container = document.createElement('div');
                    container.classList.add('no-padding');

                    const elm = document.createElement('p');
                    elm.textContent = l.url_import_review_description;

                    const description = document.createElement('div');
                    description.className = 'import-review-description';
                    description.appendChild(elm);
                    container.appendChild(description);

                    const importSummaryTable = document.createElement('table');
                    importSummaryTable.className = 'grid-table import-summary';

                    container.appendChild(importSummaryTable);

                    const thead = document.createElement('thead');
                    importSummaryTable.appendChild(thead);

                    const tr = document.createElement('tr');
                    thead.appendChild(tr);

                    const th = document.createElement('th');
                    th.id = 'import-summary-count';
                    const importLinkCount = importLinks.size;
                    th.textContent = mega.icu.format(l.url_import_selected_links_count, importLinkCount)
                        .replace('$1', importLinkCount);
                    tr.appendChild(th);

                    const th2 = document.createElement('th');
                    th2.className = 'import-summary-select-all';
                    tr.appendChild(th2);

                    const allChkbx = document.createElement('i');
                    allChkbx.className = 'sprite-fm-mono icon-check sprite-fm-mono-after ';
                    allChkbx.className += 'icon-minimise-after select-all-checkbox all-selected';
                    th2.appendChild(allChkbx);

                    const tbody = document.createElement('tbody');
                    importSummaryTable.appendChild(tbody);

                    allChkbx.addEventListener('click', () => {

                        const sel = allChkbx.classList.contains('all-selected') ||
                            allChkbx.classList.contains('some-selected') ? '.selected' : ':not(.selected)';

                        tbody.querySelectorAll(`.icon-check${sel}`).forEach(checkbox => {
                            checkbox.parentNode.component.trigger('click');
                        });
                    });

                    const duplicateCheck = new Set();

                    for (const link of importLinks) {

                        const {nodeData, nodeHandle, provider} = link;
                        const tr = document.createElement('tr');
                        tbody.appendChild(tr);

                        if (duplicateCheck.has(nodeHandle)) {
                            continue;
                        }

                        duplicateCheck.add(nodeHandle);

                        const td = document.createElement('td');
                        td.colSpan = 2;

                        const nc = new MegaNodeComponent({
                            parentNode: td,
                            nodeData,
                            nodeHandle,
                            onClick: () => {

                                const checked = nc.domNode.querySelector('.icon-check').classList.toggle('selected');

                                link.dnd = !checked;

                                const selCount = tbody.querySelectorAll('.icon-check.selected').length;
                                const totalCount = tbody.querySelectorAll('.icon-check').length;

                                if (selCount === totalCount) {
                                    allChkbx.classList.add('all-selected');
                                    allChkbx.classList.remove('some-selected');
                                    dialog.next.disabled = false;
                                }
                                else if (selCount > 0) {
                                    allChkbx.classList.add('some-selected');
                                    allChkbx.classList.remove('all-selected');
                                    dialog.next.disabled = false;
                                }
                                else {
                                    allChkbx.classList.remove('some-selected', 'all-selected');
                                    dialog.next.disabled = true;
                                }

                                th.textContent = mega.icu.format(l.url_import_selected_links_count, totalCount)
                                    .replace('$1', selCount);
                            }
                        });

                        if (nc.node.t) {
                            nc.domNode.querySelector('.num-files').textContent += `, ${nc.size}`;
                            nc.iconNode.className = 'item-type-icon icon-folder-24';
                            nc.removeClass('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey');
                        }
                        else {
                            nc.domNode.querySelector('.file-size').textContent = nc.size;
                        }

                        if (provider === 'google') {
                            nc.iconNode.className = handlers.google.icon;
                        }

                        tr.appendChild(td);
                    }

                    container.addEventListener('mouseenter', () => {
                        Ps.initialize(container);
                    }, {once: true});

                    return container;
                },
                next: {
                    action: async() => {

                        loadingDialog.show('url-import');

                        let tFolderName = l.url_import_folder_prefix.replace('$1', time2date(Date.now() / 1000, 8));

                        if (duplicated(tFolderName, importTarget)) {
                            tFolderName = fileconflict.findNewName(tFolderName, importTarget);
                        }

                        const h = await M.createFolder(importTarget, tFolderName).catch(tell);

                        if (!h) {
                            return dialog.hide();
                        }

                        const fileLinks = [];
                        const googleLinks = [];
                        let success = 0;
                        let start = 0;

                        for (const link of importLinks) {

                            const {provider, url, dnd, type, raw} = link;

                            if (dnd) {
                                continue;
                            }

                            // if it is mega file link, collect for bulk import
                            if (provider === 'mega') {

                                eventlog(501039);

                                if (type === 'file') {
                                    fileLinks.push(url.href);
                                    continue;
                                }
                            }
                            else if (provider === 'google') {
                                googleLinks.push(raw);
                                continue;
                            }

                            const res = await handlers[provider].import(link, h);

                            // Importing failed, lets stop further processing
                            if (typeof res === 'number' && res < 0) {
                                break;
                            }

                            success++;
                        }

                        // Mega file links bulk import
                        if (fileLinks.length) {

                            const bulkRes = await M.bulkFileLinkImport(fileLinks, h).catch(echo);

                            if (typeof bulkRes !== 'number') {
                                success++;
                            }
                        }

                        if (googleLinks.length) {

                            const googleResArray = await handlers.google.import(googleLinks, h).catch(echo);

                            for (const googleRes of googleResArray) {

                                if (typeof googleRes !== 'number') {
                                    start++;
                                    eventlog(501040);
                                }
                            }
                        }

                        dialog.hide();
                        loadingDialog.hide('url-import');
                        const msg = start ? l.url_import_toast_success_3rd_party : l.url_import_toast_success;

                        // TODO: improve feedback for partial success/failure
                        if (success > 0 || start > 0) {
                            mega.ui.toast.show(
                                msg.replace('$2', tFolderName),
                                4,
                                l[16797],
                                {actionButtonCallback: () => M.openFolder(h)}
                            );
                        }
                    },
                    text: l.import_title,
                    className: 'slim',
                    get disabled() {
                        return importLinks.size === 0;
                    }
                },
                skip: {
                    text: l[82],
                    className: 'slim'
                },
                back: {
                    text: l[822],
                    className: 'slim',
                    action: 1
                }
            }
        ],
        onClose: () => {
            urlInput.value = '';
            killIframes();
            tSleep(0.3).then(() => {
                dialog.destroy();
            });
        }
    };

    return {
        showDialog() {

            if (M.isInvalidUserStatus()) {
                return;
            }

            this.dialog = dialog = new MegaJourney(options);

            if (mega.config.get('uiw') | 0) {
                dialog.show();
            }
            else {
                this.showUrlImportWarningDialog();
            }
        },
        showUrlImportWarningDialog() {

            const contents1 = document.createElement('p');
            contents1.textContent = l.url_import_feature_warning_1;

            const contents2 = document.createElement('p');
            contents2.textContent = l.url_import_feature_warning_2;

            const contents3 = document.createElement('p');
            contents3.textContent = l.url_import_feature_warning_3;

            mega.ui.sheet.show({
                name: 'url-import-warning',
                type: 'modal',
                showClose: false,
                preventBgClosing: true,
                navImage: 'url-import-warning-image',
                classList: ['url-import-warning', 'medium-size', 'horizontal-actions'],
                title: l.url_import_feature_title,
                contents: [contents1, contents2, contents3],
                actions: [
                    {
                        type: 'normal',
                        text: l.ok_button,
                        className: 'slim',
                        onClick: () => {
                            mega.config.set('uiw', 1);
                            mega.ui.sheet.hide();
                            dialog.show();
                        }
                    },
                    {
                        type: 'normal',
                        text: l[82],
                        className: 'slim secondary',
                        onClick: () => {
                            mega.ui.sheet.hide();
                        },
                    }
                ]
            });
        }
    };
});
