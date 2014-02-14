/**
 * Karere - Mega XMPP Client
 */

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


    if(localStorage.d) {
		console.warn("request error, status: " + reqStatus + ", number of errors: " + karere._errors);
    }


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
 * @param user_options
 * @returns {Karere}
 * @constructor
 */
var Karere = function(user_options) {
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
         * Default Strophe Options, which can be overridden in `opts`
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
        wait_for_user_presence_in_room_timeout: 2500,

        /**
         * Timeout for waiting before rejecting the .disconnect promise
         */
        disconnect_timeout: 2500,

        /**
         * Timeout for waiting the queue of waiting stanzas to be send before rejecting and doing forced disconnect
         */
        disconnect_queue_timeout: 2000,

        /**
         * Maximum connection retry in case of error
         */
        maxConnectionRetries: 10,

        /**
         * When a method which requires connection is called, Karere would try to connect and execute that method.
         * However, what is the timeout that should be used to determinate if the connect operation had timed out?
         */
        connectionRequiredTimeout: 3500
    };
    self.options = $.extend(true, {}, defaults, user_options);

    self.connection = new Strophe.Connection(self.options.boshServiceUrl, self.options.stropheOptions);
    self.connection.karere = self;

    if(localStorage.dxmpp == 1) {
        self.connection.rawInput = function (data) {
            if(localStorage.d) {
                var d = new Date();
		        console.debug(self.getNickname(), d, 'RECV: ' + data);
            }
        };

        self.connection.rawOutput = function (data) {
		    if(localStorage.d) {
                var d = new Date();
		        console.debug(self.getNickname(), d, 'SEND: ' + data);
            }
        };
    }

    // Uncomment the following line to see all the debug output.
