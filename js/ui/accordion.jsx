var React = require("react");
import {MegaRenderMixin} from "../chat/mixins";

class AccordionPanel extends MegaRenderMixin {
    domRef = React.createRef();

    render() {
        const { accordionClass, expanded, title, className, children, onToggle} = this.props;

        return (
            <div
                ref={this.domRef}
                className={`
                    chat-dropdown
                    container
                    ${accordionClass || ''}
                `}>
                <div
                    className={`
                        chat-dropdown
                        header
                        ${expanded ? 'expanded' : ''}
                    `}
                    onClick={onToggle}>
                    <span>{title}</span>
                    <i className="sprite-fm-mono icon-arrow-down"/>
                </div>
                {expanded ?
                    <div
                        className={`
                            chat-dropdown
                            content
                            have-animation
                            ${className | ''}
                        `}>
                        {children}
                    </div> :
                    null
                }
            </div>
        );
    }
}

class Accordion extends MegaRenderMixin {
    domRef = React.createRef();

    state = {
        expandedPanel: this.props.expandedPanel
    };

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

        return <div ref={this.domRef} className={classes}>{accordionPanels}</div>;
    }
}


export { Accordion, AccordionPanel};
