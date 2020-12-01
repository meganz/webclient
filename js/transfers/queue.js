/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2016 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

function MegaQueue(worker, limit, name) {
    var parentLogger;
    this._limit = limit || 5;
    this._queue = [];
    this._running = 0;
    this._worker = worker;
    this._noTaskCount = 0;
    this._qpaused = {};
    this._pending = [];

    Object.defineProperty(this, "qname", {
        value: String(name || 'unk'),
        writable: false
    });
    switch (name) {
        case 'downloader':
        case 'zip-writer':
        case 'download-writer':
        case 'decrypter-worker':
            parentLogger = dlmanager.logger;
            break;
        case 'uploader':
        case 'ul-filereader':
        case 'encrypter-worker':
            parentLogger = ulmanager.logger;
            break;
    }
    this.logger = MegaLogger.getLogger('mQueue[' + this.qname + ']', {}, parentLogger);
    if (d) {
        MegaQueue.weakRef.push(this);
    }

    MegaEvents.call(this);
}
inherits(MegaQueue, MegaEvents);

MegaQueue.weakRef = [];

MegaQueue.prototype.getSize = function() {
    return this._limit;
};

MegaQueue.prototype.setSize = function(size) {
    this._limit = size;
    this._process();
};

MegaQueue.prototype.isEmpty = function() {
    return this._running === 0
        && this._queue.length === 0;
};

MegaQueue.prototype.pushFirst = function(arg, next, self) {
    if (d) {
        var found;
        for (var i in this._queue) {
            if (this._queue[i][0] === arg) {
                found = true;
                break;
            }
        }
        console.assert(!found, 'Huh, that task already exists');
    }
    this._queue.unshift([arg, next, self]);
    this._process();
};

MegaQueue.prototype.resume = function() {
    this._paused = false;
    this._process();
    this.trigger('resume');
};

MegaQueue.prototype.canExpand = function() {
    return !is_mobile && this._limit <= this._running && this._limit * 1.5 >= this._running;
};

/**
 * Expand temporarily the queue size, it should be called
 * when a task is about to end (for sure) so a new
 * task can start.
 *
 * It is useful when download many tiny files
 */
MegaQueue.prototype.expand = function() {
    if (this.canExpand()) {
        this._expanded = true;
        this._process();
        if (d) {
            this.logger.info("expand queue " + this._running);
        }
        return true;
    }
    return false;
};

MegaQueue.prototype.shrink = function() {
    this._limit = Math.max(this._limit - 1, 1);
    if (d) {
        this.logger.error("shrking queue to ", this._limit);
    }
    return this._limit;
};

MegaQueue.prototype.filter = function(gid, foreach) {
    var len = this._queue.length + $.len(this._qpaused);

    if (!len) {
        if (d) {
            this.logger.info('Nothing to filter', gid);
        }
    }
    else {
        if (!foreach) {
            foreach = function(aTask) {
                aTask = aTask[0];
                if (d && !aTask.destroy) {
                    this.logger.info('Removing Task ' + aTask);
                }
                if (aTask.destroy) {
                    aTask.destroy();
                }
            }.bind(this);
        }

        var tasks = this.slurp(gid);
        if (this._qpaused[gid]) {
            tasks = tasks.concat(this._qpaused[gid]);
            delete this._qpaused[gid];
        }

        tasks.map(foreach);

        // XXX: For Transfers, check if there might be leaked tasks without the file reference (ie, "dl" for dlQueue)

        if (d) {
            this.logger.info('Queue filtered, %d/%d tasks remaining',
                this._queue.length + $.len(this._qpaused), len, gid);
        }
    }
};

MegaQueue.prototype.slurp = function(gid) {
    var res = [];
    this._queue = this._queue.filter(function(item) {
        return item[0][gid] ? (res.push(item), false) : true;
    });
    return res;
};

