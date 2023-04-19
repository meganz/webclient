import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ComposedTextArea from "../composedTextArea.jsx";
import HistoryPanel from "../historyPanel.jsx";
import Call from './call.jsx';
import Collapse from './collapse.jsx';
import Participants from './participants.jsx';
import Button from './button.jsx';
import { LocalVideoThumb, PeerVideoThumb } from './videoNode.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar';
import Guest from './guest.jsx';

export default class Sidebar extends MegaRenderMixin {
    containerRef = React.createRef();
    historyPanel = null;

    renderHead = () => {
        const { call, view, chatRoom, onSidebarClose, onInviteToggle } = this.props;
        return (
            <div className="sidebar-head">
                <Button
                    simpletip={{ label: l.close_sidebar /* `Close sidebar` */, className: 'theme-dark-forced' }}
                    className="mega-button action small left"
                    icon="icon-collapse-right"
                    onClick={onSidebarClose}>
                    <span>{l.close_sidebar /* `Close sidebar` */}</span>
                </Button>
                {view === Call.VIEW.CHAT && <h2>{l.chats /* `Chats` */}</h2>}
                {view !== Call.VIEW.CHAT && (
                    <>
                        <h2>{l[16217] /* `Participants` */}</h2>
                        {
                            call.isPublic
                            && !is_eplusplus
                            && (
                                chatRoom.type !== 'private'
                                && chatRoom.options[MCO_FLAGS.OPEN_INVITE]
                                && !chatRoom.iAmReadOnly()
                                || Call.isModerator(chatRoom, u_handle))
                            && (
                            <Button
                                className="mega-button round positive add"
                                icon="icon-add"
                                onClick={onInviteToggle}>
                                <span>{l[8007] /* `Add participant` */}</span>
                            </Button>
                        )}
                    </>
                )}
            </div>
        );
    };

    renderSpeakerMode = () => {
        const { mode, call, peers, guest, chatRoom, forcedLocal, onSpeakerChange } = this.props;
        const localStream = call.getLocalStream();
        const SIMPLE_TIP = {className: 'theme-dark-forced'};
        return (
            <div
                className={`
                    sidebar-streams-container
                    ${guest ? 'guest' : ''}
                `}>
                <PerfectScrollbar options={{ 'suppressScrollX': true }}>
                    <Collapse
                        {...this.props}
                        heading={l[16217] /* `Participants` */}
                        badge={peers.length + 1}>
                        <div className="sidebar-streams">
                            <LocalVideoThumb
                                mode={mode}
                                chatRoom={chatRoom}
                                source={localStream}
                                simpletip={{...SIMPLE_TIP, label: l[8885]}}
                                localAudioMuted={!(call.av & SfuClient.Av.Audio)}
                                className={
                                    (call.isSharingScreen() ? '' : 'local-stream-mirrored') + ' ' +
                                    (forcedLocal ? 'active' : '')
                                }
                                onClick={() => {
                                    mBroadcaster.sendMessage('meetings:collapse');
                                    onSpeakerChange(localStream);
                                }}
                            />
                            {peers.map((peer, index) => {
                                return (
                                    <PeerVideoThumb
                                        key={index}
                                        mode={mode}
                                        chatRoom={chatRoom}
                                        source={peer}
                                        simpletip={{...SIMPLE_TIP, label: M.getNameByHandle(peer.userHandle)}}
                                        className={
                                            peer.isActive || peer.clientId === call.forcedActiveStream ?
                                                'active' :
                                                ''
                                        }
                                        onClick={onSpeakerChange}
                                    />
                                );
                            })}
                        </div>
                    </Collapse>
                </PerfectScrollbar>
            </div>
        );
    };

    renderChatView = () => {
        const { chatRoom, onDeleteMessage } = this.props;
        return (
            <>
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

    renderParticipantsView = () => {
        const { call, peers, guest, chatRoom } = this.props;
        return (
            <Participants
                peers={peers}
                call={call}
                chatRoom={chatRoom}
                guest={guest}
            />
        );
    };

    render() {
        const { mode, view, guest, onGuestClose } = this.props;

        //
        // `Sidebar`
        // -------------------------------------------------------------------------

        return (
            <div
                ref={this.containerRef}
                className={`
                    sidebar
                    ${view === Call.VIEW.CHAT ? 'chat-opened' : 'theme-dark-forced'}
                `}>
                {this.renderHead()}
                {view === Call.VIEW.PARTICIPANTS && mode === Call.MODE.SPEAKER && this.renderSpeakerMode()}
                {view === Call.VIEW.CHAT && this.renderChatView()}
                {view === Call.VIEW.PARTICIPANTS && mode === Call.MODE.THUMBNAIL && this.renderParticipantsView()}
                {guest && view !== Call.VIEW.CHAT && <Guest onGuestClose={onGuestClose} />}
            </div>
        );
    }
}
