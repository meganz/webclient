/**
 * Functionality for rendering the mobile file manager (cloud drive view) and public links
 */
mobile.cloud = {

    /**
     * Initial rendering
     */
    renderLayout: function() {

        'use strict';

        // jQuery selectors
        var $otherPages = $('> div:not(.hidden):not(.file-manager-block)', '#fmholder');
        var $excludes = $('.top-menu-popup, .mega-header, .mega-top-menu, .mobile-rack', mainlayout);

        // Render the file manager header, folders, files and footer
        this.fmEmptyState();
        this.renderTab();
        this.renderFoldersAndFiles();

        // If a public folder link
        if (pfid) {
            if (M.v.length) {
                this.initFolderLinkBottomBar();
            }

            const bannerHandle = M.currentdirid === M.currentrootid ? pfid : M.currentdirid;
            mobile.appBanner.updateBanner(bannerHandle);
        }

        // Initialise the footer component for Add Folder and Upload File functionality etc
        mobile.cloud.actionBar.init();

        // Hide other pages that may be showing and show the Cloud Drive
        $otherPages.addClass('hidden');

        // Show the excluded element after everything is ready
        $excludes.removeClass('hidden');
    },

    /**
     * Renders updates to the cloud drive without doing a full render, e.g. new
     * files being added by action packets or files being moved out of the folder
     */
    renderUpdate: function() {

        'use strict';

        this.fmEmptyState();

        // Render the file manager header, folders, files and footer
        this.renderFoldersAndFiles(true);

        // Initialise the footer component for Add Folder, Upload File functionality etc
        mobile.cloud.actionBar.init();
    },

    /**
     * After an action packet update to the cloud drive, this function
     * updates the folder and file count for each folder in the current view
     * @param {String} [nodes] Optional, list of the nodes to be updated
     */
    countAndUpdateSubFolderTotals: function(node) {
        'use strict';

        if (node.t === 1) {
            if (M.megaRender) {
                // update only for folder type
                const component = MegaMobileNode.getNodeComponentByHandle(node.h);

                if (component) {
                    component.update('subNodeCount');
                }
            }
            else {
                // update only for folder type
                const domNode = document.getElementById(node.h);

                if (domNode) {
                    domNode.querySelector('.mobile.props .num-files').textContent = fm_contains(node.tf, node.td);
                }
            }
        }
    },

    /**
     * Removes a node from the current view if applicable,
     * shows an empty cloud drive/folder message if applicable
     * @param {String} nodeHandle The handle of the node to be removed
     * @param {String} parentHandle The parent handle of the node to be removed
     */
    renderDelete: function(nodeHandle, parentHandle) {

        'use strict';

        // Remove the node if in the current view
        if (M.megaRender.megaList) {
            M.megaRender.megaList.remove(nodeHandle);
        }
        else {
            const node = document.getElementById(nodeHandle);

            if (node) {
                node.remove();
            }
        }

        // Update M.v after nodes are removed from the view
        for (let k = M.v.length; k--;) {
            const v = M.v[k].h;
            if (v === nodeHandle) {
                if (slideshowid === v) {
                    (function(nodeHandle) {
                        onIdle(() => {
                            slideshow(nodeHandle, !nodeHandle);
                        });
                    })(slideshow_steps().backward[0]);
                }
                M.v.splice(k, 1);
                break;
            }
        }

        // show an Empty message and icon if no files/folders
        this.fmEmptyState();

        // If in the current folder and this got removed, then we need to go back up and open the parent folder
        M.nodeRemovalUIRefresh(nodeHandle, parentHandle);

        mega.ui.header.update();
    },

    /**
     * Renders the files and folders in the mobile folder view
     */
    renderFoldersAndFiles: function(update) {

        'use strict';

        if (pfcol) {
            mega.gallery.albums.initPublicAlbum($('.mobile.file-manager-block .fm-content .fm-list'));
        }
        else {

            document.querySelector('.file-manager-block').classList.remove('hidden');

            if (M.v.length > 0) {
                M.megaRender.renderLayout(update, M.v);
            }
        }
    },

    /**
     * If the cloud drive or folder is empty this shows an icon and message in the current view
     *
     * @returns {void}
     */
    fmEmptyState() {
        'use strict';

        const container = M.megaRender && M.megaRender.container || '';

        if (M.v.length === 0) {
            if (mega.ui.footer && mega.ui.footer.visible) {
                mega.ui.footer.showButton();
            }
            mega.ui.emptyState.show(container);
        }
        else {
            mega.ui.emptyState.hide(container);
        }
    },

    /**
     * Enables the grid view
     * @param {Object} fmBlock The cached element for the file manager
     */
    enableGridView: function(fmBlock) {
        'use strict';

        fmBlock.querySelector('.fm-list').classList.add('grid-view');

        // Save current grid view state for page refreshes/reloads
        if (fmconfig.uiviewmode | 0) {
            mega.config.set('viewmode', 1);
        }
        else {
            fmviewmode(M.currentdirid, 1);
        }

        M.viewmode = 1;

        if (M.megaRender.megaList) {
            M.megaRender.megaList.updateOptions(M.megaRender.getMListOptions());
        }
    },

    /**
     * Enables the list view
     * @param {Object} fmBlock The cached element for the file manager
     */
    enableListView: function(fmBlock) {
        'use strict';
        fmBlock.querySelector('.fm-list').classList.remove('grid-view', 'bigger-node');

        // Save current list view state for page refreshes/reloads
        if (fmconfig.uiviewmode | 0) {
            mega.config.set('viewmode', 0);
        }
        else {
            fmviewmode(M.currentdirid, 0);
        }

        M.viewmode = 0;

        if (M.megaRender.megaList) {
            M.megaRender.megaList.updateOptions(M.megaRender.getMListOptions());
        }
    },

    /**
     * Shows or hides the link icon in the file manager indicating if this file/folder has a public link
     * @param {String} nodeHandle The internal node handle
     */
    updateLinkIcon: function(nodeHandle) {

        'use strict';

        if (M.megaRender) {
            const component = MegaMobileNode.getNodeComponentByHandle(nodeHandle);

            if (component) {
                component.update('linked');
            }
        }
        else {
            const domNode = document.getElementById(nodeHandle);

            if (domNode) {
                // show correct link icon
                const aLinked = M.getNodeShare(nodeHandle);

                if (aLinked) {
                    domNode.classList.remove('linked', 'taken-down');
                    domNode.classList.add(aLinked.down ? 'taken-down' : 'linked');
                }
            }
        }
    },

    /**
     * Checks if a given node is in the view.
     * @return boolean
     */
    nodeInView: function(nodeHandle) {
        'use strict';

        for (var i = 0; i < M.v.length; i++) {
            var n = M.v[i];
            if (n.h === nodeHandle) {
                return true;
            }
        }
        return false;
    },

    /**
     * Scroll the FM to a certain file row.
     * @param handle The file handle
     * @param animationTime Animation time offset (default 500ms).
     */
    scrollToFile: function(handle, animationTime) {
        'use strict';
        var elm = document.getElementById(handle);

        animationTime = animationTime === 0 ? 0 : (animationTime || 500);
        $('.mobile.fm-scrolling').animate({scrollTop: elm && elm.offsetTop || 0}, animationTime);
    },

    /**
     * Tabs for shared items page.
     *
     * @return {void}
     */
    renderTab() {
        'use strict';

        const tabWrap = document.querySelector('.fm-tab');

        if (!tabWrap) {
            return;
        }

        let tab = tabWrap.querySelector('.mega-tab');

        if (tab) {
            tab.component.destroy();
        }

        if (mobile.nodeSelector.active) {

            const seltype = MobileSelectionRender.getType();

            if (seltype.tabs) {
                tab = new MegaMobileTab({
                    parentNode: tabWrap,
                    componentClassname: 'mega-tab',
                    tabs: seltype.tabs,
                    tabContentClassname: 'mega-tab-item'
                });

                const subHeader = document.querySelector('.fm-selection-subheading');

                if (subHeader) {
                    if (M.currentdirid === M.currentrootid) {
                        subHeader.classList.add('hidden');
                        subHeader.textContent = '';
                    }
                    else {
                        subHeader.classList.remove('hidden');
                        subHeader.textContent = M.getNameByHandle(M.currentdirid);
                    }
                }
            }
        }
        else if (M.currentdirid === 'shares' || M.currentdirid === 'out-shares' || M.currentdirid === 'public-links') {
            tabWrap.classList.remove('hidden');
            tab = new MegaMobileTab({
                parentNode: tabWrap,
                componentClassname: 'mega-tab shared-items',
                tabs: [
                    {
                        name : l.incoming,
                        key: 'incoming',
                        active: M.currentdirid === 'shares',
                        type: 'link',
                        href: 'fm/shares'
                    },
                    {
                        name: l.outgoing,
                        key: 'outgoing',
                        active: M.currentdirid === 'out-shares',
                        type: 'link',
                        href: 'fm/out-shares'
                    },
                    {
                        name: l.links,
                        key: 'links',
                        active: M.currentdirid === 'public-links',
                        type: 'link',
                        href: 'fm/public-links'
                    }
                ]
            });
        }
    },

    /**
     * Initialise bottom bar for folder links page
     *
     * @returns {Object} bottom bar component
     */
    async initFolderLinkBottomBar() {
        'use strict';

        console.assert(pfid, 'This bottom bar should only for folder link.');

        const node = M.getNodeByHandle(M.currentdirid);
        const downloadSupport = await MegaMobileViewOverlay.checkSupport(node);
        let actions = [];

        if (pfcol) {
            actions = ['openapp-button', l.view_file_open_in_app,() => {
                eventlog(99912);
                goToMobileApp(MegaMobileViewOverlay.getAppLink(node.h));
            }];
        }
        else if (downloadSupport) {
            actions = ['download-button', l[864], () => {
                eventlog(99913);
                mobile.downloadOverlay.startDownload(node.h);
            }];
        }
        else {
            actions = ['openapp-button', l.view_file_open_in_app, () => {
                eventlog(99912);
                goToMobileApp(MegaMobileViewOverlay.getAppLink(node.h));
            }];
        }

        if (this.bottomBar) {
            this.bottomBar.destroy();
        }

        this.bottomBar = new MegaMobileBottomBar({
            parentNode: document.getElementById('fmholder'),
            actions: [[actions]],
            adWrapper: 'adFolder'
        });
    }
};
