// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 4

function MegaQueue(worker, limit) {
    this._limit = limit || 5;
	this._queue = [];
    this._running = 0
	this._worker  = worker
}
inherits(MegaQueue, MegaEvents)

MegaQueue.prototype.isEmpty = function() {
	return this._running == 0 
		&& this._queue.length == 0;
}

MegaQueue.prototype.pushFirst = function(arg, next, self) {
    this._queue.unshift([arg, next || function() {}, self]);
	this._process();
};

MegaQueue.prototype.resume = function() {
	this._paused = false;
	this.trigger('resume')
	this._process();
};

MegaQueue.prototype.pause = function() {
	this.trigger('pause')
	this._paused = true;
};

MegaQueue.prototype.isPaused = function() {
	return this._paused;
}

function _queue_checker(queue, tasks, next, error) {
	return function(task, response) {
		tasks.splice($.inArray(task, tasks), 1);
		if (response.length && response[0] === false) {
			/**
			 *	The first argument of .done(false) is false, which 
			 *	means that something went wrong
			 */
			return error(task, arguments);
		}
		if (tasks.length == 0) {
			next();
		}
	};
};

MegaQueue.prototype.pushAll = function(tasks, next, error) {
	var i = 0
		, len = tasks.length
		, callback = _queue_checker(this,tasks, next, error)

	for (i=0; i < len; i++) {
		this.push(tasks[i], callback);
	}
};

MegaQueue.prototype.run_in_context = function(task) {
	var self = this;
	self._running++
	this._worker(task[0], function() {
		if (!self) return; /* already called */
		task[1].apply(task[2], [task[0], arguments]);
		task[0] = null;
		task[1] = null;
		task[2] = null;
		self._running--;
        self._process();
		self = null;
    });
}

MegaQueue.prototype.validateTask = function() {
	return true;
}

MegaQueue.prototype.prepareNextTask = function() {
};

MegaQueue.prototype.getNextTask = function() {
	var i, len = this._queue.length
	this.prepareNextTask();
	for (i = 0; i < len; i++) {
		if (this.validateTask(this._queue[i][0])) {
			var data = this._queue[i]
			this._queue.splice(i, 1);
			return data
		}
	}
	return null;
};

MegaQueue.prototype.process = function() {
	var args;
	if (this._paused) return;
	clearTimeout(this._later);
	while (this._running < this._limit && this._queue.length > 0) {
		args = this.getNextTask();
		if (args === null) {
			this._process();
			return false;
		}
		this.run_in_context(args);
		this.trigger('working', args);
	}

	if (this.isEmpty()) {
		this.trigger('drain');
	}
	return true;
};

MegaQueue.prototype.destroy = function() {
	clearTimeout(this._later);
	this._limit = -1
	this._queue = null;
}

MegaQueue.prototype._process = function() {
	clearTimeout(this._later);
	this._later = setTimeout(function(q) {
		q.process();
	}, 0, this);
};

MegaQueue.prototype.push = function(arg, next, self) {
    this._queue.push([arg, next || function() {}, self || null]);
    this._process();
};
