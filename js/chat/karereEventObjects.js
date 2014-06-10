var KarereEventObjects = KarereEventObjects || {};
/**
 * Event Object `ActionMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param messageId {string} ID of the message
 * @param action {string} action name (alias of meta.action)
 * @param meta {Object} simple plain object containing meta for this action
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.ActionMessage = function(toJid, fromJid, messageId, action, meta, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setMessageId(messageId);
    this.setAction(action);
    this.setMeta(meta);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.ActionMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.ActionMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} ID of the message
 */
KarereEventObjects.ActionMessage.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} ID of the message
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Getter for property `action`
 *
 * @returns {(string)} action name (alias of meta.action)
 */
KarereEventObjects.ActionMessage.prototype.getAction = function() {
    return this.action;
};
/**
 * Setter for property `action`
 *
 * @param val {string} action name (alias of meta.action)
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setAction = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: action, expected string got " + typeof(val));
    this.action = val;
    return this;
};
/**
 * Getter for property `meta`
 *
 * @returns {(Object)} simple plain object containing meta for this action
 */
KarereEventObjects.ActionMessage.prototype.getMeta = function() {
    return this.meta;
};
/**
 * Setter for property `meta`
 *
 * @param val {Object} simple plain object containing meta for this action
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setMeta = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: meta, expected Object got " + typeof(val));
    this.meta = val;
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.ActionMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.ActionMessage}
 */
KarereEventObjects.ActionMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.ActionMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.ActionMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.ActionMessage.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `DiscoCapabilities`
 *
 * @param fromJid {string} user's full JID
 * @param fromUserBareJid {string} user's bare JID
 * @param capabilities {object} object/hash map containing all of the user's capabilities. see `Karere.options.defaultCapabilities`
 * @constructor
 */
KarereEventObjects.DiscoCapabilities = function(fromJid, fromUserBareJid, capabilities) {
    this.setFromJid(fromJid);
    this.setFromUserBareJid(fromUserBareJid);
    this.setCapabilities(capabilities);
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} user's full JID
 */
KarereEventObjects.DiscoCapabilities.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} user's full JID
 * @returns {KarereEventObjects.DiscoCapabilities}
 */
KarereEventObjects.DiscoCapabilities.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `fromUserBareJid`
 *
 * @returns {(string)} user's bare JID
 */
KarereEventObjects.DiscoCapabilities.prototype.getFromUserBareJid = function() {
    return this.fromUserBareJid;
};
/**
 * Setter for property `fromUserBareJid`
 *
 * @param val {string} user's bare JID
 * @returns {KarereEventObjects.DiscoCapabilities}
 */
KarereEventObjects.DiscoCapabilities.prototype.setFromUserBareJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromUserBareJid, expected string got " + typeof(val));
    this.fromUserBareJid = val;
    return this;
};
/**
 * Getter for property `capabilities`
 *
 * @returns {(object)} object/hash map containing all of the user's capabilities. see `Karere.options.defaultCapabilities`
 */
KarereEventObjects.DiscoCapabilities.prototype.getCapabilities = function() {
    return this.capabilities;
};
/**
 * Setter for property `capabilities`
 *
 * @param val {object} object/hash map containing all of the user's capabilities. see `Karere.options.defaultCapabilities`
 * @returns {KarereEventObjects.DiscoCapabilities}
 */
