import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';

class StreamExtendedControls extends MegaRenderMixin {
    static NAMESPACE = 'stream-extended-controls';
    simpletip = { position: 'top', offset: 8, className: 'theme-dark-forced' };

    isActive = type => {
        return !!(this.props.call.av & type);
    };

    render() {
        const {
            onScreenSharingClick, onHoldClick, hasToRenderPermissionsWarning, renderPermissionsWarning, resetError
        } = this.props;
        const { onHold, Screen } = SfuClient.Av;
        const screenSharingLabel = this.isActive(Screen) ?
            l[22890] /* `End screen sharing` */ :
            l[22889] /* `Start screen sharing` */;
        const callHoldLabel = this.isActive(onHold) ?
            l[23459] /* `Resume call` */ :
            l[23460] /* `Hold call` */;

        return (
            <Button.Group
                {...this.props}
                active={this.isActive(Screen)}>
                <Button
                    key="screen-sharing"
                    simpletip={{ ...this.simpletip, label: screenSharingLabel }}
                    className={`
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(onHold) ? 'disabled' : ''}
                        ${this.isActive(Screen) ? 'active' : ''}
                    `}
                    icon={this.isActive(Screen) ? 'icon-end-screenshare' : 'icon-screen-share'}
                    onClick={() => {
                        resetError(Av.Screen);
                        onScreenSharingClick();
                    }}>
                    <span>{screenSharingLabel}</span>
                </Button>
                {hasToRenderPermissionsWarning(Screen) ? renderPermissionsWarning(Screen, this) : null}
                <Button
                    key="call-hold"
                    simpletip={{ ...this.simpletip, label: callHoldLabel, position: 'left' }}
                    className={`
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(onHold) ? 'active' : ''}
                    `}
                    icon={this.isActive(onHold) ? 'icon-play' : 'icon-pause'}
                    onClick={onHoldClick}>
                    <span>{callHoldLabel}</span>
                </Button>
            </Button.Group>
        );
    }
}

export default StreamExtendedControls;
