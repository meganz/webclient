var React = require("react");
import {MegaRenderMixin, SoonFcWrap} from "../stores/mixins.js";

/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */
export class PerfectScrollbar extends MegaRenderMixin {
    static defaultProps = {
        className: "perfectScrollbarContainer",
        requiresUpdateOnResize: true
    };

    constructor(props) {
        super(props);

        this.isUserScroll = true;
        this.scrollEventIncId = 0;
    }

    get$Node() {
        if (!this.$Node) {
            this.$Node = $(this.findDOMNode());
        }
        return this.$Node;
    }

    doProgramaticScroll(newPos, forced, isX, skipReinitialised) {
        if (!this.isMounted()) {
            return;
        }
        // console.error("%s.doProgramaticScroll", this.getReactId(), newPos, forced, isX, skipReinitialised, [this]);

        var self = this;
        var $elem = self.get$Node();
        var animFrameInner = false;
        var prop = !isX ? 'scrollTop' : 'scrollLeft';
        var event = 'scroll.progscroll' + self.scrollEventIncId++;

        $elem.rebind(event, () => {
            if (animFrameInner) {
                cancelAnimationFrame(animFrameInner);
                animFrameInner = false;
            }
            $elem.off(event);

            if (!skipReinitialised) {
                self.reinitialised(true);
            }
            else if (typeof skipReinitialised === 'function') {
                onIdle(skipReinitialised);
            }

            self.isUserScroll = true;
        });

        // do the actual scroll
        self.isUserScroll = false;
        $elem[0][prop] = Math.round(newPos);
        Ps.update($elem[0]);

        // reset the flag on next re-paint of the browser
        animFrameInner = requestAnimationFrame(() => {
            animFrameInner = false;
            self.isUserScroll = true;
            $elem.off(event);
        });

        return true;
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        var $elem = self.get$Node();

        $elem.height('100%');


        var options = Object.assign({}, {
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
        // var self = this;
        // if (!self.isMounted()) {
        //     return;
        // }

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
    @SoonFcWrap(30, true)
    eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
        var self = this;

        if (!self.isComponentEventuallyVisible()) {
            return;
        }

        var $elem = self.get$Node();

        var h = self.getContentHeight();
        if (forced || self._currHeight !== h) {
            self._currHeight = h;
            self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
        }
    }
    _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
        var fired = false;
        if (this.props.onReinitialise) {
            fired = this.props.onReinitialise(this, $elem, forced, scrollPositionYPerc, scrollToElement);
        }

        if (fired === false) {
            if (scrollPositionYPerc) {
                if (scrollPositionYPerc === -1) {
                    this.scrollToBottom(true);
                }
                else {
                    this.scrollToPercentY(scrollPositionYPerc, true);
                }
            }
            else if (scrollToElement) {
                this.scrollToElement(scrollToElement, true);
            }
        }
    }

    scrollToBottom(skipReinitialised) {
        this.reinitialise(skipReinitialised, true);
    }

    reinitialise(skipReinitialised, bottom) {
        var $elem = this.get$Node()[0];
        this.isUserScroll = false;
        if (bottom) {
            $elem.scrollTop = this.getScrollHeight();
        }
        Ps.update($elem);
        this.isUserScroll = true;

        if (!skipReinitialised) {
            this.reinitialised(true);
        }
    }

    getDOMRect(node) {
        return (node || this.get$Node()[0]).getBoundingClientRect();
    }

    getScrollOffset(value) {
        var $elem = this.get$Node()[0];
        return this.getDOMRect($elem.children[0])[value] - this.getDOMRect($elem)[value] || 0;
    }

    getScrollHeight() {
        var res = this.getScrollOffset('height');

        if (res < 1) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollHeight || 0;
        }
        this._lastKnownScrollHeight = res;
        return res;
    }
    getScrollWidth() {
        var res = this.getScrollOffset('width');

        if (res < 1) {
            // can happen if the element is now hidden.
            return this._lastKnownScrollWidth || 0;
        }
        this._lastKnownScrollWidth = res;
        return res;
    }
    getContentHeight() {
        var $elem = this.get$Node();
        return $elem[0].scrollHeight;
    }
    setCssContentHeight(h) {
        var $elem = this.get$Node();
        return $elem.css('height', h);
    }
    isAtTop() {
        return this.get$Node()[0].scrollTop === 0;
    }
    isAtBottom() {
        return Math.round(this.getScrollPositionY()) === Math.round(this.getScrollHeight());
    }
    isCloseToBottom(minPixelsOff) {
        return (this.getScrollHeight() - this.getScrollPositionY()) <= minPixelsOff;
    }
    getScrolledPercentY() {
        return 100 / this.getScrollHeight() * this.getScrollPositionY();
    }
    getScrollPositionY() {
        return this.get$Node()[0].scrollTop;
    }
    scrollToPercentY(posPerc, skipReinitialised) {
        var $elem = this.get$Node();
        var targetPx = this.getScrollHeight()/100 * posPerc;
        if ($elem[0].scrollTop !== targetPx) {
            this.doProgramaticScroll(targetPx, 0, 0, skipReinitialised);
        }
    }
    scrollToPercentX(posPerc, skipReinitialised) {
        var $elem = this.get$Node();
        var targetPx = this.getScrollWidth()/100 * posPerc;
        if ($elem[0].scrollLeft !== targetPx) {
            this.doProgramaticScroll(targetPx, false, true, skipReinitialised);
        }
    }
    scrollToY(posY, skipReinitialised) {
        var $elem = this.get$Node();
        if ($elem[0].scrollTop !== posY) {
            this.doProgramaticScroll(posY, 0, 0, skipReinitialised);
        }
    }
    scrollToElement(element, skipReinitialised) {
        if (element && element.offsetParent) {
            this.doProgramaticScroll(element.offsetTop, 0, 0, skipReinitialised);
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
            );
        }
    }
    @SoonFcWrap(30, true)
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
    customIsEventuallyVisible() {
        const chatRoom = this.props.chatRoom;
        return !chatRoom || chatRoom.isCurrentlyActive;
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
