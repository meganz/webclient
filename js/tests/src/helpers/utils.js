function expect() {
    return chai.expect.apply(this, toArray(arguments))
};

function fail(msg) {
    assert(false, msg + " " + (Array.prototype.splice.call(arguments, 1)).join(" "));
}

function expectToBeResolved($promise, msg) {
    $promise
        .fail(function() {
            if(localStorage.dxmpp) {
                debugger;
            }

            expect(true).to.eql(false, msg + ", fail arguments: " + toArray(arguments).join(", "));
        });

    return $promise;
}


var stringToXml = function(xmlStr) {
    var doc = $.parseXML(xmlStr);
    return doc.documentElement;
};

/**
 * Simple patch hack to make all logs from the tested code in Mocha to be grouped in the Google Chrome Console, so that
 * you can easily debug whats going on.
 *
 * This is intended to be used in Chrome.
 * Main goal is to be used when localStorage.d + dxmpp is == 1
 *
 * @returns {ConsoleMochaHelper}
 * @constructor
 */
var ConsoleMochaHelper = function() {
    var _it = it;
    var _refs = {
        'beforeEach': beforeEach,
        'afterEach': afterEach
    };
    var logMethod = "group";
    if(window.location.toString().indexOf("logcollapsed=1") != -1) {
        logMethod = 'groupCollapsed';
    }

    it = function(title, fn) {
        _it(title, function(done) {
            console[logMethod](this.test.parent.title, title);

            fn.call(this, function() {
                console.groupEnd();
                done();
            });

            if(fn.length == 0) {
                console.groupEnd();
                if(done) {
                    done();
                }
            }
        });
    };

    $.each(['beforeEach', 'afterEach'], function(k, v) {
        window[v] = function(fn, done) {
            _refs[v](function(done) {
                console[logMethod](this.currentTest.parent.title, this.currentTest.title, "[" + v + "]");

                fn.call(this, function() {
                    console.groupEnd();
                    done();
                });

                if(fn.length == 0) {
                    console.groupEnd();
                    if(done) {
                        done();
                    }
                }
            });
        }
    });

    this.restore = function() {
        it = _it;
        beforeEach = _refs['beforeEach'];
        afterEach = _refs['afterEach'];
    };

    return this;
};

/**
 * Run this in the console start running Mocha unit tests forever.
 * Helpful to find race conditions/really hard to track problems in the integration tests.
 */
var loopMochaTests = function() {
    var x = 0;

    stop_it = false; /* global flag, to be used from the console to stop the unit tests */
    var fn1 = function() {
        if(!stop_it) {
            console.clear();
            console.log("Loop #", x++);
            mocha.run(fn1);
        }
    };
    mocha.run(fn1);
};


var msgIdx = 0;
function getOutgoingMessage(data) {
    data = data || {};

    return new KarereEventObjects.OutgoingMessage(
        /* toJid */ "room@conference.jid.com",
        /* fromJid */ "from@jid.com",
        /* type */ "groupchat",
        /* messageId */ rand(1000).toString() + "_" + msgIdx++,
        /* contents */ data.contents ? data.contents : "message contents",
        /* meta */ data.meta ? data.meta : {},
        /* delay */ data.delay ? data.delay : unixtime(),
        /* state */ data.state ? data.state : KarereEventObjects.OutgoingMessage.STATE.NOT_SENT,
        /* roomJid */ data.roomJid ? data.roomJid : "room@conference.jid.com",
        /* seen? */ data.seen ? data.seen : false
    );
}
function getIncomingMessage(data) {
    data = data || {};

    return new KarereEventObjects.IncomingMessage(
        /* toJid */ "room@conference.jid.com",
        /* fromJid */ "from@jid.com",
        /* type */ "groupchat",
        /* rawType */ "groupchat",
        /* messageId */ rand(1000).toString() + "_" + msgIdx++,
        /* rawMessage */ undefined,
        /* roomJid */ data.roomJid ? data.roomJid : "room@conference.jid.com",
        /* meta */ data.meta ? data.meta : {},
        /* contents */ data.contents ? data.contents : "message contents",
        /* elements */ undefined,
        /* delay */ data.delay ? data.delay : unixtime(),
        /* seen? */ data.seen ? data.seen : false
    )
}

var DummyRoom = function(){};
makeObservable(DummyRoom);

function getMegaRoom(data) {
    data = data || {};

    var obj = new DummyRoom();
    obj.roomJid = data.roomJid ? data.roomJid : "room123@conference.jid.com";
    obj.type = data.type ? data.type : "private";
    obj._conv_ended = data.ended ? data.ended : false;
    obj.state = data.state ? data.state : ChatRoom.STATE.INITIALIZED;
    obj.ctime = data.ctime ? data.ctime : unixtime();
    obj.users = data.users ? data.users : [
        'from@jid.com',
        'to@jid.com',
    ];
    obj._messagesQueue = [];

    obj.appendMessage = function(){};

    sinon.spy(obj, 'appendMessage');
    sinon.spy(obj, 'on');
    sinon.spy(obj, 'bind');
    sinon.spy(obj, 'unbind');
    sinon.spy(obj, 'trigger');

    return obj;
}

var generateDummyReactInstance = function(name, props, state) {
    var obj = {
        simulateDidMount: function() {
            this.componentDidMount();
        },
        simulateWillUnmount: function() {
            this.componentWillUnmount();
        },
        simulateWillMount: function() {
            this.componentWillMount();
        },
        _currentElement: {
            type: {
                displayName: name
            }
        },
        isMounted: function() {
            return true;
        },
        forceUpdate: function() {
            //debugger;
        },
        _pendingForceUpdate: false,
        props: props,
        state: state
    };

    sinon.spy(obj, 'forceUpdate');

    return obj;
};

var applyMixinToReactElement = function(obj, mxin) {
    Object.keys(mxin).forEach(function(k) {
        var v = mxin[k];

        if(typeof(v) == 'function') {
            if(obj[k]) {
                console.error("Fn: ", k, "already defined in the main object. Can't apply mixin.");
            } else {
                obj[k] = v;
            }
        }
    })
};

window.module = {};