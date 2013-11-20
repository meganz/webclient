

var dl_fs, dl_fw;

var dl_queue = [];
var dl_queue_num = 0;
var dl_retryinterval = 1000;


var dl_method;
// 0: Filesystem API (Chrome / Firefox Extension polyfill
// 1: Adobe Flash SWF Filewriter (fallback for old browsers)
// 2: BlobBuilder (IE10/IE11)
// 3: Deprecated MEGA Firefox Extension
// 4: Arraybuffer/Blob Memory Based
// 5: MediaSource (experimental streaming solution)
// 6: IndexedDB blob based (Firefox 20+)


var blob_urls = [];


var dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined');
var dl_flash_connections = 0;
var dl_flash_progress;

var dl_instance = 0;

var dl_blob;

var dl_blob_array = [];

var dl_key;
var dl_keyNonce;
var dl_macs;
var dl_aes;

var dl_filename;
var dl_filesize;
var dl_geturl;
var dl_bytesreceived = 0;
var dl_chunks = [];
var dl_chunksizes;

var dl_storagetype = 0;

var dl_req_storage = false;

var downloading = false;

var dl_maxSlots = 4;
if (localStorage.dl_maxSlots) dl_maxSlots = localStorage.dl_maxSlots;

var dl_xhrs;
var dl_pos;
var dl_progress;
var dl_lastactive;

var dl_cipherq;
var dl_cipherqlen;

var dl_plainq;
var dl_plainqlen;

var dl_lastquotawarning;

var dl_maxWorkers = 4;
var dl_workers;
var dl_workerbusy;

var dl_quotabytes = 0;

var dl_write_position;

var dl_timeout;

var dl_id;

var dl_chunklen;

var skipcheck = 0;


var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;


var use_idb = false;



var dl_db;

function dl_dispatch_chain()
{
	if (downloading)
	{
		dl_dispatch_read();
		dl_dispatch_decryption();
		dl_dispatch_write();		
	}
}

function dl_dispatch_decryption()
{
	var p;

	if (use_workers)
	{
		for (var id = dl_maxWorkers; id--; )
		{
			if (!dl_workerbusy[id]) break;
		}

		if (id >= 0)
		{		
			for (p in dl_cipherq)
			{
				dl_workerbusy[id] = 1;

				if (typeof(dl_workers[id]) == "object")
				{
					dl_workers[id].terminate();
					dl_workers[id] = null;
					delete dl_workers[id];
				}
				
				dl_workers[id] = new Worker('decrypter.js');
				dl_workers[id].postMessage = dl_workers[id].webkitPostMessage || dl_workers[id].postMessage;
				dl_workers[id].id = id;
				dl_workers[id].instance = dl_instance;

				dl_workers[id].onmessage = function(e)
				{				
					if (this.instance == dl_instance)
					{
						if (typeof(e.data) == "string")
						{
							if (e.data[0] == '[') dl_macs[this.dl_pos] = JSON.parse(e.data);
							else if (d) console.log("WORKER" + this.id + ": '" + e.data + "'");
						}
						else
						{
							var databuf = new Uint8Array(e.data);

							if (d) console.log("WORKER" + this.id + ": Received " + databuf.length + " decrypted bytes at " + this.dl_pos);

							if (dl_zip && !this.dl_pos)
							{
								var prefix = ZIPheader(dl_queue[dl_queue_num].p+dl_queue[dl_queue_num].n,dl_queue[dl_queue_num].size,dl_queue[dl_queue_num].t).fileHeader;
								var prefixlen = prefix.length;

								if (dl_zip.suffix)
								{
									dl_zip.pos += dl_zip.suffix.length;

									t = new Uint8Array(dl_zip.suffix.length+prefix.length);
									
									t.set(dl_zip.suffix);
									t.set(prefix,dl_zip.suffix.length);
									
									prefix = t;
								}

								dl_zip.headerpos = dl_zip.pos;

								dl_zip.pos += prefixlen+dl_queue[dl_queue_num].size;

								var i, t = new Uint8Array(databuf.length+prefix.length);

								t.set(prefix);
								t.set(databuf,prefix.length);

								dl_chunklen[this.dl_pos] = databuf.length;
								databuf = t;
							}

							dl_plainq[this.dl_pos] = databuf;
							dl_plainqlen++;

							dl_workerbusy[this.id] = 0;

							dl_dispatch_chain();
						}
					}
				};

				dl_workers[id].postMessage(dl_keyNonce);

				if (d) console.log("WORKER" + id + ": Queueing " + dl_cipherq[p].length + " bytes at " + p);
				
				dl_workers[id].dl_pos = parseInt(p);
				dl_workers[id].postMessage(dl_workers[id].dl_pos/16);
				dl_workers[id].postMessage(dl_cipherq[p]);

				delete dl_cipherq[p];
				dl_cipherqlen--;
				
				break;
			}
		}
		else if (d) console.log("All worker threads are busy now.");
	}
	else
	{
		for (p in dl_cipherq)
		{
			if (d) console.log("Decrypting pending block at " + p + " without workers...");

			dl_macs[p] = decrypt_ab_ctr(dl_aes,dl_cipherq[p],[dl_key[4],dl_key[5]],p);

			dl_plainq[p] = dl_cipherq[p];
			delete dl_cipherq[p];

			dl_cipherqlen--;
			dl_plainqlen++;
			
			break;
		}
	}
}

