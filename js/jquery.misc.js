/**
 * Helper function to get the jScrollPane container of this element
 *
 * @returns {*}
 */
$.fn.getParentJScrollPane = function() {
    "use strict";

    var $scrollable_parent = $(this).closest('.jspScrollable');
    if ($scrollable_parent.length) {
        var $jsp = $scrollable_parent.data('jsp');
        if ($jsp) {
            return $jsp;
        } else {
            return false;
        }
    }
};

/**
 * Find jQuery Element in an jQuery array of elements and return its index OR -1 if not found.
 * Pretty similar to the $.inArray, but will match the object IDs.
 *
 *
 * @param el
 * @param arr
 * @returns int -1 or key index
 */
$.elementInArray = function(el, arr) {
    'use strict';

    var found = $.map(
        arr,
        function(n, i) {
            return el.is(n) ? i : undefined;
        }
    );
    return found.length > 0 ? found[0] : -1;
};

/**
 * Case insensitive :istartswith.
 *
 * @param a
 * @param i
 * @param m
 * @returns {boolean}
 */
jQuery.expr.pseudos.istartswith = function(a, i, m) {
    'use strict';
    return $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) === 0;
};

/**
 * Get a specific attribute across a nodelist
 * @param {String} attr attribute
 */
$.fn.attrs = function(attr) {
    'use strict';

    var i = 0, l = this.length, result = {};
    while (l > i) {
        var val = this[i++].getAttribute(attr);
        if (val) {
            result[val] = 1;
        }
    }
    return Object.keys(result);
};

$.fn.visible = function (e, i)
{ // https://github.com/teamdf/jquery-visible
    var a = $(this).eq(0),
        f = a.get(0),
        c = $(window),
        g = c.scrollTop();
    c = g + c.height() /*- ($('.transfer-panel').height() || 48)*/;
    var b = a.length && a.offset().top,
        h = b + a.height();
    a = e === true ? h : b;
    b = e === true ? b : h;
    return !!(i === true ? f.offsetWidth * f.offsetHeight : true) && b <= c && a >= g
};

// Returns in percentages how much can be seen vertically of an element in the current viewport.
$.fn.pvisible = function() {
    // Based on https://stackoverflow.com/a/33860876
    'use strict';
    var $this = $(this[0]);
    if (!$this.length) {
        return 0;
    }
    var dh = $this.height();
    var dp = $this.offset().top;
    var wh = $(window).height();
    var ds = $(document).scrollTop();
    var hb = ds - dp;
    var ha = dp + dh - (ds + wh);

    if (ds > dp + dh || dp > ds + wh) {
        return 0;
    }

    var res = 100;
    if (hb > 0) {
        res -= hb * 100 / dh;
    }
    if (ha > 0) {
        res -= ha * 100 / dh;
    }
    return res;
};

// Based on http://stackoverflow.com/a/10835425
$.fn.removeClassWith = function(pfx) {
    'use strict';

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

/**
 * Shortcut to count object keys
 */
$.len = function(obj) {
    'use strict';

    return Object.keys(obj).length;
};

/**
 * Helper to trigger resize once within a second
 */
$.tresizer = function tresizer() {
    'use strict';

    if ($.tresizer.last !== -1) {

        setTimeout(function tresizer() {
            $.tresizer.last = Date.now();
            $(window).trigger('resize');
        }, 280);
        $.tresizer.last = -1;
    }
};
$.tresizer.last = 0;

/**
 * Attach an event handler function for one or more events to the selected elements, replacing
 * any matching previous event handler already attached to the element.
 * This is basically a wrapper for off->on (formerly unbind->bind)
 *
 * @param {String} events One or more space-separated event types and optional namespaces, such as "click"
 * @param {String} [selector] selector to filter the descendants of the selected elements that trigger the event.
 * @param {Function} handler function to execute when the event is triggered.
 * @returns {jQuery}
 */
$.fn.rebind = function(events, selector, handler) {
    'use strict';

    if (typeof selector === 'function') {
        handler = selector;
        selector = null;
    }

    var i = 0;
    var l = this.length;
    while (l > i) {
        $(this[i++]).off(events, selector || null).on(events, selector || null, handler);
    }
    return this;
};

// Get textarea cursor position
$.fn.getCursorPosition = function() {
    var el = $(this).get(0),
        pos = 0;
    if ('selectionStart' in el) {
        pos=el.selectionStart;
    }
    else if ('selection' in document) {
        el.focus();
        var sel = document.selection.createRange(),
            selLength = document.selection.createRange().text.length;

        sel.moveStart('character', -el.value.length);
        pos = sel.text.length - selLength;
    }
    return pos;
};

// Based off http://stackoverflow.com/a/15191130
$.fn.rotate = function AnimateRotate(finalAngle, initialAngle, time) {
    return this.each(function() {
        var $this = $(this);

        // we use a pseudo object for the animation
        $({deg: initialAngle || 0}).animate({deg: finalAngle}, {
            duration: time || 1000,
            step: function(now) {
                // in the step-callback (that is fired each step of the animation),
                // you can use the `now` paramter which contains the current
                // animation-position (`initalAngle` up to `finalAngle`)
                $this.css({
                    transform: 'rotate(' + now + 'deg)'
                });
            }
        });
    });
};

// REMOVE ONCE JQUERY.MOBILE.JS SUPPORTS JQUERY +3.x
if (!$.event.props) {
    // Includes some event props shared by KeyEvent and MouseEvent
    $.event.props = ("altKey bubbles cancelable ctrlKey currentTarget detail " +
        "eventPhase metaKey relatedTarget shiftKey target timeStamp view which").split(" ");

    $.event.mouseHooks = {
        props: ("button buttons clientX clientY offsetX offsetY pageX pageY " +
            "screenX screenY toElement").split(" ")
    };
}

// prevent DOMElement (and its pseudo-elements) to do not use transition while do some actions
$.fn.noTransition = function(action) {
    'use strict';

    var $this = $(this);
    $this.addClass('no-trans');
    $.when(action.call(this)).done(function() {
        setTimeout(function() {
            $this.removeClass('no-trans');
        }, 0);
    });
};
