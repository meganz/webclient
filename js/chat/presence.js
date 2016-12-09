// presenced client layer

// presence = new UserPresence(u_handle, can_webrtc, can_mobilepush, connectedcb, overridecb, peerpresencecb)

// capabilities:

// can_webrtc: client is able to receive WebRTC calls
// can_mobilepush: client can be woken up by push notifications (should be false for browsers)

// presence levels:

// 1 - offline, user could be offline or invisible
// 2 - away, at least one app is either pinging or likely to be reacting to push notifications
// 3 - online, user is actively using at least one app
// 4 - do not disturb, user discourages calls/messages

// presence.setoverride(presencelevel)
// sets permanent override for the presence level that others see
// presencelevel = 0 reverts to automatic presence
// (call this only when the user has made a manual change using the override UI)

// presence.setonline(flag)
// flag == true: changes the tab's status to "online" (triggered by mouse move or keystroke)
// flag == false: reverts back to "user is idle" / "away" (it is the app's responsibility to
//                call this after n seconds of user inactivity!)

// presence.setdnd(flag)
// dnd == true: user does not want to be disturbed while using this tab

// presence.addremovepeers([u_handles], remove)
// adds or removes (if remove is set) peers that receive your presence
// (should be called with the local status already set to avoid immediate flapping)

// presence.retry()
// cancels exponential backoff and retries the reconnect immediately
// (call in response to mouse moves/keystrokes)

// connectedcb(status) will be called when the presenced connection goes up (status == true) or down

// overridecb(presencelevel) will be called with a new override status if available (it will not be called
// in response to a local presence.setoverride()!)

// peerpresencecb(userhandle, presencelevel, can_webrtc) will be called with any change of peer presence

(function() {

    var UserPresence = function userpresence(userhandle, can_webrtc, can_mobilepush, connectedcb, overridecb, peerstatuscb) {
        if (!(this instanceof userpresence)) {
            return new userpresence(userhandle);
        }

        // active websocket
        this.s = false;
        this.open = false;

        // current presenced URL and connection failures
        this.url = false;

        // user handle
        this.userhandle = userhandle;

        // current peers
        this.peers = {};

        // WebRTC/push notification capability flags
        this.capabilities = String.fromCharCode(((can_webrtc && 0x80) | (can_mobilepush && 0x40)));

        // online/away flag
        this.status_online = false;

        // mobile
        this.status_mobile = false;

        // do not disturb flag
        this.status_dnd = false;

        // current override and "changed locally, try to push to server" flag
        this.override = false;
        this.overridechanged = false;

        this.canceled = localStorage.userPresenceIsOffline && localStorage.userPresenceIsOffline === '1';

        var self = this;

        // connection retry timer and timeout (exponential backoff)
        this.connectionRetryManager = new ConnectionRetryManager(
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
                            localStorage.userPresenceIsOffline
                        );
                    }
                }
            },
            self.logger
        );

        // keepalive timers
        this.keepalivesendtimer = false;
        this.keepalivechecktimer = false;
        this.KEEPALIVETIMEOUT = 30000;

        // fixed client capability flags
        // 0x80 - client can be called with WebRTC
        // 0x40 - client can be woken up with push notifications
        this.capabilities = 0;

        // callbacks
        this.connectedcb = connectedcb;   // called when the connection to presenced is going up or down
        this.overridecb = overridecb;     // called when the override status for this user changes, update override UI
        this.peerstatuscb = peerstatuscb; // called when any peer's status changes (including for self)

        // console logging
        this.logger = MegaLogger.getLogger('UserPresence');
    };


    UserPresence.prototype.reconnect = function presence_reconnect(self) {
        if (!self) {
            self = this;
        }

        if (self.s) {
            self.s.close();
            self.s.onclose = undefined;
            self.s.onerror = undefined;
            self.s = false;

            if (self.open) {
                self.connectedcb(false);
            }

            self.open = false;
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

                    this.up.connectedcb(true);

                    // reinitialise remote state
                    // HELLO version 1 with fixed client capability flags
                    this.up.sendstring("\1\1" + this.up.capabilities);

                    // only update override if user has made an unconfirmed change
                    if (this.overridechanged) {
                        this.up.sendstring("\2" + String.fromCharCode(this.up.override));
                    }

                    // ...and then the dynamic status flags
                    this.up.setflags();

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

                if (self.pingtimer) {
                    clearTimeout(self.pingtimer);
                    self.pingtimer = false;
                }
                self.connectionRetryManager.gotDisconnected();
            };

            self.s.onerror = function () {
                $(self).trigger('onDisconnected');

                if (self.pingtimer) {
                    clearTimeout(self.pingtimer);
                    self.pingtimer = false;
                }
                if (!this.canceled) {
                    self.connectionRetryManager.doConnectionRetry();
                }
            };

            self.s.onmessage = function (m) {
                if (!this.canceled) {
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
                                if (this.up.override === u[1]) {
                                    // the override matches what we wanted to set
                                    this.up.overridechanged = false;
                                }
                                else if (this.up.overridecb) {
                                    this.up.override = u[1];
                                    // ask app to change the override UI element
                                    this.up.overridecb(this.up.override);
                                }
                                p += 2;
                                break;

                            case 6: // OPCODE_PEERSTATUS
                                if (this.up.peerstatuscb) {
                                    this.up.peerstatuscb(ab_to_base64(new Uint8Array(u.buffer, p+2, 8)), u[1] & 0xf, u[1] & 0x80);
                                }
                                p += 10;
                                break;

                            default:
                                console.error("Fatal - unknown opcode: " + u[0]);
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

        clearTimeout(self.pingtimer);
        self.pingtimer = false;
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
        var u = new Uint8Array(s.length);

        for (var i = s.length; i--; ) {
            u[i] = s.charCodeAt(i);
        }

        this.s.send(u);
    }

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

    // call this when the user makes a change in the override UI
    UserPresence.prototype.setoverride = function presence_setoverride(status) {
        if (this.open) {
            this.override = status;
            this.overridechanged = true;    // this will be reset once the server responds with the same status
            this.sendstring("\2" + String.fromCharCode(this.override));
        }
    };

    // call this when the app deems he user to have become active or inactive
    // (via a timer and a mouse move/keystroke monitor)
    // false = away, true = online (active)
    UserPresence.prototype.setonline = function presence_setonline(status) {
        this.status_online = status;
        this.setflags();
    };

    // call this is the user sets the dynamic DnD status
    // (reserved for future use - for the moment, DnD would go through setoverride instead)
    // false = can be contacted, true = dnd (do not disturb)
    UserPresence.prototype.setdnd = function presence_setdnd(status) {
        this.status_dnd = status;
        this.setflags();
    };

    UserPresence.prototype.setflags = function presence_setflags() {
        if (this.open) {
            this.sendstring("\3" + String.fromCharCode(
                (this.status_online ? 1 : 0)
              | (this.status_dnd ? 2 : 0)));
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

    UserPresence.PRESENCE = {
        'CLEAR': 0,
        'OFFLINE': 1,
        'AWAY': 2,
        'ONLINE': 3,
        'DND': 4
    };


    Object.freeze(UserPresence.prototype);

    window.UserPresence = UserPresence;
})();
