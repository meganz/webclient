/** @file automatically generated, do not edit it. */
 (() => { // webpackBootstrap
    window.JSX_=React.createElement;
 	const __webpack_modules__ = {

 187
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   d: () =>  getMessageString
 });
let getMessageString;
(function () {
  let MESSAGE_STRINGS;
  let MESSAGE_STRINGS_GROUP;
  let MESSAGE_STRINGS_MEETING;
  const _sanitizeStrings = function (arg) {
    if (typeof arg === "undefined") {
      return arg;
    } else if (typeof arg === "string") {
      return escapeHTML(arg);
    } else if (arg.forEach) {
      arg.forEach((v, k) => {
        arg[k] = _sanitizeStrings(v);
      });
    } else if (typeof arg === "object") {
      Object.keys(arg).forEach((k) => {
        arg[k] = _sanitizeStrings(arg[k]);
      });
    }
    return arg;
  };
  getMessageString = function (type, isGroupCall, isMeeting) {
    if (!MESSAGE_STRINGS) {
      MESSAGE_STRINGS = {
        'outgoing-call': l[5891].replace("[X]", "[[[X]]]"),
        'incoming-call': l[19964] || "[[%s]] is calling...",
        'call-timeout': [l[18698].replace("[X]", "[[[X]]]")],
        'call-starting': l[7206].replace("[X]", "[[[X]]]"),
        'call-feedback': l[7998].replace("[X]", "[[[X]]]"),
        'call-initialising': l[7207].replace("[X]", "[[[X]]]"),
        'call-ended': [l[19965] || "Call ended.", l[7208]],
        'remoteCallEnded': [l[19965] || "Call ended.", l[7208]],
        'call-failed-media': l[7204],
        'call-failed': [l[19966] || "Call failed.", l[7208]],
        'call-handled-elsewhere': l[5895].replace("[X]", "[[[X]]]"),
        'call-missed': l[17870],
        'call-rejected': l[19040],
        'call-canceled': l[19041],
        'remoteCallStarted': l[5888],
        'call-started': l[5888].replace("[X]", "[[[X]]]"),
        'alterParticipants': undefined,
        'privilegeChange': undefined,
        'truncated': l[8905]
      };
      _sanitizeStrings(MESSAGE_STRINGS);
    }
    if (isGroupCall && !MESSAGE_STRINGS_GROUP) {
      MESSAGE_STRINGS_GROUP = {
        'call-ended': [l[19967], l[7208]],
        'remoteCallEnded': [l[19967], l[7208]],
        'call-handled-elsewhere': l[19968],
        'call-canceled': l[19969],
        'call-started': l[19970]
      };
      _sanitizeStrings(MESSAGE_STRINGS_GROUP);
    }
    if (isMeeting && !MESSAGE_STRINGS_MEETING) {
      MESSAGE_STRINGS_MEETING = {
        'call-ended': [l.meeting_mgmt_call_ended, l[7208]],
        'remoteCallEnded': [l.meeting_mgmt_call_ended, l[7208]],
        'call-started': l.meeting_mgmt_call_started
      };
    }
    if (isMeeting && MESSAGE_STRINGS_MEETING[type]) {
      return MESSAGE_STRINGS_MEETING[type];
    }
    if (isGroupCall && MESSAGE_STRINGS_GROUP[type]) {
      return MESSAGE_STRINGS_GROUP[type];
    }
    return MESSAGE_STRINGS[type];
  };
})();


 },

 793
(__webpack_module__, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  _applyDecoratedDescriptor
 });
function _applyDecoratedDescriptor(i, e, r, n, l) {
  let a = {};
  return Object.keys(n).forEach((i) => {
    a[i] = n[i];
  }), a.enumerable = !!a.enumerable, a.configurable = !!a.configurable, ("value" in a || a.initializer) && (a.writable = !0), a = r.slice().reverse().reduce((r, n) => {
    return n(i, e, r) || r;
  }, a), l && void 0 !== a.initializer && (a.value = a.initializer ? a.initializer.call(l) : void 0, a.initializer = void 0), void 0 === a.initializer ? (Object.defineProperty(i, e, a), null) : a;
}


 },

 836
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   SN: () =>  hasContacts,
   U_: () =>  resetCredentials,
   X7: () =>  hasRelationship,
   d_: () =>  LABEL,
   gR: () =>  VIEW,
   p4: () =>  isVerified,
   qH: () =>  verifyCredentials,
   qY: () =>  EVENTS,
   ym: () =>  getUserFingerprint
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);

const EVENTS = {
  KEYDOWN: 'keydown'
};
const VIEW = {
  CONTACTS: 0x00,
  RECEIVED_REQUESTS: 0x01,
  SENT_REQUESTS: 0x02,
  PROFILE: 0x03
};
const LABEL = {
  CONTACTS: l[165],
  RECEIVED_REQUESTS: l[5863],
  SENT_REQUESTS: l[5862]
};
const hasContacts = () => M.u.some(contact => contact.c === 1);
const hasRelationship = contact => contact && contact.c === 1;
const isVerified = contact => {
  if (contact && contact.u) {
    const {
      u: handle
    } = contact;
    const verificationState = u_authring.Ed25519[handle] || {};
    return verificationState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON;
  }
  return null;
};
const verifyCredentials = contact => {
  if (contact.c === 1 && u_authring && u_authring.Ed25519) {
    const verifyState = u_authring.Ed25519[contact.u] || {};
    if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
      fingerprintDialog(contact.u);
    }
  }
};
const resetCredentials = contact => {
  if (M.isInvalidUserStatus()) {
    return;
  }
  authring.resetFingerprintsForUser(contact.u).then(() => contact.trackDataChange()).catch(dump);
};
const getUserFingerprint = handle => {
  const $$FINGERPRINT = [];
  userFingerprint(handle, fingerprints => {
    for (let i = 0; i < fingerprints.length; i++) {
      $$FINGERPRINT.push(JSX_("span", {
        key: i
      }, fingerprints[i]));
    }
  });
  return $$FINGERPRINT;
};

 },

 855
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   M: () =>  ConversationMessageMixin
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins_js1__ = REQ_(8264);
 const _ui_buttons_jsx2__ = REQ_(5155);
 const _ui_emojiDropdown_jsx3__ = REQ_(1165);




class ConversationMessageMixin extends _mixins_js1__ .u9 {
  constructor(props) {
    super(props);
    this.attachRerenderCallbacks = false;
    this._reactionContactHandles = [];
    this.__cmmUpdateTickCount = 0;
    this._contactChangeListeners = false;
    this.onAfterRenderWasTriggered = false;
    lazy(this, '__cmmId', () => {
      return `${this.getUniqueId()  }--${  String(Math.random()).slice(-7)}`;
    });
    this._emojiOnActiveStateChange = this._emojiOnActiveStateChange.bind(this);
    this.emojiSelected = this.emojiSelected.bind(this);
    const {
      message: msg
    } = this.props;
    if (msg instanceof Message && msg._reactions && msg.messageId.length === 11 && msg.isSentOrReceived() && !Object.hasOwnProperty.call(msg, 'reacts')) {
      msg.reacts.forceLoad().then(() => {
        this.addContactListenerIfMissing(this._reactionContacts());
      }).catch(dump.bind(null, `reactions.load.${msg.messageId}`));
    }
  }
  UNSAFE_componentWillMount() {
    if (super.UNSAFE_componentWillMount) {
      super.UNSAFE_componentWillMount();
    }
    const {chatRoom} = this.props;
    if (chatRoom) {
      chatRoom.rebind(`onChatShown.${  this.__cmmId}`, () => {
        if (!this._contactChangeListeners) {
          this.addContactListeners();
        }
      }).rebind(`onChatHidden.${  this.__cmmId}`, () => {
        if (this._contactChangeListeners) {
          this.removeContactListeners();
        }
      });
    }
    this.addContactListeners();
  }
  haveMeetingsCall() {
    return document.querySelector('.meetings-call') && document.querySelector('.chat-opened');
  }
  removeContactListeners() {
    const users = this._contactChangeListeners;
    if (d > 3) {
      console.warn('%s.removeContactListeners', this.getReactId(), [this], users);
    }
    for (let i = users.length; i--;) {
      users[i].removeEventHandler(this);
    }
    this._contactChangeListeners = false;
  }
  _reactionContacts() {
    const {
      message
    } = this.props;
    const {
      reacts
    } = message;
    const handles = [];
    const reactions = Object.values(reacts.reactions);
    for (let i = 0; i < reactions.length; i++) {
      handles.push(...Object.keys(reactions[i]));
    }
    this._reactionContactHandles = array.unique(handles);
    return this._reactionContactHandles;
  }
  addContactListeners() {
    const users = this._contactChangeListeners || [];
    const addUser = user => {
      if (user instanceof MegaDataMap && users.indexOf(user) < 0) {
        users.push(user);
      }
    };
    addUser(this.getContact());
    if (this.haveMoreContactListeners) {
      const moreIds = this.haveMoreContactListeners();
      if (moreIds) {
        for (let i = moreIds.length; i--;) {
          const handle = moreIds[i];
          addUser(handle in M.u && M.u[handle]);
        }
      }
    }
    for (let i = this._reactionContactHandles.length; i--;) {
      addUser(this._reactionContactHandles[i] in M.u && M.u[this._reactionContactHandles[i]]);
    }
    if (d > 3) {
      console.warn('%s.addContactListeners', this.getReactId(), [this], users);
    }
    for (let i = users.length; i--;) {
      users[i].addChangeListener(this);
    }
    this._contactChangeListeners = users;
  }
  addContactListenerIfMissing(contacts) {
    if (!this._contactChangeListeners) {
      return false;
    }
    if (!Array.isArray(contacts)) {
      contacts = [contacts];
    }
    const added = [];
    for (let i = 0; i < contacts.length; i++) {
      const user = M.u[contacts[i]];
      if (user && !this._contactChangeListeners.includes(user)) {
        this._contactChangeListeners.push(user);
        user.addChangeListener(this);
        added.push(user.h);
      }
    }
    if (d > 1) {
      console.warn('%s.addContactListenerIfMissing', this.getReactId(), [this], added);
    }
  }
  eventuallyUpdate() {
    super.eventuallyUpdate();
    this.__cmmUpdateTickCount = -2;
  }
  handleChangeEvent(x, z, k) {
    if (k === 'ts' || k === 'ats') {
      return;
    }
    if (this.isComponentEventuallyVisible()) {
      if (++this.__cmmUpdateTickCount > 5) {
        this.eventuallyUpdate();
        delay.cancel(this.__cmmId);
      } else {
        delay(this.__cmmId, () => this.eventuallyUpdate(), 90);
      }
    } else {
      this._requiresUpdateOnResize = true;
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const {chatRoom} = this.props;
    if (chatRoom) {
      chatRoom.off(`onChatShown.${  this.__cmmId}`).off(`onChatHidden.${  this.__cmmId}`);
    }
    if (this._contactChangeListeners) {
      this.removeContactListeners();
    }
  }
  getContact() {
    if (this.props.contact) {
      return this.props.contact;
    }
    const {message} = this.props;
    return Message.getContactForMessage(message);
  }
  getTimestampAsString() {
    return toLocaleTime(this.getTimestamp());
  }
  getTimestamp(forUpdated) {
    const {
      message
    } = this.props;
    const timestamp = (message.getDelay == null ? void 0 : message.getDelay()) || message.delay || unixtime();
    return forUpdated && message.updated > 0 ? timestamp + message.updated : timestamp;
  }
  componentDidUpdate() {
    const self = this;
    const {chatRoom} = self.props.message;
    if (!self.onAfterRenderWasTriggered) {
      const msg = self.props.message;
      let shouldRender = true;
      if (msg.isManagement && msg.isManagement() === true && msg.isRenderableManagement() === false) {
        shouldRender = false;
      }
      if (shouldRender) {
        chatRoom.trigger("onAfterRenderMessage", self.props.message);
        self.onAfterRenderWasTriggered = true;
      }
    }
  }
  getCurrentUserReactions() {
    const {
      reactions
    } = this.props.message.reacts;
    return Object.keys(reactions).filter(utf => {
      let _reactions$utf;
      return (_reactions$utf = reactions[utf]) == null ? void 0 : _reactions$utf[u_handle];
    });
  }
  emojiSelected(e, slug, meta) {
    const {
      chatRoom,
      message,
      onEmojiBarChange
    } = this.props;
    if (chatRoom.isReadOnly()) {
      return false;
    }
    const {
      reactions
    } = this.props.message.reacts;
    const CURRENT_USER_REACTIONS = this.getCurrentUserReactions().length;
    const REACTIONS_LIMIT = {
      TOTAL: 50,
      PER_PERSON: 24
    };
    const addReaction = () => chatRoom.messagesBuff.userAddReaction(message.messageId, slug, meta);
    const emoji = megaChat._emojiData.emojisSlug[slug] || meta;
    if (emoji && message.reacts.getReaction(u_handle, emoji.u)) {
      if (onEmojiBarChange && Object.keys(reactions).length === 1 && Object.keys(reactions[emoji.u]).length === 1) {
        onEmojiBarChange(false);
      }
      return chatRoom.messagesBuff.userDelReaction(message.messageId, slug, meta);
    }
    if (emoji && reactions[emoji.u] && CURRENT_USER_REACTIONS < REACTIONS_LIMIT.PER_PERSON) {
      return addReaction();
    }
    if (CURRENT_USER_REACTIONS >= REACTIONS_LIMIT.PER_PERSON) {
      return msgDialog('info', '', l[24205].replace('%1', REACTIONS_LIMIT.PER_PERSON));
    }
    if (Object.keys(reactions).length >= REACTIONS_LIMIT.TOTAL) {
      return msgDialog('info', '', l[24206].replace('%1', REACTIONS_LIMIT.TOTAL));
    } else if (onEmojiBarChange && Object.keys(reactions).length === 0) {
      onEmojiBarChange(true);
    }
    return addReaction();
  }
  _emojiOnActiveStateChange(newVal) {
    this.setState(() => {
      return {
        reactionsDropdownActive: newVal
      };
    });
  }
  getEmojisImages() {
    const {
      chatRoom,
      message
    } = this.props;
    const isReadOnlyClass = chatRoom.isReadOnly() ? " disabled" : "";
    let emojisImages = message._reactions && message.reacts.reactions && Object.keys(message.reacts.reactions).map(utf => {
      const reaction = message.reacts.reactions[utf];
      const count = Object.keys(reaction).length;
      if (!count) {
        return null;
      }
      const filename = twemoji.convert.toCodePoint(utf);
      const currentUserReacted = !!reaction[u_handle];
      const names = [];
      if (reaction) {
        ChatdIntegration._ensureContactExists(Object.keys(reaction));
        const rKeys = Object.keys(reaction);
        for (let i = 0; i < rKeys.length; i++) {
          const uid = rKeys[i];
          if (reaction[uid]) {
            if (uid === u_handle) {
              names.push(l[24071] || 'You');
            } else if (uid in M.u) {
              names.push(M.getNameByHandle(uid) || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER);
            }
          }
        }
      }
      let emojiData = megaChat._emojiData.emojisUtf[utf];
      if (!emojiData) {
        emojiData = Object.create(null);
        emojiData.u = utf;
      }
      let slug = emojiData && emojiData.n || "";
      let tipText;
      slug = slug ? `:${slug}:` : utf;
      if (Object.keys(reaction).length === 1 && reaction[u_handle]) {
        tipText = (l[24068] || "You (click to remove) [G]reacted with %s[/G]").replace("%s", slug);
      } else {
        tipText = mega.utils.trans.listToString(names, (l[24069] || "%s [G]reacted with %s2[/G]").replace("%s2", slug));
      }
      const notFoundEmoji = slug && slug[0] !== ":";
      return JSX_("div", {
        key: slug,
        onClick: ((e, slug, meta) => () => this.emojiSelected(e, slug, meta))(null, slug, emojiData),
        className: `
                            reactions-bar__reaction
                            simpletip
                            ${currentUserReacted ? 'user-reacted' : ''}
                            ${notFoundEmoji ? 'emoji-loading-error' : ''}
                            ${isReadOnlyClass}
                        `,
        "data-simpletip": tipText,
        "data-simpletipoffset": "3",
        "data-simpletipposition": "top"
      }, JSX_("img", {
        width: "10",
        height: "10",
        className: "emoji emoji-loading",
        draggable: "false",
        onError: e => {
          const textNode = document.createElement("em");
          textNode.classList.remove('emoji-loading');
          textNode.append(document.createTextNode(utf));
          e.target.replaceWith(textNode);
          textNode.parentNode.classList.add('emoji-loading-error');
        },
        onLoad: e => {
          e.target.classList.remove('emoji-loading');
        },
        src: `${staticpath  }images/mega/twemojis/2_v2/72x72/${  filename  }.png`
      }), JSX_("span", {
        className: "message text-block"
      }, count));
    });
    emojisImages = emojisImages && emojisImages.filter((v) => {
      return !!v;
    });
    if (emojisImages && emojisImages.length > 0) {
      const reactionBtn = !chatRoom.isReadOnly() ? JSX_(_ui_buttons_jsx2__ .$, {
        className: "popup-button reactions-button hover-colorized simpletip",
        icon: "sprite-fm-theme icon-emoji-reactions reactions-icon",
        disabled: false,
        key: "add-reaction-button",
        attrs: {
          'data-simpletip': l[24070] || "Add reaction...",
          'data-simpletipoffset': "3",
          'data-simpletipposition': "top"
        }
      }, JSX_(_ui_emojiDropdown_jsx3__ .A, {
        horizOffset: this.haveMeetingsCall() ? -150 : 0,
        onActiveChange: this._emojiOnActiveStateChange,
        className: "popup emoji reactions-dropdown",
        onClick: this.emojiSelected
      })) : null;
      emojisImages.push(reactionBtn);
    }
    return emojisImages ? JSX_("div", {
      className: "reactions-bar",
      id: "reactions-bar",
      onMouseEnter: () => {
        if (this._loadedReacts) {
          return false;
        }
        this._loadedReacts = megaChat.plugins.userHelper.fetchAllNames(this._reactionContacts(), chatRoom).catch(dump).finally(() => {
          this._loadedReacts = true;
          this.safeForceUpdate();
        });
      }
    }, emojisImages) : null;
  }
  getMessageActionButtons() {
    const {
      chatRoom,
      message
    } = this.props;
    return message instanceof Message && message.isSentOrReceived() && !chatRoom.isReadOnly() ? JSX_(_ui_buttons_jsx2__ .$, {
      className: "popup-button reactions-button tiny-button simpletip",
      icon: `${"sprite-fm-theme reactions-icon"} icon-emoji-reactions`,
      iconHovered: `${"sprite-fm-theme reactions-icon"} icon-emoji-reactions-active`,
      disabled: false,
      key: "add-reaction-button",
      attrs: {
        'data-simpletip': l[24070] || "Add reaction...",
        'data-simpletipoffset': "3",
        'data-simpletipposition': "top"
      }
    }, JSX_(_ui_emojiDropdown_jsx3__ .A, {
      horizOffset: this.haveMeetingsCall() ? -110 : 0,
      noArrow: true,
      onActiveChange: this._emojiOnActiveStateChange,
      className: "popup emoji reactions-dropdown",
      onClick: this.emojiSelected
    })) : null;
  }
}


 },

 1165
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  DropdownEmojiSelector
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _chat_mixins_js2__ = REQ_(8264);
 const _dropdowns_jsx3__ = REQ_(1510);
 const _perfectScrollbar_jsx4__ = REQ_(1301);





class DropdownEmojiSelector extends _chat_mixins_js2__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react1___default().createRef();
    this.emojiSearchRef = react1___default().createRef();
    this.data_categories = null;
    this.data_emojis = null;
    this.data_emojiByCategory = null;
    this.customCategoriesOrder = ["frequently_used", "people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
    this.frequentlyUsedEmojis = ['slight_smile', 'grinning', 'smile', 'rofl', 'wink', 'yum', 'rolling_eyes', 'stuck_out_tongue', 'smiling_face_with_3_hearts', 'heart_eyes', 'kissing_heart', 'sob', 'pleading_face', 'thumbsup', 'pray', 'wave', 'fire', 'sparkles'];
    this.heightDefs = {
      'categoryTitleHeight': 55,
      'emojiRowHeight': 35,
      'containerHeight': 302,
      'totalScrollHeight': 302,
      'numberOfEmojisPerRow': 9
    };
    this.categoryLabels = {
      'frequently_used': l[17737],
      'people': l[8016],
      'objects': l[17735],
      'activity': l[8020],
      'nature': l[8017],
      'travel': l[8021],
      'symbols': l[17736],
      'food': l[8018],
      'flags': l[17703]
    };
    this.state = this.getInitialState();
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onUserScroll = this.onUserScroll.bind(this);
    this._onScrollChanged = this._onScrollChanged.bind(this);
  }
  getInitialState() {
    return clone({
      'previewEmoji': null,
      'searchValue': '',
      'browsingCategory': false,
      'isActive': false,
      'isLoading': true,
      'loadFailed': false,
      'visibleCategories': "0"
    });
  }
  _generateEmoji(meta) {
    const filename = twemoji.convert.toCodePoint(meta.u);
    return JSX_("img", {
      width: "20",
      height: "20",
      className: "emoji emoji-loading",
      draggable: "false",
      alt: meta.u,
      title: `:${  meta.n  }:`,
      onLoad: e => {
        e.target.classList.remove('emoji-loading');
      },
      onError: e => {
        e.target.classList.remove('emoji-loading');
        e.target.classList.add('emoji-loading-error');
      },
      src: `${staticpath  }images/mega/twemojis/2_v2/72x72/${  filename  }.png`
    });
  }
  _generateEmojiElement(emoji, cat) {
    const self = this;
    const categoryName = self.data_categories[cat];
    return JSX_("div", {
      "data-emoji": emoji.n,
      className: "button square-button emoji",
      key: `${categoryName  }_${  emoji.n}`,
      onMouseEnter: e => {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }
        e.stopPropagation();
        e.preventDefault();
        self.mouseEnterTimer = setTimeout(() => {
          self.setState({
            'previewEmoji': emoji
          });
        }, 250);
      },
      onMouseLeave: e => {
        if (self.mouseEnterTimer) {
          clearTimeout(self.mouseEnterTimer);
        }
        e.stopPropagation();
        e.preventDefault();
        self.setState({
          'previewEmoji': null
        });
      },
      onClick: e => {
        if (self.props.onClick) {
          self.props.onClick(e, emoji.n, emoji);
          $(document).trigger('closeDropdowns');
        }
      }
    }, self._generateEmoji(emoji));
  }
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (nextState.searchValue !== this.state.searchValue || nextState.browsingCategories !== this.state.browsingCategories) {
      this._cachedNodes = {};
      if (this.scrollableArea) {
        this.scrollableArea.scrollToY(0);
      }
      this._onScrollChanged(0, nextState);
    }
    if (nextState.isActive === true) {
      const self = this;
      if (nextState.isLoading === true || !self.loadingPromise && (!self.data_categories || !self.data_emojis)) {
        const p = [megaChat.getEmojiDataSet('categories'), megaChat.getEmojiDataSet('emojis')];
        this.loadingPromise = Promise.all(p).then(([categories, emojis]) => {
          this.data_emojis = emojis;
          this.data_categories = categories;
          self.data_categories.push('frequently_used');
          self.data_categoriesWithCustomOrder = [];
          self.customCategoriesOrder.forEach((catName) => {
            self.data_categoriesWithCustomOrder.push(self.data_categories.indexOf(catName));
          });
          self.data_emojiByCategory = {};
          const frequentlyUsedEmojisMeta = {};
          self.data_emojis.forEach((emoji) => {
            const cat = emoji.c;
            if (!self.data_emojiByCategory[cat]) {
              self.data_emojiByCategory[cat] = [];
            }
            if (self.frequentlyUsedEmojis.indexOf(emoji.n) > -1) {
              frequentlyUsedEmojisMeta[emoji.n] = emoji.u;
            }
            emoji.element = self._generateEmojiElement(emoji, cat);
            self.data_emojiByCategory[cat].push(emoji);
          });
          self.data_emojiByCategory[8] = [];
          self.frequentlyUsedEmojis.forEach((slug) => {
            const emoji = {
              'n': slug,
              'u': frequentlyUsedEmojisMeta[slug]
            };
            emoji.element = self._generateEmojiElement(emoji, 99);
            self.data_emojiByCategory[8].push(emoji);
          });
          self._onScrollChanged(0);
          self.setState({
            'isLoading': false
          });
        }).catch(ex => {
          if (d) {
            console.error("Emoji loading failed.", ex);
          }
          this.setState({
            'loadFailed': true,
            'isLoading': false
          });
        });
      }
    } else if (nextState.isActive === false) {
      if (this.data_emojis) {
        for (let i = this.data_emojis.length; i--;) {
          delete this.data_emojis[i].element;
        }
      }
      this.data_emojis = null;
      this.data_categories = null;
      this.data_emojiByCategory = null;
      this.loadingPromise = null;
    }
  }
  onSearchChange(e) {
    const self = this;
    self.setState({
      searchValue: e.target.value,
      browsingCategory: false
    });
  }
  onUserScroll($ps) {
    if (this.state.browsingCategory) {
      const $cat = $(`.emoji-category-container[data-category-name="${  this.state.browsingCategory  }"]`);
      if (!elementInViewport($cat)) {
        this.setState({
          'browsingCategory': false
        });
      }
    }
    this._onScrollChanged($ps.getScrollPositionY());
  }
  generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
    const self = this;
    if (!self._cachedNodes) {
      self._cachedNodes = {};
    }
    if (!stateObj) {
      stateObj = self.state;
    }
    if (typeof self._cachedNodes[categoryId] !== 'undefined') {
      return self._cachedNodes[categoryId];
    }
    const categoryName = self.data_categories[categoryId];
    const emojis = [];
    const {searchValue} = stateObj;
    let totalEmojis = 0;
    self.data_emojiByCategory[categoryId].forEach((meta) => {
      const slug = meta.n;
      if (searchValue.length > 0) {
        if (`:${  slug  }:`.toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
          return;
        }
      }
      totalEmojis++;
      emojis.push(meta.element);
    });
    if (emojis.length > 0) {
      const totalHeight = self.heightDefs.categoryTitleHeight + Math.ceil(totalEmojis / self.heightDefs.numberOfEmojisPerRow) * self.heightDefs.emojiRowHeight;
      return self._cachedNodes[categoryId] = [totalHeight, JSX_("div", {
        key: categoryName,
        "data-category-name": categoryName,
        className: "emoji-category-container",
        style: {
          'position': 'absolute',
          'top': posTop
        }
      }, emojis.length > 0 ? JSX_("div", {
        className: "clear"
      }) : null, JSX_("div", {
        className: "emoji-type-txt"
      }, self.categoryLabels[categoryName] ? self.categoryLabels[categoryName] : categoryName), JSX_("div", {
        className: "clear"
      }), emojis, JSX_("div", {
        className: "clear"
      }))];
    } else {
      return self._cachedNodes[categoryId] = undefined;
    }
  }
  _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
    const visibleTop = elTop < scrollTop ? scrollTop : elTop;
    const visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
    return visibleBottom - visibleTop > 0;
  }
  _onScrollChanged(scrollPositionY, stateObj) {
    const self = this;
    if (!self.data_categoriesWithCustomOrder) {
      return;
    }
    if (scrollPositionY === false) {
      scrollPositionY = self.scrollableArea.getScrollPositionY();
    }
    if (!stateObj) {
      stateObj = self.state;
    }
    const visibleStart = scrollPositionY;
    const visibleEnd = visibleStart + self.heightDefs.containerHeight;
    let currentPos = 0;
    let visibleCategories = [];
    self._emojiReactElements = [];
    self.data_categoryPositions = {};
    self.data_categoriesWithCustomOrder.forEach((k) => {
      const categoryDivMeta = self.generateEmojiElementsByCategory(k, currentPos, stateObj);
      if (categoryDivMeta) {
        const startPos = currentPos;
        currentPos += categoryDivMeta[0];
        const endPos = currentPos;
        self.data_categoryPositions[k] = startPos;
        if (self._isVisible(visibleStart, visibleEnd, startPos, endPos)) {
          visibleCategories.push(k);
          self._emojiReactElements.push(categoryDivMeta[1]);
        }
      }
    });
    if (self._emojiReactElements.length === 0) {
      const emojisNotFound = JSX_("span", {
        className: "emojis-not-found",
        key: 'emojis-not-found'
      }, l[20920]);
      self._emojiReactElements.push(emojisNotFound);
    }
    visibleCategories = visibleCategories.join(',');
    self.setState({
      'totalScrollHeight': currentPos,
      visibleCategories
    });
  }
  _renderEmojiPickerPopup() {
    const self = this;
    let preview;
    if (self.state.previewEmoji) {
      const meta = self.state.previewEmoji;
      preview = JSX_("div", {
        className: "emoji-preview"
      }, self._generateEmoji(meta), JSX_("div", {
        className: "emoji title"
      }, `:${  meta.n  }:`));
    }
    const categoryIcons = {
      "frequently_used": "icon-emoji-type-frequent",
      "people": "icon-emoji-type-people",
      "nature": "icon-emoji-type-nature",
      "food": "icon-emoji-type-food",
      "activity": "icon-emoji-type-activity",
      "travel": "icon-emoji-type-travel",
      "objects": "icon-emoji-type-objects",
      "symbols": "icon-emoji-type-symbol",
      "flags": "icon-emoji-type-flag"
    };
    const categoryButtons = [];
    let activeCategoryName = false;
    if (!self.state.searchValue) {
      const firstActive = self.state.visibleCategories.split(",")[0];
      if (firstActive) {
        activeCategoryName = self.data_categories[firstActive];
      }
    }
    self.customCategoriesOrder.forEach(categoryName => {
      categoryButtons.push(JSX_("div", {
        visiblecategories: this.state.visibleCategories,
        className: `
                        button square-button emoji
                        ${activeCategoryName === categoryName ? 'active' : ''}
                    `,
        key: categoryIcons[categoryName],
        onClick: e => {
          e.stopPropagation();
          e.preventDefault();
          this.setState({
            browsingCategory: categoryName,
            searchValue: ''
          });
          this._cachedNodes = {};
          const categoryPosition = this.data_categoryPositions[this.data_categories.indexOf(categoryName)] + 10;
          this.scrollableArea.scrollToY(categoryPosition);
          this._onScrollChanged(categoryPosition);
          const {
            current
          } = this.emojiSearchRef || !1;
          current == null || current.focus();
        }
      }, JSX_("i", {
        className: `sprite-fm-mono ${categoryIcons[categoryName]}`
      })));
    });
    return JSX_(react1___default().Fragment, null, JSX_("div", {
      className: "popup-header emoji"
    }, preview || JSX_("div", {
      className: "search-block emoji"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), JSX_("input", {
      ref: this.emojiSearchRef,
      type: "search",
      placeholder: l[102],
      onChange: this.onSearchChange,
      autoFocus: true,
      value: this.state.searchValue
    }))), JSX_(_perfectScrollbar_jsx4__ .O, {
      className: "popup-scroll-area emoji perfectScrollbarContainer",
      searchValue: this.state.searchValue,
      onUserScroll: this.onUserScroll,
      visibleCategories: this.state.visibleCategories,
      ref: ref => {
        this.scrollableArea = ref;
      }
    }, JSX_("div", {
      className: "popup-scroll-content emoji"
    }, JSX_("div", {
      style: {
        height: this.state.totalScrollHeight
      }
    }, this._emojiReactElements))), JSX_("div", {
      className: "popup-footer emoji"
    }, categoryButtons));
  }
  render() {
    const self = this;
    let popupContents = null;
    if (self.state.isActive === true) {
      if (self.state.loadFailed === true) {
        popupContents = JSX_("div", {
          className: "loading"
        }, l[1514]);
      } else if (this.state.isLoading || !this.data_emojiByCategory || !this.data_categories) {
        popupContents = JSX_("div", {
          className: "loading"
        }, l[5533]);
      } else {
        popupContents = self._renderEmojiPickerPopup();
      }
    } else {
      popupContents = null;
    }
    return JSX_(_dropdowns_jsx3__ .ms, (0,_babel_runtime_helpers_extends0__ .A)({
      className: "popup emoji"
    }, self.props, {
      isLoading: self.state.isLoading,
      loadFailed: self.state.loadFailed,
      visibleCategories: this.state.visibleCategories,
      forceShowWhenEmpty: true,
      onActiveChange: newValue => {
        if (newValue === false) {
          self.setState(self.getInitialState());
          self._cachedNodes = {};
          self._onScrollChanged(0);
        } else {
          self.setState({
            'isActive': true
          });
        }
        if (self.props.onActiveChange) {
          self.props.onActiveChange(newValue);
        }
      },
      searchValue: self.state.searchValue,
      browsingCategory: self.state.browsingCategory,
      previewEmoji: self.state.previewEmoji
    }), JSX_("div", {
      ref: this.domRef
    }, popupContents));
  }
}
DropdownEmojiSelector.defaultProps = {
  'requiresUpdateOnResize': true,
  'hideable': true
};

 },

 1301
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   O: () =>  PerfectScrollbar
 });
 const _babel_runtime_helpers_applyDecoratedDescriptor0__ = REQ_(793);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _chat_mixins2__ = REQ_(8264);

let _dec, _dec2, _class, _PerfectScrollbar;


const PerfectScrollbar = (_dec = (0,_chat_mixins2__ .hG)(30, true), _dec2 = (0,_chat_mixins2__ .hG)(30, true), _class = (_PerfectScrollbar = class PerfectScrollbar extends _chat_mixins2__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react1___default().createRef();
    this.isUserScroll = true;
    this.scrollEventIncId = 0;
  }
  get$Node() {
    if (!this.$Node) {
      let _this$domRef;
      this.$Node = $((_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current);
    }
    return this.$Node;
  }
  doProgramaticScroll(newPos, forced, isX, skipReinitialised) {
    if (!this.isMounted()) {
      return;
    }
    const self = this;
    const $elem = self.get$Node();
    let animFrameInner = false;
    const prop = !isX ? 'scrollTop' : 'scrollLeft';
    const event = `scroll.progscroll${  self.scrollEventIncId++}`;
    $elem.rebind(event, () => {
      if (animFrameInner) {
        cancelAnimationFrame(animFrameInner);
        animFrameInner = false;
      }
      $elem.off(event);
      if (!skipReinitialised) {
        self.reinitialised(true);
      } else if (typeof skipReinitialised === 'function') {
        onIdle(skipReinitialised);
      }
      self.isUserScroll = true;
    });
    self.isUserScroll = false;
    $elem[0][prop] = Math.round(newPos);
    Ps.update($elem[0]);
    animFrameInner = requestAnimationFrame(() => {
      animFrameInner = false;
      self.isUserScroll = true;
      $elem.off(event);
    });
    return true;
  }
  componentDidMount() {
    let _this$props$didMount, _this$props;
    super.componentDidMount();
    const self = this;
    const $elem = self.get$Node();
    $elem.height('100%');
    const options = Object.assign({}, {
      'handlers': ['click-rail', 'drag-thumb', 'keyboard', 'wheel', 'touch'],
      'minScrollbarLength': 20
    }, self.props.options);
    Ps.initialize($elem[0], options);
    if (self.props.onFirstInit) {
      self.props.onFirstInit(self, $elem);
    }
    $elem.rebind(`ps-scroll-y.ps${  self.getUniqueId()}`, (e) => {
      if ($elem.attr('data-scroll-disabled') === "true") {
        e.stopPropagation();
        e.preventDefault();
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
        return false;
      }
      if (self.props.onUserScroll && self.isUserScroll === true && $elem.is(e.target)) {
        self.props.onUserScroll(self, $elem, e);
      }
    });
    $elem.rebind(`disable-scroll.ps${  self.getUniqueId()}`, () => {
      Ps.destroy($elem[0]);
    });
    $elem.rebind(`enable-scroll.ps${  self.getUniqueId()}`, () => {
      Ps.initialize($elem[0], options);
    });
    $elem.rebind(`forceResize.ps${  self.getUniqueId()}`, (e, forced, scrollPositionYPerc, scrollToElement) => {
      self.onResize(forced, scrollPositionYPerc, scrollToElement);
    });
    self.onResize();
    this.attachAnimationEvents();
    (_this$props$didMount = (_this$props = this.props).didMount) == null || _this$props$didMount.call(_this$props, this.getUniqueId(), this);
  }
  componentWillUnmount() {
    let _this$props$willUnmou, _this$props2;
    super.componentWillUnmount();
    const $elem = this.get$Node();
    $elem.off(`ps-scroll-y.ps${  this.getUniqueId()}`);
    const ns = `.ps${  this.getUniqueId()}`;
    $elem.parents('.have-animation').unbind(`animationend${  ns  } webkitAnimationEnd${  ns  } oAnimationEnd${  ns}`);
    (_this$props$willUnmou = (_this$props2 = this.props).willUnmount) == null || _this$props$willUnmou.call(_this$props2, this.getUniqueId(), this);
  }
  attachAnimationEvents() {}
  eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement) {
    const self = this;
    if (!self.isComponentEventuallyVisible()) {
      return;
    }
    const $elem = self.get$Node();
    const h = self.getContentHeight();
    if (forced || self._currHeight !== h) {
      self._currHeight = h;
      self._doReinit(scrollPositionYPerc, scrollToElement, forced, $elem);
    }
  }
  _doReinit(scrollPositionYPerc, scrollToElement, forced, $elem) {
    let fired = false;
    if (this.props.onReinitialise) {
      fired = this.props.onReinitialise(this, $elem, forced, scrollPositionYPerc, scrollToElement);
    }
    if (fired === false) {
      if (scrollPositionYPerc) {
        if (scrollPositionYPerc === -1) {
          this.scrollToBottom(true);
        } else {
          this.scrollToPercentY(scrollPositionYPerc, true);
        }
      } else if (scrollToElement) {
        this.scrollToElement(scrollToElement, true);
      }
    }
  }
  scrollToBottom(skipReinitialised) {
    this.reinitialise(skipReinitialised, true);
  }
  reinitialise(skipReinitialised, bottom) {
    let _this$domRef2;
    const $elem = (_this$domRef2 = this.domRef) == null ? void 0 : _this$domRef2.current;
    if (!$elem) {
      return;
    }
    this.isUserScroll = false;
    if (bottom) {
      $elem.scrollTop = this.getScrollHeight();
    }
    Ps.update($elem);
    this.isUserScroll = true;
    if (!skipReinitialised) {
      this.reinitialised(true);
    }
  }
  getDOMRect(node) {
    let _this$domRef3;
    node = node || ((_this$domRef3 = this.domRef) == null ? void 0 : _this$domRef3.current);
    return node && node.getBoundingClientRect();
  }
  getScrollOffset(value) {
    let _this$domRef4;
    const $elem = (_this$domRef4 = this.domRef) == null ? void 0 : _this$domRef4.current;
    if ($elem) {
      return this.getDOMRect($elem.children[0])[value] - this.getDOMRect($elem)[value];
    }
    return 0;
  }
  getScrollHeight() {
    const res = this.getScrollOffset('height');
    if (res < 1) {
      return this._lastKnownScrollHeight || 0;
    }
    this._lastKnownScrollHeight = res;
    return res;
  }
  getScrollWidth() {
    const res = this.getScrollOffset('width');
    if (res < 1) {
      return this._lastKnownScrollWidth || 0;
    }
    this._lastKnownScrollWidth = res;
    return res;
  }
  getContentHeight() {
    const $elem = this.get$Node();
    return $elem[0].scrollHeight;
  }
  getContentWidth() {
    const $elem = this.get$Node();
    return $elem[0].scrollWidth;
  }
  setCssContentHeight(h) {
    const $elem = this.get$Node();
    return $elem.css('height', h);
  }
  isAtTop() {
    let _this$domRef5;
    return ((_this$domRef5 = this.domRef) == null ? void 0 : _this$domRef5.current.scrollTop) === 0;
  }
  isAtBottom() {
    return Math.round(this.getScrollPositionY()) === Math.round(this.getScrollHeight());
  }
  isCloseToBottom(minPixelsOff) {
    return this.getScrollHeight() - this.getScrollPositionY() <= minPixelsOff;
  }
  getScrolledPercentY() {
    return 100 / this.getScrollHeight() * this.getScrollPositionY();
  }
  getScrollPositionY() {
    let _this$domRef6;
    return (_this$domRef6 = this.domRef) == null ? void 0 : _this$domRef6.current.scrollTop;
  }
  getScrollPositionX() {
    let _this$domRef7;
    return (_this$domRef7 = this.domRef) == null ? void 0 : _this$domRef7.current.scrollLeft;
  }
  getClientWidth() {
    let _this$domRef8;
    return (_this$domRef8 = this.domRef) == null ? void 0 : _this$domRef8.current.clientWidth;
  }
  getClientHeight() {
    let _this$domRef9;
    return (_this$domRef9 = this.domRef) == null ? void 0 : _this$domRef9.current.clientHeight;
  }
  scrollToPercentY(posPerc, skipReinitialised) {
    const $elem = this.get$Node();
    const targetPx = this.getScrollHeight() / 100 * posPerc;
    if ($elem[0].scrollTop !== targetPx) {
      this.doProgramaticScroll(targetPx, 0, 0, skipReinitialised);
    }
  }
  scrollToPercentX(posPerc, skipReinitialised) {
    const $elem = this.get$Node();
    const targetPx = this.getScrollWidth() / 100 * posPerc;
    if ($elem[0].scrollLeft !== targetPx) {
      this.doProgramaticScroll(targetPx, false, true, skipReinitialised);
    }
  }
  scrollToY(posY, skipReinitialised) {
    const $elem = this.get$Node();
    if ($elem[0].scrollTop !== posY) {
      this.doProgramaticScroll(posY, 0, 0, skipReinitialised);
    }
  }
  scrollToElement(element, skipReinitialised) {
    if (element && element.offsetParent) {
      this.doProgramaticScroll(element.offsetTop, 0, 0, skipReinitialised);
    }
  }
  disable() {
    if (this.isMounted()) {
      const $elem = this.get$Node();
      $elem.attr('data-scroll-disabled', true);
      $elem.addClass('ps-disabled');
      Ps.disable($elem[0]);
    }
  }
  enable() {
    if (this.isMounted()) {
      const $elem = this.get$Node();
      $elem.removeAttr('data-scroll-disabled');
      $elem.removeClass('ps-disabled');
      Ps.enable($elem[0]);
    }
  }
  reinitialised(forced) {
    if (this.props.onReinitialise) {
      this.props.onReinitialise(this, this.get$Node(), forced ? forced : false);
    }
  }
  onResize(forced, scrollPositionYPerc, scrollToElement) {
    if (forced && forced.originalEvent) {
      forced = true;
      scrollPositionYPerc = undefined;
    }
    this.eventuallyReinitialise(forced, scrollPositionYPerc, scrollToElement);
  }
  inViewport(domNode) {
    return verge.inViewport(domNode);
  }
  componentDidUpdate() {
    if (this.props.requiresUpdateOnResize || this.requiresUpdateOnResize) {
      this.onResize(true);
    }
    this.attachAnimationEvents();
  }
  customIsEventuallyVisible() {
    const {chatRoom} = this.props;
    return !chatRoom || chatRoom.isCurrentlyActive;
  }
  render() {
    const {
      style,
      className,
      children
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      style,
      className
    }, children);
  }
}, _PerfectScrollbar.defaultProps = {
  className: "perfectScrollbarContainer",
  requiresUpdateOnResize: true
}, _PerfectScrollbar), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "eventuallyReinitialise", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyReinitialise"), _class.prototype), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "onResize", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "onResize"), _class.prototype), _class);

 },

 1510
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   ms: () =>  Dropdown,
   tJ: () =>  DropdownItem
 });

 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _utils_jsx1__ = REQ_(6411);
 const _chat_mixins2__ = REQ_(8264);
 const _chat_ui_contacts_jsx3__ = REQ_(8022);




class Dropdown extends _chat_mixins2__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.onActiveChange = this.onActiveChange.bind(this);
    this.onResized = this.onResized.bind(this);
  }
  UNSAFE_componentWillUpdate(nextProps) {
    if (this.props.active != nextProps.active) {
      this.onActiveChange(nextProps.active);
    }
  }
  specShouldComponentUpdate(nextProps, nextState) {
    if (this.props.active != nextProps.active) {
      if (this.props.onBeforeActiveChange) {
        this.props.onBeforeActiveChange(nextProps.active);
      }
      return true;
    } else if (this.props.focused != nextProps.focused) {
      return true;
    } else if (this.state && this.state.active != nextState.active) {
      return true;
    }
    return undefined;
  }
  onActiveChange(newVal) {
    if (this.props.onActiveChange) {
      this.props.onActiveChange(newVal);
    }
  }
  reposElementUsing(element, obj, info) {
    let $element;
    if (this.popupElement) {
      $element = $(this.popupElement);
    } else {
      return;
    }
    const self = this;
    let vertOffset = 0;
    let horizOffset = 0;
    if (!self.props.noArrow) {
      const $arrow = $('.dropdown-white-arrow', $element);
      let arrowHeight;
      if (self.props.arrowHeight) {
        arrowHeight = self.props.arrowHeight;
        if (info.vertical === "top") {
          arrowHeight = 0;
        } else {
          arrowHeight *= -1;
        }
      } else {
        arrowHeight = $arrow.outerHeight();
      }
      if (info.vertical === "top") {
        $(element).removeClass("down-arrow").addClass("up-arrow");
      } else {
        $(element).removeClass("up-arrow").addClass("down-arrow");
      }
      vertOffset += info.vertical === "top" ? arrowHeight : 0;
    }
    if (self.props.vertOffset) {
      vertOffset += self.props.vertOffset * (info.vertical === "top" ? 1 : -1);
    }
    if (self.props.horizOffset) {
      horizOffset += self.props.horizOffset;
    }
    $(element).css({
      left: `${obj.left + 0 + horizOffset  }px`,
      top: `${obj.top + vertOffset  }px`
    });
    if (this.props.positionLeft) {
      $(element).css({
        left: this.props.positionLeft
      });
    }
  }
  onResized() {
    const self = this;
    if (this.props.active === true && this.popupElement) {
      const $element = $(this.popupElement);
      const $positionToElement = $('.button.active-dropdown:visible');
      if ($positionToElement.length === 0) {
        return;
      }
      let $container = $positionToElement.closest('.messages.scroll-area');
      if ($container.length === 0) {
        $container = $(document.body);
      }
      $element.css('margin-left', '');
      $element.position({
        of: $positionToElement,
        my: self.props.positionMy ? self.props.positionMy : "center top",
        at: self.props.positionAt ? self.props.positionAt : "center bottom",
        collision: this.props.collision || 'flipfit',
        within: self.props.wrapper || $container,
        using (obj, info) {
          self.reposElementUsing(this, obj, info);
        }
      });
    }
  }
  componentDidMount() {
    super.componentDidMount();
    chatGlobalEventManager.addEventListener('resize', `drpdwn${  this.getUniqueId()}`, this.onResized.bind(this));
    this.onResized();
    const self = this;
    $(document.body).rebind(`closeAllDropdownsExcept.drpdwn${  this.getUniqueId()}`, (e, target) => {
      if (self.props.active && target !== self) {
        if (self.props && self.props.closeDropdown) {
          self.props.closeDropdown();
        }
      }
    });
  }
  componentDidUpdate() {
    this.onResized();
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    $(document.body).unbind(`closeAllDropdownsExcept.drpdwn${  this.getUniqueId()}`);
    if (this.props.active) {
      this.onActiveChange(false);
    }
    chatGlobalEventManager.removeEventListener('resize', `drpdwn${  this.getUniqueId()}`);
  }
  doRerender() {
    const self = this;
    setTimeout(() => {
      self.safeForceUpdate();
    }, 100);
    setTimeout(() => {
      self.onResized();
    }, 200);
  }
  renderChildren() {
    const self = this;
    return react0___default().Children.map(this.props.children, (child) => {
      if (child) {
        let activeVal = self.props.active || self.state.active;
        activeVal = String(activeVal);
        return react0___default().cloneElement(child, {
          active: activeVal
        });
      }
      return null;
    });
  }
  render() {
    if (this.props.active !== true) {
      return null;
    }
    const self = this;
    let child = null;
    if (this.props.children) {
      child = JSX_("div", {
        ref: this.domRef
      }, self.renderChildren());
    } else if (this.props.dropdownItemGenerator) {
      child = this.props.dropdownItemGenerator(this);
    }
    if (!child && !this.props.forceShowWhenEmpty) {
      if (this.props.active !== false) {
        queueMicrotask(() => {
          self.onActiveChange(false);
        });
      }
      return null;
    }
    return JSX_(_utils_jsx1__ .Ay.RenderTo, {
      element: document.body,
      className: `
                    dropdown
                    body
                    ${this.props.noArrow ? '' : 'dropdown-arrow up-arrow'}
                    ${this.props.className || ''}
                `,
      style: this.popupElement && {
        zIndex: 123,
        position: 'absolute',
        width: this.props.styles ? this.props.styles.width : undefined
      },
      popupDidMount: popupElement => {
        this.popupElement = popupElement;
        this.onResized();
      },
      popupWillUnmount: () => {
        delete this.popupElement;
      }
    }, JSX_("div", {
      ref: this.domRef,
      onClick: () => {
        $(document.body).trigger('closeAllDropdownsExcept', this);
      }
    }, this.props.noArrow ? null : JSX_("i", {
      className: "dropdown-white-arrow"
    }), child));
  }
}
Dropdown.defaultProps = {
  'requiresUpdateOnResize': true
};
class DropdownContactsSelector extends _chat_mixins2__ .w9 {
  constructor(props) {
    super(props);
    this.state = {
      'selected': this.props.selected ? this.props.selected : []
    };
    this.onSelectClicked = this.onSelectClicked.bind(this);
    this.onSelected = this.onSelected.bind(this);
  }
  specShouldComponentUpdate(nextProps, nextState) {
    if (this.props.active != nextProps.active) {
      return true;
    } else if (this.props.focused != nextProps.focused) {
      return true;
    } else if (this.state && this.state.active != nextState.active) {
      return true;
    } else if (this.state && JSON.stringify(this.state.selected) != JSON.stringify(nextState.selected)) {
      return true;
    } else {
      return undefined;
    }
  }
  onSelected(nodes) {
    this.setState({
      'selected': nodes
    });
    if (this.props.onSelected) {
      this.props.onSelected(nodes);
    }
    this.forceUpdate();
  }
  onSelectClicked() {
    this.props.onSelectClicked();
  }
  render() {
    return JSX_(Dropdown, {
      className: `
                    popup contacts-search
                    ${this.props.className}
                    tooltip-blur
                `,
      active: this.props.active,
      closeDropdown: this.props.closeDropdown,
      ref: ref => {
        this.dropdownRef = ref;
      },
      positionMy: this.props.positionMy,
      positionAt: this.props.positionAt,
      arrowHeight: this.props.arrowHeight,
      horizOffset: this.props.horizOffset,
      vertOffset: this.props.vertOffset,
      noArrow: true
    }, JSX_(_chat_ui_contacts_jsx3__ .hU, {
      onClose: this.props.closeDropdown,
      onEventuallyUpdated: () => {
        let _this$dropdownRef;
        return (_this$dropdownRef = this.dropdownRef) == null ? void 0 : _this$dropdownRef.doRerender();
      },
      active: this.props.active,
      className: "popup contacts-search tooltip-blur small-footer",
      contacts: M.u,
      selectFooter: this.props.selectFooter,
      megaChat: this.props.megaChat,
      exclude: this.props.exclude,
      allowEmpty: this.props.allowEmpty,
      multiple: this.props.multiple,
      topButtons: this.props.topButtons,
      showAddContact: this.props.showAddContact,
      onAddContact: () => eventlog(500237),
      onSelected: () => eventlog(500238),
      onSelectDone: this.props.onSelectDone,
      multipleSelectedButtonLabel: this.props.multipleSelectedButtonLabel,
      singleSelectedButtonLabel: this.props.singleSelectedButtonLabel,
      nothingSelectedButtonLabel: this.props.nothingSelectedButtonLabel
    }));
  }
}
DropdownContactsSelector.defaultProps = {
  requiresUpdateOnResize: true
};
class DropdownItem extends _chat_mixins2__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.state = {
      'isClicked': false
    };
    this.onClick = this.onClick.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
  }
  renderChildren() {
    const self = this;
    return react0___default().Children.map(this.props.children, (child) => {
      const props = {
        active: self.state.isClicked,
        closeDropdown () {
          self.setState({
            'isClicked': false
          });
        }
      };
      return react0___default().cloneElement(child, props);
    });
  }
  onClick(ev) {
    const {
      children,
      persistent,
      onClick
    } = this.props;
    if (children) {
      ev.stopPropagation();
      ev.preventDefault();
      this.setState({
        isClicked: !this.state.isClicked
      });
    }
    if (!persistent) {
      $(document).trigger('closeDropdowns');
    }
    return onClick && onClick(ev);
  }
  onMouseOver(e) {
    if (this.props.submenu) {
      const $contextItem = $(e.target).closest(".contains-submenu");
      const $subMenu = $contextItem.next('.submenu');
      const contextTopPos = $contextItem.position().top;
      let contextleftPos = 0;
      $contextItem.addClass("opened");
      $subMenu.addClass("active");
      contextleftPos = $contextItem.offset().left + $contextItem.outerWidth() + $subMenu.outerWidth() + 10;
      if (contextleftPos > $(document.body).width()) {
        $subMenu.addClass("left-position");
      }
      $subMenu.css({
        "top": contextTopPos
      });
    } else if (!$(e.target).parent('.submenu').length) {
      const $dropdown = $(e.target).closest(".dropdown.body");
      $dropdown.find(".contains-submenu").removeClass("opened");
      $dropdown.find(".submenu").removeClass("active");
    }
  }
  render() {
    const {
      className,
      disabled,
      label,
      icon,
      submenu
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    dropdown-item
                    ${className ? className : ''}
                    ${submenu ? 'contains-submenu' : ''}
                    ${disabled ? 'disabled' : ''}
                `,
      onClick: disabled ? undefined : ev => this.onClick(ev),
      onMouseOver: this.onMouseOver
    }, icon && JSX_("i", {
      className: icon
    }), label && JSX_("span", null, label), submenu ? JSX_("i", {
      className: "sprite-fm-mono icon-arrow-right submenu-icon"
    }) : '', JSX_("div", null, this.renderChildren()));
  }
}
DropdownItem.defaultProps = {
  requiresUpdateOnResize: true
};

 },

 1594
(module) {

"use strict";
module.exports = React;

 },

 3439
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  Fallback
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);

class Fallback extends react0___default().Component {
  render() {
    return JSX_("div", {
      className: "loading-spinner light"
    }, JSX_("div", {
      className: "main-loader"
    }));
  }
}

 },

 3901
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   $A: () =>  MAX_STREAMS,
   Av: () =>  isExpanded,
   Bq: () =>  PAGINATION,
   Cy: () =>  isModerator,
   Fj: () =>  EXPANDED_FLAG,
   HV: () =>  getUnsupportedBrowserMessage,
   P: () =>  isGuest,
   ZE: () =>  TYPE,
   _F: () =>  renderEndConfirm,
   dQ: () =>  inProgressAlert,
   g: () =>  MODE,
   gR: () =>  VIEW,
   gh: () =>  STREAMS_PER_PAGE,
   hK: () =>  STREAM_ACTIONS,
   sX: () =>  renderLeaveConfirm
 });
const EXPANDED_FLAG = 'in-call';
const MODE = {
  THUMBNAIL: 1,
  MAIN: 2,
  MINI: 3
};
const VIEW = {
  DEFAULT: 0,
  CHAT: 1,
  PARTICIPANTS: 2
};
const TYPE = {
  AUDIO: 1,
  VIDEO: 2
};
const STREAM_ACTIONS = {
  ADD: 1,
  REMOVE: 2
};
const PAGINATION = {
  PREV: -1,
  NEXT: 1
};
const MAX_STREAMS = 99;
const STREAMS_PER_PAGE = {
  MIN: 9,
  MED: 21,
  MAX: 49
};
const isGuest = () => !u_type;
const inProgressAlert = (isJoin, chatRoom) => {
  return new Promise((resolve, reject) => {
    if (megaChat.haveAnyActiveCall()) {
      if (window.sfuClient) {
        const {
          chatRoom: activeCallRoom
        } = megaChat.activeCall;
        const peers = activeCallRoom ? activeCallRoom.getParticipantsExceptMe(activeCallRoom.getCallParticipants()).map(h => M.getNameByHandle(h)) : [];
        let body = isJoin ? l.cancel_to_join : l.cancel_to_start;
        if (peers.length) {
          body = mega.utils.trans.listToString(peers, isJoin ? l.cancel_with_to_join : l.cancel_with_to_start);
        }
        msgDialog('warningb', null, l.call_in_progress, body, null, 1);
        return reject();
      }
      if (chatRoom.getCallParticipants().includes(u_handle)) {
        return resolve();
      }
      return msgDialog(`warningb:!^${l[2005]}!${isJoin ? l.join_call_anyway : l.start_call_anyway}`, null, isJoin ? l.join_multiple_calls_title : l.start_multiple_calls_title, isJoin ? l.join_multiple_calls_text : l.start_multiple_calls_text, join => {
        if (join) {
          return resolve();
        }
        return reject();
      }, 1);
    }
    resolve();
  });
};
window.inProgressAlert = inProgressAlert;
const isModerator = (chatRoom, handle) => {
  if (chatRoom && handle) {
    return chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR;
  }
  return false;
};
const isExpanded = () => document.body.classList.contains(EXPANDED_FLAG);
const getUnsupportedBrowserMessage = () => navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./) ? l.alert_unsupported_browser_version : l.alert_unsupported_browser;
const renderLeaveConfirm = (onConfirm, onRecordingToggle) => msgDialog(`confirmation:!^${l.leave_call_recording_dialog_cta}!${l.leave_call_recording_dialog_nop_cta}`, undefined, l.leave_call_recording_dialog_heading, l.leave_call_recording_dialog_body, cb => {
  if (cb) {
    onRecordingToggle();
    onConfirm();
  }
}, 1);
const renderEndConfirm = (onConfirm, onRecordingToggle) => msgDialog(`confirmation:!^${l.end_call_recording_dialog_cta}!${l.end_call_recording_dialog_nop_cta}`, undefined, l.end_call_recording_dialog_heading, l.end_call_recording_dialog_body, cb => {
  if (cb) {
    onRecordingToggle();
    onConfirm();
  }
}, 1);

 },

 4372
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   Y: () =>  withUpdateObserver
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _mixins_js2__ = REQ_(8264);



const withUpdateObserver = Component => class extends _mixins_js2__ .w9 {
  constructor(...args) {
    super(...args);
    this.updateInterval = 600000;
    this.instanceRef = react1___default().createRef();
    this.intervalRef = undefined;
    this.state = {
      updated: 0
    };
    this.updateListener = () => {
      return this.isComponentVisible() && document.visibilityState === 'visible' && this.setState(state => ({
        updated: ++state.updated
      }), () => this.safeForceUpdate());
    };
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    document.removeEventListener('visibilitychange', this.updateListener);
    clearInterval(this.intervalRef);
  }
  componentDidMount() {
    super.componentDidMount();
    document.addEventListener('visibilitychange', this.updateListener);
    this.intervalRef = setInterval(this.instanceRef.current[Component.updateListener] || this.updateListener, Component.updateInterval || this.updateInterval);
  }
  render() {
    return JSX_(Component, (0,_babel_runtime_helpers_extends0__ .A)({
      ref: this.instanceRef
    }, this.state, this.props));
  }
};

 },

 4649
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  Link
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);

class Link extends react0___default().Component {
  constructor(props) {
    super(props);
    this.IS_CLICK_URL = undefined;
    this.IS_CLICK_URL = this.props.to && (this.props.to.startsWith('/') || this.props.to.includes('mega.io'));
  }
  componentDidMount() {
    if (this.IS_CLICK_URL) {
      clickURLs();
    }
  }
  render() {
    const {
      className,
      to,
      target,
      children,
      onClick
    } = this.props;
    if (this.IS_CLICK_URL) {
      return JSX_("a", {
        className: `
                        clickurl
                        ${className || ''}
                    `,
        href: to,
        target
      }, children);
    }
    return JSX_("a", {
      className,
      href: "#",
      onClick: ev => {
        if (onClick) {
          ev.preventDefault();
          return onClick(ev);
        }
        return null;
      }
    }, children);
  }
}

 },

 4664
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   C: () =>  NAMESPACE,
   x: () =>  FILTER
 });
const NAMESPACE = 'lhp';
const FILTER = {
  MUTED: 'muted',
  UNREAD: 'unread'
};

 },

 4904
(_, EXP_, REQ_) {

"use strict";

// EXPORTS
REQ_.d(EXP_, {
  qY: () =>  EVENTS,
  Vw: () =>  VIEWS,
  Ay: () =>  conversations
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const utils = REQ_(3901);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
;// ./js/chat/ui/meetings/workflow/freeCallEnded.jsx


const NAMESPACE = 'free-call-ended-dlg';
class FreeCallEnded extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  componentWillUnmount() {
    if ($.dialog === NAMESPACE) {
      closeDialog();
    }
  }
  componentDidMount() {
    M.safeShowDialog(NAMESPACE, () => {
      if (!this.domRef.current) {
        throw new Error(`${NAMESPACE} dialog: component ${NAMESPACE} not mounted.`);
      }
      eventlog(500295);
      return $(`#${NAMESPACE}`);
    });
  }
  render() {
    const {
      onClose
    } = this.props;
    return JSX_(modalDialogs.A.ModalDialog, {
      id: NAMESPACE,
      ref: this.domRef,
      className: "mega-dialog",
      dialogType: "action",
      dialogName: NAMESPACE,
      onClose
    }, JSX_("header", null, JSX_("div", {
      className: "free-call-ended graphic"
    }, JSX_("img", {
      src: `${staticpath}images/mega/chat-upgrade-rocket.png`
    }))), JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_("div", {
      className: "dialog-body-text"
    }, JSX_("h3", null, l.free_call_ended_dlg_text), JSX_("span", null, l.free_call_ended_dlg_subtext)))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_("button", {
      className: "mega-button positive large",
      onClick: () => {
        loadSubPage('pro');
        eventlog(500261);
        onClose();
      }
    }, JSX_("span", null, l.upgrade_now)))));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/utils.jsx
const contactsPanel_utils = REQ_(836);
// EXTERNAL MODULE: ./js/chat/ui/leftPanel/utils.jsx
const leftPanel_utils = REQ_(4664);
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
const ui_link = REQ_(4649);
;// ./js/chat/ui/errorBoundary.jsx


class ErrorBoundary extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.state = {
      hasError: false,
      error: null
    };
    this.handleRetry = () => this.setState({
      hasError: false,
      error: null
    });
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }
  render() {
    const {
      hasError,
      error
    } = this.state;
    if (hasError) {
      return JSX_("div", {
        className: "meetings-error"
      }, JSX_("div", {
        className: "meetings-error--content"
      }, JSX_("i", {
        className: `
                                sprite-fm-illustration-wide
                                ${mega.ui.isDarkTheme() ? 'mega-logo-dark' : 'img-mega-logo-light'}
                            `
      }), JSX_("h1", null, l[200]), JSX_("span", null, "Please ", JSX_(ui_link.A, {
        onClick: this.handleRetry
      }, "try again"), " or\xA0", JSX_(ui_link.A, {
        onClick: () => location.reload()
      }, "reload the page"), "."), d && JSX_("div", {
        className: "meetings-error--details"
      }, error.toString())));
    }
    return this.props.children;
  }
}
// EXTERNAL MODULE: ./js/chat/ui/fallback.jsx
const fallback = REQ_(3439);
;// ./js/chat/ui/conversations.jsx









const LeftPanel = (0,external_React_.lazy)(() => REQ_.e( 493).then(REQ_.bind(REQ_, 4907)));
const EmptyConversationsPanel = (0,external_React_.lazy)(() => REQ_.e( 493).then(REQ_.bind(REQ_, 8596)));
const ChatToaster = (0,external_React_.lazy)(() => REQ_.e( 493).then(REQ_.bind(REQ_, 8491)));
const ConversationPanels = (0,external_React_.lazy)(() => REQ_.e( 493).then(REQ_.bind(REQ_, 5677)).then(m => ({
  default: m.ConversationPanels
})));
const ContactsPanel = (0,external_React_.lazy)(() => REQ_.e( 253).then(REQ_.bind(REQ_, 5392)));
const ScheduleMeetingDialog = (0,external_React_.lazy)(() => REQ_.e( 716).then(REQ_.bind(REQ_, 8389)));
const ScheduleOccurrenceDialog = (0,external_React_.lazy)(() => REQ_.e( 716).then(REQ_.bind(REQ_, 4156)));
const ContactSelectorDialog = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 2678)));
const StartGroupChatWizard = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 5199)));
const StartMeetingDialog = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 7190)));
const VIEWS = {
  CHATS: 0x00,
  MEETINGS: 0x01,
  LOADING: 0x02
};
const EVENTS = {
  NAV_RENDER_VIEW: 'navRenderView'
};
window.convAppConstants = {
  VIEWS,
  EVENTS
};
class ConversationsApp extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.chatRoomRef = null;
    this.occurrenceRef = null;
    this.state = {
      startGroupChatDialog: false,
      startMeetingDialog: false,
      scheduleMeetingDialog: false,
      scheduleOccurrenceDialog: false,
      freeCallEndedDialog: false,
      contactSelectorDialog: false,
      view: VIEWS.LOADING,
      callExpanded: false,
      ipcData: null
    };
    this._cacheRouting();
    megaChat.rebind('onStartNewMeeting.convApp', () => this.startMeeting());
  }
  startMeeting() {
    if (megaChat.hasSupportForCalls) {
      return (0,utils.dQ)().then(() => this.setState({
        startMeetingDialog: true
      })).catch(() => d && console.warn('Already in a call.'));
    }
    return showToast('warning', l[7211]);
  }
  _cacheRouting() {
    this.routingSection = this.props.megaChat.routingSection;
    this.routingSubSection = this.props.megaChat.routingSubSection;
    this.routingParams = this.props.megaChat.routingParams;
  }
  hasOpenDialog() {
    return [...document.querySelectorAll('.mega-dialog')].some(dialog => !!(dialog.offsetParent || dialog.offsetWidth || dialog.offsetHeight));
  }
  specShouldComponentUpdate() {
    if (this.routingSection !== this.props.megaChat.routingSection || this.routingSubSection !== this.props.megaChat.routingSubSection || this.routingParams !== this.props.megaChat.routingParams) {
      this._cacheRouting();
      return true;
    }
  }
  componentDidMount() {
    super.componentDidMount();
    $(document).rebind('keydown.megaChatTextAreaFocus', e => {
      if (!M.chat || e.megaChatHandled) {
        return;
      }
      const {
        currentlyOpenedChat
      } = megaChat;
      const currentRoom = megaChat.getCurrentRoom();
      if (currentlyOpenedChat) {
        if (currentRoom && currentRoom.isReadOnly() || $(e.target).is(".messages-textarea, input, textarea") || (e.ctrlKey || e.metaKey || e.which === 19) && e.keyCode === 67 || e.keyCode === 91 || e.keyCode === 17 || e.keyCode === 27 || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || this.hasOpenDialog() || document.querySelector('textarea:focus,select:focus,input:focus')) {
          return;
        }
        const $typeArea = $('.messages-textarea:visible:first');
        moveCursortoToEnd($typeArea);
        e.megaChatHandled = true;
        $typeArea.triggerHandler(e);
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
    $(document).rebind('mouseup.megaChatTextAreaFocus', e => {
      if (!M.chat || e.megaChatHandled || slideshowid) {
        return;
      }
      const $target = $(e.target);
      if (megaChat.currentlyOpenedChat) {
        if ($target.is(".messages-textarea,a,input,textarea,select,button") || $target.is('i') && $target.parent().is('a,input,select,button') || $target.closest('.messages.scroll-area').length > 0 || $target.closest('.mega-dialog').length > 0 || this.hasOpenDialog() || document.querySelector('textarea:focus,select:focus,input:focus') || window.getSelection().toString()) {
          return;
        }
        const $typeArea = $('.messages-textarea:visible:first');
        if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
          $typeArea.trigger("focus");
          e.megaChatHandled = true;
        }
      }
    });
    megaChat.rebind(megaChat.plugins.meetingsManager.EVENTS.EDIT, (ev, chatOrOccurrence) => {
      if (chatOrOccurrence instanceof ChatRoom || !chatOrOccurrence) {
        this.chatRoomRef = chatOrOccurrence;
        this.setState({
          scheduleMeetingDialog: true
        });
      } else {
        this.occurrenceRef = chatOrOccurrence;
        this.setState({
          scheduleOccurrenceDialog: true
        });
      }
    });
    megaChat.rebind(EVENTS.NAV_RENDER_VIEW, ({
      data
    }) => {
      if (Object.values(VIEWS).includes(data)) {
        this.renderView(data);
      }
    });
    megaChat.rebind('onCallTimeLimitExceeded', () => {
      this.setState({
        freeCallEndedDialog: true
      });
    });
    if (megaChat.WITH_SELF_NOTE && !megaChat.getNoteChat() && !is_chatlink) {
      api.req({
        a: 'mcc',
        u: [],
        m: 0,
        g: 0,
        v: Chatd.VERSION
      }).catch(dump);
    }
    this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => {
      this.setState({
        ipcData: this.makeIpcData()
      });
    });
    this.setState({
      ipcData: this.makeIpcData()
    });
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    $(document).off('keydown.megaChatTextAreaFocus');
    mBroadcaster.removeListener('fmViewUpdate:ipc', this.requestReceivedListener);
  }
  componentDidUpdate(prevProps, prevState) {
    this.handleOnboardingStep();
    const {
      names: prevNames
    } = prevState.ipcData;
    const newIpcData = this.makeIpcData();
    const {
      names: newNames
    } = newIpcData;
    if (newNames.size !== prevNames.size) {
      this.setState({
        ipcData: newIpcData
      });
      return;
    }
    let different = false;
    for (const [email, name] of newNames) {
      if (!prevNames.has(email) || prevNames.get(email) !== name) {
        different = true;
        break;
      }
    }
    if (different) {
      this.setState({
        ipcData: newIpcData
      });
    }
  }
  handleOnboardingStep() {
    if (this.state.view === VIEWS.LOADING) {
      return;
    }
    megaChat.plugins.chatOnboarding.checkAndShowStep();
  }
  renderView(view) {
    this.setState({
      view
    }, () => {
      const {
        $chatTreePanePs,
        routingSection,
        currentlyOpenedChat
      } = megaChat;
      Object.values($chatTreePanePs).forEach(ref => ref.reinitialise == null ? void 0 : ref.reinitialise());
      if (routingSection !== 'chat') {
        loadSubPage('fm/chat');
      }
      megaChat.currentlyOpenedView = view;
      if (!currentlyOpenedChat) {
        megaChat.renderListing(null, false).catch(dump);
      }
    });
  }
  makeIpcData() {
    let mixed = false;
    const names = new Map();
    const data = Object.values(M.ipc).reduce((acc, curr) => {
      const name = M.getNameByEmail(curr.m);
      if (name !== curr.m) {
        names.set(curr.m, name);
        mixed = true;
      }
      return {
        ...acc,
        [curr.p]: {
          ...curr,
          name
        }
      };
    }, Object.create(null));
    return {
      mixed,
      data,
      names
    };
  }
  render() {
    const {
      CHATS,
      MEETINGS
    } = VIEWS;
    const {
      routingSection,
      chatUIFlags,
      currentlyOpenedChat,
      chats
    } = megaChat;
    const {
      view,
      startGroupChatDialog,
      startMeetingDialog,
      scheduleMeetingDialog,
      scheduleOccurrenceDialog,
      callExpanded,
      freeCallEndedDialog,
      contactSelectorDialog
    } = this.state;
    const isEmpty = chats && routingSection === 'chat' && !currentlyOpenedChat && !is_chatlink;
    const isLoading = !currentlyOpenedChat && megaChat.allChatsHadInitialLoadedHistory() === false && routingSection !== 'contacts';
    const rightPane = JSX_("div", {
      className: `
                    fm-right-files-block
                    in-chat
                    ${is_chatlink ? 'chatlink' : ''}
                `
    }, JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, !isLoading && JSX_(ChatToaster, {
      isRootToaster: true
    }), !isLoading && routingSection === 'contacts' && JSX_(ContactsPanel, {
      megaChat,
      contacts: M.u,
      received: this.state.ipcData,
      sent: M.opc
    }), !isLoading && JSX_(ConversationPanels, (0,esm_extends.A)({}, this.props, {
      className: routingSection === 'chat' ? '' : 'hidden',
      routingSection,
      currentlyOpenedChat,
      isEmpty,
      chatUIFlags,
      onToggleExpandedFlag: () => this.setState(() => ({
        callExpanded: (0,utils.Av)()
      })),
      onMount: () => {
        const chatRoom = megaChat.getCurrentRoom();
        const view = chatRoom && chatRoom.isMeeting ? MEETINGS : CHATS;
        this.setState({
          view
        }, () => {
          megaChat.currentlyOpenedView = view;
        });
      }
    })), !isLoading && isEmpty && JSX_(EmptyConversationsPanel, {
      isMeeting: view === MEETINGS,
      onNewChat: () => this.setState({
        contactSelectorDialog: true
      }),
      onStartMeeting: () => this.startMeeting(),
      onScheduleMeeting: () => this.setState({
        scheduleMeetingDialog: true
      })
    })), !isLoading && routingSection === 'notFound' && JSX_("span", null, JSX_("center", null, "Section not found")));
    const noteChat = megaChat.getNoteChat();
    return JSX_(ErrorBoundary, null, JSX_("div", {
      ref: this.domRef,
      className: "conversationsApp"
    }, JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, startMeetingDialog && JSX_(StartMeetingDialog, {
      onStart: (topic, audio, video) => {
        megaChat.createAndStartMeeting(topic, audio, video);
        this.setState({
          startMeetingDialog: false
        });
      },
      onClose: () => this.setState({
        startMeetingDialog: false
      })
    }), startGroupChatDialog && JSX_(StartGroupChatWizard, {
      name: "start-group-chat",
      flowType: 1,
      onClose: () => this.setState({
        startGroupChatDialog: false
      }),
      onConfirmClicked: () => this.setState({
        startGroupChatDialog: false
      })
    }), scheduleMeetingDialog && JSX_(ScheduleMeetingDialog, {
      chatRoom: this.chatRoomRef,
      callExpanded,
      onClose: () => {
        this.setState({
          scheduleMeetingDialog: false
        }, () => {
          this.chatRoomRef = null;
        });
      }
    }), scheduleOccurrenceDialog && JSX_(ScheduleOccurrenceDialog, {
      chatRoom: this.occurrenceRef.scheduledMeeting.chatRoom,
      scheduledMeeting: this.occurrenceRef.scheduledMeeting,
      occurrenceId: this.occurrenceRef.uid,
      callExpanded,
      onClose: () => {
        this.setState({
          scheduleOccurrenceDialog: false
        }, () => {
          this.occurrenceRef = null;
        });
      }
    }), contactSelectorDialog && JSX_(ContactSelectorDialog, {
      className: `main-start-chat-dropdown ${leftPanel_utils.C}-contact-selector`,
      multiple: false,
      topButtons: [{
        key: 'newGroupChat',
        title: l[19483],
        className: 'positive',
        onClick: () => this.setState({
          startGroupChatDialog: true,
          contactSelectorDialog: false
        })
      }, ...megaChat.WITH_SELF_NOTE ? (0,contactsPanel_utils.SN)() || noteChat && noteChat.hasMessages() ? [] : [{
        key: 'noteChat',
        title: l.note_label,
        icon: 'sprite-fm-mono icon-file-text-thin-outline note-chat-icon',
        onClick: () => {
          closeDialog();
          loadSubPage(`fm/chat/p/${u_handle}`);
        }
      }] : []],
      showAddContact: (0,contactsPanel_utils.SN)(),
      onClose: () => this.setState({
        contactSelectorDialog: false
      }),
      onSelectDone: selected => {
        if (selected.length === 1) {
          return megaChat.createAndShowPrivateRoom(selected[0]).then(room => room.setActive());
        }
        megaChat.createAndShowGroupRoomFor(selected);
      }
    })), JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, JSX_(LeftPanel, {
      view,
      views: VIEWS,
      routingSection,
      conversations: chats,
      renderView: view => this.renderView(view),
      startMeeting: () => {
        this.startMeeting();
        eventlog(500293);
      },
      scheduleMeeting: () => {
        this.setState({
          scheduleMeetingDialog: true
        });
        delay('chat-event-sm-button-main', () => eventlog(99918));
      },
      createNewChat: () => this.setState({
        contactSelectorDialog: true
      })
    })), freeCallEndedDialog && JSX_(FreeCallEnded, {
      onClose: () => {
        this.setState({
          freeCallEndedDialog: false
        });
      }
    }), rightPane));
  }
}
 const conversations = ConversationsApp;

 },

 5155
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   $: () =>  Button
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _chat_mixins_js2__ = REQ_(8264);



const BLURRABLE_CLASSES = '.conversationsApp, .join-meeting, .main-blur-block';
class Button extends _chat_mixins_js2__ .w9 {
  constructor(props) {
    super(props);
    this.domRef = react1___default().createRef();
    this.buttonClass = `.button`;
    this.state = {
      focused: false,
      hovered: false,
      iconHovered: ''
    };
    this.onBlur = e => {
      let _this$domRef;
      if (!this.isMounted()) {
        return;
      }
      if (!e || !$(e.target).closest(this.buttonClass).is((_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current)) {
        this.setState({
          focused: false
        }, () => {
          this.unbindEvents();
          this.safeForceUpdate();
        });
      }
    };
    this.onClick = e => {
      let _this$domRef2;
      if (this.props.disabled === true) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ($(e.target).closest('.popup').closest(this.buttonClass).is((_this$domRef2 = this.domRef) == null ? void 0 : _this$domRef2.current) && this.state.focused === true) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if ($(e.target).is('input, textarea, select')) {
        return;
      }
      if (this.state.focused === false) {
        if (this.props.onClick) {
          this.props.onClick(this, e);
        } else if (react1___default().Children.count(this.props.children) > 0) {
          this.setState({
            focused: true
          }, () => this.safeForceUpdate());
        }
      } else if (this.state.focused === true) {
        this.setState({
          focused: false
        });
        this.unbindEvents();
      }
    };
    this.state.iconHovered = this.props.iconHovered || '';
  }
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (nextProps.disabled === true && nextState.focused === true) {
      nextState.focused = false;
    }
    if (this.state.focused !== nextState.focused && nextState.focused === true) {
      this.bindEvents();
      if (this._pageChangeListener) {
        mBroadcaster.removeListener(this._pageChangeListener);
      }
      this._pageChangeListener = mBroadcaster.addListener('pagechange', () => {
        if (this.state.focused === true) {
          this.onBlur();
        }
      });
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }
  renderChildren() {
    return this.props.children && react1___default().Children.map(this.props.children, child => child && (typeof child.type === 'string' || child.type === undefined ? child : react1___default().cloneElement(child, {
      active: this.state.focused,
      closeDropdown: () => this.setState({
        focused: false
      }, () => this.unbindEvents()),
      onActiveChange: active => {
        let _this$domRef3;
        const $element = $(((_this$domRef3 = this.domRef) == null ? void 0 : _this$domRef3.current) || this.domNode);
        const $scrollables = $element.parents('.ps');
        if ($scrollables.length > 0) {
          $scrollables.map((k, element) => Ps[active ? 'disable' : 'enable'](element));
        }
        child.props.onActiveChange == null || child.props.onActiveChange(active);
        return this[active ? 'bindEvents' : 'unbindEvents']();
      }
    })));
  }
  bindEvents() {
    $(BLURRABLE_CLASSES).rebind(`mousedown.button--${this.getUniqueId()}`, this.onBlur);
    $(document).rebind(`keyup.button--${this.getUniqueId()}`, ev => this.state.focused === true && ev.keyCode === 27 && this.onBlur());
    $(document).rebind(`closeDropdowns.${this.getUniqueId()}`, this.onBlur);
  }
  unbindEvents() {
    $(BLURRABLE_CLASSES).unbind(`mousedown.button--${this.getUniqueId()}`);
    $(document).off(`keyup.button--${this.getUniqueId()}`);
    $(document).off(`closeDropdowns.${this.getUniqueId()}`);
    mBroadcaster.removeListener(this._pageChangeListener);
  }
  render() {
    const {
      className,
      disabled,
      style,
      icon,
      iconHovered,
      label,
      attrs,
      toggle,
      secondLabel,
      secondLabelClass
    } = this.props;
    const isMegaButton = className && className.indexOf('mega-button') > -1;
    const TagName = isMegaButton ? 'button' : 'div';
    return JSX_(TagName, (0,_babel_runtime_helpers_extends0__ .A)({
      ref: this.domRef,
      className: `
                    button
                    ${className || ''}
                    ${disabled ? 'disabled' : ''}
                    ${this.state.focused ? 'active active-dropdown' : ''}
                `,
      style,
      onClick: this.onClick,
      onMouseEnter: () => iconHovered && this.setState({
        hovered: true
      }),
      onMouseLeave: () => iconHovered && this.setState({
        hovered: false
      })
    }, attrs), icon && !isMegaButton && JSX_("div", null, JSX_("i", {
      className: this.state.hovered ? this.state.iconHovered : icon
    })), icon && isMegaButton && JSX_("div", null, JSX_("i", {
      className: this.state.hovered ? this.state.iconHovered : icon
    })), label && JSX_("span", null, label), secondLabel && JSX_("span", {
      className: secondLabelClass ? secondLabelClass : ''
    }, secondLabel), toggle && JSX_("div", {
      className: `
                            mega-switch
                            ${toggle.className ? toggle.className : ''}
                            ${toggle.enabled ? 'toggle-on' : ''}
                        `,
      role: "switch",
      "aria-checked": !!toggle.enabled,
      onClick: ev => {
        ev.stopPropagation();
        if (this.props.toggle.onClick) {
          this.props.toggle.onClick();
        }
      }
    }, JSX_("div", {
      className: `mega-feature-switch sprite-fm-mono-after
                                ${toggle.enabled ? 'icon-check-after' : 'icon-minimise-after'}`
    })), this.renderChildren());
  }
}

 },

 5206
(module) {

"use strict";
module.exports = ReactDOM;

 },

 5470
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  ScheduleMetaChange
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixin_jsx1__ = REQ_(855);
 const _contacts_jsx2__ = REQ_(8022);
 const _ui_utils_jsx3__ = REQ_(6411);
 const _ui_buttons_jsx4__ = REQ_(5155);





class ScheduleMetaChange extends _mixin_jsx1__ .M {
  constructor(...args) {
    super(...args);
    this.state = {
      link: ''
    };
  }
  componentDidMount() {
    super.componentDidMount();
    if (this.props.mode === ScheduleMetaChange.MODE.CREATED) {
      if (is_chatlink) {
        this.setState({
          link: `${getBaseUrl()}/chat/${is_chatlink.ph}#${is_chatlink.key}`
        });
      } else {
        const {
          chatRoom
        } = this.props;
        chatRoom.updatePublicHandle().then(() => {
          if (this.isMounted() && !this.state.link && chatRoom.publicLink) {
            this.setState({
              link: `${getBaseUrl()}/${chatRoom.publicLink}`
            });
          }
        }).catch(dump);
      }
    }
    if (this.props.message.meta.ap) {
      const {
        meetingsManager
      } = megaChat.plugins;
      this.redrawListener = `${meetingsManager.EVENTS.OCCURRENCES_UPDATE}.redraw${this.getUniqueId()}`;
      megaChat.rebind(this.redrawListener, () => {
        onIdle(() => {
          const {
            meta
          } = this.props.message;
          if (!meta.ap) {
            return;
          }
          this.props.message.meta = meetingsManager.noCsMeta(meta.handle, meta.ap, megaChat.chats[meta.cid]);
          this.safeForceUpdate();
        });
        megaChat.off(this.redrawListener);
        delete this.redrawListener;
      });
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this.redrawListener) {
      megaChat.off(this.redrawListener);
    }
  }
  specShouldComponentUpdate(nextProps) {
    if (this.props.mode === ScheduleMetaChange.MODE.CREATED && this.props.link !== nextProps.link) {
      return true;
    }
    return null;
  }
  componentDidUpdate(prevProps) {
    if (this.props.mode === ScheduleMetaChange.MODE.CREATED && prevProps.link !== this.props.link) {
      this.setState({
        link: this.props.link ? `${getBaseUrl()}/${this.props.link}` : ''
      });
    }
  }
  onAddToCalendar() {
    const {
      chatRoom
    } = this.props;
    const {
      id,
      title
    } = chatRoom && chatRoom.scheduledMeeting || {};
    if (id) {
      delay(`fetchical${id}`, () => {
        eventlog(500038);
        asyncApiReq({
          a: 'mcsmfical',
          id
        }).then(([, res]) => {
          delay(`saveical${id}`, () => {
            M.saveAs(base64urldecode(res), `${title.replace(/\W/g, '')}.ics`).then(nop).catch(() => {
              msgDialog('error', '', l.calendar_add_failed, '');
            });
          }, 1000);
        }).catch(() => {
          msgDialog('error', '', l.calendar_add_failed, '');
        });
      }, 250);
    }
  }
  static getTitleText(meta) {
    const {
      mode,
      recurring,
      occurrence,
      converted,
      prevTiming
    } = meta;
    const {
      MODE
    } = ScheduleMetaChange;
    switch (mode) {
      case MODE.CREATED:
        {
          return recurring ? l.schedule_mgmt_new_recur : l.schedule_mgmt_new;
        }
      case MODE.EDITED:
        {
          if (converted) {
            return recurring ? l.schedule_mgmt_update_convert_recur : l.schedule_mgmt_update_convert;
          }
          if (occurrence) {
            return l.schedule_mgmt_update_occur;
          }
          if (prevTiming) {
            return recurring ? l.schedule_mgmt_update_recur : l.schedule_mgmt_update;
          }
          return l.schedule_mgmt_update_desc;
        }
      case MODE.CANCELLED:
        {
          if (recurring) {
            return occurrence ? l.schedule_mgmt_cancel_occur : l.schedule_mgmt_cancel_recur;
          }
          return l.schedule_mgmt_cancel;
        }
    }
    return '';
  }
  renderTimingBlock() {
    const {
      message,
      mode
    } = this.props;
    const {
      meta
    } = message;
    const {
      MODE
    } = ScheduleMetaChange;
    if (mode === MODE.CANCELLED && !meta.occurrence) {
      return null;
    }
    const [now, prev] = megaChat.plugins.meetingsManager.getOccurrenceStrings(meta);
    return JSX_("div", {
      className: "schedule-timing-block"
    }, meta.prevTiming && JSX_("s", null, prev || ''), now);
  }
  checkAndFakeOccurrenceMeta(meta) {
    const {
      MODE
    } = ScheduleMetaChange;
    if (meta.occurrence && meta.mode === MODE.CANCELLED && !meta.calendar) {
      const meeting = megaChat.plugins.meetingsManager.getMeetingOrOccurrenceParent(meta.handle);
      if (meeting) {
        const occurrences = meeting.getOccurrencesById(meta.handle);
        if (occurrences) {
          meta.calendar = {
            date: new Date(occurrences[0].start).getDate(),
            month: time2date(Math.floor(occurrences[0].start / 1000), 12)
          };
          meta.timeRules.startTime = Math.floor(occurrences[0].start / 1000);
          meta.timeRules.endTime = Math.floor(occurrences[0].end / 1000);
        }
      }
    }
  }
  render() {
    const {
      chatRoom,
      message,
      mode,
      contact
    } = this.props;
    const {
      meta,
      messageId
    } = message;
    const {
      scheduledMeeting
    } = chatRoom;
    const {
      MODE
    } = ScheduleMetaChange;
    const {
      link
    } = this.state;
    if (meta.gone) {
      return null;
    }
    this.checkAndFakeOccurrenceMeta(meta);
    return JSX_("div", null, JSX_("div", {
      className: "message body",
      "data-id": `id${messageId}`,
      key: messageId
    }, JSX_(_contacts_jsx2__ .eu, {
      contact: contact.u,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom
    }), JSX_("div", {
      className: "message schedule-message content-area small-info-txt selectable-txt"
    }, JSX_(_contacts_jsx2__ .bq, {
      className: "message",
      chatRoom,
      contact,
      label: JSX_(_ui_utils_jsx3__ .zT, null, M.getNameByHandle(contact.u))
    }), JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp())
    }, this.getTimestampAsString()), JSX_("div", {
      className: "message text-block"
    }, ScheduleMetaChange.getTitleText(meta), " ", !!d && meta.handle), JSX_("div", {
      className: "message body-block"
    }, (meta.prevTiming || meta.calendar || meta.topic && meta.onlyTitle || meta.recurring) && JSX_("div", {
      className: "schedule-detail-block"
    }, meta.calendar && scheduledMeeting && (meta.recurring && !scheduledMeeting.recurring || meta.occurrence && meta.mode === MODE.CANCELLED || !meta.recurring) && JSX_("div", {
      className: "schedule-calendar-icon"
    }, JSX_("div", {
      className: "schedule-date"
    }, meta.calendar.date), JSX_("div", {
      className: "schedule-month"
    }, meta.calendar.month)), JSX_("div", {
      className: "schedule-detail-main"
    }, JSX_("div", {
      className: "schedule-meeting-title"
    }, mode === MODE.CANCELLED ? JSX_("s", null, meta.topic || chatRoom.topic) : meta.topic || chatRoom.topic), this.renderTimingBlock()), chatRoom.iAmInRoom() && scheduledMeeting && mode !== MODE.CANCELLED && JSX_(_ui_buttons_jsx4__ .$, {
      className: "mega-button",
      onClick: () => this.onAddToCalendar()
    }, JSX_("span", null, mode === MODE.CREATED && !meta.occurrence ? l.schedule_add_calendar : l.schedule_update_calendar))), mode === MODE.CREATED && scheduledMeeting && scheduledMeeting.description && JSX_("div", {
      className: "schedule-description"
    }, JSX_(_ui_utils_jsx3__ .P9, null, megaChat.html(scheduledMeeting.description).replace(/\n/g, '<br>'))), link && JSX_("div", null, JSX_("div", {
      className: "schedule-link-instruction"
    }, l.schedule_mgmt_link_instruct), JSX_("div", {
      className: "schedule-meeting-link"
    }, JSX_("span", null, link), JSX_(_ui_buttons_jsx4__ .$, {
      className: "mega-button positive",
      onClick: () => {
        copyToClipboard(link, l[7654]);
        delay('chat-event-sm-copy-link', () => eventlog(500039));
      }
    }, JSX_("span", null, l[63]))), JSX_("span", null, l.schedule_link_note))))));
  }
}
ScheduleMetaChange.MODE = {
  CREATED: 1,
  EDITED: 2,
  CANCELLED: 3
};
window.ScheduleMetaChange = ScheduleMetaChange;

 },

 5779
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   O1: () =>  prepareExportIo,
   VV: () =>  prepareExportStreams,
   li: () =>  withSuspense
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _ui_fallback_jsx1__ = REQ_(3439);


async function prepareExportIo(dl) {
  const {
    zname,
    size
  } = dl;
  if (window.isSecureContext && typeof showSaveFilePicker === 'function' && typeof FileSystemFileHandle !== 'undefined' && 'createWritable' in FileSystemFileHandle.prototype && typeof FileSystemWritableFileStream !== 'undefined' && 'seek' in FileSystemWritableFileStream.prototype) {
    const file = await window.showSaveFilePicker({
      suggestedName: zname
    }).catch(ex => {
      if (String(ex).includes('aborted')) {
        throw new Error('Aborted');
      }
      dump(ex);
    });
    if (file) {
      const stream = await file.createWritable().catch(dump);
      if (stream) {
        return {
          stream,
          write (data, position, done) {
            this.stream.write({
              type: 'write',
              position,
              data
            }).then(done).catch(dump);
          },
          download () {
            this.abort();
          },
          abort () {
            this.stream.close();
          },
          setCredentials () {
            this.begin();
          }
        };
      }
    }
  }
  if (MemoryIO.usable() && Math.min(MemoryIO.fileSizeLimit, 94371840) > size) {
    return new MemoryIO('chat_0', dl);
  } else if (window.requestFileSystem) {
    return new FileSystemAPI('chat_0', dl);
  }
  throw new Error('Download methods are unsupported');
}
function prepareExportStreams(attachNodes, onEmpty) {
  return attachNodes.map(node => {
    return {
      name: node.name,
      lastModified: new Date((node.mtime || node.ts) * 1000),
      input: M.gfsfetch.getReadableStream(node, {
        error(ex, n) {
          if (d) {
            console.error(`${n.h}: ${ex}`);
          }
          onEmpty(n.s);
        }
      })
    };
  });
}
const withSuspense = Component => {
  const Wrapped = props => JSX_(react0__.Suspense, {
    fallback: JSX_(_ui_fallback_jsx1__ .A, null)
  }, JSX_(Component, props));
  Wrapped.displayName = `withSuspense(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

 },

 6411
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   Ay: () => __WEBPACK_DEFAULT_EXPORT__,
   P9: () =>  ParsedHTML,
   T9: () =>  withOverflowObserver,
   lI: () =>  reactStringWrap,
   oM: () =>  OFlowParsedHTML,
   sp: () =>  OFlowEmoji,
   zT: () =>  Emoji
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const react_dom1__ = REQ_(5206);
 const react_dom1___default = REQ_.n(react_dom1__);
 const _chat_mixins_js2__ = REQ_(8264);



class RenderTo extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.$$rootRef = undefined;
    this.popupElement = undefined;
  }
  _setClassNames() {
    this.popupElement.className = this.props.className || '';
  }
  _renderLayer() {
    this.$$rootRef.render(this.props.children);
    queueMicrotask(() => {
      let _this$props$popupDidM, _this$props;
      return (_this$props$popupDidM = (_this$props = this.props).popupDidMount) == null ? void 0 : _this$props$popupDidM.call(_this$props, this.popupElement);
    });
  }
  componentDidUpdate() {
    this._setClassNames();
    this._renderLayer();
  }
  componentWillUnmount() {
    let _this$props$popupWill, _this$props2;
    onIdle(() => this.$$rootRef.unmount());
    (_this$props$popupWill = (_this$props2 = this.props).popupWillUnmount) == null || _this$props$popupWill.call(_this$props2, this.popupElement);
    this.props.element.removeChild(this.popupElement);
  }
  componentDidMount() {
    this.popupElement = document.createElement('div');
    this.$$rootRef = (0,react_dom1__.createRoot)(this.popupElement);
    this._setClassNames();
    if (this.props.style) {
      $(this.popupElement).css(this.props.style);
    }
    this.props.element.appendChild(this.popupElement);
    this._renderLayer();
  }
  render() {
    return null;
  }
}
const withOverflowObserver = Component => class extends _chat_mixins_js2__ .u9 {
  constructor(props) {
    super(props);
    this.displayName = 'OverflowObserver';
    this.ref = react0___default().createRef();
    this.state = {
      overflowed: false
    };
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
  }
  handleMouseEnter() {
    const element = this.ref && this.ref.current;
    if (element) {
      this.setState({
        overflowed: element.scrollWidth > element.offsetWidth
      });
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.overflowed !== this.state.overflowed || nextProps.children !== this.props.children || nextProps.content !== this.props.content;
  }
  render() {
    const {
      simpletip
    } = this.props;
    return JSX_("div", {
      ref: this.ref,
      className: `
                        overflow-observer
                        ${this.state.overflowed ? 'simpletip simpletip-tc' : ''}
                    `,
      "data-simpletipposition": (simpletip == null ? void 0 : simpletip.position) || 'top',
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": (simpletip == null ? void 0 : simpletip.className) || 'medium-width center-align',
      onMouseEnter: this.handleMouseEnter
    }, JSX_(Component, this.props));
  }
};
const Emoji = ({
  children
}) => {
  return JSX_(ParsedHTML, {
    content: megaChat.html(children)
  });
};
class ParsedHTML extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.ref = react0___default().createRef();
  }
  updateInternalState() {
    const {
      children,
      content
    } = this.props;
    const ref = this.ref && this.ref.current;
    if (!children && !content) {
      return d > 1 && console.warn('Emoji: No content passed.');
    }
    if (ref) {
      if (ref.childNodes.length) {
        while (ref.firstChild) {
          ref.removeChild(ref.firstChild);
        }
      }
      ref.appendChild(parseHTML(children || content));
    }
  }
  shouldComponentUpdate(nextProps) {
    return nextProps && (nextProps.children !== this.props.children || nextProps.content !== this.props.content);
  }
  componentDidUpdate() {
    this.updateInternalState();
  }
  componentDidMount() {
    this.updateInternalState();
  }
  render() {
    const {
      className,
      onClick,
      tag
    } = this.props;
    return JSX_(tag || 'span', {
      ref: this.ref,
      className,
      onClick
    });
  }
}
const reactStringWrap = (src, find, WrapClass, wrapProps) => {
  const endTag = find.replace('[', '[/');
  return JSX_(react0___default().Fragment, null, src.split(find)[0], JSX_(WrapClass, wrapProps, src.substring(src.indexOf(find) + find.length, src.indexOf(endTag))), src.split(endTag)[1]);
};
const OFlowEmoji = withOverflowObserver(Emoji);
const OFlowParsedHTML = withOverflowObserver(ParsedHTML);
 const __WEBPACK_DEFAULT_EXPORT__ = {
  RenderTo,
  SoonFcWrap: _chat_mixins_js2__ .hG,
  OFlowEmoji,
  OFlowParsedHTML
};

 },

 6521
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   PS: () =>  addMonths,
   We: () =>  stringToTime,
   XH: () =>  stringToDate,
   a4: () =>  getTimeIntervals,
   cK: () =>  isToday,
   dB: () =>  getUserTimezone,
   ef: () =>  isTomorrow,
   i_: () =>  getNearestHalfHour,
   ro: () =>  isSameDay
 });

const stringToDate = string => {
  return moment(string, ['DD MMM YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY', 'MMM DD YYYY', 'YYYY MMM DD', 'YYYY DD MMM']);
};
const stringToTime = string => moment(string, ['HH:mm', 'hh:mm A']);
const isSameDay = (a, b) => {
  return new Date(a).toDateString() === new Date(b).toDateString();
};
const isToday = timestamp => {
  return new Date(timestamp).toDateString() === new Date().toDateString();
};
const isTomorrow = timestamp => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toDateString() === new Date(timestamp).toDateString();
};
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};
const addMonths = (timestamp, months) => {
  const date = new Date(timestamp);
  return new Date(date.setMonth(date.getMonth() + months)).getTime();
};
const getNearestHalfHour = (timestamp = Date.now()) => {
  const {
    SCHEDULED_MEETINGS_INTERVAL
  } = ChatRoom;
  return new Date(Math.ceil(timestamp / SCHEDULED_MEETINGS_INTERVAL) * SCHEDULED_MEETINGS_INTERVAL).getTime();
};
const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
const getTimeIntervals = (timestamp, offsetFrom, interval = 30) => {
  const increments = [];
  if (timestamp) {
    const [targetDate, initialDate] = [new Date(timestamp), new Date(timestamp)].map(date => {
      date.setHours(0);
      date.setMinutes(0);
      return date;
    });
    while (targetDate.getDate() === initialDate.getDate()) {
      const timestamp = targetDate.getTime();
      const diff = offsetFrom && timestamp - offsetFrom;
      increments.push({
        value: timestamp,
        label: toLocaleTime(timestamp),
        duration: diff && diff > 0 ? diff : undefined
      });
      targetDate.setMinutes(targetDate.getMinutes() + interval);
    }
  }
  return increments;
};

 },

 6740
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () => __WEBPACK_DEFAULT_EXPORT__
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);

class Group extends react0___default().Component {
  constructor(props) {
    super(props);
    this.containerRef = react0___default().createRef();
    this.state = {
      expanded: false
    };
    this.doToggle = this.doToggle.bind(this);
  }
  toggleEvents() {
    return this.state.expanded ? $(document).rebind(`mousedown.${Group.NAMESPACE}`, ev => !this.containerRef.current.contains(ev.target) && this.doToggle()).rebind(`keydown.${Group.NAMESPACE}`, ({
      keyCode
    }) => keyCode && keyCode === 27 && this.doToggle()) : $(document).unbind(`.${Group.NAMESPACE}`);
  }
  doToggle() {
    this.setState(state => ({
      expanded: !state.expanded
    }), () => this.toggleEvents());
  }
  render() {
    const {
      active,
      warn,
      onHold,
      screenSharing,
      children
    } = this.props;
    if (children && children.length) {
      return JSX_("div", {
        ref: this.containerRef,
        className: Group.BASE_CLASS
      }, JSX_("div", {
        className: `
                            ${Group.BASE_CLASS}-menu
                            ${this.state.expanded ? 'expanded' : ''}
                        `,
        onClick: this.doToggle
      }, children.map(item => {
        return item && JSX_("div", {
          key: item.key,
          className: `${Group.BASE_CLASS}-item`
        }, item);
      })), JSX_("button", {
        className: "mega-button theme-light-forced round large",
        onClick: this.doToggle
      }, active && JSX_("div", {
        className: "info-indicator active"
      }), warn && JSX_("div", {
        className: "info-indicator warn simpletip",
        "data-simpletip": l.screen_share_crop_tip,
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5",
        "data-simpletip-class": "theme-dark-forced"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-exclamation-filled"
      })), JSX_("i", {
        className: `
                                sprite-fm-mono
                                ${screenSharing ? 'icon-end-screenshare' : ''}
                                ${!onHold && !screenSharing && 'icon-options'}
                            `
      })));
    }
    return null;
  }
}
Group.NAMESPACE = 'buttonGroup';
Group.BASE_CLASS = 'button-group';
class Button extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.buttonRef = react0___default().createRef();
  }
  componentDidUpdate() {
    if (this.props.simpletip) {
      $(this.buttonRef.current).trigger('simpletipUpdated');
    }
  }
  componentDidMount() {
    if (this.props.didMount) {
      this.props.didMount(this);
    }
  }
  render() {
    const {
      children,
      className,
      style,
      simpletip,
      icon,
      onClick
    } = this.props;
    return JSX_("button", {
      ref: this.buttonRef,
      className: `
                    ${className ? className : ''}
                    ${simpletip ? 'simpletip' : ''}
                `,
      style,
      "data-simpletip": simpletip == null ? void 0 : simpletip.label,
      "data-simpletipposition": simpletip == null ? void 0 : simpletip.position,
      "data-simpletipoffset": simpletip == null ? void 0 : simpletip.offset,
      "data-simpletip-class": simpletip == null ? void 0 : simpletip.className,
      onClick
    }, icon && JSX_("i", {
      className: `sprite-fm-mono ${icon}`
    }), children);
  }
}
Button.Group = Group;
 const __WEBPACK_DEFAULT_EXPORT__ = Button;

 },

 7057
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   U_: () =>  MCO_FLAGS,
   zd: () =>  RETENTION_FORMAT
 });
 const _utils_jsx0__ = REQ_(5779);

const RETENTION_FORMAT = {
  HOURS: 'hour',
  DAYS: 'day',
  WEEKS: 'week',
  MONTHS: 'month',
  DISABLED: 'none'
};
const MCO_FLAGS = {
  OPEN_INVITE: 'oi',
  SPEAK_REQUEST: 'sr',
  WAITING_ROOM: 'w'
};
window.RETENTION_FORMAT = RETENTION_FORMAT;
window.MCO_FLAGS = MCO_FLAGS;
const ChatRoom = function (megaChat, roomId, type, users, ctime, lastActivity, chatId, chatShard, chatdUrl, noUI, publicChatHandle, publicChatKey, ck, isMeeting, retentionTime, mcoFlags, organiser) {
  const self = this;
  this.logger = MegaLogger.getLogger(`room[${  roomId  }]`, {}, megaChat.logger);
  this.megaChat = megaChat;
  MegaDataObject.call(this, {
    state: null,
    users: [],
    roomId: null,
    type: null,
    messages: [],
    ctime: 0,
    lastActivity: 0,
    callRequest: null,
    isCurrentlyActive: false,
    _messagesQueue: [],
    unreadCount: 0,
    chatId: undefined,
    chatdUrl: undefined,
    chatShard: undefined,
    members: {},
    membersSet: false,
    membersLoaded: false,
    topic: '',
    flags: 0x00,
    publicLink: null,
    observers: 0,
    dnd: null,
    alwaysNotify: null,
    retentionTime: 0,
    activeCallIds: null,
    meetingsLoading: null,
    options: {},
    scheduledMeeting: undefined,
    historyTimedOut: false
  });
  this.roomId = roomId;
  this.instanceIndex = ChatRoom.INSTANCE_INDEX++;
  this.type = type;
  this.ctime = ctime;
  this.lastActivity = lastActivity ? lastActivity : 0;
  this.chatd = megaChat.plugins.chatdIntegration.chatd;
  this.chatId = chatId;
  this.chatIdBin = chatId ? base64urldecode(chatId) : "";
  this.chatShard = chatShard;
  this.chatdUrl = chatdUrl;
  this.publicLink = null;
  this.publicChatHandle = publicChatHandle;
  this.publicChatKey = publicChatKey;
  this.ck = ck;
  this.scrolledToBottom = 1;
  this.callRequest = null;
  this.shownMessages = {};
  this.retentionTime = retentionTime;
  this.activeSearches = 0;
  this.activeCallIds = new MegaDataMap(this);
  this.ringingCalls = new MegaDataMap(this);
  this.isMeeting = isMeeting;
  this.isNote = type === 'private' && roomId === u_handle;
  this.callUserLimited = false;
  this.members = Object.create(null);
  Object.defineProperty(this.members, 'hasOwnProperty', {
    value(p) {
      return p in this;
    }
  });
  if (type === "private") {
    users.forEach((userHandle) => {
      self.members[userHandle] = 3;
    });
  } else {
    users.forEach((userHandle) => {
      self.members[userHandle] = 0;
    });
  }
  this.options = {};
  mcoFlags = mcoFlags || {};
  for (const flag of Object.values(MCO_FLAGS)) {
    this.options[flag] = mcoFlags[flag] || 0;
  }
  this.organiser = organiser;
  this.setState(ChatRoom.STATE.INITIALIZED);
  this.isCurrentlyActive = false;
  if (d) {
    this.rebind('onStateChange.chatRoomDebug', (e, oldState, newState) => {
      self.logger.debug("Will change state from: ", ChatRoom.stateToText(oldState), " to ", ChatRoom.stateToText(newState));
    });
  }
  self.rebind('onStateChange.chatRoom', (e, oldState, newState) => {
    if (newState === ChatRoom.STATE.READY && !self.isReadOnly() && self.chatd && self.isOnline() && self.chatIdBin) {
      if (d > 2) {
        self.logger.warn('Restoring persisted messages...', self.type, self.isCurrentlyActive);
      }
      const cim = self.getChatIdMessages();
      cim.restore(true);
    }
  });
  self.rebind('onMessagesBuffAppend.lastActivity', (e, msg) => {
    if (is_chatlink || self.isNote) {
      return;
    }
    const ts = msg.delay ? msg.delay : msg.ts;
    if (!ts) {
      return;
    }
    const contactForMessage = msg && Message.getContactForMessage(msg);
    if (contactForMessage && contactForMessage.u !== u_handle) {
      if (!contactForMessage.ats || contactForMessage.ats < ts) {
        contactForMessage.ats = ts;
      }
    }
    if (self.lastActivity && self.lastActivity >= ts) {
      if (msg.deleted) {
        const {
          delay,
          ts
        } = self.messagesBuff.getLastMessageFromServer();
        self.lastActivity = delay || ts;
      }
      return;
    }
    self.lastActivity = ts;
    if (msg.userId === u_handle) {
      self.didInteraction(u_handle, ts);
      return;
    }
    if (self.type === "private") {
      const targetUserId = self.getParticipantsExceptMe()[0];
      let targetUserNode;
      if (M.u[targetUserId]) {
        targetUserNode = M.u[targetUserId];
      } else if (msg.userId) {
        targetUserNode = M.u[msg.userId];
      } else {
        console.error("Missing participant in a 1on1 room.");
        return;
      }
      assert(targetUserNode && targetUserNode.u, 'No hash found for participant');
      assert(M.u[targetUserNode.u], 'User not found in M.u');
      if (targetUserNode) {
        self.didInteraction(targetUserNode.u, self.lastActivity);
      }
    } else if (self.type === "group" || self.type === "public") {
      let contactHash;
      if (msg.authorContact) {
        contactHash = msg.authorContact.u;
      } else if (msg.userId) {
        contactHash = msg.userId;
      }
      if (contactHash && M.u[contactHash]) {
        self.didInteraction(contactHash, self.lastActivity);
      }
      assert(contactHash, 'Invalid hash for user (extracted from inc. message)');
    } else {
      throw new Error("Not implemented");
    }
  });
  self.rebind('onMembersUpdated.coreRoomDataMngmt', (e, eventData) => {
    if (self.state === ChatRoom.STATE.LEFT && eventData.priv >= 0 && eventData.priv < 255) {
      self.membersLoaded = false;
      self.setState(ChatRoom.STATE.JOINING, true);
    }
    let queuedMembersUpdatedEvent = false;
    if (self.membersLoaded === false) {
      if (eventData.priv >= 0 && eventData.priv < 255) {
        const addParticipant = function addParticipant() {
          self.protocolHandler.addParticipant(eventData.userId);
          self.members[eventData.userId] = eventData.priv;
          ChatdIntegration._ensureContactExists([eventData.userId]);
          self.trigger('onMembersUpdatedUI', eventData);
        };
        if (is_chatlink) {
          megaChat.initContacts([eventData.userId]);
        }
        ChatdIntegration._waitForProtocolHandler(self, addParticipant);
        queuedMembersUpdatedEvent = true;
      }
    } else if (eventData.priv === 255 || eventData.priv === -1) {
      const deleteParticipant = function deleteParticipant() {
        if (eventData.userId === u_handle) {
          Object.keys(self.members).forEach((userId) => {
            self.protocolHandler.removeParticipant(userId);
            self.members[userId] = userId === u_handle ? ChatRoom.MembersSet.PRIVILEGE_STATE.LEFT : ChatRoom.MembersSet.PRIVILEGE_STATE.READONLY;
          });
        } else {
          self.protocolHandler.removeParticipant(eventData.userId);
          delete self.members[eventData.userId];
        }
        self.trigger('onMembersUpdatedUI', eventData);
      };
      ChatdIntegration._waitForProtocolHandler(self, deleteParticipant);
      queuedMembersUpdatedEvent = true;
    }
    if (eventData.userId === u_handle) {
      self.membersLoaded = true;
    }
    if (!queuedMembersUpdatedEvent) {
      self.members[eventData.userId] = eventData.priv;
      self.trigger('onMembersUpdatedUI', eventData);
    }
  });
  if (is_chatlink && !is_chatlink.callId && !this.options.w) {
    const unbind = () => {
      self.unbind('onMessagesHistoryDone.chatlinkAlreadyIn');
      self.unbind('onMembersUpdated.chatlinkAlreadyIn');
    };
    self.rebind('onMembersUpdated.chatlinkAlreadyIn', (e, eventData) => {
      if (eventData.userId === u_handle && eventData.priv >= 0) {
        unbind();
        return this.megaChat.routing.reinitAndOpenExistingChat(this.chatId, this.publicChatHandle);
      }
    });
    self.rebind('onMessagesHistoryDone.chatlinkAlreadyIn', (e, data) => {
      if (!data.chatdPersist) {
        unbind();
      }
    });
  }
  self.rebind('onMembersUpdatedUI.chatRoomMembersSync', (e, eventData) => {
    if (eventData.userId === u_handle) {
      self.messagesBuff.joined = true;
      if (eventData.priv === 255 || eventData.priv === -1) {
        if (self.state === ChatRoom.STATE.JOINING) {
          self.setState(ChatRoom.STATE.LEFT);
        }
      } else {
        if (self.state === ChatRoom.STATE.JOINING) {
          self.setState(ChatRoom.STATE.READY);
        }
      }
    }
    self.trackDataChange();
  });
  self.getParticipantsExceptMe().forEach((userHandle) => {
    const contact = M.u[userHandle];
    if (contact && contact.c) {
      getLastInteractionWith(contact.u);
    }
  });
  self.megaChat.trigger('onRoomCreated', [self]);
  if (this.type === "public" && self.megaChat.publicChatKeys[self.chatId]) {
    self.publicChatKey = self.megaChat.publicChatKeys[self.chatId];
  }
  $(window).rebind(`focus.${  self.roomId}`, () => {
    if (self.isCurrentlyActive) {
      self.trigger("onChatShown");
    }
  });
  self.megaChat.rebind(`onRoomDestroy.${  self.roomId}`, (e, room) => {
    if (room.roomId == self.roomId) {
      $(window).off(`focus.${  self.roomId}`);
    }
  });
  self.initialMessageHistLoaded = false;
  let timer = null;
  const _historyIsAvailable = ev => {
    self.initialMessageHistLoaded = ev ? true : -1;
    if (timer) {
      timer.abort();
      timer = null;
    }
    self.unbind('onMarkAsJoinRequested.initHist');
    self.unbind('onHistoryDecrypted.initHist');
    self.unbind('onMessagesHistoryDone.initHist');
  };
  self.rebind('onHistoryDecrypted.initHist', _historyIsAvailable);
  self.rebind('onMessagesHistoryDone.initHist', _historyIsAvailable);
  self.rebind('onMarkAsJoinRequested.initHist', () => {
    (timer = tSleep(300)).then(() => {
      if (d) {
        self.logger.warn("Timed out waiting to load hist for:", self.chatId || self.roomId);
      }
      this.historyTimedOut = true;
      this.trigger('onHistTimeoutChange');
      timer = null;
      _historyIsAvailable(false);
    });
  });
  self.rebind('onRoomDisconnected', () => {
    if (!self.call) {
      for (const activeCallId of self.activeCallIds.keys()) {
        self.activeCallIds.remove(activeCallId);
      }
      megaChat.updateSectionUnreadCount();
    }
  });
  this.rebind(`onCallUserLimitExceeded.${chatId}`, () => {
    if (this.callUserLimited) {
      return;
    }
    (this.callUserLimited = tSleep(60)).always(() => {
      this.callUserLimited = false;
      this.trackDataChange();
    });
  });
  this.membersSetFromApi = new ChatRoom.MembersSet(this);
  if (publicChatHandle) {
    this.onPublicChatRoomInitialized();
  }
  return this;
};
inherits(ChatRoom, MegaDataObject);
ChatRoom.STATE = {
  'INITIALIZED': 5,
  'JOINING': 10,
  'JOINED': 20,
  'READY': 150,
  'ENDED': 190,
  'LEAVING': 200,
  'LEFT': 250
};
ChatRoom.INSTANCE_INDEX = 0;
ChatRoom.ANONYMOUS_PARTICIPANT = mega.BID;
ChatRoom.ARCHIVED = 0x01;
ChatRoom.TOPIC_MAX_LENGTH = 30;
ChatRoom.SCHEDULED_MEETINGS_INTERVAL = 1.8e6;
ChatRoom._fnRequireParticipantKeys = function (fn, scope) {
  return function (...args) {
    const participants = this.protocolHandler.getTrackedParticipants();
    return ChatdIntegration._ensureKeysAreLoaded(undefined, participants).then(() => {
      return fn.apply(scope || this, args);
    }).catch(ex => {
      this.logger.error("Failed to retrieve keys..", ex);
    });
  };
};
ChatRoom.MembersSet = function (chatRoom) {
  this.chatRoom = chatRoom;
  this.members = {};
};
ChatRoom.MembersSet.PRIVILEGE_STATE = {
  NOT_AVAILABLE: -5,
  OPERATOR: 3,
  FULL: 2,
  READONLY: 0,
  LEFT: -1
};
ChatRoom.encryptTopic = function (protocolHandler, newTopic, participants, isPublic = false) {
  if (protocolHandler instanceof strongvelope.ProtocolHandler && participants.size > 0) {
    const topic = protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, isPublic);
    if (topic) {
      return base64urlencode(topic);
    }
  }
  return false;
};
ChatRoom.MembersSet.prototype.trackFromActionPacket = function (ap, isMcf) {
  const self = this;
  const apMembers = {};
  (ap.u || []).forEach((r) => {
    apMembers[r.u] = r.p;
  });
  Object.keys(self.members).forEach((u_h) => {
    if (typeof apMembers[u_h] === 'undefined') {
      self.remove(u_h);
    } else if (apMembers[u_h] !== self.members[u_h]) {
      self.update(u_h, apMembers[u_h]);
    }
  });
  Object.keys(apMembers).forEach((u_h) => {
    if (typeof self.members[u_h] === 'undefined') {
      const priv2 = apMembers[u_h];
      !isMcf ? self.add(u_h, priv2) : self.init(u_h, priv2);
    } else if (apMembers[u_h] !== self.members[u_h]) {
      self.update(u_h, apMembers[u_h]);
    }
  });
  if (!isMcf && ap.m === 1 && !ap.n && ap.url && ap.ou !== u_handle && typeof ap.p === 'undefined' && !ap.topicChange) {
    self.chatRoom.trigger('onMeAdded', ap.ou);
  }
};
ChatRoom.MembersSet.prototype.init = function (handle, privilege) {
  this.members[handle] = privilege;
  this.chatRoom.trackDataChange();
};
ChatRoom.MembersSet.prototype.update = function (handle, privilege) {
  this.members[handle] = privilege;
  this.chatRoom.trackDataChange();
};
ChatRoom.MembersSet.prototype.add = function (handle, privilege) {
  this.members[handle] = privilege;
  if (handle === u_handle) {
    this.chatRoom.trigger('onMeJoined');
  }
  this.chatRoom.trackDataChange();
};
ChatRoom.MembersSet.prototype.remove = function (handle) {
  delete this.members[handle];
  if (handle === u_handle) {
    this.chatRoom.trigger('onMeLeft');
  }
  this.chatRoom.trackDataChange();
};
ChatRoom.prototype.trackMemberUpdatesFromActionPacket = function (ap, isMcf) {
  if (!ap.u) {
    return;
  }
  if (this.membersSetFromApi) {
    this.membersSetFromApi.trackFromActionPacket(ap, isMcf);
  }
};
ChatRoom.prototype.getCallParticipants = function () {
  const ids = this.activeCallIds.keys();
  if (ids.length === 0) {
    return [];
  }
  return this.activeCallIds[ids[0]];
};
ChatRoom.prototype.getChatIdMessages = function () {
  return this.chatd.chatIdMessages[this.chatIdBin];
};
ChatRoom.prototype.getRetentionFormat = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;
  switch (true) {
    case retentionTime === 0:
      return RETENTION_FORMAT.DISABLED;
    case retentionTime % daysToSeconds(30) === 0 || retentionTime >= 31536000:
      return RETENTION_FORMAT.MONTHS;
    case retentionTime % daysToSeconds(7) === 0:
      return RETENTION_FORMAT.WEEKS;
    case retentionTime % daysToSeconds(1) === 0:
      return RETENTION_FORMAT.DAYS;
    default:
      return RETENTION_FORMAT.HOURS;
  }
};
ChatRoom.prototype.getRetentionTimeFormatted = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;
  switch (this.getRetentionFormat(retentionTime)) {
    case RETENTION_FORMAT.MONTHS:
      return Math.floor(secondsToDays(retentionTime) / 30);
    case RETENTION_FORMAT.WEEKS:
      return secondsToDays(retentionTime) / 7;
    case RETENTION_FORMAT.DAYS:
      return secondsToDays(retentionTime);
    case RETENTION_FORMAT.HOURS:
      return secondsToHours(retentionTime);
    case RETENTION_FORMAT.DISABLED:
      return 0;
  }
};
ChatRoom.prototype.getRetentionLabel = function (retentionTime) {
  retentionTime = retentionTime || this.retentionTime;
  const days = secondsToDays(retentionTime);
  const months = Math.floor(days / 30);
  const hours = secondsToHours(retentionTime);
  switch (this.getRetentionFormat(retentionTime)) {
    case RETENTION_FORMAT.DISABLED:
      return l.disabled_chat_history_cleaning_status;
    case RETENTION_FORMAT.MONTHS:
      return mega.icu.format(l.months_chat_history_plural, months);
    case RETENTION_FORMAT.WEEKS:
      return mega.icu.format(l.weeks_chat_history_plural, days / 7);
    case RETENTION_FORMAT.DAYS:
      return mega.icu.format(l.days_chat_history_plural, days);
    case RETENTION_FORMAT.HOURS:
      return mega.icu.format(l.hours_chat_history_plural, hours);
  }
};
ChatRoom.prototype.setRetention = function (time) {
  asyncApiReq({
    "a": "mcsr",
    "id": this.chatId,
    "d": time,
    "ds": 1
  });
};
ChatRoom.prototype.removeMessagesByRetentionTime = function () {
  const self = this;
  const {messages} = self.messagesBuff;
  if (messages.length === 0 || this.retentionTime === 0) {
    return;
  }
  const newest = messages.getItem(messages.length - 1);
  let lowestValue = newest.orderValue;
  let deleteFrom = null;
  let lastMessage = null;
  const deletePreviousTo = (new Date() - self.retentionTime * 1000) / 1000;
  const cp = self.megaChat.plugins.chatdIntegration.chatd.chatdPersist;
  let finished = false;
  if (typeof cp !== 'undefined') {
    const done = function (message) {
      if (message) {
        if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
          self.messagesBuff._removeMessagesBefore(message.messageId);
        }
        cp.removeMessagesBefore(self.chatId, message.orderValue);
      }
    };
    if (newest.delay < deletePreviousTo) {
      cp.clearChatHistoryForChat(self.chatId);
      return;
    }
    const removeMsgs = function () {
      cp._paginateMessages(lowestValue, Chatd.MESSAGE_HISTORY_LOAD_COUNT, self.chatId).then((messages) => {
        messages = messages[0];
        if (messages.length) {
          for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.msgObject.delay < deletePreviousTo) {
              deleteFrom = lastMessage || message;
              break;
            }
            lastMessage = message;
            lowestValue = message.orderValue;
          }
        } else {
          finished = true;
        }
        if (!finished && !deleteFrom) {
          onIdle(removeMsgs);
        } else {
          done(deleteFrom);
        }
      });
    };
    removeMsgs();
  }
  if (self.retentionTime > 0 && self.messagesBuff.messages.length > 0) {
    let message;
    while (message = self.messagesBuff.messages.getItem(0)) {
      if (message.delay < deletePreviousTo) {
        if (!self.messagesBuff.messages.removeByKey(message.messageId)) {
          break;
        }
      } else {
        break;
      }
    }
  }
};
ChatRoom.prototype.isOnline = function () {
  const shard = this.chatd.shards[this.chatShard];
  return shard ? shard.isOnline() : false;
};
ChatRoom.prototype.isOnlineForCalls = function () {
  const chatdChat = this.getChatIdMessages();
  if (!chatdChat) {
    return false;
  }
  return chatdChat.loginState() >= LoginState.HISTDONE;
};
ChatRoom.prototype.isArchived = function () {
  const self = this;
  return self.flags & ChatRoom.ARCHIVED;
};
ChatRoom.prototype.isAnonymous = function () {
  return is_chatlink && this.type === "public" && this.publicChatHandle && this.publicChatKey && this.publicChatHandle === megaChat.initialPubChatHandle;
};
ChatRoom.prototype.isDisplayable = function () {
  return !this.isArchived() || this.call;
};
ChatRoom.prototype.isMuted = function () {
  return pushNotificationSettings.getDnd(this.chatId) || pushNotificationSettings.getDnd(this.chatId) === 0;
};
ChatRoom.prototype.persistToFmdb = function () {
  const self = this;
  if (fmdb) {
    const users = [];
    if (self.members) {
      Object.keys(self.members).forEach((user_handle) => {
        users.push({
          u: user_handle,
          p: self.members[user_handle]
        });
      });
    }
    if (self.chatId && self.chatShard !== undefined) {
      const roomInfo = {
        'id': self.chatId,
        'cs': self.chatShard,
        'g': self.type === "group" || self.type === "public" ? 1 : 0,
        'u': users,
        'ts': self.ctime,
        'ct': self.ct,
        'ck': self.ck ? self.ck : null,
        'f': self.flags,
        'm': self.type === "public" ? 1 : 0
      };
      fmdb.add('mcf', {
        id: roomInfo.id,
        d: roomInfo
      });
    }
  }
};
ChatRoom.prototype.updateFlags = function (f, updateUI) {
  const self = this;
  const flagChange = self.flags !== f;
  self.flags = f;
  if (self.isArchived()) {
    megaChat.archivedChatsCount++;
  } else {
    megaChat.archivedChatsCount--;
  }
  self.persistToFmdb();
  if (updateUI && flagChange) {
    if (megaChat.currentlyOpenedChat && megaChat.chats[megaChat.currentlyOpenedChat] && megaChat.chats[megaChat.currentlyOpenedChat].chatId === self.chatId) {
      loadSubPage('fm/chat/');
    } else {
      megaChat.refreshConversations();
    }
  }
  this.trackDataChange();
};
ChatRoom.stateToText = function (state) {
  let txt = null;
  $.each(ChatRoom.STATE, (k, v) => {
    if (state === v) {
      txt = k;
      return false;
    }
  });
  return txt;
};
ChatRoom.prototype.setState = function (newState, isRecover) {
  const self = this;
  assert(newState, 'Missing state');
  if (newState === self.state) {
    self.logger.debug("Ignoring .setState, newState === oldState, current state: ", self.getStateAsText());
    return;
  }
  if (self.state) {
    assert(newState === ChatRoom.STATE.JOINING && isRecover || newState === ChatRoom.STATE.INITIALIZED && isRecover || newState > self.state, `Invalid state change. Current:${  ChatRoom.stateToText(self.state)  }to${  ChatRoom.stateToText(newState)}`);
  }
  const oldState = self.state;
  self.state = newState;
  self.trigger('onStateChange', [oldState, newState]);
};
ChatRoom.prototype.getStateAsText = function () {
  const self = this;
  return ChatRoom.stateToText(self.state);
};
ChatRoom.prototype.getParticipants = function () {
  const self = this;
  return Object.keys(self.members);
};
ChatRoom.prototype.getParticipantsExceptMe = function (userHandles) {
  const res = clone(userHandles || this.getParticipants());
  array.remove(res, u_handle, true);
  return res;
};
ChatRoom.prototype.getParticipantsTruncated = function (maxMembers = 5, maxLength = ChatRoom.TOPIC_MAX_LENGTH) {
  const truncatedParticipantNames = [];
  const members = Object.keys(this.members);
  for (let i = 0; i < members.length; i++) {
    const handle = members[i];
    const name = M.getNameByHandle(handle);
    if (!handle || !name || handle === u_handle) {
      continue;
    }
    if (i > maxMembers) {
      break;
    }
    truncatedParticipantNames.push(name.length > maxLength ? `${name.substr(0, maxLength)  }...` : name);
  }
  if (truncatedParticipantNames.length === maxMembers) {
    truncatedParticipantNames.push('...');
  }
  return truncatedParticipantNames.join(', ');
};
ChatRoom.prototype.getRoomTitle = function () {
  const formattedDate = l[19077].replace('%s1', new Date(this.ctime * 1000).toLocaleString());
  if (this.isNote) {
    return l.note_label;
  }
  if (this.type === 'private') {
    const participants = this.getParticipantsExceptMe();
    return participants && Array.isArray(participants) ? M.getNameByHandle(participants[0]) : formattedDate;
  }
  if (this.topic === '' || !this.topic) {
    return this.getParticipantsTruncated() || formattedDate;
  }
  const formattedTopic = this.getTruncatedRoomTopic();
  const isCanceled = this.scheduledMeeting && this.scheduledMeeting.isCanceled;
  return isCanceled ? `${formattedTopic} ${l.canceled_meeting}` : formattedTopic;
};
ChatRoom.prototype.getTruncatedRoomTopic = function (maxLength = ChatRoom.TOPIC_MAX_LENGTH) {
  return this.topic && this.topic.length > maxLength ? `${this.topic.substr(0, maxLength)  }...` : this.topic;
};
ChatRoom.prototype.setRoomTopic = async function (newTopic) {
  if (newTopic && newTopic.trim().length && newTopic !== this.getRoomTitle()) {
    this.scrolledToBottom = true;
    const participants = this.protocolHandler.getTrackedParticipants();
    await ChatdIntegration._ensureKeysAreLoaded(undefined, participants);
    const topic = this.protocolHandler.embeddedEncryptTo(newTopic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, participants, undefined, this.type === 'public');
    if (topic) {
      return api.req({
        a: 'mcst',
        id: this.chatId,
        ct: base64urlencode(topic),
        v: Chatd.VERSION
      });
    }
  }
};
ChatRoom.prototype.leave = function (notify) {
  const valid = this.type === 'group' || this.type === 'public';
  console.assert(valid, `Can't leave room "${this.roomId}" of type "${this.type}"`);
  if (!valid) {
    return;
  }
  this._leaving = true;
  this.topic = '';
  if (notify) {
    this.trigger('onLeaveChatRequested');
  }
  if (this.state !== ChatRoom.STATE.LEFT) {
    this.setState(ChatRoom.STATE.LEAVING);
    this.setState(ChatRoom.STATE.LEFT);
  }
  if (this.activeCallIds.length) {
    for (const activeCallId of this.activeCallIds.keys()) {
      this.activeCallIds.remove(activeCallId);
    }
    megaChat.updateSectionUnreadCount();
  }
};
ChatRoom.prototype.archive = function () {
  const self = this;
  const mask = 0x01;
  const flags = ChatRoom.ARCHIVED;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': 1,
    'f': flags,
    'v': Chatd.VERSION
  }).then(r => {
    if (r === 0) {
      self.updateFlags(flags, true);
    }
  });
};
ChatRoom.prototype.unarchive = function () {
  const self = this;
  const mask = 0x01;
  const flags = 0x00;
  asyncApiReq({
    'a': 'mcsf',
    'id': self.chatId,
    'm': 1,
    'f': 0,
    'v': Chatd.VERSION
  }).then(res => {
    if (res === 0) {
      self.updateFlags(0, true);
    }
  });
};
ChatRoom.prototype.destroy = function (notifyOtherDevices, noRedirect) {
  const self = this;
  self.megaChat.trigger('onRoomDestroy', [self]);
  const mc = self.megaChat;
  const roomJid = self.roomId;
  if (!self.stateIsLeftOrLeaving()) {
    self.leave(notifyOtherDevices);
  } else if (self.type === "public" && self.publicChatHandle) {
    if (typeof self.members[u_handle] === 'undefined') {
      self.megaChat.plugins.chatdIntegration.handleLeave(self);
    }
  }
  if (self.isCurrentlyActive) {
    self.isCurrentlyActive = false;
  }
  Soon(() => {
    mc.chats.remove(roomJid);
    if (!noRedirect && u_type === 3) {
      loadSubPage('fm/chat');
    }
  });
};
ChatRoom.prototype.updatePublicHandle = async function (remove, cim, force) {
  if (force) {
    this.publicLink = null;
  }
  if (!remove && this.publicLink) {
    return this.publicLink;
  }
  return asyncApiReq({
    a: 'mcph',
    id: this.chatId,
    v: Chatd.VERSION,
    cim: cim ? 1 : 0,
    d: remove ? 1 : undefined
  }).then(res => {
    assert(remove && res === 0 || Array.isArray(res) && res[1].length === 8);
    this.publicLink = remove ? null : `chat/${res[1]}#${this.protocolHandler.getUnifiedKey()}`;
  }).catch(ex => {
    this.logger.warn('updatePublicHandle', ex);
    this.publicLink = null;
  });
};
ChatRoom.prototype.iAmInRoom = function () {
  return !(!this.members.hasOwnProperty(u_handle) || this.members[u_handle] === -1);
};
ChatRoom.prototype.joinViaPublicHandle = function () {
  const self = this;
  if (!fminitialized && is_chatlink) {
    if (u_type) {
      return new Promise((res, rej) => {
        self.megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self).then(() => {
          self.megaChat.routing.reinitAndOpenExistingChat(self.chatId, self.publicChatHandle).then(res, rej);
        }, ex => {
          console.error("Failed joining a chat room (u_type)", ex);
          rej(ex);
        });
      });
    }
    return;
  }
  if (!self.iAmInRoom() && self.type === "public" && self.publicChatHandle) {
    return megaChat.plugins.chatdIntegration.joinChatViaPublicHandle(self);
  }
  return Promise.reject();
};
ChatRoom.prototype.switchOffPublicMode = ChatRoom._fnRequireParticipantKeys(function () {
  let {
    topic,
    protocolHandler,
    chatId
  } = this;
  if (topic) {
    topic = protocolHandler.embeddedEncryptTo(topic, strongvelope.MESSAGE_TYPES.TOPIC_CHANGE, protocolHandler.getTrackedParticipants(), true, false);
    topic = base64urlencode(topic);
  }
  return asyncApiReq({
    a: 'mcscm',
    id: chatId,
    ct: topic || undefined,
    v: Chatd.VERSION
  }).then(() => {
    protocolHandler.switchOffOpenMode();
  });
});
ChatRoom.prototype.show = function () {
  if (this.isCurrentlyActive) {
    return false;
  }
  this.megaChat.hideAllChats();
  if (d) {
    this.logger.debug(' ---- show');
  }
  $.tresizer();
  onIdle(() => {
    this.scrollToChat();
    this.trackDataChange();
  });
  this.isCurrentlyActive = true;
  this.lastShownInUI = Date.now();
  this.megaChat.setAttachments(this.roomId);
  this.megaChat.lastOpenedChat = this.roomId;
  this.megaChat.currentlyOpenedChat = this.roomId;
  this.trigger('activity');
  this.trigger('onChatShown');
  let tmp = this.megaChat.rootDOMNode;
  if (tmp = tmp.querySelector('.conversation-panels')) {
    tmp.classList.remove('hidden');
    if (tmp = tmp.querySelector(`.conversation-panel[data-room-id="${this.chatId}"]`)) {
      tmp.classList.remove('hidden');
    }
  }
  if (tmp = document.getElementById(`conversation_${this.roomId}`)) {
    tmp.classList.add('active');
  }
  if (mega.ui.mInfoPanel) {
    mega.ui.mInfoPanel.hide();
  }
};
ChatRoom.prototype.scrollToChat = function () {
  this._scrollToOnUpdate = true;
  const {
    $chatTreePanePs
  } = megaChat;
  if ($chatTreePanePs && $chatTreePanePs.length) {
    const li = document.querySelector(`ul.conversations-pane li#conversation_${this.roomId}`);
    if (li && !verge.inViewport(li, -72)) {
      Object.values($chatTreePanePs).forEach(({
        ref
      }) => {
        if (ref.domNode) {
          const wrapOuterHeight = $(ref.domNode).outerHeight();
          const itemOuterHeight = $('li:first', ref.domNode).outerHeight();
          const pos = li.offsetTop;
          if (ref.domNode.contains(li)) {
            ref.doProgramaticScroll == null || ref.doProgramaticScroll(Math.max(0, pos - wrapOuterHeight / 2 + itemOuterHeight), true);
          }
        }
      });
      this._scrollToOnUpdate = false;
    }
  }
};
ChatRoom.prototype.isActive = function () {
  return document.hasFocus() && this.isCurrentlyActive;
};
ChatRoom.prototype.setActive = function () {
  loadSubPage(this.getRoomUrl());
};
ChatRoom.prototype.isLoading = function () {
  const mb = this.messagesBuff;
  return mb.messagesHistoryIsLoading() || mb.isDecrypting;
};
ChatRoom.prototype.getRoomUrl = function (getRawLink) {
  const self = this;
  if (self.type === "private") {
    const participants = self.getParticipantsExceptMe();
    const contact = M.u[participants[0] || u_handle];
    if (contact) {
      return `fm/chat/p/${  contact.u}`;
    }
  } else if (!getRawLink && is_chatlink && self.type === "public" && self.publicChatHandle && self.publicChatKey) {
    return `chat/${  self.publicChatHandle  }#${  self.publicChatKey}`;
  } else if (self.type === "public") {
    return `fm/chat/c/${  self.roomId}`;
  } else if (self.type === "group" || self.type === "public") {
    return `fm/chat/g/${  self.roomId}`;
  } else {
    throw new Error("Can't get room url for unknown room type.");
  }
};
ChatRoom.prototype.activateWindow = function () {
  const self = this;
  loadSubPage(self.getRoomUrl());
};
ChatRoom.prototype.hide = function () {
  let _tmp;
  if (d) {
    this.logger.debug(' ---- hide', this.isCurrentlyActive);
  }
  this.isCurrentlyActive = false;
  this.lastShownInUI = Date.now();
  if (this.megaChat.currentlyOpenedChat === this.roomId) {
    this.megaChat.currentlyOpenedChat = null;
  }
  let tmp = this.megaChat.rootDOMNode.querySelector(`.conversation-panel[data-room-id="${this.chatId}"]`);
  (_tmp = tmp) == null || _tmp.classList.add('hidden');
  if (tmp = document.getElementById(`conversation_${this.roomId}`)) {
    tmp.classList.remove('active');
  }
  this.trigger('onChatHidden', this.isCurrentlyActive);
};
ChatRoom.prototype.appendMessage = function (message) {
  const self = this;
  if (message.deleted) {
    return false;
  }
  if (self.shownMessages[message.messageId]) {
    return false;
  }
  if (!message.orderValue) {
    const mb = self.messagesBuff;
    if (mb.messages.length > 0) {
      const prevMsg = mb.messages.getItem(mb.messages.length - 1);
      if (!prevMsg) {
        self.logger.error("self.messages got out of sync...maybe there are some previous JS exceptions that caused that? note that messages may be displayed OUT OF ORDER in the UI.");
      } else {
        let nextVal = prevMsg.orderValue + 0.1;
        if (!prevMsg.sent) {
          const cid = megaChat.plugins.chatdIntegration.chatd.chatIdMessages[self.chatIdBin];
          if (cid && cid.highnum) {
            nextVal = ++cid.highnum;
          }
        }
        message.orderValue = nextVal;
      }
    }
  }
  message.source = Message.SOURCE.SENT;
  self.trigger('onMessageAppended', message);
  self.messagesBuff.messages.push(message);
  self.shownMessages[message.messageId] = true;
};
ChatRoom.prototype.getNavElement = function () {
  const self = this;
  return $(`.nw-conversations-item[data-room-id="${  self.chatId  }"]`);
};
ChatRoom.prototype.sendMessage = function (message) {
  const self = this;
  const {megaChat} = this;
  const messageId = megaChat.generateTempMessageId(self.roomId, message);
  const msgObject = new Message(self, self.messagesBuff, {
    messageId,
    'userId': u_handle,
    message,
    'textContents': message,
    'delay': unixtime(),
    'sent': Message.STATE.NOT_SENT
  });
  self.trigger('onSendMessage');
  self.appendMessage(msgObject);
  return self._sendMessageToTransport(msgObject).then(internalId => {
    if (!internalId) {
      this.logger.warn(`Got unexpected(?) 'sendingnum'...`, internalId);
    }
    msgObject.internalId = internalId;
    msgObject.orderValue = internalId;
    return internalId || -0xBADF;
  }).catch(ex => {
    this.logger.error(`sendMessage failed..`, msgObject, ex);
  });
};
ChatRoom.prototype._sendMessageToTransport = function (messageObject) {
  const self = this;
  const {megaChat} = this;
  megaChat.trigger('onPreBeforeSendMessage', messageObject);
  megaChat.trigger('onBeforeSendMessage', messageObject);
  megaChat.trigger('onPostBeforeSendMessage', messageObject);
  return megaChat.plugins.chatdIntegration.sendMessage(self, messageObject);
};
ChatRoom.prototype._sendNodes = async function (nodeids, users) {
  const u = this.type === 'public' ? [strongvelope.COMMANDER] : users;
  const promises = nodeids.map(nodeId => asyncApiReq({
    a: 'mcga',
    n: [nodeId],
    u,
    id: this.chatId,
    v: Chatd.VERSION
  }));
  const res = await Promise.allSettled(promises);
  const sent = [];
  for (let i = res.length; i--;) {
    if (res[i].status === 'fulfilled') {
      sent.push(nodeids[i]);
    }
  }
  if (!sent.length) {
    throw ENOENT;
  }
  return sent;
};
ChatRoom.prototype.attachNodes = async function (nodes, names) {
  if (!Array.isArray(nodes)) {
    nodes = [nodes];
  }
  const handles = new Set();
  for (let i = nodes.length; i--;) {
    const n = nodes[i];
    const h = String(crypto_keyok(n) && n.h || n);
    if (!M.getNodeByHandle(h)) {
      handles.add(h);
    }
  }
  if (handles.size) {
    await dbfetch.acquire([...handles]);
  }
  return this._attachNodes(nodes, names);
};
ChatRoom.prototype._attachNodes = mutex('chatroom-attach-nodes', function _(resolve, reject, nodes, names) {
  let i;
  let step = 0;
  const users = [];
  const self = this;
  let result = null;
  let copy = Object.create(null);
  let send = Object.create(null);
  let link = Object.create(null);
  let nmap = Object.create(null);
  const members = self.getParticipantsExceptMe();
  const sendMessage = nodes => {
    return new Promise(resolve => {
      for (let i = nodes.length; i--;) {
        const n = nmap[nodes[i]] || M.getNodeByHandle(nodes[i]);
        console.assert(n.h, `Node not found... ${nodes[i]}`);
        if (n.h) {
          const name = names && (names[n.hash] || names[n.h]) || n.name;
          this.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT + JSON.stringify([{
            h: n.h,
            k: n.k,
            t: n.t,
            s: n.s,
            fa: n.fa,
            ts: n.ts,
            hash: n.hash,
            name,
            des: n.des
          }]));
        }
      }
      resolve();
    });
  };
  const attach = nodes => {
    console.assert(this.type === 'public' || users.length || this.isNote, 'No users to send to?!');
    return this.isNote ? sendMessage(nodes) : this._sendNodes(nodes, users).then(res => sendMessage(res));
  };
  const done = function () {
    if (--step < 1) {
      nmap = null;
      resolve(result);
    }
  };
  const fail = function (ex) {
    if (ex === EBLOCKED) {
      result = ex;
    } else if (ex === ENOENT) {
      result = result || ex;
    } else if (d) {
      _.logger.error(ex);
    }
    done();
  };
  if (d && !_.logger) {
    _.logger = new MegaLogger('attachNodes', {}, self.logger);
  }
  for (i = members.length; i--;) {
    const usr = M.getUserByHandle(members[i]);
    if (usr.u) {
      users.push(usr.u);
    }
  }
  for (i = nodes.length; i--;) {
    const h = nodes[i];
    const n = crypto_keyok(h) ? h : M.getNodeByHandle(h);
    if (n.t) {
      link[n.h] = 1;
      continue;
    }
    if (n.hash) {
      nmap[n.hash] = n;
      if (names && names[n.h]) {
        names[n.hash] = names[n.h];
      }
    }
    let op = send;
    if (n.u !== u_handle || M.getNodeRoot(n.h) === 'shares') {
      op = copy;
    }
    op[n.h] = 1;
    nmap[n.h] = n;
  }
  copy = Object.keys(copy);
  send = Object.keys(send);
  link = Object.keys(link);
  if (d) {
    _.logger.debug('copy:%d, send:%d, link:%d', copy.length, send.length, link.length, copy, send, link);
  }
  if (link.length) {
    ++step;
    Promise.resolve(mega.fileRequestCommon.storage.isDropExist(link)).then(res => {
      if (res.length) {
        return mega.fileRequest.showRemoveWarning(res);
      }
    }).then(() => {
      const createLink = h => M.createPublicLink(h).then(({
        link
      }) => this.sendMessage(link));
      return Promise.all(link.map(createLink));
    }).then(done).catch(fail);
  }
  if (send.length) {
    step++;
    attach(send).then(done).catch(fail);
  }
  if (copy.length) {
    step++;
    this._copyNodesToAttach(copy, nmap).then(res => attach(res)).then(done).catch(fail);
  }
  if (!step) {
    if (d) {
      _.logger.warn('Nothing to do here...');
    }
    queueMicrotask(done);
  }
});
ChatRoom.prototype._copyNodesToAttach = async function (copy, nmap) {
  const {
    h: target
  } = await M.myChatFilesFolder.get(true);
  if (!M.c[target]) {
    await dbfetch.get(target);
  }
  const dir = Object.keys(M.c[target] || {});
  const rem = [];
  for (let i = copy.length; i--;) {
    const n = nmap[copy[i]] || M.getNodeByHandle(copy[i]);
    console.assert(n.h, `Node not found.. ${copy[i]}`);
    for (let y = dir.length; y--;) {
      const b = M.getNodeByHandle(dir[y]);
      if (n.h === b.h || b.hash === n.hash) {
        if (d) {
          this.logger.info('deduplication %s:%s', n.h, b.h, [n], [b]);
        }
        rem.push(n.h);
        copy.splice(i, 1);
        break;
      }
    }
  }
  let res = [];
  if (copy.length) {
    res = await M.copyNodes(copy, target, false, false, {
      targetChatId: this.chatId
    });
  } else if (d) {
    this.logger.info('No new nodes to copy.', rem);
  }
  assert(Array.isArray(res), `Unexpected response, ${res && res.message || res}`, res);
  const [h] = res;
  res = [...rem, ...res];
  assert(res.length, 'Unexpected condition... nothing to attach ?!');
  for (let i = res.length; i--;) {
    const n = nmap[res[i]] || M.getNodeByHandle(res[i]);
    if (n.fv) {
      if (d) {
        this.logger.info('Skipping file-version %s', n.h, n);
      }
      res.splice(i, 1);
    }
  }
  if (h && !res.length) {
    if (d) {
      this.logger.info('Adding nothing but a file-version?..', h);
    }
    res = [h];
  }
  return res;
};
ChatRoom.prototype.onUploadStart = function (data) {
  const self = this;
  if (d) {
    self.logger.debug('onUploadStart', data);
  }
};
ChatRoom.prototype.uploadFromComputer = function () {
  this.scrolledToBottom = true;
  $('#fileselect1').trigger('click');
};
ChatRoom.prototype.attachContacts = function (ids) {
  for (let i = 0; i < ids.length; i++) {
    const nodeId = ids[i];
    const node = M.u[nodeId];
    this.sendMessage(Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTACT + JSON.stringify([{
      u: node.u,
      email: node.m,
      name: node.name || node.m
    }]));
  }
};
ChatRoom.prototype.getMessageById = function (messageId) {
  const self = this;
  const msgs = self.messagesBuff.messages;
  const msgKeys = msgs.keys();
  for (let i = 0; i < msgKeys.length; i++) {
    const k = msgKeys[i];
    const v = msgs[k];
    if (v && v.messageId === messageId) {
      return v;
    }
  }
  return false;
};
ChatRoom.prototype.hasMessages = function (userMessagesOnly = false) {
  return this.messagesBuff.messages.some(m => !userMessagesOnly || m.messageHtml);
};
ChatRoom.prototype.renderContactTree = function () {
  const self = this;
  const $navElement = self.getNavElement();
  const $count = $('.nw-conversations-unread', $navElement);
  const count = self.messagesBuff.getUnreadCount();
  if (count > 0) {
    $count.text(count > 9 ? "9+" : count);
    $navElement.addClass("unread");
  } else if (count === 0) {
    $count.text("");
    $navElement.removeClass("unread");
  }
  $navElement.data('chatroom', self);
};
ChatRoom.prototype.getUnreadCount = function () {
  const self = this;
  return self.messagesBuff.getUnreadCount();
};
ChatRoom.prototype.recover = function () {
  const self = this;
  self.callRequest = null;
  if (self.state !== ChatRoom.STATE.LEFT) {
    self.membersLoaded = false;
    self.setState(ChatRoom.STATE.JOINING, true);
    self.megaChat.trigger("onRoomCreated", [self]);
    return MegaPromise.resolve();
  } else {
    return MegaPromise.reject();
  }
};
ChatRoom.prototype.showMissingUnifiedKeyDialog = function () {
  return msgDialog(`warningb:!^${l.msg_dlg_cancel}!${l[23433]}`, null, l[200], l.chat_key_failed_dlg_text, reload => reload ? M.reload() : null, 1);
};
ChatRoom.prototype.hasInvalidKeys = function () {
  if (!is_chatlink && this.type === 'public') {
    const {
      unifiedKey
    } = this.protocolHandler || {};
    if (!unifiedKey || unifiedKey && unifiedKey.length !== 16 || !this.ck || this.ck && this.ck.length !== 32) {
      console.error('Error instantiating room/call -- missing `unifiedKey`/malformed `ck` for public chat.');
      const {
        owner,
        actors
      } = mBroadcaster.crossTab;
      eventlog(99751, JSON.stringify([1, buildVersion.website || 'dev', String(this.chatId).length | 0, this.type | 0, this.isMeeting | 0, typeof unifiedKey, String(unifiedKey || '').length | 0, typeof this.ck, String(this.ck).length | 0, !!owner | 0, Object(actors).length | 0]));
      return true;
    }
  }
  return false;
};
ChatRoom.prototype.joinCall = ChatRoom._fnRequireParticipantKeys(function (audio, video, callId) {
  if (!megaChat.hasSupportForCalls || this.activeCallIds.length === 0 || this.meetingsLoading) {
    return;
  }
  if (this.hasInvalidKeys()) {
    return this.showMissingUnifiedKeyDialog();
  }
  this.meetingsLoading = {
    title: l.joining,
    audio,
    video
  };
  callId = callId || this.activeCallIds.keys()[0];
  return asyncApiReq({
    'a': 'mcmj',
    'cid': this.chatId,
    "mid": callId
  }).then(r => {
    this.startOrJoinCall(callId, r.url, audio, video, r.organiser);
  });
});
ChatRoom.prototype.startOrJoinCall = function (callId, url, audio, video, organiser) {
  tryCatch(() => {
    const call = this.call = megaChat.activeCall = megaChat.plugins.callManager2.createCall(this, callId, this.protocolHandler.chatMode === strongvelope.CHAT_MODE.PUBLIC && str_to_ab(this.protocolHandler.unifiedKey));
    call.setOrganiser(organiser);
    return call.connect(url, audio, video);
  }, ex => {
    let _this$call;
    (_this$call = this.call) == null || _this$call.destroy();
    this.call = megaChat.activeCall = null;
    this.meetingsLoading = false;
    console.error('Failed to start/join call:', ex);
  })();
};
ChatRoom.prototype.rejectCall = function (callId) {
  if (this.activeCallIds.length === 0) {
    return;
  }
  callId = callId || this.activeCallIds.keys()[0];
  if (this.type === "private") {
    return asyncApiReq({
      'a': 'mcme',
      'cid': this.chatId,
      'mid': callId
    });
  }
  const shard = this.chatd.shards[this.chatShard];
  if (shard) {
    shard.sendCallReject(base64urldecode(this.chatId), base64urldecode(callId));
  }
  return Promise.resolve();
};
ChatRoom.prototype.ringUser = function (userId, callId, callstate) {
  assert(userId, 'Missing user handle.');
  assert(callId, 'Missing chat handle.');
  assert(this.type !== 'private', 'Unexpected chat type.');
  const shard = this.chatd.shards[this.chatShard];
  if (shard) {
    api.req({
      a: 'mcru',
      u: userId,
      cid: this.chatId
    }).then(() => shard.ringUser(this.chatIdBin, base64urldecode(userId), base64urldecode(callId), callstate)).catch(dump);
  }
};
ChatRoom.prototype.endCallForAll = function (callId) {
  if (this.activeCallIds.length && this.type !== 'private') {
    callId = callId || this.activeCallIds.keys()[0];
    asyncApiReq({
      'a': 'mcme',
      'cid': this.chatId,
      'mid': callId
    });
    eventlog(99761, JSON.stringify([this.chatId, callId, this.isMeeting | 0]));
  }
};
ChatRoom.prototype.startAudioCall = function (scheduled) {
  return this.startCall(true, false, scheduled);
};
ChatRoom.prototype.startVideoCall = function (scheduled) {
  return this.startCall(true, true, scheduled);
};
ChatRoom.prototype.startCall = ChatRoom._fnRequireParticipantKeys(function (audio, video, scheduled) {
  if (!megaChat.hasSupportForCalls || this.meetingsLoading) {
    return;
  }
  if (this.activeCallIds.length > 0) {
    this.joinCall(this.activeCallIds.keys()[0]);
    return;
  }
  if (this.hasInvalidKeys()) {
    return this.showMissingUnifiedKeyDialog();
  }
  this.meetingsLoading = {
    title: l.starting,
    audio,
    video
  };
  const opts = {
    a: 'mcms',
    cid: this.chatId,
    sm: scheduled && this.scheduledMeeting && this.scheduledMeeting.id
  };
  if (localStorage.sfuId) {
    opts.sfu = parseInt(localStorage.sfuId, 10);
  }
  return asyncApiReq(opts).then(r => {
    this.startOrJoinCall(r.callId, r.sfu, audio, video, r.organiser);
  }).catch(ex => {
    this.meetingsLoading = false;
    this.logger.error(`Failed to start call: ${ex}`);
  });
});
ChatRoom.prototype.subscribeForCallEvents = function () {
  const callMgr = megaChat.plugins.callManager2;
  this.rebind("onChatdPeerJoinedCall.callManager", (e, data) => {
    if (!this.activeCallIds.exists(data.callId)) {
      this.activeCallIds.set(data.callId, []);
    }
    this.activeCallIds.set(data.callId, [...this.activeCallIds[data.callId], ...data.participants]);
    const parts = data.participants;
    for (let i = 0; i < parts.length; i++) {
      if (this.type === "private" || parts[i] === u_handle && this.ringingCalls.exists(data.callId)) {
        this.ringingCalls.remove(data.callId);
        callMgr.trigger("onRingingStopped", {
          callId: data.callId,
          chatRoom: this
        });
      }
    }
    megaChat.updateSectionUnreadCount();
    this.callParticipantsUpdated();
  });
  this.rebind("onChatdPeerLeftCall.callManager", (e, data) => {
    if (!this.activeCallIds[data.callId]) {
      return;
    }
    const parts = data.participants;
    for (let i = 0; i < parts.length; i++) {
      array.remove(this.activeCallIds[data.callId], parts[i], true);
      if (parts[i] === u_handle && this.ringingCalls.exists(data.callId)) {
        this.ringingCalls.remove(data.callId);
        callMgr.trigger("onRingingStopped", {
          callId: data.callId,
          chatRoom: this
        });
      }
    }
    this.callParticipantsUpdated();
  });
  this.rebind("onCallLeft.callManager", (e, data) => {
    console.warn("onCallLeft:", JSON.stringify(data));
    const {
      call
    } = this;
    if (!call || call.callId !== data.callId) {
      if (d) {
        console.warn("... no active call or event not for it");
      }
      return;
    }
    this.meetingsLoading = false;
    call.hangUp(data.reason);
    megaChat.activeCall = this.call = null;
  });
  this.rebind("onChatdCallEnd.callManager", (e, data) => {
    if (d) {
      console.warn("onChatdCallEnd:", JSON.stringify(data));
    }
    this.meetingsLoading = false;
    this.activeCallIds.remove(data.callId);
    if (this.callUserLimited) {
      this.callUserLimited.abort();
    }
    this.callUserLimited = false;
    this.stopRinging(data.callId);
    this.callParticipantsUpdated();
    megaChat.updateSectionUnreadCount();
  });
  this.rebind('onCallState.callManager', function (e, data) {
    const ac = this.activeCallIds[data.callId];
    console.assert(ac, `unknown call: ${data.callId}`);
    if (ac) {
      callMgr.onCallState(data, this);
      this.callParticipantsUpdated();
    }
  });
  this.rebind('onRoomDisconnected.callManager', function () {
    this.activeCallIds.clear();
    megaChat.updateSectionUnreadCount();
    if (navigator.onLine) {
      return;
    }
    if (this.call) {
      this.trigger('ChatDisconnected', this);
    }
    this.callParticipantsUpdated();
  });
  this.rebind('onStateChange.callManager', function (e, oldState, newState) {
    if (newState === ChatRoom.STATE.LEFT && this.call) {
      this.call.hangUp(SfuClient.TermCode.kLeavingRoom);
    }
  });
  this.rebind('onCallPeerLeft.callManager', (e, data) => {
    const {
      call
    } = this;
    if (!call || call.isDestroyed || call.hasOtherParticipant() || SfuClient.isTermCodeRetriable(data.reason)) {
      return;
    }
    if (this.type === 'private') {
      return this.trigger('onCallLeft', {
        callId: call.callId
      });
    }
    setTimeout(() => {
      if (this.call === call) {
        this.call.initCallTimeout();
      }
    }, 3000);
  });
  this.rebind('onMeAdded', (e, addedBy) => {
    if (this.activeCallIds.length > 0) {
      const callId = this.activeCallIds.keys()[0];
      if (this.ringingCalls.exists(callId)) {
        return;
      }
      this.ringingCalls.set(callId, addedBy);
      this.megaChat.trigger('onIncomingCall', [this, callId, addedBy, callMgr]);
      this.fakedLocalRing = true;
      setTimeout(() => {
        delete this.fakedLocalRing;
        if (this.ringingCalls.exists(callId)) {
          callMgr.trigger("onRingingStopped", {
            callId,
            chatRoom: this
          });
        }
      }, 30e3);
    }
  });
};
ChatRoom.prototype.stateIsLeftOrLeaving = function () {
  return this.state == ChatRoom.STATE.LEFT || this.state == ChatRoom.STATE.LEAVING || (!is_chatlink && this.state === ChatRoom.STATE.READY && this.membersSetFromApi && !this.membersSetFromApi.members.hasOwnProperty(u_handle) || is_chatlink && !this.members.hasOwnProperty(u_handle));
};
ChatRoom.prototype._clearChatMessagesFromChatd = function () {
  this.chatd.shards[this.chatShard].retention(base64urldecode(this.chatId), 1);
};
ChatRoom.prototype.isReadOnly = function () {
  if (this.type === "private") {
    const members = this.getParticipantsExceptMe();
    if (members[0] && !M.u[members[0]].c) {
      return true;
    }
  }
  return this.members && this.members[u_handle] <= 0 || !this.members.hasOwnProperty(u_handle) || this.privateReadOnlyChat || this.state === ChatRoom.STATE.LEAVING || this.state === ChatRoom.STATE.LEFT;
};
ChatRoom.prototype.iAmOperator = function () {
  return this.type === 'private' || this.members && this.members[u_handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR;
};
ChatRoom.prototype.iAmReadOnly = function () {
  return this.type !== 'private' && this.members && this.members[u_handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.READONLY;
};
ChatRoom.prototype.iAmWaitingRoomPeer = function () {
  return this.options.w && !this.iAmOperator();
};
ChatRoom.prototype.didInteraction = function (user_handle, ts) {
  const self = this;
  const newTs = ts || unixtime();
  if (user_handle === u_handle) {
    Object.keys(self.members).forEach((user_handle) => {
      const contact = M.u[user_handle];
      if (contact && user_handle !== u_handle && contact.c === 1) {
        setLastInteractionWith(contact.u, `1:${  newTs}`);
      }
    });
  } else {
    const contact = M.u[user_handle];
    if (contact && user_handle !== u_handle && contact.c === 1) {
      setLastInteractionWith(contact.u, `1:${  newTs}`);
    }
  }
};
ChatRoom.prototype.retrieveAllHistory = function () {
  const self = this;
  self.messagesBuff.retrieveChatHistory().done(() => {
    if (self.messagesBuff.haveMoreHistory()) {
      self.retrieveAllHistory();
    }
  });
};
ChatRoom.prototype.seedRoomKeys = async function (keys) {
  assert(Array.isArray(keys) && keys.length, `Invalid keys parameter for seedRoomKeys.`, keys);
  if (d > 2) {
    this.logger.warn('Seeding room keys...', keys);
  }
  const promises = [ChatdIntegration._ensureKeysAreLoaded(keys, undefined, this.publicChatHandle)];
  if (!this.protocolHandler) {
    promises.push(ChatdIntegration._waitForProtocolHandler(this));
  }
  if (!this.notDecryptedKeys) {
    this.notDecryptedKeys = Object.create(null);
  }
  for (let i = keys.length; i--;) {
    const {
      key,
      keyid,
      keylen,
      userId
    } = keys[i];
    this.notDecryptedKeys[`${userId}-${keyid}`] = {
      userId,
      keyid,
      keylen,
      key
    };
  }
  const promise = this._keysAreSeeding = Promise.all(promises).then(() => {
    const res = this.protocolHandler.seedKeys(keys);
    for (let i = res.length; i--;) {
      delete this.notDecryptedKeys[res[i]];
    }
    return res;
  }).catch(ex => {
    this.logger.error('Failed to seed room keys!', ex, keys);
    throw ex;
  }).finally(() => {
    if (promise === this._keysAreSeeding) {
      delete this._keysAreSeeding;
    }
  });
  return promise;
};
ChatRoom.prototype.truncate = function () {
  const self = this;
  const chatMessages = self.messagesBuff.messages;
  if (chatMessages.length > 0) {
    let lastChatMessageId = null;
    let i = chatMessages.length - 1;
    while (lastChatMessageId == null && i >= 0) {
      const message = chatMessages.getItem(i);
      if (message instanceof Message && message.dialogType !== "truncated") {
        lastChatMessageId = message.messageId;
      }
      i--;
    }
    if (lastChatMessageId) {
      asyncApiReq({
        a: 'mct',
        id: self.chatId,
        m: lastChatMessageId,
        v: Chatd.VERSION
      }).catch(ex => {
        if (ex === -2) {
          msgDialog('warninga', l[135], l[8880]);
        }
      });
    }
  }
};
ChatRoom.prototype.getActiveCalls = function () {
  return this.activeCallIds.map((parts, id) => {
    return parts.indexOf(u_handle) > -1 ? id : undefined;
  });
};
ChatRoom.prototype.haveActiveCall = function () {
  return this.getActiveCalls().length > 0;
};
ChatRoom.prototype.haveActiveOnHoldCall = function () {
  const activeCallIds = this.getActiveCalls();
  for (let i = 0; i < activeCallIds.length; i++) {
    const call = megaChat.plugins.callManager2.calls[`${this.chatId  }_${  activeCallIds[i]}`];
    if (call && call.av & SfuClient.Av.onHold) {
      return true;
    }
  }
  return false;
};
ChatRoom.prototype.havePendingGroupCall = function () {
  if (this.type !== "group" && this.type !== "public") {
    return false;
  }
  return this.activeCallIds.length > 0;
};
ChatRoom.prototype.havePendingCall = function () {
  return this.activeCallIds.length > 0;
};
ChatRoom.prototype.getActiveCallMessageId = function (ignoreActive) {
  const self = this;
  if (!ignoreActive && !self.havePendingCall() && !self.haveActiveCall()) {
    return false;
  }
  const msgs = self.messagesBuff.messages;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs.getItem(i);
    if (msg.dialogType === "remoteCallEnded") {
      return false;
    }
    if (msg.dialogType === "remoteCallStarted") {
      return msg.messageId;
    }
  }
};
ChatRoom.prototype.stopRinging = function (callId) {
  if (this.ringingCalls.exists(callId)) {
    this.ringingCalls.remove(callId);
  }
  megaChat.plugins.callManager2.trigger("onRingingStopped", {
    callId,
    chatRoom: this
  });
};
ChatRoom.prototype.callParticipantsUpdated = function () {
  const self = this;
  let msgId = self.getActiveCallMessageId();
  if (!msgId) {
    msgId = self.getActiveCallMessageId(true);
  }
  const callParts = self.getCallParticipants() || [];
  self.uniqueCallParts = {};
  for (let i = 0; i < callParts.length; i++) {
    self.uniqueCallParts[callParts[i]] = true;
  }
  if (this.callUserLimited && this.canJoinLimitedCall()) {
    this.callUserLimited.abort();
    this.callUserLimited = false;
  }
  const msg = self.messagesBuff.getMessageById(msgId);
  msg && msg.wrappedChatDialogMessage && msg.wrappedChatDialogMessage.trackDataChange();
  self.trackDataChange();
};
ChatRoom.prototype.onPublicChatRoomInitialized = function () {
  const self = this;
  if (self.type !== "public" || !localStorage.autoJoinOnLoginChat) {
    return;
  }
  const autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(localStorage.autoJoinOnLoginChat) || false;
  if (autoLoginChatInfo[0] === self.publicChatHandle) {
    localStorage.removeItem("autoJoinOnLoginChat");
    if (unixtime() - 7200 < autoLoginChatInfo[1]) {
      const doJoinEventually = function (state) {
        if (state === ChatRoom.STATE.READY) {
          self.joinViaPublicHandle();
          self.unbind(`onStateChange.${  self.publicChatHandle}`);
        }
      };
      self.rebind(`onStateChange.${  self.publicChatHandle}`, (e, oldState, newState) => {
        doJoinEventually(newState);
      });
      doJoinEventually(self.state);
    }
  }
};
ChatRoom.prototype.isUIMounted = function () {
  return this._uiIsMounted;
};
ChatRoom.prototype.attachSearch = function () {
  this.activeSearches++;
};
ChatRoom.prototype.detachSearch = function () {
  if (--this.activeSearches === 0) {
    this.messagesBuff.detachMessages();
  }
  this.activeSearches = Math.max(this.activeSearches, 0);
  this.trackDataChange();
};
ChatRoom.prototype.scrollToMessageId = function (msgId, index, retryActive) {
  const self = this;
  if (!self.isCurrentlyActive && !retryActive) {
    tSleep(1.5).then(() => {
      self.scrollToMessageId(msgId, index, true);
    });
    return;
  }
  assert(self.isCurrentlyActive, 'chatRoom is not visible');
  self.isScrollingToMessageId = true;
  if (!self.$rConversationPanel) {
    self.one(`onHistoryPanelComponentDidMount.scrollToMsgId${  msgId}`, () => {
      self.scrollToMessageId(msgId, index);
    });
    return;
  }
  const ps = self.$rConversationPanel.messagesListScrollable;
  assert(ps);
  const msgObj = self.messagesBuff.getMessageById(msgId);
  if (msgObj) {
    const elem = $(`.${  msgId  }.message.body`)[0];
    self.scrolledToBottom = false;
    ps.scrollToElement(elem, true);
    self.$rConversationPanel.lastScrollPosition = undefined;
    self.isScrollingToMessageId = false;
  } else if (self.messagesBuff.isRetrievingHistory) {
    self.one(`onHistoryDecrypted.scrollToMsgId${  msgId}`, () => {
      self.one(`onComponentDidUpdate.scrollToMsgId${  msgId}`, () => {
        self.scrollToMessageId(msgId, index);
      });
    });
  } else if (self.messagesBuff.haveMoreHistory()) {
    self.messagesBuff.retrieveChatHistory(!index || index <= 0 ? undefined : index);
    ps.doProgramaticScroll(0, true);
    self.one(`onHistoryDecrypted.scrollToMsgId${  msgId}`, () => {
      self.one(`onComponentDidUpdate.scrollToMsgId${  msgId}`, () => {
        self.scrollToMessageId(msgId);
      });
    });
  } else {
    self.isScrollingToMessageId = false;
  }
};
ChatRoom.prototype.setMcoFlags = function (flags) {
  const req = {
    a: 'mco',
    cid: this.chatId,
    ...flags
  };
  asyncApiReq(req).dump('roomSetCallFlags');
};
ChatRoom.prototype.toggleOpenInvite = function () {
  if (this.type === 'private' || !this.iAmOperator()) {
    return;
  }
  this.setMcoFlags({
    [MCO_FLAGS.OPEN_INVITE]: Math.abs(this.options[MCO_FLAGS.OPEN_INVITE] - 1)
  });
};
ChatRoom.prototype.toggleWaitingRoom = function () {
  if (this.type === 'private' || !this.iAmOperator()) {
    return;
  }
  this.setMcoFlags({
    [MCO_FLAGS.WAITING_ROOM]: Math.abs(this.options[MCO_FLAGS.WAITING_ROOM] - 1)
  });
};
ChatRoom.prototype.exportToFile = function () {
  if (this.messagesBuff.messages.length === 0 || this.exportIo) {
    return;
  }
  loadingDialog.show('chat_export');
  eventlog(99874);
  this._exportChat().then(() => {
    eventlog(99875, JSON.stringify([1]));
  }).catch(ex => {
    if (d) {
      console.warn('Chat export: ', ex);
    }
    const report = [String(ex && ex.message || ex).replace(/\s+/g, '').substring(0, 64)];
    report.unshift(report[0] === 'Aborted' ? 1 : 0);
    if (!report[0]) {
      msgDialog('error', '', l.export_chat_failed, '', undefined, 1);
    }
    eventlog(99875, JSON.stringify(report));
  }).finally(() => {
    loadingDialog.hide('chat_export');
    this.isScrollingToMessageId = false;
    onIdle(() => this.messagesBuff.detachMessages());
  });
};
ChatRoom.prototype._exportChat = async function () {
  this.isScrollingToMessageId = true;
  while (this.messagesBuff.haveMoreHistory()) {
    await this.messagesBuff.retrieveChatHistory(100);
  }
  await Promise.allSettled([this.messagesBuff.isDecrypting || Promise.resolve(), this.messagesBuff.$sharedFilesLoading || Promise.resolve(), this.messagesBuff.$isDecryptingSharedFiles || Promise.resolve()]);
  do {
    await this.messagesBuff.retrieveSharedFilesHistory(100);
  } while (this.messagesBuff.haveMoreSharedFiles);
  let withMedia = !!M.v.length;
  if (withMedia) {
    withMedia = await asyncMsgDialog(`*confirmation:!^${l.export_chat_media_dlg_conf}!${l.export_chat_media_dlg_rej}`, '', l.export_chat_media_dlg_title, l.export_chat_media_dlg_text);
    if (withMedia === null) {
      throw new Error('Aborted');
    }
  }
  let {
    attachNodes,
    stringNodes
  } = this.messagesBuff.getExportContent(withMedia);
  stringNodes = stringNodes.join('\n');
  const basename = M.getSafeName(this.getRoomTitle());
  const zname = l.export_chat_zip_file.replace('%s', basename);
  const bufferName = l.export_chat_text_file.replace('%s', basename);
  if (attachNodes.length) {
    const p = [];
    const n = [];
    let s = 0;
    for (const node of attachNodes) {
      s += node.s;
      if (node.ph) {
        p.push(node.ph);
      } else {
        n.push(node.h);
      }
    }
    const res = await asyncApiReq({
      a: 'qbq',
      s,
      n,
      p
    });
    if (res === 1 || res === 2) {
      const fallback = await asyncMsgDialog('confirmation', '', l.export_chat_media_obq_title, l.export_chat_media_obq_text);
      if (fallback) {
        return M.saveAs(stringNodes, bufferName);
      }
    } else if (res === 0) {
      await M.require('clientzip_js');
      const data = new TextEncoder().encode(stringNodes);
      const dl = {
        size: data.byteLength + s,
        n: bufferName,
        t: unixtime(),
        id: this.chatId,
        p: '',
        io: Object.create(null),
        writer: Object.create(null),
        offset: 0,
        zname
      };
      const io = await (0,_utils_jsx0__ .O1)(dl);
      const t = new Date((this.lastActivity || this.ctime) * 1000);
      let failedCount = 0;
      const src = (0,_utils_jsx0__ .VV)(attachNodes, size => {
        failedCount++;
        dl.done += size;
      });
      src.unshift({
        name: bufferName,
        lastModified: t,
        input: data.buffer
      });
      dl.done = 0;
      const reader = clientZip.downloadZip(src).body.getReader();
      dl.nextChunk = async () => {
        const read = await reader.read().catch(dump);
        if (!read) {
          reader.cancel().catch(ex => {
            if (ex !== EOVERQUOTA) {
              msgDialog('error', '', l.export_chat_failed, ex < 0 ? api_strerror(ex) : ex, undefined, 1);
            }
          });
          io.abort();
          delete this.exportIo;
          loadingDialog.hideProgress();
          return;
        }
        if (read.done) {
          loadingDialog.hideProgress();
          io.download(zname);
          delete this.exportIo;
          if (failedCount) {
            msgDialog('error', '', l.export_chat_failed, l.export_chat_partial_fail, undefined, 1);
          }
        } else {
          dl.done += read.value.byteLength;
          loadingDialog.showProgress(dl.done / dl.size * 100);
          io.write(read.value, dl.offset, dl.nextChunk);
          dl.offset += read.value.length;
        }
      };
      io.begin = dl.nextChunk;
      io.setCredentials(false, dl.size, zname);
      this.exportIo = io;
    } else {
      throw new Error(`Unexpected qbq response ${res}`);
    }
  } else {
    return M.saveAs(stringNodes, bufferName);
  }
};
ChatRoom.prototype.canJoinLimitedCall = function () {
  const callParts = this.getCallParticipants();
  return this.iAmOperator() && callParts.length < CallManager2.CALL_USER_LIMIT || callParts.length < CallManager2.CALL_USER_LIMIT - 1;
};
window.ChatRoom = ChatRoom;
 const __WEBPACK_DEFAULT_EXPORT__ = {
  ChatRoom
};

 },

 8022
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   BE: () =>  ContactFingerprint,
   U5: () =>  MembersAmount,
   bq: () =>  ContactButton,
   eu: () =>  Avatar,
   hU: () =>  ContactPickerWidget,
   hm: () =>  ContactPickerDialog,
   i1: () =>  ContactPresence,
   lO: () =>  MAX_FREQUENTS,
   n4: () =>  ContactVerified,
   nB: () =>  ContactCard,
   uA: () =>  ContactAwareName
 });

 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _mixins2__ = REQ_(8264);
 const _ui_utils_jsx3__ = REQ_(6411);
 const _ui_perfectScrollbar_jsx4__ = REQ_(1301);
 const _ui_buttons_jsx5__ = REQ_(5155);
 const _ui_dropdowns_jsx6__ = REQ_(1510);
 const _ui_modalDialogs7__ = REQ_(8120);
 const _link_jsx8__ = REQ_(4649);
 const _updateObserver_jsx9__ = REQ_(4372);
 const _contactsPanel_utils_jsx10__ = REQ_(836);












const MAX_FREQUENTS = 3;
const closeDropdowns = () => {
  document.dispatchEvent(new Event('closeDropdowns'));
};
class ContactButton extends _mixins2__ .u9 {
  constructor(props) {
    super(props);
    this.dropdownItemGenerator = this.dropdownItemGenerator.bind(this);
  }
  customIsEventuallyVisible() {
    if (this.props.chatRoom) {
      return this.props.chatRoom.isCurrentlyActive;
    }
    return -1;
  }
  dropdownItemGenerator() {
    let {
      contact,
      dropdowns,
      chatRoom,
      dropdownRemoveButton
    } = this.props;
    dropdowns = dropdowns ? dropdowns : [];
    const moreDropdowns = [];
    moreDropdowns.push(JSX_("div", {
      className: "dropdown-avatar rounded",
      key: "mainContactInfo",
      onClick: () => {
        if (contact.c === 2) {
          loadSubPage('fm/account');
        }
        if (contact.c === 1) {
          loadSubPage(`fm/chat/contacts/${  contact.u}`);
        }
      }
    }, JSX_(Avatar, {
      className: "avatar-wrapper context-avatar",
      chatRoom,
      contact,
      hideVerifiedBadge: "true"
    }), JSX_("div", {
      className: "dropdown-user-name"
    }, JSX_("div", {
      className: "name"
    }, JSX_(ContactAwareName, {
      overflow: true,
      contact
    }), JSX_(ContactPresence, {
      className: "small",
      contact
    })), contact && (megaChat.FORCE_EMAIL_LOADING || contact.c === 1 || contact.c === 2) && JSX_("span", {
      className: "email"
    }, contact.m))));
    moreDropdowns.push(JSX_(ContactFingerprint, {
      key: "fingerprint",
      contact
    }));
    if (dropdowns.length && contact.c !== 2) {
      moreDropdowns.push(dropdowns);
      moreDropdowns.push(JSX_("hr", {
        key: "top-separator"
      }));
    }
    if (contact.u === u_handle) {
      moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
        key: "view0",
        icon: "sprite-fm-mono icon-user-filled",
        label: l[187],
        onClick: () => loadSubPage('fm/account')
      }));
    }
    if (contact.c === 1) {
      const startAudioCall = () => {
        megaChat.createAndShowPrivateRoom(contact.u).then(room => {
          room.setActive();
          room.startAudioCall();
        });
      };
      if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
        moreDropdowns.push(JSX_("div", {
          key: "startAudioVideoCall",
          "data-simpletipposition": "top",
          className: "simpletip",
          "data-simpletip": !megaChat.hasSupportForCalls ? l.call_not_suported : ''
        }, JSX_(_ui_dropdowns_jsx6__ .tJ, {
          disabled: !megaChat.hasSupportForCalls,
          key: "startCall",
          className: "sprite-fm-mono-before icon-arrow-right-before",
          icon: "sprite-fm-mono icon-phone",
          submenu: megaChat.hasSupportForCalls,
          label: l[19125]
        }), JSX_("div", {
          className: "dropdown body submenu",
          key: "dropdownGroup"
        }, JSX_("div", null, JSX_(_ui_dropdowns_jsx6__ .tJ, {
          key: "startAudio",
          icon: "sprite-fm-mono icon-phone",
          disabled: !megaChat.hasSupportForCalls,
          label: l[1565],
          onClick: startAudioCall
        })), JSX_("div", null, JSX_(_ui_dropdowns_jsx6__ .tJ, {
          key: "startVideo",
          icon: "sprite-fm-mono icon-video-call-filled",
          disabled: !megaChat.hasSupportForCalls,
          label: l[1566],
          onClick: () => {
            megaChat.createAndShowPrivateRoom(contact.u).then(room => {
              room.setActive();
              room.startVideoCall();
            });
          }
        })))));
      } else {
        moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
          key: "startChat",
          icon: "sprite-fm-mono icon-chat",
          label: l[5885],
          onClick: () => {
            loadSubPage(`fm/chat/p/${  contact.u}`);
          }
        }));
      }
      moreDropdowns.push(JSX_("hr", {
        key: "files-separator"
      }));
      moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
        key: "send-files-item",
        icon: "sprite-fm-mono icon-send-files",
        label: l[6834],
        disabled: mega.paywall,
        onClick: () => {
          megaChat.openChatAndSendFilesDialog(contact.u);
        }
      }));
      moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
        key: "share-item",
        icon: "sprite-fm-mono icon-folder-outgoing-share",
        label: l[6775],
        onClick: () => {
          openCopyShareDialog(contact.u);
        }
      }));
    } else if (!is_chatlink && !is_eplusplus && (!contact.c || contact.c === 2 && contact.u !== u_handle)) {
      moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
        key: "view2",
        icon: "sprite-fm-mono icon-add",
        label: l[101],
        onClick: () => {
          const isAnonymousUser = !u_handle || u_type !== 3;
          const ADD_CONTACT = 'addContact';
          if (is_chatlink && isAnonymousUser) {
            megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);
            if (localStorage.getItem(ADD_CONTACT) === null) {
              localStorage.setItem(ADD_CONTACT, JSON.stringify({
                u: contact.u,
                unixTime: unixtime()
              }));
            }
          } else {
            loadingDialog.show();
            M.syncContactEmail(contact.u, true).then(email => {
              if (Object.values(M.opc || {}).some(cr => cr.m === email)) {
                closeDialog();
                msgDialog('warningb', '', l[17545]);
              } else {
                M.inviteContact(M.u[u_handle].m, email);
                const title = l[150];
                const msg = l[5898].replace('[X]', email);
                closeDialog();
                msgDialog('info', title, msg.replace('[X]', email));
              }
            }).catch(() => {
              const {
                chatRoom
              } = this.props;
              const {
                u: userHandle
              } = contact;
              if (chatRoom.call) {
                return mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle);
              }
              const name = M.getNameByHandle(userHandle);
              return msgDialog('info', '', l.ephemeral_title ? l.ephemeral_title.replace('%1', name) : `${name} is using an ephemeral session.`, l.ephemeral_info);
            }).finally(() => loadingDialog.hide());
          }
        }
      }));
    }
    if (u_attr && contact.u !== u_handle) {
      if (moreDropdowns.length > 0 && !(moreDropdowns.length === 2 && moreDropdowns[1] && moreDropdowns[1].key === "fingerprint")) {
        moreDropdowns.push(JSX_("hr", {
          key: "nicknames-separator"
        }));
      }
      moreDropdowns.push(JSX_(_ui_dropdowns_jsx6__ .tJ, {
        key: "set-nickname",
        icon: "sprite-fm-mono icon-rename",
        label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
        onClick: () => nicknames.setNicknameDialog.init(contact.u)
      }));
    }
    if (dropdownRemoveButton && dropdownRemoveButton.length) {
      moreDropdowns.push(JSX_("hr", {
        key: "remove-separator"
      }));
      moreDropdowns.push(dropdownRemoveButton);
    }
    return moreDropdowns;
  }
  render() {
    let {
      label = '',
      className = '',
      contact,
      dropdownIconClasses = [],
      verticalOffset,
      dropdownDisabled,
      noLoading,
      noContextMenu
    } = this.props;
    let dropdownPosition = "left top";
    let vertOffset = 0;
    let horizOffset = -30;
    if (!contact) {
      return null;
    }
    if (label) {
      className = `user-card-name ${className}${className.includes('message') ? '' : ' selectable-txt'}`;
      dropdownIconClasses = '';
      dropdownPosition = 'left bottom';
      vertOffset = 25;
      horizOffset = 0;
    }
    if (typeof verticalOffset !== 'undefined') {
      vertOffset = verticalOffset;
    }
    if (!contact.name && !contact.m && !noLoading && this.isLoadingContactInfo()) {
      label = JSX_("em", {
        className: "contact-name-loading"
      });
      className = `contact-button-loading ${className}`;
    }
    return noContextMenu ? JSX_("div", {
      className: "user-card-name light selectable-txt"
    }, label) : JSX_(_ui_buttons_jsx5__ .$, {
      className,
      icon: dropdownIconClasses,
      disabled: dropdownDisabled,
      label
    }, JSX_(_ui_dropdowns_jsx6__ .ms, {
      className: "context contact-card-dropdown",
      positionMy: dropdownPosition,
      positionAt: dropdownPosition,
      vertOffset,
      horizOffset,
      dropdownItemGenerator: this.dropdownItemGenerator,
      noArrow: true
    }));
  }
}
ContactButton.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactVerified extends _mixins2__ .w9 {
  attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  }
  render() {
    if (is_chatlink) {
      return null;
    }
    const {contact} = this.props;
    if (!contact) {
      return null;
    }
    if (u_authring && u_authring.Ed25519) {
      const verifyState = u_authring.Ed25519[contact.u] || {};
      if (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        return JSX_("div", {
          className: `
                            user-card-verified
                            ${this.props.className || ''}
                        `
        });
      }
    } else if (!pubEd25519[contact.u]) {
      crypt.getPubEd25519(contact.u).then(() => {
        if (pubEd25519[contact.u]) {
          this.safeForceUpdate();
        }
      });
    }
    return null;
  }
}
ContactVerified.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactPresence extends _mixins2__ .w9 {
  constructor(...args) {
    super(...args);
    this.domRef = react1___default().createRef();
  }
  attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['presence']);
  }
  render() {
    const {
      contact,
      className
    } = this.props;
    if (!contact || !contact.c) {
      return null;
    }
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    user-card-presence
                    ${megaChat.userPresenceToCssClass(contact.presence)}
                    ${className || ''}
                `
    });
  }
}
ContactPresence.defaultProps = {
  manualDataChangeTracking: true,
  skipQueuedUpdatesOnResize: true
};
const LastActivity = (0,_mixins2__ .Zz)(_updateObserver_jsx9__ .Y)((() => class LastActivity extends _mixins2__ .u9 {
  attachRerenderCallbacks() {
    this._attachRerenderCbContacts(['ats', 'lastGreen', 'presence']);
  }
  shouldComponentUpdate() {
    return true;
  }
  render() {
    const {
      contact,
      showLastGreen
    } = this.props;
    if (!contact) {
      return null;
    }
    const lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
    const SECONDS = Date.now() / 1000 - lastActivity;
    const timeToLast = SECONDS > 3888000 ? l[20673] : time2last(lastActivity, true);
    const hasActivityStatus = showLastGreen && contact.presence <= 2 && lastActivity;
    return JSX_("span", null, hasActivityStatus ? (l[19994] || 'Last seen %s').replace('%s', timeToLast) : M.onlineStatusClass(contact.presence)[0]);
  }
})());
class ContactAwareName extends _mixins2__ .u9 {
  render() {
    const {
      contact,
      emoji,
      overflow
    } = this.props;
    if (!contact || !M.u[contact.u || contact.h]) {
      return null;
    }
    const name = M.getNameByHandle(contact.u || contact.h);
    if (emoji || overflow) {
      const EmojiComponent = overflow ? _ui_utils_jsx3__ .sp : _ui_utils_jsx3__ .zT;
      return JSX_(EmojiComponent, this.props, name);
    }
    return JSX_("span", null, name);
  }
}
class MembersAmount extends _mixins2__ .u9 {
  render() {
    const {
      chatRoom
    } = this.props;
    return JSX_("span", null, mega.icu.format(l[20233], Object.keys(chatRoom.members).length));
  }
}
class ContactFingerprint extends _mixins2__ .w9 {
  constructor(...args) {
    super(...args);
    this.domRef = react1___default().createRef();
  }
  attachRerenderCallbacks() {
    this.addDataStructListenerForProperties(this.props.contact, ['fingerprint']);
  }
  render() {
    const {
      contact,
      className
    } = this.props;
    if (!contact || !contact.u || is_chatlink) {
      return null;
    }
    const infoBlocks = [];
    userFingerprint(contact.u, (fingerprints) => {
      fingerprints.forEach((v, k) => {
        infoBlocks.push(JSX_("span", {
          key: `fingerprint-${  k}`
        }, v));
      });
    });
    let verifyButton = null;
    if (contact.c === 1 && u_authring && u_authring.Ed25519) {
      const verifyState = u_authring.Ed25519[contact.u] || {};
      if (typeof verifyState.method === "undefined" || verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
        verifyButton = JSX_(_ui_buttons_jsx5__ .$, {
          className: "dropdown-verify active",
          label: l.verify_credentials,
          icon: "sprite-fm-mono icon-key",
          onClick: () => {
            closeDropdowns();
            fingerprintDialog(contact.u);
          }
        });
      }
    }
    return infoBlocks.length ? JSX_("div", {
      ref: this.domRef,
      className: `
                        dropdown-fingerprint
                        ${className || ''}
                    `
    }, JSX_("div", {
      className: "contact-fingerprint-title"
    }, JSX_("span", null, l[6872])), JSX_("div", {
      className: "contact-fingerprint-txt selectable-txt"
    }, infoBlocks), verifyButton) : null;
  }
}
ContactFingerprint.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class Avatar extends _mixins2__ .u9 {
  render() {
    const self = this;
    const {contact} = this.props;
    if (!contact) {
      return null;
    }
    if (!contact.m && contact.email) {
      contact.m = contact.email;
    }
    const avatarMeta = useravatar.generateContactAvatarMeta(contact);
    let classes = `${this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar'  } ${  contact.u  } in-chat`;
    classes += " chat-avatar";
    let displayedAvatar;
    let verifiedElement = null;
    if (!this.props.hideVerifiedBadge && !is_chatlink) {
      verifiedElement = JSX_(ContactVerified, {
        contact: this.props.contact,
        className: this.props.verifiedClassName
      });
    }
    const extraProps = {};
    if (this.props.simpletip) {
      classes += " simpletip";
      if (this.props.simpletip === true) {
        extraProps['data-simpletip'] = M.getNameByHandle(contact.h || contact.u) || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER;
      } else {
        extraProps['data-simpletip'] = this.props.simpletip;
      }
      if (this.props.simpletipWrapper) {
        extraProps['data-simpletipwrapper'] = this.props.simpletipWrapper;
      }
      if (this.props.simpletipOffset) {
        extraProps['data-simpletipoffset'] = this.props.simpletipOffset;
      }
      if (this.props.simpletipPosition) {
        extraProps['data-simpletipposition'] = this.props.simpletipPosition;
      }
      if (this.props.simpletipClass) {
        extraProps['data-simpletip-class'] = this.props.simpletipClass;
      }
    }
    if (avatarMeta.type === "image") {
      displayedAvatar = JSX_("div", (0,_babel_runtime_helpers_extends0__ .A)({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? e => {
          closeDropdowns();
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, JSX_("img", {
        src: avatarMeta.avatar,
        style: this.props.imgStyles
      }));
    } else {
      classes += ` color${  avatarMeta.avatar.colorIndex}`;
      const isLoading = self.isLoadingContactInfo();
      if (isLoading) {
        classes += " default-bg";
      }
      displayedAvatar = JSX_("div", (0,_babel_runtime_helpers_extends0__ .A)({
        className: classes,
        style: this.props.style
      }, extraProps, {
        onClick: self.props.onClick ? e => {
          closeDropdowns();
          self.props.onClick(e);
        } : self.onClick
      }), verifiedElement, JSX_("span", null, isLoading ? "" : avatarMeta.avatar.letters));
    }
    return displayedAvatar;
  }
}
Avatar.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactCard extends _mixins2__ .u9 {
  attachRerenderCallbacks() {
    this._attachRerenderCbContacts(['presence']);
  }
  specShouldComponentUpdate(nextProps, nextState) {
    const foundKeys = Object.keys(this.props);
    if (foundKeys.includes('dropdowns')) {
      array.remove(foundKeys, 'dropdowns', true);
    }
    let shouldUpdate;
    if (foundKeys.length) {
      const k = foundKeys[0];
      shouldUpdate = shallowEqual(nextProps[k], this.props[k]);
    }
    if (!shouldUpdate) {
      shouldUpdate = shallowEqual(nextState, this.state);
    }
    if (!shouldUpdate && this.state.props.dropdowns && nextProps.state.dropdowns && this.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
      const oldKeys = this.state.props.dropdowns.map(child => child.key);
      const newKeys = nextProps.state.dropdowns.map(child => child.key);
      if (!shallowEqual(oldKeys, newKeys)) {
        shouldUpdate = true;
      }
    }
    return shouldUpdate;
  }
  render() {
    let _this$props$chatRoom;
    const {
      contact
    } = this.props;
    if (!contact) {
      return null;
    }
    const pres = megaChat.userPresenceToCssClass(contact.presence);
    let username = (this.props.namePrefix || '') + (M.getNameByHandle(contact.u) || contact.m);
    if (contact.u === u_handle) {
      username += ` (${escapeHTML(l[8885])})`;
    }
    let escapedUsername = JSX_(_ui_utils_jsx3__ .sp, null, username);
    const dropdowns = this.props.dropdowns || [];
    const noContextMenu = this.props.noContextMenu || '';
    const noContextButton = this.props.noContextButton || '';
    const dropdownRemoveButton = this.props.dropdownRemoveButton || [];
    const highlightSearchValue = this.props.highlightSearchValue || false;
    const emailTooltips = this.props.emailTooltips || false;
    const searchValue = this.props.searchValue || "";
    let usernameBlock;
    if (!noContextMenu) {
      usernameBlock = JSX_(ContactButton, {
        key: "lnk",
        dropdowns,
        noContextMenu,
        contact,
        className: "light",
        label: escapedUsername,
        chatRoom: this.props.chatRoom,
        dropdownRemoveButton,
        verticalOffset: 0
      });
    } else {
      if (highlightSearchValue && searchValue.length > 0) {
        const matches = [];
        const regex = new RegExp(RegExpEscape(searchValue), 'gi');
        let result;
        while (result = regex.exec(username)) {
          matches.push({
            idx: result.index,
            str: result[0]
          });
        }
        if (matches.length > 0) {
          escapedUsername = JSX_(_ui_utils_jsx3__ .P9, null, megaChat.highlight(megaChat.html(username), matches, true));
        }
      }
      usernameBlock = emailTooltips ? JSX_("div", {
        className: "user-card-name light simpletip selectable-txt",
        "data-simpletip": contact.m,
        "data-simpletipposition": "top"
      }, escapedUsername) : JSX_("div", {
        className: "user-card-name light selectable-txt"
      }, escapedUsername);
    }
    let userCard = null;
    const className = this.props.className || '';
    userCard = className.includes('short') ? JSX_("div", {
      className: "user-card-data"
    }, usernameBlock, JSX_("div", {
      className: "user-card-status"
    }, this.props.isInCall ? JSX_("div", {
      className: "audio-call"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-phone"
    })) : null, JSX_(LastActivity, {
      contact,
      showLastGreen: this.props.showLastGreen
    }))) : JSX_("div", {
      className: "user-card-data"
    }, usernameBlock, JSX_(ContactPresence, {
      contact,
      className: this.props.presenceClassName
    }), this.props.isInCall ? JSX_("div", {
      className: "audio-call"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-phone"
    })) : null, JSX_("div", {
      className: "user-card-email selectable-txt"
    }, contact.m));
    return JSX_("div", {
      className: `
                    contacts-info body
                    ${pres === 'offline' ? 'offline' : ''}
                    ${className || ''}
                `,
      style: this.props.style,
      onClick: ev => {
        let _this$props$onClick, _this$props;
        return (_this$props$onClick = (_this$props = this.props).onClick) == null ? void 0 : _this$props$onClick.call(_this$props, contact, ev);
      },
      onDoubleClick: ev => {
        let _this$props$onDoubleC, _this$props2;
        return (_this$props$onDoubleC = (_this$props2 = this.props).onDoubleClick) == null ? void 0 : _this$props$onDoubleC.call(_this$props2, contact, ev);
      }
    }, this.props.withSelfNote ? JSX_("div", {
      className: `
                            note-chat-signifier
                            ${(_this$props$chatRoom = this.props.chatRoom) != null && _this$props$chatRoom.hasMessages() ? '' : 'note-chat-empty'}
                        `
    }, JSX_("i", {
      className: "sprite-fm-mono icon-file-text-thin-outline note-chat-icon"
    })) : JSX_(Avatar, {
      className: "avatar-wrapper small-rounded-avatar",
      contact,
      chatRoom: this.props.chatRoom
    }), is_chatlink || noContextButton ? null : JSX_(ContactButton, {
      key: "button",
      dropdowns,
      dropdownIconClasses: this.props.dropdownIconClasses || '',
      disabled: this.props.dropdownDisabled,
      noContextMenu,
      contact,
      className: this.props.dropdownButtonClasses,
      dropdownRemoveButton,
      noLoading: this.props.noLoading,
      chatRoom: this.props.chatRoom,
      verticalOffset: 0
    }), this.props.selectable ? JSX_("div", {
      className: "user-card-tick-wrap"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-check"
    })) : null, megaChat.WITH_SELF_NOTE && this.props.withSelfNote ? JSX_("div", {
      className: "user-card-data"
    }, JSX_("div", {
      className: "user-card-name light selectable-txt note-chat-label"
    }, l.note_label), JSX_("div", {
      className: "user-card-status"
    })) : userCard);
  }
}
ContactCard.defaultProps = {
  dropdownButtonClasses: "tiny-button",
  dropdownIconClasses: "tiny-icon icons-sprite grey-dots",
  presenceClassName: '',
  manualDataChangeTracking: true,
  skipQueuedUpdatesOnResize: true
};
class ContactItem extends _mixins2__ .u9 {
  render() {
    const self = this;
    const {contact} = this.props;
    if (!contact) {
      return null;
    }
    const username = this.props.namePrefix ? this.props.namePrefix : `${  M.getNameByHandle(contact.u)}`;
    return JSX_("div", {
      className: "selected-contact-card short"
    }, JSX_("div", {
      className: "remove-contact-bttn",
      onClick: e => {
        if (self.props.onClick) {
          self.props.onClick(contact, e);
        }
      }
    }, JSX_("i", {
      className: "tiny-icon small-cross"
    })), JSX_(Avatar, {
      contact,
      className: "avatar-wrapper small-rounded-avatar",
      hideVerifiedBadge: true,
      chatRoom: this.props.chatRoom
    }), JSX_("div", {
      className: "user-card-data simpletip",
      "data-simpletip": username || megaChat.plugins.userHelper.SIMPLETIP_USER_LOADER,
      "data-simpletipposition": "top"
    }, JSX_(ContactButton, {
      noContextMenu: this.props.noContextMenu,
      contact,
      className: "light",
      label: JSX_(_ui_utils_jsx3__ .zT, null, username),
      chatRoom: this.props.chatRoom
    })));
  }
}
ContactItem.defaultProps = {
  'manualDataChangeTracking': true,
  'skipQueuedUpdatesOnResize': true
};
class ContactPickerWidget extends _mixins2__ .w9 {
  constructor(...args) {
    super(...args);
    this.contactLinkListener = null;
    this.domRef = react1___default().createRef();
    this.state = {
      searchValue: '',
      selected: this.props.selected || [],
      publicLink: M.account && M.account.contactLink || undefined
    };
    this.normalize = input => ChatSearch._normalize_str(String(input || '').toLowerCase());
    this.onSearchChange = ev => {
      this.setState({
        searchValue: ev.target.value
      });
    };
    this.renderParticipantsList = () => {
      const {
        contacts,
        emailTooltips,
        onSelected
      } = this.props;
      const {
        selected
      } = this.state;
      const $$list = contacts.map(handle => {
        const added = selected.includes(handle);
        return JSX_(ContactCard, {
          key: handle,
          className: `
                            contacts-search short
                            ${added ? 'selected' : ''}
                        `,
          contact: M.u[handle],
          selectable: true,
          emailTooltips,
          noContextButton: true,
          noContextMenu: true,
          onClick: () => {
            this.setState({
              selected: added ? selected.filter(h => h !== handle) : [...selected, handle]
            }, () => onSelected(this.state.selected));
          }
        });
      });
      return JSX_(_ui_perfectScrollbar_jsx4__ .O, {
        className: "contacts-search-scroll",
        selected,
        contacts
      }, JSX_("div", {
        className: "contacts-search-subsection"
      }, JSX_("div", {
        className: "contacts-list-header"
      }, megaChat.activeCall ? l.call_participants : l[16217]), JSX_("div", {
        className: "contacts-search-list"
      }, $$list)));
    };
  }
  renderInviteWarning() {
    const {
      chatRoom
    } = this.props;
    const {
      activeCall
    } = megaChat;
    if (!activeCall || activeCall.chatRoom.chatId !== chatRoom.chatId || !activeCall.sfuClient.callLimits || !activeCall.sfuClient.callLimits.usr || chatRoom.getCallParticipants().length < activeCall.sfuClient.callLimits.usr) {
      return null;
    }
    return JSX_("div", {
      className: "picker-user-limit-banner"
    }, activeCall.organiser === u_handle ? (0,_ui_utils_jsx3__ .lI)(l.invite_limit_banner_organiser, '[A]', _link_jsx8__ .A, {
      onClick() {
        window.open(`${getBaseUrl()}/pro`, '_blank', 'noopener,noreferrer');
        eventlog(500263);
      }
    }) : l.invite_limit_banner_host);
  }
  componentDidMount() {
    super.componentDidMount();
    setContactLink(this.domRef && this.domRef.current);
    this.contactLinkListener = mBroadcaster.addListener('contact:setContactLink', publicLink => this.state.publicLink ? null : this.setState({
      publicLink
    }));
  }
  componentDidUpdate() {
    const self = this;
    if (self.scrollToLastSelected && self.psSelected) {
      self.scrollToLastSelected = false;
      self.psSelected.scrollToPercentX(100, false);
    }
    if (self.searchContactsScroll) {
      self.searchContactsScroll.reinitialise();
    }
  }
  UNSAFE_componentWillMount() {
    if (super.UNSAFE_componentWillMount) {
      super.UNSAFE_componentWillMount();
    }
    const self = this;
    if (self.props.multiple) {
      $(document.body).rebind(`keypress.contactPicker${  self.getUniqueId()}`, (e) => {
        const keyCode = e.which || e.keyCode;
        if (keyCode === 13) {
          if (self.state.selected) {
            e.preventDefault();
            e.stopPropagation();
            closeDropdowns();
            if (self.props.onSelectDone) {
              self.props.onSelectDone(self.state.selected);
            }
          }
        }
      });
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const self = this;
    delete self._foundFrequents;
    if (self.props.multiple) {
      $(document.body).off(`keypress.contactPicker${  self.getUniqueId()}`);
    }
    if (this.contactLinkListener) {
      mBroadcaster.removeListener(this.contactLinkListener);
    }
  }
  _eventuallyAddContact(v, contacts, selectableContacts, forced) {
    const self = this;
    const withSelfNote = this.props.withSelfNote && v.u === u_handle;
    if (v.u === u_handle && !this.props.step && !withSelfNote) {
      return false;
    }
    if (!forced && v.c !== 1 && v.u !== u_handle) {
      return false;
    }
    if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
      return false;
    }
    let isDisabled = false;
    if (!self.wasMissingKeysForContacts) {
      self.wasMissingKeysForContacts = {};
    }
    if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      self.wasMissingKeysForContacts[v.u] = true;
      ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u]).always(() => {
        if (self.isMounted()) {
          self.safeForceUpdate();
        }
      });
      isDisabled = true;
      return true;
    } else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
      return false;
    }
    if (self.state.searchValue && self.state.searchValue.length > 0) {
      const searchValue = this.normalize(this.state.searchValue);
      const {
        name,
        nickname,
        fullname,
        u,
        m
      } = {
        ...v,
        name: withSelfNote ? l.note_label : v.name
      };
      const matches = [name, nickname, fullname, M.getNameByHandle(u), !this.props.skipMailSearch && m].some(field => this.normalize(field).includes(searchValue));
      if (!matches) {
        return false;
      }
    }
    let selectedClass = "";
    if (self.state.selected && self.state.selected.indexOf(v.u) !== -1) {
      selectedClass = "selected";
    }
    contacts.push(JSX_(ContactCard, {
      withSelfNote,
      disabled: isDisabled,
      contact: v,
      chatRoom: withSelfNote && megaChat.getNoteChat(),
      className: `contacts-search short ${  selectedClass  }${isDisabled ? " disabled" : ""}`,
      noContextButton: "true",
      selectable: selectableContacts,
      onClick: self.props.readOnly ? () => {} : contact => {
        if (isDisabled) {
          return false;
        }
        const contactHash = contact.u;
        if (contactHash === self.lastClicked && new Date() - self.clickTime < 500 && !self.props.disableDoubleClick || !self.props.multiple) {
          if (self.props.onSelected) {
            self.props.onSelected([contactHash]);
          }
          self.props.onSelectDone([contactHash]);
          closeDropdowns();
          return;
        } else {
          const selected = clone(self.state.selected || []);
          if (selected.indexOf(contactHash) === -1) {
            selected.push(contactHash);
            self.scrollToLastSelected = true;
            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          } else {
            if (selected.indexOf(contactHash) >= 0) {
              array.remove(selected, contactHash);
            }
            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          }
          self.setState({
            selected
          });
          if (self.props.selectCleanSearchRes) {
            self.setState({
              'searchValue': ''
            });
          }
          if (self.props.autoFocusSearchField) {
            let _self$contactSearchFi;
            (_self$contactSearchFi = self.contactSearchField) == null || _self$contactSearchFi.focus();
          }
        }
        self.clickTime = new Date();
        self.lastClicked = contactHash;
      },
      noContextMenu: true,
      searchValue: self.state.searchValue,
      highlightSearchValue: self.props.highlightSearchValue,
      emailTooltips: self.props.emailTooltips,
      key: v.u
    }));
    if (typeof this.props.onEventuallyUpdated === 'function') {
      this.props.onEventuallyUpdated();
    }
    return true;
  }
  render() {
    const self = this;
    let contacts = [];
    const frequentContacts = [];
    let extraClasses = "";
    const contactsSelected = [];
    let multipleContacts = null;
    let selectableContacts = false;
    let selectFooter = null;
    let selectedContacts = false;
    const isSearching = !!self.state.searchValue;
    megaChat.getNoteChat();
    const onAddContact = e => {
      e.preventDefault();
      e.stopPropagation();
      contactAddDialog();
      if (this.props.onClose) {
        this.props.onClose();
      }
    };
    if (self.props.readOnly) {
      const sel = self.state.selected || [];
      for (let i = 0; i < sel.length; i++) {
        const v = sel[i];
        contactsSelected.push(JSX_(ContactItem, {
          contact: M.u[v],
          key: v,
          chatRoom: self.props.chatRoom
        }));
      }
    } else if (self.props.multiple) {
      selectableContacts = true;
      const onSelectDoneCb = e => {
        e.preventDefault();
        e.stopPropagation();
        closeDropdowns();
        if (self.props.onSelectDone) {
          self.props.onSelectDone(self.state.selected);
        }
      };
      let onContactSelectDoneCb = contact => {
        const contactHash = contact.u;
        if (contactHash === self.lastClicked && new Date() - self.clickTime < 500) {
          if (self.props.onSelected) {
            self.props.onSelected([contactHash]);
          }
          self.props.onSelectDone([contactHash]);
          return;
        } else {
          const selected = clone(self.state.selected || []);
          if (selected.indexOf(contactHash) === -1) {
            selected.push(contactHash);
            self.scrollToLastSelected = true;
            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          } else {
            if (selected.indexOf(contactHash) >= 0) {
              array.remove(selected, contactHash);
            }
            if (self.props.onSelected) {
              self.props.onSelected(selected);
            }
          }
          self.setState({
            selected
          });
          if (self.props.selectCleanSearchRes) {
            self.setState({
              'searchValue': ''
            });
          }
          if (self.props.autoFocusSearchField) {
            let _self$contactSearchFi2;
            (_self$contactSearchFi2 = self.contactSearchField) == null || _self$contactSearchFi2.focus();
          }
        }
        self.clickTime = new Date();
        self.lastClicked = contactHash;
      };
      const selectedWidthSize = self.props.selectedWidthSize || 54;
      const selectedWidth = self.state.selected.length * selectedWidthSize;
      if (!self.state.selected || self.state.selected.length === 0) {
        selectedContacts = false;
        const emptySelectionMsg = self.props.emptySelectionMsg || l[8889];
        multipleContacts = JSX_("div", {
          className: "horizontal-contacts-list"
        }, JSX_("div", {
          className: "contacts-list-empty-txt"
        }, self.props.nothingSelectedButtonLabel ? self.props.nothingSelectedButtonLabel : emptySelectionMsg));
      } else {
        selectedContacts = true;
        onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
        const sel2 = self.state.selected || [];
        for (let i2 = 0; i2 < sel2.length; i2++) {
          const v2 = sel2[i2];
          contactsSelected.push(JSX_(ContactItem, {
            key: v2,
            chatRoom: self.props.chatRoom || false,
            contact: M.u[v2],
            noContextMenu: true,
            onClick: onContactSelectDoneCb
          }));
        }
        multipleContacts = JSX_("div", {
          className: "horizontal-contacts-list"
        }, JSX_(_ui_perfectScrollbar_jsx4__ .O, {
          className: "perfectScrollbarContainer selected-contact-block horizontal-only",
          selected: this.state.selected,
          ref (psSelected) {
            self.psSelected = psSelected;
          }
        }, JSX_("div", {
          className: "select-contact-centre",
          style: {
            width: selectedWidth
          }
        }, contactsSelected)));
      }
      if (self.props.selectFooter) {
        selectFooter = JSX_("footer", null, JSX_("button", {
          className: "mega-button",
          onClick: onAddContact.bind(self)
        }, JSX_("span", null, l[71])), JSX_("div", {
          className: "footer-spacing"
        }), JSX_("button", {
          className: `mega-button ${selectedContacts ? '' : 'disabled'}`,
          onClick (e) {
            if (self.state.selected.length > 0) {
              onSelectDoneCb(e);
            }
          }
        }, JSX_("span", null, this.props.multipleSelectedButtonLabel ? this.props.multipleSelectedButtonLabel : l[8890])));
      }
    }
    const alreadyAdded = {};
    let hideFrequents = !self.props.readOnly && !self.state.searchValue && frequentContacts.length > 0;
    let frequentsLoading = false;
    if (this.props.readOnly || this.props.disableFrequents) {
      hideFrequents = true;
      this._foundFrequents = [];
    } else if (!self._foundFrequents) {
      frequentsLoading = true;
      this._foundFrequents = [];
      megaChat.getFrequentContacts().then(res => {
        this._foundFrequents = res.slice(Math.max(res.length - 30, 0), res.length).reverse();
      }).catch(dump).finally(() => {
        if (this.isMounted()) {
          this.safeForceUpdate();
        }
      });
    }
    for (let i = this._foundFrequents.length, total = 0; total < MAX_FREQUENTS && i--;) {
      const v = this._foundFrequents[i];
      if (v.userId in M.u && this._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
        alreadyAdded[v.userId] = 1;
        total++;
      }
    }
    self.props.contacts.forEach((v) => {
      alreadyAdded[v.h] || self._eventuallyAddContact(v, contacts, selectableContacts);
    });
    const sortFn = M.getSortByNameFn2(1);
    contacts.sort((a, b) => {
      return b.props.withSelfNote - a.props.withSelfNote || sortFn(a.props.contact, b.props.contact);
    });
    if (Object.keys(alreadyAdded).length === 0) {
      hideFrequents = true;
    }
    const innerDivStyles = {};
    if (this.props.showMeAsSelected) {
      self._eventuallyAddContact(M.u[u_handle], contacts, selectableContacts, true);
    }
    let noOtherContacts = false;
    if (contacts.length === 0 || !(0,_contactsPanel_utils_jsx10__ .SN)() && this.props.step !== 1) {
      noOtherContacts = true;
      let noContactsMsg = "";
      if (M.u.length < 2) {
        noContactsMsg = l[8877];
      } else {
        noContactsMsg = l[8878];
      }
      if (hideFrequents) {
        contacts = JSX_("em", null, noContactsMsg);
      }
    }
    const haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;
    let contactsList;
    if (haveContacts) {
      if (frequentContacts.length === 0 && noOtherContacts) {
        if (self.props.newEmptySearchResult) {
          contactsList = JSX_("div", {
            className: "chat-contactspicker-no-contacts flex flex-column flex-center searching mt-2"
          }, JSX_("div", {
            className: "section-icon sprite-fm-mono icon-contacts"
          }), JSX_("div", {
            className: "fm-empty-cloud-txt small"
          }, l[8674]));
        } else {
          contactsList = JSX_("div", {
            className: "chat-contactspicker-no-contacts flex flex-column mt-2"
          }, JSX_("div", {
            className: "contacts-list-header"
          }, l[165]), JSX_("div", {
            className: "flex flex-1 flex-column flex-center"
          }, JSX_("div", {
            className: "section-icon sprite-fm-mono icon-contacts"
          }), JSX_("div", {
            className: "fm-empty-cloud-txt small"
          }, l[784]), JSX_("div", {
            className: "fm-empty-description small"
          }, l[19115])));
        }
      } else {
        contactsList = JSX_(_ui_perfectScrollbar_jsx4__ .O, {
          ref: ref => {
            self.searchContactsScroll = ref;
          },
          className: "contacts-search-scroll",
          selected: this.state.selected,
          changedHashProp: this.props.changedHashProp,
          contacts,
          frequentContacts,
          searchValue: this.state.searchValue
        }, JSX_(react1___default().Fragment, null, JSX_("div", {
          className: "contacts-search-subsection",
          style: {
            display: hideFrequents ? 'none' : ''
          }
        }, JSX_("div", {
          className: "contacts-list-header"
        }, l[20141]), frequentsLoading ? JSX_("div", {
          className: "loading-spinner"
        }, "...") : JSX_("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, frequentContacts)), contacts.length > 0 ? JSX_("div", {
          className: "contacts-search-subsection"
        }, JSX_("div", {
          className: "contacts-list-header"
        }, frequentContacts && frequentContacts.length === 0 ? this.props.readOnly ? l[16217] : l[165] : l[165]), JSX_("div", {
          className: "contacts-search-list",
          style: innerDivStyles
        }, contacts)) : null));
      }
    } else if (self.props.newNoContact) {
      multipleContacts = "";
      contactsList = JSX_("div", {
        className: "chat-contactspicker-no-contacts flex flex-column flex-center mt-2"
      }, JSX_("div", {
        className: "section-icon sprite-fm-mono icon-contacts"
      }), JSX_("div", {
        className: "fm-empty-cloud-txt small"
      }, l[784]), JSX_("div", {
        className: "fm-empty-description small"
      }, l[19115]));
      extraClasses += " no-contacts";
    } else {
      contactsList = JSX_("div", {
        className: "chat-contactspicker-no-contacts flex flex-column flex-center mt-16"
      }, JSX_("div", {
        className: "section-icon sprite-fm-mono icon-contacts"
      }), JSX_("div", {
        className: "fm-empty-cloud-txt small"
      }, l[784]), JSX_("div", {
        className: "fm-empty-description small"
      }, l[19115]), JSX_("button", {
        className: "mega-button positive large fm-empty-button",
        onClick: () => {
          contactAddDialog();
          self.props.onClose == null || self.props.onClose();
        }
      }, JSX_("span", null, l[101])), JSX_("div", {
        className: `
                            ${this.state.publicLink ? '' : 'loading'}
                            empty-share-public
                        `
      }, JSX_("i", {
        className: "sprite-fm-mono icon-link-circle"
      }), JSX_(_ui_utils_jsx3__ .P9, null, l[19111])));
      extraClasses += " no-contacts";
    }
    const totalContactsNum = contacts.length + frequentContacts.length;
    const searchPlaceholderMsg = mega.icu.format(l.search_contact_placeholder, totalContactsNum);
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${this.props.className || ''}
                    ${extraClasses}
                `
    }, this.props.topButtons && JSX_("div", {
      className: "contacts-search-buttons"
    }, this.props.topButtons.map(button => {
      const {
        key,
        icon,
        className,
        title,
        onClick
      } = button || {};
      return JSX_("div", {
        key,
        className: "button-wrapper",
        onClick: e => {
          closeDropdowns();
          onClick(e);
        }
      }, JSX_(_ui_buttons_jsx5__ .$, {
        className: `
                                            ${className || ''}
                                            ${key === 'newChatLink' ? 'branded-blue' : ''}
                                            mega-button
                                        `,
        icon,
        label: title
      }));
    })), multipleContacts, !this.props.readOnly && haveContacts && !this.props.hideSearch && JSX_(react1___default().Fragment, null, JSX_("div", {
      className: `
                                contacts-search-header
                                ${this.props.headerClasses}
                            `
    }, JSX_("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), JSX_("input", {
      autoFocus: true,
      type: "search",
      placeholder: searchPlaceholderMsg,
      ref: nodeRef => {
        this.contactSearchField = nodeRef;
      },
      onChange: this.onSearchChange,
      value: this.state.searchValue
    }), JSX_("div", {
      className: `
                                    search-result-clear
                                    ${this.state.searchValue && this.state.searchValue.length > 0 ? '' : 'hidden'}
                                `,
      onClick: () => {
        this.setState({
          searchValue: ''
        }, () => {
          let _this$contactSearchFi;
          return (_this$contactSearchFi = this.contactSearchField) == null ? void 0 : _this$contactSearchFi.focus();
        });
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-close-component"
    })))), this.props.inviteWarningLabel && this.props.chatRoom && this.renderInviteWarning(), !this.props.readOnly && haveContacts && !this.props.hideSearch && JSX_("div", {
      className: "contacts-search-header-separator"
    }), this.props.participantsList ? this.renderParticipantsList() : contactsList, selectFooter, this.props.showAddContact && (0,_contactsPanel_utils_jsx10__ .SN)() ? JSX_("div", {
      className: "contacts-search-bottom"
    }, JSX_(_ui_buttons_jsx5__ .$, {
      className: "mega-button action positive",
      icon: "sprite-fm-mono icon-add-circle",
      label: l[71],
      onClick: () => {
        let _this$props$onAddCont, _this$props3;
        contactAddDialog();
        closeDropdowns();
        (_this$props$onAddCont = (_this$props3 = this.props).onAddContact) == null || _this$props$onAddCont.call(_this$props3);
      }
    })) : null);
  }
}
ContactPickerWidget.defaultProps = {
  multipleSelectedButtonLabel: false,
  singleSelectedButtonLabel: false,
  nothingSelectedButtonLabel: false,
  allowEmpty: false,
  disableFrequents: false,
  skipMailSearch: false,
  autoFocusSearchField: true,
  selectCleanSearchRes: true,
  disableDoubleClick: false,
  newEmptySearchResult: false,
  newNoContact: false,
  emailTooltips: false
};
class ContactPickerDialog extends _mixins2__ .w9 {
  constructor(...args) {
    super(...args);
    this.dialogName = 'contact-picker-dialog';
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
      allowEmpty,
      className,
      exclude,
      megaChat,
      multiple,
      multipleSelectedButtonLabel,
      name,
      nothingSelectedButtonLabel,
      selectFooter,
      singleSelectedButtonLabel,
      inviteWarningLabel,
      chatRoom,
      onClose,
      onSelectDone
    } = this.props;
    return JSX_(_ui_modalDialogs7__ .A.ModalDialog, {
      name,
      className: `
                    ${className}
                    ${this.dialogName}
                    contacts-search
                `,
      onClose
    }, JSX_(ContactPickerWidget, {
      active,
      allowEmpty,
      className: "popup contacts-search small-footer",
      contacts: M.u,
      exclude,
      megaChat,
      multiple,
      multipleSelectedButtonLabel,
      nothingSelectedButtonLabel,
      selectFooter,
      singleSelectedButtonLabel,
      inviteWarningLabel,
      chatRoom,
      onClose,
      onSelectDone
    }));
  }
}

 },

 8120
(_, EXP_, REQ_) {

"use strict";

// EXPORTS
REQ_.d(EXP_, {
  A: () =>  modalDialogs
});

// UNUSED EXPORTS: ExtraFooterElement

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/ui/forms.jsx


class Checkbox extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      checked: this.props.checked ? this.props.checked : false
    };
    this.onLabelClick = this.onLabelClick.bind(this);
    this.onChange = this.onChange.bind(this);
  }
  onLabelClick(e) {
    const state = !this.state.checked;
    this.setState({
      'checked': state
    });
    if (this.props.onLabelClick) {
      this.props.onLabelClick(e, state);
    }
    this.onChange(e);
  }
  onChange(e) {
    if (this.props.onChange) {
      this.props.onChange(e, this.state.checked);
    }
  }
  render() {
    const {
      name,
      id,
      children
    } = this.props;
    const className = this.state.checked ? 'checkboxOn' : 'checkboxOff';
    return JSX_("div", {
      ref: this.domRef,
      className: "formsCheckbox"
    }, JSX_("div", {
      className: `
                        checkdiv
                        ${className}
                    `,
      onClick: this.onLabelClick
    }, JSX_("input", {
      type: "checkbox",
      name,
      id,
      className,
      checked: this.state.checked,
      onChange: this.onChange
    })), JSX_("label", {
      htmlFor: id,
      className: "radio-txt"
    }, children));
  }
}
 const ui_forms = {
  Checkbox
};
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
;// ./js/ui/modalDialogs.jsx





class ExtraFooterElement extends REaCt().Component {
  render() {
    return this.props.children;
  }
}
class SafeShowDialogController extends mixins.w9 {
  constructor(props) {
    super(props);
    this.dialogName = 'unnamed-dialog';
    this.dialogBecameVisible = null;
    const {
      render
    } = this;
    this.render = () => {
      if (this.dialogBecameVisible) {
        console.assert($.dialog === this.dialogName, `${this.dialogName} state overridden.`);
        return render.call(this);
      }
      return null;
    };
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (!this.dialogBecameVisible) {
      return false;
    }
    return super.shouldComponentUpdate(nextProps, nextState);
  }
  componentDidMount() {
    super.componentDidMount();
    M.safeShowDialog(this.dialogName, () => {
      if (!this.isMounted()) {
        throw new Error(`${this.dialogName} component is no longer mounted.`);
      }
      this.dialogBecameVisible = 1;
      this.forceUpdate();
    });
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this.dialogBecameVisible) {
      this.dialogBecameVisible = false;
      console.assert($.dialog === this.dialogName);
      if ($.dialog === this.dialogName) {
        closeDialog();
      }
    }
  }
  componentDidUpdate() {
    assert(this.dialogBecameVisible);
    super.componentDidUpdate();
    if (++this.dialogBecameVisible === 2) {
      requestAnimationFrame(() => {
        const dialog = document.querySelectorAll(`.${this.dialogName}`);
        console.assert(dialog.length === 1, `Unexpected ${this.dialogName} state.`);
        console.assert($.dialog === this.dialogName, `${this.dialogName} state overridden.`);
        if (dialog.length === 1 && $.dialog === this.dialogName) {
          dialog[0].classList.remove('hidden', 'arrange-to-back');
        }
      });
    }
  }
}
class ModalDialog extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.onBlur = this.onBlur.bind(this);
    this.onCloseClicked = this.onCloseClicked.bind(this);
    this.onPopupDidMount = this.onPopupDidMount.bind(this);
  }
  componentDidMount() {
    super.componentDidMount();
    if (!this.props.hideOverlay) {
      $(document.body).addClass('overlayed');
      $('.fm-dialog-overlay').removeClass('hidden');
    }
    $('textarea:focus').trigger("blur");
    if (!this.props.noCloseOnClickOutside) {
      const convApp = document.querySelector('.conversationsApp');
      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
        convApp.addEventListener('click', this.onBlur);
      }
      $('.fm-modal-dialog').rebind(`click.modalDialogOv${  this.getUniqueId()}`, ({
        target
      }) => {
        if ($(target).is('.fm-modal-dialog')) {
          this.onBlur();
        }
      });
      $('.fm-dialog-overlay').rebind(`click.modalDialog${  this.getUniqueId()}`, () => {
        if (this.props.closeDlgOnClickOverlay) {
          this.onBlur();
        }
        return false;
      });
    }
    $(document).rebind(`keyup.modalDialog${  this.getUniqueId()}`, ({
      keyCode
    }) => {
      if (!this.props.stopKeyPropagation && keyCode === 27) {
        this.onBlur();
      }
    });
  }
  onBlur(e) {
    let _this$domRef;
    const $element = $((_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current);
    if (!e || !$(e.target).closest('.mega-dialog').is($element)) {
      const convApp = document.querySelector('.conversationsApp');
      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
      }
      this.onCloseClicked();
    }
  }
  componentWillUnmount() {
    let _this$props$popupWill, _this$props;
    super.componentWillUnmount();
    if (!this.props.noCloseOnClickOutside) {
      const convApp = document.querySelector('.conversationsApp');
      if (convApp) {
        convApp.removeEventListener('click', this.onBlur);
      }
      $('.fm-dialog-overlay').off(`click.modalDialog${  this.getUniqueId()}`);
    }
    if (!this.props.hideOverlay) {
      $(document.body).removeClass('overlayed');
      $('.fm-dialog-overlay').addClass('hidden');
    }
    $(this.domNode).off(`dialog-closed.modalDialog${  this.getUniqueId()}`);
    $(document).off(`keyup.modalDialog${  this.getUniqueId()}`);
    (_this$props$popupWill = (_this$props = this.props).popupWillUnmount) == null || _this$props$popupWill.call(_this$props);
  }
  onCloseClicked() {
    const self = this;
    if (self.props.onClose) {
      self.props.onClose(self);
    }
  }
  onPopupDidMount(elem) {
    this.domNode = elem;
    $(elem).rebind(`dialog-closed.modalDialog${  this.getUniqueId()}`, () => this.onCloseClicked());
    if (this.props.popupDidMount) {
      this.props.popupDidMount(elem);
    }
  }
  render() {
    const self = this;
    let classes = 'mega-dialog';
    let selectedNumEle = null;
    let footer = null;
    const extraFooterElements = [];
    const otherElements = [];
    let x = 0;
    REaCt().Children.forEach(self.props.children, (child) => {
      if (!child) {
        return;
      }
      if (child.type.name === 'ExtraFooterElement') {
        extraFooterElements.push(REaCt().cloneElement(child, {
          key: x++
        }));
      } else {
        otherElements.push(REaCt().cloneElement(child, {
          key: x++
        }));
      }
    });
    if (self.props.className) {
      classes += ` ${self.props.className}`;
    }
    if (self.props.dialogType) {
      classes += ` dialog-template-${self.props.dialogType}`;
    }
    if (self.props.dialogName) {
      classes += ` ${self.props.dialogName}`;
    }
    if (self.props.showSelectedNum && self.props.selectedNum) {
      selectedNumEle = JSX_("div", {
        className: "selected-num"
      }, JSX_("span", null, self.props.selectedNum));
    }
    let buttons;
    if (self.props.buttons) {
      buttons = [];
      self.props.buttons.forEach((v, i) => {
        if (v) {
          buttons.push(JSX_("button", {
            className: (v.defaultClassname ? v.defaultClassname : "mega-button") + (v.className ? ` ${  v.className}` : "") + (self.props.dialogType === "action" ? "large" : ""),
            onClick: e => {
              if ($(e.target).is(".disabled")) {
                return false;
              }
              if (v.onClick) {
                v.onClick(e, self);
              }
            },
            key: v.key + i
          }, v.iconBefore ? JSX_("div", null, JSX_("i", {
            className: v.iconBefore
          })) : null, JSX_("span", null, v.label), v.iconAfter ? JSX_("div", null, JSX_("i", {
            className: v.iconAfter
          })) : null));
        }
      });
      if (buttons && buttons.length > 0 || extraFooterElements && extraFooterElements.length > 0) {
        footer = JSX_("footer", null, buttons && buttons.length > 0 ? JSX_("div", {
          className: "footer-container"
        }, buttons) : null, extraFooterElements && extraFooterElements.length > 0 ? JSX_("aside", null, extraFooterElements) : null);
      }
    }
    return JSX_(utils.Ay.RenderTo, {
      element: document.body,
      className: "fm-modal-dialog",
      popupDidMount: this.onPopupDidMount
    }, JSX_("div", {
      ref: this.domRef,
      id: self.props.id,
      className: classes,
      "aria-labelledby": self.props.dialogName ? `${self.props.dialogName  }-title` : null,
      role: "dialog",
      "aria-modal": "true",
      onClick: self.props.onClick
    }, JSX_("button", {
      className: "close",
      onClick: self.onCloseClicked
    }, JSX_("i", {
      className: "sprite-fm-mono icon-dialog-close"
    })), self.props.title ? self.props.dialogType === "message" ? JSX_("header", null, self.props.icon ? JSX_("i", {
      className: `graphic ${self.props.icon}`
    }) : self.props.iconElement, JSX_("div", null, JSX_("h3", {
      id: self.props.dialogName ? `${self.props.dialogName  }-title` : null
    }, self.props.title, selectedNumEle), self.props.subtitle ? JSX_("p", null, self.props.subtitle) : null, otherElements)) : JSX_("header", null, self.props.icon ? JSX_("i", {
      className: `graphic ${self.props.icon}`
    }) : self.props.iconElement, JSX_("h2", {
      id: self.props.dialogName ? `${self.props.dialogName  }-title` : null
    }, self.props.title, selectedNumEle), self.props.subtitle ? JSX_("p", null, self.props.subtitle) : null) : null, self.props.dialogType !== "message" ? otherElements : null, buttons || extraFooterElements ? footer : null));
  }
}
ModalDialog.defaultProps = {
  'hideable': true,
  'noCloseOnClickOutside': false,
  'closeDlgOnClickOverlay': true,
  'showSelectedNum': false,
  'selectedNum': 0
};
class SelectContactDialog extends mixins.w9 {
  constructor(props) {
    super(props);
    this.dialogName = 'send-contact-dialog';
    this.state = {
      selected: []
    };
    this.state.selected = this.props.selected || [];
    this.onSelected = this.onSelected.bind(this);
  }
  onSelected(nodes) {
    let _this$props$onSelecte, _this$props2;
    this.setState({
      selected: nodes
    });
    (_this$props$onSelecte = (_this$props2 = this.props).onSelected) == null || _this$props$onSelecte.call(_this$props2, nodes);
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
    return JSX_(ModalDialog, {
      title: l.share_contact_title,
      className: `
                    send-contact
                    contrast
                    small-footer
                    dialog-template-tool
                    ${this.props.className}
                    ${this.dialogName}
                `,
      selected: this.state.selected,
      buttons: [{
        key: "cancel",
        label: this.props.cancelLabel,
        onClick: ev => {
          this.props.onClose();
          ev.preventDefault();
          ev.stopPropagation();
        }
      }, {
        key: "select",
        label: this.props.selectLabel,
        className: this.state.selected.length === 0 ? 'positive disabled' : 'positive',
        onClick: ev => {
          if (this.state.selected.length > 0) {
            let _this$props$onSelecte2, _this$props3;
            (_this$props$onSelecte2 = (_this$props3 = this.props).onSelected) == null || _this$props$onSelecte2.call(_this$props3, this.state.selected);
            this.props.onSelectClicked(this.state.selected);
          }
          ev.preventDefault();
          ev.stopPropagation();
        }
      }],
      onClose: this.props.onClose
    }, JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_(contacts.hU, {
      megaChat: this.props.megaChat,
      exclude: this.props.exclude,
      selectableContacts: "true",
      onSelectDone: this.props.onSelectClicked,
      onSelected: this.onSelected,
      onClose: this.props.onClose,
      selected: this.state.selected,
      contacts: M.u,
      headerClasses: "left-aligned",
      multiple: true
    }))));
  }
}
SelectContactDialog.clickTime = 0;
SelectContactDialog.defaultProps = {
  selectLabel: l.share_contact_action,
  cancelLabel: l.msg_dlg_cancel,
  hideable: true
};
class ConfirmDialog extends mixins.w9 {
  static saveState(o) {
    const state = mega.config.get('xcod') >>> 0;
    mega.config.set('xcod', state | 1 << o.props.pref);
  }
  static clearState(o) {
    const state = mega.config.get('xcod') >>> 0;
    mega.config.set('xcod', state & ~(1 << o.props.pref));
  }
  static autoConfirm(o) {
    console.assert(o.props.pref > 0);
    const state = mega.config.get('xcod') >>> 0;
    return !!(state & 1 << o.props.pref);
  }
  constructor(props) {
    super(props);
    this.dialogName = 'confirm-dialog';
    this._wasAutoConfirmed = undefined;
    this._keyUpEventName = `keyup.confirmDialog${  this.getUniqueId()}`;
    this.dialogName = this.props.name || this.dialogName;
    lazy(this, '_autoConfirm', () => this.props.onConfirmClicked && this.props.dontShowAgainCheckbox && ConfirmDialog.autoConfirm(this));
  }
  unbindEvents() {
    $(document).off(this._keyUpEventName);
  }
  componentDidMount() {
    super.componentDidMount();
    M.safeShowDialog(this.dialogName, () => {
      queueMicrotask(() => {
        if (!this.isMounted()) {
          return;
        }
        if (this._autoConfirm) {
          if (!this._wasAutoConfirmed) {
            this._wasAutoConfirmed = 1;
            queueMicrotask(() => {
              this.onConfirmClicked();
            });
          }
          return;
        }
        $(document).rebind(this._keyUpEventName, e => {
          if (e.which === 13 || e.keyCode === 13) {
            if (!this.isMounted()) {
              this.unbindEvents();
              return;
            }
            this.onConfirmClicked();
            return false;
          }
        });
      });
    });
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
    if ($.dialog === this.dialogName) {
      closeDialog();
    }
    delete this._wasAutoConfirmed;
  }
  onConfirmClicked() {
    this.unbindEvents();
    if (this.props.onConfirmClicked) {
      this.props.onConfirmClicked();
    }
  }
  render() {
    const self = this;
    if (this._autoConfirm) {
      return null;
    }
    const classes = `delete-message${  self.props.name ? ` ${self.props.name}` : ""  }${self.props.className ? ` ${self.props.className}` : ""}`;
    let dontShowCheckbox = null;
    if (self.props.dontShowAgainCheckbox) {
      dontShowCheckbox = JSX_("div", {
        className: "footer-checkbox"
      }, JSX_(ui_forms.Checkbox, {
        name: "delete-confirm",
        id: "delete-confirm",
        onLabelClick: (e, state) => {
          if (state === true) {
            ConfirmDialog.saveState(self);
          } else {
            ConfirmDialog.clearState(self);
          }
        }
      }, l[7039]));
    }
    return JSX_(ModalDialog, {
      title: this.props.title,
      subtitle: this.props.subtitle,
      className: classes,
      dialogId: this.props.name,
      dialogType: this.props.dialogType,
      icon: this.props.icon,
      onClose: () => {
        self.props.onClose(self);
      },
      buttons: [{
        "label": self.props.cancelLabel,
        "key": "cancel",
        "onClick" (e) {
          ConfirmDialog.clearState(self);
          self.props.onClose(self);
          e.preventDefault();
          e.stopPropagation();
        }
      }, {
        "label": self.props.confirmLabel,
        "key": "select",
        "className": "positive",
        "onClick" (e) {
          self.onConfirmClicked();
          e.preventDefault();
          e.stopPropagation();
        }
      }]
    }, self.props.children, dontShowCheckbox ? JSX_(ExtraFooterElement, null, dontShowCheckbox) : null);
  }
}
lazy(ConfirmDialog, 'defaultProps', () => {
  return freeze({
    'confirmLabel': l[6826],
    'cancelLabel': l.msg_dlg_cancel,
    'dontShowAgainCheckbox': true,
    'hideable': true,
    'dialogType': 'message'
  });
});
 const modalDialogs = {
  ModalDialog,
  SelectContactDialog,
  SafeShowDialogController,
  ConfirmDialog
};

 },

 8168
(__webpack_module__, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   A: () =>  _extends
 });
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (let e = 1; e < arguments.length; e++) {
      const t = arguments[e];
      for (const r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}


 },

 8264
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   LP: () =>  getUniqueId,
   N9: () =>  timing,
   Zz: () =>  compose,
   hG: () =>  SoonFcWrap,
   u9: () =>  ContactAwareComponent,
   w9: () =>  MegaRenderMixin
 });

 const _babel_runtime_helpers_applyDecoratedDescriptor0__ = REQ_(793);

let _dec, _dec2, _dec3, _dec4, _dec5, _class;
const INTERSECTION_OBSERVER_AVAILABLE = typeof IntersectionObserver !== 'undefined';
const RESIZE_OBSERVER_AVAILABLE = typeof ResizeObserver !== 'undefined';
function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }
  for (var key in objA) {
    if (key === "children") {
      continue;
    }
    if (objA.hasOwnProperty(key)) {
      if (!objB.hasOwnProperty(key)) {
        return false;
      } else if (objA[key] !== objB[key]) {
        if (typeof objA[key] === 'function' && typeof objB[key] === 'function') {
          if (objA[key].toString() !== objB[key].toString()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
  }
  for (key in objB) {
    if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}
window.shallowEqual = shallowEqual;
const MAX_ALLOWED_DEBOUNCED_UPDATES = 5;
const DEBOUNCED_UPDATE_TIMEOUT = 60;
const REENABLE_UPDATES_AFTER_TIMEOUT = 300;
const MAX_TRACK_CHANGES_RECURSIVE_DEPTH = 1;
let _propertyTrackChangesVars = Object.create(null);
_propertyTrackChangesVars._listenersMap = Object.create(null);
_propertyTrackChangesVars._dataChangedHistory = Object.create(null);
if (window._propertyTrackChangesVars) {
  _propertyTrackChangesVars = window._propertyTrackChangesVars;
} else {
  window._propertyTrackChangesVars = _propertyTrackChangesVars;
}
window.megaRenderMixinId = window.megaRenderMixinId ? window.megaRenderMixinId : 0;
const FUNCTIONS = ['render', 'shouldComponentUpdate', 'doProgramaticScroll', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount', 'refreshUI', 'eventuallyInit', 'handleWindowResize', 'focusTypeArea', 'initScrolling', 'updateScroll', 'isActive', 'onMessagesScrollReinitialise', 'specShouldComponentUpdate', 'attachAnimationEvents', 'eventuallyReinitialise', 'reinitialise', 'reinitialised', 'getContentHeight', 'getScrollWidth', 'isAtBottom', 'onResize', 'isComponentEventuallyVisible', 'getCursorPosition', 'getTextareaMaxHeight'];
const localStorageProfileRenderFns = localStorage.profileRenderFns;
if (localStorageProfileRenderFns) {
  window.REACT_RENDER_CALLS = {};
}
let ID_CURRENT = 1;
const DEBUG_THIS = d > 1 ? d : false;
const scheduler = (func, name, debug) => {
  const dbug = debug !== false && DEBUG_THIS;
  let idnt = null;
  let task = null;
  const fire = () => {
    if (dbug) {
      console.warn('Dispatching scheduled task for %s.%s...', idnt, name);
    }
    if (task) {
      queueMicrotask(task);
      task = null;
    }
  };
  const _scheduler = function () {
    if (dbug) {
      if (!idnt) {
        idnt = name[0] === '(' && this.getReactId && this.getReactId() || this;
      }
      console.warn('Scheduling task from %s.%s...', idnt, name, [this], !!task);
    }
    if (!task) {
      queueMicrotask(fire);
    }
    let idx = arguments.length;
    const args = new Array(idx);
    while (idx--) {
      args[idx] = arguments[idx];
    }
    task = () => {
      func.apply(this, args);
    };
  };
  if (DEBUG_THIS) {
    Object.defineProperty(_scheduler, smbl(name), {
      value: func
    });
  }
  return _scheduler;
};
const timing = (min, max) => {
  return function (target, key, de) {
    if (DEBUG_THIS > 2) {
      de[key] = de.value;
      _timing(de, min, max);
      de.value = de[key];
    }
    return de;
  };
};
const logcall = () => {
  return function (target, key, descriptor) {
    if (DEBUG_THIS > 3) {
      const func = descriptor.value;
      descriptor.value = function () {
        console.group('[logcall] Entering into %s.%s...', this, key);
        const r = func.apply(this, arguments);
        console.info('[logcall] Leaving %s.%s...', this, key);
        console.groupEnd();
        return r;
      };
    }
    return descriptor;
  };
};
const schedule = (local, debug) => {
  return function (target, property, descriptor) {
    if (local) {
      const func = descriptor.value;
      descriptor = {
        configurable: true,
        get: function _unusedScheduler() {
          Object.defineProperty(this, property, {
            value: scheduler(func, `(${  property  })`, debug)
          });
          return this[property];
        }
      };
    } else {
      descriptor.value = scheduler(descriptor.value, property, debug);
    }
    return descriptor;
  };
};
const compose = (...funcs) => funcs.reduce((a, b) => (...args) => a(b(...args)), arg => arg);
const replaceAt = (i, o, n) => `${o.slice(0, i)}<strong>${n}</strong>${o.slice(i + n.length)}`;
const SoonFcWrap = (milliseconds, local) => {
  return function (target, propertyKey, descriptor) {
    descriptor.value = SoonFc(descriptor.value, !local, milliseconds);
    return descriptor;
  };
};
const rAFWrap = () => {
  return function (target, propertyKey, descriptor) {
    const old = descriptor.value;
    descriptor.value = function () {
      return old.apply(this, arguments);
    };
    return descriptor;
  };
};
const trycatcher = () => (t, p, d) => (d.value = tryCatch(d.value)) && d;
const getUniqueId = () => makeUUID().slice(-12);
const MegaRenderMixin = (_dec = logcall(), _dec2 = SoonFcWrap(50, true), _dec3 = logcall(), _dec4 = SoonFcWrap(80, true), _dec5 = SoonFcWrap(350, true), _class = class MegaRenderMixin extends React.Component {
  constructor(props) {
    super(props);
    lazy(this, '__internalReactID', function () {
      let key = '';
      let fib = DEBUG_THIS && this._reactInternalFiber;
      while (fib) {
        let tmp = fib.key;
        if (tmp && tmp[0] !== '.' && key.indexOf(tmp) < 0) {
          key += `${tmp  }/`;
        }
        if (tmp = fib.memoizedProps) {
          if (tmp.contact) {
            tmp = tmp.contact.u + (tmp.chatRoom ? `@${  tmp.chatRoom.roomId}` : '');
          } else if (tmp.chatRoom) {
            tmp = tmp.chatRoom.roomId;
          } else {
            tmp = 0;
          }
          if (tmp && key.indexOf(tmp) < 0) {
            key += `${tmp  }/`;
          }
        }
        fib = fib._debugOwner;
      }
      key = key ? `[${  key.substr(0, key.length - 1)  }]` : '';
      return `::${  this.constructor.name  }[${  `000${  ID_CURRENT++}`.slice(-4)  }]${  key}`;
    });
    lazy(this, '__internalUniqueID', function () {
      return (this.__internalReactID + makeUUID().substr(-12)).replace(/[^a-zA-Z0-9]/g, '');
    });
    Object.defineProperty(this, 'isMounted', {
      value: function MegaRenderMixin_isMounted() {
        return !!this.__isMounted;
      }
    });
    if (DEBUG_THIS > 2) {
      Object.defineProperty(this, 'safeForceUpdate', {
        value: function MegaRenderMixin_safeForceUpdate_debug() {
          console.group('%s.safeForceUpdate: mounted:%s, visible:%s', this.getReactId(), this.__isMounted, this.isComponentEventuallyVisible());
          if (this.__isMounted) {
            this.forceUpdate(() => {
              console.warn('%s.safeForceUpdate finished.', this.getReactId());
              console.groupEnd();
            });
          }
        }
      });
      Object.keys(this).forEach(k => {
        if (this[k] && this[k].apply) {
          const orig = this[k];
          this[k] = function () {
            let s = performance.now();
            const r = orig.apply(this, arguments);
            s = performance.now() - s;
            if (s > 30) {
              console.error(k, this, "took", s, "ms", 'returned', r);
            }
            return r;
          };
        }
      });
    }
    if (DEBUG_THIS) {
      if (!megaChat.__components) {
        megaChat.__components = new WeakMap();
      }
      megaChat.__components.set(this, Object.getPrototypeOf(this));
    }
  }
  componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
    this.__isMounted = false;
    chatGlobalEventManager.removeEventListener('resize', `megaRenderMixing${  this.getUniqueId()}`);
    chatGlobalEventManager.removeEventListener('hashchange', `hc${  this.getUniqueId()}`);
    const node = this.findDOMNode();
    if (this.__intersectionObserverInstance) {
      if (node) {
        this.__intersectionObserverInstance.unobserve(node);
      }
      this.__intersectionObserverInstance.disconnect();
      this.__intersectionObserverInstance = undefined;
    }
    if (this.onResizeObserved) {
      if (!RESIZE_OBSERVER_AVAILABLE) {
        $(document.body).unbind(`resize.resObs${  this.getUniqueId()}`);
      } else {
        this.__resizeObserverInstance.unobserve(node);
        this.__resizeObserverInstance.disconnect();
        this.__resizeObserverInstance = undefined;
      }
    }
    const instanceId = this.getUniqueId();
    const listeners = _propertyTrackChangesVars._listenersMap[instanceId];
    if (listeners) {
      for (const k in listeners) {
        const v = listeners[k];
        v[0].removeChangeListener(v[1]);
      }
    }
    _propertyTrackChangesVars._listenersMap[instanceId] = null;
    _propertyTrackChangesVars._dataChangedHistory[instanceId] = null;
    if (this._dataStructListeners) {
      this._internalDetachRenderCallbacks();
    }
    if (this.detachRerenderCallbacks) {
      this.detachRerenderCallbacks();
    }
  }
  getReactId() {
    return this.__internalReactID;
  }
  getUniqueId() {
    return this.__internalUniqueID;
  }
  debouncedForceUpdate() {
    this.eventuallyUpdate();
  }
  componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }
    this.__isMounted = true;
    this._wasRendered = true;
    if (this.props.requiresUpdateOnResize || this.requiresUpdateOnResize || !this.props.skipQueuedUpdatesOnResize) {
      chatGlobalEventManager.addEventListener('resize', `megaRenderMixing${  this.getUniqueId()}`, () => this.onResizeDoUpdate());
    }
    chatGlobalEventManager.addEventListener('hashchange', `hc${  this.getUniqueId()}`, () => this.onResizeDoUpdate());
    if (this.props) {
      this._recurseAddListenersIfNeeded("p", this.props);
    }
    if (this.state) {
      this._recurseAddListenersIfNeeded("s", this.state);
    }
    const node = this.findDOMNode();
    if (INTERSECTION_OBSERVER_AVAILABLE && !this.customIsEventuallyVisible && node && node.nodeType) {
      this.__intersectionVisibility = false;
      onIdle(() => {
        this.__intersectionObserverInstance = new IntersectionObserver(entries => {
          const entry = entries.pop();
          if (entry.intersectionRatio < 0.2 && !entry.isIntersecting) {
            this.__intersectionVisibility = false;
          } else {
            this.__intersectionVisibility = true;
            if (this._requiresUpdateOnResize) {
              this.debouncedForceUpdate();
            }
          }
          if (this.onVisibilityChange) {
            this.onVisibilityChange(this.__intersectionVisibility);
          }
        }, {
          threshold: 0.1
        });
        this.__intersectionObserverInstance.observe(node);
      });
    }
    if (this.onResizeObserved) {
      if (!RESIZE_OBSERVER_AVAILABLE) {
        $(document.body).rebind(`resize.resObs${  this.getUniqueId()}`, () => {
          this.onResizeObserved(node.offsetWidth, node.offsetHeight);
        });
      } else {
        this.__resizeObserverInstance = new ResizeObserver(entries => {
          this.onResizeObserved(entries[0].contentRect.width, entries[0].contentRect.height);
        });
        this.__resizeObserverInstance.observe(node);
      }
    }
    if (this.attachRerenderCallbacks) {
      this.attachRerenderCallbacks();
    }
  }
  findDOMNode() {
    if (!this.domNode) {
      let _this$domRef;
      this.domNode = (_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current;
    }
    return this.domNode;
  }
  isComponentVisible() {
    if (!this.__isMounted) {
      return false;
    }
    if (this.customIsEventuallyVisible) {
      const ciev = this.customIsEventuallyVisible;
      const result = typeof ciev === "function" ? ciev.call(this) : ciev;
      if (result !== -1) {
        return result;
      }
    }
    if (this.__intersectionVisibility === false) {
      return false;
    } else if (this.__intersectionVisibility === true) {
      return true;
    }
    const domNode = this.findDOMNode();
    if (!this.props.hideable && (!domNode || domNode.offsetParent === null)) {
      return false;
    }
    if (!$(domNode).is(":visible")) {
      return false;
    }
    return verge.inViewport(domNode);
  }
  isComponentEventuallyVisible() {
    if (!this.__isMounted) {
      return false;
    }
    if (this.customIsEventuallyVisible) {
      const ciev = this.customIsEventuallyVisible;
      return typeof ciev === "function" ? ciev.call(this) : !!ciev;
    }
    if (typeof this.props.isVisible !== 'undefined') {
      return this.props.isVisible;
    }
    return this.__intersectionVisibility !== false;
  }
  eventuallyUpdate() {
    if (!window.megaChat || megaChat.isLoggingOut || this._updatesDisabled || !this._wasRendered || !this.__isMounted) {
      return;
    }
    if (!this.isComponentEventuallyVisible()) {
      this._requiresUpdateOnResize = true;
      return;
    }
    if (this._requiresUpdateOnResize) {
      this._requiresUpdateOnResize = false;
    }
    this.forceUpdate();
  }
  tempDisableUpdates(forHowLong) {
    const self = this;
    self._updatesDisabled = true;
    if (self._updatesReenableTimer) {
      clearTimeout(self._updatesReenableTimer);
    }
    const timeout = forHowLong ? forHowLong : self.REENABLE_UPDATES_AFTER_TIMEOUT ? self.REENABLE_UPDATES_AFTER_TIMEOUT : REENABLE_UPDATES_AFTER_TIMEOUT;
    self._updatesReenableTimer = setTimeout(() => {
      self.tempEnableUpdates();
    }, timeout);
  }
  tempEnableUpdates() {
    clearTimeout(this._updatesReenableTimer);
    this._updatesDisabled = false;
    this.eventuallyUpdate();
  }
  onResizeDoUpdate() {
    this.eventuallyUpdate();
  }
  _getUniqueIDForMap(map, payload) {
    return `${map  }.${  payload}`;
  }
  _recurseAddListenersIfNeeded(idx, map, depth) {
    depth |= 0;
    if (map instanceof MegaDataMap && !(this._contactChangeListeners && this._contactChangeListeners.includes(map))) {
      const cacheKey = this._getUniqueIDForMap(map, idx);
      const instanceId = this.getUniqueId();
      if (!_propertyTrackChangesVars._listenersMap[instanceId]) {
        _propertyTrackChangesVars._listenersMap[instanceId] = Object.create(null);
      }
      if (!_propertyTrackChangesVars._listenersMap[instanceId][cacheKey]) {
        _propertyTrackChangesVars._listenersMap[instanceId][cacheKey] = [map, map.addChangeListener(() => this.onPropOrStateUpdated())];
      }
    }
    if (depth++ < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && !this.props.manualDataChangeTracking) {
      const mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);
      for (let i = 0; i < mapKeys.length; i++) {
        const k = mapKeys[i];
        if (map[k]) {
          this._recurseAddListenersIfNeeded(`${idx  }_${  k}`, map[k], depth);
        }
      }
    }
  }
  _checkDataStructForChanges(idx, v, rv, depth) {
    if (!v && v === rv) {
      return false;
    }
    if (!rv && v) {
      return true;
    }
    if (v === null) {
      return rv !== null;
    }
    if (v instanceof MegaDataMap) {
      const cacheKey = this._getUniqueIDForMap(v, idx);
      const dataChangeHistory = _propertyTrackChangesVars._dataChangedHistory;
      const instanceId = this.getUniqueId();
      if (!dataChangeHistory[instanceId]) {
        dataChangeHistory[instanceId] = Object.create(null);
      }
      if (dataChangeHistory[instanceId][cacheKey] !== v._dataChangeIndex) {
        if (window.RENDER_DEBUG) {
          console.error("changed: ", this.getElementName(), cacheKey, v._dataChangeTrackedId, v._dataChangeIndex, v);
        }
        dataChangeHistory[instanceId][cacheKey] = v._dataChangeIndex;
        return true;
      }
      return false;
    }
    return depth < MAX_TRACK_CHANGES_RECURSIVE_DEPTH && v && v.byteLength === undefined && typeof v === "object" && this._recursiveSearchForDataChanges(idx, v, rv, depth + 1) === true;
  }
  _recursiveSearchForDataChanges(idx, map, referenceMap, depth) {
    const self = this;
    depth = depth || 0;
    if (!this.isMounted() || this._updatesDisabled === true) {
      return;
    }
    if (!this._wasRendered) {
      if (window.RENDER_DEBUG) console.error("First time render", self.getElementName(), map, referenceMap);
      this._wasRendered = true;
      return true;
    }
    if (idx === "p_children") {
      if (map.map && referenceMap.map) {
        const oldKeys = map.map((child) => {
          return child ? child.key : child;
        });
        const newKeys = referenceMap.map((child) => {
          return child ? child.key : child;
        });
        if (!shallowEqual(oldKeys, newKeys)) {
          return true;
        }
      } else if (!map && referenceMap || map && !referenceMap) {
        return true;
      } else if (map.$$typeof && referenceMap.$$typeof) {
        if (!shallowEqual(map.props, referenceMap.props) || !shallowEqual(map.state, referenceMap.state)) {
          return true;
        }
      }
    } else if (map && !referenceMap || !map && referenceMap || map && referenceMap && !shallowEqual(map, referenceMap)) {
      return true;
    }
    const mapKeys = map instanceof MegaDataMap ? map.keys() : Object.keys(map);
    for (let i = mapKeys.length; i--;) {
      const k = mapKeys[i];
      if (this._checkDataStructForChanges(`${idx  }_${  k}`, map[k], referenceMap[k], depth)) {
        return true;
      }
    }
    return false;
  }
  shouldComponentUpdate(nextProps, nextState) {
    let shouldRerender = false;
    if (megaChat && megaChat.isLoggingOut) {
      return false;
    }
    if (!this.isMounted() || this._updatesDisabled === true) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F1", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
      return false;
    }
    if (this.customIsEventuallyVisible) {
      let ciev = this.customIsEventuallyVisible;
      ciev = typeof ciev === "function" ? ciev.call(this) : !!ciev;
      if (!this._queueUpdateWhenVisible && !ciev) {
        this._queueUpdateWhenVisible = true;
        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F1.1", this.getElementName(), this.props, nextProps, this.state, nextState);
        }
      } else if (this._queueUpdateWhenVisible && ciev) {
        delete this._queueUpdateWhenVisible;
        return true;
      }
    }
    if (this.specShouldComponentUpdate) {
      const r = this.specShouldComponentUpdate(nextProps, nextState);
      if (r === false) {
        if (window.RENDER_DEBUG) {
          console.error("shouldUpdate? No.", "F2", this.getElementName(), this.props, nextProps, this.state, nextState);
        }
        this._requiresUpdateOnResize = true;
        return false;
      } else if (r === true) {
        return true;
      }
    }
    if (!this.props.disableCheckingVisibility && !this.isComponentEventuallyVisible()) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "FVis", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
      this._requiresUpdateOnResize = true;
      return false;
    }
    if (this.props !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("p", nextProps, this.props);
    }
    if (shouldRerender === false) {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F3", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }
    if (shouldRerender === false && this.state !== null) {
      shouldRerender = this._recursiveSearchForDataChanges("s", nextState, this.state);
    }
    if (window.RENDER_DEBUG) {
      if (shouldRerender) {}
      console.error("shouldRerender?", shouldRerender, "rendered: ", this.getElementName(), "props:", this.props, "nextProps:", this.props, "state:", this.state);
    }
    if (shouldRerender === true) {
      if (this.props) {
        this._recurseAddListenersIfNeeded("p", this.props);
      }
      if (this.state) {
        this._recurseAddListenersIfNeeded("s", this.state);
      }
    } else {
      if (window.RENDER_DEBUG) {
        console.error("shouldUpdate? No.", "F4", this.getElementName(), this.props, nextProps, this.state, nextState);
      }
    }
    return shouldRerender;
  }
  onPropOrStateUpdated() {
    this.eventuallyUpdate();
  }
  getElementName() {
    return this._reactInternalFiber.elementType.name;
  }
  safeForceUpdate() {
    if (this.__isMounted) {
      this.forceUpdate();
    }
  }
  componentDidUpdate() {
    if (window.RENDER_DEBUG) {
      const self = this;
      const getElementName = function () {
        if (!self.constructor) {
          return "unknown";
        }
        return self.constructor.name;
      };
      console.error("renderedX: ", getElementName(), "props:", this.props, "state:", this.state);
    }
    if (this.domNode && !this.domNode.isConnected) {
      delete this.domNode;
    }
  }
  UNSAFE_componentWillReceiveProps(nextProps, nextContext) {
    if (localStorageProfileRenderFns) {
      const self = this;
      const componentName = self.constructor ? self.constructor.name : "unknown";
      if (!this._wrappedRender) {
        FUNCTIONS.forEach((fnName) => {
          const _origFn = self[fnName];
          if (_origFn) {
            self[fnName] = function () {
              const start = performance.now();
              const res = _origFn.apply(this, arguments);
              REACT_RENDER_CALLS[`${componentName  }.${  fnName}`] = REACT_RENDER_CALLS[`${componentName  }.${  fnName}`] || 0;
              REACT_RENDER_CALLS[`${componentName  }.${  fnName}`] += performance.now() - start;
              return res;
            };
          }
        });
        self._wrappedRender = true;
      }
      REACT_RENDER_CALLS.sorted = function () {
        const sorted = [];
        Object.keys(REACT_RENDER_CALLS).sort((a, b) => {
          if (REACT_RENDER_CALLS[a] < REACT_RENDER_CALLS[b]) {
            return 1;
          } else if (REACT_RENDER_CALLS[a] > REACT_RENDER_CALLS[b]) {
            return -1;
          } else {
            return 0;
          }
        }).forEach((k) => {
          if (typeof REACT_RENDER_CALLS[k] !== 'function') {
            sorted.push([k, REACT_RENDER_CALLS[k]]);
          }
        });
        return sorted;
      };
      REACT_RENDER_CALLS.clear = function () {
        Object.keys(REACT_RENDER_CALLS).forEach((k) => {
          if (typeof REACT_RENDER_CALLS[k] !== 'function') {
            delete REACT_RENDER_CALLS[k];
          }
        });
      };
    }
  }
  _internalDetachRenderCallbacks() {
    const items = this._dataStructListeners || false;
    for (let i = items.length; i--;) {
      const item = items[i];
      if (item[0] === 'dsprops') {
        console.assert(item[2].removeChangeListener(item[1]), 'listener not found..');
      }
    }
  }
  addDataStructListenerForProperties(obj, properties) {
    if (!(obj instanceof MegaDataMap)) {
      return;
    }
    if (!this._dataStructListeners) {
      this._dataStructListeners = [];
    }
    properties = array.to.object(properties);
    const id = obj.addChangeListener((obj, data, k) => properties[k] && this.onPropOrStateUpdated());
    this._dataStructListeners.push(['dsprops', id, obj]);
  }
}, (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "componentWillUnmount", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "componentWillUnmount"), _class.prototype), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "debouncedForceUpdate", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "debouncedForceUpdate"), _class.prototype), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "componentDidMount", [_dec3], Object.getOwnPropertyDescriptor(_class.prototype, "componentDidMount"), _class.prototype), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "eventuallyUpdate", [_dec4], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyUpdate"), _class.prototype), (0,_babel_runtime_helpers_applyDecoratedDescriptor0__ .A)(_class.prototype, "onResizeDoUpdate", [_dec5], Object.getOwnPropertyDescriptor(_class.prototype, "onResizeDoUpdate"), _class.prototype), _class);
class ContactAwareComponent extends MegaRenderMixin {
  constructor(props) {
    super(props);
    this.loadContactInfo();
  }
  _validContact() {
    const {
      contact
    } = this.props;
    if (!contact) {
      return false;
    }
    return (contact.h || contact.u) in M.u;
  }
  _attachRerenderCbContacts(others) {
    if (!this._validContact()) {
      return;
    }
    this.addDataStructListenerForProperties(this.props.contact, ['name', 'firstName', 'lastName', 'nickname', 'm', 'avatar'].concat(Array.isArray(others) ? others : []));
  }
  attachRerenderCallbacks() {
    this._attachRerenderCbContacts();
  }
  loadContactInfo() {
    let _contact$avatar;
    if (!this._validContact()) {
      return;
    }
    const {
      contact,
      chatRoom
    } = this.props;
    const contactHandle = contact.h || contact.u;
    const syncName = !ContactAwareComponent.unavailableNames[contactHandle] && !contact.firstName && !contact.lastName;
    const syncMail = megaChat.FORCE_EMAIL_LOADING || (contact.c === 1 || contact.c === 2) && !contact.m && !is_chatlink;
    const syncAvtr = (is_chatlink && (!contact.avatar || ((_contact$avatar = contact.avatar) == null ? void 0 : _contact$avatar.type) === "text") || !contact.avatar) && !avatars[contactHandle] && !ContactAwareComponent.unavailableAvatars[contactHandle];
    const loader = () => {
      if (!this.isComponentEventuallyVisible()) {
        this.__isLoadingContactInfo = null;
        this._requiresUpdateOnResize = true;
        return;
      }
      const promises = [];
      const chatHandle = is_chatlink.ph || chatRoom && chatRoom.publicChatHandle;
      if (syncName) {
        promises.push(megaChat.plugins.userHelper.getUserName(contactHandle, chatHandle));
      }
      if (syncMail) {
        promises.push(M.syncContactEmail(contactHandle));
      }
      if (syncAvtr) {
        promises.push(useravatar.loadAvatar(contactHandle, chatHandle).catch(() => {
          ContactAwareComponent.unavailableAvatars[contactHandle] = true;
        }));
      }
      return Promise.allSettled(promises).always(() => {
        this.eventuallyUpdate();
        this.__isLoadingContactInfo = false;
        if (!contact.firstName && !contact.lastName) {
          ContactAwareComponent.unavailableNames[contactHandle] = true;
        }
      });
    };
    if (syncName || syncMail || syncAvtr) {
      (this.__isLoadingContactInfo = tSleep(0.3)).then(loader).catch(dump);
    }
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    if (this.__isLoadingContactInfo === null) {
      this.loadContactInfo();
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this.__isLoadingContactInfo) {
      this.__isLoadingContactInfo.abort();
      this.__isLoadingContactInfo = false;
    }
  }
  isLoadingContactInfo() {
    return !!this.__isLoadingContactInfo;
  }
}
ContactAwareComponent.unavailableAvatars = Object.create(null);
ContactAwareComponent.unavailableNames = Object.create(null);

 },

 8676
(_, EXP_, REQ_) {

"use strict";
 REQ_.d(EXP_, {
   r: () =>  chatGlobalEventManager
 });
const ChatGlobalEventManager = function () {};
lazy(ChatGlobalEventManager.prototype, 'listeners', function () {
  window.addEventListener('hashchange', ev => this.triggered(ev));
  $(window).rebind('resize.chatGlobalEventManager', ev => this.triggered(ev));
  const listeners = Object.create(null);
  listeners.resize = Object.create(null);
  listeners.hashchange = Object.create(null);
  return listeners;
});
ChatGlobalEventManager.prototype.addEventListener = function (eventName, namespace, cb) {
  this.listeners[eventName][namespace] = this.listeners[namespace] || cb;
};
ChatGlobalEventManager.prototype.removeEventListener = function (eventName, namespace) {
  delete this.listeners[eventName][namespace];
};
ChatGlobalEventManager.prototype.triggered = SoonFc(140, function _chatEVDispatcher(ev) {
  if (M.chat) {
    const listeners = this.listeners[ev.type];
    for (const k in listeners) {
      listeners[k](ev);
    }
  }
});
const chatGlobalEventManager = new ChatGlobalEventManager();

 }

 	};

 	// The module cache
 	const __webpack_module_cache__ = {};
 	
 	// The require function
 	function REQ_(moduleId) {
 		// Check if module is in cache
 		const cachedModule = __webpack_module_cache__[moduleId];
 		if (cachedModule !== undefined) {
 			return cachedModule.exports;
 		}
 		// Create a new module (and put it into the cache)
 		const module = __webpack_module_cache__[moduleId] = {
 			// no module.id needed
 			// no module.loaded needed
 			exports: {}
 		};
 	
 		// Execute the module function
 		__webpack_modules__[moduleId](module, module.exports, REQ_);
 	
 		// Return the exports of the module
 		return module.exports;
 	}
 	
 	// expose the modules object (__webpack_modules__)
 	REQ_.m = __webpack_modules__;
 	

 	
 	(() => {
 		// getDefaultExport function for compatibility with non-harmony modules
 		REQ_.n = (module) => {
 			const getter = module && module.__esModule ?
 				() => module.default :
 				() => module;
 			REQ_.d(getter, { a: getter });
 			return getter;
 		};
 	})();
 	
 	
 	(() => {
 		// define getter functions for harmony exports
 		REQ_.d = (exports, definition) => {
 			for(const key in definition) {
 				if(REQ_.o(definition, key) && !REQ_.o(exports, key)) {
 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
 				}
 			}
 		};
 	})();
 	
 	
 	(() => {
 		REQ_.f = {};
 		// This file contains only the entry chunk.
 		// The chunk loading function for additional chunks
 		REQ_.e = (chunkId) => {
 			return Promise.all(Object.keys(REQ_.f).reduce((promises, key) => {
 				REQ_.f[key](chunkId, promises);
 				return promises;
 			}, []));
 		};
 	})();
 	
 	
 	(() => {
 		// This function allow to reference async chunks
 		REQ_.u = (chunkId) => {
 			// return url for filenames based on template
 			return `js/chat/bundle.${  {"253":"contacts-panel","313":"cloud-browser","493":"core-ui","543":"start-conversation","716":"schedule-meeting","752":"waiting-room","987":"call"}[chunkId]  }.js`;
 		};
 	})();
 	
 	
 	(() => {
 		REQ_.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
 	})();
 	
 	
 	(() => {
 		const inProgress = {};
 		const dataWebpackPrefix = "@meganz/webclient:";
 		// loadScript function to load a script via script tag
 		REQ_.l = (url, done, key, chunkId) => {
 			if(inProgress[url]) { inProgress[url].push(done); return; }
 			let script, needAttach;
 			if(key !== undefined) {
 				const scripts = document.getElementsByTagName("script");
 				for(let i = 0; i < scripts.length; i++) {
 					const s = scripts[i];
 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
 				}
 			}
 			if(!script) {
 				needAttach = true;
 				script = document.createElement('script');
 		
 				script.charset = 'utf-8';
 				if (REQ_.nc) {
 					script.setAttribute("nonce", REQ_.nc);
 				}
 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
 		
 				script.src = url;
 			}
 			inProgress[url] = [done];
 			const onScriptComplete = (prev, event) => {
 				// avoid mem leaks in IE.
 				script.onerror = script.onload = null;
 				clearTimeout(timeout);
 				const doneFns = inProgress[url];
 				delete inProgress[url];
 				script.parentNode && script.parentNode.removeChild(script);
 				doneFns && doneFns.forEach((fn) => fn(event));
 				if(prev) return prev(event);
 			}
 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
 			script.onerror = onScriptComplete.bind(null, script.onerror);
 			script.onload = onScriptComplete.bind(null, script.onload);
 			needAttach && document.head.appendChild(script);
 		};
 	})();
 	
 	
 	(() => {
 		// define __esModule on exports
 		REQ_.r = (exports) => {
 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
 			}
 			Object.defineProperty(exports, '__esModule', { value: true });
 		};
 	})();
 	
 	
 	(() => {
 		REQ_.p = "/";
 	})();
 	
 	
 	(() => {
 		// no baseURI
 		
 		// object to store loaded and loading chunks
 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
 		const installedChunks = {
 			524: 0
 		};
 		
 		REQ_.f.j = (chunkId, promises) => {
 				// JSONP chunk loading for javascript
 				let installedChunkData = REQ_.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
 				if(installedChunkData !== 0) { // 0 means "already installed".
 		
 					// a Promise means "currently loading".
 					if(installedChunkData) {
 						promises.push(installedChunkData[2]);
 					} else {
 						if(true) { // all chunks have JS
 							// setup Promise in chunk cache
 							const promise = new Promise((resolve, reject) => installedChunkData = installedChunks[chunkId] = [resolve, reject]);
 							promises.push(installedChunkData[2] = promise);
 		
 							// start chunk loading
 							const url = REQ_.p + REQ_.u(chunkId);
 							// create error before stack unwound to get useful stacktrace later
 							const error = new Error();
 							const loadingEnded = (event) => {
 								if(REQ_.o(installedChunks, chunkId)) {
 									installedChunkData = installedChunks[chunkId];
 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
 									if(installedChunkData) {
 										const errorType = event && (event.type === 'load' ? 'missing' : event.type);
 										const realSrc = event && event.target && event.target.src;
 										error.message = `Loading chunk ${  chunkId  } failed.\n(${  errorType  }: ${  realSrc  })`;
 										error.name = 'ChunkLoadError';
 										error.type = errorType;
 										error.request = realSrc;
 										installedChunkData[1](error);
 									}
 								}
 							};
 							REQ_.l(url, loadingEnded, `chunk-${  chunkId}`, chunkId);
 						}
 					}
 				}
 		};
 		
 		// no prefetching
 		
 		// no preloaded
 		
 		// no HMR
 		
 		// no HMR manifest
 		
 		// no on chunks loaded
 		
 		// install a JSONP callback for chunk loading
 		const webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
 			const [chunkIds, moreModules, runtime] = data;
 			// add "moreModules" to the modules object,
 			// then flag all "chunkIds" as loaded and fire callback
 			let moduleId, chunkId, i = 0;
 			if(chunkIds.some((id) => installedChunks[id] !== 0)) {
 				for(moduleId in moreModules) {
 					if(REQ_.o(moreModules, moduleId)) {
 						REQ_.m[moduleId] = moreModules[moduleId];
 					}
 				}
 				if(runtime) var result = runtime(REQ_);
 			}
 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
 			for(;i < chunkIds.length; i++) {
 				chunkId = chunkIds[i];
 				if(REQ_.o(installedChunks, chunkId) && installedChunks[chunkId]) {
 					installedChunks[chunkId][0]();
 				}
 				installedChunks[chunkId] = 0;
 			}
 		
 		}
 		
 		const chunkLoadingGlobal = self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || [];
 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
 	})();
 	

const EXP_ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other entry modules.
(() => {
/**
 * `MegaChunkLoader`
 * ---------------------------------------------------------------------------------------------------------------------
 * Overrides the default `webpack` chunk loading mechanism (`REQ_.l`) to integrate
 * `React.lazy`/`React.Suspense` with the `secureboot` architecture of the `webclient`, which ensures lazy-loaded chunks
 * go through MEGA's XHR + hash verification pipeline.
 *
 * 1) What
 * ---------------------------------------------------------------------------------------------------------------------
 * By default `webpack` loads chunks by injecting `script` tags with standard URLs. MEGA's security model requires all
 * code to be i) loaded via XHR (as to create blob URL entities) and ii) verified against a pre-computed SHA-256 hash.
 *
 * The default `webpack` loader behavior bypasses these integrity checks, which is not optimal. Additionally, the
 * `webpack` Hot Module Replacement (HMR) relies on injecting unverified code at runtime, which is incompatible with
 * the `webclient` integrity model.
 *
 * 2) How
 * ---------------------------------------------------------------------------------------------------------------------
 * This loader intercepts the `import()` calls generated by `React.lazy()`:
 *
 * i) `webpack` calls `REQ_.l(url, done)` to load a chunk; we capture this call and derive the `url`
 * from `chunkFilename` in `webpack.config.js` (ex.: `js/chat/bundle.call.js`)
 * ii) we parse the URL as to extract the logical chunk name (ex.: `js/chat/bundle.call.js` -> `call` -> `chat:call_js`)
 * iii) we request the resource via `M.require('chat:call_js')` call, as `secureboot.js` maintains the respective
 * registry (jsl2) by mapping this logical key to the physical, hashed filename in production.
 * iv) `M.require` handles the XHR download and performs the SHA-256 hash check; if the hash does not match the
 * build-time manifest, the load is blocked to prevent tampering.
 * v) we call the `done()` callback on success, which allows the `React.Suspense` boundary to render the component.
 *
 * 3) Constraints
 * ---------------------------------------------------------------------------------------------------------------------
 * - the original `REQ_.l` loader is intentionally not preserved as a fallback -- if a chunk fails the
 * integrity check (no `jsl2` entry) chunk loading fails securely rather than bypassing hash verification via the
 * default `script` tag injection.
 * - `splitChunks` is disabled; we want deterministic, manually defined chunks (via `webpackChunkName`) to
 * ensure 1:1 mapping with the `secureboot` registry.
 * - `hot` (HMR) is disabled; development can rely on standard page reloads in favor of ensuring the dev environment
 * mirrors the production security pipeline.
 */

const webpackRequire =  true ? REQ_ : 0;
if (webpackRequire && webpackRequire.l) {
  const CHUNK_LOADER_DEBUG = d && localStorage.chunkLoaderDebug;
  const logger = MegaLogger.getLogger('MegaChunkLoader', {
    levelColors: {
      'DEBUG': 'olive',
      'ERROR': 'tomato'
    }
  });
  webpackRequire.l = (url, done) => {
    const startTime = CHUNK_LOADER_DEBUG ? performance.now() : 0;
    const match = url.match(/bundle\.([^.]+)\.js$/);
    const chunkName = match == null ? void 0 : match[1];
    const jslName = chunkName ? `chat:${chunkName.replace(/-/g, '_')}_js` : null;
    const hasJslEntry = jslName && jsl2[jslName];
    if (hasJslEntry) {
      M.require(jslName).then(() => {
        if (CHUNK_LOADER_DEBUG) {
          const duration = (performance.now() - startTime).toFixed(1);
          logger.debug(`Loaded '${chunkName}' chunk in ${duration}ms`, {
            chunkName,
            jslName,
            url
          });
        }
        done({
          type: 'load'
        });
      }).catch(ex => {
        logger.error(`Failed to load ${jslName}`, {
          error: ex,
          chunkName,
          jslName,
          url
        });
        done({
          type: 'error',
          target: {
            src: url
          }
        });
      });
    } else {
      logger.error(`Blocked insecure chunk load ('jsl2' entry missing)`, {
        chunkName,
        jslName,
        url
      });
      done({
        type: 'error',
        target: {
          src: url
        }
      });
    }
  };
}
})();

// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";

// UNUSED EXPORTS: default

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: external "ReactDOM"
const external_ReactDOM_ = REQ_(5206);
// EXTERNAL MODULE: ./js/chat/ui/conversations.jsx + 2 modules
const conversations = REQ_(4904);
;// ./js/chat/chatRouting.jsx
let _ChatRouting;
class ChatRouting {
  constructor(megaChatInstance) {
    this.megaChat = megaChatInstance;
  }
  openCustomView(sectionName) {
    const {megaChat} = this;
    megaChat.routingSection = sectionName;
    megaChat.hideAllChats();
    delete megaChat.lastOpenedChat;
  }
  route(resolve, reject, location, event, isLandingPage) {
    if (!M.chat) {
      console.error('This function is meant to navigate within the chat...');
      return;
    }
    const args = String(location || '').split('/').map(String.trim).filter(String);
    if (args[0] === 'fm') {
      args.shift();
    }
    if (args[0] === 'chat') {
      args.shift();
    }
    if (args[0] && args[0].length > 8 && args[0].substring(0, 8) === 'contacts') {
      location = location.replace(args[0], 'contacts');
      args[0] = 'contacts';
    }
    const [section] = args;
    const {
      megaChat
    } = this;
    if (d) {
      megaChat.logger.warn('navigate(%s)', location, args);
    }
    args.route = {
      location,
      section,
      args
    };
    if (isLandingPage) {
      megaChat.eventuallyInitMeetingUI();
    }
    megaChat.routingSection = 'chat';
    megaChat.routingSubSection = null;
    megaChat.routingParams = null;
    const handler = ChatRouting.gPageHandlers[section || 'start'];
    if (handler) {
      handler.call(this, args.route).then(resolve).catch(reject);
      resolve = null;
    } else {
      let roomId = String(args[(section === 'c' || section === 'g' || section === 'p') | 0] || '');
      if (roomId.includes('#')) {
        let key = roomId.split('#');
        roomId = key[0];
        key = key[1];
        megaChat.publicChatKeys[roomId] = key;
        roomId = megaChat.handleToId[roomId] || roomId;
      }
      const room = megaChat.getChatById(roomId);
      if (room) {
        room.show();
        args.route.location = room.getRoomUrl();
      } else if (!roomId || roomId === u_handle || roomId.length !== 11 && !is_chatlink) {
        ChatRouting.gPageHandlers.redirect(args.route, 'fm/chat').then(resolve).catch(reject);
        resolve = null;
      } else if (section === 'p') {
        megaChat.smartOpenChat([u_handle, roomId], 'private', undefined, undefined, undefined, true).then(resolve).catch(reject);
        resolve = null;
      } else {
        megaChat.plugins.chatdIntegration.openChat(roomId).then(chatId => {
          megaChat.getChatById(chatId).show();
          return chatId;
        }).catch(ex => {
          if (d && ex !== ENOENT) {
            console.warn('If "%s" is a chat, something went wrong..', roomId, ex);
          }
          if (page !== location) {
            return EEXPIRED;
          }
          megaChat.cleanup(true);
          if (ex === ENOENT || ex === EBLOCKED && megaChat.publicChatKeys[roomId]) {
            msgDialog('warninga', '', l[20641], l[20642], () => {
              loadSubPage(is_chatlink ? 'start' : 'fm/chat', event);
            });
          } else {
            if (String(location).startsWith('chat')) {
              location = 'fm/chat';
            }
            loadSubPage(location, location.includes('chat') ? 'override' : event);
          }
          return EACCESS;
        }).then(resolve).catch(reject);
        resolve = null;
      }
    }
    if (resolve) {
      onIdle(resolve);
    }
    if (args.route.location !== location) {
      location = args.route.location;
    }
    const method = page === 'chat' || page === 'fm/chat' || page === location || event && event.type === 'popstate' ? 'replaceState' : 'pushState';
    mBroadcaster.sendMessage('beforepagechange', location);
    M.currentdirid = String(page = location).replace('fm/', '');
    if (location.substr(0, 13) === "chat/contacts") {
      location = `fm/${  location}`;
    }
    if (location === 'chat') {
      location = 'fm/chat';
    }
    history[method]({
      subpage: location
    }, "", (hashLogic ? '#' : '/') + location);
    mBroadcaster.sendMessage('pagechange', page);
  }
  initFmAndChat(targetChatId) {
    assert(!fminitialized);
    return new Promise((res, rej) => {
      M.currentdirid = targetChatId ? `fm/chat/${  targetChatId}` : undefined;
      loadSubPage('fm');
      mBroadcaster.once('chat_initialized', () => {
        authring.onAuthringReady().then(res, rej);
      });
    });
  }
  reinitAndOpenExistingChat(chatId, publicChatHandle = false, cbBeforeOpen = undefined) {
    const chatUrl = `fm/chat/c/${  chatId}`;
    publicChatHandle = publicChatHandle || megaChat.initialPubChatHandle;
    megaChat.destroy();
    is_chatlink = false;
    loadingDialog.pshow();
    return new Promise((resolve, reject) => {
      this.initFmAndChat(chatId).always(() => {
        megaChat.initialPubChatHandle = publicChatHandle;
        megaChat.initialChatId = chatId;
        const next = () => {
          mBroadcaster.once('pagechange', () => {
            onIdle(() => {
              loadingDialog.phide();
              megaChat.renderListing(chatUrl, true).catch(ex => {
                console.error("Failed to megaChat.renderListing:", ex);
                reject(ex);
              }).always(() => {
                megaChat.updateKeysInProtocolHandlers();
                const chatRoom = megaChat.getChatById(chatId);
                assert(chatRoom);
                if (chatRoom.state === ChatRoom.STATE.READY) {
                  resolve(chatRoom);
                } else {
                  chatRoom.rebind('onMessagesHistoryDone.reinitAndOpenExistingChat', () => {
                    if (chatRoom.state === ChatRoom.STATE.READY) {
                      resolve(chatRoom);
                      chatRoom.unbind('onMessagesHistoryDone.reinitAndOpenExistingChat');
                    }
                  });
                }
              });
            });
          });
          loadSubPage(chatUrl);
        };
        if (cbBeforeOpen) {
          cbBeforeOpen().then(next, ex => {
            console.error("Failed to execute `cbBeforeOpen`, got a reject of the returned promise:", ex);
          });
        } else {
          next();
        }
      }).catch(ex => reject(ex));
    });
  }
  reinitAndJoinPublicChat(chatId, initialPubChatHandle, publicChatKey) {
    initialPubChatHandle = initialPubChatHandle || megaChat.initialPubChatHandle;
    megaChat.destroy();
    is_chatlink = false;
    loadingDialog.pshow();
    return new Promise((res, rej) => {
      this.initFmAndChat(chatId).then(() => {
        megaChat.initialPubChatHandle = initialPubChatHandle;
        megaChat.initialChatId = chatId;
        const mciphReq = megaChat.plugins.chatdIntegration.getMciphReqFromHandleAndKey(initialPubChatHandle, publicChatKey);
        const isReady = chatRoom => {
          if (chatRoom.state === ChatRoom.STATE.READY) {
            res(chatRoom);
            loadingDialog.phide();
          } else {
            chatRoom.rebind('onMessagesHistoryDone.reinitAndOpenExistingChat', () => {
              if (chatRoom.state === ChatRoom.STATE.READY) {
                res(chatRoom);
                loadingDialog.phide();
                chatRoom.unbind('onMessagesHistoryDone.reinitAndOpenExistingChat');
              }
            });
          }
        };
        const join = () => {
          const existingRoom = megaChat.getChatById(chatId);
          if (!existingRoom) {
            megaChat.rebind('onRoomInitialized.reinitAndJoinPublicChat', (e, megaRoom) => {
              if (megaRoom.chatId === chatId) {
                megaRoom.setActive();
                isReady(megaRoom);
                megaChat.unbind('onRoomInitialized.reinitAndJoinPublicChat');
              }
            });
          } else {
            existingRoom.setActive();
            isReady(existingRoom);
          }
        };
        join();
        asyncApiReq(mciphReq).then(join).catch(ex => {
          if (ex === EEXIST) {
            join();
          } else {
            loadingDialog.phide();
            console.error("Bad response for mciphReq:", mciphReq, ex);
            rej(ex);
          }
        });
      });
    });
  }
}
_ChatRouting = ChatRouting;
ChatRouting.gPageHandlers = {
  async start({
    location
  }) {
    return megaChat.onChatsHistoryReady(15e3).then(() => {
      return page === location ? megaChat.renderListing() : EACCESS;
    });
  },
  async redirect(target, path = 'fm/chat') {
    target.location = path;
    return _ChatRouting.gPageHandlers.start(target);
  },
  async new_meeting(target) {
    megaChat.trigger('onStartNewMeeting');
    return _ChatRouting.gPageHandlers.redirect(target);
  },
  async contacts({
    section,
    args
  }) {
    this.openCustomView(section);
    const [, target = ''] = args;
    if (target.length === 11) {
      megaChat.routingSubSection = "contact";
      megaChat.routingParams = target;
    } else if (target === "received" || target === "sent") {
      megaChat.routingSubSection = target;
    }
  }
};
// EXTERNAL MODULE: ./js/chat/ui/messages/scheduleMetaChange.jsx
const scheduleMetaChange = REQ_(5470);
// EXTERNAL MODULE: ./js/chat/chatRoom.jsx
const chat_chatRoom = REQ_(7057);
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/helpers.jsx
const helpers = REQ_(6521);
;// ./js/chat/meetingsManager.jsx



class Occurrence {
  constructor(megaChat, occurrence) {
    const {
      decodeData
    } = megaChat.plugins.meetingsManager;
    this.megaChat = megaChat;
    this.id = occurrence.id;
    this.uid = `${occurrence.cid}-${occurrence.o || occurrence.s}`;
    this.chatId = occurrence.cid;
    this.parentId = occurrence.p;
    this.start = occurrence.s * 1000;
    this.startInitial = parseInt(occurrence.o) * 1000 || undefined;
    this.end = occurrence.e * 1000;
    this.timezone = decodeData(occurrence.tz);
    this.title = decodeData(occurrence.t);
    this.description = decodeData(occurrence.d);
    this.ownerHandle = occurrence.u;
    this.flags = occurrence.f;
    this.canceled = occurrence.c;
    this.scheduledMeeting = occurrence.scheduledMeeting;
  }
  get isUpcoming() {
    return !this.canceled && this.end > Date.now();
  }
  cancel() {
    const {
      encodeData
    } = this.megaChat.plugins.meetingsManager;
    const req = {
      a: 'mcsmp',
      p: this.parentId || this.id,
      ...this.parentId && {
        id: this.id
      },
      cid: this.chatId,
      o: this.start / 1000,
      s: this.start / 1000,
      e: this.end / 1000,
      tz: encodeData(this.timezone),
      t: encodeData(this.title),
      d: encodeData(this.description) || '',
      f: this.scheduledMeeting.flags,
      c: 1
    };
    asyncApiReq(req).catch(ex => console.error('Occurrence > cancel ->', ex));
  }
  update(startDateTime, endDateTime) {
    const {
      encodeData
    } = this.megaChat.plugins.meetingsManager;
    const req = {
      a: 'mcsmp',
      cid: this.chatId,
      p: this.parentId || this.id,
      ...this.parentId && {
        id: this.id
      },
      o: this.start / 1000,
      s: startDateTime / 1000,
      e: endDateTime / 1000,
      tz: encodeData(this.timezone),
      t: encodeData(this.title),
      d: encodeData(this.description) || '',
      f: this.scheduledMeeting.flags
    };
    asyncApiReq(req).catch(ex => console.error('Occurrence > update ->', ex));
  }
}
class ScheduledMeeting {
  constructor(megaChat, meetingInfo, fromActionPacket) {
    const {
      decodeData
    } = megaChat.plugins.meetingsManager;
    this.megaChat = megaChat;
    this.id = meetingInfo.id;
    this.chatId = meetingInfo.cid;
    this.parentId = meetingInfo.p;
    this.start = meetingInfo.s * 1000;
    this.startInitial = parseInt(meetingInfo.o) * 1000 || undefined;
    this.end = meetingInfo.e * 1000;
    this.timezone = decodeData(meetingInfo.tz);
    this.title = decodeData(meetingInfo.t);
    this.description = decodeData(meetingInfo.d);
    this.flags = meetingInfo.f;
    this.canceled = meetingInfo.c;
    this.recurring = meetingInfo.r && {
      frequency: meetingInfo.r.f || undefined,
      interval: meetingInfo.r.i || 0,
      end: meetingInfo.r.u * 1000 || undefined,
      weekDays: meetingInfo.r.wd || [],
      monthDays: meetingInfo.r.md || [],
      offset: meetingInfo.r.mwd && meetingInfo.r.mwd.length ? {
        value: meetingInfo.r.mwd[0][0],
        weekDay: meetingInfo.r.mwd[0][1]
      } : []
    };
    this.occurrences = new MegaDataMap();
    this.nextOccurrenceStart = this.start;
    this.nextOccurrenceEnd = this.end;
    this.isCompleted = false;
    this.ownerHandle = meetingInfo.u;
    this.chatRoom = meetingInfo.chatRoom;
    this.chatRoom.scheduledMeeting = this.isRoot ? this : this.parent;
    if (fromActionPacket) {
      this.initializeFromActionPacket();
    }
  }
  get isRoot() {
    return !this.parentId;
  }
  get isCanceled() {
    return !!this.canceled;
  }
  get isPast() {
    return (this.isRecurring ? this.recurring.end : this.end) < Date.now();
  }
  get isUpcoming() {
    return !(this.isCanceled || this.isPast || this.isCompleted);
  }
  get isRecurring() {
    return !!this.recurring;
  }
  get isNear() {
    return this.start - Date.now() < ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
  }
  get iAmOwner() {
    if (this.ownerHandle) {
      return this.ownerHandle === u_handle;
    }
    return null;
  }
  get parent() {
    return this.isRoot ? null : this.megaChat.plugins.meetingsManager.getMeetingById(this.parentId);
  }
  setNextOccurrence() {
    const upcomingOccurrences = Object.values(this.occurrences).filter(o => o.isUpcoming);
    if (!upcomingOccurrences || !upcomingOccurrences.length) {
      this.isCompleted = this.isRecurring;
      return;
    }
    const sortedOccurrences = upcomingOccurrences.sort((a, b) => a.start - b.start);
    this.nextOccurrenceStart = sortedOccurrences[0].start;
    this.nextOccurrenceEnd = sortedOccurrences[0].end;
  }
  async getOccurrences(options) {
    const {
      from,
      to,
      count
    } = options || {};
    const {
      meetingsManager
    } = this.megaChat.plugins;
    const req = {
      a: 'mcsmfo',
      cid: this.chatId,
      ...from && {
        cf: Math.round(from / 1000)
      },
      ...to && {
        ct: Math.round(to / 1000)
      },
      ...count && {
        cc: count
      }
    };
    if (is_chatlink) {
      req.ph = is_chatlink.ph;
      delete req.cid;
    }
    const occurrences = await asyncApiReq(req);
    if (Array.isArray(occurrences)) {
      if (!options) {
        this.occurrences.clear();
      }
      for (let i = 0; i < occurrences.length; i++) {
        const occurrence = new Occurrence(this.megaChat, {
          scheduledMeeting: this,
          ...occurrences[i]
        });
        this.occurrences.set(occurrence.uid, occurrence);
      }
      this.isCompleted = false;
      this.setNextOccurrence();
      this.megaChat.trigger(meetingsManager.EVENTS.OCCURRENCES_UPDATE, this);
    }
    return this.occurrences;
  }
  getOccurrencesById(occurrenceId) {
    const occurrences = Object.values(this.occurrences.toJS()).filter(o => o.id === occurrenceId);
    return occurrences.length ? occurrences : false;
  }
  initializeFromActionPacket() {
    const {
      megaChat,
      isUpcoming,
      isCanceled,
      isRecurring,
      parent
    } = this;
    if (isUpcoming && isRecurring || parent) {
      return parent ? (() => {
        const occurrences = Object.values(parent.occurrences);
        if (occurrences.length <= 20) {
          return parent.getOccurrences().catch(nop);
        }
        occurrences.sort((a, b) => a.start - b.start);
        const {
          chatId,
          start,
          startInitial
        } = this;
        const currentIndex = occurrences.findIndex(o => o.uid === `${chatId}-${(startInitial || start) / 1000}`);
        const previous = occurrences[currentIndex - 1];
        if (!previous) {
          return parent.getOccurrences().catch(nop);
        }
        const movedBack = start <= previous.start;
        let tmp = 0;
        let newStart = movedBack ? Date.now() : previous.end;
        const maxIdx = movedBack ? currentIndex + 1 : occurrences.length;
        const startIdx = movedBack ? 0 : currentIndex;
        for (let i = startIdx; i < maxIdx; i++) {
          if (++tmp % 20 === 0) {
            parent.getOccurrences({
              from: newStart,
              to: occurrences[i].end,
              count: 20
            }).catch(dump);
            newStart = occurrences[i].end;
            tmp = 0;
          }
          parent.occurrences.remove(occurrences[i].uid);
        }
        if (tmp) {
          parent.getOccurrences({
            from: newStart,
            count: tmp,
            to: movedBack ? occurrences[currentIndex].end : occurrences[occurrences.length - 1].end
          }).catch(dump);
        }
      })() : this.getOccurrences().catch(nop);
    }
    megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS[isCanceled ? 'CANCEL' : 'INITIALIZE'], this);
  }
  isSameAsOpts(opts) {
    const {
      timezone,
      startDateTime,
      endDateTime,
      topic,
      description,
      f,
      recurring
    } = opts;
    if (this.timezone !== timezone || this.start !== startDateTime || this.end !== endDateTime) {
      return false;
    }
    if (this.title !== topic) {
      return false;
    }
    if (this.description !== description) {
      return false;
    }
    if (this.flags !== f) {
      return false;
    }
    if (!!this.recurring ^ !!recurring) {
      return false;
    }
    if (this.recurring) {
      if (this.recurring.frequency !== recurring.frequency || this.recurring.interval !== (recurring.interval || 0)) {
        return false;
      }
      if (this.recurring.end !== recurring.end) {
        return false;
      }
      let diff = array.diff(this.recurring.weekDays, recurring.weekDays || []);
      if (diff.removed.length + diff.added.length) {
        return false;
      }
      diff = array.diff(this.recurring.monthDays, recurring.monthDays || []);
      if (diff.removed.length + diff.added.length) {
        return false;
      }
      if (Array.isArray(this.recurring.offset) && !Array.isArray(recurring.offset) || !Array.isArray(this.recurring.offset) && Array.isArray(recurring.offset)) {
        return false;
      }
      if ((this.recurring.offset.value || 0) !== (recurring.offset.value || 0) || (this.recurring.offset.weekDay || 0) !== (recurring.offset.weekDay || 0)) {
        return false;
      }
    }
    return true;
  }
}
class MeetingsManager {
  constructor(megaChat) {
    this.EVENTS = {
      INITIALIZE: 'onMeetingInitialize',
      EDIT: 'onMeetingEdit',
      CANCEL: 'onMeetingCancel',
      LEAVE: 'onMeetingLeave',
      OCCURRENCES_UPDATE: 'onOccurrencesUpdate'
    };
    this.startDayStrings = [l.schedule_occur_sun, l.schedule_occur_mon, l.schedule_occur_tue, l.schedule_occur_wed, l.schedule_occur_thu, l.schedule_occur_fri, l.schedule_occur_sat];
    this.midDayStrings = [l.schedule_occur_sun_mid, l.schedule_occur_mon_mid, l.schedule_occur_tue_mid, l.schedule_occur_wed_mid, l.schedule_occur_thu_mid, l.schedule_occur_fri_mid, l.schedule_occur_sat_mid];
    this.NOTIF_TITLES = {
      recur: {
        desc: {
          update: l.schedule_notif_update_desc
        },
        name: {
          update: l.schedule_mgmt_title
        },
        time: {
          occur: l.schedule_mgmt_update_occur,
          all: l.schedule_mgmt_update_recur
        },
        convert: l.schedule_mgmt_update_convert_recur,
        inv: l.schedule_notif_invite_recur,
        multi: l.schedule_notif_update_multi,
        cancel: {
          occur: l.schedule_mgmt_cancel_occur,
          all: l.schedule_mgmt_cancel_recur
        }
      },
      once: {
        desc: {
          update: l.schedule_notif_update_desc
        },
        name: {
          update: l.schedule_mgmt_title
        },
        time: {
          occur: '',
          all: l.schedule_mgmt_update
        },
        convert: l.schedule_mgmt_update_convert,
        inv: l.schedule_notif_invite,
        multi: l.schedule_notif_update_multi,
        cancel: {
          occur: '',
          all: l.schedule_mgmt_cancel
        }
      }
    };
    this.OCCUR_STRINGS = {
      recur: {
        daily: {
          continuous: {
            occur: l.schedule_recur_time_daily_cont,
            skip: l.scheduled_recur_time_daily_skip_cont
          },
          limited: {
            occur: l.schedule_recur_time_daily,
            skip: l.scheduled_recur_time_daily_skip
          }
        },
        weekly: {
          continuous: {
            list: l.schedule_recur_time_week_cont_list,
            spec: l.schedule_recur_time_week_cont
          },
          limited: {
            list: l.schedule_recur_time_week_list,
            spec: l.schedule_recur_time_week
          }
        },
        monthly: {
          continuous: {
            num: l.schedule_recur_time_num_day_month_cont,
            pos: [[l.schedule_recur_time_first_day_month_6_cont, l.schedule_recur_time_first_day_month_0_cont, l.schedule_recur_time_first_day_month_1_cont, l.schedule_recur_time_first_day_month_2_cont, l.schedule_recur_time_first_day_month_3_cont, l.schedule_recur_time_first_day_month_4_cont, l.schedule_recur_time_first_day_month_5_cont], [l.schedule_recur_time_second_day_month_6_cont, l.schedule_recur_time_second_day_month_0_cont, l.schedule_recur_time_second_day_month_1_cont, l.schedule_recur_time_second_day_month_2_cont, l.schedule_recur_time_second_day_month_3_cont, l.schedule_recur_time_second_day_month_4_cont, l.schedule_recur_time_second_day_month_5_cont], [l.schedule_recur_time_third_day_month_6_cont, l.schedule_recur_time_third_day_month_0_cont, l.schedule_recur_time_third_day_month_1_cont, l.schedule_recur_time_third_day_month_2_cont, l.schedule_recur_time_third_day_month_3_cont, l.schedule_recur_time_third_day_month_4_cont, l.schedule_recur_time_third_day_month_5_cont], [l.schedule_recur_time_fourth_day_month_6_cont, l.schedule_recur_time_fourth_day_month_0_cont, l.schedule_recur_time_fourth_day_month_1_cont, l.schedule_recur_time_fourth_day_month_2_cont, l.schedule_recur_time_fourth_day_month_3_cont, l.schedule_recur_time_fourth_day_month_4_cont, l.schedule_recur_time_fourth_day_month_5_cont], [l.schedule_recur_time_fifth_day_month_6_cont, l.schedule_recur_time_fifth_day_month_0_cont, l.schedule_recur_time_fifth_day_month_1_cont, l.schedule_recur_time_fifth_day_month_2_cont, l.schedule_recur_time_fifth_day_month_3_cont, l.schedule_recur_time_fifth_day_month_4_cont, l.schedule_recur_time_fifth_day_month_5_cont]],
            last: [l.schedule_recur_time_fifth_day_month_6_cont, l.schedule_recur_time_fifth_day_month_0_cont, l.schedule_recur_time_fifth_day_month_1_cont, l.schedule_recur_time_fifth_day_month_2_cont, l.schedule_recur_time_fifth_day_month_3_cont, l.schedule_recur_time_fifth_day_month_4_cont, l.schedule_recur_time_fifth_day_month_5_cont]
          },
          limited: {
            num: l.schedule_recur_time_num_day_month,
            pos: [[l.schedule_recur_time_first_day_month_6, l.schedule_recur_time_first_day_month_0, l.schedule_recur_time_first_day_month_1, l.schedule_recur_time_first_day_month_2, l.schedule_recur_time_first_day_month_3, l.schedule_recur_time_first_day_month_4, l.schedule_recur_time_first_day_month_5], [l.schedule_recur_time_second_day_month_6, l.schedule_recur_time_second_day_month_0, l.schedule_recur_time_second_day_month_1, l.schedule_recur_time_second_day_month_2, l.schedule_recur_time_second_day_month_3, l.schedule_recur_time_second_day_month_4, l.schedule_recur_time_second_day_month_5], [l.schedule_recur_time_third_day_month_6, l.schedule_recur_time_third_day_month_0, l.schedule_recur_time_third_day_month_1, l.schedule_recur_time_third_day_month_2, l.schedule_recur_time_third_day_month_3, l.schedule_recur_time_third_day_month_4, l.schedule_recur_time_third_day_month_5], [l.schedule_recur_time_fourth_day_month_6, l.schedule_recur_time_fourth_day_month_0, l.schedule_recur_time_fourth_day_month_1, l.schedule_recur_time_fourth_day_month_2, l.schedule_recur_time_fourth_day_month_3, l.schedule_recur_time_fourth_day_month_4, l.schedule_recur_time_fourth_day_month_5], [l.schedule_recur_time_fifth_day_month_6, l.schedule_recur_time_fifth_day_month_0, l.schedule_recur_time_fifth_day_month_1, l.schedule_recur_time_fifth_day_month_2, l.schedule_recur_time_fifth_day_month_3, l.schedule_recur_time_fifth_day_month_4, l.schedule_recur_time_fifth_day_month_5]],
            last: [l.schedule_recur_time_last_day_month_6, l.schedule_recur_time_last_day_month_0, l.schedule_recur_time_last_day_month_1, l.schedule_recur_time_last_day_month_2, l.schedule_recur_time_last_day_month_3, l.schedule_recur_time_last_day_month_4, l.schedule_recur_time_last_day_month_5]
          }
        },
        [scheduleMetaChange.A.MODE.CANCELLED]: {
          occur: l.schedule_occurrence_time,
          all: ''
        }
      },
      once: {
        [scheduleMetaChange.A.MODE.CREATED]: {
          occur: l.schedule_occurrence_time
        },
        [scheduleMetaChange.A.MODE.EDITED]: {
          occur: l.schedule_occurrence_time_recur
        },
        [scheduleMetaChange.A.MODE.CANCELLED]: {
          occur: ''
        }
      }
    };
    this.megaChat = megaChat;
    this.scheduledMeetings = megaChat.scheduledMeetings || new MegaDataMap();
    this._goneOccurrences = {};
    this.megaChat.rebind(this.EVENTS.CANCEL, ({
      data
    }) => this.archiveMeeting(data));
    this.megaChat.rebind(this.EVENTS.LEAVE, ({
      data
    }) => this.detachMeeting(data));
    this.megaChat.rebind(`${this.EVENTS.OCCURRENCES_UPDATE}.tracker`, ({
      data
    }) => {
      if (!this._goneOccurrences[data.chatId]) {
        return;
      }
      const {
        chatId
      } = data;
      for (const scheduledId of Object.keys(this._goneOccurrences[chatId])) {
        if (this._goneOccurrences[chatId][scheduledId] === -1) {
          this._goneOccurrences[chatId][scheduledId] = this.scheduledMeetings[scheduledId] ? 0 : 1;
        }
      }
    });
  }
  checkForNotifications() {
    const time = Date.now();
    const upcomingMeetings = Object.values(this.scheduledMeetings.toJS()).filter(c => c.isUpcoming);
    for (const meeting of upcomingMeetings) {
      if (pushNotificationSettings.isAllowedForChatId(meeting.chatId)) {
        if (meeting.nextOccurrenceStart >= time + 9e5 && meeting.nextOccurrenceStart <= time + 96e4) {
          const ss = Math.floor(meeting.nextOccurrenceStart / 1000);
          const ns = Math.floor(time / 1000) + 900;
          if (ss - ns <= 10) {
            this.megaChat.trigger('onScheduleUpcoming', meeting);
          } else {
            tSleep(ss - ns).always(() => {
              this.megaChat.trigger('onScheduleUpcoming', meeting);
            });
          }
        } else if (meeting.nextOccurrenceStart >= time && meeting.nextOccurrenceStart < time + 6e4) {
          const ss = Math.floor(meeting.nextOccurrenceStart / 1000);
          const ns = Math.floor(time / 1000);
          tSleep(ss - ns).always(() => {
            this.megaChat.trigger('onScheduleStarting', meeting);
          });
        }
      }
    }
  }
  encodeData(data) {
    return data && base64urlencode(to8(data));
  }
  decodeData(data) {
    return data && from8(base64urldecode(data));
  }
  getMeetingById(meetingId) {
    return this.scheduledMeetings[meetingId];
  }
  getMeetingOrOccurrenceParent(meetingId) {
    const meeting = this.scheduledMeetings[meetingId];
    if (!meeting) {
      return false;
    }
    if (meeting.parentId) {
      return this.getMeetingOrOccurrenceParent(meeting.parentId);
    }
    return meeting;
  }
  getRoomByMeetingId() {}
  async createMeeting(meetingInfo) {
    await this.megaChat.createAndShowGroupRoomFor(meetingInfo.participants, meetingInfo.topic, {
      keyRotation: false,
      createChatLink: meetingInfo.link,
      isMeeting: true,
      openInvite: meetingInfo.openInvite,
      waitingRoom: meetingInfo.waitingRoom,
      scheduledMeeting: {
        a: 'mcsmp',
        s: meetingInfo.startDateTime / 1000,
        e: meetingInfo.endDateTime / 1000,
        tz: this.encodeData(meetingInfo.timezone),
        t: this.encodeData(meetingInfo.topic),
        d: this.encodeData(meetingInfo.description),
        f: meetingInfo.sendInvite ? 0x01 : 0x00,
        ...meetingInfo.recurring && {
          r: {
            f: meetingInfo.recurring.frequency,
            wd: meetingInfo.recurring.weekDays,
            md: meetingInfo.recurring.monthDays,
            mwd: meetingInfo.recurring.offset,
            ...meetingInfo.recurring.end && {
              u: meetingInfo.recurring.end / 1000
            },
            ...meetingInfo.recurring.interval && {
              i: meetingInfo.recurring.interval
            }
          }
        }
      }
    });
  }
  async updateMeeting(meetingInfo, chatRoom) {
    const {
      scheduledMeeting,
      chatId,
      publicLink,
      options
    } = chatRoom;
    await megaChat.plugins.chatdIntegration.updateScheduledMeeting(meetingInfo, scheduledMeeting.id, chatId);
    const nextParticipants = meetingInfo.participants;
    const prevParticipants = chatRoom.getParticipantsExceptMe();
    const participantsDiff = JSON.stringify(nextParticipants) !== JSON.stringify(prevParticipants);
    if (participantsDiff) {
      const removed = prevParticipants.filter(h => !nextParticipants.includes(h));
      const added = nextParticipants.filter(h => !prevParticipants.includes(h));
      if (removed.length) {
        for (let i = removed.length; i--;) {
          chatRoom.trigger('onRemoveUserRequest', [removed[i]]);
        }
      }
      if (added.length) {
        chatRoom.trigger('onAddUserRequest', [added]);
      }
    }
    if (!!meetingInfo.link !== !!publicLink) {
      chatRoom.updatePublicHandle(!meetingInfo.link, meetingInfo.link);
    }
    if (meetingInfo.waitingRoom !== options[chat_chatRoom.U_.WAITING_ROOM]) {
      chatRoom.toggleWaitingRoom();
    }
    if (meetingInfo.openInvite !== options[chat_chatRoom.U_.OPEN_INVITE]) {
      chatRoom.toggleOpenInvite();
    }
  }
  cancelMeeting(scheduledMeeting, chatId) {
    return this.megaChat.plugins.chatdIntegration.cancelScheduledMeeting(scheduledMeeting, chatId);
  }
  deleteMeeting(scheduledMeetingId, chatId) {
    return this.megaChat.plugins.chatdIntegration.deleteScheduledMeeting(scheduledMeetingId, chatId);
  }
  attachMeeting(meetingInfo, fromActionPacket) {
    const chatRoom = meetingInfo.chatRoom || this.megaChat.getChatById(meetingInfo.cid);
    if (chatRoom) {
      const scheduledMeeting = new ScheduledMeeting(this.megaChat, {
        chatRoom,
        ...meetingInfo
      }, fromActionPacket);
      this.scheduledMeetings.set(meetingInfo.id, scheduledMeeting);
      return scheduledMeeting;
    }
  }
  detachMeeting(scheduledMeeting) {
    if (scheduledMeeting) {
      this.archiveMeeting(scheduledMeeting);
      scheduledMeeting.chatRoom.scheduledMeeting = null;
      this.scheduledMeetings.remove(scheduledMeeting.id);
      if (fmdb) {
        fmdb.del('mcsm', scheduledMeeting.id);
      }
    }
  }
  archiveMeeting(scheduledMeeting) {
    const {
      chatRoom
    } = scheduledMeeting;
    tSleep(2).then(() => chatRoom.hasMessages(true) ? null : chatRoom.archive());
  }
  filterUpcomingMeetings(conversations) {
    const upcomingMeetings = Object.values(conversations || {}).filter(c => {
      return c.isDisplayable() && c.isMeeting && c.scheduledMeeting && c.scheduledMeeting.isUpcoming && c.iAmInRoom() && !c.havePendingCall();
    }).sort((a, b) => a.scheduledMeeting.nextOccurrenceStart - b.scheduledMeeting.nextOccurrenceStart || a.ctime - b.ctime);
    const nextOccurrences = upcomingMeetings.reduce((nextOccurrences, chatRoom) => {
      const {
        nextOccurrenceStart
      } = chatRoom.scheduledMeeting;
      if ((0,helpers.cK)(nextOccurrenceStart)) {
        nextOccurrences.today.push(chatRoom);
      } else if ((0,helpers.ef)(nextOccurrenceStart)) {
        nextOccurrences.tomorrow.push(chatRoom);
      } else {
        const date = time2date(nextOccurrenceStart / 1000, 19);
        if (!nextOccurrences.rest[date]) {
          nextOccurrences.rest[date] = [];
        }
        nextOccurrences.rest[date].push(chatRoom);
      }
      return nextOccurrences;
    }, {
      today: [],
      tomorrow: [],
      rest: {}
    });
    return {
      upcomingMeetings,
      nextOccurrences
    };
  }
  getOccurrenceStrings(meta) {
    const res = [];
    const {
      prevTiming,
      timeRules,
      mode,
      occurrence,
      recurring,
      converted
    } = meta;
    const {
      MODE
    } = scheduleMetaChange.A;
    if (!mode) {
      return res;
    }
    const {
      OCCUR_STRINGS
    } = this;
    let string;
    if (recurring) {
      res.push(this._parseOccurrence(timeRules, mode, occurrence));
      if (prevTiming && !(occurrence && mode === MODE.CANCELLED)) {
        res.push(this._parseOccurrence(prevTiming, mode, occurrence));
      }
    } else {
      const {
        startTime,
        endTime
      } = timeRules;
      string = OCCUR_STRINGS.once[mode].occur;
      res.push(string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%6', time2date(startTime, 20)).replace('%s', time2date(startTime, 11)));
      if (prevTiming) {
        const {
          startTime: pStartTime,
          endTime: pEndTime
        } = prevTiming;
        if (converted) {
          res.push(this._parseOccurrence(prevTiming, mode, occurrence));
        } else {
          res.push(string.replace('%1', toLocaleTime(pStartTime)).replace('%2', toLocaleTime(pEndTime)).replace('%6', time2date(pStartTime, 20)).replace('%s', time2date(pStartTime, 11)));
        }
      }
    }
    return res;
  }
  _parseOccurrence(timeRules, mode, occurrence) {
    const {
      startTime,
      endTime,
      days,
      dayInt,
      interval,
      month,
      recurEnd,
      skipDay
    } = timeRules;
    const {
      recur,
      once
    } = this.OCCUR_STRINGS;
    const occurrenceEnd = recurEnd ? 'limited' : 'continuous';
    let string = '';
    if (recur[mode]) {
      return occurrence ? recur[mode].occur.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%s', time2date(startTime, 11)) : recur[mode].all;
    } else if (month) {
      const {
        count,
        occur
      } = month;
      string = count < 0 ? mega.icu.format(recur.monthly[occurrenceEnd].last[occur], interval) : mega.icu.format(recur.monthly[occurrenceEnd].pos[count][occur], interval);
      return string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%3', time2date(startTime, 2)).replace('%4', time2date(recurEnd, 2));
    } else if (days) {
      if (days.length > 1) {
        if (days.length === 7) {
          return recur.daily[occurrenceEnd].occur.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%3', time2date(startTime, 2)).replace('%4', time2date(recurEnd, 2));
        }
        const weekDays = days.map((day, idx) => {
          if (idx) {
            return this.midDayStrings[day];
          }
          return this.startDayStrings[day];
        });
        string = mega.icu.format(recur.weekly[occurrenceEnd].list, interval);
        string = mega.utils.trans.listToString(weekDays, string);
      } else {
        string = mega.icu.format(recur.weekly[occurrenceEnd].spec, interval).replace('%s', this.startDayStrings[days[0]]);
      }
      return string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%3', time2date(startTime, 2)).replace('%4', time2date(recurEnd, 2));
    } else if (dayInt) {
      string = mega.icu.format(recur.monthly[occurrenceEnd].num, interval);
      return string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%3', time2date(startTime, 2)).replace('%4', time2date(recurEnd, 2)).replace('%5', dayInt);
    } else if (skipDay) {
      string = mega.icu.format(recur.daily[occurrenceEnd].skip, interval);
      return string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%3', time2date(startTime, 2)).replace('%4', time2date(recurEnd, 2));
    }
    string = once[mode].occur;
    return string.replace('%1', toLocaleTime(startTime)).replace('%2', toLocaleTime(endTime)).replace('%6', time2date(startTime, 20)).replace('%s', time2date(startTime, 11));
  }
  getFormattingMeta(scheduledId, data, chatRoom) {
    const {
      MODE
    } = scheduleMetaChange.A;
    const meta = {
      userId: data.sender || false,
      timeRules: {},
      mode: MODE.EDITED,
      handle: scheduledId,
      cid: chatRoom.chatId
    };
    const changeSet = data.schedChange || data.cs || false;
    if (changeSet) {
      const {
        s,
        e,
        c,
        r,
        t,
        d: desc
      } = changeSet;
      let onlyTitle = typeof t !== 'undefined';
      if (Array.isArray(c) && c[1]) {
        meta.mode = MODE.CANCELLED;
      }
      if (Array.isArray(s)) {
        meta.prevTiming = {
          startTime: s[0]
        };
        meta.timeRules.startTime = s[1] || s[0];
      }
      const meeting = this.getMeetingOrOccurrenceParent(scheduledId);
      if (Array.isArray(e)) {
        if (!meta.prevTiming) {
          meta.prevTiming = {
            startTime: meeting ? Math.floor(meeting.start / 1000) : 0
          };
          meta.timeRules.startTime = meta.prevTiming.startTime;
        }
        meta.prevTiming.endTime = e[0];
        meta.timeRules.endTime = e[1] || e[0];
        onlyTitle = false;
      }
      if (desc) {
        meta.description = true;
        onlyTitle = false;
      }
      if (Array.isArray(r)) {
        const parseR = r => r ? typeof r === 'string' ? JSON.parse(r) : r : false;
        const prev = parseR(r[0]);
        const next = parseR(r[1]);
        if (r.length === 1) {
          meta.converted = false;
          meta.timeRules = this._recurringTimings(prev, meta.timeRules || {});
          meta.prevTiming = this._recurringTimings(prev, meta.prevTiming);
          meta.recurring = r[0] !== '';
        } else {
          meta.converted = !!(!!prev ^ !!next);
          if (prev) {
            meta.prevTiming = this._recurringTimings(prev, meta.prevTiming || {});
          }
          meta.timeRules = this._recurringTimings(next, meta.timeRules || {});
          meta.recurring = next !== false;
        }
        onlyTitle = false;
      }
      if (!meeting || meeting.id !== scheduledId) {
        meta.occurrence = true;
        meta.recurring = true;
      }
      if (Array.isArray(t)) {
        meta.topicChange = true;
        meta.onlyTitle = onlyTitle;
        meta.topic = this.decodeData(t[1]);
        meta.oldTopic = this.decodeData(t[0]);
      }
      return meta;
    }
    return this.noCsMeta(scheduledId, data, chatRoom);
  }
  _recurringTimings(meta, obj) {
    if (!meta) {
      return obj;
    }
    obj.recurEnd = meta.u || false;
    obj.interval = meta.i || 1;
    if (meta.wd) {
      obj.days = meta.wd.sort((a, b) => a - b).map(wd => wd === 7 ? 0 : wd);
    }
    if (meta.md) {
      obj.dayInt = meta.md[0];
    }
    if (meta.mwd) {
      obj.month = meta.mwd.map(oc => {
        return {
          count: (oc[0] || 1) - 1,
          occur: oc[1] ? oc[1] === 7 ? 0 : oc[1] : 1
        };
      })[0];
    }
    if (meta.f === 'd' && meta.i > 1) {
      obj.skipDay = true;
    } else if (meta.f === 'd' && meta.i === 1) {
      obj.days = [1, 2, 3, 4, 5, 6, 0];
    }
    return obj;
  }
  noCsMeta(scheduledId, data, chatRoom) {
    const meta = {
      timeRules: {},
      userId: data.sender || false,
      ap: data,
      handle: scheduledId,
      cid: chatRoom.chatId
    };
    if (!this.getMeetingOrOccurrenceParent(scheduledId) && !chatRoom.scheduledMeeting) {
      const res = this._checkOccurrenceAwait(chatRoom, scheduledId, meta);
      if (res) {
        return res;
      }
    }
    const meeting = this.getMeetingOrOccurrenceParent(scheduledId) || chatRoom.scheduledMeeting;
    assert(meeting, `Invalid scheduled meeting state for ${scheduledId} msg`);
    const toS = ms => Math.floor(ms / 1000);
    const {
      MODE
    } = scheduleMetaChange.A;
    meta.timeRules.startTime = toS(meeting.start);
    meta.timeRules.endTime = toS(meeting.end);
    meta.topic = meeting.title;
    meta.recurring = !!meeting.recurring;
    meta.mode = meeting.canceled ? MODE.CANCELLED : MODE.CREATED;
    meta.occurrence = meta.recurring && meeting.id !== scheduledId;
    if (!meta.occurrence && !meeting.canceled) {
      meta.mode = MODE.CREATED;
    }
    const cal = ms => {
      const date = new Date(ms);
      return {
        date: date.getDate(),
        month: time2date(toS(ms), 12)
      };
    };
    if (meta.occurrence) {
      const occurrences = meeting.getOccurrencesById(scheduledId);
      if (!occurrences) {
        meta.mode = MODE.EDITED;
        const res = this._checkOccurrenceAwait(chatRoom, scheduledId, meta);
        if (res) {
          return res;
        }
        meta.ap = data;
        return meta;
      }
      meta.mode = occurrences.some(o => o.canceled) ? MODE.CANCELLED : MODE.EDITED;
      meta.calendar = cal(occurrences[0].start);
      const timeDiff = meta.timeRules.endTime - meta.timeRules.startTime;
      meta.timeRules.startTime = toS(occurrences[0].start);
      meta.timeRules.endTime = toS(occurrences[0].end);
      if (occurrences.length === 1 && occurrences[0].startInitial) {
        meta.prevTiming = {
          startTime: toS(occurrences[0].startInitial)
        };
        meta.prevTiming.endTime = meta.prevTiming.startTime + timeDiff;
      }
    } else if (meta.recurring) {
      const {
        end,
        weekDays = [],
        interval,
        monthDays = [],
        offset,
        frequency
      } = meeting.recurring;
      meta.recurring = true;
      meta.timeRules.recurEnd = end ? toS(end) : false;
      meta.timeRules.interval = interval || 1;
      if (frequency === 'd' && interval > 1) {
        meta.timeRules.skipDay = true;
      } else if (frequency === 'd' && interval === 1) {
        meta.timeRules.days = [1, 2, 3, 4, 5, 6, 0];
      }
      if (weekDays.length) {
        meta.timeRules.days = weekDays.sort((a, b) => a - b).map(wd => wd === 7 ? 0 : wd);
      }
      if (monthDays.length) {
        meta.timeRules.dayInt = monthDays[0];
      }
      if (!Array.isArray(offset)) {
        meta.timeRules.month = {
          count: (offset.value || 1) - 1,
          occur: offset.weekDay ? offset.weekDay === 7 ? 0 : offset.weekDay : 1
        };
      }
      meta.calendar = cal(meeting.start);
    } else {
      meta.calendar = cal(meeting.start);
    }
    if (!meta.occurrence && meeting.canceled && $.len(meta.timeRules)) {
      meta.mode = MODE.CREATED;
    }
    delete meta.ap;
    return meta;
  }
  _checkOccurrenceAwait(chatRoom, scheduledId, meta) {
    if (!this._goneOccurrences[chatRoom.chatId]) {
      this._goneOccurrences[chatRoom.chatId] = {};
    }
    if (typeof this._goneOccurrences[chatRoom.chatId][scheduledId] === 'undefined') {
      this._goneOccurrences[chatRoom.chatId][scheduledId] = -1;
      return meta;
    }
    const datum = this._goneOccurrences[chatRoom.chatId];
    if (datum[scheduledId] === -1) {
      return meta;
    } else if (datum[scheduledId] === 1) {
      meta.gone = true;
      return meta;
    }
    return false;
  }
  areMetaObjectsSame(obj1, obj2) {
    if (obj1 && !obj2 || !obj1 && obj2) {
      return false;
    }
    const keys = Object.keys(obj1);
    if (keys.length !== $.len(obj2)) {
      return false;
    }
    const diff = array.diff(keys, Object.keys(obj2));
    if (diff.removed.length + diff.added.length) {
      return false;
    }
    for (const key of keys) {
      if (!obj2.hasOwnProperty(key)) {
        return false;
      }
      if (obj1[key] instanceof Object && obj2[key] instanceof Object) {
        if (!this.areMetaObjectsSame(obj1[key], obj2[key])) {
          return false;
        }
      } else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
        const keyDiff = array.diff(obj1[key], obj2[key]);
        if (keyDiff.removed.length + keyDiff.added.length) {
          return false;
        }
      } else if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    return true;
  }
}
 const meetingsManager = MeetingsManager;
window.MeetingsManager = MeetingsManager;
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/chat/chatOnboarding.jsx

let _dec, _class;

const ChatOnboarding = (_dec = (0,mixins.hG)(1000), _class = class ChatOnboarding {
  constructor(megaChat) {
    this.finished = false;
    if (u_type === 3 && !is_mobile) {
      this.state = {
        [OBV4_FLAGS.CHAT]: -1
      };
      this.megaChat = megaChat;
      this.flagMap = attribCache.bitMapsManager.exists('obv4') ? attribCache.bitMapsManager.get('obv4') : new MegaDataBitMap('obv4', false, Object.values(OBV4_FLAGS));
      const keys = Object.keys(this.state);
      const promises = keys.map(key => this.flagMap.get(key));
      Promise.allSettled(promises).then(res => {
        for (let i = 0; i < res.length; ++i) {
          const v = res[i];
          if (v.status === 'fulfilled') {
            this.handleFlagChange(null, null, keys[i], v.value);
          }
        }
      });
      this.interval = setInterval(() => {
        if (!$.dialog) {
          this._checkAndShowStep();
        }
      }, 10000);
      this.initListeners();
    }
  }
  initListeners() {
    this.flagMap.addChangeListener((...args) => this.handleFlagChange(...args));
    this.megaChat.chatUIFlags.addChangeListener(SoonFc(200, () => {
      if (this.megaChat.chatUIFlags.convPanelCollapse && $.dialog === 'onboardingDialog') {
        closeDialog();
      }
      this._checkAndShowStep();
    }));
    this.megaChat.addChangeListener(() => {
      const room = this.megaChat.getCurrentRoom();
      if (!room) {
        return;
      }
      this.checkAndShowStep();
    });
  }
  checkAndShowStep() {
    this._checkAndShowStep();
  }
  _shouldSkipShow() {
    if (!M.chat || !mega.ui.onboarding || $.dialog || loadingDialog.active || u_type < 3 || is_mobile || $.msgDialog) {
      return true;
    }
    this.$topRightMenu = this.$topRightMenu || $('.top-menu-popup', '#topmenu');
    if (!this.$topRightMenu.hasClass('o-hidden')) {
      return true;
    }
    this.$topAccDropdown = this.$topAccDropdown || $('.js-dropdown-account', '#topmenu');
    if (this.$topAccDropdown.hasClass('show')) {
      return true;
    }
    this.$topNotifDropdown = this.$topNotifDropdown || $('.js-dropdown-notification', '#topmenu');
    if (this.$topNotifDropdown.hasClass('show')) {
      return true;
    }
    this.$searchPanel = this.$searchPanel || $('.search-panel', '.conversationsApp');
    return this.$searchPanel.hasClass('expanded');
  }
  _checkAndShowStep() {
    if (this._shouldSkipShow()) {
      return;
    }
    const {
      sections
    } = mega.ui.onboarding;
    if (!sections) {
      return;
    }
    const {
      chat: obChat
    } = sections;
    if (!obChat) {
      return;
    }
    if (this.state[OBV4_FLAGS.CHAT]) {
      return;
    }
    this.showDefaultNextStep(obChat);
  }
  showDefaultNextStep(obChat) {
    const nextIdx = obChat.searchNextOpenStep();
    if (nextIdx !== false && (!this.$obDialog || !this.$obDialog.is(':visible')) && (this.obToggleDrawn || $('.conversations-category', '.conversationsApp').length)) {
      this.obToggleDrawn = true;
      if (obChat.steps && obChat.steps[nextIdx] && obChat.steps[nextIdx].isComplete) {
        return;
      }
      obChat.startNextOpenSteps(nextIdx);
      this.$obDialog = this.$obDialog || $('#ob-dialog');
    }
  }
  handleFlagChange(...args) {
    if (args.length >= 4 && typeof args[2] === 'string' && typeof args[3] === 'number' && this.state.hasOwnProperty(args[2])) {
      if (d) {
        console.debug(`Chat onboarding flag ${args[2]}: ${this.state[args[2]]} -> ${args[3]}`);
      }
      this.state[args[2]] = args[3];
      if (args[2] === OBV4_FLAGS.CHAT && args[3] === 1 && this.interval) {
        clearInterval(this.interval);
        delete this.interval;
      }
    }
  }
  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      delete this.interval;
    }
  }
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "checkAndShowStep", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "checkAndShowStep"), _class.prototype), _class);

// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const utils = REQ_(3901);
// EXTERNAL MODULE: ./js/chat/chatGlobalEventManager.jsx
const chatGlobalEventManager = REQ_(8676);
// EXTERNAL MODULE: ./js/chat/ui/messages/utils.jsx
const messages_utils = REQ_(187);
// EXTERNAL MODULE: ./js/chat/utils.jsx
const chat_utils = REQ_(5779);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
const meetings_button = REQ_(6740);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const ui_utils = REQ_(6411);
;// ./js/chat/ui/meetings/workflow/incoming.jsx







class Incoming extends REaCt().Component {
  constructor(props) {
    super(props);
    this.state = {
      video: false,
      unsupported: undefined,
      hoveredSwitch: true,
      hideOverlay: false
    };
    this.renderSwitchControls = () => {
      const className = `mega-button large round switch ${this.state.hoveredSwitch ? 'hovered' : ''}`;
      const toggleHover = () => this.setState(state => ({
        hoveredSwitch: !state.hoveredSwitch
      }));
      return JSX_("div", {
        className: "switch-button"
      }, JSX_("div", {
        className: "switch-button-container simpletip",
        "data-simpletip": l.end_and_answer,
        "data-simpletipposition": "top",
        onMouseEnter: toggleHover,
        onMouseLeave: toggleHover,
        onClick: ev => {
          ev.stopPropagation();
          this.props.onSwitch();
        }
      }, JSX_(meetings_button.A, {
        className: `${className} negative`,
        icon: "icon-end-call"
      }), JSX_(meetings_button.A, {
        className: `${className} positive`,
        icon: "icon-phone"
      })));
    };
    this.renderAnswerControls = () => {
      const {
        video,
        unsupported
      } = this.state;
      const {
        onAnswer,
        onToggleVideo
      } = this.props;
      return JSX_(REaCt().Fragment, null, JSX_(meetings_button.A, {
        className: `
                        mega-button
                        positive
                        answer
                        ${unsupported ? 'disabled' : ''}
                    `,
        icon: "icon-phone",
        simpletip: unsupported ? null : {
          position: 'top',
          label: l[7205]
        },
        onClick: unsupported ? null : onAnswer
      }, JSX_("span", null, l[7205])), JSX_(meetings_button.A, {
        className: `
                        mega-button
                        large
                        round
                        video
                        ${video ? '' : 'negative'}
                        ${unsupported ? 'disabled' : ''}
                    `,
        icon: video ? 'icon-video-call-filled' : 'icon-video-off',
        simpletip: unsupported ? null : {
          position: 'top',
          label: video ? l[22894] : l[22893]
        },
        onClick: () => unsupported ? null : this.setState({
          video: !video
        }, () => onToggleVideo(video))
      }, JSX_("span", null, video ? l[22894] : l[22893])));
    };
    this.state.unsupported = !megaChat.hasSupportForCalls;
    this.state.hideOverlay = document.body.classList.contains('overlayed') && !$.msgDialog;
  }
  componentDidMount() {
    this._old$dialog = $.dialog;
    $.dialog = "chat-incoming-call";
  }
  componentWillUnmount() {
    $.dialog = this._old$dialog;
  }
  render() {
    const {
      chatRoom
    } = this.props;
    if (chatRoom) {
      const {
        NAMESPACE
      } = Incoming;
      const {
        callerId,
        onClose,
        onReject
      } = this.props;
      const {
        unsupported
      } = this.state;
      const CALL_IN_PROGRESS = window.sfuClient;
      const isPrivateRoom = chatRoom.type === 'private';
      const rejectLabel = isPrivateRoom ? l[20981] : l.msg_dlg_cancel;
      return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
        name: NAMESPACE,
        className: NAMESPACE,
        roomName: chatRoom.getRoomTitle(),
        onClose: () => onClose()
      }), JSX_("div", {
        className: "fm-dialog-body"
      }, JSX_("div", {
        className: `${NAMESPACE}-avatar`
      }, JSX_(contacts.eu, {
        contact: M.u[callerId]
      })), JSX_("div", {
        className: `${NAMESPACE}-info`
      }, JSX_("h1", null, JSX_(ui_utils.zT, null, chatRoom.getRoomTitle())), JSX_("span", null, isPrivateRoom ? l[17878] : l[19995])), JSX_("div", {
        className: `
                                ${NAMESPACE}-controls
                                ${CALL_IN_PROGRESS ? 'call-in-progress' : ''}
                            `
      }, JSX_(meetings_button.A, {
        className: `
                                    mega-button
                                    large
                                    round
                                    negative
                                `,
        icon: "icon-end-call",
        simpletip: {
          position: 'top',
          label: rejectLabel
        },
        onClick: onReject
      }, JSX_("span", null, rejectLabel)), CALL_IN_PROGRESS ? this.renderSwitchControls() : this.renderAnswerControls()), unsupported && JSX_("div", {
        className: `${NAMESPACE}-unsupported`
      }, JSX_("div", {
        className: "unsupported-message"
      }, (0,utils.HV)()))));
    }
    console.error('Incoming dialog received missing chatRoom prop.');
    return null;
  }
}
Incoming.NAMESPACE = 'incoming-dialog';
;// ./js/chat/chat.jsx









window.chatGlobalEventManager = chatGlobalEventManager.r;

mega.ui = mega.ui || {};
mega.ui.chat = mega.ui.chat || {};
mega.ui.chat.getMessageString = messages_utils.d;


const ScheduleMeeting = (0,external_React_.lazy)(() => REQ_.e( 716).then(REQ_.bind(REQ_, 8389)));
const StartMeeting = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 7190)));
const ContactSelectorDialog = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 2678)));
const StartGroupChatWizard = (0,external_React_.lazy)(() => REQ_.e( 543).then(REQ_.bind(REQ_, 5199)));
const CloudBrowserDialog = (0,external_React_.lazy)(() => REQ_.e( 313).then(REQ_.bind(REQ_, 6961)));
window.ChatCallIncomingDialog = (0,chat_utils.li)(Incoming);
window.ScheduleMeetingDialogUI = {
  Schedule: (0,chat_utils.li)(ScheduleMeeting)
};
window.StartMeetingDialogUI = {
  Start: (0,chat_utils.li)(StartMeeting)
};
window.ContactSelectorDialogUI = {
  ContactSelectorDialog: (0,chat_utils.li)(ContactSelectorDialog)
};
window.StartGroupChatDialogUI = {
  StartGroupChatWizard: (0,chat_utils.li)(StartGroupChatWizard)
};
Object.defineProperty(mega, 'CloudBrowserDialog', {
  value: (0,chat_utils.li)(CloudBrowserDialog)
});
const EMOJI_DATASET_VERSION = 5;
const CHAT_ONHISTDECR_RECNT = "onHistoryDecrypted.recent";
const LOAD_ORIGINALS = {
  'image/gif': 25e6,
  'image/png': 2e5,
  'image/webp': 2e5
};
const CHATUIFLAGS_MAPPING = {
  'convPanelCollapse': 'cPC'
};
function Chat() {
  const self = this;
  this.is_initialized = false;
  this.logger = MegaLogger.getLogger("chat");
  this.mbListeners = [];
  this.chats = new MegaDataMap();
  this.scheduledMeetings = new MegaDataMap();
  this.chatUIFlags = new MegaDataMap();
  this.$chatTreePanePs = [];
  this.initChatUIFlagsManagement();
  this.currentlyOpenedChat = null;
  this.currentlyOpenedView = null;
  this.lastOpenedChat = null;
  this.archivedChatsCount = 0;
  this.FORCE_EMAIL_LOADING = localStorage.fel;
  this.WITH_SELF_NOTE = mega.flags.ff_n2s || localStorage.withSelfNote;
  this._imageLoadCache = Object.create(null);
  this._imagesToBeLoaded = Object.create(null);
  this._imageAttributeCache = Object.create(null);
  this._queuedMccPackets = [];
  this._queuedMcsmPackets = {};
  this._queuedMessageUpdates = [];
  this._queuedChatRoomEvents = Object.create(null);
  this.handleToId = Object.create(null);
  this.publicChatKeys = Object.create(null);
  this.SOUNDS = {
    ALERT: 'alert_info_message',
    INCOMING_MSG: 'incoming_chat_message',
    INCOMING_CALL: 'incoming_voice_video_call',
    CALL_JOIN: 'user_join_call',
    CALL_LEFT: 'user_left_call',
    CALL_END: 'end_call',
    CALL_JOIN_WAITING: 'user_join_waiting',
    RECONNECT: 'reconnecting',
    SPEAKER_TEST: 'test_speaker'
  };
  this.options = {
    'delaySendMessageIfRoomNotAvailableTimeout': 3000,
    'plugins': {
      'chatdIntegration': ChatdIntegration,
      'callManager2': CallManager2,
      'urlFilter': UrlFilter,
      'emoticonShortcutsFilter': EmoticonShortcutsFilter,
      'emoticonsFilter': EmoticonsFilter,
      'callFeedback': CallFeedback,
      'presencedIntegration': PresencedIntegration,
      'persistedTypeArea': PersistedTypeArea,
      'btRtfFilter': BacktickRtfFilter,
      'rtfFilter': RtfFilter,
      'richpreviewsFilter': RichpreviewsFilter,
      'chatToastIntegration': ChatToastIntegration,
      'chatStats': ChatStats,
      'geoLocationLinks': GeoLocationLinks,
      meetingsManager,
      'chatOnboarding': ChatOnboarding,
      'userHelper': ChatUserHelper
    },
    'chatNotificationOptions': {
      'textMessages': {
        'incoming-chat-message': {
          title: l.notif_title_incoming_msg,
          'icon' (notificationObj) {
            return notificationObj.options.icon;
          },
          'body' (notificationObj, params) {
            if (params.type === 'private') {
              return l.notif_body_incoming_msg.replace('%s', params.from);
            }
            return l.notif_body_incoming_msg_group.replace('%1', params.from).replace('%2', params.roomTitle);
          }
        },
        'incoming-voice-video-call': {
          'title': l[17878] || "Incoming call",
          'icon' (notificationObj) {
            return notificationObj.options.icon;
          },
          'body' (notificationObj, params) {
            return l[5893].replace('[X]', params.from);
          }
        },
        'screen-share-error': {
          title: l.screenshare_failed_notif || 'You are no longer sharing your screen',
          icon: notificationObj => {
            return notificationObj.options.icon;
          },
          body: ''
        },
        'upcoming-scheduled-occurrence': {
          title: ({
            options
          }) => {
            return options.meeting.title;
          },
          icon: `${staticpath}/images/mega/mega-icon.svg`,
          body: l.notif_body_scheduled_upcoming
        },
        'starting-scheduled-occurrence': {
          title: ({
            options
          }) => {
            return options.meeting.title;
          },
          icon: `${staticpath}/images/mega/mega-icon.svg`,
          body: l.notif_body_scheduled_starting
        }
      },
      sounds: Object.values(this.SOUNDS)
    },
    'chatStoreOptions': {
      'autoPurgeMaxMessagesPerRoom': 1024
    }
  };
  this.SOUNDS.buffers = Object.create(null);
  this.plugins = {};
  self.filePicker = null;
  self._chatsAwaitingAps = {};
  MegaDataObject.call(this, {
    "currentlyOpenedChat": null,
    "activeCall": null,
    'routingSection': null,
    'routingSubSection': null,
    'routingParams': null
  });
  this.routing = new ChatRouting(this);
  Object.defineProperty(this, 'hasSupportForCalls', {
    get () {
      return typeof SfuClient !== 'undefined' && typeof TransformStream !== 'undefined' && window.RTCRtpSender && !!RTCRtpSender.prototype.createEncodedStreams;
    }
  });
  this.minuteClockInterval = setInterval(() => this._syncChats(), 6e4);
  return this;
}
inherits(Chat, MegaDataObject);
Object.defineProperty(Chat, 'mcf', {
  value: Object.create(null)
});
Object.defineProperty(Chat, 'mcsm', {
  value: Object.create(null)
});
Chat.prototype.init = promisify(function (resolve, reject) {
  const self = this;
  if (self.is_initialized) {
    self.destroy();
  }
  if (d) {
    console.time('megachat:plugins:init');
  }
  self.plugins = Object.create(null);
  self.plugins.chatNotifications = new ChatNotifications(self, self.options.chatNotificationOptions);
  self.plugins.chatNotifications.notifications.rebind('onAfterNotificationCreated.megaChat', () => {
    self.updateSectionUnreadCount();
  });
  Object.keys(self.options.plugins).forEach(plugin => {
    self.plugins[plugin] = new self.options.plugins[plugin](self);
  });
  if (d) {
    console.timeEnd('megachat:plugins:init');
  }
  $(document.body);
  if (!is_chatlink) {
    $(mega.ui.header.setStatus).rebind('mousedown.megachat', '.sub-menu.status button', function () {
      const presence = $(this).data("presence");
      self._myPresence = presence;
      const targetPresence = PresencedIntegration.cssClassToPresence(presence);
      self.plugins.presencedIntegration.setPresence(targetPresence);
      if (targetPresence !== UserPresence.PRESENCE.OFFLINE) {
        Object.keys(self.plugins.chatdIntegration.chatd.shards).forEach(k => {
          const v = self.plugins.chatdIntegration.chatd.shards[k];
          v.connectionRetryManager.requiresConnection();
        });
      }
    });
  }
  self.$container = $('.fm-chat-block');
  if (M.chat && !is_chatlink) {
    $('.activity-status-block, .activity-status').removeClass('hidden');
    $('.js-dropdown-account .status-dropdown').removeClass('hidden');
  }
  if (is_chatlink) {
    const {
      ph,
      key
    } = is_chatlink;
    Chat.mcf[ph] = key;
    this.publicChatKeys[ph] = key;
  }
  const promises = [];
  const rooms = Object.keys(Chat.mcf);
  for (let i = rooms.length; i--;) {
    const roomId = rooms[i];
    const room = Chat.mcf[roomId];
    if (!this.publicChatKeys[rooms[i]]) {
      promises.push(self.plugins.chatdIntegration.openChat(room, true));
    }
    delete Chat.mcf[rooms[i]];
  }
  Promise.allSettled(promises).then(res => {
    const pub = Object.keys(this.publicChatKeys);
    return Promise.allSettled([res].concat(pub.map(pch => {
      return this.plugins.chatdIntegration.openChat(pch, true);
    })));
  }).then(res => {
    res = res[0].value.concat(res.slice(1));
    this.logger.info('chats settled...', res);
    if (is_mobile) {
      return;
    }
    if (is_chatlink) {
      const start = document.getElementById('startholder');
      this.flyoutStartHolder = start.querySelector('.flyout-holder') || mCreateElement('div', {
        class: 'flyout-holder'
      }, start);
    }
    const selector = is_chatlink ? '.chat-links-preview > .chat-app-container' : '.section.conversations';
    const rootDOMNode = this.rootDOMNode = document.querySelector(selector);
    const $$root = this.$$root = (0,external_ReactDOM_.createRoot)(rootDOMNode);
    $$root.render(JSX_(conversations.Ay, {
      megaChat: this,
      routingSection: this.routingSection,
      routingSubSection: this.routingSubSection,
      routingParams: this.routingParams
    }));
    this.onChatsHistoryReady().then(() => {
      const room = this.getCurrentRoom();
      if (room) {
        room.scrollToChat();
      }
      return room;
    }).dump('on-chat-history-loaded');
    this.is_initialized = true;
    this.registerUploadListeners();
    this.trigger('onInit');
    mBroadcaster.sendMessage('chat_initialized');
    setInterval(this.removeMessagesByRetentionTime.bind(this, null), 2e4);
    this.autoJoinIfNeeded();
    const scheduledMeetings = Object.values(Chat.mcsm);
    if (scheduledMeetings && scheduledMeetings.length) {
      for (let i = scheduledMeetings.length; i--;) {
        const scheduledMeeting = scheduledMeetings[i];
        this.plugins.meetingsManager.attachMeeting(scheduledMeeting);
        delete Chat.mcsm[scheduledMeeting.id];
      }
    }
    if (notify) {
      notify.countAndShowNewNotifications();
    }
    return true;
  }).then(resolve).catch(reject);
});
Chat.prototype.showUpgradeDialog = function () {
  return is_extension ? msgDialog('warningb', l[1900], l[8841]) : msgDialog('confirmation', l[1900], l[8840], '', cb => cb && location.reload());
};
Chat.prototype._syncChats = function () {
  if (!this.is_initialized) {
    return;
  }
  this.plugins.meetingsManager.checkForNotifications();
  const {
    chats,
    logger
  } = this;
  if (chats && chats.length) {
    chats.forEach(({
      chatId,
      scheduledMeeting
    }) => {
      const dnd = pushNotificationSettings.getDnd(chatId);
      if (dnd && dnd < unixtime()) {
        pushNotificationSettings.disableDnd(chatId);
        if (logger) {
          logger.debug(`Chat.prototype._syncDnd chatId=${chatId}`);
        }
      }
      const {
        isUpcoming,
        chatRoom,
        id
      } = scheduledMeeting || {};
      if (isUpcoming) {
        scheduledMeeting.setNextOccurrence();
        chatRoom.trackDataChange();
        if (logger) {
          logger.debug(`Chat.prototype.__syncScheduledMeetings id=${id} chatId=${chatId}`);
        }
      }
    });
  }
};
Chat.prototype.loadChatUIFlagsFromConfig = function (val) {
  let hadChanged = false;
  let flags = val || mega.config.get("cUIF");
  if (flags) {
    if (typeof flags !== 'object') {
      flags = {};
    }
    Object.keys(CHATUIFLAGS_MAPPING).forEach(k => {
      const v = flags[CHATUIFLAGS_MAPPING[k]];
      hadChanged = v !== undefined && this.chatUIFlags.set(k, v) !== false || hadChanged;
    });
  }
  return hadChanged;
};
Chat.prototype.cleanup = function (clean) {
  const room = this.getCurrentRoom();
  if (room) {
    room.hide();
  }
  M.chat = false;
  this.routingParams = null;
  this.routingSection = null;
  this.routingSubSection = null;
  if (clean) {
    M.currentdirid = page = false;
  }
};
Chat.prototype.initChatUIFlagsManagement = function () {
  const self = this;
  self.loadChatUIFlagsFromConfig();
  this.chatUIFlags.addChangeListener((hashmap, extraArg) => {
    const flags = mega.config.get("cUIF") || {};
    let hadChanged = false;
    let hadLocalChanged = false;
    Object.keys(CHATUIFLAGS_MAPPING).forEach((k) => {
      if (flags[CHATUIFLAGS_MAPPING[k]] !== self.chatUIFlags[k]) {
        if (extraArg === 0xDEAD) {
          self.chatUIFlags._data[k] = flags[CHATUIFLAGS_MAPPING[k]];
          hadLocalChanged = true;
        } else {
          flags[CHATUIFLAGS_MAPPING[k]] = self.chatUIFlags[k];
          hadChanged = true;
        }
      }
    });
    if (hadLocalChanged) {
      if (extraArg !== 0xDEAD) {
        self.chatUIFlags.trackDataChange(0xDEAD);
      }
      $.tresizer();
    }
    if (extraArg === 0xDEAD) {
      return;
    }
    if (hadChanged) {
      mega.config.set("cUIF", flags);
    }
  });
  this.mbListeners.push(mBroadcaster.addListener('fmconfig:cUIF', tryCatch(v => {
    if (self.loadChatUIFlagsFromConfig(v)) {
      self.chatUIFlags.trackDataChange(0xDEAD);
    }
  })), mBroadcaster.addListener('statechange', state => {
    this.trigger('viewstateChange', state);
  }));
};
Chat.prototype.unregisterUploadListeners = function (destroy) {
  'use strict';

  const self = this;
  mBroadcaster.removeListener(self._uplDone);
  mBroadcaster.removeListener(self._uplError);
  mBroadcaster.removeListener(self._uplAbort);
  mBroadcaster.removeListener(self._uplFAError);
  mBroadcaster.removeListener(self._uplFAReady);
  if (destroy) {
    mBroadcaster.removeListener(self._uplStart);
  }
  delete self._uplError;
};
Chat.prototype.registerUploadListeners = function () {
  'use strict';

  const self = this;
  const logger = d && MegaLogger.getLogger('chatUploadListener', false, self.logger);
  self.unregisterUploadListeners(true);
  const forEachChat = function (chats, callback) {
    let result = 0;
    if (!Array.isArray(chats)) {
      chats = [chats];
    }
    for (let i = chats.length; i--;) {
      const room = self.getRoomFromUrlHash(chats[i]);
      if (room) {
        callback(room, ++result);
      }
    }
    return result;
  };
  const lookupPendingUpload = function (id) {
    console.assert((id | 0) > 0 || String(id).length === 8, 'Invalid lookupPendingUpload arguments...');
    for (const uid in ulmanager.ulEventData) {
      if (ulmanager.ulEventData[uid].faid === id || ulmanager.ulEventData[uid].h === id) {
        return uid;
      }
    }
  };
  const unregisterListeners = function () {
    if (!$.len(ulmanager.ulEventData)) {
      self.unregisterUploadListeners();
    }
  };
  const onUploadComplete = function (ul) {
    if (ulmanager.ulEventData[ul && ul.uid]) {
      forEachChat(ul.chat, (room) => {
        if (d) {
          logger.debug('Attaching node[%s] to chat room[%s]...', ul.h, room.chatId, ul.uid, ul, M.d[ul.h]);
        }
        room.attachNodes([ul.h]).catch(dump);
      });
      delete ulmanager.ulEventData[ul.uid];
      unregisterListeners();
    }
  };
  const onUploadCompletion = function (uid, handle, faid, chat) {
    if (!chat) {
      if (d > 1) {
        logger.debug('ignoring upload:completion that is unrelated to chat.', arguments);
      }
      return;
    }
    const n = M.getNodeByHandle(handle);
    const ul = ulmanager.ulEventData[uid] || false;
    if (d) {
      logger.info('upload:completion', uid, handle, faid, ul, n);
    }
    if (!ul) {
      if (d) {
        logger.error('Upload event data store missing...', uid, n, ul);
      }
    } else {
      ul.h = handle;
      if (ul.efa && !n) {
        if (d) {
          logger.error('Invalid state, efa set on deduplication?', ul.efa, ul);
        }
        ul.efa = 0;
      }
      if (ul.efa && (!n.fa || String(n.fa).split('/').length < ul.efa)) {
        ul.faid = faid;
        if (d) {
          logger.info('Waiting for file attribute to arrive.', handle, ul);
        }
      } else {
        onUploadComplete(ul);
      }
    }
  };
  const onUploadError = function (uid, error) {
    const ul = ulmanager.ulEventData[uid];
    if (d) {
      logger.debug(error === -0xDEADBEEF ? 'upload:abort' : 'upload.error', uid, error, [ul]);
    }
    if (ul) {
      delete ulmanager.ulEventData[uid];
      unregisterListeners();
    }
  };
  const onAttributeReady = function (handle, fa) {
    delay(`chat:fa-ready:${  handle}`, () => {
      const uid = lookupPendingUpload(handle);
      const ul = ulmanager.ulEventData[uid] || false;
      if (d) {
        logger.debug('fa:ready', handle, fa, uid, ul);
      }
      if (ul.h && String(fa).split('/').length >= ul.efa) {
        onUploadComplete(ul);
      } else if (d) {
        logger.debug('Not enough file attributes yet, holding...', ul);
      }
    });
  };
  const onAttributeError = function (faid, error, onStorageAPIError, nFAiled) {
    const uid = lookupPendingUpload(faid);
    const ul = ulmanager.ulEventData[uid] || false;
    if (d) {
      logger.debug('fa:error', faid, error, onStorageAPIError, uid, ul, nFAiled, ul.efa);
    }
    if (ul) {
      ul.efa = Math.max(0, ul.efa - nFAiled) | 0;
      if (ul.h) {
        const n = M.getNodeByHandle(ul.h);
        if (!ul.efa || n.fa && String(n.fa).split('/').length >= ul.efa) {
          onUploadComplete(ul);
        }
      }
    }
  };
  const registerLocalListeners = function () {
    self._uplError = mBroadcaster.addListener('upload:error', onUploadError);
    self._uplAbort = mBroadcaster.addListener('upload:abort', onUploadError);
    self._uplFAReady = mBroadcaster.addListener('fa:ready', onAttributeReady);
    self._uplFAError = mBroadcaster.addListener('fa:error', onAttributeError);
    self._uplDone = mBroadcaster.addListener('upload:completion', onUploadCompletion);
  };
  self._uplStart = mBroadcaster.addListener('upload:start', (data) => {
    if (d) {
      logger.info('onUploadStart', [data]);
    }
    const notify = function (room) {
      room.onUploadStart(data);
    };
    for (const k in data) {
      const chats = data[k].chat;
      if (chats && forEachChat(chats, notify) && !self._uplError) {
        registerLocalListeners();
      }
    }
  });
};
Chat.prototype.getRoomFromUrlHash = function (urlHash) {
  if (urlHash.indexOf("#") === 0) {
    urlHash = urlHash.subtr(1, urlHash.length);
  }
  if (urlHash.indexOf("chat/g/") > -1 || urlHash.indexOf("chat/c/") > -1) {
    var foundRoom = null;
    urlHash = urlHash.replace("chat/g/", "").replace("chat/c/", "");
    megaChat.chats.forEach((room) => {
      if (!foundRoom && room.chatId === urlHash) {
        foundRoom = room;
      }
    });
    return foundRoom;
  } else if (urlHash.indexOf("chat/p/") > -1) {
    const contactHash = urlHash.replace("chat/p/", "");
    if (!contactHash) {
      return;
    }
    const chatRoom = this.getPrivateRoom(contactHash);
    return chatRoom;
  } else if (urlHash.indexOf("chat/") > -1 && urlHash[13] === "#") {
    var foundRoom = null;
    const pubHandle = urlHash.replace("chat/", "").split("#")[0];
    urlHash = urlHash.replace("chat/g/", "");
    const chatIds = megaChat.chats.keys();
    for (let i = 0; i < chatIds.length; i++) {
      const cid = chatIds[i];
      const room = megaChat.chats[cid];
      if (room.publicChatHandle === pubHandle) {
        foundRoom = room;
        break;
      }
    }
    return foundRoom;
  } else {
    return null;
  }
};
Chat.prototype.updateSectionUnreadCount = SoonFc(function () {
  if (!this.is_initialized) {
    return;
  }
  let unreadCount = 0;
  const notificationsCount = {
    unreadChats: 0,
    unreadMeetings: 0,
    unreadUpcoming: 0,
    chatsCall: false,
    meetingCall: false
  };
  let havePendingCall = false;
  let haveAdHocMessage = false;
  this.chats.forEach(chatRoom => {
    if (chatRoom.isArchived() || chatRoom.state === ChatRoom.STATE.LEFT) {
      return;
    }
    const unreads = parseInt(chatRoom.messagesBuff.getUnreadCount(), 10);
    unreadCount += unreads;
    if (unreads) {
      notificationsCount[chatRoom.isMeeting ? 'unreadMeetings' : 'unreadChats'] += unreads;
      if (chatRoom.scheduledMeeting && chatRoom.scheduledMeeting.isUpcoming) {
        notificationsCount.unreadUpcoming += unreads;
      }
    }
    if (chatRoom.havePendingCall() && chatRoom.uniqueCallParts && !chatRoom.uniqueCallParts[u_handle]) {
      havePendingCall = true;
      if (chatRoom.isMeeting) {
        notificationsCount.meetingCall = true;
        if (!chatRoom.scheduledMeeting && unreads) {
          haveAdHocMessage = true;
        }
      } else {
        notificationsCount.chatsCall = true;
      }
    }
  });
  unreadCount = unreadCount > 9 ? "9+" : unreadCount;
  if (!is_chatlink && mega.ui.header) {
    if (notificationsCount.unreadChats || notificationsCount.unreadUpcoming || haveAdHocMessage) {
      mega.ui.header.chatsButton.addClass('decorated');
    } else {
      mega.ui.header.chatsButton.removeClass('decorated');
    }
    const phoneIcon = mega.ui.header.domNode.querySelector('.top-chats-call');
    if (phoneIcon) {
      phoneIcon.classList[havePendingCall ? 'remove' : 'add']('hidden');
    }
  }
  if (this._lastUnreadCount !== unreadCount) {
    this._lastUnreadCount = unreadCount;
    notify.updateNotificationIndicator();
  }
  if (!this._lastNotifications || !shallowEqual(this._lastNotifications, notificationsCount)) {
    this._lastNotifications = notificationsCount;
    megaChat.trigger('onUnreadCountUpdate', notificationsCount);
  }
}, 100);
Chat.prototype.dropAllDatabases = promisify(function (resolve, reject) {
  const chatd = this.plugins.chatdIntegration.chatd || false;
  const promises = [];
  if (chatd.chatdPersist) {
    promises.push(chatd.chatdPersist.drop());
  }
  if ('messagesQueueKvStorage' in chatd) {
    promises.push(chatd.messagesQueueKvStorage.destroy());
  }
  if (Reactions.ready) {
    promises.push(Reactions._db.destroy());
  }
  if (PersistedTypeArea.ready) {
    promises.push(PersistedTypeArea._db.destroy());
  }
  Promise.allSettled(promises).then(resolve).catch(reject);
});
Chat.prototype.destroy = function (isLogout) {
  if (!this.is_initialized) {
    return;
  }
  this.isLoggingOut = isLogout;
  for (let i = 0; i < this.mbListeners.length; i++) {
    mBroadcaster.removeListener(this.mbListeners[i]);
  }
  this.unregisterUploadListeners(true);
  this.trigger('onDestroy', [isLogout]);
  tryCatch(() => this.$$root.unmount())();
  this.chats.forEach((chatRoom, chatId) => {
    if (!isLogout) {
      chatRoom.destroy(false, true);
    }
    this.chats.remove(chatId);
  });
  this.is_initialized = false;
  if (this.plugins.chatdIntegration && this.plugins.chatdIntegration.chatd && this.plugins.chatdIntegration.chatd.shards) {
    const {
      shards
    } = this.plugins.chatdIntegration.chatd;
    Object.keys(shards).forEach(shard => shards[shard].connectionRetryManager.options.functions.forceDisconnect());
  }
  for (const pluginName in this.plugins) {
    const plugin = this.plugins[pluginName];
    if (plugin.destroy) {
      plugin.destroy();
    }
  }
  if (this.minuteClockInterval) {
    clearInterval(this.minuteClockInterval);
  }
  if (megaChat.flyoutStartHolder && mega.ui.flyout) {
    mega.ui.flyout.reinit(megaChat.flyoutStartHolder);
    delete megaChat.flyoutStartHolder;
  }
};
Chat.prototype.getContacts = function () {
  const results = [];
  M.u.forEach((k, v) => {
    if (v.c == 1 || v.c == 2) {
      results.push(v);
    }
  });
  return results;
};
Chat.prototype.userPresenceToCssClass = function (presence) {
  if (presence === UserPresence.PRESENCE.ONLINE) {
    return 'online';
  } else if (presence === UserPresence.PRESENCE.AWAY) {
    return 'away';
  } else if (presence === UserPresence.PRESENCE.DND) {
    return 'busy';
  } else if (presence === UserPresence.PRESENCE.OFFLINE) {
    return 'offline';
  } else {
    return 'black';
  }
};
Chat.prototype._renderMyStatus = function () {
  const self = this;
  if (!self.is_initialized) {
    return;
  }
  if (typeof megaChat.userPresence === 'undefined') {
    return;
  }
  const $status = $('.activity-status-block .activity-status', 'body');
  $('.top-user-status-popup .dropdown-item').removeClass("active");
  $status.removeClass('online').removeClass('away').removeClass('busy').removeClass('offline').removeClass('black');
  const actualPresence = self.plugins.presencedIntegration.getMyPresenceSetting();
  const userPresenceConRetMan = megaChat.userPresence.connectionRetryManager;
  const presence = self.plugins.presencedIntegration.getMyPresence();
  let cssClass = PresencedIntegration.presenceToCssClass(presence);
  if (userPresenceConRetMan.getConnectionState() !== ConnectionRetryManager.CONNECTION_STATE.CONNECTED) {
    cssClass = "offline";
  }
  const $activityStatus = $('.activity-text', '.js-topbar');
  if (actualPresence === UserPresence.PRESENCE.ONLINE) {
    $('.top-user-status-popup .dropdown-item[data-presence="chat"]').addClass("active");
    $activityStatus.text(l[5923]);
  } else if (actualPresence === UserPresence.PRESENCE.AWAY) {
    $('.top-user-status-popup .dropdown-item[data-presence="away"]').addClass("active");
    $activityStatus.text(l[5924]);
  } else if (actualPresence === UserPresence.PRESENCE.DND) {
    $('.top-user-status-popup .dropdown-item[data-presence="dnd"]').addClass("active");
    $activityStatus.text(l[5925]);
  } else if (actualPresence === UserPresence.PRESENCE.OFFLINE) {
    $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
    $activityStatus.text(l[5926]);
  } else {
    $('.top-user-status-popup .dropdown-item[data-presence="unavailable"]').addClass("active");
    $activityStatus.text(l[5926]);
  }
  $status.addClass(cssClass);
  if (userPresenceConRetMan.getConnectionState() === ConnectionRetryManager.CONNECTION_STATE.CONNECTING) {
    $status.parent().addClass("fadeinout");
  } else {
    $status.parent().removeClass("fadeinout");
  }
};
Chat.prototype.renderMyStatus = SoonFc(Chat.prototype._renderMyStatus, 100);
Chat.prototype.openChat = function (userHandles, type, chatId, chatShard, chatdUrl, setAsActive, chatHandle, publicChatKey, ck, isMeeting, mcoFlags, organiser) {
  const self = this;
  let room = false;
  type = type || "private";
  setAsActive = setAsActive === true;
  let roomId = chatId;
  if (!publicChatKey && chatHandle && self.publicChatKeys[chatHandle]) {
    if (type !== "public") {
      console.error("this should never happen.", type);
      type = "public";
    }
    publicChatKey = self.publicChatKeys[chatHandle];
  }
  const $promise = new MegaPromise();
  if (type === "private") {
    this.initContacts(userHandles, 2);
    roomId = userHandles.length > 1 ? array.one(userHandles, u_handle) : u_handle;
    if (self.chats[roomId]) {
      $promise.resolve(roomId, self.chats[roomId]);
      return [roomId, self.chats[roomId], $promise];
    }
  } else {
    assert(roomId, 'Tried to create a group chat, without passing the chatId.');
    roomId = chatId;
  }
  if (type === "group" || type === "public") {
    if (d) {
      console.time(`openchat:${  chatId  }.${  type}`);
    }
    const newUsers = this.initContacts(userHandles);
    if (newUsers.length) {
      const chats = self.chats._data;
      if (d) {
        console.debug('openchat:%s.%s: processing %s new users...', chatId, type, newUsers.length);
      }
      for (const k in chats) {
        const chatRoom = self.chats[k];
        const participants = array.to.object(chatRoom.getParticipantsExceptMe());
        for (let j = newUsers.length; j--;) {
          const u = newUsers[j];
          if (participants[u]) {
            chatRoom.trackDataChange();
            break;
          }
        }
      }
      self.renderMyStatus();
    }
    if (d) {
      console.timeEnd(`openchat:${  chatId  }.${  type}`);
    }
    if (type === "group") {
      ChatdIntegration._ensureKeysAreLoaded([], userHandles, chatHandle).catch(dump);
    }
    ChatdIntegration._ensureContactExists(userHandles, chatHandle);
  }
  if (self.chats[roomId]) {
    room = self.chats[roomId];
    if (setAsActive) {
      room.show();
    }
    $promise.resolve(roomId, room);
    return [roomId, room, $promise];
  }
  if (setAsActive && self.currentlyOpenedChat && self.currentlyOpenedChat !== roomId) {
    self.hideChat(self.currentlyOpenedChat);
    self.currentlyOpenedChat = null;
  }
  room = new ChatRoom(self, roomId, type, userHandles, unixtime(), undefined, chatId, chatShard, chatdUrl, null, chatHandle, publicChatKey, ck, isMeeting, 0, mcoFlags, organiser);
  self.chats.set(room.roomId, room);
  if (setAsActive && !self.currentlyOpenedChat || self.currentlyOpenedChat === room.roomId) {
    room.setActive();
  }
  room.showAfterCreation = setAsActive !== false;
  return [roomId, room, new Promise((resolve, reject) => {
    this.trigger('onRoomInitialized', [room, resolve, reject]);
    room.setState(ChatRoom.STATE.JOINING);
    const q = this._queuedChatRoomEvents[chatId];
    if (q) {
      delete this._queuedChatRoomEvents[chatId];
      for (let i = 0; i < q.length; ++i) {
        const [event, data] = q[i];
        if (d) {
          this.logger.debug(`Dispatching deferred event '${event}'`, data);
        }
        room.trigger(event, data);
      }
      q.timer.abort();
    }
    this.processQueuedMcsmPackets();
  })];
};
Chat.prototype.initContacts = function (userHandles, c) {
  const newUsers = [];
  for (let i = userHandles.length; i--;) {
    const u = userHandles[i];
    const e = u in M.u;
    M.addUser(e ? {
      u
    } : {
      u,
      c
    }, e || !newUsers.push(u));
  }
  return newUsers;
};
Chat.prototype.smartOpenChat = function (...args) {
  const self = this;
  if (typeof args[0] === 'string') {
    args[0] = [u_handle, args[0]];
    if (args.length < 2) {
      args.push('private');
    }
  }
  return new Promise((resolve, reject) => {
    const waitForReadyState = function (aRoom, aShow) {
      const verify = function () {
        return aRoom.state === ChatRoom.STATE.READY;
      };
      const ready = function () {
        if (aShow) {
          aRoom.show();
        }
        resolve(aRoom);
      };
      if (verify()) {
        return ready();
      }
      const {
        roomId
      } = aRoom;
      createTimeoutPromise(verify, 300, 3e4, false, `waitForReadyState(${roomId})`).then(ready).catch(reject);
    };
    const [members, type] = args;
    if (members.length === 2 && type === 'private') {
      const chatRoom = self.chats[members.every(h => h === members[0]) ? u_handle : array.one(members, u_handle)];
      if (chatRoom) {
        if (args[5]) {
          chatRoom.show();
        }
        return waitForReadyState(chatRoom, args[5]);
      }
    }
    const result = self.openChat.apply(self, args);
    if (result instanceof MegaPromise) {
      result.then(reject).catch(reject);
    } else if (!Array.isArray(result)) {
      reject(EINTERNAL);
    } else {
      const room = result[1];
      const roomId = result[0];
      const promise = result[2];
      if (!(promise instanceof Promise)) {
        self.logger.error('Unexpected openChat() response...');
        return reject(EINTERNAL);
      }
      self.logger.debug('Waiting for chat "%s" to be ready...', roomId, [room]);
      promise.then(aRoom => {
        const aRoomId = aRoom && aRoom.roomId;
        if (aRoomId !== roomId || room && room !== aRoom || !(aRoom instanceof ChatRoom)) {
          self.logger.error('Unexpected openChat() procedure...', aRoomId, [aRoom]);
          return reject(EINTERNAL);
        }
        waitForReadyState(aRoom);
      }).catch(ex => {
        if (ex === EACCESS) {
          room.destroy();
        }
        reject(ex);
      });
    }
  });
};
Chat.prototype.hideAllChats = function () {
  const self = this;
  self.chats.forEach(chatRoom => {
    if (chatRoom.isCurrentlyActive) {
      chatRoom.hide();
    }
  });
};
Chat.prototype.retrieveSharedFilesHistory = async function (len = 47, chatRoom = null) {
  chatRoom = len instanceof ChatRoom ? len : chatRoom || this.getCurrentRoom();
  return chatRoom.messagesBuff.retrieveSharedFilesHistory(len);
};
Chat.prototype.getCurrentRoom = function () {
  return this.chats[this.currentlyOpenedChat];
};
Chat.prototype.getCurrentMeeting = function () {
  const chatRoom = this.getCurrentRoom();
  return chatRoom && chatRoom.scheduledMeeting || null;
};
Chat.prototype.getCurrentRoomJid = function () {
  return this.currentlyOpenedChat;
};
Chat.prototype.hideChat = function (roomJid) {
  const self = this;
  const room = self.chats[roomJid];
  if (room) {
    room.hide();
  } else {
    self.logger.warn("Room not found: ", roomJid);
  }
};
Chat.prototype.sendMessage = function (roomJid, val) {
  const fail = ex => {
    this.logger.error(`sendMessage(${roomJid}) failed.`, ex);
  };
  if (!this.chats[roomJid]) {
    this.logger.warn("Queueing message for room: ", roomJid, val);
    const timeout = this.options.delaySendMessageIfRoomNotAvailableTimeout;
    return createTimeoutPromise(() => !!this.chats[roomJid], 500, timeout).then(() => {
      return this.chats[roomJid].sendMessage(val);
    }).catch(fail);
  }
  return this.chats[roomJid].sendMessage(val).catch(fail);
};
Chat.prototype.processNewUser = function (u, isNewChat) {
  const self = this;
  if (self.plugins.presencedIntegration) {
    const user = M.u[u] || false;
    if (user.c === 1) {
      self.plugins.presencedIntegration.addContact(u, isNewChat);
    }
  }
  self.chats.forEach((chatRoom) => {
    if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
      chatRoom.trackDataChange();
    }
  });
  self.renderMyStatus();
};
Chat.prototype.processRemovedUser = function (u) {
  const self = this;
  if (self.plugins.presencedIntegration) {
    self.plugins.presencedIntegration.removeContact(u);
  }
  self.chats.forEach((chatRoom) => {
    if (chatRoom.getParticipantsExceptMe().indexOf(u) > -1) {
      chatRoom.trackDataChange();
    }
  });
  self.renderMyStatus();
};
Chat.prototype.refreshConversations = function () {
  const self = this;
  if (!u_type && !self.$container && !megaChatIsReady) {
    $('.fm-chat-block').hide();
    return false;
  }
  $('.section.conversations .fm-chat-is-loading').addClass('hidden');
  if (self.$container.parent('.section.conversations .fm-right-files-block').length == 0) {
    $('.section.conversations .fm-right-files-block').append(self.$container);
  }
  self.$leftPane = self.$leftPane || $('.conversationsApp .fm-left-panel');
  if (is_chatlink || megaChat._joinDialogIsShown) {
    self.$leftPane.addClass('hidden');
  } else {
    self.$leftPane.removeClass('hidden');
  }
};
Chat.prototype.navigate = function megaChatNavigate(location, event, isLandingPage) {
  return new Promise((resolve, reject) => {
    this.routing.route(resolve, reject, location, event, isLandingPage);
  });
};
if (is_mobile) {
  Chat.prototype.navigate = function (location, event, isLandingPage) {
    if (d) {
      this.logger.warn('mobile-nop navigate(%s)', location, event, isLandingPage);
    }
    if (is_chatlink) {
      mobile.chatlink.show(is_chatlink.ph, is_chatlink.key);
    } else {
      loadSubPage('fm', event);
    }
    return Promise.resolve();
  };
}
Chat.prototype.renderListing = async function megaChatRenderListing(location, isInitial) {
  if (!isInitial && !M.chat) {
    console.debug('renderListing: Not in chat.');
    throw EACCESS;
  }
  M.hideEmptyGrids();
  this.refreshConversations();
  this.hideAllChats();
  if (!is_chatlink && mega.ui.flyout && (mega.ui.flyout.name.startsWith('contact') || mega.ui.flyout.name === 'chat')) {
    mega.ui.flyout.hide();
  }
  $('.files-grid-view').addClass('hidden');
  $('.fm-blocks-view').addClass('hidden');
  $('.fm-chat-block').addClass('hidden');
  $('.fm-right-files-block').addClass('hidden');
  $('.fm-right-files-block.in-chat').removeClass('hidden');
  $('.nw-conversations-item').removeClass('selected');
  $('.fm-empty-conversations').removeClass('hidden');
  M.onSectionUIOpen('conversations');
  let room;
  if (!location && this.chats.length) {
    const valid = room => room && room._leaving !== true && !room.isNote && room.isDisplayable() && room;
    room = valid(this.chats[this.lastOpenedChat]);
    if (!room) {
      let idx = 0;
      const rooms = Object.values(this.chats).filter(r => this.currentlyOpenedView === null || r.isMeeting === !!this.currentlyOpenedView).sort(M.sortObjFn('lastActivity', -1));
      do {
        room = valid(rooms[idx]);
      } while (!room && ++idx < rooms.length);
    }
    if (room) {
      location = room.getRoomUrl();
    }
  }
  if (location) {
    $('.fm-empty-conversations').addClass('hidden');
    return this.navigate(location, undefined, isInitial).catch(ex => {
      if (d) {
        this.logger.warn('Failed to navigate to %s...', location, room, ex);
      }
      if (!room) {
        return this.renderListing(null);
      }
      onIdle(() => {
        room.destroy();
      });
      throw ex;
    });
  }
  return ENOENT;
};
Chat.prototype.setAttachments = function (roomId) {
  'use strict';

  if (M.chat) {
    if (d) {
      console.assert(this.chats[roomId] && this.chats[roomId].isCurrentlyActive, 'check this...');
    }
    M.v = Object.values(M.chc[roomId] || {});
    if (M.v.length) {
      let _this$chats$roomId;
      const sv = (_this$chats$roomId = this.chats[roomId]) == null || (_this$chats$roomId = _this$chats$roomId.messagesBuff) == null || (_this$chats$roomId = _this$chats$roomId.sharedFiles) == null ? void 0 : _this$chats$roomId._sortedVals;
      if (sv && sv.length === M.v.length) {
        M.v.sort((a, b) => sv.indexOf(a.m) - sv.indexOf(b.m));
      } else {
        if (d) {
          this.logger.info('falling back to order-value sorting.', sv);
        }
        M.v.sort(M.sortObjFn('co'));
      }
      for (let i = M.v.length; i--;) {
        const n = M.v[i];
        if (!n.revoked && !n.seen) {
          n.seen = -1;
          if (String(n.fa).indexOf(':1*') > 0) {
            this._enqueueImageLoad(n);
          }
        }
      }
      if ($.triggerSlideShow) {
        delay('chat:refresh-slideshow-on-single-entry', () => {
          const {
            slideshowid: id
          } = window;
          if (id && $.triggerSlideShow === id) {
            slideshow(id);
          }
          delete $.triggerSlideShow;
        });
      }
    }
  } else if (d) {
    console.warn('Not in chat...');
  }
};
Chat.prototype._enqueueMessageUpdate = function (message) {
  this._queuedMessageUpdates.push(message);
  delay('chat:enqueue-message-updates', () => {
    const queue = this._queuedMessageUpdates;
    this._queuedMessageUpdates = [];
    for (let i = queue.length; i--;) {
      queue[i].trackDataChange();
    }
  }, 400);
};
Chat.prototype._enqueueImageLoad = function (n) {
  'use strict';
  let cc = previews[n.h] || previews[n.hash];
  if (cc) {
    if (cc.poster) {
      n.src = cc.poster;
    } else {
      if (cc.full && n.mime !== 'image/png' && n.mime !== 'image/webp') {
        cc = cc.prev || false;
      }
      if (String(cc.type).startsWith('image/')) {
        n.src = cc.src;
      }
    }
  }
  let cached = n.src;
  if (String(n.fa).indexOf(':1*') > 0) {
    let load = false;
    let dedup = true;
    if (this._imageAttributeCache[n.fa]) {
      this._imageAttributeCache[n.fa].push(n.ch);
    } else {
      this._imageAttributeCache[n.fa] = [n.ch];
      load = !cached;
    }
    if (this._imageLoadCache[n.fa]) {
      this._imageLoadCache[n.fa].push(n.ch);
    } else {
      this._imageLoadCache[n.fa] = [n.ch];
      if (load) {
        this._imagesToBeLoaded[n.fa] = n;
        dedup = false;
      }
    }
    if (dedup) {
      cached = true;
    } else {
      delay('chat:enqueue-image-load', this._doLoadImages.bind(this), 350);
    }
  }
  if (cached) {
    this._doneLoadingImage(n.fa);
  }
};
Chat.prototype._doLoadImages = function () {
  "use strict";

  const self = this;
  const originals = Object.create(null);
  let imagesToBeLoaded = self._imagesToBeLoaded;
  self._imagesToBeLoaded = Object.create(null);
  const chatImageParser = function (h, data) {
    const n = M.chd[(self._imageLoadCache[h] || [])[0]] || false;
    if (n && data !== 0xDEAD) {
      n.src = mObjectURL([data.buffer || data], 'image/jpeg');
      n.srcBuffer = data;
    } else if (d) {
      console.warn('Failed to load image for %s', h, n);
    }
    self._doneLoadingImage(h);
  };
  for (const k in imagesToBeLoaded) {
    const node = imagesToBeLoaded[k];
    const mime = filemime(node);
    if (node.s < LOAD_ORIGINALS[mime]) {
      originals[node.fa] = node;
      delete imagesToBeLoaded[k];
    }
  }
  const onSuccess = function (ctx, origNodeHandle, data) {
    chatImageParser(origNodeHandle, data);
  };
  const onError = function (origNodeHandle) {
    chatImageParser(origNodeHandle, 0xDEAD);
  };
  const loadOriginal = function (n) {
    const origFallback = ex => {
      const type = String(n.fa).indexOf(':1*') > 0 ? 1 : 0;
      if (d) {
        console.debug('Failed to load original image on chat.', n.h, n, ex);
      }
      imagesToBeLoaded[n.fa] = originals[n.fa];
      delete originals[n.fa];
      delay(`ChatRoom[${  self.roomId  }]:origFallback${  type}`, () => {
        api_getfileattr(imagesToBeLoaded, type, onSuccess, onError);
      });
    };
    M.gfsfetch(n.h, 0, -1).then((data) => {
      const handler = is_image(n);
      if (typeof handler === 'function') {
        handler(data, buffer => {
          if (buffer) {
            chatImageParser(n.fa, buffer);
          } else {
            origFallback(EFAILED);
          }
        });
      } else {
        chatImageParser(n.fa, data);
      }
    }).catch(origFallback);
  };
  if ($.len(originals)) {
    Object.values(originals).map(loadOriginal);
  }
  api_getfileattr(imagesToBeLoaded, 1, onSuccess, onError);
  [imagesToBeLoaded, originals].forEach((obj) => {
    Object.keys(obj).forEach((handle) => {
      self._startedLoadingImage(handle);
    });
  });
  imagesToBeLoaded = Object.create(null);
};
Chat.prototype._getImageNodes = function (h, src) {
  let nodes = this._imageLoadCache[h] || [];
  let handles = [].concat(nodes);
  for (let i = nodes.length; i--;) {
    const n = M.chd[nodes[i]] || false;
    if (this._imageAttributeCache[n.fa]) {
      handles = handles.concat(this._imageAttributeCache[n.fa]);
    }
  }
  handles = array.unique(handles);
  nodes = handles.map((ch) => {
    const n = M.chd[ch] || false;
    if (src && n.src) {
      Object.assign(src, n);
    }
    return n;
  });
  return nodes;
};
Chat.prototype._startedLoadingImage = function (h) {
  "use strict";

  const nodes = this._getImageNodes(h);
  for (let i = nodes.length; i--;) {
    const n = nodes[i];
    if (!n.src && n.seen !== 2) {
      let imgNode = document.getElementById(n.ch);
      if (imgNode && (imgNode = imgNode.querySelector('img'))) {
        imgNode.parentNode.parentNode.classList.add('thumb-loading');
      }
    }
  }
};
Chat.prototype._doneLoadingImage = function (h) {
  const self = this;
  const setSource = function (n, img, src) {
    const message = n.mo;
    img.onload = function () {
      img.onload = null;
      n.srcWidth = this.naturalWidth;
      n.srcHeight = this.naturalHeight;
      if (message) {
        self._enqueueMessageUpdate(message);
      }
    };
    img.setAttribute('src', src);
  };
  const root = {};
  const nodes = this._getImageNodes(h, root);
  const {src} = root;
  for (let i = nodes.length; i--;) {
    const n = nodes[i];
    let imgNode = document.getElementById(n.ch);
    if (imgNode && (imgNode = imgNode.querySelector('img'))) {
      const parent = imgNode.parentNode;
      const container = parent.parentNode;
      if (src) {
        container.classList.add('thumb');
        parent.classList.remove('no-thumb');
      } else {
        container.classList.add('thumb-failed');
      }
      n.seen = 2;
      container.classList.remove('thumb-loading');
      setSource(n, imgNode, src || window.noThumbURI || '');
    }
    if (src) {
      n.src = src;
      if (root.srcBuffer && root.srcBuffer.byteLength) {
        n.srcBuffer = root.srcBuffer;
      }
      if (n.srcBuffer && !previews[n.h] && is_image3(n)) {
        preqs[n.h] = 1;
        previewimg(n.h, n.srcBuffer, 'image/jpeg');
        previews[n.h].fromChat = Date.now();
      }
    }
    delete n.mo;
  }
  if (src) {
    mBroadcaster.sendMessage('chat_image_preview');
  }
};
Chat.prototype.onChatsHistoryReady = promisify(function (resolve, reject, timeout) {
  if (this.allChatsHadInitialLoadedHistory()) {
    return resolve();
  }
  let timer = null;
  const {chatd} = this.plugins.chatdIntegration;
  const eventName = `onMessagesHistoryDone.ochr${  makeid(16)}`;
  const ready = () => {
    queueMicrotask(resolve);
    chatd.off(eventName);
    if (timer) {
      timer.abort();
      timer = null;
    }
  };
  chatd.on(eventName, () => {
    if (this.allChatsHadInitialLoadedHistory()) {
      ready();
    }
  });
  if (timeout > 0) {
    (timer = tSleep(timeout / 1e3)).then(ready);
  }
});
Chat.prototype.allChatsHadLoadedHistory = function () {
  const chatIds = this.chats.keys();
  for (let i = chatIds.length; i--;) {
    const room = this.chats[chatIds[i]];
    if (room.isLoading()) {
      return false;
    }
  }
  return true;
};
Chat.prototype.allChatsHadInitialLoadedHistory = function () {
  const self = this;
  const chatIds = self.chats.keys();
  for (let i = chatIds.length; i--;) {
    const room = self.chats[chatIds[i]];
    if (room.chatId && room.initialMessageHistLoaded === false) {
      return false;
    }
  }
  return true;
};
Chat.prototype.getPrivateRoom = function (h) {
  'use strict';

  return this.chats[h] || false;
};
Chat.prototype.createAndShowPrivateRoom = promisify(function (resolve, reject, h) {
  M.openFolder(`chat/p/${  h}`).then(() => {
    const room = this.getPrivateRoom(h);
    assert(room, 'room not found..');
    resolve(room);
  }).catch(reject);
});
Chat.prototype.createAndShowGroupRoomFor = function (contactHashes, topic = '', opts = {}) {
  this.trigger('onNewGroupChatRequest', [contactHashes, {
    topic,
    ...opts
  }]);
};
Chat.prototype.createAndStartMeeting = function (topic, audio, video) {
  megaChat.createAndShowGroupRoomFor([], topic, {
    keyRotation: false,
    createChatLink: true,
    isMeeting: true
  });
  megaChat.rebind('onRoomInitialized.meetingCreate', (e, room) => {
    room.rebind('onNewMeetingReady.meetingCreate', () => {
      room.startCall(audio, video);
    });
  });
};
Chat.prototype._destroyAllChatsFromChatd = function () {
  const self = this;
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).then(r => {
    r.c.forEach((chatRoomMeta) => {
      if (chatRoomMeta.g === 1) {
        chatRoomMeta.u.forEach((u) => {
          if (u.u !== u_handle) {
            api_req({
              a: 'mcr',
              id: chatRoomMeta.id,
              u: u.u,
              v: Chatd.VERSION
            });
          }
        });
        api_req({
          a: 'mcr',
          id: chatRoomMeta.id,
          u: u_handle,
          v: Chatd.VERSION
        });
      }
    });
  });
};
Chat.prototype._leaveAllGroupChats = function () {
  asyncApiReq({
    'a': 'mcf',
    'v': Chatd.VERSION
  }).then(r => {
    r.c.forEach((chatRoomMeta) => {
      if (chatRoomMeta.g === 1) {
        asyncApiReq({
          "a": "mcr",
          "id": chatRoomMeta.id,
          "v": Chatd.VERSION
        });
      }
    });
  });
};
Chat.prototype.getEmojiDataSet = async function (name) {
  assert(name === "categories" || name === "emojis", "Invalid emoji dataset name passed.");
  if (!this._emojiDataLoading) {
    this._emojiDataLoading = Object.create(null);
  }
  if (!this._emojiData) {
    this._emojiData = {
      'emojisUtf': Object.create(null),
      'emojisSlug': Object.create(null)
    };
  }
  if (this._emojiData[name]) {
    return this._emojiData[name];
  }
  if (this._emojiDataLoading[name]) {
    return this._emojiDataLoading[name];
  }
  if (name === "categories") {
    this._emojiData[name] = ["people", "nature", "food", "activity", "travel", "objects", "symbols", "flags"];
    return this._emojiData[name];
  }
  const {
    promise
  } = mega;
  this._emojiDataLoading[name] = promise;
  M.xhr({
    type: 'json',
    url: `${staticpath}js/chat/emojidata/${name}_v${EMOJI_DATASET_VERSION}.json`
  }).then((ev, data) => {
    if (!data) {
      promise.reject(EFAILED);
      return;
    }
    this._emojiData[name] = data;
    delete this._emojiDataLoading[name];
    if (name === "emojis") {
      this._mapEmojisToAliases();
    }
    promise.resolve(data);
  }).catch((ex, error) => {
    if (d) {
      this.logger.warn('Failed to load emoji data "%s": %s', name, error, [ex]);
    }
    delete this._emojiDataLoading[name];
    promise.reject(error || ex);
  });
  return promise;
};
Chat.prototype._mapEmojisToAliases = function () {
  const {
    emojis
  } = this._emojiData;
  if (emojis) {
    this._emojiData.emojisUtf = Object.create(null);
    this._emojiData.emojisSlug = Object.create(null);
    for (let i = emojis.length; i--;) {
      const emoji = emojis[i];
      this._emojiData.emojisUtf[emoji.u] = emoji;
      this._emojiData.emojisSlug[emoji.n] = emoji;
    }
  }
};
Chat.prototype.isValidEmojiSlug = function (slug) {
  const self = this;
  const emojiData = self._emojiData.emojis;
  if (!emojiData) {
    self.getEmojiDataSet('emojis');
    return false;
  }
  for (let i = 0; i < emojiData.length; i++) {
    if (emojiData[i].n === slug) {
      return true;
    }
  }
};
Chat.prototype.getPresence = function (user_handle) {
  if (user_handle && this.plugins.presencedIntegration) {
    return this.plugins.presencedIntegration.getPresence(user_handle);
  }
};
Chat.prototype.getPresenceAsCssClass = function (user_handle) {
  const presence = this.getPresence(user_handle);
  return this.presenceStringToCssClass(presence);
};
Chat.prototype.presenceStringToCssClass = function (presence) {
  if (presence === UserPresence.PRESENCE.ONLINE) {
    return 'online';
  } else if (presence === UserPresence.PRESENCE.AWAY) {
    return 'away';
  } else if (presence === UserPresence.PRESENCE.DND) {
    return 'busy';
  } else if (!presence || presence === UserPresence.PRESENCE.OFFLINE) {
    return 'offline';
  } else {
    return 'black';
  }
};
Chat.prototype.generateTempMessageId = function (roomId, messageAndMeta) {
  let messageIdHash = u_handle + roomId;
  if (messageAndMeta) {
    messageIdHash += messageAndMeta;
  }
  return `m${  fastHashFunction(messageIdHash)  }_${  unixtime()}`;
};
Chat.prototype.getChatById = function (chatdId) {
  const self = this;
  if (self.chats[chatdId]) {
    return self.chats[chatdId];
  } else if (self.chatIdToRoomId && self.chatIdToRoomId[chatdId] && self.chats[self.chatIdToRoomId[chatdId]]) {
    return self.chats[self.chatIdToRoomId[chatdId]];
  }
  if (this.chats[this.handleToId[chatdId]]) {
    return this.chats[this.handleToId[chatdId]];
  }
  let found = false;
  self.chats.forEach((chatRoom) => {
    if (!found && chatRoom.chatId === chatdId) {
      found = chatRoom;
      return false;
    }
  });
  return found;
};
Chat.prototype.getNoteChat = function () {
  return Object.values(this.chats).find(c => c.isNote);
};
Chat.prototype.getMessageByMessageId = async function (chatId, messageId) {
  const chatRoom = this.getChatById(chatId);
  const msg = chatRoom.messagesBuff.getMessageById(messageId);
  if (msg) {
    return msg;
  }
  const {
    chatdPersist
  } = this.plugins.chatdIntegration.chatd;
  if (chatdPersist) {
    const [msg] = await chatdPersist.getMessageByMessageId(chatId, messageId).catch(dump) || [];
    if (msg) {
      return Message.fromPersistableObject(chatRoom, msg);
    }
  }
  if (d) {
    this.logger.debug('getMessageByMessageId: Cannot find %s on %s', messageId, chatId);
  }
  return Promise.reject(ENOENT);
};
Chat.prototype.haveAnyActiveCall = function () {
  const self = this;
  const chatIds = self.chats.keys();
  for (let i = 0; i < chatIds.length; i++) {
    if (self.chats[chatIds[i]].haveActiveCall()) {
      return true;
    }
  }
  return false;
};
Chat.prototype.haveAnyOnHoldCall = function () {
  const self = this;
  const chatIds = self.chats.keys();
  for (let i = 0; i < chatIds.length; i++) {
    if (self.chats[chatIds[i]].haveActiveOnHoldCall()) {
      return true;
    }
  }
  return false;
};
Chat.prototype.openChatAndSendFilesDialog = function (user_handle) {
  'use strict';

  this.smartOpenChat(user_handle).then((room) => {
    if (room.$rConversationPanel && room.$rConversationPanel.isMounted()) {
      room.trigger('openSendFilesDialog');
    } else {
      room.one('onComponentDidMount.sendFilesDialog', () => {
        onIdle(() => room.trigger('openSendFilesDialog'));
      });
    }
    room.setActive();
  }).catch(this.logger.error.bind(this.logger));
};
Chat.prototype.openChatAndAttachNodes = async function (targets, nodes, silent) {
  const promises = [];
  if (d) {
    console.group('Attaching nodes to chat room(s)...', targets, nodes);
  }
  const attachNodes = roomId => this.smartOpenChat(roomId).then(room => {
    return room.attachNodes(nodes).then(res => {
      if (res !== EBLOCKED && res !== ENOENT) {
        return room;
      }
    });
  }).catch(ex => {
    if (d) {
      this.logger.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId, ex);
    }
    throw ex;
  });
  if (!Array.isArray(targets)) {
    targets = [targets];
  }
  for (let i = targets.length; i--;) {
    promises.push(attachNodes(targets[i]));
  }
  const result = (await Promise.allSettled(promises)).map(e => e.value).filter(Boolean);
  let folderCount = 0;
  let fileCount = 0;
  for (let i = nodes.length; i--;) {
    const {
      t
    } = M.getNodeByHandle(nodes[i]) || {};
    if (t === 1) {
      folderCount++;
    } else {
      fileCount++;
    }
  }
  let message = mega.icu.format(l.toast_send_chat_items, nodes.length);
  if (fileCount === 0 && folderCount) {
    message = mega.icu.format(l.toast_send_chat_folders, folderCount);
  } else if (folderCount === 0 && fileCount) {
    message = mega.icu.format(l.toast_send_chat_files, fileCount);
  }
  for (let i = result.length; i--;) {
    if (result[i] instanceof ChatRoom) {
      const room = result[i];
      mega.ui.toast.show(message);
      if (!silent) {
        await M.openFolder(room.getRoomUrl().replace('fm/', '')).catch(dump);
      }
      break;
    }
  }
  if (d) {
    console.groupEnd();
  }
  return result;
};
Chat.prototype.toggleUIFlag = function (name) {
  this.chatUIFlags.set(name, this.chatUIFlags[name] ? 0 : 1);
};
Chat.prototype.onSnActionPacketReceived = function () {
  if (this._queuedMccPackets.length > 0) {
    const aps = this._queuedMccPackets;
    this._queuedMccPackets = [];
    for (let i = 0; i < aps.length; i++) {
      mBroadcaster.sendMessage('onChatdChatUpdatedActionPacket', aps[i]);
    }
  }
  this.processQueuedMcsmPackets();
};
Chat.prototype.processQueuedMcsmPackets = function () {
  const aps = Object.values(this._queuedMcsmPackets);
  if (aps.length) {
    for (let i = 0; i < aps.length; i++) {
      const ap = aps[i];
      const {
        type,
        data
      } = ap;
      const {
        meetingsManager
      } = this.plugins;
      if (type === 'mcsmp') {
        const chatRoom = this.getChatById(data.cid);
        if (chatRoom) {
          const scheduledMeeting = meetingsManager.attachMeeting(data, true);
          delete this._queuedMcsmPackets[scheduledMeeting.id];
          return scheduledMeeting.iAmOwner ? null : notify.notifyFromActionPacket({
            ...data,
            a: type
          });
        }
      }
      if (type === 'mcsmr') {
        meetingsManager.detachMeeting(data);
        delete this._queuedMcsmPackets[data.id];
      }
    }
  }
};
Chat.prototype.getFrequentContacts = function () {
  if (Chat._frequentsCache) {
    return Chat._frequentsCache;
  }
  const {chats} = this;
  const recentContacts = {};
  const promises = [];
  const finishedLoadingChats = {};
  const loadingMoreChats = {};
  const _calculateLastTsFor = function (r, maxMessages) {
    const mb = r.messagesBuff;
    const len = mb.messages.length;
    const msgs = mb.messages.slice(Math.max(0, len - maxMessages), len);
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      let contactHandle = msg.userId === mega.BID && msg.meta ? msg.meta.userId : msg.userId;
      if (r.type === "private" && contactHandle === u_handle) {
        contactHandle = contactHandle || r.getParticipantsExceptMe()[0];
      }
      if (contactHandle !== mega.BID && contactHandle !== strongvelope.COMMANDER && contactHandle in M.u && M.u[contactHandle].c === 1 && contactHandle !== u_handle) {
        if (!recentContacts[contactHandle] || recentContacts[contactHandle].ts < msg.delay) {
          recentContacts[contactHandle] = {
            'userId': contactHandle,
            'ts': msg.delay
          };
        }
      }
    }
  };
  const _histDecryptedCb = function () {
    const mb = this.messagesBuff;
    if (!loadingMoreChats[this.chatId] && mb.messages.length < 32 && mb.haveMoreHistory()) {
      loadingMoreChats[this.chatId] = true;
      mb.retrieveChatHistory(false);
    } else {
      this.unbind(CHAT_ONHISTDECR_RECNT);
      _calculateLastTsFor(this, 32);
      delete loadingMoreChats[this.chatId];
      finishedLoadingChats[this.chatId] = true;
      mb.detachMessages();
    }
  };
  const _checkFinished = function (chatId) {
    return function () {
      return finishedLoadingChats[chatId] === true;
    };
  };
  chats.forEach(chatRoom => {
    const name = `getFrequentContacts(${chatRoom.roomId})`;
    if (chatRoom.isLoading()) {
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 10000, false, name));
    } else if (chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
      loadingMoreChats[chatRoom.chatId] = true;
      finishedLoadingChats[chatRoom.chatId] = false;
      chatRoom.messagesBuff.retrieveChatHistory(false);
      chatRoom.rebind(CHAT_ONHISTDECR_RECNT, _histDecryptedCb);
      promises.push(createTimeoutPromise(_checkFinished(chatRoom.chatId), 300, 15000, false, name));
    } else {
      _calculateLastTsFor(chatRoom, 32);
    }
  });
  Chat._frequentsCache = new Promise((resolve, reject) => {
    Promise.allSettled(promises).then(() => {
      const result = Object.values(recentContacts).sort((a, b) => a.ts < b.ts ? 1 : b.ts < a.ts ? -1 : 0).reverse();
      tSleep(300).then(() => {
        delete Chat._frequentsCache;
      });
      return result;
    }).then(resolve).catch(reject);
  });
  return Chat._frequentsCache;
};
Chat.prototype.lastRoomContacts = async function (chatRoom) {
  let timeout;
  let loaded = false;
  let loadMore = false;
  const {
    promise
  } = mega;
  const proc = () => {
    if (timeout) {
      timeout.abort();
    }
    const {
      messages
    } = chatRoom.messagesBuff;
    const arr = messages.slice(Math.max(0, messages.length - 32));
    let first = '';
    let second = '';
    for (let i = arr.length; i--;) {
      const message = arr[i];
      const h = message.userId === mega.BID && message.meta ? message.meta.userId : message.userId;
      if (h !== mega.BID && h !== strongvelope.COMMANDER && h !== u_handle && h in M.u && M.u[h].c === 1) {
        if (first && first !== h) {
          second = h;
          break;
        }
        first = h;
      }
    }
    if (second) {
      promise.resolve([first, second]);
    } else if (first) {
      promise.resolve([first]);
    } else {
      promise.resolve([]);
    }
    chatRoom.messagesBuff.detachMessages();
  };
  const next = () => {
    if (!loadMore && chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
      if (timeout) {
        timeout.restart();
      }
      loadMore = true;
      chatRoom.messagesBuff.retrieveChatHistory(false);
    } else {
      chatRoom.off('onHistoryDecrypted.lrc');
      proc();
    }
  };
  if (chatRoom.isLoading()) {
    loaded = false;
    chatRoom.rebind('onHistoryDecrypted.lrc', next);
    timeout = tSleep(10);
  } else if (chatRoom.messagesBuff.messages.length < 32 && chatRoom.messagesBuff.haveMoreHistory()) {
    loaded = false;
    loadMore = true;
    chatRoom.rebind('onHistoryDecrypted.lrc', next);
    chatRoom.messagesBuff.retrieveChatHistory(false);
    timeout = tSleep(10);
  } else {
    proc();
  }
  if (timeout) {
    timeout.then(() => {
      if (!loaded) {
        chatRoom.off('onHistoryDecrypted.lrc');
        promise.resolve([]);
      }
    });
  }
  return promise;
};
Chat.prototype.eventuallyAddDldTicketToReq = function (req) {
  if (!u_handle) {
    return;
  }
  const currentRoom = this.getCurrentRoom();
  if (currentRoom && currentRoom.type === "public" && currentRoom.publicChatHandle && (is_chatlink || currentRoom.membersSetFromApi && !currentRoom.membersSetFromApi.members[u_handle])) {
    req.cauth = currentRoom.publicChatHandle;
  }
};
Chat.prototype.removeMessagesByRetentionTime = function (chatId) {
  if (this.chats.length > 0) {
    if (chatId) {
      if (this.logger && d > 3) {
        this.logger.debug(`Chat.prototype.removeMessagesByRetentionTime chatId=${chatId}`);
      }
      const room = this.getChatById(chatId);
      if (room) {
        room.removeMessagesByRetentionTime();
      }
      return;
    }
    const chatIds = this.chats.keys();
    for (let i = 0; i < chatIds.length; i++) {
      const chatRoom = this.chats[chatIds[i]];
      if (chatRoom.retentionTime > 0 && chatRoom.state === ChatRoom.STATE.READY) {
        if (this.logger && d > 3) {
          this.logger.debug(`Chat.prototype.removeMessagesByRetentionTime roomId=${chatRoom.roomId}`);
        }
        chatRoom.removeMessagesByRetentionTime();
      }
    }
  }
};
Chat.prototype.loginOrRegisterBeforeJoining = function (chatHandle, forceRegister, forceLogin, notJoinReq, onLoginSuccessCb) {
  if (!chatHandle && page !== 'securechat' && (page === 'chat' || page.indexOf('chat') > -1)) {
    chatHandle = getSitePath().split("chat/")[1].split("#")[0];
  }
  assert(chatHandle, 'missing chat handle when calling megaChat.loginOrRegisterBeforeJoining');
  const chatRoom = megaChat.getCurrentRoom();
  const chatKey = `#${  window.location.hash.split("#").pop()}`;
  const finish = function (stay) {
    if (!notJoinReq) {
      localStorage.autoJoinOnLoginChat = JSON.stringify([chatHandle, unixtime(), chatKey, chatRoom.chatId]);
    }
    if (!stay) {
      window.location.reload();
    }
    return stay;
  };
  const doShowLoginDialog = function () {
    mega.ui.showLoginRequiredDialog({
      minUserType: 3,
      skipInitialDialog: 1,
      onLoginSuccessCb
    }).done(() => {
      if (page !== 'login' && onLoginSuccessCb) {
        onLoginSuccessCb();
      }
    });
  };
  const doShowRegisterDialog = function () {
    mega.ui.showRegisterDialog({
      title: l[5840],
      onCreatingAccount () {},
      onLoginAttemptFailed () {
        msgDialog(`warninga:${  l[171]}`, l[1578], l[218], null, (e) => {
          if (e) {
            $('.pro-register-dialog').addClass('hidden');
            if (signupPromptDialog) {
              signupPromptDialog.hide();
            }
            doShowLoginDialog();
          }
        });
      },
      onAccountCreated (gotLoggedIn, registerData) {
        if (finish(!gotLoggedIn)) {
          security.register.cacheRegistrationData(registerData);
          mega.ui.sendSignupLinkDialog(registerData);
          megaChat.destroy();
        }
      },
      onLoginSuccessCb
    });
  };
  if (u_handle && u_handle !== "AAAAAAAAAAA") {
    return finish();
  }
  if (forceRegister) {
    return doShowRegisterDialog();
  } else if (forceLogin) {
    return doShowLoginDialog();
  }
  if (u_wasloggedin()) {
    doShowLoginDialog();
  } else {
    doShowRegisterDialog();
  }
};
Chat.prototype.highlight = (text, matches, dontEscape) => {
  if (text && matches) {
    text = dontEscape ? text : escapeHTML(text);
    const tags = [];
    text = text.replace(/<[^>]+>/g, match => `@@!${  tags.push(match) - 1  }!@@`).split(' ');
    const done = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i].str;
      if (!done.includes(match)) {
        done.push(match);
        for (let j = 0; j < text.length; j++) {
          const word = text[j];
          const wordNormalized = ChatSearch._normalize_str(word);
          const matchPos = wordNormalized.indexOf(match);
          if (matchPos > -1) {
            const split = wordNormalized.split(match);
            text[j] = wordNormalized === word ? split.join(`[$]${match}[/$]`) : megaChat._highlightDiacritics(word, matchPos, split, match);
          }
        }
      }
    }
    text = text.join(' ').replace(/\@\@\!\d+\!\@\@/g, match => {
      return tags[parseInt(match.replace("@@!", "").replace("!@@"), 10)];
    });
    return text.replace(/\[\$]/g, '<strong>').replace(/\[\/\$]/g, '</strong>');
  }
  return null;
};
Chat.prototype._highlightDiacritics = function (word, matchPos, split, match) {
  const parts = [];
  const origMatch = word.substring(matchPos, matchPos + match.length);
  let pos = 0;
  for (let k = 0; k < split.length; k++) {
    parts.push(word.substring(pos, pos + split[k].length));
    pos = pos + split[k].length + match.length;
  }
  return parts.join(`[$]${origMatch}[/$]`);
};
Chat.prototype.html = function (content) {
  if (content) {
    return this.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(content));
  }
  return '';
};
Chat.prototype.updateKeysInProtocolHandlers = function () {
  this.chats.forEach(r => {
    const ph = r.protocolHandler;
    if (ph) {
      ph.reinitWithNewData(u_handle, u_privCu25519, u_privEd25519, u_pubEd25519, ph.chatMode);
    }
  });
};
Chat.prototype.eventuallyInitMeetingUI = function () {
  if (!window.location.hash) {
    return;
  }
  let loc = page.split("#")[0];
  loc = loc.replace("fm/", "/");
  if (loc.indexOf("chat/") === 0) {
    this.initialPubChatHandle = loc.substr(5).split("?")[0];
  }
};
Chat.prototype.enqueueChatRoomEvent = function (eventName, eventData) {
  if (!this.is_initialized) {
    return;
  }
  const {
    chatId
  } = eventData;
  if (!this._queuedChatRoomEvents[chatId]) {
    this._queuedChatRoomEvents[chatId] = [];
    (this._queuedChatRoomEvents[chatId].timer = tSleep(15)).then(() => {
      if (d) {
        this.logger.warn('Timer ran out, events lost...', this._queuedChatRoomEvents[chatId]);
      }
      delete this._queuedChatRoomEvents[chatId];
    });
  }
  this._queuedChatRoomEvents[chatId].push([eventName, eventData]);
};
Chat.prototype.autoJoinIfNeeded = function () {
  const rawAutoLoginInfo = localStorage.autoJoinOnLoginChat;
  if (u_type && rawAutoLoginInfo) {
    const autoLoginChatInfo = tryCatch(JSON.parse.bind(JSON))(rawAutoLoginInfo) || false;
    if (unixtime() - 7200 < autoLoginChatInfo[1]) {
      const req = this.plugins.chatdIntegration.getMciphReqFromHandleAndKey(autoLoginChatInfo[0], autoLoginChatInfo[2].substr(1));
      megaChat.rebind('onRoomInitialized.autoJoin', (e, megaRoom) => {
        if (megaRoom.chatId === autoLoginChatInfo[3]) {
          megaRoom.setActive();
          megaChat.unbind('onRoomInitialized.autoJoin');
          localStorage.removeItem("autoJoinOnLoginChat");
        }
      });
      asyncApiReq(req).catch(dump);
    } else {
      localStorage.removeItem("autoJoinOnLoginChat");
    }
  }
};
Chat.prototype.openScheduledMeeting = function (meetingId, toCall) {
  const meeting = this.scheduledMeetings[meetingId];
  if (!meeting) {
    console.warn('Meeting does not exist', meetingId);
    return;
  }
  window.focus();
  meeting.chatRoom.activateWindow();
  meeting.chatRoom.show();
  if (toCall && this.hasSupportForCalls) {
    this.openScheduledMeeting._queue = this.openScheduledMeeting._queue || [];
    this.openScheduledMeeting._queue.push(meetingId);
    delay('megachat:openScheduledMeetingCall', () => {
      const meetingId = this.openScheduledMeeting._queue[0];
      delete this.openScheduledMeeting._queue;
      const meetingRoom = this.scheduledMeetings[meetingId].chatRoom;
      meetingRoom.activateWindow();
      meetingRoom.show();
      const haveCall = this.haveAnyActiveCall();
      if (haveCall && window.sfuClient) {
        const {
          chatRoom
        } = this.activeCall;
        if (chatRoom && chatRoom.chatId === meetingRoom.chatId) {
          const peers = chatRoom.getCallParticipants();
          if (peers.includes(u_handle)) {
            return d && console.warn('Already in this call');
          }
        }
      }
      (0,utils.dQ)(true, meetingRoom).then(() => meetingRoom.startAudioCall(true)).catch(ex => d && console.warn('Already in a call.', ex));
    });
  }
};
Chat.prototype.playSound = tryCatch((sound, options, stop) => {
  if (options === true) {
    stop = true;
    options = undefined;
  }
  if (stop) {
    ion.sound.stop(sound);
  }
  return ion.sound.play(sound, options);
});
Chat.prototype.fetchSoundBuffer = async function (sound) {
  if (this.SOUNDS.buffers[sound]) {
    return this.SOUNDS.buffers[sound].slice();
  }
  let res = await M.xhr({
    url: `${staticpath}media/${sound}.mp3`,
    type: 'arraybuffer'
  }).catch(() => {
    console.warn('Failed to fetch sound .mp3 file', sound);
  });
  if (!res) {
    res = await M.xhr({
      url: `${staticpath}media/${sound}.ogg`,
      type: 'arraybuffer'
    }).catch(() => {
      console.error('Failed to fetch sound .ogg file', sound);
    });
  }
  if (!res) {
    throw ENOENT;
  }
  this.SOUNDS.buffers[sound] = res.target.response.slice();
  return res.target.response;
};
window.Chat = Chat;
 const chat = {
  Chat
};
})();

 })()
;