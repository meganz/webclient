

var ul_queue = [];
var ul_queue_num = 0;

var totalbytessent;


if (localStorage.use_ssl) use_ssl = parseInt(localStorage.use_ssl);

var ul_reader;

var ul_method;

if (!window.FileReader) ul_method = 1;

var ul_maxSlots = 4;
if (localStorage.ul_maxSlots) ul_maxSlots = parseInt(localStorage.ul_maxSlots);

var ul_skipIdentical = 0;
if (localStorage.ul_skipIdentical) ul_skipIdentical= parseInt(localStorage.ul_skipIdentical);

var ul_maxSpeed = 0;
if (localStorage.ul_maxSpeed) ul_maxSpeed=parseInt(localStorage.ul_maxSpeed);

if (ul_method === 1) ul_maxSpeed=0;

var ul_xhrs;
var ul_xhrbusy;
var ul_sendbuf;

var ul_progress;
var ul_lastactive;
var ul_lastcompletion;

var ul_errors;
var ul_intransit;

var ul_max_workers = 4;
var ul_workers;
var ul_workerbusy;

var ul_uploadurl;

var ul_keyNonce;
var ul_key;

var ul_macs;

var ul_plainq;

var ul_sendchunks;
var ul_inflight;

var ul_readq;

var ul_lastreason = 0;

var ul_instance = 0;

var ul_uploading;

var ul_aes;

var ul_flashreaderactive = false;

var ul_flashpos = Array(ul_maxSlots);

var ul_faid=0;

function startupload()
{
	ul_instance++;

	if (ul_uploading) return;

	for (;;)
	{
		if (ul_queue_num >= ul_queue.length)
		{
			if (d) console.log("No further uploads, clearing ul_queue");
			ul_queue = [];
			ul_queue_num = 0;
			return;
		}

		if (ul_queue[ul_queue_num])
		{
			if (!ul_skipIdentical || !file_exists(ul_queue[ul_queue_num].target,ul_queue[ul_queue_num].path || ul_queue[ul_queue_num].name,ul_queue[ul_queue_num].size)) break;
			onUploadSuccess(ul_queue_num);
		}
		
		ul_queue_num++;
	}

	ul_uploading=true;
	
	if (ul_queue[ul_queue_num].flashid)
	{
		ul_maxSlots = 1;
		ul_flashreaderactive = false;
	}
	else ul_reader = new FileReader();

	if (d) console.log(ul_queue_num + ' - ' + ul_queue.length);

	ul_queue[ul_queue_num].retries = ul_queue[ul_queue_num].retries+1 || 0;

	if (ul_queue[ul_queue_num].posturl) initupload3();
	else
	{
		var ctx = { callback : initupload2, reqindex : [] };
		var req = [];
		var maxpf = 128*1048576;
		
		for (var i = ul_queue_num; i < ul_queue.length && i < ul_queue_num+8 && maxpf > 0; i++)
		{
			if (!ul_queue[ul_queue_num].posturl)
			{
				ctx.reqindex.push(i);
				req.push({ a : 'u', ssl : use_ssl, ms : ul_maxSpeed, s : ul_queue[i].size, r : ul_queue[i].retries, e : ul_lastreason });
				maxpf -= ul_queue[i].size
			}
		}
		
		api_req(req,ctx);
	}
}

function initupload2(res,ctx)
{
	var p, pp;

	if (typeof res != 'object')
	{
		// TODO: process upload error
		return;
	}

	for (var i = 0; i < res.length; i++) if (typeof(res[i]) == 'object') ul_queue[ctx.reqindex[i]].posturl = res[i].p;
	
	initupload3();
}
	
