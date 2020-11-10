import React from 'react';
import { TYPE, LABEL } from './resultContainer.jsx';
import { Avatar, ContactPresence, LastActivity, MembersAmount } from '../contacts.jsx';
import { MegaRenderMixin } from '../../../stores/mixins';
import { EmojiFormattedContent } from '../../../ui/utils.jsx';
import { ContactAwareName } from '../contacts.jsx';

const SEARCH_ROW_CLASS = `result-table-row`;
const USER_CARD_CLASS = `user-card`;

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
 */

const openResult = (room, messageId, index) => {
    $(document).trigger('chatSearchResultOpen');

    if (isString(room)) {
        loadSubPage('fm/chat/p/' + room);
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
};

//
// MessageRow
// ---------------------------------------------------------------------------------------------------------------------

class MessageRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { data, matches, room, index } = this.props;
        const contact = room.getParticipantsExceptMe();
        const summary = data.renderableSummary || room.messagesBuff.getRenderableSummary(data);

        return (
            <div
                className={`${SEARCH_ROW_CLASS} message`}
                onClick={() => openResult(room, data.messageId, index)}>
                <span className="title">
                    <ContactAwareName contact={M.u[contact]}>
                        <EmojiFormattedContent>
                            {room.getRoomTitle()}
                        </EmojiFormattedContent>
                    </ContactAwareName>
                </span>
                {!roomIsGroup(room) && <ContactPresence contact={M.u[contact]} />}
                <div
                    className="summary"
                    dangerouslySetInnerHTML={{ __html: megaChat.highlight(
                        summary,
                        matches,
                        true /* already escaped by `getRenderableSummary` */
                    ) }}>
                </div>
                <span className="date">
                    {time2date(data.delay)}
                </span>
            </div>
        );
    }
}

//
// ChatRow
// ---------------------------------------------------------------------------------------------------------------------

class ChatRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { room, matches } = this.props;

        return (
            <div
                className={SEARCH_ROW_CLASS}
                onClick={() => openResult(room)}>
                <div className="chat-topic-icon" />
                <div className={USER_CARD_CLASS}>
                    <div className="graphic">
                        <span dangerouslySetInnerHTML={{ __html: megaChat.highlight(
                            megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(room.topic)),
                            matches,
                            true
                        ) }} />
                    </div>
                </div>
                <div className="clear" />
            </div>
        );
    }
}

//
// MemberRow
// ---------------------------------------------------------------------------------------------------------------------

class MemberRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { data, matches, room, contact } = this.props;
        const hasHighlight = matches && !!matches.length;
        const isGroup = room && roomIsGroup(room);
        const userCard = {
            graphic: (
                // `Graphic` result of member type -- the last activity status is shown as graphic icon
                // https://mega.nz/file/0MMymIDZ#_uglL1oUSJnH-bkp4IWfNL_hk6iEsQW77GHYXEvHWOs
                <div className="graphic">
                    {isGroup ?
                        <span dangerouslySetInnerHTML={{
                            __html: megaChat.highlight(
                                megaChat.plugins.emoticonsFilter.processHtmlMessage(
                                    htmlentities(room.topic || room.getRoomTitle())
                                ),
                                matches,
                                true
                            )
                        }} /> :
                        <>
                            <span dangerouslySetInnerHTML={{
                                __html: megaChat.highlight(
                                    megaChat.plugins.emoticonsFilter.processHtmlMessage(
                                        htmlentities(nicknames.getNickname(data))
                                    ),
                                    matches,
                                    true
                                )
                            }}/>
                            <ContactPresence contact={contact} />
                        </>
                    }
                </div>
            ),
            textual: (
                // `Textual` result of member type -- last activity as plain text
                // https://mega.nz/file/RcUWiKpC#onYjToPq3whTYyMseLal5v0OxiAge0j2p9I5eO_qwoI
                <div className="textual">
                    {isGroup ?
                        <>
                            <span>
                                <EmojiFormattedContent>{room.topic || room.getRoomTitle()}</EmojiFormattedContent>
                            </span>
                            <MembersAmount room={room} />
                        </> :
                        <>
                            <EmojiFormattedContent>{nicknames.getNickname(data)}</EmojiFormattedContent>
                            <LastActivity contact={contact} showLastGreen={true} />
                        </>
                    }
                </div>
            )
        };

        return (
            <div
                className={SEARCH_ROW_CLASS}
                onClick={() => openResult(room ? room : contact.h)}>
                {isGroup ? <div className="chat-topic-icon" /> : <Avatar contact={contact}/>}
                <div className={USER_CARD_CLASS}>
                    {userCard[hasHighlight ? 'graphic' : 'textual']}
                </div>
                <div className="clear"/>
            </div>
        );
    }
}

const NilRow = ({ onSearchMessages, isFirstQuery }) => (
    <div className={SEARCH_ROW_CLASS}>
        <div className="nil-container">
            <img src={`${staticpath}images/temp/search-icon.png`} alt={LABEL.NO_RESULTS} />
            <span>{LABEL.NO_RESULTS}</span>
            {isFirstQuery && (
                <div
                    className="search-messages"
                    onClick={onSearchMessages}
                    dangerouslySetInnerHTML={{
                        /* `Click <a>here</a> to search for messages.` */
                        __html: LABEL.SEARCH_MESSAGES_INLINE.replace('[A]', '<a>').replace('[/A]', '</a>')
                    }}>
                </div>
            )}
        </div>
    </div>
);

// ---------------------------------------------------------------------------------------------------------------------

export default class ResultRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { type, result, children, onSearchMessages, isFirstQuery } = this.props;

        switch (type) {
            case TYPE.MESSAGE:
                return (
                    <MessageRow
                        data={result.data}
                        index={result.index}
                        matches={result.matches}
                        room={result.room} />
                );
            case TYPE.CHAT:
                return <ChatRow room={result.room} matches={result.matches} />;
            case TYPE.MEMBER:
                return (
                    <MemberRow
                        data={result.data}
                        matches={result.matches}
                        room={result.room}
                        contact={M.u[result.data]} />
                );
            case TYPE.NIL:
                return <NilRow onSearchMessages={onSearchMessages} isFirstQuery={isFirstQuery} />;
            default:
                return (
                    <div className={SEARCH_ROW_CLASS}>
                        {children}
                    </div>
                );
        }
    }
}
