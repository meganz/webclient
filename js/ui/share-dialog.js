/** @property mega.ui.mShareDialog */
lazy(mega.ui, 'mShareDialog', () => {

    'use strict';

    const selectorContactSearchInput = '.contact-search-input';
    // DOM caches
    // these collections do not change dynamically, so we can cache them
    const $dialog = $('.mega-dialog.share-dialog', 'body');
    const $inviteNote = $('.invite-note-textarea', $dialog);
    const $inviteNoteWrapper = $('.invite-note', $dialog);
    const $selectedContactsContainer = $('.selected-contacts-container', $dialog);
    const $contactDropdownWrapper = $('.contact-dropdown-container-wrapper', $dialog);
    const $contactSearchInput = $(selectorContactSearchInput, $selectedContactsContainer);

    const initInviteNoteScrolling = (nodes) => {
        const $inviteNoteClone = $('.invite-note .textarea-clone', $dialog);
        if ($inviteNoteClone.length > 0) {
            $inviteNoteClone.remove();
        }
        Ps.destroy(nodes[0]);
        initTextareaScrolling(nodes);
    };
    const resetInviteNote = () => {
        $inviteNoteWrapper.addClass('hidden');
        $inviteNote.val('');
        $inviteNote.css('height', 'initial');
        initInviteNoteScrolling($inviteNote);
    };
    const resetSelectedContacts = () => {
        const $selectedContacts = $('.contact-selected-item', $dialog);
        $selectedContacts.remove();
        Ps.destroy($selectedContactsContainer[0]);
        initPerfectScrollbar($selectedContactsContainer);
    };
    const nonContactEmailInSelect = () => $('.contact-item.email-only', $contactDropdownWrapper).length > 0;
    const contactsDropdownChildrenCount = () => {
        const psScrollbarClasses = ['ps__rail-x', 'ps__rail-y'];
        const unselectedContactsLength = $contactDropdownWrapper.children().not('.selected').length;
        const elementsWithPsClasses = $contactDropdownWrapper.children()
            .filter((_, el) => psScrollbarClasses.some(cls => el.classList.contains(cls)));

        return unselectedContactsLength - elementsWithPsClasses.length;
    };
    const isContactsDropdownEmpty = () => contactsDropdownChildrenCount() === 0;
    const resetContactsDropdownPS = () => {
        Ps.destroy($contactDropdownWrapper[0]);
        $contactDropdownWrapper.scrollTop(0);
        $contactDropdownWrapper.scrollLeft(0);
        initPerfectScrollbar($contactDropdownWrapper);
    };

    // Other constants
    let target = null;
    let hasError = false;

    // --- TOP SECTION (SEARCH AND ADD) -----------------------------------------

    /**
     * Reset the elements of the Invite contacts area back to default clear state
     * @returns {undefined}
     */
    function resetInviteAreaState() {
        const $inviteContainer = $('.share-dialog-invite-container', $dialog);
        const $inviteContactButton = $('.invite-contact-button', $dialog);
        const $permissionsButton = $('.permissions-dropdown-button', $inviteContainer);
        const $permissionsButtons = $('.button-option', $permissionsButton);
        const $permissionsButttonRead = $('.button-option.read-only', $permissionsButton);
        const $permissionsButtonReadWrite = $('.button-option.read-and-write', $permissionsButton);
        const $permissionsContainer = $('.permissions-dropdown-container', $inviteContainer);
        const $permissionsDropdownOptions = $('.dropdown-option', $permissionsContainer);
        const $readWriteOption = $('.dropdown-option[data-attr-permission="read-and-write"]', $permissionsContainer);
        const $shareDialogInviteBG = $('.share-dialog-invite-background', $dialog);
        const $errorMessageBox = $('.error-message', $dialog);

        // Reset states to default
        $inviteContainer.removeClass('input-error');
        $inviteContactButton.addClass('disabled');
        $permissionsContainer.addClass('hidden');
        $permissionsButton.removeClass('read-only');
        $permissionsButtons.removeClass('selected');
        $permissionsButtonReadWrite.addClass('selected');
        $permissionsDropdownOptions.removeClass('selected');
        $contactSearchInput.attr('placeholder', l.share_add_contact_placeholder);
        $contactSearchInput.removeClass('active');
        resetInviteNote();
        resetSelectedContacts();
        $readWriteOption.addClass('selected');
        $contactSearchInput.val('');
        $shareDialogInviteBG.removeClass('overflow dropdown-visible');
        $errorMessageBox.text('');

        if (M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID) {
            $permissionsButtons.removeClass('selected');
            $permissionsButton.addClass('read-only');
            $permissionsButttonRead.addClass('selected');
        }
    }

    /**
     * Initialises the dropdown to select the share permissions for contacts that are about to be invited
     * @returns {undefined}
     */
    function initPermissionsDropdown() {

        const $permissionsButton = $('.permissions-dropdown-button', '.share-dialog-invite-container');
        const $permissionsButtonOptions = $('.button-option', '.share-dialog-invite-container');
        const $permissionsDropdown = $('.permissions-dropdown-container', '.share-dialog-invite-container');
        const $permissionsDropdownOptions = $('.dropdown-option', '.share-dialog-invite-container');

        // For read only share folder
        if (M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID) {
            $permissionsButton.unbind();
        }
        else {
            // Add click handler to open/close the dropdown
            $permissionsButton.rebind('click.choosependingpermission', (event) => {
                const $permissionsDropdowns = $('.permissions-dropdown-container', $dialog);

                // Close all permission dropdown
                $permissionsDropdowns.not($permissionsDropdown).addClass('hidden');

                // Toggle selected permission dropdown
                $permissionsDropdown.toggleClass('hidden');

                // Prevent closing the dropdown until they've clicked outside it
                event.stopPropagation();
            });

            // Add click handler for clicking on the options and showing the selected option in the button
            $permissionsDropdownOptions.rebind('click.selectpermission', (event) => {

                // Remove previously selected options in the button and dropdown
                $permissionsButtonOptions.removeClass('selected');
                $permissionsDropdownOptions.removeClass('selected');
                $(event.currentTarget).parent('.permissions-dropdown-container').addClass('hidden');

                // Get the type of permission from the data attribute
                const permission = $(event.currentTarget).attr('data-attr-permission');

                // Show selected option as selected in the dropdown and button
                $(event.currentTarget).addClass('selected');
                $('.' + permission, $permissionsButton).addClass('selected');

                // Prevent closing the dropdown until they've clicked outside it
                return false;
            });
        }
    }

    /**
     * Get all the unverified contacts that are about to receive the share
     * (if the Receive reminders to verify contacts is turned on).
     * @param {Array} nonContactEmails The non contact email addresses to be invited
     * @param {Array} emails All emails (including contacts and non contacts) that have been added to be invited
     * @returns {Array} Returns the unverifed contacts as an array of user objects, or empty array if nothing to verify
     */
    function getUnverifiedContacts(nonContactEmails, emails) {

        // Skip checks if the user does not have the setting 'Receive reminders to verify contacts' turned on in
        if (mega.keyMgr.getWarningValue('cv') !== '1') {
            return [];
        }

        const unverifiedContacts = [];
        const emailsToCheck = [];

        // Look through all the added emails
        emails.forEach(email => {

            // Filter out the new contacts where we only have email for them
            if (!nonContactEmails.includes(email) && !M.findOutgoingPendingContactIdByEmail(email)) {
                emailsToCheck.push(email);
            }
        });

        // Look through the contact emails
        emailsToCheck.forEach(email => {

            // Get the contact's Ed25519 authring
            const user = M.getUserByEmail(email);
            const ed = authring.getContactAuthenticated(user.h, 'Ed25519');

            // Determine if they are an unverified contact
            if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON)) {
                unverifiedContacts.push(user);
            }
        });

        // If there are unverified contacts, return them (to be displayed in a dialog later)
        if (unverifiedContacts.length > 0) {
            return unverifiedContacts;
        }

        return [];
    }

    /**
     * Gets the selected permission level from the dropdown so it can be sent with the API request
     * @returns {Number} Returns 2 for full-access, 1 for read-and-write and 0 for read-only
     */
    function getSelectedPermissionLevel() {

        const $selectedPermission = $('.permissions-dropdown-button .selected', '.share-dialog-invite-container');

        // For backup folders.
        if (M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID) {
            return 0;
        }
        else if ($selectedPermission.hasClass('full-access')) {
            return 2;
        }
        else if ($selectedPermission.hasClass('read-and-write')) {
            return 1;
        }

        // Read-only
        return 0;
    }

    /**
     * Add the contacts to the share (or create the share if it doesn't exist)
     * @param {Array} nonContactEmails The emails to be invited as contacts first
     * @param {Array} emails All the emails to be invited to the share (incl after they are outgoing pending contacts)
     * @param {String} inviteNote The note to be sent in the email
     * @returns {undefined}
     */
    function addContactsToShare(nonContactEmails, emails, inviteNote) {

        const promises = [];
        const addedEmails = [];
        const currentUserEmail = M.u[u_handle].m;

        // Show the loading spinner
        loadingDialog.show('add-contacts-to-share');

        // For every email, find the non contacts
        for (let i = 0; i < nonContactEmails.length; i++) {

            const email = nonContactEmails[i];

            // Once invitation is sent, push as added emails
            promises.push(
                M.inviteContact(currentUserEmail, email, inviteNote).then((res) => addedEmails.push(res))
            );
        }

        // After all process is done, and there is added email(s), show invitation sent
        Promise.allSettled(promises).always(() => {

            // Get the permission level for the bulk addition of contacts/emails to the share
            const permissionLevel = getSelectedPermissionLevel();

            // Prepare for adding to share
            emails.forEach(email => {

                const user = M.getUserByEmail(email);

                // If existing contact, add
                if (user) {
                    $.addContactsToShare[user.h] = {
                        u: email,
                        r: permissionLevel,
                        msg: inviteNote
                    };
                }
                else {
                    // Get the handle for the outgoing pending contact
                    const newContactHandle = M.findOutgoingPendingContactIdByEmail(email);

                    // Add outgoing pending contact
                    $.addContactsToShare[newContactHandle] = {
                        u: email,
                        r: permissionLevel,
                        msg: inviteNote
                    };
                }
            });

            // Do the adding of contacts & outgoing pending contacts to the share
            const share = new mega.Share();
            share.updateNodeShares(target)
                .then(() => {

                    // Reset Invite area to clear the fields
                    resetInviteAreaState();

                    // Reset global values
                    $.addContactsToShare = {};
                    $.removedContactsFromShare = {};
                    $.changedPermissions = {};

                    const numOutgoingPendingContacts = addedEmails.length;

                    // If there is at least one new email invited
                    if (numOutgoingPendingContacts) {

                        // Pluralise the title and message
                        const title = mega.icu.format(l.contacts_invited_title, numOutgoingPendingContacts);
                        const message = numOutgoingPendingContacts === 1 ? l[5898] : l[5899];

                        // Shows the Contact/s Invited dialog
                        contactsInfoDialog(title, '', message);
                    }

                    // Re-render the access list
                    renderAccessList();

                    // Show a toast message
                    showToast('view', l.share_toast_success);
                })
                .catch(() => {

                    // Show a warning/error toast message
                    showToast('warning', l[47]);
                })
                .finally(() => {

                    // Hide the loading spinner
                    loadingDialog.hide('add-contacts-to-share');
                });
        });
    }

    /**
     * Invite the emails to be contacts
     * @param {Array} emails The emails to be invited as contacts (if not already) and then invited to the share
     * @param {String} inviteNote The note to be sent in the email
     * @returns {undefined}
     */
    function inviteContacts(emails, inviteNote) {

        const currentContactsEmails = [];
        const nonContactEmails = [];

        // Get current active contacts with email set
        M.u.forEach((contact) => {
            if (contact.c === 1 && contact.m) {
                currentContactsEmails.push(contact.m);
            }
        });

        // For every email, find the non contacts
        for (let i = 0; i < emails.length; i++) {

            const email = emails[i];

            // Make sure it's not a current contact and not in the outgoing pending contacts (already invited)
            if (!currentContactsEmails.includes(email) && !M.findOutgoingPendingContactIdByEmail(email)) {

                // Track the number of non contacts to show a confirm dialog (and invite them before sharing later)
                nonContactEmails.push(email);
            }
        }

        // Get unverified contacts
        const unverifiedContacts = getUnverifiedContacts(nonContactEmails, emails);

        // Check there are new contacts
        if (nonContactEmails.length > 0) {

            // Convert emails to "test@email.com, test2@email.com and test3@email.com" format and other languages
            const message = mega.utils.trans.listToString(nonContactEmails, l.share_add_non_contact_warning_msg);

            // Set to warning dialog with custom button labels
            const dialogType = `*warningb:!^${l.share_confirm_dialog_proceed}!${l[82]}`;

            // Show "Share with non-contact" warning dialog
            msgDialog(dialogType, '', l.share_confirm_dialog_title, message, (res) => {

                // If Cancel is pressed, close the dialog and go back to the Share dialog
                if (res || res === null) {
                    return;
                }

                // If they need to verify any unverified contacts, show that dialog
                if (unverifiedContacts.length > 0) {
                    mega.ui.mShareUnverifiedsDialog.init(unverifiedContacts, nonContactEmails, emails, inviteNote);
                }
                else {
                    // Otherwise if Confirm is pressed, continue to invite and add to the share
                    addContactsToShare(nonContactEmails, emails, inviteNote);
                }
            });
        }
        else {
            // If they need to verify any unverified contacts, show that dialog first
            if (unverifiedContacts.length > 0) {
                mega.ui.mShareUnverifiedsDialog.init(unverifiedContacts, nonContactEmails, emails, inviteNote);
                return;
            }

            // Add the contacts to the share (or create the share if it doesn't exist)
            addContactsToShare(nonContactEmails, emails, inviteNote);
        }
    }

    /**
     * If the number of contacts/emails added is at least 1, make sure the Invite button is enabled
     * @returns {undefined}
     */
    function enableOrDisableInviteButton() {
        const $inviteButton = $('.invite-contact-button', $dialog);

        // Count how many contacts (or emails) are added and enable if at least 1, otherwise disable
        if ($('.contact-selected-item', $selectedContactsContainer).length > 0 && !hasError) {
            $inviteButton.removeClass('disabled');
        }
        else {
            $inviteButton.addClass('disabled');
        }
    }

    /**
     * Update contacts UI when change happens:
     * - Search input placeholder text (show/hide)
     * - Invite note (show/hide/reset)
     * - Scrolling
     * @returns {undefined}
     */
    function onContactChange() {
        // Get the emails to be invited/added to the share
        const $contactSearchBlock = $('.contact-search-block', $dialog);
        const $shareDialogInviteBG = $('.share-dialog-invite-background', $dialog);

        // Check if user select/add emails
        if ($selectedContactsContainer.children('.contact-selected-item').length) {
            $contactSearchInput.attr('placeholder', '');
            $contactSearchBlock.removeClass('empty');
            $inviteNoteWrapper.removeClass('hidden');
        }
        else {
            $contactSearchInput.attr('placeholder', l.share_add_contact_placeholder);
            $contactSearchBlock.addClass('empty');

            // Hide and clear the Note field
            resetInviteNote();
        }

        // Hide background when selected contacts overflow
        if ($shareDialogInviteBG.innerHeight() > 45) {
            $shareDialogInviteBG.addClass('overflow');
            initPerfectScrollbar($selectedContactsContainer);
        }
        else {
            $shareDialogInviteBG.removeClass('overflow');

            if ($selectedContactsContainer.is('.ps')) {
                Ps.destroy($selectedContactsContainer[0]);
            }
        }

        onIdle(resetContactsDropdownPS);
    }

    /**
     * Initialise the remove contact (x) icon click handler in the list of pending contacts to be invited
     * @returns {undefined}
     */
    function initRemoveContactClickHandler() {
        const $removeContactButtons = $('.remove-contact-button', $dialog);

        // Add click handler
        $removeContactButtons.rebind('click.removecontact', function(event) {
            const $clickedContact = $(this);
            const $clickedContactContainer = $clickedContact.parent();
            const clickedContactHandle = $clickedContactContainer.attr('data-contact-handle');

            // Remove the item from the selected pending contact list
            $clickedContactContainer.remove();

            // Show the contact as clickable again in the dropdown list of contacts
            $(".contact-item[data-contact-handle='" + clickedContactHandle + "']", $dialog).removeClass('selected');

            // Make sure the Invite button is enabled if there is at least 1 contact (or email added)
            enableOrDisableInviteButton();

            // Update container or input UI
            onContactChange();

            // Prevent closing the dropdown until they've clicked outside it
            event.stopPropagation();
        });
    }

    /**
     * Show an error message if there is an error
     * @param {String} errorMessage The error message to be displayed imediately
     * @returns {undefined}
     */
    function showErrorMessage(errorMessage) {

        const $inviteContainer = $('.share-dialog-invite-container', $dialog);
        const $errorMessageBox = $('.error-message', $dialog);

        $inviteContainer.addClass('input-error');
        $errorMessageBox.text(errorMessage);

        hasError = true;
        enableOrDisableInviteButton();
    }

    /**
     * Gets all active contacts from the current share state
     * @returns {Object} Returns an object with the active contact handles as the key
     */
    function getActiveShareContacts() {

        const activeContacts = {};
        const nodeHandle = String(target);
        const node = M.getNodeByHandle(nodeHandle);
        let userHandles = M.getNodeShareUsers(node, 'EXP');

        if (M.ps[nodeHandle]) {
            const pendingShares = Object(M.ps[nodeHandle]);
            userHandles = userHandles.concat(Object.keys(pendingShares));
        }

        // Add existing contact with access
        userHandles.forEach((u) => {
            activeContacts[u] = 1;
        });

        return activeContacts;
    }

    /**
     * Creates a chip with the email instead of avatar + name
     * @param {String} email The locally validated email
     * @returns {undefined}
     */
    function makeEmailPendingContact(email) {
        // Selectors
        const $selectedContactTemplate = $('.contact-selected-template', $dialog);

        const opc = M.findOutgoingPendingContactIdByEmail(email);
        const user = M.getUserByEmail(email);
        const activeContacts = getActiveShareContacts();
        const emailLowerCase = String(email).toLowerCase();

        // If they entered their own email, show an error
        if (emailLowerCase === M.u[u_handle].m.toLowerCase()) {
            showErrorMessage(l.share_add_own_email_error);
            return false;
        }

        // Check this email (or existing contact) hasn't already been added to the pending access list
        const emailAdded = ($(".contact-selected-item[data-contact-handle='email_" + escapeHTML(emailLowerCase) + "']",
                              $dialog).length > 0);
        const existingAdded = (user && $(".contact-selected-item[data-contact-handle='" + escapeHTML(user.h) + "']",
                                         $dialog).length > 0);

        if (emailAdded || existingAdded) {
            showErrorMessage(l.email_address_already_entered);
            return false;
        }

        // Check this contact hasn't already been added to the active access list but pending contact invite
        if ($(".share-dialog-access-node[id='" + escapeHTML(opc) + "']", $dialog).length > 0 ||
            Object.values($.removedContactsFromShare).some(r => r.userEmailOrHandle === email) ||
            (opc && activeContacts[opc])) {

            showErrorMessage(l.share_add_contact_already_shared_error);
            return false;
        }

        // Copy template HTML
        const selectedContact = $selectedContactTemplate[0].content.querySelector('div').cloneNode(true);

        // Update template
        selectedContact.querySelector('.avatar-container').remove();
        selectedContact.querySelector('.selected-contact-name').textContent = email;
        selectedContact.dataset.contactHandle = `email_${emailLowerCase}`;

        // Get the container of the input element
        const inputContainer = document.querySelector('.mega-dialog.share-dialog .contact-selected-item-input');

        // Add new selected contacts to the end of the list of selected contacts (but before the input)
        inputContainer.before(selectedContact);

        // Update container or input UI
        onContactChange();

        // Reset the text input to empty after adding
        $contactSearchInput.focus().val('');

        // Make sure the remove contact buttons work
        initRemoveContactClickHandler();

        // Make sure the Invite button is enabled if there is at least 1 contact (or email added)
        enableOrDisableInviteButton();

        // Scroll to bottom of list
        const contactsContainer = document.querySelector('.mega-dialog.share-dialog .selected-contacts-container');
        contactsContainer.scroll(0, contactsContainer.scrollHeight);
    }

    /**
     * Gets all active and pending contacts from the current Share dialog state
     * @returns {Object} Returns an object with the added contact handles as the key
     */
    function getAddedContacts() {

        const addedContacts = {};
        const nodeHandle = String(target);
        const node = M.getNodeByHandle(nodeHandle);
        let userHandles = M.getNodeShareUsers(node, 'EXP');

        const $pendingAccessContacts = $('.contact-selected-item', $dialog);

        // Add pending contacts
        $pendingAccessContacts.toArray().forEach((contact) => {

            const handle = $(contact).attr('data-contact-handle');

            addedContacts[handle] = 1;
        });

        if (M.ps[nodeHandle]) {
            const pendingShares = Object(M.ps[nodeHandle]);
            userHandles = userHandles.concat(Object.keys(pendingShares));
        }
        // Add existing contact with access
        userHandles.forEach((u) => {
            addedContacts[u] = 1;
        });

        return addedContacts;
    }

    /**
     * Make a regular contact box appear in the pending contact area
     * @param {String} contactHandle The contact handle
     * @returns {false|undefined}
     */
    function makeRegularContactForInviting(contactHandle) {
        const contactData = M.u[contactHandle]; // M.getUserByHandle(contactHandle);
        const contactName = contactData.name.toString();
        const contactEmail = contactData.m.toString();
        const contactAvatar = useravatar.contact(contactHandle || contactEmail);
        const addedContacts = getAddedContacts();
        const activeContacts = getActiveShareContacts();

        // Selectors
        const $shareDialogInviteBG = $('.share-dialog-invite-background', $dialog);
        const $selectedContactTemplate = $('.contact-selected-template', $dialog);

        // If they entered their own email, show an error
        if (contactEmail === M.u[u_handle].m) {
            showErrorMessage(l.share_add_own_email_error);
            return false;
        }

        // Check this contact hasn't already been added to the active access list (including hidden sharees)
        if ($(".share-dialog-access-node[id='" + contactHandle + "']", $dialog).length > 0 ||
            activeContacts[contactHandle]) {

            showErrorMessage(l.share_add_contact_already_shared_error);
            return false;
        }

        // Check this contact hasn't already been added to the pending access list
        if ($(".contact-selected-item[data-contact-handle='" + contactHandle + "']", $dialog).length > 0 ||
            addedContacts[contactHandle]) {

            showErrorMessage(l.email_address_already_entered);
            return false;
        }

        // Copy template HTML
        const selectedContact = $selectedContactTemplate[0].content.querySelector('div').cloneNode(true);

        // Update template
        selectedContact.querySelector('.avatar-container').append(parseHTML(contactAvatar));
        selectedContact.querySelector('.selected-contact-name').textContent = contactName;
        selectedContact.dataset.contactHandle = contactHandle;

        // Get the parent container element
        const input = document.querySelector('.mega-dialog.share-dialog .contact-selected-item-input');

        // Append the new selected contact to the HTML just before the input so they are in the pending list
        input.before(selectedContact);

        // Make sure the remove contact buttons work
        initRemoveContactClickHandler();

        // Remove from the dropdown now that they are added
        $(".contact-item[data-contact-handle='" + contactHandle + "']", $contactDropdownWrapper).addClass('selected');

        // Make sure the Invite button is enabled if there is at least 1 contact (or email added)
        enableOrDisableInviteButton();

        // Update container or input UI
        onContactChange();

        // Reset input value
        $contactSearchInput.focus().val('');

        // Hide the dropdown
        $shareDialogInviteBG.removeClass('dropdown-visible');
    }

    /**
     * Render the user's currently typed email into the dropdown (that only shows the email) so they can click it
     * @param {String} currentEmailString The email they've typed (pre-validated to be a valid email)
     * @returns {undefined}
     */
    function renderEmailContactInDropdown(currentEmailString) {
        const $contactItemTemplate = $('.contact-item-template', $dialog);
        const $shareDialogInviteBG = $('.share-dialog-invite-background', $dialog);

        // Copy template HTML
        const contactItemHtml = $contactItemTemplate[0].content.querySelector('div').cloneNode(true);

        // Update the text to show the email
        contactItemHtml.querySelector('.contact-email').textContent = currentEmailString;

        // Add a styling class for just the one email showing in the dropdown
        contactItemHtml.classList.add('email-only');

        // Update dropdown HTML with email contact so it can be clicked
        const dropdownWrapper = document.querySelector('.share-dialog .contact-dropdown-container-wrapper');
        dropdownWrapper.textContent = '';
        dropdownWrapper.append(contactItemHtml);

        // Scroll to the top of the list on each open (and after re-opening)
        $contactDropdownWrapper.scrollTop(0);

        // Add click handler for the email in the dropdown
        $('.contact-item.email-only', $contactDropdownWrapper).rebind('click.addcurrentemail', (event) => {

            // Get contact data
            const $clickedContact = $(event.target);
            const contactEmail = $('.contact-email', $clickedContact).text();

            const user = M.getUserByEmail(contactEmail);

            // If existing contact, add using that method
            if (user && user.c) {
                makeRegularContactForInviting(user.h);
            }
            else if (isValidEmail(contactEmail)) {
                // If it's a valid email, make the styled box for the email to be invited
                makeEmailPendingContact(contactEmail);
                $shareDialogInviteBG.removeClass('dropdown-visible');
            }
            else {
                showErrorMessage(l[2465]);
                $contactSearchInput.focus();
                $shareDialogInviteBG.removeClass('dropdown-visible');
            }

            // Hide dropdown
            $shareDialogInviteBG.removeClass('dropdown-visible');
        });
    }

    /**
     * Gets the pending emails to be invited/added to the share
     * @returns {Array} Returns an array of the emails
     */
    function getEmailsToBeInvited() {

        const $selectedContacts = $('.selected-contacts-container .contact-selected-item', $dialog);

        const emails = [];

        // For each contact (or email) block in the text area
        $selectedContacts.toArray().forEach((contact) => {

            const $selectedContact = $(contact);
            const handleOrEmail = $selectedContact.attr('data-contact-handle');

            // Look for email_ at the front of the string, strip it off and add the email
            if (handleOrEmail.substring(0, 6) === 'email_') {
                emails.push(
                    handleOrEmail.substring(6)
                );
            }
            else {
                // Otherwise look up the email from the existing contacts
                emails.push(
                    M.u[handleOrEmail].m.toString()
                );
            }
        });

        return emails;
    }

    /**
     * Initialise the new Invite button behaviour
     * @returns {undefined}
     */
    function initInviteButton() {

        const $inviteButton = $('.invite-contact-button', $dialog);
        const $inviteAreaBackground = $('.share-dialog-invite-background', $dialog);
        const $inviteNoteTextArea = $('.invite-note', $dialog);

        // On Share button click
        $inviteButton.rebind('click.invitecontacts', () => {

            // Only allow clicks if there contacts (or emails) to invite
            if ($inviteButton.hasClass('disabled')) {
                return false;
            }

            // Hide the dropdown with the list of contacts when they click the button
            $inviteAreaBackground.removeClass('dropdown-visible');

            // Get the emails to be invited/added to the share
            const emails = getEmailsToBeInvited();

            // Get the note to be sent with the invite
            const inviteNote = $inviteNoteTextArea.val();

            // Invite the contacts to MEGA (if not already a contact)
            inviteContacts(emails, inviteNote);
        });
    }

    /**
     * Check if all the contact has been selected + already has access
     * @param {Object} listOfContacts List of existing contacts
     * @returns {Boolean}
     */
    function checkIfAllContactsSelected(listOfContacts) {

        const addedContacts = getAddedContacts();
        let addedContactsCount = 0;

        Object.keys(addedContacts).forEach(k => {
            if (listOfContacts.some(l => l.handle === k)) {
                addedContactsCount++;
            }
        });

        return addedContactsCount === listOfContacts.length;
    }

    /**
     * Hides the error message
     * @returns {undefined}
     */
    function hideErrorMessage() {

        const $inviteContainer = $('.share-dialog-invite-container', $dialog);
        const $errorMessageBox = $('.error-message', $dialog);

        $inviteContainer.removeClass('input-error');
        $errorMessageBox.text('');

        hasError = false;
        enableOrDisableInviteButton();
    }

    /**
     * Initialise the dropdown click handler on the contact items
     * @returns {undefined}
     */
    function initContactClickHandler() {
        // Add click handler for each contact
        $('.contact-item', $contactDropdownWrapper).rebind('click.addcontact', function() {

            // Get contact data
            const $clickedContact = $(this);
            const contactHandle = $clickedContact.attr('data-contact-handle');

            makeRegularContactForInviting(contactHandle);
        });
    }

    /**
     * Render the user's contacts into the search dropdown
     * @param {Array} listOfContacts The contact objects (including name, handle, email) from M.getContactsEMails
     * @param {undefined|String} searchString Optional search filter to update the list of contacts as the user types
     * @returns {undefined}
     */
    function renderContactsIntoDropdown(listOfContacts, searchString) {
        const $contactItemTemplate = $('.contact-item-template', $dialog);
        const dropdownWrapper = document.querySelector('.share-dialog .contact-dropdown-container-wrapper');

        // Get all the current active and pending contacts
        const addedContacts = getAddedContacts();

        let contactRendered = 0;

        // Clear the dropdown element of anything
        $contactDropdownWrapper.empty();

        // Loop through contacts
        for (let i = 0; i < listOfContacts.length; i++) {
            const userHandle = listOfContacts[i].handle;

            // Get more details about the contact
            const email = listOfContacts[i].id;
            const name = listOfContacts[i].name;
            const avatar = useravatar.contact(userHandle || email);

            // Lowercase values for the search to work
            const lowerSearch = searchString ? searchString.toLowerCase() : searchString;
            const lowerEmail = email ? email.toLowerCase() : email;
            const lowerName = name ? name.toLowerCase() : name;

            // Don't add results to the list of contacts to be rendered if not in the search string
            if (lowerSearch && !lowerName.includes(lowerSearch) && !lowerEmail.includes(lowerSearch)) {
                continue;
            }

            // Copy template HTML
            const contactItem = $contactItemTemplate[0].content.querySelector('div').cloneNode(true);

            // Update template
            contactItem.querySelector('.avatar-container').append(parseHTML(avatar));
            contactItem.querySelector('.contact-name').textContent = name;
            contactItem.querySelector('.contact-email').textContent = email;
            contactItem.dataset.contactHandle = userHandle;

            // If this contact already exists in the active list or the pending list then show that it's already added
            if (addedContacts[userHandle] || $.removedContactsFromShare[userHandle]) {
                contactItem.classList.add('selected');
            }

            // Append to html to be added into the dialog
            dropdownWrapper.append(contactItem);

            // Increment count
            contactRendered += 1;
        }

        // Update dropdown HTML with contacts
        if (contactRendered) {
            // Add click handler for each contact in the dropdown
            initContactClickHandler();
        }
        else if (searchString && isValidEmail(searchString)) {
            renderEmailContactInDropdown(searchString);
        }
        else {
            // Clear the dropdown element of anything
            $contactDropdownWrapper.empty();
        }

        onIdle(resetContactsDropdownPS);
    }


    // --- BOTTOM SECTION (ACCESS LIST) -----------------------------------------


    /**
     * Generate the html DOM element for a single share contact of the folder
     *
     * @param {string} userEmail contact email
     * @param {string} type  type of contact e.g. type 1 indicates the owner of the folder
     * @param {string} id    contact handle
     * @param {string} av    contact avatar
     * @param {string} userName  contact name
     * @param {string} permClass permission classname
     *
     * @returns {string}
     */
    function renderContactRowContent(userEmail, type, id, av, userName, permClass) {

        let html = '';
        let permissionsButtonHtml = '';
        let extraClass = '';

        if (type === '1') {
            userName += ` (${l[8885]})`;
            permClass = 'owner';
            extraClass = ' owner';
        }
        else if (type === '2') {
            userName = l.contact_request_pending.replace('%1', userName);
        }
        else if (mega.keyMgr.getWarningValue('cv') === '1') {
            const ed = authring.getContactAuthenticated(id, 'Ed25519');

            if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON)) {
                extraClass += ' unverified-contact';
            }
        }

        const isSelectedRole = (role) => {
            return permClass.includes(role) ? 'selected' : '';
        };

        const permissionClass = permClass.replace('disabled', '');

        permissionsButtonHtml = `
            <div class="permissions-dropdown-button" data-current-permission='${permissionClass}'>
                <div class="button-option read-only ${isSelectedRole('read-only')}">${l[55]}</div>
                <div class="button-option read-and-write ${isSelectedRole('read-and-write')}">${l[56]}</div>
                <div class="button-option full-access ${isSelectedRole('full-access')}">${l[57]}</div>
                <div class="down-arrow sprite-fm-mono icon-dropdown"></div>

                <div class="permissions-dropdown-container hidden">
                    <div class="dropdown-option ${isSelectedRole('read-only')}" data-attr-permission="read-only"'>
                        <div class="title">${l[55]}</div>
                        <div class="description">${l.share_permission_readonly_description}</div>
                        <div class="selected-check sprite-fm-mono-after icon-check-after"></div>
                    </div>
                    <div class="dropdown-option ${isSelectedRole('read-and-write')}"
                        data-attr-permission="read-and-write"'>
                        <div class="title">${l[56]}</div>
                        <div class="description">${l.share_permission_readwrite_description}</div>
                        <div class="selected-check sprite-fm-mono-after icon-check-after"></div>
                    </div>
                    <div class="dropdown-option ${isSelectedRole('full-access')}"
                        data-attr-permission="full-access"'>
                        <div class="title">${l[57]}</div>
                        <div class="description">${l.share_permission_fullaccess_description}</div>
                        <div class="selected-check sprite-fm-mono-after icon-check-after"></div>
                    </div>
                </div>
            </div>
        `;

        // Base64 encode the email (so we can check if it was already added later for deduplication purposes)
        const userEmailEncoded = btoa(userEmail);

        html = `
            <div class="share-dialog-access-node${extraClass} ${type === '2' ? 'pending' : ''}" id="${id}"
                email-encoded="${userEmailEncoded}">
                <div class="access-node-info-block">
                    ${av}
                    <div class="access-node-username">
                        ${htmlentities(userName)}
                    </div>
                </div>
                <div class="access-node-contact-verify">
                    <div class='contact-verify'>${l.verify_credentials}</div>
                </div>
                <div class="access-node-permission-wrapper">
                    ${ permClass === 'owner' ? `<span>${l[5905]}</span>` : permissionsButtonHtml }
                </div>
                ${permClass === 'owner' ? '' : `<i class="access-node-remove sprite-fm-mono icon-remove"></i>`}
            </div>`;

        return html;
    }

    /**
     * Generates and inserts a share or pending share row into the Share dialog
     * @param {String} displayNameOrEmail
     * @param {String} email
     * @param {Number} shareRights
     * @param {String} userHandle Optional
     * @param {boolean} isPending if true, shows text 'contact request pending'
     * @param {Boolean} disabled Doesn't not allow to change the permissions (Optional)
     */
    function generateShareDialogRow(displayNameOrEmail, email, shareRights, userHandle, isPending, disabled) {

        const $shareDialog = $('.mega-dialog.share-dialog', 'body');
        const $accessContactsDialog = $('.mega-dialog.share-access-contacts-dialog', 'body');

        let rowId = '';
        let html = '';
        let perm = '';
        let permissionLevel = 0;
        const contactEmail = M.getUser(userHandle || email).m;
        const av = useravatar.contact(contactEmail, 'access-node-avatar');

        if (shareRights !== undefined) {
            permissionLevel = shareRights;
        }

        // Restore the latest changed permission
        if ($.changedPermissions
            && $.changedPermissions[userHandle]) {

            permissionLevel = $.changedPermissions[userHandle].r;
        }

        // Permission level
        if (permissionLevel === 1) {
            perm = 'read-and-write';
        }
        else if (permissionLevel === 2) {
            perm = 'full-access';
        }
        else {
            perm = 'read-only';
        }

        // Do not allow to change permissions
        if (disabled) {
            perm += ' disabled';
        }

        // Add contact
        $.sharedTokens.push(email.toLowerCase());

        rowId = userHandle || email;

        if (u_attr && userHandle === u_attr.u) {
            html = renderContactRowContent(email, '1', rowId, av, displayNameOrEmail, perm);
        }
        else {
            html = renderContactRowContent(email, isPending ? '2' : '', rowId, av, displayNameOrEmail, perm);
        }

        if ($accessContactsDialog.hasClass('hidden')) {
            $('.share-dialog-access-list', $shareDialog).safeAppend(html);
        }
        else if (u_attr && userHandle !== u_attr.u) {
            $('.share-dialog-access-list', $accessContactsDialog).safeAppend(html);
        }
    }

    /**
     * Generate the HTML content for the Access list in both the Share dialog and Share Collaborators dialog
     * @returns {void}
     */
    function generateShareContactList() {

        const $shareCollaboratorsDialog = $('.mega-dialog.share-access-contacts-dialog', 'body');
        const $currDialog = $shareCollaboratorsDialog.hasClass('hidden') ? $dialog : $shareCollaboratorsDialog;

        let pendingShares = {};
        const nodeHandle = String(target);
        const node = M.getNodeByHandle(nodeHandle);
        let userHandles   = M.getNodeShareUsers(node, 'EXP');
        const readonly = M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID;

        if (M.ps[nodeHandle]) {
            pendingShares = Object(M.ps[nodeHandle]);
            userHandles   = userHandles.concat(Object.keys(pendingShares));
        }

        // Remove items in the removed contacts list
        for (var rmContact in $.removedContactsFromShare) {
            const rmContactIndex = userHandles.indexOf(rmContact);
            if (rmContactIndex > -1) {
                userHandles.splice(rmContactIndex, 1);
            }
        }

        // Existing contacts in shares
        userHandles.forEach((handle) => {

            const user = M.getUser(handle) || Object(M.opc[handle]);

            if (!user.m) {
                console.warn('Unknown user "%s"!', handle);
                return;
            }

            // Base64 encode the user email for the duplicate check
            const userEmail = user.m;
            const userEmailEncoded = btoa(userEmail);

            // Make sure this contact hasn't been added already (duplicate check)
            if ($(`.share-dialog-access-node[email-encoded="${userEmailEncoded}"]`, $currDialog).length === 0) {

                const name  = M.getNameByHandle(handle) || user.m;
                const share = M.getNodeShare(node, handle) || Object(pendingShares[handle]);

                generateShareDialogRow(
                    name,
                    user.m,
                    share.r | 0,
                    handle,
                    handle in pendingShares,
                    readonly
                );
            }
        });
    }

    /**
     * Bind events to components in the Access list of the Share dialog or Share Collaborators dialog after rendering
     * @param {String} dialogClass main class of dialog
     */
    function initAccessListBinds(dialogClass) {

        const $dialog = $(`.mega-dialog.${dialogClass}`, 'body');
        const $shareAccessDialog = $('.mega-dialog.share-access-contacts-dialog', 'body');

        // Remove the specific contact from share
        $('.access-node-remove', $dialog).rebind(`click.${dialogClass}`, function() {
            var $deletedContact = $(this).parent('.share-dialog-access-node');

            if ($deletedContact.is('.owner')) {
                return false;
            }

            var userHandle = $deletedContact.attr('id');
            var selectedNodeHandle = target;

            $deletedContact.remove();

            if (userHandle !== '') {
                var userEmail = '';
                if ($.addContactsToShare[userHandle]) {
                    userEmail = $.addContactsToShare[userHandle].u;
                    delete $.addContactsToShare[userHandle];
                }
                else {
                    // Due to pending shares, the id could be an email instead of a handle
                    var userEmailOrHandle = Object(M.opc[userHandle]).m || userHandle;
                    userEmail = Object(M.opc[userHandle]).m || M.getUserByHandle(userHandle).m;

                    $.removedContactsFromShare[userHandle] = {
                        selectedNodeHandle,
                        userEmailOrHandle,
                        userHandle
                    };

                    // Remove the permission change if exists
                    if ($.changedPermissions[userHandle]) {
                        delete $.changedPermissions[userHandle];
                    }
                }

                // Remove it from multi-input tokens
                var sharedIndex = $.sharedTokens.indexOf(userEmail.toLowerCase());
                if (sharedIndex > -1) {
                    $.sharedTokens.splice(sharedIndex, 1);
                }
            }

            // Share access contact-dialog
            if (!$shareAccessDialog.hasClass('hidden')) {
                const $shareDialogContactContainer = $('.share-dialog-access-list', $shareAccessDialog);
                const $contactCounts = $('header span', $shareAccessDialog);

                $contactCounts.text($shareDialogContactContainer.children('.share-dialog-access-node').length);
            }

            contentCheck();
        });

        // Hide the permission menu once scrolling
        $('.share-dialog-access-list', $dialog).rebind('scroll.closeMenu', () => {
            hidePermissionsMenu();
        });

        $('.access-node-contact-verify .contact-verify', $dialog).rebind(`click.${dialogClass}`, (event) => {

            const $this = $(event.currentTarget);
            const contact = $this.closest('.unverified-contact');
            const $shareAccessDialog = $('.mega-dialog.share-access-contacts-dialog', 'body');
            const $shareDialog = $('.mega-dialog.share-dialog', 'body');

            if (contact) {
                const contactHandle = $this.closest('.unverified-contact').attr('id');

                // Success callback after Fingerprint dialog action completed
                const successCallback = () => {

                    // Arrange to back if share access contacts visible
                    if (dialogClass === 'share-access-contacts-dialog') {
                        $shareAccessDialog.removeClass('arrange-to-back');
                        $shareDialog.addClass('arrange-to-back');
                    }
                };

                fingerprintDialog(contactHandle, false, successCallback);
            }
        });

        $('.contact-verification-settings', $dialog).rebind(`click.${dialogClass}`, () => {
            M.openFolder('account/contact-chats/contact-verification-settings', true);
        });
    }

    /**
     * Initialises the dropdown to select the share permissions for contacts that are about to be invited
     * @param {Object} $container The jQuery object for the dialog (used in Share dialog and Share Collaborators dialog)
     * @returns {undefined}
     */
    function initPendingPermissionDropdown($container) {

        const $shareDialog = $('.mega-dialog.share-dialog');
        const $permissionsButton = $('.permissions-dropdown-button', $container);
        const $permissionsDropdownOptions = $('.dropdown-option', $permissionsButton);
        const $allPermissionButtons = $('.permissions-dropdown-button', $shareDialog);

        // For read only share folder
        if (M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID) {
            $('.access-node-permission-wrapper', '.share-dialog-access-list').addClass('read-only');
            $permissionsButton.unbind();
            $allPermissionButtons.unbind();
        }
        else {
            // Add click handler to open/close the dropdown
            $permissionsButton.rebind('click.choosependingpermissionitem', function(event) {
                const $this = $(this);
                const $currDialog = $this.closest('.mega-dialog');
                const $dropdown = $('.permissions-dropdown-container', $(event.currentTarget));
                const $permissionsDropdown = $('.permissions-dropdown-container', $currDialog);

                // Close all permission dropdown
                $permissionsDropdown.not($dropdown).addClass('hidden');
                $dropdown.removeClass('top');

                if ($currDialog.hasClass('share-access-contacts-dialog')) {
                    var x = 0;
                    var y = 0;

                    $dropdown.toggleClass('hidden');

                    x = $this.get(0).getBoundingClientRect().left;
                    y = $this.get(0).getBoundingClientRect().top + 30;
                    $dropdown.css('left', `${x}px`);
                    $dropdown.css('top', `${y}px`);
                }
                else {
                    $dropdown.toggleClass('hidden');

                    if ($dropdown.closest('.mega-dialog')[0].getBoundingClientRect().bottom <
                        $dropdown[0].getBoundingClientRect().bottom) {
                        $dropdown.addClass('top');
                    }
                }

                // Prevent closing the dropdown until they've clicked outside it
                event.stopPropagation();
            });

            // Add click handler for clicking on the options and showing the selected option in the button
            $permissionsDropdownOptions.rebind('click.selectpermissionitem', function(event) {

                // Remove previously selected options in the button and dropdown
                $('.button-option', $(this).parent().closest('.permissions-dropdown-button')).removeClass('selected');
                $('.dropdown-option', $(this).parent()).removeClass('selected');
                $(this).parent('.permissions-dropdown-container').addClass('hidden');

                // Get the type of permission from the data attribute
                const permission = $(this).attr('data-attr-permission');
                const {shares} = M.getNodeByHandle(target);
                const permissionValue = sharedPermissionLevel(permission);

                // Show selected option as selected in the dropdown and button
                $(this).addClass('selected');
                $(`.${permission}`, $(this).closest('.permissions-dropdown-button')).addClass('selected');

                // Function to push new permission into $.changedPersmissions
                const pushNewPermissionIn = (id) => {
                    if (!shares || !shares[id] || shares[id].r !== permissionValue) {
                        // If it's a pending contact, provide the email
                        const userEmailOrHandle = Object(M.opc[id]).m || id;

                        $.changedPermissions[id] = {u: userEmailOrHandle, r: permissionValue};
                    }
                };

                const userHandle = $(this).closest('.share-dialog-access-node').attr('id');

                if (userHandle !== undefined && userHandle !== '') {
                    // Change the permission for existing share contacts
                    if ($.changedPermissions && $.changedPermissions[userHandle]) {
                        // Remove the previous permission change if exists
                        delete $.changedPermissions[userHandle];
                    }

                    pushNewPermissionIn(userHandle);
                }

                contentCheck();

                event.stopPropagation();
            });

            // Close contacts dropdown when click choose permission
            $allPermissionButtons.rebind('click.selectpermissionall', () => {

                // Close contacts list dropdown
                $('.contact-search-block', $shareDialog).removeClass('dropdown-visible');
                $('.share-dialog-invite-background', $shareDialog).removeClass('dropdown-visible');
            });
        }
    }

    /**
     * Generate the html content
     *
     * @param {Boolean} readonly Sets read-only for new users and doesn't allow to change it (Optional)
     * @returns {void}
     */
    function fillShareDialogWithContent(readonly) {

        const $shareDialog = $('.mega-dialog.share-dialog', 'body');
        const $accessList = $('.share-dialog-access-list', $shareDialog);

        let pendingShares = {};
        const nodeHandle = String(target);
        const node = M.getNodeByHandle(nodeHandle);
        let userHandles   = M.getNodeShareUsers(node, 'EXP');
        $.sharedTokens = [];// GLOBAL VARIABLE, Hold items currently visible in share folder content (above multi-input)

        if (M.ps[nodeHandle]) {
            pendingShares = Object(M.ps[nodeHandle]);
            userHandles   = userHandles.concat(Object.keys(pendingShares));
        }

        // Fill the owner of the folder on the top of the access list
        if (u_attr) {
            generateShareDialogRow(u_attr.name, u_attr.email, 2, u_attr.u);
        }

        // If pending request is rejected while we are changing persmissions - remove manually
        if ($.changedPermissions) {
            for (const h of Object.keys($.changedPermissions)) {
                if (!userHandles.includes(h)) {
                    delete $.changedPermissions[h];
                    break;
                }
            }
        }

        // Remove items in the removed contacts list
        for (var rmContact in $.removedContactsFromShare) {
            const rmContactIndex = userHandles.indexOf(rmContact);
            if (rmContactIndex > -1) {
                userHandles.splice(rmContactIndex, 1);
            }
        }

        // Show only nine contacts
        if (userHandles.length <= 4) {
            generateShareContactList();
            initPendingPermissionDropdown($accessList);
        }

        // Show when contacts is more than 4
        if (userHandles.length > 4) {
            const names = [];
            let hasUnverified = false;

            userHandles.forEach((handle) => {
                const user = M.getUser(handle) || Object(M.opc[handle]);
                const name = user.firstName || M.getNameByHandle(handle) || user.m;

                names.push(name);
                // Check if there's unverified contact to show contact verfication warning banner
                if (mega.keyMgr.getWarningValue('cv') === '1' && !(handle in pendingShares)) {
                    const ed = authring.getContactAuthenticated(handle, 'Ed25519');
                    if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON)) {
                        hasUnverified = true;
                    }
                }
            });

            // Get top/bottom avatar (email seems to be common thing in making correct avatar for contact/non-contact)
            const topUser = M.getUser(userHandles[0] || M.opc(userHandles[0]));
            const bottomUser = M.getUser(userHandles[1] || M.opc(userHandles[1]));
            const av = useravatar.contact(topUser.m, 'access-node-avatar top');
            const av2 = useravatar.contact(bottomUser.m, 'access-node-avatar bottom');

            const html =  `<div class="share-dialog-access-node all ${hasUnverified ? 'unverified-contact' : ''}">
                <div class="access-node-info-block">
                    <div class="multiple-avatar">
                        ${av}
                        ${av2}
                    </div>
                    <div class="access-node-username">
                    ${mega.utils.trans.listToString(names, '%s others', false, 3)}
                    </div>
                </div>
                <i class="sprite-fm-mono icon-dropdown more"></i>
            </div>`;
            $($accessList).safeAppend(html);

            initMoreButtonClickHandler(userHandles);
            return;
        }

        // Render new added contacts less than 5
        for (var newContact in $.addContactsToShare) {

            let newContactName;
            const newContactEmail = $.addContactsToShare[newContact].u;

            // Backup folder can be only shared as Read-Only
            if (readonly) {
                $.addContactsToShare[newContact].r = 0;
            }

            let pendingContact;
            if (newContact.startsWith('#new_')) {
                newContactName = $.addContactsToShare[newContact].u;
                pendingContact = true;
            }
            else {
                newContactName  = M.getNameByHandle(newContact) || newContactEmail;
                pendingContact = !!M.findOutgoingPendingContactIdByEmail(newContactEmail);
            }

            const shareRights = $.addContactsToShare[newContact].r;

            // Base64 encode the user email for the duplicate check
            const userEmailEncoded = btoa(newContactEmail);

            // Make sure this contact hasn't been added already (duplicate check)
            if ($(`.share-dialog-access-node[email-encoded="${userEmailEncoded}"]`, $shareDialog).length === 0) {
                generateShareDialogRow(
                    newContactName,
                    newContactEmail,
                    shareRights,
                    newContact,
                    pendingContact,
                    readonly
                );
            }
        }
    }

    /**
     * Initialise the More button in the Who Has Access section to see all the contacts who have been added
     * @param {Array} userHandles The contact handles
     */
    function initMoreButtonClickHandler(userHandles) {

        $('.share-dialog-access-node.all .more', $dialog).rebind('click', () => {

            if (!userHandles || !userHandles.length) {
                return;
            }

            mega.ui.mShareCollaboratorsDialog.init();
        });
    }

    /**
     * Take care of the Share dialog buttons enabled/disabled and scroll
     */
    function contentCheck() {

        var dc = document.querySelector('.mega-dialog.share-dialog');
        var itemsNum = $('.share-dialog-access-list .share-dialog-access-node', dc).length;
        var $doneBtn = $('.done-share', dc);
        var $doneBtnText = $('span', $doneBtn);
        var $removeBtn = $('.remove-share', dc);
        const $footer = $('.footer-container', dc);
        const node = M.getNodeByHandle(target);
        const hasShare = node && M.getNodeShareUsers(node, 'EXP').length || M.ps[node];

        // Taking care about the Remove Share button enabled/disabled
        if (itemsNum > 1 || hasShare) {
            $removeBtn.removeClass('disabled');
            $removeBtn.removeClass('hidden');
            $doneBtn.removeClass('hidden');
            $footer.removeClass('empty');
        }
        else {
            $removeBtn.addClass('disabled');
            $removeBtn.addClass('hidden');
            $doneBtn.addClass('hidden');
            $footer.addClass('empty');
        }

        if (hasShare && $.removedContactsFromShare && Object.keys($.removedContactsFromShare).length ||
            Object.keys($.changedPermissions).length) {
            $doneBtnText.text('Save');
        }
        else {
            $doneBtnText.text(l[726]);
        }

        if (!dc) {
            return;
        }

        const cvw = dc.querySelector('.contact-verify-warning');
        const cvn = dc.querySelector('.contact-verify-notification');

        cvw.classList.add('hidden');
        cvn.classList.add('hidden');

        const cv = mega.keyMgr.getWarningValue('cv') !== false;

        if (!cv && u_attr.since < 1697184000 && !mega.keyMgr.getWarningValue('cvb')) {
            cvn.classList.remove('hidden');
            // Set warning value for contact verificaiton banner
            mega.keyMgr.setWarningValue('cvb', '1');
            const cvnText = cvn.querySelector('span');
            $(cvnText).safeHTML(
                escapeHTML(l.contact_verification_notif_banner)
                    .replace(
                        '[D]',
                        '<div class="contact-verification-settings">'
                    )
                    .replace('[/D]', '</div>')
            );
        }

        // if any unverified contact
        if (cv && dc.querySelector('.unverified-contact')) {
            cvw.classList.remove('hidden');
        }
    }

    /**
     * Render the content of the Access list in the Share dialog
     */
    function renderAccessList() {

        const $shareDialog = $('.mega-dialog.share-dialog', '.mega-dialog-container');
        const $warning = $('.mega-banner', $shareDialog).eq(2);
        let readonly = false;

        // Remove all contacts from the access list
        $('.share-dialog-access-node', $shareDialog).remove();

        // Clear and hide warning
        $warning.addClass('hidden').text('');

        if (M.currentrootid === M.InboxID || M.getNodeRoot(target) === M.InboxID) {

            $warning.safeHTML(l.backup_read_only_wrng).removeClass('hidden');
            $('span', $warning).text('').attr({
                'class': 'sprite-fm-mono icon-info-filled simpletip',
                'data-simpletip': l.backup_read_only_info,
                'data-simpletip-class': 'backup-tip short',
                'data-simpletipposition': 'top',
                'data-simpletipoffset': 6
            }).trigger('simpletipUpdated');

            readonly = true;
        }

        // Fill the shared folder's access list
        fillShareDialogWithContent(readonly);

        // Take care of the Share button enabled/disabled and the Access list scrolling
        contentCheck();

        // Bind events to components in the access list after rendering
        initAccessListBinds('share-dialog');
    }

    /**
     * sharedPermissionLevel
     *
     * Translate class name to numeric permission level.
     * @param {String} value Permission level as a string i.e. 'read-and-write', 'full-access', 'read-only'.
     * @returns {Number} integer value of permission level.
     */
    function sharedPermissionLevel(value) {

        var permissionLevel = 0;

        if (value === 'read-and-write') {
            permissionLevel = 1; // Read and Write access
        }
        else if (value === 'full-access') {
            permissionLevel = 2; // Full access
        }
        else {
            permissionLevel = 0; // read-only
        }

        return permissionLevel;
    }

    /**
     * Hide the permission menu in the Share dialog
     */
    function hidePermissionsMenu() {

        const $permissionMenu = $('.share-dialog-permissions-menu', $dialog).addClass('o-hidden');

        $('.option', $permissionMenu).removeClass('active');
        $('.share-dialog-access-node', $dialog).removeClass('active');

        setTimeout(() => {
            $permissionMenu.addClass('hidden');
        }, 200);
    }

    /**
     * Initializes the Share dialog buttons
     */
    function initShareDialogButtons() {

        // Handle background clicks within the dialog (e.g. to close a dropdown)
        $dialog.rebind('click', (e) => {

            const $target = $(e.target);
            const $permissionsDropdownList = $('.permissions-dropdown-container', $dialog);
            const $inviteAreaBackground = $('.share-dialog-invite-background', $dialog);

            // Hide the permission menu once click outside range of it
            if (!$target.is('.share-dialog-permissions-menu')
               &&  !$target.closest('.share-dialog-permissions-menu').length) {

                hidePermissionsMenu();
            }

            // Close the contact list dropdown if it is visible and clicking outside it
            if (!$target.is(selectorContactSearchInput) && !$target.closest('.contact-dropdown-container').length) {
                $inviteAreaBackground.removeClass('dropdown-visible');
            }

            $permissionsDropdownList.addClass('hidden');
        });

        // Close the Share dialog
        $('button.js-close', $dialog).rebind('click', () => {
            showLoseChangesWarning().done(closeDialog);
        });

        // Change the permission for the specific contact or group
        $('.share-dialog-permissions-menu .option', $dialog).rebind('click', function(e) {
            var $this = $(this);
            const {shares} = M.getNodeByHandle(target);
            var newPermLevel = checkMultiInputPermission($this);
            var newPerm = sharedPermissionLevel(newPermLevel[0]);
            var $selectedContact =  $('.share-dialog-access-node.active', $dialog);

            hidePermissionsMenu();

            var pushNewPermissionIn = function(id) {
                if (!shares || !shares[id] || shares[id].r !== newPerm) {
                    // If it's a pending contact, provide the email
                    var userEmailOrHandle = Object(M.opc[id]).m || id;

                    $.changedPermissions[id] = {u: userEmailOrHandle, r: newPerm};
                }
            };

            if (e.shiftKey) {
                // Change the permission for all listed contacts
                for (var key in $.addContactsToShare) {
                    $.addContactsToShare[key].r = newPerm;
                }

                $.changedPermissions = {};

                $('.share-dialog-access-node:not(.owner)', $dialog).get().forEach((item) => {
                    var itemId = $(item).attr('id');
                    if (itemId !== undefined && itemId !== '' && !$.addContactsToShare[itemId]) {
                        pushNewPermissionIn(itemId);
                    }
                });

                const $nodes = $('.share-dialog-access-node:not(.owner) .access-node-permission', $dialog);
                $nodes.removeClass('full-access read-and-write read-only simpletip')
                    .addClass(newPermLevel[0]);

                if (newPermLevel[0] === 'full-access') {
                    $nodes.addClass('simpletip');
                }
            }
            else {
                // Change the permission for the specific contact
                var userHandle = $selectedContact.attr('id');

                if (userHandle !== undefined && userHandle !== '') {
                    if ($.addContactsToShare[userHandle]) {
                        // Change the permission for new added share contacts
                        $.addContactsToShare[userHandle].r = newPerm;
                    }
                    else {
                        // Change the permission for existing share contacts
                        if ($.changedPermissions[userHandle]) {
                            // Remove the previous permission change if exists
                            delete $.changedPermissions[userHandle];
                        }

                        pushNewPermissionIn(userHandle);
                    }
                }

                const $node = $('.access-node-permission', $selectedContact);
                $node.removeClass('full-access read-and-write read-only simpletip')
                    .addClass(newPermLevel[0]);

                if (newPermLevel[0] === 'full-access') {
                    $node.addClass('simpletip');
                }
            }

            // Share button enable/disable control
            if (Object.keys($.changedPermissions).length > 0) {
                $('.done-share', $dialog).removeClass('disabled');
            }
            else if (Object.keys($.removedContactsFromShare).length === 0
                && Object.keys($.addContactsToShare).length === 0) {
                $('.done-share', $dialog).addClass('disabled');
            }

            return false;
        });

        $('.done-share', $dialog).rebind('click', function() {
            if (!$(this).is('.disabled')) {
                if (Object.keys($.changedPermissions).length
                    || Object.keys($.removedContactsFromShare).length) {
                    var share = new mega.Share();

                    share.updateNodeShares(target).finally(() => {
                        // Close the dialog
                        closeDialog();

                        // Show a toast message
                        showToast('view', l.share_update_toast_success);
                    });
                    eventlog(500037);
                }
                else {
                    closeDialog();
                }
            }

            return false;
        });

        $('.remove-share', $dialog).rebind('click', function() {
            if (!$(this).is('.disabled')) {
                msgDialog(`remove:!^${l[23737]}!${l[82]}`, '', l.remove_share_title, l.remove_share_msg, res => {
                    if (res) {
                        loadingDialog.show();
                        new mega.Share().removeSharesFromSelected(target).always(() => {
                            loadingDialog.hide();
                            closeDialog();
                        });
                    }
                }, 1);
            }
            return false;
        });
    }

    /**
     * Renders the contents of the Share dialog
     * @param {String} h The node handle
     * @returns {undefined}
     */
    async function fillShareDlg(h) {

        if (!M.d[h]) {
            await dbfetch.get(h);
        }
        const node = M.getNodeByHandle(h);
        const {shares, name, td, tf} = node;
        assert(name);

        var shareKeys = Object.keys(shares || {});

        $('.item-type-icon-90', $dialog).attr('class', `item-type-icon-90 icon-${folderIcon(node)}-90`);

        // This is shared folder, not just folder link
        if (shares && !(shares.EXP && shareKeys.length === 1) || M.ps[h]) {
            $('.remove-share', $dialog).removeClass('disabled');
        }
        else {
            $('.remove-share', $dialog).addClass('disabled');
        }

        // Fill the shared folder's name
        const $folderName = $('.share-dialog-folder-name', $dialog)
            .text(name)
            .removeClass('simpletip')
            .removeAttr('data-simpletip')
            .removeAttr('data-simpletipposition');

        if ($folderName.get(0).offsetWidth < $folderName.get(0).scrollWidth) {
            $folderName
                .addClass('simpletip')
                .attr('data-simpletip', name)
                .attr('data-simpletipposition', 'top');
        }

        // Fill the shared folder's info
        $('.share-dialog-folder-info', $dialog).text(fm_contains(tf, td, false));

        // Reset the Invite area to default
        resetInviteAreaState();

        // Render the content of the Access list in the Share dialog
        renderAccessList();

        const $shareDialogInviteBG = $('.share-dialog-invite-background', $dialog);
        const $shareDialogTitle = $('#share-dialog-title', $dialog);

        $shareDialogTitle.text(l[5631]);

        if (node && M.getNodeShareUsers(node, 'EXP').length || M.ps[node]) {
            $shareDialogTitle.text(l.manage_share);
        }

        // When press the Esc key, only close the Share dialog if the lost changes warning dialog isn't there
        $(window).rebind('keydown.closeShareDLG', (e) => {

            if (e.keyCode === 27 && $.dialog === 'share' && $('.mega-dialog.confirmation:not(.hidden)').length === 0) {
                showLoseChangesWarning().done(closeDialog);
                return false;
            }
        });

        // Add click handler for clicking outside the the list of contacts dropdown
        $dialog.rebind('click.closedropdown', () => {
            $shareDialogInviteBG.removeClass('dropdown-visible');
        });

        // Get the handles, names and emails of contacts
        const listOfContacts = M.getContactsEMails(true); // true to exclude requests (incoming and outgoing)

        // Render the user's contacts into the dropdown
        renderContactsIntoDropdown(listOfContacts);

        // Add click handler for showing the list of contacts to choose from
        $contactSearchInput.rebind('click.searchcontact', (event) => {
            const searchInputVal = $contactSearchInput.val();

            // Update the list of contacts in the dropdown
            renderContactsIntoDropdown(listOfContacts, searchInputVal);

            // Hide the dropdown if there are no contacts to be rendered
            if ((checkIfAllContactsSelected(listOfContacts) || isContactsDropdownEmpty()) &&
                !nonContactEmailInSelect()) {
                $shareDialogInviteBG.removeClass('dropdown-visible');
            }
            else {
                // Show the dropdown
                $shareDialogInviteBG.addClass('dropdown-visible');

                // Scroll to the top of the list on each open (and after re-opening)
                $contactDropdownWrapper.scrollTop(0);
                onIdle(resetContactsDropdownPS);
            }

            // Make sure click is not propgated to the dialog close dropdown click handler so the user has time to look
            event.stopPropagation();
        });

        // Add keyup handler for searching/filtering the contacts
        $contactSearchInput.rebind('keyup.searchcontact', function(event) {
            const currentSearchString = $(this).val();
            const keyCode = event.key;

            // Hide any current error messages until they press Enter again and potentially get another error
            hideErrorMessage();

            // Show dropdown on keyup
            $shareDialogInviteBG.addClass('dropdown-visible');

            // Update the list of contacts in the dropdown
            renderContactsIntoDropdown(listOfContacts, currentSearchString);

            // Hide list when nothing to show
            if ((checkIfAllContactsSelected(listOfContacts) || isContactsDropdownEmpty()) &&
                !nonContactEmailInSelect()) {
                // Hide the dropdown
                $shareDialogInviteBG.removeClass('dropdown-visible');
                $selectedContactsContainer.addClass('empty');

                // If there are no matching contacts, but the email is valid one
                if (isValidEmail(currentSearchString)) {

                    // Show the email in the dropdown (to be clickable by mouse as well)
                    renderEmailContactInDropdown(currentSearchString);

                    // Show the dropdown and email inside it
                    $shareDialogInviteBG.addClass('dropdown-visible');
                    $selectedContactsContainer.removeClass('empty');
                }
            }
            else {
                // Show the dropdown and contacts
                $shareDialogInviteBG.addClass('dropdown-visible');
                $selectedContactsContainer.removeClass('empty');
            }

            // If they are manually entering an email and indicate they are finished typing by pressing the Enter key
            if (keyCode === 'Enter') {
                const user = currentSearchString ? M.getUserByEmail(currentSearchString) : false;

                // If existing contact, add using that method
                if (user && user.c) {
                    makeRegularContactForInviting(user.h);
                    $shareDialogInviteBG.removeClass('dropdown-visible');
                }
                else if (isValidEmail(currentSearchString)) {
                    // If it's a valid email, make the styled box for the email to be invited
                    makeEmailPendingContact(currentSearchString);
                    $shareDialogInviteBG.removeClass('dropdown-visible');
                }
                else if (currentSearchString.length > 0 && !isContactsDropdownEmpty()) {
                    const handle = $contactDropdownWrapper
                        .children(':not(.selected):first')
                        .attr('data-contact-handle');

                    if (handle) {
                        makeRegularContactForInviting(handle);
                    }
                    else {
                        showErrorMessage(l[2465]);
                        $contactSearchInput.focus();
                    }

                    $shareDialogInviteBG.removeClass('dropdown-visible');
                }
                else if (currentSearchString.length !== 0) {
                    // Show Invalid Email error if input has value
                    showErrorMessage(l[2465]);
                    $contactSearchInput.focus();
                }

                // Update container or input UI
                onContactChange();

                // Update the list of contacts in the dropdown
                renderContactsIntoDropdown(listOfContacts);

                // Make sure click is not propagated to the close dropdown click handler so the user has time to look
                event.stopPropagation();
            }

            // Update container or input UI
            onContactChange();
        });

        // Add keydown handler for removing selected contact
        $contactSearchInput.rebind('keydown.searchcontact', function(event) {
            const currentSearchString = $(this).val();
            const keyCode = event.key;

            // Remove selected/added contact when backspace is pressed and input value is ''
            if (keyCode === 'Backspace' && !currentSearchString.length) {
                $selectedContactsContainer.children('.contact-selected-item').last().remove();

                // Update container or input UI
                onContactChange();
            }
        });

        $contactSearchInput.focus(() => {
            $('.permissions-dropdown-container', $dialog).addClass('hidden');
        });

        // Add click handler for showing the list of contacts to choose from
        $selectedContactsContainer.rebind('click.clicksearchcontact', (event) => {
            // Do nothing when all contacts is selected
            if (checkIfAllContactsSelected(listOfContacts) || $contactDropdownWrapper.children().length === 0) {
                $shareDialogInviteBG.removeClass('dropdown-visible');
                return;
            }

            $shareDialogInviteBG.addClass('dropdown-visible');
            $contactSearchInput.focus();
            event.stopPropagation();

            hideErrorMessage();
        });

        // Initialise the permissions dropdown for inviting new contacts
        initPermissionsDropdown();

        // Initialise the Invite button
        initInviteButton();

        // Initialise the Remove Share, Done buttons etc
        initShareDialogButtons();

        return $dialog;
    }

    /**
     * Shows the Share dialog
     * @returns {Object} Returns the jQuery object for the dialog
     */
    function showShareDlg() {

        $dialog.rebind('dialog-closed.share', () => {

            $dialog.off('dialog-closed.share');

            if (self.d) {
                console.warn(`Revoking share-snapshot for ${target}...`, !!mega.keyMgr.getShareSnapshot(target));
            }
            mega.keyMgr.removeShareSnapshot(target);
        });

        $.hideContextMenu();

        // eslint-disable-next-line no-use-before-define
        fillShareDlg(target).catch(dump);

        // Show the Share dialog
        return $dialog;
    }

    /**
     * Public API
     */
    return freeze({

        /**
         * Open the Share dialog e.g. mega.ui.mShareDialog.init(handle);
         * @param {String} selectedNode The selected node handle to be shared
         * @returns {undefined}
         */
        init(selectedNode) {

            target = selectedNode;

            if (M.isInvalidUserStatus()) {
                return;
            }
            if (u_type === 0) {
                return ephemeralDialog(l[1006]); // Sharing folders is only for logged-in users
            }

            $.addContactsToShare = {};       // GLOBAL VARIABLE, add contacts to a share
            $.changedPermissions = {};       // GLOBAL VARIABLE, changed permissions shared dialog
            $.removedContactsFromShare = {}; // GLOBAL VARIABLE, removed contacts from a share
            $.shareDialog = 'share';

            Promise.resolve(mega.fileRequestCommon.storage.isDropExist(target))
                .then((res) => {
                    if (res.length) {
                        return mega.fileRequest.showRemoveWarning(res);
                    }
                })
                .then(() => mega.keyMgr.setShareSnapshot(target))
                .then(() => !M.getSharingUsers(target).length && mega.sensitives.passShareCheck(target))
                .then(() => M.safeShowDialog('share', showShareDlg))
                .catch(dump);
        },

        /**
         * Public accessor to render the Share dialog's Access list
         * e.g. mega.ui.mShareDialog.renderAccessList();
         * @returns {undefined}
         */
        renderAccessList,

        /**
         * Public accessor to add the contacts to the share (or create the share if it doesn't exist)
         * Called from the Share to Unverified Contacts dialog. e.g. mega.ui.mShareDialog.addContactsToShare()
         * @param {Array} nonContactEmails The emails to be invited as contacts first
         * @param {Array} emails All the emails to be invited (incl after they are outgoing pending contacts)
         * @param {String} inviteNote The note to be sent in the email
         * @returns {undefined}
        */
        addContactsToShare,

        /**
         * Public accessor to bind events for the Access list of Share (or Share Collaborators) dialog
         * e.g. mega.ui.mShareDialog.initAccessListBinds()
         * @param {String} dialogClass The main class of the dialog
         * @returns {undefined}
         */
        initAccessListBinds,

        /**
         * Public accessor to initialise the dropdown to select share permissions for contacts to be invited. Used in
         * the Share dialog and Share Collaborators dialog e.g. mega.ui.mShareDialog.initPendingPermissionDropdown()
         * @param {Object} $container The jQuery object for the dialog
         * @returns {undefined}
         */
        initPendingPermissionDropdown,

        /**
         * Public accessor to generate the HTML for the Access list of both the Share and Share Collaborators dialogs
         * e.g. mega.ui.mShareDialog.generateShareContactList()
         * @returns {undefined}
         */
        generateShareContactList,

        /**
         * Public accessor to hide the permissions menu e.g. mega.ui.mShareDialog.hidePermissionsMenu()
         * @returns {undefined}
         */
        hidePermissionsMenu,

        /**
         * Public accessor to handle share button enabled/disabled and the access list scrolling
         * e.g. mega.ui.mShareDialog.contentCheck()
         * @returns {undefined}
         */
        contentCheck
    });
});
