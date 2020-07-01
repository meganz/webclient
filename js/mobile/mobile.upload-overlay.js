/**
 * File upload functionality (currently incomplete)
 */
mobile.uploadOverlay = {

    /** Upload start time in milliseconds */
    startTime: null,

    /** The jQuery selector for the create new folder overlay */
    $overlay: null,

    /** The jQuery selector for the cloud drive / file manager block */
    $fileManagerBlock: null,

    /**
     * Initialise the upload screen functionality
     */
    init: function() {
        'use strict';
        var self = this;

        this.close();
        this.$overlay = $('.mobile.upload-overlay').removeClass('see-all');
        this.$fileManagerBlock = $('.mobile.file-manager-block');
        this.$ttable = $('.mobile-transfer-table-wrapper', this.$overlay);
        this.logger = new MegaLogger('mobileUploadOverlay', {}, ulmanager.logger);
        this.doReRender = M.v.length ? false : M.currentdirid;

        // Init functionality
        mobile.uploadOverlay.initCloseOverlayButton();
        mobile.initOverlayPopstateHandler(this.$overlay);

        $('.ul-status-header span:first', this.$overlay).text(l[1155]);
        $('.text-button.see-all', this.$overlay)
            .rebind('click.see-all', function() {
                self.$ttable.removeClass('hidden');
                return false;
            });

        this._uploadAbortListener = mBroadcaster.addListener('upload:abort', function(id, res) {
            var gid = ulmanager.getGID({id: id});

            self.logger.debug('upload:abort[%s]', gid, id, res);

            if (ulmanager.isUploadActive(gid)) {
                onIdle(self._dispatchNextUpload.bind(self));
            }
        });

        this._clickHandler = function(ev) {
            var target = ev.target;
            var tr = target.closest('tr');

            if (tr && target.classList.contains('fm-icon')) {

                if (tr.classList.contains('transfer-completed')) {
                    var h = tr.dataset.handle;
                    if (h) {
                        mobile.linkOverlay.show(h);
                    }
                }
                else {
                    var table = tr.closest('table');
                    var gid = tr.id.substr(tr.id[0] === '$');

                    $(tr).fadeOut(function() {
                        ulmanager.abort(gid);
                        $(this).remove();

                        if (!table.querySelector('tr')) {
                            self.close();
                        }
                    });
                }
            }
        };
        this.$ttable.get(0).addEventListener('click', this._clickHandler, true);
    },

    /**
     * Initialise the handler for file selection
     */
    showUploadStarting: function(ul) {
        'use strict';

        if (d) {
            this.logger.debug('showUploadStarting', ul.id, [ul]);
        }

        // Cache selectors
        var $overlay = this.$overlay;
        var $fileManagerBlock = this.$fileManagerBlock;
        var $uploadAnotherFileButton = $overlay.find('.upload-another-file');
        var $uploadProgressBlock = $overlay.find('.upload-progress');
        var $uploadProgressText = $overlay.find('.upload-progress .text');
        var $uploadProgressBar = $overlay.find('.upload-progress .bar');
        var $uploadPercent = $overlay.find('.upload-percents');
        var $uploadSpeed = $overlay.find('.upload-speed');

        // Pop up upload dialog
        $overlay.removeClass('hidden').addClass('overlay');

        // Format the file size and get the file name
        var fileSize = numOfBytes(ul.size);
        var fileSizeFormatted = fileSize.size + ' ' + fileSize.unit;
        var fileName = ul.name;

        // Get file icon
        var fileExt = fileext(fileName);
        var fileIconName = ext[fileExt] ? ext[fileExt][0] : 'generic';
        var fileIconPath = mobile.imagePath + fileIconName + '.png';

        // Display in overlay
        $('.filesize', $overlay).text(fileSizeFormatted);
        $('.filename', $overlay).text(fileName);
        $('.filetype-img', $overlay).attr('src', fileIconPath);

        // Reset state of dialog from past uploads
        $uploadAnotherFileButton.addClass('hidden').off('tap');
        $uploadProgressBlock.removeClass('complete').off('tap');
        $uploadProgressText.removeClass('starting-upload').text(l[6110]);
        $uploadProgressBar.width('0');
        $uploadPercent.text('');
        $uploadSpeed.text('');

        loadingDialog.hide();

        // Set the start time
        this.startTime = Date.now();

        // Upload filename incase it changed during conflict resolution.
        $('.filename', $overlay).text(ul.name);

        // Show progress bar
        $('body').addClass('uploading');

        // Add a class to make the progress block text grey and show text Starting...
        $uploadProgressText.addClass('starting-upload').text(l[7022] + '...');
    },

    /**
     * Shows the upload progress in the overlay
     * @param {Object} uploadData The file metadata
     * @param {Number} percentComplete The percentage of the file uploaded so far
     * @param {Number} bytesLoaded The number of bytes loaded so far
     */
    showUploadProgress: function(uploadData, percentComplete, bytesLoaded) {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $uploadProgressText = $overlay.find('.upload-progress .text');
        var $uploadProgressBar = $overlay.find('.upload-progress .bar');
        var $uploadPercent = $overlay.find('.upload-percents');
        var $uploadSpeed = $overlay.find('.upload-speed');

        // Calculate the upload speed
        var percentCompleteRounded = Math.round(percentComplete);
        var currentTime = new Date().getTime();
        var secondsElapsed = (currentTime - mobile.uploadOverlay.startTime) / 1000;
        var bytesPerSecond = secondsElapsed ? bytesLoaded / secondsElapsed : 0;
        var speed = numOfBytes(bytesPerSecond, 2, true);
        var speedSizeRounded = Math.round(speed.size);
        var speedText = speedSizeRounded + ' ' + speed.unit;

        // Display the upload progress and speed
        $uploadPercent.text(percentCompleteRounded + '%');
        $uploadProgressBar.width(percentComplete + '%');
        $uploadSpeed.text(speedText);

        // Remove class to hide the Starting... text now that we have progress bar showing and show text Uploading...
        if (percentComplete >= 1 && percentComplete < 99) {
            $uploadProgressText.removeClass('starting-upload').text(l[6110]);
        }

        // If the upload is nearly complete e.g. 99/100%, change button text to Completing... which can take some time
        else if (percentComplete >= 99) {
            $uploadProgressText.removeClass('starting-upload').text(l[16508]);
        }

        delay('fm_tfsupdate', fm_tfsupdate, 700);
    },

    /**
     * Show that the upload has completed and initialise some buttons to view the file or upload another file
     * @param {Object} ul Upload instance
     * @param {String} status Completion status
     * @param {String} h Node handle, if upload succeed.
     */
    showUploadComplete: function(ul, status, h) {
        'use strict';
        var self = this;
        var $overlay = self.$overlay;

        if (d) {
            this.logger.debug('showUploadComplete', ul.id, h, this.startTime, [ul]);
        }
        eventlog(99678, h ? 'OK' : lang === 'en' ? status : 'FAIL');

        if (!this.startTime) {
            console.assert(!ul.starttime);
            M.ulstart(ul);
        }
        this.startTime = null;

        if (h) {
            var tr = ul.domElement || false;
            console.assert(tr._elmStatus);

            if (tr) {
                tr.dataset.handle = h;

                if (tr._elmStatus) {
                    tr._elmStatus.textContent = l[1418];
                }
            }
        }

        // Change button text to full white, show as Complete hide the upload percentage and speed
        $('.upload-progress .bar', $overlay).width('100%');
        $('.upload-percents', $overlay).text('');
        $('.upload-speed', $overlay).text('');

        if (!this._dispatchNextUpload()) {
            $('body').removeClass('uploading');
            var $viewFileButton = $('.upload-progress', $overlay);
            $('.text', $viewFileButton.addClass('complete')).removeClass('starting-upload').text(l[59]);
            $('.ul-status-header span:first', $overlay).text(l[1418]);
            $('.close-button span', $overlay).text(l[148]);
            mobile.uploadOverlay.initUploadAnotherFileButton();
            mobile.uploadOverlay.initGetLinkButton(M.d[h]);
        }

        delay('mumobup-thumber', function() {
            if (self.$overlay) {
                var nodeMap = {};
                var nodeList = [];
                var overlay = self.$overlay.get(0);
                var trs = overlay.querySelectorAll('tr.transfer-completed');

                self.logger.debug('%d completed uploads, requesting thumbnails...', trs.length);

                for (var i = trs.length; i--;) {
                    var n = M.d[trs[i].dataset.handle];
                    if (n) {
                        n.seen = true;
                        nodeList.push(n);
                        nodeMap[n.h] = trs[i].id;
                        self.logger.debug('Want thumbnail for %s, %s', n.h, trs[i].id);
                    }
                }

                fm_thumbnails('standalone', nodeList, function(h) {
                    self.logger.debug('Thumbnail for %s may be ready...', h, nodeMap[h], thumbnails[h]);

                    if (thumbnails[h] && nodeMap[h]) {
                        var img = overlay.querySelector('#' + nodeMap[h] + ' img');
                        if (img) {
                            img.src = thumbnails[h];
                            // img.parentNode.classList.add('thumb');
                        }
                        else if (d) {
                            self.logger.warn('No DOM node for #%s', nodeMap[h]);
                        }
                    }
                });
            }
        }, 4e3);
    },

    /**
     * Initialise the Get Link button to open the Get Link overlay
     * @param {Object} node The file node
     */
    initGetLinkButton: function(node) {
        'use strict';

        var $overlay = this.$overlay;
        var $getLinkButton = $('.upload-progress', $overlay).removeClass('disabled');

        if (!node) {
            $getLinkButton.addClass('disabled');
            return false;
        }

        $getLinkButton.rebind('tap.gl', function() {

            // Show the Get Link overlay
            mobile.linkOverlay.show(node.h);

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the Upload Another File button to let the user upload another file
     */
    initUploadAnotherFileButton: function() {

        'use strict';

        // Cache selectors
        var $overlay = this.$overlay;
        var $fileManager = this.$fileManagerBlock;
        var $uploadAnotherFileButton = $overlay.find('.upload-another-file');
        var $fileInput = $fileManager.find('.upload-select-file');

        // Show and initialise the Upload Another File button
        $uploadAnotherFileButton.removeClass('hidden').off('tap').on('tap', function() {

            // Clear the file input enabling the user to select the same file again if they so wanted.
            $fileInput.val(null);

            // Open the file picker
            $fileInput.trigger('click');

            // Initialise the behaviour for when the file is selected
            mobile.uploadOverlay.init();

            // Prevent double taps
            return false;
        });
    },

    /**
     * Initialise the close button to close the overlay/dialog
     */
    initCloseOverlayButton: function() {

        'use strict';

        var self = this;
        var $overlay = this.$overlay;
        var $closeIcon = $('.fm-dialog-close, .close-button', $overlay);

        $('span', $closeIcon).text(l[1597]);

        $('.up.left', $overlay).rebind('tap.up', function() {
            self.$ttable.addClass('hidden');
            return false;
        });

        // On tapping/clicking the Close icon
        $closeIcon.off('tap').on('tap', function() {
            self.close();
            return false;
        });
    },

    /**
     * Close upload overlay.
     * @return {void}
     */
    close: function() {
        'use strict';

        var $overlay = $('.mobile.upload-overlay');

        ulmanager.abort(null);

        // Close the upload overlay
        $overlay.addClass('hidden').removeClass('overlay');

        if (this.$ttable) {
            this.$ttable.get(0).removeEventListener('click', this._clickHandler, true);
            this.$ttable.addClass('hidden');
            delete this.$ttable;
        }

        this.startTime = null;
        this.uploading = false;
        $('body').removeClass('uploading');
        $('.mobile-transfer-table', $overlay).empty();

        if (this._uploadAbortListener) {
            mBroadcaster.removeListener(this._uploadAbortListener);
            delete this._uploadAbortListener;
        }

        if (this.doReRender) {
            var target = this.doReRender;
            delete this.doReRender;

            onIdle(function() {
                if (M.currentdirid === target) {
                    M.openFolder(target, true).dump('mumobup');
                }
            });
        }
    },

    /**
     * Dispatch next upload.
     * @private
     */
    _dispatchNextUpload: function() {
        'use strict';
        var tr = this.$overlay.get(0).querySelector('tr[id^="$ul_"]');
        if (tr) {
            tr.id = tr.id.substr(1);
        }
        return tr;
    },

    /**
     * Test layout.
     * @returns {undefined}
     */
    testLayout: function() {
        'use strict';
        var f = {name: 'pneumonoultramicroscopicsilicovolcanoconiosis.pdf', size: 3e7};

        this.init();
        this.showUploadStarting(f);

        for (var i = 8020; i-- > 8001;) {
            M.addToTransferTable('ul_' + i, f);
        }

        loadingDialog.hide();
        this.$ttable.removeClass('hidden');
    },

    /**
     * Mobile shims
     * @param {MegaData} ctx MegaData instance
     * @returns {undefined}
     */
    shim: function(ctx) {
        'use strict';
        var self = this;
        /* eslint-disable no-useless-concat */

        var _ulProgress = ctx.ulprogress;
        ctx['ul' + 'progress'] = function() {
            var res = _ulProgress.apply(this, arguments);
            self.showUploadProgress.apply(self, arguments);
            return res;
        };

        var _ulStart = ctx.ulstart;
        ctx['ul' + 'start'] = function() {
            var res = _ulStart.apply(this, arguments);
            self.showUploadStarting.apply(self, arguments);
            return res;
        };

        var _ulFinalize = ctx.ulfinalize;
        ctx['ul' + 'finalize'] = function() {
            var res = _ulFinalize.apply(this, arguments);
            self.showUploadComplete.apply(self, arguments);
            return res;
        };

        ctx['openTrans' + 'fersPanel'] = function() {
            onIdle(function() {
                if (ulmanager.isUploading) {
                    var ul = ul_queue[0] || false;
                    console.assert(ul.id);

                    if (ul.id) {
                        if (d) {
                            self.logger.debug('Initializing upload(s)...', ul.id, [ul]);
                        }

                        self.showUploadStarting(ul);
                        self.startTime = null;
                    }
                }
            });
        };

        ctx['addToTran' + 'sferTable'] = function(gid, f) {
            var template =
                '<tr id="$' + gid + '" class="transfer-queued transfer-upload"><td>' +
                '<div class="mobile fm-item file clear transfer-type upload">' +
                ' <div class="mobile fm-item-img">' +
                '  <img src="' + escapeHTML(mobile.imagePath + fileIcon(f) + '.png') + '"/>' +
                ' </div>' +
                ' <div class="mobile fm-icon right"></div>' +
                ' <div class="mobile fm-item-info">' +
                '  <div class="mobile fm-item-name">' + escapeHTML(f.name) + '</div>' +
                '  <div class="mobile fm-item-details">' +
                '   <span class="file-size uploaded-size transfer-size">' + bytesToSize(f.size) + '</span>,' +
                '   <span class="date transfer-status">' + escapeHTML(l[7227]) + '</span>' +
                '  </div></div></div></td></tr>';
            $('.mobile-transfer-table', self.$overlay).safeAppend(template);

            if (!self.uploading) {
                // loadingDialog.show();
                self.uploading = true;
                self._dispatchNextUpload();
            }
        };
    }
};
