import React from 'react';
import Button from './button.jsx';

export default class Guest extends React.Component {
    state = {
        copy: ''
    };

    componentDidMount() {
        this.setState({ copy: `${l.free_storage_info__call.replace('%s', bytesToSize(mega.bstrg, 0))}` });
    }

    render() {
        const { copy } = this.state;

        return (
            <div className="guest-register">
                <div className="guest-register-content">
                    <Button
                        className="close-guest-register"
                        icon="icon-close-component"
                        onClick={this.props.onGuestClose}>
                        <span>{l[148] /* `Close` */}</span>
                    </Button>
                    <div>
                        <i className="sprite-fm-illustration-wide registration"/>
                        <span>{copy}</span>
                    </div>
                    <Button
                        className="mega-button positive register-button"
                        onClick={() => loadSubPage('register')}>
                        {l[968] /* `Create Account` */}
                    </Button>
                </div>
            </div>
        );
    }
}
