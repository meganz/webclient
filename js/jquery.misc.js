
$.fn.visible = function (e, i)
{
	var a = $(this).eq(0),
		f = a.get(0),
		c = $(window),
		g = c.scrollTop();
	c = g + c.height() - $('.transfer-panel').height();
	var b = a.offset().top,
		h = b + a.height();
	a = e === true ? h : b;
	b = e === true ? b : h;
	return !!(i === true ? f.offsetWidth * f.offsetHeight : true) && b <= c && a >= g
};

// Based on http://stackoverflow.com/a/10835425
$.fn.removeClassWith = function(pfx)
{
	var i = 0, l = this.length, n;
	while (l > i)
	{
		if ((n = this[i++]).className)
			n.className = $.trim(n.className.split(" ")
				.filter(function(c) {
					return c.lastIndexOf(pfx, 0) !== 0;
				}).join(" "));
	}
	return this;
};

/*
// @crodas -- http://stackoverflow.com/a/2200886/1608408
(function() {
	var orig = $.fn.remove;
	$.fn.remove = function() {
		$(this).trigger("remove")
		return orig.apply(this, arguments);
	}
})();
*/
