/**
 * Mega Promise
 *
 * Polyfill + easier to debug variant of Promises which are currently implemented in some of the cutting edge browsers.
 *
 * The main goals of using this, instead of directly using native Promises are:
 * - stack traces
 * - .done, .fail
 * - all js exceptions will be logged (in the console) and thrown as expected
 *
 * Note: for now, we will use $.Deferred to get this functionality out of the box and MegaPromise will act as a bridge
 * between the original Promise API and jQuery's Deferred APIs.
 *
 * Implementation note: .progress is currently not implemented.
 */


/**
 * Mega Promise constructor
 *
 * @returns {MegaPromise}
 * @constructor
 */
function MegaPromise(fn) {
    var self = this;

    this.$deferred = new $.Deferred();
    this.state$deferred = this.$deferred;

    if (fn) {
        var resolve = function() {
            self.resolve.apply(self, arguments);
        };
        var reject = function() {
            self.reject.apply(self, arguments);
        };

        try {
            fn(resolve, reject);
        }
        catch (ex) {
            reject(ex);
        }
    }

    if (MegaPromise.debugPendingPromisesTimeout > 0) {
        var preStack = M.getStack();
        setTimeout(function() {
            if (self.state() === 'pending') {
                console.error("Pending promise found: ", self, preStack);
            }
        }, MegaPromise.debugPendingPromisesTimeout);
    }

    if (MegaPromise.debugPreStack === true) {
        self.stack = M.getStack();
    }
}

/**
 * Set this to any number (millisecond) and a timer would check if all promises are resolved in that time. If they are
 * still in 'pending' state, they will trigger an error (this is a debugging helper, not something that you should
 * leave on in production code!)
 *
 * @type {boolean|Number}
 */
MegaPromise.debugPendingPromisesTimeout = false;

/**
 * Set this to true, to enable all promises to store a pre-stack in .stack.
 *
 * @type {boolean}
 */
MegaPromise.debugPreStack = false;

/**
 * Convert Native and jQuery promises to MegaPromises, by creating a MegaPromise proxy which will be attached
 * to the actual underlying promise's .then callbacks.
 *
 * @param p
 * @returns {MegaPromise}
 * @private
 */
MegaPromise.asMegaPromiseProxy  = function(p) {
    var $promise = new MegaPromise();

    p.then(
        function megaPromiseResProxy() {
            $promise.resolve.apply($promise, arguments);
        },
        MegaPromise.getTraceableReject($promise, p));

    return $promise;
};

/**
 * Show the loading dialog if a promise takes longer than 200ms
 * @returns {MegaPromise}
 */
MegaPromise.busy = function() {
    var promise = new MegaPromise();

    if (fminitialized && !loadingDialog.active) {
        var timer = setTimeout(function() {
            timer = null;
            loadingDialog.pshow();
        }, 200);

        promise.always(function() {
            if (timer) {
                clearTimeout(timer);
            }
            else {
                loadingDialog.phide();
            }
        });
    }

    return promise;
};

/**
 * Common function to be used as reject callback to promises.
 *
 * @param promise {MegaPromise}
 * @returns {function}
 * @private
 */
MegaPromise.getTraceableReject = function($promise, origPromise) {
    'use strict';
    // Save the current stack pointer in case of an async call behind
    // the promise.reject (Ie, onAPIProcXHRLoad shown as initial call)
    var preStack = d > 1 && M.getStack();

    return function __mpTraceableReject(aResult) {
        if (window.d > 1) {
            var postStack = M.getStack();
            if (typeof console.group === 'function') {
                console.group('PROMISE REJECTED');
            }
            console.debug('Promise rejected: ', aResult, origPromise);
            console.debug('pre-Stack', preStack);
            console.debug('post-Stack', postStack);
            if (typeof console.groupEnd === 'function') {
                console.groupEnd();
            }
        }
        try {
            if (typeof $promise === 'function') {
                $promise.apply(origPromise, arguments);
            }
            else {
                $promise.reject.apply($promise, arguments);
            }
        }
        catch(e) {
            console.error('Unexpected promise error: ', e, preStack);
        }
    };
};

MegaPromise.prototype.benchmark = function(uniqueDebuggingName) {
    var self = this;
    MegaPromise._benchmarkTimes = MegaPromise._benchmarkTimes || {};
    MegaPromise._benchmarkTimes[uniqueDebuggingName] = Date.now();

    self.always(function() {
        console.error(
            uniqueDebuggingName,
            'finished in:',
            Date.now() - MegaPromise._benchmarkTimes[uniqueDebuggingName]
        );
        delete MegaPromise._benchmarkTimes[uniqueDebuggingName];
    });

    // allow chaining.
    return self;
};

