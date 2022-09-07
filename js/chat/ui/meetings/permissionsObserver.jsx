import React from 'react';
import { MegaRenderMixin } from '../../mixins';

export const withPermissionsObserver = Component =>
    class extends MegaRenderMixin {
        namespace = `PO-${Component.NAMESPACE}`;
        permissionsObserver = `onLocalMediaError.${this.namespace}`;

        state = {
            errMic: null,
            errCamera: null,
            errScreen: null
        };

        constructor(props) {
            super(props);
            this.resetError = this.resetError.bind(this);
            this.hasToRenderPermissionsWarning = this.hasToRenderPermissionsWarning.bind(this);
            this.renderPermissionsWarning = this.renderPermissionsWarning.bind(this);
        }

        resetError(av) {
            this.setState({
                errMic: av === Av.Audio ? null : this.state.errMic,
                errCamera: av === Av.Camera ? null : this.state.errCamera,
                errScreen: av === Av.Screen ? null : this.state.errScreen,
            });
        }

        isUserActionError(error) {
            const USER_ACTION_ERROR = "Permission denied";
            return error && error.message === USER_ACTION_ERROR;
        }

        hasToRenderPermissionsWarning(av) {
            const CONFIG = {
                [Av.Audio]: {
                    showOnUserActionError: true,
                    err: this.state.errMic,
                },
                [Av.Camera]: {
                    showOnUserActionError: true,
                    err: this.state.errCamera,
                },
                [Av.Screen]: {
                    showOnUserActionError: false,
                    err: this.state.errScreen,
                },
            };

            const current = CONFIG[av];
            if (current) {
                return this.isUserActionError(current.err) ? current.showOnUserActionError : current.err;
            }

            return false;
        }

        renderPermissionsDialog(av) {
            const CONTENT = {
                [Av.Audio]: [l.no_mic_title, l.no_mic_info],
                [Av.Camera]: [l.no_camera_title, l.no_camera_info],
                [Av.Screen]: [l.no_screen_title, l.no_screen_info]
            };
            return msgDialog('warningb', null, ...CONTENT[av], null, 1);
        }

        renderPermissionsWarning(av) {
            return (
                <div
                    className={`
                    ${this.namespace}
                    meetings-signal-issue
                    simpletip
                `}
                    data-simpletip="Show more info"
                    data-simpletipposition="top"
                    data-simpletipoffset="5"
                    data-simpletip-class="theme-dark-forced"
                    onClick={() => this.renderPermissionsDialog(av)}>
                    <i className="sprite-fm-mono icon-exclamation-filled" />
                </div>
            );
        }

        componentWillUnmount() {
            super.componentWillUnmount();
            this.props.chatRoom.unbind(this.permissionsObserver);
        }

        componentDidMount() {
            super.componentDidMount();
            this.props.chatRoom.rebind(this.permissionsObserver, (_, errAv) => {
                this.setState({
                    errMic: errAv && errAv.mic ? errAv.mic : this.state.errMic,
                    errCamera: errAv && errAv.camera ? errAv.camera : this.state.errCamera,
                    errScreen: errAv && errAv.screen ? errAv.screen : this.state.errScreen,
                });
            });
        }

        render() {
            return (
                <Component
                    {...this.props}
                    errMic={this.state.errMic}
                    errCamera={this.state.errCamera}
                    errScreen={this.state.errScreen}
                    resetError={this.resetError}
                    renderPermissionsWarning={this.renderPermissionsWarning}
                    hasToRenderPermissionsWarning={this.hasToRenderPermissionsWarning}
                />
            );
        }
    };
