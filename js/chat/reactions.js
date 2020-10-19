/**
 * Basic class for handling Reactions
 *
 * @param {Message} message message
 * @constructor
 */
function Reactions(message) {
    "use strict";
    assert(message instanceof Message, 'EARGS');

    this.message = message;
    this.messageId = message.messageId;
    this.chatId = message.chatRoom.chatId;
    this.reactions = Object.create(null);

    if (message._reactions) {
        this.reactions = tryCatch(JSON.parse.bind(JSON))(message._reactions) || this.reactions;
    }

    if (d) {
        console.assert(!Reactions._allReactions.has(message));
        Reactions._allReactions.set(message, this);
    }
}
inherits(Reactions, null);

Reactions.OPERATIONS = {
    'ADD': 1,
    'REMOVE': 2
};

Reactions._allReactions = d && new WeakMap();
Reactions._allReactionSns = Object.create(null);
Reactions._allQueuedReactions = Object.create(null);

/**
 * Called to initialize (eventually) the idb
 *
 * @private
 * @returns {undefined}
 *
 * @property Reactions._db
 */
lazy(Reactions, '_db', function() {
    'use strict';
    console.assert(ChatdPersist.isMasterTab());
    return new SharedLocalKVStorage("reacts");
});

/**
 * Returns current 'sn'
 * @param {String} chatId chatId
 * @returns {Promise}
 */
Reactions.getSn = promisify(function(resolve, reject, chatId) {
    "use strict";

    if (ChatdPersist.isMasterTab()) {
        Reactions._db.getItem(chatId + "_sn")
            .then(function(v) {
                if (v) {
                    Reactions._allReactionSns[chatId] = v;
                    resolve(v);
                }
                else {
                    reject(v);
                }
            })
            .catch(reject);
    }
    else if (Reactions._allReactionSns[chatId]) {
        resolve(Reactions._allReactionSns[chatId]);
    }
    else {
        reject();
    }
});

/**
 * Sets the current sn
 * @param {String} chatId chatId
 * @param {String} sn sn
 * @returns {Promise}
 */
Reactions.setSn = promisify(function(resolve, reject, chatId, sn) {
    "use strict";

    Reactions._allReactionSns[chatId] = sn;

    if (ChatdPersist.isMasterTab()) {
        return Reactions._db.setItem(chatId + "_sn", sn).then(resolve).catch(reject);
    }

    resolve();
});


Reactions.prototype.lazyInit = promisify(function(resolve) {
    'use strict';

    Reactions.getSn(this.chatId)
        .always(() => {
            this.notify();
            resolve();
        });
});

/**
 * Do apply 'react' action by `userId` with emoji - `emojiUtf`
 *
 * @function Reactions.react
 * @return {Promise}
 */
SharedLocalKVStorage.Utils.lazyInitCall(Reactions.prototype, 'react', function(userId, emojiUtf) {
    "use strict";

    if (!this.reactions[emojiUtf]) {
        this.reactions[emojiUtf] = Object.create(null);
    }
    this.reactions[emojiUtf][userId] = 1;
    this.notify(emojiUtf);

    return this.persist();
});

/**
 * Do apply 'unreact' (undos a react) action by `userId` with emoji - `emojiUtf`
 *
 * @function Reactions.unreact
 * @return {Promise}
 */
SharedLocalKVStorage.Utils.lazyInitCall(Reactions.prototype, 'unreact', function(userId, emojiUtf) {
    "use strict";

    // Apparently chatd may send "unreact" on non-existing reactions in case of a fresh/new join in a room (no cached
    // sn)
    // console.assert(this.reactions[emojiUtf], 'Invalid un-reaction...');

    if (this.reactions[emojiUtf]) {
        delete this.reactions[emojiUtf][userId];
    }
    this.notify(emojiUtf);

    return this.persist();
});

/**
 * Persist the current message's reactions to idb
 *
 * @function Reactions.persist
 * @return {Promise}
 */
SharedLocalKVStorage.Utils.lazyInitCall(Reactions.prototype, 'persist', function() {
    "use strict";

    if (this.reactions) {
        var reactionsKeys = Object.keys(this.reactions);
        for (var i = 0; i < reactionsKeys.length; i++) {
            var emoji = reactionsKeys[i];
            if (!Object.keys(this.reactions[emoji]).length) {
                delete this.reactions[emoji];
            }
        }
    }

    this.message._reactions = JSON.stringify(this.reactions);
    var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
    if (cdp) {
        return cdp.modifyPersistedReactions(this.message);
    }

    return Promise.resolve();
});

/**
 * Placeholder.
 *
 * @private
 * @function Reactions.forceLoad
 * @return {Promise}
 */
SharedLocalKVStorage.Utils.lazyInitCall(Reactions.prototype, 'forceLoad', function() {
    "use strict";
    return Promise.resolve();
});

/**
 * Bubble a trackDataChange to the associated Message
 */
Reactions.prototype.notify = function() {
    'use strict';
    this.message.trackDataChange.apply(this.message, arguments);
};

/**
 * Get a reaction from memory store.
 */
Reactions.prototype.getReaction = function(userId, emojiUtf) {
    'use strict';
    if (!this.reactions || !this.reactions[emojiUtf]) {
        return false;
    }
    return this.reactions[emojiUtf][userId];
};

/**
 * Initializes some variable structures
 * @param {String} chatId chatId
 * @param {String} message message
 * @private
 */
