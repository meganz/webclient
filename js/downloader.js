function getXhr() {
	var dl_xhr = new XMLHttpRequest;			
	if (dl_xhr.overrideMimeType) {
		dl_xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	return dl_xhr;
}

function decrypter(task)
{
	var download = task.download
		, Decrypter = this

	download.decrypt++;

	if (use_workers) {
		var worker = new Worker('decrypter.js?v=5');
		worker.postMessage = worker.webkitPostMessage || worker.postMessage;
		worker.onmessage = function(e) {
			if (typeof(e.data) == "string") {
				if (e.data[0] == '[') {
					var t = JSON.parse(e.data), pos = task.offset
					for (var i = 0; i < t.length; i += 4, pos = pos+1048576) {
						download.macs[pos] = [t[i],t[i+1],t[i+2],t[i+3]];
					}
				}
				DEBUG("worker replied string", e.data, download.macs);
			} else {
				var databuf = new Uint8Array(e.data.buffer || e.data);
				var plain = databuf;
				Decrypter.done(); // release slot
				download.io.write(plain, task.offset, function() {
					// decrease counter
					// useful to avoid downloading before writing
					// all
					download.decrypt--;
				}, task.info);
			}
		};
		worker.postMessage(task.download.nonce);
		worker.dl_pos = task.offset;
		worker.postMessage(task.offset/16);

		if (typeof MSBlobBuilder == "function") {
			worker.postMessage(task.data);
		} else {
			worker.postMessage(task.data.buffer, [task.data.buffer]);
		}
		DEBUG("decrypt with workers");
	} else {
		DEBUG("decrypt without workers")
		download.macs[task.offset] = decrypt_ab_ctr(
			download.aes,
			task.data,
			[download.key[4],download.key[5]],
			task.offset
		);

		Decrypter.done(); // release slot
		download.io.write(task.data, task.offset, function() {
			// decrease counter
			// useful to avoid downloading before writing
			// all
			download.decrypt--;
		});
	}
}

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
	if (dl_legacy_ie) {
		alert("not yet implemented");
		console.trace();
		return;
	}

	iRealDownloads++;

	var xhr = getXhr()
		, Scheduler = this
		, url = task.url
		, size = task.size
		, download = task.download
		, io = download.io
		, average_throughput = [0, 0]
		, done = false
		, prevProgress = 0    // Keep in track how far are we in the downloads
		, pprevProgress = 0	  // temporary variable to meassure progress. FIXME: it should handled by getxr()
		, progress = getxr()  // chunk progress
		, speed = 0 // speed of the current chunk
		, lastUpdate // FIXME: I should be abstracted at getxr()

	io.dl_xr = io.dl_xr || getxr() // global download progress

	/**
	 *	Check if the current chunk is small or close to its
	 *	end, so it can cheat to the scheduler telling they are 
	 *	actually done
	 */
	function shouldIReportDone() {
		if (!done && iRealDownloads < dlQueue._concurrency * .5 && (size-prevProgress)/speed <= dlDoneThreshold) {
			Scheduler.done();
			done = true;
		}
	}

	function updateProgress(force) {
		if (dlQueue.isPaused()) {
			// do not update the UI
			return false;
		}

		// keep in track of the current progress
		if (lastUpdate+250 < new Date().getTime()) {
			speed = progress.update(prevProgress - pprevProgress)
			pprevProgress = prevProgress;
			lastUpdate = new Date().getTime()
			shouldIReportDone();
		}

		// Update global progress (per download) and aditionally
		// update the UI
		if (download.dl_lastprogress+250 > new Date().getTime() && !force) {
			// too soon
			return false;
		}

		download.onDownloadProgress(
			download.dl_id, 
			download.progress, // global progress
			download.size, // total download size
			io.dl_xr.update(download.progress - download.dl_prevprogress),  // speed
			download.pos // this download position
		);

		download.dl_prevprogress = download.progress
		download.dl_lastprogress = new Date().getTime();
	}


	if (dlMethod == FileSystemAPI) {
		var t = url.lastIndexOf('/dl/');
		xhr.open('POST', url.substr(0, t+1));
		xhr.setRequestHeader("MEGA-Chrome-Antileak", url.substr(t) + url);
	} else {
		xhr.open('POST', url, true);
	}
	DEBUG("Fetch " + url);
	
	if (!io.dl_bytesreceived) {
		io.dl_bytesreceived = 0;
	}

	function isCancelled() {
		if (download.cancelled) {
			DEBUG("Chunk aborting itself because download was cancelled");
			xhr.abort();
			!done && Scheduler.done();
			iRealDownloads--;
			return true;
		}
	}

	xhr.onprogress = function(e) {
		if (isCancelled()) return;

		download.progress += e.loaded - prevProgress;
		prevProgress = e.loaded
		updateProgress();
	};

	xhr.onreadystatechange = function() {
		if (isCancelled()) return;
		if (this.readyState == this.DONE) {
			var r = this.response || {};
			download.progress += r.byteLength - prevProgress;
			updateProgress(true);
			iRealDownloads--;

			if (r.byteLength == size) {
				if (have_ab) {
					if (navigator.appName != 'Opera') {
						io.dl_bytesreceived += r.byteLength;
					}
					dlDecrypter.push({ data: new Uint8Array(r), download: download, offset: task.offset, info: task})
				} else {
					io.dl_bytesreceived += this.response.length;
					dlDecrypter.push({data: { buffer : this.response }, donwload: download, offset: task.offset, info: task})
				}
			} else if (!download.cancelled) {
				// we must reschedule this download	
				DEBUG(this.status, r.bytesLength, size);
				DEBUG("HTTP FAILED WITH " + this.status);

				// tell the scheduler that we failed
				if (done) {
					// We already told the scheduler we were done
					// with no erro and this happened. Should I reschedule this 
					// task?
					throw new Error("Fixme")
				}
				return Scheduler.done(false);
			}
			!done && Scheduler.done();
		}
	}
	xhr.responseType = have_ab ? 'arraybuffer' : 'text';
	xhr.send();
}
