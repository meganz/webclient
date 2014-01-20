/**
 * Karere - Mega XMPP Client
 */

//TODO: Fix naming conv: https://basecamp.com/1763244/projects/4428869-mega-encrypted-chat/messages/20278286-javascript-dev#comment_121454400


// Because of several bugs in Strophe's connection handler for Bosh (throwing uncatchable exceptions) this is currently
// not working. We should isolate and prepare a test case to to submit as a bug to Strophe's devs.
// Exception:
// Uncaught InvalidStateError: Failed to execute 'send' on 'XMLHttpRequest': the object's state must be OPENED.

Strophe.Bosh.prototype._hitError = function (reqStatus) {
    var self = this;
    var karere = this._conn.karere;

    if(!karere._errors) {
        karere._errors = 0;
    }
    karere._errors++;

    if(localStorage.d)
        console.warn("request errored, status: " + reqStatus + ", number of errors: " + karere._errors);

    if (karere._errors > karere.options.maxConnectionRetries) {
        this._onDisconnectTimeout();
    } else {
        setTimeout(function() {
            karere.disconnect()
                .done(function() {
                    karere.reconnect();
                });
        }, karere._errors * 1000)
    }
};

/**
 * Create new Karere instance.
 *
 *
 * @param opts
 * @returns {Karere}
 * @constructor
 */
var Karere = function(opts) {
    var self = this;

    var defaults = {
        /**
         * Used to connect to the BOSH service endpoint
         */
        "boshServiceUrl": 'http://localhost:5280/http-bind',

        /**
         * Used when /resource is not passed when calling .connect() to generate a unique new resource id
         * that can be easily identified by this name when looking at server side XMPP logs.
         */
        "clientName": 'karere',

        /**
         * Default Strophe Options, which can be overriden in `opts`
         */
        "stropheOptions": {
        },

        /**
         * Default config when creating rooms
         */

        "roomConfig": {
            "muc#roomconfig_roomdesc": "",
            "muc#roomconfig_persistentroom": 0,
            "muc#roomconfig_publicroom": 0,
            "public_list": 0,
            "muc#roomconfig_passwordprotectedroom": 1,
            "muc#roomconfig_maxusers": 200,
            "muc#roomconfig_whois": "anyone",
            "muc#roomconfig_membersonly": 0,
            "muc#roomconfig_moderatedroom": 1,
            "members_by_default": 1,
            "muc#roomconfig_changesubject": 0,
            "allow_private_messages": 0,
            "allow_private_messages_from_visitors": "anyone",
            "allow_query_users": 0,
            "muc#roomconfig_allowinvites": 0,
            "muc#roomconfig_allowvisitorstatus": 1,
            "muc#roomconfig_allowvisitornickchange": 0,
            "muc#roomconfig_allowvoicerequests": 1,
            "muc#roomconfig_voicerequestmininterval": 1800
        },

        /**
         * Timeout for the addUserToChat promise...will wait for that much ms and reject the promise
         * if the user have not joined
         */
        wait_for_user_presence_in_room_timeout: 2000,

        /**
         * Timeout for waiting before rejecting the .disconnect promise
         */
        disconnect_timeout: 2000,

        /**
         * Timeout for waiting the queue of waiting stanzas to be send before rejecting and doing forced disconnect
         */
        disconnect_queue_timeout: 2000,

        /**
         * Maximum connection retry in case of error
         */
        maxConnectionRetries: 10
    };
    self.options = $.extend(true, {}, defaults, opts);

    self.connection = new Strophe.Connection(self.options.boshServiceUrl, self.options.stropheOptions);
    self.connection.karere = self;

    if(localStorage.dxmpp == 1) {
        self.connection.rawInput = function (data) { console.error('RECV: ' + data); };
        self.connection.rawOutput = function (data) { console.error('SEND: ' + data); };
    }

    // Uncomment the following line to see all the debug output.
//    Strophe.log = function (level, msg) { console.log(level, 'LOG: ' + msg); };
    Strophe.fatal = function (msg) { Karere.error(msg); };
    Strophe.error = function (msg) { Karere.error(msg); };


    // initialize the connection state
    self._connection_state = Karere.CONNECTION_STATE.DISCONNECTED;

    // Implement a straight forward, naive cleanup logic to be executed before the page is reloaded
    // ideas and references:
    // - https://github.com/metajack/strophejs/issues/16
    // -
    $(window).on("beforeunload", function() {

        if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
            var msg = $pres({
                type: 'unavailable'
            });

            self.connection.sync = true;

            self.connection.send(msg);

            self.connection.flush();

            self.connection.disconnect();

            console.warn("flushing out and disconnecting onbeforeunload");
        }
    });


    // Local in-memory Presence cache implementation
    self._presence_cache = {};

    self.bind("onPresence", function(e, evt_data) {
        if(evt_data.show != "unavailable") {
            self._presence_cache[evt_data.from] = evt_data.show ? evt_data.show : "available";
        } else {
            delete self._presence_cache[evt_data.from];
        }
    });

    // helper functions for simple way of storing/caching some meta info
    return this;
};


