// presenced client layer

// presence = new UserPresence(u_handle, can_webrtc, can_mobilepush, connectedcb, peerpresencecb, savesettingscb,
// updateuicb)

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

// presence.ui_setautoaway(timeout)
// (call this when the user changes the auto-away setting)
// timeout in seconds (max. 16777214), -1 means "always online" (checkmark not set), 0 means "always away" (timeout
// field empty)

// presence.ui_setpersist(active)
// (call this when the user checks/unchecks the persist-if-offline setting)

// presence.ui_settings(settings)
// (call this immediately after login with the binary string from the user attribute "pr" and
// upon any actionpacket-driven change of that attribute)

// savesettingscb(settings)
// (when this callback is invoked, save the settings - a binary string - to user attribute "pr")

// updateuicb(presencelevel, autoawaytimeout, overridelag)
// when this callback is invoke, update the UI accordingly (if autoawaytimeout < 0, uncheck auto away option)

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

var UserPresence = function userpresence(
    userhandle,
    can_webrtc,
    can_mobilepush,
    connectedcb,
    peerstatuscb,
    savesettingscb,
    updateuicb
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
    this.capabilities = String.fromCharCode(((can_webrtc && 0x80) | (can_mobilepush && 0x40)));

    // current override and "changed locally, try to push to server" flag
    this.override = false;
    this.overridechanged = false;


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
                        self.canceled === true ||
                        localStorage.megaChatPresence === "unavailable" ||
                        localStorage.userPresenceIsOffline === "1"
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

    // auto-AWAY timer
    this.autoawaytimer = false;

    // fixed client capability flags
    // 0x80 - client can be called with WebRTC
    // 0x40 - client can be woken up with push notifications
    this.capabilities = 0;

    // last flags command to be issued after a reconnect
    this.lastflagscmd = false;

    // user adjusted persistent status locally
    this.overridechanged = false;

    // user has timed out into autoaway status
    this.autoaway = false;

    // callbacks
    this.connectedcb = connectedcb;   // called when the connection to presenced is going up or down
    this.peerstatuscb = peerstatuscb; // called when any peer's status changes (including for self)
    this.savesettingscb = savesettingscb; // called when settings need to be saved in user attribute "pr"
    this.updateuicb = updateuicb;     // called when the UI needs to be updated

    // UI-related state (defaults will be overridden by first call to ui_settings() and by presenced after connect)
    this.persist = false;               // override active
    this.autoawaytimeout = 300;         // auto-away timeout
    this.ui_presencelevel = UserPresence.PRESENCE.ONLINE;
};


UserPresence.PRESENCE = {
    'OFFLINE': 1,   // grey
    'AWAY': 2,      // yellow
    'ONLINE':  3,   // green
    'DND':  4      // red
};