function dl_resume(id)
{
	if (downloading) dl_dispatch_chain();
	else
	{
		if (id) for (var i = dl_queue.length; i--; ) if (id == dl_queue[i].id)
		{
			dl_queue_num = i;
			break;
		}
		startdownload();
	}
}

var tt;

var dl_zip;
var dl_writing;

function dl_dispatch_write()
{
	if (dl_filesize == -1) return;

	if ((!document.getElementById('dlswf_' + dl_id)) && (dl_method == 1))
	{
		if (d) console.log("Flash element not yet initialized");
		return;	
	}
	
	if (dl_writing)
	{
		if (d) console.log("Writer busy");
		return;
	}

	var p = -1;

	// enforce linearity if zipping or not using FileWriter
	if (dl_plainq[dl_write_position])
	{
		p = dl_write_position;
	}
	else if (d) console.log("Plaintext at " + dl_write_position + " still missing");

	if (p < 0)
	{
		dl_checklostchunk();
		return;
	}
	
	dl_write_block();
}

function dl_write_block()
{
	if (d) console.log("Writing " + dl_plainq[dl_write_position].length + " bytes of file data at dl_pos " + dl_write_position);
	if (dl_zip)
	{
		if (dl_zip.crc32pos != dl_write_position)
		{
			dl_zip.crc32 = crc32(dl_plainq[dl_write_position],dl_zip.crc32,dl_chunklen[dl_write_position] || dl_plainq[dl_write_position].length);
			dl_zip.crc32pos = dl_write_position;
		}
	}

	switch (dl_method)
	{
		case 0:		// Filesystem API (Chrome / Firefox Extension polyfill
			dl_writing = true;
			dl_fw.instance = dl_instance;			
			dl_fw.targetpos = dl_fw.position+dl_plainq[dl_write_position].length;
			dl_fw.write(new Blob([dl_plainq[dl_write_position]]));
			break;
			
		case 1:		// Adobe Flash SWF Filewriter (fallback for old browsers)
			var j, k;
			var len;
			
			if (have_ab) len = dl_plainq[dl_write_position].length;
			else len = dl_plainq[dl_write_position].buffer.length;

			if (have_ab) subdata = ab_to_base64(dl_plainq[dl_write_position]);
			else subdata = base64urlencode(dl_plainq[dl_write_position].buffer);
			
			document.getElementById('dlswf_' + dl_id).flashdata(dl_id,subdata);
			dl_ack_write();
			break;
			
		case 2:		// BlobBuilder IE10
			if (have_ab) dl_blob.append(dl_plainq[dl_write_position]);
			else dl_blob.append(dl_plainq[dl_write_position].buffer);
			dl_ack_write();
			break;
			
		case 3:		// Deprecated Firefox Extension
			console.log(dl_write_position);
		
			ffe_writechunk(ab_to_str(dl_plainq[dl_write_position]),dl_write_position);
			dl_ack_write();
			break;
	
		case 4:		// Blob Memory Based Downloading
			dl_blob_array.push(new Blob([dl_plainq[dl_write_position]]));
			dl_ack_write();
			break;			
		case 5:		// MediaSource (experimental)
			try
			{	
				sourceBuffer.append(dl_plainq[dl_write_position]);
			}
			catch(e)
			{
				console.log(e);		
			}
			dl_ack_write();
			break;

		case 6:		// IndexedDB blob based (Firefox 20+)
			dl_writing = true;
			DBWriter.write(dl_write_position);
	}
}

function dl_killzip(id)
{
	for (var i = dl_queue.length; i--; ) if (id == dl_queue[i].zipid)
		dl_queue[i] = false;
}

function dl_ack_write()
{
	if (dl_write_position < 0)
	{
		// zip suffix
		dl_complete();
		dl_killzip(dl_zip.id);
		return startdownload();
	}

	if (dl_queue[dl_queue_num].data) new Uint8Array(dl_queue[dl_queue_num].data,dl_write_position,dl_plainq[dl_write_position].length).set(dl_plainq[dl_write_position]);

	var t = dl_chunklen[dl_write_position] || (have_ab ? dl_plainq[dl_write_position].length : dl_plainq[dl_write_position].buffer.length);
	
	delete dl_plainq[dl_write_position];
	dl_plainqlen--;
	
	dl_write_position += t;

	dl_dispatch_chain();	
}

function dl_write_failed(e)
{
	console.log("WRITE FAILED: " + e);

	if (dl_write_position < 0)
	{
		// zip trailer - retry
		dl_setTimeout(dl_write_block,1000);
	}
	else dl_dispatch_chain();
}

function dl_settimer(timeout,target)
{
	if (d) console.log(timeout < 0 ? "Stopping timer" : "Starting timer " + timeout);
	if (dl_timeout) clearTimeout(dl_timeout);
	if (timeout >= 0) dl_timeout = setTimeout(target,timeout);
	else dl_timeout = undefined;
}

