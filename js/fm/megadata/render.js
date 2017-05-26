/**
 * Render cloud listing layout.
 * @param {Boolean} aUpdate  Whether we're updating the list
 */
MegaData.prototype.renderMain = function(aUpdate) {

    // If mobile render an update to the cloud
    if (is_mobile) {

        // If flag is set, just update to show new files
        if (aUpdate) {
            mobile.cloud.renderUpdate();
        }
        else {
            // Otherwise do a full re-render
            mobile.cloud.renderLayout();
        }

        // Don't execute any regular webclient code
        return true;
    }

    var numRenderedNodes = -1;

    if (d) {
        console.time('renderMain');
    }

    // Disable aUpdate flag if a new item was added to an empty
    // folder, so that MegaRender properly uses JSP container..
    if (aUpdate && M.v.length === 1) {
        aUpdate = false;
    }

    // Disable aUpdate flag if a new item was added to an empty
    // folder, so that MegaRender properly uses JSP container..
    if (aUpdate && M.v.length === 1) {
        aUpdate = false;
    }

    if (!aUpdate) {
        this.megaRender = new MegaRender(this.viewmode);
    }

    // cleanupLayout will render an "empty grid" layout if there
    // are no nodes in the current list (Ie, M.v), if so no need
    // to call renderLayout therefore.
    if (this.megaRender.cleanupLayout(aUpdate, this.v, this.fsViewSel)) {

        if (this.currentdirid === 'opc') {
            this.drawSentContactRequests(this.v, 'clearGrid');
        }
        else if (this.currentdirid === 'ipc') {
            this.drawReceivedContactRequests(this.v, 'clearGrid');
        }
        else {
            numRenderedNodes = this.megaRender.renderLayout(aUpdate, this.v);
        }
    }

    // No need to bind mouse events etc (gridUI/iconUI/selecddUI)
    // if there weren't new rendered nodes (Ie, they were cached)
    if (numRenderedNodes) {

        if (!aUpdate) {
            contactUI();

            if (this.viewmode) {
                fa_duplicates = Object.create(null);
                fa_reqcnt = 0;
            }

            if ($.rmItemsInView) {
                $.rmInitJSP = this.fsViewSel;
            }
        }

        this.rmSetupUI(aUpdate);
    }

    if (d) {
        console.timeEnd('renderMain');
    }
};

MegaData.prototype.rmSetupUI = function(u) {
    if (this.viewmode === 1) {
        if (this.v.length > 0) {
            var o = $('.fm-blocks-view.fm .file-block-scrolling');
            o.find('div.clear').remove();
            o.append('<div class="clear"></div>');
        }
        iconUI(u);
        if (!u) {
            fm_thumbnails();
        }
    }
    else {
        Soon(gridUI);
    }
    Soon(fmtopUI);

    if (M.onRenderFinished) {
        Soon(M.onRenderFinished);
        delete M.onRenderFinished;
    }
    $('.grid-scrolling-table .grid-url-arrow').rebind('click', function(e) {
        var target = $(this).closest('tr');
        if (target.attr('class').indexOf('ui-selected') == -1) {
            target.parent().find('tr').removeClass('ui-selected');
        }
        target.addClass('ui-selected');
        e.preventDefault();
        e.stopPropagation(); // do not treat it as a regular click on the file
        e.currentTarget = target;
        cacheselect();
        searchPath();
        if (!$(this).hasClass('active')) {
            contextMenuUI(e, 1);
            $(this).addClass('active');
        }
        else {
            $.hideContextMenu();
            $(this).removeClass('active');
        }
    });

    $('.file-block .file-settings-icon').rebind('click', function(e) {
        var target = $(this).parents('.file-block');
        if (target.attr('class').indexOf('ui-selected') == -1) {
            target.parent().find('a').removeClass('ui-selected');
        }
        target.addClass('ui-selected');
        e.preventDefault();
        e.stopPropagation(); // do not treat it as a regular click on the file
        e.currentTarget = target;
        cacheselect();
        searchPath();
        if (!$(this).hasClass('active')) {
            $(this).addClass('active');
            contextMenuUI(e, 1);
        }
        else {
            $(this).removeClass('active');
            $.hideContextMenu();
        }
    });

    if (!u) {

        if (this.currentrootid === 'shares') {

            function prepareShareMenuHandler(e) {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget = $('#treea_' + M.currentdirid);
                e.calculatePosition = true;
                $.selected = [M.currentdirid];
            }

            $('.shared-details-info-block .grid-url-arrow').rebind('click', function(e) {
                prepareShareMenuHandler(e);
                if (!$(this).hasClass('active')) {
                    contextMenuUI(e, 1);
                    $(this).addClass('active');
                }
                else {
                    $.hideContextMenu();
                    $(this).removeClass('active');
                }
            });

            $('.shared-details-info-block .fm-share-download').rebind('click', function(e) {
                prepareShareMenuHandler(e);
                var $this = $(this);
                e.clientX = $this.offset().left;
                e.clientY = $this.offset().top + $this.height()

                if (!$(this).hasClass('active')) {
                    contextMenuUI(e, 3);
                    $(this).addClass('active');
                }
                else {
                    $.hideContextMenu();
                    $(this).removeClass('active');
                }
            });

            $('.shared-details-info-block .fm-share-copy').rebind('click', function(e) {
                $.copyDialog = 'copy'; // this is used like identifier when key with key code 27 is pressed
                $.mcselected = M.RootID;
                $('.copy-dialog .dialog-copy-button').addClass('active');
                $('.copy-dialog').removeClass('hidden');
                handleDialogContent('cloud-drive', 'ul', true, 'copy', 'Paste');
                $('.fm-dialog-overlay').removeClass('hidden');
                $('body').addClass('overlayed');
            });

            // From inside a shared directory e.g. #fm/INlx1Kba and the user clicks the 'Leave share' button
            $('.shared-details-info-block .fm-leave-share').rebind('click', function(e) {
                loadingDialog.show();

                // Get the share ID from the hash in the URL
                var shareId = getSitePath().replace('/fm/', '');

                // Remove user from the share
                leaveShare(shareId);
            });
        }
    }
};