//    Strophe.log = function (level, msg) {
//        if(localStorage.d) {
//            console.log(level, 'LOG: ' + msg);
//        }
//    }

    Strophe.fatal = function (msg) { Karere.error(msg); };
    Strophe.error = function (msg) { Karere.error(msg); };


    // initialize the connection state
    self._connectionState = Karere.CONNECTION_STATE.DISCONNECTED;

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

            if(localStorage.d) {
		        console.warn("flushing out and disconnecting onbeforeunload");
            }
        }
    });


    // Local in-memory Presence cache implementation
    self._presenceCache = {};

    self.bind("onPresence", function(e, eventData) {
        if(eventData.show != "unavailable") {
            self._presenceCache[eventData.from] = eventData.show ? eventData.show : "available";
        } else {
            delete self._presenceCache[eventData.from];
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

/**
 * Helper enum, based on rfc3921:
 *   away -- The entity or resource is temporarily away.
 *   chat -- The entity or resource is actively interested in chatting.
 *   dnd -- The entity or resource is busy (dnd = "Do Not Disturb").
 *   xa -- The entity or resource is away for an extended period (xa = "eXtended Away").
 *
 * @type Karere.PRESENCE
 */
Karere.PRESENCE = {
    'ONLINE': "chat",
    'AWAY': "away",
    'BUSY': "dnd",
    'EXTENDED_AWAY': "xa",
    'OFFLINE': "unavailable"
};

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
     * @returns {Karere.CONNECTION_STATE}
     */
    Karere.prototype.getConnectionState = function() {
        var self = this;
        return self._connectionState;
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
                if(localStorage.d) {
		            console.error(e, e.stack);
                }
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



        var $promise = new $.Deferred();

        // don't call Strophe.connect again if already connected/connecting
        if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
            $promise.resolve(Karere.CONNECTION_STATE.CONNECTED);
            return $promise;
        } else if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING) {
            return createTimeoutPromise(function() {
                return self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED
            }, 100, 4500);
        }


        var bareJid = Strophe.getBareJidFromJid(jid);
        var fullJid = jid;

        // if there is no /resource defined, generate one on the fly.
        if(bareJid == fullJid) {
            var resource = self.options.clientName + "-" + self._generateNewResourceIdx();
            fullJid = fullJid + "/" + resource;
        }

        /// we may need this to reconnect in case of disconnect or connection issues.
        // also, we should reuse the original generated resource, so we cache the full jid here.
        self._jid = fullJid;
        self._password = password;


        // parse and cache the mucDomain
        self.options.mucDomain = "conference." + jid.split("@")[1].split("/")[0];



        self.connection.reset(); // clear any old attached handlers

        self.connection.connect(
            fullJid,
            self._password,
            function(status) {
                if(localStorage.d) {
		            console.warn("Got connection status: ", fullJid, self._password, status);
                }

                self._connectionState = status;

                if (status == Karere.CONNECTION_STATE.CONNECTING) {
                    if(localStorage.d) {
		                console.debug(self.getNickname(), 'Karere is connecting.');
                    }

                    self.trigger('onConnecting');
                } else if (status == Karere.CONNECTION_STATE.CONNFAIL) {
                    if(localStorage.d) {
		                console.warn(self.getNickname(), 'Karere failed to connect.');
                    }

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }
                    self.trigger('onConnfail');
                } else if (status == Karere.CONNECTION_STATE.AUTHFAIL) {
                    if(localStorage.d) {
		                console.warn(self.getNickname(), 'Karere failed to connect - Authentication issue.');
                    }

                    $promise.reject(status);
                    self.trigger('onAuthfail');
                } else if (status == Karere.CONNECTION_STATE.DISCONNECTING) {
                    if(localStorage.d) {
		                console.warn(self.getNickname(), 'Karere is disconnecting.');
                    }

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }

                    self.trigger('onDisconnecting');
                } else if (status == Karere.CONNECTION_STATE.DISCONNECTED) {
                    if(localStorage.d) {
                        console.info(self.getNickname(), 'Karere is disconnected.');
                    }

                    if(self._errors >= self.options.maxConnectionRetries) {
                        $promise.reject(status);
                    }
                    self.trigger('onDisconnected');
                } else if (status == Karere.CONNECTION_STATE.CONNECTED) {
                    if(localStorage.d) {
                        console.info(self.getNickname(), 'Karere is connected.');
                    }
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
     * @param functionName
     * @private
     */
    Karere._requiresConnectionWrapper = function (proto, functionName) {
        var fn = proto[functionName];
        proto[functionName] = function() {
            var self = this;

            var args = toArray(arguments);

            var internalPromises = [];
            var $promise = new $.Deferred();

            /**
             * Reconnect if connection is dropped or not available and there are actual credentials in _jid and _password
             */
            if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTING) {
                if(localStorage.d) {
		            console.warn("Tried to call ", functionName, ", while Karere is still in CONNECTING state.");
                }

                internalPromises.push(
                    createTimeoutPromise(
                        function() {
                            return self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED
                        },
                        200,
                        self.options.connectionRequiredTimeout
                    )
                );
            }
            else if(self.getConnectionState() != Karere.CONNECTION_STATE.CONNECTED) {
                if(localStorage.d) {
		            console.warn("Tried to call ", functionName, ", but Karere is not connected. Will try to reconnect first.");
                }

                internalPromises.push(
                    self.reconnect()
                );
            }

            $.when.apply($, internalPromises)
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

            if(localStorage.d) {
		        console.debug("Will try to wait for the queue to get empty before disconnecting...");
            }

            self._connectionState = Karere.CONNECTION_STATE.DISCONNECTING;

            self._waitForRequestQueueToBeEmpty()
                .fail(function() {
                    if(localStorage.d) {
		                console.warn("Queue did not emptied in the given timeout. Forcing disconnect.");
                    }
                })
                .done(function() {
                    if(localStorage.d) {
		                console.debug("Queue is empty. Calling disconnect.");
                    }
                })
                .always(function() {
                    self.connection.disconnect();
                })

        } else if(self.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTING) {
            // do nothing, we are already in the process of disconnecting.
        } else {
            self._connectionState = Karere.CONNECTION_STATE.DISCONNECTED
        }

        return createTimeoutPromise(
            function() {
                return self.getConnectionState() == Karere.CONNECTION_STATE.DISCONNECTED;
            },
            200,
            self.options.disconnect_timeout
        ).done(function() {
            self.clearMeta('rooms');
        });
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
        if(typeof(localStorage.karereIdx) == "undefined") {
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
    Karere.prototype._generateNewResourceIdx = function() {
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
        return self.getUsername() + "-" + MD5.hexdigest(
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

                Math.random() * 10000000000000000 /* don't really need to use special rand() method, because we already
                                                     have a localStorage sequence that solves the Math.random() issues
                                                     in a little bit easier way then doing native crypto/random magic */
        );
    };


    Karere.prototype.generateMessageId = function(toJid) {
        var self = this;
        return simpleStringHashCode(self.getJid() + toJid) + "_" + unixtime()
    };


    /**
     * Returns a string of the Bare JID (e.g. user@domain.com)
     *
     * @returns {*}
     */
    Karere.prototype.getBareJid = function() {
        var self = this;
        return Strophe.getBareJidFromJid(self.getJid());
    };

    /**
     * Return the full jid of the user (e.g. user@domain.com/resource)
     *
     * @returns {iq.jid|*|jid|item.jid|Occupant.jid|string}
     */
    Karere.prototype.getJid = function() {
        var self = this;
        return self._jid ? self._jid : "";
    };

    /**
     * Returns a specially formatted username__resource of the currently connected user (e.g. lpetrov__resource-1, in case of the
     * bare jid is lpetrov@mega.co.nz/resource-1)
     *
     * @returns {*}
     */
    Karere.prototype.getNickname = function() {
        var self = this;
        return self.getUsername() + "__" + self.getResource();
    };


    Karere.getNicknameFromJid = function(jid) {
        return jid.split("@")[0] + "__" + jid.split("/")[1];
    };

    /**
     * Returns the username of the currently connected user (e.g. lpetrov, in case of the bare jid is
     * lpetrov@mega.co.nz)
     *
     * @returns {*}
     */
    Karere.prototype.getUsername = function() {
        var self = this;
        return self.getJid().split("@")[0];
    };

    /**
     * Returns the resource of the currently connected user (e.g. resource-1, in case of the bare jid is
     * lpetrov@mega.co.nz/resource-1)
     *
     * @returns {*}
     */
    Karere.prototype.getResource = function() {
        var self = this;
        var res = self.getJid().split("/");
        return res[1];
    };

    /**
     * Helper method that should be used to proxy Strophe's .fatal and .error methods to actually LOG something to the
     * console.
     */
    Karere.error = function() {
        var additional = "";
        if(arguments[0] instanceof Error) {
            additional = arguments[0].stack;
        }
		console.error(toArray(arguments).join(" "), additional);
    }
}


/**
 * onMessage and onPresence handlers that act as proxy to trigger events
 */
{

    /**
     * THE handler of incoming stanzas (both <message/> and <presence/>)
     *
     * @param message
     * @returns {boolean}
     * @private
     */
    Karere.prototype._onIncomingStanza = function (message, eventData) {
        var self = this;


        var _type = message.getAttribute('type');


        eventData = eventData || {};

        eventData = $.extend(
            true,
            {
                'myOwn': false
            },
            eventData,
            {
                'karere': self
            }
        );

        // flag own/forwarded messages, because of the <forward/> stanzas, we can receive back our own messages
        if(message.getAttribute('from') == self.getJid()) {
            eventData['myOwn'] = true;
        } else if(
            message.getAttribute('from').indexOf("conference.") != -1 &&
            message.getAttribute('from').split("/")[1] == self.getNickname()
            ) {
            eventData['myOwn'] = true;
        }


        var stanzaType = "Unknown";



        var x = message.getElementsByTagName("x");
        var to = message.getAttribute('to');
        var from = message.getAttribute('from');
        var eventId = message.getAttribute('id');

        eventData['to'] = to;
        eventData['from'] = from;
        eventData['id'] = eventId;

        var json_data = message.getElementsByTagName("json");
        if(json_data.length > 0) {
            eventData['meta'] = JSON.parse(json_data[0].childNodes[0].data);
        }

        var errors = message.getElementsByTagName("error");
        if(errors.length > 0) {
            eventData['error'] = errors[0].childNodes[0].tagName.toLowerCase();
        }

        // x handling
        if(x.length > 0 && x[0].getAttribute('xmlns') == 'http://jabber.org/protocol/muc#user') {
            eventData['roomJid'] = eventData['from'].split("/")[0];

            //copy please!
            var users = $.extend(true, {}, self.getMeta('rooms', eventData['roomJid'], 'users', {}));
            eventData['currentUsers'] = clone(users);

            var newUsers = {};
            var leftUsers = {};

            $.each(x[0].getElementsByTagName("item"), function(i, item) {
                var role = item.getAttribute('role');
                var jid = item.getAttribute('jid');

                if(role != "unavailable" && role != "none") {
                    if(users[jid] != role) {
                        users[jid] = role;
                        newUsers[jid] = item.getAttribute('role');
                    }
                } else { // left/kicked
                    delete users[jid];
                    delete newUsers[jid];
                    leftUsers[jid] = true;
                }
            });

            self.setMeta('rooms', eventData['roomJid'], 'users', users);

            if(Object.keys(newUsers).length > 0) {
                eventData['newUsers'] = newUsers;
                self._triggerEvent("UsersJoined", eventData);
            }
            if(Object.keys(leftUsers).length > 0) {
                eventData['leftUsers'] = leftUsers;
                self._triggerEvent("UsersLeft", eventData);
            }

            if($('status[code="110"]', x).size() == 1) {
                self._triggerEvent("UsersUpdatedDone", eventData);
            }
        }
        // end of x handling


        if(message.tagName.toLowerCase() == "message") {
            if(localStorage.d) {
		        console.warn(self.getNickname(), "Message: ", _type);
            }

            var elems = message.getElementsByTagName('body');

            if(from.indexOf(self.options.mucDomain) != -1) {
                eventData['roomJid'] = from.split("/")[0];
            } else if(to.indexOf(self.options.mucDomain) != -1) {
                eventData['roomJid'] = to.split("/")[0];
            }

            stanzaType = "Message";
            eventData['from'] = from;
            eventData['to'] = to;
            eventData['rawType'] = _type;
            eventData['type'] = stanzaType;
            eventData['elems'] = elems;
            eventData['rawMessage'] = message;

            if(_type == "action") {
                self._triggerEvent("ActionMessage", eventData);
                return true;
            } else if(_type == "chat" && elems.length > 0) {
                stanzaType = "PrivateMessage";


                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */

                    // if not...set the message property
                eventData['message'] = Strophe.getText(elems[0]);

                // is this a forwarded message? if yes, trigger event only for that
                if($('forwarded', message).size() > 0) {
                    $('forwarded', message).each(function(k, v) {
                        self._onIncomingStanza($('message', v)[0], {
                            'isForwarded': true,
                            'delay': $('delay', v).attr('stamp') ? Date.parse($('delay', v).attr('stamp'))/1000 : undefined
                        });
                    })


                    // stop
                    return true;
                }
            } else if(_type == "groupchat") {
                stanzaType = "ChatMessage";

                eventData['message'] = Strophe.getText(elems[0]);

                // is this a forwarded message? if yes, trigger event only for that
                if($('forwarded', message).size() > 0) {
                    $('forwarded', message).each(function(k, v) {
                        self._onIncomingStanza($('message', v)[0], {
                            'isForwarded': true,
                            'delay': $('delay', v).attr('stamp') ? Date.parse($('delay', v).attr('stamp'))/1000 : undefined
                        });
                    })


                    // stop
                    return true;
                }

                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */


            } else if(!_type && message.getElementsByTagName("event").length > 0) {
                stanzaType = "EventMessage";
            } else if(x.length > 0 && x[0].getAttribute("xmlns") == "jabber:x:conference") {
                stanzaType = "InviteMessage";
                eventData['room'] = x[0].getAttribute("jid");
                eventData['password'] = x[0].getAttribute("password");

                self.setMeta("rooms", eventData['room'], 'password', eventData['password']);

                if(localStorage.d) {
		            console.warn(self.getNickname(), "Got invited to join room: ", eventData['room']);
                }

                if(!self._triggerEvent("InviteMessage", eventData)) { /// stop auto join by event prop. ?
                    return true;
                } else {
                    self.connection.muc.join(
                        eventData['room'],
                        self.getNickname(),
                        undefined,
                        undefined,
                        undefined,
                        eventData['password'],
                        undefined
                    );

                    return true;
                }
            } else {
                stanzaType = "UnknownMessage";
            }
        } else if(message.tagName == "presence") {
            stanzaType = "Presence";

            var show = message.getElementsByTagName("show");
            if(show.length > 0) {
                eventData['show'] = $(show[0]).text();
            } else if(show.length == 0 && message.getAttribute('type')) {
                eventData['show'] = message.getAttribute('type');
            }

            var status = message.getElementsByTagName("status");
            if(status.length > 0) {
                eventData['status'] = $(status[0]).text();
            }

            if(eventData['show'] == undefined && eventData['status'] == undefined) {
                // is handled in the onPresence in Karere
            }

            var delay = message.getElementsByTagName("delay");
            if(delay.length > 0) {
                var stamp = delay[0].getAttribute('stamp');
                var d = Date.parse(stamp);
                eventData.delay = d/1000;
            }
        } else {
            if(localStorage.d) {
//		        console.debug("Unknown stanza type: ", message.innerHTML);
            }
            eventData['unknown'] = true;
            eventData['tag'] = message.tagName;
        }



        // XEP-0085 - Chat State Notifications
        // Because they can be embedded into other tags, we will trigger one additional event here...and if some of the
        // event handlers tried to stop the propagation, then we will stop the on$StanzaType triggering.
        if(message.getElementsByTagName("active").length > 0) {
            if(!self._triggerEvent("ActiveMessage", eventData)) {
                return true;  // always return true, because of how Strophe.js handlers work.
            }
        } else if(message.getElementsByTagName("paused").length > 0) {
            if(!self._triggerEvent("PausedMessage", eventData)) {
                return true; // always return true, because of how Strophe.js handlers work.
            }
        } else if(message.getElementsByTagName("composing").length > 0) {
            if(!self._triggerEvent("ComposingMessage", eventData)) {
                return true; // always return true, because of how Strophe.js handlers work.
            }
        }

        self._triggerEvent(stanzaType, eventData);

        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };

    /**
     * Helper method that should be used when triggering events on specific Stanzas
     *
     * @param stanzaType
     * @param eventData
     * @returns {boolean}
     * @private
     */
    Karere.prototype._triggerEvent = function (stanzaType, eventData) {
        var self = this;

        if(eventData['rawMessage'] && eventData['rawMessage'].getElementsByTagName("delay").length > 0) {
            stanzaType = "Delayed" + stanzaType;


            var delay = eventData['rawMessage'].getElementsByTagName("delay");
            if(delay.length > 0) {
                var stamp = delay[0].getAttribute('stamp');
                var d = Date.parse(stamp);
                eventData.delay = d/1000;
            }
        }

        var targetedTypeEvent = new $.Event("on" + stanzaType);

        if(localStorage.d) {
    		console.debug(self.getNickname(), "Triggering Event for: ", stanzaType, "with event data:", eventData);
        }

        try {
            /**
             * Strophe will remove this handler if it raises an exception... so we need to be sure that our attached
             * handlers WOULD NEVER throw an exception.
             */
            self.trigger(targetedTypeEvent, eventData);
        } catch(e) {
            if(localStorage.d) {
		        console.error('ERROR: ' + (e.stack ? e.stack : e));
            }
        }

        // if none of the handlers have not stopped the event propagation, trigger a more generic event.
        if(!targetedTypeEvent.isPropagationStopped()) {
            var genericEventInstance = new $.Event("onStanza");
            genericEventInstance.data = eventData;

            try {
                /**
                 * Strophe will remove this handler if it raises an exception... so we need to be sure that our attached
                 * handlers WOULD NEVER throw an exception.
                 */
                self.trigger(genericEventInstance, eventData);
            } catch(e) {
                if(localStorage.d) {
		            console.log('ERROR: ' + (e.stack ? e.stack : e));
                }
            }
            if(genericEventInstance.isPropagationStopped()) {
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
    /**
     * Change the currently logged in user presence
     *
     * @param presence {Karere.PRESENCE}
     * @param status
     */
    Karere.prototype.setPresence = function(presence, status, delay) {
        presence = presence || "chat";
        status = status || "";
        delay = delay ? parseFloat(delay) : undefined;

        var self = this;

        if(self.getConnectionState() == Karere.CONNECTION_STATE.CONNECTED) {
            var msg = $pres()
                .c("show")
                .t(presence)
                .up()
                .c("status")
                .t(status ? status : presence)
                .up();

            if(delay) {
                msg = msg
                    .c("delay", {
                        'xmlns': 'urn:xmpp:delay',
                        'stamp': (new Date(delay * 1000).toISOString()),
                        'from': self.getJid()
                    })
                .up();
            }

            self._presenceCache[self.getJid()] = presence;

            self.connection.send(
                msg.tree()
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

        if(jid.indexOf("/") != -1) {
            return self._presenceCache[jid] ? self._presenceCache[jid] : false;
        } else {
            var result = false;
            $.each(self._presenceCache, function(k, v) {
                if(k.indexOf(jid) === 0) {
                    result = v;
                }
            });

            return result;
        }
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
     * @param toJid
     * @returns {*}
     */
    Karere.prototype.sendIsComposing = function(toJid) {
        var self = this;

        return self._rawSendMessage(toJid, toJid.indexOf("conference.") == -1 ? "chat" : "groupchat", Karere._$chatState('composing'));
    };

    /**
     * Send Composing stopped/paused chat state
     *
     * @param toJid
     * @returns {*}
     */
    Karere.prototype.sendComposingPaused = function(toJid) {
        var self = this;
        self._rawSendMessage(toJid, toJid.indexOf("conference.") == -1 ? "chat" : "groupchat", Karere._$chatState('paused'));

        return $.when(
            self.sendIsActive(toJid),
            self._rawSendMessage(toJid, toJid.indexOf("conference.") == -1 ? "chat" : "groupchat", Karere._$chatState('paused'))
        );
    };


    /**
     * Send Is Active chat state
     *
     * @param toJid
     * @returns {*}
     */
    Karere.prototype.sendIsActive = function(toJid) {
        var self = this;
        return self._rawSendMessage(toJid, toJid.indexOf("conference.") == -1 ? "chat" : "groupchat", Karere._$chatState('active'));
    };
}



/**
 * One to one and Group Chat Implementation (Karere logic for translating Karere calls <-> XMPP stanzas and events)
 */
{
    /**
     * Messaging, encapsulated in one method
     *
     * @param toJid
     * @param type should be chat or groupchat
     * @param contents
     * @private
     */
    Karere.prototype._rawSendMessage = function (toJid, type, contents, meta, messageId, delay) {
        var self = this;
        meta = meta || {};

        type = type || "chat";

        messageId = messageId || self.generateMessageId(toJid);

        var message = $msg({from: self.connection.jid, to: toJid, type: type, id: messageId});

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

        if(Object.keys(meta).length > 0) {
            var json = Strophe.xmlHtmlNode("<json></json>").childNodes[0];
            json.textContent = JSON.stringify(meta);

            message.nodeTree.appendChild(
                json
            );
        }

        if(delay && delay > 0) {
            var $delay = $("<delay></delay>")
            $delay.attr('xmlns', 'urn:xmpp:delay');
            $delay.attr('from', self.getJid());
            $delay.attr('stamp', (new Date(delay * 1000).toISOString()));

            message.nodeTree.appendChild(
                $delay[0]
            );
        }


        // XX: Do we really need this in case that type == groupchat?
//
//        var forwarded = $msg({
//            to: Strophe.getBareJidFromJid(self.connection.jid),
//            type: type,
//            id:messageId
//        })
//            .c('forwarded', {xmlns:'urn:xmpp:forward:0'})
//            .c('delay', {xmns:'urn:xmpp:delay',stamp:timestamp}).up()
//            .cnode(message.tree());

        self.connection.send(message);
//        self.connection.send(forwarded);

        if(localStorage.dxmpp) {
            console.debug(self.getNickname(), "sendin message w/ id", messageId, message);
        }
        return messageId;
    };

    Karere.prototype.sendAction = function(toJid, action, meta) {
        return this._rawSendMessage(
            toJid,
            "action",
            "",
            $.extend(
                true,
                {},
                meta,
                {'action': action}
            )
        );
    };

    /**
     * Generates room config XML from the self.options.roomConfig to be used and sent as stanza when creating new rooms
     *
     * @param roomPassword
     * @returns {HTMLElement[]}
     * @private
     */
    Karere.prototype._getRoomConfig = function(roomPassword) {
        var self = this;

        var configXml = "<x xmlns='jabber:x:data' type='submit'>" +
            "<field var='FORM_TYPE'>" +
            "<value>http://jabber.org/protocol/muc#roomconfig</value>" +
            "</field>";

        var configDict = $.extend({}, self.options.roomConfig, {
            "muc#roomconfig_roomsecret": roomPassword ? roomPassword : ""
        });

        $.each(Object.keys(configDict), function(i, k) {
            configXml += "<field var='" + k + "'>" +
                "<value>" + configDict[k] + "</value>" +
                "</field>";
        });


        configXml += "<field var='muc#roomconfig_captcha_whitelist'/>" +
            "</x>";

        return Strophe.xmlHtmlNode(configXml).children[0].children;
    };

    /**
     * Start/create new chat, wait for the room creations, send invites and wait for all users to join.
     *
     * @param jidList array of jids to be invited to the chat
     * @param type string private/group
     * @returns {Deferred}
     */
    Karere.prototype.startChat = function(jidList, type, roomName) {
        var self = this;

        type = type || "private";
        roomName = roomName || self._generateNewRoomIdx();

        var $promise = new $.Deferred();


        var roomPassword = self._generateNewRoomPassword();
        var roomJid = roomName + "@" + self.options.mucDomain;

        self.setMeta("rooms", roomJid, 'password', roomPassword);
        self.setMeta("rooms", roomJid, 'type', type);

        self.connection.muc.join(roomJid, self.getNickname(), undefined, undefined, undefined, roomPassword, undefined);

        var iHadJoinedPromise = self.waitForUserToJoin(roomJid, self.getJid());

        iHadJoinedPromise
            .done(function() {
                if(typeof Form == "undefined") {
                    window.Form = function() {}; // bug in Strophe.plugins.muc
                    window.Form._do_cleanup = true;
                }

                self.connection.muc.saveConfiguration(
                    roomJid,
                    self._getRoomConfig(roomPassword),
                    Karere._exceptionSafeProxy(function() {
                        var promises = [];

                        $.each(jidList, function(i, jid) {
                            promises.push(
                                self.addUserToChat(roomJid, jid, roomPassword)
                            );
                        });

                        // wait for all promises before resolving the main one.

                        $.when.apply($, promises)
                            .done(function() {
                                $promise.resolve(roomJid, roomPassword);
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
                if(localStorage.d) {
		            console.error("Could not join my newly created room.")
                }
                $promise.reject();
            });

        // returns promise that when solved will get the chat's JID
        return $promise;
    };


    /**
     * Helper/internal method for waiting for a user's presence in a specific room.
     *
     * @param eventName Joined/Left
     * @param roomJid
     * @param userJid
     * @returns {Deferred}
     * @private
     */
    Karere.prototype._waitForUserPresenceInRoom = function(eventName, roomJid, userJid) {
        var self = this;

        var $promise = new $.Deferred();
        var generatedEventName = generateEventSuffixFromArguments("onUsers" + eventName, "inv", roomJid, userJid, self._generateNewIdx());

        if(localStorage.d) {
            console.warn(
                self.getNickname(),
                (new Date()),
                "Starting to wait for user to" + (eventName == "Joined" ? "join" : "leave") + ": ",
                userJid,
                "event idx:",
                generatedEventName
            );
        }


        var joinedTimeout = setTimeout(function() {
            if(localStorage.d) {
		        console.error(
                    self.getNickname(),
                    (new Date()),
                    "Timeout waiting for user to " + (eventName == "Joined" ? "join" : "leave") + ": ",
                    userJid
                );
            }

            self.unbind(generatedEventName);
            $promise.reject(roomJid, userJid);
        }, self.options.wait_for_user_presence_in_room_timeout);

        var searchKey = eventName == "Joined" ? "newUsers" : "leftUsers";

        self.bind(generatedEventName, function(e, eventData) {
            var joined = false;

            if(localStorage.d) {
//        		console.debug(eventName, roomJid, userJid, eventData[searchKey]);
            }

            if(eventData.from.split("/")[0] != roomJid) {
                return;
            }

            if(userJid.indexOf("/") == -1) { // bare jid
                // search for $userJid/
                //noinspection FunctionWithInconsistentReturnsJS
                $.each(eventData[searchKey], function(k) {
                    if(k.indexOf(userJid + "/") != -1) {
                        joined = true;
                        return false; //break;
                    }
                });
            } else { // full jid
                if(eventData[searchKey][userJid]) {
                    joined = true;
                }
            }


            if(joined) {
                if(localStorage.d) {
	            	console.warn(self.getNickname(), "User " + eventName + ": ", roomJid, userJid);
                }

                self.unbind(generatedEventName);
                clearTimeout(joinedTimeout);

                $promise.resolve(
                    roomJid, userJid
                );
            }
        });


        return $promise;
    };

    /**
     * Wait for user to join
     *
     * @param roomJid
     * @param userJid
     * @returns {Deferred}
     */
    Karere.prototype.waitForUserToJoin = function(roomJid, userJid) {
        return this._waitForUserPresenceInRoom("Joined", roomJid, userJid);
    };

    /**
     * Wait for user to leave
     *
     * @param roomJid
     * @param userJid
     * @returns {Deferred}
     */
    Karere.prototype.waitForUserToLeave = function(roomJid, userJid) {
        return this._waitForUserPresenceInRoom("Left", roomJid, userJid);
    };

    /**
     * Leave chat
     *
     * @param roomJid
     * @param exitMessage optional
     * @returns {Deferred}
     */
    Karere.prototype.leaveChat = function(roomJid, exitMessage) {
        var self = this;

        exitMessage = exitMessage || undefined;

        var $promise = new $.Deferred();

        self.connection.muc.leave(
            roomJid,
            undefined,
            Karere._exceptionSafeProxy(function() {
                $promise.resolve();
            }),
            exitMessage
        );

        return $promise;
    };

    /**
     * Invite a user to a specific chat
     *
     * @param roomJid
     * @param userJid
     * @param password
     * @returns {Deferred}
     */
    Karere.prototype.addUserToChat = function(roomJid, userJid, password, type, meta) {
        var self = this;

        type = type || "private";
        meta = meta || {};

        if(!password && self.getMeta("rooms", roomJid, 'password')) {
            password = self.getMeta("rooms", roomJid, 'password');
        }
        type = type || self.getMeta("rooms", roomJid, 'type');

        var $promise = self.waitForUserToJoin(roomJid, userJid);

//        self.connection.muc.directInvite(roomJid, userJid, undefined, password);

        // construct directInvite (fork of muc.directInvite, so that we can add extra type arguments)
        var attrs, invitation, msgid;
        msgid = self.connection.getUniqueId();
        attrs = {
            xmlns: 'jabber:x:conference',
            jid: roomJid
        };

        if(password) {
            attrs.password = password;
        }

        invitation = $msg({
            from: self.getJid(),
            to: userJid,
            id: msgid
        })
            .c('x', attrs)
            .c("json");

        meta = $.extend(
            true,
            {},
            meta,
            {
                'type': type
            }
        );
        var json = JSON.stringify(meta);

        // because strophe's builder is doing some very bad sanitization that will break the json string.
        invitation.node.appendChild(Strophe.xmlTextNode(json));

        self.connection.send(invitation);

        if(localStorage.d) {
		    console.warn(self.getNickname(), "Inviting: ", userJid, "to", roomJid, "with password", password);
        }

        return $promise;
    };

    /**
     * Remove a user from a chat room
     *
     * @param roomJid
     * @param userJid
     * @param reason
     * @returns {Deferred}
     */
    Karere.prototype.removeUserFromChat = function(roomJid, userJid, reason) {
        var self = this;

        reason = reason || "";

        var $promise = new $.Deferred();
        var nickname = false;

        if(!self.connection.muc.rooms[roomJid] || !self.connection.muc.rooms[roomJid].roster) {
            $promise.reject("Room user list is currently not available.");
            return $promise;
        }
        //noinspection FunctionWithInconsistentReturnsJS
        $.each(self.connection.muc.rooms[roomJid].roster, function(_nick, item) {
            if(item.jid == userJid) {
                nickname = _nick;
                return false; // break.
            }
        });

        if(localStorage.d) {
            console.warn(self.getNickname(), "Removing user: ", userJid, "from chat", roomJid);
        }

        if(!nickname) {
            $promise.reject(
                'User not found for jid: ' + userJid
            );
        } else {
            // pair/proxy the waitForUserToLeave w/ the returned promise, so that it will be resolved only
            // when the user is actually out of the chat room.
            self.waitForUserToLeave(roomJid, userJid)
                .done(function() {
                    $promise.resolve();
                })
                .fail(function() {
                    $promise.reject();
                });

            self.connection.muc.kick(
                roomJid,
                nickname,
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
     * @param roomJid
     * @returns {*}
     */
    Karere.prototype.getUsersInChat = function(roomJid) {
        var self = this;
        var users = self.getMeta('rooms', roomJid, 'users', {});
        return users;
    };

    Karere.prototype.userExistsInChat = function(roomJid, userJid) {
        var self = this;
        var users = self.getUsersInChat(roomJid);

        return users.hasOwnProperty(userJid);
    };

    Karere.prototype.joinChat = function(roomJid, password) {
        var self = this;
        password = password || undefined;

        self.connection.muc.join(
            roomJid,
            self.getNickname(),
            undefined,
            undefined,
            undefined,
            password,
            undefined
        );

        return self.waitForUserToJoin(roomJid, self.getJid());
    }
}


/**
 * Wrap all methods which require a connection to actually use the ._requiresConnectionWrapper helper
 */
{
    Karere._requiresConnectionWrapper(Karere.prototype, 'startChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'leaveChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'joinChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'addUserToChat');
    Karere._requiresConnectionWrapper(Karere.prototype, 'removeUserFromChat');
}