(function(w) {

var _xhr_queue = [];

function newXhr() {
	var xhr = new XMLHttpRequest;
	xhr.__id = parseInt(Math.random() * 0xffffffff);
	xhr.__timeout = null;
	xhr.setup_timeout = function() {
		clearTimeout(xhr.__timeout);
		xhr.__timeout = setTimeout(function(q) {
			q.ontimeout();
		}, 2*60*1000, xhr);
	};

	xhr._abort = xhr.abort;

	xhr.abort = function() {
		xhr._abort();
		this.listener = null; /* we're done here, release this slot */
	}

	xhr.onreadystatechange = function() {
		xhr.setup_timeout();
		if (this.readyState == this.DONE && this.listener.on_ready) {
			clearTimeout(xhr.__timeout);
			this.listener.on_ready(arguments, this);
			this.listener = null; /* we're done here, release this slot */
		}
	}

	xhr.upload.onprogress = function() {
		xhr.setup_timeout();
		if (xhr.listener.on_upload_progress) {
			xhr.listener.on_upload_progress(arguments, xhr);
		}
	}

	xhr.onerror = function() {
		clearTimeout(xhr.__timeout);
		if (this.listener.on_error) {
			this.abort();
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
		clearTimeout(xhr.__timeout);
		if (this.listener.on_error) {
			this.abort();
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
		xhr.setup_timeout();
		if (this.listener.on_progress) {
			this.listener.on_progress(arguments, this)
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
