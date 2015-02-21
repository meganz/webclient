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
                        
                        alert('accepted');
                        this.hide();
                    }
                },
                {
                    'label': "Reject",
                    'className': "fm-dialog-button-red feedback-button-cancel",
                    'callback': function() {
                        
                        alert('rejected');
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
        
        // Test contact data (please replace)        
        var contactEmail = 'email@domain.com';
        var contactHandle = '4mmXu_081H4';
        var seenOrVerifiedWording = 'verified'; // or seen
                
        // Test fingerprints (please replace)
        var previousFingerprint = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01';
        var newFingerprint = 'ABCDFF0123456789ABCDEE0123456788ABCDEF00';
        
        // Renders the dialog details, also shows the previous and new fingerprints differences in red
        this._renderDetails(contactEmail, contactHandle, seenOrVerifiedWording);
        this._renderFingerprints(previousFingerprint, newFingerprint);
        
        mega.ui.Dialog.prototype._initGenericEvents.apply(self);
    };
    
    /**
     * Render the placeholder details in the dialog
     * @param {String} contactEmail The contact's email address
     * @param {String} contactHandle The contact's user handle
     * @param {String} seenOrVerifiedWording Can be 'seen' if the fingerprint has just been seen, or 'verified' if they previously verified the fingerprints
     */
    CredentialsWarningDialog.prototype._renderDetails = function(contactEmail, contactHandle, seenOrVerifiedWording) {
      
        $dialog = $('.credentials-warning-dialog');        
        $dialog.find('.email').text(contactEmail);
        $dialog.find('.seenOrVerifiedWording').text(seenOrVerifiedWording);
        
        if (typeof avatars[contactHandle] !== 'undefined') {
            $dialog.find('.userAvatar img').attr('src', avatars[contactHandle].url);
        }
    };
    
    /**
     * Renders the previous and new fingerprints showing the differences in red
     * @param {String} previousFingerprint The previously seen or verified fingerprint in hexadecimal
     * @param {String} newFingerprint The new unverified fingerprint in hexadecimal
     */
    CredentialsWarningDialog.prototype._renderFingerprints = function(previousFingerprint, newFingerprint) {
        
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

    CredentialsWarningDialog.singleton = function() {
        
        if (!CredentialsWarningDialog._instance) {
            CredentialsWarningDialog._instance = new CredentialsWarningDialog();
        }

        CredentialsWarningDialog._instance.show();

        return CredentialsWarningDialog._instance;
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.CredentialsWarningDialog = CredentialsWarningDialog;
    
})(jQuery, window);