function dl_next()
{
	var zipid = dl_zip && dl_zip.id;
	var mi = -1;
	var t = new Date().getTime();
	var filesleft;
	var i;

	for (i = 0; i < dl_queue.length; i++) if (dl_queue[i] && !dl_queue[i].complete && (!zipid || zipid == dl_queue[i].zipid))
	{
		if (!dl_queue[i].mru)
		{
			mi = i;
			break;
		}

		if (dl_queue[i].retryafter && t < dl_queue[i].retryafter) continue;

		if (mi < 0 || dl_queue[i].mru < dl_queue[mi].mru) mi = i;
		else filesleft = 1;
	}

	if (mi >= 0)
	{
		if (!zipid && dl_queue[mi].zipid) dl_zip = { id : dl_queue[mi].zipid, dirData : [], pos : 0, headerpos : 0, suffix : '', name : dl_queue[mi].zipname, crc32pos : -1 };
		dl_queue[mi].mru = t;
		return mi;
	}

	if (filesleft) dl_settimer(5000,startdownload);
	else
	{
		if (zipid)
		{
			var t = [];
			var p = dl_zip.pos+dl_zip.suffix.length;

			t.push(dl_zip.suffix);
//			t.push(ZIPfolders(dl_zip.id,p));
			dl_zip.pos += t[0].length; //+t[1].length;

			for (i = 0; i < dl_zip.dirData.length; i++) t.push(dl_zip.dirData[i]);
			t.push(ZIPsuffix(p));

			var l = 0;
			for (i = t.length; i--; ) l += t[i].length;

			var b = new Uint8Array(l);

			l = 0;
			for (i = 0; i < t.length; i++)
			{
				b.set(t[i],l);
				l += t[i].length;
			}

			dl_plainq = { '-1' : b };
			dl_write_position = -1;
			dl_write_block(-1);
		}
		else dl_queue = [];
	
		return -1;
	}
}

// try to start download at dl_queue_num
// if that download is not available, loop through the whole dl_queue and try to start
// another one
function startdownload()
{
	if (downloading)
	{
		if (d) console.log("startdownload() called with active download");
		return;
	}
		
	if (dl_req_storage) return;

	dl_queue_num = dl_next();

	if (dl_queue_num < 0) return;

	dl_settimer(-1);

	downloading = true;

	dl_key = dl_queue[dl_queue_num].key;
	if (d) console.log("dl_key " + dl_key);		
	if (dl_queue[dl_queue_num].ph) dl_id = dl_queue[dl_queue_num].ph;
	else dl_id  = dl_queue[dl_queue_num].id;
	
	dl_geturl = '';

	dl_bytesreceived = 0;
	dl_chunksizes = [];

	dl_keyNonce = JSON.stringify([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7],dl_key[4],dl_key[5]]);

	dl_macs = {};

	dl_filesize = -1;

	dl_cipherq = [];
	dl_cipherqlen = 0;
	dl_plainq = [];
	dl_plainqlen = 0;
	dl_lastquotawarning = 0;
	dl_chunklen = {};
	
	dl_pos = Array(dl_maxSlots);
	dl_progress = Array(dl_maxSlots);
	dl_lastactive = Array(dl_maxSlots);

	if (!dl_legacy_ie)
	{
		dl_xhrs = Array(dl_maxSlots);

		for (var slot = dl_maxSlots; slot--; )
		{
			dl_xhrs[slot] = new XMLHttpRequest;			
			
			if (dl_xhrs[slot].overrideMimeType) dl_xhrs[slot].overrideMimeType('text/plain; charset=x-user-defined');
			
			dl_xhrs[slot].slot = slot;
			dl_pos[slot] = -1;
			dl_progress[slot] = 0;
		}
	}
	else
	{
		dl_flash_connections = 0;
		dl_flash_progress = {};
	}
	if (use_workers)
	{
		dl_workers = new Array(dl_maxWorkers);
		dl_workerbusy = new Array(dl_maxWorkers);

		for (var id = dl_maxWorkers; id--; ) dl_workerbusy[id] = 0;
	}
	else dl_aes = new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);	
	dl_write_position = 0;
	dl_getsourceurl(startdownload2);
}

function dl_renewsourceurl()
{
	dl_getsourceurl(dl_renewsourceurl2);
}

function dl_getsourceurl(callback)
{
	req = { a : 'g', g : 1, ssl : use_ssl };

	if (dl_queue[dl_queue_num].ph) req.p = dl_queue[dl_queue_num].ph;
	else if (dl_queue[dl_queue_num].id) req.n = dl_queue[dl_queue_num].id;
	
	api_req([req],{ callback : callback });
}

function dl_renewsourceurl2(res,ctx)
{
	if (typeof res == 'object')
	{
		if (typeof res[0] == 'number')
		{
			dl_reportstatus(dl_queue_num,res[0]);
		}
		else
		{
			if (res[0].g)
			{
				dl_geturl = res[0].g;
				dl_dispatch_chain()
				return;
			}
			else if (res[0].e) dl_reportstatus(dl_queue_num,res[0].e);
		}

		dl_queue[dl_queue_num].retryafter = new Date().getTime()+30000;
		startdownload();
	}
}
	
