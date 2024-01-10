/** This class will function as a UI controller.
 */
mega.tpw = new function TransferProgressWidget() {
    'use strict';
    var downloadRowPrefix = 'tpw_dl_';
    var uploadRowPrefix = 'tpw_ul_';
    const textSelector = '.transfer-progress-txt';
    const tpwRowSelector = '.transfer-task-row';
    const transferPauseAllSelector = '.transfer-pause-icon';
    var frozenTimeout = 6e4; // 60 sec
    var completedTimeToStay = 3e5; // 5 min
    var FailedTimeToStay = 9e5; // 15 min
    var maximumLength = 200; // maximum rows to draw in normal mode

    var $widget;
    var $widgetWarnings;
    var $rowsHeader;
    var $widgetHeadAndBody;
    var $widgetTabActive;
    var $widgetTabsHeader;
    var $widgetTabCompleted;
    var $rowsContainer;
    var $bodyContainer;
    var $widgetFooter;
    var $rowTemplate;
    var $downloadRowTemplate;
    var $uploadRowTemplate;
    var $transferActionTemplate;
    var $overQuotaBanner;
    var $uploadChart;
    var $downloadChart;
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
                    stText = l[1418];
                    break;
                case mySelf.FAILED:
                    stText = extraOption || l.tfw_generic_fail_msg;
                    break;
                case mySelf.FROZEN:
                    stText = 'Frozen';
                    break;
                case mySelf.PAUSED:
                    stText = l[1651];
                    break;
            }

            $('.transfer-task-status', row).text(escapeHTML(stText));
        }
        else {
            return;
        }
    };

    var initScrolling = function() {
        delay('tpw:initScrolling', () => {
            initPerfectScrollbar($bodyContainer);
        }, 250);
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
        delay('tpw:remove', () => {
            initScrolling();
            mega.tpw.updateHeaderAndContent();
        }, 1500);
    };

    /**
     * Show a tab in Transfer progress widget
     * @param {Number} section  1 = completed, 0 = on progress
     * @returns {void} void
     */
    var viewTransferSection = function(section) {
        var $rows = $(tpwRowSelector, $rowsContainer);
        if (typeof section === 'undefined') {
            section = $widgetTabActive.hasClass('inactive') ? 1 : $widgetTabActive.hasClass('active') ? 0 : 1;
        }

        // for enhanced performance, instead of using ".find" or ".filter" 2 times
        // I will apply the calls on 1 go O(n).

        for (var r = 0; r < $rows.length; r++) {
            var $currRow = $($rows[r]);
            if ($currRow.hasClass('complete')) {
                if (section) {
                    $currRow.removeClass('hidden');
                }
                else {
                    $currRow.addClass('hidden');
                }
            }
            else if (section) {
                $currRow.addClass('hidden');
            }
            else {
                $currRow.removeClass('hidden');
            }
        }

        if ($widgetTabCompleted.hasClass('active')) {
            $('.ps__rail-y', $bodyContainer).addClass('y-rail-offset');
        }

        initScrolling();
    };

    var initEventsHandlers = function() {
        // minimize event handler
        $('.transfer-progress-icon.tpw-c-e', $rowsHeader).rebind('click.tpw', function tpw_collapseExpandHandler() {
            if ($widgetHeadAndBody.hasClass('expand')) {
                isMinimizedByUser = true;
                $bodyContainer.slideUp(400, () => {
                    $widgetHeadAndBody.removeClass('expand').addClass('collapse');
                    $widgetFooter.addClass('hidden');
                    $widgetTabsHeader.addClass('hidden');
                });
            }
            else {
                isMinimizedByUser = false;
                $widgetHeadAndBody.removeClass('collapse').addClass('expand');
                $bodyContainer.slideDown(400, () => {
                    if ($widgetTabActive.hasClass('active')) {
                        $widgetFooter.removeClass('hidden');
                    }
                    $widgetTabsHeader.removeClass('hidden');
                    initScrolling();
                });
            }
            return false;
        });

        // close event handler
        $('.transfer-progress-icon.tpw-close', $rowsHeader).off('click').on('click',
            function tpw_CloseHandler() {
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

        // open transfer page
        $('.js-tpm-open', $widgetHeadAndBody).rebind('click.tpw', () => {
            $('.nw-fm-left-icon.transfers.js-fm-tab', '#fmholder').trigger('click');
        });

        // open section
        const openTransferSection = function() {
            const $this = $(this);
            if ($this.hasClass('inactive') || $this.hasClass('active')) {
                return false;
            }
            $widgetTabCompleted.toggleClass('active');
            viewTransferSection($this.hasClass('js-tab-active') ? 0 : 1);
            $widgetTabActive.toggleClass('active');
            $widgetFooter.toggleClass('hidden');

            // This disables the propagation of the click to ancestors triggering the $.hideTopMenu
            return false;
        };
        $widgetTabActive.rebind('click.tpw', openTransferSection);
        $widgetTabCompleted.rebind('click.tpw', openTransferSection);

        bindTransfersMassEvents($widgetFooter);
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
                $('.quota-info-pr-txt', $overQuotaBanner)
                    .text(l[5775].replace('%1', bytesToSize(acc.tfsq.used)));
                const $action = $('.action', $overQuotaBanner);
                $action.addClass('negative');

                $('.quota-info-pct-circle li.right-c p', $overQuotaBanner).rotate(-180, 0);
            }
            else {
                var perc = Math.floor(acc.space_used / acc.space * 100);
                if (perc < 100) {
                    $overQuotaBanner.addClass('almost-overquota').removeClass('overquota');
                    $('.content-txt', $overQuotaBanner).text(l.tfw_storage_almost_exceeded_text);
                }
                else {
                    $('.content-txt', $overQuotaBanner).text(l.tfw_storage_exceeded_text);
                }
                $('.head-title', $overQuotaBanner).safeHTML(
                    l.tfw_storage_exceeded_title
                        .replace('[S]', '<span class="pct-used">')
                        .replace('[/S]', '</span>')
                        .replace('%1', perc)
                );

                $('.quota-info-pct-txt', $overQuotaBanner).text(formatPercentage(perc / 100));

                var usedSpace = bytesToSize(acc.space_used);
                var totalSpace = bytesToSize(acc.space, 0);
                if ((usedSpace + totalSpace).length >= 12) {
                    $('.quota-info-pr-txt', $overQuotaBanner).addClass('small-font');
                }
                var spaceInfo = l[16301].replace('%1', usedSpace).replace('%2', totalSpace);
                $('.quota-info-pr-txt', $overQuotaBanner).safeHTML(spaceInfo);

                const $action = $('.action', $overQuotaBanner);
                $action.removeClass('negative');

                perc = perc >= 100 ? 100 : perc;
                var direction = -1;
                var rotateAngle = 360 * perc / 100 <= 180 ? 0 : 360 * perc / 100 - 180;
                $('.quota-info-pct-circle li.right-c p', $overQuotaBanner).rotate(rotateAngle * direction);
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
        $(tpwRowSelector, $widget).removeClass('overquota error');
        this.updateHeaderAndContent();
    };

    /**
     * Hide action buttons if file node is removed
     * @return {void}
     */
    const hideCompleteActions = (e) => {
        let actionsNode;

        if (!(e.currentTarget.classList.contains('complete')
            && (actionsNode = e.currentTarget.querySelector('.transfer-complete-actions')))) {

            return;
        }

        const h = e.currentTarget.getAttribute('nhandle')
            || e.currentTarget.getAttribute('id').split('_').pop();

        if (h && M.d[h]) {
            actionsNode.classList.remove('hidden');
        }
        else {
            actionsNode.classList.add('hidden');
        }
    };

    var actionsOnRowEventHandler = function() {
        var $me = $(this);
        if ($me.hasClass('disabled') || !$me.is(':visible')) {
            return;
        }

        var $transferRow = $me.closest(tpwRowSelector);
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
                if (GlobalProgress[id]) {
                    dlmanager.abort(id);
                }
            }
            else {
                id = 'ul_' + id;
                if (GlobalProgress[id]) {
                    ulmanager.abort(id);
                }
            }
            $('.transfer-table tr#' + id).remove();
            if ($.clearTransferPanel) {
                $.clearTransferPanel();
            }
            if (M.tfsdomqueue[id]) {
                delete M.tfsdomqueue[id];
            }
            tfsheadupdate({c: id});

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
                $.autoSelectNode = node.h;
                M.openFolder(node.p).always((res) => {
                    if (res && res === EEXIST && selectionManager) {
                        selectionManager.clear_selection();
                        selectionManager.add_to_selection($.autoSelectNode, true);
                        delete $.autoSelectNode;
                    }
                });
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
        var $currWidget = $('.transfer-progress.tpw');
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
        else if ($('#fmholder').is(':visible') && $currWidget.parents('#fmholder').length === 0) {
            $currWidget.appendTo($('.corner-messages', '#fmholder'));
            return $currWidget;
        }
        return $currWidget;
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
        $widgetTabsHeader = $('.transfer-progress-tabs-head', $widgetHeadAndBody);
        $widgetTabActive = $('.js-tab-active', $widgetTabsHeader);
        $widgetTabCompleted = $('.js-tab-completed', $widgetTabsHeader);
        $bodyContainer = $('.widget-body-container', $widget);
        $rowsContainer = $('.transfer-progress-widget-body', $bodyContainer);
        $widgetFooter = $('.transfer-widget-footer', $widget);
        $overQuotaBanner = $('.banner.transfer', $widget);
        $rowTemplate = $($(tpwRowSelector, $rowsContainer)[0]).clone();
        $rowTemplate.rebind('mouseover.hideButtons', hideCompleteActions);
        rowProgressWidth = $($rowsContainer[0]).find('.transfer-progress-bar').width();
        $downloadRowTemplate = $rowTemplate.clone(true).removeClass('upload').addClass('download icon-down');
        $uploadRowTemplate = $rowTemplate.clone(true).removeClass('download').addClass('upload icon-up');
        $uploadChart = $('.transfer-progress-type.upload .progress-chart', $widgetHeadAndBody);
        $downloadChart = $('.transfer-progress-type.download .progress-chart', $widgetHeadAndBody);

        $transferActionTemplate = $($('button.btn-icon.transfer-progress-btn', $downloadRowTemplate)[0]).clone()
            .removeClass('pause cancel link cloud-folder restart');
        var $transferActionTemplateIcon = $('i.transfer-progress-icon', $transferActionTemplate);
        $transferActionTemplateIcon.removeClass('pause cancel link cloud-folder restart' +
            'icon-pause icon-close-component icon-link icon-search-cloud icon-play-small');
        $transferActionTemplateIcon.bind('click', actionsOnRowEventHandler);

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

            if (page !== 'securechat' && page.indexOf('chat') === -1) {
                mega.tpw.showWidget();
            }

            if ($widgetHeadAndBody.hasClass('expand')) {
                if (page !== 'securechat' && page.indexOf('chat') !== -1) {
                    $('.transfer-progress-icon.tpw-c-e.collapse', $rowsHeader).click();
                    isMinimizedByUser = false;
                }
            }
            else if (page !== 'securechat' && page.indexOf('chat') === -1 && !isMinimizedByUser) {
                $('.transfer-progress-icon.tpw-c-e.expand', $rowsHeader).click();
            }

        }
    };

    mBroadcaster.addListener('pagechange', () => {
        delay('tpwviewprep', viewPreparation, 500);
    });
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
        $targetedRow.removeClass('complete error progress paused overquota').addClass('inqueue');
        setStatus($targetedRow, mySelf.FROZEN);
    };

    var getDownloadsRows = function() {
        return $(`[id^='${downloadRowPrefix}']`, $rowsContainer);
    };

    var getUploadsRows = function() {
        return $(`[id^='${uploadRowPrefix}']`, $rowsContainer);
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

        const fullDeg = 360;
        const deg = fullDeg * perc / 100;

        if (perc < 50) {
            $('.left-chart span', $headerSection).css('transform', `rotate(${180 + deg}deg)`);
            $('.right-chart', $headerSection).addClass('low-percent-clip');
            $('.left-chart', $headerSection).addClass('low-percent-clip');
        }
        else {
            $('.left-chart span', $headerSection).css('transform', `rotate(${deg - 180}deg)`);
            $('.right-chart', $headerSection).removeClass('low-percent-clip');
            $('.left-chart', $headerSection).removeClass('low-percent-clip');
        }
    };


    var cleanOverLimitRows = function() {
        var $allRows = $(tpwRowSelector, $rowsContainer);
        var rowsCount = $allRows.length;

        if (rowsCount <= maximumLength) {
            return;
        }
        else {
            mega.tpw.clearRows(mega.tpw.DONE);
        }
    };

    var initUI = function() {
        var $currWidget = clearAndReturnWidget();

        if (!$currWidget) {
            return false;
        }

        var $rows = $(tpwRowSelector, $currWidget);
        if ($rows.length) {
            if (!$rows.eq(0).attr('id')) {
                $currWidget.replaceWith($widget);

                initEventsHandlers();
                $('i.transfer-progress-icon', $widget).rebind('click.tpw', actionsOnRowEventHandler);
            }
            // init sections
            viewTransferSection();
        }
        return true;
    };


    var postProcessComplete = function() {
        var $allRows = $(tpwRowSelector, $rowsContainer);
        var $completedRows = $allRows.filter('.complete');
        if ($completedRows.length === $allRows.length) {
            $widgetTabCompleted.addClass('active');
            $widgetTabActive.addClass('inactive');
            $allRows.removeClass('hidden');
            $widgetFooter.addClass('hidden');
        }
        initScrolling();
    };

    var finalizeUpdates = function() {
        cleanOverLimitRows();
        mega.tpw.updateHeaderAndContent();
        if (!mega.tpw.isWidgetVisibile() && !page.includes('download') && !page.includes('transfers')) {
            mega.tpw.showWidget();
        }
        initScrolling();
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

        var addAsHidden = $widgetTabCompleted.hasClass('active');

        if (addAsHidden && $widgetTabActive.hasClass('inactive')) {
            $widgetTabActive.removeClass('inactive').addClass('active');
            $widgetTabCompleted.removeClass('active');
            if ($widgetHeadAndBody.hasClass('expand')) {
                $widgetFooter.removeClass('hidden');
            }
            $('.transfer-task-row', $rowsContainer).addClass('hidden');
            addAsHidden = false;
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
            const id = prefix + dId;
            const $targetedRow = $(`#${id}`, $rowsContainer);
            var $row = null;

            if ($targetedRow.length === 1) {
                $row = $targetedRow;
            }
            else if ($targetedRow.length > 1) {
                // somehow we found multiple instances
                $targetedRow.remove();
            }
            if (!$row) {
                $row = (type === this.DOWNLOAD)
                    ? $downloadRowTemplate.clone(true) : $uploadRowTemplate.clone(true);

                $row.attr('id', id);
            }

            if (monitors[dId]) {
                clearTimeout(monitors[dId]);
            }
            monitors[dId] = setTimeout(updateToFrozen, frozenTimeout, dId);

            $row.find('.transfer-filetype-txt').text(fName);

            var $enqueueAction = $transferActionTemplate.clone(true).addClass('cancel');
            $('i.transfer-progress-icon', $enqueueAction).addClass('cancel icon-close-component')
                .attr('data-simpletip', toolTipText);
            $row.find('.transfer-task-actions').empty().append($enqueueAction);
            if ($('.transfer-complete-actions', $row).length) {
                $('.transfer-complete-actions', $row).remove();
            }
            $row.find('.transfer-progress-bar .transfer-progress-bar-pct').css('width', 0);

            $row.removeClass('complete error progress paused overquota').addClass('inqueue');
            $('.transfer-task-status', $row).text('');
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

        // for a concurrent batch of adding, we will postpone final calculations to the end.
        delay('tpw:addTimer', finalizeUpdates, 1500);

        $rowsContainer.prepend($tempRows);
        $tempRows = null;
    };


    this.updateDownloadUpload = function(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num, startTime) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !id) {
            return;
        }

        var dId = id;

        var pauseText;
        var cancelText;

        var prefix;
        var queue;

        if (type === this.DOWNLOAD) {
            dId = id = id.split('_').pop();
            prefix = downloadRowPrefix;
            queue = dl_queue;
            pauseText = l.tfw_transfer_pause;
            cancelText = l.tfw_transfer_cancel;

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

        $targetedRow.removeClass('complete error inqueue paused overquota').addClass('progress');

        if (!$targetedRow.attr('prepared')) {
            var $actionsRow = $targetedRow.find('.transfer-task-actions').empty();
            var $progressAction = $transferActionTemplate.clone(true).addClass('pause');
            $('i.transfer-progress-icon', $progressAction).addClass('pause icon-pause')
                .attr('data-simpletip', pauseText);
            $actionsRow.append($progressAction);
            $progressAction = $transferActionTemplate.clone(true).addClass('cancel');
            $('i.transfer-progress-icon', $progressAction).addClass('cancel icon-close-component')
                .attr('data-simpletip', cancelText);
            $actionsRow.append($progressAction);
            $targetedRow.attr('prepared', 'yes');
        }

        var prog = perc * rowProgressWidth / 100;
        $targetedRow.find('.transfer-progress-bar-pct').width(prog);
        $('.transfer-task-status', $targetedRow).text(bytesToSpeed(speed));

        this.updateHeaderAndContent();
    };

    this.finishDownloadUpload = function(type, entry, handle) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        var dId = entry.id;
        var prefix;

        var unHide = $widgetTabCompleted.hasClass('active');

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

        $targetedRow.removeClass('progress error inqueue paused overquota').addClass('complete');
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
            const root = M.getNodeRoot(handle || dId);
            if (root && root !== 'shares') {
                $('i.transfer-progress-icon', $finishedAction).removeClass('sprite-fm-mono')
                    .addClass('sprite-fm-mono link icon-link').attr('data-simpletip', l[5622]);
                $finishedActionsRow.append($finishedAction);
            }
            if (type === this.UPLOAD) {
                $finishedAction = $transferActionTemplate.clone(true).addClass('cloud-folder');
                $('i.transfer-progress-icon', $finishedAction).addClass('cloud-folder icon-search-cloud')
                    .attr('data-simpletip', l[20695]);
            }
            else {
                $finishedAction = $();
            }
            $finishedActionsRow.append($finishedAction);
            $finishedActionsRow.insertAfter($('.transfer-filetype-txt', $targetedRow));
        }
        $finishedAction = $transferActionTemplate.clone(true).addClass('cancel');
        $('i.transfer-progress-icon', $finishedAction).addClass('cancel icon-close-component')
            .attr('data-simpletip', l.tfw_transfer_remove);
        $actionsRow.append($finishedAction);

        if (unHide) {
            $targetedRow.removeClass('hidden');
        }
        else {
            $targetedRow.addClass('hidden');
        }

        // for a concurrent batch of finishes, we will postpone final calculations to the end.
        delay('tpw:finishTimer', () => {
            this.updateHeaderAndContent();
            postProcessComplete();
        }, 400);

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

        var prefix;
        var cancelText;
        var dId = entry.id;

        if (type === this.DOWNLOAD) {
            prefix = downloadRowPrefix;
            cancelText = l[1196];
            if (entry.zipid) {
                dId = entry.zipid;
            }
        }
        else {
            prefix = uploadRowPrefix;
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
        $targetedRow.removeClass('complete progress inqueue paused');
        setStatus($targetedRow, this.FAILED, errorStr);

        var $errorCancelAction = $transferActionTemplate.clone(true).addClass('cancel');
        $('i.transfer-progress-icon', $errorCancelAction).addClass('cancel icon-close-component')
            .attr('data-simpletip', cancelText);
        $targetedRow.find('.transfer-task-actions').empty().append($errorCancelAction);

        $targetedRow.removeAttr('prepared');

        if (isOverQuota) {
            $targetedRow.addClass('overquota');
            viewOverQuotaBanner(type);
        }
        else {
            $targetedRow.addClass('error');
        }

        var timerH = setTimeout(function() {
            $targetedRow.fadeOut(400, function() {
                removeRow($targetedRow);
            });

        }, FailedTimeToStay);

        $targetedRow.data('timer', timerH);
        this.updateHeaderAndContent();
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
        const $targetedRow = $(`#${prefix}${dId}`, $rowsContainer);

        if (!$targetedRow.length) {
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

        var $enqueueAction = $transferActionTemplate.clone(true).addClass('cancel');
        $('i.transfer-progress-icon', $enqueueAction).addClass('cancel icon-close-component')
            .attr('data-simpletip', toolTipText);
        $targetedRow.find('.transfer-task-actions').empty().append($enqueueAction);
        $targetedRow.removeClass('complete error progress paused overquota').addClass('inqueue');
        $('.transfer-task-status', $targetedRow).text('');
        setStatus($targetedRow, this.INITIALIZING);
        // for a concurrent batch of resumes, we will postpone final calculations to the end.
        delay('tpw:resumeTimer', finalizeUpdates, 1500);
    };


    this.pauseDownloadUpload = function(type, entry) {
        'use strict';
        if (!$rowsContainer || typeof type === 'undefined' || !entry) {
            return;
        }

        var dId = entry.id;
        var prefix;

        if (type === this.DOWNLOAD) {
            prefix = downloadRowPrefix;
            if (entry.zipid) {
                dId = entry.zipid;
            }
        }
        else {
            prefix = uploadRowPrefix;
        }

        const $targetedRow = $(`#${prefix}${dId}`, $rowsContainer);

        if (!$targetedRow.length) {
            return;
        }
        if (monitors[dId]) {
            clearTimeout(monitors[dId]);
            delete monitors[dId];
        }


        $targetedRow.removeClass('error complete progress inqueue overquota').addClass('paused');
        setStatus($targetedRow, this.PAUSED);

        const $actionsRow = $('.transfer-task-actions', $targetedRow).empty();
        var $pausedAction = $transferActionTemplate.clone(true).addClass('restart');
        $('i.transfer-progress-icon', $pausedAction).addClass('restart icon-play-small')
            .attr('data-simpletip', l.tfw_transfer_start);
        $actionsRow.append($pausedAction);
        $pausedAction = $transferActionTemplate.clone(true).addClass('cancel');
        $('i.transfer-progress-icon', $pausedAction).addClass('cancel icon-close-component')
            .attr('data-simpletip', l.tfw_transfer_cancel);
        $actionsRow.append($pausedAction);
        $targetedRow.removeAttr('prepared');
        delay('tpwpauseallcheck', () => {
            if (
                $('.paused, .complete, .error, .overquota', $rowsContainer).length
                === $(tpwRowSelector, $rowsContainer).length
            ) {
                const $pauseAllBtn = $(transferPauseAllSelector, $widgetFooter);
                $pauseAllBtn.addClass('active');
                $('span', $pauseAllBtn).text(l[7101]);
                const $transferPagePauseBtn = $('.transfer-pause-icon', '.fm-transfers-header');
                if ($transferPagePauseBtn.length) {
                    $('span', $transferPagePauseBtn.addClass('active')).text(l[7101]);
                    $('i', $transferPagePauseBtn).removeClass('icon-pause').addClass('icon-play-small');
                }
                $('i', $pauseAllBtn).removeClass('icon-pause').addClass('icon-play-small');
            }
        }, 100);
        delay('tpw:pauseTimer', finalizeUpdates, 1500);
    };

    this.showAlmostOverquota = function() {
        viewOverQuotaBanner(this.UPLOAD);
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
        if (!$rowsContainer || !$(tpwRowSelector, $rowsContainer).length) {
            return;
        }
        if (u_type !== false && M.getTransferElements() && !pfid) {
            $('.js-tpm-open', $widgetHeadAndBody).removeClass('hidden');
        }
        else {
            $('.js-tpm-open', $widgetHeadAndBody).addClass('hidden');
        }
        $widget.removeClass('hidden');
        $widget.show();
        initScrolling();
        isHiddenByUser = false;
    };

    this.hideWidget = function() {
        $widget.addClass('hidden');
    };

    this.clearRows = function(type) {
        if (d) {
            console.time('tpw:clearRows');
        }
        var $tasks;
        if (!type) { // all
            $tasks = $(tpwRowSelector, $rowsContainer);
        }
        else if (type === this.DONE) {
            $tasks = $rowsContainer.find('.transfer-task-row.complete');
        }

        if ($tasks && $tasks.length) {
            for (var r = 0; r < $tasks.length; r++) {
                removeRow($($tasks[r]));
            }
        }
        if (d) {
            console.timeEnd('tpw:clearRows');
        }
    };

    /**
     * Returns the most complete transfer stats for rendering headers
     *
     * @return {object} transfer stats including overquota + error counts
     */
    this.getHeadStats = function() {
        const data = Object.create(null);
        if (!tfsheadupdate || !tfsheadupdate.stats) {
            return false;
        }
        const { adl, aul, edl, eul, odl, oul, fdl, ful } = tfsheadupdate.stats;
        const transfersData = getTransfersPercent();
        data.dl = adl;
        data.ul = aul;
        data.dlDone = fdl;
        data.ulDone = ful;
        data.dlRemain = data.dl - data.dlDone;
        data.ulRemain = data.ul - data.ulDone;
        data.dlBytes = transfersData.dl_total;
        data.dlDoneBytes = transfersData.dl_done;
        if (!data.dlBytes && !data.dlDoneBytes) {
            data.dlBytes = 1;
            data.dlDoneBytes = 1;
        }
        data.ulBytes = transfersData.ul_total;
        data.ulDoneBytes = transfersData.ul_done;
        if (!data.ulBytes && !data.ulDoneBytes) {
            data.ulBytes = 1;
            data.ulDoneBytes = 1;
        }
        data.dlOq = odl;
        data.ulOq = oul;
        data.dlErr = edl;
        data.ulErr = eul;
        return data;
    };

    this.updateHeaderAndContent = function() {
        const tfStats = this.getHeadStats();
        if (!tfStats.dl && !tfStats.ul || !$(tpwRowSelector, $rowsContainer).length) {
            this.hideWidget();
            return;
        }

        const processStats = function(tRemain, tBytes, tDoneBytes, tOq, tErr, blocks) {
            if (tOq) {
                blocks.$block.addClass('overquota');
                blocks.$text.text(l.tfw_header_overquota);
            }
            else if (tErr) {
                blocks.$block.addClass('error');
                blocks.$text.text(l.tfw_header_error);
            }
            else if (tRemain) {
                blocks.$text.text(String(l[20808] || '').replace('{0}', tRemain > 999 ? '999+' : tRemain));
                blocks.$block.removeClass('error overquota');
            }
            else {
                blocks.$text.text(l.tfw_header_complete);
                blocks.$block.removeClass('error overquota');
            }
            if (tRemain) {
                $widgetTabActive.removeClass('inactive');
            }
            setProgressCircle(blocks.$chart, tBytes, tDoneBytes);
        };

        if (tfStats.dlDone || tfStats.ulDone) {
            $widgetTabCompleted.removeClass('inactive');
        }
        if (tfStats.dlDone === tfStats.dl && tfStats.ulDone === tfStats.ul) {
            $widgetTabActive.addClass('inactive');
            $widgetTabCompleted.trigger('click');
        }
        if (tfStats.ulDone === 0 && tfStats.dlDone === 0) {
            $widgetTabCompleted.addClass('inactive');
            if (!$widgetTabActive.hasClass('active')) {
                $widgetTabActive.trigger('click');
            }
        }

        const blocks = Object.create(null);
        blocks.$block = $('.transfer-progress-type.download', $rowsHeader);
        if (tfStats.dl) {
            blocks.$text = $(textSelector, blocks.$block);
            blocks.$chart = $downloadChart;
            processStats(tfStats.dlRemain, tfStats.dlBytes, tfStats.dlDoneBytes, tfStats.dlOq, tfStats.dlErr, blocks);
            blocks.$block.removeClass('hidden');
        }
        else {
            blocks.$block.addClass('hidden');
        }
        blocks.$block = $('.transfer-progress-type.upload', $rowsHeader);
        if (tfStats.ul) {
            blocks.$text = $(textSelector, blocks.$block);
            blocks.$chart = $uploadChart;
            processStats(tfStats.ulRemain, tfStats.ulBytes, tfStats.ulDoneBytes, tfStats.ulOq, tfStats.ulErr, blocks);
            blocks.$block.removeClass('hidden');
        }
        else {
            blocks.$block.addClass('hidden');
        }
    };
};
