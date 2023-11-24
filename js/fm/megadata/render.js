/**
 * Render cloud listing layout.
 * @param {Boolean} aUpdate  Whether we're updating the list
 */
MegaData.prototype.renderMain = function(aUpdate) {
    'use strict';
    var container;
    var numRenderedNodes = -1;

    if (d) {
        console.time('renderMain');
    }

    if (!aUpdate) {
        if (this.megaRender) {
            this.megaRender.destroy();
        }
        this.megaRender = new MegaRender(this.viewmode);
    }
    else if (!this.megaRender) {

        console.timeEnd('renderMain');
        return;
    }

    if (this.previousdirid === "recents" && this.recentsRender) {
        this.recentsRender.cleanup();
    }

    // cleanupLayout will render an "empty grid" layout if there
    // are no nodes in the current list (Ie, M.v), if so no need
    // to call renderLayout therefore.
    if (this.megaRender.cleanupLayout(aUpdate, this.v, this.fsViewSel)) {
        numRenderedNodes = this.megaRender.renderLayout(aUpdate, this.v);
        container = this.megaRender.container;
    }

    // No need to bind mouse events etc (gridUI/iconUI/selecddUI)
    // if there weren't new rendered nodes (Ie, they were cached)
    if (numRenderedNodes) {
        if (!aUpdate) {
            if (this.viewmode) {
                thumbnails.cleanup();
            }
        }
        this.rmSetupUI(aUpdate, aUpdate ? !!$.dbOpenHandle : false);
    }

    this.initShortcutsAndSelection(container, aUpdate);

    if (!container || typeof container === 'string') {
        this.megaRender.destroy();
        delete this.megaRender;
    }
    else if (!aUpdate) {
        Object.defineProperty(this, 'rmItemsInView', {
            get() {
                const l = Object(M.megaRender).megaList;
                const c = l && l._calculated || false;
                return c.itemsPerPage + c.itemsPerRow | 0;
            },
            configurable: true
        });
    }

    if (d) {
        console.timeEnd('renderMain');
    }
};


/**
 * Helper for M.renderMain
 * @param {Boolean} u Whether we're just updating the list
 */
