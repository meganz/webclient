var dlMethod
	, dl_maxSlots = 4
	, dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined')
	, dl_maxchunk = 16*1048576
	, dlQueue = new QueueClass(downloader)
	, dlDecrypter = new QueueClass(decrypter)

/** @FIXME: move me somewhere else */
$.len = function(obj) {
	var L=0;
	$.each(obj, function(i, elem) {
		L++;
	});
	return L;
}

/**
 *	Override the downloader scheduler method.
 *	Basically pick up chunks from different files if possible:
 */
dlQueue.getNextTask = function() {
	var queue = {}
		, self = this
		, status = []
		, candidate = null
		, dlCandidate

	/** check which files are being downloaded now */
	$.each(self._running, function(p, pzTask) {
		var id = pzTask.task.task.download.dl_id;
		if (!queue[id]) { 
			queue[id] = 0;
		}
		queue[id]++;
	});

	/** select the file with less chunks being downloaded */
	var tmp = 0xffffff
	$.each(queue, function(p, total) {
		if (tmp > total) {
			tmp = total;
			dlCandidate = p
		}
	});

	/** select our candidate file **/
	$.each(self._queue, function(p, task) {
		var id = task.task.download.dl_id
		if (!queue[id]) {
			/** file with no chunks downloaded at all */
			candidate = id;
			return false; /* break */
		} else if (id == dlCandidate) {
			candidate = id;
		}
	});

	if (candidate) {
		/** select the first chunk from our candidate */
		var Task = null;
		$.each(self._queue, function(p, task) {
			if (task.task.download.dl_id == candidate) {
				Task = task;
				self._queue.splice(p, 1);
				return false;
			}
		});
		if (Task) return Task;
	}

	/** just pick up the older chunk */
	return self._queue.shift();
};

if (localStorage.dl_maxSlots) {
	dl_maxSlots = localStorage.dl_maxSlots;
}

/**
 *	DownloadQueue
 *	
 *	Array extension to override push, so we can easily
 *	kick up the download (or queue it) without modifying the
 *	caller codes
 */
function DownloadQueue() {
}
inherits(DownloadQueue, Array);

DownloadQueue.prototype.getUrls = function(dl_chunks, dl_chunksizes, url) {
	var dl_urls = []
	$.each(dl_chunks, function(key, pos) {
		dl_urls.push({
			url: url + '/' + pos + '-' + (pos+dl_chunksizes[pos]-1),
			size: dl_chunksizes[pos],
			offset: pos
		})
	});

	return dl_urls;
}

