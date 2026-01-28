/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[987],{

 192
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   $: () =>  withPermissionsObserver
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _mixins_js2__ = REQ_(8264);
 const _ui_modalDialogs_jsx3__ = REQ_(8120);
 const _ui_utils_jsx4__ = REQ_(6411);





const errors = {
  browser: 'NotAllowedError: Permission denied',
  system: 'NotAllowedError: Permission denied by system',
  dismissed: 'NotAllowedError: Permission dismissed',
  nil: 'NotFoundError: Requested device not found',
  sharedCam: 'NotReadableError: Could not start video source',
  sharedMic: 'NotReadableError: Could not start audio source',
  sharedGeneric: 'NotReadableError: Device in use'
};
const isUserActionError = error => {
  return error && error === errors.browser;
};
const withPermissionsObserver = Component => {
  return class extends _mixins_js2__ .w9 {
    constructor(props) {
      super(props);
      this.namespace = `PO-${Component.NAMESPACE}`;
      this.observer = `onLocalMediaError.${this.namespace}`;
      this.childRef = undefined;
      this.platform = ua.details.os;
      this.helpURL = `${l.mega_help_host}/chats-meetings/meetings/enable-audio-video-call-permissions`;
      this.macURI = 'x-apple.systempreferences:com.apple.preference.security';
      this.winURI = 'ms-settings';
      this.CONTENT = {
        [Av.Audio]: {
          system: {
            title: l.no_mic_title,
            info: this.platform === 'Windows' ? l.no_mic_system_windows.replace('[A]', `<a href=${this.helpURL} target="_blank" class="clickurl">`).replace('[/A]', '</a>') : l.no_mic_system_mac.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'),
            buttons: [this.platform === 'Apple' || this.platform === 'Windows' ? {
              key: 'open-settings',
              label: l.open_system_settings,
              className: 'positive',
              onClick: () => {
                window.open(this.platform === 'Apple' ? `${this.macURI}?Privacy_Microphone` : `${this.winURI}:privacy-microphone`, '_blank', 'noopener,noreferrer');
                this.closePermissionsDialog(Av.Audio);
              }
            } : {
              key: 'ok',
              label: l.ok_button,
              className: 'positive',
              onClick: () => this.closePermissionsDialog(Av.Audio)
            }]
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
            info: l.shared_mic_err_info.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'),
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
            info: this.platform === 'Windows' ? l.no_camera_system_windows.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>') : l.no_camera_system_mac.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'),
            buttons: [this.platform === 'Apple' || this.platform === 'Windows' ? {
              key: 'open-settings',
              label: l.open_system_settings,
              className: 'positive',
              onClick: () => {
                window.open(this.platform === 'Apple' ? `${this.macURI}?Privacy_Camera` : `${this.winURI}:privacy-webcam`, '_blank', 'noopener,noreferrer');
                this.closePermissionsDialog(Av.Camera);
              }
            } : {
              key: 'ok',
              label: l.ok_button,
              className: 'positive',
              onClick: () => this.closePermissionsDialog(Av.Camera)
            }]
          },
          browser: {
            title: l.no_camera_title,
            cover: 'permissions-camera',
            info: l.allow_camera_access.replace('[X]', '<i class="sprite-fm-theme icon-camera-disabled"></i>'),
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
            info: l.shared_cam_err_info.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'),
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
          info: l.no_screen_system.replace('[A]', `<a href="${this.helpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'),
          buttons: [{
            key: 'open-settings',
            label: l.open_system_settings,
            className: 'positive',
            onClick: () => {
              window.open(`${this.macURI}?Privacy_ScreenCapture`, '_blank', 'noopener,noreferrer');
              this.closePermissionsDialog(Av.Screen);
            }
          }]
        }
      };
      this.state = {
        errMic: '',
        errCamera: '',
        errScreen: '',
        [`dialog-${Av.Audio}`]: null,
        [`dialog-${Av.Camera}`]: null,
        [`dialog-${Av.Screen}`]: null
      };
      this.getPermissionsDialogContent = () => {
        const {
          CONTENT,
          state
        } = this;
        const {
          errMic,
          errCamera
        } = state;
        const {
          browser,
          system,
          nil,
          sharedCam,
          sharedMic,
          sharedGeneric
        } = errors;
        return {
          [Av.Audio]: {
            ...errMic === browser && CONTENT[Av.Audio].browser,
            ...errMic === system && CONTENT[Av.Audio].system,
            ...errMic === nil && CONTENT[Av.Audio].nil,
            ...errMic === sharedMic && CONTENT[Av.Audio].shared,
            ...errMic === sharedGeneric && CONTENT[Av.Audio].shared
          },
          [Av.Camera]: {
            ...errCamera === browser && CONTENT[Av.Camera].browser,
            ...errCamera === system && CONTENT[Av.Camera].system,
            ...errCamera === nil && CONTENT[Av.Camera].nil,
            ...errCamera === sharedCam && CONTENT[Av.Camera].shared,
            ...errCamera === sharedGeneric && CONTENT[Av.Camera].shared
          },
          [Av.Screen]: CONTENT[Av.Screen]
        };
      };
      this.resetError = av => {
        this.setState({
          errMic: av === Av.Audio ? '' : this.state.errMic,
          errCamera: av === Av.Camera ? '' : this.state.errCamera,
          errScreen: av === Av.Screen ? '' : this.state.errScreen
        });
      };
      this.hasToRenderPermissionsWarning = this.hasToRenderPermissionsWarning.bind(this);
      this.renderPermissionsWarning = this.renderPermissionsWarning.bind(this);
    }
    hasToRenderPermissionsWarning(av) {
      const CONFIG = {
        [Av.Audio]: {
          showOnUserActionError: true,
          err: this.state.errMic
        },
        [Av.Camera]: {
          showOnUserActionError: true,
          err: this.state.errCamera
        },
        [Av.Screen]: {
          showOnUserActionError: false,
          err: this.state.errScreen
        }
      };
      const current = CONFIG[av];
      if (current) {
        return isUserActionError(current.err) ? current.showOnUserActionError : current.err;
      }
      return false;
    }
    closePermissionsDialog(av) {
      this.setState({
        [`dialog-${av}`]: false
      }, () => {
        let _this$childRef;
        return (_this$childRef = this.childRef) == null ? void 0 : _this$childRef.safeForceUpdate();
      });
    }
    renderPermissionsDialog(av, child) {
      const content = this.getPermissionsDialogContent();
      const {
        title,
        info,
        buttons,
        cover
      } = content[av] || {};
      return JSX_(_ui_modalDialogs_jsx3__ .A.ModalDialog, {
        dialogName: `${this.namespace}-permissions-${av}`,
        className: `
                        meetings-permissions-dialog
                        dialog-template-message
                        with-close-btn
                        warning
                    `,
        buttons,
        hideOverlay: Component.NAMESPACE === 'preview-meeting' && !document.body.classList.contains('not-logged'),
        onClose: () => {
          this.setState({
            [`dialog-${av}`]: false
          }, () => child && child.safeForceUpdate());
        }
      }, JSX_("header", null, cover ? null : JSX_("div", {
        className: "graphic"
      }, JSX_("i", {
        className: "warning sprite-fm-uni icon-warning"
      })), JSX_("div", {
        className: "info-container"
      }, JSX_("h3", {
        id: "msgDialog-title"
      }, title || l[47]), cover && JSX_("div", {
        className: "permissions-warning-cover"
      }, JSX_("span", {
        className: cover
      })), JSX_(_ui_utils_jsx4__ .P9, {
        tag: "p",
        className: "permissions-warning-info",
        content: info
      }))));
    }
    renderPermissionsWarning(av, child) {
      const {
        errMic,
        errCamera
      } = this.state;
      const dismissed = errMic === errors.dismissed || errCamera === errors.dismissed;
      return JSX_("div", {
        className: `
                        ${this.namespace}
                        meetings-signal-issue
                        simpletip
                        ${dismissed ? 'with-small-area' : ''}
                    `,
        "data-simpletip": l.show_info,
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5",
        "data-simpletip-class": "theme-dark-forced",
        onClick: () => dismissed ? null : this.setState({
          [`dialog-${av}`]: true
        }, () => {
          if (child) {
            this.childRef = child;
          }
        })
      }, JSX_("span", {
        className: "signal-issue-background"
      }), JSX_("i", {
        className: "sprite-fm-mono icon-exclamation-filled"
      }), this.state[`dialog-${av}`] && this.renderPermissionsDialog(av, child));
    }
    componentWillUnmount() {
      super.componentWillUnmount();
      megaChat.unbind(this.observer);
    }
    componentDidMount() {
      super.componentDidMount();
      megaChat.rebind(this.observer, (ev, errAv) => {
        this.setState({
          errMic: errAv && errAv.mic ? String(errAv.mic) : this.state.errMic,
          errCamera: errAv && errAv.camera ? String(errAv.camera) : this.state.errCamera,
          errScreen: errAv && errAv.screen ? String(errAv.screen) : this.state.errScreen
        });
      });
      megaChat.rebind(`onLocalMediaQueryError.${this.namespace}`, (ev, {
        type,
        err
      }) => {
        if (type === 'screen' && String(err) === errors.system) {
          this.setState({
            [`dialog-${Av.Screen}`]: true
          }, () => this.safeForceUpdate());
        }
      });
    }
    render() {
      return JSX_(Component, (0,_babel_runtime_helpers_extends0__ .A)({}, this.props, this.state, {
        errMic: this.state.errMic,
        errCamera: this.state.errCamera,
        errScreen: this.state.errScreen,
        hasToRenderPermissionsWarning: this.hasToRenderPermissionsWarning,
        resetError: this.resetError,
        renderPermissionsWarning: this.renderPermissionsWarning
      }));
    }
  };
};

 },

 2914
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  Loading
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);

class Loading extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.domRef = react0___default().createRef();
    this.PERMISSIONS = {
      VIDEO: 'camera',
      AUDIO: 'microphone'
    };
    this.state = {
      pendingPermissions: false
    };
    this.queryPermissions = name => {
      navigator.permissions.query({
        name
      }).then(status => {
        const {
          name,
          state
        } = status;
        status.onchange = () => name === 'audio_capture' && this.queryPermissions(this.PERMISSIONS.VIDEO);
        if (state === 'prompt') {
          return this.domRef.current && this.setState({
            pendingPermissions: name
          });
        }
      }).catch(ex => console.warn(`Failed to get permissions state: ${ex}`));
    };
    this.renderLoading = () => {
      return JSX_(react0___default().Fragment, null, JSX_("span", null, JSX_("i", {
        className: "sprite-fm-mono icon-video-call-filled"
      })), JSX_("h3", null, this.props.title || l[5533]), JSX_("div", {
        className: "loading-container"
      }, JSX_("div", {
        className: "loading-indication"
      })));
    };
    this.renderDebug = () => {
      const {
        chatRoom
      } = this.props;
      if (chatRoom && chatRoom.call) {
        return JSX_("div", {
          className: `${Loading.NAMESPACE}-debug`
        }, JSX_("div", null, "callId: ", chatRoom.call.callId), JSX_("div", null, "roomId: ", chatRoom.roomId), JSX_("div", null, "isMeeting: ", chatRoom.isMeeting ? 'true' : 'false'));
      }
    };
  }
  componentWillUnmount() {
    megaChat.unbind(`onLocalMediaQueryError.${Loading.NAMESPACE}`);
  }
  componentDidMount() {
    let _notify, _alarm;
    document.dispatchEvent(new Event('closeDropdowns'));
    if ($.dialog) {
      closeDialog == null || closeDialog();
    }
    mega.ui.mInfoPanel.hide();
    (_notify = notify) == null || _notify.closePopup();
    (_alarm = alarm) == null || _alarm.hideAllWarningPopups();
    document.querySelectorAll('.js-dropdown-account').forEach(({
      classList
    }) => classList.contains('show') && classList.remove('show'));
    const {
      chatRoom
    } = this.props;
    const {
      audio,
      video
    } = chatRoom.meetingsLoading;
    const isVideoCall = audio && video;
    if (audio && !video) {
      this.queryPermissions(this.PERMISSIONS.AUDIO);
    }
    if (isVideoCall) {
      Object.values(this.PERMISSIONS).forEach(name => this.queryPermissions(name));
    }
    megaChat.rebind(`onLocalMediaQueryError.${Loading.NAMESPACE}`, (ev, {
      type,
      err
    }) => {
      if (isVideoCall && type === 'mic' && String(err).includes('dismissed')) {
        this.queryPermissions(this.PERMISSIONS.VIDEO);
      }
    });
  }
  render() {
    const {
      pendingPermissions
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: Loading.NAMESPACE
    }, JSX_("div", {
      className: `${Loading.NAMESPACE}-content`
    }, pendingPermissions ? JSX_("h2", null, pendingPermissions === 'audio_capture' ? l.permissions_allow_mic : l.permissions_allow_camera) : this.renderLoading()), d ? this.renderDebug() : '');
  }
}
Loading.NAMESPACE = 'meetings-loading';

 },

 3546
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   A: () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _contacts_jsx2__ = REQ_(8022);
 const _utils_jsx3__ = REQ_(3901);
 const _button_jsx4__ = REQ_(6740);
 const _permissionsObserver_jsx5__ = REQ_(192);






class Preview extends react0___default().Component {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.videoRef = react0___default().createRef();
    this.stream = null;
    this.state = {
      audio: false,
      video: false,
      avatarMeta: undefined
    };
    this.getTrackType = type => !type ? 'getTracks' : type === Preview.STREAMS.AUDIO ? 'getAudioTracks' : 'getVideoTracks';
    this.startStream = type => {
      this.stopStream();
      const {
        audio,
        video
      } = this.state;
      navigator.mediaDevices.getUserMedia({
        audio,
        video
      }).then(stream => {
        const videoRef = this.videoRef.current;
        if (videoRef) {
          videoRef.srcObject = stream;
          this.stream = stream;
          if (this.props.onToggle) {
            this.props.onToggle(this.state.audio, this.state.video);
          }
        }
      }).catch(ex => {
        const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
        return this.domRef.current && this.setState(state => ({
          [stream]: !state[stream]
        }), () => {
          megaChat.trigger('onLocalMediaError', {
            [type === Preview.STREAMS.AUDIO ? 'mic' : 'camera']: `${ex.name}: ${ex.message}`
          });
          console.error(`${ex.name}: ${ex.message}`);
        });
      });
    };
    this.stopStream = type => {
      if (this.stream) {
        const trackType = this.getTrackType(type);
        const tracks = this.stream[trackType]();
        for (const track of tracks) {
          track.stop();
        }
      }
    };
    this.toggleStream = type => {
      let _this$props$resetErro, _this$props;
      const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
      this.setState(state => ({
        [stream]: !state[stream]
      }), () => {
        if (this.props.onToggle) {
          this.props.onToggle(this.state.audio, this.state.video);
        }
        return this.state[stream] ? this.startStream(type) : this.stopStream(type);
      });
      (_this$props$resetErro = (_this$props = this.props).resetError) == null || _this$props$resetErro.call(_this$props, type === Preview.STREAMS.AUDIO ? Av.Audio : Av.Camera);
    };
    this.renderAvatar = () => {
      if ((0,_utils_jsx3__ .P)()) {
        return JSX_("div", {
          className: "avatar-guest"
        }, JSX_("i", {
          className: "sprite-fm-uni icon-owner"
        }));
      }
      if (is_chatlink) {
        const {
          avatarUrl,
          color,
          shortName
        } = this.state.avatarMeta || {};
        return JSX_("div", {
          className: `
                        avatar-wrapper
                        ${color ? `color${color}` : ''}
                    `
        }, avatarUrl && JSX_("img", {
          src: avatarUrl,
          alt: ""
        }), color && JSX_("span", null, shortName));
      }
      return JSX_(_contacts_jsx2__ .eu, {
        contact: M.u[u_handle]
      });
    };
    this.state.audio = this.props.audio || this.state.audio;
    if (this.props.video) {
      this.state.video = this.props.video;
      this.startStream(Preview.STREAMS.VIDEO);
      this.props.onToggle(this.state.audio, this.state.video);
    }
  }
  componentWillUnmount() {
    this.stopStream();
  }
  componentDidMount() {
    if (this.props.onToggle) {
      this.props.onToggle(this.state.audio, this.state.video);
    }
    this.setState({
      avatarMeta: is_chatlink ? generateAvatarMeta(u_handle) : undefined
    });
  }
  render() {
    const {
      NAMESPACE
    } = Preview;
    const {
      hasToRenderPermissionsWarning,
      renderPermissionsWarning
    } = this.props;
    const {
      audio,
      video
    } = this.state;
    const SIMPLETIP_PROPS = {
      label: undefined,
      position: 'top',
      className: 'theme-dark-forced'
    };
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${NAMESPACE}
                    local-stream-mirrored
                `
    }, video && JSX_("div", {
      className: `${NAMESPACE}-video-overlay`
    }), JSX_("video", {
      className: video ? 'streaming' : '',
      muted: true,
      autoPlay: true,
      ref: this.videoRef
    }), !video && this.renderAvatar(), JSX_("div", {
      className: `${NAMESPACE}-controls`
    }, JSX_("div", {
      className: "preview-control-wrapper"
    }, JSX_(_button_jsx4__ .A, {
      simpletip: {
        ...SIMPLETIP_PROPS,
        label: audio ? l[16214] : l[16708]
      },
      className: `
                                mega-button
                                round
                                theme-light-forced
                                ${NAMESPACE}-control
                                ${audio ? '' : 'with-fill'}
                            `,
      icon: audio ? 'icon-mic-thin-outline' : 'icon-mic-off-thin-outline',
      onClick: () => {
        this.toggleStream(Preview.STREAMS.AUDIO);
      }
    }), JSX_("span", null, l.mic_button), hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null), JSX_("div", {
      className: "preview-control-wrapper"
    }, JSX_(_button_jsx4__ .A, {
      simpletip: {
        ...SIMPLETIP_PROPS,
        label: video ? l[22894] : l[22893]
      },
      className: `
                                mega-button
                                round
                                theme-light-forced
                                ${NAMESPACE}-control
                                ${video ? '' : 'with-fill'}
                            `,
      icon: video ? 'icon-video-thin-outline' : 'icon-video-off-thin-outline',
      onClick: () => this.toggleStream(Preview.STREAMS.VIDEO)
    }), JSX_("span", null, l.camera_button), hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null)));
  }
}
Preview.NAMESPACE = 'preview-meeting';
Preview.STREAMS = {
  AUDIO: 1,
  VIDEO: 2
};
 const __WEBPACK_DEFAULT_EXPORT__ = (0,_mixins_js1__ .Zz)(_permissionsObserver_jsx5__ .$)(Preview);

 },

 7128
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  Join
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _ui_modalDialogs_jsx1__ = REQ_(8120);
 const _ui_utils_jsx2__ = REQ_(6411);
 const _button_jsx3__ = REQ_(6740);
 const _preview_jsx4__ = REQ_(3546);
 const _historyPanel_jsx5__ = REQ_(5522);
 const _link_jsx6__ = REQ_(4649);
 const _utils_jsx7__ = REQ_(2153);








class Join extends react0___default().Component {
  constructor(props) {
    super(props);
    this.NAMESPACE = 'join-meeting';
    this.state = {
      preview: false,
      view: _utils_jsx7__ .j.INITIAL,
      firstName: '',
      lastName: '',
      previewAudio: true,
      previewVideo: false,
      ephemeralDialog: false
    };
    this.handleKeyDown = ({
      key
    }) => {
      let _this$props$onClose, _this$props;
      return key && key === 'Escape' ? (_this$props$onClose = (_this$props = this.props).onClose) == null ? void 0 : _this$props$onClose.call(_this$props) : true;
    };
    this.showPanels = () => {
      return [document.querySelector('.nw-fm-left-icons-panel'), document.querySelector('.chat-app-container')].map(el => el && el.classList.remove('hidden'));
    };
    this.hidePanels = () => {
      return [document.querySelector('.nw-fm-left-icons-panel'), document.querySelector('.chat-app-container')].map(el => el && el.classList.add('hidden'));
    };
    this.showConfirmationDialog = () => {
      megaChat.destroy();
      return mega.ui.sendSignupLinkDialog(JSON.parse(localStorage.awaitingConfirmationAccount), () => {
        delete localStorage.awaitingConfirmationAccount;
        u_logout(true).then(() => location.reload());
      });
    };
    this.Ephemeral = () => {
      const onCancel = () => this.setState({
        ephemeralDialog: false
      });
      const msgFragments = l.ephemeral_data_lost.split(/\[A]|\[\/A]/);
      return JSX_(_ui_modalDialogs_jsx1__ .A.ModalDialog, {
        name: "end-ephemeral",
        dialogType: "message",
        icon: "sprite-fm-uni icon-warning",
        title: l.ephemeral_data_lost_title,
        noCloseOnClickOutside: true,
        buttons: [{
          key: 'cancel',
          label: l.msg_dlg_cancel,
          onClick: onCancel
        }, {
          key: 'continue',
          label: l[507],
          className: 'positive',
          onClick: () => {
            u_logout(true).then(() => location.reload());
            sessionStorage.guestForced = true;
          }
        }],
        onClose: onCancel
      }, JSX_("p", null, msgFragments[0], JSX_(_link_jsx6__ .A, {
        to: "/register",
        onClick: () => loadSubPage('register')
      }, msgFragments[1]), msgFragments[2]));
    };
    this.Head = () => {
      let _this$props$chatRoom;
      return JSX_("div", {
        className: `${this.NAMESPACE}-head`
      }, JSX_("div", {
        className: `${this.NAMESPACE}-logo`
      }, JSX_("i", {
        className: `
                            sprite-fm-illustration-wide
                            ${mega.ui.isDarkTheme() ? 'mega-logo-dark' : 'img-mega-logo-light'}
                        `
      })), JSX_("h1", null, JSX_(_ui_utils_jsx2__ .zT, null, l.you_have_invitation.replace('%1', (_this$props$chatRoom = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom.topic))), isEphemeral() && JSX_("div", {
        className: "ephemeral-info"
      }, JSX_("i", {
        className: "sprite-fm-uni icon-warning"
      }), JSX_("p", null, l.ephemeral_data_store_lost)));
    };
    this.Intro = () => {
      const $$CONTAINER = ({
        children
      }) => JSX_(react0___default().Fragment, null, JSX_("div", {
        className: `${this.NAMESPACE}-content`
      }, children), this.Chat());
      if (isEphemeral()) {
        return JSX_($$CONTAINER, null, JSX_(_button_jsx3__ .A, {
          className: "mega-button positive",
          onClick: () => this.setState({
            ephemeralDialog: true
          })
        }, l.join_as_guest), JSX_(_button_jsx3__ .A, {
          className: "mega-button",
          onClick: () => loadSubPage('register')
        }, l[5582]), JSX_("span", null, l[5585], JSX_("a", {
          href: "#",
          onClick: () => mega.ui.showLoginRequiredDialog({
            minUserType: 3,
            skipInitialDialog: 1
          }).done(() => this.setState({
            view: _utils_jsx7__ .j.ACCOUNT
          }))
        }, l[171])));
      }
      return JSX_($$CONTAINER, null, JSX_(_button_jsx3__ .A, {
        className: "mega-button positive",
        onClick: () => this.setState({
          view: _utils_jsx7__ .j.GUEST
        })
      }, l.join_as_guest), JSX_(_button_jsx3__ .A, {
        className: "mega-button",
        onClick: () => {
          let _this$props$chatRoom2;
          megaChat.loginOrRegisterBeforeJoining((_this$props$chatRoom2 = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom2.publicChatHandle, false, true, undefined, () => this.setState({
            view: _utils_jsx7__ .j.ACCOUNT
          }));
        }
      }, l[171]), JSX_("p", null, JSX_(_ui_utils_jsx2__ .P9, {
        onClick: e => {
          e.preventDefault();
          megaChat.loginOrRegisterBeforeJoining(this.props.chatRoom.publicChatHandle, true, undefined, undefined, () => this.setState({
            view: _utils_jsx7__ .j.ACCOUNT
          }));
        }
      }, l[20635])));
    };
    this.Chat = () => {
      const {
        chatRoom
      } = this.props;
      const {
        preview
      } = this.state;
      return JSX_("div", {
        className: `
                    ${this.NAMESPACE}-chat
                    ${preview ? 'expanded' : ''}
                `
      }, JSX_("div", {
        className: "chat-content"
      }, JSX_("div", {
        className: "chat-content-head",
        onClick: () => this.setState({
          preview: !preview
        })
      }, JSX_(_ui_utils_jsx2__ .zT, null, chatRoom.topic), JSX_(_button_jsx3__ .A, {
        icon: "icon-minimise"
      })), preview && JSX_("div", {
        className: "chat-body"
      }, JSX_(_historyPanel_jsx5__ .A, {
        chatRoom,
        onMount: cmp => {
          let _cmp$messagesListScro;
          return (_cmp$messagesListScro = cmp.messagesListScrollable) == null ? void 0 : _cmp$messagesListScro.scrollToBottom();
        }
      }))));
    };
    this.Card = ({
      children
    }) => {
      const {
        previewAudio,
        previewVideo
      } = this.state;
      return JSX_("div", {
        className: "card"
      }, JSX_("div", {
        className: "card-body"
      }, children, JSX_("div", null, JSX_(_link_jsx6__ .A, {
        to: "https://mega.io/chatandmeetings",
        target: "_blank"
      }, l.how_meetings_work))), JSX_("div", {
        className: "card-preview"
      }, JSX_(_preview_jsx4__ .A, {
        audio: previewAudio,
        video: previewVideo,
        context: this.NAMESPACE,
        onToggle: (audio, video) => this.setState({
          previewAudio: audio,
          previewVideo: video
        })
      })));
    };
    this.Field = ({
      name,
      children
    }) => {
      let _this$state$name;
      return JSX_("div", {
        className: `
                    mega-input
                    title-ontop
                    ${(_this$state$name = this.state[name]) != null && _this$state$name.length ? 'valued' : ''}
                `
      }, JSX_("div", {
        className: "mega-input-title"
      }, children, JSX_("span", {
        className: "required-red"
      }, "*")), JSX_("input", {
        type: "text",
        name,
        className: "titleTop required megaInputs",
        placeholder: children,
        value: this.state[name] || '',
        maxLength: 40,
        onChange: ev => this.setState({
          [name]: ev.target.value
        })
      }));
    };
    this.Guest = () => JSX_(this.Card, null, JSX_("h2", null, l.enter_name_join_meeting), JSX_("div", {
      className: "card-fields"
    }, JSX_(this.Field, {
      name: "firstName"
    }, l[1096]), JSX_(this.Field, {
      name: "lastName"
    }, l[1097])), JSX_(_button_jsx3__ .A, {
      className: `
                    mega-button
                    positive
                    large
                    ${this.state.firstName.length && this.state.lastName.length ? '' : 'disabled'}
                    ${this.state.joining && " loading disabled"}
                `,
      onClick: () => {
        if (this.state.joining) {
          return;
        }
        let {
          firstName,
          lastName,
          previewAudio,
          previewVideo
        } = this.state;
        firstName = firstName && firstName.trim();
        lastName = lastName && lastName.trim();
        if (firstName && lastName && firstName.length > 0 && lastName.length > 0) {
          this.setState({
            'joining': true
          });
          if (this.props.chatRoom.scheduledMeeting) {
            delay('chat-event-sm-guest-join', () => eventlog(99929));
          }
          this.props.onJoinGuestClick(firstName, lastName, previewAudio, previewVideo);
        }
      }
    }, l.join_chat_button));
    this.Account = () => JSX_(this.Card, null, JSX_("h4", null, l.join_meeting), JSX_(_button_jsx3__ .A, {
      className: `mega-button positive large ${this.state.joining && " loading disabled"}`,
      onClick: () => {
        if (!this.state.joining) {
          this.setState({
            'joining': true
          });
          this.props.onJoinClick(this.state.previewAudio, this.state.previewVideo);
        }
      }
    }, l.join_chat_button));
    this.Unsupported = () => JSX_("div", {
      className: "meetings-unsupported-container"
    }, JSX_("i", {
      className: "sprite-fm-uni icon-error"
    }), JSX_("div", {
      className: "unsupported-info"
    }, JSX_("h3", null, l.heading_unsupported_browser), JSX_("h3", null, l.join_meeting_methods), JSX_("ul", null, JSX_("li", null, l.join_via_link), JSX_("li", null, JSX_(_ui_utils_jsx2__ .P9, null, l.join_via_mobile.replace('[A]', '<a href="https://mega.io/mobile" target="_blank" class="clickurl">').replace('[/A]', '</a>'))))));
    this.View = view => {
      switch (view) {
        default:
          return this.Intro();
        case _utils_jsx7__ .j.GUEST:
          return this.Guest();
        case _utils_jsx7__ .j.ACCOUNT:
          return this.Account();
        case _utils_jsx7__ .j.UNSUPPORTED:
          return this.Unsupported();
      }
    };
    this.state.view = sessionStorage.guestForced ? _utils_jsx7__ .j.GUEST : props.initialView || this.state.view;
    if (localStorage.awaitingConfirmationAccount) {
      this.showConfirmationDialog();
    }
  }
  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    this.hidePanels();
    megaChat._joinDialogIsShown = true;
    alarm.hideAllWarningPopups();
    sessionStorage.removeItem('guestForced');
    if (!megaChat.hasSupportForCalls) {
      this.setState({
        view: _utils_jsx7__ .j.UNSUPPORTED
      });
    }
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.showPanels();
    megaChat._joinDialogIsShown = false;
    if (this.props.onClose) {
      this.props.onClose();
    }
  }
  render() {
    const {
      view,
      ephemeralDialog
    } = this.state;
    return JSX_(_ui_utils_jsx2__ .Ay.RenderTo, {
      element: document.body
    }, JSX_("div", {
      className: this.NAMESPACE
    }, this.Head(), this.View(view), ephemeralDialog && JSX_(this.Ephemeral, null)));
  }
}

 },

 8402
(_, EXP_, REQ_) {

// ESM COMPAT FLAG
REQ_.r(EXP_);

// EXPORTS
REQ_.d(EXP_, {
  "default": () =>  Call
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/chat/chatGlobalEventManager.jsx
const chatGlobalEventManager = REQ_(8676);
// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const utils = REQ_(3901);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const ui_contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const ui_utils = REQ_(6411);
;// ./js/chat/ui/meetings/videoNode.jsx





class VideoNode extends mixins.w9 {
  constructor(props, source) {
    super(props);
    this.domRef = REaCt().createRef();
    this.contRef = REaCt().createRef();
    this.audioLevelRef = REaCt().createRef();
    this.statsHudRef = REaCt().createRef();
    this.raisedHandListener = undefined;
    this.state = {
      raisedHandPeers: []
    };
    this.source = source;
    this.state.raisedHandPeers = this.props.raisedHandPeers || [];
  }
  componentDidMount() {
    let _this$props$didMount, _this$props, _this$domRef;
    super.componentDidMount();
    this.source.registerConsumer(this);
    (_this$props$didMount = (_this$props = this.props).didMount) == null || _this$props$didMount.call(_this$props, (_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current);
    this.requestVideo(true);
    this.raisedHandListener = mBroadcaster.addListener('meetings:raisedHand', raisedHandPeers => this.setState({
      raisedHandPeers
    }, () => this.safeForceUpdate()));
  }
  onVisibilityChange(isVisible) {
    this.requestVideo(isVisible);
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    if (this.props.didUpdate) {
      let _this$domRef2;
      this.props.didUpdate((_this$domRef2 = this.domRef) == null ? void 0 : _this$domRef2.current);
    }
    this.requestVideo();
  }
  onAvChange() {
    this.safeForceUpdate();
  }
  displayVideoElement(video, container) {
    this.attachVideoElemHandlers(video);
    this.video = video;
    container.replaceChildren(video);
  }
  attachVideoElemHandlers(video) {
    if (video._snSetup) {
      return;
    }
    video.autoplay = true;
    video.controls = false;
    video.muted = true;
    video.ondblclick = e => {
      const {
        onDoubleClick,
        toggleFullScreen
      } = this.props;
      onDoubleClick == null || onDoubleClick(this.source, e);
      if (toggleFullScreen && !document.fullscreenElement && this.domRef.current) {
        if (typeof toggleFullScreen === 'function') {
          toggleFullScreen(this);
        }
        this.domRef.current.requestFullscreen({
          navigationUI: 'hide'
        });
      }
    };
    video.onloadeddata = ev => {
      if (this.props.onLoadedData) {
        this.props.onLoadedData(ev);
      }
    };
    video._snSetup = true;
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    delete this.video;
    this.detachVideoElemHandlers();
    this.source.deregisterConsumer(this);
    mBroadcaster.removeListener(this.raisedHandListener);
    if (this.props.willUnmount) {
      this.props.willUnmount();
    }
  }
  detachVideoElemHandlers() {
    let _this$contRef$current;
    const video = (_this$contRef$current = this.contRef.current) == null ? void 0 : _this$contRef$current.firstChild;
    if (!video || !video._snSetup) {
      return;
    }
    video.onloadeddata = null;
    video.ondblclick = null;
    delete video._snSetup;
  }
  isVideoCropped() {
    let _this$video;
    return (_this$video = this.video) == null ? void 0 : _this$video.classList.contains("video-crop");
  }
  cropVideo() {
    let _this$video2;
    (_this$video2 = this.video) == null || _this$video2.classList.add("video-crop");
  }
  uncropVideo() {
    let _this$video3;
    (_this$video3 = this.video) == null || _this$video3.classList.remove("video-crop");
  }
  displayStats(stats) {
    const elem = this.statsHudRef.current;
    if (!elem) {
      return;
    }
    elem.textContent = stats ? `${stats} (${this.ownVideo ? "cloned" : "ref"})` : "";
  }
  renderVideoDebugMode() {
    if (this.source.isFake) {
      return null;
    }
    let className = "video-rtc-stats";
    let title;
    if (this.isLocal) {
      if (window.sfuClient) {
        title = new URL(window.sfuClient.url).host;
      }
      if (this.props.isSelfOverlay) {
        className += " video-rtc-stats-ralign";
      }
    }
    if (!title) {
      title = "";
    }
    return JSX_("div", {
      ref: this.statsHudRef,
      className,
      title
    });
  }
  renderContent() {
    const {
      source,
      contRef
    } = this;
    if (this.props.isPresenterNode || source.av & Av.Camera) {
      return JSX_("div", {
        ref: contRef,
        className: "video-node-holder video-node-loading"
      });
    }
    delete this._lastResizeHeight;
    return JSX_(ui_contacts.eu, {
      contact: M.u[source.userHandle]
    });
  }
  getStatusIcon(icon, label) {
    return JSX_("span", {
      className: "simpletip",
      "data-simpletip-class": "theme-dark-forced",
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip": label
    }, JSX_("i", {
      className: icon
    }));
  }
  renderStatus() {
    const {
      chatRoom,
      isPresenterNode,
      minimized
    } = this.props;
    const {
      raisedHandPeers
    } = this.state;
    const {
      source
    } = this;
    const {
      sfuClient
    } = chatRoom.call;
    const {
      userHandle,
      isOnHold
    } = source;
    const $$CONTAINER = ({
      children
    }) => JSX_("div", {
      className: "video-node-status theme-dark-forced"
    }, children);
    const name = JSX_("div", {
      className: "video-status-name"
    }, isPresenterNode ? JSX_(ui_utils.zT, null, l.presenter_nail.replace('%s', M.getNameByHandle(userHandle))) : JSX_(ui_contacts.uA, {
      contact: M.u[userHandle],
      emoji: true
    }));
    if (isOnHold) {
      return JSX_($$CONTAINER, null, name, this.getStatusIcon('sprite-fm-mono icon-pause', l[23542].replace('%s', M.getNameByHandle(userHandle) || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER)));
    }
    return JSX_(REaCt().Fragment, null, !minimized && JSX_("div", {
      className: "stream-signifiers"
    }, raisedHandPeers && raisedHandPeers.length && raisedHandPeers.includes(userHandle) ? this.getStatusIcon('sprite-fm-uni stream-signifier-icon icon-raise-hand') : null), JSX_($$CONTAINER, null, name, JSX_(AudioLevelIndicator, {
      source
    }), sfuClient.haveBadNetwork ? this.getStatusIcon('sprite-fm-mono icon-call-offline', l.poor_connection) : null));
  }
  render() {
    const {
      mode,
      chatRoom,
      simpletip,
      className,
      children,
      onClick
    } = this.props;
    const {
      domRef,
      source,
      isLocal,
      isLocalScreen
    } = this;
    if (!chatRoom.call) {
      return null;
    }
    const {
      call
    } = chatRoom;
    const isActiveSpeaker = !source.audioMuted && call.speakerCid === source.clientId;
    return JSX_("div", {
      ref: domRef,
      className: `
                    video-node
                    ${onClick ? 'clickable' : ''}
                    ${className || ''}
                    ${isLocal && !isLocalScreen ? ' local-stream-mirrored' : ''}
                    ${simpletip ? 'simpletip' : ''}
                    ${isActiveSpeaker && mode === utils.g.THUMBNAIL ? 'active-speaker' : ''}
                `,
      "data-simpletip": simpletip == null ? void 0 : simpletip.label,
      "data-simpletipposition": simpletip == null ? void 0 : simpletip.position,
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": simpletip == null ? void 0 : simpletip.className,
      onClick: evt => onClick == null ? void 0 : onClick(source, evt)
    }, source && JSX_(REaCt().Fragment, null, children || null, JSX_("div", {
      className: "video-node-content"
    }, CallManager2.Call.VIDEO_DEBUG_MODE ? this.renderVideoDebugMode() : null, this.renderContent(), this.renderStatus())));
  }
}
class DynVideo extends VideoNode {
  onAvChange() {
    this._lastResizeHeight = null;
    super.onAvChange();
  }
  dynRequestVideo() {
    const {
      source,
      domRef
    } = this;
    if (source.isFake || source.isDestroyed) {
      return;
    }
    if (source.isStreaming() && this.isMounted()) {
      const node = domRef == null ? void 0 : domRef.current;
      this.dynRequestVideoBySize(node.offsetHeight);
    } else {
      this.dynRequestVideoBySize(0);
      this.displayStats(null);
    }
  }
  dynRequestVideoQuality(quality) {
    this.requestedQ = quality && CallManager2.FORCE_LOWQ ? 1 : quality;
    if (!this.source.dynUpdateVideoQuality()) {
      this.dynUpdateVideoElem();
    }
  }
  dynRequestVideoBySize(h) {
    if (h === 0) {
      this._lastResizeHeight = 0;
      this.dynRequestVideoQuality(CallManager2.VIDEO_QUALITY.NO_VIDEO);
      return;
    }
    if (this.contRef.current) {
      if (this._lastResizeHeight === h) {
        return;
      }
      this._lastResizeHeight = h;
    } else {
      this._lastResizeHeight = null;
    }
    let newQ;
    if (h > 360) {
      newQ = CallManager2.VIDEO_QUALITY.HIGH;
    } else if (h > 180) {
      newQ = CallManager2.VIDEO_QUALITY.MEDIUM;
    } else if (h > 90 || this.noThumb) {
      newQ = CallManager2.VIDEO_QUALITY.LOW;
    } else {
      newQ = CallManager2.VIDEO_QUALITY.THUMB;
    }
    this.dynRequestVideoQuality(newQ);
  }
  dynUpdateVideoElem() {
    let _this$source$hiResPla;
    const vidCont = this.contRef.current;
    if (!this.isMounted() || !vidCont) {
      return;
    }
    const player = this.noThumb ? (_this$source$hiResPla = this.source.hiResPlayer) == null || (_this$source$hiResPla = _this$source$hiResPla.gui) == null ? void 0 : _this$source$hiResPla.video : this.source.player;
    if (!player) {
      vidCont.replaceChildren();
      return;
    }
    this.dynSetVideoSource(player, vidCont);
  }
}
class DynVideoDirect extends DynVideo {
  constructor(props, source) {
    super(props, source);
    this.isDirect = true;
    this.requestVideo = this.dynRequestVideo;
  }
  dynSetVideoSource(srcPlayer, vidCont) {
    if (vidCont.firstChild !== srcPlayer) {
      this.displayVideoElement(srcPlayer, vidCont);
    }
    if (srcPlayer.paused) {
      srcPlayer.play().catch(nop);
    }
  }
}
class PeerVideoHiRes extends DynVideoDirect {
  constructor(props) {
    super(props, props.source);
  }
}
class DynVideoCloned extends DynVideo {
  constructor(props, source) {
    super(props, source);
    this.ownVideo = CallManager2.createVideoElement();
  }
  dynSetVideoSource(srcPlayer, vidCont) {
    const cloned = this.ownVideo;
    const currVideo = vidCont.firstChild;
    if (!currVideo) {
      this.displayVideoElement(cloned, vidCont);
    } else {
      assert(currVideo === cloned);
    }
    if (cloned.paused || cloned.srcObject !== srcPlayer.srcObject) {
      cloned.srcObject = srcPlayer.srcObject;
      Promise.resolve(cloned.play()).catch(nop);
    }
  }
}
class PeerVideoThumb extends DynVideoCloned {
  constructor(props) {
    super(props, props.source);
    this.requestVideo = this.dynRequestVideo;
  }
}
class PeerVideoThumbFixed extends VideoNode {
  constructor(props) {
    super(props, props.source);
    assert(props.source.hasScreenAndCam);
    this.ownVideo = CallManager2.createVideoElement();
    if (CallManager2.Call.VIDEO_DEBUG_MODE) {
      this.onRxStats = this._onRxStats;
    }
  }
  addVideo() {
    assert(this.source.hasScreenAndCam);
    const vidCont = this.contRef.current;
    assert(vidCont);
    if (vidCont.firstChild !== this.ownVideo) {
      this.displayVideoElement(this.ownVideo, vidCont);
    }
  }
  delVideo() {
    SfuClient.playerStop(this.ownVideo);
    const vidCont = this.contRef.current;
    if (!vidCont) {
      return;
    }
    vidCont.replaceChildren();
  }
  requestVideo(forceVisible) {
    if (!this.isComponentVisible() && !forceVisible) {
      return;
    }
    if (this.player) {
      this.playVideo();
    } else {
      this.addVideo();
      this.player = this.source.sfuPeer.getThumbVideo(() => {
        return this;
      });
    }
  }
  playVideo() {
    let _this$player$slot;
    const track = (_this$player$slot = this.player.slot) == null ? void 0 : _this$player$slot.inTrack;
    if (!track) {
      return;
    }
    SfuClient.playerPlay(this.ownVideo, track, true);
  }
  attachToTrack(track) {
    if (!this.source.hasScreenAndCam) {
      return;
    }
    SfuClient.playerPlay(this.ownVideo, track);
  }
  detachFromTrack() {
    this.delVideo();
  }
  onPlayerDestroy() {
    delete this.player;
  }
  componentWillUnmount() {
    if (this.player) {
      this.player.destroy();
    }
    super.componentWillUnmount();
  }
  _onRxStats(track, info, raw) {
    if (this.player) {
      this.displayStats(CallManager2.Call.rxStatsToText(track, info, raw));
    }
  }
}
class PeerVideoHiResCloned extends DynVideoCloned {
  constructor(props) {
    super(props, props.source);
    this.noThumb = true;
    this.requestVideo = this.dynRequestVideo;
  }
}
class LocalVideoHiResCloned extends VideoNode {
  constructor(props) {
    super(props, props.chatRoom.call.getLocalStream());
    this.isLocal = true;
    this.ownVideo = CallManager2.createVideoElement();
  }
  get isLocalScreen() {
    return this.source.av & Av.Screen;
  }
  requestVideo(forceVisible) {
    if (d > 1 && forceVisible) {
      console.debug('ignoring forceVisible');
    }
    const vidCont = this.contRef.current;
    if (!vidCont) {
      return;
    }
    const track = this.source.sfuClient.localScreenTrack();
    if (!track) {
      vidCont.replaceChildren();
    } else {
      if (vidCont.firstChild !== this.ownVideo) {
        this.displayVideoElement(this.ownVideo, vidCont);
      }
      SfuClient.playerPlay(this.ownVideo, track, true);
    }
  }
}
class LocalVideoHiRes extends DynVideoDirect {
  constructor(props) {
    super(props, props.chatRoom.call.getLocalStream());
    this.isLocal = true;
  }
  get isLocalScreen() {
    return this.source.av & Av.Screen;
  }
}
class LocalVideoThumb extends VideoNode {
  constructor(props) {
    const source = props.chatRoom.call.getLocalStream();
    super(props, source);
    this.isLocal = true;
    this.isLocalScreen = source.av & Av.Screen && !(source.av & Av.Camera);
    this.sfuClient = props.chatRoom.call.sfuClient;
    this.ownVideo = CallManager2.createVideoElement();
  }
  requestVideo() {
    const vidCont = this.contRef.current;
    if (!vidCont) {
      return;
    }
    const currVideo = vidCont.firstChild;
    const track = this.isLocalScreen ? this.sfuClient.localScreenTrack() : this.sfuClient.localCameraTrack();
    if (!track) {
      if (currVideo) {
        vidCont.replaceChildren();
      }
    } else {
      if (!currVideo) {
        this.displayVideoElement(this.ownVideo, vidCont);
      } else {
        assert(currVideo === this.ownVideo);
      }
      SfuClient.playerPlay(this.ownVideo, track, true);
    }
  }
  onAvChange() {
    const av = this.sfuClient.availAv;
    this.isLocalScreen = av & Av.Screen && !(av & Av.Camera);
    super.onAvChange();
  }
}
class AudioLevelIndicator extends REaCt().Component {
  constructor(props) {
    super(props);
    this.source = props.source;
    this.indicatorRef = REaCt().createRef();
    this.updateAudioLevel = this.updateAudioLevel.bind(this);
  }
  componentDidMount() {
    this.source.registerVuLevelConsumer(this);
  }
  componentWillUnmount() {
    this.source.unregisterVuLevelConsumer(this);
  }
  updateAudioLevel(level) {
    const levelInd = this.indicatorRef.current;
    if (!levelInd) {
      return;
    }
    level = Math.round(level * 400);
    if (level > 90) {
      level = 90;
    }
    levelInd.style.height = `${level + 10}%`;
  }
  render() {
    const {
      audioMuted
    } = this.source;
    return JSX_("span", {
      className: "simpletip",
      "data-simpletip-class": "theme-dark-forced",
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip": audioMuted ? l.muted : ''
    }, JSX_("i", {
      className: `
                        sprite-fm-mono
                        ${audioMuted ? 'icon-mic-off-thin-outline inactive' : 'icon-mic-thin-outline speaker-indicator'}
                    `
    }, audioMuted ? null : JSX_("div", {
      ref: this.indicatorRef,
      className: "mic-fill"
    })));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
const meetings_button = REQ_(6740);
// EXTERNAL MODULE: ./js/chat/ui/inviteParticipantsPanel.jsx
const inviteParticipantsPanel = REQ_(8956);
;// ./js/chat/ui/meetings/participantsNotice.jsx






class ParticipantsNotice extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.renderUserAlone = () => JSX_("div", {
      className: `
                ${ParticipantsNotice.NAMESPACE}
                theme-dark-forced
                user-alone
            `
    }, this.props.stayOnEnd ? JSX_("div", {
      className: `${ParticipantsNotice.NAMESPACE}-heading`
    }, JSX_("h1", null, this.props.everHadPeers ? l.only_one_here : l.waiting_for_others)) : JSX_("div", {
      className: `${ParticipantsNotice.NAMESPACE}-content user-alone`
    }, JSX_("h3", null, l.only_one_here), JSX_("p", {
      className: "theme-dark-forced"
    }, JSX_(ui_utils.P9, null, l.empty_call_dlg_text.replace('%s', '2'))), JSX_("div", {
      className: "notice-footer"
    }, JSX_(meetings_button.A, {
      className: "mega-button large stay-on-call",
      onClick: this.props.onStayConfirm
    }, JSX_("span", null, l.empty_call_stay_button)), JSX_(meetings_button.A, {
      className: "mega-button positive large stay-on-call",
      onClick: this.props.onCallEnd
    }, JSX_("span", null, l.empty_call_dlg_end)))));
    this.renderUserWaiting = () => {
      const {
        chatRoom,
        onInviteToggle
      } = this.props;
      return JSX_("div", {
        className: `
                    ${ParticipantsNotice.NAMESPACE}
                    ${chatRoom.isMeeting ? '' : 'user-alone'}
                    theme-dark-forced
                `
      }, JSX_("div", {
        className: `${ParticipantsNotice.NAMESPACE}-heading`
      }, chatRoom.type === 'private' ? JSX_("h1", null, JSX_(ui_utils.zT, null, l.waiting_for_peer.replace('%NAME', chatRoom.getRoomTitle()))) : JSX_("h1", null, l.waiting_for_others)), chatRoom.isMeeting && chatRoom.publicLink && JSX_("div", {
        className: `${ParticipantsNotice.NAMESPACE}-content-invite`
      }, JSX_(inviteParticipantsPanel.Q, {
        chatRoom,
        disableLinkToggle: true,
        onAddParticipants: () => {
          this.setState({
            inviteDialog: false
          }, () => onInviteToggle());
        }
      })));
    };
    this.av = this.props.call.sfuClient.availAv;
  }
  specShouldComponentUpdate(newProps) {
    const {
      stayOnEnd,
      hasLeft,
      isOnHold,
      call
    } = this.props;
    const currAv = this.av;
    this.av = call.sfuClient.availAv;
    return newProps.stayOnEnd !== stayOnEnd || newProps.hasLeft !== hasLeft || newProps.isOnHold !== isOnHold || this.av !== currAv;
  }
  render() {
    const {
      call,
      hasLeft,
      streamContainer,
      chatRoom
    } = this.props;
    if (call.isDestroyed) {
      return null;
    }
    return JSX_("div", {
      ref: this.domRef,
      className: `${ParticipantsNotice.NAMESPACE}-container`
    }, call.isSharingScreen() ? null : JSX_(LocalVideoHiRes, {
      className: "local-stream-mirrored",
      chatRoom,
      source: call.getLocalStream()
    }), streamContainer(hasLeft ? this.renderUserAlone() : this.renderUserWaiting()));
  }
}
ParticipantsNotice.NAMESPACE = 'participants-notice';
// EXTERNAL MODULE: ./js/chat/ui/chatToaster.jsx
const chatToaster = REQ_(8491);
;// ./js/chat/ui/meetings/participantsBlock.jsx






const MAX_STREAMS_PER_PAGE = 10;
const SIMPLE_TIP = {
  position: 'top',
  offset: 5,
  className: 'theme-dark-forced'
};
class ParticipantsBlock extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.nodeMenuRef = REaCt().createRef();
    this.dupNodeMenuRef = REaCt().createRef();
    this.state = {
      page: 0
    };
    this.movePage = direction => this.setState(state => ({
      page: direction === utils.Bq.NEXT ? state.page + 1 : state.page - 1
    }));
    this.renderLocalNode = isPresenterNode => {
      const {
        call,
        peers,
        mode,
        raisedHandPeers,
        chatRoom,
        forcedLocal,
        presenterThumbSelected,
        onSeparate,
        onSpeakerChange,
        onModeChange
      } = this.props;
      const localStream = call.getLocalStream();
      if (localStream) {
        const IS_SPEAKER_VIEW = mode === utils.g.MAIN && forcedLocal;
        const VideoClass = isPresenterNode ? LocalVideoHiResCloned : LocalVideoThumb;
        let isActive = false;
        if (isPresenterNode) {
          isActive = forcedLocal && !presenterThumbSelected;
        } else if (call.pinnedCid === 0 || forcedLocal) {
          if (presenterThumbSelected) {
            isActive = !isPresenterNode;
          } else if (localStream.hasScreen) {
            isActive = isPresenterNode;
          } else {
            isActive = true;
          }
        }
        return JSX_(VideoClass, {
          key: `${u_handle}${isPresenterNode ? '_block' : ''}`,
          className: `
                        local-stream-node
                        ${call.isSharingScreen() ? '' : 'local-stream-mirrored'}
                        ${isActive ? 'active' : ''}
                        ${call.speakerCid === 0 ? 'active-speaker' : ''}
                    `,
          simpletip: {
            ...SIMPLE_TIP,
            label: l[8885]
          },
          mode,
          raisedHandPeers,
          chatRoom,
          source: localStream,
          localAudioMuted: !(call.av & SfuClient.Av.Audio),
          isPresenterNode,
          onClick: (source, ev) => {
            const nodeMenuRef = isPresenterNode ? this.nodeMenuRef && this.nodeMenuRef.current : this.dupNodeMenuRef && this.dupNodeMenuRef.current;
            if (nodeMenuRef && nodeMenuRef.contains(ev.target)) {
              ev.preventDefault();
              ev.stopPropagation();
              return;
            }
            return onSpeakerChange(localStream, !isPresenterNode);
          }
        }, (peers == null ? void 0 : peers.length) && JSX_("div", {
          ref: isPresenterNode ? this.nodeMenuRef : this.dupNodeMenuRef,
          className: "node-menu theme-dark-forced"
        }, JSX_("div", {
          className: "node-menu-toggle"
        }, JSX_("i", {
          className: "sprite-fm-mono icon-more-horizontal-thin-outline"
        })), JSX_("div", {
          className: "node-menu-content"
        }, JSX_("ul", null, JSX_("li", null, JSX_(meetings_button.A, {
          icon: `
                                                sprite-fm-mono
                                                ${IS_SPEAKER_VIEW ? 'grid-9' : 'grid-main'}
                                            `,
          onClick: () => {
            if (IS_SPEAKER_VIEW) {
              return onModeChange(utils.g.THUMBNAIL);
            }
            return onSpeakerChange(localStream);
          }
        }, JSX_("span", null, IS_SPEAKER_VIEW ? l.switch_to_thumb_view : l.display_in_main_view))), JSX_("li", null, JSX_(meetings_button.A, {
          icon: "sprite-fm-mono grid-separate",
          onClick: onSeparate
        }, JSX_("span", null, l.separate_from_grid_button)))))));
      }
      return null;
    };
    this.onScroll = (chunks, evt) => {
      const {
        page
      } = this.state;
      if (evt.deltaY < 0) {
        if (page > 0) {
          this.movePage(utils.Bq.PREV);
        }
      } else if (evt.deltaY > 0) {
        if (page < Object.values(chunks).length - 1) {
          this.movePage(utils.Bq.NEXT);
        }
      }
    };
  }
  shouldComponentUpdate() {
    const {
      peers
    } = this.props;
    return peers && peers.length;
  }
  render() {
    const {
      call,
      mode,
      peers,
      floatDetached,
      chatRoom,
      raisedHandPeers,
      presenterThumbSelected,
      onSpeakerChange
    } = this.props;
    if (peers && peers.length) {
      const {
        screen,
        video,
        rest
      } = filterAndSplitSources(peers, call);
      const sources = [...screen, ...video, ...rest];
      const $$PEER = (peer, i) => {
        const {
          clientId,
          userHandle,
          hasScreenAndCam,
          hasScreen,
          isLocal
        } = peer;
        if (screen.length && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)) {
          screen.shift();
        }
        if (!(peer instanceof CallManager2.Peer)) {
          const isPresenterNode = screen.length && screen[0].isLocal;
          if (floatDetached && !isPresenterNode) {
            return;
          }
          return this.renderLocalNode(!floatDetached && isPresenterNode);
        }
        const presenterCid = screen.length && screen[0].clientId === clientId;
        let PeerClass;
        if (hasScreenAndCam) {
          PeerClass = presenterCid ? PeerVideoHiResCloned : PeerVideoThumbFixed;
        } else {
          PeerClass = PeerVideoThumb;
        }
        assert(!presenterCid || hasScreen);
        const isActiveSpeaker = !peer.audioMuted && call.speakerCid === peer.clientId;
        let isActive = false;
        if (call.pinnedCid === clientId) {
          if (presenterThumbSelected) {
            isActive = !presenterCid;
          } else if (hasScreen) {
            isActive = presenterCid;
          } else {
            isActive = true;
          }
        }
        const name = M.getNameByHandle(userHandle);
        let label = name;
        if (presenterCid) {
          label = name ? l.presenter_nail.replace('%s', name) : megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER;
        } else {
          label = name || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER;
        }
        return JSX_(PeerClass, {
          key: `${userHandle}-${i}-${clientId}`,
          className: `
                            video-crop
                            ${isActive ? 'active' : ''}
                            ${isActiveSpeaker ? 'active-speaker' : ''}
                        `,
          simpletip: {
            ...SIMPLE_TIP,
            label
          },
          raisedHandPeers,
          mode,
          chatRoom,
          source: peer,
          isPresenterNode: !!presenterCid,
          onSpeakerChange: node => onSpeakerChange(node, !presenterCid),
          onClick: node => onSpeakerChange(node, !presenterCid)
        });
      };
      if (sources.length <= (floatDetached ? MAX_STREAMS_PER_PAGE : 9)) {
        return JSX_("div", {
          ref: this.domRef,
          className: "stream-participants-block theme-dark-forced"
        }, JSX_("div", {
          className: "participants-container"
        }, JSX_("div", {
          className: `
                                    participants-grid
                                    ${floatDetached && sources.length === 1 || sources.length === 0 ? 'single-column' : ''}
                                `
        }, sources.map((p, i) => $$PEER(p, i)))));
      }
      const {
        page
      } = this.state;
      const chunks = chunkNodes(sources, MAX_STREAMS_PER_PAGE);
      return JSX_("div", {
        ref: this.domRef,
        className: "carousel"
      }, JSX_("div", {
        className: "carousel-container",
        onWheel: evt => this.onScroll(chunks, evt)
      }, JSX_("div", {
        className: "stream-participants-block theme-dark-forced"
      }, JSX_("div", {
        className: "participants-container"
      }, Object.values(chunks).map((chunk, i) => {
        const {
          id,
          nodes
        } = chunk;
        return JSX_("div", {
          key: id,
          className: `
                                                carousel-page
                                                ${i === page ? 'active' : ''}
                                            `
        }, page === 0 ? null : JSX_("button", {
          className: "carousel-control carousel-button-prev theme-dark-forced",
          onClick: () => this.movePage(utils.Bq.PREV)
        }, JSX_("i", {
          className: "sprite-fm-mono icon-arrow-up"
        })), JSX_("div", {
          className: `
                                                    participants-grid
                                                    ${nodes.length === 1 ? 'single-column' : ''}
                                                `
        }, nodes.map((peer, j) => $$PEER(peer, j + i * MAX_STREAMS_PER_PAGE))), page >= Object.values(chunks).length - 1 ? null : JSX_("button", {
          className: "carousel-control carousel-button-next theme-dark-forced",
          onClick: () => this.movePage(utils.Bq.NEXT)
        }, JSX_("i", {
          className: "sprite-fm-mono icon-arrow-down"
        })));
      })))));
    }
    return null;
  }
}
;// ./js/chat/ui/meetings/videoNodeMenu.jsx





const Privilege = ({
  chatRoom,
  stream
}) => {
  const {
    call,
    userHandle
  } = stream || {};
  if (call && call.isPublic) {
    const {
      OPERATOR,
      FULL
    } = ChatRoom.MembersSet.PRIVILEGE_STATE;
    const currentUserModerator = chatRoom.members[u_handle] === OPERATOR;
    const targetUserModerator = chatRoom.members[userHandle] === OPERATOR;
    return currentUserModerator && JSX_(meetings_button.A, {
      targetUserModerator,
      icon: "sprite-fm-mono icon-admin-outline",
      onClick: () => {
        ['alterUserPrivilege', 'onCallPrivilegeChange'].map(event => chatRoom.trigger(event, [userHandle, targetUserModerator ? FULL : OPERATOR]));
      }
    }, JSX_("span", null, targetUserModerator ? l.remove_moderator : l.make_moderator));
  }
  return null;
};
const Contact = ({
  stream,
  ephemeralAccounts,
  onCallMinimize
}) => {
  const {
    userHandle
  } = stream;
  const IS_GUEST = (0,utils.P)() || ephemeralAccounts && ephemeralAccounts.includes(userHandle);
  const HAS_RELATIONSHIP = M.u[userHandle].c === 1;
  if (HAS_RELATIONSHIP) {
    return JSX_(meetings_button.A, {
      icon: "sprite-fm-mono icon-chat",
      onClick: () => {
        onCallMinimize();
        loadSubPage(`fm/chat/p/${userHandle}`);
      }
    }, JSX_("span", null, l[7997]));
  }
  return JSX_(meetings_button.A, {
    className: IS_GUEST ? 'disabled' : '',
    icon: "sprite-fm-mono icon-add",
    onClick: () => {
      return IS_GUEST ? false : M.syncContactEmail(userHandle, true).then(email => {
        const OPC = Object.values(M.opc);
        if (OPC && OPC.length && OPC.some(opc => opc.m === email)) {
          return msgDialog('warningb', '', l[17545]);
        }
        msgDialog('info', l[150], l[5898]);
        M.inviteContact(M.u[u_handle].m, email);
      }).catch(() => mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle));
    }
  }, JSX_("span", null, l[24581]));
};
const Pin = ({
  stream,
  mode,
  onSpeakerChange,
  onModeChange
}) => {
  return JSX_(meetings_button.A, {
    icon: "sprite-fm-mono grid-main",
    onClick: () => mode === utils.g.THUMBNAIL ? onSpeakerChange == null ? void 0 : onSpeakerChange(stream) : onModeChange == null ? void 0 : onModeChange(utils.g.THUMBNAIL)
  }, JSX_("span", null, mode === utils.g.THUMBNAIL ? l.display_in_main_view : l.switch_to_thumb_view));
};
class VideoNodeMenu extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.ToggleCrop = ({
      videoNodeRef
    }) => {
      const videoNode = videoNodeRef == null ? void 0 : videoNodeRef.current;
      if (!videoNode) {
        return null;
      }
      return videoNode.isVideoCropped() ? JSX_(meetings_button.A, {
        icon: "sprite-fm-mono grid-main",
        onClick: () => {
          videoNode.uncropVideo();
          this.forceUpdate();
        }
      }, JSX_("span", null, "Uncrop video")) : JSX_(meetings_button.A, {
        icon: "sprite-fm-mono grid-main",
        onClick: () => {
          videoNode.cropVideo();
          this.forceUpdate();
        }
      }, JSX_("span", null, "Crop video"));
    };
  }
  render() {
    const {
      NAMESPACE
    } = VideoNodeMenu;
    const {
      stream,
      isPresenterNode,
      mode,
      onSpeakerChange,
      onModeChange
    } = this.props;
    const {
      userHandle,
      clientId
    } = stream;
    if (isPresenterNode) {
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        theme-dark-forced
                        ${mode === utils.g.THUMBNAIL ? '' : 'presenter'}
                    `
      }, JSX_("div", {
        className: `${NAMESPACE}-toggle`
      }, JSX_("i", {
        className: `sprite-fm-mono call-node-pin icon-pin${mode === utils.g.MAIN ? '-off' : ''}`,
        onClick: () => mode === utils.g.THUMBNAIL ? onSpeakerChange == null ? void 0 : onSpeakerChange(stream) : onModeChange == null ? void 0 : onModeChange(utils.g.THUMBNAIL)
      })));
    }
    if (userHandle !== u_handle) {
      const $$CONTROLS = {
        Contact,
        Pin,
        Privilege
      };
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        theme-dark-forced
                    `
      }, JSX_("div", {
        className: `${NAMESPACE}-toggle`
      }, JSX_("i", {
        className: "sprite-fm-mono icon-more-horizontal-thin-outline"
      })), JSX_("div", {
        className: `${NAMESPACE}-content`
      }, JSX_("ul", null, Object.values($$CONTROLS).map(($$CONTROL, i) => JSX_("li", {
        key: `${Object.keys($$CONTROLS)[i]}-${clientId}-${userHandle}`
      }, JSX_($$CONTROL, this.props))))));
    }
    return null;
  }
}
VideoNodeMenu.NAMESPACE = 'node-menu';
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
;// ./js/chat/ui/meetings/modeSwitch.jsx




