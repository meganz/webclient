
var mIDBPlaceHolder = false;

(function(scope) {
	var nsIDOMStorage,
		uri = Cc["@mozilla.org/network/io-service;1"]
			.getService(Ci.nsIIOService)
			.newURI("https://mega.co.nz/", "", null),
	
	principal = Cc["@mozilla.org/scriptsecuritymanager;1"]
		.getService(Ci.nsIScriptSecurityManager)
			.getCodebasePrincipal(uri);
	
	try
	{
		nsIDOMStorage = Cc["@mozilla.org/dom/localStorage-manager;1"]
			.getService(Ci.nsIDOMStorageManager).createStorage(principal, "");
	}
	catch(e)
	{
		nsIDOMStorage = Cc["@mozilla.org/dom/storagemanager;1"]
			.getService(Ci.nsIDOMStorageManager)
			.getLocalStorageForPrincipal(principal, "");
	}
	
	var nsIDOMStorageProperty = Object.freeze({
		value: nsIDOMStorage,
		enumerable: true,
		configurable: false,
		writable: false
	});
	
	Object.defineProperty(scope, "localStorage", nsIDOMStorageProperty);
	Object.defineProperty(scope, "sessionStorage", nsIDOMStorageProperty);
	
	try {
		var nsIIDBManager = Cc["@mozilla.org/dom/indexeddb/manager;1"]
			.getService(Ci.nsIIndexedDatabaseManager);
		
		mIDBPlaceHolder = {};
		nsIIDBManager.initWindowless(mIDBPlaceHolder);
		
		Object.defineProperty(scope, "indexedDB", Object.freeze({ value : mIDBPlaceHolder.indexedDB }));
		Object.defineProperty(scope, "IDBKeyRange", Object.freeze({ value : mIDBPlaceHolder.IDBKeyRange }));
		
	} catch(e) {
		// Bug 921478 - 28.0a1 20131120062258
		
		Cu.importGlobalProperties(['indexedDB']);
	}
})(self);
