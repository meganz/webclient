/**
 * Simple way for searching for nodes by their first letter.
 *
 * PS: This is meant to be somehow reusable.
 *
 * @param searchable_elements selector/elements a list/selector of elements which should be searched for the user
 * specified key press character
 * @param containers selector/elements a list/selector of containers to which the input field will be centered
 * (the code will dynamically detect and pick the :visible container)
 *
 * @returns {*}
 * @constructor
 */
var QuickFinder = function(searchable_elements, containers) {
    'use strict'; /* jshint -W074 */

    var self = this;

    var DEBUG = false;

    self._is_active = false; // defined as a prop of this. so that when in debug mode it can be easily accessed from
    // out of this scope

    var last_key = null;
    var next_idx = 0;

    // hide on page change
    if (QuickFinder._pageChangeListenerId) {
        mBroadcaster.removeListener(QuickFinder._pageChangeListenerId);
    }
    QuickFinder._pageChangeListenerId = mBroadcaster.addListener('pagechange', function () {
        if (self.is_active()) {
            self.deactivate();
        }
    });

    $(window).rebind('keypress.quickFinder', function(e) {
        if (!window.M || M.chat) {
            return;
        }

        e = e || window.event;
        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if ($(e.target).is("input, textarea, select") || $.dialog) {
            return;
        }

        var charCode = e.which || e.keyCode; // ff

        if (
            (charCode >= 48 && charCode <= 57) ||
            (charCode >= 65 && charCode <= 123) ||
            charCode > 255
        ) {
            var charTyped = String.fromCharCode(charCode);

            // get the currently visible container
            var $container = $(containers).filter(":visible");
            if (!$container.length) {
                // no active container, this means that we are receiving events for a page, for which we should not
                // do anything....
                return;
            }

            self._is_active = true;

            $(self).trigger("activated");
            self.was_activated();


            var foundIds = [];

            charTyped = charTyped.toLowerCase();

            foundIds = M.v.filter(function(v) {
                var nameStr = "";
                if (v.name) {
                    nameStr = v.name;
                }
                else if (v.firstName) {
                    nameStr = v.firstName;
                }
                else if (v.m) {
                    // ipc and opc
                    nameStr = v.m;
                }

                if (nameStr && nameStr[0] && nameStr[0].toLowerCase() === charTyped) {
                    return true;
                }
            });

            if (
                /* repeat key press, but show start from the first element */
            (last_key != null && (foundIds.length - 1) <= next_idx)
            ||
            /* repeat key press is not active, should reset the target idx to always select the first
             element */
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
            if (foundIds[next_idx]) {
                var nextId = SelectionManager.dynamicNodeIdRetriever(foundIds[next_idx]);
                selectionManager.clear_selection();
                selectionManager.set_currently_selected(nextId, true);

                if (!M.megaRender.megaList) {
                    $(searchable_elements).parents(".ui-selectee, .ui-draggable").removeClass('ui-selected');

                    var $target_elm = $('#' + nextId);

                    $target_elm.parents(".ui-selectee, .ui-draggable").addClass("ui-selected");

                    var $jsp = $target_elm.getParentJScrollPane();
                    if ($jsp) {
                        var $scrolled_elm = $target_elm.parent("a");

                        if (!$scrolled_elm.length) { // not in icon view, its a list view, search for a tr
                            $scrolled_elm = $target_elm.parents('tr:first');
                        }
                        $jsp.scrollToElement($scrolled_elm);
                    }

                    $(self).trigger('search');
                }
            }
        }
        else if (charCode >= 33 && charCode <= 36)
        {
            var e = '.files-grid-view.fm';
            if (M.viewmode == 1) {
                e = '.fm-blocks-view.fm';
            }

            if (M.megaRender && M.megaRender.megaList) {
                switch (charCode) {
                    case 33: /* Page Up   */
                        M.megaRender.megaList.scrollPageUp();
                        break;
                    case 34: /* Page Down */
                        M.megaRender.megaList.scrollPageDown();
                        break;
                    case 35: /* End       */
                        M.megaRender.megaList.scrollToBottom();
                        break;
                    case 36: /* Home      */
                        M.megaRender.megaList.scrollToTop();
                        break;
                }
            }
            else {
                if ($(e + ':visible').length) {
                    e = $('.grid-scrolling-table:visible, .file-block-scrolling:visible');
                    var jsp = e.data('jsp');

                    if (jsp) {
                        switch (charCode) {
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
        }
    });

    self.was_activated = function() {
        // hide the search field when the user had clicked somewhere in the document
        $(document.body).on('mousedown.qfinder', '> *', function () {
            if (!is_fm()) {
                return;
            }
            if (self.is_active()) {
                self.deactivate();
                return false;
            }
        });
    };

    // use events as a way to communicate with this from the outside world.
    self.deactivate = function() {
        self._is_active = false;
        $(self).trigger("deactivated");
        $(document.body).off('mousedown.qfinder', '> *');
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
    '.files-grid-view, .fm-blocks-view.fm, .contacts-grid-table, .contacts-blocks-scrolling,' +
    '.contact-requests-grid, .sent-requests-grid'
);
