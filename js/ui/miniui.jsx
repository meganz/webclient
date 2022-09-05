import React from 'react';
import { MegaRenderMixin } from '../chat/mixins';

class ToggleCheckbox extends MegaRenderMixin {
    constructor(props) {
        super(props);
        this.state = {
            value: this.props.value
        };
    }

    onToggle = () => {
        const newState = !this.state.value;
        this.setState({ value: newState });
        if (this.props.onToggle) {
            this.props.onToggle(newState);
        }
    };

    render() {
        return (
            <div
                className={`
                    mega-switch
                    ${this.props.className}
                    ${this.state.value ? 'toggle-on' : ''}
                `}
                role="switch"
                aria-checked={!!this.state.value}
                onClick={this.onToggle}>
                <div
                    className={
                        `mega-feature-switch sprite-fm-mono-after
                         ${this.state.value ? 'icon-check-after' : 'icon-minimise-after'}`
                    }
                />
            </div>
        );
    }
}

class Checkbox extends MegaRenderMixin {
    constructor (props) {
        super(props);
        this.state = {
            value: this.props.value
        };
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        var $node = self.findDOMNode();
        uiCheckboxes($node, false, function(newState) {
            self.setState({'value': newState});
            self.props.onToggle && self.props.onToggle(newState);
        }, !!self.props.value);
    }
    render() {
        var extraClasses = "";
        if (this.props.disabled) {
            extraClasses += " disabled";

        }
        return  <div className={this.props.className + " checkbox" + extraClasses}>
            <div className="checkdiv checkboxOn">
                <input type="checkbox" name={this.props.name} id={this.props.name} className="checkboxOn"
                       checked="" />
            </div>
            <label htmlFor={this.props.name} className="radio-txt lato mid">{this.props.label}</label>
            <div className="clear"></div>
        </div>;
    }
};

class IntermediateCheckbox extends MegaRenderMixin {
    constructor (props) {
        super(props);
        this.state = {
            value: this.props.value
        };
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        var $node = self.findDOMNode();
        uiCheckboxes($node, false, function(newState) {
            self.setState({'value': newState});
            self.props.onToggle && self.props.onToggle(newState);
        }, !!self.props.value);
    }
    render() {
        var extraClasses = "";
        if (this.props.disabled) {
            extraClasses += " disabled";

        }
        return  <div className={this.props.className + " checkbox" + extraClasses}>
            <div className="checkdiv checkboxOn">
                <input type="checkbox" name={this.props.name} id={this.props.name} className="checkboxOn"
                       checked="" />
            </div>
            <label htmlFor={this.props.name} className="radio-txt lato mid">{this.props.label}</label>
            <div className="clear"></div>
            {
                this.props.intermediate ?
                <div className="intermediate-state">{this.props.intermediateMessage}</div>
                    : null
            }
            <div className="clear"></div>
        </div>;
    }
};


export default {
    ToggleCheckbox,
    Checkbox,
    IntermediateCheckbox
};
