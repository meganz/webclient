(function($) {
    /**
     * Incoming Call Dialog
     *
     * Note: Should be initialized only once.
     *
     * @param opts {Object}
     * @constructor
     */
    var MegaIncomingCallDialog = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Text message shown in the incoming call dialog
             *
             * {String}
             */
            'textMessage': "Incoming call from $username" /* TODO: use l[] */
        };

        self.options = $.extend(true, {}, defaultOptions, opts);


        self.$dialog = null;

        self.visible = false;

    };

    makeObservable(MegaIncomingCallDialog);


    /**
     * Show the dialog
     */
    MegaIncomingCallDialog.prototype.show = function(username, avatarImg, answerAudioFn, answerVideoFn, cancelFn) {
        var self = this;

        if(!self.$dialog) {
            self._createDialog();
        } else {
            // hide the old dialog and show the new one
            self.destroy();
            self._createDialog();
        }
        if(self.visible) {
            return;
        }


        $('.incoming-call-username', self.$dialog).text(username);

        $('.icoming-call-header', self.$dialog).text(
            self.options.textMessage.replace("$username", username)
        );

        if(avatarImg) {
            $('.incoming-call-avatar img', self.$dialog).attr(
                'src',
                avatarImg
            );
        }


        $('.cancel-call', self.$dialog).unbind('mouseup');
        $('.cancel-call', self.$dialog).bind('mouseup', function() {
            cancelFn();
        });

        $('.audio-call', self.$dialog).unbind('mouseup');
        $('.audio-call', self.$dialog).bind('mouseup', function() {
            answerAudioFn();
        });

        $('.video-call', self.$dialog).unbind('mouseup');
        $('.video-call', self.$dialog).bind('mouseup', function() {
            answerVideoFn();
        });


        self.visible = true;

        self.$dialog.removeClass('hidden');
//        $('.fm-dialog-overlay').removeClass('hidden');

        // auto hide on click out of the dialog
        $(document).unbind('mouseup.MegaIncomingCallDialog');
        $(document).bind('mouseup.MegaIncomingCallDialog', function(e) {
            if($(e.target).parents('.fm-chat-attach-popup').size() == 0 && !$(e.target).is(self.options.buttonElement)) {
                self.hide();
            }
        });

        //todo: close on esc (for all dialogs?)
    };

    /**
     * Hide the dialog
     */
    MegaIncomingCallDialog.prototype.hide = function() {
        var self = this;

        if(!self.visible) {
            return;
        }
        // auto hide on click out of the dialog - cleanup
        $(document).unbind('mouseup.MegaIncomingCallDialog');
        $(document).unbind('keypress.MegaIncomingCallDialog');

        self.visible = false;
        self.$dialog.addClass('hidden');
//        $('.fm-dialog-overlay').addClass('hidden');

        // cleaup & reset state
        self.$dialog.remove();
        self.$dialog = null;
    };

    /**
     * Toggle (show/hide) the dialog
     */
    MegaIncomingCallDialog.prototype.toggle = function() {
        var self = this;
        if(self.visible) {
            self.hide();
        } else {
            self.show();
        }
    };


    /**
     * Internal method that will create the required DOM elements for displaying the dialog
     *
     * @private
     */
    MegaIncomingCallDialog.prototype._createDialog = function() {

        var self = this;
        self.$dialog = $(MegaIncomingCallDialog.DIALOG_TEMPLATE);

        $(document.body).append(self.$dialog);
    };



    /**
     * Should be used by unit tests and when there is a new incoming call while the old dialog is still open
     */
    MegaIncomingCallDialog.prototype.destroy = function() {
        var self = this;
        if(self.$dialog) {
            self.hide();
        }
    };


    /**
     * CONST that contains the HTML code of the dialog
     *
     * @type {string}
     */
    MegaIncomingCallDialog.DIALOG_TEMPLATE = '<div class="fm-dialog incoming-call-dialog hidden">\n' +
        '<div class="fm-dialog-close"></div>\n' +
        '<div class="icoming-call-header">\n' +
        '   Incoming call...\n' +
        '</div>\n' +
        '<div class="incoming-call-avatar">\n' +
        '       <div class="incoming-call-shadow-bl"></div>\n' +
        '       <img src="images/mega/default-avatar.png" alt="" />\n' +
        '   </div>\n' +
        '<div class="incoming-call-username">Andrei D.</div>\n' +
        '   <div class="incoming-call-buttons">\n' +
        '       <div class="icoming-call-button cancel-call"></div>\n' +
        '       <div class="icoming-call-button audio-call"></div>\n' +
        '       <div class="icoming-call-button video-call"></div>\n' +
        '   </div>\n' +
        '</div>';

    // export
    window.MegaIncomingCallDialog = MegaIncomingCallDialog;
})(jQuery);