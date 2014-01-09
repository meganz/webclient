function BlobBuilderIO(dl_id) {
	var dl_blob;

	this.write = function (buffer, position, done) {
		dl_blob.append(have_ab ? buffer : buffer.buffer);
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
	};
	
	this.check = function(main) {
		// ???
		main();
	};
}
BlobBuilderIO.warn = true;
