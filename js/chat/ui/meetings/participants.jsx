import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar, ContactAwareName } from '../contacts.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import Collapse from './collapse.jsx';
import Call from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';
import Button from './button.jsx';
import ContactsPanel from '../contactsPanel/contactsPanel.jsx';
import { Pin, Privilege } from './videoNodeMenu.jsx';
import { AudioLevelIndicator } from './videoNode.jsx';

class Participant extends MegaRenderMixin {
    raisedHandListener = undefined;
    baseIconClass = 'sprite-fm-mono';

    state = {
        raisedHandPeers: []
    };

    constructor(props) {
        super(props);
        this.state.raisedHandPeers = this.props.raisedHandPeers || [];
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.source.registerConsumer(this);
        // [...] TODO: higher-order component
        this.raisedHandListener =
            mBroadcaster.addListener(
                'meetings:raisedHand',
                raisedHandPeers => this.setState({ raisedHandPeers }, () => this.safeForceUpdate())
            );
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.source.deregisterConsumer(this);
        mBroadcaster.removeListener(this.raisedHandListener);
    }

    onAvChange() {
        this.safeForceUpdate();
    }

    render() {
        const {
            call,
            mode,
            chatRoom,
            source,
            contact,
            handle,
            name,
            recorderCid,
            onCallMinimize,
            onSpeakerChange,
            onModeChange
        } = this.props;
        const { isOnHold, videoMuted, audioMuted, clientId } = source;
        const hasRelationship = ContactsPanel.hasRelationship(contact);

        return (
            <>
                {this.state.raisedHandPeers.includes(handle) && !isOnHold ?
                    <div className="participant-signifier">
                        <i className="sprite-fm-uni icon-raise-hand" />
                    </div> :
                    <Avatar contact={M.u[handle]}/>
                }
                <div className="name">
                    {handle === u_handle ?
                        <Emoji>{`${name} ${l.me}`}</Emoji> :
                        <ContactAwareName contact={M.u[handle]} emoji={true}/>
                    }
                    {Call.isModerator(chatRoom, handle) &&
                        <span>
                            <i className={`${this.baseIconClass} icon-admin-outline`}/>
                        </span>
                    }
                </div>
                <div className="status">
                    {recorderCid === clientId || recorderCid === sfuClient.cid && handle === u_handle ?
                        <div className="recording-status">
                            <span />
                        </div> :
                        null
                    }
                    <i
                        className={`
                            ${this.baseIconClass}
                            ${videoMuted ? 'icon-video-off-thin-outline inactive' : 'icon-video-thin-outline'}
                        `}
                    />
                    <AudioLevelIndicator source={source} />
                    <div className="participants-menu theme-dark-forced">
                        <div className="participants-menu-toggle">
                            <i className="sprite-fm-mono icon-side-menu"/>
                        </div>
                        <div className="participants-menu-content">
                            <ul>
                                {hasRelationship ?
                                    <li>
                                        <Button
                                            icon="sprite-fm-mono icon-info"
                                            onClick={() => {
                                                onCallMinimize();
                                                loadSubPage(`fm/chat/contacts/${handle}`);
                                            }}>
                                            <span>{l[6859] /* Info */}</span>
                                        </Button>
                                    </li> :
                                    null
                                }
                                {chatRoom.iAmOperator() && u_handle !== handle && !audioMuted &&
                                    <li>
                                        <Button
                                            icon="sprite-fm-mono icon-mic-off-thin-outline"
                                            onClick={() => {
                                                call.sfuClient.mutePeer(clientId);
                                                megaChat.plugins.userHelper.getUserNickname(handle)
                                                    .catch(dump)
                                                    .always(name => {
                                                        ChatToast.quick(
                                                            /* `Muted by %NAME` */
                                                            l.you_muted_peer.replace('%NAME', name || '')
                                                        );
                                                    });
                                            }}>
                                            <span>{l[16214] /* `Mute` */}</span>
                                        </Button>
                                    </li>
                                }
                                {hasRelationship ?
                                    <li>
                                        <Button
                                            icon="sprite-fm-mono icon-chat"
                                            onClick={() => {
                                                onCallMinimize();
                                                loadSubPage(`fm/chat/p/${handle}`);
                                            }}>
                                            <span>{l.send_message /* `Send message` */}</span>
                                        </Button>
                                    </li> :
                                    null
                                }
                                {chatRoom.iAmOperator() && u_handle !== handle &&
                                    <li>
                                        <Privilege
                                            stream={source}
                                            chatRoom={chatRoom}
                                        />
                                    </li>
                                }
                                <li>
                                    <Pin
                                        mode={mode}
                                        stream={source}
                                        onSpeakerChange={onSpeakerChange}
                                        onModeChange={onModeChange}
                                    />
                                </li>
                                {call.isPublic && chatRoom.iAmOperator() && u_handle !== handle &&
                                    <li>
                                        <Button
                                            icon="sprite-fm-mono icon-disabled-filled"
                                            onClick={() => chatRoom.trigger('onRemoveUserRequest', handle)}>
                                            <span>{l[8867] /* `Remove participant` */}</span>
                                        </Button>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>
            </>
        );
    }
}

export default class Participants extends MegaRenderMixin {
    muteRef = React.createRef();

