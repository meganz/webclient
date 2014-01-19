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
 *	The idea is to select chunks from the same
 *	file_id, always
 */
dlQueue.getNextTask = (function() {
	/* private variable to keep in track
	   the current file id */
	var current = null; 
	return function() {
		var queue = {}
			, self = this
			, candidate

		if (current) {
			$.each(self._queue, function(p, pzTask) {
				if (pzTask.task.download.dl_id == current) {
					candidate = p;
					return false; /* break */
				}
			});
		}

		if (candidate) {
			candidate = self._queue.splice(candidate, 1);
		} else {
			/** just pick up the older chunk */
			candidate =  self._queue.shift();
		}

		current = candidate ? candidate.task.download.dl_id : null;

		console.warn(['current_id', current]);

		return candidate;
	};
})();

if (localStorage.dl_maxSlots) {
	dl_maxSlots = localStorage.dl_maxSlots;
}

function checkLostChunks(file)
{
	var t = []
		, dl_key = file.key

	$.each(file.macs, function(i, mac) {
		t.push(i);
	});
	t.sort(function(a, b) {
		return parseInt(a) - parseInt(b);
	});

	$.each(t, function(i, v) {
		t[v] = file.macs[v];
	});

	var mac = condenseMacs(t,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);

	if (have_ab && (dl_key[6] != (mac[0]^mac[1]) || dl_key[7] != (mac[2]^mac[3]))) {
		return false;
	}

	return true;
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

function failureFunction(reschedule, args) {
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
		var tZip = Zips[dl.zipid];
		tZip.queue[dl_id] = [dl, Zips[dl.zipid].size];
		tZip.offset = 0;
		tZip.IO.progress = 0;
		tZip.size += dl.size;
	}

	if (!use_workers) {
		dl.aes = new sjcl.cipher.aes([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);	
	}

	dl.pos   = id // download position in the queue
	dl.dl_id = dl_id;  // download id
	dl.io    = dlIO;
	dl.nonce = dl_keyNonce
	// Use IO object to keep in track of progress
	// and speed
	dl.io.progress = 0;
	dl.io.size     = dl.size;

	dl.macs  = {}
	dl.urls	 = []
	dl.decrypt = 0;

	dlIO.begin = function() {
		var tasks = [];
		if (dl.zipid) {
			var Zip = Zips[dl.zipid]
				, queue = Zip.queue[dl_id]
				, object = queue[0]
				, offset = queue[1]

			var pos = 0;
			Zip.IO.size = Zip.size;
			$.each(object.urls, function(id, url) {
				url.first		= id == 0
				url.last		= object.urls.length-1 == id
				url.zoffset		= url.offset + offset;
				url.path		= dl.p + dl.n;
				url.fsize		= dl.size;
				url.download	= dl;
				url.download.io	= Zip.IO;
				url.pos         = pos++;
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

		dlQueue.pushAll(tasks, function() {
			if (dl.cancelled) return;
			dl.onDownloadComplete(dl_id);
			var checker = setInterval(function() {
				if (dl.decrypt == 0) {
					clearInterval(checker);
					if (!checkLostChunks(dl)) {
						alert("failed");
						return;
					}
					dl.onBeforeDownloadComplete(dl.pos);
					dl.io.download(dl.zipname || dl.n, dl.p);
				}
			}, 100);
		}, failureFunction);

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

var dl_queue = new DownloadQueue
