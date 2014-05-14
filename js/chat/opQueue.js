/**
 * Simple queue that will "queue" function calls
 * Additional functionality is proper handling/reordering/optimisation for mpENC
 *
 * @param ctx {mpenc.ProtocolHandler}
 *
 * @param validateFn {Function} function that will return true/false whenever the current state of the `ctx` can
 *                              execute operations
 *
 * @param recoverFailFn {Function} function that will try to recover the `ctx` IF the last X
 *                                  (see `OpQueue.MAX_ERROR_RETRIES`) calls were blocked by the state of the `ctx`
 * @returns {OpQueue}
 * @constructor
 */
var OpQueue = function(ctx, validateFn, recoverFailFn) {
    this.ctx = ctx;
    this._queue = [];

    this.validateFn = validateFn;
    this.recoverFailFn = recoverFailFn;
    this.MAX_ERROR_RETRIES = 10;
    this.retryTimeout = 1000;

    this._error_retries = 0;

    this.tickTimer = this.retry();

    return this;
};

/**
 * Add operation to the queue
 *
 * @param opName
 * @param arrArgs
 * @param secondArg
 * @param thirdArg
 */
OpQueue.prototype.queue = function(opName, arrArgs, secondArg, thirdArg) {
    arrArgs = arrArgs || [];

    this._queue.push(
        [
            opName,
            arrArgs,
            secondArg,
            thirdArg
        ]
    );

    this.pop(); // try to exec the op immediately
};

/**
 * This method will queue a retry in the next 1sec
 *
 * @returns {number} setTimeout id
 */
OpQueue.prototype.retry = function() {
    if(this.tickTimer) {
        clearTimeout(this.tickTimer);
        this.tickTimer = null;
    }
    var self = this;

    return this.tickTimer = setTimeout(function() {
        this.tickTimer = null;
        self.pop();
    }, self.retryTimeout);
}

/**
 * Pop the next queued operation in the queue and execute it.
 * Also this method will try to do the following optimisations:
 * 1) group if the next queued operations are with the same name (function name) and their first argument is an array
 * (e.g. they support grouping)
 * 2) verify {mpenc.ProtocolHandler.exclude} calls
 * 3) verify {mpenc.ProtocolHandler.join} calls
 * 4) will skip this method if its trying to be called wihtout ANY arguments (at least 1 arg is required when queuing
 * operations)
 *
 * @returns {*}
 */
OpQueue.prototype.pop = function() {
    if(this._queue.length == 0) {
        return true;
    }

    this._currentOp = this._queue[0];

    if(this.validateFn(this, this._queue[0])) {
        var op = this._queue.shift();

        if($.isArray(op[1])) { // supports combining multiple ops
            /**
             * if the next X ops are the same, combine them (call the op, with args = args1 + args2 + args3)
             */

            var lastRemovedElementId = -1;
            $.each(this._queue.slice(), function(k, v) {
                if(v[0] == op[0]) {
                    op[1] = op[1].concat(v[1])
                    lastRemovedElementId = k;
                } else {
                    return false;
                }
            });
            if(lastRemovedElementId != -1) {
                this._queue = this._queue.splice(lastRemovedElementId + 1);
            }
        }

        var self = this;

        // per OP optimisations and safe guards
        if(op[0] == "exclude") {
            // exclude only users who are CURRENTLY in the cliquesMember members list
            var op1 = [];
            $.each(op[1], function(k, v) {
                if(self.ctx.cliquesMember.members.indexOf(v) !== -1) {
                    op1.push(
                        v
                    );
                }
            });
            op[1] = op1; // replace
        } else if(op[0] == "join") {
            // join only users who are NOT CURRENTLY in the cliquesMember members list
            var op1 = [];
            $.each(op[1], function(k, v) {
                if(self.ctx.cliquesMember.members.indexOf(v) === -1) {
                    op1.push(
                        v
                    );
                }
            });
            op[1] = op1; // replace
        }
        if(op[1].length == 0 && op[0] != "recover") {
            if(localStorage.d) {
                console.warn("OpQueue will ignore: ", op, "because of not enough arguments.");
            }
        } else {
            this.ctx[op[0]](op[1], op[2], op[3]);
        }

        return this.pop();
    } else {
        if(this._error_retries > this.MAX_ERROR_RETRIES) {
            this._error_retries = 0;
            this.recoverFailFn(this);
        } else {
            if(localStorage.d) { console.error("OpQueue Will retry: ", this._currentOp, this._queue[0]); }
            this._error_retries++;

            this.tickTimer = this.retry();
        }
        return false;
    }
};