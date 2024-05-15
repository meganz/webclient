import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar, ContactAwareName } from '../contacts.jsx';
import Call, { MODE } from './call.jsx';
import { Emoji } from "../../../ui/utils";

/** The class hiearachy of video components is the following:
                                    VideoNode
                              (Base rendering code)
                              |          |       |
             /----------------/          |       \----------------------------\
         DynVideo              PeerVideoThumbFixed                      LocalVideoThumb
(Uses an externally managed    (Always displays thumb              (shows local camera track
  (dynamic) video player)      video, not dynamic) Used              if avail, otherwise
            |       |         for camera when screen+cam             screenshare track)
            |        \--------------------------------\
    DynVideoCloned                              DynVideoDirect
    (uses a clone of                        (renders the pre-loaded
    the dynamic player                       dynamic player directly,
    for smooth swithcing)                          |                 \
            |          \                           |                  \
  PeerVideoThumb      PeerVideoHiResCloned   PeerVideoHiRes       LocalVideoHiRes
(Normal thumbnail      (Shows a peer's        (Big video of        (shows screenshare track if avail,
video of a peer,       hi-res shared screen   a peer,used in      otherwise camera track)
used in the RHP.       as thumbnail, only     main, self and
                       when peer sends both   mini view)
                       screen and camera.
                       Is dynamic but never
                       switches down to
                       thumbnail)

*/
/** Base class for all video components - does the actual rendering */
class VideoNode extends MegaRenderMixin {
    nodeRef = React.createRef();
    contRef = React.createRef();
    audioLevelRef = React.createRef();
    statsHudRef = React.createRef();

    /*
        Methods and properties that descendants must implement:
        requestVideo();
        isLocal
        isDirect
    */

    constructor(props, source) {
        super(props);
        this.source = source;
    }

