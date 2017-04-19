// presenced client layer

// presence = new UserPresence(
//      u_handle, can_webrtc, can_mobilepush, connectedcb, peerpresencecb, updateuicb, prefschangedcb
// )

// *** capability flags (identifying static client properties):

// can_webrtc: client is able to receive WebRTC calls
// can_mobilepush: client can be woken up by push notifications (should be false for browsers)

// *** presence levels:

// 1 - OFFLINE, user could be offline or invisible
// 2 - AWAY, at least one app is either pinging or likely to be reacting to push notifications
// 3 - ONLINE, user is actively using at least one app
// 4 - DND, user discourages calls/messages

// *** high-level (UI) interface:

// presence.ui_setstatus(presencelevel)
// (call this when the user selects a new presence level from the menu or the UI)

// presence.ui_setautoaway(checkmark, timeout)
// (call this when the user changes the auto-away setting)
// timeout in seconds, checkmark set + 0 timeout means "always away"

// presence.ui_setpersist(active)
// (call this when the user checks/unchecks the persist-if-offline setting)

// updateuicb(presence, autoaway, autoawaylock, autoawaytimeout, persist, persistlock)
// when this callback is invoked, update the UI accordingly

// prefschangedcb(changed)
// indicates whether unconfirmed changes to the user preferences exist (blink visual online status while
// changed == true)

// presence.ui_signalactivity()
// (call this whenever the user presses a key or moves the mouse)

// *** roster and connection management interface:

// presence.addremovepeers([u_handles], remove)
// adds or removes (if remove is set) peers that receive your presence
// (should be called with the local status already set to avoid immediate flapping)

// presence.retry()
// cancels exponential backoff and retries the reconnect immediately
// (call in response to mouse moves/keystrokes)

// connectedcb(status) will be called when the presenced connection goes up (status == true) or down

// peerpresencecb(userhandle, presencelevel, can_webrtc) will be called with any change of peer presence

// DEBUG flag
PRESENCE2_DEBUG = localStorage.presencedDebug;

