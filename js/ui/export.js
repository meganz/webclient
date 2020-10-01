/**
 * Functionality for the Export Link password protection feature
 *
 * The first implementation will use PBKDF2-HMAC-SHA512 with 100,000 rounds and a 256 bit random salt to derive a 512
 * bit key. For folder links the key is 128 bits in length and for file links the actual key is 256 bits in length. The
 * first 128 or 256 bits of the derived key will be used to encrypt the actual folder/file key using a simple XOR for
 * encryption. The last 256 bits of the derived key will be used as the MAC Key. Using the Encrypt then MAC principle,
 * the MAC will be calculated using HMAC-SHA256.
 *
 * In constructing the protected link, the format is as follows:
 * algorithm || file/folder || public handle || salt || encrypted key || MAC tag
 *
 * algorithm = 1 byte - A byte to identify which algorithm was used (for future upgradability), initially is set to 0
 * file/folder = 1 byte - A byte to identify if the link is a file or folder link (0 = folder, 1 = file)
 * public handle = 6 bytes - The public folder/file handle
 * salt = 32 bytes - A 256 bit randomly generated salt
 * encrypted key = 16 or 32 bytes - The encrypted actual folder or file key
 * MAC tag = 32 bytes - The MAC of all the previous data to ensure integrity of the link i.e. calculated as:
 *                      HMAC-SHA256(MAC key, (algorithm || file/folder || public handle || salt || encrypted key))
 *
 * The link data is then Base64 encoded and then URL encoded to remove incompatible characters e.g.:
 * https://mega.nz/#P!AAA5TWTcNMs7aYZgtalahVxCffAF0JeZTKxOZQ_s2d...
 *
 * In receiving a protected link, the program will decode the URL, get the first byte to check which algorithm was used
 * to encrypt the data (useful if algorithm changes are made in future). Then it will use the password to derive the
 * same key using the same algorithm, provided salt and password. Then a MAC of the data can be calculated, if it's a
 * match then the link has not been tampered with or corrupted and the real folder/file key can be decrypted and the
 * original link reconstructed. If it doesn't match then an error will be shown which could mean tampering or that the
 * user entered an incorrect password.
 */
