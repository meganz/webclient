var React = require("react");
import {MegaRenderMixin} from "../stores/mixins.js";

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

        var x = 0;
        React.Children.forEach(self.props.children, child => {
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
        });

        return <div className={classes}>{accordionPanels}</div>;
    }
};


export { Accordion, AccordionPanel};
