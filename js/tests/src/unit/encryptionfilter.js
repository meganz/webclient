describe("EncryptionFilter", function() {


    var MegaChatKls;
    var KarereKls = function() {

        this.getJid = function() {
            return "user1@jid.com/res";
        };

        this.sendPing = function() {
            var $promise = new $.Deferred();
            $promise.resolve();

            return $promise;
        };

        this.sendRawMessage = function() {};
    };

    var currentOrderedUsers = [];

    MegaChatKls = function() {
        this.karere = new KarereKls();

        var self = this;

        self.chats = {};

        $.each([
            'room1',
            'room2'
            ],
            function(k, v) {
                self.chats[v + "@conference.jid.com"] = {
                    'megaChat': self,
                    'appendDomMessage': function() {},
                    'generateInlineDialog': function() {},
                    'encryptionHandler': {
                        'processMessage': function() {},
                        'askeMember': {
                            'members': []
                        }
                    },
                    'encryptionOpQueue': {
                        'queue': function() {
                            console.warn("queue:", toArray(arguments));
                        }
                    },
                    'setState': function(newState) {
                        this.state = newState;
                    },
                    getOrderedUsers: function() {
                        return currentOrderedUsers;
                    },
                    getUsers: function() {
                        return {};
                    },
                    'roomJid': v + "@conference.jid.com"
                };
            }
        );
    };


    makeObservable(KarereKls);
    makeObservable(MegaChatKls);


    var genDummyEvent = function() {
        return {
            'isPropagationStopped': function() { return false },
            'stopPropagation': function() { }
        };
    };


    var megaChatObj;
    var encryptionFilter;
    var encryptionFilterMocker;
    var megaChatMocker;

    beforeEach(function(done) {
        // create dummy megaChat obj


        megaChatObj = new MegaChatKls();

        var mockedFns = ObjectMocker.generateMockArrayFor(megaChatObj);

        megaChatMocker = new ObjectMocker(megaChatObj, mockedFns);





        encryptionFilter = new EncryptionFilter(megaChatObj);

        var encryptionFilterMockedFns = ObjectMocker.generateMockArrayFor(encryptionFilter);
        encryptionFilterMocker = new ObjectMocker(encryptionFilter, encryptionFilterMockedFns);

        done();
    });


    afterEach(function(done) {
        megaChatMocker.restore();
        megaChatObj = null;
        encryptionFilter = null;

        done();
    });


    it("messageShouldNotBeEncrypted", function(done) {
        /**
         * Action Message
         */
        expect(
            encryptionFilter.messageShouldNotBeEncrypted(
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "type",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgid",
                    /* rawMessage */ "none",
                    /* roomJid */ "room@jid.com",
                    /* meta */ {'action': 'action'},
                    /* contents */ "",
                    /* elements */ undefined,
                    /* delay */ undefined
                )
            )
        ).not.to.be.ok;


        /**
         * Message with no contents (e.g. some kind of system message)
         */
        expect(
            encryptionFilter.messageShouldNotBeEncrypted(
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "type",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgid",
                    /* rawMessage */ "none",
                    /* roomJid */ "room@jid.com",
                    /* meta */ {},
                    /* contents */ "",
                    /* elements */ undefined,
                    /* delay */ undefined
                )
            )
        ).to.be.ok;

        /**
         * File attachment message
         */
        expect(
            encryptionFilter.messageShouldNotBeEncrypted(
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "type",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgid",
                    /* rawMessage */ "none",
                    /* roomJid */ "room@jid.com",
                    /* meta */ {'attachments': ['whatever']},
                    /* contents */ "",
                    /* elements */ undefined,
                    /* delay */ undefined
                )
            )
        ).not.to.be.ok;


        /**
         * text message
         */
        expect(
            encryptionFilter.messageShouldNotBeEncrypted(
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "type",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgid",
                    /* rawMessage */ "none",
                    /* roomJid */ "room@jid.com",
                    /* meta */ {},
                    /* contents */ "hi there!",
                    /* elements */ undefined,
                    /* delay */ undefined
                )
            )
        ).not.to.be.ok;

        done();
    });

    describe("flushQueue", function() {

        var genEmptyHandler = function() {
            return {
                'protocolOutQueue': [],
                'messageOutQueue': [],
                'uiQueue': []
            }
        };

        var handler;

        it("protocolOut - direct message", function(done) {
            handler = genEmptyHandler();
            handler.protocolOutQueue.push({
                'to': 'direct@jid.com',
                'message': 'message',
                'metadata': {
                    'roomJid': 'room1@conference.jid.com',
                    'messageId': '12',
                    'delay': '123'
                }
            });
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.protocolOutQueue.length).to.eql(0);

            expect(megaChatObj.karere.sendRawMessage.getCall(0).args).to.eql(
                [
                    "direct@jid.com",
                    "chat",
                    "message",
                    {
                        roomJid: "room1@conference.jid.com"
                    },
                    "12",
                    "123"
                ]
            );

            done();
        });

        it("protocolOut - groupchat message", function(done) {
            handler = genEmptyHandler();
            handler.protocolOutQueue.push({
                'message': 'message',
                'metadata': {
                    'roomJid': 'room1@conference.jid.com',
                    'messageId': '12',
                    'delay': '123'
                }
            });
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.protocolOutQueue.length).to.eql(0);

            expect(megaChatObj.karere.sendRawMessage.getCall(0).args).to.eql(
                [
                    "room1@conference.jid.com",
                    "groupchat",
                    "message",
                    {
                        roomJid: "room1@conference.jid.com"
                    },
                    "12",
                    "123"
                ]
            );

            done();
        });

        it("messageOutQueue - direct message", function(done) {
            handler = genEmptyHandler();
            handler.messageOutQueue.push({
                'to': 'direct@jid.com',
                'message': 'message',
                'metadata': {
                    'roomJid': 'room1@conference.jid.com',
                    'messageId': '12',
                    'delay': '123'
                }
            });
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.messageOutQueue.length).to.eql(0);

            expect(megaChatObj.karere.sendRawMessage.getCall(0).args).to.eql(
                [
                    "direct@jid.com",
                    "chat",
                    "message",
                    {
                        roomJid: "room1@conference.jid.com"
                    },
                    "12",
                    "123"
                ]
            );

            done();
        });

        it("messageOutQueue - groupchat message", function(done) {
            handler = genEmptyHandler();
            handler.messageOutQueue.push({
                'message': 'message',
                'metadata': {
                    'roomJid': 'room1@conference.jid.com',
                    'messageId': '12',
                    'delay': '123'
                }
            });
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.messageOutQueue.length).to.eql(0);

            expect(megaChatObj.karere.sendRawMessage.getCall(0).args).to.eql(
                [
                    "room1@conference.jid.com",
                    "groupchat",
                    "message",
                    {
                        roomJid: "room1@conference.jid.com"
                    },
                    "12",
                    "123"
                ]
            );

            done();
        });


        it("uiQueue - message - action", function(done) {
            handler = genEmptyHandler();
            handler.uiQueue.push(
                {
                    'type': 'message',
                    'messageId': 'msgId',
                    'fromJid': 'from@jid.com',
                    'toJid': 'toJid@jid.com',
                    'delay': 123,
                    'message': JSON.stringify([
                        {

                        },
                        {
                            'action': 'action',
                            'additionalMeta': true
                        }
                    ])
                }
            );
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.uiQueue.length).to.eql(0);

            expect(megaChatObj.karere.trigger.getCall(0).args[0]).to.eql("onActionMessage");

            expect(JSON.stringify(megaChatObj.karere.trigger.getCall(0).args[1][0])).to.eql(
                JSON.stringify(
                    {
                        "toJid": "toJid@jid.com",
                        "fromJid": "from@jid.com",
                        "messageId": "msgId",
                        "action": "action",
                        "meta":{
                            "action": "action",
                            'additionalMeta': true
                        },
                        "delay": 123
                    }
                )
            );

            done();
        });

        it("uiQueue - message - incoming message", function(done) {
            handler = genEmptyHandler();
            handler.uiQueue.push(
                {
                    'type': 'message',
                    'messageId': 'msgId',
                    'fromJid': 'from@jid.com',
                    'toJid': 'toJid@jid.com',
                    'roomJid': 'room1@conference.jid.com',
                    'rawType': 'groupchat',
                    'delay': 123,
                    'message': JSON.stringify([
                        "hello world",
                        {
                            'additionalMeta': true
                        }
                    ])
                }
            );
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.uiQueue.length).to.eql(0);

            expect(megaChatObj.karere.trigger.getCall(0).args[0]).to.eql("onChatMessage");

            expect(JSON.stringify(megaChatObj.karere.trigger.getCall(0).args[1][0])).to.eql(
                JSON.stringify(
                    {
                        "toJid": "toJid@jid.com",
                        "fromJid": "from@jid.com",
                        "type": "Message",
                        "rawType": "groupchat",
                        "messageId": "msgId",
                        "rawMessage": null,
                        "roomJid": "room1@conference.jid.com",
                        "meta":{
                            'additionalMeta': true
                        },
                        "contents": "hello world",
                        "elements": "",
                        "delay": 123
                    }
                )
            );

            done();
        });


        it("uiQueue - notification from mpENC", function(done) {
            handler = genEmptyHandler();
            handler.uiQueue.push(
                {
                    'type': 'warning',
                    'message': "hello world"
                }
            );
            encryptionFilter.flushQueue(megaChatObj.chats["room1@conference.jid.com"], handler);

            expect(handler.uiQueue.length).to.eql(0);

            expect(megaChatObj.chats["room1@conference.jid.com"].generateInlineDialog.getCall(0).args[0]).to.eql("mpEnc-ui-" + "warning");
            expect(megaChatObj.chats["room1@conference.jid.com"].generateInlineDialog.getCall(0).args[1]).to.eql("hello world");

            done();
        });
    });

    describe("processIncoming", function() {
        it("direct message - valid room", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];
            room.getUsers = function() {
                return {
                    'from@jid.com': "owner"
                };
            };


            encryptionFilter.processIncomingMessage(
                genDummyEvent(),
                new KarereEventObjects.IncomingPrivateMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "Message",
                    /* rawType */ "chat",
                    /* messageId */ "msgId",
                    /* rawMessage */ null,
                    /* meta */ {},
                    /* message */ EncryptionFilter.MPENC_MSG_TAG + "[encrypted contents]",
                    /* elements */ null,
                    /* delay */ 123
                ),
                megaChatObj.karere
            );

            expect(room.encryptionHandler.processMessage.callCount).to.eql(1);

            expect(
                JSON.stringify(room.encryptionHandler.processMessage.getCall(0).args[0])
            ).to.eql(
                    '{"toJid":"to@jid.com","fromJid":"from@jid.com","type":"Message","rawType":"chat","messageId":"msgId","rawMessage":null,"meta":{},"message":"?mpENC:[encrypted contents]","elements":"","delay":123,"from":"from@jid.com"}'
                );

            done();
        });

        it("direct message - invalid room", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];
            room.getUsers = function() {
                return {
                    'from@jid.com': "owner"
                };
            };


            encryptionFilter.processIncomingMessage(
                genDummyEvent(),
                new KarereEventObjects.IncomingPrivateMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "fromINVALID@jid.com",
                    /* type */ "Message",
                    /* rawType */ "chat",
                    /* messageId */ "msgId",
                    /* rawMessage */ null,
                    /* meta */ {},
                    /* message */ EncryptionFilter.MPENC_MSG_TAG + "[encrypted contents]",
                    /* elements */ null,
                    /* delay */ 123
                ),
                megaChatObj.karere
            );

            expect(room.encryptionHandler.processMessage.callCount).to.eql(0);


            done();
        });


        it("group chat message", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            encryptionFilter.processIncomingMessage(
                genDummyEvent(),
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "Message",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgId",
                    /* rawMessage */ null,
                    /* roomJid */ "room1@conference.jid.com",
                    /* meta */ {
                        'additionalMeta': true
                    },
                    /* message */ EncryptionFilter.MPENC_MSG_TAG + "[encrypted contents]",
                    /* elements */ null,
                    /* delay */ 123
                ),
                megaChatObj.karere
            );

            expect(room.encryptionHandler.processMessage.callCount).to.eql(1);

            expect(
                JSON.stringify(room.encryptionHandler.processMessage.getCall(0).args[0])
            ).to.eql(
                    '{"toJid":"to@jid.com","fromJid":"from@jid.com","type":"Message","rawType":"groupchat","messageId":"msgId","rawMessage":null,"roomJid":"room1@conference.jid.com","meta":{"additionalMeta":true},"contents":"?mpENC:[encrypted contents]","elements":"","delay":123,"message":"?mpENC:[encrypted contents]","from":"from@jid.com"}'
                );

            done();
        });


        it("plaintext message", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            encryptionFilter.processIncomingMessage(
                genDummyEvent(),
                new KarereEventObjects.IncomingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "Message",
                    /* rawType */ "groupchat",
                    /* messageId */ "msgId",
                    /* rawMessage */ null,
                    /* roomJid */ "room1@conference.jid.com",
                    /* meta */ {
                        'additionalMeta': true
                    },
                    /* message */ "plaintext message",
                    /* elements */ null,
                    /* delay */ 123
                ),
                megaChatObj.karere
            );

            expect(room.encryptionHandler.processMessage.callCount).to.eql(0);

            done();
        });

    });

    describe("processOutgoing", function() {
        it("direct message (sendTo)", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            encryptionFilter.processOutgoingMessage(
                genDummyEvent(),
                new KarereEventObjects.OutgoingMessage(
                    /* toJid */ "to@jid.com",
                    /* fromJid */ "from@jid.com",
                    /* type */ "action",
                    /* messageId */ "msgId",
                    /* contents */ "[plain text message contents]",
                    /* meta */ {
                        'roomJid': room.roomJid
                    },
                    /* delay */ 123
                ),
                megaChatObj.karere
            );
            expect(room.encryptionOpQueue.queue.callCount).to.eql(1);

            expect(JSON.stringify(room.encryptionOpQueue.queue.getCall(0).args)).to.eql(
                '["sendTo","[\\"[plain text message contents]\\",{\\"roomJid\\":\\"room1@conference.jid.com\\"}]","to@jid.com",{"messageId":"msgId","roomJid":"room1@conference.jid.com","delay":123}]'
            );


            done();
        });

        it("group message (send)", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            encryptionFilter.processOutgoingMessage(
                genDummyEvent(),
                new KarereEventObjects.OutgoingMessage(
                    /* toJid */ room.roomJid,
                    /* fromJid */ "from@jid.com",
                    /* type */ "groupchat",
                    /* messageId */ "msgId",
                    /* contents */ "[plain text message contents]",
                    /* meta */ {
                        'additionalMeta': true
                    },
                    /* delay */ 123
                ),
                megaChatObj.karere
            );

            expect(room.encryptionOpQueue.queue.callCount).to.eql(1);

            expect(JSON.stringify(room.encryptionOpQueue.queue.getCall(0).args)).to.eql(
                '["send","[\\"[plain text message contents]\\",{\\"additionalMeta\\":true}]",{"messageId":"msgId","delay":123}]'
            );


            done();
        });
    });

    describe("Events plugin handler state/flow", function() {
        // syncRoomUsersWithEncMembers
        // onRoomCreated
        // onRoomDestroy
        // onUsersUpdatedDone (i'm room leader)
        // onUsersLeft and onUsersJoined (i'm room leader)

        it("onRoomCreated", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            var origMockedHandler = room.encryptionHandler;
            var origMockedOpQueue = room.encryptionOpQueue;

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionHandler instanceof mpenc.handler.ProtocolHandler).to.be.ok;

            room.encryptionHandler = origMockedHandler;
            room.encryptionOpQueue = origMockedOpQueue;

            room.state = MegaChatRoom.STATE.INITIALIZED;
            expect(room.state).to.eql(MegaChatRoom.STATE.INITIALIZED);

            done();
        });

        it("onRoomCreated, onUsersJoined, onUsersLeft, syncRoomUsersWithEncMembers (i'm a room owner)", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            var origMockedHandler = room.encryptionHandler;
            var origMockedOpQueue = room.encryptionOpQueue;

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionHandler instanceof mpenc.handler.ProtocolHandler).to.be.ok;

            room.encryptionHandler = origMockedHandler;
            room.encryptionOpQueue = origMockedOpQueue;

            room.state = MegaChatRoom.STATE.INITIALIZED;
            expect(room.state).to.eql(MegaChatRoom.STATE.INITIALIZED);



            room.encryptionHandler.state = mpenc.handler.STATE.NULL;

            var newUsers = {
                'user2@jid.com': 'owner'
            };

            newUsers[megaChatObj.karere.getJid()] = 'owner'; //add myself

            // set myself as owner
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid(),
                    Object.keys(newUsers)[0]
                ];
            };


                megaChatObj.karere.trigger("onUsersUpdatedDone", new KarereEventObjects.UsersUpdated(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ newUsers,
                /* newUsers */ newUsers,
                /* leftUsers */ {}
            ));

            expect(room.iHadJoined).to.be.ok;

            // first user = me (no ping required), second = already in the room (requires ping)
            expect(room.megaChat.karere.sendPing.callCount).to.eql(1, 'sendPing should have been called once when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(1, 'syncRoomUsersWithEncMembers was not called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(1, '.encryptionOpQueue.queue was not called.');
            expect(
                JSON.stringify(room.encryptionOpQueue.queue.getCall(0).args)
            ).to.eql(
                    '["start",["user2@jid.com"]]',
                    'invalid queued Op in the encOpQueue (expected start)'
                );

            // prepare required state of encryptionHandler
            room.encryptionHandler.state = mpenc.handler.STATE.READY;
            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            // user joined after me
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid(),
                    "user2@jid.com",
                    "user3@jid.com"
                ];
            };

            megaChatObj.karere.trigger("onUsersJoined", new KarereEventObjects.UsersJoined(
                /* fromJid */ room.roomJid,
                 /* toJid */ megaChatObj.karere.getJid(),
                 /* roomJid */ room.roomJid,
                 /* currentUsers */ room.getParticipants(),
                 /* newUsers */ {
                    "user3@jid.com": "owner"
                }
            ));

            expect(room.megaChat.karere.sendPing.callCount).to.eql(3, 'sendPing should have been called once when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(2, 'syncRoomUsersWithEncMembers was not called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(2, '.encryptionOpQueue.queue was not called.');
            expect(
                JSON.stringify(room.encryptionOpQueue.queue.getCall(1).args)
            ).to.eql(
                    '["join",["user3@jid.com"]]',
                    'invalid queued Op in the encOpQueue (expected join)'
                );

            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            // on users left
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid(),
                    "user2@jid.com"
//                    "user3@jid.com" // <- left
                ];
            };
            megaChatObj.karere.trigger("onUsersLeft", new KarereEventObjects.UsersLeft(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ room.getParticipants().concat(["user3@jid.com"]),
                /* leftUser */ {
                    "user3@jid.com": "none"
                }
            ));

            expect(room.megaChat.karere.sendPing.callCount).to.eql(4, 'sendPing should have been called when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(3, 'syncRoomUsersWithEncMembers was not called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(3, '.encryptionOpQueue.queue was not called.');
            expect(
                JSON.stringify(room.encryptionOpQueue.queue.getCall(2).args)
            ).to.eql(
                    '["exclude",["user3@jid.com"]]',
                    'invalid queued Op in the encOpQueue (expected exclude)'
                );

            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            done();
        });

        it("onRoomCreated, onUsersJoined, onUsersLeft, syncRoomUsersWithEncMembers (i'm NOT a room owner)", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];


            var origMockedHandler = room.encryptionHandler;
            var origMockedOpQueue = room.encryptionOpQueue;

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionHandler instanceof mpenc.handler.ProtocolHandler).to.be.ok;

            room.encryptionHandler = origMockedHandler;
            room.encryptionOpQueue = origMockedOpQueue;

            room.state = MegaChatRoom.STATE.INITIALIZED;
            expect(room.state).to.eql(MegaChatRoom.STATE.INITIALIZED);



            room.encryptionHandler.state = mpenc.handler.STATE.NULL;

            var newUsers = {
                'user2@jid.com': 'owner'
            };

            newUsers[megaChatObj.karere.getJid()] = 'owner'; //add myself

            // set myself as owner
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    Object.keys(newUsers)[0],
                    megaChatObj.karere.getJid()
                ];
            };


                megaChatObj.karere.trigger("onUsersUpdatedDone", new KarereEventObjects.UsersUpdated(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ newUsers,
                /* newUsers */ newUsers,
                /* leftUsers */ {}
            ));

            expect(room.iHadJoined).to.be.ok;

            // first user = me (no ping required), second = already in the room (requires ping)
            expect(room.megaChat.karere.sendPing.callCount).to.eql(0, 'sendPing should NOT have been called once when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(0, 'syncRoomUsersWithEncMembers should not have been called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(0, '.encryptionOpQueue.queue should NOT have been called.');


            // prepare required state of encryptionHandler
            room.encryptionHandler.state = mpenc.handler.STATE.READY;
            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            // user joined after me
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    "user2@jid.com",
                    megaChatObj.karere.getJid(),
                    "user3@jid.com"
                ];
            };

            megaChatObj.karere.trigger("onUsersJoined", new KarereEventObjects.UsersJoined(
                /* fromJid */ room.roomJid,
                 /* toJid */ megaChatObj.karere.getJid(),
                 /* roomJid */ room.roomJid,
                 /* currentUsers */ room.getParticipants(),
                 /* newUsers */ {
                    "user3@jid.com": "owner"
                }
            ));

            expect(room.megaChat.karere.sendPing.callCount).to.eql(0, 'sendPing should NOT have been called once when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(0, 'syncRoomUsersWithEncMembers should not have been called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(0, '.encryptionOpQueue.queue should NOT have been called.');

            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            // on users left
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    "user2@jid.com",
                    megaChatObj.karere.getJid()
//                    "user3@jid.com" // <- left
                ];
            };
            megaChatObj.karere.trigger("onUsersLeft", new KarereEventObjects.UsersLeft(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ room.getParticipants().concat(["user3@jid.com"]),
                /* leftUser */ {
                    "user3@jid.com": "none"
                }
            ));

            expect(room.megaChat.karere.sendPing.callCount).to.eql(0, 'sendPing should NOT have been called once when tried confirm the currently ACTIVE members in the room');

            expect(encryptionFilter.syncRoomUsersWithEncMembers.callCount).to.eql(0, 'syncRoomUsersWithEncMembers should not have been called.');
            expect(room.encryptionOpQueue.queue.callCount).to.eql(0, '.encryptionOpQueue.queue should NOT have been called.');

            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            done();
        });

        it("onRoomDestroy", function(done) {
            var room = megaChatObj.chats["room1@conference.jid.com"];

            var origMockedOpQueue = room.encryptionOpQueue;

            megaChatObj.trigger("onRoomDestroy", room);

            expect(origMockedOpQueue.queue.callCount).to.eql(1);
            expect(origMockedOpQueue.queue.getCall(0).args[0]).to.eql("quit");

            done();
        });
    });

    describe("onPluginsWait flow", function() {
        it("onUsersUpdatedDone to set the state to PLUGINS_READY and PLUGINS_WAIT", function(done) {

            var room = megaChatObj.chats["room1@conference.jid.com"];

            var origMockedHandler = room.encryptionHandler;
            var origMockedOpQueue = room.encryptionOpQueue;

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionHandler instanceof mpenc.handler.ProtocolHandler).to.be.ok;

            room.encryptionHandler = origMockedHandler;
            room.encryptionOpQueue = origMockedOpQueue;

            room.state = MegaChatRoom.STATE.INITIALIZED;
            expect(room.state).to.eql(MegaChatRoom.STATE.INITIALIZED);



            room.encryptionHandler.state = mpenc.handler.STATE.NULL;

            var newUsers = {};

            newUsers[megaChatObj.karere.getJid()] = 'owner'; //add myself

            // set myself as owner
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid()
                ];
            };

            room.state =  MegaChatRoom.STATE.PLUGINS_WAIT;
            megaChatObj.karere.trigger("onUsersUpdatedDone", new KarereEventObjects.UsersUpdated(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ newUsers,
                /* newUsers */ newUsers,
                /* leftUsers */ {}
            ));

            expect(room.iHadJoined).to.be.ok;
            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_READY, "Room State was not changed to PLUGINS_READY");

            room.state =  MegaChatRoom.STATE.PLUGINS_WAIT;
            newUsers[megaChatObj.karere.getJid() + "/user2"] = 'owner'; //add second user

            // set myself as owner
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid(),
                    megaChatObj.karere.getJid() + "/user2"
                ];
            };

            megaChatObj.karere.trigger("onUsersUpdatedDone", new KarereEventObjects.UsersUpdated(
                /* fromJid */ room.roomJid,
                /* toJid */ megaChatObj.karere.getJid(),
                /* roomJid */ room.roomJid,
                /* currentUsers */ newUsers,
                /* newUsers */ newUsers,
                /* leftUsers */ {}
            ));

            expect(room.iHadJoined).to.be.ok;
            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_WAIT, "Room State should not have been changed (e.g. should be PLUGINS_WAIT");



            done();
        });

        it("onPluginsWait", function(done) {
            var e;

            e = new $.Event("onPluginsWait");
            megaChatObj.trigger(e, {
                encryptionHandler: {
                    state: mpenc.handler.STATE.INITIALISED
                },
                setState: function(newState) {
                    e.stateChanged = newState;
                }
            });

            expect(e.isPropagationStopped()).not.to.be.ok;

            e = new $.Event("onPluginsWait");
            megaChatObj.trigger(e, {
                encryptionHandler: {
                    state: mpenc.handler.STATE.NULL
                },
                setState: function(newState) {
                    e.stateChanged = newState;
                }
            });
            expect(e.isPropagationStopped()).to.be.ok;

            expect(e.stateChanged).to.eql(MegaChatRoom.STATE.PLUGINS_PAUSED);

            done();
        });

    });

    describe("OpQueue .validateFn and .recoverFailFn", function() {
        it(".validateFn", function(done) {
            // initialize encryptionOpQueue
            var room = megaChatObj.chats["room1@conference.jid.com"];

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionOpQueue instanceof OpQueue).to.be.ok;

            var opQueue = room.encryptionOpQueue;


            // quit
            opQueue.ctx = {
                'state': mpenc.handler.STATE.NULL
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "quit"
                    ]
                )
            )
                .not.to.be.ok;

            // recover
            opQueue.ctx = {
                'state': mpenc.handler.STATE.AUX_DOWNFLOW
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "recover"
                    ]
                )
            )
                .to.be.ok;

            // start
            opQueue.ctx = {
                'state': mpenc.handler.STATE.NULL
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "recover"
                    ]
                )
            )
                .to.be.ok;


            // else 1 - true
            opQueue.ctx = {
                'state': mpenc.handler.STATE.NULL
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "whatever"
                    ]
                )
            )
                .to.be.ok;

            // else 2 - true
            opQueue.ctx = {
                'state': mpenc.handler.STATE.INITIALISED
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "whatever"
                    ]
                )
            )
                .to.be.ok;

            // else 3 - false
            opQueue.ctx = {
                'state': mpenc.handler.STATE.AUX_DOWNFLOW
            };
            expect(
                opQueue.validateFn(
                    opQueue,
                    [
                        "whatever"
                    ]
                )
            )
                .not.to.be.ok;

            done();
        });
        it(".recoverFailFn (e.g. syncRoomUsersWithEncMembers with forceRecover)", function(done) {

            // initialize encryptionOpQueue
            var room = megaChatObj.chats["room1@conference.jid.com"];

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionOpQueue instanceof OpQueue).to.be.ok;

            var opQueue = room.encryptionOpQueue;

            opQueue.retryTimeout = 0;

            // set some bad state here
            opQueue.ctx = {
                'state': mpenc.handler.STATE.AUX_DOWNFLOW,
                'recover': function() {}
            };

            // required for the sync func
            room.getOrderedUsers = room.getParticipants = function() {
                return [
                    megaChatObj.karere.getJid()
                ];
            };


            room.encryptionHandler.askeMember.members = room.getOrderedUsers();

            // required manual stub() for the unit test

            sinon.stub(opQueue, 'recoverFailFn', opQueue.recoverFailFn);
            sinon.stub(opQueue.ctx, 'recover', opQueue.ctx.recover);

            opQueue.queue("whatever", [1,2,3]);

            for(var i = 0; i <= opQueue.MAX_ERROR_RETRIES; i++) {
                opQueue.pop();
            }

            expect(opQueue.recoverFailFn.callCount).to.eql(1, 'recoverFailFn should have been called once.')
            expect(opQueue.ctx.recover.callCount).to.eql(1, 'recover should have been called once.')

            done();
        });
    });

    describe("EncryptionHandler", function() {
        it(".onStateChangeCallback", function(done) {
            // initialize encryptionOpQueue
            var room = megaChatObj.chats["room1@conference.jid.com"];

            megaChatObj.trigger("onRoomCreated", room);

            expect(room.encryptionHandler instanceof mpenc.handler.ProtocolHandler).to.be.ok;
            expect(room.encryptionOpQueue instanceof OpQueue).to.be.ok;

            var encHandler = room.encryptionHandler;
            var opQueue = room.encryptionOpQueue;

            sinon.stub(opQueue, 'pop', function(){});


            // initialized + plugins wait
            encHandler.state = mpenc.handler.STATE.INITIALISED;
            room.state = MegaChatRoom.STATE.PLUGINS_WAIT;
            encHandler.stateUpdatedCallback(encHandler);

            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_READY);
            expect(room.setState.callCount).to.eql(1);
            expect(opQueue.pop.callCount).to.eql(1);

            // not initialized + room ready
            encHandler.state = mpenc.handler.STATE.AUX_UPFLOW;
            room.state = MegaChatRoom.STATE.READY;
            encHandler.stateUpdatedCallback(encHandler);

            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_PAUSED);
            expect(room.setState.callCount).to.eql(2);


            // initialized + paused
            encHandler.state = mpenc.handler.STATE.INITIALISED;
            room.state = MegaChatRoom.STATE.PLUGINS_PAUSED;
            encHandler.stateUpdatedCallback(encHandler);

            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_READY);
            expect(room.setState.callCount).to.eql(3);
            expect(opQueue.pop.callCount).to.eql(2);

            // initialized + paused
            encHandler.state = mpenc.handler.STATE.INITIALISED;
            room.state = MegaChatRoom.STATE.PLUGINS_PAUSED;
            encHandler.stateUpdatedCallback(encHandler);

            expect(room.state).to.eql(MegaChatRoom.STATE.PLUGINS_READY);
            expect(room.setState.callCount).to.eql(4);
            expect(opQueue.pop.callCount).to.eql(3);


            done();
        });
    });

    it("issue 283 - ProtocolHandler changes his state to INITIALISED too early (BEFORE its actually initialised)", function(done) {
        // ph1 is the owner of the room
        var ph1 = new mpenc.handler.ProtocolHandler(
            "jid1",
            TBD.ED25519_PRIV_KEY,
            TBD.ED25519_PUB_KEY,
            TBD.STATIC_PUB_KEY_DIR,
            function(handler) {

            },
            function(handler) {
            }
        );

        var ph2 = new mpenc.handler.ProtocolHandler(
            "jid2",
            TBD.ED25519_PRIV_KEY,
            TBD.ED25519_PUB_KEY,
            TBD.STATIC_PUB_KEY_DIR,
            function(handler) {

            },
            function(handler) {
            }
        );

        // initial start & handshake
        ph1.start([
            "jid2"
        ]);


        ph2.processMessage(
            ph1.protocolOutQueue.pop()
        );

        // *new* by patching the 'stateUpdatedCallback' we will add a expect() to be sure that the .state is set to
        // READY, after the protocolOutQueue is updated
        ph1.stateUpdatedCallback = function(h) {
            if(this.state == 3) {
                expect(ph1.protocolOutQueue.length).to.eql(1);
            }
        };

        ph1.processMessage(
            ph2.protocolOutQueue.pop()
        );

        expect(ph1.state).to.eql(3);


        ph1.stateUpdatedCallback = function(h) {};

        ph2.processMessage(
            ph1.protocolOutQueue.pop()
        );

        expect(ph2.state).to.eql(3);
        {
            // this is the problematic part..ph1 (room owner, who started the enc flow) sees he is at state == READY
            // so he tries to send a message to ph2, meanwhile ph2 is STILL not in ready state

            // test message sending - jid1 -> jid2
            ph1.send("a", {});

            ph2.processMessage(
                ph1.messageOutQueue.pop()
            );

            expect(ph2.uiQueue[0].message).to.eql("a");
            expect(ph2.uiQueue[0].from).to.eql("jid1");
            expect(ph2.uiQueue[0].type).to.eql("message");
        }



        expect(ph2.state).to.eql(3);






        // test message sending from jid2 -> jid1

        ph2.send("b", {meta: true});

        ph1.processMessage(
            ph2.messageOutQueue.pop()
        );





        expect(ph1.uiQueue[0].message).to.eql("b");
        expect(ph1.uiQueue[0].metadata.meta).to.eql(true);
        expect(ph1.uiQueue[0].from).to.eql("jid2");
        expect(ph1.uiQueue[0].type).to.eql("message");



        done();
    })
});
