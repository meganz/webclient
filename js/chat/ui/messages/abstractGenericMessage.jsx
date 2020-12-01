import React from 'react';
import { ConversationMessageMixin } from './mixin.jsx';
import { Avatar, ContactButton } from '../contacts.jsx';

export default class AbstractGenericMessage extends ConversationMessageMixin {
    constructor(props) {
        super(props);
    }

    getAvatar() {
        const contact = this.getContact() || Message.getContactForMessage(this.props.message);

        if (this.props.grouped) {
            return null;
        }

        return (
            contact ?
                <Avatar
                    contact={this.getContact()}
                    className="message avatar-wrapper small-rounded-avatar"
                    chatRoom={this.props.chatRoom}
                /> :
                null
        );
    }

    getName() {
        const contact = this.getContact() || Message.getContactForMessage(this.props.message);

        if (this.props.grouped) {
            return null;
        }

        return (
            contact ?
                <ContactButton
                    contact={contact}
                    className="message"
                    label={M.getNameByHandle(contact.u)}
                    chatRoom={this.props.message.chatRoom}
                /> :
                null
        );
    }

    renderMessageActionButtons(buttons) {
        if (!buttons) {
            return null;
        }

        const cnt = buttons.length;

        if (cnt === 0) {
            return null;
        }

        return (
            <div className={`right-aligned-msg-buttons ${cnt && cnt > 1 ? `total-${cnt}` : ''}`}>
                {buttons}
            </div>
        );
    }

    render() {
        const { message, grouped, additionalClasses, hideActionButtons } = this.props;

        if (message.deleted) {
            return null;
        }

        return (
            <div
                data-id={message.messageId}
                className={`
                    ${this.getClassNames ? this.getClassNames() : grouped ? 'grouped' : ''}
                    ${additionalClasses}
                    ${message.messageId}
                    message
                    body
                `}>
                {this.getAvatar && this.getAvatar()}
                <div className="message content-area">
                    {this.getName && this.getName()}
                    {this.getMessageTimestamp ? this.getMessageTimestamp() : grouped ? null : (
                        <div className="message date-time simpletip" data-simpletip={time2date(this.getTimestamp())}>
                            {this.getTimestampAsString()}
                        </div>
                    )}
                    {!hideActionButtons && this.getMessageActionButtons && (
                        this.renderMessageActionButtons(this.getMessageActionButtons())
                    )}
                    {this.getContents && this.getContents()}
                    {this.getEmojisImages()}
                </div>
            </div>
        );
    }
}
