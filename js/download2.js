var dlMethod
	, dl_maxSlots = 4
	, dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined')
	, dl_maxchunk = 16*1048576
	, dlQueue = new MegaQueue(downloader)
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
	var self = this
		, locks = []
		, removed = []

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
			if (typeof task.task[key] == "undefined" || task.task[key] != pattern[key])
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

	self.newUrl = function(dl) {
		DEBUG("ask for new URL for", dl.dl_id);
		dlGetUrl(dl, function (error, res, o) {
			if (error) return self.newUrl(dl);
			var changed = 0
			for (var i = 0; i < dlQueue._queue.length; i++) {
				if (dlQueue._queue[i][0].dl === dl) {
					dlQueue._queue[i][0].url = res.g + "/" +
						dlQueue._queue[i][0].url.replace(/.+\//, '')
					changed++
				}
			}
			DEBUG("got", changed, "new URL for", dl.dl_id, "resume everything");
		});
	}

	self.debug = function() {
		DEBUG("blocked patterns", locks);
	};

	self.cleanupUI = function(dl, force) {
		var selector = null
		if (dl.zipid) {
			$.each(dl_queue, function(i, file) {
				if (file.zipid == dl.zipid) {
					dl_queue[i] = {}; /* remove it */
				}
			});
			delete Zips[dl.zipid];
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

	self.abortAll = function() {
		$.each(dl_queue, function(i, file) {
			if (file.id || file.zipid) {
				self.abort(file);
			}
		});
		percent_megatitle();
	}

	self.abort = function(pattern, dontCleanUI) {
		var _pattern = s2o(pattern);
		$.each(dl_queue, function(i, dl) {
			if (doesMatch({task:dl}, _pattern)) {
				if (!dl.cancelled && typeof dl.io.abort == "function") try {
					if (d) console.log('IO.abort', dl.zipid || dl.id, dl);
					dl.io.abort("User cancelled");
				} catch(e) {
					DEBUG(e.message, e);
				}
				if (dl.zipid) Zips[dl.zipid].cancelled = true;
				dl.cancelled = true;
				/* do not break the loop, it may be a multi-files zip */
			}
		});
		if (typeof pattern == "object" && !dontCleanUI) {
			self.cleanupUI(pattern);
		}

		self.remove(_pattern);
		Soon(percent_megatitle);
	}

	self.remove = function(pattern, check) {
		pattern = s2o(pattern);
		removed.push(task2id(pattern))
		dlQueue._queue = $.grep(dlQueue._queue, function(obj) {
			var match = doesMatch(obj[0], pattern);
			if (match) {
				if (check) check(obj[0]);
				if (d) console.log("remove task", pattern, obj[0].xid || obj[0].gid);
				if (obj[0].destroy) obj[0].destroy();
			}
			return !match;
		});
	};

	self.isRemoved = function(task) {
		for (var i in removed) {
			if (doesMatch(task, removed[i]))
				return true;
		}
		return false;
	}

	self.pause = function(work) {
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
				self.release(pattern);
			};
		};
	}

	function task2id(pattern) {
		if (pattern instanceof ClassFile || pattern instanceof ClassChunk) {
			if (typeof pattern.task.zipid == "number") {
				pattern = 'zipid:' + pattern.task.zipid;
			} else {
				pattern = 'id:' + pattern.task.id;
			}
		}
		return pattern;
	}

	self.release = function(pattern) {
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

// downloading variable {{{
dlQueue.on('working', function() {
	downloading = true;
});

dlQueue.on('resume', function() {
	downloading =!dlQueue.isEmpty();
});

dlQueue.on('pause', function() {
	downloading =!dlQueue.isEmpty();
});

dlQueue.on('drain', function() {
	downloading =!dlQueue.isEmpty();
});
// }}}

// chunk scheduler {{{
dlQueue.prepareNextTask = function() {
	this.has_chunk = false;
	for (var i = 0; i < this._queue.length; i++) {
		if (this._queue[i][0] instanceof ClassChunk) {
			this.has_chunk = true;
			break;
		}
	}
};

dlQueue.validateTask = function(pzTask, next) {
	var r = pzTask instanceof ClassChunk || pzTask instanceof ClassEmptyChunk
		|| (pzTask instanceof ClassFile && !fetchingFile && !this.has_chunk);
	// if (d) console.log('dlQueue.validateTask', r, next, pzTask);
	return r;
};
// }}}

if (localStorage.dl_maxSlots) {
	dl_maxSlots = parseInt( localStorage.dl_maxSlots );
}

function checkLostChunks(file)
{
	var t = []
		, dl_key = file.key

	$.each(file.macs, function(i, mac) {
		t.push(i);
	});
	t.sort(function(a, b) {
		return parseInt(a) - parseInt(b);
	});

	$.each(t, function(i, v) {
		t[i] = file.macs[v];
	});

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
		, dlIO = dl.preview ? new MemoryIO(dl_id, dl) : new dlMethod(dl_id, dl)
		, dl_keyNonce = JSON.stringify([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7],dl_key[4],dl_key[5]])

	if (dl.zipid) {
		if (!Zips[dl.zipid]) {
			Zips[dl.zipid] = new dlZipIO(dl, dl_id);
		}
		var tZip = Zips[dl.zipid];
		dlIO.write = tZip.getWriter(dl);
		dlIO.abort = tZip.IO.abort;
		dlIO.dl_xr = tZip.dl_xr
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

	dl_writer(dl);

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
		DownloadManager.abort(dl, true);
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
			dl_reportstatus(ctx.object, EGAIN);
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
} else if (navigator.msSaveOrOpenBlob) {
	dlMethod = BlobBuilderIO;
} else if ("download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a")) {
	dlMethod = MemoryIO;
} else {
	dlMethod = FlashIO;
}

if(dlMethod.init) dlMethod.init();

var dl_queue = new DownloadQueue
