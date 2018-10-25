/**
 * Code to trigger the mobile conflict overlay.
 */
mobile.conflictResolutionDialog = {

    /** Cached jQuery selectors */
    $overlay: null,
    $fileManagerBlock: null,
    $useSameAction: null,

    /**
     * Prompt overlay ot handle duplicates/fileconflicts.
     * @param {String} op Operation, one of copy, move, or upload
     * @param {Object} file The source file
     * @param {Object} node The existing node
     * @param {Number} remaining The remaining conflicts
     * @param {String} target Location where the new file(s) will be placed
     * @returns {MegaPromise}
     */
    prompt: function(op, file, node, remaining, target) {
        'use strict';

        var isFolder = file.t;
        var name = M.getSafeName(file.name);

        if (isFolder) {
            this.$overlay = $('#mobile-ui-folder-conflict');
        } else {
            this.$overlay = $('#mobile-ui-file-conflict');
        }
        this.$fileManagerBlock = $('.mobile.file-manager-block');
        this.$useSameAction = this.$overlay.find(".repeat-action-control");
        this.$useSameAction.prop("checked", false);

        var promise = new MegaPromise();
        var done = function(file, name, action) {
            mobile.conflictResolutionDialog.close();
            loadingDialog.show();
            var repeatAction = mobile.conflictResolutionDialog.$useSameAction.prop('checked') || false;
            promise.resolve(file, name, action, repeatAction);
        };

        this.$overlay.find('.fm-dialog-close, .cancel').off('tap').on('tap', function() {
            done(-0xBADF);
            return false;
        });

        this.$overlay.find(".action-replace-item").off('tap').on('tap', function() {
            done(file, file.name, fileconflict.REPLACE);
            return false;
        });

        this.$overlay.find(".action-skip-item").off('tap').on('tap', function() {
            done(file, 0, fileconflict.DONTCOPY);
            return false;
        });

        if (isFolder) {
            this.$overlay.find(".overlay-description-text")
                .safeHTML(escapeHTML(l[17550]).replace('%1', '<strong>' + name + '</strong>'));
        } else {
            this.$overlay.find(".overlay-description-text")
                .safeHTML(escapeHTML(l[16486]).replace('%1', '<strong>' + name + '</strong>'));

            // Map the file extension back to the image icon
            var iconName = fileIcon(file);
            var iconPath = mobile.imagePath + iconName + '.png';
            this.$overlay.find('.action-icon img').attr('src', iconPath);

            // File
            var newFileName = fileconflict.findNewName(file.name, target);
            this.$overlay.find(".detail-new-item-name").text(newFileName);

            this.$overlay.find(".action-rename-item").off('tap').on('tap', function() {
                var newName = mobile.conflictResolutionDialog.$overlay.find(".detail-new-item-name").text();
                done(file, newName, fileconflict.KEEPBOTH);
                return false;
            });
        }

        if (remaining) {
            this.$overlay.find(".repeat-action-container")
                .removeClass('hidden checkboxOn')
                .find('.checkbox-label')
                .safeHTML(escapeHTML(l[16494]).replace('[S]2[/S]', '<span>' + remaining + '</span>'));
            mobile.initCheckbox("repeat-action-container");
        }

        loadingDialog.hide();
        this.show();

        return promise;
    },


    /**
     * Show the overlay.
     */
    show: function() {
        'use strict';
        // Disable scrolling of the file manager in the background to fix a bug on iOS Safari and show the overlay
        this.$fileManagerBlock.addClass('disable-scroll');
        this.$overlay.removeClass('hidden').addClass('overlay');
    },

    /**
     * close the overlay.
     */
    close: function () {
        'use strict';
        // Hide overlay with download button options, re-show the file manager and re-enable scrolling
        this.$overlay.addClass('hidden');
        this.$fileManagerBlock.removeClass('hidden disable-scroll');
    }
};

mBroadcaster.once('startMega', function() {
    'use strict';

    fileconflict.prompt = function(op, file, node, remaining, target) {
        return mobile.conflictResolutionDialog.prompt(op, file, node, remaining, target);
    };
});
