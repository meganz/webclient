var React = require("react");
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
import { Emoji, ParsedHTML } from '../../../ui/utils.jsx';

class TopicChange extends ConversationMessageMixin {
    render() {
        var self = this;

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
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

        var messages = [];


        var avatar = <ContactsUI.Avatar contact={contact}
            chatRoom={chatRoom}
            className="message avatar-wrapper small-rounded-avatar"/>;
        const topic = megaChat.html(message.meta.topic);

        messages.push(
            <div className="message body" data-id={"id" + message.messageId} key={message.messageId}>
                {avatar}

                <div className="message content-area small-info-txt selectable-txt">
                    <ContactsUI.ContactButton
                        className="message"
                        chatRoom={chatRoom}
                        contact={contact}
                        label={<Emoji>{displayName}</Emoji>}
                    />
                    {datetime}
                    <div className="message text-block">
                        <ParsedHTML>{l[9081].replace('%s', `<strong>"${topic}"</strong>`)}</ParsedHTML>
                    </div>
                </div>
            </div>
        );


        return <div>{messages}</div>;
    }
}

export {
    TopicChange
};
