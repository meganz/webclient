import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Avatar } from '../contacts.jsx';
import Call, { MODE } from './call.jsx';
import VideoNodeMenu from './videoNodeMenu.jsx';

/** The class hiearachy of video components is the following:
                                    VideoNode
                              (Base rendering code)
                              /                    \
                            /                       \
                     DynVideo                  LocalVideoThumb
            (Uses an externally managed        (shows local camera track if avail,
              (dynamic) video player)           otherwise screenshare track)
              /                      \
             /                        \
  DynVideoCloned                   DynVideoDirect
 (uses a clone of             (renders the pre-loaded
the dynamic player              dynamic player directly,
for smooth swithcing)             /                \
        |                        /                  \
PeerVideoThumb           PeerVideoHiRes          LocalVideoHiRes
(Thumbnail video         (Big video of       (shows screenshare track if avail,
 of a peer, used in       a peer,used in         otherwise camera track)
 the RHP. If peer).       main, self and
has screen+cam, locks     mini view)
on the thumb stream,
(non-dynamic mode))
*/
/** Base class for all video components - does the actual rendering */
class VideoNode extends MegaRenderMixin {
    nodeRef = React.createRef();
    contRef = React.createRef();
    statsHudRef = React.createRef();

    /*
        Methods and properties that descendants must implement:
        requestVideo();
        isThumb
        isLocal
        isDirect
    */

    constructor(props, source) {
        super(props);
        this.isVideo = true; // the source uses this to differentiate video widgets from other event subscribers
        this.source = source;
    }

