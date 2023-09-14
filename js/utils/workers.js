/**
 * Create a pool of workers, it returns a Queue object
 * so it can be called many times and it'd be throttled
 * by the queue
 *
 * @param {String} url Script url/filename
 * @param {Function} message Worker's message dispatcher
 * @param {Number} [size] Number of workers
 * @returns {MegaQueue}
 */
function CreateWorkers(url, message, size) {
    "use strict";

    var worker = [];
    var backoff = 400;
    var instances = [];
    var wid = url + '!' + makeUUID();

    var terminator = function() {
        tSleep.schedule(130, worker, () => {
            let kills = 0;
            const now = Date.now();

            for (let i = worker.length; i--;) {
                if (worker[i] && !worker[i].busy && now - worker[i].tts > 4e4) {
                    tryCatch(() => worker[i].terminate())();
                    worker[i] = null;
                    kills++;
                }
            }

            if (kills) {
                onIdle(() => {
                    mBroadcaster.sendMessage('createworkers:terminated', kills);
                });
            }
        });
    };

    var handler = function(id) {
        return function(e) {
            message(this.context, e, function(r) {
                if (d > 1) {
                    console.debug('[%s] Worker #%s finished...', wid, id);
                }

                worker[id].onerror = null;
                worker[id].context = null;
                worker[id].busy = false;
                worker[id].tts = Date.now();
                terminator();

                /* release worker */
                const done = instances[id];
                instances[id] = null;

                done(r);
            });
        }
    };

    var workerLoadFailure = function(ex) {
        if (d) {
            console.error(wid, ex);
        }
        msgDialog('warninga', l[47], '' + ex, l[20858]);
        throw ex;
    };

    var create = function(i) {
        var w;

        try {
            w = new Worker(url);
        }
        catch (e) {
            // deal with QuotaExceededError: Failed to construct 'Worker': Maximum worker number has been reached.
            if (e.name === 'QuotaExceededError') {
                return false;
            }
            console.assert(navigator.onLine !== false, e);
            if (navigator.onLine === false) {
                // this should not happens, onerror shall be reached instead, if some fancy browser does it fix this!
                return false;
            }
            workerLoadFailure(e);
        }

        w.id = i;
        w.busy = false;
        w.postMessage = w.webkitPostMessage || w.postMessage;
        w.onmessage = handler(i);
        return w;
    };

    if (!is_karma && !is_extension) {
        url = '/' + url;
    }
    size = size || mega.maxWorkers;

    for (var i = size; i--;) {
        worker.push(null);
    }

    if (d > 1) {
        if (!window._cwWorkers) {
            window._cwWorkers = Object.create(null);
        }
        if (!window._cwInstances) {
            window._cwInstances = Object.create(null);
        }
        window._cwWorkers[wid] = worker;
        window._cwInstances[wid] = instances;
    }

    return new MegaQueue(function _(task, done) {
        var i = size;
        var self = this;

        while (i--) {
            if (!worker[i] && !(worker[i] = create(i))) {
                continue;
            }
            if (!worker[i].busy) {
                break;
            }
        }

        if (i < 0) {
            console.error('Workers subsystem exhausted... holding.', mega.maxWorkers, size);
            mBroadcaster.once('createworkers:terminated', _.bind(this, task, done));
            return;
        }

        instances[i] = done;
        worker[i].busy = true;
        worker[i].onerror = function(ex) {
            console.warn('[%s] Worker #%s error on %s:%d, %s.',
                wid, i, ex.filename || 0, ex.lineno | 0, ex.message || 'Failed to load', ex, task);

            tryCatch(() => worker[i].terminate())();
            worker[i] = instances[i] = null;

            if ((backoff | 0) < 100) {
                backoff = 200;
            }
            tSleep(Math.min(8e3, backoff <<= 1) / 1e3)
                .then(() => _(task, done))
                .catch(dump);
        };

        if (d > 1) {
            console.debug('[%s] Sending task to worker #%s', wid, i, task);
        }

        $.each(task, function(e, t) {
            if (e === 0) {
                worker[i].context = t;
            }
            // Unfortunately, we had to cease to use transferables for the onerror handler to work properly..
            // else if (t.constructor === Uint8Array && typeof MSBlobBuilder !== "function") {
            //     worker[i].postMessage(t.buffer, [t.buffer]);
            // }
            else {
                if (e === 2) {
                    worker[i].byteOffset = t * 16;
                }

                try {
                    worker[i].postMessage(t);
                }
                catch (ex) {
                    if (ex.name === 'DataCloneError' && t.constructor === Uint8Array) {
                        worker[i].postMessage(t.buffer, [t.buffer]);
                    }
                    else {
                        console.error(' --- FATAL UNRECOVERABLE ERROR --- ', ex);

                        onIdle(function() {
                            throw ex;
                        });
                    }
                }
            }
        });
    }, size, url.split('/').pop().split('.').shift() + '-worker');
}

/** @property window.backgroundNacl */
lazy(self, 'backgroundNacl', function backgroundNacl() {
    "use strict";

    var x = 0;
    var backgroundNacl = Object.create(null);

    /** @property window.backgroundNacl.workers */
    lazy(backgroundNacl, 'workers', () => {
        const mw = Math.min(mega.maxWorkers, 4);
        const workers = CreateWorkers('naclworker.js', (ctx, e, release) => release(e.data), mw);

        workers._taggedTasks = Object.create(null);
        workers.removeTasksByTagName = function(tagName) {
            if (this._taggedTasks[tagName]) {
                const tasks = this._taggedTasks[tagName];

                for (let i = tasks.length; i--;) {
                    if (tasks[i]) {
                        this.filter(tasks[i].taskId);
                        tasks[i].reject(0xDEAD);
                    }
                }

                delete this._taggedTasks[tagName];
            }
        };

        return workers;
    });

    // create aliases for all (used by us) nacl funcs, that return promises
    backgroundNacl.sign = {
        'detached': {
            /**
             * Alias of nacl.sign.detached.verify.
             *
             * Note: msg, sig and publicKey should be strings, NOT ArrayBuffers as when using nacl directly.
             *
             * @param msg
             * @param sig
             * @param publicKey
             * @returns {MegaPromise}
             */
            'verify': function(msg, sig, publicKey, tagName) {
                var masterPromise = new MegaPromise();

                var taskId = (tagName ? tagName + "_" : "") + "req" + (x++);
                backgroundNacl.workers.push(
                    [
                        taskId,
                        [
                            "verify", msg, sig, publicKey
                        ]
                    ],
                    function() {
                        masterPromise.resolve(
                            arguments[1][0]
                        );
                    }
                );
                masterPromise.taskId = taskId;

                if (tagName) {
                    if (!backgroundNacl.workers._taggedTasks[tagName]) {
                        backgroundNacl.workers._taggedTasks[tagName] = [];
                    }
                    backgroundNacl.workers._taggedTasks[tagName].push(masterPromise);

                    masterPromise.always(function() {
                        if (backgroundNacl.workers._taggedTasks[tagName]) {
                            array.remove(backgroundNacl.workers._taggedTasks[tagName], masterPromise);
                        }
                    });
                }

                return masterPromise;
            }
        }
    };

    return backgroundNacl;
});
