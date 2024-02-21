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
    const NO_SIMUL_SCRSHARE_AND_CAMERA = true;

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
            this.currentQuality = VIDEO_QUALITY.NO_VIDEO;
            this.resState = RES_STATE.NO_VIDEO;
            this.player = null;
            this.onHdReleaseTimer = this._onHdReleaseTimer.bind(this);
            this.onAvChange(av);
            call.peers.push(this);
        }
        destroy() {
            this.hdReleaseTimerStop();
            this.call.peers.remove(this.clientId);
            this.isDestroyed = true;
        }
        get name() {
            return M.getNameByHandle(this.userHandle);
        }
        setResState(newState) {
            const oldPlayer = this.player;
            this.resState = newState;
            this.player = (newState === RES_STATE.HD || newState === RES_STATE.THUMB_PENDING)
                ? (this.hiResPlayer && this.hiResPlayer.gui.video)
                : (this.vThumbPlayer && this.vThumbPlayer.gui.video);
            // console.warn(`setResState[${this.clientId}]: ->`, newState, this.player);
            if (this.player !== oldPlayer) {
                this.updateConsumerVideos();
            }
        }
        isStreaming() {
            const { av } = this.sfuPeer;
            // console.warn(`isStreaming[${this.clientId}]:`, !(av & Av.onHold) && (av & Av.Video));
            return !(av & Av.onHold) && (av & Av.Video);
        }
        onAvChange(av) {
            const Av = SfuClient.Av;
            this.isOnHold = !!(av & Av.onHold);
            if (this.onHold) {
                this.audioMuted = this.videoMuted = true;
                this.hasScreenAndCam = false;
            }
            else {
                this.audioMuted = !(av & Av.Audio);
                this.videoMuted = !(av & Av.Camera);
                this.hasScreenAndCam = !!((av & Av.ScreenHiRes) && (av & Av.CameraLowRes));
                this.isScreen = !!(av & Av.ScreenHiRes);
            }
            if ((av ^ this.av) & Av.Recording) {
                this.isRecording = !!(av & Av.Recording);
                this.call.recorder = this.userHandle;
                this.call.chatRoom.trigger(this.isRecording ? 'onRecordingStarted' : 'onRecordingStopped', this);
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
                // start gradual lowering of stream quality
                this.hdReleaseTimerRestart(maxQ);
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
                this.hiResPlayer.setHiResDivider(resDivider);
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
            this.setResState(RES_STATE.HD_PENDING);
            this.hiResPlayer = peer.getHiResVideo(resDivider, (sfuPlayer) => {
                return new PlayerCtx(this.call, sfuPlayer);
            });
            this.hiResPlayer.gui.onPlay = () => {
                if (this.resState !== RES_STATE.HD_PENDING) {
                    return false;
                }
                this.delVthumbPlayer();
                this.setResState(RES_STATE.HD);
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
            this.setResState(RES_STATE.THUMB_PENDING);
            this.vThumbPlayer = peer.getThumbVideo((player) => {
                return new PlayerCtx(this.call, player);
            });
            this.vThumbPlayer.gui.onPlay = () => {
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
        constructor(chatRoom, callId) {
            super({
                'chatRoom': null,
                'callId': null,
                'av': null,
                'localVideoStream': null,
                'viewMode': null,
                'activeStream': null,
                'forcedActiveStream': null,
                'activeVideoStreamsCnt': 0,
                'ts': Date.now(),
                'left': false
            });
            this.chatRoom = chatRoom;
            this.callId = callId;
            this.peers = new Peers(this);
            this.localPeerStream = new LocalPeerStream(this);
            this.viewMode = CALL_VIEW_MODES.THUMBNAIL;
            this.stayOnEnd = !!mega.config.get('callemptytout');

            chatRoom.meetingsLoading = l.joining;
            // Peer is alone in a group call after 1 min -> mute mic
            tSleep(60).then(() => this.muteIfAlone()).catch(dump);
        }
        setSfuClient(sfuClient) { // Call and sfuClient reference each other and need post-construction linking
            this.sfuClient = sfuClient;
            this.localPeerStream.setSfuClient(sfuClient);
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
            new Peer(this, sfuPeer.userId, sfuPeer.cid, sfuPeer.av);
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
            if (this.activeStream && this.activeStream === peer.cid) {
                this.activeStream = null;
            }
            if (this.forcedActiveStream === peer.cid) {
                this.forcedActiveStream = null;
            }

            this.peers[peer.cid].destroy();
            this.chatRoom.trigger('onCallPeerLeft', { userHandle: peer.userId, reason });
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
        }
        onActiveSpeakerChange(newPeer/* , prevPeer */) {
            if (newPeer) {
                var peer = this.peers[newPeer.cid];
                assert(peer);
                this.setActiveStream(newPeer.cid);
            }
            else {
                this.setActiveStream(null);
            }
        }
        onPeerAvChange(peer, av) {
            const callManagerPeer = this.peers[peer.cid];
            assert(callManagerPeer);
            callManagerPeer.onAvChange(av);
            this.chatRoom.trigger('onPeerAvChange', peer);
        }
        onNoMicInput() {
            this.chatRoom.trigger('onNoMicInput');
        }
        onMicSignalDetected(signal) {
            this.chatRoom.trigger('onMicSignalDetected', signal);
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
            this.chatRoom.trigger('wrOnUsersEntered', users);
        }
        wrOnUserLeft(user) {
            this.chatRoom.trigger('wrOnUserLeft', user);
        }
        wrOnUsersAllow(users) {
            this.chatRoom.trigger('wrOnUsersAllow', [users]);
        }
        wrOnUserDump(users) {
            this.chatRoom.trigger('wrOnUserDump', users);
        }
        onModeratorAdd(user) {
            this.chatRoom.trigger('onModeratorAdd', user);
        }
        onMutedBy(cid) {
            this.chatRoom.trigger('onMutedBy', { cid });
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
                ion.sound.play(megaChat.SOUNDS.CALL_END);
            }
        }
        get isPublic() {
            const type = this.chatRoom && this.chatRoom.type;
            return type === 'group' || type === 'public';
        }
        setViewMode(newMode) {
            this.viewMode = newMode;
            let activePeer;
            if (this.forcedActiveStream && (activePeer = this.peers[this.forcedActiveStream])) {
                activePeer.isActive = false;
            }

            if (newMode === CALL_VIEW_MODES.THUMBNAIL) {
                this.forcedActiveStream = null;
            }

            if (newMode === CALL_VIEW_MODES.MINI) {
                this.activeStream = null;
            }
        }
        setForcedActiveStream(clientId) {
            const newCid = (this.forcedActiveStream === clientId) ? null : clientId;
            this.forcedActiveStream = newCid;
            if (this.sfuClient.callRecorder) {
                this.sfuClient.recordingForcePeerVideo(newCid || null);
            }
        }
        setActiveStream(clientId) {
            this.activeStream = clientId;
            this.chatRoom.trigger('onSpeakerChange', clientId);
        }
        getActiveStream() {
            const activeStream = this.forcedActiveStream || this.activeStream;
            if (activeStream) {
                return this.peers[activeStream];
            }
            return this.peers.getItem(0);
        }
        getLocalStream() {
            return this.localPeerStream;
        }
        onLocalMediaChange(diffAv) {
            this.av = this.sfuClient.availAv;
            this.localPeerStream.onAvChange(diffAv);
        }
        onLocalMediaError(errObj) {
            megaChat.trigger('onLocalMediaError', errObj);
        }
        onAudioSendDenied(msg) {
            this.chatRoom.trigger('onAudioSendDenied');
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
            this.sfuClient.enableScreenshare(!this.sfuClient.isSharingScreen());
        }
        isSharingScreen() {
            return this.sfuClient.isSharingScreen();
        }
        toggleHold() {
            if (this.av & SfuClient.Av.onHold) {
                this.sfuClient.releaseHold();
            }
            else {
                this.sfuClient.putOnHold();
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
            if ($('.stay-dlg-subtext').is(':visible')) {
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
    }
    class PlayerCtx { // implements IVideoPlayerGui
        constructor(call, player) {
            this.call = call;
            this.player = player;
            this.appPeer = this.call.peers[player.peer.cid];
            assert(this.appPeer);
            this.video = document.createElement("video");
        }
        attachToTrack(track) { // we wait for player to sync and start, so nothing to do here
            this.video.onplaying = () => {
                // console.warn("source video: onPlaying");
                if (this.onPlay) {
                    this.onPlay();
                }
            };
            this.video.onpause = tryCatch(() => {
                // console.warn("source video: onPause");
            });
            SfuClient.playerPlay(this.video, track);
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
            this.consumers = new Set();
        }
        setSfuClient(sfuClient) {
            this.sfuClient = sfuClient;
            this.clientId = sfuClient.cid;
            this.av = sfuClient.availAv;
        }
        onAvChange(avDiff) {
            this.av = this.sfuClient.availAv;
            if (avDiff & SfuClient.Av.Video) {
                // we are managing the hi-res local player, which displays screen video if available
                const vtrack = this.sfuClient.localScreenTrack() || this.sfuClient.localCameraTrack();
                if (vtrack) {
                    this.isScreen = vtrack._isScreen;
                    if (!this.player) {
                        this.player = document.createElement("video");
                    }
                    SfuClient.playerPlay(this.player, vtrack, true);
                }
                else {
                    if (this.player) {
                        SfuClient.playerStop(this.player);
                    }
                    this.player = null;
                }
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
        get hasScreenAndCam() {
            const av = this.sfuClient.availAv;
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
        isStreaming() {
            return this.sfuClient.availAv & Av.Video;
        }
        get isOnHold() {
            return this.sfuClient.isOnHold();
        }
        dynUpdateVideoQuality() {
            return false; // returing false will cause the caller VideoNode to update itself
        }
        destroy() {
            this.isDestroyed = true; // let VideoNode know we are destroyed
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
     * @param [rawContent] {*} optional flag to disable escaping html characters. DO NOT USE IF UNSURE
     */
    CallManager2._getMltiStrTxtCntsForMsg = function(message, textMessage, html, participants, rawContent) {
        var tmpMsg;
        var contact = Message.getContactForMessage(message);
        var contactName = "";
        if (contact) {
            contactName = M.getNameByHandle(contact.u);
            if (rawContent !== 0xBADF) {
                contactName = escapeHTML(contactName);
            }
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

    CallManager2.prototype.createCall = function(chatRoom, callId) {
        return (this.calls[`${chatRoom.chatId}_${callId}`] = new Call(chatRoom, callId));
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

    CallManager2.Peers = Peers;
    CallManager2.Peer = Peer;
    CallManager2.Call = Call;
    CallManager2.VIDEO_QUALITY = VIDEO_QUALITY;
    CallManager2.FORCE_LOWQ = !!localStorage.forceLowQuality;
    scope.CallManager2 = CallManager2;

})(window);
