import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';

export const withPermissionsObserver = Component =>
    class extends MegaRenderMixin {
        namespace = `PO-${Component.NAMESPACE}`;
        observer = `onLocalMediaError.${this.namespace}`;
        content = {
            [Av.Audio]: { title: l.no_mic_title, info: l.no_mic_info },
            [Av.Camera]: { title: l.no_camera_title, info: l.no_camera_info },
            [Av.Screen]: { title: l.no_screen_title, info: l.no_screen_info }
        };

        state = {
            errMic: null,
            errCamera: null,
            errScreen: null,
            [`dialog-${Av.Audio}`]: null,
            [`dialog-${Av.Camera}`]: null,
            [`dialog-${Av.Screen}`]: null
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

        renderPermissionsDialog(av, child) {
            const doClose = () => this.setState({ [`dialog-${av}`]: false }, () =>
                child && child.isMounted() && child.safeForceUpdate()
            );

            return (
                <ModalDialogsUI.ModalDialog
                    dialogName={`${this.namespace}-permissions-${av}`}
                    className={`
                        dialog-template-message
                        with-close-btn
                        warning
                    `}
                    buttons={[
                        {
                            key: 'ok',
                            label: l[81] /* `Ok` */,
                            className: 'positive',
                            onClick: doClose
                        }
                    ]}
                    hideOverlay={this.props.child === 'start-meeting'}
                    onClose={doClose}>
                    <header>
                        <div className="graphic">
                            <i className="warning sprite-fm-uni icon-warning" />
                        </div>
                        <div className="info-container">
                            <h3 id="msgDialog-title">{this.content[av].title}</h3>
                            <p className="text">{this.content[av].info}</p>
                        </div>
                    </header>
                </ModalDialogsUI.ModalDialog>
            );
        }

        renderPermissionsWarning(av, child) {
            return (
                <div
                    className={`
                        ${this.namespace}
                        meetings-signal-issue
                        simpletip
                    `}
                    data-simpletip={l.show_info /* `Show more info` */}
                    data-simpletipposition="top"
                    data-simpletipoffset="5"
                    data-simpletip-class="theme-dark-forced"
                    onClick={() => this.setState({ [`dialog-${av}`]: true })}>
                    <i className="sprite-fm-mono icon-exclamation-filled"/>
                    {this.state[`dialog-${av}`] && this.renderPermissionsDialog(av, child)}
                </div>
            );
        }

        componentWillUnmount() {
            super.componentWillUnmount();
            megaChat.unbind(this.observer);
        }

        componentDidMount() {
            super.componentDidMount();
            megaChat.rebind(this.observer, (ev, errAv) => {
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
                    {...this.state}
                    errMic={this.state.errMic}
                    errCamera={this.state.errCamera}
                    errScreen={this.state.errScreen}
                    hasToRenderPermissionsWarning={this.hasToRenderPermissionsWarning}
                    renderPermissionsWarning={this.renderPermissionsWarning}
                    resetError={this.resetError}
                />
            );
        }
    };
