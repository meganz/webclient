describe("Chat.js - Karere UI integration", function() {

    var fixtureManager = new Fixtures("./src/unit/fixtures/chat/");

    var $container = null;

    var karereMocker = null;
    var stropheMocker = null;

    var functionsMocker;
    var megaDataMocker;
    beforeEach(function(done) {
        localStorage.clear();

        localStorage.dd=1;
        localStorage.contextmenu=1;
        localStorage.megachat=1;
        localStorage.jj=true;
        localStorage.dxmpp = 1;
        localStorage.stopOnAssertFail = true;
        localStorage.d = localStorage.dd = 1;
        localStorage.capslockFilterDemoEnabled = 1;
        localStorage.encryptionFilterDemo = 1;

        functionsMocker = new FunctionsMocker();

        localStorage.removeItem("megaChatPresence");


        fixtureManager.get("templates.html")
            .done(function(filename, contents) {

                megaDataMocker = new MegaDataMocker();

                $container = $(contents);
                $(document.body).append($container);


                $.each(M.u, function(k, v) {
                    if(v.c == 0 || v.c == 1) {
                        var tpl = '<li id="treeli_$hash"><span class="fm-connector contact"></span><span class="fm-horizontal-connector contact"></span><a class="fm-tree-folder contact    ui-droppable offline-status dragover" id="treea_$hash" data-jid="$jid"><span><span class="avatar $hash"><span><img src="/images/mega/default-avatar.png" alt=""></span></span><span class="messages-icon"><span class="active"></span></span><span class="contact-name">$name</span></span></a><ul id="treesub_$hash"></ul></li>';
                        $('#treesub_contacts').append(
                            tpl
                                .replace(
                                    /\$hash/gi,
                                    v.u
                                )
                                .replace(
                                    /\$name/gi,
                                    v.m
                                )
                                .replace(
                                    /\$jid/gi,
                                    megaChat.getJidFromNodeId(v.u)
                                )
                        );
                    }
                });

                karereMocker = new KarereMocker(megaChat.karere);
                stropheMocker = new StropheMocker(megaChat.karere.connection);

                megaChat.init();

                expect(
                    $('.activity-status-block').is(":visible")
                ).to.be.ok;

                expect(
                    $('.activity-status').is(":visible")
                ).to.be.ok;

                expect(
                    $('.activity-status-block .activity-status').is('.online')
                ).to.be.ok;

                expect(
                    $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').is('.active')
                ).to.be.ok;
                expect(
                    $('.top-user-status-popup .top-user-status-item[data-presence="away"]').is('.active')
                ).not.to.be.ok;

                expect(
                    $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').is('.active')
                ).not.to.be.ok;

                expect(
                    $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').is('.active')
                ).not.to.be.ok;

                expectToBeResolved(
                    createTimeoutPromise(function() {
                        return megaChat.karere.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED
                    }, 100, 1000),
                    'cant connect'
                ).done(function() {
                    done();
                });

            })
            .fail(function() {
                expect(true).to.equal(false, "Failed to load templates.html, fail arguments: " + toArray(arguments).join(", "));
            });
    });


    afterEach(function(done) {
        functionsMocker.restore();

        megaChat.destroy();

        karereMocker.restore();
        stropheMocker.restore();

        $container.remove();

        megaDataMocker.restore();

        done();
    });



    it("can load fixtures", function(done) {
        expectToBeResolved(
            fixtureManager.get("templates.html"),
            "failed to load templates.html"
        );

        done();
    });


    it("1on1 chat, invitation accept for 1on1 chat rooms and leave room", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                expect(
                    megaChat.karere.addUserToChat
                ).to.have.been.calledOnce;

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[1]
                ).to.equal(user2jid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[2]
                ).to.equal(undefined);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[3]
                ).to.equal("private");

                var args4 = megaChat.karere.addUserToChat.getCall(0).args[4];
                expect(args4).to.have.property('ctime');
                expect(args4).to.have.property('invitationType', 'created');
                expect(args4).to.have.property('participants').to.eql([user1jid, user2jid]);
                expect(args4).to.have.property('users').to.be.empty;


                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                expect(megaChat.chats[roomJid].getParticipants())
                    .to.eql(
                        Object.keys(users)
                    );

                expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);


                // accept invitation
                // first leave the room
                delete megaChat.chats[roomJid];

                var eventTriggerShouldReturnFalse2 = megaChat.karere._triggerEvent("InviteMessage", {
                    elems: [],
                    from: user2jid,
                    id: "4",
                    karere: null,
                    meta: {
                        ctime: unixtime() - 10000 /* date in the future */,
                        invitationType: "resume",
                        participants: [
                            Strophe.getBareJidFromJid(user1jid),
                            Strophe.getBareJidFromJid(user2jid)
                        ],
                        type: "private",
                        users: users
                    },
                    myOwn: false,
                    password: undefined,
                    rawMessage: null,
                    rawType: null,
                    room: roomJid,
                    to: user1jid,
                    type: "Message"
                });

                expect(
                    megaChat.karere.joinChat
                ).to.have.been.calledOnce;



                expect(
                    megaChat.karere.joinChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(eventTriggerShouldReturnFalse2).to.not.be.ok;

                // leave room
                var leftUsers = {};
                leftUsers[user2jid] = "none";

                var currentUsers = {};
                currentUsers[user1jid] = "moderator";

                megaChat.karere._triggerEvent("UsersLeft", new KarereEventObjects.UsersLeft(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    leftUsers
                ));

                expect(Object.keys(megaChat.chats[roomJid].getUsers()))
                    .to.deep.equal(
                        [user1jid]
                    );

                expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);

                done();
            });
    });

    it("1on1 chat invitation accept, sync messages and order them correctly when adding to the dom", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

        // fake user join
        var users = {};
        users[user2jid] = "moderator";


        // receive invitation
        var eventTriggerShouldReturnFalse = megaChat.karere._triggerEvent("InviteMessage", {
            elems: [],
            from: user2jid,
            id: "4",
            karere: null,
            meta: {
                ctime: unixtime() - 100 /* date in the past */,
                invitationType: "resume",
                participants: [
                    Strophe.getBareJidFromJid(user1jid),
                    Strophe.getBareJidFromJid(user2jid)
                ],
                type: "private",
                users: users
            },
            myOwn: false,
            password: "password",
            rawMessage: null,
            rawType: null,
            room: roomJid,
            to: user1jid,
            type: "Message"
        });

        expect(eventTriggerShouldReturnFalse).to.not.be.ok;

        expect(
            megaChat.karere.joinChat
        ).to.have.been.called;

        // cleanup
        delete megaChat.chats[roomJid]._syncDone;
        sinon.stub(megaChat.chats[roomJid], 'requestMessageSync', megaChat.chats[roomJid].requestMessageSync);

        expect(
            megaChat.karere.joinChat.getCall(0).args[0]
        ).to.equal(roomJid);

        expect(
            megaChat.karere.joinChat.getCall(0).args[1]
        ).to.equal("password");

        megaChat.chats[roomJid].show();

        // receive user list

        megaChat.karere._triggerEvent("UsersJoined",
            new KarereEventObjects.UsersJoined(
                roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
                user1jid,
                roomJid,
                {},
                users
            )
        );


        expect(
            megaChat.chats[roomJid].getOrderedUsers()
        ).to.eql([
                user2jid
            ]);


//        megaChat.karere.setMeta('rooms', roomJid, 'users', users);

        users[user1jid] = "participant";

        megaChat.chats[roomJid].encryptionHandler = {
            'state': 3
        };

        megaChat.karere._triggerEvent("UsersJoined",
            new KarereEventObjects.UsersJoined(
                roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
                user1jid,
                roomJid,
                users,
                users
            )
        );

        megaChat.karere._triggerEvent("UsersUpdatedDone",
            new KarereEventObjects.UsersUpdated(
                roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
                user1jid,
                roomJid,
                users,
                users
            )
        );

        assert(
            megaChat.chats[roomJid].state == MegaChatRoom.STATE.READY,
            "Invalid state found. Expected: READY, got: " + megaChat.chats[roomJid].getStateAsText()
        );

        expect(
            megaChat.chats[roomJid].requestMessageSync.callCount
        ).to.eql(1);

        expect(
            megaChat.chats[roomJid]._syncDone
        ).to.eql(true);

        expect(megaChat.chats[roomJid].getParticipants()).to.have.members(Object.keys(users));
        expect(megaChat.chats[roomJid].getParticipants().length).to.eql(2);

        expect(
            megaChat.chats[roomJid].getOrderedUsers()
        ).to.eql([
                user2jid,
                user1jid
            ]);


        expect(
            megaChat.karere.sendAction
        ).to.have.been.calledOnce;


        var testMessages = [
            new KarereEventObjects.IncomingMessage(
                roomJid,
                user1jid,
                "ChatMessage",
                "Message",
                "2",
                undefined,
                roomJid,
                {},
                "hopala2",
                undefined,
                100
            ),
            new KarereEventObjects.IncomingMessage(
                roomJid,
                user1jid,
                "groupchat",
                "Message",
                "3",
                undefined,
                roomJid,
                {},
                "hopala3",
                undefined,
                200
            ),
            new KarereEventObjects.IncomingMessage(
                roomJid,
                user2jid,
                "groupchat",
                "Message",
                "1",
                undefined,
                roomJid,
                {},
                "hopala1",
                undefined,
                50
            ),
            new KarereEventObjects.IncomingMessage(
                roomJid,
                user1jid,
                "groupchat",
                "Message",
                "4",
                undefined,
                roomJid,
                {},
                "hopala4",
                undefined,
                300
            )
        ];

        megaChat.karere._triggerEvent("ActionMessage", {
            from: megaChat.karere.sendAction.getCall(0).args[0],
            id: "-870315190_1392060886769",
            karere: null,
            meta: {
                action: "syncResponse",
                inResponseTo: "123",
                messages: [testMessages[0], testMessages[1]],
                offset: 0,
                chunkSize: 2,
                roomJid: roomJid,
                total: testMessages.length
            },
            myOwn: false,
            rawMessage: null,
            rawType: "action",
            to: megaChat.karere.getJid(),
            type: "Message"
        });

        megaChat.karere._triggerEvent("ActionMessage", {
            from: megaChat.karere.sendAction.getCall(0).args[0],
            id: "-870315190_1392060886770",
            karere: null,
            meta: {
                action: "syncResponse",
                inResponseTo: "123",
                messages: [testMessages[2], testMessages[3]],
                offset: 2,
                chunkSize: 2,
                roomJid: roomJid,
                total: testMessages.length
            },
            myOwn: false,
            rawMessage: null,
            rawType: "action",
            to: megaChat.karere.getJid(),
            type: "Message"
        });


        assert(
            megaChat.chats[roomJid].state == MegaChatRoom.STATE.READY,
            "Invalid state found. Expected: READY, got: " + megaChat.chats[roomJid].getStateAsText()
        );

        var messagesInOrderedList = [];
        $('.fm-chat-messages-block').each(function() {
            if($(this).is(".typing-template") || $(this).parent().is(".template")) {
                return; // continue;
            }

            messagesInOrderedList.push({
                'ts': $(this).parent().attr('data-timestamp'),
                'time': $('.chat-message-date', $(this).parent()).text(),
                'msg': $('.chat-message-txt span', $(this)).text(),
                'fromId': $(this).parent().attr('data-from'),
                'isGrouped': $(this).parent().is(".grouped-message"),
                'isRightBlock': $(this).is(".right-block")
            });
        });

        var expectedMessagesList = [
            {
                "ts": "50",
                "time": unixtimeToTimeString(testMessages[2].getDelay()),
                "msg": "hopala1",
                "fromId": testMessages[2].getFromJid().split("@")[0],
                "isGrouped": false,
                "isRightBlock": true
            },
            {
                "ts": "100",
                "time": unixtimeToTimeString(testMessages[0].getDelay()),
                "msg": "hopala2",
                "fromId": testMessages[0].getFromJid().split("@")[0],
                "isGrouped": false,
                "isRightBlock": false
            },
            {
                "ts": "200",
                "time": unixtimeToTimeString(testMessages[1].getDelay()),
                "msg": "hopala3",
                "fromId": testMessages[1].getFromJid().split("@")[0],
                "isGrouped": true,
                "isRightBlock": false
            },
            {
                "ts": "300",
                "time": unixtimeToTimeString(testMessages[3].getDelay()),
                "msg": "hopala4",
                "fromId": testMessages[3].getFromJid().split("@")[0],
                "isGrouped": true,
                "isRightBlock": false
            }
        ];

        expect(messagesInOrderedList).to.eql(expectedMessagesList);

        expect(
            $('.fm-right-header').data("roomJid")
        ).to.eql(roomJid.split("@")[0]);

        expect(
            $('#contact2_' + Object.keys(M.u)[1]).data("roomJid")
        ).to.eql(roomJid.split("@")[0]);

        done();
    });

    it("Presence sync across devices and auto invite to private rooms (resume/created chat support)", function(done) {

        var user1jid2 = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u) + "/res2";
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u) + "/res";


        localStorage.megaChatPresence = megaChat._myPresence = megaChat.karere._presenceCache[megaChat.karere.getJid()] = "away";
        megaChat.karere._presenceBareCache[megaChat.karere.getBareJid()] = megaChat._myPresence;

        var origPresenceMtime = localStorage.megaChatPresenceMtime = unixtime();

        // receive outdated presence
        var eventTriggerShouldNOTReturnFalse = megaChat.karere._triggerEvent("Presence", {
            from: user1jid2,
            id: null,
            karere: null,
            myOwn: false,
            rawMessage: null,
            rawType: null,
            show: Karere.PRESENCE.ONLINE,
            status: Karere.PRESENCE.ONLINE,
            delay: unixtime() - 1000,
            to: megaChat.karere.getJid()
        });

        expect(eventTriggerShouldNOTReturnFalse).to.be.ok;
        expect(localStorage.megaChatPresence).to.eql("away");
        expect(localStorage.megaChatPresenceMtime).to.eql("" + origPresenceMtime);
        expect(megaChat.karere.setPresence).to.not.have.been.called;

        expect(
            $('.activity-status-block .activity-status').is('.away')
        ).to.be.ok;


        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').is('.active')
        ).not.to.be.ok;


        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="away"]').is('.active')
        ).to.be.ok;


        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').is('.active')
        ).not.to.be.ok;

        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').is('.active')
        ).not.to.be.ok;



        // receive new presence
        var newUnixtime = unixtime() + 1000;
        var eventTriggerShouldNOTReturnFalse = megaChat.karere._triggerEvent("Presence", {
            from: user1jid2,
            id: null,
            karere: null,
            myOwn: false,
            rawMessage: null,
            rawType: null,
            show: Karere.PRESENCE.ONLINE,
            status: Karere.PRESENCE.ONLINE,
            delay: newUnixtime,
            to: megaChat.karere.getJid()
        });


        expect(eventTriggerShouldNOTReturnFalse).to.be.ok;
        expect(localStorage.megaChatPresence).to.eql("chat");
        expect(localStorage.megaChatPresenceMtime).to.eql("" + newUnixtime);
        expect(megaChat.karere.setPresence).to.have.been.calledOnce;

        expect(
            $('.activity-status-block .activity-status').is('.online')
        ).to.be.ok;

        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="chat"]').is('.active')
        ).to.be.ok;
        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="away"]').is('.active')
        ).not.to.be.ok;

        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="dnd"]').is('.active')
        ).not.to.be.ok;

        expect(
            $('.top-user-status-popup .top-user-status-item[data-presence="unavailable"]').is('.active')
        ).not.to.be.ok;

        // Test auto invitation
        var jids = [
            megaChat.karere.getBareJid(),
            Strophe.getBareJidFromJid(user2jid)
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";
                expect(
                    megaChat.karere.addUserToChat
                ).to.have.been.calledOnce;

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[1]
                ).to.equal(Karere.getNormalizedBareJid(user2jid));

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[2]
                ).to.equal(undefined);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[3]
                ).to.equal("private");

                var args4 = megaChat.karere.addUserToChat.getCall(0).args[4];
                expect(args4).to.have.property('ctime');
                expect(args4).to.have.property('invitationType', 'created');
                expect(args4).to.have.property('participants').to.eql([megaChat.karere.getBareJid(), Strophe.getBareJidFromJid(user2jid)]);
                expect(args4).to.have.property('users').to.be.empty;



                // trigger outdated presence
                var eventTriggerShouldNOTReturnFalse = megaChat.karere._triggerEvent("Presence", {
                    from: user1jid2,
                    id: null,
                    karere: null,
                    myOwn: false,
                    rawMessage: null,
                    rawType: null,
                    show: Karere.PRESENCE.ONLINE,
                    status: Karere.PRESENCE.ONLINE,
                    delay: unixtime() - 1000,
                    to: megaChat.karere.getJid()
                });

                expect(eventTriggerShouldNOTReturnFalse).to.be.ok;


                // validate that the invitation was sent
                expect(
                    megaChat.karere.addUserToChat
                ).to.have.been.calledTwice;


                expect(
                    megaChat.karere.addUserToChat.getCall(1).args[0]
                ).to.equal(roomJid);

                expect(
                    megaChat.karere.addUserToChat.getCall(1).args[1]
                ).to.equal(user1jid2);

                expect(
                    megaChat.karere.addUserToChat.getCall(1).args[2]
                ).to.equal(undefined);

                expect(
                    megaChat.karere.addUserToChat.getCall(1).args[3]
                ).to.equal("private");

                var args4 = megaChat.karere.addUserToChat.getCall(1).args[4];
                expect(args4).to.have.property('ctime');
                expect(args4).to.have.property('invitationType', 'resume');
                expect(args4).to.have.property('participants').to.eql([megaChat.karere.getBareJid(), Strophe.getBareJidFromJid(user2jid)]);
                expect(args4).to.have.property('users').to.be.empty;


                // verify DOM update when presence is received from a 3rd party
                var presenceCssClassMap = [
                    [Karere.PRESENCE.AVAILABLE, '.online'],
                    [Karere.PRESENCE.AWAY, '.away'],
                    [Karere.PRESENCE.BUSY, '.busy'],
                    [Karere.PRESENCE.OFFLINE, '.offline']
                ];
                $.each(presenceCssClassMap, function(k, v) {
                    // prepare mocked disco response
                    // no audio, no video and no karere
                    stropheMocker.mockedDiscoInfoResponse = $.parseXML(
                        "<iq xmlns='jabber:client' from='user2@jid.com/d1' to='" + megaChat.karere.getJid() + "' type='result' id='13:sendIQ'>" +
                            "<query xmlns='http://jabber.org/protocol/disco#info'>" +
                                "<identity name='strophe'/>" +
                                "<feature var='karere'/>" +
                                "<feature var='http://jabber.org/protocol/disco#info'/>" +
                                "<feature var='http://jabber.org/protocol/disco#items'/>" +
                                "<feature var='urn:xmpp:jingle:1'/>" +
                                "<feature var='urn:xmpp:jingle:apps:rtp:1'/>" +
                                "<feature var='urn:xmpp:jingle:transports:ice-udp:1'/>" +
                                "<feature var='urn:xmpp:jingle:apps:rtp:audio'/>" +
                                "<feature var='urn:xmpp:jingle:apps:rtp:video'/>" +
                                "<feature var='urn:ietf:rfc:5761'/>" +
                            "</query>" +
                        "</iq>"
                    );

                    var eventTriggerShouldNOTReturnFalse = megaChat.karere._triggerEvent("Presence", {
                        from: user2jid,
                        id: null,
                        karere: null,
                        myOwn: false,
                        rawMessage: null,
                        rawType: null,
                        show: v[0],
                        status: v[0],
                        delay: unixtime() - 1000,
                        to: megaChat.karere.getJid()
                    });

                    expect(
                        $('#contact_' + Object.keys(M.u)[1]).is(v[1])
                    ).to.be.ok;

                    expect(
                        $('#contact2_' + Object.keys(M.u)[1]).is(v[1])
                    ).to.be.ok;

                    if(v[0] != Karere.PRESENCE.OFFLINE) {
                        // confirm that the chat-capability-* classes are added in the UI if the presence
                        // was not offline
                        expect(
                            $('#contact2_' + Object.keys(M.u)[1]).is(".chat-capability-audio")
                        ).to.be.ok;

                        expect(
                            $('#contact2_' + Object.keys(M.u)[1]).is(".chat-capability-video")
                        ).to.be.ok;

                        expect(
                            $('#contact2_' + Object.keys(M.u)[1]).is(".chat-capability-karere")
                        ).to.be.ok;
                    }
                });

                done();
            });
    });



    it("1on1 chat with file attachments", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined",
                    new KarereEventObjects.UsersJoined(
                        roomJid + "/" + megaChat.karere.getNickname(),
                        user1jid,
                        roomJid,
                        {},
                        users
                    )
                );


                expect(megaChat.chats[roomJid].getParticipants())
                    .to.have.members(
                        megaChat.chats[roomJid].users
                    );

                expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);


                // accept invitation
                // first leave the room
                delete megaChat.chats[roomJid];

                var eventTriggerShouldReturnFalse2 = megaChat.karere._triggerEvent("InviteMessage", {
                    elems: [],
                    from: user2jid,
                    id: "4",
                    karere: null,
                    meta: {
                        ctime: unixtime() - 10000 /* date in the future */,
                        invitationType: "resume",
                        participants: [
                            Strophe.getBareJidFromJid(user1jid),
                            Strophe.getBareJidFromJid(user2jid)
                        ],
                        type: "private",
                        users: users
                    },
                    myOwn: false,
                    password: undefined,
                    rawMessage: null,
                    rawType: null,
                    room: roomJid,
                    to: user1jid,
                    type: "Message"
                });

                expect(
                    megaChat.karere.joinChat
                ).to.have.been.calledOnce;



                expect(
                    megaChat.karere.joinChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(eventTriggerShouldReturnFalse2).to.not.be.ok;


                // File attachment test
                $('.fm-chat-attach-file').trigger('click');


                expect(
                    $('.fm-chat-attach-popup .root > li').size()
                ).to.equal(
                    Object.keys(M.d).length - 1 /* -1, because there is 1 file which is not in the RootID node */
                );
                expect(
                    $('.fm-chat-attach-popup .root > li#n_d1123456 > a').is(".contains-folders")
                ).to.be.ok;


                var expandedEvent = new jQuery.Event("mouseup");
                expandedEvent.offsetX = expandedEvent.layerX = 20;

                $('.fm-chat-attach-popup .root > li#n_d1123456 > a').trigger(expandedEvent);

                expect(
                    $('.fm-chat-attach-popup .root > li#n_d1123456 > ul > li').size()
                ).to.equal(
                    1
                );

                expect(
                    $('.fm-chat-attach-popup .root > li#n_d1123456 > a').is(".opened.expanded")
                ).to.be.ok;


                var selectSingleEvent = function() {
                    return new jQuery.Event("mouseup");
                };

                var selectShiftEvent = function() {
                    var e = new jQuery.Event("mouseup");
                    e.shiftKey = true;
                    return e;
                };


                var selectCtrlEvent = function() {
                    var e = new jQuery.Event("mouseup");
                    e.ctrlKey = true;
                    return e;
                };


                // select multiple using shift
                $('.fm-chat-attach-popup .root > li:last').prev().find('> a').trigger(selectSingleEvent());
                $('.fm-chat-attach-popup .root > li:first').next().find('> a').trigger(selectShiftEvent());

                expect(
                    $('.fm-chat-attach-popup .root > li > a.active').size()
                ).to.equal(
                        2
                );

                // select single item and reset of the old selection
                $('.fm-chat-attach-popup .root > li:first').find('> a').trigger(selectSingleEvent());


                expect(
                    $('.fm-chat-attach-popup .root > li > a.active').size()
                ).to.equal(
                        1
                    );

                // unselect single item
                $('.fm-chat-attach-popup .root > li:first').find('> a').trigger(selectCtrlEvent());

                expect(
                    $('.fm-chat-attach-popup .root > li > a.active').size()
                ).to.equal(
                        0
                    );


                // pick diff items using ctrl
                $('.fm-chat-attach-popup .root > li:first').find('> a').trigger(selectCtrlEvent());
                $('.fm-chat-attach-popup .root > li:last').find('> a').trigger(selectCtrlEvent());

                expect(
                    $('.fm-chat-attach-popup .root > li > a.active').size()
                ).to.equal(
                        2
                    );

                expect(
                    $('.fm-chat-attach-popup .root > li:first').find('> a').is('.active')
                ).to.be.ok;

                expect(
                    $('.fm-chat-attach-popup .root > li:last').find('> a').is('.active')
                ).to.be.ok;

                // click send
                $('.attach-send').trigger('click');

                expect(
                    megaChat.getCurrentRoom().messages.length
                ).to.equal(1);

                var attachmentIds = Object.keys(megaChat.getCurrentRoom().messages[0].meta.attachments);

                expect(
                    attachmentIds.length
                ).to.equal(2);

                var sharedWith = [Object.keys(M.u)[0], Object.keys(M.u)[1]];

                expect(
                    megaChat.getCurrentRoom().messages[0].meta.attachments[attachmentIds[0]].sharedWith
                ).to.eql(sharedWith);

                expect(
                    megaChat.getCurrentRoom().messages[0].meta.attachments[attachmentIds[1]].sharedWith
                ).to.eql(sharedWith);

                done();
            });
    });

    it("Advanced room flow creation and message filtering via .preventDefault", function(done) {
        var DemoFilterPlugin = function(megaChat) {
            var self = this;

            self.megaChat = megaChat;

            self.ready = {};
            megaChat.bind("onPluginsWait", function(e, room) {
                if(!self.ready[room.roomJid]) {
                    e.stopPropagation();
                }
            });

            this.toggleReady = function(roomJid) {
                if(!self.ready[roomJid]) {
                    self.ready[roomJid] = true;
                    self.megaChat.chats[roomJid].encryptionHandler = {'state': 3};
                    self.megaChat.chats[roomJid].setState(MegaChatRoom.STATE.PLUGINS_READY);

                } else {
                    self.ready[roomJid] = false;
                }
            };
        };
        megaChat.plugins['demoFilterPlugin'] = new DemoFilterPlugin(megaChat);

        localStorage.dd = true;

        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u) + "/res";

        var jids = [
            megaChat.karere.getBareJid(),
            Strophe.getBareJidFromJid(user2jid)
        ];

        var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

        var $promise = megaChat.openChat(
            jids,
            "private"
        );

        assert(megaChat.chats[roomJid].state == MegaChatRoom.STATE.JOINING, "Invalid room state, expected joining");

        // fake user join
        var users = {};
        users[megaChat.karere.getJid()] = "moderator";
//        users[user2jid] = "participant";

        megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
            roomJid + "/" + megaChat.karere.getNickname(),
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));

        megaChat.karere._triggerEvent("UsersUpdatedDone", new KarereEventObjects.UsersUpdated(
            roomJid + "/" + megaChat.karere.getNickname(),
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));

        assert(megaChat.chats[roomJid].state == MegaChatRoom.STATE.WAITING_FOR_PARTICIPANTS, "Invalid state of the room, should be WAITING_FOR_PARTICIPANTS");

        expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);

        // fake user join
        var users = {};
        users[megaChat.karere.getJid()] = "moderator";
        users[user2jid] = "participant";

        megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
            roomJid + "/" + megaChat.karere.getNickname(),
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));

        $promise.done(function() {
            assert(megaChat.chats[roomJid].state == MegaChatRoom.STATE.PLUGINS_WAIT, "Plugin did not halted the room creation");


            megaChat.plugins['demoFilterPlugin'].toggleReady(roomJid);

            assert(megaChat.chats[roomJid].state == MegaChatRoom.STATE.READY, "Plugin did not managed to set the state to ready");


            done();
        });

    });

    it("Buffer incoming and outgoing messages", function(done) {

        localStorage.dd = true;

        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u) + "/res";

        var jids = [
            megaChat.karere.getBareJid(),
            Strophe.getBareJidFromJid(user2jid)
        ];

        var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

        var $promise = megaChat.openChat(
            jids,
            "private"
        );

        // fake user join
        var users = {};
        users[megaChat.karere.getJid()] = "moderator";
//        users[user2jid] = "participant";

//        megaChat.karere.setMeta('rooms', roomJid, 'users', [
//            megaChat.karere.getJid()
//        ]);

        megaChat.chats[roomJid].encryptionHandler = {
            'state': mpenc.handler.STATE.NULL
        };

        megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
            roomJid + "/" + megaChat.karere.getNickname(),
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));

        megaChat.karere._triggerEvent("UsersUpdatedDone", new KarereEventObjects.UsersUpdated(
            roomJid + "/" + megaChat.karere.getNickname(),
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));


        expect(
            megaChat.chats[roomJid].getOrderedUsers()
        ).to.eql([
                megaChat.karere.getJid()
            ]);

