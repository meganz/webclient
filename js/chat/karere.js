/**
 * Karere - Mega XMPP Client
 */

// Because of several bugs in Strophe's connection handler for Bosh and WebSockets (throwing uncatchable exceptions)
// this is currently not working. We should isolate and prepare a test case to to submit as a bug to Strophe's devs.
// Exception:
// Uncaught InvalidStateError: Failed to execute 'send' on 'XMLHttpRequest': the object's state must be OPENED.

Strophe.Bosh.prototype._hitError = Strophe.Websocket.prototype._hitError = function (reqStatus) {
    var self = this;
    var karere = this._conn.karere;

    karere.connectionRetryManager.doConnectionRetry(reqStatus);
};

/**
 * Create new Karere instance.
 *
 *
 * @param [user_options] {Object} see Karere.DEFAULTS for options that you can overwrite
 * @returns {Karere}
 * @constructor
 */
var Karere = function(user_options) {
    var self = this;

    self.options = $.extend(true, {}, Karere.DEFAULTS, user_options);

    self.connection = new Strophe.Connection("", self.options.stropheOptions);
    self.connection.karere = self;

    self.connection.disco.addNode('urn:xmpp:ping', {}); // supports pings
    self.connection.disco.addNode('karere', {}); // identify as a Karere client.

    self.logger = MegaLogger.getLogger("karere", self.options.loggerOptions);

    self.connection.rawInput = function (data) {
        self.logger.debug(self.getNickname(), "RECV", data);
    };

    self.connection.rawOutput = function (data) {
        self.logger.debug(self.getNickname(), "SENT", data);
    };

    Strophe.fatal = function (msg) { self.error(msg); };
    Strophe.error = function (msg) { self.error(msg); };

    self.destroying = false;

    // initialize the connection state
    self._connectionState = Karere.CONNECTION_STATE.DISCONNECTED;

    // Implement a straight forward, naive cleanup logic to be executed before the page is reloaded
    $(window).on("unload", function() {

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            self.destroying = true;

            self.connection.disconnect();

            self.logger.warn("flushing out and disconnecting onbeforeunload");
        }
    });


    // Local in-memory Presence & Disco cache implementation
    self._presenceCache = {};
    self._presenceBareCache = {};

    self._discoCache = {};
    self._discoBareCache = {};

    self._iqRequests = {};


    self._waitForPresenceCache = {};

    self._triggeredActions = {};

    self.bind("onPresence", function(e, eventObject) {
        var bareJid = Karere.getNormalizedBareJid(eventObject.getFromJid());

        if (eventObject.getFromJid().indexOf("conference.") !== -1) {
            // ignore user joined presences for conf rooms.
            return;
        }

        if (eventObject.getShow() !== "unavailable" && !eventObject.getType()) {

            self._presenceCache[eventObject.getFromJid()] = eventObject.getShow() ? eventObject.getShow() : "available";
            self._presenceBareCache[bareJid] = eventObject.getShow() ? eventObject.getShow() : "available";

            if (!self._discoCache[eventObject.getFromJid()]) {
                self._requestDiscoCapabilities(eventObject.getFromJid());
            }
        }
        else {
            delete self._presenceCache[eventObject.getFromJid()];
            delete self._discoCache[eventObject.getFromJid()];

            var foundPresenceForOtherDevices = false;
            $.each(self._presenceCache, function(fullJid, pres) {
                if (fullJid.indexOf(bareJid) !== -1) {
                    foundPresenceForOtherDevices = true;
                    return false;
                }
            });

            if (!foundPresenceForOtherDevices) {
                delete self._presenceBareCache[bareJid];
                delete self._discoBareCache[bareJid];

                self.trigger('onDiscoCapabilities', [
                    new KarereEventObjects.DiscoCapabilities(
                        eventObject.getFromJid(),
                        bareJid,
                        $.extend({}, self.options.defaultCapabilities)
                    )
                ]);
            }
        }
    });

    var usersUpdatedHandler = function(e, eventObject) {

        var newUsers = eventObject.getNewUsers ? eventObject.getNewUsers() : {};
        var leftUsers = eventObject.getLeftUsers ? eventObject.getLeftUsers() : {};
        var users = self.getMeta('rooms', eventObject.getRoomJid(), 'users', {});

        // ordered users list
        var orderedUsers = self.getMeta('rooms', eventObject.getRoomJid(), 'orderedUsers', []).slice() /* clone */;

        $.each(newUsers, function(jid, role) {
            if (orderedUsers.indexOf(jid) === -1) {
                orderedUsers.push(
                    jid
                );
                assert(jid !== null && jid !== "null", "invalid JID passed");
                users[jid] = role;
            }
        });

        $.each(leftUsers, function(jid, role) {
            var arrIdx = orderedUsers.indexOf(jid);
            if (arrIdx !== -1) {
                orderedUsers.splice(arrIdx, 1);
            }
            delete users[jid];
        });

        assert(anyOf(Object.keys(users), "null") === false, "users should not contain \"null\".");
        assert(anyOf(orderedUsers, "null") === false, "users should not contain \"null\".");

        self.setMeta('rooms', eventObject.getRoomJid(), 'orderedUsers', orderedUsers);

        self.setMeta('rooms', eventObject.getRoomJid(), 'users', users);
    };

    self.bind("onUsersJoined", usersUpdatedHandler);
    self.bind("onUsersLeft", usersUpdatedHandler);

    self.bind("onPingRequest", function(e, eventObject) {
        if (eventObject.isMyOwn(self) || e.isPropagationStopped() === true) {
            return;
        }

        self.logger.debug("Sending pong: ", eventObject);

        self.sendPong(eventObject.getFromJid(), eventObject.getMessageId());
    });

    // cleanup after disconnecting
    self.bind("onDisconnected", function() {
        Object.keys(self._presenceBareCache).forEach(function(k) {
            delete self._presenceBareCache[k];

            self.trigger(
                "onPresence",
                new KarereEventObjects.Presence(
                    self.getJid(),
                    k,
                    "unavailable",
                    "unavailable",
                    unixtime(),
                    undefined
                )
            );
        });
        self._presenceCache = {};
        self._presenceBareCache = {};

        self._discoCache = {};
        self._discoBareCache = {};

        self._iqRequests = {};
    });


    self.bind("onConnected", function() {
        self.connectionRetryManager.gotConnected();
    });

    var clearDelayedReconnectTimeout = function() {
        if (self._delayedConnectTimeout) {
            clearTimeout(self._delayedConnectTimeout);
            self._delayedConnectTimeout = null;
        }
    };

    self.connectionRetryManager = new ConnectionRetryManager(
        {
            minConnectionRetryTimeout: 1500,
            functions: {
                reconnect: function(connectionRetryManager) {
                    if (connectionRetryManager._connectionRetries > 1) {
                        clearDelayedReconnectTimeout();
                        var megaPromise = new MegaPromise();
                        // because of the bug in ejabberd, force delay any connection retry
                        self._delayedConnectTimeout = setTimeout(function() {
                            clearDelayedReconnectTimeout();
                            if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
                                megaPromise.resolve();
                            }
                            else {
                                megaPromise.linkDoneAndFailTo(self.forceReconnect());
                            }
                        }, 2000);

                        return megaPromise;
                    }
                    else {
                        return self.forceReconnect();
                    }
                },
                /**
                 * A Callback that will trigger the 'forceDisconnect' procedure for this type of connection (Karere/Chatd/etc)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 */
                forceDisconnect: function(connectionRetryManager) {
                    return self.forceDisconnect();
                },
                /**
                 * Should return true or false depending on the current state of this connection, e.g. (connected || connecting)
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnectedOrConnecting: function(connectionRetryManager) {
                    return (
                        self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED ||
                        self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING
                    );
                },
                /**
                 * Should return true/false if the current state === CONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isConnected: function(connectionRetryManager) {
                    return (
                        self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED
                    );
                },
                /**
                 * Should return true/false if the current state === DISCONNECTED
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isDisconnected: function(connectionRetryManager) {
                    return (
                        self.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED
                    );
                },
                /**
                 * Should return true IF the user had forced the connection to go offline
                 * @param connectionRetryManager {ConnectionRetryManager}
                 * @returns {bool}
                 */
                isUserForcedDisconnect: function(connectionRetryManager) {
                    return (
                        self.destroying === true
                    );
                }
            }
        },
        self.logger
    );

    return this;
};

