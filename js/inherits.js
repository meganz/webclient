// Public: https://github.com/crodas/inherits/
if (0 && typeof Object.create === 'function') {
	// implementation from standard node.js 'util' module
	function inherits(ctor, superCtor) {
		ctor.super_ = superCtor
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	};
} else {
	// old school shim for old browsers
	function inherits(ctor, superCtor) {
		ctor.super_ = superCtor
		var TempCtor = function () {
			ctor.super_.apply(this, arguments)
		}
		TempCtor.prototype = superCtor.prototype
		ctor.prototype = new TempCtor()
		ctor.prototype.constructor = ctor
	}
}