var UserPresence = function userpresence(
    userhandle,
    can_webrtc,
    can_mobilepush,
    connectedcb,
    peerstatuscb,
    updateuicb,
    prefschangedcb
) {
    if (!(this instanceof userpresence)) {
        return new userpresence(userhandle);
    }

    // active websocket
    this.s = false;
    this.open = false;

    // current presenced URL and connection failures
    this.url = false;
    this.attempts = 0;

    // user handle
    this.userhandle = userhandle;

    // current peers
    this.peers = Object.create(null);

    // WebRTC/push notification capability flags
    // fixed client capability flags
    // 0x80 - client can be called with WebRTC
    // 0x40 - client can be woken up with push notifications
    this.capabilities = String.fromCharCode(((can_webrtc && 0x80) | (can_mobilepush && 0x40)));

    // desired appearance
    this.presence = UserPresence.PRESENCE.ONLINE;

    // persist presence even when offline
    this.persist = false;

    // autoaway timeout active flag
    this.autoawayactive = true;

    // autoaway timeout
    this.autoawaytimeout = 300;

    // user prefs changed
    this.prefschanged = false;

    // new instance
    this.starting = true;

    // console logging
    this.logger = MegaLogger.getLogger('UserPresence');

    var self = this;

    // connection retry timer and timeout (exponential backoff)
    self.connectionRetryManager = new ConnectionRetryManager(
        {
            functions: {
                reconnect: function(connectionRetryManager) {
                    if (connectionRetryManager._connectionRetries > 2) {
                        self.url = false;
                    }
                    self.reconnect();
                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    return self.disconnect();
                },
                /**
                 * Should return true or false depending on the current state of this connection, e.g.
                 * (connected || connecting)
                 *
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnectedOrConnecting: function(connectionRetryManager) {
                    return (
                        self.s && (
                            self.s.readyState == self.s.CONNECTING ||
                            self.s.readyState == self.s.OPEN
                        )
                    );
                },
                /**
                 * Should return true/false if the current state === CONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnected: function(connectionRetryManager) {
                    return (
                        self.s && (
                            self.s.readyState == self.s.OPEN
                        )
                    );
                },
                /**
                 * Should return true/false if the current state === DISCONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isDisconnected: function(connectionRetryManager) {
                    return (
                        !self.s || self.s.readyState == self.s.CLOSED
                    );
                },
                /**
                 * Should return true IF the user had forced the connection to go offline
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isUserForcedDisconnect: function(connectionRetryManager) {
                    return (
                        self.canceled === true
                    );
                }
            }
        },
        self.logger
    );

    this.canceled = false;

    // keepalive timers
    this.keepalivesendtimer = false;
    this.keepalivechecktimer = false;
    this.KEEPALIVETIMEOUT = 30000;

    // autoaway timer
    this.autoawaytimer = false;

    // local user was inactive (setflags(false) was called)
    this.wasinactive = true;

    // last flags command to be issued after a reconnect
    this.lastflagscmd = false;

    // callbacks
    this.connectedcb = connectedcb;   // called when the connection to presenced is going up or down
    this.peerstatuscb = peerstatuscb; // called when any peer's status changes (including for self)
    this.updateuicb = updateuicb;     // called when the UI needs to be updated
    this.prefschangedcb = prefschangedcb;  // called when the user sets new prefs and when presenced confirms them
};

UserPresence.PRESENCE = {
    OFFLINE: 1, // grey
    AWAY:    2, // yellow
    ONLINE:  3, // green
    DND:     4  // red
};

UserPresence.prototype.reconnect = function presence_reconnect(self) {
    if (!self) {
        self = this;
    }

    if (self.s) {
        self.canceled = true;
        self.s.onclose = undefined;
        self.s.onerror = undefined;
        self.s.onopen = undefined;
        self.s.close();
        self.s = false;

        if (self.open) {
            self.connectedcb(false);
        }

        self.open = false;
        self.canceled = false;
    }


    if (self.keepalivesendtimer) {
        clearTimeout(self.keepalivesendtimer);
        self.keepalivesendtimer = false;
    }

    if (self.keepalivechecktimer) {
        clearTimeout(self.keepalivechecktimer);
        self.keepalivechecktimer = false;
    }


    if (self.url) {
        self.s = new WebSocket(self.url);

        self.s.binaryType = 'arraybuffer';
        self.s.up = self;

        self.s.onopen = function () {
            if (!self.canceled) {
                this.up.retrytimeout = 0;
                this.up.open = true;

                // reinitialise remote state
                // HELLO version 1 with fixed client capability flags
                this.up.sendstring("\1\1" + this.up.capabilities);

                this.up.connectedcb(true);

                // only update override if user made a change that is not yet confirmed
                if (this.up.prefschanged) {
                    this.up.sendprefs();
                }

                // ...and then restore the dynamic status flags
                if (this.up.lastflagscmd) {
                    this.up.sendstring(this.up.lastflagscmd);
                }

                // (re)send current peers
                this.up.sendpeerupdate(Object.keys(this.up.peers).join(''));

                // start pinging
                this.up.sendkeepalive();

                this.up.connectionRetryManager.gotConnected();
                $(self).trigger('onConnected');
            }
            else {
                // if canceled while trying to connect, drop the connection or it would stay idle.
                this.up.disconnect(true);
            }
        };

        self.s.onclose = function () {
            if (self.s.readyState === 1) {
                // not really closed, but something weird happened (or a bug in chrome?), so force close!
                self.s.close();
            }

            $(self).trigger('onDisconnected');

            if (self.keepalivesendtimer) {
                clearTimeout(self.keepalivesendtimer);
                self.keepalivesendtimer = false;
            }

            if (self.keepalivechecktimer) {
                clearTimeout(self.keepalivechecktimer);
                self.keepalivechecktimer = false;
            }
            if (self.connectedcb) {
                self.connectedcb(false);
            }
            self.connectionRetryManager.gotDisconnected();
        };

        self.s.onerror = function () {
            self.logger.error("websocket closed - error:", arguments);
            $(self).trigger('onDisconnected');

            if (self.keepalivesendtimer) {
                clearTimeout(self.keepalivesendtimer);
                self.keepalivesendtimer = false;
            }

            if (self.keepalivechecktimer) {
                clearTimeout(self.keepalivechecktimer);
                self.keepalivechecktimer = false;
            }

            if (!this.canceled) {
                self.connectionRetryManager.doConnectionRetry();
            }

            if (self.connectedcb) {
                self.connectedcb(false);
            }
        };

        self.s.onmessage = function (m) {
            if (!this.canceled) {
                if (PRESENCE2_DEBUG) {
                    console.error(
                        (new Date()).toISOString(),
                        "PRESENCE INCOMING:",
                        UserPresence.commandDebugDataAsPrettyString(
                            self.incomingDataAsReadableCommand(m.data)
                        ),
                        "b64:", ab_to_base64(m.data)
                    );
                }

                var u = new Uint8Array(m.data);
                var p = 0;

                while (p < u.length) {
                    switch (u[p]) {
                        case 0: // OPCODE_KEEPALIVE
                            if (this.up.keepalivechecktimer) {
                                clearTimeout(this.up.keepalivechecktimer);
                                this.up.keepalivechecktimer = false;
                            }
                            p++;
                            break;

                        case 6: // OPCODE_PEERSTATUS
                            var user = ab_to_base64(new Uint8Array(u.buffer, p + 2, 8));
                            var presence = u[p + 1] & 0xf;
                            var isWebrtcFlag = u[p + 1] & 0x80;

                            var userBin = base64urldecode(user);
                            if (!this.up.peers[userBin]) {
                                this.up.peers[userBin] = true;
                            }

                            if (this.up.peerstatuscb) {
                                this.up.peerstatuscb(
                                    user,
                                    presence,
                                    isWebrtcFlag
                                );
                            }
                            p += 10;
                            break;

                        case 7: // OPCODE_PREFS
                            var newprefs = u[p + 1] + (u[p + 2] << 8);

                            if (newprefs == this.up.prefs()) {
                                if (this.prefschangedcb) {
                                    this.prefschangedcb(false);
                                }

                                this.up.prefschanged = false;
                            }
                            else {
                                this.up.presence = (newprefs & 3) + UserPresence.PRESENCE.OFFLINE;
                                this.up.persist = !!(newprefs & 4);
                                this.up.autoawayactive = !(newprefs & 8);
                                this.up.autoawaytimeout = newprefs >> 4;

                                if (this.up.autoawaytimeout > 600) {
                                    this.up.autoawaytimeout = Math.floor((this.up.autoawaytimeout - 600) * 60) + 600;
                                }

                                this.up.ui_signalactivity(true);
                                this.up.updateui();
                            }

                            // set up things according to the user's prefs if we're a fresh client
                            if (this.up.starting) {
                                this.up.starting = false;
                                this.up.ui_signalactivity();
                            }

                            p += 3;
                            break;

                        default:
                            console.error("Fatal - unknown opcode: " + u[p]);
                            // reload forcefully, as we are probably out of date
                            return this.up.reload();
                    }
                }

                if (p != u.length) {
                    console.error("Fatal - bad framing");
                    this.up.reload();
                }
            }
        };
    }
    else {
        api_req(
            {
                a: 'pu'
            },
            {
                callback: function(res, ctx) {
                    if (typeof res == 'string') {
                        ctx.self.url = res;
                    }
                    ctx.self.reconnect();
                },
                self: self
            }
        );
    }
};

UserPresence.prototype.disconnect = function(userForced) {
    var self = this;

    if (userForced) {
        self.canceled = true;
    }

    if (self.s && self.s.close) {
        self.s.close();
    }
    self.s = false;
    self.open = false;

    if (self.keepalivesendtimer) {
        clearTimeout(self.keepalivesendtimer);
        self.keepalivesendtimer = false;
    }

    if (self.keepalivechecktimer) {
        clearTimeout(self.keepalivechecktimer);
        self.keepalivechecktimer = false;
    }

    self.connectionRetryManager.gotDisconnected();

    $(self).trigger('onDisconnected');
    // on FF, the onclose/onerror won't get triggered, maybe because of the websocket is waiting for the "close"
    // packet to be sent correctly
    if (self.connectedcb) {
        self.connectedcb(false);
    }
};

UserPresence.prototype.addremovepeers = function presence_addremovepeers(peers, del) {
    var delta = '';

    for (var i = peers.length; i--;) {
        var u = base64urldecode(peers[i]);
        if (del && this.peers[u]) {
            delete this.peers[u];
            delta += u;
        }
        else if (!del && !this.peers[u]) {
            this.peers[u] = true;
            delta += u;
        }
    }

    if (this.open) {
        this.sendpeerupdate(delta, del);
    }
};

UserPresence.prototype.sendstring = function presence_sendstring(s) {
    if (!this.s || this.s.readyState !== 1) {
        console.error("Called UserPresence.sendstring when offline.");
        return;
    }

    var u = new Uint8Array(s.length);

    for (var i = s.length; i--;) {
        u[i] = s.charCodeAt(i);
    }

    if (PRESENCE2_DEBUG) {
        console.error(
            (new Date()).toISOString(),
            "PRESENCE OUTGOING:",
            UserPresence.commandDebugDataAsPrettyString(
                this.outgoingDataAsReadableCommand(u.buffer)
            ),
            "b64:", ab_to_base64(u.buffer)
        );
    }

    this.s.send(u);
};

// must be called with the binary representation of the userid delta
UserPresence.prototype.sendpeerupdate = function presence_sendpeerupdate(peerstring, del) {
    if (peerstring === '') {
        return;
    }

    var num = peerstring.length / 8;

    peerstring = (del ? "\5" : "\4") // opcode
        + String.fromCharCode(num & 0xff)
        + String.fromCharCode((num >> 8) & 0xff)
        + String.fromCharCode((num >> 16) & 0xff)
        + String.fromCharCode((num >> 24) & 0xff)
        + peerstring;

    this.sendstring(peerstring);
};

UserPresence.prototype.sendprefs = function presence_sendprefs() {
    this.prefschanged = true;    // this will be reset once the server responds with the same status

    if (this.open) {
        var prefs = this.prefs();
        this.sendstring("\7" + String.fromCharCode(prefs & 0xff) + String.fromCharCode(prefs >> 8));
    }
};

UserPresence.prototype.sendflags = function presence_sendflags(active) {
    if (this.open) {
        this.lastflagscmd = "\3" + String.fromCharCode(active ? 1 : 0);
        this.sendstring(this.lastflagscmd);
    }
};

UserPresence.prototype.sendkeepalive = function presence_sendkeepalive(self) {
    if (!self) {
        self = this;
    }

    if (self.keepalivesendtimer) {
        clearTimeout(self.keepalivesendtimer);
    }

    self.sendstring("\0");
    self.keepalivesendtimer = setTimeout(self.sendkeepalive, self.KEEPALIVETIMEOUT - 5000, self);

    if (!self.keepalivechecktimer) {
        self.keepalivechecktimer = setTimeout(self.keepalivetimeout, self.KEEPALIVETIMEOUT, self);
    }
};

UserPresence.prototype.keepalivetimeout = function presence_keepalivetimeout(self) {
    self.reconnect();
};

UserPresence.prototype.ui_setstatus = function presence_ui_setstatus(presence) {
    if (presence != this.presence) {
        if (this.prefschangedcb) {
            this.prefschangedcb(true);
        }

        this.presence = presence;

        this.ui_signalactivity(true);
        this.sendprefs();
        this.updateui();
    }
};

UserPresence.prototype.prefs = function presence_prefs() {
    var t = this.autoawaytimeout;

    if (t > 600) {
        t = 600 + Math.floor((t - 600) / 60);
    }

    return (t << 4) + (this.autoawayactive ? 0 : 8) + (this.persist ? 4 : 0) + this.presence
        - UserPresence.PRESENCE.OFFLINE;
};

UserPresence.prototype.ui_setautoaway = function presence_ui_setautoaway(active, timeout) {
    if (active) {
        this.persist = false;
    }

    if (timeout !== undefined) {
        this.autoawaytimeout = timeout;
    }

    this.autoawayactive = active;

    if (this.prefschangedcb) {
        this.prefschangedcb(true);
    }

    // update flags, reset/start timer
    this.ui_signalactivity(true);
    this.sendprefs();
    this.updateui();
};

// activate persistent mode
UserPresence.prototype.ui_setpersist = function presence_ui_setpersist(persist) {
    if (persist != this.persist) {
        this.persist = persist;

        this.ui_signalactivity(true);
        this.sendprefs();
        this.updateui();
    }
};

// signal user activity (reset auto-away timer and set ONLINE/DND flags)
UserPresence.prototype.ui_signalactivity = function presence_ui_signalactivity(force) {
    var timeout = !this.persist
                && this.presence == UserPresence.PRESENCE.ONLINE
                && this.autoawaytimeout
                && this.autoawayactive;

    if (this.autoawaytimer) {
        // stop timer if running for more than 50 seconds or no longer needed
        if (!timeout) {
            // (no longer needed)
            this.lastuiactivity = 0;
        }

        var t = Date.now();

        if (t - this.lastuiactivity > 50000) {
            this.lastuiactivity = t;

            clearTimeout(this.autoawaytimer);
            this.autoawaytimer = false;
        }
    }

    if (timeout && !this.autoawaytimer) {
        // start timer if not running and timeout needed
        this.autoawaytimer = setTimeout(this.autoaway, this.autoawaytimeout * 1000, this);
    }

    if (!this.persist && this.presence != UserPresence.PRESENCE.OFFLINE) {
        // the activity flag matters - set or reset it
        if (this.presence != UserPresence.PRESENCE.AWAY) {
            if (force || this.wasinactive) {
                this.sendflags(true);
                this.wasinactive = false;
            }
        }
        else {
            this.sendflags(false);
            this.wasinacive = true;
        }
    }
};

// autoaway timer has fired
UserPresence.prototype.autoaway = function presence_autoaway(self) {
    // cancel volatile status flags (DND/ONLINE) and timer
    self.sendflags(false);
    self.autoawaytimer = false;
    self.wasinactive = true;
};

// update UI with the current internal state
UserPresence.prototype.updateui = function presence_updateui() {
    // adjust visual UI status according to the current constellation
    this.updateuicb(this.presence,
                    this.autoawayactive && !this.persist,
                    false,
                    this.autoawaytimeout,
                    this.persist || this.presence == UserPresence.PRESENCE.OFFLINE,
                    this.presence == UserPresence.PRESENCE.OFFLINE);
};

if (false && PRESENCE2_DEBUG) {
    Object.keys(UserPresence.prototype).forEach(function(fn) {
        var origFn = UserPresence.prototype[fn];
        UserPresence.prototype[fn] = function() {
            console.error(fn, arguments);
            var res = origFn.apply(this, arguments);
            if (res) {
                console.error(fn, 'result', arguments);
            }

            return res;
        };
    });
}

UserPresence.commandDebugDataAsPrettyString = function(arr) {
    var out = "";
    arr.forEach(function(cmd) {
        var cmdName = cmd.shift();
        out += cmdName + " => (";
        out += cmd.map(function(args) {
            return JSON.stringify(args);
        }).join(",");
        out += ")\n";
    });

    return out;
};

/**
 * This is a development-only method that is used for converting the binary commands to readable strings (array/list of
 * strings)
 *
 * @param ab
 */
UserPresence.prototype.incomingDataAsReadableCommand = function(ab) {
    // copy the 'ab' instead of modifying it
    var u = new Uint8Array(ab.slice(0));
    var p = 0;

    var output = [];
    while (p < u.length) {

        switch (u[p]) {
            case 0: // OPCODE_KEEPALIVE
                output.push([
                    "OPCODE_KEEPALIVE"
                ]);
                p++;
                break;

            case 6: // OPCODE_PEERSTATUS
                var userhash = ab_to_base64(new Uint8Array(u.buffer, p + 2, 8));
                var presence = u[p + 1] & 0xf;
                var isWebrtcFlag = u[p + 1] & 0x80;

                output.push([
                    "OPCODE_PEERSTATUS",
                    "userhash = " + userhash,
                    "presence = " + constStateToText(UserPresence.PRESENCE, presence),
                    "isWebrtcFlag = " + isWebrtcFlag
                ]);


                p += 10;
                break;

            case 7: // OPCODE_PREFS
                var newprefs = u[p + 1] + (u[p + 2] << 8);

                if (newprefs == this.prefs()) {
                    output.push([
                        "OPCODE_PREFS",
                        "prefs unchanged"
                    ]);
                }
                else {
                    var presence = (newprefs & 3) + UserPresence.PRESENCE.OFFLINE;
                    var persist = !!(newprefs & 4);
                    var autoawayactive = !(newprefs & 8);
                    var autoawaytimeout = newprefs >> 4;
                    if (autoawaytimeout > 600) {
                        autoawaytimeout = Math.floor((autoawaytimeout - 600) / 60) + 600;
                    }

                    output.push([
                        "OPCODE_PREFS",
                        "presence = " + constStateToText(UserPresence.PRESENCE, presence),
                        "persist = " + persist,
                        "autoawayactive = " + autoawayactive,
                        "autoawaytimeout = " + autoawaytimeout,
                    ]);
                }

                p += 3;
                break;

            default:
                output.push("Fatal - unknown opcode: " + u[p]);
                // kill the loop.
                return output;
        }
    }

    if (p != u.length) {
        output.put("Fatal - bad framing");
    }
    return output;
};

/**
 * This is a development-only method that is used for converting the binary commands to readable strings (array/list of
 * strings)
 *
 * @param ab
 */
UserPresence.prototype.outgoingDataAsReadableCommand = function(ab) {
    // copy the 'ab' instead of modifying it
    var u = new Uint8Array(ab.slice(0));
    var p = 0;

    // opcodes:
    /*
     0 - keep alive ping, no extra data
     \1\1 - hello, capabilities (String.fromCharCode(((can_webrtc && 0x80) | (can_mobilepush && 0x40))))
     3 - flags, user active (true - 1/false)
     4 - add peer, num of peers (4 bytes), peerstring (every peer id is 8 bytes)
     5 - delete peer, num of peers, peerstring
     7 - prefs, enabled/disabled, autoaway timeout value (seconds)
     */
    var output = [];
    while (p < u.length) {

        switch (u[p]) {
            case 0: // KEEPALIVE
                output.push([
                    "KEEPALIVE"
                ]);
                p++;
                break;

            case 1: // HELLO
                output.push([
                    "HELLO",
                    "webrtc = " + (u[p + 2] & 0x80 ? "true" : "false"),
                    "can_mobilepush = " + (u[p + 2] & 0x40 ? "true" : "false"),
                ]);
                p += 3;
                break;

            case 3: // FLAGS
                output.push([
                    "FLAGS",
                    "online = " + (!!(u[p + 1] & 1)),
                    "dnd = " + (!!(u[p + 1] & 2)),
                ]);

                p += 2;
                break;

            case 4: // FLAGS
            case 5:
                var numpeers = (
                    u[p + 1]
                    + (u[p + 2] << 8)
                    + (u[p + 3] << 16)
                    + (u[p + 4] << 24)
                );

                var peers = [];
                for (var i = 0; i < numpeers; i++) {
                    peers.push(
                        ab_to_base64(
                            u
                                .subarray(
                                    p + 5 + (i * 8),
                                    p + 5 + ((i + 1) * 8)
                                )
                        )
                    );
                }
                output.push([
                    "PEERUPDATE",
                    u[p] === 4 ? "add" : "delete",
                    "peers:", peers.join(", ")
                ]);


                p += 5 + numpeers * 8;
                break;

            case 7: // PREFS
                var newprefs = u[p + 1] + (u[p + 2] << 8);

                var flags = newprefs & 15;

                var presence = (newprefs & 3) + UserPresence.PRESENCE.OFFLINE;
                var persist = !!(newprefs & 4);
                var autoawayactive = !(newprefs & 8);
                var autoawaytimeout = newprefs >> 4;
                if (autoawaytimeout > 600) {
                    autoawaytimeout = Math.floor((autoawaytimeout - 600) / 60) + 600;
                }


                output.push([
                    "PREFS",
                    "prefs flags = " + flags,
                    "presence = " + constStateToText(UserPresence.PRESENCE, presence),
                    "persist = " + persist,
                    "autoawayactive = " + autoawayactive,
                    "autoawaytimeout = " + autoawaytimeout,
                ]);

                p += 3;
                break;

            default:
                output.push("Fatal - unknown opcode: " + u[p]);
                // kill the loop.
                return output;
        }
    }

    if (p != u.length) {
        output.put("Fatal - bad framing");
    }
    return output;
};

Object.freeze(UserPresence.prototype);
