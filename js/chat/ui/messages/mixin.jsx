var React = require("react");

var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;

var ConversationMessageMixin = {
    mixins: [MegaRenderMixin],
    onAfterRenderWasTriggered: false,
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;
        megaChat.chats.addChangeListener(function() {
            if (self.isMounted()) {
                self.forceUpdate();
            }
        });
    },
    getContact: function() {
        var message = this.props.message;
        var megaChat = this.props.chatRoom.megaChat;

        var contact;
        if (message.authorContact) {
            contact = message.authorContact;
        }
        else if (message.meta && message.meta.userId) {
            contact = M.u[message.meta.userId];
            if (!contact) {
                return {
                    'u': message.meta.userId,
                    'h': message.meta.userId,
                    'c': 0,
                }
            }
        }
        else if (message.userId) {
            if (!M.u[message.userId]) {
                // data is still loading!
                return null;
            }
            contact = M.u[message.userId];
        }
        else if (message.getFromJid) {
            contact = megaChat.getContactFromJid(message.getFromJid());
        }
        else {
            console.error("No idea how to render this: ", this.props);

            return {};
        }

        return contact;
    },
    getTimestampAsString: function() {
        return  unixtimeToTimeString(this.getTimestamp());
    },
    getTimestamp: function() {
        var message = this.props.message;
        var timestampInt;
        if (message.getDelay) {
            timestampInt = message.getDelay();
        }
        else if (message.delay) {
            timestampInt = message.delay;
        }
        else {
            console.error("missing timestamp: ", message);
            timestampInt = unixtime();
        }

        return timestampInt;
    },
    getParentJsp: function() {
        var $node = $(this.findDOMNode());
        var $jsp = $node.closest('.jScrollPaneContainer').data('jsp');
        return $jsp;
    },
    componentDidUpdate: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        if (!self.onAfterRenderWasTriggered) {
            var msg = self.props.message;
            var shouldRender = true;
            if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
                shouldRender = false;
            }

            if (shouldRender) {
                chatRoom.trigger("onAfterRenderMessage", self.props.message);
                self.onAfterRenderWasTriggered = true;
            }
        }
    }
};

module.exports = {
    ConversationMessageMixin
};
