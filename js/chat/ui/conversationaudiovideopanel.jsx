import React from 'react';
import ReactDOM from 'react-dom';
import {MegaRenderMixin} from './../../stores/mixins.js';
import {Avatar} from './../ui/contacts.jsx';
import utils from './../../ui/utils.jsx';
import PropTypes from 'prop-types';

// eslint-disable-next-line id-length
var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1;


// 7+1 for myself  = 8
// eslint-disable-next-line id-length
var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;

var VIEW_MODES = {
    "GRID": 1,
    "CAROUSEL": 2,
};

function muteOrHoldIconStyle(opts) {
    if (opts.onHold) {
        return "small-icon icon-audio-muted"; // on-hold";
    }
    else if (!opts.audio) {
        return "small-icon icon-audio-muted";
    }
    return "small-icon hidden";
}

class RemoteVideoPlayer extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        var self = this;
        var sess = self.props.sess;
        var sid = sess.stringSid;
        var peerMedia = Av.toMediaOptions(this.props.peerAv);
        let noVideo = (!peerMedia.video || sess.call.isOnHold() || peerMedia.onHold);
        self.state.noVideo = noVideo;
        if (noVideo) {
            // Show avatar for remote video
            var contact = M.u[base64urlencode(sess.peer)];
            assert(contact);
            return <div
                className={"call user-audio is-avatar " + (self.props.isActive ? "active" : "") +
                " stream" + sid}
                onClick={(e) => {
                    let onPlayerClick = self.props.onPlayerClick;
                    if (onPlayerClick) { // only set for carousel bottom bar
                        onPlayerClick(sid);
                    }
                }}>
                {
                    sess.peerNetworkQuality() === 0 ?
                        <div className="icon-connection-issues"></div> : null
                }
                <div className="center-avatar-wrapper">
                    <div className={ muteOrHoldIconStyle(peerMedia) }></div>
                    <Avatar contact={contact}  className="avatar-wrapper" simpletip={contact.name}
                        simpletipWrapper="#call-block"
                        simpletipOffset={8}
                        simpletipPosition="top"
                        hideVerifiedBadge={true}
                    />
                </div>
                <div className="audio-level"
                    ref={function(ref) {
                        self.audioLevelDiv = ref;
                    }}
                />
            </div>;
        }
        else { // show remote video for that peer
            return <div
                className={"call user-video is-video " + (self.props.isActive ? "active" : "") +
                " stream" + sid + (peerMedia.screen ?  " is-screen" : "")}
                onClick={(e) => {
                    let onPlayerClick = self.props.onPlayerClick;
                    if (onPlayerClick) { // only set for carousel bottom bar
                        onPlayerClick(sid);
                    }
                }}>
                {
                    sess.peerNetworkQuality() === 0 ?
                        <div className="icon-connection-issues"></div> : null
                }
                <div className={ muteOrHoldIconStyle(peerMedia) }></div>
                <div className="audio-level"
                    ref={function(ref) {
                        self.audioLevelDiv = ref;
                    }}
                />
                <video
                    autoPlay={true}
                    className="rmtViewport rmtVideo"
                    ref="player"
                />
            </div>;
        }
    }
    indicateAudioLevel(level) {
        if (this.audioLevelDiv) {
            this.audioLevelDiv.style.width = Math.round(level * 100) +'%';
        }
    }
    componentDidMount() {
        var self = this;
        if (!self.props.noAudioLevel) {
            self.props.sess.audioIndicator = this;
        }
        super.componentDidMount();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.player) {
            RTC.detachMediaStream(this.player);
            delete this.player;
        }
    }
    componentDidUpdate() {
        var self = this;
        var noVideo = self.state.noVideo;
        if (self.state.prevNoVideo === noVideo) {
            return;
        }
        self.state.prevNoVideo = noVideo;

        let player = self.refs.player;
        if (noVideo) {
            if (player) {
                RTC.detachMediaStream(player);
            }
        } else {
            assert(player);
            let sess = self.props.sess;
            if (player.srcObject) {
                if (player.srcObject.id === sess.remoteStream.id && !player.paused) {
                    // player already connected and playing this stream
                    return;
                }
                // player was connected to some other session, detach it
                RTC.detachMediaStream(player);
            }
            RTC.attachMediaStream(player, sess.remoteStream);
        }
    }
};

RemoteVideoPlayer.propTypes = {
    sess: PropTypes.object.isRequired,
    isActive: PropTypes.bool.isRequired,
    peerAv: PropTypes.number.isRequired,
    onPlayerClick: PropTypes.func,
    noAudioLevel: PropTypes.bool
};

