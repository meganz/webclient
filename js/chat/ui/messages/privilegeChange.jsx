var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

var PrivilegeChange = React.createClass({
    mixins: [ConversationMessageMixin],

    render: function () {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time"
                                       title={time2date(timestampInt)}>{timestamp}</div>;

        var displayName;
        if (contact) {
            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
        }
        else {
            displayName = contact;
        }

        var messages = [];



        var otherContact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
            'u': message.meta.targetUserId,
            'h': message.meta.targetUserId,
            'c': 0
        };

        var avatar = <ContactsUI.Avatar contact={otherContact} className="message small-rounded-avatar"/>;
        var otherDisplayName = otherContact.u === u_handle ? __(l[8885]) : generateAvatarMeta(otherContact.u).fullName;

        var newPrivilegeText = "";
        if (message.meta.privilege === 3) {
            newPrivilegeText = l[8875];
        }
        else if (message.meta.privilege === 2) {
            newPrivilegeText = l[8874];
        }
        else if (message.meta.privilege === 0) {
            newPrivilegeText = l[8873];
        }

        var text = __(l[8915])
            .replace(
                "%s1",
                '<strong className="dark-grey-txt">' + htmlentities(newPrivilegeText) + '</strong>'
            )
            .replace(
                "%s2",
                '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>'
            );

        messages.push(
            <div className="message body" data-id={"id" + message.messageId} key={message.messageId}>
                {avatar}

                <div className="message content-area small-info-txt">
                    <div className="message user-card-name">{otherDisplayName}</div>
                    {datetime}

                    <div className="message text-block" dangerouslySetInnerHTML={{__html:text}}></div>
                </div>
            </div>
        )
        

        return <div>{messages}</div>;
    }
});

module.exports = {
    PrivilegeChange
};