    NAMESPACE = 'participants';
    FILTER = { IN_CALL: 0, CHAT_PARTICIPANTS: 1 };

    state = {
        filter: this.FILTER.IN_CALL,
        noResponsePeers: [],
        ringingPeers: [],
        allPeersMuted: undefined
    };

    get allPeersMuted() {
        return Object.values(this.props.peers)
            .filter(p => p instanceof CallManager2.Peer)
            .every(p => p.audioMuted);
    }

    constructor(props) {
        super(props);
        this.state.allPeersMuted = this.allPeersMuted;
    }

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
        const {
            call,
            mode,
            chatRoom,
            recorderCid,
            raisedHandPeers,
            onCallMinimize,
            onSpeakerChange,
            onModeChange
        } = this.props;
        const peers = Object.values(this.props.peers);
        const $$PEER = peer =>
            peer &&
            <li key={`${peer.clientId || ''}-${peer.userHandle}`}>
                <Participant
                    call={call}
                    mode={mode}
                    chatRoom={chatRoom}
                    source={peer.userHandle ? peer : call.getLocalStream()}
                    contact={M.u[peer.userHandle] || undefined}
                    handle={peer.userHandle || u_handle}
                    name={peer.name || M.getNameByHandle(u_handle)}
                    recorderCid={recorderCid}
                    raisedHandPeers={raisedHandPeers}
                    onCallMinimize={onCallMinimize}
                    onSpeakerChange={onSpeakerChange}
                    onModeChange={onModeChange}
                />
            </li>;

        let $$RAISED = [];
        for (const userHandle of call.sfuClient.raisedHands) {
            const peer = peers.find(p => (p.userHandle || p.localPeerStream.userHandle) === userHandle);
            $$RAISED = [...$$RAISED, $$PEER(peer)];
        }

        const $$REST = peers
            .filter(p => ![...call.sfuClient.raisedHands].includes(p.userHandle || p.localPeerStream.userHandle))
            .sort((a, b) => !!a.userHandle - !!b.userHandle)
            .map(peer => $$PEER(peer));

