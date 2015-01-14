/**
 * Use this localStorage.chatDisabled flag to disable/enable the chat (note the "==" logical comparison!)
 *
 * @type {boolean}
 */
var MegaChatDisabled = localStorage.chatDisabled == true ? true : false;

var disableMpEnc = true;

if(MegaChatDisabled) {
    $(document.body).addClass("megaChatDisabled");
}


var chatui;
(function() {
    var createChatDialog;
    chatui = function(id) {
	
        //XX: code maintanance: move this code to MegaChat.constructor() and .show(jid)
        hideEmptyGrids();
		
        $('.fm-files-view-icon').addClass('hidden');
        $('.fm-blocks-view').addClass('hidden');
        $('.files-grid-view').addClass('hidden');
        $('.fm-right-account-block').addClass('hidden');
		$('.contacts-details-block').addClass('hidden');
		
		$('.shared-grid-view,.shared-blocks-view').addClass('hidden');
		

        $('.fm-right-files-block').removeClass('hidden');

        var chatJids = id.split("chat/").pop();
        if(chatJids) {
            chatJids = chatJids.split(",");
        } else {
            chatJids = [];
        }

        $.each(chatJids, function(k, v) {
            chatJids[k] = megaChat.getJidFromNodeId(v);
        });

        var $promise;


        if(localStorage.megaChatPresence != "unavailable") {
            if(megaChat.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
                megaChat.connect()
                    .done(function() {


                    });
            } else {
            }


        } else {
            // XX: I'm offline, should we show some kind of notification saying: hey, you can't send messages while you
            // are offline?
        }

        chatJids.push(megaChat.karere.getBareJid());
        var resp = megaChat.openChat(chatJids, chatJids.length == 2 ? "private" : "group");

        $promise = resp[2];

        resp[1].show();


        $('.fm-chat-block').removeClass('hidden');

        if(!createChatDialog) {
            createChatDialog = new mega.ui.Dialog({
                'className': 'create-chat-dialog',
                'closable': true,
                'focusable': true,
                'expandable': true,
                'title': 'Create New Chat',
                'buttons': [
                    {
                        'label': 'Create',
                        'className': 'fm-dialog-new-folder-button',
                        'callback': function () {
                            this.hide();
                        }
                    },
                    {
                        'label': 'Cancel',
                        'className': 'create-folder-button-cancel',
                        'callback': function () {
                            this.hide();
                        }
                    }
                ]
            });
        }

        $('.fm-create-chat-button')
            .show()
            .rebind('click.megaChat', function(e) {
                createChatDialog.toggle($(this));

                return false;
            });

        $(document.body).undelegate('.message-textarea', 'keyup.autoresize');
        $(document.body).delegate('.message-textarea', 'keyup.autoresize',function() {
            megaChat.resized();
        });

        $('.fm-chat-emotions-icon').unbind('click.megaChat');
        $('.fm-chat-emotions-icon').bind('click.megaChat', function()
        {
            if ($(this).attr('class').indexOf('active') == -1)
            {
                $(this).addClass('active');
                $('.fm-chat-emotion-popup').addClass('active').removeClass('hidden');
            }
            else
            {
                $(this).removeClass('active');
                $('.fm-chat-emotion-popup').removeClass('active').addClass('hidden');
            }
        });

        $('.fm-chat-smile').unbind('click.megaChat');
        $('.fm-chat-smile').bind('click.megaChat', function()
        {
            $('.fm-chat-emotions-icon').removeClass('active');
            $('.fm-chat-emotion-popup').removeClass('active');
            var c = $(this).data("text");
            if (c)
            {
                c = c.replace('fm-chat-smile ','');
                $('.message-textarea').val($('.message-textarea').val() + c);
                setTimeout(function()
                {
                    moveCursortoToEnd($('.message-textarea')[0]);
                },1);
            }
        });

        $('.fm-chat-block').off('click.megachat', '.nw-chat-button.red');
        $('.fm-chat-block').on('click.megachat', '.nw-chat-button.red', function() {
            var currentRoom = megaChat.getCurrentRoom();

            var $chatDownloadPopup = $('.fm-chat-download-popup',currentRoom.$messages);

            var $button = $(this);
            var $attachmentContainer = $button.parents('.attachments-container');
            var message = currentRoom.getMessageById($attachmentContainer.attr('data-message-id'));

            var attachments = message.getMeta().attachments; //alias
            assert(attachments, "no attachments found..something went wrong.")
            var nodeIds = Object.keys(attachments);



            $('.to-cloud', $chatDownloadPopup).unbind('click.megachat');
            $('.as-zip', $chatDownloadPopup).unbind('click.megachat');
            $('.to-computer', $chatDownloadPopup).unbind('click.megachat');


            var _getNodeIdsForThisButton = function($button) {
                var $attachmentContainer = $button.parents('.attachments-container');
                var message = currentRoom.getMessageById($attachmentContainer.attr('data-message-id'));

                var attachments = message.getMeta().attachments; //alias

                var accessibleNodeIds = Object.keys(attachments);
                $.each([
                    $button.parents('.nw-chat-sharing-body').attr("data-node-id")
                ], function(k, v) {
                    if(M.d[v]) {
                        accessibleNodeIds.push(v);
                    }
                });

                return accessibleNodeIds;
            };


            $('.to-cloud', $chatDownloadPopup).bind('click.megachat', function() {
                var accessibleNodeIds = _getNodeIdsForThisButton($button);
                assert(accessibleNodeIds.length > 0, 'the file download list is empty.');
                $.selected = clone(accessibleNodeIds);

                $.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
                $('.copy-dialog .dialog-copy-button').addClass('active');
                $('.copy-dialog').removeClass('hidden');
                handleDialogContent('cloud-drive', 'ul', true, 'copy', 'Send');
                $('.fm-dialog-overlay').removeClass('hidden');
				$('body').addClass('overlayed');
            });

            $('.as-zip', $chatDownloadPopup).bind('click.megachat', function() {
                var accessibleNodeIds = _getNodeIdsForThisButton($button);
                assert(accessibleNodeIds.length > 0, 'the file download list is empty.');
                M.addDownload(accessibleNodeIds, true);
            });

            $('.to-computer', $chatDownloadPopup).bind('click.megachat', function() {
                var accessibleNodeIds = _getNodeIdsForThisButton($button);
                assert(accessibleNodeIds.length > 0, 'the file download list is empty.');
                M.addDownload(accessibleNodeIds, false);
            });

            $chatDownloadPopup.addClass('active');

            $(this).addClass('active');



            $chatDownloadPopup.position({
                'my': 'center bottom',
                'at': 'center top-10', /* the only hardcoded value, the arrow height */
                'of': $(this),
                'collision': 'flipfit flipfit',
                'within': $('.fm-chat-message-scroll:visible > .jspContainer'),
                'using': function (obj,info) {
                    if (info.vertical == "top") {
                        $(this).addClass("flipped"); // the arrow is re-positioned if this .flipped css class name is added to the popup container, to be on top, instead of bottom
                    } else {
                        $(this).removeClass("flipped");
                    }

                    $(this).css({
                        left: obj.left + 'px',
                        top: obj.top + 'px'
                    });
                }
            });


        });

        // cancel func.
        $('.fm-chat-block').off('click.megachat', '.nw-chat-button.cancel-button');
        $('.fm-chat-block').on('click.megachat', '.nw-chat-button.cancel-button', function() {
            var nodeId = $(this).parent().attr("data-node-id");
            var messageId = $(this).parent().parent().attr("data-message-id");


            var megaRoom = megaChat.getCurrentRoom();
            megaRoom.sendAction(
                "cancel-attachment",
                "",
                {
                    'roomJid': megaRoom.roomJid,
                    'nodeId': nodeId,
                    'messageId': messageId
                }
            );

            megaRoom.cancelAttachment(messageId, nodeId);
        });



        $('.fm-chat-message-scroll').unbind('click');
        $('.fm-chat-message-scroll').bind('click', function()
        {
            megaChat.closeChatPopups();
        });

        $('.fm-chat-block')
            .off('click.megaChatAttach', '.fm-chat-popup-button.from-computer')
            .on('click.megaChatAttach', '.fm-chat-popup-button.from-computer', function() {
                megaChat.closeChatPopups();

                var room = megaChat.getCurrentRoom();
                var participants = room.getParticipantsExceptMe();
                var contact = megaChat.getContactFromJid(participants[0]);


                if(!megaChat.karere.getPresence(participants[0])) {
                    var $dialog = room.generateInlineDialog(
                        "error",
                        megaChat.karere.getJid(),
                        ["error"],
                        "User " + megaChat.getContactNameFromJid(participants[0]) + " is offline. You can only do a direct transfer with online users.",
                        ["error"],
                        {
                            'ok': {
                                'type': 'primary',
                                'text': "Close",
                                'callback': function() {
                                    $dialog.remove();
                                    room.refreshUI();
                                }
                            }
                        },
                        true
                    );
                    room.appendDomMessage($dialog);

                    return;
                }
                if(room) {
                    var $fileUploadField = $('<input type="file" multiple />');
                    $fileUploadField.addClass("hidden");
                    $(document.body).append($fileUploadField);

                    $fileUploadField.bind("change", function(e) {

                        var filesList = e.target.files;

                        ERRDEBUG("Direct transfer: ", filesList);


                        assert(filesList.length > 0, 'no files selected.');

                        getPubk(contact.h, function() {
                            var resp = megaChat.rtc.startMediaCall(participants[0], {files: filesList});


                            var $message = megaChat._generateIncomingRtcFileMessage(room, filesList, resp.sid, function() {

                                if(megaChat.rtc.ftManager.downloads[resp.sid] || megaChat.rtc.ftManager.uploads[resp.sid]) {
                                    megaChat.rtc.ftManager.cancelTransfer(resp.sid);
                                } else {
                                    resp.cancel();
                                }
                            });

                            room.appendDomMessage($message);
                        });

                        Soon(function() { $fileUploadField.remove(); });

                    });

                    $fileUploadField.trigger("click");

                    setTimeout(function() { // really bad way to cleanup things.... but it should be enough for the prototype demo
                        $fileUploadField.remove();
                    }, 60000);
                }
            });



//        $('.fm-chat-block')
//            .off('click.megaChatAttach', '.fm-chat-popup-button.from-computer')
//            .on('click.megaChatAttach', '.fm-chat-popup-button.from-computer', function() {
//                megaChat.closeChatPopups();
//                $('#fileselect1').trigger('click');
//            });

        $('.fm-chat-block')
            .off('click.megaChatAttach', '.fm-chat-popup-button.from-cloud')
            .on('click.megaChatAttach', '.fm-chat-popup-button.from-cloud', function() {
                megaChat.closeChatPopups();
                megaChat.filePicker.show();
            });



        //XX: does not work... fix this when we go into v2
        $('.fm-add-user').unbind('click.megaChat');
        $('.fm-add-user').bind('click.megaChat', function()
        {
            // This was causing a bug for the "Add contact" popup (in the #fm/contacts) because that button have the
            // same .fm-add-user class names

            var positionX = $(this).position().left;
            var addUserPopup = $('.fm-add-contact-popup');
            if ($(this).attr('class').indexOf('active') == -1) {                $(addUserPopup).removeClass('hidden');
                $(this).addClass('active');
                $(addUserPopup).css('left', positionX -8 + 'px');
            }
        });



        var typingTimeout = null;
        var stoppedTyping = function() {
            if(typingTimeout) {
                clearTimeout(typingTimeout);

                var room = megaChat.getCurrentRoom();
                if(room && room.state == ChatRoom.STATE.READY) {
                    megaChat.karere.sendComposingPaused(megaChat.getCurrentRoomJid());
                }
                typingTimeout = null;
            }
        };

        $(document.body).undelegate('.message-textarea', 'keyup.send');
        $(document.body).delegate('.message-textarea', 'keyup.send', function(e) {
            if($(this).val().length > 0) {
                if(!typingTimeout) {
                    var room = megaChat.getCurrentRoom();
                    if(room && room.state == ChatRoom.STATE.READY) {
                        megaChat.karere.sendIsComposing(megaChat.getCurrentRoomJid());
                    }
                } else if(typingTimeout) {
                    clearTimeout(typingTimeout);
                }

                typingTimeout = setTimeout(function() {
                    stoppedTyping();
                }, 2000);
            } else if($(this).val().length === 0) {
                stoppedTyping();
            }
        });
        $(document.body).undelegate('.message-textarea', 'keydown.send');
        $(document.body).delegate('.message-textarea', 'keydown.send',function(e) {
            var key = e.keyCode || e.which;
            var msg = $(this).val();

            if(key == 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                if(msg.trim().length > 0) {
                    stoppedTyping();

                    megaChat.sendMessage(
                        megaChat.getCurrentRoomJid(),
                        msg
                    );
                    $(this).val('');

                    messageAreaResizing();

                    megaChat.resized();

                    return false;
                } else {
					e.preventDefault();
				}
            } else if (key == 13) {
				if(msg.trim().length == 0) {
					e.preventDefault();
				}
			}

        });
        $('.message-textarea').unbind('blur.stoppedcomposing');
        $('.message-textarea').bind('blur.stoppedcomposing',function(e) {
            stoppedTyping();
        });

        // Textarea resizing
        function messageAreaResizing() {
            var txt = $('.message-textarea'),
                txtHeight =  txt.outerHeight(),
                hiddenDiv = $('.hiddendiv'),
                pane = $('.fm-chat-input-scroll'),
                content = txt.val(),
                api;

            content = content.replace(/\n/g, '<br />');
            hiddenDiv.html(content + '<br />');

            if (txtHeight != hiddenDiv.outerHeight() ) {
                txt.height(hiddenDiv.outerHeight());

                if( $('.fm-chat-input-block').outerHeight()>=200) {
                    pane.jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
                    api = pane.data('jsp');
                    txt.blur();
                    txt.focus();
                    api.scrollByY(0);
                }
                else {
                    api = pane.data('jsp');
                    if (api) {
                        api.destroy();
                        txt.blur();
                        txt.focus();
                    }
                }
                megaChat.resized();
            }
        }

        $(document.body).undelegate('.message-textarea', 'keyup.resize');
        $(document.body).delegate('.message-textarea', 'keyup.resize', function() {
            messageAreaResizing();
        });


        // full screen stuff
        function fullscreenVideoResizing() {
            var c = $('.video-full-canvas-block.another-user img, .video-full-canvas-block.another-user video');
            var w = $(window).width();
            var h = $(window).height();
            c.removeAttr('style');
            if (h/w == 0.5625) c.height(c.width()*0.5625);
            else c.height(c.width()*0.75);
            if(h > c.height()) {
                var nw = (h*4)/3;
                c.css({
                    width : Math.round(nw),
                    height : h
                });
            }
            c.css({
                'margin-left' : '-' + c.width()/2 + 'px',
                'margin-top' : '-' + c.height()/2 + 'px'
            });
            if($('.video-full-canvas-block.current-user').attr('class').indexOf('minimized') == -1) {
                $('.current-user .video-full-disabled-block').css({
                    height:($(window).width()*0.15)*0.75,
                    width:$(window).width()*0.15
                });
                $('.video-full-canvas-block.current-user').removeAttr('style');
            }
        }
        fullscreenVideoResizing();

        $(window).bind('resize', function ()
        {
            if($('.video-full-container').is(":visible")) {
                fullscreenVideoResizing();
            }
        });

    }

    //Hidding Control panel if cursor is idle
    var idleMouseTimer;
    var forceMouseHide = false;
    $(document.body).undelegate('.video-full-container.full-mode', 'mousemove.megaChatVideo');
    $(document.body).delegate('.video-full-container.full-mode', 'mousemove.megaChatVideo', function(ev) {
        if(!forceMouseHide) {
            $('.video-full-container.full-mode').css('cursor', '');
            $('.video-full-container .video-controls').removeClass('hidden-controls');
            clearTimeout(idleMouseTimer);
            idleMouseTimer = setTimeout(function() {
                $(".video-full-container.full-mode").css('cursor', 'none');
                $('.video-full-container .video-controls').addClass('hidden-controls');
                forceMouseHide = true;
                setTimeout(function() {
                    forceMouseHide = false;
                }, 400);
            }, 2000);
        }
    });

    //Video miminizing
    $(document.body).undelegate('.video-minimize-button', 'click.megaChatVideo');
    $(document.body).delegate('.video-minimize-button', 'click.megaChatVideo', function() {
        if($(this).attr('class').indexOf('active') == -1) {
            $(this).parent().addClass('minimized');
            $(this).parent().animate({
                'min-width': '32px',
                width: 32,
                height: 32
            }, 200, function() {
                $('.video-minimize-button').addClass('active');
            });
        } else {

            $(this).parent().removeClass('minimized');
            var ch = $(window).width()*0.15 ;
            $(this).parent().animate({
                width: $(window).width()*0.15,
                height:ch*0.75
            }, 200, function() {
                $('.video-minimize-button').removeClass('active');
                $(this).parent().css('min-width','15%');
            });
        }
    });
})();


