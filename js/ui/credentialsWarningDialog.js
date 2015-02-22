(function($, scope) {
    
    /**
     * Simple/reusable feedback dialog
     *
     * @param opts {Object}
     * @constructor
     */
    var CredentialsWarningDialog = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Required: .dialog Class name (excl. the starting ".")
             */
            'className': 'credentials-warning-dialog',

            /**
             * features:
             */
            'focusable': true,
            'closable': false,
            'expandable': true,
            'requiresOverlay': false,

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
                    'label': "Accept",
                    'className': "fm-dialog-button-green feedback-button-send",
                    'callback': function() {
                        CredentialsWarningDialog.acceptButtonCallback();
                        this.hide();
                    }
                },
                {
                    'label': "Reject",
                    'className': "fm-dialog-button-red feedback-button-cancel",
                    'callback': function() {                        
                        CredentialsWarningDialog.rejectButtonCallback();
                        this.hide();
                    }
                }
            ]
        };

        mega.ui.Dialog.prototype.constructor.apply(self, [
            $.extend({}, defaultOptions, opts)
        ]);

        self.bind("onBeforeShow", function() {
            $('.fm-dialog-overlay').addClass('hidden');
        });

        self.bind("onHide", function() {
            
        });
    };

    CredentialsWarningDialog.prototype._initGenericEvents = function() {
        var self = this;
        
        // Renders the dialog details, also shows the previous and new fingerprints differences in red
        this._renderDetails();
        this._renderFingerprints();
        
        mega.ui.Dialog.prototype._initGenericEvents.apply(self);
    };
    
    /**
     * Render the placeholder details in the dialog
     */
    CredentialsWarningDialog.prototype._renderDetails = function() {
        
        $dialog = $('.credentials-warning-dialog');        
        $dialog.find('.emailAddress').text(CredentialsWarningDialog.contactEmail);
        $dialog.find('.seenOrVerified').text(CredentialsWarningDialog.seenOrVerifiedWording);
        
        if (typeof avatars[CredentialsWarningDialog.contactHandle] !== 'undefined') {
            $dialog.find('.userAvatar img').attr('src', avatars[CredentialsWarningDialog.contactHandle].url);
        }
    };
    
    /**
     * Renders the previous and new fingerprints showing the differences in red
     */
    CredentialsWarningDialog.prototype._renderFingerprints = function() {
        
        var previousFingerprint = CredentialsWarningDialog.previousFingerprint;
        var newFingerprint = CredentialsWarningDialog.newFingerprint;
        var previousFingerprintHtml = '';
        var newFingerprintHtml = '';
        
        // Build up the fingerprint HTML
        for (var i = 0, groupCount = 0, length = previousFingerprint.length;  i < length;  i++) {
            
            var previousFingerprintChar = previousFingerprint.charAt(i);
            var newFingerprintChar = '';
            
            // If the previous fingerprint character doesn't match the new character, make it red
            if (previousFingerprint.charAt(i) !== newFingerprint.charAt(i)) {
                newFingerprintChar = '<span class="mismatch">' + newFingerprint.charAt(i) + '</span>';
            }
            else {
                newFingerprintChar = newFingerprint.charAt(i);
            }
            
            // Close current group of 4 hex chars
            if (groupCount === 3) {
                previousFingerprintHtml += previousFingerprintChar + '</span>';
                newFingerprintHtml += newFingerprintChar + '</span>';
                groupCount = 0;
            }
            
            // Start a new group of 4 hex chars
            else if (groupCount === 0) {
                previousFingerprintHtml += '<span>' + previousFingerprintChar;
                newFingerprintHtml += '<span>' + newFingerprintChar;
                groupCount++;
            }
            else {
                // Add to existing group
                previousFingerprintHtml += previousFingerprintChar;
                newFingerprintHtml += newFingerprintChar;
                groupCount++;
            }        
        }
        
        // Render new fingerprints
        $dialog = $('.credentials-warning-dialog');
        $dialog.find('.previousCredentials .fingerprint').html(previousFingerprintHtml);
        $dialog.find('.newCredentials .fingerprint').html(newFingerprintHtml);
    };

    CredentialsWarningDialog.prototype = $.extend({}, mega.ui.Dialog.prototype, CredentialsWarningDialog.prototype);

    /**
     * Initialises the Credentials Warning Dialog
     * @param {String} contactHandle The contact's user handle
     * @param {Number} authMethod Whether the fingerprint is seen or verified, use authring.AUTHENTICATION_METHOD.SEEN or .FINGERPRINT_COMPARISON
     * @param {String} prevFingerprint The previous fingerprint as a hexadecimal string
     * @param {String} newFingerprint The current fingerprint as a hexadecimal string
     * @param {Function} rejectBtnCallback What happens when the Reject fingerprint change button is clicked, e.g. disconnect the call/chat
     * @param {Function} acceptBtnCallback What happens when the Accept fingerprint change button is clicked, e.g. proceed with the call/chat
     * @returns {CredentialsWarningDialog._instance}
     */
    CredentialsWarningDialog.singleton = function(contactHandle, authMethod, prevFingerprint, newFingerprint, rejectBtnCallback, acceptBtnCallback) {
        
        // Set to object so can be used later
        CredentialsWarningDialog.contactHandle = contactHandle;
        CredentialsWarningDialog.contactEmail = M.u[contactHandle].m;
        CredentialsWarningDialog.seenOrVerifiedWording = (authMethod === authring.AUTHENTICATION_METHOD.SEEN) ? 'seen' : 'verified';
        CredentialsWarningDialog.previousFingerprint = prevFingerprint;
        CredentialsWarningDialog.newFingerprint = newFingerprint;
        CredentialsWarningDialog.rejectButtonCallback = rejectBtnCallback;
        CredentialsWarningDialog.acceptButtonCallback = acceptBtnCallback;
        
        CredentialsWarningDialog._instance = new CredentialsWarningDialog();
        CredentialsWarningDialog._instance.show();

        return CredentialsWarningDialog._instance;
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.CredentialsWarningDialog = CredentialsWarningDialog;
    
})(jQuery, window);