var exportPassword = {

    // List of algorithms
    algorithms: [
        {
            // Algorithm (0) for unit testing with low rounds
            name: 'PBKDF2',                     // Name for the Web Crypto primary PBKDF algorithm
            hash: 'SHA-512',                    // Hash algorithm for the Web Crypto primary PBKDF algorithm
            failsafeName: 'PBKDF2_HMAC_SHA512', // Name for the asmCrypto failsafe PBKDF algorithm
            macName: 'HMAC_SHA256',             // Name for the asmCrypto MAC algorithm
            saltLength: 256,                    // Salt length in bits
            macKeyLength: 256,                  // MAC key length in bits
            macLength: 256,                     // MAC computed digest length in bits
            derivedKeyLength: 512,              // Desired derived key length in bits
            iterations: 1000                    // Number of iterations to run
        },
        {
            // Old algorithm (1) which used incorrect parameter order: HMAC(password, data)
            name: 'PBKDF2',
            hash: 'SHA-512',
            failsafeName: 'PBKDF2_HMAC_SHA512',
            macName: 'HMAC_SHA256',
            saltLength: 256,
            macKeyLength: 256,
            macLength: 256,
            derivedKeyLength: 512,
            iterations: 100000
        },
        {
            // Current algorithm (2)
            name: 'PBKDF2',
            hash: 'SHA-512',
            failsafeName: 'PBKDF2_HMAC_SHA512',
            macName: 'HMAC_SHA256',
            saltLength: 256,
            macKeyLength: 256,
            macLength: 256,
            derivedKeyLength: 512,
            iterations: 100000
        }
        // Future tweaks or changes in algorithms e.g. Argon2
    ],

    // The current algorithm in use for production
    currentAlgorithm: 2,    // 1 byte (0x02)

    /**
     * Constants for folder or file type
     */
    LINK_TYPE_FOLDER: 0,    // 1 byte (0x00)
    LINK_TYPE_FILE: 1,      // 1 byte (0x01)


    /**
     * Functions for the encryption
     */
    encrypt: {

        // The jQuery selector for the Export dialog
        $dialog: null,

        /**
         * Initialise function
         */
        init: function() {

            "use strict";

            // Cache dialog selector
            this.$dialog = $('.fm-dialog.export-links-dialog', 'body');
            this.$passwordDialog = $('.fm-dialog.set-password-dialog', 'body');

            this.updatePasswordComponentsUI();
            this.updateLinkInputValues();

            // If they are a pro user, enable set password
            if (u_attr.p) {
                this.initPasswordFeatureButton();
                this.initPasswordFeatureIcon();
                this.hideSetPasswordDialog();
            }
        },

        /**
         * Update protected/not protected components UI
         */
        updatePasswordComponentsUI: function() {

            "use strict";

            var $items = $('.export-links-dialog.item', this.$dialog);
            var $protectedItems = $items.filter('.password-protect-link');
            var $bottomBar = $('.export-links-dialog.bottom', this.$dialog);
            var $setPasswordBtn = $('.default-white-button.password', this.$dialog);
            var $removePasswordBtn = $('.default-white-button.remove', this.$dialog);
            var $checkboxWrap = $('.options .checkdiv', this.$dialog);
            var $checkbox = $('input', $checkboxWrap);

            if ($items.length > 1) {

                // Show bottom bar with Copy buttons if more than one link
                $bottomBar.removeClass('hidden');
            }
            else {

                // Hide bottom bar with Copy buttons if more than one link
                $bottomBar.addClass('hidden');
            }

            // Enable separate key option
            $checkbox.prop('disabled', false);
            $checkboxWrap.removeClass('disabled');

            // If password protected links
            if ($protectedItems.length) {

                // Show Lock icons for password protected links
                $('.lock', $protectedItems).removeClass('hidden');

                // Change Set password button state
                $setPasswordBtn.addClass('encrypted').text(l[737]);

                // Hide Remove password button
                $removePasswordBtn.removeClass('hidden');

                // If all links are password protected
                if ($protectedItems.length === $items.length) {

                    // Disable separate key option
                    $checkbox.prop('checked', true).trigger('click').prop('disabled', true);
                    $checkboxWrap.addClass('disabled');
                }
            }
            else {

                // Set paassword button initial state
                $setPasswordBtn.removeClass('encrypted').text(l[17454]);

                // Hide Remove password button
                $removePasswordBtn.addClass('hidden');

                // Hide Lock icons
                $('.lock', $items).removeData('pw type').addClass('hidden');
            }
        },

        /**
         * Update links/keys values
         */
        updateLinkInputValues: function() {

            "use strict";

            var isSeparateKeys = $('.options .checkdiv input', this.$dialog).prop('checked');
            var $items = $('.export-links-dialog.item:not(.password-protect-link)', this.$dialog);

            // Update not password protected Link input values
            $items.get().forEach(function(e) {

                var $this = $(e);
                var $linkInput = $('.item-link.link input', $this);
                var $keyInput = $('.item-link.key input', $this);
                var linkWithoutKey = $linkInput.data('link');
                var key = $linkInput.data('key');

                // Set key without # or !
                $keyInput.val($keyInput.data('key'));

                // Set link
                if (isSeparateKeys) {
                    $linkInput.val(linkWithoutKey);
                }
                else {
                    $linkInput.val(linkWithoutKey + key);
                }
            });
        },

        /**
         * Setup Set password button
         */
        initPasswordFeatureButton: function() {

            "use strict";

            var $setPasswordBtn = $('.default-white-button.password', this.$dialog);

            // On Set paassword click
            $setPasswordBtn.rebind('click.setPass', function() {

                // Unselect link items
                $('.item.selected', this.$dialog).removeClass('selected');

                // Show dialog
                exportPassword.encrypt.showSetPasswordDialog();
            });
        },

        /**
         * Setup Set remove password button
         */
        initRemovePasswordButton: function() {

            "use strict";

            var $removePasswordBtn = $('.default-white-button.remove', this.$dialog);

            // On Remove password click
            $removePasswordBtn.rebind('click.removePass', function() {

                var $items = $('.export-links-dialog.item', this.$dialog);

                // Set links and keys into text boxes
                $items.removeClass('password-protect-link');

                // Update Password buttons and links UI
                exportPassword.encrypt.updatePasswordComponentsUI();

                // Update Link input values
                exportPassword.encrypt.updateLinkInputValues();
            });
        },

        /**
         * Setup Set password Lock icon
         */
        initPasswordFeatureIcon: function() {

            "use strict";

            var $passwordIcon = $('.links-scroll .small-icon.lock', this.$dialog);
            var $tip =  $('.dark-direct-tooltip.custom-html', this.$dialog);
            var $scrollBlock = $('.links-scroll', this.$dialog);

            // Hide a tip with Password
            var hidePasswordTip = function() {

                $tip.removeClass('visible');
                $('.content', $tip).text('');
                $scrollBlock.unbind('scroll.hidePassTip');
            };

            // Init Show password icon in the tip
            var initShowPasswordIcon = function($lockIcon) {

                $('.content i', $tip).rebind('click.showPass', function() {
                    var $this = $(this);

                    if ($this.is('.white-eye')) {
                        $this.removeClass('white-eye').addClass('white-crossed-eye');
                        $this.prev('input').attr('type', 'text');
                        $lockIcon.data('type', 'text');
                    }
                    else {
                        $this.removeClass('white-crossed-eye').addClass('white-eye');
                        $this.prev('input').attr('type', 'password');
                        $lockIcon.removeData('type');
                    }
                });
            };

            // Show Set password dialog on Lock icon click
            $passwordIcon.rebind('click.setPass', function() {

                // Select link item
                $('.item', this.$dialog).removeClass('selected');
                $(this).closest('.item').addClass('selected');

                // Show dialog
                exportPassword.encrypt.showSetPasswordDialog();
            });

            // Show tooltip on Lock icon mouseover
            $passwordIcon.rebind('mouseover.showPassTip', function() {

                var $this = $(this);
                var password = $this.data('pw');
                var passwordLength = password.length + 1;
                var $tipContentBlock = $('.content', $tip);
                var $input;
                var passwordHtml = '<input type="password" value="" readonly>'
                    + '<i class="small-icon dialog-sprite white-eye"></i>';

                // Fill tip content
                $tipContentBlock.safeHTML(passwordHtml);

                // Set password data
                $input = $('input', $tipContentBlock);
                $input.val(password).attr('size', passwordLength);

                // Show password if it has been showed before
                if ($this.data('type') === 'text') {
                    $input.attr('type', 'text');
                    $('i', $tipContentBlock).removeClass('white-eye').addClass('white-crossed-eye');
                }

                // Init Show password icon
                initShowPasswordIcon($this);

                // Show tip related to clicked element
                $tip.addClass('visible').position({
                    of: $this,
                    my: 'center bottom',
                    at: 'center bottom-30',
                    collision: "flipfit"
                });

                // Hide tooltip if content is scrolled
                $scrollBlock.rebind('scroll.hidePassTip', function() {

                    if ($(this).is('.ps-active-y')) {
                        hidePasswordTip();
                    }
                });
            });

            // Hide tooltip on mouseout from lock icon
            $passwordIcon.rebind('mouseout.hidePassTip', function(e) {

                if (!$(e.relatedTarget).is('.tooltip-arrow')) {

                    hidePasswordTip();
                }
            });

            // Hide tooltip on mouseout from itseft
            $tip.rebind('mouseleave.hidePassTip', function() {

                hidePasswordTip();
            });
        },

        /**
         * Show Set password dialog
         */
        showSetPasswordDialog: function() {

            "use strict";

            var $dialog = this.$dialog;
            var $setPasswordDialog = this.$passwordDialog;
            var $setPasswordBtn = $('.default-white-button.password', $dialog);
            var $inputs = $('.pass-wrapper input', $setPasswordDialog);
            var $existingPassword = $('.existing-pass', $setPasswordDialog);
            var $existingPasswordInput = $('.existing-pass input', $setPasswordDialog);
            var $selectedLink = $('.item.selected', $dialog);
            var $scroll = $('.links-scroll', $dialog);
            var $itemTarget;
            var megaInput;

            // Get clicked element
            $itemTarget = $selectedLink.length ? $('.lock', $selectedLink) : $setPasswordBtn;

            // Show dialog
            $setPasswordDialog.removeClass('hidden');

            // Change dialog position related to clicked element
            var dialogReposition = function() {

                exportPassword.encrypt.$passwordDialog.position({
                    of: $itemTarget.is('.hidden') ? $('.cog', $selectedLink) : $itemTarget,
                    my: 'center top',
                    at: 'center top-30',
                    collision: "flipfit"
                });
            };

            // Change dialog position
            dialogReposition();

            $(window).rebind('resize.setPasswordPosition', function() {
                dialogReposition();
            });

            // Disable scrolling
            delay('disableExportScroll', function() {
                Ps.disable($scroll[0]);
            }, 100);

            // Set init state
            $existingPassword.addClass('hidden');
            $existingPasswordInput.val('');
            $inputs.val('').parent().removeClass('good1 good2 good3 good4 good5');
            $('.strength',$setPasswordDialog).text('');
            megaInput = new mega.ui.MegaInputs($inputs);
            megaInput[1].$input.focus();

            // Show old password it it has beed set before
            if ($itemTarget.data('pw')) {
                $existingPassword.removeClass('hidden');
                $existingPasswordInput.val($itemTarget.data('pw'));
            }

            // Copy old (existing) password button
            $('.button.copy', $existingPassword).rebind('click.copyTcClipboard', function() {
                var existingPassword = $existingPasswordInput.val();

                if (existingPassword) {
                    copyToClipboard(existingPassword, l[371], 'password');
                }
            });

            // Add click handler to show old (existing) password icon
            $('.small-icon', $existingPassword).rebind('click.showPass', function() {
                var $this = $(this);

                if ($this.is('.grey-eye')) {
                    $this.removeClass('grey-eye').addClass('grey-crossed-eye');
                    $existingPasswordInput[0].type = 'text';
                }
                else {
                    $this.removeClass('grey-crossed-eye').addClass('grey-eye');
                    $existingPasswordInput[0].type = 'password';
                }
            });

            // Add click handler to the confirm button
            $('.button.confirm', $setPasswordDialog).rebind('click.setPass', function() {
                exportPassword.encrypt.startEncryption();
            });

            // Add click handler to the cancel button
            $('.button.cancel',$setPasswordDialog).rebind('click.closePassDialog', function() {
                exportPassword.encrypt.hideSetPasswordDialog();
            });

            // Click anywhere on export link dialog will hide password dialog
            $dialog.rebind('click.closePassDialog', function(e) {

                var $target = $(e.target);

                if (!$target.is('.button.password')
                    && !$target.is('.small-icon.lock')
                    && !$target.parent().is('.button.password')
                    && !$target.parent().parent().is('.dropdown.export ')) {

                    exportPassword.encrypt.hideSetPasswordDialog();
                }
            });

            exportPassword.encrypt.loadPasswordEstimatorLibrary();
            exportPassword.encrypt.initPasswordStrengthCheck();
        },

        /**
         * Hide Set password dialog
         */
        hideSetPasswordDialog: function() {

            "use strict";

            // Hide dialog
            this.$passwordDialog.removeAttr('style').addClass('hidden');

            // Enable scrolling
            Ps.enable($('.links-scroll', this.$dialog)[0]);

            // Unbind dialog positioning
            $(window).rebind('resize.setPasswordPosition');
        },

        /**
         * Load the ZXCVBN password strength estimator library
         */
        loadPasswordEstimatorLibrary: function() {

            "use strict";

            if (typeof zxcvbn === 'undefined') {

                // Show loading spinner
                var $loader = $('.estimator-loading-icon', this.$passwordDialog).addClass('loading');

                // On completion of loading, hide the loading spinner
                M.require('zxcvbn_js')
                    .done(function() {
                        $loader.removeClass('loading');
                    });
            }
        },

        /**
         * Show what strength the currently entered password is on key up
         */
        initPasswordStrengthCheck: function() {

            "use strict";

            var $passwordStrengthField = $('.strength', this.$passwordDialog);
            var $passwordInput = $('input.enter-pass', this.$passwordDialog);
            var $confirmPasswordInput = $('input.confirm-pass', this.$passwordDialog);
            var $encryptButton = $('.button.confirm', this.$passwordDialog);
            var $inputWrapper = $passwordInput.parent();

            // Add keyup event to the password text field
            $passwordInput.rebind('keyup', function(event) {

                // Make sure the ZXCVBN password strength estimator library is loaded first
                if (typeof zxcvbn !== 'undefined') {

                    // Estimate the password strength
                    var password = $.trim($passwordInput.val());
                    var passwordScore = zxcvbn(password).score;
                    var passwordLength = password.length;

                    // Remove previous strength classes that were added
                    $inputWrapper.removeClass('good1 good2 good3 good4 good5');

                    // Add colour coding and text
                    if (password.length === 0) {
                        $passwordStrengthField.text('');   // No password entered, hide text
                    }
                    else if (passwordLength < 8) {
                        $inputWrapper.addClass('good1');
                        $passwordStrengthField.text(l[18700]);    // Too short
                    }
                    else if (passwordScore === 4) {
                        $inputWrapper.addClass('good5');
                        $passwordStrengthField.text(l[1128]);    // Strong
                    }
                    else if (passwordScore === 3) {
                        $inputWrapper.addClass('good4');
                        $passwordStrengthField.text(l[1127]);    // Good
                    }
                    else if (passwordScore === 2) {
                        $inputWrapper.addClass('good3');
                        $passwordStrengthField.text(l[1126]);    // Medium
                    }
                    else if (passwordScore === 1) {
                        $inputWrapper.addClass('good2');
                        $passwordStrengthField.text(l[1125]);    // Weak
                    }
                    else {
                        $inputWrapper.addClass('good1');
                        $passwordStrengthField.text(l[1124]);    // Very Weak
                    }
                }

                // If Enter key is pressed, trigger encryption button clicking
                if (event.keyCode === 13) {
                    $encryptButton.trigger('click');
                }
            });

            // Add keyup event to the confirm password text field
            $confirmPasswordInput.rebind('keyup.setPass', function(event) {

                // If Enter key is pressed, trigger encryption button clicking
                if (event.keyCode === 13) {
                    $encryptButton.trigger('click');
                }
            });
        },

        /**
         * Start key derivation of each link in the dialog
         */
        startEncryption: function() {

            "use strict";

            var $passwordInput = $('input.enter-pass', this.$passwordDialog);
            var $confirmPasswordInput = $('input.confirm-pass', this.$passwordDialog);

            // Hide previous errors
            $passwordInput.data('MegaInputs').hideError();

            // Get the password
            var password = $passwordInput.val();
            var confirmPassword = $confirmPasswordInput.val();

            // Check if TextEncoder function is available for the stringToByteArray function
            if (!window.TextEncoder) {

                // This feature is not supported in your browser...
                $passwordInput.data('MegaInputs').showError(l[9065]);
                return false;
            }

            // Check the passwords are the same with no typos
            if (password !== confirmPassword) {

                // The passwords are not the same...
                $passwordInput.data('MegaInputs').showError(l[9066]);
                return false;
            }

            // Check zxcvbn library is loaded first or we can't check the strength of the password
            if (typeof zxcvbn === 'undefined') {

                // The password strength verifier is still initializing
                $passwordInput.data('MegaInputs').showError(l[1115]);
                return false;
            }

            // Check that the password length is sufficient and exclude very weak passwords
            if (password.length < 8 || $passwordInput.parent().hasClass('good1')) {

                // Please use a stronger password
                $passwordInput.data('MegaInputs').showError(l[9067]);
                return false;
            }

            // Get information for each selected link showing in the dialog and convert the password to bytes
            var links = exportPassword.encrypt.getLinkInfo();

            // An anonymous function to derive the key and on completion create the password protected link
            var processLinkInfo = function(linkInfo, algorithm, saltBytes, password) {
                exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {
                    exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes);
                });
            };

            // For each selected link
            for (var i = 0; i < links.length; i++) {

                // Get the link information and random salt
                var link = links[i];
                var saltBytes = link.saltBytes;
                var algorithm = exportPassword.currentAlgorithm;

                // Derive the key and create the password protected link
                processLinkInfo(link, algorithm, saltBytes, password);
            }
        },

        /**
         * Encrypt the link's key and format the password protected link
         * @param {Object} linkInfo The information about the link
         * @param {Uint8Array} derivedKeyBytes The derived key in bytes
         */
        encryptAndMakeLink: function(linkInfo, derivedKeyBytes) {

            "use strict";

            var encKeyBytes = null;
            var algorithm = exportPassword.currentAlgorithm;
            var saltBytes = linkInfo.saltBytes;

            // If folder link, use the first 16 bytes (128 bits) of the derived key as the encryption key
            if (linkInfo.type === exportPassword.LINK_TYPE_FOLDER) {
                encKeyBytes = new Uint8Array(derivedKeyBytes.buffer, 0, 16);
            }
            else {
                // Otherwise if it's a file link use the first 32 bytes (256 bits) as the encryption key
                encKeyBytes = new Uint8Array(derivedKeyBytes.buffer, 0, 32);
            }

            // Use the last 32 bytes (256 bits) of the derived key as the MAC key
            var macKeyLengthBytes = exportPassword.algorithms[algorithm].macKeyLength / 8;
            var macKeyBytes = new Uint8Array(derivedKeyBytes.buffer, macKeyLengthBytes, macKeyLengthBytes);

            // Encrypt the file/folder link key
            var encryptedKey = exportPassword.xorByteArrays(encKeyBytes, linkInfo.keyBytes);

            // Convert the public handle to bytes
            var publicHandleBytes = asmCrypto.base64_to_bytes(linkInfo.publicHandle);

            // 1 byte for alg + 1 byte if folder/file + 6 bytes for handle + 32 bytes salt + 16 or 32 bytes for key
            var dataToAuthenticateLength = 2 + publicHandleBytes.length + saltBytes.length + encryptedKey.length;
            var dataToAuthenticateBytes = new Uint8Array(dataToAuthenticateLength);

            // Set the algorithm and set the flag for type of link
            dataToAuthenticateBytes[0] = algorithm;
            dataToAuthenticateBytes[1] = linkInfo.type;

            // Set the handle, salt and encrypted key into the array to be authenticated using different array offsets
            dataToAuthenticateBytes.set(publicHandleBytes, 2);
            dataToAuthenticateBytes.set(saltBytes, 8);
            dataToAuthenticateBytes.set(encryptedKey, 40);

            // Create the MAC of the data
            var macAlgorithm = exportPassword.algorithms[algorithm].macName;

            // If using the old algorithm (1), use parameter order: HMAC(password, data)
            if (algorithm === 1) {
                var macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToAuthenticateBytes);
            }
            else {
                // Otherwise for newer links (algorithm >= 2) use the correct parameter order: HMAC(data, password)
                var macBytes = asmCrypto[macAlgorithm].bytes(dataToAuthenticateBytes, macKeyBytes);
            }

            // Create buffer for the data to be converted to Base64
            var numOfBytes = dataToAuthenticateBytes.length + macBytes.length;
            var dataToConvert = new Uint8Array(numOfBytes);

            // Fill the array using the different offsets
            dataToConvert.set(dataToAuthenticateBytes, 0);
            dataToConvert.set(macBytes, dataToAuthenticateBytes.length);

            // Convert the data to Base64, then make it URL safe
            var dataBase64UrlEncoded = exportPassword.base64UrlEncode(dataToConvert);

            // Construct URL: #P! for password link + encoded(alg + folder/file + handle + salt + encrypted key + mac)
            var protectedUrl = getBaseUrl() + '/#P!' + dataBase64UrlEncoded;

            // Get the HTML block for this link by using the node handle
            var $item = $('.export-links-dialog.item[data-node-handle="' + linkInfo.handle + '"]', this.$dialog);
            var password =  $('.enter-pass', this.$passwordDialog).val();

            // Set the password into the text box and add a class for styling this block
            $('.item-link.link input', $item).val(protectedUrl);
            $('.item-link.key input', $item).val('');
            $('.small-icon.lock', $item).data('pw', password);
            $item.addClass('password-protect-link');

            // Update Password buttons and links UI
            exportPassword.encrypt.updatePasswordComponentsUI();

            exportPassword.encrypt.hideSetPasswordDialog();
            exportPassword.encrypt.initRemovePasswordButton();

            // Log to see if feature is used much
            api_req({ a: 'log', e: 99618, m: 'User created password protected link' });
        },

        /**
         * Get the information for each selected link
         * @returns {Array} Returns an array of objects containing properties 'handle', 'type', 'key', 'keyBytes'
         */
        getLinkInfo: function() {

            "use strict";

            var links = [];
            var $links = $('.item', this.$dialog);
            var $selectedLink =  $links.filter('.selected');
            var handles = [];

            // Create array of available links handles
            if ($selectedLink.length) {
                handles.push($selectedLink.data('node-handle'));
            }
            else {
                $links.get().forEach(function(e) {
                    handles.push($(e).data('node-handle'));
                });
            }

            // Iterate through the selected handles
            for (var i in handles) {
                if (handles.hasOwnProperty(i)) {

                    // Get the node information
                    var node = M.d[handles[i]];
                    var linkInfo = {};

                    // Only nodes with public handle
                    if (node && node.ph) {

                        // Folder
                        if (node.t) {
                            linkInfo.type = exportPassword.LINK_TYPE_FOLDER;    // 0 byte for folder link
                            linkInfo.key = u_sharekeys[node.h][0];              // 128 bit key as array of 32 bit int
                        }
                        else {
                            // File
                            linkInfo.type = exportPassword.LINK_TYPE_FILE;      // 1 byte for file link
                            linkInfo.key = node.k;                              // 256 bit key as array of 32 bit int
                        }

                        // Convert the key to a byte array (big endian), also add the link's handle and public handle
                        linkInfo.keyBytes = a32_to_ab(linkInfo.key);
                        linkInfo.handle = node.h;
                        linkInfo.publicHandle = node.ph;

                        // Generate a random salt for encrypting this link
                        var algorithm = exportPassword.currentAlgorithm;
                        var saltLengthBytes = exportPassword.algorithms[algorithm].saltLength / 8;
                        linkInfo.saltBytes = crypto.getRandomValues(new Uint8Array(saltLengthBytes));

                        // Add object to array
                        links.push(linkInfo);
                    }
                }
            }

            return links;
        }
    },  // Encrypt functions


    /**
     * Functions for the decryption
     */
    decrypt: {

        // The jQuery selector for the Export dialog
        $dialog: null,

        /**
         * Initialise function
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        init: function(page) {

            "use strict";

            // Cache dialog selector
            this.$dialog = $('.fm-dialog.password-dialog', 'body');

            // Show the dialog
            this.showDialog(page);
        },

        /**
         * Shows the dialog to let the user decrypt the link using a password
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        showDialog: function(page) {

            "use strict";

            var $closeButton = $('.fm-dialog-close', this.$dialog);
            var $decryptButton = $('.decrypt-link-button', this.$dialog);
            var $decryptButtonText = $('.decrypt-text', $decryptButton);
            var $decryptInput = $('.password-decrypt-input', this.$dialog);

            // Show a background overlay
            fm_showoverlay();

            // Show the dialog
            $.dialog = 'passwordlink-dialog';
            this.$dialog.removeClass('hidden');

            // Reset state of dialog for future password link decryptions
            $decryptButtonText.text(l[1027]);   // Decrypt

            // Add a click handler for the close button to return to the home page (or cloud drive if logged in)
            $closeButton.rebind('click', function() {
                loadSubPage('');
                return false;
            });

            // Add click handler for Decrypt button
            $decryptButton.rebind('click', function() {
                exportPassword.decrypt.decryptLink(page);
            });

            // Listen for Enter key to fire decryption
            $decryptInput.rebind('keyup', function(ev) {
                if (ev.keyCode === 13) {
                    exportPassword.decrypt.decryptLink(page);
                }
            });
        },

        /**
         * Decrypts the password protected link and redirects to the real folder/file link
         * @param {String} page The current page's URL hash e.g. #P!AAA5TWTcNMtFlJ5A...
         */
        decryptLink: function(page) {

            "use strict";

            var $decryptButton = $('.decrypt-link-button', this.$dialog);
            var $decryptButtonText = $('.decrypt-text', $decryptButton);
            var $decryptButtonProgress = $('.decryption-in-progress', $decryptButton);
            var $password = $('.password-decrypt-input', this.$dialog);
            var $errorLabel = $('.password-link-decrypt-error', this.$dialog);

            // Get the password and the encoded information in the URL
            var password = $password.val();
            var urlEncodedInfo = page.replace('P!', '');
            var decodedBytes = null;

            // If no password given...
            if (!password) {
                $errorLabel.text(l[970]);  // Please enter a valid password...
                return false;
            }

            // Hide previous errors
            $errorLabel.text('');

            // Decode the request
            try {
                decodedBytes = exportPassword.base64UrlDecode(urlEncodedInfo);
            }
            catch (exception) {

                // Show error and abort
                $errorLabel.text(l[9068]);  // The link could not be decoded...
                return false;
            }

            // Get the algorithm used
            var algorithm = decodedBytes[0];

            // Check if valid array index or will throw an exception
            if (typeof exportPassword.algorithms[algorithm] === 'undefined') {

                // Show error and abort
                $errorLabel.text(l[9069]);  // The algorithm this link was encrypted with is not supported
                return false;
            }

            // Get the salt bytes, start offset at 8 (1 byte for alg + 1 byte for file/folder + 6 for handle)
            var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
            var saltStartOffset = 8;
            var saltEndOffset = saltStartOffset + saltLength;
            var saltBytes = decodedBytes.subarray(saltStartOffset, saltEndOffset);

            // Show encryption loading animation and change text to 'Decrypting'
            $decryptButtonProgress.removeClass('hidden');
            $decryptButtonText.text(l[8579]);

            // Compute the PBKDF
            exportPassword.deriveKey(algorithm, saltBytes, password, function(derivedKeyBytes) {

                // Get the MAC from the decoded bytes
                var macLength = exportPassword.algorithms[algorithm].macLength / 8;
                var macStartOffset = decodedBytes.length - macLength;
                var macEndOffset = decodedBytes.length;
                var macToVerifyBytes = decodedBytes.subarray(macStartOffset, macEndOffset);

                // Get the data to verify
                var dataToVerify = decodedBytes.subarray(0, macStartOffset);

                // Get the MAC key
                var macKeyLength = exportPassword.algorithms[algorithm].macKeyLength / 8;
                var macKeyStartOffset = derivedKeyBytes.length - macKeyLength;
                var macKeyEndOffset = derivedKeyBytes.length;
                var macKeyBytes = derivedKeyBytes.subarray(macKeyStartOffset, macKeyEndOffset);

                // Compute the MAC over the data to verify
                var dataToVerifyBytes = decodedBytes.subarray(0, macStartOffset);
                var macAlgorithm = exportPassword.algorithms[algorithm].macName;

                // If the link was created with an old algorithm (1) which used parameter order: HMAC(password, data)
                if (algorithm === 1) {
                    var macBytes = asmCrypto[macAlgorithm].bytes(macKeyBytes, dataToVerifyBytes);
                }
                else {
                    // Otherwise for newer links (algorithm >= 2) use the correct parameter order: HMAC(data, password)
                    var macBytes = asmCrypto[macAlgorithm].bytes(dataToVerifyBytes, macKeyBytes);
                }

                // Convert the string to hex for simple string comparison
                var macString = asmCrypto.bytes_to_hex(macBytes);
                var macToVerifyString = asmCrypto.bytes_to_hex(macToVerifyBytes);

                // Compare the MAC in the URL to the computed MAC
                if (macString !== macToVerifyString) {

                    // Show error and abort
                    $errorLabel.text(l[9076]);  // The link could not be decrypted...
                    $decryptButtonProgress.addClass('hidden');
                    $decryptButtonText.text(l[1027]);
                    return false;
                }

                // Get the link type char code and set the default key length to 32 bytes
                var linkTypeByte = decodedBytes[1];
                var linkType = linkTypeByte;
                var keyLength = 32;

                // If folder link, set the key length to 16 bytes
                if (linkType === exportPassword.LINK_TYPE_FOLDER) {
                    keyLength = 16;
                }

                // Get the encryption key from the derived key
                var encKeyBytes = derivedKeyBytes.subarray(0, keyLength);

                // Get the encrypted key, start is (2 bytes for alg and type + 6 bytes for handle + salt)
                var saltLength = exportPassword.algorithms[algorithm].saltLength / 8;
                var startOffset = 2 + 6 + saltLength;
                var endOffset = startOffset + keyLength;
                var encryptedKeyBytes = dataToVerify.subarray(startOffset, endOffset);

                // Decrypt the file/folder link key
                var decryptedKey = exportPassword.xorByteArrays(encKeyBytes, encryptedKeyBytes);

                // Recreate the original file/folder link
                var handleBytes = dataToVerify.subarray(2, 8);
                var handleUrlEncoded = exportPassword.base64UrlEncode(handleBytes);
                var decryptedKeyUrlEncoded = exportPassword.base64UrlEncode(decryptedKey);
                var folderIdentifier = (linkType === exportPassword.LINK_TYPE_FOLDER) ? 'F' : '';
                var url = folderIdentifier + '!' + handleUrlEncoded + '!' + decryptedKeyUrlEncoded;


                if (mega.flags.nlfe) {
                    url = (folderIdentifier ? '/folder/' : '/file/') + handleUrlEncoded
                        + '#' + decryptedKeyUrlEncoded;
                }


                // Show completed briefly before redirecting
                $decryptButtonProgress.addClass('hidden');
                $decryptButtonText.text(l[9077]);   // Decrypted

                // Clear password field
                $password.val('');

                // Add a log to see if the feature is used often
                api_req({ a: 'log', e: 99633, m: 'Successfully decrypted password protected link on regular web' });

                // On success, redirect to actual file/folder link
                folderlink = false;
                loadSubPage(url);
            });
        }
    },  // Decrypt functions


    /**
     * Common functions for encryption and decryption
     */

    /**
     * A wrapper function used for deriving a key from a password.
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {String} password The raw password as entered by the user e.g. in ASCII or UTF-8
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKey: function(algorithm, saltBytes, password, callback) {

        "use strict";

        // Trim the password and convert it from ASCII/UTF-8 to a byte array
        var passwordTrimmed = $.trim(password);
        var passwordBytes = this.stringToByteArray(passwordTrimmed);

        // If Web Crypto method supported, use that
        if (window.crypto && window.crypto.subtle) {
            this.deriveKeyWithWebCrypto(algorithm, saltBytes, passwordBytes, callback);
        }
        else {
            // Otherwise use asmCrypto which is the next fastest
            this.deriveKeyWithAsmCrypto(algorithm, saltBytes, passwordBytes, callback);
        }
    },

    /**
     * Derive the key using the Web Crypto API
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithWebCrypto: function(algorithm, saltBytes, passwordBytes, callback) {

        "use strict";

        // Get algorithm details
        var name = this.algorithms[algorithm]['name'];
        var hash = this.algorithms[algorithm]['hash'];
        var iterations = this.algorithms[algorithm]['iterations'];
        var derivedKeyLength = this.algorithms[algorithm]['derivedKeyLength'];

        // Import the password as the key
        crypto.subtle.importKey(
            'raw', passwordBytes, name, false, ['deriveBits']
        )
        .then(function(key) {

            // Required PBKDF2 parameters
            var params = {
                name: name,
                hash: hash,
                salt: saltBytes,
                iterations: iterations
            };

            // Derive bits using the algorithm
            return crypto.subtle.deriveBits(params, key, derivedKeyLength);
        })
        .then(function(derivedKeyArrayBuffer) {

            // Convert to a byte array
            var derivedKeyBytes = new Uint8Array(derivedKeyArrayBuffer);

            // Pass the derived key to the callback
            callback(derivedKeyBytes);
        });
    },

    /**
     * Derive the key using asmCrypto
     * @param {Number} algorithm The index of the algorithms array describing which algorithm to use
     * @param {Uint8Array} saltBytes The salt as a byte array
     * @param {Uint8Array} passwordBytes The password as a byte array
     * @param {Function} callback A function to call when the operation is complete
     */
    deriveKeyWithAsmCrypto: function(algorithm, saltBytes, passwordBytes, callback) {

        "use strict";

        // Get algorithm details
        var name = this.algorithms[algorithm]['failsafeName'];
        var iterations = this.algorithms[algorithm]['iterations'];
        var keyLengthBits = this.algorithms[algorithm]['derivedKeyLength'];
        var keyLengthBytes = keyLengthBits / 8;

        // Give the UI some time to update on slower devices like iOS
        setTimeout(function() {

            // Derive the key
            var derivedKeyBytes = asmCrypto[name].bytes(passwordBytes, saltBytes, iterations, keyLengthBytes);

            // Pass the derived key to the callback
            callback(derivedKeyBytes);

        }, 500);
    },

    /**
     * This function encodes the data to Base64 then removes or replaces characters that will break
     * in the URL. It is similar to the base64urlencode function in crypto.js but works on a byte array.
     *
     * @param {Uint8Array} dataBytes The data as a byte array to be converted to Base64
     * @return {String} Returns a URL safe Base64 encoded string e.g. v9jVaZfyT_cuKEV-JviPAhvv
     */
    base64UrlEncode: function(dataBytes) {

        "use strict";

        // Convert the data to regular Base64
        var dataBase64 = asmCrypto.bytes_to_base64(dataBytes);

        // Remove plus signs, forward slashes and equals signs (padding)
        var dataBase64UrlEncoded = dataBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        return dataBase64UrlEncoded;
    },

    /**
     * This function decodes the data from a URL safe Base64 string back to regular Base64 then back to bytes.
     * It is similar to the base64urldecode function in crypto.js but converts the string back to a byte array.
     *
     * @param {String} dataText A URL safe Base64 encoded string e.g. v9jVaZfyT_cuKEV-JviPAhvv
     * @returns {Uint8Array} Returns the decoded data as a byte array
     */
    base64UrlDecode: function(dataText) {

        "use strict";

        // Restore the padding then replace the plus signs and forward slashes
        dataText += '=='.substr((2 - dataText.length * 3) & 3);
        dataText = dataText.replace(/\-/g, '+').replace(/_/g, '/');

        // Convert the data from regular Base 64 to bytes
        var dataBytes = asmCrypto.base64_to_bytes(dataText);

        return dataBytes;
    },

    /**
     * XOR two arrays of type Uint8Array together e.g. useful for encryption or decryption
     * @param {Uint8Array} array1 The first array e.g. the encryption key
     * @param {Uint8Array} array2 The second array e.g. the data to encrypt
     * @returns {Uint8Array}
     */
    xorByteArrays: function(array1, array2) {

        "use strict";

        var numOfBytes = array1.length;
        var result = new Uint8Array(numOfBytes);

        // XOR each byte in the array with the corresponding byte from the other
        for (var i = 0; i < numOfBytes; i++) {
            result[i] = array1[i] ^ array2[i];
        }

        return result;
    },

    /**
     * Converts a UTF-8 string to a byte array
     * @param {String} string A string of any character including UTF-8 chars e.g. password123
     * @returns {Uint8Array} Returns a byte array
     */
    stringToByteArray: function(string) {

        "use strict";

        var encoder = new TextEncoder('utf-8');

        return encoder.encode(string);
    }
};

