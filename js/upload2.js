function UploadQueue() {}
inherits(UploadQueue, Array);

/* Helper functions {{{ */
var ul_completion = [];
var ul_completing;

function ul_completepending(target)
{
	if (ul_completion.length) {
	console.error("I'm weak, debug me.")
		var ul = ul_completion.shift();
		// var ctx = {
			// target : target,
			// ul_queue_num : ul[3],
			// size: ul_queue[ul[3]].size,
			// callback : ul_completepending2,
			// faid : ul[1].faid,
			// file : ul[1]
		// };
		//api_completeupload(ul[0],ul[1],ul[2],ctx);

		var file = ul[1];
		file.response = ul[0]
		file.filekey  = ul[2]
		ul_finalize(file)
	}
	else ul_completing = false;
}

function ul_completepending2(res,ctx)
{
	DEBUG("ul_completepending2", res, ctx)
	if (typeof res == 'object' && res.f)
	{
		if (ctx.faid) storedattr[ctx.faid].target = res.f[0].h;

		newnodes = [];
		process_f(res.f);
		rendernew();
		fm_thumbnails();
		if (ctx.faid) api_attachfileattr(res.f[0].h,ctx.faid);
		onUploadSuccess(ul_queue[ctx.ul_queue_num]);
		ul_queue[ctx.ul_queue_num] = {}
		ctx.file.ul_failed = false;
		ctx.file.retries   = 0;
		ul_completepending(ctx.target);
	}
	if (ctx.file.mFiU) ctx.file.mFiU.destroy();
	else oDestroy(ctx.file);
	oDestroy(ctx);
	Later(resetUploadDownload);
}

function ul_deduplicate(File, identical) {
	var n, uq = File.ul;
	if (identical && ul_skipIdentical) {
		n = identical;
	} else if (!M.h[uq.hash] && !identical) {
		return ul_start(File)
	} else if (M.h[uq.hash]) {
		n = M.d[M.h[uq.hash][0]];
	}
	if (!n) return ul_start(File);
	DEBUG(File.file.name, "ul_deduplicate", n)
	api_req({a:'g',g:1,ssl:use_ssl,n:n.h}, {
		uq:uq,
		n:n,
		skipfile:(ul_skipIdentical && identical),
		callback: function(res,ctx) {
			if (res.e == ETEMPUNAVAIL && ctx.skipfile) {
				ctx.uq.repair = ctx.n.key;
				ul_start(File);
			} else if (typeof res == 'number' || res.e) {
				ul_start(File);
			} else if (ctx.skipfile) {
				onUploadSuccess(uq);
				File.file.ul_failed = false;
				File.file.retries   = 0;
				File.file.done_starting();
			} else {
				File.file.filekey  = ctx.n.key
				File.file.response = ctx.n.h
				File.file.faid     = ctx.n.fa
				File.file.path     = ctx.uq.path
				File.file.name     = ctx.uq.name
				File.file.done_starting();
				ul_finalize(File.file)
			}
		}
	});
}

function ul_Identical(target, path, hash,size)
{
	if (!target || !path) return false;
	var p = path.split('/');
	var n = M.d[target];
	for (var i in p)
	{
		if (!n) return false;
		var foldername = p[i];
		var h = n.h;
		n = false;
		for (var j in M.c[h])
		{
			if (M.d[j] && M.d[j].name == foldername)
			{
				if (M.d[j].t) n = M.d[j];
				else if (p.length == parseInt(i)+1 && (hash == M.d[j].hash || size == M.d[j].s)) return M.d[j];
			}
		}
	}
	return false;
}
/* }}} */

/**
 *	Check if the network is up!
 *
 *	This function is called when an error happen at the upload
 *	stage *and* it is anything *but* network issue.
 */
