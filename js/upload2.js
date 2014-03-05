function UploadQueue() {
}
inherits(UploadQueue, Array);

/* Helper functions {{{ */
var ul_completion = [];
var ul_completing;

function ul_completepending(target)
{
	if (ul_completion.length) {
		var ul = ul_completion.shift();
		var ctx = {
			target : target,
			ul_queue_num : ul[3],
			callback : ul_completepending2,
			faid : ul[1].faid
		};

		api_completeupload(ul[0],ul[1],ul[2],ctx);
	}
	else ul_completing = false;
}

function ul_completepending2(res,ctx)
{
	if (typeof res == 'object' && res.f)
	{
		if (ctx.faid) storedattr[ctx.faid].target = res.f[0].h;

		newnodes = [];
		process_f(res.f);
		rendernew();
		fm_thumbnails();
		if (ctx.faid) api_attachfileattr(res.f[0].h,ctx.faid);
		onUploadSuccess(ctx.ul_queue_num);
		ul_completepending(ctx.target);
	}
}

function ul_deduplicate(File, identical) {
	var n, uq = File.ul;
	if (identical && ul_skipIdentical) {
		n = identical;
	} else if (!M.h[uq.hash] && !identical) {
		return ul_start(File)
	} else if (M.h[uq.hash]) {
		n = M.d[M.h[uq.hash][0]];
	}
	if (!n) ul_start(File);
	api_req({a:'g',g:1,ssl:use_ssl,n:n.h}, {
		uq:uq,
		n:n,
		skipfile:(ul_skipIdentical && identical),
		callback: function(res,ctx) {
			if (res.e == ETEMPUNAVAIL && ctx.skipfile) {
				ctx.uq.repair = ctx.n.key;
				ul_start(File);
			} else if (typeof res == 'number' || res.e) {
				ul_start(File);
			} else if (ctx.skipfile) {
				onUploadSuccess(uq.pos);
				ul_uploading = false
			} else {
				api_completeupload2({
					callback: api_completeupload2, 
					t : 	ctx.n.h, 
					path: 	ctx.uq.path, 
					n: 		ctx.uq.name, 
					k: 		ctx.n.key, 
					fa: 	ctx.n.fa, 
					ctx: 	{
						target:ctx.uq,
						ul_queue_num:uq.pos,
						callback:ul_completepending2
					}
				},ctx.uq);
				ul_uploading = false
			}
		}
	});
}

function ul_Identical(target, path, hash,size)
{
	if (!target || !path) return false;
	var p = path.split('/');	
	var n = M.d[target];
	for (var i in p)
	{		
		var foldername = p[i];
		var h = n.h;		
		if (!n) return false;		
		var n = false;		
		for (var j in M.c[h])
		{
			if (M.d[j] && M.d[j].name == foldername)
			{
				if (M.d[j].t) n = M.d[j];
				else if (p.length == parseInt(i)+1 && (hash == M.d[j].hash || size == M.d[j].s)) return M.d[j];
			}			
		}
	}
	return false;
}
/* }}} */ 

function ul_get_posturl(File) {
	return function(res, ctx) {
		if (typeof res == 'object') {
			ul_queue[ctx.reqindex].posturl = res.p;
			if (ctx.reqindex == File.ul.pos) {
				ul_upload(File);
			}
		} else {
			DEBUG('request failed');
		}
	};
}

function ul_upload(File) {
	var ul_key, i
		, file = File.file

	if (file.repair) {
		ul_key = file.repair;
		ul_key = [ul_key[0]^ul_key[4],ul_key[1]^ul_key[5],ul_key[2]^ul_key[6],ul_key[3]^ul_key[7],ul_key[4],ul_key[5]]	
	} else {
		ul_key = Array(6);
		// generate ul_key and nonce
		for (i = 6; i--; ) ul_key[i] = rand(0x100000000);
	}

	var ul_keyNonce = JSON.stringify(ul_key)
		, ul_macs = []
		, totalbytessent = 0
		, p, pp
		, ul_readq  = []
		, ul_plainq = {}
		, ul_intransit = 0
		, ul_inflight = {}
		, ul_sendchunks = {};

	if (file.size) {
		p = 0;
		for (i = 1; i <= 8 && p < file.size-i*131072; i++) {
			ul_readq[p] = i*131072;
			pp 	= p;
			p += ul_readq[p];
		}

		while (p < file.size) {
			ul_readq[p] = 1048576;
			pp 	= p;
			p += ul_readq[p];
		}

		if (!(ul_readq[pp] = file.size-pp) && file.size) delete file.ul_readq[pp];
	} else {
		ul_readq[0] = 0;
	}

	if (is_image(file.name)) {
		file.faid = ++ul_faid;
		if (have_ab) createthumbnail(file, ul_aes, ul_faid);
	}

	onUploadStart(file.pos);
}


function ul_start(File) {
	if (File.posturl) return ul_upload(File);
	var maxpf = 128*1048576
		, next = ul_get_posturl(File);

	$.each(ul_queue, function(i, cfile) {
		if (cfile.posturl) return; /* continue */
		if (i >= File.pos+8 || maxpf <- 0) return false; /* break */
		api_req({ 
			a : 'u', 
			ssl : use_ssl, 
			ms : ul_maxSpeed, 
			s : cfile.size, 
			r : cfile.retries, 
			e : cfile.ul_lastreason 
		}, { reqindex : i, callback : next });
		maxpf -= cfile.size
	});
}

function FileUpload(file) {
	var self = this;
	this.file = file;
	this.ul   = file;

	this.run = function(next) {
		file.retries = file.retries+1 || 0
		file.ul_lastreason = file.ul_lastreason || 0

		ul_uploading = true;

		try {
			fingerprint(file, function(hash, ts) {
				file.hash = hash;
				file.ts   = ts;
				var identical = ul_Identical(file.target, file.path || file.name, file.hash, file.size);
				if (M.h[hash] || identical) ul_deduplicate(self, identical);
				else ul_start(self);
			});
		} catch (e) {
			DEBUG('FINGERPRINT ERROR', e.message || e);
			ul_start(self);
		}
	}
}

UploadQueue.prototype.push = function() {
	var pos = Array.prototype.push.apply(this, arguments) - 1
		, file = this[pos]

	file.pos = pos;

	var ul_reader = new FileReader;
	ulQueue.push(new FileUpload(file));

	return pos+1;
};

function worker_uploader(task) {
	task.run(this.done);
}

var ul_queue  = new UploadQueue
	, ul_skipIdentical = 0
	, ulQueue = new QueueClass(worker_uploader)
	, ul_uploading = false
	, ul_maxSpeed = 0

if (localStorage.ul_maxSpeed) ul_maxSpeed=parseInt(localStorage.ul_maxSpeed);

if (localStorage.ul_skipIdentical) {
	ul_skipIdentical= parseInt(localStorage.ul_skipIdentical);
}
