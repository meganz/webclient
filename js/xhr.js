(function(w) {

function MegaXHR() {
	this.caller = null;
	this.newXhr();
}

MegaXHR.prototype.newXhr = function() {
	this.xhr = new XMLHttpRequest;
	this.xhr.onprogress = this.onprogress;
	this.xhr.upload.progress = this.upload_progress;
	this.xhr.onreadystatechange = this.onreadystatechange;
}

MegaXHR.prototype.release = function() {
	this.caller = null;
};

MegaXHR.prototype.attach = function(caller) {
	if (!this.caller) {
		this.caller = caller;
		return true;
	}
	return false;
}

MegaXHR.prototype.error = function() {
	if (this.caller.error) {
		this.caller.error(arguments, this.xhr);
		this.newXhr(); /* it failed, let's create a new xhr object */
	}
}

MegaXHR.prototype.upload_progress = function() {
	if (this.caller.on_upload_progress) {
		this.caller.on_upload_progress(arguments, this.xhr);
	}
}

MegaXHR.prototype.onprogress = function() {
	if (this.caller.on_progress) {
		this.caller.on_progress(arguments, this.xhr)
	}	
}

MegaXHR.prototype.onreadystatechange = function() {
	if (this.xhr.readyState == this.DONE && this.caller.on_ready) {
		this.caller.on_ready(arguments, this.xhr);
	}
}

MegaXHR.prototype.send = function(data) {
	if (this.xhr.overrideMimeType) {
		this.xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	this.xhr.send(data);
}

var _xhr_queue = [];

w.getXhr = function(object) {
	for (var i = 0; i < _xhr_queue.length; i++) {
		if (_xhr_queue[i].attach(object)) {
			return _xhr_queue[i];
		}
	}

	/* create a new xhr object */
	var xhr = new MegaXHR;
	xhr.attach(object);

	/* add it to the queue so we can recicle it */
	_xhr_queue.push(xhr);

	return xhr;
}


})(this);

alert(getXhr());