UserPresence.prototype.reconnect = function presence_reconnect(self) {
    if (!self) {
        self = this;
    }

    if (self.s) {
        self.canceled = true;
        self.s.close();
        self.s.onclose = undefined;
        self.s.onerror = undefined;
        self.s.onopen = undefined;
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
                if (this.up.overridechanged) {
                    this.up.sendoverride();
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
            $(self).trigger('onDisconnected');

            if (self.keepalivesendtimer) {
                clearTimeout(self.keepalivesendtimer);
                self.keepalivesendtimer = false;
            }

            if (self.keepalivechecktimer) {
                clearTimeout(self.keepalivechecktimer);
                self.keepalivechecktimer = false;
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
        };

        self.s.onmessage = function (m) {
            if (!this.canceled) {
                console.error(
                    "PRESENCE INCOMING: ",
                    ab_to_base64(m.data)
                );

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

                        case 2: // OPCODE_STATUSOVERRIDE
                            if ((this.up.persist ? this.up.ui_presencelevel : 0) === u[1]) {
                                // the override matches what we wanted to set - clear changed flag
                                this.up.overridechanged = false;
                            }
                            else {
                                if (u[1]) {
                                    this.up.ui_presencelevel = u[1];
                                    this.up.persist = true;
                                }
                                else {
                                    this.up.persist = false;
                                }

                                this.up.ui_signalactivity(true);
                                this.up.updateui();
                            }
                            p += 2;
                            break;

                        case 6: // OPCODE_PEERSTATUS
                            if (this.up.peerstatuscb) {
                                this.up.peerstatuscb(
                                    ab_to_base64(new Uint8Array(u.buffer, p+2, 8)), u[p + 1] & 0xf, u[p + 1] & 0x80
                                );
                            }
                            p += 10;
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
};

UserPresence.prototype.addremovepeers = function presence_addremovepeers(peers, del) {
    var delta = '';

    for (var i = peers.length; i--; ) {
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
    if (!this.s) {
        console.error("Called UserPresence.sendstring when offline.");
        return;
    }

    var u = new Uint8Array(s.length);

    for (var i = s.length; i--; ) {
        u[i] = s.charCodeAt(i);
    }

    console.error(
        "PRESENCE OUTGOING: ",
        ab_to_base64(u.buffer)
    );

    this.s.send(u);
};

// must be called with the binary representation of the userid delta
UserPresence.prototype.sendpeerupdate = function presence_sendpeerupdate(peerstring, del) {
    var num = peerstring.length/8;

    peerstring = (del ? "\5" : "\4") // opcode
        + String.fromCharCode(num & 0xff)
        + String.fromCharCode((num >> 8) & 0xff)
        + String.fromCharCode((num >> 16) & 0xff)
        + String.fromCharCode((num >> 24) & 0xff)
        + peerstring;

    this.sendstring(peerstring);
};

// call this whenever persist or ui_presencelevel changes
UserPresence.prototype.sendoverride = function presence_sendoverride() {
    if (this.open) {
        this.overridechanged = true;    // this will be reset once the server responds with the same status
        this.sendstring("\2" + String.fromCharCode(this.persist ? this.ui_presencelevel : 0));
    }
};

UserPresence.prototype.sendflags = function presence_sendflags(online, dnd) {
    if (this.open) {
        this.lastflagscmd = "\3" + String.fromCharCode((online ? 1 : 0) | (dnd ? 2 : 0));
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
    self.keepalivesendtimer = setTimeout(self.sendkeepalive, self.KEEPALIVETIMEOUT-5000, self);

    if (!self.keepalivechecktimer) {
        self.keepalivechecktimer = setTimeout(self.keepalivetimeout, self.KEEPALIVETIMEOUT, self);
    }
};

UserPresence.prototype.keepalivetimeout = function presence_keepalivetimeout(self) {
    self.reconnect();
};

UserPresence.prototype.ui_setstatus = function presence_ui_setstatus(presencelevel) {
    this.ui_presencelevel = presencelevel;

    if (!this.persist) {
        if (presencelevel == UserPresence.PRESENCE.AWAY) {
            // user chose AWAY: disable online status
            this.autoawaytimeout = -1;
        }
        else {
            if (presencelevel == UserPresence.PRESENCE.OFFLINE) {
                // user wants to appear offline: activate persistence
                // (which is the only way this can be achieved short of really going offline)
                this.persist = true;
            }
        }
    }

    this.ui_signalactivity(true);
    this.sendoverride();
    this.updateui();
};

// timeout < 0: checkmark unchecked (always online/dnd)
// timeout == 0: checkmark checked, but no or 0 timeout (always away)
// timeout > 0: checkmark checked and timeout > 0 set
UserPresence.prototype.ui_setautoaway = function presence_ui_setautoaway(timeout) {
    if (timeout < 0) {
        timeout = -1;
    }

    if (!timeout) {
        // zero timeout: we're always away
        this.ui_presencelevel = UserPresence.PRESENCE.AWAY;
    }

    this.autoawaytimeout = timeout;
    this.autoaway = true;

    // update flags, reset/start timer
    this.ui_signalactivity(true);

    // disable persistence, if it was enabled
    if (this.persist) {
        this.persist = false;
        this.sendoverride();
    }

    this.updateui();

    timeout++;

    this.savesettingscb(String.fromCharCode(timeout & 0xff)
                      + String.fromCharCode((timeout >> 8) & 0xff)
                      + String.fromCharCode((timeout >> 16) & 0xff));
};

// activate persistent mode
UserPresence.prototype.ui_setpersist = function presence_ui_setpersist(persist) {
    if (persist != this.persist) {
        this.persist = persist;
        this.autoawaytimeout = -1;

        if (!persist) {
            // translate current UI status to non-persistent settings
            if (this.ui_presencelevel == UserPresence.PRESENCE.OFFLINE) {
                // cannot do OFFLINE without persistence
                this.ui_presencelevel = UserPresence.PRESENCE.AWAY;
            }

            // update flags
            this.ui_signalactivity(true);
        }

        this.sendoverride();
        this.updateui();
    }
};

// signal user activity (reset auto-away timer and set ONLINE/DND flags)
UserPresence.prototype.ui_signalactivity = function presence_ui_signalactivity(force) {
    if (this.autoawaytimer) {
        // stop timer if running for more than 50 seconds or no longer needed
        if (this.autoawaytimeout <= 0) {
            // (no longer needed)
            this.lastuiactivity = 0;
        }

        var t = Date.now();

        if (t-this.lastuiactivity > 50000) {
            this.lastuiactivity = t;

            clearTimeout(this.autoawaytimer);
            this.autoawaytimer = false;
        }
    }

    // start timer if not running and timeout set
    if (!this.autoawaytimer && this.autoawaytimeout > 0) {
        this.autoawaytimer = setTimeout(this.autoaway, this.autoawaytimeout*1000, this);
    }

    if (force || !this.persist && this.autoaway && this.autoawaytimeout >= 0) {
        // volatile online/do not disturb with auto-away and auto-offline/away
        this.autoaway = false;
        this.sendflags(
            this.ui_presencelevel == UserPresence.PRESENCE.ONLINE,
            this.ui_presencelevel == UserPresence.PRESENCE.DND
        );
    }
};

// auto-AWAY timer has fired
UserPresence.prototype.autoaway = function presence_autoaway(self) {
    // cancel volatile status flags (DND/ONLINE) and timer
    self.sendflags(false, false);
    self.autoawaytimer = false;
    self.autoaway = true;
};

// update UI with the current internal state
UserPresence.prototype.updateui = function presence_updateui() {
    // we have status override active, disable auto-AWAY
    this.updateuicb(this.ui_presencelevel, this.autoawaytimeout, this.persist);
};

UserPresence.prototype.ui_settings = function presence_ui_settings(settings) {
    var autoawaytimeout = settings.charCodeAt(0)
                       + (settings.charCodeAt(1) << 8)
                       + (settings.charCodeAt(2) << 16)
                       - 1;

    if (autoawaytimeout != this.autoawaytimeout) {
        this.autoawaytimeout = autoawaytimeout;
        this.ui_signalactivity(true);
        this.updateui();
    }
};

if (true /* intentional: until we get this to be a bit more stable */ || localStorage.presencedDebug) {
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

Object.freeze(UserPresence.prototype);
