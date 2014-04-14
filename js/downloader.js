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
	this.gid      = this.dl.zipid ? 'zip_' + this.dl.zipid : 'file_' + this.dl.dl_id
	this.failed   = false
	this.backoff  = 1000
	this.lastPing = NOW()
	this.lastUpdate = NOW()
	this.Progress   = GlobalProgress[gid]
	this.Progress.dl_xr = this.Progress.dl_xr || getxr() // global download progress
	this.Progress.speed = this.Progress.speed || 1
	this.Progress.size  = this.Progress.size  || (download.zipid ? Zips[download.zipid].size : io.size)
	this.Progress.dl_lastprogress = this.Progress.dl_lastprogress || 0;
	this.Progress.dl_prevprogress = this.Progress.dl_prevprogress || 0;
	this.Progress.data[url] = [0, task.size];
}

// destroy {{{
ClassChunk.destroy = function() {
	this.dl   = null;
	this.task = null;
};
// }}}

// shouldIReportDone {{{
ClassChunk.prototype.shouldIReportDone = function() {
	if (!this.Progress.data[this.url]) return;
	var remain = this.Progress.data[this.url][1]-this.Progress.data[this.url][0]
	if (!this.done && iRealDownloads <= dlQueue._concurrency * 1.2 && remain/this.Progress.speed <= dlDoneThreshold) {
		this.done = true;
		task_done();
	}
};
// }}}

// updateProgress {{{
ClassChunk.prototype.updateProgress = function(force) {
	if (dlQueue.isPaused()) {
		// do not update the UI
		return false;
	}

	this.shouldIReportDone();
	if (this.Progress.dl_lastprogress+500 > NOW() && !force) {
		// too soon
		return false;
	}
	var _progress = this.Progress.done
	$.each(this.Progress.data, function(i, val) {
		_progress += val[0];
	});
			
	var percentage = Math.floor(_progress/this.Progress.size*100);
	percentage = (percentage == 100) ? 99 : percentage;

	this.dl.onDownloadProgress(
		this.dl.dl_id, 
		percentage, 
		_progress, // global progress
		this.Progress.size, // total download size
		this.Progress.speed = this.Progress.dl_xr.update(_progress - this.Progress.dl_prevprogress),  // speed
		this.dl.pos // this download position
	);

	this.Progress.dl_prevprogress = _progress
	this.Progress.dl_lastprogress = NOW()
}
// }}}

// isCancelled {{{
ClassChunk.prototype.isCancelled = function() {
	if (this._cancelled) {
		/* aborted already */
		console.warn('CHECK THIS', 'It shouldnt be reached since we xhr.abort()ed it.');
		return true;
	}
	var is_cancelled = !!this.dl.cancelled;
	if (!is_cancelled) {
		if(typeof(this.dl.pos) !== 'number') {
			this.dl.pos = IdToFile(this.dl).pos
		}
		is_canceled = !dl_queue[download.pos].n;
	}
	if (is_cancelled) {
		this._cancelled = true;
		DEBUG("Chunk aborting itself because download was cancelled ", localId);
		this.xhr.abort();
		this.finish_upload();
		return true;
	}
}
// }}}

// finish_upload {{{
ClassChunk.prototype.finish_upload = function() {
	if (this.is_finished) return;
	this.is_finished  = true;
	this.xhr = null;
	if (!this.done) this.task_done();
	iRealDownloads--;
}
// }}}

// XHR::on_progress {{{
ClassChunk.prototype.on_progress = function(e) {
	if (this.isCancelled()) return;
	this.Progress.data[this.url][0] = e.loaded;
	this.updateProgress();
};
// }}}

ClassChunk.prototype.on_error = function() {
	if (!this || this.has_failed) return;
};

ClassChunk.prototype.request = function() {
	this.xhr = getXhr(this);
}

ClassChunk.prototype.run = function(task_done) {
	iRealDownloads++;
	if (size < 100 * 1024 && iRealDownloads <= dlQueue._concurrency * 0.5) {
		/** 
		 *	It is an small chunk and we *should* finish soon if everything goes
		 *	fine. We release our slot so another chunk can start now. It is useful
		 *	to speed up tiny downloads on a ZIP file
		 */
		this.done = true;
		task_done();
	}
	
	this.task_done = task_done;
};