function network_error_check() {
	var i =0
		, ul = { error: 0, retries: 0}
		, dl = { error: 0, retries: 0}

	for (i = 0; i < dl_queue.length; i++) {
		if (dl_queue[i] && dl_queue[i].dl_failed) {
			if (d) console.log('Failed download:', dl_queue[i].zipname||dl_queue[i].n, 'Retries: ' + dl_queue[i].retries, dl_queue[i].zipid);
			dl.retries += dl_queue[i].retries
			if (dl_queue[i].retries++ == 5) {
				/**
				 *	The user has internet yet the download keeps failing
				 *	we request the server a new download url but unlike in upload
				 *	this is fine because we resume the download
				 */
				DownloadManager.newUrl( dl_queue[i] );
				dl.retries = 0;
			}
			dl.error++
		}
	}

	for (i = 0; i < ul_queue.length; i++) {
		if (ul_queue[i] && ul_queue[i].ul_failed) {
			ul.retries += ul_queue[i].retries
			if (ul_queue[i].retries++ == 10) {
				/**
				 *	Worst case ever. The client has internet *but*
				 *	this upload keeps failing in the last 10 minutes.
				 *
				 *	We request a new upload URL to the server, and the upload
				 *	starts from scratch
				 */
				ERRDEBUG("restarting because it failed", ul_queue[i].retries, 'times',  ul);
				UploadManager.restart( ul_queue[i] );
				ul_queue[i].retries = 0;
			}
			ul.error++;
		}
	}

	/**
	 *	Check for error on upload and downloads
	 *
	 *	If we have many errors (average of 3 errors)
	 *	we try to shrink the number of connections to the
	 *	server to see if that fixes the problem
	 */
	$([ul, dl]).each(function(i, k) {
		var ratio = k.retries/k.error
		if (ratio > 0 && ratio%8 == 0) {
			// if we're failing in average for the 3rd time,
			// lets shrink our upload queue size
			ERRDEBUG('shrinking: ' + (k == ul ? 'ul' : 'dl'))
			var queue = (k == ul ? ulQueue : dlQueue)
			queue.shrink();
		}
	});
}

var UploadManager =
{
	GetGID : function UM_GetGID(ul)
	{
		return 'ul_' + ul.id;
	},

	abort : function UM_abort(gid)
	{
		if (gid === null || Array.isArray(gid)) // all || grp
		{
			this._multiAbort = 1;

			if (gid) gid.forEach(this.abort.bind(this));
			else ul_queue.filter(isQueueActive).forEach(this.abort.bind(this));

			delete this._multiAbort;
			Soon(resetUploadDownload);
		}
		else
		{
			if (typeof gid === 'object') gid = this.GetGID(gid);
			else if (gid[0] !== 'u') return;

			var l = ul_queue.length, FUs = [];
			while (l--)
			{
				var ul = ul_queue[l];

				if (gid === this.GetGID(ul))
				{
					if (d) console.log('Aborting ' + gid, ul.name);

					ul.abort = true;
					FUs.push([ul.mFiU,l]);
				}
			}

			ulQueue.pause(gid);
			ulQueue.filter(gid);
			FUs.map(function(o)
			{
				var ul = o[0], idx = o[1];
				if (ul) ul.destroy();
				ul_queue[idx] = Object.freeze({});
			});
			if (!this._multiAbort) Soon(resetUploadDownload);
			$('#' + gid).fadeOut('slow', function() { $(this).remove() });
		}
	},

	restart : function UM_restart(file)
	{
		file.retries  = 0;
		file.sent     = 0;
		file.progress = {};
		file.posturl  = "";
		file.completion = [];

		ERRDEBUG("restart()", file.name)
		ulQueue._queue = $.grep(ulQueue._queue, function(task) {
			return task[0].file != file;
		});

		file.abort = true;

		ERRDEBUG("fatal error restarting", file.name)
		onUploadError(file.id, "Upload failed - restarting upload");

		// reschedule
		ulQueue.pushFirst(new FileUpload(file));
	},

	retry : function UM_retry(file, chunk, reason)
	{
		var start = chunk.start, end = chunk.end, cid = '' + chunk;

		file.ul_failed = true;
		api_reportfailure(hostname(file.posturl), network_error_check);

		// reschedule

		ulQueue.pause(); // Hmm..
		if (!file.__umRetries) file.__umRetries = 1;
		if (!file.__umRetryTimer) file.__umRetryTimer = {};
		var tid = ++file.__umRetries;
		file.__umRetryTimer[tid] = setTimeout(function()
		{
			delete file.__umRetryTimer[tid];

			if (reason.indexOf('IO failed') == -1 || tid < 66)
			{
				var newTask = new ChunkUpload(file, start, end);
				ulQueue.pushFirst(newTask);
			}
			else
			{
				if (d) console.error('Too many retries for ' + cid);
				msgDialog('warninga', l[1309], l[1498] + ': ' + file.name, reason);
				UploadManager.abort(file);
			}
			ulQueue.resume();
		}, 950+Math.floor(Math.random()*2e3))

		ERRDEBUG("retrying chunk because of", reason + "")
		onUploadError(file.id, "Upload failed - retrying");

		chunk.done(); /* release worker */
	},

	isReady : function UM_isReady(Task)
	{
		return !Task.file.paused || Task.__retry;
	}

};