/**
 * alias the Strophe Connection Status states
 * @type {Status|*}
 */
Karere.CONNECTION_STATE = Strophe.Status;

// make observable via .on, .bind, .trigger, etc
makeObservable(Karere);

// support for .setMeta and .getMeta
makeMetaAware(Karere);


/**
 * Connection handling
 */
{
    /**
     * Returns the current connection's state.
     * See Karere.CONNECTION_STATE
     *
     * @returns {.Status.*|*}
     */
    Karere.prototype.getConnectionState = function() {
        var self = this;
        return self._connection_state;
    };

    /**
     * Strophe will remove ANY handler if it raises an exception... so this is a helper wrapper to catch and log exceptions
     * with stack trace (if any).
     *
     * To be used when calling Strophe.addHandler
     *
     * @param fn
     * @param context
     * @returns {Function}
     * @private
     */
    Karere._exceptionSafeProxy = function(fn, context) {
        return function() {
            try {
                return fn.apply(context, toArray(arguments))
            } catch(e) {
                console.error(e, e.stack);
                return true;
            }
        }
    };

    /**
     * Connect to a XMPP account
     *
     * @param jid
     * @param password
     * @returns {Deferred}
     */
    Karere.prototype.connect = function(jid, password) {
        var self = this;


        /// we may need this to reconnect in case of disconnect or connection issues.
        self._jid = jid;
        self._password = password;

        var $promise = new $.Deferred();


        var bare_jid = Strophe.getBareJidFromJid(jid);
        var full_jid = jid;

        // if there is no /resource defined, generate one on the fly.
        if(bare_jid == full_jid) {
            var resource = self.options.clientName + "-" + self._generateNewResourceIdx();
            full_jid = full_jid + "/" + resource;
        }

        // parse and cache the muc_domain
        self.options.muc_domain = "conference." + jid.split("@")[1].split("/")[0];



        self.connection.reset(); // clear any old attached handlers

        self.connection.connect(
            full_jid,
            self._password,
            function(status) {
                console.warn("Got connection status: ", full_jid, self._password, status);

                self._connection_state = status;

                if (status == Karere.CONNECTION_STATE.CONNECTING) {
                    if(localStorage.d) console.debug(self.getJid(), 'Karere is connecting.');

                    self.trigger('onConnecting');
                } else if (status == Karere.CONNECTION_STATE.CONNFAIL) {
                    if(localStorage.d) console.warn(self.getJid(), 'Karere failed to connect.');

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }
                    self.trigger('onConnfail');
                } else if (status == Karere.CONNECTION_STATE.AUTHFAIL) {
                    if(localStorage.d) console.warn(self.getJid(), 'Karere failed to connect - Authentication issue.');

                    $promise.reject(status);
                    self.trigger('onAuthfail');
                } else if (status == Karere.CONNECTION_STATE.DISCONNECTING) {
                    if(localStorage.d) {
                        console.warn(self.getJid(), 'Karere is disconnecting.');
                    }

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }

                    self.trigger('onDisconnecting');
                } else if (status == Karere.CONNECTION_STATE.DISCONNECTED) {
                    if(localStorage.d) console.info(self.getJid(), 'Karere is disconnected.');

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }
                    self.trigger('onDisconnected');
                } else if (status == Karere.CONNECTION_STATE.CONNECTED) {
                    if(localStorage.d) console.info(self.getJid(), 'Karere is connected.');
                    // connection.jid
                    self.connection.addHandler(Karere._exceptionSafeProxy(self._onIncomingStanza, self), null, 'presence', null, null,  null);
                    self.connection.addHandler(Karere._exceptionSafeProxy(self._onIncomingStanza, self), null, 'message', null, null,  null);


                    self._errors = 0; // reset connection errors

                    self.setPresence(); // really important...if we dont call this...the user will not be visible/online to the others in the roster
                                        // so no messages will get delivered.

                    self.trigger('onConnected', [
                        self.connection.jid
                    ]);

                    $promise.resolve(status);
                }

                return true;
            }
        );

        return $promise;
    };


    /**
     * Helper wrapper, that should be used in conjuction w/ ANY method of Karere, which requires a XMPP connection to
     * be available when called.
     * This wrapper will wrap around the original method and create a proxy promise (if needed), that will create the
     * connection before calling the actual method which is wrapped.
     *
     * @param proto
     * @param fn_name
     * @private
     */
    Karere._requiresConnectionWrapper = function (proto, fn_name) {
        var fn = proto[fn_name];
        proto[fn_name] = function() {
            var self = this;

            var args = toArray(arguments);

            var internal_promises = [];
            var $promise = new $.Deferred();

            /**
             * Reconnect if connection is dropped or not available and there are actual credentials in _jid and _password
             */
            if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING) {
                console.warn("Tried to call ", fn_name, ", while Karere is still in CONNECTING state.");

                internal_promises.push(
                    createTimeoutPromise(
                        function() {
                            self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED
                        },
                        200,
                        1000
                    )
                );
            }
            else if(self.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
                console.warn("Tried to call ", fn_name, ", but Karere is not connected. Will try to reconnect first.");

                internal_promises.push(
                    self.reconnect()
                );
            }

            $.when.apply($, internal_promises)
                .done(function() {
                    fn.apply(self, args)
                        .done(function() {
                            $promise.resolve.apply($promise, toArray(arguments))
                        })
                        .fail(function() {
                            $promise.reject.apply($promise, toArray(arguments))
                        });
                })
                .fail(function() {
                    $promise.reject(toArray(arguments));
                });

            return $promise;
        }
    };


    /**
     * Simple reconnect method
     *
     * @returns {Deferred}
     */
    Karere.prototype.reconnect = function() {
        var self = this;

        if(self.getConnectionState() != Karere.CONNECTION_STATE.DISCONNECTED) {
            debugger;
            throw new Error("Invalid connection state. Karere should be DISCONNECTED, before calling .reconnect.");
        }
        if(!self._jid || !self._password) {
            throw new Error("Missing jid or password.");
        }

        return self.connect(self._jid, self._password);
    };


    /**
     * Simple internal method that will return a promise, which will be marked as resolved only when there are no more
     * queued stanzas or fail if the waiting exceed self.options.disconnect_queue_timeout
     *
     * @returns {*}
     * @private
     */
    Karere.prototype._waitForRequestQueueToBeEmpty = function() {
        var self = this;

        return createTimeoutPromise(function() {
            return self.connection._data.length == 0
        }, 500, self.options.disconnect_queue_timeout)
    };

    /**
     * Disconnect Karere from the XMPP server
     *
     * @returns {Deferred|*}
     */
    Karere.prototype.disconnect = function() {
        var self = this;


        if(
            self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED ||
                self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING ||
                self.getConnectionState() == Karere.CONNECTION_STATE.AUTHENTICATING ||
                self.getConnectionState() == Karere.CONNECTION_STATE.ATTACHED
            ) {

            console.debug("Will try to wait for the queue to get empty before disconnecting...");

            self._connection_state = Karere.CONNECTION_STATE.DISCONNECTING;

            self._waitForRequestQueueToBeEmpty()
                .fail(function() {
                    console.warn("Queue did not emptied in the given timeout. Forcing disconnect.");
                })
                .done(function() {
                    console.debug("Queue is empty. Calling disconnect.");
                })
                .always(function() {
                    self.connection.disconnect();
                })

        } else if(self.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTING) {
            // do nothing, we are already in the process of disconnecting.
        } else {
            self._connection_state = Karere.CONNECTION_STATE.DISCONNECTED
        }

        return createTimeoutPromise(
            function() {
                return self.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTED;
            },
            200,
            self.options.disconnect_timeout
        );
    };
}

