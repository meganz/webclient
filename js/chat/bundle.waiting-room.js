/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[752],{

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

 2659
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   VIEW: () =>  VIEW,
   "default": () =>  WaitingRoom
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _ui_utils_jsx2__ = REQ_(6411);
 const _workflow_preview_jsx3__ = REQ_(3546);
 const _button_jsx4__ = REQ_(6740);
 const _link_jsx5__ = REQ_(4649);






const NAMESPACE = 'waiting-room';
const VIEW = {
  INTRO: 0,
  ACCOUNT: 1,
  GUEST: 2,
  AWAIT: 3,
  UNSUPPORTED: 4,
  REDIRECT: 5
};
class WaitingRoom extends _mixins_js1__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.redirectInterval = undefined;
    this.state = {
      view: VIEW.ACCOUNT,
      call: false,
      audio: false,
      video: false,
      firstName: '',
      lastName: '',
      countdown: 4,
      loading: false
    };
    this.renderLeaveDialog = () => msgDialog(`confirmation:!^${l.wr_leave}!${l.wr_do_not_leave}`, null, l.wr_leave_confirmation, '', cb => {
      if (cb) {
        delay('chat-event-wr-leave', () => eventlog(99938));
        this.doLeave();
      }
    }, 1);
    this.renderDeniedDialog = () => msgDialog('error', '', l.wr_denied, l.wr_denied_details, this.doLeave);
    this.renderTimeoutDialog = () => msgDialog('error', '', l.wr_timeout, l.wr_timeout_details, this.doLeave);
    this.renderWaitingRoomInfo = () => {
      const {
        chatRoom
      } = this.props;
      const {
        nextOccurrenceStart,
        nextOccurrenceEnd
      } = chatRoom.scheduledMeeting || {};
      return JSX_(react0___default().Fragment, null, JSX_(_ui_utils_jsx2__ .P9, {
        tag: "h2",
        content: megaChat.html(chatRoom.topic)
      }), JSX_("div", {
        className: `${NAMESPACE}-schedule`
      }, JSX_("span", null, time2date(nextOccurrenceStart / 1000, 20)), JSX_("span", null, toLocaleTime(nextOccurrenceStart), " - ", toLocaleTime(nextOccurrenceEnd))));
    };
    this.doLeave = () => this.setState({
      view: VIEW.REDIRECT
    }, () => {
      tSleep(this.state.countdown).then(() => this.props.onWaitingRoomLeave());
      this.redirectInterval = setInterval(() => this.setState(({
        countdown
      }) => ({
        countdown: countdown > 0 ? countdown - 1 : 0
      })), 1e3);
      sessionStorage.removeItem('previewMedia');
    });
    this.setInitialView = () => {
      if (u_type || is_eplusplus) {
        let _this$props$chatRoom;
        return (_this$props$chatRoom = this.props.chatRoom) != null && _this$props$chatRoom.iAmInRoom() ? VIEW.AWAIT : VIEW.ACCOUNT;
      }
      return VIEW.INTRO;
    };
    this.requestJoin = () => {
      let _this$props$chatRoom2;
      const {
        audio,
        video
      } = this.state;
      (_this$props$chatRoom2 = this.props.chatRoom) == null || _this$props$chatRoom2.joinCall(audio, video);
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
    this.Card = ({
      className,
      children
    }) => {
      const {
        audio,
        video
      } = this.state;
      return JSX_("div", {
        className: `
                    card
                    ${className || ''}
                 `
      }, JSX_("div", {
        className: "card-body"
      }, children), JSX_("div", {
        className: "card-preview"
      }, JSX_(_workflow_preview_jsx3__ .A, {
        audio,
        video,
        onToggle: (audio, video) => {
          this.setState({
            audio,
            video
          }, () => {
            sessionStorage.previewMedia = JSON.stringify({
              audio,
              video
            });
          });
        }
      })));
    };
    this.Head = ({
      title
    }) => {
      let _this$props$chatRoom3;
      return JSX_("div", {
        className: `${NAMESPACE}-head`
      }, JSX_("div", {
        className: `${NAMESPACE}-logo`
      }, JSX_("i", {
        className: `
                        sprite-fm-illustration-wide
                        ${mega.ui.isDarkTheme() ? 'mega-logo-dark' : 'img-mega-logo-light'}
                    `
      })), JSX_("h1", {
        className: (megaChat.initialChatId || is_chatlink) && this.state.view !== VIEW.INTRO ? 'hidden' : ''
      }, JSX_(_ui_utils_jsx2__ .zT, null, title || l.you_have_invitation.replace('%1', (_this$props$chatRoom3 = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom3.topic))));
    };
    this.Await = () => {
      return JSX_(react0___default().Fragment, null, megaChat.initialChatId ? JSX_(this.Head, null) : null, JSX_(this.Card, {
        className: megaChat.initialChatId ? '' : 'fit-spacing'
      }, this.renderWaitingRoomInfo(), JSX_("div", {
        className: `${NAMESPACE}-message`
      }, this.state.call ? l.wr_wait_to_admit : l.wr_wait_to_start), JSX_(_button_jsx4__ .A, {
        icon: "sprite-fm-mono icon-log-out-thin-solid",
        className: `${NAMESPACE}-leave`,
        onClick: () => this.renderLeaveDialog()
      }, l.wr_leave)));
    };
    this.Account = () => {
      const {
        loading,
        audio,
        video
      } = this.state;
      return JSX_(react0___default().Fragment, null, JSX_(this.Head, null), JSX_(this.Card, null, this.renderWaitingRoomInfo(), JSX_(_button_jsx4__ .A, {
        className: `
                           mega-button
                           positive
                           large
                           ${loading ? 'disabled' : ''}
                        `,
        onClick: () => {
          return loading ? null : this.setState({
            loading: true
          }, () => {
            const {
              chatRoom
            } = this.props;
            const {
              chatId,
              publicChatHandle,
              publicChatKey
            } = chatRoom;
            if (chatRoom.iAmInRoom()) {
              return megaChat.routing.reinitAndOpenExistingChat(chatId, publicChatHandle).then(() => {
                megaChat.getChatById(chatId).joinCall(audio, video);
              }).catch(ex => console.error(`Failed to open existing room and join call: ${ex}`));
            }
            megaChat.routing.reinitAndJoinPublicChat(chatId, publicChatHandle, publicChatKey).then(() => {
              delete megaChat.initialPubChatHandle;
            }).catch(ex => console.error(`Failed to join room: ${ex}`));
          });
        }
      }, l.wr_ask_to_join), JSX_("div", null, JSX_(_link_jsx5__ .A, {
        to: "https://mega.io/chatandmeetings",
        target: "_blank"
      }, l.how_meetings_work))));
    };
    this.Redirect = () => JSX_(react0___default().Fragment, null, JSX_(this.Head, {
      title: l.wr_left_heading
    }), JSX_("h5", null, l.wr_left_countdown.replace('%1', this.state.countdown)));
    this.Guest = () => {
      const {
        chatRoom
      } = this.props;
      const {
        loading,
        firstName,
        lastName
      } = this.state;
      const isDisabled = !firstName.length || !lastName.length;
      return JSX_(react0___default().Fragment, null, JSX_(this.Head, null), JSX_(this.Card, null, this.renderWaitingRoomInfo(), JSX_("div", {
        className: "card-fields"
      }, JSX_(this.Field, {
        name: "firstName"
      }, l[1096]), JSX_(this.Field, {
        name: "lastName"
      }, l[1097])), JSX_(_button_jsx4__ .A, {
        className: `
                            mega-button
                            positive
                            large
                            ${isDisabled || loading ? 'disabled' : ''}
                        `,
        onClick: () => {
          if (isDisabled || loading) {
            return false;
          }
          return this.setState({
            loading: true
          }, () => {
            u_eplusplus(this.state.firstName, this.state.lastName).then(() => {
              return megaChat.routing.reinitAndJoinPublicChat(chatRoom.chatId, chatRoom.publicChatHandle, chatRoom.publicChatKey);
            }).catch(ex => d && console.error(`E++ account failure: ${ex}`));
          });
        }
      }, l.wr_ask_to_join), JSX_("div", null, JSX_(_link_jsx5__ .A, {
        to: "https://mega.io/chatandmeetings",
        target: "_blank"
      }, l.how_meetings_work))));
    };
    this.Intro = () => {
      const {
        chatRoom
      } = this.props;
      return JSX_(react0___default().Fragment, null, JSX_(this.Head, null), JSX_("div", {
        className: "join-meeting-content"
      }, JSX_(_button_jsx4__ .A, {
        className: "mega-button positive",
        onClick: () => {
          megaChat.loginOrRegisterBeforeJoining(chatRoom.publicChatHandle, false, true, undefined, () => this.setState({
            view: VIEW.ACCOUNT
          }));
        }
      }, l[171]), JSX_(_button_jsx4__ .A, {
        className: "mega-button",
        onClick: () => this.setState({
          view: VIEW.GUEST
        })
      }, l.join_as_guest), JSX_("p", null, JSX_(_ui_utils_jsx2__ .P9, {
        onClick: e => {
          e.preventDefault();
          megaChat.loginOrRegisterBeforeJoining(chatRoom.publicChatHandle, true, undefined, undefined, () => this.setState({
            view: VIEW.ACCOUNT
          }));
        }
      }, l[20635]))));
    };
    this.Unsupported = () => {
      let _this$props$chatRoom4;
      return JSX_(react0___default().Fragment, null, JSX_(this.Head, null), JSX_("h1", null, l.you_have_invitation.replace('%1', (_this$props$chatRoom4 = this.props.chatRoom) == null ? void 0 : _this$props$chatRoom4.topic)), JSX_("div", {
        className: "meetings-unsupported-container"
      }, JSX_("i", {
        className: "sprite-fm-uni icon-error"
      }), JSX_("div", {
        className: "unsupported-info"
      }, JSX_("h3", null, l.heading_unsupported_browser), JSX_("h3", null, l.join_meeting_methods), JSX_("ul", null, JSX_("li", null, l.join_via_link), JSX_("li", null, JSX_(_ui_utils_jsx2__ .P9, null, l.join_via_mobile.replace('[A]', '<a href="https://mega.io/mobile" target="_blank" class="clickurl">').replace('[/A]', '</a>')))))));
    };
    this.renderView = view => {
      switch (view) {
        default:
          return this.Await();
        case VIEW.INTRO:
          return this.Intro();
        case VIEW.GUEST:
          return this.Guest();
        case VIEW.ACCOUNT:
          return this.Account();
        case VIEW.REDIRECT:
          return this.Redirect();
        case VIEW.UNSUPPORTED:
          return this.Unsupported();
      }
    };
    this.state.call = this.props.havePendingCall;
    this.state.view = megaChat.hasSupportForCalls ? this.setInitialView() : VIEW.UNSUPPORTED;
    if (sessionStorage.previewMedia) {
      const {
        audio,
        video
      } = JSON.parse(sessionStorage.previewMedia);
      this.state.audio = audio;
      this.state.video = video;
      sessionStorage.removeItem('previewMedia');
    }
  }
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.havePendingCall !== nextProps.havePendingCall) {
      this.setState({
        call: nextProps.havePendingCall
      }, () => this.state.view === VIEW.AWAIT && nextProps.havePendingCall && this.requestJoin());
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    clearInterval(this.redirectInterval);
    this.props.chatRoom.unbind(`onCallLeft.${NAMESPACE}`);
    this.props.chatRoom.unbind(`onModeratorAdd.${NAMESPACE}`);
  }
  componentDidMount() {
    super.componentDidMount();
    const {
      chatRoom
    } = this.props;
    const {
      call,
      view
    } = this.state;
    if (call && view === VIEW.AWAIT) {
      this.requestJoin();
    }
    chatRoom.rebind(`onCallLeft.${NAMESPACE}`, (ev, {
      termCode
    }) => {
      if (termCode === SfuClient.TermCode.kKickedFromWaitingRoom) {
        return this.renderDeniedDialog();
      }
      if (termCode === SfuClient.TermCode.kWaitingRoomAllowTimeout) {
        delay('chat-event-wr-timeout', () => eventlog(99939));
        return this.renderTimeoutDialog();
      }
    });
    chatRoom.rebind(`onModeratorAdd.${NAMESPACE}`, (ev, user) => {
      if (user === u_handle) {
        chatRoom.meetingsLoading = false;
        this.requestJoin();
      }
    });
  }
  render() {
    const {
      view
    } = this.state;
    return JSX_(_ui_utils_jsx2__ .Ay.RenderTo, {
      element: document.body
    }, JSX_("div", {
      ref: this.domRef,
      className: `
                        ${NAMESPACE}
                        join-meeting
                        ${view === VIEW.AWAIT ? `${NAMESPACE}--await` : ''}
                        ${view === VIEW.AWAIT && !megaChat.initialChatId ? 'theme-dark-forced' : ''}
                        ${view === VIEW.REDIRECT ? `${NAMESPACE}--redirect` : ''}
                        ${megaChat.initialChatId || is_chatlink ? `${NAMESPACE}--chatlink-landing` : ''}
                    `
    }, this.renderView(view)));
  }
}

 },

 3056
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  Admit
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _ui_utils_jsx2__ = REQ_(6411);
 const _contacts_jsx3__ = REQ_(8022);
 const _button_jsx4__ = REQ_(6740);
 const _ui_perfectScrollbar_jsx5__ = REQ_(1301);
 const _link6__ = REQ_(4649);







