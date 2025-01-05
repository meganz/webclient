import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import utils, { ParsedHTML } from '../../../ui/utils.jsx';
import Button from './button.jsx';
import { MODE, VIEW } from './call.jsx';
import {
    LocalVideoThumb,
    LocalVideoHiRes,
    PeerVideoHiRes,
    LocalVideoHiResCloned,
    AudioLevelIndicator
} from './videoNode.jsx';
import FloatExtendedControls from './floatExtendedControls.jsx';
import { withMicObserver } from './micObserver.jsx';
import { withPermissionsObserver } from './permissionsObserver.jsx';
import { withHostsObserver } from './hostsObserver.jsx';
import { renderLeaveConfirm } from './streamControls';

export default class FloatingVideo extends React.Component {
    collapseListener = null;

    static NAMESPACE = 'float-video';
    static POSITION_MODIFIER = 'with-sidebar';

    state = {
        collapsed: false,
    };

    // Historic adaptive ratio class behaviour
    // gcd = (width, height) => {
    //     return height === 0 ? width : this.gcd(height, width % height);
    // };
    //
    // getRatio = (width, height) => {
    //     return `${width / this.gcd(width, height)}:${height / this.gcd(width, height)}`;
    // };
    //
    // getRatioClass = () => {
    //     const { ratio } = this.state;
    //     return ratio ? `ratio-${ratio.replace(':', '-')}` : '';
    // };

    toggleCollapsedMode = () => {
        return this.setState(state => ({ collapsed: !state.collapsed }));
    };

    onLoadedData = ev => {
        // const { videoWidth, videoHeight } = ev.target;
        // this.setState({ ratio: this.getRatio(videoWidth, videoHeight) });
    };

    componentWillUnmount() {
        mBroadcaster.removeListener(this.collapseListener);
    }

    componentDidMount() {
        this.collapseListener = mBroadcaster.addListener('meetings:collapse', () => this.setState({ collapsed: true }));
    }

    render() {
        const { peers, minimized, call, floatDetached } = this.props;

        // Only one call participant (i.e. me) -> render `FloatingVideo` only if the call is minimized or if
        // I am sharing screen
        if (peers.length === 0 && !minimized && !call.isSharingScreen()) {
            return null;
        }

        //
        // `FloatingVideo`
        // -------------------------------------------------------------------------

        const STREAM_PROPS = {
            ...this.props,
            collapsed: this.state.collapsed,
            toggleCollapsedMode: this.toggleCollapsedMode,
            onLoadedData: this.onLoadedData
        };

        if (minimized) {
            return (
                <utils.RenderTo element={document.body}>
                    <Stream {...STREAM_PROPS} />
                </utils.RenderTo>
            );
        }

        return floatDetached ? <Stream {...STREAM_PROPS} /> : null;
    }
}

// --

class Stream extends MegaRenderMixin {
    domRef = React.createRef();

    DRAGGABLE = {
        POSITION: {
            top: undefined,
            left: undefined
        },
        OPTIONS: {
            scroll: 'false',
            cursor: 'move',
            opacity: 1,
            start: () => {
                if (this.state.options) {
                    this.handleOptionsToggle();
                }
                $(document.body).trigger('closeAllDropdownsExcept');
            },
            stop: (event, ui) => {
                this.DRAGGABLE.POSITION = ui.position;
                const {clientWidth, clientHeight} = document.body;
                const {helper} = ui;
                const {left, top} = this.DRAGGABLE.POSITION;
                if (left < clientWidth / 2) {
                    helper.css('left', `${left / clientWidth * 100}%`).css('right', 'unset');
                }
                else {
                    helper.css('left', 'unset').css('right', `${clientWidth - left - helper.width()}px`);
                }
                if (top < clientHeight / 2) {
                    helper.css('top', `${top / clientHeight * 100}%`).css('bottom', 'unset');
                }
                else {
                    helper.css('top', 'unset').css('bottom', `${clientHeight - top - helper.height()}px`);
                }
            }
        }
    };

    EVENTS = {
        MINIMIZE: [
            'slideshow:open',
            'contact:open',
            'textEditor:open',
            'chat:open'
        ],
        EXPAND: [
            'slideshow:close',
            'textEditor:close',
        ]
    };

    LISTENERS = [];

    PREV_STATE = {};

    state = {
        options: false
    };

    /**
     * getStreamSource
     * @description Retrieves the stream source based on the current call mode.
     * @see MODE
     * @see renderMiniMode
     * @see renderSelfView
     */

