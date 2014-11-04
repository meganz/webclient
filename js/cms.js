var IMAGE_PLACEHOLDER = staticpath + "/images/img_loader@2x.png";

(function(window, asmCrypto) {

var pubkey = asmCrypto.base64_to_bytes('WyJkNGQyYTA3Zjk0YzY0ZTBhMDYwMmI5NGE4ZWIyYjRlZDE5ZjczMzg2YmM4ODYzYTc1YzgyYWMxNDNkODRlMzc3MzhkODFmMDQ4YmM1YjgzNmFiOGUxYzg1Zjg5Y2U1MGNjOTBiMmNlNWZhZTc1Y2YzYTQ5MWIyZmZlOTM5MjNlZCIsIjAxMDAwMSJd');
pubkey = JSON.parse(asmCrypto.bytes_to_string(pubkey));
pubkey[0] = asmCrypto.hex_to_bytes(pubkey[0])
pubkey[1] = asmCrypto.hex_to_bytes(pubkey[1])

function verify_cms_content(content, signature)
{
	var hash = asmCrypto.SHA256.hex(content);

	try {
		return asmCrypto.RSA_PSS_SHA256.verify(signature, hash, pubkey);
	} catch (e) {
		/* rubbish data, invalid anyways */
		return false;
	}
}

function process_cms_response(socket, next, as)
{
	var bytes = socket.response;
	var viewer = new Uint8Array(bytes)

	var signature = bytes.slice(3, 67); // 64 bytes, signature
	var version = viewer[0];
	var mime = viewer[1];
	var label = ab_to_str(bytes.slice(67, viewer[2]+67));
	var content = bytes.slice(viewer[2]+67)

	delete bytes;

	if (as == "download") mime = 0;

	if (verify_cms_content(content, signature)) {
		switch (mime) {
		case 3: // html
			content = ab_to_str(content)
			return next(false, { html: content, mime: mime})
			break;

		case 1:
			var blob;
			try {
                blob = new Blob([content], { type: mime });
			} catch (e) {
                window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
                var bb = new BlobBuilder();
                for (var i in content) bb.append(content[i]);
                blob = bb.getBlob(mime)
			}
            content = window.URL.createObjectURL(blob);
			return next(false, { url: content, mime: mime})

		case 2:
			try {
				content = JSON.parse(ab_to_str(content))
			} catch (e) {
				/* invalid json, weird case */
				return next(true, {signature: false});
			}
			return next(false, { object: content, mime: mime})

		default:
			var io = new MemoryIO("temp", {});
			io.begin = function() {};
			io.setCredentials("", content.byteLength, "", [], []);
			io.write(content, 0, function() {
				// second argument is never used anyways
				io.download(label, label);
				return next(false, {});
			});
			break;
		}
	} else {
		next(true, {error: 'Invalid signature', signature: true} );
	}
}

var assets = {};

$(document).on('click', '*[data-cms-dl]', function(e) {
	CMS.get($(this).data('cms-dl'), function() {
	}, 'download');
	return false;
});

var is_img
function dl_placeholder(str, sep, rid, id) {
	return "'javascript:void(0)' data-cms-dl='"+id+"'"
}

function img_placeholder(str, sep, rid, id) {
	is_img = true;
	return "'" + IMAGE_PLACEHOLDER + "' data-img='loading_" +  id + "'" 
}

function CMSClass() {
}

CMSClass.prototype.img = function(id) 
{
	if (!assets[id]) {
		this.get(id, function(err, obj) {
			$('*[data-img=loading_' + id + ']').attr({'id': '', 'src': obj.url})
			assets[id] = obj.url;
		});
	}
	return assets[id] ? assets[id] : IMAGE_PLACEHOLDER;
}

var fetching = {};

function doRequest(id) {
	var q = getxhr();
	q.onload = function() {
		for (var i in fetching[id]) {
			process_cms_response(q, fetching[id][i][0], fetching[id][i][0]);
		}
		delete fetching[id]
		q = null;
	}
	q.onerror = function() {
		Later(function() {
			doRequest(id);
		})
		q = null;
	};
	q.responseType = 'arraybuffer';
	q.open("GET", (localStorage.cms || "//cms.mega.nz/") + id);
	q.send();
}

CMSClass.prototype.get = function(id, next, as) {
	if (typeof fetching[id] == "undefined") {
		doRequest(id);
		fetching[id] = [];
	}
	fetching[id].push([next, as]);
};

CMSClass.prototype.imgLoader = function(html, id) {
	if (!assets[id]) {
		is_img = false;
		// replace images
		html = html.replace(new RegExp('([\'"])(i:(' + id + '))([\'"])', 'g'), img_placeholder);
		// replace download links
		html = html.replace(new RegExp('([\'"])(d:(' + id + '))([\'"])', 'g'), dl_placeholder);
		
		if (is_img) {
			this.get(id);
		}
	} else {
		html = html.replace(IMAGE_PLACEHOLDER + "' data-img='loading_" + id, assets[id], 'g');
	}
	return html;
}

$(document).on('click', '.cms-asset-download', function(e) {
	var $this = $(this)
		, target = $this.data('id');
	if (!target) return;

	e.preventDefault();

	loadingDialog.show();
	CMS.get(target, function() {
		loadingDialog.hide();
	}, 'download');

	return false;
});


window.CMS = new CMSClass;

})(this, asmCrypto)

function corporate_boot()
{
	$('.new-left-menu-link').rebind('click', function() {
		var $this = $(this)
		$('.new-right-content-block').addClass('hidden');
		$('.new-right-content-block.' + $this.attr('id')).removeClass('hidden');
		$('.new-left-menu-link').removeClass('active');
		$this.addClass('active');			
	});
	$('.new-left-menu-link:first').trigger('click');
}
