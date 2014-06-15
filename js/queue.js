// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 4

function MegaQueue(worker, limit) {
    this._limit = limit || 5;
	this._queue = [];
    this._running = 0
	this._worker  = worker
	this._noTaskCount = 0;
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
	this._process();
	this.trigger('resume')
};

MegaQueue.prototype.shrink = function() {
	this._limit = Math.max(this._limit-1, 1);
	return this._limit;
}

MegaQueue.prototype.pause = function() {
	if (d) { console.log("pausing queue"); console.trace(); }
	this._paused = true;
	this.trigger('pause')
};

MegaQueue.prototype.isPaused = function() {
	return this._paused;
}

function _queue_checker(tasks, next, error) {
	return function(task, response) {
		tasks.splice($.inArray(task, tasks), 1);
		if (response.length && response[0] === false) {
			/**
			 *	The first argument of .done(false) is false, which 
			 *	means that something went wrong
			 */
			return error(task, response);
		}
		if (tasks.length == 0) {
			next();
		}
	};
};

MegaQueue.prototype.pushAll = function(tasks, next, error) {
	var i = 0
		, len = tasks.length
		, callback = _queue_checker(tasks, next, error)

	for (i=0; i < len; i++) {
		this.push(tasks[i], callback);
	}
};

MegaQueue.prototype.run_in_context = function(task) {
	this._running++;
	this._worker(task[0], function() {
		if (!task[1]) return; /* already called */
		this._running--;
		task[1].apply(task[2], [task[0], arguments]);
		task[0] = null;
		task[1] = null;
		task[2] = null;
		this._process();
	}.bind(this));
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
	delete this._later;
	while (this._running < this._limit && this._queue.length > 0) {
		args = this.getNextTask();
		if (args === null) {
			if ( ++this._noTaskCount == 666 )
			{
				/**
				 * XXX: Prevent an infinite loop when there's a connection hang,
				 * with the UI reporting either "Temporary error; retrying" or
				 * a stalled % Status... [dc]
				 */
				if (d) console.error('*** CHECK THIS ***', this);
				this._noTaskCount = -1;
				return false;
			}
			this._process(1200);
			return false;
		}
		this._noTaskCount = 0;
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
	this._queue = [];
}

MegaQueue.prototype._process = function(ms) {
	if (this._later) clearTimeout(this._later);
	this._later = setTimeout(this.process.bind(this), ms || 190);
};

MegaQueue.prototype.push = function(arg, next, self) {
    this._queue.push([arg, next || function() {}, self || null]);
	this.trigger('queue');
    this._process();
};
