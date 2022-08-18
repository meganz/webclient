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
        const { view, views, renderView } = this.props;
        const conversations = Object.values(this.props.conversations)
            .filter(c =>
                (view === views.MEETINGS ? c.isMeeting : !c.isMeeting) &&
                c[archived ? 'isArchived' : 'isDisplayable']()
            );

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
                    conversations={conversations}
                    onConversationClick={chatRoom => renderView(chatRoom.isMeeting ? views.MEETINGS : views.CHATS)}
                />
            </PerfectScrollbar>
        );
    }

    render() {
        const {
            view,
            views,
            routingSection,
            conversations,
            leftPaneWidth,
            renderView,
            startMeeting,
            createGroupChat
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
                        loading={IS_LOADING}
                        conversations={conversations}
                        expanded="one">
                        <TogglePanel
                            key="one"
                            heading={!IS_LOADING && (view === views.CHATS ? l.contacts_and_groups : l.past_meetings)}>
                            {this.renderConversations()}
                        </TogglePanel>
                        <TogglePanel
                            key="two"
                            heading={!IS_LOADING && l[19067] /* `Archived` */}>
                            {this.renderConversations(true)}
                        </TogglePanel>
                    </Toggle>
                </div>
            </div>
        );
    }
}
