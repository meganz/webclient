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
    'use strict';
    this.parentSearch = parentSearch;
    this.room = room;
    this.logger = MegaLogger.getLogger(
        `ChatSearch[${room.chatId}]`,
        parentSearch.logger._myOpts,
        parentSearch.logger
    );
    room.attachSearch();
    this._setState(SearchState.kNew);
    this.room.rebind(CS_HISTDECRYPTED_EVENTNAME, () => {
        onIdle(() => this.onHistoryFetched());
    });
}

RoomSearch.prototype._matchMembers = function(members) {
    'use strict';
    for (const userId in members) {
        if (members.hasOwnProperty(userId) && userId !== u_handle && M.u[userId]) {
            const regExps = this.parentSearch.searchRegExps;
            const matches = [];

            for (let i = regExps.length; i--;) {
                const regExp = regExps[i];
                let match;

                //  match names
                while ((match = regExp.exec(M.getNameByHandle(userId))) !== null) {
                    matches.push({ idx: match.index, str: match[0] });
                }

                if (!match) {
                    // match email
                    while ((match = regExp.exec(M.u[userId].m)) !== null) {
                        matches.push({ idx: match.index, str: match[0] });
                    }
                }
            }

            if (matches && matches.length) {
                this.parentSearch.handler.onResult(this.room, {
                    type: SearchResultType.kMember,
                    data: this.room.type === 'private' ? userId : this.room.chatId,
                    matches
                });
            }
        }
    }
};

RoomSearch.prototype.resume = function() {
    'use strict';
    if (this.state >= SearchState.kInProgress) {
        return;
    }

    const { room, state, parentSearch, logger } = this;
    if (state === SearchState.kNew) {
        // match chat topic
        if (room.topic) {
            parentSearch._match(room.topic, SearchResultType.kChatTopic, undefined, this);
        }
        // match room member names
        const { members } = room;
        if (members) {
            this._matchMembers(members);
        }

        // match messages that are already loaded
        if (parentSearch.searchMessages) {
            const { messagesBuff } = room;
            const { messages } = messagesBuff;
            this._lastMsgCount = messages.length;
            logger.debug('Initial message count:', messages.length);
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages.getItem(i);
                if (msg && msg.textContents && msg.textContents.length > 0) {
                    parentSearch._match(
                        msg.textContents,
                        SearchResultType.kMessage,
                        msg,
                        this,
                        messages.length - i
                    );
                }
            }
        }
    }

    if (room.messagesBuff.haveMoreHistory() && parentSearch.searchMessages) {
        this._setState(SearchState.kInProgress); // in case it was paused or new
        this.fetchMoreHistory(); // will set state to kInProgress and attach handler if needed
    }
    else {
        this._setComplete();
    }
};

RoomSearch.prototype.fetchMoreHistory = function() {
    'use strict';
    assert(this.state === SearchState.kInProgress);
    this._isFetchingHistory = true;
    // console.warn(self.room.chatId +": Requesting more history");
    requestAnimationFrame(() => {
        this.room.messagesBuff.retrieveChatHistory(64);
    });
};

RoomSearch.prototype.onHistoryFetched = function() {
    'use strict';
    if (this.state === SearchState.kComplete) {
        return;
    }
    const msgBuf = this.room.messagesBuff;
    const { messages } = msgBuf;
    const newCount = messages.length;
    const haveMoreHistory = msgBuf.haveMoreHistory();

    const numFetched = newCount - this._lastMsgCount;
    if (numFetched > 0 && this.state !== SearchState.kDestroying) {
        this.logger.debug('onHistoryFetched:', `Fetched ${numFetched} messages`);
        this._lastMsgCount = newCount;
        for (let i = 0; i < numFetched; i++) {
            const msg = messages.getItem(i);
            if (msg.textContents) {
                this.parentSearch._match(
                    msg.textContents,
                    SearchResultType.kMessage,
                    msg,
                    this,
                    newCount - i
                );
            }
        }
        if (haveMoreHistory && this.state === SearchState.kInProgress) {
            this.fetchMoreHistory();
        }
    }
    else {
        // we may receive a dummy event, then numFetched will be 0
        this.logger.debug('onHistoryFetched: No new messages fetched');
    }
    if (this.state === SearchState.kDestroying || !haveMoreHistory && this.state !== SearchState.kPaused) {
        this._setComplete();
    }
};

RoomSearch.prototype._destroy = function() {
    'use strict';
    this._setState(this.state === SearchState.kComplete ? this.state : SearchState.kDestroying);
    this.room.detachSearch();
    this.room.unbind(CS_HISTDECRYPTED_EVENTNAME);
};

RoomSearch.prototype.pause = function() {
    'use strict';
    if (this.state === SearchState.kInProgress) {
        this._setState(SearchState.kPaused);
    }
};

