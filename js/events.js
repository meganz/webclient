function MegaEvents() {
   this._events = {}; 
}

MegaEvents.prototype.trigger = function(name, args) {
	args = args || []
	if (!this._events[name]) {
		return 0;
	}
	$.each(this._events[name], function(index, callback) {
		return callback.apply(null, args)
	});
};

MegaEvents.prototype.on = function(name, callback) {
	if (!this._events[name]) {
		this._events[name] = [];
	}
	this._events[name].push(callback);
	return this;
};

function xxx() {
}
inherits(xxx, MegaEvents);