/**
 * Used to differentiate MegaChat instances running in the same env (tab/window)
 *
 * @type {number}
 */
var megaChatInstanceId = 0;

/**
 * MegaChat - UI component that links XMPP/Strophejs (via Karere) w/ the Mega's UI
 *
 * @returns {Chat}
 * @constructor
 */
var Chat = function() {
    var self = this;


    this.is_initialized = false;
    this.logger = MegaLogger.getLogger("chat");

    this.chats = {};
    this.currentlyOpenedChat = null;
    this.lastOpenedChat = null;
    this._myPresence = localStorage.megaChatPresence;

    var xmppDomain = "developers.mega.co.nz";
    if(localStorage.megaChatUseSandbox) {
        xmppDomain = "sandbox.developers.mega.co.nz";
    }

    this.options = {
        'delaySendMessageIfRoomNotAvailableTimeout': 3000,
        'xmppDomain': xmppDomain,
        'loadbalancerService': 'karere-001.developers.mega.co.nz:4434',
        'fallbackXmppServer': 'https://karere-001.developers.mega.co.nz:443/http-bind',
        'rtcSession': {
            'crypto': {
                encryptMessageForJid: function (msg, bareJid) {
                    var contact = megaChat.getContactFromJid(bareJid);
                    if (!u_pubkeys[contact.h]) {
                        throw new Error("pubkey not loaded: " + contact);
                    }
                    return base64urlencode(crypto_rsaencrypt(msg, u_pubkeys[contact.h]));
                },
                decryptMessage: function (msg) {
                    var decryptedVal = crypto_rsadecrypt(base64urldecode(msg), u_privk);
                    if (decryptedVal && decryptedVal.length > 0) {
                        return decryptedVal.substring(0, 44);
                    } else {
                        return decryptedVal; // some null/falsy value
                    }

                },
                preloadCryptoKeyForJid: function (sendMsgFunc, bareJid) {
                    getPubk(megaChat.getContactFromJid(bareJid).h, sendMsgFunc);
                },
                generateMac: function (msg, key) {
                    var rawkey = key;
                    try {
                        rawkey = atob(key);
                    } catch (e) {
                        //                    if(e instanceof InvalidCharacterError) {
                        //                        rawkey = key
                        //                    }
                    }
                    return asmCrypto.HMAC_SHA256.base64(msg, rawkey);
                },
                scrambleJid: function(bareJid) {
                    var H = asmCrypto.SHA256.base64;
                    return H(bareJid + H(u_privk + "webrtc stats collection"));
                }
            },
            iceServers:[
//                 {url: 'stun:stun.l.google.com:19302'},
                {
                    url: 'turn:karere-001.developers.mega.co.nz:3478?transport=udp',
                    username: "inoo20jdnH",
                    credential: '02nNKDBkkS'
                },
                {
                    url: 'turn:karere-001.developers.mega.co.nz:3478?transport=udp',
                    username: "inoo20jdnH",
                    credential: '02nNKDBkkS'
                }
            ]
        },
        filePickerOptions: {
        },
        /**
         * Really simple plugin architecture
         */
        'plugins': {
            'urlFilter': UrlFilter,
            'emoticonsFilter': EmoticonsFilter,
            'attachmentsFilter': AttachmentsFilter
        },
        'chatNotificationOptions': {
            'textMessages': {
                'incoming-chat-message': {
                    'title': "Incoming chat message",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return "You have new incoming chat message from: " + params.from;
                    }
                },
                'incoming-attachment': {
                    'title': "Incoming attachment",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return params.from + " shared " + (params.attachmentsCount > 1 ? params.attachmentsCount +" files" : "a file");
                    }
                },
                'incoming-voice-video-call': {
                    'title': "Incoming call",
                    'icon': function(notificationObj, params) {
                        return notificationObj.options.icon;
                    },
                    'body': function(notificationObj, params) {
                        return "You have an incoming call from " + params.from;
                    }
                }
            },
            'sounds': [
                'alert_info_message',
                'error_message',
                'incoming_chat_message',
                'incoming_contact_request',
                'incoming_file_transfer',
                'incoming_voice_video_call'
            ]
        },
        'chatStoreOptions': {
            'autoPurgeMaxMessagesPerRoom': 1024
        }
    };

    this.instanceId = megaChatInstanceId++;

    this.plugins = {};


    this.karere = new Karere({
        'clientName': 'mc',
        'boshServiceUrl': function() { return self.getBoshServiceUrl(); }
    });

    self.filePicker = null; // initialized on a later stage when the DOM is fully available.

    self.incomingCallDialog = new mega.ui.chat.IncomingCallDialog();

    //logAllCallsOnObject(jodid25519.eddsa, console.error, true, 'jodid25519.eddsa');

    return this;
};

