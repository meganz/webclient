/** This class will function as a UI controller.
 */
mega.tpw = new function TransferProgressWidget() {
    'use strict';
    const textSelector = '.transfer-progress-txt';
    const transferPauseAllSelector = '.transfer-pause-icon';
    const frozenTimeout = 60; // 60 sec

    var $widget;
    var $rowsHeader;
    var $widgetTabActive;
    var $widgetTabCompleted;
    var $widgetTabError;
    var $widgetFooter;
    let $overQuotaBanners;
    let $odqBanner;
    let $obqBanner;
    let uploadChart;
    let downloadChart;
    let allChart;
    let $pauseAllBtn;
    let $closeBtn;
    let $transferTimes;

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
    let lastTime = 0;
    const progress = Object.create(null);
    progress._dlLastTick = 0;
    progress._ulLastTick = 0;
    progress._dlTransferred = 0;
    progress._ulTransferred = 0;
    progress._samples = [];
    const sizes = Object.create(null);
    sizes._utotal = 0;
    sizes._dtotal = 0;
    var isHiddenByUser = false;
    var isMinimizedByUser = false;
    let isHiddenForUpgrade = false;

    var monitors = Object.create(null);

    var removeRow = function(transferId) {
        if (!transferId) {
            return;
        }

        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }
        mega.tpw.logger.log('Removing row:', transferId, progress[transferId], sizes[transferId]);

        if (progress[transferId] !== undefined) {
            if (transferId[0] === 'u') {
                progress._ulTransferred -= progress[transferId];
            }
            else {
                progress._dlTransferred -= progress[transferId];
            }
            delete progress[transferId];
        }
        if (sizes[transferId]) {
            if (transferId[0] === 'u') {
                sizes._utotal -= sizes[transferId];
            }
            else {
                sizes._dtotal -= sizes[transferId];
            }
            delete sizes[transferId];
        }

        mega.tpw.removeDOMRow(transferId);
        delay('tpw:remove', () => {
            mega.tpw.updateHeaderAndContent();
            if (!mega.tpw.rowsLength && !(mega.tpw.currView & mega.tpw.views.ERROR)) {
                $widgetTabError.addClass('hidden');
            }
        }, 1500);
    };

    var initEventsHandlers = function() {
        // minimize event handler
        $('.transfer-progress-icon.tpw-c-e', $rowsHeader).rebind('click.tpw', function tpw_collapseExpandHandler() {
            const expand = $widget.parent().hasClass('collapse');
            isMinimizedByUser = !expand;
            mega.tpw.toggleMinimised(expand);
            if (expand) {
                eventlog(501224);
            }
            else {
                eventlog(501223);
            }
            return false;
        });

        // close event handler
        $closeBtn.rebind(
            'click.tpw',
            function tpw_CloseHandler() {
                eventlog(501068);
                isHiddenByUser = true;
                mega.tpw.hideWidget();
                if (!$.removeTransferItems) {
                    M.addTransferPanelUI();
                }
                $.removeTransferItems();
            });


        // close over quota
        $('.close-over', $overQuotaBanners).rebind(
            'click.tpw',
            function overquota_bannerClose() {
                $widget.parent().removeClass('banner-shown obq-shown odq-shown');
                $overQuotaBanners.addClass('hidden');
            });

        // upgrade account
        $('.up-action', $overQuotaBanners).rebind(
            'click.tpw',
            function overquota_bannerUpgrade() {
                mega.tpw.hideWidget();
                isHiddenByUser = true;
                isHiddenForUpgrade = true;
                loadSubPage('pro');
            });

        // open dashboard
        $('.left-section.circle-dashboard', $odqBanner).rebind(
            'click.tpw',
            function overquota_bannerUpgrade() {
                loadSubPage('dashboard');
            });

        // open transfer page
        $('.js-tpm-open', $rowsHeader).rebind('click.tpw', () => {
            eventlog(501074);
            mega.tpw.toggleDialog(mega.tpw.isDialog);
            if (mega.tpw.isDialog) {
                eventlog(501233);
            }
            else {
                eventlog(501234);
            }
        });

        const $tabs = $().add($widgetTabActive).add($widgetTabCompleted).add($widgetTabError);
        $tabs.rebind('click.tpw', (ev) => {
            if (ev.currentTarget.classList.contains('disabled')) {
                return false;
            }
            let viewId = mega.tpw.views.ACTIVE;
            if (ev.currentTarget.classList.contains('js-tab-completed')) {
                viewId = mega.tpw.views.COMPLETE;
                eventlog(501081);
            }
            else if (ev.currentTarget.classList.contains('js-tab-error')) {
                viewId = mega.tpw.views.ERROR;
                eventlog(501226);
            }
            if (mega.tpw.currView > mega.tpw.views.VIEW_MASK) {
                const currFilter = (mega.tpw.currView >>> 3) << 3;
                viewId |= currFilter;
            }
            const { odl, oul, edl, eul } = tfsheadupdate.stats;
            if (
                mega.tpw.currView & mega.tpw.views.ERROR && !(viewId & mega.tpw.views.ERROR) &&
                odl + oul + edl + eul === 0
            ) {
                $widgetTabError.addClass('hidden');
            }
            mega.tpw.renderView(viewId);
        });

        bindTransfersMassEvents($widgetFooter);
        $pauseAllBtn = $(transferPauseAllSelector, $widgetFooter);
    };


    var viewOverQuotaBanner = function(type) {
        if (!type || !u_type) {
            return;
        }

        if (!$odqBanner.hasClass('hidden') || !$obqBanner.hasClass('hidden')) {
            return;
        }

        $overQuotaBanners.removeClass('almost-overquota').addClass('overquota');
        (type === mega.tpw.DOWNLOAD ? Promise.resolve() : M.getStorageQuota()).then(res => {
            if (type === mega.tpw.DOWNLOAD) {
                $('.head-title', $obqBanner).safeHTML(l.tfw_obq_text);

                $obqBanner.removeClass('hidden');
                $widget.parent().addClass('obq-shown');
            }
            else {
                let perc = Math.floor(res.percent);
                if (perc < 100) {
                    $odqBanner.addClass('almost-overquota').removeClass('overquota');
                    $('.content-txt', $odqBanner).text(l.tfw_storage_almost_exceeded_text);
                }
                else {
                    $('.content-txt', $odqBanner).safeHTML(escapeHTML(l.tfw_odq_text)
                        .replace('%1', `<span class="storage-used">${bytesToSize(res.cstrg)}</span>`)
                        .replace('%2', `<span class="storage-max">${bytesToSize(res.mstrg)}</span>`)
                    );
                }
                $('.head-title', $odqBanner).safeHTML(
                    l.tfw_storage_exceeded_title
                        .replace('[S]', '<span class="pct-used">')
                        .replace('[/S]', '</span>')
                        .replace('%1', perc)
                );

                $('.quota-info-pct-txt', $odqBanner).text(formatPercentage(perc / 100));

                const $action = $('.action', $odqBanner);
                $action.removeClass('negative');

                perc = Math.min(100, perc);
                const deg = 360 * perc / 100;
                const $leftP = $('.quota-info-pct-circle li.left-c p', $odqBanner);
                const $rightP = $('.quota-info-pct-circle li.right-c p', $odqBanner);
                if (perc < 100) {
                    $widget.addClass('almost-overquota');
                }
                else {
                    $widget.removeClass('almost-overquota');
                }
                if (perc < 50) {
                    $leftP.rotate(180 + deg);
                    $leftP.parent().addClass('low-percent-clip');
                    $rightP.parent().addClass('low-percent-clip');
                }
                else {
                    $leftP.rotate(deg - 180);
                    $leftP.parent().removeClass('low-percent-clip');
                    $rightP.parent().removeClass('low-percent-clip');
                }
                $odqBanner.removeClass('hidden');
                $widget.parent().addClass('odq-shown');
            }

            $widget.addClass('overquota').parent().addClass('banner-shown');
            if (!$widget.hasClass('almost-overquota')) {
                $pauseAllBtn.addClass('disabled');
            }
            mega.tpw.updateHeaderAndContent();
        });
    };

    class ProgChart {
        constructor(root) {
            this.domNode = root;
            this.parentNode = this.domNode.parentNode;
            this.text = this.domNode.querySelector(textSelector);
            this.chart = this.domNode.querySelector('.progress-chart');
            this.icon = this.domNode.querySelector('i.status-icon');
            lazy(this, 'chartElems' , () => {
                if (!this.chart) {
                    const dummy = document.createElement('div');
                    return freeze({
                        leftChart: dummy,
                        leftSpan: dummy,
                        rightChart: dummy,
                    });
                }
                const leftChart = this.chart.querySelector('.left-chart');
                const rightChart = this.chart.querySelector('.right-chart');
                if (!leftChart || !rightChart) {
                    if (d) {
                        console.warn('Missing chart elements', this.domNode);
                    }
                    const dummy = document.createElement('div');
                    return freeze({
                        leftChart: dummy,
                        leftSpan: dummy,
                        rightChart: dummy,
                    });
                }
                const leftSpan = leftChart.querySelector('span');
                return freeze({
                    leftChart,
                    leftSpan,
                    rightChart,
                });
            });
        }

        byteProgress(doneBytes, totalBytes) {
            if (this._lastDone === doneBytes && this._lastTotal === totalBytes) {
                return;
            }

            let perc = doneBytes / totalBytes;
            perc = isNaN(perc) ? 0 : Math.round(perc * 100);
            if (perc !== this._lastPerc) {
                this.setChartPercent(perc);
            }

            if (this.text) {
                if (this._lastTotal !== totalBytes) {
                    this._baseText = l.tfw_byte_progress.replace('%2', bytesToSize(totalBytes));
                    delete this._lastDone;
                }
                if (this._lastDone !== doneBytes) {
                    this.text.textContent = this._baseText.replace('%1', bytesToSize(doneBytes));
                }
            }

            this._lastDone = doneBytes;
            this._lastTotal = totalBytes;

            if (doneBytes < totalBytes) {
                if (this.icon) {
                    this.icon.classList.add('hidden');
                }
                this.removeClass('no-progress');
            }
            else if (this.icon) {
                this.icon.classList.remove('hidden');
                this.addClass('no-progress');
            }
            else {
                this.removeClass('no-progress');
            }
        }

        setChartPercent(perc) {
            const deg = 360 * perc / 100;
            this._lastPerc = perc;
            const { leftChart, rightChart, leftSpan } = this.chartElems;
            if (perc < 50) {
                leftSpan.style.transform = `rotate(${180 + deg}deg)`;
                leftChart.classList.add('low-percent-clip');
                rightChart.classList.add('low-percent-clip');
            }
            else {
                leftSpan.style.transform = `rotate(${deg - 180}deg)`;
                leftChart.classList.remove('low-percent-clip');
                rightChart.classList.remove('low-percent-clip');
            }
        }
    }
    Object.setPrototypeOf(ProgChart.prototype, MegaComponent.prototype);

    /**
     * Clear the warnings shown on TPW header
     * @param {Number} type     flag to distinguish upload/download
     */
    this.resetErrorsAndQuotasUI = function(type) {
        if (!type) {
            return;
        }

        $overQuotaBanners.addClass('hidden');
        $widget.removeClass('overquota almost-overquota').parent().removeClass('banner-shown obq-shown odq-shown');
        $pauseAllBtn.removeClass('disabled');
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
        mega.tpw.initDOM();
        var $currWidget = $('.transfer-progress.tpw');
        if (!$currWidget || !$currWidget.length) {
            return null;
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

        $rowsHeader = $('.transfer-progress-head', $widget);
        const $tabsPanel = $('.transfer-tabs-panel', $widget);
        $widgetTabActive = $('.js-tab-transfers', $tabsPanel);
        $widgetTabCompleted = $('.js-tab-completed', $tabsPanel);
        $widgetTabError = $('.js-tab-error', $tabsPanel);
        $widgetFooter = $('.transfer-widget-footer', $widget);
        $odqBanner = $('.odq-banner', $widget.parent());
        $obqBanner = $('.obq-banner', $widget.parent());
        $overQuotaBanners = $().add($odqBanner).add($obqBanner);
        const uploadChartBlock = $widgetFooter[0].querySelector('.transfer-progress-type.upload');
        uploadChart = new ProgChart(uploadChartBlock);
        const downloadChartBlock = $widgetFooter[0].querySelector('.transfer-progress-type.download');
        downloadChart = new ProgChart(downloadChartBlock);
        const allChartBlock = $rowsHeader[0].querySelector('.transfer-progress-type.all-transfers');
        allChart = new ProgChart(allChartBlock);
        $transferTimes = $('.transfer-progress-time', $widget);
        $closeBtn = $('.transfer-progress-icon.tpw-close', $rowsHeader);

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
        if (!$widget || !$widget.length) {
            return;
        }
        const page = String(self.page || '');

        // pages to hide always
        if (page.includes('register') || page.includes('download') || page === 'login') {
            mega.tpw.hideWidget();
            return;
        }

        if (isHiddenForUpgrade && is_fm()) {
            isHiddenForUpgrade = false;
            isHiddenByUser = false;
        }

        if (!isHiddenByUser) {

            if (!page.includes('chat')) {
                mega.tpw.showWidget();
            }

            if (!$widget.parent().hasClass('collapse')) {
                if (page.includes('chat')) {
                    mega.tpw.toggleMinimised();
                    isMinimizedByUser = false;
                }
            }
            else if (!page.includes('chat') && !isMinimizedByUser) {
                mega.tpw.toggleMinimised(true);
            }
            if (mega.tpw.isDialog) {
                mega.tpw.toggleDialog(true);
            }
        }

        if (folderlink) {
            mega.tpw.hideOnboarding();
        }

        return 0xDEAD;
    };

    mBroadcaster.addListener('pagechange', () => {
        delay('tpwviewprep', viewPreparation, 500);
    });
    mBroadcaster.addListener('fm:initialized', viewPreparation);

    var finalizeUpdates = function() {
        if (!mega.tpw.isWidgetVisibile() && !page.includes('download')) {
            mega.tpw.showWidget();
        }
        else {
            mega.tpw.renderView(mega.tpw.currView || mega.tpw.views.ACTIVE, true);
        }
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

        for (var r = 0; r < entriesArray.length; r++) {
            var fName;

            if (type === this.DOWNLOAD) {
                fName = entriesArray[r].zipid ? entriesArray[r].zipname : entriesArray[r].n;
            }
            else {
                fName = entriesArray[r].name;
            }
            const transferId = (type === this.DOWNLOAD ? dlmanager : ulmanager).getGID(entriesArray[r]);
            const rowData = {
                transferId,
                type,
                name: fName,
                gid: transferId,
                size: specifiedSize || entriesArray[r].size,
            };
            if (sizes[transferId] !== undefined) {
                if (type === this.DOWNLOAD) {
                    sizes._dtotal -= sizes[transferId];
                }
                else {
                    sizes._utotal -= sizes[transferId];
                }
            }
            if (type === this.DOWNLOAD) {
                sizes._dtotal += rowData.size;
            }
            else {
                sizes._utotal += rowData.size;
            }
            sizes[transferId] = rowData.size;

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
            this.logger.log('Add:', transferId, rowData.size);
        }

        // for a concurrent batch of adding, we will postpone final calculations to the end.
        delay('tpw:addTimer', () => {
            if (this.currView & this.views.COMPLETE) {
                let viewId = this.views.ACTIVE;
                if (this.currView > this.views.VIEW_MASK) {
                    const currFilter = (this.currView >>> 3) << 3;
                    viewId |= currFilter;
                }
                this.renderView(viewId);
            }
            finalizeUpdates();
        }, 1500);

        for (const row of $tempRows) {
            this.addDOMRow(row);
        }
    };

    this.updateDownloadUpload = function(type, id, perc, bytesLoaded, bytesTotal, kbps, queue_num, startTime) {
        'use strict';
        if (!this.domReady || typeof type === 'undefined' || !id) {
            return;
        }

        if (type === this.DOWNLOAD) {
            kbps *= 1024;
        }

        const transferId = id;
        if (!this.hasDOMRow(transferId)) {
            this.addDownloadUpload(type, (type === this.DOWNLOAD ? dl_queue : ul_queue)[queue_num]);
            return this.updateDownloadUpload(type, transferId, perc, bytesLoaded, bytesTotal, kbps, queue_num);
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
        if (typeof progress[transferId] === 'number') {
            const delta = bytesLoaded - progress[transferId];
            progress[transferId] = bytesLoaded;
            if (type === this.DOWNLOAD) {
                progress._dlLastTick += delta;
                progress._dlTransferred += delta;
            }
            else {
                progress._ulLastTick += delta;
                progress._ulTransferred += delta;
            }
        }
        else {
            progress[transferId] = bytesLoaded;
            if (type === this.DOWNLOAD) {
                progress._dlTransferred += bytesLoaded;
                if (startTime >= lastTime) {
                    progress._dlLastTick += bytesLoaded;
                }
            }
            else {
                progress._ulTransferred += bytesLoaded;
                if (startTime >= lastTime) {
                    progress._ulLastTick += bytesLoaded;
                }
            }
        }
        if (lastTime === 0) {
            lastTime = Date.now();
        }

        this.updateDOMRow(transferId, {
            status: 'progress',
            progress: perc,
            statusText: type === this.DOWNLOAD ? l[1156] : l[1155],
            running: true,
            transferProgress: bytesLoaded,
            transferSpeed: bytesToSpeed(speed),
            timeRemainSecs: speed ? (bytesTotal - bytesLoaded) / speed : -1,
        });
        this.updateHeaderAndContent();
        this.logger.log('Update:', transferId, bytesLoaded);
    };

    this.finishDownloadUpload = function(transferId, entry, handle) {
        'use strict';
        if (!this.domReady || !transferId || !this.hasDOMRow(transferId)) {
            return;
        }

        if (monitors[transferId]) {
            monitors[transferId].abort();
            delete monitors[transferId];
        }

        // for a concurrent batch of finishes, we will postpone final calculations to the end.
        delay('tpw:finishTimer', () => {
            if (this.currView & this.views.ACTIVE && this.rowsLength === this.completeRowsLength) {
                let nextView = mega.tpw.views.COMPLETE;
                if (mega.tpw.currView > mega.tpw.views.VIEW_MASK) {
                    const currFilter = (mega.tpw.currView >>> 3) << 3;
                    nextView |= currFilter;
                }
                mega.tpw.renderView(nextView);
            }
            else {
                this.updateHeaderAndContent();
            }
        }, 400);

        this.updateDOMRow(transferId, {
            noError: true,
            status: 'complete',
            complete: M.getNodeRoot(handle || entry.zipid || entry.id) || true, // If there is a root pass it.
            file: entry.zipname || entry.n || entry.name,
            handle
        });
        const transProg = progress[transferId] || 0;
        const finalSize = entry.size || 0;
        if (transferId[0] === 'u') {
            progress._ulTransferred -= transProg;
            progress._ulTransferred += Math.max(transProg, finalSize);
        }
        else {
            progress._dlTransferred -= transProg;
            progress._dlTransferred += Math.max(transProg, finalSize);
        }
        progress[transferId] = Math.max(transProg, finalSize);
        this.logger.log('Complete:', transferId, transProg, finalSize);
    };

    this.errorDownloadUpload = function(transferId, errorStr, isOverQuota) {
        'use strict';
        if (!this.domReady || !transferId || !this.hasDOMRow(transferId) || this.isRowComplete(transferId)) {
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
            if ($widget.hasClass('almost-overquota')) {
                $widget.removeClass('overquota almost-overquota')
                    .parent().removeClass('banner-shown obq-shown odq-shown');
                $overQuotaBanners.addClass('hidden');
            }
            viewOverQuotaBanner(transferId[0] === 'u' ? this.UPLOAD : this.DOWNLOAD);
            update.overquota = true;
        }
        else {
            update.errored = true;
        }

        this.updateDOMRow(transferId, update);
        this.updateHeaderAndContent();
        this.logger.debug('Error:', transferId, isOverQuota, errorStr);
    };

    this.resumeDownloadUpload = function(transferId) {
        'use strict';
        if (!this.domReady || !transferId || !this.hasDOMRow(transferId) || this.isRowComplete(transferId)) {
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
            statusText: l.tfw_status_queued,
        });
        this.logger.debug('Resume:', transferId);
        // for a concurrent batch of resumes, we will postpone final calculations to the end.
        delay('tpw:resumeTimer', finalizeUpdates, 1500);
    };

    this.pauseDownloadUpload = function(transferId) {
        'use strict';
        if (!this.domReady || !transferId || !this.hasDOMRow(transferId) || this.isRowComplete(transferId)) {
            return;
        }
        const status = this.getRowStatus(transferId);
        if (status && (status.errored || status.overquota)) {
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
            timeRemainSecs: -1,
            transferSpeed: '',
        });
        this.logger.debug('Pause:', transferId);
        delay('tpw:pauseTimer', finalizeUpdates, 1500);
    };

    this.showAlmostOverquota = function() {
        viewOverQuotaBanner(this.UPLOAD);
    };

    /**
     * Removes rows from widget
     * @param {String|Array} rowId  download/upload ID
     */
    this.removeRow = function(rowId) {
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
        if (!this.hasDOMRow(rowId)) {
            return;
        }

        removeRow(rowId);
    };


    this.isWidgetVisibile = function() {
        return $widget.is(':visible');
    };

    this.showWidget = function() {
        init();
        if (!this.domReady || !this.rowsLength) {
            return;
        }
        $widget.removeClass('hidden').parent().removeClass('hidden');
        isHiddenByUser = false;
        this.renderView(this.currView || this.views.ACTIVE, true);
        this.showOnboarding();
    };

    this.hideWidget = function() {
        this.toggleDialog(true);
        $widget.addClass('hidden').removeClass('overquota almost-overquota')
            .parent().addClass('hidden').removeClass('banner-shown obq-shown odq-shown');
        $overQuotaBanners.addClass('hidden');
        this.hideOnboarding();
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

        let nextView = mega.tpw.views.ACTIVE;
        if (mega.tpw.currView > mega.tpw.views.VIEW_MASK) {
            const currFilter = (mega.tpw.currView >>> 3) << 3;
            nextView |= currFilter;
        }
        mega.tpw.renderView(nextView, true);

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
        const { adl, aul, edl, eul, odl, oul, fdl, ful, pdl, pul } = tfsheadupdate.stats;
        data.dl = adl;
        data.ul = aul;
        data.dlDone = fdl;
        data.ulDone = ful;
        data.dlRemain = data.dl - data.dlDone - edl - odl;
        data.ulRemain = data.ul - data.ulDone - eul - oul;
        data.dlBytes = sizes._dtotal;
        data.dlDoneBytes = progress._dlTransferred;
        data.dlP = pdl;
        data.ulP = pul;
        if (!data.dlBytes && !data.dlDoneBytes) {
            data.dlBytes = 1;
            data.dlDoneBytes = 1;
        }
        data.ulBytes = sizes._utotal;
        data.ulDoneBytes = progress._ulTransferred;
        if (!data.ulBytes && !data.ulDoneBytes) {
            data.ulBytes = 1;
            data.ulDoneBytes = 1;
        }
        data.dlOq = odl;
        data.ulOq = oul;
        data.dlErr = edl;
        data.ulErr = eul;
        if (this.d) {
            data.progress = progress;
            data.sizes = sizes;
        }
        return data;
    };

    const updateCharts = (tfStats) => {
        if (tfStats.dl) {
            downloadChart.byteProgress(tfStats.dlDoneBytes, tfStats.dlBytes);
            downloadChart.show();
            downloadChart.toggleClass('paused', !!(tfStats.dlRemain && tfStats.dlRemain === tfStats.dlP));
        }
        else {
            downloadChart.hide();
        }
        if (tfStats.ul) {
            uploadChart.byteProgress(tfStats.ulDoneBytes, tfStats.ulBytes);
            uploadChart.show();
            uploadChart.toggleClass('paused', !!(tfStats.ulRemain && tfStats.ulRemain === tfStats.ulP));
        }
        else {
            uploadChart.hide();
        }
        $(uploadChart.parentNode).toggleClass('hidden', !(this.currView & this.views.ACTIVE));
        allChart.byteProgress(tfStats.dlDoneBytes + tfStats.ulDoneBytes, tfStats.dlBytes + tfStats.ulBytes);
    };

    const updateEta = (now, tfStats) => {
        const dl = Math.max(0, progress._dlLastTick);
        const ul = Math.max(0, progress._ulLastTick);
        if (dl + ul) {
            const timeSpent = (now - lastTime) / 1000;
            progress._samples.push({ dbytes: dl, ubytes: ul, time: timeSpent });
            if (progress._samples.length > 10) {
                progress._samples.shift();
            }
            let totalDBytes = 0;
            let totalUBytes = 0;
            let totalTime = 0;
            for (let i = progress._samples.length; i--;) {
                const { dbytes, ubytes, time } = progress._samples[i];
                totalDBytes += dbytes;
                totalUBytes += ubytes;
                totalTime += time;
            }
            const dspeed = totalDBytes / totalTime;
            const uspeed = totalUBytes / totalTime;
            const remainDBytes = tfStats.dlBytes - tfStats.dlDoneBytes;
            const remainUBytes = tfStats.ulBytes - tfStats.ulDoneBytes;
            if (dspeed === 0 && remainDBytes || uspeed === 0 && remainUBytes) {
                // One type stalled so show estimating string
                $transferTimes.removeClass('hidden').text(l.estimating);
            }
            else {
                const time = Math.max(dspeed ? remainDBytes / dspeed : 0, uspeed ? remainUBytes / uspeed : 0);
                $transferTimes.removeClass('hidden')
                    .text(l.tfw_estimated_time.replace('%s', secondsToCompact(time)));
            }

            lastTime = now;
            progress._dlLastTick = 0;
            progress._ulLastTick = 0;
        }
    };

    let periodic = 10;
    this.updateHeaderAndContent = function() {
        const tfStats = this.getHeadStats();
        if (!tfStats) {
            return;
        }
        const errorCount = tfStats.ulErr + tfStats.ulOq + tfStats.dlErr + tfStats.dlOq;
        if (tfStats.dlDone === tfStats.dl && tfStats.ulDone === tfStats.ul) {
            $transferTimes.addClass('hidden');
            lastTime = 0;
            progress._dlLastTick = 0;
            progress._ulLastTick = 0;
            progress._samples = [];
            $closeBtn.removeClass('hidden');
        }
        else if (errorCount) {
            $closeBtn.addClass('hidden');
            $widgetTabError.removeClass('hidden');
        }
        else if (tfStats.dl + tfStats.ul) {
            $closeBtn.addClass('hidden');
        }
        else {
            $closeBtn.removeClass('hidden');
        }

        updateCharts(tfStats);

        let span = $('.decorator', $widgetTabActive)
            .toggleClass('hidden', !(tfStats.dlRemain + tfStats.ulRemain))[0].querySelector('span');
        span.textContent = tfStats.dlRemain + tfStats.ulRemain;
        span = $('.decorator', $widgetTabCompleted)
            .toggleClass('hidden', !(tfStats.dlDone + tfStats.ulDone))[0].querySelector('span');
        span.textContent = tfStats.dlDone + tfStats.ulDone;
        span = $('.decorator', $widgetTabError).toggleClass('hidden', !errorCount)[0].querySelector('span');
        span.textContent = errorCount;

        const allPaused = (tfStats.dlRemain === 0 || tfStats.dlRemain === tfStats.dlP) &&
            (tfStats.ulRemain === 0 || tfStats.ulRemain === tfStats.ulP);
        const now = Date.now();
        if (this.currView & this.views.ACTIVE && lastTime + 1000 < now) {
            updateEta(now, tfStats);
        }
        if (!(this.currView & this.views.ACTIVE) || allPaused) {
            $transferTimes.addClass('hidden');
            if (allPaused) {
                progress._dlLastTick = 0;
                progress._ulLastTick = 0;
                progress._samples = [];
                lastTime = 0;
            }
        }
        if (allPaused) {
            $pauseAllBtn.addClass('active');
            span = $pauseAllBtn[0].querySelector('span');
            span.textContent = l.transfers_resume_all;
            $('i', $pauseAllBtn).removeClass('icon-pause-thin-outline').addClass('icon-play-thin-outline');
        }
        else {
            $pauseAllBtn.removeClass('active');
            span = $pauseAllBtn[0].querySelector('span');
            span.textContent = l[6993];
            $('i', $pauseAllBtn).addClass('icon-pause-thin-outline').removeClass('icon-play-thin-outline');
        }

        this.updateMinimised(tfStats);

        if (this.d && --periodic === 0) {
            this.logger.debug('Header stats:', JSON.stringify(tfStats));
            periodic = 10;
        }
    };
};
((scope) => {
    'use strict';
    let root;
    let megaList;
    let megaListDsp;
    const megaListItems = new Set();
    const rows = new Map();
    const toAnimate = new Map();
    const animationLength = 400;
    let animateUntil = false;
    let animationTick = 0;
    // Header
    let filterBlock;
    let sortBlock;
    // Body
    let emptyStates;
    // Footer
    let footer;
    let pauseResumeButton;
    let cancelButton;
    // Minimised view
    let collapseText;
    let allTransfersChart;
    let allTransfersStatusIcon;
    let minimisedSubText;

    class MTransferRowActionButton extends MComponent {
        constructor(parent) {
            super();
            this.parent = parent;
            this._state = 'cancel';
            this.attachEvent('click', () => {
                if (this.el.classList.contains('disabled')) {
                    return false;
                }
                const id = this.transferId.split('_').pop();
                const {gid} = this;
                switch (this._state) {
                    case 'restart': {
                        if (this.type === scope.UPLOAD) {
                            if (ulmanager.ulOverStorageQuota) {
                                ulmanager.ulShowOverStorageQuotaDialog();
                                return;
                            }
                        }
                        else if (dlmanager.isOverQuota) {
                            dlmanager.showOverQuotaDialog();
                            return;
                        }
                        fm_tfsresume(gid);
                        break;
                    }
                    case 'pause': {
                        fm_tfspause(gid);
                        if (this.type === scope.UPLOAD) {
                            eventlog(501227);
                        }
                        break;
                    }
                    case 'cancel': {
                        if (this.type === scope.DOWNLOAD) {
                            dlmanager.abort(gid);
                        }
                        else {
                            ulmanager.abort(gid);
                        }
                        // This is completed transfer removal
                        if (this.parent._complete) {
                            eventlog(501087);
                        }
                        tfsheadupdate({c: gid});
                        scope.fadeOutRow(this.transferId);
                        break;
                    }
                    case 'link': {
                        eventlog(501085);
                        const node = M.getNodeByHandle(this.handle || id);
                        if (node) {
                            $.selected = [node.h];
                            M.getLinkAction();
                            if (scope.isDialog) {
                                scope.toggleDialog(true);
                            }
                        }
                        break;
                    }
                    case 'cloud': {
                        eventlog(501086);
                        const node = M.getNodeByHandle(this.handle || id);
                        if (node && node.p) {
                            $.autoSelectNode = node.h;
                            M.openFolder(node.p).always((res) => {
                                if (res && res === EEXIST && selectionManager) {
                                    selectionManager.clear_selection();
                                    selectionManager.add_to_selection($.autoSelectNode, true);
                                    delete $.autoSelectNode;
                                }
                            });
                            if (scope.isDialog) {
                                scope.toggleDialog(true);
                            }
                        }
                        break;
                    }
                }
                return false;
            }, undefined, this.icon);
        }

        buildElement() {
            this.el = document.createElement('button');
            this.el.className = 'mega-component nav-elem icon-only button cancel simpletip';
            this.icon = document.createElement('i');
            this.icon.className = 'left-icon sprite-fm-mono';
            this.el.dataset.simpletipoffset = '5';
            this.el.dataset.simpletipposition = 'top';
            this.el.dataset.simpletipwrapper = '.transfer-progress.tpw';
            this.el.append(this.icon);
        }

        get transferId() {
            return this.parent.transferId;
        }

        get gid() {
            return this.parent.gid;
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
            this.el.classList.remove('restart', 'pause', 'cancel', 'link', 'cloud-folder', 'disabled');
            this.icon.className = 'left-icon sprite-fm-mono';
        }

        statePlay() {
            this.reset();
            this.appendCss('restart');
            this.icon.classList.add('restart', 'icon-play-thin-outline');
            this.el.dataset.simpletip = l[1649];
            this._state = 'restart';
        }

        statePause() {
            this.reset();
            this.appendCss('pause');
            this.icon.classList.add('pause', 'icon-pause-thin-outline');
            this.el.dataset.simpletip = l.tfw_transfer_pause;
            this._state = 'pause';
        }

        stateCancel(string, clear) {
            this.reset();
            this.appendCss('cancel');
            this.icon.classList.add('cancel', clear ? 'icon-eraser-thin-outline' : 'icon-dialog-close-thin');
            this.el.dataset.simpletip = string || 'Cancel';
            this._state = 'cancel';
        }

        stateLink() {
            this.reset();
            this.appendCss('link');
            this.icon.classList.add('link', 'icon-link-thin-outline');
            this.el.dataset.simpletip = l[5622];
            this._state = 'link';
        }

        stateCloud() {
            this.reset();
            this.appendCss('cloud-folder');
            this.icon.classList.add('cloud-folder', 'icon-file-search-01-thin-outline');
            this.el.dataset.simpletip = l.tfw_action_location;
            this._state = 'cloud';
        }
    }

    class MTransferRow extends MComponent {
        constructor({transferId, type, name, gid, size}) {
            super();
            this.type = type;
            this.transferId = transferId;
            this.gid = gid;
            this.el.setAttribute('id', transferId);
            this.appendCss(type === scope.UPLOAD ?
                'upload icon-arrow-up-thin-outline' : 'download icon-arrow-down-thin-outline');
            this.expanded = scope.isDialog;
            this.progress = 0;
            this.status = 'inqueue';
            this.file = name;
            if (gid[0] === 'z') {
                this.el.setAttribute('zippo', 'y');
            }
            this.actionLeft.stateCancel();
            this.actionMiddle.stateCancel();
            this.actionMiddle.hidden = true;
            this.actionRight.stateCancel();
            this.actionRight.hidden = true;
            this._running = false;
            this._paused = false;
            this._complete = false;
            this.errored = false;
            this.overquota = false;
            this._size = size;
            this.transferProgress = 0;
            this.statusText = l.tfw_status_queued;
            if (type === scope.UPLOAD) {
                this.statusIcon.classList.add('icon-arrow-up-thin-outline');
                this.speedIcon.classList.add('icon-arrow-up-thin-outline');
            }
            else {
                this.statusIcon.classList.add('icon-arrow-down-thin-outline');
                this.speedIcon.classList.add('icon-arrow-down-thin-outline');
            }

            this.attachEvent('mouseover', () => {
                if (this.complete) {
                    const handle = this.type === mega.tpw.UPLOAD
                        ? this._handle
                        : this.transferId.split('_').pop();

                    if (M.getNodeRoot(handle) === M.RubbishID) {
                        this.actionLeft.hidden = true;
                        this.actionMiddle.hidden = true;
                    }
                    else if (type === scope.UPLOAD) {
                        this.actionLeft.hidden = false;
                        this.actionMiddle.hidden = false;
                    }
                }
            });
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

        get name() {
            return this._name;
        }

        get transferSize() {
            return this._size;
        }

        get status() {
            return this._status;
        }

        get remainSeconds() {
            return this._remainSeconds;
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
            this._status = status;
        }

        set statusText(text) {
            this.statusEl.textContent = text;
        }

        get statusText() {
            return this.statusEl.textContent;
        }

        set file(file) {
            if (file === this._name) {
                return;
            }
            this.icon.className = `item-type-icon icon-${fileIcon({ name: file })}-24`;
            this.fileType.textContent = file;
            this.itemType.textContent = filetype(file);
            this._name = file;
        }

        set handle(handle) {
            this._handle = handle;
            if (handle && M.getNodeByHandle(handle)) {
                const pathItems = M.getPath(handle);
                const nr = M.getNodeRoot(handle);
                if (nr === 's4') {
                    pathItems.pop();
                }
                pathItems.shift();
                if (nr === 'shares') {
                    // Remove user from shares paths.
                    pathItems.splice(-2, 1);
                }

                if (!pathItems.length) {
                    return;
                }
                const tip = [];
                let parentPrefix = '';
                for (let i = pathItems.length; i--;) {
                    const pathItemHandle = pathItems[i];
                    const { name, prefix } = mega.ui.mInfoPanel.MegaInfoBlock.prototype.pathInfo(pathItemHandle);
                    if (name) {
                        tip.push(name);
                        parentPrefix = prefix;
                    }
                }
                if (tip.length > 5) {
                    tip.splice(1, tip.length - 5);
                    tip.splice(1, 0, '...');
                }
                this.itemPath.simpletip = tip.join(' > ');
                this.itemPath.text = tip.pop();
                this.itemPath.href = `${parentPrefix}${pathItems[0]}`;
                this.itemPath.show();
            }
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
                this.actionRight.stateCancel(l.msg_dlg_cancel);
                this.actionRight.hidden = false;
                this._paused = true;
                this._running = false;
                delete this._transferStr;
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
                this._overquota = false;
                this._errored = false;
                return;
            }
            this.actionLeft.stateCancel();
            this.actionRight.hidden = true;
            this._running = false;
        }

        set complete(complete) {
            if (this.type === scope.UPLOAD) {
                this.actionLeft.stateCloud();
                this.actionLeft.hidden = false;
                if (typeof complete === 'string' && complete !== 'shares') {
                    this.actionMiddle.stateLink();
                    this.actionMiddle.hidden = false;
                }
            }
            else if (this.type === scope.DOWNLOAD) {
                this.actionLeft.hidden = true;
            }
            this.actionRight.stateCancel(l.tfw_action_clear, true);
            this.actionRight.hidden = false;
            this.progressBar.classList.add('hidden');
            this._complete = true;
            this._running = false;
            this._paused = false;
            this._overquota = false;
            this._errored = false;
            this._transferStr = bytesToSize(this._size);
            this.size.textContent = this._transferStr;
            if (scope.isDialog) {
                this.statusText = this.type === scope.DOWNLOAD ? l.tfw_status_downloaded : l.upload_status_uploaded;
            }
            else {
                this.statusText = this._transferStr;
            }
        }

        set errored(error) {
            if (error && this._complete) {
                return;
            }
            this._errored = error;
            if (error) {
                this.progressBar.classList.add('hidden');
                delete this._transferStr;
                this.size.textContent = bytesToSize(this._size);
            }
        }

        set overquota(overquota) {
            if (overquota && this._complete) {
                return;
            }
            this._overquota = overquota;
            if (overquota) {
                this.progressBar.classList.add('hidden');
                delete this._transferStr;
                this.size.textContent = bytesToSize(this._size);
            }
        }

        get errored() {
            return this._errored;
        }

        get overquota() {
            return this._overquota;
        }

        set noError(noError) {
            this.status = 'inqueue';
            this.overquota = false;
            this.errored = false;
            this.progressBar.classList.remove('hidden');
            this.actionLeft.el.classList.remove('disabled');
            this.statusText = l.tfw_status_queued;
        }

        set expanded(isExpanded) {
            if (isExpanded) {
                this.el.classList.remove('sprite-fm-mono');
                this.statusIcon.classList.remove('hidden');
                this.size.classList.remove('hidden');
                this.timeRemain.classList.remove('hidden');
                this.speed.classList.remove('hidden');
                this.itemType.classList.remove('hidden');
                if (this.complete) {
                    this.statusText = this.type === scope.DOWNLOAD ? l.tfw_status_downloaded : l.upload_status_uploaded;
                }
                else if (this.status === 'inqueue') {
                    this.statusText = l.tfw_status_queued;
                }
                else if (!this.overquota && !this.errored && !this.paused) {
                    this.statusText = this.type === scope.DOWNLOAD ? l[1156] : l[1155];
                }
            }
            else {
                this.el.classList.add('sprite-fm-mono');
                this.statusIcon.classList.add('hidden');
                this.size.classList.add('hidden');
                this.timeRemain.classList.add('hidden');
                this.speed.classList.add('hidden');
                this.itemType.classList.add('hidden');
                if (this._transferStr) {
                    this.statusText = this._status === 'inqueue' ? l.tfw_status_queued : this._transferStr;
                }
            }
        }

        set transferProgress(progressed) {
            this._transferStr = l.tfw_byte_progress
                .replace('%1', bytesToSize(progressed)).replace('%2', bytesToSize(this._size));
            this.size.textContent = this._transferStr;
            if (!scope.isDialog) {
                this.statusText = this._transferStr;
            }
        }

        set transferSpeed(speedText) {
            if (speedText) {
                this.speedIcon.classList.remove('hidden');
            }
            else {
                this.speedIcon.classList.add('hidden');
            }
            const text = this.speed.querySelector('.speed-text');
            text.textContent = speedText;
            text.classList.remove('hidden');
        }

        set timeRemainSecs(secondsRemain) {
            this.timeRemain.textContent = secondsRemain > -1 ? secondsToCompact(secondsRemain) : '';
            this._remainSeconds = secondsRemain;
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = `transfer-task-row sprite-fm-mono progress`;
            const nameBlock = document.createElement('div');
            nameBlock.className = 'transfer-name-block';
            this.el.appendChild(nameBlock);
            this.icon = document.createElement('i');
            nameBlock.appendChild(this.icon);
            this.fileType = document.createElement('div');
            this.fileType.className = 'transfer-filetype-txt';
            nameBlock.appendChild(this.fileType);
            this.size = document.createElement('div');
            this.size.className = 'transfer-size';
            this.el.appendChild(this.size);
            this.speed = document.createElement('div');
            this.speedIcon = document.createElement('i');
            this.speedIcon.className = 'sprite-fm-mono hidden';
            this.speed.appendChild(this.speedIcon);
            const text = document.createElement('div');
            text.className = 'speed-text';
            this.speed.appendChild(text);
            this.speed.className = 'transfer-speed';
            this.el.appendChild(this.speed);
            const statusBlock = document.createElement('div');
            statusBlock.className = 'transfer-task-status';
            this.statusIcon = document.createElement('i');
            this.statusIcon.className = 'sprite-fm-mono';
            statusBlock.appendChild(this.statusIcon);
            this.statusEl = document.createElement('div');
            statusBlock.appendChild(this.statusEl);
            this.el.appendChild(statusBlock);
            this.timeRemain = document.createElement('div');
            this.timeRemain.className = 'transfer-time';
            this.el.appendChild(this.timeRemain);
            this.itemType = document.createElement('div');
            this.itemType.className = 'transfer-item-type';
            this.el.appendChild(this.itemType);
            this.itemPath = new MegaLink({
                parentNode: this.el,
                type: 'text',
                componentClassname: 'transfer-item-path',
                simpletip: l[164],
            });
            this.itemPath.on('beforeRedirect', () => {
                scope.toggleDialog(true);
            });
            this.itemPath.hide();

            this.transferActions = document.createElement('div');
            this.transferActions.className = 'transfer-task-actions';
            this.el.appendChild(this.transferActions);
            this.actionLeft = new MTransferRowActionButton(this);
            this.transferActions.appendChild(this.actionLeft.el);
            this.actionMiddle = new MTransferRowActionButton(this);
            this.transferActions.appendChild(this.actionMiddle.el);
            this.actionRight = new MTransferRowActionButton(this);
            this.transferActions.appendChild(this.actionRight.el);
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'transfer-progress-bar';
            this.el.appendChild(this.progressBar);
            this.progressPercent = document.createElement('div');
            this.progressPercent.className = 'transfer-progress-bar-pct';
            this.progressBar.append(this.progressPercent);
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
    scope.views = freeze({
        ACTIVE: 1,
        COMPLETE: 2,
        ERROR: 4,
        VIEW_MASK: 7,
    });
    scope.filterMask = freeze({
        UPLOAD: 8,
        DOWNLOAD: 16,
    });
    const headers = freeze({
        [scope.views.ACTIVE]: [
            'transfer-header-name',
            'transfer-header-size',
            'transfer-header-speed',
            'transfer-header-status',
            'transfer-header-time',
            'transfer-header-type',
            'transfer-header-actions',
        ],
        [scope.views.COMPLETE]: [
            'transfer-header-name',
            'transfer-header-size',
            'transfer-header-status',
            'transfer-header-type',
            'transfer-header-location',
            'transfer-header-actions',
        ],
        [scope.views.ERROR]: [
            'transfer-header-name',
            'transfer-header-size',
            'transfer-header-status',
            'transfer-header-type',
            'transfer-header-actions',
        ],
    });
    scope.currView = scope.views.ACTIVE;
    let currSort = false;
    let currSortDir = 1;
    const dsp = () => {
        if (megaListDsp) {
            return;
        }
        megaListDsp = tSleep(0.3);
        megaListDsp.then(() => {
            megaListDsp = false;
            scope.renderView(scope.currView, true);
        });
    };
    scope.d = !!localStorage.dtpw;
    scope.logger = MegaLogger.getLogger('tpw', {
        minLogLevel() {
            return scope.d ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
        }
    });
    scope.addDOMRow = (data) => {
        if (!scope.domReady || !data.transferId) {
            return false;
        }
        if (rows.has(data.transferId)) {
            rows.get(data.transferId).detachEl();
        }
        const row = new MTransferRow(data);
        rows.set(data.transferId, row);
        dsp();
        return true;
    };
    let reorderSet = new Set();
    let reorderPromise = false;
    const cancelReorder = () => {
        if (reorderPromise) {
            reorderPromise.abort();
            reorderPromise = false;
        }
    };
    const doReorder = () => {
        cancelReorder();
        if (scope.isDialog && currSort || !(scope.currView & scope.views.ACTIVE)) {
            // Don't mess with fixed sorting.
            reorderSet = new Set();
            return;
        }
        if (!megaList.items.length || !reorderSet.size) {
            return;
        }
        const top = new Set(megaList.items.slice(0, 5));
        for (const item of reorderSet) {
            if (!top.has(item)) {
                megaList.repositionItem(item, 0);
            }
        }
        reorderSet = new Set();
    };
    const eventuallyCheckOrder = (id) => {
        if (!(scope.currView & scope.views.ACTIVE)) {
            return;
        }
        reorderSet.add(id);
        if (reorderSet.size > 4) {
            doReorder();
            return;
        }
        if (reorderPromise) {
            return;
        }
        reorderPromise = tSleep(0.5);
        reorderPromise.then(() => doReorder());
    };
    scope.updateDOMRow = (id, update) => {
        if (!scope.domReady || !rows.has(id)) {
            return false;
        }
        const row = rows.get(id);
        for (const key in update) {
            if (update.hasOwnProperty(key)) {
                if (key === 'complete') {
                    if (scope.currView & scope.views.COMPLETE) {
                        dsp();
                    }
                    else {
                        megaListItems.delete(id);
                        megaList.remove(id);
                    }
                    reorderSet.delete(id);
                }
                if (key === 'errored' || key === 'overquota') {
                    if (scope.currView & scope.views.ERROR) {
                        dsp();
                    }
                    else {
                        megaListItems.delete(id);
                        megaList.remove(id);
                    }
                    reorderSet.delete(id);
                }
                if (key === 'paused') {
                    reorderSet.delete(id);
                }
                if (key === 'noError' && (scope.currView & scope.views.ERROR)) {
                    megaListItems.delete(id);
                    megaList.remove(id);
                }
                if (key === 'progress') {
                    eventuallyCheckOrder(id);
                }
                row[key] = update[key];
                if (megaListItems.size === 0) {
                    // Render empty state
                    dsp();
                }
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
        megaListItems.delete(id);
        megaList.remove(id);
        rows.get(id).detachEl();
        toAnimate.delete(id);
        rows.delete(id);
        if (megaListItems.size === 0) {
            scope.renderView(scope.currView, true);
        }
        reorderSet.delete(id);
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
    scope.isRowComplete = (id) => rows.has(id) && rows.get(id).complete;

    let widgetRoot;
    const listeners = {};
    const pos = {};
    const tpwLeftVar = '--tpw-left';
    const tpwTopVar = '--tpw-top';
    const keepWidgetInView = () => {
        const rect = widgetRoot.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - rect.width);
        const maxTop = Math.max(0, window.innerHeight - rect.height);
        const left = Math.max(0, Math.min(rect.left, maxLeft));
        const top = Math.max(0, Math.min(rect.top, maxTop));
        if (left === rect.left && top === rect.top) {
            return;
        }
        pos.lastX = left / window.innerWidth * 100;
        pos.lastY = top / window.innerHeight * 100;
        widgetRoot.style.setProperty(tpwLeftVar, `${pos.lastX}%`);
        widgetRoot.style.setProperty(tpwTopVar, `${pos.lastY}%`);
    };
    scope.draggable = (off) => {
        if (off) {
            if (listeners.mousedown) {
                widgetRoot.querySelector('.transfer-progress-head')
                    .removeEventListener('mousedown', listeners.mousedown);
                delete listeners.mousedown;
                if (listeners.mousemove) {
                    document.removeEventListener('mousemove', listeners.mousemove);
                    document.removeEventListener('mouseup', listeners.mouseup);
                    delete listeners.mouseup;
                    delete listeners.mousemove;
                }
            }
            widgetRoot.classList.remove('dragging');
            return;
        }
        if (listeners.mousedown) {
            return;
        }

        listeners.mousedown = (ev) => {
            if (ev.button !== 0 || ev.target.closest('button')) {
                return false;
            }
            const rect = widgetRoot.getBoundingClientRect();
            pos.startX = ev.clientX;
            pos.startY = ev.clientY;
            pos.startTime = Date.now();
            pos.dragMoved = false;
            pos.initial = !widgetRoot.style.getPropertyValue(tpwLeftVar);
            pos.origX = rect.left / window.innerWidth * 100;
            pos.origY = rect.top / window.innerHeight * 100;
            pos.maxX = (window.innerWidth - widgetRoot.offsetWidth) / window.innerWidth * 100;
            pos.maxY = (window.innerHeight - widgetRoot.offsetHeight) / window.innerHeight * 100;
            widgetRoot.style.setProperty(tpwLeftVar, `${pos.origX}%`);
            widgetRoot.style.setProperty(tpwTopVar, `${pos.origY}%`);
            widgetRoot.classList.add('dragging');
            listeners.mousemove = (ev) => {
                if (pos.startTime && pos.startTime + 100 > Date.now()) {
                    return;
                }
                delete pos.startTime;
                pos.dragMoved = true;
                requestAnimationFrame(() => {
                    const dx = (ev.clientX - pos.startX) / window.innerWidth * 100;
                    const dy = (ev.clientY - pos.startY) / window.innerHeight * 100;
                    pos.lastX = pos.origX + dx;
                    pos.lastY = pos.origY + dy;
                    widgetRoot.style.setProperty(tpwLeftVar, `${Math.max(0, Math.min(pos.lastX, pos.maxX))}%`);
                    widgetRoot.style.setProperty(tpwTopVar, `${Math.max(0, Math.min(pos.lastY, pos.maxY))}%`);
                });
            };
            listeners.mouseup = (ev) => {
                document.removeEventListener('mousemove', listeners.mousemove);
                document.removeEventListener('mouseup', listeners.mouseup);
                delete listeners.mouseup;
                delete listeners.mousemove;
                widgetRoot.classList.remove('dragging');
                if (widgetRoot.classList.contains('collapse') && !pos.dragMoved) {
                    if (pos.initial) {
                        widgetRoot.style.removeProperty(tpwLeftVar);
                        widgetRoot.style.removeProperty(tpwTopVar);
                    }
                    scope.toggleMinimised(true);
                    eventlog(501225);
                }
                else if (pos.dragMoved && Math.hypot(ev.clientX - pos.startX, ev.clientY - pos.startY) >= 20) {
                    eventlog(501222);
                }
                delete pos.dragMoved;
                delete pos.startTime;
                delete pos.initial;
            };
            document.addEventListener('mousemove', listeners.mousemove);
            document.addEventListener('mouseup', listeners.mouseup);
            scope.hideOnboarding();
        };
        widgetRoot.querySelector('.transfer-progress-head').addEventListener('mousedown', listeners.mousedown);
    };

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
        toAnimate.set(id, 0);
        const wasAnimating = !!animateUntil;
        animateUntil = Date.now() + animationLength;
        if (!wasAnimating) {
            animate();
        }
    };
    const onSortButtonClick = (ev) => {
        const transferColumns = sortBlock.querySelectorAll('button.transfer-column');
        const currIcon = ev.currentTarget.querySelector('i');
        if (ev.currentTarget.classList.contains('sorted')) {
            // Handle direction change
            if (currSortDir === 1) {
                currIcon.classList.remove('icon-arrow-up-thin-outline');
                currIcon.classList.add('icon-arrow-down-thin-outline');
            }
            else {
                currIcon.classList.remove('icon-arrow-down-thin-outline');
                currIcon.classList.add('icon-arrow-up-thin-outline');
            }
            scope.setSort(ev.currentTarget.dataset.sortid, currSortDir * -1);
        }
        else {
            for (let i = transferColumns.length; i--;) {
                const column = transferColumns[i];
                if (column.classList.contains('sorted')) {
                    column.classList.remove('sorted');
                    const icon = column.querySelector('i');
                    icon.classList.remove('icon-arrow-down-thin-outline');
                    icon.classList.add('hidden');
                    break;
                }
            }
            ev.currentTarget.classList.add('sorted');
            currIcon.classList.add('icon-arrow-up-thin-outline');
            currIcon.classList.remove('hidden');
            scope.setSort(ev.currentTarget.dataset.sortid, 1);
        }
    };
    const bindEvents = () => {
        const transferColumns = sortBlock.querySelectorAll('button.transfer-column');
        for (let i = transferColumns.length; i--;) {
            transferColumns[i].addEventListener('click', (ev) => onSortButtonClick(ev));
        }
        widgetRoot.addEventListener('click', (ev) => {
            if (!widgetRoot.classList.contains('expanded')) {
                return;
            }
            if (mega.ui.menu.name && mega.ui.menu.name === 'filter-dropdown') {
                mega.ui.menu.hide();
            }
            if (ev.target === widgetRoot) {
                scope.toggleDialog(true);
            }
        });
        mBroadcaster.addListener('textEditor:open', () => {
            scope.hideOnboarding();
        });
        mBroadcaster.addListener('fileversioning:open', () => {
            scope.hideOnboarding();
        });
    };
    const initFilterChip = () => {
        const chipHolder = mCreateElement('div', { 'class': 'fm-filter-chips' });
        filterBlock.appendChild(mCreateElement('div', { 'class': 'tpw-filter-chips-wrapper' }, [chipHolder]));
        const title = mCreateElement('div', { 'class': 'fm-filter-chip-button-text' }, [
            document.createTextNode(l.tfw_filter_all)
        ]);
        const button = mCreateElement('div', { 'class': 'fm-filter-chip-button filter-transfer-type'}, [
            title,
            mCreateElement('i', { 'class': 'sprite-fm-mono icon-chevron-down-thin-outline' })
        ]);
        chipHolder.appendChild(button);
        const { UPLOAD, DOWNLOAD } = scope.filterMask;
        const clearBtn = new MegaButton({
            parentNode: chipHolder,
            componentClassname: 'fm-filter-reset slim text-icon',
            text: l.filter_chip_reset,
            onClick: () => {
                let newView = scope.currView;
                if (scope.currView & UPLOAD) {
                    newView ^= UPLOAD;
                }
                if (scope.currView & DOWNLOAD) {
                    newView ^= DOWNLOAD;
                }
                scope.renderView(newView);
                title.textContent = l.tfw_filter_all;
                button.classList.remove('selected');
                clearBtn.hide();
                eventlog(501237);
            }
        });
        clearBtn.hide();
        const menuContent = document.createElement('div');
        menuContent.className = 'tpw-filter';
        const upload = new MegaButton({
            parentNode: menuContent,
            type: 'fullwidth',
            componentClassname: 'text-icon context-button',
            text: l.tfw_filter_uploads,
            onClick: () => {
                let newView = scope.currView ^ UPLOAD;
                if (scope.currView & UPLOAD) {
                    title.textContent = l.tfw_filter_all;
                    clearBtn.hide();
                }
                else if (scope.currView & DOWNLOAD) {
                    title.textContent = l.tfw_filter_uploads;
                    newView ^= DOWNLOAD;
                }
                else {
                    title.textContent = l.tfw_filter_uploads;
                    clearBtn.show();
                }
                if (newView > scope.views.VIEW_MASK) {
                    button.classList.add('selected');
                }
                else {
                    button.classList.remove('selected');
                }
                scope.renderView(newView);
                mega.ui.menu.hide();
                eventlog(501238);
            }
        });
        const download = new MegaButton({
            parentNode: menuContent,
            type: 'fullwidth',
            componentClassname: 'text-icon context-button',
            text: l.tfw_filter_downloads,
            rightIcon: '',
            onClick: () => {
                let newView = scope.currView ^ DOWNLOAD;
                if (scope.currView & DOWNLOAD) {
                    title.textContent = l.tfw_filter_all;
                    clearBtn.hide();
                }
                else if (scope.currView & UPLOAD) {
                    title.textContent = l.tfw_filter_downloads;
                    newView ^= UPLOAD;
                }
                else {
                    title.textContent = l.tfw_filter_downloads;
                    clearBtn.show();
                }
                if (newView > scope.views.VIEW_MASK) {
                    button.classList.add('selected');
                }
                else {
                    button.classList.remove('selected');
                }
                scope.renderView(newView);
                mega.ui.menu.hide();
                eventlog(501239);
            }
        });
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (mega.ui.menu.name) {
                mega.ui.menu.hide();
                return;
            }
            upload.rightIcon = '';
            download.rightIcon = '';
            if (scope.currView & UPLOAD) {
                upload.rightIcon = 'sprite-fm-mono icon-check-thin-outline';
            }
            else if (scope.currView & DOWNLOAD) {
                download.rightIcon = 'sprite-fm-mono icon-check-thin-outline';
            }
            mega.ui.menu.show({
                name: 'filter-dropdown',
                container: widgetRoot.querySelector('.float-widget.tpw'),
                classList: ['transfers-filter-dropdown'],
                event,
                eventTarget: event.currentTarget,
                contents: [menuContent],
            });
            return false;
        });
    };
    scope.initDOM = () => {
        if (scope.domReady) {
            return;
        }
        widgetRoot = mCreateElement('div', { 'class': 'transfer-root hidden' });
        document.body.appendChild(widgetRoot);
        $(widgetRoot).safeAppend(translate(pages.transfers));
        root = document.querySelector('.tpw .widget-body-container .transfer-progress-widget-body');
        megaList = new MegaList(root, {
            itemRenderFunction(id) {
                if (rows.has(id)) {
                    return rows.get(id).el;
                }
            },
            itemRemoveFunction(id) {
                if (rows.has(id)) {
                    rows.get(id).el.remove();
                }
            },
            preserveOrderInDOM: true,
            usingNativeScroll: false,
            itemHeight: 48,
            renderAdapter: new MegaList.RENDER_ADAPTERS.List({ usingNativeScroll: false }),
            perfectScrollOptions: {
                'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
                'minScrollbarLength': 20,
            },
        });
        megaList.initialRender();
        scope.draggable();

        filterBlock = widgetRoot.querySelector('.transfer-panel-filters');
        sortBlock = widgetRoot.querySelector('.transfer-panel-sort');
        emptyStates = widgetRoot.querySelectorAll('.transfer-widget-empty');
        footer = widgetRoot.querySelector('.transfer-widget-footer');
        pauseResumeButton = footer.querySelector('.transfer-state-btn');
        cancelButton = footer.querySelector('.transfer-clear-all-icon');
        collapseText = widgetRoot.querySelector('.collapse-status-block .transfer-status-title');
        allTransfersChart = widgetRoot.querySelector('.all-transfers');
        allTransfersStatusIcon = allTransfersChart.querySelector('.status-icon');
        minimisedSubText = widgetRoot.querySelector('.collapse-status-block .transfer-progress-subtext');

        bindEvents();
        initFilterChip();
    };
    const isValidActiveRow = (row) => {
        return !row.complete && !row.overquota && !row.errored;
    };
    const isValidCompleteRow = (row) => {
        return row.complete;
    };
    const isValidErrorRow = (row) => {
        return row.overquota || row.errored;
    };
    const checkRender = (id, row, viewId, validFn) => {
        if (scope.isDialog) {
            if (viewId & scope.filterMask.UPLOAD) {
                if (row.type === scope.UPLOAD && validFn(row)) {
                    megaListItems.add(id);
                    return true;
                }
            }
            else if (viewId & scope.filterMask.DOWNLOAD) {
                if (row.type === scope.DOWNLOAD && validFn(row)) {
                    megaListItems.add(id);
                    return true;
                }
            }
            else if (validFn(row)) {
                megaListItems.add(id);
                return true;
            }
        }
        else if (validFn(row)) {
            megaListItems.add(id);
            return true;
        }
        return false;
    };
    const statusOrder = freeze({
        inqueue: 0,
        progress: 1,
        paused: 2,
        complete: 3,
        error: 4,
        overquota: 5,
    });
    const sorts = freeze({
        name: (a, b, dir) => {
            return M.compareStrings(a.name, b.name, dir);
        },
        size: (a, b, dir) => {
            if (a.transferSize === b.transferSize) {
                return sorts.name(a, b, dir);
            }
            return (a.transferSize < b.transferSize ? -1 : 1) * dir;
        },
        type: (a, b, dir) => {
            const atype = filetype(a.name);
            const btype = filetype(b.name);
            if (atype === btype) {
                return sorts.name(a, b, dir);
            }
            return M.compareStrings(atype, btype, dir);
        },
        status: (a, b, dir) => {
            if (statusOrder[a.status] === statusOrder[b.status]) {
                if (a.type === b.type) {
                    return sorts.name(a, b, dir);
                }
                else if (a.type === scope.DOWNLOAD) {
                    return dir;
                }
                return -dir;
            }
            return (statusOrder[a.status] < statusOrder[b.status] ? -1 : 1) * dir;
        },
        timeRemain: (a, b, dir) => {
            const remainA = a.remainSeconds;
            const remainB = b.remainSeconds;
            if (typeof remainA === 'number' && typeof remainB === 'number') {
                if (remainA === remainB) {
                    return sorts.name(a, b, dir);
                }
                if (remainA === -1) {
                    return dir;
                }
                else if (remainB === -1) {
                    return -1 * dir;
                }
                return (remainA < remainB ? -1 : 1) * dir;
            }
            if (typeof remainA === 'number') {
                return dir;
            }
            else if (typeof remainB === 'number') {
                return -1 * dir;
            }
            return 0;
        },
    });
    const sortEids = freeze({
        name: 501228,
        size: 501229,
        type: 501230,
        status: 501231,
        timeRemain: 501232,
    });
    const doSort = (sort, dir) => {
        const arr = [...megaListItems];
        if (!sort) {
            return arr;
        }
        const sortFn = sorts[sort];
        if (!sortFn) {
            return arr;
        }
        if (!dir) {
            dir = 1;
        }
        megaList.batchRemove(arr);
        return arr.sort((a, b) => {
            const rowA = rows.get(a);
            const rowB = rows.get(b);
            if (!rowA || !rowB) {
                return 0;
            }
            return sortFn(rowA, rowB, dir);
        });
    };
    scope.setSort = (sort, dir = 1) => {
        if (currSort === sort && dir === currSortDir || typeof sorts[sort] !== 'function') {
            return;
        }
        currSort = sort;
        currSortDir = dir;
        scope.renderView(scope.currView, true);
        if (sortEids[currSort]) {
            eventlog(sortEids[currSort]);
        }
    };
    const showEmptyState = (emptyStates, viewId) => {
        for (let i = emptyStates.length; i--;) {
            const state = emptyStates[i];
            if (viewId & scope.views.ACTIVE) {
                if (state.classList.contains('tab-transfers')) {
                    state.classList.remove('hidden');
                }
                else {
                    state.classList.add('hidden');
                }
            }
            else if (viewId & scope.views.COMPLETE) {
                if (state.classList.contains('tab-completed')) {
                    state.classList.remove('hidden');
                }
                else {
                    state.classList.add('hidden');
                }
            }
            else if (viewId & scope.views.ERROR) {
                if (state.classList.contains('tab-failed')) {
                    state.classList.remove('hidden');
                }
                else {
                    state.classList.add('hidden');
                }
            }
        }
    };
    scope.selectTab = (viewId) => {
        const tabs = widgetRoot.querySelectorAll('.mega-tab-option');
        for (let i = tabs.length; i--;) {
            const tab = tabs[i];
            if (viewId & scope.views.ACTIVE && tab.classList.contains('js-tab-transfers')) {
                tab.classList.add('selected');
            }
            else if (viewId & scope.views.COMPLETE && tab.classList.contains('js-tab-completed')) {
                tab.classList.add('selected');
            }
            else if (viewId & scope.views.ERROR && tab.classList.contains('js-tab-error')) {
                tab.classList.add('selected');
            }
            else {
                tab.classList.remove('selected');
            }
        }
    };
    scope.renderView = (viewId, updated) => {
        if (scope.currView === viewId && !updated) {
            return;
        }
        if (megaListDsp) {
            megaListDsp.abort();
            megaListDsp = false;
        }
        const toRemove = [];
        if (viewId & scope.views.ACTIVE) {
            megaListItems.clear();
            for (const [id, row] of rows) {
                if (!checkRender(id, row, viewId, isValidActiveRow)) {
                    toRemove.push(id);
                }
            }
            pauseResumeButton.classList.remove('hidden');
            const cancelI = cancelButton.querySelector('i');
            cancelI.classList.add('icon-dialog-close-thin');
            cancelI.classList.remove('icon-eraser-thin-outline');
            cancelButton.querySelector('.text-box-wrapper span').textContent = l[6991];
            cancelButton.classList.remove('hidden', 'clear-rows');
        }
        else if (viewId & scope.views.COMPLETE) {
            megaListItems.clear();
            for (const [id, row] of rows) {
                if (!checkRender(id, row, viewId, isValidCompleteRow)) {
                    toRemove.push(id);
                }
            }
            pauseResumeButton.classList.add('hidden');
            const cancelI = cancelButton.querySelector('i');
            cancelI.classList.add('icon-eraser-thin-outline');
            cancelI.classList.remove('icon-dialog-close-thin');
            cancelButton.querySelector('.text-box-wrapper span').textContent = l.tfw_clear_complete;
            cancelButton.classList.remove('hidden');
            cancelButton.classList.add('clear-rows');
        }
        else if (viewId & scope.views.ERROR) {
            megaListItems.clear();
            for (const [id, row] of rows) {
                if (!checkRender(id, row, viewId, isValidErrorRow)) {
                    toRemove.push(id);
                }
            }
            pauseResumeButton.classList.add('hidden');
            const cancelI = cancelButton.querySelector('i');
            cancelI.classList.add('icon-dialog-close-thin');
            cancelI.classList.remove('icon-eraser-thin-outline');
            cancelButton.querySelector('.text-box-wrapper span').textContent = l.tfw_clear_errored;
            cancelButton.classList.remove('hidden');
            cancelButton.classList.add('clear-rows');
        }
        if (viewId !== scope.currView) {
            cancelReorder();
            reorderSet = new Set();
        }
        scope.currView = viewId;
        if (megaListItems.size) {
            if (!widgetRoot.classList.contains('collapse')) {
                footer.classList.remove('hidden');
            }
            root.classList.remove('hidden');
            for (let i = emptyStates.length; i--;) {
                emptyStates[i].classList.add('hidden');
            }
            if (scope.isDialog) {
                filterBlock.classList.remove('hidden');
            }
            sortBlock.classList.remove('hidden');
        }
        else {
            footer.classList.add('hidden');
            root.classList.add('hidden');
            if (viewId < scope.views.VIEW_MASK) {
                filterBlock.classList.add('hidden');
            }
            sortBlock.classList.add('hidden');
            showEmptyState(emptyStates, viewId);
        }
        if (toRemove.length) {
            megaList.batchRemove(toRemove);
        }
        const sort = scope.isDialog ? currSort : false;
        megaList.batchReplace(doSort(sort, currSortDir));
        megaListDsp = false;
        if (scope.isDialog) {
            scope.showHeaders();
        }
        scope.selectTab(viewId);
        megaList.resized();
        scope.logger.log('Rendered view %s items:', viewId, megaListItems.size);
        scope.updateHeaderAndContent();
    };
    scope.showHeaders = () => {
        const sel = headers[scope.currView & scope.views.VIEW_MASK];
        const nodes = widgetRoot.querySelectorAll('.transfer-column');
        for (let i = nodes.length; i--;) {
            let found = false;
            for (let j = sel.length; j--;) {
                if (nodes[i].classList.contains(sel[j])) {
                    found = true;
                    break;
                }
            }
            if (found) {
                nodes[i].classList.remove('hidden');
            }
            else {
                nodes[i].classList.add('hidden');
            }
        }
    };
    scope.rebindListEvents = () => {
        megaList.scrollUpdate();
        megaList._bindEvents();
    };
    scope.isDialog = false;
    scope.toggleDialog = (hide) => {
        if (scope.isDialog !== hide) {
            return;
        }
        const i = widgetRoot.querySelector('.js-tpm-open i');
        const collapseBtn = widgetRoot.querySelector('.tpw-c-e.collapse');
        if (hide) {
            let left;
            let top;
            if (pos.lastX === undefined) {
                left = 'calc(100% - 12px - var(--tpw-width))';
                top = 'calc(100% - 12px - var(--tpw-height))';
            }
            else {
                left = `${Math.max(0, Math.min(pos.lastX, pos.maxX))}%`;
                top = `${Math.max(0, Math.min(pos.lastY, pos.maxY))}%`;
            }
            widgetRoot.style.removeProperty(tpwLeftVar);
            widgetRoot.style.removeProperty(tpwTopVar);
            widgetRoot.style.setProperty('--tpw-end-left', left);
            widgetRoot.style.setProperty('--tpw-end-top', top);
            tSleep(0.15).then(() => {
                widgetRoot.classList.remove('shrink');
                if (pos.lastX) {
                    widgetRoot.style.setProperty(tpwLeftVar, left);
                    widgetRoot.style.setProperty(tpwTopVar, top);
                }
                widgetRoot.style.removeProperty('--tpw-end-left');
                widgetRoot.style.removeProperty('--tpw-end-top');
            });
            widgetRoot.classList.add('shrink');
            widgetRoot.classList.remove('expanded');
            scope.draggable();
            if (!$.dialog) {
                fm_hideoverlay();
            }
            megaList.options.itemHeight = 48;
            i.classList.remove('icon-contract-thin-outline');
            i.classList.add('icon-expand-thin-outline');
            collapseBtn.classList.remove('hidden');
            filterBlock.classList.add('hidden');
            if (mega.ui.menu.name && mega.ui.menu.name === 'filter-dropdown') {
                mega.ui.menu.hide();
            }
        }
        else {
            const { left, top } = widgetRoot.getBoundingClientRect();
            widgetRoot.classList.remove('draggable');
            widgetRoot.style.setProperty(tpwLeftVar, `${left}px`);
            widgetRoot.style.setProperty(tpwTopVar, `${top}px`);
            widgetRoot.classList.add('expanded');
            scope.draggable(true);
            fm_showoverlay();
            scope.showHeaders();
            megaList.options.itemHeight = 54;
            i.classList.remove('icon-expand-thin-outline');
            i.classList.add('icon-contract-thin-outline');
            collapseBtn.classList.add('hidden');
            filterBlock.classList.remove('hidden');
            if ($.dialog === 'onboardingDialog') {
                closeDialog();
            }
        }
        scope.isDialog = !scope.isDialog;
        for (const [, row] of rows) {
            row.expanded = !hide;
        }
        tSleep(0.2).then(() => {
            megaList.resized();
        });
        scope.renderView(scope.currView, true);
    };
    scope.toggleMinimised = (expand) => {
        if (scope.isDialog || widgetRoot.classList.contains('collapse') !== !!expand) {
            return;
        }
        const headerCollapseSection = widgetRoot.querySelector('.widget-collapse');
        if (expand) {
            headerCollapseSection.classList.add('hidden');
            root.parentNode.classList.remove('hidden');
            if (megaListItems.size) {
                footer.classList.remove('hidden');
            }
            widgetRoot.classList.remove('collapse');
            widgetRoot.querySelector('.transfer-tabs-panel').classList.remove('hidden');
            widgetRoot.querySelector('.transfer-progress-icon.expand').classList.add('hidden');
            widgetRoot.querySelector('.transfer-progress-icon.collapse').classList.remove('hidden');
            widgetRoot.querySelector('.js-tpm-open').classList.remove('hidden');
            tSleep(0.15).then(() => {
                keepWidgetInView();
                if (megaListItems.size) {
                    megaList.resized();
                }
            });
            scope.hideOnboarding();
            eventlog(501072);
        }
        else {
            headerCollapseSection.classList.remove('hidden');
            root.parentNode.classList.add('hidden');
            footer.classList.add('hidden');
            widgetRoot.classList.add('collapse');
            widgetRoot.querySelector('.transfer-tabs-panel').classList.add('hidden');
            widgetRoot.querySelector('.transfer-progress-icon.expand').classList.remove('hidden');
            widgetRoot.querySelector('.transfer-progress-icon.collapse').classList.add('hidden');
            widgetRoot.querySelector('.js-tpm-open').classList.add('hidden');
            eventlog(501073);
        }
        scope.updateHeaderAndContent();
    };
    scope.updateMinimised = (tfStats) => {
        if (!widgetRoot.classList.contains('collapse')) {
            return;
        }

        const statusIcons = [
            'icon-check-circle-regular-solid',
            'icon-alert-circle-regular-solid',
            'icon-pause-circle-regular-solid'
        ];
        for (let i = statusIcons.length; i--;) {
            allTransfersStatusIcon.classList.remove(statusIcons[i]);
        }
        const all = tfStats.dl + tfStats.ul;
        if (widgetRoot.classList.contains('banner-shown') && !widgetRoot.querySelector('.almost-overquota')) {
            allTransfersStatusIcon.classList.add(statusIcons[1]);
            allTransfersStatusIcon.classList.remove('hidden');
            collapseText.textContent = widgetRoot.classList.contains('obq-shown') ? l[20666] : l[1010];
            minimisedSubText.textContent = l.tfw_overquota_subtext;
            minimisedSubText.classList.remove('hidden');
        }
        else if (tfStats.dlErr + tfStats.ulErr + tfStats.dlOq + tfStats.ulOq) {
            // Something hit an error state
            allTransfersStatusIcon.classList.add(statusIcons[1]);
            allTransfersStatusIcon.classList.remove('hidden');
            allTransfersChart.classList.add('no-progress');
            const dlErr = tfStats.dlErr + tfStats.dlOq;
            const ulErr = tfStats.ulErr + tfStats.ulOq;
            const allErr = dlErr + ulErr;

            if (dlErr === tfStats.dl && ulErr === tfStats.ul) {
                // Only errors remain
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_error, allErr).replace('%1', allErr);
                minimisedSubText.classList.add('hidden');
            }
            else if (tfStats.dlRemain + tfStats.ulRemain === 0) {
                // Everything is finished or errored
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_error, all).replace('%1', allErr);
                minimisedSubText.textContent = mega.icu.format(l.tfw_mini_subtext_success, all)
                    .replace('%1', tfStats.dlDone + tfStats.ulDone);
                minimisedSubText.classList.remove('hidden');
                minimisedSubText.classList.remove('error');
            }
            else {
                // Some still transferring rest errored
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_progress, all)
                    .replace('%1', tfStats.dlDone + tfStats.ulDone);
                minimisedSubText.textContent = mega.icu.format(l.tfw_mini_subtext_error, allErr);
                minimisedSubText.classList.remove('hidden');
                minimisedSubText.classList.add('error');
            }
        }
        else if (tfStats.dlRemain + tfStats.ulRemain === 0) {
            // All transfers completed.
            allTransfersChart.classList.add('no-progress');
            if (tfStats.dlDone || tfStats.ulDone) {
                // Some remain on the widget
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_complete, tfStats.dl + tfStats.ul)
                    .replace('%1', tfStats.dlDone + tfStats.ulDone);
                allTransfersStatusIcon.classList.add(statusIcons[0]);
                allTransfersStatusIcon.classList.remove('hidden');
            }
            else {
                // All cleared
                collapseText.textContent = l.tfw_no_transfers;
                allTransfersStatusIcon.classList.add('hidden');
            }
            minimisedSubText.classList.add('hidden');
        }
        else if (tfStats.dl || tfStats.ul) {
            if (tfStats.dlP === tfStats.dlRemain && tfStats.ulP === tfStats.ulRemain) {
                // All paused
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_paused, all)
                    .replace('%1', tfStats.dlDone + tfStats.ulDone);
                allTransfersStatusIcon.classList.add(statusIcons[2]);
                allTransfersStatusIcon.classList.remove('hidden');
                allTransfersChart.classList.add('no-progress');
            }
            else {
                // Progressing
                collapseText.textContent = mega.icu.format(l.tfw_mini_lbl_progress, all)
                    .replace('%1', tfStats.dlDone + tfStats.ulDone);
                allTransfersChart.classList.remove('no-progress');
                allTransfersStatusIcon.classList.add('hidden');
            }
            minimisedSubText.classList.add('hidden');
        }
        else {
            // No transfers
            allTransfersChart.classList.add('no-progress');
            allTransfersStatusIcon.classList.add('hidden');
            minimisedSubText.classList.add('hidden');
        }
    };
    scope.showOnboarding = () => {
        if (!scope.canShowOnboarding()) {
            return;
        }
        mega.ui.onboarding.forceSection('tpw');
    };
    scope.canShowOnboarding = () => {
        return !(!widgetRoot || !u_attr || u_attr.since > 178e10 || !mega.ui.onboarding || $.dialog || slideshowid ||
            fileversioning && fileversioning.isOpen || scope.isDialog || folderlink);
    };
    scope.hideOnboarding = () => {
        if (mega.ui.onboarding && mega.ui.onboarding.currentSectionName === 'tpw') {
            mega.ui.onboarding.forceSection();
            closeDialog();
        }
    };
    scope.clearCurrentView = () => {
        if (scope.currView & scope.views.ACTIVE) {
            return;
        }
        const cb = (id) => {
            const row = rows.get(id);
            const {gid} = row;
            if (row.type === scope.DOWNLOAD) {
                dlmanager.abort(gid);
            }
            else {
                ulmanager.abort(gid);
            }
            tfsheadupdate({c: gid});
            scope.removeRow(id);
        };
        if (scope.currView & scope.views.ERROR) {
            scope.applyToRows(cb, scope.TYPE_ERRORED);
            scope.applyToRows(cb, scope.TYPE_OVERQUOTA);
            eventlog(501236);
        }
        else if (scope.currView & scope.views.COMPLETE) {
            scope.applyToRows(cb, scope.TYPE_COMPLETE);
            eventlog(501235);
        }
    };
    scope.getRowStatus = (id) => {
        if (scope.hasDOMRow(id)) {
            const { running, paused, complete, errored, overquota, statusText } = rows.get(id);
            return freeze({ running, paused, complete, errored, overquota, statusText });
        }
        return false;
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
