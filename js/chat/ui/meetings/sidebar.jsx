import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import ComposedTextArea from "../composedTextArea.jsx";
import HistoryPanel from "../historyPanel.jsx";
import Call from './call.jsx';
import Collapse from './collapse.jsx';
import Participants from './participants.jsx';
import Button from './button.jsx';
import StreamNode from './streamNode.jsx';
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
        const { mode, call, streams, guest, chatRoom, forcedLocal, isOnHold, onSpeakerChange } = this.props;
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
                        badge={streams.length + 1}>
                        <div className="sidebar-streams">
                            <StreamNode
                                mode={mode}
                                chatRoom={chatRoom}
                                stream={localStream}
                                isLocal={true}
                                isThumb={true}
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
                            {streams.map((stream, index) => {
                                return (
                                    <StreamNode
                                        key={index}
                                        mode={mode}
                                        chatRoom={chatRoom}
                                        stream={stream}
                                        isThumb={true}
                                        simpletip={{...SIMPLE_TIP, label: M.getNameByHandle(stream.userHandle)}}
                                        className={
                                            stream.isActive || stream.clientId === call.forcedActiveStream ?
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
        const { call, streams, guest, chatRoom } = this.props;
        return (
            <Participants
                streams={streams}
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
