var React = require("react");
import {MegaRenderMixin} from "../chat/mixins";

class Checkbox extends MegaRenderMixin {
    domRef = React.createRef();

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
        const { name, id, children } = this.props;
        const className = this.state.checked ? 'checkboxOn' : 'checkboxOff';

        return (
            <div
                ref={this.domRef}
                className="formsCheckbox">
                <div
                    className={`
                        checkdiv
                        ${className}
                    `}
                    onClick={this.onLabelClick}>
                    <input
                        type="checkbox"
                        name={name}
                        id={id}
                        className={className}
                        checked={this.state.checked}
                        onChange={this.onChange}
                    />
                </div>
                <label htmlFor={id} className="radio-txt">{children}</label>
            </div>
        );
    }
}

export default {
    Checkbox,
};
