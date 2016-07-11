(function($, scope) {
    /**
     * Prototype of an File Picker that is currently:
     *  - Using M.d to show the files of the user
     *  - Allowing multi selection
     *
     *
     * @param opts {Object}
     * @constructor
     */
    var FilePicker = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Optional
             *
             * {HTMLElement}
             */
            'buttonElement': null,

            'sendText': 'Send',
            'cancelText': 'Cancel'
        };

        self.options = $.extend(true, {}, defaultOptions, opts);
        if (self.options.buttonElement) {
            self.options.buttonElement = $(self.options.buttonElement);
        } else {
            delete self.options.buttonElement;
        }


        self.$picker = null;

        self.visible = false;

        self.selection = [];

        self.$jsp = null;

        self.initGenericEvents();
    };

    makeObservable(FilePicker);

    /**
     * Binds once the events for toggling the file picker
     */
    FilePicker.prototype.initGenericEvents = function() {
        var self = this;

        if (self.options.buttonElement) {
            self.options.buttonElement.unbind('click.megafilepicker');

            self.options.buttonElement.bind('click.megafilepicker', function() {
                self.toggle();
            });
        }

        self.on('selectionUpdate', function() {
            if (self.selection.length > 0) {
                $('.attach-send', self.$picker).addClass('active');
            } else {
                $('.attach-send', self.$picker).removeClass('active');
            }
        });
    };

    /**
     * Show the picker
     */
    FilePicker.prototype.show = function() {
        var self = this;

        if (!self.$picker) {
            self._createPicker();
        }
        if (self.visible) {
            return;
        }

        self.visible = true;

        if (self.options.buttonElement) {
            self.options.buttonElement.addClass('active'); /* required to be visible, before the posY calc for the correct
                                                              re-positioning of the dialog */

            var $container = self.options.buttonElement.parent(); // in this attach files to chat use case> $('.fm-chat-line-block')
            var positionY = $container.outerHeight() - $('.fm-chat-attach-arrow', self.options.buttonElement).position().top;

            self.$picker.css('bottom', positionY - 17 + 'px');
        }

        self.$picker.removeClass('hidden');
        self.$picker.addClass('active');

        // auto hide on click out of the dialog
        $(document).unbind('mouseup.megafilepicker');
        $(document).bind('mouseup.megafilepicker', function(e) {
            if ($(e.target).parents('.fm-chat-attach-popup').size() == 0 && (!self.options.buttonElement || !$(e.target).is(self.options.buttonElement))) {
                self.hide();
            }
        });

        if (!self.$jsp) {
            $('.fm-chat-attach-scrolling', self.$picker).jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});

            self.$jsp = $('.fm-chat-attach-scrolling', self.$picker).data('jsp');
        }

        // reset state
        self.$jsp.scrollTo(0, 0);
    };

    /**
     * Hide the picker
     */
    FilePicker.prototype.hide = function() {
        var self = this;

        if (!self.visible) {
            return;
        }
        // auto hide on click out of the picker - cleanup
        $(document).unbind('mouseup.megafilepicker');
        $(document).unbind('keypress.megafilepicker');

        self.visible = false;
        self.$picker.addClass('hidden');
        self.$picker.removeClass('active');

        if (self.options.buttonElement) {
            self.options.buttonElement.removeClass('active');
        }

        // cleaup & reset state
        if (self.$jsp) {
            self.$jsp.destroy();
        }
        self.$picker.remove();
        self.$picker = null;
        self.selection = [];
        $('.attach-send', self.$picker).removeClass('active');
        self.$jsp = null;
    };

    /**
     * Toggle (show/hide) the picker
     */
    FilePicker.prototype.toggle = function() {
        var self = this;
        if (self.visible) {
            self.hide();
        } else {
            self.show();
        }
    };


    /**
     * Internal method that will create the required DOM elements for displaying the File picker and load the
     * initial file nodes (e.g. in M.RootID).
     * This method is used to lazy load the DOM nodes and events in to the current document when .show is called for a
     * first time.
     *
     * @private
     */
    FilePicker.prototype._createPicker = function() {

        var self = this;
        self.$picker = $(FilePicker.PICKER_TEMPLATE);

        $('.attach-send', self.$picker).text(
            self.options.sendText
        );

        $('.attach-cancel', self.$picker).text(
            self.options.cancelText
        );

        $('.cloud-drive-item span', self.$picker).text(
            l[164]
        );

        self.$picker[
            self.visible ? 'removeClass' : 'addClass'
        ]('hidden');

        self._loadNodes(
            M.RootID
        );


        if (self.options.buttonElement) {
            self.$picker.insertAfter(self.options.buttonElement);
        } else {
            $(document.body).append(self.$picker);
        }

        self._initPickerEvents();

        $('tbody', self.$picker).disableSelection();
    };

    /**
     * Internal method that will bind all events to the picker (called when the DOM for the picker is available).
     *
     * @private
     */
    FilePicker.prototype._initPickerEvents = function() {
        var self = this;
        var $d = self.$picker;

        self.on('repaint', function() {
            if (self.$jsp) {
                self.$jsp.reinitialise();
            }
        });

        $('.attach-cancel, .nw-fm-close-button', $d).bind('click', function() {
            self.selection = [];

            self.trigger('cancel');

            self.hide();
        });

        $('.attach-send', $d).bind('click', function() {
            self.trigger('doneSelecting', [self.selection]);

            self.hide();
        });

        self.$picker
            .undelegate('dblclick.megafilepicker') // folder open
            .delegate('tr', 'dblclick.megafilepicker', function(e) {
                var $this = $(this);
                var $nodeContainer = $this.parent();
                var nodeHash = $this.data('k');

                if ($this.is('.folder')) {
                    self._loadNodes(nodeHash);
                } else {
                    $this.addClass('ui-selected');


                    self.selection = [$this.data('k')];
                    self.trigger('selectionUpdate', [$this.data('k')]);

                    $('.attach-send', $d).trigger('click');
                }
            })
            .undelegate('click.megafilepicker')
            .delegate('tr', 'click.megafilepicker', function(e) {
                var $this = $(this);
                var $nodeContainer = $this.parent();
                var nodeHash = $this.data('k');



                // this is a select call
                // lets distinguish the multi select VS single select actions:
                // 1. multi select
                if (e.ctrlKey || e.metaKey) {
                    if (!$this.is(".ui-selected")) {
                        $this.addClass('ui-selected');


                        self.selection.push(
                            $this.data('k')
                        );
                        self.trigger('selectionUpdate', [$this.data('k')]);
                    } else {
                        $this.removeClass('ui-selected');
                        self.selection = $.grep(self.selection, function(v) {
                            return v != $this.data('k');
                        });

                        $('#n_' + $this.data('k'), self.$picker).removeClass('ui-selected');

                        self.trigger('selectionUpdate', [$this.data('k')]);
                    }
                } else if (e.shiftKey) {
                    // this flag will be used while looping over the nodes to detect when to START selecting nodes
                    var selectionStarted = self.selection.length == 0 ? true : false;

                    // select from first node from the current list
                    var $tbody = $this.parents('tbody');
                    var $firstSelectedNode = null;
                    var firstSelectedNodeIdx = null;
                    var $lastSelectedNode = $(this);
                    var lastSelectedNodeIdx = null;


                    // convert all visible items to numeric inc. indexes, so that we can decide if the SHIFT selection
                    // should be applied from top to bottom or from bottom to top
                    var availableNodes = [];
                    $.each($('> tr', $tbody), function(k, item) {
                        availableNodes.push(
                            $(item).data('k')
                        );
                    });

                    // set firstSelectedNode depending on the current selection
                    if (self.selection.length == 0) {
                        $firstSelectedNode = $('> tr:first', $tbody);
                    } else {
                        $firstSelectedNode = $('> tr.ui-selected:first', $tbody);
                    }

                    // set lastSelectedNode depending on the currently clicked item
                    $lastSelectedNode = $this;


                    // convert all visible items to numeric inc. indexes, so that we can decide if the SHIFT selection
                    // should be applied from top to bottom or from bottom to top
                    var availableNodes = [];
                    $.each($('> tr', $tbody), function(k, item) {
                        availableNodes.push(
                            $(item).data('k')
                        );
                    });

                    // set indexes

                    firstSelectedNodeIdx = $.inArray($firstSelectedNode.data('k'), availableNodes);
                    lastSelectedNodeIdx = $.inArray($lastSelectedNode.data('k'), availableNodes);

                    // swap if down -> top selection should be done;
                    if (firstSelectedNodeIdx > lastSelectedNodeIdx) {
                        var tmp = firstSelectedNodeIdx;
                        firstSelectedNodeIdx = lastSelectedNodeIdx;
                        lastSelectedNodeIdx = tmp;
                    }

                    self.selection = [];

                    $.each($('> tr', $tbody), function(k, item) {
                        var $item = $(item);

                        if (k >= firstSelectedNodeIdx && k <= lastSelectedNodeIdx) {
                            self.selection.push(
                                $item.data('k')
                            );
                            $item.addClass('ui-selected');
                        }
                        if (k > lastSelectedNodeIdx) {
                            return false; // break; if out of range, will save some loops
                        }
                    });
                    self.trigger('selectionUpdate', [self.selection]);
                } else {
                    // 2. single select (removes previously selected items from the current selection)
                    $('tr.ui-selected', self.$picker).removeClass('ui-selected');

                    self.selection = [
                        $this.data('k')
                    ];
                    $this.addClass('ui-selected');

                    self.trigger('selectionUpdate', [$this.data('k')]);
                }
            })
    };

    /**
     * Internal method that will load all file/folder nodes from M.d and append it to `$nodeContainer`
     *
     * @param parentNodeId {String} filter by parent
     * @param [$nodeContainer] {HTMLElement}
     * @private
     */
    FilePicker.prototype._loadNodes = function(parentNodeId, $nodeContainer) {

        var self = this;
        var filterFunc = function(n) {
            return n.name && n.p == parentNodeId;
        };
        var share = new mega.Share();

        $nodeContainer = $('tbody', self.$picker);
        $nodeContainer.empty();

        var nodes = M.getFilterBy(filterFunc);

        // XX: can we make this work better by removing this step (separation of all nodes to 2 diff arrays and then
        // merging them back)

        var dirNodes = [];
        var fileNodes = [];

        $.each(nodes, function(k, v) {
            if (v.t == 1) {
                dirNodes.push(v);
            } else {
                fileNodes.push(v);
            }
        });


        // sort them separately
        var sortFn = function(a, b) {
            if (typeof a.name == 'string' && typeof b.name == 'string') return a.name.localeCompare(b.name);
            else return -1;
        };

        dirNodes = dirNodes.sort(sortFn);
        fileNodes = fileNodes.sort(sortFn);


        // combine them back
        nodes = dirNodes.concat(fileNodes);

        // cleanup ASAP
        delete dirNodes;
        delete fileNodes;

        $.each(nodes, function(arrIdx, n) {
            var $newNode = $(FilePicker.NODE_TEMPLATE);
            $('.tranfer-filetype-txt', $newNode).text(
                n.name
            );

            if (n.t === 0) {// is file
                $('.transfer-filtype-icon', $newNode).addClass(
                    fileIcon(n)
                );
            }
            else {
                $newNode.addClass("folder");

                if (share.isShareExist([n.h], true, true, false)) {
                    $('.transfer-filtype-icon', $newNode).addClass(
                        "folder-shared"
                    );
                }
                else {
                    $('.transfer-filtype-icon', $newNode).addClass(
                        "folder"
                    );
                }
            }

            $newNode.data('k', n.h);
            $newNode.attr('id', 'n_' + n.h);

            $nodeContainer.append(
                $newNode
            );
        });

        // render breadcrump
        var $bcContainer = $('.fm-chat-attach-top > span', self.$picker);
        $bcContainer.empty();
        var parentNode = M.d[parentNodeId];
        var first = true;

        while(parentNode != undefined) {
//
            var $item = $('<a class="fm-breadcrumbs"><span class="right-arrow-bg ui-draggable"><span></span></span></a>');

            if (parentNode.h != M.RootID) {
                $('span', $item).text(parentNode.name);
                $item.addClass("folder");
            } else {
                $('span', $item).text("Cloud Drive"); // TODO: use l[]!
                $item.addClass("cloud-drive");
            }

            $item.data('h', parentNode.h);

            $item.bind('click', function() {
                self._loadNodes($(this).data('h'));
            });
            $item.addClass("contains-directories");
            if (!first) {
                $item.addClass("has-next-button");
            }
            $bcContainer.prepend($item);

            first = false;
            parentNode = M.d[parentNode.p];
        }
        self.trigger('repaint');
    };

    /**
     * Mainly used by unit tests to cleanup in afterEach.
     */
    FilePicker.prototype.destroy = function() {
        var self = this;
        if (self.$picker) {
            self.$jsp.destroy();
            self.$picker.remove();
            self.$picker = null;
            self.$jsp = null;
            self.visible = false;
            self.selection = [];
        }
    };


    /**
     * CONST that contains the HTML code of the dialog
     *
     * @type {string}
     */
    FilePicker.PICKER_TEMPLATE = '<div class="fm-chat-attach-popup fm-dialog-popup">\n' +
'           <div class="fm-chat-attach-top">\n' +
'               <span></span>\n' +
'                <div class="clear"></div>\n' +
'                <div class="nw-fm-close-button"></div>\n' +
'            </div>\n' +
'            <div class="fm-chat-attach-scrolling">\n' +
'                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="grid-table fm">\n' +
'                    <tbody>\n' +
'                    </tbody>\n' +
'                </table>\n' +
'            </div>\n' +
'            <div class="fm-chat-attach-bottom">\n' +
'                <div class="fm-chat-attach-button attach-send red">\n' +
'                Send\n' +
'                </div>\n' +
'                <div class="fm-chat-attach-button attach-cancel">\n' +
'                Cancel\n' +
'                </div>\n' +
'                <div class="clear"></div>\n' +
'            </div>\n' +
'        </div>';

    /**
     * CONST containing the HTML code required for a single node (file or folder)
     *
     * @type {string}
     */
    FilePicker.NODE_TEMPLATE = '<tr>\n' +
'        <td>\n' +
'            <span class="transfer-filtype-icon"> </span>\n' +
'            <span class="tranfer-filetype-txt"></span>\n' +
        '</td>\n' +
    '</tr>';

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.FilePicker = FilePicker;
})(jQuery, window);
