function FlashIO(dl_id, dl) {
	var IO = this
		, offset = 0
		, dl_id  = dl.zip_dl_id || dl_id

	this.write = function (buffer, position, done) {
		if (!document.getElementById('dlswf_' + dl_id) || offset !== position) {
			DEBUG("Flash element not yet initialized", dl_id);
			return setTimeout(function () {
				if (!dl.cancelled) IO.write(buffer, position, done);
			}, 300);
		}
		var j,k,len,subdata;

		if (have_ab)
			len = buffer.length;
		else
			len = buffer.buffer.length;

		if (have_ab)
			subdata = ab_to_base64(buffer);
		else
			subdata = base64urlencode(buffer.buffer);

		document.getElementById('dlswf_' + dl_id).flashdata(dl_id, subdata);
		offset += len
		done();
	};

	this.download = function (name, path) {
		document.getElementById('dlswf_' + dl_id).flashdata(dl_id,'',name);
	};

	this.setCredentials = function (url, size, filename, chunks, sizes) {
		// dl_geturl = url;
		// dl_filesize = size;
		// dl_filename = filename;
		// dl_chunks   = chunks;
		// dl_chunksizes = sizes;
		IO.begin();
	};
}
FlashIO.warn = true;
