var React = require("react");
var ReactDOM = require("react-dom");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;

var AccordionPanel = React.createClass({
    render: function () {
        var self = this;
        var contentClass = self.props.className ? self.props.className : '';

        return <div className="chat-dropdown container">
            <div className={"chat-dropdown header " + (this.props.expanded ? "expanded" : "")} onClick={function(e) {
                self.props.onToggle(e);
            }}>
                <span>{this.props.title}</span>
                <i className="tiny-icon right-arrow"></i>
            </div>
            {this.props.expanded ? <div
                className={"chat-dropdown content have-animation " + contentClass}>{this.props.children}</div> : null}
        </div>;
    }
});

var Accordion = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'expandedPanel': this.props.expandedPanel
        }
    },
    componentDidMount: function() {
        var self = this;
        $(window).rebind('resize.modalDialog' + self.getUniqueId(), function() {
            self.onResize();
        });
    },
    componentWillUnmount: function() {
        $(window).off('resize.modalDialog' + this.getUniqueId());

    },
    onResize: function() {
        // if (!this.domNode) {
        //     return;
        // }

        // always center modal dialogs after they are mounted
        // $(this.domNode)
        //     .css({
        //         'margin': 'auto'
        //     })
        //     .position({
        //         of: $(document.body)
        //     });
    },
    onToggle: function(e, key) {
        this.setState({'expandedPanel': this.state.expandedPanel === key ? undefined : key});
        this.props.onToggle && this.props.onToggle(key);
    },
    render: function() {
        var self = this;

        var classes = "accordion-panels " + self.props.className;

        var accordionPanels = [];
        var otherElements = [];

        var x = 0;
        React.Children.forEach(self.props.children, function (child) {
            if (!child) {
                // skip if undefined
                return;
            }

            if (
                child.type.displayName === 'AccordionPanel' || child.type.displayName.indexOf('AccordionPanel') > -1
            ) {
                accordionPanels.push(React.cloneElement(child, {
                    key: child.key,
                    expanded: this.state.expandedPanel === child.key,
                    accordion: self,
                    onToggle: function (e) {
                        self.onToggle(e, child.key);
                    }
                }));
            }
            else {
                otherElements.push(
                    React.cloneElement(child, {
                        key: x++,
                        accordion: self
                    })
                );
            }
        }.bind(this));

        return <div className={classes}>{accordionPanels}{otherElements}</div>;
    }
});


module.exports = {
    Accordion,
    AccordionPanel
};
