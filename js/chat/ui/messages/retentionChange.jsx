import  React from 'react';
import { ConversationMessageMixin } from './mixin.jsx';
import { ContactButton, Avatar } from '../contacts.jsx';
import { Emoji } from '../../../ui/utils.jsx';

export class RetentionChange extends ConversationMessageMixin {
    render() {
        const { message } = this.props;
        const contact = this.getContact();

        return (
            <div className="message body" data-id={"id" + message.messageId} key={message.messageId}>
                <Avatar contact={contact} className="message avatar-wrapper small-rounded-avatar"/>
                <div className="message content-area small-info-txt selectable-txt">
                    <ContactButton
                        contact={contact}
                        className="message"
                        label={<Emoji>{M.getNameByHandle(contact.u)}</Emoji>}
                    />
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
