import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import { Navigation } from './navigation.jsx';
import Actions from './actions.jsx';
import { Chats, Meetings, Archived } from './conversationsList.jsx';

export const NAMESPACE = 'lhp';

export const FILTER = {
    MUTED: 'muted',
    UNREAD: 'unread'
};

export default class LeftPanel extends MegaRenderMixin {
    state =  {
        updated: 0,
        archived: false,
        archivedUnmounting: false,
        filter: '',
        unreadChats: 0,
        unreadMeetings: 0,
        contactRequests: 0
    };

    constructor(props) {
        super(props);
        this.doUpdate = this.doUpdate.bind(this);
        this.state.contactRequests = Object.keys(M.ipc).length;
    }

    customIsEventuallyVisible() {
        return M.chat;
    }

    doUpdate() {
        return (
            this.isComponentVisible() &&
            document.visibilityState === 'visible' &&
            this.setState(state => ({ updated: ++state.updated }), () => this.safeForceUpdate())
        );
    }

    toggleFilter = (filter) => {
        this.setState(state => ({ filter: state.filter === filter ? '' : filter }), () => {
            Object.values(megaChat.$chatTreePanePs).map(({ ref }) => ref.reinitialise?.());
        });
    };

    renderLoading() {
        return (
            <>
                <span className="heading loading-sketch" />
                <ul className="conversations-pane loading-sketch">
                    {Array.from({ length: this.props.conversations.length }, (el, i) => {
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
            </>
        );
    }

    // --

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.backgroundUpdateInterval);
        megaChat.unbind(`onUnreadCountUpdate.${NAMESPACE}`);
        mBroadcaster.removeListener(this.contactRequestsListener);
        document.removeEventListener('visibilitychange', this.doUpdate);
    }

    componentDidMount() {
        super.componentDidMount();
        this.doUpdate();
        megaChat.rebind(
            `onUnreadCountUpdate.${NAMESPACE}`,
            (ev, { unreadChats, unreadMeetings }) => {
                this.setState({ unreadChats, unreadMeetings }, () => this.safeForceUpdate());
            }
        );
        this.contactRequestsListener = mBroadcaster.addListener('fmViewUpdate:ipc', () =>
            this.setState({ contactRequests: Object.keys(M.ipc).length })
        );
        this.backgroundUpdateInterval = setInterval(this.doUpdate, 6e4 * 10 /* 10 min */);
        document.addEventListener('visibilitychange', this.doUpdate);
    }

    render() {
        const {
            view,
            views,
            conversations,
            routingSection,
            leftPaneWidth,
            renderView,
            startMeeting,
            scheduleMeeting,
            createGroupChat
        } = this.props;
        const { CHATS, MEETINGS, LOADING } = views;

        return (
            <div
                className={`
                    fm-left-panel
                    chat-lp-body
                    ${NAMESPACE}-container
                    ${is_chatlink && 'hidden' || ''}
                    ${megaChat._joinDialogIsShown && 'hidden' || ''}
                `}
                {...(leftPaneWidth && { width: leftPaneWidth })}>
                <div className="left-pane-drag-handle"/>

                <SearchPanel/>

                <Navigation
                    view={view}
                    views={views}
                    routingSection={routingSection}
                    unreadChats={this.state.unreadChats}
                    unreadMeetings={this.state.unreadMeetings}
                    contactRequests={this.state.contactRequests}
                    renderView={view => this.setState({ filter: false }, () => renderView(view))}
                />

                <Actions
                    view={view}
                    views={views}
                    filter={this.state.filter}
                    routingSection={routingSection}
                    startMeeting={startMeeting}
                    scheduleMeeting={scheduleMeeting}
                    createGroupChat={createGroupChat}
                    onFilter={this.toggleFilter}
                />

                {this.state.archived &&
                    <Archived
                        conversations={conversations}
                        archivedUnmounting={this.state.archivedUnmounting}
                        onClose={() =>
                            this.setState({ archivedUnmounting: true }, () =>
                                tSleep(0.3).then(() =>
                                    this.setState({ archivedUnmounting: false, archived: false })
                                )
                            )
                        }
                    />
                }

                <div
                    className={`
                        ${NAMESPACE}-conversations
                        ${view === MEETINGS ? 'meetings-view' : ''}
                        ${view === CHATS ? 'chats-view' : ''}
                        conversations
                        content-panel
                        active
                    `}>
                    {view === LOADING ?
                        this.renderLoading() :
                        <>
                            {view === MEETINGS &&
                                <Meetings
                                    conversations={conversations}
                                    leftPaneWidth={leftPaneWidth}
                                />
                            }
                            {view === CHATS &&
                                <Chats
                                    conversations={conversations}
                                    filter={this.state.filter}
                                    onArchivedClicked={() => this.setState({ archived: true, filter: false })}
                                />
                            }
                        </>
                    }
                </div>
            </div>
        );
    }
}