class ModeSwitch extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      expanded: false,
      settings: false
    };
    this.handleMousedown = ({
      target
    }) => {
      if (this.state.expanded || this.state.settings) {
        let _this$domRef;
        return (_this$domRef = this.domRef) != null && (_this$domRef = _this$domRef.current) != null && _this$domRef.contains(target) ? null : this.doClose();
      }
    };
    this.handleKeydown = ({
      keyCode
    }) => keyCode && keyCode === 27 && this.doClose();
    this.doClose = () => this.isMounted() && this.setState({
      expanded: false,
      settings: false
    }, () => this.props.setActiveElement(this.state.expanded));
    this.doToggle = () => this.isMounted() && this.setState(state => ({
      expanded: !state.expanded
    }), () => this.props.setActiveElement(this.state.expanded || this.state.settings));
    this.setStreamsPerPage = streamsPerPage => {
      if (streamsPerPage) {
        let _this$props$onStreams, _this$props;
        (_this$props$onStreams = (_this$props = this.props).onStreamsPerPageChange) == null || _this$props$onStreams.call(_this$props, streamsPerPage);
        this.doClose();
      }
    };
    this.getModeIcon = mode => {
      switch (mode) {
        case utils.g.THUMBNAIL:
          return 'grid-9';
        case utils.g.MAIN:
          return 'grid-main';
        default:
          return null;
      }
    };
    this.Toggle = () => {
      const {
        mode
      } = this.props;
      return JSX_("div", {
        className: `${ModeSwitch.BASE_CLASS}-toggle`,
        onClick: this.doToggle
      }, JSX_(meetings_button.A, null, JSX_("i", {
        className: `sprite-fm-mono ${this.getModeIcon(mode)}`
      }), mode === utils.g.THUMBNAIL && JSX_("div", null, l.thumbnail_view), mode === utils.g.MAIN && JSX_("div", null, l.main_view)), JSX_("i", {
        className: "sprite-fm-mono icon-arrow-down"
      }));
    };
    this.Option = ({
      label,
      mode
    }) => {
      return JSX_("div", {
        className: `
                    ${ModeSwitch.BASE_CLASS}-option
                    ${mode === this.props.mode ? 'active' : ''}
                `,
        onClick: () => {
          this.doToggle();
          this.props.onModeChange(mode);
        }
      }, JSX_(meetings_button.A, null, JSX_("i", {
        className: `sprite-fm-mono ${this.getModeIcon(mode)}`
      }), JSX_("div", null, label)));
    };
    this.Settings = () => {
      const {
        streamsPerPage
      } = this.props;
      return JSX_("div", {
        className: `${ModeSwitch.BASE_CLASS}-settings`
      }, JSX_("div", {
        className: "settings-wrapper"
      }, JSX_("strong", null, l.layout_settings_heading), JSX_("span", null, l.layout_settings_info), JSX_("div", {
        className: "recurring-radio-buttons"
      }, JSX_("div", {
        className: "recurring-label-wrap"
      }, JSX_("div", {
        className: `
                                    uiTheme
                                    ${streamsPerPage === utils.gh.MIN ? 'radioOn' : 'radioOff'}
                                `
      }, JSX_("input", {
        type: "radio",
        name: "9",
        onClick: () => this.setStreamsPerPage(utils.gh.MIN)
      })), JSX_("div", {
        className: "radio-txt"
      }, JSX_("span", {
        className: "recurring-radio-label",
        onClick: () => this.setStreamsPerPage(utils.gh.MIN)
      }, "9"))), JSX_("div", {
        className: "recurring-label-wrap"
      }, JSX_("div", {
        className: `
                                    uiTheme
                                    ${streamsPerPage === utils.gh.MED ? 'radioOn' : 'radioOff'}
                                `
      }, JSX_("input", {
        type: "radio",
        name: "21",
        onClick: () => {
          this.setStreamsPerPage(utils.gh.MED);
        }
      })), JSX_("div", {
        className: "radio-txt"
      }, JSX_("span", {
        className: "recurring-radio-label",
        onClick: () => this.setStreamsPerPage(utils.gh.MED)
      }, "21"))), JSX_("div", {
        className: "recurring-label-wrap"
      }, JSX_("div", {
        className: `
                                    uiTheme
                                    ${streamsPerPage === utils.gh.MAX ? 'radioOn' : 'radioOff'}
                                `
      }, JSX_("input", {
        type: "radio",
        name: "49",
        onClick: () => {
          this.setStreamsPerPage(utils.gh.MAX);
        }
      })), JSX_("div", {
        className: "radio-txt"
      }, JSX_("span", {
        className: "recurring-radio-label",
        onClick: () => this.setStreamsPerPage(utils.gh.MAX)
      }, "49")))), JSX_("small", null, l.layout_settings_warning)), JSX_("div", {
        className: "settings-close"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-dialog-close",
        onClick: this.doClose
      })));
    };
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('mousedown', this.handleMousedown);
    document.removeEventListener('keydown', this.handleKeydown);
  }
  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('mousedown', this.handleMousedown);
    document.addEventListener('keydown', this.handleKeydown);
  }
  render() {
    const {
      Toggle,
      Option,
      Settings,
      domRef,
      state,
      doToggle
    } = this;
    return JSX_("div", {
      ref: domRef,
      className: ModeSwitch.BASE_CLASS
    }, JSX_(Toggle, null), JSX_("div", {
      className: `
                        ${ModeSwitch.BASE_CLASS}-menu
                        ${state.expanded ? 'expanded' : ''}
                    `
    }, JSX_(Option, {
      label: l.main_view,
      mode: utils.g.MAIN
    }), JSX_(Option, {
      label: l.thumbnail_view,
      mode: utils.g.THUMBNAIL
    }), JSX_("div", {
      className: `${ModeSwitch.BASE_CLASS}-option`,
      onClick: () => this.setState({
        settings: true
      }, doToggle)
    }, JSX_(meetings_button.A, null, JSX_("i", {
      className: "sprite-fm-mono icon-settings"
    }), JSX_("div", null, l.layout_settings_button)))), state.settings && JSX_(Settings, null));
  }
}
ModeSwitch.NAMESPACE = 'modeSwitch';
ModeSwitch.BASE_CLASS = 'mode';
;// ./js/chat/ui/meetings/streamHead.jsx









