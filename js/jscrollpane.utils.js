function jScrollFade(id) {
    if (is_selenium) {
        return;
    }

    $(id + ' .jspTrack').rebind('mouseover', function(e) {
        $(this).find('.jspDrag').addClass('jspActive');
        $(this).closest('.jspContainer').uniqueId();
        jScrollFadeOut($(this).closest('.jspContainer').attr('id'));
    });

    if (!$.jScroll) {
        $.jScroll = {};
    }
    for (var i in $.jScroll) {
        if ($.jScroll[i] === 0) {
            delete $.jScroll[i];
        }
    }
    $(id).rebind('jsp-scroll-y.fade', function(event, scrollPositionY, isAtTop, isAtBottom) {
        $(this).find('.jspDrag').addClass('jspActive');
        $(this).find('.jspContainer').uniqueId();
        var id = $(this).find('.jspContainer').attr('id');
        jScrollFadeOut(id);
    });
}

function jScrollFadeOut(id) {
    if (!$.jScroll[id]) {
        $.jScroll[id] = 0;
    }
    $.jScroll[id]++;
    setTimeout(function(id) {
        $.jScroll[id]--;
        if ($.jScroll[id] === 0) {
            $('#' + id + ' .jspDrag').removeClass('jspActive');
        }
    }, 500, id);
}


function deleteScrollPanel(from, data) {
    var jsp = $(from).data(data);
    if (jsp) {
        jsp.destroy();

        if (M.megaRender) {
            delay('MegaRender:rebindLayout', M.megaRender.rebindLayout.bind(M.megaRender, from));
        }
    }
}

function initAccountScroll(scroll) {

    "use strict";

    $('.fm-account-main:visible').jScrollPane({
        enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true
    });
    jScrollFade('.fm-account-main:visible');
    if (scroll) {
        var jsp = $('.fm-account-main:visible').data('jsp');
        if (jsp) {
            jsp.scrollToBottom();
        }
    }
}

function initAffiliateScroll(scroll) {

    "use strict";

    $('.fm-affiliate.body:visible').jScrollPane({
        enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true
    });
    jScrollFade('.fm-affiliate.body:visible');
    if (scroll) {
        var jsp = $('.fm-affiliate.body:visible').data('jsp');
        if (jsp) {
            jsp.scrollToBottom();
        }
    }
}

function initGridScrolling() {
    $('.grid-scrolling-table:visible')
        .filter(":not(.megaList,.megaListContainer)")
        .jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});

    jScrollFade('.grid-scrolling-table:not(.megaList,.megaListContainer)');
}

function initFileblocksScrolling() {
    $('.file-block-scrolling:visible')
        .filter(":not(.megaList)")
        .jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});

    jScrollFade('.file-block-scrolling:not(.megaList)');
}

function initFileblocksScrolling2() {
    $('.contact-details-view .file-block-scrolling').jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5
    });
    jScrollFade('.contact-details-view .file-block-scrolling');
}

function initSelectScrolling(scrollBlock) {
    "use strict";

    var $scrollBlock = $(scrollBlock);

    if ($scrollBlock.length === 0) {
        return false;
    }

    // Remember current position of scroll
    var currentPos = $scrollBlock.data('jsp') ? $scrollBlock.data('jsp').getContentPositionY() : 0;
    deleteScrollPanel(scrollBlock, 'jsp');

    // Need to reselect scrollblock due to update.
    $scrollBlock = $(scrollBlock);
    $scrollBlock.jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        contentWidth: 0
    });
    $scrollBlock.data('jsp').scrollToY(currentPos);
    jScrollFade(scrollBlock);
}

function initContactsGridScrolling() {

    "use strict";

    var scroll = '.grid-scrolling-table.contacts';
    initSelectScrolling(scroll);
}

function initOpcGridScrolling() {

    "use strict";

    var scroll = '.grid-scrolling-table.opc';
    initSelectScrolling(scroll);
}

