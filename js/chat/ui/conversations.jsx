// init some stuff
require('./../../stores/actions.jsx');

// libs
var React = require("react");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ChatRoom = require('./../chatRoom.jsx');
var ButtonsUI = require('./../../ui/buttons.jsx');
var ContactsUI = require('./../ui/contacts.jsx');


var ConversationsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var unreadClass = "";
        var unreadCount = this.props.chatRoom.getUnreadCount();
        if(unreadCount > 0) {
            unreadClass = " unread ";
        }

        var classString = "nw-conversations-item";


        var contactJid = this.props.chatRoom.getParticipantsExceptMe()[0];
        var contact = this.props.chatRoom.megaChat.getContactFromJid(contactJid);
        var id = 'conversation_' + htmlentities(contact.u);
        var roomShortJid = this.props.chatRoom.roomJid.split("@")[0];

        var caps = megaChat.karere.getCapabilities(contactJid);
        if(caps) {
            Object.keys(caps).forEach(function (k) {
                var v = caps[k];
                if (v) {
                    classString += " chat-capability-" + k;
                }
            });
        }

        // selected
        if(this.props.chatRoom.isCurrentlyActive) {
            classString += " selected";
        }

        classString += " " + this.props.chatRoom.megaChat.xmppPresenceToCssClass(
            this.props.chatRoom.megaChat.karere.getPresence(contactJid)
        );

        return (
            <div>
                <div className={classString} id={id} data-room-jid={roomShortJid} data-jid={contactJid} onClick={this.props.onConversationClicked}>
                    <div className="nw-contact-status"></div>
                    <div className="nw-conversations-unread">{unreadCount}</div>
                    <div className="nw-conversations-name">
                        {this.props.chatRoom.getRoomTitle()}
                    </div>
                </div>
            </div>
        );
    }
});

