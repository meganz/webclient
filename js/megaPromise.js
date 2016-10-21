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

    self._internalPromise = new $.Deferred();

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
        var preStack = mega.utils.getStack();
        setTimeout(function() {
            if (self.state() === 'pending') {
                console.error("Pending promise found: ", self, preStack);
            }
        }, MegaPromise.debugPendingPromisesTimeout);
    }

    if (MegaPromise.debugPreStack === true) {
        self.stack = mega.utils.getStack();
    }
    return this;
};

if (typeof Promise !== "undefined") {
    MegaPromise._origPromise = Promise;
} else {
    MegaPromise._origPromise = undefined;
    window.Promise = MegaPromise;
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
 * Common function to be used as reject callback to promises.
 *
 * @param promise {MegaPromise}
 * @returns {function}
 * @private
 */
MegaPromise.getTraceableReject = function($promise, origPromise) {
    // Save the current stack pointer in case of an async call behind
    // the promise.reject (Ie, onAPIProcXHRLoad shown as initial call)
    var preStack = d && mega.utils.getStack();

    return function __mpTraceableReject(aResult) {
        if (window.d > 1) {
            var postStack = mega.utils.getStack();
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

/**
 * By implementing this method, MegaPromise will be compatible with .when/.all syntax.
 *
 * jQuery: https://github.com/jquery/jquery/blob/10399ddcf8a239acc27bdec9231b996b178224d3/src/deferred.js#L133
 *
 * @returns {jQuery.Deferred}
 */
MegaPromise.prototype.promise = function() {
    return this._internalPromise.promise();
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

    return MegaPromise.asMegaPromiseProxy(this._internalPromise.then(res, rej));
};

/**
 * Alias of .done
 *
 * @param res
 * @returns {MegaPromise}
 */
MegaPromise.prototype.done = function(res) {
    this._internalPromise.done(res);
    return this;
};

/**
 * Alias of .state
 *
 * @returns {String}
 */
MegaPromise.prototype.state = function() {
    return this._internalPromise.state();
};

/**
 * Alias of .fail
 *
 * @param rej
 * @returns {MegaPromise}
 */
MegaPromise.prototype.fail = function(rej) {
    this._internalPromise.fail(rej);
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
    this._internalPromise.resolve.apply(this._internalPromise, arguments);
    return this;
};

/**
 * Alias of .reject
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.reject = function() {
    this._internalPromise.reject.apply(this._internalPromise, arguments);
    return this;
};

/**
 * Alias of .always
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.always = function() {
    this._internalPromise.always.apply(this._internalPromise, arguments);
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
    targetPromise.then(function() {
        self.resolve.apply(self, arguments);
    });

    return self;
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
    targetPromise.then(undefined, function() {
        self.reject.apply(self, arguments);
    });

    return self;
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
    var self = this;

    self.linkDoneTo(targetPromise);
    self.linkFailTo(targetPromise);

    return self;
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

/**
 * Implementation of Promise.all/$.when, with a little bit more flexible way of handling different type of promises
 * passed in the `promisesList`
 *
 * @returns {MegaPromise}
 */
MegaPromise.all = function(promisesList) {

    var _jQueryPromisesList = [];
    promisesList.forEach(function(v, k) {
        if (MegaPromise._origPromise && v instanceof MegaPromise._origPromise) {
            v = MegaPromise.asMegaPromiseProxy(v);
        }
        _jQueryPromisesList.push(v);
    });

    // return MegaPromise.asMegaPromiseProxy(
        // $.when.apply($, _jQueryPromisesList)
    // );

    var promise = new MegaPromise();

    $.when.apply($, _jQueryPromisesList)
        .then(function megaPromiseResProxy() {
            promise.resolve(toArray.apply(null, arguments));
        },
        MegaPromise.getTraceableReject(promise));

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
    var totalLeft = promisesList.length;
    var results = [];
    var masterPromise = new MegaPromise();
    var alwaysCb = function() {
        results.push(toArray.apply(null, arguments));

        if (--totalLeft === 0) {
            masterPromise.resolve(results);
        }
    };


    var _megaPromisesList = [];
    promisesList.forEach(function(v, k) {
        if (MegaPromise._origPromise && v instanceof MegaPromise._origPromise) {
            v = MegaPromise.asMegaPromiseProxy(v);
        }
        _megaPromisesList.push(v);
        v.done(alwaysCb);
        v.fail(alwaysCb);
    });

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
