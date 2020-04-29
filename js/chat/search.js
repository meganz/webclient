/** Usage:
 * var handler = {
 *     onResult: function(room, result) {
 *     ....
 *     // return 'true' from onResult() if you want to stop searching further in this room
 *     },
 *     onComplete: function() {
 *     ....
 *     }
 * };
 * var search = new ChatSearch(megaChat, null, "day", handler);
 * search.resume();
 *
 * Format of result:
 * {
 *      // Denotes where the match was found - chat title, member name or message
 *      type: SearchResultType,
 *      // The complete text of the chat title/member name/message
 *      text: string,
 *      // The actual matches, look below for detailed explanation
 *      matches: [
 *
 *          {idx: number, str: string},
 *          {idx: number, str: string},
 *          ....
 *      ],
 *      // Depends on the result type:
 *      //  For a member name - user handle of that member
 *      //  For message - the Message object
 *      //  For chat title, this member is not set
 *      data: any
 * }
 *
 * A single message/title, etc may match the search expression multiple times,
 * and in different ways (if regular expression is used). Each match is described
 * by the matching string and the position at which it occurs. THis is suatable for
 * displaying the whole/relevant message/title text in the GUI,
 * with the matching parts highlighted.
 */


var CS_HISTDECRYPTED_EVENTNAME = "onHistoryDecrypted.search";

var SearchState = Object.freeze({
    kNew: 0,
    kPaused: 1,
    kInProgress: 2,
    kDestroying: 3,
    kComplete: 4
});

var SearchResultType = Object.freeze({
    kMessage: 1,
    kChatTopic: 2,
    kMember: 3
});


function RoomSearch(parentSearch, room) {
    "use strict";
    var self = this;
    self.parentSearch = parentSearch;
    self.room = room;
    self.logger = MegaLogger.getLogger(
        "ChatSearch[" + room.chatId + "]",
        parentSearch.logger._myOpts,
        parentSearch.logger
    );
    room.attachSearch();
    self._setState(SearchState.kNew);
    self.room.rebind(CS_HISTDECRYPTED_EVENTNAME, function() {
        setTimeout(function() {
            self.onHistoryFetched();
        }, 0);
    });
}

RoomSearch.prototype.resume = function() {
    "use strict";
    var self = this;
    if (self.state >= SearchState.kInProgress) {
        return;
    }

    var room = self.room;
    if (self.state === SearchState.kNew) {
        // match chat topic
        room.topic && self.match(room.topic, SearchResultType.kChatTopic);
        // match room member names
        var members = room.members;
        // only search for  "other member name matches" if this is a 1on1, otherwise duplicated results are shown in
        // the ui
        if (members && room.type === "private") {
            for (var userid in members) {
                if (userid === u_handle) {
                    continue;
                }
                if (!M.u[userid]) {
                    self.logger.error("Unknown user handle", userid);
                    continue;
                }
                self.match(M.getNameByHandle(userid), SearchResultType.kMember, userid);
            }
        }
        // match messages that are already loaded
        var messages = room.messagesBuff.messages;
        self._lastMsgCount = messages.length;
        self.logger.debug("Initial message count:", self._lastMsgCount);
        for (var i = messages.length - 1; i >= 0; i--) {
            var msg = messages.getItem(i);
            if (msg && msg.textContents && msg.textContents.length > 0) {
                self.match(msg.textContents, SearchResultType.kMessage, msg, messages.length - i);
            }
        }
    }

    if (!room.messagesBuff.haveMoreHistory()) {
        self._setComplete();
    }
    else {
        self._setState(SearchState.kInProgress); // in case it was paused or new
        self.fetchMoreHistory(); // will set state to kInProgress and attach handler if needed
    }
};

RoomSearch.prototype.fetchMoreHistory = function() {
    "use strict";
    var self = this;
    assert(self.state === SearchState.kInProgress);
    self._isFetchingHistory = true;
    // console.warn(self.room.chatId +": Requesting more history");
    setTimeout(function() {
        self.room.messagesBuff.retrieveChatHistory(64);
    }, 128 /* give some CPU time for the main UI thread to do "real-time"-like updates */);
};