MegaData.prototype.renderShare = function(h) {
    var html = '';
    if (M.d[h].shares) {
        for (var u in M.d[h].shares) {
            if (M.u[u]) {
                var rt = '';
                var sr = {r0: '', r1: '', r2: ''};
                if (M.d[h].shares[u].r == 0) {
                    rt = l[55];
                    sr.r0 = ' active';
                }
                else if (M.d[h].shares[u].r == 1) {
                    rt = l[56];
                    sr.r1 = ' active';
                }
                else if (M.d[h].shares[u].r == 2) {
                    rt = l[57];
                    sr.r2 = ' active';
                }

                html += '<div class="add-contact-item" id="' + u + '"><div class="add-contact-pad">'
                    + useravatar.contact(u) + 'span class="add-contact-username">' + htmlentities(M.u[u].m)
                    + '</span><div class="fm-share-dropdown">' + rt
                    + '</div><div class="fm-share-permissions-block hidden"><div class="fm-share-permissions'
                    + sr.r0 + '" id="rights_0">' + l[55] + '</div><div class="fm-share-permissions' + sr.r1
                    + '" id="rights_1">' + l[56] + '</div><div class="fm-share-permissions' + sr.r2
                    + '" id="rights_2">' + l[57] + '</div><div class="fm-share-permissions" id="rights_3">' + l[83]
                    + '</div></div></div></div>';
            }
        }
        $('.share-dialog .fm-shared-to').html(html);
        $('.share-dialog .fm-share-empty').addClass('hidden');
        $('.share-dialog .fm-shared-to').removeClass('hidden');
    }
    else {
        $('.share-dialog .fm-share-empty').removeClass('hidden');
        $('.share-dialog .fm-shared-to').addClass('hidden');
    }
};

MegaData.prototype.renderTree = function() {
    var build = function(h) {
        return M.buildtree({h: h}, M.buildtree.FORCE_REBUILD);
    };

    var promise = MegaPromise.allDone([build('shares'), build(M.RootID), build(M.RubbishID), build(M.InboxID)]);

    promise.done(function() {
        M.contacts();
        delay(treeUI);
    });

    return promise;
};


MegaData.prototype.pathLength = function() {
    var length = $('.fm-right-header .fm-breadcrumbs-block:visible').outerWidth()
        + $('.fm-right-header .fm-header-buttons:visible').outerWidth();
    return length;
};

