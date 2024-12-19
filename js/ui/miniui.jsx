import React from 'react';
import { MegaRenderMixin } from '../chat/mixins';

class ToggleCheckbox extends MegaRenderMixin {
    domRef = React.createRef();

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
                ref={this.domRef}
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

export default {
    ToggleCheckbox
};
