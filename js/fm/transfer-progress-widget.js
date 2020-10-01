/** This class will function as a UI controller.
 */
mega.tpw = new function TransferProgressWidget() {
    var downloadRowPrefix = 'tpw_dl_';
    var uploadRowPrefix = 'tpw_ul_';
    var totalUploads = 0;
    var totalDownloads = 0;
    var frozenTimeout = 6e4; // 60 sec
    var completedTimeToStay = 3e5; // 5 min
    var FailedTimeToStay = 9e5; // 15 min
    var lastPokeTime = -1;
    var inactivityTimespanForClearance = 9e5; // 15 min
    var maximumLength = 200; // maximum rows to draw in normal mode
    var maximumLengthProgress = 300; // maximum rows to draw in urgent mode

    var $widget;
    var $widgetWarnings;
    var $rowsHeader;
    var $widgetHeadAndBody;
    var $rowsContainer;
    var $bodyContianer;
    var $rowTemplate;
    var $downloadRowTemplate;
    var $uploadRowTemplate;
    var $transferActionTemplate;
    var $overQuotaBanner;
    var rowProgressWidth = 0;

    this.INITIALIZING = 0;
    this.DOWNLOADING = 1;
    this.UPLOADING = 2;
    this.FINISHING = 3;
    this.DONE = 4;
    this.FAILED = 5;
    this.FROZEN = 6;
    this.PAUSED = 7;

    this.DOWNLOAD = 1;
    this.UPLOAD = 2;

    this.initialized = false;

    var mySelf = this;
    var isHiddenByUser = false;
    var isMinimizedByUser = false;

    var monitors = Object.create(null);

    /**
     * setting the status of the row
     * @param {Object} row          JQuery object contains the row
     * @param {Number} status       represents the status id
     * @param {Object} extraOption
     */
    var setStatus = function(row, status, extraOption) {
        'use strict';
        if (row && row.length && typeof status !== 'undefined') {
            var stText = '';
            switch (status) {
                case mySelf.DONE:
                    stText = l['1418'];
                    break;
                case mySelf.FAILED:
                    stText = extraOption || l['19861'];
                    break;
                case mySelf.FROZEN:
                    stText = 'Frozen';
                    break;
                case mySelf.PAUSED:
                    stText = l[1651];
                    break;
            }

            row.find('.transfer-task-status').text(stText);
        }
        else {
            return;
        }
    };

    var updateJSP = function() {
        if (!$bodyContianer.data('jsp')) {
            $bodyContianer.jScrollPane({
                enableKeyboardNavigation: true, showArrows: true,
                arrowSize: 8, animateScroll: true
            });
        }
        else {
            $bodyContianer.data('jsp').reinitialise();
        }
    };

    var removeRow = function($row) {

        if (!$row || !$row.length) {
            return;
        }

        var timer = $row.data('timer');
        if (timer) {
            clearTimeout(timer);
        }

        var dId = $row.attr('id');
        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }

        $row.remove();
        updateJSP();
        updateHeaderAndContent();
    };


    var initEventsHandlers = function() {
        // minimize event handler
        $('.transfer-progress-icon.tpw-c-e', $rowsHeader).off('click').on('click',
            function tpw_collapseExpandHandler() {

                if ($widgetHeadAndBody.hasClass('expand')) {
                    isMinimizedByUser = true;
                    $bodyContianer.slideUp(400, function() {
                        $widgetHeadAndBody.removeClass('expand').addClass('collapse');
                    });
                }
                else {
                    isMinimizedByUser = false;
                    $widgetHeadAndBody.removeClass('collapse').addClass('expand');
                    $bodyContianer.slideDown(400, function() {
                        updateJSP();
                    });
                }
                return false;
            });

        // close event handler
        $('.transfer-progress-icon.tpw-close', $rowsHeader).off('click').on('click',
            function tpw_CloseHandler() {
                $widget.slideUp();
                isHiddenByUser = true;
                mega.tpw.hideWidget();
            });


        // close over quota
        $('.close-over', $overQuotaBanner).off('click').on('click',
            function overquota_bannerClose() {
                $overQuotaBanner.addClass('hidden');
            });

        // upgrade account
        $('.up-action', $overQuotaBanner).off('click').on('click',
            function overquota_bannerUpgrade() {
                $('.transfer-progress-icon.tpw-close', $rowsHeader).click();
                isHiddenByUser = true;
                loadSubPage('pro');
            });

        // open dashboard
        $('.left-section.circle-dashboard', $overQuotaBanner).off('click').on('click',
            function overquota_bannerUpgrade() {
                loadSubPage('dashboard');
            });

        // open section
        $('.transfer-section-button', $widgetHeadAndBody).off('click').on('click',
            function section_open() {
                viewTransferSection($(this).hasClass('complete-list'));
            });
    };


    var viewOverQuotaBanner = function(type) {
        if (!type || !u_type) {
            return;
        }

        if (!$overQuotaBanner.hasClass('hidden')) {
            return;
        }

        $overQuotaBanner.removeClass('almost-overquota').addClass('overquota');

        M.accountData(function(acc) {
            if (type === mega.tpw.DOWNLOAD) {

                $overQuotaBanner.find('.head-title').text(l[20666]);
                $overQuotaBanner.find('.content-txt').text(l[18085]);

                $overQuotaBanner.find('.quota-info-pct-txt').text('100%');
                $overQuotaBanner.find('.quota-info-pr-txt').text(bytesToSize(acc.tfsq.used) + ' ' + l[5775]);
                $overQuotaBanner.find('.action').removeClass('default-orange-button').addClass('default-red-button');
                
                $overQuotaBanner.find('.quota-info-pct-circle li.left-c p').rotate(180, 0);
            }
            else {
                $overQuotaBanner.find('.head-title').text(l[5932]);
                $overQuotaBanner.find('.content-txt').safeHTML(l[7014].replace('[A]', '<b>').replace('[/A]', '</b> '));

                var perc = Math.round(acc.space_used * 100 / acc.space);
                $overQuotaBanner.find('.quota-info-pct-txt').text(perc + '%');

                var spaceInfo = bytesToSize(acc.space_used) + '/' + bytesToSize(acc.space, 0);
                if (spaceInfo.length >= 15) {
                    $('.quota-info-pr-txt', $overQuotaBanner).addClass('small-font');
                }
                $('.quota-info-pr-txt', $overQuotaBanner).text(spaceInfo);

                $overQuotaBanner.find('.action').removeClass('default-red-button').addClass('default-orange-button');

                var rotateAngle = 18 * perc / 10 >= 180 ? 180 : 18 * perc / 10;
                $('.quota-info-pct-circle li.left-c p', $overQuotaBanner).rotate(rotateAngle);
            }

            $overQuotaBanner.removeClass('hidden');

        });
    };

    /**
     * Clear the warnings shown on TPW header
     * @param {Number} type     flag to distinguish upload/download
     */
    this.resetErrorsAndQuotasUI = function(type) {
        if (!type) {
            return;
        }

        $overQuotaBanner.addClass('hidden');

        var $sectionType = 'download';

        if (type === this.UPLOAD) {
            $sectionType = 'upload';
        }

        $rowsHeader.find('.transfer-progress-type.' + $sectionType).removeClass('error overquota');
    };


    var actionsOnRowEventHandler = function() {
        var $me = $(this);
        if ($me.hasClass('disabled') || !$me.is(':visible')) {
            return;
        }

        var $transferRow = $me.closest('.transfer-task-row');
        var trId = $transferRow.attr('id');
        var id = trId.split('_').pop();
        var node = null;

        if ($me.hasClass('cancel')) {
            if ($transferRow.hasClass('download')) {
                if (!$transferRow.attr('zippo')) {
                    id = 'dl_' + id;
                }
                else {
                    id = 'zip_' + id;
                }
                dlmanager.abort(id);
            }
            else {
                id = 'ul_' + id;
                ulmanager.abort(id);
            }
            $('.transfer-table tr#' + id).remove();
            if ($.clearTransferPanel) {
                $.clearTransferPanel();
            }

            $transferRow.fadeOut(400, function() {
                removeRow($transferRow);
            });
        }
        else if ($me.hasClass('link')) {
            var nodeHandle = $transferRow.attr('nhandle');
            node = M.d[nodeHandle || id];
            if (!node) {
                return;
            }
            $.selected = [nodeHandle || id];
            $('.dropdown.body.context .dropdown-item.getlink-item').click();
        }
        else if ($me.hasClass('cloud-folder')) {
            var nHandle = $transferRow.attr('nhandle');
            node = M.d[nHandle || id];
            if (!node) {
                return;
            }

            if (node.p) {
                M.openFolder(node.p);
            }
        }
        else if ($me.hasClass('pause') || $me.hasClass('restart')) {
            if ($transferRow.hasClass('download')) {
                if ($transferRow.attr('zippo')) {
                    id = 'zip_' + id;
                }
                else {
                    id = 'dl_' + id;
                }
            }
            else {
                id = 'ul_' + id;
            }
            if ($me.hasClass('pause')) {
                fm_tfspause(id);
            }
            else {
                $transferRow.removeAttr('prepared');
                fm_tfsresume(id);
            }

        }

        return false;
    };


    var clearAndReturnWidget = function() {
        var $currWidget = $('.transfer-prorgess.tpw');
        if (!$currWidget || !$currWidget.length) {
            return null;
        }
        if ($currWidget.length === 2) {
            if ($('#startholder').is(':visible')) {
                $($currWidget[1]).remove();
                return $($currWidget[0]);
            }
            else {
                $($currWidget[0]).remove();
                return $($currWidget[1]);
            }
        }
        else {
            return $currWidget;
        }
    };

    /** Initialize the properties and class members */
    var init = function() {
        'use strict';
        // return;
        if (mega.tpw.initialized) {
            return;
        }
        $widget = clearAndReturnWidget();
        if (!$widget || !$widget.length) {
            return;
        }
        
        $widgetWarnings = $('.banner.transfer', $widget);
        $rowsHeader = $('.transfer-progress-head', $widget);
        $widgetHeadAndBody = $('.transfer-progress-widget', $widget);
        $bodyContianer = $('.widget-body-container', $widget);
        $rowsContainer = $('.transfer-progress-widget-body', $bodyContianer);
        $overQuotaBanner = $('.banner.transfer', $widget);
        $rowTemplate = $($('.transfer-task-row', $rowsContainer)[0]).clone();
        rowProgressWidth = $($rowsContainer[0]).find('.transfer-progress-bar').width();
        $downloadRowTemplate = $rowTemplate.clone().removeClass('upload').addClass('download');
        $uploadRowTemplate = $rowTemplate.clone().removeClass('download').addClass('upload');

        $transferActionTemplate = $($downloadRowTemplate.find('i.transfer-progress-icon')[0]).clone();
        $transferActionTemplate.removeClass('pause cancel link cloud-folder restart');
        $transferActionTemplate.off('click').on('click',
            actionsOnRowEventHandler);

        $rowsContainer.empty();

        // events handlers
        initEventsHandlers();

        mega.tpw.initialized = true;
    };


    mBroadcaster.once('startMega:desktop', function() {
        'use strict';
        init();
    });


    var viewPreparation = function() {
        'use strict';
        init();
        if (!initUI()) {
            return;
        }

        // pages to hide always
        if (page.indexOf('transfers') !== -1 || page.indexOf('register') !== -1 || page.indexOf('download') !== -1) {
            mega.tpw.hideWidget();
            return;
        }

        if (!isHiddenByUser) {

            if (page.indexOf('chat') === -1) {
                mega.tpw.showWidget();
            }

            if ($widgetHeadAndBody.hasClass('expand')) {
                if (page.indexOf('chat') !== -1) {
                    $('.transfer-progress-icon.tpw-c-e.collapse', $rowsHeader).click();
                    isMinimizedByUser = false;
                }
            }
            else {
                if (page.indexOf('chat') === -1 && !isMinimizedByUser) {
                    $('.transfer-progress-icon.tpw-c-e.expand', $rowsHeader).click();
                }
            }

        }
    };

    mBroadcaster.addListener('pagechange', viewPreparation);
    mBroadcaster.addListener('fm:initialized', viewPreparation);


    /**
     * update a row when no update has arrived on it for a while
     * @param {Number} id       row id
     * @param {Boolean} u       isUpload
     */
    var updateToFrozen = function(id, isUpload) {
        if (!id) {
            return;
        }
        if (Array.isArray(id)) {
            if (!id.length) {
                return;
            }
            id = id[0];
        }
        var $targetedRow = $rowsContainer.find('#' + ((!isUpload) ? downloadRowPrefix : uploadRowPrefix) + id);
        if (!$targetedRow || !$targetedRow.length) {
            return;
        }
        if (!$targetedRow.hasClass('progress')) {
            return;
        }
        $targetedRow.removeClass('complete error progress paused').addClass('inqueue');
        setStatus($targetedRow, this.FROZEN);
    };

    var getDownloadsRows = function() {
        var downloads = $rowsContainer.find("[id^='" + downloadRowPrefix + "']");
        return downloads;
    };

    var getUploadsRows = function() {
        var uploads = $rowsContainer.find("[id^='" + uploadRowPrefix + "']");
        return uploads;
    };

    var getTotalDownloads = function() {
        return getDownloadsRows().length;
    };

    var getTotalUploads = function() {
        return getUploadsRows().length;
    };

    var getTotalAndDoneDownloads = function() {
        var downloadsR = getDownloadsRows();
        var doneD = downloadsR.filter('.complete').length;
        return { done: doneD, total: downloadsR.length };
    };

    var getTotalAndDoneUploads = function() {
        var uploadsR = getUploadsRows();
        var doneU = uploadsR.filter('.complete').length;
        return { done: doneU, total: uploadsR.length };
    };


    /**
     * Draws the progress circle in the header of the widget reflecting the done elements
     * @param {Object} $headerSection       jQuery object containing the download/upload section in header
     * @param {Number} total                Total elements
     * @param {Number} done                 Done elements
     */
    var setProgressCircle = function($headerSection, total, done) {
        var perc = done / total;

        perc = isNaN(perc) ? 0 : Math.round(perc * 100);

        $headerSection.find('.transfer-progress-pct').text(perc + '%');
    };


    var cleanOverLimitRows = function() {
        var $allRows = $rowsContainer.find('.transfer-task-row');
        var rowsCount = $allRows.length;

        if (rowsCount <= maximumLength) {
            return;
        }
        else {
            mega.tpw.clearRows(mega.tpw.DONE);
        }
    };


    var updateHeaderAndContent = function() {
        var totalD = 0;
        var totalU = 0;
        var doneD = 0;
        var doneU = 0;
        var remainD = 0;
        var remainU = 0;

        var dRows = getDownloadsRows();
        var uRows = getUploadsRows();

        totalD = dRows.length;
        totalU = uRows.length;
        if (!totalD && !totalU) {
            mega.tpw.hideWidget();
            return;
        }

        doneD = dRows.filter('.complete').length;
        doneU = uRows.filter('.complete').length;

        var $downloadHeader = $rowsHeader.find('.transfer-progress-type.download');
        var $uploadHeader = $rowsHeader.find('.transfer-progress-type.upload');

        var stats;

        if (!totalD) {
            $downloadHeader.addClass('hidden');
        }
        else {
            remainD = totalD - doneD;

            if (remainD) {
                $downloadHeader.find('.transfer-progress-txt').text(l[20808]
                    .replace('{0}', ((remainD > 999) ? '999+' : remainD)));

                stats = getTransfersPercent();
                setProgressCircle($downloadHeader, stats.dl_total, stats.dl_done);
            }
            else {
                var initialDownloadHeadText = $downloadHeader.find('.transfer-progress-txt').text();
                $downloadHeader.find('.transfer-progress-txt').text(l[1418]);

                if (initialDownloadHeadText !== l[1418] && page.indexOf('chat') !== -1) {
                    if ($uploadHeader.hasClass('hidden') ||
                        $uploadHeader.find('.transfer-progress-txt').text() === l[1418]) {
                        // widget minimizing code, kept for comparing
                        // if ($widgetHeadAndBody.hasClass('expand')) {
                        //    $('.transfer-progress-icon.tpw-c-e.collapse', $rowsHeader).click();
                        //    isMinimizedByUser = false;
                        // }

                        if ($widgetHeadAndBody.is(':visible')) {
                            $('.transfer-progress-icon.tpw-close', $rowsHeader).click();
                            isHiddenByUser = true;
                        }
                    }
                }
                setProgressCircle($downloadHeader, totalD, doneD);
            }

            $downloadHeader.removeClass('hidden');
            if (!dRows.filter('.error').length) {
                $downloadHeader.removeClass('error overquota');
            }

        }

        if (!totalU) {
            $uploadHeader.addClass('hidden');
        }
        else {
            remainU = totalU - doneU;

            if (remainU) {
                $uploadHeader.find('.transfer-progress-txt').text(l[20808]
                    .replace('{0}', ((remainU > 999) ? '999+' : remainU)));
                !stats && (stats = getTransfersPercent());

                setProgressCircle($uploadHeader, stats.ul_total, stats.ul_done);
            }
            else {
                var initialUploadHeadText = $uploadHeader.find('.transfer-progress-txt').text();
                $uploadHeader.find('.transfer-progress-txt').text(l[1418]);

                if (initialUploadHeadText !== l[1418] && page.indexOf('chat') !== -1) {
                    if ($downloadHeader.hasClass('hidden') ||
                        $downloadHeader.find('.transfer-progress-txt').text() === l[1418]) {
                        // widget minimizing code, kept for comparing
                        // if ($widgetHeadAndBody.hasClass('expand')) {
                        //    $('.transfer-progress-icon.tpw-c-e.collapse', $rowsHeader).click();
                        //    isMinimizedByUser = false;
                        // }

                        if ($widgetHeadAndBody.is(':visible')) {
                            $('.transfer-progress-icon.tpw-close', $rowsHeader).click();
                            isHiddenByUser = true;
                        }
                    }
                }
                setProgressCircle($uploadHeader, totalU, doneU);
            }

            $uploadHeader.removeClass('hidden');
            if (!uRows.filter('.error').length) {
                $uploadHeader.removeClass('error overquota');
            }
        }

    };

    var initUI = function() {
        var $currWidget = clearAndReturnWidget();

        if (!$currWidget) {
            return false;
        }

        var rows = $currWidget.find('.transfer-task-row');
        if (rows.length) {
            if (!$(rows[0]).attr('id')) {
                if ($widget.find('.jspContainer, .jspPane').length) {
                    $widget.find('.transfer-progress-widget-body').unwrap().unwrap();
                    $widget.find('.jspVerticalBar').remove();
                    $widget.find('.widget-body-container').attr('style', '');
                }

                $currWidget.replaceWith($widget);

                initEventsHandlers();
                $rowsContainer.find('i.transfer-progress-icon').off('click').on('click',
                    actionsOnRowEventHandler);
            }
            // init sections
            viewTransferSection();
        }
        return true;
    };

    /**
     * Show a tab in Transfer progress widget
     * @param {Number} section  1 = completed, 0 = on progress
     */
    var viewTransferSection = function(section) {
        'use strict';
        var $rows = $rowsContainer.find('.transfer-task-row');

        // for enhanced performance, instead of using ".find" or ".filter" 2 times
        // I will apply the calls on 1 go O(n).

        var completedFound = false;
        var progressFound = false;

        for (var r = 0; r < $rows.length; r++) {
            var $currRow = $($rows[r]);
            if ($currRow.hasClass('complete')) {
                if (section) {
                    $currRow.removeClass('hidden');
                }
                else {
                    $currRow.addClass('hidden');
                }
                completedFound = true;
            } else {
                if (section) {
                    $currRow.addClass('hidden');
                }
                else {
                    $currRow.removeClass('hidden');
                }
                progressFound = true;
            }
        }
        if (completedFound && progressFound) {
            if (section) {
                $widgetHeadAndBody.find('.complete-list').addClass('hidden');
                $widgetHeadAndBody.find('.process-list').removeClass('hidden');
            }
            else {
                $widgetHeadAndBody.find('.process-list').addClass('hidden');
                $widgetHeadAndBody.find('.complete-list').removeClass('hidden');
            }
        }
        else {
            $rows.removeClass('hidden');
            $widgetHeadAndBody.find('.process-list').addClass('hidden');
            $widgetHeadAndBody.find('.complete-list').addClass('hidden');
        }
        updateJSP();
    };

    var postPorcessComplete = function() {
        var $allRows = $rowsContainer.find('.transfer-task-row');
        var $completedRows = $allRows.filter('.complete');
        if ($completedRows.length === $allRows.length) {
            $allRows.removeClass('hidden');
            $widgetHeadAndBody.find('.process-list').addClass('hidden');
            $widgetHeadAndBody.find('.complete-list').addClass('hidden');
        }
        else {
            // some optimization
            var $tabCompleted = $widgetHeadAndBody.find('.complete-list');
            var $tabProgress = $widgetHeadAndBody.find('.process-list');

            if ($tabCompleted.hasClass('hidden') && $tabProgress.hasClass('hidden')) {
                $tabCompleted.removeClass('hidden');
            }
        }
        updateJSP();
    };

    /**
     * Adding a download/upload entry to transfer progress widget
     * @param {Number} type             Entry type: 1 download, 2 upload
     * @param {Object} entry            Download|Upload entry object built at transfer
     * @param {Number} specifiedSize    to tell the size of download entry
     */
    this.addDownloadUpload = function(type, entry, specifiedSize) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        var entriesArray;
        if (Array.isArray(entry)) {
            entriesArray = entry;
        }
        else {
            entriesArray = [entry];
        }

        var $tempRows = new Array(entriesArray.length);
        var tempRowPos = 0;
        var reverted = false;

        if (type === this.UPLOAD) {
            tempRowPos = entriesArray.length - 1;
            reverted = true;
        }

        var addAsHidden = $widgetHeadAndBody.find('.complete-list').hasClass('hidden');

        if (addAsHidden && $widgetHeadAndBody.find('.process-list').hasClass('hidden')) {
            // all done or all not done
            addAsHidden = false;
            if ($('.transfer-task-row.complete', $rowsContainer).length) {
                $('.complete-list', $widgetHeadAndBody).removeClass('hidden');
                $('.transfer-task-row.complete', $rowsContainer).addClass('hidden');
            }
        }

        for (var r = 0; r < entriesArray.length; r++) {
            var fName;
            var dId = entriesArray[r].id;
            var prefix;
            var toolTipText;

            if (type === this.DOWNLOAD) {
                fName = entriesArray[r].n;
                prefix = downloadRowPrefix;
                toolTipText = l[1196];

                if (entriesArray[r].zipid) {
                    fName = entriesArray[r].zipname;
                    dId = entriesArray[r].zipid;
                }
            }
            else {
                fName = entriesArray[r].name;
                prefix = uploadRowPrefix;
                toolTipText = l[1617];
            }



            lastPokeTime = Date.now();

            var $targetedRow = $rowsContainer.find('#' + prefix + dId);
            var $row = null;


            if ($targetedRow) {
                if ($targetedRow.length === 1) {
                    $row = $targetedRow;
                }
                else {
                    // somehow we found multiple instances
                    $targetedRow.remove();
                }
            }
            if (!$row) {
                $row = (type === this.DOWNLOAD) ? $downloadRowTemplate.clone() : $uploadRowTemplate.clone();

                $row.attr('id', prefix + dId);
            }

            if (monitors[dId]) {
                clearTimeout(monitors[dId]);
            }
            monitors[dId] = setTimeout(updateToFrozen, frozenTimeout, dId);

            $row.find('.transfer-filetype-txt').text(fName);

            var $enqueueAction = $transferActionTemplate.clone().addClass('cancel');
            $enqueueAction.find('.tooltips').text(toolTipText);
            $row.find('.transfer-task-actions').empty().append($enqueueAction);

            if (!specifiedSize) {
                $row.find('.transfer-file-size').text(bytesToSize(entriesArray[r].size));
            }
            else {
                $row.find('.transfer-file-size').text(bytesToSize(specifiedSize));
            }

            $row.find('.transfer-progress-bar .transfer-progress-bar-pct').css('width', 0);

            $row.removeClass('complete error progress paused').addClass('inqueue');
            $row.find('.transfer-filetype-icon').attr('class', 'transfer-filetype-icon')
                .addClass(filetype(fName, true)[0].toLowerCase());

            if (entriesArray[r].zipid) {
                $row.attr('zippo', 'y');
            }

            if (addAsHidden) {
                $row.addClass('hidden');
            }
            else {
                $row.removeClass('hidden');
            }

            setStatus($row, this.INITIALIZING);
            if (!reverted) {
                $tempRows[tempRowPos++] = $row;
            }
            else {
                $tempRows[tempRowPos--] = $row;
            }
        }

        cleanOverLimitRows();

        $rowsContainer.prepend($tempRows);

        updateHeaderAndContent();

        if (!this.isWidgetVisibile() && page.indexOf('download') === -1) {
            mega.tpw.showWidget();
        }

        updateJSP();


        
        $tempRows = null;
    };


    this.updateDownloadUpload = function(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num, startTime) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !id) {
            return;
        }

        var dId = id;

        lastPokeTime = Date.now();

        var pauseText;
        var cancelText;

        var prefix;
        var queue;
        var $header;
        var done_bytes;
        var all_bytes;
        var stats = getTransfersPercent();

        if (type === this.DOWNLOAD) {
            dId = id = id.split('_').pop();
            prefix = downloadRowPrefix;
            queue = dl_queue;
            pauseText = l[16183];
            cancelText = l[1196];

            $header = $rowsHeader.find('.transfer-progress-type.download');

            done_bytes = stats.dl_done;
            all_bytes = stats.dl_total;

            if (queue[queue_num].zipid) {
                dId = queue[queue_num].zipid;
            }
            kbps *= 1024;
        }
        else {
            prefix = uploadRowPrefix;
            queue = ul_queue;
            pauseText = l[16185];
            cancelText = l[1617];
            $header = $rowsHeader.find('.transfer-progress-type.upload');
            done_bytes = stats.ul_done;
            all_bytes = stats.ul_total;
        }

        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            var tempObj = {
                n: queue[queue_num].n,
                name: queue[queue_num].name, // in upload will be null - OK
                id: id,
                zipname: queue[queue_num].zipname, // null if upload - OK
                zipid: queue[queue_num].zipid, // null if upload - OK
                size: queue[queue_num].size
            };

            this.addDownloadUpload(type, tempObj);
            return mySelf.updateDownloadUpload(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num);
        }

        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
        }
        monitors[dId] = setTimeout(updateToFrozen, frozenTimeout, dId);

        var timeSpent = (new Date().getTime() - startTime) / 1000;
        var realSpeed = bytesLoaded / timeSpent; // byte per sec

        var speed = (kbps) ? Math.min(realSpeed, kbps) : realSpeed;

        $targetedRow.removeClass('complete error inqueue paused').addClass('progress');

        if (!$targetedRow.attr('prepared')) {
            var $actionsRow = $targetedRow.find('.transfer-task-actions').empty();
            var $progressAction = $transferActionTemplate.clone(true).addClass('pause');
            $progressAction.find('.tooltips').text(pauseText);
            $actionsRow.append($progressAction);
            $progressAction = $transferActionTemplate.clone(true).addClass('cancel');
            $progressAction.find('.tooltips').text(cancelText);
            $actionsRow.append($progressAction);
            $targetedRow.attr('prepared', 'yes');
        }

        var prog = perc * rowProgressWidth / 100;
        $targetedRow.find('.transfer-progress-bar-pct').width(prog);
        $('.transfer-task-status', $targetedRow).text(bytesToSpeed(speed));

        setProgressCircle($header, all_bytes, done_bytes);
    };




    this.finishDownloadUpload = function(type, entry, handle) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        lastPokeTime = Date.now();

        var dId = entry.id;
        var prefix;

        var unHide = $widgetHeadAndBody.find('.complete-list').hasClass('hidden') &&
            !$widgetHeadAndBody.find('.process-list').hasClass('hidden');

        if (type === this.DOWNLOAD) {
            if (entry.zipid) {
                dId = entry.zipid;
            }
            prefix = downloadRowPrefix;
        }
        else {
            prefix = uploadRowPrefix;
        }

        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            return;
        }

        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }

        $targetedRow.removeClass('progress error inqueue paused').addClass('complete');
        setStatus($targetedRow, this.DONE);

        if (handle) {
            $targetedRow.attr('nhandle', handle);
        }

        var $actionsRow = $targetedRow.find('.transfer-task-actions').empty();
        
        var $finishedAction = $transferActionTemplate.clone(true).addClass('link');
        if (!$targetedRow.attr('zippo')) {
            var $finishedActionsRow = $actionsRow.clone();
            $targetedRow.find('.transfer-complete-actions').remove();
            $finishedActionsRow.removeClass('transfer-task-actions').addClass('transfer-complete-actions');
            if (M.getNodeRoot(handle || dId) !== 'shares') {
                $finishedAction.find('.tooltips').text(l[59]);
                $finishedActionsRow.append($finishedAction);
            }
            $finishedAction = $transferActionTemplate.clone(true).addClass('cloud-folder');
            $finishedAction.find('.tooltips').text(l[20695]);
            $finishedActionsRow.append($finishedAction);
            $finishedActionsRow.insertAfter($targetedRow.find('.transfer-file-size'));
        }
        $finishedAction = $transferActionTemplate.clone(true).addClass('cancel');
        $finishedAction.find('.tooltips').text(l[6992]);
        $actionsRow.append($finishedAction);

        updateHeaderAndContent();

        if (unHide) {
            $targetedRow.removeClass('hidden');
        }
        else {
            $targetedRow.addClass('hidden');
        }
        postPorcessComplete();

        var timerHandle = setTimeout(function() {
            $targetedRow.fadeOut(400, function() {
                removeRow($targetedRow);
            });

        }, completedTimeToStay);

        $targetedRow.data('timer', timerHandle);
    };




    this.errorDownloadUpload = function(type, entry, errorStr, isOverQuota) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        lastPokeTime = Date.now();
        var prefix;
        var subHeaderClass;
        var cancelText;
        var dId = entry.id;

        if (type === this.DOWNLOAD) {
            prefix = downloadRowPrefix;
            subHeaderClass = 'download';
            cancelText = l[1196];
            if (entry.zipid) {
                dId = entry.zipid;
            }
        }
        else {
            prefix = uploadRowPrefix;
            subHeaderClass = 'upload';
            cancelText = l[1617];
        }
        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            return;
        }
        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }
        $targetedRow.removeClass('complete progress inqueue paused').addClass('error');
        setStatus($targetedRow, this.FAILED, errorStr);

        var $errorCancelAction = $transferActionTemplate.clone(true).addClass('cancel');
        $errorCancelAction.find('.tooltips').text(cancelText);
        $targetedRow.find('.transfer-task-actions').empty().append($errorCancelAction);

        $targetedRow.removeAttr('prepared');

        $rowsHeader.find('.transfer-progress-type.' + subHeaderClass).addClass('error');

        if (isOverQuota) {
            $rowsHeader.find('.transfer-progress-type.' + subHeaderClass).addClass('overquota');
            viewOverQuotaBanner(type);
        }

        var timerH = setTimeout(function() {
            $targetedRow.fadeOut(400, function() {
                removeRow($targetedRow);
            });

        }, FailedTimeToStay);

        $targetedRow.data('timer', timerH);
    };



    this.resumeDownloadUpload = function(type, entry) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        var dId = entry.id;
        var prefix;
        var toolTipText;

        if (type === this.DOWNLOAD) {
            prefix = downloadRowPrefix;
            toolTipText = l[1196];
            if (entry.zipid) {
                dId = entry.zipid;
            }
        }
        else {
            prefix = uploadRowPrefix;
            toolTipText = l[1617];
        }

        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            return;
        }
        if (!$targetedRow.hasClass('paused')) {
            return;
        }

        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }
        monitors[dId] = setTimeout(updateToFrozen, frozenTimeout, dId);

        var $enqueueAction = $transferActionTemplate.clone().addClass('cancel');
        $enqueueAction.find('.tooltips').text(toolTipText);
        $targetedRow.find('.transfer-task-actions').empty().append($enqueueAction);

        $targetedRow.removeClass('complete error progress paused').addClass('inqueue');

        setStatus($targetedRow, this.INITIALIZING);

        cleanOverLimitRows();

        updateHeaderAndContent();

        if (!this.isWidgetVisibile() && page.indexOf('download') === -1) {
            mega.tpw.showWidget();
        }

        updateJSP();

    };


    this.pauseDownloadUpload = function(type, entry) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        lastPokeTime = Date.now();
        var dId = entry.id;
        var prefix;
        var resumeText;
        var cancelText;

        if (type === this.DOWNLOAD) {
            prefix = downloadRowPrefix;
            if (entry.zipid) {
                dId = entry.zipid;
            }
            resumeText = l[16182];
            cancelText = l[1196];
        }
        else {
            prefix = uploadRowPrefix;
            resumeText = l[16184];
            cancelText = l[1617];
        }

        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            return;
        }
        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }


        $targetedRow.removeClass('error complete progress inqueue').addClass('paused');
        setStatus($targetedRow, this.PAUSED);

        var $actionsRow = $targetedRow.find('.transfer-task-actions').empty();
        var $pausedAction = $transferActionTemplate.clone(true).addClass('restart');
        $pausedAction.find('.tooltips').text(resumeText);
        $actionsRow.append($pausedAction);
        $pausedAction = $transferActionTemplate.clone(true).addClass('cancel');
        $pausedAction.find('.tooltips').text(cancelText);
        $actionsRow.append($pausedAction);
        $targetedRow.removeAttr('prepared');
    };

    /**
     * Removes a rows from widget
     * @param {String} rowId        download/upload ID
     * @param {Boolean} isUpload    {optional} a flag to distinguish transfer Type if rowId doesn't contain dl_/ul_
     */
    this.removeRow = function(rowId, isUpload) {
        'use strict';

        if (!rowId) {
            return;
        }
        if (Array.isArray(rowId)) {
            for (var h = 0; h < rowId.length; h++) {
                mega.tpw.removeRow(rowId[h]);
            }
            return;
        }

        var dId = rowId;
        if (rowId[0] === 'd') {
            isUpload = false;
            dId = rowId.substr(3);
            
        }
        if (rowId[0] === 'z') {
            isUpload = false;
            dId = rowId.substr(4);
        }
        else if (rowId[0] === 'u') {
            isUpload = true;
            dId = rowId.substr(3);
        }

        var prefix = (isUpload) ? uploadRowPrefix : downloadRowPrefix;
        var $targetedRow = $rowsContainer.find('#' + prefix + dId);

        if (!$targetedRow || !$targetedRow.length) {
            return;
        }

        removeRow($targetedRow);
    };


    this.isWidgetVisibile = function() {
        return $widget.is(':visible');
    };

    this.showWidget = function() {
        init();
        initUI();
        if (!$rowsContainer || !$rowsContainer.find('.transfer-task-row').length) {
            return;
        }
        $widget.removeClass('hidden');
        $widget.show();
        updateJSP();
        isHiddenByUser = false;
    };

    this.hideWidget = function() {
        $widget.addClass('hidden');
        $widget.hide();
    };

    this.clearRows = function(type) {
        var $tasks;
        if (!type) { // all
            $tasks = $rowsContainer.find('.transfer-task-row');
        }
        else if (type === this.DONE) {
            $tasks = $rowsContainer.find('.transfer-task-row.complete');
        }

        if ($tasks && $tasks.length) {
            for (var r = 0; r < $tasks.length; r++) {
                removeRow($($tasks[r]));
            }
        }
    };
};