MegaData.prototype.renderPath = function() {
    var name, hasnext = '', typeclass,
        html = '<div class="clear"></div>',
        a2 = this.getPath(this.currentdirid),
        contactBreadcrumb = '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
            + '<span class="right-arrow-bg">'
            + '<span>' + l[950] + ' </span>'
            + '</span>'
            + '</a>';

    if (a2.length > 2 && a2[a2.length - 2].length === 11) {
        delete a2[a2.length - 2];
    }

    for (var i in a2) {
        name = '';
        if (a2[i] === this.RootID) {
            if (folderlink && M.d[this.RootID]) {
                name = M.d[this.RootID].name;
                typeclass = 'folder';
            }
            else {
                typeclass = 'cloud-drive';
            }
        }
        else if (a2[i] === 'contacts') {
            typeclass = 'contacts';
            name = l[165];
        }
        else if (a2[i] === 'opc') {
            typeclass = 'sent-requests';
            name = l[5862];
        }
        else if (a2[i] === 'ipc') {
            typeclass = 'received-requests';
            name = l[5863];
        }
        else if (a2[i] === 'shares') {
            typeclass = 'shared-with-me';
            name = '';
        }
        else if (a2[i] === this.RubbishID) {
            typeclass = 'rubbish-bin';
            name = l[167];
        }
        else if (a2[i] === 'messages' || a2[i] === M.InboxID) {
            typeclass = 'messages';
            name = l[166];
        }
        else {
            var n = M.d[a2[i]];
            if (n && n.name) {
                name = n.name;
            }
            if (a2[i].length === 11) {
                typeclass = 'contact';
            }
            else {
                typeclass = 'folder';
            }
        }
        html = '<a class="fm-breadcrumbs ' + typeclass + ' ' + hasnext
            + ' ui-droppable" id="path_' + htmlentities(a2[i]) + '">'
            + '<span class="right-arrow-bg ui-draggable">'
            + '<span>' + htmlentities(name) + '</span>'
            + '</span>'
            + '</a>' + html;
        hasnext = 'has-next-button';
    }

    if (this.currentdirid && this.currentdirid.substr(0, 5) === 'chat/') {
        var contactName = $('a.fm-tree-folder.contact.lightactive span.contact-name').text();
        $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
            '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
            + '<span class="right-arrow-bg">'
            + '<span>Contacts</span>'
            + '</span></a>'
            + '<a class="fm-breadcrumbs chat" id="path_'
            + htmlentities(M.currentdirid.replace("chat/", "")) + '">'
            + '<span class="right-arrow-bg">'
            + '<span>' + htmlentities(contactName) + '</span>'
            + '</span>'
            + '</a>');
        $('.search-files-result').addClass('hidden');
    }
        else if (this.currentdirid === 'links') {
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
                '<a class="fm-breadcrumbs public-links">'
                    + '<span class="right-arrow-bg ui-draggable">'
                        + '<span>'
                            + '<i class="small-icon context get-link"></i>'
                            + l[16516]
                            + '<span class="public-links-cnt">0</span>'
                        + '</span>'
                    + '</span>'
                + '</a>');

            if (M.su.EXP) {
                $('.public-links-cnt').text(Object.keys(M.su.EXP).length);
            }
            else {
                $('.public-links-cnt').text(0);
            }
        }
    else if (this.currentdirid && this.currentdirid.substr(0, 7) === 'search/') {
        $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
            '<a class="fm-breadcrumbs search ui-droppable" id="'
            + htmlentities(a2[i]) + '">'
            + '<span class="right-arrow-bg ui-draggable">'
            + '<span>' + htmlentities(this.currentdirid.replace('search/', ''))
            + '</span>'
            + '</span>'
            + '</a>');
        $('.search-files-result .search-number').text(M.v.length);
        $('.search-files-result').removeClass('hidden');
        $('.search-files-result').addClass('last-button');
    }
    else if (this.currentdirid && this.currentdirid === 'opc') {
        DEBUG('Render Path OPC');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(contactBreadcrumb + html);
    }
    else if (this.currentdirid && this.currentdirid === 'ipc') {
        DEBUG('Render Path IPC');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(contactBreadcrumb + html);
    }
    else {
        $('.search-files-result').addClass('hidden');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(html);
    }

    // Resizing breadcrumbs items
    function breadcrumbsResize() {
        var $fmHeader = $('.fm-right-header:visible');
        var headerWidth = $fmHeader.outerWidth();

        $fmHeader.removeClass('long-path short-foldernames');
        if (M.pathLength() > headerWidth) {
            $fmHeader.addClass('long-path');
        }

        var $el = $fmHeader.find('.fm-breadcrumbs-block:visible .right-arrow-bg');
        var i = 0;
        var j = 0;
        $el.removeClass('short-foldername ultra-short-foldername');

        while (M.pathLength() > headerWidth) {
            if (i < $el.length - 1) {
                $($el[i]).addClass('short-foldername');
                i++;
            }
            else if (j < $el.length - 1) {
                $($el[j]).addClass('ultra-short-foldername');
                j++;
            }
            else if (!$($el[j]).hasClass('short-foldername')) {
                $($el[j]).addClass('short-foldername');
            }
            else {
                $($el[j]).addClass('ultra-short-foldername');
                break;
            }
        }
    }

    breadcrumbsResize();
    $(window).bind('resize.fmbreadcrumbs', function() {
        breadcrumbsResize();
    });

    if ($('.fm-right-header .fm-breadcrumbs-block .fm-breadcrumbs').length > 1) {
        $('.fm-right-header .fm-breadcrumbs-block').removeClass('deactivated');
    }
    else {
        $('.fm-right-header .fm-breadcrumbs-block').addClass('deactivated');
    }

    $('.fm-right-header .fm-breadcrumbs-block a').unbind('click');
    $('.fm-right-header .fm-breadcrumbs-block a').bind('click', function() {
        var crumbId = $(this).attr('id');

        // When NOT deactivated
        if (!$('.fm-right-header .fm-breadcrumbs-block').hasClass('deactivated')) {
            if (crumbId === 'path_opc' || crumbId === 'path_ipc') {
                return false;
            }
            else if ((crumbId === 'chatcrumb') || (M.currentdirid && M.currentdirid.substr(0, 7) === 'search/')) {
                return false;
            }

            // Remove focus from 'view ipc/opc' buttons
            $('.fm-received-requests').removeClass('active');
            $('.fm-contact-requests').removeClass('active');
            M.openFolder($(this).attr('id').replace('path_', ''));
        }
    });

    if (folderlink) {
        $('.fm-breadcrumbs:first').removeClass('folder').addClass('folder-link');
        $('.fm-breadcrumbs:first span').empty();
    }
};