function ul_get_posturl(File) {
	return function(res, ctx) {
		delete ul_queue[ctx.reqindex].posturl; /* reset in case of a retry */
		if (typeof res == 'object') {
			if (typeof res.p == "string" && res.p.length > 0) {
				ul_queue[ctx.reqindex].posturl = res.p;
			}
		}
		if (ctx.reqindex == File.ul.pos) {
			if (ul_queue[ctx.reqindex].posturl) {
				ul_upload(File);
			} else {
				/* retry */
				ul_start(File);
			}
		}
	};
}

function ul_upload(File) {
	var i, file = File.file

	if (file.repair) {
		var ul_key = file.repair;
		file.ul_key = [ul_key[0]^ul_key[4],ul_key[1]^ul_key[5],ul_key[2]^ul_key[6],ul_key[3]^ul_key[7],ul_key[4],ul_key[5]]
	} else {
		file.ul_key = Array(6);
		// generate ul_key and nonce
		for (i = 6; i--; ) file.ul_key[i] = rand(0x100000000);
	}

	file.ul_keyNonce = JSON.stringify(file.ul_key)
	file.ul_macs = []
	file.totalbytessent = 0
	file.ul_readq  = []
	file.ul_plainq = {}
	file.ul_intransit = 0
	file.ul_inflight = {}
	file.ul_sendchunks = {};
	file.ul_aes = new sjcl.cipher.aes([
		file.ul_key[0],file.ul_key[1],file.ul_key[2],file.ul_key[3]
	]);
	file.mFiU = File;

	if (file.size) {
		var pp, p = 0, tasks = {}
		for (i = 1; i <= 8 && p < file.size-i*ul_block_size; i++) {
			tasks[p] = new ChunkUpload(file, p, i*ul_block_size);
			pp 	= p;
			p += i * ul_block_size
		}

		while (p < file.size) {
			tasks[p] = new ChunkUpload(file, p, ul_block_extra_size);
			pp 	= p;
			p += ul_block_extra_size
		}

		if (file.size-pp > 0) {
			tasks[pp] = new ChunkUpload(file, pp, file.size-pp)
		}
		$.each(tasks, function(i, task) {
			ulQueue.pushFirst(task);
		});
	} else {
		ulQueue.pushFirst(new ChunkUpload(file, 0,  0));
	}

	if (is_image(file.name)) {
		file.faid = ++ul_faid;
		if (have_ab) createthumbnail(file, file.ul_aes, ul_faid);
	}

	onUploadStart(file);
	file.done_starting();
}

