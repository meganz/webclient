/**
 * @fileOverview
 * Notifications unit tests.
 */

describe("MegaNotifications Unit Test", function() {
    "use strict";

    var assert = chai.assert;

    // Create/restore Sinon stub/spy/mock sandboxes.
    var sandbox = null;

    var megaNotifications = null;

    beforeEach(function(done) {
        sandbox = sinon.sandbox.create();
        mStub(window, 'ion', {
            'sound': function() {
                ion.sound.play = function() {
                };
                sinon.spy(ion.sound, 'play');
                ion.sound.stop = function() {
                };
                sinon.spy(ion.sound, 'stop');
            }
        });
        mStub(window, 'bootstaticpath', './');

        // Initialize notifications
        mega.notif.setup(fmconfig.anf);

        var _notification = function() {
            this.close = function() {};
            sinon.spy(this, 'close');
            return this;
        };
        _notification.requestPermission = sinon.stub();
        _notification.permission = 'granted';
        mStub(window, 'Notification', _notification);
        mStub(window, 'Favico', function() {
            this.badge = function() {};
            sinon.spy(this, 'badge');

            this.reset = function() {};
            sinon.spy(this, 'reset');

            return this;
        });

        megaNotifications = new MegaNotifications({
            anfFlag: 'chat_enabled',
            textMessages: {
                'type1': {
                    'title': 'type1 title',
                    'icon': 'type1 icon',
                    'body': 'type1 body'
                }
            },
            showFaviconCounter: true
        });

        megaNotifications.bind("onNotificationCreated", function(e, n) {
            sinon.spy(n, '_showDesktopNotification');
        });

        done();
    });


    afterEach(function(done) {
        mStub.restore();
        done();
    });

    it("is initialised", function(done) {
        assert(megaNotifications instanceof MegaNotifications, 'MegaNotifications is not initialised properly');
        assert(typeof(megaNotifications.options.textMessages) !== undefined, 'options were not set properly');
        done();
    });
    it("can create notification", function(done) {
        var n = megaNotifications.notify(
            "type1",
            {
                anfFlag: 'chat_enabled',
                incrementCounter: true
            },
            true
        );

        expect(megaNotifications._notifications.length).to.eql(1);
        expect(megaNotifications._notifications[0]).to.eql(n);

        var group = megaNotifications.options.individualNotificationsDefaults.group;

        expect(megaNotifications._counters[group]).to.eql(1);

        n.setUnread(false);
        expect(megaNotifications._counters[group]).to.eql(0);

        n.setUnread(true);
        expect(megaNotifications._counters[group]).to.eql(1);
        expect(megaNotifications.getCounterGroup(group)).to.eql(1);

        megaNotifications.resetCounterGroup(group);
        expect(megaNotifications.getCounterGroup(group)).to.eql(0);

        n.setUnread(true);
        expect(megaNotifications.getCounterGroup(group)).to.eql(1);
        megaNotifications.resetCounterGroup(group, "type1");
        expect(megaNotifications.getCounterGroup(group)).to.eql(0);

        done();
    });

    it("desktop and audio (+ loop) notif. are triggered correctly", function(done) {
        var n = megaNotifications.notify(
            "type1",
            {
                anfFlag: 'chat_enabled',
                incrementCounter: true,
                sound: 'type1-sound',
                soundLoop: true
            },
            true
        );

        expect(n._showDesktopNotification.called).to.eql(true);
        expect(n._desktopNotification instanceof Notification).to.eql(true);

        expect(megaNotifications.favico instanceof Favico).to.eql(true);

        delay(function() {
            expect(megaNotifications.favico.badge.callCount).to.eql(1);
            expect(megaNotifications.favico.badge.calledWith(1)).to.eql(true);

            expect(typeof(ion.sound.play) !== "undefined").to.eql(true);
            expect(typeof(ion.sound.stop) !== "undefined").to.eql(true);

            // when loop is on, .stop will be called before .play()
            expect(ion.sound.stop.callCount).to.eql(2);
            expect(ion.sound.stop.calledWith("type1-sound")).to.eql(true);

            // play was called
            expect(ion.sound.play.callCount).to.eql(1);
            expect(ion.sound.play.calledWith("type1-sound")).to.eql(true);

            n.setUnread(false);
            delay(function() {

                expect(ion.sound.stop.callCount).to.eql(3);
                expect(ion.sound.stop.calledWith("type1-sound")).to.eql(true);
                expect(megaNotifications.favico.badge.callCount).to.eql(2);
                expect(megaNotifications.favico.badge.calledWith(0)).to.eql(true);


                var wasTriggered = false;
                megaNotifications.bind("onUnreadChanged", function(e, notif, v) {
                    expect(notif).to.eql(n);
                    expect(v).to.eql(true);
                    wasTriggered = true;
                });
                n.setUnread(true);

                expect(wasTriggered).to.eql(true);

                done();
            });
        });
    });

    it("desktop notifications - permission request", function(done) {
        var n = megaNotifications.notify(
            "type1",
            {
                anfFlag: 'chat_enabled',
                incrementCounter: true,
                sound: 'type1-sound',
                soundLoop: true
            },
            true
        );

        expect(Notification.requestPermission.called).to.eql(false);

        Notification.permission = 'unknown';

        n = megaNotifications.notify(
            "type1",
            {
                anfFlag: 'chat_enabled',
                incrementCounter: true,
                sound: 'type1-sound',
                soundLoop: true
            },
            true
        );

        expect(Notification.requestPermission.called).to.eql(true);

        done();
    });
});
