var dlMethod
	, dl_maxSlots = 4
	, dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined')
	, dl_maxchunk = 16*1048576
	, dlQueue = new TransferQueue(downloader)
	, preparing_download
	, ui_paused = false

/** @FIXME: move me somewhere else */
$.len = function(obj) {
	return Object.keys(obj).length;
};

function dl_cancel() {
	DownloadManager.abortAll();
}

/**
 *	Global object which can be used to pause/resume
 *	a given file (and their chunks/files)
 */
var DownloadManager = new function() {
	var locks = [], removed = [];

	function s2o(s) {
		if (typeof s == "string") {
			var parts = s.split(":");
			s = {};
			s[parts[0]] = parts[1];
		}
		return s;
	}

	function doesMatch(task, pattern) {
		pattern = s2o(pattern);
		for (var key in pattern) {
			if (typeof task.task !== 'object' || typeof task.task[key] == "undefined" || task.task[key] != pattern[key])
				return false;
		}
		return true;
		// var _match = true;
		// $.each(s2o(pattern), function(key, value) {
			// if (typeof task.task[key] == "undefined" || task.task[key] != value) {
				// _match = false;
				// return false;
			// }
		// });
		// return _match;
	}

	this.newUrl = function(dl) {
		DEBUG("ask for new URL for", dl.dl_id);
		dlGetUrl(dl, function (error, res, o) {
			if (error) return this.newUrl(dl);
			var changed = 0
			for (var i = 0; i < dlQueue._queue.length; i++) {
				if (dlQueue._queue[i][0].dl === dl) {
					dlQueue._queue[i][0].url = res.g + "/" +
						dlQueue._queue[i][0].url.replace(/.+\//, '')
					changed++
				}
			}
			DEBUG("got", changed, "new URL for", dl.dl_id, "resume everything");
		}.bind(this));
	}

	this.debug = function() {
		DEBUG("blocked patterns", locks, removed);
	};

	this.cleanupUI = function(dl, force) {
		var selector = null
		if (dl.zipid) {
			$.each(dl_queue, function(i, file) {
				if (file.zipid == dl.zipid) {
					dl_queue[i] = {}; /* remove it */
				}
			});
			selector = '#zip_' + dl.zipid;
		} else {
			if(typeof dl.pos !== 'undefined') {
				dl_queue[dl.pos] = {}; /* remove it */
			} else {
				$.each(dl_queue, function(i, file) {
					if (file.id == dl.id) {
						dl_queue[i] = {}; /* remove it */
					}
				});
			}
			selector = '#dl_' + dl.id;
		}
		if (dlMethod != FlashIO || force) {
			$(selector).fadeOut('slow', function() {
				$(this).remove();
			});
		}
		if (dl.io instanceof MemoryIO) {
			dl.io.abort();
		}
		dl = null;
	}

	this.abortAll = function() {
		for(var i in dl_queue) {
			var file = dl_queue[i];
			if (file.id || file.zipid) {
				this.abort(file);
			}
		}
		Soon(percent_megatitle);
	}

	this.abort = function(pattern, dontCleanUI) {
		var _pattern = s2o(pattern);
		var i, dl;

		for (i=0; i < dl_queue.length; i++) {
			dl = dl_queue[i];
			if (doesMatch({task:dl}, _pattern)) {
				if (!dl.cancelled && typeof dl.io.abort == "function") try {
					if (d) console.log('IO.abort', dl.zipid || dl.id, dl);
					dl.io.abort("User cancelled");
				} catch(e) {
					DEBUG(e.message, e);
				}
				if (dl.zipid) Zips[dl.zipid].cancelled = true;
				dl.cancelled = true;
				if (dl.io && typeof dl.io.begin === 'function')
				{
					/**
					 * Canceled while Initializing? Let's free up stuff
					 * and notify the scheduler for the running task
					 */
					dl.io.begin();
				}
				/* do not break the loop, it may be a multi-files zip */
			}
		}
		if (typeof pattern == "object" && !dontCleanUI) {
			this.cleanupUI(pattern);
		}

		this.remove(_pattern);
		Soon(percent_megatitle);
	}

	this.remove = function(pattern, check) {
		pattern = s2o(pattern);
		var tid = task2id(pattern);
		this.release(tid);
		removed.push(tid);
		dlQueue.filter(pattern);
		// dlQueue._queue = $.grep(dlQueue._queue, function(obj) {
			// var match = doesMatch(obj[0], pattern);
			// if (match) {
				// if (check) check(obj[0]);
				// if (d) console.log("remove task", pattern, obj[0].xid || obj[0].gid);
				// if (obj[0].destroy) obj[0].destroy();
			// }
			// return !match;
		// });
	};

	this.isRemoved = function(task) {
		if (!task.dl) {
			return true;
		}
		for (var i in removed) {
			if (doesMatch(task, removed[i]))
				return true;
		}
		return false;
	}

	this.pause = function(work) {
		var pattern = task2id(work)
		DEBUG("PAUSED ", pattern);

		if ($.inArray(pattern, locks) == -1) {
			// we want to save locks once
			locks.push(pattern);
		}

		work.__canretry = true;
		work.__ondone   = function() {
			work.__ondone = function() {
				DEBUG("here __ondone()->->");
				DownloadManager.release(pattern);
			};
		};
	}

	function isDLObject(obj) {
		return typeof obj === 'object' && typeof obj.onDownloadStart === 'function';
	}

	function task2id(pattern) {
		var obj;

		if (pattern instanceof ClassFile || pattern instanceof ClassChunk) obj = pattern.task;
		else if (isDLObject(pattern)) obj = pattern;

		if (obj) {
			if (typeof obj.zipid == "number") {
				pattern = 'zipid:' + obj.zipid;
			} else {
				pattern = 'id:' + obj.id;
			}
		}
		return pattern;
	}

	this.release = function(pattern) {
		var pattern = task2id(pattern)
		DEBUG("RELEASE LOCK TO ", pattern);
		removeValue(locks, pattern, true);
		if (!removeValue(removed, pattern, true))
		{
			pattern = s2o(pattern);
			for (var i in removed)
			{
				if (typeof removed[i] === 'object')
				{
					for (var k in pattern)
					{
						if (pattern[k] === removed[i][k])
						{
							removed.splice(i, 1);
							break;
						}
					}
				}
			}
		}
	}
}

var ioThrottlePaused = false;

function throttleByIO(writer) {
	writer.on('queue', function() {
		if (writer._queue.length >= IO_THROTTLE && !dlQueue.isPaused()) {
			DEBUG("IO_THROTTLE: pause XHR");
			dlQueue.pause();
			ioThrottlePaused = true;
		}
	});

	writer.on('working', function() {
		if (writer._queue.length < IO_THROTTLE && ioThrottlePaused) {
			DEBUG("IO_THROTTLE: resume XHR");
			dlQueue.resume();
			ioThrottlePaused = false;
		}
	});
}

// TODO: move the next functions to fm.js when no possible conflicts
function fm_tfsorderupd()
{
	M.t = {};
	$('.transfer-table tr[id]').each(function(pos,node)
	{
		if (d) ASSERT(-1 != ['ul','dl','zip'].indexOf((''+node.id).split('_').shift()), 'Huh, unexpected node id: ' + node.id);

		M.t[pos] = node.id;
		M.t[node.id] = pos;
	});
	if (d) console.log('M.t', M.t);
}

function fm_tfspause(gid)
{
	if (gid[0] === 'u') ulQueue.pause(gid);
	else dlQueue.pause(gid);
	$('.tranfer-download-indicator,.transfer-upload-indicator').removeClass('active');
}

function fm_tfsresume(gid)
{
	if (gid[0] === 'u') ulQueue.resume(gid);
	else dlQueue.resume(gid);
}

function fm_tfsmove(gid, dir) // -1:up, 1:down
{
	var tfs = $('#' + gid), to, act, p1, p2;
	ASSERT(tfs.length === 1,'Invalid transfer node: ' + gid);
	if (tfs.length != 1) return;
	
	ASSERT(GlobalProgress[gid] && GlobalProgress[gid].working.length == 0,'Invalid transfer state: ' + gid);
	if (!GlobalProgress[gid] || GlobalProgress[gid].working.length) return;

	if (~dir)
	{
		to  = tfs.next();
		act = 'after';
	}
	else
	{
		to  = tfs.prev();
		act = 'before';
	}
	
	var id = to && to.attr('id') || 'x';

	ASSERT(GlobalProgress[id] && GlobalProgress[id].working.length == 0,'Invalid [to] transfer state: ' + gid);
	if (!GlobalProgress[id] || GlobalProgress[id].working.length) return;
	
	if (id[0] == gid[0] || "zdz".indexOf(id[0]+gid[0]) != -1)
	{
		to[act](tfs);
	}
	else
	{
		if (d) console.log('Unable to move ' + gid);
		return;
	}

	fm_tfsorderupd();
	
	if (gid[0] === 'z' || id[0] === 'z')
	{
		var mQueue = [], trick = Object.keys(M.t).map(Number)
			.filter(function(n) {
				return !isNaN(n) && M.t[n][0] != 'u';
			}), p = 0;
		for (var i in trick)
		{
			ASSERT(i == trick[i] && M.t[i],'Oops..');
			var mQ = dlQueue.slurp(M.t[i]);
			for (var x in mQ)
			{
				(dl_queue[p]=mQ[x][0].dl).pos = p;
				++p;
			}
			mQueue = mQueue.concat(mQ);
		}
		// we should probably fix our Array inheritance
		for (var i = p, len = dl_queue.length ; i < len ; ++i )
		{
			delete dl_queue[i];
		}
		dl_queue.length = p;
		dlQueue._queue  = mQueue;
		fmUpdateCount();
		return;
	}
	
	if (gid[0] === 'u')
	{
		var m_prop  = 'ul';
		var mQueue  = ulQueue._queue;
		var m_queue = ul_queue;
	}
	else
	{
		var m_prop  = 'dl';
		var mQueue  = dlQueue._queue;
		var m_queue = dl_queue;
	}
	for (var i in mQueue)
	{
		if (mQueue[i][0][gid])
		{
			var tmp = mQueue[i], m_q = tmp[0][m_prop];
			p1 = +i+ dir;
			p2 = m_q.pos;
			tmp[0][m_prop].pos = mQueue[p1][0][m_prop].pos;
			mQueue[p1][0][m_prop].pos = p2;
			mQueue[i]  = mQueue[p1];
			mQueue[p1] = tmp;
			p1 = m_queue.indexOf(m_q);
			tmp = m_queue[p1];
			m_queue[p1] = m_queue[p1+dir];
			m_queue[p1+dir] = tmp;
			ASSERT(m_queue[p1].pos === mQueue[i][0][m_prop].pos, 'Huh, move sync error..');
			break;
		}
	}
	fmUpdateCount();
};

// chunk scheduler {{{
dlQueue.validateTask = function(pzTask)
{
	var r = pzTask instanceof ClassChunk || pzTask instanceof ClassEmptyChunk;

	if (!r && pzTask instanceof ClassFile && !fetchingFile)
	{
		var i = this._queue.length;
		while (i-- && !(this._queue[i][0] instanceof ClassChunk));

		if ((r = !~i) && $.len(this._qpaused))
		{
			fm_tfsorderupd();

			// About to start a new download, check if a previously paused dl was resumed.
			var p1 = M.t[pzTask.gid];
			for (var i = 0 ; i < p1 ; ++i)
			{
				var gid = M.t[i];
				if (this._qpaused[gid] && this.dispatch(gid)) return -0xBEEF;
			}
		}
	}
	return r;
};
// }}}

if (localStorage.dl_maxSlots) {
	dl_maxSlots = parseInt( localStorage.dl_maxSlots );
}

function checkLostChunks(file)
{
	var dl_key = file.key
		// , t = []

	// $.each(file.macs, function(i, mac) {
		// t.push(i);
	// });
	// t.sort(function(a, b) {
		// return parseInt(a) - parseInt(b);
	// });
	// $.each(t, function(i, v) {
		// t[i] = file.macs[v];
	// });

	var t = Object.keys(file.macs).map(Number)
		.sort(function(a, b) { return a - b })
		.map(function(v) { return file.macs[v]});

	var mac = condenseMacs(t,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);

	if (have_ab && (dl_key[6] != (mac[0]^mac[1]) || dl_key[7] != (mac[2]^mac[3]))) {
		return false;
	}

	if (file.data) {
		createnodethumbnail(
			file.id,
			new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]),
			++ul_faid,
			file.data,
			file.preview === -1
		);
	}

	return true;
}