MegaData.prototype.rmSetupUI = function(u, refresh) {
    'use strict';
    if (this.gallery) {
        return;
    }

    if (this.viewmode === 1) {
        M.addIconUI(u, refresh);
    }
    else {
        M.addGridUIDelayed(refresh);
    }
    if (!u) {
        fm_thumbnails();
    }
    onIdle(fmtopUI);

    if (this.onRenderFinished) {
        onIdle(this.onRenderFinished);
        delete this.onRenderFinished;
    }

    var cmIconHandler = function _cmIconHandler(listView, elm, ev, options) {
        const isDefault = typeof options === 'undefined';
        const postEventHandler = options && options.post || null;

        $.hideContextMenu(ev);
        var target = listView ? $(this).closest('tr') : $(this).parents('.data-block-view');

        if (!target.hasClass('ui-selected')) {
            target.parent().find(elm).removeClass('ui-selected');
            selectionManager.clear_selection();
        }
        target.addClass('ui-selected');

        selectionManager.add_to_selection(target.attr('id'));
        $.gridLastSelected = target[0];

        ev.preventDefault();
        ev.stopPropagation(); // do not treat it as a regular click on the file
        ev.currentTarget = target;

        if (isDefault) {
            delay('render:search_breadcrumbs', () => M.renderSearchBreadcrumbs());

            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
            }
            else {
                M.contextMenuUI(ev, 1);
                $(this).addClass('active');
            }
        }

        if (postEventHandler) {
            postEventHandler.call(this, target.attr('id'));
        }

        return false;
    };

    const cvHandler = (ev, element) => {
        if (!element.hasClass('ui-selected')) {
            element.parent().find(true).removeClass('ui-selected');
            selectionManager.clear_selection();
        }
        element.addClass('ui-selected');
        ev.preventDefault();
        ev.stopPropagation(); // do not treat it as a regular click on the file
        ev.currentTarget = element;

        selectionManager.add_to_selection(element.attr('id'));
        return fingerprintDialog(M.d[$.selected[0]].su);
    };

    $('.grid-scrolling-table .grid-url-arrow').rebind('click', function(ev) {
        return cmIconHandler.call(this, true, 'tr', ev);
    });
    $('.data-block-view .file-settings-icon').rebind('click', function(ev) {
        return cmIconHandler.call(this, false, 'a', ev);
    });
    $('.grid-scrolling-table .fm-user-verification span').rebind('click.sharesui', function(ev) {
        var target = $(this).closest('tr');
        return cvHandler(ev, target);
    });
    $('.shared-blocks-view .fm-user-verification span').rebind('click.sharesui', function(ev) {
        var target = $(this).closest('a');
        return cvHandler(ev, target);
    });
    if (M.currentrootid === 'file-requests') {
        mega.fileRequest.rebindListManageIcon({
            iconHandler: cmIconHandler
        });
    }

    if (!u) {

        // Re-add the searchbar dropdown event listeners
        mega.ui.searchbar.addDropdownEventListeners();

        if (this.currentrootid === 'shares') {
            let savedUserSelection = null;

            var prepareShareMenuHandler = function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget = $('#treea_' + M.currentdirid);
                e.calculatePosition = true;
                if (d) {
                    console.assert(e.currentTarget.length === 1, `Tree ${M.currentdirid} not found.`, e);
                }
            };

            $('.shared-details-info-block .grid-url-arrow').rebind('click.sharesui', function(e) {
                const $this = $(this);
                prepareShareMenuHandler(e);
                if ($this.hasClass('active')) {
                    $this.removeClass('active');
                    $.hideContextMenu();

                    $.selected = savedUserSelection || [];
                    savedUserSelection = false;

                    if (window.selectionManager) {
                        return selectionManager.reinitialize();
                    }
                }
                else {
                    $.hideContextMenu();

                    // Replace the selection to the parent node
                    if (window.selectionManager) {
                        savedUserSelection = selectionManager.get_selected();
                        selectionManager.resetTo(M.currentdirid);
                    }
                    else {
                        savedUserSelection = $.selected;
                        $.selected = [M.currentdirid];
                    }
                    M.contextMenuUI(e, 1);
                    $this.addClass('active');
                }
            });

            $('.shared-details-info-block .fm-share-download').rebind('click', function(e) {
                const $this = $(this);
                if ($this.hasClass('disabled')) {
                    console.warn('disabled');
                    return false;
                }
                prepareShareMenuHandler(e);

                if ($this.hasClass('active')) {
                    $this.removeClass('active');
                    $.hideContextMenu();

                    if (window.selectionManager) {
                        selectionManager.clear_selection();
                    }
                    else {
                        $.selected = [];
                    }
                }
                else {
                    $.hideContextMenu();
                    $this.addClass('active disabled');
                    megasync.isInstalled((err, is) => {
                        if (!$this.hasClass('disabled')) {
                            return false;
                        }
                        $this.removeClass('disabled');

                        if (window.selectionManager) {
                            // selectionManager.resetTo(M.currentdirid);
                            selectionManager.select_all();
                        }
                        else {
                            $.selected = [M.currentdirid];
                        }

                        if (!err || is) {
                            M.addDownload($.selected);
                        }
                        else {
                            const {top, left} = $this.offset();
                            e.clientY = top + $this.height();
                            e.clientX = left;
                            M.contextMenuUI(e, 3);
                        }
                    });
                }
            });

            $('.shared-details-info-block .fm-share-copy').rebind('click', function () {
                if (!$.selected || !$.selected.length) {
                    var $selectedFromTree = $('#treesub_shares' + ' .nw-fm-tree-item.selected');
                    if ($selectedFromTree && $selectedFromTree.length) {
                        var tempTree = [];
                        for (var i = 0; i < $selectedFromTree.length; i++) {
                            var selectedElement = $selectedFromTree[i].id;
                            tempTree.push(selectedElement.replace('treea_', ''));
                        }
                        $.selected = tempTree;
                    }
                }
                openCopyDialog();
            });

            // From inside a shared directory e.g. #fm/INlx1Kba and the user clicks the 'Leave share' button
            $('.shared-details-info-block .fm-leave-share').rebind('click', function(e) {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                // Get the share ID from the hash in the URL
                var shareId = getSitePath().replace('/fm/', '');

                // Remove user from the share
                M.leaveShare(shareId).catch(ex => {
                    if (ex === EMASTERONLY) {
                        msgDialog('warningb', '',
                                  l.err_bus_sub_leave_share_dlg_title, l.err_bus_sub_leave_share_dlg_text);
                    }
                });
            });
        }
    }
};