/**
 * Functionality for the Export Link expiry feature
 */
var exportExpiry = {

    /**
     * Initialise function
     */
    init: function() {

        "use strict";

        this.$dialog = $('.fm-dialog.export-links-dialog');
        this.$datepickerBtn = $('.default-white-button.expiry', this.$dialog);

        // If they are a pro user, enable expiry date
        if (u_attr.p) {

            M.require('datepicker_js').done(function() {
                exportExpiry.initExpiryDatePicker();
                exportExpiry.prepopulateExpiryDates();
            });
        }
    },

    /**
     * Setup the datepicker
     */
    initExpiryDatePicker: function() {

        "use strict";

        var self = this;
        var $setDateInput = $('.set-date', self.$dialog);
        var $removeDateBtn = $('.sub-button', self.$datepickerBtn);
        var $scroll = $('.links-scroll', this.$dialog);
        var minDate = new Date();
        var maxDate = new Date(2060, 11, 31);
        var datepicker;

        // Set Minimum date at least 1 day in the future
        minDate.setDate(minDate.getDate() + 1);

        // Initialise expiry date picker
        datepicker = $setDateInput.datepicker({

            // Date format, @ - Unix timestamp
            dateFormat: '@',
            // Minimum date that can be selected
            minDate: minDate,
            // Maximum date that can be selected
            maxDate: maxDate,
            // Start date that should be displayed when datepiccker is shown
            startDate: minDate,
            // Content of Previous button
            prevHtml: '<i class="medium-icon dialog-sprite right-arrow"></i>',
            // Content of Next button
            nextHtml: '<i class="medium-icon dialog-sprite right-arrow"></i>',
            // First day in the week. 0 - Sun
            firstDay: 0,
            // Auto close daticker is date is selected
            autoClose: true,
            // If true, then clicking on selected cell will remove selection
            toggleSelected: false,
            // Cursom localization
            language: {
                // Sun - Sat
                daysMin: [l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]],
                months: [
                    l[408], l[409], l[410], l[411], l[412], l[413],     // January - June
                    l[414], l[415], l[416], l[417], l[418], l[419]      // July - December
                ],
                monthsShort: [
                    l[24035], l[24037], l[24036], l[24038], l[24047], l[24039],     // January - June
                    l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]      // July - December
                ]
            },

            // Change Month select box width on Show
            onShow: function(inst) {

                var $inputClicked = inst.$el;
                var $datepicker = inst.$datepicker;

                // Show previously selected date or min date as default
                if (inst.selectedDates[0]) {
                    inst.date = inst.selectedDates[0];
                }
                else {
                    inst.date = minDate;
                }

                // Update datepicker data
                inst.update();

                // Change datepicker position related to clicked element
                inst.setPosition = function() {

                    $datepicker.position({
                        of: $inputClicked,
                        my: 'center top',
                        at: 'center top-30',
                        collision: "flipfit"
                    });
                };

                // Change datepicker position
                Soon(inst.setPosition);

                // Change position on resize
                $(window).rebind('resize.setDatepickerPosition', function() {
                    inst.setPosition();
                });

                // Disable scrolling
                delay('disableExportScroll', function() {
                    Ps.disable($scroll[0]);
                }, 100);

                // Close export dropdown
                $('.dropdown.export', self.$dialog).addClass('hidden');

                // Close set password dialog
                exportPassword.encrypt.hideSetPasswordDialog();
            },

            onSelect: function(dateText, date, inst) {

                var $inputClicked = inst.$el;

                // Select link item
                $('.item.selected', self.$dialog).removeClass('selected');
                $inputClicked.closest('.item').addClass('selected');

                // Update the link with the new expiry timestamp
                exportExpiry.updateLinks(dateText / 1000);
            },

            onHide: function() {

                // Enable scroll
                Ps.enable($scroll[0]);

                // Unbind dialog positioning
                $(window).unbind('resize.setDatepickerPosition');
            }

        }).data('datepicker');

        // Clear active dates
        datepicker.selectedDates = [];

        // Press Enter key if datepicker dropdown is opened
        $setDateInput.rebind('keydown.date', function(event) {

            // If Enter key is pressed
            if (event.keyCode === 13) {
                $(this).blur();

                // Trigger click If date is selected in datepicker
                if ($('.ui-datepicker .ui-state-active', 'body').length) {
                    $('.ui-datepicker .ui-state-active', 'body').trigger('click');
                }
            }
        });

        // Remove date button
        $removeDateBtn.rebind('click.clearExpiry', function() {

            // Unselect link items
            $('.item.selected', this.$dialog).removeClass('selected');

            // Remove selected date from all items
            datepicker.clear();

            // Update common Set Expiry Date button
            exportExpiry.updateExpiryButtons();

            // Update the selected links and remove the expiry timestamps
            exportExpiry.updateLinks();
        });
    },

    /**
     * Update Set Expiry Date buttons states
     */
    updateExpiryButtons: function() {

        "use strict";

        var $expiryLinks = $('.links-scroll .item.dateSet', this.$dialog);
        var $setDateBtn = this.$datepickerBtn;
        var $setDateInput = $('.set-date', $setDateBtn);
        var datepicker = $setDateInput.datepicker().data('datepicker');
        var $btnLabel = $('.label', $setDateBtn);
        var $removeDateBtn = $('.sub-button', $setDateBtn);
        var buttonLabel;

        // Clear active dates
        datepicker.selectedDates = [];

        // If there is at least one expiry date set
        if ($expiryLinks.length) {

            // Show Remove Expiry Date button
            $removeDateBtn.removeClass('hidden');

            // Get button label
            $expiryLinks.get().forEach(function(e) {

                var $this = $(e);
                var date = $('.calendar input', $this).data('expiry');

                // If timestamps are different, use "Multiple dates set" as label
                if (buttonLabel && buttonLabel !== date) {

                    // Use "Multiple dates set" as button label
                    buttonLabel = l[23674];

                    return false;
                }

                buttonLabel = date;
            });

            // If label is Unixtimestamp, convert it to necessary formats and set active date to common datepicker
            if (Number(buttonLabel)) {

                // Set active date in datepicker component
                datepicker.selectedDates = [new Date(buttonLabel * 1000)];

                // Change "Set  expiry date" button label
                buttonLabel = time2date(buttonLabel, 5);
            }

            // Set expiry date button label
            $btnLabel.text(buttonLabel);
        }
        else {

            // Clear the date of any old entries and set "Set  expiry date" button label
            $btnLabel.text(l[8953]);
            $removeDateBtn.addClass('hidden');
        }
    },

    /**
     * Update selected links with details about the expiry of the link
     * @param {Number} expiryTimestamp The expiry timestamp of the link. Set to null to remove the expiry time
     */
    updateLinks: function(expiryTimestamp) {

        "use strict";

        var $links = $('.item', this.$dialog);
        var $selectedLink =  $('.item.selected', this.$dialog);
        var handles = [];

        // Create array of available links handles
        if ($selectedLink.length) {
            handles.push($selectedLink.data('node-handle'));
        }
        else {
            $links.get().forEach(function(e) {
                handles.push($(e).data('node-handle'));
            });
        }

        // Iterate through the selected handles
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var handle = node.h;

                // The data to send in the API request
                var request = {
                    a: 'l',             // Link
                    n: handle,
                    i: requesti
                };

                // If the expiry timestamp is set
                if (expiryTimestamp) {

                    // Add it to be sent in the request
                    request.ets = expiryTimestamp;
                }

                // Show the expiry time if applicable or remove it
                exportExpiry.setExpiryIconTime(expiryTimestamp, handle);

                // Update the link with the new expiry timestamp
                api_req(request);
            }
        }

        // Update common Set Expiry Date button
        exportExpiry.updateExpiryButtons();
    },

    /**
     * If reloading the dialog, check the local state and show the expiry time for each key block if applicable
     */
    prepopulateExpiryDates: function() {

        "use strict";

        // Get the selected files/folders
        var handles = $.selected;

        // Keep a counter for how many nodes have expiry times
        var numOfNodesWithExpiryTime = 0;
        var lastExpireTime = null;

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var nodeHandle = node.h;
                var expiryTimestamp = M.getNodeShare(node).ets;

                // If it has an expiry time, increment the count
                if (expiryTimestamp) {

                    // Set expiry timestamp if exists
                    exportExpiry.setExpiryIconTime(expiryTimestamp, nodeHandle);
                }
            }
        }

        // Init expiry tips
        exportExpiry.initExpiryTip();

        // Update common Set Expiry Date button
        exportExpiry.updateExpiryButtons();
    },

    /**
     * Sets the expiry time on the selected export key
     * @param {Number} expiryTimestamp The UNIX timestamp when the link will expire, set to null to hide
     * @param {String} nodeHandle The node handle which references the key block to update
     */
    setExpiryIconTime: function(expiryTimestamp, nodeHandle) {

        "use strict";

        // Find the right row
        var $linkItem = $('.export-links-dialog.item[data-node-handle="' + nodeHandle + '"]', this.$dialog);
        var $expiryIcon = $('.small-icon.calendar', $linkItem);
        var $setDateInput = $('input', $expiryIcon);
        var datepicker = $setDateInput.datepicker().data('datepicker');
        var expiryString = '';

        // Clear active dates
        datepicker.selectedDates = [];

        // If the expiry timestamp is set
        if (expiryTimestamp) {

            // If the link has expired
            if (unixtime() >= expiryTimestamp) {

                // Use 'Expired' string
                expiryTimestamp = l[1664];
            }
            else {

                // Set active date in datepicker component
                datepicker.selectedDates = [new Date(expiryTimestamp * 1000)];
            }

            // Set special Expiry classname
            $linkItem.addClass('dateSet');

            // Show it
            $expiryIcon.removeClass('hidden');
        }
        else {

            // Set special Expiry classname
            $linkItem.removeClass('dateSet');

            // Hide it
            $expiryIcon.addClass('hidden');
        }

        // Set or clear the text
        $('input', $expiryIcon).data('expiry', expiryTimestamp);
    },

    /**
     * Init Expire date tooltip
     */
    initExpiryTip: function() {

        "use strict";

        var $linkItem = $('.export-links-dialog.item', this.$dialog);
        var $expiryIcon = $('.small-icon.calendar', $linkItem);
        var $tip =  $('.dark-direct-tooltip.custom-html', this.$dialog);
        var $scrollBlock = $('.links-scroll', this.$dialog);

        // Hide a tip with Expiry date
        var hideExpiryTip = function() {

            $tip.removeClass('visible');
            $('.content', $tip).text('');
            $scrollBlock.unbind('scroll.hideExpiryTip');
        };

        // Show tooltip
        $expiryIcon.rebind('mouseover.showExpiryTip', function() {
            var $this = $(this);
            var date = $('input', $this).data('expiry');
            var tipContent;

            if (Number(date)) {

                // Change date format and use "Expires %1" string
                date = time2date(date, 5);
                tipContent = l[8698].replace('%1', '<span class="green">' + date + '</span');
            }
            else {

                // Use "Expired" string
                tipContent = '<span class="green">' + date + '</span';
            }

            // Fill the tip content
            $('.content', $tip).safeHTML(tipContent);

            $tip.addClass('visible').position({
                of: $this,
                my: 'center bottom',
                at: 'center bottom-30',
                collision: "flipfit"
            });

            // Hide tooltip if content is scrolled
            $scrollBlock.rebind('scroll.hideExpiryTip', function() {

                if ($(this).is('.ps-active-y')) {

                    hideExpiryTip();
                }
            });
        });

        // Hide tooltip
        $expiryIcon.rebind('mouseout.hideExpiryTip', function() {

            hideExpiryTip();
        });
    }
};


