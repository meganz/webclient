
var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

var mDBact,mDBv=4;

if (indexedDB)
{
	var mDB=1;
	var request;

	function mDBfetch()
	{
		if (d) console.log('mDBfetch()');
		mDBcount('f',function(c)
		{
			if (c == 0)
			{
				delete localStorage[u_handle + '_mDBcount'];
				mDBt = {};
				mDBqueue={};
				loadfm();
			}
			else mDBreload();
		});
	}
	
	function mDBactive(act)
	{
		if (act !== mDBact) return;
		localStorage[u_handle + '_mDBactive']=new Date().getTime();
		setTimeout(mDBactive,500,act);
	}

	function mDBstart()
	{
		if (localStorage[u_handle + '_mDBactive'] && parseInt(localStorage[u_handle + '_mDBactive'])+1000 > new Date().getTime())
		{	
			if (d) console.log('existing mDB session, fetch live data');
			mDB=undefined;
			loadfm();
			return;
		}
		mDBact = Math.random();		
		mDBactive(mDBact);	
		loadingDialog.show();
		if (d) console.log('mDBstart()');
		request = indexedDB.open("MEGA_" + u_handle,2);
		request.onerror = function(event)
		{
			if (d) console.log('mDB error',event);
			if (mDB)
			{
				mDB=undefined;
				loadfm();
			}
		};
		request.onblocked = function(event)
		{
			if (d) console.log('mDB blocked',event);
			if (mDB)
			{
				mDB=undefined;
				loadfm();
			}
		}
		request.onsuccess = function(event)
		{	
			if (!mDB) return false;
			mDB=request.result;
			if (localStorage[u_handle + '_mDBcount'] && (!localStorage[u_handle + '_mDBv'] || parseInt(localStorage[u_handle + '_mDBv']) < mDBv))
			{
				if (d) console.log('mDB version change, fetch live site for new mDB');
				localStorage[u_handle + '_mDBv']=mDBv;
				mDBact=false;
				mDBreload();
				return false;
			}	
			if (d) console.log('mDB success');			
			if (localStorage[u_handle + '_mDBcount'] && localStorage[u_handle + '_mDBcount'] == 0 && localStorage[u_handle + '_maxaction'])
			{
				mDBcount('f',function(c)
				{
					if (c == 0) mDBfetch();
					else
					{
						loadingDialog.show();
						mDBquery('ok');
					}
				});
			}
			else
			{
				if (d) console.log('fetching live data');
				mDBfetch();
			}
			
		};
		request.onupgradeneeded = function(event)
		{
			if (d) console.log('onupgradeend');
			var db = event.target.result;
			db.createObjectStore("f",  { keyPath:  "h"});
			db.createObjectStore("ok", { keyPath:  "h"});
			db.createObjectStore("s",  { keyPath:  "h_u"});
			db.createObjectStore("u",  { keyPath:  "u"});		
		};

		setTimeout(function()
		{
			if (mDB === 1)
			{
				if (d) console.log('mDBstart timeout (2000ms), fetching live data');
				mDB=undefined;
				loadfm();
			}
		},2000);
	}

	var mDBqueue = {};

	function mDBadd(t,n)
	{	
		var a = n;
		if (a.name && a.p !== 'contacts') delete a.name;
		if (a.ar && a.p !== 'contacts') delete a.ar;
		if (a.key) delete a.key;
		mDBaddQueue(t,{a:a});
	}

	var Qt;
	var mDBt = {};

	function mDBprocess()
	{	
		if (!Qt) Qt = new Date().getTime();
		for (var t in mDBqueue)
		{
			for (var i in mDBqueue[t])
			{
				if (mDBqueue[t][i])
				{
					if (mDBt.t !== t)
					{
						mDBt.t = t;
						mDBt.transation = mDB.transaction([t], "readwrite");
					}
					var objectStore = mDBt.transation.objectStore(t);
					if (mDBqueue[t][i].a) var request=objectStore.put(mDBqueue[t][i].a);
					else if (mDBqueue[t][i].d) var request=objectStore.delete(mDBqueue[t][i].d);
					request.onsuccess = function(event)
					{
						if (parseInt(localStorage[u_handle + '_mDBcount']) > 0) localStorage[u_handle + '_mDBcount']--;
						mDBprocess();
					};
					request.onerror = function(event)
					{
						if (d) console.log('error',event);
						mDBprocess();
					};
					delete mDBqueue[t][i];
					return;
				}
			}
		}
		if (d) console.log('Qt',Qt-new Date().getTime());
		mDBt = {};
		mDBqueue={};
	}

	function mDBaddQueue(t,obj)
	{
		if (!localStorage[u_handle + '_mDBcount']) localStorage[u_handle + '_mDBcount']=0;
		localStorage[u_handle + '_mDBcount']++;
		if (!mDBqueue[t]) mDBqueue[t]=[];
		mDBqueue[t].push(obj);
		if (!mDBt.t) mDBprocess();
	}

	function mDBdel(t,id)
	{
		mDBaddQueue(t,{d:id});
	}

	function mDBcount(t,callback)
	{
		var request = mDB.transaction([t], "readwrite") .objectStore(t).count();
		request.onsuccess = function(event)
		{
			if (d) console.log('mDBcount',event.target.result);
			if (callback) callback(event.target.result);
		};
		request.onerror = function()
		{
			mDBfetch();
		};
	}

	function mDBquery(t)
	{
		if (d) console.log('mDBquery()');
		var dt = t;
		if (t == 'f_sk') dt='f';
		var objectStore = mDB.transaction(dt,'readonly').objectStore(dt);
		objectStore.openCursor().onsuccess = function(event)
		{
			var rec = event.target.result;
			if (rec)
			{
				if (t == 'ok') process_ok([rec.value]);
				else if (t == 'f') M.addNode(rec.value,1);
				else if (t == 'f_sk')
				{
					var n = rec.value;
					if (n.sk) u_sharekeys[n.h] = crypto_process_sharekey(n.h,n.sk);
				}
				else if (t == 'u') M.addUser(rec.value,1);
				else if (t == 's') M.nodeShare(rec.value.h,rec.value,1);
				rec.continue();
			}
			else
			{
				if (d) console.log('mDBloaded',t);
				mDBloaded[t]=1;
				for (var dbt in mDBloaded)
				{
					if (mDBloaded[dbt] == 0)
					{
						mDBquery(dbt);
						return false;
					}
				}
				maxaction = localStorage[u_handle + '_maxaction'];
				getsc(1);
			}
		};
	}

	function mDBclear(callback)
	{
		mDB.close();
		var dbreq= indexedDB.deleteDatabase("MEGA_" + u_handle);
		dbreq.callback = callback;
		dbreq.onsuccess = function(event)
		{			
			if (d) console.log('db deleted');
			if (dbreq.callback) dbreq.callback();
		};
	}

	function mDBreload()
	{
		mDB.close();
		mDB=2;
		var dbreq= indexedDB.deleteDatabase("MEGA_" + u_handle);
		dbreq.onsuccess = function(event)
		{
			if (d) console.log('db deleted');
			mDBrestart();
		};
		dbreq.onerror = function(event)
		{
			mDBrestart();
		};
		setTimeout(function()
		{
			if (mDB === 2)
			{
				if (d) console.log('mDBreload timeout (2000ms), fetching live data');
				mDB=undefined;
				loadfm();
			}
		},2000);
	}

	function mDBrestart()
	{
		if (mDB)
		{
			delete localStorage[u_handle + '_mDBcount'];
			delete localStorage[u_handle + '_maxaction'];
			mDBloaded = {'ok':0,'u':0,'f_sk':0,'f':0,'s':0};
			Qt=undefined;
			request=undefined;
			mDB=1;
			mDBstart();
		}
	}

	var mDBloaded = {'ok':0,'u':0,'f_sk':0,'f':0,'s':0};
}