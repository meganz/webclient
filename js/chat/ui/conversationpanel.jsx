// libs
var React = require("react");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationsUI = require('./../ui/conversations.jsx');


/**
 * The most dummies lazy load ever... but no need for something more complicated, until we get the new __(...)
 */
var getMessageString;
(function() {
    var MESSAGE_STRINGS;
    getMessageString = function(type) {
        if (!MESSAGE_STRINGS) {
            MESSAGE_STRINGS = {
                'outgoing-call': l[5891],
                'incoming-call': "Incoming call from [X]",
                'call-timeout': l[5890],
                'call-starting': l[7206],
                'call-feedback': "To help us improve our service, it would be great if you want to rate how was your call with [X]? ",
                'call-initialising': l[7207],
                'call-ended': [l[5889], l[7208]],
                'call-failed-media': l[7204],
                'call-failed': [l[7209], l[7208]],
                'call-handled-elsewhere': l[5895],
                'call-missed': l[7210],
                'call-rejected': l[5892],
                'call-canceled': l[5894],
                'call-started': l[5888],
            };
        }
        return MESSAGE_STRINGS[type];
    }
})();

var ConversationMessage = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    onAfterRenderWasTriggered: false,
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;
        megaChat.chats.addChangeListener(function() {
            if (self.isMounted()) {
                self.forceUpdate();
            }
        });
    },
    componentDidUpdate: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        if (!self.onAfterRenderWasTriggered) {
            chatRoom.trigger("onAfterRenderMessage", self.props.message);
            self.onAfterRenderWasTriggered = true;
        }
    },
    render: function () {
        var self = this;
        var cssClasses = "fm-chat-messages-block fm-chat-message-container";

        var message = this.props.message;
        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        var buttons = [];
        var contact;
        var timestamp;
        var textMessage;
        var authorTextDiv="";
        var messageLabel="";


        if (message.authorContact) {
            contact = message.authorContact;
        }
        else if (message.userId) {
            contact = M.u[message.userId];
        }
        else if (message.getFromJid) {
            contact = megaChat.getContactFromJid(message.getFromJid());
        }
        else {
            console.error("No idea how to render this: ", this.props);
        }

        if (message.getDelay) {
            timestamp = message.getDelay()
        }
        else if (message.delay) {
            timestamp = message.delay;
        }
        else {
            timestamp = unixtime();
        }

        timestamp = unixtimeToTimeString(timestamp);

        // if this is a text msg.
        if (
            (message instanceof KarereEventObjects.IncomingMessage) ||
            (message instanceof KarereEventObjects.OutgoingMessage) ||
            (message instanceof KarereEventObjects.IncomingPrivateMessage) ||
            (message instanceof Message)

        ) {
            // Convert ot HTML and pass it to plugins to do their magic on styling the message if needed.
            if (message.messageHtml) {
                message.messageHtml = message.messageHtml;
            } else {
                message.messageHtml = htmlentities(
                    message.getContents ? message.getContents() : message.textContents
                ).replace(/\n/gi, "<br/>");
            }

            var event = new $.Event("onBeforeRenderMessage");
            megaChat.trigger(event, {
                message: message,
                room: chatRoom
            });

            if (event.isPropagationStopped()) {
                self.logger.warn("Event propagation stopped receiving (rendering) of message: ", message);
                return false;
            }
            textMessage = message.messageHtml;

            authorTextDiv = <span className="chat-username">{contact.m}</span>;
        }
        // if this is an inline dialog
        else if (
            message.type
        ) {
            cssClasses += " inline-dialog chat-notification " + message.type;
            textMessage = getMessageString(message.type);
            if (!textMessage) {
                console.error("Message with type: ", message.type, "does not have a text string defined. Message: ", message);
                debugger;
                throw new Error("boom");
            }
            // if is an array.
            if (textMessage.splice) {
                var tmpMsg = textMessage[0].replace("[X]", generateContactName(contact.u));

                if (message.currentCallCounter) {
                    tmpMsg += " " + textMessage[1].replace("[X]", secToDuration(message.currentCallCounter)) + " "
                }
                textMessage = tmpMsg;
            } else {
                textMessage = textMessage.replace("[X]", generateContactName(contact.u));
            }

            textMessage = htmlentities(textMessage);

            message.textContents = textMessage;

            // mapping css icons to msg types
            if (message.type === "call-rejected") {
                message.cssClass = "rejected-call";
            }
            else if (message.type === "call-missed") {
                message.cssClass = "missed-call"
            }
            else if (message.type === "call-handled-elsewhere") {
                message.cssClass = "call-from-different-device";
            }
            else if (message.type === "call-failed") {
                message.cssClass = "rejected-call";
            }
            else if (message.type === "call-failed-media") {
                message.cssClass = "call-canceled";
            }
            else if (message.type === "call-canceled") {
                message.cssClass = "call-ended";
            } else if (message.type === "incoming-call") {
                message.cssClass = "incoming-call";
            } else if (message.type === "outgoing-call") {
                message.cssClass = "outgoing-call";
            } else {
                message.cssClass = message.type;
            }
            cssClasses += " " + message.cssClass;
        }


        if (message.cssClasses) {
            cssClasses += " " + message.cssClasses.join(" ");
        }

        if (message.buttons) {
            Object.keys(message.buttons).forEach(function(k) {
                var button = message.buttons[k];
                var classes = "fm-chat-file-button " + button.type + "-button fm-chat-inline-dialog-button-" + k;
                buttons.push(
                    <div key={k} className={classes} onClick={(() => { button.callback(); })}>
                        <span>{button.text}</span>
                    </div>
                );
            });
        }

        if (
            message instanceof Message ||
            (typeof(message.userId) !== 'undefined' && message.userId === u_handle)
        ) {
            var labelClass = "label text-message";
            var labelText;

            if (
                message.getState() === Message.STATE.NULL
            ) {
                labelClass += " error";
                labelText = "error"
            }
            else if (
                message.getState() === Message.STATE.NOT_SENT
            ) {
                labelClass += " not-sent";
                labelText = "not sent"
            }
            else if (message.getState() === Message.STATE.SENT) {
                labelClass += " sent";
                labelText = "sent";
            }
            else if (message.getState() === Message.STATE.DELIVERED) {
                labelClass += " delivered";
                labelText = "delivered";
            }
            else if (message.getState() === Message.STATE.NOT_SEEN) {
                labelClass += " unread";
                labelText = "unread";
            }
            else if (message.getState() === Message.STATE.SEEN) {
                labelClass += " seen";
                labelText = "seen";
            }
            else if (message.getState() === Message.STATE.DELETED) {
                labelClass += " deleted";
                labelText = "deleted";
            } else {
                labelClass += " not-sent";
                labelText = "not sent"
            }

            messageLabel = <span className={labelClass}>{labelText}</span>
        }
        return (
            <div className={cssClasses} data-id={"id" + message.messageId}>
                <div className="fm-chat-messages-pad">
                    <div className="nw-chat-notification-icon"></div>
                    <ContactsUI.Avatar contact={contact} />

                    <div className="fm-chat-message">
                        <div className="chat-message-date">{timestamp}</div>
                        <span>{authorTextDiv}</span>
                        <span>{messageLabel}</span>
                        <div className="chat-message-txt">
                            <span dangerouslySetInnerHTML={{__html:textMessage}}></span>
                            {buttons}
                        </div>
                        <div className="clear"></div>
                    </div>
                </div>
            </div>
        );
    }
});