/**
 * Functionality for the Export Link dialog
 */
(function($, scope) {

    /**
     * Public Link Dialog
     * @param opts {Object}
     * @constructor
     */
    var ExportLinkDialog = function(opts) {

        "use strict";

        var self = this;

        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        self.logger = MegaLogger.getLogger('ExportLinkDialog');
    };

    /**
     * Render public link dialog and handle events
     * @param {Boolean} close To close or to show public link dialog
     */
    ExportLinkDialog.prototype.linksDialog = function(close) {

        "use strict";

        if (M.isInvalidUserStatus()) {
            return;
        }

        /* jshint -W074 */
        var self = this;
        var $linksDialog = $('.fm-dialog.export-links-dialog');
        var $linksTab = $('.export-links-dialog.body', $linksDialog);
        var $linksHeader = $('.export-links-dialog.header.get-link', $linksDialog);
        var $linkContent = $('.export-links-dialog.links', $linksTab);
        var $keysCheckbox = $('.checkdiv input', $linksTab);
        var $embedHeader  = $('.export-links-dialog.header.embed', $linksDialog);
        var $embedTab = $('.embed-content-block', $linksDialog);
        var $options = $('.export-links-dialog.options', $linksTab);
        var $proOptions = $('.export-links-dialog.pro', $options);
        var $setPasswordtem = $('.link-button.set-password', $linksTab);
        var $setExpiryItem = $('.link-button.set-exp-date', $linksTab);
        var $removeItem = $('.link-button.remove-item', $linksTab);
        var $bottomBar = $('.export-links-dialog.bottom', $linksTab);
        var $copyKeysButton = $('.button.copy.keys', $bottomBar);
        var $calendarIcons;
        var $lockIcons;
        var $cogIcons;
        var $datepickerInputs = $('.set-date', $linksDialog);
        var html = '';
        var $scroll = $('.export-links-dialog.links-scroll', $linksTab);
        var links;
        var toastTxt;
        var linksNum;

        // Close dialog
        if (close) {

            closeDialog();

            if (window.onCopyEventHandler) {
                document.removeEventListener('copy', window.onCopyEventHandler, false);
                delete window.onCopyEventHandler;
            }

            affiliateUI.registeredDialog.show();

            // Remove Datepicker dialogs
            for (var i = $datepickerInputs.length; i--;) {

                var $datepicker = $($datepickerInputs[i]).data('datepicker');

                if ($datepicker && $datepicker.inited) {
                    $datepicker.destroy();
                }
            }

            $('.datepicker', '.datepickers-container').remove();

            return true;
        }

        // Delete old Export links scrolling
        if ($scroll.is('.ps-container')) {
            Ps.destroy($scroll[0]);
        }

        // Generate content
        html = itemExportLink();

        // Fill with content
        if (!html.length) { // some how we dont have a link
            msgDialog('warninga', l[17564], l[17565]);
            return true;
        }
        $scroll.safeHTML(html);

        // Hide embed tab
        $('.export-links-dialog.header', $linksDialog).removeClass('active');
        $('.preview-embed', $linksDialog).addClass('hidden');
        $embedHeader.addClass('hidden');
        $embedTab.addClass('hidden');

        // Show Export links tab
        $linksTab.removeClass('hidden');
        $linkContent.removeClass('hidden');
        $('.dropdown.export', $linksTab).addClass('hidden');

        // Set Export links content selectors
        $calendarIcons = $('.icons .calendar', $linksTab);
        $lockIcons = $('.icons .lock', $linksTab);
        $cogIcons = $('.icons .cog', $linksTab);

        // Set Export links default states
        $calendarIcons.addClass('hidden');
        $lockIcons.addClass('hidden');
        $cogIcons.addClass('hidden');
        $setPasswordtem.addClass('hidden');
        $setExpiryItem.addClass('hidden');
        $removeItem.addClass('hidden');
        $options.addClass('hidden');
        $proOptions.addClass('hidden disabled').unbind('click.openpro');
        $copyKeysButton.removeClass('disabled');
        $bottomBar.addClass('hidden');

        // Embed code handling
        var n = Object($.itemExport).length === 1 && M.d[$.itemExport[0]];

        if ($.itemExportEmbed || is_video(n) === 1 && !folderlink) {

            var link;
            var iframe = '<iframe width="%w" height="%h" frameborder="0" src="%s" allowfullscreen %a></iframe>\n';

            // Add special class to dialog
            $linksDialog.addClass('embed');

            if (mega.flags.nlfe) {
                link = getBaseUrl() + '/embed/' + n.ph + '#' + a32_to_base64(n.k);
            }
            else {
                link = getBaseUrl() + '/embed#!' + n.ph + '!' + a32_to_base64(n.k);
            }

            var setCode = function() {

                var time = 0;
                var width = 0;
                var height = 0;
                var autoplay = false;
                var muted = false;
                var optionAdded = false;
                var $time = $('.start-video-at .embed-setting', $embedTab);
                var $vres = $('.change-video-resolution .embed-setting', $embedTab);
                var $enauto = $('.enable-autoplay .checkdiv', $embedTab);
                var $muted = $('.mute-video .checkdiv', $embedTab);

                var getValue = function(s, c) {

                    var $input = $(s, c);
                    var value = String($input.val() || '').replace(/\.\d*$/g, '').replace(/\D/g, '');

                    value = parseInt(value || $input.attr('min') || '0') | 0;
                    $input.val(value);
                    return value;
                };

                if (!$time.hasClass('disabled')) {
                    time = getValue('input', $time);
                    optionAdded = true;
                }

                if (!$vres.hasClass('disabled')) {
                    width = getValue('.width-video input', $vres);
                    height = getValue('.height-video input', $vres);
                }

                if ($enauto.hasClass('checkboxOn')) {
                    autoplay = true;
                    optionAdded = true;
                }

                if ($muted.hasClass('checkboxOn')) {
                    muted = true;
                    optionAdded = true;
                }

                var code = iframe
                    .replace('%w', width > 0 && height > 0 ? width : 640)
                    .replace('%h', width > 0 && height > 0 ? height : 360)
                    .replace('%s', link + (optionAdded ? '!' : '') + (time > 0 ? time + 's' : '') +
                        (autoplay ? '1a' : '') + (muted ? '1m' : ''))
                    .replace('%a', autoplay ? 'allow="autoplay;"' : '');

                $('.code-field .code', $embedTab).text(code);
            };

            uiCheckboxes($('.settings-container', $linksDialog), function(enabled) {

                var $row = $(this).closest('.settings-row');
                var $setting = $('.embed-setting', $row);

                if (enabled) {
                    $setting.removeClass('disabled').find('input').prop('readonly', false).rebind('input', setCode);
                }
                else {
                    $setting.addClass('disabled').find('input').prop('readonly', true).off('input');
                }
                setCode();
            });

            // Reset all numeric inputs under Share Options
            $('.settings-container .embed-setting', $embedTab).addClass('disabled');
            $('.settings-container input[type=number]', $embedTab).get().forEach(function(e) {

                var $this = $(e);

                $this.val($this.attr('value'));
                $this.prop('readonly', true);
            });
            $embedHeader.removeClass('hidden');

            (function _() {

                $('.export-links-dialog.header', $linksDialog).removeClass('active').rebind('click.switchTab', _);

                if (this === window || $(this).is('.header.embed')) {
                    $embedHeader.addClass('active');
                    $embedTab.removeClass('hidden');
                    $linksTab.addClass('hidden');
                }
                else {
                    $linksHeader.addClass('active');
                    $embedTab.addClass('hidden');
                    $linksTab.removeClass('hidden');
                }

                dialogPositioning($linksDialog);

            }).call($.itemExportEmbed ? window : {});

            $.itemExportEmbed = null;

            $('.video-filename span', $embedTab).text(n.name);
            $('.video-attributes .size', $embedTab).text(bytesToSize(n.s));
            $('.video-attributes .duration', $embedTab)
                .text(secondsToTimeShort(MediaAttribute(n).data.playtime));

            var $thumb = $('.video-thumbnail img', $embedTab).attr('src', noThumbURI);

            getImage(n, 1).then(function(uri) {
                $thumb.attr('src', uri);
            }).catch(console.debug.bind(console));

            $('.code-field .code', $embedTab).rebind('click.selectTxt', function() {
                selectText('embed-code-field');
                return false;
            });

            $('.preview-embed', $embedTab).rebind('click.embed', function() {

                if ($(this).text() !== l[1899]) {
                    $(this).text(l[148]);
                    $('.video-thumbnail-container', $embedTab).addClass('hidden');
                    $('.video-player-container', $embedTab).removeClass('hidden')
                        .safeHTML(iframe.replace('%s', link));
                }
                else {
                    $(this).text(l[1899]);
                    $('.video-thumbnail-container', $embedTab).removeClass('hidden');
                    $('.video-player-container', $embedTab).addClass('hidden').text('');
                }

                $linksDialog.css('margin-top', $embedTab.outerHeight() / 2 * -1);
            });

            // Let's hide it for now...
            $('.preview-embed', $embedTab).addClass('hidden');

            setCode();
        }
        else {
            // Remove special Embed class
            $linksDialog.removeClass('embed');
        }

        // Show export dialog
        M.safeShowDialog('links', function() {

            // Show dialog
            fm_showoverlay();
            $linksDialog.removeClass('hidden');

            // Init Scrolling
            Ps.initialize($scroll[0]);
            $scroll.scrollTop(0);

            // Dialog repositioning
            onIdle(function() {
                dialogPositioning($linksDialog);
            });

            return $linksDialog;
        });

        // Close dialog button
        $('.fm-dialog-close', $linksDialog).rebind('click.closeDialog', function() {
            self.linksDialog(1);
        });

        // Change links view: w/o keys
        $keysCheckbox.rebind('change.changeView', function() {

            var isChecked = this.checked;
            var $checkboxWrap = $(this).parent();
            var $bottomBar = $('.export-links-dialog.bottom', $linksTab);

            // Change chekcbox state and adapt CopyToClipboard buttons
            if (isChecked) {
                $checkboxWrap.removeClass('checkboxOff').addClass('checkboxOn');
                $linkContent.addClass('separately');
                $('.copy.button.links', $bottomBar).text(l[23625]);
                $('.copy.button.keys', $bottomBar).removeClass('hidden');
            }
            else {
                $checkboxWrap.removeClass('checkboxOn').addClass('checkboxOff');
                $linkContent.removeClass('separately');
                $('.copy.button.links', $bottomBar).text(l[20840]);
                $('.copy.button.keys', $bottomBar).addClass('hidden');
            }

            // Update Link input values
            exportPassword.encrypt.updateLinkInputValues();
        });

        // Set separate links view default state
        Soon(function() {
            $keysCheckbox.prop('checked', !$keysCheckbox.prop('checked')).trigger('click');
        });

        // Decryption key tip repositioning
        $('.rounded-tip-button', $linksTab).rebind('mouseover.tipPosition', function() {

            var $this = $(this);
            var $tip = $('.dropdown', $this);
            var $exportDropdown = $('.dropdown.export', $linksTab);

            $tip.removeClass('left-arrow').addClass('down-arrow');
            $exportDropdown.addClass('hidden');

            if ($tip.offset().top < 0) {
                $tip.removeClass('down-arrow').addClass('left-arrow');
            }
        });

        // Copy all links/keys to clipboard
        $('.copy.button', $linksDialog).rebind('click.copyToClipboard', function() {

            var $this = $(this);
            var $links = $('.item', this.$dialog);
            var $item = $this.hasClass('current') ? $this.closest('.item') : undefined;
            var pwProtectedNum = $links.filter('.password-protect-link').length;
            var mode = $this.hasClass('keys') ? 'keys' : undefined;
            var data;

            if ($this.is('.disabled')) {
                return false;
            }

            // If Copy  button locates in Embed tab
            if ($('.export-links-dialog.embed', $linksDialog).hasClass('active')) {
                toastTxt = l[371];
                data =  $('.code-field .code', $linksDialog).text();
            }
            else {
                // If the button copies Keys only
                if (mode) {
                    linksNum = $item ? 1 : $links.length - pwProtectedNum;
                    toastTxt = linksNum > 1 ? l[23663].replace('%d', linksNum) : l[23664];
                }
                else {
                    linksNum = $item ? 1 : $links.length;
                    toastTxt = linksNum > 1 ? l[7655].replace('%d', linksNum) : l[7654];
                }

                // Set toast notification and data to copy
                data = $.trim(getClipboardLinks($item, mode));
            }

            // Copy to clipboard
            copyToClipboard(data, toastTxt);

            return false;
        });

        // Init FREE export links events
        var initFreeEvents = function() {

            // Add click event to Settings icon, show dropdown
            $cogIcons.rebind('click.showDropdown', function() {

                var $this = $(this);
                var $dropdown = $('.dropdown.export', $linksTab);
                var itemsLength = $('.export-links-dialog.item', $linksTab).length;
                var $currentItem = $this.closest('.item');
                var expiryLabel = $('.calendar.hidden', $currentItem).length ? l[8953] : l[23665];
                var passwordLabel = $('.lock.hidden', $currentItem).length ? l[17454] : l[23666];
                var removeLabel = itemsLength === 1 ? l[23668] : l[6821];

                // Set button labels
                $('.set-exp-date span', $dropdown).text(expiryLabel);
                $('.set-password span', $dropdown).text(passwordLabel);
                $('.remove-item span', $dropdown).text(removeLabel);

                // Disable scrolling
                delay('disableExportScroll', function() {
                    Ps.disable($scroll[0]);
                }, 100);

                // Select link item
                $('.item', $linksTab).removeClass('selected');
                $this.closest('.item').addClass('selected');

                // Dropdown positioning
                $dropdown.removeClass('hidden').position({
                    of: $this,
                    my: 'left top',
                    at: 'left top',
                    collision: 'flipfit'
                });
            });

            // Add click event to Remove link dropdown item
            $removeItem.rebind('click.removeLink', function() {

                var $selectedLink = $('.item.selected', $linksTab);
                var handle = $selectedLink.data('node-handle');
                var media = false;
                var $items;
                var itemsLength;

                // Create Remove link function
                var removeLink = function() {

                    // New export link
                    var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': [handle]});

                    // Remove link in "quite" mode without overlay
                    exportLink.removeExportLink(true);

                    // Remove Link item from DOM
                    $selectedLink.remove();

                    // Update Export links scrolling
                    if ($scroll.is('.ps-container')) {
                        Ps.update($scroll[0]);
                    }

                    // Get link items length
                    $items = $('.item', $linksTab);
                    itemsLength = $items.length;

                    // Close the dialog If there is no link items
                    if (!itemsLength) {

                        self.linksDialog(1);

                        return false;
                    }

                    // Update Password buttons and links UI
                    exportPassword.encrypt.updatePasswordComponentsUI();

                    // Update common Set Expiry Date button
                    exportExpiry.updateExpiryButtons();

                    // Change dialog position
                    dialogPositioning($linksDialog);
                };

                if (is_video(M.d[handle])) {
                    media = true;
                }

                // Show confirmartion dialog if handle is media
                if (media) {
                    msgDialog('confirmation', l[882], l[17824], 0, function(e) {
                        if (e) {
                            removeLink();
                        }
                    });
                }
                else {
                    removeLink();
                }
            });

            // Click anywhere in Export link dialog to hide dropdown
            $linksDialog.rebind('click.closeDropdown', function(e) {

                var $target = $(e.target);
                var $dropdown = $('.dropdown.export', $linksTab);

                if (!$target.is('.dropdown.export') && !$target.is('.cog')
                    && !$dropdown.is('.hidden')) {

                    // Enable scrolling
                    Ps.enable($scroll[0]);

                    // Close dropdown
                    $dropdown.addClass('hidden');
                }
            });

            // Set buttons default states, init events if available
            exportExpiry.init();
            exportPassword.encrypt.init();
        };

        // Init PRO events links events
        var initProEvents = function() {

            // Add click event to Set date dropdown item
            $setExpiryItem.rebind('click.setDate', function() {

                var $selectedLink = $('.item.selected', $linksTab);
                var datepicker = $('.set-date', $selectedLink).datepicker().data('datepicker');

                // Show datepicker
                datepicker.show();
            });

            // Add click event to Set password dropdown item
            $setPasswordtem.rebind('click.setPass', function() {

                // Show Set password dialog
                exportPassword.encrypt.showSetPasswordDialog();
            });
        };

        // Show and init options
        if (page === 'download') {

            return false;
        }
        else if (folderlink) {

            // Show options/features
            $options.removeClass('hidden');

            // Show bottom bar if there is more than one link
            if (Object($.itemExport).length > 1) {

                $bottomBar.removeClass('hidden');
            }
        }
        // Init FREE options
        else if (!u_attr.p) {

            // Show options/features
            $options.removeClass('hidden');
            $proOptions.removeClass('hidden');
            $cogIcons.removeClass('hidden');
            $removeItem.removeClass('hidden');

            // On PRO options click, go to the Pro page
            $proOptions.rebind('click.openpro', function() {
                open(getAppBaseUrl() + '#pro');
            });

            // Init FREE events
            initFreeEvents();
        }
        // Init PRO options
        else if (u_attr.p) {

            // Enable PRO options
            $options.removeClass('hidden');
            $proOptions.removeClass('hidden disabled');

            // Show PRO menu items
            $cogIcons.removeClass('hidden');
            $removeItem.removeClass('hidden');
            $setPasswordtem.removeClass('hidden');
            $setExpiryItem.removeClass('hidden');

            // Init FREE and PRO events
            initFreeEvents();
            initProEvents();
        }
    };


    // ------------------------------------
    // ----- PRIVATE FUNCTIONS FOLLOW -----
    // ------------------------------------


    /**
     * getClipboardLinks
     *
     * Gether all available public links for selected items (files/folders).
     * @returns {String} links URLs or decryption keys for selected items separated with newline '\n'.
     * @param {Object} $items Links selector
     * @param {String} mode Contains View mode name: Show links w/o keys
     */
    function getClipboardLinks($items, mode) {

        "use strict";

        var links = [];
        var $dialog = $('.fm-dialog.export-links-dialog', 'body');

        if (!$items) {
            $items = $('.export-links-dialog.item', $dialog);
        }

        // Otherwise add all regular links
        $items.get().forEach(function(e) {

            var nodeUrlWithPublicHandle = $('.link input', e).val();
            var nodeDecryptionKey = $('.key input', e).val();

            // Check export/public link dialog drop down list selected option
            if (mode === 'keys' && !$(this).hasClass('password')) {
                if (nodeDecryptionKey) {
                    links.push(nodeDecryptionKey);
                }
            }
            else {
                links.push(nodeUrlWithPublicHandle);
            }
        });

        return links.join("\n");
    }

    /**
     * itemExportLinkHtml
     *
     * @param {Object} item
     * @returns {String}
     * @private
     */
    function itemExportLinkHtml(item) {

        "use strict";

        var key;
        var type;
        var fileSize;
        var folderClass = '';
        var html = '';
        var nodeHandle = item.h;
        var fileUrlKey;
        var fileUrlWithoutKey;
        var fileUrlNodeHandle = '';

        // Add a hover text for the icon
        var expiresTitleText = l[8698].replace('%1', '');   // Expires %1

        if (folderlink) {
            if (mega.flags.nlfe) {
                fileUrlWithoutKey = getBaseUrl() + '/folder/' + pfid;
                fileUrlKey = '#' + pfkey;
                fileUrlNodeHandle = (item.t ? '/folder/' : '/file/') + item.h;
            }
            else {
                fileUrlWithoutKey = getBaseUrl() + '/#F!' + pfid;
                fileUrlKey = '!' + pfkey;
                fileUrlNodeHandle = (item.t ? '!' : '?') + item.h;
            }
            fileSize = item.s && htmlentities(bytesToSize(item.s)) || '';
        }
        else if (item.t) {
            // Shared item type is folder
            key = u_sharekeys[item.h] && u_sharekeys[item.h][0];

            // folder key must exit, otherwise skip
            if (!key) {
                return '';
            }

            type = 'F';
            fileSize = '';
            folderClass = ' folder-item';
        }
        else {
            // Shared item type is file
            type = '';
            key = item.k;
            fileSize = htmlentities(bytesToSize(item.s));
        }

        if (!fileUrlWithoutKey) {
            if (mega.flags.nlfe) {
                fileUrlWithoutKey = (getBaseUrl() + (type ? '/folder/' : '/file/') + htmlentities(item.ph));
            }
            else {
                fileUrlWithoutKey = (getBaseUrl() + '/#' + type + '!' + htmlentities(item.ph));
            }
        }

        if (!fileUrlKey) {
            if (mega.flags.nlfe) {
                fileUrlKey = (key ? '#' + a32_to_base64(key) : '');
            }
            else {
                fileUrlKey = (key ? '!' + a32_to_base64(key) : '');
            }
        }

        html = '<div class="export-links-dialog item" data-node-handle="' + nodeHandle + '">'
             +      '<div class="export-links-dialog icons">'
             +          '<i class="small-icon dialog-sprite cog"></i>'
             +          '<i class="small-icon context-sprite lock hidden"></i>'
             +          '<i class="small-icon context-sprite calendar hidden">'
             +              '<input type="text" class="set-date" data-node-handle="' + nodeHandle + '">'
             +          '</i>'
             +      '</div>'
             +      '<div class="transfer-filetype-icon ' + fileIcon(item) + '" ></div>'
             +      '<div class="export-links-dialog item-title">' + htmlentities(item.name) + '</div>'
             +      '<div class="export-links-dialog item-size">' + fileSize + '</div>'
             +      '<div class="clear"></div>'
             +      '<div class="export-links-dialog item-link link">'
             +          '<div class="export-links-dialog input-wrap">'
             +              '<i class="small-icon dialog-sprite chain"></i>'
             +              '<input type="text" data-link="' + fileUrlWithoutKey + '" data-key="'
             +                  fileUrlKey + fileUrlNodeHandle + '" '
             +                  'value="' + fileUrlWithoutKey + fileUrlKey + fileUrlNodeHandle + '" readonly>'
             +          '</div>'
             +          '<div class="button default-green-button semi-big gradient copy current">'
             +              l[63]
             +          '</div>'
             +      '</div>'
             +      '<div class="export-links-dialog item-link key">'
             +          '<div class="export-links-dialog input-wrap">'
             +              '<i class="small-icon dialog-sprite key"></i>'
             +              '<input type="text" data-key="' + fileUrlKey.substring(1) + fileUrlNodeHandle + '" value="'
             +              fileUrlKey.substring(1) + fileUrlNodeHandle + '" readonly>'
             +          '</div>'
             +          '<div class="button default-green-button semi-big gradient copy current keys">'
             +              l[63]
             +          '</div>'
             +      '</div>'
             +      '<div class="clear"></div>'
             +  '</div>';

        return html;
    }

    /**
     * generates file url for shared item
     *
     * @returns {String} html
     * @private
     */
    function itemExportLink() {

        "use strict";

        var html = '';

        $.itemExportHasFolder = false;
        $.itemExportHasFile = false;

        $.each($.itemExport, function(index, value) {

            var node = M.d[value];

            if (node && (folderlink || node.ph)) {
                html += itemExportLinkHtml(node);
            }

            if (node.t) {
                $.itemExportHasFolder = true;
            }
            else {
                $.itemExportHasFile = true;
            }
        });

        return html;
    }

    // export
    scope.mega = scope.mega || {};
    scope.mega.Dialog = scope.mega.Dialog || {};
    scope.mega.Dialog.ExportLink = ExportLinkDialog;

})(jQuery, window);


