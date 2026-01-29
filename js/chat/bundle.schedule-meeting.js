/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[716],{

 1497
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   CU: () =>  NAMESPACE,
   Sc: () =>  Checkbox,
   TM: () =>  Textarea,
   VP: () =>  Column,
   dO: () =>  Switch,
   dh: () =>  UpgradeNotice,
   fI: () =>  Row,
   oK: () =>  dialogName,
   pD: () =>  CloseDialog,
   pd: () =>  Input
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _ui_modalDialogs_jsx1__ = REQ_(8120);
 const _button_jsx2__ = REQ_(6740);



const NAMESPACE = 'schedule-dialog';
const dialogName = `meetings-${"schedule-dialog"}`;
const CloseDialog = ({
  onToggle,
  onClose
}) => {
  return JSX_(react0___default().Fragment, null, JSX_(_ui_modalDialogs_jsx1__ .A.ModalDialog, {
    name: `${NAMESPACE}-confirmation`,
    dialogType: "message",
    className: `
                    with-close-btn
                    ${NAMESPACE}-confirmation
                `,
    title: l.schedule_discard_dlg_title,
    icon: "sprite-fm-uni icon-question",
    buttons: [{
      key: 'n',
      label: l.schedule_discard_cancel,
      onClick: () => onToggle('closeDialog')
    }, {
      key: 'y',
      label: l.schedule_discard_confirm,
      className: 'positive',
      onClick: onClose
    }],
    noCloseOnClickOutside: true,
    stopKeyPropagation: true,
    hideOverlay: true,
    onClose: () => onToggle('closeDialog')
  }), JSX_("div", {
    className: `${NAMESPACE}-confirmation-overlay`,
    onClick: () => onToggle('closeDialog')
  }));
};
const Row = ({
  children,
  className
}) => JSX_("div", {
  className: `
            ${NAMESPACE}-row
            ${className || ''}
        `
}, children);
const Column = ({
  children,
  className
}) => JSX_("div", {
  className: `
            ${NAMESPACE}-column
            ${className || ''}
        `
}, children);
const Input = ({
  name,
  placeholder,
  value,
  invalid,
  invalidMessage,
  autoFocus,
  isLoading,
  onFocus,
  onChange
}) => {
  return JSX_(Row, {
    className: invalid ? 'invalid-aligned' : ''
  }, JSX_(Column, null, JSX_("i", {
    className: "sprite-fm-mono icon-rename"
  })), JSX_(Column, null, JSX_("div", {
    className: `
                        mega-input
                        ${invalid ? 'error msg' : ''}
                    `
  }, JSX_("input", {
    type: "text",
    name: `${NAMESPACE}-${name}`,
    className: isLoading ? 'disabled' : '',
    disabled: isLoading,
    autoFocus,
    autoComplete: "off",
    placeholder,
    value,
    onFocus,
    onChange: ({
      target
    }) => onChange(target.value)
  }), invalid && JSX_("div", {
    className: "message-container mega-banner"
  }, invalidMessage))));
};
const Checkbox = ({
  name,
  className,
  checked,
  label,
  subLabel,
  isLoading,
  onToggle
}) => {
  return JSX_(Row, {
    className: `
                ${subLabel ? 'start-aligned' : ''}
                ${className || ''}
            `
  }, JSX_(Column, null, JSX_("div", {
    className: `
                        checkdiv
                        ${checked ? 'checkboxOn' : 'checkboxOff'}
                        ${isLoading ? 'disabled' : ''}
                    `
  }, JSX_("input", {
    name: `${NAMESPACE}-${name}`,
    disabled: isLoading,
    type: "checkbox",
    onChange: () => onToggle(name)
  }))), JSX_(Column, {
    className: subLabel ? 'with-sub-label' : ''
  }, JSX_("label", {
    htmlFor: `${NAMESPACE}-${name}`,
    className: isLoading ? 'disabled' : '',
    onClick: () => isLoading ? null : onToggle(name)
  }, label), subLabel && JSX_("div", {
    className: "sub-label"
  }, subLabel)));
};
const Switch = ({
  name,
  toggled,
  label,
  isLoading,
  subLabel,
  onToggle
}) => {
  return JSX_(Row, null, JSX_(Column, null, JSX_("i", {
    className: "sprite-fm-uni icon-mega-logo"
  })), JSX_(Column, {
    className: subLabel ? `with-sub-label ${"schedule-dialog-switch"}` : "schedule-dialog-switch"
  }, JSX_("span", {
    className: `
                        schedule-label
                        ${isLoading ? 'disabled' : ''}
                    `,
    onClick: () => isLoading ? null : onToggle(name)
  }, label), JSX_("div", {
    className: `
                        mega-switch
                        ${toggled ? 'toggle-on' : ''}
                        ${isLoading ? 'disabled' : ''}
                    `,
    onClick: () => isLoading ? null : onToggle(name)
  }, JSX_("div", {
    className: `
                            mega-feature-switch
                            sprite-fm-mono-after
                            ${toggled ? 'icon-check-after' : 'icon-minimise-after'}
                        `
  })), subLabel && JSX_("div", {
    className: "sub-label"
  }, subLabel)));
};
const Textarea = ({
  name,
  placeholder,
  isLoading,
  value,
  invalid,
  onChange,
  onFocus
}) => {
  return JSX_(Row, {
    className: "start-aligned"
  }, JSX_(Column, null, JSX_("i", {
    className: "sprite-fm-mono icon-description"
  })), JSX_(Column, null, JSX_("div", {
    className: `mega-input box-style textarea ${invalid ? 'error' : ''}`
  }, JSX_("textarea", {
    name: `${NAMESPACE}-${name}`,
    className: isLoading ? 'disabled' : '',
    placeholder,
    value,
    readOnly: isLoading,
    onChange: ({
      target
    }) => onChange(target.value),
    onFocus
  })), invalid && JSX_("div", {
    className: "mega-input error msg textarea-error"
  }, JSX_("div", {
    className: "message-container mega-banner"
  }, l.err_schedule_desc_long))));
};
const UpgradeNotice = ({
  onUpgradeClicked
}) => {
  return !!mega.flags.ff_chmon && JSX_(Row, {
    className: "schedule-upgrade-notice"
  }, JSX_("h3", null, l.schedule_limit_title), JSX_("div", null, l.schedule_limit_upgrade_features), JSX_(_button_jsx2__ .A, {
    className: "mega-button positive",
    onClick: onUpgradeClicked
  }, JSX_("span", null, l.upgrade_now)));
};

 },

 3448
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   A: () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _ui_perfectScrollbar_jsx2__ = REQ_(1301);
 const _helpers_jsx3__ = REQ_(6521);
 const _dateObserver4__ = REQ_(8894);





