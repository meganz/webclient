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

RoomSearch.prototype._matchMembers = function(members) {
    'use strict';
    var self = this;

    for (var userid in members) {
        if (userid === u_handle) {
            continue;
        }
        if (!M.u[userid]) {
            self.logger.error("Unknown user handle", userid);
            continue;
        }
        self.parentSearch._match(
            M.getNameByHandle(userid),
            SearchResultType.kMember,
            self.room.type === "private" ? userid : self.room.chatId,
            self
        );
    }
};

RoomSearch.prototype.resume = function() {
    "use strict";
    var self = this;
    if (self.state >= SearchState.kInProgress) {
        return;
    }

    var room = self.room;
    if (self.state === SearchState.kNew) {
        // match chat topic
        if (room.topic) {
            self.parentSearch._match(room.topic, SearchResultType.kChatTopic, undefined, self);
        }
        // match room member names
        var members = room.members;
        if (members) {
            self._matchMembers(members);
        }

        // match messages that are already loaded
        if (self.parentSearch.searchMessages) {
            var messages = room.messagesBuff.messages;
            self._lastMsgCount = messages.length;
            self.logger.debug("Initial message count:", self._lastMsgCount);
            for (var i = messages.length - 1; i >= 0; i--) {
                var msg = messages.getItem(i);
                if (msg && msg.textContents && msg.textContents.length > 0) {
                    self.parentSearch._match(
                        msg.textContents,
                        SearchResultType.kMessage,
                        msg,
                        self,
                        messages.length - i
                    );
                }
            }
        }
    }

    if (room.messagesBuff.haveMoreHistory() && self.parentSearch.searchMessages) {
        self._setState(SearchState.kInProgress); // in case it was paused or new
        self.fetchMoreHistory(); // will set state to kInProgress and attach handler if needed
    }
    else {
        self._setComplete();
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
                self.parentSearch._match(
                    msg.textContents,
                    SearchResultType.kMessage,
                    msg,
                    self,
                    newCount - i
                );
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

/**
 * Creates a text chat search object. Call .resume() on it to start the search
 * @param {Chat} megaChat The global MegaChat object
 * @param {String} chatId The id of the chat where to perform the search. If it's null, then the search
 * is performed on all chats
 * @param {String} searchExpr a string to be searched for
 * @param {Object} handler The user handler that received the search results and the search completion event.
 * @param {Boolean} searchMessages Flag indicating whether to search additionally for messages
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
function ChatSearch(megaChat, chatId, searchExpr, handler, searchMessages) {
    "use strict";
    var self = this;
    self.megaChat = megaChat;
    self.allChats = megaChat.chats;
    self.searchMessages = searchMessages;

    // normalize
    searchExpr = ChatSearch._normalize_str(searchExpr);

    self.originalSearchString = searchExpr;
    self.searchRegExps = [];

    var searchWords = searchExpr.split(" ");
    for (var i = 0; i < searchWords.length; i++) {
        var word = searchWords[i];
        if (word !== '') {
            // prepend ^ if the searchExpr is <= 2 chars length and only one word
            self.searchRegExps.push(
                new RegExp((searchWords.length === 1 && searchExpr.length <= 2 ? "^" : "") + RegExpEscape(word), 'gi')
            );
        }
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

/**
 * Alias for String.prototype.normalize + replace
 *
 * @param s
 * @returns {*}
 * @private
 */
ChatSearch._normalize_str = function(s) {
    "use strict";
    if (s && s.normalize) {
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    else {
        return s;
    }
};

/**
 * Invoke chat search.
 * @param {String} [searchExpr] a string to be searched for
 *  If this parameter is a string, a RegExpr object is created with it, with the 'i' and 'g' flags.
 *  In this case, any regex special characters in the string will be treated as such. If they are
 *  to be treated literally, they should be escaped, as in an actual regular expression.
 * @param {Function} [onResult] Callback to invoke per each result found.
 * @returns {Promise}
 */
ChatSearch.doSearch = promisify(function(resolve, reject, s, onResult, searchMessages) {
    "use strict";

    if (ChatSearch.doSearch.cs) {
        if (d) {
            console.info('Aborting running chat-search instance...', ChatSearch.doSearch.cs);
        }
        ChatSearch.doSearch.cs.destroy(SearchState.kDestroying);
    }

    var results = {
        CONTACTS_AND_CHATS: new MegaDataSortedMap("resultId", function(a, b) {
            var aChat = a && a.room;
            var bChat = b && b.room;
            var aLastActivity = aChat && aChat.lastActivity || 0;
            var bLastActivity = bChat && bChat.lastActivity || 0;
            return aLastActivity > bLastActivity ? -1 : (aLastActivity < bLastActivity ? 1 : 0);
        }),
        MESSAGES: new MegaDataSortedMap("resultId", function(a, b) {
            return a.data.delay < b.data.delay ? 1 : (a.data.delay > b.data.delay ? -1 : 0);
        })
    };

    ChatSearch.doSearch.currentResults = results;

    var resultId = 0;

    var contactHandleCache = {};
    var stime = unixtime();
    var handler = {
        'onResult': tryCatch(function(room, resultMeta) {
            resultMeta.room = room;
            resultMeta.chatId = room.chatId;
            resultMeta.data = resultMeta.data || room.chatId;
            resultMeta.resultId = resultId++;

            if (resultMeta.type === SearchResultType.kMessage) {
                results.MESSAGES.push(resultMeta);
            }
            else {
                if (!contactHandleCache[resultMeta.data]) {
                    results.CONTACTS_AND_CHATS.push(resultMeta);
                    contactHandleCache[resultMeta.data] = true;
                }
            }

            if (typeof onResult === 'function') {
                onResult(room.chatId, resultMeta, results);
            }
        }),
        'onComplete': function(reason) {
            delete ChatSearch.doSearch.cs;
            contactHandleCache = undefined;

            if (reason === SearchState.kDestroying) {
                reject(SearchState.kDestroying);
            }
            else {
                resolve(results);
            }
            eventlog(99734, JSON.stringify([1, s.length, reason | 0, resultId, unixtime() - stime]));

            // @todo indicate whether chats and/or messages (?)
            mBroadcaster.sendMessage('treesearch', s, 'chat', resultId);
        },
        'onDestroy': function(ex) {
            delete ChatSearch.doSearch.cs;
            reject(ex);
        }
    };


    ChatSearch.doSearch.cs = new ChatSearch(megaChat, false, s, handler, searchMessages);

    results.dump = function() {
        for (var r in results) {
            if (results.hasOwnProperty(r)) {
                console.error(r.data && r.data.messageId ? r.data.messageId : null, r.chatId, r.type, r);
            }
        }
    };

    eventlog(99733, JSON.stringify([1, s.length]));
    ChatSearch.doSearch.cs.resume();
});

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

    // match contacts
    if (this._matchedContacts !== true) {
        for (var userid in M.u) {
            if (!M.u.hasOwnProperty(userid) || userid === u_handle || M.u[userid].c !== 1) {
                continue;
            }
            this._match(M.getNameByHandle(userid), SearchResultType.kMember, userid, {'chatId': userid});

            if (this.originalSearchString.length > 2 && M.u[userid].m) {
                this._match(M.u[userid].m, SearchResultType.kMember, userid, {'chatId': userid});
            }
        }
        this._matchedContacts = true;
    }
    var len = this.roomSearches.length;
    for (var i = 0; i < len; i++) {
        this.roomSearches[i].resume();
    }
    if (len === 0) {
        // no room searches, mark as completed.
        this.handler.onComplete();
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
            return;
        }
    }
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
            rs = this.roomSearches[rs];
            console.error(constStateToText(SearchState, rs.state), rs);
        }
    }
};

/**
 * Do string matching
 *
 * @internal
 * @param str {String}
 * @param type {SearchResultType}
 * @param data {Object}
 * @param roomSearch {RoomSearch|String}
 * @param [index] {Number}
 */
ChatSearch.prototype._match = function(str, type, data, roomSearch, index) {
    "use strict";
    var matches = [];
    str = ChatSearch._normalize_str(str);
    var words = this.searchRegExps;
    for (var i = 0; i < words.length; i++) {
        var rx = words[i];
        rx.lastIndex = 0;
        var m = rx.exec(str);
        if (!m) {
            return;
        }
        do {
            matches.push({idx: m.index, str: m[0]});
        } while ((m = rx.exec(str)));
    }
    var result = {type: type, text: str, matches: matches, index: index};
    if (data) {
        result.data = data;
    }

    var stop = this.handler.onResult(roomSearch && roomSearch.room ? roomSearch.room : roomSearch, result);
    if (roomSearch && roomSearch._setComplete && stop) {
        roomSearch._setComplete();
    }
};
/**
 * Completely aborts the search. No callbacks will be called after call to this method.
 *
 * @returns {undefined}
 */
ChatSearch.prototype.destroy = function(reason) {
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
        this.handler.onComplete(reason);
    }
};