RoomSearch.prototype.onHistoryFetched = function() {
    "use strict";
    var self = this;
    if (self.state === SearchState.kComplete) {
        return;
    }
    var msgBuf = self.room.messagesBuff;
    var messages = msgBuf.messages;
    var newCount = messages.length;
    var haveMoreHistory = msgBuf.haveMoreHistory();

    var numFetched = newCount - self._lastMsgCount;
    if (numFetched > 0 && self.state !== SearchState.kDestroying) {
        self.logger.debug("onHistoryFetched: Fetched", numFetched, "messages");
        self._lastMsgCount = newCount;
        for (var i = 0; i < numFetched; i++) {
            var msg = messages.getItem(i);
            if (msg.textContents) {
                self.match(msg.textContents, SearchResultType.kMessage, msg, newCount - i);
            }
        }
        if (haveMoreHistory && self.state === SearchState.kInProgress) {
            self.fetchMoreHistory();
        }
    }
    else {
        // we may receive a dummy event, then numFetched will be 0
        self.logger.debug("onHistoryFetched: No new messages fetched");
    }
    if (self.state === SearchState.kDestroying || !haveMoreHistory && self.state !== SearchState.kPaused) {
        self._setComplete();
    }
};

RoomSearch.prototype._destroy = function() {
    "use strict";
    this._setState(this.state === SearchState.kComplete ? this.state : SearchState.kDestroying);
    this.room.detachSearch();
    this.room.unbind(CS_HISTDECRYPTED_EVENTNAME);
};

RoomSearch.prototype.pause = function() {
    "use strict";
    if (this.state === SearchState.kInProgress) {
        this._setState(SearchState.kPaused);
    }
};

RoomSearch.prototype._setState = function(newState) {
    "use strict";
    // console.error(
    //     this.room.chatId,
    //     this.parentSearch.searchRegExp,
    //     "setState",
    //     constStateToText(SearchState, this.state), constStateToText(SearchState, newState)
    // );

    // todo: validate state transitions
    this.state = newState;
};

RoomSearch.prototype._setComplete = function() {
    "use strict";
    if (this.state === SearchState.kComplete) {
        return;
    }
    delete this._isFetchingHistory;
    this._setState(SearchState.kComplete);
    this.room.unbind(CS_HISTDECRYPTED_EVENTNAME);
    this.logger.log("Fetch and search complete", "(total", this.room.messagesBuff.messages.length, "messages)");
    this.room.detachSearch();
    this.parentSearch.onRoomSearchComplete(this);
};

RoomSearch.prototype.match = function(str, type, data, index) {
    "use strict";
    var rx = this.parentSearch.searchRegExp;
    rx.lastIndex = 0;
    var m = rx.exec(str);
    if (!m) {
        return;
    }
    var matches = [];
    do {
        matches.push({idx: m.index, str: m[0]});
    } while ((m = rx.exec(str)));

    var result = { type: type, text: str, matches: matches, index: index };
    if (data) {
        result.data = data;
    }

    var stop = this.parentSearch.handler.onResult(this.room, result);
    if (stop) {
        this._setComplete();
    }
};
/**
 * Creates a text chat search object. Call .resume() on it to start the search
 * @param {Chat} megaChat The global MegaChat object
 * @param {String} chatId The id of the chat where to perform the search. If it's null, then the search
 * is performed on all chats
 * @param {String|RegExp} searchExpr Either a string to be searched for, or a RegExp object.
 *  If this parameter is a string, a RegExpr object is created with it, with the 'i' and 'g' flags.
 *  In this case, any regex special characters in the string will be treated as such. If they are
 *  to be treated literally, they should be escaped, as in an actual regular expression.
 * @param {Object} handler The user handler that received the search results and the search completion event.
 *  The handler needs to contain two methods:
 *      `onResult(room, result)`
 *          Receives results in realtime, as soon as they are found.
 *          `room` is the ChatRoom object of the chatroom where the result was found.
 *          `result` is an object containing the result. The format of this object is described separately.
 *          Normally this method is not expected to return a value, but if you want to stop searching
 *          further in this chatroom, return `true`. In that case, the search in this room will be
 *          marked as completed.
 *      `onComplete()`
 *          Notifies that the search has completed in all specified chatrooms.
 * If `null` is specified for the `handler` parameter, a builtin debug handler is used, which logs
 * the results and the `onComplete()` event to the console.
 *
 * @returns {ChatSearch} ChatSearch instance
 */
