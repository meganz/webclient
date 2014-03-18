function UploadQueue() {
}
inherits(UploadQueue, Array);

/* Helper functions {{{ */
var ul_completion = [];
var ul_completing;

function ul_completepending(target)
{
	if (ul_completion.length) {
		var ul = ul_completion.shift();
		var ctx = {
			target : target,
			ul_queue_num : ul[3],
			size: ul_queue[ul[3]].size,
			callback : ul_completepending2,
			faid : ul[1].faid
		};

		file.response = ul[0]
		file.filekey  = ul[2]
		ul_finalize(file)
		//api_completeupload(ul[0],ul[1],ul[2],ctx);
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
		onUploadProgress(ctx.ul_queue_num, 100, ctx.size, ctx.size);
		onUploadSuccess(ctx.ul_queue_num);
		ul_completepending(ctx.target);
	}
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
	if (!n) ul_start(File);
	DEBUG(File.file.name, "ul_deduplicate")
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
				onUploadSuccess(uq.pos);
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
		var foldername = p[i];
		var h = n.h;		
		if (!n) return false;		
		var n = false;		
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

var UploadManager = new function() {
	var self = this;

	self.restart = function(file) {
		file.retries  = 0;
		file.sent     = 0;
		file.progress = {};
		file.posturl  = "";
		file.completion = [];

		ulQueue._queue = $.grep(dlQueue._queue, function(task) {
			return task.file != file;
		});

		$.each(ulQueue._running, function(i, worker) {
			if (worker.task.file == file) {
				worker.task.abort = true;
			}
		});

		DEBUG("fatal error restarting")
		onUploadError(file.pos, "Upload failed - restarting upload");

		// reschedule
		ulQueue.push(new FileUpload(file));
	};

	self.retry = function(file, chunk, Job, reason) {
		if (file.retries >= 15) {
			return self.restart(file);
		}
		file.retries++;

		// pause file upload
		file.paused = true;

		// release worker
		Job.done();

		// reschedule
		var newTask = new ChunkUpload(file, chunk.start, chunk.end);
		newTask.__retry = true
		ulQueue.pushFirst(newTask, function() {
			/* release error pausing */
			file.paused = false;
		});

		DEBUG("fatal error restarting because of", reason)
		onUploadError(file.pos, "Upload failed - retrying");
	};

	self.isReady = function(Task) {
		return !Task.file.paused || Task.__retry;
	}

};

function ul_get_posturl(File) {
	return function(res, ctx) {
		if (typeof res == 'object') {
			ul_queue[ctx.reqindex].posturl = res.p;
			if (ctx.reqindex == File.ul.pos) {
				ul_upload(File);
			}
		} else {
			DEBUG('request failed');
		}
	};
}

function ul_upload(File) {
	var i, file = File.file

	if (file.repair) {
		file.ul_key = file.repair;
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
			ulQueue.push(task);
		});
	} else {
		ulQueue.push(new ChunkUpload(file, 0,  0));
	}

	if (is_image(file.name)) {
		file.faid = ++ul_faid;
		if (have_ab) createthumbnail(file, file.ul_aes, ul_faid);
	}

	onUploadStart(file.pos);
	file.done_starting();
}

function ul_start(File) {
	if (File.file.posturl) return ul_upload(File);
	var maxpf = 128*1048576
		, next = ul_get_posturl(File);

	$.each(ul_queue, function(i, cfile) {
		if (cfile.posturl) return; /* continue */
		if (i >= File.pos+8 || maxpf <- 0) return false; /* break */
		api_req({ 
			a : 'u', 
			ssl : use_ssl, 
			ms : ul_maxSpeed, 
			s : cfile.size, 
			r : cfile.retries, 
			e : cfile.ul_lastreason 
		}, { reqindex : i, callback : next });
		maxpf -= cfile.size
	});
}

