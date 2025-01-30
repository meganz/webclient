/** This class will function as a UI controller.
 */
mega.tpw = new function TransferProgressWidget() {
    'use strict';
    var downloadRowPrefix = 'tpw_dl_';
    var uploadRowPrefix = 'tpw_ul_';
    const textSelector = '.transfer-progress-txt';
    const transferPauseAllSelector = '.transfer-pause-icon';
    const frozenTimeout = 60; // 60 sec
    const completedTimeToStay = 300; // 5 min
    const failedTimeToStay = 900; // 15 min
    var maximumLength = 200; // maximum rows to draw in normal mode

    var $widget;
    var $widgetWarnings;
    var $rowsHeader;
    var $widgetHeadAndBody;
    var $widgetTabActive;
    var $widgetTabsHeader;
    var $widgetTabCompleted;
    var $bodyContainer;
    var $widgetFooter;
    var $overQuotaBanner;
    var $uploadChart;
    var $downloadChart;

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

    var initScrolling = function() {
        delay('tpw:initScrolling', () => {
            initPerfectScrollbar($bodyContainer);
        }, 250);
    };

    var removeRow = function(transferId) {
        if (!transferId) {
            return;
        }

        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }

        mega.tpw.removeDOMRow(transferId);
        delay('tpw:remove', () => {
            initScrolling();
            mega.tpw.updateHeaderAndContent();
        }, 1500);
    };

    /**
     * Show a tab in Transfer progress widget
     * @returns {void} void
     */
    var viewTransferSection = function() {
        if ($widgetTabCompleted.hasClass('active')) {
            $bodyContainer.addClass('completed').removeClass('active');
            $('.ps__rail-y', $bodyContainer).addClass('y-rail-offset');
        }
        else {
            $bodyContainer.addClass('active').removeClass('completed');
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
            M.openFolder('transfers');
        });

        // open section
        const openTransferSection = function() {
            const $this = $(this);
            if ($this.hasClass('inactive') || $this.hasClass('active')) {
                return false;
            }
            $widgetTabCompleted.toggleClass('active');
            viewTransferSection();
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
        const reset = (id) => {
            this.updateDOMRow(id, {
                noError: true,
            });
        };
        this.applyToRows(reset, this.TYPE_OVERQUOTA);
        this.applyToRows(reset, this.TYPE_ERRORED);
        this.updateHeaderAndContent();
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
        if (mega.tpw.initialized) {
            return;
        }
        $widget = clearAndReturnWidget();
        if (!$widget || !$widget.length) {
            return;
        }

        mega.tpw.initDOM();
        $widgetWarnings = $('.banner.transfer', $widget);
        $rowsHeader = $('.transfer-progress-head', $widget);
        $widgetHeadAndBody = $('.transfer-progress-widget', $widget);
        $widgetTabsHeader = $('.transfer-progress-tabs-head', $widgetHeadAndBody);
        $widgetTabActive = $('.js-tab-active', $widgetTabsHeader);
        $widgetTabCompleted = $('.js-tab-completed', $widgetTabsHeader);
        $bodyContainer = $('.widget-body-container', $widget);
        $widgetFooter = $('.transfer-widget-footer', $widget);
        $overQuotaBanner = $('.banner.transfer', $widget);
        $uploadChart = $('.transfer-progress-type.upload .progress-chart', $widgetHeadAndBody);
        $downloadChart = $('.transfer-progress-type.download .progress-chart', $widgetHeadAndBody);

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

        return 0xDEAD;
    };

    mBroadcaster.addListener('pagechange', () => {
        delay('tpwviewprep', viewPreparation, 500);
    });
    mBroadcaster.addListener('fm:initialized', viewPreparation);

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
        if (mega.tpw.rowsLength > maximumLength) {
            mega.tpw.clearRows(mega.tpw.DONE);
            $widgetTabCompleted.removeClass('active');
            $widgetTabActive.addClass('active');
            $widgetFooter.removeClass('hidden');
            $bodyContainer.removeClass('completed').addClass('active');
        }
    };

    var initUI = function() {
        var $currWidget = clearAndReturnWidget();

        if (!$currWidget) {
            return false;
        }
        // Moving widget from fm -> static pages or vice-versa.
        if ($currWidget[0].querySelector('.transfer-progress-widget-body').children.length === 0) {
            $currWidget.replaceWith($widget);

            initEventsHandlers();
            // init sections
            viewTransferSection();
        }
        return true;
    };


    var postProcessComplete = function() {
        if (mega.tpw.completeRowsLength === mega.tpw.rowsLength) {
            $widgetTabCompleted.addClass('active');
            $widgetTabActive.addClass('inactive');
            $widgetFooter.addClass('hidden');
            $bodyContainer.addClass('completed').removeClass('active');
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

    const validateEntry = function(type, entry) {
        if (!mega.tpw.domReady || typeof type === 'undefined' || !entry) {
            return false;
        }
        let prefix = uploadRowPrefix;
        let dId = entry.id;

        if (type === mega.tpw.DOWNLOAD) {
            prefix = downloadRowPrefix;
            if (entry.zipid) {
                dId = entry.zipid;
            }
        }
        const transferId = `${prefix}${dId}`;
        return mega.tpw.hasDOMRow(transferId) && transferId;
    };

    /**
     * Adding a download/upload entry to transfer progress widget
     * @param {Number} type             Entry type: 1 download, 2 upload
     * @param {Object} entry            Download|Upload entry object built at transfer
     * @param {Number} specifiedSize    to tell the size of download entry
     */
    this.addDownloadUpload = function(type, entry, specifiedSize) {
        'use strict';
        if (!this.domReady || typeof type === 'undefined' || !entry) {
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

        if ($widgetTabCompleted.hasClass('active') && $widgetTabActive.hasClass('inactive')) {
            $widgetTabActive.removeClass('inactive').addClass('active');
            $widgetTabCompleted.removeClass('active');
            if ($widgetHeadAndBody.hasClass('expand')) {
                $widgetFooter.removeClass('hidden');
            }
            $bodyContainer.addClass('active').removeClass('completed');
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
            const transferId = `${prefix}${dId}`;
            const rowData = {
                transferId,
                type,
                name: fName,
                zipId: entriesArray[r].zipid,
            };

            if (monitors[transferId]) {
                monitors[transferId].restart();
            }
            else {
                monitors[transferId] = tSleep(frozenTimeout);
                monitors[transferId].then(() => delete monitors[transferId]).then(() => this.freezeDOMRow(transferId));
            }

            if (reverted) {
                $tempRows[tempRowPos--] = rowData;
            }
            else {
                $tempRows[tempRowPos++] = rowData;
            }
        }

        // for a concurrent batch of adding, we will postpone final calculations to the end.
        delay('tpw:addTimer', finalizeUpdates, 1500);

        for (const row of $tempRows) {
            this.addDOMRow(row);
        }
    };

    this.updateDownloadUpload = function(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num, startTime) {
        'use strict';
        if (!this.domReady || typeof type === 'undefined' || !id) {
            return;
        }

        var dId = id;

        var prefix;
        var queue;

        if (type === this.DOWNLOAD) {
            dId = id = id.split('_').pop();
            prefix = downloadRowPrefix;
            queue = dl_queue;

            if (queue[queue_num].zipid) {
                dId = queue[queue_num].zipid;
            }
            kbps *= 1024;
        }
        else {
            prefix = uploadRowPrefix;
            queue = ul_queue;
        }

        const transferId = `${prefix}${dId}`;
        if (!this.hasDOMRow(transferId)) {
            const entry = {
                n: queue[queue_num].n,
                name: queue[queue_num].name, // in upload will be null - OK
                id: id,
                zipname: queue[queue_num].zipname, // null if upload - OK
                zipid: queue[queue_num].zipid, // null if upload - OK
                size: queue[queue_num].size
            };

            this.addDownloadUpload(type, entry);
            return mySelf.updateDownloadUpload(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num);
        }

        if (monitors[transferId]) {
            monitors[transferId].restart();
        }
        else {
            monitors[transferId] = tSleep(frozenTimeout);
            monitors[transferId].then(() => delete monitors[transferId]).then(() => this.freezeDOMRow(transferId));
        }

        var timeSpent = (new Date().getTime() - startTime) / 1000;
        var realSpeed = bytesLoaded / timeSpent; // byte per sec

        var speed = (kbps) ? Math.min(realSpeed, kbps) : realSpeed;
        this.updateDOMRow(transferId, {
            status: 'progress',
            progress: perc,
            statusText: bytesToSpeed(speed),
            running: true,
        });
        this.updateHeaderAndContent();
    };

    this.finishDownloadUpload = function(type, entry, handle) {
        'use strict';
        const transferId = validateEntry(type, entry);
        if (!transferId) {
            return;
        }

        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }

        // for a concurrent batch of finishes, we will postpone final calculations to the end.
        delay('tpw:finishTimer', () => {
            this.updateHeaderAndContent();
            postProcessComplete();
        }, 400);

        this.eventuallyFadeOutRow(transferId, completedTimeToStay);
        this.updateDOMRow(transferId, {
            status: 'complete',
            statusText: l[1418],
            complete: M.getNodeRoot(handle || entry.zipid || entry.id) || true, // If there is a root pass it.
            handle
        });
    };

    this.errorDownloadUpload = function(type, entry, errorStr, isOverQuota) {
        'use strict';
        const transferId = validateEntry(type, entry);
        if (!transferId) {
            return;
        }
        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }
        const update = {
            status: isOverQuota ? 'overquota' : 'error',
            statusText: errorStr || l.tfw_generic_fail_msg,
            running: false,
        };

        if (isOverQuota) {
            viewOverQuotaBanner(type);
            update.overquota = true;
        }
        else {
            update.errored = true;
        }

        this.updateDOMRow(transferId, update);
        this.eventuallyFadeOutRow(transferId, failedTimeToStay);
        this.updateHeaderAndContent();
    };

    this.resumeDownloadUpload = function(type, entry) {
        'use strict';
        const transferId = validateEntry(type, entry);
        if (!transferId) {
            return;
        }
        if (!this.isRowPaused(transferId)) {
            return;
        }
        if (monitors[transferId]) {
            monitors[transferId].restart();
        }
        else {
            monitors[transferId] = tSleep(frozenTimeout);
            monitors[transferId].then(() => delete monitors[transferId]).then(() => this.freezeDOMRow(transferId));
        }

        this.updateDOMRow(transferId, {
            paused: false,
            status: 'inqueue',
            statusText: '',
        });
        // for a concurrent batch of resumes, we will postpone final calculations to the end.
        delay('tpw:resumeTimer', finalizeUpdates, 1500);
    };

    this.pauseDownloadUpload = function(type, entry) {
        'use strict';
        const transferId = validateEntry(type, entry);
        if (!transferId) {
            return;
        }

        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }

        this.updateDOMRow(transferId, {
            paused: true,
            status: 'paused',
            statusText: l[1651],
        });
        delay('tpwpauseallcheck', () => {
            if (
                this.completeRowsLength + this.pausedRowsLength + this.erroredRowsLength + this.overquotaRowsLength
                === this.rowsLength
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
        if (dId.startsWith('tpw')) {
            if (this.hasDOMRow(dId)) {
                removeRow(dId);
            }
            return;
        }
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
        const transferId = `${prefix}${dId}`;
        if (!this.hasDOMRow(transferId)) {
            return;
        }

        removeRow(transferId);
    };


    this.isWidgetVisibile = function() {
        return $widget.is(':visible');
    };

    this.showWidget = function() {
        init();
        initUI();
        if (!this.domReady || !this.rowsLength) {
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
        if (!type) { // all
            this.applyToRows(removeRow);
        }
        else if (type === this.DONE) {
            this.applyToRows(removeRow, this.TYPE_COMPLETE);
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
        if (!tfStats.dl && !tfStats.ul || !this.rowsLength) {
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
((scope) => {
    'use strict';
    let root;
    const rows = new Map();
    const toAnimate = new Map();
    const toEventuallyAnimate = new Map();
    const animationLength = 400;
    let animateUntil = false;
    let animationTick = 0;

    class MTransferRowActionButton extends MComponent {
        constructor(parent) {
            super();
            this.parent = parent;
            this._state = 'cancel';
            this.attachEvent('click', () => {
                const id = this.transferId.split('_').pop();
                const gid = this.zipId ? `zip_${id}` : `${this.type === scope.DOWNLOAD ? 'dl' : 'ul'}_${id}`;
                switch (this._state) {
                    case 'restart': {
                        fm_tfsresume(gid);
                        break;
                    }
                    case 'pause': {
                        fm_tfspause(gid);
                        break;
                    }
                    case 'cancel': {
                        if (this.type === scope.DOWNLOAD) {
                            if (GlobalProgress[gid]) {
                                dlmanager.abort(gid);
                            }
                        }
                        else if (GlobalProgress[gid]) {
                            ulmanager.abort(gid);
                        }
                        $(`.transfer-table tr#${gid}`).remove();
                        if ($.clearTransferPanel) {
                            $.clearTransferPanel();
                        }
                        if (M.tfsdomqueue[gid]) {
                            delete M.tfsdomqueue[gid];
                        }
                        tfsheadupdate({c: gid});
                        scope.fadeOutRow(this.transferId);
                        break;
                    }
                    case 'link': {
                        const node = M.d[this.handle || id];
                        if (node) {
                            $.selected = [node.h];
                            M.getLinkAction();
                        }
                        break;
                    }
                    case 'cloud': {
                        const node = M.d[this.handle || id];
                        if (node && node.p) {
                            $.autoSelectNode = node.h;
                            M.openFolder(node.p).always((res) => {
                                if (res && res === EEXIST && selectionManager) {
                                    selectionManager.clear_selection();
                                    selectionManager.add_to_selection($.autoSelectNode, true);
                                    delete $.autoSelectNode;
                                }
                            });
                        }
                        break;
                    }
                }
                return false;
            }, undefined, this.icon);
        }

        buildElement() {
            this.el = document.createElement('button');
            this.el.className = 'btn-icon transfer-progress-btn cancel';
            this.icon = document.createElement('i');
            this.icon.className = 'transfer-progress-icon sprite-fm-mono simpletip';
            this.icon.dataset.simpletipoffset = '5';
            this.icon.dataset.simpletipposition = 'top';
            this.icon.dataset.simpletipwrapper = '.transfer-progress.tpw';
            this.el.append(this.icon);
        }

        get transferId() {
            return this.parent.transferId;
        }

        get zipId() {
            return this.parent.zipId;
        }

        get type() {
            return this.parent.type;
        }

        get handle() {
            return this.parent._handle;
        }

        set hidden(hidden) {
            if (hidden) {
                this.el.classList.add('hidden');
                return;
            }
            this.el.classList.remove('hidden');
        }

        reset() {
            this.el.classList.remove('restart', 'pause', 'cancel', 'link', 'cloud-folder');
            this.icon.classList.remove(
                'restart', 'icon-play-small',
                'pause', 'icon-pause',
                'cancel', 'icon-close-component',
                'link', 'icon-link',
                'cloud-folder', 'icon-search-cloud'
            );
        }

        statePlay() {
            this.reset();
            this.appendCss('restart');
            this.icon.classList.add('restart', 'icon-play-small');
            this.icon.dataset.simpletip = l.tfw_transfer_start;
            this._state = 'restart';
        }

        statePause() {
            this.reset();
            this.appendCss('pause');
            this.icon.classList.add('pause', 'icon-pause');
            this.icon.dataset.simpletip = this.type === scope.UPLOAD ? l[16185] : l.tfw_transfer_pause;
            this._state = 'pause';
        }

        stateCancel(string) {
            this.reset();
            this.appendCss('cancel');
            this.icon.classList.add('cancel', 'icon-close-component');
            this.icon.dataset.simpletip = string || (this.type === scope.UPLOAD ? l[1617] : l[1196]);
            this._state = 'cancel';
        }

        stateLink() {
            this.reset();
            this.appendCss('link');
            this.icon.classList.add('link', 'icon-link');
            this.icon.dataset.simpletip = l[5622];
            this._state = 'link';
        }

        stateCloud() {
            this.reset();
            this.appendCss('cloud-folder');
            this.icon.classList.add('cloud-folder', 'icon-search-cloud');
            this.icon.dataset.simpletip = l[20695];
            this._state = 'cloud';
        }
    }

    class MTransferRow extends MComponent {
        constructor({ transferId, type, name, zipId }) {
            super();
            this.type = type;
            this.transferId = transferId;
            this.zipId = zipId;
            this.el.setAttribute('id', transferId);
            this.appendCss(type === scope.UPLOAD ? 'upload icon-up' : 'download icon-down');
            this.progress = 0;
            this.status = 'inqueue';
            this.file = name;
            if (zipId) {
                this.el.setAttribute('zippo', 'y');
            }
            this.actionLeft.stateCancel();
            this.actionRight.stateCancel();
            this.actionRight.hidden = true;
            this._running = false;
            this._paused = false;
            this._complete = false;
            this.errored = false;
            this.overquota = false;
        }

        get running() {
            return this._running;
        }

        get paused() {
            return this._paused;
        }

        get complete() {
            return this._complete;
        }

        set progress(percent) {
            this.progressPercent.setAttribute('style', `width: ${percent}%;`);
        }

        set status(status) {
            if (this._complete && status !== 'complete') {
                return;
            }
            this.el.classList.remove('complete', 'error', 'progress', 'paused', 'overquota', 'inqueue');
            this.el.classList.add(status);
        }

        set statusText(text) {
            this.statusEl.textContent = text;
        }

        set file(file) {
            this.icon.className = `item-type-icon icon-${fileIcon({ name: file })}-24`;
            this.fileType.textContent = file;
        }

        set handle(handle) {
            this._handle = handle;
        }

        set opacity(value) {
            this.el.style.opacity = value;
        }

        set paused(isPaused) {
            if (this._complete) {
                return;
            }
            if (isPaused) {
                this.actionLeft.statePlay();
                this.actionRight.stateCancel(l.tfw_transfer_cancel);
                this.actionRight.hidden = false;
                this._paused = true;
                this._running = false;
                return;
            }
            this.actionLeft.stateCancel();
            this.actionRight.hidden = true;
            this._paused = false;
        }

        set running(isRunning) {
            if (this._complete) {
                return;
            }
            if (isRunning) {
                if (this._running) {
                    return;
                }
                this.actionLeft.statePause();
                this.actionRight.stateCancel();
                this.actionRight.hidden = false;
                this._running = true;
                return;
            }
            this.actionLeft.stateCancel();
            this.actionRight.hidden = true;
            this._running = false;
        }

        set complete(complete) {
            if (!this.zipId) {
                if (typeof complete === 'string' && complete !== 'shares') {
                    this.completeActions.classList.remove('hidden');
                    this.completeActionBtnLeft.stateLink();
                    if (this.type === scope.UPLOAD) {
                        this.completeActionBtnRight.stateCloud();
                    }
                    else {
                        this.completeActionBtnRight.hidden = true;
                    }
                }
                else if (this.type === scope.UPLOAD) {
                    this.completeActions.classList.remove('hidden');
                    this.completeActionBtnLeft.stateCloud();
                    this.completeActionBtnRight.hidden = true;
                }
            }
            this.actionLeft.stateCancel(l.tfw_transfer_remove);
            this.actionRight.hidden = true;
            this._complete = true;
            this._running = false;
        }

        set noError(noError) {
            this.el.classList.remove('overquota', 'error');
            this.overquota = false;
            this.errored = false;
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = `transfer-task-row sprite-fm-mono progress`;
            this.icon = document.createElement('i');
            this.el.appendChild(this.icon);
            this.fileType = document.createElement('div');
            this.fileType.className = 'transfer-filetype-txt';
            this.el.appendChild(this.fileType);
            this.completeActions = document.createElement('div');
            this.completeActions.className = 'transfer-complete-actions hidden';
            this.el.appendChild(this.completeActions);
            this.completeActionBtnLeft = new MTransferRowActionButton(this);
            this.completeActions.append(this.completeActionBtnLeft.el);
            this.completeActionBtnRight = new MTransferRowActionButton(this);
            this.completeActions.append(this.completeActionBtnRight.el);
            this.statusEl = document.createElement('div');
            this.statusEl.className = 'transfer-task-status';
            this.el.appendChild(this.statusEl);
            const spinner = document.createElement('i');
            spinner.className = 'sprite-fm-theme icon-loading-spinner';
            this.el.appendChild(spinner);
            this.transferActions = document.createElement('div');
            this.transferActions.className = 'transfer-task-actions';
            this.el.appendChild(this.transferActions);
            this.actionLeft = new MTransferRowActionButton(this);
            this.transferActions.appendChild(this.actionLeft.el);
            this.actionRight = new MTransferRowActionButton(this);
            this.transferActions.appendChild(this.actionRight.el);
            const progressBar = document.createElement('div');
            progressBar.className = 'transfer-progress-bar';
            this.el.appendChild(progressBar);
            this.progressPercent = document.createElement('div');
            this.progressPercent.className = 'transfer-progress-bar-pct';
            progressBar.append(this.progressPercent);
            this.el.appendChild(document.createElement('hr'));
        }
    }

    scope.TYPE_COMPLETE = 'complete';
    scope.TYPE_RUNNING = 'running';
    scope.TYPE_PAUSED = 'paused';
    scope.TYPE_OVERQUOTA = 'overquota';
    scope.TYPE_ERRORED = 'errored';
    const types = [
        scope.TYPE_COMPLETE,
        scope.TYPE_RUNNING,
        scope.TYPE_PAUSED,
        scope.TYPE_OVERQUOTA,
        scope.TYPE_ERRORED
    ];
    scope.addDOMRow = (data) => {
        if (!scope.domReady || !data.transferId) {
            return false;
        }
        if (rows.has(data.transferId)) {
            rows.get(data.transferId).detachEl();
        }
        const row = new MTransferRow(data);
        root.append(row.el);
        rows.set(data.transferId, row);
        return true;
    };
    scope.updateDOMRow = (id, update) => {
        if (!scope.domReady || !rows.has(id)) {
            return false;
        }
        const row = rows.get(id);
        for (const key in update) {
            if (update.hasOwnProperty(key)) {
                row[key] = update[key];
            }
        }
        return true;
    };
    scope.freezeDOMRow = (id) => {
        if (!rows.has(id)) {
            return false;
        }
        const row = rows.get(id);
        if (!row.running) {
            return;
        }
        row.status = 'inqueue';
        row.statusText = l.tfw_frozen_status;
        row.running = false;
    };
    scope.removeDOMRow = (id) => {
        if (!scope.domReady || !rows.has(id)) {
            return true;
        }
        rows.get(id).detachEl();
        toAnimate.delete(id);
        const promise = toEventuallyAnimate.get(id);
        if (promise) {
            promise.abort();
            toEventuallyAnimate.delete(id);
        }
        return rows.delete(id);
    };
    scope.applyToRows = (fn, type) => {
        const out = [];
        if (!scope.domReady || type && !types.includes(type)) {
            return out;
        }
        for (const [key, row] of rows) {
            if (!type || row[type]) {
                if (typeof fn === 'function') {
                    fn(key);
                }
                out.push(key);
            }
        }
        return out;
    };
    scope.hasDOMRow = (id) => rows.has(id);
    scope.isRowPaused = (id) => rows.has(id) && rows.get(id).paused;

    const animate = tryCatch(() => {
        if (animateUntil <= Date.now()) {
            animateUntil = false;
            animationTick = 0;
            if (toAnimate.size) {
                for (const [key] of toAnimate) {
                    scope.removeRow(key);
                }
            }
            return;
        }
        requestAnimationFrame((last) => {
            if (!animationTick) {
                animationTick = last;
                return animate();
            }
            const diff = last - animationTick;
            const progressPct = diff / animationLength;
            for (const [id, progress] of toAnimate) {
                const opacity = 1 - (progress + progressPct);
                if (opacity <= 0) {
                    scope.removeRow(id);
                }
                else {
                    toAnimate.set(id, progress + progressPct);
                    rows.get(id).opacity = opacity;
                }
            }
            animationTick = last;
            if (toAnimate.size === 0) {
                animateUntil = false;
                animationTick = 0;
                return;
            }
            animate();
        });
    });
    scope.fadeOutRow = (id) => {
        if (!rows.has(id)) {
            return;
        }
        if (toEventuallyAnimate.has(id)) {
            toEventuallyAnimate.get(id).abort();
            toEventuallyAnimate.delete(id);
        }
        toAnimate.set(id, 0);
        const wasAnimating = !!animateUntil;
        animateUntil = Date.now() + animationLength;
        if (!wasAnimating) {
            animate();
        }
    };
    scope.eventuallyFadeOutRow = (id, timeout) => {
        if (toAnimate.has(id)) {
            return false;
        }
        if (toEventuallyAnimate.has(id)) {
            toEventuallyAnimate.get(id).abort();
        }
        const promise = tSleep(timeout);
        promise.then(() => {
            toEventuallyAnimate.delete(id);
            scope.fadeOutRow(id);
        });
        toEventuallyAnimate.set(id, promise);
        return true;
    };
    scope.initDOM = () => {
        if (scope.domReady) {
            return;
        }
        root = document.querySelector('.tpw .widget-body-container .transfer-progress-widget-body');
    };

    Object.defineProperty(scope, 'rowsLength', {
        get() {
            return rows.size;
        },
    });

    /**
     * @property scope.completeRowsLength
     * @property scope.runningRowsLength
     * @property scope.pausedRowsLength
     * @property scope.overquotaRowsLength
     * @property scope.erroredRowsLength
     */
    for (const key of types) {
        Object.defineProperty(scope, `${key}RowsLength`, {
            get() {
                let matched = 0;
                for (const [, row] of rows) {
                    if (row[key]) {
                        matched++;
                    }
                }
                return matched;
            }
        });
    }

    Object.defineProperty(scope, 'domReady', {
        get() {
            return !!root;
        },
    });
})(mega.tpw);
