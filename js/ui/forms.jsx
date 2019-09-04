var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
import MegaRenderMixin from "../stores/mixins.js";

class Checkbox extends MegaRenderMixin(React.Component) {
    constructor (props) {
        super(props);
        this.state = {
            checked: this.props.checked ? this.props.checked : false
        }
        this.onLabelClick = this.onLabelClick.bind(this);
        this.onChange = this.onChange.bind(this);
    }
    onLabelClick(e) {
        var state = !this.state.checked;

        this.setState({
            'checked': state
        });

        if(this.props.onLabelClick) {
            this.props.onLabelClick(e, state);
        }
        this.onChange(e);
    }
    onChange(e) {
        if(this.props.onChange) {
            this.props.onChange(e, this.state.checked);
        }
    }
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
};

export default {
    Checkbox,
};
