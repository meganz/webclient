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
                return $elem.find('.jspPane').children();
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
    onResize: function() {
        var $elem = $(ReactDOM.findDOMNode(this));

        this.setWidthHeightIfEmpty();

        var $jsp = $elem.data('jsp');
        if ($jsp) {
            $jsp.reinitialise();
        }
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
        this._renderLayer();
    },
    componentDidUpdate: function() {
        this._renderLayer();
    },
    componentWillUnmount: function() {
        ReactDOM.unmountComponentAtNode(this.popup);
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
