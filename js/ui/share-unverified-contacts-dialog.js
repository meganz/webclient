/** @property mega.ui.mShareUnverifiedsDialog Renders the Share flow's Unverified Contacts dialog */
lazy(mega.ui, 'mShareUnverifiedsDialog', () => {

    'use strict';

    // DOM caches
    const $shareDialog = $('.mega-dialog.share-dialog', 'body');
    const $unverifiedContactsDialog = $('.mega-dialog.share-with-unverified-contacts', 'body');
    const $contactItemsWrapper = $('.contact-items', $unverifiedContactsDialog);

    /**
     * Initialises and renders the Share With Unverified Contacts warning dialog
     * @param {Array} unverifiedContacts The fingerprint unverified contact handles
     * @param {Array} nonContactEmails The non-contact email addresses
     * @param {Array} emails The emails to be invited
     * @param {String} inviteNote The invite note to be sent in the contact's email
     * @returns {undefined}
     */
    function init(unverifiedContacts, nonContactEmails, emails, inviteNote) {
        const $unverifiedContactsDialog = $('.mega-dialog.share-with-unverified-contacts', 'body');
        const $contactItemTemplate = $('.contact-item-template', $unverifiedContactsDialog);

        let contactItemHtml = '';

        // Clear if re-rendering
        $contactItemsWrapper.empty();
        removeScrollbar();

        // Loop through contacts
        for (let i = 0; i < unverifiedContacts.length; i++) {
            // Get more details about the contact
            const userHandle = unverifiedContacts[i].h;
            const name = unverifiedContacts[i].name;
            const avatar = useravatar.contact(userHandle);

            // Copy template HTML
            const contactItemTemplateHtml = $contactItemTemplate[0].content.querySelector('div').cloneNode(true);
            const $contactItem = $(contactItemTemplateHtml);

            // Update the template
            $('.avatar-container', $contactItem).safeHTML(avatar);
            $('.contact-name', $contactItem).text(name);

            // For adding a contact by clicking
            $contactItem.attr('data-contact-handle', userHandle);

            // Append to html to be added into the dialog
            contactItemHtml += $contactItem.prop('outerHTML');
        }

        // Update dialog HTML with the contacts
        if (contactItemHtml) {
            $contactItemsWrapper.safeHTML(contactItemHtml);
        }
        else {
            $contactItemsWrapper.empty();
        }

        // If there are more than 6 contacts, add dividers (so the scrolling area looks better)
        if ($('.contact-item', $contactItemsWrapper).length > 6) {
            $contactItemsWrapper.addClass('visible-dividers');
        }
        else {
            removeScrollbar();
            $contactItemsWrapper.removeClass('visible-dividers');
        }

        // Now that the content has rendered, we can initiate the click handlers on the contact rows
        initVerifyCredentialsButton(nonContactEmails, emails, inviteNote);
        initShareWithoutVerifyingBtn(nonContactEmails, emails, inviteNote);
        initShareToAllBtn(nonContactEmails, emails, inviteNote);
        initCloseDialogButton();

        // Set dialog name - used in overall closeDialog() logic
        $.shareWithUnverifiedDialog = 'share-with-unverified-contacts';
        onIdle(() => initPerfectScrollbar($('.contact-items.visible-dividers',
                                            $unverifiedContactsDialog)));
        // Put the Share dialog to the back and open this dialog
        M.safeShowDialog('share-with-unverified-contacts', $unverifiedContactsDialog);
    }

    /**
     * Initialise the Verify Credentials button on each contact row
     * @param {Array} nonContactEmails The non-contact email addresses
     * @param {Array} emails The emails to be invited
     * @param {String} inviteNote The invite note to be sent in the contact's email
     * @returns {undefined}
     */
    function initVerifyCredentialsButton(nonContactEmails, emails, inviteNote) {
        const $contactItem = $('.contact-item', $contactItemsWrapper);
        const $verifyCredentialsButton = $('.verify-credentials-button', $contactItem);
        const $shareToAllWithoutVerifyBtn = $('.share-all-without-verifying-button', $unverifiedContactsDialog);

        // If they click the Verify Credentials button, show the Verify Fingerprint dialog
        $verifyCredentialsButton.rebind('click.verifyCredentials', (event) => {

            // Put the Unverified Contacts dialog to the back
            $unverifiedContactsDialog.addClass('arrange-to-back');

            // Get the contact handle
            const contactHandle = $(event.currentTarget).closest('.contact-item').attr('data-contact-handle');

            // The callback function to run when an action has completed on the Verify Fingerprints dialog
            const callbackFunction = (contactHandle) => {

                // Should contain the handle
                if (contactHandle) {

                    // Get the user's Ed25519 keyring
                    const user = M.getUserByHandle(contactHandle);
                    const ed = authring.getContactAuthenticated(user.h, 'Ed25519');

                    // Determine if they are now a verified contact
                    // If not, the dialog will close and they will have to click the Share Without Verifying button
                    if (ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {

                        // If they are we can remove them
                        $(event.currentTarget).closest('.contact-item').remove();

                        // Count how many contacts remaining
                        const currentNumUnverifiedContacts = $('.contact-item', $contactItemsWrapper).length;

                        // If there are no more unverified contacts left
                        if (currentNumUnverifiedContacts === 0) {

                            // Hide the Unverified Contacts dialog and bring the Share dialog back to the front
                            closeDialog();

                            // Proceed to inviting and sharing immediately
                            mega.ui.mShareDialog.addContactsToShare(nonContactEmails, emails, inviteNote);
                            return;
                        }
                    }

                    // Count how many contacts remaining
                    const totalUnverifiedContacts = $('.contact-item', $contactItemsWrapper).length;

                    // If there are 6 contacts or less, hide the dividers (no longer needed)
                    if (totalUnverifiedContacts <= 6) {
                        removeScrollbar();
                        $contactItemsWrapper.removeClass('visible-dividers');
                    }

                    // If only one contact left, we don't need the Share to All Without Verifying button
                    if (totalUnverifiedContacts === 1) {
                        $shareToAllWithoutVerifyBtn.addClass('hidden');
                    }

                    // Put the Unverified Contacts dialog back to the front
                    $unverifiedContactsDialog.removeClass('arrange-to-back');
                    $shareDialog.addClass('arrange-to-back');
                }
            };

            // Open the Contact Verification by Fingerprint dialog
            fingerprintDialog(contactHandle, false, callbackFunction);
        });
    }

    /**
     * Initialise the Share Without Verifying button on each contact row
     * @param {Array} nonContactEmails The non-contact email addresses
     * @param {Array} emails The emails to be invited
     * @param {String} inviteNote The invite note to be sent in the contact's email
     * @returns {undefined}
     */
    function initShareWithoutVerifyingBtn(nonContactEmails, emails, inviteNote) {
        const $contactItem = $('.contact-item', $contactItemsWrapper);
        const $shareWithoutVerifyingButton = $('.share-without-verifying-button', $contactItem);
        const $shareToAllWithoutVerifyBtn = $('.share-all-without-verifying-button', $unverifiedContactsDialog);

        // Reset visibility of button
        $shareToAllWithoutVerifyBtn.removeClass('hidden');

        // If they click the Share Without Verifying button
        $shareWithoutVerifyingButton.rebind('click.shareWithoutVerifying', (event) => {

            // Simply remove the contact
            $(event.currentTarget).closest('.contact-item').remove();

            // Count how many contacts remaining
            const totalUnverifiedContacts = $('.contact-item', $contactItemsWrapper).length;

            // If there are no more unverified contacts left
            if (totalUnverifiedContacts === 0) {

                // Hide the Unverified Contacts dialog and bring the Share dialog back to the front
                closeDialog();

                // Proceed to inviting and sharing immediately
                mega.ui.mShareDialog.addContactsToShare(nonContactEmails, emails, inviteNote);
            }

            // If there are 6 contacts or less, hide the dividers (no longer needed)
            if (totalUnverifiedContacts <= 6) {
                removeScrollbar();
                $contactItemsWrapper.removeClass('visible-dividers');
            }

            // If only one contact left, we don't need the Share to All Without Verifying button
            if (totalUnverifiedContacts === 1) {
                $shareToAllWithoutVerifyBtn.addClass('hidden');
            }
        });
    }

    /**
     * Initialise the Share to All Contacts Without Verifying button (applies to all contacts in the dialog)
     * @param {Array} nonContactEmails The non-contact email addresses
     * @param {Array} emails The emails to be invited
     * @param {String} inviteNote The invite note to be sent in the contact's email
     * @returns {undefined}
     */
    function initShareToAllBtn(nonContactEmails, emails, inviteNote) {
        const $shareToAllWithoutVerifyBtn = $('.share-all-without-verifying-button', $unverifiedContactsDialog);

        $shareToAllWithoutVerifyBtn.rebind('click.shareToAllWithoutVerifying', () => {

            // Hide the Unverified Contacts dialog and bring the Share dialog back to the front
            closeDialog();

            // Proceed to inviting and sharing immediately
            mega.ui.mShareDialog.addContactsToShare(nonContactEmails, emails, inviteNote);
        });

        // If only one contact, we don't need the Share to All Without Verifying button
        if ($('.contact-item', $contactItemsWrapper).length === 1) {
            $shareToAllWithoutVerifyBtn.addClass('hidden');
        }
    }

    /**
     * On clicking the Close (x) button, go back to the main Share dialog
     * @returns {undefined}
     */
    function initCloseDialogButton() {

        const $closeDialogButton = $('.js-button-close', $unverifiedContactsDialog);

        $closeDialogButton.rebind('click.closeButton', () => {

            closeDialog();
        });
    }

    /**
     * When returning to the main Share dialog (render any avatar updates made in the meantime)
     * @returns {undefined}
     */
    function close() {
        removeScrollbar();
        // Update avatars in the contact search area of the Share dialog in case they were recently verified
        const $selectedContactsContainer = $('.selected-contacts-container', $shareDialog);
        const $selectedContacts = $('.contact-selected-item', $selectedContactsContainer);

        // Loop through the contacts in the input area
        $selectedContacts.toArray().forEach((contact) => {
            const $selectedContact = $(contact);
            const handleOrEmail = $selectedContact.attr('data-contact-handle');

            // If email_ found at the front of the string, continue (as we are only processing contact avatars)
            if (handleOrEmail.substring(0, 6) === 'email_') {
                return true;
            }

            const $avatarContainer = $('.avatar-container', $selectedContact);
            const $oldAvatar = $('.avatar-wrapper', $avatarContainer);

            // Remove the old avatar
            $oldAvatar.remove();

            // Get more details about the contact
            const contactDetails = M.getUserByHandle(handleOrEmail);
            const email = contactDetails.m;
            const newAvatar = useravatar.contact(handleOrEmail || email);

            // Show the updated avatar (if it had changed)
            $avatarContainer.safeHTML(newAvatar);
        });
    }

    /**
     * Remove the scrollbar from the contact items wrapper
     *
     * @returns {undefined}
     */
    function removeScrollbar() {
        Ps.destroy($contactItemsWrapper[0]);
    }

    // Public API
    return freeze({

        /**
         * Initialise and render the dialog e.g. mega.ui.mShareUnverifiedsDialog.init()
         * @param {Array} unverifiedContacts The fingerprint unverified contact handles
         * @param {Array} nonContactEmails The non-contact email addresses
         * @param {Array} emails The emails to be invited
         * @param {String} inviteNote The invite note to be sent in the contact's email
         * @returns {undefined}
         */
        init,

        /**
         * When returning to the main Share dialog (render any avatar updates made in the meantime)
         * @returns {undefined}
         */
        close
    });
});
