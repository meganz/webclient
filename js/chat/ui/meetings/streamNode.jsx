import React from 'react';
import { MegaRenderMixin, rAFWrap, SoonFcWrap } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import Call from './call.jsx';
import StreamNodeMenu from './streamNodeMenu.jsx';

export default class StreamNode extends MegaRenderMixin {
    nodeRef = React.createRef();
    videoRef = React.createRef();

    static LOADING_STATE = {
        INITIALIZED: 1,
        LOADING: 1,
        LOADED: 2
    };

    static isStreaming = stream => {
        return (
            stream &&
            !stream.isOnHold &&
            (stream.source && stream.source.srcObject !== null) &&
            (!stream.videoMuted || stream.haveScreenshare)
        );
    };

    constructor(props) {
        super(props);
        this.videoRef = React.createRef();
        this.state = {
            loading: StreamNode.LOADING_STATE.INITIALIZED,
        };
        if (props.stream?.addChangeListener) {
            // e.g. not a local/fake stream
            this._streamListener = props.stream.addChangeListener((peer, data, key) => {
                if ((key === "videoMuted" || key === "haveScreenshare") && data[key] === false) {
                    // changed videoMuted to false (e.g. enabled video), clear resize cache to ensure a
                    // video re-request would be sent
                    this._cachedResizeKey = null;
                }
                this.triggerFakeResize();
            });
        }
    }

    @SoonFcWrap(30, true)
    @rAFWrap()
    updateVideoStreamThrottled() {
        this.updateVideoStream();
    }

