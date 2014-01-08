// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 6
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
		this._queue			= [];
		this._worker		= worker;
		this._running		= [];
	}
	inherits(queue, MegaEvents)

	function Context(queue, args) {
		this.task = args;
		this.done = function() {
			queue._running.splice($.inArray(this, queue._running),1);
			queue.trigger('done', args.task)
			args.callback(args.task);
			queue.process();
		}
	}

	queue.prototype.getNextTask = function() {
		return this._queue.shift();
	};

	queue.prototype.process = function() {
		var args, context;
		while (this._running.length != this._concurrency && this._queue.length > 0) {
			args = this.getNextTask();
			context = new Context(this, args)

			this._running.push(context)
			this._worker.apply(context, [args.task])
		}

		if (this._queue.length == 0) {
			this.trigger('drain');
		}
	}

	queue.prototype.pushAll = function(tasks, done) {
		var that = this;
		function check_finish(task) {
			tasks.splice($.inArray(task, tasks),1);
			if (tasks.length == 0) {
				// done!
				done();
			}
		};

		$.each(tasks, function(key, value) {
			value.__id = key;
			that.push(value, check_finish);
		});
	};

	queue.prototype.push = function(task, done) {
		this._queue.push({task: task, callback: done || function() {}});
		this.process();
	}

	QueueClass = queue;
})(this)