/**
 *	DownloadQueue
 *
 *	Array extension to override push, so we can easily
 *	kick up the download (or queue it) without modifying the
 *	caller codes
 */
function DownloadQueue() {
}
inherits(DownloadQueue, Array);

DownloadQueue.prototype.getUrls = function(dl_chunks, dl_chunksizes, url) {
	var dl_urls = []
	$.each(dl_chunks, function(key, pos) {
		dl_urls.push({
			url: url + '/' + pos + '-' + (pos+dl_chunksizes[pos]-1),
			size: dl_chunksizes[pos],
			offset: pos
		})
	});

	return dl_urls;
}

DownloadQueue.prototype.splitFile = function(dl_filesize) {
	var dl_chunks = []
		, dl_chunksizes = []

	var pp, p = pp = 0;
	for (var i = 1; i <= 8 && p < dl_filesize-i*"128".KB(); i++) {
		dl_chunksizes[p] = i*"128".KB()
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	var chunksize = dl_filesize / dlQueue._limit / 2

	if (chunksize > "16".MB()) chunksize = "16".MB()
	else if (chunksize <= "1".MB()) chunksize = "1".MB();
	else chunksize = "1".MB() * Math.floor(chunksize / "1".MB())

	var reserved = dl_filesize - (chunksize * (dlQueue._limit - 1))
	while (p < dl_filesize) {
		dl_chunksizes[p] = p > reserved ? "1".MB() : chunksize;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	if (!(dl_chunksizes[pp] = dl_filesize-pp)) {
		delete dl_chunksizes[pp];
		delete dl_chunks[dl_chunks.length-1];
	}

	return {chunks: dl_chunks, offsets: dl_chunksizes};
}

var dl_lastquotawarning = 0
	, dl_retryinterval  = 1000

function dlQueuePushBack(aTask) {
	ASSERT(aTask && aTask.onQueueDone, 'Invalid aTask.');
	dlQueue.pushFirst(aTask);
	if (ioThrottlePaused) dlQueue.resume();
}

function failureFunction(task, args) {
	var code = args[1] || 0
		, dl = task.task.download

	ASSERT(code != 403, 'Got a 403 response, fixme.');
	if (d) console.error('Fai1ure', dl.zipname || dl.n, code, task.task.chunk_id, task.task.offset, task.onQueueDone.name );

	if (code == 509) {
		var t = NOW();
		if (t-dl_lastquotawarning > 60000) {
			dl_lastquotawarning = t;
			dl_reportstatus(dl, code == 509 ? EOVERQUOTA : ETOOMANYCONNECTIONS); // XXX
			dl.quota_t = setTimeout(function() { dlQueuePushBack(task); }, 60000);
			return 1;
		}
	}

	/* update UI */
	dl_reportstatus(dl, EAGAIN);

	/* check for network error  */
	dl.dl_failed = true;
	api_reportfailure(hostname(dl.url), network_error_check);
	dlQueuePushBack(task);

	return 2;
}

DownloadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments)
		, id = pos -1
		, dl  = this[id]
		, dl_id  = dl.ph || dl.id
		, dl_key = dl.key
		, dl_keyNonce = JSON.stringify([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7],dl_key[4],dl_key[5]])
		, dlIO

	if (dl.zipid) {
		if (!Zips[dl.zipid]) Zips[dl.zipid] = new ZipWriter(dl.zipid, dl);
		dlIO = Zips[dl.zipid].addEntryFile(dl);
	} else {
		dlIO = dl.preview ? new MemoryIO(dl_id, dl) : new dlMethod(dl_id, dl);
	}

	if (!use_workers) {
		dl.aes = new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);
	}

	/* In case it failed and it was manually cancelled and retried */
	DownloadManager.release("id:" + dl_id);

	dl.pos		= id // download position in the queue
	dl.dl_id	= dl_id;  // download id
	dl.io		= dlIO;
	dl.nonce	= dl_keyNonce
	// Use IO object to keep in track of progress
	// and speed
	dl.io.progress 	= 0;
	dl.io.size		= dl.size;
	dl.decrypter	= 0;


	if (!dl.zipid) {
		dl_writer(dl);
	} else {
		dl.writer = dlIO;
	}

	dl.macs  = {}
	dl.urls	 = []

	dlQueue.push(new ClassFile(dl));

	return pos;
};