makeObservable(Chat);

/**
 * Initialize the MegaChat (also will connect to the XMPP)
 */
Chat.prototype.init = function() {
    var self = this;

    // really simple plugin architecture that will initialize all plugins into self.options.plugins[name] = instance
    self.plugins = {};


    // since this plugin act as filter, it should be added first. (only if in the real app!)
    if(typeof(mocha) == "undefined" && !disableMpEnc) {
        self.plugins['encryptionFilter'] = new EncryptionFilter(self);
    }
    if(typeof(mocha) == "undefined") {
        self.plugins['chatStore'] = new ChatStore(self);
    }
    if(typeof(mocha) == "undefined") {
        self.plugins['chatNotifications'] = new ChatNotifications(self, self.options.chatNotificationOptions);
    }

    $.each(self.options.plugins, function(k, v) {
        self.plugins[k] = new v(self);
    });

    if(!self.filePicker) {
        self.filePicker = new mega.ui.FilePicker(self.options.filePickerOptions);
        self.filePicker.bind('doneSelecting', function(e, selection) {
            if(selection.length == 0) {
                return;
            }

            var room = self.getCurrentRoom();
            if(room) {
                room.attachNodes(
                    selection
                );
            }
        })
    }

    // Karere Events
    this.karere.bind("onPresence", function(e, eventObject) {
        if(eventObject.error) {
            return;
        }

        var bareJid = eventObject.getFromJid().split("/")[0];

        // should we trigger refreshUI ?
        if(eventObject.isMyOwn(self.karere) === false) {
            $.each(self.chats, function(roomJid, room) {

                if(room.participantExistsInRoom(bareJid)) {
                    // if this user is part of the currently visible room, then refresh the UI
                    if(self.getCurrentRoomJid() == room.roomJid) {
                        room.refreshUI();
                    }
                }
            });
        }

        if(eventObject.getShow() != "unavailable") {
            if(eventObject.isMyOwn(self.karere) === false) {

                // update M.u
                var contact = self.getContactFromJid(eventObject.getFromJid());
                if(contact) {
                    if(!contact.presenceMtime || parseFloat(contact.presenceMtime) < eventObject.getDelay()) {
                        contact.presence = eventObject.getShow();
                        contact.presenceMtime = eventObject.getDelay();
                    }
                }

                $.each(self.chats, function(roomJid, room) {
                    if(room._leaving === true || room._conv_ended === true) {
                        return; // continue
                    }

                    if(room.participantExistsInRoom(bareJid) && !self.karere.userExistsInChat(roomJid, eventObject.getFromJid())) {
                        self.logger.debug(self.karere.getNickname(), "Auto inviting: ", eventObject.getFromJid(), "to: ", roomJid);

                        self.karere.addUserToChat(roomJid, eventObject.getFromJid(), undefined, room.type, {
                            'ctime': room.ctime,
                            'invitationType': 'resume',
                            'participants': room.users,
                            'users': self.karere.getUsersInChat(roomJid)
                        });

                        return false; // break;
                    }
                });

                // Sync presence across devices (will check the delayed val!)
                if(bareJid == self.karere.getBareJid()) {
                    if(eventObject.getDelay() && eventObject.getDelay() >= parseFloat(localStorage.megaChatPresenceMtime) && self._myPresence != eventObject.getShow()) {
                        self._myPresence = eventObject.getShow();
                        localStorage.megaChatPresence = eventObject.getShow();
                        localStorage.megaChatPresenceMtime = eventObject.getDelay();

                        self.karere.setPresence(
                            eventObject.getShow(),
                            undefined,
                            eventObject.getDelay()
                        );
                    }
                }

            }
        }

        self.renderMyStatus();
        self.renderContactTree();
    });

    // Disco capabilities updated
    this.karere.bind("onDiscoCapabilities", function(e, eventObject) {
        var $treeElement = $('.nw-conversations-item[data-jid="' + eventObject.getFromUserBareJid() + '"]');

        $.each(eventObject.getCapabilities(), function(capability, capable) {
            if(capable) {
                $treeElement.addClass('chat-capability-' + capability);
            } else {
                $treeElement.removeClass('chat-capability-' + capability);
            }
        });

        var roomJid = $treeElement.attr('data-room-jid');

        var room = self.chats[roomJid + "@conference." + megaChat.options.xmppDomain];
        if(room) { // refresh UI if new capabilities were received.
            room.refreshUI();
        }

    });

    // Invite messages
    this.karere.bind("onInviteMessage", function(e, eventObject) {
        if(eventObject.isMyOwn(self.karere) === true) {
            e.stopPropagation();
            return false;
        }
        self.logger.debug(self.karere.getNickname(), "Got invitation to join", eventObject.getRoomJid(), "with eventData:", eventObject);


        var meta = eventObject.getMeta();

        if(meta && meta.type == "private") {

            var bareFromJid = eventObject.getFromJid().split("/")[0];
            Object.keys(self.chats).forEach(function(roomJid) {
                var room = self.chats[roomJid];

                if(roomJid == eventObject.getRoomJid()) {
                    return; // continue
                }

                if(room.type == "private" && room.participantExistsInRoom(bareFromJid, false, true)) {
                    self.logger.debug(self.karere.getNickname(), "Possible invitation duplicate: ", eventObject.getRoomJid(), roomJid, "with eventData:", eventObject);

                    if(self.currentlyOpenedChat == room.roomJid) {
                        room.ctime = meta.ctime;
                        room.syncUsers(meta.participants);
                    }

                    // if not already in
                    if(room.state < ChatRoom.STATE.JOINING) {
                        room.setState(ChatRoom.STATE.JOINING);
                        self.karere.joinChat(eventObject.getRoomJid(), eventObject.getPassword());
                    }

                    e.stopPropagation();
                    return false;
                }
            });

            if(e.isPropagationStopped()) {
                return false;
            }
        }
        if(self.chats[eventObject.getRoomJid()]) { //already joined
            self.logger.warn("I'm already in", eventObject.getRoomJid(), "(ignoring invitation from: ", eventObject.getFromJid(), ")");

            e.stopPropagation();
            return false; // stop doing anything
        }

        // if we are here..then join the room
        self.logger.debug("Initializing UI for new room: ", eventObject.getRoomJid(), "");

        self.chats[eventObject.getRoomJid()] = new ChatRoom(self, eventObject.getRoomJid(), meta.type, meta.participants, meta.ctime);
        self.chats[eventObject.getRoomJid()].setState(ChatRoom.STATE.JOINING);
        self.karere.joinChat(eventObject.getRoomJid(), eventObject.getPassword());


        self.chats[eventObject.getRoomJid()].refreshUI();


        e.stopPropagation();

        return false; // stop propagation, we are manually handling the join on invite case
    });

    var updateMyConnectionStatus = function() {
        self.renderMyStatus();
        self.renderContactTree()
    };


    /**
     * Go throught all megaChat.chats[] and run .startChat so that the user will resume any started conversations,
     * in case of his connection was interuptted
     */
    var recoverChats = function() {
        $.each(self.chats, function(k, v) {
            if(v.state == ChatRoom.STATE.INITIALIZED) {
                v.recover();
            }
        });
    };

    this.karere.bind("onConnected", function() {

        if(localStorage.megaChatPresence) {
            self.karere.setPresence(localStorage.megaChatPresence, undefined, localStorage.megaChatPresenceMtime);
        } else {
            self.karere.setPresence();
        }

        updateMyConnectionStatus();

        recoverChats();
    });
    this.karere.bind("onConnecting", updateMyConnectionStatus);
    this.karere.bind("onConnfail", updateMyConnectionStatus);
    this.karere.bind("onAuthfail", updateMyConnectionStatus);
    this.karere.bind("onDisconnecting", updateMyConnectionStatus);
    this.karere.bind("onDisconnected", function() {
        if(!u_handle) {
            return;
        }

        updateMyConnectionStatus();

        $.each(self.chats, function(k, v) {
            v.setState(ChatRoom.STATE.INITIALIZED, true);
        })
    });

    this.karere.bind("onUsersJoined", function(e, eventData) {
        if(eventData.newUsers[self.karere.getJid()]) {
            // i'm the first of my devices to join the room..notify all my other devices please
            var iAmFirstToJoin = true;
            Object.keys(eventData.currentUsers).forEach(function(k, v) {
                if(k.indexOf(self.karere.getBareJid()) !== -1) {
                    iAmFirstToJoin = false;
                    return false;
                }
            });
            if(iAmFirstToJoin) {
                var room = self.chats[eventData.roomJid];

                if(room) {
                    self.sendBroadcastAction("conv-start", {roomJid: room.roomJid, type: room.type, participants: room.getParticipants()});
                }
            }
        }
        return self._onUsersUpdate("joined", e, eventData);
    });

    this.karere.bind("onUsersLeft", function(e, eventData) {
        return self._onUsersUpdate("left", e, eventData);
    });
    this.karere.bind("onUsersUpdatedDone", function(e, eventObject) {
        if(self.chats[eventObject.getRoomJid()] && (self.chats[eventObject.getRoomJid()].state == ChatRoom.STATE.JOINING || self.chats[eventObject.getRoomJid()].state == ChatRoom.STATE.WAITING_FOR_PARTICIPANTS)) {
            if(self.chats[eventObject.getRoomJid()]._waitingForOtherParticipants() === false) {
                self.chats[eventObject.getRoomJid()].setState(
                    ChatRoom.STATE.PARTICIPANTS_HAD_JOINED
                );
            } else {
                self.chats[eventObject.getRoomJid()].setState(
                    ChatRoom.STATE.WAITING_FOR_PARTICIPANTS
                );
            }
        }
    });


    this.karere.bind("onChatMessage", function() {
        self._onChatMessage.apply(self, toArray(arguments));
    });

    this.karere.bind("onActionMessage", function(e, eventObject) {
        if(eventObject.isMyOwn(self.karere) === true || e.isPropagationStopped() === true) {
            return;
        }

        var room;
        var meta = eventObject.getMeta();
        var fromMyDevice = Karere.getNormalizedBareJid(eventObject.getFromJid()) == self.karere.getBareJid();

        if(eventObject.getAction() == "sync") {
            room = self.chats[meta.roomJid];
            room.sendMessagesSyncResponse(eventObject);
        } else if(eventObject.getAction() == "syncResponse") {
            room = self.chats[meta.roomJid];
            room.handleSyncResponse(eventObject);
        } else if(eventObject.getAction() == "cancel-attachment" && fromMyDevice === true) {
            if(fromMyDevice === true) {
                room = self.chats[meta.roomJid];
                room.cancelAttachment(
                    meta.messageId,
                    meta.nodeId
                );
            }
        } else if(eventObject.getAction() == "conv-end") {
            if(fromMyDevice === true) {
                room = self.chats[meta.roomJid];
                if(room && room._leaving !== true) {
                    room.destroy(false);
                }
            } else {
                //TODO: if this is not a 'private' conversation, there should be no "Close chat" button
                //TODO: add conversation ended class to to the room container
                room = self.chats[meta.roomJid];
                if(room) {
                    room._conversationEnded(eventObject.getFromJid());
                }
            }
        } else if(eventObject.getAction() == "conv-start" && fromMyDevice === true) {
            if(fromMyDevice) {
                room = self.chats[meta.roomJid];
                if(!room) {
                    self.openChat(meta.participants, meta.type);
                }
            } else {
                room = self.chats[meta.roomJid];
                if(!room) {
                    [room.$header, room.$messages].forEach(function(k, v) {
                        $(k).addClass("conv-start")
                            .removeClass("conv-end");
                    });

                }

            }
        } else if(eventObject.getAction() == "delete-message" && fromMyDevice === true) {
            room = self.chats[meta.roomJid];
            if(!room) { return; };

            var msgId = meta.messageId;
            if(!msgId) { return; };

            var msgObject = room.getMessageById(msgId);
            if(!msgObject) { return; };


            // policy required for deleting messages:
            // 1. the delete-message action can only be allowed if the sender of both the action message and target message to be the same
            // 2. the sender == me (applied by using the helper flag: fromMyDevice === true, in the previous if)
            // 3. the message state is NOT_SENT
            if(
                Karere.getNormalizedBareJid(eventObject.getFromJid()) == Karere.getNormalizedBareJid(msgObject.getFromJid()) &&
                msgObject.getState && msgObject.getState() == KarereEventObjects.OutgoingMessage.STATE.NOT_SENT
            ) {
                var meta = clone(msgObject.getMeta());
                meta['isDeleted'] = true;
                msgObject.setMeta(meta); // trigger change event

                $('.fm-chat-message-container[data-id="' + msgId + '"]', room.$messages).remove();
                room.refreshUI();

                var msgIdx = room.messagesIndex[msgId];

                removeValue(room.messagesIndex, msgIdx);
                removeValue(room.messages, msgObject);
                delete msgObject;
            }
        } else {
            self.logger.error("Not sure how to handle action message: ", eventObject.getAction(), eventObject, e);
        }
    });


    this.karere.bind("onComposingMessage", function(e, eventObject) {
        if(Karere.getNormalizedFullJid(eventObject.getFromJid()) == self.karere.getJid()) {
            return;
        }

        var room = self.chats[eventObject.getRoomJid()];
        if(room) {
            var $element = $('.typing-template', room.$messages);

            var contactHashFromJid = self.getContactFromJid(eventObject.getFromJid());

            $('.nw-contact-avatar', $element).replaceWith(room._generateContactAvatarElement(eventObject.getFromJid()));

            // move to the end of the messages
            $element.insertAfter($('.fm-chat-message-container:last', room.$messages));

            $element
                .removeClass("hidden")
                .removeClass("right-block");

            if(contactHashFromJid.u != u_handle) {
                $element.addClass("right-block");
            }

            $element.addClass("typing");



            room.refreshScrollUI();
            room.resized(true);

        }
    });

    this.karere.bind("onPausedMessage", function(e, eventObject) {
        if(Karere.getNormalizedFullJid(eventObject.getFromJid()) == self.karere.getJid()) {
            return;
        }

        var room = self.chats[eventObject.getRoomJid()];

        if(room) {
            var $element = $('.typing-template', room.$messages);

            $element.addClass("hidden").removeClass("typing");
            room.refreshUI(true);
        }
    });

    // UI events
    $(document.body).undelegate('.top-user-status-item', 'mousedown.megachat');

    $(document.body).delegate('.top-user-status-item', 'mousedown.megachat', function() {
        var presence = $(this).data("presence");
        self._myPresence = presence;

        localStorage.megaChatPresence = presence;
        localStorage.megaChatPresenceMtime = unixtime();

        $('.top-user-status-popup').removeClass("active");

        if(self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED && presence != Karere.PRESENCE.OFFLINE) {
            self.connect().done(function() {
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
            });
            return true;
        } else {
            if(presence == Karere.PRESENCE.OFFLINE) {
                self.karere.resetConnectionRetries();
                self.karere.disconnect();
            } else {
                self.karere.resetConnectionRetries();
                self.karere.setPresence(presence, undefined, localStorage.megaChatPresenceMtime);
            }
        }
    });

    $(window).unbind('hashchange.megaChat');
    var lastOpenedRoom = null;
    $(window).bind('hashchange.megaChat' + this.instanceId, function() {
        var room = self.getCurrentRoom();

        if(room && !room.$messages.is(":visible") && room.roomJid != lastOpenedRoom) { // opened window, different then one from the chat ones
            room.hide();
            self.currentlyOpenedChat = null;
        }
        if(lastOpenedRoom && (!room || room.roomJid != lastOpenedRoom)) { // have opened a chat window before, but now
            // navigated away from it
            if(self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
            }
        }
        if(lastOpenedRoom && $('.fm-chat-block').is(".hidden")) { // have opened a chat window before, but now
            // navigated away from it
            if(self.chats[lastOpenedRoom]) {
                self.chats[lastOpenedRoom].hide();
                lastOpenedRoom = null;
            }
        }

        if(room) {
            lastOpenedRoom = room.roomJid;
        } else {
            lastOpenedRoom = null;
        }
        $('.fm-create-chat-button').hide();
    });

    self.$container = $('.fm-chat-block');

    self.$header_tpl = $('.fm-right-header', self.$container).clone().removeClass("template");
    assert(self.$header_tpl.length > 0, "Header template not found.");

    self.$messages_tpl = $('.fm-chat-message-scroll', self.$container).clone().removeClass("template");
    assert(self.$messages_tpl.length > 0, "Messages template not found.");

    self.$message_tpl = $('.message.template', self.$container).clone();
    assert(self.$message_tpl.length > 0, "Message template not found.");

    self.$message_tpl
        .removeClass("template")
        .removeClass("message")
        .removeClass("hidden");

    self.$inline_dialog_tpl = $('.fm-chat-messages-block.inline-dialog.template', self.$container).clone();
    assert(self.$inline_dialog_tpl.length > 0, "Inline dialog template not found.");

    self.$inline_dialog_tpl
        .removeClass("template")
        .removeClass("message")
        .removeClass("hidden");


    // cleanup dom nodes that were used as templates
    $('.fm-right-header', self.$container).remove();
    $('.fm-chat-message-scroll', self.$container).remove();
    $('.fm-chat-messages-block.message.template', self.$container).remove();
    $('.fm-chat-messages-block.inline-dialog.template', self.$container).remove();



    if(self.is_initialized) {
        self.destroy()
            .always(function() {
                self.init();
            });

        return;
    }
    self.is_initialized = true;

    $('.activity-status-block, .activity-status').show();

    if(!localStorage.megaChatPresence || localStorage.megaChatPresence != "unavailable") {
        self.connect()
            .always(function() {
                self.renderMyStatus();
            });
    } else {
        self.renderMyStatus();
    }

    try {
        self.rtc = self.karere.connection.rtc = new RtcSession(self.karere.connection, self.options.rtcSession);
        self.rtc.ftManager.updateGui = function() {
            var uploadAndDownloadSessions = obj_values(this.downloads).concat(obj_values(this.uploads));

            $.each(uploadAndDownloadSessions, function(k, v) {
                if (!v.currentFile()) {
                    return; // continue
                }

                var progress = v.progress()|0;
                var $elem = $('.webrtc-transfer[data-transfer-sid="' + v._sid + '"] .nw-chat-sharing-body[data-file-uniqueid="' + v.currentFile().uniqueId + '"]');

                var title = v.state().text;
                title = (title ? title + ", " : title) + (progress ? progress + "%" : ""); // XX: ah this looks ugly

                $elem.attr("title", title);
                $('.direct-progressbar', $elem).removeClass("hidden");
                $('.progressbarfill', $elem).css('width', progress + "%");

                if(progress == 100) {
                    $('.direct-progressbar', $elem).addClass("hidden");
                }
            });

        };



        self.rtc.statsUrl = "https://karere-stats.developers.mega.co.nz:1378/stats";




        // bind rtc events
        var rtcEventProxyToRoom = function(e, eventData) {
            self.logger.debug("RTC: ", e, eventData);

            var peer = eventData.peer;

            if(peer) {
                var fromBareJid = Karere.getNormalizedBareJid(peer);
                if(fromBareJid == self.karere.getBareJid()) {
                    self.logger.warn("Ignoring my own incoming request.");

                    return;
                }
                var resp = self.openChat([fromBareJid], "private");

                resp[2].done(function(roomJid, room) {
                    room.trigger(e, eventData);
                });
            } else {
                self.logger.warn("Routing RTC event to current room: ", e, eventData);

                // local-stream-obtained = most likely this is the currently active window/room
                var room = self.getCurrentRoom();
                if(room) {
                    room.trigger(e, eventData);
                }
            }


            // TODO: Multi group calls?
        };

        $(self.rtc).on('call-incoming-request', rtcEventProxyToRoom);
        $(self.rtc).on('call-answered', rtcEventProxyToRoom);
        $(self.rtc).on('call-declined', rtcEventProxyToRoom);
        $(self.rtc).on('call-answer-timeout', rtcEventProxyToRoom);
        $(self.rtc).on('call-canceled', rtcEventProxyToRoom);
        $(self.rtc).on('media-recv', rtcEventProxyToRoom);
        $(self.rtc).on('local-stream-connect', rtcEventProxyToRoom);
        $(self.rtc).on('remote-player-remove', rtcEventProxyToRoom);
        $(self.rtc).on('local-player-remove', rtcEventProxyToRoom);
        $(self.rtc).on('local-media-fail', rtcEventProxyToRoom);
        $(self.rtc).on('call-init', rtcEventProxyToRoom);
        $(self.rtc).on('call-ended', rtcEventProxyToRoom);
        $(self.rtc).on('muted', rtcEventProxyToRoom);
        $(self.rtc).on('unmuted', rtcEventProxyToRoom);

        //ftManager proxies

        var _ftSessEndHandler = function(e, eventData) {
            self.logger.debug("RTC ftSessHandler: ", e, eventData);

            var sess = eventData.ftSess;

            var $elem = $('.webrtc-transfer[data-transfer-sid="' + sess._sid + '"]');

            $('.primary-button', $elem).replaceWith(
                $("<em>" + (e.type == "ftsess-remove" ? "Done" : "Canceled") + "</em>")
            );

            if(e.type == "ftsess-remove") { // completed
                $('.nw-chat-sharing-body', $elem).removeAttr('title');
                $('.progressbarfill', $elem).css('width', '100%');
                $('.direct-progressbar', $elem).addClass("hidden");
            }

            var roomJid = $('.webrtc-transfer').parents('.fm-chat-message-scroll').prev().attr("data-room-jid");
            var room = megaChat.chats[roomJid + "@conference." + megaChat.options.xmppDomain];
            if(room) {
                room.refreshUI();
            }
        };
        $(self.rtc.ftManager).on('ftsess-remove', _ftSessEndHandler);
        $(self.rtc.ftManager).on('ftsess-canceled', _ftSessEndHandler);

    } catch(e) {
        // no RTC support.
        self.logger.error("No rtc support: ", e);
    }

    if(self.karere.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() == Karere.CONNECTION_STATE.AUTHFAIL) {
        self.karere.authSetup(
            self.getJidFromNodeId(u_handle),
            self.getMyXMPPPassword()
        );
    }


    // contacts tab update

    self.on('onRoomCreated', function(e, room) {
        if(room.type == "private") {
            var jid = room.getParticipantsExceptMe()[0];
            var c = self.getContactFromJid(jid);

            if(!c) { return; }

            $('#contact_' + c.u + ' .start-chat-button')
                .addClass("active");
        }
    });
    self.on('onRoomDestroy', function(e, room) {
        if(room.type == "private") {
            var jid = room.getParticipantsExceptMe()[0];
            var c = self.getContactFromJid(jid);

            if(!c) { return; }

            $('#contact_' + c.u + ' .start-chat-button')
                .removeClass("active");
        }
        room._cancelCallRequest();
        room._resetCallStateNoCall();
    });
    $(document)
        .unbind('megaulcomplete.megaChat')
        .bind('megaulcomplete.megaChat', function(e, target, ulBunch) {
            // attach to conversation
            var megaRoomId = self.getPrivateRoomJidFor(
                self.getJidFromNodeId(target.replace("chat/", ""))
            )  + "@conference." + self.options.xmppDomain;

            var megaRoom = self.chats[megaRoomId];
            if(!megaRoom) {
                self.logger.error("Room not found for file attachment:", target);
            } else {
                assert(ulBunch && ulBunch.length > 0, 'empty ulBunch');

                megaRoom.attachNodes(ulBunch);

                setTimeout(function() { // because of the transfer panel close
                    self.refreshScrollUI();
                }, 1000);
            }
        });




    $(window)
        .unbind('focus.megaChat')
        .bind('focus.megaChat', function(e) {
            var room = self.getCurrentRoom();
            if(room && room.isActive()) {
                // force re-render
                room.show();
            }
        })
    // always last
    self.trigger("onInit");
};

