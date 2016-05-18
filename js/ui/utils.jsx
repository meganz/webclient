var React = require("react");
var ReactDOM = require("react-dom");

var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;

/**
 * jScrollPane helper
 * @type {*|Function}
 */
var JScrollPane = React.createClass({
    mixins: [MegaRenderMixin],
    componentDidMount: function() {
        var self = this;
        var $elem = $(ReactDOM.findDOMNode(self));


        $elem.height('100%');

        self.setWidthHeightIfEmpty();

        $elem.find('.jspContainer').replaceWith(
            function() {
                var $children = $elem.find('.jspPane').children();
                if ($children.size() === 0 || $children.size() > 1) {
                    console.error(
                        "JScrollPane on element: ", $elem, "encountered multiple (or zero) children nodes.",
                        "Mean while, JScrollPane should always (!) have 1 children element."
                    );
                }
                return $children;
            }
        );

        var options = $.extend({}, {
            enableKeyboardNavigation: false,
            showArrows: true,
            arrowSize: 8,
            animateScroll: true,
            container: $('.jspContainer', $elem),
            pane: $('.jspPane', $elem)
        }, self.props.options);

        $elem.jScrollPane(options);
        $elem.rebind('jsp-will-scroll-y.jsp' + self.getUniqueId(), function(e) {
            if ($elem.attr('data-scroll-disabled') === "true") {
                e.preventDefault();
                e.stopPropagation();

                return false;
            }
        });

        $elem.rebind('forceResize.jsp' + self.getUniqueId(), function(e, forced, scrollPositionYPerc) {
            self.onResize(forced, scrollPositionYPerc);
        });
        $(window).rebind('resize.jsp' + self.getUniqueId(), self.onResize);
        self.onResize();
    },
    componentWillUnmount: function() {
        var $elem = $(ReactDOM.findDOMNode(this));
        $elem.unbind('jsp-will-scroll-y.jsp' + this.getUniqueId());

        $(window).unbind('resize.jsp' + this.getUniqueId());
    },
    setWidthHeightIfEmpty: function() {
        var $elem = $(ReactDOM.findDOMNode(this));

        if(!$elem.width() && $elem.parent().outerWidth()) {
            $elem.width(
                $elem.parent().outerWidth()
            );
        }
    },
    eventuallyReinitialise: function(forced, scrollPositionYPerc) {
        var self = this;

        if (!self.isMounted()) {
            return;
        }

        var $elem = $(ReactDOM.findDOMNode(self));

        var currHeights = [$('.jspPane', $elem).outerHeight(), $elem.outerHeight()];

        if (forced || self._lastHeights != currHeights) {
            self._lastHeights = currHeights;
            var $jsp = $elem.data('jsp');
            if ($jsp) {
                if (scrollPositionYPerc) {

                    if (scrollPositionYPerc === -1) {
                        $elem.one('jsp-initialised', function () {
                            $jsp.scrollToBottom();
                        });
                    }
                }
                $jsp.reinitialise();
            }
        }
    },
    onResize: function(forced, scrollPositionYPerc) {
        if (!this.isMounted()) {
            return;
        }
        
        this.setWidthHeightIfEmpty();

        this.eventuallyReinitialise(forced, scrollPositionYPerc);
    },
    componentDidUpdate: function() {
        this.onResize();
    },
    render: function () {
        return (
            <div className={this.props.className + " jScrollPaneContainer"} {...this.props} onResize={this.onResize}>
                <div className="jspContainer">
                    <div className="jspPane">
                        {this.props.children}
                    </div>
                </div>
            </div>
        );
    }
});

/**
 * A trick copied from http://jamesknelson.com/rendering-react-components-to-the-document-body/
 * so that we can render Dialogs into the body or other child element, different then the current component's child.
 */
var RenderTo = React.createClass({
    componentDidMount: function() {
        this.popup = document.createElement("div");
        this.popup.className = this.props.className ? this.props.className : "";
        if (this.props.style) {
            $(this.popup).css(this.props.style);
        }
        this.props.element.appendChild(this.popup);
        if (this.props.popupDidMount) {
            this.props.popupDidMount(this.popup);
        }
        this._renderLayer();
    },
    componentDidUpdate: function() {
        this._renderLayer();
    },
    componentWillUnmount: function() {
        ReactDOM.unmountComponentAtNode(this.popup);
        if (this.props.popupWillUnmount) {
            this.props.popupWillUnmount(this.popup);
        }
        this.props.element.removeChild(this.popup);
    },
    _renderLayer: function() {
        ReactDOM.render(this.props.children, this.popup);
    },
    render: function() {
        // Render a placeholder
        return null;
    }

});

module.exports = {
    JScrollPane,
    RenderTo
};