function initupload3()
{
	ul_uploadurl = ul_queue[ul_queue_num].posturl;
	
	if (!ul_uploadurl)
	{
		// TODO: upload over quota reporting
		return;
	}
	
	ul_key = Array(6);

	// generate ul_key and nonce
	for (i = 6; i--; ) ul_key[i] = rand(0x100000000);

	ul_keyNonce = JSON.stringify(ul_key);
	
	ul_macs = [];

	totalbytessent = 0;

	ul_readq = [];

	if (ul_queue[ul_queue_num].size)
	{
		p = 0;
		for (i = 1; i <= 8 && p < ul_queue[ul_queue_num].size-i*131072; i++)
		{
			ul_readq[p] = i*131072;
			pp 	= p;
			p += ul_readq[p];
		}

		while (p < ul_queue[ul_queue_num].size)
		{
			ul_readq[p] = 1048576;
			pp 	= p;
			p += ul_readq[p];
		}

		if (!(ul_readq[pp] = ul_queue[ul_queue_num].size-pp) && ul_queue[ul_queue_num].size) delete ul_readq[pp];
	}
	else ul_readq[0] = 0;
	
	ul_plainq = {};

	ul_intransit = 0;
	ul_inflight = {};
	ul_sendchunks = {};

	ul_lastreason = 0;
	ul_errors = 0;

	ul_progress = Array(ul_maxSlots);
	ul_lastactive = Array(ul_maxSlots);
	ul_lastcompletion = 0;

	if (use_workers)
	{
		ul_workers = Array(ul_max_workers);
		ul_workerbusy = Array(ul_max_workers);
		for (var id = ul_max_workers; id--; ) ul_workerbusy[id] = 0;
	}
	
	ul_aes = new sjcl.cipher.aes([ul_key[0],ul_key[1],ul_key[2],ul_key[3]]);

	ul_xhrs = Array(ul_maxSlots);
	ul_xhrbusy = Array(ul_maxSlots);

	if (chromehack) ul_sendbuf = Array(ul_maxSlots);

	for (var slot = ul_maxSlots; slot--; )
	{
		ul_xhrbusy[slot] = 0;
		ul_progress[slot] = 0;
		if (chromehack) ul_sendbuf[slot] = new ArrayBuffer(1048576);
	}

	if (is_image(ul_queue[ul_queue_num].name))
	{	
		ul_queue[ul_queue_num].faid = ++ul_faid;
		if (have_ab) createthumbnail(ul_queue[ul_queue_num],ul_aes,ul_faid);
	}
	
	onUploadStart(ul_queue_num);
	ul_dispatch_chain();
}

var ul_timeout;

function ul_settimeout(t,target)
{
	clearTimeout(ul_timeout);
	if (t >= 0) ul_timeout = setTimeout(target,t);
}

function ul_dispatch_chain()
{
	if (!uldl_hold)
	{
		ul_dispatch_read();
		ul_dispatch_encryption();
		ul_dispatch_send();
	}
}

function ul_dispatch_encryption()
{
	var id;

	if (use_workers)
	{
		for (id = ul_max_workers; id--; ) if (!ul_workerbusy[id]) break;
		
		if (id >= 0)
		{
			for (var p in ul_plainq)
			{
				ul_workerbusy[id] = 1;

				if (typeof(ul_workers[id]) == 'object')
				{
					delete ul_workers[id].onmessage;
					ul_workers[id].terminate();
					ul_workers[id] = undefined;			
				}

				ul_workers[id] = new Worker('encrypter.js');
				ul_workers[id].postMessage = ul_workers[id].webkitPostMessage || ul_workers[id].postMessage;
				ul_workers[id].id = id;
				ul_workers[id].instance = ul_instance;

				ul_workers[id].onmessage = function(e)
				{
					if (this.instance == ul_instance)
					{
						if (typeof(e.data) == 'string')
						{
							if (e.data[0] == '[') ul_macs[this.pos] = JSON.parse(e.data);
							else if (d) console.log("WORKER" + this.id + ": '" + e.data + "'");
						}
						else
						{
							if (d) console.log("WORKER" + this.id + ": Received " + e.data.byteLength + " encrypted bytes at " + this.pos);

							ul_sendchunks[this.pos] = new Uint8Array(e.data);

							ul_dispatch_chain();

							ul_workerbusy[this.id] = 0;
						}
					}
				};

				ul_workers[id].postMessage(ul_keyNonce);

				if (d) console.log("WORKER: Queueing " + ul_plainq[p].length + " bytes at " + p);
	
				ul_workers[id].pos = parseInt(p);
				ul_workers[id].postMessage(parseInt(p)/16);
				ul_workers[id].postMessage(ul_plainq[p]);

				delete ul_plainq[p];

				break;
			}
		}
	}
	else
	{
		for (var p in ul_plainq)
		{
			ul_macs[p] = encrypt_ab_ctr(ul_aes,ul_plainq[p],[ul_key[4],ul_key[5]],p);

			ul_sendchunks[p] = ul_plainq[p];

			delete ul_plainq[p];
		}
	}
}

