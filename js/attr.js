/**
 * mega.attr.* related code
 */

var attribCache = false;

(function _userAttributeHandling(scope) {
    "use strict";

    var ns = {};
    var logger = MegaLogger.getLogger('account');
    var ATTRIB_CACHE_NON_CONTACT_EXP_TIME = 2 * 60 * 60;

    /**
     * Assemble property name on Mega API.
     *
     * @private
     * @param attribute {String}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @return {String}
     */
    var buildAttribute = ns._buildAttribute = function (attribute, pub, nonHistoric) {
        if (nonHistoric === true || nonHistoric === 1) {
            attribute = '!' + attribute;
        }

        if (pub === true || pub === undefined) {
            attribute = '+' + attribute;
        }
        else if (pub === -2) {
            attribute = '^' + attribute;
        }
        else if (pub !== -1) {
            attribute = '*' + attribute;
        }

        return attribute;
    };

    /**
     * Assemble property name for database.
     *
     * @private
     * @param userHandle {String}
     *     Mega's internal user handle.
     * @param attribute {String}
     *     Name of the attribute.
     * @return {String}
     */
    var buildCacheKey = ns._buildCacheKey = function(userHandle, attribute) {
        return userHandle + "_" + attribute;
    };

    /**
     * Retrieves a user attribute.
     *
     * @param userhandle {String}
     *     Mega's internal user handle.
     * @param attribute {String}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true). -1 for "system" attributes (e.g. without prefix)
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {Function}
     *     Callback function to call upon completion (default: none).
     * @param ctx {Object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.get = function _getUserAttribute(userhandle, attribute, pub, nonHistoric, callback, ctx) {
        assertUserHandle(userhandle);
        var self = this;

        var myCtx = ctx || {};

        // Assemble property name on Mega API.
        attribute = buildAttribute(attribute, pub, nonHistoric);

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();

        var cacheKey = buildCacheKey(userhandle, attribute);

        /**
         * mega.attr.get::settleFunctionDone
         *
         * Fullfill the promise with the result/attribute value from either API or cache.
         *
         * @param {Number|Object} res    The result/attribute value.
         * @param {Boolean} cached Whether it came from cache.
         */
        var settleFunctionDone = function _settleFunctionDone(res, cached) {
            var tag = cached ? 'Cached ' : '';
            res = Object(res).hasOwnProperty('av') ? res.av : res;

            // Another conditional, the result value may have been changed.
            if (typeof res !== 'number') {
                // Decrypt if it's a private attribute container.
                if (attribute.charAt(0) === '*') {
                    // legacy cache - already decrypted by tlv and stored decrypted?
                    res = mega.attr.handleLegacyCacheAndDecryption(res, thePromise, attribute);
                }

                if (d > 1 || is_karma) {
                    var loggerValueOutput = pub ? JSON.stringify(res) : '-- hidden --';
                    if (loggerValueOutput.length > 256) {
                        loggerValueOutput = loggerValueOutput.substr(0, 256) + '...';
                    }
                    logger.info(tag + 'Attribute "%s" for user "%s" is %s.',
                        attribute, userhandle, loggerValueOutput);
                }
                thePromise.resolve(res);
            }
            else {
                // Got back an error (a number).
                if (d > 1 || is_karma) {
                    logger.warn(tag + 'attribute "%s" for user "%s" could not be retrieved: %d!',
                        attribute, userhandle, res);
                }
                thePromise.reject(res);
            }

            // Finish off if we have a callback.
            if (callback) {
                callback(res, myCtx);
            }
        };

        /**
         * mega.attr.get::settleFunction
         *
         * Process result from `uga` API request, and cache it.
         *
         * @param {Number|Object} res The received result.
         */
        var settleFunction = function _settleFunction(res) {
            // Cache all returned values, except errors other than ENOENT
            if (typeof res !== 'number' || res === ENOENT) {
                var exp = 0;
                // Only add cache expiration for attributes of non-contacts, because
                // contact's attributes would be always in sync (using actionpackets)
                if (userhandle !== u_handle && (!M.u[userhandle] || M.u[userhandle].c !== 1)) {
                    exp = unixtime();
                }
                attribCache.setItem(cacheKey, JSON.stringify([res, exp]));

                if (res.v) {
                    self._versions[cacheKey] = res.v;
                }
            }

            settleFunctionDone(res);
        };


        // Assemble context for this async API request.
        myCtx.u = userhandle;
        myCtx.ua = attribute;
        myCtx.callback = settleFunction;

        /**
         * mega.attr.get::doApiReq
         *
         * Perform a `uga` API request If we are unable to retrieve the entry
         * from the cache. If a MegaPromise is passed as argument, we'll wait
         * for it to complete before firing the api rquest.
         *
         * settleFunction will be used to process the api result.
         *
         * @param {MegaPromise} promise Optional promise to wait for.
         */
        var doApiReq = function _doApiReq(promise) {
            if (promise instanceof MegaPromise) {
                promise.always(function() {
                    doApiReq();
                });
            }
            else {
                api_req({'a': 'uga', 'u': userhandle, 'ua': attribute, 'v': 1}, myCtx);
            }
        };

        // check the cache first!
        attribCache.getItem(cacheKey)
            .fail(doApiReq)
            .done(function __attribCacheGetDone(v) {
                var result;

                try {
                    var res = JSON.parse(v);

                    if ($.isArray(res)) {
                        var exp = res[1];

                        // Pick the cached entry as long it has no expiry or it hasn't expired
                        if (!exp || exp > (unixtime() - ATTRIB_CACHE_NON_CONTACT_EXP_TIME)) {
                            if (res[0].av) {
                                result = res[0].av;
                                if (res[0].v) {
                                    self._versions[cacheKey] = res[0].v;
                                }
                            }
                            else {
                                // legacy support, e.g. for cached attribute values
                                result = res[0];
                            }
                        }
                    }
                }
                catch (ex) {
                    logger.error(ex);
                }

                if (result === undefined) {
                    doApiReq(attribCache.removeItem(cacheKey));
                }
                else {
                    settleFunctionDone(result, true);
                }
            });

        return thePromise;
    };

    /**
     * Removes a user attribute for oneself.
     *
     * @param attribute {string}
     *     Name of the attribute.
     * @param pub {bool}
     *     True for public attributes (default: true).
     * @param nonHistoric {bool}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.remove = function _removeUserAttribute(attribute, pub, nonHistoric) {
        attribute = buildAttribute(attribute, pub, nonHistoric);
        var cacheKey = buildCacheKey(u_handle, attribute);
        var promise = new MegaPromise();

        attribCache.removeItem(cacheKey)
            .always(function() {
                api_req({'a': 'upr', 'ua': attribute}, {
                    callback: function(res) {
                        if (typeof res !== 'number' || res < 0) {
                            logger.warn('Error removing user attribute "%s", result: %s!', attribute, res);
                            promise.reject(res);
                        }
                        else {
                            logger.info('Removed user attribute "%s", result: ' + res, attribute);
                            promise.resolve();
                        }
                    }
                });
            });

        return promise;
    };

    /**
     * Stores a user attribute for oneself.
     *
     * @param attribute {string}
     *     Name of the attribute. The max length is 16 characters. Note that the
     *     * and ! characters may be added so usually you only have 14 to work with.
     * @param value {object}
     *     Value of the user attribute. Public properties are of type {string},
     *     private ones have to be an object with key/value pairs.
     * @param pub {bool}
     *     True for public attributes (default: true).
     * @param nonHistoric {bool}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {function}
     *     Callback function to call upon completion (default: none). This callback
     *     function expects two parameters: the attribute `name`, and its `value`.
     *     In case of an error, the `value` will be undefined.
     * @param ctx {object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @param mode {integer}
     *     Encryption mode. One of BLOCK_ENCRYPTION_SCHEME (default: AES_GCM_12_16).
     * @param useVersion {boolean|undefined}
     *     If true is passed, 'upv' would be used instead of 'up' (which means that conflict handlers and all
     *     versioning logic may be used for setting this attribute)
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.set = function _setUserAttribute(attribute, value, pub, nonHistoric, callback, ctx, mode, useVersion) {
        var self = this;

        var myCtx = ctx || {};

        var savedValue = value;

        // Prepare all data needed for the call on the Mega API.
        if (mode === undefined) {
            mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        }

        var attrName = attribute;

        attribute = buildAttribute(attribute, pub, nonHistoric);
        if (attribute[0] === '*') {
            // The value should be a key/value property container.
            // Let's encode and encrypt it.
            savedValue = base64urlencode(tlvstore.blockEncrypt(
                tlvstore.containerToTlvRecords(value), u_k, mode));
        }

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();

        var cacheKey = buildCacheKey(u_handle, attribute);

        // clear when the value is being sent to the API server, during that period
        // the value should be retrieved from the server, because of potential
        // race conditions
        attribCache.removeItem(cacheKey);

        var settleFunction = function(res) {
            if (typeof res !== 'number') {
                attribCache.setItem(cacheKey, JSON.stringify([{"av": savedValue, "v": res[attribute]}, 0]));
                delete self._versions[cacheKey];

                logger.info('Setting user attribute "'
                    + attribute + '", result: ' + res);
                thePromise.resolve(res);
            }
            else {
                if (res === EEXPIRED && useVersion) {
                    var conflictHandlerId = cacheKey.split("_")[1];

                    if (
                        !self._conflictHandlers[conflictHandlerId] ||
                        self._conflictHandlers[conflictHandlerId].length === 0
                    ) {
                        logger.error('Server returned version conflict for attribute "'
                            + attribute + '", result: ' + res + ', local version:', self._versions[cacheKey]);
                    }
                    else {
                        // ensure that this attr's value is not cached and up-to-date.
                        attribCache.removeItem(cacheKey);

                        self.get(
                            u_handle, attrName, pub, nonHistoric
                        )
                            .done(function(attrVal) {
                                var valObj = {
                                    'localValue': value,
                                    'remoteValue': attrVal,
                                    'mergedValue': value,
                                    'latestVersion': self._versions[cacheKey]
                                };

                                var matched = self._conflictHandlers[conflictHandlerId].some(function(cb, index) {
                                    return cb(valObj, index);
                                });

                                if (matched) {
                                    thePromise.linkDoneAndFailTo(
                                        self.set(
                                            attrName,
                                            valObj.mergedValue,
                                            pub,
                                            nonHistoric,
                                            callback,
                                            ctx,
                                            mode,
                                            useVersion
                                        )
                                    );
                                }

                            })
                            .fail(function(failResult) {
                                logger.error(
                                    "This should never happen:", attribute, res, failResult, self._versions[cacheKey]
                                );
                                thePromise.reject(failResult);
                            });
                    }

                }
                else {
                    logger.warn('Error setting user attribute "'
                        + attribute + '", result: ' + res + '!');
                    thePromise.reject(res);
                }
            }

            // Finish off if we have a callback.
            if (callback) {
                callback(res, myCtx);
            }
        };

        // Assemble context for this async API request.
        myCtx.ua = attribute;
        myCtx.callback = settleFunction;


        // Fire it off.
        var apiCall = {'a': 'up', 'i': requesti};

        if (useVersion) {
            var version = self._versions[cacheKey];

            apiCall['a'] = 'upv';
            if (version) {
                apiCall[attribute] = [
                    savedValue,
                    version
                ];

                api_req(apiCall, myCtx);
            }
            else {
                // retrieve version/data from cache or server?
                self.get(u_handle, attrName, pub, nonHistoric).always(function() {
                    version = self._versions[cacheKey];

                    apiCall['a'] = 'upv';
                    if (version) {
                        apiCall[attribute] = [
                            savedValue,
                            version
                        ];
                    }
                    else {
                        apiCall[attribute] = [
                            savedValue
                        ];
                    }
                    api_req(apiCall, myCtx);
                });

            }
        }
        else {
            apiCall[attribute] = savedValue;

            api_req(apiCall, myCtx);
        }


        return thePromise;
    };

    ns._versions = {};

    ns._conflictHandlers = {};
    ns.registerConflictHandler = function (attributeName, pub, nonHistoric, mergeFn) {
        var self = this;
        var attributeId = buildAttribute(attributeName, pub, nonHistoric);
        if (!self._conflictHandlers[attributeId]) {
            self._conflictHandlers[attributeId] = [];
        }

        self._conflictHandlers[attributeId].push(
            mergeFn
        );
    };

    ns.setArrayAttribute = function(attributeName, subkey, value, pub, nonHistoric) {
        var self = this;

        var proxyPromise = new MegaPromise();

        var _setArrayAttribute = function(r) {
            if (r === EINTERNAL) {
                r = {};
            }
            else if (typeof r === 'number') {
                logger.error("Found number value for attribute: ", attributeName, " when trying to use it as" +
                    "attribute array. Halting .setArrayAttribute");
                return MegaPromise.reject(r);
            }
            var arr = r ? r : {};
            arr[subkey] = value;
            var serializedValue = arr;

            proxyPromise.linkDoneAndFailTo(
                self.set(
                    attributeName,
                    serializedValue,
                    pub,
                    nonHistoric,
                    undefined,
                    undefined,
                    undefined,
                    true
                )
            );
        };

        self.get(u_handle, attributeName, pub, nonHistoric)
            .done(function(r) {
                if (r === -9) {
                    _setArrayAttribute({});
                    proxyPromise.reject(r);
                }
                else {
                    try {
                        _setArrayAttribute(r);
                    }
                    catch (e) {
                        proxyPromise.reject(e, r);
                    }
                }
            })
            .fail(function(r) {
                if (r === -9) {
                    _setArrayAttribute({});
                    proxyPromise.reject(r);
                }
                else {
                    proxyPromise.reject(r);
                }
            });

        return proxyPromise;
    };

    ns.getArrayAttribute = function(userId, attributeName, subkey, pub, nonHistoric) {
        var self = this;

        var proxyPromise = new MegaPromise();

        var $getPromise = self.get(userId, attributeName, pub, nonHistoric)
            .done(function(r) {
                try {
                    var arr = r ? r : {};
                    proxyPromise.resolve(
                        arr[subkey]
                    );
                }
                catch (e) {
                    proxyPromise.reject(e, r);
                }
            });

        proxyPromise.linkFailTo($getPromise);

        return proxyPromise;
    };


    ns.handleUserAttributeActionPackets = function(actionPacket, avatars) {
        var attrs = actionPacket.ua;
        var actionPacketUserId = actionPacket.u;

        for (var j in attrs) {
            if (attrs.hasOwnProperty(j)) {
                var attributeName = attrs[j];

                // fill version if missing
                mega.attr.handleVersionFromActionPacket(
                    actionPacketUserId,
                    attributeName,
                    actionPacket.v[j]
                );

                // handle avatar related action packets (e.g. avatar modified)
                if (attributeName === '+a') {
                    avatars.push(actionPacketUserId);
                }
                // handle firstname/lastname attributes
                else if (attributeName === 'firstname' || attributeName === 'lastname') {
                    attribCache.uaPacketParser(
                        attributeName,
                        actionPacketUserId,
                        true,
                        actionPacket.v && actionPacket.v[j] ? actionPacket.v[j] : undefined
                    );
                }
            }
        }
    };

    /**
     * Handle BitMap attributes
     *
     * @param attrName
     * @param version
     */
    ns.handleBitMapAttribute = function(attrName, version) {
        var attributeStringName = attrName.substr(2);
        var bitMapInstance = attribCache.bitMapsManager.get(attributeStringName);
        if (bitMapInstance.getVersion() !== version) {
            mega.attr.get(
                u_handle,
                attributeStringName,
                attrName.substr(0, 2) === '+!' ? true : -2,
                true
            ).done(function(r) {
                bitMapInstance.mergeFrom(r, false);
            });
        }
    };

    /**
     * Handles legacy cache & decryption of attributes that use tlvstore
     *
     * @param res
     * @param thePromise
     * @returns {*} the actual res (if altered)
     */
    ns.handleLegacyCacheAndDecryption = function(res, thePromise, attribute) {
        if (typeof res !== 'object') {
            try {
                var clearContainer = tlvstore.blockDecrypt(
                    base64urldecode(res),
                    u_k
                );
                res = tlvstore.tlvRecordsToContainer(clearContainer, true);

                if (res === false) {
                    res = EINTERNAL;
                }
            }
            catch (e) {
                if (e.name === 'SecurityError') {
                    logger.error(
                        'Could not decrypt private user attribute ' +
                        attribute +
                        ': ' +
                        e.message
                    );
                    thePromise.reject(EINTERNAL);
                }
                else {
                    logger.error('Unexpected exception!', e);
                    setTimeout(function () {
                        throw e;
                    }, 4);
                    thePromise.reject(EINTERNAL);
                }
                res = EINTERNAL;
            }
        }

        return res;
    };

    /**
     * Updated the local version cache IF the action packet contains a version
     *
     * @param actionPacketUserId
     * @param attributeName
     * @param actionPacketVersion
     */
    ns.handleVersionFromActionPacket = function (actionPacketUserId, attributeName, actionPacketVersion) {
        if (
            actionPacketVersion &&
            !mega.attr._versions[actionPacketUserId + "_" + attributeName]
        ) {
            mega.attr._versions[actionPacketUserId + "_" + attributeName] = actionPacketVersion;
        }
    };

    ns.registerConflictHandler("lstint", false, true, function(valObj, index) {
        var remoteValues = valObj.remoteValue;
        var localValues = valObj.localValue;
        // merge and compare any changes from remoteValues[u_h] = {type: timestamp} -> mergedValues
        Object.keys(remoteValues).forEach(function(k) {
            // not yet added to local values, merge
            if (!localValues[k]) {
                valObj.mergedValue[k] = remoteValues[k];
            }
            else {
                // exists in local values
                var remoteData = remoteValues[k].split(":");
                var remoteTs = parseInt(remoteData[1]);

                var localData = localValues[k].split(":");
                var localTs = parseInt(localData[1]);
                if (localTs > remoteTs) {
                    // local timestamp is newer then the remote one, use local
                    valObj.mergedValue[k] = localValues[k];
                }
                else if (localTs < remoteTs) {
                    // remote timestamp is newer, use remote
                    valObj.mergedValue[k] = remoteValues[k];
                }
            }
        });

        // add any entries which exists locally, but not remotely.
        Object.keys(localValues).forEach(function(k) {
            if (!remoteValues[k]) {
                valObj.mergedValue[k] = localValues[k];
            }
        });

        // console.error("merged: ", valObj.localValue, valObj.remoteValue, valObj.mergedValue);


        return true;
    });

    if (is_karma) {
        ns._logger = logger;
        mega.attr = ns;
    }
    else {
        Object.defineProperty(mega, 'attr', {
            value: Object.freeze(ns)
        });
    }
    ns = undefined;

})(this);

