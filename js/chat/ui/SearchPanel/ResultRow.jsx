import React from 'react';
import { TYPE, LABEL } from './ResultContainer.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';

const Message = ({ result }) => (
    <div
        className="result-table-row"
        onClick={() => loadSubPage(result.room.getRoomUrl())}>
        <span className="title">
            {M.u[result.data.userId].name}
        </span>
        <span className="summary">
            {result.text}
        </span>
        <span className="date">
            {time2date(result.data.delay)}
        </span>
    </div>
);

const Chat = ({ result }) => (
    <div
        className="result-table-row"
        onClick={() => loadSubPage(result.room.getRoomUrl())}>
        <Avatar contact={result.room} />
        {result.room.topic}
        <div className="clear"></div>
    </div>
);

const Member = ({ result }) => {
    const { data, room } = result;
    const contact = data ? M.u[data] : result;

    return (
        <div
            className="result-table-row"
            onClick={() => room && loadSubPage(room.getRoomUrl())}>
            <Avatar contact={contact} />
            <div className="user-info">
                {contact.name}
                <ContactPresence contact={contact} />
            </div>
            <div className="clear"></div>
        </div>
    );
};

const Nil = () => (
    <div className="result-table-row">
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
