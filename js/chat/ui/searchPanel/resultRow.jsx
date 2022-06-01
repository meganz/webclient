import React from 'react';
import { TYPE, LABEL } from './resultContainer.jsx';
import { Avatar, ContactPresence, LastActivity, MembersAmount } from '../contacts.jsx';
import { MegaRenderMixin } from '../../mixins';
import { OFlowEmoji, OFlowParsedHTML } from '../../../ui/utils.jsx';
import { ContactAwareName } from '../contacts.jsx';
import { EVENTS } from './searchPanel.jsx';

const RESULT_ROW_CLASS = 'result-table-row';
const USER_CARD_CLASS = 'user-card';

/**
 * roomIsGroup
 * @description Check whether given chat room is group chat.
 * @param {ChatRoom} room
 * @returns {Boolean}
 */

const roomIsGroup = room => room && room.type === 'group' || room.type === 'public';

/**
 * openResult
 * @description Invoked on result click, opens the respective chat room; instantiates new chat room if none is already
 * available. The root component is notified for the interaction via the `chatSearchResultOpen` event trigger.
 * @see SearchPanel.bindEvents()
 * @param {ChatRoom|String} room room or userId
 * @param {String} [messageId]
 * @param {Number} [index]
 * @param {Function} [callback]
 */

const openResult = ({ room, messageId, index }, callback) => {
    document.dispatchEvent(new Event(EVENTS.RESULT_OPEN));

    if (isString(room)) {
        loadSubPage(`fm/chat/p/${room}`);
    }
    else if (room && room.chatId && !messageId) {
        // Chat room matched -> open chat room
        const chatRoom = megaChat.getChatById(room.chatId);
        if (chatRoom) {
            loadSubPage(chatRoom.getRoomUrl());
        }
        else {
            // No chat room -> instantiate new chat room
            megaChat.openChat([u_handle, room.chatId], 'private', undefined, undefined, undefined, true);
        }
    }
    else {
        loadSubPage(room.getRoomUrl());
        if (messageId) {
            room.scrollToMessageId(messageId, index);
        }
    }

    return callback && typeof callback === 'function' && callback();
};

//
// MessageRow
// ---------------------------------------------------------------------------------------------------------------------