function ul_dispatch_send(slot)
{
	var slot;

	for (slot = ul_maxSlots; slot--; )
	{
		if (!ul_xhrbusy[slot])
		{
			// dispatch lowest-pos sendchunk
			var p = -1, pp;

			for (pp in ul_sendchunks)
			{
				if (!ul_inflight[pp])
				{
					pp = parseInt(pp);
					if (p == -1) p = pp;
					else if (pp < p) p = pp;
				}
			}

			if (p == -1) break;

			if (ul_uploadurl == '' && p >= 0) break;

			ul_inflight[p] = 1;
			ul_xhrbusy[slot] = 1;

			var suffix = '/' + p + '?c=' + base64urlencode(chksum(ul_sendchunks[p].buffer));

			if (!ul_method)
			{
				if (typeof ul_xhrs[slot] != 'object') ul_xhrs[slot] = new XMLHttpRequest;

				ul_xhrs[slot].onreadystatechange = function()
				{
					if (this.instance == ul_instance)
					{
						ul_lastactive[this.upload.slot] = new Date().getTime();

						if (this.readyState == this.DONE)
						{
							if (this.status == 200 && typeof this.response == 'string' && this.statusText == 'OK')
							{
								ul_chunkcomplete(this.upload.slot,this.pos,this.response);
							}
							else
							{
								if (d) console.log("HTTP POST failed with " + this.status + ", error count=" + ul_errors);

								delete ul_inflight[this.pos];
								ul_xhrbusy[this.upload.slot] = 0;
								ul_progress[this.upload.slot] = 0;
								ul_updateprogress();

								if (++ul_errors > 64) ul_failed();
								else ul_settimeout(ul_errors*1000,ul_dispatch_chain);
							}
						}
					}
				}

				ul_xhrs[slot].upload.onprogress = function(e)
				{
					if (this.instance == ul_instance)
					{
						ul_lastactive[this.slot] = new Date().getTime();

						if (e.lengthComputable && ul_xhrs[this.slot].pos != 1)
						{ 
							ul_progress[this.slot] = e.loaded;
							ul_updateprogress();
						}
					}
				}

				ul_xhrs[slot].pos = p;
				ul_xhrs[slot].instance = ul_instance;
				ul_xhrs[slot].upload.slot = slot;
				ul_xhrs[slot].upload.instance = ul_instance;

				if (chromehack)
				{
					data8 = new Uint8Array(ul_sendchunks[p].buffer);
					send8 = new Uint8Array(ul_sendbuf[slot],0,data8.length);

					send8.set(data8);
					
					// plug extreme Chrome memory leak
					var t = ul_uploadurl.lastIndexOf('/ul/');
					ul_xhrs[slot].open('POST', ul_uploadurl.substr(0,t+1));
					ul_xhrs[slot].setRequestHeader("MEGA-Chrome-Antileak",ul_uploadurl.substr(t)+suffix);
					ul_xhrs[slot].send(send8);
				}
				else
				{
					ul_xhrs[slot].open('POST',ul_uploadurl+suffix);
					ul_xhrs[slot].send(ul_sendchunks[p].buffer);
				}
				
				ul_watchdog();
			}
			else
			{
				ul_flashpos[slot] = p;
				flash_uploadchunk(slot,base64urlencode(ul_sendchunks[p].buffer),ul_uploadurl+suffix);
			}
				
			break;
		}
	}
}

function ul_watchdog()
{
	var t = new Date().getTime();

	if (ul_lastcompletion && t-ul_lastcompletion > 1200000) ul_failed();
	else
	{
		var dispatch = 0;

		for (var i = ul_maxSlots; i--; )
		{
			if (ul_xhrbusy[i] && t-ul_lastactive[i] > 60000)
			{
				var ti = ul_instance;
				ul_xhrs[i].abort();
				if (ti != ul_instance) return;
				ul_lastactive[i] = t;
				dispatch = 1;
			}
		}

		ul_settimeout(5000,ul_watchdog);

		if (dispatch) ul_dispatch_chain();
	}
}


