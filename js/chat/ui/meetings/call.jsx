import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Stream, { STREAM_ACTIONS, MAX_STREAMS } from './stream.jsx';
import Sidebar from './sidebar.jsx';
import Invite from './workflow/invite/invite.jsx';
import Ephemeral from './workflow/ephemeral.jsx';
import Offline from './offline.jsx';
import { allContactsInChat, excludedParticipants } from '../conversationpanel.jsx';

export const EXPANDED_FLAG = 'in-call';
export const inProgressAlert = (isJoin, chatRoom) => {
    return new Promise((resolve, reject) => {
        if (megaChat.haveAnyActiveCall()) {
            if (window.sfuClient) {
                // Active call w/ the current client
                const { chatRoom: activeCallRoom } = megaChat.activeCall;
                const peers = activeCallRoom ?
                    activeCallRoom.getParticipantsExceptMe(activeCallRoom.getCallParticipants())
                        .map(h => M.getNameByHandle(h)) :
                    [];
                let body = isJoin ? l.cancel_to_join : l.cancel_to_start;
                if (peers.length) {
                    body = mega.utils.trans.listToString(
                        peers,
                        isJoin ? l.cancel_with_to_join : l.cancel_with_to_start
                    );
                }
                msgDialog('warningb', null, l.call_in_progress, body, null, 1);
                return reject();
            }

            // Active call on another client; incl. current user already being in the call ->
            // skip warning notification
            if (chatRoom.getCallParticipants().includes(u_handle)) {
                return resolve();
            }

            // Active call on another client
            return (
                msgDialog(
                    `warningb:!^${l[2005]}!${isJoin ? l.join_call_anyway : l.start_call_anyway}`,
                    null,
                    isJoin ? l.join_multiple_calls_title : l.start_multiple_calls_title,
                    isJoin ? l.join_multiple_calls_text : l.start_multiple_calls_text,
                    join => {
                        if (join) {
                            return resolve();
                        }
                        return reject();
                    },
                    1
                )
            );
        }
        resolve();
    });
};

// --

export default class Call extends MegaRenderMixin {

    ephemeralAddListener = null;

    /**
     * TYPE
     * @description Describes the available call types.
     * @type {{VIDEO: number, AUDIO: number}}
     * @enum {number}
     * @property {number} AUDIO
     * @property {number} VIDEO
     * @readonly
     */

    static TYPE = {
        AUDIO: 1,
        VIDEO: 2
    };

    /**
     * MODE
     * @description Describes the available call modes.
     * @enum {number}
     * @property {number} THUMBNAIL
     * @property {number} SPEAKER
     * @readonly
     */

    static MODE = {
        THUMBNAIL: 1,
        SPEAKER: 2,
        MINI: 3
    };

    /**
     * VIEW
     * @description Describes the available view states.
     * @enum {number}
     * @property {number} DEFAULT
     * @property {number} CHAT
     * @property {number} PARTICIPANTS
     * @readonly
     */

    static VIEW = {
        DEFAULT: 0,
        CHAT: 1,
        PARTICIPANTS: 2
    };

    /**
     * STATE
     * @description Object used for handling the default state, incl. storing the previous state on minimizing and
     * expanding the call UI.
     */

    static STATE = {
        DEFAULT: { sidebar: false },
        PREVIOUS: { mode: null, sidebar: null, view: null }
    };

    state = {
        mode: undefined,
        view: Call.VIEW.PARTICIPANTS,
        sidebar: true,
        forcedLocal: false,
        invite: false,
        ephemeral: false,
        offline: false,
        ephemeralAccounts: [],
        everHadPeers: false,
        guest: Call.isGuest()
    };

    /**
     * isGuest
     * @description Returns the true if the current user is a guest.
     * @returns {boolean}
     */

    static isGuest = () => !u_type;

    /**
     * isModerator
     * @description Given `chatRoom` and `handle` -- returns true if the user is moderator.
     * @param chatRoom {ChatRoom}
     * @param handle {string}
     * @returns {boolean}
     */

    static isModerator = (chatRoom, handle) => {
        if (chatRoom && handle) {
            return chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.FULL;
        }
        return false;
    };