const NAMESPACE = 'admit';
class Admit extends _mixins_js1__ .w9 {
  constructor(...args) {
    super(...args);
    this.domRef = react0___default().createRef();
    this.peersWaitingRef = react0___default().createRef();
    this.state = {
      expanded: false
    };
    this.doAdmit = peers => {
      let _this$props$call;
      return (_this$props$call = this.props.call) == null || (_this$props$call = _this$props$call.sfuClient) == null ? void 0 : _this$props$call.wrAllowJoin([peers]);
    };
    this.doDeny = peers => {
      let _this$props$call2;
      return (_this$props$call2 = this.props.call) == null || (_this$props$call2 = _this$props$call2.sfuClient) == null ? void 0 : _this$props$call2.wrKickOut([peers]);
    };
    this.Icon = ({
      icon,
      label,
      onClick
    }) => JSX_("i", {
      className: `
                sprite-fm-mono
                simpletip
                ${icon}
            `,
      "data-simpletip": label,
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      "data-simpletip-class": "theme-dark-forced",
      onClick
    });
    this.CallLimitBanner = ({
      call
    }) => JSX_("div", {
      className: `${NAMESPACE}-user-limit-banner`
    }, call.organiser === u_handle ? (0,_ui_utils_jsx2__ .lI)(l.admit_limit_banner_organiser, '[A]', _link6__ .A, {
      onClick() {
        window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
        eventlog(500259);
      }
    }) : l.admit_limit_banner_host);
    this.renderPeersList = () => {
      const {
        peers,
        call,
        chatRoom
      } = this.props;
      const disableAdding = call.sfuClient.callLimits && call.sfuClient.callLimits.usr && chatRoom.getCallParticipants().length >= call.sfuClient.callLimits.usr;
      return JSX_(_ui_perfectScrollbar_jsx5__ .O, {
        ref: this.peersWaitingRef,
        options: {
          'suppressScrollX': true
        }
      }, JSX_("div", {
        className: "peers-waiting"
      }, this.isUserLimited && JSX_(this.CallLimitBanner, {
        call
      }), peers.map(handle => {
        return JSX_("div", {
          key: handle,
          className: "peers-waiting-card"
        }, JSX_("div", {
          className: "peer-avatar"
        }, JSX_(_contacts_jsx3__ .eu, {
          contact: M.u[handle]
        })), JSX_("div", {
          className: "peer-name"
        }, JSX_(_contacts_jsx3__ .uA, {
          contact: M.u[handle],
          emoji: true
        })), JSX_("div", {
          className: "peer-controls"
        }, JSX_(this.Icon, {
          icon: "icon-close-component",
          label: l.wr_deny,
          onClick: () => this.doDeny(handle)
        }), JSX_(this.Icon, {
          icon: `icon-check ${disableAdding ? 'disabled' : ''}`,
          label: l.wr_admit,
          onClick: () => !disableAdding && this.doAdmit(handle)
        })));
      })));
    };
    this.renderMultiplePeersWaiting = () => {
      const {
        call,
        peers,
        expanded,
        onWrListToggle
      } = this.props;
      if (peers && peers.length) {
        const disableAddAll = this.isUserLimited;
        return JSX_(react0___default().Fragment, null, JSX_("div", {
          className: `${NAMESPACE}-head`
        }, JSX_("h3", null, mega.icu.format(l.wr_peers_waiting, peers.length)), expanded ? JSX_(this.Icon, {
          icon: "icon-arrow-up",
          onClick: () => onWrListToggle(false)
        }) : null), !expanded && disableAddAll && JSX_(this.CallLimitBanner, {
          call
        }), expanded && JSX_("div", {
          className: `${NAMESPACE}-content`
        }, this.renderPeersList()), JSX_("div", {
          className: `${NAMESPACE}-controls`
        }, expanded ? null : JSX_(_button_jsx4__ .A, {
          className: "mega-button theme-dark-forced",
          onClick: () => onWrListToggle(true)
        }, JSX_("span", null, l.wr_see_waiting)), JSX_(_button_jsx4__ .A, {
          peers,
          className: `mega-button positive theme-dark-forced ${disableAddAll ? 'disabled' : ''}`,
          onClick: () => !disableAddAll && call.sfuClient.wrAllowJoin(peers)
        }, JSX_("span", null, l.wr_admit_all))));
      }
      return null;
    };
    this.renderSinglePeerWaiting = () => {
      const {
        peers,
        call
      } = this.props;
      const peer = peers[0];
      const disableAdding = this.isUserLimited;
      if (peer) {
        return JSX_(react0___default().Fragment, null, JSX_(_ui_utils_jsx2__ .P9, {
          tag: "h3",
          content: l.wr_peer_waiting.replace('%s', megaChat.html(M.getNameByHandle(peer)))
        }), disableAdding && JSX_(this.CallLimitBanner, {
          call
        }), JSX_("div", {
          className: `${NAMESPACE}-controls`
        }, JSX_(_button_jsx4__ .A, {
          className: "mega-button theme-dark-forced",
          onClick: () => this.doDeny(peer)
        }, JSX_("span", null, l.wr_deny)), JSX_(_button_jsx4__ .A, {
          className: `mega-button positive theme-dark-forced ${disableAdding ? 'disabled' : ''}`,
          onClick: () => !disableAdding && this.doAdmit(peer)
        }, JSX_("span", null, l.wr_admit))));
      }
      return null;
    };
  }
  get isUserLimited() {
    const {
      call,
      chatRoom,
      peers
    } = this.props;
    return call.sfuClient.callLimits && call.sfuClient.callLimits.usr && chatRoom.getCallParticipants().length + (peers ? peers.length : 0) > call.sfuClient.callLimits.usr;
  }
  render() {
    const {
      chatRoom,
      peers
    } = this.props;
    if (chatRoom.iAmOperator()) {
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        theme-dark-forced
                    `
      }, JSX_("div", {
        className: `${NAMESPACE}-wrapper`
      }, peers && peers.length > 1 ? this.renderMultiplePeersWaiting() : this.renderSinglePeerWaiting()));
    }
    return null;
  }
}

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

 }

}]);