function dl_reportstatus(num,code)
{
	if (dl_queue[num])
	{
		dl_queue[num].lasterror = code;
		dl_queue[num].onDownloadError(dl_queue[num].id || dl_queue[num].ph,code);
	}
}

function startdownload2(res,ctx)
{
	if (typeof res == 'object')
	{
		if (typeof res[0] == 'number')
		{
			dl_reportstatus(dl_queue_num,res[0]);
		}
		else
		{
			if (res[0].d)
			{
				dl_reportstatus(dl_queue_num,res[0].d ? 2 : 1);
				dl_queue[dl_queue_num] = false;
			}
			else if (res[0].g)
			{
				var ab = base64_to_ab(res[0].at);
				var o = dec_attr(ab,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);

				if (typeof o == 'object' && typeof o.n == 'string')
				{
					if (have_ab && res[0].pfa && res[0].s <= 48*1048576 && is_image(o.n) && (!res[0].fa || res[0].fa.indexOf(':0*') < 0)) dl_queue[dl_queue_num].data = new ArrayBuffer(res[0].s);
					return dl_setcredentials(res[0].g,res[0].s,o.n);
				}
				else dl_reportstatus(dl_queue_num,EKEY);
			}
			else dl_reportstatus(dl_queue_num,res[0].e);
		}
	}
	else dl_reportstatus(dl_queue_num,EAGAIN);
	
	downloading = false;

	dl_queue_num++;

	dl_retryinterval *= 1.2;
	
	dl_settimer(dl_retryinterval,startdownload);
}

function dl_setcredentials(g,s,n)
{
	var i;
	var p;
	var pp;

	dl_geturl = g;
	dl_filesize = s;
	dl_filename = n;

	dl_chunks = [];
	
	p = pp = 0;
	for (i = 1; i <= 8 && p < dl_filesize-i*131072; i++)
	{
		dl_chunksizes[p] = i*131072;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	while (p < dl_filesize)
	{
		dl_chunksizes[p] = 1048576;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	if (!(dl_chunksizes[pp] = dl_filesize-pp))
	{
		delete dl_chunksizes[pp];
		delete dl_chunks[dl_chunks.length-1];
	}
	
	if (dl_zip)
	{
		delete dl_zip.crc32;
		dl_zip.crc32pos = -1;
	}
	
	if (!dl_zip || !dl_zip.open)
	{
		if (dl_zip) dl_zip.open = true;

		switch (dl_method)
		{
			case 0:	// Chrome (aync)
				dl_createtmp();
				return;
				
			case 2:
				dl_blob = new MSBlobBuilder();
				break;
				
			case 3:
				ffe_createtmp();
				break;
			
			case 4:
				dl_blob_array = [];
				break;				
			case 6:
				DBWriter.init();
		}
	}

	dl_run();
}
	
function dl_run()
{
	if (dl_filesize)
	{
		for (var i = dl_maxSlots; i--; ) dl_dispatch_read();
		dl_queue[dl_queue_num].onDownloadStart(dl_id,dl_filename,dl_filesize);
	}
	else dl_checklostchunk();
}

function dl_checklostchunk()
{
	var i, p;

	if (dl_write_position == dl_filesize)
	{
		if (dl_filesize)
		{
			var t = [];

			for (p in dl_macs) t.push(p);

			t.sort(function(a,b) { return parseInt(a)-parseInt(b) });

			for (i = 0; i < t.length; i++) t[i] = dl_macs[t[i]];

			var mac = condenseMacs(t,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);
		}

		if (skipcheck) console.log('Expected: [' + dl_key[6] + ',' + dl_key[7] + '], got: [' + (mac[0]^mac[1]) + ',' + (mac[2]^mac[3]) + ']');

		downloading = false;

		if (have_ab && !skipcheck && dl_filesize && (dl_key[6] != (mac[0]^mac[1]) || dl_key[7] != (mac[2]^mac[3])))
		{
			dl_reportstatus(dl_queue_num,EKEY);
			if (dl_zip) dl_killzip(dl_zip.id);
			else dl_queue[dl_queue_num] = false;			
		}
		else
		{
			if (dl_queue[dl_queue_num].data && !skipcheck) createnodethumbnail(dl_queue[dl_queue_num].id,new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]),++ul_faid,dl_queue[dl_queue_num].data);

			if (!dl_zip) dl_complete();
			else
			{
				t = ZIPheader(dl_queue[dl_queue_num].p+dl_queue[dl_queue_num].n,dl_queue[dl_queue_num].size,dl_queue[dl_queue_num].t,dl_zip.crc32,false,dl_zip.headerpos);
				dl_zip.suffix = t.dataDescriptor;
				dl_zip.dirData.push(t.dirRecord);
				dl_queue[dl_queue_num].complete = true;
				dl_queue[dl_queue_num].crc32 = dl_zip.crc32;
			}

			// release all downloads waiting for quota
			for (i = dl_queue.length; i--; ) if (dl_queue[i] && dl_queue[i].lasterror == EOVERQUOTA)
			{
				dl_reportstatus(i,0);
				delete dl_queue[i].retryafter;
			}

			dl_retryinterval = 1000;
		}

		startdownload();		
	}
}

