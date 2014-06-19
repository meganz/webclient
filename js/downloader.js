var fetchingFile = null, __ccXID = 0
	/**
	 *  How many queue IO we want before pausing the
	 *	XHR fetching, useful when we have internet
	 *  faster than our IO (first world problem)
	 */
	, IO_THROTTLE = 15

// Chunk fetch {{{
var GlobalProgress = {};

function ClassChunk(task) {
	this.task = task;
	this.dl   = task.download;
	this.url  = task.url
	this.size = task.size
	this.io	  = task.download.io
	this.done = false
	this.avg  = [0, 0]
	this.gid  = this.dl.zipid ? 'zip_' + this.dl.zipid : 'dl_' + this.dl.dl_id
	this.xid  = this.gid + "_" + (++__ccXID)
	this.failed   = false
	this.backoff  = 1936+Math.floor(Math.random()*2e3);
	this.lastPing = NOW()
	this.lastUpdate = NOW()
	this.Progress   = GlobalProgress[this.gid]
	this.Progress.dl_xr = this.Progress.dl_xr || getxr() // global download progress
	this.Progress.speed = this.Progress.speed || 1
	this.Progress.size  = this.Progress.size  || (this.dl.zipid ? Zips[this.dl.zipid].size : this.io.size)
	this.Progress.dl_lastprogress = this.Progress.dl_lastprogress || 0;
	this.Progress.dl_prevprogress = this.Progress.dl_prevprogress || 0;
	this.Progress.data[this.xid] = [0, task.size];
}

// destroy {{{
ClassChunk.prototype.destroy = function() {
	if (this.xhr) this.xhr.xhr_cleanup(0x9ffe);

	oDestroy(this);
};
// }}}

// shouldIReportDone {{{
ClassChunk.prototype.shouldIReportDone = function(report_done) {
	var pbx = this.Progress.data[this.xid];
	if (!pbx) return;

	if (!report_done) report_done = !this.done && iRealDownloads <= dlQueue._limit * 1.2
		&& (pbx[1]-pbx[0])/this.Progress.speed <= dlDoneThreshold;

	if (report_done) {
		DEBUG('reporting done() earlier to start another download');
		this.done = true;
		this.task_done();
	}

	return report_done;
};
// }}}

// updateProgress {{{
ClassChunk.prototype.updateProgress = function(force) {
	if (ui_paused) {
		// do not update the UI
		return false;
	}

	// var r = this.shouldIReportDone(force === 2);
	var r = force !== 2 ? this.shouldIReportDone() : 0x7f;
	if (this.Progress.dl_lastprogress+200 > NOW() && !force) {
		// too soon
		return false;
	}
	var _progress = this.Progress.done
	for (var i in this.Progress.data) {
		_progress += this.Progress.data[i][0];
	}

	this.dl.onDownloadProgress(
		this.dl.dl_id,
		Math.min(99,Math.floor(_progress/this.Progress.size*100)),
		_progress, // global progress
		this.Progress.size, // total download size
		this.Progress.speed = this.Progress.dl_xr.update(_progress - this.Progress.dl_prevprogress),  // speed
		this.dl.pos, // this download position
		force && force !== 2
	);

	this.Progress.dl_prevprogress = _progress
	this.Progress.dl_lastprogress = NOW()

	return r;
}
// }}}

// isCancelled {{{
ClassChunk.prototype.isCancelled = function() {
	if (this._cancelled) {
		/* aborted already */
		DEBUG('Already xhr.abort()ed it...');
		return true;
	}
	var is_cancelled = !!this.dl.cancelled;
	if (!is_cancelled) {
		if(typeof(this.dl.pos) !== 'number') {
			this.dl.pos = IdToFile(this.dl).pos
		}
		is_cancelled = !dl_queue[this.dl.pos].n;
	}
	if (is_cancelled) {
		this._cancelled = true;
		DEBUG("Chunk aborting itself because download was cancelled ", this.localId);
		this.finish_download();
		return true;
	}
}
// }}}

// finish_download {{{
ClassChunk.prototype.finish_download = function(NoError) {
	ASSERT(!!this.xhr, "Don't call me twice!");
	if (this.xhr) {
		ASSERT(iRealDownloads > 0, 'Inconsistent iRealDownloads');
		this.xhr.xhr_cleanup(0x9ffe);
		delete this.xhr;
		iRealDownloads--;
		if (!this.done || NoError === false) {
			this.task_done.apply(this, arguments);
		}
	}
}
// }}}

// XHR::on_progress {{{
ClassChunk.prototype.on_progress = function(args) {
	if (!this.Progress.data[this.xid] || this.isCancelled()) return;
	// if (args[0].loaded) this.Progress.data[this.xid][0] = args[0].loaded;
	// this.updateProgress(!!args[0].zSaaDc ? 0x9a : 0);
	this.Progress.data[this.xid][0] = args[0].loaded;
	this.updateProgress();
};
// }}}

