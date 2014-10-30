var IMAGE_PLACEHOLDER = staticpath + "/images/loading.gif";

(function(window, asmCrypto) {

var pubkey = asmCrypto.base64_to_bytes('WyJlNzQwNWI3YTdlYzIwYjc5Y2MwNmFiNmRhYTRlYmVlMjJlODljOTkxMDY4OGQ4NGRjMjllMGMyMzIyZTg2NTc4ZTlkNmE1YjNjODQyMGU1YTViZWU5YjI1YzA1MTZiMzFjOTc5Y2IyNGRiOWI0NzZhMTEwMTExZjlkM2FkZTY5NyIsIjAxMDAwMSJd')
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

	var signature = bytes.slice(2, 66); // 64 bytes, signature
	var mime = viewer[0]
	var label = ab_to_str(bytes.slice(66, viewer[1]+66));
	var content = bytes.slice(viewer[1]+66)

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
				io.download(label, 'application/octet-stream');
			});
			break;
		}
	} else {
		next(true, {error: 'Invalid signature', signature: true} );
	}
}

var assets = {};

$(document).on('click', '*[data-cms-dl]', function(e) {
	window.CMS.get($(this).data('cms-dl'), function() {
	}, 'download');
	return false;
});

var is_img
function dl_placeholder(str, sep, rid, id) {
	return "'" + Math.random() + "' data-cms-dl='"+id+"'"
}

function img_placeholder(str, sep, rid, id) {
	is_img = true;
	return "'" + IMAGE_PLACEHOLDER + "' data-img='loading_" +  id + "'" 
}

function CMS() {
}

CMS.prototype.img = function(id) 
{
	if (!assets[id]) {
		window.CMS.get(id, function(err, obj) {
			$('*[data-img=loading_' + id + ']').attr({'id': '', 'src': obj.url})
			assets[id] = obj.url;
		});
	}
	return assets[id] ? assets[id] : IMAGE_PLACEHOLDER;
}

CMS.prototype.get = function(id, next, as) {
	// I should be replaced with api_req instead of the socket
	var q = getxhr();
	q.onload = function() {
		process_cms_response(q, next, as);
	}
	q.onerror = function() {
		Later(function() {
			window.CMS.get(id, next, as);
		})
	};
	q.responseType = 'arraybuffer';
	q.open("GET", "/blobs.php?id=" + id);
	q.send();
};

CMS.prototype.imgLoader = function(html, id) {
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


window.CMS = new CMS;

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