    getStreamSource = () => {
        const { call, mode, forcedLocal } = this.props;
        return mode === MODE.MINI && !forcedLocal ? call.getActiveStream() : call.getLocalStream();
    };

    unbindEvents = () => {
        const events = [...this.EVENTS.MINIMIZE, ...this.EVENTS.EXPAND];
        for (let i = events.length; i--;) {
            const event = events[i];
            mBroadcaster.removeListener(this.LISTENERS[event]);
        }
        document.removeEventListener('click', this.handleOptionsClose);
    };

    bindEvents = () => {
        // Minimize the call UI on `Preview`, `Contacts`, `Text Editor`, etc
        for (let i = this.EVENTS.MINIMIZE.length; i--;) {
            const event = this.EVENTS.MINIMIZE[i];
            this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
                this.PREV_STATE.minimised = this.props.minimized;
                return this.props.onCallMinimize();
            });
        }

        // Expand back the call UI after closing `Preview`, `Text Editor`, etc --
        // assuming they have been opened from within the sidebar chat.
        for (let i = this.EVENTS.EXPAND.length; i--;) {
            const event = this.EVENTS.EXPAND[i];
            this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
                if (this.PREV_STATE.minimised) {
                    delete this.PREV_STATE.minimised;
                    return;
                }
                delete this.PREV_STATE.minimised;
                return this.props.view === VIEW.CHAT && this.props.onCallExpand();
            });
        }

        // Close the options menu on click outside the `FloatingVideo` component
        document.addEventListener('click', this.handleOptionsClose);
    };

    initDraggable = () => {
        const { minimized, wrapperRef } = this.props;
        const containerEl = this.domRef?.current;

        if (containerEl) {
            $(containerEl).draggable({
                ...this.DRAGGABLE.OPTIONS,
                // Constrain the dragging to within the bounds of the body (in minimized mode) or the stream
                // container (when the call is expanded, excl. the sidebar)
                containment: minimized ? 'body' : wrapperRef?.current
            });
        }
    };

    /**
     * repositionDraggable
     * @description Updates the position of the `FloatingVideo` component. The position update is applied
     * only if `FloatingVideo` is positioned above the sidebar.
     */

    repositionDraggable = () => {
        const wrapperEl = this.props.wrapperRef?.current;
        const localEl = this.domRef?.current;

        if (localEl.offsetLeft + localEl.offsetWidth > wrapperEl.offsetWidth) {
            localEl.style.left = 'unset';
            localEl.style.removeProperty("right");
        }
    };

    /**
     * handleOptionsClose
     * @description Handles the closing of the options menu.
     * @param {Object} target the event target
     * @returns {unknown}
     */

    handleOptionsClose = ({ target }) => {
        // The options menu is opened and the target is not the options menu opener
        if (this.state.options && !target.classList.contains('icon-options')) {
            this.setState({ options: false });
        }
    };

    /**
     * handleOptionsToggle
     * @description
     * @returns {void}
     */

    handleOptionsToggle = () => this.setState({ options: !this.state.options });

    /**
     * renderOnHoldVideoNode
     * @description Renders `VideoNode` with empty stream source that displays the user's avatar only.
     * @see VideoNode
     * @see renderContent
     * @returns {JSX.Element}
     */

    renderOnHoldVideoNode = () =>
        <LocalVideoHiRes
            chatRoom={this.props.chatRoom}
        />;

    renderOptionsDialog = () => {
        const {
            call,
            mode,
            forcedLocal,
            onScreenSharingClick,
            onSpeakerChange,
            onModeChange,
            toggleCollapsedMode,
            onMoveIntoGrid
        } = this.props;
        // `Main` mode and `forcedLocal` -> `Display in main view`, i.e. the local stream is in `Main` mode
        const IS_SPEAKER_VIEW = mode === MODE.MAIN && forcedLocal;
        const { POSITION } = this.DRAGGABLE;

        return (
            <div
                className={`
                     ${FloatingVideo.NAMESPACE}-options
                     ${POSITION.left < 200 ? 'options-top' : ''}
                     ${POSITION.left < 200 && POSITION.top < 100 ? 'options-bottom' : ''}
                     theme-dark-forced
                 `}>
                <ul>
                    <li>
                        <Button
                            icon={`
                                sprite-fm-mono
                                ${IS_SPEAKER_VIEW ? 'grid-9' : 'grid-main'}
                            `}
                            onClick={() =>
                                this.setState({ options: false }, () => {
                                    if (IS_SPEAKER_VIEW) {
                                        return onModeChange(MODE.THUMBNAIL);
                                    }
                                    onSpeakerChange(call.getLocalStream());
                                })
                            }>
                            <div>
                                {IS_SPEAKER_VIEW ?
                                    l.switch_to_thumb_view /* `Switch to thumbnail view` */ :
                                    l.display_in_main_view /* `Display in main view` */}
                            </div>
                        </Button>
                    </li>
                    <li>
                        <Button
                            icon="sprite-fm-mono icon-collapse-up"
                            onClick={onMoveIntoGrid}>
                            <div>{l.move_into_grid_button /* `Move into grid` */}</div>
                        </Button>
                    </li>
                    <li>
                        <Button
                            icon="sprite-fm-mono icon-download-standard"
                            onClick={() => this.setState({ options: false }, () => toggleCollapsedMode())}>
                            <div>{l.collapse_self_video}</div>
                        </Button>
                    </li>
                </ul>
                {!!(call.av & SfuClient.Av.Screen) && (
                    <ul className="has-separator">
                        <li>
                            <Button
                                className="end-screen-share"
                                icon="icon-end-screenshare"
                                onClick={() => {
                                    this.setState({ options: false });
                                    onScreenSharingClick();
                                }}>
                                <div>{l[22890] /* `End screen sharing` */}</div>
                            </Button>
                        </li>
                    </ul>
                )}
            </div>
        );
    };

    renderMiniMode = (source) => {
        const { call, mode, minimized, isPresenterNode, onLoadedData } = this.props;

        if (call.isOnHold) {
            return this.renderOnHoldVideoNode();
        }
        let VideoClass = PeerVideoHiRes;
        if (source.isLocal) {
            VideoClass = isPresenterNode ? LocalVideoHiRes : LocalVideoThumb;
        }
        return (
            <VideoClass
                chatRoom={this.props.chatRoom}
                mode={mode}
                minimized={minimized}
                isPresenterNode={isPresenterNode}
                onLoadedData={onLoadedData}
                source={source} // ignored for LocalVideoHiRes
                key={source}
            />
        );
    };

    renderSelfView = () => {
        const { isOnHold, raisedHandPeers, minimized, chatRoom, isPresenterNode, call, onLoadedData } = this.props;
        const { options } = this.state;

        if (isOnHold) {
            return this.renderOnHoldVideoNode();
        }

        const VideoNode = call.isSharingScreen() ? LocalVideoHiResCloned : LocalVideoThumb;
        return (
            <>
                <VideoNode
                    isSelfOverlay={true}
                    raisedHandPeers={raisedHandPeers}
                    minimized={minimized}
                    chatRoom={chatRoom}
                    isPresenterNode={isPresenterNode}
                    onLoadedData={onLoadedData}
                />
                <div className={`${FloatingVideo.NAMESPACE}-self-overlay`}>
                    {minimized ?
                        null :
                        <Button
                            className={`
                                mega-button
                                theme-light-forced
                                action
                                small
                                float-video-options-control
                                ${options ? 'active' : ''}
                            `}
                            icon="sprite-fm-mono icon-options"
                            onClick={() => this.handleOptionsToggle()}
                        />
                    }
                    {options && this.renderOptionsDialog()}
                </div>
            </>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }

    componentDidUpdate(prevProps) {
        super.componentDidUpdate();

        // Reinitialize the drag behavior if the view mode had been changed
        if (this.props.mode !== prevProps.mode) {
            this.initDraggable();
        }

        // Reposition the `FloatingVideo` if the sidebar had been toggled and it's currently open
        if (this.props.sidebar !== prevProps.sidebar && this.props.sidebar) {
            this.repositionDraggable();
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
        this.initDraggable();
    }

    render() {
        const { NAMESPACE, POSITION_MODIFIER } = FloatingVideo;
        const { call, mode, minimized, sidebar, collapsed, toggleCollapsedMode, onCallExpand } = this.props;
        const IS_MINI_MODE = mode === MODE.MINI;
        const IS_SELF_VIEW = !IS_MINI_MODE;

        if (collapsed) {
            return (
                <div
                    ref={this.domRef}
                    className={`
                        ${NAMESPACE}
                        collapsed
                        theme-dark-forced
                        ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                    `}
                    onClick={toggleCollapsedMode}>
                    <i className="sprite-fm-mono icon-arrow-up icon-collapse" />
                    <div className="collapsed-audio-indicator">
                        <AudioLevelIndicator source={call.getLocalStream()} />
                    </div>
                </div>
            );
        }

        const source = this.getStreamSource() || call.getLocalStream();
        return (
            <div
                ref={this.domRef}
                className={`
                    ${NAMESPACE}
                    ${IS_MINI_MODE ? 'mini' : ''}
                    ${minimized ? 'minimized' : ''}
                    ${this.state.options ? 'active' : ''}
                    ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                `}
                onClick={({ target }) =>
                    // Expand back the in-call UI if:
                    // - `FloatingVideo` is in minimized mode
                    // - clicked on the overlay area (excl. the options menu, audio/video/end call controls)
                    minimized && target.classList.contains(`${NAMESPACE}-overlay`) && onCallExpand()
                }>
                {IS_MINI_MODE &&
                    // `FloatingVideo` in **mini mode** is rendered when the call is minimized and displays the active
                    // speaker. The current user's video/screen sharing stream can be displayed in mini mode only when
                    // the current user is set as active speaker manually (`forcedLocal`).
                    this.renderMiniMode(source)
                }
                {IS_SELF_VIEW &&
                    // `FloatingVideo` in **self view** is rendered only when the call is expanded, displaying
                    // the current user's video/screen sharing stream.
                    this.renderSelfView()
                }
                {minimized && <__Minimized {...this.props} onOptionsToggle={this.handleOptionsToggle} />}
            </div>
        );
    }
}

// --

class Minimized extends MegaRenderMixin {
    static NAMESPACE = 'float-video-minimized';
    static UNREAD_EVENT = 'onUnreadCountUpdate.localStreamNotifications';

    domRef = React.createRef();

    SIMPLETIP_PROPS = { position: 'top', offset: 5, className: 'theme-dark-forced' };
    waitingPeersListener = undefined;
    raisedHandListener = undefined;

    state = {
        unread: 0,
        waitingRoomPeers: [],
        raisedHandPeers: [],
        hideWrList: false,
        hideHandsList: false,
    };

    constructor(props) {
        super(props);
        this.state.waitingRoomPeers = this.props.waitingRoomPeers || [];
        this.state.raisedHandPeers = this.props.raisedHandPeers || [];
    }

    isActive = type => {
        return this.props.call.av & type;
    };

    getUnread = () => {
        const { chatRoom } = this.props;
        chatRoom.rebind(Minimized.UNREAD_EVENT, () =>
            this.setState({ unread: chatRoom.getUnreadCount() }, () =>
                this.safeForceUpdate()
            )
        );
    };

    renderSignalWarning = () => this.props.signal ? null : this.props.renderSignalWarning();

    renderPermissionsWarning = type => {
        const { hasToRenderPermissionsWarning, renderPermissionsWarning } = this.props;
        if (hasToRenderPermissionsWarning(type)) {
            return renderPermissionsWarning(type, this);
        }
        return null;
    };

    renderStreamControls = () => {
        const {
            call,
            chatRoom,
            recorderCid,
            hasToRenderPermissionsWarning,
            renderPermissionsWarning,
            resetError,
            onRecordingToggle,
            onAudioClick,
            onVideoClick,
            onScreenSharingClick,
            onHoldClick,
            onCallEnd
        } = this.props;
        // `Mute` || `Unmute`
        const audioLabel = this.isActive(SfuClient.Av.Audio) ? l[16214] : l[16708];
        // `Disable video` || `Enable video`
        const videoLabel = this.isActive(SfuClient.Av.Camera) ? l[22894] : l[22893];
        const LeaveButton = withHostsObserver(({ hasHost, chatRoom, confirmLeave, onLeave }) => {
            return (
                <Button
                    simpletip={{ ...this.SIMPLETIP_PROPS, label: l[5884] /* `End call` */ }}
                    className="mega-button theme-dark-forced round large end-call"
                    icon="icon-phone-02"
                    onClick={ev => {
                        ev.stopPropagation();
                        const callParticipants = chatRoom.getCallParticipants();
                        const doLeave = () =>
                            !chatRoom.iAmOperator() || hasHost(
                                chatRoom.call ? chatRoom.call.peers.map(a => a.userHandle) : []
                            ) || callParticipants.length === 1 ?
                                onLeave() :
                                confirmLeave({
                                    title: l.assign_host_leave_call /* `Assign host to leave call` */,
                                    body: l.assign_host_leave_call_details /* `You're the only host on this call...` */,
                                    cta: l.assign_host_button /* `Assign host` */,
                                    altCta: l.leave_anyway /* `Leave anyway` */,
                                });

                        return (
                            recorderCid && recorderCid === call.sfuClient.cid ?
                                renderLeaveConfirm(doLeave, onRecordingToggle) :
                                doLeave()
                        );
                    }}>
                    <span>{l[5884] /* `End call` */}</span>
                </Button>
            );
        });

        return (
            <>
                <div className={`${FloatingVideo.NAMESPACE}-controls`}>
                    <div className="meetings-signal-container">
                        <Button
                            simpletip={{ ...this.SIMPLETIP_PROPS, label: audioLabel }}
                            className={`
                                mega-button
                                theme-light-forced
                                round
                                ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                ${this.isActive(SfuClient.Av.Audio) ? '' : 'with-fill'}
                            `}
                            icon={
                                this.isActive(SfuClient.Av.Audio) ?
                                    'icon-mic-thin-outline' :
                                    'icon-mic-off-thin-outline'
                            }
                            onClick={ev => {
                                ev.stopPropagation();
                                resetError(Av.Audio);
                                onAudioClick();
                            }}>
                            <span>{audioLabel}</span>
                        </Button>
                        {this.renderSignalWarning()}
                        {this.renderPermissionsWarning(Av.Audio)}
                    </div>
                    <div className="meetings-signal-container">
                        <Button
                            simpletip={{ ...this.SIMPLETIP_PROPS, label: videoLabel }}
                            className={`
                                mega-button
                                theme-light-forced
                                round
                                ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                ${this.isActive(SfuClient.Av.Camera) ? '' : 'with-fill'}
                            `}
                            icon={
                                this.isActive(SfuClient.Av.Camera) ?
                                    'icon-video-thin-outline' :
                                    'icon-video-off-thin-outline'
                            }
                            onClick={ev => {
                                ev.stopPropagation();
                                resetError(Av.Camera);
                                onVideoClick();
                            }}>
                            <span>{videoLabel}</span>
                        </Button>
                        {this.renderPermissionsWarning(Av.Camera)}
                    </div>
                    <div className="meetings-signal-container">
                        <FloatExtendedControls
                            call={call}
                            chatRoom={chatRoom}
                            onScreenSharingClick={onScreenSharingClick}
                            onHoldClick={onHoldClick}
                            hasToRenderPermissionsWarning={hasToRenderPermissionsWarning}
                            renderPermissionsWarning={renderPermissionsWarning}
                            resetError={resetError}
                            showScreenDialog={!!this.props[`dialog-${Av.Screen}`]}
                        />
                        {this.renderPermissionsWarning(Av.Screen)}
                    </div>
                    <LeaveButton
                        chatRoom={chatRoom}
                        participants={chatRoom.getCallParticipants()}
                        onLeave={onCallEnd}
                        onConfirmDenied={onCallEnd}
                    />
                </div>
                <span className={`${FloatingVideo.NAMESPACE}-fade`}/>
            </>
        );
    };

    renderPeersList = () => {
        const { onCallExpand, onParticipantsToggle, onWrListToggle } = this.props;
        const { waitingRoomPeers, raisedHandPeers, hideHandsList, hideWrList } = this.state;
        if (hideHandsList && hideWrList) {
            return null;
        }
        const showRaised = hideHandsList || !hideWrList && waitingRoomPeers.length ? false : !!raisedHandPeers.length;
        if (!showRaised && hideWrList) {
            return null;
        }
        const showButton = !showRaised || showRaised && raisedHandPeers.length > 1;

        return (
            <div
                className={`
                    ${FloatingVideo.NAMESPACE}-alert
                    alert--waiting-peers
                    theme-dark-forced
                `}
                onClick={onCallExpand}>
                <Button
                    className="close js-close"
                    icon="sprite-fm-mono icon-dialog-close"
                    hideWrList={hideWrList}
                    hideHandsList={hideHandsList}
                    onClick={ev => {
                        ev.stopPropagation();
                        this.setState({
                            hideHandsList: hideWrList || showRaised,
                            hideWrList: true,
                        });
                    }}
                />
                <div className={`alert-label ${showButton ? '' : 'label-only'}`}>
                    {showRaised && <i className="sprite-fm-uni icon-raise-hand"/>}
                    {!hideWrList && !!waitingRoomPeers.length &&
                        mega.icu.format(l.wr_peers_waiting, waitingRoomPeers.length)}
                    {showRaised && (
                        raisedHandPeers.length > 1 ?
                            (
                                raisedHandPeers.includes(u_handle) ?
                                    mega.icu.format(l.raise_self_peers_raised, raisedHandPeers.length - 1) :
                                    mega.icu.format(l.raise_peers_raised, raisedHandPeers.length)
                            ) :
                            <ParsedHTML
                                tag="span"
                                content={
                                    raisedHandPeers[0] === u_handle ?
                                        l.raise_self_raised :
                                        l.raise_peer_raised
                                            .replace('%s', megaChat.html(M.getNameByHandle(raisedHandPeers[0])))
                                }
                            />
                    )}
                </div>
                {showButton && <Button
                    className="show-people"
                    label={showRaised ? l[16797] : l.wr_see_waiting}
                    onClick={ev => {
                        ev.stopPropagation();
                        const promise = onCallExpand().catch(dump);
                        if (showRaised) {
                            promise.then(() => onParticipantsToggle(true));
                        }
                        else if (waitingRoomPeers.length > 1) {
                            promise.then(() => onWrListToggle(true));
                        }
                    }}>
                    {showRaised ? l[16797] : l.wr_see_waiting}
                </Button>}
            </div>
        );
    };

    componentDidMount() {
        super.componentDidMount();
        this.getUnread();

        this.waitingPeersListener =
            mBroadcaster.addListener(
                'meetings:peersWaiting',
                waitingRoomPeers => this.setState({
                    waitingRoomPeers,
                    hideWrList: false,
                    hideHandsList: false
                }, () => this.safeForceUpdate())
            );

        // [...] TODO: higher-order component
        this.raisedHandListener =
            mBroadcaster.addListener(
                'meetings:raisedHand',
                raisedHandPeers => this.setState({
                    raisedHandPeers,
                    hideWrList: false,
                    hideHandsList: false
                }, () => this.safeForceUpdate())
            );

        // --

        ['onCallPeerJoined', 'onCallPeerLeft'].map(event =>
            this.props.chatRoom.rebind(`${event}.${Minimized.NAMESPACE}`, (ev, { userHandle }) =>
                this.isMounted() &&
                this.setState(
                    state => ({
                        raisedHandPeers: state.raisedHandPeers.includes(userHandle) ?
                            state.raisedHandPeers.filter(h => h !== userHandle) :
                            [...this.props.call.sfuClient.raisedHands]
                    }),
                    this.safeForceUpdate
                )
            )
        );
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.chatRoom.unbind(Minimized.UNREAD_EVENT);
        [this.waitingPeersListener, this.raisedHandListener].map(listener => mBroadcaster.removeListener(listener));
        ['onCallPeerJoined', 'onCallPeerLeft'].map(event => this.props.chatRoom.off(`${event}.${Minimized.NAMESPACE}`));
    }

    render() {
        const { onCallExpand } = this.props;
        const { unread, raisedHandPeers, waitingRoomPeers } = this.state;

        return (
            <div
                ref={this.domRef}
                className={`${FloatingVideo.NAMESPACE}-wrapper`}>
                <div className={`${FloatingVideo.NAMESPACE}-overlay`}>
                    <Button
                        simpletip={{ ...this.SIMPLETIP_PROPS, label: l.expand_mini_call /* Expand */ }}
                        className="mega-button theme-light-forced action small expand"
                        icon="sprite-fm-mono icon-fullscreen-enter"
                        onClick={ev => {
                            ev.stopPropagation();
                            onCallExpand();
                        }}
                    />
                    {this.renderStreamControls()}
                </div>
                {
                    (waitingRoomPeers && waitingRoomPeers.length || raisedHandPeers && raisedHandPeers.length) ?
                        this.renderPeersList() :
                        null
                }
                {unread ?
                    <div className={`${FloatingVideo.NAMESPACE}-notifications`}>
                        <Button
                            className="mega-button round large chat-control"
                            icon="icon-chat-filled">
                            <span>{l.chats /* `Chats` */}</span>
                        </Button>
                        <span>{unread > 9 ? '9+' : unread}</span>
                    </div> :
                    null
                }
            </div>
        );
    }
}
const __Minimized = compose(withMicObserver, withPermissionsObserver)(Minimized);