MegaQueue.prototype.pause = function() {
    if (d) {
        this.logger.info("pausing queue");
        if (d > 1 && console.trace) {
            console.trace();
        }
    }
    this._paused = true;
    this.trigger('pause');
};

MegaQueue.prototype.isPaused = function() {
    return this._paused;
};

MegaQueue.prototype.pushAll = function(tasks, next, error) {
    function CCQueueChecker(task, response) {
        if (response.length && response[0] === false) {
            /**
             *  The first argument of .done(false) is false, which
             *  means that something went wrong
             */
            return error(task, response);
        }
        array.remove(tasks, task);
        if (tasks.length === 0) {
            next();
        }
    }
    var i = 0;
    var len = tasks.length;

    for (i = 0; i < len; i++) {
        tasks[i].onQueueDone = CCQueueChecker;
        this.push(tasks[i]);
    }
};

MegaQueue.prototype.run_in_context = function(task) {
    this._running++;
    this._pending.push(task[0]);
    this._worker(task[0], function MQRicStub() {
        console.assert(task[0], 'This should not be reached twice.');
        if (!task[0]) {
            return;
        } /* already called */
        if (!oIsFrozen(this)) {
            if (!this._pending || this._pending.indexOf(task[0]) === -1) {
                this.logger.warn('Task is no longer pending.', task[0], this._pending);
            }
            else {
                this._running--;
                array.remove(this._pending, task[0]);
                console.assert(this._running > -1, 'Queue inconsistency (RIC)');

                var done = task[1] || task[0].onQueueDone;
                if (done) {
                    var len = arguments.length;
                    var args = Array(len);
                    while (len--) {
                        args[len] = arguments[len];
                    }
                    done.apply(task[2] || this, [task[0], args]);
                }
                if (!this.isEmpty() || $.len(this._qpaused)) {
                    this._process();
                }
            }
        }
        task[0] = task[1] = task[2] = undefined;
    }.bind(this));
};

MegaQueue.prototype.validateTask = function() {
    return true;
};

MegaQueue.prototype.getNextTask = function(sp) {
    var r;
    var i = -1;
    while (++i < (this._queue && this._queue.length)) {
        if (!(this._queue && this._queue[i])) {
            srvlog('Invalid queue' + (this._queue ? ' entry' : '') + ' for ' + this.qname, sp);
            if (!this._queue) {
                break;
            }
        }
        else if ((r = this.validateTask(this._queue[i][0]))) {
            return r < 0 ? null : this._queue.splice(i, 1)[0];
        }
    }
    return null;
};

MegaQueue.prototype.process = function(sp) {
    var args;
    if (this._paused) {
        return false;
    }
    if (this._later) {
        clearTimeout(this._later);
        delete this._later;
    }
    if (!this._queue) {
        console.error('queue destroyed', this.qname, sp);
        return false;
    }
    while (this._running < this._limit && this._queue.length > 0) {
        args = this.getNextTask(sp);
        if (!args) {
            if (++this._noTaskCount === 666) {
                /**
                 * XXX: Prevent an infinite loop when there's a connection hang,
                 * with the UI reporting either "Temporary error; retrying" or
                 * a stalled % Status... [dc]
                 */
                this._noTaskCount = -1;
                if (!$.len(this._qpaused) && !uldl_hold) {
                    if (d) {
                        this.logger.error('*** CHECK THIS ***', this);
                    }
                    // srvlog('MegaQueue.getNextTask gave no tasks for too long... (' + this.qname + ')', sp);
                }
            }
            if (this._queue) {
                this._process(1600, sp);
            }
            return false;
        }
        this._noTaskCount = 0;
        this.run_in_context(args);
        this.trigger('working', args);
    }

    if (this._expanded) {
        args = this.getNextTask();
        if (args) {
            this.run_in_context(args);
            this.trigger('working', args);
        }
        delete this._expanded;
    }
    if (!args && this.mull) {
        this.mull();
    }

    return true;
};

