import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ComposedTextArea from "../composedTextArea.jsx";
import HistoryPanel from "../historyPanel.jsx";
import Call, { VIEW } from './call.jsx';
import Participants from './participants.jsx';
import Button from './button.jsx';
import Guest from './guest.jsx';

const inviteAllowed = chatRoom => {
    if (chatRoom) {
        return chatRoom.type !== 'private' && !!(
            chatRoom.options[MCO_FLAGS.OPEN_INVITE] ||
            Call.isModerator(chatRoom, u_handle) ||
            chatRoom.publicLink
        );
    }
    return false;
};

export default class Sidebar extends MegaRenderMixin {
    containerRef = React.createRef();
    historyPanel = null;

    renderHead = ({ title, children }) => {
        return (
            <div className="sidebar-head">
                <Button
                    simpletip={{ label: l.close_sidebar /* `Close sidebar` */, className: 'theme-dark-forced' }}
                    className="mega-button action small left"
                    icon="icon-collapse-right"
                    onClick={this.props.onSidebarClose}>
                    <span>{l.close_sidebar /* `Close sidebar` */}</span>
                </Button>
                <h2>{title}</h2>
                {children || null}
            </div>
        );
    };

    renderParticipantsView = () => {
        const {
            call, mode, peers, initialCallRinging, chatRoom, guest, recorder, onInviteToggle,
            onCallMinimize, onSpeakerChange, onModeChange
        } = this.props;
        const withInvite = inviteAllowed(chatRoom);

        return (
            <>
                {this.renderHead({ title: l[16217] /* `Participants` */ })}
                <Participants
                    withInvite={withInvite}
                    call={call}
                    mode={mode}
                    peers={peers}
                    initialCallRinging={initialCallRinging}
                    chatRoom={chatRoom}
                    guest={guest}
                    recorder={recorder}
                    onInviteToggle={onInviteToggle}
                    onCallMinimize={onCallMinimize}
                    onSpeakerChange={onSpeakerChange}
                    onModeChange={onModeChange}
                />
            </>
        );
    };

    renderChatView = () => {
        const { chatRoom, onDeleteMessage } = this.props;

        return (
            <>
                {this.renderHead({ title: l.chats /* `Chats` */ })}
                <HistoryPanel
                    ref={ref => {
                        this.historyPanel = ref;
                    }}
                    chatRoom={chatRoom}
                    className="in-call"
                    onDeleteClicked={onDeleteMessage}
                />
                <ComposedTextArea chatRoom={chatRoom} parent={this} containerRef={this.containerRef} />
            </>
        );
    };

    render() {
        const { view, guest, onGuestClose } = this.props;

        //
        // `Sidebar`
        // -------------------------------------------------------------------------

        return (
            <div className="sidebar-wrapper theme-dark-forced">
                <div
                    ref={this.containerRef}
                    className={`
                        sidebar
                        ${view === VIEW.CHAT ? 'chat-opened' : 'theme-dark-forced'}
                    `}>
                    {view === VIEW.PARTICIPANTS && this.renderParticipantsView()}
                    {view === VIEW.CHAT && this.renderChatView()}
                    {guest && view !== VIEW.CHAT && <Guest onGuestClose={onGuestClose} />}
                </div>
            </div>
        );
    }
}
