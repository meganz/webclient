/**
 * Simple class which will show +/- type of rating after a call had finished and will integrate that with the
 * "Feedback" dialog
 *
 * @param megaChat
 * @param options {Object}
 * @returns {CallFeedback}
 * @constructor
 */

const CallFeedback = function(megaChat, options) {
    'use strict';

    options = options || {};
    options.parentLogger = megaChat.logger;

    megaChat
        .rebind('onRoomInitialized.CallFeedback', (e, megaRoom) => {
            megaRoom
                .rebind('onCallLeft.CallFeedback', (e, { callId, chatId, showCallFeedback }) => {
                    // do append this after a while, so that the remote call ended would be shown first.
                    if (showCallFeedback) {
                        delay('callFeedbackDelay', () => {
                            const msgId = `call-feedback ${unixtime()}`;
                            megaRoom.appendMessage(
                                new ChatDialogMessage({
                                    messageId: msgId,
                                    type: 'call-feedback',
                                    authorContact: M.u[u_handle],
                                    delay: unixtime(),
                                    buttons: {
                                        noThanks: {
                                            type: 'secondary',
                                            classes: 'mega-button',
                                            text: l[8898] /* `No Thanks` */,
                                            callback: () => {
                                                megaRoom.messagesBuff.removeMessageById(msgId);
                                                megaRoom.trigger('resize');
                                            }
                                        },
                                        sendFeedback: {
                                            type: 'primary',
                                            classes: 'mega-button positive',
                                            text: l[1403] /* `Send Feedback` */,
                                            callback: function() {
                                                var feedbackDialog = mega.ui.FeedbackDialog.singleton(
                                                    undefined,
                                                    undefined,
                                                    'call-ended'
                                                );
                                                feedbackDialog._type = 'call-ended';
                                                feedbackDialog._callId = callId;
                                                feedbackDialog._chatId = chatId;
                                                feedbackDialog.on('onHide.callEnded', () => {
                                                    megaRoom.messagesBuff.removeMessageById(msgId);
                                                    megaRoom.trigger('resize');
                                                    feedbackDialog._callId = undefined;
                                                    feedbackDialog._chatId = undefined;
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
