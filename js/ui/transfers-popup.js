/**
 * Ongoing transfers popup dialog
 * Account->Settings->Advanced->Transfers->Tooltip notification
 */
mega.ui.tpp = (function () {
    var self = this;

    var opts = {
        dlg: {
            $: {},
            visible: false,
            enabled: true,
            dl: {
                $: {},
                class: '.download'
            },
            ul: {
                $: {},
                class: '.upload'
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
                curr: {}
            },
            dl: {
                index: 0,
                total: 0,
                progress: 0,
                bps: 0,
                time: 0,// Start time in ms
                curr: {}
            }
        }
    };

    /**
     * Set total number of items in queue
     * @param {Number} value Number of items +/-
     * @param {String} bl i.e. ['dl', 'ul'] download/upload block
     */
    var setTotal = function setTotal(value, bl) {
        if (value) {
            opts.queue[bl].total += value;
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
     * Shows transfers popup dialog
     */
    var show = function show() {
        var visible = isVisible();
        var enabled = isEnabled();

        if (enabled && !visible && (M.currentdirid !== 'transfers') && mega.utils.hasPendingTransfers()) {
            opts.dlg.$.show(opts.duration);
            setStatus(true);
        }
    };

    /**
     * Hide transfers popup dialog
     */
    var hide = function hide() {
        var $tppDlg = opts.dlg.$;
        var visible = isVisible();

        if (!$.isEmptyObject($tppDlg) && visible) {
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

        if ($item.is(':hidden')) {
            $item.removeClass('hidden');
        }
    };

    /**
     * Hides transfers popup dialog, download or upload block
     * @param {String} block i.e ['dl', 'ul']
     */
    var hideBlock = function hideBlock(block) {
        opts.dlg[block].$.addClass('hidden');
    };

    /**
     * Get index of latest started dl/ul item from queue
     * @param {String} block i.e. ['dl', 'ul']
     */
    var getIndex = function getIndex(block) {
        var result = opts.queue[block].index;

        return result;
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
     * @param {String} block i.e. ['dl', 'ul'] download or upload
     */
    var setIndex = function setIndex(value, block) {
        if (value) {
            opts.queue[block].index += value;
        }
        else {
            opts.queue[block].index = 0;
        }
    };

    /**
     * Set number of dl/ul bytes for given id
     * @param {Number} id Id of dl/ul
     * @param {Number} value dl/ul number of bytes
     * @param {String} blk i.e ['dl', 'ul'] download or upload
     */
    var setTransfered = function setTransfered(id, value, blk) {

        if (id === -1) {
            opts.queue[blk].curr = {};
        }
        else {
            opts.queue[blk].curr[id] = value;
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
     * Calculates avg spped for block
     * @param {String} blk i.e. ['dl', 'ul'] download or upload
     * @returns {Number} dl/ul average speed in bytes per second
     */
    var getAvgSpeed = function getAvgSpeed(blk) {
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
        var len = getTotal(blk).toString();
        var index = getIndex(blk).toString();
        var perc = getProgress(blk).toString();
        var avgSpeed = getAvgSpeed(blk);
        var speed;

        speed = numOfBytes(avgSpeed, 1);
        opts.dlg[blk].$.prg.css('width', perc + '%');
        opts.dlg[blk].$.num.text(len);
        opts.dlg[blk].$.crr.text(index);
        if (speed.size === 0) {
            opts.dlg[blk].$.stxt.text('');
            opts.dlg[blk].$.spd.text(l[1042]);
        }
        else {
            opts.dlg[blk].$.stxt.text(speed.unit + '\u2215' + 's');
            opts.dlg[blk].$.spd.text(speed.size);
        }
    };

    /**
     * Initialize transfer popup dialogs progress bar, file icon, name, speed,
     * current file index and total number of files in queue of dl or ul block
     * @param {Object} queue Download or upload queue
     * @param {String} bl i.e. ['dl', 'ul'] download or upload
     */
    var _init = function _init(queue, bl) {
        // var dlg = (bl === 'dl') ? '$dlBlock' : '$ulBlock';
        var name = '';
        var index = getIndex(bl).toString();
        var total = getTotal(bl).toString();
        var type = ext[fileext(name)];
        var perc = getProgress(bl);

        if (typeof type === 'undefined') {
            type = ext['*'][0];// general
        }

        if (bl === 'dl') {
            name = queue.zipname || queue.n || queue.name;
        }
        else {
            name = queue.name;
        }

        opts.dlg[bl].$.name.text(name);
        opts.dlg[bl].$.crr.text(index);
        opts.dlg[bl].$.num.text(total);
        opts.dlg[bl].$.prg.css('width', perc + '%');
        opts.dlg[bl].$.spd.text(l[1042]);
        opts.dlg[bl].$.stxt.text('');
        opts.dlg[bl].$.tfi
            .removeClass()
            .addClass('transfer-filetype-icon ' + type + ' file');
    };

    /**
     * Show tpp popup and dl/ul block
     * @param {Object} queue Download or upload queue
     * @param {String} bl i.e. ['dl', 'ul'] download or upload
     */
    var start = function start(queue, bl) {
        setIndex(1, bl);
        if (getIndex(bl) === 1) {
            _init(queue, bl);
            showBlock(bl);
            show();
        }
    };

    var reset = function reset(blk) {
        hideBlock(blk);
        setTime(0, blk);
        setIndex(0, blk);
        setTotal(0, blk);
        setTotalProgress(0, blk);
        setTransfered(-1, 0, blk);
    };

    mBroadcaster.addListener('fm:initialized', function() {
        var blk = '';
        var isEph = isEphemeral();

        // Check if tpp used before, if not force usage
        if ((typeof fmconfig.tpp === 'undefined') || isEph) {
            mega.config.set('tpp', true);
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
            opts.dlg[blk].$.tfi = opts.dlg[blk].$.find('.transfer-filetype-icon');
        }

        // If ephemeral, then hide close button for ongoing transfers popup dialog
        if (isEph) {
            $('.transfer-widget.popup .fm-dialog-close.small').addClass('hidden');
        }
        else {

            // Close button, Ongoing Transfers Popup Dialog
            $('.transfer-widget.popup .fm-dialog-close.small').rebind('click.tpp_close', function() {
                msgDialog('confirmation', '', l[16328], l[16329], function(e) {
                    if (e) {
                        mega.config.setn('tpp', false);
                    }
                });
            });
        }
    });

    mBroadcaster.addListener('fmconfig:tpp', function(value) {

        opts.enabled = value;
        if (isEphemeral()) {
            opts.enabled = true;
        }
        var visible = isVisible();

        if (!$.isEmptyObject(opts.dlg.$)) {
            if (!value && visible) {
                hide();
            }
            else if (value && !visible) {
                show();
            }
        }
    });

    return {
        show: show,
        hide: hide,
        start: start,
        showBlock: showBlock,
        hideBlock: hideBlock,
        setTotal: setTotal,
        isVisible: isVisible,
        updateBlock: updateBlock,
        setTotalProgress: setTotalProgress,
        setIndex: setIndex,
        setTransfered: setTransfered,
        setTime: setTime,
        getTime: getTime,
        reset: reset
    };

})();// END tpp, transfers popup dialog
