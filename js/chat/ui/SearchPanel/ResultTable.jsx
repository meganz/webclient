import React from 'react';
import { Avatar, ContactPresence } from '../contacts.jsx';

export const ResultTable = ({ heading, recent, results }) => {
    if (recent && recent.length) {
        return (
            <div className="result-table">
                <div className="result-table-heading">{heading}</div>
                {recent.map(contact =>
                    <div key={contact.h} className="result-table-row">
                        <Avatar contact={contact}/>
                        <div className="user-info">
                            {contact.name}
                            <ContactPresence contact={contact}/>
                        </div>
                        <div className="clear"></div>
                    </div>
                )}
            </div>
        );
    }

    if (results && results.length) {
        return (
            <>
                <div className="result-table nil">
                    <div className="result-table-heading">Contacts and chats</div>
                    <div className="result-table-row">
                        <img src={`${staticpath}images/temp/search-icon.png`} alt="No Results"/>
                        <span>No Results</span>
                    </div>
                </div>

                <div className="result-table messages">
                    <div className="result-table-heading">Messages</div>
                    <div className="result-table-row">
                        <span className="title">Result</span>
                        <span className="summary">
                            Did you see my <b>son</b>?
                        </span>
                        <span className="date">March 2</span>
                    </div>
                    <div className="result-table-row">
                        <span className="title">Result</span>
                        <span className="summary">
                            Ja<b>son</b> Voorhees is the main character
                        </span>
                        <span className="date">February 3</span>
                    </div>
                    <div className="result-table-row">
                        <span className="title">Result</span>
                        <span className="summary">
                            MEGA.j<b>son</b>
                        </span>
                        <span className="date">February 1</span>
                    </div>
                    <div className="result-table-row">
                        <span className="title">Result</span>
                        <span className="summary">
                            Ja<b>son</b> Bourne VII started production
                        </span>
                        <span className="date">January 19</span>
                    </div>
                </div>
            </>
        );
    }
};
