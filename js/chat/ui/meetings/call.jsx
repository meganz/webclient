import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Stream, { STREAM_ACTIONS, MAX_STREAMS } from './stream.jsx';
import Sidebar from './sidebar.jsx';
import Invite from './workflow/invite/invite.jsx';
import End from './workflow/end.jsx';
import Ephemeral from './workflow/ephemeral.jsx';

export const EXPANDED_FLAG = 'in-call';

export default class Call extends MegaRenderMixin {

    ephemeralAddListener = null;

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
        end: false,
        ephemeral: false,
        ephemeralAccounts: [],
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

    constructor(props) {
        super(props);
        this.state.mode = props.call.viewMode;
        this.state.sidebar = props.chatRoom.type === 'public';
    }

    // Force as always visible.
    customIsEventuallyVisible = () => true;

    /**
     * handleCallMinimize
     * @description Handles the minimize behavior for the call UI. Stores the current state, so it's restored after
     * expanding back the call UI.
     * @see handleCallExpand
     * @see ConversationPanel.toggleCallFlag
     * @returns {void|function}
     */

    handleCallMinimize = () => {
        const { call, streams, onCallMinimize } = this.props;
        const { mode, sidebar, view } = this.state;
        // Cache previous state only when `Local` is not already minimized
        Call.STATE.PREVIOUS = mode !== Call.MODE.MINI ? { mode, sidebar, view } : Call.STATE.PREVIOUS;

        return (
            streams.length > 0 ?
                // There are peers, i.e. other call participants -> render `Local` in `mini mode`
                this.setState({ mode: Call.MODE.MINI, sidebar: false }, () => {
                    onCallMinimize();
                    call.setViewMode(Call.MODE.MINI);
                }) :
                // The call has one participant only (i.e. me) -> render `Local` in `self-view` mode
                onCallMinimize()
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

    bindMiniEvents = () => {
        const { chatRoom } = this.props;
        ['onCallPeerLeft.mini', 'onCallPeerJoined.mini'].forEach(event => {
            chatRoom.rebind(event, () => {
                const { minimized, streams, call } = this.props;
                if (minimized) {
                    this.setState({mode: streams.length === 0 ? Call.MODE.THUMBNAIL : Call.MODE.MINI}, () => {
                        call.setViewMode(this.state.mode);
                    });
                }
            });
        });
    };

    unbindMiniEvents = () => {
        const { chatRoom } = this.props;
        chatRoom.off('onCallPeerLeft.mini');
        chatRoom.off('onCallPeerJoined.mini');
    };

    /**
     * handleStreamToggle
     * @description Temporary debug method used to add or remove fake streams.
     * @param {number} action flag indicating the toggle action
     * @returns {void|boolean}
     */

    handleStreamToggle = action => {
        const { streams } = this.props;

        if (action === STREAM_ACTIONS.ADD && streams.length === MAX_STREAMS) {
            return;
        }

        return action === STREAM_ACTIONS.ADD ? streams.addFakeDupStream() : streams.splice(-1, 1);
    };

    /**
     * handleSpeakerChange
     * @description Handles the selection of active speaker when in `Speaker Mode`.
     * @param {Peer|StreamNode} streamNode the selected stream to set as active
     * @see Sidebar.renderSpeakerMode
     * @see Local.renderOptionsDialog
     * @see StreamNode.Pin
     * @returns {void}
     */

    handleSpeakerChange = streamNode => {
        if (streamNode) {
            this.handleModeChange(Call.MODE.SPEAKER);
            this.props.call.setForcedActiveStream(streamNode.clientId);
            this.setState({ forcedLocal: streamNode.userHandle === u_handle });
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

    handleInviteToggle = () => this.setState({ invite: !this.state.invite });

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
     * @description Handles the call end behavior. The `End` dialog is shown if the current user ending the call is
     * the only moderator (not integrated currently).
     * @see End
     * @returns {void}
     */

    handleCallEnd = () => {
        const { chatRoom } = this.props;
        const localStream = document.querySelector('.local-stream');
        if (localStream && !chatRoom.isCurrentlyActive) {
            localStream.classList.add('hidden');
        }
        chatRoom.sfuApp?.destroy();
    };

    /**
     * handleEphemeralAdd
     * @description Handles the `Add Contact` behavior specific to ephemeral accounts. Keeps track of the user
     * handles of the ephemeral accounts on which the `Add contact` was invoked on, and displays info dialog.
     * @param {string} handle the user handle of the account on which `Add Contact` was fired on
     * @see Ephemeral
     * @see StreamNodeMenu.Contact
     * @returns {false|void}
     */

    handleEphemeralAdd = handle =>
        handle && this.setState(state => ({
            ephemeral: true,
            ephemeralAccounts: [...state.ephemeralAccounts, handle]
        }));

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.props.willUnmount) {
            this.props.willUnmount(this.props.minimized);
        }
        if (this.ephemeralAddListener) {
            mBroadcaster.removeListener(this.ephemeralAddListener);
        }
        this.unbindMiniEvents();
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.didMount) {
            this.props.didMount();
        }
        this.ephemeralAddListener = mBroadcaster.addListener('meetings:ephemeralAdd', handle =>
            this.handleEphemeralAdd(handle)
        );
        this.bindMiniEvents();
    }

    render() {
        const { minimized, streams, call, chatRoom, parent, sfuApp, onDeleteMessage } = this.props;
        const { mode, view, sidebar, forcedLocal, invite, end, ephemeral, ephemeralAccounts, guest } = this.state;
        const STREAM_PROPS = {
            mode,
            streams,
            sidebar,
            forcedLocal,
            call,
            view,
            chatRoom,
            parent,
            isOnHold: sfuApp.sfuClient.isOnHold(),
            onSpeakerChange: this.handleSpeakerChange,
            onInviteToggle: this.handleInviteToggle
        };

        //
        // `Call`
        // -------------------------------------------------------------------------

        return (
            <div className={`meetings-call ${minimized ? 'minimized' : ''}`}>
                <Stream
                    {...STREAM_PROPS}
                    sfuApp={sfuApp}
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
                    onThumbnailDoubleClick={(streamNode) => this.handleSpeakerChange(streamNode)}
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

                {end && (
                    <End
                        sfuApp={sfuApp}
                        onClose={() => this.setState({ end: false })}
                    />
                )}

                {ephemeral && (
                    <Ephemeral
                        ephemeralAccounts={ephemeralAccounts}
                        onClose={() => this.setState({ ephemeral: false })}
                    />
                )}
            </div>
        );
    }
}
