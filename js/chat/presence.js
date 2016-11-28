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
        this.attempts = 0;

        // user handle
        this.userhandle = userhandle;

        // current peers
        this.peers = {};

        // WebRTC capability flag
        this.status_webrtc = can_webrtc;

        // online/away flag
        this.status_online = false;

        // do not disturb flag
        this.status_dnd = false;

        // current override
        this.override = 0;

        // retry timer and timeout (exponential backoff)
        this.retrytimer = false;
        this.retrytimeout = 0;

        // ping timer
        this.pingtimer = false;

        // callbacks
        this.overridecb = overridecb;
        this.peerstatuscb = peerstatuscb;

        // console logging
        this.logger = MegaLogger.getLogger('UserPresence');

        this.reconnect();
    };

    UserPresence.prototype.retry = function presence_retry() {
        if (this.retrytimer) {
            clearTimeout(this.retrytimer);
            this.retrytimer = false;
            this.retrytimeout = false;
            this.reconnect();
        }
    }

    UserPresence.prototype.reconnect = function presence_reconnect(self) {
        if (!self) {
            self = this;
        }

        if (self.s) {
            self.cancelled = true;
            self.s.close();
            self.s = false;
            self.open = false;
        }

        // FIXME: immediately retry upon mouse move
        if (!self.retrytimer) {
            if (!self.retrytimeout) {
                self.retrytimeout = 100;
            }
            else {
                self.retrytimer = setTimeout(self.reconnect, self.retrytimeout, this);
                self.retrytimeout *= 2;
                return;
            }
        }
        else {
            clearTimeout(self.retrytimer);
            self.retrytimer = false;
        }

        if (self.pingtimer) {
            clearTimeout(self.pingtimer);
            self.pingtimer = false;
        }

        if (self.attempts > 2) {
            self.attempts = 0;
            self.url = false;
        }

        if (self.url) {
            self.s = new WebSocket(self.url);

            self.s.binaryType = 'arraybuffer';
            self.s.up = self;

            self.s.onopen = function () {
                if (!this.cancelled) {
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
                }
            };

            self.s.onclose = function () {
                if (!this.cancelled) {
                    this.up.attempts++;
                    this.up.reconnect(this.up);
                }
            };

            self.s.onerror = function () {
                if (!this.cancelled) {
                    this.up.attempts++;
                    this.up.reconnect(this.up);
                }
            };

            self.s.onmessage = function (m) {
                if (!this.cancelled) {
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
            api_req({ a: 'pu' }, { callback: function(res, ctx) {
                if (typeof res == 'string') {
                    ctx.self.url = res;
                }
                ctx.self.reconnect();
            },
            self: self });
        }
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
    }

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
    Object.freeze(UserPresence.prototype);

    window.UserPresence = UserPresence;
})();
