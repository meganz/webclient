function inherits(ctor, superCtor) {
	ctor.super_ = superCtor
	var TempCtor = function () {
		ctor.super_.prototype.constructor.apply(this, arguments)
	}
	TempCtor.prototype = superCtor.prototype
	ctor.prototype = new TempCtor()
	ctor.prototype.constructor = ctor
}
