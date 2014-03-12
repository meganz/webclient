function BlobBuilderIO(dl_id, dl) {
	var dl_blob
		, IO = this
		, offset = 0

	this.write = function (buffer, position, done) {
		dl_blob.append(have_ab ? buffer : buffer.buffer);
		offset += (have_ab ? buffer : buffer.buffer).length;
		done();
	};

	this.download = function (name, path) {
		navigator.msSaveOrOpenBlob(dl_blob.getBlob(), name);
	};

	this.setCredentials = function (url, size, filename, chunks, sizes) {
		// dl_geturl = url;
		// dl_filesize = size;
		// dl_filename = filename;
		// dl_chunks   = chunks;
		// dl_chunksizes = sizes;
		dl_blob = new MSBlobBuilder();
		IO.begin();
	};
}
BlobBuilderIO.warn = true;