function ChunkUpload(file, start, end)
{
	var self = this;
	this.file = file;
	this.ul   = file;

	this.run = function(Job) {
		var chunk = { start: start, end: end, task: this}
	
		file.ul_reader.push(chunk, function(task, args) {
			if (args[0]) {
				return UploadManager.retry(file, chunk, Job, args[0])
			}
			var encrypter = new Worker('encrypter.js');
			encrypter.postMessage = encrypter.webkitPostMessage || encrypter.postMessage;
			encrypter.onmessage = function(e) {
				if (typeof e.data == 'string') {
					if (e.data[0] == '[') file.ul_macs[start] = JSON.parse(e.data);
					else DEBUG('WORKER:', e.data);
				} else {
					chunk.bytes = new Uint8Array(e.data.buffer || e.data);
					chunk.suffix = '/' + start + '?c=' + base64urlencode(chksum(chunk.bytes.buffer));
					ul_chunk_upload(chunk, file, Job);
				}
			};
			encrypter.pos = start
			encrypter.postMessage(file.ul_keyNonce);
			encrypter.postMessage(start/16)
			if (typeof MSBlobBuilder == "function") {
				encrypter.postMessage(chunk.bytes);
			} else { 
				encrypter.postMessage(chunk.bytes.buffer,[chunk.bytes.buffer]);
			}
		});
	}
}

function FileUpload(file) {
	var self = this;
	this.file = file;
	this.ul   = file;

	this.run = function(Job) {
		file.retries = file.retries+1 || 0
		file.ul_lastreason = file.ul_lastreason || 0
		if (start_uploading || $('#ul_' + file.id).length == 0) {
			return Job.reschedule();
		}

		DEBUG(file.name, "starting upload", file.id)

		start_uploading = true;

		var started = false;
		file.done_starting = function() {
			if (started) return;
			started = true;
			start_uploading = false;
			Job.done();
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
			ul_start(self);
		}
	}
}

UploadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments) - 1
		, file = this[pos]

	file.pos = pos;

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

function ul_finalize(file) {
	var p

	DEBUG(file.name, "ul_finalize")
	if (is_chrome_firefox && file._close) file._close();
	if (file.repair) file.target = M.RubbishID;

	var dirs = file.path.split(/\//g).filter(function(a) { 
		return a.length > 0; 
	})

	if (!file.filekey) throw new Error("filekey is missing")


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
		
		DEBUG(file.name, "save to dir", file, dir, req)
		
		api_req(req, {
			target: dir,
			ul_queue_num: file.pos,
			size: file.size,
			faid: file.faid,
			callback: ul_completepending2
		});
	}, file.target || M.RootID);	
}

