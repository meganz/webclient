import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Collapse from './collapse.jsx';
import Call from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';

class Participant extends MegaRenderMixin {
    baseIconClass = 'sprite-fm-mono';
    componentDidMount() {
        super.componentDidMount();
        this.props.source.registerConsumer(this);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.source.deregisterConsumer(this);
    }
    onAvChange() {
        this.safeForceUpdate();
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
                            ${this.props.source.audioMuted ? 'icon-audio-off inactive' : 'icon-audio-filled'}
                         `}
                    />
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${this.props.source.videoMuted ? 'icon-video-off inactive' : 'icon-video-call-filled'}
                        `}
                    />
                </div>
            </>
        );
    }
}

export default class Participants extends MegaRenderMixin {
    render() {
        const { peers, call, guest, chatRoom } = this.props;
        return (
            <div className="participants">
                <Collapse
                    {...this.props}
                    heading={l[16217] /* `Participants` */}
                    badge={peers.length + 1}>
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
                                        source={call.getLocalStream()}
                                        handle={u_handle}
                                        name={M.getNameByHandle(u_handle)}
                                    />
                                </li>
                                {peers.map(peer =>
                                    <li key={`${peer.clientId}-${peer.userHandle}`}>
                                        <Participant
                                            chatRoom={chatRoom}
                                            source={peer}
                                            handle={peer.userHandle}
                                            name={peer.name}
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
