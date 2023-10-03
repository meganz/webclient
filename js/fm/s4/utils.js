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
            return M.tree.s4 && Object.keys(M.tree.s4).map(h => M.d[h]).filter(n => n && n.s4
                && n.p === M.RootID && s4.kernel.getS4NodeType(n) === 'container') || [];
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

            if (path[0] !== 's4' || s4.kernel.getS4NodeType(path[1]) !== 'container') {
                const {p} = s4.kernel.getS4BucketForObject(path[1]);

                return p ? `${p}/${path[1]}` : false;
            }

            if (path.length > 2 && !(allowedPages.has(path[2]) || M.d[path[2]])) {
                return path[1];
            }

            if (path.length > 2 && !allowedPages.has(path[2])) {
                return `${path[1]}/${path[path.length - 1]}`;
            }

            return path.slice(1).join('/');
        },

        renderContainerTree(dialog) {
            const wrapperClass = typeof dialog === 'string' && dialog || 'js-s4-tree-panel';
            const s4Tree = document.querySelector(`.${wrapperClass}`);
            const expIcon = s4Tree.querySelector('.js-cloudtree-expander');
            const cn = this.getContainersList();
            const prefix = dialog ? 'mc' : '';
            let ctrTree = s4Tree.querySelector('.s4 .tree');

            const createItem = (node, id, name, icon, staticItem) => {
                const itemWrap = mCreateElement('li', {
                    'class': staticItem ? 's4-static-item' : 's4-item',
                    'id': `${prefix}treeli_${id}`
                }, node);

                const itemNode = mCreateElement('span', {
                    'class': `nw-fm-tree-item${M.tree[id] ? ' contains-folders' : ''}`,
                    'id': `${prefix}treea_${id}`
                }, itemWrap);
                mCreateElement('span', {'class': 'nw-fm-tree-arrow'}, itemNode);
                mCreateElement('span', {
                    'class': `nw-fm-tree-icon-wrap sprite-fm-mono ${icon}`
                }, itemNode).textContent = name;

                return itemWrap;
            };

            ctrTree.textContent = '';
            if (expIcon) {
                expIcon.classList.add('hidden');
            }

            // Show container if multiple containers
            if (cn.length > 1) {
                ctrTree = mCreateElement('ul', {'id': `${prefix}treesub_s4`}, ctrTree);
            }

            for (let i = 0; i < cn.length; i++) {
                if (cn.length > 1) {
                    ctrTree = createItem(ctrTree, cn[i].h, cn[i].name, 'icon-container-filled');
                }

                ctrTree = mCreateElement('ul', {
                    'data-s4': cn[i].h,
                    'id': `${prefix}treesub_${cn[i].h}`,
                }, ctrTree);

                if (!dialog) {
                    createItem(ctrTree, `${cn[i].h}_keys`, l.s4_keys, 'icon-key', true);
                    createItem(
                        ctrTree, `${cn[i].h}_policies`, l.s4_policies, 'icon-policy-filled', true
                    );
                    createItem(ctrTree, `${cn[i].h}_groups`, l.s4_groups, 'icon-contacts', true);
                    createItem(ctrTree, `${cn[i].h}_users`, l.s4_users, 'icon-user-filled', true);
                }

                if (expIcon) {
                    expIcon.classList.remove('hidden');
                }

                M.buildtree({h: cn[i].h}, dialog, 's4');
            }
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
