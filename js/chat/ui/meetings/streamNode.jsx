import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import Call from './call.jsx';
import StreamNodeMenu from './streamNodeMenu.jsx';

export default class StreamNode extends MegaRenderMixin {
    nodeRef = React.createRef();
    contRef = React.createRef();
    statsHudRef = React.createRef();

    constructor(props) {
        super(props);
        this.state = { loading: false };
        const { stream, externalVideo } = props;
        if (!externalVideo) {
            this.clonedVideo = document.createElement("video");
            this.setupVideoElement(this.clonedVideo);
        }
        if (!stream.isFake) {
            stream.registerConsumer(this);

            if (stream instanceof CallManager2.Peer) {
                this._streamListener = stream.addChangeListener((peer, data, key) => {
                    // console.warn("change listener");
                    if (key === "haveScreenshare") {
                        this._lastResizeWidth = null;
                    }
                    this.requestVideo();
                });
            }
        }
    }

    requestVideo(forceVisible) {
        if (this.isComponentVisible() || forceVisible) {
            var node = this.findDOMNode();
            this.requestVideoBySize(node.offsetWidth, node.offsetHeight);
        }
        else {
            this.requestVideoBySize(0, 0);
        }
    }

    setupVideoElement(video) {
        if (video._snSetup) {
            return; // already done
        }
        video.autoplay = true;
        video.controls = false;
        video.muted = true;
        video.ondblclick = (e) => {
            if (this.props.onDoubleClick) {
                this.props.onDoubleClick(e, this);
            }
        };
        video.onloadeddata = (ev) => {
            // Trigger fake onResize when video finishes loading
            this.requestVideo();
            if (this.props.onLoadedData) {
                this.props.onLoadedData(ev);
            }
        };
        video._snSetup = true;
    }

    setLoading(loading) {
        if (this.isMounted()) {
            this.setState({loading: loading});
        }
        else {
            this.state.loading = loading;
        }
    }

    updateVideoElem() {
        // console.warn(`updateVideoElem[${this.props.stream.clientId}]`);
        if (!this.isMounted() || !this.contRef.current) {
            // console.warn(`...abort: mounted: ${this.isMounted()}, contRef: ${this.contRef.current}`);
            return;
        }

        const currVideo = this.contRef.current.firstChild; // current video in the DOM
        const { stream, externalVideo } = this.props;
        const { source } = stream;

        if (externalVideo) {
            if (currVideo === source) { // That video is in the DOM already, nothing to do
                return;
            }
            if (source) {
                this.setupVideoElement(source);
                // insert/replace the video in the DOM
                this.contRef.current.replaceChildren(source);
                // this.setLoading(source.readyState < 2);
            }
            else {
                this.contRef.current.replaceChildren();
            }
        }
        else {
            if (!currVideo) {
                // insert our cloned video in the DOM
                this.contRef.current.replaceChildren(this.clonedVideo);
            }
            if (source) {
                if (this.clonedVideo.paused || this.clonedVideo.srcObject !== source.srcObject) {
                    this.clonedVideo.srcObject = source.srcObject;
                    this.clonedVideo.play().catch(()=>{});
                }
            }
            else {
                SfuClient.playerStop(this.clonedVideo);
            }
        }
    }

