import React from 'react';
import { TYPE, LABEL } from './resultContainer.jsx';
import { Avatar, ContactPresence, LastActivity, MembersAmount } from '../contacts.jsx';
import { MegaRenderMixin } from '../../../stores/mixins';
import { EmojiFormattedContent } from './../../../ui/utils.jsx';

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
 * highlight
 * @description Wraps given text within `strong` element based on passed strings to be matched.
 * @param {string} text The text to be highlighted
 * @param {Object[]} matches Array of objects specifying the matches
 * @param {string} matches[].str The match term to check against
 * @param {number} matches[].idx Number identifier for the match term
 * @returns {string}
 *
 * @example
 * highlight('Example MEGA string as input.', [{ idx: 0, str: 'MEGA' }, { idx: 1, str: 'input' }]);
 * => 'Example <strong>MEGA</strong> string as <strong>input</strong>.'
 */

const highlight = (text, matches, dontEscape) => {
    text = dontEscape ? text : escapeHTML(text);
    if (matches) {
        let highlighted = text;
        for (let i = matches.length; i--;) {
            const match = matches[i].str;
            highlighted = highlighted.replace(new RegExp(match, 'gi'), word => `<strong>${word}</strong>`);
        }
        return highlighted;
    }
    return text;
};

/**
 * openResult
 * @description Invoked on result click, opens the respective chat room; triggers the `resultOpen` event to notify
 * the root component for the interaction and do minimize.
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
    else if (room && room.chatId) {
        // contact matches
        loadSubPage('fm/chat/p/' + room.chatId);
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
// TODO: add documentation
// ---------------------------------------------------------------------------------------------------------------------

class MessageRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { data, matches, room, contact, index } = this.props;
        const summary = data.renderableSummary || room.messagesBuff.getRenderableSummary(data);

        return (
            <div
                className={`${SEARCH_ROW_CLASS} message`}
                onClick={() => openResult(room, data.messageId, index)}>
                <span className="title">
                    <EmojiFormattedContent>{room.getRoomTitle()}</EmojiFormattedContent>
                </span>
                {!roomIsGroup(room) && <ContactPresence contact={contact} />}
                <div
                    className="summary"
                    dangerouslySetInnerHTML={{ __html: highlight(
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
// TODO: add documentation
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
                        <span dangerouslySetInnerHTML={{ __html: highlight(
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
// TODO: add documentation
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
                            __html: highlight(
                                megaChat.plugins.emoticonsFilter.processHtmlMessage(
                                    htmlentities(room.topic || room.getRoomTitle())
                                ),
                                matches,
                                true
                            )
                        }} /> :
                        <>
                            <span dangerouslySetInnerHTML={{
                                __html: highlight(
                                    megaChat.plugins.emoticonsFilter.processHtmlMessage(
                                        htmlentities(nicknames.getNicknameAndName(data))
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
                            <EmojiFormattedContent>{nicknames.getNicknameAndName(data)}</EmojiFormattedContent>
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
                {isGroup ? <div className="group-chat" /> : <Avatar contact={contact}/>}
                <div className={USER_CARD_CLASS}>
                    {userCard[hasHighlight ? 'graphic' : 'textual']}
                </div>
                <div className="clear"/>
            </div>
        );
    }
}

const NilRow = () => (
    <div className={SEARCH_ROW_CLASS}>
        <img src={`${staticpath}images/temp/search-icon.png`} alt={LABEL.NO_RESULTS} />
        <span>{LABEL.NO_RESULTS}</span>
    </div>
);

// ---------------------------------------------------------------------------------------------------------------------

export default class ResultRow extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    render() {
        const { type, result, children } = this.props;

        switch (type) {
            case TYPE.MESSAGE:
                return (
                    <MessageRow
                        data={result.data}
                        index={result.index}
                        matches={result.matches}
                        room={result.room}
                        contact={M.u[result.data.userId]} />
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
                return <NilRow />;
            default:
                return (
                    <div className={SEARCH_ROW_CLASS}>
                        {children}
                    </div>
                );
        }
    }
}
