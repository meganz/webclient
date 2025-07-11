lazy(s4, 'utils', () => {
    'use strict';

    /**
     * Returns an object representation of a multiple text
     * Samples (toHtml):
     * - single item: "item_name"
     * - multiple items: "<span>first_item_name</span> and 2 more"
     *
     * label argument translation must contain "%s" and "%d" in any order and this is
     * precisely why "toHtml" representation inserts the "first_item_name" into a "span"
     * in case multiple items since we cannot know the order of "%s" and "%d" beforehand
     *
     * @param {Object} obj Contains list of items
     * @param {String} key item name key
     * @param {String} label internationalization label
     * @returns {Object} multiple text object
     */
    const composeMultipleText = (obj, key, label) => {
        const empty = () => '';
        const mText = {
            length: 0,
            toString: empty,
            toHtml: empty,
            toPartial: empty,
        };

        if (obj && Object.keys(obj).length > 0) {
            const list = Object.values(obj);
            const item = escapeHTML(list[0][key]);

            mText.length = () => list.length;

            if (list.length > 1) {
                const replace = (list, s) => {
                    return label.replace('%s', s).replace('%d', list.length - 1);
                };
                return {
                    ...mText,
                    toString: () => replace(list, item),
                    toHtml: () => replace(list, `<span>${item}</span>`),
                    toPartial: () => replace(list, '')
                };
            }
            return {
                ...mText,
                toString: () => item,
                toHtml: () => item
            };
        }
        return mText;
    };

    /**
     * Calculates the width in pixels of a text in a given font
     * @param {String} text to be measured
     * @param {String} font of the text
     * @returns {Number} width in pixels
     */
    const getWidthFromText = (text, font) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        const width = Math.ceil(context.measureText(text).width);
        canvas.remove();
        return width;
    };

    return freeze({
        logger: new MegaLogger('s4', {
            throwOnAssertFail: true,
            printDate: 'rad' in mega,
            levelColors: {
                ERROR: `#f00000`,
                DEBUG: `#457bf0`,
                WARN: `#f09a00`,
                INFO: `#229944`,
                LOG: '#7e5b6a'
            }
        }),

        /**
         * Export given s4 access & secret keys into a string
         * @param {String} ak s4 access key
         * @param {String} sk s4 secret key
         * @returns String
         * @memberOf s4
         */
        exportKey(ak, sk) {
            return `aws_access_key_id=${ak}\naws_secret_access_key=${sk}`;
        },

        /**
         * Getting containers nodes from M.Tree
         * Probably will be replaced with s4.kernel.container.list();
         * @returns {Array} array
         * @memberOf s4
         */
        getContainersList() {
            const res = [];
            for (const h in M.tree.s4) {
                const n = M.getNodeByHandle(h);

                if (n.s4 && s4.kernel.getS4NodeType(n) === 'container') {
                    res.push(n);
                }
            }
            return res;
        },

        /**
         * Getting bucket node for S4 item
         * @param {Object|String} n S4 node of handle
         * @param {String} type S4 node type
         * @returns {Object} bucket node
         * @memberOf s4
         */
        getBucketNode(n, type) {
            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }

            type = type || s4.kernel.getS4NodeType(n);

            if (type === 'bucket') {
                return n;
            }

            if (type === 'bucket-child' || type === 'object') {
                return s4.kernel.getS4BucketForObject(n);
            }

            return false;
        },

        /**
         * Disabling S4 Object storage and reming container public links
         * @returns {void} void
         * @memberOf s4
         */
        async optsOut() {
            const cn = this.getContainersList();
            const params = [{ a: 's4r' }];

            for (let i = 0; i < cn.length; i++) {
                params.push({a: 's2', n: cn[i].h, s: [{u: 'EXP', r: ''}], ha: ''});
            }

            return api.req(params);
        },

        /**
         * Getting confirmation when copying/moving from/to s4
         * @param {Array} handles Array of node handles
         * @param {String} t Target folder node handle
         * @param {Boolean} toMove True for moving/false for copying
         * @returns {Promise<boolean>} boolean
         * @memberOf s4
         */
        async confirmAction(handles, t, toMove) {
            const tNode = M.getNodeByHandle(t);

            if (!tNode || tNode.h === M.RubbishID) {
                return true;
            }

            const tType = s4.kernel.getS4NodeType(tNode);
            const tBucket = tType && this.getBucketNode(tNode, tType).h;
            const { n, s4Nodes, type, bucket, filecnt } = this.getS4Data(handles);

            // Confirm any actions for non-s4 items
            if (!n.length || !type && !tType) {
                return true;
            }

            // Confirm any action inside one bucket
            if (tType && bucket && bucket === tBucket) {
                return true;
            }

            // Deny copying/moving files to container
            if (tType === 'container' && filecnt) {
                msgDialog('warningb', '', l.s4_title_move_file_to_container);
                return false;
            }

            // Get confirmation message data
            const { title, message, cfgName } = this.getConfirmationMessage({
                action: toMove ? 'move' : 'copy', n, s4Nodes, type, tNode, tType
            });

            // Show confiormation dialog
            if (title && message && !mega.config.get(cfgName)) {
                return asyncMsgDialog(
                    `confirmation:!^${toMove ? l[62] : l[63]}!${l[82]}`,
                    null,
                    title,
                    message,
                    null,
                    cfgName
                );
            }

            // Confirm action other actions
            return true;
        },

        /**
         * Getting nodes, S4 type,S4 nodes, bucket handle, file count
         * @param {Array|String} handles Array of node handles
         * @returns {Object} Nodes, s4 nodes, s4 type, bucket handle, filecnt
         * @memberOf s4
         */
        getS4Data(handles = []) {
            const n = [];
            const s4Nodes = [];
            let bucket = false;
            let filecnt = 0;
            let type = false;

            if (typeof handles === 'string') {
                handles = [handles];
            }

            for (let i = handles.length; i--;) {
                const node = M.getNodeByHandle(handles[i]);
                let bh = false;
                let t = false;

                if (!node) {
                    continue;
                }

                if (node.t === 0) {
                    filecnt++;
                }
                n.push(node);

                if (!(t = s4.kernel.getS4NodeType(node))) {
                    continue;
                }

                s4Nodes.push(node);
                type = type && type !== t ? 'items' : t;

                if ((bh = this.getBucketNode(node, t).h)) {
                    bucket = bucket && bucket !== bh ? 'multiple' : bh;
                }
            }

            return { n, s4Nodes, type, bucket, filecnt };
        },

        /**
         * Getting message for confirmation dialog when copying/moving from/to s4
         * @param {Object} data Nodes, S4 nodes, types, action name
         * @returns {Object} title, message, cfgName
         * @memberOf s4
         */
        getConfirmationMessage(data = {}) {
            const { action, n, type, s4Nodes, tNode, tType } = data;

            let helpUrl = `${l.mega_help_host}/megas4/s4-buckets/move-bucket`;
            let title = '';
            let message = '';
            let cfgName = '';
            let suffix = '';

            // Get number of S4 nodes only
            if (s4Nodes.length > 1) {
                suffix =  '_plural';
            }

            // Files and folders to a container
            if (tType === 'container') {
                cfgName = type ? 'skips4tos4' : 'skipcdtos4';
                suffix = n.length > 1 ? '_plural' : ''; // Get number of all nodes
                helpUrl = 'https://mega.io/privacy';

                // Folders to a container
                title = l[`s4_title_${ action }_folder_to_container${ suffix }`];
                message = l[`s4_warn_copy_move_folder_to_container${ suffix }`];
            }
            // To S4 bucket or bucket-child
            else if (tType) {
                cfgName = 'skips4tos4';

                // Buckets to another bucket
                if (type === 'bucket') {
                    title = l[`s4_title_${ action }_bucket_to_bucket${ suffix }`];
                    message = l[`s4_warn_copy_move_bucket_to_bucket${ suffix }`];
                }
                // Objects to another bucket
                else if (type === 'object') {
                    title = l[`s4_title_${ action }_object_to_bucket${ suffix }`];
                    message = l[`s4_warn_${ action }_object_to_bucket${ suffix }`];
                }
                // Multiple items to another bucket
                else if (type) {
                    title = l[`s4_title_${ action }_s4_items_to_bucket${ suffix }`];
                    message = l[`s4_warn_${ action }_s4_items_to_bucket${ suffix }`];
                }
                // Files/folders from Cloud drive to a bucket
                else {
                    cfgName = 'skipcdtos4';
                    suffix = n.length > 1 ? '_plural' : ''; // Get number of all nodes
                    helpUrl = 'https://mega.io/privacy';

                    title = l[`s4_title_${ action }_items_to_bucket`];
                    message = l[`s4_warn_${ action }_items_to_bucket${ suffix }`];
                }
            }
            // From Object storage to Cloud drive
            else {
                cfgName = 'skips4tocd';

                // Move Buckets to Cloud drive
                if (type === 'bucket') {
                    if (action === 'move') {
                        title = l[`s4_title_${ action }_bucket_to_cd${ suffix }`];
                        message = l[`s4_warn_copy_move_bucket_to_cd${ suffix }`];
                    }
                }
                // Objects or sub-folders to Cloud drive
                else if (type === 'object' || type === 'bucket-child' && s4Nodes.length === 1) {
                    title = l[`s4_title_${ action }_object_to_cd${ suffix }`];
                    message = l.s4_warn_copy_move_items_to_cd;
                }
                // Multiple items to Cloud drive
                else if (type) {
                    title = l[`s4_title_${ action }_items_to_cd_plural`];
                    message = l.s4_warn_copy_move_items_to_cd;
                }
            }

            title = title.replace('%1', n[0].name).replace('%2', tNode.name);
            message = escapeHTML(message)
                .replace('[A]', `<a class="clickurl" target="_blank" href="${ helpUrl }">`)
                .replace('[/A]', '</a>')
                .replace('%1', n[0].name).replace('%2', tNode.name);

            return { title, message, cfgName };
        },

        /**
         * Getting containers size and objects/folders number
         * @returns {Object} object
         * @memberOf s4
         */
        getStorageData() {
            const cn = this.getContainersList();
            const data = {
                ts: 0,
                tf:  0,
                td: cn.length
            };

            for (let i = 0; i < cn.length; i++) {
                data.ts += cn[i].tb;
                data.tf += cn[i].tf;
                data.td += cn[i].td;
            }

            return data;
        },

        /**
         * Getting special path for S4 subpages except Container.
         * Unlike M.getPath, when this function used for bucket sub-folders, it returns
         * path only what url contains, not complete tree path for the current folder.
         * @param {String} urlPath url path
         * @returns {Array} array
         * @memberOf s4
         */
        getS4SubPath(urlPath) {
            const pathArray = ['s4'];
            const pathUris = urlPath.split('/');
            const max3Types = ['keys', 'policies', 'users', 'groups']; // These subpages only can have 3 level
            const max = max3Types.includes(pathUris[1]) ? 2 : 1;

            for (let i = 0; i < pathUris.length; i++) {
                if (pathUris[i]) {
                    pathArray.unshift(pathUris[i]);
                }
                if (i === max) {
                    break;
                }
            }

            return pathArray;
        },

        validateS4Url(urlPath) {
            const allowedPages = new Set(['keys', 'policies', 'users', 'groups']);
            const path = M.getPath(urlPath).reverse();
            const bucket = this.getBucketNode(path[1]);

            if (path[0] !== 's4' || bucket) {
                return bucket.p ? `${bucket.p}/${path[path.length - 1]}` : false;
            }

            if (path.length > 2 && !(allowedPages.has(path[2]) || M.d[path[2]])) {
                return path[1];
            }

            if (path.length > 2 && !allowedPages.has(path[2])) {
                return `${path[1]}/${path[path.length - 1]}`;
            }

            return path.slice(1).join('/');
        },

        renderContainerTree(dialog, sSubMap) {
            const wrapperClass = typeof dialog === 'string' && dialog || 'js-s4-tree-panel';
            const treeWrap = document.querySelector(`.${wrapperClass}`);
            const cn = this.getContainersList();
            const prefix = dialog ? 'mc' : '';
            let treeNode = treeWrap.querySelector('.s4 .tree');

            const createItem = (node, id, name, icon, staticItem, eventId) => {
                const itemWrap = mCreateElement('li', {
                    'class': staticItem ? 's4-static-item' : 's4-item',
                    'id': `${prefix}treeli_${id}`
                }, node);

                const itemNode = mCreateElement('span', {
                    'class': `nw-fm-tree-item${M.tree[id] || M.tree.s4[id] ? ' contains-folders' : ''}`,
                    'id': `${prefix}treea_${id}`,
                    'data-eventid': eventId,
                }, itemWrap);
                mCreateElement('span', {'class': 'nw-fm-tree-arrow'}, itemNode);
                mCreateElement('span', {
                    'class': `nw-fm-tree-icon-wrap sprite-fm-mono ${icon}`
                }, itemNode).textContent = name;

                return itemWrap;
            };

            if (dialog !== undefined) {
                treeNode.textContent = '';
            }

            const treeClone = treeNode.cloneNode(true);
            treeNode.textContent = '';

            // Show container if multiple containers
            if (cn.length > 1) {
                treeNode = mCreateElement('ul', {'id': `${prefix}treesub_s4`}, treeNode);
            }

            for (let i = 0; i < cn.length; i++) {
                const cnNode = treeClone.querySelector(
                    `#${prefix}tree${cn.length === 1 ? 'sub' : 'li'}_${cn[i].h}`
                );

                if (cnNode) {
                    treeNode.appendChild(cnNode);
                    M.buildtree({h: cn[i].h}, dialog, 's4', sSubMap);
                    continue;
                }

                let wrapNode = treeNode;

                if (cn.length > 1) {
                    wrapNode = createItem(wrapNode, cn[i].h, cn[i].name, 'icon-bucket-triangle-thin-outline');
                }

                wrapNode = mCreateElement('ul', {
                    'data-s4': cn[i].h,
                    'id': `${prefix}treesub_${cn[i].h}`,
                }, wrapNode);

                if (!dialog) {
                    createItem(wrapNode, `${cn[i].h}_keys`, l.s4_keys, 'icon-key-01-thin-outline', true, 500637);
                    createItem(
                        wrapNode, `${cn[i].h}_policies`, l.s4_policies, 'icon-shield-thin-outline', true, 500638
                    );
                    createItem(wrapNode, `${cn[i].h}_groups`, l.s4_groups, 'icon-users-thin-outline', true, 500639);
                    createItem(wrapNode, `${cn[i].h}_users`, l.s4_users, 'icon-user-thin-outline', true, 500640);
                }

                M.buildtree({h: cn[i].h}, dialog, 's4', sSubMap);
            }
        },

        renderEndpointsData($wrapper) {

            const parentNode = $wrapper && $wrapper.length && $wrapper[0];

            if (!parentNode) {
                return false;
            }

            // Static endpoints data for now
            const endpoints = [
                [
                    'eu-central-1.s4.mega.io',
                    l.location_amsterdam,
                    'Amsterdam'
                ],
                [
                    'eu-central-2.s4.mega.io',
                    l.location_bettembourg,
                    'Bettembourg'
                ],
                [
                    'ca-central-1.s4.mega.io',
                    l.location_montreal,
                    'Montreal'
                ],
                [
                    'ca-west-1.s4.mega.io',
                    l.location_vancouver,
                    'Vancouver'
                ]
            ];

            const tableNode = parentNode.querySelector('.js-endpoints-table');
            const tipsNode = parentNode.querySelector('.js-endpoints-desc');
            let rowNode = null;

            if (!tableNode || !tipsNode) {
                return false;
            }

            tableNode.textContent = '';
            tipsNode.textContent = '';

            // Create table header
            rowNode = mCreateElement('tr', undefined, tableNode);
            mCreateElement('th', undefined, rowNode).textContent = l.s4_endpoint_header;
            mCreateElement('th', undefined, rowNode).textContent = l[17818];
            mCreateElement('th', undefined, rowNode);

            // Create enpoint rows
            for (const item of endpoints) {
                let subNode = null;

                // Create table header
                rowNode = mCreateElement('tr', null, tableNode);
                subNode = mCreateElement('td', null, rowNode);
                mCreateElement('span', null, subNode).textContent = `s3.${item[0]}`;
                mCreateElement('td', null, rowNode).textContent = item[1];
                subNode = mCreateElement('td', null, rowNode);

                // Create copy to clipboard button
                subNode = mCreateElement('button', {
                    'class': 'mega-button small action copy',
                    'data-url': `s3.${item[0]}`,
                    'data-location': item[2]
                }, subNode);
                mCreateElement('i', { class: 'sprite-fm-mono icon-copy' }, subNode);
            }

            // Fill URL exapmles in the tips
            mCreateElement('li', undefined, tipsNode).append(parseHTML(l.s4_s3_prefix_usage));
            mCreateElement('li', undefined, tipsNode).append(parseHTML(
                l.s4_iam_prefix_usage.replace('%1', `iam.${endpoints[0][0]}`)
            ));

            // Copy to clipboard buttons
            $('.mega-button.copy', parentNode).rebind('click.copyUrl', (e) => {
                if ($.dialog === 's4-managed-setup') {
                    // Copy endpoints btn evt
                    eventlog(500582, JSON.stringify([e.currentTarget.dataset.location]));
                }

                copyToClipboard(e.currentTarget.dataset.url, l.s4_endpoint_copied, 'hidden');
            });
        },

        /**
         * Set node multiple text in order to avoid long items name using all the container space
         * The purpose is to have following representations in the UI
         * - item1
         * - item1 and 3 more
         * - item_very_long_s... and 2 more
         *
         * The ellipsis in the item name overflow is managed by CSS (container size is resizable)
         *
         * The second part "and 2 more" width depends on the language displayed in the UI. This is
         * why its width is calculated (getWidthFromText) since we cannot know it beforehand
         *
         * @param {Object} node DOM element
         * @param {Object} obj Contains list of items
         * @param {String} key item name key
         * @param {String} label internationalization label
         */
        setNodeMultipleText(node, obj, key, label) {
            const mText = composeMultipleText(obj, key, label);
            const html = mText.toHtml();
            if (node.textContent !== mText.toString()) {
                if (html) {
                    $(node).safeHTML(html);
                }
                else {
                    $(node).text('');
                }
                const span = node.querySelector('span');
                if (span && mText.length() > 1) {
                    const width = getWidthFromText(mText.toPartial(), '12px LatoWeb, sans-serif');
                    span.style.maxWidth = `calc(100% - ${width}px)`;
                }
            }
        },

        /**
         * Returns the width of the node in pixels
         * @param {Object} node HTML DOM node
         * @returns {Number} width of the node in pixels
         */
        getNodeWidth(node) {
            return getComputedStyle(node).width.replace('px', '') | 0;
        }
    });
});
