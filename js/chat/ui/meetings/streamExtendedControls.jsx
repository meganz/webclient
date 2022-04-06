import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';

export default class StreamExtendedControls extends MegaRenderMixin {
    isActive = type => {
        return !!(this.props.call.av & type);
    };

    render() {
        const { onScreenSharingClick, onHoldClick } = this.props;
        const SIMPLETIP = { position: 'top', offset: 8, className: 'theme-dark-forced' };
        const screenSharingLabel = this.isActive(SfuClient.Av.Screen)
            ? l[22890] /* `End screen sharing` */ : l[22889] /* `Start screen sharing` */;
        const callHoldLabel = this.isActive(SfuClient.Av.onHold)
            ? l[23459] /* `Resume call` */ : l[23460] /* `Hold call` */;

        return (
            <Button.Group active={this.isActive(SfuClient.Av.Screen)}>
                <Button
                    simpletip={{ ...SIMPLETIP, label: screenSharingLabel }}
                    className={`
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                        ${this.isActive(SfuClient.Av.Screen) ? 'active' : ''}
                    `}
                    icon={`
                        ${this.isActive(SfuClient.Av.Screen) ? 'icon-end-screenshare' : 'icon-screen-share'}
                    `}
                    onClick={onScreenSharingClick}>
                    <span>{screenSharingLabel}</span>
                </Button>
                <Button
                    simpletip={{ ...SIMPLETIP, label: callHoldLabel, position: 'left' }}
                    className={`
                        mega-button
                        theme-light-forced
                        round
                        large
                        ${this.isActive(SfuClient.Av.onHold) ? 'active' : ''}
                    `}
                    icon={this.isActive(SfuClient.Av.onHold) ? 'icon-play' : 'icon-pause'}
                    onClick={onHoldClick}>
                    <span>{callHoldLabel}</span>
                </Button>
            </Button.Group>
        );
    }
}