    componentDidMount() {
        super.componentDidMount();
        this.source.registerConsumer(this);
        if (this.props.didMount) {
            this.props.didMount(this.nodeRef?.current);
        }
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

    displayVideoElement(video, container) {
        this.attachVideoElemHandlers(video);
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
        video._snSetup = true;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
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
        if (source.isStreaming()) {
            return (
                <div
                    ref={this.contRef}
                    className="video-node-holder"
                />
            );
        }
        delete this._lastResizeWidth;
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
        const { mode, chatRoom } = this.props;
        const source = this.source;
        const sfuClient = chatRoom.call.sfuClient;
        const userHandle = source.userHandle;
        const $$CONTAINER = ({ children }) => <div className="video-node-status theme-dark-forced">{children}</div>;
        const onHoldLabel = l[23542].replace('%s', M.getNameByHandle(userHandle)); /* `%s has put the call on hold` */
        if (source.isOnHold) {
            return <$$CONTAINER>{this.getStatusIcon('icon-pause', onHoldLabel)}</$$CONTAINER>;
        }

        return (
            <>
                {
                    // If in `Main` mode and the participant is a moderator -- show icon in the top-right corner
                    mode === MODE.MAIN &&
                    Call.isModerator(chatRoom, userHandle) &&
                    this.getStatusIcon('icon-admin-outline call-role-icon', l[8875] /* `Moderator` */)
                }
                <$$CONTAINER>
                    {source.audioMuted ? this.getStatusIcon('icon-mic-off-thin-outline', l.muted /* `Muted` */) : null}
                    {sfuClient.haveBadNetwork ?
                        this.getStatusIcon('icon-weak-signal', l.poor_connection /* `Poor connection` */) : null}
                    {source.hasScreenAndCam && this.isThumb ?
                        this.getStatusIcon('icon-pc-linux', 'Sharing screen') : null}
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

        return (
            <div
                ref={nodeRef}
                className={`
                    video-node
                    ${onClick ? 'clickable' : ''}
                    ${className || ''}
                    ${isLocal && !isLocalScreen ? ' local-stream-mirrored' : ''}
                    ${simpletip ? 'simpletip' : ''}
                `}
                data-simpletip={simpletip?.label}
                data-simpletipposition={simpletip?.position}
                data-simpletipoffset={simpletip?.offset}
                data-simpletip-class={simpletip?.className}
                onClick={ev => onClick && onClick(source, ev)}>
                {source && (
                    <>
                        {children || null}
                        <div className="video-node-content">
                            {CallManager2.Call.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null}
                            {this.renderContent()}
                            { mode === MODE.MINI || minimized ? null : this.renderStatus()}
                        </div>
                    </>
                )}
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
        this._lastResizeWidth = null;
        this.safeForceUpdate();
    }
    dynRequestVideo(forceVisible) {
        const {source} = this;
        if (source.isFake || source.isDestroyed) {
            return;
        }
        if (source.isStreaming() && this.isMounted() && (this.isComponentVisible() || forceVisible)) {
            const node = this.findDOMNode();
            this.dynRequestVideoBySize(node.offsetWidth, node.offsetHeight);
        }
        else {
            this.dynRequestVideoBySize(0, 0);
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
    dynRequestVideoBySize(w) {
        // console.warn(`requestVideoBySize[${stream.clientId}]: ${w}x${h}(lastw: ${this._lastResizeWidth})`);
        if (w === 0) {
            this._lastResizeWidth = 0;
            this.dynRequestVideoQuality(CallManager2.VIDEO_QUALITY.NO_VIDEO);
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
        this.dynRequestVideoQuality(newQ);
    }
    /** Callback called from source to all consumers when the dyn stream changes */
    dynUpdateVideoElem() {
        const vidCont = this.contRef.current;
        if (!this.isMounted() || !vidCont) {
            return;
        }
        const player = this.source.player;
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
        this.ownVideo = document.createElement("video");
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
/* Can operate in two modes - dynamic video cloned, or statically obtain thumbnail stream
 The second is needed when the peer does screensharing + camera, in which case the thumbnail (which should
 display peer's camera video) cannot simply clone the dynamic stream, but must explicitly play the video
 thiumbnail stream
*/
export class PeerVideoThumb extends DynVideoCloned {
    constructor(props) {
        super(props, props.source);
        this.isThumb = true;
        if (CallManager2.Call.VIDEO_DEBUG_MODE) {
            this.onRxStats = this._onRxStats; // for staticThumb track
        }
    }
    requestVideo(forceVisible) {
        if (!this.source.hasScreenAndCam) {
            if (this.fixedThumbPlayer) {
                this.fixedThumbPlayer.destroy();
            }
            this.dynRequestVideo(forceVisible);
        }
        else {
            delete this.requestedQ;
            this.requestFixedThumbVideo();
        }
    }
    addFixedThumbVideo() {
        assert(this.source.hasScreenAndCam);
        const vidCont = this.contRef.current;
        assert(vidCont);
        if (vidCont.firstChild !== this.ownVideo) {
            vidCont.replaceChildren(this.ownVideo);
        }
    }
    delFixedThumbVideo() {
        SfuClient.playerStop(this.ownVideo);
        const vidCont = this.contRef.current;
        if (!vidCont) {
            return;
        }
        vidCont.replaceChildren();
    }
    requestFixedThumbVideo() {
        if (this.fixedThumbPlayer) {
            this.playFixedThumbVideo();
        }
        else {
            this.addFixedThumbVideo();
            this.fixedThumbPlayer = this.source.sfuPeer.getThumbVideo((player) => {
                this.fixedThumbPlayer = player;
                return this;
            });
        }
    }
    playFixedThumbVideo() {
        const track = this.fixedThumbPlayer.slot?.inTrack;
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
        this.delFixedThumbVideo();
    }
    onPlayerDestroy() {
        delete this.fixedThumbPlayer;
    }
    _onRxStats(track, info, raw) {
        if (!this.source.player) {
            this.displayStats(CallManager2.Call.rxStatsToText(track, info, raw));
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
        this.isLocal = this.isThumb = true;
        this.isLocalScreen = (source.av & Av.Screen) && !(source.av & Av.Camera);
        this.sfuClient = props.chatRoom.call.sfuClient;
        this.ownVideo = document.createElement("video");
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
        this.safeForceUpdate();
    }
}
