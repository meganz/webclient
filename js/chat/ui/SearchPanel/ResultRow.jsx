import React from 'react';
import { TYPE, LABEL } from './ResultContainer.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';
import { LastActivity } from '../contacts.jsx';

const SEARCH_ROW_CLASS = `result-table-row`;
const USER_CARD_CLASS = `user-card`;

const roomIsGroup = room => room && room.type === 'group' || room.type === 'public';

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

// ---------------------------------------------------------------------------------------------------------------------

const Message = ({ result }) => {
    const { data, text, matches, room } = result;
    const summary = data.hasAttachments() ? data.getAttachmentMeta()[0].name : text;

    return (
        <div
            className={`${SEARCH_ROW_CLASS} message`}
            onClick={() => loadSubPage(room.getRoomUrl())}>
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

const Chat = ({ result }) => {
    return (
        <div
            className={SEARCH_ROW_CLASS}
            onClick={() => loadSubPage(result.room.getRoomUrl())}>
            {/* TODO: add static DOM re: group chats avatar */}
            <div style={{
                float: 'left',
                width: 30,
                height: 30,
                borderRadius: 200,
                border: '3px solid #FFF',
                background: 'cornflowerblue' }}>
            </div>
            <div
                className={USER_CARD_CLASS}
                dangerouslySetInnerHTML={{ __html: highlight(result.room.topic, result.matches) }}>
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Member = ({
    result: {
        data, matches, room
    }
}) => {
    const contact = M.u[data];
    const hasHighlight = matches && !!matches.length;
    const isGroup = roomIsGroup(room);
    // [...] TODO: refactor -- conditionals/rendering, abstract the amount of members, cut longer text
    const userCard = {
        graphic: (
            // `Graphic` result of member type -- the last activity status is shown as graphic icon
            // https://mega.nz/file/0MMymIDZ#_uglL1oUSJnH-bkp4IWfNL_hk6iEsQW77GHYXEvHWOs
            <div className="graphic">
                {isGroup ?
                    room.getRoomTitle() :
                    <span dangerouslySetInnerHTML={{
                        __html: highlight(nicknames.getNicknameAndName(data), matches)
                    }}>
                    </span>
                }
                {isGroup ? '' : <ContactPresence contact={contact} />}
            </div>
        ),
        textual: (
            // `Textual` result of member type -- last activity as plain text
            // https://mega.nz/file/RcUWiKpC#onYjToPq3whTYyMseLal5v0OxiAge0j2p9I5eO_qwoI
            <div className="textual">
                <span>{isGroup ? room.getRoomTitle() : nicknames.getNicknameAndName(data)}</span>
                {isGroup ?
                    (l[20233] || "%s Members").replace("%s", Object.keys(room.members).length) :
                    <LastActivity contact={contact} showLastGreen={true} />
                }
            </div>
        )
    };

    return (
        <div
            className={SEARCH_ROW_CLASS}
            onClick={() => loadSubPage(room.getRoomUrl())}>
            {isGroup ? (
                <div style={{
                    float: 'left',
                    width: 30,
                    height: 30,
                    borderRadius: 200,
                    border: '3px solid #FFF',
                    background: 'cornflowerblue' }}>
                </div>
            ) : (
                <Avatar contact={contact} />
            )}
            <div className={USER_CARD_CLASS}>
                {userCard[hasHighlight ? 'graphic' : 'textual']}
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Nil = () => (
    <div className={`${SEARCH_ROW_CLASS} nil`}>
        <img src={`${staticpath}images/temp/search-icon.png`} alt={LABEL.NO_RESULTS} />
        <span>{LABEL.NO_RESULTS}</span>
    </div>
);

// ---------------------------------------------------------------------------------------------------------------------

export const ResultRow = ({ type, result, children }) => {
    switch (type) {
        case TYPE.MESSAGE:
            return <Message result={result} />;
        case TYPE.CHAT:
            return <Chat result={result} />;
        case TYPE.MEMBER:
            return <Member result={result} />;
        case TYPE.NIL:
            return <Nil />;
        default:
            return (
                <div className={SEARCH_ROW_CLASS}>
                    {children}
                </div>
            );
    }
};
