function voucherCentering(button) {
    var popupBlock = $('.fm-voucher-popup');
    var rigthPosition = $('.fm-account-main').outerWidth() - $(popupBlock).outerWidth();
    var buttonMid = button.width() / 2;
    popupBlock.css('top', button.position().top - 141);
}

function deleteScrollPanel(from, data) {
    var jsp = $(from).data(data);
    if (jsp) {
        jsp.destroy();
    }
}

function initAccountScroll(scroll)
{
    $('.fm-account-main').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true});
    jScrollFade('.fm-account-main');
    if (scroll) {
        var jsp = $('.fm-account-main').data('jsp');
        if (jsp) {
            jsp.scrollToBottom();
        }
    }
}

function initGridScrolling()
{
    $('.grid-scrolling-table').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade('.grid-scrolling-table');
}

function initSelectScrolling(scrollBlock)
{
    $(scrollBlock).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scrollBlock);
}

function initFileblocksScrolling()
{
    $('.file-block-scrolling').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade('.file-block-scrolling');
}

function initFileblocksScrolling2()
{
    $('.contact-details-view .file-block-scrolling').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade('.contact-details-view .file-block-scrolling');
}

function initContactsGridScrolling() {
    var scroll = '.grid-scrolling-table.contacts';
    deleteScrollPanel(scroll, 'jsp');
    $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scroll);
}

/**
 * initTextareaScrolling
 *
 * @param {Object} $textarea. DOM textarea element.
 * @param {Number} textareaMaxHeight Textarea max height. Default is 100
 * @param {Boolean} resizeEvent If we need to bind window resize event
 */
function initTextareaScrolling($textarea, textareaMaxHeight, resizeEvent) {
    var textareaWrapperClass = $textarea.parent().attr('class'),
          $textareaClone,
          textareaLineHeight = parseInt($textarea.css('line-height'))
          textareaMaxHeight = textareaMaxHeight ? textareaMaxHeight: 100;

    // Textarea Clone block to define height of autoresizeable textarea
    if (!$textarea.next('div').length) {
        $('<div></div>').insertAfter($textarea);
    }
    $textareaClone = $textarea.next('div');

    function textareaScrolling(keyEvents) {
        var $textareaScrollBlock = $textarea.closest('.textarea-scroll'),
              $textareaCloneSpan,
              textareaContent = $textarea.val(),
              cursorPosition = $textarea.getCursorPosition(),
              jsp = $textareaScrollBlock.data('jsp'),
              viewLimitTop = 0,
              scrPos = 0,
              viewRatio = 0;

        // Set textarea height according to  textarea clone height
        textareaContent = '<span>'+textareaContent.substr(0, cursorPosition) +
                          '</span>' + textareaContent.substr(cursorPosition, textareaContent.length);

        // try NOT to update the DOM twice if nothing had changed (and this is NOT a resize event).
        if (keyEvents && $textareaClone.data('lastContent') === textareaContent) {
            return;
        }
        else {
            $textareaClone.data('lastContent', textareaContent);
            textareaContent = textareaContent.replace(/\n/g, '<br />');
            $textareaClone.safeHTML(textareaContent + '<br />');
        }

        var textareaCloneHeight = $textareaClone.height();
        $textarea.height(textareaCloneHeight);
        $textareaCloneSpan = $textareaClone.children('span');
        var textareaCloneSpanHeight = $textareaCloneSpan.height();
        scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
        viewRatio = Math.round(textareaCloneSpanHeight + scrPos);

        // Textarea wrapper scrolling init
        if (textareaCloneHeight > textareaMaxHeight) {
            $textareaScrollBlock.jScrollPane(
                {enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: false});
            if (!jsp && keyEvents) {
                $textarea.focus();
            }
        }
        else if (jsp) {
            jsp.destroy();
            if (keyEvents) {
                $textarea.focus();
            }
        }

        // Scrolling according cursor position
        if (viewRatio > textareaLineHeight || viewRatio < viewLimitTop) {
            jsp = $textareaScrollBlock.data('jsp');
            if (textareaCloneSpanHeight > 0 && jsp) {
                jsp.scrollToY(textareaCloneSpanHeight - textareaLineHeight);
            }
            else if (jsp) {
                jsp.scrollToY(0);
            }
        }
        $textarea.trigger('autoresized');
    }

    // Init textarea scrolling
    textareaScrolling();

    // Reinit scrolling after keyup/keydown/paste events
    $textarea.off('keyup keydown paste');
    $textarea.on('keyup keydown paste', function() {
        textareaScrolling(1);
    });

    // Bind window resize if textarea is resizeable
    if (resizeEvent) {
        var eventName = textareaWrapperClass.replace(/[_\s]/g, '');
        $(window).bind('resize.' + eventName, function () {
            textareaScrolling();
        });
    }
}

/**
 * Sent Contact Requests
 *
 *
 */
function initOpcGridScrolling() {
    var scroll = '.grid-scrolling-table.opc';
    deleteScrollPanel(scroll, 'jsp');
    $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scroll);
}

/**
 * Received Contact Requests
 *
 *
 */
function initIpcGridScrolling() {
    var scroll = '.grid-scrolling-table.ipc';
    deleteScrollPanel(scroll, 'jsp');
    $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scroll);
}

function initContactsBlocksScrolling() {
    var scroll = '.contacts-blocks-scrolling';
    if ($('.contacts-blocks-scrolling:visible').length === 0) {
        return;
    }
    deleteScrollPanel(scroll, 'jsp');
    $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scroll);
}

function initShareBlocksScrolling() {
    var scroll = '.shared-blocks-scrolling';
    if ($('.shared-blocks-scrolling:visible').length === 0) {
        return;
    }
    deleteScrollPanel(scroll, 'jsp');
    $(scroll).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    jScrollFade(scroll);
}

function initTransferScroll()
{
    $('.transfer-scrolling-table').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, verticalDragMinHeight: 20});
    jScrollFade('.transfer-scrolling-table');
}

function initTreeScroll()
{
    if (d) console.time('treeScroll');
    /**
     if (localStorage.leftPaneWidth && $('.fm-left-panel').css('width').replace("px", "") != localStorage.leftPaneWidth)
     {
     $('.fm-left-panel').css({'width': localStorage.leftPaneWidth + "px"});
     }
     **/

    // .fm-tree-panel's with .manual-tree-panel-scroll-management would manage their jscroll pane by themself.
    $('.fm-tree-panel:not(.manual-tree-panel-scroll-management)').jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true});
    // $('.fm-tree-panel').unbind('jsp-scroll-y.droppable');
    // $('.fm-tree-panel').bind('jsp-scroll-y.droppable',function(event, scrollPositionY, isAtTop, isAtBottom)
    // {
    // var t =Math.random();
    // $.scroller=t;
    // setTimeout(function()
    // {
    // if (t == $.scroller) treeDroppable();
    // },100);
    // });
    jScrollFade('.fm-tree-panel:not(.manual-tree-panel-scroll-management)');
    if (d) console.timeEnd('treeScroll');
}

var ddtreedisabled = {};
function treeDroppable()
{
    // if (d) console.time('treeDroppable');
    var tt = $('.fm-tree-panel .jspPane').position().top;
    var toptop = false;
    $('.fm-tree-panel .ui-droppable').each(function(i, e)
    {
        var id = $(e).attr('id');
        if (!id)
        {
            $(e).uniqueId();
            id = $(e).attr('id');
        }
        if (toptop || (tt + $(e).height() + $(e).position().top - 10 > 0))
        {
            toptop = 1;
            if (ddtreedisabled[id])
            {
                delete ddtreedisabled[id];
                $(e).droppable("enable");
            }
        }
        else
        {
            ddtreedisabled[id] = 1;
            $(e).droppable("disable");
        }
    });
    // if (d) console.timeEnd('treeDroppable');
}

function cacheselect()
{
    $.selected = [];
    $($.selectddUIgrid + ' ' + $.selectddUIitem).each(function(i, o) {
        if ($(o).hasClass('ui-selected')) {
            $.selected.push($(o).attr('id'));
        }
    });
}

function hideEmptyGrids() {
    $('.fm-empty-trashbin,.fm-empty-contacts,.fm-empty-search,.fm-empty-cloud,.fm-invalid-folder').addClass('hidden');
    $('.fm-empty-folder,.fm-empty-incoming,.fm-empty-folder-link').addClass('hidden');
    $('.fm-empty-pad.fm-empty-sharef').remove();
}

function reselect(n)
{
    $('.ui-selected').removeClass('ui-selected');
    if (typeof $.selected == 'undefined')
        $.selected = [];
    for (var i in $.selected)
    {
        $('#' + $.selected[i]).addClass('ui-selected');
        if (n)
        {
            $('#' + $.selected[i] + ' .grid-status-icon').addClass('new');
            $('#' + $.selected[i] + ' .file-status-icon').addClass('new');
        }
    }
    if (n)
    {
        if (M.viewmode)
        {
            var jsp = $('.file-block-scrolling').data('jsp');
            var el = $('a.ui-selected');
        }
        else
        {
            var jsp = $('.grid-scrolling-table').data('jsp');
            var el = $('tr.ui-selected');
        }
        if (el.length > 0)
            el = el[0];
        else
            el = false;
        if (el && jsp)
            jsp.scrollToElement(el);
    }
}

var treesearch = false;

function treeredraw()
{
    $('li.tree-item-on-search-hidden').removeClass('tree-item-on-search-hidden');

    if (M.currentrootid == M.RootID)
        M.buildtree(M.d[M.RootID]);
    if (M.currentrootid === M.InboxID)
        M.buildtree(M.d[M.InboxID]);
    else if (M.currentrootid == M.RubbishID)
        M.buildtree({h: M.RubbishID});
    else if (M.currentrootid == 'shares')
        M.buildtree({h: 'shares'});
    else if (M.currentrootid == 'contacts')
        M.contacts();
    else if (M.currentrootid == 'chat')
    {
        console.log('render the entire contact list filtered by search query into the conversations list');
    }
    treeUI();
}

function treePanelType() {
    return $.trim($('.nw-fm-left-icon.active').attr('class').replace(/(active|nw-fm-left-icon|ui-droppable)/g, ''));
}

function initUI() {
    if (d) {
        console.time('initUI');
    }
    $('.not-logged .fm-not-logged-button.create-account').rebind('click', function()
    {
        document.location.hash = 'register';
    });

    $('.fm-dialog-overlay').rebind('click.fm', function()
    {
        closeDialog();
        $.hideContextMenu();
    });
    if (folderlink)
    {
        $('.fm-main').addClass('active-folder-link');
        $('.activity-status-block').hide();
    }
    else
    {
        $('.fm-tree-header.cloud-drive-item').text(l[164]);
        $('.fm-tree-header').not('.cloud-drive-item').show();
        $('.fm-left-menu .folderlink').addClass('hidden');
        $('.fm-main').removeClass('active-folder-link');
    }

    var sortMenu = new mega.SortMenu();

    sortMenu.treeSearchUI();
    sortMenu.initializeTreePanelSorting();
    sortMenu.initializeDialogTreePanelSorting();

    $.doDD = function(e, ui, a, type)
    {

        function nRevert(r)
        {
            try {
                $(ui.draggable).draggable("option", "revert", false);
                if (r)
                    $(ui.draggable).remove();
            } catch (e) {
            }
        }
        var c = $(ui.draggable.context).attr('class');
        var t, ids, dd;


        if (c && c.indexOf('nw-fm-tree-item') > -1)
        {
            // tree dragged:
            var id = $(ui.draggable.context).attr('id');
            if (id.indexOf('treea_') > -1) {
                ids = [id.replace('treea_', '')];
            }
            else if (id.indexOf('contact_') > -1) {
                ids = [id.replace('contact_', '')];
            }
        }
        else
        {
            // grid dragged:
            if ($.selected && $.selected.length > 0)
                ids = $.selected;
        }

        // Workaround a problem where we get over[1] -> over[2] -> out[1]
        if (a === 'out' && $.currentOver !== $(e.target).attr('id'))
            a = 'noop';

        if (type == 1)
        {
            // tree dropped:
            var c = $(e.target).attr('class');
            if (c && c.indexOf('nw-fm-left-icon') > -1)
            {
                dd = 'nw-fm-left-icon';
                if (a == 'drop')
                {
                    if (c.indexOf('cloud') > -1) {
                        t = M.RootID;
                    }
                    else if (c.indexOf('rubbish-bin') > -1) {
                        t = M.RubbishID;
                    }
                    else if (c.indexOf('transfers') > -1) {
                        dd = 'download';
                    }
                }
            }
            else if (c && c.indexOf('nw-fm-tree-item') > -1 && !$(e.target).visible(!0))
                dd = 'download';
            else if (
                $(e.target).is('ul.conversations-pane > li') ||
                $(e.target).closest('ul.conversations-pane > li').size() > 0 ||
                $(e.target).is('.messages-block')
            ) {
                if (M.isFile(ids)) {
                    dd = 'chat-attach';
                }
                else {
                    dd = 'noop';
                }
            }
            else
            {
                var t = $(e.target).attr('id');
                if (t && t.indexOf('treea_') > -1)
                    t = t.replace('treea_', '');
                else if (t && t.indexOf('path_') > -1)
                    t = t.replace('path_', '');
                else if (t && t.indexOf('contact2_') > -1)
                    t = t.replace('contact2_', '');
                else if (t && t.indexOf('contact_') > -1)
                    t = t.replace('contact_', '');
                else if (M.currentdirid !== 'shares' || !M.d[t] || RootbyId(t) !== 'shares')
                    t = undefined;
            }
        }
        else
        {
            // grid dropped:
            var c = $(e.target).attr('class');
            if (c && c.indexOf('folder') > -1)
                t = $(e.target).attr('id');
        }

        if (ids && ids.length && t)
        {
            dd = ddtype(ids, t, e.altKey);
            if (dd === 'move' && e.altKey)
                dd = 'copy';
        }

        if (a !== 'noop')
        {
            if ($.liTimerK)
                clearTimeout($.liTimerK);
            $('body').removeClassWith('dndc-');
            $('.hide-settings-icon').removeClass('hide-settings-icon');
        }
        if (a == 'drop' || a == 'out' || a == 'noop')
        {
            $(e.target).removeClass('dragover');
            // if (a !== 'noop') $('.dragger-block').addClass('drag');
        }
        else if (a == 'over')
        {
            var id = $(e.target).attr('id');
            if (!id)
            {
                $(e.target).uniqueId();
                id = $(e.target).attr('id');
            }

            $.currentOver = id;
            setTimeout(function()
            {
                if ($.currentOver == id)
                {
                    var h;
                    if (id.indexOf('treea_') > -1)
                        h = id.replace('treea_', '');
                    else
                    {
                        var c = $(id).attr('class');
                        if (c && c.indexOf('cloud-drive-item') > -1)
                            h = M.RootID;
                        else if (c && c.indexOf('recycle-item') > -1)
                            h = M.RubbishID;
                        else if (c && c.indexOf('contacts-item') > -1)
                            h = 'contacts';
                    }
                    if (h)
                        treeUIexpand(h, 1);
                    else if ($(e.target).hasClass('nw-conversations-item'))
                        $(e.target).click();
                    else if ($(e.target).is('ul.conversations-pane > li')) {
                        $(e.target).click();
                    }
                }
            }, 890);

            if (dd == 'move')
                $.draggingClass = ('dndc-move');
            else if (dd == 'copy')
                $.draggingClass = ('dndc-copy');
            else if (dd == 'download')
                $.draggingClass = ('dndc-download');
            else if (dd === 'nw-fm-left-icon')
            {
                var c = '' + $(e.target).attr('class');

                if (~c.indexOf('rubbish-bin'))
                    $.draggingClass = ('dndc-to-rubbish');
                else if (~c.indexOf('shared-with-me'))
                    $.draggingClass = ('dndc-to-shared');
                else if (~c.indexOf('contacts'))
                    $.draggingClass = ('dndc-to-contacts');
                else if (~c.indexOf('conversations')) {
                    $.draggingClass = ('dndc-to-conversations');
                }
                else if (~c.indexOf('cloud-drive'))
                    $.draggingClass = ('dndc-to-conversations'); // TODO: cursor, please?
                else
                    c = null;

                if (c)
                {
                    if ($.liTooltipTimer)
                        clearTimeout($.liTooltipTimer);
                    $.liTimerK = setTimeout(function() {
                        $(e.target).click()
                    }, 920);
                }
            }
            else if (dd === 'chat-attach') {
                $.draggingClass = ('dndc-to-conversations');
            }
            // else $('.dragger-block').addClass('drag');
            else {
                $.draggingClass = ('dndc-warning');
            }

            $('body').addClass($.draggingClass);

            $(e.target).addClass('dragover');
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            if ($(e.target).hasClass('folder'))
            {
                $(e.target).addClass('ui-selected').find('.file-settings-icon, .grid-url-arrow').addClass('hide-settings-icon');
            }
        }
        // if (d) console.log('!a:'+a, dd, $(e.target).attr('id'), (M.d[$(e.target).attr('id').split('_').pop()]||{}).name, $(e.target).attr('class'), $(ui.draggable.context).attr('class'));


        if ((a === 'drop') && dd) {
            if (dd === 'nw-fm-left-icon') {
                // do nothing
            }
            else if (
                $(e.target).hasClass('nw-conversations-item') ||
                dd === 'chat-attach'
            ) {
                nRevert();

                // drop over a chat window
                var currentRoom = megaChat.getCurrentRoom();
                assert(currentRoom, 'Current room missing - this drop action should be impossible.');
                currentRoom.attachNodes(ids);
            }
            else if (dd === 'move') {
                nRevert(t !== M.RubbishID);
                $.moveids = ids;
                $.movet = t;
                setTimeout(function() {
                    if ($.movet === M.RubbishID) {
                        $.selected = $.moveids;
                        fmremove();
                    }
                    else {
                        M.moveNodes($.moveids, $.movet);
                    }
                }, 50);
            }
            else if ((dd === 'copy') || (dd === 'copydel')) {
                nRevert();
                $.copyids = ids;
                $.copyt = t;
                setTimeout(function() {
                    M.copyNodes($.copyids, $.copyt, (dd === 'copydel'), function() {

                        // Update files count...
                        if (M.currentdirid === 'shares' && !M.viewmode) {
                            M.openFolder('shares', 1);
                        }
                    }, function(error) {
                        if (error === EOVERQUOTA) {
                            return msgDialog('warninga', l[135], l[8435]);
                        }
                        return msgDialog('warninga', l[135], l[47], api_strerror(error));
                    });
                }, 50);
            }
            else if (dd === 'download') {
                nRevert();
                var as_zip = e.altKey;
                M.addDownload(ids, as_zip);
            }
            $('.dragger-block').hide();
        }
    };
    InitFileDrag();
    createFolderUI();
    M.buildRootSubMenu();
    initContextUI();
    copyDialog();
    moveDialog();
    initShareDialog();
    transferPanelUI();
    UIkeyevents();
    addContactUI();

    $('.fm-files-view-icon').rebind('click', function() {

        $.hideContextMenu();
        cacheselect();
        if ($(this).attr('class').indexOf('listing-view') > -1) {
            if (fmconfig.uiviewmode) {
                mega.config.set('viewmode', 0);
            }
            else {
                fmviewmode(M.currentdirid, 0);
            }
            M.openFolder(M.currentdirid, true);
        }
        else {
            if (fmconfig.uiviewmode) {
                mega.config.set('viewmode', 1);
            }
            else {
                fmviewmode(M.currentdirid, 1);
            }
            M.openFolder(M.currentdirid, true);
        }
        reselect();

        return false;
    });

    $.hideContextMenu = function(event) {

        var a, b, currentNodeClass;

        if (event && event.target) {
            currentNodeClass = $(event.target).attr('class');
            if (!currentNodeClass) {
                currentNodeClass = $(event.target).parent();
                if (currentNodeClass) {
                    currentNodeClass = $(currentNodeClass).attr('class');
                }
            }
            if (currentNodeClass && currentNodeClass.indexOf('dropdown') > -1
                && (currentNodeClass.indexOf('download-item') > -1
                || currentNodeClass.indexOf('move-item') > -1)
                && currentNodeClass.indexOf('active') > -1) {
                return false;
            }
        }

        $('.nw-sorting-menu').addClass('hidden');
        $('.fm-start-chat-dropdown').addClass('hidden').removeClass('active');
        $('.start-chat-button').removeClass('active');
        $('.nw-tree-panel-arrows').removeClass('active');
        $('.context-menu-item.dropdown').removeClass('active');
        $('.fm-tree-header').removeClass('dragover');
        $('.nw-fm-tree-item').removeClass('dragover');
        $('.nw-fm-tree-item.hovered').removeClass('hovered');

        // Set to default
        a = $('.context-menu.files-menu,.context-menu.download');
        a.addClass('hidden');
        b = a.find('.context-submenu');
        b.attr('style', '');
        b.removeClass('active left-position overlap-right overlap-left mega-height');
        a.find('.disabled,.context-scrolling-block').removeClass('disabled context-scrolling-block');
        a.find('.context-menu-item.contains-submenu.opened').removeClass('opened');

        // Remove all sub-menues from context-menu move-item
        $('#csb_' + M.RootID).empty();
    };

    $('#fmholder').rebind('click.contextmenu', function(e) {
        $.hideContextMenu(e);
        if ($.hideTopMenu) {
            $.hideTopMenu(e);
        }
        var $target = $(e.target);
        var exclude = '.upgradelink, .campaign-logo, .resellerbuy, .linkified, a.red';

        if ($target.attr('data-reactid') || $target.is('.chatlink')) {
            // chat can handle its own links..no need to return false on every "click" and "element" :O
            return;
        }
        if ($target.attr('type') !== 'file'
                && !$target.is(exclude)
                && !$target.parent().is(exclude)) {
            return false;
        }
    });

    $('.fm-back-button').rebind('click', function(e) {

        if (!M.currentdirid) {
            return;
        }

        if (M.currentdirid == 'notifications'
            || M.currentdirid.substr(0, 7) == 'search/'
            || M.currentdirid.substr(0, 5) == 'chat/') {
            window.history.back();
        }
        else {
            var n = M.d[M.currentdirid];
            if ((n && n.p && M.d[n.p]) || (n && n.p === 'contacts')) {
                M.openFolder(n.p);
            }
        }
    });

    $('.fm-right-header.fm').removeClass('hidden');

    if (folderlink) {
        $('.fm-tree-header.cloud-drive-item span').text('');
    }
    else {
        folderlink = 0;
    }

    M.avatars();

    if ((typeof dl_import !== 'undefined') && dl_import) {
        importFile();
    }

    $('.context-menu').rebind('contextmenu', function(e) {
        if (!localStorage.contextmenu)
            e.preventDefault();
    });

    $('.nw-fm-left-icon').rebind('contextmenu', function(ev) {
        contextMenuUI(ev,1);
        return false;
    });

    var fmTabState;
    $('.nw-fm-left-icon').rebind('click', function() {
        treesearch = false;
        var clickedClass = $(this).attr('class');
        if (!clickedClass) {
            return;
        }
        if (!fmTabState || fmTabState['cloud-drive'].root !== M.RootID) {
            fmTabState = {
                'cloud-drive':    { root: M.RootID,    prev: null },
                'folder-link':    { root: M.RootID,    prev: null },
                'shared-with-me': { root: 'shares',    prev: null },
                'conversations':  { root: 'chat',      prev: null },
                'contacts':       { root: 'contacts',  prev: null },
                'transfers':      { root: 'transfers', prev: null },
                'account':        { root: 'account',  prev: null },
                'inbox':          { root: M.InboxID,   prev: null },
                'rubbish-bin':    { root: M.RubbishID, prev: null }
            };
        }

        var activeClass = (''+$('.nw-fm-left-icon.active:visible')
            .attr('class')).split(" ").filter(function(c) {
                return !!fmTabState[c];
            })[0];

        var activeTab = fmTabState[activeClass];
        if (activeTab) {
            if (activeTab.root === M.currentrootid) {
                activeTab.prev = M.currentdirid;
                M.lastActiveTab = activeClass;
            }
            else if (d) {
                console.warn('Root mismatch', M.currentrootid, M.currentdirid, activeTab);
            }
        }

        if ($(this).hasClass('account')) {
            if (u_type === 0) {
                ephemeralDialog(l[7687]);
            }
            else {
                document.location.hash = 'fm/account';
            }
            return false;
        }

        for (var tab in fmTabState) {
            if (~clickedClass.indexOf(tab)) {
                tab = fmTabState[tab];

                var targetFolder = null;

                // Clicked on the currently active tab, should open the root (e.g. go back)
                if (~clickedClass.indexOf(activeClass)) {
                    targetFolder = tab.root;
                }
                else if (tab.prev && M.d[tab.prev]) {
                    targetFolder = tab.prev;
                }
                else {
                    targetFolder = tab.root
                }

                M.openFolder(targetFolder, true);

                break;
            }
        }
    });

    $('.nw-fm-left-icon').unbind('mouseover');
    $('.nw-fm-left-icon').bind('mouseover', function() {
        var tooltip = $(this).find('.nw-fm-left-tooltip');
        if ($.liTooltipTimer)
            clearTimeout($.liTooltipTimer);
        $.liTooltipTimer = window.setTimeout(
            function() {
                $(tooltip).addClass('hovered');
            }, 1000);
    });

    $('.nw-fm-left-icon').unbind('mouseout');
    $('.nw-fm-left-icon').bind('mouseout', function() {
        $(this).find('.nw-fm-left-tooltip').removeClass('hovered');
        clearTimeout($.liTooltipTimer);
    });

    if (dlMethod.warn && !localStorage.browserDialog && !$.browserDialog)
    {
        setTimeout(browserDialog, 2000);
    }

    var lPane = $('.fm-left-panel');
    $.leftPaneResizable = new FMResizablePane(lPane, {
        'direction': 'e',
        'minWidth': 200,
        'maxWidth': 400,
        'persistanceKey': 'leftPaneWidth',
        'handle': '.left-pane-drag-handle'
    });

    if (fmconfig.leftPaneWidth) {
        lPane.width(Math.min(
            $.leftPaneResizable.options.maxWidth,
            Math.max($.leftPaneResizable.options.minWidth, fmconfig.leftPaneWidth)
            ));
    }

    $($.leftPaneResizable).on('resize', function() {
        var w = lPane.width()
        if (w >= $.leftPaneResizable.options.maxWidth) {
            $('.left-pane-drag-handle').css('cursor', 'w-resize')
        } else if (w <= $.leftPaneResizable.options.minWidth) {
            $('.left-pane-drag-handle').css('cursor', 'e-resize')
        } else {
            $('.left-pane-drag-handle').css('cursor', 'we-resize')
        }
        $(window).trigger('resize');
    });

    $(window).rebind('resize.fmrh hashchange.fmrh', fm_resize_handler);
    if (d) {
        console.timeEnd('initUI');
    }
}

function transferPanelContextMenu(target)
{
    var file;
    var tclear;

    $('.context-menu.files-menu .context-menu-item').hide();
    var menuitems = $('.context-menu.files-menu .context-menu-item');

    menuitems.filter('.transfer-pause,.transfer-play,.move-up,.move-down,.transfer-clear')
        .show();

    tclear = menuitems.filter('.transfer-clear').contents().last().get(0) || {};
    tclear.textContent = l[103];

    if (target === null && (target = $('.transfer-table tr.ui-selected')).length > 1) {
        var ids = target.attrs('id');
        var finished = 0;
        var paused = 0;
        var started = false;

        ids.forEach(function(id) {
            file = GlobalProgress[id];
            if (!file) {
                finished++;
            }
            else {
                if (file.paused) {
                    paused++;
                }
                if (file.started) {
                    started = true;
                }
            }
        });

        if (finished === ids.length) {
            menuitems.hide()
                .filter('.transfer-clear')
                .show();
            tclear.textContent = (l[7218] || 'Clear transfer');
        }
        else {
            if (started) {
                menuitems.filter('.move-up,.move-down').hide();
            }
            if (paused === ids.length) {
                menuitems.filter('.transfer-pause').hide();
            }

            var prev = target.first().prev();
            var next = target.last().next();

            if (prev.length === 0 || !prev.hasClass('transfer-queued')) {
                menuitems.filter('.move-up').hide();
            }
            if (next.length === 0) {
                menuitems.filter('.move-down').hide();
            }
        }
    }
    else if (!(file = GlobalProgress[$(target).attr('id')])) {
        /* no file, it is a finished operation */
        menuitems.hide()
            .filter('.transfer-clear')
            .show();
        tclear.textContent = (l[7218] || 'Clear transfer');
    }
    else {
        if (file.started) {
            menuitems.filter('.move-up,.move-down').hide();
        }
        if (file.paused) {
            menuitems.filter('.transfer-pause').hide();
        } else {
            menuitems.filter('.transfer-play').hide();
        }

        if (!target.prev().length || !target.prev().hasClass('transfer-queued')) {
            menuitems.filter('.move-up').hide();
        }
        if (target.next().length === 0) {
            menuitems.filter('.move-down').hide();
        }
    }

    // XXX: Hide context-menu's menu-up/down items for now to check if that's the
    // origin of some problems, users can still use the new d&d logic to move transfers
    menuitems.filter('.move-up,.move-down').hide();

    if (target.length === 1 && target.eq(0).attr('id').match(/^dl_/) && !!localStorage.d) {
        menuitems.filter('.network-diagnostic').show();
    }


    var parent = menuitems.parent();
    parent
        .children('.context-menu-divider').hide().end()
        .children('.pause-item-divider').show().end()

    if (parent.height() < 56) {
        parent.find('.pause-item-divider').hide();
    }
}

function openTransferpanel()
{
    $.tresizer();
    $('.nw-fm-left-icon.transfers').addClass('transfering');
    // Start the new transfer right away even if the queue is paused?
    // XXX: Remove fm_tfspause calls at M.addDownload/addUpload to enable this
    /*if (uldl_hold) {
        uldl_hold = false;
        dlQueue.resume();
        ulQueue.resume();
        $('.transfer-pause-icon').removeClass('active').find('span').text(l[6993]);
        $('.nw-fm-left-icon.transfers').removeClass('paused');
    }*/
    // $(window).trigger('resize'); // this will call initTreeScroll();

    if ($('table.transfer-table tr').length > 1) {
        $('.transfer-clear-all-icon').removeClass('hidden');
    }

    if (!$.mSortableT) {
        $.mSortableT = $('.transfer-table tbody');
        $.mSortableT.sortable({
            delay: 200,
            revert: 100,
            start: function(ev, ui) {
                $('body').addClass('dndc-sort');
            },
            helper: function(ev, tr) {
                if (!tr.hasClass('ui-selected')) {
                    tr.addClass('ui-selected');
                }
                this.order = fm_tfsorderupd();
                var $selected = tr.parent().children('.ui-selected').clone();
                tr.data('multidrag', $selected).siblings('.ui-selected').hide();
                var $helper = $('<tr/>');
                return $helper.append($selected);
            },
            stop: function(ev, ui) {
                var cancel = false;
                $('body').removeClass('dndc-sort');

                var $selected = ui.item.data('multidrag');
                ui.item.after($selected).remove();
                $('.transfer-table tr.ui-selected:not(:visible)').remove();
                $.transferHeader(); // rebind cloned trs

                // var $tr = $(ui.item[0]);
                // var id = String($tr.attr('id'));
                // var $next = $tr.next();

                /*if ($selected.hasClass('started')) {
                    cancel = true;
                }
                else {
                    var $prev = $tr.prev();
                    var pid = $prev.attr('id');
                    var nid = $next.attr('id');

                    cancel = ((id[0] === 'u' && nid && nid[0] !== 'u')
                            || (id[0] !== 'u' && pid && pid[0] === 'u'));
                }*/
                if (cancel) {
                    $.mSortableT.sortable('cancel');
                }
                else {
                    var order = fm_tfsorderupd();

                    if (JSON.stringify(order) !== JSON.stringify(this.order)) {
                        var mDL = {
                            pos: 0,
                            etmp: [],
                            oQueue: [],
                            pQueue: {},
                            mQueue: dlQueue,
                            m_queue: dl_queue,
                            prop: 'dl'
                        };
                        var mUL = {
                            pos: 0,
                            etmp: [],
                            oQueue: [],
                            pQueue: {},
                            mQueue: ulQueue,
                            m_queue: ul_queue,
                            prop: 'ul'
                        };
                        var id;
                        var dst;
                        var i = 0;
                        var len = Object.keys(order).length / 2;

                        [dl_queue, ul_queue].forEach(function(queue) {
                            var t_queue = queue.filter(isQueueActive);
                            if (t_queue.length !== queue.length) {
                                var m = t_queue.length;
                                var i = 0;
                                while (i < m) {
                                    (queue[i] = t_queue[i]).pos = i;
                                    ++i;
                                }
                                queue.length = i;
                                while (queue[i]) {
                                    delete queue[i++];
                                }
                            }
                        });

                        while (len > i) {
                            id = M.t[i++];

                            dst = (id[0] === 'u' ? mUL : mDL);
                            var mQ = dst.mQueue.slurp(id);
                            // for (var x in mQ) {
                                // if (mQ.hasOwnProperty(x)) {
                                    // var entry = mQ[x][0][dst.prop];
                                    // if (dst.etmp.indexOf(entry) === -1) {
                                        // (dst.m_queue[dst.pos] = entry).pos = dst.pos;
                                        // dst.etmp.push(entry);
                                        // dst.pos++;
                                    // }
                                // }
                            // }
                            dst.oQueue = dst.oQueue.concat(mQ);

                            if (dst.mQueue._qpaused.hasOwnProperty(id)) {
                                dst.pQueue[id] = dst.mQueue._qpaused[id];
                            }
                        }

                        dlQueue._queue = mDL.oQueue;
                        ulQueue._queue = mUL.oQueue;
                        dlQueue._qpaused = mDL.pQueue;
                        ulQueue._qpaused = mUL.pQueue;

                        // Check for transfers moved before any started one
                        var $prev = $('.transfer-table tr.transfer-started')
                            .first()
                            .prevAll()
                            .not('.transfer-paused');
                        // XXX: we rely on the speed field being non-numeric
                        if ($prev.length && !$prev.find('.speed').text().replace(/\D/g, '')) {
                            var ids = $('.transfer-table tr:not(.transfer-paused)').attrs('id');
                            ids.forEach(fm_tfspause);
                            if (dlQueue._queue.length || ulQueue._queue.length) {
                                dlmanager.logger.error('The move operation should have cleared the queues.');
                            }
                            ids.forEach(fm_tfsresume);
                            i = 0;
                            mDL.pQueue = {};
                            mUL.pQueue = {};
                            while (len > i) {
                                id = M.t[i++];
                                dst = (id[0] === 'u' ? mUL : mDL);
                                if (dst.mQueue._qpaused.hasOwnProperty(id)) {
                                    dst.pQueue[id] = dst.mQueue._qpaused[id];
                                }
                            }
                            dlQueue._qpaused = mDL.pQueue;
                            ulQueue._qpaused = mUL.pQueue;
                        }
                    }
                }

                $('.transfer-table tr.ui-selected').removeClass('ui-selected');
            }
        });
    }
}

function showTransferToast(t_type, t_length, isPaused) {
    if (!$('.fmholder').hasClass('transfer-panel-opened')) {
        var $toast,
            $second_toast,
            timer,
            nt_txt;

        if (t_type != 'u') {
            timer = dl_interval;
            $toast = $('.toast-notification.download');
            $second_toast = $('.toast-notification.upload');
            if (t_length > 1) {
                nt_txt = l[12481].replace('%1', t_length);
            } else {
                nt_txt = l[7222];
            }
        } else {
            timer = ul_interval;
            $toast = $('.toast-notification.upload');
            $second_toast = $('.toast-notification.download');
            if (t_length > 1) {
                nt_txt = l[12480].replace('%1', t_length);
            } else {
                nt_txt = l[7223];
            }
        }
        if (uldl_hold || isPaused) {
            nt_txt += '<b> (' + l[1651] + ') </b>';
        }

        $toast.find('.toast-col:first-child span').safeHTML(nt_txt);

        if ($second_toast.hasClass('visible')) {
            $second_toast.addClass('second');
        }

        clearTimeout(timer);
        $toast.removeClass('second hidden').addClass('visible');
        timer = setTimeout(function() {
            hideTransferToast($toast);
        }, 5000);

        $('.transfer .toast-button').rebind('click', function(e)
        {
            $('.toast-notification').removeClass('visible second');
            if (!$('.slideshow-dialog').hasClass('hidden')) {
                $('.slideshow-dialog').addClass('hidden');
                $('.slideshow-overlay').addClass('hidden');
            }
            // M.openFolder('transfers', true);
            $('.nw-fm-left-icon.transfers').click();
        });

        $('.toast-close-button', $toast).rebind('click', function()
        {
            $(this).closest('.toast-notification').removeClass('visible');
            $('.toast-notification').removeClass('second');
        });

        $toast.rebind('mouseover', function(e)
        {
            clearTimeout(timer);
        });
        $toast.rebind('mouseout', function(e)
        {
            timer = setTimeout(function() {
                hideTransferToast($toast);
            }, 5000);
        });
    }
}

function hideTransferToast ($toast) {
    $toast.removeClass('visible');
    $('.toast-notification').removeClass('second');
}

function isValidShareLink()
{
    var valid = true;
    for (var i in u_nodekeys) {
        valid = valid && typeof u_nodekeys[i] == "object"
    }
    return valid;
}

function removeUInode(h, parent) {

    var n = M.d[h],
        i = 0;

    // check subfolders
    if (n && n.t) {
        var cns = M.c[n.p];
        if (cns) {
            for (var cn in cns) {
                if (M.d[cn] && M.d[cn].t && cn !== h) {
                    i++;
                    break;
                }
            }
        }
    }

    var hasItems = !!M.v.length;
    switch (M.currentdirid) {
        case "shares":
            $('#treeli_' + h).remove();// remove folder and subfolders
            if (!hasItems) {
                $('.files-grid-view .grid-table-header tr').remove();
                $('.fm-empty-cloud').removeClass('hidden');
            }
            break;
        case "contacts":

            //Clear left panel:
            $('#contact_' + h).fadeOut('slow', function() {
                $(this).remove();
            });

            //Clear right panel:
            $('.grid-table.contacts tr#' + h + ', .contacts-blocks-scrolling a#' + h)
                .fadeOut('slow', function() {
                    $(this).remove();
                });

            // clear the contacts grid:
            $('.contacts-grid-view #' + h).remove();
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
                $('.fm-empty-contacts').removeClass('hidden');
            }
            break;
        case "chat":
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-chat').removeClass('hidden');
            }
            break;
        case M.RubbishID:
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }

            // Remove item
            $('#' + h).remove();

            // Remove folder and subfolders
            $('#treeli_' + h).remove();
            if (!hasItems) {
                $('.contacts-grid-view .contacts-grid-header tr').remove();
                $('.fm-empty-trashbin').removeClass('hidden');
            }
            break;
        case M.RootID:
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }

            // Remove item
            $('#' + h).remove();

            // Remove folder and subfolders
            $('#treeli_' + h).remove();
            if (!hasItems) {
                $('.files-grid-view').addClass('hidden');
                $('.grid-table.fm tr').remove();
                $('.fm-empty-cloud').removeClass('hidden');
            }
            break;
        default:
            if (i == 0 && n) {
                $('#treea_' + n.p).removeClass('contains-folders expanded');
            }
            $('#' + h).remove();// remove item
            $('#treeli_' + h).remove();// remove folder and subfolders
            if (!hasItems) {
                if (sharedFolderUI()) {
                    M.emptySharefolderUI();
                }
                else {
                    $('.files-grid-view').addClass('hidden');
                    $('.fm-empty-folder').removeClass('hidden');
                }
                $('.grid-table.fm tr').remove();
            }
            break;
    }

    if (M.currentdirid === h || isCircular(h, M.currentdirid) === true) {
        parent = parent || Object(M.getNodeByHandle(h)).p || RootbyId(h);
        M.openFolder(parent);
    }
}

/**
 * addContactToFolderShare
 *
 * Add verified email addresses to folder shares.
 */
function addContactToFolderShare() {

    var targets = [],
        $shareDialog = $('.share-dialog'),
        $newContacts, permissionLevel, iconPermLvl, permissionClass, selectedNode;

    // Share button enabled
    if (($.dialog === 'share') && !$shareDialog.find('.dialog-share-button').is('.disabled')) {

        selectedNode = $.selected[0];
        $newContacts = $shareDialog.find('.token-input-list-mega .token-input-token-mega');

        loadingDialog.show();

        // Is there a new contacts planned for addition to share
        if ($newContacts.length) {

            // Determin current group permission level
            iconPermLvl = $shareDialog.find('.permissions-icon')[0];
            permissionClass = checkMultiInputPermission($(iconPermLvl));
            permissionLevel = sharedPermissionLevel(permissionClass[0]);

            // Add new planned contact to list
            $.each($newContacts, function(ind, val) {
                targets.push({ u: $(val).contents().eq(1).text(), r: permissionLevel });
            });
        }

        closeDialog();
        $('.export-links-warning').addClass('hidden');

        // Add new contacts to folder share
        if (targets.length > 0) {
            doShare(selectedNode, targets, true);
        }

        loadingDialog.hide();
    }
}

/**
 * addNewContact
 *
 * User adding new contact/s from add contact dialog.
 * @param {String} $addBtnClass, contact dialog add button class, i.e. .add-user-popup-button.
 */
function addNewContact($addButton) {

    var mailNum, msg, title, email, emailText, $mails;

    // Add button is enabled
    if (!$addButton.is('.disabled') && $addButton.is('.add')) {

        // Check user type
        if (u_type === 0) {
            ephemeralDialog(l[997]);
        }
        else {

            // Custom text message
            emailText = $('.add-user-textarea textarea').val();

            // List of email address planned for addition
            $mails = $('.token-input-list-mega .token-input-token-mega');

            mailNum = $mails.length;

            if (mailNum) {

                // Loop through new email list
                $mails.each(function(index, value) {

                    // Extract email addresses one by one
                    email = $(value).contents().eq(1).text();

                    // Make sure that API return positive value, otherwise we have API error
                    if (!M.inviteContact(M.u[u_handle].m, email, emailText)) {

                        // Singular or plural
                        if (index === mailNum - 1) {
                            if (mailNum === 1) {
                                title = l[150]; // Contact invited
                                msg = l[5898].replace('[X]', email); // The user [X] has been invited and will appear in your contact list once accepted."
                            }
                            else {
                                title = l[165] + ' ' + l[5859]; // Contacts Invited
                                msg = l[5899]; // The users have been invited and will appear in your contact list once accepted
                            }

                            closeDialog();
                            msgDialog('info', title, msg);
                            $('.token-input-token-mega').remove();
                        }
                    }
                });
            }
        }
    }

    // Cancel button clicked, close dialog
    else if ($addButton.is('.cancel')) {
        closeDialog();
    }
}

/**
 * sharedUInode
 *
 * Handle shared/export link icons in Cloud Drive
 * @param {String} nodeHandle, selected node id
 */
function sharedUInode(nodeHandle) {

    var oShares;
    var bExportLink = false;
    var bAvailShares = false;
    var UiExportLink = new mega.UI.Share.ExportLink();
    var share = new mega.Share();

    if (!fminitialized) {
        if (d) {
            UiExportLink.logger.warn('Skipping sharedUInode call...');
        }
        return;
    }
    if (d) {
        UiExportLink.logger.debug('Entering sharedUInode...');
    }

    // Is there a full share or pending share available
    if ((M.d[nodeHandle] && M.d[nodeHandle].shares) || M.ps[nodeHandle]) {

        // Contains full shares and/or export link
        oShares = M.d[nodeHandle] && M.d[nodeHandle].shares;

        // Do we have export link for selected node?
        if (oShares && oShares.EXP) {

            UiExportLink.addExportLinkIcon(nodeHandle);

            // Item is taken down, make sure that user is informed
            if (oShares.EXP.down === 1) {
                UiExportLink.addTakenDownIcon(nodeHandle);
            }

            bExportLink = true;
        }

        // Add share icon in left panel for selected node only if we have full or pending share
        // Don't show share icon when we have export link only
        if (share.isShareExist([nodeHandle], true, true, false)) {

            // Left panel
            $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').addClass('shared-folder');

            bAvailShares = true;
        }
    }

    // t === 1, folder
    if (M.d[nodeHandle] && M.d[nodeHandle].t) {
        var icon = fileIcon(M.d[nodeHandle]);

        // Update right panel selected node with appropriate icon for list view
        $('.grid-table.fm #' + nodeHandle + ' .transfer-filtype-icon').addClass(icon);

        // Update right panel selected node with appropriate icon for block view
        $('#' + nodeHandle + '.file-block .block-view-file-type').addClass(icon);
    }

    // If no shares are available, remove share icon from left panel, right panel (list and block view)
    if (!bAvailShares) {
        $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').removeClass('shared-folder'); // Left panel
        $('.grid-table.fm #' + nodeHandle + ' .transfer-filtype-icon').removeClass('folder-shared'); // Right panel list view
        $('#' + nodeHandle + '.file-block .block-view-file-type').removeClass('folder-shared'); // Right panel block view
    }

    // If no export link is available, remove export link from left and right panels (list and block view)
    if (!bExportLink) {
        UiExportLink.removeExportLinkIcon(nodeHandle);
    }
}

/**
 * getContactsEMails
 *
 * Loop through all available contacts, full and pending ones (outgoing and incomming)
 * and creates a list of contacts email addresses.
 * @returns {Array} contacts, array of contacts email.
 */
function getContactsEMails() {

    var contact,
        contacts = [];
    var contactName = '';

    // Loop through full contacts
    M.u.forEach(function(contact) {
        // Active contacts with email set
        if (contact.c === 1 && contact.m) {
            contacts.push({ id: contact.m, name: M.getNameByHandle(contact.u) });
        }
    });

    // Loop through outgoing pending contacts
    for (var k in M.opc) {
        if (M.opc.hasOwnProperty(k)) {
            contact = M.opc[k];
            contactName = M.getNameByHandle(M.opc[k].p);

            // Is contact deleted
            if (!contact.dts) {
                contacts.push({ id: contact.m, name: contactName });
            }
        }
    }

    // Loop through incomming pending contacts
    for (var m in M.ipc) {
        if (M.ipc.hasOwnProperty(m)) {
            contact = M.ipc[m];
            contactName = M.getNameByHandle(M.ipc[m].p);

            // Is there a email available
            if (contact.m) {
                contacts.push({ id: contact.m, name: contactName });
            }
        }
    }

    return contacts;
}

/**
 * initAddDialogInputPlugin
 */
function initAddDialogMultiInputPlugin() {

    // Plugin configuration
    var contacts = getContactsEMails();
    var $this  = $('.add-contact-multiple-input');
    var $scope = $this.parents('.add-user-popup');

    $this.tokenInput(contacts, {
        theme: 'mega',
        hintText: l[5908],
        //hintText: '',
        //placeholder: 'Type in an email or contact',
        searchingText: '',
        noResultsText: '',
        addAvatar: true,
        autocomplete: null,
        searchDropdown: true,
        emailCheck: true,
        preventDoublet: true,
        tokenValue: 'id',
        propertyToSearch: 'id',
        resultsLimit: 5,
        // Prevent showing of drop down list with contacts email addresses
        // Max allowed email address is 254 chars
        minChars: 255,
        accountHolder: (M.u[u_handle] || {}).m || '',
        scrollLocation: 'add',
        // Exclude from dropdownlist only emails/names which exists in multi-input (tokens)
        excludeCurrent: false,
        onEmailCheck: function() {
            errorMsg(l[7415]);
        },
        onDoublet: function(u) {
            errorMsg(l[7413]);
        },
        onHolder: function() {
            errorMsg(l[7414]);
        },
        onReady: function() {
            var $input = $this.parent().find('li input').eq(0);
            $input.rebind('keyup', function() {
                var value = $.trim($input.val());
                if ($scope.find('li.token-input-token-mega').length > 0 || checkMail(value) === false) {
                    $scope.find('.add-user-popup-button.add').removeClass('disabled');
                } else {
                    $scope.find('.add-user-popup-button.add').addClass('disabled');
                }
            });
        },
        onAdd: function() {

            var itemNum = $('.token-input-list-mega .token-input-token-mega').length,
                $addUserPopup = $('.add-user-popup');

            $('.add-user-popup-button.add').removeClass('disabled');

            // In case of 1 contact use singular
            if (itemNum === 1) {
                $addUserPopup.find('.nw-fm-dialog-title').text(l[101]); // Add Contact
            }
            else { // Use plural
                $addUserPopup.find('.nw-fm-dialog-title').text(l[5911]); // Add Contacts

                var $inputTokens = $addUserPopup.find('.share-added-contact.token-input-token-mega'),
                    $multiInput = $addUserPopup.find('.multiple-input'),
                    h1 = $inputTokens.outerHeight(true),// margin included
                    h2 = $multiInput.height();

                // show/hide scroll box
                if (5 <= h2 / h1 && h2 / h1 < 6) {
                    $multiInput.jScrollPane({
                        enableKeyboardNavigation: false,
                        showArrows: true,
                        arrowSize: 8,
                        animateScroll: true
                    });
                    setTimeout(function() {
                        $addUserPopup.find('.token-input-input-token-mega input').focus();
                    }, 0);
                }
            }
        },
        onDelete: function() {

            var itemNum,
                $addUserPopup = $('.add-user-popup');

            setTimeout(function() {
                $addUserPopup.find('.token-input-input-token-mega input').blur();
            }, 0);

            // Get number of emails
            itemNum = $('.token-input-list-mega .token-input-token-mega').length;


            if (itemNum === 0) {
                $('.add-user-popup-button.add').addClass('disabled');
                $addUserPopup.find('.nw-fm-dialog-title').text(l[101]); // Add Contact

            }
            else if (itemNum === 1) {
                $('.add-user-popup-button.add').removeClass('disabled');
                $('.add-user-popup .nw-fm-dialog-title').text(l[101]); // Add Contact

            }
            else {
                $('.add-user-popup-button.add').removeClass('disabled');
                $('.add-user-popup .nw-fm-dialog-title').text(l[101]);

                var $inputTokens = $addUserPopup.find('.share-added-contact.token-input-token-mega'),
                    $multiInput = $addUserPopup.find('.multiple-input'),
                    $scrollBox = $('.multiple-input .jspPane')[0],
                    h1 = $inputTokens.outerHeight(true),// margin included
                    h2 = 0;

                // Calculate complete scroll box height
                if ($scrollBox) {
                    h2 = $scrollBox.scrollHeight;
                }
                else { // Just multi input height
                    h2 = $multiInput.height();
                }

                if (h2 / h1 < 6) {
                    clearScrollPanel('.add-user-popup');
                }
            }
        }
    });

    /**
     * errorMsg
     *
     * Show error popup next to multi input box in case that email is wrong.
     * @param {String} msg, error message.
     */
    function errorMsg(msg) {

        var $addUserPopup = $('.add-user-popup'),
            $warning = $addUserPopup.find('.multiple-input-warning span');

        $warning.text(msg);
        $addUserPopup.addClass('error');

        setTimeout(function() {
            $addUserPopup.removeClass('error');
        }, 3000);
    }
}

/**
 * addContactUI
 *
 * Handle add contact dialog UI
 */
function addContactUI() {

    // not for ephemeral
    if (!u_type) {
        return;
    }

    function iconSize(par) {

        // full size icon, popup at bottom of Add contact button
        if (par) {
            $('.add-user-size-icon')
                .removeClass('short-size')
                .addClass('full-size');
        }

        // short size icon, centered dialog
        else {
            $('.add-user-size-icon')
                .removeClass('full-size')
                .addClass('short-size');
        }
    };

    function focusOnInput() {
        var $tokenInput = $('#token-input-');

        $tokenInput
            .val('')
            .focus();
    }

    $('.add-user-notification textarea').on('focus', function() {
        var $this = $(this);
        $this.parent().addClass('active');
    });

    $('.add-user-notification textarea').on('blur', function() {
        $('.add-user-notification').removeClass('active');
    });

    if (!$('.add-contact-multiple-input').tokenInput("getSettings")) {
        initAddDialogMultiInputPlugin();
    }

    $('.fm-empty-contacts .fm-empty-button').rebind('mouseover', function() {
        $('.fm-empty-contacts').addClass('hovered');
    });

    $('.fm-empty-contacts .fm-empty-button').rebind('mouseout', function() {
        $('.fm-empty-contacts').removeClass('hovered');
    });

    $('.fm-empty-contacts .fm-empty-button').rebind('click', function(event) {

        $.hideContextMenu();
        $.dialog = 'add-contact-popup';
        $.sharedTokens = []; // Holds items currently visible in share folder contet (above input)

        // Just in case hide import links
        $('.add-user-popup .import-contacts-dialog').fadeOut(0);
        $('.import-contacts-link').removeClass('active');

        // Prepare multi-input and dialog
        $('.add-user-popup .multiple-input .token-input-token-mega').remove();
        $('.add-user-popup-button.add').addClass('disabled');
        $('.add-user-popup .nw-fm-dialog-title').text(l[71]);
        $('.fm-add-user').removeClass('active');

        iconSize(false);

        $('.add-user-popup')
            .addClass('dialog')
            .removeClass('hidden');

        fm_showoverlay();

        event.stopPropagation();

        // Focus the input after everything else is done or it won't work
        focusOnInput();
    });

    $('.fm-add-user').rebind('click', function() {

        var $this = $(this),
            $d = $('.add-user-popup');

        $.hideContextMenu();
        $.dialog = 'add-contact-popup';

        // Holds items currently visible in share folder content (above input)
        $.sharedTokens = [];

        // Hide
        if ($this.is('.active')) {
            $this.removeClass('active');
            $d.addClass('hidden');
        }

        // Show
        else {
            $('.add-user-popup .import-contacts-dialog').fadeOut(0);
            $('.import-contacts-link').removeClass('active');
            $this.addClass('active');
            $d.removeClass('hidden dialog');
            $('.add-user-popup .multiple-input .token-input-token-mega').remove();

            $('.add-user-popup-button.add').addClass('disabled');
            $('.add-user-popup .nw-fm-dialog-title').text(l[71]);

            var pos = $(window).width() - $this.offset().left - $d.outerWidth() + 2;

            // Positioning, not less then 8px from right side
            if (pos > 8) {
                $d.css('right', pos + 'px');
            }
            else {
                $d.css('right', 8 + 'px');
            }

            initTextareaScrolling($('.add-user-textarea textarea'), 39);
            focusOnInput();
        }

        iconSize(true);
    });

    // List of elements related to pending contacts
    //
    // Received requests:
    // empty grid: fm-empty-contacts (have button on it, .empty-contact-requests-button with label 'View sent requests')
    // full grid: contact-requests-grid (have action buttons,
    //  'Accept': .contact-request-button.accept
    //  'Delete': .contact-request-button.delete
    //  'Ignore': .contact-request-button.ignore
    //
    // Sent requests:
    // empty grid: fm-empty-contacts (have button on it, .empty-sent-request-button with label 'View received requests')
    // full grid: sent-requests-grid (have action buttons,
    //  'ReInvite': .contact-request-button.reinvite
    //  'Cancel Reques': .contact-request-button.cancel
    //
    // Header buttons:
    // fm-contact-requests 'View sent requests'
    // fm-received-requests 'View received requests'

    // View received contact requests, M.ipc
    $('.fm-received-requests, .empty-sent-requests-button').off('click');
    $('.fm-received-requests, .empty-sent-requests-button').on('click', function() {
        M.openFolder('ipc');
        $('.fm-contact-requests').removeClass('active');
        $(this).addClass('active');
    });

    // View sent contact requests, M.opc
    $('.fm-contact-requests, .empty-contact-requests-button').off('click');
    $('.fm-contact-requests, .empty-contact-requests-button').on('click', function() {
        M.openFolder('opc');
        $('.fm-received-requests').removeClass('active');
        $(this).addClass('active');
    });

    $('.add-user-size-icon').rebind('click', function() {

        var iPos = 0;

        $('.add-user-popup .import-contacts-dialog').fadeOut(0);
        $('.import-contacts-link').removeClass('active');

        if ($(this).is('.full-size')) {

            $('.add-user-popup').addClass('dialog');
            fm_showoverlay();
            iconSize(false);
            $('.fm-add-user').removeClass('active');
            focusOnInput();
        }

        // .short-size
        else {

            fm_hideoverlay();
            $('.add-user-popup').removeClass('dialog');
            iconSize(true);
            $('.fm-add-user').addClass('active');

            iPos = $(window).width() - $('.fm-add-user').offset().left - $('.add-user-popup').outerWidth() + 2;

            if (iPos > 8) {
                $('.add-user-popup').css('right', iPos + 'px');
            }
            else {
                $('.add-user-popup').css('right', 8 + 'px');
            }
            focusOnInput();
        }
    });

    $('.add-user-popup-button').off('click');
    $('.add-user-popup-button').on('click', function() {

        addNewContact($(this));
    });

    $('.add-user-popup .fm-dialog-close').off('click');
    $('.add-user-popup .fm-dialog-close').on('click', function() {

        fm_hideoverlay();
        $('.add-user-popup').addClass('hidden');
        $('.fm-add-user').removeClass('active');
        clearScrollPanel('.add-user-popup');
    });

    $('.add-user-popup .import-contacts-service').unbind('click');
    $('.add-user-popup .import-contacts-service').bind('click', function() {

        // NOT imported
        if (!$(this).is('.imported')) {
            var contacts = new mega.GContacts({'where': 'contacts'});

            // NOT failed
            if (!contacts.options.failed) {
                contacts.importGoogleContacts();
            } else {
                closeImportContactNotification('.add-user-popup');
            }
        }
        else {
            var n = $('.imported-contacts-notification');
            n.css('margin-left', '-' + n.outerWidth() / 2 + 'px');
            n.fadeIn(200);
            $('.share-dialog .import-contacts-dialog').fadeOut(200);
        }
    });

    $('.add-user-popup .import-contacts-link').unbind('click');
    $('.add-user-popup .import-contacts-link').bind('click', function(e) {

        if (!$(this).is('.active')) {
            $('.add-user-popup .import-contacts-link').addClass('active');// Do not use this, because of doubled class
            $('.add-user-popup .import-contacts-dialog').fadeIn(200);

            $('.imported-notification-close').unbind('click');
            $('.imported-notification-close').bind('click', function()
            {
                $('.imported-contacts-notification').fadeOut(200);
            });
        }
        else {
            $('.add-user-popup .import-contacts-link').removeClass('active');
            $('.add-user-popup .import-contacts-dialog').fadeOut(200);
            $('.imported-contacts-notification').fadeOut(200);
        }

        e.stopPropagation();
        e.preventDefault();
    });

    $('.add-user-popup .import-contacts-info').unbind('mouseover');
    $('.add-user-popup .import-contacts-info').bind('mouseover', function() {
        $('.add-user-popup .import-contacts-info-txt').fadeIn(200);
    });

    $('.add-user-popup .import-contacts-info').unbind('mouseout');
    $('.add-user-popup .import-contacts-info').bind('mouseout', function() {
        $('.add-user-popup .import-contacts-info-txt').fadeOut(200);
    });
}

/**
 * Bind actions to Received Pending Conctact Request buttons
 *
 */
function initBindIPC() {

    DEBUG('initBindIPC()');

    $('.contact-requests-grid .contact-request-button').off('click');
    $('.contact-requests-grid .contact-request-button').on('click', function() {

        var $self = $(this),
            $reqRow = $self.closest('tr'),
            ipcId = $reqRow.attr('id').replace('ipc_', '');

        if ($self.is('.accept')) {
            if (M.acceptPendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }
        else if ($self.is('.delete')) {
            if (M.denyPendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }
        else if ($self.is('.ignore')) {
            if (M.ignorePendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }
    });
}

/**
 * Bind actions to Received pending contacts requests buttons
 *
 */
function initBindOPC() {

    DEBUG('initBindOPC()');

    $('.sent-requests-grid .contact-request-button').off('click');
    $('.sent-requests-grid .contact-request-button').on('click', function() {

        var $self = $(this),
            $reqRow = $self.closest('tr'),
            opcId = $reqRow.attr('id').replace('opc_', '');

        if ($self.is('.reinvite')) {
            M.reinvitePendingContactRequest(M.opc[opcId].m);
            $reqRow.children().children('.contact-request-button.reinvite').addClass('hidden');
        }
        else if ($self.is('.cancel')) {

            // If successfully deleted, grey column and hide buttons
            if (M.cancelPendingContactRequest(M.opc[opcId].m) === 0) {
                $(this).addClass('hidden');
                $reqRow.children().children('.contact-request-button.cancel').addClass('hidden');
                $reqRow.children().children('.contact-request-button.reinvite').addClass('hidden');
                $reqRow.addClass('deleted');
            }
        }
    });
}

function ephemeralDialog(msg) {

    msgDialog('confirmation', l[998], msg + ' ' + l[999], l[1000], function(e) {
        if (e) {
            document.location.hash = 'register';
        }
    });
}

/**
 * Removes the user from the share
 *
 * @param {String} shareId The share id
 * @param {Boolean} nfk
 */
function removeShare(shareId, nfk) {

    if (d) {
        console.log('removeShare', shareId);
    }

    if (!nfk) {
        api_updfkey(shareId);
    }

    M.delNode(shareId);
    api_req({ a: 'd', n: shareId, i: requesti });

    M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);

    if ((M.currentdirid === shareId) || (isCircular(shareId, M.currentdirid) === true)) {
        M.openFolder(RootbyId(shareId));
    }

    delete u_sharekeys[shareId];
}

function fmremove() {
    var filecnt = 0,
        foldercnt = 0,
        contactcnt = 0,
        removesharecnt = 0;

    // Loop throught selected items
    for (var i in $.selected) {
        var n = M.d[$.selected[i]];

        // ToDo: Not clear what this represents
        if (n && n.p.length === 11) {
            removesharecnt++;
        }

        // ToDo: Replace counting contact id chars with something more reliable
        else if (String($.selected[i]).length === 11) {
            contactcnt++;
        }

        // Folder
        else if (n && n.t) {
            foldercnt++;
        }

        // File
        else {
            filecnt++;
        }
    }

    if (removesharecnt) {
        for (var i in $.selected) {
            removeShare($.selected[i]);
        }
        M.openFolder('shares', true);
    }

    // Remove contacts from list
    else if (contactcnt) {

        var c = $.selected.length;
        var replaceString = '';
        var contact = '';

        if (c > 1) {
            replaceString = c + ' ' + l[5569];
            contact = 'contacts';
        }
        else {
            replaceString = '<strong>' + htmlentities(M.d[$.selected[0]].name) + '</strong>';
            contact = 'contact';
        }

        msgDialog('delete-contact', l[1001], l[1002].replace('[X]', replaceString), l[7872].replace('[X]', contact),
        function(e) {
            if (e) {
                $.selected.forEach(function(selected) {

                    if (M.c[selected]) {
                        M.c[selected].forEach(function(sharenode) {
                            removeShare(sharenode, 1);
                        });
                    }

                    api_req({ a: 'ur2', u: $.selected[i], l: '0', i: requesti });
                    M.handleEmptyContactGrid();
                });
            }
        });
        if (c > 1) {
            $('#msgDialog').addClass('multiple');
            $('.fm-del-contacts-number').text($.selected.length);
            $('#msgDialog .fm-del-contact-avatar').attr('class', 'fm-del-contact-avatar');
            $('#msgDialog .fm-del-contact-avatar span').empty();
        }
        else {
            var user = M.u[$.selected[0]],
                avatar = useravatar.contact(user, 'avatar-remove-dialog');

            $('#msgDialog .fm-del-contact-avatar').html(avatar);
        }
    }

    // Remove selected nodes from rubbish bin
    else if (RootbyId($.selected[0]) === M.RubbishID) {

        var dlgMessage = '';
        var toastMessage = '';

        if ((filecnt === 1) && (!foldercnt)) {
            dlgMessage = l[13749];// 1 file
            toastMessage = l[13757];
        }
        else if ((filecnt > 1) && (!foldercnt)) {
            dlgMessage = l[13750].replace('%1', filecnt);
            toastMessage = l[13758].replace('%1', filecnt);
        }
        else if ((!filecnt) && (foldercnt === 1)) {
            dlgMessage = l[13751];// 1 folder
            toastMessage = l[13759];
        }
        else if ((!filecnt) && (foldercnt > 1)) {
            dlgMessage = l[13752].replace('%1', foldercnt);
            toastMessage = l[13760].replace('%1', foldercnt);
        }
        else if ((filecnt === 1) && (foldercnt === 1)) {
            dlgMessage = l[13753];// 1 file 1 folder
            toastMessage = l[13761];
        }
        else if ((filecnt === 1) && (foldercnt > 1)) {
            dlgMessage = l[13754].replace('%1', foldercnt);
            toastMessage = l[13762].replace('%1', foldercnt);
        }
        else if ((filecnt > 1) && (foldercnt === 1)) {
            dlgMessage = l[13755].replace('%1', filecnt);
            toastMessage = l[13763].replace('%1', filecnt);
        }
        else if ((filecnt > 1) && (foldercnt > 1)) {
            dlgMessage = l[13756].replace('%1', filecnt).replace('%2', foldercnt);
            toastMessage = l[13764].replace('%1', filecnt).replace('%2', foldercnt);
        }

        msgDialog('clear-bin', l[1003], dlgMessage, l[1007], function(e) {
            if (e) {
                var tmp = null;
                if (String(M.currentdirid).substr(0, 7) === 'search/') {
                    tmp = M.currentdirid;
                    M.currentdirid = M.getNodeByHandle($.selected[0]).p || M.RubbishID;
                }
                M.clearRubbish(1);

                if (tmp) {
                    M.currentdirid = tmp;
                }

                showToast('settings', toastMessage);
            }
        });

        // ToDo: is this necessary?
        // $('.fm-dialog-button.notification-button').each(function(i, e) {
        //     if ($(e).text() === l[1018]) {
        //         $(e).safeHTML('<span>@@</span>', l[83]);
        //     }
        // });
    }

    // Remove contacts
    else if (RootbyId($.selected[0]) === 'contacts') {
        if (localStorage.skipDelWarning) {
            M.copyNodes($.selected, M.RubbishID, 1);
        } else {
            msgDialog('confirmation', l[1003], l[1004].replace('[X]', fm_contains(filecnt, foldercnt)), false, function(e) {
                if (e) {
                    M.copyNodes($.selected, M.RubbishID, 1);
                }
            }, true);
        }
    }
    else {
        if (localStorage.skipDelWarning) {
            if (M.currentrootid === 'shares') {
                M.copyNodes($.selected, M.RubbishID, true);
            }
            else {
                M.moveNodes($.selected, M.RubbishID);
            }
        }
        else {

            // Additional message in case that there's a shared node
            var delShareInfo,

            // Contains complete directory structure of selected nodes, their ids
            dirTree = [];

            for (var i in $.selected) {
                if ($.selected.hasOwnProperty(i)) {
                    var nodes = fm_getnodes($.selected[i], 1);
                    nodes.unshift($.selected[i]);
                    dirTree = dirTree.concat(nodes);
                }
            }

            var share = new mega.Share({});
            delShareInfo = share.isShareExist(dirTree, true, true, true) ? ' ' + l[1952] + ' ' + l[7410] : '';

            msgDialog('remove', l[1003], l[1004].replace('[X]', fm_contains(filecnt, foldercnt)) + delShareInfo, false, function(e) {
                if (e) {
                    if (M.currentrootid === 'shares') {
                        M.copyNodes($.selected, M.RubbishID, true);
                    }
                    else {

                        // Remove all shares related to selected nodes
                        for (var selection in dirTree) {
                            if (dirTree.hasOwnProperty(selection)) {

                                // Remove regular/full share
                                for (var share in Object(M.d[dirTree[selection]]).shares) {
                                    if (M.d[dirTree[selection]].shares.hasOwnProperty(share)) {
                                        api_req({ a: 's2', n:  dirTree[selection], s: [{ u: M.d[dirTree[selection]].shares[share].u, r: ''}], ha: '', i: requesti });
                                        M.delNodeShare(dirTree[selection], M.d[dirTree[selection]].shares[share].u);
                                        setLastInteractionWith(dirTree[selection], "0:" + unixtime());
                                    }
                                }

                                // Remove pending share
                                for (var pendingUserId in M.ps[dirTree[selection]]) {
                                    if (M.ps[dirTree[selection]].hasOwnProperty(pendingUserId)) {
                                        var userEmailOrID = Object(M.opc[pendingUserId]).m || pendingUserId;

                                        api_req({
                                            a: 's2', n: dirTree[selection],
                                            s: [{u: userEmailOrID, r: ''}], ha: '', i: requesti
                                        });

                                        M.deletePendingShare(dirTree[selection], pendingUserId);
                                    }
                                }
                            }
                        }
                        M.moveNodes($.selected, M.RubbishID);
                    }

                }
            }, true);
        }
    }
}

function fmremdupes(test)
{
    var hs = {}, i, f = [], s = 0;
    var cRootID = M.currentrootid;
    loadingDialog.show();
    for (i in M.d)
    {
        var n = M.d[i];
        if (n && n.hash && n.h && RootbyId(n.h) === cRootID)
        {
            if (!hs[n.hash])
                hs[n.hash] = [];
            hs[n.hash].push(n.h);
        }
    }
    for (i in hs)
    {
        var h = hs[i];
        while (h.length > 1)
            f.push(h.pop());
    }
    for (i in f)
    {
        console.debug('Duplicate node: ' + f[i] + ' at ~/'
           + M.getPath(f[i]).reverse().map(function(n) {
                return M.d[n].name || ''
             }).filter(String).join("/"));
        s += M.d[f[i]].s | 0;
    }
    loadingDialog.hide();
    console.log('Found ' + f.length + ' duplicated files using a sum of ' + bytesToSize(s));
    if (!test && f.length)
    {
        $.selected = f;
        fmremove();
    }
    return f.length;
}

function initContextUI() {

    var c = '.context-menu .context-menu-item';

    $('.context-menu-section').off('mouseover', c);
    $('.context-menu-section').on('mouseover', c, function() {

        // is move... or download...
        if ($(this).parent().parent().is('.context-submenu')) {

            // if just item hide child context-submenu
            if (!$(this).is('.contains-submenu')) {
                $(this).parent().children().removeClass('active opened');
                $(this).parent().find('.context-submenu').addClass('hidden');
            }
        }

        // Hide all submenues, for download and for move...
        else {
            if (!$(this).is('.contains-submenu')) {
                $('.context-menu .context-submenu.active ').removeClass('active');
                $('.context-menu .contains-submenu.opened').removeClass('opened');
                $('.context-menu .context-submenu').addClass('hidden');
            }
        }
    });

    $('.context-menu-section').off('mouseover', '.contains-submenu');
    $('.context-menu-section').on('mouseover', '.contains-submenu', function() {

        var $this = $(this),
            // situation when we have 2 contains-submenus in same context-submenu one near another
            b = $this.closest('.context-submenu').find('.context-submenu,.contains-submenu').not($this.next()),
            a = $this.next(),// context-submenu
            pos = $this.offset(),
            menuPos,
            currentId;

        a.children().removeClass('active opened');
        a.find('.context-submenu').addClass('hidden');
        a.find('.opened').removeClass('opened');

        if (b.length) {
            b.removeClass('active opened')
                .find('.context-submenu').addClass('hidden');
        }

        currentId = $this.attr('id');
        if (currentId) {
            M.buildSubMenu(currentId.replace('fi_', ''));
        }

        if ($this.is('.move-item')) {
            $('.context-menu .download-item').removeClass('opened')
                .next().removeClass('active opened')
                .next().find('.context-submenu').addClass('hidden');
        }
        if ($this.is('.download-item')) {
            $('.context-menu .move-item').removeClass('opened')
                .next().removeClass('active opened')
                .next().find('.context-submenu').addClass('hidden');
        }
        if (!$this.is('.opened')) {
            menuPos = reCalcMenuPosition($this, pos.left, pos.top, 'submenu'),

            $this.next('.context-submenu')
                .css({'top': menuPos.top})
                .addClass('active')
                .removeClass('hidden');

            $this.addClass('opened');
        }
    });

    $(c + '.cloud-item').rebind('click', function() {

        var t = $(this).attr('id').replace('fi_', ''),
            n = [];
        if (!$(this).is('.disabled')) {
            for (var i in $.selected) {
                if (!isCircular($.selected[i], t)) {
                    n.push($.selected[i]);
                }
            }
            $.hideContextMenu();
            M.moveNodes(n, t);
        }
    });

    $('.context-menu.files-menu').off('click', '.folder-item');
    $('.context-menu.files-menu').on('click', '.folder-item', function() {

        var t = $(this).attr('id').replace('fi_', ''),
            n = [];
        if (!$(this).is('.disabled')) {
            for (var i in $.selected) {
                if (!isCircular($.selected[i], t)) {
                    n.push($.selected[i]);
                }
            }
            $.hideContextMenu();
            M.moveNodes(n, t);
        }
    });

    $(c + '.download-item').rebind('click', function(event) {
        var c = $(event.target).attr('class');
        if (c && c.indexOf('contains-submenu') > -1)
            M.addDownload($.selected);
    });

    $(c + '.download-standart-item').rebind('click', function() {
        M.addDownload($.selected);
    });

    $(c + '.zipdownload-item').rebind('click', function() {
        M.addDownload($.selected, true);
    });

    $(c + '.getlink-item').rebind('click', function() {

        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            initCopyrightsDialog($.selected);
        }
    });

    $(c + '.removelink-item').rebind('click', function() {

        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            var exportLink = new mega.Share.ExportLink({ 'updateUI': true, 'nodesToProcess': $.selected });
            exportLink.removeExportLink();
        }
    });

    $(c + '.rename-item').rebind('click', function() {
        renameDialog();
    });

    $(c + '.sh4r1ng-item').rebind('click', function() {

        var $shareDialog = $('.share-dialog');

        if (u_type === 0) {
            ephemeralDialog(l[1006]);
        }
        else {
            // this is used like identifier when key with key code 27 is pressed
            $.dialog = 'share';
            $.hideContextMenu();

            // Show the share dialog
            $shareDialog.removeClass('hidden');

            // Hide the optional message by default.
            // This gets enabled if user want to share
            $shareDialog.find('.share-message').hide();

            fm_showoverlay();
            handleShareDialogContent();

        }
    });

    // Move Dialog
    $(c + '.advanced-item, ' + c + '.move-item').rebind('click', function() {

        $.moveDialog = 'move';// this is used like identifier when key with key code 27 is pressed
        $.mcselected = M.RootID;
        $('.move-dialog').removeClass('hidden');
        handleDialogContent('cloud-drive', 'ul', true, 'move', 'Move');
        disableCircularTargets('#mctreea_');
        fm_showoverlay();
    });

    $(c + '.copy-item').rebind('click', function() {

        $.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
        $.mcselected = M.RootID;
        $('.copy-dialog').removeClass('hidden');
        handleDialogContent('cloud-drive', 'ul', true, 'copy', $.mcImport ? l[236] : "Paste" /*l[63]*/);
        fm_showoverlay();
    });

    $(c + '.import-item').rebind('click', function() {
        ASSERT(folderlink, 'Import needs to be used in folder links.');

        fm_importflnodes($.selected);
    });

    $(c + '.newfolder-item').rebind('click', function() {
        createFolderDialog();
    });

    $(c + '.fileupload-item').rebind('click', function() {
        $('#fileselect3').click();
    });

    $(c + '.folderupload-item').rebind('click', function() {
        $('#fileselect4').click();
    });

    $(c + '.remove-item').rebind('click', function() {
        fmremove();
    });

    $(c + '.startchat-item').rebind('click', function() {
        var $this = $(this);
        var user_handle = $.selected;


        if (user_handle.length === 1) {
            if (!$this.is(".disabled") && user_handle) {
                window.location = "#fm/chat/" + user_handle;
            }
        }
        else {
            megaChat.createAndShowGroupRoomFor(user_handle);
        }
    });

    $(c + '.startaudio-item').rebind('click', function() {
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];
        var room;

        if (!$this.is(".disabled") && user_handle) {
            window.location = "#fm/chat/" + user_handle;
            room = megaChat.createAndShowPrivateRoomFor(user_handle);
            if (room) {
                room.startAudioCall();
            }
        }
    });

    $(c + '.startvideo-item').rebind('click', function() {
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];
        var room;

        if (!$this.is(".disabled") && user_handle) {
            window.location = "#fm/chat/" + user_handle;
            room = megaChat.createAndShowPrivateRoomFor(user_handle);
            if (room) {
                room.startVideoCall();
            }
        }
    });

    $(c + '.removeshare-item').rebind('click', function() {
        fmremove();
    });

    $(c + '.properties-item').rebind('click', function() {
        propertiesDialog();
    });

    $(c + '.findupes-item').rebind('click', mega.utils.findDupes);

    $(c + '.permissions-item').rebind('click', function() {
        if (d) {
            console.log('permissions');
        }
    });

    $(c + '.add-star-item').rebind('click', function() {

        var delFavourite = M.isFavourite($.selected);

        M.favourite($.selected, delFavourite);

        if (M.viewmode) {
            $('.file-block').removeClass('ui-selected');
        }
        else {
            $('.grid-table.fm tr').removeClass('ui-selected');
        }
    });

    $(c + '.open-item').rebind('click', function() {
        M.openFolder($.selected[0]);
    });

    $(c + '.preview-item').rebind('click', function() {
        slideshow($.selected[0]);
    });

    $(c + '.clearbin-item').rebind('click', function() {
        doClearbin(true);
    });

    $(c + '.move-up').rebind('click', function() {
        $('.transfer-table tr.ui-selected')
            .attrs('id')
            .map(function(id) {
                fm_tfsmove(id, -1);
            });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
        delay('fm_tfsupdate', fm_tfsupdate);
    });

    $(c + '.move-down').rebind('click', function() {
        $('.transfer-table tr.ui-selected')
            .attrs('id')
            .reverse()
            .map(function(id) {
                fm_tfsmove(id, 1);
            });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
        delay('fm_tfsupdate', fm_tfsupdate);
    });

    $(c + '.transfer-play').rebind('click', function() {
        $('.transfer-table tr.ui-selected').attrs('id').map(fm_tfsresume);
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
        if (uldl_hold) {
            dlQueue.resume();
            ulQueue.resume();
            uldl_hold = false;
        }
    });

    $(c + '.transfer-pause').rebind('click', function() {
        $('.transfer-table tr.ui-selected').attrs('id').map(fm_tfspause);
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
    });

    $(c + '.select-all').rebind('click', function() {
        selectionManager.select_all();
    });

    $(c + '.network-diagnostic').rebind('click', function() {
        var $trs = $('.transfer-table tr.ui-selected');
        mega.utils.require('network_js')
            .then(function() {
                NetworkTesting.dialog($trs.attrs('id')[0].replace(/^dl_/, '#!'));
            });
    });

    $(c + '.canceltransfer-item,' + c + '.transfer-clear').rebind('click', function() {
        var $trs = $('.transfer-table tr.ui-selected');
        var toabort = $trs.attrs('id');
        $trs.remove();
        dlmanager.abort(toabort);
        ulmanager.abort(toabort);
        $.clearTransferPanel();
        fm_tfsupdate();

        Soon(function() {
            // XXX: better way to stretch the scrollbar?
            $(window).trigger('resize');
        });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
    });

    $(document).trigger('onInitContextUI');
}

function createFolderUI() {

    $('.fm-new-folder').rebind('click', function(e) {

        var c = $('.fm-new-folder').attr('class'),
            c2 = $(e.target).attr('class'),
            c3 = $(e.target).parent().attr('class'),
            b1 = $('.fm-new-folder');

        $('.create-new-folder').removeClass('filled-input');
        var d1 = $('.create-new-folder');
        if ((!c2 || c2.indexOf('fm-new-folder') === -1) && (!c3 || c3.indexOf('fm-new-folder') === -1)) {
            return false;
        }
        if (c.indexOf('active') === -1) {
            b1.addClass('active');
            d1.removeClass('hidden');
            var w1 = $(window).width() - $(this).offset().left - d1.outerWidth() + 2;
            if (w1 > 8) {
                d1.css('right', w1 + 'px');
            } else {
                d1.css('right', 8 + 'px');
            }
            $('.create-new-folder input').focus();
        }
        else {
            b1.removeClass('active filled-input');
            d1.addClass('hidden');
            $('.fm-new-folder input').val(l[157]);
        }
        $.hideContextMenu();
    });

    $('.create-folder-button').rebind('click', function(e) {
        doCreateFolderUI(e);
        return false;
    });

    $('.create-folder-button-cancel').rebind('click', function() {
        $('.fm-new-folder').removeClass('active');
        $('.create-new-folder').addClass('hidden');
        $('.create-new-folder').removeClass('filled-input');
        $('.create-new-folder input').val(l[157]);
    });

    $('.create-folder-size-icon.full-size').rebind('click', function() {

        var v = $('.create-new-folder input').val();

        if (v !== l[157] && v !== '') {
            $('.create-folder-dialog input').val(v);
        }

        $('.create-new-folder input').focus();
        $('.create-new-folder').removeClass('filled-input');
        $('.create-new-folder').addClass('hidden');
        $('.fm-new-folder').removeClass('active');
        createFolderDialog(0);
        $('.create-new-folder input').val(l[157]);
    });

    $('.create-folder-size-icon.short-size').rebind('click', function() {

        var v = $('.create-folder-dialog input').val();

        if (v !== l[157] && v !== '') {
            $('.create-new-folder input').val(v);
            $('.create-new-folder').addClass('filled-input');
        }

        $('.fm-new-folder').addClass('active');
        $('.create-new-folder').removeClass('hidden');
        createFolderDialog(1);
        $('.create-folder-dialog input').val(l[157]);
        $('.create-new-folder input').focus();
    });

    $('.create-new-folder input').unbind('keyup');
    $('.create-new-folder input').bind('keyup', function(e) {
        $('.create-new-folder').addClass('filled-input');
        if ($(this).val() == '') {
            $('.create-new-folder').removeClass('filled-input');
        }
        if (e.which == 13) {
            doCreateFolderUI(e);
        }
    });

    $('.create-new-folder input').unbind('focus');
    $('.create-new-folder input').bind('focus', function() {
        if ($(this).val() == l[157]) {
            $(this).val('');
        }
        $('.create-new-folder').addClass('focused');
    });

    $('.create-new-folder input').unbind('blur');
    $('.create-new-folder input').bind('blur', function() {
        if ($('.create-new-folder input').val() == '') {
            $('.create-new-folder input').val(l[157]);
        }
        $('.create-new-folder').removeClass('focused');
    });
}

function doCreateFolderUI() {

    if ($('.create-folder-input-bl input').val() === '') {
        $('.create-folder-input-bl input').animate({backgroundColor: "#d22000"}, 150, function() {
            $('.create-folder-input-bl input').animate({backgroundColor: "white"}, 350, function() {
                $('.create-folder-input-bl input').focus();
            });
        });
    }
    else {
        createFolder(M.currentdirid, $('.create-folder-input-bl input').val());
    }
}

/**
 * fmtopUI
 *
 *
 */
function fmtopUI() {
    $('.fm-clearbin-button,.fm-add-user,.fm-new-folder,.fm-file-upload,.fm-folder-upload').addClass('hidden');
    $('.fm-contact-requests,.fm-received-requests').removeClass('active');
    $('.fm-new-folder').removeClass('filled-input');

    if (M.currentrootid === M.RubbishID) {
        $('.fm-clearbin-button').removeClass('hidden');
        $('.fm-right-files-block').addClass('rubbish-bin');
    }
    else {
        $('.fm-right-files-block').removeClass('rubbish-bin');
        if (M.currentrootid === M.InboxID) {
            if (d) {
                console.log('Inbox');
            }
        }
        else if (M.currentdirid === 'contacts'
                || M.currentdirid === 'ipc'
                || M.currentdirid === 'opc'
                || (String(M.currentdirid).length === 11
                    && M.currentdirid.substr(0, 6) !== 'search')) {

            $('.fm-add-user').removeClass('hidden');


            // don't add .contacts-panel to ALL .fm-left-panel's
            $('.fm-left-panel:visible').addClass('contacts-panel');

            if (M.currentdirid === 'ipc') {
                $('.fm-received-requests').addClass('active');
                $('.fm-right-header').addClass('requests-panel');
            }
            else if (M.currentdirid === 'opc') {
                $('.fm-contact-requests').addClass('active');
                $('.fm-right-header').addClass('requests-panel');
            }
        }
        else if (String(M.currentdirid).length === 8
                && RightsbyID(M.currentdirid) > 0) {

            $('.fm-new-folder').removeClass('hidden');
            $('.fm-file-upload').removeClass('hidden');
            if ((is_chrome_firefox & 2) || 'webkitdirectory' in document.createElement('input')) {
                $('.fm-folder-upload').removeClass('hidden');
            }
            else if (ua.details.engine === 'Gecko') {
                $('.fm-folder-upload').removeClass('hidden');
                $('input[webkitdirectory], .fm-folder-upload input')
                    .rebind('click', function() {
                        firefoxDialog();
                        return false;
                    });
            }
            else {
                $('.fm-file-upload').addClass('last-button');
            }
        }

    }
    $('.fm-clearbin-button').rebind('click', function() {
        doClearbin(false);
    });

    // handle the Inbox section use cases
    if (M.hasInboxItems()) {
        $('.nw-fm-left-icon.inbox').removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.inbox').addClass('hidden');

        if (M.InboxID && M.currentrootid === M.InboxID) {
            M.openFolder(M.RootID);
        }
    }

    // handle the RubbishBin icon changes
    var $icon = $('.nw-fm-left-icon.rubbish-bin');
    var rubNodes = Object.keys(M.c[M.RubbishID] || {});
    if (rubNodes.length) {
        $('.fm-tree-header.recycle-item').addClass('recycle-notification contains-subfolders');

        if (!$icon.hasClass('filled')) {
            $icon.addClass('filled');
        }
        else if (!$icon.hasClass('glow')) {
            $icon.addClass('glow');
        }
        else {
            $icon.removeClass('glow');
        }
    }
    else {
        $('.fm-tree-header.recycle-item')
            .removeClass('recycle-notification expanded contains-subfolders')
            .prev('.fm-connector-first').removeClass('active');

        $icon.removeClass('filled glow');
    }
}

function doClearbin(selected)
{
    msgDialog('clear-bin', l[14], l[15], l[1007], function(e)
    {
        if (e) {
            M.clearRubbish(selected);
        }
    });
}

function notificationsUI(close)
{
    if (close)
    {
        $('.fm-main.notifications').addClass('hidden');
        $('.fm-main.default').removeClass('hidden');
        return false;
    }
    $('.fm-main.notifications').removeClass('hidden');
    $('.notifications .nw-fm-left-icon').removeClass('active');
    $('.fm-main.default').addClass('hidden');
    $.tresizer();
}

function accountUI() {

    var sectionTitle;
    var sectionClass;

    $('.fm-account-overview').removeClass('hidden');
    $('.fm-account-button').removeClass('active');
    $('.fm-account-sections').addClass('hidden');
    $('.fm-right-files-block').addClass('hidden');
    $('.section.conversations').addClass('hidden');
    $('.fm-right-account-block').removeClass('hidden');
    $('.nw-fm-left-icon').removeClass('active');
    $('.nw-fm-left-icon.settings').addClass('active');
    $('.fm-account-main').removeClass('white-bg');

    if ($('.fmholder').hasClass('transfer-panel-opened')) {
        $.transferClose();
    }

    //Destroy jScrollings in select dropdowns
    $('.fm-account-main .default-select-scroll').each(function(i, e) {
        $(e).parent().fadeOut(200).parent().removeClass('active');
        deleteScrollPanel(e, 'jsp');
    });

    sectionUIopen('account');
    if (typeof zxcvbn === 'undefined' && !silent_loading) {
        silent_loading = accountUI;
        jsl.push(jsl2['zxcvbn_js']);
        return jsl_start();
    }

    M.accountData(function(account) {

        var perc, warning, perc_c;
        var id = document.location.hash;

        if (id == '#fm/account/settings') {
            $('.fm-account-settings').removeClass('hidden');
            sectionTitle = l[823];
            sectionClass = 'settings';

            $('#network-testing-button').rebind('click', function() {
                mega.utils.require('network_js')
                    .then(function() {
                        NetworkTesting.dialog();
                    });
            });

            if (is_chrome_firefox) {
                if (!$('#acc_dls_folder').length) {
                    $('#acc_use_ssl').before(
                        $('<div id="acc_dls_folder" style="margin-top:25px">' +
                            '<div class="account-bandwidth-txt">Downloads folder:</div>' +
                            '<input type="button" value="Browse..." style="-moz-appearance:' +
                                'button;margin-right:12px;cursor:pointer" />' +
                            '</div>'));
                    var fld = mozGetDownloadsFolder();
                    $('#acc_dls_folder').append($('<span/>').text(fld && fld.path));
                    $('#acc_dls_folder input').click(function() {
                        var fs = mozFilePicker(0,2);
                        if (fs) {
                            mozSetDownloadsFolder(fs);
                            $(this).next().text(fs.path);
                        }
                    });
                }
            }
        }
        else if (id == '#fm/account/profile') {
            $('.fm-account-main').addClass('white-bg');
            $('.fm-account-profile').removeClass('hidden');
            sectionTitle = l[984];
            sectionClass = 'profile';
        }
        else if (id == '#fm/account/history') {
            $('.fm-account-main').addClass('white-bg');
            $('.fm-account-history').removeClass('hidden');
            sectionTitle = l[985];
            sectionClass = 'history';
        }
        else if (id == '#fm/account/reseller' && M.account.reseller) {
            $('.fm-account-reseller').removeClass('hidden');
            sectionTitle = l[6873];
            sectionClass = 'reseller';
        }
        else {
            // This is the main entry point for users who just had upgraded their accounts
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render(true);
            }

            $('.fm-account-overview').removeClass('hidden');
            sectionTitle = l[983];
            sectionClass = 'overview';
        }

        $('.fm-account-button.' + sectionClass).addClass('active');
        $('.fm-breadcrumbs.account').addClass('has-next-button');
        $('.fm-breadcrumbs.next').attr('class', 'fm-breadcrumbs next ' + sectionClass).find('span').text(sectionTitle);

        $('.fm-account-blocks .membership-icon.type').removeClass('free pro1 pro2 pro3 pro4');

        if (u_attr.p) {

            // LITE/PRO account
            var planNum = u_attr.p;
            var planText = getProPlan(planNum);

            $('.membership-big-txt.accounttype').text(planText);
            $('.fm-account-blocks .membership-icon.type').addClass('pro' + planNum);

            // Subscription
            if (account.stype == 'S') {

                $('.fm-account-header.typetitle').text(l[434]);
                if (account.scycle == '1 M') {
                    $('.membership-big-txt.type').text(l[748]);
                }
                else if (account.scycle == '1 Y') {
                    $('.membership-big-txt.type').text(l[749]);
                }
                else {
                    $('.membership-big-txt.type').text('');
                }

                // Get the date their subscription will renew
                var timestamp = account.srenew[0];
                var paymentType = (account.sgw.length > 0) ? account.sgw[0] : '';   // Credit Card etc

                // Display the date their subscription will renew if known
                if (timestamp > 0) {
                    var date = new Date(timestamp * 1000);
                    var dateString = l[6971] + ' ' + date.getDate() + ' ' + date_months[date.getMonth()] + ' '
                                   + date.getFullYear();

                    // Use format: 14 March 2015 - Credit Card
                    paymentType = dateString + ' - ' + paymentType;
                }

                // Otherwise just show payment type
                $('.membership-medium-txt.expiry').text(paymentType);

                // Check if there are any active subscriptions
                // ccqns = Credit Card Query Number of Subscriptions
                api_req({ a: 'ccqns' }, {
                    callback : function(numOfSubscriptions, ctx) {

                        // If there is an active subscription
                        if (numOfSubscriptions > 0) {

                            // Show cancel button and show cancellation dialog
                            $('.fm-account-blocks .btn-cancel').show().rebind('click', function() {
                                cancelSubscriptionDialog.init();
                            });
                            $('.subscription-bl').addClass('active-subscription');
                        }
                    }
                });
            }
            else if (account.stype == 'O') {

                // one-time or cancelled subscription
                $('.fm-account-header.typetitle').text(l[746] + ':');
                $('.membership-big-txt.type').text(l[751]);
                $('.membership-medium-txt.expiry').rebind('click', function() {
                    document.location = $(this).attr('href');
                });
                $('.membership-medium-txt.expiry').text(l[987] + ' ' + time2date(account.expiry));
                $('.fm-account-blocks .btn-cancel').hide();
                $('.subscription-bl').removeClass('active-subscription');
            }
        }
        else {

            // free account:
            $('.fm-account-blocks .membership-icon.type').addClass('free');
            $('.membership-big-txt.type').text(l[435]);
            $('.membership-big-txt.accounttype').text(l[435]);
            $('.membership-medium-txt.expiry').text(l[436]);
            $('.btn-cancel').hide();
            $('.subscription-bl').removeClass('active-subscription');
        }

        perc = Math.round((account.servbw_used+account.downbw_used)/account.bw*100);
        perc_c=perc;

        /* New Used Bandwidth bar */

        var b1 = bytesToSize(account.servbw_used + account.downbw_used);
        b1 = b1.split(' ');
        b1[0] = Math.round(b1[0]) + ' ';
        var b2 = bytesToSize(account.bw);
        b2 = b2.split(' ');
        b2[0] = Math.round(b2[0]) + ' ';
        var b3 = bytesToSize(account.bw - (account.servbw_used + account.downbw_used));

        var bandwidthDeg = 360 * perc_c / 100;
        if (bandwidthDeg <= 180) {
                $('.bandwidth .nw-fm-chart0.right-c p').css('transform', 'rotate(' + bandwidthDeg + 'deg)');
        }
        else {
                $('.bandwidth .nw-fm-chart0.right-c p').css('transform', 'rotate(180deg)');
                $('.bandwidth .nw-fm-chart0.left-c p').css('transform', 'rotate(' + (bandwidthDeg - 180) + 'deg)');
        }

        if (bandwidthDeg > 0) {
            $('.bandwidth .nw-fm-percentage').removeClass('empty');
        }
        $('.bandwidth .nw-fm-bar0').css('width', perc_c + '%');

        // Maximum bandwidth
        $('.bandwidth .nw-fm-percents span.pecents-txt').html(htmlentities(b2[0]));
        $('.bandwidth .nw-fm-percents span.gb-txt').html(htmlentities(b2[1]));
        $('.bandwidth .nw-fm-percents span.perc-txt').html(perc_c + '%');

        // Used bandwidth
        $('.bandwidth .fm-bar-size.used').html(b1);

        // Available bandwidth
        $('.bandwidth .fm-bar-size.available').html(b3);

        if (perc > 99) {
            $('.fm-account-blocks.storage').addClass('exceeded');
        }

        /* End of Used Bandwidth bar */


        perc = Math.round(account.space_used / account.space * 100);
        perc_c = perc;
        if (perc_c > 100)
            perc_c = 100;
        if (perc > 99)
            $('.fm-account-blocks.storage').addClass('exceeded');

        /* New Used space bar */

        var c = account.cstrgn, k = Object.keys(c), deg = 0, iSharesBytes = 0;
        // Array contains Cloud drive , Rubbish bin, Incoming shares, Inbox (percents)
        var percents = [
            100 * c[k[0]][0] / account.space,
            100 * c[k[2]][0] / account.space,
            0,
            100 * c[k[1]][0] / account.space
        ];
        for (var i = 3 ; i < k.length ; ++i ) {
            iSharesBytes += c[k[i]][0];
            percents[2] += (100 * c[k[i]][0] / account.space);
        }
        for (i = 0; i < 4; i++) {
            deg = deg + (360 * percents[i] / 100);
            if (deg <= 180) {
                $('.storage .nw-fm-chart' + i + '.right-c p').css('transform', 'rotate(' + deg + 'deg)');
            } else {
                $('.storage .nw-fm-chart' + i + '.right-c p').css('transform', 'rotate(180deg)');
                $('.storage .nw-fm-chart' + i + '.left-c p').css('transform', 'rotate(' + (deg - 180) + 'deg)');
            }
            if (deg > 0) $('.storage .nw-fm-percentage').removeClass('empty');
            $('.storage .nw-fm-bar' + i).css('width', percents[i] + '%');
        }

        // Maximum disk space
        var b2 = bytesToSize(account.space);
        b2 = b2.split(' ');
        b2[0] = Math.round(b2[0]) + ' ';
        $('.storage .nw-fm-percents span.pecents-txt').html(htmlentities(b2[0]));
        $('.storage .nw-fm-percents span.gb-txt').html(htmlentities(b2[1]));
        $('.storage .nw-fm-percents span.perc-txt').html(perc_c + '%');

        // Used space
        $('.storage .fm-bar-size.used').html(bytesToSize(account.space_used));
        // Available space
        b2 = account.space - account.space_used;
        if (b2 < 0) {
            b2 = bytesToSize(-b2) + ' over quota';
        } else {
            b2 = bytesToSize(b2);
        }

        $('.storage .fm-bar-size.available').html(b2);
        // Cloud drive
        $('.storage .fm-bar-size.cloud-drive').html(bytesToSize(c[k[0]][0]));
        // Rubbish bin
        $('.storage .fm-bar-size.rubbish-bin').html(bytesToSize(c[k[2]][0]));
        // Incoming shares
        $('.storage .fm-bar-size.incoming-shares').html(bytesToSize(iSharesBytes));
        // Inbox
        $('.storage .fm-bar-size.inbox').html(bytesToSize(c[k[1]][0]));

        /* End of New Used space */


        $('.fm-account-main .pro-upgrade').unbind('click');
        $('.fm-account-main .pro-upgrade').bind('click', function(e)
        {
            window.location.hash = 'pro';
        });
        $('.membership-big-txt.balance').html('&euro; ' + htmlentities(account.balance[0][0]));
        var a = 0;
        if (M.c['contacts']) {
            for (var i in M.c['contacts'])
                a++;
        }
        if (!$.sessionlimit)
            $.sessionlimit = 10;
        if (!$.purchaselimit)
            $.purchaselimit = 10;
        if (!$.transactionlimit)
            $.transactionlimit = 10;
        if (!$.voucherlimit)
            $.voucherlimit = 10;

        $('.account-history-dropdown-button.sessions').text(l[472].replace('[X]', $.sessionlimit));
        $('.account-history-drop-items.session10-').text(l[472].replace('[X]', 10));
        $('.account-history-drop-items.session100-').text(l[472].replace('[X]', 100));
        $('.account-history-drop-items.session250-').text(l[472].replace('[X]', 250));

        var $passwords = $('#account-password,#account-new-password,#account-confirm-password').unbind('click');

        M.account.sessions.sort(function(a, b) {
            if (a[0] < b[0]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('#sessions-table-container').empty();
        var html =
            '<table width="100%" border="0" cellspacing="0" cellpadding="0" class="grid-table sessions">' +
            '<tr><th>' + l[479] + '</th><th>' + l[480] + '</th><th>' + l[481] + '</th><th>' + l[482] + '</th>' +
            '<th class="no-border session-status">' + l[7664] + '</th>' +
            '<th class="no-border logout-column">&nbsp;</th></tr>';
        var numActiveSessions = 0;

        $(account.sessions).each(function(i, el) {

            if (i == $.sessionlimit) {
                return false;
            }

            var userAgent = el[2];
            var dateTime = htmlentities(time2date(el[0]));
            var browser = browserdetails(userAgent);
            var browserName = browser.nameTrans;
            var ipAddress = htmlentities(el[3]);
            var country = countrydetails(el[4]);
            var currentSession = el[5];
            var sessionId = el[6];
            var activeSession = el[7];
            var status = '<span class="current-session-txt">' + l[7665] + '</span>';    // Current

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            if (browser.isExtension) {
                browserName += ' (+' + l[7683] + ')';
            }

            // If not the current session
            if (!currentSession) {
                if (activeSession) {
                    status = '<span class="active-session-txt">' + l[7666] + '</span>';     // Active
                }
                else {
                    status = '<span class="expired-session-txt">' + l[1664] + '</span>';    // Expired
                }
            }

            // If unknown country code use question mark gif
            if (!country.icon || country.icon === '??.gif') {
                country.icon = 'ud.gif';
            }

            // Generate row html
            html += '<tr class="' + (currentSession ? "current" : sessionId) +  '">'
                + '<td><span class="fm-browsers-icon"><img title="' + escapeHTML(userAgent.replace(/\s*megext/i, ''))
                    + '" src="' + staticpath + 'images/browser/' + browser.icon
                    + '" /></span><span class="fm-browsers-txt">' + htmlentities(browserName)
                    + '</span></td>'
                + '<td>' + ipAddress + '</td>'
                + '<td><span class="fm-flags-icon"><img alt="" src="' + staticpath + 'images/flags/' + country.icon + '" style="margin-left: 0px;" /></span><span class="fm-flags-txt">' + htmlentities(country.name) + '</span></td>'
                + '<td>' + dateTime + '</td>'
                + '<td>' + status + '</td>';

            // If the session is active show logout button
            if (activeSession) {
                html += '<td>' + '<span class="settings-logout">' + l[967] + '</span>' + '</td></tr>';
            }
            else {
                html += '<td>&nbsp;</td>';
            }

            // If the current session or active then increment count
            if (currentSession || activeSession) {
                numActiveSessions++;
            }
        });
        $('#sessions-table-container').safeHTML(html + '</table>');

        // Don't show button to close other sessions if there's only the current session
        if (numActiveSessions === 1) {
            $('.fm-close-all-sessions').hide();
        }

        $('.fm-close-all-sessions').rebind('click', function() {

            loadingDialog.show();
            var $activeSessionsRows = $('.active-session-txt').parents('tr');

            // Expire all sessions but not the current one
            api_req({ a: 'usr', ko: 1 }, {
                callback: function() {
                    M.account = null; /* clear account cache */
                    $activeSessionsRows.find('.settings-logout').remove();
                    $activeSessionsRows.find('.active-session-txt').removeClass('active-session-txt')
                        .addClass('expired-session-txt').text(l[1664]);
                    loadingDialog.hide();
                }
            });
        });

        $('.settings-logout').rebind('click', function() {

            var $this = $(this).parents('tr');
            var sessionId = $this.attr('class');

            if (sessionId === 'current') {
                mLogout();
            }
            else {
                loadingDialog.show();
                /* usr - user session remove
                 * remove a session Id from the current user,
                 * usually other than the current session
                 */
                api_req({ a: 'usr', s: [sessionId] }, {
                    callback: function(res, ctx) {
                        M.account = null; /* clear account cache */
                        $this.find('.settings-logout').remove();
                        $this.find('.active-session-txt').removeClass('active-session-txt')
                            .addClass('expired-session-txt').text(l[1664]);
                        loadingDialog.hide();
                    }
                });
            }
        });

        $('.account-history-dropdown-button.purchases').text(l[469].replace('[X]', $.purchaselimit));
        $('.account-history-drop-items.purchase10-').text(l[469].replace('[X]', 10));
        $('.account-history-drop-items.purchase100-').text(l[469].replace('[X]', 100));
        $('.account-history-drop-items.purchase250-').text(l[469].replace('[X]', 250));

        M.account.purchases.sort(function(a, b) {
            if (a[1] < b[1]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('.grid-table.purchases tr').remove();
        var html = '<tr><th>' + l[475] + '</th><th>' + l[476] + '</th><th>' + l[477] + '</th><th>' + l[478] + '</th></tr>';

        // Render every purchase made into Purchase History on Account page
        $(account.purchases).each(function(index, purchaseTransaction) {

            if (index === $.purchaselimit) {
                return false;// Break the loop
            }

            // Set payment method
            var paymentMethodId = purchaseTransaction[4];
            var paymentMethod = getGatewayName(paymentMethodId).displayName;

            // Set Date/Time, Item (plan purchased), Amount, Payment Method
            var dateTime = time2date(purchaseTransaction[1]);
            var price = purchaseTransaction[2];
            var proNum = purchaseTransaction[5];
            var numOfMonths = purchaseTransaction[6];
            var monthWording = (numOfMonths == 1) ? l[931] : 'months';  // Todo: l[6788] when generated
            var item = getProPlan(proNum) + ' (' + numOfMonths + ' ' + monthWording + ')';

            // Render table row
            html += '<tr>'
                 +      '<td>' + dateTime + '</td>'
                 +      '<td>'
                 +           '<span class="fm-member-icon">'
                 +                '<img alt="" src="' + staticpath + 'images/mega/icons/retina/pro' + proNum + '@2x.png" />'
                 +           '</span>'
                 +           '<span class="fm-member-icon-txt"> ' + item + '</span>'
                 +      '</td>'
                 +      '<td>&euro;' + htmlentities(price) + '</td>'
                 +      '<td>' + paymentMethod + '</td>'
                 +  '</tr>';
        });

        $('.grid-table.purchases').html(html);
        $('.account-history-dropdown-button.transactions').text(l[471].replace('[X]', $.transactionlimit));
        $('.account-history-drop-items.transaction10-').text(l[471].replace('[X]', 10));
        $('.account-history-drop-items.transaction100-').text(l[471].replace('[X]', 100));
        $('.account-history-drop-items.transaction250-').text(l[471].replace('[X]', 250));

        M.account.transactions.sort(function(a, b) {
            if (a[1] < b[1]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('.grid-table.transactions tr').remove();
        var html = '<tr><th>' + l[475] + '</th><th>' + l[484] + '</th><th>' + l[485] + '</th><th>' + l[486] + '</th></tr>';

        $(account.transactions).each(function(i, el) {

            if (i === $.transactionlimit) {
                return false;
            }

            var credit = '', debit = '';

            if (el[2] > 0) {
                credit = '<span class="green">&euro;' + htmlentities(el[2]) + '</span>';
            }
            else {
                debit = '<span class="red">&euro;' + htmlentities(el[2]) + '</span>';
            }
            html += '<tr><td>' + time2date(el[1]) + '</td><td>' + htmlentities(el[0]) + '</td><td>' + credit + '</td><td>' + debit + '</td></tr>';
        });

        $('.grid-table.transactions').html(html);
        var i = new Date().getFullYear() - 10, html = '', sel = '';
        $('.default-select.year span').text('YYYY');

        while (i >= 1900) {
            if (u_attr.birthyear && i == u_attr.birthyear) {
                sel = 'active';
                $('.default-select.year span').text(u_attr.birthyear);
            }
            else {
                sel = '';
            }

            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i--;
        }

        $('.default-select.year .default-select-scroll').html(html);
        var i = 1, html = '', sel = '';
        $('.default-select.day span').text('DD');

        while (i < 32) {
            if (u_attr.birthday && i == u_attr.birthday) {
                sel = 'active';
                $('.default-select.day span').text(u_attr.birthday);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i++;
        }

        $('.default-select.day .default-select-scroll').html(html);
        var i = 1, html = '', sel = '';
        $('.default-select.month span').text('MM');

        while (i < 13) {
            if (u_attr.birthmonth && i == u_attr.birthmonth) {
                sel = 'active';
                $('.default-select.month span').text(u_attr.birthmonth);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i++;
        }

        $('.default-select.month .default-select-scroll').html(html);
        var html = '', sel = '';
        $('.default-select.country span').text(l[996]);

        for (var country in isoCountries) {
            if (!isoCountries.hasOwnProperty(country)) {
                continue;
            }
            if (u_attr.country && country == u_attr.country) {
                sel = 'active';
                $('.default-select.country span').text(isoCountries[country]);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + country + '">'
                  +      isoCountries[country]
                  + '</div>';
        }
        $('.default-select.country .default-select-scroll').safeHTML(html);

        // Bind Dropdowns events
        bindDropdownEvents($('.fm-account-main .default-select'), 1);

        // Cache selectors
        var $newEmail = $('#account-email');
        var $emailInfoMessage = $('.fm-account-change-email');

        // Reset change email fields after change
        $newEmail.val('');
        $emailInfoMessage.addClass('hidden');

        $passwords.bind('keyup', function() {
            var texts = [];
            $passwords.each(function() {
                texts.push($(this).val());
            });
            $newEmail.val('');
            if (texts.join("") === "") {
                $newEmail.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            }
            else {
                $newEmail.attr('disabled', 'disabled').parents('.fm-account-blocks').addClass('disabled');
            }
        });

        // On text entry in the new email text field
        $newEmail.rebind('keyup', function() {
            var mail = $.trim($newEmail.val());

            $passwords.val('');

            if (mail === "") {
                $passwords.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            } else {
                $passwords.attr('disabled', 'disabled').parents('.fm-account-blocks').addClass('disabled');
            }

            // Show information message
            $emailInfoMessage.removeClass('hidden');

            // If not valid email yet, exit
            if (checkMail(mail)) {
                return;
            }

            // Show save button
            if (mail !== u_attr.email) {
                $('.profile-form.first').addClass('email-confirm');
                $('.fm-account-save-block').removeClass('hidden');
            }
        });

        $('#account-firstname,#account-lastname').rebind('keyup', function(e)
        {
            $('.fm-account-save-block').removeClass('hidden');
        });
        $('.fm-account-cancel').unbind('click');
        $('.fm-account-cancel').bind('click', function(e)
        {
            $passwords.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            $newEmail.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            $('.fm-account-save-block').addClass('hidden');
            $('.profile-form.first').removeClass('email-confirm');
            accountUI();
        });

        $('.fm-account-save').rebind('click', function()
        {
            $passwords.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            $newEmail.removeAttr('disabled').parents('.fm-account-blocks').removeClass('disabled');
            u_attr.firstname = $('#account-firstname').val().trim();
            u_attr.lastname = $('#account-lastname').val().trim();
            u_attr.birthday = $('.default-select.day .default-dropdown-item.active').attr('data-value');
            u_attr.birthmonth = $('.default-select.month .default-dropdown-item.active').attr('data-value');
            u_attr.birthyear = $('.default-select.year .default-dropdown-item.active').attr('data-value');
            u_attr.country = $('.default-select.country .default-dropdown-item.active').attr('data-value');

            $('.fm-account-avatar').html(useravatar.contact(u_handle));
            $('.fm-avatar img').attr('src', useravatar.mine());

            api_req({
                a : 'up',
                firstname  : base64urlencode(to8(u_attr.firstname)),
                lastname   : base64urlencode(to8(u_attr.lastname)),
                birthday   : base64urlencode(u_attr.birthday),
                birthmonth : base64urlencode(u_attr.birthmonth),
                birthyear  : base64urlencode(u_attr.birthyear),
                country    : base64urlencode(u_attr.country)
            }, {
                callback : function(res) {
                    if (res === u_handle) {
                        $('.user-name').text(u_attr.firstname);
                    }
                }
            });

            var pws = zxcvbn($('#account-new-password').val());

            if (M.account.dl_maxSlots)
            {
                mega.config.set('dl_maxSlots', M.account.dl_maxSlots);
                dlQueue.setSize(fmconfig.dl_maxSlots);
                delete M.account.dl_maxSlots;
            }
            if (M.account.ul_maxSlots)
            {
                mega.config.set('ul_maxSlots', M.account.ul_maxSlots);
                ulQueue.setSize(fmconfig.ul_maxSlots);
                delete M.account.ul_maxSlots;
            }
            if (typeof M.account.ul_maxSpeed !== 'undefined')
            {
                mega.config.set('ul_maxSpeed', M.account.ul_maxSpeed);
                delete M.account.ul_maxSpeed;
            }
            if (typeof M.account.use_ssl !== 'undefined')
            {
                mega.config.set('use_ssl', M.account.use_ssl);
                localStorage.use_ssl = M.account.use_ssl;
                use_ssl = M.account.use_ssl;
            }
            if (typeof M.account.ul_skipIdentical !== 'undefined')
            {
                mega.config.set('ul_skipIdentical', M.account.ul_skipIdentical);
                delete M.account.ul_skipIdentical;
            }
            if (typeof M.account.dlThroughMEGAsync !== 'undefined') {
                mega.config.set('dlThroughMEGAsync', M.account.dlThroughMEGAsync);
                delete M.account.dlThroughMEGAsync;
            }

            if (typeof M.account.uisorting !== 'undefined') {
                mega.config.set('uisorting', M.account.uisorting);
            }
            if (typeof M.account.uiviewmode !== 'undefined') {
                mega.config.set('uiviewmode', M.account.uiviewmode);
            }
            if (typeof M.account.rubsched !== 'undefined') {
                mega.config.set('rubsched', M.account.rubsched);
            }
            if (typeof M.account.font_size !== 'undefined') {
                mega.config.set('font_size', M.account.font_size);
                $('body').removeClass('fontsize1 fontsize2')
                    .addClass('fontsize' + fmconfig.font_size);
                delete M.account.font_size;
            }
            if ($('#account-password').val() == '' && ($('#account-new-password').val() !== '' || $('#account-confirm-password').val() !== ''))
            {
                msgDialog('warninga', l[135], l[719], false, function()
                {
                    $('#account-password').focus();
                    $('#account-password').bind('keyup.accpwd', function() {
                        $('.fm-account-save-block').removeClass('hidden');
                        $('#account-password').unbind('keyup.accpwd');
                    });
                });
            } else if ($('#account-password').val() !== '' && !checkMyPassword($('#account-password').val())) {
                msgDialog('warninga', l[135], l[724], false, function() {
                    $('#account-password').val('');
                    $('#account-password').focus();
                    $('#account-password').bind('keyup.accpwd', function() {
                        $('.fm-account-save-block').removeClass('hidden');
                        $('#account-password').unbind('keyup.accpwd');
                    });
                });
            } else if ($('#account-new-password').val() !== $('#account-confirm-password').val()) {
                msgDialog('warninga', 'Error', l[715], false, function()
                {
                    $('#account-new-password').val('');
                    $('#account-confirm-password').val('');
                    $('#account-new-password').focus();
                });
            }
            else if ($('#account-password').val() !== '' && $('#account-confirm-password').val() !== '' && $('#account-new-password').val() !== '' &&  (pws.score === 0 || pws.entropy < 16)) {
                msgDialog('warninga', 'Error', l[1129], false, function() {
                    $('#account-new-password').val('');
                    $('#account-confirm-password').val('');
                    $('#account-new-password').focus();
                });
            } else if ($('#account-confirm-password').val() !== '' && $('#account-password').val() !== ''
                && $('#account-confirm-password').val() !== $('#account-password').val())
            {
                loadingDialog.show();
                changepw($('#account-password').val(), $('#account-confirm-password').val(), {callback: function(res)
                    {
                        loadingDialog.hide();
                        if (res == EACCESS)
                        { // pwd incorrect
                            msgDialog('warninga', l[135], l[724], false, function()
                            {
                                $('#account-password').val('');
                                $('#account-password').focus();
                                $('#account-password').bind('keyup.accpwd', function() {
                                    $('.fm-account-save-block').removeClass('hidden');
                                    $('#account-password').unbind('keyup.accpwd');
                                });
                            });
                        }
                        else if (typeof res == 'number' && res < 0)
                        { // something went wrong
                            $passwords.val('');
                            msgDialog('warninga', 'Error', l[6972]);
                        }
                        else
                        { // success
                            msgDialog('info', l[726], l[725], false, function()
                            {
                                $passwords.val('');
                            });
                        }
                    }});
            }
            else {
                $passwords.val('');
            }

            // Get the new email address
            var email = $('#account-email').val().trim().toLowerCase();

            // If there is text in the email field and it doesn't match the existing one
            if ((email !== '') && (u_attr.email !== email)) {

                loadingDialog.show();

                // Request change of email
                // e => new email address
                // i => requesti (Always has the global variable requesti (last request ID))
                api_req({ a: 'se', aa: 'a', e: email, i: requesti }, { callback : function(res) {

                        loadingDialog.hide();

                        if (res === -12) {
                            return msgDialog('warninga', l[135], l[7717]);
                        }

                        fm_showoverlay();
                        dialogPositioning('.awaiting-confirmation');

                        $('.awaiting-confirmation').removeClass('hidden');
                        $('.fm-account-save-block').addClass('hidden');

                        localStorage.new_email = email;
                    }
                });

                return;
            }

            $('.fm-account-save-block').addClass('hidden');
            showToast('settings', l[7698]);
            accountUI();
        });
        $('.current-email').html(htmlentities(u_attr.email));
        $('#account-firstname').val(u_attr.firstname);
        $('#account-lastname').val(u_attr.lastname);

        $('.account-history-dropdown-button').rebind('click', function() {
            $(this).addClass('active');
            $('.account-history-dropdown').addClass('hidden');
            $(this).next().removeClass('hidden');
        });

        $('.account-history-drop-items').rebind('click', function() {

            $(this).parent().prev().removeClass('active');
            $(this).parent().find('.account-history-drop-items').removeClass('active');
            $(this).parent().parent().find('.account-history-dropdown-button').text($(this).text());

            var c = $(this).attr('class');

            if (!c) {
                c = '';
            }

            if (c.indexOf('session10-') > -1) {
                $.sessionlimit = 10;
            }
            else if (c.indexOf('session100-') > -1) {
                $.sessionlimit = 100;
            }
            else if (c.indexOf('session250-') > -1) {
                $.sessionlimit = 250;
            }

            if (c.indexOf('purchase10-') > -1) {
                $.purchaselimit = 10;
            }
            else if (c.indexOf('purchase100-') > -1) {
                $.purchaselimit = 100;
            }
            else if (c.indexOf('purchase250-') > -1) {
                $.purchaselimit = 250;
            }

            if (c.indexOf('transaction10-') > -1) {
                $.transactionlimit = 10;
            }
            else if (c.indexOf('transaction100-') > -1) {
                $.transactionlimit = 100;
            }
            else if (c.indexOf('transaction250-') > -1) {
                $.transactionlimit = 250;
            }

            if (c.indexOf('voucher10-') > -1) {
                $.voucherlimit = 10;
            }
            else if (c.indexOf('voucher100-') > -1) {
                $.voucherlimit = 100;
            }
            else if (c.indexOf('voucher250-') > -1) {
                $.voucherlimit = 250;
            }
            else if (c.indexOf('voucherAll-') > -1) {
                $.voucherlimit = 'all';
            }

            $(this).addClass('active');
            $(this).closest('.account-history-dropdown').addClass('hidden');
            accountUI();
        });

        // LITE/PRO account
        if (u_attr.p) {
            var bandwidthLimit = Math.round(account.servbw_limit | 0);

            $('#bandwidth-slider').slider({
                min: 0, max: 100, range: 'min', value: bandwidthLimit,
                change: function(e, ui) {
                    if (M.currentdirid === 'account/settings') {
                        bandwidthLimit = ui.value;

                        if (parseInt(localStorage.bandwidthLimit) !== bandwidthLimit) {

                            var done = delay.bind(null, 'bandwidthLimit', function() {
                                api_req({"a": "up", "srvratio": Math.round(bandwidthLimit)});
                                localStorage.bandwidthLimit = bandwidthLimit;
                            }, 2600);

                            if (bandwidthLimit > 99) {
                                msgDialog('warningb:!' + l[776], l[882], l[12689], 0, function(e) {
                                    if (e) {
                                        done();
                                    }
                                    else {
                                        $('.slider-percentage span').text('0 %').removeClass('bold warn');
                                        $('#bandwidth-slider').slider('value', 0);
                                    }
                                });
                            }
                            else {
                                done();
                            }
                        }
                    }
                },
                slide: function(e, ui) {
                    $('.slider-percentage span').text(ui.value + ' %');

                    if (ui.value > 90) {
                        $('.slider-percentage span').addClass('warn bold');
                    }
                    else {
                        $('.slider-percentage span').removeClass('bold warn');
                    }
                }
            });
            $('.slider-percentage span').text(bandwidthLimit + ' %');
            $('.bandwith-settings').removeClass('hidden');
        }

        $('#slider-range-max').slider({
            min: 1, max: 6, range: "min", value: fmconfig.dl_maxSlots || 4, slide: function(e, ui)
            {
                var uiValue = ui.value;
                M.account.dl_maxSlots = uiValue;
                $('.upload-settings .numbers.active').removeClass('active');
                $('.upload-settings .numbers.val' + uiValue).addClass('active');
                $('.fm-account-save-block').removeClass('hidden');
            }
        });
        $('.upload-settings .numbers.active').removeClass('active');
        $('.upload-settings .numbers.val' + $('#slider-range-max').slider('value')).addClass('active');

        $('#slider-range-max2').slider({
            min: 1, max: 6, range: "min", value: fmconfig.ul_maxSlots || 4, slide: function(e, ui)
            {
                var uiValue = ui.value;
                M.account.ul_maxSlots = ui.value;
                $('.download-settings .numbers.active').removeClass('active');
                $('.download-settings .numbers.val' + uiValue).addClass('active');
                $('.fm-account-save-block').removeClass('hidden');
            }
        });
        $('.download-settings .numbers.active').removeClass('active');
        $('.download-settings .numbers.val' + $('#slider-range-max2').slider('value')).addClass('active');

        $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
        var i = 3;
        if ((fmconfig.ul_maxSpeed | 0) === 0) {
            i = 1;
        }
        else if (fmconfig.ul_maxSpeed === -1) {
            i = 2;
        }
        else {
            $('#ulspeedvalue').val(Math.floor(fmconfig.ul_maxSpeed / 1024));
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        if (fmconfig.font_size) {
            $('.uifontsize input')
                .removeClass('radioOn').addClass('radioOff')
                .parent()
                .removeClass('radioOn').addClass('radioOff');
            $('#fontsize' + fmconfig.font_size)
                .removeClass('radioOff').addClass('radioOn')
                .parent()
                .removeClass('radioOff').addClass('radioOn');
        }
        $('.ulspeedradio input').unbind('click');
        $('.ulspeedradio input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id == 'rad2')
                M.account.ul_maxSpeed = -1;
            else if (id == 'rad1')
                M.account.ul_maxSpeed = 0;
            else
            {
                if (parseInt($('#ulspeedvalue').val()) > 0)
                    M.account.ul_maxSpeed = parseInt($('#ulspeedvalue').val()) * 1024;
                else
                    M.account.ul_maxSpeed = 100 * 1024;
            }
            $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });
        $('.uifontsize input').unbind('click');
        $('.uifontsize input').bind('click', function(e)
        {
            $('body').removeClass('fontsize1 fontsize2').addClass('fontsize' + $(this).val());
            $('.uifontsize input').removeClass('radioOn').addClass('radioOff').parent().removeClass('radioOn').addClass('radioOff');
            $(this).removeClass('radioOff').addClass('radioOn').parent().removeClass('radioOff').addClass('radioOn');
            M.account.font_size = $(this).val();
            $('.fm-account-save-block').removeClass('hidden');
        });
        $('#ulspeedvalue').unbind('click keyup');
        $('#ulspeedvalue').bind('click keyup', function(e)
        {
            $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
            $('#rad3,#rad3_div').addClass('radioOn').removeClass('radioOff');
            if (parseInt($('#ulspeedvalue').val()) > 0)
                M.account.ul_maxSpeed = parseInt($('#ulspeedvalue').val()) * 1024;
            else
                M.account.ul_maxSpeed = 100 * 1024;
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.ulskip').removeClass('radioOn').addClass('radioOff');
        var i = 5;
        if (fmconfig.ul_skipIdentical) {
            i = 4;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.ulskip input').unbind('click');
        $('.ulskip input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id == 'rad4')
                M.account.ul_skipIdentical = 1;
            else if (id == 'rad5')
                M.account.ul_skipIdentical = 0;
            $('.ulskip').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.dlThroughMEGAsync').removeClass('radioOn').addClass('radioOff');
        i = 19;
        if (fmconfig.dlThroughMEGAsync) {
            i = 18;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.dlThroughMEGAsync input').unbind('click');
        $('.dlThroughMEGAsync input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id === 'rad18') {
                M.account.dlThroughMEGAsync = 1;
            }
            else if (id === 'rad19') {
                M.account.dlThroughMEGAsync = 0;
            }
            $('.dlThroughMEGAsync').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.uisorting').removeClass('radioOn').addClass('radioOff');
        var i = 8;
        if (fmconfig.uisorting)
            i = 9;
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.uisorting input').unbind('click');
        $('.uisorting input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id == 'rad8')
                M.account.uisorting = 0;
            else if (id == 'rad9')
                M.account.uisorting = 1;
            $('.uisorting').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.uiviewmode').removeClass('radioOn').addClass('radioOff');
        var i = 10;
        if (fmconfig.uiviewmode)
            i = 11;
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.uiviewmode input').unbind('click');
        $('.uiviewmode input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id == 'rad10')
                M.account.uiviewmode = 0;
            else if (id == 'rad11')
                M.account.uiviewmode = 1;
            $('.uiviewmode').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.rubsched, .rubschedopt').removeClass('radioOn').addClass('radioOff');
        var i = 13;
        if (fmconfig.rubsched) {
            i = 12;
            $('#rubsched_options').removeClass('hidden');
            var opt = String(fmconfig.rubsched).split(':');
            $('#rad' + opt[0] + '_opt').val(opt[1]);
            $('#rad' + opt[0] + '_div').removeClass('radioOff').addClass('radioOn');
            $('#rad' + opt[0]).removeClass('radioOff').addClass('radioOn');
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.rubschedopt input').rebind('click', function(e) {
            var id = $(this).attr('id');
            var opt = $('#' + id + '_opt').val();
            M.account.rubsched = id.substr(3) + ':' + opt;
            $('.rubschedopt').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
            initAccountScroll(1);
        });
        $('.rubsched_textopt').rebind('click keyup', function(e) {
            var id = String($(this).attr('id')).split('_')[0];
            $('.rubschedopt').removeClass('radioOn').addClass('radioOff');
            $('#'+id+',#'+id+'_div').addClass('radioOn').removeClass('radioOff');
            M.account.rubsched = id.substr(3) + ':' + $(this).val();
            $('.fm-account-save-block').removeClass('hidden');
            initAccountScroll(1);
        });
        $('.rubsched input').rebind('click', function(e) {
            var id = $(this).attr('id');
            if (id == 'rad13') {
                M.account.rubsched = 0;
                $('#rubsched_options').addClass('hidden');
            }
            else if (id == 'rad12') {
                $('#rubsched_options').removeClass('hidden');
                if (!fmconfig.rubsched) {
                    M.account.rubsched = "14:15";
                    var defOption = 14;
                    $('#rad' + defOption + '_div').removeClass('radioOff').addClass('radioOn');
                    $('#rad' + defOption).removeClass('radioOff').addClass('radioOn');
                }
            }
            $('.rubsched').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
            initAccountScroll(1);
        });

        $('.redeem-voucher').unbind('click');
        $('.redeem-voucher').bind('click', function(event)
        {
            var $this = $(this);
            if ($this.attr('class').indexOf('active') == -1)
            {
                $('.fm-account-overlay').fadeIn(100);
                $this.addClass('active');
                $('.fm-voucher-popup').removeClass('hidden');
                voucherCentering($this);

                $('.fm-account-overlay, .fm-purchase-voucher, .fm-voucher-button').rebind('click.closeDialog', function() {
                    $('.fm-account-overlay').fadeOut(100);
                    $('.redeem-voucher').removeClass('active');
                    $('.fm-voucher-popup').addClass('hidden');
                });
            }
            else
            {
                $('.fm-account-overlay').fadeOut(200);
                $this.removeClass('active');
                $('.fm-voucher-popup').addClass('hidden');
            }
        });

        $('.fm-voucher-body input').unbind('focus');
        $('.fm-voucher-body input').bind('focus', function(e)
        {
            if ($(this).val() == l[487])
                $(this).val('');
        });

        $('.fm-voucher-body input').unbind('blur');
        $('.fm-voucher-body input').bind('blur', function(e)
        {
            if ($(this).val() == '')
                $(this).val(l[487]);
        });

        $('.fm-voucher-button').unbind('click');
        $('.fm-voucher-button').bind('click', function(e)
        {
            if ($('.fm-voucher-body input').val() == l[487])
                msgDialog('warninga', l[135], l[1015]);
            else
            {
                loadingDialog.show();
                api_req({a: 'uavr', v: $('.fm-voucher-body input').val()},
                {
                    callback: function(res, ctx)
                    {
                        loadingDialog.hide();
                        $('.fm-voucher-popup').addClass('hidden');
                        $('.fm-voucher-body input').val(l[487]);
                        if (typeof res == 'number')
                        {
                            if (res == -11)
                                msgDialog('warninga', l[135], l[714]);
                            else if (res < 0)
                                msgDialog('warninga', l[135], l[473]);
                            else
                            {
                                if (M.account)
                                    M.account.lastupdate = 0;
                                accountUI();
                            }
                        }
                    }
                });
            }
        });

        $('.vouchercreate').unbind('click');
        $('.vouchercreate').bind('click', function(e)
        {
            var vouchertype = $('.default-select.vouchertype .default-dropdown-item.active').attr('data-value');
            var voucheramount = parseInt($('#account-voucheramount').val());
            var proceed = false;
            for (var i in M.account.prices)
                if (M.account.prices[i][0] == vouchertype)
                    proceed = true;
            if (!proceed)
            {
                msgDialog('warninga', 'Error', 'Please select the voucher type.');
                return false;
            }
            if (!voucheramount)
            {
                msgDialog('warninga', 'Error', 'Please enter a valid voucher amount.');
                return false;
            }
            if (vouchertype === '19.99') {
                vouchertype = '19.991';
            }
            loadingDialog.show();
            api_req({a: 'uavi', d: vouchertype, n: voucheramount, c: 'EUR'},
            {
                callback: function(res, ctx)
                {
                    M.account.lastupdate = 0;
                    accountUI();
                }
            });
        });

        if (M.account.reseller) {
            var email = 'resellers@mega.nz';

            $('.resellerbuy').attr('href', 'mailto:' + email)
                .find('span').text(l[9106].replace('%1', email));

            // Use 'All' or 'Last 10/100/250' for the dropdown text
            var buttonText = ($.voucherlimit === 'all') ? l[7557] : l['466a'].replace('[X]', $.voucherlimit);

            $('.fm-account-button.reseller').removeClass('hidden');
            $('.account-history-dropdown-button.vouchers').text(buttonText);
            $('.account-history-drop-items.voucher10-').text(l['466a'].replace('[X]', 10));
            $('.account-history-drop-items.voucher100-').text(l['466a'].replace('[X]', 100));
            $('.account-history-drop-items.voucher250-').text(l['466a'].replace('[X]', 250));

            // Sort vouchers by most recently created at the top
            M.account.vouchers.sort(function(a, b) {

                if (a['date'] < b['date']) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.grid-table.vouchers tr').remove();
            var html = '<tr><th>' + l[475] + '</th><th>' + l[7714] + '</th><th>' + l[477] + '</th><th>' + l[488] + '</th></tr>';

            $(account.vouchers).each(function(i, el) {

                // Only show the last 10, 100, 250 or if the limit is not set show all vouchers
                if (($.voucherlimit !== 'all') && (i >= $.voucherlimit)) {
                    return false;
                }

                var status = l[489];
                if (el.redeemed > 0 && el.cancelled == 0 && el.revoked == 0)
                    status = l[490] + ' ' + time2date(el.redeemed);
                else if (el.revoked > 0 && el.cancelled > 0)
                    status = l[491] + ' ' + time2date(el.revoked);
                else if (el.cancelled > 0)
                    status = l[492] + ' ' + time2date(el.cancelled);

                var voucherLink = 'https://mega.nz/#voucher' + htmlentities(el.code);

                html += '<tr><td>' + time2date(el.date) + '</td><td class="selectable">' + voucherLink + '</td><td>&euro; ' + htmlentities(el.amount) + '</td><td>' + status + '</td></tr>';
            });
            $('.grid-table.vouchers').html(html);
            $('.default-select.vouchertype .default-select-scroll').html('');
            var prices = [];
            for (var i in M.account.prices) {
                prices.push(M.account.prices[i][0]);
            }
            prices.sort(function(a, b) {
                return (a - b)
            })

            var voucheroptions = '';
            for (var i in prices)
                voucheroptions += '<div class="default-dropdown-item" data-value="' + htmlentities(prices[i]) + '">&euro;' + htmlentities(prices[i]) + ' voucher</div>';
            $('.default-select.vouchertype .default-select-scroll').html(voucheroptions);
            bindDropdownEvents($('.default-select.vouchertype'));
        }

        $('.fm-purchase-voucher,.default-big-button.topup').unbind('click');
        $('.fm-purchase-voucher,.default-big-button.topup').bind('click', function(e)
        {
            document.location.hash = 'resellers';
        });

        if (is_extension || ssl_needed())
            $('#acc_use_ssl').hide();

        $('.usessl').removeClass('radioOn').addClass('radioOff');
        var i = 7;
        if (use_ssl)
            i = 6;
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.usessl input').unbind('click');
        $('.usessl input').bind('click', function(e)
        {
            var id = $(this).attr('id');
            if (id == 'rad7')
                M.account.use_ssl = 0;
            else if (id == 'rad6')
                M.account.use_ssl = 1;
            $('.usessl').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            $('.fm-account-save-block').removeClass('hidden');
        });

        $('.fm-account-remove-avatar,.fm-account-avatar').rebind('click', function() {
            msgDialog('confirmation', l[1756], l[6973], false, function(e) {
                if (e) {
                    mega.attr.set('a', 'none', true, false);

                    useravatar.invalidateAvatar(u_handle);
                    $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle));
                    $('.fm-avatar img').attr('src', useravatar.mine());
                    $('.fm-account-remove-avatar').hide();
                }
            });
        });

        $('.fm-account-change-avatar,.fm-account-avatar').unbind('click');
        $('.fm-account-change-avatar,.fm-account-avatar').bind('click', function(e)
        {
            avatarDialog();
        });
        $('.fm-account-avatar').html(useravatar.contact(u_handle));

        $('#find-duplicate').rebind('click', mega.utils.findDupes);

        $.tresizer();

    }, 1);

    // Show first name or last name
    if (u_attr.firstname) {
        $('.membership-big-txt.name').text(u_attr.firstname + ' ' + u_attr.lastname);
    }
    else {
        $('.membership-big-txt.name').text(u_attr.name);
    }

    // Show email address
    if (u_attr.email) {
        $('.membership-big-txt.email').text(u_attr.email);
    }
    else {
        $('.membership-big-txt.email').hide();
    }

    $('.editprofile').rebind('click', function() {
        document.location.hash = 'fm/account/profile';
    });

    $('.rubbish-bin-link').rebind('click', function() {
        document.location.hash = 'fm/rubbish';
    });

    // Cancel account button on main Account page
    $('.cancel-account').rebind('click', function() {

        // Please confirm that all your data will be deleted
        var confirmMessage = l[1974];

        // Search through their Pro plan purchase history
        $(account.purchases).each(function(index, purchaseTransaction) {

            // Get payment method name
            var paymentMethodId = purchaseTransaction[4];
            var paymentMethod = getGatewayName(paymentMethodId).name;

            // If they have paid with iTunes or Google Play in the past
            if ((paymentMethod === 'apple') || (paymentMethod === 'google')) {

                // Update confirmation message to remind them to cancel iTunes or Google Play
                confirmMessage += ' ' + l[8854];
                return false;
            }
        });

        // Ask for confirmation
        msgDialog('confirmation', l[6181], confirmMessage, false, function(event) {
            if (event) {
                loadingDialog.show();
                api_req({ a: 'erm', m: Object(M.u[u_handle]).m, t: 21 }, {
                    callback: function(res) {
                        loadingDialog.hide();
                        if (res === ENOENT) {
                            msgDialog('warningb', l[1513], l[1946]);
                        }
                        else if (res === 0) {
                            handleResetSuccessDialogs('.reset-success', l[735], 'deleteaccount');
                        }
                        else {
                            msgDialog('warningb', l[135], l[200]);
                        }
                    }
                });
            }
        });
    });

    // Button on main Account page to backup their master key
    $('.backup-master-key').rebind('click', function() {
        document.location.hash = 'backup';
    });

    $('.fm-account-button').unbind('click');
    $('.fm-account-button').bind('click', function() {
        if ($(this).attr('class').indexOf('active') == -1) {
            switch (true) {
                case ($(this).attr('class').indexOf('overview') >= 0):
                    document.location.hash = 'fm/account';
                    break;
                case ($(this).attr('class').indexOf('profile') >= 0):
                    document.location.hash = 'fm/account/profile';
                    break;
                case ($(this).attr('class').indexOf('settings') >= 0):
                    document.location.hash = 'fm/account/settings';
                    break;
                case ($(this).attr('class').indexOf('history') >= 0):
                    document.location.hash = 'fm/account/history';
                    break;
                case ($(this).attr('class').indexOf('reseller') >= 0):
                    document.location.hash = 'fm/account/reseller';
                    break;
            }
        }
    });

    $('.account-pass-lines').attr('class', 'account-pass-lines');
    $('#account-new-password').bind('keyup', function(el)
    {
        $('.account-pass-lines').attr('class', 'account-pass-lines');
        if ($(this).val() !== '') {
            var pws = zxcvbn($(this).val());
            if (pws.score > 3 && pws.entropy > 75) {
                $('.account-pass-lines').addClass('good4');
            } else if (pws.score > 2 && pws.entropy > 50) {
                $('.account-pass-lines').addClass('good3');
            } else if (pws.score > 1 && pws.entropy > 40) {
                $('.account-pass-lines').addClass('good2');
            } else if (pws.score > 0 && pws.entropy > 15) {
                $('.account-pass-lines').addClass('good1');
            } else {
                $('.account-pass-lines').addClass('weak-password');
            }
        }
    });

    $('#account-confirm-password').bind('keyup', function(el) {

        if ($(this).val() === $('#account-new-password').val()) {
            $('.fm-account-save-block').removeClass('hidden');
        }
    });
}

function handleResetSuccessDialogs(dialog, txt, dlgString) {

    $('.fm-dialog' + dialog + ' .reg-success-txt').text(txt);

    $('.fm-dialog' + dialog + ' .fm-dialog-button').rebind('click', function() {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
        $('.fm-dialog' + dialog).addClass('hidden');
        delete $.dialog;
    });

    $('.fm-dialog-overlay').removeClass('hidden');
    $('body').addClass('overlayed');
    $('.fm-dialog' + dialog).removeClass('hidden');

    $.dialog = dlgString;
}

function avatarDialog(close)
{
    if (close)
    {
        $.dialog = false;
        $('.avatar-dialog').addClass('hidden');
        fm_hideoverlay();
        return true;
    }
    $.dialog = 'avatar';
    $('.fm-dialog.avatar-dialog').removeClass('hidden');
    fm_showoverlay();
    $('.avatar-body').safeHTML(
        '<div id="avatarcrop">' +
            '<div class="image-upload-and-crop-container">' +
                '<div class="image-explorer-container empty">' +
                    '<div class="image-explorer-image-view">' +
                        '<img class="image-explorer-source" />' +
                        '<div class="avatar-white-bg"></div>' +
                        '<div class="image-explorer-mask circle-mask"></div>' +
                        '<div class="image-explorer-drag-delegate"></div>' +
                    '</div>' +
                    '<div class="image-explorer-scale-slider-wrapper">' +
                        '<input class="image-explorer-scale-slider disabled" type="range" ' +
                            'min="0" max="100" step="1" value="0" disabled="" />' +
                    '</div>' +
                '</div>' +
                '<div class="fm-notifications-bottom">' +
                    '<input type="file" id="image-upload-and-crop-upload-field" class="image-upload-field" ' +
                        'accept="image/jpeg, image/gif, image/png" />' +
                    '<label for="image-upload-and-crop-upload-field" ' +
                        'class="image-upload-field-replacement fm-account-change-avatar">' +
                        '<span>@@</span>' +
                    '</label>' +
                    '<div class="fm-account-change-avatar" id="fm-change-avatar">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div  class="fm-account-change-avatar" id="fm-cancel-avatar">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div class="clear"></div>' +
                '</div>' +
            '</div>' +
        '</div>', l[1016], l[1017], l[82]);
    $('#fm-change-avatar').hide();
    $('#fm-cancel-avatar').hide();
    var imageCrop = new ImageUploadAndCrop($("#avatarcrop").find('.image-upload-and-crop-container'),
        {
            cropButton: $('#fm-change-avatar'),
            dragDropUploadPrompt:l[1390],
            outputFormat: 'image/jpeg',
            onCrop: function(croppedDataURI)
            {
                if (croppedDataURI.length > 64 * 1024) {
                    return msgDialog('warninga', l[8645], l[8646]);
                }
                var data = dataURLToAB(croppedDataURI);

                mega.attr.set('a', ab_to_base64(data), true, false);
                useravatar.setUserAvatar(u_handle, data, this.outputFormat);

                $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle));
                $('.fm-avatar img').attr('src', useravatar.mine());
                avatarDialog(1);
            },
            onImageUpload: function()
            {
                $('.image-upload-field-replacement.fm-account-change-avatar').hide();
                $('#fm-change-avatar').show();
                $('#fm-cancel-avatar').show();
            },
            onImageUploadError: function()
            {

            }
        });
    $('#fm-cancel-avatar,.fm-dialog.avatar-dialog .fm-dialog-close').unbind('click');
    $('#fm-cancel-avatar,.fm-dialog.avatar-dialog .fm-dialog-close').bind('click', function(e)
    {
        avatarDialog(1);
    });
}

function gridUI() {
    if (M.chat)
        return;
    if (d)
        console.time('gridUI');
    // $.gridDragging=false;
    $.gridLastSelected = false;
    $('.fm-files-view-icon.listing-view').addClass('active');
    $('.fm-files-view-icon.block-view').removeClass('active');

    $.gridHeader = function() {
        var headerColumn = '';
        $('.grid-table tr:first-child td:visible').each(function(i, e) {
            headerColumn = $('.grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.detailsGridHeader = function() {
        var headerColumn = '';
        $('.contact-details-view .grid-table tr:first-child td').each(function(i, e) {
            headerColumn = $('.contact-details-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.contactGridHeader = function() {
        var headerColumn = '',
            i = 0,
            w = 0,
            el = $('.files-grid-view.contacts-view .grid-table-header th');
        while (i < el.length) {
            if (i !== 0) {
                w += $(el[i]).width();
            }
            i++;
        }
        $('.files-grid-view.contacts-view .grid-scrolling-table tr:first-child td').each(function(i, e) {
            headerColumn = $('.files-grid-view.contacts-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.opcGridHeader = function() {
        var headerColumn = '',
            i = 0,
            w = 0,
            el = $('.sent-requests-grid .grid-table-header th');
        while (i < el.length) {
            if (i !== 0) {
                w += $(el[i]).width();
            }
            i++;
        }
        $('.sent-requests-grid .grid-scrolling-table tr:first-child td').each(function(i, e) {
            headerColumn = $('.sent-requests-grid .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.ipcGridHeader = function() {
        var headerColumn = '',
            i = 0,
            w = 0,
            el = $('.contact-requests-grid .grid-table-header th');
        while (i < el.length) {
            if (i !== 0) {
                w += $(el[i]).width();
            }
            i++;
        }
        $('.contact-requests-grid .grid-scrolling-table tr:first-child td').each(function(i, e) {
            headerColumn = $('.contact-requests-grid .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.sharedGridHeader = function() {
        var el = $('.shared-grid-view .grid-table-header th'),
            headerColumn = '',
            i = 0,
            w = 0;
        while (i < el.length) {
            if (i !== 0) {
                w += $(el[i]).width();
            }
            i++;
        }
        $('.shared-grid-view .grid-scrolling-table tr:first-child td').each(function(i, e) {
            headerColumn = $('.shared-grid-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $('.fm-blocks-view.fm').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.shared-blocks-view').addClass('hidden');
    $('.shared-grid-view').addClass('hidden');

    $('.files-grid-view.fm').addClass('hidden');
    $('.fm-blocks-view.contacts-view').addClass('hidden');
    $('.files-grid-view.contacts-view').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');
    $('.files-grid-view.contact-details-view').addClass('hidden');
    $('.fm-blocks-view.contact-details-view').addClass('hidden');

    if (M.currentdirid === 'contacts') {
        $('.files-grid-view.contacts-view').removeClass('hidden');
        $.contactGridHeader();
        initContactsGridScrolling();
    } else if (M.currentdirid === 'opc') {
        $('.grid-table.sent-requests').removeClass('hidden');
        $.opcGridHeader();
        initOpcGridScrolling();
    } else if (M.currentdirid === 'ipc') {
        $('.grid-table.contact-requests').removeClass('hidden');
        $.ipcGridHeader();
        initIpcGridScrolling();
    } else if (M.currentdirid === 'shares') {
        $('.shared-grid-view').removeClass('hidden');
        $.sharedGridHeader();
        initGridScrolling();
    } else if (String(M.currentdirid).length === 11 && M.currentrootid == 'contacts') {// Cloud-drive/File manager
        $('.contacts-details-block').removeClass('hidden');
        if (M.v.length > 0) {
            $('.files-grid-view.contact-details-view').removeClass('hidden');
            $.detailsGridHeader();
            initGridScrolling();
        }
    } else {
        $('.files-grid-view.fm').removeClass('hidden');
        initGridScrolling();
        $.gridHeader();
    }

    if (folderlink) {
        $('.grid-url-arrow').hide();
        $('.grid-url-header').text('');
    } else {
        $('.grid-url-arrow').show();
        $('.grid-url-header').text('');
    }

    $('.fm .grid-table-header th').rebind('contextmenu', function(e) {
        $('.file-block').removeClass('ui-selected');
        $.selected = [];
        $.hideTopMenu();
        return !!contextMenuUI(e, 6);
    });

    $('.files-grid-view, .fm-empty-cloud, .fm-empty-folder').rebind('contextmenu.fm', function(e) {
        $('.file-block').removeClass('ui-selected');
        $.selected = [];
        $.hideTopMenu();
        return !!contextMenuUI(e, 2);
    });

    // enable add star on first column click (make favorite)
    $('.grid-table.fm tr td:first-child').rebind('click', function() {
        var id = [$(this).parent().attr('id')];
        M.favourite(id, $('.grid-table.fm #' + id[0] + ' .grid-status-icon').hasClass('star'));
    });

    $('.context-menu-item.do-sort').rebind('click', function() {
        M.setLastColumn($(this).data('by'));
        M.doSort($(this).data('by'), -1);
        M.renderMain();
    });

    $('.grid-table-header .arrow').rebind('click', function() {
        var c = $(this).attr('class');
        var d = 1;
        if (c && c.indexOf('desc') > -1)
            d = -1;

        for (var e in M.sortRules) {
            if (c && c.indexOf(e) > -1) {
                M.doSort(e, d);
                M.renderMain();
                break;
            }
        }
    });

    if (M.currentdirid === 'shares')
        $.selectddUIgrid = '.shared-grid-view .grid-scrolling-table';
    else if (M.currentdirid === 'contacts')
        $.selectddUIgrid = '.grid-scrolling-table.contacts';
    else if (M.currentdirid === 'ipc')
        $.selectddUIgrid = '.contact-requests-grid .grid-scrolling-table';
    else if (M.currentdirid === 'opc')
        $.selectddUIgrid = '.sent-requests-grid .grid-scrolling-table';
    else if (String(M.currentdirid).length === 11 && M.currentrootid == 'contacts')
        $.selectddUIgrid = '.files-grid-view.contact-details-view .grid-scrolling-table';
    else
        $.selectddUIgrid = '.files-grid-view.fm .grid-scrolling-table';

    $.selectddUIitem = 'tr';
    Soon(selectddUI);

    if (d)
        console.timeEnd('gridUI');
}

/**
 * Really simple shortcut logic for select all, copy, paste, delete
 *
 * @constructor
 */
function FMShortcuts() {

    var current_operation = null;

    // unbind if already bound.
    $(window).unbind('keydown.fmshortcuts');

    // bind
    $(window).bind('keydown.fmshortcuts', function(e) {

        if (!is_fm())
            return true;

        e = e || window.event;

        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if ($(e.target).is("input, textarea, select") || $.dialog) {
            return;
        }
        var charCode = e.which || e.keyCode; // ff
        var charTyped = String.fromCharCode(charCode).toLowerCase();

        if (charTyped == "a" && (e.ctrlKey || e.metaKey)) {
            if (typeof selectionManager != 'undefined' && selectionManager) {
                selectionManager.select_all();
            }
            return false; // stop prop.
        } else if (
            (charTyped == "c" || charTyped == "x") &&
            (e.ctrlKey || e.metaKey)
            ) {
            var $items = selectionManager.get_selected();
            if ($items.size() == 0) {
                return; // dont do anything.
            }

            current_operation = {
                'op': charTyped == "c" ? 'copy' : 'cut',
                'src': $items
            };
            return false; // stop prop.
        } else if (charTyped == "v" && (e.ctrlKey || e.metaKey)) {
            if (!current_operation) {
                return false; // stop prop.
            }

            $.each(current_operation.src, function(k, v) {
                if (current_operation.op == "copy") {
                    M.copyNodes([$(v).attr('id')], M.currentdirid);
                } else if (current_operation.op == "cut") {
                    M.moveNodes([$(v).attr('id')], M.currentdirid);
                }
            });

            if (current_operation.op == "cut") {
                current_operation = null;
            }

            return false; // stop prop.
        } else if (charCode == 8) {
            var $items = selectionManager.get_selected();
            if ($items.size() == 0 || (RightsbyID(M.currentdirid || '') | 0) < 1) {
                return; // dont do anything.
            }

            $.selected = [];
            $items.each(function() {
                $.selected.push($(this).attr('id'));
            });

            fmremove();

            // force remove, no confirmation
            if (e.ctrlKey || e.metaKey) {
                $('#msgDialog:visible .fm-dialog-button.confirm').trigger('click');
            }

            return false;
        }

    });
}

/**
 * Simple way for searching for nodes by their first letter.
 *
 * PS: This is meant to be somehow reusable.
 *
 * @param searchable_elements selector/elements a list/selector of elements which should be searched for the user
 * specified key press character
 * @param containers selector/elements a list/selector of containers to which the input field will be centered (the code
 * will dynamically detect and pick the :visible container)
 *
 * @returns {*}
 * @constructor
 */
var QuickFinder = function(searchable_elements, containers) {
    var self = this;

    var DEBUG = false;

    self._is_active = false; // defined as a prop of this. so that when in debug mode it can be easily accessed from
    // out of this scope

    var last_key = null;
    var next_idx = 0;

    // hide on page change
    $(window).unbind('hashchange.quickfinder');
    $(window).bind('hashchange.quickfinder', function() {
        if (self.is_active()) {
            self.deactivate();
        }
    });

    // unbind if already bound.
    $(window).unbind('keypress.quickFinder');

    // bind
    $(window).bind('keypress.quickFinder', function(e) {

        e = e || window.event;
        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if ($(e.target).is("input, textarea, select") || $.dialog)
            return;

        var charCode = e.which || e.keyCode; // ff

        if (
            (charCode >= 48 && charCode <= 57) ||
            (charCode >= 65 && charCode <= 123) ||
            charCode > 255
            ) {
            var charTyped = String.fromCharCode(charCode);

            // get the currently visible container
            var $container = $(containers).filter(":visible");
            if ($container.size() == 0) {
                // no active container, this means that we are receiving events for a page, for which we should not
                // do anything....
                return;
            }

            self._is_active = true;

            $(self).trigger("activated");

            var $found = $(searchable_elements).filter(":visible:istartswith('" + charTyped + "')");

            if (
                /* repeat key press, but show start from the first element */
                    (last_key != null && ($found.size() - 1) <= next_idx)
                    ||
                    /* repeat key press is not active, should reset the target idx to always select the first element */
                        (last_key == null)
                        ) {
                    next_idx = 0;
                    last_key = null;
                } else if (last_key == charTyped) {
                    next_idx++;
                } else if (last_key != charTyped) {
                    next_idx = 0;
                }
                last_key = charTyped;

                $(searchable_elements).parents(".ui-selectee, .ui-draggable").removeClass('ui-selected');

                var $target_elm = $($found[next_idx]);

                $target_elm.parents(".ui-selectee, .ui-draggable").addClass("ui-selected");

                var $jsp = $target_elm.getParentJScrollPane();
                if ($jsp) {
                    var $scrolled_elm = $target_elm.parent("a");

                    if ($scrolled_elm.size() == 0) { // not in icon view, its a list view, search for a tr
                        $scrolled_elm = $target_elm.parents('tr:first');
                    }
                    $jsp.scrollToElement($scrolled_elm);
                }

                $(self).trigger('search');

                if ($target_elm && $target_elm.size() > 0) {
                    // ^^ DONT stop prop. if there are no found elements.
                    return false;
                }
            }
            else if (charCode >= 33 && charCode <= 36)
            {
                var e = '.files-grid-view.fm';
                if (M.viewmode == 1)
                    e = '.fm-blocks-view.fm';

                if ($(e + ':visible').length)
                {
                    e = $('.grid-scrolling-table:visible, .file-block-scrolling:visible');
                    var jsp = e.data('jsp');

                    if (jsp)
                    {
                        switch (charCode)
                        {
                            case 33: /* Page Up   */
                                jsp.scrollByY(-e.height(), !0);
                                break;
                            case 34: /* Page Down */
                                jsp.scrollByY(e.height(), !0);
                                break;
                            case 35: /* End       */
                                jsp.scrollToBottom(!0);
                                break;
                            case 36: /* Home      */
                                jsp.scrollToY(0, !0);
                                break;
                        }
                    }
                }
            }
        });

    // hide the search field when the user had clicked somewhere in the document
    $(document.body).delegate('> *', 'mousedown', function(e) {
        if (!is_fm()) {
            return;
        }
        if (self.is_active()) {
            self.deactivate();
            return false;
        }
    });

    // use events as a way to communicate with this from the outside world.
    self.deactivate = function() {
        self._is_active = false;
        $(self).trigger("deactivated");
    };

    self.is_active = function() {
        return self._is_active;
    };

    self.disable_if_active = function() {
        if (self.is_active()) {
            self.deactivate();
        }
    };

    return this;
};

var quickFinder = new QuickFinder(
    '.tranfer-filetype-txt, .file-block-title, td span.contacts-username',
    '.files-grid-view, .fm-blocks-view.fm, .contacts-grid-table'
    );

/**
 * This should take care of flagging the LAST selected item in those cases:
 *
 *  - jQ UI $.selectable's multi selection using drag area (integrated using jQ UI $.selectable's Events)
 *
 *  - Single click selection (integrated by assumption that the .get_currently_selected will also try to cover this case
 *  when there is only one .ui-selected...this is how no other code had to be changed :))
 *
 *  - Left/right/up/down keys (integrated by using the .set_currently_selected and .get_currently_selected public
 *  methods)
 *
 * @param $selectable
 * @returns {*}
 * @constructor
 */
var SelectionManager = function($selectable) {
    var self = this;

    $selectable.unbind('selectableselecting');
    $selectable.unbind('selectableselected');
    $selectable.unbind('selectableunselecting');
    $selectable.unbind('selectableunselected');

    /**
     * Store all selected items in an _ordered_ array.
     *
     * @type {Array}
     */
    var selected_list = [];

    /**
     * Helper func to clear old reset state from other icons.
     */
    this.clear = function() {
        $('.currently-selected', $selectable).removeClass('currently-selected');
    };

    this.clear(); // remove ANY old .currently-selected values.

    /**
     * The idea of this method is to _validate_ and return the .currently-selected element.
     *
     * @param first_or_last string ("first" or "last") by default will return the first selected element if there is
     * not .currently-selected
     *
     * @returns {*|jQuery|HTMLElement}
     */
    this.get_currently_selected = function(first_or_last) {
        if (!first_or_last) {
            first_or_last = "first";
        }

        var $currently_selected = $('.currently-selected', $selectable);

        if ($currently_selected.size() == 0) { // NO .currently-selected
            return $('.ui-selected:' + first_or_last, $selectable);
        } else if (!$currently_selected.is(".ui-selected")) { // validate that the currently selected is actually selected.
            // if not, try to get the first_or_last .ui-selected item
            var selected_elms = $('.ui-selected:' + first_or_last, $selectable);
            return selected_elms;
        } else { // everything is ok, we should return the .currently-selected
            return $currently_selected;
        }
    };

    /**
     * Used from the shortcut keys code.
     *
     * @param element
     */
    this.set_currently_selected = function($element) {

        self.clear();
        $element.addClass("currently-selected");
        quickFinder.disable_if_active();

        // Do .scrollIntoView if the parent or parent -> parent DOM Element is a JSP.
        {
            var $jsp = $element.getParentJScrollPane();
            if ($jsp) {
                $jsp.scrollToElement($element);
            }
        }
    };

    /**
     * Simple helper func, for selecting all elements in the current view.
     */
    this.select_all = function() {
        $(window).trigger('dynlist.flush');
        var $selectable_containers = $(
            [
                ".fm-transfers-block",
                ".fm-blocks-view.fm",
                ".fm-blocks-view.contacts-view",
                ".files-grid-view.fm",
                ".files-grid-view.contacts-view",
                ".contacts-grid-view",
                ".fm-contacts-blocks-view",
                ".files-grid-view.contact-details-view",
                ".shared-grid-view",
                ".shared-blocks-view",
                ".shared-details-block"
            ].join(",")
            ).filter(":visible");

        var $selectables = $(
            [
                ".file-block",
                "tr.ui-draggable",
                "tr.ui-selectee",
                ".contact-block-view.ui-draggable",
                ".transfer-table tr"
            ].join(","),
            $selectable_containers
            ).filter(":visible");

        $selectables.addClass("ui-selected");
    };

    /**
     * Use this to get ALL (multiple!) selected items in the currently visible view/grid.
     */
    this.get_selected = function() {
        var $selectable_containers = $(
            [
                ".fm-blocks-view.fm",
                ".fm-blocks-view.contacts-view",
                ".files-grid-view.fm",
                ".files-grid-view.contacts-view",
                ".contacts-grid-view",
                ".fm-contacts-blocks-view",
                ".files-grid-view.contact-details-view"
            ].join(",")
            ).filter(":visible");

        var $selected = $(
            [
                ".file-block",
                "tr.ui-draggable",
                "tr.ui-selectee",
                ".contact-block-view.ui-draggable"
            ].join(","),
            $selectable_containers
            ).filter(":visible.ui-selected");

        return $selected;
    };

    /**
     * Push the last selected item to the end of the selected_list array.
     */
    $selectable.bind('selectableselecting', function(e, data) {
        var $selected = $(data.selecting);
        selected_list.push(
            $selected
            );
    });

    /**
     * Remove any unselected element from the selected_list array.
     */
    $selectable.bind('selectableunselecting', function(e, data) {
        var $unselected = $(data.unselecting);
        var idx = $.elementInArray($unselected, selected_list);

        if (idx > -1) {
            delete selected_list[idx];
        }
    });

    /**
     * After the user finished selecting the icons, flag the last selected one as .currently-selecting
     */
    $selectable.bind('selectablestop', function(e, data) {

        self.clear();

        // remove `undefined` from the list
        selected_list = $.map(selected_list, function(n, i) {
            if (n != undefined) {
                return n;
            }
        });

        // add the .currently-selected
        if (selected_list.length > 0) {
            $(selected_list[selected_list.length - 1]).addClass('currently-selected');
        }
        selected_list = []; // reset the state of the last selected items for the next selectablestart
    });
    return this;
};

var selectionManager;

function UIkeyevents() {
    $(window).unbind('keydown.uikeyevents');
    $(window).bind('keydown.uikeyevents', function(e) {

        if (e.keyCode == 9 && !$(e.target).is("input,textarea,select")) {
            return false;
        }

        var sl = false, s;
        if (M.viewmode) {
            s = $('.file-block.ui-selected');
        }
        else {
            s = $('.grid-table tr.ui-selected');
        }
        var selPanel = $('.fm-transfers-block tr.ui-selected');

        if (M.chat) {
            return true;
        }

        if (!is_fm() && (page !== 'login') && (page.substr(0, 3) !== 'pro')) {
            return true;
        }

        /**
         * Because of te .unbind, this can only be here... it would be better if its moved to iconUI(), but maybe some
         * other day :)
         */
        if (!$.dialog && !slideshowid && M.viewmode == 1) {
            var items_per_row = Math.floor($('.file-block').parent().outerWidth() / $('.file-block:first').outerWidth(true));
            var total_rows = Math.ceil($('.file-block').size() / items_per_row);

            if (e.keyCode == 37) {
                // left
                var current = selectionManager.get_currently_selected("first");
                // clear old selection if no shiftKey
                if (!e.shiftKey) {
                    s.removeClass("ui-selected");
                }
                var $target_element = null;
                if (current.length > 0 && current.prev(".file-block").length > 0) {
                    $target_element = current.prev(".file-block");
                }
                else {
                    $target_element = $('.file-block:last');
                }
                if ($target_element) {
                    $target_element.addClass('ui-selected');
                    selectionManager.set_currently_selected($target_element);
                }
            }
            else if (e.keyCode == 39) {

                // right
                var current = selectionManager.get_currently_selected("last");
                if (!e.shiftKey) {
                    s.removeClass("ui-selected");
                }
                var $target_element = null;
                var next = current.next(".file-block");

                // clear old selection if no shiftKey
                if (next.length > 0) {
                    $target_element = next;
                }
                else {
                    $target_element = $('.file-block:first');
                }
                if ($target_element) {
                    $target_element.addClass('ui-selected');
                    selectionManager.set_currently_selected($target_element);
                }
            }

            // up & down
            else if (e.keyCode == 38 || e.keyCode == 40) {
                var current = selectionManager.get_currently_selected("first"),
                    current_idx = $.elementInArray(current, $('.file-block')) + 1;

                if (!e.shiftKey) {
                    s.removeClass("ui-selected");
                }

                var current_row = Math.ceil(current_idx / items_per_row),
                    current_col = current_idx % items_per_row,
                    target_row;

                if (e.keyCode == 38) { // up
                    // handle the case when the users presses ^ and the current row is the first row
                    target_row = current_row == 1 ? total_rows : current_row - 1;
                } else if (e.keyCode == 40) { // down
                    // handle the case when the users presses DOWN and the current row is the last row
                    target_row = current_row == total_rows ? 1 : current_row + 1;
                }

                // calc the index of the target element
                var target_element_num = ((target_row - 1) * items_per_row) + (current_col - 1),
                    $target = $('.file-block:eq(' + target_element_num + ')');

                $target.addClass("ui-selected");
                selectionManager.set_currently_selected($target);
            }
        }

        if ((e.keyCode == 38) && (s.length > 0) && ($.selectddUIgrid.indexOf('.grid-scrolling-table') > -1) && !$.dialog) {

            // up in grid
            if (e.shiftKey) {
                $(e).addClass('ui-selected');
            }
            if ($(s[0]).prev().length > 0) {
                if (!e.shiftKey) {
                    $('.grid-table tr').removeClass('ui-selected');
                }
                $(s[0]).prev().addClass('ui-selected');
                sl = $(s[0]).prev();

                quickFinder.disable_if_active();
            }
        }
        else if (e.keyCode == 40 && s.length > 0 && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 && !$.dialog) {

            // down in grid
            if (e.shiftKey) {
                $(e).addClass('ui-selected');
            }
            if ($(s[s.length - 1]).next().length > 0) {
                if (!e.shiftKey) {
                    $('.grid-table tr').removeClass('ui-selected');
                }
                $(s[s.length - 1]).next().addClass('ui-selected');
                sl = $(s[0]).next();

                quickFinder.disable_if_active();
            }
        }
        else if (e.keyCode == 46 && s.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            $.selected = [];
            s.each(function(i, e) {
                $.selected.push($(e).attr('id'));
            });
            fmremove();
        }
        else if (e.keyCode == 46 && selPanel.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            var selected = [];
            selPanel.each(function() {
                selected.push($(this).attr('id'));
            });
            msgDialog('confirmation', l[1003], "Cancel " + selected.length + " transferences?", false, function(e) {

                // we should encapsule the click handler
                // to call a function rather than use this hacking
                if (e) {
                    $('.transfer-clear').trigger('click');
                }
            });
        }
        else if (e.keyCode == 13 && s.length > 0 && !$.dialog && !$.msgDialog && $('.fm-new-folder').attr('class').indexOf('active') == -1 && $('.top-search-bl').attr('class').indexOf('active') == -1) {
            $.selected = [];
            s.each(function(i, e) {
                $.selected.push($(e).attr('id'));
            });
            if ($.selected && $.selected.length > 0) {
                var n = M.d[$.selected[0]];
                if (n && n.t) {
                    M.openFolder(n.h);
                }
                else if ($.selected.length == 1 && M.d[$.selected[0]] && is_image(M.d[$.selected[0]])) {
                    slideshow($.selected[0]);
                }
                else {
                    M.addDownload($.selected);
                }
            }
        }
        else if ((e.keyCode === 13) && ($.dialog === 'share')) {

            var share = new mega.Share();
            share.updateNodeShares();
        }
        else if ((e.keyCode === 13) && ($.dialog === 'add-contact-popup')) {
            addNewContact($('.add-user-popup-button.add'));
        }
        else if ((e.keyCode === 13) && ($.dialog === 'rename')) {
            doRename();
        }

        // If the Esc key is pressed while the payment address dialog is visible, close it
        else if ((e.keyCode === 27) && !$('.payment-address-dialog').hasClass('hidden')) {
            addressDialog.closeDialog();
        }
        else if (e.keyCode == 27 && ($.copyDialog || $.moveDialog || $.copyrightsDialog)) {
            closeDialog();
        }
        else if (e.keyCode == 27 && $.dialog) {
            closeDialog();
        }
        else if (e.keyCode == 27 && $('.default-select.active').length) {
            var $selectBlock = $('.default-select.active');
            $selectBlock.find('.default-select-dropdown').fadeOut(200);
            $selectBlock.removeClass('active');
        }
        else if (e.keyCode == 27 && $.msgDialog) {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        }
        else if ((e.keyCode == 13 && $.msgDialog == 'confirmation') && (e.keyCode == 13 && $.msgDialog == 'remove')) {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        }
        else if ((e.keyCode === 113 /* F2 */) && (s.length > 0) && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            $.selected = [];
            s.each(function(i, e) {
                $.selected.push($(e).attr('id'));
            });
            renameDialog();
        }
        else if (e.keyCode == 65 && e.ctrlKey && !$.dialog) {
            $('.grid-table.fm tr').addClass('ui-selected');
            $('.file-block').addClass('ui-selected');
        }
        else if (e.keyCode == 37 && slideshowid) {
            slideshow_prev();
        }
        else if (e.keyCode == 39 && slideshowid) {
            slideshow_next();
        }
        else if (e.keyCode == 27 && slideshowid) {
            slideshow(slideshowid, true);
        }
        else if (e.keyCode == 27) {
            $.hideTopMenu();
        }

        if (sl && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1) {
            var jsp = $($.selectddUIgrid).data('jsp');
            jsp.scrollToElement(sl);
        }

        searchPath();
    });
}

function searchPath()
{
    if (M.currentdirid && M.currentdirid.substr(0,7) == 'search/')
    {
        var sel;
        if (M.viewmode) sel = $('.fm-blocks-view .ui-selected');
        else sel = $('.grid-table .ui-selected');
        if (sel.length == 1)
        {
            var html = '';
            var path = M.getPath($(sel[0]).attr('id'));
            path.reverse();
            for (var i in path)
            {
                var c,name,id=false,iconimg='';;
                var n = M.d[path[i]];
                if (path[i].length == 11 && M.u[path[i]])
                {
                    id = path[i];
                    c = 'contacts-item';
                    name = M.u[path[i]].m;
                }
                else if (path[i] == M.RootID)
                {
                    id = M.RootID;
                    c = 'cloud-drive';
                    name = l[164];
                }
                else if (path[i] == M.RubbishID)
                {
                    id = M.RubbishID;
                    c = 'recycle-item';
                    name = l[168];
                }
                else if (path[i] == M.InboxID)
                {
                    id = M.InboxID;
                    c = 'inbox-item';
                    name = l[166];
                }
                else if (n)
                {
                    id = n.h;
                    c = '';
                    name = n.name;
                    if (n.t) c = 'folder';
                    else iconimg = '<span class="search-path-icon-span ' + fileIcon(n) + '"></span>';
                }
                if (id)
                {
                    html += '<div class="search-path-icon '+c+'" id="spathicon_'+htmlentities(id) + '">' + iconimg + '</div><div class="search-path-txt" id="spathname_'+htmlentities(id) + '">' + htmlentities(name) + '</div>';
                    if (i < path.length-1) html += '<div class="search-path-arrow"></div>';
                }
            }
            html += '<div class="clear"></div>';
            $('.search-bottom-menu').html(html);
            $('.fm-blocks-view,.files-grid-view').addClass('search');
            $('.search-path-icon,.search-path-icon').unbind('click');
            $('.search-path-icon,.search-path-txt').bind('click',function(e)
            {
                var id = $(this).attr('id');
                if (id)
                {
                    id = id.replace('spathicon_','').replace('spathname_','');
                    var n = M.d[id];
                    $.selected=[];
                    if (!n.t)
                    {
                        $.selected.push(id);
                        id = n.p;
                    }
                    if (n) M.openFolder(id);
                    if ($.selected.length > 0) reselect(1);
                }
            });
        }
        else $('.fm-blocks-view,.files-grid-view').removeClass('search');
    }
    else $('.fm-blocks-view,.files-grid-view').removeClass('search');
}

function selectddUI() {
    if (M.currentdirid && M.currentdirid.substr(0, 7) === 'account') {
        return false;
    }

    if (d) {
        console.time('selectddUI');
    }

    var mainSel = $.selectddUIgrid + ' ' + $.selectddUIitem;
    var dropSel = $.selectddUIgrid + ' ' + $.selectddUIitem + '.folder';
    if (M.currentrootid === 'contacts') {
        dropSel = mainSel;
    }

    $(dropSel).droppable(
        {
            tolerance: 'pointer',
            drop: function(e, ui)
            {
                $.doDD(e, ui, 'drop', 0);
            },
            over: function(e, ui)
            {
                $.doDD(e, ui, 'over', 0);
            },
            out: function(e, ui)
            {
                $.doDD(e, ui, 'out', 0);
            }
        });

    if ($.gridDragging) {
        $('body').addClass('dragging ' + ($.draggingClass || ''));
    }

    var $ddUIitem = $(mainSel);
    var $ddUIgrid = $($.selectddUIgrid);
    $ddUIitem.draggable(
        {
            start: function(e, u)
            {
                if (d) console.log('draggable.start');
                $.hideContextMenu(e);
                $.gridDragging = true;
                $('body').addClass('dragging');
                if (!$(this).hasClass('ui-selected'))
                {
                    $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
                    $(this).addClass('ui-selected');
                }
                var s = $($.selectddUIgrid + ' .ui-selected'), max = ($(window).height() - 96) / 24, html = [];
                $.selected = [];
                s.each(function(i, e)
                {
                    var id = $(e).attr('id'), n = M.d[id];
                    if (n) {
                        $.selected.push(id);
                        if (max > i) {
                            html.push('<div class="transfer-filtype-icon ' + fileIcon(n) + ' tranfer-filetype-txt dragger-entry">' + str_mtrunc(htmlentities(n.name)) + '</div>');
                        }
                    }
                });
                if (s.length > max)
                {
                    $('.dragger-files-number').text(s.length);
                    $('.dragger-files-number').show();
                }
                $('#draghelper .dragger-content').html(html.join(""));
                $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
                $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
                $.draggerOrigin = M.currentdirid;
            },
            drag: function(e, ui)
            {
                if (ui.position.top + $.draggerHeight - 28 > $(window).height())
                    ui.position.top = $(window).height() - $.draggerHeight + 26;
                if (ui.position.left + $.draggerWidth - 58 > $(window).width())
                    ui.position.left = $(window).width() - $.draggerWidth + 56;
            },
            refreshPositions: true,
            containment: 'document',
            scroll: false,
            distance: 10,
            revertDuration: 200,
            revert: true,
            cursorAt: {right: 90, bottom: 56},
            helper: function(e, ui)
            {
                $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
                return getDDhelper();
            },
            stop: function(event)
            {
                if (d) console.log('draggable.stop');
                $.gridDragging = $.draggingClass = false;
                $('body').removeClass('dragging').removeClassWith("dndc-");
                var origin = $.draggerOrigin;
                setTimeout(function __onDragStop() {
                    if (M.currentdirid === 'contacts') {
                        if (origin !== 'contacts') {
                            M.openFolder(origin, true);
                        }
                    } else {
                        treeUIopen(M.currentdirid, false, true);
                    }
                }, 200);
            }
        });

    $('.ui-selectable-helper').remove();

    $ddUIgrid.selectable({
        filter: $.selectddUIitem,
        start: function(e, u) {
            $.hideContextMenu(e);
            $.hideTopMenu();
        },
        stop: function(e, u) {
            searchPath();
        }
    });

    /**
     * (Re)Init the selectionManager, because the .selectable() is reinitialized and we need to reattach to its
     * events.
     *
     * @type {SelectionManager}
     */

    if (!window.fmShortcuts) {
        window.fmShortcuts = new FMShortcuts();
    }
    selectionManager = new SelectionManager($ddUIgrid);

    $ddUIitem.rebind('contextmenu', function(e)
    {
        if ($(this).attr('class').indexOf('ui-selected') == -1)
        {
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            $(this).addClass('ui-selected');
        }
        cacheselect();
        searchPath();
        $.hideTopMenu();
        return !!contextMenuUI(e, 1);
    });

    $ddUIitem.rebind('click', function(e)
    {
        if ($.gridDragging)
            return false;
        var s = e.shiftKey && $($.selectddUIgrid + ' .ui-selected');
        if (s && s.length > 0)
        {
            var start = s[0];
            var end = this;
            if ($.gridLastSelected && $($.gridLastSelected).attr('class').indexOf('ui-selected') > -1)
                start = $.gridLastSelected;
            else
                $.gridLastSelected = this;
            if ($(start).index() > $(end).index())
            {
                end = start;
                start = this;
            }
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            $([start, end]).addClass('ui-selected');
            $(start).nextUntil($(end)).each(function(i, e)
            {
                $(e).addClass('ui-selected');
            });

            selectionManager.set_currently_selected($(this));
        }
        else if (e.ctrlKey == false && e.metaKey == false)
        {
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            $(this).addClass('ui-selected');
            $.gridLastSelected = this;
            selectionManager.set_currently_selected($(this));
        }
        else
        {
            if ($(this).hasClass("ui-selected"))
                $(this).removeClass("ui-selected");
            else
            {
                $(this).addClass("ui-selected");
                $.gridLastSelected = this;
                selectionManager.set_currently_selected($(this));
            }
        }
        searchPath();
        $.hideContextMenu(e);
        if ($.hideTopMenu)
            $.hideTopMenu();
        return false;
    });

    $ddUIitem.rebind('dblclick', function(e)
    {
        var h = $(e.currentTarget).attr('id');
        var n = M.d[h] || {};
        if (n.t)
        {
            $('.top-context-menu').hide();
            M.openFolder(h);
        }
        else if (is_image(n))
            slideshow(h);
        else
            M.addDownload([h]);
    });

    if ($.rmInitJSP)
    {
        var jsp = $($.rmInitJSP).data('jsp');
        if (jsp)
            jsp.reinitialise();
        if (d)
            console.log('jsp:!u', !!jsp);
        delete $.rmInitJSP;
    }
    $.tresizer();
    if (d) {
        console.timeEnd('selectddUI');
    }

    $ddUIitem = $ddUIgrid = undefined;
}

function iconUI(aQuiet)
{
    if (d) console.time('iconUI');

    $('.fm-files-view-icon.block-view').addClass('active');
    $('.fm-files-view-icon.listing-view').removeClass('active');
    $('.shared-grid-view').addClass('hidden');
    $('.files-grid-view.fm').addClass('hidden');
    $('.fm-blocks-view.fm').addClass('hidden');
    $('.fm-blocks-view.contacts-view').addClass('hidden');
    $('.files-grid-view.contacts-view').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');
    $('.files-grid-view.contact-details-view').addClass('hidden');
    $('.fm-blocks-view.contact-details-view').addClass('hidden');

    if (M.currentdirid == 'contacts')
    {
        $('.fm-blocks-view.contacts-view').removeClass('hidden');
        initContactsBlocksScrolling();
    }
    else if (M.currentdirid == 'shares')
    {
        $('.shared-blocks-view').removeClass('hidden');
        initShareBlocksScrolling();
    }
    else if (String(M.currentdirid).length === 11 && M.currentrootid == 'contacts')
    {
        $('.contacts-details-block').removeClass('hidden');
        if (M.v.length > 0)
        {
            $('.fm-blocks-view.contact-details-view').removeClass('hidden');
            initFileblocksScrolling2();
        }
    }
    else if (M.currentdirid === M.InboxID || RootbyId(M.currentdirid) === M.InboxID)
    {
        //console.error("Inbox iconUI");
        if (M.v.length > 0)
        {
            $('.fm-blocks-view.fm').removeClass('hidden');
            initFileblocksScrolling();
        }
    }
    else
    {
        $('.fm-blocks-view.fm').removeClass('hidden');
        if (!aQuiet) initFileblocksScrolling();
    }

    $('.fm-blocks-view, .shared-blocks-view').rebind('contextmenu.blockview', function(e)
    {
        $('.file-block').removeClass('ui-selected');
        selectionManager.clear(); // is this required? don't we have a support for a multi-selection context menu?
        $.selected = [];
        $.hideTopMenu();
        return !!contextMenuUI(e, 2);
    });

    if (M.currentdirid == 'contacts')
    {
        $.selectddUIgrid = '.contacts-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (M.currentdirid == 'shares')
    {
        $.selectddUIgrid = '.shared-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (String(M.currentdirid).length === 11 && M.currentrootid == 'contacts')
    {
        $.selectddUIgrid = '.contact-details-view .file-block-scrolling';
        $.selectddUIitem = 'a';
    }
    else
    {
        $.selectddUIgrid = '.file-block-scrolling';
        $.selectddUIitem = 'a';
    }
    selectddUI();
    if (d) console.timeEnd('iconUI');
}

function transferPanelUI()
{
    $.transferHeader = function(tfse)
    {
        tfse                  = tfse || M.getTransferElements();
        var domTableEmptyTxt  = tfse.domTableEmptyTxt;
        var domTableHeader    = tfse.domTableHeader;
        var domScrollingTable = tfse.domScrollingTable;
        var domTable          = tfse.domTable;
        tfse                  = undefined;

        // Show/Hide header if there is no items in transfer list
        if (domTable.querySelector('tr')) {
            domTableEmptyTxt.classList.add('hidden');
            domScrollingTable.style.display = '';
            domTableHeader.style.display    = '';
        }
        else {
            domTableEmptyTxt.classList.remove('hidden');
            domScrollingTable.style.display = 'none';
            domTableHeader.style.display    = 'none';
        }

        $(domScrollingTable).rebind('click.tst contextmenu.tst', function(e) {
            if (!$(e.target).closest('.transfer-table').length) {
                $('.ui-selected', domTable).removeClass('ui-selected');
            }
        });

        var $tmp = $('.grid-url-arrow, .clear-transfer-icon', domTable);
        $tmp.rebind('click', function(e) {
            var target = $(this).closest('tr');
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            $('tr', domTable).removeClass('ui-selected');

            if ($(this).hasClass('grid-url-arrow')) {
                target.addClass('ui-selected');
                e.currentTarget = target;
                transferPanelContextMenu(target);
                contextMenuUI(e);
            }
            else {
                if (!target.hasClass('.transfer-completed')) {
                    var toabort = target.attr('id');
                    dlmanager.abort(toabort);
                    ulmanager.abort(toabort);
                }
                target.fadeOut(function() {
                    $(this).remove();
                    $.clearTransferPanel();
                    fm_tfsupdate();
                    $.tresizer();
                });
            }

            return false;
        });

        $tmp = $('tr', domTable);
        $tmp.rebind('dblclick', function(e) {
            if ($(this).hasClass('transfer-completed')) {
                var id = String($(this).attr('id'));
                if (id[0] === 'd') {
                    id = id.split('_').pop();
                }
                else if (id[0] === 'u') {
                    id = String(ulmanager.ulIDToNode[id]);
                }
                var path = M.getPath(id);
                if (path.length > 1) {
                    M.openFolder(path[1], true);
                    if (!$('#' + id).length) {
                        $(window).trigger('dynlist.flush');
                    }
                    $.selected = [id];
                    reselect(1);
                }
            }
            return false;
        });

        $tmp.rebind('click contextmenu', function(e)
        {
            if (e.type == 'contextmenu')
            {
                $('.ui-selected', domTable).removeClass('ui-selected');
                $(this).addClass('ui-selected dragover');
                transferPanelContextMenu(null);
                return !!contextMenuUI(e);
            }
            else
            {
                var domNode = domTable.querySelector('tr');
                if (e.shiftKey && domNode)
                {
                    var start = domNode;
                    var end   = this;
                    if ($.TgridLastSelected && $($.TgridLastSelected).hasClass('ui-selected')) {
                        start = $.TgridLastSelected;
                    }
                    if ($(start).index() > $(end).index()) {
                        end = start;
                        start = this;
                    }
                    $('.ui-selected', domTable).removeClass('ui-selected');
                    $([start, end]).addClass('ui-selected');
                    $(start).nextUntil($(end)).each(function(i, e) {
                        $(e).addClass('ui-selected');
                    });
                }
                else if (!e.ctrlKey && !e.metaKey)
                {
                    $('.ui-selected', domTable).removeClass('ui-selected');
                    $(this).addClass('ui-selected');
                    $.TgridLastSelected = this;
                }
                else
                {
                    if ($(this).hasClass("ui-selected"))
                        $(this).removeClass("ui-selected");
                    else
                    {
                        $(this).addClass("ui-selected");
                        $.TgridLastSelected = this;
                    }
                }
            }

            return false;
        });
        $tmp = undefined;

        // initTransferScroll(domScrollingTable);
        delay('tfs-ps-update', Ps.update.bind(Ps, domScrollingTable));
    };

    $.transferClose = function() {
        $('.nw-fm-left-icon.transfers').removeClass('active');
        $('#fmholder').removeClass('transfer-panel-opened');
    };

    $.transferOpen = function(force) {
        if (force || !$('.nw-fm-left-icon.transfers').hasClass('active')) {
            $('.nw-fm-left-icon').removeClass('active');
            $('.nw-fm-left-icon.transfers').addClass('active');
            $('#fmholder').addClass('transfer-panel-opened');
            notificationsUI(1);
            var domScrollingTable = M.getTransferElements().domScrollingTable;
            if (!domScrollingTable.classList.contains('ps-container')) {
                Ps.initialize(domScrollingTable, {suppressScrollX: true});
            }
            fm_tfsupdate(); // this will call $.transferHeader();
        }
    };

    $.clearTransferPanel = function() {
        var obj = M.getTransferElements();
        if (!obj.domTable.querySelector('tr')) {
            $('.transfer-clear-all-icon').addClass('disabled');
            $('.transfer-pause-icon').addClass('disabled');
            $('.transfer-clear-completed').addClass('disabled');
            $('.transfer-table-header').hide();
            $('.transfer-panel-empty-txt').removeClass('hidden');
            $('.transfer-panel-title').text(l[104]);
            $('.nw-fm-left-icon.transfers').removeClass('transfering').find('p').removeAttr('style');
            if (M.currentdirid === 'transfers') {
                fm_tfsupdate();
                $.tresizer();
            }
        }
    };

    $.removeTransferItems = function($trs) {
        if (!$trs) {
            $trs = $('.transfer-table tr.transfer-completed');
        }
        var $len = $trs.length;
        if ($len && $len < 100) {
            $trs.fadeOut(function() {
                $(this).remove();
                if (!--$len) {
                    $.clearTransferPanel();
                }
            });
        }
        else {
            $trs.remove();
            Soon($.clearTransferPanel);
        }
    };

    $('.transfer-clear-all-icon').rebind('click', function() {
        if (!$(this).hasClass('disabled')) {
            msgDialog('confirmation', 'clear all transfers', l[7225], '', function(e) {
                if (!e) {
                    return;
                }

                dlmanager.abort(null);
                ulmanager.abort(null);

                $.removeTransferItems($('.transfer-table tr'));
            });
        }
    });

    $('.transfer-clear-completed').rebind('click', function() {
        if (!$(this).hasClass('disabled')) {
            $.removeTransferItems();
        }
    });

    $('.transfer-pause-icon').rebind('click', function() {

        if (dlmanager.isOverQuota) {
            return dlmanager.showOverQuotaDialog();
        }

        if (!$(this).hasClass('disabled')) {
            if ($(this).hasClass('active')) {
                // terms of service
                if (u_type || folderlink || Object(u_attr).terms) {
                    [dlQueue, ulQueue].forEach(function(queue) {
                        Object.keys(queue._qpaused).map(fm_tfsresume);
                    });
                    uldl_hold = false;
                    ulQueue.resume();
                    dlQueue.resume();

                    $(this).removeClass('active').find('span').text(l[6993]);
                    $('.transfer-table-wrapper tr').removeClass('transfer-paused');
                    $('.nw-fm-left-icon').removeClass('paused');
                }
                else {
                    alert(l[214]);
                    DEBUG(l[214]);
                }
            }
            else {
                var $trs = $('.transfer-table tr:not(.transfer-completed)');

                $trs.attrs('id')
                    .concat(Object.keys(M.tfsdomqueue))
                    .map(fm_tfspause);

                dlQueue.pause();
                ulQueue.pause();
                uldl_hold = true;

                $(this).addClass('active').find('span').text(l[7101]);
                $trs.addClass('transfer-paused');
                $('.nw-fm-left-icon').addClass('paused');
            }
        }
    });
}

function getDDhelper()
{
    var id = '#fmholder';
    if (page == 'start')
        id = '#startholder';
    $('.dragger-block').remove();
    $(id).append('<div class="dragger-block drag" id="draghelper"><div class="dragger-content"></div><div class="dragger-files-number">1</div></div>');
    $('.dragger-block').show();
    $('.dragger-files-number').hide();
    return $('.dragger-block')[0];
}


/**
 * menuItems
 *
 * Select what in context menu will be shown of actions and what not, depends on selected item/s
 * @returns {menuItems.items|Array}
 */
function menuItems() {

    var selItem,
        items = [],
        share = {},
        exportLink = {},
        isTakenDown = false,
        hasExportLink = false,
        sourceRoot = RootbyId($.selected[0]);

    // Show Rename action in case that only one item is selected
    if (($.selected.length === 1) && (RightsbyID($.selected[0]) > 1)) {
        items['.rename-item'] = 1;
    }

    if (RightsbyID($.selected[0]) > 0) {

        items['.add-star-item'] = 1;

        if (M.isFavourite($.selected)) {
            $('.add-star-item').safeHTML('<span class="context-menu-icon"></span>@@', l[5872]);
        }
        else {
            $('.add-star-item').safeHTML('<span class="context-menu-icon"/></span>@@', l[5871]);

        }
    }

    selItem = M.d[$.selected[0]];

    if (selItem && (selItem.p.length === 11)) {
        items['.removeshare-item'] = 1;
    }
    else if (RightsbyID($.selected[0]) > 1) {
        items['.remove-item'] = 1;
    }

    if (selItem && ($.selected.length === 1) && selItem.t) {
        items['.open-item'] = 1;
    }

    if (
        selItem
        && ($.selected.length === 1)
        && is_image(selItem)
        ) {
        items['.preview-item'] = 1;
    }

    if (
        selItem
        && (sourceRoot === M.RootID)
        && ($.selected.length === 1)
        && selItem.t
        && !folderlink
        ) {
        items['.sh4r1ng-item'] = 1;
    }

    if ((sourceRoot === M.RootID) && !folderlink) {
        items['.move-item'] = 1;
        items['.getlink-item'] = 1;

        share = new mega.Share();
        hasExportLink = share.hasExportLink($.selected);

        if (hasExportLink) {
            items['.removelink-item'] = true;
        }

        exportLink = new mega.Share.ExportLink();
        isTakenDown = exportLink.isTakenDown($.selected);

        // If any of selected items is taken donw remove actions from context menu
        if (isTakenDown) {
            delete items['.getlink-item'];
            delete items['.removelink-item'];
            delete items['.sh4r1ng-item'];
            delete items['.add-star-item'];
        }
    }

    else if (sourceRoot === M.RubbishID && !folderlink) {
        items['.move-item'] = 1;
    }

    items['.download-item'] = 1;
    items['.zipdownload-item'] = 1;
    items['.copy-item'] = 1;
    items['.properties-item'] = 1;
    items['.refresh-item'] = 1;

    if (folderlink) {
        delete items['.copy-item'];
        delete items['.add-star-item'];
        if (u_type) {
            items['.import-item'] = 1;
        }
    }

    return items;
}

function contextMenuUI(e, ll) {

    var v;
    var flt;
    var items = {};
    var m = $('.context-menu.files-menu');

    // Selection of first child level ONLY of .context-menu-item in .context-menu
    var menuCMI = '.context-menu.files-menu .context-menu-section > .context-menu-item';
    var currNodeClass = $(e.currentTarget).attr('class');
    var id = $(e.currentTarget).attr('id');

    // is contextmenu disabled
    if (localStorage.contextmenu) {
        return true;
    }

    $.hideContextMenu();

    // Used when right click is occured outside item, on empty canvas
    if (ll === 2) {

        // Enable upload item menu for clould-drive, don't show it for rubbish and rest of crew
        if (RightsbyID(M.currentdirid) && (M.currentrootid !== M.RubbishID)) {
            $(menuCMI).filter('.context-menu-item').hide();
            $(menuCMI).filter('.fileupload-item,.newfolder-item').show();

            if ((is_chrome_firefox & 2) || 'webkitdirectory' in document.createElement('input')) {
                $(menuCMI).filter('.folderupload-item').show();
            }
        }
        else {
            return false;
        }
    }
    else if (ll === 3) {// we want just the download menu
        $(menuCMI).hide();
        m = $('.context-menu.download');
        menuCMI = '.context-menu.download .context-menu-item';
    }
    else if (ll === 4 || ll === 5) {// contactUI
        $(menuCMI).hide();
        items = menuItems();

        delete items['.download-item'];
        delete items['.zipdownload-item'];
        delete items['.copy-item'];
        delete items['.open-item'];

        if (ll === 5) {
            delete items['.properties-item'];
        }

        for (var item in items) {
            $(menuCMI).filter(item).show();
        }
    }
    else if (ll === 6) { // sort menu
        $('.context-menu-item').hide();
        $('.context-menu-item.do-sort').show();
    }
    else if (ll) {// Click on item

        // Hide all menu-items
        $(menuCMI).hide();

        id = $(e.currentTarget).attr('id');

        if (id) {

            // Contacts left panel click
            if (id.indexOf('contact_') !== -1) {
                id = id.replace('contact_', '');
            }

            // File manager left panel click
            else if (id.indexOf('treea_') !== -1) {
                id = id.replace('treea_', '');
            }
        }

        if (id && !M.d[id]) {

            // exist in node list
            id = undefined;
        }

        // In case that id belongs to contact, 11 char length
        if (id && (id.length === 11)) {
            flt = '.remove-item';
            if (!window.megaChatIsDisabled) {
                flt += ',.startchat-item,.startaudio-item,.startvideo-item';
            }
            $(menuCMI).filter(flt).show();

            $(menuCMI).filter('.startaudio-item,.startvideo-item').removeClass('disabled');

            // If selected contact is offline make sure that audio and video calls are forbiden (disabled)
            if ($('#' + id).find('.offline').length || $.selected.length > 1) {
                $(menuCMI).filter('.startaudio-item').addClass('disabled');
                $(menuCMI).filter('.startvideo-item').addClass('disabled');
            }

            // Remove select-all item from context menu
            $(m).find('.select-all').remove();
        }
        else if (currNodeClass && (currNodeClass.indexOf('cloud-drive') > -1
                    || currNodeClass.indexOf('folder-link') > -1)) {
            flt = '.properties-item';
            if (folderlink) {
                flt += ',.import-item';
            }
            else {
                flt += ',.findupes-item';
            }
            if (M.v.length) {
                flt += ',.zipdownload-item,.download-item';
            }
            $.selected = [M.RootID];
            $(menuCMI).filter(flt).show();
        }
        else if (currNodeClass && $(e.currentTarget).hasClass('inbox')) {
            $.selected = [M.InboxID];
            $(menuCMI).filter('.properties-item').show();
        }
        else if (currNodeClass && currNodeClass.indexOf('rubbish-bin') > -1) {
            $.selected = [M.RubbishID];
            $(menuCMI).filter('.properties-item').show();
        }
        else if (currNodeClass && currNodeClass.indexOf('recycle-item') > -1) {
            $(menuCMI).filter('.clearbin-item').show();
        }
        else if (currNodeClass && currNodeClass.indexOf('contacts-item') > -1) {
            $(menuCMI).filter('.addcontact-item').show();
        }
        else if (currNodeClass && currNodeClass.indexOf('messages-item') > -1) {
            e.preventDefault();
            return false;
        }
        else if (currNodeClass
            && (currNodeClass.indexOf('file-block') > -1
            || currNodeClass.indexOf('folder') > -1
            || currNodeClass.indexOf('fm-tree-folder') > -1)
            || id) {
            items = menuItems();
            for (var item in items) {
                $(menuCMI).filter(item).show();
            }

            // Hide context menu items not needed for undecrypted nodes
            if (missingkeys[id]) {
                $(menuCMI).filter('.add-star-item').hide();
                $(menuCMI).filter('.download-item').hide();
                $(menuCMI).filter('.rename-item').hide();
                $(menuCMI).filter('.copy-item').hide();
                $(menuCMI).filter('.getlink-item').hide();
            }
            else if (M.getNodeShare(id).down === 1) {
                $(menuCMI).filter('.copy-item').hide();
            }
            else if (items['.getlink-item']) {
                Soon(setContextMenuGetLinkText);
            }
        }
        else {
            return false;
        }
    }
    // This part of code is also executed when ll == 'undefined'
    v = m.children($('.context-menu-section'));

    // count all items inside section, and hide dividers if necessary
    v.each(function() {
        var a = $(this).find('a.context-menu-item'),
            b = $(this).find('.context-menu-divider'),
            x = a.filter(function() {
                return $(this).css('display') === 'none';
            });
        if (x.length === a.length || a.length === 0) {
            b.hide();
        }
        else {
            b.show();
        }
    });

    adjustContextMenuPosition(e, m);

    disableCircularTargets('#fi_');

    m.removeClass('hidden');
    e.preventDefault();
}

/**
 * Sets the text in the context menu for the Get link and Remove link items. If there are
 * more than one nodes selected then the text will be pluralised. If all the selected nodes
 * have public links already then the text will change to 'Update link/s'.
 */
function setContextMenuGetLinkText() {

    var numOfExistingPublicLinks = 0;
    var numOfSelectedNodes = Object($.selected).length;
    var getLinkText = '';

    // Loop through all selected nodes
    for (var i = 0; i < numOfSelectedNodes; i++) {

        // Get the node handle of the current node
        var nodeHandle = $.selected[i];

        // If it has a public link, then increment the count
        if (M.getNodeShare(nodeHandle)) {
            numOfExistingPublicLinks++;
        }
    }

    // If all the selected nodes have existing public links, set text to 'Update links' or 'Update link'
    if (numOfSelectedNodes === numOfExistingPublicLinks) {
        getLinkText = (numOfSelectedNodes > 1) ? l[8733] : l[8732];
    }
    else {
        // Otherwise change text to 'Get links' or 'Get link' if there are selected nodes without links
        getLinkText = (numOfSelectedNodes > 1) ? l[8734] : l[59];
    }

    // If there are multiple nodes with existing links selected, set text to 'Remove links', otherwise 'Remove link'
    var removeLinkText = (numOfExistingPublicLinks > 1) ? l[8735] : l[6821];

    // Set the text for the 'Get/Update link/s' and 'Remove link/s' context menu items
    var $contextMenu = $('.context-menu');
    $contextMenu.find('.getlink-menu-text').text(getLinkText);
    $contextMenu.find('.removelink-menu-text').text(removeLinkText);
}

/**
 * disableCircularTargets
 *
 * Disable parent tree DOM element and all children.
 * @param {String} pref, id prefix i.e. { #fi_, #mctreea_ }
 */
function disableCircularTargets(pref) {

    var nodeId;

    for (var s in $.selected) {
        if ($.selected.hasOwnProperty(s)) {
            nodeId = $.selected[s];
            if (M.d[nodeId]) {
                $(pref + nodeId).addClass('disabled');
            }

            if (M.d[nodeId] && M.d[nodeId].p) {

                // Disable parent dir
                $(pref + M.d[nodeId].p).addClass('disabled');
            }
            else if (d) {
                console.error('disableCircularTargets: Invalid node', nodeId, pref);
            }

            // Disable all children folders
            disableDescendantFolders(nodeId, pref);
        }
    }
}

function adjustContextMenuPosition(e, m)
{
    var mPos;// menu position
    var mX = e.clientX, mY = e.clientY;    // mouse cursor, returns the coordinates within the application's client area at which the event occurred (as opposed to the coordinates within the page)

    if (e.type === 'click' && !e.calculatePosition)// clicked on file-settings-icon
    {
        var ico = {'x': e.currentTarget.context.clientWidth, 'y': e.currentTarget.context.clientHeight};
        var icoPos = getHtmlElemPos(e.delegateTarget);// get position of clicked file-settings-icon
        mPos = reCalcMenuPosition(m, icoPos.x, icoPos.y, ico);
    }
    else// right click
    {
        mPos = reCalcMenuPosition(m, mX, mY);
    }

    m.css({'top': mPos.y, 'left': mPos.x});// set menu position

    return true;
}

function reCalcMenuPosition(m, x, y, ico)
{
    var TOP_MARGIN = 12;
    var SIDE_MARGIN = 12;
    var cmW = m.outerWidth(), cmH = m.outerHeight();// dimensions without margins calculated
    var wH = window.innerHeight, wW = window.innerWidth;
    var maxX = wW - SIDE_MARGIN;// max horizontal
    var maxY = wH - TOP_MARGIN;// max vertical
    var minX = SIDE_MARGIN + $('div.nw-fm-left-icons-panel').outerWidth();// min horizontal
    var minY = TOP_MARGIN;// min vertical
    var wMax = x + cmW;// coordinate of right edge
    var hMax = y + cmH;// coordinate of bottom edge

    this.overlapParentMenu = function()
    {
        var tre = wW - wMax;// to right edge
        var tle = x - minX - SIDE_MARGIN;// to left edge

        if (tre >= tle)
        {
            n.addClass('overlap-right');
            n.css({'top': top, 'left': (maxX - x - nmW) + 'px'});
        }
        else
        {
            n.addClass('overlap-left');
            n.css({'top': top, 'right': (wMax - nmW - minX) + 'px'});
        }

        return;
    };

    // submenus are absolutely positioned, which means that they are relative to first parent, positioned other then static
    // first parent, which is NOT a .contains-submenu element (it's previous in same level)
    this.horPos = function()// used for submenues
    {
        var top;
        var nTop = parseInt(n.css('padding-top'));
        var tB = parseInt(n.css('border-top-width'));
        var pPos = m.position();

        var b = y + nmH - (nTop - tB);// bottom of submenu
        var mP = m.closest('.context-submenu');
        var pT = 0, bT = 0, pE = 0;
        if (mP.length)
        {
            pE = mP.offset();
            pT = parseInt(mP.css('padding-top'));
            bT = parseInt(mP.css('border-top-width'));
        }
        if (b > maxY)
            top = (maxY - nmH + nTop - tB) - pE.top + 'px';
        else
            top = pPos.top - tB + 'px';

        return top;
    };

    var dPos;
    var cor;// corner, check setBordersRadius for more info
    if (typeof ico === 'object')// draw context menu relative to file-settings-icon
    {
        cor = 1;
        dPos = {'x': x - 2, 'y': y + ico.y + 8};// position for right-bot
        if (wMax > maxX)// draw to the left
        {
            dPos.x = x - cmW + ico.x + 2;// additional pixels to align with -icon
            cor = 3;
        }
        if (hMax > maxY)// draw to the top
        {
            dPos.y = y - cmH;// additional pixels to align with -icon
            cor++;
        }
    }
    else if (ico === 'submenu')// submenues
    {
        var n = m.next('.context-submenu');
        var nmW = n.outerWidth();// margin not calculated
        var nmH = n.outerHeight();// margins not calculated

        if (nmH > (maxY - TOP_MARGIN))// Handle huge menu
        {
            nmH = maxY - TOP_MARGIN;
            var tmp = document.getElementById('csb_' + m.attr('id').replace('fi_', ''));
            $(tmp).addClass('context-scrolling-block');
            tmp.addEventListener('mousemove', scrollMegaSubMenu);

            n.addClass('mega-height');
            n.css({'height': nmH + 'px'});
        }

        var top = 'auto', left = '100%', right = 'auto';

        top = this.horPos();
        if (m.parent().parent('.left-position').length === 0)
        {
            if (maxX >= (wMax + nmW))
                left = 'auto', right = '100%';
            else if (minX <= (x - nmW))
                n.addClass('left-position');
            else
            {
                this.overlapParentMenu();

                return true;
            }
        }
        else
        {
            if (minX <= (x - nmW))
                n.addClass('left-position');
            else if (maxX >= (wMax + nmW))
                left = 'auto', right = '100%';
            else
            {
                this.overlapParentMenu();

                return true;
            }
        }

        return {'top': top, 'left': left, 'right': right};
    }
    else// right click
    {
        cor = 0;
        dPos = {'x': x, 'y': y};
        if (x < minX)
            dPos.x = minX;// left side alignment
        if (wMax > maxX)
            dPos.x = maxX - cmW;// align with right side, 12px from it
        if (hMax > maxY)
            dPos.y = maxY - cmH;// align with bottom, 12px from it
    }

    setBordersRadius(m, cor);

    return {'x': dPos.x, 'y': dPos.y};
}

// corner position 0 means default
function setBordersRadius(m, c)
{
    var DEF = 8;// default corner radius
    var SMALL = 4;// small carner radius
    var TOP_LEFT = 1, TOP_RIGHT = 3, BOT_LEFT = 2, BOT_RIGHT = 4;
    var tl = DEF, tr = DEF, bl = DEF, br = DEF;

    var pos = (typeof c === 'undefined') ? 0 : c;

    switch (pos)
    {
        case TOP_LEFT:
            tl = SMALL;
            break;
        case TOP_RIGHT:
            tr = SMALL;
            break
        case BOT_LEFT:
            bl = SMALL;
            break
        case BOT_RIGHT:
            br = SMALL;
            break;
        default:// situation when c is undefined, all border radius are by DEFAULT
            break;

    }

    // set context menu border radius
    m.css({
        'border-top-left-radius': tl,
        'border-top-right-radius': tr,
        'border-bottom-left-radius': bl,
        'border-bottom-right-radius': br});

    return true;
}

// Scroll menus which height is bigger then window.height
function scrollMegaSubMenu(e)
{
    var ey = e.pageY;
    var c = $(e.target).closest('.context-submenu');
    var pNode = c.children(':first')[0];

    if (typeof pNode !== 'undefined')
    {
        var h = pNode.offsetHeight;
        var dy = h * 0.1;// 10% dead zone at the begining and at the bottom
        var pos = getHtmlElemPos(pNode, true);
        var py = (ey - pos.y - dy) / (h - dy * 2);
        if (py > 1)
        {
            py = 1;
            c.children('.context-bottom-arrow').addClass('disabled');
        }
        else if (py < 0)
        {
            py = 0;
            c.children('.context-top-arrow').addClass('disabled');
        }
        else
        {
            c.children('.context-bottom-arrow,.context-top-arrow').removeClass('disabled');
        }
        pNode.scrollTop = py * (pNode.scrollHeight - h);
    }
}

// var treeUI = SoonFc(__treeUI, 240);

function treeUI()
{
    //console.error('treeUI');
    if (d)
        console.time('treeUI');
    $('.fm-tree-panel .nw-fm-tree-item:visible').draggable(
        {
            revert: true,
            containment: 'document',
            revertDuration: 200,
            distance: 10,
            scroll: false,
            cursorAt: {right: 88, bottom: 58},
            helper: function(e, ui)
            {
                $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
                return getDDhelper();
            },
            start: function(e, ui)
            {
                $.treeDragging = true;
                $.hideContextMenu(e);
                var html = '';
                var id = $(e.target).attr('id');
                if (id)
                    id = id.replace('treea_', '');
                if (id && M.d[id])
                    html = ('<div class="transfer-filtype-icon ' + fileIcon(M.d[id]) + ' tranfer-filetype-txt dragger-entry">' + str_mtrunc(htmlentities(M.d[id].name)) + '</div>');
                $('#draghelper .dragger-icon').remove();
                $('#draghelper .dragger-content').html(html);
                $('body').addClass('dragging');
                $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
                $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
            },
            drag: function(e, ui)
            {
                //console.log('tree dragging',e);
                if (ui.position.top + $.draggerHeight - 28 > $(window).height())
                    ui.position.top = $(window).height() - $.draggerHeight + 26;
                if (ui.position.left + $.draggerWidth - 58 > $(window).width())
                    ui.position.left = $(window).width() - $.draggerWidth + 56;
            },
            stop: function(e, u)
            {
                $.treeDragging = false;
                $('body').removeClass('dragging').removeClassWith("dndc-");
            }
        });

    $(
        '.fm-tree-panel .nw-fm-tree-item,' +
        '.rubbish-bin,' +
        '.fm-breadcrumbs,' +
        '.nw-fm-left-icons-panel .nw-fm-left-icon,' +
        '.shared-with-me tr,' +
        '.nw-conversations-item,' +
        'ul.conversations-pane > li,' +
        '.messages-block,' +
        '.nw-contact-item'
    ).filter(":visible").droppable({
            tolerance: 'pointer',
            drop: function(e, ui)
            {
                $.doDD(e, ui, 'drop', 1);
            },
            over: function(e, ui)
            {
                $.doDD(e, ui, 'over', 1);
            },
            out: function(e, ui)
            {
                $.doDD(e, ui, 'out', 1);
            }
        });

    // disabling right click, default contextmenu.
    $(document).unbind('contextmenu');
    $(document).bind('contextmenu', function(e) {
        if (!is_fm() ||
            $(e.target).parents('#startholder').length ||
            $(e.target).is('input') ||
            $(e.target).is('textarea') ||
            $(e.target).is('.download.info-txt') ||
            $(e.target).closest('.content-panel.conversations').length ||
            $(e.target).closest('.messages.content-area').length ||
            $(e.target).closest('.chat-right-pad .user-card-data').length ||
            $(e.target).parents('.fm-account-main').length ||
            $(e.target).parents('.export-link-item').length ||
            $(e.target).parents('.contact-fingerprint-txt').length ||
            $(e.target).parents('.fm-breadcrumbs').length ||
            $(e.target).hasClass('contact-details-user-name') ||
            $(e.target).hasClass('contact-details-email') ||
            $(e.target).hasClass('nw-conversations-name')) {
            return;
        } else if (!localStorage.contextmenu) {
            $.hideContextMenu();
            return false;
        }
    });

    $('.fm-tree-panel .nw-fm-tree-item:visible').rebind('click.treeUI, contextmenu.treeUI', function(e) {
        var $this = $(this);
        var id = $this.attr('id').replace('treea_', '');

        if (e.type === 'contextmenu') {
            $('.nw-fm-tree-item').removeClass('dragover');
            $this.addClass('dragover');

            var $uls = $this.parents('ul').find('.selected');

            if ($uls.length > 1) {
                $.selected = $uls.attrs('id')
                    .map(function(id) {
                        return id.replace('treea_', '');
                    });
            }
            else {
                $.selected = [id];

                Soon(function() {
                    $this.addClass('hovered');
                });
            }
            return !!contextMenuUI(e, 1);
        }

        var $target = $(e.target);
        if ($target.hasClass('nw-fm-arrow-icon')) {
            treeUIexpand(id);
        }
        else if (e.shiftKey) {
            $this.addClass('selected');
        }
        else {
            // plain click, remove all .selected from e.shiftKey
            $('#treesub_' + M.currentrootid + ' .nw-fm-tree-item').removeClass('selected');
            $this.addClass('selected');

            if ($target.hasClass('opened')) {
                treeUIexpand(id);
            }
            M.openFolder(id);
        }

        return false;
    });

    $('.fm-tree-panel .nw-contact-item').rebind('contextmenu.treeUI', function(e) {
        var $self = $(this);

        if ($self.attr('class').indexOf('selected') === -1) {
            $('.content-panel.contacts .nw-contact-item.selected').removeClass('selected');
            $self.addClass('selected');
        }

        $.selected = [$self.attr('id').replace('contact_', '')];
        searchPath();
        $.hideTopMenu();

        return Boolean(contextMenuUI(e, 1));
    });

    /**
     * Let's shoot two birds with a stone, when nodes are moved we need a resize
     * to let dynlist refresh - plus, we'll implicitly invoke initTreeScroll.
     */
    $(window).trigger('resize');

    if (d) {
        console.timeEnd('treeUI');
    }
}

function treeUIexpand(id, force, moveDialog)
{
    M.buildtree(M.d[id]);

    var b = $('#treea_' + id);
    var d = b.attr('class');

    if (M.currentdirid !== id)
    {
        var path = M.getPath(M.currentdirid), pid = {}, active_sub = false;
        for (var i in path)
            pid[path[i]] = i;
        if (pid[M.currentdirid] < pid[id])
            active_sub = true;
    }

    if (d && d.indexOf('expanded') > -1 && !force)
    {
        fmtreenode(id, false);
        $('#treesub_' + id).removeClass('opened');
        b.removeClass('expanded');
    }
    else if (d && d.indexOf('contains-folders') > -1)
    {
        fmtreenode(id, true);
        $('#treesub_' + id).addClass('opened');
        b.addClass('expanded');
    }

    treeUI();
}

function sectionUIopen(id) {
    var tmpId;
    if (d) {
        console.log('sectionUIopen', id, folderlink);
    }

    $('.nw-fm-left-icon').removeClass('active');
    if (M.hasInboxItems() === true) {
        $('.nw-fm-left-icon.inbox').removeClass('hidden');
    } else {
        $('.nw-fm-left-icon.inbox').addClass('hidden');
    }

    $('.content-panel').removeClass('active');

    if (id === 'opc' || id === 'ipc') {
        tmpId = 'contacts';
    } else if (id === 'account') {
        tmpId = 'account';
    } else {
        tmpId = id;
    }
    $('.nw-fm-left-icon.' + tmpId).addClass('active');
    $('.content-panel.' + tmpId).addClass('active');
    $('.fm-left-menu').removeClass('cloud-drive folder-link shared-with-me rubbish-bin contacts conversations opc ipc inbox account').addClass(tmpId);
    $('.fm.fm-right-header, .fm-import-to-cloudrive, .fm-download-as-zip').addClass('hidden');
    $('.fm-import-to-cloudrive, .fm-download-as-zip').unbind('click');

    $('.fm-main').removeClass('active-folder-link');
    $('.nw-fm-tree-header.folder-link').hide();
    $('.nw-fm-left-icon.folder-link').removeClass('active');

    if (folderlink) {
        // XXX: isValidShareLink won't work properly when navigating from/to a folderlink
        /*if (!isValidShareLink()) {
            $('.fm-breadcrumbs.folder-link .right-arrow-bg').text('Invalid folder');
        } else*/ if (id === 'cloud-drive' || id === 'transfers') {
            $('.fm-main').addClass('active-folder-link');
            $('.fm-right-header').addClass('folder-link');
            $('.nw-fm-left-icon.folder-link').addClass('active');
            $('.fm-left-menu').addClass('folder-link');
            $('.nw-fm-tree-header.folder-link').show();
            $('.fm-import-to-cloudrive, .fm-download-as-zip').removeClass('hidden');
            $('.fm-import-to-cloudrive, .fm-download-as-zip').rebind('click', function() {
                var c = '' + $(this).attr('class');

                if (~c.indexOf('fm-import-to-cloudrive')) {
                    fm_importflnodes([M.currentdirid]);
                } else if (~c.indexOf('fm-download-as-zip')) {
                    M.addDownload([M.currentdirid], true);
                }
            });
            // if (!u_type) {
                // $('.fm-import-to-cloudrive').addClass('hidden');
            // }
        }
    }

    if (id !== 'conversations') {
        $('.fm-right-header').removeClass('hidden');
        $('.fm-chat-block').addClass('hidden');
        $('.section.conversations').addClass('hidden');
    } else {
        $('.section.conversations').removeClass('hidden');
    }

    if (
        (id !== 'cloud-drive') &&
        (id !== 'rubbish-bin') &&
        (id !== 'inbox') &&
        (
            (id !== 'shared-with-me') &&
            (M.currentdirid !== 'shares')
        )
    ) {
        $('.files-grid-view.fm').addClass('hidden');
        $('.fm-blocks-view.fm').addClass('hidden');
    }

    if (id !== 'contacts' && id !== 'opc' && id !== 'ipc' && String(M.currentdirid).length !== 11) {
        $('.fm-left-panel').removeClass('contacts-panel');
        $('.fm-right-header').removeClass('requests-panel');
        $('.fm-received-requests').removeClass('active');
        $('.fm-contact-requests').removeClass('active');
    }

    if (id !== 'contacts') {
        $('.contacts-details-block').addClass('hidden');
        $('.files-grid-view.contacts-view').addClass('hidden');
        $('.fm-blocks-view.contacts-view').addClass('hidden');
    }

    if (id !== 'opc') {
        $('.sent-requests-grid').addClass('hidden');

        // this's button in left panel of contacts tab
        $('.fm-recived-requests').removeClass('active');
    }

    if (id !== 'ipc') {
        $('.contact-requests-grid').addClass('hidden');

        // this's button in left panel of contacts tab
        $('.fm-contact-requests').removeClass('active');
    }

    if (id !== 'shared-with-me') {
        $('.shared-blocks-view').addClass('hidden');
        $('.shared-grid-view').addClass('hidden');
    }

    if (id !== 'transfers') {
        if ($.transferClose) {
            $.transferClose();
        }
    }
    else {
        if (!$.transferOpen) {
            transferPanelUI();
        }
        $.transferOpen(true);
    }

    var headertxt = '';
    switch (id) {
        case 'contacts':
        case 'ipc':
        case 'opc':
            headertxt = l[5903];
            break;
        case 'conversations':
            headertxt = l[5914];
            break;
        case 'shared-with-me':
            headertxt = l[5915];
            break;
        case 'cloud-drive':
            if (folderlink) {
                headertxt = Object(M.d[M.RootID]).name || '';
            }
            else {
                headertxt = l[5916];
            }
            break;
        case 'inbox':
            headertxt = l[949];
            break;
        case 'rubbish-bin':
            headertxt = l[6771];
            break;
    }

    $('.fm-left-panel .nw-tree-panel-header span').text(headertxt);

    {
        // required tricks to make the conversations work with the old UI HTML/css structure
        if (id == "conversations") { // moving the control of the headers in the tree panel to chat.js + ui/conversations.jsx
            $('.fm-left-panel .nw-tree-panel-header').addClass('hidden');
            $('.fm-main.default > .fm-left-panel').addClass('hidden');
        } else {
            $('.fm-left-panel .nw-tree-panel-header').removeClass('hidden');
            $('.fm-main.default > .fm-left-panel').removeClass('hidden');
        }

        // prevent unneeded flashing of the conversations section when switching between chats
        // new sections UI
        if (id == "conversations") {
            $('.section:not(.conversations)').addClass('hidden');
            $('.section.' + id).removeClass('hidden');
        }
        else {
            $('.section').addClass('hidden');
            $('.section.' + id).removeClass('hidden');
        }

    }
}

function treeUIopen(id, event, ignoreScroll, dragOver, DragOpen) {
    id = String(id);
    var id_r = RootbyId(id);
    var id_s = id.split('/')[0];
    var e, scrollTo = false, stickToTop = false;

    //console.error("treeUIopen", id);

    if (id_r === 'shares') {
        sectionUIopen('shared-with-me');
    } else if (M.InboxID && id_r === M.InboxID) {
        sectionUIopen('inbox');
    } else if (id_r === M.RootID) {
        sectionUIopen('cloud-drive');
    } else if (id_s === 'chat') {
        sectionUIopen('conversations');
    } else if (id_r === 'contacts') {
        sectionUIopen('contacts');
    } else if (id_r === 'ipc') {
        sectionUIopen('ipc');
    } else if (id_r === 'opc') {
        sectionUIopen('opc');
    } else if (id_r === 'account') {
        sectionUIopen('account');
    } else if (M.RubbishID && id_r === M.RubbishID) {
        sectionUIopen('rubbish-bin');
    } else if (id_s === 'transfers') {
        sectionUIopen('transfers');
    }

    if (!fminitialized) {
        return false;
    }

    if (!event) {
        var ids = M.getPath(id);
        var i = 1;
        while (i < ids.length) {
            if (M.d[ids[i]]) {
                treeUIexpand(ids[i], 1);
            }
            i++;
        }
        if (
            (ids[0] === 'contacts')
            && M.currentdirid
            && (String(M.currentdirid).length === 11)
            && (M.currentrootid === 'contacts')
            ) {
            sectionUIopen('contacts');
        } else if (ids[0] === 'contacts') {
            // XX: whats the goal of this? everytime when i'm in the contacts and I receive a share, it changes ONLY the
            // UI tree -> Shared with me... its a bug from what i can see and i also don't see any points of automatic
            // redirect in the UI when another user had sent me a shared folder.... its very bad UX. Plus, as a bonus
            // sectionUIopen is already called with sectionUIopen('contacts') few lines before this (when this func
            // is called by the renderNew()

            // sectionUIopen('shared-with-me');
        } else if (ids[0] === M.RootID) {
            sectionUIopen('cloud-drive');
        }
    }
    if ($.hideContextMenu) {
        $.hideContextMenu(event);
    }

    e = $('#treea_' + id_s);
    $('.fm-tree-panel .nw-fm-tree-item').removeClass('selected');
    e.addClass('selected');

    if (!ignoreScroll) {
        if (id === M.RootID || id === 'shares' || id === 'contacts' || id === 'chat' || id === 'opc' || id === 'ipc') {
            stickToTop = true;
            scrollTo = $('.nw-tree-panel-header');
        } else if (e.length && !e.visible()) {
            scrollTo = e;
        }
        // if (d) console.log('scroll to element?',ignoreScroll,scrollTo,stickToTop);

        var jsp = scrollTo && $('.fm-tree-panel').data('jsp');
        if (jsp) {
            setTimeout(function() {
                jsp.scrollToElement(scrollTo, stickToTop);
            }, 50);
        }
    }
    treeUI();
}

function fm_hideoverlay() {
    if (!$.propertiesDialog) {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    }
    $(document).trigger('MegaCloseDialog');
}

function fm_showoverlay() {
    $('.fm-dialog-overlay').removeClass('hidden');
    $('body').addClass('overlayed');
}

function renameDialog() {

    if ($.selected.length > 0) {
        $.dialog = 'rename';
        $('.rename-dialog').removeClass('hidden');
        $('.rename-dialog').addClass('active');
        fm_showoverlay();

        $('.rename-dialog .fm-dialog-close, .rename-dialog-button.cancel').rebind('click', function() {
            $.dialog = false;
            $('.rename-dialog').addClass('hidden');
            fm_hideoverlay();
        });

        $('.rename-dialog-button.rename').rebind('click', function() {
            if ($('.rename-dialog').hasClass('active')) {
                doRename();
            }
        });

        var n = M.d[$.selected[0]];
        if (n.t) {
            $('.rename-dialog .fm-dialog-title').text(l[425]);
        }
        else {
            $('.rename-dialog .fm-dialog-title').text(l[426]);
        }

        $('.rename-dialog input').val(n.name);
        var ext = fileext(n.name);
        $('.rename-dialog .transfer-filtype-icon').attr('class', 'transfer-filtype-icon ' + fileIcon(n));
        if (!n.t && ext.length > 0) {
            $('.rename-dialog input')[0].selectionStart = 0;
            $('.rename-dialog input')[0].selectionEnd = $('.rename-dialog input').val().length - ext.length - 1;
        }

        $('.rename-dialog input').unbind('focus');
        $('.rename-dialog input').bind('focus', function() {
            var selEnd;
            $(this).closest('.rename-dialog').addClass('focused');
            var d = $(this).val().lastIndexOf('.');
            if (d > -1) {
                selEnd = d;
            }
            else {
                selEnd = $(this).val().length;
            }
            $(this)[0].selectionStart = 0;
            $(this)[0].selectionEnd = selEnd;

        });

        $('.rename-dialog input').unbind('blur');
        $('.rename-dialog input').bind('blur', function() {
            $(this).closest('.rename-dialog').removeClass('focused');
        });

        $('.rename-dialog input').unbind('click keydown keyup keypress');
        $('.rename-dialog input').focus();
        $('.rename-dialog input').bind('click keydown keyup keypress', function(e) {
            var n = M.d[$.selected[0]],
                ext = fileext(n.name);
            if ($(this).val() == '' || (!n.t && ext.length > 0 && $(this).val() == '.' + ext)) {
                $('.rename-dialog').removeClass('active');
            }
            else {
                $('.rename-dialog').addClass('active');
            }
            if (!n.t && ext.length > 0) {
                if (this.selectionStart > $('.rename-dialog input').val().length - ext.length - 2) {
                    this.selectionStart = $('.rename-dialog input').val().length - ext.length - 1;
                    this.selectionEnd = $('.rename-dialog input').val().length - ext.length - 1;
                    if (e.which === 46) {
                        return false;
                    }
                }
                else if (this.selectionEnd > $('.rename-dialog input').val().length - ext.length - 1) {
                    this.selectionEnd = $('.rename-dialog input').val().length - ext.length - 1;
                    return false;
                }
            }
        });
    }
}

/* @type {function} doRename
 *
 * On context menu rename
 */
function doRename() {

    var itemName = $('.rename-dialog input').val();
    var handle = $.selected[0];
    var nodeData = M.d[handle];

    if (itemName !== '') {
        if (nodeData) {
            if (nodeData && (itemName !== nodeData.name)) {
                M.rename(handle, itemName);
            }
        }

        $.dialog = false;
        $('.rename-dialog').addClass('hidden');
        fm_hideoverlay();
    }
}

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    var doneButton  = l[81];
    var extraButton = String(type).split(':');
    if (extraButton.length === 1) {
        extraButton = null;
    }
    else {
        type = extraButton.shift();
        extraButton = extraButton.join(':');

        if (extraButton[0] === '!') {
            doneButton  = l[82];
            extraButton = extraButton.substr(1);
        }
    }
    $.msgDialog = type;
    $.warningCallback = callback;

    $('#msgDialog').removeClass('clear-bin-dialog confirmation-dialog warning-dialog-b warning-dialog-a ' +
        'notification-dialog remove-dialog delete-contact loginrequired-dialog multiple');
    $('#msgDialog .icon').removeClass('fm-bin-clear-icon .fm-notification-icon');
    $('#msgDialog .confirmation-checkbox').addClass('hidden');

    if (type === 'clear-bin') {
        $('#msgDialog').addClass('clear-bin-dialog');
        $('#msgDialog .icon').addClass('fm-bin-clear-icon');
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="fm-dialog-button notification-button confirm"><span>@@</span></div>' +
                '<div class="fm-dialog-button notification-button cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', l[1018], l[82]);

        $('#msgDialog .fm-dialog-button').eq(0).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        });
        $('#msgDialog .fm-dialog-button').eq(1).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        });
    }
    else if (type === 'delete-contact') {
        $('#msgDialog').addClass('delete-contact');
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="fm-dialog-button notification-button confirm"><span>@@</span></div>' +
                '<div class="fm-dialog-button notification-button cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', l[78], l[79]);

        $('#msgDialog .fm-dialog-button').eq(0).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        });
        $('#msgDialog .fm-dialog-button').eq(1).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        });
    }
    else if (type === 'warninga' || type === 'warningb' || type === 'info') {
        if (extraButton) {
            $('#msgDialog .fm-notifications-bottom')
                .safeHTML('<div class="fm-dialog-button notification-button confirm"><span>@@</span></div>' +
                    '<div class="fm-dialog-button notification-button cancel"><span>@@</span></div>' +
                    '<div class="clear"></div>', doneButton, extraButton);

            $('#msgDialog .fm-dialog-button').eq(0).bind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(false);
                }
            });
            $('#msgDialog .fm-dialog-button').eq(1).bind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                }
            });
        }
        else {
            $('#msgDialog .fm-notifications-bottom')
                .safeHTML('<div class="fm-dialog-button notification-button"><span>@@</span></div>' +
                    '<div class="clear"></div>', l[81]);

            $('#msgDialog .fm-dialog-button').bind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                }
            });
        }

        $('#msgDialog .icon').addClass('fm-notification-icon');
        if (type === 'warninga') {
            $('#msgDialog').addClass('warning-dialog-a');
        }
        else if (type === 'warningb') {
            $('#msgDialog').addClass('warning-dialog-b');
        }
        else if (type === 'info') {
            $('#msgDialog').addClass('notification-dialog');
        }
    }
    else if (type === 'confirmation' || type === 'remove') {
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="left checkbox-block hidden">' +
                '<div class="checkdiv checkboxOff">' +
                    '<input type="checkbox" name="confirmation-checkbox" ' +
                        'id="confirmation-checkbox" class="checkboxOff">' +
                '</div>' +
                '<label for="export-checkbox" class="radio-txt">@@</label></div>' +
                '<div class="fm-dialog-button notification-button confirm"><span>@@</span></div>' +
                '<div class="fm-dialog-button notification-button cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', l[229], l[78], l[79]);

        $('#msgDialog .fm-dialog-button').eq(0).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        });

        $('#msgDialog .fm-dialog-button').eq(1).bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        });
        $('#msgDialog .icon').addClass('fm-notification-icon');
        $('#msgDialog').addClass('confirmation-dialog');
        if (type === 'remove') {
            $('#msgDialog').addClass('remove-dialog');
        }

        if (checkbox) {
            $('#msgDialog .left.checkbox-block .checkdiv,' +
                '#msgDialog .left.checkbox-block input')
                    .removeClass('checkboxOn').addClass('checkboxOff');

            $.warningCheckbox = false;
            $('#msgDialog .left.checkbox-block').removeClass('hidden');
            $('#msgDialog .left.checkbox-block').rebind('click', function(e) {
                var $o = $('#msgDialog .left.checkbox-block .checkdiv, #msgDialog .left.checkbox-block input');
                if ($('#msgDialog .left.checkbox-block input').hasClass('checkboxOff')) {
                    $o.removeClass('checkboxOff').addClass('checkboxOn');
                    localStorage.skipDelWarning = 1;
                }
                else {
                    $o.removeClass('checkboxOn').addClass('checkboxOff');
                    delete localStorage.skipDelWarning;
                }
            });
        }
    }
    else if (type === 'loginrequired') {

        $('#msgDialog').addClass('loginrequired-dialog');

        $('#msgDialog .fm-notifications-bottom')
            .addClass('hidden')
            .html('');

        $('#msgDialog .fm-dialog-button').bind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        });
        $('#msgDialog').addClass('notification-dialog');
        title = l[5841];
        msg = '<p>' + escapeHTML(l[5842]) + '</p>\n' +
            '<a class="top-login-button" href="#login">' + escapeHTML(l[171]) + '</a>\n' +
            '<a class="create-account-button" href="#register">' + escapeHTML(l[1076]) + '</a><br/>';

        var $selectedPlan = $('.reg-st3-membership-bl.selected');
        var plan = 1;
        if ($selectedPlan.is(".pro4")) { plan = 4; }
        else if ($selectedPlan.is(".pro1")) { plan = 1; }
        else if ($selectedPlan.is(".pro2")) { plan = 2; }
        else if ($selectedPlan.is(".pro3")) { plan = 3; }

        $('.loginrequired-dialog .fm-notification-icon')
            .removeClass('plan1')
            .removeClass('plan2')
            .removeClass('plan3')
            .removeClass('plan4')
            .addClass('plan' + plan);
    }

    $('#msgDialog .fm-dialog-title span').text(title);

    $('#msgDialog .fm-notification-info p').safeHTML(msg);
    if (submsg) {
        $('#msgDialog .fm-notification-warning').text(submsg);
        $('#msgDialog .fm-notification-warning').show();
    }
    else {
        $('#msgDialog .fm-notification-warning').hide();
    }

    $('#msgDialog .fm-dialog-close').rebind('click', function() {
        closeMsg();
        if ($.warningCallback) {
            $.warningCallback(false);
        }
    });
    $('#msgDialog').removeClass('hidden');
    fm_showoverlay();
}

function closeMsg() {
    $('#msgDialog').addClass('hidden');

    if (!$('.pro-register-dialog').is(':visible')) {
        fm_hideoverlay();
    }

    delete $.msgDialog;
}

function dialogScroll(s) {
    var cls = s;

    cls += ':visible';
    $(cls).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});
    jScrollFade(cls);
}

function dialogPositioning(s) {
    $(s).css('margin-top', '-' + $(s).height() / 2 + 'px');
}

/**
 * handleDialogTabContent
 *
 * Handle DOM directly, no return value.
 * @param {String} dialogTabClass, dialog tab class name.
 * @param {String} parentTag, tag of source element.
 * @param {String} dialogPrefix, dialog prefix i.e. { copy, move }.
 * @param {String} htmlContent, html content.
 */
function handleDialogTabContent(dialogTabClass, parentTag, dialogPrefix, htmlContent) {

    var html = htmlContent.replace(/treea_/ig, 'mctreea_').replace(/treesub_/ig, 'mctreesub_').replace(/treeli_/ig, 'mctreeli_'),
        prefix = '.' + dialogPrefix,
        tabClass = '.' + dialogTabClass;

    $(prefix + '-dialog-tree-panel' + tabClass + ' .dialog-content-block')
        .empty()
        .safeHTML(html);

    // Empty message, no items available
    if (!$(prefix + '-dialog-tree-panel' + tabClass + ' .dialog-content-block ' + parentTag).length){
        $(prefix + '-dialog-empty' + tabClass).addClass('active');
        $(prefix + '-dialog-tree-panel' + tabClass + ' ' + prefix + '-dialog-panel-header').addClass('hidden');
    }

    // Items available, hide empty message
    else {
        $(prefix + '-dialog-tree-panel' + tabClass).addClass('active');
        $(prefix + '-dialog-tree-panel' + tabClass + ' ' + prefix + '-dialog-panel-header').removeClass('hidden');
    }
}

/**
 * disableReadOnlySharedFolders
 *
 * Find shared folders marked read-only and disable it in dialog.
 * @param {String} dialogName Dialog name i.e. { copy, move }.
 */
function disableReadOnlySharedFolders(dialogName) {

    var nodeId, accessRight, rootParentDirId,
        $mcTreeSub = $("#mctreesub_shares"),
        $ro = $('.' + dialogName + '-dialog-tree-panel.shared-with-me .dialog-content-block span[id^="mctreea_"]');

    $ro.each(function(i, v) {
        nodeId = $(v).attr('id').replace('mctreea_', '');

        // Apply access right of root parent dir to all subfolders
        rootParentDirId = $("#mctreea_" + nodeId).parentsUntil($mcTreeSub).last().attr('id').replace('mctreeli_', '');

        if (M.d[rootParentDirId]) {
            accessRight = M.d[rootParentDirId].r;
        }

        if (!accessRight || (accessRight === 0)) {
            $(v).addClass('disabled');
        }
    });
}

/**
 * handleDialogContent
 *
 * Copy|Move dialogs content  handler
 * @param {String} dialogTabClass Dialog tab class name.
 * @param {String} parentTag Tag that contains one menu-item.
 * @param {Boolean} newFolderButton Should we show new folder button.
 * @param {String} dialogPrefix i.e. [copy, move].
 * @param {String} buttonLabel Action button label.
 * @param {String} convTab In case of conversations tab.
 */
function handleDialogContent(dialogTabClass, parentTag, newFolderButton, dialogPrefix, buttonLabel, convTab) {

    var html,
        $btn = '';// Action button label

    if ($.onImportCopyNodes && (!newFolderButton || (dialogPrefix !== 'copy'))) {

        // XXX: Ideally show some notification that importing from folder link to anything else than the cloud isn't supported.
        $('.copy-dialog-button.' + dialogTabClass).fadeOut(200).fadeIn(100);

        return;
    }
    $('.' + dialogPrefix + '-dialog-txt').removeClass('active');
    $('.' + dialogPrefix + '-dialog-empty').removeClass('active');
    $('.' + dialogPrefix + '-dialog-button').removeClass('active');
    $('.' + dialogPrefix + '-dialog-tree-panel').removeClass('active');
    $('.' + dialogPrefix + '-dialog-panel-arrows').removeClass('active');
    $('.' + dialogPrefix + '-dialog .dialog-sorting-menu').addClass('hidden');

    $('.dialog-' + dialogPrefix + '-button span').text(buttonLabel);

    // Action button label
    $btn = $('.dialog-' + dialogPrefix + '-button');

    // Disable/enable button
    if ($.mcselected) {
        $btn.removeClass('disabled');
    }
    else {
        $btn.addClass('disabled');
    }

    // Activate proper tab
    $('.' + dialogPrefix + '-dialog-txt' + '.' + dialogTabClass).addClass('active');

    // Added cause of conversations-container
    if (convTab) {
        html = $('.content-panel ' + convTab).html();
    }
    else {
        html = $('.content-panel' + '.' + dialogTabClass).html();
    }

    handleDialogTabContent(dialogTabClass, parentTag, dialogPrefix, html);

    // Make sure that dialog tab content is properly sorted
    if ((dialogTabClass === 'cloud-drive') || (dialogTabClass === 'folder-link')) {
        M.buildtree(M.d[M.RootID], dialogPrefix + '-dialog');
    }
    else if (dialogTabClass === 'shared-with-me') {
        M.buildtree({ h: 'shares' }, dialogPrefix + '-dialog');
        disableReadOnlySharedFolders(dialogPrefix);
    }
    else if (dialogTabClass === 'rubish-bin') {
        M.buildtree({h: M.RubbishID}, dialogPrefix + '-dialog');
    }
    else if (dialogTabClass === 'conversations') {
        //@ToDo: make this working when chat start functioning
    }

    // 'New Folder' button
    if (newFolderButton) {
        $('.dialog-newfolder-button').removeClass('hidden');
    }
    else {
        $('.dialog-newfolder-button').addClass('hidden');
    }

    // If copying from contacts tab (Ie, sharing)
    if (buttonLabel === l[1344]) {
        $('.fm-dialog.copy-dialog .share-dialog-permissions').removeClass('hidden');
        $('.dialog-newfolder-button').addClass('hidden');
        $('.copy-dialog-button').addClass('hidden');
        $('.copy-operation-txt').text(l[1344]);

        $('.fm-dialog.copy-dialog .share-dialog-permissions')
            .rebind('click', function() {
                var $btn = $(this);
                var $menu = $('.permissions-menu', this.parentNode);
                var $items = $('.permissions-menu-item', $menu);

                $items
                    .rebind('click', function() {
                        $items.unbind('click');

                        $items.removeClass('active');
                        $(this).addClass('active');
                        $btn.attr('class', 'share-dialog-permissions ' + this.classList[1])
                            .safeHTML('<span></span>' + $(this).text());
                        $menu.fadeOut(200);
                    });
                $menu.fadeIn(200);
            });
    }
    else {
        $('.fm-dialog.copy-dialog .share-dialog-permissions').addClass('hidden');
        $('.copy-dialog-button').removeClass('hidden');
        $('.copy-operation-txt').text(l[63]);
    }

    $('.' + dialogPrefix + '-dialog .nw-fm-tree-item').removeClass('expanded active opened selected');
    $('.' + dialogPrefix + '-dialog ul').removeClass('opened');

    dialogPositioning('.fm-dialog' + '.' + dialogPrefix + '-dialog');

    dialogScroll('.dialog-tree-panel-scroll');

    // Activate tab
    $('.' + dialogPrefix + '-dialog-button' + '.' + dialogTabClass).addClass('active');
}

/**
 * shareDialogContentCheck
 *
 * Taking care about share dialog button 'Done'/share enabled/disabled and scroll
 *
 */
function shareDialogContentCheck() {

    var dc = '.share-dialog',
        itemsNum = 0,
        newItemsNum = 0,
        $btn = $('.fm-dialog-button.dialog-share-button');
    var $groupPermissionDropDown = $('.share-dialog .permissions-icon');

    newItemsNum = $(dc + ' .token-input-token-mega').length;
    itemsNum = $(dc + ' .share-dialog-contacts .share-dialog-contact-bl').length;

    if (itemsNum) {

        $(dc + ' .share-dialog-img').addClass('hidden');
        $(dc + ' .share-dialog-contacts').removeClass('hidden');
        handleDialogScroll(itemsNum, dc);
    }
    else {
        $(dc + ' .share-dialog-img').removeClass('hidden');
        $(dc + ' .share-dialog-contacts').addClass('hidden');
    }

    // If new items are availble in multiInput box
    // or permission is changed on some of existing items
    if (newItemsNum || $.changedPermissions.length || $.removedContactsFromShare.length) {
        $btn.removeClass('disabled');
    }
    else {
        $btn.addClass('disabled');
    }

    if (newItemsNum) {
        $groupPermissionDropDown.removeClass('disabled');
    }
    else {
        $groupPermissionDropDown.addClass('disabled');
    }
}

function addShareDialogContactToContent(userEmail, type, id, av, userName, permClass, permText) {

    var html = '',
        htmlEnd = '',
        item = '',
        exportClass = '';

    var contactEmailHtml = '';

    if (userEmail !== userName) {
        contactEmailHtml = '<div class="contact-email">'
            + htmlentities(userEmail)
            + '</div>';
    }

    item = av
        + '<div class="fm-share-user-info">'
        + '<div class="fm-share-centered">'
        + '<div class="fm-chat-user">' + htmlentities(userName) + '</div>'
        + contactEmailHtml
        + '</div>'
        + '</div>';

    html = '<div class="share-dialog-contact-bl ' + type + '" id="sdcbl_' + id + '">'
           + item
           + '<div class="share-dialog-remove-button"></div>'
           + '<div class="share-dialog-permissions ' + permClass + '">'
           + '<span></span>' + permText
           +  '</div>';


    htmlEnd = '<div class="clear"></div>'
              + '</div>';

    return html + htmlEnd;
}

function fillShareDialogWithContent() {

    $.sharedTokens = [];// GLOBAL VARIABLE, Hold items currently visible in share folder content (above multi-input)
    $.changedPermissions = [];// GLOBAL VAR, changed permissions shared dialog
    $.removedContactsFromShare = [];// GLOBAL VAR, removed contacts from a share

    var pendingShares = {};
    var nodeHandle    = String($.selected[0]);
    var node          = M.getNodeByHandle(nodeHandle);
    var userHandles   = M.getNodeShareUsers(node, 'EXP');

    if (Object(M.ps).hasOwnProperty(nodeHandle)) {
        pendingShares = Object(M.ps[nodeHandle]);
        userHandles   = userHandles.concat(Object.keys(pendingShares));
    }
    var seen = {};

    userHandles.forEach(function(handle) {
        var user = M.getUser(handle) || Object(M.opc[handle]);

        if (!user.m) {
            console.warn('Unknown user "%s"!', handle);
        }
        else if (!seen[user.m]) {
            var name  = M.getNameByHandle(handle) || user.m;
            var share = M.getNodeShare(node, handle) || Object(pendingShares[handle]);

            generateShareDialogRow(name, user.m, share.r | 0, handle);
            seen[user.m] = 1;
        }
    });
}

/**
 * Generates and inserts a share or pending share row into the share dialog
 * @param {String} displayNameOrEmail
 * @param {String} email
 * @param {Number} shareRights
 * @param {String} userHandle Optional
 */
function generateShareDialogRow(displayNameOrEmail, email, shareRights, userHandle) {

    var rowId = '',
        html = '',
        av =  useravatar.contact(email),
        perm = '',
        permissionLevel = 0;

    if (typeof shareRights != 'undefined') {
        permissionLevel = shareRights;
    }

    // Permission level
    if (permissionLevel === 1) {
        perm = ['read-and-write', l[56]];
    } else if (permissionLevel === 2) {
        perm = ['full-access', l[57]];
    } else {
        perm = ['read-only', l[55]];
    }

    // Add contact
    $.sharedTokens.push(email);

    // Update token.input plugin
    removeFromMultiInputDDL('.share-multiple-input', {id: email, name: email});

    rowId = (userHandle) ? userHandle : email;
    html = addShareDialogContactToContent(email, '', rowId, av, displayNameOrEmail, perm[0], perm[1]);

    $('.share-dialog .share-dialog-contacts').safeAppend(html);
}

function handleDialogScroll(num, dc)
{
    var SCROLL_NUM = 5;// Number of items in dialog before scroll is implemented
    //
    // Add scroll in case that we have more then 5 items in list
    if (num > SCROLL_NUM)
    {
        dialogScroll(dc + ' .share-dialog-contacts');
    }
    else
    {
        var $x = $(dc + ' .share-dialog-contacts').jScrollPane();
        var el = $x.data('jsp');
        el.destroy();
    }
}

function handleShareDialogContent() {

    var dc = '.share-dialog';

    fillShareDialogWithContent();

    // Taking care about share dialog button 'Done'/share and scroll
    shareDialogContentCheck();

    // Maintain drop down list updated
    updateDialogDropDownList('.share-multiple-input');

    $('.share-dialog-icon.permissions-icon')
        .removeClass('active full-access read-and-write')
        .safeHTML('<span></span>' + l[55])
        .addClass('read-only');

    // Update dialog title text
    $(dc + ' .fm-dialog-title').text(l[5631] + ' "' + M.d[$.selected].name + '"');
    $(dc + ' .multiple-input .token-input-token-mega').remove();
    dialogPositioning('.fm-dialog.share-dialog');
    $(dc + ' .token-input-input-token-mega input').focus();
}

/**
 * updateDialogDropDownList
 *
 * Extract id from list of emails, preparing it for extrusion,
 * fill multi-input dropdown list with not used emails.
 * @param {String} dialog, multi-input dialog class name.
 */
function updateDialogDropDownList(dialog) {

    var listOfEmails = getContactsEMails(),
        allEmails = [],
        contacts;

    // Loop through email list and extrude id
    for (var i in listOfEmails) {
        if (listOfEmails.hasOwnProperty(i)) {
            allEmails.push(listOfEmails[i].id);
        }
    }

    contacts = excludeIntersected($.sharedTokens, allEmails);
    addToMultiInputDropDownList(dialog, contacts);
}

/**
 * checkMultiInputPermission
 *
 * Check DOM element permission level class name.
 * @param {Object} $this, DOM drop down list element.
 * @returns {Array} [drop down list permission class name, translation string].
 */
function checkMultiInputPermission($this) {

    var permissionLevel;

    if ($this.is('.read-and-write')) {
        permissionLevel = ['read-and-write', l[56]]; // Read & Write
    }
    else if ($this.is('.full-access')) {
        permissionLevel = ['full-access', l[57]]; // Full access
    }
    else {
        permissionLevel = ['read-only', l[55]]; // Read-only
    }

    return permissionLevel;
}

/**
 * Checks if an email address is already known by the user
 * @param {String} email
 * @returns {Boolean} Returns true if it exists in the state, false if it is new
 */
function checkIfContactExists(email) {

    var userIsAlreadyContact = false;
    var userContacts = M.u;

    // Loop through the user's contacts
    for (var contact in userContacts) {
        if (userContacts.hasOwnProperty(contact)) {

            // Check if the users are already contacts by comparing email addresses of known contacts and the one entered
            if (email === userContacts[contact].m) {
                userIsAlreadyContact = true;
                break;
            }
        }
    }

    return userIsAlreadyContact;
}

/**
 * sharedPermissionLevel
 *
 * Translate class name to numeric permission level.
 * @param {String} value Permission level as a string i.e. 'read-and-write', 'full-access', 'read-only'.
 * @returns {Number} integer value of permission level.
 */
function sharedPermissionLevel(value) {

    var permissionLevel = 0;

    if (value === 'read-and-write') {
        permissionLevel = 1; // Read and Write access
    }
    else if (value === 'full-access') {
        permissionLevel = 2; // Full access
    }
    else {
        permissionLevel = 0; // read-only
    }

    return permissionLevel;
}

/**
 * initShareDialogMultiInputPlugin
 *
 * Initialize share dialog multi input plugin
 */
function initShareDialogMultiInputPlugin() {

        // Plugin configuration
        var contacts = getContactsEMails();

        function errorMsg(msg) {

            var $shareDialog = $('.share-dialog'),
                $warning = $shareDialog.find('.multiple-input-warning span');

            $warning.text(msg);
            $shareDialog.addClass('error');

            setTimeout(function() {
                $shareDialog.removeClass('error');
            }, 3000);
        }

        var $input = $('.share-multiple-input');
        var $scope = $input.parents('.share-dialog');

        $input.tokenInput(contacts, {
            theme: "mega",
            hintText: l[5908],
            // placeholder: "Type in an email or contact",
            searchingText: "",
            noResultsText: "",
            addAvatar: true,
            autocomplete: null,
            searchDropdown: true,
            emailCheck: true,
            preventDoublet: false,
            tokenValue: "id",
            propertyToSearch: "name",
            resultsLimit: 5,
            minChars: 1,
            accountHolder: (M.u[u_handle] || {}).m || '',
            scrollLocation: 'share',
            // Exclude from dropdownlist only emails/names which exists in multi-input (tokens)
            excludeCurrent: true,

            onEmailCheck: function() {
                errorMsg(l[7415]); // Looks like there's a malformed email
            },
            onReady: function() {
                var $this = $scope.find('li input');
                $this.rebind('keyup', function() {
                    var value = $.trim($this.val());
                    if ($scope.find('li.token-input-token-mega').length > 0 || checkMail(value) === false) {
                        $scope.find('.dialog-share-button').removeClass('disabled');
                    } else {
                        $scope.find('.dialog-share-button').addClass('disabled');
                    }
                });
            },
            onDoublet: function(u) {
                errorMsg(l[7413]); // You already have a contact with that email
            },
            onHolder: function() {
                errorMsg(l[7414]); // There's no need to add your own email address
            },
            onAdd: function(item) {

                // If the user is not already a contact, then show a text area
                // where they can add a custom message to the pending share request
                if (checkIfContactExists(item.id) === false) {
                    $('.share-message').show();
                    initTextareaScrolling($('.share-message-textarea textarea'), 39);
                }

                $('.dialog-share-button').removeClass('disabled');

                // Enable group permission change drop down list
                $('.share-dialog .permissions-icon').removeClass('disabled');

                var $shareDialog = $('.share-dialog');
                var $inputToken = $('.share-added-contact.token-input-token-mega');
                var $multiInput = $shareDialog.find('.multiple-input');
                var h1 = $inputToken.outerHeight(true);// margin
                var h2 = $multiInput.height();

                // Add scroll box if there's enough items available
                if (5 <= h2 / h1 && h2 / h1 < 6) {
                    $multiInput.jScrollPane({
                        enableKeyboardNavigation: false,
                        showArrows: true,
                        arrowSize: 8,
                        animateScroll: true
                    });
                    setTimeout(function() {
                        $shareDialog.find('.token-input-input-token-mega input').focus();
                    }, 0);
                }
            },
            onDelete: function() {

                var $btn = $('.dialog-share-button'),
                    $shareDialog = $('.share-dialog'),
                    iNewItemsNum, iItemsNum;

                setTimeout(function() {
                    $shareDialog.find('.token-input-input-token-mega input').blur();
                }, 0);

                iNewItemsNum = $shareDialog.find('.token-input-list-mega .token-input-token-mega').length;
                iItemsNum = $shareDialog.find('.share-dialog-contacts .share-dialog-contact-bl').length;

                // If new items are still availble in multiInput box
                // or permission is changed on some of existing items
                if (iNewItemsNum  || $.changedPermissions.length || $.removedContactsFromShare.length) {
                    $btn.removeClass('disabled');
                }
                else {
                    $btn.addClass('disabled');
                }

                if (iNewItemsNum) {

                    var inputToken = $shareDialog.find('.share-added-contact.token-input-token-mega'),
                        $multiInput = $shareDialog.find('.multiple-input'),
                        $c = $shareDialog.find('.multiple-input .jspPane')[0],
                        h1 = inputToken.outerHeight(),// margin excluded
                        h2 = 0;

                    if ($c) {
                        h2 = $c.scrollHeight;
                    }
                    else {
                        h2 = $multiInput.height();
                    }

                    // If there's less items then necessary remove scroll box
                    if (h2 / h1 < 6) {
                        clearScrollPanel('.share-dialog');
                    }
                }
                else {

                    // Disable group permission change drop down list
                    $('.share-dialog .permissions-icon').addClass('disabled');
                }
            }
        });
}

/**
 * Shows the copyright warning dialog.
 *
 * @param {Array} nodesToProcess Array of strings, node ids
 */
function initCopyrightsDialog(nodesToProcess) {

    $.itemExport = nodesToProcess;
    // If they've already agreed to the copyright warning this session
    if (localStorage.getItem('agreedToCopyrightWarning') !== null) {

        // Go straight to Get Link dialog
        var exportLink = new mega.Share.ExportLink({ 'showExportLinkDialog': true, 'updateUI': true, 'nodesToProcess': nodesToProcess });
        exportLink.getExportLink();

        return false;
    }

    // Cache selector
    var $copyrightDialog = $('.copyrights-dialog');

    // Otherwise show the copyright warning dialog
    fm_showoverlay();
    $.copyrightsDialog = 'copyrights';
    $copyrightDialog.show();

    // Init click handler for 'I agree' / 'I disagree' buttons
    $copyrightDialog.find('.fm-dialog-button').rebind('click', function() {

        // User disagrees with copyright warning
        if ($(this).hasClass('cancel')) {
            closeDialog();
        }
        else {
            // User agrees, store flag in localStorage so they don't see it again for this session
            localStorage.setItem('agreedToCopyrightWarning', '1');

            // Go straight to Get Link dialog
            closeDialog();
            var exportLink = new mega.Share.ExportLink({ 'showExportLinkDialog': true, 'updateUI': true, 'nodesToProcess': nodesToProcess });
            exportLink.getExportLink();
        }
    });

    // Init click handler for 'Close' button
    $copyrightDialog.find('.fm-dialog-close').rebind('click', function() {
        closeDialog();
    });
}

function initShareDialog() {

    $.shareTokens = [];

    if (!u_type) {
        return; // not for ephemeral
    }

    // Prevents double initialization of token input
    if (!$('.share-multiple-input').tokenInput("getSettings")) {

        initShareDialogMultiInputPlugin();
    }

    function menuPermissionState($this) {

        var mi = '.permissions-menu .permissions-menu-item',
            cls = checkMultiInputPermission($this);

        $(mi).removeClass('active');

        $(mi + '.' + cls[0]).addClass('active');
    }

    function handlePermissionMenu($this, m, x, y) {

        m.css('left', x + 'px');
        m.css('top', y + 'px');
        menuPermissionState($this);
        $this.addClass('active');
        m.fadeIn(200);
    }

    $('.share-dialog').rebind('click', function(e) {

        var hideMenus = function() {

            // share dialog permission menu
            $('.permissions-menu', $this).fadeOut(200);
            $('.import-contacts-dialog').fadeOut(200);
            $('.permissions-icon', $this).removeClass('active');
            $('.share-dialog-permissions', $this).removeClass('active');
            closeImportContactNotification('.share-dialog');
            $('.import-contacts-service', $this).removeClass('imported');
        };

        var $this = $(this);

        if (typeof e.originalEvent.path !== 'undefined') {

            // This's sensitive to dialog DOM element positioning
            var trg = e.originalEvent.path[0];
            var trg1 = e.originalEvent.path[1];
            var trg2 = e.originalEvent.path[2];

            if (!$(trg).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
                && !$(trg1).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
                && !$(trg2).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions'))
            {
                hideMenus();
            }
        }
        else if ($this.get(0) === e.currentTarget) {
            hideMenus();
        }
    });

    $('.share-dialog .fm-dialog-close, .share-dialog .dialog-cancel-button').rebind('click', function() {
        $('.export-links-warning').addClass('hidden');
        closeDialog();
    });

    /*
     * On share dialog, done/share button
     *
     * Adding new contacts to shared item
     */
    $('.share-dialog .dialog-share-button').rebind('click', function() {

        var share = new mega.Share();
        share.updateNodeShares();
    });

    $('.share-dialog').off('click', '.share-dialog-remove-button');
    $('.share-dialog').on('click', '.share-dialog-remove-button', function() {

        var $this = $(this);

        var userEmail, pendingContactId, selectedNodeHandle, num,
            handleOrEmail = $this.parent().attr('id').replace('sdcbl_', '');

        $this.parent()
            .fadeOut(200)
            .remove();

        selectedNodeHandle = $.selected[0];
        if (handleOrEmail !== '') {

            // Due to pending shares, the id could be an email instead of a handle
            userEmail = Object(M.opc[handleOrEmail]).m || handleOrEmail;

            $.removedContactsFromShare.push({
                'selectedNodeHandle': selectedNodeHandle,
                'userEmail': userEmail,
                'handleOrEmail': handleOrEmail
            });

            $.sharedTokens.splice($.sharedTokens.indexOf(userEmail), 1);
        }

        shareDialogContentCheck();
    });

    // related to specific contact
    $('.share-dialog').off('click', '.share-dialog-permissions');
    $('.share-dialog').on('click', '.share-dialog-permissions', function(e) {

        var $this = $(this);
        var $m = $('.permissions-menu');
        var scrollBlock = $('.share-dialog-contacts .jspPane');
        var scrollPos = 0;
        var x = 0;
        var y = 0;

        $m.removeClass('search-permissions');

        if (scrollBlock.length) {
            scrollPos = scrollBlock.position().top;
        }

        // fadeOut this popup
        if ($this.is('.active')) {
            $m.fadeOut(200);
            $this.removeClass('active');
        }
        else {
            $('.share-dialog-permissions').removeClass('active');
            $('.permissions-icon').removeClass('active');
            closeImportContactNotification('.share-dialog');

            x = $this.position().left + 10;
            y = $this.position().top + 13 + scrollPos;

            handlePermissionMenu($this, $m, x, y);
        }

        e.stopPropagation();
    });

    // related to multi-input contacts
    $('.share-dialog .permissions-icon').rebind('click', function(e) {

        var $this = $(this);
        var $m = $('.permissions-menu');
        var x = 0;
        var y = 0;

        if (!$this.is('.disabled')) {

            // fadeOut permission menu for this icon
            if ($this.is('.active')) {
                $m.fadeOut(200);
                $this.removeClass('active');
            }
            else {
                $('.share-dialog-permissions').removeClass('active');
                $('.permissions-icon').removeClass('active');
                $m.addClass('search-permissions');
                closeImportContactNotification('.share-dialog');

                x = $this.position().left - 4;
                y = $this.position().top - 35;

                handlePermissionMenu($this, $m, x, y);
            }
        }

        e.stopPropagation();
    });

    /* Handles permission changes
     * 1. Group permission change '.share-dialog .permissions-icon.active'
     * 2. Specific perm. change '.share-dialog .share-dialog-permissions.active'
    */
    $('.permissions-menu-item').rebind('click', function(e) {

        var $this = $(this);
        var id;
        var perm;
        var $existingContacts;
        var shares = M.d[$.selected[0]].shares;
        var newPermLevel = checkMultiInputPermission($this);
        var $itemPermLevel = $('.share-dialog .share-dialog-permissions.active');
        var $groupPermLevel = $('.share-dialog .permissions-icon.active');
        var currPermLevel = [];

        $('.permissions-menu').fadeOut(200);

        // Single contact permission change, .share-dialog-permissions
        if ($itemPermLevel.length) {

            currPermLevel = checkMultiInputPermission($itemPermLevel);
            id = $itemPermLevel.parent().attr('id').replace('sdcbl_', '');

            if (id !== '') {
                perm = sharedPermissionLevel(newPermLevel[0]);

                if (!shares || !shares[id] || shares[id].r !== perm) {
                    $.changedPermissions.push({ u: id, r: perm });
                }
            }

            $itemPermLevel
                .removeClass(currPermLevel[0])
                .removeClass('active')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);
        }
        else if ($groupPermLevel.length) {// Group permission change, .permissions-icon

            // $.changedPermissions = [];// Reset global var

            currPermLevel = checkMultiInputPermission($groupPermLevel);

            // Get all items from dialog content block (avatar, name/email, permission)
            /*$existingContacts = $('.share-dialog-contact-bl');
            $.each($existingContacts, function(index, value) {

                extract id of contact
                id = $(value).attr('id').replace('sdcbl_', '');

                if (id !== '') {
                    perm = sharedPermissionLevel(newPermLevel[0]);

                    if (!shares || !shares[id] || shares[id].r !== perm) {
                        $.changedPermissions.push({ u: id, r: perm });
                    }
                }
            });*/

            $groupPermLevel
                .removeClass(currPermLevel[0])
                .removeClass('active')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);

            /*$('.share-dialog-contact-bl .share-dialog-permissions')
                .removeClass('read-only')
                .removeClass('read-and-write')
                .removeClass('full-access')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);*/
        }

        if ($.changedPermissions.length > 0) {// Enable Done button
            $('.fm-dialog-button.dialog-share-button').removeClass('disabled');
        }

        $('.permissions-icon.active').removeClass('active');
        $('.share-dialog-permissions.active').removeClass('active');

        e.stopPropagation();
    });

    //Pending info block
    $('.pending-indicator').rebind('mouseover', function() {
        var x = $(this).position().left,
            y = $(this).position().top,
            infoBlock = $('.share-pending-info'),
            scrollPos = 0;
        if ($('.share-dialog-contacts .jspPane'))
            scrollPos = $('.share-dialog-contacts .jspPane').position().top;
        infoHeight = infoBlock.outerHeight();
        infoBlock.css({
            'left': x,
            'top': y - infoHeight + scrollPos
        });
        infoBlock.fadeIn(200);
    });
    $('.pending-indicator').rebind('mouseout', function() {
        $('.share-pending-info').fadeOut(200);
    });

    // Personal message
    $('.share-message textarea').rebind('focus', function() {

        var $this = $(this);
        $('.share-message').addClass('active');

        if ($this.val() === l[6853]) {

            // Clear the default message
            $this.val('');

            window.setTimeout(function() {
                $this.select();
            }, 1);

            function mouseUpHandler() {
                $this.off("mouseup", mouseUpHandler);
                return false;
            }
            $this.mouseup(mouseUpHandler);
        }
    });

    $('.share-message textarea').rebind('blur', function() {
        var $this = $(this);
        $('.share-message').removeClass('active');
    });
}

function addImportedDataToSharedDialog(data, from) {
    $.each(data, function(ind, val) {
        $('.share-dialog .share-multiple-input').tokenInput("add", {id: val, name: val});
    });

    closeImportContactNotification('.share-dialog');
}

function addImportedDataToAddContactsDialog(data, from) {
    $.each(data, function(ind, val) {
        $('.add-user-popup .add-contact-multiple-input').tokenInput("add", {id: val, name: val});
    });

    closeImportContactNotification('.add-user-popup');
}

function closeImportContactNotification(c) {
    loadingDialog.hide();
    $('.imported-contacts-notification').fadeOut(200);
    $(c + ' .import-contacts-dialog').fadeOut(200);
    $('.import-contacts-link').removeClass('active');

    // Remove focus from input element, related to tokeninput plugin
    $(c + ' input#token-input-').blur();
}

function clearScrollPanel(from) {
    var j = $(from + ' .multiple-input').jScrollPane().data();
    if (j && j.jsp) {
        j.jsp.destroy();
    }
    $(from + ' .multiple-input .jspPane').unwrap();
    $(from + ' .multiple-input .jspPane:first-child').unwrap();

    // remove share dialog contacts, jScrollPane
    j = $(from + ' .share-dialog-contacts').jScrollPane().data();
    if (j && j.jsp) {
        j.jsp.destroy();
    }
}

function closeDialog() {

    if (d) {
        MegaLogger.getLogger('closeDialog').debug($.dialog);
    }

    if (!$('.fm-dialog.registration-page-success').hasClass('hidden')) {
        fm_hideoverlay();
        $('.fm-dialog.registration-page-success').addClass('hidden').removeClass('special');
    }

    if ($('.fm-dialog.incoming-call-dialog').is(':visible') === true) {
        // managing dialogs should be done properly in the future, so that we won't need ^^ bad stuff like this one
        return false;
    }

    if ($.dialog === 'passwordlink-dialog') {
        if (String(page).substr(0, 2) === 'P!') {
            // do nothing while on the password-link page
            return false;
        }
        $('.fm-dialog.password-dialog').addClass('hidden');
    }

    if ($.dialog === 'createfolder' && ($.copyDialog || $.moveDialog)) {
        $('.fm-dialog.create-folder-dialog').addClass('hidden');
        $('.fm-dialog.create-folder-dialog .create-folder-size-icon').removeClass('hidden');
    }
    else if (($.dialog === 'slideshow') && $.copyrightsDialog) {
        $('.copyrights-dialog').hide();

        delete $.copyrightsDialog;
    }
    else {
        if ($.dialog === 'properties') {
            propertiesDialog(1);
        }
        else {
            fm_hideoverlay();
        }
        if (!$.propertiesDialog) {
            $('.fm-dialog').addClass('hidden');
        }
        $('.dialog-content-block').empty();

        // add contact popup
        $('.add-user-popup').addClass('hidden');
        $('.fm-add-user').removeClass('active');

        $('.add-contact-multiple-input').tokenInput("clearOnCancel");
        $('.share-multiple-input').tokenInput("clearOnCancel");

        clearScrollPanel('.add-user-popup');

        // share dialog
        $('.share-dialog-contact-bl').remove();
        $('.import-contacts-service').removeClass('imported');
        clearScrollPanel('.share-dialog');

        // share dialog permission menu
        $('.permissions-menu').fadeOut(0);
        $('.permissions-icon').removeClass('active');
        closeImportContactNotification('.share-dialog');
        closeImportContactNotification('.add-user-popup');

        $('.copyrights-dialog').hide();
        $('.export-link-dropdown').hide();

        delete $.copyDialog;
        delete $.moveDialog;
        delete $.copyrightsDialog;
    }
    $('.fm-dialog').removeClass('arrange-to-back');

    $('.export-links-warning').addClass('hidden');
    if ($.dialog == 'terms' && $.termsAgree) {
        delete $.termsAgree;
    }

    delete $.dialog;
    delete $.mcImport;
}

function copyDialog() {

    var copyDialogTooltipTimer;

    // Clears already selected sub-folders, and set selection to root
    function selectCopyDialogTabRoot(section) {

        var $btn = $('.dialog-copy-button');

        $('.copy-dialog .nw-fm-tree-item').removeClass('selected');

        if ((section === 'cloud-drive') || (section === 'folder-link')) {
            $.mcselected = M.RootID;
        }
        else {
            $.mcselected = undefined;
        }

        // Disable/enable button
        if ($.mcselected) {
            $btn.removeClass('disabled');
        }
        else {
            $btn.addClass('disabled');
        }
    };

    $('.copy-dialog .fm-dialog-close, .copy-dialog .dialog-cancel-button').rebind('click', function() {

        closeDialog();
        delete $.onImportCopyNodes;
    });

    $('.copy-dialog-button').rebind('click', function() {

        var section;

        if ($(this).attr('class').indexOf('active') === -1) {

            section = $(this).attr('class').split(" ")[1];
            selectCopyDialogTabRoot(section);

            if ((section === 'cloud-drive') || (section === 'folder-link')) {
                handleDialogContent(section, 'ul', true, 'copy', $.mcImport ? l[236] : "Paste" /*l[63]*/); // Import
            }
            else if (section === 'shared-with-me') {
                handleDialogContent(section, 'ul', false, 'copy', l[1344]); // Share
            }
            else if (section === 'conversations') {
                handleDialogContent(section, 'div', false, 'copy', l[1940], '.conversations-container'); // Send
            }
        }
    });

    /**
     * On click, copy dialog, dialog-sorting-menu will be shown.
     * Handles that valid informations about current sorting options
     * for selected tab of copy dialog are up to date.
     */
    $('.copy-dialog-panel-arrows').rebind('click', function() {

        var $self = $(this),
            $copyDialog = $('.copy-dialog'),
            type, menu, key;

        if ($self.attr('class').indexOf('active') === -1) {

            menu = $('.dialog-sorting-menu').removeClass('hidden');
            type = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(' ')[1];

            // Enable all menu items
            if (type === 'contacts') {
                menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
            }

            // Hide sort by status and last-interaction items from menu
            else {
                menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
            }

            // @ToDo: Make sure .by is hadeled properly once when we have chat available

            // Copy dialog key only
            key = 'Copy' + type;

            // Check existance of previous sort options, direction (dir)
            if (localStorage['sort' + key + 'Dir']) {
                $.sortTreePanel[key].dir = localStorage['sort' + key + 'Dir'];
            }
            else {
                $.sortTreePanel[key].dir = 1;
            }

            // Check existance of previous sort option, ascending/descending (By)
            if (localStorage['sort' + key + 'By']) {
                $.sortTreePanel[key].by = localStorage['sort' + key + 'By'];
            }
            else {
                $.sortTreePanel[key].by = 'name';
            }

            // dir stands for direction i.e. [ascending, descending]
            $copyDialog.find('.dialog-sorting-menu .sorting-menu-item')
                .removeClass('active')
                .filter('*[data-by=' + $.sortTreePanel[key].by + '],*[data-dir=' + $.sortTreePanel[key].dir + ']')
                .addClass('active');

            $self.addClass('active');
            $copyDialog.find('.dialog-sorting-menu').removeClass('hidden');
        }
        else {
            $self.removeClass('active');
            $copyDialog.find('.dialog-sorting-menu').addClass('hidden');
        }
    });

    $('.copy-dialog .sorting-menu-item').rebind('click', function() {

        var $self = $(this),
            data, type, key;

        if ($self.attr('class').indexOf('active') === -1) {

            // Arbitrary element data
            data = $self.data();
            type = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(' ')[1];
            key = 'Copy' + type;

            // Check arbitrary data associated with current menu item
            if (data.dir) {
                localStorage['sort' + key + 'Dir'] = $.sortTreePanel[key].dir = data.dir;
            }
            if (data.by) {
                localStorage['sort' + key + 'By'] = $.sortTreePanel[key].by = data.by;
            }

            if ((type === 'cloud-drive') || (type === 'folder-link')) {
                M.buildtree(M.d[M.RootID], 'copy-dialog');
            }
            else if (type === 'shared-with-me') {
                M.buildtree({ h: 'shares' }, 'copy-dialog');
                disableReadOnlySharedFolders('copy');
            }
            else if (type === 'conversations') {
                //@ToDo: make this working when chat start functioning
            }

            // Disable previously selected
            $self.parent().find('.sorting-menu-item').removeClass('active');
            $self.addClass('active');
        }

        // Hide menu
        $('.copy-dialog .dialog-sorting-menu').addClass('hidden');
        $('.copy-dialog-panel-arrows.active').removeClass('active');
    });

    $('.copy-dialog .dialog-newfolder-button').rebind('click', function() {

        $('.copy-dialog').addClass('arrange-to-back');
        var dest = $(this).parents('.fm-dialog').find('.active .nw-fm-tree-item.selected');
        if (dest.length) {
            $.cftarget = dest.attr('id').replace(/[^_]+_/, '');
        } else {
            /* No folder is selected, "New Folder" must create a new folder in Root */
            $.cftarget = M.RootID;
        }
        createFolderDialog();

        $('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
    });

    $('.copy-dialog').off('click', '.nw-fm-tree-item');
    $('.copy-dialog').on('click', '.nw-fm-tree-item', function(e) {

        var old = $.mcselected;

        $.mcselected = $(this).attr('id').replace('mctreea_', '');
        M.buildtree(M.d[$.mcselected]);

        var html = $('#treesub_' + $.mcselected).html();
        if (html) {
            $('#mctreesub_' + $.mcselected).html(html.replace(/treea_/ig, 'mctreea_').replace(/treesub_/ig, 'mctreesub_').replace(/treeli_/ig, 'mctreeli_'));
        }

        disableReadOnlySharedFolders('copy');

        var $btn = $('.dialog-copy-button');
        var c = $(e.target).attr('class');

        // Sub-folder exist?
        if (c && c.indexOf('nw-fm-arrow-icon') > -1) {

            var c = $(this).attr('class');

            // Sub-folder expanded
            if (c && c.indexOf('expanded') > -1) {
                $(this).removeClass('expanded');
                $('#mctreesub_' + $.mcselected).removeClass('opened');
            }
            else {
                $(this).addClass('expanded');
                $('#mctreesub_' + $.mcselected).addClass('opened');
            }
        }
        else {

            var c = $(this).attr('class');

            if (c && c.indexOf('selected') > -1) {
                if (c && c.indexOf('expanded') > -1) {
                    $(this).removeClass('expanded');
                    $('#mctreesub_' + $.mcselected).removeClass('opened');
                }
                else {
                    $(this).addClass('expanded');
                    $('#mctreesub_' + $.mcselected).addClass('opened');
                }
            }
        }

        if (!$(this).is('.disabled')) {

            // unselect previously selected item
            $('.copy-dialog .nw-fm-tree-item').removeClass('selected');
            $(this).addClass('selected');
            $btn.removeClass('disabled');
        }
        else {
            $.mcselected = old;
        }

        // dialogScroll('.copy-dialog-tree-panel .dialog-tree-panel-scroll');
        dialogScroll('.dialog-tree-panel-scroll');

        // Disable action button if there is no selected items
        if (typeof $.mcselected == 'undefined') {
            $btn.addClass('disabled');
        }
    });

    $('.copy-dialog .shared-with-me').off('mouseenter', '.nw-fm-tree-item');
    $('.copy-dialog .shared-with-me').on('mouseenter', '.nw-fm-tree-item', function() {

        var $item = $(this).find('.nw-fm-tree-folder');
        var itemLeftPos = $item.offset().left;
        var itemTopPos = $item.offset().top;
        var $tooltip = $('.copy-dialog .contact-preview');
        var sharedNodeHandle = $(this).attr('id').replace('mctreea_', '');
        var ownerHandle = M.d[sharedNodeHandle].u;
        var ownerEmail = M.u[ownerHandle].m;
        var ownerName = M.u[ownerHandle].name;

        // Not allowing undefined to be shown like owner name
        if (typeof ownerName === 'undefined') {
            ownerName = '';
        }

        var html = useravatar.contact(ownerHandle, 'small-rounded-avatar', 'div') +
            '<div class="user-card-data no-status">' +
                '<div class="user-card-name small">' + htmlentities(ownerName) +
                    ' <span class="grey">(' + l[8664] + ')</span></div>' +
                '<div class="user-card-email small">' + htmlentities(ownerEmail) +
                '</div></div>';

        $tooltip.find('.contacts-info.body').safeHTML(html);

        copyDialogTooltipTimer = setTimeout(function () {
            $tooltip.css({
                'left': itemLeftPos + (($item.outerWidth() / 2) - ($tooltip.outerWidth() / 2))  + 'px',
                'top': (itemTopPos - 63) + 'px'
            });
            $tooltip.fadeIn(200);
        }, 200);
    });

    $('.copy-dialog .shared-with-me').off('mouseleave', '.nw-fm-tree-item');
    $('.copy-dialog .shared-with-me').on('mouseleave', '.nw-fm-tree-item', function() {

        var $tooltip = $('.copy-dialog .contact-preview');

        clearTimeout(copyDialogTooltipTimer);
        $tooltip.hide();
    });

    // Handle conversations tab item selection
    $('.copy-dialog').off('click', '.nw-conversations-item');
    $('.copy-dialog').on('click', '.nw-conversations-item', function() {

        $.mcselected = $(this).attr('id').replace('contact2_', '');
        var $btn = $('.dialog-copy-button');

        // unselect previously selected item
        $('.copy-dialog .nw-conversations-item').removeClass('selected');
        $(this).addClass('selected');
        $btn.removeClass('disabled');

        // Disable action button if there is no selected items
        if (typeof $.mcselected == 'undefined') {
            $btn.addClass('disabled');
        }
    });

    $('.copy-dialog .dialog-copy-button').rebind('click', function() {

        if (typeof $.mcselected != 'undefined') {

            // Get active tab
            var section = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(" ")[1];
            switch (section) {
                case 'cloud-drive':
                case 'folder-link':
                    var n = [];
                    for (var i in $.selected) {
                        if (!isCircular($.selected[i], $.mcselected)) {
                            n.push($.selected[i]);
                        }
                    }
                    closeDialog();

                    // If copying from contacts tab (Ie, sharing)
                    if ($(this).text().trim() === l[1344]) {
                        var user = {
                            u: M.currentdirid,
                        };
                        var $sp = $('.fm-dialog.copy-dialog .share-dialog-permissions');
                        if ($sp.hasClass('read-and-write')) {
                            user.r = 1;
                        }
                        else if ($sp.hasClass('full-access')) {
                            user.r = 2;
                        }
                        else {
                            user.r = 0;
                        }
                        doShare($.mcselected, [user], true);
                    }
                    else {
                        M.copyNodes(n, $.mcselected);
                    }
                    delete $.onImportCopyNodes;
                    break;
                case 'shared-with-me':
                    var n = [];
                    for (var i in $.selected) {
                        if (!isCircular($.selected[i], $.mcselected)) {
                            n.push($.selected[i]);
                        }
                    }
                    closeDialog();
                    M.copyNodes(n, $.mcselected);
                    break;
                case 'conversations':
                    var $selectedConv = $('.copy-dialog .nw-conversations-item.selected');
                    closeDialog();
                    megaChat.chats[$selectedConv.attr('data-room-jid') + "@conference." + megaChat.options.xmppDomain].attachNodes($.selected);
                    break;
                default:
                    break;
            }
        }
    });
}

function moveDialog() {

    var moveDialogTooltipTimer;

    // Clears already selected sub-folders, and set selection to root
    function selectMoveDialogTabRoot(section) {

        var $btn = $('.dialog-move-button'), timer;

        $('.move-dialog .nw-fm-tree-item').removeClass('selected');

        if ((section === 'cloud-drive') || (section === 'folder-link')) {
            $.mcselected = M.RootID;
        }
        else if (section === 'rubbish-bin') {
            $.mcselected = M.RubbishID;
        }
        else {
            $.mcselected = undefined;
        }

        // Disable/enable button
        if ($.mcselected) {
            $btn.removeClass('disabled');
        }
        else {
            $btn.addClass('disabled');
        }
    };

    $('.move-dialog .fm-dialog-close, .move-dialog .dialog-cancel-button').rebind('click', function() {
        closeDialog();
    });

    $('.move-dialog-button').rebind('click', function(e) {

        var section;

        if ($(this).attr('class').indexOf('active') === -1) {

            section = $(this).attr('class').split(" ")[1];
            selectMoveDialogTabRoot(section);

            if ((section === 'cloud-drive') || (section === 'folder-link')) {
                    handleDialogContent(section, 'ul', true, 'move', l[62]); // Move
            }
            else if (section === 'shared-with-me') {
                handleDialogContent(section, 'ul', false, 'move', l[1344]); // Share
            }
            else if (section === 'rubbish-bin') {
                handleDialogContent(section, 'ul', false, 'move', l[62]); // Move
            }
        }
    });

    $('.move-dialog-panel-arrows').rebind('click', function() {

        var $self = $(this),
            $moveDialog = $('.move-dialog'),
            menu, type, key;

        if ($self.attr('class').indexOf('active') === -1) {

            menu = $('.dialog-sorting-menu').removeClass('hidden'),
            type = $('.fm-dialog-title .move-dialog-txt.active').attr('class').split(' ')[1];

            // Enable all menu items
            menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');

            // Hide sort by status and last-interaction items from menu
            menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');

            // Move dialog key only
            key = 'Move' + type;

            // Check existance of previous sort options, direction (dir)
            if (localStorage['sort' + key + 'Dir']) {
                $.sortTreePanel[key].dir = localStorage['sort' + key + 'Dir'];
            }
            else {
                $.sortTreePanel[key].dir = 1;
            }

            // Check existance of previous sort option, ascending/descending (By)
            if (localStorage['sort' + key + 'By']) {
                $.sortTreePanel[key].by = localStorage['sort' + key + 'By'];
            }
            else {
                $.sortTreePanel[key].by = 'name';
            }

            $moveDialog.find('.dialog-sorting-menu .sorting-menu-item')
                .removeClass('active')
                .filter('*[data-by=' + $.sortTreePanel[key].by + '],*[data-dir=' + $.sortTreePanel[key].dir + ']')
                .addClass('active');

            $self.addClass('active');
            $moveDialog.find('.dialog-sorting-menu').removeClass('hidden');
        }
        else {
            $self.removeClass('active');
            $moveDialog.find('.dialog-sorting-menu').addClass('hidden');
        }
    });

    /**
     * Click on sort menu item
     */
    $('.move-dialog .sorting-menu-item').rebind('click', function() {

        var $self = $(this),
            type, data, key;

        if ($self.attr('class').indexOf('active') === -1) {

            // Arbitrary element data
            data = $self.data();
            type = $('.fm-dialog-title .move-dialog-txt.active').attr('class').split(' ')[1];
            key = 'Move' + type;

            // Check arbitrary data associated with current menu item
            if (data.dir) {
                localStorage['sort' + key + 'Dir'] = $.sortTreePanel[key].dir = data.dir;
            }
            if (data.by) {
                localStorage['sort' + key + 'By'] = $.sortTreePanel[key].by = data.by;
            }

            if ((type === 'cloud-drive') || (type === 'folder-link')) {
                M.buildtree(M.d[M.RootID], 'move-dialog');
                disableCircularTargets('#mctreea_');
            }
            else if (type === 'shared-with-me') {
                M.buildtree({ h: 'shares' }, 'move-dialog');
                disableReadOnlySharedFolders('move');
            }
            else if (type === 'rubbish-bin') {
                M.buildtree({ h: M.RubbishID }, 'move-dialog');
            }

            $self.parent().find('.sorting-menu-item').removeClass('active');
            $self.addClass('active');
        }

        $('.move-dialog .dialog-sorting-menu').addClass('hidden');
        $('.move-dialog-panel-arrows.active').removeClass('active');
    });

    /**
     * Create new foler button clicket inside move-dialog
     */
    $('.move-dialog .dialog-newfolder-button').rebind('click', function() {

        $('.move-dialog').addClass('arrange-to-back');
        createFolderDialog();

        $('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
    });

    $('.move-dialog').off('click', '.nw-fm-tree-item');
    $('.move-dialog').on('click', '.nw-fm-tree-item', function(e) {

        var old = $.mcselected;

        $.mcselected = $(this).attr('id').replace('mctreea_', '');
        M.buildtree(M.d[$.mcselected]);

        var html = $('#treesub_' + $.mcselected).html();
        if (html) {
            $('#mctreesub_' + $.mcselected).html(html.replace(/treea_/ig, 'mctreea_').replace(/treesub_/ig, 'mctreesub_').replace(/treeli_/ig, 'mctreeli_'));
        }

        disableCircularTargets('#mctreea_');

        var $btn = $('.dialog-move-button'),
            c = $(e.target).attr('class');

        // Sub-folder exist?
        if (c && c.indexOf('nw-fm-arrow-icon') > -1) {

            var c = $(this).attr('class');

            // Sub-folder expanded
            if (c && c.indexOf('expanded') > -1) {
                $(this).removeClass('expanded');
                $('#mctreesub_' + $.mcselected).removeClass('opened');
            }
            else {
                $(this).addClass('expanded');
                $('#mctreesub_' + $.mcselected).addClass('opened');
            }
        }
        else {

            var c = $(this).attr('class');
            if (c && c.indexOf('selected') > -1) {
                if (c && c.indexOf('expanded') > -1) {
                    $(this).removeClass('expanded');
                    $('#mctreesub_' + $.mcselected).removeClass('opened');
                }
                else {
                    $(this).addClass('expanded');
                    $('#mctreesub_' + $.mcselected).addClass('opened');
                }
            }
        }
        if (!$(this).is('.disabled')) {

            // unselect previously selected item
            $('.move-dialog .nw-fm-tree-item').removeClass('selected');
            $(this).addClass('selected');
            $btn.removeClass('disabled');
        }
        else {
            $.mcselected = old;
        }

        // dialogScroll('.move-dialog-tree-panel .dialog-tree-panel-scroll');
        dialogScroll('.dialog-tree-panel-scroll');

        // Disable action button if there is no selected items
        if (typeof $.mcselected == 'undefined') {
            $btn.addClass('disabled');
        }
    });

    $('.move-dialog .shared-with-me').off('mouseenter', '.nw-fm-tree-item');
    $('.move-dialog .shared-with-me').on('mouseenter', '.nw-fm-tree-item', function() {

        var $item = $(this).find('.nw-fm-tree-folder');
        var itemLeftPos = $item.offset().left;
        var itemTopPos = $item.offset().top;
        var $tooltip = $('.move-dialog .contact-preview');
        var sharedNodeHandle = $(this).attr('id').replace('mctreea_', '');
        var ownerHandle = M.d[sharedNodeHandle].u;
        var ownerEmail = M.u[ownerHandle].m;
        var ownerName = M.u[ownerHandle].name;

        // Not allowing undefined to be shown like owner name
        if (typeof ownerName === 'undefined') {
            ownerName = '';
        }

        var html = useravatar.contact(ownerHandle, 'small-rounded-avatar', 'div') +
            '<div class="user-card-data no-status">' +
                '<div class="user-card-name small">' + htmlentities(ownerName) +
                    ' <span class="grey">(' + l[8664] + ')</span></div>' +
                '<div class="user-card-email small">' + htmlentities(ownerEmail) +
                '</div></div>';

        $tooltip.find('.contacts-info.body').safeHTML(html);

        moveDialogTooltipTimer = setTimeout(function () {
            $tooltip.css({
                'left': itemLeftPos + (($item.outerWidth() / 2) - ($tooltip.outerWidth() / 2))  + 'px',
                'top': (itemTopPos - 63) + 'px'
            });
            $tooltip.fadeIn(200);
        }, 200);
    });

    $('.move-dialog .shared-with-me').off('mouseleave', '.nw-fm-tree-item');
    $('.move-dialog .shared-with-me').on('mouseleave', '.nw-fm-tree-item', function() {

        var $tooltip = $('.move-dialog .contact-preview');

        clearTimeout(moveDialogTooltipTimer);
        $tooltip.hide();
    });

    $('.move-dialog .dialog-move-button').rebind('click', function() {

        if (typeof $.mcselected != 'undefined') {

            var n = [];
            for (var i in $.selected) {
                if (!isCircular($.selected[i], $.mcselected)) {
                    n.push($.selected[i]);
                }
            }
            closeDialog();
            if (RootbyId($.mcselected) === 'shares') {
                M.copyNodes(n, $.mcselected, true);
            }
            else {
                M.moveNodes(n, $.mcselected);
            }
        }
    });
}

/**
 * Show toast notification
 * @param {String} toastClass Custom style for the notification
 * @param {String} notification The text for the toast notification
 */
function showToast(toastClass, notification, buttonLabel) {

    var $toast, timeout;

    $toast = $('.toast-notification.common-toast');
    $toast.attr('class', 'toast-notification common-toast ' + toastClass)
        .find('.toast-col:first-child span').safeHTML(notification);

    $toast.removeClass('hidden').addClass('visible');

    timeout = setTimeout(function() {
        hideToast();
    }, 7000);

    var closeSelector = '.toast-close-button';
    if (buttonLabel) {
        $('.common-toast .toast-button').safeHTML(buttonLabel);
    }
    else {
        closeSelector += ', .common-toast .toast-button';
        $('.common-toast .toast-button').safeHTML(l[726]);
    }

    $(closeSelector)
        .rebind('click', function() {
            $('.toast-notification').removeClass('visible');
            clearTimeout(timeout);
        });

    $toast.rebind('mouseover', function() {
        clearTimeout(timeout);
    });

    $toast.rebind('mouseout', function() {
        timeout = setTimeout(function() {
            hideToast();
        }, 7000);
    });
}

function hideToast () {
    $('.toast-notification.common-toast').removeClass('visible');
}

function refreshDialogContent() {
    // Refresh dialog content with newly created directory
    var b = $('.content-panel.cloud-drive').html();
    if ($.copyDialog) {
        handleDialogTabContent('cloud-drive', 'ul', 'copy', b);
    }
    else if ($.moveDialog) {
        handleDialogTabContent('cloud-drive', 'ul', 'move', b);
    }
}

function createFolderDialog(close)
{
    $.dialog = 'createfolder';
    if (close) {
        $.dialog = false;
        if ($.cftarget) {
            delete $.cftarget;
        }
        if (!($.copyDialog || $.moveDialog)) {
            fm_hideoverlay();
        }
        $('.fm-dialog').removeClass('arrange-to-back');
        $('.fm-dialog.create-folder-dialog').addClass('hidden');

        return true;
    }

    $('.create-folder-dialog input').unbind('focus');
    $('.create-folder-dialog input').bind('focus', function() {
        if ($(this).val() == l[157]) {
            $('.create-folder-dialog input').val('');
        }
        $('.create-folder-dialog').addClass('focused');
    });

    $('.create-folder-dialog input').unbind('blur');
    $('.create-folder-dialog input').bind('blur', function() {
        if ($('.create-folder-dialog input').val() == '') {
            $('.create-folder-dialog input').val(l[157]);
        }
        $('.create-folder-dialog').removeClass('focused');
    });

    $('.create-folder-dialog input').unbind('keyup');
    $('.create-folder-dialog input').bind('keyup', function() {
        if ($('.create-folder-dialog input').val() === '' || $('.create-folder-dialog input').val() === l[157]) {
            $('.create-folder-dialog').removeClass('active');
        }
        else {
            $('.create-folder-dialog').addClass('active');
        }
    });

    $('.create-folder-dialog input').unbind('keypress');
    $('.create-folder-dialog input').bind('keypress', function(e) {

        if (e.which === 13 && $(this).val() !== '') {
            if (!$.cftarget) {
                $.cftarget = M.currentdirid;
            }
            createFolder($.cftarget, $(this).val());
            createFolderDialog(1);
        }
    });

    $('.create-folder-dialog .fm-dialog-close, .create-folder-button-cancel.dialog').rebind('click', function() {
        createFolderDialog(1);
        $('.fm-dialog').removeClass('arrange-to-back');
        $('.create-folder-dialog input').val(l[157]);
    });

    $('.fm-dialog-input-clear').rebind('click', function() {
        $('.create-folder-dialog input').val('');
        $('.create-folder-dialog').removeClass('active');
    });

    $('.fm-dialog-new-folder-button').rebind('click', function() {

        var v = $('.create-folder-dialog input').val();

        if (v === '' || v === l[157]) {
            alert(l[1024]);
        }
        else {
            if (!$.cftarget) {
                $.cftarget = M.currentdirid;
            }
            createFolder($.cftarget, v);
            createFolderDialog(1);
        }
    });

    fm_showoverlay();

    $('.fm-dialog.create-folder-dialog').removeClass('hidden');
    $('.create-folder-input-bl input').focus();
    $('.create-folder-dialog').removeClass('active');
}

function chromeDialog(close)
{
    if (close)
    {
        $.dialog = false;
        fm_hideoverlay();
        $('.fm-dialog.chrome-dialog').addClass('hidden');
        return true;
    }
    fm_showoverlay();
    $('.fm-dialog.chrome-dialog').removeClass('hidden');
    $.dialog = 'chrome';
    $('.chrome-dialog .browsers-button,.chrome-dialog .fm-dialog-close').unbind('click')
    $('.chrome-dialog .browsers-button,.chrome-dialog .fm-dialog-close').bind('click', function()
    {
        chromeDialog(1);
    });
    $('#chrome-checkbox').unbind('click');
    $('#chrome-checkbox').bind('click', function()
    {
        if ($(this).attr('class').indexOf('checkboxOn') == -1)
        {
            localStorage.chromeDialog = 1;
            $(this).attr('class', 'checkboxOn');
            $(this).parent().attr('class', 'checkboxOn');
            $(this).attr('checked', true);
        }
        else
        {
            delete localStorage.chromeDialog;
            $(this).attr('class', 'checkboxOff');
            $(this).parent().attr('class', 'checkboxOff');
            $(this).attr('checked', false);
        }
    });
}

/**
 * Open a dialog asking the user to download MEGAsync for files over 1GB
 */
function megaSyncDialog() {

    // Cache selector
    var $dialog = $('.fm-dialog.download-megasync-dialog');

    // Show the dialog and overlay
    $dialog.removeClass('hidden');
    fm_showoverlay();

    // Add close button handler
    $dialog.find('.fm-dialog-close, .close-button').rebind('click', function() {
        $dialog.addClass('hidden');
        fm_hideoverlay();
    });

    // Add checkbox handling
    $dialog.find('#megasync-checkbox').rebind('click', function() {

        var $this = $(this);

        // If it has not been checked, check it
        if (!$this.hasClass('checkboxOn')) {

            // Store a flag so that it won't show this dialog again if triggered
            localStorage.megaSyncDialog = 1;
            $this.attr('class', 'checkboxOn');
            $this.parent().attr('class', 'checkboxOn');
            $this.attr('checked', true);
        }
        else {
            // Otherwise uncheck it
            delete localStorage.megaSyncDialog;
            $this.attr('class', 'checkboxOff');
            $this.parent().attr('class', 'checkboxOff');
            $this.attr('checked', false);
        }
    });
};

function firefoxDialog(close)
{
    if (close)
    {
        $.dialog = false;
        fm_hideoverlay();
        $('.fm-dialog.firefox-dialog').addClass('hidden');
        return true;
    }

    if (page == 'download')
        $('.ff-extension-txt').text(l[1932]);
    else
        $('.ff-extension-txt').text(l[1174]);

    fm_showoverlay();
    $('.fm-dialog.firefox-dialog').removeClass('hidden');
    $.dialog = 'firefox';

    $('.firefox-dialog .browsers-button,.firefox-dialog .fm-dialog-close,.firefox-dialog .close-button').rebind('click', function()
    {
        firefoxDialog(1);
    });

    $('#firefox-checkbox').rebind('click', function()
    {
        if ($(this).hasClass('checkboxOn') === false)
        {
            localStorage.firefoxDialog = 1;
            $(this).removeClass('checkboxOff').addClass('checkboxOn');
            $(this).parent().removeClass('checkboxOff').addClass('checkboxOn');
            $(this).attr('checked', true);
        }
        else
        {
            delete localStorage.firefoxDialog;
            $(this).removeClass('checkboxOn').addClass('checkboxOff');
            $(this).parent().removeClass('checkboxOn').addClass('checkboxOff');
            $(this).attr('checked', false);
        }
    });
}

function browserDialog(close) {
    if (close) {
        $.dialog = false;
        fm_hideoverlay();
        $('.fm-dialog.browsers-dialog').addClass('hidden');
        return true;
    }
    $.browserDialog = 1;
    $.dialog = 'browser';
    fm_showoverlay();
    $('.fm-dialog.browsers-dialog').removeClass('hidden');

    $('.browsers-dialog .browsers-button,.browsers-dialog .fm-dialog-close').rebind('click', function() {
        browserDialog(1);
    });

    $('#browsers-checkbox').unbind('click');
    $('#browsers-checkbox').bind('click', function() {
        if ($(this).attr('class').indexOf('checkboxOn') == -1) {
            localStorage.browserDialog = 1;
            $(this).attr('class', 'checkboxOn');
            $(this).parent().attr('class', 'checkboxOn');
            $(this).attr('checked', true);
        }
        else {
            delete localStorage.chromeDialog;
            $(this).attr('class', 'checkboxOff');
            $(this).parent().attr('class', 'checkboxOff');
            $(this).attr('checked', false);
        }
    });

    $('.browsers-top-icon').removeClass('ie9 ie10 safari');
    var bc, bh, bt;
    var type = browserDialog.isWeak();
    if (type && type.ie11)
    {
        if (page !== 'download' && ('' + page).split('/').shift() !== 'fm')
        {
            browserDialog(1);
            return false;
        }
        // IE11
        bc = 'ie10';
        bh = l[884].replace('[X]', type.edge ? 'Edge' : 'IE 11');
        // if (page == 'download') bt = l[1933];
        // else bt = l[886];
        bt = l[1933];
    }
    else if (type && type.ie10)
    {
        bc = 'ie10';
        bh = l[884].replace('[X]', 'Internet Explorer 10');
        if (page == 'download')
            bt = l[1933];
        else
            bt = l[886];
    }
    else if (type && type.safari)
    {
        bc = 'safari';
        bh = l[884].replace('[X]', 'Safari');
        if (page == 'download')
            bt = l[1933];
        else
            bt = l[887].replace('[X]', 'Safari');
    }
    else
    {
        bc = 'safari';
        bh = l[884].replace('[X]', l[885]);
        bt = l[887].replace('[X]', 'Your browser');
    }
    $('.browsers-top-icon').addClass(bc);
    $('.browsers-info-block p').text(bt);
    $('.browsers-info-header').text(bh);
    $('.browsers-info-header').text(bh);
    $('.browsers-info-header p').text(bt);
}

browserDialog.isWeak = function() {
    var result = {};
    var ua = String(navigator.userAgent);
    var style = document.documentElement.style;

    result.ie10 = (ua.indexOf('MSIE 10') > -1);
    result.ie11 = ('-ms-scroll-limit' in style) && ('-ms-ime-align' in style);
    result.edge = /\sEdge\/\d/.test(ua);
    result.safari = (ua.indexOf('Safari') > -1) && (ua.indexOf('Chrome') === -1);

    result.weak = result.edge || result.ie11 || result.ie10 || result.safari;

    return result.weak && result;
};

/* jshint -W074 */
function propertiesDialog(close) {

    /*
    * fillPropertiesContactList, Handles node properties/info dialog contact list content
    *
    * @param {Object} shares Node related shares
    * @param {Object} pendingShares Node related pending shares
    * @param {Number} totalSharesNum
    */
    var fillPropertiesContactList = function(shares, pendingShares, totalSharesNum) {

        var DEFAULT_CONTACTS_NUMBER = 5;
        var counter = 0;
        var tmpStatus = '';
        var onlinestatus = '';
        var user;
        var hiddenClass = '';
        var $shareUsers = pd.find('.properties-body .properties-context-menu')
                        .empty()
                        .append('<div class="properties-context-arrow"></div>');
        var shareUsersHtml = '';

        // Add contacts with full contact relation
        for (var userId in shares) {
            if (shares.hasOwnProperty(userId)) {

                if (++counter <= DEFAULT_CONTACTS_NUMBER) {
                    hiddenClass = '';
                }
                else {
                    hiddenClass = 'hidden';
                }

                if (M.u[userId]) {
                    user = M.u[userId];
                    tmpStatus = megaChatIsReady && megaChat.karere.getPresence(megaChat.getJidFromNodeId(user.u));
                    onlinestatus = M.onlineStatusClass(tmpStatus);
                    shareUsersHtml += '<div class="properties-context-item '
                        + onlinestatus[1] + ' ' +  hiddenClass + '">'
                        + '<div class="properties-contact-status"></div>'
                        + '<span>' + htmlentities(user.name || user.m) + '</span>'
                        + '</div>';
                }
            }
        }

        // Add outgoing pending contacts for node handle [n.h]
        for (userId in pendingShares) {
            if (pendingShares.hasOwnProperty(userId)) {

                if (++counter <= DEFAULT_CONTACTS_NUMBER) {
                    hiddenClass = '';
                }
                else {
                    hiddenClass = 'hidden';
                }

                if (M.opc[userId]) {
                    user = M.opc[userId];
                    shareUsersHtml += '<div class="properties-context-item offline ' + hiddenClass + '">'
                        + '<div class="properties-contact-status"></div>'
                        + '<span>' + htmlentities(user.m) + '</span>'
                        + '</div>';
                }
            }
        }

        var hiddenNum = totalSharesNum - DEFAULT_CONTACTS_NUMBER;
        var repStr = l[10663];// '... and [X] more';

        if (hiddenNum > 0) {
            shareUsersHtml += '<div class="properties-context-item show-more">'
                + '<span>...' + repStr.replace('[X]', hiddenNum) + '</span>'
                + '</div>';
        }

        if (shareUsersHtml !== '') {
            $shareUsers.append(shareUsersHtml);
        }
    };// END of fillPropertiesContactList function

    var pd = $('.fm-dialog.properties-dialog');
    var c = $('.properties-elements-counter span');

    $(document).unbind('MegaNodeRename.Properties');
    $(document).unbind('MegaCloseDialog.Properties');

    if (close) {
        $.dialog = false;
        delete $.propertiesDialog;
        fm_hideoverlay();
        pd.addClass('hidden');
        $('.contact-list-icon').removeClass('active');
        $('.properties-context-menu').fadeOut(200);
        $.hideContextMenu();

        return true;
    }

    $.propertiesDialog = $.dialog = 'properties';
    fm_showoverlay();

    pd.removeClass('hidden multiple folders-only two-elements shared shared-with-me');
    pd.removeClass('read-only read-and-write full-access taken-down');

    var exportLink = new mega.Share.ExportLink({});
    var isTakenDown = exportLink.isTakenDown($.selected);
    var isUndecrypted = missingkeys[$.selected];
    var notificationText = '';

    if (isTakenDown || isUndecrypted) {
        if (isTakenDown) {
            pd.addClass('taken-down');
            notificationText  = l[7703] + '\n';
        }
        if (isUndecrypted) {
            pd.addClass('undecryptable');

            if (M.d[$.selected].t) {// folder
                notificationText  += l[8595];
            }
            else {// file
                notificationText  += l[8602];
            }
        }
        showToast('clipboard', notificationText);
    }

    $('.properties-elements-counter span').text('');
    $('.fm-dialog.properties-dialog .properties-body').rebind('click', function() {

        // Clicking anywhere in the dialog will close the context-menu, if open
        var e = $('.fm-dialog.properties-dialog .file-settings-icon');
        if (e.hasClass('active'))
            e.click();
    });

    $('.fm-dialog.properties-dialog .fm-dialog-close').rebind('click', function() {
        propertiesDialog(1);
    });

    var filecnt = 0, foldercnt = 0, size = 0, sfilecnt = 0, sfoldercnt = 0, n;

    for (var i in $.selected) {
        if ($.selected.hasOwnProperty(i)) {
            n = M.d[$.selected[i]];
            if (!n) {
                console.error('propertiesDialog: invalid node', $.selected[i]);
            }
            else if (n.t) {
                var nodes = fm_getnodes(n.h);
                for (i in nodes) {
                    if (M.d[nodes[i]] && !M.d[nodes[i]].t) {
                        size += M.d[nodes[i]].s;
                        sfilecnt++;
                    }
                    else {
                        sfoldercnt++;
                    }
                }
                foldercnt++;
            }
            else {
                filecnt++;
                size += n.s;
            }
        }
    }
    if (!n) {
        // $.selected had no valid nodes!
        return propertiesDialog(1);
    }

    var star = '';
    if (n.fav)
        star = ' star';
    pd.find('.file-status-icon').attr('class', 'file-status-icon ' + star)

    if (fileIcon(n).indexOf('shared') > -1) {
        pd.addClass('shared');
    }

    if (typeof n.r === "number") {
        var cs = M.contactstatus(n.h);
        var zclass = "read-only";

        if (n.r === 1) {
            zclass = "read-and-write";
        }
        else if (n.r === 2) {
            zclass = "full-access";
        }
        pd.addClass('shared shared-with-me ' + zclass);
    }

    var p = {}, user = Object(M.d[n.su || n.p]);

    if (d) {
        console.log('propertiesDialog', n, user);
    }

    if ((filecnt + foldercnt) === 1) {
        p.t6 = '';
        p.t7 = '';

        if (filecnt) {
            p.t3 = l[87] + ':';
            p.t5 = ' second';

            if (n.mtime) {
                p.t6 = l[94] + ':';
                p.t7 = htmlentities(time2date(n.mtime));
            }
        }
        else {
            p.t3 = l[894] + ':';
            p.t5 = '';
        }
        p.t1 = l[86] + ':';
        if (n.name) {
            p.t2 = htmlentities(n.name);
        }
        else if (n.h === M.RootID) {
            p.t2 = htmlentities(l[164]);
        }
        else if (n.h === M.InboxID) {
            p.t2 = htmlentities(l[166]);
        }
        else if (n.h === M.RubbishID) {
            p.t2 = htmlentities(l[167]);
        }
        // 'Shared with me' tab, info dialog, undecrypted nodes
        else if (missingkeys[n.h]) {
            p.t2 = htmlentities(l[8649]);
        }

        p.t4 = bytesToSize(size);
        p.t9 = n.ts && htmlentities(time2date(n.ts)) || '';
        p.t8 = p.t9 ? (l[896] + ':') : '';
        p.t10 = '';
        p.t11 = '';

        if (foldercnt) {
            p.t6 = l[897] + ':';
            p.t7 = fm_contains(sfilecnt, sfoldercnt);
            if (pd.attr('class').indexOf('shared') > -1) {

                var fullSharesNum = Object.keys(n.shares || {}).length;
                var pendingSharesNum = Object.keys(M.ps[n.h] || {}).length;
                var totalSharesNum = fullSharesNum + pendingSharesNum;

                // In case that user doesn't share with other
                // Or in case that more then one node is selected
                // Do NOT show contact informations in property dialog
                if ((totalSharesNum === 0) || ($.selected.length > 1)) {
                    p.hideContacts = true;
                }
                else {
                    p.t8 = l[1036] + ':';
                    p.t9 = (totalSharesNum === 1) ? l[990] : l[989].replace("[X]", totalSharesNum);
                    p.t11 = n.ts ? htmlentities(time2date(n.ts)) : '';
                    p.t10 = p.t11 ? l[896] : '';
                    $('.properties-elements-counter span').text(typeof n.r === "number" ? '' : totalSharesNum);

                    fillPropertiesContactList(n.shares, M.ps[n.h], totalSharesNum);
                }
            }
            if (pd.attr('class').indexOf('shared-with-me') > -1) {
                p.t3 = l[64];
                var rights = l[55];
                if (n.r == 1) {
                    rights = l[56];
                } else if (n.r == 2) {
                    rights = l[57];
                }
                p.t4 = rights;
                p.t6 = l[5905];
                p.t7 = htmlentities(M.getNameByHandle(user.h));
                p.t8 = l[894] + ':';
                p.t9 = bytesToSize(size);
                p.t10 = l[897] + ':';
                p.t11 = fm_contains(sfilecnt, sfoldercnt);
            }
        }
    }
    else
    {
        pd.addClass('multiple folders-only');
        p.t1 = '';
        p.t2 = '<b>' + fm_contains(filecnt, foldercnt) + '</b>';
        p.t3 = l[894] + ':';
        p.t4 = bytesToSize(size);
        p.t5 = ' second';
        p.t8 = l[93] + ':';
        p.t9 = l[1025];
    }
    var html = '<div class="properties-small-gray">' + p.t1 + '</div>'
        +'<div class="properties-name-block"><div class="propreties-dark-txt">' + p.t2 + '</div>'
        +' <span class="file-settings-icon"><span></span></span></div>'
        +'<div><div class="properties-float-bl"><span class="properties-small-gray">' + p.t3 + '</span>'
        +'<span class="propreties-dark-txt">' + p.t4 + '</span></div>'
        +'<div class="properties-float-bl' + p.t5 + '"><span class="properties-small-gray">' + p.t6 + '</span>'
        +'<span class="propreties-dark-txt">' + p.t7 + '</span></div><div class="properties-float-bl">'
        +'<div class="properties-small-gray">' + p.t8 + '</div><div class="propreties-dark-txt contact-list">' + p.t9
        +'<div class="contact-list-icon"></div></div></div>'
        +'<div class="properties-float-bl"><div class="properties-small-gray t10">' + p.t10 + '</div>'
        +'<div class="propreties-dark-txt t11">' + p.t11 + '</div></div></div>';
    $('.properties-txt-pad').html(html);

    if (typeof p.t10 === 'undefined' && typeof p.t11 === 'undefined') {
        $('.properties-small-gray.t10').addClass('hidden');
        $('.propreties-dark-txt.t11').addClass('hidden');
    }

    pd.find('.file-settings-icon').rebind('click context', function(e) {
        if ($(this).attr('class').indexOf('active') == -1) {
            e.preventDefault();
            e.stopPropagation();
            $(this).addClass('active');
            $('.fm-dialog').addClass('arrange-to-front');
            $('.properties-dialog').addClass('arrange-to-back');
            $('.context-menu').addClass('arrange-to-front');
            e.currentTarget = $('#' + n.h)
            e.calculatePosition = true;
            $.selected = [n.h];
            contextMenuUI(e, n.h.length === 11 ? 5 : 1);
        } else {
            __fsi_close();
        }
    });
    $(document).bind('MegaNodeRename.Properties', function(e, h, name) {
        if (n.h === h) {
            pd.find('.properties-name-block .propreties-dark-txt').text(name);
        }
    });
    $(document).bind('MegaCloseDialog.Properties', __fsi_close);
    function __fsi_close() {
        pd.find('.file-settings-icon').removeClass('active');
        $('.context-menu').removeClass('arrange-to-front');
        $('.properties-dialog').removeClass('arrange-to-back');
        $('.fm-dialog').removeClass('arrange-to-front');
        $.hideContextMenu();
    }

    if (p.hideContacts) {
        $('.properties-txt-pad .contact-list-icon').hide();
    }

    if (pd.attr('class').indexOf('shared') > -1) {
        $('.contact-list-icon').rebind('click', function() {
            if ($(this).attr('class').indexOf('active') == -1) {
                $(this).addClass('active');
                $('.properties-context-menu').css({
                    'left': $(this).position().left + 8 + 'px',
                    'top': $(this).position().top - $('.properties-context-menu').outerHeight() - 8 + 'px',
                    'margin-left': '-' + $('.properties-context-menu').width() / 2 + 'px'
                });
                $('.properties-context-menu').fadeIn(200);
            } else {
                $(this).removeClass('active');
                $('.properties-context-menu').fadeOut(200);
            }

            return false;
        });

        $('.properties-dialog').rebind('click', function() {
            var $list = $('.contact-list-icon');
            if ($list.attr('class').indexOf('active') !== -1) {
                $list.removeClass('active');
                $('.properties-context-menu').fadeOut(200);
            }
        });

        // ToDo: Can we redirects to contacts page when user clicks?
        $('.properties-context-item').rebind('click', function(e) {
            $('.contact-list-icon').removeClass('active');
            $('.properties-context-menu').fadeOut(200);
        });

        // Expands properties-context-menu so rest of contacts can be shown
        // By default only 5 contacts is shown
        $('.properties-context-item.show-more').rebind('click', function() {

            // $('.properties-context-menu').fadeOut(200);
            $('.properties-dialog .properties-context-item')
                .remove('.show-more')
                .removeClass('hidden');// un-hide rest of contacts

            var $cli = $('.contact-list-icon');
            $('.properties-context-menu').css({
                'left': $cli.position().left + 8 + 'px',
                'top': $cli.position().top - $('.properties-context-menu').outerHeight() - 8 + 'px',
                'margin-left': '-' + $('.properties-context-menu').width() / 2 + 'px'
            });
            // $('.properties-context-menu').fadeIn(200);

            return false;// Prevent bubbling
        });
    }

    if ((filecnt + foldercnt) == 1)
        $('.properties-file-icon').html('<div class="' + fileIcon(n) + '"></div>');
    else
    {
        if ((filecnt + foldercnt) == 2)
            pd.addClass('two-elements');
        $('.properties-elements-counter span').text(filecnt + foldercnt);
        var a = 0;
        $('.properties-file-icon').html('');
        for (var i in $.selected)
        {
            var ico = fileIcon(M.d[$.selected[i]]);

            if (a <= 3)
            {
                if (ico.indexOf('folder') == -1)
                    pd.removeClass('folders-only');
                $('.properties-file-icon').prepend('<div class="' + ico + '"></div>');
                a++;
            }
        }
    }
}
/* jshint +W074 */

function termsDialog(close, pp)
{
    if (close)
    {
        $('.fm-dialog.terms-dialog').addClass('hidden');
        if (!$('.pro-register-dialog').is(":visible")) {
            fm_hideoverlay();
            $.dialog=false;
        }
        if ($.termsAgree) $.termsAgree=undefined;
        if ($.termsDeny) $.termsDeny=undefined;
        return false;
    }

    if (!pp)
        pp = 'terms';

    $.dialog = pp;

    if (!pages[pp])
    {
        loadingDialog.show();
        silent_loading = function()
        {
            loadingDialog.hide();
            termsDialog(false, $.dialog);
        };
        jsl.push(jsl2[pp]);
        jsl_start();
        return false;
    }

    fm_showoverlay();
    $('.fm-dialog.terms-dialog').removeClass('hidden');
    $('.fm-dialog.terms-dialog .terms-main').html(pages[pp].split('((TOP))')[1].split('((BOTTOM))')[0].replace('main-mid-pad new-bottom-pages', ''));

    $('.terms-body').jScrollPane({showArrows: true, arrowSize: 5, animateScroll: true, verticalDragMinHeight: 50});
    jScrollFade('.terms-body');

    $('.fm-terms-cancel').unbind('click');
    $('.fm-terms-cancel').bind('click', function(e)
    {
        if ($.termsDeny)
            $.termsDeny();
        termsDialog(1);
    });

    $('.fm-terms-agree').unbind('click');
    $('.fm-terms-agree').bind('click', function(e)
    {
        if ($.termsAgree)
            $.termsAgree();
        termsDialog(1);
    });

    $('.terms-dialog .fm-dialog-close').unbind('click');
    $('.terms-dialog .fm-dialog-close').bind('click', function(e)
    {
        if ($.termsDeny)
            $.termsDeny();
        termsDialog(1);
    });
}

var previews = {};
var preqs = {};
var pfails = {};
var slideshowid;

function slideshowsteps()
{
    var forward = [], backward = [], ii = [], ci;
    // Loop through available items and extract images
    for (var i in M.v) {
        if (is_image(M.v[i]))
        {
            // is currently previewed item
            if (M.v[i].h == slideshowid)
                ci = i;
            ii.push(i);
        }
    }

    var len = ii.length;
    // If there is at least 2 images
    if (len > 1)
    {
        var n = ii.indexOf(ci);
        switch (n)
        {
            // last
            case len - 1:
                forward.push(M.v[ii[0]].h);
                backward.push(M.v[ii[n - 1]].h);
                break;
            // first
            case 0:
                forward.push(M.v[ii[n + 1]].h);
                backward.push(M.v[ii[len - 1]].h);
            case -1:
                break;
            default:
                forward.push(M.v[ii[n + 1]].h);
                backward.push(M.v[ii[n - 1]].h);
        }
    }
    return {backward: backward, forward: forward};
}

function slideshow_next()
{
    var valid = true;
    $.each(dl_queue || [], function(id, file) {
        if (file.id == slideshowid) {
            valid = false;
            return false; /* break loop */
        }
    });
    if (!valid)
        return;
    var steps = slideshowsteps();
    if (steps.forward.length > 0)
        slideshow(steps.forward[0]);
}

function slideshow_prev()
{
    var valid = true;
    $.each(dl_queue || [], function(id, file) {
        if (file.id == slideshowid) {
            valid = false;
            return false; /* break loop */
        }
    });
    if (!valid)
        return;
    var steps = slideshowsteps();
    if (steps.backward.length > 0)
        slideshow(steps.backward[steps.backward.length - 1]);
}

function slideshow(id, close)
{
    if (d)
        console.log('slideshow', id, close, slideshowid);

    if (close)
    {
        slideshowid = false;
        $('.slideshow-dialog').addClass('hidden');
        $('.slideshow-overlay').addClass('hidden');
        for (var i in dl_queue)
        {
            if (dl_queue[i] && dl_queue[i].id == id)
            {
                if (dl_queue[i].preview)
                {
                    dlmanager.abort(dl_queue[i]);
                }
                break;
            }
        }
        return false;
    }

    var n = M.getNodeByHandle(id);
    if (n && RootbyId(id) === 'shares' || folderlink)
    {
        $('.slideshow-getlink').hide();
        $('.slideshow-line').hide();
    }
    else
    {
        $('.slideshow-getlink').show();
        $('.slideshow-line').show();
    }
    $('.slideshow-dialog .close-slideshow,.slideshow-overlay,.slideshow-error-close').unbind('click');
    $('.slideshow-dialog .close-slideshow,.slideshow-overlay,.slideshow-error-close').bind('click', function(e)
    {
        slideshow(id, 1);
    });
    if (!n)
        return;
    $('.slideshow-filename').text(n.name);
    $('.slideshow-image').attr('src', '');
    $('.slideshow-pending').removeClass('hidden');
    $('.slideshow-progress').addClass('hidden');
    $('.slideshow-error').addClass('hidden');
    $('.slideshow-image').width(0);
    $('.slideshow-image').height(0);
    $('.slideshow-image-bl').addClass('hidden');
    $('.slideshow-prev-button,.slideshow-next-button').removeClass('active');
    slideshowid = id;
    var steps = slideshowsteps();
    if (steps.backward.length > 0)
        $('.slideshow-prev-button').addClass('active');
    if (steps.forward.length > 0)
        $('.slideshow-next-button').addClass('active');
    $('.slideshow-prev-button,.slideshow-next-button').unbind('click');
    $('.slideshow-prev-button,.slideshow-next-button').bind('click', function(e)
    {
        var c = $(this).attr('class');
        if (c && c.indexOf('active') > -1)
        {
            var steps = slideshowsteps();
            if (c.indexOf('prev') > -1 && steps.backward.length > 0)
                slideshow_prev();
            else if (c.indexOf('next') > -1 && steps.forward.length > 0)
                slideshow_next();
        }
    });

    $('.slideshow-download').rebind('click', function() {

        for (var i in dl_queue) {
            if (dl_queue[i] && dl_queue[i].id === slideshowid) {
                dl_queue[i].preview = false;
                openTransferpanel();
                return;
            }
        }

        if (M.d[slideshowid]) {
            M.addDownload([slideshowid]);
        }
        else {
            M.addDownload([n]);
        }
    });


    if (M.d[slideshowid]) {
        $('.slideshow-getlink')
            .show()
            .rebind('click', function() {
                if (u_type === 0) {
                    ephemeralDialog(l[1005]);
                }
                else {
                    initCopyrightsDialog([slideshowid]);
                }
            })
            .next('.slideshow-line')
                .show();
    }
    else {
        $('.slideshow-getlink')
            .hide()
                .next('.slideshow-line')
                    .hide();
    }

    if (previews[id]) {
        previewsrc(previews[id].src);
        fetchnext();
    }
    else if (!preqs[id]) {
        fetchsrc(id);
    }

    $('.slideshow-overlay').removeClass('hidden');
    $('.slideshow-dialog').removeClass('hidden');
}

function fetchnext()
{
    var n = M.d[slideshowsteps().forward[0]];
    if (!n || !n.fa)
        return;
    if (n.fa.indexOf(':1*') > -1 && !preqs[n.h] && !previews[n.h])
        fetchsrc(n.h);
}

function fetchsrc(id)
{
    function eot(id, err)
    {
        delete preqs[id];
        delete pfails[id];
        M.addDownload([id], false, err ? -1 : true);
    }
    eot.timeout = 8500;

    if (pfails[id])
    { // for slideshow_next/prev
        if (slideshowid == id)
            return eot(id, 1);
        delete pfails[id];
    }

    var n = M.getNodeByHandle(id);
    if (!n) {
        console.error('handle "%s" not found...', id);
        return false;
    }

    preqs[id] = 1;
    var treq = {};
    treq[id] = {fa: n.fa, k: n.key};
    api_getfileattr(treq, 1, function(ctx, id, uint8arr)
    {
        previewimg(id, uint8arr);
        if (!n.fa || n.fa.indexOf(':0*') < 0) {
            if (d) {
                console.log('Thumbnail found missing on preview, creating...', id, n);
            }
            var aes = new sjcl.cipher.aes([
                n.key[0] ^ n.key[4],
                n.key[1] ^ n.key[5],
                n.key[2] ^ n.key[6],
                n.key[3] ^ n.key[7]]);
            createnodethumbnail(n.h, aes, id, uint8arr);
        }
        if (id == slideshowid)
            fetchnext();
    }, eot);
}

function previewsrc(src)
{
    var img = new Image();
    img.onload = function()
    {
        if (this.height > $(window).height() - 100)
        {
            var factor = this.height / ($(window).height() - 100);
            this.height = $(window).height() - 100;
            this.width = Math.round(this.width / factor);
        }
        var w = this.width, h = this.height;
        if (w < 700)
            w = 700;
        if (h < 500)
            h = 500;
        $('.slideshow-image').attr('src', this.src);
        $('.slideshow-dialog').css('margin-top', h / 2 * -1);
        $('.slideshow-dialog').css('margin-left', w / 2 * -1);
        $('.slideshow-image').width(this.width);
        $('.slideshow-image').height(this.height);
        $('.slideshow-dialog').width(w);
        $('.slideshow-dialog').height(h);
        $('.slideshow-image-bl').removeClass('hidden');
        $('.slideshow-pending').addClass('hidden');
        $('.slideshow-progress').addClass('hidden');
    };
    img.src = src;
}

function previewimg(id, uint8arr)
{
    try {
        var blob = new Blob([uint8arr], {type: 'image/jpeg'});
    } catch (err) {}
    if (!blob || blob.size < 25)
        blob = new Blob([uint8arr.buffer]);
    previews[id] =
        {
            blob: blob,
            src: myURL.createObjectURL(blob),
            time: new Date().getTime()
        };
    if (id == slideshowid)
    {
        previewsrc(previews[id].src);
    }
    if (Object.keys(previews).length == 1)
    {
        $(window).unload(function()
        {
            for (var id in previews)
            {
                myURL.revokeObjectURL(previews[id].src);
            }
        });
    }
}

var thumbnails = [];
var thumbnailblobs = [];
var th_requested = [];
var fa_duplicates = {};
var fa_reqcnt = 0;
var fa_addcnt = 8;
var fa_tnwait = 0;

function fm_thumbnails()
{
    var treq = {}, a = 0, max = Math.max($.rmItemsInView || 1, 71) + fa_addcnt, u = max - Math.floor(max / 3), y;
    if (!fa_reqcnt)
        fa_tnwait = y;
    if (d)
        console.time('fm_thumbnails');
    if (M.viewmode || M.chat)
    {
        for (var i in M.v)
        {
            var n = M.v[i];
            if (n && n.fa && String(n.fa).indexOf(':0') > 0)
            {
                if (fa_tnwait == n.h && n.seen)
                    fa_tnwait = 0;
                // if (!fa_tnwait && !thumbnails[n.h] && !th_requested[n.h])
                if (n.seen && !thumbnails[n.h] && !th_requested[n.h])
                {
                    if (typeof fa_duplicates[n.fa] == 'undefined')
                        fa_duplicates[n.fa] = 0;
                    else
                        fa_duplicates[n.fa] = 1;
                    treq[n.h] =
                        {
                            fa: n.fa,
                            k: n.key
                        };
                    th_requested[n.h] = 1;

                    if (u == a)
                        y = n.h;
                    if (++a > max)
                    {
                        if (!n.seen)
                            break;
                        y = n.h;
                    }
                }
                else if (n.seen && n.seen !== 2)
                {
                    fm_thumbnail_render(n);
                }
            }
        }
        if (y)
            fa_tnwait = y;
        if (a > 0)
        {
            fa_reqcnt += a;
            if (d)
                console.log('Requesting %d thumbs (%d loaded)', a, fa_reqcnt);

            var rt = Date.now();
            var cdid = M.currentdirid;
            api_getfileattr(treq, 0, function(ctx, node, uint8arr)
            {
                if (uint8arr === 0xDEAD)
                {
                    if (d)
                        console.log('Aborted thumbnail retrieval for ' + node);
                    delete th_requested[node];
                    return;
                }
                if (rt)
                {
                    if (((Date.now() - rt) > 4000) && ((fa_addcnt += u) > 300))
                        fa_addcnt = 301;
                    rt = 0;
                }
                try {
                    var blob = new Blob([uint8arr], {type: 'image/jpeg'});
                } catch (err) {}
                if (blob.size < 25)
                    blob = new Blob([uint8arr.buffer]);
                // thumbnailblobs[node] = blob;
                thumbnails[node] = myURL.createObjectURL(blob);

                var targetNode = M.getNodeByHandle(node);

                if (targetNode && targetNode.seen && M.currentdirid === cdid) {
                    fm_thumbnail_render(targetNode);
                }

                // deduplicate in view when there is a duplicate fa:
                if (targetNode && fa_duplicates[targetNode.fa] > 0)
                {
                    for (var i in M.v)
                    {
                        if (M.v[i].h !== node && M.v[i].fa === targetNode.fa && !thumbnails[M.v[i].h])
                        {
                            thumbnails[M.v[i].h] = thumbnails[node];
                            if (M.v[i].seen && M.currentdirid === cdid)
                                fm_thumbnail_render(M.v[i]);
                        }
                    }
                }
            });
        }
    }
    if (d)
        console.timeEnd('fm_thumbnails');
}


function fm_thumbnail_render(n) {
    if (n && thumbnails[n.h]) {
        var imgNode = document.getElementById(n.h);

        if (imgNode && (imgNode = imgNode.querySelector('img'))) {
            n.seen = 2;
            imgNode.setAttribute('src', thumbnails[n.h]);
            imgNode.parentNode.classList.add('thumb');
        }
    }
}

function fm_contains(filecnt, foldercnt) {
    var containstxt = l[782];
    if ((foldercnt > 1) && (filecnt > 1)) {
        containstxt = l[828].replace('[X1]', foldercnt).replace('[X2]', filecnt);
    } else if ((foldercnt > 1) && (filecnt === 1)) {
        containstxt = l[829].replace('[X]', foldercnt);
    } else if ((foldercnt === 1) && (filecnt > 1)) {
        containstxt = l[830].replace('[X]', filecnt);
    } else if ((foldercnt === 1) && (filecnt === 1)) {
        containstxt = l[831];
    } else if (foldercnt > 1) {
        containstxt = l[832].replace('[X]', foldercnt);
    } else if (filecnt > 1) {
        containstxt = l[833].replace('[X]', filecnt);
    } else if (foldercnt === 1) {
        containstxt = l[834];
    } else if (filecnt === 1) {
        containstxt = l[835];
    }
    return containstxt;
}

function fm_importflnodes(nodes)
{
    var sel = [].concat(nodes || []);
    if (sel.length) {
        var FLRootID = M.RootID;

        mega.ui.showLoginRequiredDialog().done(function() {

            $.onImportCopyNodes = fm_getcopynodes(sel);
            document.location.hash = 'fm';

            $(document).one('onInitContextUI', SoonFc(function(e) {
                if (M.RootID === FLRootID) {
                    // TODO: How to reproduce this?
                    console.warn('Unable to complete import, apparnetly we did not reached the cloud.');
                }
                else {
                    if (d) console.log('Importing Nodes...', sel, $.onImportCopyNodes);

                    $.selected = sel;
                    $.mcImport = true;

                    // XXX: ...
                    $('.context-menu-item.copy-item').click();
                }
            }));
        }).fail(function(aError) {
            // If no aError, it was canceled
            if (aError) {
                alert(aError);
            }
        });
    }
}

function clipboardcopycomplete()
{
    if (d)
        console.log('clipboard copied');
}

function saveprogress(id, bytesloaded, bytestotal)
{
    if (d)
        console.log('saveprogress', id, bytesloaded, bytestotal);
}

function savecomplete(id)
{
    $('.fm-dialog.download-dialog').addClass('hidden');
    fm_hideoverlay();
    if (!$.dialog)
        $('#dlswf_' + id).remove();
    var dl = dlmanager.getDownloadByHandle(id);
    if (dl) {
        M.dlcomplete(dl);
        dlmanager.cleanupUI(dl, true);
    }
}

/**
 * Because of the left and transfer panes resizing options, we are now implementing the UI layout logic here, instead of
 * the original code from the styles.css.
 * The main reason is that, the CSS is not able to correctly calculate values based on other element's properties (e.g.
 * width, height, position, etc).
 * This is why we do a on('resize') handler which handles the resize of the generic layout of Mega's FM.
 */
function fm_resize_handler() {
    if ($.tresizer.last === -1) {
        return;
    }
    if (d) {
        console.time('fm_resize_handler');
    }

    if (window.chrome) {
        // XXX: Seems this 110% zoom bug got fixed as of Chrome 54?
        mega.utils.chrome110ZoomLevelNotification();
    }

    if (ulmanager.isUploading || dlmanager.isDownloading) {
        var tfse = M.getTransferElements();

        tfse.domScrollingTable.style.height = (
                $(tfse.domTransfersBlock).outerHeight() -
                $(tfse.domTableHeader).outerHeight() -
                $(tfse.domTransferHeader).outerHeight()
            ) + "px";
    }

    if (M.currentdirid !== 'transfers') {
        $('.files-grid-view .grid-scrolling-table, .file-block-scrolling,' +
            ' .contacts-grid-view .contacts-grid-scrolling-table')
            .css({
                'width': $(document.body).outerWidth() - $('.fm-left-panel').outerWidth()
            });

        initTreeScroll();
    }

    if (M.currentdirid === 'contacts') {
        if (M.viewmode) {
            initContactsBlocksScrolling();
        }
        else {
            if ($.contactGridHeader) {
                $.contactGridHeader();
            }
            initContactsGridScrolling();
        }
    }
    else if (M.currentdirid === 'shares') {
        if (M.viewmode) {
            initShareBlocksScrolling();
        }
        else {
            initGridScrolling();
            if ($.sharedGridHeader) {
                $.sharedGridHeader();
            }
        }
    }
    else if (M.currentdirid === 'transfers') {
        fm_tfsupdate(); // this will call $.transferHeader();
    }
    else if (M.currentdirid && M.currentdirid.substr(0, 7) === 'account') {
        var $mainBlock = $('.fm-account-main');

        if ($mainBlock.width() > 1675) {
            $mainBlock.addClass('hi-width');
        }
        else if ($mainBlock.width() < 920) {
            $mainBlock.addClass('low-width');
        } else {
            $mainBlock.removeClass('low-width hi-width');
        }

        initAccountScroll();
    }
    else {
        if (M.viewmode) {
            initFileblocksScrolling();
        }
        else {
            initGridScrolling();
            if ($.gridHeader) {
                $.gridHeader();
                $.detailsGridHeader();
            }
        }
    }

    if (M.currentdirid !== 'transfers') {
        if (slideshowid && previews[slideshowid]) {
            previewsrc(previews[slideshowid].src);
        }

        if (megaChatIsReady && megaChat.resized) {
            megaChat.resized();
        }

        $('.fm-right-files-block, .fm-right-account-block').css({
            'margin-left': ($('.fm-left-panel:visible').width() + $('.nw-fm-left-icons-panel').width()) + "px"
        });
    }

    if (M.currentrootid === 'shares') {
        var shared_block_height = $('.shared-details-block').height() - $('.shared-top-details').height();

        if (shared_block_height > 0) {
            $('.shared-details-block .files-grid-view, .shared-details-block .fm-blocks-view').css({
                'height': shared_block_height + "px",
                'min-height': shared_block_height + "px"
            });
        }
    }

    if (d) {
        console.timeEnd('fm_resize_handler');
    }
}

/**
 * Fire "find duplicates"
 */
mega.utils.findDupes = function() {
    loadingDialog.show();
    Soon(function() {
        M.overrideModes = 1;
        location.hash = '#fm/search/~findupes';
    });
};

function sharedFolderUI() {
    /* jshint -W074 */
    var nodeData = M.d[M.currentdirid];
    var browsingSharedContent = false;
    var c;

    // Browsing shared content
    if ($('.shared-details-block').length > 0) {

        $('.shared-details-block .files-grid-view, .shared-details-block .fm-blocks-view').removeAttr('style');
        $('.shared-details-block .shared-folder-content').unwrap();
        $('.shared-folder-content').removeClass('shared-folder-content');
        $('.shared-top-details').remove();
        browsingSharedContent = true;
    }

    // Checks it's not a contact, contacts handles are 11 chars long
    // file/folder handles are 8 chars long
    if (!nodeData || (nodeData.p.length !== 11)) {

        // [<current selection handle>, 'owners handle', 'tab name']
        var p = M.getPath(M.currentdirid);
        nodeData = null;

        if (p[p.length - 1] === 'shares') {
            c = M.d[p[0]];
            nodeData = M.d[p[p.length - 3]];

            if (!nodeData || (nodeData.p.length !== 11)) {
                nodeData = 0;
            }
        }
    }

    if (nodeData) {

        var rights = l[55];
        var rightsclass = ' read-only';
        var rightPanelView = '.files-grid-view.fm';

        // Handle of initial share owner
        var ownersHandle = nodeData.su;
        var displayName = htmlentities(M.getNameByHandle(ownersHandle));
        var avatar = useravatar.contact(M.d[ownersHandle], 'nw-contact-avatar');

        if (Object(M.u[ownersHandle]).m) {
            displayName += ' &nbsp;&lt;' + htmlentities(M.u[ownersHandle].m) + '&gt;';
        }

        // Access rights
        if (nodeData.r === 1) {
            rights = l[56];
            rightsclass = ' read-and-write';
        }
        else if (nodeData.r === 2) {
            rights = l[57];
            rightsclass = ' full-access';
        }

        if (M.viewmode === 1) {
            rightPanelView = '.fm-blocks-view.fm';
        }

        $(rightPanelView).wrap('<div class="shared-details-block"></div>');

        $('.shared-details-block').prepend(
            '<div class="shared-top-details">'
                + '<div class="shared-details-icon"></div>'
                + '<div class="shared-details-info-block">'
                    + '<div class="shared-details-pad">'
                        + '<div class="shared-details-folder-name">' + htmlentities((c || nodeData).name) + '</div>'
                        + '<a href="javascript:;" class="grid-url-arrow"></a>'
                        + '<div class="shared-folder-access' + rightsclass + '">' + rights + '</div>'
                        + '<div class="clear"></div>'
                        + avatar
                        + '<div class="fm-chat-user-info">'
                            + '<div class="fm-chat-user">' + displayName + '</div>'
                        + '</div>'
                    + '</div>'
                    + '<div class="shared-details-buttons">'
                        + '<div class="fm-leave-share"><span>' + l[5866] + '</span></div>'
                        + '<div class="fm-share-copy"><span>' + l[63] + '</span></div>'
                        + '<div class="fm-share-download"><span class="fm-chatbutton-arrow">' + l[58] + '</span></div>'
                        + '<div class="clear"></div>'
                    + '</div>'
                    + '<div class="clear"></div>'
                + '</div>'
            + '</div>');

        $(rightPanelView).addClass('shared-folder-content');

        Soon(function() {
            $(window).trigger('resize');
            Soon(fm_resize_handler);
        });
    }

    return browsingSharedContent;
    /* jshint -W074 */
}

function userFingerprint(userid, callback) {
    userid = userid.u || userid;
    var user = M.u[userid];
    if (!user || !user.u) {
        return callback([]);
    }
    if (userid === u_handle) {
        var fprint = authring.computeFingerprint(u_pubEd25519, 'Ed25519', 'hex');
        return callback(fprint.toUpperCase().match(/.{4}/g), fprint);
    }
    var fingerprintPromise = crypt.getFingerprintEd25519(user.h || userid);
    fingerprintPromise.done(function (response) {
        callback(
            response.toUpperCase().match(/.{4}/g),
            response
        );
    });
}

/**
 * Get and display the fingerprint
 * @param {Object} user The user object e.g. same as M.u[userHandle]
 */
function showAuthenticityCredentials(user) {

    var $fingerprintContainer = $('.contact-fingerprint-txt');

    // Compute the fingerprint
    userFingerprint(user, function(fingerprints) {

        // Clear old values immediately
        $fingerprintContainer.empty();

        // Render the fingerprint into 10 groups of 4 hex digits
        $.each(fingerprints, function(key, value) {
            $('<span>').text(value).appendTo(
                $fingerprintContainer.filter(key <= 4 ? ':first' : ':last')
            );
        });
    });
}

/**
 * Enables the Verify button
 * @param {String} userHandle The user handle
 */
function enableVerifyFingerprintsButton(userHandle) {
    $('.fm-verify').removeClass('verified');
    $('.fm-verify').find('span').text(l[1960] + '...');
    $('.fm-verify').rebind('click', function() {
        fingerprintDialog(userHandle);
    });
}

function fingerprintDialog(userid) {

    // Add log to see how often they open the verify dialog
    api_req({ a: 'log', e: 99601, m: 'Fingerprint verify dialog opened' });

    userid = userid.u || userid;
    var user = M.u[userid];
    if (!user || !user.u) {
        return;
    }

    function closeFngrPrntDialog() {
        fm_hideoverlay();
        $this.addClass('hidden');
        $('.fm-dialog-close').unbind('click');
        $('.dialog-approve-button').unbind('click');
        $('.dialog-skip-button').unbind('click');
        $this = null;
    }

    var $this = $('.fingerprint-dialog');

    $this.find('.fingerprint-avatar').empty().append($(useravatar.contact(userid)).removeClass('avatar'));

    $this.find('.contact-details-user-name')
        .text(M.getNameByHandle(user.u)) // escape HTML things
        .end()
        .find('.contact-details-email')
        .text(user.m); // escape HTML things

    $this.find('.fingerprint-txt').empty();
    userFingerprint(u_handle, function(fprint) {
        var target = $('.fingerprint-bott-txt .fingerprint-txt');
        fprint.forEach(function(v) {
            $('<span>').text(v).appendTo(target);
        });
    });

    userFingerprint(user, function(fprint) {
        var offset = 0;
        $this.find('.fingerprint-code .fingerprint-txt').each(function() {
            var that = $(this);
            fprint.slice(offset, offset + 5).forEach(function(v) {
                $('<span>').text(v).appendTo(that);
                offset++;
            });
        });
    });

    $('.fm-dialog-close').rebind('click', function() {
        closeFngrPrntDialog();
    });

    $('.dialog-approve-button').rebind('click', function() {

        // Add log to see how often they verify the fingerprints
        api_req({ a: 'log', e: 99602, m: 'Fingerprint verification approved' });

        loadingDialog.show();
        // Generate fingerprint
        crypt.getFingerprintEd25519(userid, 'string')
            .done(function(fingerprint) {

                // Authenticate the contact
                authring.setContactAuthenticated(
                    userid,
                    fingerprint,
                    'Ed25519',
                    authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                    authring.KEY_CONFIDENCE.UNSURE
                );

                // Change button state to 'Verified'
                $('.fm-verify').unbind('click').addClass('verified').find('span').text(l[6776]);

                closeFngrPrntDialog();
            })
            .always(function() {
                loadingDialog.hide();
            });
    });

    $('.dialog-skip-button').rebind('click', function() {
        closeFngrPrntDialog();
    });

    $this.removeClass('hidden')
        .css({
            'margin-top': '-' + $this.height() / 2 + 'px',
            'margin-left': '-' + $this.width() / 2 + 'px'
        });
    fm_showoverlay();
}

function contactUI() {
    $('.nw-contact-item').removeClass('selected');
    $('.contact-details-pad .grid-url-arrow').unbind('click');

    var n = M.u[M.currentdirid];
    if (n && n.u) {
        var u_h = M.currentdirid;
//        var cs = M.contactstatus(u_h);
        var user = M.u[u_h];
        var avatar = $(useravatar.contact(u_h));

        var onlinestatus = M.onlineStatusClass(
            megaChatIsReady &&
            megaChat.karere.getPresence(megaChat.getJidFromNodeId(u_h))
        );

        $('.contact-top-details .nw-contact-block-avatar').empty().append( avatar.removeClass('avatar').addClass('square') );
        $('.contact-top-details .onlinestatus').removeClass('away offline online busy');
        $('.contact-top-details .onlinestatus').addClass(onlinestatus[1]);
        $('.contact-top-details .fm-chat-user-status').text(onlinestatus[0]);
        $('.contact-top-details .contact-details-user-name').text(
            M.getNameByHandle(user.u)
        );
        $('.contact-top-details .contact-details-email').text(user.m);

        $('.contact-details-pad .grid-url-arrow').bind('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            // $(this).addClass('active');
            $('.context-menu').addClass('arrange-to-front');
            e.currentTarget = $(this);
            e.calculatePosition = true;
            $.selected = [location.hash.replace('#fm/', '')];
            searchPath();
            contextMenuUI(e, 4);
        });

        // Display the current fingerpring
        showAuthenticityCredentials(user);

        // Set authentication state of contact from authring.
        var authringPromise = new MegaPromise();
        if (u_authring.Ed25519) {
            authringPromise.resolve();
        }
        else {
            // First load the authentication system.
            var authSystemPromise = authring.initAuthenticationSystem();
            authringPromise.linkDoneAndFailTo(authSystemPromise);
        }
        /** To be called on settled authring promise. */
        var _setVerifiedState = function() {

            var handle = user.u || user;
            var verificationState = u_authring.Ed25519[handle] || {};
            var isVerified = (verificationState.method
                              >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            // Show the user is verified
            if (isVerified) {
                $('.fm-verify').addClass('verified');
                $('.fm-verify').find('span').text(l[6776]);
            }
            else {
                // Otherwise show the Verify... button.
                enableVerifyFingerprintsButton(handle);
            }
        };
        authringPromise.done(_setVerifiedState);

        // Reset seen or verified fingerprints and re-enable the Verify button
        $('.fm-reset-stored-fingerprint').rebind('click', function() {
            authring.resetFingerprintsForUser(user.u);
            enableVerifyFingerprintsButton(user.u);

            // Refetch the key
            showAuthenticityCredentials(user);
        });

        $('.fm-share-folders').rebind('click', function() {
            $('.copy-dialog').removeClass('hidden');

            $.copyDialog = 'copy';
            $.mcselected = undefined;

            handleDialogContent('cloud-drive', 'ul', true, 'copy', l[1344]);
            fm_showoverlay();
        });

        // Remove contact button on contacts page
        $('.fm-remove-contact').rebind('click', function() {
            $.selected = [M.currentdirid];
            fmremove();
        });

        if (!megaChatIsDisabled) {

            // Bind the "Start conversation" button
            $('.fm-start-conversation').rebind('click.megaChat', function() {

                window.location = '#fm/chat/' + u_h;
                return false;
            });
        }

        $('.nw-contact-item#contact_' + u_h).addClass('selected');
    }
}

/**
 * Implements the behavior of "File Manager - Resizable Panes":
 * - Initializes a jQuery UI .resizable
 * - Sets w/h/direction
 * - Persistance (only saving is implemented here, you should implement by yourself an initial set of the w/h from the
 *  localStorage
 * - Proxies the jQ UI's resizable events - `resize` and `resizestop`
 * - Can be initialized only once per element (instance is stored in $element.data('fmresizable'))
 *
 * @param element
 * @param opts
 * @returns {*}
 * @constructor
 */
function FMResizablePane(element, opts) {
    var $element = $(element);
    var self = this;
    var $self = $(this);

    self.element = element;

    /**
     * Default options
     *
     * @type {{direction: string, persistanceKey: string, minHeight: undefined, minWidth: undefined, handle: string}}
     */
    var defaults = {
        'direction': 'n',
        'persistanceKey': 'transferPanelHeight',
        'minHeight': undefined,
        'minWidth': undefined,
        'handle': '.transfer-drag-handle'
    };

    var size_attr = 'height';

    opts = $.extend(true, {}, defaults, opts);

    self.options = opts; //expose as public

    /**
     * Depending on the selected direction, pick which css attr should we be changing - width OR height
     */
    if (opts.direction == 'n' || opts.direction == 's') {
        size_attr = 'height';
    } else if (opts.direction == 'e' || opts.direction == 'w') {
        size_attr = 'width';
    } else if (opts.direction.length == 2) {
        size_attr = 'both';
    }

    /**
     * Destroy if already initialized.
     */
    if ($element.data('fmresizable')) {
        $element.data('fmresizable').destroy();
    }

    self.destroy = function() {
        // some optimizations can be done here in the future.
    };

    /**
     * Basic init/constructor code
     */
    {
        var $handle = $(opts.handle, $element);

        if (d) {
            if (!$handle.length) {
                console.warn('FMResizablePane: Element not found: ' + opts.handle);
            }
        }

        $handle.addClass('ui-resizable-handle ui-resizable-' + opts.direction);

        var resizable_opts = {
            'handles': {
            },
            minHeight: opts.minHeight,
            minWidth: opts.minWidth,
            maxHeight: opts.maxHeight,
            maxWidth: opts.maxWidth,
            start: function(e, ui) {

            },
            resize: function(e, ui) {
                var css_attrs = {
                    'top': 0
                };

                if (size_attr == 'both') {
                    css_attrs['width'] = ui.size['width'];
                    css_attrs['height'] = ui.size['height'];

                    $element.css(css_attrs);

                    if (opts.persistanceKey) {
                        mega.config.set(opts.persistanceKey, css_attrs);
                    }
                } else {
                    css_attrs[size_attr] = ui.size[size_attr];
                    $element.css(css_attrs);
                    if (opts.persistanceKey) {
                        mega.config.set(opts.persistanceKey, ui.size[size_attr]);
                    }
                }

                $self.trigger('resize', [e, ui]);
            },
            'stop': function(e, ui) {
                $self.trigger('resizestop', [e, ui]);
                $(window).trigger('resize');
            }
        };

        if (opts['aspectRatio']) {
            resizable_opts['aspectRatio'] = opts['aspectRatio'];
        }

        resizable_opts['handles'][opts.direction] = $handle;

        $element.resizable(resizable_opts);

        $element.data('fmresizable', this);
    }
    return this;
}

/**
 * bindDropdownEvents
 *
 * Bind Custom select event
 *
 * @param {Selector} dropdowns, elements selector.
 * @param {String} addition option for account page only. Allows to show "Show changes" notification
 *
 */
function bindDropdownEvents($dropdown, saveOption) {

    var $dropdownsItem = $dropdown.find('.default-dropdown-item');

    $($dropdown).rebind('click', function(e)
    {
        var $this = $(this);
        if (!$this.hasClass('active')) {
            var bottPos, jsp,
                scrollBlock = '#' + $this.attr('id') + ' .default-select-scroll',
                $dropdown = $this.find('.default-select-dropdown'),
                $activeDropdownItem = $this.find('.default-dropdown-item.active');

            //Show Select dropdown
            $('.active .default-select-dropdown').fadeOut(200);
            $this.addClass('active');
            $dropdown.css('margin-top', '0px');
            $dropdown.fadeIn(200);

            //Dropdown position relative to the window
            bottPos = $(window).height() - ($dropdown.offset().top + $dropdown.outerHeight());
            if (bottPos < 50) {
                $dropdown.css('margin-top', '-' + (60 - bottPos) + 'px');
            }

            //Dropdown scrolling initialization
            initSelectScrolling(scrollBlock);
            jsp = $(scrollBlock).data('jsp');
            if (jsp && $activeDropdownItem.length) {
                jsp.scrollToElement($activeDropdownItem)
            }
        } else {
            $this.find('.default-select-dropdown').fadeOut(200);
            $this.removeClass('active');
        }
    });

    $dropdownsItem.rebind('click', function(e)
    {
        var $this = $(this);
        if (!$this.hasClass('active')) {
            var $select = $(this).closest('.default-select');

            //Select dropdown item
            $select.find('.default-dropdown-item').removeClass('active');
            $this.addClass('active');
            $select.find('span').text($this.text());

            //Save changes for account page
            if (saveOption) {
                $('.fm-account-save-block').removeClass('hidden');
            }
        }
    });

    $('#fmholder, .fm-dialog').rebind('click.defaultselect', function(e)
    {
        if (!$(e.target).hasClass('default-select')) {
            $selectBlock = $('.default-select.active');
            $selectBlock.find('.default-select-dropdown').fadeOut(200);
            $selectBlock.removeClass('active');
        }
    });
}

/**
 * Highlights some text inside an element as if you had selected it with the mouse
 * From http://stackoverflow.com/a/987376
 * @param {String} elementId The name of the id
 */
function selectText(elementId) {

    var range, selection;
    var text = document.getElementById(elementId);

    if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    }
    else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Dialog to cancel subscriptions
 */
var cancelSubscriptionDialog = {

    $backgroundOverlay: null,
    $dialog: null,
    $dialogSuccess: null,
    $accountPageCancelButton: null,
    $accountPageSubscriptionBlock: null,
    $continueButton: null,
    $cancelReason: null,

    init: function() {

        this.$dialog = $('.cancel-subscription-st1');
        this.$dialogSuccess = $('.cancel-subscription-st2');
        this.$accountPageCancelButton = $('.fm-account-blocks .btn-cancel');
        this.$continueButton = this.$dialog.find('.continue-cancel-subscription');
        this.$cancelReason = this.$dialog.find('.cancel-textarea textarea');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$accountPageSubscriptionBlock = $('.subscription-bl');

        // Show the dialog
        this.$dialog.removeClass('hidden');
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Init textarea scrolling
        initTextareaScrolling($('.cancel-textarea textarea'), 126);

        // Init functionality
        this.enableButtonWhenReasonEntered();
        this.initSendingReasonToApi();
        this.initCloseAndBackButtons();
    },

    /**
     * Close the dialog when either the close or back buttons are clicked
     */
    initCloseAndBackButtons: function() {

        // Close main dialog
        this.$dialog.find('.fm-dialog-button.cancel, .fm-dialog-close').rebind('click', function() {
            cancelSubscriptionDialog.$dialog.addClass('hidden');
            cancelSubscriptionDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        });

        // Prevent clicking on the background overlay which closes it unintentionally
        cancelSubscriptionDialog.$backgroundOverlay.rebind('click', function(event) {
            event.stopPropagation();
        });
    },

    /**
     * Close success dialog
     */
    initCloseButtonSuccessDialog: function() {

        this.$dialogSuccess.find('.fm-dialog-close').rebind('click', function() {
            cancelSubscriptionDialog.$dialogSuccess.addClass('hidden');
            cancelSubscriptionDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        });
    },

    /**
     * Make sure text has been entered before making the button available
     */
    enableButtonWhenReasonEntered: function() {

        this.$cancelReason.rebind('keyup', function() {

            // Trim for spaces
            var reason = $(this).val();
                reason = $.trim(reason);

            // Make sure at least 1 character
            if (reason.length > 0) {
                cancelSubscriptionDialog.$continueButton.removeClass('disabled');
            }
            else {
                cancelSubscriptionDialog.$continueButton.addClass('disabled');
            }
        });
    },

    /**
     * Send the cancellation reason
     */
    initSendingReasonToApi: function() {

        this.$continueButton.rebind('click', function() {

            // Get the cancellation reason
            var reason = cancelSubscriptionDialog.$cancelReason.val();

            // Hide the dialog and show loading spinner
            cancelSubscriptionDialog.$dialog.addClass('hidden');
            cancelSubscriptionDialog.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            loadingDialog.show();

            // Cancel the subscription/s
            // cccs = Credit Card Cancel Subscriptions, r = reason
            api_req({ a: 'cccs', r: reason }, {
                callback: function() {

                    // Hide loading dialog and cancel subscription button on account page
                    loadingDialog.hide();
                    cancelSubscriptionDialog.$accountPageCancelButton.hide();
                    cancelSubscriptionDialog.$accountPageSubscriptionBlock.removeClass('active-subscription');

                    // Show success dialog and refresh UI
                    cancelSubscriptionDialog.$dialogSuccess.removeClass('hidden');
                    cancelSubscriptionDialog.$backgroundOverlay.removeClass('hidden');
                    cancelSubscriptionDialog.$backgroundOverlay.addClass('payment-dialog-overlay');
                    cancelSubscriptionDialog.initCloseButtonSuccessDialog();

                    // Reset account cache so all account data will be refetched and re-render the account page UI
                    M.account.lastupdate = 0;
                    accountUI();
                }
            });
        });
    }
};

/**
 * addToMultiInputDropDownList
 *
 * Add item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function addToMultiInputDropDownList(dialog, item) {

    if (dialog) {
        $(dialog).tokenInput("addToDDL", item);
    }
}

/**
 * removeFromMultiInputDDL
 *
 * Remove item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function removeFromMultiInputDDL(dialog, item) {

    if (dialog) {
        $(dialog).tokenInput("removeFromDDL", item);
    }
}

(function($, scope) {
    /**
     * Sort dialogs, dialogs used for sorting content in left panels, copy and move dialogs.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var SortMenu = function(opts) {

        var self = this;
        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);
    };

    /**
     * treesearchUI
     */
    SortMenu.prototype.treeSearchUI = function() {

        $('.nw-fm-tree-header').unbind('click');
        $('.nw-fm-search-icon').unbind('click');
        $('.nw-fm-tree-header input').unbind('keyup');
        $('.nw-fm-tree-header input').unbind('blur');

        // Items are NOT available in left panel, hide search
        if (!$('.fm-tree-panel .content-panel.active').find('ul li, .nw-contact-item').length) {
            $('.nw-fm-tree-header input').prop('readonly', true);
            $('.nw-fm-search-icon').hide();
        }
        else { // There's items available
            $('.nw-fm-search-icon').show();
            $('.nw-fm-tree-header input').prop('readonly', false);

            // Left panel header click, show search input box
            $('.nw-fm-tree-header').bind('click', function(e) {

                var $self = $(this);

                var targetClass = $(e.target).attr('class'),
                    filledInput = $self.attr('class'),
                    $input = $self.find('input');

                // Search icon visible
                if (targetClass && (targetClass.indexOf('nw-fm-search-icon') > -1)) {

                    // Remove previous search text
                    if (filledInput && (filledInput.indexOf('filled-input') > -1)) {
                        $self.removeClass('filled-input');
                    }
                }
                else {
                    $self.addClass('focused-input');
                    if ($input.val() === $input.attr('placeholder')) {
                        $input.val('');
                        $input.focus();
                    }
                }
            }); // END left panel header click

            // Make a search
            $('.nw-fm-search-icon').bind('click', function() {

                var $self = $(this);

                treesearch = false;
                treeredraw();
                $self.prev().val('');
                $self.parent().find('input').blur();
            });

            $('.nw-fm-tree-header input').bind('keyup', function(e) {

                var $self = $(this);

                var $parentElem = $self.parent();

                if (e.keyCode === 27) {
                    $parentElem.removeClass('filled-input');
                    $self.val('');
                    $self.blur();
                    treesearch = false;
                }
                else {
                    $parentElem.addClass('filled-input');
                    treesearch = $self.val();
                }

                if ($self.val() === '') {
                    $parentElem.removeClass('filled-input');
                }

                treeredraw();
            });

            $('.nw-fm-tree-header input').bind('blur', function() {

                var $self = $(this);

                if (($self.val() === $self.attr('placeholder')) || ($self.val() === '')) {
                    $self.parent('.nw-fm-tree-header').removeClass('focused-input filled-input');
                    $self.val($self.attr('placeholder'));
                }
                else {
                    $self.parent('.nw-fm-tree-header').removeClass('focused-input');
                }
            });
        }

        /**
         * Show/hide sort dialog in left panel
         */
        $('.nw-tree-panel-arrows').rebind('click', function() {

            var $self = $(this);

            var menu, type, sortTreePanel, $sortMenuItems;

            // Show sort menu
            if ($self.attr('class').indexOf('active') === -1) {

                $.hideContextMenu();

                $self.addClass('active');

                menu = $('.nw-sorting-menu').removeClass('hidden');
                type = treePanelType();

                if (type === 'settings') {
                    type = M.lastActiveTab || 'cloud-drive';
                }

                // Show all items in sort dialog in case contacts tab is choosen
                if (type === 'contacts') {
                    menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
                }
                else { // Hide status and last-interaction sorting options in sort dialog
                    menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
                }

                sortTreePanel = $.sortTreePanel[type];

                if (d && !sortTreePanel) {
                    console.error('No sortTreePanel', type);
                }

                $sortMenuItems = $('.sorting-menu-item').removeClass('active');

                if (sortTreePanel) {
                    $sortMenuItems.filter('*[data-by=' + sortTreePanel.by + '],*[data-dir=' + sortTreePanel.dir + ']').addClass('active');
                }

                return false; // Prevent bubbling
            }

            // Hide sort menu
            else {
                $self.removeClass('active');
                $('.nw-sorting-menu').addClass('hidden');
            }
        });

        /**
         * React on user input when new sorting criteria is picked
         */
        $('.fm-left-panel .sorting-menu-item').rebind('click', function() {

            var $self = $(this),
                data = $self.data(),
                type = treePanelType();

            if (type === 'settings') {
                type = M.lastActiveTab || 'cloud-drive';
            }

            if (!$self.hasClass('active') && $.sortTreePanel[type]) {
                $self.parent().find('.sorting-menu-item').removeClass('active');
                $self.addClass('active');
                $('.nw-sorting-menu').addClass('hidden');
                $('.nw-tree-panel-arrows').removeClass('active');

                if (data.dir) {
                    localStorage['sort' + type + 'Dir'] = $.sortTreePanel[type].dir = data.dir;
                }
                if (data.by) {
                    localStorage['sort' + type + 'By'] = $.sortTreePanel[type].by = data.by;
                }

                if (type === 'contacts') {
                    M.contacts();
                }
                else if (type === 'shared-with-me') {
                    M.buildtree({ h: 'shares' }, M.buildtree.FORCE_REBUILD);
                }
                else if (type === 'inbox') {
                    M.buildtree(M.d[M.InboxID], M.buildtree.FORCE_REBUILD);
                }
                else if (type === 'rubbsih-bin') {
                    M.buildtree({ h: M.RubbishID }, M.buildtree.FORCE_REBUILD);
                }
                else if ((type === 'cloud-drive') || (type === 'folder-link')) {
                    M.buildtree(M.d[M.RootID], M.buildtree.FORCE_REBUILD);
                }

                treeUI(); // reattach events
            }
        });

    };

    SortMenu.prototype.initializeTreePanelSorting = function() {

        var self = this;

        $.sortTreePanel = {};

        $.each(['folder-link', 'contacts', 'conversations', 'inbox', 'shared-with-me', 'cloud-drive', 'rubbish-bin'], function(key, type) {
            $.sortTreePanel[type] = {
                by: anyOf(['name', 'status', 'last-interaction'], localStorage['sort' + type + 'By']) || (type === 'contacts' ? "status": "name"),
                dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + type + 'Dir']) || '1')
            };
        });
    };

    /**
     * initializeDialogTreePanelSorting
     *
     * Initialize sorting menu in copy and move dialogs
    */
    SortMenu.prototype.initializeDialogTreePanelSorting = function() {

        var dlgKey;

        // Copy dialog
        $.each(['folder-link', 'contacts', 'conversations', 'inbox', 'shared-with-me', 'cloud-drive', 'rubbish-bin'], function(key, type) {
            dlgKey = 'Copy' + type;
            $.sortTreePanel[dlgKey] = {
                by: anyOf(['name', 'status', 'last-interaction'], localStorage['sort' + dlgKey + 'By']) || (type === 'contacts' ? "status": "name"),
                dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + dlgKey + 'Dir']) || '1')
            };
        });

        // Move dialog
        $.each(['folder-link', 'contacts', 'conversations', 'inbox', 'shared-with-me', 'cloud-drive', 'rubbish-bin'], function(key, type) {
            dlgKey = 'Move' + type;
            $.sortTreePanel[dlgKey] = {
                by: anyOf(['name', 'status', 'last-interaction'], localStorage['sort' + dlgKey + 'By']) || (type === 'contacts' ? "status": "name"),
                dir: parseInt(anyOf(['-1', '1'], localStorage['sort' + dlgKey + 'Dir']) || '1')
            };
        });
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.SortMenu = SortMenu;
})(jQuery, window);
