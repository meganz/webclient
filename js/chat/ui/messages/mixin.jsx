var React = require("react");

var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var RenderDebugger = require('./../../../stores/mixins.js').RenderDebugger;

var ConversationMessageMixin = {
    mixins: [MegaRenderMixin, RenderDebugger],
    onAfterRenderWasTriggered: false,
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.message.chatRoom;
        var megaChat = chatRoom.megaChat;
        var contact = self.getContact();
        var changedCb = function(contact, oldData, k, v) {
            if (k === "ts") {
                // no updates needed in case of 'ts' change
                // e.g. reduce recursion of full history re-render in case of a new message is sent to a room.
                return;
            }
            self.debouncedForceUpdate();
        };

        if (contact && contact.addChangeListener && !self._contactChangeListener) {
            self._contactChangeListener = contact.addChangeListener(changedCb);
        }
        if (self.haveMoreContactListeners) {
            if (!self._contactChangeListeners) {
                self._contactChangeListeners = [];
                var moreIds = self.haveMoreContactListeners();
                if (moreIds && moreIds.forEach) {
                    moreIds.forEach(function(handle) {
                        if (M.u[handle] && M.u[handle].addChangeListener) {
                            self._contactChangeListeners.push(
                                [M.u[handle], M.u[handle].addChangeListener(changedCb)]
                            )
                        }
                    });
                }
            }
        }
    },
    componentWillUnmount: function() {
        var self = this;
        var contact = self.getContact();

        if (self._contactChangeListener && contact && contact.removeChangeListener) {
            contact.removeChangeListener(self._contactChangeListener);
        }
        if (this._contactChangeListeners) {
            this._contactChangeListeners.forEach(function(listener) {
                listener[0].removeChangeListener(listener[1]);
            });
            this._contactChangeListeners = [];
        }
    },
    getContact: function() {
        if (this.props.contact) {
            // optimization
            return this.props.contact;
        }
        var message = this.props.message;

        return Message.getContactForMessage(message);
    },
    getTimestampAsString: function() {
        return unixtimeToTimeString(this.getTimestamp());
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
            timestampInt = unixtime();
        }

        if (timestampInt && message.updated && message.updated > 0) {
            timestampInt += message.updated;
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
        var chatRoom = self.props.message.chatRoom;
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
