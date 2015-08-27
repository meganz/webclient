// libs
var React = require("react");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationsUI = require('./../ui/conversations.jsx');


var ConversationPanel = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],

    getInitialState: function() {
        return {
            'startCallPopupIsActive': false
        };
    },

    refreshUI: function(scrollToBottom) {
        var self = this;
        var room = self.props.chatRoom;

        if (room._leaving) {
            return;
        }

        this.$header.attr("data-room-jid", room.roomJid.split("@")[0]);

        if (this.$header.is(":visible")) {
            this.$header.removeClass("hidden");
            //$('.nw-conversations-item').removeClass("selected");
            //$('.nw-conversations-item[data-room-jid="' + room.roomJid.split("@")[0] + '"]').addClass("selected");
        }

        var $jsp = this.$messages.data("jsp");
        if($jsp) {

            $jsp.reinitialise();

            if (scrollToBottom === true) {
                this.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToBottom();
                });
            } else if (scrollToBottom) {
                this.$messages.one('jsp-initialised', function () {
                    $jsp.scrollToElement(scrollToBottom);
                });
            }
        }

        room.renderContactTree();

        room.megaChat.refreshConversations();

        room.trigger('RefreshUI');
    },

    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);

        var $container = $(this.getDOMNode());

        this.$header = $('.fm-right-header[data-room-jid="' + this.props.chatRoom.roomJid.split("@")[0] + '"]', $container);
        this.$messages = $('.fm-chat-message-scroll[data-roomjid="' + this.props.chatRoom.roomJid + '"]', $container);

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

        this.$messages.droppable(droppableConfig);
        this.$header.droppable(droppableConfig);

        this.$messages.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5, animateDuration: 70});
    },
    onStartCallClicked: function() {
        var self = this;

        var hidePopup = function() {
            self.setState({
                startCallPopupIsActive: false
            });
            $(document).unbind('mousedown.startCallPopup');
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
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    handleWindowResize: function(scrollToBottom) {
        var $container = $(this.getDOMNode());
        var self = this;

        //$container.height(
        //    $container.parent().height()
        //);

        // Important. Please insure we have correct height detection for Chat messages block. We need to check ".fm-chat-input-scroll" instead of ".fm-chat-line-block" height
        var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - self.$header.outerHeight() + 2;

        if (scrollBlockHeight != self.$messages.outerHeight())
        {
            self.$messages.height(scrollBlockHeight);

            self.refreshUI(scrollToBottom);
        } else {
            self.refreshUI();
        }
    },
    isActive: function() {
        return $.windowActive && this.$header && this.$header.is(":visible");
    },
    render: function() {
        var self = this;

        //console.error('rendering: ', this.props.chatRoom.roomJid, this.props.chatRoom.isCurrentlyActive);

        var room = this.props.chatRoom;

        var headerClasses = "fm-right-header";
        var messagesClasses = "fm-chat-message-scroll";
        var endCallClasses = "chat-button fm-end-call";

        if (!room.isCurrentlyActive) {
            headerClasses += " hidden";
            messagesClasses += " hidden";
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
        var contactJid = room.getParticipantsExceptMe()[0];
        var contact = room.megaChat.getContactFromJid(contactJid);

        var contactId = 'contact_' + htmlentities(contact.u);
        var contactClassString = "fm-chat-user-info todo-star";
        contactClassString += " " + room.megaChat.xmppPresenceToCssClass(
                contact.presence
            );

        var startCallButtonClasses = "chat-button btn-chat-call fm-start-call";

        if(callIsActive) {
            startCallButtonClasses += " hidden";

            $('.fm-chat-block').addClass('video-call');
        } else {
            $('.fm-chat-block').removeClass('video-call');
        }

        if(!contact.presence) {
            startCallButtonClasses += " disabled";
        }

        var startCallPopupClasses = "chat-popup fm-start-call-popup";
        var startCallPopupCss = {};
        var startCallArrowCss = {};

        if (this.state.startCallPopupIsActive) {
            //console.error("YES");
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

        return (
            <div className="conversation-panel">
                <div className={headerClasses} data-room-jid={self.props.chatRoom.roomJid.split("@")[0]}>
                    <ContactsUI.Avatar contact={contact} />
                    <div className={contactClassString}>
                        <div className="todo-fm-chat-user-star"></div>

                        <div className="fm-chat-user">{generateContactName(contact.u)}</div>
                        <div className="nw-contact-status"></div>
                        <div className="fm-chat-user-status">{' ' + room.megaChat.xmppPresenceToText(contact.presence) + ' '}</div>
                        <div className="clear"></div>
                    </div>


                    <div className="chat-header-indicator muted-audio hidden"></div>
                    <div className="chat-header-indicator muted-video hidden"></div>

                    <div className={endCallClasses} onClick={room.endCall}> <span className="fm-chatbutton">{l[5884]}</span> </div>
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


                    <div className="chat-call-block">
                        <div className="video-controls">
                            <div className="video-full-buttons">
                                <div className="video-call-button audio-icon"><span></span><div className="video-call-border"></div></div>
                                <div className="video-call-button video-icon"><span></span><div className="video-call-border"></div></div>
                                <div className="video-call-button hang-up-icon"><span></span><div className="video-call-border"></div></div>
                            </div>
                            <div className="video-size-button">
                                <div className="video-call-button size-icon"><span></span><div className="video-call-border"></div></div>
                            </div>
                        </div>
                        <div className="others-av-screen video-call-container audio-call-container hidden">
                            <img alt="" src="" className="other-avatar" />
                            <div className="other-avatar-text" />
                        </div>

                        <div className="my-av-screen current-user-audio-container current-user-video-container hidden">
                            <div className="current-user-resizer video-only"><div></div></div>
                            <div className="video-minimize-button small-video-reziser"></div>
                            <img style={{height: "100%"}} src="" className="my-avatar" />
                            <div style={{height: "100%"}} className="my-avatar-text"/>
                            <div className="localVideoWrapper"></div>
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

                        <div className="fm-chat-messages-block typing-template right-block">
                            <div className="fm-chat-messages-pad">
                                <div className="nw-contact-avatar">
                                    <img alt="" src="{staticpath}images/mega/default-small-avatar.png" />
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
