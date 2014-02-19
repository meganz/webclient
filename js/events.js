// cr@mega.co.nz
function MegaEvents() {
   this._events = {}; 
}

MegaEvents.prototype.trigger = function(name, args) {
	args = args || []
	var done = 0;
	$.each(this._events[name] || [], function(index, callback) {
		done++;
		return callback.apply(null, args)
	});
	return done;
};

MegaEvents.prototype.on = function(name, callback) {
	if (!this._events[name]) {
		this._events[name] = [];
	}
	this._events[name].push(callback);
	return this;
};
