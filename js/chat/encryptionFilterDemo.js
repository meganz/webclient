/**
 * EncryptionFilterDemo
 *
 * Demo of how to use MegaChat and Karere's events to integrate the mpENC.
 *
 * Warning: Requires the full version of the sjcl, because of the encrypt/decrypt methods
 *
 * @param megaChat
 * @returns {EncryptionFilterDemo}
 * @constructor
 */


var EncryptionFilterDemo = function(megaChat) {
    var self = this;

    self.megaChat = megaChat;
    self.karere = megaChat.karere;

    megaChat.bind("onPluginsWait", function(e, room) {
        /**
         * This event is triggered when i'd joined a new room (joined may also mean created and joined)
         * Also, this is the place where any initial key exchanges/crypto setup should be done.
         *
         * By default, if this event's propagation is not stopped, the MegaChat's flow will continue next to asking
         * for messages history and then to mark the room as 'ready'.
         * If you need to delay the messages sync & room ready state, then you can stop the event prop by calling:
         * e.stopPropagation();
         * and after you are done with setting up the crypto stuff, then manually call:
         * room.setState(MegaChatRoom.STATE.PLUGINS_READY);
         */
    });


    var processIncoming = function(e, eventObject, karere) {
        // ignore filtering any messages without text or meta... this is the case with "is typing" indicators
        if(self.messageShouldNotBeEncrypted(eventObject) === true) {
            return;
        }

        // ignore messages which are my own.
        if(eventObject.isMyOwn(megaChat.karere)) {
            return;
        }

        self.processIncomingMessage(e, eventObject, karere);
    };

    var processOutgoing = function(e, eventObject, karere) {
        // ignore filtering any messages without text or meta... this is the case with "is typing" indicators
        if(self.messageShouldNotBeEncrypted(eventObject) === true) {
            return;
        }

        self.processOutgoingMessage(e, eventObject, karere);
    };




    // incoming
    megaChat.karere.bind("onChatMessage", processIncoming);

    // outgoing
    megaChat.karere.bind("onOutgoingMessage", processOutgoing);

    return this;
};


/**
 *
 * @param e
 * @param eventObject {KarereEventObjects.OutgoingMessage}
 * @param karere {Karere}
 */
EncryptionFilterDemo.prototype.processOutgoingMessage = function(e, eventObject, karere) {
    console.debug("Processing outgoing message: ", e, eventObject, eventObject.isEmptyMessage())

    if(eventObject.getContents().indexOf("mpENC:") !== 0) {
        // if the outgoing message is not encrypted (e.g. added to the buffer and then resent)
        var encryptedMessage = Base64.encode(
            sjcl.encrypt(
                "key", // XX: dummy key
                JSON.stringify(
                    [
                        eventObject.getContents(),
                        eventObject.getMeta()
                    ]
                )
            )
        );

        // clear the meta and set the message contents
        eventObject.setMeta(undefined);
        eventObject.setContents("mpENC:" + encryptedMessage);

        // stop the actual sending of the message, in case you want to queue it and resend it later
        e.stopPropagation();

        // add to queue and then, send it to Karere:
        karere.sendRawMessage(
            eventObject.getToJid(),
            eventObject.getType(),
            eventObject.getContents(),
            eventObject.getMeta()
        );
    } else {
        // already encrypted, should not do anything.
        return;
    }

};

/**
 *
 * @param e
 * @param eventObject {KarereEventObjects.IncomingMessage}
 * @param karere {Karere}
 */
EncryptionFilterDemo.prototype.processIncomingMessage = function(e, eventObject, karere) {
    console.debug("Processing incoming message: ", e, eventObject, eventObject.isEmptyMessage())

    if(eventObject.getContents().indexOf("mpENC:") === 0) {
        // this is an encrypted message
        var messageData = JSON.parse(
            sjcl.decrypt(
                "key", // XX: dummy key
                Base64.decode(
                    eventObject.getContents().substr(6)
                )
            )
        );
        eventObject.setContents(messageData[0]);
        eventObject.setMeta(messageData[1]);

        console.debug("Decrypted message: ", messageData);
    } else {
        // should not do anything...or call e.stopPropagation() to disable ANY plain text messages.
        console.debug("Got plaintext message: ", eventObject);
    }
};

/**
 * Simple method that decides which messages should be encrypted and which should be left in plain text.
 * In the future this message should check for system messages (e.g. group key agreement request/responses, etc) and
 * decide if this message SHOULD be encrypted or should be processed right away.
 *
 * @param eventObject {(KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage)}
 * @returns {boolean}
 */
EncryptionFilterDemo.prototype.messageShouldNotBeEncrypted = function(eventObject) {
    if(eventObject.isEmptyMessage()) {
        return true;
    } else {
        return false;
    }
};