class Select extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.domRef = react0___default().createRef();
    this.inputRef = react0___default().createRef();
    this.menuRef = react0___default().createRef();
    this.optionRefs = {};
    this.state = {
      expanded: false,
      manualTimeInput: '',
      timestamp: ''
    };
    this.handleMousedown = ({
      target
    }) => {
      let _this$domRef;
      return (_this$domRef = this.domRef) != null && _this$domRef.current.contains(target) ? null : this.setState({
        expanded: false
      });
    };
    this.handleToggle = ({
      target
    } = {}) => {
      let _this$menuRef, _menuRef$domRef;
      const menuRef = (_this$menuRef = this.menuRef) == null ? void 0 : _this$menuRef.current;
      const menuElement = (_menuRef$domRef = menuRef.domRef) == null ? void 0 : _menuRef$domRef.current;
      if (target !== menuElement) {
        const {
          value
        } = this.props;
        this.setState(state => ({
          expanded: !state.expanded
        }), () => {
          if (value && this.optionRefs[value]) {
            menuRef.scrollToElement(this.optionRefs[value]);
          }
        });
      }
    };
  }
  getFormattedDuration(duration) {
    duration = moment.duration(duration);
    const days = duration.get('days');
    const hours = duration.get('hours');
    const minutes = duration.get('minutes');
    if (!hours && !minutes && !days) {
      return '';
    }
    const totalHours = days ? ~~duration.asHours() : hours;
    if (!hours && minutes) {
      return days ? `(${totalHours}\u00a0h ${minutes}\u00a0m)` : `(${minutes}\u00a0m)`;
    }
    return minutes ? `(${totalHours}\u00a0h ${minutes}\u00a0m)` : `(${totalHours}\u00a0h)`;
  }
  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleMousedown);
    if (this.inputRef && this.inputRef.current) {
      $(this.inputRef.current).unbind(`keyup.${Select.NAMESPACE}`);
    }
  }
  componentDidMount() {
    let _this$inputRef;
    document.addEventListener('mousedown', this.handleMousedown);
    const inputRef = (_this$inputRef = this.inputRef) == null ? void 0 : _this$inputRef.current;
    if (inputRef) {
      $(inputRef).rebind(`keyup.${Select.NAMESPACE}`, ({
        keyCode
      }) => {
        if (keyCode === 13) {
          this.handleToggle();
          inputRef.blur();
          return false;
        }
      });
    }
  }
  render() {
    const {
      NAMESPACE
    } = Select;
    const {
      name,
      className,
      icon,
      typeable,
      options,
      value,
      format,
      isLoading,
      onChange,
      onBlur,
      onSelect
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${NAMESPACE}
                    ${className || ''}
                `
    }, JSX_("div", {
      className: `
                        mega-input
                        dropdown-input
                        ${typeable ? 'typeable' : ''}
                    `,
      onClick: isLoading ? null : this.handleToggle
    }, typeable ? null : value && JSX_("span", null, format ? format(value) : value), JSX_("input", {
      ref: this.inputRef,
      type: "text",
      className: `
                            ${NAMESPACE}-input
                            ${name}
                        `,
      value: (() => {
        if (this.state.manualTimeInput) {
          return this.state.manualTimeInput;
        }
        return format ? format(value) : value;
      })(),
      onFocus: ({
        target
      }) => {
        this.setState({
          manualTimeInput: '',
          timestamp: ''
        }, () => target.select());
      },
      onChange: ({
        target
      }) => {
        const {
          value: manualTimeInput
        } = target;
        const {
          value
        } = this.props;
        const prevDate = moment(value);
        const inputTime = (0,_helpers_jsx3__ .We)(manualTimeInput);
        prevDate.set({
          hours: inputTime.get('hours'),
          minutes: inputTime.get('minutes')
        });
        const timestamp = prevDate.valueOf();
        onChange == null || onChange(timestamp);
        if (this.optionRefs[value]) {
          this.menuRef.current.scrollToElement(this.optionRefs[value]);
        }
        this.setState({
          manualTimeInput,
          timestamp
        });
      },
      onBlur: () => {
        onBlur(this.state.timestamp);
        this.setState({
          manualTimeInput: '',
          timestamp: ''
        });
      }
    }), icon && JSX_("i", {
      className: "sprite-fm-mono icon-dropdown"
    }), options && JSX_("div", {
      className: `
                                mega-input-dropdown
                                ${this.state.expanded ? '' : 'hidden'}
                            `
    }, JSX_(_ui_perfectScrollbar_jsx2__ .O, {
      ref: this.menuRef,
      options: {
        suppressScrollX: true
      }
    }, options.map(option => {
      return JSX_("div", {
        ref: ref => {
          this.optionRefs[option.value] = ref;
        },
        key: option.value,
        className: `
                                                option
                                                ${option.value === value || option.label === value ? 'active' : ''}
                                            `,
        onClick: () => onSelect(option)
      }, option.label, "\xA0", option.duration && this.getFormattedDuration(option.duration));
    })))));
  }
}
Select.NAMESPACE = 'meetings-select';
 const __WEBPACK_DEFAULT_EXPORT__ = (0,_mixins_js1__ .Zz)(_dateObserver4__ .V)(Select);

 },

 4156
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  Edit
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _mixins_js2__ = REQ_(8264);
 const _utils_jsx3__ = REQ_(1497);
 const _ui_modalDialogs_jsx4__ = REQ_(8120);
 const _ui_utils_jsx5__ = REQ_(6411);
 const _link_jsx6__ = REQ_(4649);
 const _datetime_jsx7__ = REQ_(9811);
 const _helpers_jsx8__ = REQ_(6521);
 const _button_jsx9__ = REQ_(6740);










class Edit extends _mixins_js2__ .w9 {
  constructor(props) {
    super(props);
    this.occurrenceRef = null;
    this.datepickerRefs = [];
    this.interval = ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    this.incomingCallListener = 'onPrepareIncomingCallDialog.recurringEdit';
    this.state = {
      startDateTime: undefined,
      endDateTime: undefined,
      isDirty: false,
      closeDialog: false,
      overlayed: false
    };
    this.onStartDateSelect = startDateTime => {
      this.setState({
        startDateTime,
        isDirty: true
      }, () => {
        this.datepickerRefs.endDateTime.selectDate(new Date(startDateTime + this.interval));
      });
    };
    this.onEndDateSelect = endDateTime => {
      this.setState({
        endDateTime,
        isDirty: true
      }, () => {
        const {
          startDateTime,
          endDateTime
        } = this.state;
        if (endDateTime < startDateTime) {
          if (endDateTime < Date.now()) {
            return this.setState({
              endDateTime: startDateTime + this.interval
            });
          }
          this.handleTimeSelect({
            startDateTime: endDateTime - this.interval
          });
        }
      });
    };
    this.handleTimeSelect = ({
      startDateTime,
      endDateTime
    }) => {
      startDateTime = startDateTime || this.state.startDateTime;
      endDateTime = endDateTime || this.state.endDateTime;
      this.setState(state => {
        return {
          startDateTime: endDateTime <= state.startDateTime ? endDateTime - this.interval : startDateTime,
          endDateTime: startDateTime >= state.endDateTime ? startDateTime + this.interval : endDateTime,
          isDirty: true
        };
      });
    };
    const {
      scheduledMeeting,
      occurrenceId
    } = this.props;
    this.occurrenceRef = scheduledMeeting.occurrences[occurrenceId];
    if (this.occurrenceRef) {
      this.state.startDateTime = this.occurrenceRef.start;
      this.state.endDateTime = this.occurrenceRef.end;
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this.incomingCallListener) {
      megaChat.off(this.incomingCallListener);
    }
    if ($.dialog === _utils_jsx3__ .oK) {
      closeDialog();
    }
  }
  componentDidMount() {
    super.componentDidMount();
    M.safeShowDialog(_utils_jsx3__ .oK, () => {
      if (!this.isMounted()) {
        throw Error(`Edit dialog: component not mounted.`);
      }
      megaChat.rebind(this.incomingCallListener, () => {
        if (this.isMounted()) {
          this.setState({
            overlayed: true,
            closeDialog: false
          });
          megaChat.plugins.callManager2.rebind('onRingingStopped.recurringEdit', () => {
            megaChat.plugins.callManager2.off('onRingingStopped.recurringEdit');
            this.setState({
              overlayed: false
            });
            fm_showoverlay();
          });
        }
      });
      return $(`#${_utils_jsx3__ .CU}`);
    });
  }
  componentDidUpdate(prevProps) {
    if (prevProps.callExpanded && !this.props.callExpanded) {
      if (!$.dialog) {
        M.safeShowDialog(_utils_jsx3__ .oK, `#${_utils_jsx3__ .CU}`);
      }
      fm_showoverlay();
      this.setState({
        closeDialog: false
      });
    }
    if (!prevProps.callExpanded && this.props.callExpanded) {
      this.setState({
        closeDialog: false
      });
    }
  }
  render() {
    const {
      chatRoom,
      callExpanded,
      onClose
    } = this.props;
    const {
      startDateTime,
      endDateTime,
      isDirty,
      closeDialog,
      overlayed
    } = this.state;
    const dialogClasses = ['fluid'];
    if (closeDialog) {
      dialogClasses.push('with-confirmation-dialog');
    }
    if (callExpanded || overlayed) {
      dialogClasses.push('hidden');
    }
    const withUpgrade = !u_attr.p && endDateTime - startDateTime > 36e5;
    if (withUpgrade) {
      dialogClasses.push('upgrade');
    }
    return JSX_(_ui_modalDialogs_jsx4__ .A.ModalDialog, (0,_babel_runtime_helpers_extends0__ .A)({}, this.state, {
      id: _utils_jsx3__ .CU,
      className: dialogClasses.join(' '),
      dialogName: _utils_jsx3__ .oK,
      dialogType: "main",
      onClose: () => {
        return isDirty ? this.setState({
          closeDialog: true
        }) : onClose();
      }
    }), JSX_("header", null, JSX_("h2", null, l.edit_meeting_title)), JSX_("div", {
      className: "fm-dialog-body"
    }, JSX_(_utils_jsx3__ .fI, null, JSX_("div", {
      className: "mega-banner body recurring-edit-banner"
    }, JSX_("div", {
      className: "cell"
    }, (0,_ui_utils_jsx5__ .lI)(l.scheduled_edit_occurrence_note, '[A]', _link_jsx6__ .A, {
      onClick: () => {
        onClose();
        megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.EDIT, chatRoom);
      }
    })))), JSX_(_utils_jsx3__ .fI, {
      className: "start-aligned"
    }, JSX_(_utils_jsx3__ .VP, null, JSX_("i", {
      className: "sprite-fm-mono icon-recents-filled"
    })), JSX_("div", {
      className: "schedule-date-container"
    }, JSX_(_datetime_jsx7__ .c, {
      name: "startDateTime",
      altField: "startTime",
      datepickerRef: this.datepickerRefs.startDateTime,
      startDate: startDateTime,
      value: startDateTime,
      filteredTimeIntervals: (0,_helpers_jsx8__ .a4)(startDateTime),
      label: l.schedule_start_date,
      onMount: datepicker => {
        this.datepickerRefs.startDateTime = datepicker;
      },
      onSelectDate: startDateTime => this.onStartDateSelect(startDateTime),
      onSelectTime: ({
        value: startDateTime
      }) => this.handleTimeSelect({
        startDateTime
      }),
      onChange: value => this.setState({
        startDateTime: value
      }),
      onBlur: timestamp => {
        if (timestamp) {
          timestamp = timestamp < Date.now() ? this.occurrenceRef.start : timestamp;
          this.onStartDateSelect(timestamp);
        }
      }
    }), JSX_(_datetime_jsx7__ .c, {
      name: "endDateTime",
      altField: "endTime",
      datepickerRef: this.datepickerRefs.endDateTime,
      startDate: endDateTime,
      value: endDateTime,
      filteredTimeIntervals: (0,_helpers_jsx8__ .a4)(endDateTime, startDateTime),
      label: l.schedule_end_date,
      onMount: datepicker => {
        this.datepickerRefs.endDateTime = datepicker;
      },
      onSelectDate: endDateTime => this.onEndDateSelect(endDateTime),
      onSelectTime: ({
        value: endDateTime
      }) => this.handleTimeSelect({
        endDateTime
      }),
      onChange: timestamp => this.setState({
        endDateTime: timestamp
      }),
      onBlur: timestamp => timestamp && this.onEndDateSelect(timestamp)
    }))), withUpgrade && JSX_(_utils_jsx3__ .dh, {
      onUpgradeClicked: () => {
        onClose();
        loadSubPage('pro');
        eventlog(500257);
      }
    })), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_(_button_jsx9__ .A, {
      className: "mega-button positive",
      onClick: () => {
        const {
          startDateTime,
          endDateTime
        } = this.state;
        if (startDateTime !== this.occurrenceRef.start || endDateTime !== this.occurrenceRef.end) {
          delay('chat-event-sm-edit-meeting', () => eventlog(99923));
          this.occurrenceRef.update(startDateTime, endDateTime);
        }
        onClose();
      }
    }, JSX_("span", null, l.update_meeting_button)))), !(overlayed || callExpanded) && closeDialog && JSX_(_utils_jsx3__ .pD, {
      onToggle: () => this.setState({
        closeDialog: false
      }),
      onClose
    }));
  }
}

 },

 8389