/**
 * By implementing this method, MegaPromise will be compatible with .when/.all syntax.
 *
 * jQuery: https://github.com/jquery/jquery/blob/10399ddcf8a239acc27bdec9231b996b178224d3/src/deferred.js#L133
 *
 * @returns {jQuery.Deferred}
 */
MegaPromise.prototype.promise = function() {
    return this.$deferred.promise();
};

/**
 * Alias of .then
 *
 * @param res
 *     Function to be called on resolution of the promise.
 * @param [rej]
 *     Function to be called on rejection of the promise.
 * @returns {MegaPromise}
 */
MegaPromise.prototype.then = function(res, rej) {

    return MegaPromise.asMegaPromiseProxy(this.$deferred.then(res, rej));
};

/**
 * Alias of .done
 *
 * @param res
 * @returns {MegaPromise}
 */
MegaPromise.prototype.done = function(res) {
    this.$deferred.done(res);
    return this;
};

/**
 * Alias of .state
 *
 * @returns {String}
 */
MegaPromise.prototype.state = function() {
    return this.$deferred.state();
};

/**
 * Alias of .fail
 *
 * @param rej
 * @returns {MegaPromise}
 */
MegaPromise.prototype.fail = function(rej) {
    this.$deferred.fail(rej);
    return this;
};


/**
 * Alias of .fail
 *
 * @param rej
 * @returns {MegaPromise}
 */
MegaPromise.prototype.catch = MegaPromise.prototype.fail;

/**
 * Alias of .resolve
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.resolve = function() {
    this.state$deferred.resolve.apply(this.state$deferred, arguments);
    return this;
};

/**
 * Alias of .reject
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.reject = function() {
    this.state$deferred.reject.apply(this.state$deferred, arguments);
    return this;
};

/**
 * Alias of .always
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.always = function() {
    this.$deferred.always.apply(this.$deferred, arguments);
    return this;
};

/**
 * Alias of .then, which works like .always and exchanges the internal Deferred promise.
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.pipe = function(resolve, reject) {
    var pipe = this.then(resolve, reject || resolve);
    this.$deferred = pipe.$deferred;
    return pipe;
};

/**
 * Alias of .always
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.wait = function(callback) {
    // callback = tryCatch(callback);

    this.$deferred.always(function() {
        var args = toArray.apply(null, arguments);

        onIdle(function() {
            callback.apply(null, args);
        });
    });
    return this;
};

/**
 * Alias of .wait
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.finally = MegaPromise.prototype.wait;

/**
 * Invoke promise fulfilment through try/catch and reject it if there's some exception...
 * @param {Function} resolve The function to invoke on fulfilment
 * @param {Function} [reject] The function to invoke on rejection/caught exceptions
 * @returns {MegaPromise}
 */
MegaPromise.prototype.tryCatch = function(resolve, reject) {
    'use strict';
    reject = reject || function() {};
    return this.done(tryCatch(resolve, reject)).fail(reject);
};

/**
 * Alias of .always
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.unpack = function(callback) {
    // callback = tryCatch(callback);

    this.$deferred.always(function(result) {
        if (result.__unpack$$$) {
            // flatten an n-dimensional array.
            for (var i = result.length; i--;) {
                // pick the first argument for each member
                result[i] = result[i][0];
            }
            result = Array.prototype.concat.apply([], result);
        }
        callback(result);
    });
    return this;
};

/**
 * Link the `targetPromise`'s state to the current promise. E.g. when targetPromise get resolved, the current promise
 * will get resolved too with the same arguments passed to targetPromise.
 *
 * PS: This is a simple DSL-like helper to save us from duplicating code when using promises :)
 *
 * @param targetPromise
 * @returns {MegaPromise} current promise, helpful for js call chaining
 */
MegaPromise.prototype.linkDoneTo = function(targetPromise) {
    var self = this;

    if (targetPromise instanceof MegaPromise) {
        // Using MegaPromise.done since it's more lightweight than the thenable
        // which creates a new deferred instance proxied back to MegaPromise...
        targetPromise.done(function() {
            self.resolve.apply(self, arguments);
        });
    }
    else {
        targetPromise.then(function() {
            self.resolve.apply(self, arguments);
        });
    }

    return this;
};

/**
 * Link the `targetPromise`'s state to the current promise. E.g. when targetPromise get rejected, the current promise
 * will get rejected too with the same arguments passed to targetPromise.
 * PS: This is a simple DSL-like helper to save us from duplicating code when using promises :)
 *
 *
 * @param targetPromise
 * @returns {MegaPromise} current promise, helpful for js call chaining
 */
