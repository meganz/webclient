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

        dialogName: 'update-nickname-dialog',

        /** The name-input sheet control showing this dialog */
        control: null,

        /** The contact's user handle (base64 encoded string) */
        contactUserHandle: null,

        /**
         * Initialise and show the dialog
         * @param {String} contactUserHandle The contact's user handle (base64 encoded string)
         */
        init: function(contactUserHandle) {

            'use strict';

            // Set user handle for use later
            this.contactUserHandle = contactUserHandle;

            const user = M.u[contactUserHandle];
            const hasNickname = Boolean(user && user.nickname !== '');
            let initialValue = '';

            if (user) {
                // Use the nickname if set, otherwise pre-populate with the contact's first and last name
                initialValue = hasNickname ? user.nickname : `${user.firstName} ${user.lastName}`.trim();
            }

            if (!this.control) {
                this.control = new NodeNameControl({type: 'rename'});
                this.control.nameInput.$input.attr('maxlength', 50);
            }

            this.control.show({name: initialValue, t: 0}, {
                noBtnDisable: true,
                allowEmpty: true,
                overrideTypeInfo: {
                    name: this.dialogName,
                    selection: false,
                    checkSpaces: false,
                    title: () => escapeHTML(hasNickname ? l.edit_nickname_label : l.set_nickname_label),
                    button: escapeHTML(l[776]),
                    submit: nop
                },
                overrideAction: ({value, close}) => {
                    this.save(value.trim());
                    close();
                }
            });
        },

        /**
         * Save the new nickname, or remove it when an empty value is given
         * @param {String} nickname The trimmed nickname
         * @returns {void}
         */
        save(nickname) {

            'use strict';

            const {contactUserHandle} = this;

            // A flag for whether to update the API or not. If they entered a blank nickname and that nickname did
            // not exist before, then the API won't be updated, but if it did exist before then it will be deleted.
            let updateApi = false;

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
                const contactNicknames = this.getNicknamesForAllContacts();

                // If there are nicknames, save them to a private encrypted attribute
                const promise = Object.keys(contactNicknames).length > 0
                    ? this.saveNicknamesToApi(contactNicknames)
                    : this.removeNicknamesFromApi();

                promise.always(() => {
                    // versioned attributes would proxy their second .get and merge requests and the original
                    // promise would wait before getting resolve/rejected (so that merge/set had finished
                    // successfully)
                    delete nicknames._dirty[contactUserHandle];
                });
            }
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
        }
    }
};
