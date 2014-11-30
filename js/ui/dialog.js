(function($, scope) {
    var dialogIdx = 0;

    /**
     * Prototype of reusable Dialog, which will eventually implement the following features:
     *  - showing
     *  - hidding
     *  - maintaining state
     *  - collapse/expand
     *  - closable
     *  - have support for events (hidden, shown, collapsed) on a global level (document) OR on a local (per Dialog
     *  instance)
     *  - automatic positioning to screen/element
     *
     *
     * @param opts {Object}
     * @constructor
     */
    var Dialog = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Required: .dialog Class name (excl. the starting ".")
             */
            'className': '',
            'focusable': true,
            'closable': true,
            'expandable': true,
            'expandableButtonClass': '.fm-mega-dialog-size-icon',
            'buttonContainerClassName': 'fm-mega-dialog-bottom',
            'buttonPlaceholderClassName': 'fm-mega-dialog-pad',
            'title': '',
            'buttons': []
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        assert(self.options.className && self.options.className.length > 0, 'missing required option .className');

        self.$dialog = $('.fm-dialog.' + self.options.className);

        self.visible = false;
        self.expanded = false;
        self.dialogIdx = dialogIdx++;

        self.$toggleButton = null;

        self._initGenericEvents();
        self._renderButtons();
    };

    makeObservable(Dialog);

    Dialog.prototype._getEventSuffix = function() {
        return this.options.className.replace(".", "");
    };

    /**
     * Binds once the events for toggling the file picker
     */
    Dialog.prototype._initGenericEvents = function() {
        var self = this;

        if(self.options.focusable) {
            $('input, textarea, select', self.$dialog).rebind('focus.dialog' + self._getEventSuffix(),function() {
                self.$dialog.addClass('focused');
            });
            $('input, textarea, select', self.$dialog).rebind('blur.dialog' + self._getEventSuffix(),function() {
                self.$dialog.removeClass('focused');
            });
        }
        if(self.options.closable) {
            $('.fm-dialog-close', self.$dialog).rebind('click.dialog' + self._getEventSuffix(), function() {
                self.hide();
            });
        }
        if(self.options.expandable) {
            $(self.options.expandableButtonClass, self.$dialog).rebind('click.dialog' + self._getEventSuffix(), function() {
                self.toggleExpandCollapse();
            });
        }
        if(self.options.title) {
            $('.nw-fm-dialog-title', self.$dialog).text(self.options.title);
        }
    };


    /**
     * Render buttons passed to the options.buttons array
     */
    Dialog.prototype._renderButtons = function() {
        var self = this;

        if(self.options.buttons.length > 0) {
            var $container = $('<div class="' + self.options.buttonContainerClassName + '"/>');

            self.options.buttons.forEach(function(buttonMeta, k) {
                var $button = $("<div/>");
                $button
                    .text(
                        buttonMeta.label
                    )
                    .addClass(
                        buttonMeta.className
                    )
                    .rebind('click.dialog' + self._getEventSuffix(), function() {
                        buttonMeta.callback.apply(self, [buttonMeta]);
                    });
                $container.append($button);
            });

            $('.' + self.options.buttonPlaceholderClassName).append($container);
        }
    };


    /**
     * Reposition the element (exposed as pub method, so that when we need to change the content of the dialog on the fly
     * we can call .reposition)
     */
    Dialog.prototype.reposition = function() {
        var self = this;

        if(!self.visible) {
            return;
        }

        if(self.options.expandable) {
            if(!self.expanded && self.$toggleButton) {
                self.$dialog.position({
                    'my': 'center bottom',
                    'at': 'center top-10', /* the only hardcoded value, the arrow height */
                    'of': self.$toggleButton,
                    'collision': 'flipfit flipfit',
                    'using': function (obj, info) {
                        if (info.vertical == "top") {
                            $(this).addClass("flipped"); // the arrow is re-positioned if this .flipped css class name is added to the popup container, to be on top, instead of bottom
                        } else {
                            $(this).removeClass("flipped");
                        }

                        $(this).css({
                            left: obj.left + 'px',
                            top: obj.top + 'px'
                        });
                    }
                });
            } else {
                self.$dialog.position({
                    'my': 'center center',
                    'at': 'center center',
                    'of': $(window)
                });
            }
        }
    };


    /**
     * Show the picker (and if $toggleButton is passed, position it top/bottom)
     * @param [$toggleButton] {{jQuery|DomElement}} optional element to which to attach/render the dialog
     */
    Dialog.prototype.show = function($toggleButton) {
        var self = this;

        if(self.visible) {
            return;
        }

        self.visible = true;

        self.$dialog.removeClass('hidden');

        if($toggleButton) {
            self.collapse($toggleButton);
            $toggleButton.addClass('active');
        }
        if(self.options.closable) {
            $(document.body).rebind('mousedown.dialogClose' + self.dialogIdx, function(e) {
                if($(self.$dialog).find(e.target).length == 0 && $(self.$dialog).is(e.target) === false) {
                    self.hide();
                }
            });
        }
        $(window).rebind('resize.dialogReposition' + self.dialogIdx, function(e) {
            self.reposition();
        });

        self.trigger('onShow');
    };

    /**
     * Hide the picker
     */
    Dialog.prototype.hide = function() {
        var self = this;

        if(!self.visible) {
            return;
        }
        if(self.$toggleButton) {
            self.$toggleButton.removeClass('active');
        }

        self.visible = false;
        self.$toggleButton = null;

        if(self.options.expandable && self.expanded) {
            self.collapse();
        }

        if(self.options.closable) {
            $(document.body).unbind('mousedown.dialogClose' + self.dialogIdx);
        }
        self.$dialog.addClass('hidden');

        $(document.body).unbind('resize.dialogReposition' + self.dialogIdx);

        self.trigger('onHide');
    };

    /**
     * Toggle (show/hide) the picker
     */
    Dialog.prototype.toggle = function($toggleButton) {
        var self = this;
        self.$toggleButton = $($toggleButton);

        if(self.visible) {
            self.hide();
        } else {
            self.show(self.$toggleButton);
        }
    };


    /**
     * Collapse the dialog. If a $toggleButton is passed, then when the dialog is collapsed it will be positioned above
     * or bellow (top/bottom) of that DOM element
     *
     * @param [$toggleButton]
     */
    Dialog.prototype.collapse = function($toggleButton) {
        var self = this;
        self.expanded = false;
        $(self.options.expandableButtonClass)
            .addClass("short-size")
            .removeClass("full-size");

        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');


        $('.fm-dialog-overlay').unbind('click.dialog' + self.dialogIdx);

        if($toggleButton) {
            self.$toggleButton = $toggleButton;
        }

        if(self.$toggleButton) {
            self.$toggleButton.addClass('active');
        }

        self.reposition();

        self.trigger('onCollapse');
    };

    /**
     * Expand the dialog to "full screen" mode
     */
    Dialog.prototype.expand = function() {
        var self = this;
        self.expanded = true;

        self.$dialog.addClass('expanded');

        $('.fm-dialog-overlay').rebind('click.dialog' + self.dialogIdx, function() {
            self.hide();
        });
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');

        $(self.options.expandableButtonClass)
            .removeClass("short-size")
            .addClass("full-size");

        if(self.$toggleButton) {
            self.$toggleButton.removeClass('active');
        }

        self.trigger('onExpand');

        self.reposition();

    };

    /**
     * Toggle (show/hide) the picker
     */
    Dialog.prototype.toggleExpandCollapse = function() {
        var self = this;
        if(self.expanded) {
            self.collapse();
        } else {
            self.expand();
        }
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.Dialog = Dialog;
})(jQuery, window);