class MessageRow extends MegaRenderMixin {
    render() {
        const { data, matches, room, index, onResultOpen } = this.props;
        const isGroup = room && roomIsGroup(room);
        const contact = room.getParticipantsExceptMe();
        const summary = data.renderableSummary || room.messagesBuff.getRenderableSummary(data);

        return (
            <div
                ref={node => {
                    this.nodeRef = node;
                }}
                className={`
                    ${RESULT_ROW_CLASS}
                    message
                `}
                onClick={() =>
                    openResult({ room, messageId: data.messageId, index }, () => onResultOpen(this.nodeRef))
                }>
                <div className="message-result-avatar">
                    {isGroup ?
                        <div className="chat-topic-icon">
                            <i className="sprite-fm-uni icon-chat-group"/>
                        </div> :
                        <Avatar contact={M.u[contact]}/>}
                </div>
                <div className="user-card">
                    <span className="title">
                        <ContactAwareName contact={M.u[contact]}>
                            <OFlowEmoji>{room.getRoomTitle()}</OFlowEmoji>
                        </ContactAwareName>
                    </span>
                    {isGroup ? null : <ContactPresence contact={M.u[contact]}/>}
                    <div className="clear"/>
                    <div className="message-result-info">
                        <div className="summary">
                            <OFlowParsedHTML content={megaChat.highlight(summary, matches, true)} />
                        </div>
                        <div className="result-separator">
                            <i className="sprite-fm-mono icon-dot"/>
                        </div>
                        <span className="date">
                            {getTimeMarker(data.delay, true)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}

//
// ChatRow
// ---------------------------------------------------------------------------------------------------------------------

class ChatRow extends MegaRenderMixin {
    render() {
        const { room, matches, onResultOpen } = this.props;
        const result = megaChat.highlight(megaChat.html(room.topic), matches, true);

        return (
            <div
                ref={node => {
                    this.nodeRef = node;
                }}
                className={RESULT_ROW_CLASS}
                onClick={() => openResult({ room }, () => onResultOpen(this.nodeRef))}>
                <div className="chat-topic-icon">
                    <i className="sprite-fm-uni icon-chat-group"/>
                </div>
                <div className={USER_CARD_CLASS}>
                    <div className="graphic">
                        <OFlowParsedHTML>{result}</OFlowParsedHTML>
                    </div>
                </div>
                <div className="clear"/>
            </div>
        );
    }
}

//
// MemberRow
// ---------------------------------------------------------------------------------------------------------------------

class MemberRow extends MegaRenderMixin {
    render() {
        const { data, matches, room, contact, onResultOpen } = this.props;
        const isGroup = room && roomIsGroup(room);

        return (
            <div
                ref={node => {
                    this.nodeRef = node;
                }}
                className={RESULT_ROW_CLASS}
                onClick={() => openResult({ room: room || contact.h }, () => onResultOpen(this.nodeRef))}>
                {isGroup ?
                    <div className="chat-topic-icon">
                        <i className="sprite-fm-uni icon-chat-group"/>
                    </div> :
                    <Avatar contact={contact}/>}
                <div className={USER_CARD_CLASS}>
                    <div className="graphic">
                        {isGroup ?
                            <OFlowParsedHTML>
                                {megaChat.highlight(megaChat.html(room.topic || room.getRoomTitle()), matches, true)}
                            </OFlowParsedHTML> :
                            <>
                                <OFlowParsedHTML>
                                    {megaChat.highlight(megaChat.html(nicknames.getNickname(data)), matches, true)}
                                </OFlowParsedHTML>
                                <ContactPresence contact={contact}/>
                            </>
                        }
                    </div>
                </div>
                <div className="clear"/>
            </div>
        );
    }
}

const NilRow = ({ onSearchMessages, isFirstQuery }) => {
    const label = LABEL.SEARCH_MESSAGES_INLINE.replace('[A]', '<a>').replace('[/A]', '</a>');
    return (
        <div
            className={`
                ${RESULT_ROW_CLASS}
                nil
            `}>
            <div className="nil-container">
                <i className="sprite-fm-mono icon-preview-reveal"/>
                <span>{LABEL.NO_RESULTS}</span>
                {isFirstQuery && (
                    <div
                        className="search-messages"
                        onClick={onSearchMessages}>
                        <OFlowParsedHTML
                            tag="div"
                            content={label}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------------------------------------------------

export default class ResultRow extends MegaRenderMixin {
    setActive = nodeRef => {
        if (nodeRef) {
            const activeClass = 'active';
            const elements = document.querySelectorAll(`.${RESULT_ROW_CLASS}.${activeClass}`);
            for (let i = elements.length; i--;) {
                elements[i].classList.remove(activeClass);
            }
            nodeRef.classList.add(activeClass);
        }
    };

    render() {
        const { type, result, children, onSearchMessages, isFirstQuery } = this.props;

        if (result) {
            const { data, index, matches, room } = result;
            const PROPS = { data, index, matches, room, onResultOpen: this.setActive };

            switch (type) {
                case TYPE.MESSAGE:
                    return <MessageRow {...PROPS} />;
                case TYPE.CHAT:
                    return <ChatRow {...PROPS} />;
                case TYPE.MEMBER:
                    return <MemberRow {...PROPS} contact={M.u[data]} />;
                default:
                    return (
                        <div className={RESULT_ROW_CLASS}>
                            {children}
                        </div>
                    );
            }
        }

        return <NilRow onSearchMessages={onSearchMessages} isFirstQuery={isFirstQuery} />;
    }
}
