// {{{
// output of scripts/javascript.php
// I should be replaced with production deploy keys
(function(window, asmCrypto) {

var pubkey = asmCrypto.base64_to_bytes('WyJhZGJiMGEwNGQ5YzRiYjMxNWQzMTA2YzQwZjE1YzBmYzNlZmJjMmJmODkyNGU4ODA0NzU5OTk1MDRiNmE0ZGJiMWZjMjZhYTdkNmI1N2Q0YjFjMDhhYTM3ZDQ0MGYxMDJiMDJmZGZiMmE5ZTNlNjAzODVmZGJhODFjZmY5Y2E2OSIsIjAxMDAwMSJd'); 
pubkey = JSON.parse(asmCrypto.bytes_to_string(pubkey));
console.log(pubkey)
pubkey[0] = asmCrypto.hex_to_bytes(pubkey[0])
pubkey[1] = asmCrypto.hex_to_bytes(pubkey[1])

window.verify_cms_content = function(content, signature)
{
    var hash = asmCrypto.SHA256.hex(content);
    signature = asmCrypto.base64_to_bytes(signature);
    if (!asmCrypto.RSA_PSS_SHA256.verify(signature, hash, pubkey)) {
        throw new Error('Signature missmatch');
    }


}

})(this, asmCrypto)
// }}}

/* This is criminal, but it works! (This won't be on production) */
old_api_req = api_req;
api_req = function(req, ctx, c)
{
	if (req.a == "blob") {
		var q = getxhr();
		q.onload = function() {
			var text = this.response;
			verify_cms_content(text, this.getResponseHeader('X-Mega-Authenticity'));
			alert("loaded object " + req.id + " from CMS");
		};
		q.responseType = 'arraybuffer';
		q.open("GET", "/blobs.php?id=" + req.id);
		q.send();
		return;
	}

	return old_api_req(req, ctx, c);
};
