var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
import {MegaRenderMixin} from './../../../stores/mixins.js';
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

class CloseOpenModeMessage extends ConversationMessageMixin {
    render() {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time"
            title={time2date(timestampInt)}>{timestamp}</div>;

        var displayName;
        if (contact) {
            displayName = generateAvatarMeta(contact.u).fullName;
        }
        else {
            displayName = contact;
        }

        var avatar = null;
        if (this.props.grouped) {
            cssClasses += " grouped";
        }
        else {
            avatar = <ContactsUI.Avatar contact={contact} className="message  avatar-wrapper small-rounded-avatar"
                chatRoom={this.props.chatRoom} />;
            datetime = <div className="message date-time"
                title={time2date(timestampInt)}>{timestamp}</div>;
        }


        return (
            <div className={cssClasses} data-id={"id" + message.messageId} key={message.messageId}>
                {avatar}

                <div className="message content-area small-info-txt">
                    <div className="message user-card-name">{displayName}</div>
                    {datetime}

                    <div className="message text-block">
                        {__('switched off chat open mode.')}
                    </div>
                </div>
            </div>
        );
    }
};

export {
    CloseOpenModeMessage
};