var ConversationsList = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    conversationClicked: function(room, e) {
        var contact = room.megaChat.getContactFromJid(
            room.getParticipantsExceptMe()[0]
        );

        window.location = "#fm/chat/" + contact.u;
        e.stopPropagation();
    },
    currentCallClicked: function(e) {
        var activeCallRoom = this.props.megaChat.activeCallRoom;
        if(activeCallRoom) {
            this.conversationClicked(activeCallRoom, e);
        }
    },
    contactClicked: function(contact, e) {
        window.location = "#fm/chat/" + contact.u;
        e.stopPropagation();
    },
    endCurrentCall: function(e) {
        var activeCallRoom = this.props.megaChat.activeCallRoom;
        if(activeCallRoom) {
            activeCallRoom._resetCallStateNoCall();
            activeCallRoom._cancelCallRequest();
            this.conversationClicked(activeCallRoom, e);
        }
    },
    handleWindowResize: function() {
        var $container = $(document.querySelector('.content-panel.conversations').parentNode.parentNode.parentNode);
        var $jsp = $container.data('jsp');

        $container.height(
            $container.parent().parent().parent().height() - $('.transfer-panel').outerHeight()
        );

        if($jsp) {
            $jsp.reinitialise();
        }
    },
    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);

    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    render: function() {
        var currentCallingContactStatusProps = {
            'className': "nw-conversations-item current-calling",
            'data-jid': ''
        };
        var callName;
        var currentCallingHeaderClasses = "nw-conversations-header call-started";

        var megaChat = this.props.megaChat;

        var activeCallRoom = megaChat.activeCallRoom;
        if(activeCallRoom) {
            var user = activeCallRoom.getParticipantsExceptMe()[0];
            user = megaChat.getContactFromJid(user);
            if(user) {
                currentCallingContactStatusProps.className += " " + user.u + " " + megaChat.xmppPresenceToCssClass(user.presence);
                currentCallingContactStatusProps['data-jid'] = activeCallRoom.roomJid;
                callName = activeCallRoom.getRoomTitle();

                if(activeCallRoom.roomJid == megaChat.currentlyOpenedChat) {
                    currentCallingContactStatusProps.className += " selected";
                }
            } else {
                currentCallingContactStatusProps.className += ' hidden';
            }
        } else {
            currentCallingContactStatusProps.className += ' hidden';
        }

        if(!callName) {
            currentCallingHeaderClasses += " hidden";
        }
        var currentConversations = [(
            <div key="headerConversations">
                <div className={currentCallingHeaderClasses}>{__("CURRENT CALLING")}</div>
                <div {...currentCallingContactStatusProps}  onClick={this.currentCallClicked}>
                    <div className="nw-contact-status"></div>
                    <div className="chat-cancel-icon" onClick={this.endCurrentCall}></div>
                    <div className="chat-time-txt"></div>
                    <div className="nw-conversations-name">{callName}</div>
                </div>
                <div className="nw-tree-panel-header">
                    <span>{__("Current Conversations")}</span>
                    <div className="nw-tree-panel-arrows"></div>
                </div>
            </div>
        )];

        this.props.chats.map((chatRoom, k) => {
            if(chatRoom._leaving || chatRoom.state == ChatRoom.STATE.LEFT || chatRoom.state == ChatRoom.STATE.LEAVING) {
                return;
            }
            if(megaChat.activeCallRoom && chatRoom == megaChat.activeCallRoom) {
                return;
            }

            var contact = chatRoom.getParticipantsExceptMe()[0];
            contact = chatRoom.megaChat.getContactFromJid(contact);

            if(contact && contact.c === 0) {
                // skip & leave, a non-contact conversation, e.g. contact removed.
                Soon(function() {
                    chatRoom.destroy();
                });
                return;
            }

            currentConversations.push(
                <ConversationsListItem key={k} chatRoom={chatRoom} megaChat={megaChat} onConversationClicked={this.conversationClicked.bind(this, chatRoom)} />
            );
        });

        // current contacts
        var currentContacts = [(
            <div className="nw-tree-panel-header" key="headerContacts">
                <span>{__("Mega contacts")}</span>
                <div className="nw-tree-panel-arrows"></div>
            </div>
        )];


        this.props.contacts.forEach(((v, k) => {
            var roomFound = megaChat.getPrivateRoom(k);

            if(
                k != u_handle &&
                (
                    roomFound === false ||
                    roomFound.state == ChatRoom.STATE.LEFT ||
                    roomFound.state == ChatRoom.STATE.LEAVING ||
                    roomFound._leaving
                ) &&
                (v.c == 2 || v.c == 1)
            ) {
                currentContacts.push(
                    <ContactsUI.ContactsListItem
                        key={k}
                        contact={v}
                        megaChat={this.props.megaChat}
                        onContactClicked={this.contactClicked.bind(this, v)}
                    />
                );
            }
        }).bind(this));

        return (
            <div className="conversationsList">
                {currentConversations.length > 1 ? currentConversations : ""}
                {currentContacts.length > 1 ? currentContacts : ""}
            </div>
        );
    }
});


