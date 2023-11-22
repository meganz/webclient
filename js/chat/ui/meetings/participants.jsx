import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Collapse from './collapse.jsx';
import Call from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';
import Button from './button.jsx';

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
        const { chatRoom, handle, name, source } = this.props;

        return (
            <>
                <Avatar contact={M.u[handle]}/>
                <div className="name">
                    <Emoji>{handle === u_handle ? `${name} ${l.me}` : name}</Emoji>
                    {chatRoom.isMeeting && Call.isModerator(chatRoom, handle) && (
                        <span>
                            <i className={`${this.baseIconClass} icon-admin-outline`}/>
                        </span>
                    )}
                </div>
                <div className="status">
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${source.videoMuted ? 'icon-video-off-thin-outline inactive' : 'icon-video-thin-outline'}
                        `}
                    />
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${source.audioMuted ? 'icon-mic-off-thin-outline inactive' : 'icon-mic-thin-outline'}
                         `}
                    />
                </div>
            </>
        );
    }
}

export default class Participants extends MegaRenderMixin {
    FILTER = { CALL: 0, CHAT: 1 };

    state = {
        filter: this.FILTER.CALL,
        noResponsePeers: [],
        ringingPeers: []
    };

    doHangUp = handle => {
        if (handle) {
            const { call, chatRoom } = this.props;
            return (
                this.isMounted() &&
                this.setState(
                    state => ({ ringingPeers: state.ringingPeers.filter(p => p !== handle) }),
                    () => chatRoom.ringUser(handle, call.callId, 0)
                )
            );
        }
    };

    doCall = handle => {
        if (handle) {
            const { call, chatRoom } = this.props;
            this.setState(
                state => ({ ringingPeers: [...state.ringingPeers, handle] }),
                () => {
                    chatRoom.ringUser(handle, call.callId, 1);
                    if (chatRoom.options.w) {
                        call?.sfuClient?.wrAllowJoin([handle]);
                    }
                    tSleep(40).then(() => {
                        this.doHangUp(handle);
                        return Object.keys(chatRoom.uniqueCallParts).includes(handle) ?
                            null :
                            this.setState(state => ({ noResponsePeers: [...state.noResponsePeers, handle] }));
                    });
                }
            );
        }
    };

    getCallState = handle => {
        const { noResponsePeers, ringingPeers } = this.state;

        if (this.props.initialCallRinging || ringingPeers.includes(handle)) {
            return l.call_state_calling /* `Calling...` */;
        }

        if (noResponsePeers.includes(handle)) {
            return l.call_state_no_response /* `No response` */;
        }

        return l.call_state_not_in_call /* `Not in call` */;
    };

    getCallParticipants = () => {
        const { call, chatRoom, peers } = this.props;
        return (
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
        );
    };

    getChatParticipants = () => {
        const { chatRoom, initialCallRinging } = this.props;
        const { ringingPeers } = this.state;
        const callParticipants = Object.keys(chatRoom.uniqueCallParts);
        const chatParticipants = chatRoom.getParticipantsExceptMe().filter(h => !callParticipants.includes(h));

        if (chatParticipants?.length) {
            return (
                <>
                    {chatParticipants.length > 1 ?
                        (() => {
                            const isRingingAll =
                                initialCallRinging || JSON.stringify(ringingPeers) === JSON.stringify(chatParticipants);
                            return (
                                <Button
                                    className={`
                                        mega-button
                                        action
                                        neutral
                                        call-control-all
                                        ${isRingingAll ? 'disabled' : ''}
                                    `}
                                    icon="sprite-fm-mono phone-call-01"
                                    onClick={() =>
                                        isRingingAll ? null : chatParticipants.map(handle => this.doCall(handle))
                                    }>
                                    {l.call_all_button /* `Call all` */}
                                </Button>
                            );
                        })() :
                        null
                    }
                    <ul>
                        {chatParticipants.map(handle => {
                            const contact = M.u[handle];
                            const isRinging = initialCallRinging || ringingPeers.includes(handle);

                            return (
                                <li key={handle}>
                                    <Avatar contact={contact}/>
                                    <div className="name">
                                        <Emoji>{M.getNameByHandle(handle)}</Emoji>
                                        <span
                                            className={`
                                            user-card-presence
                                            ${megaChat.userPresenceToCssClass(contact.presence)}
                                        `}
                                        />
                                        {chatRoom.isMeeting && Call.isModerator(chatRoom, handle) &&
                                            <span>
                                                <i className="sprite-fm-mono icon-admin-outline"/>
                                            </span>
                                        }
                                        <div className="call-state">
                                            {this.getCallState(handle)}
                                        </div>
                                    </div>
                                    {isRinging ?
                                        null :
                                        <div className="call-control">
                                            <Button
                                                className="mega-button action neutral"
                                                onClick={() => this.doCall(handle)}>
                                                {l.call_button /* `Call` */}
                                            </Button>
                                        </div>
                                    }
                                </li>
                            );
                        })}
                    </ul>
                </>
            );
        }

        return (
            <div className="participants-empty">
                <span className="empty-check-icon" />
                <h3>{l.all_participants_in_call /* `All the invited participants have joined the call` */}</h3>
            </div>
        );
    };

    renderParticipantsList = () => {
        const { filter } = this.state;

        return (
            <div
                className={`
                    participants-list
                    ${filter === this.FILTER.CALL ? '' : 'with-chat-participants'}
                    ${this.props.guest ? 'guest' : ''}
                `}>
                <PerfectScrollbar
                    filter={filter}
                    options={{ 'suppressScrollX': true }}>
                    {filter === this.FILTER.CALL ? this.getCallParticipants() : this.getChatParticipants()}
                </PerfectScrollbar>
            </div>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.chatRoom.off('onCallPeerJoined.participants');
    }

    componentDidMount() {
        super.componentDidMount();

        this.props.chatRoom.rebind('onCallPeerJoined.participants', (ev, userHandle) => {
            const { noResponsePeers, ringingPeers } = this.state;
            if (noResponsePeers.includes(userHandle)) {
                this.setState({ noResponsePeers: noResponsePeers.filter(h => h !== userHandle) });
            }
            if (ringingPeers.includes(userHandle)) {
                this.setState({ ringingPeers: ringingPeers.filter(h => h !== userHandle) });
            }
        });
    }

    render() {
        const { CALL, CHAT } = this.FILTER;
        const { chatRoom, peers } = this.props;
        const { filter } = this.state;

        return (
            <div className="participants">
                {chatRoom.type === 'private' ?
                    null :
                    <div className="participants-nav">
                        <Button
                            className={filter === CALL ? 'active' : ''}
                            onClick={() => this.setState({ filter: CALL })}>
                            {l.call_heading_in_call /* `In call` */}
                        </Button>
                        <Button
                            className={filter === CHAT ? 'active' : ''}
                            onClick={() => this.setState({ filter: CHAT })}>
                            {l.call_heading_not_in_call /* `Not in call` */}
                        </Button>
                    </div>
                }
                {filter === CALL ?
                    <Collapse
                        {...this.props}
                        filter={filter}
                        heading={l[16217] /* `Participants` */}
                        badge={peers?.length + 1}>
                        {this.renderParticipantsList()}
                    </Collapse> :
                    this.renderParticipantsList()
                }
            </div>
        );
    }
}
