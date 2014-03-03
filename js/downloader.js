if (d) {
	var _allxhr = [];
	function abortAll() {
		$.each(_allxhr, function(k, xhr) {
			try { 
				xhr.abort(); xhr.failure(); 
			} catch (e) {
				DEBUG('exception', e);
			}
		});
	}
}

// getXhrObject {{{
function getXhrObject(s) {
	var xhr = new XMLHttpRequest
		, timeout = s || 40000
	if (xhr.overrideMimeType) {
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	if (d && typeof _allxhr == 'object') {
		_allxhr.push(xhr);
	}

	// timeout {{{
	var ts = null
		, Open = xhr.open
		, Abort = xhr.abort
		, aborted = false

	xhr.abort = function() {
		clearTimeout(ts);
		aborted = true
		Abort.apply(xhr, arguments);
	};

	xhr.open = function() {
		Open.apply(xhr, arguments);
		checkTimeout();
	};

	function checkTimeout() {
		if (aborted) return;
		clearTimeout(ts);
		ts = setTimeout(function() {
			DEBUG("xhr failed by timeout");
			xhr.abort();
			xhr.failure("timeout");
		}, timeout*1.5);
	}
	// }}}

	// default callbacks {{{
	xhr.progress = function() {
	};

	xhr.changestate = function() {
	};

	xhr.failure = function() {
	};

	xhr.ready = function() {
	};
	// }}}

	xhr.onprogress = function() {
		if (aborted) return;
		checkTimeout();
		return xhr.progress.apply(xhr, arguments);
	}

	xhr.onreadystatechange = function() {
		if (aborted) return;
		xhr.changestate.apply(xhr, arguments);
		checkTimeout();
		if (this.readyState == this.DONE) {
			clearTimeout(ts);
			return xhr.ready.apply(xhr, arguments);
		}
	};

	return xhr;
}
// }}}

// Chunk fetch {{{
var GlobalProgress = {};
function ClassChunk(task) {
	this.task = task;
	this.dl   = task.download;

	var self = this;

	this.run = function(Scheduler) {
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
			Scheduler.done();
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
				Scheduler.done();
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
			if (Progress.dl_lastprogress+250 > NOW() && !force) {
				// too soon
				return false;
			}

			var _progress = Progress.done
			$.each(Progress.data, function(i, val) {
				_progress += val[0];
			});

			download.onDownloadProgress(
				download.dl_id, 
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
				if (xhr.has_failed) return;
				xhr.has_failed = true;

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
				return Scheduler.done(false, this.status);
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
					download.decrypt.push({ data: new Uint8Array(r), offset: task.offset, info: task})
					if (failed) DownloadManager.release(self);
					failed = false;
				} else if (!download.cancelled) {
					DEBUG(this.status, r.bytesLength, size);
					DEBUG("HTTP FAILED", download.n, this.status, "am i done?", done);
					return xhr.failure(null, r.byteLength);
				}

				if (!done) Scheduler.done();
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
				if (!done) Scheduler.done();
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
	var self = this
	this.task = dl;
	this.dl   = dl;

	this.run = function(Scheduler)  {
		/**
		 *	Make sure that only one task of this kind
		 *	runs in parallel (because their chunks are important)
		 */
		if (fetchingFile) {
			Scheduler.done();
			var task = this;
			setTimeout(function() {
				dlQueue.push(self);
			}, 100);
			return;
		}

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
					run: function(Scheduler) {
						dl.io.write("", 0, function() {
							Scheduler.done();	
						});
					}
				});
			}

			var chunkFinished = false
			dl.ready = function() {
				if (chunkFinished && dl.writer.isEmpty() && dl.decrypt.isEmpty()) {
					if (dl.cancelled) return;
					if (!emptyFile && !checkLostChunks(dl)) {
						return dl_reportstatus(dl, EKEY);
					}
					if (dl.zipid) {
						return Zips[dl.zipid].done();
					}
					dl.onBeforeDownloadComplete(dl.pos);
					if (!dl.preview) {
						dl.io.download(dl.zipname || dl.n, dl.p);
					}
					dl.onDownloadComplete(dl.dl_id, dl.zipid, dl.pos);
					if (dlMethod != FlashIO) DownloadManager.cleanupUI(dl, true);
				}
			};
	
			dlQueue.pushAll(tasks, function() {
				chunkFinished = true
			}, failureFunction);
	
			// notify the UI
			fetchingFile = 0;
			Scheduler.done();
		}
	
		dlGetUrl(dl, function(error, res, o) {
			if (error) {
				/* failed */
				DownloadManager.pause(self); 
				fetchingFile = 0;
				Scheduler.done(); /* release worker */
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

function dl_writer(dl) {
	return function (task) {
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
			Scheduler.done();
			dl.ready(); /* tell the download scheduler we're done */
		});
	};
};

// Decrypter worker {{{
function dl_decrypter(dl) {
	return function(task) {
		var Decrypter = this;
		var worker = new Worker('decrypter.js?v=5');
		worker.postMessage = worker.webkitPostMessage || worker.postMessage;
		worker.onmessage = function(e) {
			if (typeof(e.data) == "string") {
				if (e.data[0] == '[') {
					var t = JSON.parse(e.data), pos = task.offset
					for (var i = 0; i < t.length; i += 4, pos = pos+1048576) {
						dl.macs[pos] = [t[i],t[i+1],t[i+2],t[i+3]];
					}
				}
				DEBUG("worker replied string", e.data, dl.macs);
			} else {
				var plain = new Uint8Array(e.data.buffer || e.data);
				Decrypter.done(); // release slot
				DEBUG("Decrypt done", dl.cancelled);
				if (dl.cancelled) return;
				dl.writer.push({ data: plain, offset: task.offset});
			}
		};
		worker.postMessage(dl.nonce);
		worker.dl_pos = task.offset;
		worker.postMessage(task.offset/16);
	
		if (typeof MSBlobBuilder == "function") {
			worker.postMessage(task.data);
		} else {
			worker.postMessage(task.data.buffer, [task.data.buffer]);
		}
		DEBUG("decrypt with workers", dl.cancelled);

	};
}
// }}}

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


function downloader(task) {
	var Scheduler = this;
	if (DownloadManager.isRemoved(task)) {
		DEBUG("removing old task");
		return Scheduler.done();
	}
	return task.run(Scheduler);
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

