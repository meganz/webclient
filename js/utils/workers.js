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
    var wid = mRandomToken(url);

    var terminator = function() {
        delay('createworkers:terminator:' + wid,
            function cwt() {
                var now = Date.now();

                for (var i = worker.length; i--;) {
                    if (worker[i] && !worker[i].busy && (now - worker[i].tts) > 12e4) {
                        worker[i].terminate();
                        worker[i] = null;
                    }
                }
            },
            13e4);
    };

    var handler = function(id) {
        return function(e) {
            message(this.context, e, function(r) {
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

    return new MegaQueue(function(task, done) {
        var i = size;

        while (i--) {
            if (worker[i] === null) {
                worker[i] = create(i);
            }
            if (!worker[i].busy) {
                break;
            }
        }

        if (i < 0 || worker[i].busy) {
            console.error('Huh?.... worker inconsistency...');
        }

        instances[i] = done;
        worker[i].busy = true;

        $.each(task, function(e, t) {
            if (e === 0) {
                worker[i].context = t;
            }
            else if (t.constructor === Uint8Array && typeof MSBlobBuilder !== "function") {
                worker[i].postMessage(t.buffer, [t.buffer]);
            }
            else {
                worker[i].postMessage(t);
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
            'verify': function(msg, sig, publicKey) {
                var masterPromise = new MegaPromise();

                if (!backgroundNacl.workers) {
                    backgroundNacl.workers = CreateWorkers('naclworker.js',
                        function(ctx, e, release) {
                            release(e.data);
                        });
                }

                backgroundNacl.workers.push(
                    [
                        "req" + (x++),
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

                return masterPromise;
            }
        }
    };
})(self);