var ConversationsMainListing =  React.createClass({
    mixins: [MegaRenderMixin],
    audioClicked: function(room, e) {
        e.stopPropagation();
        room.startAudioCall();
    },
    videoClicked: function(room, e) {
        e.stopPropagation();
        room.startVideoCall();
    },
    dblClicked: function(room, e) {
        e.stopPropagation();
        room.activateWindow();
        room.show();
    },

    render: function () {
        var self = this;

        var conversations = [];
        var anyChatWindowVisible = false;
        self.props.conversations.map((room, roomJid) => {
            if(room._leaving || room.state == ChatRoom.STATE.LEFT || room.state == ChatRoom.STATE.LEAVING) {
                return;
            }

            var contactJid = room.getParticipantsExceptMe()[0];
            var contact = room.megaChat.getContactFromJid(contactJid);
            var contactAvatarMeta = generateAvatarMeta(contact.u);
            var presence = room.megaChat.karere.getPresence(contactJid);

            var chatUserInfoClasses = "fm-chat-user-info ustatus " + contact.u + " " + room.megaChat.xmppPresenceToCssClass(
                presence
            );

            if(room.isActive()) {
                anyChatWindowVisible = true;
            }

            var chatUserStatusClasses = "fm-chat-user-status " + contact.u;

            var haventCommunicated;
            var lastActivity;
            if(!room.lastActivity) {
                haventCommunicated = (
                    <div className="not-communicated-txt">
                        {__("You haven’t communicated with <strong>%1</strong> recently.").replace("%1", contactAvatarMeta.fullName)}
                    </div>
                );
            } else {
                lastActivity = "about " + time2last(room.lastActivity);
            }

            var startCallButtons;

            if(presence !== undefined && presence != "offline") {
                startCallButtons = [
                    <div key="startCallVideo" className="conversations-icon video" onClick={this.videoClicked.bind(this, room)}></div>,
                    <div key="startCallAudio" className="conversations-icon audio" onClick={this.audioClicked.bind(this, room)}></div>
                ];
            }

            conversations.push(
                <div className="conversations-block" key={roomJid}>
                    <div className="conversations-border">
                        <div className="conversations-pad" onDoubleClick={this.dblClicked.bind(this, room)}>
                            {startCallButtons}

                            <ContactsUI.Avatar contact={contact} />

                            <div className={chatUserInfoClasses}>
                                <div className="fm-chat-user-star"></div>
                                <div className="fm-chat-user">{contactAvatarMeta.fullName}</div>
                                <div className="nw-contact-status"></div>
                                <div className={chatUserStatusClasses}>{room.megaChat.xmppPresenceToText(presence)}</div>
                                <div className="clear"></div>
                            </div>
                            <div className="clear"></div>

                            <div className="conversations-call-info missed-call">
                                <div className="nw-chat-notification-icon"></div>
                                <div className="conversation-status">
                                    <span>
                                        Missed call
                                    </span>
                                </div>
                                <div className="conversations-time">{lastActivity}</div>
                            </div>

                            {haventCommunicated}

                        </div>
                    </div>
                </div>
            );
        });


        var classes = "fm-chat-message-scroll conversations";
        var containerClasses = "conversations-main-listing";

        if(anyChatWindowVisible || window.location.hash != "#fm/chat" || window.location.hash.indexOf("/chat") === -1) {
            classes += " hidden";
            containerClasses += " hidden";
        }

        var jspClasses = "";

        var emptyClasses = "fm-empty-conversations";
        if(conversations.length > 0) {
            emptyClasses += " hidden";
        } else {
            jspClasses += " hidden";
        }

        //console.error("ConversationsMainListing render");
        //console.error("convs size: ", conversations.length, emptyClasses, jspClasses);

        return (
            <div className={containerClasses} key="convMainListing">

                <div className={emptyClasses} key="emptyMainListing">
                    <div className="fm-empty-pad">
                        <div className="fm-empty-conversations-bg"></div>
                        <div className="fm-empty-cloud-txt">No Conversations</div>
                        <div className="fm-not-logged-text">
                            <div className="fm-not-logged-description">
                                Login or create an account to <span className="red">get 50GB FREE</span> and speak with your friends and coworkers.
                            </div>
                            <div className="fm-not-logged-button login">
                                Login
                            </div>
                            <div className="fm-not-logged-button create-account">
                                Create account
                            </div>
                        </div>
                    </div>
                </div>
                <utils.JScrollPane className={jspClasses} key="jspMainListing">
                    <div className={classes}>
                        <div className="fm-chat-message-pad">
                            {conversations}
                            <div className="clear"></div>
                        </div>
                    </div>
                </utils.JScrollPane>
            </div>
        );
    }
});


