
var mIDBPlaceHolder = false;

(function(scope) {
	var nsIDOMStorage, nsIDOMSesStorage,
		uri = "https://mega.co.nz/",
		inPrivateBrowsing,
		storageURI,
		principal;
	
	try {
		const { PrivateBrowsingUtils } = Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm", {});
		if ((inPrivateBrowsing = PrivateBrowsingUtils.isWindowPrivate(scope))) {
			uri = uri.replace('//','//priv' + (Math.random() * Date.now() & 0x7ffffe).toString(16) + '.');
			scope.addEventListener('unload', e => nsIDOMStorage.clear(), false);
		}
	}
	catch(e) {
		Cu.reportError(e);
	}
	
	storageURI = uri.replace(/[^\w]+/g, '-');
	uri = Cc["@mozilla.org/network/io-service;1"]
			.getService(Ci.nsIIOService)
				.newURI(uri, "", null);
	
	principal = Cc["@mozilla.org/scriptsecuritymanager;1"]
				.getService(Ci.nsIScriptSecurityManager)
					.getCodebasePrincipal(uri);
	
	try {
		nsIDOMStorage = Cc["@mozilla.org/dom/localStorage-manager;1"]
			.getService(Ci.nsIDOMStorageManager)
			.createStorage(scope, principal, storageURI);
	}
	catch(e) {
		nsIDOMStorage = Cc["@mozilla.org/dom/storagemanager;1"]
			.getService(Ci.nsIDOMStorageManager)
			.getLocalStorageForPrincipal(principal, storageURI);
	}
	try {
		nsIDOMSesStorage = Cc["@mozilla.org/dom/sessionStorage-manager;1"]
			.getService(Ci.nsIDOMStorageManager)
			.createStorage(scope, principal, "");
	}
	catch(e) {}
	
	var nsIDOMStorageProperty = {
		value: nsIDOMStorage,
		enumerable: true,
		configurable: false,
		writable: false
	};
	
	Object.defineProperty(scope, "localStorage", nsIDOMStorageProperty);
	if (nsIDOMSesStorage) {
		nsIDOMStorageProperty.value = nsIDOMSesStorage;
	}
	Object.defineProperty(scope, "sessionStorage", nsIDOMStorageProperty);
	
	function domStorageBridge(aSubject, aTopic, aData) {
		if (aTopic === 'dom-storage2-changed'
			&& aData === 'localStorage'
			&& aSubject.url === storageURI) {
				scope.dispatchEvent(aSubject);
		}
	}
	Services.obs.addObserver(domStorageBridge, "dom-storage2-changed", false);
	window.addEventListener('unload', e => Services.obs.removeObserver(domStorageBridge, "dom-storage2-changed"));
	
	if (inPrivateBrowsing) {
		scope.Incognito = true;
		Object.defineProperty(scope, "indexedDB", { value : undefined });
		if (scope.d) console.log('In private browsing mode...', storageURI);
	}
	else try {
		var nsIIDBManager = Cc["@mozilla.org/dom/indexeddb/manager;1"]
			.getService(Ci.nsIIndexedDatabaseManager);
		
		mIDBPlaceHolder = {};
		nsIIDBManager.initWindowless(mIDBPlaceHolder);
		
		Object.defineProperty(scope, "indexedDB", { value : mIDBPlaceHolder.indexedDB });
		Object.defineProperty(scope, "IDBKeyRange", { value : mIDBPlaceHolder.IDBKeyRange });
		
	} catch(e) {
		// Bug 921478 - 28.0a1 20131120062258
		
		try {
			Cu.importGlobalProperties(['indexedDB']);
		} catch(e) {
			// Firefox 39.0a1 20150329030238
		}
		
		if (typeof indexedDB !== 'undefined') {
			try {
				Object.defineProperty(scope, "indexedDB",
				{
					value : Object.freeze({
						open: indexedDB.openForPrincipal.bind(indexedDB, principal),
						openForPrincipal: indexedDB.openForPrincipal.bind(indexedDB),
						deleteDatabase: indexedDB.deleteForPrincipal.bind(indexedDB, principal),
						cmp: indexedDB.cmp.bind(indexedDB)
					})
				});
			} catch(e) {
				Cu.reportError(e);
			}
		}
	}
})(self);
