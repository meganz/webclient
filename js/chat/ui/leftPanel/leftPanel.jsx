import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import Navigation from './navigation.jsx';
import Actions from './actions.jsx';
import { ConversationsList } from './conversationsList.jsx';
import Toggle, { TogglePanel } from './toggle.jsx';

export default class LeftPanel extends MegaRenderMixin {
    static NAMESPACE = 'lhp';

    renderConversations(type) {
        const { view, views, renderView } = this.props;
        const filteredConversations = this.filterConversations(type);

        return (
            <ConversationsList
                type={type}
                view={view}
                views={views}
                conversations={filteredConversations}
                onConversationClick={chatRoom => renderView(chatRoom.isMeeting ? views.MEETINGS : views.CHATS)}
            />
        );
    }

    filterConversations(type) {
        let { view, views, conversations } = this.props;
        conversations = Object.values(conversations);

        switch (type) {
            case TogglePanel.KEYS.UPCOMING:
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
            case TogglePanel.KEYS.PAST:
                return (
                    conversations
                        .filter(c =>
                            c.isDisplayable() &&
                            (view === views.MEETINGS ? c.isMeeting : !c.isMeeting) &&
                            (!c.scheduledMeeting || c.scheduledMeeting.isCanceled || c.scheduledMeeting.isPast)
                        )
                        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                );
            case TogglePanel.KEYS.ARCHIVE:
                return (
                    conversations
                        .filter(c =>
                            c.isArchived() && (view === views.MEETINGS ? c.isMeeting : !c.isMeeting)
                        )
                        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1))
                );
        }
    }

    render() {
        const {
            view, views, routingSection, conversations, leftPaneWidth, renderView, startMeeting,
            scheduleMeeting, createGroupChat
        } = this.props;
        const IS_LOADING = view === views.LOADING;

        return (
            <div
                className={`
                    fm-left-panel
                    chat-lp-body
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
                    renderView={renderView}
                />

                <Actions
                    view={view}
                    views={views}
                    routingSection={routingSection}
                    startMeeting={startMeeting}
                    scheduleMeeting={scheduleMeeting}
                    createGroupChat={createGroupChat}
                />

                <div
                    className={`
                        ${LeftPanel.NAMESPACE}-conversations
                        ${view === views.MEETINGS ? 'meetings-view' : 'chats-view'}
                        conversations
                        content-panel
                        active
                    `}>
                    <Toggle
                        view={view}
                        views={views}
                        loading={IS_LOADING}
                        conversations={conversations}
                        expanded={TogglePanel.KEYS.UPCOMING}>
                        {view === views.MEETINGS && (
                            <TogglePanel
                                key={TogglePanel.KEYS.UPCOMING}
                                heading={l.upcoming_meetings}>
                                {this.renderConversations(TogglePanel.KEYS.UPCOMING)}
                            </TogglePanel>
                        )}
                        <TogglePanel
                            key={TogglePanel.KEYS.PAST}
                            heading={!IS_LOADING && (view === views.CHATS ? l.contacts_and_groups : l.past_meetings)}>
                            {this.renderConversations(TogglePanel.KEYS.PAST)}
                        </TogglePanel>
                        <TogglePanel
                            key={TogglePanel.KEYS.ARCHIVE}
                            heading={!IS_LOADING && view === views.CHATS ? l[19067] : l.archived_meetings}>
                            {this.renderConversations(TogglePanel.KEYS.ARCHIVE)}
                        </TogglePanel>
                    </Toggle>
                </div>
            </div>
        );
    }
}
