// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 4
	, QueueClass

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
    this._queue.push([arg, next || function() {}, self]);
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

MegaQueue.prototype.getNextTask = function() {
	var i, len = this._queue.length
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
		this.trigger('working', args);
		this.run_in_context(args);
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

(function(window) {
	function queue(worker, concurrency) {
		if (concurrency === undefined) {
			concurrency = DEFAULT_CONCURRENCY;
		}

		if (typeof worker != "function") {
			throw new Error("First argument must be a function");
		}

		this._concurrency	= concurrency;
		this._callback		= [];
		this._queue			= [];
		this._worker		= worker;
		this._running		= [];
		this._paused		= false;
		this._alive			= true;
	}
	inherits(queue, MegaEvents)

	function zContext(queue, args) {
		this.task = args;
		this.reschedule = function() {
			var callback = queue._callback[args.__tid];
			delete queue._callback[args.__tid];
			this.done();
			setTimeout(function() {
				queue.pushFirst(args, callback);
			}, 100);
		};

		this.done = function() {
			var id = $.inArray(this, queue._running);
			if (id == -1) {
				DEBUG("task already finished");
				return this._process();
			}

			var job = queue._running.splice(id, 1);

			queue.trigger('done', args)
			queue._callback[args.__tid](args, Array.prototype.slice.call(arguments, 0))
			delete queue._callback[args.__tid];
			if (args.__ondone) {
				args.__ondone(args, Array.prototype.slice.call(arguments, 0))
			}

			queue._process();

			/* cleanup memory */
			this.done = null; 
			this.task = null;
			this.reschedule = null;
			queue  = null;
			args   = null;
			job    = null;
		}
	}

	queue.prototype.destroy = function() {
		this._callback		= null;
		this._queue			= null;
		this._worker		= null;
		this._alive			= false;
		clearTimeout(this.__later);
	};

	queue.prototype.isEmpty = function() {
		return this._running.length == 0 
			&& this._queue.length == 0;
	}

	queue.prototype.debug = function() {
		DEBUG({ 
			running: this._running.length, 
			queued:  this._queue.length,
			paused:  this._paused,
			size:    this._concurrency,
		});
	}

	queue.prototype.getNextTask = function() {
		return this._queue.shift();
	};

	queue.prototype.resume = function() {
		this._paused = false;
		this.trigger('resume')
		this._process();
	};

	queue.prototype.pause = function() {
		this.trigger('pause')
		this._paused = true;
	};

	queue.prototype.isPaused = function() {
		return this._paused;
	}

	queue.prototype._process = function() {
		clearTimeout(this.__later);
		this.__later = setTimeout(function(self) {
			if (self._alive) self.process();
		}, 0,  this);
	}


	queue.prototype.process = function() {
		var args, context;
		if (!this._alive || this._paused) return;
		if (this._paused || !this._queue) return;
		while (!this._paused && this._running.length < this._concurrency && this._queue.length > 0) {
			args = this.getNextTask();
			if (args === null) {
				/* nothing on the queue? */
				this._process();
				return false;
			}

			this.trigger('working', args)
			context = new zContext(this, args)
			this._running.push(context)
			this._worker.apply(null, [args, context]);
			context = null
		}

		if (!this._queue) return;

		if (this._queue.length == 0 && this._running.length == 0) {
			this.trigger('drain');
		}
	}

	/**
	 *	Queue a group of related tasks. Similar to .push(<task>, callback), but 
	 *	it is useful when you care about a set of tasks succeeding instead of
	 *	individuals
	 *
	 *	@Array tasks		Array of tasks
	 *	@Callback done		Callback function when everything is done
	 *	@Callback error		A particular task failed, what do we do with it?
	 */
	queue.prototype.pushAll = function(tasks, done, error) {
		var that = this
			, triggered = false
		function check_finish(task, args) {
			tasks.splice($.inArray(task, tasks),1);

			if (args.length && args[0] === false) {
				/**
				 *	The first argument of .done(false) is false, which 
				 *	means that something went wrong
				 */
				function reschedule(ztask) {
					ztask = ztask || task
					tasks.unshift(ztask);
					that.pushFirst(ztask, check_finish);
				}

				return error(reschedule, task, args);
			}

			if (!triggered && tasks.length == 0) {
				// done!
				triggered = true;
				done();
			}
		};

		$.each(tasks, function(key, value) {
			value.__id = key;
			that.push(value, check_finish);
		});

		if (tasks.length == 0) {
			// fix bug with empty files
			check_finish({}, []);
		}
	};

	/**
	 *	Schedule a task to be processed right away (or as soon as possible)
	 */	
	queue.prototype.pushFirst = function(task, done) {
		task.__tid = id++;
		this._queue.unshift(task);
		this._callback[task.__tid] = done || function() {};
		this._process();
	}

	/**
	 *	Schedule a task, it'll be added last in the queue
	 */
	var id = 0;
	queue.prototype.push = function(task, done) {
		task.__tid = id++;
		this._queue.push(task);
		this._callback[task.__tid] = done || function() {};
		this._process();
	}

	QueueClass = queue;
})(this)