RoomSearch.prototype._setState = function(newState) {
    'use strict';
    // todo: validate state transitions
    this.state = newState;
};

RoomSearch.prototype._setComplete = function() {
    'use strict';
    if (this.state === SearchState.kComplete) {
        return;
    }
    delete this._isFetchingHistory;
    this._setState(SearchState.kComplete);
    this.room.unbind(CS_HISTDECRYPTED_EVENTNAME);
    this.logger.log('Fetch and search complete', `(total ${this.room.messagesBuff.messages.length} messages)`);
    this.room.detachSearch();
    this.parentSearch.onRoomSearchComplete();
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
    'use strict';
    this.megaChat = megaChat;
    this.allChats = megaChat.chats;
    this.searchMessages = searchMessages;

    // normalize
    searchExpr = ChatSearch._normalize_str(searchExpr);

    this.originalSearchString = searchExpr;
    this.searchRegExps = [];

    for (const word of searchExpr.split(' ')) {
        if (word !== '') {
            this.searchRegExps.push(new RegExp(RegExpEscape(word), 'gi'));
        }
    }

    this.setupLogger();
    this.roomSearches = [];
    if (handler) {
        this.handler = handler;
    }
    else { // default, dummy handler
        this.handler = {
            onResult: this.defaultOnResult,
            onComplete: () => console.warn('Chat search complete!'),
        };
    }
    if (chatId) { // search a specific chatroom
        for (const roomId in megaChat.chats) {
            if (megaChat.chats.hasOwnProperty(roomId) && roomId === chatId) {
                this.roomSearches.push(new RoomSearch(this, megaChat.chats[roomId]));
            }
        }

        if (!this.roomSearches.length) {
            throw new Error(`Could not find a room for chatid ${chatId}`);
        }
    }
    else { // search all chatrooms
        for (const roomId in this.allChats) {
            if (this.allChats.hasOwnProperty(roomId)) {
                this.roomSearches.push(new RoomSearch(this, this.allChats[roomId]));
            }
        }
    }
}

ChatSearch.prototype.defaultOnResult = function(room, result) {
    'use strict';
    const { data, type, matches, text } = result;
    const { chatId } = room;
    if (typeof data === 'object') { // may not be JSON-friendly
        const ctor = data.constructor;
        result.data = ctor && ctor.name ? `<${ctor.name} object>` : '<object with unknown type>';
    }
    const pType = constStateToText(SearchResultType, type);
    const pMatches = JSON.stringify(matches);
    const pData = data ? `, data: ${data}` : '';
    const msg = `onResult(${chatId}, {type: ${pType}, text: "${text}", matches: ${pMatches}${pData}})`;
    console.warn(msg);
};

/**
 * Alias for String.prototype.normalize + replace
 *
 * @param s
 * @returns {*}
 * @private
 */
ChatSearch._normalize_str = function(s) {
    'use strict';
    if (s && s.normalize) {
        return s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\u00f8/g, "o")
            .replace(/\u00d8/g, "O")
            .replace(/\u00e6/g, "ae")
            .replace(/\u00c6/g, "AE")
            .replace(/\u0259/g, "e")
            .replace(/\u0152/g, "OE")
            .replace(/\u0153/g, "oe")
            .replace(/\u00df/g, "ss")
            .replace(/[\u0131\u0142]/g, "l")
            .replace(/\u0111/g, "d")
            .replace(/\u0110/g, "D")
            .replace(/\u00fe/g, "p");
    }
    return s;
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
    'use strict';

    if (ChatSearch.doSearch.cs) {
        if (d) {
            console.info('Aborting running chat-search instance...', ChatSearch.doSearch.cs);
        }
        ChatSearch.doSearch.cs.destroy(SearchState.kDestroying);
    }

    const results = {
        CONTACTS_AND_CHATS: new MegaDataSortedMap('resultId', (a, b) => {
            const aLastActivity = a.lastActivity || 0;
            const bLastActivity = b.lastActivity || 0;
            return aLastActivity > bLastActivity ? -1 : a.nameRef < b.nameRef ? -1 : 1;
        }),
        MESSAGES: new MegaDataSortedMap('resultId', (a, b) => {
            return a.data.delay < b.data.delay ? 1 : a.data.delay > b.data.delay ? -1 : 0;
        })
    };

    ChatSearch.doSearch.currentResults = results;

    let resultId = 0;
    const contactHandleCache = {};
    const stime = performance.now();
    const handler = {
        onResult: tryCatch((room, resultMeta) => {
            resultMeta.room = room;
            resultMeta.chatId = room.chatId;
            resultMeta.data = resultMeta.data || room.chatId;
            resultMeta.lastActivity = room.lastActivity || room.ctime;
            resultMeta.nameRef = room.nameRef;
            resultMeta.resultId = resultId++;

            if (resultMeta.type === SearchResultType.kMessage) {
                results.MESSAGES.push(resultMeta);
            }
            else if (!contactHandleCache[resultMeta.data]) {
                results.CONTACTS_AND_CHATS.push(resultMeta);
                contactHandleCache[resultMeta.data] = true;
            }

            if (typeof onResult === 'function') {
                onResult(room.chatId, resultMeta, results);
            }
        }),
        onComplete: function(reason) {
            delete ChatSearch.doSearch.cs;

            if (reason === SearchState.kDestroying) {
                reject(SearchState.kDestroying);
            }
            else {
                resolve(results);
            }
            eventlog(99734, JSON.stringify([
                1, s.length, reason | 0, resultId, Math.ceil(performance.now() - stime)
            ]));

            // @todo indicate whether chats and/or messages (?)
            mBroadcaster.sendMessage('treesearch', s, 'chat', resultId);
        },
        onDestroy: function(ex) {
            delete ChatSearch.doSearch.cs;
            reject(ex);
        }
    };

    ChatSearch.doSearch.cs = new ChatSearch(megaChat, false, s, handler, searchMessages);

    results.dump = function() {
        for (const r in results) {
            if (results.hasOwnProperty(r)) {
                console.error(r.data && r.data.messageId ? r.data.messageId : null, r.chatId, r.type, r);
            }
        }
    };

    eventlog(99733, JSON.stringify([1, s.length]));
    ChatSearch.doSearch.cs.resume();
});