    triggerFakeResize(currentVisibility = 0xDEAD) {
        if (currentVisibility === true || currentVisibility === 0xDEAD && this.isComponentVisible()) {
            var node = this.findDOMNode();
            this.onResizeObserved(node.offsetWidth, node.offsetHeight);
        }
        else {
            this.onResizeObserved(0, 0);
        }
    }
    updateVideoStream() {
        if (!this.isMounted()) {
            return;
        }

        if (
            this.props.stream?.source?.srcObject &&
            this.videoRef.current &&
            this.videoRef.current.srcObject !== this.props.stream.source.srcObject
        ) {
            this.videoRef.current.srcObject = this.props.stream.source.srcObject;
        }

        if (!this.props.stream?.source?.srcObject && this.videoRef.current) {
            this.videoRef.current.srcObject = undefined;
        }
        if (this.props.stream && this.props.stream instanceof CallManager2.Peer && !this.props.stream.isFake) {
            this.triggerFakeResize();
        }

    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.didMount) {
            this.props.didMount(this.nodeRef?.current);
        }
        this.updateVideoStream();
    }

    onVisibilityChange(isVisible) {
        this.triggerFakeResize(isVisible);
    }
    componentDidUpdate() {
        super.componentDidUpdate();
        if (this.props.didUpdate) {
            this.props.didUpdate(this.nodeRef?.current);
        }
        this.updateVideoStreamThrottled();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        const videoRef = this.videoRef && this.videoRef.current;
        if (videoRef) {
            videoRef.srcObject = null;
        }
        if (this.props.stream && this.props.stream instanceof CallManager2.Peer && !this.props.stream.isFake) {
            this.props.stream.deregisterConsumer(this.getUniqueId());
        }
        if (this._streamListener) {
            this.props.stream?.removeChangeListener(this._streamListener);
        }

        if (this.props.willUnmount) {
            this.props.willUnmount();
        }
    }

    @SoonFcWrap(350, true)
    @rAFWrap()
    onResizeObserved(w, h) {
        const { stream } = this.props;

        if (!(stream instanceof CallManager2.Peer) || stream.isFake) {
            // local OR fake stream
            return;
        }
        if (stream.videoMuted && !stream.haveScreenshare) {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.NO_VIDEO);
            return;
        }

        const prop = 'width';

        // const refNode = this.videoRef.current;
        // because if the incoming video is in portrait mode, this causes duplicated GET_HIRES -> GET_VTHUMB, so
        // disabling for now.
        // if (w && h && refNode) {
        //     const vw = refNode.videoWidth;
        //     const vh = refNode.videoHeight;
        //     if (vw && vh) {
        //         prop = vw / vh >= 1 ? 'width' : 'height';
        //     }
        // }

        // save some CPU cycles.
        const cachedResizeKey = w + ":" + h + ":" + prop;
        if (this._cachedResizeKey === cachedResizeKey) {
            return;
        }
        this._cachedResizeKey = cachedResizeKey;

        const elemProps = { width: w, height: h };

        if (elemProps[prop] > 400) {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.HIGH);
        }
        else if (elemProps[prop] > 200) {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.MEDIUM);
        }
        else if (elemProps[prop] > 180) {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.LOW);
        }
        else if (elemProps[prop] === 0) {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.NO_VIDEO);
        }
        else {
            stream.requestQuality(this.getUniqueId(), CallManager2.CALL_QUALITY.THUMB);
        }
    }

    renderVideoDebugMode = () => {
        const { stream } = this.props;

        if (!(stream instanceof CallManager2.Peer) || stream.isFake || !stream.call.sfuApp.rxStats) {
            // Local or fake
            return null;
        }

        return (
            <div
                className="video-debug-mode"
                id={`video-debug-mode-${stream.clientId}`}>
                {stream.clientId}: {stream.call.sfuApp.rxStats[stream.clientId]?.text}
            </div>
        );
    };

    renderContent = () => {
        const { stream, onDoubleClick, onLoadedData } = this.props;
        const { loading } = this.state;

        if (StreamNode.isStreaming(stream)) {
            return (
                <>
                    {loading !== StreamNode.LOADING_STATE.LOADED && (
                        <i className="sprite-fm-theme icon-loading-spinner loading-icon" />
                    )}
                    <video
                        ref={this.videoRef}
                        onDoubleClick={(e) => {
                            if (onDoubleClick) {
                                onDoubleClick(e, this);
                            }
                        }}
                        autoPlay={true}
                        controls={false}
                        muted={true}
                        onLoadStart={() => {
                            this.setState({ loading: StreamNode.LOADING_STATE.LOADING });
                        }}
                        onWaiting={() => {
                            this.setState({ loading: StreamNode.LOADING_STATE.LOADING });
                        }}
                        onPlaying={() => {
                            this.setState({ loading: StreamNode.LOADING_STATE.LOADED });
                        }}
                        onLoadedData={ev => {
                            // Trigger fake onResize when video finishes loading
                            this.triggerFakeResize();

                            if (onLoadedData) {
                                onLoadedData(ev);
                            }
                        }}
                    />
                </>
            );
        }

        return <Avatar contact={M.u[stream.userHandle]} />;
    };

    getStatusIcon = (icon, label) => {
        return (
            <span
                className="simpletip"
                data-simpletip-class="theme-dark-forced"
                data-simpletipposition="top"
                data-simpletipoffset="5"
                data-simpletip={label}>
                <i className={`sprite-fm-mono ${icon}`} />
            </span>
        );
    };

    renderStatus = () => {
        const { mode, chatRoom } = this.props;
        const { audioMuted, hasSlowNetwork, isOnHold, userHandle } = this.props.stream;
        const $$CONTAINER = ({ children }) => <div className="stream-node-status theme-dark-forced">{children}</div>;
        const onHoldLabel = l[23542].replace('%s', M.getNameByHandle(userHandle)); /* `%s has put the call on hold` */

        if (isOnHold) {
            return <$$CONTAINER>{this.getStatusIcon('icon-pause', onHoldLabel)}</$$CONTAINER>;
        }

        return (
            <>
                {
                    // If in `Speaker` mode and the participant is a moderator -- show icon in the top-right corner
                    mode === Call.MODE.SPEAKER &&
                    Call.isModerator(chatRoom, userHandle) &&
                    this.getStatusIcon('icon-admin call-role-icon', l[8875] /* `Moderator` */)
                }
                <$$CONTAINER>
                    {audioMuted && this.getStatusIcon('icon-audio-off', l.muted /* `Muted` */)}
                    {hasSlowNetwork &&
                        this.getStatusIcon('icon-weak-signal', l.poor_connection /* `Poor connection` */)}
                </$$CONTAINER>
            </>
        );
    };

    render() {
        const {
            stream,
            chatRoom,
            menu,
            className,
            ephemeralAccounts,
            onClick,
            onCallMinimize,
            onSpeakerChange
        } = this.props;

        return (
            <div
                ref={this.nodeRef}
                className={`
                    stream-node
                    ${onClick ? 'clickable' : ''}
                    ${className ? className : ''}
                    ${this.state.loading !== StreamNode.LOADING_STATE.LOADED ? 'loading' : ''}
                `}
                onClick={() => onClick && onClick(stream)}>
                {stream && (
                    <>
                        {menu && (
                            <StreamNodeMenu
                                privilege={chatRoom && chatRoom.members[stream.userHandle]}
                                chatRoom={chatRoom}
                                stream={stream}
                                ephemeralAccounts={ephemeralAccounts}
                                onCallMinimize={onCallMinimize}
                                onSpeakerChange={onSpeakerChange}
                            />
                        )}
                        <div className="stream-node-content">
                            {SfuApp.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : ''}
                            {this.renderContent()}
                            {this.renderStatus()}
                        </div>
                    </>
                )}
            </div>
        );
    }
}
