// presenced client layer

// presence = new UserPresence(u_handle, can_webrtc, overridecb, peerpresencecb)

// presence levels:
// 1 - offline, user could be offline or invisible
// 2 - away, at least one app is either pinging or likely to be reacting to push notifications
// 3 - online, user is actively using at least one app
// 4 - do not disturb, user discourages calls/messages

// presence.setoverride(presencelevel)
// sets permanent override for the presence level that others see
// (including the WebRTC capability flag) - presencelevel = 0 reverts to automatic presence

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

// overridecb(presencelevel, can_webrtc) will be called with a new override status if available

// peerpresencecb(userhandle, presencelevel, can_webrtc) will be called with any change of peer presence

(function() {

    var UserPresence = function userpresence(userhandle, can_webrtc, overridecb, peerstatuscb) {
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

        // WebRTC capability flag
        this.status_webrtc = can_webrtc;

        // online/away flag
        this.status_online = false;

        // mobile
        this.status_mobile = false;

        // do not disturb flag
        this.status_dnd = false;

        // current override
        this.override = 0;

        this.canceled = localStorage.userPresenceIsOffline && localStorage.userPresenceIsOffline === '1';

        var self = this;

        // retry timer and timeout (exponential backoff)
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

        // ping timer
        this.pingtimer = false;

        // callbacks
        this.overridecb = overridecb;
        this.peerstatuscb = peerstatuscb;

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
            self.open = false;
        }

        if (self.pingtimer) {
            clearTimeout(self.pingtimer);
            self.pingtimer = false;
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
                    this.up.sendstring("\1\1\0");   // HELLO version 1

                    // to reduce flapping, we first set the override...
                    this.up.sendstring("\2" + String.fromCharCode(this.override));

                    // ...and then the dynamic status flags
                    this.up.setflags();

                    // (re)send current peers
                    this.up.sendpeerupdate(Object.keys(this.up.peers).join(''));

                    // start pinging
                    this.up.ping();
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
                            case 2: // OPCODE_STATUSOVERRIDE
                                if (this.up.overridecb) {
                                    this.up.overridecb(u[1] & 0xf, u[1] & 0x80);
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

    UserPresence.prototype.setoverride = function presence_setoverride(status, can_webrtc) {
        if (this.open) {
            this.override = status + (can_webrtc ? 0x80 : 0);
            this.sendstring("\2" + String.fromCharCode(this.override));
        }
    };

    // false = away, true = online (active)
    UserPresence.prototype.setonline = function presence_setonline(status) {
        this.status_online = status;
        this.setflags();
    };

    // false = can be contacted, true = dnd (do not disturb)
    UserPresence.prototype.setdnd = function presence_setdnd(status) {
        this.status_dnd = status;
        this.setflags();
    };

    UserPresence.prototype.setflags = function presence_setflags() {
        if (this.open) {
            this.sendstring("\3" + String.fromCharCode(
                (this.status_online ? 1 : 0)
              | (this.status_dnd ? 2 : 0)
              | (this.status_mobile ? 0x40 : 0)
              | (this.status_webrtc ? 0x80 : 0)));
        }
    };

    // send local dynamic status to the server (with mobile bit 7 cleared, as we are a browser)
    UserPresence.prototype.ping = function presence_ping(self) {
        if (!self) {
            self = this;
            if (self.pingtimer) clearTimeout(self.pingtimer);
        }

        if (self.open) {
            self.sendstring("\0");

            // need to reliably ping in < 30 second intervals to avoid status flapping
            self.pingtimer = setTimeout(self.ping, 25000, self);
        }
    };


    UserPresence.PRESENCE = {
        'CLEAR': 0,
        'OFFLINE': 1,
        'AWAY': 2,
        'ONLINE': 3,
        'DND': 4
    };

    if (localStorage.presencedDebug) {
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

    window.UserPresence = UserPresence;
})();
