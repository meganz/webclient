// jscs:disable validateIndentation
(function(scope) {
    'use strict';

    const FORCE_LOWQ = !!localStorage.forceLowQuality;

    const CALL_QUALITY = {
        NO_VIDEO: -2,
        THUMB: -1,
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2
    };
    const RES_STATE = {
        NO_VIDEO: 0,
        THUMB: 1,
        THUMB_PENDING: 2,
        HD: 3,
        HD_PENDING: 4
    };
    const DOWNGRADING_QUALITY_INTRVL = 2000;

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
            this.currentQuality = CALL_QUALITY.NO_VIDEO;
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
        get contactObject() {
            return M.u[this.userHandle];
        }
        setResState(newState, video) {
            const oldSource = this.source;
            this.resState = newState;
            if (video) {
                this.source = video;
            }
            else {
                this.source = (newState === RES_STATE.HD || newState === RES_STATE.THUMB_PENDING)
                    ? this.sfuPeer.hiResPlayer && this.sfuPeer.hiResPlayer.gui.video
                    : this.sfuPeer.vThumbPlayer && this.sfuPeer.vThumbPlayer.gui.video;
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
        }
        deregisterConsumer(consumerGui) {
            this.consumers.delete(consumerGui);
            if (!this.isDestroyed) {
                this.getVideoWithCommonQuality();
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
        // centralize consumer decision and call those 2 diff methods from 1 place (used by UI)
        consumerGetVideo(consumer, quality) {
            // console.warn(`consumerGetVideo[${this.clientId}]:`, quality);
            if (!this.consumers.has(consumer)) {
                console.error(`consumerGetVideo(${quality}): Consumer not registered:`, consumer);
                return;
            }
            if (FORCE_LOWQ) {
                quality = -1;
            }
            // UI-related interface for up/downgrading quality with a reference counter implementation
            consumer.requestedQ = quality;
            delete this.consumersUpdated;
            this.getVideoWithCommonQuality(
                this.call.activeVideoStreamsCnt > SfuClient.kMaxInputVideoTracks - 2 /* 2 tracks buffer for race
                conditions */
            );
            if (!this.consumersUpdated) {
                consumer.updateVideoElem();
            }
        }
        getVideoWithCommonQuality(immediateDowngrade = false) {
            var maxQ = CALL_QUALITY.NO_VIDEO;
            for (const { requestedQ } of this.consumers) {
                if (requestedQ > maxQ) {
                    maxQ = requestedQ;
                    if (requestedQ === 2) {
                        break;
                    }
                }
            }

            if (maxQ === this.currentQuality) {
                this.hdReleaseTimerStop();
            }
            else if (maxQ < this.currentQuality && !immediateDowngrade) {
                // start gradual lowering of stream quality
                this.hdReleaseTimerRestart(maxQ);
            }
            else {
                this.hdReleaseTimerStop();
                this.doGetVideoWithQuality(maxQ); // immediately increase quality
            }
        }
        doGetVideoWithQuality(newQuality) {
            if (this.currentQuality === newQuality) {
                return;
            }
            this.currentQuality = newQuality;

            if (newQuality >= CALL_QUALITY.LOW) {
                this.requestHdQuality(2 - newQuality /* invert values */);
            }
            else if (newQuality === CALL_QUALITY.THUMB) {
                this.requestThumbQuality();
            }
            else if (newQuality === CALL_QUALITY.NO_VIDEO) {
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
            for (const gui of this.consumers) {
                gui.updateVideoElem();
            }
            this.consumersUpdated = true;
        }
        requestHdQuality(resDivider) {
            const peer = this.sfuPeer;
            // We are in hd mode and the video quality matches
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
        requestThumbQuality() {
            const peer = this.sfuPeer;
            if (peer.vThumbPlayer) {
                this.setResState(RES_STATE.THUMB);
                if (peer.hiResPlayer) {
                    peer.hiResPlayer.destroy();
                }
                return;
            }
            this.setResState(RES_STATE.THUMB_PENDING);
            const gui = peer.requestThumbnailVideo();
            gui.onPlay = () => {
                if (this.resState !== RES_STATE.THUMB_PENDING) {
                    if (this.resState === RES_STATE.HD && peer.vThumbPlayer) {
                        // vthumb request aborted, hd re-used. Delete the vthumb stream
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
                    console.error("No streams found.");
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
            // eslint-disable-next-line no-use-before-define
            this.localPeerStream = new LocalPeerStream(this);
            this.viewMode = CALL_VIEW_MODES.GRID;
            chatRoom.activeCall = this;
            megaChat.activeCall = this;
            // Peer is alone in a group call after 1 min -> mute mic
            delay('call:init', this.muteIfAlone.bind(this), 6e4);
        }
        get isPublic() {
            const type = this.chatRoom && this.chatRoom.type;
            return type === 'group' || type === 'public';
        }
        setViewMode(newMode) {
            this.viewMode = newMode;
            if (this.forcedActiveStream && this.peers[this.forcedActiveStream]) {
                this.peers[this.forcedActiveStream].isActive = false;
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
            this.callTimeoutDone();
        }
        onPeerLeft(peer, reason) {
            if (this.activeStream && this.activeStream === peer.cid) {
                this.activeStream = null;
            }

            this.peers[peer.cid].destroy();
            console.log("onPeerLeft: reason", SfuClient.TermCode[reason]);
            this.chatRoom.trigger('onCallPeerLeft', { userHandle: peer.userId, reason });
            this.left = true;
            // Peer is left alone in a group call -> mute mic
            this.muteIfAlone();
            if (this.forcedActiveStream && this.forcedActiveStream === peer.cid) {
                this.forcedActiveStream = null;
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
        registerPlayer() {
            this.activeVideoStreamsCnt++;
        }
        deregisterPlayer(playerData) {
            this.activeVideoStreamsCnt--;
            const { appPeer } = playerData;
            // clean up cached quality, if there are no players
            if (
                !appPeer.sfuPeer.hiResPlayer &&
                !appPeer.sfuPeer.vThumbPlayer &&
                appPeer.currentQuality !== CALL_QUALITY.NO_VIDEO
            ) {
                appPeer.currentQuality = CALL_QUALITY.NO_VIDEO;
                // console.warn("No video from peer, setting quality to NO_VIDEO");
            }
        }
        onLocalMediaChange(diffFlag) {
            if (diffFlag & SfuClient.Av.Video) {
                this.localPeerStream.onVideoChange();
            }
            this.av = this.sfuApp.sfuClient.availAv;
        }
        onLocalMediaError(errAv) {
            this.chatRoom.trigger('onLocalMediaError', errAv);
        }
        toggleAudio(mute) {
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
        async toggleScreenSharing() {
            if (this.av & SfuClient.Av.Camera) {
                this.sfuApp.sfuClient.muteCamera(true);
            }
            await this.sfuApp.sfuClient.enableScreenshare(!this.sfuApp.sfuClient.isSharingScreen());
        }
        isSharingScreen() {
            return this.sfuApp.sfuClient.isSharingScreen();
        }
        async toggleHold() {
            if (this.av & SfuClient.Av.onHold) {
                await this.sfuApp.sfuClient.releaseHold();
            }
            else {
                await this.sfuApp.sfuClient.putOnHold();
            }
        }
        hangUp(reason) {
            this.sfuApp.destroy(reason);
            const cids = this.peers.keys();
            while (cids.length) {
                const peer = this.peers[cids[cids.length - 1]];
                if (peer.destroy) {
                    peer.destroy();
                }
            }
            delete this.peers;
            this.callTimeoutDone(true);
        }
        muteIfAlone() {
            if (this.peers && this.peers.length === 0 && this.isPublic && !!(this.av & SfuClient.Av.Audio)) {
                return this.sfuApp.sfuClient.muteAudio(true);
            }
            return false;
        }
        callTimeoutDone(leaveCallActive) {
            if (typeof leaveCallActive === 'undefined') {
                leaveCallActive = this.peers.length;
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
                this.chatRoom.trigger('onCallEnd', { callId: this.callId, removeActive: true});
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
                        this.callToutEnd = unixtime() + 120;
                    })
                    .setUpdater(function() {
                        let timeRemain = (this.callToutEnd || unixtime() + 120) - unixtime();
                        if (timeRemain <= 0) {
                            this.content = '';
                            done();
                        }
                        else {
                            timeRemain = secondsToTime(timeRemain).substring(3);
                            this.content = l.call_timeout_remain /* `Call will end in %s` */
                                .replace('%s', timeRemain);
                            // Check if the dialog is shown then update the counter on it.
                            const $dlgText = $('.stay-dlg-counter', '.mega-dialog');
                            if ($dlgText.length && $dlgText.is(':visible')) {
                                $dlgText.text(timeRemain);
                            }
                        }
                    })
                    .setClose(false)
                    .dispatch();
            }
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
        onVideoChange() {
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
        }
        deregisterConsumer(consumer) {
            this.consumers.delete(consumer);
        }
        isStreaming() {
            return this.sfuApp.sfuClient.availAv & Av.Video;
        }
        consumerGetVideo(cons) {
            cons.updateVideoElem();
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


            chatRoom.rebind("onJoinCall.callManager", function(e, data) {
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
            chatRoom.rebind("onLeftCall.callManager", function(e, data) {
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
            chatRoom.rebind("onCallEnd.callManager", function(e, data) {
                if (data.removeActive) {
                    chatRoom.activeCallIds.remove(data.callId);
                }

                if (chatRoom.activeCall && chatRoom.activeCall.callId === data.callId) {
                    chatRoom.activeCall.hangUp(data.reason);
                    megaChat.activeCall = chatRoom.activeCall = null;
                }

                if (chatRoom.ringingCalls.exists(data.callId)) {
                    chatRoom.ringingCalls.remove(data.callId);
                }
                self.trigger("onRingingStopped", {
                    callId: data.callId,
                    chatRoom: chatRoom
                });

                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind('onCallState.callManager', function(e, data) {
                assert(chatRoom.activeCallIds[data.callId], 'unknown call:' + data.callId);
                self.onCallState(data, chatRoom);
                chatRoom.callParticipantsUpdated();
            });
            chatRoom.rebind('onRoomDisconnected.callManager', function() {
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
            chatRoom.rebind('onCallPeerLeft.callManager', (e, { reason }) => {
                const { peers, callId, sfuApp } = chatRoom.activeCall;

                if (
                    sfuApp.isDestroyed ||
                    peers.length ||
                    SfuClient.isTermCodeRetriable(reason)
                ) {
                    return;
                }
                if (chatRoom.type === 'private') {
                    return chatRoom.trigger('onCallEnd', { callId, removeActive: true });
                }
                // Wait for the peer left notifications to process before triggering.
                setTimeout(() => {
                    chatRoom.activeCall.initCallTimeout();
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
        var authorContact = M.u[meta.userId];
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
        if (eventData.userId === u_handle && chatRoom.type === 'private' && megaChat.activeCall) {
            if (eventData.arg) {
                megaChat.trigger('onOutgoingCallRinging', [chatRoom, eventData.callId, eventData.userId, this]);
            }
            else {
                // Hang-up the if the other participant didn't already join the 1-on-1 call; excl. current user joining
                // from another client/device.
                const { peers } = megaChat.activeCall;
                if (!peers.length || peers.length === 1 && peers.getItem(0).userHandle === u_handle) {
                    chatRoom.trigger('onCallEnd', { callId: eventData.callId, removeActive: true });
                }
            }
            return;
        }

        if (!megaChat.hasSupportForCalls || chatRoom.fakedLocalRing) {
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
    CallManager2.CALL_QUALITY = CALL_QUALITY;
    CallManager2.MAX_CALL_PARTICIPANTS = 20;

    scope.CallManager2 = CallManager2;

})(window);