MegaQueue.prototype.destroy = function() {
    if (!oIsFrozen(this)) {
        this.logger.info('', 'Destroying ' + this.qname, this._queue.length, this._pending);

        if (this._later) {
            clearTimeout(this._later);
        }
        /**
        this._pending.forEach(function(aRunningTask) {
            if (d) {
                this.logger.info('aRunningTask: ' + aRunningTask, aRunningTask);
            }
            if (aRunningTask && typeof aRunningTask.destroy === 'function') {
                try {
                    aRunningTask.destroy();
                }
                catch(ex) {
                    this.logger.error(ex);
                }
            }
        }.bind(this));
        /**/
        if (d) {
            if (this._queue.length !== 0) {
                var fn = 'error';
                switch (this.qname) {
                    case 'downloads':
                    case 'zip-writer':
                    case 'download-writer':
                        fn = (d > 1 ? 'warn' : 'debug');
                    default:
                        break;
                }
                this.logger[fn]('The queue "%s" was not empty.', this.qname, this._queue);
            }

            array.remove(MegaQueue.weakRef, this);
        }
        oDestroy(this);
    }
};

MegaQueue.prototype._process = function(ms, sp) {
    if (this._later) {
        clearTimeout(this._later);
    }
    if (!sp) {
        sp = new Error(this.qname + ' stack pointer');
    }
    var queue = this;

    this._later = setTimeout(function() {
        queue.process(sp);
        queue = undefined;
    }, ms || 10);
};

MegaQueue.prototype.push = function(arg, next, self) {
    this._queue.push([arg, next, self]);
    // this.logger.debug('Queueing new task, total: %d', this._queue.length, arg);
    this.trigger('queue');
    this._process();
};

MegaQueue.prototype.unshift = function(arg, next, self) {
    this._queue.unshift([arg, next, self]);
    // this.logger.debug('Queueing new task, total: %d', this._queue.length, arg);
    this.trigger('queue');
    this._process();
};

function TransferQueue() {
    MegaQueue.prototype.constructor.apply(this, arguments);

    this.qbqq = [];
}

inherits(TransferQueue, MegaQueue);

TransferQueue.prototype.mull = function() {
    if (this.isEmpty() && $.len(this._qpaused)) {
        var gids = Object.keys(this._qpaused);
        while (gids.length) {
            var gid = gids.shift();
            if (this.dispatch(gid)) {
                if (d) {
                    this.logger.info('Dispatching transfer', gid);
                }
                break;
            }
        }
    }
};

TransferQueue.prototype.dispatch = function(gid) {
    // dispatch a paused transfer

    if (d) {
        this.logger.info('', 'TransferQueue.dispatch', gid);
    }

    if (!GlobalProgress[gid]) {
        this.logger.error('', 'No transfer associated with ' + gid);
    }
    else if (!this._qpaused[gid]) {
        this.logger.error('', 'This transfer is not in hold: ' + gid);
    }
    else if (!GlobalProgress[gid].paused) {
        this._queue = this._qpaused[gid].concat(this._queue);
        delete this._qpaused[gid];
        this._process();
        return true;
    }
    return false;
};

TransferQueue.prototype.isPaused = function(gid) {
    if (!gid) {
        return MegaQueue.prototype.isPaused.apply(this, arguments);
    }

    return Object(GlobalProgress[gid]).paused;
};

