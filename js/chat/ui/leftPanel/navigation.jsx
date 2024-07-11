import React from 'react';
import { Button } from '../../../ui/buttons.jsx';
import { NAMESPACE } from './leftPanel.jsx';

export const Navigation =
    ({ view, views: { CHATS, MEETINGS }, routingSection, unreadChats, unreadMeetings, contactRequests, renderView }) =>
        <div className={`${NAMESPACE}-nav`}>
            <div
                className={`
                    ${NAMESPACE}-nav-container
                    ${NAMESPACE}-chats-tab
                    ${view === CHATS && routingSection === 'chat' ? 'active' : ''}
                `}
                onClick={() => {
                    renderView(CHATS);
                    eventlog(500233);
                }}>
                <Button
                    unreadChats={unreadChats}
                    className={`${NAMESPACE}-nav-button`}
                    icon="sprite-fm-mono icon-chat-filled">
                    {!!unreadChats && <div className="notifications-count"/>}
                </Button>
                <span>{l.chats /* `Chats` */}</span>
            </div>
            <div
                className={`
                    ${NAMESPACE}-nav-container
                    ${NAMESPACE}-meetings-tab
                    ${view === MEETINGS && routingSection === 'chat' ? 'active' : ''}
                `}
                onClick={() => {
                    renderView(MEETINGS);
                    eventlog(500234);
                }}>
                <Button
                    unreadMeetings={unreadMeetings}
                    className={`${NAMESPACE}-nav-button`}
                    icon="sprite-fm-mono icon-video-call-filled">
                    {!!unreadMeetings && <div className="notifications-count"/>}
                </Button>
                <span>{l.meetings /* `Meetings` */}</span>
            </div>
            {is_eplusplus || is_chatlink ?
                null :
                <div
                    className={`
                        ${NAMESPACE}-nav-container
                        ${NAMESPACE}-contacts-tab
                        ${routingSection === 'contacts' ? 'active' : ''}
                    `}
                    onClick={() => {
                        loadSubPage('fm/chat/contacts');
                        eventlog(500296);
                    }}>
                    <Button
                        className={`${NAMESPACE}-nav-button`}
                        contactRequests={contactRequests}
                        icon="sprite-fm-mono icon-contacts">
                        {!!contactRequests && <div className="notifications-count"/>}
                    </Button>
                    <span>{l[165] /* `Contacts` */}</span>
                </div>
            }
        </div>;
