(function(w) {

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