function ClassChunk(task) {
	this.task = task;
	this.dl   = task.download;

	var self = this;

	this.run = function(task_done) {
		iRealDownloads++;

		var xhr
			, url = task.url
			, size = task.size
			, download = task.download
			, io = download.io
			, average_throughput = [0, 0]
			, done = false
			, speed = 1 // speed of the current chunk
			, lastUpdate  = NOW()
			, lastPing    = NOW()
			, localId = iRealDownloads
			, backoff = 1000
			, failed = false
			, gid    = download.zipid ? 'zip_' + download.zipid : 'file_' + download.dl_id
			, _cancelled = false

		var Progress = GlobalProgress[gid];

		Progress.dl_xr = Progress.dl_xr || getxr() // global download progress
		Progress.speed = Progress.speed || 1
		Progress.size  = Progress.size  || (download.zipid ? Zips[download.zipid].size : io.size)
		Progress.dl_lastprogress = Progress.dl_lastprogress || 0;
		Progress.dl_prevprogress = Progress.dl_prevprogress || 0;
		Progress.data[url] = [0, task.size];

		if (size <= 100*1024 && iRealDownloads <= dlQueue._concurrency * .5) {
			done = true;
			task_done();
		}

		/**
		 *	Check if the current chunk is small or close to its
		 *	end, so it can cheat to the scheduler telling they are 
		 *	actually done
		 */
		function shouldIReportDone() {
			if (!Progress.data[url]) return;
			var remain = Progress.data[url][1]-Progress.data[url][0]
			if (!done && iRealDownloads <= dlQueue._concurrency * 1.2 && remain/Progress.speed <= dlDoneThreshold) {
				done = true;
				task_done();
			}
		}
	
		function updateProgress(force) {
			if (dlQueue.isPaused()) {
				// do not update the UI
				return false;
			}

			shouldIReportDone();

			// Update global progress (per download) and aditionally
			// update the UI
			if (Progress.dl_lastprogress+500 > NOW() && !force) {
				// too soon
				return false;
			}

			var _progress = Progress.done
			$.each(Progress.data, function(i, val) {
				_progress += val[0];
			});
			
			var percentage = Math.floor(_progress/Progress.size*100);
			if (percentage == 100) {
				percentage = 99
			}

			download.onDownloadProgress(
				download.dl_id, 
				percentage, 
				_progress, // global progress
				Progress.size, // total download size
				Progress.speed = Progress.dl_xr.update(_progress - Progress.dl_prevprogress),  // speed
				download.pos // this download position
			);

			Progress.dl_prevprogress = _progress
			Progress.dl_lastprogress = NOW()
		}

		function request() {
			xhr = getXhrObject()

			// onprogress {{{
			xhr.progress = function(e) {
				if (isCancelled()) return;

				Progress.data[url][0] = e.loaded
				updateProgress(true)
			};
			// }}}

			xhr.failure = function(e, len) {
				if (!this || this.has_failed) return;
				this.has_failed = true;

				// we must reschedule this download	
				Progress.data[url][0] = 0; /* we're at 0 bytes */
				updateProgress(true)

				// tell the scheduler that we failed
				if (done) {
					// We already told the scheduler we were done
					// with no erro and this happened. Should I reschedule this 
					// task?
					failed = true
					return setTimeout(function() {
						DownloadManager.pause(self);
						request();
					}, backoff *= 1.2);
				}

				xhr = null;

				return task_done(false, this.status);
			};
		
			// on ready {{{
			xhr.ready = function() {
				if (isCancelled()) return;
				var r = this.response || {};

				if (r.byteLength == size) {
					iRealDownloads--;
					Progress.done += r.byteLength;
					delete Progress.data[url];
					updateProgress(true);

					if (navigator.appName != 'Opera') {
						io.dl_bytesreceived += r.byteLength;
					}
					download.decrypter++;
					Decrypter.push([[download, task.offset], download.nonce, task.offset/16, new Uint8Array(r)])
					if (failed) DownloadManager.release(self);
					r = null;
					failed = false;
				} else if (!download.cancelled) {
					DEBUG(this.status, r.bytesLength, size);
					DEBUG("HTTP FAILED", download.n, this.status, "am i done?", done);
					r = null;
					return this.failure(null, r.byteLength);
				}

				self.destroy();
				xhr = null;

				if (!done) task_done();
			}
			// }}}

			if (dlMethod == FileSystemAPI) {
				var t = url.lastIndexOf('/dl/');
				xhr.open('POST', url.substr(0, t+1));
				xhr.setRequestHeader("MEGA-Chrome-Antileak", url.substr(t) + url);
			} else {
				xhr.open('POST', url, true);
			}
			xhr.responseType = have_ab ? 'arraybuffer' : 'text';
			xhr.send();
			DEBUG("Fetch " + url);
		}
		
		if (!io.dl_bytesreceived) {
			io.dl_bytesreceived = 0;
		}
	
		function isCancelled() {
			if (_cancelled) {
				/* aborted already */
				console.warn('CHECK THIS', 'It shouldnt be reached since we xhr.abort()ed it.');
				return true;
			}

			var is_canceled = !!download.cancelled;
			if (!is_canceled) {
				if(typeof(download.pos) !== 'number') {
					download.pos = IdToFile(download).pos
				}
				is_canceled = !dl_queue[download.pos].n;
			}

			if (is_canceled) {
				_cancelled = true;
				DEBUG("Chunk aborting itself because download was cancelled ", localId);
				xhr.abort();
				if (!done) task_done();
				iRealDownloads--;
				return true;
			}
		}
	

		request();
	}
}
// }}}

