(function() {
    window.mega = window.mega || {};
    window.mega.devtools = window.mega.devtools || {};
    window.mega.devtools.transcripter = window.mega.devtools.transcripter || {};
    window.mega.devtools.transcripter.exporter = window.mega.devtools.transcripter.exporter || {};

    window.mega.devtools.transcripter.exporter.callLog = {};
    window.mega.devtools.transcripter.exporter.callLogOrdered = {};

    var bnchmarkGetContext = function (ctx, parent, rootCtx) {
        var str = ctx;
        var res = !rootCtx ? window : rootCtx;
        while (str) {
            //console.error("Before", str, res, str.split("."));
            var x = str.split(".");
            var prop = x.shift();
            res = res[prop];
            if (!res) {
                return undefined;
            }
            if (parent === true && x.length == 1) {
                return [res, x[0]];
            } else if (parent === true && x.length == 0 && ctx.indexOf(".") === -1) {
                return [!rootCtx ? window : rootCtx, ctx];
            }
            str = x.join(".");
            //console.error("After", str, res, str ? str.split(".")[0] : "", str ? str.split(".")[1] : "");
        }
        ;

        return res;
    };
    var whenVarIsAvailable = function (ctx, cb) {
        var waitingInterval = setInterval(function () {
            var ctxEvaled = bnchmarkGetContext(ctx);
            if (typeof ctxEvaled !== 'undefined') {
                cb(ctxEvaled);
            }
            clearInterval(waitingInterval);
        }, 10);
    };

    var patchAndLogFnCalls = function (context, doConsoleError, cb) {
        var waitingInterval = setInterval(function () {
            var ctxEvaled = bnchmarkGetContext(context);
            var ctxEvaledParentMeta = bnchmarkGetContext(context, true);

            if (typeof ctxEvaled !== 'undefined' && !ctxEvaled.patched) {
                var old_fn = ctxEvaled;
                ctxEvaledParentMeta[0][ctxEvaledParentMeta[1]] = function () {

                    if (doConsoleError) {
                        var dt = new Date();
                        console.error("benchmark", dt, dt.getMilliseconds(), "called: ", context, arguments);
                    }
                    var callLog = window.mega.devtools.transcripter.exporter.callLog;

                    if (!callLog[context]) {
                        callLog[context] = {};
                    }

                    var ret = old_fn.apply(this, arguments);


                    if (!callLog[context].calls) {
                        callLog[context].calls = [];
                    }

                    var meta = {
                        'context': this,
                        'arguments': arguments,
                        'result': ret
                    };

                    callLog[context].calls.push(meta);

                    if(cb) {
                        cb(context, meta);
                    }

                    return ret;
                };
                ctxEvaledParentMeta[0][ctxEvaledParentMeta[1]].patched = true;
                clearInterval(waitingInterval);
            }
        }, 10);
    };

    var getChatIdFromProtocolHandler = function(ph) {
        var found = false;
        megaChat.chats.forEach(function(chat) {
            if (found !== false) {
                return;
            }
            if (chat.protocolHandler === ph) {
                found = chat.chatId;
            }
        });
        return found;
    };

    var callLogger = function(contextName, meta) {
        var chatId = getChatIdFromProtocolHandler(meta.context);
        if (!mega.devtools.transcripter.exporter.callLogOrdered[chatId]) {
            mega.devtools.transcripter.exporter.callLogOrdered[chatId] = [];
        }
        meta.contextName = contextName;

        mega.devtools.transcripter.exporter.callLogOrdered[chatId].push(
            meta
        );
    };

    patchAndLogFnCalls('strongvelope.ProtocolHandler.prototype.encryptTo', false, callLogger);
    patchAndLogFnCalls('strongvelope.ProtocolHandler.prototype.decryptFrom', false, callLogger);
    patchAndLogFnCalls('strongvelope.ProtocolHandler.prototype.seed', false, callLogger);

    window.mega.devtools.transcripter.exporter.generateStrongvelopeTranscriptForRoom = function (chatRoom) {
        var ph = chatRoom.protocolHandler;


        var functionCallLog = [];
        assert(
            mega.devtools.transcripter.exporter.callLogOrdered[chatRoom.chatId],
            'nothing is logged for this chatRoom'
        );

        mega.devtools.transcripter.exporter.callLogOrdered[chatRoom.chatId].forEach(function(callEntry) {
            functionCallLog.push({
                'contextName': callEntry.contextName,
                'arguments': callEntry.arguments,
                'result': callEntry.result
            });
        });

        var transcript = {
            'functionCallLog': functionCallLog
        };

        [
            'u_handle',
            'u_privk',
            'u_privCu25519',
            'u_privEd25519',
            'u_pubCu25519',
            'u_pubEd25519',
            'u_pubkeys',
            'pubEd25519',
            'pubCu25519'
        ].forEach(function (k) {
            transcript[k] = window[k];
        });

        // add participants
        var participants = [
            u_handle
        ];

        $.each(chatRoom.getParticipantsExceptMe(), function (k, v) {
            v = Karere.getNormalizedBareJid(v); // always convert to bare jid
            participants.push(megaJidToUserId(v));
        });

        transcript['participants'] = participants;


        return transcript;

    };

    window.mega.devtools.transcripter.exporter.exportStrongvelopeTranscriptForRoom = function (chatRoom) {
        var r = window.mega.devtools.transcripter.exporter.generateStrongvelopeTranscriptForRoom(chatRoom);

        var fname = chatRoom.chatId + '.json';

        var downloadButton = $('<a href="javascript:;">Download ' + fname + '</a>');
        downloadButton.css({
            'width': '100%',
            'height': '100%',
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'right': '0',
            'bottom': '0',
            'background-color': 'rgba(0, 0, 0, 0.9)',
            'color': 'rgba(255, 255, 255, 0.9)',
            'text-align': 'center',
            'display': 'inline-block',
            'padding-top': '25%',
            'vertical-align': 'middle',
            'z-index': 9999999
        });

        var closeButton = $('<a href="javascript:;">[X]</a>');
        closeButton.css({
            'position': 'fixed',
            'top': '0',
            'right': '0',
            'background-color': 'rgba(255, 0, 0, 0.9)',
            'color': 'rgba(255, 255, 255, 1)',
            'text-align': 'center',
            'padding': '10px 8px',
            'z-index': 99999999
        });
        closeButton.on('click', function() {
            closeButton.remove();
            downloadButton.remove();
        });
        $(document.body).prepend(closeButton);

        var data = JSON.stringify(r, null, 4);
        var json = 'data:application/json;charset=utf-8,'
            + encodeURIComponent(data);
        downloadButton.attr('href', json);
        downloadButton.attr('target', '_blank');
        downloadButton.attr('download', fname);
        downloadButton.on('click', function () {
            closeButton.remove();
            downloadButton.remove();
        });

        $(document.body).prepend(downloadButton);

        return r;
    };

})();