KarereEventObjects.DiscoCapabilities.prototype.setCapabilities = function(val) {
    assert(typeof(val) == "object", "Invalid argument passed for: capabilities, expected object got " + typeof(val));
    this.capabilities = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.DiscoCapabilities.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.DiscoCapabilities.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `IncomingMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param type {string} type of the message (most likely "Message")
 * @param rawType {string} XMPP type of the message
 * @param messageId {string} unique ID of the message
 * @param [rawMessage] {Element} Raw XML {Element} of the <message/> that was recieved by the XMPP
 * @param [roomJid] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @param [meta] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @param [contents] {string} optional, message contents
 * @param [elements] {NodeList} child {Element} nodes from the XMPP's <message></message> node
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.IncomingMessage = function(toJid, fromJid, type, rawType, messageId, rawMessage, roomJid, meta, contents, elements, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setType(type);
    this.setRawType(rawType);
    this.setMessageId(messageId);
    this.setRawMessage(rawMessage);
    this.setRoomJid(roomJid);
    this.setMeta(meta);
    this.setContents(contents);
    this.setElements(elements);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.IncomingMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.IncomingMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `type`
 *
 * @returns {(string)} type of the message (most likely "Message")
 */
KarereEventObjects.IncomingMessage.prototype.getType = function() {
    return this.type;
};
/**
 * Setter for property `type`
 *
 * @param val {string} type of the message (most likely "Message")
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setType = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: type, expected string got " + typeof(val));
    this.type = val;
    return this;
};
/**
 * Getter for property `rawType`
 *
 * @returns {(string)} XMPP type of the message
 */
KarereEventObjects.IncomingMessage.prototype.getRawType = function() {
    return this.rawType;
};
/**
 * Setter for property `rawType`
 *
 * @param val {string} XMPP type of the message
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setRawType = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: rawType, expected string got " + typeof(val));
    this.rawType = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} unique ID of the message
 */
KarereEventObjects.IncomingMessage.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} unique ID of the message
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Getter for property `rawMessage`
 *
 * @returns {(Element|null)} Raw XML {Element} of the <message/> that was recieved by the XMPP
 */
KarereEventObjects.IncomingMessage.prototype.getRawMessage = function() {
    return this.rawMessage;
};
/**
 * Setter for property `rawMessage`
 *
 * @param [val] {Element} Raw XML {Element} of the <message/> that was recieved by the XMPP
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setRawMessage = function(val) {
    this.rawMessage = val || null;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 */
KarereEventObjects.IncomingMessage.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `meta`
 *
 * @returns {(Object|{})} optional, attached META for this message (can be any JavaScript plain object)
 */
KarereEventObjects.IncomingMessage.prototype.getMeta = function() {
    return this.meta;
};
/**
 * Setter for property `meta`
 *
 * @param [val] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setMeta = function(val) {
    this.meta = val || {};
    return this;
};
/**
 * Getter for property `contents`
 *
 * @returns {(string|"")} optional, message contents
 */
KarereEventObjects.IncomingMessage.prototype.getContents = function() {
    return this.contents;
};
/**
 * Setter for property `contents`
 *
 * @param [val] {string} optional, message contents
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setContents = function(val) {
    this.contents = val || "";
    return this;
};
/**
 * Getter for property `elements`
 *
 * @returns {(NodeList|"")} child {Element} nodes from the XMPP's <message></message> node
 */
KarereEventObjects.IncomingMessage.prototype.getElements = function() {
    return this.elements;
};
/**
 * Setter for property `elements`
 *
 * @param [val] {NodeList} child {Element} nodes from the XMPP's <message></message> node
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setElements = function(val) {
    this.elements = val || "";
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.IncomingMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.IncomingMessage}
 */
KarereEventObjects.IncomingMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.IncomingMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.IncomingMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.IncomingMessage.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `IncomingPrivateMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param type {string} type of the message (most likely "Message")
 * @param rawType {string} XMPP type of the message
 * @param messageId {string} unique ID of the message
 * @param [rawMessage] {Element} Raw XML {Element} of the <message/> that was recieved by the XMPP
 * @param [meta] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @param [message] {string|Object} optional, Message contents (can be Strophe.Builder object)
 * @param [elements] {NodeList} child {Element} nodes from the XMPP's <message></message> node
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.IncomingPrivateMessage = function(toJid, fromJid, type, rawType, messageId, rawMessage, meta, message, elements, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setType(type);
    this.setRawType(rawType);
    this.setMessageId(messageId);
    this.setRawMessage(rawMessage);
    this.setMeta(meta);
    this.setMessage(message);
    this.setElements(elements);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `type`
 *
 * @returns {(string)} type of the message (most likely "Message")
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getType = function() {
    return this.type;
};
/**
 * Setter for property `type`
 *
 * @param val {string} type of the message (most likely "Message")
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setType = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: type, expected string got " + typeof(val));
    this.type = val;
    return this;
};
/**
 * Getter for property `rawType`
 *
 * @returns {(string)} XMPP type of the message
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getRawType = function() {
    return this.rawType;
};
/**
 * Setter for property `rawType`
 *
 * @param val {string} XMPP type of the message
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setRawType = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: rawType, expected string got " + typeof(val));
    this.rawType = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} unique ID of the message
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} unique ID of the message
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Getter for property `rawMessage`
 *
 * @returns {(Element|null)} Raw XML {Element} of the <message/> that was recieved by the XMPP
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getRawMessage = function() {
    return this.rawMessage;
};
/**
 * Setter for property `rawMessage`
 *
 * @param [val] {Element} Raw XML {Element} of the <message/> that was recieved by the XMPP
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setRawMessage = function(val) {
    this.rawMessage = val || null;
    return this;
};
/**
 * Getter for property `meta`
 *
 * @returns {(Object|{})} optional, attached META for this message (can be any JavaScript plain object)
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getMeta = function() {
    return this.meta;
};
/**
 * Setter for property `meta`
 *
 * @param [val] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setMeta = function(val) {
    this.meta = val || {};
    return this;
};
/**
 * Getter for property `message`
 *
 * @returns {(string|Object|"")} optional, Message contents (can be Strophe.Builder object)
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getMessage = function() {
    return this.message;
};
/**
 * Setter for property `message`
 *
 * @param [val] {string|Object} optional, Message contents (can be Strophe.Builder object)
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setMessage = function(val) {
    this.message = val || "";
    return this;
};
/**
 * Getter for property `elements`
 *
 * @returns {(NodeList|"")} child {Element} nodes from the XMPP's <message></message> node
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getElements = function() {
    return this.elements;
};
/**
 * Setter for property `elements`
 *
 * @param [val] {NodeList} child {Element} nodes from the XMPP's <message></message> node
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setElements = function(val) {
    this.elements = val || "";
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.IncomingPrivateMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.IncomingPrivateMessage}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.IncomingPrivateMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.IncomingPrivateMessage.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `InviteMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param roomJid {string} target room's JID
 * @param [password] {string} optional, password for joining the room
 * @param [meta] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.InviteMessage = function(toJid, fromJid, roomJid, password, meta, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setRoomJid(roomJid);
    this.setPassword(password);
    this.setMeta(meta);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.InviteMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.InviteMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string)} target room's JID
 */
KarereEventObjects.InviteMessage.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param val {string} target room's JID
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setRoomJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: roomJid, expected string got " + typeof(val));
    this.roomJid = val;
    return this;
};
/**
 * Getter for property `password`
 *
 * @returns {(string|"")} optional, password for joining the room
 */
KarereEventObjects.InviteMessage.prototype.getPassword = function() {
    return this.password;
};
/**
 * Setter for property `password`
 *
 * @param [val] {string} optional, password for joining the room
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setPassword = function(val) {
    this.password = val || "";
    return this;
};
/**
 * Getter for property `meta`
 *
 * @returns {(Object|{})} optional, attached META for this message (can be any JavaScript plain object)
 */
KarereEventObjects.InviteMessage.prototype.getMeta = function() {
    return this.meta;
};
/**
 * Setter for property `meta`
 *
 * @param [val] {Object} optional, attached META for this message (can be any JavaScript plain object)
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setMeta = function(val) {
    this.meta = val || {};
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.InviteMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.InviteMessage}
 */
KarereEventObjects.InviteMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.InviteMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.InviteMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.InviteMessage.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `OutgoingMessage`
 *
 * @param toJid {string} target user's JID
 * @param fromJid {string} sender's JID
 * @param type {string} type of the message
 * @param messageId {string} unique ID of the message
 * @param [contents] {string} Message text contents
 * @param [meta] {Object} Attached META for this message (can be any JavaScript plain object)
 * @param [delay] {number} Unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.OutgoingMessage = function(toJid, fromJid, type, messageId, contents, meta, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setType(type);
    this.setMessageId(messageId);
    this.setContents(contents);
    this.setMeta(meta);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} target user's JID
 */
KarereEventObjects.OutgoingMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} target user's JID
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.OutgoingMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `type`
 *
 * @returns {(string)} type of the message
 */
