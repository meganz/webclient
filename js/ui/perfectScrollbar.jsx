var React = require("react");
var ReactDOM = require("react-dom");

var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;

/**
 * perfect-scrollbar React helper
 * @type {*|Function}
 */
var PerfectScrollbar = React.createClass({
    mixins: [MegaRenderMixin],
    isUserScroll: true,
    getDefaultProps: function() {
        return {
            className: "perfectScrollbarContainer",
            requiresUpdateOnResize: true
        };
    },
    componentDidMount: function() {
        var self = this;
        var $elem = $(ReactDOM.findDOMNode(self));


        $elem.height('100%');


        var options = $.extend({}, {
        }, self.props.options);

        Ps.initialize($elem[0], options);


        if (self.props.onFirstInit) {
            self.props.onFirstInit(self, $elem);
        }

        $(document).rebind('ps-scroll-y.ps' + self.getUniqueId(), function(e) {
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
        $(document).unbind('ps-scroll-y.ps' + this.getUniqueId());
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

        self.isUserScroll = false;
        Ps.update($elem[0]);
        self.isUserScroll = true;

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
        var $elem = $(this.findDOMNode());
        $elem[0].scrollTop = this.getScrollHeight();
        this.isUserScroll = false;
        Ps.update($elem[0]);
        this.isUserScroll = true;

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
    getScrolledPercentY: function() {
        var $elem = $(this.findDOMNode());
        return 100/this.getScrollHeight() * $elem[0].scrollTop;
    },
    getScrollPositionY: function() {
        var $elem = $(this.findDOMNode());
        return $elem[0].scrollTop;
    },
    scrollToPercentY: function(posPerc, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        var targetPx = 100/this.getScrollHeight() * posPerc;
        if ($elem[0].scrollTop !== targetPx) {
            $elem[0].scrollTop = targetPx;
            this.isUserScroll = false;
            Ps.update($elem[0]);
            this.isUserScroll = true;
            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToY: function(posY, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        if ($elem[0].scrollTop !== posY) {
            $elem[0].scrollTop = posY;
            this.isUserScroll = false;
            Ps.update($elem[0]);
            this.isUserScroll = true;
            if (!skipReinitialised) {
                this.reinitialised(true);
            }
        }
    },
    scrollToElement: function(element, skipReinitialised) {
        var $elem = $(this.findDOMNode());
        $elem[0].scrollTop = element.offsetTop;
        this.isUserScroll = false;
        Ps.update($elem[0]);
        this.isUserScroll = true;

        if (!skipReinitialised) {
            this.reinitialised(true);
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
