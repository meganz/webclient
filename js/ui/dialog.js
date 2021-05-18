(function($, scope) {
    'use strict';
    var dialogIdx = 0;
    var startingZIndex = 1300;

    /**
     * Prototype of reusable Dialog, which will eventually implement the following features:
     *  - showing
     *  - hiding
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

            /**
             * features:
             */
            'focusable': true,
            'closable': true,
            'closableByEsc': false,
            'expandable': true,
            'requiresOverlay': false,
            'defaultButtonStyle': true,

            /**
             * css class names
             */
            'expandableButtonClass': '.fm-mega-dialog-size-icon',
            'buttonContainerClassName': '',
            'buttonPlaceholderClassName': 'fm-mega-dialog-pad',

            /**
             * optional:
             */
            'title': '',
            'notAgainTag': null,
            'buttons': []
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        assert(self.options.className && self.options.className.length > 0, 'missing required option .className');

        self.$dialog = $('.mega-dialog.' + self.options.className);

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

        if (self.options.focusable) {
            $('input, textarea, select', self.$dialog).rebind('focus.dialog' + self._getEventSuffix(),function() {
                self.$dialog.addClass('focused');
            });
            $('input, textarea, select', self.$dialog).rebind('blur.dialog' + self._getEventSuffix(),function() {
                self.$dialog.removeClass('focused');
            });
        }
        if (self.options.closable) {
            $('button.js-close', self.$dialog).rebind('click.dialog' + self._getEventSuffix(), function() {
                self.hide();
            });
        }
        if (self.options.expandable) {
            $(self.options.expandableButtonClass, self.$dialog).rebind('click.dialog' + self._getEventSuffix(), function() {
                self.toggleExpandCollapse();
            });
        }
        if (self.options.title) {
            $('header h2, header h3', self.$dialog).first().text(self.options.title);
        }

        // link dialog size with the textareas when/if resized by the user using the native resize func
        $('textarea', self.$dialog)
            .rebind('mouseup mousemove', function() {
                if (this.oldwidth  === null){this.oldwidth  = this.style.width;}
                if (this.oldheight === null){this.oldheight = this.style.height;}
                if (this.style.width != this.oldwidth || this.style.height != this.oldheight){
                    $(this).resize();
                    this.oldwidth  = this.style.width;
                    this.oldheight = this.style.height;
                }
            })
            // .rebind('resize', function() {
            //     self.reposition();
            // });
    };


    /**
     * Render buttons passed to the options.buttons array
     */
    Dialog.prototype._renderButtons = function() {
        var self = this;

        let $container = null;
        let $footer = null;
        if (self.options.buttons.length) {
            $footer = $('<footer />');
            $container = $('<div class="footer-container ' + self.options.buttonContainerClassName + '"/>');
        }
        else if (self.options.notAgainTag) {
            $footer = $('<footer />');
        }

        let $aside;
        if (self.options.notAgainTag) {
            $aside = $('<aside class="align-start" />');
            $aside.safeAppend(`<div class="not-again checkbox-block fm-chat-inline-dialog-button-sendFeedback">
                <div class="checkdiv checkboxOff">
                    <input type="checkbox" name="confirmation-checkbox" class="checkboxOff">
                </div>
                <label for="confirmation-checkbox" class="radio-txt">${l[229]}</label>
            </div>`);

            $('.not-again.checkbox-block', $aside).rebind('click.dialog', function() {
                var $c = $('.not-again.checkbox-block .checkdiv', $aside);
                if ($c.hasClass('checkboxOff')) {
                    $c.removeClass('checkboxOff').addClass('checkboxOn');
                    localStorage[self.options.notAgainTag] = 1;
                }
                else {
                    $c.removeClass('checkboxOn').addClass('checkboxOff');
                    delete localStorage[self.options.notAgainTag];
                }
            });

        }

        if (self.options.buttons.length > 0) {
            self.options.buttons.forEach(function(buttonMeta, k) {
                let $button;
                if (self.options.defaultButtonStyle) {
                    $button = $('<button class="mega-button"><span></span></button>');
                } else {
                    $button = $('<button><span></span></button>');
                }
                $button
                    .addClass(
                        buttonMeta.className
                    )
                    .rebind('click.dialog' + self._getEventSuffix(), function() {
                        buttonMeta.callback.apply(self, [buttonMeta]);
                    })
                    .find('span')
                        .text(
                            buttonMeta.label
                        );
                $container.append($button);
            });
        }

        if ($footer) {
            $footer.append($container);
            self.$dialog.append($footer);

            if ($aside) {
                $footer.append($aside);
            }
        }
    };

    /**
     * Show the picker (and if $toggleButton is passed, position it top/bottom)
     * @param [$toggleButton] {jQuery|DomElement} optional element to which to attach/render the dialog
     */
    Dialog.prototype.show = function($toggleButton) {
        var self = this;

        if (self.visible) {
            return;
        }
        if (!self.$dialog.css('z-index')) {
            self.$dialog.css('z-index', dialogIdx + startingZIndex);
        }

        self.trigger('onBeforeShow');

        self.visible = true;

        self.$dialog.removeClass('hidden');

        if ($toggleButton) {
            self.collapse($toggleButton);
            $toggleButton.addClass('active');
        }
        if (self.options.closable) {
            $(document.body).rebind('mousedown.dialogClose' + self.dialogIdx, function(e) {
                if ($(self.$dialog).find(e.target).length == 0 && $(self.$dialog).is(e.target) === false && !$(self.$dialog).is(".fm-mega-dialog")) {
                    self.hide();
                    return false;
                }
            });
        }
        if (self.options.closableByEsc) {
            $(document).rebind('keyup.' + self.options.className, function(evt) {
                if (evt.keyCode == 27) {
                    self.hide();
                }
            });
        }
        if (!self.options.expandable || self.options.requiresOverlay) {
            self._showOverlay();
        }

        // $(window).rebind('resize.dialogReposition' + self.dialogIdx, function(e) {
        //     self.reposition();
        // });
        // self.reposition();

        self.trigger('onShow');
    };

    /**
     * Hide the picker
     */
    Dialog.prototype.hide = function() {
        var self = this;

        if (!self.visible) {
            return;
        }
        if (self.$toggleButton) {
            self.$toggleButton.removeClass('active');
        }

        self.visible = false;
        self.$toggleButton = null;

        if (self.options.expandable && self.expanded) {
            self.collapse();
        }

        if (self.options.closable) {
            $(document.body).off('mousedown.dialogClose' + self.dialogIdx);
        }

        if (self.options.closableByEsc) {
            $(document).off('keyup.' + self.options.className);
        }

        self.$dialog.addClass('hidden');

        if (!self.options.expandable && self.options.requiresOverlay) {
            self._hideOverlay();
        }

        $(document.body).off('resize.dialogReposition' + self.dialogIdx);

        self.trigger('onHide');
    };

    /**
     * Toggle (show/hide) the picker
     */
    Dialog.prototype.toggle = function($toggleButton) {
        var self = this;
        self.$toggleButton = $($toggleButton);

        if (self.visible) {
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

        self._hideOverlay();

        if ($toggleButton) {
            self.$toggleButton = $toggleButton;
        }

        if (self.$toggleButton) {
            self.$toggleButton.addClass('active');
        }

        // self.reposition();

        self.trigger('onCollapse');
    };

    /**
     * Expand the dialog to "full screen" mode
     */
    Dialog.prototype.expand = function() {
        var self = this;
        self.expanded = true;

        self.$dialog.addClass('expanded');

        self._showOverlay();

        $(self.options.expandableButtonClass)
            .removeClass("short-size")
            .addClass("full-size");

        if (self.$toggleButton) {
            self.$toggleButton.removeClass('active');
        }

        self.trigger('onExpand');

        // self.reposition();

    };

    Dialog.prototype._showOverlay = function() {
        var self = this;
        $('.fm-dialog-overlay').rebind('click.dialog' + self.dialogIdx, function() {
            self.hide();
        });
        $('.fm-dialog-overlay').removeClass('hidden');

        if (is_mobile) {
            $('body').addClass('overlayed');
        }
        else if (!$('body').hasClass('bottom-pages')) {
            $('body').addClass('overlayed');
        }
    };

    Dialog.prototype._hideOverlay = function() {
        var self = this;
        if (!$('.mega-dialog.arrange-to-back').length) {
            $('.fm-dialog-overlay').addClass('hidden');
            $('body').removeClass('overlayed');
        }

        $('.fm-dialog-overlay').off('click.dialog' + self.dialogIdx);
    };
    /**
     * Toggle (show/hide) the picker
     */
    Dialog.prototype.toggleExpandCollapse = function() {
        var self = this;
        if (self.expanded) {
            self.collapse();
        } else {
            self.expand();
        }
    };

    /**
     * Hide & cleanup
     */
    Dialog.prototype.destroy = function() {
        var self = this;
        if (self.visible) {
            self.hide();
        }
        if (self.$dialog) {
            self.$dialog.remove();
        }
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.Dialog = Dialog;
})(jQuery, window);