KarereEventObjects.OutgoingMessage.prototype.getType = function() {
    return this.type;
};
/**
 * Setter for property `type`
 *
 * @param val {string} type of the message
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setType = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: type, expected string got " + typeof(val));
    this.type = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} unique ID of the message
 */
KarereEventObjects.OutgoingMessage.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} unique ID of the message
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Getter for property `contents`
 *
 * @returns {(string|"")} Message text contents
 */
KarereEventObjects.OutgoingMessage.prototype.getContents = function() {
    return this.contents;
};
/**
 * Setter for property `contents`
 *
 * @param [val] {string} Message text contents
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setContents = function(val) {
    this.contents = val || "";
    return this;
};
/**
 * Getter for property `meta`
 *
 * @returns {(Object|{})} Attached META for this message (can be any JavaScript plain object)
 */
KarereEventObjects.OutgoingMessage.prototype.getMeta = function() {
    return this.meta;
};
/**
 * Setter for property `meta`
 *
 * @param [val] {Object} Attached META for this message (can be any JavaScript plain object)
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setMeta = function(val) {
    this.meta = val || {};
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} Unix time stamp saying when this message was sent
 */
KarereEventObjects.OutgoingMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} Unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.OutgoingMessage}
 */
KarereEventObjects.OutgoingMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.OutgoingMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.OutgoingMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.OutgoingMessage.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `Ping`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @constructor
 */
