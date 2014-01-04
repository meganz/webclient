function getXhr() {
	var dl_xhr = new XMLHttpRequest;			
	if (dl_xhr.overrideMimeType) {
		dl_xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	return dl_xhr;
}

function downloader(task)
{
	if (dl_legacy_ie) {
		alert("not yet implemented");
		console.trace();
		return;
	}
	var xhr = getXhr();
	xhr.onprogress = function(e) {
	};
	xhr.onreadystatechange = function() {
		alert("here");
	}
}
