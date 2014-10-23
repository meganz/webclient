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
            if(k == "__origObj") { return; }
            else if(k == "id") { return; }

            if(mdbInstance.schema[table]['indexes'][k]) {
                obj[k + "$v"] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey());
                obj[k] = hasherFunc(JSON.stringify(v));
            } else {
                obj[k] = stringcrypt.stringEncrypter(JSON.stringify(v), getEncDecKey());
            }
            logger.debug("encrypted: {k=", k, "v=", v, "$v=", obj[k + "$v"], "objk=", obj[k], "}");
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
                if (k == "__origObj" || k == "id" || k.substr(-2) == "$v") {
                    return;
                }

                if(mdbInstance.schema[table]['indexes'][k] && obj[k + "$v"] && decryptedKeys.indexOf(k) === -1) {
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
                        if(e instanceof TypeError) {
                            obj[k] = v;
                        } else {
                            throw e;
                        }
                    }
                }
                logger.debug("decrypted: ", k, v, obj[k + "$v"], obj[k]);
            });
        }
    };


    /**
     * attach those functions to the specific event handlers
     */
    mdbInstance.bind("onBeforeAdd", function(e, table, obj) {
        logger.debug("onBeforeAdd: ", table, obj);

        obj.__origObj = clone(obj); // safe reference of the orig obj, so that we can easily restore it, after its
                                    // inserted

        simpleEncryptObjFunction(table, obj);
    });

    mdbInstance.bind("onAfterAdd", function(e, table, obj, addFuncReturnValue) {
        logger.debug("onAfterAdd: ", table, obj, addFuncReturnValue);


        simpleDecryptObjFunction(table, obj);
    });

    mdbInstance.bind("onBeforeUpdate", function(e, table, k, obj, isQuerysetUpdate) {
        logger.debug("onBeforeUpdate: ", table, obj);

        if (!isQuerysetUpdate) {
            obj.__origObj = clone(obj); // safe reference of the orig obj, so that we can easily restore it, after its
                                        // inserted
            simpleEncryptObjFunction(table, obj);
        } else {
            simpleDecryptObjFunction(table, obj);
        }


    });
    mdbInstance.bind("onAfterUpdate", function(e, table, k, obj, addFuncReturnValue) {
        logger.debug("onAfterAdd: ", table, obj, addFuncReturnValue);

        simpleDecryptObjFunction(table, obj);
    });

    mdbInstance.bind("onDbRead", function(e, table, obj) {
        logger.debug("onDbRead: ", table, obj);

        simpleDecryptObjFunction(table, obj);

    });

    mdbInstance.bind("onFilterQuery", function(e, table, filters) {
        logger.debug("onFilterQuery: ", table, filters);
        // since filters is an array containing key, value pairs, lets parse them
        for(var i = 0; i<filters.length; i+=2) {
            var k = filters[i];
            var v = filters[i+1];

            if(k == "id") { return; }

            assert(typeof(mdbInstance.schema[table]['indexes'][k]) != 'undefined', 'tried to execute a search ' +
            'on a field which is not marked as index');

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
