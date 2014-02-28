describe("Chat.js - Karere UI integration", function() {

    var fixtureManager = new Fixtures("./src/unit/fixtures/chat/");

    window.u_handle = "testcase1";
    window.avatars = {};

    var $container = null;

    var karereMocker = null;

    var functionsMocker;
    beforeEach(function(done) {
        localStorage.clear();

        functionsMocker = new FunctionsMocker();

        localStorage.removeItem("megaChatPresence");

        window.oldM = M;
        window.M = {
            'u': {
                "testcase1": {
                    "u": "testcase1", "c": 2, "m": "lpetrov@me.com", "presence": "chat", "presenceMtime": 1391783363.743
                },
                "someid": {
                    "u": "someid", "c": 1, "m": "lp@mega.co.nz", "ts": 1390835777, "name": "lp@mega.co.nz", "h": "hsxs0LUdV1s", "t": 1, "p": "contacts", "presence": "chat", "presenceMtime": 1392042647
                }
            }
        };

        fixtureManager.get("templates.html")
            .done(function(filename, contents) {

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

                window.km = karereMocker;

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

        window.M = window.oldM;
        megaChat.destroy();

        karereMocker.restore();

        $container.remove();
        done();
    });



    it("can load fixtures", function(done) {
        expectToBeResolved(
            fixtureManager.get("templates.html"),
            "failed to load templates.html"
        );

        done();
    });


    it("1on1 chat, invitation accept for 1on1 chat rooms", function(done) {
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

                megaChat.karere._triggerEvent("UserJoined", {
                    "myOwn":true,
                    "to": user1jid,
                    "from": roomJid + "/" + megaChat.karere.getNickname(),
                    "id":null,
                    "roomJid":roomJid,
                    "currentUsers":{},
                    "newUsers":users
                });


                expect(megaChat.chats[roomJid].getParticipants())
                    .to.eql(
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


        expect(
            megaChat.karere.joinChat.getCall(0).args[0]
        ).to.equal(roomJid);

        expect(
            megaChat.karere.joinChat.getCall(0).args[1]
        ).to.equal("password");

        megaChat.chats[roomJid].show();

        // receive user list

        megaChat.karere._triggerEvent("UsersJoined", {
            "myOwn":false,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":{},
            "newUsers":users
        });

        megaChat.karere.setMeta('rooms', roomJid, 'users', users);

        users[user1jid] = "participant";

        megaChat.karere._triggerEvent("UsersJoined", {
            "myOwn":true,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":users,
            "newUsers":users
        });
        megaChat.karere._triggerEvent("UsersUpdatedDone", {
            "myOwn":true,
            "to": user1jid,
            "from": roomJid + "/" + Karere.getNicknameFromJid(user1jid) + "resource",
            "id":null,
            "roomJid":roomJid,
            "currentUsers":users,
            "newUsers":users
        });

        assert(
            megaChat.chats[roomJid].state == MegaChatRoom.STATE.SYNCING,
            "Invalid state found. Expected: SYNCING, got: " + megaChat.chats[roomJid].getStateAsText()
        );


        expect(
            megaChat.karere.sendAction
        ).to.have.been.calledOnce;


        var testMessages = [
            {
                "from": user1jid,
                "message":"hopala2",
                "timestamp":100,
                "id":"2"
            },
            {
                "from": user1jid,
                "message":"hopala3",
                "timestamp":200,
                "id":"3"
            },
            {
                "from": user2jid,
                "message":"hopala1",
                "timestamp":50,
                "id":"1"
            },
            {
                "from": user1jid,
                "message":"hopala4",
                "timestamp":300,
                "id":"4"
            }
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
            messagesInOrderedList.push({
                'ts': $(this).attr('data-timestamp'),
                'time': $('.fm-chat-message-time', $(this)).text(),
                'msg': $('.fm-chat-message', $(this)).text(),
                'name': $('.fm-chat-username', $(this)).text()
            });
        });

        var expectedMessagesList = [
            {
                "ts": "50",
                "time": unixtimeToTimeString(testMessages[2].timestamp),
                "msg": "hopala1",
                "name": "lp@mega.co.nz"
            },
            {
                "ts": "100",
                "time": unixtimeToTimeString(testMessages[0].timestamp),
                "msg": "hopala2",
                "name": "lpetrov@me.com"
            },
            {
                "ts": "200",
                "time": unixtimeToTimeString(testMessages[1].timestamp),
                "msg": "hopala3",
                "name": "lpetrov@me.com"
            },
            {
                "ts": "300",
                "time": unixtimeToTimeString(testMessages[3].timestamp),
                "msg": "hopala4",
                "name": "lpetrov@me.com"
            }
        ];

        expect(messagesInOrderedList).to.eql(expectedMessagesList);

        expect(
            $('.fm-chat-header').data("roomJid")
        ).to.eql(roomJid.split("@")[0]);

        expect(
            $('.fm-chat-header').data("roomJid")
        ).to.eql(roomJid.split("@")[0]);

        expect(
            $('.messages-icon').is(":hidden")
        ).to.be.ok;

        expect(
            $('#treea_' + Object.keys(M.u)[1]).data("roomJid")
        ).to.eql(roomJid.split("@")[0]);

        done();
    });

    it("Presence sync across devices and auto invite to private rooms (resume/created chat support)", function(done) {


        var user1jid2 = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[0]].u) + "/res2";
        var user2jid = megaChat.getJidFromNodeId(M.u[Object.keys(M.u)[1]].u) + "/res";


        localStorage.megaChatPresence = megaChat._myPresence = "away";
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
                    [Karere.PRESENCE.ONLINE, '.online-status'],
                    [Karere.PRESENCE.AWAY, '.away-status'],
                    [Karere.PRESENCE.BUSY, '.busy-status'],
                    [Karere.PRESENCE.OFFLINE, '.offline-status']
                ];
                $.each(presenceCssClassMap, function(k, v) {
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
                        $('#treea_' + Object.keys(M.u)[1]).is(v[1])
                    ).to.be.ok;
                });

                done();
            });
    });
});
