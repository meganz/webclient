import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import { Dropdown, DropdownItem } from "../../../ui/dropdowns.jsx";
import { Button } from "../../../ui/buttons.jsx";

export default class FloatExtendedControls extends MegaRenderMixin {
    static NAMESPACE = 'stream-extended-controls';

    isActive = type => {
        return !!(this.props.call.av & type);
    };

    render() {
        const {
            hasToRenderPermissionsWarning, renderPermissionsWarning, resetError, showScreenDialog,
            onScreenSharingClick, onHoldClick,
        } = this.props;
        const { onHold, Screen } = SfuClient.Av;
        const screenSharingLabel = this.isActive(Screen) ?
            l[22890] /* `End screen sharing` */ :
            l[22889] /* `Start screen sharing` */;
        const callHoldLabel = this.isActive(onHold) ?
            l[23459] /* `Resume call` */ :
            l[23460] /* `Hold call` */;

        return (
            <Button
                className="mega-button theme-light-forced round large button-group"
                icon="sprite-fm-mono icon-options"
                showScreenDialog={showScreenDialog}>
                {this.isActive(Screen) && <div className="info-indicator active" />}
                <Dropdown
                    className="button-group-menu theme-dark-forced"
                    noArrow={true}
                    positionAt="center top"
                    collision="none"
                    vertOffset={90}
                    ref={r => {
                        this.dropdownRef = r;
                    }}
                    onBeforeActiveChange={e => {
                        if (e) {
                            $(document.body).trigger('closeAllDropdownsExcept', this.dropdownRef);
                        }
                    }}
                    showScreenDialog={showScreenDialog}>
                    <DropdownItem
                        key="call-hold"
                        className={`
                            theme-dark-forced
                            ${this.isActive(onHold) ? 'active' : ''}
                        `}
                        label={callHoldLabel}
                        icon={`sprite-fm-mono ${this.isActive(onHold) ? 'icon-play' : 'icon-pause'}`}
                        onClick={onHoldClick}
                    />
                    <DropdownItem
                        key="screen-sharing"
                        className={`
                            theme-dark-forced
                            ${this.isActive(onHold) ? 'disabled' : ''}
                            ${this.isActive(Screen) ? 'active' : ''}
                        `}
                        label={screenSharingLabel}
                        icon={`sprite-fm-mono ${this.isActive(Screen) ? 'icon-end-screenshare' : 'icon-screen-share'}`}
                        onClick={() => {
                            resetError(Av.Screen);
                            onScreenSharingClick();
                        }}
                    />
                    {hasToRenderPermissionsWarning(Screen) ? renderPermissionsWarning(Screen, this) : null}
                </Dropdown>
            </Button>
        );
    }
}
