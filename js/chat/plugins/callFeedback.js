/**
 * Simple class which will show +/- type of rating after a call had finished and will integrate that with the 
 * "Feedback" dialog
 *
 * @param megaChat
 * @param options {Object}
 * @returns {CallFeedback}
 * @constructor
 */
var CallFeedback = function(megaChat, options) {
    var self = this;

    options = options || {};

    options.parentLogger = megaChat.logger;

    megaChat.unbind("onInit.CallFeedback");
    megaChat.bind("onInit.CallFeedback", function(e) {
        self.attachToChat(megaChat)
    });

    return this;
};

/**
 * Entry point, for attaching to a specific `Chat` instance
 *
 * @param megaChat {Chat}
 */
CallFeedback.prototype.attachToChat = function(megaChat) {
    var self = this;

    megaChat
        .unbind('onRoomCreated.CallFeedback')
        .bind('onRoomCreated.CallFeedback', function(e, megaRoom) {
            megaRoom
                .unbind('call-ended.CallFeedback')
                .bind('call-ended.CallFeedback', function(e, eventData) {
                    var msgId = 'call-feedback' + unixtime();
                    megaRoom.appendMessage(
                        new ChatDialogMessage({
                            messageId: msgId,
                            type: 'call-feedback',
                            authorContact: megaChat.getContactFromJid(eventData.peer),
                            delay: unixtime(),
                            buttons: {
                                'sendFeedback': {
                                    'type': 'primary',
                                    'classes': 'default-white-button small-text left',
                                    'icon': 'refresh-circle',
                                    'text': __(l[1403]),
                                    'callback': function() {
                                        var feedbackDialog = mega.ui.FeedbackDialog.singleton(
                                            $(this),
                                            undefined,
                                            "call-ended"
                                        );
                                        feedbackDialog._type = "call-ended";
                                        feedbackDialog.bind('onHide.callEnded', function() {

                                            megaRoom.messagesBuff.removeMessageById(msgId);
                                            megaRoom.trigger('resize');

                                            feedbackDialog.unbind('onHide.callEnded');
                                        });
                                    }
                                },
                                'noThanks': {
                                    'type': 'secondary',
                                    'classes': 'default-white-button small-text left red',
                                    'text': __(l[8898]),
                                    'callback': function() {
                                        megaRoom.messagesBuff.removeMessageById(msgId);
                                        megaRoom.trigger('resize');
                                    }
                                }
                            }
                        })
                    );
                });
        });
};