class StreamHead extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.delayProcID = null;
    this.domRef = REaCt().createRef();
    this.durationRef = REaCt().createRef();
    this.dialogRef = REaCt().createRef();
    this.topicRef = REaCt().createRef();
    this.interval = undefined;
    this.state = {
      dialog: false,
      duration: undefined,
      banner: false,
      modeSwitch: false
    };
    this.updateDurationDOM = () => {
      if (this.durationRef) {
        this.durationRef.current.innerText = this.durationString;
      }
    };
    this.closeTooltips = () => {
      for (const node of this.domRef.current.querySelectorAll('.simpletip')) {
        node.dispatchEvent(StreamHead.EVENTS.SIMPLETIP);
      }
    };
    this.toggleFullscreen = () => this.fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    this.toggleBanner = callback => this.setState(state => ({
      banner: !state.banner
    }), () => callback && callback());
    this.handleDialogClose = ({
      target
    }) => {
      if (this.state.dialog) {
        let _targetDialog$domRef;
        const {
          topicRef,
          dialogRef,
          delayProcID
        } = this;
        const topicElement = topicRef && topicRef.current;
        const targetDialog = dialogRef && dialogRef.current && dialogRef.current;
        const dialogElement = (_targetDialog$domRef = targetDialog.domRef) == null ? void 0 : _targetDialog$domRef.current;
        if (topicElement.contains(target)) {
          return;
        }
        return (target.classList.contains('icon-dialog-close') || !dialogElement.contains(target)) && this.setState({
          dialog: false
        }, () => delayProcID && delay.cancel(delayProcID));
      }
    };
    this.getModerators = () => {
      let _this$props$chatRoom;
      const members = (_this$props$chatRoom = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom.members;
      if (members) {
        const moderators = [];
        for (const [handle, role] of Object.entries(members)) {
          if (role === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR) {
            moderators.push(M.getNameByHandle(handle));
          }
        }
        return mega.utils.trans.listToString(moderators, mega.icu.format(l.meeting_moderators, moderators.length));
      }
    };
    this.Dialog = () => {
      const link = `${getBaseUrl()}/${this.props.chatRoom.publicLink}`;
      const mods = this.getModerators();
      return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({
        ref: this.dialogRef
      }, this.state, {
        mods,
        name: "meeting-info-dialog",
        title: l[18132],
        className: "group-chat-link dialog-template-main theme-dark-forced in-call-info",
        hideOverlay: true
      }), JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "content-block"
      }, JSX_(ui_utils.zT, {
        className: "info"
      }, mods), JSX_("div", {
        className: "info"
      }, l.copy_and_share), JSX_("div", {
        className: "link-input-container"
      }, JSX_("div", {
        className: "mega-input with-icon box-style"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-link"
      }), JSX_("input", {
        type: "text",
        className: "megaInputs",
        readOnly: true,
        value: link
      })), JSX_(meetings_button.A, {
        className: "mega-button positive copy-to-clipboard",
        onClick: () => {
          if (copyToClipboard(link)) {
            this.toggleBanner(() => {
              this.delayProcID = delay(`${StreamHead.NAMESPACE}-banner`, this.toggleBanner, 10000);
            });
          }
        }
      }, JSX_("span", null, l[63]))), this.state.banner && JSX_("div", {
        className: "banner-copy-success"
      }, l[7654]))), JSX_("footer", null, JSX_("div", {
        className: "footer-container"
      })));
    };
    this.Pagination = () => {
      const {
        mode,
        peers,
        page,
        streamsPerPage,
        floatDetached,
        chunksLength,
        call,
        onMovePage
      } = this.props;
      if (mode !== utils.g.THUMBNAIL || !peers) {
        return null;
      }
      const {
        screen,
        video,
        rest
      } = filterAndSplitSources(peers, call);
      if (screen.length + video.length + rest.length > (floatDetached ? streamsPerPage + 1 : streamsPerPage)) {
        return JSX_("div", {
          className: `${StreamHead.NAMESPACE}-pagination`
        }, JSX_(meetings_button.A, {
          className: `
                            carousel-button-prev
                            theme-dark-forced
                            ${page !== 0 ? '' : 'disabled'}
                        `,
          icon: "sprite-fm-mono icon-arrow-left",
          onClick: () => page !== 0 && onMovePage(utils.Bq.PREV)
        }), JSX_("div", null, page + 1, "/", chunksLength), JSX_(meetings_button.A, {
          className: `
                            carousel-button-next
                            theme-dark-forced
                            ${page < chunksLength - 1 ? '' : 'disabled'}
                        `,
          icon: "sprite-fm-mono icon-arrow-right",
          onClick: () => page < chunksLength - 1 && onMovePage(utils.Bq.NEXT)
        }));
      }
      return null;
    };
  }
  get fullscreen() {
    return document.fullscreenElement;
  }
  get duration() {
    return (Date.now() - this.props.call.ts) / 1000;
  }
  get durationString() {
    return this.duration ? secondsToTimeShort(this.duration) : '--:--:--';
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    clearInterval(this.durationInterval);
    document.removeEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
    document.removeEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
  }
  componentDidMount() {
    super.componentDidMount();
    this.durationInterval = setInterval(this.updateDurationDOM, 1000);
    document.addEventListener(StreamHead.EVENTS.FULLSCREEN, this.closeTooltips);
    document.addEventListener(StreamHead.EVENTS.CLICK_DIALOG, this.handleDialogClose);
  }
  render() {
    const {
      NAMESPACE
    } = StreamHead;
    const {
      mode,
      streamsPerPage,
      chatRoom,
      onStreamsPerPageChange,
      onCallMinimize,
      onModeChange,
      setActiveElement
    } = this.props;
    const {
      dialog
    } = this.state;
    const SIMPLETIP = {
      position: 'bottom',
      offset: 5,
      className: 'theme-dark-forced'
    };
    return JSX_("div", {
      ref: this.domRef,
      className: `${NAMESPACE}`
    }, dialog && JSX_(this.Dialog, null), JSX_("div", {
      className: `${NAMESPACE}-content theme-dark-forced`
    }, JSX_("div", {
      className: `${NAMESPACE}-info`
    }, JSX_("div", {
      ref: this.durationRef,
      className: "stream-duration"
    }, this.durationString), JSX_("div", {
      ref: this.topicRef,
      className: `
                                stream-topic
                                ${chatRoom.isMeeting && chatRoom.publicLink ? 'has-meeting-link' : ''}
                            `,
      onClick: () => chatRoom.isMeeting && chatRoom.publicLink && this.setState({
        dialog: !dialog,
        banner: false
      }, () => setActiveElement(this.state.dialog))
    }, JSX_(ui_utils.zT, null, chatRoom.getRoomTitle()), chatRoom.isMeeting && chatRoom.publicLink && JSX_("i", {
      className: `
                                        sprite-fm-mono
                                        ${dialog ? 'icon-arrow-up' : 'icon-arrow-down'}
                                    `
    }))), JSX_(this.Pagination, null), JSX_("div", {
      className: `${NAMESPACE}-controls`
    }, JSX_(ModeSwitch, {
      mode,
      streamsPerPage,
      onStreamsPerPageChange,
      onModeChange,
      setActiveElement
    }), JSX_(meetings_button.A, {
      className: "head-control",
      simpletip: {
        ...SIMPLETIP,
        label: this.fullscreen ? l.exit_fullscreen : l[17803]
      },
      icon: this.fullscreen ? 'icon-fullscreen-leave' : 'icon-fullscreen-enter',
      onClick: this.toggleFullscreen
    }, JSX_("span", null, this.fullscreen ? l.exit_fullscreen : l[17803])), JSX_(meetings_button.A, {
      className: "head-control",
      simpletip: {
        ...SIMPLETIP,
        label: l.minimize
      },
      icon: "icon-call-min-mode",
      onClick: () => {
        onCallMinimize();
        eventlog(500305);
      }
    }, JSX_("div", null, l.minimize)))));
  }
}
StreamHead.NAMESPACE = 'stream-head';
StreamHead.EVENTS = {
  FULLSCREEN: 'fullscreenchange',
  SIMPLETIP: new Event('simpletipClose'),
  CLICK_DIALOG: 'click'
};
// EXTERNAL MODULE: ./js/chat/ui/fallback.jsx
const fallback = REQ_(3439);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const dropdowns = REQ_(1510);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
;// ./js/chat/ui/meetings/floatExtendedControls.jsx



class FloatExtendedControls extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.isActive = type => {
      return !!(this.props.call.av & type);
    };
  }
  render() {
    const {
      hasToRenderPermissionsWarning,
      renderPermissionsWarning,
      resetError,
      showScreenDialog,
      onScreenSharingClick,
      onHoldClick
    } = this.props;
    const {
      onHold,
      Screen
    } = SfuClient.Av;
    const isOnHold = this.isActive(onHold);
    const callHoldLabel = isOnHold ? l[23459] : l[23460];
    const screenSharingLabel = this.isActive(Screen) ? l[22890] : l[22889];
    return JSX_(buttons.$, {
      className: "mega-button theme-light-forced round large button-group",
      icon: "sprite-fm-mono icon-options",
      showScreenDialog
    }, this.isActive(Screen) && JSX_("div", {
      className: "info-indicator active"
    }), JSX_(dropdowns.ms, {
      className: "button-group-menu theme-dark-forced",
      noArrow: true,
      positionAt: "center top",
      collision: "none",
      vertOffset: -90,
      ref: r => {
        this.dropdownRef = r;
      },
      onBeforeActiveChange: e => {
        if (e) {
          $(document.body).trigger('closeAllDropdownsExcept', this.dropdownRef);
        }
      },
      showScreenDialog
    }, JSX_(dropdowns.tJ, {
      key: "call-hold",
      className: `
                            theme-dark-forced
                            ${isOnHold ? 'active' : ''}
                        `,
      label: callHoldLabel,
      icon: `
                            sprite-fm-mono
                            ${isOnHold ? 'icon-play-small-regular-outline' : 'icon-pause-small-regular-outline'}
                        `,
      onClick: onHoldClick
    }), JSX_(dropdowns.tJ, {
      key: "screen-sharing",
      className: `
                            theme-dark-forced
                            ${isOnHold ? 'disabled' : ''}
                            ${this.isActive(Screen) ? 'active' : ''}
                        `,
      label: screenSharingLabel,
      icon: `
                            sprite-fm-mono
                            ${this.isActive(Screen) ? 'icon-monitor-off' : 'icon-monitor'}
                        `,
      onClick: () => {
        resetError(Av.Screen);
        onScreenSharingClick();
      }
    }), hasToRenderPermissionsWarning(Screen) ? renderPermissionsWarning(Screen, this) : null));
  }
}
FloatExtendedControls.NAMESPACE = 'stream-extended-controls';
;// ./js/chat/ui/meetings/micObserver.jsx




