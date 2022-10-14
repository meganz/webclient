import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';

export default class Guest extends MegaRenderMixin {
    render() {
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
                        <i className="sprite-fm-illustration-wide registration" />
                        {l.meetings_signup}
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
