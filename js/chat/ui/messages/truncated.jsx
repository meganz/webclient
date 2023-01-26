var React = require("react");
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
import { Emoji } from '../../../ui/utils.jsx';

class TruncatedMessage extends ConversationMessageMixin {
    render() {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time simpletip"
            data-simpletip={time2date(timestampInt, 17)}>{timestamp}</div>;

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
            avatar = <ContactsUI.Avatar contact={contact}
                className="message avatar-wrapper small-rounded-avatar"
                chatRoom={chatRoom} />;
            datetime = <div className="message date-time simpletip"
                data-simpletip={time2date(timestampInt, 17)}>{timestamp}</div>;
        }


        return (
            <div className={cssClasses} data-id={"id" + message.messageId} key={message.messageId}>
                {avatar}

                <div className="message content-area small-info-txt selectable-txt">
                    <ContactsUI.ContactButton
                        contact={contact}
                        className="message"
                        label={<Emoji>{displayName}</Emoji>}
                        chatRoom={chatRoom} />
                    {datetime}

                    <div className="message text-block">
                        {l[8905]}
                    </div>
                </div>
            </div>
        );
    }
}

export {
    TruncatedMessage
};
