import React from 'react';
import ReactDOM from 'react-dom';
import {MegaRenderMixin} from './../../stores/mixins.js';
import {Avatar} from './../ui/contacts.jsx';
import utils from './../../ui/utils.jsx';

// eslint-disable-next-line id-length
var DEBUG_PARTICIPANTS_MULTIPLICATOR = 1;


// 7+1 for myself  = 8
// eslint-disable-next-line id-length
var MAX_PARTICIPANTS_FOR_GRID_MODE = 7;

var VIEW_MODES = {
    "GRID": 1,
    "CAROUSEL": 2,
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
    getCurrentStreamId() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
            return;
        }

        var streams = chatRoom.callManagerCall._streams;
        return self.state.selectedStreamSid || Object.keys(streams)[0];
    }
    getViewMode() {
        var chatRoom = this.props.chatRoom;
        var callManagerCall = chatRoom.callManagerCall;
        if (callManagerCall) {
            var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;
            if (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE) {
                return VIEW_MODES.CAROUSEL;
            }
        }
        if (chatRoom.type === "private") {
            return VIEW_MODES.GRID;
        }
        var streamKeys = Object.keys(callManagerCall._streams);
        for (var i = 0; i < streamKeys.length; i++) {
            var sid = streamKeys[i];
            if (callManagerCall.getRemoteMediaOptions(sid.split(":")[2]).screen) {
                return VIEW_MODES.CAROUSEL;
            }
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
    getRemoteSid(sid) {
        var fullSid = sid || this.state.selectedStreamSid;
        if (!fullSid) {
            return false;
        }
        sid = fullSid.split(":")[2];

        if (!sid) {
            return false;
        }
        return sid;
    }
    resizeVideos() {
        var self = this;
        var chatRoom = self.props.chatRoom;

        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isActive()) {
            return;
        }
        if (chatRoom.type === "private") {
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

            var callManagerCall = chatRoom.callManagerCall;
            var mediaOpts;
            if (this.state.selectedStreamSid === "local") {
                mediaOpts = callManagerCall.getMediaOptions();
            }
            else {
                mediaOpts = callManagerCall.getRemoteMediaOptions(self.getRemoteSid());
            }
            var audioIsMuted = mediaOpts.audio;

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
                    if (!audioIsMuted) {
                        $mutedIcon.removeClass('hidden');
                    }
                    else {
                        $mutedIcon.addClass('hidden');
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
        if (!room.callManagerCall || !room.callManagerCall.isActive()) {
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
        $(window).rebind('resize.chatUI_' + room.roomId, function() {
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


        (self.remoteVideoRefs || []).forEach(function(remoteVideo) {
            if (
                remoteVideo &&
                remoteVideo.src === "" &&
                remoteVideo.currentTime === 0 &&
                !remoteVideo.srcObject
            ) {
                var stream = room.callManagerCall._streams[remoteVideo.id.split("remotevideo_")[1]];
                RTC.attachMediaStream(remoteVideo, stream);
                // attachMediaStream would do the .play call
            }
        });


        var localStream = room.callManagerCall.localStream();
        if (
            localStream &&
            self.refs.localViewport &&
            self.refs.localViewport.src === "" &&
            self.refs.localViewport.currentTime === 0 &&
            !self.refs.localViewport.srcObject
        ) {
            RTC.attachMediaStream(self.refs.localViewport, localStream);
            // attachMediaStream would do the .play call
        }

        var bigLocalViewport = $('.bigLocalViewport')[0];
        var smallLocalViewport = $('.smallLocalViewport')[0];

        if (
            smallLocalViewport && bigLocalViewport && !bigLocalViewport.src && !bigLocalViewport.srcObject &&
            localStream &&
            bigLocalViewport &&
            bigLocalViewport.src === "" &&
            bigLocalViewport.currentTime === 0
        ) {
            RTC.attachMediaStream(bigLocalViewport, localStream);
        }

        $(room).rebind('toggleMessages.av', function() {
            self.toggleMessages();
        });

        room.messagesBlockEnabled = self.state.messagesBlockEnabled;

        this.props.chatRoom.callManagerCall.rebind('onAudioLevelChange.ui', function(e, sid, level) {
            var $elm = $(".stream" + sid.replace(/:/g, "_"));

            if ($elm.length === 0) {
                return;
            }

            if (level > 10) {
                $('.avatar-wrapper', $elm).css({
                    'box-shadow': '0px 0px 0px 3px rgba(255, 255, 255, ' + Math.min(0.90, level / 100) + ')'
                });
            }
            else {
                $('.avatar-wrapper', $elm).css({
                    'box-shadow': '0px 0px 0px 0px rgba(255, 255, 255, 0)'
                });
            }
        });


        this.props.chatRoom.rebind('onLocalMuteInProgress.ui', function() {
            self.setState({'muteInProgress': true});
        });
        this.props.chatRoom.rebind('onLocalMuteComplete.ui', function() {
            self.setState({'muteInProgress': false});
        });

        if (self.initialRender === false && ReactDOM.findDOMNode(self)) {
            self.bindInitialEvents();
        }

        self.resizePanes();
        self.resizeVideos();
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
        $(window).off('resize.chatUI_' + room.roomId);
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
        }

        this.setState({
            'messagesBlockEnabled': !this.state.messagesBlockEnabled
        });

        if (this.state.messagesBlockEnabled === false) {
            Soon(function() {
                $(window).trigger('resize');
            });
        }
    }
    fullScreenModeToggle(e) {
        e.preventDefault();
        e.stopPropagation();

        var newVal = !this.state.fullScreenModeEnabled;
        $(document).fullScreen(newVal);

        this.setState({
            'fullScreenModeEnabled': newVal,
            'messagesBlockEnabled': newVal === true ? false : this.state.messagesBlockEnabled
        });
    }
    toggleLocalVideoDisplay(e) {
        e.preventDefault();
        e.stopPropagation();

        var $container = $(ReactDOM.findDOMNode(this));
        var $localMediaDisplay = $('.call.local-video, .call.local-audio', $container);

        $localMediaDisplay
            .addClass('right-aligned')
            .addClass('bottom-aligned')
            .css({
                'width': '',
                'height': '',
                'right': 8,
                'bottom': !this.state.localMediaDisplay === true ? 8 : 8
            });

        this.setState({localMediaDisplay: !this.state.localMediaDisplay});
    }
    render() {
        var chatRoom = this.props.chatRoom;
        this.remoteVideoRefs = this.remoteVideoRefs || [];

        var self = this;

        if (!chatRoom.callManagerCall || !chatRoom.callManagerCall.isStarted()) {
            self.initialRender = false;
            return null;
        }

        var participants = chatRoom.getParticipantsExceptMe();

        var displayNames = [];

        participants.forEach(function(v) {
            displayNames.push(
                htmlentities(M.getNameByHandle(v))
            );
        });


        var callManagerCall = chatRoom.callManagerCall;

        var remoteCamEnabled = null;


        if (callManagerCall.getRemoteMediaOptions().video) {
            remoteCamEnabled = <i className="small-icon blue-videocam" />;
        }


        var localPlayerElement = null;
        var remotePlayerElement = null;
        var activeStreamIdOrPlayer =
            (chatRoom.type === "group" || chatRoom.type === "public") && self.getViewMode() === VIEW_MODES.CAROUSEL ?
                self.getCurrentStreamId() :
                false
        ;

        var visiblePanelClass = "";
        var localPlayerStream = callManagerCall.localStream();

        if (this.visiblePanel === true) {
            visiblePanelClass += " visible-panel";
        }



        remotePlayerElement = [];

        var realStreams = Object.keys(callManagerCall._streams);
        var streams = [];
        if (!DEBUG_PARTICIPANTS_MULTIPLICATOR) {
            streams = realStreams;
        }
        else {
            // UI debug mode.
            var initialCount = realStreams.length;
            if (initialCount > 0) {
                for (var i = 0; i < initialCount * DEBUG_PARTICIPANTS_MULTIPLICATOR; i++) {
                    streams.push(realStreams[(i || 0) % initialCount]);
                }
            }
        }

        streams.forEach(function(streamId, k) {
            var stream = callManagerCall._streams[streamId];
            var userId = streamId.split(":")[0];
            var sessionId = streamId.split(":")[2];
            var remotePlayerStream = stream;
            var mediaOpts = callManagerCall.getRemoteMediaOptions(sessionId);
            var player;

            if (
                !remotePlayerStream ||

                    mediaOpts.video === false && mediaOpts.screen === false

            ) {
                // TODO: When rtc is ready
                var contact = M.u[userId];
                player = <div
                    className={"call user-audio is-avatar " + (activeStreamIdOrPlayer === streamId ? "active" : "") +
                    " stream" + streamId.replace(/:/g, "_")}
                    key={streamId + "_" + k}
                    onClick={(e) => {
                        self.onPlayerClick(streamId);
                    }}>
                    {
                        callManagerCall.peerQuality[streamId] === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="center-avatar-wrapper">
                        {
                            callManagerCall.getRemoteMediaOptions(sessionId).audio === false ?
                                <div className="small-icon icon-audio-muted"></div> :
                                <div className="small-icon icon-audio-muted hidden"></div>

                        }
                        <Avatar contact={contact}  className="avatar-wrapper" simpletip={contact.name}
                            chatRoom={self.props.chatRoom}
                            simpletipWrapper="#call-block"
                            simpletipOffset={8}
                            simpletipPosition="top"
                            hideVerifiedBadge={true} />
                    </div>
                </div>;

                if (activeStreamIdOrPlayer === streamId) {
                    activeStreamIdOrPlayer = player;
                }
                remotePlayerElement.push(player);
            }
            else {
                player = <div
                    className={"call user-video is-video " + (activeStreamIdOrPlayer === streamId ? "active" : "") +
                    " stream" + streamId.replace(/:/g, "_") + (mediaOpts.screen ?  " is-screen" : "")}
                    key={streamId + "_" + k}
                    onClick={(e) => {
                        self.onPlayerClick(streamId);
                    }}>
                    {
                        callManagerCall.peerQuality[streamId] === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    {
                        callManagerCall.getRemoteMediaOptions(sessionId).audio === false ?
                            <div className="small-icon icon-audio-muted"></div> :
                            <div className="small-icon icon-audio-muted hidden"></div>
                    }
                    <video
                        autoPlay={true}
                        className="rmtViewport rmtVideo"
                        id={"remotevideo_" + streamId}
                        ref={function(ref) {
                            if (ref && self.remoteVideoRefs.indexOf(ref) === -1) {
                                self.remoteVideoRefs.push(ref);
                            }
                        }}
                    />
                </div>;

                if (activeStreamIdOrPlayer === streamId) {
                    activeStreamIdOrPlayer = player;
                }
                remotePlayerElement.push(player);
            }
        });

        if (this.getViewMode() === VIEW_MODES.GRID) {
            if (!localPlayerStream ||
                callManagerCall.getMediaOptions().video === false && callManagerCall.getMediaOptions().screen === false
            ) {
                localPlayerElement = <div className={
                    "call local-audio right-aligned bottom-aligned is-avatar" +
                    (this.state.localMediaDisplay ? "" : " minimized ") +
                    visiblePanelClass
                }>
                    {
                        chatRoom.megaChat.networkQuality === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="default-white-button tiny-button call"
                        onClick={this.toggleLocalVideoDisplay.bind(this)}>
                        <i className="tiny-icon grey-minus-icon"/>
                    </div>
                    <div className={"center-avatar-wrapper " + (this.state.localMediaDisplay ? "" : "hidden")}>
                        {
                            callManagerCall.getMediaOptions().audio === false ?
                                <div className="small-icon icon-audio-muted"></div> :
                                <div className="small-icon icon-audio-muted hidden"></div>
                        }
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
                localPlayerElement = <div
                    className={
                        "call local-video right-aligned is-video bottom-aligned" +
                        (this.state.localMediaDisplay ? "" : " minimized ") +
                        visiblePanelClass +
                        (activeStreamIdOrPlayer === "local" ? " active " : "") +
                        (callManagerCall.getMediaOptions().screen ? " is-screen" : "")
                    }>
                    {
                        chatRoom.megaChat.networkQuality === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="default-white-button tiny-button call"
                        onClick={this.toggleLocalVideoDisplay.bind(this)}>
                        <i className="tiny-icon grey-minus-icon"/>
                    </div>
                    {
                        callManagerCall.getMediaOptions().audio === false ?
                            <div className="small-icon icon-audio-muted"></div> :
                            <div className="small-icon icon-audio-muted hidden"></div>
                    }
                    <video
                        ref="localViewport"
                        className="localViewport"
                        defaultmuted={"true"}
                        muted={true}
                        volume={0}
                        id={"localvideo_" + callManagerCall.id}
                        style={{display: !this.state.localMediaDisplay ? "none" : ""}}

                    />
                </div>;
            }
        }
        else {
            // carousel
            var localPlayer;
            if (!localPlayerStream ||
                callManagerCall.getMediaOptions().video === false && callManagerCall.getMediaOptions().screen === false
            ) {
                localPlayer =  <div className={
                    "call user-audio local-carousel is-avatar" + (activeStreamIdOrPlayer === "local" ? " active " : "")
                } key="local"
                onClick={() => {
                    self.onPlayerClick("local");
                }}>
                    {
                        chatRoom.megaChat.networkQuality === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    <div className="center-avatar-wrapper">
                        {
                            callManagerCall.getMediaOptions().audio === false ?
                                <div className="small-icon icon-audio-muted"></div> :
                                <div className="small-icon icon-audio-muted hidden"></div>
                        }
                        <Avatar
                            contact={M.u[u_handle]} className="call avatar-wrapper"
                            chatRoom={this.props.chatRoom}
                            hideVerifiedBadge={true}
                        />
                    </div>
                </div>;

                remotePlayerElement.push(localPlayer);


                if (activeStreamIdOrPlayer === "local") {
                    activeStreamIdOrPlayer = localPlayer;
                }
            }
            else {
                localPlayer = <div
                    className={
                        "call user-video local-carousel is-video" + (
                            activeStreamIdOrPlayer === "local" ? " active " : ""
                        ) + (
                            callManagerCall.getMediaOptions().screen ? " is-screen" : ""
                        )
                    }
                    key="local-video"
                    onClick={(e) => {
                        self.onPlayerClick("local");
                    }}>
                    {
                        chatRoom.megaChat.networkQuality === 0 ?
                            <div className="icon-connection-issues"></div> : null
                    }
                    {callManagerCall.getMediaOptions().audio === false ?
                        <div className="small-icon icon-audio-muted"></div> :
                        <div className="small-icon icon-audio-muted hidden"></div>

                    }
                    <video
                        ref="localViewport"
                        className="localViewport smallLocalViewport"
                        defaultmuted={"true"}
                        muted={true}
                        volume={0}
                        id={"localvideo_" + callManagerCall.id}
                    />
                </div>;

                remotePlayerElement.push(localPlayer);


                if (activeStreamIdOrPlayer === "local") {
                    activeStreamIdOrPlayer = <div
                        className={
                            "call user-video is-video local-carousel local-carousel-big " + (
                                callManagerCall.getMediaOptions().screen ? " is-screen" : ""
                            )
                        }
                        key="local-video2">
                        {
                            chatRoom.megaChat.networkQuality === 0 ?
                                <div className="icon-connection-issues"></div> : null
                        }
                        {
                            callManagerCall.getMediaOptions().audio === false ?
                                <div className="small-icon icon-audio-muted"></div> :
                                <div className="small-icon icon-audio-muted hidden"></div>
                        }
                        <video
                            className="localViewport bigLocalViewport"
                            defaultmuted={"true"}
                            muted={true}
                            volume={0}
                            id={"localvideo_big_" + callManagerCall.id}
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
        additionalClass = this.state.fullScreenModeEnabled === true ? " full-sized-block" : "";
        if (additionalClass.length === 0) {
            additionalClass = this.state.messagesBlockEnabled === true ? " small-block" : "";
        }

        var participantsCount = Object.keys(callManagerCall._streams).length * DEBUG_PARTICIPANTS_MULTIPLICATOR;

        additionalClass += " participants-count-" +
            participantsCount
        ;

        var header = null;

        var videoSessionCount = 0;
        if (chatRoom.callManagerCall && chatRoom.callManagerCall.getCurrentVideoSlotsUsed) {
            videoSessionCount = chatRoom.callManagerCall.getCurrentVideoSlotsUsed();
        }



        if (chatRoom.type === "group" || chatRoom.type === "public") {
            var haveScreenShare = false;
            var streamKeys = Object.keys(callManagerCall._streams);
            for (var x = 0; x < streamKeys.length; x++) {
                var sid = streamKeys[x];
                if (callManagerCall.getRemoteMediaOptions(sid.split(":")[2]).screen) {
                    haveScreenShare = true;
                    break;
                }
            }

            header =
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
                        (participantsCount > MAX_PARTICIPANTS_FOR_GRID_MODE || haveScreenShare ? " disabled" : "")
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
                        videoSessionCount >= RtcModule.kMaxCallVideoSenders ? " limit-reached" : ""
                    )}>{videoSessionCount} / {RtcModule.kMaxCallVideoSenders}</div>

                    <div
                        className={
                            "call-video-icon" + (
                                chatRoom.callManagerCall.hasVideoSlotLimitReached() ? " call-video-icon-warn" : ""
                            )}>
                    </div>
                    <div className="call-header-duration"
                        data-room-id={chatRoom.chatId}>
                        {secondsToTimeShort(chatRoom._currentCallCounter)}
                    </div>
                </div>
            ;
        }

        var notifBar = null;

        if (chatRoom.type === "group" || chatRoom.type === "public") {
            var notif = chatRoom.callManagerCall.callNotificationsEngine.getCurrentNotification();

            if (!chatRoom.callManagerCall.callNotificationsEngine._bound) {
                chatRoom.callManagerCall.callNotificationsEngine.rebind('onChange.cavp', function() {
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
                chatRoom.callManagerCall.callNotificationsEngine._bound = true;
            }

            if (notif) {
                var title = notif.getTitle();
                notifBar = <div className={"in-call-notif " + notif.getClassName()}>
                    {title ? title : null}
                </div>;
            }
        }
        var networkQualityBar = null;

        if (chatRoom.megaChat.networkQuality <= 1) {
            var networkQualityMessage = "Slow connection.";

            networkQualityBar = <div className={"in-call-notif yellow" + (notifBar ? " after-green-notif" : "") }>
                {networkQualityMessage}
            </div>;
        }

        additionalClass += self.getViewMode() === VIEW_MODES.GRID ? " grid" : " carousel";

        var players = null;
        if (self.getViewMode() === VIEW_MODES.GRID) {
            players = <div className="participantsWrapper" key="container">
                <div className="participantsContainer" key="partsContainer">{remotePlayerElement}</div>
                {localPlayerElement}
            </div>;
        }
        else {

            players = <div key="container">
                <div className="activeStream" key="activeStream">
                    {activeStreamIdOrPlayer}
                </div>
                <div className="participantsContainer" key="partsContainer">
                    {remotePlayerElement}
                    {localPlayerElement}
                </div>
            </div>;
        }

        var topPanel = null;

        if (chatRoom.type !== "group") {
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

        var reconnectingDiv = null;
        if (chatRoom.callReconnecting === true) {
            reconnectingDiv = <div className="callReconnecting">
                <i className="huge-icon crossed-phone"></i>
            </div>;
        }

        return <div className={"call-block" + additionalClass} id="call-block">
            <div className={"av-resize-handler ui-resizable-handle ui-resizable-s " + (
                this.state.messagesBlockEnabled === true && this.state.fullScreenModeEnabled === false ?
                    "" : "hidden"
            )}></div>
            {header}
            {notifBar}
            {networkQualityBar}
            {players}
            {reconnectingDiv}

            {topPanel}


            <div className="call bottom-panel">
                <div className={"button call left" + (unreadDiv ? " unread" : "")}
                    onClick={this.toggleMessages.bind(this)}>
                    {unreadDiv}
                    <i className="big-icon conversations"></i>
                </div>
                <div className={"button call " + (this.state.muteInProgress ? " disabled" : "")} onClick={function(e) {
                    if (self.state.muteInProgress || $(this).is(".disabled")) {
                        return;
                    }
                    if (callManagerCall.getMediaOptions().audio === true) {
                        callManagerCall.muteAudio();
                    }
                    else {
                        callManagerCall.unmuteAudio();
                    }
                }}>
                    <i className={
                        "big-icon " + (callManagerCall.getMediaOptions().audio ? " microphone" : " crossed-microphone")
                    }></i>
                </div>
                <div className={
                    "button call" + (callManagerCall.hasVideoSlotLimitReached() === true &&
                    callManagerCall.getMediaOptions().video === false ? " disabled" : "") +
                        (this.state.muteInProgress ? " disabled" : "")
                } onClick={function(e) {
                    if (
                        self.state.muteInProgress ||
                        $(this).is(".disabled")
                    ) {
                        return;
                    }
                    var videoMode = callManagerCall.videoMode();
                    if (videoMode === Av.Video) {
                        callManagerCall.muteVideo();
                    }
                    else {
                        callManagerCall.unmuteVideo();
                    }
                }}>
                    <i className={
                        "big-icon " +
                        (callManagerCall.videoMode() === Av.Video ? " videocam" : " crossed-videocam")
                    }></i>
                </div>

                <div className={
                    "button call" + (RTC.supportsScreenCapture && chatRoom.callManagerCall
                        && callManagerCall.rtcCall && !this.state.muteInProgress ? "" : " disabled")
                } onClick={function(e) {
                    if (chatRoom.callManagerCall) {
                        if (callManagerCall.isScreenCaptureEnabled()) {
                            callManagerCall.stopScreenCapture();
                        }
                        else {
                            callManagerCall.startScreenCapture();
                        }
                    }
                }}>
                    <i className={"big-icon " + (
                        callManagerCall.isScreenCaptureEnabled() ?
                            "screenshare" : "crossed-screenshare"
                    )}></i>
                </div>

                <div className="button call" onClick={function(e) {
                    if (chatRoom.callManagerCall) {
                        chatRoom.callManagerCall.endCall();
                    }
                }}>
                    <i className="big-icon horizontal-red-handset"></i>
                </div>


                <div className="button call right" onClick={this.fullScreenModeToggle.bind(this)}>
                    <i className="big-icon nwse-resize"></i>
                </div>
            </div>
        </div>;
    }
}

export {
    ConversationAVPanel
};
