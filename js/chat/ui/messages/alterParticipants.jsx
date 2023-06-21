var React = require("react");
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
import { Emoji, ParsedHTML } from '../../../ui/utils.jsx';

class AltPartsConvMessage extends ConversationMessageMixin {
    _ensureNameIsLoaded(h) {
        var self = this;
        var contact = M.u[h] ? M.u[h] : {
            'u': h,
            'h': h,
            'c': 0,
        };
        var displayName = generateAvatarMeta(contact.u).fullName;


        if (!displayName) {
            M.u.addChangeListener(function () {
                displayName = generateAvatarMeta(contact.u).fullName;
                if (displayName) {
                    self.safeForceUpdate();

                    return 0xDEAD;
                }
            });
        }
    }
    haveMoreContactListeners() {
        if (!this.props.message || !this.props.message.meta) {
            return false;
        }
        return this.props.message.meta.included || this.props.message.meta.excluded;
    }
    render() {
        var self = this;

        var message = this.props.message;
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

        message.meta.included.forEach(function(h) {
            var otherContact = M.u[h] ? M.u[h] : {
                'u': h,
                'h': h,
                'c': 0,
            };

            var avatar = <ContactsUI.Avatar contact={otherContact}
                chatRoom={self.props.chatRoom}
                className="message avatar-wrapper small-rounded-avatar"/>;
            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

            const isSelfJoin = h === contact.u;
            let text = isSelfJoin
                ? l[23756] /* `%1 joined the group chat.` */
                : l[8907]; /* `%1 joined the group chat by invitation from %2.` */
            if (self.props.chatRoom.isMeeting) {
                text = isSelfJoin
                    ? l.meeting_mgmt_user_joined /* `%1 joined the meeting.` */
                    : l.meeting_mgmt_user_added; /* `%1 joined the meeting by invitation from %2.` */
            }
            text = text.replace('%1', megaChat.html(otherDisplayName));
            if (!isSelfJoin) {
                text = text.replace('%2', `<strong>${megaChat.html(displayName)}</strong>`);
            }

            self._ensureNameIsLoaded(otherContact.u);
            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={message.messageId + "_" + h}>
                    {avatar}

                    <div className="message content-area small-info-txt selectable-txt">
                        <ContactsUI.ContactButton
                            className="message"
                            contact={otherContact}
                            chatRoom={self.props.chatRoom}
                            label={<Emoji>{otherDisplayName}</Emoji>}
                        />
                        {datetime}
                        <div className="message text-block">
                            <ParsedHTML>{text}</ParsedHTML>
                        </div>
                    </div>
                </div>
            );
        });

        message.meta.excluded.forEach(function(h) {
            var otherContact = M.u[h] ? M.u[h] : {
                'u': h,
                'h': h,
                'c': 0,
            };

            var avatar = <ContactsUI.Avatar contact={otherContact}
                chatRoom={self.props.chatRoom}
                className="message avatar-wrapper small-rounded-avatar"/>;
            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

            self._ensureNameIsLoaded(otherContact.u);

            var text;
            if (otherContact.u === contact.u) {
                text = self.props.chatRoom.isMeeting
                    ? l.meeting_mgmt_left /* `Left the meeting` */
                    : l[8908]; /* `Left the group chat` */
            }
            else {
                text = (
                    self.props.chatRoom.isMeeting
                        ? l.meeting_mgmt_kicked /* `Was removed from the meeting by %s.` */
                        : l[8906] /* `Was removed from the group chat by %s.` */
                ).replace(
                    "%s",
                    `<strong>${megaChat.html(displayName)}</strong>`
                );
            }

            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={message.messageId + "_" + h}>
                    {avatar}

                    <div className="message content-area small-info-txt selectable-txt">
                        <ContactsUI.ContactButton
                            className="message"
                            chatRoom={self.props.chatRoom}
                            contact={otherContact}
                            label={<Emoji>{otherDisplayName}</Emoji>}
                        />
                        {datetime}
                        <div className="message text-block">
                            <ParsedHTML>{text}</ParsedHTML>
                        </div>
                    </div>
                </div>
            );
        });

        return <div>{messages}</div>;
    }
};

export {
    AltPartsConvMessage
};
