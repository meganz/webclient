import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import utils from '../../../ui/utils.jsx';
import Button from './button.jsx';
import Call from './call.jsx';
import { LocalVideoThumb, LocalVideoHiRes, PeerVideoHiRes } from './videoNode.jsx';
import StreamExtendedControls from './streamExtendedControls.jsx';
import { withMicObserver } from './micObserver';
import { withPermissionsObserver } from './permissionsObserver';

export default class FloatingVideo extends MegaRenderMixin {
    collapseListener = null;

    static NAMESPACE = 'float-video';
    static POSITION_MODIFIER = 'with-sidebar';

    state = {
        collapsed: false,
        ratio: undefined
    };

    gcd = (width, height) => {
        return height === 0 ? width : this.gcd(height, width % height);
    };

    getRatio = (width, height) => {
        return `${width / this.gcd(width, height)}:${height / this.gcd(width, height)}`;
    };

    getRatioClass = () => {
        const { ratio } = this.state;
        return ratio ? `ratio-${ratio.replace(':', '-')}` : '';
    };

    toggleCollapsedMode = () => {
        return this.setState(state => ({ collapsed: !state.collapsed }));
    };

    onLoadedData = ev => {
        const { videoWidth, videoHeight } = ev.target;
        this.setState({ ratio: this.getRatio(videoWidth, videoHeight) });
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        mBroadcaster.removeListener(this.collapseListener);
    }

    componentDidMount() {
        super.componentDidMount();
        this.collapseListener = mBroadcaster.addListener('meetings:collapse', () => this.setState({ collapsed: true }));
    }

    render() {
        const { peers, minimized, call } = this.props;

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
            ratioClass: this.getRatioClass(),
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

        return <Stream {...STREAM_PROPS} />;
    }
}

// --

class Stream extends MegaRenderMixin {
    containerRef = React.createRef();

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
     * @see Call.MODE
     * @see renderMiniMode
     * @see renderSelfView
     */

    getStreamSource = () => {
        const { call, mode, forcedLocal } = this.props;
        return (mode === Call.MODE.MINI && !forcedLocal) ? call.getActiveStream() : call.getLocalStream();
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
                return this.props.view === Call.VIEW.CHAT && this.props.onCallExpand();
            });
        }

        // Close the options menu on click outside the `FloatingVideo` component
        document.addEventListener('click', this.handleOptionsClose);
    };

    initDraggable = () => {
        const { minimized, wrapperRef } = this.props;
        const containerEl = this.containerRef?.current;

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
        const localEl = this.containerRef?.current;

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
            toggleCollapsedMode
        } = this.props;
        // `Speaker` mode and `forcedLocal` -> `Display in main view`, i.e. the local stream is in `Speaker` mode
        const IS_SPEAKER_VIEW = mode === Call.MODE.SPEAKER && forcedLocal;
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
                            icon="sprite-fm-mono icon-download-standard"
                            onClick={() => this.setState({ options: false }, () => toggleCollapsedMode())}>
                            <div>{l.collapse_self_video}</div>
                        </Button>
                    </li>
                    <li>
                        <Button
                            icon={`
                                sprite-fm-mono
                                ${IS_SPEAKER_VIEW ? 'icon-thumbnail-view' : 'icon-speaker-view'}
                            `}
                            onClick={() =>
                                this.setState({ options: false }, () => {
                                    if (IS_SPEAKER_VIEW) {
                                        return onModeChange(Call.MODE.THUMBNAIL);
                                    }
                                    onSpeakerChange(call.getLocalStream());
                                    toggleCollapsedMode();
                                })
                            }>
                            <div>
                                {IS_SPEAKER_VIEW ?
                                    l.switch_to_thumb_view /* `Switch to thumbnail view` */ :
                                    l.display_in_main_view /* `Display in main view` */}
                            </div>
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

    renderMiniMode = () => {
        const { call, mode, onLoadedData } = this.props;

        if (call.sfuClient.isOnHold()) {
            return this.renderOnHoldVideoNode();
        }
        const source = this.getStreamSource();
        const VideoClass = source.isLocal ? LocalVideoThumb : PeerVideoHiRes;
        return (
            <VideoClass
                chatRoom={this.props.chatRoom}
                mode={mode}
                onLoadedData={onLoadedData}
                source={source} // ignored for LocalVideoHiRes
            />
        );
    };

    renderSelfView = () => {
        const { isOnHold, minimized, onLoadedData, chatRoom } = this.props;
        const { options } = this.state;

        if (isOnHold) {
            return this.renderOnHoldVideoNode();
        }

        return (
            <>
                <LocalVideoThumb
                    isSelfOverlay={true}
                    minimized={minimized}
                    chatRoom={chatRoom}
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
        const { mode, minimized, sidebar, ratioClass, collapsed, toggleCollapsedMode, onCallExpand } = this.props;
        const IS_MINI_MODE = mode === Call.MODE.MINI;
        const IS_SELF_VIEW = !IS_MINI_MODE;

        if (collapsed) {
            return (
                <div
                    ref={this.containerRef}
                    className={`
                        ${NAMESPACE}
                        collapsed
                        theme-dark-forced
                        ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                    `}
                    onClick={toggleCollapsedMode}>
                    <i className="sprite-fm-mono icon-arrow-up" />
                </div>
            );
        }

        return (
            <div
                ref={this.containerRef}
                className={`
                    ${NAMESPACE}
                    ${this.getStreamSource().isStreaming() ? ratioClass : ''}
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
                    this.renderMiniMode()
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

    SIMPLETIP_PROPS = { position: 'top', offset: 5, className: 'theme-dark-forced' };

    state = {
        unread: 0
    };

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
            resetError,
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

        return (
            <div className={`${FloatingVideo.NAMESPACE}-controls`}>
                <div className="meetings-signal-container">
                    <Button
                        simpletip={{ ...this.SIMPLETIP_PROPS, label: audioLabel }}
                        className={`
                            mega-button
                            theme-light-forced
                            round
                            large
                            ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                            ${this.isActive(SfuClient.Av.Audio) ? '' : 'inactive'}
                        `}
                        icon={this.isActive(SfuClient.Av.Audio) ? 'icon-audio-filled' : 'icon-audio-off'}
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
                            large
                            ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                            ${this.isActive(SfuClient.Av.Camera) ? '' : 'inactive'}
                        `}
                        icon={this.isActive(SfuClient.Av.Camera) ? 'icon-video-call-filled' : 'icon-video-off'}
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
                    <StreamExtendedControls
                        call={call}
                        chatRoom={chatRoom}
                        onScreenSharingClick={onScreenSharingClick}
                        onHoldClick={onHoldClick}
                    />
                    {this.renderPermissionsWarning(Av.Screen)}
                </div>
                <Button
                    simpletip={{ ...this.SIMPLETIP_PROPS, label: l[5884] /* `End call` */ }}
                    className="mega-button theme-dark-forced round large end-call"
                    icon="icon-end-call"
                    onClick={ev => {
                        ev.stopPropagation();
                        onCallEnd();
                    }}>
                    <span>{l[5884] /* `End call` */}</span>
                </Button>
            </div>
        );
    };

    componentDidMount() {
        super.componentDidMount();
        this.getUnread();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.props.chatRoom.unbind(Minimized.UNREAD_EVENT);
    }

    render() {
        const { unread } = this.state;
        return (
            <>
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
            </>
        );
    }
}
const __Minimized = compose(withMicObserver, withPermissionsObserver)(Minimized);
