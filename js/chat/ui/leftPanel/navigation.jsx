import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Button } from '../../../ui/buttons.jsx';
import LeftPanel from './leftPanel.jsx';

export default class Navigation extends MegaRenderMixin {
    state = {
        unreadChats: 0,
        unreadMeetings: 0,
        contactRequests: 0
    };

    constructor(props) {
        super(props);
        this.state.contactRequests = Object.keys(M.ipc).length;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        megaChat.unbind(`onUnreadCountUpdate.${LeftPanel.NAMESPACE}`);
        if (this.contactRequestsListener) {
            mBroadcaster.removeListener(this.contactRequestsListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();

        megaChat.rebind(`onUnreadCountUpdate.${LeftPanel.NAMESPACE}`, (ev, notifications) => {
            this.setState({ unreadChats: notifications.chats, unreadMeetings: notifications.meetings });
        });

        this.contactRequestsListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => {
            this.setState({ contactRequests: Object.keys(M.ipc).length });
        });
    }

    render() {
        const { view, views, routingSection, renderView } = this.props;
        const { CHATS, MEETINGS } = views;
        const { unreadChats, unreadMeetings, contactRequests } = this.state;

        return (
            <div className={`${LeftPanel.NAMESPACE}-nav`}>
                <div
                    className={`
                        ${LeftPanel.NAMESPACE}-nav-container
                        ${LeftPanel.NAMESPACE}-chats-tab
                        ${view === CHATS && routingSection === 'chat' ? 'active' : ''}
                    `}
                    onClick={() => renderView(CHATS)}>
                    <Button
                        unreadChats={unreadChats}
                        className={`${LeftPanel.NAMESPACE}-nav-button`}
                        icon="sprite-fm-mono icon-chat-filled">
                        {!!unreadChats && (
                            <div className="notifications-count">
                                <span>{unreadChats > 9 ? '9+' : unreadChats}</span>
                            </div>
                        )}
                    </Button>
                    <span>{l.chats /* `Chats` */}</span>
                </div>
                <div
                    className={`
                        ${LeftPanel.NAMESPACE}-nav-container
                        ${LeftPanel.NAMESPACE}-meetings-tab
                        ${view === MEETINGS && routingSection === 'chat' ? 'active' : ''}
                    `}
                    onClick={() => renderView(MEETINGS)}>
                    <Button
                        unreadMeetings={unreadMeetings}
                        className={`${LeftPanel.NAMESPACE}-nav-button`}
                        icon="sprite-fm-mono icon-video-call-filled">
                        {!!unreadMeetings && (
                            <div className="notifications-count">
                                <span>{unreadMeetings > 9 ? '9+' : unreadMeetings}</span>
                            </div>
                        )}
                    </Button>
                    <span>{l.meetings /* `Meetings` */}</span>
                </div>
                {is_eplusplus || is_chatlink ? null : (
                    <div
                        className={`
                            ${LeftPanel.NAMESPACE}-nav-container
                            ${LeftPanel.NAMESPACE}-contacts-tab
                            ${routingSection === 'contacts' ? 'active' : ''}
                        `}
                        onClick={() => loadSubPage('fm/chat/contacts')}>
                        <Button
                            className={`${LeftPanel.NAMESPACE}-nav-button`}
                            contactRequests={contactRequests}
                            icon="sprite-fm-mono icon-contacts">
                            {!!contactRequests && (
                                <div className="notifications-count">
                                    <span>{contactRequests}</span>
                                </div>
                            )}
                        </Button>
                        <span>{l[165] /* `Contacts` */}</span>
                    </div>
                )}
            </div>
        );
    }
}