/**
 * Process action-packet for attribute updates.
 *
 * @param {String}  attrName        Attribute name
 * @param {String}  userHandle      User handle
 * @param {Boolean} ownActionPacket Whether the action-packet was issued by myself
 * @param {String} [version] version, as returned by the API
 */
function uaPacketParser(attrName, userHandle, ownActionPacket, version) {
    var logger = MegaLogger.getLogger('account');
    var cacheKey = userHandle + "_" + attrName;

    logger.debug('uaPacketParser: Invalidating cache entry "%s"', cacheKey);

    var removeItemPromise = attribCache.removeItem(cacheKey);

    if (typeof(mega.attr._versions[userHandle + "_" + attrName]) !== 'undefined') {
        delete mega.attr._versions[userHandle + "_" + attrName];
    }

    removeItemPromise
        .always(function _uaPacketParser() {
            if (attrName === 'firstname'
                || attrName === 'lastname') {
                M.u[userHandle].firstName = M.u[userHandle].lastName = "";
                M.syncUsersFullname(userHandle);
            }
            else if (ownActionPacket) {
                // atm only first/last name is processed throguh own-action-packet
                logger.warn('uaPacketParser: Unexpected attribute "%s"', attrName);
            }
            else if (attrName === '+a') {
                M.avatars(userHandle);
            }
            else if (attrName === '*!authring') {
                authring.getContacts('Ed25519');
            }
            else if (attrName === '*!authRSA') {
                authring.getContacts('RSA');
            }
            else if (attrName === '*!authCu255') {
                authring.getContacts('Cu25519');
            }
            else if (attrName === '*!fmconfig') {
                mega.config.fetch();
            }
            else if (attrName === '+puEd255') {
                // pubEd25519 key was updated!
                // force fingerprint regen.
                delete pubEd25519[userHandle];
                crypt.getPubEd25519(userHandle);
            }
            else if (
                (attrName.substr(0, 2) === '+!' || attrName.substr(0, 2) === '^!') &&
                attribCache.bitMapsManager.exists(attrName.substr(2))
            ) {
                mega.attr.handleBitMapAttribute(
                    attrName,
                    version
                );
            }
            else {
                logger.debug('uaPacketParser: No handler for "%s"', attrName);
            }
        });

    return removeItemPromise;
}


if (is_karma) {
    window.M = new MegaData();
    attribCache = new IndexedDBKVStorage('ua', { murSeed: 0x800F0002 });
    attribCache.syncNameTimer = {};
    attribCache.uaPacketParser = uaPacketParser;
    attribCache.bitMapsManager = new MegaDataBitMapManager();
}