TransferQueue.prototype.pause = function(gid) {
    if (!gid) {
        return MegaQueue.prototype.pause.apply(this, arguments);
    }

    // pause single transfer
    if (GlobalProgress[gid] && !GlobalProgress[gid].paused) {
        var p = GlobalProgress[gid];
        var chunk;
        p.paused = true;
        while ((chunk = p.working.pop())) {
            if (d) {
                this.logger.info('Aborting by pause: ' + chunk);
            }
            chunk.abort();
            this.pushFirst(chunk);
            if (array.remove(this._pending, chunk, 1)) {
                this._running--;
                console.assert(this._running > -1, 'Queue inconsistency on pause');
            }
            else {
                this.logger.warn("Paused chunk was NOT in pending state: " + chunk, chunk, this);
            }
        }
        this._qpaused[gid] = this.slurp(gid).concat(this._qpaused[gid] || []);
        var $tr = $('#' + gid);
        if ($tr.hasClass('transfer-started')) {
            $tr.find('.speed').addClass('unknown').text(l[1651]);
            $tr.find('.eta').addClass('unknown').text('');
        } else {
            $tr.find('.speed').text('');
            $tr.find('.eta').text('');
        }
        GlobalProgress[gid].speed = 0; // reset speed
        if (($.transferprogress || {})[gid]) {
            $.transferprogress[gid][2] = 0; // reset speed
        }
        if (page !== 'download') {
            delay('percent_megatitle', percent_megatitle);
        }
    }
    else if (d) {
        if (!GlobalProgress[gid]) {
            this.logger.error('No transfer associated with ' + gid);
        }
        else {
            this.logger.info('This transfer is ALREADY paused: ' + gid);
        }
    }
};

TransferQueue.prototype.resume = function(gid) {
    if (!gid) {
        return MegaQueue.prototype.resume.apply(this, arguments);
    }

    if (GlobalProgress[gid] && GlobalProgress[gid].paused) {
        delete GlobalProgress[gid].paused;
        if (this.isEmpty()) {
            this.dispatch(gid);
        }
        $('#' + gid + ' .speed').text('');
    }
    else if (d) {
        if (!GlobalProgress[gid]) {
            this.logger.error('No transfer associated with ' + gid);
        }
        else {
            this.logger.error('This transfer is not paused: ' + gid);
        }

    }
};

TransferQueue.prototype.push = function(cl) {

    if (!(cl instanceof ClassFile)) {
        return MegaQueue.prototype.push.apply(this, arguments);
    }

    var self = this;
    var showToast = function() {
        if (M.addDownloadToast) {
            M.showTransferToast.apply(M, M.addDownloadToast);
            M.addDownloadToast = null;
        }
    };

    if (localStorage.ignoreLimitedBandwidth || Object(u_attr).p || cl.dl.byteOffset === cl.dl.size) {
        delay('show_toast', showToast);
        dlmanager.setUserFlags();
        return MegaQueue.prototype.push.apply(this, arguments);
    }

    this.pause();
    this.qbqq.push(toArray.apply(null, arguments));

    delay('TransferQueue:push', function() {
        var qbqq = self.qbqq;
        var dispatcher = function() {
            closeDialog();
            self.resume();
            qbqq.forEach(function(args) {
                MegaQueue.prototype.push.apply(self, args);
            });
            loadingDialog.hide();
            showToast();
        };
        self.qbqq = [];

        // loadingDialog.show();

        // Query the size being downloaded in other tabs
        watchdog.query('qbqdata').always(function(res) {
            // this will include currently-downloading and the ClassFiles in hold atm.
            var qbq = dlmanager.getQBQData();

            // if no error (Ie, no other tabs)
            if (typeof res !== 'number') {
                for (var i = res.length; i--;) {
                    qbq.p = qbq.p.concat(res[i].p || []);
                    qbq.n = qbq.n.concat(res[i].n || []);
                    qbq.s += res[i].s;
                }
            }
            qbq.a = 'qbq';
            qbq.s *= -1;

            // Set user flags, registered, pro, achievements
            dlmanager.setUserFlags();

            // Fire "Query bandwidth quota"
            api_req(qbq, {
                callback: function(res) {
                    // 0 = User has sufficient quota
                    // 1 = unregistered user, not enough quota
                    // 2 = registered user, not enough quota
                    // 3 = can't even get the first chunk
                    switch (res) {
                        case 1:
                        case 2:
                            dlmanager.showLimitedBandwidthDialog(res, dispatcher);
                            break;

                        default:
                            Soon(dispatcher);
                    }
                }
            });
        });
    }, 50);
};
