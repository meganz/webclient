/* eslint-disable indent */
(function(scope) {
    'use strict';

    const VIDEO_QUALITY = {
        NO_VIDEO: 0,
        THUMB: 1,
        LOW: 2,
        MEDIUM: 3,
        HIGH: 4
    };
    const RES_STATE = {
        NO_VIDEO: 0,
        THUMB: 1,
        THUMB_PENDING: 2,
        HD: 3,
        HD_PENDING: 4
    };
    const DOWNGRADING_QUALITY_INTRVL = 2000;
    const NO_SIMUL_SCRSHARE_AND_CAMERA = false;

 /**                        ==== Overview of peer & local video rendering ====
 * The app creates a VideoNode-derived React component for each video it wants to display - for peers (PeerVideoThumb
 * or PeerVideoHiRes), local camera (LocalVideoThumb and LocalVideoHiRes). Video components are passed a "source"
 * object (implementing an imaginary StreamSource interface), which is responsible for providing the video stream.
 * For peers, this is the Peer object. For local video, this is a LocalPeerStream object. A single StreamSource can
 * have multiple VideoNode-s attached to it.
 * Most of the VideoNode components implement the "dynamic video" mechanism, in which the GUI displays an externally
 * provided video player, which may be changed externally at any time. The purpose if this is to have the player exist
 * and load the video stream before it is rendered in the GUI, allowing for smooth switching between video sources, i.e.
 * when changing the selected peer in MainView mode.
 * Such video components are derived from the DynVideo react class. These components are registered with the
 * StreamSource as "consumers". A StreamSource keeps track of all its consumers and the video resolution they need.
 * It requests from the SFU a resolution that satisfies the requirement of all consumers, i.e. is higher or equal
 * to the resolution each of them demands. The most important parts of the interface between the VideoNode and the
 * StreamSource are:
 * - StreamSource.player is the video element managed by the StreamSource. This is the actual video source.
 *   The lifetime of this object is independent of the lifetime of the GUI/consumers, and is external to React.
 * - VideoNode.requestedQuality - informs the StreamSource object what resolution the VideoNode consumer
 *   requires
 * - StreamSource.dynUpdateVideoQuality() - calculates the quality needed to satisfy all consumers and requests it
 *   from the SFU. When a DynVideo component wants to changes its demanded video quality, it updates its
 *  .requestedQuality property and calls StreamSource.dynUpdateVideoQuality()
 * - DynVideo.dynUpdateVideoElem() - updates the DOM of the DynVideo to display the current StreamSource.player video.
 *   This is called both internally by the DynVideo, and externally by StreamSource, when StreamSource.player changes
 *   asynchronously
 *
 * Direct and cloned video display
 * Ideally, all consumers of a StreamSource would simply display the StreamSource.player video. However,
 * a DOM element can't be mounted more than once in the DOM, so each VideoNode consumer must display a different
 * <video> player. So one of them displays the "original" external StreamSource.player <video> element,
 * and the others are "clones", managed by React and having their .srcObject assigned to that of the original .player
 * element. Hence, the DynVideo renders the video in one of two modes - "external" or "cloned". The Hi-Res versions of
 * the video components display the external player, so that they can start rendering the video immediately. Thumbnail
 * videos use cloned players.
 *
 * Smooth video switching
 * When switching a StreamSource between thumbnail and hi-res track, it takes a bit of time for the newly requested
 * track to start playing. If the track is directly fed into the visible <video> player, this will cause a short
 * blackout before the new resolution video starts. To avoid this, two indenepdent <video> players are used while
 * switching, and StreamSource.player points to the one currently displayed. The current track and video player
 * are kept running and displayed while the newly requested track is being buffered. When the player of the new
 * track fires the "onplay" event, the "old" player is swapped with the "new" one instantly, by changing the
 * .player property and calling dynUpdateVideoElem() on all consumers. The old track can then be stopped
 * and the old player destroyed.
 *
 * Gradual resolution downgrade
 * When the Peer StreamSource switches from higher to lower resolution, it does it in steps over a period of time.
 * This is done in case the higher resolution is needed again very soon, i.e. when the active speaker
 * changes back and forth between two peers, or the user selects again a previous peer in the carousel view.
 * This is especially useful when the downgrade involves switching from the hi-res to the vthumb tracks, which
 * would be avoided in a quick back-and-forth situation.
 */
    class Peer extends MegaDataObject {
        constructor(call, userHandle, clientId, av) {
            super({
                'clientId': null,
                'userHandle': null,
                'isVisible': null,
                'isActive': null,
                'lastSpeaktime': null
            });
            this.call = call;
            this.userHandle = userHandle;
            this.clientId = clientId;
            this.sfuPeer = call.sfuClient.peers.get(clientId);
            this.isActive = false;
            this.consumers = new Set();
            this.vuLevelConsumers = new Set();
            this.currentQuality = VIDEO_QUALITY.NO_VIDEO;
            this.resState = RES_STATE.NO_VIDEO;
            this.player = null;
            this.onHdReleaseTimer = this._onHdReleaseTimer.bind(this);
            this.onAvChange(av);
            call.peers.push(this);
            this.onAudioLevel = this.onAudioLevel.bind(this);
            if (this.sfuPeer) { // we may be a test fake peer with invalid clientId, in which case sfuPeer is undefined
                this.sfuPeer.requestAudioLevel(this.onAudioLevel);
            }
        }
        destroy() {
            this.hdReleaseTimerStop();
            this.call.peers.remove(this.clientId);
            this.isDestroyed = true;
        }
        get name() {
            return M.getNameByHandle(this.userHandle);
        }
        get hasScreen() {
            return !!(this.av & Av.Screen);
        }
        setResState(newState) {
            this.resState = newState;
            const thumbVideo = this.vThumbPlayer && this.vThumbPlayer.gui.video;
            const hdVideo = this.hiResPlayer && this.hiResPlayer.gui.video;
            const player = (newState === RES_STATE.HD || newState === RES_STATE.THUMB_PENDING)
                ? hdVideo || thumbVideo
                : thumbVideo || hdVideo;
            // console.warn(`setResState[${this.clientId}]: ->`, newState, this.player);
            const changed = this.player !== player;
            this.player = player;
            if (changed) {
                this.updateConsumerVideos();
            }
        }
        isStreaming() {
            const { av } = this.sfuPeer;
            // console.warn(`isStreaming[${this.clientId}]:`, !(av & Av.onHold) && (av & Av.Video));
            return !(av & Av.onHold) && (av & Av.Video);
        }
        onAvChange(av, oldAv) {
            const Av = SfuClient.Av;
            this.isOnHold = !!(av & Av.onHold);
            if (this.onHold) {
                this.audioMuted = this.videoMuted = true;
                this.isScreen = this.hasScreenAndCam = false;
                delete this.hdLowQualityStart;
            }
            else {
                this.audioMuted = !(av & Av.Audio);
                this.videoMuted = !(av & Av.Camera);
                this.hasScreenAndCam = !!((av & Av.ScreenHiRes) && (av & Av.CameraLowRes));
                this.isScreen = !!(av & Av.ScreenHiRes);
                const scrChange = !!((av ^ oldAv) & Av.ScreenHiRes);
                if (scrChange) {
                    this.hdLowQualityStart = this.isScreen;
                }
            }
            if ((av ^ this.av) & Av.Recording) {
                this.isRecording = !!(av & Av.Recording);
                this.call.recorderCid = this.clientId;
                megaChat.plugins.userHelper.fetchAllNames([this.userHandle], this.call.chatRoom)
                    .catch(dump)
                    .finally(() => {
                        this.call.chatRoom.trigger(
                            this.isRecording ? 'onRecordingStarted' : 'onRecordingStopped',
                            this
                        );
                    });
            }
            this.av = av;
            for (const cons of this.consumers) {
                cons.onAvChange();
            }
        }
        registerConsumer(cons) {
            this.consumers.add(cons);
            if (cons.isDirect && this.player) {
                Promise.resolve(this.player.play()).catch(nop);
            }
        }
        deregisterConsumer(cons) {
            this.consumers.delete(cons);
            if (cons.requestedQ !== undefined && !this.isDestroyed) {
                this.dynUpdateVideoQuality();
            }
        }
        registerVuLevelConsumer(cons) {
            this.vuLevelConsumers.add(cons);
        }
        unregisterVuLevelConsumer(cons) {
            this.vuLevelConsumers.delete(cons);
        }
        onAudioLevel(level) {
            if (level === this.lastVuLevel) {
                return;
            }
            this.lastVuLevel = level;
            for (const cons of this.vuLevelConsumers) {
                cons.updateAudioLevel(level);
            }
        }
        hdReleaseTimerStop() {
            if (this.hdReleaseTimer) {
                clearInterval(this.hdReleaseTimer);
                delete this.hdReleaseTimer;
                delete this.targetQuality;
            }
        }
        hdReleaseTimerRestart(targetQ) {
            this.hdReleaseTimerStop();
            this.targetQuality = targetQ;
            this.hdReleaseTimer = setInterval(this.onHdReleaseTimer, DOWNGRADING_QUALITY_INTRVL);
        }
        _onHdReleaseTimer() {
            if (this.isDestroyed) {
                console.error("SoftAssert: onHdReleaseTimer on destroyed peer");
                return;
            }
            if (isNaN(this.targetQuality) || this.currentQuality <= this.targetQuality) {
                this.hdReleaseTimerStop();
                console.warn("onHdReleaseTimer: BUG: Target quality is not set, or is higher than current");
                return;
            }
            const newQ = this.currentQuality - 1;
            if (newQ <= this.targetQuality) {
                this.hdReleaseTimerStop();
            }
            this.doGetVideoWithQuality(newQ);
        }
        noVideoSlotsForSmoothSwitch() {
            const sfuClient = this.call.sfuClient;
            return sfuClient.numRxHiRes + sfuClient.numRxVthumb >= sfuClient.numInputVideoTracks - 1;
        }
        /** Get a video stream that satisfies the quality minimum for all consumers
         * @returns {boolean} - true if video source changed synchronously, which can happen only if video was disabled,
         * or if there was no free slot for parallel request to change hi-res<->vthumb quality
         */
        dynUpdateVideoQuality() {
            // if no free tracks, change the quality "in-place", rather than using a second track for smooth switching
            // leave 2 tracks for race conditions, etc
            this._consumersUpdated = false;
            var maxQ = 0;
            for (const { requestedQ } of this.consumers) {
                if (requestedQ === undefined) {
                    continue; // not a dynamic video consumer
                }
                if (requestedQ > maxQ) {
                    maxQ = requestedQ;
                    if (requestedQ === VIDEO_QUALITY.HIGH) {
                        break;
                    }
                }
            }
            if (this.hdLowQualityStart & maxQ > 2) {
                maxQ = 2;
             // console.warn("Limiting quality to 2 for low HD start");
            }
            if (maxQ === this.currentQuality) {
                this.hdReleaseTimerStop();
            }
            else if (maxQ > this.currentQuality) {
                // immediately change quality
                this.hdReleaseTimerStop();
                this.doGetVideoWithQuality(maxQ);
            }
            else { // maxQ < this.currentQuality
                if (maxQ === VIDEO_QUALITY.NO_VIDEO && (this.sfuPeer.av & Av.Video) === 0) {
                    this.hdReleaseTimerStop();
                    this.doGetVideoWithQuality(maxQ);
                }
                else {
                    // start gradual lowering of stream quality
                    this.hdReleaseTimerRestart(maxQ);
                }
            }
            return this._consumersUpdated; // return false for all cases except the ones that immediately change quality
        }
        /** Change the quailty of the common video stream
         * @param {number} newQuality - the requested quality
         */
        doGetVideoWithQuality(newQuality) {
            if (this.currentQuality === newQuality) {
                return;
            }
            this.currentQuality = newQuality;
            if (newQuality > VIDEO_QUALITY.THUMB) {
                this.requestHdStream(4 - newQuality); // convert quality to resolution divider
            }
            else if (newQuality === VIDEO_QUALITY.THUMB) {
                if (this.hasScreenAndCam) {
                    this.requestHdStream(2);
                }
                else {
                    this.requestThumbStream();
                }
            }
            else if (newQuality === VIDEO_QUALITY.NO_VIDEO) {
                this.setResState(RES_STATE.NO_VIDEO);
                this.delHiResPlayer();
                this.delVthumbPlayer();
            }
        }
        updateConsumerVideos() {
            for (const cons of this.consumers) {
                if (cons.dynUpdateVideoElem) {
                    cons.dynUpdateVideoElem();
                }
            }
            this._consumersUpdated = true;
        }
        delHiResPlayer() {
            if (this.hiResPlayer) {
                this.hiResPlayer.destroy();
            }
        }
        delVthumbPlayer() {
            if (this.vThumbPlayer) {
                this.vThumbPlayer.destroy();
            }
        }
        requestHdStream(resDivider) {
            const peer = this.sfuPeer;
            if (peer.isLeavingCall) {
                console.error("SoftAssert: requestHdStream on a deleted peer");
                return;
            }
            if (this.hiResPlayer) {
                assert(this.resState !== RES_STATE.THUMB);
                if (!this.hdLowQualityStart) {
                    this.hiResPlayer.setHiResDivider(resDivider);
                }
                if (this.resState === RES_STATE.THUMB_PENDING) { // cancel vthumb request, revert to hi-res
                    this.delVthumbPlayer();
                    this.setResState(RES_STATE.HD);
                }
                return;
            }
            // request hi-res stream
            if (this.noVideoSlotsForSmoothSwitch()) { // FIXME: disable this if .presenterVideo ?
                console.warn("requestHdStream: No free video slots, freeing vthumb one if used");
                this.delVthumbPlayer();
            }
            if (this.hdLowQualityStart) {
                resDivider = 2;
             // console.warn("requestHdStream: Limiting HD quality to 2 for low HD start");
            }
            this.hiResPlayer = peer.getHiResVideo(resDivider, (sfuPlayer) => {
                return new PlayerCtx(this.call, sfuPlayer);
            });
            this.setResState(RES_STATE.HD_PENDING);
            this.hiResPlayer.gui.video.onplaying = () => {
                if (this.resState !== RES_STATE.HD_PENDING) {
                    return false;
                }
                this.delVthumbPlayer();
                this.setResState(RES_STATE.HD);
                if (this.hdLowQualityStart) {
                    delete this.hdLowQualityStart;
                 // console.warn("hdPlayer screenshare started in low hd quality, ramping up quality");
                    this.dynUpdateVideoQuality();
                }
                return true;
            };
        }
        requestThumbStream() {
            const peer = this.sfuPeer;
            if (peer.isLeavingCall) {
                console.error("softAssert: requestThumbStream on a deleted peer");
                return;
            }
            if (this.vThumbPlayer) {
                assert(this.resState !== RES_STATE.HD);
                if (this.resState === RES_STATE.HD_PENDING) {
                    this.delHiResPlayer();
                    this.setResState(RES_STATE.THUMB);
                }
                return;
            }
            if (this.noVideoSlotsForSmoothSwitch()) {
                console.warn("requestThumbStream: No free video slot, freeing hires one if used");
                this.delHiResPlayer();
            }
            this.vThumbPlayer = peer.getThumbVideo((player) => {
                return new PlayerCtx(this.call, player);
            });
            this.setResState(RES_STATE.THUMB_PENDING);
            this.vThumbPlayer.gui.video.onplaying = () => {
                if (this.resState !== RES_STATE.THUMB_PENDING) {
                    if (this.resState === RES_STATE.HD) {
                        // vthumb request was aborted meanwhile, hd re-used. Delete the vthumb stream
                        this.delVthumbPlayer();
                    }
                    return;
                }
                this.delHiResPlayer();
                this.setResState(RES_STATE.THUMB);
            };
        }
        onPlayerDestroy(player) {
            if (player === this.hiResPlayer) {
                delete this.hiResPlayer;
            }
            else if (player === this.vThumbPlayer) {
                delete this.vThumbPlayer;
            }
            else {
                return;
            }
            // clean up cached quality, if there are no players
            if (!this.hiResPlayer && !this.vThumbPlayer) {
                this.currentQuality = VIDEO_QUALITY.NO_VIDEO;
                // console.warn("No video from peer, setting quality to NO_VIDEO");
            }
        }
    }

    class Peers extends MegaDataSortedMap {
        constructor(call) {
            super("clientId", undefined, call.chatRoom);
            this.call = call;
        }
        find(cb) {
            for (const key of this.keys()) {
                const peer = this[key];
                if (cb(peer)) {
                    return peer;
                }
            }
            return undefined;
        }
        findLast(cb) {
            const keys = this.keys();
            for (let i = keys.length - 1; i >= 0; i--) {
                const peer = this[keys[i]];
                if (cb(peer)) {
                    return peer;
                }
            }
            return undefined;
        }
        addFakeDupStream() {
            var ids = this.keys();
            if (!ids || ids.length === 0) {
                if (d) {
                    console.error("No streams found");
                }
                return false;
            }
            var s = this[array.random(ids)];
            var sCloned = new Peer(
                this.call,
                s.userHandle,
                s.clientId + rand_range(1, 20)
            );
            sCloned.sfuPeer = s.sfuPeer;
            sCloned.isFake = true;
            /*
            Object.keys(s).forEach((k) => {
                sCloned[k] = s[k];
            });
            */
        }
        removeFakeDupStream() {
            for (let i = this.length - 1; i >= 0; i--) {
                const peer = this.getItem(i);
                if (peer.isFake) {
                    peer.destroy();
                    return;
                }
            }
        }
    }

    const CALL_VIEW_MODES = {
        'THUMBNAIL': 1,
        'MAIN': 2,
        'MINI': 3
    };

    class Call extends MegaDataObject {
        constructor(chatRoom, callId, callKey) {
            super({
                'chatRoom': null,
                'callId': null,
                'av': null,
                'localVideoStream': null,
                'viewMode': null,
                'speakerCid': null, // can be 0 - means us, and null - means nobody is the active speaker
                'pinnedCid': null, // can be 0 - means pinned local video, and null - means nothing pinned
                'presenterStreams': new Set(),
                'activeVideoStreamsCnt': 0,
                'ts': Date.now(),
                'left': false
            });
            this.chatRoom = chatRoom;
            this.callId = callId;
            this.peers = new Peers(this);
            this.viewMode = CALL_VIEW_MODES.THUMBNAIL;
            this.stayOnEnd = !!mega.config.get('callemptytout');

            chatRoom.meetingsLoading = l.joining;
            SfuClient.speakDetectorUseSetTimeout = true;
            this.sfuClient = window.sfuClient = new SfuClient(u_handle, this, callKey, { numVideoSlots: 60 });
            this.localPeerStream = new LocalPeerStream(this); // needs this.sfuClient
            // Peer is alone in a group call after 1 min -> mute mic
            tSleep(60).then(() => this.muteIfAlone()).catch(dump);
        }
        connect(url, audio, video) {
            const {sfuClient} = this;
            sfuClient.muteAudio(!audio);
            sfuClient.muteCamera(!video);
            return sfuClient.connect(url, this.callId, {isGroup: this.chatRoom.type !== "private"});
        }
        setOrganiser(userHandle) {
            this.organiser = userHandle;
        }
// SfuClient.IClientEventListener interface
        onServerError(errCode) {
            console.error('onServerError:', errCode);
            if (errCode === SfuClient.TermCode.kErrProtocolVersion) {
                return megaChat.showUpgradeDialog();
            }
        }
        onJoined() {
            for (const peer of this.sfuClient.peers.values()) {
                this.onPeerJoined(peer, true);
            }
            this.chatRoom.trigger('onCallIJoined');
            this.chatRoom.meetingsLoading = false;
            this.chatRoom.unbind("onCallLeft.start");
            this.chatRoom.megaChat.trigger('sfuConnOpen');
        }
        onPeerJoined(sfuPeer, isInitial) {
            const appPeer = new Peer(this, sfuPeer.userId, sfuPeer.cid, sfuPeer.av);
            if (appPeer.hasScreen) {
                this.presenterStreams.add(sfuPeer.cid);
                this.handlePeerScreenChange(sfuPeer.cid);
            }
            if (!isInitial) {
                this.chatRoom.trigger('onCallPeerJoined', sfuPeer.userId);
            }
            if (sfuPeer.userId !== u_handle) {
                this.callTimeoutDone();
            }
            if (this.stayOnEnd !== !!mega.config.get('callemptytout')) {
                this.stayOnEnd = !!mega.config.get('callemptytout');
            }
        }
        onPeerLeft(peer, reason) {
            if (this.speakerCid === peer.cid) {
                this.speakerCid = null;
            }
            if (this.pinnedCid === peer.cid) {
                this.pinnedCid = null;
            }
            this.presenterStreams.delete(peer.cid);
            this.handlePeerScreenChange(peer.cid);

            this.peers[peer.cid].destroy();
            this.chatRoom.trigger('onCallPeerLeft', { userHandle: peer.userId, clientId: peer.cid, reason });
            if (peer.userId !== u_handle) {
                // Delay so that the ParticipantsNotice changes at the same time as the notification shows
                tSleep(3).always(() => {
                    if (!this.peers || !this.peers.length) {
                        this.left = true;
                    }
                });
            }
            // Peer is left alone in a group call -> mute mic
            if (peer.client.isLeavingCall) {
                this.muteIfAlone();
            }
            this.recordActiveStream();
        }
        onActiveSpeakerChange(newSpeakerCid/* , prevSpeakerCid */) {
            this.speakerCid = newSpeakerCid;
            this.recordActiveStream();
        }
        recordActiveStream() {
            if (!this.sfuClient.isRecording || this.sfuClient.isOnHold) {
                return;
            }
            const { peers, pinnedCid, localPeerStream, sfuClient } = this;
            let src, tag;
            if (localPeerStream.isScreen) {
                src = localPeerStream;
                tag = "local screen";
            }
            // pinnedCid === 0 means the user pinned their local video
            else if ((src = (pinnedCid === 0) ? localPeerStream : peers[pinnedCid])) {
                tag = "pinned";
            }
            else if ((src = peers.findLast(p => p.isScreen))) {
                tag = "peer screen";
            }
            else if ((src = this.getActiveSpeaker()) && (src.av & Av.HiResVideo)) {
                tag = "active speaker";
            }
            else if ((src = peers.find(p => p.av & Av.HiResVideo))) {
                tag = "fallback: first peer with video";
            }
            else if (localPeerStream.av & Av.Video) {
                src = localPeerStream;
                tag = "fallback: local video";
            }
            else if (src = this.getActiveSpeaker()) {
                tag = "fallback: active speaker (no video)";
            }
            else if (src = peers.getItem(0)) {
                tag = "fallback: first peer (no video)";
            }
            else {
                tag = "fallback: (self) no video";
                src = localPeerStream;
            }
            assert(src);
            const srcCid = src.clientId;
            const handle = src.userHandle;
            const hasVideo = (src.av & Av.HiResVideo) !== 0;
            const isScreen = (src.av & Av.ScreenHiRes) !== 0;
            const recTrack = sfuClient.recordedVideoTrack;
            const recScreen = recTrack ? !!recTrack.isScreen : false;
            if ((srcCid === sfuClient.recordedVideoCid) && (hasVideo === !!recTrack) && isScreen === recScreen) {
                return; // no change
            }
            this.chatRoom.trigger('onRecordingActivePeer', src);
            const user = M.getUserByHandle(handle);
            const caption = user ? user.name : null;
            let avatar = avatars[handle]; // avatar can't be undefined
            avatar = avatar
                ? avatar.url
                : new AvatarRenderer(handle);

            console.warn(`Recording: switching to ${hasVideo ? "video" : "avatar"} of cid ${srcCid} (${tag})`);
            sfuClient.recSetVideoSource(srcCid, avatar, caption);
        }
        onPeerAvChange(peer, av, oldAv) {
            const callManagerPeer = this.peers[peer.cid];
            assert(callManagerPeer);
            const oldScreen = callManagerPeer.hasScreen;
            const oldScreenAndCam = callManagerPeer.hasScreenAndCam;
            const newScreen = !!(av & Av.Screen);
            const newScreenAndCam = !!(av & Av.Screen) && !!(av & Av.Camera);
            const prevSize = this.presenterStreams.size;
            if (newScreen) {
                if (!oldScreen) {
                    this.presenterStreams.add(peer.cid);
                }
            }
            else if (oldScreen) {
                this.presenterStreams.delete(peer.cid);
            }
            if (prevSize !== this.presenterStreams.size) {
                this.handlePeerScreenChange(peer.cid);
            }
            // Trigger update on the state of the Call object after modifying presenterStreams. This will possibly
            // switch the call view between thumbnail and main view mode
            if (newScreen !== oldScreen || oldScreenAndCam !== newScreenAndCam) {
                this.trackDataChange();
             // console.warn("screen/cam: track data change");
            }
            callManagerPeer.onAvChange(av, oldAv);
            if ((av ^ oldAv) & Av.Video) {
                this.recordActiveStream();
            }
            this.chatRoom.trigger('onPeerAvChange', peer);
        }
        onNoMicInput() {
            this.chatRoom.trigger('onNoMicInput');
        }
        onMicSignalDetected(signal) {
            this.chatRoom.trigger('onMicSignalDetected', signal);
        }
        onConnStats(stats) {
            if (this.av & Av.Audio) {
                this.localPeerStream.onAudioLevel(this.sfuClient.micAudioLevel);
            }
        }
        onBadNetwork(e) {
            this.chatRoom.trigger('onBadNetwork', e);
        }
        onDisconnect(termCode, willReconnect) {
            if (willReconnect) {
                this.chatRoom.megaChat.trigger('sfuConnClose');
            }
            else if (!this.isDisconnecting) {
                this.handleDisconnect(termCode);
            }
        }
        onLocalMediaQueryError(type, err) {
            megaChat.trigger('onLocalMediaQueryError', { type, err });
        }
        wrOnJoinAllowed() {
            this.chatRoom.trigger('wrOnJoinAllowed', this.callId);
            this.chatRoom.call.sfuClient.joinCall();
        }
        wrOnJoinNotAllowed() {
            this.chatRoom.trigger('wrOnJoinNotAllowed', this.callId);
        }
        wrOnUsersEntered(users) {
            megaChat.plugins.userHelper.fetchAllNames(Object.keys(users), this.chatRoom).catch(dump).finally(() => {
                this.chatRoom.trigger('wrOnUsersEntered', users);
            });
        }
        wrOnUserLeft(user) {
            this.chatRoom.trigger('wrOnUserLeft', user);
        }
        wrOnUsersAllow(users) {
            this.chatRoom.trigger('wrOnUsersAllow', [users]);
        }
        wrOnUserDump(users) {
            megaChat.plugins.userHelper.fetchAllNames(Object.keys(users), this.chatRoom).catch(dump).finally(() => {
                this.chatRoom.trigger('wrOnUserDump', users);
            });
        }
        onModeratorAdd(user) {
            this.chatRoom.trigger('onModeratorAdd', user);
        }
        onMutedBy(cid) {
            this.chatRoom.trigger('onMutedBy', { cid });
        }
        onRaisedHandAdd(userHandle) {
            this.chatRoom.trigger('onRaisedHandAdd', { userHandle });
        }
        onRaisedHandDel(userHandle) {
            this.chatRoom.trigger('onRaisedHandDel', { userHandle });
        }
// == end SfuClientIClientEventListener interface
        handleDisconnect(termCode) {
            console.assert(termCode !== undefined, "handleDisconnect: termCode is undefined");
            this.isDisconnecting = true;
            this.chatRoom.trigger('onCallLeft', {
                callId: this.callId,
                chatId: this.chatRoom.chatId,
                showCallFeedback: true,
                termCode
            });

            if (termCode === SfuClient.TermCode.kCallParticipantLimit) {
                msgDialog('warningb', '', l[20200]);
            }
            if (termCode === SfuClient.TermCode.kCallUserLimit) {
                if (!is_eplusplus && !megaChat.initialChatId) {
                    msgDialog(
                        'error',
                        '',
                        /* `Cannot join` */
                        l.join_call_user_limit_title,
                        /* `Only 100 participants can join the call. Any additional participants will...` */
                        l.invite_limit_banner_host,
                        undefined,
                        1
                    );
                }
                this.chatRoom.trigger('onCallUserLimitExceeded');
            }
            if (termCode === SfuClient.TermCode.kCallDurLimit && this.organiser === u_handle) {
                tSleep(1).then(() => megaChat.trigger('onCallTimeLimitExceeded'));
            }

            if (termCode === SfuClient.TermCode.kNoMediaPath) {
                msgDialog(
                    'warningb',
                    null,
                    l[19966], /* `Call failed` */
                    l.call_failed_firewall
                        .replace(
                            '[A]',
                            `<a
                                href="${l.mega_help_host}/chats-meetings/chats/firewall-blocking-call"
                                target="_blank"
                                class="clickurl">`
                        )
                        .replace('[/A]', '</a>'),
                    undefined,
                    0
                );
            }

            if (termCode === SfuClient.TermCode.kCallEndedByModerator) {
                megaChat.playSound(megaChat.SOUNDS.CALL_END);
            }
        }
        get isPublic() {
            const type = this.chatRoom && this.chatRoom.type;
            return type === 'group' || type === 'public';
        }
        setViewMode(newMode) {
            this.viewMode = newMode;
            let activePeer;
            if (this.pinnedCid && (activePeer = this.peers[this.pinnedCid])) {
                activePeer.isActive = false;
            }

            if (newMode === CALL_VIEW_MODES.THUMBNAIL) {
                this.pinnedCid = null;
            }

            if (newMode === CALL_VIEW_MODES.MINI) {
                this.speakerCid = null;
            }
        }
        setPinnedCid(clientId, toggle) {
            if (this.pinnedCid === clientId) {
                if (!toggle) {
                    return;
                }
                this.pinnedCid = null;
            }
            else {
                this.pinnedCid = clientId;
            }
            this.chatRoom.trigger('onSpeakerChange', clientId);
            this.recordActiveStream();
        }
        getActiveStream() {
            if (Number.isFinite(this.pinnedCid)) {
                return this.pinnedCid === 0 ? this.localPeerStream : this.peers[this.pinnedCid];
            }
            else if (this.speakerCid) {
                return this.peers[this.speakerCid];
            }
            else {
                return this.peers.find((peer) => peer.av & Av.HiResVideo) || this.peers.getItem(0);
            }
        }
        getLocalStream() {
            return this.localPeerStream;
        }
        getActiveSpeaker() {
            if (this.speakerCid === null) {
                return undefined;
            }
            return (this.speakerCid === 0) ? this.localPeerStream : this.peers[this.speakerCid];
        }
        onLocalMediaChange(diffAv) {
            this.av = this.sfuClient.availAv;
            if (diffAv & Av.Screen) {
                const prevSize = this.presenterStreams.size;
                if (this.av & Av.Screen) {
                    this.presenterStreams.add(u_handle);
                }
                else {
                    this.presenterStreams.delete(u_handle);
                }
                if (prevSize !== this.presenterStreams.size) {
                    this.handlePeerScreenChange(u_handle);
                }
                this.trackDataChange();
            }
            this.localPeerStream.onAvChange(diffAv);
        }
        onLocalMediaError(errObj) {
            megaChat.trigger('onLocalMediaError', errObj);
        }
        onAudioSendDenied(msg) {
            this.chatRoom.trigger('onAudioSendDenied');
        }
        onMicDisconnected() {
            delay('call-mic-disconnect', () => {
                const track = this.sfuClient.localAudioTrack();
                if (!track) {
                    return;
                }
                window.toaster.main.show({
                    /* `Microphone switched to '%s'` */
                    content: l.mic_switch_toast.replace('%s', track.label),
                    icons: ['sprite-fm-mono icon-info'],
                    classes: ['mic-change']
                });
            });
        }
        onCallAboutToEnd(endIn) {
            // The call will time out after endIn seconds. Save the time.
            this.callEndTime = Date.now() + endIn * 1000;
            this.chatRoom.trigger('onCallEndTimeUpdated', this.callEndTime);
        }
        onCallLimitsUpdated() {
            const { callLimits } = this.sfuClient;
            if (this.callEndTime && (!callLimits || !callLimits.ldur)) {
                this.callEndTime = 0;
                this.chatRoom.trigger('onCallEndTimeUpdated', this.callEndTime);
            }
            this.trackDataChange();
        }
        onLocalSpeechDetected() {
            this.chatRoom.trigger('onLocalSpeechDetected');
            eventlog(500508);
        }
        toggleAudio() {
            this.sfuClient.muteAudio(!this.sfuClient.localAudioMuted());
            // when we are not a speaker, local audio track is never obtained, so the event is never fired
            this.onLocalMediaChange(SfuClient.Av.Audio);
        }
        toggleVideo() {
            if (this.isSharingScreen() && NO_SIMUL_SCRSHARE_AND_CAMERA) {
                this.sfuClient.enableScreenshare(false);
            }
            this.sfuClient.muteCamera(!!(this.av & SfuClient.Av.Camera));
        }
        toggleScreenSharing() {
            if ((this.av & SfuClient.Av.Camera) && NO_SIMUL_SCRSHARE_AND_CAMERA) {
                this.sfuClient.muteCamera(true);
            }
            if (!this.isSharingScreen() && this.presenterStreams.size) {
                // The set tracks the order but needs to convert to an array to grab the latest presenter.
                const latestPeer = this.peers[[...this.presenterStreams].pop()];
                if (latestPeer) {
                    return msgDialog(
                        `confirmation:!^${l.takeover_presenter_scr_btn}!${l[82]}`,
                        '',
                        l.takeover_presenter_scr_title,
                        l.takeover_presenter_text.replace('%s', escapeHTML(M.getNameByHandle(latestPeer.userHandle))),
                        e => e && this.sfuClient.enableScreenshare(true),
                        1
                    );
                }
            }
            this.sfuClient.enableScreenshare(!this.sfuClient.isSharingScreen());
        }
        isSharingScreen() {
            return this.sfuClient.isSharingScreen();
        }
        toggleHold() {
            if (this.av & SfuClient.Av.onHold) {
                return this.sfuClient.releaseHold() // wait completion, recorder will be resumed at the end
                .then(() => this.recordActiveStream());
            }
            else {
                return this.sfuClient.putOnHold();
            }
        }
        hangUp(reason) {
            this.destroy(reason);
        }
        destroy(reason) {
            if (this.isDestroyed) {
                return;
            }
            this.isDestroyed = true;
            if (reason === undefined) {
                reason = SfuClient.TermCode.kUserHangup;
            }
            if (!this.isDisconnecting && !this.sfuClient.disconnect(reason)) {
                this.handleDisconnect(reason);
            }
            delete window.sfuClient;
            this.localPeerStream.destroy();
            if (this.peers.size() !== 0) {
                console.error("hangUp: Soft assert: peers.size is not zero, but", this.peers.size());
            }
            this.callTimeoutDone(true);
            this.chatRoom.callParticipantsUpdated(); // av: I have added it just in case, but do we need this?
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        muteIfAlone() {
            if (!this.isDestroyed && this.peers.length === 0 && this.isPublic && !!(this.av & SfuClient.Av.Audio)) {
                return this.sfuClient.muteAudio(true);
            }
            return false;
        }
        callTimeoutDone(leaveCallActive) {
            if (typeof leaveCallActive === 'undefined') {
                leaveCallActive = this.hasOtherParticipant();
            }
            if (this.callToutInt) {
                clearInterval(this.callToutInt);
                delete this.callToutInt;
                delete this.callToutEnd;
            }
            if ($('.mega-dialog .stay-dlg-subtext').is(':visible')) {
                closeDialog();
            }
            if (this.callToutId) {
                this.callToutId.setUpdater(ChatToast.clearValue);
                delete this.callToutId;
            }
            if (!leaveCallActive) {
                eventlog(99762, JSON.stringify([this.callId]));
                this.chatRoom.trigger('onCallLeft', { callId: this.callId });
            }
        }
        initCallTimeout(long) {
            this.callTimeoutDone(true); // Cleanup previous state without ending the call
            if (mega.config.get('callemptytout')) {
                return;
            }
            if (long) {
                // If we want the long timeout specifically or if the user has the setting to leave after 24hours
                // Use an interval as the timer could be affected if the tab is in the background over this time
                this.callToutEnd = unixtime() + 86400;
                this.callToutInt = setInterval(() => {
                    if (this.callToutEnd <= unixtime()) {
                        this.callTimeoutDone();
                    }
                }, 3e5);
                ChatToast.quick(l.call_timeout_day); /* `Call will stay active for 24 hours` */
            }
            else {
                // Otherwise setup the 2 minute timeout
                this.callToutId = new ChatToast(
                    l.call_timeout_remain /* `Call will end in %s` */
                        .replace('%s', secondsToTime(120).substring(3)),
                    { timeout: 130000 } // Show for longer that 120s in case of slight timing discrepancies
                );
                const done = () => {
                    delay('calltoutend', this.callTimeoutDone.bind(this), 100);
                };
                ChatToast.flush(); // We don't want this toast to be held up by any other toasts so clear them out.
                this.callToutId
                    .setOnShown(function() {
                        // `this` is the toast object not the call.
                        this.callToutEnd = unixtime() + 120;
                        if (megaChat.activeCall) {
                            megaChat.activeCall.showTimeoutDialog();
                        }
                    })
                    .setUpdater(function() {
                        let timeRemain = (this.callToutEnd || unixtime() + 120) - unixtime();
                        if (timeRemain <= 0) {
                            this.content = '';
                            done();
                        }
                        else {
                            const timeString = secondsToTime(timeRemain).substring(3);
                            let string = l.empty_call_dlg_text_sec;
                            this.content = l.call_timeout_remain /* `Call will end in %s` */
                                .replace('%s', timeString);
                            if (timeRemain >= 60) {
                                timeRemain = Math.ceil(timeRemain / 60);
                                string = l.empty_call_dlg_text_min;
                            }
                            // Check if the dialog is shown then update the counter on it.
                            const $dlgText = $('.stay-dlg-counter', '.mega-dialog');
                            if ($dlgText.length && $dlgText.is(':visible')) {
                                $dlgText.parent().empty().safeHTML(
                                    mega.icu.format(string, timeRemain).replace('%s', timeString)
                                );
                            }
                        }
                    })
                    .setClose(false)
                    .dispatch();
            }
        }
        showTimeoutDialog() {
            if (document.body.classList.contains('in-call')) {
                return;
            }
            msgDialog(
                `warninga:!^${l.empty_call_dlg_end}!${l.empty_call_stay_button}`,
                'stay-on-call',
                l.empty_call_dlg_title,
                mega.icu.format(l.empty_call_dlg_text_min, 2).replace('%s', '02:00'),
                res => {
                    if (res === null) {
                        return;
                    }
                    if (res) {
                        this.handleStayConfirm();
                        return;
                    }
                    eventlog(99760, JSON.stringify([this.callId, 0]));
                    this.hangUp();
                },
                1
            );
        }
        handleStayConfirm() {
            eventlog(99760, JSON.stringify([this.callId, 1]));
            this.stayOnEnd = true;
            this.initCallTimeout(true);
        }
        hasOtherParticipant() {
            const {peers} = this;
            for (let i = 0; i < peers.length; i++) {
                if (peers.getItem(i).userHandle !== u_handle) {
                    return true;
                }
            }
            return false;
        }
        handlePeerScreenChange(clientId) {
            if (this.presenterStreams.has(clientId)) {
                this.setPinnedCid(clientId === u_handle ? 0 : clientId);
            }
            else if (this.presenterStreams.size) {
                // Only set if we are already forcing a presenter stream and there is another.
                if (this.pinnedCid) {
                    const nextPresenter = [...this.presenterStreams].pop();
                    this.setPinnedCid(nextPresenter === u_handle ? 0 : nextPresenter);
                }
            }
            else {
                this.setPinnedCid(null);
            }
        }
    }
    class PlayerCtx { // implements IVideoPlayerGui
        constructor(call, player) {
            this.call = call;
            this.player = player;
            this.appPeer = this.call.peers[player.peer.cid];
            assert(this.appPeer);
            this.video = CallManager2.createVideoElement();
        }
        attachToTrack(track) { // we wait for player to sync and start, so nothing to do here
         // this.video.onpause = tryCatch(() => { console.warn("source video: onPause"); });
            SfuClient.playerPlay(this.video, track);
            this.appPeer.updateConsumerVideos();
        }

        detachFromTrack() {
            delete this.video.onpause;
            SfuClient.playerStop(this.video);
        }
        onPlayerDestroy() {
            this.appPeer.onPlayerDestroy(this.player);
        }
    }
    Call.PlayerCtx = PlayerCtx;

    class LocalPeerStream {
        constructor(call) {
            this.isLocal = true;
            this.player = null; // local video player
            this.call = call;
            this.userHandle = u_handle;
            this.clientId = 0; // for pinnedCid
            this.av = 0;
            this.consumers = new Set();
            this.vuLevelConsumers = new Set();
            this.sfuClient = call.sfuClient;
        }
        onAvChange(avDiff) {
            this.av = this.sfuClient.availAv;
            if (avDiff & SfuClient.Av.Video) {
                // we are managing the hi-res local player, which displays screen video if available
                let vtrack = this.sfuClient.localScreenTrack();
                 if (vtrack) {
                    this.isScreen = true;
                }
                else {
                    vtrack = this.sfuClient.localCameraTrack();
                    this.isScreen = false;
                }
                if (vtrack) {
                    if (!this.player) {
                        this.player = CallManager2.createVideoElement();
                    }
                    SfuClient.playerPlay(this.player, vtrack, true);
                }
                else {
                    if (this.player) {
                        SfuClient.playerStop(this.player);
                    }
                    this.player = null;
                }
                this.call.recordActiveStream();
            }
            for (const cons of this.consumers) {
                cons.onAvChange();
            }
        }
        get audioMuted() {
            return this.sfuClient.localAudioMuted();
        }
        get videoMuted() {
            return (this.sfuClient.availAv & Av.Video) === 0;
        }
        get hasScreen() {
            return !!(this.av & Av.Screen);
        }
        get hasScreenAndCam() {
            const { av } = this;
            return !!((av & Av.ScreenHiRes) && (av & Av.CameraLowRes));
        }
        registerConsumer(consumer) {
            this.consumers.add(consumer);
            // player may have stopped when the last non-clone consumer was unmounted from the DOM
            if (consumer.isDirect && this.player) { // && this.player.paused - just in case, don't check if paused
                Promise.resolve(this.player.play()).catch(nop);
            }
        }
        deregisterConsumer(consumer) {
            this.consumers.delete(consumer);
        }
        registerVuLevelConsumer(cons) {
            this.vuLevelConsumers.add(cons);
        }
        unregisterVuLevelConsumer(cons) {
            this.vuLevelConsumers.delete(cons);
        }
        onAudioLevel(level) {
            if (level === this.lastAudioLevel) {
                return;
            }
            this.lastAudioLevel = level;
            for (const cons of this.vuLevelConsumers) {
                cons.updateAudioLevel(level);
            }
        }
        isStreaming() {
            return this.sfuClient.availAv & Av.Video;
        }
        get isOnHold() {
            return this.sfuClient.isOnHold;
        }
        dynUpdateVideoQuality() {
            return false; // returing false will cause the caller VideoNode to update itself
        }
        destroy() {
            this.isDestroyed = true; // let VideoNode know we are destroyed
        }
    }
    class AvatarRenderer {
        constructor(userHandle) {
            this.userHandle = userHandle;
        }
        render() {
            return new Promise((resolve, reject) => {
                const img = new Image;
                img.onload = resolve.bind(null, img);
                img.onerror = reject;
                img.src = useravatar.getAvatarSVGDataURI(this.userHandle);
            });
        }
    }
    /**
     * Manages RTC <-> MegChat logic and mapping to UI
     *
     * @param megaChat
     * @returns {CallManager2}
     * @constructor
     */
    var CallManager2 = function(megaChat) {
        this.logger = MegaLogger.getLogger("callManager", {}, megaChat.logger);
        this.megaChat = megaChat;
        megaChat.rebind("onRoomDestroy.callManager", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
        });

        megaChat.rebind("onRoomInitialized.chatStore", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
            chatRoom.subscribeForCallEvents();
        });
        this.calls = {};
        return this;
    };
    inherits(CallManager2, MegaDataEmitter);

    /**
     * Used for the remote call ended reason types
     * @type {*}
     */
    CallManager2.CALL_END_REMOTE_REASON = {
        "CALL_ENDED": 0x01,
        "REJECTED": 0x02,
        "NO_ANSWER": 0x03,
        "FAILED": 0x04,
        "CANCELED": 0x05,
        "CALL_ENDED_BY_MODERATOR": 0x06
    };


    /**
     * Private method for handling multi string text contents for messages in private rooms
     * @param message {Message}
     * @param otherContactsName {Array}
     * @param contact {Object}
     * @param textMessage {String}
     * @returns {String}
     * @private
     */
    CallManager2._getMultStrTxtCntsForMsgPriv = function(
        message,
        otherContactsName,
        contact,
        textMessage
    ) {
        var tmpMsg = "";
        if (Array.isArray(textMessage[0])) {
            if (contact.u === u_handle) {
                tmpMsg = textMessage[0][0].replace("[X]", otherContactsName[0] || "");
            }
            else {
                tmpMsg = textMessage[0][1].replace("[X]", "%s");
                tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
            }
        }
        else {
            tmpMsg = textMessage[0].replace("[X]", "%s");
            tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
        }

        // append duration, if available in the meta
        if (
            message.meta && message.meta.duration &&
            (
                message.type === "call-ended" ||
                message.dialogType === "remoteCallEnded" ||
                message.type === "call-failed"
            )
        ) {
            tmpMsg += " " + l[7208].replace("[X]", "[[" + secToDuration(message.meta.duration) + "]]");
        }
        return tmpMsg;
    };

    /**
     * Private method for handling multi string text contents for messages in group rooms
     * @param message {Message}
     * @param otherContactsName {Array}
     * @param textMessage {String}
     * @param contactName {String}
     * @param contact {Object}
     * @returns {String}
     * @private
     */
    CallManager2._getMltiStrTxtCntsForMsgGrp = function(
        message,
        otherContactsName,
        textMessage,
        contactName,
        contact
    ) {
        var tmpMsg = "";
        if (message.type === "call-handled-elsewhere") {
            otherContactsName = [contactName];
        }
        if (message.type === "incoming-call") {
            tmpMsg = textMessage[0].replace("%s", contactName);
        }
        else if (message.type === "call-started") {
            tmpMsg = textMessage[0].replace("%s", contactName);
        }
        else if (!Array.isArray(textMessage[0])) {
            tmpMsg = textMessage[0].replace("[X]", "%s");
            tmpMsg = mega.utils.trans.listToString(otherContactsName, tmpMsg);
        }
        else {
            tmpMsg = mega.utils.trans.listToString(otherContactsName, textMessage[0][
                contact.u === u_handle ? 0 : 1
            ]);
        }
        return tmpMsg;
    };

    /**
     * To be used internally by Message._getTextContentsForDialogType
     * @param message {Message|ChatDialogMessage}
     * @param textMessage {String}
     * @param [html] {boolean} pass true to return (eventually) HTML formatted messages
     * @param [participants] {Array} optional list of handles to use for this message
     */
    CallManager2._getMltiStrTxtCntsForMsg = function(message, textMessage, html, participants) {
        var tmpMsg;
        var contact = Message.getContactForMessage(message);
        var contactName = "";
        if (contact) {
            contactName = M.getNameByHandle(contact.u);
        }

        if (!participants && message.meta && message.meta.participants && message.meta.participants.length > 0) {
            participants = message.meta.participants;
        }

        var otherContactsName = [];
        if (message.chatRoom) {
            (participants || message.chatRoom.getParticipantsExceptMe()).forEach(function(handle) {
                if (handle !== u_handle) {
                    var name = M.getNameByHandle(handle);
                    if (name) {
                        otherContactsName.push(name);
                    }
                }
            });
            if (!otherContactsName || otherContactsName.length === 0) {
                if (participants) {
                    message.chatRoom.getParticipantsExceptMe().forEach(function(handle) {
                        if (handle !== u_handle) {
                            var name = M.getNameByHandle(handle);
                            if (name) {
                                otherContactsName.push(name);
                            }
                        }
                    });
                }
                if (!otherContactsName || otherContactsName.length === 0) {
                    // this should never happen, but in case it does... e.g. a room where I'm the only one left, but had
                    // a call recorded with no participants passed in the meta
                    otherContactsName.push(message.chatRoom.topic);
                }
            }
        }

        if (message.chatRoom.type === "private") {
            tmpMsg = CallManager2._getMultStrTxtCntsForMsgPriv(
                message,
                otherContactsName,
                contact,
                textMessage
            );
        }
        else {
            tmpMsg = CallManager2._getMltiStrTxtCntsForMsgGrp(
                message,
                otherContactsName,
                textMessage,
                contactName,
                contact
            );
        }

        textMessage = tmpMsg;

        textMessage = textMessage
            .replace("[[", " ")
            .replace("]]", "");

        return textMessage;
    };

    CallManager2.prototype.remoteStartedCallToDialogMsg = function(chatRoom, msgInstance) {
        var result = false;
        var meta = msgInstance.meta;
        var authorContact = M.u[meta.userId];
        var delay = msgInstance.delay;
        var msgId;
        var type;
        var cssClasses = [];
        var currentCallCounter;

        msgId = 'call-started-' + msgInstance.messageId;
        type = "call-started";
        cssClasses = ['fm-chat-call-started'];
        currentCallCounter = meta.duration;

        result = new ChatDialogMessage({
            messageId: msgId,
            type: type,
            showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
            authorContact: authorContact,
            delay: delay,
            cssClasses: cssClasses,
            currentCallCounter: currentCallCounter,
            meta: meta
        });

        return result;
    };

    CallManager2.prototype.remoteEndCallToDialogMsg = function(chatRoom, msgInstance) {
        var self = this;

        var result = false;
        var meta = msgInstance.meta;
        var authorContact = M.u[meta.userId] || {};
        var delay = msgInstance.delay;
        if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.CALL_ENDED) {
            var msgId;
            var type;
            var cssClasses = [];
            var currentCallCounter;
            if (meta.duration && meta.duration > 0) {
                msgId = 'call-ended-' + msgInstance.messageId;
                type = "call-ended";
                cssClasses = ['fm-chat-call-reason-' + meta.reason];
                currentCallCounter = meta.duration;
            }
            else {
                msgId = 'call-failed-' + msgInstance.messageId;
                type = 'call-failed';
            }

            result = new ChatDialogMessage({
                messageId: msgId,
                type: type,
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                cssClasses: cssClasses,
                currentCallCounter: currentCallCounter,
                meta: meta
            });
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.REJECTED) {
            result = new ChatDialogMessage({
                messageId: 'call-rejected-' + msgInstance.messageId,
                type: 'call-rejected',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.CANCELED) {
            if (authorContact && authorContact.u === u_handle) {
                result = new ChatDialogMessage({
                    messageId: 'call-canceled-' + msgInstance.messageId,
                    type: 'call-canceled',
                    authorContact: authorContact,
                    showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                    delay: delay,
                    meta: meta
                });
            }
            else {
                result = new ChatDialogMessage({
                    messageId: 'call-missed-' + msgInstance.messageId,
                    type: 'call-missed',
                    authorContact: authorContact,
                    showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                    delay: delay,
                    meta: meta
                });
            }
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.NO_ANSWER && authorContact.u !== u_handle) {
            result = new ChatDialogMessage({
                messageId: 'call-missed-' + msgInstance.messageId,
                type: 'call-missed',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.NO_ANSWER && authorContact.u === u_handle) {
            result = new ChatDialogMessage({
                messageId: 'call-timeout-' + msgInstance.messageId,
                type: 'call-timeout',
                authorContact: authorContact,
                showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                delay: delay,
                meta: meta
            });
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.FAILED) {
            if (meta.duration >= 5) {
                result = new ChatDialogMessage({
                    messageId: 'call-ended-' + msgInstance.messageId,
                    type: 'call-ended',
                    authorContact: authorContact,
                    showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                    delay: delay,
                    meta: meta
                });
            }
            else {
                result = new ChatDialogMessage({
                    messageId: 'call-failed-' + msgInstance.messageId,
                    type: 'call-failed',
                    authorContact: authorContact,
                    showInitiatorAvatar: chatRoom.type === "group" || chatRoom.type === "public",
                    delay: delay,
                    meta: meta
                });
            }
        }
        else if (meta.reason === CallManager2.CALL_END_REMOTE_REASON.CALL_ENDED_BY_MODERATOR) {
            result = new ChatDialogMessage({
                messageId: `call-ended-${msgInstance.messageId}`,
                type: 'call-ended',
                authorContact,
                showInitiatorAvatar: true,
                delay,
                cssClasses: [`fm-chat-call-reason-${meta.reason}`],
                meta
            });
        }
        else {
            self.logger.error("Unknown (remote) CALL_ENDED reason: ", meta.reason, meta);
        }

        return result;
    };

    CallManager2.prototype.createCall = function(chatRoom, callId, callKey) {
        return (this.calls[`${chatRoom.chatId}_${callId}`] = new Call(chatRoom, callId, callKey));
    };

    CallManager2.prototype.onCallState = function(eventData, chatRoom) {
        // Caller is me and the call was locally initiated from the web client -> ring for 1-on-1s; don't ring if
        // the user had initiated the call from another client/device.
        const {activeCall} = megaChat;
        if (activeCall && eventData.userId === u_handle && chatRoom.type === 'private') {
            if (eventData.arg) {
                megaChat.trigger('onOutgoingCallRinging', [chatRoom, eventData.callId, eventData.userId, this]);
            }
            else { // ringing stopped in a 1on1 call, hangup if it's only us in the call
                if (!activeCall.hasOtherParticipant()) {
                    chatRoom.trigger('onCallLeft', { callId: eventData.callId });
                }
            }
            return;
        }

        if (chatRoom.fakedLocalRing) {
            return;
        }

        if (eventData.arg) {

            if (
                !chatRoom.ringingCalls.exists(eventData.callId) &&
                (
                    !chatRoom.activeCallIds[eventData.callId] ||
                    chatRoom.activeCallIds[eventData.callId].indexOf(u_handle) === -1
                )
            ) {
                chatRoom.ringingCalls.set(eventData.callId, eventData.userId);

                chatRoom.megaChat.trigger('onIncomingCall', [
                    chatRoom,
                    eventData.callId,
                    eventData.userId,
                    this
                ]);
            }
        }
        else {
            chatRoom.ringingCalls.remove(eventData.callId);

            this.trigger('onRingingStopped', {
                chatRoom: chatRoom,
                callId: eventData.callId,
                callManager: this
            });
        }

        chatRoom.callParticipantsUpdated();
    };
    CallManager2.createVideoElement = function() {
        const video = document.createElement("video");
        video.oncontextmenu = () => false;
        return video;
    };
    CallManager2.prototype.destroy = function() {
        for (const call of Object.values(this.calls)) {
            call.destroy();
        }
    };
    CallManager2.Peers = Peers;
    CallManager2.Peer = Peer;
    CallManager2.Call = Call;
    CallManager2.VIDEO_QUALITY = VIDEO_QUALITY;
    CallManager2.FORCE_LOWQ = !!localStorage.forceLowQuality;
    // Note this should not be used in cases where there is an active call. Use sfuClient.callLimits.usr instead.
    CallManager2.CALL_USER_LIMIT = 100;
    scope.CallManager2 = CallManager2;

})(window);