function ul_start(File) {
	if (File.file.posturl) return ul_upload(File);
	var maxpf = 128*1048576
		, next = ul_get_posturl(File)
		, total = 0
		, len   = ul_queue.length
		, max   = File.file.pos+8

	/* CPU INTENSIVE
	$.each(ul_queue, function(i, cfile) {
		if (i < File.file.pos || cfile.posturl) return; // continue
		if (i >= File.file.pos+8 || maxpf <= 0) return false; // break
		api_req({
			a : 'u',
			ssl : use_ssl,
			ms : ul_maxSpeed,
			s : cfile.size,
			r : cfile.retries,
			e : cfile.ul_lastreason
		}, { reqindex : i, callback : next });
		maxpf -= cfile.size
		total++;
	});
	*/

	for (var i = File.file.pos; i < len && i < max && maxpf > 0; i++) {
		var cfile = ul_queue[i];
		if (!isQueueActive(cfile)) continue;
		api_req({
			a : 'u',
			ssl : use_ssl,
			ms : ul_maxSpeed,
			s : cfile.size,
			r : cfile.retries,
			e : cfile.ul_lastreason
		}, { reqindex : i, callback : next });
		maxpf -= cfile.size
		total++;
	}
	DEBUG2('request urls for ', total, ' files')
}

function ChunkUpload(file, start, end)
{
	this.file = file;
	this.ul   = file;
	this.start = start;
	this.end   = end;
	this.gid   = file.mFiU.gid;
	this.xid   = this.gid + '_' + start + '-' + end;
	this[this.gid] = !0;
	if (d) console.log('Creating ' + this);
}

ChunkUpload.prototype.toString = function() {
	return "[ChunkUpload " + this.xid + "]";
};

ChunkUpload.prototype.destroy = function() {
	if (d) console.log('Destroying ' + this);
	this.abort();
	oDestroy(this);
};

ChunkUpload.prototype.updateprogress = function() {
	if (this.file.paused || this.file.complete || ui_paused) return;

	var tp = this.file.sent || 0, p=this.file.progress;
	for (var i in p) tp += p[i];

	// only start measuring progress once the TCP buffers are filled
	// (assumes a modern TCP stack with a large intial window)
	if (!this.file.speedometer && this.file.progressevents > 5) this.file.speedometer = bucketspeedometer(tp);
	this.file.progressevents = (this.file.progressevents || 0)+1;

	onUploadProgress(
		this.file,
		Math.floor(tp/this.file.size*100),
		tp,
		this.file.size,
		GlobalProgress[this.gid].speed = (this.file.speedometer ? this.file.speedometer.progress(tp) : 0)  // speed
	);

	if (tp == this.file.size) this.file.complete = true;
};

ChunkUpload.prototype.abort = function() {
	if (this.oet) clearTimeout(this.oet);
	if (this.xhr) this.xhr.xhr_cleanup(0x9ffe);
	if (GlobalProgress[this.gid]) removeValue(GlobalProgress[this.gid].working, this, 1);
	else if (d) console.error('This should not be reached twice or after FileUpload destroy...');
	delete this.xhr;
};

ChunkUpload.prototype.on_upload_progress = function(args, xhr) {
	if (!this.file || !this.file.progress || this.file.abort)
		return this.done && this.done();
	this.file.progress[this.start] = args[0].loaded
	this.updateprogress();
};

ChunkUpload.prototype.on_error = function(args, xhr, reason) {
	if (this.file && !this.file.abort && this.file.progress)
	{
		this.file.progress[this.start] = 0;
		this.updateprogress();

		if (args == EKEY) UploadManager.restart(this.file);
		else UploadManager.retry(this.file, this, "xhr failed: " + reason);
	}
	this.done();
}