function dl_reportstatus(dl, code)
{
	if (dl) {
		dl.lasterror = code;
		dl.onDownloadError(dl, code);
	}

	if(code === EKEY) {
		// TODO: Check if other codes should raise abort()
		Later(function() {
			DownloadManager.abort(dl, true);
		});
	}
}

function dlGetUrlDone(res, ctx) {
	if (typeof res == 'number') {
		dl_reportstatus(ctx.object, res);
	} else if (typeof res == 'object') {
		if (res.d) {
			dl_reportstatus(ctx.object, res.d ? 2 : 1)
		} else if (res.g) {
			var ab = base64_to_ab(res.at)
				, o = dec_attr(ab ,[ctx.dl_key[0]^ctx.dl_key[4],ctx.dl_key[1]^ctx.dl_key[5],ctx.dl_key[2]^ctx.dl_key[6],ctx.dl_key[3]^ctx.dl_key[7]]);

			if (typeof o == 'object' && typeof o.n == 'string') {
				if (have_ab && res.s <= 48*1048576 && is_image(o.n) && (!res.fa || res.fa.indexOf(':0*') < 0 || res.fa.indexOf(':1*') < 0 || ctx.object.preview === -1)) {
					ctx.object.data = new ArrayBuffer(res.s);
				}
				return ctx.next(false, res, o, ctx.object);
			}
			dl_reportstatus(ctx.object, EAGAIN);
		} else {
			dl_reportstatus(ctx.object, res.e);
		}
	} else {
		dl_reportstatus(ctx.object, EAGAIN);
	}

	dl_retryinterval *= 1.2;
	ctx.next(new Error("failed"))
}

