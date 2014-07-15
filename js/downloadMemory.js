function MemoryIO(dl_id, dl) {
	var dblob
		, offset = 0
		, msie = typeof MSBlobBuilder === 'function'

	if (d) console.log('Creating new MemoryIO instance', dl_id, dl);

	this.write = function (buffer, position, done) {
		try {
			if(msie) dblob.append(have_ab ? buffer : buffer.buffer);
			    else dblob.push(new Blob([buffer]));
		} catch(e) {
			dlFatalError(dl, e);
		}
		offset += (have_ab ? buffer : buffer.buffer).length;
		buffer  = null;
		done();
	};

	this.download = function(name, path) {
		var blob = this.getBlob();

		if(is_chrome_firefox) {
			requestFileSystem(0,blob.size,function(fs) {
				var opt = { create : !0, fxo : dl };
				fs.root.getFile(dl_id, opt, function(fe)
				{
					fe.createWriter(function(fw) {
						fw.onwriteend = fe.toURL.bind(fe);
						fw.write(blob);
					});
				});
			});
		} else if(msie) {
			navigator.msSaveOrOpenBlob(blob, name);
		} else {
			var blob_url = myURL.createObjectURL(blob);
			var dlLinkNode = document.getElementById('dllink');
			dlLinkNode.download = name;
			dlLinkNode.href = blob_url;
			dlLinkNode.click();
			Later(function () {
				myURL.revokeObjectURL(blob_url);
				blob_url = undefined;
			});
		}

		this.abort();
	};

	this.setCredentials = function (url, size, filename, chunks, sizes) {
		if (d) DEBUG('MemoryIO Begin', dl_id, Array.prototype.slice.call(arguments));
		if (size > 950*0x100000) {
			dlFatalError(dl, Error('File too big to be reliably handled in memory.'));
		}
		dblob = msie ? new MSBlobBuilder() : [];
		this.begin();
	};

	this.abort = function() {
		dblob = undefined;
	};

	this.getBlob = function() {
		return msie ? dblob.getBlob() : new Blob(dblob);
	};
}
