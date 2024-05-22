import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { getMessageString } from '../utils.jsx';
import { Avatar, ContactButton } from '../../contacts.jsx';
import { Emoji, ParsedHTML } from '../../../../ui/utils';

const MESSAGE_TYPE = {
    OUTGOING: 'outgoing-call',
    INCOMING: 'incoming-call',
    TIMEOUT: 'call-timeout',
    STARTING: 'call-starting',
    FEEDBACK: 'call-feedback',
    INITIALISING: 'call-initialising',
    ENDED: 'call-ended',
    ENDED_REMOTE: 'remoteCallEnded',
    FAILED: 'call-failed',
    FAILED_MEDIA: 'call-failed-media',
    HANDLED_ELSEWHERE: 'call-handled-elsewhere',
    MISSED: 'call-missed',
    REJECTED: 'call-rejected',
    CANCELLED: 'call-canceled',
    STARTED: 'call-started',
    STARTED_REMOTE: 'remoteCallStarted',
    ALTER_PARTICIPANTS: 'alterParticipants',
    PRIVILEGE_CHANGE: 'privilegeChange',
    TRUNCATED: 'truncated',
};

export default class Local extends AbstractGenericMessage {
    componentDidMount() {
        super.componentDidMount();
        this._setClassNames();
    }

    _roomIsGroup() {
        return this.props.message.chatRoom.type === 'group' || this.props.message.chatRoom.type === 'public';
    }

    _getParticipantNames(message) {
        return (
            message.meta && message.meta.participants && !!message.meta.participants.length &&
            message.meta.participants
                .map(handle => `[[${megaChat.html(M.getNameByHandle(handle))}]]`)
        );
    }

    _getExtraInfo(message) {
        const { meta, type } = message;
        const participantNames = this._getParticipantNames(message);
        const HAS_PARTICIPANTS = participantNames && !!participantNames.length && participantNames.length > 1;
        const HAS_DURATION = meta && meta.duration;
        const ENDED = type === MESSAGE_TYPE.ENDED || type === MESSAGE_TYPE.FAILED || type === MESSAGE_TYPE.CANCELLED;

        let messageExtraInfo = [
            HAS_PARTICIPANTS ? mega.utils.trans.listToString(participantNames, l[20234] /* `With %s` */) : ''
        ];

        if (ENDED) {
            messageExtraInfo = [
                ...messageExtraInfo,
                HAS_PARTICIPANTS ? '. ' : '',
                // `Call duration: [[XX seconds]]`
                HAS_DURATION ? l[7208].replace('[X]', `[[${secToDuration(meta.duration)}]]`) : ''
            ];
        }

        // ["With [[Edward Snowden]]", ". ", "Call duration: [[45 seconds]]"] ->
        // `With <span class="bold">Edward Snowden</span>. Call duration: <span class="bold">45 seconds</span>`
        return messageExtraInfo && messageExtraInfo.reduce((acc, cur) =>
            (acc + cur).replace(/\[\[/g, '<span class="bold">').replace(/]]/g, '</span>')
        );
    }

    _setClassNames() {
        let cssClass;
        switch (this.props.message.type) {
            case MESSAGE_TYPE.REJECTED:
                cssClass = 'sprite-fm-theme icon-handset-rejected';
                break;
            case MESSAGE_TYPE.MISSED:
                cssClass = 'sprite-fm-theme icon-handset-missed';
                break;
            case MESSAGE_TYPE.OUTGOING:
            case MESSAGE_TYPE.HANDLED_ELSEWHERE:
                cssClass = 'sprite-fm-theme icon-handset-outgoing';
                break;
            case MESSAGE_TYPE.FAILED:
            case MESSAGE_TYPE.FAILED_MEDIA:
                cssClass = 'sprite-fm-theme icon-handset-failed';
                break;
            case MESSAGE_TYPE.ENDED:
            case MESSAGE_TYPE.TIMEOUT:
                cssClass = 'sprite-fm-theme icon-handset-ended';
                break;
            case MESSAGE_TYPE.CANCELLED:
                cssClass = 'sprite-fm-theme icon-handset-cancelled';
                break;
            case MESSAGE_TYPE.FEEDBACK:
            case MESSAGE_TYPE.STARTING:
            case MESSAGE_TYPE.STARTED:
                cssClass = 'sprite-fm-mono icon-phone';
                break;
            case MESSAGE_TYPE.INCOMING:
                cssClass = 'sprite-fm-theme icon-handset-incoming';
                break;
            default:
                cssClass = 'sprite-fm-mono ' + this.props.message.type;
                break;
        }
        this.props.message.cssClass = cssClass;
    }

    _getIcon(message) {
        const BASE_CLASS = 'call-info-icon';
        const MESSAGE_ICONS = {
            [MESSAGE_TYPE.STARTED]: `<i class="${BASE_CLASS} sprite-fm-mono icon-phone">&nbsp;</i>`,
            [MESSAGE_TYPE.ENDED]: `<i class="${BASE_CLASS} sprite-fm-theme icon-handset-ended">&nbsp;</i>`,
            DEFAULT: `<i class="${BASE_CLASS} ${message.cssClass}">&nbsp;</i>`,
        };
        return MESSAGE_ICONS[message.type] || MESSAGE_ICONS.DEFAULT;
    }