// File fetch {{{
var fetchingFile = null
function ClassFile(dl) {
	this.task = dl;
	this.dl   = dl;

	this.run = function(task_done)  {
		var self = this

		fetchingFile = 1;

		if (!use_workers) {
			dl.aes = new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);	
		}

		var gid  = dl.zipid ? 'zip_' + dl.zipid : 'file_' + dl.dl_id
		if (!dl.zipid || !GlobalProgress[gid]) {
			GlobalProgress[gid] = {data: {}, done: 0};
		}
	
		DEBUG("dl_key " + dl.key);
		
		dl.onDownloadStart(dl.dl_id, dl.n, dl.size, dl.pos);
	
		dl.io.begin = function() {
			var tasks = [];

			$.each(dl.urls||[], function(key, url) {
				tasks.push(new ClassChunk({
					url: url.url, 
					offset: url.offset, 
					size: url.size, 
					download: dl, 
					chunk_id: key,
					zipid: dl.zipid,
					id: dl.id
				}));
			});

			var emptyFile;
			if (tasks.length == 0) {
				emptyFile = true;
				tasks.push({ 
					task: {  zipid: dl.zipid, id: dl.id },
					run: function(done) {
						dl.io.write("", 0, function() {
							task_done();	
							dl.ready(); /* tell the download scheduler we're done */
						});
					}
				});
			}

			function free() {
				/* release memory */
				dl.writer.destroy();
				XDESTROY(dl.io);
				XDESTROY(dl);
				dl.io		= null;
				dl.writer	= null;
				dl.ready	= null;
				dl			= null;
				self.run    = null;
				self.dl		= null;
				self.task	= null;
				self		= null;
			}

			var chunkFinished = false
			dl.ready = function() {
				DEBUG('is cancelled?', dl.cancelled)
				if (chunkFinished && dl.writer.isEmpty() && dl.decrypter == 0) {
					if (dl.cancelled) return free();
					if (!emptyFile && !checkLostChunks(dl)) {
						if (typeof skipcheck == 'undefined' || !skipcheck) return dl_reportstatus(dl, EKEY);
					}

					if (dl.zipid) {
						return  Zips[dl.zipid].done();
					}
					
					delete GlobalProgress['file_' + dl.dl_id];

					dl.onDownloadProgress(
						dl.dl_id,
						100,
						dl.size,
						dl.size,
						0,
						dl.pos
					);

					dl.onBeforeDownloadComplete(dl.pos);
					if (!dl.preview) {
						dl.io.download(dl.zipname || dl.n, dl.p);
					}
					dl.onDownloadComplete(dl.dl_id, dl.zipid, dl.pos);
					if (dlMethod != FlashIO) DownloadManager.cleanupUI(dl, true);

					free();
				}
			};
	
			dlQueue.pushAll(tasks, function() {
				chunkFinished = true
			}, failureFunction);

			tasks = null;
	
			// notify the UI
			fetchingFile = 0;
			task_done();
		}
	
		dlGetUrl(dl, function(error, res, o) {
			if (error) {
				/* failed */
				DownloadManager.pause(self); 
				fetchingFile = 0;
				task_done(); /* release worker */
				setTimeout(function() {
					/* retry !*/
					dlQueue.pushFirst(self);
				}, dl_retryinterval);
				return false;
			}
			var info = dl_queue.splitFile(res.s);
			dl.urls = dl_queue.getUrls(info.chunks, info.offsets, res.g)
			return dl.io.setCredentials(res.g, res.s, o.n, info.chunks, info.offsets);
		});
	}

}
// }}}

function dl_writer(dl, is_ready) {
	is_ready = is_ready || function() { return true; };

	dl.decrypter = 0;

	dl.writer = new MegaQueue(function (task, done) {
		var Scheduler = this;
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

			task.data = null
			task.null = null
		});
	}, 1);

	dl.writer.pos = 0

	dl.writer.validateTask = function(t) {
		if (!is_ready()) return null;
		return t.offset == dl.writer.pos;
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