/**
 * Utils
 */
{
    /**
     * Internal method to be used for generating incremental indexes (specially designed to be used for generating
     * /resource-ids, but used in many places in the Karere code)
     *
     * @returns {number}
     * @private
     */
    Karere.prototype._generateNewIdx = function() {
        if(!localStorage.karereIdx) {
            localStorage.karereIdx = 0;
        } else {
            localStorage.karereIdx = parseInt(localStorage.karereIdx, 10) + 1;
        }
        // reset if > 1000
        if(localStorage.karereIdx > 100000) {
            localStorage.karereIdx = 0;
        }

        return localStorage.karereIdx;
    };

    /**
     * Helper for generating an MD5 hexdigest that can be used as a XMPP /resource
     *
     * @returns {*}
     * @private
     */
    Karere.prototype._generateNewResourceIdx = function () {
        var self = this;
        return MD5.hexdigest(window.navigator.userAgent.toString() + "-" + (new Date()).getTime() + "-" + self._generateNewIdx());
    };

    /**
     * Generator for semi-random Room IDs
     *
     * @returns {string}
     * @private
     */
    Karere.prototype._generateNewRoomIdx = function() {
        var self = this;
        return self.getJid().split("@")[0] + "-" + MD5.hexdigest(
            window.navigator.userAgent.toString() + "-" + (new Date()).getTime() + "-" + self._generateNewIdx()
        );
    };

    /**
     * Generate new semi-random room password
     *
     * @returns {*}
     * @private
     */
    Karere.prototype._generateNewRoomPassword = function() {
        var self = this;
        return MD5.hexdigest(
            self.getJid() + "-" +
                window.navigator.userAgent.toString() + "-" +
                (new Date()).getTime() + "-" + self._generateNewIdx() + "-" +

                Math.random() * 10000000000000000 /* TODO: better solution? */
        );
    };


    /**
     * Returns a string of the Bare JID (e.g. user@domain.com)
     *
     * @returns {*}
     */
    Karere.prototype.getBareJid = function() {
        var self = this;
        return Strophe.getBareJidFromJid(self.connection.jid);
    };

    /**
     * Return the full jid of the user (e.g. user@domain.com/resource)
     *
     * @returns {iq.jid|*|jid|item.jid|Occupant.jid|string}
     */
    Karere.prototype.getJid = function() {
        var self = this;
        return self.connection.jid;
    };

    /**
     * Returns the nickname/username of the currently connected user (e.g. lpetrov, in case of the bare jid is
     * lpetrov@mega.co.nz)
     *
     * @returns {*}
     */
    Karere.prototype.getNickname = function() {
        var self = this;
        return self.connection.jid.split("@")[0];
    };

    /**
     * Helper method that should be used to proxy Strophe's .fatal and .error methods to actually LOG something to the
     * console.
     */
    Karere.error = function() {
        console.error(toArray(arguments).join(" "));
    }
}