ChunkUpload.prototype.on_ready = function(args, xhr) {
	if (xhr.status == 200 && typeof xhr.response == 'string' && xhr.statusText == 'OK') {
		var response = xhr.response
		if (response.length > 27) {
			response = base64urldecode(response);
		}

		if (!response.length || response == 'OK' || response.length == 27) {
			this.file.sent += this.bytes.buffer.length || this.bytes.length;
			delete this.file.progress[this.start];
			this.updateprogress();

			if (response.length == 27) {
				var t = [], ul_key = this.file.ul_key
				for (p in this.file.ul_macs) t.push(p);
				t.sort(function(a,b) { return parseInt(a)-parseInt(b) });
				for (var i = 0; i < t.length; i++) t[i] = this.file.ul_macs[t[i]];
				var mac = condenseMacs(t, this.file.ul_key);

				var filekey = [ul_key[0]^ul_key[4],ul_key[1]^ul_key[5],ul_key[2]^mac[0]^mac[1],ul_key[3]^mac[2]^mac[3],ul_key[4],ul_key[5],mac[0]^mac[1],mac[2]^mac[3]];

				if (u_k_aes && !this.file.ul_completing) {
					var ctx = {
						file: this.file,
						size: this.file.size,
						ul_queue_num : this.file.pos,
						callback : ul_completepending2,
						faid : this.file.faid
					};
					this.file.ul_completing = true;
					this.file.filekey       = filekey
					this.file.response      = base64urlencode(response)
					ul_finalize(this.file);
					//api_completeupload(response, ul_queue[file.id], filekey,ctx);
				} else {
					this.file.completion.push([
						response.url, this.file, filekey, this.file.id
					]);
				}
			}

			this.bytes = null;

			this.file.retries  = 0; /* reset error flag */

			return this.done();

		} else {
			DEBUG("Invalid upload response: " + response);
			if (response != EKEY) return this.on_error(EKEY, null, "EKEY error")
		}
	}

	if (d) console.log("bad response from server",
		xhr.status,
		this.file.name,
		typeof xhr.response == 'string',
		xhr.statusText
	);

	this.oet = setTimeout(this.on_error.bind(this, null, null, "bad response from server"), 950+Math.floor(Math.random()*2e3));
}

ChunkUpload.prototype.upload = function() {

	if (!this.file) {
		if (d) console.error('This upload was cancelled while the Encrypter was working, prevent this aborting it beforehand');
		return;
	}

	var xhr = getXhr(this);

	if (d) console.log("pushing", this.file.posturl + this.suffix)

	if (chromehack) {
		var data8 = new Uint8Array(this.bytes.buffer);
		var send8 = new Uint8Array(this.bytes.buffer, 0, data8.length);
		send8.set(data8);

		var t = this.file.posturl.lastIndexOf('/ul/');
		xhr.open('POST', this.file.posturl.substr(0,t+1));
		xhr.setRequestHeader("MEGA-Chrome-Antileak", this.file.posturl.substr(t)+this.suffix);
		xhr.send(send8);
	} else {
		xhr.open('POST', this.file.posturl+this.suffix);
		xhr.send(this.bytes.buffer);
	}

	this.xhr = xhr;
};

ChunkUpload.prototype.io_ready = function(task, args) {
	if (args[0] || !this.file || !this.file.ul_keyNonce)
	{
		if (this.file)
		{
			if (d) console.error('UL IO Error', args[0]);

			if (this.file.done_starting) this.file.done_starting();
			UploadManager.retry(this.file, this, "IO failed: " + args[0]);
		}
		else
		{
			if (d) console.error('The FileReader finished, but this upload was cancelled...');
		}
	}
	else
	{
		var task = [this, this.file.ul_keyNonce, this.start/16, this.bytes];
		// TODO: Modify CreateWorkers() and use this gid to terminate over cancelled uploads
		task[this.gid] = 1;
		Encrypter.push( task, this.upload, this );
	}
	this.bytes = null;
};

ChunkUpload.prototype.done = function(ee) {
	if (d) console.log(this + '.done');

	if (this._done)
	{
		/* release worker */
		this._done();

		/* clean up references */
		this.destroy();
	}
};

ChunkUpload.prototype.run = function(done) {
	this._done = done;
	this.file.ul_reader.push(this, this.io_ready, this);
	GlobalProgress[this.gid].working.push(this);
};

function FileUpload(file) {
	this.file = file;
	this.ul   = file;
	this.gid  = 'ul_'+this.ul.id;
	this[this.gid] = !0;
	GlobalProgress[this.gid] = {working:[]};
}

FileUpload.prototype.toString = function() {
	return "[FileUpload " + this.gid + "]";
};

