import React from 'react';
import { MegaRenderMixin } from '../mixins';
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
                title={l.dnd_mute_title /* `Mute` */}
                subtitle={this.props.room.isMeeting
                    ? l.meeting_dnd_subtitle /* `Mute meeting notifications for` */
                    : l[22015] /* `Mute chat notifications for` */}
                className="push-settings-dialog"
                dialogName="push-settings-chat-dialog"
                dialogType="tool"
                onClose={this.props.onClose}>

                <section className="content">
                    <div className="content-block">
                        <div>
                            {this.renderOptions()}
                        </div>
                    </div>
                </section>

                <footer>
                    <div className="footer-container">
                        <button className="mega-button" onClick={this.props.onClose}>
                            <span>{l[82] /* `Cancel` */}</span>
                        </button>
                        <button
                            className="mega-button positive"
                            onClick={() => this.props.onConfirm(this.state.pushSettingsValue)}>
                            <span>{l[726] /* `Done` */}</span>
                        </button>
                    </div>
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