Reactions._initIntrnlVarsForQueuedRctn = function(chatId, message) {
    "use strict";

    if (!message._queuedReactions) {
        message._queuedReactions = [];
    }

    Reactions._allQueuedReactions[chatId] = Reactions._allQueuedReactions[chatId] || Object.create(null);
    Reactions._allQueuedReactions[chatId][message.messageId] =
        Reactions._allQueuedReactions[chatId][message.messageId] || [];
    Reactions._allQueuedReactions[chatId][message.messageId] = message._queuedReactions;
};

/**
 * Sends and queues reaction operation.
 *
 * @param {Number} operation {@link Reactions.OPERATIONS}
 * @param {ChatRoom} chatRoom chatRoom
 * @param {Message} message message
 * @param {String} msgId msgId
 * @param {String} slug slug
 * @param {Object} meta meta
 * @param {String} r r
 */
Reactions.sendAndQueueOperation = function(operation, chatRoom, message, msgId, slug, meta, r) {
    "use strict";

    Reactions._initIntrnlVarsForQueuedRctn(chatRoom.chatId, message);

    message._queuedReactions.push([
        operation,
        msgId,
        slug,
        meta,
        r
    ]);

    var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
    if (cdp) {
        cdp.persistMessageBatched("replace", chatRoom.chatId, [undefined, message]);
    }

    if (operation === Reactions.OPERATIONS.ADD) {
        chatRoom.messagesBuff.sendAddReaction(msgId, slug, meta, r);
    }
    else if (operation === Reactions.OPERATIONS.REMOVE) {
        chatRoom.messagesBuff.sendDelReaction(msgId, slug, meta, r);
    }
    else {
        console.error("invalid operation for Reactions.sendAndQueueOperation:", operation);
    }

};

/**
 * Removes operation from queue
 *
 * @param {ChatRoom} chatRoom chatRoom
 * @param {Message} message message
 * @param {String} msgId msgId
 * @param {String} operation @see Reactions.OPERATIONS
 * @param {String} emoji emoji
 */
Reactions.deQueueOperation = function(chatRoom, message, msgId, operation, emoji) {
    "use strict";

    var op = operation === "addReaction" ? Reactions.OPERATIONS.ADD : Reactions.OPERATIONS.REMOVE;
    var found;
    for (var i = 0; i < message._queuedReactions.length;i++) {
        var item = message._queuedReactions[i];
        if (item[0] === op && item[3] && item[3].u === emoji) {
            found = i;
            break;
        }
    }
    if (typeof found !== "undefined") {
        array.remove(message._queuedReactions, message._queuedReactions[found]);
        var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
        if (cdp) {
            cdp.persistMessageBatched("replace", chatRoom.chatId, [undefined, message]);
        }
    }
};

/**
 * If there are queued reactions, process them
 *
 * @param {Message} message message
 */
Reactions.processMessageForQueuedRctns = function(message) {
    "use strict";

    var chatRoom = message.chatRoom;
    if (message._queuedReactions) {
        Reactions._initIntrnlVarsForQueuedRctn(chatRoom.chatId, message);
    }
};


/**
 * Flush all queued operations to the server
 *
 * @param {String} chatId chatId
 */
Reactions.flushQueuedReactionsForChat = function(chatId) {
    "use strict";

    var chatRoom = megaChat.getChatById(chatId);
    assert(chatRoom);
    if (chatRoom && Reactions._allQueuedReactions[chatId]) {
        var qKeys = Object.keys(Reactions._allQueuedReactions[chatId]);
        for (var i = 0; i < qKeys.length; i++) {
            var msgId = qKeys[i];
            var reactionOperations = Reactions._allQueuedReactions[chatId][msgId];
            if (!reactionOperations) {
                continue;
            }
            for (var k = 0; k < reactionOperations.length; k++) {
                var operation = reactionOperations[k];
                if (operation[0] === Reactions.OPERATIONS.ADD) {
                    chatRoom.messagesBuff.sendAddReaction(operation[1], operation[2], operation[3], operation[4]);
                }
                else if (operation[0] === Reactions.OPERATIONS.REMOVE) {
                    chatRoom.messagesBuff.sendDelReaction(operation[1], operation[2], operation[3], operation[4]);
                }
                else {
                    console.error("Invalid reaction queue operation", operation);
                }
            }
        }
    }
};


/**
 * Clears any queued reaction operations
 *
 * @param {String} chatId chatId
 * @param {String} [targetMsgId] targetMsg is optional, if not passed - all msgs would be flushed
 */
Reactions.clearQueuedReactionsForChat = function(chatId, targetMsgId) {
    "use strict";

    var chatRoom = megaChat.getChatById(chatId);
    assert(chatRoom);
    var persist = function(msgIdToPersist) {
        var cdp = megaChat.plugins.chatdIntegration.chatd.chatdPersist;
        var msg = chatRoom.getMessageById(msgIdToPersist);
        msg._queuedReactions = undefined;
        if (cdp && msg) {
            cdp.persistMessageBatched("replace", chatRoom.chatId, [undefined, msg]);
        }
    };

    if (chatRoom && Reactions._allQueuedReactions[chatId]) {

        var qKeys = Object.keys(Reactions._allQueuedReactions[chatId]);
        for (var i = 0; i < qKeys.length; i++) {
            var msgId = qKeys[i];

            if (typeof targetMsgId !== 'undefined' && msgId !== targetMsgId) {
                return;
            }

            var qReacts = Reactions._allQueuedReactions[chatId][msgId];
            // check if clear is really needed
            if (qReacts && qReacts.length > 0) {
                Reactions._allQueuedReactions[chatId][msgId] = [];
                persist(msgId);
            }
        }


        if (typeof targetMsgId === 'undefined') {
            Reactions._allQueuedReactions[chatId] = Object.create(null);
        }
    }
};