        return (
            <ul>
                {$$RAISED}
                {$$REST}
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
                                        <ContactAwareName contact={M.u[handle]} emoji={true}/>
                                        <span
                                            className={`
                                            user-card-presence
                                            ${megaChat.userPresenceToCssClass(contact.presence)}
                                        `}
                                        />
                                        {Call.isModerator(chatRoom, handle) &&
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
        const { filter, raisedHandPeers } = this.state;

        return (
            <div
                className={`
                    participants-list
                    ${filter === this.FILTER.IN_CALL ? '' : 'with-chat-participants'}
                    ${this.props.guest ? 'guest' : ''}
                `}>
                <PerfectScrollbar
                    filter={filter}
                    raisedHandPeers={raisedHandPeers}
                    options={{ 'suppressScrollX': true }}>
                    {filter === this.FILTER.IN_CALL ? this.getCallParticipants() : this.getChatParticipants()}
                </PerfectScrollbar>
            </div>
        );
    };

    renderMuteAllControl = () => {
        const { allPeersMuted } = this.state;
        const simpletip = {
            label: l.mute_all_tooltip /* `This will mute all participants except the host` */,
            position: 'top',
            className: 'theme-dark-forced'
        };

        return (
            <Button
                ref={this.muteRef}
                simpletip={allPeersMuted ? null : simpletip}
                className={`
                    mega-button
                    action
                    ${this.NAMESPACE}-mute
                    ${allPeersMuted ? 'disabled' : ''}
                `}
                icon="sprite-fm-mono icon-mic-off-thin-outline"
                onClick={() =>
                    allPeersMuted ?
                        null :
                        this.setState({ allPeersMuted: true }, () => {
                            this.props.call.sfuClient.mutePeer();
                            ChatToast.quick(l.you_muted_all_peers /* `You've muted all participants` */);
                            $(this.muteRef.current?.domNode).trigger('simpletipClose');
                        })
                }>
                {allPeersMuted ? l.all_muted /* `All muted` */ : l.mute_all /* `Mute all` */}
            </Button>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        ['onCallPeerJoined', 'onPeerAvChange'].map(event => this.props.chatRoom.off(`${event}.${this.NAMESPACE}`));
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.chatRoom
            .rebind(`onCallPeerJoined.${this.NAMESPACE}`, (ev, userHandle) => {
                const { noResponsePeers, ringingPeers } = this.state;
                this.setState({
                    noResponsePeers: noResponsePeers.includes(userHandle) ?
                        noResponsePeers.filter(h => h !== userHandle) :
                        noResponsePeers,
                    ringingPeers: ringingPeers.includes(userHandle) ?
                        ringingPeers.filter(h => h !== userHandle) :
                        ringingPeers
                });
            })
            .rebind(`onPeerAvChange.${this.NAMESPACE}`, () =>
                this.isMounted() && this.setState({ allPeersMuted: this.allPeersMuted })
            );
    }

    render() {
        const { IN_CALL, CHAT_PARTICIPANTS } = this.FILTER;
        const { withInvite, chatRoom, peers, onInviteToggle } = this.props;
        const { filter } = this.state;

        return (
            <div className={this.NAMESPACE}>
                {chatRoom.type === 'private' ?
                    null :
                    <div className={`${this.NAMESPACE}-nav`}>
                        <Button
                            className={filter === IN_CALL ? 'active' : ''}
                            onClick={() => this.setState({ filter: IN_CALL })}>
                            {l.call_heading_in_call /* `In call` */}
                        </Button>
                        <Button
                            className={filter === CHAT_PARTICIPANTS ? 'active' : ''}
                            onClick={() => this.setState({ filter: CHAT_PARTICIPANTS })}>
                            {l.call_heading_not_in_call /* `Not in call` */}
                        </Button>
                    </div>
                }
                {filter === IN_CALL ?
                    <>
                        <div className={`${this.NAMESPACE}-actions`}>
                            {withInvite &&
                                <Button
                                    className={`
                                        mega-button
                                        action
                                        ${this.NAMESPACE}-invite
                                    `}
                                    icon="sprite-fm-mono icon-user-plus-thin-outline"
                                    onClick={onInviteToggle}>
                                    {l[8726] /* `Invite` */}
                                </Button>
                            }
                            {chatRoom.iAmOperator() && this.renderMuteAllControl()}
                        </div>
                        <Collapse
                            {...this.props}
                            filter={filter}
                            heading={l[16217] /* `Participants` */}
                            badge={peers?.length + 1}>
                            {this.renderParticipantsList()}
                        </Collapse>
                    </> :
                    this.renderParticipantsList()
                }
            </div>
        );
    }
}