class ConversationAVPanel extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            'messagesBlockEnabled': false,
            'fullScreenModeEnabled': false,
            'localMediaDisplay': true,
            'viewMode': VIEW_MODES.GRID,
            'selectedStreamSid': false,
        };
    }
    specShouldComponentUpdate() {
        if (this.state.fullScreenModeEnabled) {
            return true;
        }
    }
    getActiveSid() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var call = chatRoom.callManagerCall;
        if (!call || !call.isActive()) {
            return;
        }
        var selected = self.state.selectedStreamSid;
        if (selected) {
            return selected;
        }
        var sess = Object.values(call.rtcCall.sessions)[0];
        return sess ? sess.stringSid : undefined;
    }
    haveScreenSharingPeer() {
        var chatRoom = this.props.chatRoom;
        var callManagerCall = chatRoom.callManagerCall;
        if (!callManagerCall) {
            return false;
        }
        var rtcCall = callManagerCall.rtcCall;
        if (!rtcCall.sessions) {
            return false;
        }
        var sessions = rtcCall.sessions;
        /* eslint-disable guard-for-in */
        for (var sid in sessions) {
            var av = sessions[sid].peerAv;
            if ((av != null) && (av & Av.Screen)) {
                return true;
            }
        }
        /* eslint-enable guard-for-in */
        return false;
    }
    getViewMode() {
        var chatRoom = this.props.chatRoom;
        var callManagerCall = chatRoom.callManagerCall;
        if (callManagerCall) {
            var participantsCount = Object.keys(callManagerCall.rtcCall.sessions).length;
            if (DEBUG_PARTICIPANTS_MULTIPLICATOR) {
                participantsCount *= DEBUG_PARTICIPANTS_MULTIPLICATOR;
            }
            if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
                return VIEW_MODES.CAROUSEL;
            }
        }
        if (chatRoom.type === "private") {
            return VIEW_MODES.GRID;
        }
        if (this.haveScreenSharingPeer()) {
            return VIEW_MODES.CAROUSEL;
        }

        return this.state.viewMode;
    }
    onPlayerClick(sid) {
        if (this.getViewMode() === VIEW_MODES.CAROUSEL) {
            this.setState({'selectedStreamSid': sid});
        }
    }
    _hideBottomPanel() {
        var self = this;
        var room = self.props.chatRoom;
        if (!room.callManagerCall || !room.callManagerCall.isActive()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));

        self.visiblePanel = false;
        $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container)
            .removeClass('visible-panel');
    }
    resizeVideos() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (chatRoom.type === "private") {
            return;
        }
        var callManagerCall = chatRoom.callManagerCall;
        if (!callManagerCall || !callManagerCall.isActive()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));

        var totalWidth = $container.outerWidth();
        if (totalWidth > $('.participantsContainer', $container).parent().outerWidth()) {
            // chrome zoom bug
            totalWidth = $('.participantsContainer', $container).parent().outerWidth();
        }

        if (ua.details.browser === "Safari") {
            // for some reason, Safari adds 1px to the totalWidth
            totalWidth -= 1;
        }

        var $streams = $('.user-video, .user-audio', $container);
        var totalStreams = $streams.length;

        if (totalStreams === 1) {
            totalWidth = Math.min(totalWidth, $container.outerHeight() - $('.call-header', $container).outerHeight());
        }
        var newWidth;

        if (self.getViewMode() === VIEW_MODES.CAROUSEL) {
            $('.participantsContainer', $container).height('auto');
            var activeStreamHeight =
                $container.outerHeight() - $('.call-header').outerHeight() -
                $('.participantsContainer', $container).outerHeight()
            ;

            var mediaOpts;
            if (this.state.selectedStreamSid === "local") {
                mediaOpts = callManagerCall.getMediaOptions();
            }
            else {
                mediaOpts = callManagerCall.getRemoteMediaOptions(self.getActiveSid());
            }

            $('.activeStream', $container).height(
                activeStreamHeight
            );

            $('.activeStream .user-audio .avatar-wrapper', $container)
                .width(activeStreamHeight - 20)
                .height(activeStreamHeight - 20)
                .css('font-size', 100 / 240 * activeStreamHeight + "px");

            $('.user-video, .user-audio, .user-video video', $container)
                .width('')
                .height('');

            var $video;
            var $mutedIcon;
            $video = $('.activeStream video', $container);
            $mutedIcon = $('.activeStream .icon-audio-muted', $container);

            if ($video.length > 0 && $mutedIcon.length > 0) {
                if ($video.outerHeight() > 0 && $video[0].videoWidth > 0 && $video[0].videoHeight > 0) {
                    var actualWidth = Math.min(
                        $video.outerWidth(),
                        $video[0].videoWidth / $video[0].videoHeight * $video.outerHeight()
                    );
                    if (mediaOpts.audio) {
                        $mutedIcon.addClass('hidden');
                    }
                    else {
                        $mutedIcon.removeClass('hidden');
                    }

                    $mutedIcon.css({
                        'right': 'auto',
                        'top': 24 + 8,
                        'left':
                            $video.outerWidth() / 2 + actualWidth / 2 - $mutedIcon.outerWidth() - 24

                    });
                }
                else {
                    $video.one('loadeddata.cav loadedmetadata.cav', function() {
                        self.resizeVideos();
                    });
                    // hide while video is loading, since a flickering may happen of the icon
                    $mutedIcon.addClass('hidden');
                }
            }

        }
        else {
            $('.participantsContainer', $container).height(
                $container.outerHeight() - $('.call-header', $container).outerHeight()
            );

            newWidth = totalWidth / totalStreams;
        }


        var $resizables = $(
            '.user-video, .user-audio',
            $('.participantsContainer', $container)
        );
        $resizables.width(newWidth);

        for (var i = 0; i < $resizables.length; i++) {
            var elem = $resizables[i];
            var $elem = $(elem);

            $('video', elem)
                .width(newWidth)
                .height(newWidth);

            $elem
                .width(newWidth)
                .height(newWidth);
        }
    }
    componentDidMount() {
        super.componentDidMount();
        this.resizeVideos();
        this.initialRender = false;
    }
    componentDidUpdate() {
        var self = this;
        var room = self.props.chatRoom;
        var callManagerCall = room.callManagerCall;
        if (!callManagerCall || !callManagerCall.isActive()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));

        var mouseoutThrottling = null;
        $container.rebind('mouseover.chatUI' + self.props.chatRoom.roomId, function() {
            var $this = $(this);
            clearTimeout(mouseoutThrottling);
            self.visiblePanel = true;
            $('.call.bottom-panel, .call.local-video, .call.local-audio, .participantsContainer', $container)
                .addClass('visible-panel');

            if ($this.hasClass('full-sized-block')) {
                $('.call.top-panel', $container).addClass('visible-panel');
            }
        });

        $container.rebind('mouseout.chatUI' + self.props.chatRoom.roomId, function() {
            var $this = $(this);
            clearTimeout(mouseoutThrottling);
            mouseoutThrottling = setTimeout(function() {
                self.visiblePanel = false;
                self._hideBottomPanel();
                $('.call.top-panel', $container).removeClass('visible-panel');
            }, 500);
        });


        // Hidding Control panel if cursor is idle
        var idleMouseTimer;
        var forceMouseHide = false;
        var hideBottomPanel = function() {
            self.visiblePanel = false;

            self._hideBottomPanel();

            $container.addClass('no-cursor');
            $('.call.top-panel', $container).removeClass('visible-panel');

            forceMouseHide = true;
            setTimeout(function() {
                forceMouseHide = false;
            }, 400);
        };

        $container.rebind('mousemove.chatUI' + self.props.chatRoom.roomId,function(ev) {
            var $this = $(this);
            if (self._bottomPanelMouseOver) {
                return;
            }
            clearTimeout(idleMouseTimer);
            if (!forceMouseHide) {
                self.visiblePanel = true;
                $('.call.bottom-panel, .call.local-video, .call.local-audio', $container).addClass('visible-panel');
                $container.removeClass('no-cursor');
                if ($this.hasClass('full-sized-block')) {
                    $('.call.top-panel', $container).addClass('visible-panel');
                }
                idleMouseTimer = setTimeout(hideBottomPanel, 2000);
            }
        });

        $('.call.bottom-panel', $container).rebind('mouseenter.chatUI' + self.props.chatRoom.roomId,function(ev) {
            self._bottomPanelMouseOver = true;
            clearTimeout(idleMouseTimer);
        });
        $('.call.bottom-panel', $container).rebind('mouseleave.chatUI' + self.props.chatRoom.roomId,function(ev) {
            self._bottomPanelMouseOver = false;

            idleMouseTimer = setTimeout(hideBottomPanel, 2000);
        });


        $(document)
            .rebind("fullscreenchange.megaChat_" + room.roomId, function() {
                if (!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({fullScreenModeEnabled: false});
                }
                else if (!!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({fullScreenModeEnabled: true});
                }
                self.forceUpdate();
            });

        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
        $localMediaDisplay.draggable({
            'refreshPositions': true,
            'containment': $container,
            'scroll': false,
            drag: function(event, ui){
                if ($(this).is(".minimized")) {
                    return false;
                }

                var right = Math.max(0, $container.outerWidth() - ui.position.left);
                var bottom = Math.max(0, $container.outerHeight() - ui.position.top);


                // contain in the $container
                right = Math.min(right, $container.outerWidth() - 8);
                bottom = Math.min(bottom, $container.outerHeight() - 8);

                right -= ui.helper.outerWidth();
                bottom -= ui.helper.outerHeight();

                var minBottom = $(this).is(".minimized") ? 48 : 8;

                if (bottom < minBottom) {
                    bottom = minBottom;
                    $(this).addClass('bottom-aligned');
                }
                else {
                    $(this).removeClass('bottom-aligned');
                }

                if (right < 8) {
                    right = 8;
                    $(this).addClass('right-aligned');
                }
                else {
                    $(this).removeClass('right-aligned');
                }

                ui.offset = {
                    left: 'auto',
                    top: 'auto',
                    right: right,
                    bottom: bottom,
                    height: "",
                    width: ""
                };
                ui.position.left = 'auto';
                ui.position.top = 'auto';

                ui.helper.css(ui.offset);
                $(this).css(ui.offset);
            }
        });

        // REposition the $localMediaDisplay if its OUT of the viewport (in case of dragging -> going back to normal
        // size mode from full screen...)
        chatWinResizeManager.addEventListener('chatUI_' + room.roomId, function() {
            if ($container.is(":visible")) {
                if (!elementInViewport($localMediaDisplay[0])) {
                    $localMediaDisplay
                        .addClass('right-aligned')
                        .addClass('bottom-aligned')
                        .css({
                            'right': 8,
                            'bottom': 8,
                        });
                }
            }
            self.resizePanes();
            self.resizeVideos();
        });
        $(room).rebind('toggleMessages.av', function() {
            self.toggleMessages();
        });

        room.messagesBlockEnabled = self.state.messagesBlockEnabled;

        var self = this;
        this.props.chatRoom.rebind('onLocalMuteInProgress.ui', function() {
            self.setState({'muteInProgress': true});
        });
        this.props.chatRoom.rebind('onLocalMuteComplete.ui', function() {
            self.setState({'muteInProgress': false});
        });

        if (self.initialRender === false && $container) {
            self.bindInitialEvents();
        }
        self.resizePanes();
        self.resizeVideos();

        $('.simpletip', $container).trigger('simpletipUpdated');
    }
    resizePanes() {
        var self = this;
        var $container = $(self.findDOMNode());
        var $rootContainer = $container.parents('.conversation-panel');
        if (!self.state.messagesBlockEnabled && self.props.chatRoom.callManagerCall) {
            $('.call-block', $rootContainer).height('');
        }
        $rootContainer.trigger('resized');
    }
    bindInitialEvents() {
        var self = this;
        var $container = $(ReactDOM.findDOMNode(self));
        self.avResizable = new FMResizablePane(
            $container,
            {
                'direction': 's',
                'handle': '.av-resize-handler',
                'minHeight': 168,
                'persistanceKey': false,
                'containment': $container.parent()
            });

        $(self.avResizable).rebind('resize.avp', function(e, e2, ui) {
            self.resizePanes();
            localStorage.chatAvPaneHeight = ui.size.height;
        });

        self.initialRender = true;
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var room = self.props.chatRoom;

        var $container = $(ReactDOM.findDOMNode(self));
        if ($container) {
            $container.off('mouseover.chatUI' + self.props.chatRoom.roomId);
            $container.off('mouseout.chatUI' + self.props.chatRoom.roomId);
            $container.off('mousemove.chatUI' + self.props.chatRoom.roomId);
        }

        $(document).off("fullscreenchange.megaChat_" + room.roomId);
        chatWinResizeManager.removeEventListener('chatUI_' + room.roomId);
        $(room).off('toggleMessages.av');

        var $rootContainer = $container.parents('.conversation-panel');
        $('.call-block', $rootContainer).height('');
        self.initialRender = false;
    }
    toggleMessages(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }


        if (this.props.onMessagesToggle) {
            this.props.onMessagesToggle(
                !this.state.messagesBlockEnabled
            );
            var $container = $(this.findDOMNode());
            var predefHeight = localStorage.chatAvPaneHeight || false;
            if (predefHeight) {
                $container.height(parseInt(localStorage.chatAvPaneHeight, 10));
            }
            $('.simpletip', $container).trigger('simpletipClose');
        }

        this.setState({
            'messagesBlockEnabled': !this.state.messagesBlockEnabled
        });

        if (!this.state.messagesBlockEnabled) {
            Soon(function() {
                $(window).trigger('resize');
            });
        }
    }
    fullScreenModeToggle(e) {
        e.preventDefault();
        e.stopPropagation();

        var newVal = !this.state.fullScreenModeEnabled;
        var $container = $(ReactDOM.findDOMNode(this));
        $(document).fullScreen(newVal);
        $('.simpletip', $container).trigger('simpletipClose');

        this.setState({
            'fullScreenModeEnabled': newVal,
            'messagesBlockEnabled': newVal ? false : this.state.messagesBlockEnabled
        });
    }
    toggleLocalVideoDisplay(e) {
        e.preventDefault();
        e.stopPropagation();

        var $container = $(ReactDOM.findDOMNode(this));
        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);
        var newVal = !this.state.localMediaDisplay;
        $localMediaDisplay
            .addClass('right-aligned')
            .addClass('bottom-aligned')
            .css({
                'width': '',
                'height': '',
                'right': 8,
                'bottom': newVal ? 8 : 8
            });

        this.setState({localMediaDisplay: newVal});
    }
    render() {
        var chatRoom = this.props.chatRoom;
        var self = this;
        var callManagerCall = chatRoom.callManagerCall;

        if (!callManagerCall || !callManagerCall.isStarted()) {
            self.initialRender = false;
            return null;
        }
        var rtcCall = callManagerCall.rtcCall;
        assert(rtcCall);

        var participants = chatRoom.getParticipantsExceptMe();

        var displayNames = [];

        participants.forEach(function(v) {
            displayNames.push(
                htmlentities(M.getNameByHandle(v))
            );
        });

        var localPlayerElement = null;
        var remotePlayerElements = [];
        var onRemotePlayerClick; // handler that exists only for the peer views in the carosel bottom bar
        var isCarousel = (self.getViewMode() === VIEW_MODES.CAROUSEL);
        if (isCarousel) {
            var activeSid = (chatRoom.type === "group" || chatRoom.type === "public")
                ? self.getActiveSid()
                : false;
            var activePlayer = null;
            onRemotePlayerClick = self.onPlayerClick.bind(self);
        }

        var sessions = rtcCall.sessions;
        var realSids = Object.keys(sessions);
        var sids = [];
        if (!DEBUG_PARTICIPANTS_MULTIPLICATOR) {
            sids = realSids;
        }
        else {
            // UI debug mode - simulate more participants
            // by duplicating each session DEBUG_PARTICIPANTS_MULTIPLICATOR times.
            var initialCount = realSids.length;
            for (var i = 0; i < initialCount; i++) {
                for (var j = 0; j < DEBUG_PARTICIPANTS_MULTIPLICATOR; j++) {
                    sids.push(realSids[i]);
                }
            }
        }

        var visiblePanelClass = this.visiblePanel ? " visible-panel" : "";
        var localMedia = Av.toMediaOptions(rtcCall.localAv());
        var haveAnyRemoteVideo = false;
        sids.forEach(function(binSid, i) {
            // we use 'i' to uniquely identify views when we have several views for each peer for debug purposes
            let sess = sessions[binSid];
            let sid = sess.stringSid;
            let playerIsActive = activeSid === sid;
            let player = <RemoteVideoPlayer
                sess = {sess}
                key = {sid + "_" + i}
                peerAv = {sess.peerAv()}
                isActive = {playerIsActive}
                onPlayerClick = { onRemotePlayerClick }
            />;
            if (playerIsActive && isCarousel) {
                activePlayer = <RemoteVideoPlayer
                    sess = {sess}
                    key = {"carousel_active"}
                    peerAv = {sess.peerAv()}
                    isActive = {true}
                    noAudioLevel = {true}
                />;
            }
            remotePlayerElements.push(player);
        });

        if (this.getViewMode() === VIEW_MODES.GRID) {
            if (!localMedia.video) {
                // no local video, display our avatar
                localPlayerElement = <div className={
                    "call local-audio right-aligned bottom-aligned is-avatar" +
                    (this.state.localMediaDisplay ? "" : " minimized ") +
                    visiblePanelClass
                }>
                    {
                        megaChat.rtc.ownNetworkQuality() === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="default-white-button tiny-button call"
                        onClick={this.toggleLocalVideoDisplay.bind(this)}>
                        <i className="tiny-icon grey-minus-icon"/>
                    </div>
                    <div className={"center-avatar-wrapper " + (this.state.localMediaDisplay ? "" : "hidden")}>
                        <div className={ muteOrHoldIconStyle(localMedia) }></div>
                        <Avatar
                            contact={M.u[u_handle]}
                            chatRoom={this.props.chatRoom}
                            className={
                                "call avatar-wrapper is-avatar " +
                                (this.state.localMediaDisplay ? "" : "hidden")
                            }
                            hideVerifiedBadge={true}
                        />
                    </div>
                </div>;
            }
            else {
                // we have local video (grid mode)
                localPlayerElement = <div
                    className={
                        "call local-video right-aligned is-video bottom-aligned" +
                        (this.state.localMediaDisplay ? "" : " minimized ") +
                        visiblePanelClass +
                        (activeSid === "local" ? " active " : "") +
                        (localMedia.screen ? " is-screen" : "")
                    }>
                    {
                        megaChat.rtc.ownNetworkQuality() === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="default-white-button tiny-button call"
                        onClick={this.toggleLocalVideoDisplay.bind(this)}>
                        <i className="tiny-icon grey-minus-icon"/>
                    </div>
                    <div className={ muteOrHoldIconStyle(localMedia) }></div>
                    <video
                        className="localViewport"
                        defaultmuted={"true"}
                        muted={true}
                        volume={0}
                        id={"localvideo_" + base64urlencode(rtcCall.id)}
                        style={{display: !this.state.localMediaDisplay ? "none" : ""}}
                        ref={function(ref) {
                            if (ref && !RTC.isAttachedToStream(ref)) {
                                RTC.attachMediaStream(ref, rtcCall.localStream());
                            }
                        }}
                    />
                </div>;
            }
        }
        else {
            // carousel
            if (!localMedia.video) {
                // display avatar for local video
                let localPlayer =
                <div
                    className={
                        "call user-audio local-carousel is-avatar" + (activeSid === "local" ? " active " : "")
                    }
                    key="local"
                    onClick={(e) => {
                        self.onPlayerClick("local");
                    }}>
                    {
                        megaChat.rtc.ownNetworkQuality() === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="center-avatar-wrapper">
                        <div className={ muteOrHoldIconStyle(callManagerCall.getMediaOptions()) }></div>
                        <Avatar
                            contact={M.u[u_handle]} className="call avatar-wrapper"
                            chatRoom={this.props.chatRoom}
                            hideVerifiedBadge={true}
                        />
                    </div>
                </div>;

                remotePlayerElements.push(localPlayer);

                if (activeSid === "local") {
                    activePlayer = localPlayer;
                }
            }
            else { // we have local video (carousel mode)
                let localPlayer = <div
                    className={
                        "call user-video local-carousel is-video" + (
                            activeSid === "local" ? " active " : ""
                        ) + (
                            localMedia.screen ? " is-screen" : ""
                        )
                    }
                    key="local-video"
                    onClick={(e) => {
                        self.onPlayerClick("local");
                    }}>
                    {
                        megaChat.rtc.ownNetworkQuality() === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className={ muteOrHoldIconStyle(localMedia) }></div>
                    <video
                        ref="localViewport"
                        className="localViewport smallLocalViewport"
                        defaultmuted={"true"}
                        muted={true}
                        volume={0}
                        id={"localvideo_" + base64urlencode(rtcCall.id)}
                        ref={function(ref){
                            if (ref && !RTC.isAttachedToStream(ref)) {
                                RTC.attachMediaStream(ref, rtcCall.localStream());
                            }
                        }}
                    />
                </div>;

                remotePlayerElements.push(localPlayer);

                if (activeSid === "local") {
                    activePlayer = <div
                        className={
                            "call user-video is-video local-carousel local-carousel-big " + (
                                localMedia.screen ? " is-screen" : ""
                            )
                        }
                        key="local-video2">
                        {
                            megaChat.rtc.ownNetworkQuality() === 0 ?
                                <div className="icon-connection-issues"></div> : null
                        }
                        <div className={ muteOrHoldIconStyle(localMedia) }></div>
                        <video
                            className="localViewport bigLocalViewport"
                            defaultmuted={"true"}
                            muted={true}
                            volume={0}
                            id={"localvideo_big_" + base64urlencode(rtcCall.id)}
                            ref={function(ref){
                                if (ref && !RTC.isAttachedToStream(ref)) {
                                    RTC.attachMediaStream(ref, rtcCall.localStream());
                                }
                            }}
                        />
                    </div>;
                }
            }
        }

        var unreadDiv = null;
        var unreadCount = chatRoom.messagesBuff.getUnreadCount();
        if (unreadCount > 0) {
            unreadDiv = <div className="unread-messages">{unreadCount > 9 ? "9+" : unreadCount}</div>;
        }

        var additionalClass = "";
        additionalClass = this.state.fullScreenModeEnabled ? " full-sized-block" : "";
        if (additionalClass.length === 0) {
            additionalClass = this.state.messagesBlockEnabled ? " small-block" : "";
        }

        var participantsCount = Object.keys(rtcCall.sessions).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;

        additionalClass += " participants-count-" +
            participantsCount
        ;

        var header = null;
        var videoSessionCount = rtcCall.getAudioVideoSenderCount().video;
        var videoSendersMaxed = videoSessionCount >= RtcModule.kMaxCallVideoSenders;
        var notifBar = null;

        if (chatRoom.type === "group" || chatRoom.type === "public") {
            header = (
                <div className="call-header">
                    <div className="call-topic">
                        <utils.EmojiFormattedContent>
                            {ellipsis(chatRoom.getRoomTitle(), 'end', 70)}
                        </utils.EmojiFormattedContent>
                    </div>
                    <div className="call-participants-count">
                        {chatRoom.getCallParticipants().length}
                    </div>

                    <a className={
                        "call-switch-view " + (self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel") +
                        (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE ||
                            this.haveScreenSharingPeer() ? " disabled" : "")
                    } onClick={function(e) {
                        if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
                            return;
                        }

                        self.setState({
                            'selectedStreamSid': false,
                            'viewMode':
                                self.getViewMode() === VIEW_MODES.GRID ?
                                    VIEW_MODES.CAROUSEL :
                                    VIEW_MODES.GRID
                        });
                    }}></a>
                    <div className={"call-av-counter" + (
                        videoSendersMaxed ? " limit-reached" : ""
                    )}>{videoSessionCount} / {RtcModule.kMaxCallVideoSenders}</div>

                    <div
                        className={
                            "call-video-icon" + (
                                videoSendersMaxed.video ? " call-video-icon-warn" : ""
                        )}>
                    </div>
                    <div className="call-header-duration"
                        data-room-id={chatRoom.chatId}>
                        {secondsToTimeShort(chatRoom._currentCallCounter)}
                    </div>
                </div>
            );
            var nEngine = callManagerCall.callNotificationsEngine;
            var notif = nEngine.getCurrentNotification();

            if (!nEngine._bound) {
                nEngine.rebind('onChange.cavp', function () {
                    if (chatRoom.isCurrentlyActive) {
                        self.safeForceUpdate();
                        var $notif = $('.in-call-notif:visible');
                        $notif
                            .css({'opacity':0.3})
                            .animate({'opacity': 1}, {
                                queue: false,
                                duration: 1500
                            });
                    }
                });
                nEngine._bound = true;
            }

            if (notif) {
                var title = notif.getTitle();
                notifBar = <div className={"in-call-notif " + notif.getClassName()}>
                    {title ? title : null}
                </div>;
            }
        }
        var networkQualityBar = null;

        var netq = megaChat.rtc.ownNetworkQuality();
        if (netq != null && netq <= 1) {
            var networkQualityMessage =  l[23213];
            networkQualityBar = <div className={"in-call-notif yellow" + (notifBar ? " after-green-notif" : "") }>
                {networkQualityMessage}
            </div>;
        }

        additionalClass += self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel";

        var players = null;
        if (self.getViewMode() === VIEW_MODES.GRID) {
            players = <div className="participantsWrapper" key="container">
                <div className="participantsContainer" key="partsContainer">{remotePlayerElements}</div>
                {localPlayerElement}
            </div>;
        }
        else { // carousel
            players = <div key="container">
                <div className="activeStream" key="activeStream">
                    {activePlayer}
                </div>
                <div className="participantsContainer" key="partsContainer">
                    {remotePlayerElements}
                    {localPlayerElement}
                </div>
            </div>;
        }

        var topPanel = null;

        if (chatRoom.type !== "group") {
            var remoteCamEnabled = haveAnyRemoteVideo
                ? <i className="small-icon blue-videocam" />
                : null;
            topPanel = <div className="call top-panel">
                <div className="call top-user-info">
                    <span className="user-card-name white">{displayNames.join(", ")}</span>{remoteCamEnabled}
                </div>
                <div className="call-duration medium blue call-counter" data-room-id={chatRoom.chatId}>{
                    secondsToTimeShort(chatRoom._currentCallCounter)
                }
                </div>
            </div>;
        }

        if (participantsCount < 4) {
            additionalClass += " participants-less-4";
        }
        else if (participantsCount < 8) {
            additionalClass += " participants-less-8";
        }
        else if (participantsCount < 16) {
            additionalClass += " participants-less-16";
        }
        else {
            additionalClass += " participants-a-lot";
        }

        var hugeOverlayDiv = null;
        if (chatRoom.callReconnecting) {
            hugeOverlayDiv = <div className="callReconnecting">
                    <i className="huge-icon crossed-phone"></i>
                </div>;
        }
        else if (rtcCall.isOnHold()) {
            hugeOverlayDiv = <div className="callReconnecting">
                <i className="huge-icon call-on-hold"></i>
            </div>;
        }
        var micMuteBtnDisabled = rtcCall.isLocalMuteInProgress() || rtcCall.isRecovery || rtcCall.isOnHold();
        var camMuteBtnDisabled = micMuteBtnDisabled || (!localMedia.video && videoSendersMaxed);
        var screenShareBtnDisabled = micMuteBtnDisabled || !RTC.supportsScreenCapture;

        return <div className={"call-block" + additionalClass} id="call-block">
            <div className={"av-resize-handler ui-resizable-handle ui-resizable-s " + (
                (this.state.messagesBlockEnabled && !this.state.fullScreenModeEnabled)
                ? ""
                : "hidden"
            )}></div>
            {header}
            {notifBar}
            {networkQualityBar}
            {players}
            {hugeOverlayDiv}

            {topPanel}

            <div className="call bottom-panel">
                <div className={"button call left" + (unreadDiv ? " unread" : "")}
                    onClick={this.toggleMessages.bind(this)}>
                    {unreadDiv}
                    <i
                        className="big-icon conversations simpletip"
                        data-simpletip={this.state.messagesBlockEnabled ? l[22892] : l[22891]}
                        data-simpletipoffset="5"
                    >
                    </i>
                </div>
                <div className={"button call " +
                    (micMuteBtnDisabled ? " disabled" : "")}
                    onClick={function(e) {
                        if (micMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
                            return;
                        }
                        rtcCall.enableAudio(!localMedia.audio);
                    }}>
                    <i
                        className={
                            "big-icon simpletip " +
                            (localMedia.audio ? "microphone" : "crossed-microphone")
                        }
                        data-simpletip={localMedia.audio ? l[16214] : l[16708]}
                        data-simpletipoffset="5"
                    >
                    </i>
                </div>

                <div className={
                    "button call" + (camMuteBtnDisabled ? " disabled" : "")
                    } onClick={function(e) {
                        if (camMuteBtnDisabled || rtcCall.isLocalMuteInProgress()) {
                            return;
                        }
                        var videoMode = callManagerCall.videoMode();
                        if (videoMode === Av.Video) {
                            rtcCall.disableVideo().catch(() => {});
                        }
                        else {
                            rtcCall.enableCamera().catch(() => {});
                        }
                    }}>
                    <i
                        className={
                            "big-icon simpletip " +
                            (callManagerCall.videoMode() === Av.Video ? "videocam" : "crossed-videocam")
                        }
                        data-simpletip={callManagerCall.videoMode() === Av.Video ? l[22894] : l[22893]}
                        data-simpletipoffset="5"
                    >
                    </i>
                </div>

                <div className={
                    "button call" + (screenShareBtnDisabled ? " disabled" : "")
                    } onClick={function(e) {
                        if (screenShareBtnDisabled || rtcCall.isLocalMuteInProgress()) {
                            return;
                        }
                        if (rtcCall.isScreenCaptureEnabled()) {
                            rtcCall.disableVideo().catch(() => {});
                        } else {
                            rtcCall.enableScreenCapture().catch(() => {});
                        }
                    }}>
                    <i
                        className={
                            "big-icon simpletip " +
                            (rtcCall.isScreenCaptureEnabled() ? "screenshare" : "crossed-screenshare")
                        }
                        data-simpletip={
                            rtcCall.isScreenCaptureEnabled() ? l[22890] : l[22889]
                        }
                        data-simpletipoffset="5"
                    >
                    </i>
                </div>
{/*     Put-on-hold button - currently disabled

                <div className={"button call " + ((rtcCall.isRecovery && rtcCall.isOnHold()) ? "disabled" : "")
                } onClick={function(e) {
                    if (rtcCall.isOnHold()) {
                        rtcCall.releaseOnHold();
                    }
                    else {
                        rtcCall.putOnHold();
                    }
                    chatRoom.trackDataChange();
                }
                }>
                    <i className={"big-icon " + (
                        rtcCall.isOnHold() ? "crossed-call-on-hold" : "call-on-hold"
                    )}></i>
                </div>
*/}
                <div className="button call" onClick={function(e) {
                    callManagerCall.endCall();
                }}>
                    <i
                        className="big-icon horizontal-red-handset simpletip"
                        data-simpletip={l[5884]}
                        data-simpletipoffset="5"
                    >
                    </i>
                </div>

                <div className="button call right" onClick={this.fullScreenModeToggle.bind(this)}>
                    <i
                        className="big-icon nwse-resize simpletip"
                        data-simpletip={this.state.fullScreenModeEnabled ? l[22895] : l[17803]}>
                    </i>
                </div>
            </div>
        </div>;
    }
}

export {
    ConversationAVPanel
};
