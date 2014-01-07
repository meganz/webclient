function getXhr() {
	var dl_xhr = new XMLHttpRequest;			
	if (dl_xhr.overrideMimeType) {
		dl_xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	return dl_xhr;
}

function downloader(task)
{
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
		, chunk = task.download
		, prevProgress = 0
		, dl_cipherq = []
		, dl_lastprogress = 0

	io.dl_xr = io.dl_xr || getxr() // one instance per download


	function updateProgress() {
		if (dl_lastprogress+250 > new Date().getTime()) return false;
		else dl_lastprogress=new Date().getTime();

		chunk.onDownloadProgress(
			chunk.dl_id, 
			chunk.progress, // global progress
			chunk.size, // total download size
			io.dl_xr.update(chunk.progress - dl_prevprogress), 
			chunk.pos // this download position
		);
		dl_prevprogress = chunk.progress
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
		chunk.progress += e.loaded - prev;
		prev = e.loaded
		updateProgress();
	};

	xhr.onreadystatechange = function() {
		io.update();
		if (this.readyState == this.DONE) {
			updateProgress();

			var r = this.response || {};
			if (r.byteLength == size) {
				if (have_ab) {
					if (navigator.appName != 'Opera') {
						io.dl_bytesreceived += r.byteLength;
					}
					dl_cipherq[chunk.pos] = new Uint8Array(r);
				} else {
					io.dl_bytesreceived += this.response.length;
					dl_cipherq[chunk.pos] = { buffer : this.response };						
				}
			} else {
				// we must reschedule this chunk	
				dlQueue.push(task);
				dl_httperror(this.status);
			}
			Scheduler.done();
		}
	}
	xhr.responseType = have_ab ? 'arraybuffer' : 'text';
	xhr.send();
}
