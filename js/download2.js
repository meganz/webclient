var dlMethod
	, dl_maxSlots = 4
	, dl_legacy_ie = (typeof XDomainRequest != 'undefined') && (typeof ArrayBuffer == 'undefined')
	, dl_maxchunk = 16*1048576

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
DownloadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments)
		, dl_id = pos -1
		, dl  = this[dl_id]
		, dl_key = dl.key
		, dl_retryinterval = 1000
		, dl_keyNonce = JSON.stringify([dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7],dl_key[4],dl_key[5]]);

	DEBUG("dl_key " + dl_key);

	function dlHandler (res, ctx) {
		if (typeof res == 'object') {
			res = res[0];
			if (typeof res == 'number') {
				dl_reportstatus(dl_id,res);
			} else {
				if (res.d) {
					dl_reportstatus(dl_id, res.d ? 2 : 1)
				} else if (res.g) {
					var ab = base64_to_ab(res.at)
						, o = dec_attr(ab ,[dl_key[0]^dl_key[4],dl_key[1]^dl_key[5],dl_key[2]^dl_key[6],dl_key[3]^dl_key[7]]);

					if (typeof o == 'object' && typeof o.n == 'string') {
						if (have_ab && res.pfa && res.s <= 48*1048576 && is_image(o.n) && (!res.fa || res.fa.indexOf(':0*') < 0))  {
							alert("DEBUG ME");
							dl_queue[dl_queue_num].data = new ArrayBuffer(res.s);
						} else {
							alert([res.g, res.s, o.n]);
							return;
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
			alert("retry");
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
} else {
	alert("dlMethod is not yet defined");
}

// check if the download method works
// and boot everything!
dlMethod.check(function() {
	//
});
