import React from 'react';
import { MegaRenderMixin } from '../../stores/mixins';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';

export default class PushSettingsDialog extends MegaRenderMixin {
    static options = {
        // `30 Minutes`
        30: l[22012],
        // `1 Hour`
        60: l[19048],
        // `6 Hours
        360: l[22013],
        // `24 Hours`
        1440: l[22014],
        // `Until I Turn It On Again`
        Infinity: l[22011]
    };

    static default = PushSettingsDialog.options[PushSettingsDialog.options.length - 1];

    constructor(props) {
        super(props);
        this.state = {
            pushSettingsValue: this.props.pushSettingsValue || Infinity
        };
    }

    renderOptions = () => {
        return Object.keys(PushSettingsDialog.options).map(key => {
            key = parseInt(key, 10) || Infinity;
            return (
                <label
                    key={key}
                    className="radio-txt">
                    {PushSettingsDialog.options[key]}
                    <div className={
                        "custom-radio small green-active " +
                        (this.state.pushSettingsValue === key ? "radioOn" : "radioOff")
                    }>
                        <input
                            type="radio"
                            name="time-selector"
                            value={key}
                            checked={this.state.pushSettingsValue === key}
                            onChange={() =>
                                this.setState({ pushSettingsValue: key })
                            }
                        />
                    </div>
                </label>
            );
        });
    };

    render() {
        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                name="push-settings"
                title={l[16214] /* `Mute` */}
                className="push-settings-dialog"
                onClose={this.props.onClose}>
                <div className="fm-dialog-content">
                    <div className="dialog secondary-header">
                        {l[22015] /* `Mute chat notifications for` */}
                    </div>
                    <div className="fm-dialog-body">
                        {this.renderOptions()}
                    </div>
                    <div className="buttons-block">
                        <div
                            className="default-green-button gradient right"
                            onClick={() => this.props.onConfirm(this.state.pushSettingsValue)}>
                            {l[726] /* `Done` */}
                        </div>
                        <div className="default-white-button right" onClick={this.props.onClose}>
                            {l[82] /* `Cancel` */}
                        </div>
                        <div className="clear" />
                    </div>
                </div>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
