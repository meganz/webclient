/* eslint-disable max-classes-per-file */
/** @property s4.ui */
lazy(s4, 'ui', () => {
    'use strict';

    const {logger} = s4.utils;

    const callS4HandlerFn = (fn, n, ...args) => {
        const {subType} = M.currentCustomView;
        const nConf = {
            bucket: 'buckets'
        };
        const handler = s4[n ? nConf[s4.kernel.getS4NodeType(n)] : subType].handlers;

        if (handler && typeof handler[fn] === 'function') {
            return handler[fn](...n ? [n, ...args] : args);
        }
    };

    const s4BcProp = freeze({
        's4': ['', ''],
        'keys': ['s4-keys', l.s4_keys],
        'users': ['s4-users', l.s4_users],
        'groups': ['s4-groups', l.s4_groups],
        'policies': ['s4-policies', l.s4_policies]
    });

    const dyh = (fn, ...args) => {
        if (typeof dyh[fn] === 'function') {
            return dyh[fn](...args);
        }
        logger.warn(`dyh('${fn}') is not a function`);
        return Promise.reject(ENOENT);
    };

    Object.defineProperties(dyh, Object.getOwnPropertyDescriptors({
        'is-section': (section) => {
            return M.currentrootid === 's4' && M.currentCustomView.subType === section;
        },
        'is-mega-list': (cv) => {
            const {subType} = cv || M.currentCustomView;
            return M.currentrootid === 's4' && ['container', 'bucket'].includes(subType);
        },
        'is-breadcrumb-root': (items) => {
            return M.currentrootid === 's4' && items.length < 4;
        },
        'breadcrumb-properties': (id) => {
            let type, localeName;
            const {containerID, subType} = M.currentCustomView;

            if (s4BcProp[id]) {
                [type, localeName] = s4BcProp[id];
            }
            else {
                const s4Type = M.geS4NodeType(id);

                if (s4Type === 'container') {
                    type = 's4-object-storage';
                    localeName = l.obj_storage;
                }
                else if (s4Type === 'bucket') {
                    type = 's4-buckets';
                    localeName = M.getNameByHandle(id);
                }
                else if (subType === 'bucket') {
                    type = 'folder';
                    localeName = M.getNameByHandle(id);
                }
                else if (subType) {
                    const {s4} = M.getNodeByHandle(containerID);
                    const s = String(M.currentdirid).split('/').pop();

                    type = 's4-properties';
                    localeName = tryCatch(() => s4[subType.charAt(0)][s] && s4[subType.charAt(0)][s].n)() || s;
                }
            }

            return {localeName, type};
        },
        'breadcrumb-click': (target) => {
            target = dyh('folder-id', target);
            if (target !== M.currentdirid) {
                M.openFolder(target).catch(tell);
            }
        },
        'folder-id': (path) => {
            const sPath = typeof path === 'string' ? path : path.toString();
            const currentCV = M.isCustomView(sPath);
            const cachedCV = M.currentCustomView;

            if (!currentCV) {
                const {subType, original} = cachedCV;
                return subType === 'bucket' ?
                    sPath :
                    original.slice(0, original.indexOf(sPath) + sPath.length);
            }

            const cv = currentCV || cachedCV;
            return cv ? `${cv.prefixPath}${cv.nodeID || cv.subType}` : sPath;
        },
        'check-node-update': (n, oldattr) => {
            if (M.currentrootid === 's4' && (n.s4 || oldattr.s4) && oldattr.s4 !== n.s4) {
                s4.ui.fmDomUpdate(n);
            }
        },
        'empty-ui': () => {
            const n = M.d[M.currentdirid.split('/').pop()];

            if (M.currentLabelFilter) {
                $('.fm-empty-filter', '.fm-right-files-block').removeClass('hidden');
            }
            else if (n) {
                $(`.fm-empty-s4-${n.p === M.RootID ? 'container' : 'bucket'}`, '.fm-right-files-block')
                    .removeClass('hidden');
                $('.s4-grid-view', '.fm-right-files-block').addClass('hidden');
            }
        },
        'init-status-bar-links': (e, classList) => {
            $.hideContextMenu(e);
            return callS4HandlerFn('initStatusBarLinks', null, classList);
        },
        'required-links': () => {
            return callS4HandlerFn('requiredLinks');
        }
    }));
    freeze(dyh);

    const listFactory = {
        getInstance(domNode, handle, type, onItems, onEmptyItems) {
            const types = Object.create(null);
            lazy(types, 'keys', () => s4.keys.S4List);
            lazy(types, 'users', () => s4.users.S4List);
            lazy(types, 'groups', () => s4.groups.S4List);
            lazy(types, 'policies', () => s4.policies.S4List);
            lazy(types, 'user-keys', () => s4.userProperties.S4KeyList);
            lazy(types, 'user-groups', () => s4.userProperties.S4GroupList);
            lazy(types, 'user-policies', () => s4.userProperties.S4PolicyList);
            lazy(types, 'group-users', () => s4.groupProperties.S4UserList);
            lazy(types, 'group-policies', () => s4.groupProperties.S4PolicyList);
            lazy(types, 'policy-groups', () => s4.policyProperties.S4GroupList);
            lazy(types, 'policy-users', () => s4.policyProperties.S4UserList);

            const list = types[type];
            // TODO "supports" function in every list class might have became a bit redundant?
            // or maybe this double check is safer?
            if (list && list.supports(type)) {
                return new list(domNode, handle, onItems, onEmptyItems);
            }

            logger.error(`${type} S4 List not implemented`);
            return false;
        }
    };

    /** @class s4.ui */
    const ui = new class {

        constructor() {
            this.selectedTab = null;
            this.lists = Object.create(null);
            this.isGettingItems = false;
            this.policies = false;
            this.$fmBlock = $('.fm-right-files-block', '.fmholder');
            this.$infoHeaderBlocks = $('.s4-info-header-blocks', this.$filesBlock);
            this.$contentBlocks = $('.s4-grid-view', this.$filesBlock);
        }

        get lastPathPart() {
            const {subType} = M.currentCustomView;
            const path = String(M.currentdirid).split('/').pop();
            return subType !== path && (parseInt(path) || path) || false;
        }

        /**
         * Render Object storage section
         * Show Container content until multiple containers feature is available
         * Create Container if containers list is empty
         * @returns {void} void
         * @memberOf s4.ui
         */
        renderRoot() {
            const cn = s4.utils.getContainersList();

            if (cn.length === 1) {
                M.openFolder(cn[0].h, true);
            }
        }

        /**
         * Hide all S4 UI components
         *
         * @returns {void} void
         * @memberOf s4.ui
         */
        layoutCleanup() {
            this.list = false;
            if (this.codeEditor) {
                this.codeEditor.setValue('');
            }
            $('.files-grid-view.fm, .fm-blocks-view.fm', this.$fmBlock)
                .removeClass('s4-view active-header');
            $('.fm-empty-section.s4', this.$fmBlock).addClass('hidden');
            this.$infoHeaderBlocks.addClass('hidden');
            this.$contentBlocks.addClass('hidden');
            $('> div', this.$infoHeaderBlocks).addClass('hidden');
            $('> div',  this.$contentBlocks).addClass('hidden');
            $('.fm-breadcrumbs-block', 'body').removeClass('info');
        }

        /**
         * Update bucket or object public access in DOM
         *
         * @param {MegaNode} node Bucket node
         * @param {HTMLElement} domNode DOM node
         * @param {String} s4Type S4 node type
         * @returns {HTMLElement} HTMLElement with updated data
         * @memberOf s4.ui
         */
        updateNodePublicAccess(node, domNode, s4Type) {
            const typeNode = domNode.querySelector('.type');
            let accessNode = domNode.querySelector('.access-ctrl');

            if (M.currentrootid !== 's4' || !typeNode || typeof node !== 'object'
                || !(s4Type = s4Type || s4.kernel.getS4NodeType(node)) || s4Type === 'container') {
                return domNode;
            }

            if (!accessNode) {
                accessNode = mCreateElement('td', {
                    'class': 'access-ctrl',
                    'megatype': 'accessCtrl'
                });
                typeNode.parentNode.insertBefore(accessNode, typeNode.nextSibling);
            }

            // Set Public Access for Buckets and Objects
            if (s4Type !== 'bucket-child') {
                const s4PublicAccess = s4.kernel.getPublicAccessLevel(node);
                let s4PaoLabel = l.s4_pao_denied;

                if (s4Type === 'bucket') {
                    if (s4PublicAccess === 0) {
                        s4PaoLabel = l.s4_pao_managed;
                    }
                    else if (s4PublicAccess === 1) {
                        s4PaoLabel = l.s4_pao_granted;
                    }
                }
                else if (s4PublicAccess === 1) {
                    s4PaoLabel = l.s4_enabled_obj_url;
                }
                else {
                    s4PaoLabel = l.s4_disabled_obj_url;
                }

                // Set Public access
                accessNode.textContent = s4PaoLabel;
            }

            return domNode;
        }

        /**
         * Retrieve currently in-view DOM node
         * @param {MegaNode|String|Object} n ufs-node handle, or the node itself
         * @returns {HTMLElement} DOM node.
         * @memberOf s4.ui
         */
        getDOMNodeFor(n) {
            if (typeof n === 'string') {
                // @todo ditch if no needed for render
                n = M.getNodeByHandle(n) || {h: n};
            }

            return document.getElementById(n.h)
                || M.megaRender && M.megaRender.hasDOMNode(n.h) && M.megaRender.getDOMNode(n.h);
        }

        /**
         * Update bucket or object dom element if rendered
         *
         * @param {MegaNode} n Bucket/Object node
         * @param {String} s4Type S4 node type
         * @returns {void} void
         * @memberOf s4.ui
         */
        fmContainerChildDomUpdate(n, s4Type) {
            const domNode = this.getDOMNodeFor(n);
            let iconNode = false;
            let typeNode = false;

            if (domNode && M.currentdirid.split('/').pop() === n.p) {

                if (s4Type !== 'bucket') {
                    return this.updateNodePublicAccess(n, domNode, s4Type);
                }

                if ((iconNode = document.querySelector(`[id="treea_${n.h}"] .nw-fm-tree-folder`))) {
                    iconNode.className = 'nw-fm-tree-icon-wrap sprite-fm-mono icon-bucket-filled';
                }

                // Update grid element
                if ((typeNode = domNode.querySelector('.type'))) {
                    this.updateNodePublicAccess(n, domNode, s4Type);

                    // Set bucket type
                    typeNode.textContent = l.s4_bucket_type;

                    // Set Bucket Icon
                    if ((iconNode = domNode.querySelector('.transfer-filetype-icon'))) {
                        iconNode.className = `transfer-filetype-icon folder ${fileIcon(n)}`;
                    }
                }
                else if ((iconNode = domNode.querySelector('.block-view-file-type'))) {

                    // Update block icon
                    iconNode.className = `block-view-file-type folder ${fileIcon(n)}`;
                }
            }
        }

        /**
         * Update S4 FM dom element if rendered
         *
         * @param {MegaNode|Object} n Bucket node
         * @returns {*} status
         * @memberOf s4.ui
         */
        fmDomUpdate(n) {
            if (M.currentrootid !== 's4' || typeof n !== 'object') {
                return false;
            }

            const s4Type = s4.kernel.getS4NodeType(n);

            // Update the bucket childs if the bucket attrs are changed
            if (s4Type === 'bucket' && this.bucket && this.bucket.h === n.h) {
                this.renderBucketHeader(n).catch(dump);

                return false;
            }

            if (s4Type === 'container') {

                const {subType} = M.currentCustomView;
                this.renderList(s4.ui.lastPathPart ? s4.ui.selectedTab : subType, n);

                // Temp Policy Attachment value update
                // @todo fix when s4.p/info is implemented
                if (s4.ui.lastPathPart && s4.ui.selectedTab.includes('policy')) {
                    s4.policyProperties.handlers.policyDataUpdate();
                }
            }
            else {
                this.fmContainerChildDomUpdate(n, s4Type);
            }
        }

        /**
         * Render bucket header in the bucket or it's child
         *
         * @param {MegaNode|Object} n Bucket node
         * @returns {Promise<*>} Promise
         * @memberOf s4.ui
         */
        async renderBucketHeader(n) {
            if (M.currentrootid !== 's4' || typeof n !== 'object') {
                return this.layoutCleanup();
            }

            if (!M.d[n.h]) {
                await dbfetch.get(n.h);
            }

            if (!(this.bucket = s4.kernel.getS4BucketForObject(n))) {
                return false;
            }

            $('.files-grid-view.fm, .fm-blocks-view.fm', this.$fmBlock).addClass('active-header');
            this.$infoHeaderBlocks.removeClass('hidden');
            const $bucketHeader = $('.s4-info-header-bucket', this.$infoHeaderBlocks)
                .removeClass('hidden');
            const $notification = $('.bucket-access-warning', this.$infoHeaderBlocks)
                .removeClass('hidden');
            const publicAccess = s4.kernel.getPublicAccessLevel(this.bucket);

            if (publicAccess === 1) {
                $notification.safeHTML(l.s4_bkt_access_granted_tip);
            }
            else if (publicAccess === 2) {
                $notification.safeHTML(l.s4_bkt_access_denied_tip);
            }
            else {
                $notification.safeHTML(l.s4_bkt_access_origin_tip);
            }

            $('.bucket-details-name', $bucketHeader).text(this.bucket.name);
            $('.bucket-domain', $bucketHeader)
                .text(s4.kernel.bucket.getHostDomain(this.bucket.h));

            $('.bkt-settings-btn', this.$fmBlock)
                .rebind('click.bucket-settings', () => this.showDialog(s4.buckets.dialogs.settings, this.bucket));

            $('a', $notification).rebind('click.openHelpCenter', () => {
                window.open(
                    `${l.mega_help_host}/megas4/s4-buckets/change-bucket-object-url-access`,
                    '_blank',
                    'noopener,noreferrer'
                );
            });
        }

        renderList(subType, n) {
            const list = this.lists[subType];
            if (list) {
                list.render(n).catch(tell);
            }
        }

        /**
         * Render S4 subsection
         *
         * @param {String} [urlPath] url path
         * @param {MegaNode|Object} [n] s4 node
         * @returns {void} void
         * @memberOf s4.ui
         */
        async render(urlPath, n = false) {
            const {subType, nodeID, containerID} = urlPath && M.isCustomView(urlPath) || M.currentCustomView;
            this.s4path = urlPath;
            this.selectedTab = null;
            this.layoutCleanup();

            if (M.dyh !== dyh) {
                M.dyh = dyh;
            }

            if (!this.beforePageChangeListener) {
                this.beforePageChangeListener = mBroadcaster.addListener('beforepagechange', tpage => {
                    this.bucket = false;
                    this.publicAccess = false;

                    if (!M.getNodeByHandle(tpage.split('/')[1]).s4) {
                        mBroadcaster.removeListener(this.beforePageChangeListener);
                        delete this.beforePageChangeListener;

                        for (const list of Object.values(this.lists)) {
                            if (list instanceof this.classes.S4List) {
                                list.destroy();
                            }
                        }
                        this.lists = Object.create(null);
                        this.policies = false;
                        this.layoutCleanup();

                        if (this.codeEditor) {
                            this.codeEditor.toTextArea();
                            this.codeEditor = undefined;
                        }

                        if (M.dyh === dyh) {
                            delete M.dyh;
                        }
                    }
                });
            }

            // Containers, Buckets and Objects
            if (['container', 'bucket'].includes(subType)) {
                if (M.v.length === 0 && M.currentLabelFilter) {
                    $('.fm-empty-filter', '.fm-right-files-block').removeClass('hidden');
                }
                else if (M.v.length === 0 && (!mega.ui.mNodeFilter || !mega.ui.mNodeFilter.selectedFilters)) {
                    $(`.fm-empty-s4-${subType}`, '.fm-right-files-block').removeClass('hidden');
                    this.$contentBlocks.addClass('hidden');
                }

                if (subType === 'bucket') {
                    this.renderBucketHeader(M.getNodeByHandle(nodeID)).catch(dump);
                }
            }
            else {
                this.selectedTab = null;
                if (s4.ui.lastPathPart) {
                    await this.renderSelected();
                }
                else {
                    const $emptyBlock = $(`div[class*=fm-empty-s4-${subType}]`, '.fm-main');
                    this.$pageBlock = $(`.s4-${subType}-management-scroll`, this.$contentBlocks);

                    if (!this.lists[subType]) {
                        this.lists[subType] = listFactory.getInstance(
                            this.$pageBlock[0],
                            containerID,
                            subType,
                            () => {
                                // @todo Improve logic when switching sections while data is being loaded
                                if (subType !== M.currentCustomView.subType) {
                                    return false;
                                }
                                $emptyBlock.addClass('hidden');
                                this.$contentBlocks.removeClass('hidden');
                                this.$pageBlock.removeClass('hidden');
                            },
                            () => {
                                this.$contentBlocks.addClass('hidden');
                                this.$pageBlock.addClass('hidden');
                                $emptyBlock.removeClass('hidden');
                            }
                        );
                    }
                    this.renderList(subType, n);
                }
            }
            $('.js-s4-new-bucket', this.$fmBlock).rebind('click.create-bucket', () => {
                this.showDialog(s4.buckets.dialogs.create);
            });
            $('.fm-s4-new-group', this.$fmBlock).rebind('click.create-group', () => {
                this.showDialog(s4.groups.dialogs.create);
            });
            $('.fm-s4-new-user', this.$fmBlock).rebind('click.create-user', () => {
                this.showDialog(s4.users.dialogs.create);
            });
            $('.fm-s4-new-key', this.$fmBlock).rebind('click.create-key', () => {
                this.showDialog(s4.keys.dialogs.create);
            });
        }

        async getData(handle, subType) {
            const kernelFn = s4.kernel[subType];
            if (kernelFn && typeof kernelFn.list === 'function') {
                return kernelFn.list(handle);
            }
        }

        async getSelected(handle, id, subType) {
            if (subType === 'policies') {
                return s4.policyProperties.handlers.info(handle, id);
            }

            const kernelFn = s4.kernel[subType];
            if (kernelFn && typeof kernelFn.info === 'function') {
                return kernelFn.info(handle, parseInt(id));
            }
        }

        async renderSelected() {
            const {containerID, subType} = M.currentCustomView;
            const kernelFn = ['policies'].includes(subType) ? subType : subType.slice(0, -1);
            const selected = await this.getSelected(containerID, s4.ui.lastPathPart, kernelFn)
                .catch(dump);

            if (!selected) {
                return M.openFolder(`${containerID}/${subType}`).catch(dump);
            }

            this.$contentBlocks.removeClass('hidden');
            this.$pageBlock = $(`.s4-${subType}-info-content-block`, this.$contentBlocks);
            this.$pageBlock.removeClass('hidden');
            $('.ui-selected', this.$pageBlock).removeClass('ui-selected active');
            $(`.js-${kernelFn}-name-value`, this.$pageBlock).text(selected.name);
            $(`.js-${kernelFn}-arn-value span`, this.$pageBlock).text(selected.arn);
            $(`.js-${kernelFn}-att-num-value`, this.$pageBlock).text(selected.cnt);

            this.renderSelectedList();

            $('.s4-tabs-bl .s4-tab-lnk', this.$pageBlock).rebind('click.s4tab', (e) => {
                const attr = e.target.dataset.table;
                $('.ui-selected', this.$pageBlock).removeClass('ui-selected active');
                $('.s4-tabs-bl .s4-tab-lnk', this.$pageBlock).removeClass('active');
                $(e.currentTarget).addClass('active');
                $('.s4-info-section', this.$pageBlock).addClass('hidden');
                $(`.${attr}`).removeClass('hidden');
                const tabName = attr.split('-');
                this.selectedTab = tabName.length > 2 ? [tabName[0], tabName[1]].join('-') : tabName[0];
                this.renderSelectedList();
            });
        }

        renderSelectedList(n) {
            const { containerID, subType } = M.currentCustomView;
            const defaultTab = {
                users: 'user-keys',
                groups: 'group-users',
                policies: 'policy-pdoc'
            };
            if (!this.selectedTab) {
                this.selectedTab = defaultTab[subType];
            }
            $('.s4-tabs-bl .s4-tab-lnk', this.$pageBlock).removeClass('active');
            $(`.s4-tabs-bl .s4-tab-lnk.s4-${this.selectedTab}`).addClass('active');
            $('.s4-info-section', this.$pageBlock).addClass('hidden');
            $(`.s4-info-section.${this.selectedTab}-info`).removeClass('hidden');
            const listElement =
                $(`.s4-${this.selectedTab}-management-scroll.sticky-header-table-container`, this.$pageBlock);
            if (this.selectedTab === 'policy-pdoc') {
                mLoadingSpinner.show('s4-show-ploicy-doc');
                s4.policyProperties.handlers.showPolicyDoc()
                    .catch(nop)
                    .finally(() => mLoadingSpinner.hide('s4-show-ploicy-doc'));
            }
            else if (!this.lists[this.selectedTab]) {
                this.lists[this.selectedTab] = listFactory.getInstance(
                    listElement[0],
                    containerID,
                    this.selectedTab,
                    () => {
                        listElement[0].classList.remove('hidden');
                        this.$contentBlocks.removeClass('hidden');
                        this.$pageBlock.removeClass('hidden');
                        $.tresizer();
                    },
                    () => {
                        listElement[0].classList.add('hidden');
                    }
                );
            }
            this.renderList(this.selectedTab, n);
            if (subType === 'users') {
                $('.js-user-arn-value .icon-copy', this.$fmBlock).rebind('click.s4arn', e => {
                    s4.users.handlers.copyArn(e);
                });
            }
            else if (subType === 'groups') {
                $('.js-group-arn-value .icon-copy', this.$fmBlock).rebind('click.s4arn', e => {
                    s4.groups.handlers.copyArn(e);
                });
            }
            else if (subType === 'policies') {
                $('.js-policies-arn-value .icon-copy', this.$fmBlock).rebind('click.s4arn', e => {
                    s4.policies.handlers.copyArn(e);
                });
            }
        }

        policiesInfoBindEvents() {
            const infoPageBlock = this.$pageBlock.get(0);
            Ps.initialize(infoPageBlock.querySelector('.policy-users-info .sticky-header-table-container'));
            Ps.initialize(infoPageBlock.querySelector('.policy-groups-info .sticky-header-table-container'));

            $('.action.add-s4-new-users', '.s4-info-section').rebind('click.add-user', () => {
                this.showDialog('addUser', ['ABC DEF', 'OPQ RST']);
            });
            $('.action.add-s4-new-groups', '.s4-info-section').rebind('click.add-group', () => {
                this.showDialog('addGroup', ['ABC DEF', 'OPQ RST']);
            });
        }

        getInvalidNodeNameError(n, name) {
            name = name || n.name;
            const type = s4.kernel.getS4NodeType(n.h);

            if (type === 'bucket') {
                if (!name) {
                    return l.s4_bucket_empty_error;
                }

                const maxLength = 63;
                if (name.length > maxLength) {
                    return l.s4_bucket_max_length_error.replace('%s', maxLength);
                }

                if (!s4.kernel.isValidBucketName(name)) {
                    return l.s4_bucket_not_allowed_chars_error;
                }
            }
        }

        renameDialog(type, item, heading, icon) {
            M.safeShowDialog('rename', () => {
                const $dialog = $('.mega-dialog.rename-dialog', '.mega-dialog-container')
                    .removeClass('hidden').addClass('active');

                const $input = $('input', $dialog).trigger('focus').val(item.name);

                $('.rename-dialog-button.rename', $dialog).rebind('click.s4kd.rename', () => {
                    const name = $input.val().trim();

                    if (item.name === name) {
                        closeDialog();
                    }
                    else {
                        mLoadingSpinner.show(`s4-${type}-rename`);
                        Promise.resolve(s4[type].handlers.validateName(name))
                            .then((error) => {
                                if (error) {
                                    throw new Error(error);
                                }
                            })
                            .then(() => {
                                const checkNameAvailable = s4[type].handlers.checkNameAvailable;
                                if (typeof checkNameAvailable === 'function') {
                                    return checkNameAvailable(name, item.name);
                                }
                            })
                            .then(() => {
                                closeDialog();
                                return s4.kernel[item.kernel].rename(
                                    s4.ui.lists[type].handle, item.id, name);
                            })
                            .catch((ex) => {
                                if ($dialog[0].classList.contains('hidden')) {
                                    return tell(ex);
                                }

                                $('.duplicated-input-warning span', $dialog).text(ex.message || ex);
                                $dialog.addClass('duplicate');
                                $input.addClass('error');
                                return tSleep(2)
                                    .then(() => {
                                        $dialog.removeClass('duplicate');
                                        $input.removeClass('error').trigger('focus');
                                    });
                            })
                            .finally(() => {
                                mLoadingSpinner.hide(`s4-${type}-rename`);
                            });
                    }
                });

                $('header h2', $dialog).text(heading);
                $('.transfer-filetype-icon', $dialog)
                    .attr('class', `transfer-filetype-icon sprite-fm-mono ${icon}`);
                $('button.js-close, .rename-dialog-button.cancel', $dialog)
                    .rebind('click.s4kd.rename.cancel', closeDialog);

                $input.rebind('keydown.s4kd.rename', (ev) => {
                    if (ev.keyCode === 13) {
                        $('.rename-dialog-button.rename', $dialog).click();
                    }
                    else if (ev.keyCode === 27) {
                        closeDialog();
                    }
                });

                return $dialog;
            });
        }

        showDialog(dialog, ...args) {
            assert(dialog, `Invalid S4 Dialog: ${dialog}`);
            if (typeof dialog.bindEvents === 'function') {
                dialog.bindEvents();
            }
            return dialog.show(...args);
        }
    };

    class _S4ResizeFeature {
        constructor(domNode, colsWidth) {
            this.domNode = domNode;
            this.colsWidth = colsWidth;

            Object.defineProperty(this, 'containerSidesPadding', {value: 52});
        }

        get [Symbol.toStringTag]() {
            return '_S4ResizeFeature';
        }

        init(disable = false) {
            this.destroy();
            if (!disable) {
                $(window).rebind('resize.s4-table', () => {
                    this._resize();
                });
            }
        }

        preRender() {
            this._resize(true);
        }

        destroy() {
            $(window).off('resize.s4-table');
        }

        _hasToResize(isPreRender, headerWidth, minWidthToResize) {
            if (document.body.offsetWidth < minWidthToResize) {
                return true;
            }
            if (s4.ui.isGettingItems || isPreRender) {
                return false;
            }
            return headerWidth > 0;
        }

        _resize(isPreRender = false) {
            const [ className, { min, max } ] = Object.entries(this.colsWidth)[0];
            const header = document.querySelector(
                `.${this.domNode.classList[0]} .s4-grid-table.data-table thead .${className}`);

            if (header) {
                header.style.width = '100%';

                const colsWidth = Object.values(this.colsWidth).reduce((acc, val) => {
                    return acc + val.init || val.min;
                }, 0);

                const minWidthToResize = colsWidth +
                    this.containerSidesPadding +
                    $.leftPaneResizable.element.outerWidth() +
                    s4.utils.getNodeWidth(document.querySelector('.nw-fm-left-icons-panel'));

                let headerWidth = s4.utils.getNodeWidth(header);

                if (this._hasToResize(isPreRender, headerWidth, minWidthToResize)) {
                    if (headerWidth < min) {
                        headerWidth = min;
                    }
                    else if (headerWidth > max) {
                        headerWidth = max;
                    }
                    header.style.width = `${headerWidth}px`;
                }
            }
        }
    }

    class _S4ScrollbarFeature {
        constructor(domNode) {
            this.domNode = domNode;
            this.$psItems = Object.create(null);
        }

        get [Symbol.toStringTag]() {
            return '_S4ScrollbarFeature';
        }

        init() {
            if (this.domNode.classList.contains('ps')) {
                Ps.update(this.domNode);
            }
            else {
                if (!Object.keys(this.$psItems).length) {
                    this.counter = 0;
                }
                Ps.initialize(this.domNode);
                this.domNode.dataset.psid = this.counter;
                this.$psItems[this.counter++] = this.domNode;
            }
        }

        destroy() {
            if (this.domNode && this.domNode.classList.contains('ps')) {
                Ps.destroy(this.domNode);
                this.domNode.classList.remove('ps');
                const key = this.domNode.dataset.psid;
                delete this.domNode.dataset.psid;
                if (key && this.$psItems[key]) {
                    delete this.$psItems[key];
                    if (!Object.keys(this.$psItems).length) {
                        this.counter = 0;
                    }
                }
            }
        }
    }

    class S4Dialog {
        constructor(dialogName, $dialogContainer) {
            this.dialogName = dialogName;
            this.$dialogContainer = $dialogContainer;
            this.$dialogProgress = $('footer button.progress', this.$dialogContainer);
            this.$dialogCancel = $('footer button.cancel', this.$dialogContainer);
            this.scrollbar = new _S4ScrollbarFeature(null, true);
            this.handleOverlayClick = false;
        }

        destroy() {
            if (!this._closing) {
                this.hide();
            }
        }

        hide() {
            if (!$.dialog) {
                return false;
            }
            assert($.dialog === this.getDialogName());
            this._closing = true;
            closeDialog();
            this.destroyScrollbar();
            delete this.tainted;
            delete this._closing;
            this.unbindEvents();
        }

        show() {
            M.safeShowDialog(this.getDialogName(), () => {
                $('.fm-dialog-overlay').rebind('click.s4', () => {
                    // TODO it would be easy to control here if the dialog should be closed or not
                    // depending on this.tainted or if cancel confirmation dialog is open
                    this.destroy();
                });
                this.$dialogContainer.rebind('dialog-closed.s4dlg', () => {
                    this.$dialogContainer.off('dialog-closed.s4dlg');
                    this.destroy();
                });
                $('button.js-close', this.$dialogContainer).rebind('click.s4dlg', () => {
                    this._cancelCheck();
                });
                this.$dialogCancel.rebind('click.s4dlg', () => {
                    this._cancelCheck();
                });
                return this.$dialogContainer;
            });
        }

        unbindEvents() {
            this.$dialogContainer.unbind('dialog-closed.s4dlg');
            this.$dialogCancel.unbind('click.s4dlg');
            $('button.js-close', this.$dialogContainer).unbind('click.s4dlg');
            $('.fm-dialog-overlay').unbind('click.s4');
        }

        destroyScrollbar() {
            this.scrollbar.destroy();
        }

        initScrollbar(domNode) {
            this.scrollbar.domNode = domNode;
            this.scrollbar.init();
        }

        checkTaint(orig, current) {
            let changed = false;

            if (orig) {
                for (const key of Object.keys(orig)) {
                    if (orig[key] !== current[key]) {
                        changed = true;
                        break;
                    }
                }
            }
            this.tainted = changed;
        }

        getDialogName() {
            return `${this.handleOverlayClick ? 's4-managed-' : ''}${this.dialogName}`;
        }

        _cancelCheck() {
            if (this.tainted) {
                var submsg = '';
                if (this.user && this.user.name) {
                    submsg = l.s4_dialog_confirm_cancel_user;
                }
                else if (this.group && this.group.name) {
                    submsg = l.s4_dialog_confirm_cancel_group;
                }

                msgDialog(
                    `-confirmation:!^${l.s4_dialog_confirm_cancel_discard}!${l.s4_dialog_confirm_cancel_continue}`,
                    l[1597],
                    l.s4_dialog_confirm_cancel_title,
                    submsg,
                    (yes) => {
                        if (yes) {
                            this.destroy();
                        }
                    });
            }
            else {
                this.destroy();
            }
        }

        _toggleProgress(on) {
            if (on) {
                this.$dialogProgress.removeClass('disabled');
            }
            else {
                this.$dialogProgress.addClass('disabled');
            }
        }

        _createBadge(label, idPrefix, $step) {
            const $template = $('.badge-template', $step).clone();
            $template
                .removeClass('badge-template hidden')
                .attr('data-name', idPrefix + label);
            $('.badge-name', $template).text(label);
            return $template.prop('outerHTML');
        }

        _handleDialogError(ex, cb) {
            delay('s4.handle.dialog.error', () => {
                if (typeof cb === 'function') {
                    cb();
                }
                this.hide();
                tell(ex);
            }, 50);
        }
    }

    class S4PagedDialog extends S4Dialog {
        constructor(dialogName, $dialogContainer, maxStep, regressSteps) {
            super(dialogName, $dialogContainer);
            this.step = 1;
            this.$steps = Object.create(null);
            this.maxStep = maxStep;
            this.text = {
                header: '',
                progress: l[556],
            };
            this.isCustomFlow = false;
            this.stepLocked = false;
            for (let i = 1; i <= maxStep; i++) {
                const $step = $(`.step-${i}`, this.$dialogContainer);
                if ($step.length) {
                    this.$steps[i] = $step;
                }
                else if (d) {
                    logger.error('Failed to select step ', i);
                }
            }
            if (regressSteps) {
                this.regressSteps = Array.isArray(regressSteps) ? regressSteps : [regressSteps];
                this.$dialogRegress = $('footer button.regress', this.$dialogContainer);
            }
        }

        destroy() {
            super.destroy();

            $('span', this.$dialogProgress.removeClass('disabled')).text(this.text.progress);
        }

        hide() {
            super.hide();

            for (var key of Object.keys(this.$steps)) {
                this.$steps[key].addClass('hidden');
            }
            if (this.$dialogRegress) {
                this.$dialogRegress.addClass('hidden');
            }
        }

        show() {
            super.show();

            $('header h2', this.$dialogContainer).text(this.text.header);
            if (!this.isCustomFlow) {
                this.steps(1);
            }
        }

        unbindEvents() {
            super.unbindEvents();

            this.$dialogProgress.unbind('click.s4dlg');
            if (this.regressSteps) {
                this.$dialogRegress.unbind('click.s4dlg');
            }
        }

        bindEvents() {
            this.$dialogProgress.rebind('click.s4dlg', () => {
                if (!this.$dialogProgress.hasClass('disabled')) {
                    this._triggerNextStep().catch(dump);
                }
                return false;
            });

            if (this.regressSteps) {
                this.$dialogRegress.rebind('click.s4dlg', () => {
                    this.stepLocked = false;
                    this.$steps[this.step--].addClass('hidden');
                    this.steps().catch(dump);
                });
            }
        }

        async steps(step, isProgressDisabled) {
            step = step || this.step;
            this.step = step | 0;

            assert(typeof this[`step${this.step}`] === 'function', `Invalid step (${step})`);

            if (isProgressDisabled) {
                this.$dialogProgress.addClass('disabled');
            }
            else {
                this.$dialogProgress.remove('disabled');
            }

            $('span', this.$dialogProgress).text(this.text.progress);
            this.$dialogCancel.removeClass('hidden');

            loadingDialog.pshow();
            this[`step${this.step}`]()
                .then(() => {
                    if (this.regressSteps) {
                        if (this.regressSteps.includes(this.step)) {
                            this.$dialogRegress.removeClass('hidden');
                        }
                        else {
                            this.$dialogRegress.addClass('hidden');
                        }
                    }
                })
                .catch(this._handleDialogError.bind(this))
                .finally(() => loadingDialog.phide());
        }

        async _triggerNextStep() {
            if (typeof this[`step${this.step}`] === 'function') {
                loadingDialog.pshow();
                await this[`step${this.step}`](true)
                    .catch((ex) => {
                        if (!this.stepLocked) {
                            this.hide();
                        }
                        tell(ex);
                    })
                    .finally(() => loadingDialog.phide());

                if (!this.stepLocked) {
                    return ++this.step > this.maxStep ? this.hide() : this.steps();
                }
            }
        }

        toggleRowCheckbox($row, isToggleProgress) {
            $row.toggleClass('checkboxOn checkboxOff');
            if (isToggleProgress) {
                if ($('.checkboxOn', $row.closest('table')).length) {
                    this.$dialogProgress.removeClass('disabled');
                }
                else {
                    this.$dialogProgress.addClass('disabled');
                }
            }
        }
    }

    class _S4Selection {
        constructor(domNode) {
            this.domNode = domNode;
        }

        clear() {
            M.clearSelectedNodes();
            $('.ui-selected', this.domNode).removeClass('ui-selected active');
        }

        current($row, item, prop = false) {
            this.clear();
            if (item) {
                M.addSelectedNodes(prop ? item[prop] : item);
            }
            $row.addClass('ui-selected active');
        }
    }

    class _S4Sort {
        constructor(defaultField) {
            this.defaultField = defaultField;

            Object.defineProperty(this, 'field', {value: defaultField, writable: true});
            Object.defineProperty(this, 'desc', {value: false, writable: true});
        }

        sort(items) {
            const sorted = Object.entries(items);
            sorted.sort(([,itemA], [,itemB]) => this._sortFn(itemA, itemB));
            return sorted.map(([id,]) => id);
        }

        _sortFn(itemA, itemB, isDefault = false) {
            const field = isDefault ? this.defaultField : this.field;
            const order = isDefault ? 1 : this.desc ? -1 : 1;

            const a = itemA[field];
            const b = itemB[field];

            if (a === b) {
                return field === this.defaultField ? 0 : this._sortFn(itemA, itemB, true);
            }
            return M.compareStrings(a, b, order);
        }
    }

    class S4List {
        constructor(domNode, handle, onItems, onEmptyItems, width, sortField) {
            this.domNode = domNode;
            this.handle = handle;
            this.onItems = onItems;
            this.onEmptyItems = onEmptyItems;
            this.$tableHeader = $(`.s4-grid-table.data-table thead`, domNode);
            this.$tableData = $(`.s4-grid-table.data-table tbody`, domNode);
            this.features = [
                new _S4ScrollbarFeature(domNode),
                new _S4ResizeFeature(domNode, width)
            ];
            this.selection = new _S4Selection(domNode);
            this.sort = new _S4Sort(sortField);
        }

        destroy() {
            for (const feature of this.features) {
                feature.destroy();
            }
            this.features.length = 0;
            this.unbindEvents();
        }

        async render(n) {
            mLoadingSpinner.show('s4-render-list');

            this._preRender();

            s4.ui.isGettingItems = true;
            let items = this.getItems(n);

            if (items instanceof Promise) {
                items = await items
                    .catch((ex) => {
                        if (d) {
                            console.error(ex);
                        }
                    })
                    .finally(() => {
                        s4.ui.isGettingItems = false;
                        $.tresizer();
                    });
            }

            if (Array.isArray(items)) {
                const [key, data] = items;
                items = {};
                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    items[item[key]] = item;
                }
            }
            items = freeze(items || Object.create(null));
            const sorted = this.sort.sort(items);
            const rendered = Object.create(null);
            for (const row of this.domNode.querySelectorAll('.s4-grid-table.data-table tbody tr')) {
                const id = this.getRowId(row);
                if (items[id]) {
                    rendered[id] = 1;
                }
                else {
                    row.remove();
                }
            }

            for (const id of sorted) {
                const item = items[id];
                const index = sorted.indexOf(id);
                if (rendered[id]) {
                    this._update(id, item, index);
                }
                else {
                    this._add(item, index);
                }
            }

            this._postRender(sorted.length);
            mLoadingSpinner.hide('s4-render-list');
        }

        getRowId(row) {
            const {id} = row;

            logger.assert(id, `Invalid DOM Node...`, row);
            return id;
        }

        setRow(row, id) {
            logger.assert(id && typeof id === 'string', 'Invalid invocation.', id);
            row.id = id;
        }

        getItems(n) {
            if (n && n.h !== this.handle) {
                // @todo review whenever we support multiple containers..
                logger.error(`Unexpected node...`, n.h, this.handle);
            }

            return s4.kernel.getS4NodeByHandle(n && n.h || n || this.handle, 'container', true);
        }

        findSelected() {
            const [id] = $.selected;
            if (id) {
                return this.getItems()
                    .then(([k, items]) => {
                        const item = items.find((item) => item[k].toString() === id.toString());
                        if (!item) {
                            this.selection.clear();
                        }
                        return item;
                    });
            }
            this.selection.clear();
        }

        handleSelection(event, onSelection, item, prop) {
            const $row = $(event.target).closest('tr');

            this.selection.current($row, item, prop);
            if (item && typeof onSelection === 'function') {
                onSelection(item);
            }
        }

        unbindEvents() {
            $('.s4-grid-view', '.fmholder').unbind('click.s4gv contextmenu.s4gv');
            $('.arrow', this.$tableHeader).unbind('click.s4lsth');
            this.$tableData.unbind('click.s4lst');
            $('.grid-view-resize', this.$tableHeader).unbind('mousedown.s4lst.colresize');
            const $fmholder = $('#fmholder', 'body');
            $fmholder.unbind('mousemove.s4lst.colresize');
            $fmholder.unbind('mouseup.colresize');
        }

        bindEvents() {
            $('.s4-grid-view', '.fmholder').rebind('click.s4gv contextmenu.s4gv', (ev) => {
                if (!$(ev.target).closest('.s4-grid-table').length) {
                    this.selection.clear();
                }
            });

            $('.arrow', this.$tableHeader).rebind('click.s4lsth', (e) => {
                const $th = $(e.target).closest('th');
                const field = $th.attr('s4sort');

                if (field) {
                    const desc = field === this.sort.field ? !this.sort.desc : false;
                    this.sort.field = field;
                    this.sort.desc = desc;
                    this.render();
                }
            });

            this.$tableData.rebind('click.s4lst', (e) => {
                this.handleSelection(e);
            });

            const $fmholder = $('#fmholder', 'body');
            $('.grid-view-resize', this.$tableHeader).rebind('mousedown.s4lst.colresize', (e) => {
                const $th = $(e.target).closest('th');
                const startWidth = $th.outerWidth() - e.pageX;
                const className = $th[0].classList[0];

                $fmholder.rebind('mousemove.s4lst.colresize', (e) => {
                    const { min, max } = this.colsWidth[className];
                    let width = startWidth + e.pageX;

                    if (width < min) {
                        width = min;
                    }
                    else if (width > max) {
                        width = max;
                    }

                    $th.css('width', width);

                    for (const feature of this.features) {
                        // passing "true" disables resize on "_S4ResizeFeature" feature
                        // as FM does, auto resizing is disabled once the user resizes a column manually
                        feature.init(true);
                    }
                });

                $fmholder.rebind('mouseup.colresize', () => {
                    $fmholder.css('cursor', '');
                    $fmholder.off('mouseup.colresize');
                    $fmholder.off('mousemove.colresize');
                });
            });
        }

        _renderSortHeaders() {
            $('th .arrow', this.domNode).removeClass('desc asc');
            let th = this.$tableHeader[0].querySelector(`th[s4sort="${this.sort.field}"]`);

            if (th && (th = th.querySelector('.arrow'))) {
                th.classList.add(this.sort.desc ? 'asc' : 'desc');
            }
        }

        _initHeaders() {
            const header = this.$tableHeader[0].rows[0];

            if (header.firstElementChild.childElementCount) {
                header.prepend(document.createElement('th'));
            }

            if (header.lastElementChild.childElementCount) {
                header.appendChild(document.createElement('th'));
            }

            for (const [className, cfg] of Object.entries(this.colsWidth)) {
                $(`th.${className}`, this.domNode).css('width', cfg.init);
            }
        }

        _preRender() {
            $.hideContextMenu();
            this.selection.clear();

            for (const feature of this.features) {
                feature.init();
                if (typeof feature.preRender === 'function') {
                    feature.preRender();
                }
            }
            this._initHeaders();
        }

        _postRender(isItems) {
            if (isItems) {
                this._renderSortHeaders();
                if (typeof this.onItems === 'function') {
                    this.onItems();
                }
            }
            else if (typeof this.onEmptyItems === 'function') {
                this.onEmptyItems();
            }

            this.bindEvents();
        }

        async _add(item, index) {
            const fragment = document.createDocumentFragment();
            const node = this.template.cloneNode(true);

            const res = this.setRow(node, item);
            if (res instanceof Promise) {
                res.catch(dump);
            }

            fragment.appendChild(node);
            fragment.firstChild.prepend(document.createElement('td'));
            fragment.firstChild.append(document.createElement('td'));

            const $rows = this.$tableData.find('tr');
            const parent = $rows.length > 0 ? $rows[0].parentNode : this.$tableData.get(0);
            if (index >= $rows.length) {
                parent.appendChild(fragment);
            }
            else {
                parent.insertBefore(fragment, $rows[index]);
            }
        }

        async _update(id, item, index) {
            const $rows = this.$tableData.find('tr');
            const $row = this.$tableData.find(`tr#${id}`);

            const res = this.setRow($row.get(0), item);
            if (res instanceof Promise) {
                res.catch(dump);
            }

            if (index < $rows.length && $row.index() !== index) {
                $row.detach();
                $row.insertBefore($rows[index]);
            }
        }
    }

    ui.classes = freeze({S4Dialog, S4PagedDialog, S4List});
    return ui;
});
