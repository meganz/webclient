import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import Navigation from './navigation.jsx';
import Actions from './actions.jsx';
import Button from '../meetings/button.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import ConversationsListItem from './conversationsListItem.jsx';

export const FILTER = {
    MUTED: 'muted',
    UNREAD: 'unread'
};

const CONVERSATION_TYPES = {
    UPCOMING: 'upcoming',
    PAST: 'past',
    ARCHIVED: 'archive'
};

export default class LeftPanel extends MegaRenderMixin {
    static NAMESPACE = 'lhp';

    state =  {
        updated: 0,
        archived: false,
        archivedUnmounting: false,
        filter: ''
    };

    constructor(props) {
        super(props);
        this.doUpdate = this.doUpdate.bind(this);
    }

    customIsEventuallyVisible() {
        return M.chat;
    }

    doUpdate() {
        return (
            this.isComponentVisible() &&
            document.visibilityState === 'visible' &&
            this.setState(state => ({ updated: ++state.updated }), () => this.forceUpdate())
        );
    }

    toggleFilter = (filter) => {
        this.setState(state => ({ filter: state.filter === filter ? '' : filter }), () => {
            Object.values(megaChat.$chatTreePanePs).map(({ ref }) => ref.reinitialise?.());
        });
    };

    renderConversationsList(conversations) {
        const { view, views } = this.props;

        return (
            <PerfectScrollbar
                className="chat-lp-scroll-area"
                didMount={(id, ref) => {
                    megaChat.$chatTreePanePs = [...megaChat.$chatTreePanePs, { id, ref }];
                }}
                willUnmount={id => {
                    megaChat.$chatTreePanePs = megaChat.$chatTreePanePs.filter(ref => ref.id !== id);
                }}
                conversations={conversations}>
                <ul
                    className={`
                        conversations-pane
                        ${view === views.MEETINGS ? '' : 'with-offset'}
                    `}>
                    {conversations.map(chatRoom => {
                        if (chatRoom.roomId) {
                            return (
                                <ConversationsListItem
                                    key={chatRoom.roomId}
                                    chatRoom={chatRoom}
                                    contact={M.u[chatRoom.getParticipantsExceptMe()[0]] || null}
                                    messages={chatRoom.messagesBuff}
                                    onConversationClick={() => loadSubPage(chatRoom.getRoomUrl(false))}
                                />
                            );
                        }
                        return null;
                    })}
                </ul>
            </PerfectScrollbar>
        );
    }

    renderArchived() {
        const { view, views } = this.props;
        const { NAMESPACE } = LeftPanel;
        const archivedConversations = this.getConversations(CONVERSATION_TYPES.ARCHIVED);

        return (
            <div
                className={`
                    ${NAMESPACE}-archived
                    ${this.state.archivedUnmounting ? 'is-unmounting' : ''}
                `}>
                <div className={`${NAMESPACE}-archived-head`}>
                    <Button
                        className="mega-button round"
                        icon="sprite-fm-mono icon-arrow-left-regular-outline"
                        onClick={() =>
                            this.setState({ archivedUnmounting: true }, () =>
                                setTimeout(() => this.setState({ archivedUnmounting: false, archived: false }), 300)
                            )
                        }
                    />
                    <h2>
                        {view === views.CHATS ? l.filter_archived__chats : ''}
                        {view === views.MEETINGS ? l.filter_archived__meetings : ''}
                    </h2>
                </div>
                <div className={`${NAMESPACE}-archived-content`}>
                    {archivedConversations && archivedConversations.length ?
                        this.renderConversationsList(archivedConversations) :
                        <div className={`${NAMESPACE}-archived-empty`}>
                            <i className="sprite-fm-mono icon-archive" />
                            <h3>
                                {view === views.CHATS ? l.filter_archived__nil_chats : ''}
                                {view === views.MEETINGS ? l.filter_archived__nil_meetings : ''}
                            </h3>
                        </div>
                    }
                </div>
            </div>
        );
    }

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

    renderChats() {
        const { NAMESPACE } = LeftPanel;
        const { filter } = this.state;
        const recentChats = this.filterConversations(CONVERSATION_TYPES.PAST);

        return (
            <div className="conversations-holder">
                {filter ?
                    null :
                    <div className="conversations-category">
                        <span>{l.filter_heading__recent}</span>
                    </div>
                }
                {recentChats && recentChats.length ?
                    this.renderConversationsList(recentChats) :
                    <div
                        className={`
                            ${NAMESPACE}-nil
                            ${filter ? `${NAMESPACE}-nil--chats` : ''}
                        `}>
                        {filter ?
                            <>
                                {filter === FILTER.MUTED &&
                                    <>
                                        <i className="sprite-fm-mono icon-notification-off-filled" />
                                        <h3>{l.filter_nil__muted_chats}</h3>
                                    </>
                                }
                                {filter === FILTER.UNREAD &&
                                    <>
                                        <i className="sprite-fm-mono icon-eye-thin-solid" />
                                        <h3>{l.filter_nil__unread_messages}</h3>
                                    </>
                                }
                            </> :
                            <span>{l.no_chats_lhp}</span>
                        }
                    </div>
                }
            </div>
        );
    }

