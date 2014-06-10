// cr@mega.co.nz
function MegaEvents() {
}

MegaEvents.prototype.trigger = function(name, args) {
	if (!(this._events && this._events.hasOwnProperty(name))) return false;

	if (d > 1) console.log(' >>> Triggering ' + name, this._events[name].length, args );

	args = args || []
	var done = 0, evs = this._events[name];
	for (var i in evs) {
		try {
			evs[i].apply(null, args);
		} catch(ex) {
			console.error(ex);
		}
		++done;
	}
	return done;
};

MegaEvents.prototype.on = function(name, callback) {
	if (!this._events) this._events = {};
	if (!this._events.hasOwnProperty(name)) {
		this._events[name] = [];
	}
	this._events[name].push(callback);
	return this;
};
