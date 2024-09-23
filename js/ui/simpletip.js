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
     * or setting optional classname `simpletip-tc` on the element without data attribute to simply using text contents
     * ```<a href="#" class="simpletip simpletip-tc">Mouse over me</a>```
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
     * The tooltip can also be placed to the "left", "right", or can detect the direction using "start" and "end".
     *
     * C) Manually add extra top/bottom offset by passing `data-simpletipoffset="10"`
     * Example:
     * ```<a href="#" data-simpletip="Hey! +/-20px offset for this tip." data-simpletipoffset="20">Mouse over me</a>```
     *
     * D) Add any custom styling to tooltip by adding style class e.g. .medium-width for max-width: 220px;,
     * .center-align for text-align: center;
     * Example:
     * ```
     *    <a href="#" data-simpletip="Hey! custom style." data-simpletip-class="medium-width center-align">
     *        Mouse over me
     *    </a>
     * ```
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
        '<i class="sprite-fm-mono icon-tooltip-arrow tooltip-arrow"></i>' +
        '<span></span>' +
        '</div>'
    );

    const $breadcrumbs = $(
        '<div class="fm-breadcrumbs-wrapper info">' +
            '<div class="crumb-overflow-link dropdown">' +
                '<a class="breadcrumb-dropdown-link info-dlg">' +
                    '<i class="menu-icon sprite-fm-mono icon-options icon24"></i>' +
                '</a>' +
                '<i class="sprite-fm-mono icon-arrow-right icon16"></i>' +
            '</div>' +
            '<div class="fm-breadcrumbs-block"></div>' +
            '<div class="breadcrumb-dropdown"></div>' +
        '</div>'
    );

    var $currentNode;
    var $currentTriggerer;
    var SIMPLETIP_UPDATED_EVENT = 'simpletipUpdated.internal';
    var SIMPLETIP_CLOSE_EVENT = 'simpletipClose.internal';

    var sanitize = function(contents) {
        return escapeHTML(contents).replace(/\[BR\]/g, '<br>')
            .replace(/\[I class=&quot;([\w- ]*)&quot;]/g, `<i class="$1">`)
            .replace(/\[I]/g, '<i>').replace(/\[\/I]/g, '</i>')
            .replace(/\[B\]/g, '<b>').replace(/\[\/B\]/g, '</b>')
            .replace(/\[U]/g, '<u>').replace(/\[\/U]/g, '</u>')
            .replace(/\[G]/g, '<span class="gray-text">')
            .replace(/\[\/G]/g, '</span>')
            .replace(/\[A]/g, '<a>')
            .replace(/\[\/A]/g, '</a>');
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

    const calculateOffset = (info, $this) => {
        let topOffset = 0;
        let leftOffset = 0;
        let offset = 7;      // 7px === height of arrow glyph
        if ($this.attr('data-simpletipoffset')) {
            offset = parseInt($this.attr('data-simpletipoffset'), 10) + 7;
        }

        if (info.vertical === 'top') {
            topOffset = offset;
        }
        else if (info.vertical === 'bottom') {
            topOffset = -offset;
        }
        else if (info.horizontal === 'left') {
            leftOffset = offset;
        }
        else if (info.horizontal === 'right') {
            leftOffset = -offset;
        }

        return { leftOffset, topOffset };
    };


    /**
     * Converts relative start/end positioning to absolute left/right positioning
     *
     * @param {string} tipPosition the specified position of the tooltip
     * @returns {string} the absolute direction of the tooltip
     */
    const getTipLRPosition = tipPosition => {
        if ($('body').hasClass('rtl')) {
            if (tipPosition === 'start') {
                tipPosition = 'right';
            }
            else if (tipPosition === 'end') {
                tipPosition = 'left';
            }
        }
        else if (tipPosition === 'start') {
            tipPosition = 'left';
        }
        else if (tipPosition === 'end') {
            tipPosition = 'right';
        }

        return tipPosition;
    };

    $(document.body).rebind('mouseenter.simpletip', '.simpletip', function() {
        var $this = $(this);
        if ($currentNode) {
            unmount();
        }

        if ($this.is('.deactivated') || $this.parent().is('.deactivated')) {
            return false;
        }

        var contents = $this.hasClass('simpletip-tc') ? $this.text() : $this.attr('data-simpletip');
        const isBreadcrumb = $this.hasClass('simpletip-breadcrumb');
        if (contents || isBreadcrumb) {
            const $node = $template.clone();
            const $textContainer = $('span', $node);
            $textContainer.safeHTML(sanitize(contents));
            // Handle the tooltip's text content updates based on the current control state,
            // e.g. "Mute" -> "Unmute"
            $this.rebind(SIMPLETIP_UPDATED_EVENT, () => {
                $textContainer.safeHTML(
                    sanitize($this.attr('data-simpletip'))
                );
            });
            $this.rebind(SIMPLETIP_CLOSE_EVENT, () => {
                unmount();
            });
            $('body').append($node);

            if (isBreadcrumb) {
                $node.addClass('breadcrumb-tip theme-dark-forced');
                $textContainer.replaceWith($breadcrumbs);
                M.renderPathBreadcrumbs($this.parent().parent().get(0).id, false, true);
            }

            $currentNode = $node;
            $currentTriggerer = $this;
            let wrapper = $this.attr('data-simpletipwrapper') || '';
            if (wrapper) {
                wrapper += ",";
            }

            const customClass = $this.attr('data-simpletip-class');
            if (customClass) {
                $currentNode.addClass(customClass);
            }

            /*
             * There are four main positions of the tooltip:
             * A) The default position is below the hovered el and horizontally centered.
             *      The tooltip may be flipped vertically or moved along the horizontal axis
             *      if there is not enough space in container
             * B) "top" data-simpletipposition value places the tooltip above the hovered el.
             *      The tooltip may be flipped vertically back or moved along the horizontal axis
             *      if there is not enough space in container
             * C) "left" data-simpletipposition value places the tooltip to the left of the target.
             *      The tooltip is centered  vertically and may be flipped horizontally
             *      if there is not enough space in container
             * D) "right" data-simpletipposition value places the tooltip to the right of the target.
             *      The tooltip is centered  vertically and may be flipped horizontally
             *      if there is not enough space in container
            */

            /* Default bottom position (case A) */
            let my = 'center top';
            let at = 'center bottom';
            let arrowRotation = 180;
            const tipPosition = getTipLRPosition($this.attr('data-simpletipposition'));

            switch (tipPosition) {
                /* Top position (case B) */
                case 'top':
                    my = 'center bottom';
                    at = 'center top';
                    break;
                /* Top position (case C) */
                case 'left':
                    my = 'right center';
                    at = 'left center';
                    break;
                /* Top position (case D) */
                case 'right':
                    my = 'left center';
                    at = 'right center';
                    break;
            }

            $node.position({
                of: $this,
                my: my,
                at: at,
                collision: 'flipfit',
                within: $this.hasClass('simpletip-breadcrumb') ? $this.parents('body').first()
                    : $this.parents(wrapper ? `${wrapper} body` : '.ps, body').first(),
                using: function(obj, info) {

                    /*
                     * Defines the positions on the tooltip Arrow and target.
                     * Delault position on the tooltip Arrow is left top.
                     * Delault position on the target is right bottom.
                     * We don't use centering to avoid special conditions after flipping.
                    */
                    let myH = 'left';
                    let myV = 'top';
                    let atH = 'right';
                    let atV = 'bottom';

                    /*
                     * The condition when tooltip is placed to the left of the target (case C),
                     * For condition C to be met, the tooltip must be vertically centered.
                     * Otherwise, it will mean that we have case A or B, and the tooltip
                     * just moves along the horizontal ("arrowRotation" val will be changed then).
                     * The position on the arrow is right and the position on target is left.
                    */
                    if (info.horizontal === 'right') {
                        myH = 'right';
                        atH = 'left';
                        arrowRotation = 270;
                    }
                    // Case D, or case A or B, and the tooltip  just moves along the horizontal.
                    else if (info.horizontal === 'left') {
                        myH = 'left';
                        atH = 'right';
                        arrowRotation = 90;
                    }

                    // Case A, tooltip is placed below the target. "arrowRotation" value is replaced.
                    if (info.vertical === 'top') {
                        myV = 'top';
                        atV = 'bottom';
                        arrowRotation = 180;
                    }
                    // Case B, tooltip is placed above the target. "arrowRotation" value is replaced.
                    else if (info.vertical === 'bottom') {
                        myV = 'bottom';
                        atV = 'top';
                        arrowRotation = 0;
                    }
                    // Case C or D, tooltip is placed to the left/right and vertically centered.
                    else {
                        myV = 'center';
                        atV = 'center';
                    }

                    // Set new positions on the tooltip Arrow and target.
                    my = myH + ' ' + myV;
                    at = atH + ' ' + atV;

                    this.classList.add('visible');

                    const { leftOffset, topOffset} = calculateOffset(info, $this);

                    $(this).css({
                        left: `${obj.left + leftOffset}px`,
                        top: `${obj.top + topOffset}px`
                    });
                }
            });

            // Calculate Arrow position
            var $tooltipArrow = $('.tooltip-arrow', $node);

            $tooltipArrow.position({
                of: $this,
                my: my,
                at: at,
                collision: 'none',
                using: function(obj, info) {
                    let { top, left } = obj;

                    /*
                     * If Case A or B (ie tooltip is placed to the top/bottom), then
                     * we need to take into account the horizontal centering of the arrow
                     * in relation to the target, depending on the width of the arrow
                    */
                    const horizontalOffset = info.vertical === 'middle' ? 0 : $this[0].offsetWidth / 2;

                    // Horizontal positioning of the arrow in relation to the target
                    if (info.horizontal === 'left') {
                        left -= $tooltipArrow[0].offsetWidth / 2 + horizontalOffset;
                    }
                    else if (info.horizontal === 'right') {
                        left += $tooltipArrow[0].offsetWidth / 2 + horizontalOffset;
                    }

                    // Vertical positioning of the arrow in relation to the target
                    if (info.vertical === 'bottom') {
                        top += $tooltipArrow[0].offsetHeight / 2;
                    }
                    else if (info.vertical === 'top') {
                        top -= $tooltipArrow[0].offsetHeight / 2;
                    }

                    // Add special offset if set in options
                    const { leftOffset, topOffset} = calculateOffset(info, $this);

                    $(this).css({
                        left: `${left + leftOffset}px`,
                        top: `${top + topOffset}px`,
                        transform: `rotate(${arrowRotation}deg)`
                    });
                }
            });
        }
    });

    $(document.body).rebind('mouseover.simpletip touchmove.simpletip', function(e) {
        if ($currentNode && !e.target.classList.contains('simpletip')
            && !$(e.target).closest('.simpletip, .simpletip-tooltip').length > 0
            && !e.target.classList.contains('tooltip-arrow')
            && !e.target.classList.contains('simpletip-tooltip')
            && !$currentTriggerer.hasClass('manual-tip')) {
            unmount();
        }
    });
})(jQuery);
