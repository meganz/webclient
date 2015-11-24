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
        var $elem = $(ReactDOM.findDOMNode(this));

        $elem.height('100%');

        this.setWidthHeightIfEmpty();

        var $jspContainerReact = $elem.find('.jspContainer');
        var $jspPaneReact = $elem.find('.jspPane');

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
        }, this.props.options);

        $elem.jScrollPane(options);

        //$elem.find('.jspContainer').attr('data-reactid', $jspContainerReact.data('reactid'));
        //$elem.find('.jspPane').attr('data-reactid', $jspPaneReact.data('reactid'));


        window.addEventListener('resize', this.onResize);

        this.onResize();
    },
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.onResize);
    },
    setWidthHeightIfEmpty: function() {
        var $elem = $(ReactDOM.findDOMNode(this));
        //if(!$elem.height() && $elem.parent().outerHeight()) {
        //    $elem.height(
        //        $elem.parent().outerHeight()
        //    );
        //}

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
        if($jsp) {
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


module.exports = {
    JScrollPane
};