var ConversationsApp = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    startCallClicked: function(contact, e) {
        e.preventDefault();
        window.location = "#fm/chat/" + contact.u;
        var room = this.props.megaChat.createAndShowPrivateRoomFor(contact.u);
        if(room) {
            room.startAudioCall();
        }
    },
    startVideoCallClicked: function(contact, e) {
        e.preventDefault();
        window.location = "#fm/chat/" + contact.u;
        var room = this.props.megaChat.createAndShowPrivateRoomFor(contact.u);
        if(room) {
            room.startVideoCall();
        }
    },
    renderOnlineContactsPopup: function(callback) {
        var self = this;
        var result = [];
        self.props.contacts.forEach(function(v, k) {
            var pres = self.props.megaChat.karere.getPresence(
                self.props.megaChat.getJidFromNodeId(v.u)
            );

            if(v.c == 0 || v.u == u_handle || !pres || pres === 'offline') {
                return;
            }

            result.push(
                <div className="fm-call-dialog-item" onClick={callback.bind(self, v)} key={v.u}>
                    <ContactsUI.Avatar contact={v} />

                    <div className="fm-chat-user-info">
                        <div className="fm-chat-user">{v.name ? v.name : v.m}</div>
                        <div className="contact-email">{v.name ? "" : v.m}</div>
                    </div>
                </div>
            );
        });

        return result;
    },
    componentDidMount: function() {
        window.addEventListener('resize', this.handleWindowResize);

    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },
    componentDidUpdate: function() {
        this.handleWindowResize();
    },
    handleWindowResize: function() {
        var $container = $(this.getDOMNode());

        $container.height(
            $container.parent().height()
        );
    },
    render: function() {
        var self = this;

        //console.error("ConversationsApp render");

        var onlineContactsAudioCall = self.renderOnlineContactsPopup(self.startCallClicked);
        var onlineContactsVideoCall = self.renderOnlineContactsPopup(self.startVideoCallClicked);

        return (
            <div className="conversationsApp" key="conversationsApp">
                <div className="fm-left-panel">
                    <div className="left-pane-drag-handle"></div>

                    <div className="fm-left-menu conversations">
                        <div className="nw-fm-tree-header conversations">
                            <input type="text" defaultValue={l[5902]} placeholder={l[5902]} />
                            <div className="nw-fm-search-icon"></div>
                        </div>
                    </div>


                    <div className="fm-tree-panel">
                        <div className="content-panel conversations">
                            <ConversationsList chats={this.props.megaChat.chats} megaChat={this.props.megaChat} contacts={this.props.contacts} />
                        </div>
                    </div>
                </div>
                <div className="fm-right-files-block">
                    <div className="fm-right-header fm hidden">

                        <ButtonsUI.Button
                            group="conversationsListing"
                            label={__('Start video call ...')}
                            className="chat-button fm-start-video-call"
                            disabled={onlineContactsVideoCall.length === 0 ? true : false}
                            contacts={this.props.contacts}
                        >
                            <ButtonsUI.ButtonPopup contacts={this.props.contacts}>
                                {onlineContactsVideoCall}
                            </ButtonsUI.ButtonPopup>
                        </ButtonsUI.Button>

                        <ButtonsUI.Button
                            group="conversationsListing"
                            label={__('Start call ...')}
                            className="chat-button fm-start-call"
                            disabled={onlineContactsAudioCall.length === 0 ? true : false}
                        >
                            <ButtonsUI.ButtonPopup>
                                {onlineContactsAudioCall}
                            </ButtonsUI.ButtonPopup>
                        </ButtonsUI.Button>


                    </div>


                    <div className="fm-empty-messages hidden">
                    <div className="fm-empty-pad">
                        <div className="fm-empty-messages-bg"></div>
                        <div className="fm-empty-cloud-txt">No Messages</div>
                        <div className="fm-not-logged-text">
                            <div className="fm-not-logged-description">
                                Login or create an account to <span className="red">get 50GB FREE</span> and get messages from your friends and coworkers.
                            </div>
                            <div className="fm-not-logged-button login">
                                Login
                            </div>
                            <div className="fm-not-logged-button create-account">
                                Create account
                            </div>
                        </div>
                    </div>
                    </div>

                    <ConversationsMainListing {...this.props} conversations={this.props.megaChat.chats} />
                </div>
            </div>
        );
    }
});

module.exports = {
    ConversationsList,
    ConversationsMainListing,
    ConversationsApp
};