/**
 * onMessage and onPresence handlers that act as proxy to trigger events
 */
{
    //TODO: Refactor this to be moooore easier to read and debug.

    /**
     * THE handler of incoming stanzas (both msg and presence)
     *
     * @param msg
     * @returns {boolean}
     * @private
     */
    Karere.prototype._onIncomingStanza = function (msg) {
        var self = this;


        var _type = msg.getAttribute('type');


        var evt_data = {
            'karere': self,
            'my_own': false
        };

        // flag own/forwarded messages, because of the <forward/> stanzas, we can receive back our own messages
        if(msg.getAttribute('from') == self.getJid()) {
            evt_data['my_own'] = true;
        }

        var stanza_type = "Unknown";



        var x = msg.getElementsByTagName("x");
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');

        evt_data['to'] = to;
        evt_data['from'] = from;

        // x handling
        if(x.length > 0 && x[0].getAttribute('xmlns') == 'http://jabber.org/protocol/muc#user') {
            evt_data['room_jid'] = evt_data['from'].split("/")[0];

            var users = self.getMeta('rooms', evt_data['room_jid'], 'users', {});

            var joined_users = {};
            var left_users = {};

            $.each(x[0].getElementsByTagName("item"), function(i, item) {
                var role = item.getAttribute('role');
                var jid = item.getAttribute('jid');

                if(role != "unavailable" && role != "none") {
                    users[jid] = role;
                    joined_users[jid] = item.getAttribute('role');
                } else { // left/kicked
                    delete users[jid];
                    delete joined_users[jid];
                    left_users[jid] = true;
                }
            });

            self.setMeta('rooms', evt_data['room_jid'], 'users', users);

            evt_data['current_users'] = users;

            if(Object.keys(joined_users).length > 0) {
                evt_data['new_users'] = joined_users;
                self._triggerEvent("UsersJoined", evt_data);
            }
            if(Object.keys(left_users).length > 0) {
                evt_data['left_users'] = left_users;
                self._triggerEvent("UsersLeft", evt_data);
            }
        }
        // end of x handling

        if(msg.tagName == "message") {
            console.warn(self.getJid(), "Message: ", msg);

            var elems = msg.getElementsByTagName('body');

            stanza_type = "Message";
            if(_type == "chat" && elems.length > 0) {
                stanza_type = "PrivateMessage";


                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */

                    // if not...set the message property
                evt_data['message'] = Strophe.getText(elems[0]);

                // is this a forwarded message? if yes, trigger event only for that
                if(msg.getElementsByTagName("forwarded").length > 0) {
                    self._onIncomingStanza(msg.getElementsByTagName("forwarded")[0].childNodes[1]);

                    // stop
                    return true;
                }
            } else if(_type == "groupchat") {
                stanza_type = "ChatMessage";

                evt_data['message'] = Strophe.getText(elems[0]);

                // is this a forwarded message? if yes, trigger event only for that
                if(msg.getElementsByTagName("forwarded").length > 0) {
                    self._onIncomingStanza(msg.getElementsByTagName("forwarded")[0].childNodes[1]);

                    // stop
                    return true;
                }

                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */


            } else if(!_type && msg.getElementsByTagName("event").length > 0) {
                stanza_type = "EventMessage";
            } else if(x.length > 0 && x[0].getAttribute("xmlns") == "jabber:x:conference") {
                stanza_type = "InviteMessage";
                evt_data['room'] = x[0].getAttribute("jid");
                evt_data['password'] = x[0].getAttribute("password");

                self.setMeta("rooms", evt_data['room'], 'password', evt_data['password']);


                console.warn(self.getJid(), "Got invited to join room: ", evt_data['room']);

                self.connection.muc.join(
                    evt_data['room'],
                    self.getNickname(),
                    undefined,
                    undefined,
                    undefined,
                    evt_data['password'],
                    undefined
                );
            } else {
                stanza_type = "UnknownMessage";
            }

            evt_data['from'] = from;
            evt_data['to'] = to;
            evt_data['raw_type'] = _type;
            evt_data['type'] = stanza_type;
            evt_data['elems'] = elems;
            evt_data['raw_message'] = msg;
        } else if(msg.tagName == "presence") {
            stanza_type = "Presence";

            var show = msg.getElementsByTagName("show");
            if(show.length > 0) {
                evt_data['show'] = $(show[0]).text();
            } else if(show.length == 0 && msg.getAttribute('type')) {
                evt_data['show'] = msg.getAttribute('type');
            }

            var status = msg.getElementsByTagName("status");
            if(status.length > 0) {
                evt_data['status'] = $(status[0]).text();
            }

            if(evt_data['show'] == undefined && evt_data['status'] == undefined) {
                //TODO: This means that the user is online. Impl please.
//                debugger;
            }
        } else {
            console.debug("Unknown stanza type: ", msg);
            evt_data['unknown'] = true;
            evt_data['tag'] = msg.tagName;
        }



        // XEP-0085 - Chat State Notifications
        // Because they can be embedded into other tags, we will trigger one additional event here...and if some of the
        // event handlers tried to stop the propagation, then we will stop the on$StanzaType triggering.
        if(msg.getElementsByTagName("active").length > 0) {
            if(!self._triggerEvent("ActiveMessage", evt_data)) {
                return true;  // always return true, because of how Strophe.js handlers work.
            }
        } else if(msg.getElementsByTagName("paused").length > 0) {
            if(!self._triggerEvent("PausedMessage", evt_data)) {
                return true; // always return true, because of how Strophe.js handlers work.
            }
        } else if(msg.getElementsByTagName("composing").length > 0) {
            if(!self._triggerEvent("ComposingMessage", evt_data)) {
                return true; // always return true, because of how Strophe.js handlers work.
            }
        }

        self._triggerEvent(stanza_type, evt_data);

        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };

    /**
     * Helper method that should be used when triggering events on specific Stanzas
     *
     * @param stanza_type
     * @param evt_data
     * @returns {boolean}
     * @private
     */
    Karere.prototype._triggerEvent = function (stanza_type, evt_data) {
        var self = this;

        if(evt_data['raw_msg'] && evt_data['raw_msg'].getElementsByTagName("delay").length > 0) {
            stanza_type = "Delayed" + stanza_type;
        }

        var targetted_type_evt = new $.Event("on" + stanza_type);

        console.debug(self.getJid(), "Triggering Event for: ", stanza_type, "with event data:", evt_data);

        try {
            /**
             * Strophe will remove this handler if it raises an exception... so we need to be sure that our attached
             * handlers WOULD NEVER throw an exception.
             */
            self.trigger(targetted_type_evt, evt_data);
        } catch(e) {
            console.error('ERROR: ' + (e.stack ? e.stack : e));
        }

        // if none of the handlers have not stopped the event propagation, trigger a more generic event.
        if(!targetted_type_evt.isPropagationStopped()) {
            var generic_evt = new $.Event("onStanza");
            generic_evt.data = evt_data;

            try {
                /**
                 * Strophe will remove this handler if it raises an exception... so we need to be sure that our attached
                 * handlers WOULD NEVER throw an exception.
                 */
                self.trigger(generic_evt, evt_data);
            } catch(e) {
                console.log('ERROR: ' + (e.stack ? e.stack : e));
            }
            if(generic_evt.isPropagationStopped()) {
                return false;
            }
        } else {
            return false;
        }

        return true;
    };
}



