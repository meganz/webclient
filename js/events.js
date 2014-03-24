// cr@mega.co.nz
function MegaEvents() {
}

MegaEvents.prototype.trigger = function(name, args) {
	if (!this._events) this._events = {}
	args = args || []
	var done = 0;
	$.each(this._events[name] || [], function(index, callback) {
		done++;
		return callback.apply(null, args)
	});
	return done;
};

MegaEvents.prototype.on = function(name, callback) {
	if (!this._events) this._events = {}
	if (!this._events[name]) {
		this._events[name] = [];
	}
	this._events[name].push(callback);
	return this;
};
