(function(w) {

// old {{{
function MegaXHR() {
	this.caller = null;
	this.newXhr();
}

MegaXHR.prototype.newXhr = function() {
	this.xhr = new XMLHttpRequest;
	this.xhr.onprogress = bind(this.onprogress);
	this.xhr.upload.progress = bind(this.upload_progress);
	this.xhr.onerror = bind(this.onerror);
	this.xhr.onabort = bind(this.onerror)
	this.xhr.onreadystatechange = bind(this.onreadystatechange);
}

MegaXHR.prototype.open = function() {
	this.xhr.open.apply(this.xhr, arguments);
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

MegaXHR.prototype.onerror = function(args) {
	if (this.caller.on_error) {
		this.caller.on_error(args, this.xhr);
		this.newXhr(); /* it failed, let's create a new xhr object */
	}
}

MegaXHR.prototype.upload_progress = function(args) {
	if (this.caller.on_upload_progress) {
		this.caller.on_upload_progress(args, this.xhr);
	}
}

MegaXHR.prototype.onprogress = function() {
	if (this.caller.on_progress) {
		this.caller.on_progress(args, this.xhr)
	}	
}

MegaXHR.prototype.onreadystatechange = function(args) {
	if (this.xhr.readyState == this.DONE && this.caller.on_ready) {
		this.caller.on_ready(args, this.xhr);
	}
}

MegaXHR.prototype.send = function(data) {
	if (this.xhr.overrideMimeType) {
		this.xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	this.xhr.send(data);
}
// }}}

var _xhr_queue = [];

function newXhr() {
	var xhr = new XMLHttpRequest;
	xhr.__id = parseInt(Math.random() * 0xffffffff);
	xhr.onreadystatechange = function() {
		if (this.readyState == this.DONE && this.listener.on_ready) {
			this.listener.on_ready(arguments, this);
		}
	}
	xhr.onerror = function() {
		if (this.listener.on_error) {
			this.listener.on_error(arguments, this, 'error');
			this.listener = null; /* release */
			for(var i = 0; i < _xhr_queue.length; i++) {
				if (_xhr_queue[i].__id == this.__id) {
					_xhr_queue.splice(i, 1);
					break;
				}
			}
		}
	}
	xhr.ontimeout = function() {
		if (this.listener.on_error) {
			this.listener.on_error(arguments, this, 'timeout');
			this.listener = null; /* release */
			for(var i = 0; i < _xhr_queue.length; i++) {
				if (_xhr_queue[i].__id == this.__id) {
					_xhr_queue.splice(i, 1);
					break;
				}
			}
		}
	}
	xhr.onprogress = function() {
		if (this.listener.on_progress) {
			this.listener.on_progress(arguments, this)
			this.listener = null; /* we're done here, release this slot */
		}	
	}

	return xhr;
}

w.getXhr = function(object) {
	for (var i = 0; i < _xhr_queue.length; i++) {
		if (!_xhr_queue[i].listener) {
			_xhr_queue[i].listener = object;
			return _xhr_queue[i];
		}
	}

	/* create a new xhr object */
	var xhr = newXhr();
	xhr.listener = object;

	/* add it to the queue so we can recicle it */
	_xhr_queue.push(xhr);

	return xhr;
}


})(this);