(_, EXP_, REQ_) {

// ESM COMPAT FLAG
REQ_.r(EXP_);

// EXPORTS
REQ_.d(EXP_, {
  "default": () =>  Schedule
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
const meetings_button = REQ_(6740);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const ui_contacts = REQ_(8022);
;// ./js/chat/ui/meetings/schedule/invite.jsx




class Invite extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.wrapperRef = REaCt().createRef();
    this.inputRef = REaCt().createRef();
    this.state = {
      value: '',
      expanded: false,
      loading: true,
      frequents: [],
      frequentsInitial: [],
      contacts: [],
      contactsInitial: [],
      selected: []
    };
    this.handleMousedown = ({
      target
    }) => this.domRef && this.domRef.current && this.domRef.current.contains(target) ? null : this.setState({
      expanded: false
    });
    this.getSortedContactsList = frequents => {
      const filteredContacts = [];
      M.u.forEach(contact => {
        if (contact.c === 1 && !frequents.includes(contact.u) && !this.state.selected.includes(contact.u)) {
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
        const name = M.getNameByHandle(contact.u).toLowerCase();
        const email = contact.m && contact.m.toLowerCase();
        return name.includes(value) || email.includes(value);
      });
    };
    this.handleSearch = this.handleSearch.bind(this);
    this.state.selected = this.props.participants || [];
  }
  reinitializeWrapper() {
    const wrapperRef = this.wrapperRef && this.wrapperRef.current;
    if (wrapperRef) {
      wrapperRef.reinitialise();
      wrapperRef.scrollToY(0);
    }
  }
  buildContactsList() {
    megaChat.getFrequentContacts().then(frequentContacts => {
      if (this.isMounted()) {
        const frequents = frequentContacts.slice(-ui_contacts.lO).map(c => c.userId);
        const contacts = this.getSortedContactsList(frequents);
        this.setState({
          frequents,
          frequentsInitial: frequents,
          contacts,
          contactsInitial: contacts,
          loading: false
        });
      }
    });
  }
  handleSearch(ev) {
    const {
      value
    } = ev.target;
    const searching = value.length >= 2;
    const frequents = searching ? this.doMatch(value, this.state.frequentsInitial) : this.state.frequentsInitial;
    const contacts = searching ? this.doMatch(value, this.state.contactsInitial) : this.state.contactsInitial;
    this.setState({
      value,
      contacts,
      frequents
    }, () => this.reinitializeWrapper());
  }
  handleSelect({
    userHandle,
    expanded = false
  }) {
    this.setState(state => ({
      value: '',
      expanded,
      selected: state.selected.includes(userHandle) ? state.selected.filter(c => c !== userHandle) : [...state.selected, userHandle]
    }), () => {
      let _this$inputRef$curren;
      this.props.onSelect(this.state.selected);
      this.buildContactsList();
      this.reinitializeWrapper();
      (_this$inputRef$curren = this.inputRef.current) == null || _this$inputRef$curren.focus();
    });
  }
  getFilteredContacts(contacts) {
    if (contacts && contacts.length) {
      return contacts.map(contact => {
        contact = contact instanceof MegaDataMap ? contact : M.u[contact];
        return this.state.selected.includes(contact.u) ? null : JSX_("div", {
          key: contact.u,
          className: "invite-section-item",
          onClick: () => {
            this.handleSelect({
              userHandle: contact.u,
              expanded: true
            });
          }
        }, JSX_(ui_contacts.eu, {
          contact
        }), JSX_("div", {
          className: "invite-item-data"
        }, JSX_("div", {
          className: "invite-item-name"
        }, JSX_(ui_contacts.uA, {
          overflow: true,
          simpletip: {
            offset: 10
          },
          contact
        })), JSX_("div", {
          className: "invite-item-mail"
        }, contact.m)));
      });
    }
    return null;
  }
  renderContent() {
    const {
      frequents,
      contacts,
      selected
    } = this.state;
    const hasMoreFrequents = frequents.length && frequents.some(h => !selected.includes(h));
    const $$SECTION = (title, children) => JSX_("div", {
      className: "invite-section"
    }, JSX_("div", {
      className: "invite-section-title"
    }, title), children && JSX_("div", {
      className: "invite-section-list"
    }, children));
    if (hasMoreFrequents || contacts.length) {
      return JSX_(perfectScrollbar.O, {
        ref: this.wrapperRef,
        className: "invite-scroll-wrapper",
        options: {
          'suppressScrollX': true
        }
      }, hasMoreFrequents ? $$SECTION(l.recent_contact_label, this.getFilteredContacts(frequents)) : '', contacts.length ? $$SECTION(l.all_contact_label, this.getFilteredContacts(contacts)) : '', frequents.length === 0 && contacts.length === 0 && $$SECTION(l.invite_no_results_found, null));
    }
    return $$SECTION(l.invite_no_contacts_to_add, null);
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('mousedown', this.handleMousedown);
  }
  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('mousedown', this.handleMousedown);
    this.buildContactsList();
  }
  render() {
    const {
      className,
      isLoading
    } = this.props;
    const {
      value,
      expanded,
      loading,
      selected
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${Invite.NAMESPACE}
                    ${className || ''}
                `
    }, JSX_("div", {
      className: "multiple-input"
    }, JSX_("ul", {
      className: "token-input-list-mega",
      onClick: ({
        target
      }) => isLoading ? null : target.classList.contains('token-input-list-mega') && this.setState({
        expanded: true
      })
    }, selected.map(handle => {
      return JSX_("li", {
        key: handle,
        className: "token-input-token-mega"
      }, JSX_("div", {
        className: "contact-tag-item"
      }, JSX_(ui_contacts.eu, {
        contact: M.u[handle],
        className: "avatar-wrapper box-avatar"
      }), JSX_(ui_contacts.uA, {
        contact: M.u[handle],
        overflow: true
      }), JSX_("i", {
        className: "sprite-fm-mono icon-close-component",
        onClick: () => isLoading ? null : this.handleSelect({
          userHandle: handle
        })
      })));
    }), JSX_("li", {
      className: "token-input-input-token-mega"
    }, JSX_("input", {
      ref: this.inputRef,
      type: "text",
      name: "participants",
      className: `${Invite.NAMESPACE}-input`,
      disabled: isLoading,
      autoComplete: "off",
      placeholder: selected.length ? '' : l.schedule_participant_input,
      value,
      onClick: () => this.setState({
        expanded: true
      }),
      onChange: this.handleSearch,
      onKeyDown: ({
        target,
        keyCode
      }) => {
        const {
          selected
        } = this.state;
        return keyCode === 8 && target.value === '' && selected.length && this.handleSelect({
          userHandle: selected[selected.length - 1]
        });
      }
    })))), loading ? null : JSX_("div", {
      className: `mega-input-dropdown ${expanded ? '' : 'hidden'}`
    }, this.renderContent()));
  }
}
Invite.NAMESPACE = 'meetings-invite';
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/helpers.jsx
const helpers = REQ_(6521);
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/datetime.jsx
const datetime = REQ_(9811);
// EXTERNAL MODULE: ./js/chat/chatRoom.jsx
const chat_chatRoom = REQ_(7057);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
// EXTERNAL MODULE: ./js/chat/ui/conversations.jsx + 2 modules
const conversations = REQ_(4904);
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/utils.jsx
const schedule_utils = REQ_(1497);
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/datepicker.jsx
const datepicker = REQ_(9290);
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/select.jsx
const schedule_select = REQ_(3448);
;// ./js/chat/ui/meetings/schedule/recurring.jsx








class Recurring extends mixins.w9 {
  constructor(props) {
    let _Object$values$find;
    super(props);
    this.domRef = REaCt().createRef();
    this.VIEWS = {
      DAILY: 0x00,
      WEEKLY: 0x01,
      MONTHLY: 0x02
    };
    this.FREQUENCIES = {
      DAILY: 'd',
      WEEKLY: 'w',
      MONTHLY: 'm'
    };
    this.WEEK_DAYS = {
      MONDAY: {
        value: 1,
        label: l.schedule_day_control_mon
      },
      TUESDAY: {
        value: 2,
        label: l.schedule_day_control_tue
      },
      WEDNESDAY: {
        value: 3,
        label: l.schedule_day_control_wed
      },
      THURSDAY: {
        value: 4,
        label: l.schedule_day_control_thu
      },
      FRIDAY: {
        value: 5,
        label: l.schedule_day_control_fri
      },
      SATURDAY: {
        value: 6,
        label: l.schedule_day_control_sat
      },
      SUNDAY: {
        value: 7,
        label: l.schedule_day_control_sun
      }
    };
    this.OFFSETS = [[l.recur_freq_offset_first_mon || '[A]first[/A][B]Monday[/B]', l.recur_freq_offset_first_tue || '[A]first[/A][B]Tuesday[/B]', l.recur_freq_offset_first_wed || '[A]first[/A][B]Wednesday[/B]', l.recur_freq_offset_first_thu || '[A]first[/A][B]Thursday[/B]', l.recur_freq_offset_first_fri || '[A]first[/A][B]Friday[/B]', l.recur_freq_offset_first_sat || '[A]first[/A][B]Saturday[/B]', l.recur_freq_offset_first_sun || '[A]first[/A][B]Sunday[/B]'], [l.recur_freq_offset_second_mon || '[A]second[/A][B]Monday[/B]', l.recur_freq_offset_second_tue || '[A]second[/A][B]Tuesday[/B]', l.recur_freq_offset_second_wed || '[A]second[/A][B]Wednesday[/B]', l.recur_freq_offset_second_thu || '[A]second[/A][B]Thursday[/B]', l.recur_freq_offset_second_fri || '[A]second[/A][B]Friday[/B]', l.recur_freq_offset_second_sat || '[A]second[/A][B]Saturday[/B]', l.recur_freq_offset_second_sun || '[A]second[/A][B]Sunday[/B]'], [l.recur_freq_offset_third_mon || '[A]third[/A][B]Monday[/B]', l.recur_freq_offset_third_tue || '[A]third[/A][B]Tuesday[/B]', l.recur_freq_offset_third_wed || '[A]third[/A][B]Wednesday[/B]', l.recur_freq_offset_third_thu || '[A]third[/A][B]Thursday[/B]', l.recur_freq_offset_third_fri || '[A]third[/A][B]Friday[/B]', l.recur_freq_offset_third_sat || '[A]third[/A][B]Saturday[/B]', l.recur_freq_offset_third_sun || '[A]third[/A][B]Sunday[/B]'], [l.recur_freq_offset_fourth_mon || '[A]fourth[/A][B]Monday[/B]', l.recur_freq_offset_fourth_tue || '[A]fourth[/A][B]Tuesday[/B]', l.recur_freq_offset_fourth_wed || '[A]fourth[/A][B]Wednesday[/B]', l.recur_freq_offset_fourth_thu || '[A]fourth[/A][B]Thursday[/B]', l.recur_freq_offset_fourth_fri || '[A]fourth[/A][B]Friday[/B]', l.recur_freq_offset_fourth_sat || '[A]fourth[/A][B]Saturday[/B]', l.recur_freq_offset_fourth_sun || '[A]fourth[/A][B]Sunday[/B]'], [l.recur_freq_offset_fifth_mon || '[A]fifth[/A][B]Monday[/B]', l.recur_freq_offset_fifth_tue || '[A]fifth[/A][B]Tuesday[/B]', l.recur_freq_offset_fifth_wed || '[A]fifth[/A][B]Wednesday[/B]', l.recur_freq_offset_fifth_thu || '[A]fifth[/A][B]Thursday[/B]', l.recur_freq_offset_fifth_fri || '[A]fifth[/A][B]Friday[/B]', l.recur_freq_offset_fifth_sat || '[A]fifth[/A][B]Saturday[/B]', l.recur_freq_offset_fifth_sun || '[A]fifth[/A][B]Sunday[/B]']];
    this.OFFSET_POS_REGEX = /\[A]([^[]+)\[\/A]/;
    this.OFFSET_DAY_REGEX = /\[B]([^[]+)\[\/B]/;
    this.MONTH_RULES = {
      DAY: 'day',
      OFFSET: 'offset'
    };
    this.initialEnd = (0,helpers.PS)(this.props.startDateTime, 6);
    this.initialWeekDays = Object.values(this.WEEK_DAYS).map(d => d.value);
    this.initialMonthDay = this.props.startDateTime ? new Date(this.props.startDateTime).getDate() : undefined;
    this.state = {
      view: this.VIEWS.DAILY,
      frequency: this.FREQUENCIES.DAILY,
      end: this.initialEnd,
      prevEnd: undefined,
      interval: 0,
      weekDays: this.initialWeekDays,
      monthRule: this.MONTH_RULES.DAY,
      monthDays: [this.initialMonthDay],
      offset: {
        value: 1,
        weekDay: 1
      },
      monthDaysWarning: this.initialMonthDay > 28
    };
    this.toggleView = (view, frequency, state) => this.props.isLoading ? null : this.setState({
      view,
      frequency,
      ...state
    });
    this.MonthDaySelect = ({
      offset
    }) => {
      const dayIdx = (offset && offset.weekDay || 1) - 1;
      const posIdx = (offset && offset.value || 1) - 1;
      const dayValues = this.OFFSETS[posIdx].map((part, idx) => ({
        value: idx + 1,
        label: this.OFFSET_DAY_REGEX.exec(part)[1]
      }));
      const posValues = [];
      for (let i = 0; i < this.OFFSETS.length; i++) {
        posValues.push({
          value: i + 1,
          label: this.OFFSET_POS_REGEX.exec(this.OFFSETS[i][dayIdx])[1]
        });
      }
      const posFirst = this.OFFSETS[posIdx][dayIdx].indexOf('[A]') < this.OFFSETS[posIdx][dayIdx].indexOf('[B]');
      const pos = JSX_(schedule_select.A, {
        name: "recurring-offset-value",
        className: "inline",
        icon: true,
        value: posValues[posIdx].label,
        isLoading: this.props.isLoading,
        options: posValues,
        onSelect: option => {
          this.setState(state => ({
            monthRule: this.MONTH_RULES.OFFSET,
            offset: {
              value: option.value,
              weekDay: state.offset.weekDay || this.WEEK_DAYS.MONDAY.value
            }
          }));
        }
      });
      return JSX_(REaCt().Fragment, null, posFirst && pos, JSX_(schedule_select.A, {
        name: "recurring-offset-day",
        className: "inline",
        icon: true,
        value: dayValues[dayIdx].label,
        isLoading: this.props.isLoading,
        options: dayValues,
        onSelect: option => {
          this.setState(state => ({
            monthRule: this.MONTH_RULES.OFFSET,
            offset: {
              value: state.offset.value || 1,
              weekDay: option.value
            }
          }));
        }
      }), !posFirst && pos);
    };
    this.IntervalSelect = () => {
      const {
        interval,
        view
      } = this.state;
      return JSX_("div", {
        className: "mega-input inline recurring-interval"
      }, JSX_(schedule_select.A, {
        name: `${Recurring.NAMESPACE}-interval`,
        value: interval > 0 ? interval : 1,
        icon: true,
        isLoading: this.props.isLoading,
        options: [...Array(view === this.VIEWS.WEEKLY ? 52 : 12).keys()].map(value => {
          value += 1;
          return {
            value,
            label: value
          };
        }),
        onSelect: ({
          value
        }) => {
          this.setState({
            interval: value === 1 ? 0 : value
          });
        }
      }));
    };
    const {
      chatRoom,
      startDateTime
    } = this.props;
    const weekDay = new Date(startDateTime).getDay();
    this.state.offset.weekDay = ((_Object$values$find = Object.values(this.WEEK_DAYS).find(d => d.value === weekDay)) == null ? void 0 : _Object$values$find.value) || this.WEEK_DAYS.SUNDAY.value;
    if (chatRoom && chatRoom.scheduledMeeting && chatRoom.scheduledMeeting.isRecurring) {
      const {
        frequency,
        interval,
        end,
        weekDays,
        monthDays,
        offset
      } = chatRoom.scheduledMeeting.recurring;
      this.state.view = frequency === 'd' ? this.VIEWS.DAILY : frequency === 'w' ? this.VIEWS.WEEKLY : this.VIEWS.MONTHLY;
      this.state.frequency = frequency;
      this.state.end = end;
      this.state.interval = interval;
      this.state.weekDays = weekDays && weekDays.length ? weekDays : this.initialWeekDays;
      this.state.monthRule = monthDays && monthDays.length ? this.MONTH_RULES.DAY : this.MONTH_RULES.OFFSET;
      this.state.monthDays = monthDays && monthDays.length ? [monthDays[0]] : [this.initialMonthDay];
      this.state.offset = offset && Object.keys(offset).length ? offset : this.state.offset;
    }
  }
  getFormattedState(state) {
    const {
      frequency,
      end,
      interval,
      weekDays,
      monthRule,
      monthDays,
      offset
    } = state;
    switch (true) {
      case frequency === this.FREQUENCIES.DAILY:
        return {
          frequency,
          end,
          weekDays
        };
      case frequency === this.FREQUENCIES.WEEKLY:
        return {
          frequency,
          end,
          ...interval && {
            interval
          },
          weekDays
        };
      case frequency === this.FREQUENCIES.MONTHLY:
        return {
          frequency,
          end,
          ...interval && {
            interval
          },
          ...monthRule === this.MONTH_RULES.DAY ? {
            monthDays
          } : {
            offset: [[offset.value, offset.weekDay]]
          }
        };
    }
  }
  renderDayControls() {
    const {
      weekDays,
      view
    } = this.state;
    const handleWeeklySelection = (weekDay, remove) => {
      this.setState(state => {
        if (remove) {
          return {
            weekDays: state.weekDays.length === 1 ? state.weekDays : state.weekDays.filter(d => d !== weekDay)
          };
        }
        return {
          weekDays: [...state.weekDays, weekDay]
        };
      }, () => {
        const {
          weekDays
        } = this.state;
        if (weekDays.length === Object.keys(this.WEEK_DAYS).length) {
          this.toggleView(this.VIEWS.DAILY, this.FREQUENCIES.DAILY);
        }
      });
    };
    const handleDailySelection = weekDay => {
      this.toggleView(this.VIEWS.WEEKLY, this.FREQUENCIES.WEEKLY, {
        weekDays: weekDays.filter(d => d !== weekDay)
      });
    };
    return JSX_("div", {
      className: "recurring-field-row"
    }, Object.values(this.WEEK_DAYS).map(({
      value,
      label
    }) => {
      const isCurrentlySelected = weekDays.includes(value);
      return JSX_(meetings_button.A, {
        key: value,
        className: `
                                mega-button
                                action
                                recurring-toggle-button
                                ${isCurrentlySelected ? 'active' : ''}
                                ${weekDays.length === 1 && isCurrentlySelected ? 'disabled' : ''}
                            `,
        onClick: this.props.isLoading ? null : () => {
          if (view === this.VIEWS.WEEKLY) {
            return handleWeeklySelection(value, isCurrentlySelected);
          }
          return handleDailySelection(value);
        }
      }, label);
    }));
  }
  renderIntervalControls() {
    const {
      view,
      interval
    } = this.state;
    return JSX_("div", {
      className: "recurring-field-row"
    }, (0,utils.lI)(mega.icu.format(view === this.VIEWS.MONTHLY ? l.recur_rate_monthly : l.recur_rate_weekly, interval > 0 ? interval : 1), "[S]", this.IntervalSelect));
  }
  renderEndControls() {
    const {
      isLoading,
      onMount
    } = this.props;
    const {
      end,
      prevEnd
    } = this.state;
    return JSX_("div", {
      className: "recurring-field-row"
    }, JSX_("div", {
      className: "recurring-title-heading"
    }, l.recurring_ends), JSX_("div", {
      className: "recurring-radio-buttons"
    }, JSX_("div", {
      className: "recurring-label-wrap"
    }, JSX_("div", {
      className: `
                                uiTheme
                                ${end ? 'radioOff' : 'radioOn'}
                            `
    }, JSX_("input", {
      type: "radio",
      name: `${Recurring.NAMESPACE}-radio-end`,
      disabled: isLoading,
      className: `
                                    uiTheme
                                    ${end ? 'radioOff' : 'radioOn'}
                                `,
      onChange: () => {
        this.setState(state => ({
          end: undefined,
          prevEnd: state.end || state.prevEnd
        }));
      }
    })), JSX_("div", {
      className: "radio-txt"
    }, JSX_("span", {
      className: "recurring-radio-label",
      onClick: () => isLoading ? null : this.setState(state => ({
        end: undefined,
        prevEnd: state.end || state.prevEnd
      }))
    }, l.recurring_never))), JSX_("div", {
      className: "recurring-label-wrap"
    }, JSX_("div", {
      className: `
                                uiTheme
                                ${end ? 'radioOn' : 'radioOff'}
                            `
    }, JSX_("input", {
      type: "radio",
      name: `${Recurring.NAMESPACE}-radio-end`,
      disabled: isLoading,
      className: `
                                    uiTheme
                                    ${end ? 'radioOn' : 'radioOff'}
                                `,
      onChange: () => isLoading ? null : this.setState({
        end: prevEnd || this.initialEnd
      })
    })), JSX_("div", {
      className: "radio-txt"
    }, JSX_("span", {
      className: "recurring-radio-label",
      onClick: () => isLoading || end ? null : this.setState({
        end: prevEnd || this.initialEnd
      })
    }, l.recurring_on), JSX_(datepicker.A, {
      name: `${Recurring.NAMESPACE}-endDateTime`,
      position: "top left",
      startDate: end || this.initialEnd,
      selectedDates: [new Date(end)],
      isLoading,
      value: end || prevEnd || '',
      placeholder: time2date(end || prevEnd || this.initialEnd / 1000, 18),
      onMount,
      onSelect: timestamp => this.setState({
        end: timestamp
      }, () => this.safeForceUpdate())
    })))));
  }
  renderDaily() {
    return JSX_("div", {
      className: `${Recurring.NAMESPACE}-daily`
    }, this.renderDayControls(), this.renderEndControls());
  }
  renderWeekly() {
    return JSX_("div", {
      className: `${Recurring.NAMESPACE}-weekly`
    }, this.renderIntervalControls(), this.renderDayControls(), this.renderEndControls());
  }
  renderMonthly() {
    const {
      isLoading
    } = this.props;
    const {
      monthRule,
      monthDays,
      monthDaysWarning,
      offset
    } = this.state;
    return JSX_("div", {
      className: `${Recurring.NAMESPACE}-monthly`
    }, this.renderIntervalControls(), JSX_("div", {
      className: "recurring-field-row"
    }, JSX_("div", {
      className: "recurring-radio-buttons",
      onClick: isLoading ? null : ev => {
        const {
          name,
          value
        } = ev.target;
        if (name === `${Recurring.NAMESPACE}-radio-monthRule`) {
          this.setState({
            monthRule: value
          });
        }
      }
    }, JSX_("div", {
      className: "recurring-label-wrap"
    }, JSX_("div", {
      className: `
                                    uiTheme
                                    ${monthRule === 'day' ? 'radioOn' : 'radioOff'}
                                `
    }, JSX_("input", {
      type: "radio",
      name: `${Recurring.NAMESPACE}-radio-monthRule`,
      value: "day",
      disabled: isLoading,
      className: `
                                        uiTheme
                                        ${monthRule === 'day' ? 'radioOn' : 'radioOff'}
                                    `
    })), JSX_("div", {
      className: "radio-txt"
    }, JSX_("span", {
      className: "recurring-radio-label",
      onClick: () => isLoading ? null : this.setState({
        monthRule: this.MONTH_RULES.DAY
      })
    }, l.recurring_frequency_day), JSX_("div", {
      className: "mega-input inline recurring-day"
    }, JSX_(schedule_select.A, {
      name: `${Recurring.NAMESPACE}-monthDay`,
      icon: true,
      value: monthDays[0],
      isLoading,
      options: [...Array(31).keys()].map(value => {
        value += 1;
        return {
          value,
          label: value
        };
      }),
      onSelect: ({
        value
      }) => {
        this.setState({
          monthRule: this.MONTH_RULES.DAY,
          monthDays: [value],
          monthDaysWarning: value > 28
        });
      }
    })))), monthDaysWarning && JSX_("div", {
      className: "recurring-label-wrap"
    }, JSX_("div", {
      className: "mega-banner body with-btn"
    }, JSX_("div", {
      className: "green-notification cell text-cell"
    }, JSX_("div", {
      className: "versioning-body-text"
    }, mega.icu.format(l.recurring_monthdays_warning, monthDays[0]))))), JSX_("div", {
      className: "recurring-label-wrap"
    }, JSX_("div", {
      className: `
                                    uiTheme
                                    ${monthRule === this.MONTH_RULES.OFFSET ? 'radioOn' : 'radioOff'}
                                `
    }, JSX_("input", {
      type: "radio",
      name: `${Recurring.NAMESPACE}-radio-monthRule`,
      value: "offset",
      disabled: isLoading,
      className: `
                                        uiTheme
                                        ${monthRule === this.MONTH_RULES.OFFSET ? 'radioOn' : 'radioOff'}
                                    `
    })), JSX_("div", {
      className: "radio-txt"
    }, JSX_(this.MonthDaySelect, {
      offset
    }))))), this.renderEndControls());
  }
  renderNavigation(view) {
    return JSX_(REaCt().Fragment, null, JSX_(meetings_button.A, {
      className: `
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.DAILY ? 'active' : ''}
                    `,
      onClick: () => this.toggleView(this.VIEWS.DAILY, this.FREQUENCIES.DAILY)
    }, l.recurring_daily), JSX_(meetings_button.A, {
      className: `
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.WEEKLY ? 'active' : ''}
                    `,
      onClick: () => this.toggleView(this.VIEWS.WEEKLY, this.FREQUENCIES.WEEKLY)
    }, l.recurring_weekly), JSX_(meetings_button.A, {
      className: `
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.MONTHLY ? 'active' : ''}
                    `,
      onClick: () => this.toggleView(this.VIEWS.MONTHLY, this.FREQUENCIES.MONTHLY)
    }, l.recurring_monthly));
  }
  renderContent(view) {
    switch (view) {
      case this.VIEWS.DAILY:
        return this.renderDaily();
      case this.VIEWS.WEEKLY:
        return this.renderWeekly();
      case this.VIEWS.MONTHLY:
        return this.renderMonthly();
    }
  }
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (this.state.view !== this.VIEWS.DAILY && nextState.view === this.VIEWS.DAILY) {
      nextState.weekDays = this.initialWeekDays;
    }
    if (nextState.weekDays.length === Object.keys(this.WEEK_DAYS).length && this.state.view !== this.VIEWS.WEEKLY && nextState.view === this.VIEWS.WEEKLY || !(0,helpers.ro)(nextProps.startDateTime, this.props.startDateTime) && this.state.view === this.VIEWS.WEEKLY) {
      const weekday = new Date(nextProps.startDateTime).getDay();
      nextState.weekDays = [weekday === 0 ? 7 : weekday];
    }
    if (!(0,helpers.ro)(nextProps.startDateTime, this.props.startDateTime) && this.state.view === this.VIEWS.MONTHLY) {
      let _Object$values$find2;
      const nextDate = new Date(nextProps.startDateTime);
      nextState.monthDays = [nextDate.getDate()];
      nextState.offset.weekDay = ((_Object$values$find2 = Object.values(this.WEEK_DAYS).find(d => d.value === nextDate.getDay())) == null ? void 0 : _Object$values$find2.value) || this.WEEK_DAYS.SUNDAY.value;
      nextState.monthDaysWarning = nextState.monthDays > 28;
    }
    if (nextState.view === this.VIEWS.MONTHLY && this.state.interval > 12) {
      nextState.interval = 12;
    }
    this.props.onUpdate(this.getFormattedState(nextState));
  }
  componentDidMount() {
    super.componentDidMount();
    this.props.onUpdate(this.getFormattedState(this.state));
  }
  render() {
    const {
      NAMESPACE
    } = Recurring;
    const {
      view
    } = this.state;
    return JSX_(schedule_utils.fI, null, JSX_(schedule_utils.VP, null), JSX_(schedule_utils.VP, null, JSX_("div", {
      ref: this.domRef,
      className: `
                            ${NAMESPACE}
                            ${this.props.isLoading ? 'disabled' : ''}
                        `
    }, JSX_("div", {
      className: `${NAMESPACE}-container`
    }, JSX_("div", {
      className: `${NAMESPACE}-navigation`
    }, this.renderNavigation(view)), JSX_("div", {
      className: `${NAMESPACE}-content`
    }, this.renderContent(view))))));
  }
}
Recurring.NAMESPACE = 'meetings-recurring';
;// ./js/chat/ui/meetings/schedule/schedule.jsx














class Schedule extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.scheduledMeetingRef = null;
    this.localStreamRef = '.float-video';
    this.datepickerRefs = [];
    this.incomingCallListener = 'onPrepareIncomingCallDialog.scheduleDialog';
    this.ringingStoppedListener = 'onRingingStopped.scheduleDialog';
    this.interval = ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    this.nearestHalfHour = (0,helpers.i_)();
    this.state = {
      topic: '',
      startDateTime: this.nearestHalfHour,
      endDateTime: this.nearestHalfHour + this.interval,
      timezone: (0,helpers.dB)(),
      recurring: false,
      participants: [],
      link: false,
      sendInvite: false,
      waitingRoom: false,
      openInvite: false,
      description: '',
      closeDialog: false,
      isEdit: false,
      isDirty: false,
      isLoading: false,
      topicInvalid: false,
      invalidTopicMsg: '',
      descriptionInvalid: false,
      overlayed: false
    };
    this.onTopicChange = value => {
      if (value.length > ChatRoom.TOPIC_MAX_LENGTH) {
        this.setState({
          invalidTopicMsg: l.err_schedule_title_long,
          topicInvalid: true
        });
        value = value.substring(0, ChatRoom.TOPIC_MAX_LENGTH);
      } else if (value.length === 0) {
        this.setState({
          invalidTopicMsg: l.schedule_title_missing,
          topicInvalid: true
        });
      } else if (this.state.invalidTopicMsg) {
        this.setState({
          invalidTopicMsg: '',
          topicInvalid: false
        });
      }
      this.handleChange('topic', value);
    };
    this.onTextareaChange = value => {
      if (value.length > 3000) {
        this.setState({
          descriptionInvalid: true
        });
        value = value.substring(0, 3000);
      } else if (this.state.descriptionInvalid) {
        this.setState({
          descriptionInvalid: false
        });
      }
      this.handleChange('description', value);
    };
    this.onStartDateSelect = () => {
      this.datepickerRefs.endDateTime.selectDate(new Date(this.state.startDateTime + this.interval));
    };
    this.onEndDateSelect = () => {
      const {
        startDateTime,
        endDateTime
      } = this.state;
      if (endDateTime < startDateTime) {
        if (endDateTime < Date.now()) {
          return this.setState({
            endDateTime: startDateTime + this.interval
          });
        }
        this.handleDateSelect({
          startDateTime: endDateTime - this.interval
        });
      }
    };
    this.handleToggle = prop => {
      return Object.keys(this.state).includes(prop) && this.setState(state => ({
        [prop]: !state[prop],
        isDirty: true
      }));
    };
    this.handleChange = (prop, value) => {
      return Object.keys(this.state).includes(prop) && this.setState({
        [prop]: value,
        isDirty: true
      });
    };
    this.handleDateSelect = ({
      startDateTime,
      endDateTime
    }, callback) => {
      this.setState(state => ({
        startDateTime: startDateTime || state.startDateTime,
        endDateTime: endDateTime || state.endDateTime,
        isDirty: true
      }), () => {
        const {
          recurring
        } = this.state;
        if (recurring && recurring.end) {
          const recurringEnd = (0,helpers.PS)(this.state.startDateTime, 6);
          this.datepickerRefs.recurringEnd.selectDate(new Date(recurringEnd));
        }
        if (callback) {
          callback();
        }
      });
    };
    this.handleTimeSelect = ({
      startDateTime,
      endDateTime
    }) => {
      startDateTime = startDateTime || this.state.startDateTime;
      endDateTime = endDateTime || this.state.endDateTime;
      this.setState(state => {
        return {
          startDateTime: endDateTime <= state.startDateTime ? endDateTime - this.interval : startDateTime,
          endDateTime: startDateTime >= state.endDateTime ? startDateTime + this.interval : endDateTime,
          isDirty: true
        };
      });
    };
    this.handleParticipantSelect = participants => {
      return participants && Array.isArray(participants) && this.setState({
        participants,
        isDirty: true
      }, () => {
        const domRef = this.domRef && this.domRef.current;
        if (domRef) {
          domRef.reinitialise();
        }
      });
    };
    this.handleSubmit = () => {
      if (this.state.topic) {
        return this.setState({
          isLoading: true
        }, async () => {
          const {
            chatRoom,
            onClose
          } = this.props;
          const params = [this.state, chatRoom];
          if (chatRoom) {
            delay('chat-event-sm-edit-meeting', () => eventlog(99923));
          } else {
            delay('chat-event-sm-button-create', () => eventlog(99922));
          }
          delay('chat-events-sm-settings', () => this.submitStateEvents({
            ...this.state
          }));
          await megaChat.plugins.meetingsManager[chatRoom ? 'updateMeeting' : 'createMeeting'](...params);
          this.setState({
            isLoading: false
          }, () => {
            onClose();
            megaChat.trigger(conversations.qY.NAV_RENDER_VIEW, conversations.Vw.MEETINGS);
          });
        });
      }
      return this.setState({
        topicInvalid: true,
        invalidTopicMsg: l.schedule_title_missing
      });
    };
  }
  syncPublicLink() {
    if (this.state.isEdit) {
      const {
        chatRoom
      } = this.props;
      chatRoom.updatePublicHandle().then(() => this.isMounted() && this.setState({
        link: !!chatRoom.publicLink
      })).catch(dump);
    }
  }
  getFilteredTimeIntervals(timestamp, offsetFrom) {
    const timeIntervals = (0,helpers.a4)(timestamp, offsetFrom);
    const {
      end
    } = this.scheduledMeetingRef || {};
    if (this.state.isEdit && end < Date.now()) {
      return timeIntervals;
    }
    return timeIntervals.filter(o => {
      return offsetFrom ? o.value > this.nearestHalfHour : o.value > Date.now();
    });
  }
  submitStateEvents(state) {
    if (state.link) {
      eventlog(500162);
    }
    if (state.sendInvite) {
      eventlog(500163);
    }
    if (state.waitingRoom) {
      eventlog(500164);
    }
    if (state.openInvite) {
      eventlog(500165);
    }
    if (state.description) {
      eventlog(500166);
    }
    if (state.recurring) {
      eventlog(500167);
    } else {
      eventlog(500168);
    }
    eventlog(500169, state.topic.length);
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if ($.dialog === schedule_utils.oK) {
      closeDialog();
    }
    [document, this.localStreamRef].map(el => $(el).unbind(`.${schedule_utils.CU}`));
    megaChat.off(this.incomingCallListener);
  }
  UNSAFE_componentWillMount() {
    const {
      chatRoom
    } = this.props;
    if (chatRoom) {
      const {
        scheduledMeeting,
        publicLink,
        options
      } = chatRoom;
      this.state.topic = scheduledMeeting.title;
      this.state.startDateTime = scheduledMeeting.start;
      this.state.endDateTime = scheduledMeeting.end;
      this.state.timezone = scheduledMeeting.timezone || (0,helpers.dB)();
      this.state.recurring = scheduledMeeting.recurring;
      this.state.participants = chatRoom.getParticipantsExceptMe();
      this.state.link = !!publicLink;
      this.state.description = scheduledMeeting.description || '';
      this.state.sendInvite = scheduledMeeting.flags;
      this.state.waitingRoom = options[chat_chatRoom.U_.WAITING_ROOM];
      this.state.openInvite = options[chat_chatRoom.U_.OPEN_INVITE];
      this.state.isEdit = true;
      this.scheduledMeetingRef = scheduledMeeting;
    }
  }
  componentDidMount() {
    super.componentDidMount();
    this.syncPublicLink();
    if ($.dialog === 'onboardingDialog') {
      closeDialog();
    }
    M.safeShowDialog(schedule_utils.oK, () => {
      if (!this.isMounted()) {
        throw new Error(`${schedule_utils.oK} dialog: component ${schedule_utils.CU} not mounted.`);
      }
      $(document).rebind(`keyup.${schedule_utils.CU}`, ({
        keyCode,
        target
      }) => {
        return this.state.closeDialog || target instanceof HTMLTextAreaElement ? null : keyCode === 13 && this.handleSubmit();
      });
      $(this.localStreamRef).rebind(`click.${schedule_utils.CU}`, () => {
        if (this.state.isDirty) {
          this.handleToggle('closeDialog');
          return false;
        }
      });
      megaChat.rebind(this.incomingCallListener, () => {
        if (this.isMounted()) {
          this.setState({
            overlayed: true,
            closeDialog: false
          });
          megaChat.plugins.callManager2.rebind(this.ringingStoppedListener, () => {
            megaChat.plugins.callManager2.off(this.ringingStoppedListener);
            this.setState({
              overlayed: false
            });
            fm_showoverlay();
          });
        }
      });
      return $(`#${schedule_utils.CU}`);
    });
  }
  componentDidUpdate(prevProps) {
    if (prevProps.callExpanded && !this.props.callExpanded) {
      if (!$.dialog) {
        M.safeShowDialog(schedule_utils.oK, `#${schedule_utils.CU}`);
      }
      fm_showoverlay();
      this.setState({
        closeDialog: false
      });
    }
    if (!prevProps.callExpanded && this.props.callExpanded) {
      this.setState({
        closeDialog: false
      });
    }
  }
  render() {
    let _this$props$chatRoom;
    const {
      topic,
      startDateTime,
      endDateTime,
      recurring,
      participants,
      link,
      sendInvite,
      waitingRoom,
      openInvite,
      description,
      closeDialog,
      isEdit,
      isDirty,
      isLoading,
      topicInvalid,
      invalidTopicMsg,
      descriptionInvalid,
      overlayed
    } = this.state;
    return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
      id: schedule_utils.CU,
      className: `
                    ${closeDialog ? 'with-confirmation-dialog' : ''}
                    ${this.props.callExpanded || overlayed ? 'hidden' : ''}
                `,
      dialogName: schedule_utils.oK,
      dialogType: "main",
      onClose: () => isDirty ? this.handleToggle('closeDialog') : this.props.onClose()
    }), JSX_(Header, {
      chatRoom: isEdit && this.props.chatRoom
    }), JSX_(perfectScrollbar.O, {
      ref: this.domRef,
      className: "fm-dialog-body",
      options: {
        suppressScrollX: true
      }
    }, JSX_(schedule_utils.pd, {
      name: "topic",
      placeholder: l.schedule_title_input,
      value: topic,
      invalid: topicInvalid,
      invalidMessage: invalidTopicMsg,
      autoFocus: true,
      isLoading,
      onFocus: () => topicInvalid && this.setState({
        topicInvalid: false
      }),
      onChange: this.onTopicChange
    }), JSX_(schedule_utils.fI, {
      className: `unencrypted-warning-row ${topicInvalid ? 'with-topic-err' : ''}`
    }, JSX_(schedule_utils.VP, null), JSX_(schedule_utils.VP, null, JSX_("div", {
      className: "unencrypted-warning"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-info"
    }), JSX_("span", null, l.schedule_encryption_note)))), JSX_(schedule_utils.fI, {
      className: "start-aligned"
    }, JSX_(schedule_utils.VP, null, JSX_("i", {
      className: "sprite-fm-mono icon-recents-filled"
    })), JSX_("div", {
      className: "schedule-date-container"
    }, JSX_(datetime.c, {
      name: "startDateTime",
      altField: "startTime",
      datepickerRef: this.datepickerRefs.startDateTime,
      startDate: startDateTime,
      value: startDateTime,
      filteredTimeIntervals: this.getFilteredTimeIntervals(startDateTime),
      label: l.schedule_start_date,
      isLoading,
      onMount: datepicker => {
        this.datepickerRefs.startDateTime = datepicker;
      },
      onSelectDate: startDateTime => {
        this.handleDateSelect({
          startDateTime
        }, this.onStartDateSelect);
      },
      onSelectTime: ({
        value: startDateTime
      }) => this.handleTimeSelect({
        startDateTime
      }),
      onChange: value => this.handleChange('startDateTime', value),
      onBlur: timestamp => {
        if (timestamp) {
          const startDateTime = timestamp < Date.now() ? this.nearestHalfHour : timestamp;
          this.handleDateSelect({
            startDateTime
          }, this.onStartDateSelect);
        }
      }
    }), JSX_(datetime.c, {
      name: "endDateTime",
      altField: "endTime",
      datepickerRef: this.datepickerRefs.endDateTime,
      isLoading,
      startDate: endDateTime,
      value: endDateTime,
      filteredTimeIntervals: this.getFilteredTimeIntervals(endDateTime, startDateTime),
      label: l.schedule_end_date,
      onMount: datepicker => {
        this.datepickerRefs.endDateTime = datepicker;
      },
      onSelectDate: endDateTime => {
        this.handleDateSelect({
          endDateTime
        }, this.onEndDateSelect);
      },
      onSelectTime: ({
        value: endDateTime
      }) => this.handleTimeSelect({
        endDateTime
      }),
      onChange: value => this.handleChange('endDateTime', value),
      onBlur: timestamp => {
        this.handleDateSelect({
          endDateTime: timestamp
        }, this.onEndDateSelect);
      }
    }))), !u_attr.p && endDateTime - startDateTime > 36e5 && JSX_(schedule_utils.dh, {
      onUpgradeClicked: () => {
        this.props.onClose();
        loadSubPage('pro');
        eventlog(500258);
      }
    }), JSX_(schedule_utils.Sc, {
      name: "recurring",
      checked: recurring,
      label: l.schedule_recurring_label,
      isLoading,
      onToggle: prop => {
        this.handleToggle(prop);
        delay('chat-event-sm-recurring', () => eventlog(99919));
      }
    }), recurring && JSX_(Recurring, {
      chatRoom: this.props.chatRoom,
      startDateTime,
      endDateTime,
      isLoading,
      onMount: datepicker => {
        this.datepickerRefs.recurringEnd = datepicker;
      },
      onUpdate: state => {
        this.setState({
          recurring: state
        });
      }
    }), JSX_(schedule_utils.fI, null, JSX_(schedule_utils.VP, null, JSX_("i", {
      className: "sprite-fm-mono icon-contacts"
    })), JSX_(schedule_utils.VP, null, JSX_(Invite, {
      className: isLoading ? 'disabled' : '',
      isLoading,
      participants,
      onSelect: this.handleParticipantSelect
    }))), JSX_(schedule_utils.dO, {
      name: "link",
      toggled: link,
      label: l.schedule_link_label,
      isLoading,
      subLabel: l.schedule_link_info,
      onToggle: prop => {
        this.handleToggle(prop);
        delay('chat-event-sm-meeting-link', () => eventlog(99920));
      }
    }), JSX_(schedule_utils.Sc, {
      name: "sendInvite",
      checked: sendInvite,
      label: l.schedule_invite_label,
      isLoading,
      onToggle: prop => {
        this.handleToggle(prop);
        delay('chat-event-sm-calendar-invite', () => eventlog(99921));
      }
    }), JSX_(schedule_utils.Sc, {
      name: "waitingRoom",
      className: (_this$props$chatRoom = this.props.chatRoom) != null && _this$props$chatRoom.havePendingCall() ? 'disabled' : '',
      checked: waitingRoom,
      label: l.waiting_room,
      subLabel: l.waiting_room_info,
      isLoading,
      onToggle: waitingRoom => {
        let _this$props$chatRoom2;
        if ((_this$props$chatRoom2 = this.props.chatRoom) != null && _this$props$chatRoom2.havePendingCall()) {
          return;
        }
        this.handleToggle(waitingRoom);
        delay('chat-event-sm-waiting-room', () => eventlog(500297));
      }
    }), JSX_(schedule_utils.Sc, {
      name: "openInvite",
      checked: openInvite,
      label: l.open_invite_desc,
      isLoading,
      onToggle: ev => {
        this.handleToggle(ev);
        delay('chat-event-sm-open-invite', () => eventlog(500298));
      }
    }), waitingRoom && openInvite ? JSX_(schedule_utils.fI, null, JSX_("div", {
      className: "schedule-dialog-banner warn"
    }, JSX_(utils.P9, null, l.waiting_room_invite.replace('[A]', `<a
                                                href="${l.mega_help_host}/wp-admin/post.php?post=3005&action=edit"
                                                target="_blank"
                                                class="clickurl">
                                            `).replace('[/A]', '</a>')))) : null, JSX_(schedule_utils.TM, {
      name: "description",
      isLoading,
      invalid: descriptionInvalid,
      placeholder: l.schedule_description_input,
      value: description,
      onFocus: () => descriptionInvalid && this.setState({
        descriptionInvalid: false
      }),
      onChange: this.onTextareaChange
    })), JSX_(Footer, {
      isLoading,
      isEdit,
      topic,
      onSubmit: this.handleSubmit
    }), !(overlayed || this.props.callExpanded) && closeDialog && JSX_(schedule_utils.pD, {
      onToggle: this.handleToggle,
      onClose: this.props.onClose
    }));
  }
}
const Header = ({
  chatRoom
}) => {
  const $$container = title => JSX_("header", null, JSX_("h2", null, title));
  if (chatRoom) {
    const {
      scheduledMeeting
    } = chatRoom;
    return $$container(scheduledMeeting.isRecurring ? l.edit_meeting_series_title : l.edit_meeting_title);
  }
  return $$container(l.schedule_meeting_title);
};
const Footer = ({
  isLoading,
  isEdit,
  topic,
  onSubmit
}) => {
  return JSX_("footer", null, JSX_("div", {
    className: "footer-container"
  }, JSX_(meetings_button.A, {
    className: `
                        mega-button
                        positive
                        ${isLoading ? 'disabled' : ''}
                    `,
    onClick: () => isLoading ? null : onSubmit(),
    topic
  }, JSX_("span", null, isEdit ? l.update_meeting_button : l.schedule_meeting_button))));
};

 },

 8894
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   V: () =>  withDateObserver
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);