KarereEventObjects.Ping = function(toJid, fromJid) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.Ping.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.Ping}
 */
KarereEventObjects.Ping.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.Ping.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.Ping}
 */
KarereEventObjects.Ping.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.Ping.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.Ping.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `PingRequest`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param messageId {string} unique ID of the message
 * @constructor
 */
KarereEventObjects.PingRequest = function(toJid, fromJid, messageId) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setMessageId(messageId);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.PingRequest.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.PingRequest}
 */
KarereEventObjects.PingRequest.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.PingRequest.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.PingRequest}
 */
KarereEventObjects.PingRequest.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} unique ID of the message
 */
KarereEventObjects.PingRequest.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} unique ID of the message
 * @returns {KarereEventObjects.PingRequest}
 */
KarereEventObjects.PingRequest.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.PingRequest.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.PingRequest.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `PingResponse`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param messageId {string} unique ID of the message
 * @constructor
 */
KarereEventObjects.PingResponse = function(toJid, fromJid, messageId) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setMessageId(messageId);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.PingResponse.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.PingResponse}
 */
KarereEventObjects.PingResponse.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.PingResponse.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.PingResponse}
 */
KarereEventObjects.PingResponse.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `messageId`
 *
 * @returns {(string)} unique ID of the message
 */
KarereEventObjects.PingResponse.prototype.getMessageId = function() {
    return this.messageId;
};
/**
 * Setter for property `messageId`
 *
 * @param val {string} unique ID of the message
 * @returns {KarereEventObjects.PingResponse}
 */
