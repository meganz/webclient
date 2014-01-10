function FlashIO(dl_id) {
	var IO = this;

	this.write = function (buffer, position, done) {
		if (!document.getElementById('dlswf_' + dl_id)) {
			if (d) console.log("Flash element not yet initialized", dl_id);
			return setTimeout(function () {
				IO.write(buffer, position, done);
			}, 300);
		}
		var j,k,len;

		if (have_ab)
			len = buffer.length;
		else
			len = buffer.buffer.length;

		if (have_ab)
			subdata = ab_to_base64(buffer);
		else
			subdata = base64urlencode(buffer.buffer);

		document.getElementById('dlswf_' + dl_id).flashdata(dl_id, subdata);
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
	};
}
FlashIO.warn = true;
