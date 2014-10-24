var IMAGE_PLACEHOLDER = staticpath + "/images/loading.gif";

(function(window, asmCrypto) {

// I should be replaced with production deploy keys
var pubkey = asmCrypto.base64_to_bytes('WyJhZGJiMGEwNGQ5YzRiYjMxNWQzMTA2YzQwZjE1YzBmYzNlZmJjMmJmODkyNGU4ODA0NzU5OTk1MDRiNmE0ZGJiMWZjMjZhYTdkNmI1N2Q0YjFjMDhhYTM3ZDQ0MGYxMDJiMDJmZGZiMmE5ZTNlNjAzODVmZGJhODFjZmY5Y2E2OSIsIjAxMDAwMSJd'); 
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

	if (as == "download") mime = 3;

	if (verify_cms_content(content, signature)) {
		switch (mime) {
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
			window.CMS.get(id, function(err, obj) {
				$('*[data-img=loading_' + id + ']').attr({'id': '', 'src': obj.url})
				assets[id] = obj.url;
			});
		}
	} else {
		html = html.replace(IMAGE_PLACEHOLDER + "' data-img='loading_" + id, assets[id], 'g');
	}
	return html;
}


window.CMS = new CMS;

})(this, asmCrypto)
