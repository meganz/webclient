
if (!window.indexedDB)
    window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
if (!window.IDBKeyRange)
    window.IDBKeyRange = window.webkitIDBKeyRange || window.msIDBKeyRange;
if (!window.IDBTransaction)
    window.IDBTransaction = window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;

var mDBact, mDBv = 7;

// Turn off IndexedDB on mega.nz for now (need to investigate inconsistencies)
if ( 0 && indexedDB)
{
    var mDB=1;
    var request;
    var mDBloaded;
    var mDBStartError;

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
        if (act !== mDBact)
            return;
        localStorage[u_handle + '_mDBactive']=Date.now();
        setTimeout(mDBactive,2000,act);
    }

    function mDBstart()
    {
        function rOnError(event)
        {
            if (d) console.log('mDB error',event);
            if (mDB)
            {
                mDB=undefined;
                loadfm();
            }
        }

        if (localStorage[u_handle + '_mDBactive'] && parseInt(localStorage[u_handle + '_mDBactive'])+4000 > Date.now())
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

        setTimeout(function()
        {
            if (mDB === 1)
            {
                if (d) console.log('mDBstart timeout (2000ms), fetching live data');
                mDB=undefined;
                loadfm();
            }
        },2000);

        try {
            request = indexedDB.open("MEGA_" + u_handle,2);
        } catch(e) {
            if (!mDBStartError)
            {
                console.error('mDB.open error', e);
                mDBreload();
            }
            else rOnError(e);
            mDBStartError = 1;
            return;
        }
        mDBStartError = 0;
        request.onerror = rOnError;
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
            if (!mDB)
                return false;
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
            db.createObjectStore("f",   { keyPath: "h"});
            db.createObjectStore("ok",  { keyPath: "h"});
            db.createObjectStore("s",   { keyPath: "h_u"});
            db.createObjectStore("u",   { keyPath: "u"});
            db.createObjectStore("opc", { keyPath: "p"});
            db.createObjectStore("ipc", { keyPath: "p"});
            db.createObjectStore("ps",  { keyPath: "p"});
        };
    }

    var mDBqueue = {};

    function mDBadd(t,n) {
        var a = n;
        if (a.name && a.p !== 'contacts') delete a.name;
        if (a.ar && a.p !== 'contacts') delete a.ar;
        if (a.key) delete a.key;
        mDBaddQueue(t,{a:a});
    }

    var Qt;
    var mDBt = {};
    var mDBi = {};

    function mDBprocess()
    {
        if (!Qt) Qt = new Date().getTime();
        for (var t in mDBqueue)
        {
            if (!mDBi[t]) mDBi[t]=0;
            while (mDBi[t] < mDBqueue[t].length)
            {
                if (mDBt.t !== t)
                {
                    mDBt.t = t;
                    mDBt.transation = mDB.transaction([t], "readwrite");
                    mDBt.objectStore = mDBt.transation.objectStore(t);
                }
                var q = mDBqueue[t][mDBi[t]++];

                if (mDBi[t] == mDBqueue[t].length)
                {
                    delete mDBqueue[t];
                    delete mDBi[t];
                }

                if (q)
                {
                    var cmd = q.a ? 'put':'delete';
                    var request=mDBt.objectStore[cmd](q.d||q.a);
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

    if (typeof safari !== 'undefined')
    {
        var mDBprocess = function _Safari_mDBprocess()
        {
            function __mDBIterate(t, act, queue)
            {
                function __mDBNext() {
                    var e = queue.shift();
                    if (e) {
                        try {
                            var r = objectStore[act](e);
                        } catch(ex) {
                            // if (d) console.error('objectStore', ex);
                            delete mDBt.t;
                            queue.unshift(e);
                            return __mDBIterate(t, act, queue);
                        }
                        if (r) {
                            r.onsuccess = function()
                            {
                                if (parseInt(localStorage[u_handle + '_mDBcount']) > 0) {
                                    localStorage[u_handle + '_mDBcount']--;
                                }
                                // if (d) console.log('__mDBNext.success');
                                if ((queue.length % 80) == 0) Soon(__mDBNext);
                                else __mDBNext();
                            };
                            r.onerror = function(err)
                            {
                                if (d) console.log('__mDBNext.error',err);
                                Later(__mDBNext);
                            };
                            return;
                        }
                    }

                    Soon(mDBprocess);
                }
                // if (d) console.log('__mDBIterate', arguments);

                if (mDBt.t !== t)
                {
                    mDBt.t = t;
                    mDBt.transation = mDB.transaction([t], "readwrite");
                }
                var objectStore = mDBt.transation.objectStore(t);
                __mDBNext();
            }

            for (var t in mDBqueue)
            {
                var q = mDBqueue[t];

                for (var a in q)
                {
                    __mDBIterate(t, a, q[a]);
                    delete mDBqueue[t][a];
                    return;
                }
            }

            if (d) console.timeEnd('mDBprocess');
            mDBt = {};
            mDBqueue = {};
        };
        var mDBaddQueue = function _Safari_mDBaddQueue(t,obj)
        {
            if (!localStorage[u_handle + '_mDBcount']) {
                localStorage[u_handle + '_mDBcount']=0;
            }
            localStorage[u_handle + '_mDBcount']++;

            var act = obj.d ? 'delete':'put';
            if (!mDBqueue[t]) mDBqueue[t]={};
            if (!mDBqueue[t][act]) mDBqueue[t][act]=[];
            mDBqueue[t][act].push(obj.d||obj.a);

            if (mDBt.stc) clearTimeout(mDBt.stc);
            mDBt.stc = setTimeout(function() {
                if (!mDBt.t) {
                    if (d) console.time('mDBprocess');
                    mDBprocess();
                }
                delete mDBt.stc;
            }, 3100);
        };
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
        var fr, apn = [];
        var objectStore = mDB.transaction(t,'readonly').objectStore(t);
        objectStore.openCursor().onsuccess = function(event)
        {
            var rec = event.target.result;
            if (rec)
            {
                var n;

                try {
                    n = rec.value;
                } catch(e) {
                    if (d) console.error('mDBquery', t, e);
                }

                if (typeof n === 'undefined') fr = true;
                else if (t === 'f') {
                    if (n.sk) {
                        u_sharekeys[n.h] = crypto_process_sharekey(n.h,n.sk);
                    }
                    apn.push(n);
                }
                else if (t === 'ok')   process_ok([n]);
                else if (t === 'u')    M.addUser(n,1);
                else if (t === 's')    M.nodeShare(n.h,n,1);
                else if (t === 'opc')  M.addOPC(n,1);
                else if (t === 'ipc')  M.addIPC(n,1);
                else if (t === 'ps')   M.addPS(n,1);
                rec.continue();
            }
            else if ( fr )
            {
                if (d) console.log('mDBquery: forcing reload');
                mDBreload();
            }
            else
            {
                if (d) console.log('mDBloaded',t);
                mDBloaded[t]=1;
                function __mDB_Next() {
                    for (var dbt in mDBloaded)
                    {
                        if (mDBloaded[dbt] == 0)
                        {
                            mDBquery(dbt);
                            return false;
                        }
                    }
                    maxaction = localStorage[u_handle + '_maxaction'];
                    for (var i in M.d)
                    {
                        var entries=true;
                        break;
                    }
                    if (!maxaction || typeof entries == 'undefined') mDBreload();
                    else getsc(1);
                }
                if (apn.length) {
                    $.mDBIgnoreDB = true;
                    process_f(apn, function(hasMissingKeys) {
                        delete $.mDBIgnoreDB;
                        if (hasMissingKeys) {
                            mDBreload();
                        } else {
                            __mDB_Next();
                        }
                    }, 1);
                }
                else __mDB_Next();
            }
        };
    }

    function mDBclear(callback) {
        if (mDB && mDB.close) {
            mDB.close();
        }
        var dbreq = indexedDB.deleteDatabase("MEGA_" + u_handle);
        dbreq.callback = callback;
        dbreq.onsuccess = function() {
            DEBUG('dB deleted');
            if (dbreq.callback) {
                dbreq.callback();
            }
        };
    }

    function mDBreload()
    {
        if (mDB && mDB.close) mDB.close();
        mDB=2;
        setTimeout(function()
        {
            if (mDB === 2)
            {
                if (d) console.log('mDBreload timeout (2000ms), fetching live data');
                mDB=undefined;
                loadfm();
            }
        },2000);
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
    }

    function mDBrestart()
    {
        if (mDB)
        {
            delete localStorage[u_handle + '_mDBcount'];
            delete localStorage[u_handle + '_maxaction'];
            delete localStorage[u_handle + '_mDBactive'];
            mDBact = Math.random();
            mDBcls();
            Qt=undefined;
            request=undefined;
            mDB=1;
            mDBstart();
        }
    }

    function mDBcls()
    {
        mDBloaded = {'ok':0,'u':0, /*'f_sk':0,*/ 'f':0,'s':0, 'opc': 0, 'ipc': 0, 'ps': 0};
    }
    mDBcls();
}