/**
 * Connect to the XMPP
 *
 * @returns {Deferred}
 */
Chat.prototype.connect = function() {
    var self = this;

    // connection flow already started/in progress?
    if(self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING || (self.karere._$connectingPromise && self.karere._$connectingPromise.state() == 'pending')) {
        return self.karere._$connectingPromise.always(function() {
            self.renderMyStatus();
        });
    }

    self.karere.resetConnectionRetries();

    return self.karere.connect(
                self.getJidFromNodeId(u_handle),
                self.getMyXMPPPassword()
            )
            .always(function() {
                self.renderMyStatus();
            });
};


Chat.prototype._generateIncomingRtcFileMessage = function(room, filesList, sessionId, cancelFunc, acceptFunc) {
    var $message = megaChat.$message_tpl.clone().removeClass("template").addClass("fm-chat-message-container");
    var jid = megaChat.karere.getBareJid();

    var timestamp = unixtime();

    $message.addClass("webrtc-transfer");

    $message.attr("data-transfer-sid", sessionId);

    $('.chat-message-date', $message).text(
        unixtimeToTimeString(timestamp) //time2last is a too bad performance idea.
    );
    var name = megaChat.getContactNameFromJid(jid);
    $('.nw-contact-avatar', $message).replaceWith(room._generateContactAvatarElement(jid));
    $('.chat-username', $message).text(name);

    $.each(filesList, function(k, v) {
        var name = v.name ? v.name : k;

        var $file = $('<div class="nw-chat-sharing-body main-body">' +
            '<div class="nw-chat-icons-area">' +
            '<span class="block-view-file-type ' + fileicon({name: name})+ '"></span>' +
            '</div>' +
            '<div class="nw-chat-sharing-filename">' +
            name +
            '</div>' +
            '<div class="nw-chat-sharing-filesize">' +
            bytesToSize(v.size) +
            '</div>' +
            '<div class="nw-chat-sharing-filesize direct-progressbar hidden"><div class="progressbar"><div class="progressbarfill" style="width: 1%;"></div></div></div>' +
            '<div class="clear"></div>' +
            '</div>');
        $file.attr('data-file-uniqueId', v.uniqueId);

        $('.fm-chat-message', $message).append($file);
    });


    $('.chat-username', $message).after(
        $('<span class="attachment-label"> shared ' + (
            filesList.length == 1 ? " a file" : "files"
            ) + ':</span>')
    );

    $('.chat-message-txt', $message).empty();

    var $cancelButton = $('<div class="fm-chat-file-button primary-button">Cancel</div>');
    $('.chat-message-txt', $message).append($cancelButton);
    $cancelButton.on('click', function() {
        var $p = $(this).parent();
        $(this).replaceWith("<em>Canceled</em>");
        $('.primary-button', $p).remove();

        room.refreshUI();
        cancelFunc();
    });

    if(acceptFunc) {
        var $acceptButton = $('<div class="fm-chat-file-button primary-button">Accept</div>');

        $cancelButton.before($acceptButton);

        $acceptButton.on('click', function() {
            $(this).remove();
            room.refreshUI();
            acceptFunc();
        });
    }

    if(!room.isActive()) {
        $message.addClass('unread');
    }

    return $message;
};

