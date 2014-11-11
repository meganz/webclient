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

    if(fn) {
        fn(
            function() {
                self.resolve.apply(self, toArray(arguments));
            },
            function() {
                self.reject.apply(self, toArray(arguments));
            }
        );
    }
    return this;
};

if(typeof(Promise) != "undefined") {
    MegaPromise._origPromise = Promise;
} else {
    MegaPromise._origPromise = undefined;
}

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

    p.then(function() {
        $promise.resolve.apply($promise, toArray(arguments))
    }, function(argument) {
        if(window.d) {
            var stack;
            // try to get the stack trace
            try {
                throw new Error("DEBUG")
            } catch(e) {
                stack = e.stack;
            }
            console.error("Promise rejected: ", argument, p, stack);
        }
        $promise.reject.apply($promise, toArray(arguments))
    });

    return $promise;
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
 * @param rej
 * @returns {MegaPromise}
 */
MegaPromise.prototype.then = function(res, rej) {
    this._internalPromise.then(res, rej);
    return this;
};

/**
 * Alias of .done
 *
 * @param res
 * @param rej
 * @returns {MegaPromise}
 */
MegaPromise.prototype.done = function(res, rej) {
    this._internalPromise.done(res, rej);
    return this;
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
 * Alias of .resolve
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.resolve = function() {
    this._internalPromise.resolve.apply(this._internalPromise, toArray(arguments));
    return this;
};

/**
 * Alias of .reject
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.reject = function() {
    this._internalPromise.reject.apply(this._internalPromise, toArray(arguments));
    return this;
};

/**
 * Alias of .always
 *
 * @returns {MegaPromise}
 */
MegaPromise.prototype.always = function() {
    this._internalPromise.always.apply(this._internalPromise, toArray(arguments));
    return this;
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
        if(MegaPromise._origPromise && v instanceof MegaPromise._origPromise) {
            v = MegaPromise.asMegaPromiseProxy(v);
        }
        _jQueryPromisesList.push(v);
    });

    return MegaPromise.asMegaPromiseProxy(
        $.when.apply($, _jQueryPromisesList)
    );
};

/**
 * Implementation of Promise.all/$.when, with a little bit more flexible way of handling different type of promises
 * passed in the `promisesList`
 *
 * @returns {MegaPromise}
 */
MegaPromise.allDone = function(promisesList, timeout) {

    var totalLeft = promisesList.length;
    var results = [];
    var masterPromise = new MegaPromise();
    var alwaysCb = function() {
        totalLeft--;
        results.push(arguments);

        if(totalLeft === 0) {
            masterPromise.resolve(results);
        }
    };


    var _megaPromisesList = [];
    promisesList.forEach(function(v, k) {
        if(MegaPromise._origPromise && v instanceof MegaPromise._origPromise) {
            v = MegaPromise.asMegaPromiseProxy(v);
        }
        _megaPromisesList.push(v);
        v.done(alwaysCb);
        v.fail(alwaysCb);
    });

    var timeout = setTimeout(function() {
        masterPromise.reject(results);
    }, timeout);

    masterPromise.always(function() {
        clearTimeout(timeout);
    });

    return masterPromise;
};

/**
 * alias of Promise.resolve, will create a new promise, resolved with the arguments passed to this method
 *
 * @returns {MegaPromise}
 */
MegaPromise.resolve = function() {
    var p = new MegaPromise();
    p.resolve.apply(p, toArray(arguments));

    return p;
};


/**
 * alias of Promise.reject, will create a new promise, rejected with the arguments passed to this method
 *
 * @returns {MegaPromise}
 */
MegaPromise.reject = function() {
    var p = new MegaPromise();
    p.reject.apply(p, toArray(arguments));

    return p;
};


// replace the original Promise
window.Promise = MegaPromise;