    _getText() {
        const { message } = this.props;
        const IS_GROUP = this._roomIsGroup();
        let messageText = getMessageString(message.type, IS_GROUP, message.chatRoom.isMeeting);

        if (!messageText) {
            return console.error(`Message with type: ${message.type} -- no text string defined. Message: ${message}`);
        }

        messageText = CallManager2._getMltiStrTxtCntsForMsg(
            message,
            messageText.splice ? messageText : [messageText],
            true
        );
        messageText = megaChat.html(messageText);

        message.textContents = String(messageText)
            .replace("[[", "<span class=\"bold\">")
            .replace("]]", "</span>");

        if (IS_GROUP) {
            // <div class="call-info-container">
            //     <i class="call-info-icon sprite-fm-mono icon-handset-ended" />
            //     <div class="call-info-content">
            //         <span class="call-info-message bold">Group call ended</span>
            //         With <span class="bold">Edward Snowden</span>.
            //         Call duration: <span class="bold">45 seconds</span>
            //     </div>
            // </div>
            messageText = `
                ${this._getIcon(message)}
                <div class="call-info-content">
                    <span class="call-info-message bold">${messageText}</span>
                    ${this._getExtraInfo(message)}
                </div>
            `;
        }

        return messageText;
    }

    _getAvatarsListing() {
        const { message } = this.props;

        if (
            this._roomIsGroup() &&
            message.type === MESSAGE_TYPE.STARTED &&
            message.messageId === `${MESSAGE_TYPE.STARTED}-${message.chatRoom.getActiveCallMessageId()}`
        ) {
            const unique = message.chatRoom.uniqueCallParts ? Object.keys(message.chatRoom.uniqueCallParts) : [];
            return unique.map(handle =>
                <Avatar
                    key={handle}
                    contact={M.u[handle]}
                    simpletip={true}
                    className="message avatar-wrapper small-rounded-avatar"
                />
            );
        }

        return null;
    }

    _getButtons() {
        const { message } = this.props;

        if (message.buttons && Object.keys(message.buttons).length) {
            return (
                <div className="buttons-block">
                    {Object.keys(message.buttons).map(key => {
                        const button = message.buttons[key];
                        return (
                            <button
                                key={key}
                                className={button.classes}
                                onClick={e =>
                                    button.callback(e.target)
                                }>
                                {button.icon && (
                                    <div>
                                        <i className={`small-icon ${button.icon}`} />
                                    </div>
                                )}
                                <span>{button.text}</span>
                            </button>
                        );
                    })}
                    <div className="clear" />
                </div>
            );
        }
    }

    getAvatar() {
        const { message, grouped } = this.props;
        if (message.type === MESSAGE_TYPE.FEEDBACK) {
            return null;
        }
        const $$AVATAR =
            <Avatar
                contact={message.authorContact}
                className="message avatar-wrapper small-rounded-avatar"
                chatRoom={message.chatRoom}
            />;
        const $$ICON =
            <div className="feedback call-status-block">
                <i className={`sprite-fm-mono ${message.cssClass}`} />
            </div>;

        return (
            // When grouped, avatar is shown only for the first entity of the messages chain.
            message.showInitiatorAvatar ? grouped ? null : $$AVATAR : $$ICON
        );
    }

    getMessageTimestamp() {

        //
        // `Text@getMessageTimestamp` overrides the default timestamp within `AbstractGenericMessage`;
        // contrary to many of the other message types, for this specific message type (`Text`) we need timestamps
        // rendered irrespective of the grouping.
        //
        // - `Text` timestamp w/o grouping
        // - `Text` timestamp w/o grouping, group calls
        // - Timestamp w/ grouping, e.g. three separate messages
        // -------------------------------------------------------------------------

        // debugging purposes
        const callId = this.props.message?.meta?.callId;

        let debugMsg = "";
        if (d && callId) {
            debugMsg = `: callId: ${callId}`;
        }
        return (
            <div className="message date-time simpletip" data-simpletip={time2date(this.getTimestamp(), 17)}>
                {this.getTimestampAsString()}
                {debugMsg}
            </div>
        );
    }

    getClassNames() {
        const { message: { showInitiatorAvatar, type }, grouped } = this.props;
        const classNames = [
            showInitiatorAvatar && grouped && 'grouped',
            this._roomIsGroup() && type !== MESSAGE_TYPE.OUTGOING && type !== MESSAGE_TYPE.INCOMING && 'with-border'
        ];

        return classNames.filter(className => className).join(' ');
    }

    getName() {
        const { message, grouped } = this.props;
        const contact = this.getContact();

        return (
            message.showInitiatorAvatar && !grouped ?
                <ContactButton
                    contact={contact}
                    className="message"
                    label={
                        <Emoji>{message.authorContact ? M.getNameByHandle(message.authorContact.u) : ''}</Emoji>
                    }
                    chatRoom={message.chatRoom}
                /> :
                M.getNameByHandle(contact.u)
        );
    }

    getContents() {
        const { message: { getState } } = this.props;
        return (
            <>
                <div className="message text-block">
                    <div className="message call-inner-block">
                        <div className="call-info">
                            <div className="call-info-container">
                                <ParsedHTML className="info-wrapper">{this._getText()}</ParsedHTML>
                            </div>
                            <div className="call-info-avatars">
                                {this._getAvatarsListing()}
                                <div className="clear" />
                            </div>
                        </div>
                    </div>
                </div>
                {getState && getState() === Message.STATE.NOT_SENT ? null : this._getButtons()}
            </>
        );
    }
}
