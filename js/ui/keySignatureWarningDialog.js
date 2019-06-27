(function($, scope) {

    /**
     * Warning dialog when a public key's signature does not verify.
     * Triggerable with the following test code:
     * mega.ui.KeySignatureWarningDialog.singleton('4Hlf71R5IxY', 'RSA');
     *
     * @param opts {Object}
     * @constructor
     */
    var KeySignatureWarningDialog = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Required: .dialog Class name (excl. the starting ".")
             */
            'className': 'key-signature-warning-dialog',

            /**
             * features:
             */
            'focusable': true,
            'closable': false,
            'expandable': true,
            'requiresOverlay': true,

            /**
             * css class names
             */
            'expandableButtonClass': '.fm-mega-dialog-size-icon',
            'buttonContainerClassName': 'fm-mega-dialog-bottom',
            'buttonPlaceholderClassName': 'fm-mega-dialog-pad',

            /**
             * optional:
             */
            'title': 'Warning',
            'buttons': [
                {
                    'label': l[148],
                    'className': 'default-white-button right red',
                    'callback': function() {
                        this.hide();
                        this._hideOverlay();
                    }
                }
            ]
        };

        mega.ui.Dialog.call(this, Object.assign({}, defaultOptions, opts));

        self.bind("onBeforeShow", function() {
            $('.fm-dialog-overlay').addClass('hidden');
        });
    };

    KeySignatureWarningDialog.prototype = Object.create(mega.ui.Dialog.prototype);

    KeySignatureWarningDialog.prototype._initGenericEvents = function() {
        var self = this;

        // Renders the dialog details.
        this._renderDetails();

        mega.ui.Dialog.prototype._initGenericEvents.apply(self);
    };

    /**
     * Render the placeholder details in the dialog
     */
    KeySignatureWarningDialog.prototype._renderDetails = function() {

        // Change wording to seen or verified
        var infoFirstLine = l[7585];
        var contactEmail = KeySignatureWarningDialog.contactHandle;
        if (M.u[KeySignatureWarningDialog.contactHandle]) {
            contactEmail = M.u[KeySignatureWarningDialog.contactHandle].m;
        }
        infoFirstLine = infoFirstLine.replace('%1', KeySignatureWarningDialog.keyType);
        infoFirstLine = infoFirstLine.replace('%2', '<span class="emailAddress">'
                      + contactEmail + '</span>');

        $dialog = $('.key-signature-warning-dialog');
        $dialog.find('.information .firstLine').html(infoFirstLine);

        var description = l[8436];
        description = description.replace('%1', '<span class="emailAddress">'
                      + contactEmail + '</span>');
        description = description.replace('[A]', '<a class="red" href="mailto:support@mega.nz">');
        description = description.replace('[/A]', '</a>');
        $dialog.find('.information .description').html(description);

        // If the avatar exists, show it
        if (typeof avatars[KeySignatureWarningDialog.contactHandle] !== 'undefined') {
            $dialog.find('.userAvatar img').attr('src', avatars[KeySignatureWarningDialog.contactHandle].url);
        }
        else {
            // Otherwise hide the avatar
            $dialog.find('.userAvatar').hide();
            $dialog.find('.information').addClass('noAvatar');
        }
    };

    /**
     * Initialises the Key Signature Warning Dialog.
     *
     * @param {string} contactHandle The contact's user handle
     * @param {string} keyType The type of key for authentication.
     * @returns {KeySignatureWarningDialog._instance}
     */
    KeySignatureWarningDialog.singleton = function(contactHandle, keyType) {

        // Set to object so can be used later
        KeySignatureWarningDialog.contactHandle = contactHandle;
        KeySignatureWarningDialog.keyType = keyType;

        if (!KeySignatureWarningDialog._instance) {
            KeySignatureWarningDialog._instance = new KeySignatureWarningDialog();
        }

        KeySignatureWarningDialog._instance.show();

        return KeySignatureWarningDialog._instance;
    };

    // Export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.KeySignatureWarningDialog = KeySignatureWarningDialog;

})(jQuery, window);