FileUpload.prototype.destroy = function() {
	if (d) console.log('Destroying ' + this);
	// Hmm, looks like there are more ChunkUploads than what we really upload (!?)
	if (d) ASSERT(GlobalProgress[this.gid].working.length === 0, 'Huh, there are working upload chunks?..');
	if (is_chrome_firefox && this.file._close)
	{
		this.file._close();
	}
	if (this.file.__umRetryTimer)
	{
		var t = this.file.__umRetryTimer;
		for (var i in t) clearTimeout(t[i]);
	}
	if (this.file.done_starting) Soon(this.file.done_starting);
	this.file.ul_reader.filter(this.gid);
	this.file.ul_reader.destroy();
	delete GlobalProgress[this.gid];
	oDestroy(this.file);
	oDestroy(this);
};

FileUpload.prototype.run = function(done) {
	var file = this.file
		, self = this

	file.abort			= false; /* fix in case it restarts from scratch */
	file.ul_failed		= false;
	file.retries		= 0;
	file.xr				= getxr();
	file.ul_lastreason	= file.ul_lastreason || 0

	if (start_uploading || $('#ul_' + file.id).length == 0) {
		done();
		ASSERT(0, "This shouldn't happen");
		return ulQueue.pushFirst(this);
	}

	if (!GlobalProgress[this.gid].started) {
		GlobalProgress[this.gid].started = true;
	}

	if (d) console.log(file.name, "starting upload", file.id)

	start_uploading = true;

	var started = false;
	file.done_starting = function() {
		if (started) return;
		started = true;
		start_uploading = false;
		delete file.done_starting;
		file = self = undefined;
		done();
	};

	try {
		fingerprint(file, function(hash, ts) {
			file.hash = hash;
			file.ts   = ts;
			var identical = ul_Identical(file.target, file.path || file.name, file.hash, file.size);
			DEBUG(file.name, "fingerprint", M.h[hash] || identical)
			if (M.h[hash] || identical) ul_deduplicate(self, identical);
			else ul_start(self);
		});
	} catch (e) {
		DEBUG(file.name, 'FINGERPRINT ERROR', e.message || e);
		ul_start(this);
	}
};

UploadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments) - 1
		, file = this[pos]

	file.pos = pos;
	if (d && d > 1) console.log('UploadQueue.push', pos, file );

	file.ul_reader  = ul_filereader(new FileReader, file);
	file.progress   = {};
	file.sent       = 0;
	file.completion = [];
	ulQueue.push(new FileUpload(file));

	return pos+1;
};

/**
 *	Wrap fm_requestfolderid to make it parallel friendly
 */
var Mkdir = Parallel(function(args, next) {
	fm_requestfolderid(args[0], args[1], {
		callback: function(ctx, h) {
			next(h);
		}
	});
});

function ul_cancel() {
	UploadManager.abort(null);
}

function ul_finalize(file) {
	var p

	DEBUG(file.name, "ul_finalize")

	if (is_chrome_firefox && file._close) file._close();
	if (file.repair) file.target = M.RubbishID;

	var dirs = (file.path||"").split(/\//g).filter(function(a) {
		return a.length > 0;
	})

	if (dirs.length > 0 && dirs[dirs.length-1] == file.name) {
		dirs.pop();
	}

	ASSERT(file.filekey, "*** filekey is missing ***");

	Cascade(dirs, Mkdir, function(dir) {
		var body  = { n: file.name }
		if (file.hash) body.c = file.hash
		var ea  = enc_attr(body, file.filekey)
		var faid = file.faid ? api_getfa(file.faid) : false
		var req = { a : 'p',
			t : dir,
			n : [{
				h : file.response,
				t : 0,
				a : ab_to_base64(ea[0]),
				k : a32_to_base64(encrypt_key(u_k_aes, file.filekey))
			}],
			i : requesti
		};
		if (faid) req.n[0].fa = faid;
		if (dir) {
			var sn = fm_getsharenodes(dir);
			if (sn.length) {
				req.cr = crypto_makecr([file.filekey],sn,false);
				req.cr[1][0] = file.response;
			}
		}

		DEBUG(file.name, "save to dir", dir, req)

		api_req(req, {
			target: dir,
			ul_queue_num: file.pos,
			size: file.size,
			faid: file.faid,
			file: file,
			callback: ul_completepending2
		});
	}, file.target || M.RootID);
}