var ConversationPanel = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],

    getInitialState: function() {
        return {
            startCallPopupIsActive: false,
            localVideoIsMinimized: false,
            isFullscreenModeEnabled: false,
            mouseOverDuringCall: false,
            typedMessage: "",
            emoticonsPopupIsActive: false,
            currentlyTyping: []
        };
    },

    refreshUI: function(scrollToBottom) {
        var self = this;
        var room = self.props.chatRoom;

        if (room._leaving) {
            return;
        }

        self.$header.attr("data-room-jid", room.roomJid.split("@")[0]);

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        var $jsp = self.$messages.data("jsp");
        if ($jsp) {
            var perc = $jsp.getPercentScrolledY();


            if (scrollToBottom) {
                self.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToBottom();
                });
            } else {
                self.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToPercentY($jsp.getPercentScrolledY(perc));
                });
            }
            $jsp.reinitialise();
        }

        room.renderContactTree();

        room.megaChat.refreshConversations();

        room.trigger('RefreshUI');
    },
    onEmoticonsButtonClick: function(e) {
        var self = this;
        var $target = $(e.target);

        if ($target.parent().is(".disabled")) {
            return;
        }

        var hidePopup = function() {
            if (self.isMounted()) {
                self.setState({
                    emoticonsPopupIsActive: false
                });
                $(document).unbind('mouseup.emoticonsPopup');
            }
        };


        if (self.state.emoticonsPopupIsActive === false) {
            self.setState({
                emoticonsPopupIsActive: true
            });
            $(document).rebind('mouseup.emoticonsPopup', function (e) {
                if (!$(e.target).is($target)) {
                    hidePopup();
                }
            });
        } else {
            hidePopup();
        }

    },
    onEmoticonClicked: function(e) {
        var self = this;
        var $target = $(e.target);
        var emoticonText = $target.data('text');

        self.setState({
            typedMessage: self.state.typedMessage + emoticonText
        });

        setTimeout(function()
        {
            moveCursortoToEnd($('.message-textarea:visible')[0]);
        }, 100);
    },
    onStartCallClicked: function(e) {
        var self = this;

        if ($(e.target).parent().is(".disabled")) {
            return;
        }

        var hidePopup = function() {
            if (self.isMounted()) {
                self.setState({
                    startCallPopupIsActive: false
                });
                $(document).unbind('mouseup.startCallPopup');
            }
        };

        if (self.props.contact.presence) {
            if (self.state.startCallPopupIsActive === false) {
                self.setState({
                    startCallPopupIsActive: true
                });
                $(document).rebind('mouseup.startCallPopup', function (e) {
                    hidePopup();
                });
            } else {
                hidePopup();
            }
        }
    },
    onEndCallClicked: function(e) {
        var room = this.props.chatRoom;
        if (room.callSession) {
            room.callSession.endCall('hangup');
        }
        // this must be triggered when a call had finished, e.g. from an event from the currently
        // active callSession
        this.setState({
            localVideoIsMinimized: false,
            isFullscreenModeEnabled: false
        });
    },
    onVideoToggleClicked: function(e) {
        var self = this;
        var room = this.props.chatRoom;
        if (room.callSession) {
            if (room.callSession.getMediaOptions().video) {
                room.callSession.muteVideo();
            } else {
                room.callSession.unmuteVideo();
            }
        }
    },
    onAudioToggleClicked: function(e) {
        var self = this;
        var room = this.props.chatRoom;
        if (room.callSession) {
            if (room.callSession.getMediaOptions().audio) {
                room.callSession.muteAudio();
            } else {
                room.callSession.unmuteAudio();
            }
        }
    },
    onLocalVideoResizerClicked: function(e) {
        var self = this;
        var $target = $(e.target);

        if (!$target.is('.active')) {
            $target.parent().addClass('minimized');
            self.setState({localVideoIsMinimized: true});
            $target.parent().animate({
                'min-height': '24px',
                width: 24,
                height: 24
            }, 200, function() {
                $target.addClass('active');
            });
        } else {
            var w = 245;
            if ($target.parent().attr('class').indexOf('current-user-audio-container') >= 1) {
                w = 184;
            }

            self.setState({localVideoIsMinimized: false});

            $target.parent().animate({
                width: w,
                height:184
            }, 200, function() {
                $target.removeClass('active');
                $target.parent().css('min-height', '184px');
            });
        }
    },
    onToggleFullScreenClicked: function(e) {
        var self = this;
        var room = this.props.chatRoom;
        var $target = e && e.target ? $(e.target) : null;

        if (this.state.isFullscreenModeEnabled) {
            this.setState({isFullscreenModeEnabled: false});
            $(document).fullScreen(false);
        } else {
            this.setState({isFullscreenModeEnabled: true});
            $(document).fullScreen(true);
        }
    },
    onMouseMoveDuringCall: function(e) {
        var self = this;

        if (self.state.mouseOverDuringCall === false) {
            self.setState({'mouseOverDuringCall': true});
        }
        if (self._mouseMoveDelay) {
            clearTimeout(self._mouseMoveDelay);
        }
        self._mouseMoveDelay = setTimeout(function() {
            self.setState({'mouseOverDuringCall': false});
        }, 2000);
    },
    typing: function() {
        var self = this;
        var room = this.props.chatRoom;

        if (!self.typingTimeout) {
            if (room && room.state === ChatRoom.STATE.READY && !self.iAmTyping) {
                self.iAmTyping = true;
                room.megaChat.karere.sendIsComposing(room.roomJid);
            }
        } else if (self.typingTimeout) {
            clearTimeout(self.typingTimeout);
        }

        self.typingTimeout = setTimeout(function() {
            self.stoppedTyping();
        }, 2000);
    },
    stoppedTyping: function() {
        var self = this;
        var room = this.props.chatRoom;

        if (self.typingTimeout) {
            clearTimeout(self.typingTimeout);
            self.typingTimeout = null;
        }

        if (room && room.state === ChatRoom.STATE.READY && self.iAmTyping === true) {
            room.megaChat.karere.sendComposingPaused(room.roomJid);
            self.iAmTyping = false;
        }
    },
    onTypeAreaKeyDown: function(e) {
        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = element.value;

        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            if ($.trim(val).length > 0) {
                self.props.chatRoom.sendMessage(val);
                self.setState({typedMessage: ""});
                self.stoppedTyping();
                e.preventDefault();
                return;
            } else {
                self.stoppedTyping();
                e.preventDefault();
            }
        } else if (key === 13) {
            if ($.trim(val).length === 0) {
                self.stoppedTyping();
                e.preventDefault();
            }
        }

        this.setState({typedMessage: e.target.value});
    },
    onTypeAreaBlur: function(e) {
        var self = this;

        self.stoppedTyping();
    },
    onTypeAreaChange: function(e) {
        var self = this;

        self.setState({typedMessage: e.target.value});

        if ($.trim(e.target.value).length) {
            self.typing();
        }
    },
    onMouseMove: function(e) {
        var self = this;
        var chatRoom = self.props.chatRoom;
        if (self.isMounted()) {
            chatRoom.trigger("onChatIsFocused");
        }
    },
    componentDidMount: function() {
        var self = this;
        window.addEventListener('resize', self.handleWindowResize);

        var $container = $(self.getDOMNode());

        self.$header = $('.fm-right-header[data-room-jid="' + self.props.chatRoom.roomJid.split("@")[0] + '"]', $container);
        self.$messages = $('.fm-chat-message-scroll[data-roomjid="' + self.props.chatRoom.roomJid + '"]', $container);

        var droppableConfig = {
            tolerance: 'pointer',
            drop: function(e, ui)
            {
                $.doDD(e,ui,'drop',1);
            },
            over: function (e, ui)
            {
                $.doDD(e,ui,'over',1);
            },
            out: function (e, ui)
            {
                var c1 = $(e.srcElement).attr('class'),c2 = $(e.target).attr('class');
                if (c2 && c2.indexOf('fm-menu-item') > -1 && c1 && (c1.indexOf('cloud') > -1 || c1.indexOf('cloud') > -1)) return false;
                $.doDD(e,ui,'out',1);
            }
        };

        self.$messages.droppable(droppableConfig);
        self.$header.droppable(droppableConfig);

        self.lastScrollPosition = null;
        self.lastScrolledToBottom = true;
        self.lastScrollHeight = 0;
        self.lastUpdatedScrollHeight = 0;

        self.$messages.jScrollPane({
            enableKeyboardNavigation:false,
            showArrows:true,
            arrowSize:5,
            animateDuration: 70,
            maintainPosition: false
        });

        self.$messages.rebind('jsp-user-scroll-y.conversationsPanel', function(e, scrollPositionY, isAtTop, isAtBottom) {
            var $jsp = self.$messages.data("jsp");

            if (self.lastScrollPosition === scrollPositionY || self.scrolledToBottom !== 1) {
                return;
            }

            if (scrollPositionY < 350 && !isAtBottom && self.$messages.is(":visible")) {

                if (
                    self.lastUpdatedScrollHeight !== $jsp.getContentHeight() &&
                    !self.props.chatRoom.messagesBuff.messagesHistoryIsLoading() &&
                    self.props.chatRoom.messagesBuff.haveMoreHistory()
                ) {
                    self.props.chatRoom.messagesBuff.retrieveChatHistory();
                    self.lastUpdatedScrollHeight = $jsp.getContentHeight();
                }
            }

            if (isAtBottom) {
                self.lastScrolledToBottom = true;
            }
            else {
                self.lastScrolledToBottom = false;
            }

            self.lastScrollHeight = $jsp.getContentHeight();
            self.lastScrollPosition = scrollPositionY;
        });

        self.$messages.rebind('jsp-initialised.conversationsPanel', function(e) {
            var $jsp = self.$messages.data("jsp");

            if (self.lastScrolledToBottom === true) {
                $jsp.scrollToBottom();
            } else {
                var prevPosY = (
                        $jsp.getContentHeight() - self.lastScrollHeight
                    ) + self.lastScrollPosition;
                console.error("onMessagesHistoryDone scroll prevposY", prevPosY);

                $jsp.scrollToY(
                    prevPosY
                );
            }
        });

        var room = self.props.chatRoom;

        // collapse on ESC pressed (exited fullscreen)
        $(document)
            .unbind("fullscreenchange.megaChat_" + room.roomJid)
            .bind("fullscreenchange.megaChat_" + room.roomJid, function() {
                if (!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({isFullscreenModeEnabled: false});
                }
            });
        self.handleWindowResize();
    },
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = self.props.chatRoom.megaChat;
        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid, function(e, eventObject) {
            if (!self.isMounted()) {
                return;
            }
            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
                return;
            }

            var room = megaChat.chats[eventObject.getRoomJid()];
            if (room.roomJid == chatRoom.roomJid) {
                var currentlyTyping = self.state.currentlyTyping;
                currentlyTyping.push(
                    megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u
                );
                currentlyTyping = array_unique(currentlyTyping);
                self.setState({
                    currentlyTyping: currentlyTyping
                });
            }
        });

        megaChat.karere.rebind("onPausedMessage." + chatRoom.roomJid, function(e, eventObject) {
            var room = megaChat.chats[eventObject.getRoomJid()];

            if (!self.isMounted()) {
                return;
            }
            if (Karere.getNormalizedFullJid(eventObject.getFromJid()) === megaChat.karere.getJid()) {
                return;
            }

            if (room.roomJid === chatRoom.roomJid) {
                var currentlyTyping = self.state.currentlyTyping;
                var u_h = megaChat.getContactFromJid(Karere.getNormalizedBareJid(eventObject.getFromJid())).u;

                if (currentlyTyping.indexOf(u_h) > -1) {
                    removeValue(currentlyTyping, u_h);
                    self.setState({
                        currentlyTyping: currentlyTyping
                    });
                    self.forceUpdate();
                }
            }
        });
    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        window.removeEventListener('resize', self.handleWindowResize);
        $(document).unbind("fullscreenchange.megaChat_" + chatRoom.roomJid);

        megaChat.karere.bind("onComposingMessage." + chatRoom.roomJid);
        megaChat.karere.unbind("onPausedMessage." + chatRoom.roomJid);
    },
    componentDidUpdate: function() {
        var self = this;
        var room = this.props.chatRoom;
        var callIsActive = room.callSession && room.callSession.isActive();

        if (callIsActive && room.isCurrentlyActive) {
            $('.fm-chat-block').addClass('video-call');

            if (self.state.isFullscreenModeEnabled) {
                $('.fm-chat-block').addClass('fullscreen');

            } else {
                $('.fm-chat-block').removeClass('fullscreen');
            }
            var $videoElem = $("video#remotevideo_" + room.callSession.sid);
            if ($videoElem.length > 0) {
                $videoElem[0].play();
            }
            var $videoElemLocal = $("video#localvideo_" + room.callSession.sid);
            if ($videoElemLocal.length > 0) {
                $videoElemLocal[0].play();
            }

            var $avscreen = $('.my-av-screen', self.$header);
            if (!$avscreen.data('isDraggable')) {
                $avscreen.draggable({
                    'containment': $avscreen.parents('.chat-call-block'),
                    'scroll': false
                });
                $avscreen.data('isDraggable', true);
            }

        } else {
            // only rmeove the video-call class IF the updated room is the one which was updated
            if (megaChat.currentlyOpenedChat === room.roomJid) {
                $('.fm-chat-block').removeClass('video-call');
                $('.fm-chat-block').removeClass('fullscreen');
            }
        }
        // <video/> display change to trigger re-render hack.
        $('.rmtVideo:visible').css('display', '');

        room.megaChat.updateSectionUnreadCount();

        self.handleWindowResize();
    },
    handleWindowResize: function(e, scrollToBottom) {
        var $container = $(this.getDOMNode());
        var self = this;

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        // typeArea resizing
        var $conversationPanelContainer = self.$messages.parent();
        var $textarea = $('.message-textarea', $conversationPanelContainer);
        var textareaHeight =  $textarea.outerHeight();
        var $hiddenDiv = $('.hiddendiv', $conversationPanelContainer);
        var $pane = $('.fm-chat-input-scroll', $conversationPanelContainer);
        var $jsp;

        if (textareaHeight != $hiddenDiv.outerHeight()) {
            $textarea.css('height', $hiddenDiv.outerHeight());

            if ($('.fm-chat-input-block', $conversationPanelContainer).outerHeight() >= 200) {
                $pane.jScrollPane({
                    enableKeyboardNavigation:false,
                    showArrows:true,
                    arrowSize:5
                });
                $jsp = $pane.data('jsp');
                $textarea.blur();
                $textarea.focus();
                $jsp.scrollByY(0);
            }
            else {
                $jsp = $pane.data('jsp');
                if ($jsp) {
                    $jsp.destroy();
                    $textarea.blur();
                    $textarea.focus();
                }
            }
        }

        // Important. Please insure we have correct height detection for Chat messages block. We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
        var scrollBlockHeight = (
            $('.fm-chat-block').outerHeight() -
            $('.fm-chat-line-block', $conversationPanelContainer).outerHeight() -
            self.$header.outerHeight() + 2
        );
        if (scrollBlockHeight != self.$messages.outerHeight()) {
            self.$messages.css('height', scrollBlockHeight);
            self.refreshUI(true);
        } else {
            self.refreshUI(scrollToBottom);
        }

        // try to do a .scrollToBottom only once, to trigger the stickToBottom func. of JSP
        if (!self.scrolledToBottom) {
            var $messagesPad = $('.fm-chat-message-pad', self.$messages);
            if (
                $messagesPad.outerHeight() - 1 > $messagesPad.parent().parent().parent().outerHeight()
            ) {
                self.scrolledToBottom = 1;
                self.$messages.data("jsp").scrollToBottom();
            }
        }
    },
    isActive: function() {
        return document.hasFocus() && this.$header && this.$header.is(":visible");
    },
    render: function() {
        var self = this;

        var room = this.props.chatRoom;
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);

        var conversationPanelClasses = "conversation-panel";
        var headerClasses = "fm-right-header";
        var messagesClasses = "fm-chat-message-scroll";
        var endCallClasses = "chat-button fm-end-call";
        var videoControlClasses = "video-controls";

        if (!room.isCurrentlyActive) {
            //headerClasses += " hidden";
            //messagesClasses += " hidden";
            conversationPanelClasses += " hidden";
        }

        if (room._conv_ended === true) {
            headerClasses += " conv-ended";
        } else {
            headerClasses += " conv-start";
        }

        var callIsActive = room.callSession && room.callSession.isActive();
        if (!callIsActive) {
            endCallClasses += " hidden";
        }


        var contactId = 'contact_' + htmlentities(contact.u);
        var contactClassString = "fm-chat-user-info todo-star";
        contactClassString += " " + room.megaChat.xmppPresenceToCssClass(
                contact.presence
            );

        var startCallButtonClasses = "chat-button btn-chat-call fm-start-call";

        if (callIsActive) {
            startCallButtonClasses += " hidden";
        } else {
            if (room.callSession && (
                room.callSession.state === CallSession.STATE.WAITING_RESPONSE_OUTGOING ||
                room.callSession.state === CallSession.STATE.WAITING_RESPONSE_INCOMING
                )
            ) {
                startCallButtonClasses += " disabled";
            }
        }

        if (!contact.presence) {
            startCallButtonClasses += " disabled";
        }

        var startCallPopupClasses = "chat-popup fm-start-call-popup";
        var startCallPopupCss = {};
        var startCallArrowCss = {};

        if (this.state.startCallPopupIsActive) {
            var startCallPopup = $('.fm-start-call-popup', self.$header);
            var startCallPopupButton = $('.fm-start-call', self.$header);
            var positionX = $('.fm-chat-block').outerWidth() - startCallPopupButton.position().left - (startCallPopupButton.outerWidth() * 0.5) - (startCallPopup.outerWidth() * 0.5);

            if (startCallPopupButton.attr('class').indexOf('active') === -1) {
                room.megaChat.closeChatPopups();
                startCallPopupClasses += " active";
                startCallButtonClasses += " active";

                var $arrow = $('.fm-start-call-popup .fm-send-files-arrow', self.$header);

                if (positionX < 8) {
                    startCallPopupCss.right = '8px';
                    startCallArrowCss.left = startCallPopup.outerWidth() - (startCallPopupButton.outerWidth() * 0.5)  + 'px';

                } else {
                    startCallPopupCss.right = positionX + 'px';
                    startCallArrowCss.left = '50%';
                }

            } else {
                room.megaChat.closeChatPopups();
            }
        }
        var messagesList = [];

        self.props.messagesBuff.messages.forEach(function(v, k) {
            if (v.deleted !== 1) {
                messagesList.push(
                    <ConversationMessage message={v} chatRoom={room} key={v.messageId} />
                );
            }
        });

        /**
         * Audio/video UI handling
         */

        var ctrlAudioButtonClasses = "video-call-button audio-icon";
        var ctrlVideoButtonClasses = "video-call-button video-icon";
        var headerIndicatorAudio = "chat-header-indicator muted-audio";
        var headerIndicatorVideo = "chat-header-indicator muted-video";
        var myAvatar = <span></span>;
        var otherUsersAvatar = <span></span>;
        var myContainerClasses = "my-av-screen";
        var otherUserContainerClasses = "others-av-screen";
        var currentUserResizerClasses = "current-user-resizer";
        var videoMinimiseButtonClasses = "video-minimize-button small-video-reziser";
        var sizeIconClasses = "video-call-button size-icon";
        var emoticonsPopupClasses = "fm-chat-emotion-popup";
        var emoticonsPopupButtonClasses = "fm-chat-emotions-icon";
        var typingElement;

        // setup ONLY if there is an active call session
        if (room.callSession && callIsActive) {
            if (self.state.isFullscreenModeEnabled) {
                headerClasses += " fullscreen";
                sizeIconClasses += " active";
                if (self.state.mouseOverDuringCall !== true) {
                    videoControlClasses += " hidden-controls";
                }
            }

            // setup, related to my local a/v settings
            if (room.callSession.getMediaOptions().video) {
                headerIndicatorVideo += " hidden";
                myAvatar = <div className="localVideoWrapper">
                    <video
                        className="localViewport"
                        defaultMuted="true"
                        muted=""
                        volume="0"
                        autoPlay="true"
                        id={"localvideo_" + room.callSession.sid}
                        src={room.callSession.localPlayer.src}
                    />
                </div>;

                myContainerClasses += " current-user-video-container";
            } else {
                ctrlVideoButtonClasses += " active";
                myAvatar = <div style={{height: "100%"}} className="my-avatar-text">
                    <ContactsUI.Avatar contact={M.u[u_handle]} imgStyles={{width: "100%"}} />
                </div>;
                myContainerClasses += " current-user-audio-container";
                currentUserResizerClasses += " hidden";
            }

            if (room.callSession.getMediaOptions().audio) {
                headerIndicatorAudio += " hidden";
            } else {
                ctrlAudioButtonClasses += " active";
            }

            // setup, based on remote user's a/v settings
            if (room.callSession.getRemoteMediaOptions().video && room.callSession.remotePlayer) {
                var remotePlayer = room.callSession.remotePlayer[0];

                otherUsersAvatar = <video
                        autoPlay="autoplay"
                        className="rmtViewport rmtVideo"
                        id={"remotevideo_" + room.callSession.sid}
                        ref="remoteVideo"
                        src={remotePlayer.src}
                    />;
                otherUserContainerClasses += " video-call-container";

            } else {
                otherUsersAvatar = <div className="other-avatar-text">
                    <ContactsUI.Avatar contact={contact} imgStyles={{width: "100%"}} />
                </div>;

                otherUserContainerClasses += " audio-call-container";
            }

            if (room.callSession.getRemoteMediaOptions().audio) {

            } else {

            }
        } else {
            headerIndicatorAudio += " hidden";
            headerIndicatorVideo += " hidden";
        }

        if (self.state.localVideoIsMinimized === true) {
            videoMinimiseButtonClasses += " active";
            myContainerClasses += " minimized";
        } else {

        }

        // typing area
        var typedMessage = htmlentities(self.state.typedMessage).replace(/\n/g, '<br />');
        typedMessage = typedMessage + '<br />';


        if (self.state.emoticonsPopupIsActive === true) {
            emoticonsPopupButtonClasses += " active";
            emoticonsPopupClasses += " active";
        } else {
            emoticonsPopupClasses += " hidden";
        }

        if (self.state.currentlyTyping.length > 0) {
            typingElement = <div className="fm-chat-messages-block typing" key="typingElement">
                <div className="fm-chat-messages-pad">
                    <span>
                        {self.state.currentlyTyping.map((u_h) => {
                            return <ContactsUI.Avatar key={u_h} contact={M.u[u_h]} />
                        })}
                    </span>
                    <div className="fm-chat-message">
                        <div className="circle" id="circleG">
                            <div id="circleG_1" className="circleG"></div>
                            <div id="circleG_2" className="circleG"></div>
                            <div id="circleG_3" className="circleG"></div>
                        </div>
                    </div>
                    <div className="clear"></div>
                </div>
            </div>;
        } else {
            // don't do anything.
        }

        return (
            <div className={conversationPanelClasses} onMouseMove={self.onMouseMove}>
                <div className={headerClasses} data-room-jid={self.props.chatRoom.roomJid.split("@")[0]}>
                    <ContactsUI.Avatar contact={contact} />
                    <div className={contactClassString}>
                        <div className="todo-fm-chat-user-star"></div>

                        <div className="fm-chat-user">{generateContactName(contact.u)}</div>
                        <div className="nw-contact-status"></div>
                        <div className="fm-chat-user-status">{' ' + room.megaChat.xmppPresenceToText(contact.presence) + ' '}</div>
                        <div className="clear"></div>
                    </div>


                    <div className={headerIndicatorAudio}></div>
                    <div className={headerIndicatorVideo}></div>

                    <div className={endCallClasses} onClick={this.onEndCallClicked}><span className="fm-chatbutton">{l[5884]}</span></div>
                    <div className="chat-button fm-chat-end end-chat hidden" onClick={(() => function() {
                        room.destroy(true);
                    })}> <span className="fm-chatbutton">{l[6833]}</span> </div>

                    <div className={startCallButtonClasses} onClick={this.onStartCallClicked}><span className="fm-chatbutton-arrow">{l[5883]}</span></div>

                    <div className={startCallPopupClasses} style={startCallPopupCss}>
                        <div className="fm-send-files-arrow" style={startCallArrowCss}></div>
                        <div className="fm-chat-popup-button start-audio" onClick={(() => { room.startAudioCall(); })}>{l[5896]}</div>
                        <div className="fm-chat-popup-button start-video" onClick={(() => { room.startVideoCall(); })}>{l[5897]}</div>
                    </div>
                    <div className="clear"></div>


                    <div className="chat-call-block" onMouseMove={this.onMouseMoveDuringCall}>
                        <div className="video-full-demo-ticket"></div>
                        <div className="video-full-logo"></div>

                        <div className={videoControlClasses}>
                            <div className="video-full-buttons">
                                <div className={ctrlAudioButtonClasses} onClick={self.onAudioToggleClicked}>
                                    <span></span><div className="video-call-border"></div>
                                </div>
                                <div className={ctrlVideoButtonClasses} onClick={self.onVideoToggleClicked}>
                                    <span></span><div className="video-call-border"></div>
                                </div>
                                <div className="video-call-button hang-up-icon" onClick={self.onEndCallClicked}>
                                    <span></span><div className="video-call-border"></div>
                                </div>
                            </div>
                            <div className="video-size-button">
                                <div className={sizeIconClasses} onClick={this.onToggleFullScreenClicked}>
                                    <span></span><div className="video-call-border"></div>
                                </div>
                            </div>
                        </div>
                        <div className={otherUserContainerClasses}>
                            {otherUsersAvatar}
                        </div>

                        <div className={myContainerClasses}>
                            <div className={currentUserResizerClasses}><div></div></div>
                            <div className={videoMinimiseButtonClasses} onClick={this.onLocalVideoResizerClicked}></div>
                            {myAvatar}
                        </div>

                    </div>

                    <div className="video-resizer"></div>
                    <div className="drag-handle"></div>

                </div>



                <div className={messagesClasses} data-roomjid={self.props.chatRoom.roomJid}>
                    <div className="fm-chat-message-pad">
                        <div className="chat-date-divider">
                        </div>
                        <div className="fm-chat-download-popup chat-popup">
                            <div className="fm-chat-download-arrow"></div>
                            <div className="fm-chat-download-button to-cloud">
                                <span>{l[6839]}</span>
                            </div>
                            <div className="fm-chat-download-button as-zip">
                                <span>{l[864]}</span>
                            </div>
                            <div className="fm-chat-download-button to-computer">
                                <span>{l[6840]}</span>
                            </div>
                        </div>

                        {messagesList}
                        {typingElement}

                    </div>
                </div>

                <div className="fm-chat-line-block">
                    <div className="hiddendiv" dangerouslySetInnerHTML={{__html: typedMessage}}></div>
                    <div className="fm-chat-attach-file">
                        <div className="fm-chat-attach-arrow"></div>
                    </div>

                    <div className={emoticonsPopupButtonClasses} onClick={this.onEmoticonsButtonClick}>
                        <div className="fm-chat-emotion-arrow"></div>
                    </div>
                    <div className={emoticonsPopupClasses}>
                        <div className="fm-chat-arrow"></div>
                        <div className="fm-chat-smile smile" data-text=":)" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile wink" data-text=";)" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile tongue" data-text=":P" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile grin" data-text=":D" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile confuse" data-text=":|" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile grasp" data-text=":O" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile sad" data-text=":(" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile cry" data-text=";(" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile angry" data-text="(angry)" onClick={this.onEmoticonClicked}></div>
                        <div className="fm-chat-smile mega" data-text="(mega)" onClick={this.onEmoticonClicked}></div>
                        <div className="clear"></div>
                    </div>

                    <div className="nw-chat-message-icon"></div>
                    <div className="fm-chat-input-scroll">
                        <div className="fm-chat-input-block">
                            <textarea
                                className="message-textarea"
                                placeholder="Write a message..."
                                onKeyDown={self.onTypeAreaKeyDown}
                                onBlur={self.onTypeAreaBlur}
                                onChange={self.onTypeAreaChange}
                                value={self.state.typedMessage}
                                ref="typearea"
                                ></textarea>
                        </div>
                    </div>
                    <div className="clear"></div>

                </div>
            </div>
        );
    }
});


var ConversationPanels = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;

        var conversations = [];

        self.props.conversations.forEach(function(chatRoom) {
            var contact = megaChat.getContactFromJid(chatRoom.getParticipantsExceptMe()[0]);

            conversations.push(
                <ConversationPanel
                    chatRoom={chatRoom}
                    contacts={M.u}
                    contact={contact}
                    messagesBuff={chatRoom.messagesBuff}
                    key={chatRoom.roomJid}
                    chat={self.props.megaChat}
                    />
            );
        });

        return (
            <div className="conversation-panels">
                {conversations}
            </div>
        );
    }
});



module.exports = {
    ConversationPanel,
    ConversationPanels
};
