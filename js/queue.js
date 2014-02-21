// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 4
	, QueueClass
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
		var self = this;
		setInterval(function() {
			//self.process();	
		}, 100);
	}
	inherits(queue, MegaEvents)

	function Context(queue, args) {
		this.task = args;
		this.done = function() {
			var id = $.inArray(this, queue._running);
			if (id == -1) {
				DEBUG("task already finished");
				return queue.process();
			}

			queue._running.splice(id,1);
			queue.trigger('done', args)
			queue._callback[args.__tid](args, Array.prototype.slice.call(arguments, 0))
			delete queue._callback[args.__tid];
			if (args.__ondone) {
				args.__ondone(args, Array.prototype.slice.call(arguments, 0))
			}
			queue.process();
		}
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
		this.process();
	};

	queue.prototype.pause = function() {
		this.trigger('pause')
		this._paused = true;
	};

	queue.prototype.isPaused = function() {
		return this._paused;
	}

	queue.prototype.process = function() {
		var args, context;
		while (!this._paused && this._running.length != this._concurrency && this._queue.length > 0) {
			args = this.getNextTask();
			if (args === null) {
				/* nothing on the queue? */
				var that = this;
				Later(function() {
					that.process(); /* re-run scheduler */
				});
				return false;
			}

			this.trigger('working', args)
			context = new Context(this, args)

			this._running.push(context)
			this._worker.apply(context, [args])
		}

		if (this._queue.length == 0) {
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
		this.process();
		task.__tid = id++;
		this._queue.unshift(task);
		this._callback[task.__tid] = done || function() {};
		setTimeout(function() {
			this.process();
		}, 0);
	}

	/**
	 *	Schedule a task, it'll be added last in the queue
	 */
	var id = 0;
	queue.prototype.push = function(task, done) {
		task.__tid = id++;
		this._queue.push(task);
		this._callback[task.__tid] = done || function() {};
		var self = this;
		setTimeout(function() {
			self.process();
		}, 0);
	}

	QueueClass = queue;
})(this)