function ul_filereader(fs, file) {
	return new MegaQueue(function(task, done) {
		var end = task.start+task.end, blob;

		fs.pos = task.start;
		fs.onerror = function(evt) {
			done(new Error(evt));
			done = null;
		};
		fs.onloadend = function(evt)
		{
			if (done)
			{
				var target = evt.target, error = true;
				if (target.readyState == FileReader.DONE)
				{
					if (target.result instanceof ArrayBuffer)
					{
						try
						{
							task.bytes = new Uint8Array(target.result);
							error = null;
						}
						catch(e)
						{
							console.error(e);
							error = e;
						}
					}
				}
				done(error);
			}
			blob = undefined;
		};
		try {
			if (file.slice || file.mozSlice) {
				if (file.slice) blob = file.slice(task.start, end);
				else blob = file.mozSlice(task.start, end);
				xhr_supports_typed_arrays = true;
			} else {
				blob = file.webkitSlice(task.start, end);
			}
			fs.readAsArrayBuffer(blob);
		} catch(e) {
			console.error(e);
			done(e);
			done = null;
		}
	}, 1);
}

function worker_uploader(task, done) {
	if (d && d > 1) console.log('worker_uploader', task, done);
	task.run(done);
}

var ul_queue  = new UploadQueue
	, ul_maxSlots = readLocalStorage('ul_maxSlots', 'int', { min:1, max:6, def:4 })
	, Encrypter
	, ulQueue = new TransferQueue(worker_uploader, ul_maxSlots)
	, ul_skipIdentical = 0
	, start_uploading = false
	, ul_maxSpeed = 0
	, ul_faid = 0
	, ul_block_size = 131072
	, ul_block_extra_size = 1048576
	, uldl_hold = false
	, ul_dom = []

Encrypter = CreateWorkers('encrypter.js', function(context, e, done) {
	var file = context.file
	if (!file || !file.ul_macs) {
		// TODO: This upload was cancelled, we should terminate the worker rather than waiting
		if (d) console.error('This upload was cancelled, we should terminate the worker rather than waiting');
		return typeof e.data == 'string' || done();
	}

	if (typeof e.data == 'string') {
		if (e.data[0] == '[') file.ul_macs[context.start] = JSON.parse(e.data);
		else DEBUG('WORKER:', e.data);
	} else {
		context.bytes = new Uint8Array(e.data.buffer || e.data);
		context.suffix = '/' + context.start + '?c=' + base64urlencode(chksum(context.bytes.buffer));
		done();
	}
}, 4);

function isQueueActive(q) {
	return typeof q.id !== 'undefined';
}
function resetUploadDownload() {
	if (!ul_queue.some(isQueueActive)) {
		ul_queue = new UploadQueue();
		ul_uploading = false;
	}
	if (!dl_queue.some(isQueueActive)) {
		dl_queue = new DownloadQueue();
		downloading = false;
	}

	if (!downloading && !ul_uploading)
	{
		clearXhr(); /* destroy all xhr */
		panelDomQueue = [];
		GlobalProgress = {};
		delete $.transferprogress;
		if ($.transferClose) $.transferClose(); /* in case it isn't closed already.. */
		if ($.mTransferAnalysis)
		{
			clearInterval($.mTransferAnalysis);
			delete $.mTransferAnalysis;
		}
	}

	if (d) console.log("resetUploadDownload", ul_queue.length, dl_queue.length);

	Later(percent_megatitle);
}

if (localStorage.ul_skipIdentical) ul_skipIdentical= parseInt(localStorage.ul_skipIdentical);

ulQueue.validateTask = function(pzTask) {
	if (pzTask instanceof ChunkUpload && (!pzTask.file.paused || pzTask.__retry)) {
		return true;
	}

	if (pzTask instanceof FileUpload && !start_uploading && $('#ul_' + pzTask.file.id).length != 0) {
		return true;
	}

	return false;
};

if (localStorage.ul_maxSpeed) ul_maxSpeed=parseInt(localStorage.ul_maxSpeed);

if (localStorage.ul_skipIdentical) {
	ul_skipIdentical= parseInt(localStorage.ul_skipIdentical);
}
