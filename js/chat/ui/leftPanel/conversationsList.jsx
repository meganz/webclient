import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import ConversationsListItem from './conversationsListItem.jsx';

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

    renderConversations() {
        const { conversations, onConversationClick } = this.props;
        return (
            <ul className="conversations-pane">
                {conversations.sort(M.sortObjFn(room => room.lastActivity || room.ctime, -1))
                    .map(chatRoom => {
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
            return (
                <span className="empty-conversations">
                    {view === views.CHATS ? l.no_chats_lhp : l.no_meetings_lhp}
                </span>
            );
        }

        return view === views.LOADING ? this.renderLoading() : this.renderConversations();
    }
}
