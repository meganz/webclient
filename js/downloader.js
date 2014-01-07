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
				if (download.zipid) {
					DEBUG("ZIP not implemented yet");
				}

				var plain = databuf;
				download.io.write(plain, task.offset, function() {
					Decrypter.done();
					download.decrypt--;
				});
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
	}
}


function downloader(task) {
	if (dl_legacy_ie) {
		alert("not yet implemented");
		console.trace();
		return;
	}
	var xhr = getXhr()
		, Scheduler = this
		, url = task.url
		, size = task.size
		, io = task.io
		, download = task.download
		, prevProgress = 0
		, dl_lastprogress = 0

	io.dl_xr = io.dl_xr || getxr() // one instance per download


	function updateProgress(force) {
		if (dl_lastprogress+250 > new Date().getTime() && !force) {
			// too soon
			return false;
		}

		download.onDownloadProgress(
			download.dl_id, 
			download.progress, // global progress
			download.size, // total download size
			io.dl_xr.update(download.progress - dl_prevprogress), 
			download.pos // this download position
		);
		dl_prevprogress = download.progress
		dl_lastprogress = new Date().getTime();
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

	var prev = 0;
	xhr.onprogress = function(e) {
		io.update();
		download.progress += e.loaded - prev;
		prev = e.loaded
		updateProgress();
	};

	xhr.onreadystatechange = function() {
		io.update();
		if (this.readyState == this.DONE) {

			var r = this.response || {};
			download.progress += r.byteLength - prev;
			updateProgress(true);

			if (r.byteLength == size) {
				if (have_ab) {
					if (navigator.appName != 'Opera') {
						io.dl_bytesreceived += r.byteLength;
					}
					dlDecrypter.push({ data: new Uint8Array(r), download: download, offset: task.offset})
				} else {
					io.dl_bytesreceived += this.response.length;
					dlDecrypter.push({data: { buffer : this.response }, donwload: download, offset: task.offset})
				}
			} else {
				// we must reschedule this download	
				dlQueue.push(task);
				dl_httperror(this.status);
			}
			Scheduler.done();
		}
	}
	xhr.responseType = have_ab ? 'arraybuffer' : 'text';
	xhr.send();
}
