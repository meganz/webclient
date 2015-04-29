(function($, scope) {
    
    /**
     * Warning dialog when there is a fingerprint mismatch e.g. a MITM attack in progress.
     * Triggerable with the following test code:
     * mega.ui.CredentialsWarningDialog.singleton('DKLLwlj_THc', authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON, 'ABCDEF0123456789ABCDEF0123456789ABCDEF01', 'ABCDFF0123456789ABCDEE0123456788ABCDEF00', function(){ alert('rejected') }, function(){ alert('accepted') });
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
                    'label': "Close",
                    'className': "fm-dialog-button-red feedback-button-cancel",
                    'callback': function() {
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
            $('.credentials-warning-dialog .fm-mega-dialog-bottom').remove();
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
        
        // If the avatar exists, show it
        if (typeof avatars[CredentialsWarningDialog.contactHandle] !== 'undefined') {
            $dialog.find('.userAvatar img').attr('src', avatars[CredentialsWarningDialog.contactHandle].url);
        }
        else {
            // Otherwise hide the avatar 
            $dialog.find('.userAvatar').hide();
            $dialog.find('.information').addClass('noAvatar');
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
                
        // Normalise fingerprints to display in hexadecimal for the dialog
        if (previousFingerprint.length === 20) {
            previousFingerprint = asmCrypto.bytes_to_hex(asmCrypto.string_to_bytes(previousFingerprint));
        }
        if (newFingerprint.length === 20) {
            newFingerprint = asmCrypto.bytes_to_hex(asmCrypto.string_to_bytes(newFingerprint));
        }
        
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
     * @returns {CredentialsWarningDialog._instance}
     */
    CredentialsWarningDialog.singleton = function(contactHandle, authMethod, prevFingerprint, newFingerprint) {
        
        // Set to object so can be used later
        CredentialsWarningDialog.contactHandle = contactHandle;
        CredentialsWarningDialog.contactEmail = M.u[contactHandle].m;
        CredentialsWarningDialog.seenOrVerifiedWording = (authMethod === authring.AUTHENTICATION_METHOD.SEEN) ? 'seen' : 'verified';
        CredentialsWarningDialog.previousFingerprint = prevFingerprint;
        CredentialsWarningDialog.newFingerprint = newFingerprint;
        
        CredentialsWarningDialog._instance = new CredentialsWarningDialog();
        CredentialsWarningDialog._instance.show();

        return CredentialsWarningDialog._instance;
    };

    // Export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.CredentialsWarningDialog = CredentialsWarningDialog;
    
})(jQuery, window);