    renderMeetings() {
        const { NAMESPACE } = LeftPanel;
        const { filter } = this.state;
        const upcomingConversations = this.filterConversations(CONVERSATION_TYPES.UPCOMING);
        const pastConversations = this.filterConversations(CONVERSATION_TYPES.PAST);
        // The `categoryName` selectors are used as references in the onboarding flow;
        // see `chatOnboarding.jsx`, `onboarding.js` for further details.
        const $$HOLDER = (heading, content, categoryName) =>
            <div className="conversations-holder">
                <div className={`conversations-category category-${categoryName}`}>
                    <span>{heading}</span>
                </div>
                {content}
            </div>;

        return (
            <>
                {$$HOLDER(
                    l.filter_heading__upcoming,
                    upcomingConversations && upcomingConversations.length ?
                        this.renderConversationsList(upcomingConversations) :
                        <div className={`${NAMESPACE}-nil`}>
                            {filter ?
                                <>
                                    {filter === FILTER.MUTED && <span>{l.filter_nil__muted_upcoming}</span>}
                                    {filter === FILTER.UNREAD && <span>{l.filter_nil__unread_upcoming}</span>}
                                </> :
                                <span>{l.filter_nil__meetings_upcoming}</span>
                            }
                        </div>,
                    'upcoming'
                )}
                {$$HOLDER(
                    l.filter_heading__recent,
                    pastConversations && pastConversations.length ?
                        this.renderConversationsList(pastConversations) :
                        <div className={`${NAMESPACE}-nil`}>
                            {filter ?
                                <>
                                    {filter === FILTER.MUTED && <span>{l.filter_nil__muted_recent}</span>}
                                    {filter === FILTER.UNREAD && <span>{l.filter_nil__unread_recent}</span>}
                                </> :
                                <span>{l.filter_nil__meetings_recent}</span>
                            }
                        </div>,
                    'past'
                )}
            </>
        );
    }

    // --

    getConversations(type) {
        const { UPCOMING, PAST, ARCHIVED } = CONVERSATION_TYPES;
        let { view, views, conversations } = this.props;
        conversations = Object.values(conversations);

        switch (type) {
            case UPCOMING:
                return (
                    conversations
                        .filter(c =>
                            c.isDisplayable() &&
                            c.isMeeting &&
                            c.scheduledMeeting &&
                            c.scheduledMeeting.isUpcoming
                        )
                        .sort((a, b) => {
                            return (
                                a.scheduledMeeting.nextOccurrenceStart - b.scheduledMeeting.nextOccurrenceStart ||
                                a.ctime - b.ctime
                            );
                        })
                );
            case PAST:
                return (
                    conversations
                        .filter(c =>
                            c.isDisplayable() &&
                            (view === views.MEETINGS ? c.isMeeting : !c.isMeeting) &&
                            (!c.scheduledMeeting || c.scheduledMeeting.isCanceled || c.scheduledMeeting.isPast)
                        )
                        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                );
            case ARCHIVED:
                return (
                    conversations
                        .filter(c =>
                            c.isArchived() && (view === views.MEETINGS ? c.isMeeting : !c.isMeeting)
                        )
                        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                );
        }
    }

    filterConversations(type) {
        const { filter } = this.state;
        const conversations = this.getConversations(type);

        switch (filter) {
            case FILTER.UNREAD:
                return conversations.filter(c => c.messagesBuff.getUnreadCount() > 0);
            case FILTER.MUTED:
                return conversations.filter(c => c.isMuted());
            default:
                return conversations;
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.backgroundUpdateInterval);
        document.removeEventListener('visibilitychange', this.doUpdate);
    }

    componentDidMount() {
        super.componentDidMount();
        this.doUpdate();
        this.backgroundUpdateInterval = setInterval(this.doUpdate, 6e4 * 10 /* 10 min */);
        document.addEventListener('visibilitychange', this.doUpdate);
    }

    render() {
        const {
            view,
            views,
            routingSection,
            leftPaneWidth,
            renderView,
            startMeeting,
            scheduleMeeting,
            createGroupChat
        } = this.props;
        const { NAMESPACE } = LeftPanel;
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
                {this.state.archived ?
                    this.renderArchived() :
                    <>
                        <SearchPanel/>
                        <Navigation
                            view={view}
                            views={views}
                            routingSection={routingSection}
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
                                    {view === MEETINGS && this.renderMeetings()}
                                    {view === CHATS && this.renderChats()}
                                    <div className={`${NAMESPACE}-bottom`}>
                                        <div className={`${NAMESPACE}-bottom-control`}>
                                            <div
                                                className="conversations-category"
                                                onClick={() => this.setState({ archived: true })}>
                                                <span>
                                                    {view === CHATS ?
                                                        l.filter_archived__chats :
                                                        l.filter_archived__meetings
                                                    }
                                                </span>
                                                <i className="sprite-fm-mono icon-arrow-right"/>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            }
                        </div>
                    </>
                }
            </div>
        );
    }
}
