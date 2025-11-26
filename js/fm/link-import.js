lazy(mega, 'linkImport', () => {

    'use strict';

    let dialog;
    let urlInput;
    let importLinks = [];
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
        // Google for later
        // else if (s.host === 'drive.google.com' &&
        //     (s.pathname.startsWith('/file/') || s.pathname.startsWith('/drive/folders/'))) {
        //     return 'google';
        // }
    };

    const handlers = {

        mega: {

            linkHandler(url, link) {

                return new Promise((resolve, reject) => {

                    const urlObj = link.url = new URL(url);
                    const linkProvider = _getUrlType(urlObj);

                    link.raw = url;
                    link.provider = linkProvider;

                    if (linkProvider !== 'mega') {
                        return reject(l.url_import_invalid_link);
                    }

                    iframeLoader.run(urlObj, async iframe => {

                        const loadRes = await handlers.mega.iframeLoad(iframe, urlObj);

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
            }
        }
    };

    const killIframes = () => {
        iframeLoader.destroy();
        importLinks = [];
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

                        const raw = urlInput.textArea.value.trim();
                        const duplicateCheck = [];
                        const rawLinks = raw.split(/[\n,]+/);
                        let errored = 0;

                        const _ = (ex, link) => {
                            link.err = !link.url || !link.provider ? l.url_import_invalid_link : ex;
                            errored++;
                        };
                        importLinks = []; // reset

                        loadingDialog.show('url-import');

                        killIframes();

                        for (let i = 0; i < rawLinks.length; i++) {

                            const linkStr = rawLinks[i].trim();

                            if (!linkStr || duplicateCheck.includes(linkStr)) {
                                continue;
                            }

                            duplicateCheck.push(linkStr);

                            const link = Object.create(null);
                            importLinks[i] = link;
                            link.raw = linkStr;

                            if (d) {
                                console.log('Processing link for import:', linkStr, 'count:', i);
                            }

                            await handlers.mega.linkHandler(linkStr, link).catch(ex => _(ex, link));

                            loadingDialog.showProgress(i / rawLinks.length * 100);
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

                        importLinks.forEach(({raw, err}, i) => {

                            if (err) {

                                const erroredInput = new MegaInputComponent({
                                    parentNode: inputWrapper,
                                    className: 'pmText no-title-top'
                                });
                                const link = importLinks[i];
                                let icon = '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>';
                                erroredInput.value = raw;
                                erroredInput.error = `${icon}${err}`;
                                link.ei = i;

                                erroredInput.on('change', function() {

                                    delete link.err;
                                    delete link.type;

                                    loadingDialog.show('url-import');

                                    handlers.mega.linkHandler(this.value, link).catch(ex => {
                                        link.err = !link.url || !link.provider ? l.url_import_invalid_link : ex;
                                        erroredInput.error = `${icon}${link.err}`;
                                    }).always(() => {
                                        dialog.next.disabled = importLinks.some(l => l.err);
                                        loadingDialog.hide('url-import');
                                        if (!link.err) {
                                            icon = '<i class="sprite-fm-mono icon-check-circle-thin-outline"></i>';
                                            erroredInput.message = `${icon}${l.url_import_review_issue_resolved}`;
                                        }

                                        _recalcErrorHeight(erroredInput);
                                    });
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

                                        importLinks.splice(importLinks.findIndex(l => l.ei === i), 1);
                                        dialog.next.disabled = importLinks.some(l => l.err);
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
                        });

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
                    th.textContent = mega.icu.format(l.url_import_selected_links_count, importLinks.length)
                        .replace('$1', importLinks.length);
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

                    const duplicateCheck = [];

                    importLinks.forEach((link, i) => {

                        const {provider} = link;
                        let nodeData;
                        let nodeHandle;
                        const tr = document.createElement('tr');
                        tbody.appendChild(tr);

                        if (provider === 'mega') {

                            nodeHandle = link.nodeHandle;
                            nodeData = link.nodeData;
                        }

                        if (duplicateCheck.includes(nodeHandle)) {
                            return;
                        }

                        duplicateCheck.push(nodeHandle);

                        const td = document.createElement('td');
                        td.colSpan = 2;

                        const nc = new MegaNodeComponent({
                            parentNode: td,
                            nodeData,
                            nodeHandle,
                            onClick: () => {

                                const checked = nc.domNode.querySelector('.icon-check').classList.toggle('selected');

                                importLinks[i].dnd = !checked;

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

                        tr.appendChild(td);
                    });

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
                        let success = 0;

                        for (const link of importLinks) {

                            const {provider, url, dnd, type} = link;
                            let res;

                            if (dnd) {
                                continue;
                            }

                            if (provider === 'mega') {

                                // if it is mega file link, collect for bulk import
                                if (type === 'file') {
                                    fileLinks.push(url.href);
                                    continue;
                                }

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

                                            M.copyNodes([cw.M.RootID], h, false, nodes);
                                        }).catch(echo);
                                    }
                                    else {
                                        mega.ui.toast.show(`${loadRes} - ${url}`, 4);
                                    }
                                });
                            }

                            // Importing failed, lets stop further processing
                            if (typeof res === 'number' && res < 0) {
                                break;
                            }

                            success++;
                        }

                        if (fileLinks.length) {

                            const bulkRes = await M.bulkFileLinkImport(fileLinks, h).catch(echo);

                            if (typeof bulkRes !== 'number') {
                                success++;
                            }
                        }

                        dialog.hide();
                        loadingDialog.hide('url-import');

                        // TODO: improve feedback for partial success/failure
                        if (success > 0) {
                            mega.ui.toast.show(
                                l.url_import_toast_success.replace('$2', tFolderName),
                                4,
                                l[16797],
                                {actionButtonCallback: () => M.openFolder(h)}
                            );
                        }
                    },
                    text: l.import_title,
                    className: 'slim',
                    get disabled() {
                        return importLinks.length === 0;
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