/**
 * Presence impl.
 */
{
    //TODO: Send new presence to Group chat presence when this is called
    /**
     * Change the currently logged in user presence
     *
     * @param presence - string - see rfc3921:
     *   away -- The entity or resource is temporarily away.
     *   chat -- The entity or resource is actively interested in chatting.
     *   dnd -- The entity or resource is busy (dnd = "Do Not Disturb").
     *   xa -- The entity or resource is away for an extended period (xa = "eXtended Away").
     * @param status
     */
    Karere.prototype.setPresence = function(presence, status) {
        presence = presence || "chat";
        status = status || "";

        var self = this;

        if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
            self.connection.send(
                $pres()
                    .c("show")
                    .t(presence)
                    .up()
                    .c("status")
                    .t(status ? status : presence)
                    .tree()
            );
        }
    };


    /**
     * Get presence for a specific jid (full jid!)
     *
     * @param jid
     * @returns {*} presence OR false if not online.
     */
    Karere.prototype.getPresence = function(jid) {
        var self = this;

        return self._presence_cache[jid] ? self._presence_cache[jid] : false;
    }
}

/**
 * Chat States
 */
{
    /**
     * Simple chat state node builder
     * @param name
     * @returns {*}
     * @private
     */
    Karere._$chatState = function(name) {
        return $build(
            name,
            {
                'xmlns': "http://jabber.org/protocol/chatstates"
            }
        );
    };

    /**
     * Send Is Composing chat state
     *
     * @param to_jid
     * @returns {*}
     */
    Karere.prototype.sendIsComposing = function(to_jid) {
        var self = this;

        return self._rawSendMessage(to_jid, "chat", Karere._$chatState('composing'));
    };

    /**
     * Send Composing stopped/paused chat state
     *
     * @param to_jid
     * @returns {*}
     */
    Karere.prototype.sendComposingPaused = function(to_jid) {
        var self = this;
        self._rawSendMessage(to_jid, "chat", Karere._$chatState('paused'));

        return $.when(
            self.sendIsActive(to_jid),
            self._rawSendMessage(to_jid, "chat", Karere._$chatState('paused'))
        );

    };


    /**
     * Send Is Active chat state
     *
     * @param to_jid
     * @returns {*}
     */
    Karere.prototype.sendIsActive = function(to_jid) {
        var self = this;
        return self._rawSendMessage(to_jid, "chat", Karere._$chatState('active'));
    };
}



