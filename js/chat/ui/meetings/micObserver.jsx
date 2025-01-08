import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';

export const withMicObserver = Component =>
    class extends MegaRenderMixin {
        namespace = `SO-${Component.NAMESPACE}`;
        inputObserver = `onNoMicInput.${this.namespace}`;
        sendObserver = `onAudioSendDenied.${this.namespace}`;

        state = {
            signal: true,
            blocked: false
        };

        constructor(props) {
            super(props);
            this.renderSignalWarning = this.renderSignalWarning.bind(this);
            this.renderBlockedWarning = this.renderBlockedWarning.bind(this);
        }

        bindObservers() {
            this.props.chatRoom
                .rebind(this.inputObserver, () => this.setState({ signal: false }))
                .rebind(this.sendObserver, () => {
                    this.setState({ blocked: true }, () => {
                        if (this.props.minimized) {
                            const toast = new ChatToast(
                                l.max_speakers_toast,
                                { icon: 'sprite-fm-uni icon-hazard', close: true }
                            );
                            toast.dispatch();
                        }
                    });
                });
        }

        renderSignalDialog() {
            return msgDialog(
                'warningb', null, l.no_mic_title, l.chat_mic_off_tooltip, null, 1
            );
        }

        renderSignalWarning() {
            return (
                <div
                    className={`
                    ${this.namespace}
                        meetings-signal-issue
                        simpletip
                    `}
                    data-simpletip={l.show_info}
                    data-simpletipposition="top"
                    data-simpletipoffset="5"
                    data-simpletip-class="theme-dark-forced"
                    onClick={() => this.renderSignalDialog()}>
                    <i className="sprite-fm-mono icon-exclamation-filled" />
                </div>
            );
        }

        renderBlockedWarning() {
            return (
                <div className="stream-toast theme-dark-forced">
                    <div className="stream-toast-content">
                        <i className="stream-toast-icon sprite-fm-uni icon-warning" />
                        <div className="stream-toast-message">{l.max_speakers_toast}</div>
                        <Button
                            className="mega-button action stream-toast-close"
                            icon="sprite-fm-mono icon-close-component"
                            onClick={() => this.setState({ blocked: false })}
                        />
                    </div>
                </div>
            );
        }

        componentWillUnmount() {
            super.componentWillUnmount();
            this.props.chatRoom.unbind(this.inputObserver);
        }

        componentDidMount() {
            super.componentDidMount();
            this.bindObservers();
        }

        render() {
            return (
                <Component
                    {...this.props}
                    signal={this.state.signal}
                    renderSignalWarning={this.renderSignalWarning}
                    blocked={this.state.blocked}
                    renderBlockedWarning={this.renderBlockedWarning}
                />
            );
        }
    };
