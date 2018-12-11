(function($, scope) {
    /**
     * Incoming Call Dialog
     *
     * Note: Should be initialized only once.
     *
     * @param opts {Object}
     * @constructor
     */
    var IncomingCallDialog = function(opts) {
        var self = this;

        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);


        self.$dialog = null;

        self.visible = false;

    };

    makeObservable(IncomingCallDialog);


    /**
     * Show the dialog
     */
    IncomingCallDialog.prototype.show = function(
            username,
            avatar,
            sid,
            isVideoCall,
            answerAudioFn,
            answerVideoFn,
            cancelFn,
            isGroupCall
        ) {
        var self = this;

        if (!self.$dialog) {
            self._createDialog();
        } else {
            // hide the old dialog and show the new one
            self.destroy();
            self._createDialog();
        }

        self.sid = sid;

        if (self.visible) {
            return;
        }


        $('.incoming-call-name', self.$dialog).text(username);

        if (avatar) {
            $('.incoming-call-avatar-bl', self.$dialog)
                .safeHTML(avatar);
        }


        $('.cancel-call', self.$dialog).rebind('mouseup.IncomingCallDialog', function() {
            cancelFn();
        });

        $('.audio-call', self.$dialog).rebind('mouseup.IncomingCallDialog', function() {
            answerAudioFn();
        });

        $('.video-call', self.$dialog).rebind('mouseup.IncomingCallDialog', function() {
            answerVideoFn();
        });
        $('.fm-dialog-close', self.$dialog).rebind('mouseup.IncomingCallDialog', function() {
            self.hide();
        });


        if (isVideoCall) {
            $('.incoming-call-buttons', self.$dialog).addClass("video-enabled");
        } else {
            $('.incoming-call-buttons', self.$dialog).removeClass("video-enabled");
        }
        self.visible = true;

        self.$dialog.removeClass('hidden');
        $('.fm-dialog-overlay').removeClass('hidden');


        if (isGroupCall) {
            $('.video-call', self.$dialog).hide();
            $('.incoming-call-txt, .icoming-call-header', self.$dialog).text(
                l[19995] || 'Incoming group call...'
            );
            self.$dialog.addClass('group-call');
        }
        else {
            $('.video-call', self.$dialog).show();
            $('.incoming-call-txt, .icoming-call-header', self.$dialog).text(
                (l[17878] || "Incoming call") + '...'
            );
            self.$dialog.removeClass('group-call');
        }
    };

    /**
     * Hide the dialog
     */
    IncomingCallDialog.prototype.hide = function() {
        var self = this;

        if (!self.visible) {
            return;
        }
        // auto hide on click out of the dialog - cleanup
        $(document).off('mouseup.IncomingCallDialog');
        $(document).off('keypress.IncomingCallDialog');

        self.visible = false;
        self.$dialog.addClass('hidden');
        $('.fm-dialog-overlay').addClass('hidden');

        // cleaup & reset state
        self.$dialog.remove();
        self.$dialog = null;
    };

    /**
     * Toggle (show/hide) the dialog
     */
    IncomingCallDialog.prototype.toggle = function() {
        var self = this;
        if (self.visible) {
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
    IncomingCallDialog.prototype._createDialog = function() {

        var self = this;
        self.$dialog = $(IncomingCallDialog.DIALOG_TEMPLATE);

        $(document.body).append(self.$dialog);
    };



    /**
     * Should be used by unit tests and when there is a new incoming call while the old dialog is still open
     */
    IncomingCallDialog.prototype.destroy = function() {
        var self = this;
        if (self.$dialog) {
            self.hide();
        }
    };


    /**
     * CONST that contains the HTML code of the dialog
     *
     * @type {string}
     */
    IncomingCallDialog.DIALOG_TEMPLATE = '<div class="fm-dialog incoming-call-dialog hidden">\n' +
        '<div class="fm-dialog-close"></div>\n' +
        '<div class="icoming-call-header"></div>\n' +
        '<div class="incoming-call-avatar">\n' +
        '       <div class="incoming-call-shadow-bl"></div>\n' +
        '       <div class="incoming-call-avatar-bl"></div>\n' +
        '</div>\n' +
        '<div class="incoming-call-username">\n' +
		  '<span class="incoming-contact-info">\n' +
            '<span class="incoming-call-name"></span>\n' +
            '<span class="incoming-call-txt"></span>\n' +
          '</span>\n' +
        '</div>\n' +
        '<div class="incoming-call-buttons">\n' +
        '  <div class="icoming-call-button cancel-call"></div>\n' +
		'  <div class="icoming-call-button video-call"></div>\n' +
        '  <div class="icoming-call-button audio-call"></div>\n' +
        '</div>\n' +
    '</div>';

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.chat = scope.mega.ui.chat || {};
    scope.mega.ui.chat.IncomingCallDialog = IncomingCallDialog;
})(jQuery, window);
