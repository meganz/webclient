var dlMethod
	, dl_maxSlots = 4
	, dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined')
	, dl_maxchunk = 16*1048576
	, dlQueue = new QueueClass(downloader)
	, dlDecrypter = new QueueClass(decrypter)
	, dl_id

dlQueue.push = function(x) {
	if (!x.task) {
		throw new Error("invalid error");
	}
	QueueClass.prototype.push.apply(dlQueue, arguments);
};

/** @FIXME: move me somewhere else */
$.len = function(obj) {
	var L=0;
	$.each(obj, function(i, elem) {
		L++;
	});
	return L;
}

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
		var _match = true;

		$.each(s2o(pattern), function(key, value) {
			if (typeof task.task[key] == "undefined" || task.task[key] != value) {
				_match = false;
				return false;
			}
		});
		return _match;
	}

	self.debug = function() {
		DEBUG("blocked patterns", locks);
	};

	self.cleanupUI = function(dl, done) {
		if (dl.zipid) {
			$.each(dl_queue, function(i, file) {
				if (file.zipid == dl.zipid) {
					dl_queue[i] = {}; /* remove it */
				}
			});
			if (dlMethod != FlashIO || !done) $('#zip_' + dl.zipid).remove();
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
			if (dlMethod != FlashIO || !done) $('#dl_' + dl.id).remove();
		}
	}

	self.abortAll = function() {
		$.each(dl_queue, function(i, file) {
			if (file.id || file.zipid) {
				self.abort(file);
			}
		});
		megatitle();
	}

	self.abort = function(pattern, dontCleanUI) {
		var _pattern = s2o(pattern);
		$.each(dl_queue, function(i, dl) {
			if (doesMatch({task:dl}, _pattern)) {
				if (!dl.cancelled && typeof dl.io.abort == "function") try {
					dl.io.abort("User cancelled");
				} catch(e) {
					DEBUG(e.message, e);
				}
				dl.cancelled = true;
				/* do not break the loop, it may be a multi-files zip */
			}
		});
		if (typeof pattern == "object" && !dontCleanUI) {
			self.cleanupUI(pattern);
		}

		self.remove(_pattern);
		megatitle();
	}

	self.remove = function(pattern, check) {
		check = check || function() {};
		pattern = s2o(pattern);
		removed.push(task2id(pattern))
		dlQueue._queue = $.grep(dlQueue._queue, function(obj) {
			var match = doesMatch(obj, pattern);
			if (match) {
				check(obj);
				DEBUG("remove task " + obj.__tid, pattern);
			}
			return !match;
		});
	};

	self.isRemoved = function(task) {
		var enabled = true;
		$.each(removed, function(i, pattern) {
			if (doesMatch(task, pattern)) {
				enabled = false;
				return false; /* break */
			}
		});
		return !enabled;
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
		removeValue(locks, pattern);
		removeValue(removed, pattern);
	}

	self.enabled = function(task) {
		var enabled = true;
		if (task.__canretry) {
			DEBUG("RETRYING TASK");
			return true;
		}
		$.each(locks, function(i, pattern) {
			if (doesMatch(task, pattern)) {
				enabled = false;
				return false; /* break */
			}
		});
		return enabled;
	}

}

/**
 *	Override the downloader scheduler method.
 *	The idea is to select chunks from the same
 *	file_id, always
 */
dlQueue.getNextTask = (function() {
	/* private variable to keep in track
	   the current file id */
	var current = null
		, DM = DownloadManager

	return function() {
		var queue = {}
			, self = this
			, candidate = null

		$.each(self._queue, function(p, pzTask) {
			if (!DM.enabled(pzTask)) return;
			if (pzTask.download && pzTask.download.dl_id == current) {
				candidate = p;
				return false; /* break */
			}
			if (candidate === null) {
				/* make it our candidate but don't break the loop */
				candidate = p;
			}
		});

		if (candidate !== null)  {
			candidate = self._queue.splice(candidate, 1)[0]
			current = (candidate.download||{}).dl_id;
		}

		if (false && !candidate) {
			DEBUG("next task is", candidate, fetchingFile, self._queue);
			DM.debug();
		}

		return candidate;
	};
})();

