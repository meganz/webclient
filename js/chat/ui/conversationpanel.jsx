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
        if(!MESSAGE_STRINGS) {
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
        var authorTextDiv;


        if (message.authorContact) {
            contact = message.authorContact;
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
        else if (message.timestamp) {
            timestamp = message.timestamp;
        }
        else {
            timestamp = unixtime();
        }

        timestamp = unixtimeToTimeString(timestamp);

        // if this is a text msg.
        if(
            (message instanceof KarereEventObjects.IncomingMessage) ||
            (message instanceof KarereEventObjects.OutgoingMessage) ||
            (message instanceof KarereEventObjects.IncomingPrivateMessage)
        ) {
            textMessage = message.getContents();
            authorTextDiv = <span className="chat-username">{contact.m}</span>;
        }
        // if this is an inline dialog
        else if(
            message.type
        ) {
            cssClasses += " inline-dialog chat-notification " + message.type;
            textMessage = getMessageString(message.type);
            if(!textMessage) {
                console.error("Message with type: ", message.type, "does not have a text string defined. Message: ", message);
                debugger;
                throw new Error("boom");
            }
            // if is an array.
            if(textMessage.splice) {
                var tmpMsg = textMessage[0].replace("[X]", generateContactName(contact.u));

                if(chatRoom.megaChat._currentCallCounter) {
                    tmpMsg += textMessage[1].replace("[X]", secToDuration(chatRoom.megaChat._currentCallCounter)) + " "
                }
                textMessage = tmpMsg;
            } else {
                textMessage = textMessage.replace("[X]", generateContactName(contact.u));
            }

            // mapping css icons to msg types
            if(message.type === "call-rejected") {
                cssClasses += " rejected-call";
            }
            else if (message.type === "call-missed") {
                cssClasses += " missed-call";
            }
            else if (message.type === "call-handled-elsewhere") {
                cssClasses += " call-from-different-device";
            }
            else if (message.type === "call-failed") {
                cssClasses += " rejected-call";
            }
            else if (message.type === "call-failed-media") {
                cssClasses += " call-canceled";
            }
            else if (message.type === "call-canceled") {
                cssClasses += " call-ended";
            }
        }


        if(message.cssClasses) {
            cssClasses += " " + message.cssClasses.join(" ");
        }

        if(message.buttons) {
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

        return (
            <div className={cssClasses} data-id={"id" + message.messageId}>
                <div className="fm-chat-messages-pad">
                    <div className="nw-chat-notification-icon"></div>
                    <ContactsUI.Avatar contact={contact} />

                    <div className="fm-chat-message">
                        <div className="chat-message-date">{timestamp}</div>
                        {authorTextDiv}
                        <div className="chat-message-txt">
                            {textMessage}
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
            'startCallPopupIsActive': false,
            'localVideoIsMinimized': false,
            'isFullscreenModeEnabled': false,
            'mouseOverDuringCall': false
        };
    },

    refreshUI: function(scrollToBottom) {
        var self = this;
        var room = self.props.chatRoom;

        if (room._leaving) {
            return;
        }

        this.$header.attr("data-room-jid", room.roomJid.split("@")[0]);

        var $jsp = this.$messages.data("jsp");
        if($jsp) {
            $jsp.reinitialise();
        }

        room.renderContactTree();

        room.megaChat.refreshConversations();

        room.trigger('RefreshUI');
    },
    onStartCallClicked: function(e) {
        var self = this;

        if($(e.target).parent().is(".disabled")) {
            return;
        }

        var hidePopup = function() {
            if(self.isMounted()) {
                self.setState({
                    startCallPopupIsActive: false
                });
                $(document).unbind('mouseup.startCallPopup');
            }
        };

        if(self.props.contact.presence) {
            if(self.state.startCallPopupIsActive === false) {
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
        if(room.callSession) {
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
        if(room.callSession) {
            if(room.callSession.getMediaOptions().video) {
                room.callSession.muteVideo();
            } else {
                room.callSession.unmuteVideo();
            }
        }
    },
    onAudioToggleClicked: function(e) {
        var self = this;
        var room = this.props.chatRoom;
        if(room.callSession) {
            if(room.callSession.getMediaOptions().audio) {
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

        if(this.state.isFullscreenModeEnabled) {
            this.setState({isFullscreenModeEnabled: false});
            $(document).fullScreen(false);
        } else {
            this.setState({isFullscreenModeEnabled: true});
            $(document).fullScreen(true);
        }
    },
    onMouseMoveDuringCall: function(e) {
        var self = this;

        if(self.state.mouseOverDuringCall === false) {
            self.setState({'mouseOverDuringCall': true});
        }
        if(self._mouseMoveDelay) {
            clearTimeout(self._mouseMoveDelay);
        }
        self._mouseMoveDelay = setTimeout(function() {
            self.setState({'mouseOverDuringCall': false});
        }, 2000);
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

        self.$messages.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5, animateDuration: 70, maintainPosition: true, stickToBottom: true});

        var room = self.props.chatRoom;
        // collapse on ESC pressed (exited fullscreen)
        $(document)
            .unbind("fullscreenchange.megaChat_" + room.roomJid)
            .bind("fullscreenchange.megaChat_" + room.roomJid, function() {
                if (!$(document).fullScreen() && room.isCurrentlyActive) {
                    self.setState({isFullscreenModeEnabled: false});
                }
            });
    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).unbind("fullscreenchange.megaChat_" + this.props.chatRoom.roomJid)
    },
    componentDidUpdate: function() {
        this.handleWindowResize();

        var self = this;
        var room = this.props.chatRoom;
        var callIsActive = room.callSession && room.callSession.isActive();

        if(callIsActive && room.isCurrentlyActive) {
            $('.fm-chat-block').addClass('video-call');

            if(self.state.isFullscreenModeEnabled) {
                $('.fm-chat-block').addClass('fullscreen');

            } else {
                $('.fm-chat-block').removeClass('fullscreen');
            }
            var $videoElem = $("video#remotevideo_" + room.callSession.sid);
            if($videoElem.length > 0) {
                $videoElem[0].play();
            }
            var $videoElemLocal = $("video#localvideo_" + room.callSession.sid);
            if($videoElemLocal.length > 0) {
                $videoElemLocal[0].play();
            }

            var $avscreen = $('.my-av-screen', self.$header);
            if(!$avscreen.data('isDraggable')) {
                $avscreen.draggable({
                    'containment': $avscreen.parents('.chat-call-block'),
                    'scroll': false
                });
                $avscreen.data('isDraggable', true);
            }

        } else {
            // only rmeove the video-call class IF the updated room is the one which was updated
            if(megaChat.currentlyOpenedChat === room.roomJid) {
                $('.fm-chat-block').removeClass('video-call');
                $('.fm-chat-block').removeClass('fullscreen');
            }
        }
        // <video/> display change to trigger re-render hack.
        $('.rmtVideo:visible').css('display', '');
    },
    handleWindowResize: function(e, scrollToBottom) {
        var $container = $(this.getDOMNode());
        var self = this;

        // Important. Please insure we have correct height detection for Chat messages block. We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
        var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - self.$header.outerHeight() + 2;

        if (scrollBlockHeight != self.$messages.outerHeight())
        {
            self.$messages.height(scrollBlockHeight);

            self.refreshUI(scrollToBottom);
        } else {
            self.refreshUI();
        }

        // try to do a .scrollToBottom only once, to trigger the stickToBottom func. of JSP
        if(!self.scrolledToBottom) {
            var $messagesPad = $('.fm-chat-message-pad', self.$messages);
            if(
                $messagesPad.outerHeight() - 1 > $messagesPad.parent().parent().parent().outerHeight()
            ) {
                self.scrolledToBottom = 1;
                self.$messages.data("jsp").scrollToBottom();
            }
        }
    },
    isActive: function() {
        return $.windowActive && this.$header && this.$header.is(":visible");
    },
    render: function() {
        var self = this;

        //console.error('rendering: ', this.props.chatRoom.roomJid, this.props.chatRoom.isCurrentlyActive);

        var room = this.props.chatRoom;
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);

        var conversationPanelClasses = "conversation-panel";
        var headerClasses = "fm-right-header";
        var messagesClasses = "fm-chat-message-scroll";
        var endCallClasses = "chat-button fm-end-call";
        var videoControlClasses = "video-controls";

        if (!room.isCurrentlyActive) {
            headerClasses += " hidden";
            messagesClasses += " hidden";
            conversationPanelClasses += " hidden";
        }

        if(room._conv_ended === true) {
            headerClasses += " conv-ended";
        } else {
            headerClasses += " conv-start";
        }

        var callIsActive = room.callSession && room.callSession.isActive();
        if(!callIsActive) {
            endCallClasses += " hidden";
        }


        var contactId = 'contact_' + htmlentities(contact.u);
        var contactClassString = "fm-chat-user-info todo-star";
        contactClassString += " " + room.megaChat.xmppPresenceToCssClass(
                contact.presence
            );

        var startCallButtonClasses = "chat-button btn-chat-call fm-start-call";

        if(callIsActive) {
            startCallButtonClasses += " hidden";
        } else {
            if(room.callSession && (
                room.callSession.state === CallSession.STATE.WAITING_RESPONSE_OUTGOING ||
                room.callSession.state === CallSession.STATE.WAITING_RESPONSE_INCOMING
                )
            ) {
                startCallButtonClasses += " disabled";
            }
        }

        if(!contact.presence) {
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

        self.props.messages.forEach(function(v, k) {
            if(v.deleted !== 1) {
                messagesList.push(
                    <ConversationMessage message={v} chatRoom={room} />
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

        // setup ONLY if there is an active call session
        if(room.callSession && callIsActive) {
            if(self.state.isFullscreenModeEnabled) {
                headerClasses += " fullscreen";
                sizeIconClasses += " active";
                if(self.state.mouseOverDuringCall !== true) {
                    videoControlClasses += " hidden-controls";
                }
            }

            // setup, related to my local a/v settings
            if(room.callSession.getMediaOptions().video) {
                headerIndicatorVideo += " hidden";
                myAvatar = <div className="localVideoWrapper">
                    <video
                        className="localViewport"
                        defaultmuted="true"
                        muted=""
                        volume="0"
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

            if(room.callSession.getMediaOptions().audio) {
                headerIndicatorAudio += " hidden";
            } else {
                ctrlAudioButtonClasses += " active";
            }

            // setup, based on remote user's a/v settings
            if(room.callSession.getRemoteMediaOptions().video && room.callSession.remotePlayer) {
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

            if(room.callSession.getRemoteMediaOptions().audio) {

            } else {

            }
        } else {
            headerIndicatorAudio += " hidden";
            headerIndicatorVideo += " hidden";
        }

        if(self.state.localVideoIsMinimized === true) {
            videoMinimiseButtonClasses += " active";
            myContainerClasses += " minimized";
        } else {

        }

        return (
            <div className={conversationPanelClasses}>
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
                        <div className="fm-chat-messages-block typing-template right-block">
                            <div className="fm-chat-messages-pad">
                                <div className="nw-contact-avatar">
                                    <img alt="" src="" />
                                </div>
                                <div className="fm-chat-message">
                                    <div className="circle" id="circleG">
                                        <div id="circleG_1" className="circleG"></div>
                                        <div id="circleG_2" className="circleG"></div>
                                        <div id="circleG_3" className="circleG"></div>
                                    </div>
                                </div>
                                <div className="clear"></div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="fm-chat-line-block">
                    <div className="hiddendiv"></div>
                    <div className="fm-chat-attach-file">
                        <div className="fm-chat-attach-arrow"></div>
                    </div>

                    <div className="fm-chat-emotions-icon">
                        <div className="fm-chat-emotion-arrow"></div>
                    </div>
                    <div className="fm-chat-emotion-popup hidden">
                        <div className="fm-chat-arrow"></div>
                        <div className="fm-chat-smile smile" data-text=":)"></div>
                        <div className="fm-chat-smile wink" data-text=";)"></div>
                        <div className="fm-chat-smile tongue" data-text=":P"></div>
                        <div className="fm-chat-smile grin" data-text=":D"></div>
                        <div className="fm-chat-smile confuse" data-text=":|"></div>
                        <div className="fm-chat-smile grasp" data-text=":O"></div>
                        <div className="fm-chat-smile sad" data-text=":("></div>
                        <div className="fm-chat-smile cry" data-text=";("></div>
                        <div className="fm-chat-smile angry" data-text="(angry)"></div>
                        <div className="fm-chat-smile mega" data-text="(mega)"></div>
                        <div className="clear"></div>
                    </div>

                    <div className="nw-chat-message-icon"></div>
                    <div className="fm-chat-input-scroll">
                        <div className="fm-chat-input-block">
                            <textarea className="message-textarea" placeholder="Write a message..."></textarea>
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
                    messages={chatRoom.messages}
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
    ConversationPanels,
};