function dl_complete()
{
	var name;
	var path; 

	if (dl_zip)
	{
		name = dl_zip.name;
		path = false;
	}
	else
	{
		name = dl_queue[dl_queue_num].n;
		path = dl_queue[dl_queue_num].p;
	}
	switch (dl_method)
	{
		case 0:
			if (dl_queue_num >= 0) dl_queue[dl_queue_num].onBeforeDownloadComplete();
			document.getElementById('dllink').download = name;
			document.getElementById('dllink').href = document.fileEntry.toURL();
			if (!is_chrome_firefox) document.getElementById('dllink').click();
			break;

		case 1:
			document.getElementById('dlswf_' + dl_id).flashdata(dl_id,'',name);
			break;

		case 2:
			navigator.msSaveOrOpenBlob(dl_blob.getBlob(),name);
			break;

		case 3:
			ffe_complete(name,path);
			break;
		case 4:
			document.getElementById('dllink').download = name;
			blob_urls.push(myURL.createObjectURL(new Blob(dl_blob_array)));
			document.getElementById('dllink').href = blob_urls[blob_urls.length-1];
			document.getElementById('dllink').click();
			setTimeout(function()
			{
				myURL.revokeObjectURL(document.getElementById('dllink').href);
			},100);
			break;
		case 6:
			DBWriter.servedl(name);
	}

	if (dl_zip)
	{
		fm_zipcomplete(dl_zip.id);
		dl_killzip(dl_zip.id);
		dl_zip = false;
	}
	else
	{
		dl_queue[dl_queue_num].onDownloadComplete(dl_id);
		dl_queue[dl_queue_num] = false;
	}
}

function dl_httperror(code)
{
	if (code == 509)
	{
		var t = new Date().getTime();
		if (!dl_lastquotawarning || t-dl_lastquotawarning > 55000)
		{
			dl_lastquotawarning = t;
			dl_reportstatus(dl_queue_num,code == 509 ? EOVERQUOTA : ETOOMANYCONNECTIONS);
			dl_settimer(60000,dl_dispatch_chain);
		}		
		return;
	}

	dl_reportstatus(dl_queue_num,EAGAIN);

	dl_retryinterval *= 1.2;

	if (!dl_write_position)
	{
		dl_cancel();

		dl_queue_num++;
		dl_settimer(dl_retryinterval,startdownload);
	}
	else
	{
		if (d) console.log("Network error, retrying in " + Math.floor(dl_retryinterval)/1000 + " seconds...");

		dl_settimer(dl_retryinterval,code == 509 ? dl_dispatch_chain : dl_renewsourceurl);
	}
}

function flash_dlprogress(p,numbytes)
{
	dl_flash_progress[p] = numbytes;
	dl_updateprogress();
}

function dl_flashdldata(p,data,httpcode)
{
	dl_flash_connections--;
	if (data == 'ERROR' || httpcode != 200)
	{
		dl_chunks.unshift(p);
		var t = new Date().getTime();
		dl_httperror(httpcode);
		return;
	}
	data = base64urldecode(data);
	delete dl_flash_progress[p];
	dl_bytesreceived += data.length;	
	dl_cipherq[p] = { buffer : data };
	dl_cipherqlen++;
	dl_updateprogress();
	dl_dispatch_chain();
}