DownloadQueue.prototype.splitFile = function(dl_filesize) {
	var dl_chunks = []
		, dl_chunksizes = []
	
	var p = pp = 0;
	for (var i = 1; i <= 8 && p < dl_filesize-i*131072; i++) {
		dl_chunksizes[p] = i*131072;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	while (p < dl_filesize) {
		dl_chunksizes[p] = Math.floor((dl_filesize-p)/1048576+1)*1048576;
		if (dl_chunksizes[p] > dl_maxchunk) dl_chunksizes[p] = dl_maxchunk;
		dl_chunks.push(p);
		pp = p;
		p += dl_chunksizes[p];
	}

	if (!(dl_chunksizes[pp] = dl_filesize-pp)) {
		delete dl_chunksizes[pp];
		delete dl_chunks[dl_chunks.length-1];
	}

	return {chunks: dl_chunks, offsets: dl_chunksizes};
}

var Zips = {};

/**
 *	Pseudo-IO method to simplify zip writings
 */
function dlZipIO(realIO, dl) {
	var self = this
		, qZips = []
		, ZipObject
		, offset = 0
		, hashes = {}
		, dirData = []

	this.download = function(name) {
		$.each(dirData, function(key, value) {
			realIO.write(value, offset, function() {});
			offset += value.length;
		});

		var end = ZipObject.writeSuffix(offset, dirData);
		realIO.write(end, offset, function() {
			var doDownload = setInterval(function(){
				if (dl.decrypt == 0) {
					realIO.download(name);
					clearInterval(doDownload);
				}
			}, 100);
		});
	}

	this.write = function(buffer, position, next, task) {
		if ($.inArray(task.download.id, qZips)==-1) {
			qZips.push(task.download.id)
		}

		if (qZips[0] !== task.download.id) {
			return setTimeout(function() {
				self.write(buffer, position, next, task);
			}, 100);
		}

		if (task.first) {
			var header = ZipObject.writeHeader(
				task.path,
				task.size,
				null /* ignore date */
			);
			realIO.write(header, offset, function() {});
			offset += header.length;
			hashes[task.download.id] = 0;
		}
		hashes[task.download.id] = crc32(buffer, hashes[task.download.id], buffer.length);

		realIO.write(buffer, offset, function() {
			if (task.last) {
				qZips.shift();
				var centralDir = ZipObject.writeCentralDir(
					task.path,
					task.download.size,
					null,
					hashes[task.download.id],
					false,
					offset
				);
				dirData.push(centralDir.dirRecord)
				realIO.write(centralDir.dataDescriptor, offset, next);
				offset += centralDir.dataDescriptor.length;
				return;
			}
			next();
		}, task);
		offset += buffer.length;
	};

	this.begin = function(total_size) {
		ZipObject = new ZIPClass(total_size);
		DEBUG("starting download " + dl.zipname + " " + total_size + " bytes");
		dl.decrypt = 0;
		dlQueue.pushAll(this.urls, function() {
			if (dl.cancelled) return;
			dl.onDownloadComplete(dl_id);
			var checker = setInterval(function() {
				if (dl.decrypt == 0) {
					clearInterval(checker);
					dl.onBeforeDownloadComplete(dl.pos);
					dl.io.download(dl.zipname || dl.n, dl.p);
				}
			}, 100);
		}, function(reschedule, args) {
			DEBUG("Network failed")	
		});
	}

}

DownloadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments)
		, id = pos -1
		, dl  = this[id]
		, dl_id  = dl.ph || dl.id
		, dl_key = dl.key
		, dl_retryinterval = 1000
		, dlIO = new dlMethod(dl_id)
		, dl_keyNonce = JSON.stringify([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7],dl_key[4],dl_key[5]])

	if (dl.zipid) {
		if (!Zips[dl.zipid]) {
			Zips[dl.zipid] = {
				IO: new dlZipIO(dlIO, dl),
				size: 0,
				queue: {},
				url: [],
			};
		}
		Zips[dl.zipid].queue[dl_id] = [dl, Zips[dl.zipid].size];
		Zips[dl.zipid].size += dl.size;
		Zips[dl.zipid].offset = 0;
	}

	if (!use_workers) {
		dl.aes = new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);	
	}

	dl.pos   = id // download position in the queue
	dl.dl_id = dl_id;  // download id
	dl.io    = dlIO;
	dl.nonce = dl_keyNonce
	dl.progress = 0;
	dl.macs  = {}
	dl.urls	 = []

	dlIO.begin = function() {
		var tasks = [];
		if (dl.zipid) {
			var Zip = Zips[dl.zipid]
				, queue = Zip.queue[dl_id]
				, object = queue[0]
				, offset = queue[1]

			$.each(object.urls, function(id, url) {
				url.first		= id == 0
				url.last		= object.urls.length-1 == id
				url.zoffset		= url.offset + offset;
				url.path		= dl.p + dl.n;
				url.download	= dl;
				url.download.io	= Zip.IO;
				Zip.url.push(url);
			});

			delete Zip.queue[dl_id];
			if ($.len(Zip.queue) === 0) {
				// start real downloading!
				// Done with the queue, now fetch everything :-)
				Zip.IO.urls = Zip.url.sort(function(a, b) {
					// Sort by offset write often to avoid
					// keeping thing in RAM 
					return a.zoffset - b.zoffset;
				});
				// Trigger real download
				Zip.IO.begin(Zip.size);
			}
			return;
		}

		$.each(dl.urls||[], function(key, url) {
			tasks.push({
				url: url.url, 
				offset: url.offset, 
				size: url.size, 
				download: dl, 
				chunk_id: key
			});
		});

		dl.decrypt = 0;
		dlQueue.pushAll(tasks, function() {
			if (dl.cancelled) return;
			dl.onDownloadComplete(dl_id);
			var checker = setInterval(function() {
				if (dl.decrypt == 0) {
					clearInterval(checker);
					dl.onBeforeDownloadComplete(dl.pos);
					dl.io.download(dl.zipname || dl.n, dl.p);
				}
			}, 100);
		}, function(reschedule, args) {
			DEBUG("Network failed")	
		});

		// notify the UI
		dl.onDownloadStart(dl.dl_id, dl.n, dl.size, dl.pos);
	}

	DEBUG("dl_key " + dl_key);

	function dlHandler (res, ctx) {
		if (typeof res == 'object') {
			res = res[0];
			if (typeof res == 'number') {
				dl_reportstatus(dl_id, res.d ? 2 : 1)
			} else {
				if (res.d) {
					dl_reportstatus(dl_id, res.d ? 2 : 1)
				} else if (res.g) {
					var ab = base64_to_ab(res.at)
						, o = dec_attr(ab ,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);

					if (typeof o == 'object' && typeof o.n == 'string') {
						var info = dl_queue.splitFile(res.s);
						dl.urls = dl_queue.getUrls(info.chunks, info.offsets, res.g)
						if (have_ab && res.pfa && res.s <= 48*1048576 && is_image(o.n) && (!res.fa || res.fa.indexOf(':0*') < 0))  {
							dl_queue[dl_queue_num].data = new ArrayBuffer(res.s);
						} else {
							return dlIO.setCredentials(res.g, res.s, o.n, info.chunks, info.offsets);
						}
					} else {
						dl_reportstatus(dl_id, EKEY);
					}
				} else {
					dl_reportstatus(dl_id, res.e);
				}
			}
		}

		dl_retryinterval *= 1.2;
		// Do not use dl_settimer, better use
		// a private timeout function
		setTimeout(function() {
			dlGetUrl(dl, dlHandler);
		}, dl_retryinterval);
	}
	
	dlGetUrl(dl, dlHandler);

	return pos;
};

function dlGetUrl(id, callback) {
	var object = dl_queue[id] ? dl_queue : id
		, req = { 
			a : 'g', 
			g : 1, 
			ssl : use_ssl,
		};

	if (object.ph) {
		req.p = object.ph;
	} else if (object.id) {
		req.n = object.id;
	}

	api_req([req], {callback:callback});
}

if (window.webkitRequestFileSystem) {
	dlMethod = FileSystemAPI;
} else if (navigator.msSaveOrOpenBlob) {
	dlMethod = BlobBuilderIO;
} else if ("download" in document.createElementNS("http://www.w3.org/1999/xhtml", "a")) {
	dlMethod = MemoryIO;
} else {
	dlMethod = FlashIO;
}

if(dlMethod.init) dlMethod.init();