/**
 * Incoming chat message handler
 *
 * @param e
 * @param eventObject {KarereEventObjects.IncomingMessage|KarereEventObjects.OutgoingMessage}
 * @private
 */
Chat.prototype._onChatMessage = function(e, eventObject) {
    var self = this;

    if(e.isPropagationStopped()) {
        return;
    }

    // ignore empty messages (except attachments)
    if(eventObject.isEmptyMessage() && !eventObject.getMeta().attachments) {
        self.logger.debug("Empty message, MegaChat will not process it: ", eventObject);

        return;
    } else {
        self.logger.debug("MegaChat is now processing incoming message: ", eventObject);
    }
    // detect outgoing VS incoming messages here + sync their state

    var room = self.chats[eventObject.getRoomJid()];
    if(room) {
        room.appendMessage(eventObject);
    } else {
        self.logger.error("Room not found: ", eventObject.getRoomJid());
    }
};


/**
 * Incoming Users Update handler
 *
 * @param type
 * @param e
 * @param eventData
 * @private
 */
Chat.prototype._onUsersUpdate = function(type, e, eventObject) {
    var self = this;
    var updatedJids = Object.keys(eventObject.getCurrentUsers());

    var diffUsers = Object.keys(eventObject[type == "joined" ? "getNewUsers" : "getLeftUsers"]());

    if(type == "joined") {
        $.each(diffUsers, function(k, v) {
            updatedJids.push(v);
        })
    } else {
        $.each(diffUsers, function(k, v) {
            var idx = $.inArray(v, updatedJids);
            delete updatedJids[idx];
        });
    }


    // i had joined OR left
    if($.inArray(self.karere.getJid(), diffUsers) != -1) {
        if(type != "joined") { // i'd left
            // i'd left, remove the room and the UI stuff
            if(self.chats[eventObject.getRoomJid()]) {
                self.chats[eventObject.getRoomJid()].destroy(true);
            }
        } else { // i'd joined
            var room = self.chats[eventObject.getRoomJid()];
            if(room) {
                if(room._waitingForOtherParticipants() === false && (
                        room.state == ChatRoom.STATE.WAITING_FOR_PARTICIPANTS || room.state == ChatRoom.STATE.JOINING
                    )
                ) {
                    if (room._conv_ended === true || typeof(room._conv_ended) === 'undefined') {
                        room._conversationStarted(room.getParticipantsExceptMe()[0]);
                    }
                }
            }
        }
    } else { //some one else had joined/left the room
        if(type != "joined") { // they left the room
            //XX: If this is a private room and the only user left count == 1, then destroy the room (an UI elements)

            // this code should trigger timeout immediately if there is a request pending for a user who had left the
            // room
            if(self._syncRequests) {
                $.each(self._syncRequests, function(k, v) {
                    if(v.userJid == diffUsers[0]) {
                        self.logger.log("Canceling sync request from ", v.userJid, ", because he had just left the room.");

                        v.timeoutHandler();
                        clearTimeout(v.timer);
                        return false; // break;
                    }
                })
            }

            var room = room = self.chats[eventObject.getRoomJid()];
            if(room && room.state == ChatRoom.STATE.READY && room._waitingForOtherParticipants()) {
                // other party/ies had left the room
                room.setState(ChatRoom.STATE.WAITING_FOR_PARTICIPANTS);
            }

        } else {
            // they had joined
            var room = self.chats[eventObject.getRoomJid()];
            if(room) {
                if(room._waitingForOtherParticipants() === false && room.state == ChatRoom.STATE.WAITING_FOR_PARTICIPANTS) {
                    if (room._conv_ended === true || typeof(room._conv_ended) === 'undefined') {
                        room._conversationStarted(eventObject.getFromJid());
                    } else {
                        if(room.state == ChatRoom.STATE.WAITING_FOR_PARTICIPANTS) {
                            room.setState(ChatRoom.STATE.PARTICIPANTS_HAD_JOINED);
                        }
                    }
                }
            }
        }
        var room = self.chats[eventObject.getRoomJid()];

        if(!room) {
            return;
        }

        assert(anyOf(updatedJids, "null") === false, "updatedJids should not contain \"null\".");

        room.syncUsers(clone(updatedJids));
        room.refreshUI();
    }
    //TODO: group chats?
};