function ul_failed(next)
{
	onUploadError(ul_queue_num,"Upload failed - " + (next ? "read error" : "retrying"));

	ul_cancel();
	if (next) ul_queue_num++;
	ul_settimeout(1000+(next ? 0 : 1000*ul_queue[ul_queue_num].retries),startupload);
}

var ul_lastprogress=0;

function ul_updateprogress()
{
	if (ul_queue[ul_queue_num].size)
	{
		var tp = totalbytessent;

		for (var slot = ul_maxSlots; slot--; ) tp += ul_progress[slot];

		if (tp > ul_queue[ul_queue_num].size) tp = ul_queue[ul_queue_num].size;
		
		
		if (ul_lastprogress+250 > new Date().getTime()) return false;
		else ul_lastprogress=new Date().getTime();
		
		onUploadProgress(ul_queue_num, tp, ul_queue[ul_queue_num].size);
	}
}

var ul_completion = [];
var ul_completing;

function ul_completepending(target)
{
	if (ul_completion.length)
	{
		var ul = ul_completion.shift();
	
		var ctx = {
			target : target,
			ul_queue_num : ul[5],
			callback : ul_completepending2,
			faid : ul[6]
		};

		api_completeupload(ul[0],ul[1],ul[2],ul[3],ul[4],ul[6],ctx);
	}
	else ul_completing = false;
}

function ul_completepending2(res,ctx)
{
	if (typeof res == 'object' && res[0].f)
	{		
		newnodes = [];	
		process_f(res[0].f);		
		rendernew();
		fm_thumbnails();
		api_attachfileattr(res[0].f[0].h,ctx.faid);
		onUploadSuccess(ctx.ul_queue_num);
		ul_completepending(ctx.target);
	}
}

function file_exists(node,path,size)
{
	var p = path.split('/');
	var n;

	return file_exists2(node,p,size);
}

function file_exists2(node,p,size)
{
	if (!p.length) return false;

	var i, c = p.shift();

	if (!c.length) return file_exists2(node,p,size);

	n = fm_matchname(node,c);

	if (!p.length)
	{
		for (i = n.length; i--; )
		{
			// TODO: check for further attributes, such as timestamp
			if (n[i].size == size) return true;
		}
	}
	else for (i = n.length; i--; ) if (n[i].size < 0) return file_exists2(n[i].id,p,size);
	
	return false;
}

function ul_chunkcomplete(slot,pos,response)
{
	ul_progress[slot] = 0;
	delete ul_inflight[pos];

	if (response.length > 27) response = base64urldecode(response);
	
	if (!response.length || response == 'OK' || response.length == 27)
	{
		ul_lastcompletion = new Date().getTime();

		if (pos >= 0) ul_intransit--;

		if (ul_sendchunks[pos])
		{
			totalbytessent += ul_method ? ul_sendchunks[pos].buffer.length : ul_sendchunks[pos].length;
			ul_updateprogress();
			delete ul_sendchunks[pos];
		}

		if (response.length == 27)
		{
			var t = [];

			for (p in ul_macs) t.push(p);

			t.sort(function(a,b) { return parseInt(a)-parseInt(b) });

			for (var i = 0; i < t.length; i++) t[i] = ul_macs[t[i]];

			var mac = condenseMacs(t,ul_key);
		
			ul_settimeout(-1);

			var filekey = [ul_key[0]^ul_key[4],ul_key[1]^ul_key[5],ul_key[2]^mac[0]^mac[1],ul_key[3]^mac[2]^mac[3],ul_key[4],ul_key[5],mac[0]^mac[1],mac[2]^mac[3]];
			
			// TODO: add further attributes, such as filemtime...
			if (u_k_aes && !ul_completing)
			{
				var ctx = { ul_queue_num : ul_queue_num,
					callback : ul_completepending2,
					faid : ul_queue[ul_queue_num].faid
				};

				ul_completing = true;
				api_completeupload(response,ul_queue[ul_queue_num].target,ul_queue[ul_queue_num].path,ul_queue[ul_queue_num].name,filekey,ul_queue[ul_queue_num].faid,ctx);
			}
			else ul_completion.push([response,ul_queue[ul_queue_num].target,ul_queue[ul_queue_num].path,ul_queue[ul_queue_num].name,filekey,ul_queue_num,ul_queue[ul_queue_num].faid]);

			ul_queue_num++;

			ul_uploading = false;
			return startupload();
		}
//		else ul_settimeout(ul_method ? 200000 : 60000,ul_failed);
	}
	else
	{
		console.log("Invalid upload response: " + response);
		if (response != EKEY) return ul_failed()
	}

	// TODO: add processing for re-requests
	ul_xhrbusy[slot] = 0;
	
	ul_dispatch_chain();
}

