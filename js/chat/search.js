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

console.error("TODO: remove me.");
function avtest() {
    megaChat.chats.forEach(function(room) {
        room.rebind("onHistoryDecrypted.test", function() {
            console.warn(room.chatId + ": onHistoryDecrypted");
        });
    });
}

function RoomSearch(parentSearch, room) {
    var self = this;
    self.parentSearch = parentSearch;
    self.room = room;
    self.logger = MegaLogger.getLogger("ChatSearch[" + room.chatId + "]",
        parentSearch.logger._myOpts, parentSearch.logger);
    room.attachSearch();
    self._setState(SearchState.kNew);
    self.room.rebind("onHistoryDecrypted.search", function() {
        try {
            setTimeout(function() {
                self.onHistoryFetched();
            }, 0);
        } catch (e) {
            self.error("Exception in onHistoryDecrypted.search:", e);
        }
    });
}

RoomSearch.prototype.resume = function() {
    var self = this;
    if (self.state >= SearchState.kInProgress) {
        return;
    }

    var room = self.room;
    if (self.state === SearchState.kNew) {
        // match chat topic
        self.match(room.topic, SearchResultType.kChatTopic);
        // match room member names
        var members = room.members;
        if (members) {
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
                self.match(msg.textContents, SearchResultType.kMessage, msg);
            }
        }
    }
    if (!room.messagesBuff.haveMoreHistory()) {
        self._setComplete();
    } else {
        self._setState(SearchState.kInProgress); // in case it was paused or new
        self.fetchMoreHistory(); // will set state to kInProgress and attach handler if needed
    }
};

RoomSearch.prototype.fetchMoreHistory = function() {
    var self = this;
    assert(self.state === SearchState.kInProgress);
    self._isFetchingHistory = true;
    // console.warn(self.room.chatId +": Requesting more history");
    setTimeout(function() {
        self.room.messagesBuff.retrieveChatHistory(1024);
    }, 0);
};

RoomSearch.prototype.onHistoryFetched = function() {
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
                self.match(msg.textContents, SearchResultType.kMessage, msg);
            }
        }
        if (haveMoreHistory && self.state === SearchState.kInProgress) {
            self.fetchMoreHistory();
        }
    } else {
        // we may receive a dummy event, then numFetched will be 0
        self.logger.debug("onHistoryFetched: No new messages fetched");
    }
    if (self.state === SearchState.kDestroying || !haveMoreHistory && self.state !== SearchState.kPaused) {
        self._setComplete();
    }
};

RoomSearch.prototype._destroy = function() {
    this._setState(this.state !== SearchState.kComplete ? SearchState.kDestroying : this.state);
};

RoomSearch.prototype.pause = function() {
    if (this.state === SearchState.kInProgress) {
        this._setState(SearchState.kPaused);
    }
};

RoomSearch.prototype._setState = function(newState) {
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
    if (this.state === SearchState.kComplete) {
        return;
    }
    delete this._isFetchingHistory;
    this._setState(SearchState.kComplete);
    this.room.detachSearch();
    this.room.unbind("onHistoryDecrypted.search");
    this.logger.log("Fetch and search complete", "(total",
        this.room.messagesBuff.messages.length, "messages)");
    this.parentSearch.onRoomSearchComplete(this);
};

