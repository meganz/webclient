/**
 * Uses c2s pings to determinate if the current connection is broken or not
 *
 * Note: Why are we implementing this? Answer: https://code.google.com/p/chromium/issues/detail?id=76358
 *
 * @param megaChat
 * @returns {PersistedTypeArea}
 * @constructor
 */
class PersistedTypeArea extends MegaDataEmitter {
    constructor(megaChat) {
        super();
        this.megaChat = megaChat;
        this.logger = MegaLogger.getLogger("persistedTypeArea", {}, megaChat.logger);
    }

    addChangeListener(uniqueId, callback) {
        this.removeChangeListener(uniqueId);

        if (PersistedTypeArea.ready) {
            PersistedTypeArea._db.rebind(`onChange.typingArea${uniqueId}`, callback);
        }
        PersistedTypeArea.listeners[uniqueId] = callback;
    }

    removeChangeListener(uniqueId) {
        delete PersistedTypeArea.listeners[uniqueId];

        if (PersistedTypeArea.ready) {
            PersistedTypeArea._db.off(`onChange.typingArea${uniqueId}`);
        }
    }

    updatePersistedTypedValue(chatRoom, value) {
        const {roomId} = chatRoom;

        delay(`ptaupdate:${roomId}`, () => PersistedTypeArea._db.setItem(roomId, value), 480);
    }

    getPersistedTypedValue(chatRoom) {
        return PersistedTypeArea._db.getItem(chatRoom.roomId);
    }

    removePersistedTypedValue(chatRoom) {
        const {roomId} = chatRoom;

        delay.cancel(`ptaupdate:${roomId}`);

        if (PersistedTypeArea.ready) {
            PersistedTypeArea._db.removeItem(roomId);
        }
    }

    destroy() {

        if (PersistedTypeArea.ready) {
            // Hmm... well, we only use one instance anyway...
            for (const uniqueId in PersistedTypeArea.listeners) {
                this.removeChangeListener(uniqueId);
            }
            return PersistedTypeArea._db.destroy();
        }
    }
}

/** @property PersistedTypeArea._db */
lazy(PersistedTypeArea, '_db', () => {
    'use strict';
    const db = new SharedLocalKVStorage("pta3");

    for (const uniqueId in PersistedTypeArea.listeners) {
        const callback = PersistedTypeArea.listeners[uniqueId];
        db.rebind(`onChange.typingArea${uniqueId}`, callback);
    }

    Object.defineProperty(PersistedTypeArea, 'ready', {value: true});
    return db;
});

Object.defineProperty(PersistedTypeArea, 'listeners', {value: Object.create(null)});
