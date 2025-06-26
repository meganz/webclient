function resetSensitives() {
    'use strict';

    /**
     * This module is used to handle sensitive nodes (also known as hidden nodes or lock nodes)
     * @property mega.sensitives
     * @global
     */
    lazy(mega, 'sensitives', () => {
        const onboardedKey = 'sensitives.onboarded';

        // Areas that should show the hidden nodes as normal regardless of the sen attribute
        const normalAreas = freeze({
            'shares': true,
            'out-shares': true,
            'public-links': true,
            'file-requests': true,
            'chat': true,
            's4': true
        });

        // Areas that should not have hide/unhide entry point
        const noEntryPointAreas = freeze({
            ...normalAreas,
            [M.RubbishID]: true
        });

        // Areas that should show the hidden nodes as blurred regardless of the show hidden files setting
        const blurredAreas = freeze({
            [M.RubbishID]: true
        });

        // confirmation dialog messages for passShareCheck()
        const shareDiagMsgs = freeze({
            1: [
                'children-sensitives-confirmation',
                l.sen_hidden_children_title,
                l.sen_hidden_childrens_txt,
                l.sen_hidden_children_txt
            ],
            2: [
                'share-sensitives-confirmation',
                l.sen_hidden_item_title,
                l.sen_hidden_items_txt,
                l.sen_hidden_item_txt
            ],
        });

        /**
         * Disposable cache for sensitive status recursive check
         * @type {Object.<Boolean>}
         */
        let sensitiveStatusCache = null;

        /**
         * @type {Boolean?}
         */
        let isOnboarded = null;

        /**
         * Cached value for config value
         * @type {Boolean}
         */
        let showSen = false;

        /**
         * @returns {Boolean}
         */
        const checkAccountPermission = () => !!(window.u_attr && (u_attr.p || u_attr.b));

        /**
         * Whether the user is allowed to use sensitives feature
         */
        let featureEnabled = false;

        /**
         * @param {Boolean} status Whether the onboarded status should be set to true or false
         * @returns {Promise<Boolean>}
         */
        const toggleOnboarded = async(status) => {
            isOnboarded = status === true;
            await mega.ccPrefs.setItem(onboardedKey, isOnboarded);

            return isOnboarded;
        };

        /**
         * Showing confirmation dialog when sharing a node/set with sensitive nodes
         * @param {String} dialogName Global name of the dialog
         * @param {String} title Title of the dialog
         * @param {String} txt Text to show in the dialog
         * @returns {Promise<-1|1>}
         */
        const sensitivesConfirmationDialog = (dialogName, title, txt) => new Promise((resolve, reject) => {
            const dialog = new MDialog({
                dialogName,
                ok: {
                    label: l[507],
                    callback: () => {
                        resolve(mega.sensitives.SAFE_TO_SHARE);
                    },
                    classes: ['mega-button', 'branded-green']
                },
                cancel: {
                    label: l[82],
                    callback: () => {
                        reject(EBLOCKED);
                    }
                },
                icon: 'sprite-fm-uni icon-info icon-size-16',
                setContent() {
                    const p = document.createElement('p');
                    p.className = 'px-6';
                    p.textContent = txt;

                    this.slot = p;
                }
            });

            dialog.title = title;
            dialog.show();
        });

        /**
         * @param {String} okLabel Label to show in the OK button
         * @param {Function} [okFn] Action to perform when a user confirms
         * @param {Boolean} [passOnboarding] Whether to pass the onboarding status or not
         * @returns {Promise<1>}
         */
        const showOnboardingDialog = (okLabel, okFn, passOnboarding) => new Promise((resolve) => {
            const dialog = new MDialog({
                dialogName: 'onboarding',
                ok: {
                    label: okLabel,
                    callback: () => {
                        if (typeof okFn === 'function') {
                            okFn();
                        }

                        if (passOnboarding === true) {
                            toggleOnboarded(true);
                        }

                        resolve(1);
                    },
                    classes: ['mega-button', 'branded-green']
                },
                setContent() {
                    const slot = document.createElement('div');
                    const imgDiv = document.createElement('div');
                    const img = document.createElement('img');
                    const title = document.createElement('h2');
                    const bulletPoints = [
                        [l.sen_onboard_subtitle1, l.sen_onboard_text1, 'icon-eye-hidden1'],
                        [l.sen_onboard_subtitle2, l.sen_onboard_text2, 'icon-images1'],
                        [l.sen_onboard_subtitle3, l.sen_onboard_text3, 'icon-eye-reveal1']
                    ];

                    imgDiv.appendChild(img);
                    slot.appendChild(imgDiv);
                    slot.appendChild(title);

                    slot.className = is_mobile ? '' : 'p-6';
                    img.className = 'w-32 h-32';
                    title.className = 'text-center py-2';
                    imgDiv.className = 'text-center';

                    img.src = `${staticpath}/images/mega/hidden/hidden_pro.png`;
                    title.textContent = l.sen_onboard_title;

                    for (let i = 0; i < bulletPoints.length; i++) {
                        const [t, tx, ic] = bulletPoints[i];

                        const div = document.createElement('div');
                        const divRight = document.createElement('div');
                        const titleLine = document.createElement('p');
                        const txtLine = document.createElement('p');
                        const icon = document.createElement('i');

                        div.className = 'flex flex-row items-center py-2';
                        icon.className = `sprite-fm-mono icon-size-6 mx-4 ${ic}`;
                        titleLine.className = 'font-title-h3-bold text-color-high my-1';
                        txtLine.className = 'sensitive-onboarding-txt my-0';

                        titleLine.textContent = t;
                        txtLine.textContent = tx;

                        div.appendChild(icon);
                        div.appendChild(divRight);
                        divRight.appendChild(titleLine);
                        divRight.appendChild(txtLine);
                        slot.appendChild(div);
                    }

                    this.slot = slot;
                }
            });

            dialog.show();
        });

        /**
         * @param {MegaNode|false} node Node to check
         * @returns {void}
         */
        const updateCDTree = (node) => {
            if (node && !node.t) {
                return;
            }

            delay('sensitives.updateCDTree', M.renderTree);
        };

        /**
         * Getting the onboarded status from cc container
         * @returns {Promise<Boolean>}
         */
        const getOnboardedStatus = async() => {
            if (isOnboarded === null) {
                isOnboarded = await mega.ccPrefs.getItem(onboardedKey) === true;
            }

            return isOnboarded;
        };

        /**
         * Checking whether a user is allowed to perform sensitive operations
         * @returns {Promise<0|1>} 0 - not checked, 1 - confirmed
         */
        const onboard = async() => {
            if (!featureEnabled) {
                showOnboardingDialog(
                    l[433],
                    () => {
                        loadSubPage('pro');
                    }
                );
                return 0;
            }

            if (await getOnboardedStatus() || await showOnboardingDialog(l.ok_button, nop, true)) {
                return 1;
            }

            return 0;
        };

        /**
         * Checking whether the node should be displayed as normal (incoming shares, s4, backups, etc)
         * To prevent checking same parents more than once, we use disposable sensitiveStatusCache
         * @param {MegaNode} n A single node to check
         * @returns {Boolean}
         */
        const isNormalNode = (n) => {
            if ('kernel' in s4 && s4.kernel.getS4NodeType(n)) {
                return true;
            }

            // We need this cache only over the current event loop to avoid iterating same parents multiple times
            if (!sensitiveStatusCache) {
                sensitiveStatusCache = Object.create(null);
                sensitiveStatusCache.shares = array.to.object(M.getTreeHandles('shares'), true);
                sensitiveStatusCache.backups = array.to.object(M.getTreeHandles(M.BackupsId), true);

                onIdle(() => {
                    sensitiveStatusCache = null;
                });
            }

            return sensitiveStatusCache.shares[n.p] || sensitiveStatusCache.shares[n.h]
                || sensitiveStatusCache.backups[n.p] || sensitiveStatusCache.backups[n.h];
        };

        /**
         * Checking (recursively) whether the node has sensitive parents or not
         * If any of the nodes in parents tree is qualified as sensitive, then the node is considered so by inheritance
         * To prevent checking same parents more than once, we use disposable sensitiveStatusCache
         * @param {MegaNode} n A single node to check parents for
         * @returns {Boolean} false - normal node, true - inherits sensitivity from a parent
         */
        const isSensitiveInherited = (n) => {
            // This feature is disabled for public links and non-paid users
            if (!featureEnabled) {
                return false;
            }

            if (!n || !n.p) {
                return false;
            }

            if (sensitiveStatusCache[n.p] === undefined) {
                const parent = M.getNodeByHandle(n.p);
                sensitiveStatusCache[n.p] = parent.sen === 1 || isSensitiveInherited(parent);
            }

            return sensitiveStatusCache[n.p];
        };

        /**
         * Checking whether the node is qualified as hidden/sensitive or not
         * If any of the nodes in parents tree is qualified as sensitive, then the node is considered so as well
         * To prevent checking same parents more than once, we use disposable sensitiveStatusCache
         * @param {MegaNode|String} n A single node or a node handle to check
         * @param {Boolean} [checkParent] Whether to run recursive check on node's parent or not
         * @returns {0|1|2} 0 - normal node, 1 - sensitive by itself, 2 - inherits sensitivity from a parent
         */
        const isSensitive = (n, checkParent = true) => {
            // This feature is disabled for public links and non-paid users
            if (!featureEnabled) {
                return 0;
            }

            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }
            if (n && n.p) {
                if (n.sen === 1) {
                    return 1;
                }

                if (isNormalNode(n)) {
                    return 0;
                }

                if (checkParent) {
                    return isSensitiveInherited(n) ? 2 : 0;
                }
            }

            return 0;
        };

        let sensitives = {
            get featureEnabled() {
                return featureEnabled;
            },
            getOnboardedStatus,
            resetGlobalParameters() {
                showSen = mega.config.get('showSen') === 1;
                featureEnabled = !!mega.flags.ff_hnir && !pfid && checkAccountPermission();
                sensitives.showGlobally = !featureEnabled || showSen;
            },
            showOnboardingDialog,
            /**
             * Checking if plan level has changed
             * @returns {void}
             */
            onPlanUpgrade() {
                if (!window.u_attr) {
                    window.location.reload(); // This is incorrect state, we need to reload the page
                }

                if (!mega.flags.ff_hnir || pfid) {
                    return;
                }

                const prevValue = featureEnabled;
                sensitives.resetGlobalParameters();

                if (prevValue !== featureEnabled) {
                    resetSensitives();
                    mega.gallery.nodeUpdated = true;
                    mega.gallery.albumsRendered = false;
                    M.openFolder(M.currentdirid, true);
                }
            },
            /**
             * Get sensitivity for a selection of nodes.
             * @param {Array} nodes ufs-node handles.
             * @param {Object|*} [event] jQuery/DOM event triggering the action, if any.
             * @returns {Number} 0 - Disable, 1 - Hide, 2 - Unhide
             */
            getSensitivityStatus(nodes, event) {
                if (
                    pfid
                    || !this.isViewEnabled(event && event.currentTarget)
                    || !Array.isArray(nodes)
                    || nodes.some(h => !this.nodeCanBeSensitive(h))
                ) {
                    return 0;
                }

                if (!featureEnabled) {
                    // Double check if the feature is globally enabled at all
                    return (mega.flags.ff_hnir) ? 1 : 0;
                }

                for (let i = nodes.length; i--;) {
                    const n = M.getNodeByHandle(nodes[i]);

                    if (!this.isSensitive(n, false)) {
                        return 1;
                    }
                }

                return 2;
            },
            /**
             * Apply context-menu styling.
             * @param {String|HTMLElement} selector or html element
             * @param {Boolean} [toHide] value from
             * @returns {void}
             */
            applyMenuItemStyle(selector, toHide) {
                const $item = $(selector);

                $item.toggleClass('sensitive-added', !toHide);

                if (toHide) {
                    $('i', $item).addClass('icon-eye-hidden').removeClass('icon-eye-reveal');
                    $('span', $item).safeHTML(l.sen_hide);
                }
                else {
                    $('i', $item).addClass('icon-eye-reveal').removeClass('icon-eye-hidden');
                    $('span', $item).safeHTML(l.sen_unhide);
                }

                this.applyProBadge($item);

                if (is_mobile) {
                    this.applyHelpCircle($item, toHide);
                }
            },

            /**
             * Add or remove Pro badge from the context menu item
             * @param {jQuery.fn.init} $item jQuery node to attach the Pro badge to
             * @returns {void}
             */
            applyProBadge($item) {
                if (checkAccountPermission()) {
                    $('p.sen-pro-only', $item).remove();
                }
                else if (!$('p.sen-pro-only', $item).length) {
                    $item.safeAppend(`<p class="sen-pro-only">@@</p>`, l[8695]);
                }
            },
            /**
             * Checking whether the area is allowing to use sensitive actions
             * @param {jQuery|*} [elm] Specific DOM node to check
             * @returns {Boolean}
             */
            isViewEnabled(elm) {
                return !pfid
                    && (!noEntryPointAreas[M.currentrootid] || elm && $(elm).hasClass('nw-fm-tree-item'));
            },
            /**
             * Checking whether the item can be set to sensitive
             * @param {MegaNode|String} n A single node or a node handle to check
             * @returns {Boolean}
             */
            nodeCanBeSensitive(n) {
                if (typeof n === 'string') {
                    n = M.getNodeByHandle(n);
                }

                return !!n
                    && !!n.p
                    && n.h !== M.cf.h
                    && n.h !== M.CameraId
                    && n.h !== M.SecondCameraId
                    && !n.su // No need for recursive check for inbound shares atm
                    && !isNormalNode(n)
                    && !isSensitiveInherited(n);
            }
        };

        sensitives.resetGlobalParameters();

        if (featureEnabled) {
            sensitives = {
                ...sensitives,
                isSensitive,
                SAFE_TO_SHARE: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                /**
                 * Reflects the fmconfig showSen setting
                 * @type {Boolean}
                 */
                showGlobally: showSen,
                /**
                 * Checking whether the node is required to be shown or not
                 * @param {MegaNode|String} n A single node or a node handle to check
                 * @param {Boolean} [dialog] Whether the node is rendered in a dialog
                 * @returns {Boolean}
                 */
                shouldShowNode(n, dialog = false) {
                    return sensitives.isNormalArea(dialog) || sensitives.hiddenNodesBlurred(dialog) || !isSensitive(n);
                },
                /**
                 * Checking whether the node is required to be shown as blurred
                 * @param {MegaNode|String} n A single node or a node handle to check
                 * @param {Boolean} [dialog] Whether the node is rendered in a dialog
                 * @returns {Boolean}
                 */
                shouldBlurNode(n, dialog = false) {
                    return !sensitives.isNormalArea(dialog) && isSensitive(n);
                },
                /**
                 * Checking whether to display hidden nodes as blurred
                 * @param {Boolean} [dialog] Whether the node is rendered in a dialog
                 * @returns {Boolean}
                 */
                hiddenNodesBlurred(dialog = false) {
                    return sensitives.showGlobally || blurredAreas[M.currentrootid] && !dialog;
                },
                /**
                 * Checking whether all the nodes are required to be shown as normal
                 * @param {Boolean} [dialog] Whether the node is rendered in a dialog
                 * @returns {Boolean}
                 */
                isNormalArea: (dialog = false) => normalAreas[M.currentrootid] && !dialog,
                /**
                 * Checking whether the node is required to be shown in the tree or not
                 * @param {MegaNode} n A single node to check
                 * @returns {Boolean}
                 */
                shouldShowInTree: (n) => sensitives.showGlobally || !(n.t & M.IS_SEN),
                /**
                 * Updating immediate DOM nodes and its children if needed on the screen (if any)
                 * @param {MegaNode} n Node to use for the update
                 * @param {Number} status Status to apply (1 - hide, undefined - unhide)
                 * @returns {void}
                 */
                updateDomNode(n, status) {
                    if (n.t && M.c[n.h]) {
                        const childKeys = Object.keys(M.c[n.h]);

                        for (let i = 0; i < childKeys.length; i++) {
                            const n = M.d[childKeys[i]];

                            if (n) {
                                sensitives.updateDomNode(n, status);
                            }
                        }
                    }

                    updateCDTree(n);

                    if (!is_mobile) {
                        delay('sensitives.dropGalleryCache', () => {
                            const sectionKeys = Object.keys(mega.gallery.sections);

                            for (let i = 0; i < sectionKeys.length; i++) {
                                const key = sectionKeys[i];

                                if (mega.gallery[key]) {
                                    mega.gallery[key].clearRenderCache();
                                }
                            }
                        });
                    }

                    if (M.recentsRender) {
                        if (sensitives.showGlobally) {
                            M.recentsRender.nodeChanged(n.h);
                        }
                        else {
                            M.recentsRender.updateState(n.h);
                        }
                    }

                    if (sensitives.hiddenNodesBlurred()) {
                        $(`#${n.h}`).toggleClass('is-sensitive', status === 1 && !sensitives.isNormalArea());

                        if (window.slideshowid) {
                            slideshowNodeAttributes(n, $('.media-viewer-container', 'body'));
                        }

                        return;
                    }

                    if (status) {
                        if (!sensitives.isNormalArea()) {
                            removeUInode(n.h);
                        }
                    }
                    else if (M.gallery || M.albums) {
                        mega.gallery.handleNodeUpdate(n);
                    }
                    else {
                        fm_updated(n);
                    }

                    $.tresizer();
                },
                /**
                 * Updating immediate DOM nodes on the screen (if any)
                 * @param {MegaNode} n Node to use for the update
                 * @param {Number} status Status to apply (1 - hide, undefined - unhide)
                 * @returns {void}
                 */
                updateDom(n, status) {
                    delay(`sensitives.updateDomNode${n.h}`, () => {
                        sensitives.updateDomNode(n, status);
                    });
                },
                /** @todo this method can be removed from public space */
                toggleOnboarded,
                /**
                 * Checking if showSen config has changed
                 * @param {Number|Boolean} newValue New showSen value
                 * @returns {Boolean}
                 */
                onConfigChange: (newValue) => {
                    if ((newValue & 1) === (showSen & 1)) {
                        return false;
                    }

                    showSen = newValue === 1;
                    sensitives.showGlobally = showSen;

                    mega.gallery.nodeUpdated = true;
                    mega.gallery.albumsRendered = false;

                    if (window.slideshowid) {
                        history.back();
                    }

                    return true;
                },
                /**
                 * Turning sensitive parameter on or off
                 * @param {String[]} handles Node handles to apply new status to
                 * @param {Boolean} [status] When not specified, the parameter is considered to be set to true
                 * @returns {Promise<Boolean>}
                 */
                async toggleStatus(handles, status = true) {
                    if (!fminitialized || !await onboard().catch(nop)) {
                        return false;
                    }

                    const exportLink = new mega.Share.ExportLink({});

                    if (!Array.isArray(handles)) {
                        handles = [handles];
                    }

                    const promises = [];

                    for (let i = 0; i < handles.length; i++) {
                        const n = M.getNodeByHandle(handles[i]);

                        if (!n || exportLink.isTakenDown(n)) {
                            continue;
                        }

                        if (n.tvf) {
                            fileversioning.sensitiveVersions(n.h, status);
                        }

                        promises.push(api.setNodeAttributes(n, { sen: status ? 1 : undefined }));
                    }

                    await Promise.all(promises).catch(dump);

                    const msg = mega.icu.format(status ? l.sen_nodes_hidden : l.sen_nodes_unhidden, promises.length);

                    if (is_mobile) {
                        mega.ui.toast.show(msg, 4);
                    }
                    else {
                        toaster.main.show({
                            icons: ['sprite-fm-mono icon-check-circle text-color-medium'],
                            content: msg
                        });
                    }

                    if (status && !sensitives.isNormalArea() && !sensitives.hiddenNodesBlurred()) {
                        M.clearSelectedNodes();
                    }

                    return true;
                },
                /**
                 * Showing a confirmation dialog for preventing a user from accidentally sharing sensitive node(s)
                 * @param {String|String[]} handles Node handles to check
                 * @returns {Promise<Number>} 0 - no sensitive children found, 1 - user confirmed, -1 - user denied
                 */
                async passShareCheck(handles) {
                    if (!Array.isArray(handles)) {
                        handles = [handles];
                    }

                    if (
                        !featureEnabled
                        || !await getOnboardedStatus().catch(nop)
                    ) {
                        return this.SAFE_TO_SHARE;
                    }

                    let sensitiveMet = false;
                    const nodes = handles.map(h => M.getTreeHandles(h))
                        .flat()
                        .map(h => M.c[h] || [])
                        .flatMap(o => Object.keys(o));
                    nodes.push(...handles);

                    for (let i = nodes.length; i--;) {
                        const n = M.getNodeByHandle(nodes[i]);

                        if (!n || n.fv) {
                            console.assert(n);
                            continue;
                        }

                        if (n.sen) {
                            sensitiveMet = handles.includes(n.h) + 1;
                            break;
                        }
                    }

                    if (shareDiagMsgs[sensitiveMet]) {
                        const m = shareDiagMsgs[sensitiveMet];
                        return sensitivesConfirmationDialog(m[0], m[1], handles.length > 1 ? m[2] : m[3]);
                    }

                    return this.SAFE_TO_SHARE;
                },
                /**
                 * Confirmation dialog preventing a user from accidentally sharing album(s) with sensitive node(s)
                 * @param {String|String[]} handles Album handles to check
                 * @returns {Promise<Number>} 0 - no sensitive children found, 1 - user confirmed, -1 - user denied
                 */
                async passAlbumsShareCheck(handles) {
                    if (!Array.isArray(handles)) {
                        handles = [handles];
                    }

                    if (
                        !featureEnabled
                        || !handles.length
                        || !await getOnboardedStatus().catch(nop)
                    ) {
                        return this.SAFE_TO_SHARE;
                    }

                    loadingDialog.show('albums-sensitives-check');

                    let sensitiveMet = false;

                    const ignoreHandles = array.to.object(
                        [...M.getTreeHandles(M.RubbishID), ...M.getTreeHandles('shares')],
                        true
                    );

                    for (let index = 0; index < handles.length; index++) {
                        const album = mega.gallery.albums.store[handles[index]];

                        // Skip the album if it is already shared
                        if (album.p) {
                            continue;
                        }

                        const eHandles = Object.keys(album.eHandles);

                        for (let i = 0; i < eHandles.length; i++) {
                            const n = M.d[eHandles[i]];

                            if (
                                n
                                && !ignoreHandles[n.p]
                                && !n.fv
                                && isSensitive(n)
                            ) {
                                sensitiveMet = true;
                                break;
                            }
                        }
                    }

                    loadingDialog.hide('albums-sensitives-check');

                    if (!sensitiveMet) {
                        return this.SAFE_TO_SHARE;
                    }

                    return sensitivesConfirmationDialog(
                        'albums-sensitives-confirmation',
                        l.sen_hidden_album_title,
                        handles.length > 1 ? l.sen_hidden_albums_txt : l.sen_hidden_album_txt
                    );
                },
                /**
                 * Add help circle from the context menu item
                 * @param {jQuery.fn.init} $item jQuery node to attach the help circle to
                 * @param {Boolean} [showIcon] Whether to show help circle icon
                 * @returns {void}
                 */
                applyHelpCircle: ($item, showIcon) => {
                    if (!showIcon) {
                        $('i.icon-help-circle-thin-outline', $item).remove();
                    }
                    else if (!$('i.icon-help-circle-thin-outline', $item).length) {
                        const icon = 'sprite-mobile-fm-mono icon-help-circle-thin-outline';
                        $item.safeAppend(`<i class='${icon} right-icon icon-size-24'></i>`);
                    }
                }
            };
        }
        else {
            sensitives.isSensitive = () => false;
            sensitives.passAlbumsShareCheck = () => Promise.resolve(mega.sensitives.SAFE_TO_SHARE);
            sensitives.passShareCheck = () => Promise.resolve(mega.sensitives.SAFE_TO_SHARE);
            sensitives.hiddenNodesBlurred = () => false;
            sensitives.toggleStatus = () => Promise.resolve(onboard());
            sensitives.onConfigChange = nop;
            sensitives.toggleOnboarded = nop;
            sensitives.updateDom = nop;
            sensitives.updateDomNode = nop;
            sensitives.isNormalArea = () => true;
            sensitives.shouldBlurNode = () => false;
            sensitives.shouldShowNode = () => true;
            sensitives.shouldShowInTree = () => true;
            sensitives.applyHelpCircle = nop;
        }

        return sensitives;
    });
}

resetSensitives();

mBroadcaster.addListener('beforepagechange', (tPage) => {
    'use strict';

    if (pfid && !tPage.startsWith('folder/')) {
        resetSensitives(); // Enable/Reset the feature once we are out of folder link
    }
});