ChatSearch.prototype.setupLogger = function() {
    'use strict';

    const opts = {
        minLogLevel: function() {
            return MegaLogger.LEVELS.DEBUG;
        }
    };
    this.logger = new MegaLogger('ChatSearch', opts);
    this.logger._myOpts = opts;
};

/**
 * Resumes current searches
 *
 * @returns {undefined}
 */
ChatSearch.prototype.resume = function() {
    'use strict';

    const len = this.roomSearches.length;
    for (let i = 0; i < len; i++) {
        this.roomSearches[i].resume();
    }

    // match contacts
    if (this._matchedContacts !== true) {
        for (const userid in M.u) {
            if (!M.u.hasOwnProperty(userid) || userid === u_handle || M.u[userid].c !== 1) {
                continue;
            }
            const nameRef = M.getNameByHandle(userid);
            this._match(nameRef, SearchResultType.kMember, userid, { chatId: userid, nameRef });

            if (this.originalSearchString.length > 2 && M.u[userid].m) {
                this._match(M.u[userid].m, SearchResultType.kMember, userid, { chatId: userid, nameRef });
            }
        }
        this._matchedContacts = true;
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
    'use strict';

    const len = this.roomSearches.length;
    for (let i = 0; i < len; i++) {
        this.roomSearches[i].pause();
    }
};

/**
 * Called when room search completes
 *
 * @returns {undefined}
 */
ChatSearch.prototype.onRoomSearchComplete = function() {
    'use strict';
    const len = this.roomSearches.length;
    for (let i = 0; i < len; i++) {
        if (this.roomSearches[i].state < SearchState.kComplete) {
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
    'use strict';

    for (let rs in this.roomSearches) {
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
 * @param text {String}
 * @param type {SearchResultType}
 * @param data {Object}
 * @param roomSearch {RoomSearch|String}
 * @param [index] {Number}
 */

ChatSearch.prototype._match = function(text, type, data, roomSearch, index) {
    'use strict';
    if (text && text.length) {
        text = ChatSearch._normalize_str(text);
        const matches = [];

        for (let i = this.searchRegExps.length; i--;) {
            const regExp = this.searchRegExps[i];
            regExp.lastIndex = 0;
            let m = regExp.exec(text);
            if (!m) {
                return;
            }
            do {
                matches.push({ idx: m.index, str: m[0] });
            } while ((m = regExp.exec(text)));
        }
        const result = {
            index,
            type,
            text,
            matches,
        };
        if (data) {
            result.data = data;
        }
        this.handler.onResult(roomSearch && roomSearch.room || roomSearch, result);
    }
};

/**
 * Completely aborts the search. No callbacks will be called after call to this method.
 *
 * @returns {undefined}
 */
ChatSearch.prototype.destroy = function(reason) {
    'use strict';

    const len = this.roomSearches.length;
    for (let i = 0; i < len; i++) {
        this.roomSearches[i]._destroy();
    }

    if (ChatSearch._instance === this) {
        delete ChatSearch._instance;
    }

    if (this.handler.onComplete) {
        this.handler.onComplete(reason);
    }
};
