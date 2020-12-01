/**
 * Namespace for contact nicknames/aliases related functionality (setting nicknames, displaying them for contacts etc)
 */
var nicknames = {

    /**
     * Initial load of nicknames { userhandle : nickname, ... } from 'ug' request
     */
    cache: false,

    /**
     * List of nicknames (handle -> nickname) that are in progress of saving (e.g. not yet confirmed by the server)
     */
    _dirty: {},

    /**
     * Gets the user's nickname if it's available
     * @param {String} userId The Base64 string of the user handle
     * @returns {string} Returns the user's name if set, otherwise returns FirstName LastName,
     *                  or FirstName if the last name is not set
     */
    getNickname: function(userId) {

        'use strict';

        var userName = '';

        if (M.u && typeof M.u[userId] !== 'undefined') {
            // Set format to FirstName LastName (or just FirstName if the last name is not set)
            userName = (M.u[userId].name || M.u[userId].m).trim();

            // Check if a nickname for this contact exists
            if (M.u[userId].nickname !== '') {
                userName = M.u[userId].nickname;
            }
        }

        return userName;
    },

    /**
     * Gets the user's nickname and name if the nickname is available
     * @param {String} userId The Base64 string of the user handle
     * @returns {String} Returns the display name in format Nickname (FirstName LastName), or FirstName LastName,
     *                   or FirstName if the last name is not set
     */
    getNicknameAndName: function(userId) {

        'use strict';

        if (M.u && typeof M.u[userId] !== 'undefined') {
            // M.u[userId].c === 1 is because we only want those to appear for contacts.

            // Set format to FirstName LastName (or just FirstName if the last name is not set)
            var userName = (M.u[userId].name || M.u[userId].m).trim();

            // Check if a nickname for this contact exists
            if (M.u[userId].nickname !== '') {

                // If name is available use format: Nickname (FirstName LastName)
                userName = M.u[userId].nickname + ' (' + userName + ')';
            }

            return userName;
        }

        return '';
    },

    /**
     * Decrypt contact nicknames stored on the API if they exist
     * @param {String} privateAttribute The encrypted u_attr['*!>alias'] attribute data
     */
    decryptAndCacheNicknames: function(privateAttribute) {

        'use strict';

        try {
            // Try decode, decrypt, convert from TLV into a JS object
            var urlDecodedString = base64urldecode(privateAttribute);
            var decryptedBlock = tlvstore.blockDecrypt(urlDecodedString, u_k);
            var contactNicknames = tlvstore.tlvRecordsToContainer(decryptedBlock);
            var decodedContactNicknames = mega.attr.decodeObjectValues(contactNicknames);

            // Set
            this.cache = decodedContactNicknames;
        }
        catch (ex) {
            this.cache = Object.create(null);
            console.error('Failed to decrypt contact nicknames', ex);
        }
    },

    /**
     * Update nicknames in the UI when an action packet has been received saying they were updated
     */
    updateNicknamesFromActionPacket: function() {

        'use strict';

        // Get nicknames (*!>alias attribute)
        mega.attr.get(
                u_handle,   // User handle
                'alias',    // Attribute name without prefixes
                false,      // Non public
                true,       // Non historic
                false,      // Callback not needed
                false,      // Context not needed
                false,      // Chat handle not needed
                true        // Decode values
            )
            .always(function(contactNicknames) {

                // Make sure it existed and decrypted to an object
                if (typeof contactNicknames !== 'object') {
                    return false;
                }

                // Loop through all the properties in M.u
                M.u.keys().forEach(function(key) {

                    // If an active contact
                    if (typeof M.u[key] !== 'undefined' && M.u[key].h) {

                        // Use if set or use empty string so it will get updated in the UI if they had it set before
                        var newNickname = (typeof contactNicknames[key] !== 'undefined') ? contactNicknames[key] : '';
                        // Set the nickname in the UI (will automagically update)
                        var oldNickname = M.u[key].nickname;
                        if (oldNickname !== newNickname) {
                            M.u[key].nickname = newNickname;
                            M.avatars([key]);
                        }

                    }
                });

                // Update left panel if it has been initialised
                if (M.getNodeRoot(M.currentdirid) === 'contacts' && $.sortTreePanel) {
                    M.contacts();
                }
            });
    },

    /**
     * A dialog to set the contact's nickname
     */
    setNicknameDialog: {

        /** Cache of the jQuery selector for the dialog */
        $dialog: null,

        /** Cache of the jQuery selector for the dialog background */
        $backgroundOverlay: null,

        /** The contact's user handle (base64 encoded string) */
        contactUserHandle: null,

        /**
         * Initialise the dialog
         * @param {String} contactUserHandle The contact's user handle (base64 encoded string)
         */
        init: function(contactUserHandle) {

            'use strict';

            // Init global selectors
            this.$dialog = $('.contact-nickname-dialog');
            this.$backgroundOverlay = $('.dark-overlay');

            // Set user handle for use later
            this.contactUserHandle = contactUserHandle;

            // Init functionality
            this.prefillUserNickname();
            this.initTextInputTitle();
            this.initCancelAndCloseButtons();
            this.initSaveButton();
            this.showDialog();
            this.initInputFocus();
        },

        /**
         * Automatically fill in the user's current nickname if it is set
         */
        prefillUserNickname: function() {

            'use strict';

            var $input = this.$dialog.find('.nickname-input');
            var inputValue = '';

            // If the contact exists
            if (typeof M.u[this.contactUserHandle] !== 'undefined') {

                // If the nickname is set, use that
                if (M.u[this.contactUserHandle].nickname !== '') {
                    inputValue = M.u[this.contactUserHandle].nickname;
                }
                else {
                    // Otherwise if the contact details are available, pre-populate with their first and last name
                    var firstName = M.u[this.contactUserHandle].firstName;
                    var lastName = M.u[this.contactUserHandle].lastName;

                    inputValue = (firstName + ' ' + lastName).trim();
                }
            }

            // Show the nickname, name or empty string in the text field
            $input.val(inputValue);
        },

        /**
         * Initialise the code to hide/show the text input's title/tooltip if there is text entered
         */
        initTextInputTitle: function() {

            'use strict';

            var $input = this.$dialog.find('.nickname-input');
            var $inputTitle = this.$dialog.find('.nickname-input-title');
            var $saveButton = this.$dialog.find('.save-button');

            // Small function to hide/show
            var setTitleVisibility = function() {

                // If there is text entered, show the text field title
                if ($input.val().length > 0) {
                    $inputTitle.addClass('visible');
                }
                else {
                    // Placeholder text is shown so no title needed
                    $inputTitle.removeClass('visible');
                }
            };

            // Set the keyup handler
            $input.rebind('keyup.inputchange', function(event) {

                setTitleVisibility();

                // If Enter key is pressed, trigger Save action
                if (event.which === 13) {
                    $saveButton.trigger('click');
                }
            });

            // Check on initial load whether it should be shown
            setTitleVisibility();
        },

        /**
         * Initialise the Cancel and Close buttons
         */
        initCancelAndCloseButtons: function() {

            'use strict';

            var $cancelButton = this.$dialog.find('.cancel-button');
            var $closeIconButton = this.$dialog.find('.fm-dialog-close');
            var $input = this.$dialog.find('.nickname-input');
            var self = this;

            // On click of the Cancel or Close icon
            $cancelButton.add($closeIconButton).rebind('click.closeDialog', function() {

                // Clear the entered value
                $input.val('');

                // Close the dialog
                self.closeDialog();
            });
        },

        /**
         * Initialise the Save button
         */
        initSaveButton: function() {

            'use strict';

            var $saveButton = this.$dialog.find('.save-button');
            var $nicknameInput = this.$dialog.find('.nickname-input');
            var contactUserHandle = this.contactUserHandle;
            var self = this;

            // On Save button click
            $saveButton.rebind('click.saveNickname', function() {

                // A flag for whether to update the API or not. If they entered a blank nickname and that nickname did
                // not exist before, then the API won't be updated, but if if did exist before then it will be deleted.
                var updateApi = false;

                // Get the nickname and trim it
                var nickname = $nicknameInput.val().trim();

                // If the nickname is empty
                if (nickname.length < 1) {

                    // If the nickname previously existed, delete it
                    if (M.u[contactUserHandle].nickname !== '') {
                        M.u[contactUserHandle].nickname = '';
                        M.avatars([contactUserHandle]);
                        updateApi = true;
                    }
                }
                else {
                    // Set the nickname
                    M.u[contactUserHandle].nickname = nickname;
                    M.avatars([contactUserHandle]);
                    updateApi = true;
                }

                // If the API should be updated with the new attribute or have it removed
                if (updateApi) {
                    nicknames._dirty[contactUserHandle] = M.u[contactUserHandle].nickname;

                    // Get all the contacts with nicknames
                    var contactNicknames = self.getNicknamesForAllContacts();

                    // If there are nicknames, save them to a private encrypted attribute
                    var promise;
                    if (Object.keys(contactNicknames).length > 0) {
                        promise = self.saveNicknamesToApi(contactNicknames);
                    }
                    else {
                        promise = self.removeNicknamesFromApi();
                    }
                    promise.always(function() {
                        // versioned attributes would proxy their second .get and merge requests and the original
                        // promise would wait before getting resolve/rejected (so that merge/set had finished
                        // successfully)
                        delete nicknames._dirty[contactUserHandle];
                    });

                    // Update left panel if it has been initialised
                    if (M.getNodeRoot(M.currentdirid) === 'contacts' && $.sortTreePanel) {
                        M.contacts();
                    }
                }

                // Hide the dialog
                self.closeDialog();
            });
        },

        /**
         * Get a list of contact nicknames to be saved
         * @returns {Object} Returns an object containing mappings of contact handles to nicknames
         */
        getNicknamesForAllContacts: function() {

            'use strict';

            var contactNicknames = {};

            // Loop through the keys in M.u
            M.u.keys().forEach(function(key) {

                // If an active contact and they have a nickname, add it
                if (typeof M.u[key] !== 'undefined' && M.u[key].nickname !== '') {
                    contactNicknames[key] = M.u[key].nickname;
                }
            });

            return contactNicknames;
        },

        /**
         * Save the nicknames object to the API which will be TLV encoded and encrypted
         * @param {Object} contactNicknames An object containing mappings of contact handles to nicknames
         * @returns {MegaPromise}
         */
        saveNicknamesToApi: function(contactNicknames) {

            'use strict';

            loadingDialog.show();

            // Set the attribute API side to *!>alias
            return mega.attr.set(
                'alias',            // Attribute name
                contactNicknames,   // Data to save
                false,              // Set to private and encrypted
                true,               // Set to non-historic, this won't retain previous values on API server
                false,              // No callback required
                false,              // No context required
                undefined,          // Use default AES_GCM_12_16 encryption mode
                true,              // Do not use versioning
                true                // Set to encode values as UTF-8
            )
            .always(function() {
                loadingDialog.hide();
            });
        },

        /**
         * Remove the nicknames object from the API
         *
         * @returns {MegaPromise}
         */
        removeNicknamesFromApi: function() {

            'use strict';

            loadingDialog.show();

            // Set the attribute API side to *!>alias
            return mega.attr.set(
                'alias',            // Attribute name
                {},   // Data to save
                false,              // Set to private and encrypted
                true,               // Set to non-historic, this won't retain previous values on API server
                false,              // No callback required
                false,              // No context required
                undefined,          // Use default AES_GCM_12_16 encryption mode
                true,              // Do not use versioning
                true                // Set to encode values as UTF-8
                )
                .always(function() {
                    loadingDialog.hide();
                });
        },

        /**
         * When the dialog has opened, put the cursor into the text field
         */
        initInputFocus: function() {

            'use strict';

            this.$dialog.find('.nickname-input').trigger('focus');
        },

        /**
         * Show the dialog
         */
        showDialog: function() {

            'use strict';

            this.$dialog.removeClass('hidden');
            this.$backgroundOverlay.removeClass('hidden');
        },

        /**
         * Close the dialog
         */
        closeDialog: function() {

            'use strict';

            this.$dialog.addClass('hidden');
            this.$backgroundOverlay.addClass('hidden');
        }
    }
};
