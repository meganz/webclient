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
                .rebind('onCallEnd.CallFeedback', function(e, { showCallFeedback }) {
                    // do append this after a while, so that the remote call ended would be shown first.
                    if (showCallFeedback) {
                        setTimeout(function () {
                            var msgId = 'call-feedback' + unixtime();
                            megaRoom.appendMessage(
                                new ChatDialogMessage({
                                    messageId: msgId,
                                    type: 'call-feedback',
                                    authorContact: M.u[u_handle],
                                    delay: unixtime(),
                                    buttons: {
                                        'noThanks': {
                                            'type': 'secondary',
                                            'classes': 'mega-button',
                                            'text': l[8898],
                                            'callback': function() {
                                                megaRoom.messagesBuff.removeMessageById(msgId);
                                                megaRoom.trigger('resize');
                                            }
                                        },
                                        'sendFeedback': {
                                            'type': 'primary',
                                            'classes': 'mega-button positive',
                                            'text': l[1403],
                                            'callback': function() {
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
                                    }
                                })
                            );
                        });
                    }
                }, 1000);
        });
};
