(function(scope) {
    "use strict";

    /**
     * Basic profiling for chat loading times and generic numeric stats for chat.
     *
     * @param megaChat
     * @param options
     * @returns {ChatStats}
     * @constructor
     */
    var ChatStats = function(megaChat, options) {
        var self = this;

        self.initialized = false;

        self.data = {
            /*
            * initialise using some data copied from the code of mega.loadReport, which would be
            * handy for chat too.
             */
            'bv': buildVersion.timestamp, // build version
            'as': Object.keys(M.d || {}).length, // generic account size,
            'cc': navigator.hardwareConcurrency | 0, // cpu cores
            'slt': pageLoadTime, // secureboot's resources load time
            'ws': workers && workers.length || -666,
            'ms': u_type === 3 ? (mBroadcaster.crossTab.master ? 1 : 0) : -1, // master, or slave tab?
        };

        options = options || {};

        options.parentLogger = megaChat.logger;

        this.unwrapOnDone = [];
        this.eventsForUnbinding = [];
        self.done = false;

        if (!megaChat.chatStats) {
            megaChat.chatStats = self;
            self.megaChat = megaChat;
            self.initialized = Date.now();
            if (localStorage.debugChatStats) {
                console.error("Stats generation start.");
            }
            self.initDataCollectors();
        }

        return this;
    };

    ChatStats.RESULT_TYPES = {
        'SUCCESS': 0x5ccee55,
        'FAILED': -0xf4111
    };

    /**
     * Helper method for retrieving variables from a specific scope, e.g. from string to the actual variable value
     *
     * @param ctx
     * @param parent
     * @param rootCtx
     * @returns {*}
     */
    ChatStats._getContext = function(ctx, parent, rootCtx) {
        var str = ctx;
        var res = !rootCtx ? window : rootCtx;
        while (str) {
            // console.error("Before", str, res, str.split("."));
            var x = str.split(".");
            var prop = x.shift();
            try {
                res = res[prop];
                if (!res) {
                    return undefined;
                }
            }
            catch (e) {
                return undefined;
            }
            if (parent === true && x.length == 1) {
                return [res, x[0]];
            } else if (parent === true && x.length == 0 && ctx.indexOf(".") === -1) {
                return [!rootCtx ? window : rootCtx, ctx];
            }
            str = x.join(".");
            // console.error("After", str, res, str ? str.split(".")[0] : "", str ? str.split(".")[1] : "");
        }

        return res;
    };

    /**
     * Alias.
     *
     * @returns {Number}
     */
    var microtime = function() {
        return 0 + Date.now();
    };


    /**
     * Check if all chats are loaded and if yes, then it would send the calculated chat stats via api_req('log')
     */
    ChatStats.prototype.sendIfChatsReady = function() {
        var self = this;
        var megaChat = self.megaChat;

        if (self.done) {
            return;
        }

        var chatIds = megaChat.chats.keys();

        for (var i = 0; i < chatIds.length; i++) {
            var chatRoom = megaChat.chats[chatIds[i]];
            var promise = chatRoom.messagesBuff.$msgsHistoryLoading || chatRoom.messagesBuff.isDecrypting;

            if (promise) {
                promise.finally(self.sendIfChatsReady.bind(self));
                return;
            }
        }

        self.done = true;

        // send data, if any
        if (chatIds.length) {
            self.data.cr = microtime() - self.initialized;
            self.data.idb = typeof megaChat.plugins.chatdIntegration.chatd.chatdPersist === 'undefined' ? 0 : 1;
            self.data.tc = megaChat.chats.length;

            var totalMsgs = 0;
            // eslint-disable-next-line local-rules/misc-warnings
            megaChat.chats.forEach(function(chat) {
                totalMsgs += chat.messagesBuff.messages.length;
            });
            self.data.tm = totalMsgs;

            var result = self.aggregateAndLog();

            api_req({a: 'log', e: 99670, m: JSON.stringify(result)});
        }

        self.cleanup();
    };

    /**
     * A function that collects all math for profiling the time (miliseconds)
     */
    ChatStats.prototype.initDataCollectors = function() {
        var self = this;


        if (!mBroadcaster.crossTab.master) {
            return;
        }

        var receivedMsgs = {};
        var shardConnecting = {};

        // time to first data received from shard
        self.unwrapOnDone.push(
            self.wrapFunction(
                'Chatd.Shard.prototype.reconnect',
                false,
                function() {
                    var shard = this.shard;
                    shardConnecting[shard] = microtime();
                    self.unwrapOnDone.push(
                        self.wrapFunction(
                            'exec',
                            false,
                            function() {
                                if (shardConnecting[shard]) {
                                    if (!self.data["sc"]) {
                                        self.data["sc"] = 0;
                                    }
                                    self.data["sc"] += microtime() - shardConnecting[this.shard];
                                    delete shardConnecting[this.shard];
                                }
                            },
                            this
                        )
                    );
                })
        );

        var histRetrievalStartTimes = {};
        self.unwrapOnDone.push(
            self.wrapFunction(
                'Chatd.Shard.prototype.hist',
                false,
                function(args, resp, unwrapFn) {
                    histRetrievalStartTimes[args[0]] = [microtime(), this.shard];
                    receivedMsgs[args[0]] = 0;
                })
        );

        self.unwrapOnDone.push(
            self.wrapFunction(
                'Chatd.Messages.prototype.store',
                false,
                function(args, resp, unwrapFn) {
                    var newmsg = args[0];
                    var chatId = this.chatId;

                    if (!newmsg) {
                        if (!receivedMsgs[chatId]) {
                            receivedMsgs[chatId] = 0;
                        }
                        receivedMsgs[chatId]++;
                    }
                })
        );

        var chatd = self.megaChat.plugins.chatdIntegration.chatd;
        chatd.rebind('onMessagesHistoryDone.chatStats', function(e, data) {
            var chatId = base64urldecode(data.chatId);
            var stats = histRetrievalStartTimes[chatId];
            if (stats) {
                var startTime = stats[0];

                var messagesCount = receivedMsgs[chatId];
                if (startTime && messagesCount > 0) {
                    self.data['chr#' + data.chatId] = [
                        messagesCount,
                        microtime() - startTime
                    ];
                }
            }
        });

        self.eventsForUnbinding.push(
            [chatd, 'onMessagesHistoryDone.chatStats']
        );

        var decryptionStart = {};
        self.megaChat.rebind("onRoomInitialized.chatStats", function(e, chatRoom) {
            chatRoom.rebind('onChatdIntegrationReady.chatStats', function() {
                chatRoom.messagesBuff.rebind('onHistoryFinished.chatStats', function() {
                    var chatId = base64urldecode(chatRoom.chatId);
                    decryptionStart[chatId] = microtime();
                });
            });
            self.eventsForUnbinding.push(
                [chatRoom, 'onChatdIntegrationReady.chatStats']
            );

            chatRoom.rebind('onHistoryDecrypted.chatStats', function() {
                var chatId = base64urldecode(chatRoom.chatId);
                var messagesCount = receivedMsgs[chatId];
                var startTime = decryptionStart[chatId];

                if (startTime && messagesCount > 0) {
                    self.data['hd#' + base64urlencode(chatId)] = [
                        messagesCount,
                        microtime() - startTime
                    ];
                }
            });
            self.eventsForUnbinding.push(
                [chatRoom, 'onHistoryDecrypted.chatStats']
            );

            chatRoom.rebind('onHistoryDone.chatStats', function() {
                // eventually send if HistDone is triggered for a chat with no history (it would not trigger
                // the HistoryDecrypted/HistoryDecryptedDone events)
                self.sendIfChatsReady();
            });
            self.eventsForUnbinding.push(
                [chatRoom, 'onHistoryDone.chatStats']
            );

            chatRoom.rebind('onHistoryDecryptedDone.chatStats', function() {
                self.sendIfChatsReady();
            });

            self.eventsForUnbinding.push(
                [chatRoom, 'onHistoryDecryptedDone.chatStats']
            );

        });
        self.eventsForUnbinding.push(
            [self.megaChat, "onRoomInitialized.chatStats"]
        );
    };

    /**
     * Utility method for adding pre and post fn calls (cbStart and cbEnd) for a specific function.
     * E.g. `.wrapFunction('window.test123', function start(){}, function end(){})` would replace `test123` with a
     * temp function, that when called would do:
     * 1) call start(currentContext, arguments, unwrapFn);
     * 2) call the real test123
     * 3) then call end(currentContext, arguments, resultForTest123, unwrapFn).
     *
     * As the name suggest, calling the passed unwrapFn would unwrap and revert the original function.
     *
     * @param ctx {String}
     * @param [cbStart] {Function}
     * @param [cbEnd] {Function}
     * @param [rootContext] {*}
     * @returns {*}
     */
    ChatStats.prototype.wrapFunction = function(ctx, cbStart, cbEnd, rootContext) {
        var self = this;
        var origFn = ChatStats._getContext(ctx, false, rootContext);
        // direct ref
        var parentsCtx = ChatStats._getContext(ctx, true, rootContext);

        if (origFn && parentsCtx) {
            var fnName = parentsCtx[1];
            var parentCtx = parentsCtx[0];

            parentCtx[fnName] = function() {
                if (cbStart) {
                    cbStart.call(this, arguments, parentCtx[fnName].unwrap);
                }
                var res = origFn.apply(this, arguments);
                if (cbEnd) {
                    cbEnd.call(this, arguments, res, parentCtx[fnName].unwrap);
                }

                return res;
            };

            parentCtx[fnName].unwrap = function() {
                if (parentCtx[fnName] !== origFn) {
                    parentCtx[fnName] = origFn;
                }
            };
            return parentCtx[fnName].unwrap;
        }
        else {
            console.warn('Could wrap fn stats for: ', ctx);
            return false;
        }
    };

    /**
     * This method would go thru all .data, aggregate it, annonymise it and log it.
     */
    ChatStats.prototype.aggregateAndLog = function() {
        var self = this;

        var aggregatedData = {};
        var aggregatedVals = {};
        Object.keys(self.data).forEach(function(k) {
            var v = self.data[k];
            if ($.isArray(v)) {
                if (k.indexOf("#") !== -1) {
                    var newKey = k.split("#")[0];

                    if (!aggregatedVals[newKey]) {
                        aggregatedVals[newKey] = [];
                    }
                    aggregatedVals[newKey].push(v);
                }
                else {
                    aggregatedData[k] = v;
                }
            }
            else {
                aggregatedData[k] = v;
            }
        });

        Object.keys(aggregatedVals).forEach(function(k) {
            var valsArr = aggregatedVals[k];
            var count = 0;
            var time = 0;
            valsArr.forEach(function(val) {
                count += val[1];
                time += val[0];
            });

            aggregatedData[k] = [
                count, time
            ];
        });

        if (localStorage.debugChatStats) {
            console.error("Stats generation, done: ", aggregatedData, microtime() - this.initialized);
        }

        return aggregatedData;
    };

    /**
     * After stats are sent, we want to cleanup any event handlers or wrapped functions so that the chatStats, would
     * simply not do anything anymore (and would not get any of its method called for no reason).
     */
    ChatStats.prototype.cleanup = function() {
        var self = this;
        self.unwrapOnDone.forEach(function(unwrapFn) {
            if (unwrapFn) {
                unwrapFn();
            }
        });

        self.eventsForUnbinding.forEach(function(eventInfo) {
            eventInfo[0].off(eventInfo[1]);
        });
        self.unwrapOnDone = [];
        self.eventsForUnbinding = [];
        if (localStorage.debugChatStats) {
            console.error("Chat stats cleanup done.");
        }
    };

    scope.ChatStats = ChatStats;
})(window);