function dlGetUrl(object, callback) {
	var req = {
		a : 'g',
		g : 1,
		ssl : use_ssl,
	}

	if (object.ph) {
		req.p = object.ph;
	} else if (object.id) {
		req.n = object.id;
	}

	api_req(req, {
		object: object,
		next: callback,
		dl_key: object.key,
		callback: dlGetUrlDone
	},n_h ? 1 : 0);
}

function IdToFile(id) {
	var dl = {};
	for (var i in dl_queue)
	{
		if (id == dl_queue[i].id)
		{
			dl = dl_queue[i];
			ASSERT(dl.pos == i, 'dl.pos !== i');
			break;
		}
	}
	// $.each(dl_queue, function(i, _dl) {
		// if (id == _dl.id) {
			// dl = _dl
			// dl.pos = i
			// return false;
		// }
	// });
	return dl;
}

if(localStorage.dlMethod) {
	dlMethod = window[localStorage.dlMethod];
} else if (is_chrome_firefox & 4) {
	dlMethod = FirefoxIO;
} else if (window.webkitRequestFileSystem) {
	dlMethod = FileSystemAPI;
} else if (navigator.msSaveOrOpenBlob || "download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a")) {
	dlMethod = MemoryIO;
} else {
	dlMethod = FlashIO;
}

if(dlMethod.init) dlMethod.init();

var dl_queue = new DownloadQueue
