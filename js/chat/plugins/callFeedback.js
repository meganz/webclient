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

    megaChat
        .rebind('onRoomInitialized.CallFeedback', function(e, megaRoom) {
            megaRoom
                .rebind('call-ended.CallFeedback', function(e, eventData) {
                    // do append this after a while, so that the remote call ended would be shown first.
                    setTimeout(function () {
                        var msgId = 'call-feedback' + unixtime();
                        megaRoom.appendMessage(
                            new ChatDialogMessage({
                                messageId: msgId,
                                type: 'call-feedback',
                                authorContact: eventData.getPeer(),
                                delay: unixtime(),
                                buttons: {
                                    'sendFeedback': {
                                        'type': 'primary',
                                        'classes': 'default-white-button small-text left',
                                        'icon': 'refresh-circle',
                                        'text': l[1403],
                                        'callback': function () {
                                            var feedbackDialog = mega.ui.FeedbackDialog.singleton(
                                                undefined,
                                                undefined,
                                                "call-ended"
                                            );
                                            feedbackDialog._type = "call-ended";
                                            feedbackDialog.on('onHide.callEnded', function () {

                                                megaRoom.messagesBuff.removeMessageById(msgId);
                                                megaRoom.trigger('resize');

                                                feedbackDialog.off('onHide.callEnded');
                                            });
                                        }
                                    },
                                    'noThanks': {
                                        'type': 'secondary',
                                        'classes': 'default-white-button small-text left red',
                                        'text': l[8898],
                                        'callback': function () {
                                            megaRoom.messagesBuff.removeMessageById(msgId);
                                            megaRoom.trigger('resize');
                                        }
                                    }
                                }
                            })
                        );
                    });
                }, 1000);
        });
};
