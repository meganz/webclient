/**
 * Functionality for the Export Link expiry feature
 */
var getLinkExpiry = {

    /**
     * Initialise function
     */
    init: function() {

        // If they are not a pro user, show a Get PRO button
        if (typeof u_attr.p === 'undefined') {
            getLinkExpiry.initGetProButton();
        }
        else {
            // Otherwise enable the expiry toggle button and date picker
            getLinkExpiry.initExpiryFeatureToggle();
            getLinkExpiry.initExpiryDatePicker();
            getLinkExpiry.prepopulateExpiryDates();
        }
    },

    /**
     * Setup the Get PRO button
     */
    initGetProButton: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleButton = $dialog.find('.dialog-feature-toggle');
        var $proButton = $dialog.find('.get-pro');

        // Hide the toggle button and show the PRO Only button
        $toggleButton.addClass('hidden');
        $proButton.removeClass('hidden');

        // On button click, go to the Pro page
        $proButton.rebind('click', function() {
            document.location.hash = 'pro';
        });
    },

    /**
     * Setup the toggle button which shows the date picker
     */
    initExpiryFeatureToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.dialog-feature-toggle');
        var $proButton = $dialog.find('.get-pro');

        // Show the toggle button and hide the PRO Only button
        $toggleBtn.removeClass('hidden');
        $proButton.addClass('hidden');

        // Hide PRO Only warning
        $dialog.find('.pro-only-feature').addClass('hidden');

        // On toggle button click
        $toggleBtn.rebind('click', function() {

            // If already on
            if ($toggleBtn.hasClass('toggle-on')) {

                // Set to disabled state
                getLinkExpiry.disableToggle();

                // Update the selected links and remove the expiry timestamps
                getLinkExpiry.updateLinks();
            }
            else {
                // Set to enabled state
                getLinkExpiry.enableToggle();
            }
        });
    },

    /**
     * Set the toggle button to enabled state
     */
    enableToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.dialog-feature-toggle');
        var $expirySelect = $dialog.find('.expiry-date-select-container');

        // Slide button to the right
        $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '17px' }, 150, 'swing', function() {

            // Add a green background on the toggle and show the datepicker
            $toggleBtn.addClass('toggle-on');
            $expirySelect.removeClass('hidden');

            // Clear the date of any old entries
            $dialog.find('.expiry-date-select').datepicker('setDate', null);
        });
    },

    /**
     * Set the toggle button to disabled state
     */
    disableToggle: function() {

        var $dialog = $('.export-links-dialog');
        var $toggleBtn = $dialog.find('.dialog-feature-toggle');
        var $expirySelect = $dialog.find('.expiry-date-select-container');

        // Slide the button to the left
        $toggleBtn.find('.dialog-feature-switch').animate({ marginLeft: '2px' }, 150, 'swing', function() {

            // Remove the green background and hide the datepicker
            $toggleBtn.removeClass('toggle-on');
            $expirySelect.addClass('hidden');

            // Clear the date of any old entries
            $dialog.find('.expiry-date-select').datepicker('setDate', null);
        });
    },

    /**
     * Setup the datepicker
     */
    initExpiryDatePicker: function() {

        // Initialise expiry date picker
        $('#link-expiry-datepicker').datepicker({
            dateFormat: 'yy-mm-dd',     // 2016-05-25
            dayNamesMin: [
                l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]   // Sun - Sat
            ],
            minDate: '+1D',     // At least 1 day in the future
            monthNames: [
                l[408], l[409], l[410], l[411], l[412], l[413],     // January - June
                l[414], l[415], l[416], l[417], l[418], l[419]      // July - December
            ],
            showButtonPanel: true,          // Show for the close button
            closeText: '',                  // Use an icon instead of text
            onSelect: function(dateText) {

                // Get the year, month and day from the date picker
                var date = dateText.split('-');
                var year = date[0];
                var month = date[1] - 1;    // Date object uses a 0 base index
                var day = date[2];

                // Get the current time
                var time = new Date();
                var hours = time.getHours();
                var mins = time.getMinutes();
                var secs = time.getSeconds();

                // Set the expiry date to the selected date and the time to the current time
                var expiryDate = new Date(year, month, day, hours, mins, secs);
                var expiryTimestamp = Math.round(expiryDate.getTime() / 1000);

                // Update the link with the new expiry timestamp
                getLinkExpiry.updateLinks(expiryTimestamp);
            }
        });
    },

    /**
     * Update selected links with details about the expiry of the link
     * @param {Number} expiryTimestamp The expiry timestamp of the link. Set to null to remove the expiry time
     */
    updateLinks: function(expiryTimestamp) {

        // Get which files/folders are currently selected
        var handles = $.selected;

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var nodeHandle = node.h;

                // The data to send in the API request
                var request = {
                    a: 'l',             // Link
                    n: nodeHandle,
                    i: requesti
                };

                // If the expiry timestamp is set
                if (expiryTimestamp) {

                    // Add it to be sent in the request
                    request.ets = expiryTimestamp;

                    // Update local state with the expiry timestamp
                    node.ets = expiryTimestamp;
                }
                else {
                    // Remove the expiry timestamp from the locally stored node
                    delete node.ets;
                }

                // Update indexedDB with the current state
                mDBadd('f', clone(node));

                // Show the expiry time if applicable or remove it
                getLinkExpiry.showExpiryTime(expiryTimestamp, nodeHandle);

                // Update the link with the new expiry timestamp
                api_req(request);
            }
        }
    },

    /**
     * If reloading the dialog, check the local state and show the expiry time for each key block if applicable
     */
    prepopulateExpiryDates: function() {

        // Get the selected files/folders
        var handles = $.selected;

        // Keep a counter for how many nodes have expiry times
        var numOfNodesWithExpiryTime = 0;

        // For each selected file/folder
        for (var i in handles) {
            if (handles.hasOwnProperty(i)) {

                // Get the node handle
                var node = M.d[handles[i]];
                var nodeHandle = node.h;
                var expiryTimestamp = node.ets;

                // If it has an expiry time, increment the count
                if (expiryTimestamp) {
                    numOfNodesWithExpiryTime++;
                }

                // If the expiry timestamp is set show it
                getLinkExpiry.showExpiryTime(expiryTimestamp, nodeHandle);
            }
        }

        // If there is at least 1 expiry time, enable the toggle switch
        if (numOfNodesWithExpiryTime > 0) {
            getLinkExpiry.enableToggle();
        }
        else {
            // Otherwise disable it
            getLinkExpiry.disableToggle();
        }
    },

    /**
     * Shows the expiry time on the selected export key block
     * @param {Number} expiryTimestamp The UNIX timestamp when the link will expire, set to null to hide
     * @param {String} nodeHandle The node handle which references the key block to update
     */
    showExpiryTime: function(expiryTimestamp, nodeHandle) {

        // Find the right row
        var $linkItem = $('.export-links-dialog .export-link-item[data-node-handle="' + nodeHandle + '"]');
        var $linkExpiryContainer = $linkItem.find('.export-link-expiry-container');
        var $linkExpiry = $linkExpiryContainer.find('.export-link-expiry');
        var expiryString = '';

        // If the expiry timestamp is set
        if (expiryTimestamp) {

            // If the link has expired, show the text 'Expired'
            if (unixtime() >= expiryTimestamp) {
                expiryString = l[1664];
            }
            else {
                // Otherwise update to the date and time
                expiryString = getLinkExpiry.formatTimestampToDateTime(expiryTimestamp);
            }

            // Show it
            $linkExpiryContainer.removeClass('hidden');
        }
        else {
            // Hide it
            $linkExpiryContainer.addClass('hidden');
        }

        // Set or clear the text
        $linkExpiry.text(expiryString);
    },

    /**
     * Converts a timestamp to a localised yyyy-mm-dd hh:mm format e.g. 2016-04-17 14:37
     * @param {Number} timestamp The UNIX timestamp
     * @returns {String} Returns the date in yyyy-mm-dd hh:mm format
     */
    formatTimestampToDateTime: function(timestamp) {

        // Convert to Date object
        var date = new Date(timestamp * 1000);

        // Get the date and time parts
        var year = date.getFullYear();
        var month = uplpad(date.getMonth() + 1, 2);
        var day = uplpad(date.getDate(), 2);
        var hours = uplpad(date.getHours(), 2);
        var mins = uplpad(date.getMinutes(), 2);

        return year + '-' + month + '-' + day + ' ' + hours + ':' + mins;
    }
};


