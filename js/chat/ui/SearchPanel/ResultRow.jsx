import React from 'react';
import { TYPE, LABEL } from './ResultContainer.jsx';
import { STATUS } from './SearchPanel.jsx';
import { Avatar, ContactPresence, LastActivity, MembersAmount } from '../contacts.jsx';

const SEARCH_ROW_CLASS = `result-table-row`;
const USER_CARD_CLASS = `user-card`;

/**
 * TODO: validate the correctness of this check --  valid way to check for group chats?
 *
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

const highlight = (text, matches) => {
    if (matches) {
        let highlighted;
        for (let i = matches.length; i--;) {
            const match = matches[i].str;
            highlighted = text.replace(new RegExp(match, 'gi'), word => `<strong>${word}</strong>`);
        }
        return highlighted;
    }
    return text;
};

/**
 * getTruncatedMemberNames
 * @description Returns comma-separated string of truncated member names based on passed room; allows to specify the
 * maximum amount of members to be retrieved, as well the desired maximum length for the truncation.
 * @param {ChatRoom} room
 * @param {number} maxMembers The maximum amount of members to be retrieved
 * @param {number} maxLength The maximum length of characters for the truncation
 * @returns {string}
 */

const getTruncatedMemberNames = (room, maxMembers = 0, maxLength = 20) => {
    let truncatedMemberNames = [];

    const members =  Object.keys(room.members);
    for (let i = 0; i < members.slice(0, maxMembers || members.length).length; i++) {
        const handle = members[i];
        const name = M.getNameByHandle(handle);

        if (!handle || !name) {
            continue;
        }

        truncatedMemberNames = [
            ...truncatedMemberNames,
            name.length > maxLength ? `${name.substr(0, maxLength)}...` : name
        ];
    }

    return truncatedMemberNames.join(', ');
};

/**
 * getTruncatedRoomTopic
 * @description Returns truncated room topic based on the passed maximum character length.
 * @param {ChatRoom} room
 * @param {number} maxLength The maximum length of characters for the truncation
 * @returns {string}
 */

const getTruncatedRoomTopic = (room, maxLength = 20) => (
    room.topic && room.topic.length > maxLength ? `${room.topic.substr(0, maxLength)}...` : room.topic
);

/**
 * openResult
 * @description Invoked on result click, opens the respective chat room; triggers the `resultOpen` event to notify
 * the root component for the interaction and do minimize.
 * @see SearchPanel.bindEvents()
 * @param {ChatRoom} room
 */

const openResult = room => {
    $(document).trigger('chatSearchResultOpen');
    loadSubPage(room.getRoomUrl());
};

// TODO: temp -- when assets are available, add static DOM re: group chats avatar
const GroupAvatar__temp = () => (
    <div
        style={{
            float: 'left',
            width: 30,
            height: 30,
            borderRadius: 200,
            border: '3px solid #FFF',
            background: 'cornflowerblue'
        }}
    />
);

//
// Message
// TODO: add documentation
// ---------------------------------------------------------------------------------------------------------------------

const Message = ({ result }) => {
    const { data, text, matches, room } = result;
    const summary = data.hasAttachments() ? data.getAttachmentMeta()[0].name : text;

    return (
        <div
            className={`${SEARCH_ROW_CLASS} message`}
            onClick={() => openResult(room)}>
            <span className="title">
                {nicknames.getNicknameAndName(data.userId)}
                <ContactPresence contact={M.u[data.userId]} />
            </span>
            <div
                className="summary"
                dangerouslySetInnerHTML={{ __html: highlight(summary, matches) }}>
            </div>
            <span className="date">
                {time2date(data.delay)}
            </span>
        </div>
    );
};

//
// Chat
// TODO: add documentation
// ---------------------------------------------------------------------------------------------------------------------

const Chat = ({ result }) => {
    return (
        <div
            className={SEARCH_ROW_CLASS}
            onClick={() => openResult(result.room)}>
            <GroupAvatar__temp />
            <div
                className={USER_CARD_CLASS}
                dangerouslySetInnerHTML={{ __html: highlight(result.room.topic, result.matches) }}>
            </div>
            <div className="clear" />
        </div>
    );
};

//
// Member
// TODO: add documentation
// ---------------------------------------------------------------------------------------------------------------------

const Member = ({
    result: {
        data, matches, room
    }
}) => {
    const contact = M.u[data];
    const hasHighlight = matches && !!matches.length;
    const isGroup = roomIsGroup(room);
    const userCard = {
        graphic: (
            // `Graphic` result of member type -- the last activity status is shown as graphic icon
            // https://mega.nz/file/0MMymIDZ#_uglL1oUSJnH-bkp4IWfNL_hk6iEsQW77GHYXEvHWOs
            <div className="graphic">
                {isGroup ?
                    <span dangerouslySetInnerHTML={{
                        __html: highlight(room.topic || room.getRoomTitle(), matches) }}
                    /> :
                    <>
                        <span dangerouslySetInnerHTML={{
                            __html: highlight(nicknames.getNicknameAndName(data), matches)
                        }} />
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
                        <span>{room.topic || room.getRoomTitle()}</span>
                        <MembersAmount room={room} />
                    </> :
                    <>
                        <span>{nicknames.getNicknameAndName(data)}</span>
                        <LastActivity contact={contact} showLastGreen={true} />
                    </>
                }
            </div>
        )
    };

    return (
        <div
            className={SEARCH_ROW_CLASS}
            onClick={() => openResult(room)}>
            {isGroup ? <GroupAvatar__temp /> : <Avatar contact={contact} />}
            <div className={USER_CARD_CLASS}>
                {userCard[hasHighlight ? 'graphic' : 'textual']}
            </div>
            <div className="clear" />
        </div>
    );
};

//
// Nil
// TODO: add documentation
// ---------------------------------------------------------------------------------------------------------------------

const Nil = () => (
    <div className={`${SEARCH_ROW_CLASS} nil`}>
        <img src={`${staticpath}images/temp/search-icon.png`} alt={LABEL.NO_RESULTS} />
        <span>{LABEL.NO_RESULTS}</span>
    </div>
);

// ---------------------------------------------------------------------------------------------------------------------

export const ResultRow = ({ type, result, status, children }) => {
    switch (type) {
        case TYPE.MESSAGE:
            return <Message result={result} />;
        case TYPE.CHAT:
            return <Chat result={result} />;
        case TYPE.MEMBER:
            return <Member result={result} />;
        case TYPE.NIL:
            return status === STATUS.COMPLETED && <Nil />;
        default:
            return (
                <div className={SEARCH_ROW_CLASS}>
                    {children}
                </div>
            );
    }
};
