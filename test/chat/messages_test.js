/**
 * @fileOverview
 * Chat Message and MessagesBuff tests
 */

describe("chat messages unit test", function () {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;
    var fakeChatRoom = null;
    var fakeChatInt = null;

    var seenMessages = null;
    var receivedMessages = null;

    var debugExpect = function(messagesBuff, messageNum, expectedState) {
        var msg = messagesBuff.messages["messageId" + messageNum];
        assert.strictEqual(
            msg.getState(),
            expectedState,
            (
                'message #' + messageNum + ' was expected to equal: ' +
                constStateToText(Message.STATE, expectedState) + ', but found: ' +
                constStateToText(Message.STATE, msg.getState())
            )
        );
    };
    var debugExpectAtLeast = function(messagesBuff, messageNum, expectedState) {
        var msg = messagesBuff.messages["messageId" + messageNum];
        assert.strictEqual(
            msg.getState() >= expectedState,
            true,
            (
                'message #' + messageNum + ' was expected to >= ' +
                constStateToText(Message.STATE, expectedState) + ', but found: ' +
                constStateToText(Message.STATE, msg.getState())
            )
        );
    };

    var dumpMessagesBuffer = function(messagesBuff) {
        if (!window.d) {
            return;
        }
        for(var i = 1; i <= 32; i++) {
            console.debug(
                'message #' + i + ' is: ' +
                constStateToText(Message.STATE, messagesBuff.messages["messageId" + i].getState()),
                'prev state: ', constStateToText(Message.STATE, messagesBuff.initialStates[i]),
                messagesBuff.messages["messageId" + i].userId === u_handle ? "my msg" : "not mine"
            );
        }
    };



    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        seenMessages = [];
        receivedMessages = [];


        sandbox.stub(window, 'u_handle', 'u12345689');
        if (!window.ChatdPersist) {
            window.ChatdPersist = {};
        }
        if (!window.Chatd) {
            window.Chatd = {};
        }
        sandbox.stub(window, "ChatdPersist", {
                isMasterTab: function () {
                    return false;
                }
            }
        );
        sandbox.stub(window, "Chatd", {
            }
        );

        var fakeChatRoomObj = {
            'STATE': {
                'JOINING': 123
            }
        };

        if (typeof(window.ChatRoom) === 'undefined') {
            window.ChatRoom = fakeChatRoomObj;
        }
        else {
            sandbox.stub(window, 'ChatRoom', fakeChatRoomObj);
        }


        fakeChatRoom = {
            "roomId": "test1@conf.example.com",
            'chatId': "chatdId1",
            "rebind": function() {},
            "trigger": function() {},
            "stateIsLeftOrLeaving": function() {
                return false;
            }
        };

        fakeChatInt = {
            'chatd': {},
            '_getChatRoomFromEventData': function(eventData) {
                return fakeChatRoom;
            },
            'markMessageAsReceived': function(chatRoom, msgId) {
                receivedMessages.push(msgId);
            },
            'markMessageAsSeen': function(chatRoom, msgId) {
                seenMessages.push(msgId);
            },
            retrieveHistory: function() {}
        };

        makeObservable(fakeChatInt.chatd);
    });

    afterEach(function () {
        sandbox.restore();
    });


    var createNewMessagesBuff = function() {
        var messagesBuff = new MessagesBuff(fakeChatRoom, fakeChatInt);

        fakeChatInt.chatd.trigger("onMembersUpdated", {"userId": u_handle, "chatId": fakeChatRoom.chatId, "priv": 3});
        fakeChatInt.chatd.trigger("onMessageLastSeen", {
            "chatId": fakeChatRoom.chatId, "userId": u_handle, "messageId": "messageId16"
        });
        fakeChatInt.chatd.trigger("onMessageLastReceived", {"chatId": fakeChatRoom.chatId, "messageId": "messageId18"});

        fakeChatInt.chatd.trigger("onMessagesHistoryInfo", {
                "chatId": fakeChatRoom.chatId, "oldest": "messageId1", "newest": "messageId32"
            }
        );

        fakeChatInt.chatd.trigger("onMessageCheck", {"chatId": fakeChatRoom.chatId, "messageId": "Mk6iwkSoUzQ"});
        fakeChatInt.chatd.trigger("onMessagesHistoryRequest", {"count": -32, "chatId": fakeChatRoom.chatId});
        for (var i = 0; i < 32; i+=2) {
            fakeChatInt.chatd.trigger("onMessageStore", {
                "chatId": fakeChatRoom.chatId,
                "id": 100000 - i,
                "messageId": "messageId" + (32 - i),
                "userId": u_handle,
                "ts": 1444222368 - i,
                "message": "a" + i,
                "isNew": false
            });
            fakeChatInt.chatd.trigger("onMessageStore", {
                "chatId": fakeChatRoom.chatId,
                "id": 100000 - (i+1),
                "messageId": "messageId" + (32 - (i+1)),
                "userId": "u22345689",
                "ts": 1444222368 - (i+1),
                "message": "a" + (i+1),
                "isNew": false
            });
        }
        fakeChatInt.chatd.trigger("onMessagesHistoryDone", {"chatId": fakeChatRoom.chatId});


        //messagesBuff.messages.forEach(function(v) {
        //    console.error(v.messageId, v.orderValue, v.delay);
        //})


        var bef = {};
        for(var i = 1; i <= 32; i++) {
            bef[i] = messagesBuff.messages["messageId" + i].getState();
        }
        messagesBuff.initialStates = bef;

        return messagesBuff;
    };

    // Somehow, this breaks other unit tests? Why? How? So it can't be left enabled :/
    // describe('MessagesBuff', function () {
    //     it(
    //         "Validate .getLowHighIds is working.",
    //         function (done) {
    //             var messagesBuff = new MessagesBuff(fakeChatRoom, fakeChatInt);
    //
    //             var res = messagesBuff.getLowHighIds();
    //             expect(res).to.eql(false);
    //
    //             for (var i = 0; i < 3; i++) {
    //                 messagesBuff.messages.push(
    //                     {
    //                             'messageId': "fakeTempMessage" + i,
    //                             'orderValue': i
    //                     }
    //                 );
    //             }
    //
    //             expect(messagesBuff.messages.length).to.eql(3);
    //
    //
    //             res = messagesBuff.getLowHighIds();
    //             expect(res).to.eql(false);
    //
    //             for (var i2 = 0; i2 < 2; i2++) {
    //                 messagesBuff.messages.push(
    //                     new Message(
    //                         fakeChatRoom,
    //                         messagesBuff,
    //                         {
    //                             'messageId': "1111111111" + i2,
    //                             'orderValue': 3 + i2
    //
    //                         }
    //                     )
    //                 );
    //             }
    //
    //
    //             expect(messagesBuff.messages.length).to.eql(5);
    //
    //             res = messagesBuff.getLowHighIds();
    //             expect(res).to.eql(['11111111110', '11111111111']);
    //
    //             done();
    //         }
    //     )
    // });

    /*describe('MessagesBuff', function () {
        it(
            "MessagesBuff is populated from chatd events, history is stored in the proper order and seen and " +
            "received are marked properly",
            function () {
                var messagesBuff = createNewMessagesBuff();
                assert.strictEqual(messagesBuff.lastDelivered, "messageId18");
                assert.strictEqual(messagesBuff.lastSeen, "messageId16");
                assert.strictEqual(messagesBuff.messages.length, 32);
                assert.strictEqual(messagesBuff.messages.getItem(0).messageId, 'messageId1');

                debugExpect(messagesBuff, 1, Message.STATE.SEEN);
                debugExpect(messagesBuff, 2, Message.STATE.DELIVERED);
                debugExpect(messagesBuff, 3, Message.STATE.SEEN);
                debugExpect(messagesBuff, 4, Message.STATE.DELIVERED);
                debugExpect(messagesBuff, 5, Message.STATE.SEEN);
                debugExpect(messagesBuff, 6, Message.STATE.DELIVERED);
                // ...
                debugExpect(messagesBuff, 14, Message.STATE.DELIVERED);
                debugExpect(messagesBuff, 15, Message.STATE.SEEN);

                debugExpect(messagesBuff, 16, Message.STATE.DELIVERED);
                debugExpect(messagesBuff, 17, Message.STATE.NOT_SEEN);
                debugExpect(messagesBuff, 18, Message.STATE.DELIVERED);
                debugExpect(messagesBuff, 19, Message.STATE.NOT_SEEN);
                debugExpect(messagesBuff, 20, Message.STATE.SENT);
                debugExpect(messagesBuff, 21, Message.STATE.NOT_SEEN);
                debugExpect(messagesBuff, 22, Message.STATE.SENT);
        });

        it("markAllAsReceived", function () {
            var messagesBuff = createNewMessagesBuff();
            messagesBuff.markAllAsReceived();
            //dumpMessagesBuffer(messagesBuff);

            assert.strictEqual(messagesBuff.lastDelivered, "messageId32");
            assert.strictEqual(messagesBuff.lastSeen, "messageId16");
        });

        it("markAllAsSeen", function () {
            var messagesBuff = createNewMessagesBuff();
            messagesBuff.markAllAsSeen();
            dumpMessagesBuffer(messagesBuff);
            // console.error(messagesBuff.lastSeen, messagesBuff.lastDelivered);
            assert.strictEqual(messagesBuff.lastSeen, "messageId31");
            assert.strictEqual(messagesBuff.lastDelivered, "messageId31");
        });
        it("setLastReceived", function () {
            var messagesBuff = createNewMessagesBuff();
            messagesBuff.setLastReceived(messagesBuff.messages["messageId22"].messageId);
            //dumpMessagesBuffer(messagesBuff);
            debugExpect(messagesBuff, 18, Message.STATE.DELIVERED);
            debugExpect(messagesBuff, 20, Message.STATE.DELIVERED);
            debugExpect(messagesBuff, 22, Message.STATE.DELIVERED);
            assert.strictEqual(messagesBuff.lastDelivered, "messageId22");
        });

    });*/
});