MegaPromise.prototype.linkFailTo = function(targetPromise) {
    var self = this;

    if (targetPromise instanceof MegaPromise) {
        // Using MegaPromise.fail since it's more lightweight than the thenable
        // which creates a new deferred instance proxied back to MegaPromise...
        targetPromise.fail(function() {
            self.reject.apply(self, arguments);
        });
    }
    else {
        targetPromise.then(undefined, function() {
            self.reject.apply(self, arguments);
        });
    }

    return this;
};

/**
 * Link the `targetPromise`'s state to the current promise (both done and fail, see .linkDoneTo and .linkFailTo)
 *
 * PS: This is a simple DSL-like helper to save us from duplicating code when using promises :)
 *
 * @param targetPromise
 * @returns {MegaPromise} current promise, helpful for js call chaining
 */
MegaPromise.prototype.linkDoneAndFailTo = function(targetPromise) {
    this.linkDoneTo(targetPromise);
    this.linkFailTo(targetPromise);
    return this;
};

/**
 * Link promise's state to a function's value. E.g. if the function returns a promise that promise's state will be
 * linked to the current fn. If it returns a non-promise-like value it will resolve/reject the current promise's value.
 *
 * PS: This is a simple DSL-like helper to save us from duplicating code when using promises :)
 *
 * @returns {MegaPromise} current promise, helpful for js call chaining
 */
MegaPromise.prototype.linkDoneAndFailToResult = function(cb, context, args) {
    var self = this;

    var ret = cb.apply(context, args);

    if (ret instanceof MegaPromise) {
        self.linkDoneTo(ret);
        self.linkFailTo(ret);
    }
    else {
        self.resolve(ret);
    }

    return self;
};

/**
 * Development helper, that will dump the result/state change of this promise to the console
 *
 * @param [msg] {String} optional msg
 * @returns {MegaPromise} current promise, helpful for js call chaining
 */
MegaPromise.prototype.dumpToConsole = function(msg) {
    var self = this;

    if (d) {
        self.then(
            function () {
                console.log("success: ", msg ? msg : arguments, !msg ? null : arguments);
            }, function () {
                console.error("error: ", msg ? msg : arguments, !msg ? null : arguments);
            }
        );
    }

    return self;
};
MegaPromise.prototype.dump = MegaPromise.prototype.dumpToConsole;

/**
 * Check if what we have is *potentially* another Promise implementation (Native, Bluebird, Q, etc)
 * @param {*|Object} p What we expect to be a promise.
 * @returns {Boolean} whether it is
 */
MegaPromise.isAnotherPromise = function(p) {
    'use strict';
    return !(p instanceof MegaPromise) && typeof Object(p).then === 'function';
};

/**
 * Implementation of Promise.all/$.when, with a little bit more flexible way of handling different type of promises
 * passed in the `promisesList`
 *
 * @returns {MegaPromise}
 */
MegaPromise.all = function(promisesList) {
    'use strict';

    var _jQueryPromisesList = promisesList.map(function(p) {
        if (MegaPromise.isAnotherPromise(p)) {
            p = MegaPromise.asMegaPromiseProxy(p);
        }

        if (d) {
            console.assert(p instanceof MegaPromise);
        }
        return p;
    });

    var promise = new MegaPromise();

    $.when.apply($, _jQueryPromisesList)
        .done(function megaPromiseResProxy() {
            promise.resolve(toArray.apply(null, arguments));
        })
        .fail(MegaPromise.getTraceableReject(promise));

    return promise;
};

/**
 * Implementation of Promise.all/$.when, with a little bit more flexible way of handling different type of promises
 * passed in the `promisesList`.
 *
 * Warning: This method will return a "master promise" which will only get resolved when ALL promises had finished
 * processing (e.g. changed their state to either resolved or rejected). The only case when the master promise will get,
 * rejected is if there are still 'pending' promises in the `promisesList` after the `timeout`
 *
 * @param promisesList {Array}
 * @param [timeout] {Integer} max ms to way for the master promise to be resolved before rejecting it
 * @returns {MegaPromise}
 */
