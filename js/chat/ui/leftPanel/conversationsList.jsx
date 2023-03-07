import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import ConversationsListItem from './conversationsListItem.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import { TogglePanel } from './toggle.jsx';

export class ConversationsList extends MegaRenderMixin {
    backgroundUpdateInterval = null;

    static defaultProps = {
        manualDataChangeTracking: true
    };

    state = {
        updated: 0
    };

    constructor(props) {
        super(props);
        this.doUpdate = this.doUpdate.bind(this);
    }

    customIsEventuallyVisible() {
        return M.chat;
    }

    attachRerenderCallbacks() {
        this._megaChatsListener = megaChat.chats.addChangeListener(() => this.onPropOrStateUpdated());
    }

    detachRerenderCallbacks() {
        if (super.detachRerenderCallbacks) {
            super.detachRerenderCallbacks();
        }
        megaChat.chats.removeChangeListener(this._megaChatsListener);
    }

    doUpdate() {
        return (
            this.isComponentVisible() &&
            document.visibilityState === 'visible' &&
            this.setState(state => ({ updated: ++state.updated }), () => this.forceUpdate())
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

    renderEmptyState() {
        const { type, view, views } = this.props;
        const isArchived = type === TogglePanel.KEYS.ARCHIVE;
        const isUpcoming = type === TogglePanel.KEYS.UPCOMING;
        const messages = {
            [views.CHATS]: isArchived ? l.no_archived_chats_lhp : l.no_chats_lhp,
            [views.MEETINGS]: (() => {
                if (isArchived) {
                    return l.no_archived_meetings_lhp;
                }
                return isUpcoming ? l.no_upcoming_meetings_lhp : l.no_meetings_lhp;
            })()
        };

        return (
            <span className="empty-conversations">
                {messages[view]}
            </span>
        );
    }

    renderConversationsList() {
        const { view, conversations, onConversationClick } = this.props;
        return (
            <PerfectScrollbar
                className="chat-lp-scroll-area"
                ref={ref => {
                    megaChat.$chatTreePanePs = ref;
                }}
                view={view}
                conversations={conversations}>
                <ul className="conversations-pane">
                    {conversations.map(chatRoom => {
                        if (chatRoom.roomId) {
                            return (
                                <ConversationsListItem
                                    key={chatRoom.roomId}
                                    chatRoom={chatRoom}
                                    contact={M.u[chatRoom.getParticipantsExceptMe()[0]] || null}
                                    messages={chatRoom.messagesBuff}
                                    onConversationClick={() => {
                                        loadSubPage(chatRoom.getRoomUrl(false));
                                        if (onConversationClick) {
                                            onConversationClick(chatRoom);
                                        }
                                    }}
                                />
                            );
                        }
                        return null;
                    })}
                </ul>
            </PerfectScrollbar>
        );
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
        const { view, views, conversations } = this.props;

        if (conversations && conversations.length === 0) {
            return this.renderEmptyState();
        }

        return view === views.LOADING ? this.renderLoading() : this.renderConversationsList();
    }
}
