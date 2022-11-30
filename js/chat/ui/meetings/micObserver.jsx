import React from 'react';
import { MegaRenderMixin } from '../../mixins';

export const withMicObserver = Component =>
    class extends MegaRenderMixin {
        namespace = `SO-${Component.NAMESPACE}`;
        signalObserver = `onMicSignalDetected.${this.namespace}`;
        inputObserver = `onNoMicInput.${this.namespace}`;

        state = {
            signal: true
        };

        constructor(props) {
            super(props);
            this.renderSignalWarning = this.renderSignalWarning.bind(this);
        }

        unbindObservers() {
            [this.signalObserver, this.inputObserver].map(observer => this.props.chatRoom.unbind(observer));
        }

        bindObservers() {
            this.props.chatRoom
                .rebind(this.signalObserver, ({ data: signal }) => this.setState({ signal }))
                .rebind(this.inputObserver, () => this.setState({ signal: false }));
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

        componentWillUnmount() {
            super.componentWillUnmount();
            this.unbindObservers();
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
                />
            );
        }
    };
