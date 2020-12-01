/**
 * Code for the create folder overlay
 */
mobile.createFolderOverlay = {

    /** The jQuery selector for the create new folder overlay */
    $overlay: null,

    /** The jQuery selector for the light background overlay behind the main overlay */
    $lightBackgroundOverlay: null,

    /** The jQuery selector for the cloud drive / file manager block */
    $fileManagerBlock: null,

    /**
     * Initialises the overlay
     */
    init: function() {

        'use strict';

        // Cache selectors
        this.$overlay = $('.mobile.create-new-folder-overlay');
        this.$lightBackgroundOverlay = $('.light-overlay');
        this.$fileManagerBlock = $('.mobile.file-manager-block');

        // Initialise functionality
        this.initCreateFolderButton();
        this.initCloseOverlayIcon();
        this.initFolderNameTextFieldKeyup();

        // Show the Create Folder overlay and the background white overlay
        this.$overlay.removeClass('hidden').addClass('overlay');
        this.$lightBackgroundOverlay.removeClass('hidden');

        // Clear the input from old dialog openings and open the keyboard for typing
        this.$overlay.find('.folder-name-input').val('').trigger("focus");

        mobile.initOverlayPopstateHandler(this.$overlay);
    },

    /**
     * Initialise the create folder button to create the folder and return them to the cloud drive
     */
    initCreateFolderButton: function() {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $lightBackgroundOverlay = this.$lightBackgroundOverlay;
        var $fileManagerBlock = this.$fileManagerBlock;
        var $createFolderIcon = this.$fileManagerBlock.find('.fm-icon.mobile-create-new-folder');
        var $folderNameInput = this.$overlay.find('.folder-name-input');
        var $folderNameWarningBlock = this.$overlay.find('.folder-name-warning-block');
        var $folderNameWarningText = this.$overlay.find('.warning-text');
        var $createFolderButton = this.$overlay.find('.create-folder.confirm-ok-button');

        // Hide warning message
        $folderNameWarningBlock.addClass('hidden');

        // On clicking the Create button in the dialog
        $createFolderButton.off('tap').on('tap', function() {

            // Get the folder name and trim whitespace
            var folderName = $folderNameInput.val();
            var trimmedFolderName = $.trim(folderName);
            var folderNameExists = mobile.createFolderOverlay.checkIfFolderNameAlreadyExists(trimmedFolderName);

            // If invalid folder name, show an error
            if (trimmedFolderName === '' || !M.isSafeName(trimmedFolderName)) {
                $folderNameWarningBlock.removeClass('hidden');
                $folderNameWarningText.text(l[7729]);           // Please enter a valid folder name
            }
            else if (folderNameExists) {

                // Otherwise if the folder name already exists, show an error
                $folderNameWarningBlock.removeClass('hidden');
                $folderNameWarningText.text(l[23219]);           // Folder already exists
            }
            else {


                // Hide the text and show a loading spinner
                $createFolderButton.addClass('loading');

                // Try creating the folder
                M.createFolder(M.currentdirid, trimmedFolderName)
                    .always(function(result) {

                        // Hide the loading dialog and loading button
                        $createFolderButton.removeClass('loading');

                        // If there was an error, hide loading dialog and show error message
                        if (typeof result === 'number') {
                            mobile.messageOverlay.show(l[135], l[47] + ' ' + api_strerror(result));
                        }
                        else {
                            // Hide the Create Folder dialog and show the Cloud Drive again
                            $fileManagerBlock.removeClass('hidden');
                            $overlay.addClass('hidden');
                            $lightBackgroundOverlay.addClass('hidden');
                            $createFolderIcon.removeClass('hidden');

                            // Click out of the input to hide the on screen keyboard which
                            // is a bug on mobile Firefox with the keyboard not closing
                            $folderNameInput.trigger("blur");

                            // Show message 'Folder created'
                            mobile.showToast(l[5645]);

                            // Add a server log
                            api_req({ a: 'log', e: 99677, m: 'Mobile web new folder created' });
                        }
                    });
            }

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the close icon to close the overlay
     */
    initCloseOverlayIcon: function() {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $fileManager = this.$fileManagerBlock;
        var $lightBackgroundOverlay = this.$lightBackgroundOverlay;
        var $closeFolderDialogIcon = this.$overlay.find('.close-button');
        var $folderNameInput = this.$overlay.find('.folder-name-input');

        // On clicking the Close icon in the dialog
        $closeFolderDialogIcon.off('tap').on('tap', function() {

            // Hide the Create Folder dialog and show the Cloud Drive again
            $fileManager.removeClass('hidden');
            $overlay.addClass('hidden');
            $lightBackgroundOverlay.addClass('hidden');

            // Click out of the input to hide the on screen keyboard which
            // fixes a bug on mobile Firefox with the keyboard not closing
            $folderNameInput.trigger("blur");

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the keyup function for when a user types into the folder name text field
     */
    initFolderNameTextFieldKeyup: function() {

        'use strict';

        // Cache selectors
        var $folderNameWarningBlock = this.$overlay.find('.folder-name-warning-block');
        var $folderNameInput = this.$overlay.find('.folder-name-input');

        // On typing into the folder name text box
        $folderNameInput.off('keyup').on('keyup', function() {

            // Hide error if it was there before
            $folderNameWarningBlock.addClass('hidden');
        });
    },

    /**
     * Check if the folder name already exists in the current view
     * @param {String} newFolderName The name of the new folder that the user is wanting to create
     * @returns {Boolean} Returns true if the folder name already exists, false if not
     */
    checkIfFolderNameAlreadyExists: function(newFolderName) {

        'use strict';

        // Loop through current view
        for (var i = 0; i < M.v.length; i++) {

            var node = M.v[i];
            var nodeName = node.name;

            // If the node is a folder and the new folder name matches an existing folder name
            if (nodeName === newFolderName) {
                return true;
            }
        }

        // Folder name doesn't exist
        return false;
    }
};