(function($, scope) {
    /**
     * ExportLink related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var ExportLink = function(opts) {

        "use strict";

        var self = this;

        var defaultOptions = {
            'updateUI': false,
            'nodesToProcess': [],
            'showExportLinkDialog': false
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        // Number of nodes left to process
        self.nodesLeft = self.options.nodesToProcess.length;
        self.logger = MegaLogger.getLogger('ExportLink');
    };

    /**
     * Get public link for file or folder.
     */
    ExportLink.prototype.getExportLink = function() {

        "use strict";

        var nodes = this.options.nodesToProcess || false;

        if (!nodes.length) {
            return this.logger.warn('No nodes provided to export...', this);
        }

        // Add some logging for usage comparisons
        if (page === 'download') {
            eventlog(99683); // Share public link on downloads page.
        }
        else if (folderlink) {
            eventlog(99715); // Share public link from folder-link.

            var exportLinkDialog = new mega.Dialog.ExportLink();
            return exportLinkDialog.linksDialog();
        }
        else if (is_mobile) {
            eventlog(99634); // Created public link on mobile webclient
        }
        else {
            eventlog(99635); // Created public link on regular webclient
        }

        loadingDialog.show();
        this.logger.debug('getExportLink');
        $.getExportLinkInProgress = nodes;

        for (var i = 0; i < nodes.length; i++) {
            var h = nodes[i];
            var n = M.d[h];

            if (n) {
                if (n.t) {
                    this._getFolderExportLinkRequest(h);
                }
                else {
                    this._getExportLinkRequest(h);
                }
            }
            else {
                loadingDialog.hide();
                this.logger.warn('Invalid node to export...', h);
            }
        }
    };

    /**
     * Removes public link for file or folder.
     * @param {Boolean} [quiet] No loading overlay
     * @param {String} handle The node handle which to remove
     * @returns {MegaPromise}
     */
    ExportLink.prototype.removeExportLink = function(quiet, handle) {

        "use strict";

        if (M.isInvalidUserStatus()) {
            return;
        }

        var self = this;
        var promises = [];
        var handles = self.options.nodesToProcess || handle || [];

        if (handles.length) {
            if (!quiet) {
                loadingDialog.show();
            }
            self.logger.debug('removeExportLink');

            $.each(handles, function(index, h) {
                var n = M.d[h];

                if (n) {
                    if (n.t) {
                        promises.push(self._removeFolderExportLinkRequest(h, quiet));
                    }
                    else {
                        promises.push(self._removeFileExportLinkRequest(h, quiet));
                    }
                }
                else if (d) {
                    console.warn('removeExportLink: node not found.', h);
                }
            });
        }

        if (!promises.length) {
            return MegaPromise.reject(EARGS);
        }

        return MegaPromise.allDone(promises);
    };

    /**
     * A 'Private' function, send folder public link delete request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getFolderExportLinkRequest = function(nodeId) {

        "use strict";

        var self = this;
        var share = M.getNodeShare(nodeId);

        // No need to perform an API call if this folder was already exported (Ie, we're updating)
        if (share.h === nodeId) {
            if (!M.d[nodeId].t || u_sharekeys[nodeId]) {
                return self._getExportLinkRequest(nodeId);
            }

            if (d) {
                console.warn('Missing sharekey for "%s" - relying on s2 to obtain it...', nodeId);
            }
        }
        // FIXME: check this

        // Get all child nodes of root folder with nodeId
        M.getNodes(nodeId, true)
            .always(function(childNodes) {

                var sharePromise = api_setshare(nodeId, [{u: 'EXP', r: 0}], childNodes);
                sharePromise.done(function _sharePromiseDone(result) {
                    if (result.r && result.r[0] === 0) {

                        self._getExportLinkRequest(nodeId);

                        if (!self.nodesLeft) {
                            loadingDialog.hide();
                        }
                    }
                    else {
                        self.logger.warn('_getFolderExportLinkRequest', nodeId, 'Error code: ', result);
                        loadingDialog.hide();
                    }
                });
                sharePromise.fail(function _sharePromiseFailed(result) {
                    self.logger.warn('Get folder link failed: ' + result);
                    // FIXME: this seem to lack some handling code for this condition
                });
            });
    };

    /**
     * A 'Private' function, send public get-link request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getExportLinkRequest = function(nodeId) {

        "use strict";

        var self = this;
        var done = function(handle) {

            if (handle && self.options.updateUI) {
                var UiExportLink = new mega.UI.Share.ExportLink();
                UiExportLink.addExportLinkIcon(handle);
            }

            if (!--self.nodesLeft) {
                loadingDialog.hide();
                if (self.options.showExportLinkDialog) {
                    var exportLinkDialog = new mega.Dialog.ExportLink();
                    exportLinkDialog.linksDialog();
                }

                console.assert($.getExportLinkInProgress);
                if ($.getExportLinkInProgress) {
                    mBroadcaster.sendMessage('export-link:completed', handle);
                    $.getExportLinkInProgress = false;
                }
            }

            // A hook for the mobile web to show the public link and the remove button
            if (is_mobile) {
                mobile.linkOverlay.showPublicLinkAndEnableButtons(nodeId);
            }
        };
        var share = M.getNodeShare(nodeId);
        var request = { a: 'l', n: nodeId, i: requesti };

        if (d) {
            console.debug('_getExportLinkRequest', share.ph, Object(M.d[nodeId]).ph, share);
        }

        // No need to perform an API call if this file was already exported (Ie, we're updating)
        if (share.h === nodeId && Object(M.d[nodeId]).ph) {
            return done(nodeId);
        }

        // If the Expiry Timestamp (ets) is already set locally, resend in the request or it gets removed
        if (share.ets) {
            request.ets = share.ets;
        }

        api_req(request, {
            nodeId: nodeId,
            callback: function(result) {
                if (typeof result !== 'number') {
                    M.nodeShare(this.nodeId, { h: this.nodeId, r: 0, u: 'EXP', ts: unixtime(), ph: result });
                    var n = M.d[this.nodeId];
                    if (n) {
                        n.ph = result;
                        M.nodeUpdated(n);
                    }
                }
                else { // Error
                    self.logger.warn('_getExportLinkRequest:', this.nodeId, 'Error code: ', result);
                }

                done(typeof result !== 'number' && this.nodeId);
            }
        });
    };

    /**
     * A 'Private' function, send folder delete public link request.
     * @param {String} nodeId The node ID.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFolderExportLinkRequest = function(nodeId, quiet) {

        "use strict";

        var self = this;
        var masterPromise = new MegaPromise();

        api_req({ a: 's2', n:  nodeId, s: [{ u: 'EXP', r: ''}], ha: '', i: requesti }, {
            nodeId: nodeId,
            callback: function(result) {
                if (result.r && (result.r[0] === 0)) {
                    M.delNodeShare(this.nodeId, 'EXP');

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }

                    // Hook for mobile web to show that removal completed successfully and then close the dialog
                    if (is_mobile) {
                        mobile.linkOverlay.completeLinkRemovalProcess(this.nodeId);
                    }

                    masterPromise.resolve();
                }
                else {
                    // Error
                    self.logger.warn('_removeFolerExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    masterPromise.reject(result);
                }

                if (!--self.nodesLeft && !quiet) {
                    loadingDialog.phide();
                }
            }
        });

        return masterPromise;
    };

    /**
     * A 'Private' function, send file delete public link request.
     * @param {String} nodeId The node IDs.
     * @param {Boolean} [quiet] No loading overlay
     * @returns {MegaPromise}
     */
    ExportLink.prototype._removeFileExportLinkRequest = function(nodeId, quiet) {

        "use strict";

        var self = this;
        var promise = new MegaPromise();

        api_req({ a: 'l', n: nodeId, d: 1, i:requesti }, {
            nodeId: nodeId,
            callback: function(result) {

                if (result === 0) {
                    M.delNodeShare(this.nodeId, 'EXP');

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }

                    // Hook for mobile web to show that removal completed successfully and then close the dialog
                    if (is_mobile) {
                        mobile.linkOverlay.completeLinkRemovalProcess(this.nodeId);
                    }

                    promise.resolve();
                }
                else {
                    // Error
                    self.logger.warn('_removeFileExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    promise.reject(result);
                }

                if (!--self.nodesLeft && !quiet) {
                    loadingDialog.phide();
                }
            }
        });

        return promise;
    };

    /**
     * Returns true in case that any of checked items is taken down, otherwise false
     * @param {Array|String} [nodes] Array of nodes (handles/objects)
     * @returns {Boolean}
     */
    ExportLink.prototype.isTakenDown = function(nodes) {

        "use strict";

        if (nodes) {
            if (!Array.isArray(nodes)) {
                nodes = [nodes];
            }
        }
        else {
            nodes = self.options.nodesToProcess;
        }

        for (var i = nodes.length; i--;) {
            var node = nodes[i];

            if (typeof node !== 'object') {
                node = M.getNodeByHandle(node);
            }

            if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {
                return true;
            }
        }

        return false;
    };

    /**
     * Shows the copyright warning dialog.
     *
     * @param {Array} nodesToProcess Array of strings, node ids
     * @param {*} [isEmbed] Whether we're opening the dialog with the embed-code tab focused.
     */
    var initCopyrightsDialog = function(nodesToProcess, isEmbed) {

        "use strict";

        if (M.isInvalidUserStatus()) {
            return;
        }

        $.itemExportEmbed = isEmbed;
        $.itemExport = nodesToProcess;

        var openGetLinkDialog = function() {

            var exportLink = new mega.Share.ExportLink({
                'showExportLinkDialog': true,
                'updateUI': true,
                'nodesToProcess': nodesToProcess
            });

            exportLink.getExportLink();
        };

        // If they've already agreed to the copyright warning (cws = copyright warning shown)
        if (fmconfig.cws || folderlink) {
            // Go straight to Get Link dialog
            openGetLinkDialog();
            return false;
        }

        // Cache selector
        var $copyrightDialog = $('.copyrights-dialog');

        // Otherwise show the copyright warning dialog
        M.safeShowDialog('copyrights', function() {

            $.copyrightsDialog = 'copyrights';

            return $copyrightDialog;
        });

        // Init click handler for 'I agree' / 'I disagree' buttons
        $('.default-white-button', $copyrightDialog).rebind('click.acceptAction', function() {

            closeDialog();

            // User disagrees with copyright warning
            if (!$(this).hasClass('cancel')) {
                // User agrees, store flag so they don't see it again
                mega.config.set('cws', 1);

                // Go straight to Get Link dialog
                openGetLinkDialog();
            }
        });

        // Init click handler for 'Close' button
        $('.fm-dialog-close', $copyrightDialog).rebind('click.closeDialog', closeDialog);
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.Share = scope.mega.Share || {};
    scope.mega.Share.ExportLink = ExportLink;
    scope.mega.Share.initCopyrightsDialog = initCopyrightsDialog;
})(jQuery, window);


(function($, scope) {
    /**
     * UI Public Link Icon related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var UiExportLink = function(opts) {

        "use strict";

        this.logger = MegaLogger.getLogger('UiExportLink');
    };

    /**
     * addExportLinkIcon
     *
     * Add public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addExportLinkIcon = function(nodeId) {

        "use strict";

        var self = this;
        var $nodeId = $('#' + nodeId);
        var $tree = $('#treea_' + nodeId).add('#treea_os_' + nodeId).add('#treea_pl_' + nodeId);

        if ($nodeId.length === 0 && M.currentdirid.indexOf('chat') === -1) {

            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $nodeId = $(M.megaRender.getDOMNode(nodeId));
            }
        }

        if (!$nodeId.length && !$tree.length) {
            self.logger.warn('No DOM Node matching "%s"', nodeId);

            return false;
        }

        self.logger.debug('addExportLinkIcon', nodeId);

        if ($nodeId.length) {

            // Add link-icon to list view
            $('.own-data', $nodeId).addClass('linked');

            // Add link-icon to grid view
            if ($nodeId.hasClass('data-block-view')) {
                $nodeId.addClass('linked');
            }
        }

        if ($tree.length) {

            // Add link-icon to left panel
            $tree.addClass('linked');
        }
    };

    /**
     * Remove public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeExportLinkIcon = function(nodeId) {

        "use strict";

        var $node = $('#' + nodeId);

        if ($node.length === 0) {
            // not inserted in the DOM, retrieve the nodeMap cache and update that DOM node instead.
            if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
                $node = $(M.megaRender.getDOMNode(nodeId));
            }
        }

        // Remove link icon from list view
        $node.removeClass('linked').find('.own-data').removeClass('linked');

        // Remove link icon from grid view
        $node.filter('.data-block-view').removeClass('linked');

        // Remove link icon from left panel
        $('#treeli_' + nodeId + ' > span').removeClass('linked');
    };

    /**
     * Updates grid and block (file) view, removes favorite icon if exists and adds .taken-down class.
     * @param {String} nodeId
     * @param {Boolean} isTakenDown
     */
    UiExportLink.prototype.updateTakenDownItem = function(nodeId, isTakenDown) {

        "use strict";

        var self = this;

        if (isTakenDown) {
            if (M.d[nodeId].fav === 1) {

                // Remove favourite (star)
                M.favourite(nodeId, 0);
            }
            self.addTakenDownIcon(nodeId);
        }
        else {
            self.removeTakenDownIcon(nodeId);
        }
    };

    /**
     * Add taken-down icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addTakenDownIcon = function(nodeId) {

        "use strict";

        var titleTooltip = '';

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).addClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.data-block-view').addClass('taken-down');

        if (M.megaRender && M.megaRender.nodeMap && M.megaRender.nodeMap[nodeId]) {
            $(M.megaRender.nodeMap[nodeId]).addClass('take-down');
        }
        // Add taken-down to left panel
        $('#treea_' + nodeId).addClass('taken-down');

        // Add title, mouse popup
        if (M.d[nodeId].t === 1) {// Item is folder

            titleTooltip = l[7705];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8595];
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.data-block-view').attr('title', titleTooltip);
        }
        else {// Item is file

            titleTooltip = l[7704];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8602];
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.data-block-view').attr('title', titleTooltip);
        }
    };

    /**
     * Remove taken-down icon from file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeTakenDownIcon = function(nodeId) {

        "use strict";

        if (M.megaRender && M.megaRender.hasDOMNode(nodeId)) {
            $(M.megaRender.getDOMNode(nodeId)).removeClass('take-down');
        }

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).removeClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.data-block-view').removeClass('taken-down');

        // Add taken-down to left panel
        $('#treea_' + nodeId).removeClass('taken-down');

        // Remove title, mouse popup
        $('.grid-table.fm #' + nodeId).attr('title', '');
        $('#' + nodeId + '.data-block-view').attr('title', '');
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.UI = scope.mega.UI || {};
    scope.mega.UI.Share = scope.mega.UI.Share || {};
    scope.mega.UI.Share.ExportLink = UiExportLink;
})(jQuery, window);

/** Export Link as string **/
(function($, scope) {
    'use strict';

    scope.getPublicNodeExportLink = function(node) {

        var fileUrlWithoutKey;
        var type;

        if (folderlink) {
            fileUrlWithoutKey = getBaseUrl() + '/#F!' + pfid + (node.t ? '!' : '?') + node.h;
        }
        else if (node.t) {
            type = 'F';
        }
        else {
            // Shared item type is file
            type = '';
        }

        return fileUrlWithoutKey || (getBaseUrl() + '/#' + type + '!' + htmlentities(node.ph));
    };

})(jQuery, mega);
