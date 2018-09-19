var React = require("react");
var ReactDOM = require("react-dom");
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;

var WhosTyping = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            currentlyTyping: {}
        };
    },
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = self.props.chatRoom.megaChat;

        chatRoom.bind("onParticipantTyping.whosTyping", function(e, user_handle, bCastCode) {
            if (!self.isMounted()) {
                return;
            }
            if (user_handle === u_handle) {
                return;
            }

            var currentlyTyping = clone(self.state.currentlyTyping);
            var u_h = user_handle;

            if (u_h === u_handle) {
                // not my jid, but from other device (e.g. same user handle)
                return;
            }
            else if (!M.u[u_h]) {
                // unknown user handle? no idea what to show in the "typing" are, so skip it.
                return;
            }
            if (currentlyTyping[u_h]) {
                clearTimeout(currentlyTyping[u_h][1]);
            }

            if (bCastCode === 1) {
                var timer = setTimeout(function (u_h) {
                    self.stoppedTyping(u_h);
                }, 5000, u_h);

                currentlyTyping[u_h] = [unixtime(), timer];

                self.setState({
                    currentlyTyping: currentlyTyping
                });
            }
            else {
                self.stoppedTyping(u_h);
            }

            self.forceUpdate();
        });
    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        chatRoom.off("onParticipantTyping.whosTyping");
    },
    stoppedTyping: function(u_h) {
        var self = this;
        if (self.state.currentlyTyping[u_h]) {
            var newState = clone(self.state.currentlyTyping);
            if (newState[u_h]) {
                clearTimeout(newState[u_h][1]);
            }
            delete newState[u_h];
            self.setState({currentlyTyping: newState});
        }
    },
    render: function() {
        var self = this;

        var typingElement = null;

        if (Object.keys(self.state.currentlyTyping).length > 0) {
            var names = Object.keys(self.state.currentlyTyping).map((u_h) => {
                var contact = M.u[u_h];
                if (contact && contact.firstName) {
                    return contact.firstName;
                }
                else {
                    var avatarMeta = generateAvatarMeta(u_h);
                    return avatarMeta.fullName.split(" ")[0];
                }
            });

            var namesDisplay = "";
            var areMultipleUsersTyping = false;

            if (names.length > 1) {
                areMultipleUsersTyping = true;
                namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
            }
            else {
                areMultipleUsersTyping = false;
                namesDisplay = [names[0]];
            }

            var msg;
            if (areMultipleUsersTyping === true) {
                msg = __(l[8872])
                    .replace("%1", namesDisplay[0])
                    .replace("%2", namesDisplay[1]);
            }
            else {
                msg = __(l[8629]).replace("%1", namesDisplay[0]);
            }

            typingElement = <div className="typing-block">
                <div className="typing-text">{msg}</div>
                <div className="typing-bounce">
                    <div className="typing-bounce1"></div>
                    <div className="typing-bounce2"></div>
                    <div className="typing-bounce3"></div>
                </div>
            </div>;
        }
        else {
            // don't do anything.
        }

        return typingElement;
    }

});

module.exports = {
    WhosTyping
};
