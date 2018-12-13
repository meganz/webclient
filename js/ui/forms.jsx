var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../stores/mixins.js").RenderDebugger;




var Checkbox = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getInitialState() {
        return {
            checked: this.props.checked ? this.props.checked : false
        }
    },
    onLabelClick: function(e) {
        var state = !this.state.checked;

        this.setState({
            'checked': state
        });

        if(this.props.onLabelClick) {
            this.props.onLabelClick(e, state);
        }
        this.onChange(e);
    },
    onChange(e) {
        if(this.props.onChange) {
            this.props.onChange(e, this.state.checked);
        }
    },
    render() {
        var className = this.state.checked ? "checkboxOn" : "checkboxOff";


        return <div className="formsCheckbox">
            <div className={"checkdiv " + className} onClick={this.onLabelClick}>
                <input
                    type="checkbox"
                    name={this.props.name}
                    id={this.props.id}
                    className={className}
                    checked={this.state.checked}
                    onChange={this.onChange}
                    />
            </div>
            <label htmlFor={this.props.id} className="radio-txt">
                {this.props.children}
            </label>
        </div>
    }
});

module.exports = {
    Checkbox,
};
