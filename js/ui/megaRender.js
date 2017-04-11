(function(scope) {
    "use strict"; /* jshint maxcomplexity:19, maxdepth:6 */

    var DYNLIST_ENABLED = !0;
    var logger;

    var viewModeTemplates = {
        'cloud-drive': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td width="50">' +
                        '<span class="grid-status-icon"></span>' +
                    '</td>' +
                    '<td>' +
                        '<span class="transfer-filtype-icon"></span>' +
                        '<span class="tranfer-filetype-txt"></span>' +
                    '</td>' +
                    '<td width="100" class="size"></td>' +
                    '<td width="130" class="type"></td>' +
                    '<td width="120" class="time"></td>' +
                    '<td width="62" class="grid-url-field own-data">' +
                        '<a class="grid-url-arrow"></a>' +
                        '<span class="data-item-icon"></span>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="file-block">' +
                '<span class="file-status-icon"></span>' +
                '<span class="data-item-icon"></span>' +
                '<span class="file-settings-icon"></span>' +
                '<span class="file-icon-area">' +
                    '<span class="block-view-file-type"><img/></span>' +
                '</span>' +
                '<span class="file-block-title"></span>' +
            '</a>'
        ],

        'shares': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td width="50">' +
                        '<span class="grid-status-icon"></span>' +
                    '</td>' +
                    '<td>' +
                        '<div class="shared-folder-icon"></div>' +
                        '<div class="shared-folder-info-block">' +
                            '<div class="shared-folder-name"></div>' +
                            '<div class="shared-folder-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="240">' +
                        '<div class="fm-chat-user-info todo-star ustatus">' +
                            '<div class="todo-fm-chat-user-star"></div>' +
                            '<div class="fm-chat-user"></div>' +
                            '<div class="nw-contact-status"></div>' +
                            '<div class="fm-chat-user-status"></div>' +
                            '<div class="clear"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="270">' +
                        '<div class="shared-folder-access"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow"></a>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="file-block folder">' +
                '<span class="file-status-icon"></span>' +
                '<span class="shared-folder-access"></span>' +
                '<span class="file-settings-icon"></span>' +
                '<span class="file-icon-area">' +
                    '<span class="block-view-file-type"></span>' +
                '</span>' +
                '<span class="shared-folder-info-block">' +
                    '<span class="shared-folder-name"></span>' +
                    '<span class="shared-folder-info"></span>' +
                '</span>' +
            '</a>'
        ],

        'contacts': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td>' +
                        '<div class="fm-chat-user-info todo-star">' +
                            '<div class="fm-chat-user"></div>' +
                            '<div class="contact-email"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="240">' +
                        '<div class="ustatus">' +
                            '<div class="nw-contact-status"></div>' +
                            '<div class="fm-chat-user-status"></div>' +
                            '<div class="clear"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="270">' +
                        '<div class="contacts-interation"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow"></a>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="file-block ustatus">' +
                '<span class="file-settings-icon"></span>' +
                '<span class="shared-folder-info-block">' +
                    '<span class="u-card-data">' +
                        '<span class="shared-folder-name"></span>' +
                        '<span class="nw-contact-status"></span>' +
                    '</span>' +
                    '<span class="shared-folder-info"></span>' +
                '</span>' +
            '</a>'
        ],

        'contact-shares': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td width="50">' +
                        '<span class="grid-status-icon"></span>' +
                    '</td>' +
                    '<td>' +
                        '<div class="shared-folder-icon"></div>' +
                        '<div class="shared-folder-info-block">' +
                            '<div class="shared-folder-name"></div>' +
                            '<div class="shared-folder-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="270">' +
                        '<div class="shared-folder-access"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow"></a>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="file-block folder">' +
                '<span class="file-status-icon"></span>' +
                '<span class="file-settings-icon"></span>' +
                '<span class="shared-folder-access"></span>' +
                '<span class="file-icon-area">' +
                    '<span class="block-view-file-type folder-shared"><img/></span>' +
                '</span>' +
                '<span class="file-block-title"></span>' +
            '</a>'
        ]
    };

    var viewModeContainers = {
        'cloud-drive': [
            '.grid-table.fm',
            '.fm-blocks-view.fm .file-block-scrolling'
        ],
        'contacts': [
            '.grid-table.contacts',
            '.contacts-blocks-scrolling'
        ],
        'shares': [
            '.shared-grid-view .grid-table.shared-with-me',
            '.shared-blocks-scrolling'
        ],
        'contact-shares': [
            '.contacts-details-block .grid-table.shared-with-me',
            '.fm-blocks-view.contact-details-view .file-block-scrolling'
        ]
    };

    mBroadcaster.once('startMega', function() {
        logger = MegaLogger.getLogger('MegaRender');

        var parser = function(template) {
            template = parseHTML(template).firstChild;

            if (template.nodeName === 'TABLE') {
                template = template.querySelector('tr');
            }

            return template;
        };

        // Convert html-templates to DOM nodes ready to use
        for (var section in viewModeTemplates) {
            if (viewModeTemplates.hasOwnProperty(section)) {
                var templates = viewModeTemplates[section];

                viewModeTemplates[section] = templates.map(parser);
            }
        }

        if (d) {
            logger.info('viewModeTemplates', viewModeTemplates);
        }
    });

    // Creates a new frozen object
    var freeze = function(obj) {
        var tmp = Object.create(null);

        Object.keys(obj)
            .forEach(function(name) {
                tmp[name] = obj[name];
            });

        return Object.freeze(tmp);
    };

    // Define object properties
    var define = function(target, property, value) {
        Object.defineProperty(target, property, {
            value : value
        });
    };

    /**
     * MegaRender
     * @param {Number} aViewMode I.e M.viewmode
     * @constructor
     */
    function MegaRender(aViewMode) {
        var renderer;
        var section = 'cloud-drive';

        if (M.currentdirid === 'shares') {

            section = 'shares';
        }
        else if (M.currentrootid === 'contacts'
                && M.currentdirid.length === 11) {

            section = 'contact-shares';
        }
        else if (M.currentdirid === 'contacts') {

            section = 'contacts';
        }

        if (section === 'cloud-drive') {

            if (!DYNLIST_ENABLED) {

                renderer = this.renderer['*'];
            }
        }
        else {
            this.chatIsReady = megaChatIsReady;
        }
        this.numInsertedDOMNodes = 0;

        define(this, 'viewmode',            aViewMode);
        define(this, 'nodeMap',             Object.create(null));
        define(this, 'buildDOMNode',        this.builders[section]);
        define(this, 'finalize',            this.finalizers[section]);
        define(this, 'template',            viewModeTemplates[section][this.viewmode]);
        define(this, 'initialize',          this.initializers[section] || this.initializers['*']);
        define(this, 'render',              renderer || this.renderer[section] || this.renderer['*']);
        define(this, 'getNodeProperties',   this.nodeProperties[section] || this.nodeProperties['*']);
        define(this, 'dynListCache',        []);
        define(this, 'section',             section);

        var maxItemsInView; // used for the dynlist
        Object.defineProperty(this, 'maxItemsInView', {
            set: function(value) {
                maxItemsInView = (value | 0);
            },
            get: function() {
                if (!maxItemsInView) {
                    if (this.viewmode) {
                        var width, height;
                        var $fm = $('.fm-blocks-view.fm');
                        if ($fm.hasClass('hidden')) {
                            width = (
                                window.innerWidth -
                                (fmconfig.leftPaneWidth || 200) -
                                48 /* left-icons-pane */
                            );
                            height = (
                                window.innerHeight - 72 /* top-head */
                            );
                        }
                        else {
                            width = $fm.width();
                            height = $fm.height();
                        }
                        var row = Math.floor(width / 140);
                        maxItemsInView = row * Math.ceil(height / 164) + row;
                    }
                    else {
                        maxItemsInView = Math.ceil($('.files-grid-view.fm').height() / 24 * 1.4);
                    }

                    if (this.logger) {
                        this.logger.debug('maxItemsInView', maxItemsInView);
                    }

                    // this is used in fm_thumbnails()
                    $.rmItemsInView = (maxItemsInView | 0);
                }

                return maxItemsInView || (Math.pow(2, 32) - 1);
            }
        });

        if (scope.d) {
            var options = {
                levelColors: {
                    'ERROR': '#DE1F35',
                    'DEBUG': '#837ACC',
                    'WARN':  '#DEBB1F',
                    'INFO':  '#1F85CE',
                    'LOG':   '#9B7BA6'
                }
            };
            define(this, 'logger', new MegaLogger(section, options, logger));
        }

        renderer = undefined;
    }
    MegaRender.prototype = Object.freeze({
        constructor: MegaRender,

        /**
         * Cleanup rendering layout.
         * Called prior to rendering the contents.
         *
         * @param {Boolean} aUpdate       Whether we're updating the list
         * @param {Object}  aNodeList     List of nodes to process, I.e M.v
         * @param {String}  aListSelector DOM query selector for the main list
         * @return {Number} The number of nodes in the current folder.
         */
        cleanupLayout: function(aUpdate, aNodeList, aListSelector) {
            // TODO: This is copied as-is from the former method and should be OOPized as well.

            if (this.logger) {
                console.time('MegaRender.cleanupLayout');
            }

            var lSel = aListSelector;
            this.cloudListSelector = lSel;

            $(lSel).unbind('jsp-scroll-y.dynlist');
            $(window).unbind('resize.dynlist');
            $(window).unbind('dynlist.flush');
            hideEmptyGrids();
            $.tresizer();

            if (!aUpdate) {
                sharedFolderUI();

                deleteScrollPanel('.contacts-blocks-scrolling', 'jsp');
                deleteScrollPanel('.contacts-details-block .file-block-scrolling', 'jsp');
                deleteScrollPanel('.file-block-scrolling', 'jsp');

                initOpcGridScrolling();
                initIpcGridScrolling();

                $('.grid-table tr').remove();
                $('.file-block-scrolling a').remove();
                $('.contacts-blocks-scrolling a').remove();

                $(lSel).show().parent().children('table').show();
            }

            // Draw empty grid if no contents.
            var nodeListLength = aNodeList.length;
            if (!nodeListLength) {
                if (M.RubbishID && M.currentdirid === M.RubbishID) {
                    $('.fm-empty-trashbin').removeClass('hidden');
                }
                else if (M.currentdirid === 'contacts') {
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
                    $('.fm-empty-contacts').removeClass('hidden');
                }
                else if (M.currentdirid === 'opc' || M.currentdirid === 'ipc') {
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[6196]);
                    $('.fm-empty-contacts').removeClass('hidden');
                }
                else if (String(M.currentdirid).substr(0, 7) === 'search/') {
                    $('.fm-empty-search').removeClass('hidden');
                }
                else if (M.currentdirid === M.RootID && folderlink) {
                    // FIXME: implement
                    /*if (!isValidShareLink()) {
                        $('.fm-invalid-folder').removeClass('hidden');
                    }
                    else*/ {
                        $('.fm-empty-folder-link').removeClass('hidden');
                    }
                }
                else if (M.currentdirid === M.RootID) {
                    $('.fm-empty-cloud').removeClass('hidden');
                }
                else if (M.currentdirid === M.InboxID) {
                    $('.fm-empty-messages').removeClass('hidden');
                }
                else if (M.currentdirid === 'shares') {
                    $('.fm-empty-incoming').removeClass('hidden');
                }
                else if (M.currentrootid === M.RootID
                        || M.currentrootid === M.RubbishID
                        || M.currentrootid === M.InboxID) {

                    $('.fm-empty-folder').removeClass('hidden');
                }
                else if (M.currentrootid === 'shares') {
                    M.emptySharefolderUI(lSel);
                }
                else if (M.currentrootid === 'contacts') {
                    $('.fm-empty-incoming.contact-details-view').removeClass('hidden');
                    $('.contact-share-notification').addClass('hidden');
                }
                else if (this.logger) {
                    this.logger.info('Empty folder not handled...', M.currentdirid, M.currentrootid);
                }
            }

            if (this.logger) {
                console.timeEnd('MegaRender.cleanupLayout');
            }

            return nodeListLength;
        },

        /**
         * Render layout.
         * @param {Boolean} aUpdate   Whether we're updating the list
         * @param {Object}  aNodeList Optional list of nodes to process
         * @return {Number} Number of rendered (non-cached) nodes
         */
        renderLayout: function(aUpdate, aNodeList) {
            var initData = null;
            var inViewNodes = this.numInsertedDOMNodes;

            if (this.logger) {
                console.time('MegaRender.renderLayout');
            }

            if (aNodeList) {
                this.nodeList = aNodeList;
            }

            this.container = document.querySelector(viewModeContainers[this.section][this.viewmode]);

            if (!this.container) {
                siteLoadError(l[1311], this);
                return 0;
            }

            if (this.container.nodeName === 'TABLE') {
                var tbody = this.container.querySelector('tbody');
                if (tbody) {
                    this.container = tbody;
                }
            }
            this.viewPixelSize = scope.innerWidth * scope.innerHeight;

            if (this.initialize) {
                initData = this.initialize(aUpdate, aNodeList);
                if (initData && initData.newNodeList) {
                    aNodeList = initData.newNodeList;
                }
            }

            for (var idx in aNodeList) {
                if (aNodeList.hasOwnProperty(idx)) {
                    var node = this.nodeList[idx];

                    if (node && node.h) {
                        var handle = node.h;
                        var domNode = this.getDOMNode(node, handle);

                        if (domNode) {
                            this.render(node, handle, domNode, idx | 0, aUpdate, initData);
                        }
                    }
                    else if (this.logger) {
                        this.logger.error('Invalid node.', idx, aNodeList[idx]);
                    }
                }
            }

            if (this.finalize) {
                this.finalize(aUpdate, aNodeList, initData);
            }

            if (this.logger) {
                console.timeEnd('MegaRender.renderLayout');
            }

            return this.numInsertedDOMNodes - inViewNodes;
        },

        /**
         * Retrieves a DOM node stored in the `nodeMap`,
         * creating it if it doesn't exists.
         *
         * @param {String} aNode   The ufs-node
         * @param {String} aHandle The ufs-node's handle
         */
        getDOMNode: function(aNode, aHandle) {
            if (!this.nodeMap[aHandle]) {
                var template = this.template.cloneNode(true);
                var properties = this.getNodeProperties(aNode, aHandle);

                // Set common attributes used by all builders
                template.setAttribute('id', aHandle);

                if (properties.tooltip) {
                    template.setAttribute('title', properties.tooltip.join("\n"));
                }
                this.addClasses(template, properties.classNames);

                // Construct a new DOM node, and store it for any further use.
                this.nodeMap[aHandle] = this.buildDOMNode(aNode, properties, template);
            }

            return this.nodeMap[aHandle];
        },

        /**
         * Add classes to DOM node
         * @param {Object} aDOMNode    DOM node to set class over
         * @param {Array}  aClassNames An array of classes
         */
        addClasses: function(aDOMNode, aClassNames) {
            // XXX: classList.add does support an array, but not in all browsers
            var len = aClassNames.length;
            while (len--) {
                aDOMNode.classList.add(aClassNames[len]);
            }
        },

        /**
         * Insert DOM Node.
         * @param {Object}  aNode      The ufs-node
         * @param {Number}  aNodeIndex The ufs-node's index at M.v
         * @param {Object}  aDOMNode   The DOM node to insert
         * @param {Boolean} aUpdate    Whether we're updating the list
         * @param {Object}  aDynCache  Dynamic list cache entry, optional
         */
        insertDOMNode: function(aNode, aNodeIndex, aDOMNode, aUpdate, aDynCache) {
            if (!aUpdate || !this.container.querySelector(aDOMNode.nodeName)) {
                // 1. if the current view does not have any nodes, just append it
                if (aDynCache) {
                    this.dynListCache.push(aDynCache);
                }
                else {
                    aNode.seen = true;
                    this.numInsertedDOMNodes++;
                    this.container.appendChild(aDOMNode);
                }
            }
            else {
                var domNode;
                var prevNode;
                var nextNode;

                if (document.getElementById(aNode.h)) {
                    aNode.seen = true;
                    return;
                }

                if (aDynCache) {
                    var cache = this.dynListCache;

                    if (aNode.t) {
                        // find the first folder in the cache and add it after
                        var x = 0;
                        var m = cache.length;
                        while (x < m && cache[x].isFolder) {
                            ++x;
                        }
                        cache.splice(x, 0, aDynCache);
                    }
                    else {
                        cache.push(aDynCache);
                    }
                    return;
                }

                if (aUpdate && (prevNode = this.nodeList[aNodeIndex - 1])
                        && (domNode = document.getElementById(prevNode.h))) {

                    // 2. if there is a node before the new node in the current view, add it after that node:
                    // this.logger.debug('// 2. ---', aNode.name, aNode);

                    domNode.parentNode.insertBefore(aDOMNode, domNode.nextElementSibling);
                }
                else if (aUpdate && (nextNode = this.nodeList[aNodeIndex + 1])
                        && (domNode = document.getElementById(nextNode.h))) {

                    // 3. if there is a node after the new node in the current view, add it before that node:
                    // this.logger.debug('// 3. ---', aNode.name, aNode);

                    domNode.parentNode.insertBefore(aDOMNode, domNode);
                }
                else if (aNode.t && (domNode = this.container.querySelector(aDOMNode.nodeName))) {
                    // 4. new folder: insert new node before the first folder in the current view
                    // this.logger.debug('// 4. ---', aNode.name, aNode);

                    domNode.parentNode.insertBefore(aDOMNode, domNode);
                }
                else {
                    // 5. new file: insert new node before the first file in the current view
                    // this.logger.debug('// 5. ---', aNode.name, aNode);

                    var file = this.container.querySelector(aDOMNode.nodeName + ':not(.folder)');
                    if (file) {
                        file.parentNode.insertBefore(aDOMNode, file);
                    }
                    else {
                        // 6. if this view does not have any files, insert after the last folder
                        // this.logger.debug('// 6. ---', aNode.name, aNode);

                        this.container.appendChild(aDOMNode);
                    }
                }
                aNode.seen = true;
                this.numInsertedDOMNodes++;
            }
        },

        /**
         * Generate a new dynlist cache entry.
         * @param {Object}  aNode      The ufs-node
         * @param {String}  aHandle    The ufs-node's handle
         * @param {Object}  aDOMNode   The DOM Node
         * @param {Number}  aNodeIndex The ufs-node's index in M.v
         */
        getCacheEntry: function(aNode, aHandle, aDOMNode, aNodeIndex) {
            var item = {
                domNode:    aDOMNode,
                isFolder:   aNode.t,
                nodeIndex:  aNodeIndex,
                nodeHandle: aHandle
            };

            return item;
        },

        /** Node properties collector */
        nodeProperties: freeze({
            /**
             * @param {Object}  aNode         The ufs-node
             * @param {String}  aHandle       The ufs-node's handle
             * @param {Boolean} aExtendedInfo Include info needed by builders
             */
            '*': function(aNode, aHandle, aExtendedInfo) {
                var props = {classNames: []};
                var share = M.getNodeShare(aNode);

                if (aNode.su) {
                    props.classNames.push('inbound-share');
                }

                if (aNode.t) {
                    props.type = l[1049];
                    props.icon = 'folder';
                    props.classNames.push('folder');
                }
                else {
                    props.classNames.push('file');
                    props.type = filetype(aNode.name);
                    props.size = bytesToSize(aNode.s);
                }
                props.name = aNode.name;

                if (missingkeys[aHandle] || share.down) {
                    props.icon = 'generic';
                    props.type = l[7381];// i.e. 'unknown'

                    props.tooltip = [];

                    // Taken down item
                    if (share.down) {
                        props.takenDown = true;
                        props.classNames.push('taken-down');
                        props.tooltip.push(aNode.t ? l[7705] : l[7704]);
                    }

                    // Undecryptable node
                    if (missingkeys[aHandle]) {
                        props.undecryptable = true;
                        props.classNames.push('undecryptable');

                        if (aNode.t) {
                            props.name = l[8686];// i.e. 'undecrypted folder'
                            props.tooltip.push(l[8595]);
                        }
                        else {
                            props.name = l[8687];// i.e. 'undecrypted file'
                            props.tooltip.push(l[8602]);
                        }
                    }
                }

                if (aExtendedInfo !== false) {

                    if (share) {
                        props.linked = true;
                        props.classNames.push('linked');
                    }

                    props.icon = fileIcon(aNode);

                    if (!this.viewmode) {
                        if (M.lastColumn && aNode.p !== "contacts") {
                            props.time = time2date(aNode[M.lastColumn] || aNode.ts);
                        }
                        else {
                            props.time = time2date(aNode.ts
                                || (aNode.p === 'contacts' && M.contactstatus(aHandle).ts));
                        }
                    }

                    // Colour label
                    if (aNode.lbl) {
                        var colourLabel = M.getColourClassFromId(aNode.lbl);
                        props.classNames.push('colour-label');
                        props.classNames.push(colourLabel);
                    }
                }

                return props;
            },
            'shares': function(aNode, aHandle, aExtendedInfo) {
                var avatar;
                var props = this.nodeProperties['*'].call(this, aNode, aHandle, false);

                props.userHandle = aNode.su || aNode.p;
                props.userName = M.getNameByHandle(props.userHandle);

                if (aNode.r === 1) {
                    props.accessRightsText = l[56];
                    props.accessRightsClass = 'read-and-write';
                }
                else if (aNode.r === 2) {
                    props.accessRightsText = l[57];
                    props.accessRightsClass = 'full-access';
                }
                else {
                    props.accessRightsText = l[55];
                    props.accessRightsClass = 'read-only';
                }

                if (this.viewmode) {
                    if (aExtendedInfo !== false) {
                        avatar = useravatar.contact(props.userHandle, 'nw-contact-avatar', 'span');
                    }
                }
                else {
                    var cs = M.contactstatus(aHandle);

                    if (cs.files === 0 && cs.folders === 0) {
                        props.shareInfo = l[782];// Empty Folder
                    }
                    else {
                        props.shareInfo = fm_contains(cs.files, cs.folders);
                    }

                    if (this.chatIsReady) {
                        props.onlineStatus = M.onlineStatusClass(aNode.presence ? aNode.presence : "unavailable");

                        if (props.onlineStatus) {
                            props.classNames.push(props.onlineStatus[1]);
                        }

                    }

                    if (aExtendedInfo !== false) {
                        avatar = useravatar.contact(props.userHandle, 'nw-contact-avatar');
                    }
                }

                if (avatar) {
                    props.avatar = parseHTML(avatar).firstChild;
                }

                // Colour label
                if (aNode.lbl && (aNode.su !== u_handle)) {
                    var colourLabel = M.getColourClassFromId(aNode.lbl);
                    props.classNames.push('colour-label');
                    props.classNames.push(colourLabel);
                }

                return props;
            },
            'contact-shares': function(aNode, aHandle, aExtendedInfo) {
                return this.nodeProperties.shares.call(this, aNode, aHandle, false);
            },
            'contacts': function(aNode, aHandle, aExtendedInfo) {
                var props = {classNames: []};

                if (this.logger) {
                    // We only care about active contacts
                    assert(Object(M.u[aHandle]).c === 1, 'Found non-active contact');
                }

                var avatar = useravatar.contact(aHandle, 'nw-contact-avatar');

                if (avatar) {
                    props.avatar = parseHTML(avatar).firstChild;
                }

                if (this.chatIsReady) {
                    props.onlineStatus = M.onlineStatusClass(aNode.presence ? aNode.presence : "unavailable");

                    if (props.onlineStatus) {
                        props.classNames.push(props.onlineStatus[1]);
                    }

                }

                props.classNames.push(aHandle);
                props.userName = M.getNameByHandle(aNode.u);

                return props;
            }
        }),

        /** DOM Node Builders */
        builders: freeze({
            /**
             * @param {Object} aNode       The ufs-node
             * @param {Object} aProperties The ufs-node properties
             * @param {Object} aTemplate   The DOM Node template
             */
            'cloud-drive': function(aNode, aProperties, aTemplate) {
                var tmp;

                if (aNode.fav) {
                    var selector = this.viewmode ? '.file-status-icon' : '.grid-status-icon';
                    aTemplate.querySelector(selector).classList.add('star');
                }

                if (this.viewmode) {
                    tmp = aTemplate.querySelector('.block-view-file-type');

                    if (aProperties.icon) {
                        tmp.classList.add(aProperties.icon);
                    }

                    aTemplate.querySelector('.file-block-title').textContent = aProperties.name;
                }
                else {
                    if (aProperties.linked) {
                        aTemplate.querySelector('.grid-url-field').classList.add('linked');
                    }

                    if (aProperties.size !== undefined) {
                        aTemplate.querySelector('.size').textContent = aProperties.size;
                    }
                    aTemplate.querySelector('.type').textContent = aProperties.type;
                    aTemplate.querySelector('.time').textContent = aProperties.time;
                    aTemplate.querySelector('.tranfer-filetype-txt').textContent = aProperties.name;

                    tmp = aTemplate.querySelector('.transfer-filtype-icon');
                    tmp.classList.add(aProperties.icon);
                }
                this.addClasses(tmp, aProperties.classNames);

                return aTemplate;
            },
            'shares': function(aNode, aProperties, aTemplate) {

                if (aNode.fav) {
                    var selector = this.viewmode ? '.file-status-icon' : '.grid-status-icon';
                    aTemplate.querySelector(selector).classList.add('star');
                }

                aTemplate.querySelector('.shared-folder-name').textContent = aProperties.name;

                var tmp = aTemplate.querySelector('.shared-folder-access');
                tmp.classList.add(aProperties.accessRightsClass);

                if (aProperties.avatar) {
                    var avatar = this.viewmode ? '.shared-folder-info-block' : '.fm-chat-user-info';
                    avatar = aTemplate.querySelector(avatar);

                    avatar.parentNode.insertBefore(aProperties.avatar, avatar);
                }

                if (this.viewmode) {

                    if (aProperties.icon) {
                        aTemplate.querySelector('.block-view-file-type').classList.add(aProperties.icon);
                    }

                    aTemplate.querySelector('.shared-folder-info').textContent = 'by ' + aProperties.userName;
                }
                else {
                    tmp.textContent = aProperties.accessRightsText;

                    tmp = aTemplate.querySelector('.fm-chat-user-info');
                    tmp.classList.add(aProperties.userHandle);
                    if (aProperties.onlineStatus) {
                        tmp.classList.add(aProperties.onlineStatus[1]);
                    }

                    tmp = aTemplate.querySelector('.fm-chat-user-status');
                    tmp.classList.add(aProperties.userHandle);
                    if (aProperties.onlineStatus) {
                        tmp.textContent = aProperties.onlineStatus[0];
                    }

                    aTemplate.querySelector('.fm-chat-user').textContent = aProperties.userName;
                    aTemplate.querySelector('.shared-folder-info').textContent = aProperties.shareInfo;
                }

                return aTemplate;
            },
            'contact-shares': function(aNode, aProperties, aTemplate) {

                var tmp = aTemplate.querySelector('.shared-folder-access');
                tmp.classList.add(aProperties.accessRightsClass);

                if (this.viewmode) {
                    aTemplate.querySelector('.file-block-title').textContent = aProperties.name;
                }
                else {
                    tmp.textContent = aProperties.accessRightsText;

                    aTemplate.querySelector('.shared-folder-name').textContent = aProperties.name;
                    aTemplate.querySelector('.shared-folder-info').textContent = aProperties.shareInfo;
                }

                return aTemplate;
            },
            'contacts': function(aNode, aProperties, aTemplate) {

                if (aProperties.avatar) {
                    var avatar = this.viewmode ? '.shared-folder-info-block' : '.fm-chat-user-info';
                    avatar = aTemplate.querySelector(avatar);

                    avatar.parentNode.insertBefore(aProperties.avatar, avatar);
                }

                if (this.viewmode) {

                    aTemplate.querySelector('.shared-folder-name').textContent = aNode.name;
                    aTemplate.querySelector('.shared-folder-info').textContent = aNode.m;
                }
                else {
                    var tmp = aTemplate.querySelector('.fm-chat-user-status');

                    tmp.classList.add(aNode.h);
                    if (aProperties.onlineStatus) {
                        tmp.textContent = aProperties.onlineStatus[0];
                    }

                    this.addClasses(aTemplate.querySelector('.ustatus'), aProperties.classNames);

                    aTemplate.querySelector('.contact-email').textContent = aNode.m;
                    aTemplate.querySelector('.fm-chat-user').textContent = aProperties.userName;
                    aTemplate.querySelector('.contacts-interation').classList.add('li_' + aNode.h);
                }

                return aTemplate;
            }
        }),

        /** DOM Node Renderers */
        renderer: freeze({
            /**
             * @param {Object}  aNode      The ufs-node
             * @param {String}  aHandle    The ufs-node's handle
             * @param {Object}  aDOMNode   The DOM Node
             * @param {Number}  aNodeIndex The ufs-node's index in M.v
             * @param {Boolean} aUpdate    Whether we're updating the list
             * @param {Object}  aUserData  Any data provided by initializers
             */
            '*': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                this.insertDOMNode(aNode, aNodeIndex, aDOMNode, aUpdate);
            },
            'contacts': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                this.renderer['*'].apply(this, arguments);
                getLastInteractionWith(aHandle);
            },
            'cloud-drive': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                var putInView;
                var cacheEntry = null;

                // if we're updating the list, prevent caching if a prev/next node is in view
                if (aUpdate && aUserData) {
                    var prevNode = this.nodeList[aNodeIndex - 1];
                    var nextNode = this.nodeList[aNodeIndex + 1];

                    putInView =
                        (prevNode && aUserData.inViewNodeList[prevNode.h]) ||
                        (nextNode && aUserData.inViewNodeList[nextNode.h]) ;
                }

                if (!putInView && this.numInsertedDOMNodes >= this.maxItemsInView) {
                    cacheEntry = this.getCacheEntry(aNode, aHandle, aDOMNode, aNodeIndex);
                }

                this.insertDOMNode(aNode, aNodeIndex, aDOMNode, aUpdate, cacheEntry);
            }
        }),

        /** Renderer initializers */
        initializers: freeze({
            /**
             * @param {Boolean} aUpdate   Whether we're updating the list
             * @param {Array}   aNodeList The list of ufs-nodes to process
             * @return {Array} a filtered list of nodes, if needed
             */
            '*': function(aUpdate, aNodeList) {
                if (!aUpdate && this.section !== 'contacts') {
                    M.setLastColumn(localStorage._lastColumn);
                }

                return null;
            },
            'cloud-drive': function(aUpdate, aNodeList) {
                var result = this.initializers['*'].apply(this, arguments);

                // If we're updating the list, no need to traverse the whole nodeList (M.v) again, filter out new nodes
                if (aUpdate && DYNLIST_ENABLED && aNodeList.length && Object(newnodes).length) {

                    var inView = [];
                    var newNodes = [];
                    var nodeIndex = [];

                    var objMap = newnodes
                        .map(function(n) {
                            return n.h;
                        })
                        .reduce(function(obj, value) {
                            obj[value] = 1;
                            return obj;
                        }, {});

                    for (var idx in aNodeList) {
                        if (aNodeList.hasOwnProperty(idx)) {
                            if (objMap[aNodeList[idx].h]) {
                                newNodes[idx] = aNodeList[idx];
                            }
                            if (aNodeList[idx].seen) {
                                inView[aNodeList[idx].h] = 1;
                            }
                            nodeIndex[aNodeList[idx].h] = idx;
                        }
                    }

                    if (newNodes.length) {
                        var cache = this.dynListCache;
                        var len = cache.length;

                        while (len--) {
                            if (!nodeIndex[cache[len].nodeHandle]) {
                                if (this.logger) {
                                    this.logger.error('Cached node not found.', len, cache[len].nodeHandle);
                                }
                            }
                            else {
                                cache[len].nodeIndex = nodeIndex[cache[len].nodeHandle];
                            }
                        }

                        result = Object(result);
                        result.newNodeList = newNodes;
                        result.inViewNodeList = inView;
                    }
                }

                return result;
            }
        }),

        /** Renderer finalizers */
        finalizers: freeze({
            /**
             * @param {Boolean} aUpdate   Whether we're updating the list
             * @param {Array}   aNodeList The list of ufs-nodes processed
             * @param {Object}  aUserData  Any data provided by initializers
             */
            'contact-shares': function(aUpdate, aNodeList, aUserData) {
                var contact = M.d[M.currentdirid];

                if (contact) {
                    $('.contact-share-notification')
                        .text(contact.name + ' shared the following folders with you:')
                        .removeClass('hidden');
                }
            },
            'cloud-drive': function(aUpdate, aNodeList, aUserData) {
                if (DYNLIST_ENABLED) {
                    if (this.logger) {
                        this.logger.info('dynListCache %d/%d (%d)',
                            this.dynListCache.length,
                            Object.keys(this.nodeMap).length,
                            this.numInsertedDOMNodes);
                    }

                    if (aUpdate) {

                        if (aUserData && aUserData.newNodeList) {

                            // If we just updated the list, re-sort the cached
                            // entries based on the nodeIndex (relative to M.v)
                            this.dynListCache.sort(function(a, b) {
                                return a.nodeIndex - b.nodeIndex;
                            });
                        }
                    }

                    var self = this;
                    var lSel = this.cloudListSelector;

                    var flushCachedNodes = function(aFlushCount) {
                        var entries = self.dynListCache.splice(0, aFlushCount || self.dynListCache.length);

                        if (self.logger) {
                            self.logger.debug('Flushing cached nodes...',
                                entries.length, self.dynListCache.length);
                        }

                        if (entries.length) {
                            var nodeList = self.nodeList;
                            var $container = $(self.container);

                            if (self.viewmode) {
                                $container = $container.data('jsp');

                                if (!$container) {
                                    if (self.logger) {
                                        self.logger.error('JSP Not Found...', self);
                                    }
                                    return;
                                }
                                $container = $container.getContentPane();
                            }

                            for (var idx in entries) {
                                if (entries.hasOwnProperty(idx)) {
                                    var node = nodeList[entries[idx].nodeIndex];

                                    // Set the `seen` flag for thumbnail retrieval.
                                    if (node && node.h === entries[idx].nodeHandle) {
                                        node.seen = true;
                                    }
                                    else {
                                        if (self.logger) {
                                            self.logger.warn('desync cached node...', entries[idx].nodeHandle);
                                        }

                                        for (var k in nodeList) {
                                            if (nodeList[k].h === entries[idx].nodeHandle) {
                                                nodeList[k].seen = true;
                                                break;
                                            }
                                        }
                                    }

                                    self.numInsertedDOMNodes++;
                                    $container.append(entries[idx].domNode);
                                }
                            }

                            // Delayed M.rmSetupUI() call to bind mouse events to newly inserted nodes
                            delay('dynlist.flush', M.rmSetupUI.bind(M), 750);
                            $(window).trigger('resize');
                        }
                        else {
                            // No more cached entries found, thus unbind jScrollPane listener.
                            $(lSel).unbind('jsp-scroll-y.dynlist');
                        }
                    };

                    $(window).rebind('dynlist.flush', function() {
                        if (self.dynListCache.length) {
                            flushCachedNodes();
                        }
                    });

                    if (this.dynListCache.length) {

                        // Listen for jScrollPane events triggered when scrolling to the bottom
                        $(lSel).rebind('jsp-scroll-y.dynlist', function(ev, pos, atTop, atBottom) {
                            if (atBottom) {
                                flushCachedNodes(self.maxItemsInView);
                            }
                        });

                        var cdid = M.currentdirid;
                        var viewmode = M.viewmode;
                        $(window).rebind("resize.dynlist", SoonFc(function() {
                            if (cdid !== M.currentdirid || viewmode !== M.viewmode) {
                                return;
                            }

                            // on resizing, clear the maxItemsInView
                            if (self.viewPixelSize !== (scope.innerWidth * scope.innerHeight)) {
                                self.maxItemsInView = null;
                                self.viewPixelSize = (scope.innerWidth * scope.innerHeight);
                            }

                            // check if pending cached entries
                            if (self.dynListCache.length) {

                                // if the scrollbar is not visible
                                if (!$(lSel).find('.jspDrag:visible').length) {
                                    var num = self.maxItemsInView;

                                    // flush nodes to fill remaining view
                                    num -= self.container.querySelectorAll(self.template.nodeName).length;

                                    if (num > 0) {
                                        flushCachedNodes(num);
                                    }
                                }
                            }
                            else {
                                $(window).unbind('resize.dynlist');
                            }
                        }));
                    }

                    aNodeList = aUserData = undefined;
                }
            }
        }),

        toString: function() {
            return '[MegaRender:' + this.section + ':' + this.viewmode + ']';
        }
    });

    define(scope, 'MegaRender', Object.freeze(MegaRender));
})(this);
