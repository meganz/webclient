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
     * @param {String|Object} user The Base64 string of the user handle, or a user object
     * @returns {string} Returns the user's name if set, otherwise returns FirstName LastName,
     *                  or FirstName if the last name is not set
     */
    getNickname: function(user) {
        'use strict';
        if (typeof user === 'string') {
            user = M.getUserByHandle(user);
        }
        if (user) {
            // Set format to FirstName LastName (or just FirstName if the last name is not set)
            return String(user.nickname || user.fullname || user.name || user.m).trim();
        }

        return '';
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
            this.cache = tlvstore.decrypt(privateAttribute);
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
                const users = [];

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
                            users.push(key);
                        }

                    }
                });

                useravatar.refresh(users).catch(dump);
            });
    },

    /**
     * A dialog to set the contact's nickname
     */
    setNicknameDialog: {

        /** Cache of the jQuery selector for the dialog */
        $dialog: null,

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
            this.$megaInput = new mega.ui.MegaInputs($('#nickname-input',this.$dialog)).$input;

            // Set user handle for use later
            this.contactUserHandle = contactUserHandle;

            // Init functionality
            this.setNicknameDialogTitle();
            this.prefillUserNickname();
            this.initTextSave();
            this.initCancelAndCloseButtons();
            this.initSaveButton();
            this.showDialog();
            this.initInputFocus();
        },

        /**
         * Setup the nickname dialog title
         */
        setNicknameDialogTitle: function() {

            'use strict';

            var $nicknameDialogTitle = $('#contact-nickname-dialog-title', this.$dialog);

            if (typeof M.u[this.contactUserHandle] === 'undefined' || M.u[this.contactUserHandle].nickname === '') {
                $nicknameDialogTitle.text(l.set_nickname_label);
            }
            else {
                $nicknameDialogTitle.text(l.edit_nickname_label);
            }
        },

        /**
         * Automatically fill in the user's current nickname if it is set
         */
        prefillUserNickname: function() {

            'use strict';

            var $input = this.$megaInput;
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
         * Initialise the code to bind the save button to enter key
         */
        initTextSave: function() {

            'use strict';

            var $input = this.$megaInput;
            var $saveButton = this.$dialog.find('.save-button');

            // Set the keyup handler
            $input.rebind('keyup.inputchange', function(event) {

                // If Enter key is pressed, trigger Save action
                if (event.which === 13) {
                    $saveButton.trigger('click');
                }
            });
        },

        /**
         * Initialise the Cancel and Close buttons
         */
        initCancelAndCloseButtons: function() {

            'use strict';

            var $cancelButton = this.$dialog.find('.cancel-button');
            var $closeIconButton = this.$dialog.find('button.js-close');
            var $input = this.$megaInput;
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
            var $nicknameInput = this.$megaInput;
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
                        useravatar.refresh(contactUserHandle).catch(dump);
                        updateApi = true;
                    }
                }
                else {
                    // Set the nickname
                    M.u[contactUserHandle].nickname = nickname;
                    useravatar.refresh(contactUserHandle).catch(dump);
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

            this.$megaInput.trigger('focus');
        },

        /**
         * Show the dialog
         */
        showDialog: function() {

            'use strict';

            this.$dialog.removeClass('hidden');
            fm_showoverlay();
        },

        /**
         * Close the dialog
         */
        closeDialog: function() {

            'use strict';

            this.$dialog.addClass('hidden');
            fm_hideoverlay();
        }
    }
};