const withMicObserver = Component => class extends mixins.w9 {
  constructor(props) {
    super(props);
    this.namespace = `SO-${Component.NAMESPACE}`;
    this.inputObserver = `onNoMicInput.${this.namespace}`;
    this.sendObserver = `onAudioSendDenied.${this.namespace}`;
    this.state = {
      signal: true,
      blocked: false
    };
    this.renderSignalWarning = this.renderSignalWarning.bind(this);
    this.renderBlockedWarning = this.renderBlockedWarning.bind(this);
  }
  bindObservers() {
    this.props.chatRoom.rebind(this.inputObserver, () => this.setState({
      signal: false
    })).rebind(this.sendObserver, () => {
      this.setState({
        blocked: true
      }, () => {
        if (this.props.minimized) {
          const toast = new ChatToast(l.max_speakers_toast, {
            icon: 'sprite-fm-uni icon-hazard',
            close: true
          });
          toast.dispatch();
        }
      });
    });
  }
  renderSignalDialog() {
    return msgDialog('warningb', null, l.no_mic_title, l.chat_mic_off_tooltip, null, 1);
  }
  renderSignalWarning() {
    return JSX_("div", {
      className: `
                    ${this.namespace}
                        meetings-signal-issue
                        simpletip
                    `,
      "data-simpletip": l.show_info,
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip-class": "theme-dark-forced",
      onClick: () => this.renderSignalDialog()
    }, JSX_("i", {
      className: "sprite-fm-mono icon-exclamation-filled"
    }));
  }
  renderBlockedWarning() {
    return JSX_("div", {
      className: "stream-toast theme-dark-forced"
    }, JSX_("div", {
      className: "stream-toast-content"
    }, JSX_("i", {
      className: "stream-toast-icon sprite-fm-uni icon-warning"
    }), JSX_("div", {
      className: "stream-toast-message"
    }, l.max_speakers_toast), JSX_(meetings_button.A, {
      className: "mega-button action stream-toast-close",
      icon: "sprite-fm-mono icon-close-component",
      onClick: () => this.setState({
        blocked: false
      })
    })));
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
    return JSX_(Component, (0,esm_extends.A)({}, this.props, {
      signal: this.state.signal,
      renderSignalWarning: this.renderSignalWarning,
      blocked: this.state.blocked,
      renderBlockedWarning: this.renderBlockedWarning
    }));
  }
};
// EXTERNAL MODULE: ./js/chat/ui/meetings/permissionsObserver.jsx
const permissionsObserver = REQ_(192);
// EXTERNAL MODULE: ./js/chat/ui/meetings/hostsObserver.jsx
const hostsObserver = REQ_(7677);
;// ./js/chat/ui/meetings/float.jsx











class FloatingVideo extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.collapseListener = null;
    this.state = {
      collapsed: false
    };
    this.toggleCollapsedMode = () => {
      return this.setState(state => ({
        collapsed: !state.collapsed
      }));
    };
  }
  componentWillUnmount() {
    mBroadcaster.removeListener(this.collapseListener);
  }
  componentDidMount() {
    this.collapseListener = mBroadcaster.addListener('meetings:collapse', () => this.setState({
      collapsed: true
    }));
  }
  componentDidUpdate() {
    if (typeof psa !== 'undefined') {
      psa.repositionMeetingsCall();
    }
  }
  render() {
    const {
      peers,
      minimized,
      call,
      floatDetached
    } = this.props;
    if (peers.length === 0 && !minimized && !call.isSharingScreen()) {
      return null;
    }
    const STREAM_PROPS = {
      ...this.props,
      collapsed: this.state.collapsed,
      toggleCollapsedMode: this.toggleCollapsedMode,
      onLoadedData: this.onLoadedData
    };
    if (minimized) {
      return JSX_(ui_utils.Ay.RenderTo, {
        element: document.body
      }, JSX_(Stream, STREAM_PROPS));
    }
    return floatDetached ? JSX_(Stream, STREAM_PROPS) : null;
  }
}
FloatingVideo.NAMESPACE = 'float-video';
FloatingVideo.POSITION_MODIFIER = 'with-sidebar';
class Stream extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.DRAGGABLE = {
      POSITION: {
        top: undefined,
        left: undefined
      },
      OPTIONS: {
        scroll: 'false',
        cursor: 'move',
        opacity: 1,
        start: () => {
          if (this.state.options) {
            this.handleOptionsToggle();
          }
          $(document.body).trigger('closeAllDropdownsExcept');
        },
        stop: (event, ui) => {
          this.DRAGGABLE.POSITION = ui.position;
          const {
            clientWidth,
            clientHeight
          } = document.body;
          const {
            helper
          } = ui;
          const {
            left,
            top
          } = this.DRAGGABLE.POSITION;
          if (left < clientWidth / 2) {
            helper.css('left', `${left / clientWidth * 100}%`).css('right', 'unset');
          } else {
            helper.css('left', 'unset').css('right', `${clientWidth - left - helper.width()}px`);
          }
          if (top < clientHeight / 2) {
            helper.css('top', `${top / clientHeight * 100}%`).css('bottom', 'unset');
          } else {
            helper.css('top', 'unset').css('bottom', `${clientHeight - top - helper.height()}px`);
          }
        }
      }
    };
    this.EVENTS = {
      MINIMIZE: ['slideshow:open', 'contact:open', 'textEditor:open', 'chat:open'],
      EXPAND: ['slideshow:close', 'textEditor:close']
    };
    this.LISTENERS = [];
    this.PREV_STATE = {};
    this.state = {
      options: false
    };
    this.getStreamSource = () => {
      const {
        call,
        mode,
        forcedLocal
      } = this.props;
      return mode === utils.g.MINI && !forcedLocal ? call.getActiveStream() : call.getLocalStream();
    };
    this.unbindEvents = () => {
      const events = [...this.EVENTS.MINIMIZE, ...this.EVENTS.EXPAND];
      for (let i = events.length; i--;) {
        const event = events[i];
        mBroadcaster.removeListener(this.LISTENERS[event]);
      }
      document.removeEventListener('click', this.handleOptionsClose);
    };
    this.bindEvents = () => {
      for (let i = this.EVENTS.MINIMIZE.length; i--;) {
        const event = this.EVENTS.MINIMIZE[i];
        this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
          this.PREV_STATE.minimised = this.props.minimized;
          return this.props.onCallMinimize();
        });
      }
      for (let i = this.EVENTS.EXPAND.length; i--;) {
        const event = this.EVENTS.EXPAND[i];
        this.LISTENERS[event] = mBroadcaster.addListener(event, () => {
          if (this.PREV_STATE.minimised) {
            delete this.PREV_STATE.minimised;
            return;
          }
          delete this.PREV_STATE.minimised;
          return this.props.view === utils.gR.CHAT && this.props.onCallExpand();
        });
      }
      document.addEventListener('click', this.handleOptionsClose);
    };
    this.initDraggable = () => {
      let _this$domRef;
      const {
        minimized,
        wrapperRef
      } = this.props;
      const containerEl = (_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current;
      if (containerEl) {
        $(containerEl).draggable({
          ...this.DRAGGABLE.OPTIONS,
          containment: minimized ? 'body' : wrapperRef == null ? void 0 : wrapperRef.current
        });
      }
    };
    this.repositionDraggable = () => {
      let _this$props$wrapperRe, _this$domRef2;
      const wrapperEl = (_this$props$wrapperRe = this.props.wrapperRef) == null ? void 0 : _this$props$wrapperRe.current;
      const localEl = (_this$domRef2 = this.domRef) == null ? void 0 : _this$domRef2.current;
      if (localEl.offsetLeft + localEl.offsetWidth > wrapperEl.offsetWidth) {
        localEl.style.left = 'unset';
        localEl.style.removeProperty("right");
      }
    };
    this.handleOptionsClose = ({
      target
    }) => {
      if (this.state.options && !target.classList.contains('icon-options')) {
        this.setState({
          options: false
        });
      }
    };
    this.handleOptionsToggle = () => this.setState({
      options: !this.state.options
    });
    this.renderOnHoldVideoNode = () => JSX_(LocalVideoHiRes, {
      chatRoom: this.props.chatRoom
    });
    this.renderOptionsDialog = () => {
      const {
        call,
        mode,
        forcedLocal,
        onScreenSharingClick,
        onSpeakerChange,
        onModeChange,
        toggleCollapsedMode,
        onMoveIntoGrid
      } = this.props;
      const IS_SPEAKER_VIEW = mode === utils.g.MAIN && forcedLocal;
      const {
        POSITION
      } = this.DRAGGABLE;
      return JSX_("div", {
        className: `
                     ${FloatingVideo.NAMESPACE}-options
                     ${POSITION.left < 200 ? 'options-top' : ''}
                     ${POSITION.left < 200 && POSITION.top < 100 ? 'options-bottom' : ''}
                     theme-dark-forced
                 `
      }, JSX_("ul", null, JSX_("li", null, JSX_(meetings_button.A, {
        icon: `
                                sprite-fm-mono
                                ${IS_SPEAKER_VIEW ? 'grid-9' : 'grid-main'}
                            `,
        onClick: () => this.setState({
          options: false
        }, () => {
          if (IS_SPEAKER_VIEW) {
            return onModeChange(utils.g.THUMBNAIL);
          }
          onSpeakerChange(call.getLocalStream());
        })
      }, JSX_("div", null, IS_SPEAKER_VIEW ? l.switch_to_thumb_view : l.display_in_main_view))), JSX_("li", null, JSX_(meetings_button.A, {
        icon: "sprite-fm-mono icon-collapse-up",
        onClick: onMoveIntoGrid
      }, JSX_("div", null, l.move_into_grid_button))), JSX_("li", null, JSX_(meetings_button.A, {
        icon: "sprite-fm-mono icon-download-standard",
        onClick: () => this.setState({
          options: false
        }, () => toggleCollapsedMode())
      }, JSX_("div", null, l.collapse_self_video)))), !!(call.av & SfuClient.Av.Screen) && JSX_("ul", {
        className: "has-separator"
      }, JSX_("li", null, JSX_(meetings_button.A, {
        className: "end-screen-share",
        icon: "icon-end-screenshare",
        onClick: () => {
          this.setState({
            options: false
          });
          onScreenSharingClick();
        }
      }, JSX_("div", null, l[22890])))));
    };
    this.renderMiniMode = source => {
      const {
        call,
        chatRoom,
        mode,
        minimized,
        isPresenterNode,
        onLoadedData
      } = this.props;
      if (call.isOnHold) {
        return this.renderOnHoldVideoNode();
      }
      const VideoClass = source.isLocal ? isPresenterNode ? LocalVideoHiRes : LocalVideoThumb : PeerVideoHiRes;
      return JSX_(VideoClass, {
        key: source,
        source,
        chatRoom,
        mode,
        minimized,
        isPresenterNode,
        onLoadedData
      });
    };
    this.renderSelfView = () => {
      const {
        isOnHold,
        raisedHandPeers,
        minimized,
        chatRoom,
        isPresenterNode,
        call,
        onLoadedData
      } = this.props;
      const {
        options
      } = this.state;
      if (isOnHold) {
        return this.renderOnHoldVideoNode();
      }
      const VideoNode = call.isSharingScreen() ? LocalVideoHiResCloned : LocalVideoThumb;
      return JSX_(REaCt().Fragment, null, JSX_(VideoNode, {
        isSelfOverlay: true,
        raisedHandPeers,
        minimized,
        chatRoom,
        isPresenterNode,
        onLoadedData
      }), JSX_("div", {
        className: `${FloatingVideo.NAMESPACE}-self-overlay`
      }, minimized ? null : JSX_(meetings_button.A, {
        className: `
                                mega-button
                                theme-light-forced
                                action
                                small
                                float-video-options-control
                                ${options ? 'active' : ''}
                            `,
        icon: "sprite-fm-mono icon-options",
        onClick: () => this.handleOptionsToggle()
      }), options && this.renderOptionsDialog()));
    };
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }
  componentDidUpdate(prevProps) {
    super.componentDidUpdate();
    if (this.props.mode !== prevProps.mode) {
      this.initDraggable();
    }
    if (this.props.sidebar !== prevProps.sidebar && this.props.sidebar) {
      this.repositionDraggable();
    }
  }
  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
    this.initDraggable();
  }
  render() {
    const {
      NAMESPACE,
      POSITION_MODIFIER
    } = FloatingVideo;
    const {
      call,
      mode,
      minimized,
      sidebar,
      collapsed,
      toggleCollapsedMode,
      onCallExpand
    } = this.props;
    const IS_MINI_MODE = mode === utils.g.MINI;
    if (collapsed) {
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        collapsed
                        theme-dark-forced
                        ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                    `,
        onClick: toggleCollapsedMode
      }, JSX_("i", {
        className: "sprite-fm-mono icon-arrow-up icon-collapse"
      }), JSX_("div", {
        className: "collapsed-audio-indicator"
      }, JSX_(AudioLevelIndicator, {
        source: call.getLocalStream()
      })));
    }
    const source = this.getStreamSource() || call.getLocalStream();
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${NAMESPACE}
                    ${IS_MINI_MODE ? 'mini' : ''}
                    ${minimized ? 'minimized' : ''}
                    ${this.state.options ? 'active' : ''}
                    ${sidebar && !minimized ? POSITION_MODIFIER : ''}
                `,
      onClick: ({
        target
      }) => minimized && target.classList.contains(`${NAMESPACE}-overlay`) && onCallExpand()
    }, IS_MINI_MODE && this.renderMiniMode(source), !IS_MINI_MODE && this.renderSelfView(), minimized && JSX_(__Minimized, (0,esm_extends.A)({}, this.props, {
      onOptionsToggle: this.handleOptionsToggle
    })));
  }
}
class Minimized extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.SIMPLETIP_PROPS = {
      position: 'top',
      offset: 5,
      className: 'theme-dark-forced'
    };
    this.waitingPeersListener = undefined;
    this.raisedHandListener = undefined;
    this.state = {
      unread: 0,
      waitingRoomPeers: [],
      raisedHandPeers: [],
      hideWrList: false,
      hideHandsList: false
    };
    this.isActive = type => {
      return this.props.call.av & type;
    };
    this.getUnread = () => {
      const {
        chatRoom
      } = this.props;
      chatRoom.rebind(Minimized.UNREAD_EVENT, () => this.setState({
        unread: chatRoom.getUnreadCount()
      }, () => this.safeForceUpdate()));
    };
    this.renderSignalWarning = () => this.props.signal ? null : this.props.renderSignalWarning();
    this.renderPermissionsWarning = type => {
      const {
        hasToRenderPermissionsWarning,
        renderPermissionsWarning
      } = this.props;
      if (hasToRenderPermissionsWarning(type)) {
        return renderPermissionsWarning(type, this);
      }
      return null;
    };
    this.renderStreamControls = () => {
      const {
        call,
        chatRoom,
        recorderCid,
        hasToRenderPermissionsWarning,
        renderPermissionsWarning,
        resetError,
        onRecordingToggle,
        onAudioClick,
        onVideoClick,
        onScreenSharingClick,
        onHoldClick,
        onCallEnd
      } = this.props;
      const audioLabel = this.isActive(SfuClient.Av.Audio) ? l[16214] : l[16708];
      const videoLabel = this.isActive(SfuClient.Av.Camera) ? l[22894] : l[22893];
      const LeaveButton = (0,hostsObserver.C)(({
        hasHost,
        chatRoom,
        confirmLeave,
        onLeave
      }) => {
        return JSX_(meetings_button.A, {
          simpletip: {
            ...this.SIMPLETIP_PROPS,
            label: l[5884]
          },
          className: "mega-button theme-dark-forced round large end-call",
          icon: "icon-phone-02",
          onClick: ev => {
            ev.stopPropagation();
            const callParticipants = chatRoom.getCallParticipants();
            const doLeave = () => !chatRoom.iAmOperator() || hasHost(chatRoom.call ? chatRoom.call.peers.map(a => a.userHandle) : []) || callParticipants.length === 1 ? onLeave() : confirmLeave({
              title: l.assign_host_leave_call,
              body: l.assign_host_leave_call_details,
              cta: l.assign_host_button,
              altCta: l.leave_anyway
            });
            return recorderCid && recorderCid === call.sfuClient.cid ? (0,utils.sX)(doLeave, onRecordingToggle) : doLeave();
          }
        }, JSX_("span", null, l[5884]));
      });
      return JSX_(REaCt().Fragment, null, JSX_("div", {
        className: `${FloatingVideo.NAMESPACE}-controls`
      }, JSX_("div", {
        className: "meetings-signal-container"
      }, JSX_(meetings_button.A, {
        simpletip: {
          ...this.SIMPLETIP_PROPS,
          label: audioLabel
        },
        className: `
                                mega-button
                                theme-light-forced
                                round
                                ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                ${this.isActive(SfuClient.Av.Audio) ? '' : 'with-fill'}
                            `,
        icon: this.isActive(SfuClient.Av.Audio) ? 'icon-mic-thin-outline' : 'icon-mic-off-thin-outline',
        onClick: ev => {
          ev.stopPropagation();
          resetError(Av.Audio);
          onAudioClick();
        }
      }, JSX_("span", null, audioLabel)), this.renderSignalWarning(), this.renderPermissionsWarning(Av.Audio)), JSX_("div", {
        className: "meetings-signal-container"
      }, JSX_(meetings_button.A, {
        simpletip: {
          ...this.SIMPLETIP_PROPS,
          label: videoLabel
        },
        className: `
                                mega-button
                                theme-light-forced
                                round
                                ${this.isActive(SfuClient.Av.onHold) ? 'disabled' : ''}
                                ${this.isActive(SfuClient.Av.Camera) ? '' : 'with-fill'}
                            `,
        icon: this.isActive(SfuClient.Av.Camera) ? 'icon-video-thin-outline' : 'icon-video-off-thin-outline',
        onClick: ev => {
          ev.stopPropagation();
          resetError(Av.Camera);
          onVideoClick();
        }
      }, JSX_("span", null, videoLabel)), this.renderPermissionsWarning(Av.Camera)), JSX_("div", {
        className: "meetings-signal-container"
      }, JSX_(FloatExtendedControls, {
        call,
        chatRoom,
        onScreenSharingClick,
        onHoldClick,
        hasToRenderPermissionsWarning,
        renderPermissionsWarning,
        resetError,
        showScreenDialog: !!this.props[`dialog-${Av.Screen}`]
      }), this.renderPermissionsWarning(Av.Screen)), JSX_(LeaveButton, {
        chatRoom,
        participants: chatRoom.getCallParticipants(),
        onLeave: onCallEnd,
        onConfirmDenied: onCallEnd
      })), JSX_("span", {
        className: `${FloatingVideo.NAMESPACE}-fade`
      }));
    };
    this.renderPeersList = () => {
      const {
        onCallExpand,
        onParticipantsToggle,
        onWrListToggle
      } = this.props;
      const {
        waitingRoomPeers,
        raisedHandPeers,
        hideHandsList,
        hideWrList
      } = this.state;
      if (hideHandsList && hideWrList) {
        return null;
      }
      const showRaised = hideHandsList || !hideWrList && waitingRoomPeers.length ? false : !!raisedHandPeers.length;
      if (!showRaised && hideWrList) {
        return null;
      }
      const showButton = !showRaised || showRaised && raisedHandPeers.length > 1;
      return JSX_("div", {
        className: `
                    ${FloatingVideo.NAMESPACE}-alert
                    alert--waiting-peers
                    theme-dark-forced
                `,
        onClick: onCallExpand
      }, JSX_(meetings_button.A, {
        className: "close js-close",
        icon: "sprite-fm-mono icon-dialog-close",
        hideWrList,
        hideHandsList,
        onClick: ev => {
          ev.stopPropagation();
          this.setState({
            hideHandsList: hideWrList || showRaised,
            hideWrList: true
          });
        }
      }), JSX_("div", {
        className: `alert-label ${showButton ? '' : 'label-only'}`
      }, showRaised && JSX_("i", {
        className: "sprite-fm-uni icon-raise-hand"
      }), !hideWrList && !!waitingRoomPeers.length && mega.icu.format(l.wr_peers_waiting, waitingRoomPeers.length), showRaised && (raisedHandPeers.length > 1 ? raisedHandPeers.includes(u_handle) ? mega.icu.format(l.raise_self_peers_raised, raisedHandPeers.length - 1) : mega.icu.format(l.raise_peers_raised, raisedHandPeers.length) : JSX_(ui_utils.P9, {
        tag: "span",
        content: raisedHandPeers[0] === u_handle ? l.raise_self_raised : l.raise_peer_raised.replace('%s', megaChat.html(M.getNameByHandle(raisedHandPeers[0])))
      }))), showButton && JSX_(meetings_button.A, {
        className: "show-people",
        label: showRaised ? l[16797] : l.wr_see_waiting,
        onClick: ev => {
          ev.stopPropagation();
          const promise = onCallExpand().catch(dump);
          if (showRaised) {
            promise.then(() => onParticipantsToggle(true));
          } else if (waitingRoomPeers.length > 1) {
            promise.then(() => onWrListToggle(true));
          }
        }
      }, showRaised ? l[16797] : l.wr_see_waiting));
    };
    this.state.waitingRoomPeers = this.props.waitingRoomPeers || [];
    this.state.raisedHandPeers = this.props.raisedHandPeers || [];
  }
  componentDidMount() {
    super.componentDidMount();
    this.getUnread();
    this.waitingPeersListener = mBroadcaster.addListener('meetings:peersWaiting', waitingRoomPeers => this.setState({
      waitingRoomPeers,
      hideWrList: false,
      hideHandsList: false
    }, () => this.safeForceUpdate()));
    this.raisedHandListener = mBroadcaster.addListener('meetings:raisedHand', raisedHandPeers => this.setState({
      raisedHandPeers,
      hideWrList: false,
      hideHandsList: false
    }, () => this.safeForceUpdate()));
    ['onCallPeerJoined', 'onCallPeerLeft'].map(event => this.props.chatRoom.rebind(`${event}.${Minimized.NAMESPACE}`, (ev, {
      userHandle
    }) => this.isMounted() && this.setState(state => ({
      raisedHandPeers: state.raisedHandPeers.includes(userHandle) ? state.raisedHandPeers.filter(h => h !== userHandle) : [...this.props.call.sfuClient.raisedHands]
    }), this.safeForceUpdate)));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.chatRoom.unbind(Minimized.UNREAD_EVENT);
    [this.waitingPeersListener, this.raisedHandListener].map(listener => mBroadcaster.removeListener(listener));
    ['onCallPeerJoined', 'onCallPeerLeft'].map(event => this.props.chatRoom.off(`${event}.${Minimized.NAMESPACE}`));
  }
  render() {
    const {
      onCallExpand
    } = this.props;
    const {
      unread,
      raisedHandPeers,
      waitingRoomPeers
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: `${FloatingVideo.NAMESPACE}-wrapper`
    }, JSX_("div", {
      className: `${FloatingVideo.NAMESPACE}-overlay`
    }, JSX_(meetings_button.A, {
      simpletip: {
        ...this.SIMPLETIP_PROPS,
        label: l.expand_mini_call
      },
      className: "mega-button theme-light-forced action small expand",
      icon: "sprite-fm-mono icon-fullscreen-enter",
      onClick: ev => {
        ev.stopPropagation();
        onCallExpand();
      }
    }), this.renderStreamControls()), waitingRoomPeers && waitingRoomPeers.length || raisedHandPeers && raisedHandPeers.length ? this.renderPeersList() : null, unread ? JSX_("div", {
      className: `${FloatingVideo.NAMESPACE}-notifications`
    }, JSX_(meetings_button.A, {
      className: "mega-button round large chat-control",
      icon: "icon-chat-filled"
    }, JSX_("span", null, l.chats)), JSX_("span", null, unread > 9 ? '9+' : unread)) : null);
  }
}
Minimized.NAMESPACE = 'float-video-minimized';
Minimized.UNREAD_EVENT = 'onUnreadCountUpdate.localStreamNotifications';
const __Minimized = (0,mixins.Zz)(withMicObserver, permissionsObserver.$)(Minimized);
;// ./js/chat/ui/meetings/stream.jsx