const withDateObserver = Component => class extends react1___default().Component {
  constructor(...args) {
    super(...args);
    this.listener = undefined;
    this.state = {
      timestamp: undefined
    };
  }
  componentWillUnmount() {
    mBroadcaster.removeListener(this.listener);
  }
  componentDidMount() {
    this.listener = mBroadcaster.addListener(withDateObserver.NAMESPACE, timestamp => this.setState({
      timestamp
    }));
  }
  render() {
    return JSX_(Component, (0,_babel_runtime_helpers_extends0__ .A)({}, this.props, {
      timestamp: this.state.timestamp
    }));
  }
};
withDateObserver.NAMESPACE = 'meetings:onSelectDate';

 },

 9290
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   A: () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _dateObserver2__ = REQ_(8894);



class Datepicker extends react0___default().Component {
  constructor(props) {
    super(props);
    this.OPTIONS = {
      classes: 'meetings-datepicker-calendar',
      dateFormat: '@',
      minDate: null,
      startDate: null,
      selectedDates: [],
      prevHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
      nextHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
      altField: null,
      firstDay: 0,
      autoClose: true,
      toggleSelected: false,
      position: 'bottom left',
      language: {
        daysMin: [l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]],
        months: [l[408], l[409], l[410], l[411], l[412], l[413], l[414], l[415], l[416], l[417], l[418], l[419]],
        monthsShort: [l[24035], l[24037], l[24036], l[24038], l[24047], l[24039], l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]]
      },
      onSelect: dateText => {
        const prevDate = new Date(+this.props.value);
        const nextDate = new Date(+dateText);
        nextDate.setHours(prevDate.getHours(), prevDate.getMinutes());
        this.props.onSelect(nextDate.getTime());
        mBroadcaster.sendMessage(_dateObserver2__ .V.NAMESPACE, nextDate.getTime());
      }
    };
    this.domRef = react0___default().createRef();
    this.inputRef = react0___default().createRef();
    this.datepicker = null;
    this.formatValue = value => {
      if (typeof value === 'number') {
        return time2date(value / 1000, 18);
      }
      return value;
    };
    this.OPTIONS.startDate = new Date(this.props.startDate);
    this.OPTIONS.selectedDates = this.props.selectedDates || [this.OPTIONS.startDate];
    this.OPTIONS.minDate = this.props.minDate ? new Date(this.props.minDate) : new Date();
    this.OPTIONS.position = this.props.position || this.OPTIONS.position;
    this.OPTIONS.altField = `input.${this.props.altField}`;
  }
  initialize() {
    const inputRef = this.inputRef && this.inputRef.current;
    if (inputRef) {
      let _this$props$onMount, _this$props;
      $(inputRef).datepicker(this.OPTIONS);
      this.datepicker = $(inputRef).data('datepicker');
      (_this$props$onMount = (_this$props = this.props).onMount) == null || _this$props$onMount.call(_this$props, this.datepicker);
    }
  }
  componentWillUnmount() {
    if (this.domRef && this.domRef.current) {
      $(this.domRef.current).unbind(`keyup.${Datepicker.NAMESPACE}`);
    }
  }
  componentDidMount() {
    M.require('datepicker_js').done(() => this.initialize());
    if (this.domRef && this.domRef.current) {
      $(this.domRef.current).rebind(`keyup.${Datepicker.NAMESPACE}`, ({
        keyCode
      }) => {
        if (keyCode === 13) {
          this.datepicker.hide();
          return false;
        }
      });
    }
  }
  render() {
    const {
      NAMESPACE
    } = Datepicker;
    const {
      value,
      name,
      className,
      placeholder,
      isLoading,
      onFocus,
      onChange,
      onBlur
    } = this.props;
    const formattedValue = this.formatValue(value);
    return JSX_("div", {
      ref: this.domRef,
      className: NAMESPACE
    }, JSX_("div", {
      className: "mega-input datepicker-input"
    }, JSX_("input", {
      ref: this.inputRef,
      type: "text",
      name,
      className: `
                            dialog-input
                            ${className || ''}
                        `,
      autoComplete: "off",
      disabled: isLoading,
      placeholder: placeholder || '',
      value: formattedValue,
      onFocus: ev => onFocus == null ? void 0 : onFocus(ev),
      onChange: ev => onChange == null ? void 0 : onChange(ev),
      onBlur: ev => onBlur == null ? void 0 : onBlur(ev)
    }), JSX_("i", {
      className: "sprite-fm-mono icon-calendar1",
      onClick: isLoading ? null : () => {
        if (this.datepicker) {
          let _this$inputRef$curren;
          this.datepicker.show();
          (_this$inputRef$curren = this.inputRef.current) == null || _this$inputRef$curren.focus();
        }
      }
    })));
  }
}
Datepicker.NAMESPACE = 'meetings-datepicker';
 const __WEBPACK_DEFAULT_EXPORT__ = (0,_mixins_js1__ .Zz)(_dateObserver2__ .V)(Datepicker);

 },

 9811
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   c: () =>  DateTime
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _helpers_jsx1__ = REQ_(6521);
 const _datepicker_jsx2__ = REQ_(9290);
 const _select_jsx3__ = REQ_(3448);




