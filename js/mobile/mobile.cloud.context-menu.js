/**
 * The context menu (shown when clicking the icon with 3 vertical dots) next to a folder or file row allows extra
 * options to be performed for that file or folder such as downloading, creating/editing a public link or deleting.
 */
mobile.cloud.contextMenu = {

    /**
     * Initialise the context menu for each context menu icon click in each cloud row
     */
    init: function() {

        'use strict';

        var $fileManagerBlock = $('.mobile.file-manager-block');
        var $openContextMenuButtons = $fileManagerBlock.find('.open-context-menu');

        // If a folder/file row context menu icon is tapped
        $openContextMenuButtons.off('tap').on('tap', function() {

            var $selectedRow = $(this).parents('.fm-item');
            var $itemImage = $selectedRow.find('.fm-item-img');
            var $itemInfo = $selectedRow.find('.fm-item-info');
            var $contextMenuItemInfo = $('.context-menu-container .item-info');

            // Get the node handle for this row
            var nodeHandle = $selectedRow.data('handle');

            // Clear any selections.
            mobile.cloud.deselect();

            // Show the file info inside the context menu
            $contextMenuItemInfo.empty()
                .append($itemImage.clone())
                .append($itemInfo.clone());

            // Show the relevant context menu
            mobile.cloud.contextMenu.show(nodeHandle);

            // Prevent bubbling up to clicking the row behind the icon
            return false;
        });
    },

    /**
     * Show the folder or file context menu
     * @param {String} nodeHandle The internal node handle of the folder/file to show the context menu for
     */
    show: function(nodeHandle) {

        'use strict';

        var $folderContextMenu = $('.context-menu-container.folder');
        var $fileContextMenu = $('.mobile.context-menu-container.file');
        var $rubbishBinContextMenu = $('.mobile.context-menu-container.rubbishbin');
        var $overlay = $('.dark-overlay');

        // Get the node type
        var nodeType = M.d[nodeHandle].t;
        var share = M.getNodeShare(nodeHandle);
        var sourceRoot = M.getNodeRoot(nodeHandle);

        // Show overlay
        $overlay.removeClass('hidden');

        // Hide the overlay on overlay tap
        $overlay.off('tap').on('tap', function() {
            mobile.cloud.contextMenu.hide();
            return false;
        });

        // If folder type
        if (sourceRoot === M.RubbishID) {

            mobile.cloud.contextMenu.initCloseButton($rubbishBinContextMenu);
            mobile.cloud.contextMenu.initRestoreButton($rubbishBinContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initRubbishBinDelete($rubbishBinContextMenu, nodeHandle);

            $fileContextMenu.addClass('hidden');
            $folderContextMenu.addClass('hidden');
            $rubbishBinContextMenu.removeClass('hidden');
        }
        else if (nodeType === 1) {

            // Otherwise inititalise tap handler on the buttons
            mobile.cloud.contextMenu.initFolderOpenButtonHandler($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDownloadButton($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initMegadropButtons($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDeleteButton($folderContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initCloseButton($folderContextMenu);
            mobile.cloud.contextMenu.initOverlayTap($folderContextMenu);

            $('.create-megadrop', $folderContextMenu).addClass('hidden');
            $('.manage-megadrop', $folderContextMenu).addClass('hidden');
            $('.cancel-megadrop', $folderContextMenu).addClass('hidden');

            if (share && share.down) {
                $folderContextMenu.find('.link-button').addClass('hidden');
            } else {
                $folderContextMenu.find('.link-button').removeClass('hidden');
                mobile.cloud.contextMenu.initLinkButton($folderContextMenu, nodeHandle);

                if (u_type === 3
                    && !M.getShareNodesSync(nodeHandle).length
                    && !folderlink) {

                    // Create or Remove upload page context menu action
                    if (mega.megadrop.pufs[nodeHandle]
                        && mega.megadrop.pufs[nodeHandle].s !== 1
                        && mega.megadrop.pufs[nodeHandle].p) {
                        $('.manage-megadrop', $folderContextMenu).removeClass('hidden');
                        $('.cancel-megadrop', $folderContextMenu).removeClass('hidden');
                    }
                    else {
                        $('.create-megadrop', $folderContextMenu).removeClass('hidden');
                    }
                }
            }

            // Hide the file context menu if open and show the folder context menu
            $fileContextMenu.addClass('hidden');
            $folderContextMenu.removeClass('hidden');
        }
        else {

            // Initialise buttons
            mobile.cloud.contextMenu.initPreviewButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initDeleteButton($fileContextMenu, nodeHandle);
            mobile.cloud.contextMenu.initCloseButton($fileContextMenu);
            mobile.cloud.contextMenu.initOverlayTap($folderContextMenu);

            if (share && share.down) {
                $fileContextMenu.find('.download-file-button, .link-button').addClass('hidden');
            } else {
                $fileContextMenu.find('.download-file-button, .link-button').removeClass('hidden');
                mobile.cloud.contextMenu.initDownloadButton($fileContextMenu, nodeHandle);
                mobile.cloud.contextMenu.initLinkButton($fileContextMenu, nodeHandle);
            }

            // Hide the folder context menu if open and show the file context menu
            $folderContextMenu.addClass('hidden');
            $fileContextMenu.removeClass('hidden');
        }

        if (pfid) {
            $('.context-menu-item.link-button, .context-menu-item.delete-button').addClass('hidden');
        }
    },

    /**
     * Hide the context menu
     */
    hide: function() {

        'use strict';

        var $folderContextMenu = $('.context-menu-container.folder');
        var $fileContextMenu = $('.mobile.context-menu-container.file');
        var $rubbishBinContextMenu = $('.mobile.context-menu-container.rubbishbin');
        var $overlay = $('.dark-overlay');

        // Hide overlay
        $overlay.addClass('hidden');

        // Hide the file context menu if open and show the folder context menu
        $fileContextMenu.addClass('hidden');
        $folderContextMenu.addClass('hidden');
        $rubbishBinContextMenu.addClass('hidden');
    },

    /**
     * Init event handler for rubbish bin context menu restore button.
     * @param $contextMenu
     * @param nodeHandle
     */
    initRestoreButton: function ($contextMenu, nodeHandle) {
        'use strict';

        $contextMenu.find(".restore-item").off('tap').on('tap', function() {
            mobile.rubbishBin.restore(nodeHandle)
                .always(function() {
                    // Manually filter out the item we just removed from the current view.
                    mobile.cloud.removeNodesFromViewIfRemoved();
                    if (!mobile.cloud.nodeInView(nodeHandle)) {
                        mobile.showSuccessToast(l[19636] + ". " + l[7224], null, null, function() {
                            M.openFolder(M.getNodeParent(nodeHandle))
                                .finally(function() {
                                    $.selected = [nodeHandle];
                                    reselect(1);
                                });
                            mobile.closeToast();
                            return false;
                        });
                    }
                    mobile.rubbishBin.renderUpdate();
                });
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Init event handler for rubbish bin context menu delete button.
     * @param $contextMenu
     * @param nodeHandle
     */
    initRubbishBinDelete: function($contextMenu, nodeHandle) {
        'use strict';

        $contextMenu.find(".delete-item").off('tap').on('tap', function() {
            $.selected = [nodeHandle];
            M.clearRubbish(false)
                .then(function() {
                    mobile.showSuccessToast(l[19635]);
                    mobile.cloud.removeNodesFromViewIfRemoved();
                    mobile.rubbishBin.renderUpdate();
                })
                .catch(function() {
                    mobile.showErrorToast(l[5963]);
                });
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for opening a folder and displaying the contents
     * @param {Object} $contextMenu A jQuery object for the folder context menu container
     * @param {String} nodeHandle The node handle for this folder
     */
    initFolderOpenButtonHandler: function($contextMenu, nodeHandle) {

        'use strict';

        // If the Download button is tapped
        $contextMenu.find('.open-folder').off('tap').on('tap', function() {

            // Open the folder, render the contents and hide the context menu
            M.openFolder(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for previewing a file
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initPreviewButton: function($contextMenu, nodeHandle) {

        'use strict';

        var $previewButton = $contextMenu.find('.preview-file-button');
        var node = M.d[nodeHandle];

        // If the file is previewable, show the preview button
        if (is_image3(node)) {
            // This is an image file
            $previewButton.find('.fm-icon').removeClass('playvideo playaudio').addClass('preview');
            $previewButton.find('.text').text(l[1899]); // Preview
            $previewButton.removeClass('hidden');
        }
        else if (is_video(node)) {
            // If the file is playable, show play button
            if (is_audio(node)) {
                // This is an audio file
                $previewButton.find('.fm-icon').removeClass('playvideo preview').addClass('playaudio');
                $previewButton.find('.text').text(l[17828]); // Play audio
            }
            else {
                // This is a video file
                $previewButton.find('.fm-icon').removeClass('preview playaudio').addClass('playvideo');
                $previewButton.find('.text').text(l[16275]); // Play video
            }
            $previewButton.removeClass('hidden');
        }
        else {
            // Otherwise hide it
            $previewButton.addClass('hidden');
        }

        // If the Preview button is tapped
        $contextMenu.find('.preview-file-button').off('tap').on('tap', function() {

            if (!validateUserAction(true)) {
                return false;
            }

            // Set `$.autoplay` with the node handle
            if ($('.mobile.fm-icon', $(this)).is('.playvideo, .playaudio')){
                $.autoplay = nodeHandle;
            }

            // Show the file preview overlay and hide the context menu
            mobile.slideshow.init(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for downloading a file
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initDownloadButton: function($contextMenu, nodeHandle) {

        'use strict';

        // When the Download button is tapped
        $contextMenu.find('.download-file-button').off('tap').on('tap', function() {

            if (!validateUserAction(true)) {
                return false;
            }

            // Show the file download overlay and hide the context menu
            mobile.downloadOverlay.showOverlay(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    initMegadropButtons: function($contextMenu, nodeHandle) {

        'use strict';

        var $makeBtn = $('.create-megadrop', $contextMenu);
        var $manageBtn = $('.manage-megadrop', $contextMenu);
        var $cancelBtn = $('.cancel-megadrop', $contextMenu);

        // When the button is tapped
        $makeBtn.rebind('tap', function() {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                if (u_attr.b.m) {
                    msgDialog('warningb', '', l[20401], l[20402]);
                }
                else {
                    msgDialog('warningb', '', l[20462], l[20463]);
                }
                return false;
            }

            mobile.cloud.contextMenu.hide();

            // Go to widget creation directly don't display PUF info dialog
            if (mega.megadrop.uiSkipDialog()) {
                mega.megadrop.pufCreate(nodeHandle);
            }
            else {// Display PUF info dialog
                mega.megadrop.uiMobileInfoDialog(nodeHandle, true);
            }

            return false;
        });

        $manageBtn.rebind('tap', function() {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                if (u_attr.b.m) {
                    msgDialog('warningb', '', l[20401], l[20402]);
                }
                else {
                    msgDialog('warningb', '', l[20462], l[20463]);
                }
                return false;
            }

            mobile.cloud.contextMenu.hide();

            // Go to widget creation directly don't display PUF info dialog
            if (mega.megadrop.uiSkipDialog()) {
                mega.megadrop.pufCreate(nodeHandle);
            }
            else {// Display PUF info dialog
                mega.megadrop.uiMobileInfoDialog(nodeHandle, false);
            }

            return false;
        });

        $cancelBtn.rebind('tap', function() {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                if (u_attr.b.m) {
                    msgDialog('warningb', '', l[20401], l[20402]);
                }
                else {
                    msgDialog('warningb', '', l[20462], l[20463]);
                }
                return false;
            }

            mobile.cloud.contextMenu.hide();
            mega.megadrop.pufRemove([nodeHandle]);
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user create and copy a file/folder link
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this folder/file
     */
    initLinkButton: function($contextMenu, nodeHandle) {

        'use strict';

        var $linkButton = $contextMenu.find('.link-button');
        var $linkButtonText = $linkButton.find('.text');
        var node = M.d[nodeHandle];

        // Show the Manage link text if it already has a public link
        if (typeof node.shares !== 'undefined' && typeof node.shares.EXP !== 'undefined') {
            $linkButtonText.text(l[6909]);
        }
        else {
            // Otherwise show Get link
            $linkButtonText.text(l[59]);
        }

        // When the Link button is tapped
        $linkButton.off('tap').on('tap', function() {

            if (!validateUserAction(true)) {
                return false;
            }

            // Show the Get/Manage link overlay and close the context menu
            mobile.cloud.contextMenu.hide();
            mobile.linkOverlay.show(nodeHandle);
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     * @param {String} nodeHandle The node handle for this file
     */
    initDeleteButton: function($contextMenu, nodeHandle) {

        'use strict';

        // When the Delete button is tapped
        $contextMenu.find('.delete-button').off('tap').on('tap', function() {

            if (!validateUserAction(true)) {
                return false;
            }

            // Show the folder/file delete overlay and hide the context menu
            mobile.deleteOverlay.show(nodeHandle);
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for showing the overlay which will let the user delete a file/folder
     * @param {Object} $contextMenu A jQuery object for the folder/file context menu container
     */
    initCloseButton: function($contextMenu) {

        'use strict';

        // When the Close button is tapped
        $contextMenu.find('.close-button').off('tap').on('tap', function() {

            // Hide the context menu
            mobile.cloud.contextMenu.hide();
            return false;
        });
    },

    /**
     * Functionality for hidding contextmenu if overlay is tapped
     */
    initOverlayTap: function() {

        'use strict';

        var $overlay = $('.dark-overlay');

        // When the Overlay is tapped
        $overlay.off('tap').on('tap', function() {

            // Hide the context menu
            mobile.cloud.contextMenu.hide();
            return false;
        });
    }
};
