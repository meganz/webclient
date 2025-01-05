import React from 'react';
import { MegaRenderMixin, compose } from '../../mixins.js';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import { Navigation } from './navigation.jsx';
import Actions from './actions.jsx';
import { Chats, Meetings, Archived } from './conversationsList.jsx';
import { withUpdateObserver } from '../updateObserver.jsx';

export const NAMESPACE = 'lhp';

export const FILTER = {
    MUTED: 'muted',
    UNREAD: 'unread'
};

class LeftPanel extends MegaRenderMixin {
    domRef = React.createRef();

    contactRequestsListener = undefined;
    fmConfigLeftPaneListener = undefined;

    state =  {
        leftPaneWidth: Math.min(mega.config.get('leftPaneWidth') | 0, 400) || 384,
        archived: false,
        archivedUnmounting: false,
        filter: '',
        unreadChats: 0,
        unreadMeetings: 0,
        contactRequests: 0
    };

    constructor(props) {
        super(props);
        this.state.contactRequests = Object.keys(M.ipc).length;
    }

    customIsEventuallyVisible() {
        return M.chat;
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
        megaChat.unbind(`onUnreadCountUpdate.${NAMESPACE}`);
        mBroadcaster.removeListener(this.contactRequestsListener);
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
    }

    componentDidMount() {
        super.componentDidMount();

        megaChat.rebind(
            `onUnreadCountUpdate.${NAMESPACE}`,
            (ev, { unreadChats, unreadMeetings }) => {
                this.setState({ unreadChats, unreadMeetings }, () => this.safeForceUpdate());
            }
        );

        this.contactRequestsListener = mBroadcaster.addListener(
            'fmViewUpdate:ipc',
            () => this.setState({ contactRequests: Object.keys(M.ipc).length })
        );

        $.leftPaneResizableChat = new FMResizablePane(this.domRef.current, { ...$.leftPaneResizable?.options });

        this.fmConfigLeftPaneListener = mBroadcaster.addListener(
            'fmconfig:leftPaneWidth',
            value => this.setState(state => ({ leftPaneWidth: value || state.leftPaneWidth }))
        );
    }

    render() {
        const {
            view,
            views,
            conversations,
            routingSection,
            renderView,
            startMeeting,
            scheduleMeeting,
            createNewChat
        } = this.props;
        const { CHATS, MEETINGS, LOADING } = views;

        return (
            <div
                ref={this.domRef}
                className={`
                    fm-left-panel
                    chat-lp-body
                    ${NAMESPACE}-container
                    ${is_chatlink && 'hidden' || ''}
                    ${megaChat._joinDialogIsShown && 'hidden' || ''}
                `}
                {...(this.state.leftPaneWidth && { width: this.state.leftPaneWidth })}>
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
                    createNewChat={createNewChat}
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
                                    leftPaneWidth={this.state.leftPaneWidth}
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

export default compose(withUpdateObserver)(LeftPanel);