KarereEventObjects.PingResponse.prototype.setMessageId = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: messageId, expected string got " + typeof(val));
    this.messageId = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.PingResponse.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.PingResponse.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `Presence`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param [show] {string} status of the user (this should be used instead of `status`, for determinating the user's presence, e.g.: chat/away/etc)
 * @param [status] {string} status of the user
 * @param [type] {string} type of the presence event
 * @param [delay] {number} unix time stamp saying when this presence was last updated
 * @constructor
 */
KarereEventObjects.Presence = function(toJid, fromJid, show, status, type, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setShow(show);
    this.setStatus(status);
    this.setType(type);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.Presence.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.Presence.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `show`
 *
 * @returns {(string|"available")} status of the user (this should be used instead of `status`, for determinating the user's presence, e.g.: chat/away/etc)
 */
KarereEventObjects.Presence.prototype.getShow = function() {
    return this.show;
};
/**
 * Setter for property `show`
 *
 * @param [val] {string} status of the user (this should be used instead of `status`, for determinating the user's presence, e.g.: chat/away/etc)
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setShow = function(val) {
    this.show = val || "available";
    return this;
};
/**
 * Getter for property `status`
 *
 * @returns {(string|"available")} status of the user
 */
KarereEventObjects.Presence.prototype.getStatus = function() {
    return this.status;
};
/**
 * Setter for property `status`
 *
 * @param [val] {string} status of the user
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setStatus = function(val) {
    this.status = val || "available";
    return this;
};
/**
 * Getter for property `type`
 *
 * @returns {(string|null)} type of the presence event
 */
KarereEventObjects.Presence.prototype.getType = function() {
    return this.type;
};
/**
 * Setter for property `type`
 *
 * @param [val] {string} type of the presence event
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setType = function(val) {
    this.type = val || null;
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this presence was last updated
 */
KarereEventObjects.Presence.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this presence was last updated
 * @returns {KarereEventObjects.Presence}
 */
KarereEventObjects.Presence.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.Presence.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.Presence.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Returns true if this is an empty message (e.g. composing, paused composing, active state) with no message contents (text OR meta)
 *
 * @returns boolean
 */
KarereEventObjects.Presence.prototype.isEmptyMessage = function() {
    var contents = this.getContents ? this.getContents() : undefined;
    var message = this.getMessage ? this.getMessage() : undefined;
    if (contents && contents.length > 0) {
        return false;
    }
    // check the XML Stanza message (if any)
    if (!message || $.isEmptyObject(message)) {
        return true;
    } else if (message && (message.nodeTree && message.nodeTree instanceof Element && $('messageContents', message.nodeTree).text() == '' && $.isEmptyObject(this.getMeta()))) {
        return true;
    } else {
        return false;
    }
};
/**
 * Event Object `StateActiveMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param [roomJid] {string} room's JID
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.StateActiveMessage = function(toJid, fromJid, roomJid, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setRoomJid(roomJid);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.StateActiveMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.StateActiveMessage}
 */
KarereEventObjects.StateActiveMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.StateActiveMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.StateActiveMessage}
 */
KarereEventObjects.StateActiveMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} room's JID
 */
KarereEventObjects.StateActiveMessage.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} room's JID
 * @returns {KarereEventObjects.StateActiveMessage}
 */
KarereEventObjects.StateActiveMessage.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.StateActiveMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.StateActiveMessage}
 */
