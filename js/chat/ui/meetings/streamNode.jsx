import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import Call from './call.jsx';
import StreamNodeMenu from './streamNodeMenu.jsx';

export default class StreamNode extends MegaRenderMixin {
    nodeRef = React.createRef();
    contRef = React.createRef();
    statsHudRef = React.createRef();
    presenterCamRef = React.createRef();

    constructor(props) {
        super(props);
        this.state = { loading: false };
        const { stream, externalVideo } = props;
        if (!externalVideo) {
            this.createOwnVideo();
        }
        this.stream = stream;
        if (!stream.isFake) {
            stream.registerConsumer(this);

            if (stream instanceof CallManager2.Peer) {
                this.av = stream.av;
                this.haveScreenAndCam = stream.haveScreenAndCam && !(stream.av & Av.onHold);
                this._streamListener = stream.addChangeListener((peer, data, key) => {
                    // console.warn("change listener");
                    // force re-request if video stream changed
                    if (key === "av") {
                        this._lastResizeWidth = null;
                        const streamHasScreenAndCam = stream.haveScreenAndCam && !(stream.av & Av.onHold);
                        const bigChange =
                            (this.haveScreenAndCam !== streamHasScreenAndCam) || ((this.av ^ stream.av) & Av.onHold);
                        this.av = stream.av;
                        this.haveScreenAndCam = streamHasScreenAndCam;
                        if (bigChange) {
                            if (this.isMounted()) {
                                this.forceUpdate();
                            }
                        }
                        else {
                            this.requestVideo();
                        }
                    }
                });
            }
        }
        if (CallManager2.Call.VIDEO_DEBUG_MODE) {
            this.onRxStats = this._onRxStats;
        }
    }
    createOwnVideo() {
        if (this.ownVideo) {
            return;
        }
        this.ownVideo = document.createElement("video");
    }
    requestDynamicVideo(enable) {
        if (enable) {
            const node = this.findDOMNode();
            this.requestVideoBySize(node.offsetWidth, node.offsetHeight);
        }
        else {
            this.requestVideoBySize(0, 0);
        }
    }
    requestFixedThumbVideo(enable) {
        if (enable) {
            if (this.fixedThumbPlayer) {
                this.playFixedThumbVideo();
            }
            else {
                this.addFixedThumbVideo();
                this.fixedThumbPlayer = this.stream.sfuPeer.getThumbVideo((player) => {
                    this.fixedThumbPlayer = player;
                    return this;
                });
            }
        }
    }
    requestVideo(forceVisible) {
        const {stream} = this;
        if (stream.isFake || stream.isDestroyed) {
            return;
        }
        const enable = ((stream.isStreaming() || stream.isLocal) && this.isMounted()
            && (this.isComponentVisible() || forceVisible));

        if (!this.haveScreenAndCam) {
            if (this.fixedThumbPlayer) {
                this.fixedThumbPlayer.destroy();
            }
            this.requestDynamicVideo(enable);
        }
        else {
            this.requestFixedThumbVideo(enable);
            if (this.props.isThumb) {
                this.requestedQ = 0;
            }
            else {
                this.requestDynamicVideo(enable);
            }
        }
        if (!enable) {
            this.displayStats(null);
        }
    }
    setupVideoElement(video) {
        if (video._snSetup) {
            return; // already done
        }
        video._snSetup = true;

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
            if (this.props.onLoadedData) {
                this.props.onLoadedData(ev);
            }
        };
    }
    detachVideoElemHandlers() {
        const video = this.contRef.current?.firstChild;
        if (!video || !video._snSetup) {
            return;
        }
        video.onloadeddata = null;
        video.ondblclick = null;
    }
    updateDynamicVideoElem() {
        // console.warn(`updateVideoElem[${this.props.stream.clientId}]`);
        const vidCont = this.contRef.current;
        if (!this.isMounted() || !vidCont) {
            // console.warn(`...abort: mounted: ${this.isMounted()}, contRef: ${this.contRef.current}`);
            return;
        }

        const { stream, externalVideo, isThumb } = this.props;
        if (this.haveScreenAndCam && isThumb) {
            // no dynamic video when peer has screen&cam - otherwise it will switch back and forth
            // between screen and cam thumbnail
            return;
        }
        const currVideo = vidCont.firstChild; // current video in the DOM
        const { source } = stream;
        if (!source) {
            if (currVideo) {
                vidCont.replaceChildren();
            }
            return;
        }

        if (externalVideo) {
            if (currVideo === source) { // That video is in the DOM already, nothing to do
                return;
            }
            this.setupVideoElement(source);
            // insert/replace the video in the DOM
            vidCont.replaceChildren(source);
        }
        else { // use cloned video
            const cloned = this.ownVideo;
            if (!currVideo) {
                // insert our cloned video in the DOM
                this.setupVideoElement(cloned);
                vidCont.replaceChildren(cloned);
            }
            else {
                assert(currVideo === cloned);
            }
            if (cloned.paused || cloned.srcObject !== source.srcObject) {
                cloned.srcObject = source.srcObject;
                Promise.resolve(cloned.play()).catch(nop);
            }
        }
    }
    addFixedThumbVideo() {
        assert(this.haveScreenAndCam);
        const vidCont = (this.props.isThumb ? this.contRef : this.presenterCamRef).current;
        if (!vidCont) {
            console.warn("addFixedThumbVideo: No video container present");
            return;
        }
        this.createOwnVideo();
        if (vidCont.firstChild !== this.ownVideo) {
            vidCont.replaceChildren(this.ownVideo);
        }
    }
    delFixedThumbVideo() {
        if (!this.ownVideo) {
            console.warn("delFixedThumbVideo: no ownVideo");
            return;
        }
        SfuClient.playerStop(this.ownVideo);
        const vidCont = (this.props.isThumb ? this.contRef : this.presenterCamRef).current;
        if (!vidCont) {
            return;
        }
        vidCont.replaceChildren();
    }
    // SfuClient IVIdeoPlayerGui interface
    attachToTrack(track) {
        if (!this.haveScreenAndCam) {
            return;
        }
        SfuClient.playerPlay(this.ownVideo, track);
    }
    playFixedThumbVideo() {
        const track = this.fixedThumbPlayer.slot?.inTrack;
        if (!track) {
            return;
        }
        if (this.ownVideo.paused || this.ownVideo.srcObject.getVideoTracks()[0] !== track) {
            console.warn("play()");
            SfuClient.playerPlay(this.ownVideo, track);
        }
    }
    detachFromTrack() {
        this.delFixedThumbVideo();
    }
    onPlayerDestroy() {
        delete this.fixedThumbPlayer;
        const { externalVideo } = this.props;
        if (externalVideo && !this.haveScreenAndCam) {
            delete this.ownVideo;
        }
    }
    _onRxStats(track, info, raw) {
        if (!this.stream.source) {
            this.displayStats(CallManager2.Call.rxStatsToText(track, info, raw));
        }
    }
    // ====
    displayStats(stats) {
        const elem = this.statsHudRef.current;
        if (!elem) {
            return;
        }
        elem.textContent = stats ? `${stats} (${this.props.externalVideo ? "ref" : "cloned"})` : "";
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.didMount) {
            this.props.didMount(this.nodeRef?.current);
        }
        this.requestVideo(true);
    }

    onVisibilityChange(isVisible) {
        this.requestVideo(isVisible);
    }

    componentDidUpdate() {
     // console.warn("did update");
        super.componentDidUpdate();
        if (this.props.didUpdate) {
            this.props.didUpdate(this.nodeRef?.current);
        }
        this.requestVideo();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        const peer = this.props.stream;
        this.detachVideoElemHandlers();
        if (peer && !peer.isFake) {
            peer.deregisterConsumer(this);
        }
        if (this._streamListener) {
            peer.removeChangeListener?.(this._streamListener);
        }

        if (this.props.willUnmount) {
            this.props.willUnmount();
        }
    }
    requestVideoQuality(quality) {
        this.requestedQ = (quality && CallManager2.FORCE_LOWQ) ? 1 : quality;
        if (!this.props.stream.updateVideoQuality()) {
            // if it returns true, stream has changed synchronously and an update was already broadcast
            this.updateDynamicVideoElem();
        }
    }
    requestVideoBySize(w) {
        // console.warn(`requestVideoBySize[${stream.clientId}]: ${w}x${h}(lastw: ${this._lastResizeWidth})`);
        if (w === 0) {
            this._lastResizeWidth = 0;
            this.requestVideoQuality(this, CallManager2.VIDEO_QUALITY.NO_VIDEO);
            return;
        }
        if (this.contRef.current) {
            // save some CPU cycles.
            if (this._lastResizeWidth === w) {
                // console.warn("... abort: same size");
                return;
            }
            this._lastResizeWidth = w;
        }
        else {
            // if we requested video, but there is no player and we are unable to display it right away, don't prevent
            // re-requesting it, even with the same size. It makes sense to initiate the video request even before we
            // are ready to display it, to save some time. The re-request will use the previous result
            this._lastResizeWidth = null;
        }
        let newQ;
        if (w > 400) {
            newQ = CallManager2.VIDEO_QUALITY.HIGH;
        }
        else if (w > 200) {
            newQ = CallManager2.VIDEO_QUALITY.MEDIUM;
        }
        else if (w > 180) {
            newQ = CallManager2.VIDEO_QUALITY.LOW;
        }
        else {
            newQ = CallManager2.VIDEO_QUALITY.THUMB;
        }
        this.requestVideoQuality(newQ);
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
        const {stream} = this;
        if (stream.isStreaming()) {
            return (
                <>
                    <div
                        ref={this.contRef}
                        className="stream-node-holder"
                    />
                    {(this.haveScreenAndCam && !this.props.isThumb) &&
                        <div
                            ref={this.presenterCamRef}
                            className="presenter-video-holder"
                        />
                    }
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
        const { mode, stream, chatRoom, localAudioMuted, isThumb } = this.props;
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
                    {(this.haveScreenAndCam && isThumb) ? this.getStatusIcon('icon-pc-linux', "Sharing screen") : null }
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
                            {CallManager2.Call.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null}
                            {this.renderContent()}
                            {mode === Call.MODE.MINI || minimized ? null : this.renderStatus()}
                        </div>
                    </>
                )}
            </div>
        );
    }
}