// XHR::on_error {{{
ClassChunk.prototype.on_error = function(args, xhr) {
	if (d) console.error('ClassChunk.on_error', this.task.chunk_id, args, xhr, this);

	this.Progress.data[this.xid][0] = 0; /* reset progress */
	this.updateProgress(2);

/*	if (this.done) {
		// We already told the scheduler we were done
		// with no error and this happened. Should I reschedule this
		// task?
		this.failed = true;
		return setTimeout(function(q) {
			q.request();
		}, this.backoff *= 1.2, this);
	}*/

	// this.xhr = null;
	// return this.task_done(false, xhr.status);
	// return this.finish_download(false, xhr.status);
	this.failed = this.done;
	return setTimeout(function()
	{
		if (this.backoff > 40000)
		{
			this.backoff = 950+Math.floor(Math.random()*9e3);
		}
		this.finish_download(false, xhr.status);
	}.bind(this), this.backoff *= 1.2 );
}
// }}}

// XHR::on_ready {{{
ClassChunk.prototype.on_ready = function(args, xhr) {
	if (this.isCancelled()) return;
	var r = xhr.response || {};
	if (r.byteLength == this.size) {
		this.Progress.done += r.byteLength;
		delete this.Progress.data[this.xid];
		this.updateProgress(true);
		if (navigator.appName != 'Opera') {
			this.io.dl_bytesreceived += r.byteLength;
		}
		this.dl.decrypter++;
		Decrypter.push([
			[this.dl, this.task.offset],
			this.dl.nonce,
			this.task.offset/16,
			new Uint8Array(r)
		])
		if (this.failed) DownloadManager.release(this);
		this.failed = false;
		this.dl.retries = 0;
		this.finish_download();
		this.destroy();
	} else if (!this.dl.cancelled) {
		if (d) console.error("HTTP FAILED", this.dl.n, xhr.status, "am i done? "+this.done, r.bytesLength, this.size);
		return 0xDEAD;
	}
};
// }}}

ClassChunk.prototype.request = function() {
	this.xhr = getXhr(this);

	if (dlMethod == FileSystemAPI) {
		var t = this.url.lastIndexOf('/dl/')
			, r = this.url.lastIndexOf('/dl/')
		this.xhr.open('POST', this.url.substr(0, t+1));
		this.xhr.setRequestHeader("MEGA-Chrome-Antileak", this.url.substr(t));
	} else {
		this.xhr.open('POST', this.url, true);
	}

	this.xhr.responseType = have_ab ? 'arraybuffer' : 'text';
	this.xhr.send();
	DEBUG("Fetch " + this.url);
}

ClassChunk.prototype.run = function(task_done) {
	iRealDownloads++;
	this.localId = iRealDownloads;
	if (this.size < 100 * 1024 && iRealDownloads <= dlQueue._limit * 0.5) {
		/**
		 *	It is an small chunk and we *should* finish soon if everything goes
		 *	fine. We release our slot so another chunk can start now. It is useful
		 *	to speed up tiny downloads on a ZIP file
		 */
		this.tiny = true;
		this.done = true;
		task_done();
	}

	this.task_done = task_done;
	if (!this.io.dl_bytesreceived) {
		this.io.dl_bytesreceived = 0;
	}

	this.request(); /* let the fun begin! */
};
// }}}

// ClassFile {{{
function ClassEmptyChunk(dl) {
	this.task = { zipid: dl.zipid, id: dl.id};
	this.dl	  = dl;
}

ClassEmptyChunk.prototype.run = function(task_done) {
	var self = this;
	this.dl.io.write("", 0, function() {
		task_done();
		self.dl.ready();
		self.dl = null;
		self = null;
	});
}

function ClassFile(dl) {
	this.task = dl;
	this.dl   = dl;
	this.gid  = dl.zipid ? 'zip_' + dl.zipid : 'dl_' + dl.dl_id
	if (!dl.zipid || !GlobalProgress[this.gid]) {
		GlobalProgress[this.gid] = {data: {}, done: 0};
	}
}

ClassFile.prototype.destroy = function() {
	if (!this.emptyFile && !checkLostChunks(this.dl) &&
		(typeof skipcheck == 'undefined' || !skipcheck)) {
		dl_reportstatus(this.dl, EKEY);
	}

	if (!this.dl.cancelled) {
		DEBUG("done download", this.dl.zipid, this.dl.cancelled)
		if (this.dl.zipid) {
			this.task = null;
			return Zips[this.dl.zipid].done();
		}

		this.dl.onDownloadProgress(
			this.dl.dl_id,
			100,
			this.dl.size,
			this.dl.size,
			0,
			this.dl.pos
		);

		this.dl.onBeforeDownloadComplete(this.dl.pos);
		if (!this.dl.preview) {
			this.dl.io.download(this.dl.zipname || this.dl.n, this.dl.p || '');
		}
		this.dl.onDownloadComplete(this.dl.dl_id, this.dl.zipid, this.dl.pos);
		if (dlMethod != FlashIO) DownloadManager.cleanupUI(this.dl, true);
	}

	delete GlobalProgress[this.gid];

	this.dl.writer.destroy();
	oDestroy(this);
}

