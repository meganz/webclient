import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import ModalDialogsUI from '../../../ui/modalDialogs.jsx';
import { ParsedHTML } from '../../../ui/utils.jsx';

const errors = {
    browser: 'NotAllowedError: Permission denied',
    system: 'NotAllowedError: Permission denied by system',
    dismissed: 'NotAllowedError: Permission dismissed',
    nil: 'NotFoundError: Requested device not found',
    sharedCam: 'NotReadableError: Could not start video source',
    sharedMic: 'NotReadableError: Could not start audio source',
    sharedGeneric: 'NotReadableError: Device in use',
};

const isUserActionError = error => {
    return error && error === errors.browser;
};

export const withPermissionsObserver = Component => {
    return class extends MegaRenderMixin {
        namespace = `PO-${Component.NAMESPACE}`;
        observer = `onLocalMediaError.${this.namespace}`;
        childRef = undefined;

        platform = ua.details.os;
        helpURL = `${l.mega_help_host}/chats-meetings/meetings/enable-audio-video-call-permissions`;
        macURI = 'x-apple.systempreferences:com.apple.preference.security';
        winURI = 'ms-settings';

        CONTENT = {
            [Av.Audio]: {
                system: {
                    title: l.no_mic_title,
                    info:
                        this.platform === 'Windows' ?
                            l.no_mic_system_windows
                                .replace('[A]', `<a href=${this.helpURL} target="_blank" class="clickurl">`)
                                .replace('[/A]', '</a>') :
                            l.no_mic_system_mac
                                .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                                .replace('[/A]', '</a>'),
                    buttons: [
                        this.platform === 'Apple' || this.platform === 'Windows' ?
                            {
                                key: 'open-settings',
                                label: l.open_system_settings,
                                className: 'positive',
                                onClick: () => {
                                    window.open(
                                        this.platform === 'Apple' ?
                                            `${this.macURI}?Privacy_Microphone` :
                                            `${this.winURI}:privacy-microphone`,
                                        '_blank',
                                        'noopener,noreferrer'
                                    );
                                    this.closePermissionsDialog(Av.Audio);
                                }
                            } :
                            {
                                key: 'ok',
                                label: l.ok_button,
                                className: 'positive',
                                onClick: () => this.closePermissionsDialog(Av.Audio)
                            }
                    ]
                },
                browser: {
                    title: l.no_mic_title,
                    cover: 'permissions-mic',
                    info: l.allow_mic_access.replace('[X]', '<i class="sprite-fm-theme icon-mic-disabled"></i>'),
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Audio)
                    }]
                },
                nil: {
                    title: l.no_mic_detected_title,
                    info: l.no_mic_detected_info,
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Audio)
                    }]
                },
                shared: {
                    title: l.no_mic_title,
                    info: l.shared_mic_err_info
                        .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                        .replace('[/A]', '</a>'),
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Audio)
                    }]
                }
            },

            [Av.Camera]: {
                system: {
                    title: l.no_camera_title,
                    info:
                        this.platform === 'Windows' ?
                            l.no_camera_system_windows
                                .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                                .replace('[/A]', '</a>') :
                            l.no_camera_system_mac
                                .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                                .replace('[/A]', '</a>'),
                    buttons: [
                        this.platform === 'Apple' || this.platform === 'Windows' ?
                            {
                                key: 'open-settings',
                                label: l.open_system_settings,
                                className: 'positive',
                                onClick: () => {
                                    window.open(
                                        this.platform === 'Apple' ?
                                            `${this.macURI}?Privacy_Camera` :
                                            `${this.winURI}:privacy-webcam`,
                                        '_blank',
                                        'noopener,noreferrer'
                                    );
                                    this.closePermissionsDialog(Av.Camera);
                                }
                            } :
                            {
                                key: 'ok',
                                label: l.ok_button,
                                className: 'positive',
                                onClick: () => this.closePermissionsDialog(Av.Camera)
                            }
                    ]
                },
                browser: {
                    title: l.no_camera_title,
                    cover: 'permissions-camera',
                    info: l.allow_camera_access
                        .replace('[X]', '<i class="sprite-fm-theme icon-camera-disabled"></i>'),
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Camera)
                    }]
                },
                nil: {
                    title: l.no_camera_detected_title,
                    info: l.no_camera_detected_info,
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Camera)
                    }]
                },
                shared: {
                    title: l.no_camera_title,
                    info: l.shared_cam_err_info
                        .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                        .replace('[/A]', '</a>'),
                    buttons: [{
                        key: 'ok',
                        label: l.ok_button,
                        className: 'positive',
                        onClick: () => this.closePermissionsDialog(Av.Camera)
                    }]
                }
            },

            [Av.Screen]: {
                title: l.no_screen_title,
                info:
                    l.no_screen_system
                        .replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`)
                        .replace('[/A]', '</a>'),
                buttons: [
                    {
                        key: 'open-settings',
                        label: l.open_system_settings,
                        className: 'positive',
                        onClick: () => {
                            window.open(
                                `${this.macURI}?Privacy_ScreenCapture`,
                                '_blank',
                                'noopener,noreferrer'
                            );
                            this.closePermissionsDialog(Av.Screen);
                        }
                    }
                ]
            },
        };

        state = {
            errMic: '',
            errCamera: '',
            errScreen: '',
            [`dialog-${Av.Audio}`]: null,
            [`dialog-${Av.Camera}`]: null,
            [`dialog-${Av.Screen}`]: null
        };

        constructor(props) {
            super(props);
            this.hasToRenderPermissionsWarning = this.hasToRenderPermissionsWarning.bind(this);
            this.renderPermissionsWarning = this.renderPermissionsWarning.bind(this);
        }

        getPermissionsDialogContent = () => {
            const { CONTENT, state } = this;
            const { errMic, errCamera } = state;
            const { browser, system, nil, sharedCam, sharedMic, sharedGeneric } = errors;

            return {
                [Av.Audio]: {
                    ...errMic === browser && CONTENT[Av.Audio].browser,
                    ...errMic === system && CONTENT[Av.Audio].system,
                    ...errMic === nil && CONTENT[Av.Audio].nil,
                    ...errMic === sharedMic && CONTENT[Av.Audio].shared,
                    ...errMic === sharedGeneric && CONTENT[Av.Audio].shared,
                },
                [Av.Camera]: {
                    ...errCamera === browser && CONTENT[Av.Camera].browser,
                    ...errCamera === system && CONTENT[Av.Camera].system,
                    ...errCamera === nil && CONTENT[Av.Camera].nil,
                    ...errCamera === sharedCam && CONTENT[Av.Camera].shared,
                    ...errCamera === sharedGeneric && CONTENT[Av.Camera].shared,
                },
                [Av.Screen]: CONTENT[Av.Screen]
            };
        };

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
                return isUserActionError(current.err) ? current.showOnUserActionError : current.err;
            }

            return false;
        }

        resetError = av => {
            this.setState({
                errMic: av === Av.Audio ? '' : this.state.errMic,
                errCamera: av === Av.Camera ? '' : this.state.errCamera,
                errScreen: av === Av.Screen ? '' : this.state.errScreen,
            });
        };

        closePermissionsDialog(av) {
            this.setState({ [`dialog-${av}`]: false }, () => this.childRef?.safeForceUpdate());
        }

        renderPermissionsDialog(av, child) {
            const content = this.getPermissionsDialogContent();
            const { title, info, buttons, cover } = content[av] || {};

            return (
                <ModalDialogsUI.ModalDialog
                    dialogName={`${this.namespace}-permissions-${av}`}
                    className={`
                        meetings-permissions-dialog
                        dialog-template-message
                        with-close-btn
                        warning
                    `}
                    buttons={buttons}
                    hideOverlay={
                        Component.NAMESPACE === 'preview-meeting' &&
                        !document.body.classList.contains('not-logged')
                    }
                    onClose={() => {
                        this.setState({ [`dialog-${av}`]: false }, () => child && child.safeForceUpdate());
                    }}>
                    <header>
                        {cover ?
                            null :
                            <div className="graphic">
                                <i className="warning sprite-fm-uni icon-warning"/>
                            </div>
                        }
                        <div className="info-container">
                            <h3 id="msgDialog-title">{title || l[47]}</h3>
                            {cover &&
                                <div className="permissions-warning-cover">
                                    <span className={cover}/>
                                </div>
                            }
                            <ParsedHTML
                                tag="p"
                                className="permissions-warning-info"
                                content={info}
                            />
                        </div>
                    </header>
                </ModalDialogsUI.ModalDialog>
            );
        }

        renderPermissionsWarning(av, child) {
            const { errMic, errCamera } = this.state;
            const dismissed = errMic === errors.dismissed || errCamera === errors.dismissed;

            return (
                <div
                    className={`
                        ${this.namespace}
                        meetings-signal-issue
                        simpletip
                        ${dismissed ? 'with-small-area' : ''}
                    `}
                    data-simpletip={l.show_info /* `Show more info` */}
                    data-simpletipposition="top"
                    data-simpletipoffset="5"
                    data-simpletip-class="theme-dark-forced"
                    onClick={() =>
                        dismissed ?
                            null :
                            this.setState({ [`dialog-${av}`]: true }, () => {
                                if (child) {
                                    this.childRef = child;
                                }
                            })
                    }>
                    <i className="sprite-fm-mono icon-exclamation-filled" />
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

            // Set the error state based on the received permissions rejection
            megaChat.rebind(this.observer, (ev, errAv) => {
                this.setState({
                    errMic: errAv && errAv.mic ? String(errAv.mic) : this.state.errMic,
                    errCamera: errAv && errAv.camera ? String(errAv.camera) : this.state.errCamera,
                    errScreen: errAv && errAv.screen ? String(errAv.screen) : this.state.errScreen,
                });
            });

            // Render the permissions dialog immediately after receiving permissions rejection for the screen share
            megaChat.rebind(`onLocalMediaQueryError.${this.namespace}`, (ev, { type, err }) => {
                if (type === 'screen' && String(err) === errors.system) {
                    this.setState({ [`dialog-${Av.Screen}`]: true }, () => this.safeForceUpdate());
                }
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
                    resetError={this.resetError}
                    renderPermissionsWarning={this.renderPermissionsWarning}
                />
            );
        }
    };
};
