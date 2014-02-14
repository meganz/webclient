function MemoryIO(dl_id, dl) {
	var dblob
		, IO = this
		, offset = 0
		, msie = typeof MSBlobBuilder === 'function'

	this.write = function (buffer, position, done) {
		if (position !== offset) {
			return setTimeout(function() {
				if (!dl.cancelled) IO.write(buffer, position, done);
			}, 100);
		}

		if(msie) {
			dblob.append(have_ab ? buffer : buffer.buffer);
		} else {
			dblob.push(new Blob([buffer]));
		}
		offset += (have_ab ? buffer : buffer.buffer).length;
		done();
	};

	this.download = function (name, path) {
		var blob_url = myURL.createObjectURL(this.getBlob());
		var dlLinkNode = document.getElementById('dllink');
		dlLinkNode.download = name;
		dlLinkNode.href = blob_url;
		dlLinkNode.click();
		setTimeout(function () {
			myURL.revokeObjectURL(blob_url);
			dblob = blob_url = undefined;
		}, 100);
	};

	this.setCredentials = function (url, size, filename, chunks, sizes) {
		dblob = msie ? new MSBlobBuilder() : [];
		IO.begin();
	};

	this.abort = function() {
		dblob = undefined;
	};
	
	this.getBlob = function() {
		return msie ? dblob.getBlob() : new Blob(dblob);
	};
}