function initIpcGridScrolling() {

    "use strict";

    var scroll = '.grid-scrolling-table.ipc';
    initSelectScrolling(scroll);
}

function initContactsBlocksScrolling() {

    "use strict";

    var scroll = '.contacts-blocks-scrolling';
    if ($('.contacts-blocks-scrolling:visible').length === 0) {
        return;
    }
    initSelectScrolling(scroll);
}

function initShareBlocksScrolling() {

    "use strict";

    var scroll = '.shared-blocks-scrolling';
    if ($('.shared-blocks-scrolling:visible').length === 0) {
        return;
    }
    initSelectScrolling(scroll);
}

function initOutShareBlocksScrolling() {

    'use strict';

    var scroll = '.out-shared-blocks-scrolling';
    if ($('.out-shared-blocks-scrolling:visible').length === 0) {
        return;
    }
    initSelectScrolling(scroll);
}

function initTransferScroll() {
    $('.transfer-scrolling-table').jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        verticalDragMinHeight: 20
    });
    jScrollFade('.transfer-scrolling-table');
}

function initTreeScroll() {
    if (d) {
        console.time('treeScroll');
    }

    $('.fm-tree-panel:not(.manual-tree-panel-scroll-management)').jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 5,
        animateScroll: true
    });

    jScrollFade('.fm-tree-panel:not(.manual-tree-panel-scroll-management)');

    if (d) {
        console.timeEnd('treeScroll');
    }
}

function dialogScroll(s) {
    s += ':visible';
    $(s).jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true});
    jScrollFade(s);
}

function handleDialogScroll(num, dc) {
    var SCROLL_NUM = 5;// Number of items in dialog before scroll is implemented
    //
    // Add scroll in case that we have more then 5 items in list
    if (num > SCROLL_NUM) {
        dialogScroll(dc + ' .share-dialog-contacts');
    }
    else {
        var $x = $(dc + ' .share-dialog-contacts').jScrollPane();
        var el = $x.data('jsp');
        el.destroy();
    }
}


function initTokenInputsScroll($on) {
    $on.jScrollPane({
        enableKeyboardNavigation: false,
        showArrows: true,
        arrowSize: 8,
        animateScroll: true
    });
}

function clearScrollPanel($from) {
    var j = $from.jScrollPane().data();

    if (j && j.jsp) {
        j.jsp.destroy();
    }
}

//----------------------------------------------------------------------------

function reselect(n) {
    'use strict';

    if (d) {
        console.debug('reselect(%s)', n, [window.selectionManager]);
    }
    if (window.selectionManager) {
        return selectionManager.reinitialize();
    }
    $('.ui-selected').removeClass('ui-selected');

    if (!Array.isArray($.selected)) {
        $.selected = [];
    }

    var ids = $.selected.map(function(h) {
        if (h && typeof h === 'object') {
            h = h.h;
        }
        return String(h).replace(/[^\w-]/g, '');
    });

    if (window.selectionManager) {
        selectionManager.clear_selection();
    }

    for (var i = ids.length; i--;) {
        if (window.selectionManager) {
            selectionManager.add_to_selection(ids[i], n, i);
        }
        $('#' + ids[i]).addClass('ui-selected');

        if (n) {
            $('#' + ids[i] + ' .grid-status-icon').addClass('new');
            $('#' + ids[i] + ' .file-status-icon').addClass('new');
        }
    }

    if (n && is_mobile) {
        if ($.selected.length) {
            mobile.cloud.scrollToFile($.selected[0]);
        }
    } else if (n) {
        var el, jsp;

        if (M.viewmode) {
            jsp = $('.file-block-scrolling').data('jsp');
            el = $('a.ui-selected');
        }
        else {
            jsp = $('.grid-scrolling-table').data('jsp');
            el = $('tr.ui-selected');
        }
        if (el.length > 0) {
            el = el[0];
        }
        else {
            el = false;
        }

        if (el && jsp) {
            jsp.scrollToElement(el);
        }
    }
}
