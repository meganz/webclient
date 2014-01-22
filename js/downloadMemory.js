function MemoryIO(dl_id) {
	var dl_blob_array
		, IO = this
		, offset = 0

	this.write = function (buffer, position, done) {
		if (position !== offset) {
			return setTimeout(function() {
				IO.write(buffer, position, done);
			}, 100);
		}
		dl_blob_array.push(new Blob([buffer]));
		offset += (have_ab ? buffer : buffer.buffer).length;
		done();
	};

	this.download = function (name, path) {
		var blob_url = myURL.createObjectURL(new Blob(dl_blob_array));
		var dlLinkNode = document.getElementById('dllink');
		dlLinkNode.download = name;
		dlLinkNode.href = blob_url;
		dlLinkNode.click();
		setTimeout(function () {
			myURL.revokeObjectURL(blob_url);
			dl_blob_array = blob_url = undefined;
		}, 100);
	};

	this.setCredentials = function (url, size, filename, chunks, sizes) {
		// dl_geturl = url;
		// dl_filesize = size;
		// dl_filename = filename;
		// dl_chunks   = chunks;
		// dl_chunksizes = sizes;
		dl_blob_array = [];
		IO.begin();
	};
}
