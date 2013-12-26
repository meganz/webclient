var dlMethod

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
DownloadQueue.prototype.push = function(x) {
	var len =  Array.prototype.push.apply(this,arguments);
	// queue download here

	return len;
};

/**
 *	Global function to help debugging
 */
function DEBUG(x) {
	if (d) {
		console.log.apply(console, arguments)
		console.error.apply(console, arguments)
	}
}

function dlError(text) {
	return function(e) {
		console.log(text + ' ' + e);
		alert(text + ' ' + e);
	};
}

if (window.webkitRequestFileSystem) {
	dlMethod = FileSystemAPI;
} else {
	alert("dlMethod is not yet defined");
}

// check if the download method works
// and boot everything!
dlMethod.check(function() {
});
