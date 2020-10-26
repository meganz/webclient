(function($) {
    'use strict';

    /**
     * Super simple, performance-wise and minimal tooltip utility.
     * This "tooltip tool" saves on DOM nodes and event handlers, since it:
     * 1) Uses delegates, so 1 event handler for unlimited amount of dynamically added tooltips in the UI. #performance
     * 2) Does not require extra DOM elements (e.g. total # of DOM elements < low = performance improvement)
     * 3) Its clever enough to reposition tooltips properly, w/o adding extra dependencies (except for jQuery UI, which
     * we already have), e.g. better then CSS :hover + .tooltip { display: block; }
     * 4) It supports dynamic content updates, based on the current state of the control -- for example, when
     * interacting with given control, the tooltip content may automatically re-render, e.g. `Mute` -> `Unmute`.
     * 5) Its minimal. < 200 lines of code.
     *
     * Note: Uses jQuery UI's position() to position the tooltip on top or bottom, if out of viewport. By default -
     * would, try to position below the target element.
     */

    /**
     * How to use:
     * 1) Add "simpletip" class name to any element in the DOM
     * 2) To set the content of the tooltip, pass an attribute w/ the text named `data-simpletip`
     * Example:
     * ```<a href="#" class="simpletip" data-simpletip="Hello world!">Mouse over me</a>```
     *
     * Optionally, you can control:
     * A) The wrapper in which the tooltip should try to fit in (and position on top/bottom, depending on whether there
     * is enough space) by passing a selector that matches a parent of the element in attribute named
     * `data-simpletipwrapper`
     * Example:
     * ```<a href="#" class="simpletip" data-simpletip="Hey!" data-simpletipwrapper="#call-block">Mouse over me</a>```
     *
     * B) Change the default position to be "above" (top) of the element, instead of bottom/below by passing attribute
     * `data-simpletipposition="top"`
     * Example:
     * ```<a href="#" class="simpletip" data-simpletip="Hey! Show on top, if I fit"
     *      data-simpletipposition="top">Mouse over me</a>```
     *
     * C) Manually add extra top/bottom offset by passing `data-simpletipoffset="10"`
     * Example:
     * ```<a href="#" data-simpletip="Hey! +/-20px offset for this tip." data-simpletipoffset="20">Mouse over me</a>```
     *
     * D) Add any custom styling to tooltip by `data-simpletip-style='{"max-width":"200px"}'`
     * Example:
     * ```<a href="#" data-simpletip="Hey! custom style." data-simpletip-style='{"width":"200px"}'>Mouse over me</a>```
     *
     * E) Add any custom class to tooltip by `data-simpletip-class='custom-class'`
     * Example:
     * ```<a href="#" data-simpletip="Hey! custom class" data-simpletip-class='small-tip'>Mouse over me</a>```
     *
     * How to trigger content update:
     * 1) Create new instance of the simpletip that contains conditional `data-simpletip` attribute.
     * ```<a href="#" data-simpletip={condition ? 'Mute' : 'Unmute' }></a>```
     * 2) On state update, invoke `simpletipUpdated` event trigger on the `.simpletip` element.
     * ```$('.simpletip').trigger('simpletipUpdated');```
     *
     * How to trigger manual unmount:
     * On state update, invoke `simpletipClose` event trigger on the `.simpletip` element.
     * ```$('.simpletip').trigger('simpletipClose');```
     */

    var $template = $(
        '<div class="dark-direct-tooltip simpletip-tooltip">' +
        '<i class="small-icon icons-sprite tooltip-arrow"></i>' +
        '<span></span>' +
        '</div>'
    );

    var $currentNode;
    var $currentTriggerer;
    var SIMPLETIP_UPDATED_EVENT = 'simpletipUpdated.internal';
    var SIMPLETIP_CLOSE_EVENT = 'simpletipClose.internal';

    var sanitize = function(contents) {
        return escapeHTML(contents).replace(/\[BR\]/g, '<br>')
            .replace(/\[I\]/g, '<i>').replace(/\[\/I\]/g, '</i>')
            .replace(/\[B\]/g, '<b>').replace(/\[\/B\]/g, '</b>')
            .replace(/\[U]/g, '<u>').replace(/\[\/U]/g, '</u>')
            .replace(/\[G]/g, '<span class="gray-text">')
            .replace(/\[\/G]/g, '</span>');
    };

    var unmount = function() {
        if ($currentNode) {
            $currentNode.remove();
            $currentNode = null;
            $currentTriggerer.unbind(SIMPLETIP_UPDATED_EVENT);
            $currentTriggerer.unbind(SIMPLETIP_CLOSE_EVENT);
            $currentTriggerer = null;
        }
    };

    $(document.body).rebind('mouseenter.simpletip', '.simpletip', function () {
        var $this = $(this);
        if ($currentNode) {
            unmount();
        }

        if ($this.is('.deactivated') || $this.parent().is('.deactivated')) {
            return false;
        }

        var contents = $this.data('simpletip');
        if (contents) {
            var $node = $template.clone();
            var $textContainer = $('span', $node);
            $textContainer.safeHTML(sanitize(contents));
            // Handle the tooltip's text content updates based on the current control state,
            // e.g. "Mute" -> "Unmute"
            $this.rebind(SIMPLETIP_UPDATED_EVENT, function() {
                $textContainer.safeHTML(
                    sanitize($this.data('simpletip'))
                );
            });
            $this.rebind(SIMPLETIP_CLOSE_EVENT, function() {
                unmount();
            });
            $('body').append($node);

            $currentNode = $node;
            $currentTriggerer = $this;
            var wrapper = $this.data('simpletipwrapper') || "";
            if (wrapper) {
                wrapper += ",";
            }

            var customStyle = $this.data('simpletip-style');
            if (customStyle) {
                $currentNode.css(customStyle);
            }

            var customClass = $this.data('simpletip-class');
            if (customClass) {
                $currentNode.addClass(customClass);
            }

            var my = "center top";
            var at = "center bottom";
            if ($this.data('simpletipposition') === "top") {
                my = "center bottom";
                at = "center top";
            }
            $node.position({
                of: $this,
                my: my,
                at: at,
                collision: "flipfit",
                within: $this.parents('.ps-container,' + wrapper + 'body').first(),
                using: function(obj, info) {
                    var vertClass = info.vertical === "top" ? "b" : "t";
                    var horizClass = info.horizontal === "left" ? "r" : "l";
                    this.classList.remove(
                        "simpletip-v-t", "simpletip-v-b", "simpletip-h-l", "simpletip-h-r"
                    );
                    this.classList.add("simpletip-h-" + horizClass, "simpletip-v-" + vertClass, "visible");

                    var topOffset = 0;
                    if (vertClass === "t") {
                        topOffset = -6;
                    }
                    if ($this.data('simpletipoffset')) {
                        var offset = parseInt($this.data('simpletipoffset'), 10);
                        if (vertClass === "t") {
                            topOffset += offset * -1;
                        }
                        else {
                            topOffset += offset;
                        }
                    }

                    $(this).css({
                        left: obj.left + 'px',
                        top: obj.top + topOffset + 'px'
                    });
                }
            });

            // Calculate Arrow position
            var $tooltipArrow = $node.find('.tooltip-arrow');

            $tooltipArrow.position({
                of: $this,
                my: my,
                at: at,
                collision: "none",
                using: function(obj) {
                        $(this).css({
                            left: obj.left + 'px'
                        });
                    }
            });
        }
    });
    $(document.body).rebind('mouseover.simpletip, touchmove.simpletip', function(e) {
        if ($currentNode && !e.target.classList.contains('simpletip') && !$(e.target).parents('.simpletip').length > 0
            && !e.target.classList.contains('tooltip-arrow')) {
            unmount();
        }
    });
})(jQuery);