MegaData.prototype.renderTree = function() {
    'use strict';
    var build = tryCatch(function(h) {
        M.buildtree({h: h}, M.buildtree.FORCE_REBUILD);
    });

    if (s4.ui) {
        build('s4');
    }
    build('shares');

    // We are no longer build this tree, however, just leave this for potential later usage.
    // build('out-shares');
    // build('public-links');
    // build(M.InboxID);

    build(M.RootID);
    build(M.RubbishID);

    M.addTreeUIDelayed();
};

MegaData.prototype.hideEmptyGrids = function hideEmptyGrids() {
    'use strict';
    const excluded = ['.transfer-panel-empty-txt', '.fm-recents', '.fm-empty-contacts'];
    $(`.fm-empty-section:not(${excluded.join(',')})`).addClass('hidden');
    $('.fm-empty-section.fm-empty-sharef').remove();
};

/**
 * A function, which would be called on every DOM update (or scroll). This func would implement
 * throttling, so that we won't update the UI components too often.
 *
 */
MegaData.prototype.rmSetupUIDelayed = function(ms) {
    'use strict';
    delay('rmSetupUI', () => this.rmSetupUI(false, true), Math.max(ms | 0, 75));
};

MegaData.prototype.megaListRemoveNode = function(aNode, aHandle) {
    'use strict';
    const {megaRender} = M;
    if (!megaRender) {
        if (d) {
            console.warn('Ignoring invalid MegaRender state..', aHandle);
        }
        return false;
    }

    aHandle = aHandle || aNode.id;
    const node = megaRender.revokeDOMNode(aHandle, true);
    if (!node) {
        if (d) {
            console.warn('revokeDOMNode failed..', aHandle);
        }
        return false;
    }
    return true;
};

MegaData.prototype.megaListRenderNode = function(aHandle) {
    'use strict';
    var megaRender = M.megaRender;
    if (!megaRender) {
        if (d) {
            console.warn('Ignoring invalid MegaRender state..', aHandle);
        }
        return false;
    }
    if (!M.d[aHandle]) {
        if (d) {
            console.warn("megaListRenderNode was called with aHandle '%s' which was not found in M.d", aHandle);
        }
        return false;
    }
    megaRender.numInsertedDOMNodes++;

    var node = megaRender.getDOMNode(aHandle);
    if (!node) {
        if (d) {
            console.warn('getDOMNode failed..', aHandle);
        }
        return false;
    }

    if (!is_mobile) {
        if (!node.__hasMCV) {
            node.__hasMCV = true;
            megaRender.setDOMColumnsWidth(node);
        }

        var selList = selectionManager && selectionManager.selected_list ? selectionManager.selected_list : $.selected;

        if (selList && selList.length) {
            if (selList.includes(aHandle)) {
                node.classList.add('ui-selected');
            }
            else {
                node.classList.remove('ui-selected');
            }
            node.classList.remove('ui-selectee');
        }
        else if (selList && selList.length === 0) {
            node.classList.remove('ui-selected');
        }
    }

    if (M.d[aHandle]) {
        M.d[aHandle].seen = true;
    }

    return node;
};

/**
 * Render a simplified "chat is loading" state UI for when the chat is still not ready but an /fm/chat(?/...) url was
 * accessed.
 */
MegaData.prototype.renderChatIsLoading = function() {
    'use strict';
    M.onSectionUIOpen('conversations');

    M.hideEmptyGrids();

    $('.fm-files-view-icon').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.files-grid-view').addClass('hidden');
    $('.fm-right-account-block').addClass('hidden');

    $('.shared-grid-view,.shared-blocks-view').addClass('hidden');

    $('.fm-right-files-block, .fm-left-panel').addClass('hidden');

    $('.section.conversations').removeClass('hidden');
    $('.section.conversations .fm-chat-is-loading').removeClass('hidden');
};