/**
 * Destroy this MegaChat instance (leave all rooms then disconnect)
 *
 * @returns {*}
 */
Chat.prototype.destroy = function(isLogout) {
    var self = this;
    //
    //localStorage.megaChatPresence = Karere.PRESENCE.OFFLINE;
    //localStorage.megaChatPresenceMtime = unixtime();

    if(self.filePicker) {
        self.filePicker.destroy();
        self.filePicker = null;
    }



    $.each(self.chats, function(roomJid, room) {
        if(!isLogout) {
            room.destroy();
        }
        delete self.chats[roomJid];
    });

    self.karere.resetConnectionRetries();

    return self.karere.disconnect()
        .done(function() {
            self.karere = new Karere({
                'clientName': 'mc',
                'boshServiceUrl': function() { return self.getBoshServiceUrl(); }
            });

            self.is_initialized = false;
        });
};

/**
 * Get ALL contacts from the Mega Contacts list
 *
 * @returns {Array}
 */
Chat.prototype.getContacts = function() {
    var results = [];
    $.each(M.u, function(k, v) {
        if(v.c == 1 || v.c == 2) {
            results.push(v);
        }
    });
    return results;
};

/**
 * Get Contact object from the Mega's Contacts that corresponds to the given jid
 *
 * @param jid {String} full or bare jid...does not mather
 * @returns {Object|null}
 */
Chat.prototype.getContactFromJid = function(jid) {
    var self = this;


    assert(jid, "Missing jid");

    jid = Karere.getNormalizedBareJid(jid); // always convert to bare jid

    var contact = null;
    $.each(M.u, function(k, v) {
        if((v.c == 1 || v.c == 2) && self.getJidFromNodeId(k) == jid) {
            contact = v;
            return false; // break;
        }
    });
    if(!contact) {
        // this can happen if:
        // user A added user B
        // user B's contacts list is still not updated
        // user B receives a XMPP presence info that user A is online and tries to render a DOM element which requires
        // the user's name..so this method gets called.
        if(window.d) {
            //debugger;
        }
    }
    return contact;
};

/**
 * Get formatted contact name from Jid
 *
 * @param jid {String} full/bare jid, does not matter
 * @returns {String|undefined}
 * @throws {AssertionError}
 */
Chat.prototype.getContactNameFromJid = function(jid) {
    var self = this;
    var contact = self.getContactFromJid(jid);

    /* XXX: THIS WONT work in group chats, where all users are not contacts w/ each other, so we will show the jid@ part */

    var name = jid.split("@")[0];


    if(contact && contact.name) {
        name = contact.name;
    } else if(contact && contact.m) {
        name = contact.m;
    }

    assert(name, "Name not found for jid: " + jid);

    return name;
};


/**
 * Helper to convert XMPP presence from string (e.g. 'chat'), to a CSS class (e.g. will return 'online')
 *
 * @param presence {String}
 * @returns {String}
 */
Chat.prototype.xmppPresenceToCssClass = function(presence) {
    if(presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE || presence === true) {
        return 'online';
    } else if(presence == Karere.PRESENCE.AWAY || presence == "xa") {
        return 'away';
    } else if(presence == Karere.PRESENCE.BUSY) {
        return 'busy';
    } else if(!presence || presence == Karere.PRESENCE.OFFLINE) {
        return 'offline';
    } else {
        return 'black';
    }
};

/**
 * Used to re-render my own presence/status
 */
