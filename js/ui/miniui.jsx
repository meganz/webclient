var React = require("react");
var ReactDOM = require("react-dom");
var MegaRenderMixin = require("./../stores/mixins.js").MegaRenderMixin;

var ToggleCheckbox = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            value: this.props.value
        }
    },
    onToggle: function() {
        var newState = !this.state.value;
        this.setState({'value': newState});
        if (this.props.onToggle) {
            this.props.onToggle(newState);
        }
    },
    render: function() {
        var self = this;

        return  <div className={"toggle-checkbox " + (self.state.value ? " checked " : "") + self.props.className}
                     onClick={function(e) {
                         self.onToggle();
                     }}>
            <div className="toggle-checkbox-wrap">
                <div className="toggle-checkbox-button"></div>
            </div>
        </div>;
    }
});

var Checkbox = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            value: this.props.value
        }
    },
    componentDidMount() {
        var self = this;
        var $node = self.findDOMNode();
        uiCheckboxes($node, false, function(newState) {
            self.setState({'value': newState});
            self.props.onToggle && self.props.onToggle(newState);
        }, !!self.props.value);
    },
    render: function() {
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
});

var IntermediateCheckbox = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            value: this.props.value
        }
    },
    componentDidMount() {
        var self = this;
        var $node = self.findDOMNode();
        uiCheckboxes($node, false, function(newState) {
            self.setState({'value': newState});
            self.props.onToggle && self.props.onToggle(newState);
        }, !!self.props.value);
    },
    render: function() {
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
});
module.exports = {
    ToggleCheckbox,
    Checkbox,
    IntermediateCheckbox
};