KarereEventObjects.StateActiveMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.StateActiveMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.StateActiveMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `StateComposingMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param [roomJid] {string} room's JID
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.StateComposingMessage = function(toJid, fromJid, roomJid, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setRoomJid(roomJid);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.StateComposingMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.StateComposingMessage}
 */
KarereEventObjects.StateComposingMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.StateComposingMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.StateComposingMessage}
 */
KarereEventObjects.StateComposingMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} room's JID
 */
KarereEventObjects.StateComposingMessage.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} room's JID
 * @returns {KarereEventObjects.StateComposingMessage}
 */
KarereEventObjects.StateComposingMessage.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.StateComposingMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.StateComposingMessage}
 */
KarereEventObjects.StateComposingMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.StateComposingMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.StateComposingMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `StatePausedMessage`
 *
 * @param toJid {string} recipient's JID
 * @param fromJid {string} sender's JID
 * @param [roomJid] {string} room's JID
 * @param [delay] {number} unix time stamp saying when this message was sent
 * @constructor
 */
KarereEventObjects.StatePausedMessage = function(toJid, fromJid, roomJid, delay) {
    this.setToJid(toJid);
    this.setFromJid(fromJid);
    this.setRoomJid(roomJid);
    this.setDelay(delay);
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} recipient's JID
 */
KarereEventObjects.StatePausedMessage.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} recipient's JID
 * @returns {KarereEventObjects.StatePausedMessage}
 */
KarereEventObjects.StatePausedMessage.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} sender's JID
 */
KarereEventObjects.StatePausedMessage.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} sender's JID
 * @returns {KarereEventObjects.StatePausedMessage}
 */
KarereEventObjects.StatePausedMessage.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} room's JID
 */
KarereEventObjects.StatePausedMessage.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} room's JID
 * @returns {KarereEventObjects.StatePausedMessage}
 */
KarereEventObjects.StatePausedMessage.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `delay`
 *
 * @returns {(number|unixtime())} unix time stamp saying when this message was sent
 */
KarereEventObjects.StatePausedMessage.prototype.getDelay = function() {
    return this.delay;
};
/**
 * Setter for property `delay`
 *
 * @param [val] {number} unix time stamp saying when this message was sent
 * @returns {KarereEventObjects.StatePausedMessage}
 */
KarereEventObjects.StatePausedMessage.prototype.setDelay = function(val) {
    this.delay = val || unixtime();
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.StatePausedMessage.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.StatePausedMessage.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `UsersJoined`
 *
 * @param fromJid {string} room's JID
 * @param toJid {string} room's JID
 * @param [roomJid] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @param currentUsers {Object} a list of the current users (after the UsersUpdated event)
 * @param newUsers {Object} list of the users that joined the room
 * @constructor
 */
KarereEventObjects.UsersJoined = function(fromJid, toJid, roomJid, currentUsers, newUsers) {
    this.setFromJid(fromJid);
    this.setToJid(toJid);
    this.setRoomJid(roomJid);
    this.setCurrentUsers(currentUsers);
    this.setNewUsers(newUsers);
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersJoined.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersJoined}
 */
KarereEventObjects.UsersJoined.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersJoined.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersJoined}
 */
KarereEventObjects.UsersJoined.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 */
KarereEventObjects.UsersJoined.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @returns {KarereEventObjects.UsersJoined}
 */
KarereEventObjects.UsersJoined.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `currentUsers`
 *
 * @returns {(Object)} a list of the current users (after the UsersUpdated event)
 */
KarereEventObjects.UsersJoined.prototype.getCurrentUsers = function() {
    return this.currentUsers;
};
/**
 * Setter for property `currentUsers`
 *
 * @param val {Object} a list of the current users (after the UsersUpdated event)
 * @returns {KarereEventObjects.UsersJoined}
 */
KarereEventObjects.UsersJoined.prototype.setCurrentUsers = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: currentUsers, expected Object got " + typeof(val));
    this.currentUsers = val;
    return this;
};
/**
 * Getter for property `newUsers`
 *
 * @returns {(Object)} list of the users that joined the room
 */
KarereEventObjects.UsersJoined.prototype.getNewUsers = function() {
    return this.newUsers;
};
/**
 * Setter for property `newUsers`
 *
 * @param val {Object} list of the users that joined the room
 * @returns {KarereEventObjects.UsersJoined}
 */
KarereEventObjects.UsersJoined.prototype.setNewUsers = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: newUsers, expected Object got " + typeof(val));
    this.newUsers = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.UsersJoined.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.UsersJoined.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `UsersLeft`
 *
 * @param fromJid {string} room's JID
 * @param toJid {string} room's JID
 * @param [roomJid] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @param currentUsers {Object} a list of the current users (after the UsersUpdated event)
 * @param leftUsers {Object} list of the users that left the room
 * @constructor
 */
KarereEventObjects.UsersLeft = function(fromJid, toJid, roomJid, currentUsers, leftUsers) {
    this.setFromJid(fromJid);
    this.setToJid(toJid);
    this.setRoomJid(roomJid);
    this.setCurrentUsers(currentUsers);
    this.setLeftUsers(leftUsers);
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersLeft.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersLeft}
 */
KarereEventObjects.UsersLeft.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersLeft.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersLeft}
 */
KarereEventObjects.UsersLeft.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 */
KarereEventObjects.UsersLeft.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @returns {KarereEventObjects.UsersLeft}
 */
KarereEventObjects.UsersLeft.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `currentUsers`
 *
 * @returns {(Object)} a list of the current users (after the UsersUpdated event)
 */
KarereEventObjects.UsersLeft.prototype.getCurrentUsers = function() {
    return this.currentUsers;
};
/**
 * Setter for property `currentUsers`
 *
 * @param val {Object} a list of the current users (after the UsersUpdated event)
 * @returns {KarereEventObjects.UsersLeft}
 */
KarereEventObjects.UsersLeft.prototype.setCurrentUsers = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: currentUsers, expected Object got " + typeof(val));
    this.currentUsers = val;
    return this;
};
/**
 * Getter for property `leftUsers`
 *
 * @returns {(Object)} list of the users that left the room
 */
KarereEventObjects.UsersLeft.prototype.getLeftUsers = function() {
    return this.leftUsers;
};
/**
 * Setter for property `leftUsers`
 *
 * @param val {Object} list of the users that left the room
 * @returns {KarereEventObjects.UsersLeft}
 */
KarereEventObjects.UsersLeft.prototype.setLeftUsers = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: leftUsers, expected Object got " + typeof(val));
    this.leftUsers = val;
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.UsersLeft.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.UsersLeft.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
/**
 * Event Object `UsersUpdated`
 *
 * @param fromJid {string} room's JID
 * @param toJid {string} room's JID
 * @param [roomJid] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @param currentUsers {Object} a list of the current users (after the UsersUpdated event)
 * @param [newUsers] {Object} optional, list of the new users that had joined the room (if any)
 * @param [leftUsers] {Object} optional, list of the users that left the room (if any)
 * @constructor
 */
KarereEventObjects.UsersUpdated = function(fromJid, toJid, roomJid, currentUsers, newUsers, leftUsers) {
    this.setFromJid(fromJid);
    this.setToJid(toJid);
    this.setRoomJid(roomJid);
    this.setCurrentUsers(currentUsers);
    this.setNewUsers(newUsers);
    this.setLeftUsers(leftUsers);
};
/**
 * Getter for property `fromJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersUpdated.prototype.getFromJid = function() {
    return this.fromJid;
};
/**
 * Setter for property `fromJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setFromJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: fromJid, expected string got " + typeof(val));
    this.fromJid = val;
    return this;
};
/**
 * Getter for property `toJid`
 *
 * @returns {(string)} room's JID
 */
