/**
 * This file wraps most of the FM related keyboard related logic.
 */

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
            var items = selectionManager.get_selected();
            if (items.length == 0) {
                return; // dont do anything.
            }

            current_operation = {
                'op': charTyped == "c" ? 'copy' : 'cut',
                'src': items
            };
            return false; // stop prop.
        } else if (charTyped == "v" && (e.ctrlKey || e.metaKey)) {
            if (!current_operation) {
                return false; // stop prop.
            }

            $.each(current_operation.src, function(k, v) {
                if (current_operation.op == "copy") {
                    M.copyNodes([v], M.currentdirid);
                } else if (current_operation.op == "cut") {
                    M.moveNodes([v], M.currentdirid);
                }
            });

            if (current_operation.op == "cut") {
                current_operation = null;
            }

            return false; // stop prop.
        } else if (charCode == 8) {
            var items = selectionManager.get_selected();
            if (items.length == 0 || (RightsbyID(M.currentdirid || '') | 0) < 1) {
                return; // dont do anything.
            }

            $.selected = items;

            fmremove();

            // force remove, no confirmation
            if (e.ctrlKey || e.metaKey) {
                $('#msgDialog:visible .fm-dialog-button.confirm').trigger('click');
            }

            return false;
        }

    });
}

function UIkeyevents() {
    $(window).unbind('keydown.uikeyevents');
    $(window).bind('keydown.uikeyevents', function(e) {

        if (e.keyCode == 9 && !$(e.target).is("input,textarea,select")) {
            return false;
        }

        var sl = false, s;
        var container;
        if (M.viewmode) {
            s = $('.file-block.ui-selected');
            container = s.parent();
        }
        else {
            s = $('.grid-table tr.ui-selected');
            container = s.parent();
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
            if (e.keyCode == 37) {
                // left
                selectionManager.select_prev(e.shiftKey, true);
            }
            else if (e.keyCode == 39) {
                // right
                selectionManager.select_next(e.shiftKey, true);
            }

            // up & down
            else if (e.keyCode == 38 || e.keyCode == 40) {
                if (e.keyCode === 38) {
                    selectionManager.select_grid_up(e.shiftKey, true);
                }
                else {
                    selectionManager.select_grid_down(e.shiftKey, true);
                }

            }
        }

        if (
            (e.keyCode == 38) &&
            (s.length > 0) &&
            ($.selectddUIgrid.indexOf('.grid-scrolling-table') > -1) &&
            !$.dialog
        ) {
            // up in grid/table
            selectionManager.select_prev(e.shiftKey, true);
            quickFinder.disable_if_active();
        }
        else if (
            e.keyCode == 40 &&
            s.length > 0 &&
            $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 &&
            !$.dialog
        ) {
            // down in grid/table
            selectionManager.select_next(e.shiftKey, true);
            quickFinder.disable_if_active();
        }
        else if (e.keyCode == 46 && s.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            // delete
            $.selected = [];
            if (selectionManager && selectionManager.selected_list && selectionManager.selected_list.length > 0) {
                selectionManager.selected_list.each(function (nodeId) {
                    $.selected.push(nodeId);
                });
            }
            else {
                s.each(function (i, e) {
                    $.selected.push($(e).attr('id'));
                });
            }
            fmremove();
        }
        else if (e.keyCode == 46 && selPanel.length > 0 && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            // Delete [while in transfers]
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
        else if (
            e.keyCode == 13 &&
            s.length > 0 &&
            !$.dialog &&
            !$.msgDialog &&
            $('.fm-new-folder').attr('class').indexOf('active') == -1 &&
            $('.top-search-bl').attr('class').indexOf('active') == -1
        ) {
            // enter key in FM
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
            // enter key in Share dialog
            var share = new mega.Share();
            share.updateNodeShares();
        }
        else if ((e.keyCode === 13) && ($.dialog === 'add-contact-popup')) {
            // enter key in add-contact-popup
            addNewContact($('.add-user-popup-button.add'));
        }
        else if ((e.keyCode === 13) && ($.dialog === 'rename')) {
            // enter key in rename dialog
            doRename();
        }

        // If the Esc key is pressed while the payment address dialog is visible, close it
        else if ((e.keyCode === 27) && !$('.payment-address-dialog').hasClass('hidden')) {
            addressDialog.closeDialog();
        }
        else if (e.keyCode == 27 && ($.copyDialog || $.moveDialog || $.copyrightsDialog)) {
            // esc key in some dialog
            closeDialog();
        }
        else if (e.keyCode == 27 && $.dialog) {
            // esc key in some dialog
            closeDialog();
        }
        else if (e.keyCode == 27 && $('.default-select.active').length) {
            // esc key in select/dropdown input field
            var $selectBlock = $('.default-select.active');
            $selectBlock.find('.default-select-dropdown').fadeOut(200);
            $selectBlock.removeClass('active');
        }
        else if (e.keyCode == 27 && $.msgDialog) {
            // esc in msg dialog
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        }
        else if ((e.keyCode == 13 && $.msgDialog == 'confirmation') && (e.keyCode == 13 && $.msgDialog == 'remove')) {
            // enter in msgDialog
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        }
        else if ((e.keyCode === 113 /* F2 */) && (s.length > 0) && !$.dialog && RightsbyID(M.currentdirid) > 1) {
            // F2 rename in FM
            $.selected = [];
            s.each(function(i, e) {
                $.selected.push($(e).attr('id'));
            });
            renameDialog();
        }
        else if (e.keyCode == 65 && e.ctrlKey && !$.dialog) {
            // ctrl+a/cmd+a - select all
            // $('.grid-table.fm tr').addClass('ui-selected');
            // $('.file-block').addClass('ui-selected');
            selectionManager.select_all();
        }
        else if (e.keyCode == 37 && slideshowid) {
            // left arrow in slideshow dialog
            slideshow_prev();
        }
        else if (e.keyCode == 39 && slideshowid) {
            // right arrow in slideshow dialog
            slideshow_next();
        }
        else if (e.keyCode == 27 && slideshowid) {
            // esc in slideshow dialog
            slideshow(slideshowid, true);
        }
        else if (e.keyCode == 27) {
            // esc
            $.hideTopMenu();
        }

        if (sl && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1) {
            // if something is selected, scroll to that item
            // TODO: this may not be needed with the megaList/new SelectionManager
            var jsp = $($.selectddUIgrid).data('jsp');
            if (jsp) {
                jsp.scrollToElement(sl);
            }
            else if (M.megaRender && M.megaRender.megaList && M.megaRender.megaList._wasRendered) {
                M.megaRender.megaList.scrollToItem(sl.data('id'));
            }
        }

        searchPath();
    });
}