/**
 * Default options for Karere
 */
Karere.DEFAULTS = {
    /**
     * Used to connect to the BOSH service endpoint
     */
    "xmppServiceUrl": 'https://sandbox.developers.mega.co.nz:5281/bosh',

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
        "muc#roomconfig_passwordprotectedroom": 0,
        "muc#roomconfig_maxusers": 200,
        "muc#roomconfig_whois": "anyone",
        "muc#roomconfig_membersonly": 0,
        "muc#roomconfig_moderatedroom": 1,
        "members_by_default": 1,
        "muc#roomconfig_changesubject": 0,
        "allow_private_messages": 0,
        "allow_private_messages_from_visitors": "anyone",
        "allow_query_users": 0,
        "muc#roomconfig_allowinvites": 1,
        "muc#roomconfig_allowvisitorstatus": 1,
        "muc#roomconfig_allowvisitornickchange": 0,
        "muc#roomconfig_allowvoicerequests": 1,
        "muc#roomconfig_voicerequestmininterval": 1800
    },

    /**
     * Timeout for the addUserToChat promise...will wait for that much ms and reject the promise
     * if the user have not joined
     */
    waitForUserPresenceInRoomTimeout: 2500,

    /**
     * Timeout for waiting before rejecting the .disconnect promise
     */
    disconnectTimeout: 2500,

    /**
     * Timeout for waiting the queue of waiting stanzas to be send before rejecting and doing forced disconnect
     */
    disconnectQueueTimeout: 2000,

    /**
     * When a method which requires connection is called, Karere would try to connect and execute that method.
     * However, what is the timeout that should be used to determinate if the connect operation had timed out?
     */
    connectionRequiredTimeout: 13000,

    /**
     * Timeout waiting for a ping response from user (note: using client-to-client xmpp ping)
     */
    pingTimeout: 5000,

    /**
     * The default affiliation set when adding new users in membersOnly rooms.
     */
    newUsersAffiliation: "owner",

    /**
     * Default capabilities and their settings (used when initializing the local disco capab. cache)
     */
    defaultCapabilities: {
        'audio': false,
        'video': false,
        'karere': false,
        'ping': false
    },

    /**
     * Default name for roster group to be used when .subscribe is called
     */
    defaultRosterGroupName: 'Contacts',

    /**
     * How much time we should keep the "Action" ids in memory (used to be checked if an Action was already triggered)
     */
    actionMessageTriggerRegistryExpiration: 2000,

    loggerOptions: {
        minLogLevel: function() {
            // jscs:disable disallowImplicitTypeConversion
            return !!localStorage.dxmpp == true ? MegaLogger.LEVELS.DEBUG : MegaLogger.LEVELS.ERROR;
            // jscs:enable disallowImplicitTypeConversion
        }
    },

    /**
     * Interval in ms which will be used for the ping-pong (c2s) pings via the KarerePing plugin to determinate if the
     * client is currently connected
     */
    karerePingInterval: 60000,

    /**
     * Timeout (in ms) when waiting for a c2s response (should be <= karerePingInterval)
     */
    serverPingTimeout: 5000
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
    'AVAILABLE': "available",
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
        return this._connectionState;
    };

    /**
     * Strophe will remove ANY handler if it raises an exception... so this is a helper wrapper to catch and log
     * exceptions with stack trace (if any).
     *
     * To be used when calling Strophe.addHandler
     *
     * @param fn
     * @param [context] Object
     * @returns {Function}
     * @private
     */
    Karere._exceptionSafeProxy = function(fn, context) {
        return function() {
            try {
                return fn.apply(context, arguments);
            } catch (e) {
                if (MegaLogger && MegaLogger.rootLogger) {
                    MegaLogger.rootLogger.error("exceptionSafeProxy caught: ", e, e.stack);
                }
                else if (window.d) {
                    console.error(e, e.stack);
                }

                if (localStorage.stopOnAssertFail) {
                    debugger;
                }
                return true;
            }
        };
    };

    Karere.prototype._generateNewResource = function() {
        var self = this;
        return self.options.clientName + "-" + self._generateNewResourceIdx();
    };

    /**
     * Initialize JID and password... (will not automatically connect, to use those credentials for connecting you can
     * always call .reconnect())
     *
     * @param jid string
     * @param password string
     */
    Karere.prototype.authSetup = function(jid, password) {
        var self = this;

        var bareJid = Strophe.getBareJidFromJid(jid);
        var fullJid = jid;

        // if there is no /resource defined, generate one on the fly.
        if (bareJid === fullJid) {
            var resource = self._generateNewResource();
            fullJid = fullJid + "/" + resource;
        }

        // we may need this to reconnect in case of disconnect or connection issues.
        // also, we should reuse the original generated resource, so we cache the full jid here.
        self._jid = fullJid;
        self._password = password;
        self._fullJid = fullJid;


        // parse and cache the mucDomain
        self.options.mucDomain = "conference." + jid.split("@")[1].split("/")[0];
    };


    /**
     * Connect to a XMPP account
     *
     * @param jid
     * @param password
     * @returns {jQuery.Deferred}
     */
    Karere.prototype.connect = function(jid, password) {
        var self = this;

        var $promise = new MegaPromise();

        // don't call Strophe.connect again if already connected/connecting
        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            $promise.resolve(Karere.CONNECTION_STATE.CONNECTED);
            return $promise;
        }
        else if (
            (self._$connectingPromise && self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING) ||
            (self._$connectingPromise && self._$connectingPromise.state() === "pending")
        ) {
            return self._$connectingPromise;
        }

        self.authSetup(jid, password);

        self.connection.reset(); // clear any old attached handlers

        var _doConnectTo = function() {
            if (self.connection.service.indexOf("wss://") !== -1) {
                self.connection._proto = new Strophe.Websocket(self.connection);
            } else {
                this._proto = new Strophe.Bosh(self.connection);
            }

            self.connection.connect(
                self._fullJid,
                self._password,
                function(status) {
                    self.logger.warn("Got connection status: ", self._fullJid, self._password, status);

                    self._connectionState = status;

                    if (status === Karere.CONNECTION_STATE.CONNECTING) {
                        self.logger.debug(self.getNickname(), 'Karere is connecting.');

                        self.trigger('onConnecting');
                    }
                    else if (status === Karere.CONNECTION_STATE.CONNFAIL) {
                        self.logger.warn(self.getNickname(), 'Karere failed to connect.');

                        if (self._connectionRetries >= self.options.maxConnectionRetries) {
                            $promise.reject(status);
                        }
                        self.trigger('onConnfail');
                        self.trigger('onConnectionClosed');

                        if (arguments[1] === "system-shutdown" || arguments[1] === "improper-addressing") {
                            self.connectionRetryManager.doConnectionRetry(arguments[1]);
                        } else {
                            self.connectionRetryManager.gotDisconnected();
                        }
                    }
                    else if (status === Karere.CONNECTION_STATE.AUTHFAIL) {
                        self.logger.warn(self.getNickname(), 'Karere failed to connect - Authentication issue.');

                        $promise.reject(status);
                        self.trigger('onAuthfail');
                        self.trigger('onConnectionClosed');
                        self.connectionRetryManager.gotDisconnected();
                    }
                    else if (status === Karere.CONNECTION_STATE.DISCONNECTING) {
                        self.logger.warn(self.getNickname(), 'Karere is disconnecting.');

                        self.trigger('onDisconnecting');
                    }
                    else if (status === Karere.CONNECTION_STATE.DISCONNECTED) {
                        self.logger.info(self.getNickname(), 'Karere is disconnected.');

                        self.trigger('onDisconnected');
                        self.trigger('onConnectionClosed');
                        self.connectionRetryManager.gotDisconnected();;
                    }
                    else if (status === Karere.CONNECTION_STATE.CONNECTED) {
                        self.logger.info(self.getNickname(), 'Karere is connected.');

                        // connection.jid
                        self.connection.addHandler(
                            Karere._exceptionSafeProxy(self._onIncomingStanza, self),
                            null,
                            'presence',
                            null,
                            null,
                            null
                        );
                        self.connection.addHandler(
                            Karere._exceptionSafeProxy(self._onIncomingStanza, self), null, 'message', null, null,  null
                        );
                        self.connection.addHandler(
                            Karere._exceptionSafeProxy(self._onIncomingIq, self), null, 'iq', null, null,  null
                        );

                        self.connectionRetryManager.gotConnected();


                        self.trigger('onConnected');

                        $promise.resolve(status);
                    }

                    return true;
                }
            );
        };

        var remoteBoshServiceUrlPromise = false;
        if ($.isFunction(self.options.xmppServiceUrl)) {
            var service = self.options.xmppServiceUrl();
            if (service.fail && service.resolve) { // its a promise!
                self._connectionState = Karere.CONNECTION_STATE.CONNECTING;

                remoteBoshServiceUrlPromise = service.done(function(serviceUrl) {
                    self.connection.service = serviceUrl;
                    _doConnectTo();
                });
            }
            else {
                self.connection.service = service;
                _doConnectTo();
            }

        }
        else {
            self.connection.service = self.options.xmppServiceUrl;
            _doConnectTo();
        }



        self._$connectingPromise = self.connectionRetryManager.startedConnecting(remoteBoshServiceUrlPromise);

        // sync the _$connectionPromise in realtime with the original $promise
        $promise
            .done(function() {
                if (self._$connectingPromise) {
                    self._$connectingPromise.verify();
                }
            })
            .fail(function() {
                if (self._$connectingPromise) {
                    self._$connectingPromise.reject();
                }
            });

        return self._$connectingPromise.always(function() {
            delete self._$connectingPromise;
        });
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
            var args = arguments;

            var internalPromises = [];
            var $promise = new MegaPromise();

            /**
             * Reconnect if connection is dropped or not available and there are actual credentials in _jid and
             * _password
             */
            if (
                self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING ||
                (self._$connectingPromise && self._$connectingPromise.state() === 'pending')
            ) {
                self.logger.warn(
                    "Tried to call ", functionName, ", while Karere is still in CONNECTING state, will queue for " +
                    "later execution."
                );

                internalPromises.push(
                    createTimeoutPromise(
                        function() {
                            return self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED;
                        },
                        200,
                        self.options.connectionRequiredTimeout
                    )
                );
            }
            else if (self.getConnectionState() !== Karere.CONNECTION_STATE.CONNECTED) {
                if (!self._isReconnecting) {
                    self.logger.warn(
                        "Tried to call ", functionName, ", but Karere is not connected. Will try to reconnect first."
                    );
                    self._isReconnecting = true;

                    internalPromises.push(
                        self.reconnect()
                    );
                }
            }

            MegaPromise.all(internalPromises)
                .done(function() {
                    fn.apply(self, args)
                        .done(function() {
                            $promise.resolve.apply($promise, arguments);
                        })
                        .fail(function() {
                            $promise.reject.apply($promise, arguments);
                        });
                })
                .fail(function() {
                    $promise.reject.apply($promise, arguments);
                });

            return $promise.always(function() {
                self._isReconnecting = false;
            });
        };
    };


    Karere.prototype.forceDisconnect = function() {
        this.connection._onDisconnectTimeout();
        this._connectionState = Karere.CONNECTION_STATE.DISCONNECTED;
    };

    Karere.prototype.forceReconnect = function() {
        var self = this;
        self.forceDisconnect();
        self._jid = self._jid.split("/")[0] + "/" + self._generateNewResource();
        return self.reconnect();
    };

    /**
     * Simple reconnect method
     *
     * @returns {jQuery.Deferred}
     */
    Karere.prototype.reconnect = function() {
        var self = this;

        if (self._myPresence === Karere.PRESENCE.OFFLINE) {
            self.logger.warn("Will halt the reconnect operation, my presence is set to 'offline'.");
            return MegaPromise.reject(Karere.CONNECTION_STATE.DISCONNECTED);
        }

        var state = self.getConnectionState();
        if (state === Karere.CONNECTION_STATE.DISCONNECTING) {
            self.forceDisconnect();

            return MegaPromise.reject(Karere.CONNECTION_STATE.DISCONNECTED);
        }

        if (!self._jid || !self._password) {
            throw new Error("Missing jid or password.");
        }

        if (state === Karere.CONNECTION_STATE.CONNECTING && self._$connectingPromise) {
            return self._$connectingPromise;
        }

        if (
            state !== Karere.CONNECTION_STATE.DISCONNECTED &&
            state !== Karere.CONNECTION_STATE.AUTHFAIL
        ) {
            throw new Error(
                "Invalid connection state. Karere should be DISCONNECTED, before calling .reconnect. [[:i]]"
            );
        }



        return self.connect(self._jid, self._password);
    };


    /**
     * Simple internal method that will return a promise, which will be marked as resolved only when there are no more
     * queued stanzas or fail if the waiting exceed self.options.disconnectQueueTimeout
     *
     * @returns {*}
     * @private
     */
    Karere.prototype._waitForRequestQueueToBeEmpty = function() {
        var self = this;

        return createTimeoutPromise(function() {
            return self.connection._data.length === 0;
        }, 500, self.options.disconnectQueueTimeout);
    };

    /**
     * Disconnect Karere from the XMPP server
     *
     * @returns {Deferred|*}
     */
    Karere.prototype.disconnect = function() {
        var self = this;

        if (self._disconnectTimeoutPromise && self._disconnectTimeoutPromise.state() === "pending") {
            return self._disconnectTimeoutPromise;
        }
        if (
            self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED ||
                self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTING ||
                self.getConnectionState() === Karere.CONNECTION_STATE.AUTHENTICATING ||
                self.getConnectionState() === Karere.CONNECTION_STATE.ATTACHED
            ) {

            self.logger.debug("Will try to wait for the queue to get empty before disconnecting...");

            self._connectionState = Karere.CONNECTION_STATE.DISCONNECTING;

            self._waitForRequestQueueToBeEmpty()
                .always(function() {
                    delete self._disconnectTimeoutPromise;
                })
                .fail(function() {
                    self.logger.warn("Queue did not emptied in the given timeout. Forcing disconnect.");
                    self.forceDisconnect();
                })
                .done(function() {
                    self.logger.debug("Queue is empty. Calling disconnect.");
                    self.connection.disconnect();
                });

        }
        else if (self.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTING && self._disconnectTimeoutPromise) {
            // do nothing, we are already in the process of disconnecting.
            return self._disconnectTimeoutPromise;
        }
        else {
            self.forceDisconnect();
        }

        self._disconnectTimeoutPromise = createTimeoutPromise(
            function() {
                return (
                    self.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTED ||
                    self.getConnectionState() === Karere.CONNECTION_STATE.AUTHFAIL
                );
            },
            200,
            self.options.disconnectTimeout
        )
            .always(function() {
                delete self._disconnectTimeoutPromise;
                if (self.getConnectionState() === Karere.CONNECTION_STATE.DISCONNECTING) {
                    self.forceDisconnect();
                }
            }).done(function() {
                self.clearMeta('rooms');
            });

        return self._disconnectTimeoutPromise;
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
        if (typeof localStorage.karereIdx === "undefined") {
            localStorage.karereIdx = 0;
        }
        else {
            localStorage.karereIdx = parseInt(localStorage.karereIdx, 10) + 1;
        }
        // reset if > 1000
        if (localStorage.karereIdx > 100000) {
            localStorage.karereIdx = 0;
        }

        return localStorage.karereIdx + rand_range(1, 999999);
    };

    /**
     * Helper for generating an MD5 hexdigest that can be used as a XMPP /resource
     *
     * @returns {*}
     * @private
     */
    Karere.prototype._generateNewResourceIdx = function() {
        var self = this;
        return MD5.hexdigest(
            window.navigator.userAgent.toString() + "-" + (new Date()).getTime() + "-" + self._generateNewIdx()
        );
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


    /**
     * Helper method to generate a message ID, based on the target JID
     * @param toJid {string} jid of the recipient
     * @param [messageContents] {string} optional, message content
     * @returns {string}
     */
    Karere.prototype.generateMessageId = function(toJid, messageContents) {
        var self = this;
        var messageIdHash = self.getJid() + toJid;
        if (messageContents) {
            messageIdHash += messageContents;
        }
        return "m" + fastHashFunction(messageIdHash) + "_" + unixtime();
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
     * Returns a specially formatted username__resource of the currently connected user (e.g. lpetrov__resource-1, in
     * case of the bare jid is lpetrov@mega.co.nz/resource-1)
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
     * Normalize Jids (e.g. conference jids -> local muc jids)
     *
     * @param jid
     * @returns {*}
     */
    Karere.getNormalizedBareJid = function(jid) {
        if (!jid || !jid.split) {
            if (d) {
                console.error("Karere.getNormalizedBareJid got", jid, "instead of a jid.");
            }
        }

        if (jid.indexOf("conference.") !== -1 && jid.indexOf("/") !== -1) {
            jid = jid.split("/")[1].split("__")[0] + "@" + jid.split("@")[1].split("/")[0].replace("conference.", "");
        }
        else {
            jid = jid.split("/")[0];
        }

        return jid;
    };

    /**
     * Normalize FULL Jids (e.g. conference jids -> local muc jids)
     *
     * @param jid
     * @returns {*}
     */
    Karere.getNormalizedFullJid = function(jid) {
        if (!jid || !jid.split) {
            if (d) {
                console.error("Karere.getNormalizedFullJid got", jid, "instead of a jid.");
            }
        }
        if (jid.indexOf("conference.") !== -1) {
            jid = jid.split("/")[1].split("__")[0] +
                        "@" +
                        jid.split("@")[1].split("/")[0].replace("conference.", "") +
                        "/" + jid.split("/")[1].split("__")[1];
        }
        return jid;
    };

    /**
     * Helper method that should be used to proxy Strophe's .fatal and .error methods to actually LOG something to the
     * console.
     */
    Karere.prototype.error = function(a1) {
        var additional = "";
        if (a1 instanceof Error) {
            additional = a1.stack;
        }
        var msg = toArray.apply(null, arguments).join(" ");

        this.logger.error(msg, additional);

        if (msg.indexOf("_processRequest - sendFunc")) {
            this.connection._proto._hitError(0);
        }
    };
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
     * @param eventData {Object}
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
        if (message.getAttribute('from') === self.getJid()) {
            eventData['myOwn'] = true;
        }
        else if (
            message.getAttribute('from').indexOf("conference.") !== -1 &&
            message.getAttribute('from').split("/")[1] === self.getNickname()
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

        // TODO: remove $
        var jsonData = $('json', message);
        if (jsonData.size() > 0) {
            eventData['meta'] = JSON.parse(jsonData[0].childNodes[0].data);
        }

        var errors = message.getElementsByTagName("error");
        if (errors.length > 0) {
            eventData['error'] = errors[0].childNodes[0].tagName.toLowerCase();
        }


        // x handling
        if (x.length > 0 && x[0].getAttribute('xmlns') === 'http://jabber.org/protocol/muc#user') {
            eventData['roomJid'] = eventData['from'].split("/")[0];

            // copy please!
            var users = $.extend(true, {}, self.getMeta('rooms', eventData['roomJid'], 'users', {}));
            eventData['currentUsers'] = clone(users);

            var newUsers = {};
            var leftUsers = {};

            $.each(x, function(ii, _x) {
                $.each(_x.getElementsByTagName("item"), function(i, item) {
                    var role = item.getAttribute('role');
                    var jid = item.getAttribute('jid') ?
                                    item.getAttribute('jid') :
                                    Karere.getNormalizedFullJid(item.parentNode.parentNode.getAttribute("from"));

                    assert(jid, "invalid jid found in <presence><x/></presence> stanza.");

                    if (role !== "unavailable" && role !== "none") {
                        if (!users[jid]) {
                            newUsers[jid] = role;
                        }
                        users[jid] = role;

                    }
                    else { // left/kicked
                        delete users[jid];
                        delete newUsers[jid];
                        leftUsers[jid] = true;
                    }
                });
            });
            eventData['currentUsers'] = users;




            if (Object.keys(newUsers).length > 0) {
                eventData['newUsers'] = newUsers;
                self._triggerEvent("UsersJoined", new KarereEventObjects.UsersJoined(
                    eventData.from,
                    eventData.to,
                    eventData.roomJid,
                    eventData.currentUsers,
                    eventData.newUsers
                ));
            }
            if (Object.keys(leftUsers).length > 0) {
                eventData['leftUsers'] = leftUsers;
                self._triggerEvent("UsersLeft", new KarereEventObjects.UsersLeft(
                    eventData.from,
                    eventData.to,
                    eventData.roomJid,
                    eventData.currentUsers,
                    eventData.leftUsers
                ));
            }

            // TODO: remove $
            if ($('status[code="110"]', x).size() === 1) {
                self._triggerEvent("UsersUpdatedDone", new KarereEventObjects.UsersUpdated(
                    eventData.from,
                    eventData.to,
                    eventData.roomJid,
                    eventData.currentUsers,
                    eventData.newUsers,
                    eventData.leftUsers
                ));
            }
        }
        // end of x handling


        if (message.tagName.toLowerCase() === "message") {
            // self.logger.warn(self.getNickname(), "Message: ", _type);

            var elems = message.getElementsByTagName('body');

            if (from.indexOf(self.options.mucDomain) !== -1) {
                eventData['roomJid'] = from.split("/")[0];
            }
            else if (to.indexOf(self.options.mucDomain) !== -1) {
                eventData['roomJid'] = to.split("/")[0];
            }

            stanzaType = "Message";
            eventData['from'] = from;
            eventData['to'] = to;
            eventData['rawType'] = _type;
            eventData['type'] = stanzaType;
            eventData['elems'] = elems;
            eventData['rawMessage'] = message;

            if (_type === "action" || (_type === "groupchat" && eventData.meta && eventData.meta.action)) {
                self._triggerEvent("ActionMessage", eventData);
                return true;
            }
            else if (_type === "chat" && elems.length > 0) {
                stanzaType = "PrivateMessage";


                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */

                // if not...set the message property
                // TODO: remove $
                eventData['message'] = $('messageContents', elems[0]).text();

                // is this a forwarded message? if yes, trigger event only for that
                // TODO: remove $
                if ($('forwarded', message).size() > 0) {
                    // TODO: remove $
                    $('forwarded', message).each(function(k, v) {
                        // TODO: remove $
                        self._onIncomingStanza($('message', v)[0], {
                            'isForwarded': true,
                            'delay': $('delay', v).attr('stamp') ?
                                        Date.parse($('delay', v).attr('stamp')) / 1000 :
                                        undefined,
                            'sent-stamp': $('delay', v).attr('sent-stmap') ?
                                            Date.parse($('delay', v).attr('sent-stamp')) / 1000 :
                                            undefined
                        });
                    });


                    // stop
                    return true;
                }
            }
            else if (_type === "groupchat") {
                stanzaType = "ChatMessage";

                // TODO: remove $

                eventData['message'] = $('messageContents', elems[0]).text();

                // TODO: remove $
                // is this a forwarded message? if yes, trigger event only for that
                if ($('forwarded', message).size() > 0) {
                    $('forwarded', message).each(function(k, v) {
                        self._onIncomingStanza($('message', v)[0], {
                            'isForwarded': true,
                            'delay': $('delay', v).attr('stamp') ?
                                        Date.parse($('delay', v).attr('stamp')) / 1000 :
                                        undefined,
                            'sent-stamp': $('delay', v).attr('sent-stmap') ?
                                            Date.parse($('delay', v).attr('sent-stamp')) / 1000 :
                                            undefined
                        });
                    });


                    // stop
                    return true;
                }
                if (
                    !eventData.id &&
                    !eventData.message &&
                    eventData.from.split("/").length === 1 /* e.g. no resource in the from jid */
                ) {
                    // system type of message
                    return true; // stop!
                }

                /**
                 * XXX: check the message, maybe this is an OTR req?
                 */


            }
            else if (!_type && message.getElementsByTagName("event").length > 0) {
                stanzaType = "EventMessage";
            }
            else if (x.length > 0 && x[0].getAttribute("xmlns") === "jabber:x:conference") {
                stanzaType = "InviteMessage";
                eventData['room'] = x[0].getAttribute("jid");
                eventData['password'] = x[0].getAttribute("password");

                self.setMeta("rooms", eventData['room'], 'password', eventData['password']);

                self.logger.warn(self.getNickname(), "Got invited to join room: ", eventData['room']);

                if (!self._triggerEvent("InviteMessage", eventData)) { // stop auto join by event prop. ?
                    return true;
                }
                else {
                    // noinspection JSUnresolvedVariable
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
            }
            else if (_type) {
                stanzaType = _type.substr(0, 1).toUpperCase() + _type.substr(1) + "Message";
            }
            else {
                stanzaType = "UnknownMessage";
            }
        }
        else if (message.tagName === "presence") {
            stanzaType = "Presence";

            var show = message.getElementsByTagName("show");
            if (show.length > 0) {
                // TODO: remove $
                eventData['show'] = $(show[0]).text();
            }
            else if (show.length === 0 && message.getAttribute('type')) {
                eventData['show'] = message.getAttribute('type');
            }

            var status = message.getElementsByTagName("status");
            if (status.length > 0) {
                // TODO: remove $
                eventData['status'] = $(status[0]).text();
            }

            if (typeof eventData['show'] === "undefined" && typeof eventData['status'] === "undefined") {
                // is handled in the onPresence in Karere
            }

            var delay = message.getElementsByTagName("delay");
            if (delay.length > 0) {
                var stamp = delay[0].getAttribute('stamp');
                var d = Date.parse(stamp);
                eventData.delay = d / 1000;

                // TODO: remove $
                eventData['sent-stamp'] = $('delay', message).attr('sent-stamp') ?
                                            Date.parse($('delay', message).attr('sent-stamp')) / 1000 :
                                            undefined;
            }

            if (eventData['show'] === 'error') {
                stanzaType = 'PresenceError';
            }
        }
        else {
            self.logger.debug("Unknown stanza type: ", message.innerHTML);

            eventData['unknown'] = true;
            eventData['tag'] = message.tagName;
        }



        if (message.getElementsByTagName("error").length > 0) {
            return true;
        }
        // XEP-0085 - Chat State Notifications
        // Because they can be embedded into other tags, we will trigger one additional event here...and if some of the
        // event handlers tried to stop the propagation, then we will stop the on$StanzaType triggering.
        else if (message.getElementsByTagName("active").length > 0) {
            if (!self._triggerEvent("ActiveMessage", eventData)) {
                return true;  // always return true, because of how Strophe.js handlers work.
            }
        }
        else if (message.getElementsByTagName("paused").length > 0) {
            if (!self._triggerEvent("PausedMessage", eventData)) {
                return true; // always return true, because of how Strophe.js handlers work.
            }
        }
        else if (message.getElementsByTagName("composing").length > 0) {
            var composingTag = message.getElementsByTagName("composing")[0];
            if (composingTag.parentNode.type !== "error") {
                if (!self._triggerEvent("ComposingMessage", eventData)) {
                    return true; // always return true, because of how Strophe.js handlers work.
                }
            }
            else {
                // do nothing on error
                return true;
            }
        }


        self._triggerEvent(stanzaType, eventData);

        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    };

    /**
     * Handler for IQs
     *
     * @param message
     * @private
     */
    Karere.prototype._onIncomingIq = function(message) {
        var self = this;
        // TODO: remove $
        var $message = $(message);

        if ($message.attr("type") === "result") {
            var reqType = self._iqRequests[$message.attr('id')];
            if (reqType) {
                self._triggerEvent(reqType, {
                    fromJid: $message.attr('from'),
                    toJid: $message.attr('to'),
                    messageId: $message.attr('id'),
                    rawMessage: message
                });
            }
        }
        else if ($message.attr("type") === "get") {
            // TODO: remove $
            if ($('ping', $message).size() > 0) {
                self._triggerEvent("PingRequest", {
                    fromJid: $message.attr('from'),
                    toJid: $message.attr('to'),
                    messageId: $message.attr('id')
                });
            }
        }
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


        if (eventData['rawMessage'] && eventData['rawMessage'].getElementsByTagName("delay").length > 0) {
            var delay = eventData['rawMessage'].getElementsByTagName("delay");
            if (delay.length > 0) {
                // relative stamp
                var stamp = delay[0].getAttribute('stamp');
                var d = Date.parse(stamp);

                if (delay[0].getAttribute('sent-stamp')) {
                    var sentStamp = delay[0].getAttribute('sent-stamp');
                    var d2 = Date.parse(sentStamp);

                    eventData.delay = (unixtime() - (d2 / 1000 - d / 1000));
                }
                else {
                    eventData.delay = d / 1000;
                }
            }
        }

        if (stanzaType === "ActionMessage" && self._triggeredActions[eventData.id]) {
            self.logger.debug(
                self.getNickname(),
                "Ignoring Event (action with this id was already triggered/processed) for: ",
                stanzaType,
                "with event data:",
                eventData
            );

            return false;
        }
        var targetedTypeEvent = new $.Event("on" + stanzaType);

        self.logger.debug(self.getNickname(), "Triggering Event for: ", stanzaType, "with event data:", eventData);


        var eventDataObject = null;
        if (stanzaType === "ChatMessage") {
            /**
             *
             * @type {KarereEventObjects.IncomingMessage}
             */
            eventDataObject = new KarereEventObjects.IncomingMessage(
                eventData.to,
                eventData.from,
                eventData.type,
                eventData.rawType,
                eventData.id,
                eventData.rawMessage,
                eventData.roomJid,
                eventData.meta,
                eventData.message,
                eventData.elements,
                eventData.delay
            );
        }
        else if (stanzaType === "PrivateMessage") {
            eventDataObject = new KarereEventObjects.IncomingPrivateMessage(
                eventData.to,
                eventData.from,
                eventData.type,
                eventData.rawType,
                eventData.id,
                eventData.rawMessage,
                eventData.meta,
                eventData.message,
                eventData.elements,
                eventData.delay
            );
        }
        else if (stanzaType === "Presence") {
            eventDataObject = new KarereEventObjects.Presence(
                eventData.to,
                eventData.from,
                eventData.show,
                eventData.status,
                eventData.rawType,
                eventData.delay
            );
        }
        else if (stanzaType === "ActiveMessage") {
            eventDataObject = new KarereEventObjects.StateActiveMessage(
                eventData.to,
                eventData.from,
                eventData.roomJid,
                eventData.delay
            );
        }
        else if (stanzaType === "ComposingMessage") {
            eventDataObject = new KarereEventObjects.StateComposingMessage(
                eventData.to,
                eventData.from,
                eventData.roomJid,
                eventData.delay
            );
        }
        else if (stanzaType === "PausedMessage") {
            eventDataObject = new KarereEventObjects.StateComposingMessage(
                eventData.to,
                eventData.from,
                eventData.roomJid,
                eventData.delay
            );
        }
        else if (stanzaType === "InviteMessage") {
            eventDataObject = new KarereEventObjects.InviteMessage(
                eventData.to,
                eventData.from,
                eventData.room,
                eventData.password,
                eventData.meta,
                eventData.delay
            );
        }
        else if (stanzaType === "ActionMessage") {
            self._triggeredActions[eventData.id] = true;

            setTimeout(function() {
                delete self._triggeredActions[eventData.id];
            }, self.options.actionMessageTriggerRegistryExpiration);

            eventDataObject = new KarereEventObjects.ActionMessage(
                eventData.to,
                eventData.from,
                eventData.id,
                eventData.meta.action,
                eventData.meta,
                eventData.delay
            );
        }
        else if (stanzaType === "PingRequest") {
            eventDataObject = new KarereEventObjects.PingRequest(
                eventData.toJid,
                eventData.fromJid,
                eventData.messageId
            );

            self.logger.debug("Got PingRequest", stanzaType, eventDataObject);

        }
        else if (stanzaType === "PingResponse") {
            eventDataObject = new KarereEventObjects.PingResponse(
                eventData.toJid,
                eventData.fromJid,
                eventData.messageId
            );

            self.logger.debug("Got PingResponse", stanzaType, eventDataObject);

        }
        else {
            eventDataObject = eventData;
            if ($.isPlainObject(eventDataObject)) {
/*          this warning is generated for every stanza handled by rtcSession, so
            disable it to avoid flooding the log with warnings

                  self.logger.warn(
                    "Karere will not handle incoming message type of type: ",
                    stanzaType,
                    ", with eventData:",
                    eventData,
                    ", so it should be handled by directly using Strophe.js's API."
                );
*/
            }

            // throw new Error("Don't know how to convert event of type: " + stanzaType + " to EventObject");
        }

        try {
            /**
             * Strophe will remove this handler if it raises an exception... so we need to be sure that our attached
             * handlers WOULD NEVER throw an exception.
             */
            self.trigger(
                targetedTypeEvent,
                [
                    eventDataObject,
                    self
                ]
            );
        } catch (e) {
            self.logger.error('ERROR: ' + (e.stack ? e.stack : e));
        }

        // if none of the handlers have not stopped the event propagation, trigger a more generic event.
        if (!targetedTypeEvent.isPropagationStopped()) {
            return true;
        }
        else {
            return false;
        }
    };
}



/**
 * Presence impl.
 */
{
    /**
     * Change the currently logged in user presence
     *
     * @param [presence] {Karere.PRESENCE}
     * @param [status]
     * @param [delay] Number unix timestamp that should be used for sending a urn:xmpp:delay w/ the presence stanza
     */
    Karere.prototype.setPresence = function(presence, status, delay) {
        var self = this;

        presence = presence || "chat";
        status = status || "";
        delay = delay ? parseFloat(delay) : undefined;



        self._myPresence = presence;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            var msg = $pres({id: self.generateMessageId("presence", status)})
                .c("show")
                .t(presence)
                .up()
                .c("status")
                .t(status ? status : presence)
                .up();

            if (delay) {
                msg = msg
                    .c("delay", {
                        'xmlns': 'urn:xmpp:delay',
                        'stamp': (new Date(delay * 1000).toISOString()),
                        'sent-stamp': (new Date(unixtime() * 1000).toISOString()),
                        'from': self.getJid()
                    })
                .up();
            }

            self._presenceCache[self.getJid()] = presence;
            self._presenceBareCache[self.getBareJid()] = presence;

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

        if (jid.indexOf("/") !== -1) { // found full jid
            return self._presenceCache[jid] ? self._presenceCache[jid] : false;
        }
        else { // found bare jid
            var result = false;
            var bareJid = Karere.getNormalizedBareJid(jid);
            return self._presenceBareCache[bareJid];
        }
    };
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

        return self.sendRawMessage(toJid, toJid.indexOf("conference.") === -1 ? "chat" : "groupchat", Karere._$chatState('composing'));
    };

    /**
     * Send Composing stopped/paused chat state
     *
     * @param toJid
     * @returns {*}
     */
    Karere.prototype.sendComposingPaused = function(toJid) {
        var self = this;
        return self.sendRawMessage(
            toJid,
            toJid.indexOf("conference.") === -1 ? "chat" : "groupchat",
            Karere._$chatState('paused')
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
        return self.sendRawMessage(
            toJid,
            toJid.indexOf("conference.") === -1 ? "chat" : "groupchat",
            Karere._$chatState('active')
        );
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
     * @param contents {String|Element} content of the messages
     * @param [meta] {Object} pass optional meta object, that should be serialized and sent w/ the message
     * @param [messageId] {string} specify your own message id (if needed)
     * @param [delay] {Number} use this to specify the urn:xmpp:delay value that is going to be sent w/ the message
     */
    Karere.prototype.sendRawMessage = function (toJid, type, contents, meta, messageId, delay) {
        var self = this;

        meta = meta || {};
        type = type || "chat";

        var strContents = contents instanceof Strophe.Builder ? contents.toString() : contents;

        messageId = messageId || self.generateMessageId(toJid, JSON.stringify([type, strContents, meta]));

        var outgoingMessage = new KarereEventObjects.OutgoingMessage(
            toJid,
            self.getJid(),
            type,
            messageId,
            contents,
            meta,
            delay,
            KarereEventObjects.OutgoingMessage.STATE.NOT_SENT,
            type === "groupchat" ? Karere.getNormalizedBareJid(toJid) : undefined
        );

        var event = new $.Event("onOutgoingMessage");
        self.trigger(
            event,
            [
                outgoingMessage,
                self
            ]
        );
        if (event.isPropagationStopped()) {
            self.logger.warn("Event propagation stopped sending of message: ", outgoingMessage);

            return messageId;
        }

        var message = $msg({
            from: self.connection.jid,
            to: outgoingMessage.getToJid(),
            type: outgoingMessage.getType(),
            id: outgoingMessage.getMessageId()
        });

        if (outgoingMessage.getContents().toUpperCase) { // is string (better way?)
            message
                .c('body')
                .c('messageContents')
                .t(outgoingMessage.getContents())
                .up()
                .c('active', {'xmlns': 'http://jabber.org/protocol/chatstates'});
        }
        else {
            message
                .node.appendChild(outgoingMessage.getContents().tree())
        }

        if (Object.keys(outgoingMessage.getMeta()).length > 0) {
            var json = Strophe.xmlHtmlNode("<json><\/json>").childNodes[0];
            json.textContent = JSON.stringify(outgoingMessage.getMeta());

            // TODO: remove $
            var $body = $('body', message.nodeTree);
            if ($body[0]) {
                $body[0].appendChild(
                    json
                );
            }
            else {
                assert(false, 'missing <body></body>');
            }
        }

        if (outgoingMessage.getDelay() && outgoingMessage.getDelay() > 0) {
            // TODO: remove $
            var $delay = $("<delay><\/delay>");
            $delay.attr('xmlns', 'urn:xmpp:delay');
            $delay.attr('from', self.getJid());
            $delay.attr('stamp', (new Date(outgoingMessage.getDelay() * 1000).toISOString()));

            // XX: use different place to store the sent-stamp? this is totally not following the XMPP protocol.
            $delay.attr('sent-stamp', (new Date(unixtime() * 1000).toISOString()));

            message.nodeTree.appendChild(
                $delay[0]
            );
        }

        self.connection.send(message);
        // self.connection.send(forwarded);

        // noinspection JSUnresolvedVariable
        self.logger.debug(self.getNickname(), "sending message w/ id", outgoingMessage);

        return outgoingMessage.getMessageId();
    };

    /**
     * Simple method of sending actions (message that have a predefined action (string) and optionally meta)
     *
     * @param toJid
     * @param action
     * @param [meta]
     * @returns {*}
     */
    Karere.prototype.sendAction = function(toJid, action, meta, messageId) {
        if (toJid.indexOf("conference.") !== -1) {
            return this.sendRawMessage(
                toJid,
                "groupchat",
                "",
                $.extend(
                    true,
                    {},
                    meta,
                    {'action': action}
                ),
                messageId
            );
        }
        else {
            return this.sendRawMessage(
                toJid,
                "action",
                "",
                $.extend(
                    true,
                    {},
                    meta,
                    {'action': action}
                ),
                messageId
            );
        }
    };

    /**
     * Generates room config XML from the self.options.roomConfig to be used and sent as stanza when creating new rooms
     *
     * @param roomPassword
     * @returns {Array}
     * @private
     */
    Karere.prototype._getRoomConfig = function(roomPassword) {
        var self = this;

        var elements = [];

        var _toDomElement = function(s) {
            return $.parseXML(s).documentElement;
        };

        elements.push(
            _toDomElement(
                "<field var='FORM_TYPE'>" +
                    "<value>http://jabber.org/protocol/muc#roomconfig<\/value>" +
                "<\/field>"
            )
        );

        var configDict = $.extend({}, self.options.roomConfig, {
            "muc#roomconfig_roomsecret": roomPassword ? roomPassword : ""
        });

        $.each(Object.keys(configDict), function(i, k) {

            elements.push(
                _toDomElement(
                    "<field var='" + k + "'>" +
                        "<value>" + configDict[k] + "<\/value>" +
                    "<\/field>"
                )
            );
        });


        elements.push(_toDomElement("<field var='muc#roomconfig_captcha_whitelist'/>"));

        return elements;
    };

    /**
     * Start/create new chat, wait for the room creations, send invites and wait for all users to join.
     *
     * @param jidList {Array} of jids to be invited to the chat
     * @param [type] {string} private/group, by default its "private"
     * @param [roomName] {string} optionally, you can set your own room name
     * @returns {Deferred}
     */
    Karere.prototype.startChat = function(jidList, type, roomName, password) {
        var self = this;

        type = type || "private";
        roomName = roomName || self._generateNewRoomIdx();

        var $promise = new MegaPromise();


        var roomPassword;
        if (password === false) {
            roomPassword = "";
        }
        else if (password !== undefined) {
            roomPassword = password;
        }
        else {
            roomPassword = self._generateNewRoomPassword();
        }
        var roomJid = roomName + "@" + self.options.mucDomain;

        self.setMeta("rooms", roomJid, 'password', roomPassword);
        self.setMeta("rooms", roomJid, 'type', type);

        self.connection.muc.join(roomJid, self.getNickname(), undefined, undefined, undefined, roomPassword, undefined);

        var iHadJoinedPromise = self.waitForUserToJoin(roomJid, self.getJid());

        iHadJoinedPromise
            .done(function() {

                if (typeof Form === "undefined") {
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
                                $promise.reject(toArray.apply(null, arguments));
                            });
                    }),
                    Karere._exceptionSafeProxy(function() {
                        $promise.reject();
                    })
                );


                if (window.Form._do_cleanup) {
                    delete window.Form;
                }
            })
            .fail(function() {
                self.logger.warn("Could not join my newly created room.");

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

        var $promise = new MegaPromise();
        var generatedEventName = generateEventSuffixFromArguments(
                                    "onUsers" + eventName,
                                    "inv",
                                    roomJid,
                                    userJid,
                                    self._generateNewIdx()
                                );

        var waitCacheKey = eventName + "_" + roomJid + "_" + userJid;

        if (self._waitForPresenceCache[waitCacheKey]) {
            return self._waitForPresenceCache[waitCacheKey];
        }

        self.logger.warn(
            self.getNickname(),
            (new Date()),
            "Starting to wait for user to" + (eventName === "Joined" ? "join" : "leave") + ": ",
            userJid,
            "event idx:",
            generatedEventName
        );


        var joinedTimeout = setTimeout(function() {
            if (self.userExistsInChat(roomJid, userJid)) {
                self.logger.warn(self.getNickname(), "User " + eventName + ": ", roomJid, userJid);

                self.unbind(generatedEventName);
                clearTimeout(joinedTimeout);

                $promise.resolve(
                    roomJid, userJid
                );
            }
            else {
                self.logger.warn(
                    self.getNickname(),
                    (new Date()),
                    "Timeout waiting for user to " + (eventName === "Joined" ? "join" : "leave") + ": ",
                    userJid
                );

                self.unbind(generatedEventName);
                $promise.reject(roomJid, userJid);
            }
        }, self.options.waitForUserPresenceInRoomTimeout);

        var searchKey = eventName === "Joined" ? "newUsers" : "leftUsers";

        self.bind(generatedEventName, function(e, eventObject) {
            var joined = false;

            self.logger.debug("_waitForUserPresenceInRoom: ", eventName, roomJid, userJid, eventObject[searchKey]);

            if (eventObject.getFromJid().split("/")[0] !== roomJid) {
                return;
            }

            if (userJid.indexOf("/") === -1) { // bare jid
                // search for $userJid/
                // noinspection FunctionWithInconsistentReturnsJS
                $.each(eventObject[searchKey], function(k) {
                    if (k.indexOf(userJid + "/") !== -1) {
                        joined = true;
                        return false; // break;
                    }
                });
            }
            else { // full jid
                if (eventObject[searchKey][userJid]) {
                    joined = true;
                }
            }


            if (joined) {
                self.logger.warn(self.getNickname(), "User " + eventName + ": ", roomJid, userJid);

                self.unbind(generatedEventName);
                clearTimeout(joinedTimeout);

                $promise.resolve(
                    roomJid, userJid
                );
            }
        });



        self._waitForPresenceCache[waitCacheKey] = $promise;

        $promise.always(function() {
            // cleanup
            delete self._waitForPresenceCache[waitCacheKey];
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
     * @param [exitMessage] {string} optional
     * @returns {Deferred}
     */
    Karere.prototype.leaveChat = function(roomJid, exitMessage) {
        var self = this;

        var $promise = new MegaPromise();

        self.connection.muc.leave(
            roomJid,
            undefined,
            Karere._exceptionSafeProxy(function() {
                self.clearMeta('rooms', roomJid);

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
     * @param [password] {string} if not passed, Karere will lookup the local cache to use the password stored when
     * joining or creating the room was used.
     *
     * @param [type] {string} by default = "private"
     * @param [meta] {Object} by default = {}
     * @returns {Deferred}
     */
    Karere.prototype.addUserToChat = function(roomJid, userJid, password, type, meta) {
        var self = this;

        type = type || "private";
        meta = meta || {};

        if (!password && self.getMeta("rooms", roomJid, 'password')) {
            password = self.getMeta("rooms", roomJid, 'password');
        }
        type = type || self.getMeta("rooms", roomJid, 'type');

        var $promise = self.waitForUserToJoin(roomJid, userJid);

        // self.connection.muc.directInvite(roomJid, userJid, undefined, password);

        if (self.options.roomConfig["muc#roomconfig_membersonly"] === 1) {
            // grant membership
            //        <iq from='crone1@shakespeare.lit/desktop'
            //        id='member1'
            //        to='coven@chat.shakespeare.lit'
            //        type='set'>
            //            <query xmlns='http://jabber.org/protocol/muc#admin'>
            //                <item affiliation='member'
            //                jid='hag66@shakespeare.lit'
            //                nick='thirdwitch'/>
            //            </query>
            //        </iq>

            var $grantMembershipIQ = $iq({
                from: self.getJid(),
                id: self.connection.getUniqueId(),
                to: roomJid,
                type: "set"
            })
                .c("query", {
                    'xmlns': 'http://jabber.org/protocol/muc#admin'
                })
                    .c("item", {
                        affiliation: self.options.newUsersAffiliation,
                        jid: Strophe.getBareJidFromJid(userJid)
                    });


            self.connection.send($grantMembershipIQ);
        }

        // construct directInvite (fork of muc.directInvite, so that we can add extra type arguments)
        var attrs;
        var invitation;
        var msgid;

        msgid = self.connection.getUniqueId();
        attrs = {
            xmlns: 'jabber:x:conference',
            jid: roomJid
        };

        if (password) {
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

        self.logger.warn(self.getNickname(), "Inviting: ", userJid, "to", roomJid, "with password", password);

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

        var $promise = new MegaPromise();
        var nickname = false;

        if (!self.connection.muc.rooms[roomJid] || !self.connection.muc.rooms[roomJid].roster) {
            $promise.reject("Room user list is currently not available.");
            return $promise;
        }
        // noinspection FunctionWithInconsistentReturnsJS
        $.each(self.connection.muc.rooms[roomJid].roster, function(_nick, item) {
            if (item.jid === userJid) {
                nickname = _nick;
                return false; // break.
            }
        });

        self.logger.warn(self.getNickname(), "Removing user: ", userJid, "from chat", roomJid);

        if (!nickname) {
            $promise.reject(
                'User not found for jid: ' + userJid
            );
        }
        else {
            // pair/proxy the waitForUserToLeave w/ the returned promise, so that it will be resolved only
            // when the user is actually out of the chat room.
            self.waitForUserToLeave(roomJid, userJid)
                .done(function() {
                    $promise.resolve();
                })
                .fail(function() {
                    $promise.reject();
                });

            if (self.options.roomConfig["muc#roomconfig_membersonly"] === 1) {
                var $grantMembershipIQ = $iq({
                    from: self.getJid(),
                    id: self.connection.getUniqueId(),
                    to: roomJid,
                    type: "set"
                })
                    .c("query", {
                        'xmlns': 'http://jabber.org/protocol/muc#admin'
                    })
                    .c("item", {
                        affiliation: "member",
                        jid: Strophe.getBareJidFromJid(userJid)
                    });


                self.connection.send($grantMembershipIQ);
            }

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

    /**
     * Get an ordered list of users in chat (ordered by joining time)
     *
     * @param roomJid
     * @returns {*}
     */
    Karere.prototype.getOrderedUsersInChat = function(roomJid) {
        var self = this;
        var users = self.getMeta('rooms', roomJid, 'orderedUsers', []);
        return users.slice(); /* ALWAYS return a copy of the array...its dangerous to work with arrays directly */
    };

    /**
     * Check if user exists in a chat room (MUC)
     *
     * @param roomJid {string} full room JID
     * @param userJid {string} must be full JID
     * @returns {boolean}
     */
    Karere.prototype.userExistsInChat = function(roomJid, userJid) {
        var self = this;
        var users = self.getUsersInChat(roomJid);

        return users.hasOwnProperty(userJid);
    };

    /**
     * Join XMPP MUC
     *
     * @param roomJid {string}
     * @param [password] {string}
     * @returns {Deferred}
     */
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
    };


    /**
     * Send and process a request/response to fullJid for disco capabilities
     *
     * @param fullJid
     * @private
     */
    Karere.prototype._requestDiscoCapabilities = function(fullJid) {
        var self = this;
        var meta = $.extend({}, self.options.defaultCapabilities);

        self.connection.disco.info(fullJid, function(response) {
            // TODO: remove $
            meta['audio'] = $('feature[var="urn:xmpp:jingle:apps:rtp:audio"]', response).size() > 0;
            meta['video'] = $('feature[var="urn:xmpp:jingle:apps:rtp:video"]', response).size() > 0;
            meta['karere'] = $('feature[var="karere"]', response).size() > 0;
            meta['ping'] = $('feature[var="urn:xmpp:ping"]', response).size() > 0;

            self._discoCache[fullJid] = meta;

            self._reindexDiscoBareCapabilities(fullJid);
        });
    };


    /**
     * This method will go thru all resources based on `fullJid` and generate a index
     * of all features available across them
     *
     * @param fullJid
     * @private
     */
    Karere.prototype._reindexDiscoBareCapabilities = function(fullJid) {
        var self = this;

        var bareJid = Karere.getNormalizedBareJid(fullJid);

        if (!self._discoBareCache[bareJid]) {
            self._discoBareCache[bareJid] = $.extend({}, self.options.defaultCapabilities);
        }

        // merge only `true` values
        $.each(self._discoCache, function(fJid, meta) {
            if (fJid.indexOf(bareJid) === 0) {
                $.each(meta, function(k, capable) {
                    if (capable && !self._discoBareCache[bareJid][k]) {
                        self._discoBareCache[bareJid][k] = capable; // true
                    }
                });
            }
        });
        self.trigger('onDiscoCapabilities', [
            new KarereEventObjects.DiscoCapabilities(
                fullJid,
                bareJid,
                self._discoBareCache[bareJid]
            )
        ]);
    };


    /**
     * Retrieve cached capabilities for user with jid = `jid`
     * If a bare jid is passed, the result will be a merged list of all user's devices/resources
     * and their capabilities combined in
     *
     * @param jid can be full jid or a bare jid
     * @returns {*}
     */
    Karere.prototype.getCapabilities = function(jid) {
        var self = this;

        if (jid.indexOf("/") === -1) {
            return self._discoBareCache[jid];
        }
        else {
            return self._discoCache[jid];
        }
    };


    /**
     * Send ping
     *
     * @param targetFullUserJid
     */
    Karere.prototype.sendPing = function(targetFullUserJid) {
        var self = this;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            if (!self._pingRequests) {
                self._pingRequests = {};
            }
            self._pingRequests[targetFullUserJid] = true;

            var evtName = generateEventSuffixFromArguments("onPingResponse", "respWait", targetFullUserJid);

            var gotResponse = false;

            self.bind(evtName, function(e, eventObject) {
                if (eventObject.getFromJid() === targetFullUserJid) {
                    gotResponse = true;
                }
            });

            var messageId = self.generateMessageId(targetFullUserJid, "ping");

            var msg = $iq({
                from: self.getJid(),
                to: targetFullUserJid,
                type: "get",
                id: messageId
            }).c("ping", {
                'xmlns': 'urn:xmpp:ping'
            });
            self._iqRequests[messageId] = "PingResponse";

            self.connection.send(
                msg.tree()
            );

            return createTimeoutPromise(function() {
                return gotResponse;
            }, 133, self.options.pingTimeout, targetFullUserJid).always(function() {
                // cleanup
                self.unbind(evtName);
            });
        }
    };

    /**
     * Send server ping
     */
    Karere.prototype.sendServerPing = function() {
        var self = this;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            if (!self._serverPingRequests) {
                self._serverPingRequests = {};
            }

            var messageId = (
                self.generateMessageId("server", "ping").substr(-3) + Math.ceil(rand_range(0, 1000))
            ).replace(".", "");

            self._serverPingRequests[messageId] = true;

            var evtName = generateEventSuffixFromArguments("onServerPingResponse", "respWait", messageId);

            var gotResponse = false;

            self.bind(evtName, function(e, eventObject) {
                if (eventObject.messageId === messageId) {
                    gotResponse = true;
                }
            });


            var msg = $iq({
                type: "get",
                id: messageId
            }).c("ping", {
                'xmlns': 'urn:xmpp:ping'
            });
            self._iqRequests[messageId] = "ServerPingResponse";

            self.connection.send(
                msg.tree()
            );

            return createTimeoutPromise(function() {
                return gotResponse;
            }, 133, self.options.serverPingTimeout, messageId).always(function() {
                // cleanup
                self.unbind(evtName);
            });
        }
    };


    /**
     * Send pong
     *
     * @param targetFullUserJid
     */
    Karere.prototype.sendPong = function(targetFullUserJid, messageId) {
        var self = this;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            if (!self._pingRequests) {
                self._pingRequests = {};
            }
            self._pingRequests[targetFullUserJid] = true;

            var msg = $iq({
                from: self.getJid(),
                to: targetFullUserJid,
                type: "result",
                id: messageId
            });

            self.connection.send(
                msg.tree()
            );
        }
    };



    Karere.prototype.subscribe = function(bareJid, name) {
        var self = this;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            var msg = $iq({
                id: self.generateMessageId(bareJid, "subscribe"),
                type: "set"
            })
                .c("query", {
                    'xmlns': 'jabber:iq:roster'
                })
                .c("item", {
                    jid: bareJid,
                    subscription: 'both',
                    name: name ? name : bareJid.split("@")[0]
                })
                .c("group")
                    .t(self.options.defaultRosterGroupName);

            self.connection.send(
                msg.tree()
            );

            // var msg2 = $pres({id: self.generateMessageId(), to: bareJid, type: "subscribe"});
            //
            // self.connection.send(
            //  msg2.tree()
            // );

        }
        else {
            self.logger.warn("Not connected");
        }
    };

    Karere.prototype.unsubscribe = function(bareJid, name) {
        var self = this;

        if (self.getConnectionState() === Karere.CONNECTION_STATE.CONNECTED) {
            var msg = $iq({
                id: self.generateMessageId(bareJid, "unsubscribe"),
                type: "set"
            })
                .c("query", {
                    'xmlns': 'jabber:iq:roster'
                })
                .c("item", {
                    jid: bareJid,
                    subscription: 'remove',
                    name: name ? name : bareJid.split("@")[0]
                })
                .c("group")
                    .t(self.options.defaultRosterGroupName);

            self.connection.send(
                msg.tree()
            );

            //  var msg2 = $pres({id: self.generateMessageId(), to: bareJid, type: "unsubscribe"});
            //
            //  self.connection.send(
            //      msg2.tree()
            //  );
        }
        else {
            self.logger.warn("Not connected");
        }
    };

    Karere.prototype.getMyPresence = function() {
        return this._myPresence;
    };
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