MegaPromise.allDone = function(promisesList, timeout) {
    // IF empty, resolve immediately
    if (promisesList.length === 0) {
        return MegaPromise.resolve();
    }
    var masterPromise = new MegaPromise();
    var totalLeft = promisesList.length;
    var results = [];
    results.__unpack$$$ = 1;

    var alwaysCb = function() {
        results.push(toArray.apply(null, arguments));

        if (--totalLeft === 0) {
            masterPromise.resolve(results);
        }
    };

    for (var i = promisesList.length; i--;) {
        var v = promisesList[i];

        if (MegaPromise.isAnotherPromise(v)) {
            v = MegaPromise.asMegaPromiseProxy(v);
        }

        if (v instanceof MegaPromise) {
            v.done(alwaysCb);
            v.fail(alwaysCb);
        }
        else {
            if (d) {
                console.warn('non-promise provided...', v);
            }
            alwaysCb(v);
        }
    }

    if (timeout) {
        var timeoutTimer = setTimeout(function () {
            masterPromise.reject(results);
        }, timeout);

        masterPromise.always(function () {
            clearTimeout(timeoutTimer);
        });
    }

    return masterPromise;
};

/**
 * alias of Promise.resolve, will create a new promise, resolved with the arguments passed to this method
 *
 * @returns {MegaPromise}
 */
MegaPromise.resolve = function() {
    var p = new MegaPromise();
    p.resolve.apply(p, arguments);

    return p;
};


/**
 * alias of Promise.reject, will create a new promise, rejected with the arguments passed to this method
 *
 * @returns {MegaPromise}
 */
MegaPromise.reject = function() {
    var p = new MegaPromise();
    p.reject.apply(p, arguments);

    return p;
};

/**
 * Development helper tool to delay .resolve/.reject of a promise.
 *
 * @param ms {Number} milliseconds to delay the .resolve/.reject
 */
MegaPromise.prototype.fakeDelay = function(ms) {
    var self = this;
    if (self._fakeDelayEnabled) {
        return;
    }

    var origResolve = self.resolve;
    var origReject = self.reject;
    self.resolve = function() {
        var args = arguments;
        setTimeout(function() {
            origResolve.apply(self, args);
        }, ms);

        return self;
    };
    self.reject = function() {
        var args = arguments;
        setTimeout(function() {
            origReject.apply(self, args);
        }, ms);

        return self;
    };

    self._fakeDelayEnabled = true;

    return self;
};

/**
 * Helper tool, that creates a new queue, that can be used for scheduling callbacks, which return promises.
 * So, every callback would ONLY be executed AFTER the previously queued one finishes execution.
 *
 * @constructor
 */
MegaPromise.QueuedPromiseCallbacks = function() {
    /*jshint -W057 */
    return new (function(queueName, debug) {
        /*jshint +W057 */
        var self = this;

        if (!queueName) {
            queueName = "untitledQueue" + parseInt(rand_range(0, 1000));
        }

        self._queued = [];


        self.queue = function(fn, fnName) {
            var masterPromise = new MegaPromise();

            self._queued.push({
                'cb': fn,
                'name': fnName,
                'masterPromise': masterPromise
            });

            if (debug) {
                console.log("-=> Added to queue", queueName, " FN#", fnName ? fnName : self._queued.length);
            }

            return masterPromise;
        };

        self.tick = function() {
            if (
                self.currentQueuedEntry &&
                self.currentQueuedEntry.masterPromise.state() === 'pending'
            ) {
                return;
            }

            if (self._queued.length === 0) {
                // all done!
                if (self._finishedCb) {
                    self._finishedCb();
                }
                return;
            }
            var currentQueuedEntry = self._queued.shift();
            var currentName = currentQueuedEntry && currentQueuedEntry.name ? currentQueuedEntry.name : "noname";

            // set immediately, used as an implicit lock.
            self.currentQueuedEntry = currentQueuedEntry;

            if (debug) {
                console.log(
                    "-=> PromiseQueue", queueName, "Starting FN#",
                    currentName
                );
            }



            var execPromise = currentQueuedEntry.resultPromise = currentQueuedEntry.cb();

            currentQueuedEntry.masterPromise.linkDoneAndFailTo(execPromise);



            currentQueuedEntry.executionTimeoutPromise = createTimeoutPromise(
                function() {
                    return execPromise.state() !== 'pending';
                }, 500, 10000
            )
                .fail(function() {
                    if (typeof console !== 'undefined' && typeof console.warn !== 'undefined') {
                        // this is an important message, that we want to be shown on production.
                        console.warn('promise in promiseQueue ' + queueName + ' had timed out!');
                    }
                })
                .done(function() {
                    if (debug) {
                        console.log("-=> PromiseQueue", queueName, "Finished FN#", currentName);
                    }
                    self.tick();
                });

            execPromise.always(function() {
                currentQueuedEntry.executionTimeoutPromise.verify();
            });
        };
        self.whenFinished = function(cb) {
            self._finishedCb = cb;
            return self;
        };
    })();
};
