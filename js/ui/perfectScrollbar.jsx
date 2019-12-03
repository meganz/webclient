var React = require("react");
var ReactDOM = require("react-dom");

import {MegaRenderMixin} from "../stores/mixins.js";
var x = 0;
/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */
export class PerfectScrollbar extends MegaRenderMixin {
    static isUserScroll = true;
    static scrollEventIncId = 0;
    static defaultProps = {
        className: "perfectScrollbarContainer",
        requiresUpdateOnResize: true
    };
    static MAX_BOTTOM_POS = 9999999;

    get$Node() {
        if (!this.$Node) {
            this.$Node = $(this.findDOMNode());
        }
        return this.$Node;
    }
    doProgramaticScroll(newPos, forced, isX) {
        if (!this.isMounted()) {
            return;
        }
        var self = this;
        var $elem = self.get$Node();
        var animFrameInner = false;

        var prop = !isX ? 'scrollTop' : 'scrollLeft';




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

        return true;
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        var $elem = self.get$Node();

        $elem.height('100%');


        var options = $.extend({}, {
            'handlers': ['click-rail', 'drag-scrollbar', 'keyboard', 'wheel', 'touch', 'selection'],
            'minScrollbarLength': 20
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
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var $elem = this.get$Node();
        $elem.off('ps-scroll-y.ps' + this.getUniqueId());

        var ns = '.ps' + this.getUniqueId();
        $elem.parents('.have-animation')
            .unbind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns);

    }
    attachAnimationEvents() {
        var self = this;
        if (!self.isMounted()) {
            return;
        }

        // var $haveAnimationNode = self._haveAnimNode;
        //
        // if (!$haveAnimationNode) {
        //     var $node = self.get$Node();
        //     var ns = '.ps' + self.getUniqueId();
        //     $haveAnimationNode = self._haveAnimNode = $node.parents('.have-animation');
        // }

        // $haveAnimationNode.rebind('animationend' + ns +' webkitAnimationEnd' + ns + ' oAnimationEnd' + ns,
        //     function(e) {
        //         self.safeForceUpdate(true);
        //         if (self.props.onAnimationEnd) {
        //             self.props.onAnimationEnd();
        //         }
        //     });
    }
    eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
        var self = this;

        if (!self.isMounted()) {
            return;
        }
        if (!self.isComponentEventuallyVisible()) {
            return;
        }

        var $elem = self.get$Node();

        if (forced || self._currHeight != self.getContentHeight()) {
            self._currHeight = self.getContentHeight();
            self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
        }
    }
    _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
        var self = this;

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
    }
    scrollToBottom(skipReinitialised) {
        if (!this.doProgramaticScroll(PerfectScrollbar.MAX_BOTTOM_POS)) {
            return false;
        }

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    }
    reinitialise(skipReinitialised) {
        var $elem = this.get$Node();
        this.isUserScroll = false;
        Ps.update($elem[0]);
        this.isUserScroll = true;

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    }
    getScrollHeight() {
        var $elem = this.get$Node();
        var outerHeightContainer = $($elem[0].children[0]).outerHeight();
        var outerHeightScrollable = $elem.outerHeight();

        var res = outerHeightContainer - outerHeightScrollable;

        if (res <= 0) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollHeight ? this._lastKnownScrollHeight : 0;
        }
        this._lastKnownScrollHeight = res;
        return res;
    }
    getScrollWidth() {
        var $elem = this.get$Node();
        var outerWidthContainer = $($elem[0].children[0]).outerWidth();
        var outerWidthScrollable = $elem.outerWidth();

        var res = outerWidthContainer - outerWidthScrollable;

        if (res <= 0) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollWidth ? this._lastKnownScrollWidth : 0;
        }
        this._lastKnownScrollWidth = res;
        return res;
    }
    getContentHeight() {
        var $elem = this.get$Node();
        return $elem[0].children[0].offsetHeight;
    }
    setCssContentHeight(h) {
        var $elem = this.get$Node();
        return $elem.css('height', h);
    }
    isAtTop() {
        return this.findDOMNode().scrollTop === 0;
    }
    isAtBottom() {
        return this.findDOMNode().scrollTop === this.getScrollHeight();
    }
    isCloseToBottom(minPixelsOff) {
        return (this.getScrollHeight() - this.getScrollPositionY()) <= minPixelsOff;
    }
    getScrolledPercentY() {
        return 100/this.getScrollHeight() * this.findDOMNode().scrollTop;
    }
    getScrollPositionY() {
        return this.findDOMNode().scrollTop;
    }
    scrollToPercentY(posPerc, skipReinitialised) {
        var $elem = this.get$Node();
        var targetPx = this.getScrollHeight()/100 * posPerc;
        if ($elem[0].scrollTop !== targetPx) {
            if (this.doProgramaticScroll(targetPx)) {
                if (!skipReinitialised) {
                    this.reinitialised(true);
                }
            }
        }
    }
    scrollToPercentX(posPerc, skipReinitialised) {
        var $elem = this.get$Node();
        var targetPx = this.getScrollWidth()/100 * posPerc;
        if ($elem[0].scrollLeft !== targetPx) {
            if (this.doProgramaticScroll(targetPx, false, true)) {
                if (!skipReinitialised) {
                    this.reinitialised(true);
                }
            }
        }
    }
    scrollToY(posY, skipReinitialised) {
        var $elem = this.get$Node();
        if ($elem[0].scrollTop !== posY) {
            if (this.doProgramaticScroll(posY)) {
                if (!skipReinitialised) {
                    this.reinitialised(true);
                }
            }
        }
    }
    scrollToElement(element, skipReinitialised) {
        var $elem = this.get$Node();
        if (!element || !element.offsetParent) {
            return;
        }

        if (this.doProgramaticScroll(element.offsetTop)) {
            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    }
    disable() {
        if (this.isMounted()) {
            var $elem = this.get$Node();
            $elem.attr('data-scroll-disabled', true);
            $elem.addClass('ps-disabled');
            Ps.disable($elem[0]);
        }
    }
    enable() {
        if (this.isMounted()) {
            var $elem = this.get$Node();
            $elem.removeAttr('data-scroll-disabled');
            $elem.removeClass('ps-disabled');
            Ps.enable($elem[0]);
        }
    }
    reinitialised(forced) {
        if (this.props.onReinitialise) {
            this.props.onReinitialise(
                this,
                this.get$Node(),
                forced ? forced : false
            )
        }
    }
    onResize(forced, scrollPositionYPerc, scrollToElement) {
        if (forced && forced.originalEvent) {
            forced = true;
            scrollPositionYPerc = undefined;
        }

        this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
    }
    inViewport(domNode) {
        return verge.inViewport(domNode);
    }
    componentDidUpdate() {
        if (this.props.requiresUpdateOnResize) {
            this.onResize(true);
        }
        this.attachAnimationEvents();
    }
    render() {
        var self = this;
        return (
            <div style={this.props.style} className={this.props.className}>
                {self.props.children}
            </div>
        );
    }
};