const Admit = (0,external_React_.lazy)(() => REQ_.e( 752).then(REQ_.bind(REQ_, 3056)));
const NAMESPACE = 'stream';
const chunkNodes = (nodes, size) => {
  if (nodes && nodes.length && size) {
    const chunked = [];
    let index = 0;
    while (index < nodes.length) {
      chunked.push({
        id: index,
        nodes: nodes.slice(index, index + size)
      });
      index += size;
    }
    return chunked;
  }
  return null;
};
const filterAndSplitSources = (sources, call) => {
  const screen = [];
  const video = [];
  const rest = [];
  for (const peer of Object.values(sources.toJS())) {
    if (peer instanceof CallManager2.Peer) {
      if (peer.hasScreen) {
        screen.push(peer, peer);
      } else if (peer.videoMuted) {
        rest.push(peer);
      } else {
        video.push(peer);
      }
    }
  }
  const local = call.getLocalStream();
  if (local.hasScreen) {
    const presenters = [...call.presenterStreams];
    if (presenters.pop() === u_handle) {
      screen.unshift(local, local);
    } else {
      screen.push(local, local);
    }
  } else if (local.av & Av.Camera) {
    video.unshift(local);
  } else {
    rest.push(local);
  }
  return {
    screen,
    video,
    rest
  };
};
class stream_Stream extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.containerRef = REaCt().createRef();
    this.nodeRefs = [];
    this.chunks = [];
    this.chunksLength = 0;
    this.lastRescaledCache = undefined;
    this.state = {
      page: 0,
      overlayed: false,
      streamsPerPage: utils.gh.MED,
      floatDetached: false,
      wrToggled: false
    };
    this.toggleFloatDetachment = () => {
      this.setState(state => ({
        floatDetached: !state.floatDetached
      }));
    };
    this.toggleWaitingRoomList = state => {
      this.setState({
        wrToggled: state
      });
    };
  }
  movePage(direction) {
    return this.setState(state => ({
      page: direction === utils.Bq.NEXT ? state.page + 1 : state.page - 1
    }));
  }
  getColumns(streamsCount) {
    switch (true) {
      case streamsCount >= 43:
        return 7;
      case streamsCount >= 26:
        return 6;
      case streamsCount >= 17:
        return 5;
      case streamsCount >= 13:
        return 4;
      case streamsCount === 1:
        return 1;
      case streamsCount >= 7:
        return 3;
      default:
        return 2;
    }
  }
  scaleNodes(columns, forced = false) {
    let _Object$values$page;
    const {
      peers,
      minimized,
      mode,
      call
    } = this.props;
    const {
      screen,
      video,
      rest
    } = filterAndSplitSources(peers, call);
    let presenter = false;
    const sources = [...screen, ...video, ...rest].filter(source => {
      if (!source.isLocal) {
        return true;
      }
      if (source.hasScreen && !presenter) {
        presenter = true;
        return true;
      }
      return false;
    });
    presenter = false;
    const container = this.containerRef.current;
    this.lastRescaledCache = forced ? null : this.lastRescaledCache;
    if (minimized || !container) {
      return;
    }
    const {
      floatDetached,
      streamsPerPage,
      page
    } = this.state;
    const parentRef = container.parentNode;
    const parentStyle = getComputedStyle(parentRef);
    const extraVerticalMargin = parseInt(parentStyle.paddingTop) + parseInt(parentStyle.paddingBottom);
    let containerWidth = parentRef.offsetWidth;
    let containerHeight = parentRef.offsetHeight - extraVerticalMargin;
    const nodesPerPage = floatDetached ? streamsPerPage : streamsPerPage - 1;
    const streamsInUI = sources.length > nodesPerPage ? (_Object$values$page = Object.values(this.chunks)[page]) == null ? void 0 : _Object$values$page.nodes : sources;
    if (streamsInUI) {
      const streamCountInUI = sources.length > nodesPerPage || floatDetached ? streamsInUI.length : streamsInUI.length + 1;
      let rows;
      if (mode === utils.g.THUMBNAIL) {
        columns = typeof columns === 'number' ? columns : this.getColumns(streamCountInUI);
        rows = Math.ceil(streamCountInUI / columns);
      } else {
        rows = 1;
        columns = 1;
      }
      containerWidth -= columns * 6 * 2;
      containerHeight -= rows * 6 * 2;
      let targetWidth = Math.floor(containerWidth / columns);
      let targetHeight = targetWidth / 16 * 9;
      if (targetHeight * rows > containerHeight) {
        targetHeight = Math.floor(containerHeight / rows);
        targetWidth = targetHeight / 9 * 16;
      }
      const nodeRefs = this.nodeRefs.flat();
      const nodeRefsLength = nodeRefs.length;
      const viewMode = mode || utils.g.MAIN;
      let cache = `${viewMode}:${targetWidth}:${targetHeight}:${nodeRefsLength}:${rows}:${streamCountInUI}:${columns}`;
      for (let i = 0; i < nodeRefsLength; i++) {
        cache += `${nodeRefs[i].cacheKey}:`;
      }
      if (this.lastRescaledCache === cache) {
        return;
      }
      this.lastRescaledCache = cache;
      for (let i = 0; i < nodeRefsLength; i++) {
        const node = nodeRefs[i];
        if (node && node.ref) {
          node.ref.style.width = `${targetWidth}px`;
          node.ref.style.height = `${targetHeight}px`;
        }
      }
      container.style.width = `${(targetWidth + 12) * columns}px`;
    }
  }
  renderNodes() {
    const {
      mode,
      peers,
      call,
      raisedHandPeers,
      chatRoom,
      onVideoDoubleClick,
      onModeChange
    } = this.props;
    const {
      page,
      streamsPerPage,
      floatDetached
    } = this.state;
    const {
      screen,
      video,
      rest
    } = filterAndSplitSources(peers, call);
    const sources = [...screen, ...video, ...rest];
    if (mode === utils.g.THUMBNAIL) {
      const nodesPerPage = floatDetached ? streamsPerPage : streamsPerPage - 1;
      if (sources.length <= nodesPerPage) {
        const $$PEER = (peer, i) => {
          const {
            clientId,
            hasScreenAndCam,
            hasScreen,
            isLocal
          } = peer;
          if (screen.length && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)) {
            screen.shift();
          }
          if (!(peer instanceof CallManager2.Peer)) {
            const isPresenterNode = screen.length && screen[0].isLocal;
            if (floatDetached && !isPresenterNode) {
              return;
            }
            if (floatDetached || !isPresenterNode) {
              return JSX_(LocalVideoThumb, {
                key: `${mode}_thumb_${u_handle}`,
                chatRoom,
                isPresenterNode: false,
                raisedHandPeers,
                source: peer,
                didMount: ref => {
                  this.nodeRefs.push({
                    clientId: u_handle,
                    cacheKey: `${mode}_${u_handle}_thumb`,
                    ref
                  });
                  this.scaleNodes(undefined, true);
                },
                willUnmount: () => {
                  this.nodeRefs = this.nodeRefs.filter(nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}_thumb`);
                }
              }, this.renderSelfViewMenu());
            }
            return JSX_(LocalVideoHiRes, {
              key: `${mode}_${u_handle}`,
              chatRoom,
              isPresenterNode,
              source: isPresenterNode && peer,
              raisedHandPeers,
              didMount: ref => {
                this.nodeRefs.push({
                  clientId: u_handle,
                  cacheKey: `${mode}_${u_handle}`,
                  ref
                });
                this.scaleNodes(undefined, true);
              },
              willUnmount: () => {
                this.nodeRefs = this.nodeRefs.filter(nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}`);
              }
            }, hasScreen ? this.renderNodeMenu(peer, {
              isPresenterNode
            }) : this.renderSelfViewMenu());
          }
          const presenterCid = screen.length && screen[0].clientId === clientId;
          let PeerClass = PeerVideoThumb;
          if (hasScreenAndCam) {
            PeerClass = presenterCid ? PeerVideoHiRes : PeerVideoThumbFixed;
          }
          const cacheKey = `${mode}_${clientId}_${i}_${hasScreenAndCam ? 1 : 0}`;
          return JSX_(PeerClass, {
            key: cacheKey,
            mode,
            chatRoom,
            menu: true,
            source: peer,
            raisedHandPeers,
            isPresenterNode: !!presenterCid,
            onDoubleClick: (peer, e) => {
              e.preventDefault();
              e.stopPropagation();
              onVideoDoubleClick(peer, !presenterCid);
            },
            didMount: ref => {
              this.nodeRefs.push({
                clientId: presenterCid || clientId,
                cacheKey,
                ref
              });
            },
            willUnmount: () => {
              this.nodeRefs = this.nodeRefs.filter(nodeRef => nodeRef.cacheKey !== cacheKey);
            }
          }, this.renderNodeMenu(peer, {
            isPresenterNode: !!presenterCid
          }));
        };
        return sources.map((p, i) => $$PEER(p, i));
      }
      if (floatDetached) {
        for (let i = 0; i < sources.length; i++) {
          if (sources[i].isLocal) {
            sources.splice(i, 1);
            break;
          }
        }
      }
      this.chunks = chunkNodes(sources, streamsPerPage);
      this.chunksLength = Object.values(this.chunks).length;
      return JSX_("div", {
        className: "carousel"
      }, JSX_("div", {
        className: "carousel-container"
      }, Object.values(this.chunks).map((chunk, i) => {
        const {
          id,
          nodes
        } = chunk;
        return JSX_("div", {
          key: id,
          className: `
                                        carousel-page
                                        ${i === page ? 'active' : ''}
                                    `
        }, nodes.map((peer, j) => {
          const {
            clientId,
            hasScreenAndCam,
            hasScreen,
            isLocal
          } = peer;
          if (screen.length && (screen[0].clientId === clientId || screen[0].isLocal && isLocal)) {
            screen.shift();
          }
          if (peer instanceof CallManager2.Peer) {
            const presenterCid = screen.length && screen[0].clientId === clientId;
            const cacheKey = `${mode}_${clientId}_${j + i * streamsPerPage}_${hasScreenAndCam ? 1 : 0}`;
            let PeerClass = PeerVideoThumb;
            if (hasScreenAndCam) {
              PeerClass = presenterCid ? PeerVideoHiRes : PeerVideoThumbFixed;
            }
            return JSX_(PeerClass, {
              key: cacheKey,
              mode,
              source: peer,
              chatRoom,
              isPresenterNode: !!presenterCid,
              raisedHandPeers,
              onDoubleClick: (peer, e) => {
                e.preventDefault();
                e.stopPropagation();
                onVideoDoubleClick(peer);
              },
              didMount: ref => {
                if (!this.nodeRefs[id]) {
                  this.nodeRefs[id] = [];
                }
                this.nodeRefs[id].push({
                  clientId: presenterCid || clientId,
                  ref,
                  cacheKey
                });
                this.scaleNodes(undefined, true);
              },
              willUnmount: () => {
                this.nodeRefs = this.nodeRefs.map(chunk => chunk.filter(nodeRef => nodeRef.cacheKey !== cacheKey));
              }
            }, this.renderNodeMenu(peer, {
              isPresenterNode: !!presenterCid
            }));
          }
          const isPresenterNode = screen.length && screen[0].isLocal;
          if (floatDetached && !isPresenterNode) {
            return null;
          }
          if (floatDetached || !isPresenterNode) {
            return JSX_(LocalVideoThumb, {
              key: `${mode}_thumb_${u_handle}`,
              chatRoom,
              source: peer,
              isPresenterNode: false,
              didMount: ref => {
                if (!this.nodeRefs[id]) {
                  this.nodeRefs[id] = [];
                }
                this.nodeRefs[id].push({
                  clientId: u_handle,
                  cacheKey: `${mode}_${u_handle}_thumb`,
                  ref
                });
                this.scaleNodes(undefined, true);
              },
              willUnmount: () => {
                this.nodeRefs = this.nodeRefs.map(chunk => chunk.filter(nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}_thumb`));
              }
            }, this.renderSelfViewMenu());
          }
          return JSX_(LocalVideoHiRes, {
            key: `${mode}_${u_handle}`,
            chatRoom,
            raisedHandPeers,
            isPresenterNode,
            source: isPresenterNode && peer,
            didMount: ref => {
              if (!this.nodeRefs[id]) {
                this.nodeRefs[id] = [];
              }
              this.nodeRefs[id].push({
                clientId: u_handle,
                ref,
                cacheKey: `${mode}_${u_handle}`
              });
              this.scaleNodes(undefined, true);
            },
            willUnmount: () => {
              this.nodeRefs = this.nodeRefs.map(chunk => chunk.filter(nodeRef => nodeRef.cacheKey !== `${mode}_${u_handle}`));
            }
          }, hasScreen ? this.renderNodeMenu(peer, {
            isPresenterNode
          }) : this.renderSelfViewMenu());
        }));
      })));
    }
    const source = call.getActiveStream();
    if (!source) {
      return null;
    }
    const VideoType = source.isLocal ? LocalVideoHiRes : PeerVideoHiRes;
    const videoNodeRef = REaCt().createRef();
    return JSX_(VideoType, {
      key: source.clientId,
      chatRoom,
      raisedHandPeers,
      source,
      isPresenterNode: source.hasScreen,
      toggleFullScreen: () => {
        call.setPinnedCid(source.clientId);
      },
      onSpeakerChange: () => {
        onModeChange(utils.g.THUMBNAIL);
      },
      ref: node => {
        videoNodeRef.current = node;
      }
    }, this.renderNodeMenu(source, {
      key: `${source.clientId}-main`,
      isMain: true,
      videoNodeRef,
      isPresenterNode: source.hasScreen
    }));
  }
  renderNodeMenu(peer, props) {
    const {
      mode,
      chatRoom,
      ephemeralAccounts,
      onCallMinimize,
      onSpeakerChange,
      onModeChange
    } = this.props;
    return JSX_(VideoNodeMenu, (0,esm_extends.A)({
      mode,
      privilege: chatRoom.members[peer.userHandle],
      chatRoom,
      stream: peer,
      ephemeralAccounts,
      onCallMinimize,
      onSpeakerChange,
      onModeChange
    }, props));
  }
  renderSelfViewMenu() {
    const {
      call,
      onSpeakerChange
    } = this.props;
    return JSX_("div", {
      className: "node-menu theme-dark-forced"
    }, JSX_("div", {
      className: "node-menu-toggle"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-more-horizontal-thin-outline"
    })), JSX_("div", {
      className: "node-menu-content"
    }, JSX_("ul", null, JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono grid-main",
      onClick: () => onSpeakerChange(call.getLocalStream())
    }, JSX_("span", null, l.display_in_main_view))), JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono grid-separate",
      onClick: this.toggleFloatDetachment
    }, JSX_("span", null, l.separate_from_grid_button))))));
  }
  renderOnHold() {
    return JSX_("div", {
      className: "on-hold-overlay"
    }, JSX_("div", {
      className: "stream-on-hold theme-light-forced",
      onClick: this.props.onHoldClick
    }, JSX_("i", {
      className: "sprite-fm-mono icon-play"
    }), JSX_("span", null, l[23459])));
  }
  renderStreamContainer() {
    const {
      call,
      chatRoom,
      peers,
      stayOnEnd,
      everHadPeers,
      isOnHold,
      mode,
      hasOtherParticipants,
      onInviteToggle,
      onStayConfirm,
      onCallEnd
    } = this.props;
    const {
      screen,
      video,
      rest
    } = filterAndSplitSources(peers, call);
    const sources = [...screen, ...video, ...rest];
    const showNotice = sources.length === 0 || !hasOtherParticipants && !call.presenterStreams.has(u_handle);
    const streamContainer = content => JSX_("div", {
      ref: this.containerRef,
      className: `
                    ${NAMESPACE}-container
                    ${showNotice ? 'with-notice' : ''}
                    ${sources.length === 1 && mode === utils.g.THUMBNAIL ? `${this.state.floatDetached ? 'single' : 'dual'}-stream` : ''}
                `
    }, content);
    if (showNotice) {
      return JSX_(ParticipantsNotice, {
        call,
        hasLeft: call.left,
        chatRoom,
        everHadPeers,
        streamContainer,
        stayOnEnd,
        isOnHold,
        onInviteToggle,
        onStayConfirm,
        onCallEnd: () => onCallEnd(1)
      });
    }
    return streamContainer(this.renderNodes());
  }
  renderToaster() {
    return JSX_(chatToaster.default, {
      showDualNotifications: true,
      hidden: this.props.minimized,
      onShownToast: toast => {
        if (toast.options && toast.options.persistent) {
          this.setState({
            overlayed: true
          });
        }
      },
      onHideToast: toast => {
        if (this.state.overlayed && toast.options && toast.options.persistent) {
          this.setState({
            overlayed: false
          });
        }
      }
    });
  }
  specShouldComponentUpdate(nextProps) {
    if (nextProps.minimized !== this.props.minimized || nextProps.mode !== this.props.mode || nextProps.isFloatingPresenter !== this.props.isFloatingPresenter) {
      return true;
    }
    return null;
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    chatGlobalEventManager.r.removeEventListener('resize', this.getUniqueId());
    mBroadcaster.removeListener(this.callHoldListener);
  }
  componentDidMount() {
    super.componentDidMount();
    this.scaleNodes();
    chatGlobalEventManager.r.addEventListener('resize', this.getUniqueId(), () => this.scaleNodes());
    this.callHoldListener = mBroadcaster.addListener('meetings:toggleHold', () => this.scaleNodes(undefined, true));
  }
  componentDidUpdate() {
    super.componentDidMount();
    const {
      call,
      mode,
      forcedLocal,
      onSpeakerChange,
      onModeChange
    } = this.props;
    this.scaleNodes();
    if (this.chunksLength > 0 && this.state.page + 1 > this.chunksLength) {
      this.movePage(utils.Bq.PREV);
    }
    if (mode === utils.g.THUMBNAIL && call.pinnedCid !== null) {
      this.hasPresenter = true;
      onSpeakerChange(call.getActiveStream());
    } else if (mode === utils.g.MAIN && call.pinnedCid === null && !call.presenterStreams.size && this.hasPresenter) {
      this.hasPresenter = false;
      onModeChange(utils.g.THUMBNAIL);
    } else if (mode === utils.g.MAIN && forcedLocal && call.pinnedCid !== 0) {
      onSpeakerChange(call.getActiveStream());
    } else if (!call.presenterStreams.size) {
      this.hasPresenter = false;
    }
  }
  render() {
    const {
      overlayed,
      page,
      streamsPerPage,
      floatDetached,
      wrToggled
    } = this.state;
    const {
      mode,
      call,
      chatRoom,
      minimized,
      peers,
      sidebar,
      hovered,
      forcedLocal,
      view,
      isOnHold,
      waitingRoomPeers,
      recorderCid,
      raisedHandPeers,
      isFloatingPresenter,
      onRecordingToggle,
      onCallMinimize,
      onCallExpand,
      onModeChange,
      onAudioClick,
      onVideoClick,
      onCallEnd,
      onScreenSharingClick,
      onHoldClick,
      onSpeakerChange,
      onParticipantsToggle,
      setActiveElement
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${NAMESPACE}
                    ${sidebar ? '' : 'full'}
                    ${hovered ? 'hovered' : ''}
                `
    }, JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, waitingRoomPeers && waitingRoomPeers.length ? JSX_(Admit, {
      chatRoom,
      call,
      peers: waitingRoomPeers,
      expanded: wrToggled,
      onWrListToggle: this.toggleWaitingRoomList
    }) : null), this.renderToaster(), minimized ? null : JSX_(REaCt().Fragment, null, JSX_("div", {
      className: `
                                ${NAMESPACE}-wrapper
                                ${mode === utils.g.MAIN ? 'with-participants-block' : ''}
                            `
    }, isOnHold ? this.renderOnHold() : overlayed && JSX_("div", {
      className: "call-overlay"
    }), this.renderStreamContainer()), mode === utils.g.MAIN && JSX_(ParticipantsBlock, (0,esm_extends.A)({}, this.props, {
      floatDetached,
      onSeparate: this.toggleFloatDetachment
    })), JSX_(StreamHead, {
      disableCheckingVisibility: true,
      mode,
      peers,
      page,
      streamsPerPage,
      floatDetached,
      chunksLength: this.chunksLength,
      call,
      chatRoom,
      onCallMinimize,
      onModeChange,
      onStreamsPerPageChange: streamsPerPage => this.setState({
        streamsPerPage
      }),
      onMovePage: direction => this.movePage(direction),
      setActiveElement
    })), minimized || floatDetached ? JSX_(FloatingVideo, {
      call,
      peers,
      mode,
      view,
      floatDetached,
      isOnHold,
      chatRoom,
      minimized,
      sidebar,
      forcedLocal,
      isPresenterNode: isFloatingPresenter,
      wrapperRef: this.domRef,
      waitingRoomPeers,
      recorderCid,
      raisedHandPeers,
      onRecordingToggle,
      onAudioClick,
      onVideoClick,
      onCallEnd,
      onScreenSharingClick,
      onCallMinimize,
      onMoveIntoGrid: this.toggleFloatDetachment,
      onCallExpand: async () => {
        await onCallExpand();
        this.scaleNodes(undefined, true);
      },
      onSpeakerChange,
      onModeChange,
      onHoldClick,
      onParticipantsToggle,
      onWrListToggle: this.toggleWaitingRoomList
    }) : null);
  }
}
// EXTERNAL MODULE: ./js/chat/ui/composedTextArea.jsx + 1 modules
const composedTextArea = REQ_(2558);
// EXTERNAL MODULE: ./js/chat/ui/historyPanel.jsx + 7 modules
const historyPanel = REQ_(5522);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/chat/ui/meetings/collapse.jsx

class Collapse extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.state = {
      expanded: true
    };
  }
  render() {
    const {
      expanded
    } = this.state;
    const {
      heading,
      badge,
      children
    } = this.props;
    return JSX_("div", {
      className: "collapse"
    }, heading && JSX_("div", {
      className: "collapse-head",
      onClick: () => this.setState(state => ({
        expanded: !state.expanded
      }))
    }, JSX_("i", {
      className: `
                                sprite-fm-mono
                                ${expanded ? 'icon-arrow-down' : 'icon-arrow-up'}
                            `
    }), JSX_("h5", null, heading), badge !== undefined && badge > 0 && JSX_("span", {
      className: "participants-count"
    }, badge)), expanded && children);
  }
}
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/utils.jsx
const contactsPanel_utils = REQ_(836);
;// ./js/chat/ui/meetings/participants.jsx












class Participant extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.raisedHandListener = undefined;
    this.baseIconClass = 'sprite-fm-mono';
    this.state = {
      raisedHandPeers: []
    };
    this.state.raisedHandPeers = this.props.raisedHandPeers || [];
  }
  componentDidMount() {
    super.componentDidMount();
    this.props.source.registerConsumer(this);
    this.raisedHandListener = mBroadcaster.addListener('meetings:raisedHand', raisedHandPeers => this.setState({
      raisedHandPeers
    }, () => this.safeForceUpdate()));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.source.deregisterConsumer(this);
    mBroadcaster.removeListener(this.raisedHandListener);
  }
  onAvChange() {
    this.safeForceUpdate();
  }
  render() {
    const {
      call,
      mode,
      chatRoom,
      source,
      contact,
      handle,
      name,
      recorderCid,
      onCallMinimize,
      onSpeakerChange,
      onModeChange
    } = this.props;
    const {
      isOnHold,
      videoMuted,
      audioMuted,
      clientId
    } = source;
    const isRelated = (0,contactsPanel_utils.X7)(contact);
    return JSX_("div", {
      ref: this.domRef,
      className: "participant-wrapper"
    }, this.state.raisedHandPeers.includes(handle) && !isOnHold ? JSX_("div", {
      className: "participant-signifier"
    }, JSX_("i", {
      className: "sprite-fm-uni icon-raise-hand"
    })) : JSX_(ui_contacts.eu, {
      contact: M.u[handle]
    }), JSX_("div", {
      className: "name"
    }, handle === u_handle ? JSX_(ui_utils.zT, null, `${name} ${l.me}`) : JSX_(ui_contacts.uA, {
      contact: M.u[handle],
      emoji: true
    }), (0,utils.Cy)(chatRoom, handle) && JSX_("span", null, JSX_("i", {
      className: `${this.baseIconClass} icon-admin-outline`
    }))), JSX_("div", {
      className: "status"
    }, recorderCid === clientId || recorderCid === call.sfuClient.cid && handle === u_handle ? JSX_("div", {
      className: "recording-status"
    }, JSX_("span", null)) : null, JSX_("i", {
      className: `
                            ${this.baseIconClass}
                            ${videoMuted ? 'icon-video-off-thin-outline inactive' : 'icon-video-thin-outline'}
                        `
    }), JSX_(AudioLevelIndicator, {
      source
    }), JSX_("div", {
      className: "participants-menu theme-dark-forced"
    }, JSX_("div", {
      className: "participants-menu-toggle"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-side-menu"
    })), JSX_("div", {
      className: "participants-menu-content"
    }, JSX_("ul", null, isRelated ? JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono icon-info",
      onClick: () => {
        onCallMinimize();
        loadSubPage(`fm/chat/contacts/${handle}`);
      }
    }, JSX_("span", null, l[6859]))) : null, chatRoom.iAmOperator() && u_handle !== handle && !audioMuted && JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono icon-mic-off-thin-outline",
      onClick: () => {
        call.sfuClient.mutePeer(clientId);
        megaChat.plugins.userHelper.getUserNickname(handle).catch(dump).always(name => {
          ChatToast.quick(l.you_muted_peer.replace('%NAME', name || ''));
        });
      }
    }, JSX_("span", null, l[16214]))), isRelated ? JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono icon-chat",
      onClick: () => {
        onCallMinimize();
        loadSubPage(`fm/chat/p/${handle}`);
      }
    }, JSX_("span", null, l.send_message))) : null, chatRoom.iAmOperator() && u_handle !== handle && JSX_("li", null, JSX_(Privilege, {
      stream: source,
      chatRoom
    })), JSX_("li", null, JSX_(Pin, {
      mode,
      stream: source,
      onSpeakerChange,
      onModeChange
    })), call.isPublic && chatRoom.iAmOperator() && u_handle !== handle && JSX_("li", null, JSX_(meetings_button.A, {
      icon: "sprite-fm-mono icon-disabled-filled",
      onClick: () => chatRoom.trigger('onRemoveUserRequest', handle)
    }, JSX_("span", null, l[8867]))))))));
  }
}
class Participants extends mixins.w9 {
  get allPeersMuted() {
    return Object.values(this.props.peers).filter(p => p instanceof CallManager2.Peer).every(p => p.audioMuted);
  }
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.muteRef = REaCt().createRef();
    this.NAMESPACE = 'participants';
    this.FILTER = {
      IN_CALL: 0,
      CHAT_PARTICIPANTS: 1
    };
    this.state = {
      filter: this.FILTER.IN_CALL,
      noResponsePeers: [],
      ringingPeers: [],
      allPeersMuted: undefined
    };
    this.doHangUp = handle => {
      if (handle) {
        const {
          call,
          chatRoom
        } = this.props;
        return this.isMounted() && this.setState(state => ({
          ringingPeers: state.ringingPeers.filter(p => p !== handle)
        }), () => chatRoom.ringUser(handle, call.callId, 0));
      }
    };
    this.doCall = handle => {
      if (handle) {
        const {
          call,
          chatRoom
        } = this.props;
        this.setState(state => ({
          ringingPeers: [...state.ringingPeers, handle]
        }), () => {
          chatRoom.ringUser(handle, call.callId, 1);
          if (chatRoom.options.w) {
            let _call$sfuClient;
            call == null || (_call$sfuClient = call.sfuClient) == null || _call$sfuClient.wrAllowJoin([handle]);
          }
          tSleep(40).then(() => {
            this.doHangUp(handle);
            return Object.keys(chatRoom.uniqueCallParts).includes(handle) ? null : this.setState(state => ({
              noResponsePeers: [...state.noResponsePeers, handle]
            }));
          });
        });
      }
    };
    this.getCallState = handle => {
      const {
        noResponsePeers,
        ringingPeers
      } = this.state;
      if (this.props.initialCallRinging || ringingPeers.includes(handle)) {
        return l.call_state_calling;
      }
      if (noResponsePeers.includes(handle)) {
        return l.call_state_no_response;
      }
      return l.call_state_not_in_call;
    };
    this.getCallParticipants = () => {
      const {
        call,
        mode,
        chatRoom,
        recorderCid,
        raisedHandPeers,
        onCallMinimize,
        onSpeakerChange,
        onModeChange
      } = this.props;
      const peers = Object.values(this.props.peers);
      const $$PEER = peer => peer && JSX_("li", {
        key: `${peer.clientId || ''}-${peer.userHandle}`
      }, JSX_(Participant, {
        call,
        mode,
        chatRoom,
        source: peer.userHandle ? peer : call.getLocalStream(),
        contact: M.u[peer.userHandle] || undefined,
        handle: peer.userHandle || u_handle,
        name: peer.name || M.getNameByHandle(u_handle),
        recorderCid,
        raisedHandPeers,
        onCallMinimize,
        onSpeakerChange,
        onModeChange
      }));
      let $$RAISED = [];
      for (const userHandle of call.sfuClient.raisedHands) {
        const peer = peers.find(p => (p.userHandle || p.localPeerStream.userHandle) === userHandle);
        $$RAISED = [...$$RAISED, $$PEER(peer)];
      }
      const $$REST = peers.filter(p => ![...call.sfuClient.raisedHands].includes(p.userHandle || p.localPeerStream.userHandle)).sort((a, b) => !!a.userHandle - !!b.userHandle).map(peer => $$PEER(peer));
      return JSX_("ul", null, $$RAISED, $$REST);
    };
    this.getChatParticipants = () => {
      const {
        chatRoom,
        initialCallRinging
      } = this.props;
      const {
        ringingPeers
      } = this.state;
      const callParticipants = Object.keys(chatRoom.uniqueCallParts);
      const chatParticipants = chatRoom.getParticipantsExceptMe().filter(h => !callParticipants.includes(h));
      if (chatParticipants != null && chatParticipants.length) {
        return JSX_(REaCt().Fragment, null, chatParticipants.length > 1 ? (() => {
          const isRingingAll = initialCallRinging || JSON.stringify(ringingPeers) === JSON.stringify(chatParticipants);
          return JSX_(meetings_button.A, {
            className: `
                                        mega-button
                                        action
                                        neutral
                                        call-control-all
                                        ${isRingingAll ? 'disabled' : ''}
                                    `,
            icon: "sprite-fm-mono phone-call-01",
            onClick: () => isRingingAll ? null : chatParticipants.map(handle => this.doCall(handle))
          }, l.call_all_button);
        })() : null, JSX_("ul", null, chatParticipants.map(handle => {
          const contact = M.u[handle];
          const isRinging = initialCallRinging || ringingPeers.includes(handle);
          return JSX_("li", {
            key: handle
          }, JSX_(ui_contacts.eu, {
            contact
          }), JSX_("div", {
            className: "name"
          }, JSX_(ui_contacts.uA, {
            contact: M.u[handle],
            emoji: true
          }), JSX_("span", {
            className: `
                                            user-card-presence
                                            ${megaChat.userPresenceToCssClass(contact.presence)}
                                        `
          }), (0,utils.Cy)(chatRoom, handle) && JSX_("span", null, JSX_("i", {
            className: "sprite-fm-mono icon-admin-outline"
          })), JSX_("div", {
            className: "call-state"
          }, this.getCallState(handle))), isRinging ? null : JSX_("div", {
            className: "call-control"
          }, JSX_(meetings_button.A, {
            className: "mega-button action neutral",
            onClick: () => this.doCall(handle)
          }, l.call_button)));
        })));
      }
      return JSX_("div", {
        className: "participants-empty"
      }, JSX_("span", {
        className: "empty-check-icon"
      }), JSX_("h3", null, l.all_participants_in_call));
    };
    this.renderParticipantsList = () => {
      const {
        filter,
        raisedHandPeers
      } = this.state;
      return JSX_("div", {
        className: `
                    participants-list
                    ${filter === this.FILTER.IN_CALL ? '' : 'with-chat-participants'}
                    ${this.props.guest ? 'guest' : ''}
                `
      }, JSX_(perfectScrollbar.O, {
        filter,
        raisedHandPeers,
        options: {
          'suppressScrollX': true
        }
      }, filter === this.FILTER.IN_CALL ? this.getCallParticipants() : this.getChatParticipants()));
    };
    this.renderMuteAllControl = () => {
      const {
        allPeersMuted
      } = this.state;
      const simpletip = {
        label: l.mute_all_tooltip,
        position: 'top',
        className: 'theme-dark-forced'
      };
      return JSX_(meetings_button.A, {
        ref: this.muteRef,
        simpletip: allPeersMuted ? null : simpletip,
        className: `
                    mega-button
                    action
                    ${this.NAMESPACE}-mute
                    ${allPeersMuted ? 'disabled' : ''}
                `,
        icon: "sprite-fm-mono icon-mic-off-thin-outline",
        onClick: () => {
          let _this$muteRef, _muteRef$buttonRef;
          const muteRef = (_this$muteRef = this.muteRef) == null ? void 0 : _this$muteRef.current;
          const buttonRef = (_muteRef$buttonRef = muteRef.buttonRef) == null ? void 0 : _muteRef$buttonRef.current;
          return allPeersMuted ? null : this.setState({
            allPeersMuted: true
          }, () => {
            this.props.call.sfuClient.mutePeer();
            ChatToast.quick(l.you_muted_all_peers);
            if (buttonRef) {
              $(buttonRef).trigger('simpletipClose');
            }
          });
        }
      }, allPeersMuted ? l.all_muted : l.mute_all);
    };
    this.state.allPeersMuted = this.allPeersMuted;
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    ['onCallPeerJoined', 'onPeerAvChange'].map(event => this.props.chatRoom.off(`${event}.${this.NAMESPACE}`));
  }
  componentDidMount() {
    super.componentDidMount();
    this.props.chatRoom.rebind(`onCallPeerJoined.${this.NAMESPACE}`, (ev, userHandle) => {
      const {
        noResponsePeers,
        ringingPeers
      } = this.state;
      this.setState({
        noResponsePeers: noResponsePeers.includes(userHandle) ? noResponsePeers.filter(h => h !== userHandle) : noResponsePeers,
        ringingPeers: ringingPeers.includes(userHandle) ? ringingPeers.filter(h => h !== userHandle) : ringingPeers
      });
    }).rebind(`onPeerAvChange.${this.NAMESPACE}`, () => this.isMounted() && this.setState({
      allPeersMuted: this.allPeersMuted
    }));
  }
  render() {
    const {
      IN_CALL,
      CHAT_PARTICIPANTS
    } = this.FILTER;
    const {
      withInvite,
      chatRoom,
      peers,
      onInviteToggle
    } = this.props;
    const {
      filter
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: this.NAMESPACE
    }, chatRoom.type === 'private' ? null : JSX_("div", {
      className: `${this.NAMESPACE}-nav`
    }, JSX_(meetings_button.A, {
      className: filter === IN_CALL ? 'active' : '',
      onClick: () => this.setState({
        filter: IN_CALL
      })
    }, l.call_heading_in_call), JSX_(meetings_button.A, {
      className: filter === CHAT_PARTICIPANTS ? 'active' : '',
      onClick: () => this.setState({
        filter: CHAT_PARTICIPANTS
      })
    }, l.call_heading_not_in_call)), filter === IN_CALL ? JSX_(REaCt().Fragment, null, JSX_("div", {
      className: `${this.NAMESPACE}-actions`
    }, withInvite && JSX_(meetings_button.A, {
      className: `
                                        mega-button
                                        action
                                        ${this.NAMESPACE}-invite
                                    `,
      icon: "sprite-fm-mono icon-user-plus-thin-outline",
      onClick: onInviteToggle
    }, l[8726]), chatRoom.iAmOperator() && this.renderMuteAllControl()), JSX_(Collapse, (0,esm_extends.A)({}, this.props, {
      filter,
      heading: l[16217],
      badge: (peers == null ? void 0 : peers.length) + 1
    }), this.renderParticipantsList())) : this.renderParticipantsList());
  }
}
;// ./js/chat/ui/meetings/guest.jsx