function dl_dispatch_read()
{
	console.log('CHECK THIS',dl_cipherqlen+dl_plainqlen);

	if (uldl_hold || dl_cipherqlen+dl_plainqlen > dl_maxSlots+40) return;

	if (!dl_chunks.length) return;

	if (dl_legacy_ie)
	{
		if (dl_flash_connections > 6) return;
		
		dl_flash_connections++;
		
		var p = dl_chunks[0];
		dl_chunks.splice(0,1);
		flashdlchunk(p,dl_geturl + '/' + p + '-' + (p+dl_chunksizes[p]-1));
		return;
	}

	for (var slot = dl_maxSlots; slot--; )
		if (dl_pos[slot] == -1) break;

	if (slot < 0) return;

	dl_pos[slot] = dl_chunks[0];
	dl_chunks.splice(0,1);
	dl_xhrs[slot].instance = dl_instance;

	if (d) console.log("Requesting chunk " + dl_pos[slot] + "/" + dl_chunksizes[dl_pos[slot]] + " on slot " + slot + ", " + dl_chunks.length + " remaining");

	dl_xhrs[slot].onprogress = function(e) 
	{
		if (this.instance == dl_instance)
		{
			dl_lastactive[this.slot] = new Date().getTime();	
			if (!dl_lastquotawarning || new Date().getTime()-dl_lastquotawarning > 55000)
			{
				if (dl_pos[this.slot] >= 0)
				{
					dl_progress[this.slot] = e.loaded;					
					dl_updateprogress();
				}
			}
		}
	}
	
	dl_xhrs[slot].onreadystatechange = function()
	{
		if (this.instance == dl_instance)
		{
			dl_lastactive[this.slot] = new Date().getTime();
			
			if (this.readyState == this.DONE)
			{
				if (dl_pos[this.slot] >= 0)
				{
					if (this.response != null)
					{
						var p = dl_pos[this.slot];

						if (have_ab)
						{
							if (p >= 0)
							{
								if (navigator.appName != 'Opera') dl_bytesreceived += this.response.byteLength;
								dl_cipherq[p] = new Uint8Array(this.response);
							}
						}
						else
						{
							// non-IE
							if (p >= 0)
							{
								dl_bytesreceived += this.response.length;
								dl_cipherq[p] = { buffer : this.response };						
							}
						}

						dl_cipherqlen++;
						if (navigator.appName != 'Opera') dl_progress[this.slot] = 0;
						dl_updateprogress();

						dl_pos[this.slot] = -1;	
						dl_dispatch_chain();
					}
					else
					{
						if (dl_pos[this.slot] != -1)
						{
							dl_chunks.unshift(dl_pos[this.slot]);
							dl_pos[this.slot] = -1;	
							dl_httperror(this.status);
						}
					}
				}
			}
		}
	}

	var range = '/' + dl_pos[slot] + '-' + (dl_pos[slot]+dl_chunksizes[dl_pos[slot]]-1);
	
	if (dl_method) dl_xhrs[slot].open('POST', dl_geturl + range, true);
	else
	{
		// plug extreme Chrome memory leak
		var t = dl_geturl.lastIndexOf('/dl/');
		dl_xhrs[slot].open('POST', dl_geturl.substr(0,t+1));
		dl_xhrs[slot].setRequestHeader("MEGA-Chrome-Antileak",dl_geturl.substr(t) + range);
	}
	
	dl_xhrs[slot].responseType = have_ab ? 'arraybuffer' : 'text';
	dl_xhrs[slot].send();
}

var dl_prevprogress = 0;

var dl_lastprogress = 0;

function dl_updateprogress()
{

	
	
	var p = dl_bytesreceived;

	if (dl_queue[dl_queue_num])
	{
		if (dl_legacy_ie) for (var pp in dl_flash_progress) p += dl_flash_progress[pp];
		else for (var slot = dl_maxSlots; slot--; ) p += dl_progress[slot];
		
		
		if (dl_lastprogress+250 > new Date().getTime()) return false;
		else dl_lastprogress=new Date().getTime();

		dl_queue[dl_queue_num].onDownloadProgress(dl_id, p, dl_filesize, dl_xr.update(p-dl_prevprogress));

		dl_prevprogress = p;
	}
}

function appendBuffer( buffer1, buffer2 ) 
{
  var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
  tmp.set( new Uint8Array( buffer1 ), 0 );
  tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
  return tmp.buffer;
}

function dl_cancel()
{
	dl_settimer(-1);
	dl_instance++;
	dl_xhrs = dl_pos = dl_workers = dl_progress = dl_cipherq = dl_plainq = dl_progress = dl_chunks = dl_chunksizes = undefined;
	downloading = false;
	dl_writing = false;
	dl_zip = false;
}

var fs_instance;

function dl_retryfsop()
{
	if (fs_instance == dl_instance) dl_createtmp();
}

function dl_createtmpfile(fs) 
{
	dl_fs = fs;

	dl_fs.root.getDirectory(dirid, {create: true}, function(dirEntry) 
	{		
		if (d) console.log('Directory "' + dirid + '" created')
		document.dirEntry = dirEntry;
	}, getDirectory_errorHandler);

	if (d) console.log("Opening file for writing: " + dl_id);

	fs.root.getFile(dirid + '/' + dl_id, {create: true}, function(fileEntry)
	{
		fileEntry.createWriter(function(fileWriter) 
		{		  
			if (d) console.log('File "' + dirid + '/' + dl_id + '" created');

			dl_fw = fileWriter;
			dl_fw.truncate(0);

			dl_fw.onerror = function(e)
			{
				if (d) console.log('Write failed: ' + e.toString());

				if (this.instance == dl_instance)
				{
					dl_writing = false;

					dl_write_failed(e);
				}
			}

			dl_fw.onwriteend = function()
			{
				if (this.instance == dl_instance)
				{
					if (d) console.log("fileWriter: onwriteend, position: " + this.position + ", expected: " + this.targetpos);

					dl_writing = false;

					if (this.position == this.targetpos) dl_ack_write();
					else dl_write_failed('Short write (' + this.position + ' / ' + this.targetpos + ')');
				}
			}

			document.fileEntry = fileEntry;

			dl_run();
		}, createWriter_errorHandler);
	}, getFile_errorHandler);
}

function RequestFileSystem_errorHandler(e)
{
	errorHandler(e,'RequestFileSystem');
}

function getDirectory_errorHandler(e)
{
	errorHandler(e,'getDirectory');	
}
	
function createWriter_errorHandler(e)
{
	errorHandler(e,'createWriter');		
}

function getFile_errorHandler(e)
{
	errorHandler(e,'getFile');
}	