KarereEventObjects.UsersUpdated.prototype.getToJid = function() {
    return this.toJid;
};
/**
 * Setter for property `toJid`
 *
 * @param val {string} room's JID
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setToJid = function(val) {
    assert(typeof(val) == "string", "Invalid argument passed for: toJid, expected string got " + typeof(val));
    this.toJid = val;
    return this;
};
/**
 * Getter for property `roomJid`
 *
 * @returns {(string|"")} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 */
KarereEventObjects.UsersUpdated.prototype.getRoomJid = function() {
    return this.roomJid;
};
/**
 * Setter for property `roomJid`
 *
 * @param [val] {string} optional, may contain the Room JID (if this message was sent to a XMPP conf. room)
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setRoomJid = function(val) {
    this.roomJid = val || "";
    return this;
};
/**
 * Getter for property `currentUsers`
 *
 * @returns {(Object)} a list of the current users (after the UsersUpdated event)
 */
KarereEventObjects.UsersUpdated.prototype.getCurrentUsers = function() {
    return this.currentUsers;
};
/**
 * Setter for property `currentUsers`
 *
 * @param val {Object} a list of the current users (after the UsersUpdated event)
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setCurrentUsers = function(val) {
    assert(val instanceof Object, "Invalid argument passed for: currentUsers, expected Object got " + typeof(val));
    this.currentUsers = val;
    return this;
};
/**
 * Getter for property `newUsers`
 *
 * @returns {(Object|{})} optional, list of the new users that had joined the room (if any)
 */
KarereEventObjects.UsersUpdated.prototype.getNewUsers = function() {
    return this.newUsers;
};
/**
 * Setter for property `newUsers`
 *
 * @param [val] {Object} optional, list of the new users that had joined the room (if any)
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setNewUsers = function(val) {
    this.newUsers = val || {};
    return this;
};
/**
 * Getter for property `leftUsers`
 *
 * @returns {(Object|{})} optional, list of the users that left the room (if any)
 */
KarereEventObjects.UsersUpdated.prototype.getLeftUsers = function() {
    return this.leftUsers;
};
/**
 * Setter for property `leftUsers`
 *
 * @param [val] {Object} optional, list of the users that left the room (if any)
 * @returns {KarereEventObjects.UsersUpdated}
 */
KarereEventObjects.UsersUpdated.prototype.setLeftUsers = function(val) {
    this.leftUsers = val || {};
    return this;
};
/**
 * Returns true if .fromJid equals the current jid of the passed Karere instance
 *
 * @param karere {Karere} Karere instance that should be used to determinate my JID
 * @returns {boolean}
 */
KarereEventObjects.UsersUpdated.prototype.isMyOwn = function(karere) {
    return Karere.getNormalizedFullJid(karere.getJid()) == Karere.getNormalizedFullJid(this.getFromJid())
};
/**
 * Debug helper
 *
 * @returns {string}
 */
KarereEventObjects.UsersUpdated.prototype.toString = function() {
    return "EventObject " + this.getType() + "(...)";
};
