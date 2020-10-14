/**
 * mega.attr.* related code
 */

(function _userAttributeHandling(global) {
    "use strict";

    var ns = Object.create(null);
    var _inflight = Object.create(null);
    var logger = MegaLogger.getLogger('user-attribute');
    var ATTRIB_CACHE_NON_CONTACT_EXP_TIME = 2 * 60 * 60;
    var REVOKE_INFLIGHT = !1; // Lyubo is not happy so disabled for now :)

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
     *     False for private encrypted attributes
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic attributes will overwrite the value, and
     *     not retain previous values on the API server.
     * @param encodeValues {Boolean|undefined}
     *     If true, the object's values will be encoded to a UTF-8 byte array (Uint8Array) then encoded as a
     *     String containing 8 bit representations of the bytes before being passed to the TLV encoding/encrypting
     *     library. This is useful if the values contain special characters. The SDK is compatible with reading these.
     * @return {String}
     */
    var buildAttribute = ns._buildAttribute = function (attribute, pub, nonHistoric, encodeValues) {

        if (encodeValues) {
            attribute = '>' + attribute;
        }

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
     * Revoke a pending attribute retrieval if it gets overwritten/invalidated meanwhile.
     * @param {String} cacheKey The key obtained from buildCacheKey()
     * @returns {Boolean} Whether it was revoked
     * @private
     */
    var revokeRequest = function(cacheKey) {
        if (_inflight[cacheKey]) {
            if (REVOKE_INFLIGHT) {
                if (d > 1) {
                    logger.info('Revoking Inflight Request...', cacheKey);
                }
                _inflight[cacheKey].revoked = true;
            }
            else {
                if (d > 1) {
                    logger.info('Invalidating Inflight Request...', cacheKey);
                }
            }
            delete _inflight[cacheKey];
            return true;
        }
        return false;
    };

    /**
     * Converts an object with key/value pairs where the values may have special characters (Javascript stores strings
     * as UTF-16) which may take up 2+ bytes. First it converts the values to UTF-8 encoding, then encodes those bytes
     * to their 8 bit string representation. This object can then be sent directly to the TLV encoding library and
     * encrypted as each string character is 8 bits.
     * @param {Object} attribute An object with key/value pairs, the values being either ASCII strings or regular
     *                           JavaScript Strings with UTF-16 characters
     * @returns {Object} Returns the object with converted values
     */
    ns.encodeObjectValues = function(attribute) {

        var encodedAttribute = {};
        var encoder = new TextEncoder('utf-8');

        Object.keys(attribute).forEach(function(key) {

            // Encode to UTF-8 and store as Uint8Array bytes
            var value = attribute[key];
            var byteArray = encoder.encode(value);
            var encodedString = '';

            // Encode from bytes back to String in 8 bit characters
            for (var i = 0; i < byteArray.length; i++) {
                encodedString += String.fromCharCode(byteArray[i]);
            }

            // Store the encoded string
            encodedAttribute[key] = encodedString;
        });

        return encodedAttribute;
    };

    /**
     * Converts an object's values (with key/value pairs where the values have 8 bit characters) back to a byte array
     * then converts that back to its normal JavaScript string representation
     * @param {Object} attribute An object with key/value pairs
     * @returns {Object} Returns the object with converted values
     */
    ns.decodeObjectValues = function(attribute) {

        var decodedAttribute = {};
        var decoder = new TextDecoder('utf-8');

        Object.keys(attribute).forEach(function(key) {

            var value = attribute[key];
            var decodedBytes = [];

            // Encode from 8 bit characters back to bytes
            for (var i = 0; i < value.length; i++) {
                decodedBytes.push(value.charCodeAt(i));
            }

            // Create Uint8Array for the TextDecoder then decode
            var byteArray = new Uint8Array(decodedBytes);
            var regularString = decoder.decode(byteArray);

            // Store the decoded string
            decodedAttribute[key] = regularString;
        });

        return decodedAttribute;
    };

    /**
     * Retrieves a user attribute.
     *
     * @param userhandle {String}
     *     Mega's internal user handle.
     * @param attribute {String}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     *     False for private encrypted attributes
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {Function}
     *     Callback function to call upon completion (default: none).
     * @param ctx {Object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @param chathandle {String} pass chathandle in case this is an anonymous user previewing a specific pub chat
     * @param decodeValues {Boolean|undefined}
     *     If true, the object's values will be decoded from String containing 8 bit representations of bytes to a
     *     UTF-8 byte array then decoded back to regular JavaScript Strings (UTF-16). This is useful if the values
     *     contain special characters. The SDK is compatible with reading these.
     *
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.get = function _getUserAttribute(
            userhandle, attribute, pub, nonHistoric, callback, ctx, chathandle, decodeValues) {

        if (typeof userhandle !== 'string' || base64urldecode(userhandle).length !== 8) {
            return MegaPromise.reject(EARGS);
        }
        var self = this;
        var myCtx = ctx || {};
        var args = toArray.apply(null, arguments);

        // Assemble property name on Mega API.
        attribute = buildAttribute(attribute, pub, nonHistoric, decodeValues);
        var cacheKey = buildCacheKey(userhandle, attribute);

        if (_inflight[cacheKey]) {
            if (d > 1) {
                logger.warn('Attribute retrieval "%s" already pending,...', cacheKey);
            }
            return _inflight[cacheKey];
        }

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();
        _inflight[cacheKey] = thePromise;

        /**
         * Check whether the request was revoked meanwhile and pipe it to retrieve fresh data
         * @returns {Boolean}
         * @private
         */
        var isRevoked = function() {
            if (thePromise.revoked) {
                logger.info('Attribute retrieval got revoked...', cacheKey);

                if (_inflight[cacheKey]) {
                    logger.info('Another inflight request got set for "%s", reusing for revoked one.', cacheKey);
                }

                thePromise.linkDoneAndFailTo(_inflight[cacheKey] || mega.attr.get.apply(mega.attr, args));
                return true;
            }
            return false;
        };

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

                // If it's a private attribute container
                if (attribute.charAt(0) === '*') {

                    // Base64 URL decode, decrypt and convert back to object key/value pairs
                    res = self.handleLegacyCacheAndDecryption(res, thePromise, attribute);

                    // If the decodeValues flag is on, decode the 8 bit chars in the string to a UTF-8 byte array then
                    // convert back to a regular JavaScript String (UTF-16)
                    if (attribute[1] === '>' || attribute[2] === '>') {
                        res = self.decodeObjectValues(res);
                    }
                }

                // Otherwise if a non-encrypted private attribute, base64 decode the data
                else if (attribute.charAt(0) === '^') {
                    res = base64urldecode(res);
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

            // remove pending promise cache
            console.assert(!isRevoked(), 'The attribute retrieval should not have been revoked at this point...');
            delete _inflight[cacheKey];

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
            if (isRevoked()) {
                return;
            }
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
         * @param {MegaPromise|Number} [promise] Optional promise to wait for.
         */
        var doApiReq = function _doApiReq(promise) {
            if (isRevoked()) {
                if (promise === -0xdeadbeef) {
                    logger.warn('Attribute "%s" got revoked while removing a cached entry!', cacheKey);
                }
                return;
            }
            if (promise instanceof MegaPromise) {
                promise.always(function() {
                    doApiReq(-0xdeadbeef);
                });
            }
            else {
                if (chathandle) {
                    api_req({'a': 'mcuga', "ph": chathandle, 'u': userhandle, 'ua': attribute, 'v': 1}, myCtx);
                }
                else {
                    api_req({'a': 'uga', 'u': userhandle, 'ua': attribute, 'v': 1}, myCtx);
                }
            }
        };

        // check the cache first!
        attribCache.getItem(cacheKey)
            .fail(doApiReq)
            .done(function __attribCacheGetDone(v) {
                var result;

                if (isRevoked()) {
                    return;
                }

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
     * Note: THIS METHOD IS LEFT HERE FOR DEVELOPMENT AND TESTING PURPOSES, PLEASE DON'T USE FOR PRODUCTION FEATURES.
     *
     * @deprecated
     *
     * @param attribute {string}
     *     Name of the attribute.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     *     False for private encrypted attributes
     * @param nonHistoric {bool}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param encodeValues {Boolean|undefined}
     *     If true and used in combination with the private/encrypted flag (* attribute), the object's values will be
     *     encoded to UTF-8 as a byte array (Uint8Array) then encoded as a String containing the 8 bit representations
     *     of the bytes before being passed to the TLV encoding/encrypting functions. These functions will convert
     *     these 8 bit strings back to bytes before encryption. This feature is useful if the object values contain
     *     special characters. The SDK is compatible with reading these attributes.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     */
    ns.remove = function _removeUserAttribute(attribute, pub, nonHistoric, encodeValues) {
        attribute = buildAttribute(attribute, pub, nonHistoric, encodeValues);
        var cacheKey = buildCacheKey(u_handle, attribute);
        var promise = new MegaPromise();

        if (d) {
            console.warn("Removing attribute %s, I really hope you know what you are doing!", attribute);
        }

        var self = this;
        var req = {'a': 'upr', 'ua': attribute, 'v': 1};
        if (self._versions[cacheKey]) {
            // req['av'] = self._versions[cacheKey];
        }
        attribCache.removeItem(cacheKey)
            .always(function() {
                api_req(req, {
                    callback: function(res) {
                        // Revoke pending attribute retrieval, if any.
                        revokeRequest(cacheKey);

                        if (typeof res === 'number' || res < 0) {
                            logger.warn('Error removing user attribute "%s", result: %s!', attribute, res);
                            promise.reject(res);
                        }
                        else {
                            if (self._versions[cacheKey] && typeof res === 'string') {
                                self._versions[cacheKey] = res;
                            }
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
     *     Name of the attribute. The max length is 16 characters. Note that the SDK only reads the first 8 chars. Also
     *     note that the prefix characters such as *, +, ^, ! or > may be added so usually you have less to work with.
     * @param value {object}
     *     Value of the user attribute. Public properties are of type {string},
     *     private ones have to be an object with key/value pairs.
     * @param pub {Boolean|Number}
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     *     False for private encrypted attributes
     * @param nonHistoric {Boolean}
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param callback {Function}
     *     Callback function to call upon completion (default: none). This callback
     *     function expects two parameters: the attribute `name`, and its `value`.
     *     In case of an error, the `value` will be undefined.
     * @param ctx {Object}
     *     Context, in case higher hierarchies need to inject a context
     *     (default: none).
     * @param mode {Integer|undefined}
     *     Encryption mode. One of tlvstore.BLOCK_ENCRYPTION_SCHEME (to use default AES_GCM_12_16 pass undefined).
     * @param useVersion {Boolean|undefined}
     *     If true is passed, 'upv' would be used instead of 'up' (which means that conflict handlers and all
     *     versioning logic may be used for setting this attribute)
     * @param encodeValues {Boolean|undefined}
     *     If true and used in combination with the private/encrypted flag (* attribute), the object's values will be
     *     encoded to UTF-8 as a byte array (Uint8Array) then encoded as a String containing the 8 bit representations
     *     of the bytes before being passed to the TLV encoding/encrypting functions. These functions will convert
     *     these 8 bit strings back to bytes before encryption. This feature is useful if the object values contain
     *     special characters. The SDK is compatible with reading these attributes.
     * @return {MegaPromise}
     *     A promise that is resolved when the original asynch code is settled.
     *     Can be used to use promises instead of callbacks for asynchronous
     *     dependencies.
     */
    ns.set = function _setUserAttribute(
            attribute, value, pub, nonHistoric, callback, ctx, mode, useVersion, encodeValues) {

        var self = this;
        var myCtx = ctx || {};
        var savedValue = value;
        var attrName = attribute;

        // Prepare all data needed for the call on the Mega API.
        if (mode === undefined) {
            mode = tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16;
        }

        // Format to get the right prefixes
        attribute = buildAttribute(attribute, pub, nonHistoric, encodeValues);

        // If encrypted/private attribute, the value should be a key/value property container
        if (attribute[0] === '*') {

            // If encode flag is on, encode the object values to UTF-8 then 8 bit strings so TLV blockEncrypt can parse
            if (attribute[1] === '>' || attribute[2] === '>') {
                value = self.encodeObjectValues(value);
            }

            // Encode to TLV, encrypt it then Base64 URL encode it so it can be stored API side
            savedValue = base64urlencode(
                tlvstore.blockEncrypt(
                    tlvstore.containerToTlvRecords(value), u_k, mode, false
                )
            );
        }

        // Otherwise if a non-encrypted private attribute, base64 encode the data
        else if (attribute[0] === '^') {
            savedValue = base64urlencode(value);
        }

        // Make the promise to execute the API code.
        var thePromise = new MegaPromise();

        var cacheKey = buildCacheKey(u_handle, attribute);

        // Revoke pending attribute retrieval, if any.
        revokeRequest(cacheKey);

        // clear when the value is being sent to the API server, during that period
        // the value should be retrieved from the server, because of potential
        // race conditions
        attribCache.removeItem(cacheKey);

        var settleFunction = function(res) {
            if (typeof res !== 'number') {
                attribCache.setItem(cacheKey, JSON.stringify([{"av": savedValue, "v": res[attribute]}, 0]));
                if (res[attribute]) {
                    self._versions[cacheKey] = res[attribute];
                }

                logger.info('Setting user attribute "'
                    + attribute + '", result: ' + res);
                thePromise.resolve(res);
            }
            else {
                if (res === EEXPIRED && useVersion) {
                    var conflictHandlerId = attribute;

                    if (
                        !self._conflictHandlers[conflictHandlerId] ||
                        self._conflictHandlers[conflictHandlerId].length === 0
                    ) {
                        logger.error('Server returned version conflict for attribute "'
                            + attribute + '", result: ' + res + ', local version:', self._versions[cacheKey]);
                        thePromise.reject(res);
                    }
                    else {
                        // ensure that this attr's value is not cached and up-to-date.
                        attribCache.removeItem(cacheKey);

                        self.get(
                            u_handle,
                            attrName,
                            pub,
                            nonHistoric,
                            false,
                            false,
                            false,
                            encodeValues
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
                                            useVersion,
                                            encodeValues
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

    ns._versions = Object.create(null);
    ns._conflictHandlers = Object.create(null);

    ns.registerConflictHandler = function (attributeName, pub, nonHistoric, encodeValues, mergeFn) {
        var attributeId = buildAttribute(attributeName, pub, nonHistoric, encodeValues);

        if (!this._conflictHandlers[attributeId]) {
            this._conflictHandlers[attributeId] = [];
        }
        this._conflictHandlers[attributeId].push(mergeFn);
    };

    /**
     * An internal list of queued setArrayAttribute operations
     *
     * @type {Array}
     * @private
     */
    ns._queuedSetArrayAttributeOps = [];


    /**
     * QueuedSetArrayAttribute is used to represent an instance of a "set" op in an queue of QueuedSetArrayAttribute's.
     * Every QueuedSetArrayAttribute can contain multiple changes to multiple keys.
     * This is done transparently in mega.attr.setArrayAttribute.
     *
     * @private
     * @param {String} attr - see mega.attr.setArrayAttribute
     * @param {String} attributeName see mega.attr.setArrayAttribute
     * @param {String} k initial k to be changed
     * @param {String} v initial value to be used for the change
     * @param {String} pub see mega.attr.setArrayAttribute
     * @param {String} nonHistoric see mega.attr.setArrayAttribute
     * @constructor
     */
    var QueuedSetArrayAttribute = function(attr, attributeName, k, v, pub, nonHistoric) {
        var self = this;
        self.attr = attr;
        self.attributeName = attributeName;
        self.pub = pub;
        self.nonHistoric = nonHistoric;
        self.ops = [];
        self.state = QueuedSetArrayAttribute.STATE.QUEUED;

        var proxyPromise = new MegaPromise();
        proxyPromise.always(function() {
            // logger.debug("finished: ", proxyPromise.state(), self.toString());

            self.state = QueuedSetArrayAttribute.STATE.DONE;
            array.remove(self.attr._queuedSetArrayAttributeOps, self);

            if (self.attr._queuedSetArrayAttributeOps.length > 0) {
                // execute now
                self.attr._nextQueuedSetArrayAttributeOp();
            }
        });

        self.queueSubOp(k, v);

        self.promise = proxyPromise;
        self.attr._queuedSetArrayAttributeOps.push(self);
        if (self.attr._queuedSetArrayAttributeOps.length === 1) {
            // execute now
            self.attr._nextQueuedSetArrayAttributeOp();
        }
    };

    QueuedSetArrayAttribute.STATE = {
        'QUEUED': 1,
        'EXECUTING': 2,
        'DONE': 3
    };

    /**
     * Internal method, that is used for adding subOps, e.g. an QueuedSetArrayAttribute can contain multiple
     * changes to a key.
     *
     * @private
     * @param {String} k
     * @param {String} v
     */
    QueuedSetArrayAttribute.prototype.queueSubOp = function(k, v) {
        var self = this;
        self.ops.push([k, v]);
        logger.debug("QueuedSetArrayAttribute queued sub op", k, v, self.toString());
    };

    /**
     * Debugging purposes only
     *
     * @returns {String}
     */
    QueuedSetArrayAttribute.prototype.toString = function() {
        var self = this;

        var setOps = [];

        self.ops.forEach(function(entry) {
            setOps.push(entry[0] + "=" + entry[1]);
        });

        return "QueuedSetArrayAttribute: " + buildAttribute(self.attributeName, self.pub, self.nonHistoric) + "(" +
            setOps.join(",")
            + ")";
    };

    /**
     * Execute this QueuedSetArrayAttribute changes and send them to the server.
     *
     * @returns {MegaPromise|*}
     */
    QueuedSetArrayAttribute.prototype.exec = function() {
        var self = this;

        var proxyPromise = self.promise;
        self.state = QueuedSetArrayAttribute.STATE.EXECUTING;

        logger.debug("QueuedSetArrayAttribute executing: ", self.toString());

        var _setArrayAttribute = function(r) {
            if (r === EINTERNAL) {
                r = {};
            }
            else if (typeof r === 'number') {
                logger.error("Found number value for attribute: ", self.attributeName, " when trying to use it as " +
                    "attribute array. Halting .setArrayAttribute");
                proxyPromise.reject(r);
                return;
            }
            var arr = r ? r : {};
            self.ops.forEach(function(entry) {
                arr[entry[0]] = entry[1];
            });

            var serializedValue = arr;

            proxyPromise.linkDoneAndFailTo(
                self.attr.set(
                    self.attributeName,
                    serializedValue,
                    self.pub,
                    self.nonHistoric,
                    undefined,
                    undefined,
                    undefined,
                    true
                )
            );
        };

        self.attr.get(u_handle, self.attributeName, self.pub, self.nonHistoric)
            .done(function(r) {
                try {
                    if (r === -9) {
                        _setArrayAttribute({});
                        proxyPromise.reject(r);
                    }
                    else {
                        _setArrayAttribute(r);
                    }
                }
                catch (e) {
                    logger.error("QueuedSetArrayAttribute failed, because of exception: ", e);
                    proxyPromise.reject(e, r);
                }
            })
            .fail(function(r) {
                if (r === -9) {
                    try {
                        _setArrayAttribute({});
                    }
                    catch (e) {
                        logger.error("QueuedSetArrayAttribute failed, because of exception: ", e);
                    }
                    proxyPromise.reject(r);
                }
                else {
                    proxyPromise.reject(r);
                }
            });

        return proxyPromise;
    };

    /**
     * Try to execute next op, if such is available.
     *
     * @type {Function}
     * @private
     */
    ns._nextQueuedSetArrayAttributeOp = SoonFc(function() {
        var self = this;
        var found = false;
        self._queuedSetArrayAttributeOps.forEach(function(op) {
            if (!found && op.state === QueuedSetArrayAttribute.STATE.QUEUED) {
                found = op;
            }
        });

        if (found) {
            found.exec();
        }
    }, 75);


    ns.QueuedSetArrayAttribute = QueuedSetArrayAttribute;

    /**
     * Update the value (value) of a specific key (subkey) in an "array attribute".
     * Important note: `setArrayAttribtues` are cleverly throttled to not flood the API, but also, while being queued,
     * multiple .setArrayAttribute('a', ...) -> .setArrayAttribute('a', ...), etc, may be executed in one single API
     * call.
     * For the developer, this is going to be transparently handled, since any .setArrayAttribute returns a promise and
     * that promise would be synced with the internal queueing mechanism, so the only thing he/she needs to take care
     * is eventually define a proper execution flow using promises.
     *
     * @param {String} attributeName see mega.attr.set
     * @param {String} subkey generic
     * @param {String} value generic
     * @param {Integer|undefined|false} pub  see mega.attr.set
     * @param {Integer|undefined|false} nonHistoric  see mega.attr.set
     * @returns {MegaPromise|*}
     */
    ns.setArrayAttribute = function(attributeName, subkey, value, pub, nonHistoric) {
        var self = this;
        var found = false;
        self._queuedSetArrayAttributeOps.forEach(function(op) {
            if (
                !found &&
                op.state === QueuedSetArrayAttribute.STATE.QUEUED &&
                op.attributeName === attributeName &&
                op.pub === pub &&
                op.nonHistoric === nonHistoric
            ) {
                found = op;
            }
        });

        if (found && found.state === QueuedSetArrayAttribute.STATE.QUEUED) {
            found.queueSubOp(subkey, value);
            return found.promise;
        }
        else {
            var op = new QueuedSetArrayAttribute(self, attributeName, subkey, value, pub, nonHistoric);
            return op.promise;
        }
    };

    /**
     * Get a specific `subkey`'s value from an "array attribute"
     *
     * @param {String} userId see mega.attr.get
     * @param {String} attributeName the actual attribtue name
     * @param {String} subkey the actual subkey stored in that array attribute
     * @param {Integer|undefined|false} pub see mega.attr.get
     * @param {Integer|undefined|false} nonHistoric see mega.attr.get
     * @returns {MegaPromise}
     */
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
     * @param {String|Object} res The payload to decrypt.
     * @param {MegaPromise} [thePromise] Promise to signal rejections.
     * @param {String} [attribute] Attribute name we're decrypting.
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
                    throw new Error('TLV Record decoding failed.');
                }
            }
            catch (e) {
                if (d) {
                    logger.error('Could not decrypt private user attribute %s: %s', attribute, e.message, e);
                }
                res = EINTERNAL;

                if (thePromise) {
                    thePromise.reject(res);
                }
            }
        }

        return res;
    };

    var uaPacketParserHandler = Object.create(null);

    /**
     * Process action-packet for attribute updates.
     *
     * @param {String}  attrName          Attribute name
     * @param {String}  userHandle        User handle
     * @param {Boolean} [ownActionPacket] Whether the action-packet was issued by oneself
     * @param {String}  [version]         version, as returned by the API
     */
    ns.uaPacketParser = function uaPacketParser(attrName, userHandle, ownActionPacket, version) {
        var cacheKey = userHandle + "_" + attrName;

        if (this._versions[cacheKey] === version) {
            // dont invalidate if we have the same version in memory.
            return;
        }

        // Revoke pending attribute retrieval, if any.
        revokeRequest(cacheKey);

        logger.debug('uaPacketParser: Invalidating cache entry "%s"', cacheKey);

        // XXX: Even if we're using promises here, this is guaranteed to resolve synchronously atm,
        //      so if this ever changes we'll need to make sure it's properly adapted...

        var removeItemPromise = attribCache.removeItem(cacheKey);

        removeItemPromise
            .always(function _uaPacketParser() {
                if (typeof uaPacketParserHandler[attrName] === 'function') {
                    uaPacketParserHandler[attrName](userHandle);
                }
                else if (
                    (attrName.substr(0, 2) === '+!' || attrName.substr(0, 2) === '^!') &&
                    attribCache.bitMapsManager.exists(attrName.substr(2))
                ) {
                    mega.attr.handleBitMapAttribute(attrName, version);
                }
                else if (d > 1) {
                    logger.debug('uaPacketParser: No handler for "%s"', attrName);
                }
            });

        return removeItemPromise;
    };

    mBroadcaster.once('boot_done', function() {
        uaPacketParserHandler['firstname'] = function(userHandle) {
            if (M.u[userHandle]) {
                M.u[userHandle].firstName = M.u[userHandle].lastName = "";
                M.syncUsersFullname(userHandle);
            }
            else {
                console.warn('uaPacketParser: Unknown user %s handling first/lastname', userHandle);
            }
        };
        uaPacketParserHandler['lastname']    = uaPacketParserHandler['firstname'];
        uaPacketParserHandler['+a']          = function(userHandle) { M.avatars(userHandle); };
        uaPacketParserHandler['*!authring']  = function() { authring.getContacts('Ed25519'); };
        uaPacketParserHandler['*!authRSA']   = function() { authring.getContacts('RSA'); };
        uaPacketParserHandler['*!authCu255'] = function() { authring.getContacts('Cu25519'); };
        uaPacketParserHandler['+puEd255']    = function(userHandle) {
            // pubEd25519 key was updated! force fingerprint regen.
            delete pubEd25519[userHandle];
            crypt.getPubEd25519(userHandle);
        };
        uaPacketParserHandler['*!fmconfig'] = function() {
            mega.config.fetch();
            if (fminitialized && page === 'fm/account/transfers') {
                accountUI.transfers.transferTools.megasync.render();
            }
        };
        uaPacketParserHandler['*!>alias'] = function() {
            nicknames.updateNicknamesFromActionPacket();
        };
        uaPacketParserHandler['birthday'] = function(userHandle) {
            mega.attr.get(userHandle, 'birthday', -1, false, function(res) {
                u_attr['birthday'] = from8(base64urldecode(res));
                if (fminitialized && page === 'fm/account') {
                    accountUI.account.profiles.renderBirthDay();
                }
            });
        };
        uaPacketParserHandler['birthmonth'] = function(userHandle) {
            mega.attr.get(userHandle, 'birthmonth', -1, false, function(res) {
                u_attr['birthmonth'] = from8(base64urldecode(res));
                if (fminitialized && page === 'fm/account') {
                    accountUI.account.profiles.renderBirthMonth();
                }
            });
        };
        uaPacketParserHandler['birthyear'] = function(userHandle) {
            mega.attr.get(userHandle, 'birthyear', -1, false, function(res) {
                u_attr['birthyear'] = from8(base64urldecode(res));
                if (fminitialized && page === 'fm/account') {
                    accountUI.account.profiles.renderBirthYear();
                }
            });
        };
        uaPacketParserHandler['country'] = function(userHandle) {
            mega.attr.get(userHandle, 'country', -1, false, function(res) {
                u_attr['country'] = from8(base64urldecode(res));
                if (fminitialized && page === 'fm/account') {
                    accountUI.account.profiles.renderCountry();
                    accountUI.account.profiles.bindEvents();
                }
            });
        };
        uaPacketParserHandler['^!prd'] = function() {
            mBroadcaster.sendMessage('attr:passwordReminderDialog');
            // if page is session history and new password action detected. update session table.
            if (fminitialized && page === 'fm/account/security' && accountUI.security) {
                accountUI.security.session.update(1);
            }
        };
        uaPacketParserHandler['^!dv'] = function() {
            if (fminitialized && M.account) {
                delay('fv:uvi^dv', fileversioning.updateVersionInfo.bind(fileversioning), 4e3);
            }
        };
        uaPacketParserHandler['^clv'] = function(userHandle) {
            mega.attr.get(userHandle, 'clv', -2, 0, function(res) {
                u_attr['^clv'] = res;
                if (fminitialized && $.dialog === 'qr-dialog') {
                    openAccessQRDialog();
                }
                if (fminitialized && page === 'fm/account') {
                    accountUI.account.qrcode.render(M.account, res);
                }
            });
        };
        uaPacketParserHandler['^!rubbishtime'] = function(userHandle) {
            if (u_attr.flags.ssrs > 0) {
                mega.attr.get(userHandle, 'rubbishtime', -2, 1, function(res) {
                    if (fminitialized && M.account) {
                        M.account.ssrs = parseInt(res);
                        if (page === 'fm/account/file-management') {
                            accountUI.fileManagement.rubsched.render(M.account);
                        }
                    }
                });
            }
        };
        uaPacketParserHandler['^!usl'] = function() {
            if (fminitialized && u_type) {
                M.getStorageState(true).always(M.checkStorageQuota.bind(M, 2e3));
            }
        };
        uaPacketParserHandler['*!rp'] = function() {
            if (fminitialized) {
                mBroadcaster.sendMessage('attr:rp');
            }
        };
        uaPacketParserHandler['^!enotif'] = function() {
            mega.enotif.handleAttributeUpdate();
        };
        uaPacketParserHandler['^!affid'] = function(userHandle) {
            mega.attr.get(userHandle, 'affid', -2, 1, function(res) {
                u_attr['^!affid'] = res;
                if (fminitialized) {
                    M.affiliate.id = res;
                }
            });
        };
        uaPacketParserHandler['^!afficon'] = function() {
            u_attr['^!afficon'] = 1;
        };

        if (d) {
            global._uaPacketParserHandler = uaPacketParserHandler;
        }
    });

    /**
     * Create helper factory.
     * @param {String} attribute Name of the attribute.
     * @param {Boolean|Number} pub
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     * @param {Boolean} nonHistoric
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param {String} storeKey An object key to store the data under
     * @param {Function} [decode] Function to post-process the value before returning it
     * @param {Function} [encode] Function to pre-process the value before storing it
     * @return {Object}
     */
    ns.factory = function(attribute, pub, nonHistoric, storeKey, decode, encode) {
        var key = buildAttribute(attribute, pub, nonHistoric);
        if (this.factory[key]) {
            return this.factory[key];
        }

        if (typeof encode !== 'function') {
            encode = function(value) {
                return JSON.stringify(value);
            };
        }
        if (typeof decode !== 'function') {
            decode = function(value) {
                return JSON.parse(value);
            };
        }
        var log = new MegaLogger('factory[' + key + ']', false, logger);

        var cacheValue = function(value) {
            cacheValue.last = decode(value[storeKey]);

            if (key[0] === '*') {
                value = base64urlencode(
                    tlvstore.blockEncrypt(
                        tlvstore.containerToTlvRecords(value), u_k, tlvstore.BLOCK_ENCRYPTION_SCHEME.AES_GCM_12_16
                    )
                );
            }
            else if (key[0] === '^') {
                value = base64urlencode(value);
            }

            if (typeof u_attr === 'object') {
                u_attr[key] = value;
            }

            return cacheValue.last;
        };
        cacheValue.last = false;

        var notify = function() {
            for (var i = notify.queue.length; i--;) {
                notify.queue[i](cacheValue.last);
            }
        };
        notify.queue = [];

        var factory = {
            change: function(callback) {
                notify.queue.push(tryCatch(callback));
                return this;
            },
            remove: function() {
                return mega.attr.remove(attribute, pub, nonHistoric);
            },

            set: promisify(function(resolve, reject, value) {
                var store = {};
                store[storeKey] = encode(value);

                cacheValue(store);
                log.debug('storing value', store);

                mega.attr.set(attribute, store, pub, nonHistoric).then(resolve).catch(reject);
            }),

            get: promisify(function(resolve, reject, force) {
                if (!force && Object(u_attr).hasOwnProperty(key)) {
                    var value = u_attr[key] || false;

                    if (value) {
                        if (key[0] === '*') {
                            value = mega.attr.handleLegacyCacheAndDecryption(value);
                        }
                        else if (key[0] === '^') {
                            value = base64urldecode(value);
                        }
                    }

                    log.debug('cached value', value);
                    value = value[storeKey];

                    if (value) {
                        cacheValue.last = decode(value);
                        return resolve(cacheValue.last);
                    }
                }

                mega.attr.get(u_handle, attribute, pub, nonHistoric)
                    .then(function(value) {
                        log.debug('got value', value);
                        resolve(cacheValue(value));
                    })
                    .catch(reject);
            })
        };

        if (uaPacketParserHandler[key]) {
            return log.warn('exists');
        }

        uaPacketParserHandler[key] = function() {
            if (fminitialized && u_type) {
                cacheValue.last = false;
                if (typeof u_attr === 'object') {
                    delete u_attr[key];
                }
                factory.get(true).always(notify);
            }
        };

        this.factory[key] = factory;
        return Object.freeze(factory);
    };

    /**
     * An attribute factory that eases handling folder creation/management, e.g. My chat files
     * @param {String} attribute Name of the attribute.
     * @param {Boolean|Number} pub
     *     True for public attributes (default: true).
     *     -1 for "system" attributes (e.g. without prefix)
     *     -2 for "private non encrypted attributes"
     * @param {Boolean} nonHistoric
     *     True for non-historic attributes (default: false).  Non-historic
     *     attributes will overwrite the value, and not retain previous
     *     values on the API server.
     * @param {String} storeKey An object key to store the data under
     * @param {String|Array} name The folder name, if an array it's [localized, english]
     * @param {Function} [decode] Function to post-process the value before returning it
     * @param {Function} [encode] Function to pre-process the value before storing it
     * @return {Object}
     */
    ns.getFolderFactory = function(attribute, pub, nonHistoric, storeKey, name, decode, encode) {
        if (!Array.isArray(name)) {
            name = [name];
        }
        var localeName = name[0] || name[1];
        var englishName = name[1] || localeName;
        var log = new MegaLogger('fldFactory[' + englishName + ']', false, logger);

        // listen for attribute changes.
        var onchange = function(handle) {
            // XXX: caching the value under the global `M` is meant for compatibility
            // with legacy synchronous code, any new logic should stick to promises.
            M[attribute] = handle;
            dbfetch.node([handle]).always(function(res) {
                M[attribute] = res[0] || M[attribute];
                if (M[attribute].p === M.RubbishID) {
                    M[attribute] = false;
                } else if (M[attribute].name !== localeName) {
                    M.rename(M[attribute].h, localeName);
                }
                if (d) {
                    log.info("Updating folder...", M[attribute]);
                }
            });
        };
        var ns = Object.create(null);
        var factory = this.factory(attribute, pub, nonHistoric, storeKey, decode, encode).change(onchange);

        // Initialization logic, invoke just once when needed.
        ns.init = function() {
            factory.get().then(onchange).catch(function() {
                // attribute not set, lookup for a legacy folder node
                var keys = Object.keys(M.c[M.RootID] || {});

                for (var i = keys.length; i--;) {
                    var n = M.getNodeByHandle(keys[i]);

                    if (n.name === englishName || n.name === localeName) {
                        if (d) {
                            log.info('Found existing folder, migrating to attribute...', n.h, n);
                        }
                        factory.set(n.h).dump(attribute);
                        if (n.name !== localeName) {
                            M.rename(n.h, localeName);
                        }
                        break;
                    }
                }
            });
        };

        // Retrieve folder node, optionally specifying whether if should be created if it does not exists.
        ns.get = promisify(function(resolve, reject, create) {
            factory.get().then(function(h) { return dbfetch.node([h]); }).always(function(res) {
                var node = res[0];
                if (node && node.p !== M.RubbishID) {
                    return resolve(node);
                }

                if (!create) {
                    return reject(node || ENOENT);
                }

                var target = typeof create === 'string' && create || M.RootID;
                M.createFolder(target, ns.name).always(function(target) {
                    if (!M.d[target]) {
                        if (d) {
                            log.warn("Failed to create folder...", target, api_strerror(target));
                        }
                        return reject(target);
                    }

                    ns.set(target).always(resolve.bind(null, M.d[target]));
                });
            });
        });

        // Store folder handle.
        ns.set = function(handle) {
            return handle === Object(M[attribute]).h ? Promise.resolve(EEXIST) : factory.set(handle);
        };

        Object.defineProperty(ns, 'name', {
            get: function() {
                return Object(M[attribute]).name || localeName || englishName;
            }
        });

        return Object.freeze(ns);
    };

    ns.registerConflictHandler(
        "lstint",
        false,
        true,
        false,
        function(valObj) {
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

            // logger.debug("merged: ", valObj.localValue, valObj.remoteValue, valObj.mergedValue);


            return true;
        });

    ns.registerConflictHandler(
        "alias",
        false,
        true,
        true,
        function(valObj) {
            valObj.mergedValue = $.extend({}, valObj.localValue, valObj.remoteValue, nicknames._dirty);

            // logger.debug("merged: ", valObj.localValue, valObj.remoteValue, valObj.mergedValue);

            return true;
        });

    if (d) {
        ns._inflight = _inflight;
    }

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

})(self);

