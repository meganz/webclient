// @crodas -- http://stackoverflow.com/a/2200886/1608408
(function() {
	var orig = $.fn.remove;
	$.fn.remove = function() {
		$(this).trigger("remove")
		return orig.apply(this, arguments);
	}
})();
