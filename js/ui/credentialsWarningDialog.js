(function($, scope) {

    /**
     * Warning dialog when there is a fingerprint mismatch e.g. a MITM attack in progress.
     * Triggerable with the following test code (change the user handle to one in your account's M.u):
     * mega.ui.CredentialsWarningDialog.singleton(
     *      '4Hlf71R5IxY',
     *      'Ed25519',
     *      'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
     *      'ABCDFF0123456789ABCDEE0123456788ABCDEF00'
     * );
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
                        mega.ui.CredentialsWarningDialog.rendernext();
                    }
                }
            ]
        };

        mega.ui.Dialog.call(this, Object.assign({}, defaultOptions, opts));

        self.bind("onBeforeShow", function() {
            $('.fm-dialog-overlay').addClass('hidden');
        });
    };

    CredentialsWarningDialog.prototype = Object.create(mega.ui.Dialog.prototype);

    CredentialsWarningDialog.prototype._initGenericEvents = function() {
        var self = this;

        // Renders the dialog details, also shows the previous and new fingerprints differences in red
        this._renderDetails();
        this._renderFingerprints();

        mega.ui.Dialog.prototype._initGenericEvents.apply(self);
    };

    /**
     * Reset state of dialog if it had previously appeared this session and they had reset credentials
     */
    CredentialsWarningDialog.prototype._resetToDefaultState = function() {

        var $dialog = $('.credentials-warning-dialog');

        $dialog.find('.previousCredentials').show();
        $dialog.find('.newCredentials').show();
        $dialog.find('.resetCredentials').show();
        $dialog.find('.reset-credentials-button').removeClass('hidden');
        $dialog.find('.postResetCredentials').hide();
        $dialog.find('.verifyCredentials').hide();
    };

    /**
     * Render the placeholder details in the dialog
     */
    CredentialsWarningDialog.prototype._renderDetails = function() {

        // Change wording to seen or verified
        var infoFirstLine = (CredentialsWarningDialog.seenOrVerified === 'seen') ? l[6881] : l[6882];
            infoFirstLine = infoFirstLine.replace('%1', '<span class="emailAddress">' + CredentialsWarningDialog.contactEmail + '</span>');
        var title = (CredentialsWarningDialog.seenOrVerified === 'seen') ? l[6883] : l[6884];

        var $dialog = $('.credentials-warning-dialog');
        $dialog.find('.information .firstLine').html(infoFirstLine);
        $dialog.find('.previousCredentials .title').html(title);

        // If the avatar exists, show it
        if (typeof avatars[CredentialsWarningDialog.contactHandle] !== 'undefined') {
            $dialog.find('.userAvatar img').attr('src', avatars[CredentialsWarningDialog.contactHandle].url);
        }
        else {
            // Otherwise hide the avatar
            $dialog.find('.userAvatar').hide();
            $dialog.find('.information').addClass('noAvatar');
        }

        // Reset the contact's credentials
        $dialog.find('.reset-credentials-button').rebind('click', function() {

            // Reset the authring for the user and show the success message
            authring.resetFingerprintsForUser(CredentialsWarningDialog.contactHandle);

            // If they're already on the contact's page, reload the fingerprint info
            if (getSitePath() === '/fm/' + CredentialsWarningDialog.contactHandle) {

                // Get the user
                var user = M.u[CredentialsWarningDialog.contactHandle];

                showAuthenticityCredentials(user);
                enableVerifyFingerprintsButton(CredentialsWarningDialog.contactHandle);
            }

            // Change to verify details
            $dialog.find('.previousCredentials').hide();
            $dialog.find('.newCredentials').hide();
            $dialog.find('.resetCredentials').hide();

            // Show verify details
            $dialog.find('.postResetCredentials').show();
            $dialog.find('.verifyCredentials').show();

            // Copy the new credentials to the section to be shown after reset
            var $newCredentials = $dialog.find('.newCredentials .fingerprint').clone().removeClass('mismatch');
            $dialog.find('.postResetCredentials .fingerprint').html($newCredentials.html());

            // Hide the current Reset button and show the Verify contact one
            $(this).addClass('hidden');
            $dialog.find('.verify-contact-button').removeClass('hidden');

            // Reposition dialog
            CredentialsWarningDialog._instance.reposition();
        });

        // Button to view the verification dialog
        $dialog.find('.verify-contact-button').rebind('click', function() {

            // Hide the dialog and show the regular fingerprint dialog
            CredentialsWarningDialog._instance.hide();
            fingerprintDialog(CredentialsWarningDialog.contactHandle);
        });
    };

    /**
     * Renders the previous and new fingerprints showing the differences in red
     */
    CredentialsWarningDialog.prototype._renderFingerprints = function() {
        var userHandle = CredentialsWarningDialog.contactHandle;
        var keyType = CredentialsWarningDialog.keyType;
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
        var $dialog = $('.credentials-warning-dialog');
        $dialog.find('.previousCredentials .fingerprint').html(previousFingerprintHtml);
        $dialog.find('.newCredentials .fingerprint').html(newFingerprintHtml);
    };

    /**
     * Render next warning in the waiting list.
     */
    CredentialsWarningDialog.rendernext = function() {

        if (mega.ui.CredentialsWarningDialog.waitingList) {
            var key = mega.ui.CredentialsWarningDialog.currentKey;
            if (key) {
                delete mega.ui.CredentialsWarningDialog.waitingList[key];
            }
            var keys = Object.keys(mega.ui.CredentialsWarningDialog.waitingList);
            if (keys.length > 0) {
                key = keys[0];
                mega.ui.CredentialsWarningDialog.singleton(
                        mega.ui.CredentialsWarningDialog.waitingList[key].contactHandle,
                        mega.ui.CredentialsWarningDialog.waitingList[key].keyType,
                        mega.ui.CredentialsWarningDialog.waitingList[key].prevFingerprint,
                        mega.ui.CredentialsWarningDialog.waitingList[key].newFingerprint);

                mega.ui.CredentialsWarningDialog._instance._renderDetails();
                mega.ui.CredentialsWarningDialog._instance._renderFingerprints();
                CredentialsWarningDialog.currentKey = key;
            }
        }
    };
    /**
     * Initialises the Credentials Warning Dialog
     * @param {String} contactHandle The contact's user handle
     * @param {String} keyType The key type e.g. Ed25519, RSA
     * @param {String} prevFingerprint The previous fingerprint as a hexadecimal string
     * @param {String} newFingerprint The current fingerprint as a hexadecimal string
     * @returns {CredentialsWarningDialog._instance}
     */
    CredentialsWarningDialog.singleton = function(contactHandle, keyType, prevFingerprint, newFingerprint) {

        // Set to object so can be used later
        CredentialsWarningDialog.contactHandle = contactHandle;
        CredentialsWarningDialog.keyType = keyType;
        CredentialsWarningDialog.contactEmail = M.u[contactHandle].m;
        CredentialsWarningDialog.seenOrVerified = u_authring[keyType][contactHandle].method;
        CredentialsWarningDialog.seenOrVerified =
            (CredentialsWarningDialog.seenOrVerified === authring.AUTHENTICATION_METHOD.SEEN) ? 'seen' : 'verified';
        CredentialsWarningDialog.previousFingerprint = prevFingerprint;
        CredentialsWarningDialog.newFingerprint = newFingerprint;
        if (!CredentialsWarningDialog.waitingList) {
            CredentialsWarningDialog.waitingList = {};
        }
        var key = contactHandle + keyType;
        CredentialsWarningDialog.waitingList[key] = {
            'contactHandle' : contactHandle,
            'keyType' : keyType,
            'prevFingerprint' : prevFingerprint,
            'newFingerprint' : newFingerprint
        };

        if (!CredentialsWarningDialog._instance) {
            CredentialsWarningDialog._instance = new CredentialsWarningDialog();
            CredentialsWarningDialog.currentKey = key;
        }
        else {
            CredentialsWarningDialog._instance._resetToDefaultState();
            if (key !== CredentialsWarningDialog.currentKey) {
                mega.ui.CredentialsWarningDialog._instance._renderDetails();
                mega.ui.CredentialsWarningDialog._instance._renderFingerprints();
                CredentialsWarningDialog.currentKey = key;
            }
        }

        CredentialsWarningDialog._instance.show();


        return CredentialsWarningDialog._instance;
    };

    // Export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.CredentialsWarningDialog = CredentialsWarningDialog;

})(jQuery, window);
