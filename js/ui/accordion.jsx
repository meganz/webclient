var React = require("react");
var ReactDOM = require("react-dom");
import {MegaRenderMixin} from "../stores/mixins.js";
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;

class AccordionPanel extends MegaRenderMixin {
    render() {
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
};

class Accordion extends MegaRenderMixin {
    constructor(props) {
        super(props);

        this.state = {
            'expandedPanel': this.props.expandedPanel
        };
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        $(window).rebind('resize.modalDialog' + self.getUniqueId(), function() {
            self.onResize();
        });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        $(window).off('resize.modalDialog' + this.getUniqueId());

    }
    onResize() {
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
    }
    onToggle(e, key) {
        // allow multiple opened panels at a time
        // var obj = clone(this.state.expandedPanel);
        // if (obj[key]) {
        //     delete obj[key];
        // }
        // else {
        //     obj[key] = true;
        // }

        // allow only 1 opened accordion panel at a time.
        var obj = {};
        obj[key] = !(this.state.expandedPanel || {})[key];


        this.setState({'expandedPanel': obj});
        this.props.onToggle && this.props.onToggle(key);
    }
    render() {
        var self = this;

        var classes = "accordion-panels " + (self.props.className ? self.props.className : '');

        var accordionPanels = [];
        var otherElements = [];

        var x = 0;
        React.Children.forEach(self.props.children, function (child) {
            if (!child) {
                // skip if undefined
                return;
            }

            if (
                child.type.name === 'AccordionPanel' || (
                    child.type.name && child.type.name.indexOf('AccordionPanel') > -1
                )
            ) {
                accordionPanels.push(React.cloneElement(child, {
                    key: child.key,
                    expanded: !!self.state.expandedPanel[child.key],
                    accordion: self,
                    onToggle: function (e) {
                        self.onToggle(e, child.key);
                    }
                }));
            }
            else {
                accordionPanels.push(
                    React.cloneElement(child, {
                        key: x++,
                        accordion: self
                    })
                );
            }
        }.bind(this));

        return <div className={classes}>{accordionPanels}{otherElements}</div>;
    }
};


export { Accordion, AccordionPanel};
