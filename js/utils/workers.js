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
    var instances = [];
    var wid = url + '!' + makeUUID();

    var terminator = function() {
        delay('createworkers:terminator:' + wid,
            function cwt() {
                var kills = 0;
                var now = Date.now();

                for (var i = worker.length; i--;) {
                    if (worker[i] && !worker[i].busy && (now - worker[i].tts) > 12e4) {
                        worker[i].terminate();
                        worker[i] = null;
                        kills++;
                    }
                }

                if (kills) {
                    onIdle(function() {
                        mBroadcaster.sendMessage('createworkers:terminated', kills);
                    });
                }
            },
            13e4);
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
                instances[id](r);
                instances[id] = null;
            });
        }
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
            msgDialog('warninga', '' + url, '' + e, location.hostname);
            throw e;
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

            onIdle(_.bind(self, task, done));

            try {
                worker[i].terminate();
            }
            catch (e) {}
            worker[i] = instances[i] = null;
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


(function(global) {
    "use strict";

    var x = 0;
    var backgroundNacl = Object.create(null);

    Object.defineProperty(global, 'backgroundNacl', {value: backgroundNacl});

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

                if (!backgroundNacl.workers) {
                    backgroundNacl.workers = CreateWorkers('naclworker.js',
                        function(ctx, e, release) {
                            release(e.data);
                        }
                    );

                    backgroundNacl.workers._taggedTasks = {};

                    backgroundNacl.workers.removeTasksByTagName = function(tagName) {
                        if (backgroundNacl.workers._taggedTasks[tagName]) {
                            var tasks = backgroundNacl.workers._taggedTasks[tagName];
                            for (var i = tasks.length - 1; i >= 0; i--) {
                                if (tasks[i]) {
                                    backgroundNacl.workers.filter(tasks[i].taskId);
                                    tasks[i].reject(0xDEAD);
                                }
                            }

                            backgroundNacl.workers._taggedTasks[tagName] = [];
                        }
                    };
                }

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
})(self);