//        megaChat.karere.setMeta('rooms', roomJid, 'users', [
//            megaChat.karere.getJid(),
//            user2jid
//        ]);

        // new user joined
        users[user2jid] = "participant";
        megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
            user2jid,
            megaChat.karere.getJid(),
            roomJid,
            {},
            users
        ));

        expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);

        expect(
            megaChat.chats[roomJid].getOrderedUsers()
        ).to.eql([
                megaChat.karere.getJid(),
                user2jid
            ]);

        // TODO: assert that the encryptionHandler.cliquesMember.members.length == 1 or 2? (me + user2jid)

        $promise.done(function() {

            var room = megaChat.chats[roomJid];
            room.sendMessage("text message", {
                'meta': true
            });

            setTimeout(function() {
                done();
                //TODO: Wait for
            }, 1000);
            return;

            assert(
                megaChat.karere.sendRawMessage.secondCall.args[2].indexOf("mpENC:") === 0,
                "message was not encrypted"
            );

            megaChat.karere.trigger("onChatMessage", new KarereEventObjects.IncomingMessage(
                megaChat.karere.getJid(),
                user2jid,
                "Message",
                "groupchat",
                "123",
                undefined,
                roomJid,
                {},
                megaChat.karere.sendRawMessage.secondCall.args[2]
            ));

            assert(
                megaChat.chats[roomJid].messages[0].getContents() == "text message",
                "could not decrypt the incoming message"
            );

            assert(
                megaChat.chats[roomJid].messages[0].getMeta()['meta'] == true,
                "could not decrypt the incoming message's meta"
            );


            done();

        });

    });

    it("MegaChatRoom.recover on disconnect", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined",
                    new KarereEventObjects.UsersJoined(
                        roomJid + "/" + megaChat.karere.getNickname(),
                        user1jid,
                        roomJid,
                        {},
                        users
                    )
                );


                expect(megaChat.chats[roomJid].getParticipants())
                    .to.have.members(
                        megaChat.chats[roomJid].users
                    );

                expect(megaChat.chats[roomJid].getParticipants().length).to.equal(2);


                // accept invitation
                // first leave the room
                delete megaChat.chats[roomJid];

                var eventTriggerShouldReturnFalse2 = megaChat.karere._triggerEvent("InviteMessage", {
                    elems: [],
                    from: user2jid,
                    id: "4",
                    karere: null,
                    meta: {
                        ctime: unixtime() - 10000 /* date in the future */,
                        invitationType: "resume",
                        participants: [
                            Strophe.getBareJidFromJid(user1jid),
                            Strophe.getBareJidFromJid(user2jid)
                        ],
                        type: "private",
                        users: users
                    },
                    myOwn: false,
                    password: undefined,
                    rawMessage: null,
                    rawType: null,
                    room: roomJid,
                    to: user1jid,
                    type: "Message"
                });

                expect(
                    megaChat.karere.joinChat
                ).to.have.been.calledOnce;



                expect(
                    megaChat.karere.joinChat.getCall(0).args[0]
                ).to.equal(roomJid);

                // participantExistsInRoom tests

                expect(
                    megaChat.chats[roomJid].participantExistsInRoom("random-jid-hoes-here")
                ).to.eql(false);

                expect(
                    megaChat.chats[roomJid].participantExistsInRoom(user1jid)
                ).to.eql(true);
                expect(
                    megaChat.chats[roomJid].participantExistsInRoom(user2jid)
                ).to.eql(true);


                expect(
                    megaChat.chats[roomJid].participantExistsInRoom(user1jid, true)
                ).to.eql(true);
                expect(
                    megaChat.chats[roomJid].participantExistsInRoom(user2jid, true)
                ).to.eql(true);


                // getRoomOwenr and .getOrderedUsersInChat test
                expect(
                    megaChat.chats[roomJid].getRoomOwner()
                ).to.eql(user1jid);



                // disconnect and chat rooms restore test

                megaChat.karere.trigger("onDisconnected");

                $.each(megaChat.chats, function(k, v) {
                    sinon.stub(v, 'recover', v.recover);

                    expect(v.state).to.eql(
                        MegaChatRoom.STATE.INITIALIZED
                    );
                });

                var onRoomCreatedTriggerCount = 0;
                megaChat.bind("onRoomCreated.test", function() {
                    onRoomCreatedTriggerCount++;
                });


                megaChat.karere.trigger("onConnected");
                expect(megaChat.karere.startChat.callCount).to.eql(
                    2
                );

                $.each(megaChat.chats, function(k, v) {
                    expect(v.recover.callCount).to.eql(
                        1
                    );

                    expect(v.state).to.eql(
                        MegaChatRoom.STATE.JOINING
                    );

                    expect(onRoomCreatedTriggerCount).to.eql(
                        1
                    );
                });
                megaChat.unbind("onRoomCreated.test");


                // test leave room
                var room = megaChat.chats[roomJid];
                megaChat.chats[roomJid].leave();
                expect(
                    room.state
                ).to.eql(
                        MegaChatRoom.STATE.LEFT
                    );

                expect(
                    self.megaChat.karere.leaveChat.callCount
                ).to.eql(1);

                // restore room state so that the afterEach wont crash
                megaChat.chats[roomJid].state = MegaChatRoom.STATE.READY;

                done();
            });
    });

    it("add/remove new user hooks (via Mega API)", function(done) {
        sinon.stub(
            megaChat.karere,
            'subscribe',
            megaChat.karere.subscribe
        );

        sinon.stub(
            megaChat.karere,
            'unsubscribe',
            megaChat.karere.unsubscribe
        );


        megaChat.processNewUser("A_123456789");

        expect(megaChat.karere.subscribe.callCount).to.eql(1);
        expect(megaChat.karere.unsubscribe.callCount).to.eql(0);


        megaChat.processRemovedUser("A_123456789");

        expect(megaChat.karere.subscribe.callCount).to.eql(1);
        expect(megaChat.karere.unsubscribe.callCount).to.eql(1);

        done();
    });

    it("_generateContactAvatarElement (name, duplicate first letter short names generator and avatar generator)", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";


                expect(
                    megaChat.karere.addUserToChat
                ).to.have.been.calledOnce;

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[0]
                ).to.equal(roomJid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[1]
                ).to.equal(user2jid);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[2]
                ).to.equal(undefined);

                expect(
                    megaChat.karere.addUserToChat.getCall(0).args[3]
                ).to.equal("private");

                var args4 = megaChat.karere.addUserToChat.getCall(0).args[4];
                expect(args4).to.have.property('ctime');
                expect(args4).to.have.property('invitationType', 'created');
                expect(args4).to.have.property('participants').to.eql([user1jid, user2jid]);
                expect(args4).to.have.property('users').to.be.empty;


                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                var megaRoom = megaChat.chats[roomJid];

                var $elem1, $elem2;

                $elem1 = megaRoom._generateContactAvatarElement(user1jid);
                $elem2 = megaRoom._generateContactAvatarElement(user2jid);

                expect($elem1.is(".color1")).to.be.ok;
                expect($elem2.is(".color2")).to.be.ok;

                expect($elem1.text()).to.eql("LX");
                expect($elem2.text()).to.eql("LZ");

                expect($('img', $elem1).size()).to.eql(0);
                expect($('img', $elem2).size()).to.eql(0);

                M.u["A_123456789"].name="lyubomir.petrov@example.com";
                M.u["B_123456789"].name="bram.van.der.kolk@example.com";

                delete M.u["A_123456789"].displayName;
                delete M.u["A_123456789"].displayColor;
                delete M.u["B_123456789"].displayName;
                delete M.u["B_123456789"].displayColor;

                $elem1 = megaRoom._generateContactAvatarElement(user1jid);
                $elem2 = megaRoom._generateContactAvatarElement(user2jid);

                expect($elem1.is(".color1")).to.be.ok;
                expect($elem2.is(".color2")).to.be.ok;

                expect($elem1.text()).to.eql("L");
                expect($elem2.text()).to.eql("B");


                avatars["A_123456789"] = {'url': "#yup"};
                avatars["B_123456789"] = {'url': "#yup"};

                delete M.u["A_123456789"].displayName;
                delete M.u["A_123456789"].displayColor;
                delete M.u["B_123456789"].displayName;
                delete M.u["B_123456789"].displayColor;


                $elem1 = megaRoom._generateContactAvatarElement(user1jid);
                $elem2 = megaRoom._generateContactAvatarElement(user2jid);

                expect($('img', $elem1).size()).to.eql(1);
                expect($('img', $elem2).size()).to.eql(1);
                expect($elem1.is(".color1")).to.be.ok;
                expect($elem2.is(".color2")).to.be.ok;

                expect($elem1.text()).to.eql("");
                expect($elem2.text()).to.eql("");


                done();
            });
    });

    it("onComposing and onPaused events", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                var megaRoom = megaChat.chats[roomJid];

                megaChat.karere.trigger("onComposingMessage", new KarereEventObjects.StateComposingMessage(
                    user1jid,
                    user2jid,
                    roomJid
                ));

                expect($('.typing').size()).to.eql(1);
                expect($('.typing:visible').size()).to.eql(1);
                expect($('.typing .nw-contact-avatar.color2').size()).to.eql(1);
                expect($('.typing .nw-contact-avatar.color2').size()).to.eql(1);



                megaChat.karere.trigger("onComposingMessage", new KarereEventObjects.StateComposingMessage(
                    user2jid,
                    user1jid,
                    roomJid
                ));

                expect($('.typing').size()).to.eql(1);
                expect($('.typing:visible').size()).to.eql(1);
                expect($('.typing .nw-contact-avatar.color1').size()).to.eql(1);
                expect($('.typing .nw-contact-avatar.color1').size()).to.eql(1);

                megaChat.karere.trigger("onPausedMessage", new KarereEventObjects.StatePausedMessage(
                    user2jid,
                    user1jid,
                    roomJid
                ));

                expect($('.typing').size()).to.eql(0);
                expect($('.typing:visible').size()).to.eql(0);


                done();
            });
    });



    it("._*call* methods (audio/video logic and UI)", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        var rtcMocker;

        megaChat.rtc = megaChat.rtc ? megaChat.rtc : {};
        rtcMocker = new ObjectMocker(
            megaChat.rtc,
            {
                'startMediaCall': function() {
                    var s = this;

                    s.canceled = false;
                    return {
                        'cancel': function() {
                            s.canceled = true;
                        }
                    };
                },
                'hangup': function() {},
                'getReceivedMediaTypes': function() {
                    return {
                        'audio': true,
                        'video': true
                    };
                },
                'getSentMediaTypes': function() {
                    return;
                }
            }
        );


        afterEach(function(done) {
            if(rtcMocker) {
                rtcMocker.restore();
            }

            done();
        });


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                var megaRoom = megaChat.chats[roomJid];


                // start call (audio + video)

                megaRoom.options.mediaOptions['audio'] = true;
                megaRoom.options.mediaOptions['video'] = true;
                megaRoom._startCall();

                expect(megaChat.rtc.startMediaCall.callCount).to.eql(1);
                expect(megaChat.rtc.startMediaCall.getCall(0).args[0]).to.eql(user2jid);
                expect(megaChat.rtc.startMediaCall.getCall(0).args[1]).to.eql({
                    'video': true,
                    'audio': true
                });
                expect(Object.keys(megaRoom.callRequest)).to.eql(['cancel']);
                expect(megaChat.rtc.canceled).to.eql(false);
                expect($('.outgoing-call').size()).to.eql(1);

                // _cancelCallRequest, _resetCallStateNoCall
                megaRoom._cancelCallRequest();
                expect(megaChat.rtc.canceled).to.eql(true);
                expect(megaChat.rtc.hangup.callCount).to.eql(1);

                // start new call (audio only)
                megaRoom.options.mediaOptions['audio'] = true;
                megaRoom.options.mediaOptions['video'] = false;
                megaRoom._startCall();
                expect(megaChat.rtc.startMediaCall.callCount).to.eql(2);
                expect(megaChat.rtc.startMediaCall.getCall(0).args[0]).to.eql(user2jid);
                expect(megaChat.rtc.startMediaCall.getCall(0).args[1]).to.eql({
                    'video': false,
                    'audio': true
                });
                expect(megaChat.rtc.canceled).to.eql(false);
                expect(Object.keys(megaRoom.callRequest)).to.eql(['cancel']);
                expect($('.outgoing-call').size()).to.eql(1);


                // media recv (local + remote)
                megaRoom.trigger("local-stream-obtained", {
                    'player': $("<video class='fake-player-local-media-received'/>")
                });

                expect($('.fake-player-local-media-received', megaRoom.$header).size()).eql(1);


                megaRoom.trigger("media-recv", {
                    'peer': user2jid,
                    'player': $("<video class='fake-player-media-received'/>")
                });

                expect($('.others-av-screen', megaRoom.$header).data("jid")).to.eql(
                    user2jid
                );
                expect($('.fake-player-media-received', megaRoom.$header).size()).eql(1);


                // _callStartedState
                megaRoom.trigger('call-answered',
                    {
                        type: 'call-init',
                        peer: user2jid
                    }
                );

                expect(
                    $('.nw-conversations-header.call-started:visible, .nw-conversations-item.current-calling:visible').size()
                ).to.eql(2)

                expect(megaRoom.$header.parent().is(".video-call")).to.eql(true);

                // _renderAudioVideoScreens, _renderSingleAudioVideoScreen

                expect($('.my-av-screen', megaRoom.$header).is(":visible")).to.eql(true);
                expect($('.my-av-screen .my-avatar', megaRoom.$header).css("display")).to.eql("inline");
                expect($('.my-av-screen video', megaRoom.$header).css("display")).to.eql("none");

                expect($('.others-av-screen', megaRoom.$header).is(":visible")).to.eql(true);
                expect($('.others-av-screen .other-avatar', megaRoom.$header).css("display")).to.eql("none");
                expect($('.others-av-screen video', megaRoom.$header).css("display")).to.eql("inline");


                done();
            });
    });

    it(".generateInlineDialog", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                var megaRoom = megaChat.chats[roomJid];

                var $dialog = megaRoom.generateInlineDialog(
                    "type",
                    user1jid,
                    ["cssClass1"],
                    "message contents",
                    ["cssClass2"],
                    {
                        'answer': {
                            'type': 'primary',
                            'text': "Answer",
                            'callback': function(){}
                        },
                        'reject': {
                            'type': 'secondary',
                            'text': "Cancel",
                            'callback': function(){}
                        }
                    },
                    false
                );


                expect(!!$dialog.data("timestamp")).to.eql(true);
                expect($dialog.is(".cssClass2")).to.eql(true);
                expect($('.cssClass1', $dialog).size()).to.eql(1);
                expect($('.fm-chat-inline-dialog-button-answer', $dialog).size()).to.eql(1);
                expect($('.fm-chat-inline-dialog-button-reject', $dialog).size()).to.eql(1);

                done();
            });
    });


    it(".arePluginsForcingMessageQueue, .getMessageById, ._flushMessagesQueue", function(done) {
        var user1jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u);
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u);

        var jids = [
            user1jid,
            user2jid
        ];

        var $promise = megaChat.openChat(
            jids,
            "private"
        );


        expect(
            megaChat.karere.startChat
        ).to.have.been.calledWith([]);

        expect(
            megaChat.karere.startChat
        ).to.have.been.calledOnce;

        expectToBeResolved($promise, 'cant open chat')
            .done(function() {
                var roomJid = megaChat.generatePrivateRoomName(jids) + "@conference.example.com";

                // fake user join
                var users = {};
                users[user1jid] = "moderator";
                users[user2jid] = "participant";

                megaChat.karere._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    roomJid + "/" + megaChat.karere.getNickname(),
                    user1jid,
                    roomJid,
                    {},
                    users
                ));

                var megaRoom = megaChat.chats[roomJid];

                // arePluginsForcingMessageQueue
                var origPlugins = megaChat.plugins;

                megaChat.plugins = {
                    'forceQueue': {'shouldQueueMessage': function() { return true; } }
                };

                expect(megaRoom.arePluginsForcingMessageQueue({})).to.eql(true);

                megaChat.plugins = {
                    'forceQueue': {'shouldQueueMessage': function() { return false; } }
                };

                expect(megaRoom.arePluginsForcingMessageQueue({})).to.eql(false);

                megaChat.plugins = {
                    'forceQueue': {'shouldQueueMessage': function() { return false; } },
                    'forceQueue2': {'shouldQueueMessage': function() { return true; } }
                };

                expect(megaRoom.arePluginsForcingMessageQueue({})).to.eql(true);


                megaChat.plugins = origPlugins;


                // getMessageById


                var msg = {
                    messageId: "1234"
                };
                megaRoom.messages = [msg];

                expect(megaRoom.getMessageById("1234")).to.eql(msg);
                expect(megaRoom.getMessageById("12345")).to.eql(false);


                // _flushMessagesQueue
                megaRoom._messagesQueue = [
                    new KarereEventObjects.OutgoingMessage(
                        /* toJid */ user1jid,
                        /* fromJid */ user2jid,
                        /* type */ "groupchat",
                        /* messageId */ "msgId",
                        /* contents */ "message contents",
                        /* meta */ {
                            'roomJid': megaRoom.roomJid
                        },
                        /* delay */ 123
                    )
                ];

                megaRoom._flushMessagesQueue();

                expect(megaRoom._messagesQueue.length).to.eql(0);
                expect(megaRoom._messagesQueue.length).to.eql(0);
                expect(megaChat.karere.sendRawMessage.callCount).to.eql(2);

                expect(megaChat.karere.sendRawMessage.getCall(0).args[2]).to.eql("message contents");
                // sync request, sent by the _flushMessageQueue
                expect(megaChat.karere.sendRawMessage.getCall(1).args[1]).to.eql("action");
                expect(megaChat.karere.sendRawMessage.getCall(1).args[3].action).to.eql("sync");


                done();
            });
    });
});