class Guest extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.state = {
      copy: ''
    };
  }
  componentDidMount() {
    this.setState({
      copy: `${l.free_storage_info__call.replace('%s', bytesToSize(mega.bstrg, 0))}`
    });
  }
  render() {
    const {
      copy
    } = this.state;
    return JSX_("div", {
      className: "guest-register"
    }, JSX_("div", {
      className: "guest-register-content"
    }, JSX_(meetings_button.A, {
      className: "close-guest-register",
      icon: "icon-close-component",
      onClick: this.props.onGuestClose
    }, JSX_("span", null, l[148])), JSX_("div", null, JSX_("i", {
      className: "sprite-fm-illustration-wide registration"
    }), JSX_("span", null, copy)), JSX_(meetings_button.A, {
      className: "mega-button positive register-button",
      onClick: () => loadSubPage('register')
    }, l.sign_up_btn)));
  }
}
;// ./js/chat/ui/meetings/sidebar.jsx








const inviteAllowed = chatRoom => {
  if (chatRoom) {
    return chatRoom.type !== 'private' && !!(chatRoom.options[MCO_FLAGS.OPEN_INVITE] || (0,utils.Cy)(chatRoom, u_handle) || chatRoom.publicLink);
  }
  return false;
};
class Sidebar extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.historyPanel = null;
    this.renderHead = ({
      title,
      children
    }) => {
      return JSX_("div", {
        className: "sidebar-head"
      }, JSX_(meetings_button.A, {
        simpletip: {
          label: l.close_sidebar,
          className: 'theme-dark-forced'
        },
        className: "mega-button action small left",
        icon: "icon-collapse-right",
        onClick: this.props.onSidebarClose
      }, JSX_("span", null, l.close_sidebar)), JSX_("h2", null, title), children || null);
    };
    this.renderParticipantsView = () => {
      const {
        call,
        mode,
        peers,
        initialCallRinging,
        chatRoom,
        guest,
        recorderCid,
        raisedHandPeers,
        onInviteToggle,
        onCallMinimize,
        onSpeakerChange,
        onModeChange
      } = this.props;
      const withInvite = inviteAllowed(chatRoom);
      return JSX_(REaCt().Fragment, null, this.renderHead({
        title: l[16217]
      }), JSX_(Participants, {
        withInvite,
        call,
        mode,
        peers,
        initialCallRinging,
        chatRoom,
        guest,
        recorderCid,
        raisedHandPeers,
        onInviteToggle,
        onCallMinimize,
        onSpeakerChange,
        onModeChange
      }));
    };
    this.renderChatView = () => {
      const {
        chatRoom,
        typingAreaText,
        onDeleteMessage,
        onTypingAreaChanged
      } = this.props;
      return JSX_(REaCt().Fragment, null, this.renderHead({
        title: l.chats
      }), JSX_(historyPanel.A, {
        ref: ref => {
          this.historyPanel = ref;
        },
        chatRoom,
        className: "in-call",
        onDeleteClicked: onDeleteMessage
      }), JSX_(composedTextArea.A, {
        chatRoom,
        parent: this,
        containerRef: this.domRef,
        typingAreaText,
        onTypingAreaChanged
      }));
    };
  }
  render() {
    const {
      view,
      guest,
      onGuestClose
    } = this.props;
    return JSX_("div", {
      className: "sidebar-wrapper theme-dark-forced"
    }, JSX_("div", {
      ref: this.domRef,
      className: `
                        sidebar
                        ${view === utils.gR.CHAT ? 'chat-opened' : 'theme-dark-forced'}
                    `
    }, view === utils.gR.PARTICIPANTS && this.renderParticipantsView(), view === utils.gR.CHAT && this.renderChatView(), guest && view !== utils.gR.CHAT && JSX_(Guest, {
      onGuestClose
    })));
  }
}
;// ./js/chat/ui/meetings/workflow/invite/search.jsx
let _Search;


class Search extends REaCt().Component {
  render() {
    const {
      value,
      placeholder,
      onChange
    } = this.props;
    return JSX_("div", {
      className: `${Invite.NAMESPACE}-field`
    }, JSX_("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), JSX_("input", {
      type: "text",
      autoFocus: true,
      placeholder: l[23750].replace('[X]', placeholder),
      ref: Search.inputRef,
      value,
      onChange
    }));
  }
}
_Search = Search;
Search.inputRef = REaCt().createRef();
Search.focus = () => {
  return _Search.inputRef && _Search.inputRef.current && _Search.inputRef.current.focus();
};
;// ./js/chat/ui/meetings/workflow/invite/footer.jsx


const Footer = ({
  selected,
  onClose,
  onAdd
}) => {
  return JSX_("footer", null, JSX_("div", {
    className: "footer-container"
  }, JSX_(meetings_button.A, {
    className: "mega-button",
    onClick: onClose
  }, l.msg_dlg_cancel), JSX_(meetings_button.A, {
    className: `
                        mega-button
                        positive
                        ${selected.length > 0 ? '' : 'disabled'}
                    `,
    onClick: onAdd
  }, l.add)));
};
 const footer = Footer;
;// ./js/chat/ui/meetings/workflow/invite/nil.jsx


const Nil = () => {
  return JSX_("div", {
    className: `${Invite.NAMESPACE}-nil`
  }, JSX_("div", {
    className: "fm-empty-contacts-bg"
  }), JSX_("h2", null, HAS_CONTACTS() ? l[8674] : l[784]));
};
 const nil = Nil;
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
const ui_link = REQ_(4649);
;// ./js/chat/ui/meetings/workflow/invite/invite.jsx











const HAS_CONTACTS = () => {
  const keys = M.u.keys();
  for (let i = 0; i < keys.length; i++) {
    if (M.u[keys[i]].c === 1) {
      return true;
    }
  }
};
class Invite extends REaCt().Component {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.wrapperRef = REaCt().createRef();
    this.state = {
      loading: true,
      value: '',
      searching: false,
      contacts: [],
      contactsInitial: [],
      frequents: [],
      frequentsInitial: [],
      selected: [],
      excluded: [],
      input: false
    };
    this.getSortedContactsList = (frequents, excluded) => {
      frequents = frequents || this.state.frequents;
      excluded = excluded || this.state.excluded;
      const filteredContacts = [];
      (this.props.contacts || M.u).forEach(contact => {
        if (contact.c === 1 && !frequents.includes(contact.u) && !excluded.includes(contact.u)) {
          filteredContacts.push(contact);
        }
      });
      const sortFn = M.getSortByNameFn2(1);
      filteredContacts.sort((a, b) => sortFn(a, b));
      return filteredContacts;
    };
    this.doMatch = (value, collection) => {
      value = value.toLowerCase();
      return collection.filter(contact => {
        contact = typeof contact === 'string' ? M.getUserByHandle(contact) : contact;
        const name = M.getNameByHandle(contact.u || contact).toLowerCase();
        const email = contact.m && contact.m.toLowerCase();
        return name.includes(value) || email.includes(value);
      });
    };
    this.handleSearch = ev => {
      const {
        value
      } = ev.target;
      const searching = value.length >= 2;
      const frequents = searching ? this.doMatch(value, this.state.frequentsInitial) : this.state.frequentsInitial;
      const contacts = searching ? this.doMatch(value, this.state.contactsInitial) : this.state.contactsInitial;
      this.setState({
        value,
        searching,
        frequents,
        contacts
      }, () => {
        const wrapperRef = this.wrapperRef && this.wrapperRef.current;
        if (wrapperRef && searching) {
          wrapperRef.reinitialise();
          wrapperRef.scrollToY(0);
        }
      });
    };
    this.handleSelect = userHandle => {
      this.setState(state => ({
        selected: state.selected.includes(userHandle) ? state.selected.filter(c => c !== userHandle) : [...state.selected, userHandle]
      }), () => Search.focus());
    };
    this.handleAdd = () => {
      const {
        selected
      } = this.state;
      const {
        call,
        chatRoom,
        onClose
      } = this.props;
      if (selected.length > 0) {
        if (chatRoom.options.w) {
          let _call$sfuClient;
          call == null || (_call$sfuClient = call.sfuClient) == null || _call$sfuClient.wrAllowJoin(selected);
        }
        chatRoom == null || chatRoom.trigger('onAddUserRequest', [selected]);
        onClose == null || onClose();
      }
    };
    this.getFrequentContacts = () => megaChat.getFrequentContacts().then(response => {
      if (!this.domRef.current) {
        return;
      }
      const frequents = [];
      const maxFreq = Math.max(response.length - ui_contacts.lO, 0);
      for (let i = response.length - 1; i >= maxFreq; i--) {
        const contact = response[i];
        if (!this.state.excluded.includes(contact.userId)) {
          frequents.push(contact.userId);
        }
      }
      this.setState({
        frequents,
        frequentsInitial: frequents,
        contacts: this.getSortedContactsList(frequents),
        loading: false
      });
    });
    this.getFilteredFrequents = () => {
      const {
        frequents,
        selected
      } = this.state;
      if (frequents.length === 0) {
        return false;
      }
      return frequents.map(userHandle => {
        return JSX_(ui_contacts.nB, {
          key: userHandle,
          contact: M.u[userHandle],
          chatRoom: false,
          className: `
                        contacts-search
                        short
                        ${selected.includes(userHandle) ? 'selected' : ''}
                    `,
          noContextButton: true,
          noContextMenu: true,
          selectable: true,
          onClick: () => this.handleSelect(userHandle)
        });
      });
    };
    this.getFilteredContacts = () => {
      const {
        contacts,
        frequents,
        excluded,
        selected
      } = this.state;
      const $$CONTACTS = [];
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const {
          u: userHandle
        } = contact;
        if (!frequents.includes(userHandle) && !excluded.includes(userHandle)) {
          $$CONTACTS.push(JSX_(ui_contacts.nB, {
            key: userHandle,
            contact,
            chatRoom: false,
            className: `
                            contacts-search
                            short
                            ${selected.includes(userHandle) ? 'selected' : ''}
                        `,
            noContextButton: true,
            noContextMenu: true,
            selectable: true,
            onClick: () => this.handleSelect(userHandle)
          }));
        }
      }
      return $$CONTACTS.length === 0 ? false : $$CONTACTS;
    };
    this.renderContent = () => {
      const frequentContacts = this.getFilteredFrequents();
      const contactsFiltered = this.getFilteredContacts();
      if (HAS_CONTACTS()) {
        const {
          contacts,
          frequents
        } = this.state;
        const $$RESULT_TABLE = (header, children) => JSX_("div", {
          className: "contacts-search-subsection"
        }, JSX_("div", {
          className: "contacts-list-header"
        }, header), JSX_("div", {
          className: "contacts-search-list"
        }, children));
        if (frequents.length === 0 && contacts.length === 0) {
          return JSX_(nil, null);
        }
        return JSX_(perfectScrollbar.O, {
          ref: this.wrapperRef,
          options: {
            'suppressScrollX': true
          }
        }, frequentContacts ? $$RESULT_TABLE(l[20141], frequentContacts) : '', contactsFiltered ? $$RESULT_TABLE(l[165], contactsFiltered) : '');
      }
      return JSX_(nil, null);
    };
    this.renderLoading = () => {
      return JSX_("div", {
        className: `${Invite.NAMESPACE}-loading`
      }, JSX_("h2", null, l[1456]));
    };
    this.state.excluded = this.props.chatRoom ? this.props.chatRoom.getParticipantsExceptMe() : [];
    this.state.contacts = this.state.contactsInitial = this.getSortedContactsList();
  }
  componentDidMount() {
    this.getFrequentContacts();
  }
  render() {
    const {
      NAMESPACE
    } = Invite;
    const {
      value,
      loading,
      selected,
      contactsInitial
    } = this.state;
    const {
      chatRoom,
      call,
      onClose
    } = this.props;
    const {
      isMeeting,
      publicLink
    } = chatRoom || {};
    const callPartsLength = chatRoom.getCallParticipants().length;
    return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
      ref: this.domRef,
      name: NAMESPACE,
      className: `
                    ${NAMESPACE}
                    dialog-template-tool
                `,
      callPartsLength,
      hideOverlay: true,
      onClose
    }), JSX_("div", {
      className: `${NAMESPACE}-head`
    }, JSX_("h2", null, isMeeting ? l.invite_participants : l[8726]), isMeeting && publicLink && JSX_(REaCt().Fragment, null, JSX_("p", null, l.copy_and_share), JSX_("div", {
      className: "link-input-container"
    }, JSX_(meetings_button.A, {
      className: `mega-button large positive ${publicLink ? '' : 'disabled'}`,
      onClick: () => publicLink && copyToClipboard(`${getBaseUrl()}/${publicLink}`, l[371])
    }, !publicLink ? l[7006] : l[1394]))), HAS_CONTACTS() && JSX_(Search, {
      value,
      placeholder: contactsInitial.length,
      onChange: this.handleSearch
    }), call.sfuClient.callLimits && call.sfuClient.callLimits.usr && callPartsLength >= call.sfuClient.callLimits.usr && JSX_("div", {
      className: `${NAMESPACE}-user-limit-banner`
    }, call.organiser === u_handle ? (0,ui_utils.lI)(l.invite_limit_banner_organiser, '[A]', ui_link.A, {
      className: 'invite-limit-link',
      onClick() {
        window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
        eventlog(500260);
      }
    }) : l.invite_limit_banner_host)), JSX_("div", {
      className: "fm-dialog-body"
    }, JSX_("div", {
      className: `${NAMESPACE}-contacts`
    }, loading ? this.renderLoading() : this.renderContent())), JSX_(footer, {
      selected,
      onAdd: this.handleAdd,
      onClose
    }));
  }
}
Invite.NAMESPACE = 'invite-meeting';
;// ./js/chat/ui/meetings/workflow/ephemeral.jsx



const Ephemeral = ({
  ephemeralAccounts,
  onClose
}) => {
  const ephemeralAccount = ephemeralAccounts && ephemeralAccounts[ephemeralAccounts.length - 1];
  return JSX_(modalDialogs.A.ModalDialog, {
    name: "ephemeral-dialog",
    dialogType: "message",
    icon: "sprite-fm-uni icon-info",
    title: JSX_(ui_contacts.uA, {
      emoji: true,
      contact: M.u[ephemeralAccount]
    }),
    noCloseOnClickOutside: true,
    buttons: [{
      key: 'ok',
      label: l[81],
      onClick: onClose
    }],
    onClose
  }, JSX_("p", null, l.ephemeral_info));
};
 const workflow_ephemeral = Ephemeral;
;// ./js/chat/ui/meetings/offline.jsx


const Offline = ({
  onCallEnd,
  onClose
}) => {
  return JSX_(modalDialogs.A.ModalDialog, {
    name: "reconnect-dialog",
    dialogType: "message",
    icon: "sprite-fm-uni icon-warning",
    title: l.no_internet,
    noCloseOnClickOutside: true,
    buttons: [{
      key: 'ok',
      label: l.msg_dlg_cancel,
      onClick: onClose
    }, {
      key: 'leave',
      label: l[5883],
      className: 'negative',
      onClick: onCallEnd
    }],
    onClose
  }, JSX_("p", null, l.no_connection));
};
 const meetings_offline = Offline;
// EXTERNAL MODULE: ./js/chat/ui/conversationpanel.jsx + 10 modules
const conversationpanel = REQ_(5677);
;// ./js/chat/ui/meetings/streamControls.jsx










