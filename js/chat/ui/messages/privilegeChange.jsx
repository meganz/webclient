var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
import MegaRenderMixin from './../../../stores/mixins.js';
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

class PrivilegeChange extends ConversationMessageMixin {
    haveMoreContactListeners() {
        if (!this.props.message.meta || !this.props.message.meta.targetUserId) {
            return false;
        }

        var uid = this.props.message.meta.targetUserId;
        if (uid && M.u[uid]) {
            return uid;
        }
        else {
            return false;
        }
    }
    render() {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time simpletip"
                            data-simpletip={time2date(timestampInt)}>{timestamp}</div>;

        var displayName;
        if (contact) {
            displayName = generateAvatarMeta(contact.u).fullName;
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

        var avatar = <ContactsUI.Avatar contact={otherContact}
                                        className="message avatar-wrapper small-rounded-avatar"/>;
        var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

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
                    <ContactsUI.ContactButton contact={otherContact} className="message" label={otherDisplayName} />
                    {datetime}

                    <div className="message text-block" dangerouslySetInnerHTML={{__html:text}}></div>
                </div>
            </div>
        )


        return <div>{messages}</div>;
    }
};

export {
    PrivilegeChange
};