class DateTime extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.state = {
      datepickerRef: undefined,
      manualDateInput: '',
      manualTimeInput: '',
      initialDate: ''
    };
    this.handleChange = ev => {
      const {
        onChange
      } = this.props;
      const {
        datepickerRef,
        initialDate
      } = this.state;
      if (!datepickerRef) {
        return;
      }
      const {
        value
      } = ev.target;
      const date = (0,_helpers_jsx1__ .XH)(value);
      const timestamp = date.valueOf();
      const dateObj = new Date(timestamp);
      dateObj.setHours(initialDate.getHours(), initialDate.getMinutes());
      datepickerRef.selectedDates = [dateObj];
      datepickerRef.currentDate = dateObj;
      datepickerRef.nav._render();
      datepickerRef.views.days._render();
      onChange == null || onChange(value);
      this.setState({
        manualDateInput: dateObj.getTime()
      });
    };
  }
  render() {
    const {
      name,
      startDate,
      altField,
      value,
      minDate,
      filteredTimeIntervals,
      label,
      isLoading,
      onMount,
      onSelectDate,
      onSelectTime,
      onBlur
    } = this.props;
    return JSX_(react0___default().Fragment, null, label && JSX_("span", null, label), JSX_(_datepicker_jsx2__ .A, {
      name: `${_datepicker_jsx2__ .A.NAMESPACE}-${name}`,
      className: isLoading ? 'disabled' : '',
      isLoading,
      startDate,
      altField: `${_select_jsx3__ .A.NAMESPACE}-${altField}`,
      value,
      minDate,
      onMount: datepickerRef => this.setState({
        datepickerRef
      }, () => onMount(datepickerRef)),
      onSelect: onSelectDate,
      onFocus: ({
        target
      }) => {
        this.setState({
          manualDateInput: undefined,
          manualTimeInput: undefined,
          initialDate: new Date(value)
        }, () => target.select());
      },
      onChange: this.handleChange,
      onBlur: () => onBlur(this.state.manualDateInput)
    }), JSX_(_select_jsx3__ .A, {
      name: `${_select_jsx3__ .A.NAMESPACE}-${altField}`,
      className: isLoading ? 'disabled' : '',
      isLoading,
      typeable: true,
      options: filteredTimeIntervals,
      value: (() => typeof value === 'number' ? value : this.state.datepickerRef.currentDate.getTime())(),
      format: toLocaleTime,
      onSelect: onSelectTime,
      onChange: () => false,
      onBlur: timestamp => {
        if (timestamp) {
          onSelectTime({
            value: timestamp
          });
        }
      }
    }));
  }
}

 }

}]);