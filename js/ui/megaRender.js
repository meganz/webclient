(function(scope) {
    "use strict"; /* jshint maxcomplexity:19, maxdepth:6 */

    var DYNLIST_ENABLED = true;

    var logger;

    var viewModeTemplates = {
        'cloud-drive': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td megatype="fav" >' +
                        '<span class="grid-status-icon"></span>' +
                    '</td>' +
                    '<td megatype="fname">' +
                        '<span class="transfer-filetype-icon"><img/></span>' +
                        '<span class="tranfer-filetype-txt"></span>' +
                    '</td>' +
                    '<td megatype="label" class="label"></td>' +
                    '<td megatype="size" class="size"></td>' +
                    '<td megatype="type" class="type"></td>' +
                    '<td megatype="timeAd" class="time ad"></td>' +
                    '<td megatype="timeMd" class="time md"></td>' +
                    '<td megatype="versions" class="hd-versions"></td>' +
                    '<td megatype="extras" class="grid-url-field own-data">' +
                        '<a class="grid-url-arrow"></a>' +
                        '<span class="versioning-indicator">' +
                            '<i class="small-icon icons-sprite grey-clock"></i>' +
                        '</span>' +
                        '<span class="data-item-icon"></span>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="data-block-view">' +
                '<span class="data-block-bg ">' +
                    '<span class="data-block-indicators">' +
                        '<span class="file-status-icon indicator"></span>' +
                        '<span class="versioning-indicator">' +
                            '<i class="small-icon icons-sprite grey-clock"></i>' +
                        '</span>' +
                        '<span class="data-item-icon indicator"></span>' +
                    '</span>' +
                    '<span class="block-view-file-type"><img/></span>' +
                    '<span class="file-settings-icon"></span>' +
                    '<div class="video-thumb-details">' +
                        '<i class="small-icon small-play-icon"></i>' +
                        '<span>00:00</span>' +
                    ' </div>' +
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
                    '<td width="100">' +
                        '<div class="shared-folder-size"></div>' +
                    '</td>' +
                    '<td width="200">' +
                        '<div class="shared-folder-access"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow"></a>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="data-block-view folder">' +
                '<span class="data-block-bg">' +
                    '<span class="data-block-indicators">' +
                       '<span class="file-status-icon indicator"></span>' +
                       '<span class="shared-folder-access indicator"></span>' +
                    '</span>' +
                    '<span class="block-view-file-type"></span>' +
                    '<span class="file-settings-icon"></span>' +
                    '<div class="video-thumb-details">' +
                        '<i class="small-icon small-play-icon"></i>' +
                        '<span>00:00</span>' +
                    '</div>' +
                '</span>' +
                '<span class="shared-folder-info-block">' +
                    '<span class="shared-folder-name"></span>' +
                    '<span class="shared-folder-info"></span>' +
                '</span>' +
            '</a>'
        ],

        'out-shares': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td width="50">' +
                        '<span class="grid-status-icon"></span>' +
                    '</td>' +
                    '<td>' +
                        '<div class="shared-folder-icon medium-file-icon folder-shared"></div>' +
                        '<div class="shared-folder-info-block">' +
                            '<div class="shared-folder-name"></div>' +
                            '<div class="shared-folder-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="240" class="simpletip-parent">' +
                        '<div class="fm-chat-users-wrapper">' +
                            '<div class="fm-chat-users"></div>' +
                            '<div class="fm-chat-users-other"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="100">' +
                        '<div class="shared-folder-size"></div>' +
                    '</td>' +
                    '<td width="200">' +
                        '<div class="last-shared-time"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow"></a>' +
                    '</td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="data-block-view folder">' +
                '<span class="data-block-bg">' +
                    '<span class="data-block-indicators">' +
                       '<span class="file-status-icon indicator"></span>' +
                    '</span>' +
                    '<span class="block-view-file-type"></span>' +
                    '<span class="file-settings-icon"></span>' +
                    '<div class="video-thumb-details">' +
                        '<i class="small-icon small-play-icon"></i>' +
                        '<span>00:00</span>' +
                    ' </div>' +
                '</span>' +
                '<span class="shared-folder-info-block">' +
                    '<span class="shared-folder-name"></span>' +
                    '<span class="shared-contact-info"></span>' +
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
                        '<div class="contact-chat-buttons">' +
                            '<div class="default-white-button inline start-conversation">' +
                                '<i class="small-icon conversations dark"></i>' +
                                '<span></span>' +
                            '</div>' +
                            '<div class="default-white-button inline short start-audio-call">' +
                                '<i class="small-icon audio-call dark"></i>' +
                            '</div>' +
                            '<div class="default-white-button inline short start-video-call">' +
                                '<i class="small-icon video-call dark"></i>' +
                            '</div>' +
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
            '<a class="data-block-view semi-big ustatus">' +
                '<span class="file-settings-icon"></span>' +
                '<span class="shared-folder-info-block">' +
                    '<span class="u-card-data overlayed">' +
                        '<span class="shared-folder-name"></span>' +
                        '<span class="nw-contact-status"></span>' +
                    '</span>' +
                    '<span class="shared-folder-info overlayed""></span>' +
                    '<span class="contact-chat-buttons">' +
                        '<span class="default-white-button inline start-conversation">' +
                            '<i class="small-icon conversations dark"></i>' +
                            '<span></span>' +
                        '</span>' +
                        '<span class="default-white-button inline short start-audio-call">' +
                            '<i class="small-icon audio-call dark"></i>' +
                        '</span>' +
                        '<span class="default-white-button inline short start-video-call">' +
                            '<i class="small-icon video-call dark"></i>' +
                        '</span>' +
                    '</span>' +
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
            '<a class="data-block-view folder">' +
                '<span class="data-block-bg">' +
                    '<span class="data-block-indicators">' +
                       '<span class="file-status-icon indicator"></span>' +
                       '<span class="shared-folder-access indicator"></span>' +
                    '</span>' +
                    '<span class="block-view-file-type folder-shared"><img/></span>' +
                    '<span class="file-settings-icon"></span>' +
                    '<div class="video-thumb-details">' +
                        '<i class="small-icon small-play-icon"></i>' +
                        '<span>00:00</span>' +
                    ' </div>' +
                '</span>' +
                '<span class="file-block-title"></span>' +
            '</a>'
        ]
    };

    var viewModeContainers = {
        'cloud-drive': [
            '.grid-table.fm',
            '.fm-blocks-view.fm .file-block-scrolling',
        ],
        'contacts': [
            '.grid-table.contacts',
            '.contacts-blocks-scrolling .content'
        ],
        'shares': [
            '.shared-grid-view .grid-table.shared-with-me',
            '.shared-blocks-scrolling'
        ],
        'out-shares': [
            '.out-shared-grid-view .grid-table.out-shares',
            '.out-shared-blocks-scrolling'
        ],
        'contact-shares': [
            '.contacts-details-block .grid-table.shared-with-me',
            '.fm-blocks-view.contact-details-view .file-block-scrolling'
        ]
    };

    var versionColumnPrepare = function(versionsNb, VersionsSize) {
        var versionsTemplate = '<div class="ver-col-container">' +
            '<div class="ver-nb">' + versionsNb + '</div>' +
            '<div class="ver-icon versioning">' +
            '<span class="versioning-indicator"><i class="small-icon icons-sprite grey-clock"></i></span>' +
            '</div>' +
            '<div class="ver-size">' +
            '<div class="ver-size-nb">' + bytesToSize(VersionsSize) + '</div>' +
            '</div>' +
            '</div>';

        // safe will remove any scripts
        return parseHTML(versionsTemplate).firstChild;
    };

    var classListMultiple = false;
    tryCatch(function() {
        var te = document.createElement("test");
        te.classList.add("foo", "bar");
        classListMultiple = te.classList.contains("bar");
    }, false);

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
        else if (M.currentdirid === 'out-shares') {

            section = 'out-shares';
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

        this.labelsColors = {
            'red': l[16223],
            'orange': l[16224],
            'yellow': l[16225],
            'green': l[16226],
            'blue': l[16227],
            'purple': l[16228],
            'grey': l[16229]
        };

        this.numInsertedDOMNodes = 0;

        define(this, 'viewmode',            aViewMode);
        define(this, 'nodeMap',             Object.create(null));
        define(this, 'buildDOMNode',        this.builders[section]);
        define(this, 'finalize',            this.finalizers[section]);
        define(this, 'template',            viewModeTemplates[section][this.viewmode]);
        define(this, 'initialize',          this.initializers[section] || this.initializers['*']);
        define(this, 'render',              renderer || this.renderer[section] || this.renderer['*']);
        define(this, 'getNodeProperties',   this.nodeProperties[section] || this.nodeProperties['*']);
        define(this, 'section',             section);
        this.versionColumnPrepare = versionColumnPrepare;

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

            if (!aUpdate) {
                M.hideEmptyGrids();
                $.tresizer();

                sharedFolderUI();
                deleteScrollPanel('.contacts-blocks-scrolling', 'jsp');
                deleteScrollPanel('.contacts-details-block .file-block-scrolling', 'jsp');
                deleteScrollPanel('.file-block-scrolling', 'jsp');
                deleteScrollPanel('.shared-blocks-scrolling', 'jsp');
                deleteScrollPanel('.out-shared-blocks-scrolling', 'jsp');

                initOpcGridScrolling();
                initIpcGridScrolling();

                $('.grid-table:not(.arc-chat-messages-block) tr').remove();
                $('.file-block-scrolling a').remove();
                $('.shared-blocks-scrolling a').remove();
                $('.out-shared-blocks-scrolling a').remove();
                $('.contacts-blocks-scrolling .content a').remove();

                // eslint-disable-next-line local-rules/jquery-replacements
                $(aListSelector).show().parent().children('table').show();
            }

            // Draw empty grid if no contents.
            var nodeListLength = aNodeList.length;
            if (!nodeListLength) {
                if (M.RubbishID && M.currentdirid === M.RubbishID) {
                    $('.fm-empty-trashbin').removeClass('hidden');
                    $('.fm-clearbin-button').addClass('hidden');
                }
                else if (M.currentdirid === 'contacts') {
                    $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
                    $('.fm-empty-contacts').removeClass('hidden');
                }
                else if (M.currentdirid === 'opc' || M.currentdirid === 'ipc') {
                    $('.contacts-tab-lnk.ipc[data-folder=' + M.currentdirid+ ']')
                        .removeClass('filled').find('span').text('');
                    $('.button.link-button.accept-all').addClass('hidden');
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
                    else {*/
                        $('.fm-empty-folder-link').removeClass('hidden');
                    /*} */
                }
                else if (M.currentdirid === M.InboxID) {
                    $('.fm-empty-messages').removeClass('hidden');
                }
                else if (M.currentrootid === M.RootID
                        || M.currentrootid === M.RubbishID
                        || M.currentrootid === M.InboxID) {
                    // If filter is empty show 'Your label filter did not match any documents'
                    if (M.currentLabelFilter) {
                        $('.fm-empty-filter').removeClass('hidden');
                    }
                    else if (M.currentdirid === M.RootID) {
                        $('.fm-empty-cloud').removeClass('hidden');
                    }
                    else if (M.currentrootid) {
                        $('.fm-empty-folder').removeClass('hidden');
                    }
                }
                else if (M.currentrootid === 'out-shares') {
                    if (M.currentdirid === 'out-shares') {
                        $('.fm-empty-outgoing').removeClass('hidden');
                    }
                    else {
                        $('.fm-empty-folder').removeClass('hidden');
                    }
                }
                else if (M.currentrootid === 'public-links') {
                    if (M.currentdirid === 'public-links') {
                        $('.fm-empty-public-link').removeClass('hidden');
                    }
                    else {
                        $('.fm-empty-folder').removeClass('hidden');
                    }
                }
                else if (M.currentrootid === 'shares') {
                    if (M.currentdirid === 'shares') {
                        $('.fm-empty-incoming').removeClass('hidden');
                    }
                    else {
                        M.emptySharefolderUI(aListSelector);
                    }
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
         * Recreates the container if detached from the DOM
         * @param {String} selector The affected DOM node selector
         */
        rebindLayout: function(selector) {
            if (this.container && this.container.parentNode === null) {
                if (this.logger) {
                    this.logger.debug('Container detached from the DOM...', [this.container]);
                }

                if ($(this.container).is(selector)) {
                    var container = document.querySelector(viewModeContainers[this.section][this.viewmode]);

                    if (!container) {
                        if (this.logger) {
                            this.logger.debug('Expected container is not yet re-attached...');
                        }

                        // TODO: ensure we don't run into an infinite loop...
                        delay('MegaRender:rebindLayout', this.rebindLayout.bind(this, selector));
                    }
                    else {
                        this.container = container;
                        M.initShortcutsAndSelection(container);

                        if (this.logger) {
                            this.logger.debug('rebindLayout completed.', [container]);
                        }
                    }
                }
                else if (this.logger) {
                    this.logger.debug('Not the expected selector...', selector);
                }
            }
        },

        /**
         * Render layout.
         * @param {Boolean} aUpdate   Whether we're updating the list
         * @param {Object}  aNodeList Optional list of nodes to process
         * @return {Number} Number of rendered (non-cached) nodes
         */
        renderLayout: function(aUpdate, aNodeList) {
            var initData = null;
            this.numInsertedDOMNodes = 0;

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

            if (this.initialize) {
                initData = this.initialize(aUpdate, aNodeList);
                if (initData && initData.newNodeList) {
                    aNodeList = initData.newNodeList;

                    // Got a new nodeList, cleanup cached DOM nodes.
                    var nodes = Object.values(aNodeList);
                    for (var i = nodes.length; i--;) {
                        delete this.nodeMap[nodes[i].h];
                    }
                }
            }

            if (!DYNLIST_ENABLED || this.section !== 'cloud-drive') {
                for (var idx = aNodeList.length; idx--;) {
                    var node = this.nodeList[idx];

                    if (node && node.h) {
                        var handle = node.h;
                        var domNode = this.getDOMNode(handle, node);

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

            if (DYNLIST_ENABLED) {
                return this.numInsertedDOMNodes;
            }
            else {
                return aNodeList.length;
            }
        },

        setDOMColumnsWidth: function(nodeDOM) {
            var sectionName = 'cloud';
            if (this.section !== 'cloud-drive') {
                sectionName = this.section;
            }
            // setting widths
            if (M && M.columnsWidth && M.columnsWidth[sectionName]) {
                var knownColumnsWidths = Object.keys(M.columnsWidth[sectionName]) || [];
                for (var col = 0; col < knownColumnsWidths.length; col++) {
                    var tCol = nodeDOM.querySelector('[megatype="' + knownColumnsWidths[col] + '"]');
                    if (tCol) {
                        if (typeof M.columnsWidth[sectionName][knownColumnsWidths[col]].curr === 'number') {
                            tCol.style.width = M.columnsWidth[sectionName][knownColumnsWidths[col]].curr + 'px';
                        }
                        else if (M.columnsWidth[sectionName][knownColumnsWidths[col]].currpx) {
                            tCol.style.width = M.columnsWidth[sectionName][knownColumnsWidths[col]].currpx + 'px';
                        }
                        else {
                            tCol.style.width = M.columnsWidth[sectionName][knownColumnsWidths[col]].curr || '';
                        }

                        if (M.columnsWidth[sectionName][knownColumnsWidths[col]].viewed) {
                            tCol.style.display = "";
                        }
                        else {
                            tCol.style.display = "none";
                        }
                    }
                }
            }
        },


        /**
         * Retrieves a DOM node stored in the `nodeMap`,
         * creating it if it doesn't exists.
         *
         * @param {String} aHandle The ufs-node's handle
         * @param {String} [aNode]   The ufs-node
         */
        getDOMNode: function(aHandle, aNode) {

            if (!this.nodeMap[aHandle] && (aNode = aNode || M.getNodeByHandle(aHandle))) {
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
         * Checks if a DOM node for that `aHandle` is created and cached in MegaRender.
         *
         * @param aHandle
         */
        hasDOMNode: function(aHandle) {
            return this.nodeMap[aHandle] ? true : false;
        },

        /**
         * Add classes to DOM node
         * @param {Object} aDOMNode    DOM node to set class over
         * @param {Array}  aClassNames An array of classes
         */
        addClasses: classListMultiple ? function(aDOMNode, aClassNames) {
            aDOMNode.classList.add.apply(aDOMNode.classList, aClassNames);
        } : function(aDOMNode, aClassNames) {
            var len = aClassNames.length;
            while (len--) {
                // XXX: classList.add does support an array, but not in all browsers
                aDOMNode.classList.add(aClassNames[len]);
            }
        },

        /**
         * Remove classes from DOM node
         * @param {Object} aDOMNode    DOM node to set class over
         * @param {Array}  aClassNames An array of classes
         */
        removeClasses: classListMultiple ? function(aDOMNode, aClassNames) {
            aDOMNode.classList.remove.apply(aDOMNode.classList, aClassNames);
        } : function(aDOMNode, aClassNames) {
            // XXX: classList.add does support an array, but not in all browsers
            var len = aClassNames.length;
            while (len--) {
                aDOMNode.classList.remove(aClassNames[len]);
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
                aNode.seen = true;
                this.numInsertedDOMNodes++;
                this.container.appendChild(aDOMNode);
            }
            else {
                var domNode;
                var prevNode;
                var nextNode;

                if (document.getElementById(aNode.h)) {
                    aNode.seen = true;
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
                    props.size = bytesToSize(aNode.tb || 0);
                }
                else {
                    props.classNames.push('file');
                    props.size = bytesToSize(aNode.s);
                    props.type = filetype(aNode, 0, 1);

                    if (aNode.fa && aNode.fa.indexOf(':8*') > 0) {
                        Object.assign(props, MediaAttribute(aNode).data);
                        props.codecs = MediaAttribute.getCodecStrings(aNode);
                    }
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
                        if (M.currentCustomView.type === 'public-links' && aNode.shares && aNode.shares.EXP) {
                            props.time = aNode.shares.EXP.ts ? time2date(aNode.shares.EXP.ts) : '';
                            props.mTime = aNode.mtime ? time2date(aNode.mtime) : '';
                        }
                        else if (aNode.p !== "contacts") {
                            // props.time = time2date(aNode[M.lastColumn] || aNode.ts);
                            props.time = time2date(aNode.ts);
                            props.mTime = aNode.mtime ? time2date(aNode.mtime) : '';
                        }
                        else {
                            props.time = time2date(aNode.ts
                                || (aNode.p === 'contacts' && M.contactstatus(aHandle).ts));
                            props.mTime = '';
                        }
                    }

                    // Colour label
                    if (aNode.lbl && !folderlink) {
                        var colourLabel = M.getLabelClassFromId(aNode.lbl);
                        props.classNames.push('colour-label');
                        props.classNames.push(colourLabel);
                        props.labelC = this.labelsColors[colourLabel];
                    }
                }

                return props;
            },
            'shares': function(aNode, aHandle, aExtendedInfo) {
                var avatar;
                var props = this.nodeProperties['*'].call(this, aNode, aHandle, false);

                props.userHandle = aNode.su || aNode.p;
                props.userName = M.getNameByHandle(props.userHandle);
                props.folderSize = bytesToSize(aNode.tb);

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
                        avatar = useravatar.contact(props.userHandle, '', 'span');
                    }
                }
                else {
                    props.shareInfo = fm_contains(aNode.tf, aNode.td);

                    if (this.chatIsReady) {
                        var contact = M.u[props.userHandle];
                        if (contact) {
                            props.onlineStatus = M.onlineStatusClass(
                                contact.presence ? contact.presence : "unavailable"
                            );
                        }
                    }

                    if (aExtendedInfo !== false) {
                        avatar = useravatar.contact(props.userHandle);
                    }
                }

                if (avatar) {
                    props.avatar = parseHTML(avatar).firstChild;
                }

                // Colour label
                if (aNode.lbl && !folderlink && (aNode.su !== u_handle)) {
                    var colourLabel = M.getLabelClassFromId(aNode.lbl);
                    props.classNames.push('colour-label');
                    props.classNames.push(colourLabel);
                }

                return props;
            },
            'out-shares': function(aNode, aHandle, aExtendedInfo) {
                var props = this.nodeProperties['*'].call(this, aNode, aHandle, false);
                props.lastSharedAt = 0;
                props.userNames = [];
                props.userHandles = [];
                props.avatars = [];
                for (var i in aNode.shares) {
                    if (i !== 'EXP') {
                        props.lastSharedAt = Math.max(props.lastSharedAt, aNode.shares[i].ts);
                        props.userNames.push(M.getNameByHandle(i));
                        props.userHandles.push(aNode.shares[i].u);
                    }
                }

                // Adding pending shares data
                for (var suh in M.ps[aNode.h]) {
                    if (M.ps[aNode.h] && M.opc[suh]) {
                        props.lastSharedAt = Math.max(props.lastSharedAt, M.ps[aNode.h][suh].ts);
                        props.userNames.push(M.opc[suh].m);
                        props.userHandles.push(suh);
                    }
                }

                props.userNames = props.userNames.sort();
                props.lastSharedAt = time2date(props.lastSharedAt);
                props.folderSize = bytesToSize(aNode.tb + (aNode.tvb || 0));

                if (this.viewmode) {
                    if (aExtendedInfo !== false) {
                        for (i = 0; i < props.userHandles.length && i < 4; i++) {
                            props.avatars.push(parseHTML(useravatar.contact(props.userHandles[i], '', 'span'))
                                .firstChild);
                        }
                    }
                }
                else {
                    props.shareInfo = fm_contains(aNode.tf, aNode.td);
                }

                // Colour label
                if (aNode.lbl && !folderlink && (aNode.su !== u_handle)) {
                    var colourLabel = M.getLabelClassFromId(aNode.lbl);
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
                var avatar;

                props.conversationText = l[7997];

                if (this.logger) {
                    // We only care about active contacts
                    assert(Object(M.u[aHandle]).c === 1, 'Found non-active contact');
                }

                if (M.viewmode === 0) {
                    avatar = useravatar.contact(aHandle);
                }
                else {
                    avatar = useravatar.contact(aHandle, 'medium-avatar');
                }

                if (avatar) {
                    props.avatar = parseHTML(avatar).firstChild;
                }

                if (this.chatIsReady) {
                    props.onlineStatus = M.onlineStatusClass(aNode.presence ? aNode.presence : false);

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
                var title = [];

                if (aNode.fav && !folderlink) {
                    var selector = this.viewmode ? '.file-status-icon' : '.grid-status-icon';
                    aTemplate.querySelector(selector).classList.add('star');
                }

                if (!aNode.t && aNode.tvf) {
                    aTemplate.classList.add('versioning');
                    var vTemplate = aTemplate.querySelector('.hd-versions');
                    if (vTemplate) {
                        vTemplate.appendChild(versionColumnPrepare(aNode.tvf, aNode.tvb || 0));
                    }
                }

                if (this.viewmode || String(aProperties.name).length > 78 || aProperties.playtime !== undefined) {
                    if (aProperties.width) {
                        title.push(aProperties.width + 'x' + aProperties.height + ' @' + aProperties.fps + 'fps');
                    }
                    if (aProperties.codecs) {
                        title.push(aProperties.codecs);
                    }
                    if (aNode.s) {
                        title.push(bytesToSize(aNode.s, 0));
                    }
                    if (aProperties.name) {
                        title.push(aProperties.name);
                    }
                }
                title = title.join(' ');

                if (this.viewmode) {
                    tmp = aTemplate.querySelector('.block-view-file-type');

                    if (aProperties.icon) {
                        tmp.classList.add(aProperties.icon);
                    }

                    if (aProperties.playtime !== undefined) {
                        aTemplate.querySelector('.data-block-bg').classList.add('video');
                        aTemplate.querySelector('.video-thumb-details span').textContent
                            = secondsToTimeShort(aProperties.playtime);
                    }

                    aTemplate.querySelector('.file-block-title').textContent = aProperties.name;
                    if (title) {
                        aTemplate.setAttribute('title', title);
                    }
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
                    aTemplate.querySelector('.time.md').textContent = aProperties.mTime;
                    aTemplate.querySelector('.label').textContent = aProperties.labelC || '';

                    tmp = aTemplate.querySelector('.tranfer-filetype-txt');
                    tmp.textContent = aProperties.name;
                    if (title) {
                        tmp.setAttribute('title', title);
                    }

                    tmp = aTemplate.querySelector('.transfer-filetype-icon');
                    tmp.classList.add(aProperties.icon);
                }
                this.addClasses(tmp, aProperties.classNames);

                return aTemplate;
            },
            'shares': function(aNode, aProperties, aTemplate) {

                var selector = this.viewmode ? '.file-status-icon' : '.grid-status-icon';

                if (!this.viewmode) {
                    aTemplate.querySelector(selector).classList.add(aProperties.accessRightsClass);
                }

                if (aNode.fav && !folderlink) {
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

                    aTemplate.querySelector('.shared-folder-info')
                        .textContent = l[17590].replace('%1', aProperties.userName);
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
                    aTemplate.querySelector('.shared-folder-size').textContent = aProperties.folderSize;
                }

                return aTemplate;
            },
            'out-shares': function(aNode, aProperties, aTemplate) {

                if (aNode.fav && !folderlink) {
                    var selector = this.viewmode ? '.file-status-icon' : '.grid-status-icon';
                    aTemplate.querySelector(selector).classList.add('star');
                }

                aTemplate.querySelector('.shared-folder-name').textContent = aProperties.name;

                if (this.viewmode) {
                    if (aProperties.avatars) {

                        var avatarElement;
                        var avatar = this.viewmode ? '.shared-folder-info-block' : '.fm-chat-user-info';
                        avatar = aTemplate.querySelector(avatar);

                        if (aProperties.avatars.length === 1) {
                            avatarElement = aProperties.avatars[0];
                        }
                        else {
                            avatarElement = document.createElement("div");
                            avatarElement.classList = 'multi-avatar multi-avatar-' + aProperties.avatars.length;

                            for (var i in aProperties.avatars) {
                                if (aProperties.avatars[i]) {
                                    aProperties.avatars[i].classList += ' avatar-' + i;
                                    avatarElement.appendChild(aProperties.avatars[i]);
                                }
                            }
                        }

                        avatar.parentNode.insertBefore(avatarElement, avatar);

                    }


                    if (aProperties.icon) {
                        aTemplate.querySelector('.block-view-file-type').classList.add(aProperties.icon);
                    }

                    var shareContactInfo = aTemplate.querySelector('.shared-contact-info');
                    shareContactInfo.textContent = escapeHTML(l[989]).replace('[X]', aProperties.userNames.length);
                    if (aProperties.userNames.length === 1) {
                        shareContactInfo.textContent = escapeHTML(l[990]);
                    }
                    else {
                        shareContactInfo.textContent = escapeHTML(l[989]).replace('[X]', aProperties.userNames.length);
                    }
                    shareContactInfo.classList += ' simpletip';
                    shareContactInfo.dataset.simpletip = aProperties.userNames.join(",[BR]");
                }
                else {
                    tmp = aTemplate.querySelector('.fm-chat-user-info');

                    var otherCount = 0;
                    var userNames = aProperties.userNames;
                    if (aProperties.userNames.length > 3) {
                        userNames = userNames.slice(0, 3);
                        otherCount = aProperties.userNames.length - 3;
                        var sharedUserWrapper = aTemplate.querySelector('.fm-chat-users-wrapper');
                        sharedUserWrapper.classList += ' simpletip';
                        sharedUserWrapper.dataset.simpletip = aProperties.userNames.join(",[BR]");
                    }
                    aTemplate.querySelector('.fm-chat-users').textContent = userNames.join(', ');

                    if (otherCount === 1) {
                        aTemplate.querySelector('.fm-chat-users-other').textContent = l[20652];
                    }
                    else if (otherCount > 1) {
                        aTemplate.querySelector('.fm-chat-users-other').textContent = l[20653]
                            .replace('$1', otherCount);
                    }
                    aTemplate.querySelector('.shared-folder-info').textContent = aProperties.shareInfo;
                    aTemplate.querySelector('.shared-folder-size').textContent = aProperties.folderSize;
                    aTemplate.querySelector('.last-shared-time').textContent = aProperties.lastSharedAt;
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

                aTemplate.querySelector('.start-conversation span').textContent = aProperties.conversationText;

                if (aProperties.avatar) {
                    var avatar = this.viewmode ? '.shared-folder-info-block' : '.fm-chat-user-info';
                    avatar = aTemplate.querySelector(avatar);

                    avatar.parentNode.insertBefore(aProperties.avatar, avatar);
                }

                if (this.viewmode) {
                    aTemplate.querySelector('.shared-folder-name').textContent = nicknames.getNickname(aNode.u);
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
                if (!DYNLIST_ENABLED || !this.megaList) {
                    this.insertDOMNode(aNode, aNodeIndex, aDOMNode, aUpdate);
                }
            },
            'contacts': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                this.renderer['*'].apply(this, arguments);
                getLastInteractionWith(aHandle);
            },
            'cloud-drive': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                if (!DYNLIST_ENABLED || !this.megaList) {
                    this.insertDOMNode(aNode, aNodeIndex, aDOMNode, aUpdate, cacheEntry);
                }
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

                if (DYNLIST_ENABLED) {
                    if (!aUpdate || !this.megaList) {

                        var megaListOptions = {
                            'itemRenderFunction': M.megaListRenderNode,
                            'preserveOrderInDOM': true,
                            'extraRows': 4,
                            'batchPages': 0,
                            'appendOnly': false,
                            'onContentUpdated': function () {
                                M.rmSetupUI(false, true);
                            },
                            'perfectScrollOptions': {
                                'handlers': ['click-rail', 'drag-scrollbar', 'wheel', 'touch'],
                                'minScrollbarLength': 20
                            },
                        };
                        var megaListContainer;

                        if (this.viewmode) {
                            megaListOptions['itemWidth'] = 156 + 2 + 2 + 12 /* 12 = margin-left */;
                            megaListOptions['itemHeight'] = 184 + 2 + 2 + 12 /* 12 = margin-top */;
                            megaListContainer = this.container;
                        }
                        else {
                            megaListOptions['itemWidth'] = false;
                            megaListOptions['itemHeight'] = 24;
                            megaListOptions['appendTo'] = 'tbody';
                            megaListOptions['renderAdapter'] = new MegaList.RENDER_ADAPTERS.Table();
                            megaListContainer = this.container.parentNode.parentNode;
                        }

                        define(this, 'megaList', new MegaList(megaListContainer, megaListOptions));
                    }

                    // are there any 'newnodes'? if yes, generate the .newNodeList, even if this was previously a
                    // non-megaList/megaRender initialized folder (e.g. empty)
                    if (aUpdate && aNodeList.length && Object(newnodes).length) {
                        if (!result) {
                            result = {};
                        }

                        var newNodes = [];
                        var objMap = newnodes
                            .map(function(n) {
                                return n.h;
                            })
                            .reduce(function(obj, value) {
                                obj[value] = 1;
                                return obj;
                            }, {});

                        for (var idx = aNodeList.length; idx--;) {
                            if (objMap[aNodeList[idx].h]) {
                                newNodes[idx] = aNodeList[idx];
                            }
                        }

                        if (newNodes.length) {
                            result.newNodeList = newNodes;
                            result.curNodeList = aNodeList;
                        }
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
            'contacts': function() {
                M.contactsUI();
            },
            'contact-shares': function(aUpdate, aNodeList, aUserData) {
                var contact = M.d[M.currentdirid];

                if (contact) {
                    $('.contact-share-notification')
                        .text(l[20435].replace('%1', contact.name))
                        .removeClass('hidden');
                }
            },
            'cloud-drive': function(aUpdate, aNodeList, aUserData) {
                if (DYNLIST_ENABLED) {
                    if (!aUpdate) {
                        var container = document.querySelector(viewModeContainers[this.section][this.viewmode]);
                        this.addClasses(
                            document.querySelector(viewModeContainers[this.section][0 + !this.viewmode]),
                            ["hidden"]
                        );

                        this.addClasses(container, ['megaListContainer']);

                        // because, viewModeContainers is not perfectly structured as before (e.g.
                        // container != the actual container that holds the list, we try to guess/find the node, which
                        // requires showing
                        if (container.classList.contains("hidden")) {
                            this.removeClasses(container, ["hidden"]);
                        }
                        if (container.parentNode.classList.contains("hidden")) {
                            this.removeClasses(container.parentNode, ["hidden"]);
                        }
                        if (container.parentNode.parentNode.classList.contains("hidden")) {
                            this.removeClasses(container.parentNode.parentNode, ["hidden"]);
                        }
                        if (container.parentNode.parentNode.parentNode.classList.contains("hidden")) {
                            this.removeClasses(container.parentNode.parentNode, ["hidden"]);
                        }

                        this.megaList.batchReplace(aNodeList.map(String));
                        this.megaList.initialRender();
                    }
                    else if (aUserData && aUserData.newNodeList && aUserData.newNodeList.length > 0) {
                        this.megaList.batchReplace(aUserData.curNodeList.map(String));
                    }
                }
            }
        }),

        destroy: function() {
            if (this.megaList) {
                this.megaList.destroy();
            }
            oDestroy(this);
        },

        toString: function() {
            return '[MegaRender:' + this.section + ':' + this.viewmode + ']';
        }
    });

    define(scope, 'MegaRender', Object.freeze(MegaRender));
})(this);