function errorHandler(e,type) 
{
  switch (e.code) {
	case FileError.QUOTA_EXCEEDED_ERR:
	  alert('Error writing file, is your harddrive almost full? (' + type + ')');
	  break;
	case FileError.NOT_FOUND_ERR:
	  alert('NOT_FOUND_ERR in ' + type);
	  break;
	case FileError.SECURITY_ERR:
	  alert('File transfers do not work with Chrome Incognito.<br>' + '(Security Error in ' + type + ')');
	  break;
	case FileError.INVALID_MODIFICATION_ERR:
	  alert('INVALID_MODIFICATION_ERR in ' + type);
	  break;
	case FileError.INVALID_STATE_ERR:
		fs_instance = dl_instance;
		console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
		setTimeout(dl_retryfsop,500);
		break;
	default:
	  alert('webkitRequestFileSystem failed in ' + type);
  }
}	

var dirid = "mega";

function dl_createtmp()
{
	window.requestFileSystem(dl_storagetype,1024*1024*1024*25,dl_createtmpfile,RequestFileSystem_errorHandler);
}


if (window.webkitRequestFileSystem)
{
	window.requestFileSystem = window.webkitRequestFileSystem;

	function dl_getspace(storagetype,minsize)
	{		
		if (!storagetype) storagetype = 0;		
		if (!minsize) minsize = 0;

		window.webkitStorageInfo.queryUsageAndQuota(1, function(used, remaining) 
		{		
			if (remaining > 0)
			{
				dl_quotabytes = remaining;
				dl_storagetype=1;
				if (dl_quotabytes < 1073741824) clearit(1,3600);
				else clearit(1);
				startdownload();
			}
			else
			{
				var requestbytes = 1024*1024*1024*100;				
				if (storagetype == 0) requestbytes = 1024*1024*1024*25;

				if (storagetype == 1) dl_req_storage = true; 

				window.webkitStorageInfo.requestQuota(storagetype,requestbytes,function(grantedBytes) 
				{
				   window.webkitStorageInfo.queryUsageAndQuota(storagetype, function(used, remaining) 
				   {						
						if (storagetype == 1) dl_req_storage = false;
						
						dl_quotabytes = remaining;						
						
						if (dl_quotabytes < 1073741824) clearit(storagetype,3600);	
						
						if ((remaining == 0) && (storagetype == 1))
						{
							if (!dl_req_storage) dl_getspace(1,minsize);
							return false;				
						}
						else if ((minsize > dl_quotabytes) && (storagetype == 0)) 
						{
							if (!dl_req_storage) dl_getspace(1,minsize)
							return false;						
						}						
						else if ((minsize > dl_quotabytes) && (storagetype == 1)) clearit(storagetype,3600);
						
						if (remaining > 0) dl_storagetype = storagetype;							
												
						startdownload();
					}, 
					function(e) 
					{						
						console.log('ERROR: Could not query usage and storage quota. (' + dl_storagetype + ') ' + e);
						alert('Could not query usage and storage quota. (' + dl_storagetype + ') ' + e);
					});
				}, 
				function(e) 
				{
				  console.log('ERROR: Could not grant storage space (' + dl_storagetype + ') ' + e);
				  alert('Could not grant storage space (' + dl_storagetype + ') ' + e);
				});
			}		
		}, 
		function(e) 
		{
			console.log('ERROR: Could not query usage and storage quota. (' + dl_storagetype + ') ' + e);
			alert('Could not query usage and storage quota. (' + dl_storagetype + ') ' + e);
		});
	}
	dl_getspace(0);
	dl_method = 0;
}
else if (navigator.msSaveOrOpenBlob)
{
	dl_method = 2;
}
else if ("download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a") && use_idb)
{
	function pingDBname()
	{
		var dbnames = localStorage.dbnames;		
		if (dbnames) dbnames = JSON.parse(dbnames);
		else dbnames = {};
		dbnames[DBWriter.iddb_name] = 
		{
			t: new Date().getTime()
		};
		localStorage.dbnames = JSON.stringify(dbnames);
	}
	function purgeDBcache()
	{
		var dbnames = localStorage.dbnames;		
		if (dbnames)
		{
			dbnames = JSON.parse(dbnames);		
			for (var name in dbnames)
			{
				if (((dbnames[name].c) && (dbnames[name].t < (new Date().getTime()-86000000)))
				|| (dbnames[name].t < (new Date().getTime()-200000000)))
				{
					try 
					{ 
						window.indexedDB.deleteDatabase(name);
						delete dbnames[name];				
					} 
					catch (e)
					{
						console.log('Failed to purge cache DB ' + name);
					}
				}
			}
			localStorage.dbnames = JSON.stringify(dbnames);
		}
	}
	purgeDBcache();
	var firefox20 = true;
	dl_method = 6;
	var DBWriter = 
	{
		names: {},
		writing: false,
		write: function(p) 
		{
			if (localStorage.dbquota) DBWriter.dowrite();		
			else
			{
				//ffDialog.start();
				DBWriter.tmpdb = new Date().getTime();			
				var request = window.indexedDB.open(DBWriter.tmpdb,1);		
				request.onerror = function (error)
				{			
					//ffDialog.start();
					if (d) console.log('Error obtaining quota, retrying...');
					DBWriter.write();
				};		
				request.onsuccess = function (event) 
				{										
					DBWriter.tmpiddb = request.result;	
					request.getquota();								
				},
				request.onupgradeneeded = function (event) 
				{
					event.target.result.createObjectStore(DBWriter.tmpdb);
				};
				request.getquota = function ()
				{				
					var transaction = DBWriter.tmpiddb.transaction(DBWriter.tmpdb,'readwrite');

					transaction.oncomplete = function()
					{					
						//ffDialog.close();
						DBWriter.tmpiddb.close();
						window.indexedDB.deleteDatabase(DBWriter.tmpdb);
						localStorage.dbquota = 1;
						DBWriter.dowrite();			
					}

					transaction.onerror = function(event)
					{
						//ffDialog.start();
						DBWriter.write();
					}									

					transaction.objectStore(DBWriter.tmpdb).put(new Blob([new ArrayBuffer(62914560)]),'quota');			
				}
			}
		},
		dowrite: function()
		{			
			var request = window.indexedDB.open(DBWriter.iddb_name, 1);	
			
			request.onerror = function (error)
			{			
				dl_write_failed(error);
			};

			request.onsuccess = function (event) 
			{	
				// hide quota warning dialog
				retry = 0;
				DBWriter.iddb = request.result;
				request.dowrite();
			}

			request.onupgradeneeded = function (event) 
			{
				event.target.result.createObjectStore(DBWriter.iddb_name);
			}

			request.dowrite = function()
			{
				var transaction = DBWriter.iddb.transaction(DBWriter.iddb_name,'readwrite');
				
				transaction.oncomplete = function()
				{
					if (transaction.dl_instance == dl_instance)
					{
						dl_writing = false;
						//ffDialog.close();
						DBWriter.iddb_i++;		
						retry = 0;
						DBWriter.iddb.close();
						pingDBname();
						if (d) console.log('DBWriter: Chunk complete');
						dl_ack_write();
					}
				}

				transaction.onerror = function(event)
				{				
					dl_writing = false;
					// show quota warning dialog
					DBWriter.write();							
				}

				transaction.dl_instance = dl_instance;
				transaction.objectStore(DBWriter.iddb_name).put(new Blob([dl_plainq[dl_write_position]]),'chunk'+DBWriter.iddb_i);
			}		
		},
		servedl: function(name)
		{ 
			if (!name) name = 'file.bin';
			var request = window.indexedDB.open(DBWriter.iddb_name, 1);
			request.onsuccess = function(event) 
			{	
				var iddb = request.result;
				var transaction = iddb.transaction([DBWriter.iddb_name],'readonly');
				transaction.objectStore(DBWriter.iddb_name).mozGetAll().onsuccess = function(event)
				{
					var dlURL = URL.createObjectURL(new Blob(event.target.result));
					var a = document.getElementById('dllink');
					a.download = name;
					a.href = dlURL;
					a.click();
				};
			}
		},
		init: function()
		{
			DBWriter.iddb_i = 1000000;
			DBWriter.iddb_name = new Date().getTime();
			DBWriter.names[DBWriter.iddb_name] = 1;
			pingDBname()
		}
	};	
	$(window).unload(function()
	{
		var dbnames = localStorage.dbnames;		
		if (dbnames) dbnames = JSON.parse(dbnames);
		else dbnames = {};		
		for (var name in DBWriter.names)
		{
			dbnames[DBWriter.iddb_name] = 
			{
				t: new Date().getTime(),
				c: 1
			};
		}
		localStorage.dbnames = JSON.stringify(dbnames);
	});
}
else if ("download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a"))
{
	dl_method = 4;
}
else
{
	// Flash fallback
	dl_method = 1;
}


if (localStorage.dlmethod) dl_method = parseInt(localStorage.dlmethod);


function getxr()
{
	return {
		update : function(b)
		{
			var ts = new Date().getTime();
			if (b < 0)
			{
				this.tb = {};
				this.st = 0;
				return 0;
			}
			if (b) this.tb[ts] = this.tb[ts] ? this.tb[ts]+b : b;
			b = 0;			
			for (t in this.tb)
			{
				t = parseInt(t);
				if (t < ts-this.window) delete this.tb[t];
				else b += this.tb[t];
			}			
			if (!b)
			{
				this.st = 0;
				return 0;
			}
			else if (!this.st) this.st = ts;

			if (!(ts -= this.st)) return 0;
			
			if (ts > this.window) ts = this.window;
			
			return b/ts;
		},

		tb : {},
		st : 0,
		window : 60000
	}
}

var dl_xr = getxr();

var uldl_hold = false;

function uldl_pause()
{
	uldl_hold = true;
}

function uldl_resume()
{
	var i;
	uldl_hold = false;

	if (downloading) for (i = dl_maxSlots; i--; ) dl_dispatch_chain();
	if (ul_uploading) for (i = ul_maxSlots; i--; ) ul_dispatch_chain();
}