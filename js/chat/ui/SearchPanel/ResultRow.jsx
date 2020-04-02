import React from 'react';
import { TYPE, LABEL } from './ResultContainer.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';

const ROW_CLASS = `result-table-row`;

// const highlight = (text, matches) => {
//     if (matches) {
//         let highlighted = [];
//         let textArray = text.split(' ');
//
//         for (let i = 0; i < textArray.length; i++) {
//             let word = textArray[i];
//
//             for (let j = 0; j < matches.length; j++) {
//                 const match = matches[j].str;
//                 if (word === match) {
//                     word = `<strong>${word}</strong>`;
//                 }
//             }
//
//             highlighted = [...highlighted, word];
//         }
//
//         return highlighted.join(' ');
//     }
//
//     return text;
// };

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
            className={`${ROW_CLASS} message`}
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
            className={ROW_CLASS}
            onClick={() => loadSubPage(result.room.getRoomUrl())}>
            {/* TODO: add static DOM re: group chats avatar */}
            <div style={{
                float: 'left',
                width: 36,
                height: 36,
                borderRadius: 200,
                border: '3px solid #FFF',
                background: 'tomato' }}>
            </div>
            <div
                className="user-info"
                dangerouslySetInnerHTML={{ __html: highlight(result.room.topic, result.matches) }}>
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Member = ({ result }) => {
    const contact = M.u[result.data];
    return (
        <div
            className={ROW_CLASS}
            onClick={() => loadSubPage(result.room.getRoomUrl())}>
            <Avatar contact={contact} />
            <div className="user-info">
                <span dangerouslySetInnerHTML={{
                    __html: highlight(nicknames.getNicknameAndName(result.data), result.matches)
                }}>
                </span>
                <ContactPresence contact={contact} />
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Nil = () => (
    <div className={`${ROW_CLASS} nil`}>
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
                <div className={ROW_CLASS}>
                    {children}
                </div>
            );
    }
};