/**
 * Functionality for the Export Link dialog
 */
(function($, scope) {

    /**
     * Public Link Dialog
     * @param opts {Object}
     * @constructor
     */
    var ExportLinkDialog = function(opts) {

        var self = this;

        var defaultOptions = {
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        self.logger = MegaLogger.getLogger('ExportLinkDialog');
    };

    /**
     * Render public link dialog and handle events
     * @param {Boolean} close To close or to show public link dialog
     */
    ExportLinkDialog.prototype.linksDialog = function(close) {

        /* jshint -W074 */
        var self = this;
        var $linksDialog = $('.fm-dialog.export-links-dialog');
        var html = '';
        var scroll = '.export-link-body';
        var links = $.trim(getClipboardLinks());
        var $span = $('.copy-to-clipboard span');
        var toastTxt;
        var doLinks;
        var linksNum;
        var success;

        deleteScrollPanel(scroll, 'jsp');

        if (close) {
            $.dialog = false;
            fm_hideoverlay();
            $linksDialog.addClass('hidden');
            $('.export-links-warning').addClass('hidden');
            if (window.onCopyEventHandler) {
                document.removeEventListener('copy', window.onCopyEventHandler, false);
                delete window.onCopyEventHandler;
            }
            return true;
        }

        $.dialog = 'links';

        $('.export-links-dialog').addClass('file-keys-view');

        // Generate content
        html = itemExportLink();

        // Fill with content
        $('.export-links-dialog .export-link-body').html(html);

        // Default export option is
        $('.export-link-select, .export-content-block')
            .removeClass('public-handle decryption-key full-link')
            .addClass('public-handle');
        $('.export-link-select').html($('.export-link-dropdown div.public-handle').html());

        fm_showoverlay();

        $linksDialog.removeClass('hidden');
        $('.export-link-body').removeAttr('style');
        $('.export-links-warning').removeClass('hidden');

        if ($('.export-link-body').outerHeight() === 318) {// ToDo: How did I find this integer?
            $('.export-link-body').jScrollPane({ showArrows: true, arrowSize: 5 });
            jScrollFade('.export-link-body');
        }
        $linksDialog.css('margin-top', ($linksDialog.outerHeight() / 2) * -1);

        setTimeout(function() {
            $('.file-link-info').rebind('click', function() {
                $('.file-link-info').select();
            });
        }, 300);

        // Setup toast notification
        toastTxt = l[7654];
        linksNum = links.replace(/\s+/gi, ' ').split(' ').length;

        if (linksNum > 1) {
            toastTxt = l[7655].replace('%d', linksNum);
        }

        // Setup the copy to clipboard buttons
        $span.text(l[1990]);

        // If a browser extension or the new HTML5 native copy/paste is available (Chrome & Firefox)
        if (is_extension || mega.utils.execCommandUsable()) {
            if (!is_chrome_firefox) {
                $('.fm-dialog-chrome-clipboard').removeClass('hidden');
            }

            $('.copy-to-clipboard').rebind('click', function() {
                success = true;
                doLinks = ($(this).attr('id') === 'clipboardbtn1');
                links = $.trim(doLinks ? getClipboardLinks() : getclipboardkeys());

                // If extension, use the native extension method
                if (is_chrome_firefox) {
                    mozSetClipboard(links);
                }
                else {
                    // Put the link/s in an invisible div, highlight the link/s then copy to clipboard using HTML5
                    $('#chromeclipboard').html(links);
                    selectText('chromeclipboard');
                    success = document.execCommand('copy');
                }

                if (success) {
                    showToast('clipboard', toastTxt);
                }
            });
        }
        else if (flashIsEnabled()) {
            $('.copy-to-clipboard').safeHTML(
                '<span>' + htmlentities(l[1990]) + '</span>'
              + '<object data="OneClipboard.swf" id="clipboardswf1" type="application/x-shockwave-flash" '
              +     'width="100%" height="32" allowscriptaccess="always">'
              +     '<param name="wmode" value="transparent" />'
              +     '<param value="always" name="allowscriptaccess" />'
              +     '<param value="all" name="allowNetworkin" />'
              +     '<param name="FlashVars" value="buttonclick=1" />'
              + '</object>');

            $('.copy-to-clipboard').rebind('mouseover.copyToClipboard', function() {
                var e = $('#clipboardswf1')[0];
                if (e && e.setclipboardtext) {
                    e.setclipboardtext(getClipboardLinks());
                }
            });
            $('.copy-to-clipboard').rebind('mousedown.copyToClipboard', function() {
                showToast('clipboard', toastTxt);
            });
        }
        else {
            var uad = browserdetails(ua);

            if (uad.icon === 'ie.png' && window.clipboardData) {
                $('.copy-to-clipboard').rebind('click', function() {
                    links = $.trim(getClipboardLinks());
                    var mode = links.indexOf("\n") !== -1 ? 'Text' : 'URL';
                    window.clipboardData.setData(mode, links);
                    showToast('clipboard', toastTxt);
                });
            }
            else {
                if (window.ClipboardEvent) {
                    $('.copy-to-clipboard').rebind('click', function() {
                        var doLinks = ($(this).attr('id') === 'clipboardbtn1');
                        links = $.trim(doLinks ? getClipboardLinks() : getclipboardkeys());

                        window.onCopyEventHandler = function onCopyEvent(ev) {
                            if (d) {
                                console.log('onCopyEvent', arguments);
                            }
                            ev.clipboardData.setData('text/plain', links);
                            if (doLinks) {
                                ev.clipboardData.setData('text/html', links.split("\n").map(function(link) {
                                    return '<a href="' + link + '"></a>';
                                }).join("<br/>\n"));
                            }
                            ev.preventDefault();
                            showToast('clipboard', toastTxt); // Done
                        };
                        document.addEventListener('copy', window.onCopyEventHandler, false);
                        Soon(function() {
                            $span.text(l[7663] + ' ' + (uad.os === 'Apple' ? 'command' : 'ctrl') + ' + C');
                        });
                    });
                }
                else {
                    // Hide the clipboard buttons if not using the extension and Flash is disabled
                    $('.copy-to-clipboard').addClass('hidden');
                }
            }
        }

        // Click anywhere on export link dialog will hide export link dropdown
        $('.export-links-dialog').rebind('click', function() {
            $('.export-link-dropdown').fadeOut(200);
        });

        $('.export-links-dialog .fm-dialog-close').rebind('click', function() {
            self.linksDialog(1);
        });

        $('.export-links-warning-close').rebind('click', function() {
            $('.export-links-warning').addClass('hidden');
        });

        $('.export-link-select').rebind('click', function() {
            $('.export-link-dropdown').fadeIn(200);

            // Stop propagation
            return false;
        });

        // On Export File Links and Decryption Keys
        var $linkButtons = $('.link-handle, .link-decryption-key, .link-handle-and-key');
        var $linkHandle = $('.link-handle');

        // Reset state from previous dialog opens and pre-select the 'Link without key' option by default
        $linkButtons.removeClass('selected');
        $linkHandle.addClass('selected');

        // Add click handler
        $linkButtons.rebind('click', function() {

            var keyOption = $(this).attr('data-keyoptions');
            var $this = $(this);

            // Add selected state to button
            $linkButtons.removeClass('selected');
            $this.addClass('selected');

            // Show the relevant 'Link without key', 'Decryption key' or 'Link with key'
            $('.export-content-block').removeClass('public-handle decryption-key full-link').addClass(keyOption);
            $span.text(l[1990]);
            
            // If decryption key, grey out option to set expiry date because it doesn't make sense
            if (keyOption === 'decryption-key') {
                $('.export-links-dialog .disabled-overlay').removeClass('hidden');
            }
            else {
                // Otherwise enable the expiry option
                $('.export-links-dialog .disabled-overlay').addClass('hidden');
            }

            // Stop propagation
            return false;
        });

        // Initialise the Export Link expiry feature
        getLinkExpiry.init();
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.Dialog = scope.mega.Dialog || {};
    scope.mega.Dialog.ExportLink = ExportLinkDialog;

})(jQuery, window);


(function($, scope) {
    /**
     * ExportLink related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var ExportLink = function(opts) {

        var self = this;

        var defaultOptions = {
            'updateUI': false,
            'nodesToProcess': [],
            'showExportLinkDialog': false
        };

        self.options = $.extend(true, {}, defaultOptions, opts);

        // Number of nodes left to process
        self.nodesLeft = self.options.nodesToProcess.length;
        self.logger = MegaLogger.getLogger('ExportLink');
    };

    /**
     * Get public link for file or folder.
     */
    ExportLink.prototype.getExportLink = function() {

        var self = this;

        // Prompt copyright dialog and if accepted get link, otherwise stall
        if (self.options.nodesToProcess.length) {
            loadingDialog.show();
            self.logger.debug('getExportLink');

            $.each(self.options.nodesToProcess, function(index, nodeId) {
                if (M.d[nodeId] && M.d[nodeId].t === 1) {// Folder
                    self._getFolderExportLinkRequest(nodeId);
                }
                else if (M.d[nodeId] && M.d[nodeId].t === 0) {// File
                    self._getExportLinkRequest(nodeId);
                }
            });
        }
    };

    /**
     * Removes public link for file or folder.
     */
    ExportLink.prototype.removeExportLink = function() {

        var self = this;

        if (self.options.nodesToProcess.length) {
            loadingDialog.show();
            self.logger.debug('removeExportLink');

            $.each(self.options.nodesToProcess, function(index, nodeId) {
                if (M.d[nodeId] && M.d[nodeId].t === 1) {// Folder
                    self._removeFolderExportLinkRequest(nodeId);
                }
                else if (M.d[nodeId] && M.d[nodeId].t === 0) {// File
                    self._removeFileExportLinkRequest(nodeId);
                }
            });
        }
    };

    /**
     * A 'Private' function, send folder public link delete request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getFolderExportLinkRequest = function(nodeId) {

        var self = this;

        var childNodes = [];

        // Get all child nodes of root folder with nodeId
        childNodes = fm_getnodes(nodeId);
        childNodes.push(nodeId);

        var sharePromise = api_setshare(nodeId, [{ u: 'EXP', r: 0 }], childNodes);
        sharePromise.done(function _sharePromiseDone(result) {
            if (result.r && result.r[0] === 0) {
                M.nodeShare(nodeId, { h: nodeId, r: 0, u: 'EXP', ts: unixtime() });
                self._getExportLinkRequest(nodeId);
                if (!self.nodesLeft) {
                    loadingDialog.hide();
                }
            }
            else {
                self.logger.warn('_getFolderExportLinkRequest', nodeId, 'Error code: ', result);
                loadingDialog.hide();
            }
        });
        sharePromise.fail(function _sharePromiseFailed(result) {
            self.logger.warn('Get folder link failed: ' + result);
        });
    };

    /**
     * A 'Private' function, send public link delete request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._getExportLinkRequest = function(nodeId) {

        var self = this;
        var request = { a: 'l', n: nodeId, i: requesti };

        // If the Expiry Timestamp (ets) is already set locally, resend in the request or it gets removed
        if (M.d[nodeId] && (typeof M.d[nodeId].ets !== 'undefined')) {
            request.ets = M.d[nodeId].ets;
        }

        api_req(request, {
            nodeId: nodeId,
            callback: function(result) {

                self.nodesLeft--;
                if (typeof result !== 'number') {
                    M.nodeShare(this.nodeId, { h: this.nodeId, r: 0, u: 'EXP', ts: unixtime() });
                    M.nodeAttr({ h: this.nodeId, ph: result });

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.addExportLinkIcon(this.nodeId);
                    }
                    if (!self.nodesLeft) {
                        loadingDialog.hide();
                        if (self.options.showExportLinkDialog) {
                            var exportLinkDialog = new mega.Dialog.ExportLink();
                            exportLinkDialog.linksDialog();
                        }
                    }
                }
                else { // Error
                    self.logger.warn('_getExportLinkRequest:', this.nodeId, 'Error code: ', result);
                    loadingDialog.hide();
                }
            }
        });
    };

    /**
     * A 'Private' function, send folder delete public link request.
     * @param {String} nodeId The node ID.
     */
    ExportLink.prototype._removeFolderExportLinkRequest = function(nodeId) {

        var self = this;

        api_req({ a: 's2', n:  nodeId, s: [{ u: 'EXP', r: ''}], ha: '', i: requesti }, {
            nodeId: nodeId,
            callback: function(result) {
                self.nodesLeft--;
                if (result.r && (result.r[0] === 0)) {
                    M.delNodeShare(this.nodeId, 'EXP');
                    M.deleteExportLinkShare(this.nodeId);

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }
                    if (!self.nodesLeft) {
                        loadingDialog.hide();
                    }
                }
                else {
                    // Error
                    self.logger.warn('_removeFolerExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    loadingDialog.hide();
                }
            }
        });
    };

    /**
     * A 'Private' function, send file delete public link request.
     * @param {String} nodeId The node IDs.
     */
    ExportLink.prototype._removeFileExportLinkRequest = function(nodeId) {

        var self = this;

        api_req({ a: 'l', n: nodeId, d: 1, i:requesti }, {
            nodeId: nodeId,
            callback: function(result) {
                self.nodesLeft--;
                if (result === 0) {
                    M.delNodeShare(this.nodeId, 'EXP');
                    M.deleteExportLinkShare(this.nodeId);

                    if (self.options.updateUI) {
                        var UiExportLink = new mega.UI.Share.ExportLink();
                        UiExportLink.removeExportLinkIcon(this.nodeId);
                    }
                    if (!self.nodesLeft) {
                        loadingDialog.hide();
                    }
                }
                else {
                    // Error
                    self.logger.warn('_removeFileExportLinkRequest failed for node:', this.nodeId, 'Error: ', result);
                    loadingDialog.hide();
                }
            }
        });
    };

    /**
     * Returns true in case that any of checked items is taken down, otherwise false
     * @param {Array} nodesId Array of strings nodes ids
     * @returns {Boolean}
     */
    ExportLink.prototype.isTakenDown = function(nodesId) {

        var self = this;
        var result = false;
        var nodes = nodesId;

        if (nodesId) {
            if (!Array.isArray(nodesId)) {
                nodes = [nodesId];
            }
        }
        else {
            nodes = self.options.nodesToProcess;
        }

        $.each(nodes, function(index, value) {
            if (M.d[value] && M.d[value].shares && M.d[value].shares.EXP && (M.d[value].shares.EXP.down === 1)) {
                result = true;
                return false;// Break the loop
            }
        });

        return result;
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.Share = scope.mega.Share || {};
    scope.mega.Share.ExportLink = ExportLink;
})(jQuery, window);


(function($, scope) {
    /**
     * UI Public Link Icon related operations.
     *
     * @param opts {Object}
     *
     * @constructor
     */
    var UiExportLink = function(opts) {

        this.logger = MegaLogger.getLogger('UiExportLink');
    };

    /**
     * addExportLinkIcon
     *
     * Add public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addExportLinkIcon = function(nodeId) {

        var self = this;
        var $nodeId = $('#' + nodeId);
        var $tree = $('#treea_' + nodeId);

        if (!$nodeId.length && !$tree.length) {
            self.logger.warn('No DOM Node matching "%s"', nodeId);

            return false;
        }

        self.logger.debug('addExportLinkIcon', nodeId);

        if ($nodeId.length) {

            // Add link-icon to list view
            $('.own-data', $nodeId).addClass('linked');

            // Add link-icon to grid view
            if ($nodeId.hasClass('file-block')) {
                $nodeId.addClass('linked');
            }
        }

        if ($tree.length) {

            // Add link-icon to left panel
            $tree.addClass('linked');
        }
    };

    /**
     * Remove public link icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeExportLinkIcon = function(nodeId) {

        // Remove link icon from list view
        $('#' + nodeId + ' .own-data').removeClass('linked');

        // Remove link icon from grid view
        $('#' + nodeId + '.file-block').removeClass('linked');

        // Remove link icon from left panel
        $('#treeli_' + nodeId + ' span').removeClass('linked');
    };

    /**
     * Updates grid and block (file) view, removes favorite icon if exists and adds .taken-down class.
     * @param {String} nodeId
     * @param {Boolean} isTakenDown
     */
    UiExportLink.prototype.updateTakenDownItem = function(nodeId, isTakenDown) {

        var self = this;

        if (isTakenDown) {
            if (M.d[nodeId].fav === 1) {

                // Remove favourite (star)
                M.favourite(nodeId, true);
            }
            self.addTakenDownIcon(nodeId);
        }
        else {
            self.removeTakenDownIcon(nodeId);
        }
    };

    /**
     * Add taken-down icon to file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.addTakenDownIcon = function(nodeId) {

        var titleTooltip = '';

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).addClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.file-block').addClass('taken-down');

        // Add taken-down to left panel
        $('#treea_' + nodeId).addClass('taken-down');

        // Add title, mouse popup
        if (M.d[nodeId].t === 1) {// Item is folder

            titleTooltip = l[7705];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8595];
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.file-block').attr('title', titleTooltip);
        }
        else {// Item is file

            titleTooltip = l[7704];

            // Undecryptable node indicators
            if (missingkeys[nodeId]) {
                titleTooltip += '\n' + l[8602];
            }

            $('.grid-table.fm #' + nodeId).attr('title', titleTooltip);
            $('#' + nodeId + '.file-block').attr('title', titleTooltip);
        }
    };

    /**
     * Remove taken-down icon from file or folder
     * @param {String} nodeId
     */
    UiExportLink.prototype.removeTakenDownIcon = function(nodeId) {

        // Add taken-down to list view
        $('.grid-table.fm #' + nodeId).removeClass('taken-down');

        // Add taken-down to block view
        $('#' + nodeId + '.file-block').removeClass('taken-down');

        // Add taken-down to left panel
        $('#treea_' + nodeId).removeClass('taken-down');

        // Remove title, mouse popup
        $('.grid-table.fm #' + nodeId).attr('title', '');
        $('#' + nodeId + '.file-block').attr('title', '');
    };

    // export
    scope.mega = scope.mega || {};
    scope.mega.UI = scope.mega.UI || {};
    scope.mega.UI.Share = scope.mega.UI.Share || {};
    scope.mega.UI.Share.ExportLink = UiExportLink;
})(jQuery, window);