    displayStats(stats) {
        const elem = this.statsHudRef.current;
        if (!elem) {
            return;
        }
        elem.textContent = `${stats} (${this.props.externalVideo ? "ref" : "cloned"})`;
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.didMount) {
            this.props.didMount(this.nodeRef?.current);
        }
        // this.updateVideoElem();
        this.requestVideo(true);
    }

    onVisibilityChange(isVisible) {
        this.requestVideo(isVisible);
    }

    componentDidUpdate() {
        super.componentDidUpdate();
        if (this.props.didUpdate) {
            this.props.didUpdate(this.nodeRef?.current);
        }
        this.requestVideo();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        const peer = this.props.stream;
        if (peer && !peer.isFake) {
            this.props.stream.deregisterConsumer(this);
            // prevent hd video removal from the DOM from stopping the video
            if (this.props.externalVideo && peer.source) { // media html elements stop playing when removed from the DOM
                const video = peer.source;
                video.onpause = () => {
                    if (!video.isDestroyed) {
                        video.play().catch(()=>{});
                    }
                    delete video.onpause;
                };
            }
        }
        if (this._streamListener) {
            peer.removeChangeListener(this._streamListener);
        }

        if (this.props.willUnmount) {
            this.props.willUnmount();
        }
    }

    requestVideoBySize(w) {
        const { stream } = this.props;
        // console.warn(`requestVideoBySize[${stream.clientId}]: ${w}x${h}(lastw: ${this._lastResizeWidth})`);

        if (stream.isFake) {
            return;
        }
        if (!this.isMounted()) {
            // console.warn("... abort: not mounted");
            return;
        }
        if (!stream.isLocal && !stream.isStreaming()) {
            stream.consumerGetVideo(this, CallManager2.CALL_QUALITY.NO_VIDEO);
            return;
        }
        if (this.contRef.current) {
            // if we requested video, but are unable to display it right away, don't prevent
            // re-requesting it, even with the same size. It makes sense to initiate the
            // video request even before we are ready to display it, to save some time.
            // The re-request will use the previous result
            // save some CPU cycles.
            if (this._lastResizeWidth === w) {
                // console.warn("... abort: same size");
                return;
            }
            this._lastResizeWidth = w;
        }
        else {
            this._lastResizeWidth = null;
        }
        let newQ;
        if (w > 400) {
            newQ = CallManager2.CALL_QUALITY.HIGH;
        }
        else if (w > 200) {
            newQ = CallManager2.CALL_QUALITY.MEDIUM;
        }
        else if (w > 180) {
            newQ = CallManager2.CALL_QUALITY.LOW;
        }
        else if (w === 0) {
            newQ = CallManager2.CALL_QUALITY.NO_VIDEO;
        }
        else {
            newQ = CallManager2.CALL_QUALITY.THUMB;
        }
        stream.consumerGetVideo?.(this, newQ);
    }

    renderVideoDebugMode() {
        const { stream, isLocal } = this.props;

        if (stream.isFake) {
            return null;
        }

        let className = "video-rtc-stats";
        let title;
        if (isLocal) {
            if (window.sfuClient) {
                title = new URL(window.sfuClient.url).host;
            }
            if (this.props.isSelfOverlay) {
                className += " video-rtc-stats-ralign";
            }
        }
        if (!title) {
            title = "";
        }
        return <div ref={this.statsHudRef} className={className} title={title} />;
    }

    renderContent() {
        const { stream, isCallOnHold } = this.props;
        const { loading } = this.state;

        if (stream && (stream.isStreaming && stream.isStreaming()) && !isCallOnHold) {
            return (
                <>
                    {loading && (
                        <i className="sprite-fm-theme icon-loading-spinner loading-icon"/>
                    )}
                    <div
                        ref={this.contRef}
                        className="stream-node-holder"
                    />
                </>
            );
        }

        delete this._lastResizeWidth;
        return <Avatar contact={M.u[stream.userHandle]}/>;
    }

    getStatusIcon(icon, label) {
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
    }

    renderStatus() {
        const { mode, stream, chatRoom, localAudioMuted } = this.props;
        const { audioMuted, hasSlowNetwork, isOnHold, userHandle } = stream;
        const $$CONTAINER = ({ children }) => <div className="stream-node-status theme-dark-forced">{children}</div>;
        const onHoldLabel = l[23542].replace('%s', M.getNameByHandle(userHandle)); /* `%s has put the call on hold` */
        // Determine `muted` depending on whether the current stream that is being rendered is local audio track or
        // a remote peer stream. See `renderSelfView@Stream`.
        const muted = userHandle === u_handle && localAudioMuted || audioMuted;

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
                    {muted ? this.getStatusIcon('icon-audio-off', l.muted /* `Muted` */) : null}
                    {hasSlowNetwork ?
                        this.getStatusIcon('icon-weak-signal', l.poor_connection /* `Poor connection` */) : null}
                </$$CONTAINER>
            </>
        );
    }

    render() {
        const {
            stream,
            mode,
            minimized,
            chatRoom,
            menu,
            className,
            simpletip,
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
                    ${this.state.loading ? 'loading' : ''}
                    ${simpletip ? 'simpletip' : ''}
                `}
                data-simpletip={simpletip?.label}
                data-simpletipposition={simpletip?.position}
                data-simpletipoffset={simpletip?.offset}
                data-simpletip-class={simpletip?.className}
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
                            {SfuApp.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null}
                            {this.renderContent()}
                            {mode === Call.MODE.MINI || minimized ? null : this.renderStatus()}
                        </div>
                    </>
                )}
            </div>
        );
    }
}