/**
 * One to one and Group Chat Implementation (Karere logic for translating Karere calls <-> XMPP stanzas and events)
 */
{
    /**
     * Messaging, encapsulated in one method
     *
     * @param to_jid
     * @param type should be chat or groupchat
     * @param contents
     * @private
     */
    Karere.prototype._rawSendMessage = function (to_jid, type, contents) {
        var self = this;

        type = type || "chat";
        var timestamp = (new Date()).getTime();
        var message = $msg({from: self.connection.jid, to: to_jid, type: type, id: timestamp})

        if(contents.toUpperCase) { // is string (better way?)
            message
                .c('body')
                .t(contents)
                .up()
                .c('active', {'xmlns': 'http://jabber.org/protocol/chatstates'});
        } else {
            message
                .node.appendChild(contents.tree())
        }


        var forwarded = $msg({
            to: Strophe.getBareJidFromJid(self.connection.jid),
            type: type,
            id:timestamp
        })
            .c('forwarded', {xmlns:'urn:xmpp:forward:0'})
            .c('delay', {xmns:'urn:xmpp:delay',stamp:timestamp}).up()
            .cnode(message.tree());

        self.connection.send(message);
        self.connection.send(forwarded);

        //XXX: Use promise and wait for confirmation of this message to resolve/reject (timeout) it.
    };

    /**
     * Generates room config XML from the self.options.roomConfig to be used and sent as stanza when creating new rooms
     *
     * @param room_password
     * @returns {HTMLElement[]}
     * @private
     */
    Karere.prototype._getRoomConfig = function(room_password) {
        var self = this;

        var config_data = "<x xmlns='jabber:x:data' type='submit'>" +
            "<field var='FORM_TYPE'>" +
            "<value>http://jabber.org/protocol/muc#roomconfig</value>" +
            "</field>";

        var config_dict = $.extend({}, self.options.roomConfig, {
            "muc#roomconfig_roomsecret": room_password ? room_password : ""
        });

        $.each(Object.keys(config_dict), function(i, k) {
            config_data += "<field var='" + k + "'>" +
                "<value>" + config_dict[k] + "</value>" +
                "</field>";
        });


        config_data += "<field var='muc#roomconfig_captcha_whitelist'/>" +
            "</x>";

        return Strophe.xmlHtmlNode(config_data).children[0].children;
    };

    /**
     * Start/create new chat, wait for the room creations, send invites and wait for all users to join.
     *
     * @param jid_list array of jids to be invited to the chat
     * @returns {Deferred}
     */
    Karere.prototype.startChat = function(jid_list) {
        var self = this;

        var $promise = new $.Deferred();

        var room_name = self._generateNewRoomIdx();
        var room_password = self._generateNewRoomPassword();
        var room_jid = room_name + "@" + self.options.muc_domain;

        self.setMeta("rooms", room_jid, 'password', room_password);

        self.connection.muc.join(room_jid, self.getNickname(), undefined, undefined, undefined, room_password, undefined);

        var i_had_joined_promise = self.waitForUserToJoin(room_jid, self.getJid());

        i_had_joined_promise
            .done(function() {
                if(typeof Form == "undefined") {
                    window.Form = function() {}; // bug in Strophe.plugins.muc
                    window.Form._do_cleanup = true;
                }

                self.connection.muc.saveConfiguration(
                    room_jid,
                    self._getRoomConfig(room_password),
                    Karere._exceptionSafeProxy(function() {
                        var promises = [];

                        $.each(jid_list, function(i, jid) {
                            promises.push(
                                self.addUserToChat(room_jid, jid, room_password)
                            );
                        });

                        // wait for all promises before resolving the main one.

                        $.when.apply($, promises)
                            .done(function() {
                                $promise.resolve(room_jid, room_password);
                            })
                            .fail(function() {
                                $promise.reject(toArray(arguments));
                            });
                    }),
                    Karere._exceptionSafeProxy(function() {
                        $promise.reject();
                    })
                );

                if(window.Form._do_cleanup) {
                    delete window.Form;
                }
            })
            .fail(function() {
                console.error("Could not join my newly created room.")
                $promise.reject();
            });


        // returns promise that when solved will get the chat's JID
        return $promise;
    };

    /**
     * Helper/internal method for waiting for a user's presence in a specific room.
     *
     * @param event_type Joined/Left
     * @param chat_jid
     * @param user_jid
     * @returns {Deferred}
     * @private
     */
    Karere.prototype._waitForUserPresenceInRoom = function(event_type, chat_jid, user_jid) {
        var self = this;

        var $promise = new $.Deferred();
        var evt_name = generateEventSuffixFromArguments("onUsers" + event_type, "inv", chat_jid, user_jid, Math.random());

        var joined_timeout = setTimeout(function() {
            console.error(self.getJid(), "Timeout waiting for user to " + (event_type == "Joined" ? "join" : "leave") + ": ", user_jid);

            self.unbind(evt_name);
            $promise.reject(chat_jid, user_jid);
        }, self.options.wait_for_user_presence_in_room_timeout);

        var search_key = event_type == "Joined" ? "new_users" : "left_users";

        self.bind(evt_name, function(e, evt_data) {
            var joined = false;

            if(user_jid.indexOf("/") == -1) { // bare jid
                // search for $user_jid/
                $.each(evt_data[search_key], function(k, v) {
                    if(k.indexOf(user_jid + "/") != -1) {
                        joined = true;
                        return false; //break;
                    }
                })
            } else { // full jid
                if(evt_data[search_key][user_jid]) {
                    joined = true;
                }
            }


            if(joined) {
                console.warn(self.getJid(), "User " + event_type + ": ", chat_jid, user_jid);
                self.unbind(evt_name);
                clearTimeout(joined_timeout);

                $promise.resolve(
                    chat_jid, user_jid
                );
            }
        });


        return $promise;
    };

    /**
     * Wait for user to join
     *
     * @param chat_jid
     * @param user_jid
     * @returns {Deferred}
     */
    Karere.prototype.waitForUserToJoin = function(chat_jid, user_jid) {
        return this._waitForUserPresenceInRoom("Joined", chat_jid, user_jid);
    };

    /**
     * Wait for user to leave
     *
     * @param chat_jid
     * @param user_jid
     * @returns {Deferred}
     */
    Karere.prototype.waitForUserToLeave = function(chat_jid, user_jid) {
        return this._waitForUserPresenceInRoom("Left", chat_jid, user_jid);
    };

    /**
     * Leave chat
     *
     * @param chat_jid
     * @param exit_msg
     * @returns {Deferred}
     */
    Karere.prototype.leaveChat = function(chat_jid, exit_msg) {
        var self = this;

        var $promise = new $.Deferred();

        self.connection.muc.leave(
            chat_jid,
            undefined,
            Karere._exceptionSafeProxy(function() {
                $promise.resolve();
            }),
            exit_msg
        );

        return $promise;
    };

    /**
     * Invite a user to a specific chat
     *
     * @param chat_jid
     * @param user_jid
     * @param password
     * @returns {Deferred}
     */
    Karere.prototype.addUserToChat = function(chat_jid, user_jid, password) {
        var self = this;

        if(!password && self.getMeta("rooms", chat_jid, 'password')) {
            password = self.getMeta("rooms", chat_jid, 'password');
        }

        var $promise = self.waitForUserToJoin(chat_jid, user_jid)

        self.connection.muc.directInvite(chat_jid, user_jid, undefined, password);

        console.warn(self.getJid(), "Inviting: ", user_jid, "to", chat_jid, "with password", password);

        return $promise;
    };

    /**
     * Remove a user from a chat room
     *
     * @param chat_jid
     * @param user_jid
     * @param reason
     * @returns {Deferred}
     */
    Karere.prototype.removeUserFromChat = function(chat_jid, user_jid, reason) {
        var self = this;

        var $promise = new $.Deferred();
        var nick_name = false;

        if(!self.connection.muc.rooms[chat_jid] || !self.connection.muc.rooms[chat_jid].roster) {
            $promise.reject("Room user list is currently not available.");
            return $promise;
        }
        $.each(self.connection.muc.rooms[chat_jid].roster, function(_nick, item) {
            if(item.jid == user_jid) {
                nick_name = _nick;
                return false; // break.
            }
        });

        console.warn(self.getJid(), "Removing user: ", user_jid, "from chat", chat_jid);

        if(!nick_name) {
            $promise.reject(
                'User not found for jid: ' + user_jid
            );
        } else {
            // pair/proxy the waitForUserToLeave w/ the returned promise, so that it will be resolved only
            // when the user is actually out of the chat room.
            self.waitForUserToLeave(chat_jid, user_jid)
                .done(function() {
                    $promise.resolve();
                })
                .fail(function() {
                    $promise.reject();
                });

            self.connection.muc.kick(
                chat_jid,
                nick_name,
                reason,
                Karere._exceptionSafeProxy(function() {
                    // do nothing, waitForUserToLeave should handle this.
                }),
                Karere._exceptionSafeProxy(function() {
                    $promise.reject();
                })
            );
        }


        return $promise;
    };

    /**
     * Get users in chat
     *
     * @param chat_jid
     * @returns {*}
     */
    Karere.prototype.getUsersInChat = function(chat_jid) {
        var self = this;
        var users = self.getMeta('rooms', chat_jid, 'users', {});
        return users;
    };
}


/**
 * Wrap all methods which require a connection to actually use the ._requiresConnectionWrapper helper
 */
{
    //Karere._requiresConnectionWrapper(Karere.prototype, 'sendIsComposing'); //XXX: MUST return a promise, some day - Feature #49
    //Karere._requiresConnectionWrapper(Karere.prototype, 'sendComposingPaused'); //XXX: MUST return a promise, some day - Feature #49
    //Karere._requiresConnectionWrapper(Karere.prototype, 'sendIsActive'); //XXX: MUST return a promise, some day - Feature #49
    //Karere._requiresConnectionWrapper(Karere.prototype, 'setPresence'); //XXX: MUST return a promise, some day - Feature #49
    //Karere._requiresConnectionWrapper(Karere.prototype, '_rawSendMessage'); //XXX: MUST return a promise, some day - Feature #49
    //Karere._requiresConnectionWrapper(Karere.prototype, 'getUsersInChat'); //XXX: MUST return a promise, some day - Feature #49

    Karere._requiresConnectionWrapper(Karere.prototype, 'startChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'leaveChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'addUserToChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'removeUserFromChat');

}