Chat.prototype.renderMyStatus = function() {
    var self = this;

    // reset
    var $status = $('.activity-status-block .activity-status');

    $('.top-user-status-popup .top-user-status-item').removeClass("active");


    $status
        .removeClass('online')
        .removeClass('away')
        .removeClass('busy')
        .removeClass('offline')
        .removeClass('black');



    var presence = self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED ?
                self.karere.getPresence(self.karere.getJid()) :
                localStorage.megaChatPresence;

    var cssClass = self.xmppPresenceToCssClass(
        presence
    );


    if(!presence && self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
        if(!localStorage.megaChatPresence) {
            presence = localStorage.megaChatPresence = "chat"; // default
        } else { // cached
            presence = localStorage.megaChatPresence;
        }

    } else if(self.karere.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTED || self.karere.getConnectionState() == Karere.CONNECTION_STATE.AUTHFAIL || self.karere.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTING) {
        cssClass = "offline";
    }



    if(cssClass == 'online') {
        $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').addClass("active");
    } else if(cssClass == 'away') {
        $('.top-user-status-popup .top-user-status-item[data-presence="away"]').addClass("active");
    } else if(cssClass == 'busy') {
        $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').addClass("active");
    } else if(cssClass == 'offline') {
        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
    } else {
        $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').addClass("active");
    }

    $status.addClass(
        cssClass
    );

    if(self.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING) {
        $status.parent()
            .addClass("connecting");
    } else {
        $status.parent()
            .removeClass("connecting");
    }

};


/**
 * Used to pre/render my contacts statuses + unread counts (in the Tree panel)
 */
Chat.prototype.renderContactTree = function() {
    var self = this;



    // update currently active call (if there is such)

    var $currentCallIndicator = $('.nw-conversations-item.current-calling');

    if(!$currentCallIndicator.is(".hidden")) { // if not hidden (e.g. there is active call)
        var roomJid = $currentCallIndicator.attr('data-jid');
        assert(roomJid, 'room jid is missing from the current call indicator');

        $currentCallIndicator
            .removeClass("online")
            .removeClass("offline")
            .removeClass("busy")
            .removeClass("away")
            .removeClass("no");


        var room = self.chats[roomJid];

        assert(room, 'room not found');

        var participantJid = room.getParticipantsExceptMe()[0];
        var presence = self.karere.getPresence(participantJid);

        var targetClassName = "offline"
        if(!presence || presence == Karere.PRESENCE.OFFLINE) {
            targetClassName = "offline";
        } else if(presence == Karere.PRESENCE.AWAY) {
            targetClassName = "away";
        } else if(presence == Karere.PRESENCE.BUSY) {
            targetClassName = "busy";
        } else if(presence === true || presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE) {
            targetClassName = "online";
        } else {
            targetClassName = "offline";
        }

        $currentCallIndicator.addClass(targetClassName);
    }

    // update conversation list
    // -> add new convs to the ui
    Object.keys(self.chats).forEach(function(k) {
        var megaRoom = self.chats[k];

        if(megaRoom._leaving) {
            return; // continue;
        }

        if($('.nw-conversations-item[data-room-jid="' + k.split("@")[0] + '"]').length != 0) {
            return; // continue;
        }

        if(megaRoom.type == "private") {
            var chatWithJid = megaRoom.getParticipantsExceptMe()[0];
            var contact = self.getContactFromJid(chatWithJid);
            var name = self.getContactNameFromJid(chatWithJid);

            if(contact) {
                var html2 = '<div class="nw-conversations-item offline" id="contact2_' + htmlentities(contact.u) + '" data-room-jid="' + k.split("@")[0] + '" data-jid="' + chatWithJid + '"><div class="nw-contact-status"></div><div class="nw-conversations-unread">0</div><div class="nw-conversations-name">' + htmlentities(name) + '</div></div>';
                $('.content-panel.conversations .conversations-container').prepend(html2);
            } else {
                //self.logger.error("Contacts are still not loaded. Will not show user: ", chatWithJid, " until data for that contact is loaded.");
            }

        } else {
            throw new Error("TBD");
        }
    });

    // -> remove left chats from the ui
    $('.nw-conversations-item[data-room-jid]').each(function() {
        var megaRoom = self.chats[$(this).attr("data-room-jid") + "@" + self.karere.options.mucDomain];
        if(!megaRoom || megaRoom._leaving === true) {
            $(this).remove();
        }
    });



    // update conversation list presence
    $.each(self.getContacts(), function(k, contact) {
        var $element = $('.content-panel.conversations #contact2_' + contact.u);

        var presence = self.karere.getPresence(self.getJidFromNodeId(contact.u));

        var targetClassName = "offline";
        if(!presence || presence == Karere.PRESENCE.OFFLINE) {
            targetClassName = "offline";
        } else if(presence == Karere.PRESENCE.AWAY) {
            targetClassName = "away";
        } else if(presence == Karere.PRESENCE.BUSY) {
            targetClassName = "busy";
        } else if(presence === true || presence == Karere.PRESENCE.ONLINE || presence == Karere.PRESENCE.AVAILABLE) {
            targetClassName = "online";
        } else {
            targetClassName = "offline";
        }



        $('#contact_' + contact.u, '.fm-tree-panel')
            .removeClass("online")
            .removeClass("offline")
            .removeClass("busy")
            .removeClass("away")
            .removeClass("no")
            .addClass(targetClassName);


        // skip if element does not exists
        if($element.length == 0) {
            return;
        }

        $element.removeClass("online");
        $element.removeClass("offline");
        $element.removeClass("busy");
        $element.removeClass("away");
        $element.removeClass("no");



        $element.addClass(targetClassName);

        assert(
            $element.length == 1,
            'nav elements not found (expected 1, got: ' + $element.length + ')'
        );

        $element.attr("data-jid", self.getJidFromNodeId(contact.u));

        if(contact.u != u_handle) {
            $element.unbind("click.megaChat");
            $element.bind("click.megaChat", function(e) {
                window.location = "#fm/chat/" + contact.u;
                e.stopPropagation();
                return false;
            });

            var room = self.chats[
                $element.attr('data-room-jid') + "@" + self.karere.options.mucDomain
                ];
            if(room) {
                room.renderContactTree();
            }
        }
    });
    // update contacts tree
    $('.content-panel.contacts .nw-contact-item').each(function() {
        var $node = $(this);
        var node_id = $node.attr("id");
        if(!node_id) {
            return; // continue;
        }

        var u_h = node_id.replace("contact_", "");

        $('.start-chat-button', $node)
            .show();
    });


    // update the "global" conversation tab unread counter
    var unreadCount = 0;
    for(var k in self.chats) {
        var megaRoom = self.chats[k];
        var c = parseInt($('.nw-conversations-unread', megaRoom.getNavElement()).text());
        unreadCount += c;

        if (unreadCount > 0) {
            $('.new-messages-indicator')
                .text(
                unreadCount
            )
                .removeClass('hidden');
        } else {
            $('.new-messages-indicator')
                .addClass('hidden');
        }
    }
};

/**
 * Reorders the contact tree by last activity (THIS is going to just move DOM nodes, it will NOT recreate them from
 * scratch, the main goal is to be fast and clever.)
 */
Chat.prototype.reorderContactTree = function() {
    var self = this;

    var folders = M.getContacts({
        'h': 'contacts'
    });

    folders = M.sortContacts(folders);

    //TODO: this should use the new HTML code, not #treesub_contacts
    var $container = $('#treesub_contacts');

    var $prevNode = null;
    $.each(folders, function(k, v) {
        var $currentNode = $('#treeli_' + v.u);

        if(!$prevNode) {
            var $first = $('li:first:not(#treeli_' + v.u + ')', $container);
            if($first.length > 0) {
                $currentNode.insertBefore($first);
            } else {
                $container.append($currentNode)
            }
        } else {
            $currentNode.insertAfter($prevNode);
        }


        $prevNode = $currentNode;
    });
};


/**
 * This function is an abstract placeholder that should return JID from a nodeID (e.g. Mega User IDs)
 *
 * @param nodeId {String}
 * @returns {string}
 */
Chat.prototype.getJidFromNodeId = function(nodeId) {
    assert(nodeId, "Missing nodeId for getJidFromNodeId");

    return megaUserIdEncodeForXmpp(nodeId) + "@" + this.options.xmppDomain;
};

/**
 * Placeholder function that should return my password for authenticating w/ the XMPP server
 *
 * @returns {String}
 */
Chat.prototype.getMyXMPPPassword = function() {
    return u_sid ? u_sid.substr(0, 16) : false;
};


/**
 * Open (and show) a new chat
 *
 * @param jids {Array} list of bare jids
 * @param type {String} "private" or "group"
 * @returns [roomJid {string}, room {MegaChatRoom}, {Deferred}]
 */
Chat.prototype.openChat = function(jids, type) {
    var self = this;
    type = type || "private";

    var $promise = new $.Deferred();

    if(type == "private") {
        var $element = $('.nw-conversations-item[data-jid="' + jids[0] + '"]');
        var roomJid = $element.attr('data-room-jid') + "@" + self.karere.options.mucDomain;
        if(self.chats[roomJid]) {
//            self.chats[roomJid].show();
            $promise.resolve(roomJid, self.chats[roomJid]);
            return [roomJid, self.chats[roomJid], $promise];
        } else {
            // open new chat
        }
    }


    var roomJid;
    if(type == "private") {
        roomJid = self.generatePrivateRoomName(jids);
    } else {
        roomJid = self._generateNewRoomIdx();
    }

    if(self.currentlyOpenedChat && self.currentlyOpenedChat != roomJid) {
        self.hideChat(self.currentlyOpenedChat);
        self.currentlyOpenedChat = null;
    }


    var room = new ChatRoom(self, roomJid + "@" + self.karere.options.mucDomain, type, jids, unixtime());

    if(!self.currentlyOpenedChat) {
        room.show();
    }

    self.chats[room.roomJid] = room;

    var tmpJid = room.roomJid;

//    $promise.done(function(roomJid, room) {
//        assert(roomJid, "missing room jid");

        if(self.currentlyOpenedChat === tmpJid) {
            self.currentlyOpenedChat = roomJid;
            if(room) {
                room.show();
            }
        } else {
            if(room) {
                room.refreshUI();
            }
        }
//    });



    if(self.karere.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
        return [roomJid, room, (new $.Deferred()).reject(roomJid, room)];
    }

    var jidsWithoutMyself = room.getParticipantsExceptMe(jids);

    room.setState(ChatRoom.STATE.JOINING);

    var $startChatPromise = self.karere.startChat([], type, roomJid, (type == "private" ? false : undefined));

    $startChatPromise
        .done(function(roomJid) {
            $.each(jidsWithoutMyself, function(k, userJid) {

                if(self.chats[roomJid]) {
                    self.karere.addUserToChat(roomJid, userJid, undefined, type, {
                        'ctime': self.chats[roomJid].ctime,
                        'invitationType': "created",
                        'participants': jids,
                        'users': self.karere.getUsersInChat(roomJid)
                    });
                }
            });

            $promise.resolve(roomJid, self.chats[roomJid]);
        })
        .fail(function() {
            $promise.reject.apply($promise, toArray(arguments));

            if(self.chats[$startChatPromise.roomJid]) {
                self.chats[$startChatPromise.roomJid].destroy(false);
                self.renderContactTree();
            }
        });




    return [roomJid, room, $promise];
};


