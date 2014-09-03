/**
 * Simple queue that will "queue" function calls
 * Additional functionality is added for proper handling/reordering/optimisation for mpENC
 *
 * @param ctx {mpenc.ProtocolHandler}
 *
 * @param megaRoom {MegaChatRoom}
 *
 * @param validateFn {Function} function that will return true/false whenever the current state of the `ctx` can
 *                              execute operations
 *
 * @param recoverFailFn {Function} function that will try to recover the `ctx` IF the last X
 *                                  (see `OpQueue.MAX_ERROR_RETRIES`) calls were blocked by the state of the `ctx`
 * @returns {OpQueue}
 * @constructor
 */
var OpQueue = function(ctx, megaRoom, validateFn, recoverFailFn) {
    this.ctx = ctx;
    this.megaRoom = megaRoom;
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
 * @param [secondArg]
 * @param [thirdArg]
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
};

/**
 * This method is called before an op is about to be executed.
 * If any preparation is required before the execution of the op is required, this method should return a $.Deferred
 * instance.
 * If no preparation is required, either true/false can be returned.
 *
 * @param op {Array} queued operation
 * @returns {boolean|$.Deferred}
 */
OpQueue.prototype.preprocess = function(op) {
    var self = this;

    if(op[0] == "processMessage") {
        var wireMessage = op[1];

        var fromBareJid = Karere.getNormalizedBareJid(wireMessage.from);

        if(localStorage.d) {
            console.error("Processing: ", wireMessage)
        }

        var contact = self.megaRoom.megaChat.getContactFromJid(fromBareJid);
        assert(!!contact, 'contact not found.');

        var $promise1 = new $.Deferred();
        var $promise2 = new $.Deferred();

        var $combPromise = $.when($promise1, $promise2);

        var contact2 = self.megaRoom.megaChat.getContactFromJid(Karere.getNormalizedBareJid(wireMessage.toJid));

        $combPromise
            .fail(function() {
                if(localStorage.d) {
                    console.error("Could not process message: ", wireMessage);
                }
            })
            .done(function() {
                if(localStorage.d) {
                    console.error("[processMessage mpenc]", self.ctx.state, wireMessage);
                }
            });

        getPubEd25519(contact.u, function(r) {
            if(r) {
                try {
                    $promise1.resolve();
                } catch(e) {
                    if(localStorage.d) {
                        console.error("Failed to process message", wireMessage, "with error:", e);
                        if(localStorage.stopOnAssertFail) {
                            debugger;
                        }
                    }
                }
            } else {
                $promise1.reject();
            }
        });
        getPubEd25519(contact2.u, function(r) {
            if(r) {
                try {
                    $promise2.resolve();
                } catch(e) {
                    if(localStorage.d) {
                        console.error("Failed to process message", wireMessage, "with error:", e);
                        if(localStorage.stopOnAssertFail) {
                            debugger;
                        }
                    }
                }
            } else {
                $promise2.reject();
            }
        });

        return $combPromise;
    } else {
        return true;
    }
};

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
    var self = this;

    if(this._queue.length == 0) {
        return true;
    }

    if(this.$waitPreprocessing && this.$waitPreprocessing.state && this.$waitPreprocessing.state() == "pending") {
        // pause if we are waiting for op preprocessing.
        return true;
    }

    this.$waitPreprocessing = this.preprocess(this._queue[0]);



    $.when(this.$waitPreprocessing).done(function() {
        self._currentOp = self._queue[0];

        if(self.validateFn(self, self._queue[0])) {
            var op = self._queue.shift();

            if($.isArray(op[1])) { // supports combining multiple ops
                /**
                 * if the next X ops are the same, combine them (call the op, with args = args1 + args2 + args3)
                 */

                var lastRemovedElementId = -1;
                $.each(self._queue.slice(), function(k, v) {
                    if(v[0] == op[0]) {
                        op[1] = op[1].concat(v[1]);
                        lastRemovedElementId = k;
                    } else {
                        return false;
                    }
                });
                if(lastRemovedElementId != -1) {
                    self._queue = self._queue.splice(lastRemovedElementId + 1);
                }
            }

            // per OP optimisations and safe guards
            if(op[0] == "exclude") {
                // exclude only users who are CURRENTLY in the askeMember members list
                var op1 = [];
                $.each(op[1], function(k, v) {
                    if(self.ctx.askeMember.members.indexOf(v) !== -1) {
                        op1.push(
                            v
                        );
                    }
                });
                op[1] = op1; // replace
            } else if(op[0] == "join") {
                // join only users who are NOT CURRENTLY in the askeMember members list
                var op1 = [];
                $.each(op[1], function(k, v) {
                    if(self.ctx.askeMember.members.indexOf(v) === -1) {
                        op1.push(
                            v
                        );
                    }
                });
                op[1] = op1; // replace
            }

            if(localStorage.d) {
                if(op[0] == "processMessage") {
                    console.error("Will process message with contents: ", mpenc.codec.inspectMessageContent(op[1]));
                }
            }


            if(op[1].length == 0 && op[0] != "recover" && op[0] != "quit") {
                if(localStorage.d) {
                    console.warn("OpQueue will ignore: ", op, "because of not enough arguments.");
                }
            } else {
                try {
                    self.ctx[op[0]](op[1], op[2], op[3]);
                } catch(e) {
                    if(op[0] == "processMessage" || e.name == "TypeError") {
                        if(localStorage.stopOnAssertFail) {
                            debugger;
                        }
                    }

                    console.error("OpQueue caught mpenc exception: ", e, op);
                }
            }

            return self.pop();
        } else {
            if(self._error_retries > self.MAX_ERROR_RETRIES) {
                self._error_retries = 0;
                self.recoverFailFn(this);
            } else {
                if(localStorage.d) { console.error("OpQueue Will retry: ", self._currentOp, self._queue[0]); }
                self._error_retries++;

                self.tickTimer = self.retry();
            }
            return false;
        }
    });
};