/**
 * This plugin is responsible for encrypting/decryption the data handled by MegaDB transparently
 *
 * @param mdbInstance {MegaDB}
 * @constructor
 */
var MegaDBEncryption = function(mdbInstance) {
    assert(u_privk, 'missing private key');

    var self = this;

    var logger = self.logger = MegaLogger.getLogger("mDBEncryptionPlugin", {
        'dereferenceObjects': true
    }, mdbInstance.logger);

    // helepr funcs (key cache loader + hasher)

    var _encDecKeyCache = null;
    var getEncDecKey = function() {
        assert(u_handle, 'missing u_handle');
        assert(u_privk, 'missing u_privk');

        // user's already loaded, static key (e.g. u_privk)
        if(_encDecKeyCache) {
            return _encDecKeyCache;
        } else if (typeof(localStorage["mdbk_" + u_handle]) != "undefined") {
            _encDecKeyCache = stringcrypt.stringDecrypter(localStorage["mdbk_" + u_handle], u_privk);
            return _encDecKeyCache;
        } else {
            _encDecKeyCache = stringcrypt.newKey();
            localStorage["mdbk_" + u_handle] = stringcrypt.stringEncrypter(_encDecKeyCache, u_privk);
            return _encDecKeyCache;
        }
    };

    var hasherFunc = (function() {
        var H = asmCrypto.SHA256.base64;
        var hCache = H(u_pubEd25519 + getEncDecKey());
        return function(v) {
            return H(v + hCache);
        }
    })();

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
            if(k == "__origObj" || k == "id" ||  k === mdbInstance._getTablePk(table)) { return; }

            if(mdbInstance.schema[table]['indexes'] && mdbInstance.schema[table]['indexes'][k]) {
                obj[k + "$v"] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey());
                obj[k] = hasherFunc(JSON.stringify(v));
            } else {
                obj[k] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey());
            }
            //logger.debug("encrypted: {k=", k, "v=", v, "$v=", obj[k + "$v"], "objk=", obj[k], "}");
        })
    };

    /**
     * Demo decrypt func
     *
     * @param table {string} you can use this argument to do different type of encryption for the different db tables
     * @param obj {Object} actual object to be encrypted
     */
    var simpleDecryptObjFunction = function(table, obj) {
        if(obj.__origObj) { // restore if available in plain text
            Object.keys(obj.__origObj).forEach(function(k) {
                var v = obj.__origObj[k];
                if(k == "__origObj") { return; }

                obj[k] = v;
            });
        } else { // no orig obj, decrypt please
            var decryptedKeys = [];
            Object.keys(obj).forEach(function (k) {
                var v = obj[k];
                if (k == "__origObj" || k == "id" || k.substr(-2) == "$v" || k === mdbInstance._getTablePk(table)) {
                    return;
                }

                if(mdbInstance.schema[table]['indexes'] && mdbInstance.schema[table]['indexes'][k] && obj[k + "$v"] && decryptedKeys.indexOf(k) === -1) {
                    obj[k] = JSON.parse(stringcrypt.stringDecrypter(obj[k + "$v"], getEncDecKey()));
                    delete obj[k + "$v"];
                    decryptedKeys.push(k);
                } else {
                    try {
                        obj[k] = stringcrypt.stringDecrypter(v, getEncDecKey());
                        if(obj[k] == "undefined") {
                            obj[k] = undefined;
                        } else {
                            obj[k] = JSON.parse(obj[k]);
                        }
                    } catch(e) {
                        if(e instanceof TypeError) { // TypeError is caused when the data stored in the db is NOT encrypted.
                            obj[k] = v;
                        } else {
                            throw e;
                        }
                    }
                }
                //logger.debug("decrypted: ", k, v, obj[k + "$v"], obj[k]);
            });
        }
    };


    /**
     * attach those functions to the specific event handlers
     */
    mdbInstance.bind("onBeforeAdd", function(e, table, obj) {
        logger.debug("onBeforeAdd: ", table, obj);

        e.returnedValue = [table, clone(obj)];
        simpleEncryptObjFunction(table, e.returnedValue[1]);
    });

    mdbInstance.bind("onBeforeUpdate", function(e, table, k, obj, isQuerysetUpdate) {
        //logger.debug("onBeforeUpdate: ", table, k, obj);

        e.returnedValue = [table, k, clone(obj), isQuerysetUpdate];

        if (!isQuerysetUpdate) {
            simpleEncryptObjFunction(table, e.returnedValue[2]);
        } else {
            simpleDecryptObjFunction(table, e.returnedValue[2]);
        }
    });

    mdbInstance.bind("onDbRead", function(e, table, obj) {
        //logger.debug("onDbRead: ", table, obj);

        try {
            simpleDecryptObjFunction(table, obj);
        } catch(exc) {
            if(exc.message == "data integrity check failed") {
                logger.error("data integrity check failed for (will be removed): ", table, obj.id, obj);
                mdbInstance.server.remove(table, obj[mdbInstance._getTablePk(table)]);
                e.stopPropagation();
                if(!e.data) {
                    e.data = {};
                }
                if(!e.data.errors) {
                    e.data.errors = [];
                }
                e.data.errors.push(exc);
            } else {
                logger.error("onDbRead failed: ", exc, exc.stack ? exc.stack : undefined);
            }
        }


    });

    mdbInstance.bind("onFilterQuery", function(e, table, filters) {
        logger.debug("onFilterQuery: ", table, filters);
        // since filters is an array containing key, value pairs, lets parse them
        for(var i = 0; i<filters.length; i+=2) {
            var k = filters[i];
            var v = filters[i+1];

            if(k == mdbInstance._getTablePk(table)) { break; }

            assert(
                (mdbInstance.schema[table]['indexes'] && typeof(mdbInstance.schema[table]['indexes'][k]) != 'undefined') ||
                mdbInstance._getTablePk(table) != k,
                'tried to execute a search on a field which is not marked as index'
            );

            filters[i+1] = hasherFunc(JSON.stringify(v));
        };

        logger.debug("filters:", filters);
    });

    //mdbInstance.bind("onModifyQuery", function(e, table, args) {
    //    logger.debug("onModifyQuery: ", table, args);
    //
    //    args.forEach(function(modificationObj) {
    //        if(modificationObj["firstName$v"]) {
    //            debugger;
    //        }
    //        simpleEncryptObjFunction(table, modificationObj);
    //    });
    //    logger.debug("modify:", table, args);
    //});
};
