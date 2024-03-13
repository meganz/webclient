/*!
 * jQuery Mousewheel 3.1.15
 * Copyright OpenJS Foundation and other contributors
 */

( function( $ ) {

    let lowestDelta;

    if ( $.event.fixHooks ) {
        const toFix = [ "wheel", "mousewheel" ];
        for ( let i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[ --i ] ] = $.event.mouseHooks;
        }
    }

    const psv = { passive: true }, special = $.event.special.mousewheel = {
        version: "3.1.15",

        setup() {
            this.addEventListener( "wheel", handler, psv );

            // Store the line height and page height for this particular element
            $.data( this, "mousewheel-line-height", special.getLineHeight( this ) );
            $.data( this, "mousewheel-page-height", special.getPageHeight( this ) );
        },

        teardown() {
            this.removeEventListener( "wheel", handler, psv );

            // Clean up the data we added to the element
            $.removeData( this, "mousewheel-line-height" );
            $.removeData( this, "mousewheel-page-height" );
        },

        getLineHeight( elem ) {
            let $elem = $( elem ),
                $parent = $elem[ "offsetParent" in $.fn ? "offsetParent" : "parent" ]();
            if ( !$parent.length ) {
                $parent = $( "body" );
            }
            return parseInt( $parent.css( "fontSize" ), 10 ) ||
                parseInt( $elem.css( "fontSize" ), 10 ) || 16;
        },

        getPageHeight( elem ) {
            return $( elem ).height();
        },

        settings: {
            normalizeOffset: false  // calls getBoundingClientRect for each event
        }
    };

    $.fn.extend( {
        mousewheel( fn ) {
            return fn ? this.on( "mousewheel", fn ) : this.trigger( "mousewheel" );
        },

        unmousewheel( fn ) {
            return this.off( "mousewheel", fn );
        }
    } );

    function handler( event, ...args ) {
        const orgEvent = event || window.event;
        let delta = 0,
            deltaX = 0,
            deltaY = 0,
            absDelta = 0;
        event = $.event.fix( orgEvent );
        event.type = "mousewheel";

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ( "deltaY" in orgEvent ) {
            deltaY = orgEvent.deltaY * -1;
            delta = deltaY;
        }
        if ( "deltaX" in orgEvent ) {
            deltaX = orgEvent.deltaX;
            if ( deltaY === 0 ) {
                delta = deltaX * -1;
            }
        }

        // No change actually happened, no reason to go any further
        if ( deltaY === 0 && deltaX === 0 ) {
            return;
        }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if ( orgEvent.deltaMode === 1 ) {
            const lineHeight = $.data( this, "mousewheel-line-height" );
            delta *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if ( orgEvent.deltaMode === 2 ) {
            const pageHeight = $.data( this, "mousewheel-page-height" );
            delta *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max( Math.abs( deltaY ), Math.abs( deltaX ) );

        if ( !lowestDelta || absDelta < lowestDelta ) {
            lowestDelta = absDelta;
        }

        // Get a whole, normalized value for the deltas
        delta = Math[ delta >= 1 ? "floor" : "ceil" ]( delta / lowestDelta );
        deltaX = Math[ deltaX >= 1 ? "floor" : "ceil" ]( deltaX / lowestDelta );
        deltaY = Math[ deltaY >= 1 ? "floor" : "ceil" ]( deltaY / lowestDelta );

        // Normalise offsetX and offsetY properties
        if ( special.settings.normalizeOffset ) {
            const boundingRect = this.getBoundingClientRect();
            event.offsetX = event.clientX - boundingRect.left;
            event.offsetY = event.clientY - boundingRect.top;
        }

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;

        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift( event, delta, deltaX, deltaY );

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        delay( "jqw:null-delta", nullLowestDelta, 200 );

        return ( $.event.dispatch || $.event.handle ).apply( this, args );
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

} )( jQuery );