function ul_chunk_upload(chunk, file, Job) {
	var xhr = getXhrObject();
	function ul_updateprogress() {
		var tp = file.sent
		$.each(file.progress, function(i, p) {
			tp += p;
		});
		onUploadProgress(file.pos, Math.min(Math.floor(tp/file.size*100), 99), tp, file.size);
	}

	xhr.upload_progress = function(e) {
		if (chunk.task.abort) {
			xhr.abort();
			return Job.done();
		}
		file.progress[chunk.start] = e.loaded
		ul_updateprogress();
	};

	xhr.failure = function() {
		if (chunk.task.abort) return;
		file.progress[chunk.start] = 0;
		ul_updateprogress();
		UploadManager.retry(file, chunk, Job, "xhr failed");
		xhr = null;
	}

	xhr.ready = function(e) {
		if (this.status == 200 && typeof this.response == 'string' && this.statusText == 'OK') {
			var response = this.response
			if (response.length > 27) {
				response = base64urldecode(response);
			}

			if (!response.length || response == 'OK' || response.length == 27) {
				file.sent += chunk.bytes.buffer.length || chunk.bytes.length;
				delete file.progress[chunk.start];
				DEBUG("done", chunk);
				ul_updateprogress();

				if (response.length == 27) {
					var t = [], ul_key = file.ul_key
					for (p in file.ul_macs) t.push(p);
					t.sort(function(a,b) { return parseInt(a)-parseInt(b) });
					for (var i = 0; i < t.length; i++) t[i] = file.ul_macs[t[i]];
					var mac = condenseMacs(t, file.ul_key);

					var filekey = [ul_key[0]^ul_key[4],ul_key[1]^ul_key[5],ul_key[2]^mac[0]^mac[1],ul_key[3]^mac[2]^mac[3],ul_key[4],ul_key[5],mac[0]^mac[1],mac[2]^mac[3]];
					
					if (u_k_aes && !file.ul_completing) {
						var ctx = { 
							size: file.size,
							ul_queue_num : file.pos,
							callback : ul_completepending2,
							faid : file.faid
						};
						file.ul_completing = true;
						file.filekey       = filekey
						file.response      = base64urlencode(response)
						ul_finalize(file);
						//api_completeupload(response, ul_queue[file.pos], filekey,ctx);
					} else {
						file.completion.push([
							response.url, file, filekey, file.pos
						]);
					}
				}
				return Job.done();

			} else { 
				DEBUG("Invalid upload response: " + response);
				if (response != EKEY) return xhr.failure(EKEY)
			}

		}

		return xhr.failure();
	};

	if (chromehack) {
		var data8 = new Uint8Array(chunk.bytes.buffer);
		var send8 = new Uint8Array(chunk.bytes.buffer, 0, data8.length);
		send8.set(data8);

		var t = file.posturl.lastIndexOf('/ul/');
		xhr.open('POST', file.posturl.substr(0,t+1));
		xhr.setRequestHeader("MEGA-Chrome-Antileak", file.posturl.substr(t)+chunk.suffix);
		xhr.send(send8);
	} else {
		xhr.open('POST', file.posturl+chunk.suffix);
		xhr.send(chunk.bytes.buffer);
	}
}

function ul_filereader(fs, file) {
	return new QueueClass(function(task) {
		var Scheduler = this;
		if (fs.readyState == fs.LOADING) {
			return this.reschedule();
		}
		var end = task.start+task.end
		if (file.slice || file.mozSlice) {
			if (file.mozSlice) blob = file.mozSlice(task.start, end);
			else blob = file.slice(task.start, end);
			xhr_supports_typed_arrays = true;
		} else {
			blob = file.webkitSlice(task.start, end);
		}

		fs.pos = task.start;
		fs.readAsArrayBuffer(blob);
		fs.onerror = function(evt) {
			Scheduler.done(new Error(evt))
		}
		fs.onloadend = function(evt) {
			if (evt.target.readyState == FileReader.DONE) {
				task.bytes = new Uint8Array(evt.target.result);
				Scheduler.done(null)
			}
		}	
	}, 1);
}

function worker_uploader(task) {
	task.run(this);
}

var ul_queue  = new UploadQueue
	, ul_skipIdentical = 0
	, ulQueue = new QueueClass(worker_uploader)
	, start_uploading = false
	, ul_maxSpeed = 0
	, ul_faid = 0
	, ul_block_size = 131072
	, ul_block_extra_size = 1048576
	, uldl_hold = false
	, ul_dom = []

// ul_uploading variable {{{
ulQueue.on('working', function() {
	ul_uploading = true;
});

ulQueue.on('resume', function() {
	ul_uploading = true;
});

ulQueue.on('pause', function() {
	ul_uploading = false;
});

ulQueue.on('drain', function() {
	ul_uploading = false;
});
// }}}

ulQueue.getNextTask = function() {
	var candidate = null
	$.each(ulQueue._queue, function(i, task) {
		if (task instanceof ChunkUpload && UploadManager.isReady(task)) {
			ulQueue._queue.splice(i, 1);
			candidate = task;
			return false;
		}
	});

	if (!candidate && ulQueue._queue.length > 0 &&
			ulQueue._queue[0] instanceof FileUpload) {
		return ulQueue._queue.shift();
	}

	return candidate;
};

if (localStorage.ul_maxSpeed) ul_maxSpeed=parseInt(localStorage.ul_maxSpeed);

if (localStorage.ul_skipIdentical) {
	ul_skipIdentical= parseInt(localStorage.ul_skipIdentical);
}