    /**
     * isExpanded
     * @description Returns true if the in-call UI is expanded; false when minimized.
     * @returns {boolean}
     */

    static isExpanded = () => document.body.classList.contains(EXPANDED_FLAG);

    /**
     * getUnsupportedBrowserMessage
     * @description Returns conditionally message for unsupported browser; used along w/ feature detection within
     * `megaChat.hasSupportForCalls`. The two message variants concern a) outdated browser version (e.g. Chromium-based)
     * or b) completely unsupported browsers, such as Safari/Firefox.
     * @see megaChat.hasSupportForCalls
     * @see Alert
     * @returns {String}
     */

    static getUnsupportedBrowserMessage = () =>
        navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./) ?
            l.alert_unsupported_browser_version :
            l.alert_unsupported_browser;

    constructor(props) {
        super(props);
        this.state.mode = props.call.viewMode;
        this.state.sidebar = props.chatRoom.type === 'public';
    }

    /**
     * handleReconnectTimeout
     * @description Invoked after the call have been retrying to reconnect for ~30 seconds.
     * @see render
     * @see Offline
     */

    handleRetryTimeout = () => {
        if (this.props.call.sfuClient.connState === SfuClient.ConnState.kDisconnectedRetrying) {
            this.handleCallEnd();
            this.props.chatRoom.trigger('onRetryTimeout');
            ion.sound.play(SOUNDS.CALL_END);
        }
    };

    /**
     * handleCallOffline
     * @description Invoked on `offline` event, handles the offline state. If the user have been ~30 seconds offline,
     * displays a dialog w/ relevant copy and actions.
     * @see Offline
     */

    handleCallOffline() {
        if (this.offlineDelayed) {
            return;
        }
        this.offlineDelayed = delay('callOffline', () => {
            this.setState({offline: true});
        }, 3e4);
    }

    /**
     * handleCallOnline
     * @description Invoked after coming back online. Resets the `offline` state if it was already set.
     * @see Offline
     */

    handleCallOnline = () => {
        delay.cancel(this.offlineDelayed);
        delete this.offlineDelayed;
        this.setState({ offline: false });
    };

    // Force as always visible.
    customIsEventuallyVisible = () => true;

    /**
     * bindCallEvents
     * @description Binds event handlers related to the `Local` and `Call` components.
     * `onCallPeerLeft`/`onCallPeerJoined` set the call mode depending on the number of participants
     * and show the call timeout dialog when the last peer leaves or resets that state on peer joined;
     * `onCallEnd` unmounts `Local` when the current room is not active and the in-call UI is minimized.
     * @see Local
     * @see MODE
     */

    bindCallEvents = () => {
        const { chatRoom } = this.props;
        chatRoom.rebind('onCallPeerLeft.callComp', () => {
            const { minimized, peers, call } = this.props;
            if (minimized) {
                this.setState({ mode: peers.length === 0 ? Call.MODE.THUMBNAIL : Call.MODE.MINI }, () => {
                    call.setViewMode(this.state.mode);
                });
            }
            else if (this.state.mode === Call.MODE.SPEAKER && call.forcedActiveStream &&
                !peers[call.forcedActiveStream]) {
                this.setState({ mode: Call.MODE.THUMBNAIL }, () => {
                    call.setViewMode(this.state.mode);
                });
            }
        });
        chatRoom.rebind('onCallPeerJoined.callComp', () => {
            const { minimized, peers, call } = this.props;
            if (minimized) {
                this.setState({ mode: peers.length === 0 ? Call.MODE.THUMBNAIL : Call.MODE.MINI }, () => {
                    call.setViewMode(this.state.mode);
                });
            }
            if (call.hasOtherParticipant()) {
                if (!this.state.everHadPeers) {
                    this.setState({everHadPeers: true});
                }
                if (this.callStartTimeout) {
                    clearTimeout(this.callStartTimeout);
                    delete this.callStartTimeout;
                }
            }
        });
        chatRoom.rebind('onCallLeft.callComp', () => this.props.minimized && this.props.onCallEnd());
    };

    unbindCallEvents = () =>
        ['onCallPeerLeft.callComp', 'onCallPeerJoined.callComp', 'onCallLeft.callComp'].map(event =>
            this.props.chatRoom.off(event)
        );

    /**
     * handleCallMinimize
     * @description Handles the minimize behavior for the call UI. Stores the current state, so it's restored after
     * expanding back the call UI.
     * @see handleCallExpand
     * @see ConversationPanel.toggleCallFlag
     * @returns {void|function}
     */

    handleCallMinimize = () => {
        const { call, peers, onCallMinimize } = this.props;
        const { mode, sidebar, view } = this.state;
        const { stayOnEnd } = call;
        // Cache previous state only when `Local` is not already minimized
        Call.STATE.PREVIOUS = mode !== Call.MODE.MINI ? { mode, sidebar, view } : Call.STATE.PREVIOUS;
        const noPeers = () => {
            onCallMinimize();
            if (typeof call.callToutId !== 'undefined' && !stayOnEnd) {
                onIdle(() => call.showTimeoutDialog());
            }
        };

        return (
            peers.length > 0 ?
                // There are peers, i.e. other call participants -> render `Local` in `mini mode`
                this.setState({ mode: Call.MODE.MINI, sidebar: false }, () => {
                    onCallMinimize();
                    call.setViewMode(Call.MODE.MINI);
                }) :
                // The call has one participant only (i.e. me) -> render `Local` in `self-view` mode
                noPeers()
        );
    };

    /**
     * handleCallExpand
     * @description Handles the expand behavior for the call UI. Restores the state that was cached prior to
     * minimizing the call UI.
     * @see handleCallMinimize
     * @see ConversationPanel.toggleCallFlag
     * @returns {Promise} Returns promise once the state is updated.
     */

    handleCallExpand = async() => {
        return new Promise((resolve) => {
            this.setState({...Call.STATE.PREVIOUS}, () => {
                this.props.onCallExpand();
                resolve();
            });
        });
    };

    /**
     * handleStreamToggle
     * @description Temporary debug method used to add or remove fake peers.
     * @param {number} action flag indicating the toggle action
     * @returns {void|boolean}
     */

    handleStreamToggle = action => {
        const { peers } = this.props;

        if (action === STREAM_ACTIONS.ADD && peers.length === MAX_STREAMS) {
            return;
        }

        return action === STREAM_ACTIONS.ADD ? peers.addFakeDupStream() : peers.removeFakeDupStream();
    };

    /**
     * handleSpeakerChange
     * @description Handles the selection of active speaker when in `Speaker Mode`.
     * @param {Peer|VideoNode} VideoNode the selected stream to set as active
     * @see Sidebar.renderSpeakerMode
     * @see Local.renderOptionsDialog
     * @see VideoNode.Pin
     * @returns {void}
     */

    handleSpeakerChange = videoNode => {
        if (videoNode) {
            this.handleModeChange(Call.MODE.SPEAKER);
            this.props.call.setForcedActiveStream(videoNode.clientId);
            this.setState({ forcedLocal: videoNode.isLocal });
        }
    };

    /**
     * handleModeChange
     * @description Sets the selected call mode (`Thumbnail`/`Speaker`).
     * @see Call.MODE
     * @see ModeSwitch
     * @param {MODE} mode flag indicating the selected call mode
     * @returns {void}
     */

    handleModeChange = mode => {
        this.props.call.setViewMode(mode);
        this.setState({
            mode,
            sidebar: true,
            // Both `Thumbnail` and `Speaker` modes are rendered with the `Participants` view in the `Sidebar`
            view: mode === Call.MODE.THUMBNAIL || mode === Call.MODE.SPEAKER ? Call.VIEW.PARTICIPANTS : this.state.view,
            forcedLocal: false
        });
    };

    /**
     * handleChatToggle
     * @description Toggles the chat in the `Sidebar`.
     * @see Sidebar.renderChatView
     * @see SidebarControls
     * @returns {void}
     */

    handleChatToggle = () => {
        if (this.state.sidebar && this.state.view === Call.VIEW.CHAT) {
            return this.setState({ ...Call.STATE.DEFAULT });
        }
        return this.setState({ sidebar: true, view: Call.VIEW.CHAT });
    };

    /**
     * handleParticipantsToggle
     * @description Toggles the participants list in the `Sidebar`.
     * @see Sidebar.renderParticipantsView
     * @see SidebarControls
     * @returns {void}
     */

    handleParticipantsToggle = () => {
        if (this.state.sidebar && this.state.view === Call.VIEW.CHAT) {
            return this.setState({ sidebar: true, view: Call.VIEW.PARTICIPANTS });
        }
        return this.setState({ sidebar: !this.state.sidebar, view: Call.VIEW.PARTICIPANTS });
    };

    /**
     * handleInviteToggle
     * @description Toggles the `Invite` dialog.
     * @see Invite
     * @see Sidebar.renderHead
     * @see Stream.renderStreamContainer
     * @returns {void}
     */

    handleInviteToggle = () => {
        if (M.u.length > 1) {
            const participants = excludedParticipants(this.props.chatRoom);

            if (allContactsInChat(participants)) {
                msgDialog(
                    `confirmationa:!^${l[8726]}!${l[82]}`,
                    null,
                    `${l.all_contacts_added}`,
                    `${l.all_contacts_added_to_chat}`,
                    (res) => {
                        if (res) {
                            contactAddDialog(null, false);
                        }
                    }
                );
            }
            else {
                this.setState({ invite: !this.state.invite });
            }
        }
        else {
            msgDialog(// new user adding a partcipant
                `confirmationa:!^${l[8726]}!${l[82]}`,
                null,
                `${l.no_contacts}`,
                `${l.no_contacts_text}`,
                (resp) => {
                    if (resp) {
                        contactAddDialog(null, false);
                    }
                }
            );
        }
    };

    /**
     * handleHoldToggle
     * @description Handles the on hold behavior. Sends `mBroadcaster` message to `Stream` where the
     * grid is recalculated.
     * @see Stream.callHoldListener
     * @returns {void}
     */

    handleHoldToggle = async() => {
        await this.props.call.toggleHold();
        mBroadcaster.sendMessage('meetings:toggleHold');
    };

    /**
     * handleScreenSharingToggle
     * @description Handles the screen sharing behavior. Includes temporary check targeting Chrome 92, due recent bug
     * affecting screen sharing.
     * @returns {Promise|void}
     */

    handleScreenSharingToggle = () => {
        const { call } = this.props;
        const userAgent = navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./);
        const version = parseInt(userAgent[2], 10);

        if (version === 92) {
            return msgDialog('info', undefined, l[47], l.chrome_screensharing);
        }

        return call.toggleScreenSharing();
    };

    /**
     * handleCallEnd
     * @description Handles the call end behavior
     * @see CallManager.Call
     * @returns {void}
     */

    handleCallEnd = l => {
        const { call } = this.props;
        if (l) {
            eventlog(99760, JSON.stringify([call.callId, 0]));
        }
        call.destroy();
    };

    /**
     * handleEphemeralAdd
     * @description Handles the `Add Contact` behavior specific to ephemeral accounts. Keeps track of the user
     * handles of the ephemeral accounts on which the `Add contact` was invoked on, and displays info dialog.
     * @param {string} handle the user handle of the account on which `Add Contact` was fired on
     * @see Ephemeral
     * @see VideoNodeMenu.Contact
     * @returns {false|void}
     */

    handleEphemeralAdd = handle =>
        handle && this.setState(state => ({
            ephemeral: true,
            ephemeralAccounts: [...state.ephemeralAccounts, handle]
        }));

    handleStayConfirm = () => {
        const { call } = this.props;
        call.handleStayConfirm();
        onIdle(() => this.safeForceUpdate());
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        const { minimized, willUnmount, chatRoom } = this.props;
        if (willUnmount) {
            willUnmount(minimized);
        }
        if (this.ephemeralAddListener) {
            mBroadcaster.removeListener(this.ephemeralAddListener);
        }
        chatRoom.megaChat.off('sfuConnClose.call');
        chatRoom.megaChat.off('sfuConnOpen.call');
        this.unbindCallEvents();
        if (this.callStartTimeout) {
            clearTimeout(this.callStartTimeout);
        }
        delay.cancel('callOffline');
    }

    componentDidMount() {
        super.componentDidMount();
        const { didMount, chatRoom } = this.props;
        if (didMount) {
            didMount();
        }
        this.ephemeralAddListener = mBroadcaster.addListener('meetings:ephemeralAdd', handle =>
            this.handleEphemeralAdd(handle)
        );
        chatRoom.megaChat.rebind('sfuConnOpen.call', this.handleCallOnline);
        chatRoom.megaChat.rebind('sfuConnClose.call', () => this.handleCallOffline());
        this.bindCallEvents();
        const { SOUNDS } = megaChat.CONSTANTS;
        [SOUNDS.RECONNECT, SOUNDS.CALL_END].map(sound => ion.sound.preload(sound));
        this.callStartTimeout = setTimeout(() => {
            const { call } = this.props;
            if (
                !mega.config.get('callemptytout')
                && !call.hasOtherParticipant()
            ) {
                call.left = true;
                call.initCallTimeout();
            }
            delete this.callStartTimeout;
        }, 300 * 1000);
        setTimeout(() => {
            const { call } = this.props;
            const peers = call.peers;
            if (peers && peers.length && !call.hasOtherParticipant()) {
                this.setState({everHadPeers: true});
            }
        }, 2000);
    }

    render() {
        const { minimized, peers, call, chatRoom, parent, onDeleteMessage } = this.props;
        const {
            mode, view, sidebar, forcedLocal, invite, ephemeral, ephemeralAccounts, guest,
            offline, everHadPeers
        } = this.state;
        const { stayOnEnd } = call;
        const STREAM_PROPS = {
            mode, peers, sidebar, forcedLocal, call, view, chatRoom, parent, stayOnEnd,
            everHadPeers,
            hasOtherParticipants: call.hasOtherParticipant(),
            isOnHold: call.sfuClient.isOnHold(), onSpeakerChange: this.handleSpeakerChange,
            onInviteToggle: this.handleInviteToggle, onStayConfirm: this.handleStayConfirm,
        };

        //
        // `Call`
        // -------------------------------------------------------------------------
        return (
            <div className={`meetings-call ${minimized ? 'minimized' : ''}`}>
                <Stream
                    {...STREAM_PROPS}
                    minimized={minimized}
                    ephemeralAccounts={ephemeralAccounts}
                    onCallMinimize={this.handleCallMinimize}
                    onCallExpand={this.handleCallExpand}
                    onCallEnd={this.handleCallEnd}
                    onStreamToggle={this.handleStreamToggle}
                    onModeChange={this.handleModeChange}
                    onChatToggle={this.handleChatToggle}
                    onParticipantsToggle={this.handleParticipantsToggle}
                    onAudioClick={() => call.toggleAudio()}
                    onVideoClick={() => call.toggleVideo()}
                    onScreenSharingClick={this.handleScreenSharingToggle}
                    onHoldClick={this.handleHoldToggle}
                    onThumbnailDoubleClick={(videoNode) => this.handleSpeakerChange(videoNode)}
                />

                {sidebar && (
                    <Sidebar
                        {...STREAM_PROPS}
                        guest={guest}
                        onGuestClose={() => this.setState({ guest: false })}
                        onSidebarClose={() => this.setState({ ...Call.STATE.DEFAULT })}
                        onDeleteMessage={onDeleteMessage}
                    />
                )}

                {invite && (
                    <Invite
                        contacts={M.u}
                        chatRoom={chatRoom}
                        onClose={() => this.setState({ invite: false })}
                    />
                )}

                {ephemeral && (
                    <Ephemeral
                        ephemeralAccounts={ephemeralAccounts}
                        onClose={() => this.setState({ ephemeral: false })}
                    />
                )}

                {offline && (
                    <Offline
                        onClose={() => {
                            if (offline) {
                                this.setState({ offline: false }, () =>
                                    delay('call:timeout', this.handleRetryTimeout, 3e4)
                                );
                            }
                        }}
                        onCallEnd={() => {
                            this.setState({ offline: false }, () =>
                                this.handleRetryTimeout()
                            );
                        }}
                    />
                )}
            </div>
        );
    }
}