class StreamControls extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.endContainerRef = REaCt().createRef();
    this.endButtonRef = REaCt().createRef();
    this.SIMPLETIP = {
      position: 'top',
      offset: 8,
      className: 'theme-dark-forced'
    };
    this.state = {
      endCallOptions: false,
      endCallPending: false,
      devices: {},
      audioSelectDropdown: false,
      videoSelectDropdown: false,
      loading: false,
      muteSpeak: false
    };
    this.LeaveButton = (0,hostsObserver.C)(({
      hasHost,
      chatRoom,
      confirmLeave,
      onLeave
    }) => {
      const doLeave = () => hasHost(chatRoom.call ? chatRoom.call.peers.map(a => a.userHandle) : []) ? onLeave() : confirmLeave({
        title: l.assign_host_leave_call,
        body: l.assign_host_leave_call_details,
        cta: l.assign_host_button,
        altCta: l.leave_anyway
      });
      return JSX_(meetings_button.A, {
        className: "mega-button",
        onClick: () => {
          const {
            recorderCid,
            call,
            onRecordingToggle
          } = this.props;
          return recorderCid && recorderCid === call.sfuClient.cid ? (0,utils.sX)(doLeave, onRecordingToggle) : doLeave();
        }
      }, JSX_("span", null, l.leave));
    });
    this.setActiveElement = forced => this.props.setActiveElement(forced || this.state.audioSelectDropdown || this.state.videoSelectDropdown || this.state.endCallOptions);
    this.handleMousedown = ({
      target
    }) => {
      if (this.isMounted()) {
        const {
          audioSelectDropdown,
          videoSelectDropdown,
          endCallOptions
        } = this.state;
        return (audioSelectDropdown || videoSelectDropdown || endCallOptions) && ['audio-sources', 'video-sources', 'meetings-end-options'].some(selector => {
          let _document$querySelect;
          return (_document$querySelect = document.querySelector(`.${selector}`)) == null ? void 0 : _document$querySelect.contains(target);
        }) ? 0x4B1D : this.setState({
          audioSelectDropdown: false,
          videoSelectDropdown: false,
          endCallOptions: false
        }, this.setActiveElement);
      }
    };
    this.renderDebug = () => {
      return JSX_("div", {
        className: "stream-debug",
        style: {
          position: 'absolute',
          left: 25,
          bottom: 36,
          display: 'flex',
          alignItems: 'center',
          color: 'tomato'
        }
      }, JSX_(meetings_button.A, {
        className: "mega-button round small theme-dark-forced positive",
        simpletip: {
          ...this.SIMPLETIP,
          label: 'Add Stream'
        },
        onClick: () => this.props.onStreamToggle(utils.hK.ADD)
      }, JSX_("span", null, l.add)), JSX_(meetings_button.A, {
        className: "mega-button round small theme-dark-forced negative",
        simpletip: {
          ...this.SIMPLETIP,
          label: 'Remove Stream'
        },
        onClick: () => this.props.peers.length > 1 && this.props.onStreamToggle(utils.hK.REMOVE)
      }, JSX_("span", null, l[83])), JSX_("span", null, this.props.peers.length + 1));
    };
    this.renderEndCallOptions = () => {
      let _this$endContainerRef;
      const {
        call,
        chatRoom,
        recorderCid,
        onRecordingToggle,
        onCallEnd
      } = this.props;
      const {
        endCallOptions,
        endCallPending
      } = this.state;
      const doEnd = () => this.setState({
        endCallPending: true
      }, () => chatRoom.endCallForAll());
      const endContainerRef = (_this$endContainerRef = this.endContainerRef) == null ? void 0 : _this$endContainerRef.current;
      return JSX_("div", (0,esm_extends.A)({}, endCallOptions && {
        style: (({
          left,
          top
        }) => ({
          left,
          top
        }))(endContainerRef.getBoundingClientRect())
      }, {
        className: `
                    meetings-end-options
                    theme-dark-forced
                    ${endCallOptions ? '' : 'hidden'}
                `
      }), JSX_("div", {
        className: "meetings-end-options-content"
      }, JSX_(this.LeaveButton, {
        chatRoom,
        recorderCid,
        participants: chatRoom.getCallParticipants(),
        onLeave: onCallEnd,
        onConfirmDenied: onCallEnd
      }), JSX_(meetings_button.A, {
        className: `
                            mega-button
                            positive
                            ${endCallPending ? 'disabled' : ''}
                        `,
        onClick: () => {
          if (recorderCid && recorderCid === call.sfuClient.cid) {
            return renderEndConfirm(doEnd, onRecordingToggle);
          }
          return doEnd();
        }
      }, JSX_("span", null, l.end_for_all))));
    };
    this.renderEndCall = () => {
      const {
        call,
        chatRoom,
        peers,
        recorderCid,
        onRecordingToggle,
        onCallEnd
      } = this.props;
      return JSX_("div", {
        ref: this.endContainerRef,
        className: "end-call-container",
        onClick: () => {
          if (chatRoom.type !== 'private' && peers.length && (0,utils.Cy)(chatRoom, u_handle)) {
            return this.setState(state => ({
              endCallOptions: !state.endCallOptions
            }), () => {
              if (this.endButtonRef) {
                $(this.endButtonRef.current).trigger('simpletipClose');
              }
              this.setActiveElement();
            });
          }
          if (recorderCid && recorderCid === call.sfuClient.cid) {
            return chatRoom.type === 'private' ? renderEndConfirm(onCallEnd, onRecordingToggle) : (0,utils.sX)(onCallEnd, onRecordingToggle);
          }
          return onCallEnd();
        }
      }, JSX_(ui_utils.Ay.RenderTo, {
        element: document.body
      }, this.renderEndCallOptions()), JSX_(meetings_button.A, {
        simpletip: {
          ...this.SIMPLETIP,
          label: l[5884]
        },
        className: "mega-button theme-dark-forced round negative end-call call-action",
        icon: "icon-phone-02",
        didMount: button => {
          this.endButtonRef = button.buttonRef;
        }
      }), JSX_("span", null, l.end_button));
    };
    this.renderSourceOpener = ({
      type,
      eventId
    }) => {
      return JSX_("div", {
        className: `
                    input-source-opener
                    button
                    ${this.state[type] ? 'active-dropdown' : ''}
                `,
        onClick: async ev => {
          ev.stopPropagation();
          this.setState(() => ({
            loading: true
          }), async () => {
            const devices = await this.updateMediaDevices();
            const updated = JSON.stringify(devices) !== JSON.stringify(this.state.devices);
            this.setState(state => ({
              loading: false,
              audioSelectDropdown: false,
              videoSelectDropdown: false,
              devices: updated ? devices : this.state.devices,
              [type]: !state[type]
            }), () => {
              const {
                audioSelectDropdown,
                videoSelectDropdown
              } = this.state;
              this.props.setActiveElement(audioSelectDropdown || videoSelectDropdown);
              eventlog(eventId);
            });
          });
        }
      }, JSX_("i", {
        className: "sprite-fm-mono icon-arrow-up"
      }));
    };
    this.handleDeviceChange = () => {
      this.micDefaultRenamed = false;
      this.updateMediaDevices().always(devices => {
        let _sfuClient$localAudio, _oldDevices$audioIn;
        if (!this.isMounted()) {
          return;
        }
        const {
          devices: oldDevices
        } = this.state;
        const {
          sfuClient,
          av
        } = this.props.call;
        if (av & Av.Audio && !SfuClient.micDeviceId && ((_sfuClient$localAudio = sfuClient.localAudioTrack()) == null ? void 0 : _sfuClient$localAudio.getCapabilities().deviceId) === 'default' && oldDevices != null && (_oldDevices$audioIn = oldDevices.audioIn) != null && _oldDevices$audioIn.default && devices.audioIn.default && oldDevices.audioIn.default !== devices.audioIn.default) {
          for (const [key, value] of Object.entries(devices.audioIn)) {
            if (key !== 'default' && devices.audioIn.default.indexOf(value) > -1) {
              sfuClient.setMicDevice(key).then(() => SfuClient.persistMicDevice(null));
              break;
            }
          }
        }
        this.setState({
          devices,
          audioSelectDropdown: false,
          videoSelectDropdown: false
        }, this.setActiveElement);
      });
    };
    this.renderOnboardingRaise = () => {
      const {
        chatRoom,
        onOnboardingRaiseDismiss
      } = this.props;
      return JSX_("div", {
        className: "meetings-call-onboarding"
      }, JSX_("div", {
        className: "mega-dialog mega-onboarding-dialog dialog-template-message onboarding-raise",
        id: "ob-dialog",
        role: "dialog",
        "aria-labelledby": "ob-dialog-title",
        "aria-modal": "true"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-tooltip-arrow tooltip-arrow bottom",
        id: "ob-dialog-arrow"
      }), JSX_("header", null, JSX_("div", null, JSX_("h2", {
        id: "ob-dialog-title"
      }, l.raise_onboarding_title), JSX_("p", {
        id: "ob-dialog-text"
      }, chatRoom.isMeeting ? l.raise_onboarding_body : l.raise_onboarding_group_body))), JSX_("footer", null, JSX_("div", {
        className: "footer-container"
      }, JSX_("button", {
        className: "mega-button js-next small theme-light-forced",
        onClick: onOnboardingRaiseDismiss
      }, JSX_("span", null, l.ok_button))))));
    };
    this.renderRaiseButton = () => {
      const {
        call,
        raisedHandPeers,
        onboardingRaise
      } = this.props;
      const isOnHold = call.av & Av.onHold;
      const hasRaisedHand = raisedHandPeers.includes(u_handle);
      return JSX_("li", {
        className: isOnHold ? 'disabled' : ''
      }, onboardingRaise && this.renderOnboardingRaise(), JSX_(meetings_button.A, {
        className: `
                        mega-button
                        theme-light-forced
                        call-action
                        round
                        ${isOnHold ? 'disabled' : ''}
                        ${hasRaisedHand ? 'with-fill' : ''}
                    `,
        icon: "icon-raise-hand",
        onClick: isOnHold ? null : () => {
          if (hasRaisedHand) {
            call.sfuClient.lowerHand();
            eventlog(500311);
            return;
          }
          call.sfuClient.raiseHand();
          eventlog(500249);
        }
      }), JSX_("span", null, l.raise_button));
    };
  }
  renderSoundDropdown() {
    const {
      call
    } = this.props;
    const {
      micDeviceId,
      audioOutDeviceId
    } = SfuClient;
    const {
      audioIn = {},
      audioOut = {}
    } = this.state.devices;
    let selectedIn;
    const inTrack = call.sfuClient.localAudioTrack();
    if (inTrack) {
      const {
        deviceId
      } = inTrack.getCapabilities();
      selectedIn = deviceId in audioIn ? deviceId : 'default';
      if (deviceId === 'default' && inTrack.label !== audioIn.default) {
        this.micDefaultRenamed = inTrack.label;
      }
    } else if (micDeviceId) {
      selectedIn = micDeviceId in audioIn ? micDeviceId : 'default';
    } else {
      selectedIn = 'default';
    }
    if (this.micDefaultRenamed) {
      audioIn.default = this.micDefaultRenamed;
    }
    let selectedOut;
    let peerPlayer;
    if (call.sfuClient.peers.size) {
      peerPlayer = call.sfuClient.peers.values().next().audioPlayer;
    }
    if (peerPlayer && peerPlayer.playerElem && peerPlayer.playerElem.sinkId) {
      const {
        sinkId
      } = peerPlayer.playerElem;
      selectedOut = sinkId in audioOut ? sinkId : 'default';
    } else if (audioOutDeviceId) {
      selectedOut = audioOutDeviceId in audioOut ? audioOutDeviceId : 'default';
    } else {
      selectedOut = 'default';
    }
    const mics = Object.entries(audioIn).map(([id, name]) => {
      return JSX_(dropdowns.tJ, {
        key: id,
        onClick: () => {
          call.sfuClient.setMicDevice(id === 'default' ? null : id);
          this.setState({
            audioSelectDropdown: false
          }, this.setActiveElement);
        }
      }, JSX_(REaCt().Fragment, null, JSX_("div", {
        className: "av-device-name"
      }, name), selectedIn === id && JSX_("i", {
        className: "sprite-fm-mono icon-check-small-regular-outline"
      })));
    });
    const speakers = Object.entries(audioOut).map(([id, name]) => {
      return JSX_(dropdowns.tJ, {
        key: id,
        onClick: () => {
          Promise.resolve(call.sfuClient.setAudioOutDevice(id === 'default' ? null : id)).catch(dump);
          this.setState({
            audioSelectDropdown: false
          }, this.setActiveElement);
        }
      }, JSX_(REaCt().Fragment, null, JSX_("div", {
        className: "av-device-name"
      }, name), selectedOut === id && JSX_("i", {
        className: "sprite-fm-mono icon-check-small-regular-outline"
      })));
    });
    return JSX_(dropdowns.ms, {
      className: "input-sources audio-sources theme-dark-forced",
      active: true,
      noArrow: true,
      positionMy: "center top",
      positionAt: "center bottom",
      horizOffset: -50,
      vertOffset: 16,
      closeDropdown: () => this.setState({
        audioSelectDropdown: false
      }, this.setActiveElement)
    }, JSX_("div", {
      className: "source-label"
    }, l.microphone), mics.length ? mics : JSX_(dropdowns.tJ, {
      label: l.no_mics
    }), JSX_("hr", null), JSX_("div", {
      className: "source-label"
    }, l.speaker), speakers.length ? speakers : JSX_(dropdowns.tJ, {
      label: l.no_speakers
    }), JSX_("hr", null), JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-volume-max-small-regular-outline",
      label: l.test_speaker,
      disabled: speakers.length === 0,
      onClick: () => {
        delay('call-test-speaker', () => {
          this.testAudioOut().catch(ex => {
            console.error('Failed to test audio on the selected device', ex, audioOutDeviceId);
          });
        });
      }
    }));
  }
  renderVideoDropdown() {
    const {
      call
    } = this.props;
    const {
      videoIn = {}
    } = this.state.devices;
    const {
      camDeviceId
    } = SfuClient;
    let selectedCam;
    if (call.sfuClient.localCameraTrack()) {
      const {
        deviceId
      } = call.sfuClient.localCameraTrack().getCapabilities();
      selectedCam = deviceId in videoIn ? deviceId : 'default';
    } else if (camDeviceId) {
      selectedCam = camDeviceId in videoIn ? camDeviceId : 'default';
    } else {
      selectedCam = 'default';
    }
    const cameras = Object.entries(videoIn).map(([id, name]) => {
      return JSX_(dropdowns.tJ, {
        key: id,
        onClick: () => {
          call.sfuClient.setCameraDevice(id === 'default' ? null : id);
          this.setState({
            videoSelectDropdown: false
          }, this.setActiveElement);
        }
      }, JSX_(REaCt().Fragment, null, JSX_("div", {
        className: "av-device-name"
      }, name), selectedCam === id && JSX_("i", {
        className: "sprite-fm-mono icon-check-small-regular-outline"
      })));
    });
    return JSX_(dropdowns.ms, {
      className: "input-sources video-sources theme-dark-forced",
      active: true,
      noArrow: true,
      positionMy: "center top",
      positionAt: "center bottom",
      horizOffset: -50,
      vertOffset: 16,
      closeDropdown: () => this.setState({
        videoSelectDropdown: false
      }, this.setActiveElement)
    }, JSX_("div", {
      className: "source-label"
    }, l.camera_button), cameras.length ? cameras : JSX_(dropdowns.tJ, {
      label: l.no_cameras
    }));
  }
  async updateMediaDevices() {
    let devices = await SfuClient.enumMediaDevices().catch(dump);
    devices = devices || {
      audioIn: {},
      audioOut: {},
      videoIn: {}
    };
    const removeEmptyDevices = devices => {
      for (const key of Object.keys(devices)) {
        if (!key || !devices[key]) {
          delete devices[key];
        }
      }
    };
    removeEmptyDevices(devices.audioIn);
    removeEmptyDevices(devices.audioOut);
    removeEmptyDevices(devices.videoIn);
    if (devices.audioIn.communications) {
      delete devices.audioIn.communications;
    }
    return devices;
  }
  async testAudioOut() {
    if (!SfuClient.audioOutDeviceId) {
      return megaChat.playSound(megaChat.SOUNDS.SPEAKER_TEST);
    }
    const currentDevices = await this.updateMediaDevices();
    if (currentDevices.audioOut && !(SfuClient.audioOutDeviceId in currentDevices.audioOut)) {
      return megaChat.playSound(megaChat.SOUNDS.SPEAKER_TEST);
    }
    const ctx = new AudioContext({
      sinkId: SfuClient.audioOutDeviceId
    });
    if (ctx.state !== 'running') {
      throw new Error('The audio context failed to start');
    }
    const soundBuffer = await megaChat.fetchSoundBuffer(megaChat.SOUNDS.SPEAKER_TEST);
    const buffer = await ctx.decodeAudioData(soundBuffer);
    const gain = ctx.createGain();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.07;
    source.start();
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('mousedown', this.handleMousedown);
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    this.props.chatRoom.off(`onLocalSpeechDetected.${StreamControls.NAMESPACE}`);
  }
  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('mousedown', this.handleMousedown);
    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    this.props.chatRoom.rebind(`onLocalSpeechDetected.${StreamControls.NAMESPACE}`, () => this.setState({
      muteSpeak: true
    }, () => this.setActiveElement(true)));
  }
  render() {
    const {
      call,
      signal,
      chatRoom,
      renderSignalWarning,
      hasToRenderPermissionsWarning,
      renderPermissionsWarning,
      resetError,
      blocked,
      renderBlockedWarning,
      onAudioClick,
      onVideoClick,
      onScreenSharingClick,
      onHoldClick
    } = this.props;
    const {
      audioSelectDropdown,
      videoSelectDropdown,
      muteSpeak
    } = this.state;
    const avFlags = call.av;
    const isOnHold = avFlags & Av.onHold;
    return JSX_(REaCt().Fragment, null, blocked && renderBlockedWarning(), JSX_("div", {
      ref: this.domRef,
      className: StreamControls.NAMESPACE
    }, d && localStorage.callDebug ? this.renderDebug() : '', JSX_("ul", null, JSX_("li", {
      className: `
                                ${isOnHold ? 'disabled' : ''}
                                with-input-selector
                            `,
      onClick: () => isOnHold ? null : this.setState({
        muteSpeak: false
      }, () => {
        resetError(Av.Audio);
        onAudioClick();
      })
    }, muteSpeak && JSX_("div", {
      className: "mic-muted-tip theme-light-forced",
      onClick: ev => ev.stopPropagation()
    }, JSX_("span", null, l.mic_still_muted), JSX_(meetings_button.A, {
      className: "mic-muted-tip-btn",
      onClick: () => {
        this.setState({
          muteSpeak: false
        }, () => {
          this.setActiveElement();
          eventlog(500509);
        });
      }
    }, l[148]), JSX_("i", {
      className: "sprite-fm-mono icon-tooltip-arrow tooltip-arrow bottom"
    })), JSX_(meetings_button.A, {
      className: `
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Audio || isOnHold ? '' : 'with-fill'}
                                `,
      icon: avFlags & Av.Audio ? 'icon-mic-thin-outline' : 'icon-mic-off-thin-outline'
    }), JSX_("span", null, l.mic_button), signal ? null : renderSignalWarning(), hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null, this.renderSourceOpener({
      type: 'audioSelectDropdown',
      eventId: chatRoom.isMeeting ? 500299 : 500300
    })), audioSelectDropdown && JSX_("div", {
      ref: this.audioDropdownRef
    }, this.renderSoundDropdown()), JSX_("li", {
      className: `
                                ${isOnHold ? 'disabled' : ''}
                                with-input-selector
                            `,
      onClick: () => {
        if (isOnHold) {
          return;
        }
        resetError(Av.Camera);
        onVideoClick();
      }
    }, JSX_(meetings_button.A, {
      className: `
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Camera || isOnHold ? '' : 'with-fill'}
                                `,
      icon: avFlags & Av.Camera ? 'icon-video-thin-outline' : 'icon-video-off-thin-outline'
    }), JSX_("span", null, l.camera_button), hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null, this.renderSourceOpener({
      type: 'videoSelectDropdown',
      eventId: chatRoom.isMeeting ? 500301 : 500302
    })), videoSelectDropdown && JSX_("div", {
      ref: this.videoDropdownRef
    }, this.renderVideoDropdown()), JSX_("li", {
      className: isOnHold ? 'disabled' : '',
      onClick: () => {
        if (isOnHold) {
          return;
        }
        resetError(Av.Screen);
        onScreenSharingClick();
        if (chatRoom.isMeeting) {
          eventlog(500303);
        } else {
          eventlog(500304);
        }
      }
    }, JSX_(meetings_button.A, {
      className: `
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Screen ? 'with-fill' : ''}
                                `,
      icon: avFlags & Av.Screen ? 'icon-monitor-off' : 'icon-monitor'
    }), JSX_("span", null, avFlags & Av.Screen ? l.screenshare_stop_button : l.screenshare_button), hasToRenderPermissionsWarning(Av.Screen) ? renderPermissionsWarning(Av.Screen, this) : null), chatRoom.type === 'private' ? null : this.renderRaiseButton(), JSX_("li", {
      onClick: onHoldClick
    }, JSX_(meetings_button.A, {
      className: `
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'with-fill' : ''}
                                `,
      icon: isOnHold ? 'icon-play-small-regular-outline' : 'icon-pause-small-regular-outline'
    }), JSX_("span", null, isOnHold ? l.resume_call_button : l.hold_button)), JSX_("li", null, this.renderEndCall()))));
  }
}
StreamControls.NAMESPACE = 'stream-controls';
 const streamControls = (0,mixins.Zz)(withMicObserver, permissionsObserver.$)(StreamControls);
;// ./js/chat/ui/meetings/sidebarControls.jsx



const SidebarControls = ({
  npeers,
  view,
  sidebar,
  call,
  chatRoom,
  onChatToggle,
  onParticipantsToggle,
  onInviteToggle
}) => {
  const notifications = chatRoom.getUnreadCount();
  const isOnHold = !!((call == null ? void 0 : call.av) & Av.onHold);
  const canInvite = chatRoom.type !== 'private' && !!(chatRoom.iAmOperator() || chatRoom.options[MCO_FLAGS.OPEN_INVITE] || chatRoom.publicLink);
  return JSX_("div", {
    className: "sidebar-controls"
  }, JSX_("ul", {
    className: isOnHold ? 'disabled' : ''
  }, canInvite && JSX_("li", {
    onClick: isOnHold ? null : onInviteToggle
  }, JSX_(meetings_button.A, {
    className: `
                            mega-button
                            theme-dark-forced
                            call-action
                            round
                        `,
    icon: "icon-user-plus-thin-outline"
  }), JSX_("span", {
    className: "control-label"
  }, l[8726])), JSX_("li", {
    onClick: isOnHold ? null : onChatToggle
  }, JSX_(meetings_button.A, {
    className: `
                            mega-button
                            theme-dark-forced
                            call-action
                            round
                            ${sidebar && view === utils.gR.CHAT ? 'selected' : ''}
                            ${isOnHold ? 'disabled' : ''}
                        `,
    icon: sidebar && view === utils.gR.CHAT ? 'icon-chat-filled' : 'icon-message-chat-circle-thin'
  }), JSX_("span", {
    className: "control-label"
  }, l.chat_call_button), notifications > 0 && JSX_("span", {
    className: "notification-badge notifications-count"
  }, notifications > 9 ? '9+' : notifications)), JSX_("li", {
    onClick: isOnHold ? null : onParticipantsToggle
  }, JSX_(meetings_button.A, {
    className: `
                            mega-button
                            theme-dark-forced
                            call-action
                            round
                            ${sidebar && view === utils.gR.PARTICIPANTS ? 'selected' : ''}
                            ${isOnHold ? 'disabled' : ''}
                        `,
    icon: sidebar && view === utils.gR.PARTICIPANTS ? 'icon-users-thin-solid' : 'icon-users-thin-outline'
  }), JSX_("span", {
    className: "control-label"
  }, l.participants_call_button), JSX_("span", {
    className: `
                                notification-badge
                                participants-count
                                theme-dark-forced
                                ${npeers + 1 > 99 ? 'large' : ''}
                            `
  }, npeers + 1))));
};
 const sidebarControls = SidebarControls;
;// ./js/chat/ui/meetings/call.jsx


















