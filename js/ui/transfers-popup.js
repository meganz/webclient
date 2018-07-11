/**
 * Ongoing transfers popup dialog
 * Account->Settings->Advanced->Transfers->Tooltip notification
 */
mega.ui.tpp = function () {
    "use strict";

    var opts = {
        dlg: {
            $: {},
            cached: false,
            visible: false,
            enabled: true,
            dl: {
                $: {},
                class: '.download',
                initialized: false,
                paused: []// ids of paused dl items
            },
            ul: {
                $: {},
                class: '.upload',
                initialized: false,
                paused: []// ids of paused ul items
            }
        },
        block: ['dl', 'ul'],
        duration: 500,
        queue: {
            ul: {
                index: 0,
                total: 0,
                progress: 0,
                bps: 0,
                time: 0,// Start time in ms
                curr: {},
                fileName: '',
                currSpeed: -1
            },
            dl: {
                index: 0,
                total: 0,
                progress: 0,
                bps: 0,
                time: 0,// Start time in ms
                curr: {},
                fileName: '',
                currSpeed: -1
            }
        }
    };

    var isCached = function isCached() {
        return opts.dlg.cached;
    };

    /**
     * Set total number of items in queue
     * @param {Number} value Number of items +/-
     * @param {String} bl i.e. ['dl', 'ul'] download/upload block
     */
    var setTotal = function setTotal(value, bl) {
        var total = opts.queue[bl].total;

        if (value) {
            if (value > 0 || value < 0 && total > 1) {
                opts.queue[bl].total += value;
            }
        }
        else {
            opts.queue[bl].total = 0;
        }
    };

    /**
     * Get total number of items in queue
     * @param {String} bl i.e. ['dl', 'ul'] download/upload block
     * @returns {Number} Items in queue
     */
    var getTotal = function getTotal(bl) {
        var result = opts.queue[bl].total;

        return result;
    };

    /**
     * Set number of items currently pending in queue
     * @param {Number} percent Global progress in percents
     * @param {String} blk i.e. ['dl', 'ul'] download/upload block
     */
    var setTotalProgress = function setTotalProgress(percent, blk) {
        opts.queue[blk].progress = percent;
    };

    /**
     * Set number of items currently pending in queue
     * @param {String} bl i.e. ['dl', 'ul'] download/upload block
     */
    var getProgress = function getProgress(bl) {
        var result = opts.queue[bl].progress;
        return result;
    };

    /**
     * Get visible status for transfers popup dialog
     * @returns {Boolean} Is visible or not
     */
    var isVisible = function isVisible() {
        return opts.visible;
    };

    /**
     * Set visible status for popup dialog
     * @param {Boolean} value i.e. [true, false], related to fmconfig.tpp value
     */
    var setStatus = function setStatus(value) {
        opts.visible = value;
    };

    /**
     * Check is tpp enabled
     * @returns {Boolean} Is enabled or not, related to fmconfig.tpp value
     */
    var isEnabled = function isEnabled() {
        return opts.enabled;
    };

    /**
     * Set tpp enabled
     * @param {Boolean} value To enable or not
     */
    var setEnabled = function setEnabled(value) {
        opts.enabled = value;
    };

    /**
     * * Shows transfers popup dialog
     */
    var show = function show() {
        var visible = isVisible();
        var enabled = isEnabled();
        var overquota = dlmanager.isOverQuota || ulmanager.ulOverStorageQuota;
        var hasTransfers = M.currentdirid !== 'transfers' && M.hasPendingTransfers();

        if (isCached() && enabled && !visible && hasTransfers && !overquota) {
            if (getTotal('ul') > 0 || getTotal('dl') > 0) {
                opts.dlg.$.show(opts.duration);
                setStatus(true);
            }
        }
    };

    /**
     * Hide transfers popup dialog
     */
    var hide = function hide() {
        var $tppDlg = opts.dlg.$;
        var visible = isVisible();

        if (isCached() && !$.isEmptyObject($tppDlg) && visible) {
            $tppDlg.hide(opts.duration);
            setStatus(false);
        }
    };

    /**
     * Shows transfers popup dialog, download or upload block
     * @param {String} block i.e ['dl', 'ul']
     */
    var showBlock = function showBlock(block) {
        var $item = opts.dlg[block].$;

        if (isCached() && $item.is(':hidden')) {
            $item.removeClass('hidden');
            setStatus(true);
        }
    };

    /**
     * Hides transfers popup dialog, download or upload block
     * @param {String} block i.e ['dl', 'ul']
     */
    var hideBlock = function hideBlock(block) {
        if (opts.dlg[block].$.addClass) {
            opts.dlg[block].$.addClass('hidden');
        }
        else {
            console.error("FIXME: TypeError: opts.dlg[block].$.addClass is not a function");
        }
    };

    /**
     * Get index of latest started dl/ul item from queue
     * @param {String} blk i.e. ['dl', 'ul']
     */
    var getIndex = function getIndex(blk) {
        var result = opts.queue[blk].index;

        return result;
    };

    var getFileName = function getFileName(blk) {
        return opts.queue[blk].fileName;
    };

    /**
     * Set dl/ul start time
     * @param {Number} value Timestamp in ms
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var setTime = function setTime(value, blk) {
        opts.queue[blk].time = value;
    };

    /**
     * Get dl/ul start time
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var getTime = function getTime(blk) {
        var result = opts.queue[blk].time;

        return result;
    };

    /**
     * Set index of latest started dl/ul item from queue
     * @param {Number} value Index of current dl/ul file
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var setIndex = function setIndex(value, blk) {
        var index = opts.queue[blk].index;
        var total = opts.queue[blk].total;

        if (value) {
            if (value > 0 && index < total || value < 0 && index > 1) {
                opts.queue[blk].index += value;
            }
        }
        else {
            opts.queue[blk].index = 0;
        }
    };

    /**
     * Set number of dl/ul bytes for given id
     * @param {Number} id Id of dl/ul
     * @param {Number} value dl/ul number of bytes
     * @param {String} blk i.e ['dl', 'ul'] download or upload
     * @param {Object} qe Queue Entry, either dl_queue or ul_queue instance for id
     */
    var setTransfered = function setTransfered(id, value, blk, qe, actualSpeed) {

        if (id === -1) {
            opts.queue[blk].curr = {};
        }
        else {
            opts.queue[blk].curr[id] = value;
        }
        if (actualSpeed) {
            opts.queue[blk].currSpeed = actualSpeed;
        }
        if (qe) {
            var name = qe.zipname || qe.n || qe.name;

            if (name && opts.dlg[blk].$.name) {
                opts.dlg[blk].$.name.text(name);
            }
        }
    };

    var drawInit = function drawInit(blk) {
        var name = '';
        var total = 0;
        var index = 0;
        var type = '';

        setTotal(M.pendingTransfers, blk);
        total = getTotal(blk).toString();
        setIndex(1, blk);
        index = getIndex(blk);
        setTime(Date.now(), blk);
        name = getFileName(blk);

        // Situation when switching from paused import file to clouddrive
        if (name === '' && blk === 'dl' && typeof fdl_queue_var !== 'undefined') {
            name = Object(fdl_queue_var).name;
        }
        type = ext[fileext(name)];

        if (typeof type === 'undefined') {
            type = ext['*'][0];// general
        }

        opts.dlg[blk].$.num.text(total);
        opts.dlg[blk].$.name.text(name);
        opts.dlg[blk].$.ibLeft.text(l[5528]);
        opts.dlg[blk].$.crr.text(index);
        opts.dlg[blk].$.tfi
            .removeClass()
            .addClass('transfer-filetype-icon ' + type + ' file');

        opts.dlg[blk].initialized = true;
    };

    /**
     * Set state to paused for given dl/ul
     * @param {String} id ul/dl item id
     * @param {String} blk i.e. ['dl', 'ul']
     */
    var pause = function pause(id, blk) {
        console.log('tpp.pause');

        if (!opts.dlg[blk].initialized) {
            drawInit(blk);
        }

        opts.dlg[blk].paused.push(id);
        opts.dlg[blk].$.stxt.text('');
        opts.dlg[blk].$.spd.text(l[1651]);
    };

    var getPausedNum = function getPausedNum(blk) {
        console.log('tpp.getPaused');

        return opts.dlg[blk].paused.length;
    };

    /** Remove unpaused gid from queue
     * @param {String} id ul/dl item id
     * @param {String} blk i.e. ['dl', 'ul']
     */
    var resume = function resume(id, blk) {
        console.log('tpp.resume');
        var arr = opts.dlg[blk].paused;

        arr.splice($.inArray(id, arr), 1);
    };

    /**
     * In case that user paused one of items in the dl/ul queue after some time
     * when all non-paused items dl/ul is finished TPP must be updated
     * with file name of paused item with appropriate status 'Paused'
     * @param {Object} queue Item queue
     * @param {String} blk i.e. ['dl', 'ul']
     */
    var statusPaused = function statusPaused(queue, blk) {
        console.log('tpp.statusPaused');
        var index = 0;
        var total = 0;
        var name = '';
        var item = {};
        var qLen = 0;
        var len = 0;
        var ulQLen = 0;
        var dlQLen = 0;
        var glb = Object.keys(GlobalProgress);
        var pausedNum = getPausedNum(blk);// Number of paused items

        if (glb.length) {
            qLen = glb.length;// Total dl/ul items in queue
            var tmp = JSON.stringify(glb).match(/ul_/g);

            if (tmp) {
                ulQLen = tmp.length;// Number of uploading items
            }
            dlQLen = qLen - ulQLen;
            len = blk === 'dl' ? dlQLen : ulQLen;
        }

        if (pausedNum && pausedNum >= len) {// Update TPP
            item = queue[0];
            name = item.zipid ? item.zipname : item.n;
            index = getIndex(blk) + 1;
            total = getTotal(blk);

            if (index > total) {
                index = total;
            }

            opts.dlg[blk].$.crr.text(index);
            opts.dlg[blk].$.stxt.text('');
            opts.dlg[blk].$.spd.text(l[1651]);
            opts.dlg[blk].$.name.text(name);// file name
        }
    };

    /**
     * Get number of dl/ul bytes for given id
     * @param {String} blk i.e ['dl', 'ul'] download or upload
     * @return {Number} Amount of transfered data
     */
    var getTransfered = function getTransfered(blk) {
        var obj = opts.queue[blk].curr;
        var result = 0;

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                result += obj[key];

            }
        }

        return result;
    };

    /**
     * Calculates avg speed for block
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     * @returns {Number} dl/ul average speed in bytes per second
     */
    var getAvgSpeed = function getAvgSpeed(blk) {
        if (opts.queue[blk].currSpeed !== -1) {
            return opts.queue[blk].currSpeed;
        }
        var result = 0;
        var speed = getTransfered(blk);
        // var time = Math.ceil((Date.now() - getTime(blk)) / 1000);// Seconds
        var time = (Date.now() - getTime(blk)) / 1000;// Seconds

        result = Math.floor(speed / time);

        return result;
    };

    /**
     * Updates progress bar of transfers popup diaog, with cumulative percentage for dl/ul
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var updateBlock = function updateBlock(blk) {

        if (!Object(opts.dlg[blk].$).prg) {
            console.error("FIXME: TypeError: Cannot read property 'css' of undefined");
            return false;
        }

        if (!opts.dlg[blk].initialized) {
            drawInit(blk);
        }

        var index = getIndex(blk);
        var len = getTotal(blk).toString();
        var perc = getProgress(blk).toString();
        var speed;
        var avgSpeed = getAvgSpeed(blk);

        speed = numOfBytes(avgSpeed, 1);
        if (speed.size === 0) {
            opts.dlg[blk].$.stxt.text('');
            opts.dlg[blk].$.spd.text(l[1042]);
        }
        else {
            opts.dlg[blk].$.stxt.text(speed.unit + '\u2215' + 's');
            opts.dlg[blk].$.spd.text(speed.size);
        }

        opts.dlg[blk].$.prg.css('width', perc + '%');
        opts.dlg[blk].$.num.text(len);
        opts.dlg[blk].$.crr.text(index);
    };

    /**
     * Updates current and total items in queue for dl/ul
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var updateIndexes = function updateIndexes(blk) {
        var index = getIndex(blk);
        var tot = getTotal(blk).toString();

        opts.dlg[blk].$.num.text(tot);
        opts.dlg[blk].$.crr.text(index);
    };
    /**
     * Initialize transfer popup dialogs progress bar, file icon, name, speed,
     * current file index and total number of files in queue of dl or ul block
     * @param {Object} queue Download or upload queue
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var _init = function _init(queue, blk) {
        var name = getFileName(blk);
        var index = getIndex(blk).toString();
        var total = getTotal(blk).toString();
        var type = ext[fileext(name)];
        var perc = getProgress(blk);

        if (typeof type === 'undefined') {
            type = ext['*'][0];// general
        }

        opts.dlg[blk].$.name.text(name);
        opts.dlg[blk].$.crr.text(index);
        opts.dlg[blk].$.num.text(total);
        opts.dlg[blk].$.prg.css('width', perc + '%');
        opts.dlg[blk].$.spd.text(l[1042]);
        opts.dlg[blk].$.stxt.text('');
        opts.dlg[blk].$.ibLeft.text(l[5528]);
        opts.dlg[blk].$.tfi
            .removeClass()
            .addClass('transfer-filetype-icon ' + type + ' file');

        opts.dlg[blk].initialized = true;
    };

    /**
     * Shows TPP as soon as file or folder is picked
     * @param {String} bl Download or upload block i.e. ['dl', 'ul']
     */
    var started = function started(bl) {
        if (!getIndex(bl) && isEnabled()) {
            resetBlock(bl);
            showBlock(bl);
            opts.dlg.$.show(opts.duration);
        }
    };

    /**
     * Cleanup all un-necessary elements on instant initialization
     * @param {String} bl
     */
    var resetBlock = function resetBlock(bl) {
        opts.dlg[bl].$.name.text('');
        opts.dlg[bl].$.crr.text('');
        opts.dlg[bl].$.num.text('');
        opts.dlg[bl].$.prg.css('width', 0 + '%');
        opts.dlg[bl].$.spd.text(l[1042]);
        opts.dlg[bl].$.stxt.text('');
        opts.dlg[bl].$.tfi.removeClass();
        opts.dlg[bl].$.ibLeft.text('');
    };

    /**
     * Show tpp popup and dl/ul block
     * @param {Object} queue Download or upload queue
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     */
    var start = function start(queue, blk) {
        if (isCached()) {
            if (!getIndex(blk)) {
                setIndex(1, blk);
            }
            if (getIndex(blk) === 1) {
                _init(queue, blk);
                showBlock(blk);
                show();
            }
        }
    };

    var reset = function reset(blk) {
        if (isCached()) {
            setTime(0, blk);
            setIndex(0, blk);
            setTotal(0, blk);
            setTotalProgress(0, blk);
            setTransfered(-1, 0, blk);
            hideBlock(blk);
            opts.dlg[blk].paused = [];
        }
    };

    mBroadcaster.addListener('fm:initialized', function() {
        var blk = '';
        var isEph = isEphemeral();

        // Check if tpp used before, if not force usage
        if (typeof fmconfig.tpp === 'undefined' || isEph) {
            mega.config.set('tpp', 1);
            setEnabled(1);
        }
        else {
            setEnabled(fmconfig.tpp);
        }

        // Cache dialog
        opts.dlg.$ = $('.transfer-widget.popup');
        opts.dlg.dl.$ = opts.dlg.$.find('.download');
        opts.dlg.ul.$ = opts.dlg.$.find('.upload');

        // Cache block elements
        for (var i = 0; i < opts.block.length; i++) {
            blk = opts.block[i];
            opts.dlg[blk].$.name = opts.dlg[blk].$.find('.tranfer-filetype-txt');
            opts.dlg[blk].$.crr = opts.dlg[blk].$.find('.current');
            opts.dlg[blk].$.num = opts.dlg[blk].$.find('.number');
            opts.dlg[blk].$.prg = opts.dlg[blk].$.find('.progress span');
            opts.dlg[blk].$.spd = opts.dlg[blk].$.find('.speed').text(l[1042]);
            opts.dlg[blk].$.stxt = opts.dlg[blk].$.find('.speed-txt');
            opts.dlg[blk].$.ibLeft = opts.dlg[blk].$.find('.info-block.left .of');
            opts.dlg[blk].$.tfi = opts.dlg[blk].$.find('.transfer-filetype-icon');
        }

        // Cached
        opts.dlg.cached = true;

        // add event listener for click on tpp
        opts.dlg.$.rebind('click.tppOn', function () {
            M.openFolder('transfers', true);
        });
    });

    mBroadcaster.addListener('fmconfig:tpp', function(value) {

        setEnabled(value);
        if (isEphemeral()) {
            setEnabled(1);
        }
        var visible = isVisible();

        if (!value && visible) {
            hide();
        }
        else if (value && !visible) {
            show();
        }
    });

    return {
        shouldProcessData: function() {
            // TODO: This damn thing needs an huge rewrite!
            return this.isVisible() && this.isCached() && this.isEnabled();
        },
        isCached: isCached,
        isEnabled: isEnabled,
        show: show,
        hide: hide,
        pause: pause,
        resume: resume,
        statusPaused: statusPaused,
        start: start,
        showBlock: showBlock,
        hideBlock: hideBlock,
        setTotal: setTotal,
        isVisible: isVisible,
        updateBlock: updateBlock,
        updateIndexes: updateIndexes,
        setTotalProgress: setTotalProgress,
        setIndex: setIndex,
        setTransfered: setTransfered,
        setTime: setTime,
        getTime: getTime,
        started: started,
        reset: reset
    };

}();// END tpp, transfers popup dialog
