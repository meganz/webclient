/** @property mega.ui.mShareCollaboratorsDialog */
lazy(mega.ui, 'mShareCollaboratorsDialog', () => {

    'use strict';

    // DOM caches
    const $shareDialog = $('.mega-dialog.share-dialog', 'body');
    const $shareAccessContactDialog = $('.mega-dialog.share-access-contacts-dialog', 'body');

    /**
     * Generate the HTML content for the dialog
     * @returns {void}
     */
    function render() {

        const $contactContainer = $('.share-dialog-access-list', $shareAccessContactDialog);
        const $closeDialogButton = $('.js-button-close', $shareAccessContactDialog);
        const $backDialogButton = $('.icon-arrow-left-thin', $shareAccessContactDialog);

        // Put the Share dialog to the back and open this dialog
        $contactContainer.empty();
        $shareDialog.addClass('arrange-to-back');
        $shareAccessContactDialog.removeClass('hidden');

        // Call the shared function with Share dialog for rendering the access list
        mega.ui.mShareDialog.generateShareContactList();

        if ($contactContainer.is('ps')) {
            Ps.update($contactContainer[0]);
        }
        else {
            Ps.initialize($contactContainer[0]);
        }

        // On clicking the Close (x) button
        $closeDialogButton.rebind('click.closeButton', () => {

            closeDialog();
        });

        // Hide the Share Collaborators dialog and bring the Share dialog back to the front
        $backDialogButton.rebind('click.backButton', () => {

            closeDialog();
        });

        $shareAccessContactDialog.rebind('click.shareAccessList', () => {
            $('.permissions-dropdown-container', $shareAccessContactDialog).addClass('hidden');
        });

        // Hide the permission menu once scrolling
        $contactContainer.rebind('scroll.closeAccessMenu', () => {
            $('.permissions-dropdown-container', $shareAccessContactDialog).addClass('hidden');
        });

        // Shared functions with Share dialog
        mega.ui.mShareDialog.initPendingPermissionDropdown($contactContainer);
        mega.ui.mShareDialog.initAccessListBinds('share-access-contacts-dialog');

        return $shareAccessContactDialog;
    }

    // Public API
    return freeze({

        /**
         * Opens the Share Collaborators dialog e.g. mega.ui.mShareCollaboratorsDialog.init();
         * @returns {undefined}
         */
        init() {

            // Set dialog name - used in overall closeDialog() logic
            $.shareCollaboratorsDialog = 'share-access-contacts-dialog';

            // Put the Share dialog to the back and open this dialog
            M.safeShowDialog('share-access-contacts-dialog', render);
        },

        /**
         * Public accessor to render the Share Collaborator dialog's access list
         * mega.ui.mShareCollaboratorsDialog.render()
         * @returns {undefined}
         */
        render
    });
});