function ChatSearch(megaChat, chatId, searchExpr, handler) {
    "use strict";
    var self = this;
    self.megaChat = megaChat;
    self.allChats = megaChat.chats;
    if (searchExpr instanceof RegExp) {
        assert(searchExpr.flags.indexOf('g') >= 0, "Search RegExpr must have the 'g' flag set");
        self.searchRegExp = searchExpr;
    }
    else {
        self.searchRegExp = new RegExp(searchExpr, 'gi');
    }

    self.setupLogger();
    var searches = self.roomSearches = [];
    if (handler) {
        self.handler = handler;
    }
    else { // default, dummy handler
        self.handler = {
            onResult: function(room, result) {
                var data = result.data;
                if (data && typeof data === 'object') { // may not be JSON-friendly
                    var ctor = data.constructor;
                    if (ctor && ctor.name) {
                        result.data = "<" + ctor.name + " object>";
                    }
                    else {
                        result.data = "<object with unknown type>";
                    }
                }
                var msg = "onResult(" + room.chatId +
                    ", {type: " + constStateToText(SearchResultType, result.type) +
                    ", text: \"" + result.text + "\", matches: " + JSON.stringify(result.matches);
                if (result.data) {
                    msg += ", data: " + result.data;
                }
                msg += "})";
                console.warn(msg);
            },
            onComplete: function() {
                console.warn("Chat search complete!");
            }
        };
    }
    if (chatId) { // search a specific chatroom
        for (var roomId in megaChat.chats) {
            var room = megaChat.chats[roomId];
            if (megaChat.chats.hasOwnProperty(roomId) && room.chatId === chatId) {
                searches.push(new RoomSearch(self, room));
            }
        }

        if (searches.length < 1) {
            throw new Error("Could not find a room for chatid " + chatId);
        }
    }
    else { // search all chatrooms
        for (var roomId2 in self.allChats) {
            if (self.allChats.hasOwnProperty(roomId2)) {
                var room2 = self.allChats[roomId2];
                searches.push(new RoomSearch(self, room2));
            }
        }
    }
}

