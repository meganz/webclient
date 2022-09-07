import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Collapse from './collapse.jsx';
import Call from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';

class Participant extends MegaRenderMixin {
    baseIconClass = 'sprite-fm-mono';

    audioMuted() {
        const { call, stream } = this.props;

        // Local stream (me)
        if (call) {
            return !(call.av & SfuClient.Av.Audio);
        }

        // Participant streams
        return stream && stream.audioMuted;
    }

    videoMuted() {
        const { call, stream } = this.props;

        // Local stream (me)
        if (call) {
            return !(call.av & SfuClient.Av.Camera);
        }

        // Participant streams
        return stream && stream.videoMuted;
    }

    render() {
        const { chatRoom, handle, name } = this.props;
        return (
            <>
                <Avatar contact={M.u[handle]} />
                <div className="name">
                    <Emoji>{handle === u_handle ? `${name} ${l.me}` : name}</Emoji>
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
    render() {
        const { streams, call, guest, chatRoom } = this.props;
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
                        <PerfectScrollbar options={{ 'suppressScrollX': true }}>
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
            </div>
        );
    }
}