const call_NAMESPACE = 'meetings-call';
const MOUSE_OUT_DELAY = 2500;
class RecordingConsentDialog extends REaCt().Component {
  componentWillUnmount() {
    if ($.dialog && $.dialog === RecordingConsentDialog.dialogName) {
      closeDialog();
    }
  }
  render() {
    const {
      peers,
      recorderCid,
      onCallEnd,
      onClose
    } = this.props;
    const recordingPeer = peers[recorderCid];
    const recorderName = nicknames.getNickname(recordingPeer).substr(0, ChatToastIntegration.MAX_NAME_CHARS);
    return JSX_(modalDialogs.A.ModalDialog, {
      dialogName: RecordingConsentDialog.dialogName,
      className: `
                    mega-dialog
                    dialog-template-message
                    info
                `,
      stopKeyPropagation: true,
      noCloseOnClickOutside: true
    }, JSX_("header", null, JSX_("div", {
      className: "graphic"
    }, JSX_("i", {
      className: "info sprite-fm-uni icon-info"
    })), JSX_("div", {
      className: "info-container"
    }, JSX_("h3", {
      id: "msgDialog-title"
    }, l.call_recorded_heading), JSX_("p", {
      className: "text"
    }, JSX_(ui_utils.P9, null, l.call_recorded_body.replace('[A]', `<a href="https://mega.io/privacy" target="_blank" class="clickurl">`).replace('[/A]', '</a>'))))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_("div", {
      className: "space-between"
    }, JSX_(meetings_button.A, {
      className: "mega-button",
      onClick: onCallEnd
    }, JSX_("span", null, l[5883])), JSX_(meetings_button.A, {
      className: "mega-button positive",
      onClick: () => {
        onClose();
        ChatToast.quick(l.user_recording_toast.replace('%NAME', recorderName));
      }
    }, JSX_("span", null, l.ok_button))))));
  }
}
RecordingConsentDialog.dialogName = `${"meetings-call"}-consent`;
class Call extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.recordingConsentDialog = `${call_NAMESPACE}-consent`;
    this.ephemeralAddListener = undefined;
    this.delayProcID = null;
    this.pCallTimer = null;
    this.offlineDelayed = undefined;
    this.callStartTimeout = undefined;
    this.flagMap = attribCache.bitMapsManager.exists('obv4') ? attribCache.bitMapsManager.get('obv4') : undefined;
    this.timeoutBannerRef = REaCt().createRef();
    this.state = {
      mode: undefined,
      view: utils.gR.PARTICIPANTS,
      sidebar: false,
      forcedLocal: false,
      hovered: false,
      invite: false,
      ephemeral: false,
      offline: false,
      ephemeralAccounts: [],
      everHadPeers: false,
      guest: (0,utils.P)(),
      waitingRoomPeers: [],
      raisedHandPeers: [],
      raisedHandToast: false,
      initialCallRinging: false,
      onboardingUI: false,
      onboardingRecording: false,
      onboardingRaise: false,
      recorderCid: undefined,
      recordingConsentDialog: false,
      recordingConsented: false,
      recordingActivePeer: undefined,
      recordingTooltip: false,
      invitePanel: false,
      presenterThumbSelected: false,
      timeoutBanner: false,
      showTimeoutUpgrade: false,
      activeElement: false
    };
    this.handleRetryTimeout = () => {
      const {
        call,
        chatRoom
      } = this.props;
      if ((call == null ? void 0 : call.sfuClient.connState) === SfuClient.ConnState.kDisconnectedRetrying) {
        this.handleCallEnd();
        chatRoom.trigger('onRetryTimeout');
        megaChat.playSound(megaChat.SOUNDS.CALL_END);
      }
    };
    this.handleCallOnline = () => {
      if (this.pCallTimer) {
        this.pCallTimer.abort();
        this.pCallTimer = null;
      }
      this.setState({
        offline: false,
        raisedHandPeers: [...this.props.call.sfuClient.raisedHands]
      });
    };
    this.customIsEventuallyVisible = () => true;
    this.renderRaisedHandToast = () => {
      const {
        raisedHandPeers
      } = this.state;
      window.toaster.main.hideAll();
      toaster.main.show({
        buttons: [{
          text: l[16797],
          onClick: () => this.setState({
            sidebar: true,
            view: utils.gR.PARTICIPANTS,
            raisedHandToast: false
          }, () => window.toaster.main.hideAll())
        }],
        onClose: () => this.setState({
          raisedHandToast: false
        }, () => window.toaster.main.hideAll()),
        classes: ['theme-dark-forced', 'call-toast'],
        icons: ['sprite-fm-uni icon-raise-hand'],
        timeout: 0,
        content: (() => {
          const peerName = M.getNameByHandle(raisedHandPeers[0]);
          const peersCount = raisedHandPeers.length;
          const withCurrentPeer = raisedHandPeers.includes(u_handle);
          const CONTENT = {
            1: () => l.raise_peer_raised.replace('%s', peerName),
            2: () => {
              const message = withCurrentPeer ? l.raise_self_peers_raised : l.raise_two_raised;
              return mega.icu.format(message, peersCount - 1).replace('%s', peerName);
            },
            rest: () => {
              const message = withCurrentPeer ? l.raise_self_peers_raised : l.raise_peers_raised;
              return mega.icu.format(message, withCurrentPeer ? peersCount - 1 : peersCount);
            }
          };
          return (CONTENT[peersCount] || CONTENT.rest)();
        })()
      });
    };
    this.bindCallEvents = () => {
      const {
        chatRoom
      } = this.props;
      chatRoom.rebind(`onCallPeerLeft.${call_NAMESPACE}`, (ev, {
        userHandle,
        clientId
      }) => {
        const {
          minimized,
          peers,
          call,
          chatRoom
        } = this.props;
        if (clientId === this.state.recorderCid) {
          chatRoom.trigger('onRecordingStopped', {
            userHandle,
            clientId
          });
        }
        if (minimized) {
          this.setState({
            mode: peers.length === 0 ? utils.g.THUMBNAIL : utils.g.MINI
          }, () => {
            call.setViewMode(this.state.mode);
          });
        }
      });
      chatRoom.rebind(`onCallPeerJoined.${call_NAMESPACE}`, () => {
        const {
          minimized,
          peers,
          call
        } = this.props;
        if (minimized) {
          this.setState({
            mode: peers.length === 0 ? utils.g.THUMBNAIL : utils.g.MINI
          }, () => {
            call.setViewMode(this.state.mode);
          });
        }
        if (call.hasOtherParticipant()) {
          if (!this.state.everHadPeers) {
            this.setState({
              everHadPeers: true
            });
          }
          clearTimeout(this.callStartTimeout);
        }
      });
      chatRoom.rebind(`onCallLeft.${call_NAMESPACE}`, () => this.props.minimized && this.props.onCallEnd());
      chatRoom.rebind(`wrOnUsersEntered.${call_NAMESPACE}`, (ev, users) => Object.entries(users).forEach(([handle, host]) => {
        return host || this.state.waitingRoomPeers.includes(handle) ? null : this.isMounted() && this.setState({
          waitingRoomPeers: [...this.state.waitingRoomPeers, handle]
        }, () => {
          const {
            waitingRoomPeers
          } = this.state;
          if (waitingRoomPeers && waitingRoomPeers.length === 1) {
            megaChat.playSound(megaChat.SOUNDS.CALL_JOIN_WAITING);
          }
          mBroadcaster.sendMessage('meetings:peersWaiting', waitingRoomPeers);
        });
      }));
      const usrwr = (e, users) => {
        users = typeof users === 'string' ? [users] : users;
        return this.isMounted() && this.setState({
          waitingRoomPeers: this.state.waitingRoomPeers.filter(h => !users.includes(h))
        }, () => mBroadcaster.sendMessage('meetings:peersWaiting', this.state.waitingRoomPeers));
      };
      chatRoom.rebind(`wrOnUserLeft.${call_NAMESPACE}`, usrwr);
      chatRoom.rebind(`wrOnUsersAllow.${call_NAMESPACE}`, usrwr);
      chatRoom.rebind(`wrOnUserDump.${call_NAMESPACE}`, (ev, users) => Object.entries(users).forEach(([handle, host]) => {
        return host || this.state.waitingRoomPeers.includes(handle) ? null : this.isMounted() && this.setState({
          waitingRoomPeers: [...this.state.waitingRoomPeers, handle]
        });
      }));
      chatRoom.rebind(`onRecordingStarted.${call_NAMESPACE}`, (ev, {
        userHandle,
        clientId
      }) => {
        if (!this.state.recorderCid) {
          return this.state.recordingConsented ? this.setState({
            recorderCid: clientId
          }, () => {
            ChatToast.quick(l.user_recording_toast.replace('%NAME', nicknames.getNickname(userHandle).substr(0, ChatToastIntegration.MAX_NAME_CHARS)));
          }) : (() => {
            closeDialog();
            M.safeShowDialog(RecordingConsentDialog.dialogName, () => this.setState({
              recorderCid: clientId,
              recordingConsentDialog: true
            }));
          })();
        }
      });
      chatRoom.rebind(`onRecordingStopped.${call_NAMESPACE}`, (ev, {
        userHandle,
        clientId
      }) => {
        const {
          recorderCid
        } = this.state;
        this.setState({
          recordingConsentDialog: false,
          recorderCid: clientId === recorderCid ? false : recorderCid
        }, () => window.sfuClient && clientId === recorderCid && ChatToast.quick(l.user_recording_nop_toast.replace('%NAME', nicknames.getNickname(userHandle).substr(0, ChatToastIntegration.MAX_NAME_CHARS))));
      });
      chatRoom.rebind(`onMutedBy.${call_NAMESPACE}`, (ev, {
        cid
      }) => {
        megaChat.plugins.userHelper.getUserNickname(this.props.peers[cid]).catch(dump).always(name => {
          ChatToast.quick(l.muted_by.replace('%NAME', name || ''));
        });
      });
      chatRoom.rebind(`onCallEndTimeUpdated.${call_NAMESPACE}`, ({
        data
      }) => {
        this.setState({
          timeoutBanner: !!data,
          showTimeoutUpgrade: this.props.call.organiser === u_handle && data - Date.now() >= 120e3
        }, () => {
          if (this.state.timeoutBanner) {
            this.timeoutBannerInterval = this.timeoutBannerInterval || setInterval(() => this.updateTimeoutDuration(), 1000);
          } else {
            clearInterval(this.timeoutBannerInterval);
            delete this.timeoutBannerInterval;
          }
        });
      });
      chatRoom.rebind(`onRaisedHandAdd.${call_NAMESPACE}`, (ev, {
        userHandle
      }) => this.isMounted() && this.setState(state => ({
        raisedHandPeers: [...state.raisedHandPeers, userHandle]
      }), () => {
        const {
          raisedHandPeers
        } = this.state;
        if (userHandle !== u_handle && !this.props.minimized) {
          this.setState({
            raisedHandToast: true
          }, () => this.renderRaisedHandToast());
        }
        mBroadcaster.sendMessage('meetings:raisedHand', raisedHandPeers);
      }));
      chatRoom.rebind(`onRaisedHandDel.${call_NAMESPACE}`, (ev, {
        userHandle
      }) => this.isMounted() && this.setState(state => ({
        raisedHandPeers: state.raisedHandPeers.filter(h => h !== userHandle)
      }), () => {
        const {
          raisedHandPeers,
          raisedHandToast
        } = this.state;
        mBroadcaster.sendMessage('meetings:raisedHand', raisedHandPeers);
        if (raisedHandPeers && raisedHandPeers.length) {
          return raisedHandToast ? this.renderRaisedHandToast() : null;
        }
        return this.setState({
          raisedHandToast: false
        }, () => window.toaster.main.hideAll());
      }));
      chatRoom.rebind(`onRecordingActivePeer.${call_NAMESPACE}`, (ev, {
        userHandle
      }) => this.setState({
        recordingActivePeer: userHandle
      }));
    };
    this.unbindCallEvents = () => ['onCallPeerLeft', 'onCallPeerJoined', 'onCallLeft', 'wrOnUsersAllow', 'wrOnUsersEntered', 'wrOnUserLeft', 'alterUserPrivilege', 'onCallState', 'onRecordingStarted', 'onRecordingStopped', 'onRecordingActivePeer', 'onCallEndTimeUpdated', 'onRaisedHandAdd', 'onRaisedHandDel'].map(event => this.props.chatRoom.off(`${event}.${call_NAMESPACE}`));
    this.handleCallMinimize = () => {
      const {
        call,
        peers,
        onCallMinimize
      } = this.props;
      const {
        mode,
        sidebar,
        view
      } = this.state;
      const {
        callToutId,
        stayOnEnd,
        presenterStreams
      } = call;
      Call.STATE.PREVIOUS = mode !== utils.g.MINI ? {
        mode,
        sidebar,
        view
      } : Call.STATE.PREVIOUS;
      const doMinimize = () => {
        onCallMinimize();
        window.toaster.main.hideAll();
      };
      mega.ui.mInfoPanel.hide();
      return peers.length > 0 || presenterStreams.has(u_handle) ? this.setState({
        mode: utils.g.MINI,
        sidebar: false
      }, () => {
        doMinimize();
        call.setViewMode(utils.g.MINI);
      }) : (() => {
        doMinimize();
        if (typeof callToutId !== 'undefined' && !stayOnEnd) {
          onIdle(() => call.showTimeoutDialog());
        }
      })();
    };
    this.handleCallExpand = async () => {
      mega.ui.mInfoPanel.hide();
      return new Promise(resolve => {
        this.setState({
          ...Call.STATE.PREVIOUS
        }, () => {
          this.props.onCallExpand();
          resolve();
        });
      });
    };
    this.handleStreamToggle = action => {
      const {
        peers
      } = this.props;
      if (action === utils.hK.ADD && peers.length === utils.$A) {
        return;
      }
      return action === utils.hK.ADD ? peers.addFakeDupStream() : peers.removeFakeDupStream();
    };
    this.handleSpeakerChange = (source, presenterThumbSelected) => {
      if (source) {
        this.handleModeChange(utils.g.MAIN);
        const sourceId = source.isLocal ? 0 : source.clientId;
        if (sourceId !== this.props.call.pinnedCid) {
          this.props.call.setPinnedCid(sourceId);
        } else {
          this.props.call.setPinnedCid(sourceId, !source.hasScreen || presenterThumbSelected === this.state.presenterThumbSelected);
        }
        const {
          pinnedCid
        } = this.props.call;
        this.setState({
          forcedLocal: !!(source.isLocal && pinnedCid !== null),
          presenterThumbSelected: pinnedCid === null ? false : !!presenterThumbSelected && source.hasScreen
        });
      } else if (source === null) {
        this.setState({
          presenterThumbSelected: !!presenterThumbSelected
        });
      }
    };
    this.handleModeChange = mode => {
      this.props.call.setViewMode(mode);
      this.setState({
        mode,
        forcedLocal: false
      });
    };
    this.handleChatToggle = () => {
      if (this.state.sidebar && this.state.view === utils.gR.CHAT) {
        return this.setState({
          ...Call.STATE.DEFAULT
        });
      }
      return this.setState({
        sidebar: true,
        view: utils.gR.CHAT
      });
    };
    this.handleParticipantsToggle = forceOpen => {
      if (forceOpen !== true) {
        forceOpen = false;
      }
      if (this.state.sidebar && this.state.view === utils.gR.CHAT) {
        return this.setState({
          sidebar: true,
          view: utils.gR.PARTICIPANTS
        });
      }
      return this.setState({
        sidebar: forceOpen ? true : !this.state.sidebar,
        view: utils.gR.PARTICIPANTS
      });
    };
    this.handleInviteToggle = () => {
      if (Object.values(M.u.toJS()).some(u => u.c === 1)) {
        const participants = (0,conversationpanel.z)(this.props.chatRoom);
        if ((0,conversationpanel.e)(participants)) {
          msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.all_contacts_added}`, `${l.all_contacts_added_to_chat}`, res => {
            if (res) {
              contactAddDialog(null, false);
            }
          });
        } else {
          this.setState({
            invite: !this.state.invite
          });
        }
      } else {
        msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.no_contacts}`, `${l.no_contacts_text}`, resp => {
          if (resp) {
            contactAddDialog(null, false);
          }
        });
      }
    };
    this.handleHoldToggle = async () => {
      await this.props.call.toggleHold();
      mBroadcaster.sendMessage('meetings:toggleHold');
    };
    this.handleScreenSharingToggle = () => {
      const {
        call
      } = this.props;
      const userAgent = navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./);
      const version = parseInt(userAgent[2], 10);
      if (version === 92) {
        return msgDialog('info', undefined, l[47], l.chrome_screensharing);
      }
      return call.toggleScreenSharing();
    };
    this.handleCallEnd = () => {
      let _this$props$call;
      mega.ui.mInfoPanel.hide();
      (_this$props$call = this.props.call) == null || _this$props$call.destroy(SfuClient.TermCode.kUserHangup);
    };
    this.handleEphemeralAdd = handle => handle && this.setState(state => ({
      ephemeral: true,
      ephemeralAccounts: [...state.ephemeralAccounts, handle]
    }));
    this.handleStayConfirm = () => {
      const {
        call
      } = this.props;
      call.handleStayConfirm();
      onIdle(() => this.safeForceUpdate());
    };
    this.handleRecordingToggle = () => {
      const {
        call,
        chatRoom
      } = this.props;
      if (chatRoom.isMeeting) {
        eventlog(500286);
      } else {
        eventlog(500287);
      }
      if (this.state.recorderCid) {
        return msgDialog(`confirmation:!^${l.stop_recording_dialog_cta}!${l.stop_recording_nop_dialog_cta}`, undefined, l.stop_recording_dialog_heading, l.stop_recording_dialog_body, cb => cb && sfuClient.recordingStop(), 1);
      }
      msgDialog(`warningb:!^${l.start_recording_dialog_cta}!${l.msg_dlg_cancel}`, null, l.notify_participants_dialog_heading, l.notify_participants_dialog_body, cb => {
        if (cb || cb === null) {
          return;
        }
        call.sfuClient.recordingStart(this.onWeStoppedRecording).then(() => {
          call.recorderCid = this.state.recorderCid;
          this.setState({
            recorderCid: call.sfuClient.cid
          });
          this.handleModeChange(utils.g.MAIN);
          call.recordActiveStream();
          ChatToast.quick(l.started_recording_toast);
        }).catch(dump);
      }, 1);
    };
    this.onWeStoppedRecording = err => this.isMounted() && this.setState({
      recorderCid: undefined,
      recordingActivePeer: undefined
    }, () => err ? ChatToast.quick(`${l.stopped_recording_toast} Error: ${err.message || err}`) : ChatToast.quick(l.stopped_recording_toast));
    this.renderRecordingControl = () => {
      const {
        chatRoom,
        call,
        peers
      } = this.props;
      const {
        recorderCid,
        recordingTooltip,
        recordingActivePeer
      } = this.state;
      const userIsModerator = (0,utils.Cy)(chatRoom, u_handle);
      const $$CONTAINER = ({
        className,
        onClick,
        children
      }) => JSX_("div", {
        className: `
                    recording-control
                    ${localStorage.callDebug ? 'with-offset' : ''}
                    ${className || ''}
                `,
        onClick
      }, children);
      if (recorderCid) {
        const isRecorder = userIsModerator && recorderCid === call.sfuClient.cid;
        const recordingPeer = peers[recorderCid];
        return JSX_($$CONTAINER, {
          recordingTooltip,
          className: "recording-fixed"
        }, JSX_("div", (0,esm_extends.A)({
          className: `
                            recording-ongoing
                            simpletip
                            ${isRecorder ? '' : 'plain-background'}
                        `
        }, recorderCid !== call.sfuClient.cid && {
          'data-simpletip': l.host_recording.replace('%NAME', nicknames.getNickname(recordingPeer) || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER),
          'data-simpletipposition': 'top',
          'data-simpletipoffset': 5,
          'data-simpletip-class': 'theme-dark-forced'
        }), JSX_("span", {
          className: `
                                recording-icon
                                button
                                ${recordingTooltip ? 'active-dropdown' : ''}
                                ${isRecorder ? 'clickable' : ''}
                            `,
          onMouseEnter: () => isRecorder && this.setState({
            recordingTooltip: true
          }),
          onMouseOut: () => isRecorder && delay('meetings-rec-hover', () => this.setState({
            recordingTooltip: false
          }), 1250)
        }, "REC ", JSX_("i", null), JSX_(dropdowns.ms, {
          className: "recording-info theme-dark-forced",
          active: recordingTooltip,
          noArrow: false,
          positionMy: "center top",
          positionAt: "center bottom",
          vertOffset: 40,
          horizOffset: 30
        }, JSX_("div", null, "Currently recording: ", nicknames.getNickname(recordingActivePeer)))), isRecorder && JSX_("span", {
          className: "recording-toggle",
          onClick: this.handleRecordingToggle
        }, l.record_stop_button)));
      }
      const isOnHold = !!((call == null ? void 0 : call.av) & Av.onHold);
      return userIsModerator && JSX_($$CONTAINER, {
        className: isOnHold ? 'disabled' : '',
        onClick: () => {
          this.setState({
            onboardingRecording: false,
            hovered: false
          }, () => {
            this.flagMap.setSync(OBV4_FLAGS.CHAT_CALL_RECORDING, 1);
            this.flagMap.safeCommit();
          });
          return isOnHold || recorderCid && recorderCid !== call.sfuClient.cid ? null : this.handleRecordingToggle();
        }
      }, JSX_(meetings_button.A, {
        className: `
                        mega-button
                        theme-dark-forced
                        call-action
                        round
                        recording-start
                        ${isOnHold ? 'disabled' : ''}
                    `
      }, JSX_("div", null, JSX_("i", null))), JSX_("span", {
        className: "record-label"
      }, l.record_start_button));
    };
    this.setActiveElement = activeElement => this.setState({
      activeElement
    });
    const {
      SOUNDS
    } = megaChat;
    [SOUNDS.RECONNECT, SOUNDS.CALL_END, SOUNDS.CALL_JOIN_WAITING].map(sound => ion.sound.preload(sound));
    this.state.mode = props.call.viewMode;
    this.setOnboarding();
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
  }
  handleMouseMove() {
    this.setState({
      hovered: true
    });
    if (this.delayProcID) {
      delay.cancel(this.delayProcID);
      this.delayProcID = null;
    }
  }
  handleMouseOut() {
    if (this.state.hovered) {
      this.delayProcID = delay('meetings-call-hover', () => {
        if (this.isMounted()) {
          this.setState({
            hovered: false
          });
        }
      }, MOUSE_OUT_DELAY);
    }
  }
  handleCallOffline() {
    if (!this.pCallTimer) {
      (this.pCallTimer = tSleep(30)).then(() => {
        this.setState({
          offline: true
        });
      });
    }
  }
  setOnboarding() {
    this.state.onboardingUI = this.state.hovered = this.flagMap && !this.flagMap.getSync(OBV4_FLAGS.CHAT_CALL_UI);
    if (!this.state.onboardingUI) {
      this.state.onboardingRecording = this.state.hovered = this.flagMap && !this.flagMap.getSync(OBV4_FLAGS.CHAT_CALL_RECORDING);
    }
    if (!this.state.onboardingUI && !this.state.onboardingRecording) {
      this.state.onboardingRaise = this.state.hovered = this.flagMap && !this.flagMap.getSync(OBV4_FLAGS.CHAT_CALL_RAISE);
    }
  }
  handleInvitePanelToggle() {
    delay('chat-event-inv-call', () => eventlog(99962));
    this.setState({
      invitePanel: !this.state.invitePanel
    });
  }
  handleInviteOrAdd() {
    const {
      chatRoom
    } = this.props;
    if (chatRoom.type === 'group') {
      return this.handleInviteToggle();
    }
    loadingDialog.show('fetchchatlink');
    chatRoom.updatePublicHandle(false, false, true).catch(dump).always(() => {
      loadingDialog.hide('fetchchatlink');
      if (!this.isMounted()) {
        return;
      }
      if (!chatRoom.iAmOperator() && chatRoom.options[MCO_FLAGS.OPEN_INVITE] && !chatRoom.publicLink) {
        this.handleInviteToggle();
      } else if (chatRoom.type === 'public' && !chatRoom.topic) {
        this.handleInviteToggle();
      } else {
        this.handleInvitePanelToggle();
      }
    });
  }
  renderTimeLimitBanner() {
    return JSX_("div", {
      className: "call-time-limit-banner theme-dark-forced"
    }, JSX_("span", {
      ref: this.timeoutBannerRef
    }, this.timeoutString), JSX_("span", {
      className: "call-limit-banner-action",
      onClick: () => {
        clearInterval(this.timeoutBannerInterval);
        delete this.timeoutBannerInterval;
        this.setState({
          timeoutBanner: false
        });
      }
    }, l[2005]), this.state.showTimeoutUpgrade && JSX_(ui_link.A, {
      className: "call-limit-banner-action",
      onClick: () => {
        window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
        eventlog(500262);
      }
    }, l.upgrade_now));
  }
  get timeoutString() {
    const {
      call
    } = this.props;
    if (call.callEndTime === 0) {
      return '';
    }
    const remainSeconds = Math.max(0, Math.ceil((call.callEndTime - Date.now()) / 1000));
    if (call.organiser === u_handle) {
      if (remainSeconds < 60) {
        return mega.icu.format(l.free_call_banner_organiser_ending_sec, remainSeconds);
      }
      if (remainSeconds <= 120) {
        return mega.icu.format(l.free_call_banner_organiser_ending, Math.ceil(remainSeconds / 60));
      }
      return mega.icu.format(l.free_call_banner_organiser_warning, Math.ceil(remainSeconds / 60));
    }
    if (remainSeconds < 60) {
      return mega.icu.format(l.free_call_banner_ending_sec, remainSeconds);
    }
    if (remainSeconds <= 120) {
      return mega.icu.format(l.free_call_banner_ending, Math.ceil(remainSeconds / 60));
    }
    return mega.icu.format(l.free_call_banner_warning, Math.ceil(remainSeconds / 60));
  }
  updateTimeoutDuration() {
    if (this.timeoutBannerRef) {
      const {
        current
      } = this.timeoutBannerRef;
      const newStr = this.timeoutString;
      if (newStr && current && current.innerText !== newStr) {
        current.innerText = newStr;
      }
      if (this.state.showTimeoutUpgrade && this.props.call.callEndTime - Date.now() <= 12e4) {
        this.setState({
          showTimeoutUpgrade: false
        });
      }
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const {
      minimized,
      willUnmount,
      chatRoom
    } = this.props;
    chatRoom.megaChat.off(`sfuConnClose.${call_NAMESPACE}`);
    chatRoom.megaChat.off(`sfuConnOpen.${call_NAMESPACE}`);
    chatRoom.megaChat.off(`onSpeakerChange.${call_NAMESPACE}`);
    chatRoom.megaChat.off(`onPeerAvChange.${call_NAMESPACE}`);
    mBroadcaster.removeListener(this.ephemeralAddListener);
    mBroadcaster.removeListener(this.pageChangeListener);
    clearTimeout(this.callStartTimeout);
    delay.cancel('callOffline');
    if ($.dialog) {
      closeDialog();
    }
    if (this.timeoutBannerInterval) {
      clearInterval(this.timeoutBannerInterval);
    }
    window.toaster.main.hideAll();
    this.unbindCallEvents();
    willUnmount == null || willUnmount(minimized);
  }
  componentDidMount() {
    super.componentDidMount();
    const {
      call,
      didMount,
      chatRoom
    } = this.props;
    this.ephemeralAddListener = mBroadcaster.addListener('meetings:ephemeralAdd', handle => this.handleEphemeralAdd(handle));
    this.pageChangeListener = mBroadcaster.addListener('pagechange', () => {
      const currentRoom = megaChat.getCurrentRoom();
      if ((0,utils.Av)() && (!M.chat || currentRoom && currentRoom.chatId !== chatRoom.chatId)) {
        this.handleCallMinimize();
      }
    });
    chatRoom.megaChat.rebind(`sfuConnOpen.${call_NAMESPACE}`, () => this.handleCallOnline());
    chatRoom.megaChat.rebind(`sfuConnClose.${call_NAMESPACE}`, () => this.handleCallOffline());
    chatRoom.rebind(`onCallState.${call_NAMESPACE}`, (ev, {
      arg
    }) => this.setState({
      initialCallRinging: arg
    }));
    const {
      tresizer
    } = $;
    chatRoom.rebind(`onPeerAvChange.${call_NAMESPACE}`, tresizer);
    chatRoom.rebind(`onSpeakerChange.${call_NAMESPACE}`, tresizer);
    this.callStartTimeout = setTimeout(() => {
      if (!mega.config.get('callemptytout') && !call.hasOtherParticipant()) {
        call.left = true;
        call.initCallTimeout();
      }
    }, 300000);
    setTimeout(() => {
      let _call$peers;
      return ((_call$peers = call.peers) == null ? void 0 : _call$peers.length) && !call.hasOtherParticipant() && this.setState({
        everHadPeers: true
      });
    }, 2e3);
    if (sessionStorage.previewMedia) {
      const {
        audio,
        video
      } = JSON.parse(sessionStorage.previewMedia);
      sessionStorage.removeItem('previewMedia');
      tSleep(2).then(() => audio && call.sfuClient.muteAudio()).then(() => video && call.sfuClient.muteCamera()).catch(dump);
    }
    this.bindCallEvents();
    didMount == null || didMount();
  }
  componentDidUpdate() {
    if (typeof psa !== 'undefined') {
      psa.repositionMeetingsCall();
    }
  }
  render() {
    let _ref;
    const {
      minimized,
      peers,
      call,
      chatRoom,
      parent,
      typingAreaText,
      onDeleteMessage,
      onTypingAreaChanged
    } = this.props;
    const {
      mode,
      view,
      sidebar,
      hovered,
      forcedLocal,
      invite,
      ephemeral,
      ephemeralAccounts,
      guest,
      offline,
      onboardingUI,
      onboardingRecording,
      onboardingRaise,
      everHadPeers,
      initialCallRinging,
      waitingRoomPeers,
      recorderCid,
      raisedHandPeers,
      recordingConsentDialog,
      invitePanel,
      presenterThumbSelected,
      timeoutBanner,
      activeElement
    } = this.state;
    const {
      stayOnEnd
    } = call;
    const hasOnboarding = onboardingUI || onboardingRecording || onboardingRaise;
    const STREAM_PROPS = {
      mode,
      peers,
      sidebar,
      hovered: hasOnboarding || hovered,
      forcedLocal,
      call,
      view,
      chatRoom,
      parent,
      stayOnEnd,
      everHadPeers,
      waitingRoomPeers,
      recorderCid,
      presenterThumbSelected,
      raisedHandPeers,
      activeElement,
      hasOtherParticipants: call.hasOtherParticipant(),
      isOnHold: call.sfuClient.isOnHold,
      isFloatingPresenter: (_ref = mode === utils.g.MINI && !forcedLocal ? call.getActiveStream() : call.getLocalStream()) == null ? void 0 : _ref.hasScreen,
      onSpeakerChange: this.handleSpeakerChange,
      onModeChange: this.handleModeChange,
      onInviteToggle: this.handleInviteToggle,
      onStayConfirm: this.handleStayConfirm
    };
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    meetings-call
                    ${minimized ? 'minimized' : ''}
                    ${timeoutBanner ? 'with-timeout-banner' : ''}
                    ${activeElement ? 'with-active-element' : ''}
                `,
      onMouseMove: hasOnboarding ? null : this.handleMouseMove,
      onMouseOut: hasOnboarding ? null : this.handleMouseOut
    }, timeoutBanner && this.renderTimeLimitBanner(), JSX_(stream_Stream, (0,esm_extends.A)({}, STREAM_PROPS, {
      minimized,
      ephemeralAccounts,
      onCallMinimize: this.handleCallMinimize,
      onCallExpand: this.handleCallExpand,
      onCallEnd: this.handleCallEnd,
      onStreamToggle: this.handleStreamToggle,
      onRecordingToggle: () => call.sfuClient.recordingStop(),
      onChatToggle: this.handleChatToggle,
      onParticipantsToggle: this.handleParticipantsToggle,
      onAudioClick: () => call.toggleAudio(),
      onVideoClick: () => call.toggleVideo(),
      onScreenSharingClick: this.handleScreenSharingToggle,
      onHoldClick: this.handleHoldToggle,
      onVideoDoubleClick: this.handleSpeakerChange,
      setActiveElement: this.setActiveElement
    })), sidebar && JSX_(Sidebar, (0,esm_extends.A)({}, STREAM_PROPS, {
      guest,
      initialCallRinging,
      typingAreaText,
      onGuestClose: () => this.setState({
        guest: false
      }),
      onSidebarClose: () => this.setState({
        ...Call.STATE.DEFAULT
      }),
      onDeleteMessage,
      onCallMinimize: this.handleCallMinimize,
      onInviteToggle: () => this.handleInviteOrAdd(),
      onTypingAreaChanged
    })), minimized ? null : JSX_(REaCt().Fragment, null, this.renderRecordingControl(), JSX_(streamControls, {
      call,
      minimized,
      peers,
      chatRoom,
      recorderCid,
      hovered,
      raisedHandPeers,
      onboardingRaise,
      onOnboardingRaiseDismiss: () => {
        this.setState({
          onboardingRaise: false,
          hovered: false
        }, () => {
          this.flagMap.setSync(OBV4_FLAGS.CHAT_CALL_RAISE, 1);
          this.flagMap.safeCommit();
        });
      },
      onRecordingToggle: () => this.setState({
        recorderCid: undefined
      }, () => call.sfuClient.recordingStop()),
      onAudioClick: () => call.toggleAudio(),
      onVideoClick: () => call.toggleVideo(),
      onScreenSharingClick: this.handleScreenSharingToggle,
      onCallEnd: this.handleCallEnd,
      onStreamToggle: this.handleStreamToggle,
      onHoldClick: this.handleHoldToggle,
      setActiveElement: this.setActiveElement
    }), JSX_(sidebarControls, {
      call,
      chatRoom,
      npeers: peers.length,
      mode,
      view,
      sidebar,
      onChatToggle: this.handleChatToggle,
      onParticipantsToggle: this.handleParticipantsToggle,
      onInviteToggle: () => this.handleInviteOrAdd()
    })), invite && JSX_(Invite, {
      contacts: M.u,
      call,
      chatRoom,
      onClose: () => this.setState({
        invite: false
      })
    }), ephemeral && JSX_(workflow_ephemeral, {
      ephemeralAccounts,
      onClose: () => this.setState({
        ephemeral: false
      })
    }), offline && JSX_(meetings_offline, {
      onClose: () => {
        if (offline) {
          this.setState({
            offline: false
          }, () => delay('call:timeout', this.handleRetryTimeout, 3e4));
        }
      },
      onCallEnd: () => {
        this.setState({
          offline: false
        }, () => this.handleRetryTimeout());
      }
    }), onboardingUI && JSX_("div", {
      className: `${call_NAMESPACE}-onboarding`
    }, JSX_("div", {
      className: "mega-dialog mega-onboarding-dialog dialog-template-message onboarding-UI",
      id: "ob-dialog",
      role: "dialog",
      "aria-labelledby": "ob-dialog-title",
      "aria-modal": "true"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-tooltip-arrow tooltip-arrow top",
      id: "ob-dialog-arrow"
    }), JSX_("header", null, JSX_("div", null, JSX_("h2", {
      id: "ob-dialog-title"
    }, l.onboarding_call_title), JSX_("p", {
      id: "ob-dialog-text"
    }, l.onboarding_call_body))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_("button", {
      className: "mega-button js-next small theme-light-forced",
      onClick: () => {
        this.setState({
          onboardingUI: false,
          onboardingRecording: chatRoom.iAmOperator() && !this.flagMap.getSync(OBV4_FLAGS.CHAT_CALL_RECORDING)
        }, () => {
          this.flagMap.setSync(OBV4_FLAGS.CHAT_CALL_UI, 1);
          this.flagMap.safeCommit();
          this.setState({
            onboardingRaise: !this.state.onboardingRecording && !this.flagMap.getSync(OBV4_FLAGS.CHAT_CALL_RAISE)
          });
        });
      }
    }, JSX_("span", null, l.ok_button)))))), onboardingRecording && (0,utils.Cy)(chatRoom, u_handle) && JSX_("div", {
      className: `${call_NAMESPACE}-onboarding`
    }, JSX_("div", {
      className: "mega-dialog mega-onboarding-dialog dialog-template-message onboarding-recording",
      id: "ob-dialog",
      role: "dialog",
      "aria-labelledby": "ob-dialog-title",
      "aria-modal": "true"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-tooltip-arrow tooltip-arrow bottom",
      id: "ob-dialog-arrow"
    }), JSX_("header", null, JSX_("div", null, JSX_("h2", {
      id: "ob-dialog-title"
    }, l.recording_onboarding_title), JSX_("p", {
      id: "ob-dialog-text"
    }, l.recording_onboarding_body_intro), JSX_("p", {
      id: "ob-dialog-text"
    }, l.recording_onboarding_body_details))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_(ui_link.A, {
      className: "link-button",
      to: "https://help.mega.io/chats-meetings/chats/call-recording",
      target: "_blank"
    }, l[8742]), JSX_("button", {
      className: "mega-button js-next small theme-light-forced",
      onClick: () => {
        this.setState({
          onboardingRecording: false,
          onboardingRaise: true
        }, () => {
          this.flagMap.setSync(OBV4_FLAGS.CHAT_CALL_RECORDING, 1);
          this.flagMap.safeCommit();
        });
      }
    }, JSX_("span", null, l.ok_button)))))), recordingConsentDialog && JSX_(RecordingConsentDialog, {
      peers,
      recorderCid,
      onClose: () => this.setState({
        recordingConsentDialog: false,
        recordingConsented: true
      }),
      onCallEnd: this.handleCallEnd
    }), invitePanel && JSX_(modalDialogs.A.ModalDialog, {
      className: "theme-dark-forced",
      onClose: () => {
        this.setState({
          invitePanel: false
        });
      },
      dialogName: "chat-link-dialog",
      chatRoom
    }, JSX_(inviteParticipantsPanel.Q, {
      chatRoom,
      onAddParticipants: () => {
        this.setState({
          invitePanel: false
        }, () => this.handleInviteToggle());
      }
    })));
  }
}
Call.STATE = {
  DEFAULT: {
    sidebar: false
  },
  PREVIOUS: {
    mode: null,
    sidebar: null,
    view: null
  }
};

 }

}]);