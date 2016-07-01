/**
 * This plugin is responsible for encrypting/decryption the data handled by MegaDB transparently
 *
 * @param mdbInstance {MegaDB}
 * @constructor
 */
function MegaDBEncryption(mdbInstance) {
    var self = this;

    var logger = self.logger = MegaLogger.getLogger("mDBEncryptionPlugin", {
        'dereferenceObjects': true
    }, mdbInstance.logger);

    // helepr funcs (key cache loader + hasher)

    var _encDecKeyCache = null;
    var getEncDecKey = function() {

        if (_encDecKeyCache === null) {
            throw new Error('_encDecKeyCache is not yet initialised');
        }

        return _encDecKeyCache;
    };

    var hasherFunc = function(v) {
        assert(u_pubEd25519, "FATAL: u_pubEd25519 is not set!");

        var hashFunc = asmCrypto.SHA256.base64;
        var hCache = hashFunc(u_pubEd25519 + getEncDecKey());
        return hashFunc(v + hCache);
    };

    // PlugIn Initialization
    this.setup = function MegaDBEncryptionSetup(mdbServerInstance) {
        var promise = new MegaPromise();

        if (!u_k) {
            return MegaPromise.reject(new Error('Missing MasterKey.'));
        }

        mdbServerInstance.getUData('enckey')
            .then(function __enckey(data) {
                // logger.debug('getUData.enckey', data);
                if (!data) {
                    // Generate new encryption key
                    try {
                        _encDecKeyCache = stringcrypt.newKey();
                        data = stringcrypt.stringEncrypter(_encDecKeyCache, u_k, true);
                    }
                    catch (ex) {
                        return promise.reject(ex);
                    }

                    mdbInstance.flags |= MegaDB.DB_FLAGS.HASNEWENCKEY;

                    mdbServerInstance.setUData(data, 'enckey')
                        .then(function() {
                            logger.info('setUData.enckey', arguments);
                            promise.resolve();
                        }, function(err) {
                            logger.error('Error storing enckey', err);
                            promise.reject(err);
                        });
                }
                else {
                    try {
                        // Decrypt existing DB session encryption key with master key.
                        _encDecKeyCache = stringcrypt.stringDecrypter(data, u_k, true);
                        if (_encDecKeyCache.length !== 16) {
                            logger.debug('Invalid Key length: %d bytes', _encDecKeyCache.length);
                            __enckey();
                        }
                        else {
                            promise.resolve();
                        }
                    }
                    catch (ex) {
                        promise.reject(ex);
                    }
                }
            }, function(err) {
                promise.reject(err);
            });

        return promise;
    };

    // funcs which encrypt or decrypt the whole object

    /**
     * Demo encrypt func
     *
     * @param table {string} you can use this argument to do different type of encryption for the different db tables
     * @param obj {Object} actual object to be encrypted
     */
    var simpleEncryptObjFunction = function(table, obj) {
        Object.keys(obj).forEach(function(k) {
            var v = obj[k];
            if (k == "__origObj" || k == "id" ||  k === mdbInstance._getTablePk(table)) { return; }

            if (mdbInstance.schema[table]['indexes'] && mdbInstance.schema[table]['indexes'][k]) {
                obj[k + "$v"] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey(), false);
                obj[k] = hasherFunc(JSON.stringify(v));
            } else {
                obj[k] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey(), false);
            }
            // logger.debug("encrypted: {k=", k, "v=", v, "$v=", obj[k + "$v"], "objk=", obj[k], "}");
        })
    };

    /**
     * Demo decrypt func
     *
     * @param table {string} you can use this argument to do different type of encryption for the different db tables
     * @param obj {Object} actual object to be encrypted
     */
    var simpleDecryptObjFunction = function(table, obj) {
        if (obj.__origObj) { // restore if available in plain text
            Object.keys(obj.__origObj).forEach(function(k) {
                var v = obj.__origObj[k];
                if (k == "__origObj") { return; }

                obj[k] = v;
            });
        } else { // no orig obj, decrypt please
            var decryptedKeys = [];
            Object.keys(obj).forEach(function (k) {
                var v = obj[k];
                if (k == "__origObj" || k == "id" || k.substr(-2) == "$v" || k === mdbInstance._getTablePk(table)) {
                    return;
                }

                if (mdbInstance.schema[table]['indexes'] && mdbInstance.schema[table]['indexes'][k] && obj[k + "$v"] && decryptedKeys.indexOf(k) === -1) {
                    obj[k] = JSON.parse(stringcrypt.stringDecrypter(obj[k + "$v"], getEncDecKey()), false);
                    delete obj[k + "$v"];
                    decryptedKeys.push(k);
                }
                else {
                    try {
                        obj[k] = stringcrypt.stringDecrypter(v, getEncDecKey(), false);
                        if (obj[k] == "undefined") {
                            obj[k] = undefined;
                        }
                        else {
                            obj[k] = JSON.parse(obj[k]);
                        }
                    }
                    catch (e) {
                        if (e instanceof TypeError) { // TypeError is caused when the data stored in the db is NOT encrypted.
                            obj[k] = v;
                        }
                        else if (e instanceof IllegalArgumentError) {
                            logger.error('Encrypted IndexedDB inconsistent. Clear local DB and reload.');
                            throw e;
                        }
                        else {
                            throw e;
                        }
                    }
                }
                // logger.debug("decrypted: ", k, v, obj[k + "$v"], obj[k]);
            });
        }
    };


    /**
     * attach those functions to the specific event handlers
     */
    mdbInstance.bind("onBeforeAdd", function(e, table, obj) {
        // logger.debug("onBeforeAdd: ", table, obj);

        e.returnedValue = [table, clone(obj)];
        simpleEncryptObjFunction(table, e.returnedValue[1]);
    });

    mdbInstance.bind("onBeforeUpdate", function(e, table, k, obj, isQuerysetUpdate) {
        // logger.debug("onBeforeUpdate: ", table, k, obj);

        e.returnedValue = [table, k, clone(obj), isQuerysetUpdate];

        if (!isQuerysetUpdate) {
            simpleEncryptObjFunction(table, e.returnedValue[2]);
        } else {
            simpleDecryptObjFunction(table, e.returnedValue[2]);
        }
    });

    mdbInstance.bind("onDbRead", function(e, table, obj) {
        // logger.debug("onDbRead: ", table, obj);

        try {
            simpleDecryptObjFunction(table, obj);
        }
        catch (exc) {
            if (exc.message === "data integrity check failed") {
                logger.warn("data integrity check failed for (will be removed): ", table, obj[mdbInstance._getTablePk(table)], obj);

                mdbInstance.server.remove(table, obj[mdbInstance._getTablePk(table)]);
                e.stopPropagation();

                if (!e.data) {
                    e.data = {};
                }
                if (!e.data.errors) {
                    e.data.errors = [];
                }
                e.data.errors.push(exc);
            }
            else {
                logger.error("onDbRead failed: ", exc, exc.stack ? exc.stack : undefined);
                throw e;
            }
        }


    });

    mdbInstance.bind("onFilterQuery", function(e, table, filters) {
        // logger.debug("onFilterQuery: ", table, filters);
        // since filters is an array containing key, value pairs, lets parse them
        for (var i = 0; i<filters.length; i+=2) {
            var k = filters[i];
            var v = filters[i+1];

            if (k == mdbInstance._getTablePk(table)) { break; }

            assert(
                (mdbInstance.schema[table]['indexes'] && typeof(mdbInstance.schema[table]['indexes'][k]) != 'undefined') ||
                mdbInstance._getTablePk(table) != k,
                'tried to execute a search on a field which is not marked as index'
            );

            filters[i+1] = hasherFunc(JSON.stringify(v));
        };

        // logger.debug("filters:", filters);
    });

    // mdbInstance.bind("onModifyQuery", function(e, table, args) {
    //    logger.debug("onModifyQuery: ", table, args);
    //
    //    args.forEach(function(modificationObj) {
    //        if (modificationObj["firstName$v"]) {
    //            debugger;
    //        }
    //        simpleEncryptObjFunction(table, modificationObj);
    //    });
    //    logger.debug("modify:", table, args);
    // });
}
