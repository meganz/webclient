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

 /**                        ==== Overview of peer & local video rendering ====
 * The app creates a StreamNode React component for each video it wants to display - for peers, local camera,
 * thumbnail and large viewports. The StreamNode is passed a "stream" object (implementing an imaginary
 * StreamSource interface), which is responsible for providing the video. For peers, this is the Peer object.
 * For local video, this is a LocalPeerStream object. A single StreamSource can have multiple StreamNode-s
 * attached to it. StreamNode-s are regarded as "consumers" by the StreamSource. A StreamSource keeps track of all
 * its consumers and the video resolution they need. It requests from the SFU a resolution that satisfies
 * the requirement of all consumers, i.e. is higher or equal to the resolution each of them demands.
 * The most important parts of the interface between the StreamNode and the StreamSource are:
 * - StreamSource.source property, which is a video element managed by the StreamSource. This is the actual video
 *   source. The lifetime of this object is independent of the lifetime of the GUI/consumers, and is external to React.
 * - StreamNode.requestedQuality property - informs the StreamSource object what resolution the StreamNode consumer
 *   requires
 * - StreamSource.updateVideoQuality() - calculates the quality needed to satisfy all consumers and requests it
 *   from the SFU. When a StreamNode changes its demanded video quality, it updates its .requestedQuality property
 *   and calls StreamSource.updateVideoQuality()
 * - StreamNode.updateVideoElem() - updates the DOM of the StreamNode to display the video of the current
 *   StreamSource.source. This is called both internally by the StreamNode, and externally by Stream, when
 *   StreamSource.source changes asynchronously
 *
 * Direct and cloned video display
 * Ideally, all consumers of a StreamSource would simply display the StreamSource.source video. However,
 * a DOM element can't be mounted more than once in the DOM, so each StreamNode consumer must display a different
 * <video> player. For efficiency, one of them is the "original" external StreamSource.source <video> element,
 * and the others are "clones", managed by React and having their .srcObject equal assigned to that of
 * the original .source element. Hence, the StreamNode renders the video in one of two modes - "external" or "cloned".
 * The mode flag is passed upon construction, via the .externalVideo React property.
 *
 * Smooth video switching
 * When switching a StreamSource between thumbnail and hi-res track, it takes a bit of time for the newly requested
 * track to start playing. If the track is directly fed into the visible <video> player, this will cause a short
 * blackout before the new resolution video starts. To avoid this, two indenepdent <video> players are used while
 * switching, and StreamSource.source points to the one currently displayed. The current track and video player
 * are kept running and displayed while the newly requested track is being buffered. When the player of the new
 * track fires the "onplay" event, the "old" player is swapped with the "new" one instantly, by changing the
 * Stream.source property and calling updateVideoElem() on all consumers. The old track can then be stopped
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
                'audioMuted': null,
                'videoMuted': null,
                'haveScreenshare': null,
                'isOnHold': null,
                'isVisible': null,
                'isActive': null,
                'lastSpeaktime': null,
                'hasSlowNetwork': null,
            });
            this.call = call;
            this.userHandle = userHandle;
            this.clientId = clientId;
            this.sfuPeer = call.sfuApp.sfuClient.peers.get(clientId);
            this.isActive = false;
            this.consumers = new Set();
            this.currentQuality = VIDEO_QUALITY.NO_VIDEO;
            this.resState = RES_STATE.NO_VIDEO;
            this.source = null;
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
        setResState(newState, video) {
            const oldSource = this.source;
            this.resState = newState;
            if (video) {
                this.source = video;
            }
            else {
                this.source = (newState === RES_STATE.HD || newState === RES_STATE.THUMB_PENDING)
                    ? (this.sfuPeer.hiResPlayer && this.sfuPeer.hiResPlayer.gui.video)
                    : (this.sfuPeer.vThumbPlayer && this.sfuPeer.vThumbPlayer.gui.video);
            }
            // console.warn(`setResState[${this.clientId}]: ->`, newState, this.source);
            if (this.source !== oldSource) {
                this.updateConsumerVideos();
            }
        }
        isStreaming() {
            const { av } = this.sfuPeer;
            // console.warn(`isStreaming[${this.clientId}]:`, !(av & Av.onHold) && (av & Av.Video));
            return !(av & Av.onHold) && (av & Av.Video);
        }
        onAvChange(av) {
            this.audioMuted = !(av & SfuClient.Av.Audio);
            this.videoMuted = !(av & SfuClient.Av.Camera);
            this.haveScreenshare = !!(av & SfuClient.Av.Screen);
            this.isOnHold = !!(av & SfuClient.Av.onHold);
        }
        registerConsumer(consumerGui) {
            this.consumers.add(consumerGui);
            if (this.source && !consumerGui.clonedVideo) {
                Promise.resolve(this.source.play()).catch(nop);
            }
        }
        deregisterConsumer(consumerGui) {
            this.consumers.delete(consumerGui);
            if (!this.isDestroyed) {
                this.updateVideoQuality();
            }
        }
        hdReleaseTimerStop() {
            if (this.hdReleaseTimer) {
                clearTimeout(this.hdReleaseTimer);
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
            return this.call.numVideoTracksUsed < SfuClient.numInputVideoTracks - 1;
        }
        /** Get a video stream that satisfies the quality minimum for all consumers
         * @returns {boolean} - true if video source changed synchronously, which can happen only if video was disabled,
         * or if there was no free slot for parallel request to change hi-res<->vthumb quality
         */
        updateVideoQuality() {
            // if no free tracks, change the quality "in-place", rather than using a second track for smooth switching
            // leave 2 tracks for race conditions, etc
            this._consumersUpdated = false;
            var maxQ = 0;
            for (const { requestedQ } of this.consumers) {
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
                this.requestThumbStream();
            }
            else if (newQuality === VIDEO_QUALITY.NO_VIDEO) {
                this.setResState(RES_STATE.NO_VIDEO);
                const { sfuPeer } = this;
                if (sfuPeer.hiResPlayer) {
                    sfuPeer.hiResPlayer.destroy();
                }
                if (sfuPeer.vThumbPlayer) {
                    sfuPeer.vThumbPlayer.destroy();
                }
            }
        }
        updateConsumerVideos() {
            for (const cons of this.consumers) {
                cons.updateVideoElem();
            }
            this._consumersUpdated = true;
        }
        requestHdStream(resDivider) {
            const peer = this.sfuPeer;
            if (this.noVideoSlotsForSmoothSwitch() && peer.vThumbPlayer) {
                peer.vThumbPlayer.destroy();
            }
            const hdPlayer = peer.hiResPlayer;
            if (hdPlayer) {
                this.setResState(RES_STATE.HD);
                if (resDivider !== hdPlayer.resDivider) {
                    peer.setHiResDivider(resDivider);
                }
                return;
            }
            // request hi-res stream
            this.setResState(RES_STATE.HD_PENDING);
            const gui = peer.requestHiResVideo(resDivider);
            if (!gui) {
                console.error("SoftAssert: requestHiResVideo on a deleted peer");
                return;
            }
            gui.onPlay = () => {
                if (this.resState !== RES_STATE.HD_PENDING) {
                    return false;
                }
                if (peer.vThumbPlayer) {
                    peer.vThumbPlayer.destroy();
                }
                this.setResState(RES_STATE.HD);
                return true;
            };
        }
        requestThumbStream() {
            const peer = this.sfuPeer;
            if (peer.vThumbPlayer) {
                this.setResState(RES_STATE.THUMB);
                if (peer.hiResPlayer) {
                    peer.hiResPlayer.destroy();
                }
                return;
            }
            if (this.noVideoSlotsForSmoothSwitch() && peer.hiResPlayer) {
                peer.hiResPlayer.destroy();
            }
            this.setResState(RES_STATE.THUMB_PENDING);
            const gui = peer.requestThumbnailVideo();
            if (!gui) {
                console.error("SoftAssert: requestThumbnailVideo on a deleted peer");
                return;
            }
            gui.onPlay = () => {
                if (this.resState !== RES_STATE.THUMB_PENDING) {
                    if (this.resState === RES_STATE.HD && peer.vThumbPlayer) {
                        // vthumb request was aborted meanwhile, hd re-used. Delete the vthumb stream
                        peer.vThumbPlayer.destroy();
                    }
                    return;
                }
                if (peer.hiResPlayer) {
                    peer.hiResPlayer.destroy();
                }
                this.setResState(RES_STATE.THUMB);
            };
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
        'GRID': 1,
        'SPEAKER': 2,
        'MINI': 3
    };

    class Call extends MegaDataObject {
        constructor(sfuApp, chatRoom, callId) {
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
            this.sfuApp = sfuApp;
            this.chatRoom = chatRoom;
            this.callId = callId;
            this.peers = new Peers(this);
            this.numVideoTracksUsed = 0;
            // eslint-disable-next-line no-use-before-define
            this.localPeerStream = new LocalPeerStream(this);
            this.viewMode = CALL_VIEW_MODES.GRID;
            chatRoom.activeCall = this;
            megaChat.activeCall = this;
            // Peer is alone in a group call after 1 min -> mute mic
            delay('call:init', this.muteIfAlone.bind(this), 6e4);
            this.stayOnEnd = !!mega.config.get('callemptytout');
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

            if (newMode === CALL_VIEW_MODES.GRID) {
                this.forcedActiveStream = null;
            }

            if (newMode === CALL_VIEW_MODES.SPEAKER || newMode === CALL_VIEW_MODES.MINI) {
                this.sfuApp.sfuClient.enableSpeakerDetector(true);
            }
            else {
                this.sfuApp.sfuClient.enableSpeakerDetector(false);
                this.activeStream = null;
            }
        }
        setForcedActiveStream(clientId) {
            if (this.forcedActiveStream === clientId) {
                this.forcedActiveStream = null;
            }
            else {
                this.forcedActiveStream = clientId;
            }
        }
        setActiveStream(clientId) {
            this.activeStream = clientId;
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
        onPeerJoined(peer, isInitial) {
            new Peer(this, peer.userId, peer.cid, peer.av);
            if (!isInitial) {
                this.chatRoom.trigger('onCallPeerJoined', peer.userId);
            }

            // Force high res for now:
            // thumb is already loaded, only uncomment if we want HD by default?
            // this.sfuApp.sfuClient.peers.get(peer.cid).requestThumbnailVideo();
            if (peer.userId !== u_handle) {
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
            if (peer.client.isLeavingCall()) {
                this.muteIfAlone();
            }
        }
        onJoined() {
            this.chatRoom.trigger('onCallIJoined');
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
        onTrackAllocated(playerData) {
            this.numVideoTracksUsed++;
        }
        onTrackReleased(playerData) {
            this.numVideoTracksUsed--;
            // console.log("onTrackRelease:", this.numVideoTracksUsed);
            const peer = playerData.appPeer.sfuPeer;
            // clean up cached quality, if there are no players
            if ((peer.hiResPlayer && peer.hiResPlayer.slot) || (peer.vThumbPlayer && peer.vThumbPlayer.slot)) {
                return;
            }
            appPeer.currentQuality = VIDEO_QUALITY.NO_VIDEO;
            // console.warn("No video from peer, setting quality to NO_VIDEO");
        }
        onLocalMediaChange(diffFlag) {
            if (diffFlag & SfuClient.Av.Video) {
                this.localPeerStream.onStreamChange();
            }
            this.av = this.sfuApp.sfuClient.availAv;
        }
        onLocalMediaError(errObj) {
            megaChat.trigger('onLocalMediaError', errObj);
        }
        onAudioSendDenied(msg) {
            this.chatRoom.trigger('onAudioSendDenied');
        }
        toggleAudio() {
            this.sfuApp.sfuClient.muteAudio(!this.sfuApp.sfuClient.localAudioMuted());
            // when we are not a speaker, local audio track is never obtained, so the event is never fired
            this.onLocalMediaChange(SfuClient.Av.Audio);
        }
        toggleVideo() {
            if (this.isSharingScreen()) {
                this.sfuApp.sfuClient.enableScreenshare(false);
            }
            this.sfuApp.sfuClient.muteCamera(!!(this.av & SfuClient.Av.Camera));
        }
        toggleScreenSharing() {
            if (this.av & SfuClient.Av.Camera) {
                this.sfuApp.sfuClient.muteCamera(true);
            }
            this.sfuApp.sfuClient.enableScreenshare(!this.sfuApp.sfuClient.isSharingScreen());
        }
        isSharingScreen() {
            return this.sfuApp.sfuClient.isSharingScreen();
        }
        toggleHold() {
            if (this.av & SfuClient.Av.onHold) {
                this.sfuApp.sfuClient.releaseHold();
            }
            else {
                this.sfuApp.sfuClient.putOnHold();
            }
        }
        hangUp(reason) {
            this.sfuApp.destroy(reason);
            if (this.isDestroyed) {
                return;
            }
            this.isDestroyed = true;
            this.localPeerStream.destroy();
            if (this.peers.size() !== 0) {
                console.error("hangUp: Soft assert: peers.size is not zero, but", this.peers.size());
            }
            this.callTimeoutDone(true);
            this.chatRoom.callParticipantsUpdated(); // av: I have added it just in case, but do we need this?
        }
        muteIfAlone() {
            if (!this.isDestroyed && this.peers.length === 0 && this.isPublic && !!(this.av & SfuClient.Av.Audio)) {
                return this.sfuApp.sfuClient.muteAudio(true);
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
                    if (this.sfuApp) {
                        this.sfuApp.destroy();
                    }
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
    class LocalPeerStream {
        constructor(call) {
            this.isLocal = true;
            this.hasSlowNetwork = null;
            this.source = null; // local video player
            // call.sfuApp.sfuClient is not available at this time
            this.call = call;
            this.sfuApp = call.sfuApp;
            this.userHandle = u_handle;
            this.consumers = new Set();
        }
        onStreamChange() {
            const vtrack = this.sfuApp.sfuClient.mainSentVtrack();
            if (vtrack) {
                if (!this.source) {
                    this.source = document.createElement("video");
                }
                SfuClient.playerPlay(this.source, vtrack);
            }
            else {
                if (this.source) {
                    SfuClient.playerStop(this.source);
                }
                this.source = null;
            }
        }
        get audioMuted() {
            return this.sfuApp.sfuClient.localAudioMuted();
        }
        registerConsumer(consumer) {
            this.consumers.add(consumer);
            // player may have stopped when the last non-clone consumer was unmounted from the DOM
            if (this.source && !consumer.clonedVideo) { // && this.source.paused - just in case, don't check if paused
                Promise.resolve(this.source.play()).catch(nop);
            }
        }
        deregisterConsumer(consumer) {
            this.consumers.delete(consumer);
        }
        isStreaming() {
            return this.sfuApp.sfuClient.availAv & Av.Video;
        }
        updateVideoQuality() {
            return false; // returing false will cause the caller StreamNode to update itself
        }
        destroy() {
            this.isDestroyed = true; // let StreamNode know we are destroyed
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
        var self = this;

        self.logger = MegaLogger.getLogger("callManager", {}, megaChat.logger);

        self.megaChat = megaChat;


        megaChat.rebind("onRoomDestroy.callManager", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');
        });

        megaChat.rebind("onRoomInitialized.chatStore", function(e, chatRoom) {
            assert(chatRoom.type, 'missing room type');


            chatRoom.rebind("onChatdPeerJoinedCall.callManager", (e, data) => {
                if (!chatRoom.activeCallIds.exists(data.callId)) {
                    chatRoom.activeCallIds.set(data.callId, []);
                }
                chatRoom.activeCallIds.set(data.callId, chatRoom.activeCallIds[data.callId].concat(data.participants));

                const parts = data.participants;
                for (var i = 0; i < parts.length; i++) {
                    // halt call if anyone joins a 1on1 room or if I'd joined (e.g. I'd an incoming ringing first)
                    if (
                        chatRoom.type === "private" ||
                        (
                            parts[i] === u_handle &&
                            chatRoom.ringingCalls.exists(data.callId)
                        )
                    ) {
                        chatRoom.ringingCalls.remove(data.callId);

                        self.trigger("onRingingStopped", {
                            callId: data.callId,
                            chatRoom: chatRoom
                        });
                    }
                }

                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind("onChatdPeerLeftCall.callManager", (e, data) => {
                if (!chatRoom.activeCallIds[data.callId]) {
                    return;
                }
                let parts = data.participants;
                for (var i = 0; i < parts.length; i++) {
                    array.remove(chatRoom.activeCallIds[data.callId], parts[i], true);

                    if (parts[i] === u_handle && chatRoom.ringingCalls.exists(data.callId)) {
                        chatRoom.ringingCalls.remove(data.callId);

                        self.trigger("onRingingStopped", {
                            callId: data.callId,
                            chatRoom: chatRoom
                        });
                    }
                }

                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind("onCallLeft.callManager", (e, data) => {
                console.warn("onCallLeft:", JSON.stringify(data));
                const activeCall = chatRoom.activeCall;
                if (!activeCall || activeCall.callId !== data.callId) {
                    if (d) {
                        console.warn("... no active call or event not for it");
                    }
                    return;
                }
                activeCall.hangUp(data.reason);
                megaChat.activeCall = chatRoom.activeCall = null;
            });
            chatRoom.rebind("onChatdCallEnd.callManager", (e, data) => {
                if (d) {
                    console.warn("onChatdCallEnd:", JSON.stringify(data));
                }
                chatRoom.activeCallIds.remove(data.callId);
                chatRoom.stopRinging(data.callId);
                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind('onCallState.callManager', function(e, data) {
                assert(chatRoom.activeCallIds[data.callId], 'unknown call:' + data.callId);
                self.onCallState(data, chatRoom);
                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind('onRoomDisconnected.callManager', function() {
                this.activeCallIds.clear(); // av: Added this to complement the explicit handling of chatd call events
                // Keep the current call active when online, but chatd got disconnected
                if (navigator.onLine) {
                    return;
                }

                if (this.activeCall) {
                    chatRoom.trigger('ChatDisconnected', chatRoom);
                }

                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind('onStateChange.callManager', function(e, oldState, newState) {
                if (newState === ChatRoom.STATE.LEFT && chatRoom.activeCall) {
                    chatRoom.activeCall.hangUp(SfuClient.TermCode.kLeavingRoom);
                }
            });
            chatRoom.rebind('onCallPeerLeft.callManager', (e, data) => {
                const activeCall = chatRoom.activeCall;
                if (
                    activeCall.sfuApp.isDestroyed ||
                    activeCall.hasOtherParticipant() ||
                    SfuClient.isTermCodeRetriable(data.reason)
                ) {
                    return;
                }
                if (chatRoom.type === 'private') {
                    return chatRoom.trigger('onCallLeft', { callId: activeCall.callId });
                }
                // Wait for the peer left notifications to process before triggering.
                setTimeout(() => {
                    // make sure we still have that call as active
                    if (chatRoom.activeCall === activeCall) {
                        chatRoom.activeCall.initCallTimeout();
                    }
                }, 3000);
            });

            chatRoom.rebind('onMeAdded', (e, addedBy) => {
                if (chatRoom.activeCallIds.length > 0) {
                    const cm = megaChat.plugins.callManager2;

                    const callId = chatRoom.activeCallIds.keys()[0];
                    if (chatRoom.ringingCalls.exists(callId)) {
                        return;
                    }
                    chatRoom.ringingCalls.set(callId, addedBy);
                    chatRoom.megaChat.trigger('onIncomingCall', [
                        chatRoom,
                        callId,
                        addedBy,
                        cm
                    ]);
                    chatRoom.fakedLocalRing = true;

                    // clear if not canceled/rejected already
                    setTimeout(() => {
                        delete chatRoom.fakedLocalRing;
                        if (chatRoom.ringingCalls.exists(callId)) {
                            cm.trigger("onRingingStopped", {
                                callId: callId,
                                chatRoom: chatRoom
                            });
                        }
                    }, 30e3);
                }
            });
        });

        this.calls = {};
        return self;
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
            contactName = htmlentities(M.getNameByHandle(contact.u));
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
            otherContactsName = otherContactsName.map(name => megaChat.html(name));
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

    CallManager2.prototype.registerCall = function(sfuApp, chatRoom, callId) {
        this.calls[`${chatRoom.chatId}_${callId}`] = new Call(sfuApp, chatRoom, callId);
        return this.calls[`${chatRoom.chatId}_${callId}`];
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