RoomSearch.prototype.match = function(str, type, data) {
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

    var result = { type: type, text: str, matches: matches };
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
 * @param megaChat The global MegaChat object
 * @param chatId The id of the chat where to perform the search. If it's null, then the search
 * is performed on all chats
 * @param searchExpr Either a string to be searched for, or a RegExp object.
 *  If this parameter is a string, a RegExpr object is created with it, with the 'i' and 'g' flags.
 *  In this case, any regex special characters in the string will be treated as such. If they are
 *  to be treated literally, they should be escaped, as in an actual regular expression.
 * @param handler The user handler that received the search results and the search completion event.
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
 */
function ChatSearch(megaChat, chatId, searchExpr, handler) {
    var self = this;
    self.megaChat = megaChat;
    self.allChats = megaChat.chats;
    if (searchExpr instanceof RegExp) {
        assert(searchExpr.flags.indexOf('g') >= 0, "Search RegExpr must have the 'g' flag set");
        self.searchRegExp = searchExpr;
    } else {
        self.searchRegExp = new RegExp(searchExpr, 'gi');
    }
    self.setupLogger();
    var searches = self.roomSearches = [];
    if (handler) {
        self.handler = handler;
    } else { // default, dummy handler
        self.handler = {
            onResult: function(room, result) {
                var data = result.data;
                if (data && typeof data === 'object') { // may not be JSON-friendly
                    var ctor = data.constructor;
                    if (ctor && ctor.name) {
                        result.data = "<" + ctor.name + " object>";
                    } else {
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
        megaChat.chats.forEach(function(room) {
            if (room.chatId === chatId) {
                searches.push(new RoomSearch(self, room));
            }
        });
        if (searches.length < 1) {
            throw new Error("Could not find a room for chatid " + chatId);
        }
    } else { // search all chatrooms
        self.allChats.forEach(function(room) {
            searches.push(new RoomSearch(self, room));
        });
    }
}

ChatSearch.doSearch = function(s, onResult, onComplete) {
    var megaPromise = new MegaPromise();

    var results = new MegaDataSortedMap("resultId", function(a, b) {
        // TODO: impl
        if (a.type === SearchResultType.kMessage && b.type === SearchResultType.kMessage) {
            return a.data.delay < b.data.delay ? -1 : (a.data.delay > b.data.delay ? 1 : 0);
        }
        else if (
            (a.type === SearchResultType.kMessage || b.type === SearchResultType.kMessage) &&
            a.type !== b.type
        ) {
            return a.type !== SearchResultType.kMessage ? -1 : 1;
        }
        else {
            var aChat = megaChat.getChatById(a.chatId);
            var bChat = megaChat.getChatById(b.chatId);
            return (bChat && bChat.lastActivity || 0) - (aChat && aChat.lastActivity || 0);
        }
    });
    ChatSearch.doSearch.currentResults = results;

    if (ChatSearch.doSearch.megaPromise) {
        ChatSearch.doSearch.megaPromise.cs.destroy();
        ChatSearch.doSearch.megaPromise.always(function() {
            megaPromise.linkDoneAndFailTo(ChatSearch.doSearch(s, onResult, onComplete));
        });
        return megaPromise;
    }
    else {
        var handler = {
            'onResult': function(room, resultMeta) {
                resultMeta['chatId'] = room.chatId;
                resultMeta['room'] = room;
                resultMeta['resultId'] = resultId++;
                results.push(resultMeta);
                // console.error(room, resultMeta);
                onResult && onResult(room.chatId, resultMeta, results);
            },
            'onComplete': function() {
                megaPromise.resolve(cs, results);
                onComplete && onComplete();
            },
        };

        var cs = new ChatSearch(megaChat, false, s, handler);
        // console.error('search > doSearch() -> cs:', cs);


        var resultId = 0;

        ChatSearch.doSearch.megaPromise = megaPromise;
        megaPromise.always(function() {
            delete ChatSearch.doSearch.megaPromise;
        });

        results.dump = function() {
            this.forEach(function(r) {
                console.error(r.data && r.data.messageId ? r.data.messageId : null, r.chatId, r.type, r);
            });
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
    var self = this;
    var opts = {
        minLogLevel: function() {
            return MegaLogger.LEVELS.DEBUG;
        },
        transport: function(level, args) {
            var fn;
            var levels = MegaLogger.LEVELS;
            switch(level) {
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

ChatSearch.prototype.resume = function() {
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
 */
ChatSearch.prototype.pause = function() {
    var len = this.roomSearches.length;
    for (var i = 0; i < len; i++) {
        this.roomSearches[i].pause();
    }
};

ChatSearch.prototype.onRoomSearchComplete = function(roomSearch) {
    var searches = this.roomSearches;
    var len = searches.length;
    for (var i = 0; i < len; i++) {
        if (searches[i].state < SearchState.kComplete) {
            console.error(searches[i].state);
            return;
        }
    }
    console.error('onComplete');
    this.handler.onComplete();
};


/**
 * Debug only.
 */
ChatSearch.prototype.dumpRoomSearchesStates = function() {
    this.roomSearches.forEach(function(rs) {
        console.error(constStateToText(SearchState, rs.state), rs);
    });
};

/**
 * Completely aborts the search. No callbacks will be called after call to this method.
 */
ChatSearch.prototype.destroy = function() {
    var searches = this.roomSearches;
    var len = searches.length;
    for (var i = 0; i < len; i++) {
        searches[i]._destroy();
    }

    if (ChatSearch._instance === this) {
        delete ChatSearch._instance;
    }
};