if (localStorage.dl_maxSlots) {
	dl_maxSlots = localStorage.dl_maxSlots;
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
			file.data
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
	for (var i = 1; i <= 8 && p < dl_filesize-i*131072; i++) {
		dl_chunksizes[p] = i*131072;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	while (p < dl_filesize) {
		dl_chunksizes[p] = Math.floor((dl_filesize-p)/1048576+1)*1048576;
		if (dl_chunksizes[p] > dl_maxchunk) dl_chunksizes[p] = dl_maxchunk;
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

function failureFunction(reschedule, task, args) {
	var code = args[1] || 0
		, dl = task.task.download

	DownloadManager.pause(task);

	if (code == 509) {
		var t = new Date().getTime();
		if (!dl_lastquotawarning || t-dl_lastquotawarning > 55000) {
			dl_lastquotawarning = t;
			dl_reportstatus(dl, code == 509 ? EOVERQUOTA : ETOOMANYCONNECTIONS);
			setTimeout(function() {
				reschedule(); 
			}, 60000);
			return;
		}		
	}

	dl_reportstatus(dl, EAGAIN);

	dl_retryinterval *= 1.2;
	setTimeout(function() {
		var range = (dl.url||"").replace(/.+\//, '');
		dlGetUrl(dl, function (error, res, o) {
			if (!error) {
				task.url = res.g + '/' + range; /* new url */
			}
			reschedule(); 
		});
	}, dl_retryinterval);
}

DownloadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments)
		, id = pos -1
		, dl  = this[id]
		, dl_id  = dl.ph || dl.id
		, dl_key = dl.key
		, dl_retryinterval = 1000
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

	dl.macs  = {}
	dl.urls	 = []
	dl.decrypt = 0;

	dlQueue.push(new ClassFile(dl));

	return pos;
};

function dl_reportstatus(dl, code)
{
	if (dl) {
		dl.lasterror = code;
		dl.onDownloadError(dl.dl_id, code, dl.pos);
	}
	
	if(code === EKEY) {
		// TODO: Check if other codes should raise abort()
		DownloadManager.abort(dl, true);
	}
}

function dlGetUrl(object, callback) {
	var req = { 
		a : 'g', 
		g : 1, 
		ssl : use_ssl,
	}, dl_key = object.key

	if (object.ph) {
		req.p = object.ph;
	} else if (object.id) {
		req.n = object.id;
	}

	api_req(req, {
		callback: function(res, rex) {
			if (typeof res == 'object') {
				if (typeof res == 'number') {
					dl_reportstatus(object, res);
				} else {
					if (res.d) {
						dl_reportstatus(object, res.d ? 2 : 1)
					} else if (res.g) {
						var ab = base64_to_ab(res.at)
							, o = dec_attr(ab ,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);
	
						if (typeof o == 'object' && typeof o.n == 'string') {
							if (have_ab && res.s <= 48*1048576 && is_image(o.n) && (!res.fa || res.fa.indexOf(':0*') < 0 || res.fa.indexOf(':1*') < 0)) {
								object.data = new ArrayBuffer(res.s);				
							}
							return callback(false, res, o, object);
						}
						dl_reportstatus(object, EGAIN);
					} else {
						dl_reportstatus(object, res.e);
					}
				}
			} else {
				dl_reportstatus(object, EAGAIN);
			}
			
			dl_retryinterval *= 1.2;
			callback(new Error("failed"))
		}
	});
}

if(localStorage.dlMethod) {
	dlMethod = window[localStorage.dlMethod];
}
else if (window.webkitRequestFileSystem) {
	dlMethod = FileSystemAPI;
} else if (navigator.msSaveOrOpenBlob) {
	dlMethod = BlobBuilderIO;
} else if ("download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a")) {
	dlMethod = MemoryIO;
} else {
	dlMethod = FlashIO;
}
dlMethod = FlashIO;

if(dlMethod.init) dlMethod.init();

var dl_queue = new DownloadQueue
