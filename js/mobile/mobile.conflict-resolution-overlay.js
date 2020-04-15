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

        var self = this;
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
        this.$useSameAction.parent().addClass('checkboxOff').removeClass('checkboxOn');

        this._renderActionText(op);

        var promise = new MegaPromise();
        var done = function(file, name, action) {
            var repeatAction = self.$useSameAction.prop('checked') || false;
            self.close();

            // XXX: Do we really need to show a loading overlay for synchronous operations? anyway, doing as desktop..
            if (repeatAction) {
                loadingDialog.show();
                promise.always(function() {
                    loadingDialog.hide();
                });
            }
            onIdle(function() {
                promise.resolve(file, name, action, repeatAction);
            });
        };

        this.$overlay.find('.fm-dialog-close, .cancel').rebind('tap', function() {
            done(-0xBADF);
            return false;
        });

        this.$overlay.find(".action-replace-item").rebind('tap', function() {
            done(file, file.name, fileconflict.REPLACE);
            return false;
        });

        this.$overlay.find(".action-skip-item").rebind('tap', function() {
            done(file, 0, fileconflict.DONTCOPY);
            return false;
        });

        // Manually emulate a button.
        var $versioningHelpButton = this.$overlay.find('#versionhelp');
        $versioningHelpButton.rebind('tap.mcr', function() {
            window.open($versioningHelpButton.attr('href'), '_blank').focus();
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

            this.$overlay.find(".action-rename-item").rebind('tap', function() {
                var newName = mobile.conflictResolutionDialog.$overlay.find(".detail-new-item-name").text();
                done(file, newName, fileconflict.KEEPBOTH);
                return false;
            });
        }

        if (remaining) {
            this.$overlay.find(".repeat-action-container")
                .removeClass('hidden checkboxOn')
                .find('.checkbox-label')
                .safeHTML(escapeHTML(l[16494]).replace('%1', '<span>' + remaining + '</span>'));
            mobile.initCheckbox("repeat-action-container");
        }

        loadingDialog.hide();
        this.show();

        return promise;
    },

    _renderActionText: function(operation) {
        'use strict';

        var self = this;

        // Select all the actions.
        var $actions = [
            '.action-replace-item',
            '.action-skip-item',
            '.action-rename-item'
        ].map(function(selector) {
            return {
                $title: $(selector + ' .action-title', self.$overlay),
                $description: $(selector + ' .action-description', self.$overlay),
            };
        });


        // Update the option text based on the operation.
        switch (operation) {
            case 'replace':
                $actions[0].$title.text(l[16488]);
                $actions[0].$description.text(l[17602]);
                $actions[1].$title.text(l[16490]);
                $actions[1].$description.text(l[22127]);
                $actions[2].$title.text(l[17094]);
                $actions[2].$description.text(l[16493]);
                break;
            case 'upload':
                $actions[0].$title.text(l[17093]);
                $actions[0].$description.safeHTML(l[17097]);
                $actions[1].$title.text(l[16490]);
                $actions[1].$description.text(l[22127]);
                $actions[2].$title.text(l[17094]);
                $actions[2].$description.text(l[16493]);
                break;
            default:
                $actions[0].$title.text(l[16495]);
                $actions[0].$description.text(l[16497]);
                $actions[1].$title.text(l[16499]);
                $actions[1].$description.text(l[19784]);
                $actions[2].$title.text(l[17096]);
                $actions[2].$description.text(l[16514]);
                break;
        }
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