/**
 * Used to generate unique room JID for private (1on1) chats.
 *
 * @param jids {Array} of BARE jids
 * @returns {string}
 */
Chat.prototype.generatePrivateRoomName = function(jids) {
    var self = this;
    var newJids = clone(jids);
    newJids.sort();
    var roomName = "prv";
    $.each(newJids, function(k, jid) {
        roomName = roomName + "_" + fastHashFunction(jid.split("@")[0]);
    });

    return roomName;
};

/**
 * Returns the currently opened room/chat
 *
 * @returns {null|undefined|Object}
 */
Chat.prototype.getCurrentRoom = function() {
    return this.chats[this.currentlyOpenedChat];
};

/**
 * Returns the currently opened room/chat JID
 *
 * @returns {null|String}
 */
Chat.prototype.getCurrentRoomJid = function() {
    return this.currentlyOpenedChat;
};


/**
 * Hide a room/chat's UI components.
 *
 * @param roomJid
 */
Chat.prototype.hideChat = function(roomJid) {
    var self = this;

    var room = self.chats[roomJid];
    if(room) {
        room.hide();
    } else {
        self.logger.warn("Room not found: ", roomJid);
    }
};


/**
 * Send message to a specific room
 *
 * @param roomJid
 * @param val
 */
Chat.prototype.sendMessage = function(roomJid, val) {
    var self = this;

    // queue if room is not ready.
    if(!self.chats[roomJid]) {
        self.logger.warn("Queueing message for room: ", roomJid, val);

        createTimeoutPromise(function() {
            return !!self.chats[roomJid]
        }, 100, self.options.delaySendMessageIfRoomNotAvailableTimeout)
            .done(function() {
                self.chats[roomJid].sendMessage(val);
            });
    } else {
        self.chats[roomJid].sendMessage(val);
    }
};

/**
 * Simple function that takes care to reposition some elements, when the window is resized
 */
Chat.prototype.resized = function() {
    var self = this;
    var room = self.getCurrentRoom();
    if(room) {
        room.resized();
    }
};


/**
 * Generates a room JID for a private chat with `jid`
 * @param jid {string} this should be a bare jid (however, it will get normalized in case you pass a full jid)
 * @returns {*|jQuery}
 */
Chat.prototype.getPrivateRoomJidFor = function(jid) {
    jid = Karere.getNormalizedBareJid(jid);
    var roomJid = $('.nw-conversations-item[data-jid="' + jid + '"]').attr("data-room-jid");

    assert(roomJid, "Missing private room jid for user jid: " + jid);
    return roomJid;
};



/**
 * Called when a new user is added into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */
Chat.prototype.processNewUser = function(u) {
    var self = this;

    self.logger.debug("added: ", u);


    this.karere.subscribe(megaChat.getJidFromNodeId(u));

    self.renderContactTree();
    self.renderMyStatus();
};

/**
 * Called when a new contact is removed into MEGA
 *
 * @param u {Object} object containing user information (u.u is required)
 */
Chat.prototype.processRemovedUser = function(u) {
    var self = this;

    self.logger.debug("removed: ", u);


    var room = self.getPrivateRoom(u);
    if(room) {
        room.destroy(true);
    }
    this.karere.unsubscribe(megaChat.getJidFromNodeId(u));

    self.renderContactTree();
    self.renderMyStatus();
};


/**
 * Refresh the currently active conversation list in the UI
 */
Chat.prototype.refreshConversations = function() {
    var self = this;

    // remove any dom elements for rooms which were destroyed
    $('.content-panel .conversations .nw-conversations-item').each(function() {
        if($(this).data('chatRoomId') && !self.chats[$(this).data('chatRoomId')]) {
            $(this).remove();
        }
    });

    self.renderContactTree();
};

Chat.prototype.closeChatPopups = function() {
    var activePopup = $('.chat-popup.active');
    var activeButton = $('.chat-button.active');
    activeButton.removeClass('active');
    activePopup.removeClass('active');

    if (activePopup.attr('class')) {
        activeButton.removeClass('active');
        activePopup.removeClass('active');
        if (activePopup.attr('class').indexOf('fm-add-contact-popup') == -1) activePopup.css('left', '-' + 10000 + 'px');
        else activePopup.css('right', '-' + 10000 + 'px');
    }
};


/**
 * Debug helper
 */

Chat.prototype.getChatNum = function(idx) {
    return this.chats[Object.keys(this.chats)[idx]];
};

/**
 * Called when the BOSH service url is requested for Karere to connect. Should return a full URL to the actual
 * BOSH service that should be used for connecting the current user.
 */
Chat.prototype.getBoshServiceUrl = function() {
    var self = this;

    if(localStorage.megaChatUseSandbox) {
        return "https://sandbox.developers.mega.co.nz/http-bind";
    } else {
        var $promise = new MegaPromise();

        $.get("https://" + self.options.loadbalancerService + "/?service=xmpp")
            .done(function(r) {
                if(r.xmpp && r.xmpp.length > 0) {
                    $promise.resolve("https://" + r.xmpp[0].host + ":" + r.xmpp[0].port + "/http-bind");
                } else {
                    $promise.resolve(self.options.fallbackXmppServer);
                }
            })
            .fail(function() {
                self.logger.warn("Could not connect to load balancing service for xmpp, will fallback to: " + self.options.fallbackXmppServer + ".");

                $promise.resolve(self.options.fallbackXmppServer);
            });

        return $promise;
    }
};


/**
 * Called when Conversations tab is opened
 *
 * @returns boolean true if room was automatically shown and false if the listing page is shown
 */
Chat.prototype.renderListing = function() {
    var self = this;

    hideEmptyGrids();

    $('.files-grid-view').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.contacts-grid-view').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.fm-contacts-blocks-view').addClass('hidden');

    $('.fm-right-files-block').removeClass('hidden');

    //$('.nw-conversations-item').removeClass('selected');


    sectionUIopen('conversations');

    if(Object.keys(self.chats).length == 0) {
        $('.fm-empty-conversations').removeClass('hidden');
    } else {
        $('.fm-empty-conversations').addClass('hidden');

        if($('.fm-right-header:visible').length === 0) {
            // show something, instead of a blank/white screen if there are currently opened chats
            if(self.lastOpenedChat && self.chats[self.lastOpenedChat] && self.chats[self.lastOpenedChat]._leaving !== true) {
                // have last opened chat, which is active
                self.chats[self.lastOpenedChat].show();
                return true;
            } else {
                // show first chat from the conv. list
                var $firstConversation = $('.nw-conversations-item:visible[data-room-jid]:first');
                if($firstConversation.length === 1) {
                    self.chats[$firstConversation.attr("data-room-jid") + "@conference." + self.options.xmppDomain].show();
                    return true;
                } else {
                    $('.fm-empty-conversations').removeClass('hidden');
                }
            }
        }
    }
    $('.fm-create-chat-button').show();

    return false;

    //TODO: show something? some kind of list of conversations summary/overview screen or something?
};

/**
 * Broadcast an action (to all of my devices) + optionally to a specific room.
 *
 * @param [toRoomJid] {String}
 * @param action {String}
 * @param [meta] {Object}
 */
Chat.prototype.sendBroadcastAction = function(toRoomJid, action, meta) {
    var self = this;


    if(arguments.length == 2) {
        meta = action;
        action = toRoomJid;
        toRoomJid = undefined;
    }

    var messageId = self.karere.generateMessageId(self.karere.getJid() + (toRoomJid ? toRoomJid : ""), JSON.stringify([action, meta]));

    self.karere.sendAction(self.karere.getBareJid(), action, meta, messageId);
    if(toRoomJid) {
        self.karere.sendAction(toRoomJid, action, meta, messageId);
    }
};

/**
 * Tries to find if there is a opened (private) chat room with user `h`
 *
 * @param h {string} hash of the user
 * @returns {false|ChatRoom}
 */
Chat.prototype.getPrivateRoom = function(h) {
    var self = this;

    var jid = self.getJidFromNodeId(h);

    var found = false;
    Object.keys(self.chats).forEach(function(k) {
        var v = self.chats[k];

        if(v.getParticipantsExceptMe()[0] == jid) {
            found = v;
            return false; // break;
        }
    });

    return found;
};


window.megaChat = new Chat();