ClassFile.prototype.run = function(task_done) {
	fetchingFile = 1;
	this.dl.retries = 0; /* set the retries flag */

	DEBUG("dl_key " + this.dl.key);
	this.dl.onDownloadStart(this.dl.dl_id, this.dl.n, this.dl.size, this.dl.pos);

	this.dl.ready = function() {
		if(d) console.log('is cancelled?', this.chunkFinished, this.dl.writer.isEmpty(), this.dl.decrypter == 0)
		if (this.chunkFinished && this.dl.decrypter == 0 && this.dl.writer.isEmpty()) {
			DEBUG('destroy');
			this.destroy();
		}
	}.bind(this);

	this.dl.io.begin = function() {
		var tasks = [];
		if (d) console.log('Adding', (this.dl.urls||[]).length, 'tasks for', this.dl.dl_id);
		if (this.dl.urls) for (var key in this.dl.urls)
		{
			var url = this.dl.urls[key];

			tasks.push(new ClassChunk({
				url      : url.url,
				size     : url.size,
				offset   : url.offset,
				download : this.dl,
				chunk_id : key,
				zipid    : this.dl.zipid,
				id       : this.dl.id
			}));
		}

		if ((this.emptyFile = (tasks.length == 0))) tasks.push(new ClassEmptyChunk(this.dl));

		dlQueue.pushAll(tasks, function onChunkFinished() { this.chunkFinished = true }.bind(this), failureFunction);

		fetchingFile = 0;
		task_done();

		delete this.dl.urls;
		delete this.dl.io.begin;
		task_done = null;
	}.bind(this);

	dlGetUrl(this.dl, function(error, res, o) {
		if (error) {
			/* failed */
			fetchingFile = 0;
			task_done(); /* release worker */
			setTimeout(function() {
				/* retry !*/
				ERRDEBUG('retrying ', this.dl.n);
				dlQueue.pushFirst(this);
				if (ioThrottlePaused) dlQueue.resume();
			}, dl_retryinterval);
			DEBUG('retry to fetch url in ', dl_retryinterval, ' ms');
			return false;
		}
		var info = dl_queue.splitFile(res.s);
		this.dl.url  = res.g;
		this.dl.urls = dl_queue.getUrls(info.chunks, info.offsets, res.g)
		return this.dl.io.setCredentials(res.g, res.s, o.n, info.chunks, info.offsets);
	}.bind(this));
};
// }}}

function dl_writer(dl, is_ready) {

	dl.decrypter = 0;

	dl.writer = new MegaQueue(function dlIOWriterStub(task, done) {
		dl.io.write(task.data, task.offset, function() {
			dl.writer.pos += task.data.length;
			if (dl.data) {
				new Uint8Array(
					dl.data,
					task.offset,
					task.data.length
				).set(task.data);
			}

			done();

			if (typeof task.callback == "function") {
				task.callback();
			}

			dl.ready(); /* tell the download scheduler we're done */

			delete task.data;
		});
	}, 1);

	throttleByIO(dl.writer);

	dl.writer.pos = 0

	dl.writer.validateTask = function(t) {
		var r = (!is_ready || is_ready()) && t.offset == dl.writer.pos;
		// if (d) console.log('validateTask', r, t.offset, dl.writer.pos, t, dl, dl.writer);
		return r;
	};
};

var Decrypter = CreateWorkers('decrypter.js', function(context, e, done) {
	var dl = context[0]
		, offset = context[1]

	if (typeof(e.data) == "string") {
		if (e.data[0] == '[') {
			var t = JSON.parse(e.data), pos = offset
			for (var i = 0; i < t.length; i += 4, pos = pos+1048576) {
				dl.macs[pos] = [t[i],t[i+1],t[i+2],t[i+3]];
			}
		}
		DEBUG("worker replied string", e.data, dl.macs);
	} else {
		var plain = new Uint8Array(e.data.buffer || e.data);
		DEBUG("Decrypt done", dl.cancelled);
		dl.decrypter--
		if (!dl.cancelled) {
			dl.writer.push({ data: plain, offset: offset});
		}
		plain = null
		done();
	}
}, 4);

/**
 *	Keep in track real active downloads.
 *
 *	Despite the fact that the DownloadQueue has a limitted size,
 *	to speed up things for tiny downloads each download is able to
 *	report to the scheduler that they are done when it may not be necessarily
 *	true (but they are for instance close to their finish)
 */
var iRealDownloads = 0
	// ETA (in seconds) to consider a download finished, used to speed up chunks
	, dlDoneThreshold = 3

function downloader(task, done) {
	if (DownloadManager.isRemoved(task)) {
		DEBUG("removing old task");
		return done();
	}
	return task.run(done);
}

function getxr()
{
	return {
		update : function(b)
		{
			var ts = Date.now(), t;
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
