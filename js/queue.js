// cr@mega.co.nz
var DEFAULT_CONCURRENCY = 6;
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
		this.done = function() {
			queue._running.splice($.inArray(this, queue._running),1);
			queue.trigger('done', args)
			queue.process();
		}
	}

	queue.prototype.process = function() {
		while (this._running.length != this._concurrency && this._queue.length > 0) {
			var args = this._queue.shift()
				, context = new Context(this, args)

			this._running.push(context)
			this._worker.apply(context, args)
		}

		if (this._queue.length == 0) {
			this.trigger('drain');
		}
	}

	queue.prototype.push = function() {
		this._queue.push(arguments)
		this.process();
	}

	window.Queue = queue;
})(this)
