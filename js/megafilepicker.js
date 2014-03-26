(function($) {
    /**
     * Prototype of an File Picker that is currently:
     *  - Using M.d to show the files of the user
     *  - Allowing multi selection
     *
     *
     * @param opts {Object} You should provide a `buttonElement` containing a DOM Element which should look like this::
     *                      <div class="fm-chat-attach-file"><div class="fm-chat-attach-arrow"></div></div>
     * @constructor
     */
    var MegaFilePicker = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Required
             *
             * {HTMLElement}
             */
            'buttonElement': null,

            'sendText': 'Send',
            'cancelText': 'Cancel'
        };

        self.options = $.extend(true, {}, defaultOptions, opts);
        self.options.buttonElement = $(self.options.buttonElement);


        self.$picker = null;

        self.visible = false;

        self.selection = [];

        self.$jsp = null;

        self.initGenericEvents();
    };

    makeObservable(MegaFilePicker);

    /**
     * Binds once the events for toggling the file picker
     */
    MegaFilePicker.prototype.initGenericEvents = function() {
        var self = this;

        self.options.buttonElement.unbind('click.megafilepicker');

        self.options.buttonElement.bind('click.megafilepicker', function() {
            self.toggle();
        });

        self.on('selectionUpdate', function() {
            if(self.selection.length > 0) {
                $('.attach-send', self.$picker).addClass('active');
            } else {
                $('.attach-send', self.$picker).removeClass('active');
            }
        });
    };

    /**
     * Show the picker
     */
    MegaFilePicker.prototype.show = function() {
        var self = this;

        if(!self.$picker) {
            self._createPicker();
        }
        if(self.visible) {
            return;
        }

        self.visible = true;

        self.options.buttonElement.addClass('active'); /* required to be visible, before the posY calc for the correct
                                                          re-positioning of the dialog */

        var $container = self.options.buttonElement.parent(); // in this attach files to chat use case> $('.fm-chat-line-block')
        var positionY = $container.outerHeight() - $('.fm-chat-attach-arrow', self.options.buttonElement).position().top;

        self.$picker.css('bottom', positionY - 17 + 'px');

        self.$picker.removeClass('hidden');

        // auto hide on click out of the dialog
        $(document).unbind('mouseup.megafilepicker');
        $(document).bind('mouseup.megafilepicker', function(e) {
            if($(e.target).parents('.fm-chat-attach-popup').size() == 0 && !$(e.target).is(self.options.buttonElement)) {
                self.hide();
            }
        });

        if(!self.$jsp) {
            $('.fm-move-dialog-body', self.$picker).jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});

            self.$jsp = $('.fm-move-dialog-body', self.$picker).data('jsp');
        }

        // reset state
        self.$jsp.scrollTo(0, 0);
    };

    /**
     * Hide the picker
     */
    MegaFilePicker.prototype.hide = function() {
        var self = this;

        if(!self.visible) {
            return;
        }
        // auto hide on click out of the picker - cleanup
        $(document).unbind('mouseup.megafilepicker');
        $(document).unbind('keypress.megafilepicker');

        self.visible = false;
        self.$picker.addClass('hidden');
        self.options.buttonElement.removeClass('active');

        // cleaup & reset state
        if(self.$jsp) {
            self.$jsp.destroy();
        }
        $('.root', self.$picker).empty();
        self.$picker = null;
        self.selection = [];
        $('.attach-send', self.$picker).removeClass('active');
        self.$jsp = null;
    };

    /**
     * Toggle (show/hide) the picker
     */
    MegaFilePicker.prototype.toggle = function() {
        var self = this;
        if(self.visible) {
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
    MegaFilePicker.prototype._createPicker = function() {

        var self = this;
        self.$picker = $(MegaFilePicker.PICKER_TEMPLATE);

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

        self._initPickerEvents();

        self.$picker.insertAfter(self.options.buttonElement);
    };

    /**
     * Internal method that will bind all events to the picker (called when the DOM for the picker is available).
     *
     * @private
     */
    MegaFilePicker.prototype._initPickerEvents = function() {
        var self = this;
        var $d = self.$picker;

        self.on('repaint', function() {
            if(self.$jsp) {
                self.$jsp.reinitialise();
            }
        });

        $('.attach-cancel', $d).bind('click', function() {
            self.selection = [];

            self.trigger('cancel');

            self.hide();
        });

        $('.attach-send', $d).bind('click', function() {
            self.trigger('doneSelecting', [self.selection]);

            self.hide();
        });

        self.$picker.undelegate('mouseup.megafilepicker');
        self.$picker.delegate('.fm-tree-folder', 'mouseup.megafilepicker', function(e) {
            var $this = $(this);
            var $nodeContainer = $this.parent();
            var nodeHash = $this.data('k');


            var $ulContainer = $('ul', $nodeContainer);

            // detect SELECT vs Folder expand call
            if ($this.is('.contains-folders') && (e.offsetX < 25 || e.layerX < 25)) {
                // create UL and expand
                if($ulContainer.is('.opened')) {
                    $ulContainer.removeClass('opened');
                    $this.removeClass('opened expanded');
                } else {
                    $ulContainer.addClass('opened');
                    $this.addClass('opened expanded');
                }

                if($('li', $ulContainer).size() > 0) {
                    $('li', $ulContainer).remove();
                }

                self._loadNodes(nodeHash, $ulContainer);
            } else {
                // this is a select call
                // lets distinguish the multi select VS single select actions:
                // 1. multi select
                if(e.ctrlKey || e.metaKey) {
                    if(!$this.is(".active")) {
                        $this.addClass('active');


                            self.selection.push(
                                $this.data('k')
                            );
                        self.trigger('selectionUpdate', [$this.data('k')]);
                    } else {
                        $this.removeClass('active');
                        self.selection = $.grep(self.selection, function(v) {
                            return v != $this.data('k');
                        });

                        $('#n_' + $this.data('k'), self.$picker).removeClass('active');

                        self.trigger('selectionUpdate', [$this.data('k')]);
                    }
                } else if(e.shiftKey) {
                    // this flag will be used while looping over the nodes to detect when to START selecting nodes
                    var selectionStarted = self.selection.length == 0 ? true : false;

                    // select from first node from the current list
                    var $ul = $this.parents('ul');
                    var $firstSelectedNode = null;
                    var firstSelectedNodeIdx = null;
                    var $lastSelectedNode = $(this);
                    var lastSelectedNodeIdx = null;


                    // convert all visible items to numeric inc. indexes, so that we can decide if the SHIFT selection
                    // should be applied from top to bottom or from bottom to top
                    var availableNodes = [];
                    $.each($('> li > a.fm-tree-folder', $ul), function(k, item) {
                        availableNodes.push(
                            $(item).data('k')
                        );
                    });

                    // set firstSelectedNode depending on the current selection
                    if(self.selection.length == 0) {
                        $firstSelectedNode = $('> li > a.fm-tree-folder:first', $ul);
                    } else {
                        $firstSelectedNode = $('> li > a.fm-tree-folder.active:first', $ul);
                    }

                    // set lastSelectedNode depending on the currently clicked item
                    $lastSelectedNode = $this;


                    // convert all visible items to numeric inc. indexes, so that we can decide if the SHIFT selection
                    // should be applied from top to bottom or from bottom to top
                    var availableNodes = [];
                    $.each($('> li > a.fm-tree-folder', $ul), function(k, item) {
                        availableNodes.push(
                            $(item).data('k')
                        );
                    });

                    // set indexes

                    firstSelectedNodeIdx = $.inArray($firstSelectedNode.data('k'), availableNodes);
                    lastSelectedNodeIdx = $.inArray($lastSelectedNode.data('k'), availableNodes);

                    // swap if down -> top selection should be done;
                    if(firstSelectedNodeIdx > lastSelectedNodeIdx) {
                        var tmp = firstSelectedNodeIdx;
                        firstSelectedNodeIdx = lastSelectedNodeIdx;
                        lastSelectedNodeIdx = tmp;
                    }

                    self.selection = [];

                    $.each($('> li > a.fm-tree-folder', $ul), function(k, item) {
                        var $item = $(item);

                        if(k >= firstSelectedNodeIdx && k <= lastSelectedNodeIdx) {
                            self.selection.push(
                                $item.data('k')
                            );
                            $item.addClass('active');
                        }
                        if(k > lastSelectedNodeIdx) {
                            return false; //break; if out of range, will save some loops
                        }
                    });
                    self.trigger('selectionUpdate', [self.selection]);
                } else {
                    // 2. single select (removes previously selected items from the current selection)
                    $('.fm-tree-folder.active', self.$picker).removeClass('active');

                    self.selection = [
                        $this.data('k')
                    ];
                    $this.addClass('active');

                    self.trigger('selectionUpdate', [$this.data('k')]);
                }
            }
        });
    };

    /**
     * Internal method that will load all file/folder nodes from M.d and append it to `$nodeContainer`
     *
     * @param parentNodeId {String} filter by parent
     * @param [$nodeContainer] {HTMLElement}
     * @private
     */
    MegaFilePicker.prototype._loadNodes = function(parentNodeId, $nodeContainer) {

        var self = this;
        var filterFunc = function(n) {
            return n.name && n.p == parentNodeId;
        };

        if(!$nodeContainer) {
            if(parentNodeId == M.RootID) {
                $nodeContainer = $('.root', self.$picker);
            } else {
                throw new Error("No way to easily traverse the correct parent container, so .. please specify the $nodeContainer");
            }
        }

        var nodes = M.getFilterBy(filterFunc);

        //XX: can we make this work better by removing this step (separation of all nodes to 2 diff arrays and then
        // merging them back)

        var dirNodes = [];
        var fileNodes = [];

        $.each(nodes, function(k, v) {
            if(v.t == 1) {
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
            var $newNode = $(MegaFilePicker.NODE_TEMPLATE);
            var $currentNode = $('.fm-tree-folder', $newNode);
            $('span', $currentNode).text(
                n.name
            );


            if(n.t == 0) {
                // is file
                var $icon = $('<span class="transfer-filtype-icon ' + fileicon(n) + '"></span>');
                $currentNode.prepend(
                    $icon
                );
                $currentNode.addClass('tree-file');
            } else {
                // contains folders OR files?
                if(M.getFilterBy(function(n2) {
                    return n2.name && n2.p == n.h;
                }).length > 0) {
                    $currentNode.addClass('contains-folders');
                    $currentNode.parent().append(
                        $('<ul></ul>')
                    );
                }
            }

            $currentNode.data('k', n.h);
            $newNode.attr('id', 'n_' + n.h);

            $nodeContainer.append(
                $newNode
            );
        });

        self.trigger('repaint');
    };

    /**
     * Mainly used by unit tests to cleanup in afterEach.
     */
    MegaFilePicker.prototype.destroy = function() {
        var self = this;
        if(self.$picker) {
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
    MegaFilePicker.PICKER_TEMPLATE = '<div class="fm-chat-attach-popup">\n' +
'            <div class="fm-chat-attach-scrolling">\n' +
'                <div class="fm-move-dialog-body">\n' +
'                    <div class="fm-move-dialog-pad">\n' +
'                        <span class="fm-connector-first"></span>\n' +
'                        <a class="fm-tree-header opened cloud-drive-item active ui-droppable contains-subfolders expanded">\n' +
'                            <span>Cloud Drive</span>\n' +
'                        </a>\n' +
'                        <ul class="fm-subfolders opened root">\n' +
'                        </ul>\n' +
'                    </div>\n' +
'                </div>\n' +
'            </div>\n' +
'            <div class="fm-chat-attach-bottom">\n' +
'                <div class="fm-chat-attach-button attach-send">\n' +
'                Send\n' +
'                </div>\n' +
'                <div class="fm-chat-attach-button attach-cancel active">\n' +
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
    MegaFilePicker.NODE_TEMPLATE = '<li>\n' +
    '                                <span class="fm-connector"></span>\n' +
    '                                <span class="fm-horizontal-connector"></span>\n' +
    '                                <!-- Add "active" class to select file or folder !-->\n' +
    '                                <a class="fm-tree-folder"><span>name</span></a>\n' +
    '                            </li>\n';

    // export
    window.MegaFilePicker = MegaFilePicker;
})(jQuery);