ChatSearch.doSearch = function(s, onResult, onComplete) {
    "use strict";

    var megaPromise = new MegaPromise();

    var results = {
        CONTACTS_AND_CHATS: new MegaDataSortedMap("resultId", function(a, b) {
            var aChat = a && a.room;
            var bChat = b && b.room;
            var aLastActivity = (aChat && aChat.lastActivity || 0);
            var bLastActivity = (bChat && bChat.lastActivity || 0);
            return aLastActivity > bLastActivity ? -1 : (aLastActivity < bLastActivity ? 1 : 0);
        }),
        MESSAGES: new MegaDataSortedMap("resultId", function(a, b) {
            return a.data.delay < b.data.delay ? 1 : (a.data.delay > b.data.delay ? -1 : 0);
        })
    };

    ChatSearch.doSearch.currentResults = results;

    var resultId = 0;
    var cs;

    if (ChatSearch.doSearch.megaPromise) {
        ChatSearch.doSearch.megaPromise.always(function() {
            megaPromise.linkDoneAndFailTo(ChatSearch.doSearch(s, onResult, onComplete));
        });
        ChatSearch.doSearch.megaPromise.cs.destroy();
        return megaPromise;
    }
    else {
        var handler = {
            'onResult': function(room, resultMeta) {
                resultMeta.chatId = room.chatId;
                resultMeta.room = room;
                resultMeta.resultId = resultId++;
                if (resultMeta.type === SearchResultType.kChatTopic || resultMeta.type === SearchResultType.kMember) {
                    results.CONTACTS_AND_CHATS.push(resultMeta);
                }
                else {
                    results.MESSAGES.push(resultMeta);
                }

                // console.error(room, resultMeta);
                onResult && onResult(room.chatId, resultMeta, results);
            },
            'onComplete': function() {
                megaPromise.resolve(cs, results);
                onComplete && onComplete();
            },
            'onDestroy': function() {
                megaPromise.reject();
                onComplete && onComplete();
            }
        };

        cs = new ChatSearch(megaChat, false, s, handler);
        // console.error('search > doSearch() -> cs:', cs);

        ChatSearch.doSearch.megaPromise = megaPromise;
        megaPromise.always(function() {
            delete ChatSearch.doSearch.megaPromise;
        });

        results.dump = function() {
            for (var r in results) {
                if (results.hasOwnProperty(r)) {
                    console.error(r.data && r.data.messageId ? r.data.messageId : null, r.chatId, r.type, r);

                }
            }
        };

        // debug;
        megaPromise.cs = cs;
        megaPromise.results = cs;
        // debug end;

        cs.resume();
    }

    return megaPromise;
};
ChatSearch.prototype.setupLogger = function() {
    "use strict";

    var self = this;
    var opts = {
        minLogLevel: function() {
            return MegaLogger.LEVELS.DEBUG;
        },
        transport: function(level, args) {
            var fn;
            var levels = MegaLogger.LEVELS;
            switch (level) {
                case levels.ERROR:
                case levels.CRITICAL:
                    fn = "error";
                    break;
                case levels.DEBUG:
                    fn = "debug";
                    break;
                case levels.LOG:
                    fn = "log";
                    break;
                case levels.INFO:
                    fn = "info";
                    break;
                case levels.WARN:
                    fn = "warn";
                    break;
                default:
                    fn = "log";
                    break;
            }
            console[fn].apply(console, args);
        }
    };
    self.logger = new MegaLogger('ChatSearch', opts);
    self.logger._myOpts = opts;
};

/**
 * Resumes current searches
 *
 * @returns {undefined}
 */
ChatSearch.prototype.resume = function() {
    "use strict";

    var len = this.roomSearches.length;
    for (var i = 0; i < len; i++) {
        this.roomSearches[i].resume();
    }
};
/**
 * Temporarily stops history fetching for chatrooms. Fetches that are currently in progress
 * will not be aborted, and their results (if any) will still be passed on onResult(), so the
 * user should be prepared to receive them. To completely abort the search, call ChatSearch.destroy()
 * instead. It guarantees that no callback will be called afterwards.
 *
 * @returns {undefined}
 */
ChatSearch.prototype.pause = function() {
    "use strict";

    var len = this.roomSearches.length;
    for (var i = 0; i < len; i++) {
        this.roomSearches[i].pause();
    }
};

/**
 * Called when room search completes
 *
 * @returns {undefined}
 */
ChatSearch.prototype.onRoomSearchComplete = function() {
    "use strict";

    var searches = this.roomSearches;
    var len = searches.length;
    for (var i = 0; i < len; i++) {
        if (searches[i].state < SearchState.kComplete) {
            // console.error(searches[i].state);
            return;
        }
    }
    // console.error('onComplete');
    this.handler.onComplete();
};


/**
 * Debug only.
 *
 * @returns {undefined}
 */
ChatSearch.prototype.dumpRoomSearchesStates = function() {
    "use strict";

    for (var rs in this.roomSearches) {
        if (this.roomSearches.hasOwnProperty(rs)) {
            console.error(constStateToText(SearchState, rs.state), rs);
        }
    }
};

/**
 * Completely aborts the search. No callbacks will be called after call to this method.
 *
 * @returns {undefined}
 */
ChatSearch.prototype.destroy = function() {
    "use strict";

    var searches = this.roomSearches;
    var len = searches.length;
    for (var i = 0; i < len; i++) {
        searches[i]._destroy();
    }

    if (ChatSearch._instance === this) {
        delete ChatSearch._instance;
    }

    if (this.handler.onComplete) {
        this.handler.onComplete();
    }
};
