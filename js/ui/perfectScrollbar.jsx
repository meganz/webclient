var React = require("react");
var ReactDOM = require("react-dom");

var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;
var x = 0;
/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */
var PerfectScrollbar = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    isUserScroll: true,
    scrollEventIncId: 0,
    getDefaultProps: function() {
        return {
            className: "perfectScrollbarContainer",
            requiresUpdateOnResize: true
        };
    },
    doProgramaticScroll: function(newPos, forced, isX) {
        var self = this;
        var $elem = $(ReactDOM.findDOMNode(self));
        var animFrameInner = false;

        var prop = !isX ? 'scrollTop' : 'scrollLeft';

        if (!forced && $elem[0] && $elem[0][prop] === newPos) {
            return;
        }

        var idx = self.scrollEventIncId++;

        $elem.rebind('scroll.progscroll' + idx, (function (idx, e) {
            if (animFrameInner) {
                cancelAnimationFrame(animFrameInner);
                animFrameInner = false;
            }
            $elem.off('scroll.progscroll' + idx);
            self.isUserScroll = true;
        }).bind(this, idx));

        // do the actual scroll
        self.isUserScroll = false;
        $elem[0][prop] = newPos;
        Ps.update($elem[0]);

        // reset the flag on next re-paint of the browser
        animFrameInner = requestAnimationFrame(function (idx) {
            animFrameInner = false;
            self.isUserScroll = true;
            $elem.off('scroll.progscroll' + idx);
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
        this.attachAnimationEvents();
    },
    componentWillUnmount: function() {
        var $elem = $(ReactDOM.findDOMNode(this));
        $elem.off('ps-scroll-y.ps' + this.getUniqueId());

        var ns = '.ps' + this.getUniqueId();
        $elem.parents('.have-animation')
            .unbind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);

    },
    attachAnimationEvents: function() {
        var self = this;
        if (!self.isMounted()) {
            return;
        }

        var $haveAnimationNode = self._haveAnimNode;

        if (!$haveAnimationNode) {
            var $node = $(self.findDOMNode());
            var ns = '.ps' + self.getUniqueId();
            $haveAnimationNode = self._haveAnimNode = $node.parents('.have-animation');
        }

        $haveAnimationNode.rebind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns,
            function(e) {
                self.safeForceUpdate(true);
                if (self.props.onAnimationEnd) {
                    self.props.onAnimationEnd();
                }
            });
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
        self.doProgramaticScroll($elem[0].scrollTop, true);

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
        this.doProgramaticScroll(9999999);

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
            this.doProgramaticScroll(targetPx);

            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToPercentX: function(posPerc, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        var targetPx = this.getScrollWidth()/100 * posPerc;
        if ($elem[0].scrollLeft !== targetPx) {
            this.doProgramaticScroll(targetPx, false, true);
            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToY: function(posY, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        if ($elem[0].scrollTop !== posY) {
            this.doProgramaticScroll(posY);

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

        this.doProgramaticScroll(element.offsetTop);

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
        this.attachAnimationEvents();
    },
    render: function () {
        var self = this;
        return (
            <div {...this.props} onResize={this.onResize} onAnimationEnd={function() {
                self.onResize();
                if (this.props.triggerGlobalResize) {
                    $.tresizer();
                }
            }}>
                {this.props.children}
            </div>
        );
    }
});

module.exports = {
    PerfectScrollbar
};
