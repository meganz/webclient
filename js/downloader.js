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
		, url = task.url
		, size = task.size
		, instance = task.instance

	if (dlMethod == FileSystemAPI) {
		var t = url.lastIndexOf('/dl/');
		xhr.open('POST', url.substr(0, t+1));
		xhr.setRequestHeader("MEGA-Chrome-Antileak", url.substr(t) + url);
	} else {
		xhr.open('POST', url, true);
	}
	
	if (!instance.dl_bytesreceived) {
		instance.dl_bytesreceived = 0;
	}

	xhr.onprogress = function(e) {
		instance.update();
		instance.progress = e.loaded;
		dl_updateprogress();
	};

	xhr.onreadystatechange = function() {
		instance.update();
		if (this.readyState == this.DONE) {
			if (navigator.appName != 'Opera') {
				instance.progress = 0;
			}
			dl_updateprogress();

			if (r.byteLength == size) {
				if (have_ab) {
					var r = this.response || {};
					if (navigator.appName != 'Opera') {
						instance.dl_bytesreceived += r.byteLength;
					}
					dl_cipherq[p] = new Uint8Array(r);
				} else {
					instance.dl_bytesreceived += this.response.length;
					dl_cipherq[p] = { buffer : this.response };						
				}
			} else {
				// we must reschedule this chunk	
				dlQueue.push(task);
				dl_httperror(this.status);
			}
		}
	}
	xhr.responseType = have_ab ? 'arraybuffer' : 'text';
	xhr.send();
}
