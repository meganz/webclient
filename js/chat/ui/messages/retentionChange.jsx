import  React from 'react';
import { ConversationMessageMixin } from './mixin.jsx';
import { ContactButton, Avatar } from '../contacts.jsx';

export class RetentionChange extends ConversationMessageMixin {
    render() {
        const { message } = this.props;
        const contact = this.getContact();

        return (
            <div className="message body" data-id={"id" + message.messageId} key={message.messageId}>
                <Avatar contact={contact} className="message avatar-wrapper small-rounded-avatar"/>
                <div className="message content-area small-info-txt">
                    <ContactButton
                        contact={contact}
                        className="message"
                        label={contact ? generateAvatarMeta(contact.u).fullName : contact} />
                    <div className="message date-time simpletip" data-simpletip={time2date(this.getTimestamp())}>
                        {this.getTimestampAsString()}
                    </div>
                    <div className="message text-block">
                        {message.getMessageRetentionSummary()}
                    </div>
                </div>
            </div>
        );
    }
}
