import React from 'react';
import { TYPE, LABEL } from './ResultContainer.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';

const Message = ({ result }) => {
    const userId = result.data.userId;
    return (
        <div
            className="result-table-row message"
            onClick={() => loadSubPage(result.room.getRoomUrl())}>
            <span className="title">
                {nicknames.getNicknameAndName(userId)}
                <ContactPresence contact={M.u[userId]} />
            </span>
            <span className="summary">
                {result.text}
            </span>
            <span className="date">
                {time2date(result.data.delay)}
            </span>
        </div>
    );
};

const Chat = ({ result }) => (
    <div
        className="result-table-row"
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
        <div className="user-info">
            {result.room.topic}
        </div>
        <div className="clear"></div>
    </div>
);

const Member = ({ result }) => {
    const contact = M.u[result.data];
    return (
        <div
            className="result-table-row"
            onClick={() => loadSubPage(result.room.getRoomUrl())}>
            <Avatar contact={contact} />
            <div className="user-info">
                {nicknames.getNicknameAndName(result.data)}
                <ContactPresence contact={contact} />
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Nil = () => (
    <div className="result-table-row nil">
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
                <div className="result-table-row">
                    {children}
                </div>
            );
    }
};