function ul_flash_uploaddone(slot,response)
{
	ul_chunkcomplete(slot,ul_flashpos[slot],response);
}

var xhr_supports_typed_arrays = false;

function ul_dispatch_read()
{
	var rpos;
	var p;

	if (ul_intransit > 8) return;

	if (!ul_method)
	{
		if (ul_reader.readyState != ul_reader.LOADING)
		{
			for (p in ul_readq)
			{
				p = parseInt(p);

				var blob;

				if ((ul = ul_queue[ul_queue_num].slice) || (ul_queue[ul_queue_num].mozSlice))
				{
					if (ul_queue[ul_queue_num].mozSlice) blob = ul_queue[ul_queue_num].mozSlice(p,p+ul_readq[p]);
					else blob = ul_queue[ul_queue_num].slice(p,p+ul_readq[p]);
					xhr_supports_typed_arrays = true;
				}
				else blob = ul_queue[ul_queue_num].webkitSlice(p,p+ul_readq[p]);

				ul_reader.pos = p;
				ul_reader.readAsArrayBuffer(blob);
				ul_reader.instance = ul_instance;

				ul_reader.onloadend = function(evt) 
				{
					if (this.instance == ul_instance)
					{
						if (evt.target.readyState == FileReader.DONE) 
						{
							delete ul_readq[this.pos];

							ul_plainq[this.pos] = new Uint8Array(evt.target.result);

							ul_intransit++;
							
							ul_dispatch_chain();
						}
					}
				}
				
				ul_reader.onerror = function(evt)
				{
					if (this.instance == ul_instance)
					{
						console.log("File Read error");
						ul_failed(1);
					}
				}

				break;
			}
		}
	}
	else
	{
		if (!ul_flashreaderactive)
		{
			ul_flashreaderactive = true;

			for (p in ul_readq)
			{
				p = parseInt(p);

				flash_requestchunk(ul_queue[ul_queue_num].flashid,ul_readq[p],p);
				break;
			}
		}
	}
}

function ul_flash_chunk(id,data,p)
{
	if (ul_flashreaderactive)
	{
		ul_flashreaderactive = false;

		if (id != ul_queue[ul_queue_num].flashid)
		{
			if (d) console.log("INVALID ID on Flash response");
		}
		else
		{
			ul_plainq[p] = { buffer : base64urldecode(data) };

			if (ul_plainq[p].buffer.length != ul_readq[p])
			{
				if (d) console.log("SHORT READ in flashreader: " + ul_plainq[p].buffer.length + " != " + ul_readq[p] + " at " + p);
				delete ul_plainq[p];
			}
			else
			{
				delete ul_readq[p];
				ul_intransit++;
				ul_dispatch_chain();
			}
		}
	}
}

function ul_cancel()
{
	if (ul_xhrs)
	{
		for (var i = ul_maxSlots; i--; ) if (typeof ul_xhrs[i] == 'object')
		{
			ul_xhrs[i].abort();
			ul_xhrs[i] = undefined;
		}
	}
	
	// TODO: properly abort active Flash components
	ul_instance++;
	ul_settimeout(-1);
	ul_workers = ul_plainq = ul_reader = ul_xhrs = ul_workers = ul_sendchunks = ul_inflight = ul_readq = undefined;
	ul_uploading = ul_flashreaderactive = false;

	delete ul_queue[ul_queue_num].posturl;

	api_req([{ a : 'u', t : ul_uploadurl }]);
}
