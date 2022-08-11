import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import SearchPanel from '../searchPanel/searchPanel.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Navigation from './navigation.jsx';
import Actions from './actions.jsx';
import { ConversationsList } from './conversationsList.jsx';
import Toggle, { TogglePanel } from './toggle.jsx';

export default class LeftPanel extends MegaRenderMixin {
    static NAMESPACE = 'lhp';

    renderConversations(archived = false) {
        const { view, views, conversations, renderView } = this.props;
        return (
            <PerfectScrollbar
                className="chat-lp-scroll-area"
                ref={ref => {
                    megaChat.$chatTreePanePs = ref;
                }}
                view={view}
                conversations={conversations}>
                <ConversationsList
                    view={view}
                    views={views}
                    conversations={conversations.filter(c =>
                        c[archived ? 'isArchived' : 'isDisplayable']()
                    )}
                    onConversationClick={chatRoom => renderView(chatRoom.isMeeting ? views.MEETINGS : views.CHATS)}
                />
            </PerfectScrollbar>
        );
    }

    render() {
        const { view, views, routingSection, leftPaneWidth, renderView, startMeeting, createGroupChat } = this.props;

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
                    createGroupChat={createGroupChat}
                />

                <div
                    className={`
                        ${LeftPanel.NAMESPACE}-conversations
                        conversations
                        content-panel
                        active
                    `}>
                    <Toggle
                        view={view}
                        loading={view === views.LOADING}
                        expanded="one">
                        <TogglePanel
                            key="one"
                            heading={
                                view !== views.LOADING &&
                                l[view === views.CHATS ? 'contacts_and_groups' : 'past_meetings']
                            }>
                            {this.renderConversations()}
                        </TogglePanel>
                        <TogglePanel
                            key="two"
                            heading={view !== views.LOADING && l[19067] /* `Archived` */}>
                            {this.renderConversations(true)}
                        </TogglePanel>
                    </Toggle>
                </div>
            </div>
        );
    }
}
