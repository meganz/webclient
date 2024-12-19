import React from 'react';
import Invite, { HAS_CONTACTS } from './invite.jsx';

const Nil = () => {
    return (
        <div className={`${Invite.NAMESPACE}-nil`}>
            <div className="fm-empty-contacts-bg" />
            <h2>{HAS_CONTACTS() ? l[8674] /* `No Results` */ : l[784] /* `No Contacts` */}</h2>
        </div>
    );
};

export default Nil;
