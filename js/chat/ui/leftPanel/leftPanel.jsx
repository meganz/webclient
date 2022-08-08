import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import { Button } from '../../../ui/buttons.jsx';
import ContactsPanel from '../contactsPanel/contactsPanel.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import { DropdownContactsSelector } from '../../../ui/dropdowns.jsx';
import { ConversationsList } from '../conversations.jsx';

export default class LeftPanel extends MegaRenderMixin {
    NAMESPACE = 'lhp';
    IS_CHATLINK = is_eplusplus || is_chatlink;

    state = {
        unreadChats: 0,
        unreadMeetings: 0,
        receivedRequestsCount: 0
    };

    constructor(props) {
        super(props);
        this.state.receivedRequestsCount = Object.keys(M.ipc).length;
    }

    getArchivedCount() {
        const { view, views } = this.props;
        let count = 0;

        megaChat.chats.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }
            if (
                view === views.MEETINGS && chatRoom.isMeeting
                || view === views.CHATS && !chatRoom.isMeeting
            ) {
                count++;
            }
        });
        return count;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        megaChat.unbind(`onUnreadCountUpdate.${this.NAMESPACE}`);
        if (this.requestReceivedListener) {
            mBroadcaster.removeListener(this.requestReceivedListener);
        }
    }

    componentDidMount() {
        super.componentDidMount();

        megaChat.rebind(`onUnreadCountUpdate.${this.NAMESPACE}`, (ev, notifications) => {
            this.setState({ unreadChats: notifications.chats, unreadMeetings: notifications.meetings });
        });

        this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ receivedRequestsCount: Object.keys(M.ipc).length })
        );
    }

    renderNavigation() {
        const { view, views, renderView } = this.props;
        const { CHATS, MEETINGS } = views;
        const { unreadChats, unreadMeetings, receivedRequestsCount } = this.state;

        return (
            <div className={`${this.NAMESPACE}-nav`}>
                <div
                    className={`
                        ${this.NAMESPACE}-nav-container
                        ${view === CHATS && megaChat.routingSection === 'chat' ? 'active' : ''}
                    `}
                    onClick={() => renderView(CHATS)}>
                    <Button
                        unreadChats={unreadChats}
                        className={`${this.NAMESPACE}-nav-button`}
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
                        ${this.NAMESPACE}-nav-container
                        ${view === MEETINGS && megaChat.routingSection === 'chat' ? 'active' : ''}
                    `}
                    onClick={() => renderView(MEETINGS)}>
                    <Button
                        unreadMeetings={unreadMeetings}
                        className={`${this.NAMESPACE}-nav-button`}
                        icon="sprite-fm-mono icon-video-call-filled">
                        {!!unreadMeetings && (
                            <div className="notifications-count">
                                <span>{unreadMeetings > 9 ? '9+' : unreadMeetings}</span>
                            </div>
                        )}
                    </Button>
                    <span>{l.meetings /* `Meetings` */}</span>
                </div>
                {this.IS_CHATLINK ? null : (
                    <div
                        className={`
                            ${this.NAMESPACE}-nav-container
                            ${megaChat.routingSection === 'contacts' ? 'active' : ''}
                        `}
                        onClick={() => loadSubPage('fm/chat/contacts')}>
                        <Button
                            receivedRequestsCount={receivedRequestsCount}
                            className={`${this.NAMESPACE}-nav-button`}
                            icon="sprite-fm-mono icon-contacts">
                            {!!receivedRequestsCount && (
                                <div className="notifications-count">
                                    <span>{receivedRequestsCount}</span>
                                </div>
                            )}
                        </Button>
                        <span>{l[165] /* `Contacts` */}</span>
                    </div>
                )}
            </div>
        );
    }

    render() {
        const { view, views, conversations, leftPaneWidth, renderView, startMeeting, createGroupChat } = this.props;
        const { routingSection, _joinDialogIsShown } = megaChat;
        const { CHATS, MEETINGS, LOADING } = views;

        return (
            <div
                className={`
                    fm-left-panel
                    chat-lp-body
                    ${is_chatlink && 'hidden' || ''}
                    ${_joinDialogIsShown && 'hidden' || ''}
                `}
                {...(leftPaneWidth && { width: leftPaneWidth })}>
                <div className="left-pane-drag-handle" />
                <SearchPanel />
                {this.renderNavigation()}
                {this.IS_CHATLINK ? null : (
                    <div className={`${this.NAMESPACE}-action-buttons`}>
                        {view === LOADING && (
                            <Button
                                className="mega-button action loading-sketch">
                                <i />
                                <span />
                            </Button>
                        )}
                        {view === CHATS && routingSection !== 'contacts' && (
                            <Button
                                className="mega-button action"
                                icon="sprite-fm-mono icon-add-circle"
                                label={l.add_chat /* `New chat` */}>
                                <DropdownContactsSelector
                                    className={`
                                        main-start-chat-dropdown
                                        ${this.NAMESPACE}-contact-selector
                                    `}
                                    onSelectDone={selected => {
                                        if (selected.length === 1) {
                                            return megaChat.createAndShowPrivateRoom(selected[0])
                                                .then(room => room.setActive());
                                        }
                                        megaChat.createAndShowGroupRoomFor(selected);
                                    }}
                                    multiple={false}
                                    horizOffset={70}
                                    topButtons={[
                                        {
                                            key: 'newGroupChat',
                                            title: l[19483] /* `New group chat` */,
                                            icon: 'sprite-fm-mono icon-chat-filled',
                                            onClick: createGroupChat
                                        }
                                    ]}
                                    showAddContact={ContactsPanel.hasContacts()}
                                />
                            </Button>
                        )}
                        {view === MEETINGS && routingSection !== 'contacts' && (
                            <Button
                                className="mega-button action"
                                icon="sprite-fm-mono icon-add-circle"
                                label={l.new_meeting /* `New meeting` */}
                                onClick={startMeeting}
                            />
                        )}
                        {routingSection === 'contacts' && (
                            <Button
                                className="mega-button action"
                                icon="sprite-fm-mono icon-add-circle"
                                label={l[71] /* `Add contact` */}
                                onClick={() => contactAddDialog()}
                            />
                        )}
                    </div>
                )}
                <PerfectScrollbar
                    className="chat-lp-scroll-area"
                    conversations={conversations}
                    view={view}
                    ref={ref => {
                        megaChat.$chatTreePanePs = ref;
                    }}>
                    <div
                        className={`
                            content-panel
                            conversations
                            active
                        `}>
                        {view === MEETINGS && <span className="heading">{l.past_meetings}</span>}
                        {view === CHATS && <span className="heading">{l.contacts_and_groups}</span>}
                        {view === LOADING ?
                            <>
                                <span className="heading loading-sketch" />
                                <ul className="conversations-pane loading-sketch">
                                    {Array.from({ length: conversations.length }, (el, i) => {
                                        return (
                                            <li key={i}>
                                                <div className="conversation-avatar">
                                                    <div className="chat-topic-icon" />
                                                </div>
                                                <div className="conversation-data">
                                                    <div className="conversation-data-top" />
                                                    <div className="conversation-message-info">
                                                        <div className="conversation-message" />
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </> :
                            <ConversationsList
                                view={view}
                                views={views}
                                conversations={conversations}
                                onConversationClick={chatRoom => renderView(chatRoom.isMeeting ? MEETINGS : CHATS)}
                            />
                        }
                    </div>
                </PerfectScrollbar>
                {routingSection !== 'contacts' && (
                    <div
                        className={`
                            left-pane-button
                            archived
                            ${routingSection === 'archived' ? 'active' : ''}
                        `}
                        onClick={() => loadSubPage('fm/chat/archived')}>
                        <div className="heading">{l[19066] /* `Archived chats` */}</div>
                        <div className="indicator">{this.getArchivedCount()}</div>
                    </div>
                )}
            </div>
        );
    }
}