    componentDidMount() {
        super.componentDidMount();
        this.source.registerConsumer(this);
        this.props.didMount?.(this.nodeRef?.current);
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

    onAvChange() {
        // force re-request if video stream changed
        this.safeForceUpdate();
    }
    displayVideoElement(video, container) {
        this.attachVideoElemHandlers(video);
        this.video = video;
        // insert/replace the video in the DOM
        container.replaceChildren(video);
    }

    attachVideoElemHandlers(video) {
        if (video._snSetup) {
            return; // already done
        }
        video.autoplay = true;
        video.controls = false;
        video.muted = true;
        video.ondblclick = e => {
            const { onDoubleClick, toggleFullScreen } = this.props;
            onDoubleClick?.(this.source, e);
            if (toggleFullScreen && !document.fullscreenElement && this.nodeRef.current) {
                if (typeof toggleFullScreen === 'function') {
                    toggleFullScreen(this);
                }
                this.nodeRef.current.requestFullscreen({ navigationUI: 'hide' });
            }
        };
        video.onloadeddata = (ev) => {
            /* NOTE: We don't remove the video-node-loading style, because:
             - We don't need to: the loading symbol is covered by the <video> element as soon as it starts playback
             - readyState may be 4 long before the video actually appears and starts playing
            */
            if (this.props.onLoadedData) {
                this.props.onLoadedData(ev); // Trigger fake onResize when video finishes loading
            }
        };
        video._snSetup = true;
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        delete this.video;
        this.detachVideoElemHandlers();
        this.source.deregisterConsumer(this);
        if (this.props.willUnmount) {
            this.props.willUnmount();
        }
    }

    detachVideoElemHandlers() {
        const video = this.contRef.current?.firstChild;
        if (!video || !video._snSetup) {
            return;
        }
        video.onloadeddata = null;
        video.ondblclick = null;
        delete video._snSetup;
    }
    isVideoCropped() {
        return this.video?.classList.contains("video-crop");
    }
    cropVideo() {
        this.video?.classList.add("video-crop");
    }
    uncropVideo() {
        this.video?.classList.remove("video-crop");
    }
    displayStats(stats) {
        const elem = this.statsHudRef.current;
        if (!elem) {
            return;
        }
        elem.textContent = stats ? `${stats} (${this.ownVideo ? "cloned" : "ref"})` : "";
    }

    renderVideoDebugMode() {
        if (this.source.isFake) {
            return null;
        }

        let className = "video-rtc-stats";
        let title;
        if (this.isLocal) {
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
        const source = this.source;
        if (this.props.isPresenterNode || (source.av & Av.Camera)) {
            return (
                <div
                    ref={this.contRef}
                    className="video-node-holder video-node-loading"
                />
            );
        }
        delete this._lastResizeHeight;
        return <Avatar contact={M.u[source.userHandle]}/>;
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
        const { mode, chatRoom, isPresenterNode } = this.props;
        const { source } = this;
        const { sfuClient } = chatRoom.call;
        const { userHandle, isOnHold } = source;
        const $$CONTAINER = ({ children }) => <div className="video-node-status theme-dark-forced">{children}</div>;

        const name = <div className="video-status-name">
            {
                isPresenterNode ?
                    <Emoji>{l.presenter_nail.replace('%s', M.getNameByHandle(userHandle))}</Emoji> :
                    <ContactAwareName contact={M.u[userHandle]} emoji={true}/>
            }
        </div>;

        if (isOnHold) {
            return (
                <$$CONTAINER>
                    {name}
                    {this.getStatusIcon('icon-pause', l[23542].replace('%s', M.getNameByHandle(userHandle)))}
                </$$CONTAINER>
            );
        }

        return (
            <>
                {
                    // If in `Main` mode and the participant is a moderator -- show icon in the top-right corner
                    mode === MODE.MAIN &&
                    Call.isModerator(chatRoom, userHandle) &&
                    this.getStatusIcon('icon-admin-outline call-role-icon', l[8875])
                }
                <$$CONTAINER>
                    {name}
                    <AudioLevelIndicator source={source} />
                    {sfuClient.haveBadNetwork ? this.getStatusIcon('icon-call-offline', l.poor_connection) : null}
                </$$CONTAINER>
            </>
        );
    }

    render() {
        const {
            mode,
            minimized,
            chatRoom,
            simpletip,
            className,
            children,
            onClick
        } = this.props;
        const { nodeRef, source, isLocal, isLocalScreen } = this;

        if (!chatRoom.call) {
            return null;
        }

        const { call } = chatRoom;
        const isActiveSpeaker = !source.audioMuted && call.speakerCid === source.clientId;

        return (
            <div
                ref={nodeRef}
                className={`
                    video-node
                    ${onClick ? 'clickable' : ''}
                    ${className || ''}
                    ${isLocal && !isLocalScreen ? ' local-stream-mirrored' : ''}
                    ${simpletip ? 'simpletip' : ''}
                    ${isActiveSpeaker && mode === MODE.THUMBNAIL ? 'active-speaker' : ''}
                `}
                data-simpletip={simpletip?.label}
                data-simpletipposition={simpletip?.position}
                data-simpletipoffset={simpletip?.offset}
                data-simpletip-class={simpletip?.className}
                onClick={(evt) => onClick?.(source, evt)}>
                {source &&
                    <>
                        {children || null}
                        <div className="video-node-content">
                            {CallManager2.Call.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null}
                            {this.renderContent()}
                            {mode === MODE.MINI || minimized ? null : this.renderStatus()}
                        </div>
                    </>
                }
            </div>
        );
    }
}

/**
 * Widget whose video source is obtained from an external player. It displays either the external player directly
 * (used in hi-res widgets), or own player with the same source as the external one (for thumbnails)
 * The external player may change (or its source get changed), for which we are notified
 * via dynUpdateVideoElem(). The purpose of the external player mechanism is to start playing the stream in advance
 * (even before the widget is created), to avoid blackouts/flicker. That external player can be displayed directly only
 * by one widget, as it can be mounted only in one place in the DOM. However we may need to display the same stream in
 * a secondary thumbnail widget. In that case, the external player updates are still tracked, but the rendering
 * of the stream is done via a the widget's own "cloned" player, which tracks the source of the original external
 * player.
 *
 * Methods/properties implemented by descendants"
 * isDirect
 * dynSetVideoSource()
 */
class DynVideo extends VideoNode {
    onAvChange() {
        // force re-request if video stream changed
        this._lastResizeHeight = null;
        super.onAvChange();
    }
    dynRequestVideo(forceVisible) {
        const {source} = this;
        if (source.isFake || source.isDestroyed) {
            return;
        }
        if (source.isStreaming() && this.isMounted()) { // && (this.isComponentVisible() || forceVisible))
            const node = this.findDOMNode();
            this.dynRequestVideoBySize(node.offsetHeight);
        }
        else {
            this.dynRequestVideoBySize(0);
            this.displayStats(null);
        }
    }
    dynRequestVideoQuality(quality) {
        this.requestedQ = (quality && CallManager2.FORCE_LOWQ) ? 1 : quality;
        if (!this.source.dynUpdateVideoQuality()) {
            // if it returns true, stream has changed synchronously and an update was already broadcast
            this.dynUpdateVideoElem();
        }
    }
    dynRequestVideoBySize(h) {
        // console.warn(`requestVideoBySize[${stream.clientId}]: ${w}x${h}(lastw: ${this._lastResizeHeight})`);
        if (h === 0) {
            this._lastResizeHeight = 0;
            this.dynRequestVideoQuality(CallManager2.VIDEO_QUALITY.NO_VIDEO);
            return;
        }
        if (this.contRef.current) {
            // save some CPU cycles.
            if (this._lastResizeHeight === h) {
                return;
            }
            this._lastResizeHeight = h;
        }
        else {
            // if we requested video, but there is no player and we are unable to display it right away, don't prevent
            // re-requesting it, even with the same size. It makes sense to initiate the video request even before we
            // are ready to display it, to save some time. The re-request will use the previous result
            this._lastResizeHeight = null;
        }
        let newQ;
        if (h > 360) {
            newQ = CallManager2.VIDEO_QUALITY.HIGH;
        }
        else if (h > 180) {
            newQ = CallManager2.VIDEO_QUALITY.MEDIUM;
        }
        else if (h > 90 || this.noThumb) {
            newQ = CallManager2.VIDEO_QUALITY.LOW;
        }
        else {
            newQ = CallManager2.VIDEO_QUALITY.THUMB;
        }
        this.dynRequestVideoQuality(newQ);
    }
    /** Callback called from source to all consumers when the dyn stream changes */
    dynUpdateVideoElem() {
        const vidCont = this.contRef.current;
        if (!this.isMounted() || !vidCont) {
            return;
        }
        const player = this.noThumb ? this.source.hiResPlayer?.gui?.video : this.source.player;
        if (!player) { // remove video from DOM
            vidCont.replaceChildren();
            return;
        }
        this.dynSetVideoSource(player, vidCont);
    }
}
class DynVideoDirect extends DynVideo {
    constructor(props, source) {
        super(props, source);
        this.isDirect = true;
        this.requestVideo = this.dynRequestVideo;
    }
    /** Descendent-specific callback, called from DynamicVideoNode when it needs to change the video source */
    dynSetVideoSource(srcPlayer, vidCont) {
        if (vidCont.firstChild !== srcPlayer) { // That video is in the DOM already, nothing to do
            this.displayVideoElement(srcPlayer, vidCont);
        }
        if (srcPlayer.paused) {
            // console.warn("Re-start player");
            srcPlayer.play().catch(nop);
        }
    }
}

export class PeerVideoHiRes extends DynVideoDirect {
    constructor(props) {
        super(props, props.source);
    }
}

/** Clones the dynamic video source */
class DynVideoCloned extends DynVideo {
    constructor(props, source) {
        super(props, source);
        this.ownVideo = CallManager2.createVideoElement();
    }
    dynSetVideoSource(srcPlayer, vidCont) {
        const cloned = this.ownVideo;
        const currVideo = vidCont.firstChild;
        if (!currVideo) {
            // insert our cloned video in the DOM
            this.displayVideoElement(cloned, vidCont);
        }
        else {
            assert(currVideo === cloned);
        }
        if (cloned.paused || cloned.srcObject !== srcPlayer.srcObject) {
            cloned.srcObject = srcPlayer.srcObject;
            Promise.resolve(cloned.play()).catch(nop);
        }
    }
}
/*
  Used to display a peer's video using the dynamic switching mechanism
*/
export class PeerVideoThumb extends DynVideoCloned {
    constructor(props) {
        super(props, props.source);
        this.requestVideo = this.dynRequestVideo;
    }
}
/*
  Displays only the thumbnail video, registering directly as a player GUI with the sfuPeer
  Used to display the camera video when peer is sending both screen and cam
*/
export class PeerVideoThumbFixed extends VideoNode {
    constructor(props) {
        super(props, props.source);
        assert(props.source.hasScreenAndCam);
        this.ownVideo = CallManager2.createVideoElement();
        if (CallManager2.Call.VIDEO_DEBUG_MODE) {
            this.onRxStats = this._onRxStats; // for staticThumb track
        }
    }
    addVideo() {
        assert(this.source.hasScreenAndCam);
        const vidCont = this.contRef.current;
        assert(vidCont);
        if (vidCont.firstChild !== this.ownVideo) {
            this.displayVideoElement(this.ownVideo, vidCont);
        }
    }
    delVideo() {
        SfuClient.playerStop(this.ownVideo);
        const vidCont = this.contRef.current;
        if (!vidCont) {
            return;
        }
        vidCont.replaceChildren();
    }
    requestVideo(forceVisible) {
        if (!this.isComponentVisible() && !forceVisible) {
            return;
        }
        if (this.player) {
            this.playVideo();
        }
        else {
            this.addVideo();
            this.player = this.source.sfuPeer.getThumbVideo((player) => {
                return this;
            });
        }
    }
    playVideo() {
        const track = this.player.slot?.inTrack;
        if (!track) {
            return;
        }
        SfuClient.playerPlay(this.ownVideo, track, true);
    }
    // SfuClient IVIdeoPlayerGui interface
    attachToTrack(track) {
        if (!this.source.hasScreenAndCam) {
            return;
        }
        SfuClient.playerPlay(this.ownVideo, track);
    }
    detachFromTrack() {
        this.delVideo();
    }
    onPlayerDestroy() {
        delete this.player;
    }
    componentWillUnmount() {
        if (this.player) {
            this.player.destroy();
        }
        super.componentWillUnmount();
    }
    _onRxStats(track, info, raw) {
        if (this.player) {
            this.displayStats(CallManager2.Call.rxStatsToText(track, info, raw));
        }
    }
}
/** Hi-resolution peer video, cloned from the peer's hi-res track. Essentially a DynVideoCloned, but never lowers
 * quality down to thumbnail track, i.e. uses only the hi-res track. Used for presenter views. */
export class PeerVideoHiResCloned extends DynVideoCloned {
    constructor(props) {
        super(props, props.source);
        this.noThumb = true;
        this.requestVideo = this.dynRequestVideo;
    }
}
/** Hi-resolution local video cloned from the local screen track. Used for presenter views. */
export class LocalVideoHiResCloned extends VideoNode {
    constructor(props) {
        super(props, props.chatRoom.call.getLocalStream());
        this.isLocal = true;
        this.ownVideo = CallManager2.createVideoElement();
    }
    get isLocalScreen() {
        return this.source.av & Av.Screen;
    }
    requestVideo(forceVisible) {
        if (d > 1 && forceVisible) {
            console.debug('ignoring forceVisible');
        }
        const vidCont = this.contRef.current;
        if (!vidCont) {
            return;
        }
        const track = this.source.sfuClient.localScreenTrack();
        if (!track) {
            vidCont.replaceChildren();
        }
        else {
            if (vidCont.firstChild !== this.ownVideo) {
                // insert our cloned video in the DOM
                this.displayVideoElement(this.ownVideo, vidCont);
            }
            SfuClient.playerPlay(this.ownVideo, track, true);
        }
    }
}
/** Hi-resolution local video. Uses the dynamic video mechanism as well, to avoid blackout/flicker */
export class LocalVideoHiRes extends DynVideoDirect {
    constructor(props) {
        super(props, props.chatRoom.call.getLocalStream());
        this.isLocal = true;
    }
    get isLocalScreen() {
        return this.source.av & Av.Screen;
    }
}
export class LocalVideoThumb extends VideoNode {
    constructor(props) {
        const source = props.chatRoom.call.getLocalStream();
        super(props, source);
        this.isLocal = true;
        this.isLocalScreen = (source.av & Av.Screen) && !(source.av & Av.Camera);
        this.sfuClient = props.chatRoom.call.sfuClient;
        this.ownVideo = CallManager2.createVideoElement();
    }
    requestVideo() {
        const vidCont = this.contRef.current;
        if (!vidCont) {
            return;
        }
        const currVideo = vidCont.firstChild;
        // local thumbnails display camera if available, and screen only if not
        const track = this.isLocalScreen ? this.sfuClient.localScreenTrack() : this.sfuClient.localCameraTrack();
        if (!track) {
            if (currVideo) {
                vidCont.replaceChildren();
            }
        }
        else {
            if (!currVideo) {
                // insert our cloned video in the DOM
                this.displayVideoElement(this.ownVideo, vidCont);
            }
            else {
                assert(currVideo === this.ownVideo);
            }
            SfuClient.playerPlay(this.ownVideo, track, true);
        }
    }
    onAvChange() {
        const av = this.sfuClient.availAv;
        this.isLocalScreen = (av & Av.Screen) && !(av & Av.Camera);
        super.onAvChange();
    }
}
export class AudioLevelIndicator extends React.Component {
    constructor(props) {
        super(props);
        this.source = props.source;
        this.indicatorRef = React.createRef();
        this.updateAudioLevel = this.updateAudioLevel.bind(this);
    }
    componentDidMount() {
        this.source.registerVuLevelConsumer(this);
    }
    componentWillUnmount() {
        this.source.unregisterVuLevelConsumer(this);
    }
    updateAudioLevel(level) {
        const levelInd = this.indicatorRef.current;
        if (!levelInd) {
            return;
        }
        level = Math.round(level * 400);
        if (level > 90) {
            level = 90;
        }
        levelInd.style.height = `${level + 10}%`;
    }
    render() {
        const { audioMuted } = this.source;
        return (
            <span
                className="simpletip"
                data-simpletip-class="theme-dark-forced"
                data-simpletipposition="top"
                data-simpletipoffset="5"
                data-simpletip={audioMuted ? l.muted /* `Muted` */ : ''}>
                <i
                    className={`
                        sprite-fm-mono
                        ${audioMuted ? 'icon-mic-off-thin-outline inactive' : 'icon-mic-thin-outline'}
                    `}>
                    {audioMuted ? null : <div ref={this.indicatorRef} className="mic-fill"/>}
                </i>
            </span>
        );
    }
}
