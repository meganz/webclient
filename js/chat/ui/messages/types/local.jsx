import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { getMessageString } from '../utils.jsx';
import { Avatar, ContactButton } from '../../contacts.jsx';

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
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        this._setClassNames();
    }

    // TODO: unify w/ roomIsGroup within resultRow.jsx
    _roomIsGroup = () => this.props.message.chatRoom.type === 'group' || this.props.message.chatRoom.type === 'public';

    _getParticipantNames = message => (
        message.meta && message.meta.participants && !!message.meta.participants.length &&
        message.meta.participants.map(handle =>
            `[[${escapeHTML(M.getNameByHandle(handle))}]]`
        )
    );

    _getExtraInfo = (message) => {
        const participantNames = this._getParticipantNames(message);
        const HAS_PARTICIPANTS = participantNames && !!participantNames.length;
        const ENDED  = message.type === MESSAGE_TYPE.ENDED || message.type === MESSAGE_TYPE.FAILED;
        const HAS_DURATION = message.meta && message.meta.duration;

        let messageExtraInfo = [
            HAS_PARTICIPANTS ? mega.utils.trans.listToString(participantNames, l[20234] /* `With %s` */) : ''
        ];

        if (ENDED && HAS_DURATION) {
            messageExtraInfo = [
                ...messageExtraInfo,
                HAS_PARTICIPANTS ? '. ' : '',
                // `Call duration: [[XX seconds]]`
                l[7208].replace('[X]', '[[' + secToDuration(message.meta.duration) + ']]')
            ];
        }

        // ["With [[Edward Snowden]]", ". ", "Call duration: [[45 seconds]]"] ->
        // `With <span class="bold">Edward Snowden</span>. Call duration: <span class="bold">45 seconds</span>`
        return messageExtraInfo && messageExtraInfo.reduce((acc, cur) =>
            (acc + cur).replace(/\[\[/g, '<span class="bold">').replace(/]]/g, '</span>')
        );
    };

    _setClassNames() {
        let cssClass;
        switch (this.props.message.type) {
            case MESSAGE_TYPE.REJECTED:
                cssClass = 'handset-with-stop';
                break;
            case MESSAGE_TYPE.MISSED:
                cssClass = 'handset-with-yellow-arrow';
                break;
            case MESSAGE_TYPE.OUTGOING || MESSAGE_TYPE.HANDLED_ELSEWHERE:
                cssClass = 'handset-with-up-arrow';
                break;
            case MESSAGE_TYPE.FAILED:
                cssClass = 'handset-with-cross';
                break;
            case MESSAGE_TYPE.TIMEOUT:
                cssClass = 'horizontal-handset';
                break;
            case MESSAGE_TYPE.FAILED_MEDIA:
                cssClass = 'handset-with-yellow-cross';
                break;
            case MESSAGE_TYPE.CANCELLED:
                cssClass = 'crossed-handset';
                break;
            case MESSAGE_TYPE.ENDED:
                cssClass = 'horizontal-handset';
                break;
            case MESSAGE_TYPE.FEEDBACK || MESSAGE_TYPE.STARTING || MESSAGE_TYPE.STARTED:
                cssClass = 'diagonal-handset';
                break;
            case MESSAGE_TYPE.INCOMING:
                cssClass = 'handset-with-down-arrow';
                break;
            default:
                cssClass = this.props.message.type;
                break;
        }
        this.props.message.cssClass = cssClass;
    }

    _getIcon(message) {
        const MESSAGE_ICONS = {
            [MESSAGE_TYPE.STARTED]: '<i class="call-icon diagonal-handset green">&nbsp;</i>',
            [MESSAGE_TYPE.ENDED]: '<i class="call-icon big horizontal-handset grey">&nbsp;</i>',
            DEFAULT: `<i class="call-icon ${message.cssClass}">&nbsp;</i>`,
        };
        return MESSAGE_ICONS[message.type] || MESSAGE_ICONS.DEFAULT;
    }

    _getText() {
        const { message } = this.props;
        const IS_GROUP = this._roomIsGroup();
        let messageText = getMessageString(message.type, IS_GROUP);

        if (!messageText) {
            return console.error(`Message with type: ${message.type} -- no text string defined. Message: ${message}`);
        }

        messageText = CallManager._getMultiStringTextContentsForMessage(
            message,
            messageText.splice ? messageText : [messageText],
            true
        );

        message.textContents = String(messageText)
            .replace("[[", "<span class=\"bold\">")
            .replace("]]", "</span>");

        if (IS_GROUP) {
            // `Group call started` -> `<i class="call-icon diagonal-handset green">&nbsp;</i>Group call started`
            messageText = this._getIcon(message) + messageText;

            // <div class="bold mainMessage">
            //     <i class="call-icon big horizontal-handset grey" />
            //     Group call ended
            // </div>
            // <div class="extraCallInfo">
            //     With <span class="bold">Edward Snowden</span>.
            //     Call duration: <span class="bold">45 seconds</span>
            // </div>
            messageText =
                '<div class="bold mainMessage">' + messageText + '</div>' +
                '<div class="extraCallInfo">' + this._getExtraInfo(message) + '</div>';
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
                    simpletip={M.u[handle] && M.u[handle].name}
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
                            <div
                                key={key}
                                className={button.classes}
                                onClick={e =>
                                    button.callback(e.target)
                                }>
                                {button.icon && <i className={`small-icon ${button.icon}`} />}
                                {button.text}
                            </div>
                        );
                    })}
                    <div className="clear" />
                </div>
            );
        }
    }

    getAvatar() {
        const { message, grouped } = this.props;
        const $$AVATAR =
            <Avatar
                contact={message.authorContact}
                className="message avatar-wrapper small-rounded-avatar"
                chatRoom={message.chatRoom}
            />;
        const $$ICON =
            <div className="feedback call-status-block">
                <i className={"call-icon " + message.cssClass} />
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
        // `Text` timestamp w/o grouping
        // https://mega.nz/file/lM1hDKqZ#iJOhEi3uLhuIcUvzxM5CMggy2KgzqoLvpWQ0ZA0Xp9U
        //
        // `Text` timestamp w/o grouping, group calls
        // https://mega.nz/file/JR8TDIaQ#47XxaTBlfTcmrByNQliWomkM-IRQUMJIpqogzFjQmKg
        //
        // Timestamp w/ grouping, e.g. three separate messages
        // https://mega.nz/file/RIkX2YjZ#aAtDzJCR1ZZYRGTpPwnL3iBS9SyG9WhPlTEpB5dVv7g
        // -------------------------------------------------------------------------

        return (
            <div className="message date-time simpletip" data-simpletip={time2date(this.getTimestamp())}>
                {this.getTimestampAsString()}
            </div>
        );
    }

    getClassNames() {
        const { message: { showInitiatorAvatar, type }, grouped } = this.props;
        let classNames = [
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
                    label={M.getNameByHandle(message.authorContact.u)}
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
                        {this._getAvatarsListing()}
                        <div dangerouslySetInnerHTML={{ __html: this._getText() }} />
                    </div>
                </div>
                {getState && getState() === Message.STATE.NOT_SENT ? null : this._getButtons()}
            </>
        );
    }
}
