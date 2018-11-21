/**
 * @fileOverview
 * CallNotificationsEngine tests
 */

describe("CallNotificationsEngine tests", function () {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;
    var fakeChatRoom = null;
    var clock;

    var now = 1;

    beforeEach(function () {
        clock = sinon.useFakeTimers("Date", "setTimeout", "clearTimeout");
        sandbox = sinon.sandbox.create();



        var fakeChatRoomObj = {};

        if (typeof(window.ChatRoom) === 'undefined') {
            window.ChatRoom = fakeChatRoomObj;
        }
        else {
            sandbox.stub(window, 'ChatRoom', fakeChatRoomObj);
        }

        sandbox.stub(Date, 'now', function() {
            return now * 1000;
        });

        fakeChatRoom = {
            "roomId": "roomId1",
            'chatId': "chatdId1"
        };
    });

    afterEach(function () {
        clock.restore();
        sandbox.restore();
    });


    it("test aggregateable simple", function(done) {
        var cne = new CallNotificationsEngine(fakeChatRoom);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u1']);
        expect(cne.notifications.length).to.eql(1);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u2']);
        expect(cne.notifications.length).to.eql(1);
        expect(JSON.stringify(cne.notifications[0].actors)).to.eql('["u1","u2"]');
        done();
    });

    it("test aggregateable complicated", function(done) {
        var cne = new CallNotificationsEngine(fakeChatRoom);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u1']);
        expect(cne.notifications.length).to.eql(1);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u2']);
        expect(cne.notifications.length).to.eql(1);
        expect(JSON.stringify(cne.notifications[0].actors)).to.eql('["u1","u2"]');

        cne.notify(CallNotificationsEngine.ACTIONS.LEFT, ['u1']);
        expect(cne.notifications.length).to.eql(2);
        expect(JSON.stringify(cne.notifications[1].actors)).to.eql('["u1"]');
        cne.notify(CallNotificationsEngine.ACTIONS.LEFT, ['u2']);
        expect(cne.notifications.length).to.eql(2);
        expect(JSON.stringify(cne.notifications[1].actors)).to.eql('["u1","u2"]');
        done();
    });

    it("test aggregateable + clearOthers", function(done) {
        var cne = new CallNotificationsEngine(fakeChatRoom);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u1']);
        expect(cne.notifications.length).to.eql(1);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u2']);
        expect(cne.notifications.length).to.eql(1);
        expect(JSON.stringify(cne.notifications[0].actors)).to.eql('["u1","u2"]');

        cne.notify(CallNotificationsEngine.ACTIONS.OFFLINE);
        expect(cne.notifications.length).to.eql(1);
        expect(cne.notifications[0].action).to.eql(CallNotificationsEngine.ACTIONS.OFFLINE);

        cne.notify(CallNotificationsEngine.ACTIONS.OFFLINE);
        expect(cne.notifications.length).to.eql(1);
        expect(cne.notifications[0].action).to.eql(CallNotificationsEngine.ACTIONS.OFFLINE);
        done();
    });

    it("test getCurrentNotification", function(done) {
        now = 1;
        var cne = new CallNotificationsEngine(fakeChatRoom);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u1']);
        cne.notify(CallNotificationsEngine.ACTIONS.JOIN, ['u2']);
        var current = cne.getCurrentNotification();
        expect(current.action).to.eql(CallNotificationsEngine.ACTIONS.JOIN);
        expect(JSON.stringify(current.actors)).to.eql('["u1","u2"]');
        expect(cne.notifications.length).to.eql(0);

        expect(cne.getCurrentNotification()).to.not.eql(undefined);
        expect(cne.getCurrentNotification()).to.eql(current);

        now += CallNotificationsEngine.EXPIRE + 100;
        expect(cne.getCurrentNotification()).to.eql(undefined);
        done();
    });
});
