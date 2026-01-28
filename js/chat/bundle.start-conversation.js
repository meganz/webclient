/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[543],{

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

 2678
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _contacts1__ = REQ_(8022);
 const _ui_modalDialogs_jsx2__ = REQ_(8120);
 const _mixins_js3__ = REQ_(8264);




class ContactSelectorDialog extends _mixins_js3__ .w9 {
  constructor(...args) {
    super(...args);
    this.dialogName = 'contact-selector-dialog';
  }
  componentDidMount() {
    super.componentDidMount();
    M.safeShowDialog(this.dialogName, () => $(`.${this.dialogName}`));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if ($.dialog === this.dialogName) {
      closeDialog();
    }
  }
  render() {
    const {
      active,
      selectFooter,
      exclude,
      allowEmpty,
      multiple,
      topButtons,
      showAddContact,
      className,
      multipleSelectedButtonLabel,
      singleSelectedButtonLabel,
      nothingSelectedButtonLabel,
      onClose,
      onSelectDone
    } = this.props;
    return JSX_(_ui_modalDialogs_jsx2__ .A.ModalDialog, {
      className: `
                    popup
                    contacts-search
                    ${className}
                    ${this.dialogName}
                `,
      onClose
    }, JSX_(_contacts1__ .hU, {
      active,
      className: "popup contacts-search small-footer",
      contacts: M.u,
      selectFooter,
      megaChat,
      withSelfNote: megaChat.WITH_SELF_NOTE,
      exclude,
      allowEmpty,
      multiple,
      topButtons,
      showAddContact,
      multipleSelectedButtonLabel,
      singleSelectedButtonLabel,
      nothingSelectedButtonLabel,
      onClose,
      onAddContact: () => {
        eventlog(500237);
        onClose();
      },
      onSelected: () => {
        eventlog(500238);
        onClose();
      },
      onSelectDone
    }));
  }
}
 const __WEBPACK_DEFAULT_EXPORT__ = ContactSelectorDialog;

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

 5009
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   A: () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _chat_mixins1__ = REQ_(8264);


class ToggleCheckbox extends _chat_mixins1__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.onToggle = () => {
      const newState = !this.state.value;
      this.setState({
        value: newState
      });
      if (this.props.onToggle) {
        this.props.onToggle(newState);
      }
    };
    this.state = {
      value: this.props.value
    };
  }
  render() {
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    mega-switch
                    ${this.props.className}
                    ${this.state.value ? 'toggle-on' : ''}
                `,
      role: "switch",
      "aria-checked": !!this.state.value,
      onClick: this.onToggle
    }, JSX_("div", {
      className: `mega-feature-switch sprite-fm-mono-after
                         ${this.state.value ? 'icon-check-after' : 'icon-minimise-after'}`
    }));
  }
}
 const __WEBPACK_DEFAULT_EXPORT__ = {
  ToggleCheckbox
};

 },

 5199
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  StartGroupChatWizard
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _ui_miniui_jsx2__ = REQ_(5009);
 const _contacts_jsx3__ = REQ_(8022);
 const _ui_modalDialogs_jsx4__ = REQ_(8120);





class StartGroupChatWizard extends _mixins_js1__ .w9 {
  constructor(props) {
    super(props);
    this.dialogName = 'start-group-chat';
    this.domRef = react0___default().createRef();
    this.inputContainerRef = react0___default().createRef();
    this.inputRef = react0___default().createRef();
    let haveContacts = false;
    const keys = M.u.keys();
    for (let i = 0; i < keys.length; i++) {
      if (M.u[keys[i]].c === 1) {
        haveContacts = true;
        break;
      }
    }
    this.state = {
      'selected': this.props.selected ? this.props.selected : [],
      haveContacts,
      'step': this.props.flowType === 2 || !haveContacts ? 1 : 0,
      'keyRotation': false,
      'createChatLink': this.props.flowType === 2,
      'groupName': '',
      openInvite: 1
    };
    this.onFinalizeClick = this.onFinalizeClick.bind(this);
    this.onSelectClicked = this.onSelectClicked.bind(this);
    this.onSelected = this.onSelected.bind(this);
  }
  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });
    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
  }
  onSelectClicked() {
    if (this.props.onSelectClicked) {
      this.props.onSelectClicked();
    }
  }
  onFinalizeClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const {
      groupName,
      selected,
      keyRotation,
      createChatLink,
      openInvite
    } = this.state;
    megaChat.createAndShowGroupRoomFor(selected, groupName.trim(), {
      keyRotation,
      createChatLink: keyRotation ? false : createChatLink,
      openInvite
    });
    this.props.onClose(this);
    eventlog(500236);
  }
  componentDidMount() {
    super.componentDidMount();
    if (!this.props.subDialog) {
      M.safeShowDialog(this.dialogName, nop);
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if ($.dialog === this.dialogName) {
      closeDialog();
    }
  }
  render() {
    const self = this;
    const classes = `new-group-chat contrast small-footer contact-picker-widget ${  self.props.className}`;
    let contacts = M.u;
    const {haveContacts} = self.state;
    const buttons = [];
    let allowNext = false;
    let failedToEnableChatlink = self.state.failedToEnableChatlink && self.state.createChatLink === true && !self.state.groupName;
    if (self.state.keyRotation) {
      failedToEnableChatlink = false;
    }
    let extraContent;
    if (this.props.extraContent) {
      self.state.step = 0;
      extraContent = JSX_("div", {
        className: "content-block imported"
      });
    } else if (self.state.step === 0 && haveContacts) {
      allowNext = true;
      buttons.push({
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick" (e) {
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      buttons.push({
        "label": l[556],
        "key": "next",
        "className": !allowNext ? "disabled positive" : "positive",
        "onClick" (e) {
          e.preventDefault();
          e.stopPropagation();
          self.setState({
            'step': 1
          });
        }
      });
    } else if (self.state.step === 1) {
      allowNext = self.state.createChatLink ? !failedToEnableChatlink : true;
      contacts = [];
      self.state.selected.forEach((h) => {
        if (h in M.u) {
          contacts.push(M.u[h]);
        }
      });
      if (!haveContacts || this.props.flowType === 2) {
        buttons.push({
          "label": self.props.cancelLabel,
          "key": "cancel",
          "onClick" (e) {
            self.props.onClose(self);
            e.preventDefault();
            e.stopPropagation();
          }
        });
      } else {
        buttons.push({
          "label": l[822],
          "key": "back",
          "onClick" (e) {
            e.preventDefault();
            e.stopPropagation();
            self.setState({
              'step': 0
            });
          }
        });
      }
      buttons.push({
        "label": l[726],
        "key": "done",
        "className": !allowNext ? "positive disabled" : "positive",
        "onClick" (e) {
          if (self.state.createChatLink === true && !self.state.groupName) {
            self.setState({
              'failedToEnableChatlink': true
            });
          } else {
            self.onFinalizeClick(e);
          }
        }
      });
    }
    let chatInfoElements;
    if (self.state.step === 1) {
      let _this$state$groupName;
      let checkboxClassName = self.state.createChatLink ? "checkboxOn" : "checkboxOff";
      if (failedToEnableChatlink && self.state.createChatLink) {
        checkboxClassName += " intermediate-state";
      }
      if (self.state.keyRotation) {
        checkboxClassName = "checkboxOff";
      }
      chatInfoElements = JSX_(react0___default().Fragment, null, JSX_("div", {
        className: `
                            contacts-search-header left-aligned top-pad
                            ${failedToEnableChatlink ? 'failed' : ''}
                        `
      }, JSX_("div", {
        className: `
                                mega-input
                                with-icon
                                box-style
                                ${((_this$state$groupName = this.state.groupName) == null ? void 0 : _this$state$groupName.length) > 0 ? 'valued' : ''}
                                ${failedToEnableChatlink ? 'error msg' : ''}
                            `,
        ref: this.inputContainerRef
      }, JSX_("i", {
        className: "sprite-fm-mono icon-channel-new"
      }), JSX_("input", {
        autoFocus: true,
        className: "megaInputs",
        type: "text",
        ref: this.inputRef,
        placeholder: l[18509],
        value: this.state.groupName,
        maxLength: ChatRoom.TOPIC_MAX_LENGTH,
        onKeyDown: e => {
          const code = e.which || e.keyCode;
          if (allowNext && code === 13 && self.state.step === 1) {
            this.onFinalizeClick();
          }
        },
        onChange: e => {
          const containerRef = this.inputContainerRef.current;
          const {
            value
          } = e.target;
          containerRef.classList[value.length > 0 ? 'add' : 'remove']('valued');
          this.setState({
            groupName: value,
            failedToEnableChatlink: false
          });
        }
      }))), this.props.flowType === 2 ? null : JSX_("div", {
        className: "group-chat-dialog content"
      }, JSX_(_ui_miniui_jsx2__ .A.ToggleCheckbox, {
        className: "rotation-toggle",
        checked: this.state.keyRotation,
        onToggle: keyRotation => this.setState({
          keyRotation
        }, () => this.inputRef.current.focus())
      }), JSX_("div", {
        className: "group-chat-dialog header"
      }, l[20576]), JSX_("div", {
        className: "group-chat-dialog description"
      }, l[20484]), JSX_(_ui_miniui_jsx2__ .A.ToggleCheckbox, {
        className: "open-invite-toggle",
        checked: this.state.openInvite,
        value: this.state.openInvite,
        onToggle: openInvite => this.setState({
          openInvite
        }, () => this.inputRef.current.focus())
      }), JSX_("div", {
        className: "group-chat-dialog header"
      }, l.open_invite_label), JSX_("div", {
        className: "group-chat-dialog description"
      }, l.open_invite_desc), JSX_("div", {
        className: `
                                    group-chat-dialog checkbox
                                    ${this.state.keyRotation ? 'disabled' : ''}
                                    ${failedToEnableChatlink ? 'failed' : ''}
                                `,
        onClick: () => {
          delay('chatWizard-createChatLink', () => {
            this.setState(state => ({
              createChatLink: !state.createChatLink
            }));
            this.inputRef.current.focus();
          }, 100);
        }
      }, JSX_("div", {
        className: `checkdiv ${checkboxClassName}`
      }, JSX_("input", {
        type: "checkbox",
        name: "group-encryption",
        id: "group-encryption",
        className: "checkboxOn hidden"
      })), JSX_("label", {
        htmlFor: "group-encryption",
        className: "radio-txt lato mid"
      }, l[20575]), JSX_("div", {
        className: "clear"
      }))), failedToEnableChatlink ? JSX_("div", {
        className: "group-chat-dialog description chatlinks-intermediate-msg"
      }, l[20573]) : null);
    }
    return JSX_(_ui_modalDialogs_jsx4__ .A.ModalDialog, {
      step: self.state.step,
      title: this.props.flowType === 2 && self.state.createChatLink ? l[20638] : this.props.customDialogTitle || l[19483],
      className: classes,
      dialogType: "tool",
      dialogName: "group-chat-dialog",
      showSelectedNum: self.props.showSelectedNum,
      selectedNum: self.state.selected.length,
      closeDlgOnClickOverlay: self.props.closeDlgOnClickOverlay,
      onClose: () => {
        self.props.onClose(self);
      },
      popupDidMount: elem => {
        if (this.props.extraContent) {
          let _elem$querySelector;
          (_elem$querySelector = elem.querySelector('.content-block.imported')) == null || _elem$querySelector.appendChild(this.props.extraContent);
        }
        if (this.props.onExtraContentDidMount) {
          this.props.onExtraContentDidMount(elem);
        }
      },
      triggerResizeOnUpdate: true,
      buttons
    }, JSX_("div", {
      ref: this.domRef,
      className: "content-block"
    }, chatInfoElements, JSX_(_contacts_jsx3__ .hU, {
      step: self.state.step,
      exclude: self.props.exclude,
      contacts,
      selectableContacts: "true",
      onSelectDone: self.onSelectClicked,
      onSelected: self.onSelected,
      selected: self.state.selected,
      headerClasses: "left-aligned",
      multiple: true,
      readOnly: self.state.step !== 0,
      allowEmpty: true,
      showMeAsSelected: self.state.step === 1,
      className: self.props.pickerClassName,
      disableFrequents: self.props.disableFrequents,
      skipMailSearch: self.props.skipMailSearch,
      autoFocusSearchField: self.props.autoFocusSearchField,
      selectCleanSearchRes: self.props.selectCleanSearchRes,
      disableDoubleClick: self.props.disableDoubleClick,
      selectedWidthSize: self.props.selectedWidthSize,
      emptySelectionMsg: self.props.emptySelectionMsg,
      newEmptySearchResult: self.props.newEmptySearchResult,
      newNoContact: self.props.newNoContact,
      highlightSearchValue: self.props.highlightSearchValue,
      emailTooltips: self.props.emailTooltips
    })), extraContent);
  }
}
StartGroupChatWizard.clickTime = 0;
StartGroupChatWizard.defaultProps = {
  'selectLabel': l[1940],
  'cancelLabel': l.msg_dlg_cancel,
  'hideable': true,
  'flowType': 1,
  'pickerClassName': '',
  'showSelectedNum': false,
  'disableFrequents': false,
  'skipMailSearch': false,
  'autoFocusSearchField': true,
  'selectCleanSearchRes': true,
  'disableDoubleClick': false,
  'newEmptySearchResult': false,
  'newNoContact': false,
  'closeDlgOnClickOverlay': true,
  'emailTooltips': false
};

 },

 7190
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  Start
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _ui_modalDialogs_jsx2__ = REQ_(8120);
 const _button_jsx3__ = REQ_(6740);
 const _preview_jsx4__ = REQ_(3546);
 const _link_jsx5__ = REQ_(4649);
 const _ui_utils6__ = REQ_(6411);

let _Start;






class Start extends react1___default().Component {
  constructor(props) {
    super(props);
    this.inputRef = react1___default().createRef();
    this.defaultTopic = l.default_meeting_topic.replace('%NAME', M.getNameByHandle(u_handle));
    this.state = {
      audio: false,
      video: false,
      editing: false,
      previousTopic: undefined,
      topic: undefined
    };
    this.handleChange = ev => this.setState({
      topic: ev.target.value
    });
    this.toggleEdit = () => {
      this.setState(state => {
        const topic = state.topic.trim() || this.defaultTopic;
        return {
          editing: !state.editing,
          topic,
          previousTopic: topic
        };
      }, () => onIdle(this.doFocus));
    };
    this.doFocus = () => {
      if (this.state.editing) {
        const input = this.inputRef.current;
        input.focus();
        input.setSelectionRange(0, input.value.length);
      }
    };
    this.doReset = () => this.setState(state => ({
      editing: false,
      topic: state.previousTopic,
      previousTopic: undefined
    }));
    this.bindEvents = () => $(document).rebind(`mousedown.${Start.NAMESPACE}`, ev => {
      if (this.state.editing && !ev.target.classList.contains(Start.CLASS_NAMES.EDIT) && !ev.target.classList.contains(Start.CLASS_NAMES.INPUT)) {
        this.toggleEdit();
      }
    }).rebind(`keyup.${Start.NAMESPACE}`, ({
      keyCode
    }) => {
      if (this.state.editing) {
        const [ENTER, ESCAPE] = [13, 27];
        return keyCode === ENTER ? this.toggleEdit() : keyCode === ESCAPE ? this.doReset() : null;
      }
    });
    this.Input = () => JSX_("input", {
      type: "text",
      ref: this.inputRef,
      className: Start.CLASS_NAMES.INPUT,
      value: this.state.topic,
      maxLength: ChatRoom.TOPIC_MAX_LENGTH,
      onChange: this.handleChange
    });
    this.onStreamToggle = (audio, video) => this.setState({
      audio,
      video
    });
    this.startMeeting = () => {
      const {
        onStart
      } = this.props;
      const {
        topic,
        audio,
        video
      } = this.state;
      if (onStart) {
        onStart(topic.trim() || this.defaultTopic, audio, video);
      }
    };
    this.state.topic = this.defaultTopic;
  }
  componentDidMount() {
    this.bindEvents();
    if ($.dialog === 'onboardingDialog') {
      closeDialog();
    }
    M.safeShowDialog(Start.dialogName, () => $(`#${Start.NAMESPACE}`));
  }
  componentWillUnmount() {
    $(document).unbind(`.${Start.NAMESPACE}`);
    if ($.dialog === Start.dialogName) {
      closeDialog();
    }
  }
  render() {
    const {
      NAMESPACE,
      CLASS_NAMES
    } = Start;
    const {
      editing,
      topic
    } = this.state;
    return JSX_(_ui_modalDialogs_jsx2__ .A.ModalDialog, (0,_babel_runtime_helpers_extends0__ .A)({}, this.state, {
      id: NAMESPACE,
      dialogName: NAMESPACE,
      className: NAMESPACE,
      stopKeyPropagation: editing,
      onClose: () => this.props.onClose()
    }), JSX_("div", {
      className: `${NAMESPACE}-preview`
    }, JSX_(_preview_jsx4__ .A, {
      context: NAMESPACE,
      onToggle: this.onStreamToggle
    })), JSX_("div", {
      className: "fm-dialog-body"
    }, JSX_("div", {
      className: `${NAMESPACE}-title`
    }, editing ? JSX_(this.Input, null) : JSX_("h2", {
      onClick: this.toggleEdit
    }, JSX_(_ui_utils6__ .zT, null, topic)), JSX_(_button_jsx3__ .A, {
      className: `
                                mega-button
                                action
                                small
                                ${CLASS_NAMES.EDIT}
                                ${editing ? 'editing' : ''}
                            `,
      icon: "icon-rename",
      simpletip: {
        label: l[1342],
        position: 'top'
      },
      onClick: this.toggleEdit
    }, JSX_("span", null, l[1342]))), JSX_(_button_jsx3__ .A, {
      className: "mega-button positive large start-meeting-button",
      onClick: () => {
        this.startMeeting();
        eventlog(500235);
      }
    }, JSX_("span", null, l[7315])), JSX_(_link_jsx5__ .A, {
      to: "https://mega.io/chatandmeetings",
      target: "_blank"
    }, l.how_meetings_work)));
  }
}
_Start = Start;
Start.NAMESPACE = 'start-meeting';
Start.dialogName = `${_Start.NAMESPACE}-dialog`;
Start.CLASS_NAMES = {
  EDIT: 'call-title-edit',
  INPUT: 'call-title-input'
};
Start.STREAMS = {
  AUDIO: 1,
  VIDEO: 2
};

 }

}]);