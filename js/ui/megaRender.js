mBroadcaster.once('boot_done', () => {
    "use strict"; /* jshint maxcomplexity:19, maxdepth:6 */

    var DYNLIST_ENABLED = true;

    var logger;

    var viewModeTemplates = {
        'cloud-drive': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td class="space-maintainer-start">' +
                        '<i class="sprite-fm-mono icon-check selected"></i>' +
                    '</td>' +
                    '<td megatype="fname">' +
                        '<span class="item-type-icon"><img/></span>' +
                        '<span class="tranfer-filetype-txt"></span>' +
                    '</td>' +
                    '<td megatype="fav">' +
                        '<span class="grid-status-icon sprite-fm-mono icon-heart-thin-outline simpletip" ' +
                            `data-simpletip="${l[5871]}" data-simpletipposition="top"></span > ` +
                    '</td>' +
                    '<td megatype="label" class="label"></td>' +
                    '<td megatype="timeAd" class="time ad"></td>' +
                    '<td megatype="timeMd" class="time md"></td>' +
                    '<td megatype="type" class="type"></td>' +
                    '<td megatype="size" class="size"></td>' +
                    '<td megatype="versions" class="hd-versions"></td>' +
                    '<td megatype="playtime" class="playtime"></td>' +
                    '<td megatype="fileLoc" class="fileLoc">' +
                        '<span class="grid-file-location"></span>' +
                    '</td>' +
                    '<td megatype="extras" class="grid-url-field own-data">' +
                        '<a class="grid-url-arrow">' +
                            '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                                `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                        '</a>' +
                        '<span class="versioning-indicator">' +
                            '<i class="sprite-fm-mono icon-clock-rotate"></i>' +
                        '</span>' +
                        '<i class="sprite-fm-mono icon-link-thin-outline simpletip" ' +
                            `data-simpletip="${l[6909]}" data-simpletipposition="top"></i>` +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="mega-node fm-item">' +
                '<i class="sprite-fm-mono icon-check selected"></i>' +
                '<div class="fm-item-img">' +
                    '<i class="item-type-icon-90"></i>' +
                    '<img>' +
                '</div>' +
                '<div class="fm-item-name"></div>' +
                '<div class="props">' +
                    '<span class="num-files"></span>' +
                    '<span class="size"></span>' +
                    '<i class="icon-favourite sprite-fm-mono icon-heart-thin-solid icon simpletip" ' +
                        `data-simpletip="${l[5872]}" data-simpletipposition="top" title></i>` +
                    '<i class="icon-version sprite-fm-mono icon-clock-rotate icon simpletip" ' +
                        `data-simpletip="${l[16474]}" data-simpletipposition="top" title></i>` +
                    '<i class="icon-link sprite-fm-mono icon-link-thin-outline icon simpletip" ' +
                        `data-simpletip="${l[6909]}" data-simpletipposition="top" title></i>` +
                    '<span class="duration"></span>' +
                '</div>' +
                '<div class="props-bottom-left">' +
                    '<i class="colour-label"></i>' +
                '</div>' +
                '<div class="props-bottom-right">' +
                    '<button class="mega-component context-btn open-context-menu text-icon nav-elem icon-only' +
                        ` simpletip" data-simpletip="${l.more_actions}" title>` +
                        '<i class="sprite-fm-mono icon-more-vertical-thin-outline left-icon icon-size-20"></i>' +
                    '</button>' +
                '</div>' +
            '</a>'
        ],

        'device-centre-devices': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td></td>' +
                    '<td megatype="fname">' +
                        '<div ' +
                            'class="device-centre-item-icon medium-file-icon sprite-fm-theme"' +
                        '>' +
                        '</div>' +
                        '<div class="device-centre-item-info-block">' +
                            '<div class="device-centre-item-name"></div>' +
                            '<div class="device-centre-item-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td megatype="numFolders">' +
                        '<div class="device-centre-item-contain"></div>' +
                    '</td>' +
                    '<td megatype="size">' +
                        '<div class="device-centre-item-size"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow">' +
                            '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                                `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                        '</a>' +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>',

            // Icon view mode: view not available
            '<span></span>'
        ],

        'device-centre-folders': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td></td>' +
                    '<td megatype="fname">' +
                        '<div ' +
                            'class="device-centre-item-icon medium-file-icon item-type-icon-90"' +
                        '>' +
                        '</div>' +
                        '<div class="device-centre-item-info-block">' +
                            '<div class="device-centre-item-name"></div>' +
                            '<div class="device-centre-item-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td megatype="label" class="label"></td>' +
                    '<td megatype="type">' +
                        '<div class="device-centre-item-type"></div>' +
                    '</td>' +
                    '<td megatype="size">' +
                        '<div class="device-centre-item-size"></div>' +
                    '</td>' +
                    '<td megatype="timeAd">' +
                        '<div class="device-centre-item-added"></div>' +
                    '</td>' +
                    '<td megatype="hbtime">' +
                        '<div class="device-centre-item-modified"></div>' +
                    '</td>' +
                    '<td megatype="extras" class="grid-url-field own-data">' +
                        '<a class="grid-url-arrow">' +
                            '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                                `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                        '</a>' +
                        '<span class="versioning-indicator">' +
                            '<i class="sprite-fm-mono icon-clock-rotate"></i>' +
                        '</span>' +
                        '<i class="sprite-fm-mono icon-link-thin-outline simpletip" ' +
                            `data-simpletip="${l[6909]}" data-simpletipposition="top"></i>` +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>',

            // Icon view mode: view not available
            '<span></span>'
        ],

        'shares': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td>' +
                        '<i class="sprite-fm-mono icon-check selected"></i>' +
                    '</td>' +
                    '<td>' +
                        '<div ' +
                            'class="item-type-icon-90 icon-folder-users-90 sprite-fm-uni-after icon-warning-after"' +
                        '>' +
                        '</div>' +
                        '<div class="shared-folder-info-block">' +
                            '<div class="shared-folder-name"></div>' +
                            '<div class="shared-folder-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td class="label"></td>' +
                    '<td>' +
                        '<div class="fm-chat-user-info todo-star ustatus">' +
                            '<div class="todo-fm-chat-user-star"></div>' +
                            '<div class="fm-chat-user"><span></span><div class="nw-contact-status"></div></div>' +
                            '<div class="fm-user-verification"><span></span></div>' +
                            '<div class="clear"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td class="size-col">' +
                        '<div class="shared-folder-size"></div>' +
                    '</td>' +
                    '<td>' +
                        '<div class="shared-folder-access"><i class="sprite-fm-mono"></i><span></span></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                        '<a class="grid-url-arrow">' +
                            '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                                `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                        '</a>' +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>'
        ],

        'out-shares': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td>' +
                        '<i class="sprite-fm-mono icon-check selected"></i>' +
                    '</td>' +
                    '<td>' +
                        '<div class="item-type-icon-90 icon-folder-users-90"></div>' +
                        '<div class="shared-folder-info-block">' +
                            '<div class="shared-folder-name"></div>' +
                            '<div class="shared-folder-info"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="50" megatype="fav">' +
                        '<span class="grid-status-icon sprite-fm-mono icon-heart-thin-outline simpletip" ' +
                            `data-simpletip="${l[5871]}" data-simpletipposition="top"></span > ` +
                    '</td>' +
                    '<td width="96" class="label"></td>' +
                    '<td width="240" class="simpletip-parent">' +
                        '<div class="fm-chat-users-wrapper">' +
                            '<div class="fm-chat-users"></div>' +
                            '<div class="fm-chat-users-other"></div>' +
                        '</div>' +
                    '</td>' +
                    '<td width="100" class="size-col">' +
                        '<div class="shared-folder-size"></div>' +
                    '</td>' +
                    '<td width="200">' +
                        '<div class="last-shared-time"></div>' +
                    '</td>' +
                    '<td class="grid-url-header-nw">' +
                    '<a class="grid-url-arrow">' +
                        '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                            `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                    '</a>' +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>'
        ],

        'file-requests': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td class="space-maintainer-start">' +
                        '<i class="sprite-fm-mono icon-check selected"></i>' +
                    '</td>' +
                    '<td megatype="fname">' +
                        '<span class="item-type-icon"><img/></span>' +
                        '<span class="tranfer-filetype-txt"></span>' +
                    '</td>' +
                    '<td megatype="fav">' +
                        '<span class="grid-status-icon sprite-fm-mono icon-heart-thin-outline simpletip" ' +
                            `data-simpletip="${l[5871]}" data-simpletipposition="top"></span > ` +
                    '</td>' +
                    '<td megatype="label" class="label"></td>' +
                    '<td megatype="timeAd" class="time ad"></td>' +
                    '<td megatype="timeMd" class="time md"></td>' +
                    '<td megatype="type" class="type"></td>' +
                    '<td megatype="size" class="size"></td>' +
                    '<td megatype="versions" class="hd-versions"></td>' +
                    '<td megatype="playtime" class="playtime"></td>' +
                    '<td megatype="fileLoc" class="fileLoc">' +
                        '<span class="grid-file-location"></span>' +
                    '</td>' +
                    '<td megatype="extras" class="grid-url-field own-data">' +
                        '<a class="grid-url-arrow">' +
                            '<i class="sprite-fm-mono icon-more-vertical-thin-outline simpletip" ' +
                                `data-simpletip="${l.more_actions}" data-simpletipposition="top"></i>` +
                        '</a>' +
                        '<span class="versioning-indicator">' +
                        '<i class="sprite-fm-mono icon-clock-rotate"></i>' +
                        '</span>' +
                        '<i class="sprite-fm-mono icon-link-thin-outline simpletip" ' +
                            `data-simpletip="${l[6909]}" data-simpletipposition="top"></i>` +
                        '<a class="grid-file-request-manage hidden">' +
                            '<i class="sprite-fm-mono icon-manage-folders simpletip" ' +
                                `data-simpletip="${l.file_request_dropdown_manage}" data-simpletipposition="top"></i>` +
                        '</a>' +
                    '</td>' +
                    '<td class="space-maintainer-end" megatype="empty"></td>' +
                '</tr>' +
            '</table>',

            // Icon view mode
            '<a class="mega-component mega-node fm-item">' +
                '<i class="sprite-fm-mono icon-check selected"></i>' +
                '<div class="fm-item-img">' +
                    '<i class="item-type-icon-90"></i>' +
                    '<img>' +
                '</div>' +
                '<div class="fm-item-name"></div>' +
                '<div class="props">' +
                    '<span class="num-files"></span>' +
                    '<span class="size"></span>' +
                    '<i class="icon-favourite sprite-fm-mono icon-heart-thin-solid icon simpletip" ' +
                        `data-simpletip="${l[5872]}" data-simpletipposition="top" title></i>` +
                    '<i class="icon-version sprite-fm-mono icon-clock-rotate icon simpletip" ' +
                        `data-simpletip="${l[16474]}" data-simpletipposition="top" title></i>` +
                    '<i class="icon-link sprite-fm-mono icon-link-thin-outline icon simpletip" ' +
                        `data-simpletip="${l[6909]}" data-simpletipposition="top" title></i>` +
                    '<span class="duration"></span>' +
                '</div>' +
                '<div class="props-bottom-left">' +
                    '<i class="colour-label"></i>' +
                '</div>' +
                '<div class="props-bottom-right">' +
                    '<button class="mega-component context-btn open-context-menu text-icon nav-elem icon-only' +
                        ` simpletip" data-simpletip="${l.more_actions}" title>` +
                        '<i class="sprite-fm-mono icon-more-vertical-thin-outline left-icon icon-size-20"></i>' +
                    '</button>' +
                '</div>' +
            '</a>'
        ],

        'subtitles': [
            // List view mode
            '<table>' +
                '<tr>' +
                    '<td class="space-maintainer-start"></td>' +
                    '<td megatype="fname">' +
                        '<span class="item-type-icon"><img/></span>' +
                        '<span class="tranfer-filetype-txt"></span>' +
                    '</td>' +
                    '<td megatype="size" class="size"></td>' +
                    '<td megatype="timeAd" class="time ad"></td>' +
                    '<td megatype="location" class="location">' +
                        '<span class="simpletip simpletip-breadcrumb block w-full text-ellipsis"></span>' +
                    '</td>' +
                '</tr>' +
            '</table>'
        ]
    };

    var viewModeContainers = {
        'cloud-drive': [
            '.grid-table.fm',
            '.fm-blocks-view.fm .file-block-scrolling',
        ],
        'device-centre-devices': [
            '.device-centre-grid-view .devices .grid-table.device-centre',
            '.device-centre-blocks-scrolling'
        ],
        'device-centre-folders': [
            '.device-centre-grid-view .folders .grid-table.device-centre',
            '.device-centre-blocks-scrolling'
        ],
        'shares': [
            '.shared-grid-view .grid-table.shared-with-me'
        ],
        'out-shares': [
            '.out-shared-grid-view .grid-table.out-shares'
        ],
        'file-requests': [
            '.grid-table.fm',
            '.fm-blocks-view.fm .file-block-scrolling'
        ],
        'subtitles': [
            '.mega-dialog .grid-table'
        ]
    };

    var versionColumnPrepare = function(versionsNb, VersionsSize) {
        var versionsTemplate = '<div class="ver-col-container">' +
            '<div class="ver-nb">' + versionsNb + '</div>' +
            '<div class="ver-icon versioning">' +
            '<span class="versioning-indicator">' +
            '<i class="sprite-fm-mono icon-clock-rotate"></i>' +
            '</span>' +
            '</div>' +
            '</div>';

        // safe will remove any scripts
        return parseHTML(versionsTemplate).firstChild;
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
        var location = 'default';

        // Force to set viewMode 0 (list) for file-requests and in/out shares
        if (M.currentdirid === 'shares') {
            section = 'shares';
            aViewMode = 0;
        }
        else if (M.currentdirid === 'out-shares') {
            section = 'out-shares';
            aViewMode = 0;
        }
        else if (M.currentrootid === 'file-requests') {
            section = 'file-requests';
            if (M.currentdirid === 'file-requests') {
                aViewMode = 0;
            }
        }
        if (M.getS4NodeType(M.currentdirid) === 'container') {
            aViewMode = 0;
        }
        else if (mega.devices.ui.isCustomRender()) {
            section = mega.devices.ui.getRenderSection();
        }
        else if (typeof aViewMode === 'string') {
            section = aViewMode;

            // For now, only lists are landing here, no need to set to 1
            aViewMode = 0;
        }
        if (section === 'cloud-drive') {

            if (!DYNLIST_ENABLED) {

                renderer = this.renderer['*'];
            }

            location =
                M.currentdirid === 'public-links' ? 'mixed-content' :
                    M.currentrootid === M.RubbishID ? 'trashcan' :
                        M.isDynPage(M.currentdirid) ? 'dyn-page' : location;
        }
        else {
            this.chatIsReady = megaChatIsReady;
        }

        this.fat = false;

        // View mode 3 is treated as list on MegaRender, but has fat mode enabled
        if (aViewMode === 3) {
            this.fat = true;
            aViewMode = 0;
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
        define(this, 'location',            location);
        this.versionColumnPrepare = versionColumnPrepare;

        if (self.d) {
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
                delete M.rmItemsInView;
                M.hideEmptyGrids();
                $.tresizer();

                sharedFolderUI();

                $('.grid-table tbody tr').not('.conversationsApp .grid-table tbody tr').remove();
                $('.file-block-scrolling a').remove();

                // eslint-disable-next-line local-rules/jquery-replacements
                $(aListSelector).show().parent().children('table').show();
            }

            // Draw empty grid if no contents.
            var nodeListLength = aNodeList.length;
            let fmRightFileBlock = document.querySelector('.fm-right-files-block:not(.in-chat)');

            if (nodeListLength || (M.currentdirid && M.currentdirid.includes('user-management'))) {

                if (fmRightFileBlock) {
                    fmRightFileBlock.classList.remove('emptied');
                }
            }
            else {

                if (fmRightFileBlock) {
                    fmRightFileBlock.classList.add('emptied');
                }

                if (M.RubbishID && M.currentdirid === M.RubbishID) {
                    $('.fm-empty-trashbin').removeClass('hidden');
                    mega.ui.secondaryNav.hideActionButtons();
                }
                else if (String(M.currentdirid).substr(0, 7) === 'search/'
                        || mega.ui.mNodeFilter.selectedFilters.value
                        && M.currentrootid !== 'shares') {
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
                else if (M.currentrootid === 'file-requests') {
                    if (M.currentdirid === 'file-requests') {
                        $('.fm-empty-file-requests').removeClass('hidden');
                        mega.fileRequest.rebindPageEmptyCreateButton();
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
                else if (M.isGalleryPage()) {
                    const pagetype = M.currentdirid === M.currentCustomView.nodeID ? M.currentdirid : 'discovery';

                    $(`.fm-empty-${pagetype}`).removeClass('hidden');
                    $('.gallery-view').addClass('hidden');
                }
                else if (M.isDynPage(M.currentdirid)) {
                    if (d > 2) {
                        console.log('Deferred dyn-page.', M.currentdirid);
                    }
                }
                else if (M.onDeviceCenter
                    && mega.devices.ui.getRenderSection() !== 'cloud-drive') {

                    // TODO: [iha] Add new empty states for (1. devices, 2. folders)
                    // TODO: [iha] Check if we have the correct option selected
                    const currSect = mega.devices.ui.getRenderSection();
                    const filterData = mega.devices.ui.filterChipUtils.selectedFilters.data;

                    switch (currSect) {
                        case 'device-centre-devices':
                            if (filterData && filterData.name === 'deviceactivity' && filterData.index === 0) {
                                $('.fm-no-active-devices', '.fm-right-files-block').removeClass('hidden');
                            }
                            break;
                        case 'device-centre-folders':
                            if (filterData && filterData.name === 'folderactivity' && filterData.index === 0) {
                                $('.fm-no-active-folders', '.fm-right-files-block').removeClass('hidden');
                            }
                            break;

                    }
                }
                else if (this.logger) {
                    this.logger.info('Empty folder not handled...', M.currentdirid, M.currentrootid);
                }
                if (u_type !== 3) {
                    $('.fm-not-logged-description').safeHTML(l[8762].replace('%s', bytesToSize(mega.bstrg, 0)));
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
                        M.initShortcutsAndSelection(container, false, true);
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

            this.container.classList.toggle('fat', this.fat);

            if (this.container.nodeName === 'TABLE') {
                var tbody = this.container.querySelector('tbody');
                var thead = this.container.querySelector('thead');

                if (tbody) {
                    this.container = tbody;
                }

                if (thead) {
                    this.header = thead;
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
                for (var idx = 0; idx < aNodeList.length; idx++) {
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

            if (this.section !== 'cloud-drive' && this.section !== 'file-requests') {
                sectionName = this.section;
            }

            // setting widths
            if (M && M.columnsWidth && M.columnsWidth[sectionName]) {

                const knownColumnsWidths = Object.keys(M.columnsWidth[sectionName]) || [];

                for (let col = 0; col < knownColumnsWidths.length; col++) {

                    const tCol = nodeDOM.querySelector('[megatype="' + knownColumnsWidths[col] + '"]');
                    const colWidths = M.columnsWidth[sectionName][knownColumnsWidths[col]];

                    if (tCol && tCol.nodeName === 'TH') {
                        tCol.classList.remove('hidden');

                        if (typeof colWidths.curr === 'number') {
                            tCol.style.width = colWidths.curr + 'px';
                        }
                        else {
                            tCol.style.width = colWidths.curr || '';

                            const headerWidth = getComputedStyle(tCol).width.replace('px', '') | 0;
                            const colMin = colWidths.min;
                            const colMax = colWidths.max;

                            if (headerWidth < colMin) {
                                tCol.style.width = `${colMin}px`;
                            }
                            else if (headerWidth > colMax) {
                                tCol.style.width = `${colMax}px`;
                            }
                        }

                        if (colWidths.hidden) {
                            tCol.classList.add('hidden');
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
         * Expunges a DOM node stored in the `nodeMap`.
         *
         * @param {String} aHandle The ufs-node's handle
         * @param {Boolean} [aRemove] Remove it from the DOM as well?
         */
        revokeDOMNode: function(aHandle, aRemove) {
            if (this.nodeMap[aHandle]) {
                const node = this.nodeMap[aHandle];
                delete this.nodeMap[aHandle];

                if (this.unverifiedShare && node.classList.contains('unverified-share')) {
                    this.unverifiedShare--;
                }

                if (aRemove) {
                    node.remove();
                }
                return node;
            }
        },

        /**
         * Check whether a DOM node is visible.
         * nb: not necessarily in the view-port, but MegaList should handle that.
         *
         * @param {String} aHandle The ufs-node's handle
         * @returns {Boolean} whether it is
         */
        isDOMNodeVisible: function(aHandle) {
            const node = this.nodeMap[aHandle];
            const res = !!(node && node.parentNode);

            if (d > 1) {
                console.assert(!this.megaList || res === this.megaList.isRendered(aHandle));
            }

            return res;
        },

        /**
         * Checks if a DOM node for that `aHandle` is created and cached in MegaRender.
         *
         * @param aHandle
         */
        hasDOMNode: function(aHandle) {
            return !!this.nodeMap[aHandle];
        },

        /**
         * Add classes to DOM node
         * @param {Object} aDOMNode    DOM node to set class over
         * @param {Array}  aClassNames An array of classes
         */
        addClasses: function(aDOMNode, aClassNames) {
            aDOMNode.classList.add(...aClassNames);
        },

        /**
         * Remove classes from DOM node
         * @param {Object} aDOMNode    DOM node to set class over
         * @param {Array}  aClassNames An array of classes
         */
        removeClasses: function(aDOMNode, aClassNames) {
            aDOMNode.classList.remove(...aClassNames);
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
                const props = {classNames: []};
                const share = M.getNodeShare(aNode.d ? aNode.h : aNode);
                let itemIcon = fileIcon(aNode);

                if (aNode.su) {
                    props.classNames.push('inbound-share');
                }

                if (M.dcd[aNode.h]) {
                    props.classNames.push('device-item');
                }
                else if (aNode.isDeviceFolder) {
                    props.size = bytesToSize(aNode.tb || 0);
                }
                else if (aNode.s4 && M.getS4NodeType(aNode) === 'bucket') {
                    props.type = l.s4_bucket_type;
                    props.classNames.push('folder');
                    if (!mega.lite.inLiteMode) {
                        props.size = bytesToSize(aNode.tb || 0);
                    }
                }
                else if (aNode.t) {
                    props.type = l[1049];
                    props.classNames.push('folder');
                    if (!mega.lite.inLiteMode) {
                        props.size = bytesToSize(aNode.tb || 0);
                    }
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
                    itemIcon = aNode.t ? 'folder' : 'generic';
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
                        props.name = aNode.t ? l[8686] : l[8687];
                        props.tooltip.push(M.getUndecryptedLabel(aNode));

                        if (self.nullkeys && self.nullkeys[aHandle]) {
                            props.classNames.push('undecryptable-zk');
                        }
                    }

                    props.inv411d = 1;
                }

                props.icon = `icon-${itemIcon}-24`;
                props.blockIcon = `icon-${itemIcon}-90`;

                if (aExtendedInfo !== false) {

                    if (share) {
                        props.linked = true;
                        props.classNames.push('linked');
                    }

                    if (!this.viewmode) {
                        if (M.currentCustomView.type === 'public-links' && aNode.shares && aNode.shares.EXP) {
                            props.time = aNode.shares.EXP.ts ? time2date(aNode.shares.EXP.ts) : '';
                            props.mTime = aNode.mtime ? time2date(aNode.mtime) : '';
                        }
                        else {
                            // props.time = time2date(aNode[M.lastColumn] || aNode.ts);
                            props.time = time2date(aNode.ts);
                            props.mTime = aNode.mtime ? time2date(aNode.mtime) : '';
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
                else if (!aExtendedInfo && aNode.d && share) {
                    props.linked = true;
                    props.classNames.push('linked');
                }
                if (aNode.su) {
                    props.parentName = l[5542];
                }
                else if (aNode.p === M.RubbishID) {
                    props.parentName = l[167];
                }
                else {
                    const pHandle = M.getNodeByHandle(aNode.p);
                    props.parentName = M.getNameByHandle(pHandle);
                }

                return props;
            },
            'device-centre-devices'(aNode, aHandle) {
                const props = this.nodeProperties['*'].call(this, aNode, aHandle, false);
                if (mega.devices.main) {
                    mega.devices.main.run('updateProps', props, aNode);
                }
                return props;
            },
            'device-centre-folders'(aNode, aHandle) {
                const props = this.nodeProperties['*'].call(this, aNode, aHandle, true);
                if (mega.devices.main) {
                    mega.devices.main.run('updateProps', props, aNode);
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
                    props.accessRightsIcon = 'icon-permissions-write';
                }
                else if (aNode.r === 2) {
                    props.accessRightsText = l[57];
                    props.accessRightsClass = 'full-access';
                    props.accessRightsIcon = 'icon-star';
                }
                else {
                    props.accessRightsText = l[55];
                    props.accessRightsClass = 'read-only';
                    props.accessRightsIcon = 'icon-read-only';
                }

                props.shareInfo = fm_contains(aNode.tf, aNode.td);

                if (this.chatIsReady) {
                    var contact = M.u[props.userHandle];
                    if (contact) {
                        props.onlineStatus = M.onlineStatusClass(
                            contact.presence || "unavailable"
                        );
                    }
                }

                if (aExtendedInfo !== false) {
                    avatar = useravatar.contact(props.userHandle);
                }

                if (avatar) {
                    props.avatar = parseHTML(avatar).firstChild;
                }

                // Colour label
                if (aNode.lbl && !folderlink && (aNode.su !== u_handle)) {
                    var colourLabel = M.getLabelClassFromId(aNode.lbl);
                    props.classNames.push('colour-label');
                    props.classNames.push(colourLabel);
                    props.labelC = this.labelsColors[colourLabel];
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

                props.icon = fileIcon(aNode);
                props.userNames = props.userNames.sort();
                props.lastSharedAt = time2date(props.lastSharedAt);
                props.folderSize = bytesToSize(aNode.tb + (aNode.tvb || 0));
                props.shareInfo = fm_contains(aNode.tf, aNode.td);

                // Colour label
                if (aNode.lbl && !folderlink && (aNode.su !== u_handle)) {
                    var colourLabel = M.getLabelClassFromId(aNode.lbl);
                    props.classNames.push('colour-label');
                    props.classNames.push(colourLabel);
                    props.labelC = this.labelsColors[colourLabel];
                }

                return props;
            },
            'file-requests': function(...args) {
                return this.nodeProperties['*'].apply(this, args);
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
                let elm;

                if (aNode.fav && !folderlink && this.location !== 'trashcan' && M.currentrootid !== 'shares') {
                    if (this.viewmode === 1) {
                        aTemplate.classList.add('favourited');
                        elm = aTemplate.querySelector('.icon-favourite');
                        elm.dataset.simpletip = l[5872];
                    }
                    else {
                        elm = aTemplate.querySelector('.grid-status-icon');
                        elm.classList.add('icon-heart-thin-solid');
                        elm.classList.remove('icon-heart-thin-outline');
                        elm.dataset.simpletip = l[5872];
                    }
                }
                if (mega.sensitives.shouldBlurNode(aNode)) {
                    aTemplate.classList.add('is-sensitive');
                }

                if (!aNode.t && aNode.tvf) {
                    aTemplate.classList.add('versioning');
                    var vTemplate = aTemplate.querySelector('.hd-versions');
                    if (vTemplate) {
                        vTemplate.appendChild(versionColumnPrepare(aNode.tvf, aNode.tvb || 0));
                    }
                }

                if (aNode.vhl) {
                    aTemplate.classList.add(`highlight${aNode.vhl}`);
                }

                if (!aProperties.inv411d
                    && (this.viewmode || String(aProperties.name).length > 78 || aProperties.playtime !== undefined)) {

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

                if (title) {
                    aTemplate.setAttribute('title', title);
                }

                if (this.viewmode === 1) {
                    tmp = aTemplate.querySelector('.item-type-icon-90');

                    tmp.classList.add(aProperties.blockIcon);

                    if (aProperties.playtime !== undefined) {
                        // aTemplate.querySelector('.data-block-bg').classList.add('video');
                        aTemplate.querySelector('.duration').textContent = secondsToTimeShort(aProperties.playtime);
                    }

                    aTemplate.querySelector('.fm-item-name').textContent = aProperties.name;

                    tmp = aTemplate.querySelector('i.colour-label');
                }
                else {
                    if (aProperties.linked) {
                        if (this.viewmode === 1) {
                            aTemplate.classList.add('linked');
                        }
                        else {
                            aTemplate.querySelector('.grid-url-field').classList.add('linked');
                        }
                    }

                    if (aProperties.size !== undefined) {
                        aTemplate.querySelector('.size').textContent = aProperties.size;
                    }
                    if (aProperties.playtime !== undefined) {
                        aTemplate.querySelector('.playtime').textContent = secondsToTimeShort(aProperties.playtime);
                    }
                    aTemplate.querySelector('.type').textContent = aProperties.type;
                    aTemplate.querySelector('.time').textContent = aProperties.time;
                    aTemplate.querySelector('.time.md').textContent = aProperties.mTime;
                    aTemplate.querySelector('.fileLoc span').textContent = aProperties.parentName;
                    aTemplate.querySelector('.label').textContent = aProperties.labelC || '';

                    tmp = aTemplate.querySelector('.tranfer-filetype-txt');
                    tmp.textContent = aProperties.name;

                    tmp = aTemplate.querySelector('.item-type-icon');

                    // Public URL Access for S4 Bucket or Object
                    if (M.currentrootid === 's4' && s4.ui) {
                        aTemplate = s4.ui.updateNodePublicAccess(aNode, aTemplate);
                    }

                    if (aProperties.takenDown) {
                        tmp.classList.add('icon-takedown-24');
                    }
                    else if (aProperties.icon) {
                        tmp.classList.add(aProperties.icon);
                    }
                }

                this.addClasses(tmp, aProperties.classNames);

                if (aProperties.undecryptable) {

                    if (this.viewmode === 1) {
                        elm = aTemplate.querySelector('.icon-favourite');
                        elm.classList.remove('icon-heart-thin-solid');
                        elm.classList.add('icon-info');
                        delete elm.dataset.simpletip;
                    }
                    else {
                        elm = aTemplate.querySelector('.grid-status-icon');
                        elm.classList.remove('icon-heart-thin-outline', 'icon-heart-thin-solid');
                        elm.classList.add('icon-info');
                    }
                }

                if (aProperties.takenDown) {

                    if (this.viewmode === 1) {
                        elm = aTemplate.querySelector('.item-type-icon-90');
                        elm.className = 'item-type-icon-90 icon-takedown-90';
                    }
                    else {
                        elm = aTemplate.querySelector('.grid-status-icon');
                        elm.classList.remove('icon-heart-thin-outline', 'icon-heart-thin-solid');
                        elm.classList.add('icon-takedown');
                    }
                }

                return aTemplate;
            },
            'device-centre-devices'(aNode, aProperties, aTemplate) {
                if (mega.devices.main) {
                    mega.devices.main.run('updateTemplate', aNode, aProperties, aTemplate);
                }
                return aTemplate;
            },
            'device-centre-folders'(aNode, aProperties, aTemplate) {
                if (mega.devices.main) {
                    mega.devices.main.run('updateTemplate', aNode, aProperties, aTemplate);
                }
                return aTemplate;
            },
            'shares': function(aNode, aProperties, aTemplate) {
                aTemplate.querySelector('.shared-folder-name').textContent = aProperties.name;

                var tmp = aTemplate.querySelector('.shared-folder-access');

                if (aProperties.avatar) {
                    var avatar = aTemplate.querySelector('.fm-chat-user-info');

                    avatar.parentNode.insertBefore(aProperties.avatar, avatar);
                }

                tmp.querySelector('span').textContent = aProperties.accessRightsText;
                tmp.querySelector('i').classList.add(aProperties.accessRightsIcon);

                tmp = aTemplate.querySelector('.fm-chat-user-info');
                tmp.classList.add(aProperties.userHandle);
                if (aProperties.onlineStatus) {
                    tmp.classList.add(aProperties.onlineStatus[1]);
                }

                aTemplate.querySelector('.fm-chat-user span').textContent = aProperties.userName;
                aTemplate.querySelector('.shared-folder-info').textContent = aProperties.shareInfo;
                aTemplate.querySelector('.shared-folder-size').textContent = aProperties.folderSize;
                aTemplate.querySelector('.label').textContent = aProperties.labelC || '';

                if (String(aProperties.name).length > 78) {
                    aTemplate.setAttribute('title', aProperties.name);
                }

                const contactVerification = mega.keyMgr.getWarningValue('cv') | 0;
                tmp = aTemplate.querySelector('.fm-user-verification span');

                if (contactVerification) {
                    const ed = aNode.su && authring.getContactAuthenticated(aNode.su, 'Ed25519');

                    if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON)) {
                        aTemplate.classList.add('unverified-share');
                        this.unverifiedShare = (this.unverifiedShare || 0) + 1;
                        tmp.textContent = l.verify_credentials;
                    }

                    aTemplate.classList.add('cv-on');
                }
                else {
                    aTemplate.classList.remove('cv-on');
                }

                return aTemplate;
            },
            'out-shares': function(aNode, aProperties, aTemplate) {

                const elm = aTemplate.querySelector('.grid-status-icon');

                if (aNode.fav && !folderlink) {
                    elm.classList.add('icon-heart-thin-solid');
                    elm.classList.remove('icon-heart-thin-outline');
                    elm.dataset.simpletip = l[5872];
                }

                if (M.getNodeRoot(aNode.h) === M.InboxID) {
                    elm.classList.add('read-only');
                }

                aTemplate.querySelector('.shared-folder-name').textContent = aProperties.name;

                tmp = aTemplate.querySelector('.fm-chat-user-info');

                var otherCount = 0;
                var userNames = aProperties.userNames;
                if (aProperties.userNames.length > 3) {
                    userNames = userNames.slice(0, 3);
                    otherCount = aProperties.userNames.length - 3;
                    var sharedUserWrapper = aTemplate.querySelector('.fm-chat-users-wrapper');
                    sharedUserWrapper.classList += ' simpletip';
                    sharedUserWrapper.dataset.simpletip = aProperties.userNames.join(",[BR]");
                    aTemplate.querySelector('.fm-chat-users-other').textContent = mega.icu
                        .format(l.users_share_other_count, otherCount);
                }
                aTemplate.querySelector('.fm-chat-users').textContent = userNames.join(', ');
                aTemplate.querySelector('.shared-folder-info').textContent = aProperties.shareInfo;
                aTemplate.querySelector('.shared-folder-size').textContent = aProperties.folderSize;
                aTemplate.querySelector('.last-shared-time').textContent = aProperties.lastSharedAt;
                aTemplate.querySelector('.label').textContent = aProperties.labelC || '';

                if (String(aProperties.name).length > 78) {
                    aTemplate.setAttribute('title', aProperties.name);
                }

                if (aProperties.icon) {
                    aTemplate.querySelector('.item-type-icon-90').classList.add(aProperties.icon);
                }

                return aTemplate;
            },
            'file-requests': function(aNode, aProperties, aTemplate) {
                const renderTemplate = this.builders['cloud-drive'].call(this, aNode, aProperties, aTemplate);

                if (aNode.t && mega.fileRequest.publicFolderExists(aNode.h)) {
                    const manageIcon = renderTemplate.querySelector('.grid-file-request-manage');

                    if (manageIcon) {
                        manageIcon.classList.remove('hidden');
                    }
                }

                return renderTemplate;
            },
            'subtitles': function(aNode, aProperties, aTemplate) {
                let tmp;
                let title = [];

                if (String(aProperties.name).length > 78) {
                    if (aProperties.width) {
                        title.push(`${aProperties.width}x${aProperties.height} @${aProperties.fps}fps`);
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

                if (aProperties.size !== undefined) {
                    aTemplate.querySelector('.size').textContent = aProperties.size;
                }
                aTemplate.querySelector('.time').textContent = aProperties.time;
                aTemplate.querySelector('.location span').textContent =
                    aNode.p === M.RootID ? l[164] : M.d[aNode.p].name;

                tmp = aTemplate.querySelector('.tranfer-filetype-txt');
                tmp.textContent = aProperties.name;
                if (title) {
                    tmp.setAttribute('title', title);
                }

                tmp = aTemplate.querySelector('.item-type-icon');

                if (aProperties.icon) {
                    tmp.classList.add(aProperties.icon);
                }

                this.addClasses(tmp, aProperties.classNames);

                if (mega.sensitives.isSensitive(aNode)) {
                    aTemplate.classList.add('is-sensitive');
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
            'cloud-drive': function(aNode, aHandle, aDOMNode, aNodeIndex, aUpdate, aUserData) {
                if (!DYNLIST_ENABLED || !this.megaList) {
                    this.insertDOMNode(aNode, aNodeIndex, aDOMNode, aUpdate, cacheEntry);
                }
            },
            'file-requests': function(...args) {
                return this.renderer['cloud-drive'].apply(this, args);
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
                if (!aUpdate) {
                    M.setLastColumn(localStorage._lastColumn);
                }

                return null;
            },
            'cloud-drive': function(aUpdate, aNodeList) {
                var result = this.initializers['*'].call(this, aUpdate, aNodeList);

                if (DYNLIST_ENABLED) {
                    if (!aUpdate || !this.megaList) {

                        var megaListOptions = {
                            'itemRenderFunction': M.megaListRenderNode,
                            'itemRemoveFunction': this.location === 'dyn-page' && M.megaListRemoveNode,
                            'preserveOrderInDOM': true,
                            'extraRows': 1,
                            'batchPages': 0,
                            'appendOnly': false,
                            'onContentUpdated': function() {

                                // If there is dragging happen, do not run this.
                                if ($.selecting) {
                                    return;
                                }

                                if (M.viewmode) {
                                    delay('thumbnails', fm_thumbnails, 2);
                                }
                                M.rmSetupUIDelayed(911);
                            },
                            'perfectScrollOptions': {
                                'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                                'minScrollbarLength': 20
                            },
                        };
                        var megaListContainer;

                        if (this.viewmode) {
                            megaListOptions.itemWidth = 180 + 4 + 4 + 24 /* 24 = margin-left */;
                            megaListOptions.itemHeight = 212 + 4 + 4 + 24 /* 24 = margin-top */;
                            megaListContainer = this.container;
                            megaListOptions.bottomSpacing = 24;
                            megaListOptions.renderAdapter = new MegaList.RENDER_ADAPTERS.Grid();
                        }
                        else {
                            megaListOptions.extraRows = 4;
                            megaListOptions.itemWidth = false;
                            megaListOptions.itemHeight = this.fat ? 48 : 32;
                            megaListOptions.headerHeight = 56;
                            megaListOptions.bottomSpacing = 6;
                            megaListOptions.appendTo = 'tbody';
                            megaListOptions.renderAdapter = new MegaList.RENDER_ADAPTERS.Table();
                            megaListContainer = this.container.parentNode.parentNode.parentNode;
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
            },
            'file-requests': function(aUpdate, aNodeList) {
                return this.initializers['cloud-drive'].call(this, aUpdate, aNodeList);
            }
        }),

        /** Renderer finalizers */
        finalizers: freeze({
            /**
             * @param {Boolean} aUpdate   Whether we're updating the list
             * @param {Array}   aNodeList The list of ufs-nodes processed
             * @param {Object}  aUserData  Any data provided by initializers
             */
            'cloud-drive': function(aUpdate, aNodeList, aUserData) {
                if (DYNLIST_ENABLED) {
                    if (!aUpdate) {
                        var container = document.querySelector(viewModeContainers[this.section][this.viewmode]);
                        var toHide = document.querySelector(viewModeContainers[this.section][0 + !this.viewmode]);

                        if (toHide) {
                            this.addClasses(toHide, ["hidden"]);
                        }

                        this.addClasses(container, ['megaListContainer']);

                        // because, viewModeContainers is not perfectly structured as before (e.g.
                        // container != the actual container that holds the list, we try to guess/find the node, which
                        // requires showing
                        if (container.classList.contains("hidden")) {
                            this.removeClasses(container, ["hidden"]);
                        }

                        container = container.parentNode.closest('.fm');
                        if (container && container.classList.contains("hidden")) {
                            this.removeClasses(container, ["hidden"]);
                        }

                        this.megaList.batchReplace(aNodeList.map(String));

                        if (!this.viewmode && !this._headersReady) {

                            this._headersReady = true;
                            this.setDOMColumnsWidth(this.container.parentElement.querySelector('thead tr'));
                        }
                        this.megaList.initialRender();
                    }
                    else if (aUserData && aUserData.newNodeList && aUserData.newNodeList.length > 0) {
                        this.megaList.batchReplace(aUserData.curNodeList.map(String));
                    }
                }
            },
            'file-requests': function(aUpdate, aNodeList, aUserData) {
                this.finalizers['cloud-drive'].call(this, aUpdate, aNodeList, aUserData);
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

    define(self, 'MegaRender', freeze(MegaRender));
});
