var React = require("react");
var ReactDOM = require("react-dom");

var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var x = 0;
/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */
var PerfectScrollbar = React.createClass({
    mixins: [MegaRenderMixin],
    isUserScroll: true,
    scrollEventIncId: 0,
    getDefaultProps: function() {
        return {
            className: "perfectScrollbarContainer",
            requiresUpdateOnResize: true
        };
    },
    doProgramaticScrollY: function(newPosY, forced) {
        var self = this;
        var $elem = $(ReactDOM.findDOMNode(self));
        var animFrameInner = false;

        if (!forced && $elem[0] && $elem[0].scrollTop === newPosY) {
            return;
        }

        var idx = self.scrollEventIncId++;

        $elem.rebind('scroll.progscroll' + idx, (function (idx, e) {
            if (animFrameInner) {
                cancelAnimationFrame(animFrameInner);
                animFrameInner = false;
            }
            $elem.unbind('scroll.progscroll' + idx);
            self.isUserScroll = true;
        }).bind(this, idx));

        // do the actual scroll
        self.isUserScroll = false;
        $elem[0].scrollTop = newPosY;
        Ps.update($elem[0]);

        // reset the flag on next re-paint of the browser
        animFrameInner = requestAnimationFrame(function (idx) {
            animFrameInner = false;
            self.isUserScroll = true;
            $elem.unbind('scroll.progscroll' + idx);
        }.bind(this, idx));
    },
    componentDidMount: function() {
        var self = this;
        var $elem = $(ReactDOM.findDOMNode(self));

        $elem.height('100%');


        var options = $.extend({}, {
            'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection']
        }, self.props.options);

        Ps.initialize($elem[0], options);


        if (self.props.onFirstInit) {
            self.props.onFirstInit(self, $elem);
        }

        $elem.rebind('ps-scroll-y.ps' + self.getUniqueId(), function(e) {
            if ($elem.attr('data-scroll-disabled') === "true") {
                e.stopPropagation();
                e.preventDefault();
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                return false;
            }

            if (self.props.onUserScroll && self.isUserScroll === true && $elem.is(e.target)) {
                self.props.onUserScroll(
                    self,
                    $elem,
                    e
                );
            }
        });

        $elem.rebind('disable-scroll.ps' + self.getUniqueId(), function(e) {
            Ps.destroy($elem[0]);
        });
        $elem.rebind('enable-scroll.ps' + self.getUniqueId(), function(e) {
            Ps.initialize($elem[0], options);
        });
        $elem.rebind('forceResize.ps'+self.getUniqueId(), function(e, forced, scrollPositionYPerc, scrollToElement) {
            self.onResize(forced, scrollPositionYPerc, scrollToElement);
        });
        self.onResize();
    },
    componentWillUnmount: function() {
        var $elem = $(ReactDOM.findDOMNode(this));
        $elem.unbind('ps-scroll-y.ps' + this.getUniqueId());
    },
    eventuallyReinitialise: function(forced, scrollPositionYPerc, scrollToElement) {
        var self = this;

        if (!self.isMounted()) {
            return;
        }
        if (!self.isComponentEventuallyVisible()) {
            return;
        }

        var $elem = $(self.findDOMNode());

        if (forced || self._currHeight != self.getContentHeight()) {
            self._currHeight = self.getContentHeight();
            self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
        }
    },
    _doReinit: function(scrollPositionYPerc, scrollToElement, forced, $elem) {
        var self = this;

        if (!self.isMounted()) {
            return;
        }
        if (!self.isComponentEventuallyVisible()) {
            return;
        }

        // triggers an
        self.doProgramaticScrollY($elem[0].scrollTop, true);

        var manualReinitialiseControl = false;
        if (self.props.onReinitialise) {
            manualReinitialiseControl = self.props.onReinitialise(
                self,
                $elem,
                forced,
                scrollPositionYPerc,
                scrollToElement
            );
        }

        if (manualReinitialiseControl === false) {
            if (scrollPositionYPerc) {
                if (scrollPositionYPerc === -1) {
                    self.scrollToBottom(true);
                }
                else {
                    self.scrollToPercentY(scrollPositionYPerc, true);
                }
            }
            else if (scrollToElement) {
                self.scrollToElement(scrollToElement, true);
            }
        }
    },
    scrollToBottom: function(skipReinitialised) {
        this.doProgramaticScrollY(9999999);

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    },
    reinitialise: function(skipReinitialised) {
        var $elem = $(this.findDOMNode());
        this.isUserScroll = false;
        Ps.update($elem[0]);
        this.isUserScroll = true;

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    },
    getScrollHeight: function() {
        var $elem = $(this.findDOMNode());
        var outerHeightContainer = $elem.children(":first").outerHeight();
        var outerHeightScrollable = $elem.outerHeight();

        var res = outerHeightContainer - outerHeightScrollable;

        if (res <= 0) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollHeight ? this._lastKnownScrollHeight : 0;
        }
        this._lastKnownScrollHeight = res;
        return res;
    },
    getScrollWidth: function() {
        var $elem = $(this.findDOMNode());
        var outerWidthContainer = $elem.children(":first").outerWidth();
        var outerWidthScrollable = $elem.outerWidth();

        var res = outerWidthContainer - outerWidthScrollable;

        if (res <= 0) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollWidth ? this._lastKnownScrollWidth : 0;
        }
        this._lastKnownScrollWidth = res;
        return res;
    },
    getContentHeight: function() {
        var $elem = $(this.findDOMNode());
        return $elem.children(":first").outerHeight();
    },
    isAtTop: function() {
        return this.findDOMNode().scrollTop === 0;
    },
    isAtBottom: function() {
        return this.findDOMNode().scrollTop === this.getScrollHeight();
    },
    isCloseToBottom: function(minPixelsOff) {
        return (this.getScrollHeight() - this.getScrollPositionY()) <= minPixelsOff;
    },
    getScrolledPercentY: function() {
        return 100/this.getScrollHeight() * this.findDOMNode().scrollTop;
    },
    getScrollPositionY: function() {
        return this.findDOMNode().scrollTop;
    },
    scrollToPercentY: function(posPerc, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        var targetPx = this.getScrollHeight()/100 * posPerc;
        if ($elem[0].scrollTop !== targetPx) {
            this.doProgramaticScrollY(targetPx);

            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToPercentX: function(posPerc, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        var targetPx = this.getScrollWidth()/100 * posPerc;
        if ($elem[0].scrollLeft !== targetPx) {
            this.doProgramaticScrollY(targetPx);
            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToY: function(posY, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        if ($elem[0].scrollTop !== posY) {
            this.doProgramaticScrollY(posY);

            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToElement: function(element, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        if (!element || !element.offsetTop) {
            return;
        }

        this.doProgramaticScrollY(element.offsetTop);

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    },
    disable: function() {
        if (this.isMounted()) {
            var $elem = $(this.findDOMNode());
            $elem.attr('data-scroll-disabled', true);
            $elem.addClass('ps-disabled');
            Ps.disable($elem[0]);
        }
    },
    enable: function() {
        if (this.isMounted()) {
            var $elem = $(this.findDOMNode());
            $elem.removeAttr('data-scroll-disabled');
            $elem.removeClass('ps-disabled');
            Ps.enable($elem[0]);
        }
    },
    reinitialised: function(forced) {
        if (this.props.onReinitialise) {
            this.props.onReinitialise(
                this,
                $(this.findDOMNode()),
                forced ? forced : false
            )
        }
    },
    onResize: function(forced, scrollPositionYPerc, scrollToElement) {
        if (forced && forced.originalEvent) {
            forced = true;
            scrollPositionYPerc = undefined;
        }


        this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
    },
    componentDidUpdate: function() {
        if (this.props.requiresUpdateOnResize) {
            this.onResize(true);
        }
    },
    render: function () {
        return (
            <div {...this.props} onResize={this.onResize}>
                {this.props.children}
            </div>
        );
    }
});

module.exports = {
    PerfectScrollbar
};
