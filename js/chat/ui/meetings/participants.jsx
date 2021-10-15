import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { Avatar } from '../contacts.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Collapse from './collapse.jsx';
import Guest from './guest.jsx';
import Call from './call.jsx';

class Participant extends MegaRenderMixin {
    baseIconClass = 'sprite-fm-mono';

    constructor(props) {
        super(props);
    }

    audioMuted = () => {
        const { call, stream } = this.props;

        // Local stream (me)
        if (call) {
            return call.localAudioMuted === null || !!call.localAudioMuted;
        }

        // Participant streams
        return stream && stream.audioMuted;
    };

    videoMuted = () => {
        const { call, stream } = this.props;

        // Local stream (me)
        if (call) {
            return !(call.av & SfuClient.Av.Camera);
        }

        // Participant streams
        return stream && stream.videoMuted;
    };

    render() {
        const { chatRoom, handle, name } = this.props;
        return (
            <>
                <Avatar contact={M.u[handle]} />
                <div className="name">
                    <span>{name} &nbsp;</span>
                    {handle === u_handle && <span>{l.me}</span>}
                    {chatRoom.isMeeting && Call.isModerator(chatRoom, handle) && (
                        <span>
                            <i className={`${this.baseIconClass} icon-admin`} />
                        </span>
                    )}
                </div>
                <div className="status">
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${this.audioMuted() ? 'icon-audio-off inactive' : 'icon-audio-filled'}
                         `}
                    />
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${this.videoMuted() ? 'icon-video-off inactive' : 'icon-video-call-filled'}
                        `}
                    />
                </div>
            </>
        );
    }
}

export default class Participants extends MegaRenderMixin {
    participantsListRef = null;

    constructor(props) {
        super(props);
    }

    render() {
        const { streams, call, chatRoom, guest, onGuestClose } = this.props;
        return (
            <div className="participants">
                <Collapse
                    {...this.props}
                    heading={l[16217] /* `Participants` */}
                    badge={streams.length + 1}>
                    <div
                        className={`
                            participants-list
                            ${guest ? 'guest' : ''}
                        `}>
                        <PerfectScrollbar
                            options={{ 'suppressScrollX': true }}
                            ref={ref => {
                                this.participantsListRef = ref;
                            }}>
                            <ul>
                                <li>
                                    <Participant
                                        call={call}
                                        chatRoom={chatRoom}
                                        handle={u_handle}
                                        name={M.getNameByHandle(u_handle)}
                                    />
                                </li>
                                {streams.map((stream, i) =>
                                    <li key={`${stream.clientId}_${i}`}>
                                        <Participant
                                            chatRoom={chatRoom}
                                            stream={stream}
                                            handle={stream.userHandle}
                                            name={stream.name}
                                        />
                                    </li>
                                )}
                            </ul>
                        </PerfectScrollbar>
                    </div>
                </Collapse>
                {guest && <Guest onGuestClose={() => onGuestClose(this.participantsListRef)} />}
            </div>
        );
    }
}
