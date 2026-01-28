/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[493],{

 1635
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   Hc: () =>  GIF_PANEL_CLASS,
   L9: () =>  MAX_HEIGHT,
   kg: () =>  LABELS,
   nC: () =>  API
 });
const GIF_PANEL_CLASS = 'gif-panel-wrapper';
const MAX_HEIGHT = 550;
const API = {
  HOSTNAME: 'https://giphy.mega.nz/',
  ENDPOINT: 'v1/gifs',
  SCHEME: 'giphy://',
  convert: path => {
    if (path && typeof path === 'string') {
      const FORMAT = [API.SCHEME, API.HOSTNAME];
      if (path.indexOf(API.SCHEME) === 0 || path.indexOf(API.HOSTNAME) === 0) {
        return String.prototype.replace.apply(path, path.indexOf(API.SCHEME) === 0 ? FORMAT : FORMAT.reverse());
      }
    }
  },
  LIMIT: 50,
  OFFSET: 50
};
const LABELS = freeze({
  get SEARCH() {
    return l[24025];
  },
  get NO_RESULTS() {
    return l[24050];
  },
  get NOT_AVAILABLE() {
    return l[24512];
  },
  get END_OF_RESULTS() {
    return l[24156];
  }
});

 },

 2153
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   j: () =>  JOIN_VIEW
 });
const JOIN_VIEW = {
  INITIAL: 0,
  GUEST: 1,
  ACCOUNT: 2,
  UNSUPPORTED: 4
};

 },

 2558
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  A: () =>  composedTextArea
});

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
;// ./js/chat/ui/whosTyping.jsx

class WhosTyping extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      currentlyTyping: {}
    };
  }
  componentDidMount() {
    const {
      chatRoom
    } = this.props;
    chatRoom.rebind('onParticipantTyping.whosTyping', (e, user_handle, bCastCode) => {
      if (user_handle === u_handle) {
        return;
      }
      const u_h = user_handle;
      if (u_h === u_handle) {
        return;
      } else if (!M.u[u_h]) {
        return;
      }
      const currentlyTyping = {
        ...this.state.currentlyTyping
      };
      if (currentlyTyping[u_h]) {
        currentlyTyping[u_h].abort();
      }
      if (bCastCode === 1) {
        const timer = tSleep(5);
        timer.then(() => {
          this.stoppedTyping(u_h);
        });
        currentlyTyping[u_h] = timer;
        this.setState({
          currentlyTyping
        });
      } else {
        this.stoppedTyping(u_h);
      }
      this.forceUpdate();
    });
  }
  componentWillUnmount() {
    this.props.chatRoom.off('onParticipantTyping.whosTyping');
  }
  stoppedTyping(u_h) {
    if (this.domRef.current) {
      const {
        currentlyTyping
      } = this.state;
      if (currentlyTyping[u_h]) {
        const newState = {
          ...currentlyTyping
        };
        if (!newState[u_h].aborted) {
          newState[u_h].abort();
        }
        delete newState[u_h];
        this.setState({
          currentlyTyping: newState
        });
      }
    }
  }
  render() {
    const users = Object.keys(this.state.currentlyTyping);
    if (users.length > 0) {
      const names = users.map(u_h => M.getNameByHandle(u_h)).filter(String);
      let namesDisplay = "";
      let areMultipleUsersTyping = false;
      if (names.length > 1) {
        areMultipleUsersTyping = true;
        namesDisplay = [names.splice(0, names.length - 1).join(", "), names[0]];
      } else {
        areMultipleUsersTyping = false;
        namesDisplay = [names[0]];
      }
      return JSX_("div", {
        ref: this.domRef,
        className: "typing-block"
      }, JSX_("div", {
        className: "typing-text"
      }, areMultipleUsersTyping ? l[8872].replace("%1", namesDisplay[0]).replace("%2", namesDisplay[1]) : l[8629].replace("%1", namesDisplay[0])), JSX_("div", {
        className: "typing-bounce"
      }, JSX_("div", {
        className: "typing-bounce1"
      }), JSX_("div", {
        className: "typing-bounce2"
      }), JSX_("div", {
        className: "typing-bounce3"
      })));
    }
    return null;
  }
}
// EXTERNAL MODULE: ./js/chat/ui/typingArea.jsx + 5 modules
const typingArea = REQ_(4762);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const dropdowns = REQ_(1510);
;// ./js/chat/ui/composedTextArea.jsx





const ComposedTextArea = ({
  chatRoom,
  parent,
  containerRef,
  typingAreaText,
  onTypingAreaChanged
}) => JSX_("div", {
  className: "chat-textarea-block"
}, JSX_(WhosTyping, {
  chatRoom
}), JSX_(typingArea.T, {
  chatRoom,
  className: "main-typing-area",
  containerRef,
  disabled: chatRoom.isReadOnly(),
  persist: true,
  text: typingAreaText,
  onValueChanged: onTypingAreaChanged,
  onUpEditPressed: () => {
    const keys = chatRoom.messagesBuff.messages.keys();
    for (let i = keys.length; i--;) {
      const message = chatRoom.messagesBuff.messages[keys[i]];
      const contact = M.u[message.userId];
      if (!contact) {
        continue;
      }
      if (message.isEditable() && !message.requiresManualRetry && !message.deleted && (!message.type || message instanceof Message) && (!message.isManagement || !message.isManagement())) {
        parent.historyPanel.editMessage(message.messageId);
        return true;
      }
    }
    return false;
  },
  onResized: () => {
    parent.historyPanel.handleWindowResize();
  },
  onConfirm: messageContents => {
    const {
      messagesListScrollable
    } = parent.historyPanel;
    if (messageContents && messageContents.length > 0) {
      if (!chatRoom.scrolledToBottom) {
        chatRoom.scrolledToBottom = true;
        parent.lastScrollPosition = 0;
        chatRoom.rebind('onMessagesBuffAppend.pull', () => {
          if (messagesListScrollable) {
            messagesListScrollable.scrollToBottom(false);
            delay('messagesListScrollable', () => {
              messagesListScrollable.enable();
            }, 1500);
          }
        });
        chatRoom.sendMessage(messageContents);
        messagesListScrollable == null || messagesListScrollable.disable();
        messagesListScrollable == null || messagesListScrollable.scrollToBottom(true);
      } else {
        chatRoom.sendMessage(messageContents);
      }
    }
  }
}, JSX_(buttons.$, {
  className: "popup-button left",
  icon: "sprite-fm-mono icon-add",
  disabled: chatRoom.isReadOnly()
}, JSX_(dropdowns.ms, {
  className: "wide-dropdown attach-to-chat-popup light",
  noArrow: "true",
  positionMy: "left top",
  positionAt: "left bottom",
  vertOffset: 4,
  wrapper: "#fmholder"
}, JSX_("div", {
  className: "dropdown info-txt"
}, l[23753] || 'Send...'), JSX_(dropdowns.tJ, {
  className: "link-button",
  icon: "sprite-fm-mono icon-cloud",
  label: l[19794] || 'My Cloud Drive',
  disabled: mega.paywall,
  onClick: () => chatRoom.trigger('openAttachCloudDialog')
}), JSX_(dropdowns.tJ, {
  className: "link-button",
  icon: "sprite-fm-mono icon-session-history",
  label: l[19795] || 'My computer',
  disabled: mega.paywall,
  onClick: () => chatRoom.uploadFromComputer()
}), !is_eplusplus && !is_chatlink && !chatRoom.isNote && JSX_(REaCt().Fragment, null, JSX_("hr", null), JSX_(dropdowns.tJ, {
  className: "link-button",
  icon: "sprite-fm-mono icon-send-contact",
  label: l.share_contact_button,
  onClick: () => chatRoom.trigger('openSendContactDialog')
}))))));
 const composedTextArea = ComposedTextArea;

 },

 4762
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  T: () =>  TypingArea
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/ui/emojiDropdown.jsx
const emojiDropdown = REQ_(1165);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const ui_buttons = REQ_(5155);
;// ./js/chat/ui/emojiAutocomplete.jsx



class EmojiAutocomplete extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      'selected': 0
    };
    this.loading = false;
    this.data_emojis = [];
  }
  preload_emojis() {
    if (this.loading === false) {
      this.loading = true;
      megaChat.getEmojiDataSet('emojis').then(emojis => {
        this.loading = 0;
        this.data_emojis = emojis;
        this.safeForceUpdate();
      });
    }
  }
  unbindKeyEvents() {
    $(document).off(`keydown.emojiAutocomplete${  this.getUniqueId()}`);
  }
  bindKeyEvents() {
    const self = this;
    $(document).rebind(`keydown.emojiAutocomplete${  self.getUniqueId()}`, (e) => {
      if (!self.props.emojiSearchQuery) {
        self.unbindKeyEvents();
        return;
      }
      let key = e.keyCode || e.which;
      if (!$(e.target).is("textarea")) {
        console.error("this should never happen.");
        return;
      }
      if (e.altKey || e.metaKey) {
        return;
      }
      let selected = $.isNumeric(self.state.selected) ? self.state.selected : 0;
      if (document.body.classList.contains('rtl') && (key === 37 || key === 39)) {
        key = key === 37 ? 39 : 37;
      }
      let handled = false;
      if (!e.shiftKey && (key === 37 || key === 38)) {
        selected = selected - 1;
        selected = selected < 0 ? self.maxFound - 1 : selected;
        if (self.found[selected] && self.state.selected !== selected) {
          self.setState({
            selected,
            'prefilled': true
          });
          handled = true;
          self.props.onPrefill(false, `:${  self.found[selected].n  }:`);
        }
      } else if (!e.shiftKey && (key === 39 || key === 40 || key === 9)) {
        selected = selected + (key === 9 ? e.shiftKey ? -1 : 1 : 1);
        selected = selected < 0 ? Object.keys(self.found).length - 1 : selected;
        selected = selected >= self.props.maxEmojis || selected >= Object.keys(self.found).length ? 0 : selected;
        if (self.found[selected] && (key === 9 || self.state.selected !== selected)) {
          self.setState({
            selected,
            'prefilled': true
          });
          self.props.onPrefill(false, `:${  self.found[selected].n  }:`);
          handled = true;
        }
      } else if (key === 13) {
        self.unbindKeyEvents();
        if (selected === -1) {
          if (self.found.length > 0) {
            for (let i = 0; i < self.found.length; i++) {
              if (`:${  self.found[i].n  }:` === `${self.props.emojiSearchQuery  }:`) {
                self.props.onSelect(false, `:${  self.found[0].n  }:`);
                handled = true;
              }
            }
          }
          if (!handled && key === 13) {
            self.props.onCancel();
          }
          return;
        } else if (self.found.length > 0 && self.found[selected]) {
          self.props.onSelect(false, `:${  self.found[selected].n  }:`);
          handled = true;
        } else {
          self.props.onCancel();
        }
      } else if (key === 27) {
        self.unbindKeyEvents();
        self.props.onCancel();
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      } else {
        if (self.isMounted()) {
          self.setState({
            'prefilled': false
          });
        }
      }
    });
  }
  componentDidUpdate() {
    if (!this.props.emojiSearchQuery) {
      this.unbindKeyEvents();
    } else {
      this.bindKeyEvents();
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindKeyEvents();
  }
  render() {
    const self = this;
    if (!self.props.emojiSearchQuery) {
      return null;
    }
    self.preload_emojis();
    if (self.loading) {
      return JSX_("div", {
        className: "textarea-autofill-bl"
      }, JSX_("div", {
        className: "textarea-autofill-info"
      }, l[5533]));
    }
    const q = self.props.emojiSearchQuery.substr(1, self.props.emojiSearchQuery.length);
    let exactMatch = [];
    let partialMatch = [];
    const emojis = self.data_emojis || [];
    for (var i = 0; i < emojis.length; i++) {
      const emoji = emojis[i];
      const match = emoji.n.indexOf(q);
      if (match !== -1) {
        if (match === 0) {
          exactMatch.push(emoji);
        } else if (partialMatch.length < self.props.maxEmojis - exactMatch.length) {
          partialMatch.push(emoji);
        }
      }
      if (exactMatch.length >= self.props.maxEmojis) {
        break;
      }
    }
    exactMatch.sort((a, b) => {
      if (a.n === q) {
        return -1;
      } else if (b.n === q) {
        return 1;
      } else {
        return 0;
      }
    });
    const found = exactMatch.concat(partialMatch).slice(0, self.props.maxEmojis);
    exactMatch = partialMatch = null;
    this.maxFound = found.length;
    this.found = found;
    if (!found || found.length === 0) {
      queueMicrotask(() => {
        self.props.onCancel();
      });
      return null;
    }
    const emojisDomList = [];
    for (var i = 0; i < found.length; i++) {
      const meta = found[i];
      const filename = twemoji.convert.toCodePoint(meta.u);
      emojisDomList.push(JSX_("div", {
        className: `emoji-preview shadow ${  this.state.selected === i ? "active" : ""}`,
        key: `${meta.n  }_${  this.state.selected === i ? "selected" : "inselected"}`,
        title: `:${  meta.n  }:`,
        onClick (e) {
          self.props.onSelect(e, e.target.title);
          self.unbindKeyEvents();
        }
      }, JSX_("img", {
        width: "20",
        height: "20",
        className: "emoji emoji-loading",
        draggable: "false",
        alt: meta.u,
        onLoad: e => {
          e.target.classList.remove('emoji-loading');
        },
        onError: e => {
          e.target.classList.remove('emoji-loading');
          e.target.classList.add('emoji-loading-error');
        },
        src: `${staticpath  }images/mega/twemojis/2_v2/72x72/${  filename  }.png`
      }), JSX_("div", {
        className: "emoji title"
      }, `:${  meta.n  }:`)));
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "textarea-autofill-bl"
    }, JSX_(utils.P9, {
      tag: "div",
      className: "textarea-autofill-info"
    }, l.emoji_suggestion_instruction), JSX_("div", {
      className: "textarea-autofill-emoji"
    }, emojisDomList));
  }
}
EmojiAutocomplete.defaultProps = {
  'requiresUpdateOnResize': true,
  'emojiSearchQuery': false,
  'disableCheckingVisibility': true,
  'maxEmojis': 12
};
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
// EXTERNAL MODULE: ./js/chat/ui/gifPanel/utils.jsx
const gifPanel_utils = REQ_(1635);
;// ./js/chat/ui/gifPanel/searchField.jsx
let _SearchField;


class SearchField extends REaCt().Component {
  render() {
    const {
      value,
      searching,
      onChange,
      onReset,
      onBack
    } = this.props;
    return JSX_("div", {
      className: "gif-panel-search"
    }, JSX_("div", {
      className: "gif-search-field"
    }, searching ? JSX_("i", {
      className: "sprite-fm-mono icon-left",
      onClick: onBack
    }) : JSX_("i", {
      className: "sprite-fm-mono icon-preview-reveal"
    }), JSX_("input", {
      ref: SearchField.inputRef,
      type: "text",
      placeholder: gifPanel_utils.kg.SEARCH,
      autoFocus: true,
      value,
      onChange
    }), searching && JSX_("i", {
      className: "sprite-fm-mono icon-close-component",
      onClick: onReset
    })), JSX_("div", {
      className: "giphy-logo"
    }, JSX_("img", {
      src: `${staticpath  }images/mega/giphy.gif`,
      alt: "PWRD BY GIPHY"
    })));
  }
}
_SearchField = SearchField;
SearchField.inputRef = REaCt().createRef();
SearchField.focus = () => _SearchField.inputRef && _SearchField.inputRef.current && _SearchField.inputRef.current.focus();
SearchField.hasValue = () => _SearchField.inputRef && _SearchField.inputRef.current && !!_SearchField.inputRef.current.value.length;
;// ./js/chat/ui/gifPanel/result.jsx


class Result extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.resultRef = REaCt().createRef();
  }
  componentDidMount() {
    let _this$props$onMount, _this$props;
    (_this$props$onMount = (_this$props = this.props).onMount) == null || _this$props$onMount.call(_this$props, this.resultRef.current);
  }
  componentWillUnmount() {
    let _this$props$onUnmount, _this$props2;
    (_this$props$onUnmount = (_this$props2 = this.props).onUnmount) == null || _this$props$onUnmount.call(_this$props2, this.resultRef.current, 'unobserve');
  }
  render() {
    const {
      image,
      title,
      onClick
    } = this.props;
    return JSX_("div", {
      className: `
                    ${NODE_CONTAINER_CLASS}
                    ${onClick ? 'clickable' : ''}
                `,
      style: {
        height: parseInt(image.height)
      }
    }, JSX_("div", {
      ref: this.resultRef,
      className: NODE_CLASS,
      style: {
        backgroundImage: HAS_INTERSECTION_OBSERVER ? '' : `url(${image.url})`
      },
      "data-url": image.url,
      onClick
    }, JSX_("span", null, title)));
  }
}
;// ./js/chat/ui/gifPanel/resultContainer.jsx



const HAS_INTERSECTION_OBSERVER = typeof IntersectionObserver !== 'undefined';
const NODE_CONTAINER_CLASS = 'node-container';
const NODE_CLASS = 'node';
const RESULT_CONTAINER_CLASS = 'gif-panel-results';
const RESULTS_END_CLASS = 'results-end';
const Nil = ({
  children
}) => JSX_("div", {
  className: "no-results-container"
}, JSX_("div", {
  className: "no-results-content"
}, JSX_("i", {
  className: "huge-icon sad-smile"
}), JSX_("span", null, children)));
class ResultContainer extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.intersectionObserver = null;
    this.initializeIntersectionObserver = () => {
      if (HAS_INTERSECTION_OBSERVER) {
        this.intersectionObserver = new IntersectionObserver(entries => {
          for (let i = 0; i < entries.length; i++) {
            var _target$classList, _target$classList2;
            const entry = entries[i];
            const {target} = entry;
            if ((_target$classList = target.classList) != null && _target$classList.contains(NODE_CLASS)) {
              target.style.backgroundImage = entry.isIntersecting ? `url(${target.dataset.url})` : null;
            }
            if (entry.isIntersecting && (_target$classList2 = target.classList) != null && _target$classList2.contains(RESULTS_END_CLASS)) {
              this.props.onPaginate();
            }
          }
        });
      }
    };
    this.toggleIntersectionObserver = (node, action = 'observe') => {
      if (node && this.intersectionObserver) {
        this.intersectionObserver[action](node);
      }
    };
  }
  componentDidMount() {
    this.initializeIntersectionObserver();
  }
  componentWillUnmount() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }
  render() {
    const {
      loading,
      results,
      bottom,
      unavailable,
      onClick
    } = this.props;
    if (unavailable) {
      return JSX_(Nil, null, gifPanel_utils.kg.NOT_AVAILABLE);
    }
    if (loading && results.length < 1) {
      return JSX_("div", {
        className: RESULT_CONTAINER_CLASS
      }, Array.from({
        length: gifPanel_utils.nC.LIMIT
      }, (element, index) => JSX_("div", {
        key: index,
        className: NODE_CONTAINER_CLASS
      }, JSX_("div", {
        className: NODE_CLASS,
        style: {
          height: Math.floor(Math.random() * 150) + 100
        }
      }))));
    }
    if (!loading && results.length < 1) {
      return JSX_(Nil, null, gifPanel_utils.kg.NO_RESULTS);
    }
    if (results.length) {
      return JSX_(REaCt().Fragment, null, JSX_("div", {
        className: RESULT_CONTAINER_CLASS
      }, results.map(({
        slug,
        images: {
          fixed_width_downsampled
        },
        title
      }, index) => {
        return JSX_(Result, {
          key: `${slug}--${index}`,
          image: fixed_width_downsampled,
          title,
          onClick: () => onClick(results[index]),
          onMount: this.toggleIntersectionObserver,
          onUnmount: this.toggleIntersectionObserver
        });
      })), JSX_("div", {
        className: RESULTS_END_CLASS,
        ref: node => this.toggleIntersectionObserver(node),
        style: {
          visibility: bottom ? 'visible' : 'hidden'
        }
      }, JSX_("img", {
        className: "emoji",
        alt: "\\ud83d\\ude10",
        src: `${staticpath}/images/mega/twemojis/2_v2/72x72/1f610.png`
      }), JSX_("strong", null, gifPanel_utils.kg.END_OF_RESULTS)));
    }
    return null;
  }
}
;// ./js/chat/ui/gifPanel/gifPanel.jsx





class GifPanel extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.pathRef = '';
    this.controllerRef = null;
    this.fetchRef = null;
    this.delayProcID = null;
    this.defaultState = {
      value: '',
      searching: false,
      results: [],
      loading: true,
      offset: 0,
      bottom: false,
      unavailable: false
    };
    this.state = {
      ...this.defaultState
    };
    this.getContainerHeight = () => window.innerHeight * 0.6 > gifPanel_utils.L9 ? gifPanel_utils.L9 : window.innerHeight * 0.6;
    this.getFormattedPath = path => {
      const PATH = path + (path.indexOf('?') === -1 ? '?' : '&');
      const LIMIT = `limit=${gifPanel_utils.nC.LIMIT}`;
      return `${gifPanel_utils.nC.HOSTNAME + gifPanel_utils.nC.ENDPOINT}/${PATH + LIMIT}`;
    };
    this.clickedOutsideComponent = ev => {
      const $target = ev && $(ev.target);
      return $target.parents(`.${gifPanel_utils.Hc}`).length === 0 && ['.small-icon.tiny-reset', '.small-icon.gif'].every(outsideElement => !$target.is(outsideElement));
    };
    this.bindEvents = () => {
      $(document).rebind('mousedown.gifPanel', ev => {
        if (this.clickedOutsideComponent(ev)) {
          this.props.onToggle();
        }
      }).rebind('keydown.gifPanel', ({
        keyCode
      }) => {
        if (keyCode && keyCode === 27) {
          return SearchField.hasValue() ? this.doReset() : this.props.onToggle();
        }
      });
    };
    this.unbindEvents = () => {
      if (this.delayProcID) {
        delay.cancel(this.delayProcID);
      }
      $(document).unbind('.gifPanel');
    };
    this.doFetch = path => {
      this.setState({
        loading: true,
        unavailable: false
      }, () => {
        this.pathRef = path;
        this.controllerRef = typeof AbortController === 'function' && new AbortController();
        this.fetchRef = fetch(this.getFormattedPath(path), {
          signal: this.controllerRef.signal
        }).then(response => response.json()).then(({
          data
        }) => {
          this.fetchRef = this.pathRef = null;
          if (this.domRef.current) {
            if (data && data.length) {
              return this.setState(state => ({
                results: [...state.results, ...data],
                loading: false
              }));
            }
            return this.setState({
              bottom: true,
              loading: false
            }, () => this.resultContainerRef && this.resultContainerRef.reinitialise());
          }
        }).catch(ex => {
          return ex.name === 'AbortError' ? null : this.setState({
            unavailable: true
          });
        });
      });
    };
    this.doPaginate = () => {
      const {
        value,
        loading,
        searching
      } = this.state;
      if (!loading) {
        this.setState(state => ({
          offset: state.offset + gifPanel_utils.nC.OFFSET
        }), () => {
          this.doFetch(searching ? `search?q=${escape(value)}&offset=${this.state.offset}` : `trending?offset=${this.state.offset}`);
        });
      }
    };
    this.doReset = () => {
      this.setState({
        ...this.defaultState
      }, () => {
        this.doFetch('trending');
        onIdle(() => SearchField.focus());
        this.resultContainerRef.scrollToY(0);
      });
    };
    this.handleChange = ev => {
      const {
        value
      } = ev.target;
      const searching = value.length >= 2;
      if (value.length === 0) {
        return this.doReset();
      }
      if (this.fetchRef !== null && this.pathRef === 'trending' && this.controllerRef) {
        this.controllerRef.abort();
        this.fetchRef = this.pathRef = null;
      }
      this.setState(state => ({
        ...this.defaultState,
        value,
        searching,
        results: searching ? [] : state.results
      }), () => {
        this.resultContainerRef.scrollToY(0);
        this.delayProcID = searching ? delay('gif-search', () => this.doFetch(`search?q=${escape(value)}`), 1600) : null;
      });
    };
    this.handleBack = () => this.doReset();
    this.doSend = result => {
      const {
        mp4,
        webp,
        mp4_size,
        webp_size,
        width,
        height
      } = result.images.fixed_height;
      const message = Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT + Message.MANAGEMENT_MESSAGE_TYPES.CONTAINS_META + Message.MESSAGE_META_TYPE.GIPHY + JSON.stringify({
        textMessage: result.title,
        src: gifPanel_utils.nC.convert(mp4),
        src_webp: gifPanel_utils.nC.convert(webp),
        s: mp4_size,
        s_webp: webp_size,
        w: width,
        h: height
      });
      this.props.chatRoom.sendMessage(message);
      this.props.onToggle();
    };
  }
  componentDidMount() {
    if (this.state.results && this.state.results.length === 0) {
      this.doFetch('trending');
    }
    this.bindEvents();
  }
  componentWillUnmount() {
    this.unbindEvents();
  }
  render() {
    const {
      value,
      searching,
      results,
      loading,
      bottom,
      unavailable
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: "gif-panel-wrapper"
    }, JSX_("div", {
      className: "gif-panel",
      style: {
        height: this.getContainerHeight()
      }
    }, JSX_("div", {
      className: "gif-panel-header"
    }, JSX_(SearchField, {
      value,
      searching,
      onChange: this.handleChange,
      onReset: this.doReset,
      onBack: this.handleBack
    })), JSX_("div", {
      className: "gif-panel-content"
    }, JSX_(perfectScrollbar.O, {
      ref: container => {
        this.resultContainerRef = container;
      },
      options: {
        'suppressScrollX': true
      }
    }, JSX_(ResultContainer, {
      results,
      loading,
      bottom,
      unavailable,
      onPaginate: this.doPaginate,
      onClick: this.doSend
    })))));
  }
}
;// ./js/chat/ui/typingArea.jsx

let _dec, _class;








const TypingArea = (_dec = (0,mixins.hG)(54, true), _class = class TypingArea extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      emojiSearchQuery: false,
      textareaHeight: 20,
      gifPanelActive: false
    };
    this.getTextareaMaxHeight = () => {
      const {
        containerRef
      } = this.props;
      if (containerRef && containerRef.current) {
        return this.isMounted() ? containerRef.current.offsetHeight * 0.4 : 100;
      }
      return 100;
    };
    const {
      chatRoom
    } = props;
    this.logger = d && MegaLogger.getLogger("TypingArea", {}, chatRoom && chatRoom.logger || megaChat.logger);
    this.onEmojiClicked = this.onEmojiClicked.bind(this);
    this.onTypeAreaKeyUp = this.onTypeAreaKeyUp.bind(this);
    this.onTypeAreaKeyDown = this.onTypeAreaKeyDown.bind(this);
    this.onTypeAreaBlur = this.onTypeAreaBlur.bind(this);
    this.onTypeAreaChange = this.onTypeAreaChange.bind(this);
    this.onCopyCapture = this.onCopyCapture.bind(this);
    this.onPasteCapture = this.onPasteCapture.bind(this);
    this.onCutCapture = this.onCutCapture.bind(this);
    this.state.typedMessage = this.props.initialText || '';
  }
  onEmojiClicked(e, slug) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    slug = slug[0] === ':' || slug.substr(-1) === ':' ? slug : `:${slug}:`;
    const textarea = $('.messages-textarea', this.domRef.current)[0];
    const cursorPosition = this.getCursorPosition(textarea);
    const {
      text,
      onValueChanged
    } = this.props;
    const val = text.slice(0, cursorPosition) + slug + text.slice(cursorPosition);
    onValueChanged(val);
    textarea.selectionEnd = cursorPosition + slug.length;
    this.onTypeAreaChange(e, val);
  }
  stoppedTyping() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }
    this.iAmTyping = false;
    this.props.chatRoom.trigger('stoppedTyping');
  }
  typing() {
    if (this.props.disabled || !this.props.chatRoom) {
      return;
    }
    const self = this;
    const now = Date.now();
    delay(this.getReactId(), () => self.iAmTyping && self.stoppedTyping(), 4e3);
    if (!self.iAmTyping || now - self.lastTypingStamp > 4e3) {
      self.iAmTyping = true;
      self.lastTypingStamp = now;
      self.props.chatRoom.trigger('typing');
    }
  }
  triggerOnUpdate(forced) {
    const self = this;
    if (!self.props.onUpdate || !self.isMounted()) {
      return;
    }
    let shouldTriggerUpdate = forced ? forced : false;
    if (!shouldTriggerUpdate && self.props.text !== self.lastTypedMessage) {
      self.lastTypedMessage = self.props.text;
      shouldTriggerUpdate = true;
    }
    if (!shouldTriggerUpdate) {
      const $textarea = $('.chat-textarea:visible textarea:visible', self.domRef.current);
      if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
        self._lastTextareaHeight = $textarea.height();
        shouldTriggerUpdate = true;
        if (self.props.onResized) {
          self.props.onResized();
        }
      }
    }
    if (shouldTriggerUpdate) {
      self.props.onUpdate();
    }
  }
  onCancelClicked() {
    const self = this;
    self.props.onValueChanged('');
    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }
    self.onConfirmTrigger(false);
    self.triggerOnUpdate();
  }
  onSaveClicked() {
    const self = this;
    if (self.props.disabled || !self.isMounted()) {
      return;
    }
    const val = $.trim($('.chat-textarea:visible textarea:visible', this.domRef.current).val());
    if (self.onConfirmTrigger(val) !== true) {
      self.props.onValueChanged('');
    }
    if (self.props.chatRoom && self.iAmTyping) {
      self.stoppedTyping();
    }
    self.triggerOnUpdate();
  }
  onConfirmTrigger(val) {
    const {
      onConfirm,
      persist,
      chatRoom
    } = this.props;
    const result = onConfirm(val);
    if (val !== false && result !== false) {
      $('.textarea-scroll', this.domRef.current).scrollTop(0);
    }
    if (persist) {
      const {
        persistedTypeArea
      } = chatRoom.megaChat.plugins;
      if (persistedTypeArea) {
        if (d > 2) {
          this.logger.info('Removing persisted-typed value...');
        }
        persistedTypeArea.removePersistedTypedValue(chatRoom);
      }
    }
    return result;
  }
  onTypeAreaKeyDown(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const self = this;
    const key = e.keyCode || e.which;
    const element = e.target;
    const val = $.trim(element.value);
    if (self.state.emojiSearchQuery) {
      return;
    }
    if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      if (e.isPropagationStopped() || e.isDefaultPrevented()) {
        return;
      }
      if (self.onConfirmTrigger(val) !== true) {
        self.props.onValueChanged('');
        $(document).trigger('closeDropdowns');
      }
      e.preventDefault();
      e.stopPropagation();
      if (self.props.chatRoom && self.iAmTyping) {
        self.stoppedTyping();
      }
    }
  }
  onTypeAreaKeyUp(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const self = this;
    const key = e.keyCode || e.which;
    const element = e.target;
    const val = $.trim(element.value);
    if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
    } else if (key === 13) {
      if (self.state.emojiSearchQuery) {
        return;
      }
      if (e.altKey) {
        let content = element.value;
        const cursorPos = self.getCursorPosition(element);
        content = `${content.substring(0, cursorPos)  }\n${  content.substring(cursorPos, content.length)}`;
        self.props.onValueChanged(content);
        self.onUpdateCursorPosition = cursorPos + 1;
        e.preventDefault();
      } else if ($.trim(val).length === 0) {
        e.preventDefault();
      }
    } else if (key === 38) {
      if (self.state.emojiSearchQuery) {
        return;
      }
      if ($.trim(val).length === 0) {
        if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
          e.preventDefault();
        }
      }
    } else if (key === 27) {
      if (self.state.emojiSearchQuery) {
        return;
      }
      if (self.props.showButtons === true) {
        e.preventDefault();
        self.onCancelClicked(e);
      }
    } else {
      if (self.prefillMode && (key === 8 || key === 32 || key === 186 || key === 13)) {
        self.prefillMode = false;
      }
      const currentContent = element.value;
      const currentCursorPos = self.getCursorPosition(element) - 1;
      if (self.prefillMode && (currentCursorPos > self.state.emojiEndPos || currentCursorPos < self.state.emojiStartPos)) {
        self.prefillMode = false;
        self.setState({
          'emojiSearchQuery': false,
          'emojiStartPos': false,
          'emojiEndPos': false
        });
        return;
      }
      if (self.prefillMode) {
        return;
      }
      const char = String.fromCharCode(key);
      if (key === 16 || key === 17 || key === 18 || key === 91 || key === 8 || key === 37 || key === 39 || key === 40 || key === 38 || key === 9 || /[\w:-]/.test(char)) {
        const parsedResult = mega.utils.emojiCodeParser(currentContent, currentCursorPos);
        self.setState({
          'emojiSearchQuery': parsedResult[0],
          'emojiStartPos': parsedResult[1],
          'emojiEndPos': parsedResult[2]
        });
        return;
      }
      if (self.state.emojiSearchQuery) {
        self.setState({
          'emojiSearchQuery': false
        });
      }
    }
  }
  onTypeAreaBlur(e) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const self = this;
    if (self.state.emojiSearchQuery) {
      setTimeout(() => {
        if (self.isMounted()) {
          self.setState({
            'emojiSearchQuery': false,
            'emojiStartPos': false,
            'emojiEndPos': false
          });
        }
      }, 300);
    }
  }
  onTypeAreaChange(e, value) {
    if (this.props.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const self = this;
    value = String(value || e.target.value || '').replace(/^\s+/, '');
    if (self.props.text !== value) {
      self.props.onValueChanged(value);
      self.forceUpdate();
    }
    if (value.length) {
      self.typing();
    } else {
      self.stoppedTyping();
    }
    if (this.props.persist) {
      const {
        chatRoom
      } = this.props;
      const {
        megaChat
      } = chatRoom;
      const {
        persistedTypeArea
      } = megaChat.plugins;
      if (persistedTypeArea) {
        if (d > 2) {
          this.logger.debug('%s persisted-typed value...', value.length ? 'Updating' : 'Removing');
        }
        if (value.length) {
          persistedTypeArea.updatePersistedTypedValue(chatRoom, value);
        } else {
          persistedTypeArea.removePersistedTypedValue(chatRoom);
        }
      }
    }
    self.updateScroll();
  }
  focusTypeArea() {
    if (this.props.disabled) {
      return;
    }
    if ($('.chat-textarea:visible textarea:visible', this.domRef.current).length > 0 && !$('.chat-textarea:visible textarea:visible:first', this.domRef.current).is(":focus")) {
      moveCursortoToEnd($('.chat-textarea:visible:first textarea', this.domRef.current)[0]);
    }
  }
  componentDidMount() {
    super.componentDidMount();
    this._lastTextareaHeight = 20;
    this.lastTypedMessage = this.props.initialText || this.lastTypedMessage;
    chatGlobalEventManager.addEventListener('resize', `typingArea${this.getUniqueId()}`, () => this.handleWindowResize());
    this.triggerOnUpdate(true);
    this.updateScroll();
    megaChat.rebind(`viewstateChange.gifpanel${this.getUniqueId()}`, e => {
      const {
        gifPanelActive
      } = this.state;
      const {
        state
      } = e.data;
      if (state === 'active' && !gifPanelActive && this.gifResume) {
        this.setState({
          gifPanelActive: true
        });
        delete this.gifResume;
      } else if (state !== 'active' && gifPanelActive && !this.gifResume) {
        this.gifResume = true;
        this.setState({
          gifPanelActive: false
        });
      }
    });
  }
  UNSAFE_componentWillMount() {
    const {
      chatRoom,
      initialText,
      persist,
      onValueChanged
    } = this.props;
    const {
      megaChat,
      roomId
    } = chatRoom;
    const {
      persistedTypeArea
    } = megaChat.plugins;
    if (persist && persistedTypeArea) {
      if (!initialText) {
        persistedTypeArea.getPersistedTypedValue(chatRoom).then(res => {
          if (res && this.isMounted() && !this.props.text) {
            onValueChanged(res);
          }
        }).catch(ex => {
          if (this.logger && ex !== undefined) {
            this.logger.warn(`Failed to retrieve persistedTypeArea for ${roomId}: ${ex}`, [ex]);
          }
        });
      }
      persistedTypeArea.addChangeListener(this.getUniqueId(), (e, k, v) => {
        if (roomId === k) {
          onValueChanged(v || '');
          this.triggerOnUpdate(true);
        }
      });
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const self = this;
    self.triggerOnUpdate();
    if (megaChat.plugins.persistedTypeArea) {
      megaChat.plugins.persistedTypeArea.removeChangeListener(self.getUniqueId());
    }
    chatGlobalEventManager.removeEventListener('resize', `typingArea${  self.getUniqueId()}`);
    megaChat.off(`viewstateChange.gifpanel${this.getUniqueId()}`);
  }
  componentDidUpdate() {
    if (this.isComponentEventuallyVisible() && !window.getSelection().toString() && $('textarea:focus,select:focus,input:focus').filter(":visible").length === 0) {
      this.focusTypeArea();
    }
    this.updateScroll();
    if (this.onUpdateCursorPosition) {
      const el = $('.chat-textarea:visible:first textarea:visible', this.domRef.current)[0];
      el.selectionStart = el.selectionEnd = this.onUpdateCursorPosition;
      this.onUpdateCursorPosition = false;
    }
  }
  updateScroll() {
    if (!this.isComponentEventuallyVisible() || !this.$node && !this.domRef && !this.domRef.current) {
      return;
    }
    const $node = this.$node = this.$node || this.domRef.current;
    const $textarea = this.$textarea = this.$textarea || $('textarea:first', $node);
    const $scrollBlock = this.$scrollBlock = this.$scrollBlock || $textarea.closest('.textarea-scroll');
    const $preview = $('.message-preview', $scrollBlock).safeHTML(`${escapeHTML(this.props.text).replace(/\n/g, '<br />')} <br>`);
    const textareaHeight = $preview.height();
    $scrollBlock.height(Math.min(textareaHeight, this.getTextareaMaxHeight()));
    if (textareaHeight !== this._lastTextareaHeight) {
      this._lastTextareaHeight = textareaHeight;
      this.setState({
        textareaHeight
      });
      if (this.props.onResized) {
        this.props.onResized();
      }
      $textarea.height(textareaHeight);
    }
    if (this.textareaScroll) {
      this.textareaScroll.reinitialise();
    }
  }
  getCursorPosition(el) {
    let pos = 0;
    if ('selectionStart' in el) {
      pos = el.selectionStart;
    } else if ('selection' in document) {
      el.focus();
      const sel = document.selection.createRange(),
        selLength = document.selection.createRange().text.length;
      sel.moveStart('character', -el.value.length);
      pos = sel.text.length - selLength;
    }
    return pos;
  }
  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }
  handleWindowResize(e) {
    if (!this.isComponentEventuallyVisible()) {
      return;
    }
    if (e) {
      this.updateScroll();
    }
    this.triggerOnUpdate();
  }
  isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  }
  resetPrefillMode() {
    this.prefillMode = false;
  }
  onCopyCapture() {
    this.resetPrefillMode();
  }
  onCutCapture() {
    this.resetPrefillMode();
  }
  onPasteCapture() {
    this.resetPrefillMode();
  }
  render() {
    const self = this;
    const room = this.props.chatRoom;
    let buttons = null;
    if (self.props.showButtons === true) {
      buttons = [JSX_(ui_buttons.$, {
        key: "save",
        className: `${"mega-button right"} positive`,
        label: l[776],
        onClick: self.onSaveClicked.bind(self)
      }), JSX_(ui_buttons.$, {
        key: "cancel",
        className: "mega-button right",
        label: l.msg_dlg_cancel,
        onClick: self.onCancelClicked.bind(self)
      })];
    }
    const textareaStyles = {
      height: self.state.textareaHeight
    };
    const textareaScrollBlockStyles = {};
    const newHeight = Math.min(self.state.textareaHeight, self.getTextareaMaxHeight());
    if (newHeight > 0) {
      textareaScrollBlockStyles.height = newHeight;
    }
    let emojiAutocomplete = null;
    if (self.state.emojiSearchQuery) {
      emojiAutocomplete = JSX_(EmojiAutocomplete, {
        emojiSearchQuery: self.state.emojiSearchQuery,
        emojiStartPos: self.state.emojiStartPos,
        emojiEndPos: self.state.emojiEndPos,
        typedMessage: self.props.text,
        onPrefill (e, emojiAlias) {
          if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
            const msg = self.props.text;
            const pre = msg.substr(0, self.state.emojiStartPos);
            let post = msg.substr(self.state.emojiEndPos + 1, msg.length);
            const startPos = self.state.emojiStartPos;
            const fwdPos = startPos + emojiAlias.length;
            let endPos = fwdPos;
            self.onUpdateCursorPosition = fwdPos;
            self.prefillMode = true;
            if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
              emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
              endPos -= 1;
            } else {
              post = post ? post.substr(0, 1) !== " " ? ` ${  post}` : post : " ";
              self.onUpdateCursorPosition++;
            }
            self.setState({
              'emojiEndPos': endPos
            });
            self.props.onValueChanged(pre + emojiAlias + post);
          }
        },
        onSelect (e, emojiAlias, forceSend) {
          if ($.isNumeric(self.state.emojiStartPos) && $.isNumeric(self.state.emojiEndPos)) {
            const msg = self.props.text;
            const pre = msg.substr(0, self.state.emojiStartPos);
            let post = msg.substr(self.state.emojiEndPos + 1, msg.length);
            if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
              emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
            } else {
              post = post ? post.substr(0, 1) !== " " ? ` ${  post}` : post : " ";
            }
            const val = pre + emojiAlias + post;
            self.prefillMode = false;
            self.setState({
              'emojiSearchQuery': false,
              'emojiStartPos': false,
              'emojiEndPos': false
            });
            self.props.onValueChanged(val);
            if (forceSend) {
              if (self.onConfirmTrigger($.trim(val)) !== true) {
                self.props.onValueChanged('');
              }
            }
          }
        },
        onCancel () {
          self.prefillMode = false;
          self.setState({
            'emojiSearchQuery': false,
            'emojiStartPos': false,
            'emojiEndPos': false
          });
        }
      });
    }
    const disabledTextarea = !!(room.pubCu25519KeyIsMissing === true || this.props.disabled);
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    typingarea-component
                    ${this.props.className}
                `
    }, this.state.gifPanelActive && JSX_(GifPanel, {
      chatRoom: this.props.chatRoom,
      onToggle: () => {
        this.setState({
          gifPanelActive: false
        });
        delete this.gifResume;
      }
    }), JSX_("div", {
      className: `
                        chat-textarea
                        ${this.props.className}
                    `
    }, emojiAutocomplete, self.props.children, self.props.editing ? null : JSX_(ui_buttons.$, {
      className: `
                                popup-button
                                gif-button
                                ${this.state.gifPanelActive ? 'active' : ''}
                            `,
      icon: "small-icon gif",
      disabled: this.props.disabled,
      onClick: () => this.setState(state => {
        delete this.gifResume;
        return {
          gifPanelActive: !state.gifPanelActive
        };
      })
    }), JSX_(ui_buttons.$, {
      className: "popup-button emoji-button",
      icon: "sprite-fm-theme icon-emoji",
      iconHovered: "sprite-fm-theme icon-emoji-active",
      disabled: this.props.disabled
    }, JSX_(emojiDropdown.A, {
      className: "popup emoji",
      vertOffset: 17,
      onClick: this.onEmojiClicked
    })), JSX_("hr", null), JSX_(perfectScrollbar.O, {
      chatRoom: self.props.chatRoom,
      className: "chat-textarea-scroll textarea-scroll",
      options: {
        'suppressScrollX': true
      },
      style: textareaScrollBlockStyles,
      ref: ref => {
        self.textareaScroll = ref;
      }
    }, JSX_("div", {
      className: "messages-textarea-placeholder"
    }, self.props.text ? null : JSX_(utils.zT, null, (l[18763] || `Write message to \u201c%s\u201d\u2026`).replace('%s', room.getRoomTitle()))), JSX_("textarea", {
      className: `
                                ${"messages-textarea"}
                                ${disabledTextarea ? 'disabled' : ''}
                            `,
      onKeyUp: this.onTypeAreaKeyUp,
      onKeyDown: this.onTypeAreaKeyDown,
      onBlur: this.onTypeAreaBlur,
      onChange: this.onTypeAreaChange,
      onCopyCapture: this.onCopyCapture,
      onPasteCapture: this.onPasteCapture,
      onCutCapture: this.onCutCapture,
      value: self.props.text,
      style: textareaStyles,
      disabled: disabledTextarea,
      readOnly: disabledTextarea
    }), JSX_("div", {
      className: "message-preview"
    }))), buttons);
  }
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "handleWindowResize", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "handleWindowResize"), _class.prototype), _class);

 },

 4907
(_, EXP_, REQ_) {

// ESM COMPAT FLAG
REQ_.r(EXP_);

// EXPORTS
REQ_.d(EXP_, {
  "default": () =>  leftPanel
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/chat/ui/searchPanel/utils.jsx
const STATUS = {
  IN_PROGRESS: 1,
  PAUSED: 2,
  COMPLETED: 3
};
const EVENTS = {
  RESULT_OPEN: 'chatSearchResultOpen',
  KEYDOWN: 'keydown'
};
const ACTIONS = {
  PAUSE: 'pause',
  RESUME: 'resume'
};
const TYPE = {
  MESSAGE: 1,
  CHAT: 2,
  MEMBER: 3,
  NIL: 4
};
const LABEL = {
  MESSAGES: l[6868],
  CONTACTS_AND_CHATS: l[20174],
  NO_RESULTS: l[8674],
  SEARCH_MESSAGES_CTA: l[23547],
  SEARCH_MESSAGES_INLINE: l[23548],
  DECRYPTING_RESULTS: l[23543],
  PAUSE_SEARCH: l[23544],
  SEARCH_PAUSED: l[23549],
  SEARCH_COMPLETE: l[23546]
};
;// ./js/chat/ui/searchPanel/searchField.jsx
let _SearchField;



const SEARCH_STATUS_CLASS = 'search-field-status';
const BASE_ICON_CLASS = 'sprite-fm-mono';
class SearchField extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      hovered: false
    };
    this.renderStatusBanner = () => {
      switch (this.props.status) {
        case STATUS.IN_PROGRESS:
          return JSX_("div", {
            className: `${SEARCH_STATUS_CLASS} searching info`
          }, LABEL.DECRYPTING_RESULTS);
        case STATUS.PAUSED:
          return JSX_("div", {
            className: `${SEARCH_STATUS_CLASS} paused info`
          }, LABEL.SEARCH_PAUSED);
        case STATUS.COMPLETED:
          return JSX_("div", {
            className: `${SEARCH_STATUS_CLASS} complete success`
          }, LABEL.SEARCH_COMPLETE);
        default:
          return null;
      }
    };
    this.renderStatusControls = () => {
      const {
        status,
        onToggle
      } = this.props;
      const handleHover = () => this.setState(state => ({
        hovered: !state.hovered
      }));
      switch (status) {
        case STATUS.IN_PROGRESS:
          return JSX_("div", {
            className: "progress-controls",
            onClick: onToggle
          }, JSX_("i", {
            className: `${BASE_ICON_CLASS} icon-pause`
          }));
        case STATUS.PAUSED:
          return JSX_("i", {
            className: `${BASE_ICON_CLASS} icon-resume`,
            onClick: onToggle,
            onMouseOver: handleHover,
            onMouseOut: handleHover
          });
        case STATUS.COMPLETED:
          return null;
        default:
          return null;
      }
    };
  }
  componentDidMount() {
    super.componentDidMount();
    SearchField.focus();
  }
  render() {
    const {
      value,
      searching,
      status,
      onChange,
      onReset
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      className: "search-field"
    }, JSX_("i", {
      className: `${BASE_ICON_CLASS} icon-preview-reveal search-icon-find`
    }), JSX_("input", {
      type: "search",
      autoComplete: "off",
      placeholder: l[102],
      ref: SearchField.inputRef,
      value,
      onChange: ev => {
        if (this.state.hovered) {
          this.setState({
            hovered: false
          });
        }
        onChange(ev);
      }
    }), searching && JSX_("i", {
      className: `
                            ${BASE_ICON_CLASS}
                            icon-close-component
                            search-icon-reset
                        `,
      onClick: onReset
    }), searching && status && JSX_(REaCt().Fragment, null, this.renderStatusControls(), this.renderStatusBanner()));
  }
}
_SearchField = SearchField;
SearchField.inputRef = REaCt().createRef();
SearchField.select = () => {
  const inputElement = _SearchField.inputRef && _SearchField.inputRef.current;
  const value = inputElement && inputElement.value;
  if (inputElement && value) {
    inputElement.selectionStart = 0;
    inputElement.selectionEnd = value.length;
  }
};
SearchField.focus = () => _SearchField.inputRef && _SearchField.inputRef.current && _SearchField.inputRef.current.focus();
SearchField.hasValue = () => _SearchField.inputRef && _SearchField.inputRef.current && !!_SearchField.inputRef.current.value.length;
SearchField.isVisible = () => _SearchField.inputRef && _SearchField.inputRef.current && elementIsVisible(_SearchField.inputRef.current);
;// ./js/chat/ui/searchPanel/resultTable.jsx

const ResultTable = ({
  heading,
  children
}) => {
  return JSX_("div", {
    className: `result-table ${heading ? '' : 'nil'}`
  }, heading ? JSX_("div", {
    className: "result-table-heading"
  }, heading) : null, children);
};
 const resultTable = ResultTable;
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
;// ./js/chat/ui/searchPanel/resultRow.jsx







const RESULT_ROW_CLASS = 'result-table-row';
const USER_CARD_CLASS = 'user-card';
const roomIsGroup = room => room && room.type === 'group' || room.type === 'public';
const openResult = ({
  room,
  messageId,
  index
}, callback) => {
  document.dispatchEvent(new Event(EVENTS.RESULT_OPEN));
  if (isString(room)) {
    loadSubPage(`fm/chat/p/${room}`);
  } else if (room && room.chatId && !messageId) {
    const chatRoom = megaChat.getChatById(room.chatId);
    if (chatRoom) {
      loadSubPage(chatRoom.getRoomUrl());
    } else {
      loadSubPage(`/fm/chat/contacts/${room.chatId}`);
    }
  } else {
    loadSubPage(room.getRoomUrl());
    if (messageId) {
      room.scrollToMessageId(messageId, index);
    }
  }
  return callback && typeof callback === 'function' && callback();
};
const lastActivity = room => {
  if (!room.lastActivity || !room.ctime) {
    room = megaChat.getChatById(room.chatId);
  }
  if (room && room.lastActivity || room.ctime) {
    return room.lastActivity ? todayOrYesterday(room.lastActivity * 1000) ? getTimeMarker(room.lastActivity) : time2date(room.lastActivity, 17) : todayOrYesterday(room.ctime * 1000) ? getTimeMarker(room.ctime) : time2date(room.ctime, 17);
  }
  return l[8000];
};
class MessageRow extends mixins.w9 {
  render() {
    const {
      data,
      matches,
      room,
      index,
      onResultOpen
    } = this.props;
    const isGroup = roomIsGroup(room);
    const contact = room.getParticipantsExceptMe();
    const summary = room.messagesBuff.getRenderableSummary(data);
    const date = todayOrYesterday(data.delay * 1000) ? getTimeMarker(data.delay) : time2date(data.delay, 17);
    return JSX_("div", {
      ref: node => {
        this.domRef = node;
      },
      className: `
                    ${RESULT_ROW_CLASS}
                    message
                `,
      onClick: () => openResult({
        room,
        messageId: data.messageId,
        index
      }, () => onResultOpen(this.domRef))
    }, JSX_("div", {
      className: "message-result-avatar"
    }, isGroup && JSX_("div", {
      className: "chat-topic-icon"
    }, JSX_("i", {
      className: "sprite-fm-uni icon-chat-group"
    })), room.isNote && JSX_("div", {
      className: "note-chat-signifier"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-file-text-thin-outline note-chat-icon"
    })), room.type === 'private' && JSX_(contacts.eu, {
      contact: M.u[contact]
    })), JSX_("div", {
      className: "user-card"
    }, JSX_("span", {
      className: "title"
    }, isGroup && JSX_(utils.sp, null, room.getRoomTitle()), room.isNote && JSX_("span", null, l.note_label), room.type === 'private' && JSX_(contacts.uA, {
      contact: M.u[contact],
      overflow: true
    })), isGroup ? null : JSX_(contacts.i1, {
      contact: M.u[contact]
    }), JSX_("div", {
      className: "clear"
    }), JSX_("div", {
      className: "message-result-info"
    }, JSX_("div", {
      className: "summary"
    }, JSX_(utils.oM, {
      content: megaChat.highlight(summary, matches, true)
    })), JSX_("div", {
      className: "result-separator"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-dot"
    })), JSX_("span", {
      className: "date"
    }, date))));
  }
}
class ChatRow extends mixins.w9 {
  render() {
    const {
      room,
      matches,
      onResultOpen
    } = this.props;
    const result = megaChat.highlight(megaChat.html(room.getRoomTitle()), matches, true);
    return JSX_("div", {
      ref: node => {
        this.domRef = node;
      },
      className: RESULT_ROW_CLASS,
      onClick: () => openResult({
        room
      }, () => onResultOpen(this.domRef))
    }, JSX_("div", {
      className: "chat-topic-icon"
    }, JSX_("i", {
      className: "sprite-fm-uni icon-chat-group"
    })), JSX_("div", {
      className: USER_CARD_CLASS
    }, JSX_("div", {
      className: "graphic"
    }, JSX_(utils.oM, null, result)), JSX_("div", {
      className: "result-last-activity"
    }, lastActivity(room))), JSX_("div", {
      className: "clear"
    }));
  }
}
class MemberRow extends mixins.w9 {
  render() {
    const {
      data,
      matches,
      room,
      contact,
      onResultOpen
    } = this.props;
    const isGroup = room && roomIsGroup(room);
    return JSX_("div", {
      ref: node => {
        this.domRef = node;
      },
      className: RESULT_ROW_CLASS,
      onClick: () => openResult({
        room: room || contact.h
      }, () => onResultOpen(this.domRef))
    }, isGroup ? JSX_("div", {
      className: "chat-topic-icon"
    }, JSX_("i", {
      className: "sprite-fm-uni icon-chat-group"
    })) : JSX_(contacts.eu, {
      contact
    }), JSX_("div", {
      className: USER_CARD_CLASS
    }, JSX_("div", {
      className: "graphic"
    }, isGroup ? JSX_(utils.oM, null, megaChat.highlight(megaChat.html(room.getRoomTitle()), matches, true)) : JSX_(REaCt().Fragment, null, JSX_(utils.oM, null, megaChat.highlight(megaChat.html(nicknames.getNickname(data)), matches, true)), JSX_(contacts.i1, {
      contact
    }))), lastActivity(room)), JSX_("div", {
      className: "clear"
    }));
  }
}
const NilRow = ({
  onSearchMessages,
  isFirstQuery
}) => {
  const label = LABEL.SEARCH_MESSAGES_INLINE.replace('[A]', '<a>').replace('[/A]', '</a>');
  return JSX_("div", {
    className: `
                ${RESULT_ROW_CLASS}
                nil
            `
  }, JSX_("div", {
    className: "nil-container"
  }, JSX_("i", {
    className: "sprite-fm-mono icon-preview-reveal"
  }), JSX_("span", null, LABEL.NO_RESULTS), isFirstQuery && JSX_("div", {
    className: "search-messages",
    onClick: onSearchMessages
  }, JSX_(utils.oM, {
    tag: "div",
    content: label
  }))));
};
class ResultRow extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.setActive = nodeRef => {
      if (nodeRef) {
        const elements = document.querySelectorAll(`.${RESULT_ROW_CLASS}.${"active"}`);
        for (let i = elements.length; i--;) {
          elements[i].classList.remove('active');
        }
        nodeRef.classList.add("active");
      }
    };
  }
  render() {
    const {
      type,
      result,
      children,
      onSearchMessages,
      isFirstQuery
    } = this.props;
    if (result) {
      const {
        data,
        index,
        matches,
        room
      } = result;
      const PROPS = {
        data,
        index,
        matches,
        room,
        onResultOpen: this.setActive
      };
      switch (type) {
        case TYPE.MESSAGE:
          return JSX_(MessageRow, PROPS);
        case TYPE.CHAT:
          return JSX_(ChatRow, PROPS);
        case TYPE.MEMBER:
          return JSX_(MemberRow, (0,esm_extends.A)({}, PROPS, {
            contact: M.u[data]
          }));
        default:
          return JSX_("div", {
            className: RESULT_ROW_CLASS
          }, children);
      }
    }
    return JSX_(NilRow, {
      onSearchMessages,
      isFirstQuery
    });
  }
}
;// ./js/chat/ui/searchPanel/resultContainer.jsx




class ResultContainer extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.renderResults = (results, status, isFirstQuery, onSearchMessages) => {
      if (status === STATUS.COMPLETED && results.length < 1) {
        return JSX_(resultTable, null, JSX_(ResultRow, {
          type: TYPE.NIL,
          isFirstQuery,
          onSearchMessages
        }));
      }
      const RESULT_TABLE = {
        CONTACTS_AND_CHATS: [],
        MESSAGES: []
      };
      for (const resultTypeGroup in results) {
        if (results.hasOwnProperty(resultTypeGroup)) {
          const len = results[resultTypeGroup].length;
          for (let i = 0; i < len; i++) {
            const result = results[resultTypeGroup].getItem(i);
            const {
              MESSAGE,
              MEMBER,
              CHAT
            } = TYPE;
            const {
              resultId,
              type
            } = result;
            const table = type === MESSAGE ? 'MESSAGES' : 'CONTACTS_AND_CHATS';
            RESULT_TABLE[table] = [...RESULT_TABLE[table], JSX_(ResultRow, {
              key: resultId,
              type: type === MESSAGE ? MESSAGE : type === MEMBER ? MEMBER : CHAT,
              result
            })];
          }
        }
      }
      return Object.keys(RESULT_TABLE).map((key, index) => {
        const table = {
          ref: RESULT_TABLE[key],
          hasRows: RESULT_TABLE[key] && RESULT_TABLE[key].length,
          isEmpty: RESULT_TABLE[key] && RESULT_TABLE[key].length < 1,
          props: {
            key: index,
            heading: key === 'MESSAGES' ? LABEL.MESSAGES : LABEL.CONTACTS_AND_CHATS
          }
        };
        if (table.hasRows) {
          return JSX_(resultTable, table.props, table.ref.map(row => row));
        }
        if (status === STATUS.COMPLETED && key === 'MESSAGES') {
          const SEARCH_MESSAGES = JSX_("button", {
            className: "search-messages mega-button",
            onClick: onSearchMessages
          }, JSX_("span", null, LABEL.SEARCH_MESSAGES_CTA));
          const NO_RESULTS = JSX_(ResultRow, {
            type: TYPE.NIL,
            isFirstQuery,
            onSearchMessages
          });
          return JSX_(resultTable, table.props, isFirstQuery ? SEARCH_MESSAGES : NO_RESULTS);
        }
        return null;
      });
    };
  }
  render() {
    const {
      results,
      status,
      isFirstQuery,
      onSearchMessages
    } = this.props;
    return this.renderResults(results, status, isFirstQuery, onSearchMessages);
  }
}
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/chat/ui/searchPanel/searchPanel.jsx






const SEARCH_PANEL_CLASS = `search-panel`;
class SearchPanel extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = (0,external_React_.createRef)();
    this.wrapperRef = null;
    this.state = {
      value: '',
      searching: false,
      status: undefined,
      isFirstQuery: true,
      results: []
    };
    this.unbindEvents = () => {
      if (this.pageChangeListener) {
        mBroadcaster.removeListener(this.pageChangeListener);
      }
      document.removeEventListener(EVENTS.RESULT_OPEN, this.doPause);
      document.removeEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
      megaChat.plugins.chatdIntegration.chatd.off('onClose.search');
      megaChat.plugins.chatdIntegration.chatd.off('onOpen.search');
    };
    this.bindEvents = () => {
      this.pageChangeListener = mBroadcaster.addListener('pagechange', this.doPause);
      document.addEventListener(EVENTS.RESULT_OPEN, this.doPause);
      document.addEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
      megaChat.plugins.chatdIntegration.chatd.rebind('onClose.search', () => this.state.searching && this.doToggle(ACTIONS.PAUSE));
      megaChat.plugins.chatdIntegration.chatd.rebind('onOpen.search', () => this.state.searching && this.doToggle(ACTIONS.RESUME));
    };
    this.doPause = () => {
      if (this.state.status === STATUS.IN_PROGRESS) {
        this.doToggle(ACTIONS.PAUSE);
      }
    };
    this.doSearch = (s, searchMessages) => {
      return ChatSearch.doSearch(s, (room, result, results) => this.setState({
        results
      }), searchMessages).catch(ex => d && console.error('Search failed (or was reset)', ex)).always(() => this.setState({
        status: STATUS.COMPLETED
      }));
    };
    this.doToggle = (action) => {
      const {
        IN_PROGRESS,
        PAUSED,
        COMPLETED
      } = STATUS;
      const searching = this.state.status === IN_PROGRESS || this.state.status === PAUSED;
      if (action && searching) {
        const chatSearch = ChatSearch.doSearch.cs;
        if (!chatSearch) {
          return delay('chat-toggle', () => this.doToggle(action), 600);
        }
        this.setState({
          status: action === ACTIONS.PAUSE ? PAUSED : action === ACTIONS.RESUME ? IN_PROGRESS : COMPLETED
        }, () => chatSearch[action]());
      }
    };
    this.doDestroy = () => ChatSearch && ChatSearch.doSearch && ChatSearch.doSearch.cs && ChatSearch.doSearch.cs.destroy();
    this.handleKeyDown = ev => {
      const {
        keyCode
      } = ev;
      if (keyCode && keyCode === 27) {
        return SearchField.hasValue() ? this.handleReset() : this.doPause();
      }
    };
    this.handleChange = ev => {
      if (SearchField.isVisible()) {
        const {
          value
        } = ev.target;
        const searching = value.length > 0;
        this.doDestroy();
        this.setState({
          value,
          searching,
          status: undefined,
          isFirstQuery: true,
          results: []
        }, () => {
          if (searching) {
            delay('chat-search', () => this.doSearch(value, false), 1600);
            if ($.dialog === 'onboardingDialog') {
              closeDialog();
            }
          } else {
            megaChat.plugins.chatOnboarding.checkAndShowStep();
          }
        });
        this.wrapperRef.scrollToY(0);
      }
    };
    this.handleToggle = () => {
      const inProgress = this.state.status === STATUS.IN_PROGRESS;
      this.setState({
        status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
      }, () => {
        delay('chat-toggled', () => SearchField.focus());
        return this.doToggle(inProgress ? ACTIONS.PAUSE : ACTIONS.RESUME);
      });
    };
    this.handleReset = () => this.setState({
      value: '',
      searching: false,
      status: undefined,
      results: []
    }, () => {
      this.wrapperRef.scrollToY(0);
      onIdle(() => SearchField.focus());
      this.doDestroy();
    });
    this.handleSearchMessages = () => SearchField.hasValue() && this.setState({
      status: STATUS.IN_PROGRESS,
      isFirstQuery: false
    }, () => {
      this.doSearch(this.state.value, true);
      SearchField.focus();
      SearchField.select();
    });
  }
  componentDidMount() {
    super.componentDidMount();
    this.bindEvents();
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.unbindEvents();
  }
  render() {
    const {
      value,
      searching,
      status,
      isFirstQuery,
      results
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${SEARCH_PANEL_CLASS}
                    ${searching ? 'expanded' : ''}
                `
    }, JSX_(SearchField, {
      value,
      searching,
      status,
      onChange: this.handleChange,
      onToggle: this.handleToggle,
      onReset: this.handleReset
    }), JSX_(perfectScrollbar.O, {
      className: "search-results-wrapper",
      ref: wrapper => {
        this.wrapperRef = wrapper;
      },
      options: {
        'suppressScrollX': true
      }
    }, searching && JSX_(ResultContainer, {
      status,
      results,
      isFirstQuery,
      onSearchMessages: this.handleSearchMessages
    })));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/meetings/button.jsx
const meetings_button = REQ_(6740);
// EXTERNAL MODULE: ./js/chat/ui/leftPanel/utils.jsx
const leftPanel_utils = REQ_(4664);
;// ./js/chat/ui/leftPanel/navigation.jsx



const Navigation = ({
  view,
  views: {
    CHATS,
    MEETINGS
  },
  routingSection,
  unreadChats,
  unreadMeetings,
  contactRequests,
  renderView
}) => JSX_("div", {
  className: `${leftPanel_utils.C}-nav`
}, JSX_("div", {
  className: `
                    ${leftPanel_utils.C}-nav-container
                    ${leftPanel_utils.C}-chats-tab
                    ${view === CHATS && routingSection === 'chat' ? 'active' : ''}
                `,
  onClick: () => {
    renderView(CHATS);
    eventlog(500233);
  }
}, JSX_(meetings_button.A, {
  unreadChats,
  className: `${leftPanel_utils.C}-nav-button`,
  icon: "icon-chat-filled"
}, !!unreadChats && JSX_("div", {
  className: "notifications-count"
})), JSX_("span", null, l.chats)), JSX_("div", {
  className: `
                    ${leftPanel_utils.C}-nav-container
                    ${leftPanel_utils.C}-meetings-tab
                    ${view === MEETINGS && routingSection === 'chat' ? 'active' : ''}
                `,
  onClick: () => {
    renderView(MEETINGS);
    eventlog(500234);
  }
}, JSX_(meetings_button.A, {
  unreadMeetings,
  className: `${leftPanel_utils.C}-nav-button`,
  icon: "icon-video-call-filled"
}, !!unreadMeetings && JSX_("div", {
  className: "notifications-count"
})), JSX_("span", null, l.meetings)), is_eplusplus || is_chatlink ? null : JSX_("div", {
  className: `
                        ${leftPanel_utils.C}-nav-container
                        ${leftPanel_utils.C}-contacts-tab
                        ${routingSection === 'contacts' ? 'active' : ''}
                    `,
  onClick: () => {
    loadSubPage('fm/chat/contacts');
    eventlog(500296);
  }
}, JSX_(meetings_button.A, {
  className: `${leftPanel_utils.C}-nav-button`,
  contactRequests,
  icon: "icon-contacts"
}, !!contactRequests && JSX_("div", {
  className: "notifications-count"
})), JSX_("span", null, l[165])));
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const dropdowns = REQ_(1510);
;// ./js/chat/ui/leftPanel/actions.jsx




const Actions = ({
  view,
  views,
  filter,
  routingSection,
  startMeeting,
  scheduleMeeting,
  createNewChat,
  onFilter
}) => {
  const {
    CHATS,
    MEETINGS,
    LOADING
  } = views;
  if (is_eplusplus || is_chatlink) {
    return null;
  }
  return JSX_("div", {
    className: `${leftPanel_utils.C}-action-buttons`
  }, view === LOADING && JSX_(buttons.$, {
    className: "mega-button action loading-sketch"
  }, JSX_("i", null), JSX_("span", null)), view === CHATS && routingSection !== 'contacts' && JSX_(REaCt().Fragment, null, JSX_(buttons.$, {
    className: "mega-button small positive new-chat-action",
    label: l.add_chat,
    onClick: () => {
      createNewChat();
      eventlog(500284);
    }
  }), JSX_("div", {
    className: "lhp-filter"
  }, JSX_("div", {
    className: "lhp-filter-control"
  }, JSX_(buttons.$, {
    icon: "sprite-fm-mono icon-sort-thin-solid"
  }, JSX_(dropdowns.ms, {
    className: "light",
    noArrow: "true"
  }, JSX_(dropdowns.tJ, {
    className: "link-button",
    icon: "sprite-fm-mono icon-eye-reveal",
    label: l.filter_unread,
    onClick: () => onFilter(leftPanel_utils.x.UNREAD)
  }), JSX_(dropdowns.tJ, {
    className: "link-button",
    icon: "sprite-fm-mono icon-notification-off",
    label: view === MEETINGS ? l.filter_muted__meetings : l.filter_muted__chats,
    onClick: () => onFilter(leftPanel_utils.x.MUTED)
  })))), filter && JSX_(REaCt().Fragment, null, filter === leftPanel_utils.x.MUTED && JSX_("div", {
    className: "lhp-filter-tag",
    onClick: () => onFilter(leftPanel_utils.x.MUTED)
  }, JSX_("span", null, view === MEETINGS ? l.filter_muted__meetings : l.filter_muted__chats), JSX_("i", {
    className: "sprite-fm-mono icon-close-component"
  })), filter === leftPanel_utils.x.UNREAD && JSX_("div", {
    className: "lhp-filter-tag",
    onClick: () => onFilter(leftPanel_utils.x.UNREAD)
  }, JSX_("span", null, l.filter_unread), JSX_("i", {
    className: "sprite-fm-mono icon-close-component"
  }))))), view === MEETINGS && routingSection !== 'contacts' && JSX_(buttons.$, {
    className: "mega-button small positive new-meeting-action",
    label: l.new_meeting
  }, JSX_("i", {
    className: "dropdown-indicator sprite-fm-mono icon-arrow-down"
  }), JSX_(dropdowns.ms, {
    className: "light",
    noArrow: "true",
    vertOffset: 4,
    positionMy: "left top",
    positionAt: "left bottom"
  }, JSX_(dropdowns.tJ, {
    className: "link-button",
    icon: "sprite-fm-mono icon-video-plus",
    label: l.new_meeting_start,
    onClick: startMeeting
  }), JSX_("hr", null), JSX_(dropdowns.tJ, {
    className: "link-button",
    icon: "sprite-fm-mono icon-calendar2",
    label: l.schedule_meeting_start,
    onClick: scheduleMeeting
  }))), routingSection === 'contacts' && JSX_(buttons.$, {
    className: "mega-button small positive",
    label: l[71],
    onClick: () => {
      contactAddDialog();
      eventlog(500285);
    }
  }));
};
 const actions = Actions;
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
;// ./js/chat/ui/leftPanel/conversationsListItem.jsx

let _dec, _dec2, _class;




const ConversationsListItem = (_dec = utils.Ay.SoonFcWrap(40, true), _dec2 = (0,mixins.N9)(0.7, 8), _class = class ConversationsListItem extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      isLoading: true
    };
  }
  isLoading() {
    const mb = this.props.chatRoom.messagesBuff;
    if (mb.haveMessages) {
      return false;
    }
    return mb.messagesHistoryIsLoading() || mb.joined === false && mb.isDecrypting;
  }
  specShouldComponentUpdate() {
    return !this.state.isLoading;
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.chatRoom.unbind('onUnreadCountUpdate.conversationsListItem');
  }
  componentDidMount() {
    super.componentDidMount();
    this.eventuallyScrollTo();
    const promise = this.isLoading();
    if (promise && promise.always) {
      promise.always(() => {
        if (this.isMounted()) {
          this.setState({
            isLoading: false
          });
        }
      });
    } else if (promise === false) {
      this.setState({
        isLoading: false
      });
    }
    this.props.chatRoom.rebind('onUnreadCountUpdate.conversationsListItem', () => {
      this.safeForceUpdate();
    });
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    this.eventuallyScrollTo();
  }
  eventuallyScrollTo() {
    const chatRoom = this.props.chatRoom || false;
    if (chatRoom._scrollToOnUpdate) {
      if (chatRoom.isCurrentlyActive) {
        chatRoom.scrollToChat();
      } else {
        chatRoom._scrollToOnUpdate = false;
      }
    }
  }
  getConversationTimestamp() {
    const {
      chatRoom
    } = this.props;
    if (chatRoom) {
      const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
      const timestamp = lastMessage && lastMessage.delay || chatRoom.ctime;
      return todayOrYesterday(timestamp * 1000) ? getTimeMarker(timestamp) : time2date(timestamp, 17);
    }
    return null;
  }
  getScheduledDateTime() {
    const {
      scheduledMeeting
    } = this.props.chatRoom;
    if (scheduledMeeting) {
      const {
        nextOccurrenceStart,
        nextOccurrenceEnd
      } = scheduledMeeting;
      return {
        date: time2date(nextOccurrenceStart / 1000, 19),
        startTime: toLocaleTime(nextOccurrenceStart),
        endTime: toLocaleTime(nextOccurrenceEnd)
      };
    }
  }
  render() {
    let classString = "";
    const {chatRoom} = this.props;
    if (!chatRoom || !chatRoom.chatId) {
      return null;
    }
    const roomId = chatRoom.chatId;
    if (chatRoom.isCurrentlyActive) {
      classString += " active";
    }
    let nameClassString = "user-card-name conversation-name selectable-txt";
    let contactId;
    let id;
    let contact;
    if (chatRoom.type === 'private') {
      const handle = chatRoom.getParticipantsExceptMe()[0];
      contact = handle ? M.u[handle] : M.u[u_handle];
      id = `conversation_${htmlentities(contact.u)}`;
    } else if (chatRoom.type === 'group') {
      contactId = roomId;
      id = `conversation_${contactId}`;
      classString += ' groupchat';
    } else if (chatRoom.type === 'public') {
      contactId = roomId;
      id = `conversation_${contactId}`;
      classString += ' groupchat public';
    } else {
      return `Unknown room type for ${chatRoom.roomId}`;
    }
    const unreadCount = chatRoom.messagesBuff.getUnreadCount();
    let isUnread = false;
    const notificationItems = [];
    if (chatRoom.havePendingCall() && chatRoom.state !== ChatRoom.STATE.LEFT) {
      notificationItems.push(JSX_("i", {
        className: "tiny-icon white-handset",
        key: "callIcon"
      }));
    }
    if (unreadCount > 0) {
      notificationItems.push(JSX_("span", {
        key: "unreadCounter"
      }, unreadCount > 9 ? "9+" : unreadCount));
      isUnread = true;
    }
    let lastMessageDiv = null;
    const showHideMsg = mega.config.get('showHideChat');
    const lastMessage = showHideMsg ? '' : chatRoom.messagesBuff.getLatestTextMessage();
    let lastMsgDivClasses;
    if (lastMessage) {
      lastMsgDivClasses = `conversation-message${  isUnread ? " unread" : ""}`;
      const renderableSummary = chatRoom.messagesBuff.getRenderableSummary(lastMessage);
      if (chatRoom.havePendingCall() || chatRoom.haveActiveCall()) {
        lastMsgDivClasses += " call";
        classString += " call-exists";
      }
      lastMessageDiv = JSX_("div", {
        className: lastMsgDivClasses
      }, JSX_(utils.P9, null, renderableSummary));
      if (lastMessage.textContents && lastMessage.textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP && lastMessage.getAttachmentMeta()[0]) {
        const playTime = secondsToTimeShort(lastMessage.getAttachmentMeta()[0].playtime);
        lastMessageDiv = JSX_("div", {
          className: lastMsgDivClasses
        }, JSX_("i", {
          className: "sprite-fm-mono icon-audio-filled voice-message-icon"
        }), playTime);
      }
      if (lastMessage.metaType && lastMessage.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION) {
        lastMessageDiv = JSX_("div", {
          className: lastMsgDivClasses
        }, JSX_("i", {
          className: "sprite-fm-mono icon-location geolocation-icon"
        }), l[20789]);
      }
    } else {
      lastMsgDivClasses = "conversation-message";
      lastMessageDiv = showHideMsg ? '' : JSX_("div", {
        className: lastMsgDivClasses
      }, this.state.isLoading ? l[7006] : l[8000]);
    }
    if (chatRoom.type !== 'public') {
      nameClassString += ' privateChat';
    }
    let roomTitle = JSX_(utils.oM, null, megaChat.html(chatRoom.getRoomTitle()));
    if (chatRoom.type === 'private') {
      roomTitle = megaChat.WITH_SELF_NOTE && chatRoom.isNote ? JSX_("span", {
        className: "note-chat-label"
      }, l.note_label) : JSX_("span", null, JSX_("div", {
        className: "user-card-wrapper"
      }, JSX_(utils.oM, null, megaChat.html(chatRoom.getRoomTitle()))));
    }
    nameClassString += chatRoom.type === "private" || chatRoom.type === "group" ? ' badge-pad' : '';
    const {
      scheduledMeeting,
      isMeeting
    } = chatRoom;
    const isUpcoming = scheduledMeeting && scheduledMeeting.isUpcoming;
    const {
      startTime,
      endTime
    } = this.getScheduledDateTime() || {};
    const isEmptyNote = chatRoom.isNote && !chatRoom.hasMessages();
    return JSX_("li", {
      ref: this.domRef,
      id,
      className: `
                    ${classString}
                    ${isUpcoming ? 'upcoming-conversation' : ''}
                    ${this.props.className || ''}
                `,
      "data-room-id": roomId,
      "data-jid": contactId,
      onClick: ev => {
        let _this$props$onConvers, _this$props;
        return ((_this$props$onConvers = (_this$props = this.props).onConversationClick) == null ? void 0 : _this$props$onConvers.call(_this$props, ev)) || loadSubPage(chatRoom.getRoomUrl(false));
      }
    }, JSX_("div", {
      className: "conversation-avatar"
    }, (chatRoom.type === 'group' || chatRoom.type === 'public') && JSX_("div", {
      className: `
                                chat-topic-icon
                                ${isMeeting ? 'meeting-icon' : ''}
                            `
    }, JSX_("i", {
      className: isMeeting ? 'sprite-fm-mono icon-video-call-filled' : 'sprite-fm-uni icon-chat-group'
    })), chatRoom.type === 'private' && contact && chatRoom.isNote ? JSX_("div", {
      className: `
                                    note-chat-signifier
                                    ${isEmptyNote ? 'note-chat-empty' : ''}
                                `
    }, JSX_("i", {
      className: "sprite-fm-mono icon-file-text-thin-outline note-chat-icon"
    })) : JSX_(contacts.eu, {
      contact
    })), JSX_("div", {
      className: "conversation-data"
    }, JSX_("div", {
      className: "conversation-data-top"
    }, JSX_("div", {
      className: `conversation-data-name ${nameClassString}`
    }, roomTitle, chatRoom.isMuted() ? JSX_("i", {
      className: "sprite-fm-mono icon-notification-off-filled muted-conversation-icon"
    }) : null), chatRoom.isNote ? null : JSX_("div", {
      className: "conversation-data-badges"
    }, chatRoom.type === 'private' ? JSX_(contacts.i1, {
      contact
    }) : null, chatRoom.type === 'group' || chatRoom.type === 'private' ? JSX_("i", {
      className: "sprite-fm-uni icon-ekr-key simpletip",
      "data-simpletip": l[20935]
    }) : null, scheduledMeeting && scheduledMeeting.isUpcoming && scheduledMeeting.isRecurring && JSX_("i", {
      className: "sprite-fm-mono icon-repeat-thin-solid"
    }))), JSX_("div", {
      className: "clear"
    }), isUpcoming ? JSX_("div", {
      className: "conversation-message-info"
    }, JSX_("div", {
      className: "conversation-scheduled-data"
    }, JSX_("span", null, startTime), JSX_("span", null, "\xA0 - \xA0"), JSX_("span", null, endTime)), JSX_("div", {
      className: "conversation-scheduled-data"
    }, notificationItems.length > 0 ? JSX_("div", {
      className: `
                                            unread-messages
                                            items-${notificationItems.length}
                                            unread-upcoming
                                            ${unreadCount > 9 && notificationItems.length > 1 ? 'unread-spaced' : ''}
                                        `
    }, notificationItems) : null)) : JSX_("div", {
      className: "conversation-message-info"
    }, isEmptyNote ? null : lastMessageDiv)), isUpcoming || isEmptyNote ? null : JSX_("div", {
      className: "date-time-wrapper"
    }, JSX_("div", {
      className: "date-time"
    }, this.getConversationTimestamp()), notificationItems.length > 0 ? JSX_("div", {
      className: `
                                    unread-messages-container
                                    ${unreadCount > 9 && notificationItems.length > 1 ? 'unread-spaced' : ''}
                                `
    }, JSX_("div", {
      className: `unread-messages items-${notificationItems.length}`
    }, notificationItems)) : null));
  }
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "eventuallyScrollTo", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyScrollTo"), _class.prototype), (0,applyDecoratedDescriptor.A)(_class.prototype, "render", [_dec2], Object.getOwnPropertyDescriptor(_class.prototype, "render"), _class.prototype), _class);

;// ./js/chat/ui/leftPanel/conversationsList.jsx







const ConversationsList = ({
  conversations,
  className,
  children
}) => {
  return JSX_(perfectScrollbar.O, {
    className: "chat-lp-scroll-area",
    didMount: (id, ref) => {
      megaChat.$chatTreePanePs = [...megaChat.$chatTreePanePs, {
        id,
        ref
      }];
    },
    willUnmount: id => {
      megaChat.$chatTreePanePs = megaChat.$chatTreePanePs.filter(ref => ref.id !== id);
    },
    conversations
  }, JSX_("ul", {
    className: `
                    conversations-pane
                    ${className || ''}
                `
  }, children || conversations.map(c => c.roomId && JSX_(ConversationsListItem, (0,esm_extends.A)({
    key: c.roomId,
    chatRoom: c
  }, c.type === 'private' && {
    contact: M.u[c.getParticipantsExceptMe()[0]]
  })))));
};
const Chats = ({
  conversations,
  onArchivedClicked,
  filter
}) => {
  conversations = Object.values(conversations || {}).filter(c => !c.isMeeting && c.isDisplayable() && (!filter || filter === leftPanel_utils.x.UNREAD && c.messagesBuff.getUnreadCount() > 0 || filter === leftPanel_utils.x.MUTED && c.isMuted())).sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
  const noteChat = megaChat.getNoteChat();
  return JSX_(REaCt().Fragment, null, JSX_("div", {
    className: "conversations-holder"
  }, filter ? null : JSX_("div", {
    className: "conversations-category"
  }, JSX_("span", null, l.filter_heading__recent)), conversations && conversations.length >= 1 ? JSX_(ConversationsList, {
    conversations
  }, megaChat.WITH_SELF_NOTE && noteChat && noteChat.isDisplayable() ? filter ? null : JSX_(ConversationsListItem, {
    chatRoom: noteChat
  }) : null, conversations.map(c => c.roomId && !c.isNote && JSX_(ConversationsListItem, (0,esm_extends.A)({
    key: c.roomId,
    chatRoom: c
  }, c.type === 'private' && {
    contact: M.u[c.getParticipantsExceptMe()[0]]
  })))) : JSX_("div", {
    className: `
                            ${leftPanel_utils.C}-nil
                            ${filter ? `${leftPanel_utils.C}-nil--chats` : ''}
                        `
  }, filter ? JSX_(REaCt().Fragment, null, filter === leftPanel_utils.x.MUTED && JSX_(REaCt().Fragment, null, JSX_("i", {
    className: "sprite-fm-mono icon-notification-off-filled"
  }), JSX_("h3", null, l.filter_nil__muted_chats)), filter === leftPanel_utils.x.UNREAD && JSX_(REaCt().Fragment, null, JSX_("i", {
    className: "sprite-fm-mono icon-eye-thin-solid"
  }), JSX_("h3", null, l.filter_nil__unread_messages))) : JSX_("span", null, l.no_chats_lhp)), megaChat.WITH_SELF_NOTE && conversations && conversations.length === 1 && noteChat && JSX_(ConversationsList, {
    conversations
  }, JSX_(ConversationsListItem, {
    chatRoom: noteChat
  }))), JSX_("div", {
    className: `${leftPanel_utils.C}-bottom`
  }, JSX_("div", {
    className: `${leftPanel_utils.C}-bottom-control`
  }, JSX_("div", {
    className: "conversations-category",
    onClick: onArchivedClicked
  }, JSX_("span", null, l.filter_archived__chats), JSX_("i", {
    className: "sprite-fm-mono icon-arrow-right"
  })))));
};
const Archived = ({
  conversations,
  archivedUnmounting,
  onClose
}) => {
  const archivedChats = Object.values(conversations || {}).filter(c => !c.isMeeting && c.isArchived()).sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
  return JSX_("div", {
    className: `
                ${leftPanel_utils.C}-archived
                ${archivedUnmounting ? 'with-unmount-animation' : ''}
            `
  }, JSX_("div", {
    className: `${leftPanel_utils.C}-archived-head`
  }, JSX_(meetings_button.A, {
    className: "mega-button round",
    icon: "sprite-fm-mono icon-arrow-left-regular-outline",
    onClick: onClose
  }), JSX_("h2", null, l.filter_archived__chats)), JSX_("div", {
    className: `${leftPanel_utils.C}-archived-content`
  }, archivedChats && archivedChats.length ? JSX_(ConversationsList, {
    conversations: archivedChats
  }) : JSX_("div", {
    className: `${leftPanel_utils.C}-archived-empty`
  }, JSX_("i", {
    className: "sprite-fm-mono icon-archive"
  }), JSX_("h3", null, l.filter_archived__nil_chats))));
};
class Meetings extends mixins.w9 {
  constructor(props) {
    let _megaChat$getCurrentM;
    super(props);
    this.TABS = {
      UPCOMING: 0x00,
      PAST: 0x01
    };
    this.domRef = REaCt().createRef();
    this.ongoingRef = REaCt().createRef();
    this.navigationRef = REaCt().createRef();
    this.state = {
      tab: this.TABS.UPCOMING
    };
    this.Navigation = ({
      conversations
    }) => {
      const {
        UPCOMING,
        PAST
      } = this.TABS;
      const {
        tab
      } = this.state;
      const unreadMeetings = Object.values(conversations || {}).reduce((acc, curr) => {
        if (curr.isDisplayable() && curr.isMeeting && curr.messagesBuff.getUnreadCount()) {
          let _curr$scheduledMeetin;
          acc[(_curr$scheduledMeetin = curr.scheduledMeeting) != null && _curr$scheduledMeetin.isUpcoming ? UPCOMING : PAST]++;
        }
        return acc;
      }, {
        [UPCOMING]: 0,
        [PAST]: 0
      });
      return JSX_("div", {
        ref: this.navigationRef,
        className: `
                    ${leftPanel_utils.C}-meetings--navigation
                    ${this.props.leftPaneWidth < 230 ? 'narrow-width' : ''}
                `
      }, JSX_(meetings_button.A, {
        converstaions: conversations,
        className: `
                        mega-button
                        action
                        ${tab === UPCOMING ? 'is-active' : ''}
                    `,
        onClick: () => this.setState({
          tab: UPCOMING
        })
      }, JSX_("span", null, l.meetings_tab_upcoming, !!unreadMeetings[UPCOMING] && JSX_("div", {
        className: "notification-indication"
      }))), JSX_(meetings_button.A, {
        converstaions: conversations,
        className: `
                        mega-button
                        action
                        ${tab === PAST ? 'is-active' : ''}
                    `,
        onClick: () => this.setState({
          tab: PAST
        }, () => eventlog(500254))
      }, JSX_("span", null, l.meetings_tab_past, !!unreadMeetings[PAST] && JSX_("div", {
        className: "notification-indication"
      }))));
    };
    this.Holder = ({
      heading,
      className,
      children
    }) => JSX_("div", {
      className: `
                conversations-holder
                ${className || ''}
            `
    }, JSX_("div", {
      className: `
                    conversations-category
                `
    }, heading && JSX_("span", null, heading)), children);
    this.Ongoing = ({
      ongoingMeetings
    }) => ongoingMeetings != null && ongoingMeetings.length ? JSX_("div", {
      ref: this.ongoingRef,
      className: `${leftPanel_utils.C}-meetings--ongoing`
    }, JSX_("strong", null, l.happening_now), JSX_(ConversationsList, {
      conversations: ongoingMeetings
    })) : null;
    this.Upcoming = () => {
      const {
        upcomingMeetings,
        nextOccurrences
      } = megaChat.plugins.meetingsManager.filterUpcomingMeetings(this.props.conversations);
      const upcomingItem = chatRoom => JSX_(ConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom
      });
      return JSX_(this.Holder, null, upcomingMeetings && upcomingMeetings.length ? JSX_(ConversationsList, {
        conversations: upcomingMeetings
      }, nextOccurrences.today && nextOccurrences.today.length ? JSX_("div", {
        className: "conversations-group"
      }, JSX_("div", {
        className: "conversations-category category--label"
      }, JSX_("span", null, l.upcoming__today)), nextOccurrences.today.map(upcomingItem)) : null, nextOccurrences.tomorrow && nextOccurrences.tomorrow.length ? JSX_("div", {
        className: "conversations-group"
      }, JSX_("div", {
        className: "conversations-category category--label"
      }, JSX_("span", null, l.upcoming__tomorrow)), nextOccurrences.tomorrow.map(upcomingItem)) : null, Object.keys(nextOccurrences.rest).length ? Object.keys(nextOccurrences.rest).map(date => JSX_("div", {
        key: date,
        className: "conversations-group"
      }, JSX_("div", {
        className: "conversations-category category--label"
      }, JSX_("span", null, date)), nextOccurrences.rest[date].map(upcomingItem))) : null) : JSX_("div", {
        className: `${leftPanel_utils.C}-nil`
      }, JSX_("i", {
        className: "sprite-fm-mono icon-calendar-plus-thin-solid"
      }), JSX_("span", null, l.meetings_upcoming_nil)));
    };
    this.Past = () => {
      const conversations = Object.values(this.props.conversations || {});
      const pastMeetings = conversations.filter(c => {
        const {
          isCanceled,
          isPast,
          isCompleted
        } = c.scheduledMeeting || {};
        return c.isMeeting && c.isDisplayable() && (!c.scheduledMeeting || isCanceled || isPast || isCompleted) && !c.havePendingCall();
      }).sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
      const archivedMeetings = conversations.filter(c => c.isMeeting && c.isArchived()).sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
      return JSX_(this.Holder, null, JSX_(ConversationsList, {
        conversations: pastMeetings
      }, pastMeetings.length ? pastMeetings.map(chatRoom => chatRoom.roomId && JSX_(ConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom
      })) : JSX_("div", {
        className: `
                                ${leftPanel_utils.C}-nil
                                ${archivedMeetings.length ? 'half-sized' : ''}
                            `
      }, archivedMeetings.length ? JSX_("strong", null, l.meetings_past_nil_heading) : null, JSX_("i", {
        className: "sprite-fm-mono icon-video-thin-solid"
      }), JSX_("span", null, l.meetings_past_nil)), archivedMeetings.length ? JSX_(REaCt().Fragment, null, JSX_("div", {
        className: "archived-separator"
      }), JSX_("div", {
        className: "conversations-category category--label"
      }, JSX_("span", null, l.meetings_label_archived)), archivedMeetings.map(chatRoom => chatRoom.roomId && JSX_(ConversationsListItem, {
        key: chatRoom.roomId,
        chatRoom
      }))) : null));
    };
    this.getContainerStyles = ongoingMeetings => {
      if (ongoingMeetings != null && ongoingMeetings.length) {
        let _this$ongoingRef, _this$navigationRef;
        const ongoingHeight = (_this$ongoingRef = this.ongoingRef) == null || (_this$ongoingRef = _this$ongoingRef.current) == null ? void 0 : _this$ongoingRef.clientHeight;
        const navigationHeight = (_this$navigationRef = this.navigationRef) == null || (_this$navigationRef = _this$navigationRef.current) == null ? void 0 : _this$navigationRef.clientHeight;
        return {
          style: {
            maxHeight: `calc(100% - ${ongoingHeight + navigationHeight + 30}px)`
          }
        };
      }
      return null;
    };
    this.state.tab = this.TABS[(_megaChat$getCurrentM = megaChat.getCurrentMeeting()) != null && _megaChat$getCurrentM.isPast ? 'PAST' : 'UPCOMING'];
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    megaChat.off(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`);
  }
  componentDidMount() {
    super.componentDidMount();
    megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () => this.safeForceUpdate());
    megaChat.rebind(megaChat.plugins.meetingsManager.EVENTS.INITIALIZE, (ev, scheduledMeeting) => this.isMounted() && this.setState({
      tab: this.TABS[scheduledMeeting != null && scheduledMeeting.isPast ? 'PAST' : 'UPCOMING']
    }));
  }
  render() {
    const {
      UPCOMING,
      PAST
    } = this.TABS;
    const {
      tab
    } = this.state;
    const ongoingMeetings = Object.values(this.props.conversations || {}).filter(c => c.isDisplayable() && c.isMeeting && c.havePendingCall());
    return JSX_("div", {
      ref: this.domRef,
      className: `${leftPanel_utils.C}-meetings`
    }, JSX_(this.Ongoing, {
      ongoingMeetings
    }), JSX_(this.Navigation, {
      conversations: this.props.conversations
    }), JSX_("div", (0,esm_extends.A)({
      className: `
                        ${leftPanel_utils.C}-meetings--content
                        ${tab === UPCOMING ? 'is-upcoming' : ''}
                        ${tab === PAST ? 'is-past' : ''}
                    `
    }, this.getContainerStyles(ongoingMeetings)), tab === UPCOMING && JSX_(this.Upcoming, null), tab === PAST && JSX_(this.Past, null)));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/updateObserver.jsx
const updateObserver = REQ_(4372);
;// ./js/chat/ui/leftPanel/leftPanel.jsx









class LeftPanel extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.contactRequestsListener = undefined;
    this.fmConfigLeftPaneListener = undefined;
    this.state = {
      leftPaneWidth: Math.min(mega.config.get('leftPaneWidth') | 0, 400) || 384,
      archived: false,
      archivedUnmounting: false,
      filter: '',
      unreadChats: 0,
      unreadMeetings: 0,
      contactRequests: 0
    };
    this.toggleFilter = filter => {
      this.setState(state => ({
        filter: state.filter === filter ? '' : filter
      }), () => {
        Object.values(megaChat.$chatTreePanePs).map(({
          ref
        }) => ref.reinitialise == null ? void 0 : ref.reinitialise());
      });
    };
    this.state.contactRequests = Object.keys(M.ipc).length;
  }
  customIsEventuallyVisible() {
    return M.chat;
  }
  renderLoading() {
    return JSX_(REaCt().Fragment, null, JSX_("span", {
      className: "heading loading-sketch"
    }), JSX_("ul", {
      className: "conversations-pane loading-sketch"
    }, Array.from({
      length: this.props.conversations.length
    }, (el, i) => {
      return JSX_("li", {
        key: i
      }, JSX_("div", {
        className: "conversation-avatar"
      }, JSX_("div", {
        className: "chat-topic-icon"
      })), JSX_("div", {
        className: "conversation-data"
      }, JSX_("div", {
        className: "conversation-data-top"
      }), JSX_("div", {
        className: "conversation-message-info"
      }, JSX_("div", {
        className: "conversation-message"
      }))));
    })));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    megaChat.unbind(`onUnreadCountUpdate.${leftPanel_utils.C}`);
    mBroadcaster.removeListener(this.contactRequestsListener);
    mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
  }
  componentDidMount() {
    let _$$leftPaneResizable;
    super.componentDidMount();
    megaChat.rebind(`onUnreadCountUpdate.${leftPanel_utils.C}`, (ev, {
      unreadChats,
      unreadMeetings
    }) => {
      this.setState({
        unreadChats,
        unreadMeetings
      }, () => this.safeForceUpdate());
    });
    this.contactRequestsListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => this.setState({
      contactRequests: Object.keys(M.ipc).length
    }));
    $.leftPaneResizableChat = new FMResizablePane(this.domRef.current, {
      ...(_$$leftPaneResizable = $.leftPaneResizable) == null ? void 0 : _$$leftPaneResizable.options,
      minWidth: mega.flags.ab_ads ? 260 : 200
    });
    this.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', value => this.setState(state => ({
      leftPaneWidth: value || state.leftPaneWidth
    })));
  }
  render() {
    const {
      view,
      views,
      conversations,
      routingSection,
      renderView,
      startMeeting,
      scheduleMeeting,
      createNewChat
    } = this.props;
    const {
      CHATS,
      MEETINGS,
      LOADING
    } = views;
    return JSX_("div", (0,esm_extends.A)({
      ref: this.domRef,
      className: `
                    fm-left-panel
                    chat-lp-body
                    ${leftPanel_utils.C}-container
                    ${is_chatlink && 'hidden' || ''}
                    ${megaChat._joinDialogIsShown && 'hidden' || ''}
                `
    }, this.state.leftPaneWidth && {
      width: this.state.leftPaneWidth
    }), JSX_("div", {
      className: "left-pane-drag-handle"
    }), JSX_(SearchPanel, null), JSX_(Navigation, {
      view,
      views,
      routingSection,
      unreadChats: this.state.unreadChats,
      unreadMeetings: this.state.unreadMeetings,
      contactRequests: this.state.contactRequests,
      renderView: view => this.setState({
        filter: false
      }, () => renderView(view))
    }), JSX_(actions, {
      view,
      views,
      filter: this.state.filter,
      routingSection,
      startMeeting,
      scheduleMeeting,
      createNewChat,
      onFilter: this.toggleFilter
    }), this.state.archived && JSX_(Archived, {
      conversations,
      archivedUnmounting: this.state.archivedUnmounting,
      onClose: () => this.setState({
        archivedUnmounting: true
      }, () => tSleep(0.3).then(() => this.setState({
        archivedUnmounting: false,
        archived: false
      })))
    }), JSX_("div", {
      className: `
                        ${leftPanel_utils.C}-conversations
                        ${view === MEETINGS ? 'meetings-view' : ''}
                        ${view === CHATS ? 'chats-view' : ''}
                        conversations
                        content-panel
                        active
                    `
    }, view === LOADING ? this.renderLoading() : JSX_(REaCt().Fragment, null, view === MEETINGS && JSX_(Meetings, {
      conversations,
      leftPaneWidth: this.state.leftPaneWidth
    }), view === CHATS && JSX_(Chats, {
      conversations,
      filter: this.state.filter,
      onArchivedClicked: () => this.setState({
        archived: true,
        filter: false
      })
    }))));
  }
}
 const leftPanel = (0,mixins.Zz)(updateObserver.Y)(LeftPanel);

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

 5522
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  A: () =>  HistoryPanel
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
const mixin = REQ_(855);
;// ./js/chat/ui/messages/alterParticipants.jsx




class AltPartsConvMessage extends mixin.M {
  haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }
    const {
      included,
      excluded
    } = this.props.message.meta;
    return array.unique([...included || [], ...excluded || []]);
  }
  render() {
    const self = this;
    const {message} = this.props;
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    const datetime = JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt, 17)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    const messages = [];
    message.meta.included.forEach((h) => {
      const otherContact = M.u[h] ? M.u[h] : {
        'u': h,
        h,
        'c': 0
      };
      const avatar = JSX_(contacts.eu, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      const otherDisplayName = M.getNameByHandle(otherContact.u);
      const isSelfJoin = h === contact.u;
      let text = isSelfJoin ? l[23756] : l[8907];
      if (self.props.chatRoom.isMeeting) {
        text = isSelfJoin ? l.meeting_mgmt_user_joined : l.meeting_mgmt_user_added;
      }
      text = text.replace('%1', megaChat.html(otherDisplayName));
      if (!isSelfJoin) {
        text = text.replace('%2', `<strong>${megaChat.html(displayName)}</strong>`);
      }
      messages.push(JSX_("div", {
        className: "message body",
        "data-id": `id${  message.messageId}`,
        key: `${message.messageId  }_${  h}`
      }, avatar, JSX_("div", {
        className: "message content-area small-info-txt selectable-txt"
      }, JSX_(contacts.bq, {
        className: "message",
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        label: JSX_(utils.zT, null, otherDisplayName)
      }), datetime, JSX_("div", {
        className: "message text-block"
      }, JSX_(utils.P9, null, text)))));
    });
    message.meta.excluded.forEach((h) => {
      const otherContact = M.u[h] ? M.u[h] : {
        'u': h,
        h,
        'c': 0
      };
      const avatar = JSX_(contacts.eu, {
        contact: otherContact,
        chatRoom: self.props.chatRoom,
        className: "message avatar-wrapper small-rounded-avatar"
      });
      const otherDisplayName = M.getNameByHandle(otherContact.u);
      let text;
      if (otherContact.u === contact.u) {
        text = self.props.chatRoom.isMeeting ? l.meeting_mgmt_left : l[8908];
      } else {
        text = (self.props.chatRoom.isMeeting ? l.meeting_mgmt_kicked : l[8906]).replace("%s", `<strong>${megaChat.html(displayName)}</strong>`);
      }
      messages.push(JSX_("div", {
        className: "message body",
        "data-id": `id${  message.messageId}`,
        key: `${message.messageId  }_${  h}`
      }, avatar, JSX_("div", {
        className: "message content-area small-info-txt selectable-txt"
      }, JSX_(contacts.bq, {
        className: "message",
        chatRoom: self.props.chatRoom,
        contact: otherContact,
        label: JSX_(utils.zT, null, otherDisplayName)
      }), datetime, JSX_("div", {
        className: "message text-block"
      }, JSX_(utils.P9, null, text)))));
    });
    return JSX_("div", null, messages);
  }
}

;// ./js/chat/ui/messages/truncated.jsx




class TruncatedMessage extends mixin.M {
  render() {
    const self = this;
    let cssClasses = "message body";
    const {message} = this.props;
    const {chatRoom} = this.props.message;
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    let datetime = JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt, 17)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    let avatar = null;
    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = JSX_(contacts.eu, {
        contact,
        className: "message avatar-wrapper small-rounded-avatar",
        chatRoom
      });
      datetime = JSX_("div", {
        className: "message date-time simpletip",
        "data-simpletip": time2date(timestampInt, 17)
      }, timestamp);
    }
    return JSX_("div", {
      className: cssClasses,
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, avatar, JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_(contacts.bq, {
      contact,
      className: "message",
      label: JSX_(utils.zT, null, displayName),
      chatRoom
    }), datetime, JSX_("div", {
      className: "message text-block"
    }, l[8905])));
  }
}

;// ./js/chat/ui/messages/privilegeChange.jsx




class PrivilegeChange extends mixin.M {
  haveMoreContactListeners() {
    if (!this.props.message.meta || !this.props.message.meta.targetUserId) {
      return false;
    }
    const uid = this.props.message.meta.targetUserId;
    if (uid && M.u[uid]) {
      return uid;
    }
    return false;
  }
  render() {
    const self = this;
    const {message} = this.props;
    const {chatRoom} = this.props.message;
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    const datetime = JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt, 17)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    const messages = [];
    const otherContact = M.u[message.meta.targetUserId] ? M.u[message.meta.targetUserId] : {
      'u': message.meta.targetUserId,
      'h': message.meta.targetUserId,
      'c': 0
    };
    const avatar = JSX_(contacts.eu, {
      contact: otherContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom
    });
    const otherDisplayName = M.getNameByHandle(otherContact.u);
    let newPrivilegeText = "";
    if (message.meta.privilege === 3) {
      newPrivilegeText = l.priv_change_to_op;
    } else if (message.meta.privilege === 2) {
      newPrivilegeText = l.priv_change_to_std;
    } else if (message.meta.privilege === 0) {
      newPrivilegeText = l.priv_change_to_ro;
    }
    const text = newPrivilegeText.replace('[S]', '<strong>').replace('[/S]', '</strong>').replace('%s', `<strong>${megaChat.html(displayName)}</strong>`);
    messages.push(JSX_("div", {
      className: "message body",
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, avatar, JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_(contacts.bq, {
      className: "message",
      chatRoom: self.props.chatRoom,
      contact: otherContact,
      label: JSX_(utils.zT, null, otherDisplayName)
    }), datetime, JSX_("div", {
      className: "message text-block"
    }, JSX_(utils.P9, null, text)))));
    return JSX_("div", null, messages);
  }
}

;// ./js/chat/ui/messages/topicChange.jsx




class TopicChange extends mixin.M {
  render() {
    const self = this;
    const {message} = this.props;
    const {megaChat} = this.props.message.chatRoom;
    const {chatRoom} = this.props.message;
    if (message.meta.isScheduled) {
      return null;
    }
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    const datetime = JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(timestampInt, 17)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    const messages = [];
    const avatar = JSX_(contacts.eu, {
      contact,
      chatRoom,
      className: "message avatar-wrapper small-rounded-avatar"
    });
    const topic = megaChat.html(message.meta.topic);
    const oldTopic = megaChat.html(message.meta.oldTopic) || '';
    messages.push(JSX_("div", {
      className: "message body",
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, avatar, JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_(contacts.bq, {
      className: "message",
      chatRoom,
      contact,
      label: JSX_(utils.zT, null, displayName)
    }), datetime, JSX_("div", {
      className: "message text-block"
    }, JSX_(utils.P9, null, (chatRoom.scheduledMeeting ? l.schedule_mgmt_title.replace('%1', `<strong>${oldTopic}</strong>`) : l[9081]).replace('%s', `<strong>${topic}</strong>`))))));
    return JSX_("div", null, messages);
  }
}

;// ./js/chat/ui/messages/closeOpenMode.jsx




class CloseOpenModeMessage extends mixin.M {
  render() {
    const self = this;
    let cssClasses = "message body";
    const {message} = this.props;
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    let datetime = JSX_("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    let avatar = null;
    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = JSX_(contacts.eu, {
        contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = JSX_("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }
    return JSX_("div", {
      className: cssClasses,
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, avatar, JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_("div", {
      className: "message user-card-name"
    }, JSX_(utils.zT, null, displayName)), datetime, JSX_("div", {
      className: "message text-block"
    }, l[20569])));
  }
}

;// ./js/chat/ui/messages/chatHandle.jsx




class ChatHandleMessage extends mixin.M {
  render() {
    const self = this;
    let cssClasses = "message body";
    const {message} = this.props;
    const contact = self.getContact();
    const timestampInt = self.getTimestamp();
    const timestamp = self.getTimestampAsString();
    let datetime = JSX_("div", {
      className: "message date-time",
      title: time2date(timestampInt)
    }, timestamp);
    let displayName;
    if (contact) {
      displayName = M.getNameByHandle(contact.u);
    } else {
      displayName = contact;
    }
    let avatar = null;
    if (this.props.grouped) {
      cssClasses += " grouped";
    } else {
      avatar = JSX_(contacts.eu, {
        contact,
        className: "message  avatar-wrapper small-rounded-avatar",
        chatRoom: this.props.chatRoom
      });
      datetime = JSX_("div", {
        className: "message date-time",
        title: time2date(timestampInt)
      }, timestamp);
    }
    return JSX_("div", {
      className: cssClasses,
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, avatar, JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_("div", {
      className: "message user-card-name"
    }, JSX_(utils.zT, null, displayName)), datetime, JSX_("div", {
      className: "message text-block"
    }, message.meta.handleUpdate === 1 ? l[20570] : l[20571])));
  }
}

// EXTERNAL MODULE: ./js/chat/ui/messages/generic.jsx + 14 modules
const generic = REQ_(8025);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/chat/ui/messages/retentionChange.jsx




class RetentionChange extends mixin.M {
  render() {
    const {
      message
    } = this.props;
    const contact = this.getContact();
    return JSX_("div", {
      className: "message body",
      "data-id": `id${  message.messageId}`,
      key: message.messageId
    }, JSX_(contacts.eu, {
      contact,
      className: "message avatar-wrapper small-rounded-avatar"
    }), JSX_("div", {
      className: "message content-area small-info-txt selectable-txt"
    }, JSX_(contacts.bq, {
      contact,
      className: "message",
      label: JSX_(utils.zT, null, M.getNameByHandle(contact.u))
    }), JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp(), 17)
    }, this.getTimestampAsString()), JSX_("div", {
      className: "message text-block"
    }, message.getMessageRetentionSummary())));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const meetings_utils = REQ_(3901);
// EXTERNAL MODULE: ./js/chat/ui/messages/scheduleMetaChange.jsx
const scheduleMetaChange = REQ_(5470);
;// ./js/chat/ui/historyPanel.jsx

let _dec, _class;














const HistoryPanel = (_dec = (0,mixins.hG)(450, true), _class = class HistoryPanel extends mixins.w9 {
  constructor(props) {
    super(props);
    this.$container = null;
    this.$messages = null;
    this.domRef = REaCt().createRef();
    this.state = {
      editing: false,
      toast: false
    };
    this.renderNotice = label => JSX_("div", {
      className: "dropdown body dropdown-arrow down-arrow tooltip not-sent-notification-cancel hidden"
    }, JSX_("i", {
      className: "dropdown-white-arrow"
    }), JSX_("div", {
      className: "dropdown notification-text"
    }, JSX_("i", {
      className: "small-icon conversations"
    }), label));
    this.renderLoadingSpinner = () => JSX_("div", {
      style: {
        top: '50%'
      },
      className: `
                loading-spinner
                js-messages-loading
                light
                manual-management
                ${this.loadingShown ? '' : 'hidden'}
            `
    }, JSX_("div", {
      className: "main-loader",
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%'
      }
    }));
    this.renderNavigationToast = () => {
      const {
        chatRoom
      } = this.props;
      const unreadCount = chatRoom.messagesBuff.getUnreadCount();
      return JSX_("div", {
        className: `
                    theme-dark-forced
                    messages-toast
                    ${this.state.toast ? 'active' : ''}
                `,
        onClick: () => {
          this.setState({
            toast: false
          }, () => {
            this.messagesListScrollable.scrollToBottom();
            chatRoom.scrolledToBottom = true;
          });
        }
      }, JSX_("i", {
        className: "sprite-fm-mono icon-down"
      }), unreadCount > 0 && JSX_("span", null, unreadCount > 9 ? '9+' : unreadCount));
    };
    this.onKeyboardScroll = ({
      keyCode
    }) => {
      let _scrollbar$domRef;
      const scrollbar = this.messagesListScrollable;
      const domNode = scrollbar == null || (_scrollbar$domRef = scrollbar.domRef) == null ? void 0 : _scrollbar$domRef.current;
      if (domNode && this.isComponentEventuallyVisible() && !this.state.attachCloudDialog) {
        const scrollPositionY = scrollbar.getScrollPositionY();
        const offset = parseInt(domNode.style.height);
        const PAGE = {
          UP: 33,
          DOWN: 34
        };
        switch (keyCode) {
          case PAGE.UP:
            scrollbar.scrollToY(scrollPositionY - offset, true);
            this.onMessagesScrollUserScroll(scrollbar, 100);
            break;
          case PAGE.DOWN:
            if (!scrollbar.isAtBottom()) {
              scrollbar.scrollToY(scrollPositionY + offset, true);
            }
            break;
        }
      }
    };
    this.onMessagesScrollUserScroll = (ps, offset = 5) => {
      const {
        chatRoom
      } = this.props;
      const {
        messagesBuff
      } = chatRoom;
      const scrollPositionY = ps.getScrollPositionY();
      if (messagesBuff.messages.length === 0) {
        chatRoom.scrolledToBottom = true;
        return;
      }
      if (ps.isCloseToBottom(30) === true) {
        if (!chatRoom.scrolledToBottom) {
          messagesBuff.detachMessages();
        }
        chatRoom.scrolledToBottom = true;
      } else {
        chatRoom.scrolledToBottom = false;
      }
      if (!this.scrollPullHistoryRetrieval && !messagesBuff.isRetrievingHistory && (ps.isAtTop() || scrollPositionY < offset && ps.getScrollHeight() > 500) && messagesBuff.haveMoreHistory()) {
        ps.disable();
        this.scrollPullHistoryRetrieval = true;
        this.lastScrollPosition = scrollPositionY;
        let msgAppended = 0;
        const scrYOffset = ps.getScrollHeight();
        chatRoom.one('onMessagesBuffAppend.pull', () => {
          msgAppended++;
        });
        chatRoom.off('onHistoryDecrypted.pull');
        chatRoom.one('onHistoryDecrypted.pull', () => {
          chatRoom.off('onMessagesBuffAppend.pull');
          if (msgAppended > 0) {
            this._reposOnUpdate = scrYOffset;
          }
          this.scrollPullHistoryRetrieval = -1;
        });
        messagesBuff.retrieveChatHistory();
      }
      if (this.lastScrollPosition !== scrollPositionY) {
        this.lastScrollPosition = scrollPositionY;
      }
      delay('chat-toast', this.initToast, 200);
    };
    this.initToast = () => {
      let _this$messagesListScr;
      const {
        chatRoom
      } = this.props;
      return this.isMounted() && this.setState({
        toast: !chatRoom.scrolledToBottom && !((_this$messagesListScr = this.messagesListScrollable) != null && _this$messagesListScr.isCloseToBottom != null && _this$messagesListScr.isCloseToBottom(30))
      }, () => this.state.toast ? null : chatRoom.trigger('onChatIsFocused'));
    };
    this.handleWindowResize = this._handleWindowResize.bind(this);
  }
  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }
  UNSAFE_componentWillMount() {
    let _chatRoom$messagesBuf;
    const {
      chatRoom
    } = this.props;
    chatRoom.rebind('onHistoryDecrypted.cp', () => this.eventuallyUpdate());
    this._messagesBuffChangeHandler = (_chatRoom$messagesBuf = chatRoom.messagesBuff) == null ? void 0 : _chatRoom$messagesBuf.addChangeListener(SoonFc(() => {
      if (this.isComponentEventuallyVisible()) {
        let _this$domRef;
        $('.js-messages-scroll-area', (_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current).trigger('forceResize', [true]);
      }
      this.refreshUI();
    }));
  }
  componentDidMount() {
    super.componentDidMount();
    const {
      chatRoom,
      onMount
    } = this.props;
    window.addEventListener('resize', this.handleWindowResize);
    window.addEventListener('keydown', this.handleKeyDown);
    this.$container = $(`.conversation-panel[data-room-id="${chatRoom.chatId}"]`);
    this.eventuallyInit();
    chatRoom.trigger('onHistoryPanelComponentDidMount');
    if (onMount) {
      onMount(this);
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const {
      chatRoom
    } = this.props;
    if (this._messagesBuffChangeHandler) {
      let _chatRoom$messagesBuf2;
      (_chatRoom$messagesBuf2 = chatRoom.messagesBuff) == null || _chatRoom$messagesBuf2.removeChangeListener(this._messagesBuffChangeHandler);
      delete this._messagesBuffChangeHandler;
    }
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    $(document).off(`fullscreenchange.megaChat_${chatRoom.roomId}`);
    $(document).off(`keydown.keyboardScroll_${chatRoom.roomId}`);
  }
  componentDidUpdate(prevProps, prevState) {
    let _self$domRef;
    const self = this;
    self.eventuallyInit(false);
    const domNode = (_self$domRef = self.domRef) == null ? void 0 : _self$domRef.current;
    const jml = domNode && domNode.querySelector('.js-messages-loading');
    if (jml) {
      if (self.loadingShown) {
        jml.classList.remove('hidden');
      } else {
        jml.classList.add('hidden');
      }
    }
    self.handleWindowResize();
    if (prevState.editing === false && self.state.editing !== false && self.messagesListScrollable) {
      self.messagesListScrollable.reinitialise(false);
      Soon(() => {
        if (self.editDomElement && self.editDomElement.length === 1) {
          self.messagesListScrollable.scrollToElement(self.editDomElement[0], false);
        }
      });
    }
    if (self._reposOnUpdate !== undefined) {
      const ps = self.messagesListScrollable;
      ps.__prevPosY = ps.getScrollHeight() - self._reposOnUpdate + self.lastScrollPosition;
      ps.scrollToY(ps.__prevPosY, true);
    }
  }
  eventuallyInit(doResize) {
    let _this$domRef2;
    if (this.initialised) {
      return;
    }
    const domNode = (_this$domRef2 = this.domRef) == null ? void 0 : _this$domRef2.current;
    if (domNode) {
      this.initialised = true;
    } else {
      return;
    }
    this.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', this.$container);
    this.$messages.droppable({
      tolerance: 'pointer',
      drop(e, ui) {
        $.doDD(e, ui, 'drop', 1);
      },
      over(e, ui) {
        $.doDD(e, ui, 'over', 1);
      },
      out(e, ui) {
        $.doDD(e, ui, 'out', 1);
      }
    });
    this.lastScrollPosition = null;
    this.props.chatRoom.scrolledToBottom = true;
    if (doResize !== false) {
      this.handleWindowResize();
    }
  }
  _handleWindowResize(e, scrollToBottom) {
    if (!M.chat) {
      return;
    }
    if (!this.isMounted()) {
      this.componentWillUnmount();
      return;
    }
    if (!this.isComponentEventuallyVisible()) {
      return;
    }
    const self = this;
    self.eventuallyInit(false);
    if (!self.$messages) {
      return;
    }
    if ((0,meetings_utils.Av)()) {
      const $container = $('.meetings-call');
      const $messages = $('.js-messages-scroll-area', $container);
      const $textarea = $('.chat-textarea-block', $container);
      const $sidebar = $('.sidebar', $container);
      const scrollBlockHeight = parseInt($sidebar.outerHeight(), 10) - parseInt($textarea.outerHeight(), 10) - 72;
      if ($sidebar.hasClass('chat-opened') && scrollBlockHeight !== $messages.outerHeight()) {
        $messages.css('height', scrollBlockHeight);
        self.refreshUI(true);
      }
      return;
    }
    const scrollBlockHeight = $('.chat-content-block', self.$container).outerHeight() - ($('.chat-topic-block', self.$container).outerHeight() || 0) - (is_chatlink ? $('.join-chat-block', self.$container).outerHeight() : $('.messages-block .chat-textarea-block', self.$container).outerHeight());
    if (scrollBlockHeight !== self.$messages.outerHeight()) {
      self.$messages.css('height', scrollBlockHeight);
      $('.messages.main-pad', self.$messages).css('min-height', scrollBlockHeight);
      self.refreshUI(true);
    } else {
      self.refreshUI(scrollToBottom);
    }
  }
  refreshUI() {
    if (this.isComponentEventuallyVisible()) {
      const room = this.props.chatRoom;
      room.renderContactTree();
      room.megaChat.refreshConversations();
      room.trigger('RefreshUI');
      if (room.scrolledToBottom) {
        delay(`hp:reinit-scroll:${this.getUniqueId()}`, () => {
          if (this.messagesListScrollable) {
            this.messagesListScrollable.reinitialise(true, true);
          }
        }, 30);
      }
    }
  }
  isLoading() {
    const {chatRoom} = this.props;
    if (chatRoom.historyTimedOut) {
      return false;
    }
    const mb = chatRoom.messagesBuff;
    return this.scrollPullHistoryRetrieval === true || chatRoom.activeSearches || mb.messagesHistoryIsLoading() || mb.joined === false || mb.isDecrypting;
  }
  specShouldComponentUpdate() {
    return !this.loadingShown && this.isComponentEventuallyVisible();
  }
  enableScrollbar() {
    const ps = this.messagesListScrollable;
    ps.enable();
    this._reposOnUpdate = undefined;
    this.lastScrollPosition = ps.__prevPosY | 0;
  }
  editMessage(messageId) {
    const self = this;
    self.setState({
      'editing': messageId
    });
    self.props.chatRoom.scrolledToBottom = false;
  }
  onMessageEditDone(v, messageContents) {
    const self = this;
    const room = this.props.chatRoom;
    room.scrolledToBottom = true;
    self.editDomElement = null;
    const currentContents = v.textContents;
    v.edited = false;
    if (messageContents === false || messageContents === currentContents) {
      let _self$messagesListScr;
      (_self$messagesListScr = self.messagesListScrollable) == null || _self$messagesListScr.scrollToBottom(true);
    } else if (messageContents) {
      let _self$messagesListScr2;
      room.trigger('onMessageUpdating', v);
      room.megaChat.plugins.chatdIntegration.updateMessage(room, v.internalId ? v.internalId : v.orderValue, messageContents);
      if (v.getState && (v.getState() === Message.STATE.NOT_SENT || v.getState() === Message.STATE.SENT) && !v.requiresManualRetry) {
        if (v.textContents) {
          v.textContents = messageContents;
        }
        if (v.emoticonShortcutsProcessed) {
          v.emoticonShortcutsProcessed = false;
        }
        if (v.emoticonsProcessed) {
          v.emoticonsProcessed = false;
        }
        if (v.messageHtml) {
          delete v.messageHtml;
        }
        v.trigger('onChange', [v, "textContents", "", messageContents]);
        megaChat.plugins.richpreviewsFilter.processMessage({}, v, false, true);
      }
      (_self$messagesListScr2 = self.messagesListScrollable) == null || _self$messagesListScr2.scrollToBottom(true);
    } else if (messageContents.length === 0) {
      this.props.onDeleteClicked(v);
    }
    self.setState({
      'editing': false
    });
    self.refreshUI();
    Soon(() => {
      $('.chat-textarea-block:visible textarea').focus();
    }, 300);
  }
  render() {
    const self = this;
    const room = this.props.chatRoom;
    if (!room || !room.roomId) {
      return null;
    }
    const contacts = room.getParticipantsExceptMe();
    let contactHandle;
    let contact;
    let avatarMeta;
    let contactName = "";
    if (contacts && contacts.length === 1) {
      contactHandle = contacts[0];
      contact = M.u[contactHandle];
      avatarMeta = contact ? generateAvatarMeta(contact.u) : {};
      contactName = avatarMeta.fullName;
    } else if (contacts && contacts.length > 1) {
      contactName = room.getRoomTitle();
    }
    let messagesList = [];
    if (this.isLoading()) {
      self.loadingShown = true;
    } else {
      const mb = room.messagesBuff;
      if (this.scrollPullHistoryRetrieval < 0) {
        this.scrollPullHistoryRetrieval = false;
        self.enableScrollbar();
      }
      delete self.loadingShown;
      if (room.historyTimedOut || mb.joined === true && !self.scrollPullHistoryRetrieval && mb.haveMoreHistory() === false) {
        const $$WELCOME_MESSAGE = ({
          heading,
          title,
          info,
          className
        }) => JSX_("div", {
          className: `
                            messages
                            welcome-message
                            ${className || ''}
                        `
        }, JSX_(utils.P9, {
          tag: "h1",
          content: heading
        }), title && JSX_("span", null, title), info);
        messagesList = [...messagesList, room.isNote ? $$WELCOME_MESSAGE({
          heading: l.note_heading,
          info: JSX_("p", null, JSX_("i", {
            className: "sprite-fm-mono icon-file-text-thin-outline note-chat-icon"
          }), l.note_description),
          className: 'note-chat-info'
        }) : $$WELCOME_MESSAGE({
          heading: room.scheduledMeeting || !contactName ? megaChat.html(room.getRoomTitle()) : l[8002].replace('%s', `<span>${megaChat.html(contactName)}</span>`),
          title: l[8080],
          info: JSX_(REaCt().Fragment, null, JSX_("p", null, JSX_("i", {
            className: "sprite-fm-mono icon-lock"
          }), JSX_(utils.P9, {
            content: l[8540].replace("[S]", "<strong>").replace("[/S]", "</strong>")
          })), JSX_("p", null, JSX_("i", {
            className: "sprite-fm-mono icon-accept"
          }), JSX_(utils.P9, {
            content: l[8539].replace("[S]", "<strong>").replace("[/S]", "</strong>")
          })))
        })];
      }
    }
    let lastTimeMarker;
    let lastMessageFrom = null;
    let lastGroupedMessageTimeStamp = null;
    let grouped = false;
    for (let i = 0; i < room.messagesBuff.messages.length; i++) {
      let v = room.messagesBuff.messages.getItem(i);
      if (!v.protocol && v.revoked !== true) {
        let shouldRender = true;
        if (v.isManagement && v.isManagement() === true && v.isRenderableManagement() === false || v.deleted === true) {
          shouldRender = false;
        }
        const timestamp = v.delay;
        const curTimeMarker = getTimeMarker(timestamp);
        if (shouldRender === true && curTimeMarker && lastTimeMarker !== curTimeMarker) {
          lastTimeMarker = curTimeMarker;
          messagesList.push(JSX_("div", {
            className: "message date-divider selectable-txt",
            key: `${v.messageId  }_marker`,
            title: time2date(timestamp)
          }, curTimeMarker));
          grouped = false;
          lastMessageFrom = null;
          lastGroupedMessageTimeStamp = null;
        }
        if (shouldRender === true) {
          let {userId} = v;
          if (!userId && contact && contact.u) {
            userId = contact.u;
          }
          if (v instanceof Message && v.dialogType !== "truncated") {
            if (!lastMessageFrom || userId && lastMessageFrom === userId) {
              if (timestamp - lastGroupedMessageTimeStamp < 300) {
                grouped = true;
              } else {
                grouped = false;
                lastMessageFrom = userId;
                lastGroupedMessageTimeStamp = timestamp;
              }
            } else {
              grouped = false;
              lastMessageFrom = userId;
              if (lastMessageFrom === userId) {
                lastGroupedMessageTimeStamp = timestamp;
              } else {
                lastGroupedMessageTimeStamp = null;
              }
            }
          } else {
            grouped = false;
            lastMessageFrom = null;
            lastGroupedMessageTimeStamp = null;
          }
        }
        if ((v.dialogType === "remoteCallEnded" || v.dialogType === "remoteCallStarted") && v && v.wrappedChatDialogMessage) {
          v = v.wrappedChatDialogMessage;
        }
        if (v.dialogType) {
          let messageInstance = null;
          if (v.dialogType === 'alterParticipants') {
            messageInstance = JSX_(AltPartsConvMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'truncated') {
            messageInstance = JSX_(TruncatedMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'privilegeChange') {
            messageInstance = JSX_(PrivilegeChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'topicChange') {
            messageInstance = JSX_(TopicChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'openModeClosed') {
            messageInstance = JSX_(CloseOpenModeMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'chatHandleUpdate') {
            messageInstance = JSX_(ChatHandleMessage, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v),
              grouped,
              chatRoom: room
            });
          } else if (v.dialogType === 'messageRetention') {
            messageInstance = JSX_(RetentionChange, {
              message: v,
              key: v.messageId,
              contact: Message.getContactForMessage(v)
            });
          } else if (v.dialogType === 'scheduleMeta') {
            if (v.meta.onlyTitle) {
              messageInstance = JSX_(TopicChange, {
                message: v,
                key: v.messageId,
                contact: Message.getContactForMessage(v),
                grouped,
                chatRoom: v.chatRoom
              });
            } else {
              if (v.meta.topicChange) {
                messagesList.push(JSX_(TopicChange, {
                  message: v,
                  key: `${v.messageId}-topic`,
                  contact: Message.getContactForMessage(v),
                  grouped,
                  chatRoom: v.chatRoom
                }));
              }
              messageInstance = JSX_(scheduleMetaChange.A, {
                message: v,
                key: v.messageId,
                mode: v.meta.mode,
                chatRoom: room,
                grouped,
                link: v.chatRoom.publicLink,
                contact: Message.getContactForMessage(v)
              });
            }
          }
          messagesList.push(messageInstance);
        } else {
          if (!v.chatRoom) {
            v.chatRoom = room;
          }
          messagesList.push(JSX_(generic.A, {
            message: v,
            state: v.state,
            key: v.messageId,
            contact: Message.getContactForMessage(v),
            grouped,
            onUpdate: () => {
              self.onResizeDoUpdate();
            },
            editing: self.state.editing === v.messageId || self.state.editing === v.pendingMessageId,
            onEditStarted: ((v, $domElement) => {
              self.editDomElement = $domElement;
              self.setState({
                'editing': v.messageId
              });
              self.forceUpdate();
            }).bind(this, v),
            chatRoom: room,
            onEditDone: this.onMessageEditDone.bind(this, v),
            onDeleteClicked: msg => {
              if (this.props.onDeleteClicked) {
                this.props.onDeleteClicked(msg);
              }
            },
            onResized: () => {
              this.handleWindowResize();
            },
            onEmojiBarChange: () => {
              this.handleWindowResize();
            }
          }));
        }
      }
    }
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    messages
                    scroll-area
                    ${this.props.className || ''}
                `
    }, JSX_(perfectScrollbar.O, {
      className: "js-messages-scroll-area perfectScrollbarContainer",
      ref: ref => {
        let _this$props$onMessage, _this$props;
        this.messagesListScrollable = ref;
        $(document).rebind(`keydown.keyboardScroll_${room.roomId}`, this.onKeyboardScroll);
        (_this$props$onMessage = (_this$props = this.props).onMessagesListScrollableMount) == null || _this$props$onMessage.call(_this$props, ref);
      },
      chatRoom: room,
      messagesBuff: room.messagesBuff,
      editDomElement: this.state.editDomElement,
      editingMessageId: this.state.editing,
      confirmDeleteDialog: this.state.confirmDeleteDialog,
      renderedMessagesCount: messagesList.length,
      options: {
        suppressScrollX: true
      },
      isLoading: room.messagesBuff.messagesHistoryIsLoading() || room.activeSearches > 0 || this.loadingShown,
      onFirstInit: ps => {
        ps.scrollToBottom(true);
        room.scrolledToBottom = 1;
      },
      onUserScroll: this.onMessagesScrollUserScroll
    }, JSX_("div", {
      className: "messages main-pad"
    }, JSX_("div", {
      className: "messages content-area"
    }, this.renderLoadingSpinner(), messagesList))), this.renderNavigationToast());
  }
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "enableScrollbar", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "enableScrollbar"), _class.prototype), _class);


 },

 5677
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  ConversationPanels: () =>  ConversationPanels,
  e: () =>  allContactsInChat,
  z: () =>  excludedParticipants
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const ui_dropdowns = REQ_(1510);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const ui_contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/chat/chatRoom.jsx
const chat_chatRoom = REQ_(7057);
;// ./js/ui/historyRetentionDialog.jsx




const LIMIT = {
  CHARS: 2,
  HOURS: 24,
  DAYS: 31,
  WEEKS: 4,
  MONTHS: 12
};
class HistoryRetentionDialog extends external_React_.Component {
  constructor(props) {
    super(props);
    this.dialogName = 'msg-retention-dialog';
    this.inputRef = REaCt().createRef();
    this.state = {
      selectedTimeFormat: chat_chatRoom.zd.HOURS,
      timeRange: undefined
    };
    this.handleRadioChange = e => {
      const selectedTimeFormat = e.target.value;
      this.setState(prevState => ({
        selectedTimeFormat,
        timeRange: this.filterTimeRange(prevState.timeRange, selectedTimeFormat)
      }));
    };
    this.handleOnTimeCheck = e => {
      const checkingValue = e.type === 'paste' ? e.clipboardData.getData('text') : e.key;
      if (e.keyCode !== 8 && isNaN(checkingValue)) {
        e.preventDefault();
      }
    };
    this.handleOnTimeChange = e => {
      const timeValue = e.target.value;
      this.setState(prevState => ({
        timeRange: this.filterTimeRange(timeValue, prevState.selectedTimeFormat)
      }));
    };
    const {
      chatRoom
    } = props;
    this.state.timeRange = chatRoom.getRetentionTimeFormatted();
    if (this.state.timeRange === 0) {
      this.state.timeRange = '';
    }
    this.state.selectedTimeFormat = chatRoom.getRetentionFormat();
    this.state.selectedTimeFormat = this.state.selectedTimeFormat === chat_chatRoom.zd.DISABLED ? chat_chatRoom.zd.HOURS : this.state.selectedTimeFormat;
  }
  hasInput() {
    return this.state.timeRange && parseInt(this.state.timeRange, 10) >= 1;
  }
  getMaxTimeRange(selectedTimeFormat) {
    switch (selectedTimeFormat) {
      case chat_chatRoom.zd.HOURS:
        return LIMIT.HOURS;
      case chat_chatRoom.zd.DAYS:
        return LIMIT.DAYS;
      case chat_chatRoom.zd.WEEKS:
        return LIMIT.WEEKS;
      case chat_chatRoom.zd.MONTHS:
        return LIMIT.MONTHS;
    }
  }
  getParsedLabel(label, timeRange) {
    timeRange = timeRange ? parseInt(timeRange, 10) : this.getMaxTimeRange(label);
    switch (label) {
      case chat_chatRoom.zd.HOURS:
        return mega.icu.format(l.plural_hour, timeRange);
      case chat_chatRoom.zd.DAYS:
        return mega.icu.format(l.plural_day, timeRange);
      case chat_chatRoom.zd.WEEKS:
        return mega.icu.format(l.plural_week, timeRange);
      case chat_chatRoom.zd.MONTHS:
        return mega.icu.format(l.plural_month, timeRange);
    }
  }
  filterTimeRange(timeRange, selectedTimeFormat) {
    if (timeRange.length > LIMIT.CHARS) {
      return timeRange.substring(0, LIMIT.CHARS);
    }
    timeRange = parseInt(timeRange, 10);
    if (timeRange === 0 || isNaN(timeRange)) {
      return '';
    }
    return Math.min(this.getMaxTimeRange(selectedTimeFormat), timeRange);
  }
  handleOnSubmit(e) {
    if (!this.hasInput()) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const {
      chatRoom,
      onClose
    } = this.props;
    const {
      selectedTimeFormat,
      timeRange
    } = this.state;
    let time = 0;
    switch (selectedTimeFormat) {
      case chat_chatRoom.zd.HOURS:
        time = hoursToSeconds(Number(timeRange));
        break;
      case chat_chatRoom.zd.DAYS:
        time = daysToSeconds(Number(timeRange));
        break;
      case chat_chatRoom.zd.WEEKS:
        time = daysToSeconds(Number(timeRange) * 7);
        break;
      case chat_chatRoom.zd.MONTHS:
        time = daysToSeconds(Number(timeRange) * 30);
        break;
    }
    chatRoom.setRetention(time);
    onClose();
  }
  renderCustomRadioButton() {
    return [chat_chatRoom.zd.HOURS, chat_chatRoom.zd.DAYS, chat_chatRoom.zd.WEEKS, chat_chatRoom.zd.MONTHS].map(label => {
      return JSX_(CustomRadioButton, {
        checked: this.state.selectedTimeFormat === label,
        label: this.getParsedLabel(label, this.state.timeRange),
        name: "time-selector",
        value: label,
        onChange: this.handleRadioChange,
        key: label
      });
    });
  }
  componentDidMount() {
    M.safeShowDialog(this.dialogName, () => {
      $(document.body).rebind('keydown.historyRetentionDialog', e => {
        const key = e.keyCode || e.which;
        if (key === 13) {
          this.handleOnSubmit(e);
        }
      });
    });
  }
  componentWillUnmount() {
    $(document.body).off('keydown.historyRetentionDialog');
    if ($.dialog === this.dialogName) {
      closeDialog();
    }
  }
  render() {
    const {
      chatRoom,
      onClose
    } = this.props;
    const {
      selectedTimeFormat,
      timeRange
    } = this.state;
    return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
      chatRoom,
      onClose,
      dialogName: this.dialogName,
      dialogType: "tool",
      onClick: () => this.inputRef.current.focus()
    }), JSX_("header", null, JSX_("h2", {
      id: "msg-retention-dialog-title"
    }, l[23434])), JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_("p", null, l[23435])), JSX_("div", {
      className: "content-block form"
    }, JSX_("div", {
      className: "form-section"
    }, JSX_("span", {
      className: "form-section-placeholder"
    }, this.getParsedLabel(selectedTimeFormat, timeRange)), JSX_("input", {
      type: "number",
      min: "0",
      step: "1",
      max: this.getMaxTimeRange(selectedTimeFormat),
      className: "form-section-time",
      placeholder: this.getMaxTimeRange(selectedTimeFormat),
      ref: this.inputRef,
      autoFocus: true,
      value: timeRange,
      onChange: this.handleOnTimeChange,
      onKeyPress: this.handleOnTimeCheck,
      onPaste: this.handleOnTimeCheck
    })), JSX_("div", {
      className: "form-section"
    }, JSX_("div", {
      className: "form-section-radio"
    }, this.renderCustomRadioButton())))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_("button", {
      className: "mega-button",
      onClick: onClose
    }, JSX_("span", null, l.msg_dlg_cancel)), JSX_("button", {
      className: `
                                mega-button positive
                                ${this.hasInput() ? '' : 'disabled'}
                            `,
      onClick: e => this.handleOnSubmit(e)
    }, JSX_("span", null, l[726])))));
  }
}
function CustomRadioButton({
  checked = false,
  label,
  name,
  value,
  onChange
}) {
  return JSX_("label", {
    key: value,
    className: "radio-txt"
  }, label, JSX_("div", {
    className: `custom-radio small green-active ${  checked ? "radioOn" : "radioOff"}`
  }, JSX_("input", {
    type: "radio",
    name,
    value,
    checked,
    onChange
  })));
}
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/ui/accordion.jsx


class AccordionPanel extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  render() {
    const {
      accordionClass,
      expanded,
      title,
      className,
      children,
      onToggle
    } = this.props;
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    chat-dropdown
                    container
                    ${accordionClass || ''}
                `
    }, JSX_("div", {
      className: `
                        chat-dropdown
                        header
                        ${expanded ? 'expanded' : ''}
                    `,
      onClick: onToggle
    }, JSX_("span", null, title), JSX_("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), expanded ? JSX_("div", {
      className: `
                            chat-dropdown
                            content
                            have-animation
                            ${className | ''}
                        `
    }, children) : null);
  }
}
class Accordion extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      expandedPanel: this.props.expandedPanel
    };
  }
  onToggle(e, key) {
    const obj = {};
    obj[key] = !(this.state.expandedPanel || {})[key];
    this.setState({
      'expandedPanel': obj
    });
    this.props.onToggle && this.props.onToggle(key);
  }
  render() {
    const self = this;
    const classes = `accordion-panels ${  self.props.className ? self.props.className : ''}`;
    const accordionPanels = [];
    let x = 0;
    REaCt().Children.forEach(self.props.children, child => {
      if (!child) {
        return;
      }
      if (child.type.name === 'AccordionPanel' || child.type.name && child.type.name.indexOf('AccordionPanel') > -1) {
        accordionPanels.push(REaCt().cloneElement(child, {
          key: child.key,
          expanded: !!self.state.expandedPanel[child.key],
          accordion: self,
          onToggle (e) {
            self.onToggle(e, child.key);
          }
        }));
      } else {
        accordionPanels.push(REaCt().cloneElement(child, {
          key: x++,
          accordion: self
        }));
      }
    });
    return JSX_("div", {
      ref: this.domRef,
      className: classes
    }, accordionPanels);
  }
}

;// ./js/chat/ui/participantsList.jsx





class ParticipantsList extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      'scrollPositionY': 0,
      'scrollHeight': 144
    };
    this.doResizesOnComponentUpdate = SoonFc(10, function () {
      let _self$domRef;
      const self = this;
      if (!self.isMounted()) {
        return;
      }
      let fitHeight = self.contactsListScroll.getContentHeight();
      if (!fitHeight) {
        return null;
      }
      const $node = $((_self$domRef = self.domRef) == null ? void 0 : _self$domRef.current);
      const $parentContainer = $node.closest('.chat-right-pad');
      const maxHeight = $parentContainer.outerHeight(true) - $('.chat-right-head', $parentContainer).outerHeight(true) - 72;
      if (fitHeight < $('.buttons-block', $parentContainer).outerHeight(true)) {
        fitHeight = Math.max(fitHeight, 53);
      } else if (maxHeight < fitHeight) {
        fitHeight = Math.max(maxHeight, 53);
      }
      fitHeight = Math.min(self.calculateListHeight($parentContainer), fitHeight);
      const $contactsList = $('.chat-contacts-list', $parentContainer);
      if ($contactsList.height() !== fitHeight) {
        $('.chat-contacts-list', $parentContainer).height(fitHeight);
        if (self.contactsListScroll) {
          self.contactsListScroll.reinitialise();
        }
      }
      if (self.state.scrollHeight !== fitHeight) {
        self.setState({
          'scrollHeight': fitHeight
        });
      }
      self.onUserScroll();
    });
  }
  onUserScroll() {
    if (!this.contactsListScroll) {
      return;
    }
    const scrollPosY = this.contactsListScroll.getScrollPositionY();
    if (this.state.scrollPositionY !== scrollPosY) {
      this.setState({
        'scrollPositionY': scrollPosY
      });
    }
  }
  calculateListHeight($parentContainer) {
    const room = this.props.chatRoom;
    return ($parentContainer ? $parentContainer : $('.conversationsApp')).outerHeight() - 144 - 10 - (room.type === "public" && room.observers > 0 ? 48 : 0) - (room.isReadOnly() ? 12 : 0);
  }
  componentDidUpdate() {
    const self = this;
    if (!self.isMounted()) {
      return;
    }
    if (!self.contactsListScroll) {
      return null;
    }
    self.doResizesOnComponentUpdate();
  }
  render() {
    const {
      chatRoom
    } = this.props;
    if (!chatRoom) {
      return null;
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-contacts-list"
    }, JSX_(perfectScrollbar.O, {
      chatRoom,
      members: chatRoom.members,
      ref: ref => {
        this.contactsListScroll = ref;
      },
      disableCheckingVisibility: true,
      onUserScroll: SoonFc(this.onUserScroll.bind(this), 76),
      requiresUpdateOnResize: true,
      isVisible: chatRoom.isCurrentlyActive,
      options: {
        suppressScrollX: true
      }
    }, JSX_(ParticipantsListInner, {
      chatRoom,
      members: chatRoom.members,
      scrollPositionY: this.state.scrollPositionY,
      scrollHeight: this.state.scrollHeight,
      disableCheckingVisibility: true
    })));
  }
}
ParticipantsList.defaultProps = {
  'requiresUpdateOnResize': true,
  'contactCardHeight': 36
};
class ParticipantsListInner extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  render() {
    const room = this.props.chatRoom;
    const {contactCardHeight} = this.props;
    const {scrollPositionY} = this.props;
    const {scrollHeight} = this.props;
    const {
      OPERATOR,
      FULL,
      READONLY
    } = ChatRoom.MembersSet.PRIVILEGE_STATE;
    if (!room) {
      return null;
    }
    if (!room.isCurrentlyActive) {
      return false;
    }
    const contacts = room.getParticipantsExceptMe();
    const contactsList = [];
    const firstVisibleUserNum = Math.floor(scrollPositionY / contactCardHeight);
    const visibleUsers = Math.ceil(scrollHeight / contactCardHeight);
    const contactListInnerStyles = {
      'height': contacts.length * contactCardHeight
    };
    if ((room.type === "group" || room.type === "public") && !room.stateIsLeftOrLeaving() && room.members.hasOwnProperty(u_handle)) {
      contacts.unshift(u_handle);
      contactListInnerStyles.height += contactCardHeight;
    }
    const onRemoveClicked = contactHash => {
      room.trigger('onRemoveUserRequest', [contactHash]);
    };
    const onSetPrivClicked = (contactHash, priv) => {
      if (room.members[contactHash] !== priv) {
        room.trigger('alterUserPrivilege', [contactHash, priv]);
      }
    };
    for (let i = 0; i < contacts.length; i++) {
      const contactHash = contacts[i];
      if (!(contactHash in M.u)) {
        continue;
      }
      const contact = M.u[contactHash];
      if (i < firstVisibleUserNum || i > firstVisibleUserNum + visibleUsers) {
        continue;
      }
      const dropdowns = [];
      let dropdownIconClasses = "small-icon tiny-icon icons-sprite grey-dots";
      const dropdownRemoveButton = [];
      if (room.type === "public" || room.type === "group" && room.members) {
        if (room.iAmOperator() && contactHash !== u_handle) {
          dropdownRemoveButton.push(JSX_(ui_dropdowns.tJ, {
            className: "red",
            key: "remove",
            icon: "sprite-fm-mono icon-disabled-filled",
            label: l[8867],
            onClick: onRemoveClicked.bind(this, contactHash)
          }));
        }
        if (room.iAmOperator()) {
          dropdowns.push(JSX_("div", {
            key: "setPermLabel",
            className: "dropdown-items-info"
          }, l[8868]));
          dropdowns.push(JSX_(ui_dropdowns.tJ, {
            key: "privOperator",
            icon: "sprite-fm-mono icon-admin-outline",
            label: l[8875],
            className: `
                                tick-item
                                ${room.members[contactHash] === OPERATOR ? 'active' : ''}
                            `,
            disabled: contactHash === u_handle,
            onClick: () => onSetPrivClicked(contactHash, OPERATOR)
          }));
          dropdowns.push(JSX_(ui_dropdowns.tJ, {
            key: "privFullAcc",
            icon: "sprite-fm-mono icon-chat",
            className: `
                                tick-item
                                ${room.members[contactHash] === FULL ? 'active' : ''}
                            `,
            disabled: contactHash === u_handle,
            label: l[8874],
            onClick: () => onSetPrivClicked(contactHash, FULL)
          }));
          dropdowns.push(JSX_(ui_dropdowns.tJ, {
            key: "privReadOnly",
            icon: "sprite-fm-mono icon-read-only",
            className: `
                                tick-item
                                ${room.members[contactHash] === READONLY ? 'active' : ''}
                            `,
            disabled: contactHash === u_handle,
            label: l[8873],
            onClick: () => onSetPrivClicked(contactHash, READONLY)
          }));
        }
        const baseClassName = 'sprite-fm-mono';
        switch (room.members[contactHash]) {
          case OPERATOR:
            dropdownIconClasses = `${baseClassName} icon-admin`;
            break;
          case FULL:
            dropdownIconClasses = `${baseClassName} icon-chat-filled`;
            break;
          case READONLY:
            dropdownIconClasses = `${baseClassName} icon-read-only`;
            break;
          default:
            break;
        }
        contactsList.push(JSX_(ui_contacts.nB, {
          key: contact.u,
          contact,
          chatRoom: room,
          className: "right-chat-contact-card",
          dropdownPositionMy: "left top",
          dropdownPositionAt: "left top",
          dropdowns,
          dropdownDisabled: contactHash === u_handle || is_chatlink || is_eplusplus,
          dropdownButtonClasses: "contacts-icon",
          dropdownRemoveButton,
          dropdownIconClasses,
          noLoading: true,
          isInCall: room.uniqueCallParts && room.uniqueCallParts[contactHash],
          style: {
            width: 234,
            position: 'absolute',
            top: i * contactCardHeight
          }
        }));
      }
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-contacts-list-inner default-bg",
      style: contactListInnerStyles
    }, contactsList);
  }
}
ParticipantsListInner.defaultProps = {
  requiresUpdateOnResize: true,
  contactCardHeight: 32,
  scrollPositionY: 0,
  scrollHeight: 128,
  chatRoom: undefined
};

// EXTERNAL MODULE: ./js/chat/ui/messages/generic.jsx + 14 modules
const generic = REQ_(8025);
;// ./js/chat/ui/sharedFilesAccordionPanel.jsx

let _dec, _class;



class SharedFileItem extends mixins.u9 {
  render() {
    const self = this;
    const {message} = this.props;
    const contact = Message.getContactForMessage(message);
    const name = M.getNameByHandle(contact.u);
    const timestamp = time2date(message.delay);
    const {node} = this.props;
    const {icon} = this.props;
    return JSX_("div", {
      className: `chat-shared-block ${  self.props.isLoading ? "is-loading" : ""}`,
      key: `${message.messageId  }_${  node.h}`,
      onClick: () => this.props.isPreviewable ? M.viewMediaFile(node) : M.addDownload([node]),
      onDoubleClick: () => M.addDownload([node])
    }, JSX_("div", {
      className: `icon-or-thumb ${thumbnails.has(node.fa) ? "thumb" : ""}`
    }, JSX_("div", {
      className: `item-type-icon-90 icon-${icon}-90`
    }), JSX_("div", {
      className: "img-wrapper",
      id: this.props.imgId
    }, JSX_("img", {
      alt: "",
      src: thumbnails.get(node.fa) || ""
    }))), JSX_("div", {
      className: "chat-shared-info"
    }, JSX_("span", {
      className: "txt"
    }, node.name), JSX_("span", {
      className: "txt small"
    }, JSX_(utils.zT, null, name)), JSX_("span", {
      className: "txt small grey"
    }, timestamp)));
  }
}
const SharedFilesAccordionPanel = (_dec = utils.Ay.SoonFcWrap(350), _class = class SharedFilesAccordionPanel extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  eventuallyRenderThumbnails() {
    if (this.allShownNodes) {
      const pending = [];
      const nodes = new Map(this.allShownNodes);
      const render = n => {
        if (thumbnails.has(n.fa)) {
          const src = thumbnails.get(n.fa);
          const batch = [...nodes.get(n.fa)];
          for (let i = batch.length; i--;) {
            const n = batch[i];
            let img = document.getElementById(`sharedFiles!${n.ch}`);
            if (img && (img = img.querySelector('img'))) {
              img.src = src;
              if (img = Object(img.parentNode).parentNode) {
                img.classList.add('thumb');
              }
            }
          }
          return true;
        }
      };
      for (const [, [n]] of nodes) {
        if (!render(n)) {
          pending.push(n);
        }
      }
      this.allShownNodes.clear();
      if (pending.length) {
        fm_thumbnails('standalone', pending, render);
      }
    }
  }
  UNSAFE_componentWillMount() {
    this.allShownNodes = new MapSet();
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    delete this.allShownNodes;
  }
  componentDidUpdate() {
    this.eventuallyRenderThumbnails();
  }
  render() {
    const self = this;
    const room = self.props.chatRoom;
    const mb = room.messagesBuff;
    let contents = null;
    let currentPage = mb.sharedFilesPage;
    const startPos = currentPage * 12;
    const endPos = startPos + 12;
    let totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / 12);
    totalPages = mb.sharedFiles.length && !totalPages ? 1 : totalPages;
    const haveMore = mb.haveMoreSharedFiles || currentPage + 1 < totalPages;
    const files = [];
    if (!mb.haveMoreSharedFiles && currentPage === totalPages) {
      currentPage = mb.sharedFilesPage = Math.max(totalPages - 1, 0);
    }
    if (this.props.expanded) {
      let prev = null;
      let next = null;
      if (currentPage > 0) {
        prev = JSX_("div", {
          className: "chat-share-nav button prev",
          onClick () {
            mb.sharedFilesPage--;
            self.safeForceUpdate();
          }
        });
      }
      if (haveMore) {
        next = JSX_("div", {
          className: "chat-share-nav button next",
          onClick () {
            if (self.isLoadingMore) {
              return;
            }
            if (mb.sharedFiles.length < endPos + 12) {
              self.isLoadingMore = true;
              mb.retrieveSharedFilesHistory(12).catch(dump).finally(() => {
                self.isLoadingMore = false;
                mb.sharedFilesPage++;
                if (!mb.haveMoreSharedFiles && mb.sharedFilesPage > totalPages) {
                  mb.sharedFilesPage = totalPages - 1;
                }
                Soon(() => {
                  self.safeForceUpdate();
                });
              });
            } else {
              mb.sharedFilesPage++;
            }
            Soon(() => {
              self.safeForceUpdate();
            });
          }
        });
      }
      if (!mb.sharedFilesLoadedOnce) {
        mb.retrieveSharedFilesHistory(12).then(() => this.safeForceUpdate()).catch(dump);
      }
      let sharedNodesContainer = null;
      if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
        sharedNodesContainer = JSX_("div", {
          className: "chat-dropdown empty-txt loading-initial"
        }, JSX_("div", {
          className: "loading-spinner light small"
        }, JSX_("div", {
          className: "main-loader"
        })));
      } else if (!mb.haveMoreSharedFiles && !mb.sharedFiles.length) {
        sharedNodesContainer = JSX_("div", {
          className: "chat-dropdown empty-txt"
        }, l[19985]);
      } else {
        const keys = clone(mb.sharedFiles.keys()).reverse();
        for (let i = startPos; i < endPos; i++) {
          var message = mb.sharedFiles[keys[i]];
          if (!message) {
            continue;
          }
          const nodes = message.getAttachmentMeta();
          nodes.forEach((node) => {
            const imgId = `sharedFiles!${  node.ch}`;
            const {
              icon,
              showThumbnail,
              isPreviewable
            } = M.getMediaProperties(node);
            files.push(JSX_(SharedFileItem, {
              message,
              key: `${node.h}_${message.messageId}`,
              isLoading: self.isLoadingMore,
              node,
              icon,
              imgId,
              showThumbnail,
              isPreviewable,
              chatRoom: room,
              contact: Message.getContactForMessage(message)
            }));
            if (showThumbnail) {
              self.allShownNodes.set(node.fa, node);
            }
          });
        }
        sharedNodesContainer = JSX_("div", null, files);
      }
      contents = JSX_("div", {
        className: "chat-dropdown content have-animation"
      }, room.hasMessages() ? sharedNodesContainer : JSX_("div", {
        className: "chat-dropdown empty-txt"
      }, l[19985]), self.isLoadingMore ? JSX_("div", {
        className: "loading-spinner light small"
      }, JSX_("div", {
        className: "main-loader"
      })) : null, files.length > 0 ? JSX_("div", {
        className: "chat-share-nav body"
      }, prev, next, JSX_("div", {
        className: "chat-share-nav pages"
      }, (l[19988] ? l[19988] : "Page %1").replace("%1", currentPage + 1))) : null);
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-dropdown container"
    }, JSX_("div", {
      className: `
                        chat-dropdown
                        header
                        ${this.props.expanded ? 'expanded' : ''}
                    `,
      onClick: this.props.onToggle
    }, JSX_("span", null, this.props.title), JSX_("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), JSX_("div", {
      className: `
                        chat-shared-files-container
                        ${this.isLoadingMore ? 'is-loading' : ''}
                    `
    }, contents));
  }
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "eventuallyRenderThumbnails", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "eventuallyRenderThumbnails"), _class.prototype), _class);

;// ./js/chat/ui/incomingSharesAccordionPanel.jsx


const SharedFolderItem = ({
  node,
  isLoading
}) => {
  return JSX_("div", {
    key: node.h,
    className: `
                chat-shared-block
                incoming
                ${isLoading ? 'is-loading' : ''}
            `,
    onClick: () => M.openFolder(node.h),
    onDoubleClick: () => M.openFolder(node.h)
  }, JSX_("div", {
    className: "item-type-icon-90 icon-folder-incoming-90"
  }), JSX_("div", {
    className: "chat-shared-info"
  }, JSX_("span", {
    className: "txt"
  }, node.name), JSX_("span", {
    className: "txt small"
  }, fm_contains(node.tf, node.td))));
};
class IncSharesAccordionPanel extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  UNSAFE_componentWillMount() {
    this.hadLoaded = false;
  }
  getContactHandle() {
    const self = this;
    const room = self.props.chatRoom;
    const contactHandle = room.getParticipantsExceptMe()[0];
    if (!contactHandle || room.type !== "private") {
      return {};
    }
    return contactHandle;
  }
  render() {
    const self = this;
    const room = self.props.chatRoom;
    const contactHandle = self.getContactHandle();
    let contents = null;
    if (this.props.expanded) {
      if (!this.hadLoaded) {
        this.hadLoaded = true;
        self.isLoadingMore = true;
        dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).always(() => {
          self.isLoadingMore = false;
          Soon(() => {
            if (self.isComponentEventuallyVisible()) {
              self.safeForceUpdate();
            }
          }, 5000);
        });
      }
      let incomingSharesContainer = null;
      const sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];
      if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
        incomingSharesContainer = JSX_("div", {
          className: "chat-dropdown empty-txt"
        }, l[19986]);
      } else {
        const haveMore = sharedFolders.length > 10;
        const defSortFn = M.getSortByNameFn();
        sharedFolders.sort((a, b) => {
          const nodeA = M.d[a];
          const nodeB = M.d[b];
          return defSortFn(nodeA, nodeB, -1);
        });
        const renderNodes = [];
        for (let i = 0; i < Math.min(sharedFolders.length, 10); i++) {
          const nodeHandle = sharedFolders[i];
          const node = M.d[nodeHandle];
          if (!node) {
            continue;
          }
          renderNodes.push(JSX_(SharedFolderItem, {
            key: node.h,
            isLoading: self.isLoadingMore,
            node,
            chatRoom: room
          }));
        }
        incomingSharesContainer = JSX_("div", null, renderNodes, haveMore ? JSX_("div", {
          className: "chat-share-nav body"
        }, JSX_("div", {
          className: "chat-share-nav show-all",
          onClick () {
            M.openFolder(contactHandle);
          }
        }, JSX_("span", {
          className: "item-type-icon icon-folder-incoming-24"
        }, JSX_("span", {
          className: "item-type-icon icon-folder-incoming-24"
        })), JSX_("span", {
          className: "txt"
        }, l[19797] ? l[19797] : "Show All"))) : null);
      }
      contents = JSX_("div", {
        className: "chat-dropdown content have-animation"
      }, incomingSharesContainer, self.isLoadingMore ? JSX_("div", {
        className: "chat-dropdown empty-txt"
      }, JSX_("div", {
        className: "loading-spinner light small"
      }, JSX_("div", {
        className: "main-loader"
      }))) : null);
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-dropdown container"
    }, JSX_("div", {
      className: `
                        chat-dropdown
                        header
                        ${this.props.expanded ? 'expanded' : ''}
                    `,
      onClick: this.props.onToggle
    }, JSX_("span", null, this.props.title), JSX_("i", {
      className: "sprite-fm-mono icon-arrow-down"
    })), JSX_("div", {
      className: `
                        chat-shared-files-container
                        ${this.isLoadingMore ? 'is-loading' : ''}
                    `
    }, contents));
  }
}

;// ./js/chat/ui/chatlinkDialog.jsx




class ChatlinkDialog extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      link: l[5533],
      newTopic: ''
    };
    this.onClose = () => {
      if (this.props.onClose) {
        this.props.onClose();
      }
    };
  }
  retrieveChatLink(forced) {
    const {
      chatRoom
    } = this.props;
    if (is_chatlink) {
      return this.setState({
        link: `${getBaseUrl()}/chat/${is_chatlink.ph}#${is_chatlink.key}`
      });
    }
    if (!chatRoom.topic && !forced) {
      delete this.loading;
      return;
    }
    this.loading = chatRoom.updatePublicHandle(false, true).always(() => {
      this.loading = false;
      if (this.domRef.current) {
        this.setState({
          link: chatRoom.publicLink ? `${getBaseUrl()}/${chatRoom.publicLink}` : l[20660]
        });
      }
    });
  }
  componentDidMount() {
    this.retrieveChatLink();
    M.safeShowDialog(ChatlinkDialog.NAMESPACE, () => {
      if (!this.domRef.current) {
        throw new Error(`${ChatlinkDialog.NAMESPACE} dialog: component not mounted.`);
      }
      return $(`#${ChatlinkDialog.NAMESPACE}`);
    });
  }
  componentWillUnmount() {
    if ($.dialog === ChatlinkDialog.NAMESPACE) {
      closeDialog();
    }
  }
  render() {
    const {
      chatRoom
    } = this.props;
    const {
      newTopic,
      link
    } = this.state;
    const closeButton = this.loading ? null : JSX_("button", {
      key: "close",
      className: "mega-button negative links-button",
      onClick: this.onClose
    }, JSX_("span", null, l[148]));
    const publicLinkDetails = chatRoom.isMeeting ? l.meeting_link_details : l[20644];
    return JSX_("div", {
      ref: this.domRef
    }, JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
      id: ChatlinkDialog.NAMESPACE,
      title: chatRoom.iAmOperator() && !chatRoom.topic ? chatRoom.isMeeting ? l.rename_meeting : l[9080] : '',
      className: `
                        chat-rename-dialog
                        export-chat-links-dialog
                        group-chat-link
                        ${chatRoom.topic ? '' : 'requires-topic'}
                    `,
      onClose: this.onClose,
      dialogName: "chat-link-dialog",
      dialogType: chatRoom.iAmOperator() && !chatRoom.topic ? 'main' : 'graphic',
      chatRoom,
      popupDidMount: this.onPopupDidMount
    }), chatRoom.iAmOperator() && !chatRoom.topic ? JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_("div", {
      className: "export-chat-ink-warning"
    }, l[20617]), JSX_("div", {
      className: "rename-input-bl",
      style: {
        margin: '10px auto 20px auto'
      }
    }, JSX_("input", {
      type: "text",
      name: "newTopic",
      value: newTopic,
      style: {
        paddingLeft: 8
      },
      onChange: ev => this.setState({
        newTopic: ev.target.value
      }),
      onKeyPress: ev => ev.which === 13 && chatRoom.setRoomTopic(newTopic).then(() => this.retrieveChatLink(true)).catch(dump),
      placeholder: l[20616],
      maxLength: ChatRoom.TOPIC_MAX_LENGTH
    })))) : JSX_(REaCt().Fragment, null, JSX_("header", null, chatRoom.isMeeting ? JSX_("div", {
      className: "chat-topic-icon meeting-icon"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-video-call-filled"
    })) : JSX_("i", {
      className: "sprite-fm-uni icon-chat-group"
    }), JSX_("h2", {
      id: "chat-link-dialog-title"
    }, JSX_(utils.zT, null, chatRoom.getRoomTitle()))), JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_("div", {
      className: "chat-link-input"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-link-small"
    }), JSX_("input", {
      type: "text",
      readOnly: true,
      value: this.loading ? l[5533] : !chatRoom.topic ? l[20660] : link
    })), JSX_("div", {
      className: "info"
    }, chatRoom.publicLink || is_chatlink ? publicLinkDetails : null)))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, chatRoom.iAmOperator() && chatRoom.publicLink && JSX_("button", {
      key: "deleteLink",
      className: `
                                        mega-button
                                        links-button
                                        ${this.loading ? 'disabled' : ''}
                                    `,
      onClick: () => {
        chatRoom.updatePublicHandle(1);
        this.onClose();
      }
    }, JSX_("span", null, chatRoom.isMeeting ? l.meeting_link_delete : l[20487])), chatRoom.topic ? chatRoom.publicLink || is_chatlink ? JSX_("button", {
      className: `
                                            mega-button
                                            positive
                                            copy-to-clipboard
                                            ${this.loading ? 'disabled' : ''}
                                        `,
      onClick: () => {
        copyToClipboard(link, l[7654]);
        if (chatRoom.isMeeting) {
          eventlog(500231);
        }
      }
    }, JSX_("span", null, l[63])) : closeButton : chatRoom.iAmOperator() ? JSX_("button", {
      key: "setTopic",
      className: `
                                            mega-button
                                            positive
                                            links-button
                                            ${newTopic && newTopic.trim() ? '' : 'disabled'}
                                        `,
      onClick: () => chatRoom.setRoomTopic(newTopic).then(() => this.retrieveChatLink(true)).catch(dump)
    }, JSX_("span", null, l[20615])) : closeButton))));
  }
}
ChatlinkDialog.defaultProps = {
  requiresUpdateOnResize: true,
  disableCheckingVisibility: true
};
ChatlinkDialog.NAMESPACE = 'chat-link-dialog';
// EXTERNAL MODULE: ./js/chat/ui/historyPanel.jsx + 7 modules
const historyPanel = REQ_(5522);
// EXTERNAL MODULE: ./js/chat/ui/composedTextArea.jsx + 1 modules
const composedTextArea = REQ_(2558);
;// ./js/chat/ui/pushSettingsDialog.jsx

let _PushSettingsDialog;


class PushSettingsDialog extends REaCt().Component {
  constructor(props) {
    super(props);
    this.renderOptions = () => {
      return Object.keys(PushSettingsDialog.options).map(key => {
        key = parseInt(key, 10) || Infinity;
        return JSX_("label", {
          key,
          className: "radio-txt"
        }, PushSettingsDialog.options[key], JSX_("div", {
          className: `custom-radio small green-active ${  this.state.pushSettingsValue === key ? "radioOn" : "radioOff"}`
        }, JSX_("input", {
          type: "radio",
          name: "time-selector",
          value: key,
          checked: this.state.pushSettingsValue === key,
          onChange: () => this.setState({
            pushSettingsValue: key
          })
        })));
      });
    };
    this.state = {
      pushSettingsValue: this.props.pushSettingsValue || Infinity
    };
  }
  render() {
    return JSX_(modalDialogs.A.ModalDialog, (0,esm_extends.A)({}, this.state, {
      name: "push-settings",
      title: l.dnd_mute_title,
      subtitle: this.props.room.isMeeting ? l.meeting_dnd_subtitle : l[22015],
      className: "push-settings-dialog",
      dialogName: "push-settings-chat-dialog",
      dialogType: "tool",
      onClose: this.props.onClose
    }), JSX_("section", {
      className: "content"
    }, JSX_("div", {
      className: "content-block"
    }, JSX_("div", null, this.renderOptions()))), JSX_("footer", null, JSX_("div", {
      className: "footer-container"
    }, JSX_("button", {
      className: "mega-button",
      onClick: this.props.onClose
    }, JSX_("span", null, l.msg_dlg_cancel)), JSX_("button", {
      className: "mega-button positive",
      onClick: () => this.props.onConfirm(this.state.pushSettingsValue)
    }, JSX_("span", null, l[726])))));
  }
}
_PushSettingsDialog = PushSettingsDialog;
PushSettingsDialog.options = {
  30: l[22012],
  60: l[19048],
  360: l[22013],
  1440: l[22014],
  Infinity: l[22011]
};
PushSettingsDialog.default = _PushSettingsDialog.options[_PushSettingsDialog.options.length - 1];
;// ./js/chat/ui/meetings/workflow/alert.jsx


const NAMESPACE = 'meetings-alert';
class Alert extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  componentWillUnmount() {
    let _this$props$onTransit, _this$props;
    super.componentWillUnmount();
    (_this$props$onTransit = (_this$props = this.props).onTransition) == null || _this$props$onTransit.call(_this$props);
  }
  componentDidUpdate() {
    let _this$props$onTransit2, _this$props2;
    super.componentDidUpdate();
    (_this$props$onTransit2 = (_this$props2 = this.props).onTransition) == null || _this$props$onTransit2.call(_this$props2, this.domRef);
  }
  componentDidMount() {
    let _this$props$onTransit3, _this$props3;
    super.componentDidMount();
    (_this$props$onTransit3 = (_this$props3 = this.props).onTransition) == null || _this$props$onTransit3.call(_this$props3, this.domRef);
  }
  render() {
    const {
      type,
      className,
      content,
      children,
      offset,
      onClose
    } = this.props;
    if (content || children) {
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        ${type ? `${NAMESPACE}-${type}` : ''}
                        ${className || ''}
                    `,
        style: offset ? {
          marginTop: `${offset}px`
        } : undefined
      }, JSX_("div", {
        className: `${NAMESPACE}-content`
      }, content || children), onClose && JSX_("span", {
        className: `${NAMESPACE}-close`,
        onClick: onClose
      }, JSX_("i", {
        className: "sprite-fm-mono icon-close-component"
      })));
    }
    return null;
  }
}
Alert.TYPE = {
  LIGHT: 'light',
  NEUTRAL: 'neutral',
  MEDIUM: 'medium',
  HIGH: 'high',
  ERROR: 'error'
};
// EXTERNAL MODULE: ./js/chat/ui/meetings/schedule/helpers.jsx
const helpers = REQ_(6521);
// EXTERNAL MODULE: ./js/chat/ui/meetings/hostsObserver.jsx
const hostsObserver = REQ_(7677);
// EXTERNAL MODULE: ./js/chat/ui/inviteParticipantsPanel.jsx
const inviteParticipantsPanel = REQ_(8956);
;// ./js/chat/ui/chatOverlay.jsx



const chatOverlay_NAMESPACE = 'chat-overlay';
const ChatOverlays = {
  PARTICIPANT_LIMIT: 'participants-limit'
};
class ChatOverlay extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.MegaLogo = () => JSX_("div", {
      className: `${chatOverlay_NAMESPACE}-logo`
    }, JSX_("i", {
      className: `sprite-fm-illustration-wide ${mega.ui.isDarkTheme() ? 'mega-logo-dark' : 'img-mega-logo-light'}`
    }));
  }
  renderParticipantsLimit() {
    return JSX_(REaCt().Fragment, null, JSX_("div", {
      className: `${chatOverlay_NAMESPACE}-head`
    }, JSX_(this.MegaLogo, null), JSX_("h1", null, l.join_call_user_limit_title)), JSX_("div", {
      className: `${chatOverlay_NAMESPACE}-body`
    }, JSX_("p", null, l.call_join_user_limit_banner), JSX_(buttons.$, {
      className: "mega-button positive",
      onClick: () => {
        let _this$props$onClose, _this$props;
        (_this$props$onClose = (_this$props = this.props).onClose) == null || _this$props$onClose.call(_this$props);
      }
    }, l.call_link_user_limit_button)));
  }
  render() {
    const {
      overlayType
    } = this.props;
    let body = null;
    if (overlayType === ChatOverlays.PARTICIPANT_LIMIT) {
      body = this.renderParticipantsLimit();
    }
    if (!body) {
      if (d) {
        console.error('Invalid ChatOverlay', overlayType);
      }
      return null;
    }
    return JSX_(utils.Ay.RenderTo, {
      element: document.body
    }, JSX_("div", {
      className: `${chatOverlay_NAMESPACE} ${overlayType}`
    }, body));
  }
}

// EXTERNAL MODULE: ./js/chat/ui/meetings/workflow/utils.jsx
const workflow_utils = REQ_(2153);
;// ./js/chat/ui/meetings/schedule/occurrences.jsx





class Occurrences extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.loadingMore = false;
    this.state = {
      editDialog: false,
      occurrenceId: undefined
    };
  }
  loadOccurrences() {
    if (!this.loadingMore) {
      const {
        scheduledMeeting,
        occurrences
      } = this.props;
      const occurrenceItems = Object.values(occurrences || {});
      const lastOccurrence = occurrenceItems[occurrenceItems.length - 1];
      if (lastOccurrence) {
        this.loadingMore = true;
        scheduledMeeting.getOccurrences({
          from: lastOccurrence.start
        }).catch(dump).finally(() => {
          this.loadingMore = false;
        });
      }
    }
  }
  renderCancelConfirmation(occurrence) {
    const {
      scheduledMeeting,
      chatRoom
    } = this.props;
    const nextOccurrences = Object.values(scheduledMeeting.occurrences).filter(o => o.isUpcoming);
    if (nextOccurrences.length > 1) {
      return msgDialog(`confirmation:!^${l.cancel_meeting_occurrence_button}!${l.schedule_cancel_abort}`, 'cancel-occurrence', l.schedule_cancel_occur_dlg_title, l.schedule_cancel_occur_dlg_text, cb => cb && occurrence.cancel(), 1);
    }
    return chatRoom.hasMessages(true) ? msgDialog(`confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`, 'cancel-occurrence', l.schedule_cancel_all_dialog_title, l.schedule_cancel_all_dialog_move, cb => cb && megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, scheduledMeeting.chatId), 1) : msgDialog(`confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`, 'cancel-occurrence', l.schedule_cancel_all_dialog_title, l.schedule_cancel_all_dialog_archive, cb => cb && megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, scheduledMeeting.chatId), 1);
  }
  renderLoading() {
    return JSX_("div", {
      className: "loading-sketch"
    }, Array.from({
      length: 10
    }, (el, i) => {
      return JSX_("div", {
        key: i,
        className: "chat-occurrence"
      }, JSX_("div", {
        className: "chat-occurrence-date"
      }), JSX_("div", {
        className: "chat-occurrence-content"
      }, JSX_("div", {
        className: "chat-occurrence-title"
      }), JSX_("div", {
        className: "chat-occurrence-time"
      })));
    }));
  }
  renderOccurrences() {
    const {
      chatRoom,
      occurrences,
      occurrencesLoading,
      scheduledMeeting
    } = this.props;
    if (occurrencesLoading) {
      return this.renderLoading();
    }
    if (occurrences && occurrences.length > 0) {
      const sortedOccurrences = Object.values(occurrences).sort((a, b) => a.start - b.start);
      return JSX_(REaCt().Fragment, null, sortedOccurrences.map(occurrence => occurrence.isUpcoming ? JSX_("div", {
        key: occurrence.uid,
        className: `
                                    chat-occurrence
                                    ${occurrence.uid}
                                `
      }, JSX_("div", {
        className: "chat-occurrence-date"
      }, (0,helpers.cK)(occurrence.start) && JSX_("span", null, l.today_occurrence_label, " -"), (0,helpers.ef)(occurrence.start) && JSX_("span", null, l.tomorrow_occurrence_label, " -"), JSX_("span", null, time2date(occurrence.start / 1000, 19))), JSX_("div", {
        className: "chat-occurrence-content"
      }, JSX_("div", {
        className: "chat-occurrence-title"
      }, scheduledMeeting.title), JSX_("div", {
        className: "chat-occurrence-time"
      }, toLocaleTime(occurrence.start), " - \xA0", toLocaleTime(occurrence.end)), chatRoom.iAmOperator() && JSX_("div", {
        className: "chat-occurrence-controls"
      }, JSX_("div", {
        className: "chat-occurrence-control simpletip",
        "data-simpletip": l[1342],
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5"
      }, JSX_(buttons.$, {
        icon: "sprite-fm-mono icon-rename",
        onClick: () => {
          megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.EDIT, occurrence);
        }
      })), JSX_("div", {
        className: "chat-occurrence-control simpletip",
        "data-simpletip": l[82],
        "data-simpletipposition": "top",
        "data-simpletipoffset": "5"
      }, JSX_(buttons.$, {
        icon: "sprite-fm-mono icon-bin",
        onClick: () => this.renderCancelConfirmation(occurrence)
      }))))) : null));
    }
    return JSX_("span", null, l.no_occurrences_remain);
  }
  render() {
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-occurrences-list"
    }, JSX_(perfectScrollbar.O, {
      chatRoom: this.props.chatRoom,
      ref: ref => {
        this.contactsListScroll = ref;
      },
      disableCheckingVisibility: true,
      onUserScroll: ps => ps.isCloseToBottom(30) && this.loadOccurrences(),
      isVisible: this.isCurrentlyActive,
      options: {
        suppressScrollX: true
      }
    }, JSX_("div", {
      className: "chat-occurrences-list-inner"
    }, this.renderOccurrences())));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/fallback.jsx
const fallback = REQ_(3439);
// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const meetings_utils = REQ_(3901);
;// ./js/chat/ui/conversationpanel.jsx


let conversationpanel_dec, _dec2, conversationpanel_class;



























const Call = (0,external_React_.lazy)(() => REQ_.e( 987).then(REQ_.bind(REQ_, 8402)));
const Loading = (0,external_React_.lazy)(() => REQ_.e( 987).then(REQ_.bind(REQ_, 2914)));
const Join = (0,external_React_.lazy)(() => REQ_.e( 987).then(REQ_.bind(REQ_, 7128)));
const CloudBrowserDialog = (0,external_React_.lazy)(() => REQ_.e( 313).then(REQ_.bind(REQ_, 6961)));
const WaitingRoom = (0,external_React_.lazy)(() => REQ_.e( 752).then(REQ_.bind(REQ_, 2659)));
const ENABLE_GROUP_CALLING_FLAG = true;
const MAX_USERS_CHAT_PRIVATE = 100;
const ALERTS_BASE_OFFSET = 4;
const DISMISS_TRANSITIONS = {
  NOT_SHOWN: 0,
  SHOWN: 1,
  DISMISSED: 2
};
class EndCallButton extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.IS_MODERATOR = (0,meetings_utils.Cy)(this.props.chatRoom, u_handle);
    this.LeaveButton = (0,hostsObserver.C)(({
      hasHost,
      chatRoom,
      confirmLeave,
      onLeave
    }) => {
      return JSX_(ui_dropdowns.tJ, {
        className: "link-button",
        icon: "sprite-fm-mono icon-leave-call",
        label: l.leave,
        persistent: true,
        onClick: () => {
          const doLeave = () => hasHost(chatRoom.call ? chatRoom.call.peers.map(a => a.userHandle) : []) ? onLeave() : confirmLeave({
            title: l.assign_host_leave_call,
            body: l.assign_host_leave_call_details,
            cta: l.assign_host_button,
            altCta: l.leave_anyway
          });
          const {
            recorderCid,
            sfuClient
          } = chatRoom.call;
          return recorderCid && recorderCid === sfuClient.cid ? (0,meetings_utils.sX)(doLeave, () => sfuClient.recordingStop()) : doLeave();
        }
      });
    });
  }
  renderButton({
    label,
    onClick,
    children = null,
    disabled
  }) {
    return JSX_(buttons.$, {
      className: `
                    link-button
                    light
                    red
                    dropdown-element
                    ${disabled ? 'disabled' : ''}
                `,
      icon: "small-icon colorized horizontal-red-handset",
      label,
      onClick: disabled ? null : onClick
    }, children);
  }
  render() {
    const {
      chatRoom
    } = this.props;
    const {
      type,
      call
    } = chatRoom;
    if (call) {
      const peers = call.peers && call.peers.length;
      if (type === 'private') {
        return this.renderButton({
          label: l[5884],
          onClick: () => call.hangUp()
        });
      }
      if (this.IS_MODERATOR) {
        const doEnd = () => chatRoom.endCallForAll();
        return this.renderButton({
          label: l[5884],
          onClick: peers ? null : () => call.hangUp(),
          children: peers && JSX_(ui_dropdowns.ms, {
            className: "wide-dropdown light end-call-selector",
            noArrow: "true",
            vertOffset: 4,
            horizOffset: 0
          }, JSX_(this.LeaveButton, {
            chatRoom,
            participants: chatRoom.getCallParticipants(),
            onLeave: () => call.hangUp(),
            onConfirmDenied: () => call.hangUp()
          }), JSX_(ui_dropdowns.tJ, {
            className: "link-button",
            icon: "sprite-fm-mono icon-contacts",
            label: l.end_for_all,
            onClick: () => {
              const {
                recorderCid,
                sfuClient
              } = call;
              return recorderCid && recorderCid === u_handle ? (0,meetings_utils._F)(doEnd, () => sfuClient.recordingStop()) : doEnd();
            }
          }))
        });
      }
      return this.renderButton({
          label: peers ? l[5883] : l[5884],
          onClick: () => call.hangUp()
        })
      ;
    }
    if (chatRoom.havePendingGroupCall()) {
      return this.IS_MODERATOR ? this.renderButton({
        label: l.end_call_for_all,
        onClick: () => msgDialog('confirmation', null, l.end_call_for_all_title, l.end_call_for_all_text, cb => cb ? chatRoom.endCallForAll() : 0xDEAD),
        disabled: !chatRoom.iAmInRoom()
      }) : null;
    }
    return null;
  }
}
const StartMeetingNotification = ({
  chatRoom,
  offset,
  onWaitingRoomJoin,
  onStartCall
}) => {
  if (chatRoom.call || !megaChat.hasSupportForCalls) {
    return null;
  }
  return JSX_("div", {
    className: "in-call-notif neutral start",
    style: {
      marginTop: offset
    },
    onClick: () => {
      eventlog(500288);
      if (chatRoom.options.w && !chatRoom.iAmOperator()) {
        return onWaitingRoomJoin();
      }
      return onStartCall(meetings_utils.ZE.AUDIO);
    }
  }, JSX_("button", {
    className: "mega-button positive small"
  }, l.schedule_start_aot));
};
const JoinCallNotification = ({
  chatRoom,
  offset,
  rhpCollapsed
}) => {
  if (chatRoom.call) {
    return null;
  }
  if (!megaChat.hasSupportForCalls) {
    return JSX_(Alert, {
      className: `
                    ${rhpCollapsed ? 'full-span' : ''}
                    ${offset === ALERTS_BASE_OFFSET ? 'single-alert' : ''}
                    unsupported-call-alert-progress
                `,
      offset: offset === ALERTS_BASE_OFFSET ? 0 : offset,
      type: Alert.TYPE.MEDIUM,
      content: l.active_call_not_supported
    });
  }
  if (chatRoom.callUserLimited && !chatRoom.canJoinLimitedCall()) {
    return JSX_("div", {
      className: "call-user-limit-banner",
      style: {
        marginTop: offset
      }
    }, l.call_join_user_limit_banner);
  }
  return JSX_("div", {
    className: "in-call-notif neutral join",
    style: {
      marginTop: offset
    }
  }, JSX_("i", {
    className: "sprite-fm-mono icon-phone"
  }), JSX_(utils.P9, {
    onClick: () => {
      return (0,meetings_utils.dQ)(true, chatRoom).then(() => chatRoom.joinCall()).catch(ex => d && console.warn('Already in a call.', ex));
    }
  }, (l[20460] || 'There is an active group call. [A]Join[/A]').replace('[A]', '<button class="mega-button positive joinActiveCall small">').replace('[/A]', '</button>')));
};
const allContactsInChat = participants => {
  const currentContacts = M.u.keys();
  for (let i = 0; i < currentContacts.length; i++) {
    const k = currentContacts[i];
    if (M.u[k].c === 1 && !participants.includes(k)) {
      return false;
    }
  }
  return true;
};
const excludedParticipants = room => {
  const excParticipants = room.type === "group" || room.type === "public" ? room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) : room.getParticipants() : room.getParticipants();
  if (excParticipants.includes(u_handle)) {
    array.remove(excParticipants, u_handle, false);
  }
  return excParticipants;
};
class ConversationRightArea extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      contactPickerDialog: false,
      inviteDialog: false
    };
    this.LeaveButton = (0,hostsObserver.C)(({
      chatRoom,
      hasHost,
      confirmLeave,
      onLeave
    }) => {
      const isDisabled = chatRoom.call || is_chatlink || !chatRoom.iAmInRoom();
      const participants = chatRoom.getParticipantsExceptMe();
      return JSX_("div", {
        className: `
                        link-button
                        light
                        ${isDisabled ? 'disabled' : ''}
                    `,
        onClick: isDisabled ? null : () => hasHost(participants) || !participants.length ? onLeave() : confirmLeave({
          title: chatRoom.isMeeting ? l.assign_host_to_leave : l.assign_host_to_leave_group,
          body: chatRoom.isMeeting ? l.assign_host_to_details : l.assign_host_to_details_group,
          cta: l.assign_host_button
        })
      }, JSX_("i", {
        className: "sprite-fm-mono icon-disabled-filled"
      }), JSX_("span", null, chatRoom.isMeeting ? l.meeting_leave : l[8633]));
    });
    this.OptionsButton = ({
      icon,
      label,
      secondLabel,
      toggled,
      disabled,
      onClick
    }) => {
      const {
        chatRoom
      } = this.props;
      const isDisabled = !chatRoom.iAmOperator() || disabled;
      return JSX_(buttons.$, {
        className: `
                    link-button
                    light
                    room-settings-button
                `,
        disabled: isDisabled,
        icon: `
                    sprite-fm-mono
                    ${icon}
                `,
        label,
        secondLabel,
        secondLabelClass: "label--green",
        toggle: {
          enabled: toggled,
          onClick: isDisabled ? null : onClick
        },
        onClick: isDisabled ? null : onClick
      });
    };
    this.handleCancelMeeting = () => {
      const {
        chatRoom
      } = this.props;
      const {
        scheduledMeeting,
        chatId
      } = chatRoom || {};
      if (scheduledMeeting) {
        const {
          isRecurring,
          title
        } = scheduledMeeting;
        const doConfirm = res => {
          if (res) {
            megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, chatId);
            delay('chat-event-sm-cancel', () => eventlog(99925));
          }
        };
        if (isRecurring) {
          return chatRoom.hasMessages(true) ? msgDialog(`confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`, null, l.schedule_cancel_dialog_title.replace('%s', megaChat.html(title)), l.schedule_cancel_dialog_move_recurring, doConfirm, 1) : msgDialog(`confirmation:!^${l.schedule_cancel_dialog_confirm}!${l.schedule_cancel_abort}`, null, l.schedule_cancel_dialog_title.replace('%s', megaChat.html(title)), l.schedule_cancel_dialog_archive_recurring, doConfirm, 1);
        }
        return chatRoom.hasMessages(true) ? msgDialog(`confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`, null, l.schedule_cancel_dialog_title.replace('%s', megaChat.html(title)), l.schedule_cancel_dialog_move_single, doConfirm, 1) : msgDialog(`confirmation:!^${l.schedule_cancel_dialog_confirm}!${l.schedule_cancel_abort}`, null, l.schedule_cancel_dialog_title.replace('%s', megaChat.html(title)), l.schedule_cancel_dialog_archive_single, doConfirm, 1);
      }
    };
  }
  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }
  setRetention(chatRoom, retentionTime) {
    chatRoom.setRetention(retentionTime);
    $(document).trigger('closeDropdowns');
  }
  renderOptionsBanner() {
    const {
      chatRoom
    } = this.props;
    return !!chatRoom.options[MCO_FLAGS.WAITING_ROOM] && !!chatRoom.options[MCO_FLAGS.OPEN_INVITE] ? JSX_("div", {
      className: "room-settings-banner"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-info"
    }), JSX_(utils.P9, null, l.waiting_room_invite.replace('[A]', `<a
                                href="${l.mega_help_host}/wp-admin/post.php?post=3005&action=edit"
                                target="_blank"
                                class="ulickurl">`).replace('[/A]', '</a>'))) : null;
  }
  handleAddParticipants() {
    if (Object.values(M.u.toJS()).some(u => u.c === 1)) {
      if (allContactsInChat(excludedParticipants(this.props.chatRoom))) {
        return msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.all_contacts_added}`, `${l.all_contacts_added_to_chat}`, res => {
          if (res) {
            contactAddDialog(null, false);
          }
        }, 1);
      }
      return this.setState({
        contactPickerDialog: true
      });
    }
    msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.no_contacts}`, `${l.no_contacts_text}`, resp => {
      if (resp) {
        contactAddDialog(null, false);
      }
    }, 1);
  }
  renderPushSettingsButton() {
    const {
      pushSettingsValue,
      chatRoom,
      onPushSettingsToggled,
      onPushSettingsClicked
    } = this.props;
    const icon = pushSettingsValue || pushSettingsValue === 0 ? 'icon-notification-off-filled' : 'icon-notification-filled';
    return JSX_("div", {
      className: "push-settings"
    }, JSX_("div", {
      className: "chat-button-separator"
    }), JSX_(buttons.$, {
      className: `
                        link-button
                        light
                        push-settings-button
                        ${chatRoom.isReadOnly() ? 'disabled' : ''}
                    `,
      icon: `
                        sprite-fm-mono
                        ${icon}
                    `,
      label: chatRoom.isMeeting ? l.meeting_notifications : l[16709],
      secondLabel: (() => {
        if (pushSettingsValue !== null && pushSettingsValue !== undefined) {
          return pushSettingsValue === 0 ? PushSettingsDialog.options[Infinity] : l[23539].replace('%s', toLocaleTime(pushSettingsValue));
        }
      })(),
      secondLabelClass: "label--green",
      toggle: chatRoom.isReadOnly() ? null : {
        enabled: !pushSettingsValue && pushSettingsValue !== 0,
        onClick: () => !pushSettingsValue && pushSettingsValue !== 0 ? onPushSettingsClicked() : onPushSettingsToggled()
      },
      onClick: () => chatRoom.isReadOnly() ? null : onPushSettingsClicked()
    }), JSX_("div", {
      className: "chat-button-separator"
    }));
  }
  componentDidMount() {
    super.componentDidMount();
    megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () => {
      if (this.isMounted()) {
        this.safeForceUpdate();
      }
    });
    megaChat.rebind(`onPrepareIncomingCallDialog.${this.getUniqueId()}`, () => {
      if (this.isMounted() && this.state.inviteDialog) {
        this.setState({
          inviteDialog: false
        });
      }
    });
  }
  render() {
    let _room$messagesBuff, _room$messagesBuff2, _room$messagesBuff3, _room$messagesBuff4, _room$messagesBuff5;
    const self = this;
    const {
      chatRoom: room,
      onStartCall,
      occurrencesLoading,
      onShowScheduledDescription
    } = self.props;
    if (!room || !room.roomId) {
      return null;
    }
    if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
      return null;
    }
    self._wasAppendedEvenOnce = true;
    const startCallDisabled = isStartCallDisabled(room) || room.iAmWaitingRoomPeer();
    let startAudioCallButton;
    let startVideoCallButton;
    const isInCall = !!room.call;
    if (isInCall) {
      startAudioCallButton = startVideoCallButton = null;
    }
    if (room.type === "group" || room.type === "public") {
      if (room.getCallParticipants().length > 0 && !isInCall) {
        startAudioCallButton = startVideoCallButton = null;
      }
    }
    if (startAudioCallButton !== null) {
      startAudioCallButton = JSX_("div", {
        "data-simpletip": l.unsupported_browser_audio,
        "data-simpletipposition": "top",
        "data-simpletipoffset": "7",
        className: `
                        link-button light
                        ${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        ${startCallDisabled ? 'disabled' : ''}
                    `,
        onClick: () => onStartCall(meetings_utils.ZE.AUDIO)
      }, JSX_("i", {
        className: "sprite-fm-mono icon-phone"
      }), JSX_("span", null, l[5896]));
    }
    if (startVideoCallButton !== null) {
      startVideoCallButton = JSX_("div", {
        "data-simpletip": l.unsupported_browser_video,
        "data-simpletipposition": "top",
        "data-simpletipoffset": "7",
        className: `
                        link-button light
                        ${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        ${startCallDisabled ? 'disabled' : ''}
                    `,
        onClick: () => onStartCall(meetings_utils.ZE.VIDEO)
      }, JSX_("i", {
        className: "sprite-fm-mono icon-video-call-filled"
      }), JSX_("span", null, l[5897]));
    }
    const AVseperator = JSX_("div", {
      className: "chat-button-separator"
    });
    let isReadOnlyElement = null;
    if (room.isReadOnly()) {
      isReadOnlyElement = JSX_("center", {
        className: "center",
        style: {
          margin: "6px"
        }
      }, l.read_only_chat);
    }
    const exParticipants = excludedParticipants(room);
    let dontShowTruncateButton = false;
    if (!room.iAmOperator() || room.isReadOnly() || ((_room$messagesBuff = room.messagesBuff) == null ? void 0 : _room$messagesBuff.messages.length) === 0 || ((_room$messagesBuff2 = room.messagesBuff) == null ? void 0 : _room$messagesBuff2.messages.length) === 1 && ((_room$messagesBuff3 = room.messagesBuff) == null ? void 0 : _room$messagesBuff3.messages.getItem(0).dialogType) === "truncated") {
      dontShowTruncateButton = true;
    }
    const renameButtonClass = `
            link-button
            light
            ${(0,meetings_utils.P)() || room.isReadOnly() || !room.iAmOperator() ? 'disabled' : ''}
        `;
    const getChatLinkClass = `
            link-button
            light
            ${(0,meetings_utils.P)() || room.isReadOnly() ? 'disabled' : ''}
        `;
    let participantsList = null;
    if (room.type === "group" || room.type === "public") {
      participantsList = JSX_("div", null, isReadOnlyElement, JSX_(buttons.$, {
        className: "mega-button action invite-dialog-btn",
        icon: "sprite-fm-mono icon-user-plus-thin-outline",
        label: l[8726],
        disabled: (0,meetings_utils.P)() || room.isReadOnly() || !room.iAmOperator() && !room.publicLink && !room.options[MCO_FLAGS.OPEN_INVITE],
        onClick: () => {
          delay('chat-event-inv-rhp', () => eventlog(99963));
          if (room.type === 'group') {
            return this.handleAddParticipants();
          }
          loadingDialog.show('fetchchatlink');
          room.updatePublicHandle(false, false, true).catch(dump).always(() => {
            loadingDialog.hide('fetchchatlink');
            if (!this.isMounted()) {
              return;
            }
            if (!room.iAmOperator() && room.options[MCO_FLAGS.OPEN_INVITE] && !room.publicLink) {
              this.handleAddParticipants();
            } else if (room.type === 'public' && !room.topic) {
              this.handleAddParticipants();
            } else {
              this.setState({
                inviteDialog: true
              });
            }
          });
        }
      }), JSX_(ParticipantsList, {
        ref (r) {
          self.participantsListRef = r;
        },
        chatRoom: room,
        members: room.members,
        isCurrentlyActive: room.isCurrentlyActive
      }));
    }
    const addParticipantBtn = room.type === 'private' && JSX_(buttons.$, {
      className: "link-button light",
      icon: "sprite-fm-mono icon-add-small",
      label: l[8007],
      disabled: (0,meetings_utils.P)() || room.isReadOnly() || !(room.iAmOperator() || room.type !== 'private' && room.options[MCO_FLAGS.OPEN_INVITE]),
      onClick: () => Object.values(M.u.toJS()).some(u => u.c === 1) ? !allContactsInChat(exParticipants) ? this.setState({
        contactPickerDialog: true
      }) : msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.all_contacts_added}`, `${l.all_contacts_added_to_chat}`, res => {
        if (res) {
          contactAddDialog(null, false);
        }
      }, 1) : msgDialog(`confirmationa:!^${l[8726]}!${l.msg_dlg_cancel}`, null, `${l.no_contacts}`, `${l.no_contacts_text}`, resp => {
        if (resp) {
          contactAddDialog(null, false);
        }
      }, 1)
    });
    const waitingRoomButton = {
      icon: 'icon-clock-user-thin-solid',
      label: l.waiting_room,
      secondLabel: l.waiting_room_info,
      toggled: room.options[MCO_FLAGS.WAITING_ROOM],
      disabled: room.havePendingCall(),
      onClick: () => {
        room.toggleWaitingRoom();
        delay('chat-event-wr-create-button', () => eventlog(99937));
      }
    };
    const openInviteButton = {
      icon: 'icon-user-filled',
      label: room.isMeeting ? l.meeting_open_invite_label : l.chat_open_invite_label,
      secondLabel: l.open_invite_desc,
      toggled: room.options[MCO_FLAGS.OPEN_INVITE],
      onClick: () => {
        room.toggleOpenInvite();
        if (room.scheduledMeeting) {
          delay('chat-event-sm-allow-non-hosts', () => eventlog(99928));
        }
      }
    };
    const retentionTime = room.retentionTime ? secondsToDays(room.retentionTime) : 0;
    const ICON_ACTIVE = JSX_("i", {
      className: "sprite-fm-mono icon-check"
    });
    const retentionHistoryBtn = JSX_(buttons.$, {
      className: "link-button light history-retention-btn",
      icon: "sprite-fm-mono icon-recents-filled",
      label: l[23436],
      disabled: !room.iAmOperator() || room.isReadOnly() || (0,meetings_utils.P)(),
      secondLabel: room.getRetentionLabel(),
      secondLabelClass: "label--red",
      chatRoom: room
    }, room.iAmOperator() ? JSX_(ui_dropdowns.ms, {
      className: "retention-history-menu light",
      noArrow: "false",
      vertOffset: -53,
      horizOffset: -205
    }, JSX_("div", {
      className: "retention-history-menu__list"
    }, JSX_("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, 0)
    }, JSX_("span", null, l.disabled_chat_history_cleaning_status), retentionTime === 0 && ICON_ACTIVE), JSX_("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(1))
    }, JSX_("span", null, l[23437]), retentionTime === 1 && ICON_ACTIVE), JSX_("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(7))
    }, JSX_("span", null, l[23438]), retentionTime === 7 && ICON_ACTIVE), JSX_("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => this.setRetention(room, daysToSeconds(30))
    }, JSX_("span", null, l[23439]), retentionTime === 30 && ICON_ACTIVE), JSX_("div", {
      className: "dropdown-item link-button retention-history-menu__list__elem",
      onClick: () => {
        $(document).trigger('closeDropdowns');
        self.props.onHistoryRetentionConfig();
      }
    }, JSX_("span", null, l[23440]), [0, 1, 7, 30].indexOf(retentionTime) === -1 && ICON_ACTIVE))) : null);
    const MEMBERS_LIMITED = Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE;
    const {
      scheduledMeeting,
      isMeeting
    } = room;
    const {
      isRecurring,
      isUpcoming,
      occurrences
    } = scheduledMeeting || {};
    let archiveText = room.isMeeting ? l.archive_meeting_btn : l.archive_chat_btn;
    if (room.isArchived()) {
      archiveText = room.isMeeting ? l.unarchive_meeting_btn : l[19065];
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "chat-right-area"
    }, JSX_(perfectScrollbar.O, {
      className: "chat-right-area conversation-details-scroll",
      options: {
        'suppressScrollX': true
      },
      ref: ref => {
        this.rightScroll = ref;
      },
      triggerGlobalResize: true,
      isVisible: room.isCurrentlyActive,
      chatRoom: room
    }, JSX_("div", {
      className: "chat-right-pad"
    }, JSX_(Accordion, (0,esm_extends.A)({}, this.state, {
      chatRoom: room,
      onToggle: SoonFc(20, () => {
        if (this.rightScroll) {
          this.rightScroll.reinitialise();
        }
        if (this.participantsListRef) {
          let _this$participantsLis, _this$participantsLis2;
          (_this$participantsLis = (_this$participantsLis2 = this.participantsListRef).safeForceUpdate) == null || _this$participantsLis.call(_this$participantsLis2);
        }
      }),
      expandedPanel: {
        participants: false,
        options: false,
        occurrences: isMeeting && scheduledMeeting && isRecurring
      }
    }), participantsList ? JSX_(AccordionPanel, {
      className: "small-pad",
      title: room.isMeeting ? l.meeting_participants : l.chat_participants,
      chatRoom: room,
      key: "participants"
    }, participantsList) : null, room.type === 'public' && room.observers > 0 && !room.options.w ? JSX_("div", {
      className: "accordion-text observers"
    }, l[20466], JSX_("span", {
      className: "observers-count"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-eye-reveal"
    }), room.observers)) : JSX_("div", null), isRecurring && isUpcoming && scheduledMeeting.occurrences.some(o => o.isUpcoming) && JSX_(AccordionPanel, {
      key: "occurrences",
      className: "chat-occurrences-panel",
      accordionClass: "chatroom-occurrences-panel",
      title: l.occurrences_heading,
      chatRoom: room,
      scheduledMeeting,
      occurrences
    }, JSX_(Occurrences, {
      chatRoom: room,
      scheduledMeeting,
      occurrences,
      occurrencesLoading
    })), JSX_(AccordionPanel, {
      key: "options",
      className: "have-animation buttons",
      accordionClass: "chatroom-options-panel",
      title: l[7537],
      chatRoom: room,
      sfuClient: window.sfuClient
    }, JSX_(REaCt().Fragment, null, room.isNote ? null : JSX_(REaCt().Fragment, null, addParticipantBtn, startAudioCallButton, startVideoCallButton, JSX_(EndCallButton, {
      call: room.havePendingGroupCall() || room.haveActiveCall(),
      chatRoom: room
    }), scheduledMeeting && JSX_("div", {
      className: `
                                                        link-button light
                                                        schedule-view-desc
                                                        ${room.isReadOnly() || !scheduledMeeting.description ? 'disabled' : ''}
                                                    `,
      onClick: () => {
        if (!room.isReadOnly() && scheduledMeeting.description) {
          onShowScheduledDescription();
        }
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-description"
    }), JSX_("span", null, l.schedule_view_desc)), (room.type === 'group' || room.type === 'public') && !scheduledMeeting ? JSX_("div", {
      className: renameButtonClass,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }
        if (this.props.onRenameClicked) {
          this.props.onRenameClicked();
        }
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-rename"
    }), JSX_("span", null, room.isMeeting ? l.rename_meeting : l[9080])) : null, scheduledMeeting ? JSX_("div", {
      className: `
                                                        link-button
                                                        light
                                                        ${room.iAmOperator() ? '' : 'disabled'}
                                                    `,
      onClick: () => room.iAmOperator() ? megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.EDIT, room) : null
    }, JSX_("i", {
      className: "sprite-fm-mono icon-rename"
    }), scheduledMeeting.isRecurring ? JSX_("span", null, l.edit_meeting_series_button) : JSX_("span", null, l.edit_meeting_button)) : null, room.type === 'public' && !room.isMeeting ? JSX_("div", {
      className: getChatLinkClass,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }
        this.props.onGetManageChatLinkClicked();
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-link-filled"
    }), JSX_("span", null, l[20481])) : null, scheduledMeeting ? JSX_("div", {
      className: `
                                                        link-button
                                                        light
                                                        ${room.iAmOperator() && !scheduledMeeting.canceled ? '' : 'disabled'}
                                                    `,
      onClick: () => {
        if (room.iAmOperator() && !scheduledMeeting.canceled) {
          this.handleCancelMeeting();
        }
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-bin-filled"
    }), scheduledMeeting.isRecurring ? JSX_("span", null, l.cancel_meeting_series_button) : JSX_("span", null, l.cancel_meeting_button)) : null, !room.membersSetFromApi.members.hasOwnProperty(u_handle) && room.type === 'public' && !is_chatlink && room.publicChatHandle && room.publicChatKey ? JSX_("div", {
      className: "link-button light",
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }
        this.props.onJoinViaPublicLinkClicked();
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-rename"
    }), JSX_("span", null, l[20597])) : null, scheduledMeeting ? null : JSX_(REaCt().Fragment, null, AVseperator, JSX_(buttons.$, {
      className: "link-button light dropdown-element",
      icon: "sprite-fm-mono icon-upload-filled",
      label: l[23753],
      disabled: room.isReadOnly()
    }, JSX_(ui_dropdowns.ms, {
      className: "wide-dropdown send-files-selector light",
      noArrow: "true",
      vertOffset: 4,
      onClick: () => false
    }, JSX_("div", {
      className: "dropdown info-txt"
    }, l[23753] || 'Send...'), JSX_(ui_dropdowns.tJ, {
      className: "link-button",
      icon: "sprite-fm-mono icon-cloud-drive",
      label: l[19794] || 'My Cloud Drive',
      disabled: mega.paywall,
      onClick: () => {
        this.props.onAttachFromCloudClicked();
      }
    }), JSX_(ui_dropdowns.tJ, {
      className: "link-button",
      icon: "sprite-fm-mono icon-session-history",
      label: l[19795] || 'My computer',
      disabled: mega.paywall,
      onClick: () => {
        this.props.onAttachFromComputerClicked();
      }
    })))), this.renderPushSettingsButton()), room.type === 'private' ? null : JSX_(REaCt().Fragment, null, room.scheduledMeeting && this.OptionsButton(waitingRoomButton), this.OptionsButton(openInviteButton), this.renderOptionsBanner(), AVseperator), JSX_(buttons.$, {
      className: "link-button light export-chat-button",
      disabled: ((_room$messagesBuff4 = room.messagesBuff) == null ? void 0 : _room$messagesBuff4.messages.length) === 0 || room.exportIo,
      onClick: () => {
        room.exportToFile();
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-export-chat-filled"
    }), JSX_("span", null, room.isMeeting ? l.export_meeting_rhp : l.export_chat_rhp)), JSX_(buttons.$, {
      className: "link-button light clear-history-button",
      disabled: dontShowTruncateButton || !room.members.hasOwnProperty(u_handle),
      onClick: () => {
        if (this.props.onTruncateClicked) {
          this.props.onTruncateClicked();
        }
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-remove"
    }), JSX_("span", {
      className: "accordion-clear-history-text"
    }, room.isMeeting ? l.meeting_clear_hist : l[8871])), retentionHistoryBtn, room.iAmOperator() && room.type === 'public' && !scheduledMeeting ? JSX_("div", {
      className: "chat-enable-key-rotation-paragraph"
    }, AVseperator, JSX_("div", {
      className: `
                                                    link-button
                                                    light
                                                    ${MEMBERS_LIMITED ? 'disabled' : ''}
                                                `,
      onClick: e => {
        if (MEMBERS_LIMITED || $(e.target).closest('.disabled').length > 0) {
          return false;
        }
        this.props.onMakePrivateClicked();
      }
    }, JSX_("i", {
      className: "sprite-fm-mono icon-key"
    }), JSX_("span", null, l[20623])), JSX_("p", null, JSX_("span", null, l[20454]))) : null, AVseperator, JSX_("div", {
      className: `
                                                link-button
                                                light
                                                ${(room.members.hasOwnProperty(u_handle) || room.state === ChatRoom.STATE.LEFT) && !is_chatlink ? '' : 'disabled'}
                                            `,
      onClick: e => {
        if ($(e.target).closest('.disabled').length > 0) {
          return false;
        }
        if (room.isArchived()) {
          if (this.props.onUnarchiveClicked) {
            this.props.onUnarchiveClicked();
          }
        } else if (this.props.onArchiveClicked) {
          this.props.onArchiveClicked();
        }
      }
    }, JSX_("i", {
      className: `
                                                sprite-fm-mono
                                                ${room.isArchived() ? 'icon-unarchive' : 'icon-archive'}
                                            `
    }), JSX_("span", null, archiveText)), room.type === 'private' ? null : JSX_(this.LeaveButton, {
      chatRoom: room,
      participants: room.getParticipantsExceptMe(),
      onLeave: () => room.leave(true)
    }))), JSX_(SharedFilesAccordionPanel, {
      key: "sharedFiles",
      title: l[19796] || 'Shared Files',
      chatRoom: room,
      sharedFiles: (_room$messagesBuff5 = room.messagesBuff) == null ? void 0 : _room$messagesBuff5.sharedFiles
    }), room.type === 'private' && !room.isNote ? JSX_(IncSharesAccordionPanel, {
      key: "incomingShares",
      title: l[5542],
      chatRoom: room
    }) : null))), this.state.contactPickerDialog && JSX_(ui_contacts.hm, {
      exclude: exParticipants,
      megaChat: room.megaChat,
      multiple: true,
      className: "popup add-participant-selector",
      singleSelectedButtonLabel: room.isMeeting ? l.meeting_add_participant : l[8869],
      multipleSelectedButtonLabel: room.isMeeting ? l.meeting_add_participant : l[8869],
      nothingSelectedButtonLabel: l[8870],
      inviteWarningLabel: room.haveActiveCall(),
      chatRoom: room,
      onSelectDone: selected => {
        this.props.onAddParticipantSelected(selected);
        this.setState({
          contactPickerDialog: false
        });
      },
      onClose: () => this.setState({
        contactPickerDialog: false
      }),
      selectFooter: true
    }), this.state.inviteDialog && JSX_(modalDialogs.A.ModalDialog, {
      onClose: () => {
        this.setState({
          inviteDialog: false
        });
      },
      dialogName: "chat-link-dialog",
      chatRoom: room
    }, JSX_(inviteParticipantsPanel.Q, {
      chatRoom: room,
      onAddParticipants: () => {
        this.setState({
          inviteDialog: false
        }, () => this.handleAddParticipants());
      }
    })));
  }
}
ConversationRightArea.defaultProps = {
  'requiresUpdateOnResize': true
};
const ConversationPanel = (conversationpanel_dec = utils.Ay.SoonFcWrap(360), _dec2 = (0,mixins.N9)(0.7, 9), conversationpanel_class = class ConversationPanel extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.messagesBlockRef = REaCt().createRef();
    this.$container = undefined;
    this.$messages = undefined;
    this.selectedNodes = [];
    this.state = {
      startCallPopupIsActive: false,
      localVideoIsMinimized: false,
      isFullscreenModeEnabled: false,
      mouseOverDuringCall: false,
      attachCloudDialog: false,
      sendContactDialog: false,
      confirmDeleteDialog: false,
      pasteImageConfirmDialog: false,
      nonLoggedInJoinChatDialog: false,
      pushSettingsDialog: false,
      pushSettingsValue: null,
      messageToBeDeleted: null,
      callMinimized: false,
      editing: false,
      showHistoryRetentionDialog: false,
      setNonLoggedInJoinChatDlgTrue: null,
      hasInvalidKeys: null,
      invalidKeysBanner: null,
      descriptionDialog: false,
      occurrencesLoading: false,
      waitingRoom: false,
      callUserLimit: false,
      historyTimeOutBanner: DISMISS_TRANSITIONS.NOT_SHOWN,
      renameDialog: false,
      renameDialogValue: undefined,
      typingAreaText: ''
    };
    this.RenameDialog = () => {
      const {
        chatRoom
      } = this.props;
      const {
        renameDialogValue
      } = this.state;
      const isDisabled = renameDialogValue === chatRoom.getRoomTitle() || !$.trim(renameDialogValue).length;
      const onSubmit = () => chatRoom.setRoomTopic(renameDialogValue).then(() => this.setState({
        renameDialog: false,
        renameDialogValue: undefined
      })).catch(dump);
      return JSX_(modalDialogs.A.ModalDialog, {
        chatRoom,
        title: chatRoom.isMeeting ? l.rename_meeting : l[9080],
        name: "rename-group",
        className: "chat-rename-dialog dialog-template-main",
        onClose: () => this.setState({
          renameDialog: false,
          renameDialogValue: undefined
        }),
        buttons: [{
          label: l.msg_dlg_cancel,
          onClick: () => this.setState({
            renameDialog: false,
            renameDialogValue: undefined
          })
        }, {
          label: l[61],
          className: `
                            positive
                            ${isDisabled ? 'disabled' : ''}
                        `,
          onClick: isDisabled ? null : onSubmit
        }]
      }, JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "content-block"
      }, JSX_("div", {
        className: "dialog secondary-header"
      }, JSX_("div", {
        className: "rename-input-bl"
      }, JSX_("input", {
        type: "text",
        name: "newTopic",
        className: "chat-rename-group-dialog",
        value: renameDialogValue === undefined ? chatRoom.getRoomTitle() : renameDialogValue,
        maxLength: ChatRoom.TOPIC_MAX_LENGTH,
        onChange: ev => this.setState({
          renameDialogValue: ev.target.value.substr(0, 30)
        }),
        onKeyUp: ev => isDisabled ? null : ev.which === 13 && onSubmit()
      }))))));
    };
    this.SelectContactDialog = () => {
      const {
        chatRoom
      } = this.props;
      const excludedContacts = chatRoom.getParticipantsExceptMe().filter(userHandle => userHandle in M.u);
      return JSX_(modalDialogs.A.SelectContactDialog, {
        chatRoom,
        exclude: excludedContacts,
        onSelectClicked: selected => this.setState({
          sendContactDialog: false
        }, () => chatRoom.attachContacts(selected)),
        onClose: () => this.setState({
          sendContactDialog: false
        })
      });
    };
    this.DescriptionDialog = () => {
      const {
        chatRoom
      } = this.props;
      const dialogName = 'scheduled-description-dialog';
      return JSX_(modalDialogs.A.ModalDialog, {
        className: "scheduled-description-dialog",
        meeting: chatRoom.scheduledMeeting,
        popupDidMount: () => M.safeShowDialog(dialogName, () => $(`.${dialogName}`)),
        popupWillUnmount: () => $.dialog === dialogName && closeDialog(),
        onClose: () => this.setState({
          descriptionDialog: false
        })
      }, JSX_("header", null, JSX_("h3", null, l.schedule_desc_dlg_title)), JSX_("section", {
        className: "content"
      }, JSX_(perfectScrollbar.O, {
        className: "description-scroller"
      }, JSX_(utils.P9, {
        content: megaChat.html(chatRoom.scheduledMeeting.description).replace(/\n/g, '<br>') || l.schedule_no_desc
      }))));
    };
    this.PushSettingsDialog = () => {
      const {
        chatRoom
      } = this.props;
      const {
        pushSettingsValue
      } = this.state;
      const state = {
        pushSettingsDialog: false,
        pushSettingsValue: null
      };
      return JSX_(PushSettingsDialog, {
        room: chatRoom,
        pushSettingsValue,
        onClose: () => this.setState({
          ...state,
          pushSettingsValue
        }, () => $.dialog === 'push-settings-dialog' && closeDialog()),
        onConfirm: pushSettingsValue => this.setState({
          ...state,
          pushSettingsValue
        }, () => pushNotificationSettings.setDnd(chatRoom.chatId, pushSettingsValue === Infinity ? 0 : unixtime() + pushSettingsValue * 60))
      });
    };
    this.updateTypingAreaText = value => {
      this.setState({
        typingAreaText: value
      });
    };
    const {
      chatRoom: _chatRoom
    } = this.props;
    const uniqueId = this.getUniqueId();
    _chatRoom.rebind(`openAttachCloudDialog.${uniqueId}`, () => this.setState({
      attachCloudDialog: true
    }));
    _chatRoom.rebind(`openSendContactDialog.${uniqueId}`, () => this.setState({
      sendContactDialog: true
    }));
    _chatRoom.rebind(`openDescriptionDialog.${uniqueId}`, () => this.setState({
      descriptionDialog: true
    }));
    this.handleKeyDown = SoonFc(120, ev => this._handleKeyDown(ev));
    this.state.waitingRoom = _chatRoom.options.w && (_chatRoom.isAnonymous() || megaChat.initialChatId || is_eplusplus);
  }
  customIsEventuallyVisible() {
    return this.props.chatRoom.isCurrentlyActive;
  }
  onMouseMove() {
    if (this.isComponentEventuallyVisible()) {
      this.props.chatRoom.trigger("onChatIsFocused");
    }
  }
  _handleKeyDown() {
    if (this.__isMounted) {
      const {chatRoom} = this.props;
      if (chatRoom.isActive() && !chatRoom.isReadOnly()) {
        chatRoom.trigger("onChatIsFocused");
      }
    }
  }
  handleDeleteDialog(msg) {
    if (msg) {
      this.setState({
        editing: false,
        confirmDeleteDialog: true,
        messageToBeDeleted: msg
      });
    }
  }
  toggleExpandedFlag() {
    if (this.props.onToggleExpandedFlag) {
      this.props.onToggleExpandedFlag();
    }
    return document.body.classList[(0,meetings_utils.Av)() ? 'remove' : 'add'](meetings_utils.Fj);
  }
  startCall(type, scheduled) {
    const {
      chatRoom
    } = this.props;
    if (isStartCallDisabled(chatRoom) || chatRoom.iAmWaitingRoomPeer()) {
      return false;
    }
    return type === meetings_utils.ZE.AUDIO ? chatRoom.startAudioCall(scheduled) : chatRoom.startVideoCall(scheduled);
  }
  renderUpcomingInfo() {
    const {
      scheduledMeeting
    } = this.props.chatRoom;
    if (scheduledMeeting) {
      const {
        recurring,
        nextOccurrenceStart,
        nextOccurrenceEnd,
        isUpcoming
      } = scheduledMeeting;
      const until = `${(0,helpers.ro)(nextOccurrenceStart, nextOccurrenceEnd) ? '' : time2date(nextOccurrenceEnd / 1000, 4)} ${toLocaleTime(nextOccurrenceEnd)}`;
      return JSX_(REaCt().Fragment, null, isUpcoming && recurring && JSX_("span", null, l.next_meeting), JSX_("span", null, (l.schedule_formatted_date || '%1 from %2 to %3').replace('%1', time2date(nextOccurrenceStart / 1000, 4)).replace('%2', toLocaleTime(nextOccurrenceStart)).replace('%3', until)));
    }
    return null;
  }
  componentDidMount() {
    super.componentDidMount();
    const {
      chatRoom
    } = this.props;
    this.$container = $('.conversation-panel', '#fmholder');
    this.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', this.$container);
    window.addEventListener('keydown', this.handleKeyDown);
    chatRoom.rebind('onSendMessage.scrollToBottom', () => {
      chatRoom.scrolledToBottom = true;
      if (this.messagesListScrollable) {
        this.messagesListScrollable.scrollToBottom();
      }
    });
    chatRoom.rebind('openSendFilesDialog.cpanel', () => this.setState({
      attachCloudDialog: true
    }));
    chatRoom.rebind('showGetChatLinkDialog.ui', () => {
      createTimeoutPromise(() => chatRoom.topic && chatRoom.state === ChatRoom.STATE.READY, 350, 15000).always(() => {
        return chatRoom.isCurrentlyActive ? this.setState({
          chatLinkDialog: true
        }) : chatRoom.updatePublicHandle(false, true);
      });
    });
    if (chatRoom.type === 'private') {
      const otherContactHash = chatRoom.getParticipantsExceptMe()[0];
      if (otherContactHash in M.u) {
        this._privateChangeListener = M.u[otherContactHash].addChangeListener(() => {
          if (!this.isMounted()) {
            return 0xDEAD;
          }
          this.safeForceUpdate();
        });
      }
    }
    if (is_chatlink && !chatRoom.isMeeting) {
      this.state.setNonLoggedInJoinChatDlgTrue = setTimeout(() => {
        M.safeShowDialog('chat-links-preview-desktop', () => {
          if (this.isMounted()) {
            this.setState({
              nonLoggedInJoinChatDialog: true
            });
          }
        });
      }, rand_range(5, 10) * 1000);
    }
    if (is_chatlink && chatRoom.isMeeting && u_type !== false && u_type < 3) {
      eventlog(99747, JSON.stringify([1, u_type | 0]), true);
    }
    chatRoom._uiIsMounted = true;
    chatRoom.$rConversationPanel = this;
    onIdle(() => this.isMounted() && chatRoom.trigger('onComponentDidMount'));
    ChatdIntegration._waitForProtocolHandler(chatRoom, () => {
      if (this.isMounted()) {
        const hasInvalidKeys = chatRoom.hasInvalidKeys();
        this.setState({
          hasInvalidKeys,
          invalidKeysBanner: hasInvalidKeys
        }, () => this.safeForceUpdate());
      }
    });
    megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () => {
      return this.isMounted() && this.setState({
        occurrencesLoading: false
      });
    });
    chatRoom.rebind(`wrOnJoinNotAllowed.${this.getUniqueId()}`, () => {
      return this.isMounted() && this.setState({
        waitingRoom: true
      });
    });
    chatRoom.rebind(`wrOnJoinAllowed.${this.getUniqueId()}`, () => {
      return this.isMounted() && this.setState({
        waitingRoom: false
      });
    });
    chatRoom.rebind(`onCallUserLimitExceeded.${this.getUniqueId()}`, () => {
      if (!this.isMounted()) {
        return;
      }
      if (megaChat.initialChatId || is_eplusplus) {
        this.setState({
          callUserLimit: true
        });
      }
    });
    chatRoom.rebind(`onHistTimeoutChange.${this.getUniqueId()}`, () => {
      if (this.state.historyTimeOutBanner === DISMISS_TRANSITIONS.NOT_SHOWN && chatRoom.historyTimedOut) {
        this.setState({
          historyTimeOutBanner: DISMISS_TRANSITIONS.SHOWN
        });
      } else if (this.state.historyTimeOutBanner && !chatRoom.historyTimedOut) {
        this.setState({
          historyTimeOutBanner: DISMISS_TRANSITIONS.NOT_SHOWN
        });
      }
    });
    if (chatRoom.options.w) {
      chatRoom.rebind(`onMembersUpdated.${this.getUniqueId()}`, (ev, {
        userId,
        priv
      }) => {
        if (userId === u_handle && priv !== ChatRoom.MembersSet.PRIVILEGE_STATE.LEFT) {
          chatRoom.unbind(`onMembersUpdated.${this.getUniqueId()}`);
          if (is_chatlink) {
            return megaChat.routing.reinitAndOpenExistingChat(chatRoom.chatId, chatRoom.publicChatHandle).then(chatRoom => chatRoom.havePendingCall() && priv === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR && chatRoom.joinCall()).catch(dump);
          }
          return this.state.waitingRoom && this.setState({
            waitingRoom: priv !== ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR
          });
        }
      });
    }
    this.pageChangeListener = mBroadcaster.addListener('beforepagechange', () => M.chat && this.state.waitingRoom && this.setState({
      waitingRoom: false
    }, () => this.safeForceUpdate()));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    const self = this;
    const {chatRoom} = self.props;
    chatRoom._uiIsMounted = true;
    if (this._privateChangeListener) {
      const otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];
      if (otherContactHash in M.u) {
        M.u[otherContactHash].removeChangeListener(this._privateChangeListener);
        delete this._privateChangeListener;
      }
    }
    mBroadcaster.removeListener(this.pageChangeListener);
    this.props.chatRoom.unbind(`openAttachCloudDialog.${this.getUniqueId()}`);
    this.props.chatRoom.unbind(`openSendContactDialog.${this.getUniqueId()}`);
    this.props.chatRoom.unbind(`openDescriptionDialog.${this.getUniqueId()}`);
    window.removeEventListener('keydown', self.handleKeyDown);
    $(document).off(`fullscreenchange.megaChat_${chatRoom.roomId}`);
    $(document).off(`keydown.keyboardScroll_${chatRoom.roomId}`);
    this.props.chatRoom.unbind(`wrOnJoinNotAllowed.${this.getUniqueId()}`);
    this.props.chatRoom.unbind(`wrOnJoinAllowed.${this.getUniqueId()}`);
    megaChat.unbind(`onIncomingCall.${this.getUniqueId()}`);
    this.props.chatRoom.unbind(`onHistTimeoutChange.${this.getUniqueId()}`);
  }
  componentDidUpdate(prevProps, prevState) {
    const self = this;
    const room = this.props.chatRoom;
    room.megaChat.updateSectionUnreadCount();
    if (prevProps.isActive === false && self.props.isActive === true) {
      const $typeArea = $('.messages-textarea:visible:first', this.$container);
      if ($typeArea.length === 1) {
        $typeArea.trigger("focus");
        moveCursortoToEnd($typeArea[0]);
      }
    }
    if (!prevState.renameDialog && self.state.renameDialog === true) {
      Soon(() => {
        const $input = $('.chat-rename-dialog input');
        if ($input && $input[0] && !$($input[0]).is(":focus")) {
          $input.trigger("focus");
          $input[0].selectionStart = 0;
          $input[0].selectionEnd = $input.val().length;
        }
      });
    }
    if (self.$messages && self.isComponentEventuallyVisible()) {
      $(window).rebind('pastedimage.chatRoom', (e, blob, fileName) => {
        if (self.$messages && self.isComponentEventuallyVisible()) {
          self.setState({
            'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)]
          });
          e.preventDefault();
        }
      });
      self.props.chatRoom.trigger("onComponentDidUpdate");
    }
  }
  isActive() {
    return document.hasFocus() && this.$messages && this.$messages.is(":visible");
  }
  render() {
    const self = this;
    const room = this.props.chatRoom;
    if (!room || !room.roomId) {
      return null;
    }
    const contacts = room.getParticipantsExceptMe();
    let contactHandle;
    let contact;
    let nonLoggedInJoinChatDialog = null;
    if (self.state.nonLoggedInJoinChatDialog === true) {
      const usersCount = Object.keys(room.members).length;
      const closeJoinDialog = () => {
        onIdle(() => {
          if ($.dialog === 'chat-links-preview-desktop') {
            closeDialog();
          }
        });
        self.setState({
          'nonLoggedInJoinChatDialog': false
        });
      };
      nonLoggedInJoinChatDialog = JSX_(modalDialogs.A.ModalDialog, {
        title: l[20596],
        className: "mega-dialog chat-links-preview-desktop dialog-template-graphic",
        chatRoom: room,
        onClose: closeJoinDialog
      }, JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "chatlink-contents"
      }, JSX_("div", {
        className: "huge-icon group-chat"
      }), JSX_("h3", null, JSX_(utils.zT, null, room.getRoomTitle())), JSX_("h5", null, usersCount ? mega.icu.format(l[20233], usersCount) : ''), JSX_("p", null, l[20595]))), JSX_("footer", null, JSX_("div", {
        className: "bottom-buttons"
      }, JSX_("button", {
        className: "mega-button positive",
        onClick: () => {
          closeJoinDialog();
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle, false, false, false, () => {
            megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey).then(() => {
              delete megaChat.initialPubChatHandle;
            }, ex => {
              console.error("Failed to join room:", ex);
            });
          });
        }
      }, l[20597]), JSX_("button", {
        className: "mega-button",
        onClick: closeJoinDialog
      }, l[18682]))));
    }
    let privateChatDialog;
    if (self.state.privateChatDialog === true) {
      const onClose = () => this.setState({
        privateChatDialog: false
      });
      privateChatDialog = JSX_(modalDialogs.A.ModalDialog, {
        title: l[20594],
        className: "mega-dialog create-private-chat",
        chatRoom: room,
        onClose,
        dialogType: "action",
        dialogName: "create-private-chat-dialog"
      }, JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "content-block"
      }, JSX_("i", {
        className: "huge-icon lock"
      }), JSX_("div", {
        className: "dialog-body-text"
      }, JSX_("strong", null, l[20590]), JSX_("br", null), JSX_("span", null, l[20591])))), JSX_("footer", null, JSX_("div", {
        className: "footer-container"
      }, JSX_("button", {
        className: "mega-button positive large",
        onClick: () => {
          this.props.chatRoom.switchOffPublicMode();
          onClose();
        }
      }, JSX_("span", null, l[20593])))));
    }
    let confirmDeleteDialog = null;
    if (self.state.confirmDeleteDialog === true) {
      confirmDeleteDialog = JSX_(modalDialogs.A.ConfirmDialog, {
        chatRoom: room,
        dialogType: "main",
        title: l[8004],
        subtitle: l[8879],
        name: "delete-message",
        pref: "1",
        onClose: () => {
          self.setState({
            'confirmDeleteDialog': false
          });
        },
        onConfirmClicked: () => {
          const msg = self.state.messageToBeDeleted;
          if (!msg) {
            return;
          }
          const chatdint = room.megaChat.plugins.chatdIntegration;
          if (msg.getState() === Message.STATE.SENT || msg.getState() === Message.STATE.DELIVERED || msg.getState() === Message.STATE.NOT_SENT) {
            const textContents = msg.textContents || '';
            if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
              const attachmentMetadata = msg.getAttachmentMeta() || [];
              Promise.all(attachmentMetadata.map(v => M.moveToRubbish(v.h))).catch(dump);
            }
            chatdint.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
            msg.deleted = true;
            msg.textContents = "";
          } else if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
            chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
          }
          self.setState({
            'confirmDeleteDialog': false,
            'messageToBeDeleted': false
          });
          if (msg.getState && msg.getState() === Message.STATE.NOT_SENT && !msg.requiresManualRetry) {
            msg.message = "";
            msg.textContents = "";
            msg.messageHtml = "";
            msg.deleted = true;
            msg.trigger('onChange', [msg, "deleted", false, true]);
          }
        }
      }, JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "content-block"
      }, JSX_(generic.A, {
        className: " dialog-wrapper",
        message: self.state.messageToBeDeleted,
        hideActionButtons: true,
        initTextScrolling: true,
        dialog: true,
        chatRoom: self.props.chatRoom
      }))));
    }
    if (self.state.pasteImageConfirmDialog) {
      confirmDeleteDialog = JSX_(modalDialogs.A.ConfirmDialog, {
        chatRoom: room,
        title: l[20905],
        subtitle: l[20906],
        icon: "sprite-fm-uni icon-question",
        name: "paste-image-chat",
        pref: "2",
        onClose: () => {
          self.setState({
            'pasteImageConfirmDialog': false
          });
        },
        onConfirmClicked: () => {
          const meta = self.state.pasteImageConfirmDialog;
          if (!meta) {
            return;
          }
          try {
            Object.defineProperty(meta[0], 'name', {
              configurable: true,
              writeable: true,
              value: `${Date.now()  }.${  M.getSafeName(meta[1] || meta[0].name)}`
            });
          } catch (e) {}
          self.props.chatRoom.scrolledToBottom = true;
          M.addUpload([meta[0]]);
          self.setState({
            'pasteImageConfirmDialog': false
          });
          URL.revokeObjectURL(meta[2]);
        }
      }, JSX_("img", {
        src: self.state.pasteImageConfirmDialog[2],
        style: {
          maxWidth: "90%",
          height: "auto",
          maxHeight: $(document).outerHeight() * 0.3,
          margin: '10px auto',
          display: 'block',
          border: '1px solid #ccc',
          borderRadius: '4px'
        },
        onLoad (e) {
          $(e.target).parents('.paste-image-chat').position({
            of: $(document.body)
          });
        }
      }));
    }
    if (self.state.truncateDialog === true) {
      confirmDeleteDialog = JSX_(modalDialogs.A.ConfirmDialog, {
        chatRoom: room,
        title: room.isMeeting ? l.meeting_clear_hist : l[8871],
        subtitle: room.isMeeting ? l.meeting_trunc_txt : l[8881],
        icon: "sprite-fm-uni icon-question",
        name: "truncate-conversation",
        pref: "3",
        dontShowAgainCheckbox: false,
        onClose: () => {
          self.setState({
            'truncateDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.truncate();
          self.setState({
            'truncateDialog': false
          });
        }
      });
    }
    if (self.state.archiveDialog === true) {
      confirmDeleteDialog = JSX_(modalDialogs.A.ConfirmDialog, {
        chatRoom: room,
        title: room.isMeeting ? l.meeting_archive_dlg : l[19068],
        subtitle: room.isMeeting ? l.meeting_archive_dlg_text : l[19069],
        icon: "sprite-fm-uni icon-question",
        name: "archive-conversation-dialog",
        pref: "4",
        onClose: () => {
          self.setState({
            'archiveDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.archive();
          self.setState({
            'archiveDialog': false
          });
        }
      });
    }
    if (self.state.unarchiveDialog === true) {
      confirmDeleteDialog = JSX_(modalDialogs.A.ConfirmDialog, {
        chatRoom: room,
        title: room.isMeeting ? l.meeting_unarchive_dlg : l[19063],
        subtitle: room.isMeeting ? l.meeting_unarchive_dlg_text : l[19064],
        icon: "sprite-fm-uni icon-question",
        name: "unarchive-conversation-dialog",
        pref: "5",
        onClose: () => {
          self.setState({
            'unarchiveDialog': false
          });
        },
        onConfirmClicked: () => {
          self.props.chatRoom.scrolledToBottom = true;
          room.unarchive();
          self.setState({
            'unarchiveDialog': false
          });
        }
      });
    }
    let topicInfo = null;
    const isUpcoming = room.scheduledMeeting && room.scheduledMeeting.isUpcoming;
    const isRecurring = room.scheduledMeeting && room.scheduledMeeting.isRecurring;
    if (room.type === 'group' || room.type === 'public') {
      topicInfo = JSX_("div", {
        className: "chat-topic-info"
      }, JSX_("div", {
        className: `
                            chat-topic-icon
                            ${room.isMeeting ? 'meeting-icon' : ''}
                        `
      }, JSX_("i", {
        className: room.isMeeting ? 'sprite-fm-mono icon-video-call-filled' : 'sprite-fm-uni icon-chat-group'
      })), JSX_("div", {
        className: "chat-topic-text"
      }, JSX_("span", {
        className: "txt"
      }, JSX_(utils.zT, null, room.getRoomTitle()), isUpcoming && isRecurring && JSX_("i", {
        className: "sprite-fm-mono recurring-meeting icon-repeat-thin-solid"
      })), JSX_("span", {
        className: "txt small"
      }, is_chatlink && isUpcoming && !isRecurring ? this.renderUpcomingInfo() : JSX_(ui_contacts.U5, {
        chatRoom: room
      }))));
    } else {
      contactHandle = contacts[0];
      contact = M.u[contactHandle || u_handle];
      topicInfo = megaChat.WITH_SELF_NOTE && room.isNote ? JSX_("div", {
        className: "note-chat-topic"
      }, JSX_("div", {
        className: "note-chat-signifier"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-file-text-thin-outline note-chat-icon"
      })), JSX_("span", {
        className: "note-chat-label"
      }, l.note_label)) : JSX_(ui_contacts.nB, {
        key: contact.u,
        className: "short",
        chatRoom: room,
        contact,
        noContextButton: true,
        showLastGreen: true
      });
    }
    let historyRetentionDialog = null;
    if (self.state.showHistoryRetentionDialog === true) {
      historyRetentionDialog = JSX_(HistoryRetentionDialog, {
        chatRoom: room,
        title: '',
        name: "rename-group",
        className: "",
        onClose: () => {
          self.setState({
            showHistoryRetentionDialog: false
          });
        }
      });
    }
    if (this.state.waitingRoom) {
      return JSX_(WaitingRoom, {
        chatRoom: room,
        havePendingCall: room.havePendingCall(),
        onWaitingRoomLeave: () => {
          let _room$call;
          (_room$call = room.call) == null || _room$call.destroy();
          if (is_eplusplus) {
            room.leave(true);
            return onIdle(M.logout);
          }
          return this.setState({
            waitingRoom: false
          }, () => {
            onIdle(() => {
              if (megaChat.initialChatId) {
                megaChat.initialChatId = undefined;
                loadSubPage(getLandingPage());
              }
            });
          });
        }
      });
    }
    if (this.state.callUserLimit) {
      return JSX_(ChatOverlay, {
        overlayType: ChatOverlays.PARTICIPANT_LIMIT,
        onClose: () => {
          if (is_eplusplus) {
            location.replace('https://mega.io');
          } else {
            this.setState({
              callUserLimit: false
            });
          }
        }
      });
    }
    const startCallDisabled = isStartCallDisabled(room) || room.iAmWaitingRoomPeer();
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    conversation-panel
                    ${room.type === 'public' ? 'group-chat ' : ''}
                    ${room.type}-chat
                    ${!room.isCurrentlyActive || megaChat._joinDialogIsShown ? 'hidden' : ''}
                `,
      onMouseMove: () => self.onMouseMove(),
      "data-room-id": self.props.chatRoom.chatId
    }, JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, room.meetingsLoading && JSX_(Loading, {
      chatRoom: room,
      title: room.meetingsLoading.title
    }), room.call && JSX_(Call, {
      chatRoom: room,
      peers: room.call.peers,
      call: room.call,
      minimized: this.state.callMinimized,
      typingAreaText: this.state.typingAreaText,
      onCallMinimize: () => {
        return this.state.callMinimized ? null : this.setState({
          callMinimized: true
        }, () => {
          this.toggleExpandedFlag();
          this.safeForceUpdate();
        });
      },
      onCallExpand: () => {
        return this.state.callMinimized && this.setState({
          callMinimized: false
        }, () => {
          $.hideTopMenu();
          if ($.dialog) {
            closeDialog();
          }
          loadSubPage('fm/chat');
          room.show();
          this.toggleExpandedFlag();
        });
      },
      didMount: () => {
        this.toggleExpandedFlag();
        if (room.isMeeting) {
          room.updatePublicHandle().catch(dump);
        }
      },
      willUnmount: minimised => this.setState({
        callMinimized: false
      }, () => minimised ? null : this.toggleExpandedFlag()),
      onCallEnd: () => this.safeForceUpdate(),
      onDeleteMessage: msg => this.handleDeleteDialog(msg),
      onTypingAreaChanged: this.updateTypingAreaText,
      parent: this
    }), megaChat.initialPubChatHandle && room.publicChatHandle === megaChat.initialPubChatHandle && !room.call && room.isMeeting && !room.call && room.activeCallIds.length > 0 && JSX_(Join, {
      initialView: u_type || is_eplusplus ? workflow_utils.j.ACCOUNT : workflow_utils.j.INITIAL,
      chatRoom: room,
      onJoinGuestClick: (firstName, lastName, audioFlag, videoFlag) => {
        room.meetingsLoading = l.joining;
        u_eplusplus(firstName, lastName).then(() => {
          return megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey);
        }).then(() => {
          delete megaChat.initialPubChatHandle;
          return megaChat.getChatById(room.chatId).joinCall(audioFlag, videoFlag);
        }).catch(ex => {
          if (d) {
            console.error('E++ account failure!', ex);
          }
          setTimeout(() => {
            msgDialog('warninga', l[135], l.eplusplus_create_failed, escapeHTML(api_strerror(ex) || ex));
          }, 1234);
          eventlog(99745, JSON.stringify([1, String(ex).split('\n')[0]]));
        });
      },
      onJoinClick: (audioFlag, videoFlag) => {
        const {chatId} = room;
        if (room.members[u_handle]) {
          delete megaChat.initialPubChatHandle;
          megaChat.routing.reinitAndOpenExistingChat(chatId, room.publicChatHandle).then(() => {
            return megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
          }).catch(ex => {
            console.error("Failed to open existing room and join call:", ex);
          });
        } else {
          megaChat.routing.reinitAndJoinPublicChat(chatId, room.publicChatHandle, room.publicChatKey).then(() => {
            delete megaChat.initialPubChatHandle;
            return megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
          }).catch(ex => {
            console.error("Failed to join room:", ex);
          });
        }
      }
    })), JSX_("div", {
      className: `
                        chat-content-block
                        ${room.megaChat.chatUIFlags.convPanelCollapse ? 'no-pane' : 'with-pane'}
                    `
    }, room.megaChat.chatUIFlags.convPanelCollapse ? null : JSX_(ConversationRightArea, {
      isVisible: this.props.chatRoom.isCurrentlyActive,
      chatRoom: this.props.chatRoom,
      roomFlags: this.props.chatRoom.flags,
      members: this.props.chatRoom.membersSetFromApi,
      messagesBuff: room.messagesBuff,
      pushSettingsValue: pushNotificationSettings.getDnd(this.props.chatRoom.chatId),
      occurrencesLoading: this.state.occurrencesLoading,
      onStartCall: mode => (0,meetings_utils.dQ)(room.haveActiveCall(), room).then(() => this.startCall(mode)).catch(() => d && console.warn('Already in a call.')),
      onAttachFromComputerClicked: () => this.props.chatRoom.uploadFromComputer(),
      onTruncateClicked: () => this.setState({
        truncateDialog: true
      }),
      onArchiveClicked: () => this.setState({
        archiveDialog: true
      }),
      onUnarchiveClicked: () => this.setState({
        unarchiveDialog: true
      }),
      onRenameClicked: () => {
        this.setState({
          renameDialog: true,
          renameDialogValue: this.props.chatRoom.getRoomTitle()
        });
      },
      onGetManageChatLinkClicked: () => this.setState({
        chatLinkDialog: true
      }),
      onMakePrivateClicked: () => this.setState({
        privateChatDialog: true
      }),
      onCloseClicked: () => room.destroy(),
      onJoinViaPublicLinkClicked: () => room.joinViaPublicHandle(),
      onSwitchOffPublicMode: topic => room.switchOffPublicMode(topic),
      onAttachFromCloudClicked: () => this.setState({
        attachCloudDialog: true
      }),
      onPushSettingsClicked: () => M.safeShowDialog('push-settings-dialog', () => this.setState({
        pushSettingsDialog: true
      })),
      onPushSettingsToggled: () => {
        return room.dnd || room.dnd === 0 ? this.setState({
          pushSettingsValue: null
        }, () => pushNotificationSettings.disableDnd(room.chatId)) : pushNotificationSettings.setDnd(room.chatId, 0);
      },
      onHistoryRetentionConfig: () => this.setState({
        showHistoryRetentionDialog: true
      }),
      onAddParticipantSelected: contactHashes => {
        room.scrolledToBottom = true;
        if (room.type === 'group' || room.type === 'public') {
          if (room.options.w && room.call) {
            let _room$call$sfuClient;
            (_room$call$sfuClient = room.call.sfuClient) == null || _room$call$sfuClient.wrAllowJoin(contactHashes);
          }
          return room.trigger('onAddUserRequest', [contactHashes]);
        }
        loadingDialog.show();
        megaChat.trigger('onNewGroupChatRequest', [[...room.getParticipantsExceptMe(), ...contactHashes], {
          keyRotation: false,
          topic: ''
        }]);
      },
      onShowScheduledDescription: room.scheduledMeeting ? () => this.setState({
        descriptionDialog: true
      }) : null
    }), this.state.sendContactDialog && JSX_(this.SelectContactDialog, null), this.state.descriptionDialog && JSX_(this.DescriptionDialog, null), this.state.pushSettingsDialog && JSX_(this.PushSettingsDialog, null), JSX_(external_React_.Suspense, {
      fallback: JSX_(fallback.A, null)
    }, this.state.attachCloudDialog && JSX_(CloudBrowserDialog, {
      room,
      allowAttachFolders: true,
      onSelected: nodes => {
        this.selectedNodes = nodes;
      },
      onAttachClicked: () => {
        this.setState({
          attachCloudDialog: false
        }, () => {
          chatRoom.scrolledToBottom = true;
          chatRoom.attachNodes(this.selectedNodes).catch(dump);
        });
      },
      onClose: () => {
        this.setState({
          attachCloudDialog: false
        }, () => {
          this.selectedNodes = [];
        });
      }
    })), privateChatDialog, nonLoggedInJoinChatDialog, confirmDeleteDialog, historyRetentionDialog, null, this.state.renameDialog && JSX_(this.RenameDialog, null), this.state.chatLinkDialog && JSX_(ChatlinkDialog, {
      chatRoom: this.props.chatRoom,
      onClose: () => this.setState({
        chatLinkDialog: false
      })
    }), JSX_("div", {
      className: `
                            chat-topic-block
                            ${room.isNote ? 'is-note' : ''}
                        `
    }, JSX_("div", {
      className: "chat-topic-buttons"
    }, room.type === 'public' && room.isMeeting && JSX_(buttons.$, {
      className: "mega-button small share-meeting-button",
      label: l.share_meeting_button,
      onClick: () => this.setState({
        chatLinkDialog: true
      }, () => eventlog(500230))
    }), JSX_(buttons.$, {
      className: "right",
      disableCheckingVisibility: true,
      icon: "sprite-fm-mono icon-info-filled",
      onClick: () => room.megaChat.toggleUIFlag('convPanelCollapse')
    }), room.isNote ? null : JSX_(REaCt().Fragment, null, JSX_("div", {
      "data-simpletip": l.unsupported_browser_video,
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      className: `
                                            ${!megaChat.hasSupportForCalls ? 'simpletip' : ''}
                                            right
                                            ${startCallDisabled ? 'disabled' : ''}
                                        `
    }, JSX_(buttons.$, {
      icon: "sprite-fm-mono icon-video-call-filled",
      onClick: () => startCallDisabled ? false : (0,meetings_utils.dQ)(room.haveActiveCall(), room).then(() => this.startCall(meetings_utils.ZE.VIDEO)).catch(() => d && console.warn('Already in a call.')).then(() => room.isMeeting ? eventlog(500289) : eventlog(500290))
    })), JSX_("div", {
      "data-simpletip": l.unsupported_browser_audio,
      "data-simpletipposition": "top",
      "data-simpletipoffset": "5",
      className: `
                                            ${!megaChat.hasSupportForCalls ? 'simpletip' : ''}
                                            right
                                            ${startCallDisabled ? 'disabled' : ''}
                                        `
    }, JSX_(buttons.$, {
      icon: "sprite-fm-mono icon-phone",
      onClick: () => startCallDisabled ? false : (0,meetings_utils.dQ)(room.haveActiveCall(), room).then(() => this.startCall(meetings_utils.ZE.AUDIO)).catch(() => d && console.warn('Already in a call.')).then(() => room.isMeeting ? eventlog(500291) : eventlog(500292))
    })))), topicInfo), JSX_("div", {
      ref: this.messagesBlockRef,
      className: `
                            messages-block
                            ${""}
                        `
    }, this.state.hasInvalidKeys && this.state.invalidKeysBanner && JSX_(Alert, {
      type: Alert.TYPE.HIGH,
      className: `
                                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                                    ${this.props.offset === ALERTS_BASE_OFFSET ? 'single-alert' : ''}
                                `,
      offset: this.props.offset === ALERTS_BASE_OFFSET ? 0 : this.props.offset,
      content: JSX_(REaCt().Fragment, null, l.chat_key_failed_banner.split('[A]')[0], JSX_("a", {
        onClick: () => M.reload()
      }, l.chat_key_failed_banner.substring(l.chat_key_failed_banner.indexOf('[A]') + 3, l.chat_key_failed_banner.indexOf('[/A]'))), l.chat_key_failed_banner.split('[/A]')[1]),
      onClose: () => this.setState({
        invalidKeysBanner: false
      })
    }), this.state.historyTimeOutBanner === DISMISS_TRANSITIONS.SHOWN && JSX_(Alert, {
      type: Alert.TYPE.ERROR,
      className: `
                                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                                    ${this.props.offset === ALERTS_BASE_OFFSET ? 'single_alert' : ''}
                                    history-timeout-banner
                                `,
      offset: this.props.offset === ALERTS_BASE_OFFSET ? 0 : this.props.offset,
      content: JSX_(REaCt().Fragment, null, l.chat_timeout_banner, JSX_("a", {
        onClick: () => location.reload()
      }, l[85])),
      onClose: () => this.setState({
        historyTimeOutBanner: DISMISS_TRANSITIONS.DISMISSED
      })
    }), JSX_(historyPanel.A, (0,esm_extends.A)({}, this.props, {
      onMessagesListScrollableMount: mls => {
        this.messagesListScrollable = mls;
      },
      ref: historyPanel => {
        this.historyPanel = historyPanel;
      },
      onDeleteClicked: msg => this.handleDeleteDialog(msg)
    })), !is_chatlink && room.state !== ChatRoom.STATE.LEFT && navigator.onLine && room.scheduledMeeting && !room.isArchived() && !this.state.hasInvalidKeys && !isStartCallDisabled(room) ? JSX_(StartMeetingNotification, {
      chatRoom: room,
      offset: this.props.offset,
      onWaitingRoomJoin: () => this.setState({
        waitingRoom: true
      }),
      onStartCall: mode => {
        return isStartCallDisabled(room) ? null : (0,meetings_utils.dQ)(true, room).then(() => this.startCall(mode, true)).catch(ex => d && console.warn(`Already in a call. ${ex}`));
      }
    }) : null, !is_chatlink && room.state !== ChatRoom.STATE.LEFT && (room.havePendingGroupCall() || room.havePendingCall()) && !this.state.hasInvalidKeys && navigator.onLine ? JSX_(JoinCallNotification, {
      rhpCollapsed: megaChat.chatUIFlags.convPanelCollapse,
      chatRoom: room,
      offset: this.props.offset
    }) : null, room.isAnonymous() ? JSX_("div", {
      className: "join-chat-block"
    }, JSX_("div", {
      className: "mega-button large positive",
      onClick: () => {
        const join = () => {
          megaChat.routing.reinitAndJoinPublicChat(room.chatId, room.publicChatHandle, room.publicChatKey).then(() => delete megaChat.initialPubChatHandle, ex => console.error("Failed to join room:", ex));
        };
        if (u_type === 0) {
          return loadSubPage('register');
        }
        if (u_type === false) {
          clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
          megaChat.loginOrRegisterBeforeJoining(room.publicChatHandle, false, false, false, join);
          return;
        }
        clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
        join();
      }
    }, l[20597])) : JSX_(composedTextArea.A, {
      chatRoom: room,
      parent: this,
      containerRef: this.messagesBlockRef,
      typingAreaText: this.state.typingAreaText,
      onTypingAreaChanged: this.updateTypingAreaText
    }))));
  }
}, (0,applyDecoratedDescriptor.A)(conversationpanel_class.prototype, "onMouseMove", [conversationpanel_dec], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "onMouseMove"), conversationpanel_class.prototype), (0,applyDecoratedDescriptor.A)(conversationpanel_class.prototype, "render", [_dec2], Object.getOwnPropertyDescriptor(conversationpanel_class.prototype, "render"), conversationpanel_class.prototype), conversationpanel_class);
class ConversationPanels extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.notificationListener = 'meetings:notificationPermissions';
    this.notificationGranted = undefined;
    this.notificationHelpURL = `${l.mega_help_host}/chats-meetings/meetings/enable-notification-browser-system-permission`;
    this.state = {
      supportAlert: undefined,
      notificationsPermissions: undefined,
      alertsOffset: ALERTS_BASE_OFFSET
    };
    this.closeSupportAlert = () => this.setState({
      supportAlert: false
    }, () => mega.config.set('nocallsup', 1));
    this.onNotificationsGranted = () => {
      msgDialog('info', '', l.notifications_permissions_granted_title, l.notifications_permissions_granted_info.replace('[A]', `<a href="${this.notificationHelpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>'));
      this.notificationGranted = new Notification(l.notification_granted_title, {
        body: l.notification_granted_body
      });
    };
    this.state.supportAlert = !megaChat.hasSupportForCalls;
    this.state.notificationsPermissions = window.Notification ? Notification.permission : 'granted';
  }
  renderNotificationsPending() {
    return JSX_(Alert, {
      type: Alert.TYPE.LIGHT,
      className: `
                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                    ${this.props.isEmpty ? 'empty-state' : ''}
                `,
      ref: ref => {
        this.notifPendingRef = ref;
      },
      onTransition: ref => this.setState({
        alertsOffset: ref ? ref.current.offsetHeight : ALERTS_BASE_OFFSET
      }),
      onClose: () => {
        this.setState({
          notificationsPermissions: undefined
        }, () => {
          showToast('success', l.notifications_permissions_toast_title, l.notifications_permissions_toast_control, '', () => loadSubPage('fm/account/notifications'));
        });
      }
    }, l.notifications_permissions_pending, JSX_("div", {
      className: "meetings-alert-control"
    }, JSX_("a", {
      href: "#",
      onClick: ev => {
        ev.preventDefault();
        Notification.requestPermission().then(status => {
          this.setState({
            notificationsPermissions: status
          }, () => onIdle(() => this.state.notificationsPermissions === 'granted' && this.onNotificationsGranted()));
        }).catch(ex => d && console.warn(`Failed to retrieve permissions: ${ex}`));
      }
    }, l.notifications_permissions_enable)));
  }
  renderNotificationsBlocked() {
    return JSX_(Alert, {
      type: Alert.TYPE.MEDIUM,
      className: `
                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                    ${this.props.isEmpty ? 'empty-state' : ''}
                `,
      ref: ref => {
        this.notifBlockedRef = ref;
      },
      onTransition: ref => this.setState({
        alertsOffset: ref ? ref.current.offsetHeight : ALERTS_BASE_OFFSET
      }),
      onClose: () => this.setState({
        notificationsPermissions: undefined
      })
    }, JSX_(utils.P9, {
      content: l.notifications_permissions_denied_info.replace('[A]', `<a href="${this.notificationHelpURL}" target="_blank" class="clickurl">`).replace('[/A]', '</a>')
    }));
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    mBroadcaster.removeListener(this.notificationListener);
  }
  componentDidMount() {
    let _this$props$onMount, _this$props;
    super.componentDidMount();
    (_this$props$onMount = (_this$props = this.props).onMount) == null || _this$props$onMount.call(_this$props);
    megaChat.chats.forEach(chatRoom => {
      const {
        scheduledMeeting
      } = chatRoom;
      if (scheduledMeeting && !scheduledMeeting.isPast && scheduledMeeting.isRecurring) {
        scheduledMeeting.getOccurrences().catch(nop);
      }
    });
    mBroadcaster.addListener(this.notificationListener, notificationsPermissions => this.isMounted() && this.setState({
      notificationsPermissions
    }));
    window.addEventListener('resize', () => {
      delay('conv-panels-resize', () => {
        if (!M.chat || !this.isMounted()) {
          return;
        }
        const {
          alertsOffset
        } = this.state;
        if (alertsOffset !== ALERTS_BASE_OFFSET) {
          let _this$notifBlockedRef, _this$notifPendingRef, _this$noSupportRef;
          const state = {};
          if ((_this$notifBlockedRef = this.notifBlockedRef) != null && _this$notifBlockedRef.current) {
            state.alertsOffset = this.notifBlockedRef.current.offsetHeight;
          } else if ((_this$notifPendingRef = this.notifPendingRef) != null && _this$notifPendingRef.current) {
            state.alertsOffset = this.notifPendingRef.current.offsetHeight;
          } else if ((_this$noSupportRef = this.noSupportRef) != null && _this$noSupportRef.current) {
            state.alertsOffset = this.noSupportRef.current.offsetHeight;
          }
          if (state.alertsOffset !== alertsOffset) {
            this.setState(state);
          }
        }
      });
    });
  }
  render() {
    const {
      routingSection,
      chatUIFlags,
      isEmpty,
      onToggleExpandedFlag
    } = this.props;
    const {
      notificationsPermissions,
      supportAlert,
      alertsOffset
    } = this.state;
    const now = Date.now();
    return JSX_("div", {
      ref: this.domRef,
      className: "conversation-panels"
    }, routingSection === 'contacts' || is_chatlink ? null : window.Notification && notificationsPermissions !== 'granted' && JSX_(REaCt().Fragment, null, notificationsPermissions === 'default' && this.renderNotificationsPending(), notificationsPermissions === 'denied' && this.renderNotificationsBlocked()), routingSection === 'contacts' ? null : supportAlert && !mega.config.get('nocallsup') && JSX_(Alert, {
      type: Alert.TYPE.MEDIUM,
      className: `
                                ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                                ${isEmpty ? 'empty-state' : ''}
                                unsupported-call-alert
                            `,
      content: (0,meetings_utils.HV)(),
      ref: ref => {
        this.noSupportRef = ref;
      },
      onTransition: ref => this.setState({
        alertsOffset: ref ? ref.current.offsetHeight : ALERTS_BASE_OFFSET
      }),
      onClose: this.closeSupportAlert
    }), megaChat.chats.map(chatRoom => {
      if (chatRoom.isCurrentlyActive || now - chatRoom.lastShownInUI < 900000) {
        return JSX_(ConversationPanel, {
          key: `${chatRoom.roomId}_${chatRoom.instanceIndex}`,
          chatRoom,
          roomType: chatRoom.type,
          isExpanded: chatRoom.megaChat.chatUIFlags.convPanelCollapse,
          isActive: chatRoom.isCurrentlyActive,
          messagesBuff: chatRoom.messagesBuff,
          chatUIFlags,
          offset: alertsOffset,
          onToggleExpandedFlag
        });
      }
      return null;
    }));
  }
}
function isStartCallDisabled(room) {
  if ((0,meetings_utils.P)()) {
    return true;
  }
  if (!megaChat.hasSupportForCalls) {
    return true;
  }
  return !room.isOnlineForCalls() || room.isReadOnly() || !room.chatId || room.call || (room.type === "group" || room.type === "public") && false || room.getCallParticipants().length > 0;
}

 },

 7677
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   C: () =>  withHostsObserver
 });
 const _babel_runtime_helpers_extends0__ = REQ_(8168);
 const react1__ = REQ_(1594);
 const react1___default = REQ_.n(react1__);
 const _mixins_js2__ = REQ_(8264);
 const _ui_modalDialogs_jsx3__ = REQ_(8120);
 const _contacts_jsx4__ = REQ_(8022);
 const _ui_buttons_jsx5__ = REQ_(5155);






const withHostsObserver = Component => {
  return class extends _mixins_js2__ .w9 {
    constructor(...args) {
      super(...args);
      this.state = {
        dialog: false,
        selected: []
      };
      this.hasHost = participants => participants.some(handle => this.props.chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR);
      this.toggleDialog = () => {
        this.setState(state => ({
          dialog: !state.dialog,
          selected: []
        }), () => this.safeForceUpdate());
      };
      this.renderDialog = () => {
        let _this$props$participa;
        const {
          selected
        } = this.state;
        return JSX_(_ui_modalDialogs_jsx3__ .A.ModalDialog, (0,_babel_runtime_helpers_extends0__ .A)({}, this.state, {
          className: "assign-host contact-picker-widget",
          dialogName: "assign-host-dialog",
          dialogType: "tool",
          onClose: () => this.setState({
            dialog: false
          }, () => this.safeForceUpdate())
        }), JSX_("header", null, JSX_("h2", null, l.assign_host_title)), JSX_("div", {
          className: "content-block"
        }, JSX_(_contacts_jsx4__ .hU, {
          className: "popup contacts-search small-footer",
          contacts: (_this$props$participa = this.props.participants) == null ? void 0 : _this$props$participa.filter(h => h !== u_handle),
          multiple: true,
          hideSearch: true,
          disableFrequents: true,
          participantsList: true,
          disableDoubleClick: true,
          emailTooltips: true,
          nothingSelectedButtonLabel: l.add_hosts_placeholder,
          onClose: () => this.setState({
            dialog: false
          }),
          onSelected: selected => this.setState({
            selected
          }, () => this.safeForceUpdate())
        })), JSX_("footer", null, JSX_("div", {
          className: "footer-container"
        }, JSX_(_ui_buttons_jsx5__ .$, {
          label: l.msg_dlg_cancel,
          className: "mega-button",
          onClick: this.toggleDialog
        }), JSX_(_ui_buttons_jsx5__ .$, {
          label: l.assign_and_leave,
          className: `
                                        mega-button
                                        positive
                                        ${selected.length ? '' : 'disabled'}
                                    `,
          onClick: () => selected.length && this.assignAndLeave()
        }))));
      };
      this.assignAndLeave = () => {
        const {
          chatRoom,
          onLeave
        } = this.props;
        const {
          selected
        } = this.state;
        for (let i = selected.length; i--;) {
          chatRoom.trigger('alterUserPrivilege', [selected[i], ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR]);
        }
        this.toggleDialog();
        onLeave == null || onLeave();
        $(document).trigger('closeDropdowns');
      };
      this.confirmLeave = ({
        title,
        body,
        cta,
        altCta
      }) => {
        msgDialog(`confirmationa:!^${cta}!${altCta || l.msg_dlg_cancel}`, null, title, body, cb => {
          if (cb) {
            this.toggleDialog();
          } else if (cb === false) {
            let _this$props$onConfirm, _this$props;
            (_this$props$onConfirm = (_this$props = this.props).onConfirmDenied) == null || _this$props$onConfirm.call(_this$props);
          }
        }, 1);
      };
    }
    render() {
      return JSX_(react1___default().Fragment, null, JSX_(Component, (0,_babel_runtime_helpers_extends0__ .A)({}, this.props, {
        confirmLeave: this.confirmLeave,
        hasHost: this.hasHost
      })), this.state.dialog && this.renderDialog());
    }
  };
};

 },

 8025
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  A: () =>  GenericConversationMessage
});

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/ui/messages/mixin.jsx
const mixin = REQ_(855);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const ui_contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/ui/utils.jsx
const utils = REQ_(6411);
;// ./js/chat/ui/messages/abstractGenericMessage.jsx




class AbstractGenericMessage extends mixin.M {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  getAvatar() {
    const contact = this.getContact() || Message.getContactForMessage(this.props.message);
    if (this.props.grouped) {
      return null;
    }
    return contact ? JSX_(ui_contacts.eu, {
      contact: this.getContact(),
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: this.props.chatRoom
    }) : null;
  }
  getName() {
    const contact = this.getContact() || Message.getContactForMessage(this.props.message);
    if (this.props.grouped) {
      return null;
    }
    return contact ? JSX_(ui_contacts.bq, {
      contact,
      className: "message",
      label: JSX_(utils.zT, null, M.getNameByHandle(contact.u)),
      chatRoom: this.props.message.chatRoom,
      dropdownDisabled: !!this.props.dialog
    }) : null;
  }
  renderMessageActionButtons(buttons) {
    if (!buttons) {
      return null;
    }
    const cnt = buttons.length;
    if (cnt === 0) {
      return null;
    }
    return JSX_("div", {
      className: `right-aligned-msg-buttons ${cnt && cnt > 1 ? `total-${cnt}` : ''}`
    }, buttons);
  }
  render() {
    const {
      message,
      grouped,
      additionalClasses,
      hideActionButtons
    } = this.props;
    if (message.deleted) {
      return null;
    }
    return JSX_("div", {
      ref: this.domRef,
      "data-id": message.messageId,
      className: `
                    ${this.getClassNames ? this.getClassNames() : grouped ? 'grouped' : ''}
                    ${additionalClasses}
                    ${message.messageId}
                    message
                    body
                `
    }, this.getAvatar && this.getAvatar(), JSX_("div", {
      className: "message content-area selectable-txt"
    }, this.getName && this.getName(), this.getMessageTimestamp ? this.getMessageTimestamp() : grouped ? null : JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp(), 17),
      "data-simpletipposition": "top",
      "data-simpletipoffset": "4"
    }, this.getTimestampAsString()), !hideActionButtons && this.getMessageActionButtons && this.renderMessageActionButtons(this.getMessageActionButtons()), this.getContents && this.getContents(), hideActionButtons ? null : this.getEmojisImages()));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/messages/utils.jsx
const messages_utils = REQ_(187);
;// ./js/chat/ui/messages/types/local.jsx





const MESSAGE_TYPE = {
  OUTGOING: 'outgoing-call',
  INCOMING: 'incoming-call',
  TIMEOUT: 'call-timeout',
  STARTING: 'call-starting',
  FEEDBACK: 'call-feedback',
  INITIALISING: 'call-initialising',
  ENDED: 'call-ended',
  ENDED_REMOTE: 'remoteCallEnded',
  FAILED: 'call-failed',
  FAILED_MEDIA: 'call-failed-media',
  HANDLED_ELSEWHERE: 'call-handled-elsewhere',
  MISSED: 'call-missed',
  REJECTED: 'call-rejected',
  CANCELLED: 'call-canceled',
  STARTED: 'call-started',
  STARTED_REMOTE: 'remoteCallStarted',
  ALTER_PARTICIPANTS: 'alterParticipants',
  PRIVILEGE_CHANGE: 'privilegeChange',
  TRUNCATED: 'truncated'
};
class Local extends AbstractGenericMessage {
  componentDidMount() {
    super.componentDidMount();
    this._setClassNames();
  }
  _roomIsGroup() {
    return this.props.message.chatRoom.type === 'group' || this.props.message.chatRoom.type === 'public';
  }
  _getParticipantNames(message) {
    return message.meta && message.meta.participants && !!message.meta.participants.length && message.meta.participants.map(handle => `[[${megaChat.html(M.getNameByHandle(handle))}]]`);
  }
  _getExtraInfo(message) {
    const {
      meta,
      type
    } = message;
    const participantNames = this._getParticipantNames(message);
    const HAS_PARTICIPANTS = participantNames && !!participantNames.length && participantNames.length > 1;
    const HAS_DURATION = meta && meta.duration;
    const ENDED = type === MESSAGE_TYPE.ENDED || type === MESSAGE_TYPE.FAILED || type === MESSAGE_TYPE.CANCELLED;
    let messageExtraInfo = [HAS_PARTICIPANTS ? mega.utils.trans.listToString(participantNames, l[20234]) : ''];
    if (ENDED) {
      messageExtraInfo = [...messageExtraInfo, HAS_PARTICIPANTS ? '. ' : '', HAS_DURATION ? l[7208].replace('[X]', `[[${secToDuration(meta.duration)}]]`) : ''];
    }
    return messageExtraInfo && messageExtraInfo.reduce((acc, cur) => (acc + cur).replace(/\[\[/g, '<span class="bold">').replace(/]]/g, '</span>'));
  }
  _setClassNames() {
    let cssClass;
    switch (this.props.message.type) {
      case MESSAGE_TYPE.REJECTED:
        cssClass = 'sprite-fm-theme icon-handset-rejected';
        break;
      case MESSAGE_TYPE.MISSED:
        cssClass = 'sprite-fm-theme icon-handset-missed';
        break;
      case MESSAGE_TYPE.OUTGOING:
      case MESSAGE_TYPE.HANDLED_ELSEWHERE:
        cssClass = 'sprite-fm-theme icon-handset-outgoing';
        break;
      case MESSAGE_TYPE.FAILED:
      case MESSAGE_TYPE.FAILED_MEDIA:
        cssClass = 'sprite-fm-theme icon-handset-failed';
        break;
      case MESSAGE_TYPE.ENDED:
      case MESSAGE_TYPE.TIMEOUT:
        cssClass = 'sprite-fm-theme icon-handset-ended';
        break;
      case MESSAGE_TYPE.CANCELLED:
        cssClass = 'sprite-fm-theme icon-handset-cancelled';
        break;
      case MESSAGE_TYPE.FEEDBACK:
      case MESSAGE_TYPE.STARTING:
      case MESSAGE_TYPE.STARTED:
        cssClass = 'sprite-fm-mono icon-phone';
        break;
      case MESSAGE_TYPE.INCOMING:
        cssClass = 'sprite-fm-theme icon-handset-incoming';
        break;
      default:
        cssClass = `sprite-fm-mono ${  this.props.message.type}`;
        break;
    }
    this.props.message.cssClass = cssClass;
  }
  _getIcon(message) {
    const MESSAGE_ICONS = {
      [MESSAGE_TYPE.STARTED]: `<i class="${"call-info-icon"} sprite-fm-mono icon-phone">&nbsp;</i>`,
      [MESSAGE_TYPE.ENDED]: `<i class="${"call-info-icon"} sprite-fm-theme icon-handset-ended">&nbsp;</i>`,
      DEFAULT: `<i class="${"call-info-icon"} ${message.cssClass}">&nbsp;</i>`
    };
    return MESSAGE_ICONS[message.type] || MESSAGE_ICONS.DEFAULT;
  }
  _getText() {
    const {
      message
    } = this.props;
    const IS_GROUP = this._roomIsGroup();
    let messageText = (0,messages_utils.d)(message.type, IS_GROUP, message.chatRoom.isMeeting);
    if (!messageText) {
      return console.error(`Message with type: ${message.type} -- no text string defined. Message: ${message}`);
    }
    messageText = CallManager2._getMltiStrTxtCntsForMsg(message, messageText.splice ? messageText : [messageText], true);
    messageText = megaChat.html(messageText);
    message.textContents = String(messageText).replace("[[", "<span class=\"bold\">").replace("]]", "</span>");
    if (IS_GROUP) {
      messageText = `
                ${this._getIcon(message)}
                <div class="call-info-content">
                    <span class="call-info-message bold">${messageText}</span>
                    ${this._getExtraInfo(message)}
                </div>
            `;
    }
    return messageText;
  }
  _getAvatarsListing() {
    const {
      message
    } = this.props;
    if (this._roomIsGroup() && message.type === MESSAGE_TYPE.STARTED && message.messageId === `${MESSAGE_TYPE.STARTED}-${message.chatRoom.getActiveCallMessageId()}`) {
      const unique = message.chatRoom.uniqueCallParts ? Object.keys(message.chatRoom.uniqueCallParts) : [];
      return unique.map(handle => JSX_(ui_contacts.eu, {
        key: handle,
        contact: M.u[handle],
        simpletip: true,
        className: "message avatar-wrapper small-rounded-avatar"
      }));
    }
    return null;
  }
  _getButtons() {
    const {
      message
    } = this.props;
    if (message.buttons && Object.keys(message.buttons).length) {
      return JSX_("div", {
        className: "buttons-block"
      }, Object.keys(message.buttons).map(key => {
        const button = message.buttons[key];
        return JSX_("button", {
          key,
          className: button.classes,
          onClick: e => button.callback(e.target)
        }, button.icon && JSX_("div", null, JSX_("i", {
          className: `small-icon ${button.icon}`
        })), JSX_("span", null, button.text));
      }), JSX_("div", {
        className: "clear"
      }));
    }
  }
  getAvatar() {
    const {
      message,
      grouped
    } = this.props;
    if (message.type === MESSAGE_TYPE.FEEDBACK) {
      return null;
    }
    const $$AVATAR = JSX_(ui_contacts.eu, {
      contact: message.authorContact,
      className: "message avatar-wrapper small-rounded-avatar",
      chatRoom: message.chatRoom
    });
    const $$ICON = JSX_("div", {
      className: "feedback call-status-block"
    }, JSX_("i", {
      className: `sprite-fm-mono ${message.cssClass}`
    }));
    return message.showInitiatorAvatar ? grouped ? null : $$AVATAR : $$ICON
    ;
  }
  getMessageTimestamp() {
    let _this$props$message;
    const callId = (_this$props$message = this.props.message) == null || (_this$props$message = _this$props$message.meta) == null ? void 0 : _this$props$message.callId;
    let debugMsg = "";
    if (d && callId) {
      debugMsg = `: callId: ${callId}`;
    }
    return JSX_("div", {
      className: "message date-time simpletip",
      "data-simpletip": time2date(this.getTimestamp(), 17)
    }, this.getTimestampAsString(), debugMsg);
  }
  getClassNames() {
    const {
      message: {
        showInitiatorAvatar,
        type
      },
      grouped
    } = this.props;
    const classNames = [showInitiatorAvatar && grouped && 'grouped', this._roomIsGroup() && type !== MESSAGE_TYPE.OUTGOING && type !== MESSAGE_TYPE.INCOMING && 'with-border'];
    return classNames.filter(className => className).join(' ');
  }
  getName() {
    const {
      message,
      grouped
    } = this.props;
    const contact = this.getContact();
    return message.showInitiatorAvatar && !grouped ? JSX_(ui_contacts.bq, {
      contact,
      className: "message",
      label: JSX_(utils.zT, null, message.authorContact ? M.getNameByHandle(message.authorContact.u) : ''),
      chatRoom: message.chatRoom
    }) : M.getNameByHandle(contact.u);
  }
  getContents() {
    const {
      message: {
        getState
      }
    } = this.props;
    return JSX_(REaCt().Fragment, null, JSX_("div", {
      className: "message text-block"
    }, JSX_("div", {
      className: "message call-inner-block"
    }, JSX_("div", {
      className: "call-info"
    }, JSX_("div", {
      className: "call-info-container"
    }, JSX_(utils.P9, {
      className: "info-wrapper"
    }, this._getText())), JSX_("div", {
      className: "call-info-avatars"
    }, this._getAvatarsListing(), JSX_("div", {
      className: "clear"
    }))))), getState && getState() === Message.STATE.NOT_SENT ? null : this._getButtons());
  }
}
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const dropdowns = REQ_(1510);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
;// ./js/chat/ui/messages/types/contact.jsx






class Contact extends AbstractGenericMessage {
  constructor(...args) {
    super(...args);
    this.DIALOG = {
      ADDED: addedEmail => msgDialog('info', l[150], l[5898].replace('[X]', addedEmail)),
      DUPLICATE: () => msgDialog('warningb', '', l[17545])
    };
  }
  haveMoreContactListeners() {
    const {
      message
    } = this.props;
    const textContents = message.textContents.substring(2, message.textContents.length);
    const attachmentMeta = JSON.parse(textContents);
    if (!attachmentMeta) {
      return false;
    }
    const contacts = attachmentMeta.map(v => v.u);
    return contacts.length ? contacts : false;
  }
  _doAddContact(contactEmail) {
    return M.inviteContact(M.u[u_handle] ? M.u[u_handle].m : u_attr.email, contactEmail);
  }
  _handleAddContact(contactEmail) {
    let _this$props$chatRoom;
    if ((_this$props$chatRoom = this.props.chatRoom) != null && _this$props$chatRoom.isAnonymous()) {
      return this._doAddContact(contactEmail).then(addedEmail => this.DIALOG.ADDED(addedEmail)).catch(this.DIALOG.DUPLICATE);
    }
    return Object.values(M.opc).some(opc => opc.m === contactEmail) ? this.DIALOG.DUPLICATE() : this._doAddContact(contactEmail).then(addedEmail => this.DIALOG.ADDED(addedEmail))
    ;
  }
  _getContactAvatar(contact, className) {
    return JSX_(ui_contacts.eu, {
      className: `avatar-wrapper ${className}`,
      contact: M.u[contact.u],
      chatRoom: this.props.chatRoom
    });
  }
  _getContactDeleteButton(message) {
    if (message.isEditable()) {
      return JSX_(REaCt().Fragment, null, JSX_("hr", null), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-dialog-close",
        label: l[83],
        onClick: e => this.props.onDelete(e, message)
      }));
    }
  }
  _getContactCard(message, contact, contactEmail) {
    const HAS_RELATIONSHIP = M.u[contact.u].c === 1;
    let name = JSX_(ui_contacts.uA, {
      emoji: true,
      contact: M.u[contact.u]
    });
    const {
      chatRoom
    } = this.props;
    const isAnonView = chatRoom.isAnonymous();
    if (megaChat.FORCE_EMAIL_LOADING) {
      name += `(${  contact.m  })`;
    }
    return JSX_(buttons.$, {
      ref: ref => {
        this.buttonRef = ref;
      },
      className: "tiny-button",
      icon: "tiny-icon icons-sprite grey-dots"
    }, JSX_(dropdowns.ms, {
      className: "white-context-menu shared-contact-dropdown",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      horizOffset: 4
    }, JSX_("div", {
      className: "dropdown-avatar rounded"
    }, this._getContactAvatar(contact, 'context-avatar'), isAnonView ? JSX_("div", {
      className: "dropdown-user-name"
    }) : JSX_("div", {
      className: "dropdown-user-name"
    }, JSX_("div", {
      className: "name"
    }, HAS_RELATIONSHIP && (this.isLoadingContactInfo() ? JSX_("em", {
      className: "contact-name-loading"
    }) : name), !HAS_RELATIONSHIP && name, JSX_(ui_contacts.i1, {
      className: "small",
      contact
    })), JSX_("div", {
      className: "email"
    }, M.u[contact.u].m))), JSX_(ui_contacts.BE, {
      contact: M.u[contact.u]
    }), HAS_RELATIONSHIP && JSX_(REaCt().Fragment, null, JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-user-filled",
      label: l[5868],
      onClick: () => {
        loadSubPage(`fm/chat/contacts/${  contact.u}`);
        mBroadcaster.sendMessage('contact:open');
      }
    }), JSX_("hr", null), JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-chat-filled",
      label: l[8632],
      onClick: () => {
        loadSubPage(`fm/chat/p/${  contact.u}`);
        mBroadcaster.sendMessage('chat:open');
      }
    })), u_type && u_type > 2 && contact.u !== u_handle && !HAS_RELATIONSHIP && !is_eplusplus && JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-add",
      label: l[71],
      onClick: () => this._handleAddContact(contactEmail)
    }), this._getContactDeleteButton(message)));
  }
  getContents() {
    const {
      message,
      chatRoom
    } = this.props;
    const textContents = message.textContents.substr(2, message.textContents.length);
    const attachmentMeta = JSON.parse(textContents);
    const isAnonView = chatRoom.isAnonymous();
    if (!attachmentMeta) {
      return console.error(`Message w/ type: ${message.type} -- no attachment meta defined. Message: ${message}`);
    }
    let contacts = [];
    attachmentMeta.forEach(v => {
      let _this$buttonRef;
      const contact = M.u && v.u in M.u && M.u[v.u].m ? M.u[v.u] : v;
      const contactEmail = contact.email ? contact.email : contact.m;
      if (!M.u[contact.u]) {
        M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, {
          'u': contact.u,
          'name': contact.name,
          'm': contact.email ? contact.email : contactEmail,
          'c': undefined
        }));
      } else if (M.u[contact.u] && !M.u[contact.u].m) {
        M.u[contact.u].m = contact.email ? contact.email : contactEmail;
      }
      contacts = [...contacts, JSX_("div", {
        key: contact.u
      }, isAnonView ? JSX_("div", {
        className: "message shared-info"
      }) : JSX_("div", {
        className: "message shared-info"
      }, JSX_("div", {
        className: "message data-title selectable-txt",
        onClick: (_this$buttonRef = this.buttonRef) == null ? void 0 : _this$buttonRef.onClick
      }, JSX_(utils.zT, null, M.getNameByHandle(contact.u))), M.u[contact.u] ? JSX_(ui_contacts.n4, {
        className: "right-align",
        contact: M.u[contact.u]
      }) : null, JSX_("div", {
        className: "user-card-email selectable-txt"
      }, contactEmail)), JSX_("div", {
        className: "message shared-data"
      }, JSX_("div", {
        className: "data-block-view semi-big"
      }, M.u[contact.u] ? JSX_(ui_contacts.i1, {
        className: "small",
        contact: M.u[contact.u]
      }) : null, this._getContactCard(message, contact, contactEmail), this._getContactAvatar(contact, 'medium-avatar')), JSX_("div", {
        className: "clear"
      })))];
    });
    return JSX_("div", {
      className: "message shared-block"
    }, contacts);
  }
}
;// ./js/chat/ui/messages/types/attachment.jsx




class Attachment extends AbstractGenericMessage {
  _isRevoked(node) {
    return !M.chd[node.ch] || node.revoked;
  }
  _isUserRegistered() {
    return typeof u_type !== 'undefined' && u_type > 2;
  }
  getContents() {
    const {
      message,
      chatRoom
    } = this.props;
    const contact = this.getContact();
    const NODE_DOESNT_EXISTS_ANYMORE = {};
    const attachmentMeta = message.getAttachmentMeta() || [];
    const files = [];
    for (let i = 0; i < attachmentMeta.length; i++) {
      var _this$buttonRef;
      const v = attachmentMeta[i];
      if (this._isRevoked(v)) {
        continue;
      }
      const {
        icon,
        isImage,
        isVideo,
        isAudio,
        isText,
        showThumbnail,
        isPreviewable
      } = M.getMediaProperties(v);
      let dropdown = null;
      let noThumbPrev = '';
      var previewButton = null;
      if (isPreviewable) {
        if (!showThumbnail) {
          noThumbPrev = 'no-thumb-prev';
        }
        let previewLabel = isAudio ? l[17828] : isVideo ? l[16275] : l[1899];
        let previewIcon = isAudio ? 'icon-play' : isVideo ? 'icon-video-call-filled' : 'icon-preview-reveal';
        if (isText) {
          previewLabel = l[16797];
          previewIcon = "icon-file-edit";
        }
        previewButton = JSX_("span", {
          key: "previewButton"
        }, JSX_(dropdowns.tJ, {
          label: previewLabel,
          icon: `sprite-fm-mono ${previewIcon}`,
          disabled: mega.paywall,
          onClick: e => {
            mega.ui.mInfoPanel.hide();
            this.props.onPreviewStart(v, e);
          }
        }));
      }
      dropdown = contact.u === u_handle ? JSX_(buttons.$, {
        ref: ref => {
          this.buttonRef = ref;
        },
        className: "tiny-button",
        icon: "tiny-icon icons-sprite grey-dots"
      }, JSX_(dropdowns.ms, {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left top",
        positionAt: "left bottom",
        horizOffset: -4,
        vertOffset: 3,
        onBeforeActiveChange: newState => {
          if (newState === true) {
            this.forceUpdate();
          }
        },
        dropdownItemGenerator: dd => {
          const linkButtons = [];
          const firstGroupOfButtons = [];
          let revokeButton = null;
          let downloadButton = null;
          let addToAlbumButton = null;
          if (message.isEditable && message.isEditable()) {
            revokeButton = JSX_(dropdowns.tJ, {
              icon: "sprite-fm-mono icon-dialog-close",
              label: l[83],
              onClick: () => {
                chatRoom.megaChat.plugins.chatdIntegration.updateMessage(chatRoom, message.internalId || message.orderValue, "");
              }
            });
          }
          if (!M.d[v.h] && !NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
            dbfetch.acquire(v.h).always(() => {
              if (!M.d[v.h]) {
                NODE_DOESNT_EXISTS_ANYMORE[v.h] = true;
                dd.doRerender();
              } else {
                dd.doRerender();
              }
            });
            return JSX_("span", {
              className: "loading"
            }, l[5533]);
          } else if (!NODE_DOESNT_EXISTS_ANYMORE[v.h]) {
            downloadButton = JSX_(dropdowns.tJ, {
              icon: "sprite-fm-mono icon-download-small",
              label: l[1187],
              disabled: mega.paywall,
              onClick: () => this.props.onDownloadStart(v)
            });
            if (M.getNodeRoot(v.h) !== M.RubbishID) {
              this.props.onAddLinkButtons(v.h, linkButtons);
            }
            firstGroupOfButtons.push(JSX_(dropdowns.tJ, {
              icon: "sprite-fm-mono icon-info",
              label: l[6859],
              key: "infoDialog",
              onClick: () => {
                mega.ui.mInfoPanel.show([v.ch]);
              }
            }));
            this.props.onAddFavouriteButtons(v.h, firstGroupOfButtons);
            linkButtons.push(JSX_(dropdowns.tJ, {
              icon: "sprite-fm-mono icon-send-to-chat",
              label: l[17764],
              key: "sendToChat",
              disabled: mega.paywall,
              onClick: () => {
                $.selected = [v.h];
                openSendToChatDialog();
              }
            }));
            if (M.isGalleryNode(v)) {
              addToAlbumButton = JSX_(dropdowns.tJ, {
                icon: "sprite-fm-mono rectangle-stack-plus-small-regular-outline",
                label: l.add_to_album,
                disabled: mega.paywall,
                onClick: () => mega.gallery.albums.addToAlbum([v.h])
              });
            }
          }
          if (!previewButton && firstGroupOfButtons.length === 0 && !downloadButton && !addToAlbumButton && linkButtons.length === 0 && !revokeButton) {
            return null;
          }
          if (previewButton && (firstGroupOfButtons.length > 0 || downloadButton || addToAlbumButton || linkButtons.length > 0 || revokeButton)) {
            previewButton = [previewButton, JSX_("hr", {
              key: "preview-sep"
            })];
          }
          return JSX_("div", null, previewButton, firstGroupOfButtons, firstGroupOfButtons && firstGroupOfButtons.length > 0 ? JSX_("hr", null) : "", addToAlbumButton, addToAlbumButton ? JSX_("hr", null) : "", downloadButton, linkButtons, revokeButton && downloadButton ? JSX_("hr", null) : "", revokeButton);
        }
      })) : JSX_(buttons.$, {
        ref: ref => {
          this.buttonRef = ref;
        },
        className: "tiny-button",
        icon: "tiny-icon icons-sprite grey-dots"
      }, JSX_(dropdowns.ms, {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left top",
        positionAt: "left bottom",
        horizOffset: -4,
        vertOffset: 3
      }, previewButton, previewButton && JSX_("hr", null), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-download-small",
        label: l[1187],
        disabled: mega.paywall,
        onClick: () => this.props.onDownloadStart(v)
      }), !is_chatlink && this._isUserRegistered() && JSX_(REaCt().Fragment, null, JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-cloud",
        label: l[1988],
        disabled: mega.paywall,
        onClick: () => this.props.onAddToCloudDrive(v, false)
      }), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-send-to-chat",
        label: l[17764],
        disabled: mega.paywall,
        onClick: () => this.props.onAddToCloudDrive(v, true)
      }))));
      if (M.getNodeShare(v.h).down) {
        dropdown = null;
      }
      const attachmentClasses = "message shared-data";
      let preview = JSX_("div", {
        className: `data-block-view medium ${  noThumbPrev}`,
        onClick: ({
          target
        }) => {
          if (isPreviewable && !target.classList.contains('tiny-button')) {
            mega.ui.mInfoPanel.hide();
            this.props.onPreviewStart(v);
          }
        }
      }, dropdown, JSX_("div", {
        className: "data-block-bg"
      }, JSX_("div", {
        className: `item-type-icon-90 icon-${  icon  }-90`
      })));
      if (showThumbnail) {
        const src = v.src || window.noThumbURI || '';
        let thumbClass = v.src ? '' : " no-thumb";
        let thumbOverlay = null;
        if (isImage) {
          thumbClass += " image";
          thumbOverlay = JSX_("div", {
            className: "thumb-overlay",
            onClick: () => {
              mega.ui.mInfoPanel.hide();
              this.props.onPreviewStart(v);
            }
          });
        } else {
          thumbClass = `${thumbClass  } video ${  isPreviewable ? " previewable" : "non-previewable"}`;
          thumbOverlay = JSX_("div", {
            className: "thumb-overlay",
            onClick: () => {
              if (isPreviewable) {
                mega.ui.mInfoPanel.hide();
                this.props.onPreviewStart(v);
              }
            }
          }, isPreviewable && JSX_("div", {
            className: "thumb-overlay-play"
          }, JSX_("div", {
            className: "thumb-overlay-circle"
          }, JSX_("i", {
            className: "sprite-fm-mono icon-play"
          }))), JSX_("div", {
            className: "video-thumb-details"
          }, v.playtime && JSX_("i", {
            className: "sprite-fm-mono icon-play"
          }), JSX_("span", null, secondsToTimeShort(v.playtime || -1))));
        }
        preview = src ? JSX_("div", {
          id: v.ch,
          className: `shared-link thumb ${thumbClass}`
        }, thumbOverlay, dropdown, JSX_("img", {
          alt: "",
          className: `thumbnail-placeholder ${  v.h}`,
          src,
          key: `thumb-${  v.ch}`,
          onClick: () => isPreviewable && this.props.onPreviewStart(v)
        })) : preview;
      }
      files.push(JSX_("div", {
        key: `attachment-${v.ch}`,
        className: attachmentClasses
      }, JSX_("div", {
        className: "message shared-info",
        onClick: (_this$buttonRef = this.buttonRef) == null ? void 0 : _this$buttonRef.onClick
      }, JSX_("div", {
        className: "message data-title selectable-txt"
      }, l[17669], JSX_("span", {
        className: "file-name"
      }, v.name)), JSX_("div", {
        className: "message file-size"
      }, bytesToSize(v.s))), preview, JSX_("div", {
        className: "clear"
      })));
    }
    return JSX_("div", {
      className: "message shared-block"
    }, files);
  }
}
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/chat/ui/messages/types/partials/audioPlayer.jsx


class AudioPlayer extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      currentTime: null,
      progressWidth: 0,
      isBeingPlayed: false,
      isPaused: false
    };
    this.handleOnTimeUpdate = this.handleOnTimeUpdate.bind(this);
    this.handleOnMouseDown = this.handleOnMouseDown.bind(this);
  }
  play() {
    const audio = this.audioEl;
    if (audio.paused) {
      const result = audio.play();
      if (result instanceof Promise) {
        result.catch(ex => {
          if (ex.name !== 'AbortError') {
            console.error(ex);
          }
        });
      }
      const audios = document.getElementsByClassName('audio-player__player');
      Array.prototype.filter.call(audios, audioElement => audioElement.id !== this.props.audioId).forEach(audioElement => {
        if (!audioElement.paused) {
          audioElement.pause();
        }
      });
      this.setState({
        isPaused: false
      });
    } else {
      audio.pause();
      this.setState({
        isPaused: true
      });
    }
  }
  handleOnTimeUpdate() {
    const {
      currentTime,
      duration
    } = this.audioEl;
    this.setState({
      currentTime: secondsToTimeShort(currentTime),
      progressWidth: currentTime / duration * 100
    });
  }
  handleOnMouseDown(event) {
    event.preventDefault();
    const {
      sliderPin,
      slider
    } = this;
    const shiftX = event.clientX - sliderPin.getBoundingClientRect().left;
    const onMouseMove = event => {
      let newLeft = event.clientX - shiftX - slider.getBoundingClientRect().left;
      if (newLeft < 0) {
        newLeft = 0;
      }
      const rightEdge = slider.offsetWidth - sliderPin.offsetWidth;
      if (newLeft > rightEdge) {
        newLeft = rightEdge;
      }
      sliderPin.style.left = `${newLeft}px`;
      const pinPosition = newLeft / slider.getBoundingClientRect().width;
      const newTime = Math.ceil(this.props.playtime * pinPosition);
      const newCurrentTime = secondsToTimeShort(newTime);
      this.audioEl.currentTime = newTime;
      this.setState({
        currentTime: newCurrentTime,
        progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
      });
    };
    function onMouseUp() {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    sliderPin.ondragstart = () => false;
  }
  render() {
    const {
      source,
      audioId,
      loading,
      playtime
    } = this.props;
    const {
      progressWidth,
      isBeingPlayed,
      isPaused,
      currentTime
    } = this.state;
    let playtimeStyles = null;
    if (isBeingPlayed) {
      playtimeStyles = {
        color: 'var(--secondary-red)'
      };
    }
    let btnClass = 'icon-pause';
    if (!isBeingPlayed || isPaused) {
      btnClass = 'icon-play';
    }
    let controls = JSX_("span", {
      onClick: () => {
        this.play();
        if (this.props.source === null) {
          this.props.getAudioFile();
        }
      }
    }, JSX_("i", {
      className: `sprite-fm-mono ${btnClass}`
    }));
    if (loading) {
      controls = JSX_("div", {
        className: "small-blue-spinner audio-player__spinner"
      });
    }
    return JSX_("div", {
      ref: this.domRef,
      className: "audio-player"
    }, controls, JSX_("div", {
      className: "slider",
      ref: slider => {
        this.slider = slider;
      }
    }, JSX_("div", {
      className: "slider__progress",
      style: {
        width: `${progressWidth}%`
      }
    }), JSX_("div", {
      className: "slider__progress__pin",
      style: {
        left: `${progressWidth}%`
      },
      ref: sliderPin => {
        this.sliderPin = sliderPin;
      },
      onMouseDown: this.handleOnMouseDown
    })), JSX_("span", {
      className: "audio-player__time",
      style: playtimeStyles
    }, currentTime || secondsToTimeShort(playtime)), JSX_("audio", {
      src: source,
      className: "audio-player__player",
      id: audioId,
      ref: audio => {
        this.audioEl = audio;
      },
      onPlaying: () => this.setState({
        isBeingPlayed: true
      }),
      onPause: () => this.setState({
        isPaused: true
      }),
      onEnded: () => this.setState({
        progressWidth: 0,
        isBeingPlayed: false,
        currentTime: 0
      }),
      onTimeUpdate: this.handleOnTimeUpdate
    }));
  }
}
;// ./js/chat/ui/messages/types/partials/audioContainer.jsx


class AudioContainer extends REaCt().Component {
  constructor(props) {
    super(props);
    this.state = {
      audioBlobUrl: null,
      loading: false
    };
    this.getAudioFile = this.getAudioFile.bind(this);
  }
  getAudioFile() {
    const {
      mime,
      h
    } = this.props;
    this.setState({
      loading: true
    });
    if (mime !== 'audio/mp4') {
      if (d) {
        console.warn('cannot play this file type (%s)', mime, h, [this]);
      }
      return false;
    }
    M.gfsfetch(h, 0, -1).then(({
      buffer
    }) => {
      this.setState(() => {
        return {
          audioBlobUrl: mObjectURL([buffer], 'audio/mp4'),
          loading: false
        };
      });
    }).catch(ex => {
      console.error(ex);
    });
    return true;
  }
  componentWillUnmount() {
    URL.revokeObjectURL(this.state.audioBlobUrl);
  }
  render() {
    const {
      audioBlobUrl,
      loading
    } = this.state;
    const {
      playtime,
      mime,
      audioId
    } = this.props;
    return JSX_("div", {
      className: "audio-container"
    }, JSX_(AudioPlayer, {
      source: audioBlobUrl,
      audioId,
      loading,
      mime,
      getAudioFile: this.getAudioFile,
      playtime
    }));
  }
}
AudioContainer.defaultProps = {
  h: null,
  mime: null
};
;// ./js/chat/ui/messages/types/voiceClip.jsx





class VoiceClip extends AbstractGenericMessage {
  _getActionButtons() {
    const {
      isBeingEdited,
      chatRoom,
      message,
      dialog,
      onDelete
    } = this.props;
    if (message.isEditable() && !isBeingEdited() && !chatRoom.isReadOnly() && !dialog) {
      return JSX_(buttons.$, {
        className: "tiny-button",
        icon: "tiny-icon icons-sprite grey-dots"
      }, JSX_(dropdowns.ms, {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-dialog-close",
        label: l[1730],
        onClick: ev => onDelete(ev, message)
      })));
    }
    return null;
  }
  _getAudioContainer() {
    const {
      message
    } = this.props;
    const attachmentMeta = message.getAttachmentMeta();
    if (attachmentMeta && attachmentMeta.length) {
      return attachmentMeta.map(voiceClip => JSX_(AudioContainer, {
        key: voiceClip.h,
        h: voiceClip.h,
        mime: voiceClip.mime,
        playtime: voiceClip.playtime,
        audioId: `vm${message.messageId}`
      }));
    }
  }
  getContents() {
    return JSX_(REaCt().Fragment, null, this.props.message.getState() === Message.STATE.NOT_SENT ? null : this._getActionButtons(), this._getAudioContainer());
  }
}
;// ./js/chat/ui/messages/types/partials/metaRichpreviewLoading.jsx


class MetaRichpreviewLoading extends mixin.M {
  render() {
    return JSX_("div", {
      className: "loading-spinner light small"
    }, JSX_("div", {
      className: "main-loader"
    }));
  }
}

;// ./js/chat/ui/messages/types/partials/metaRichpreview.jsx



class MetaRichpreview extends mixin.M {
  getBase64Url(b64incoming) {
    if (!b64incoming || !b64incoming.split) {
      return;
    }
    let exti = b64incoming.split(":");
    const b64i = exti[1];
    exti = exti[0];
    return `data:image/${  exti  };base64,${  b64i}`;
  }
  render() {
    const self = this;
    const {message} = this.props;
    const output = [];
    const metas = message.meta && message.meta.extra ? message.meta.extra : [];
    const failedToLoad = message.meta.isLoading && unixtime() - message.meta.isLoading > 300;
    const isLoading = !!message.meta.isLoading;
    if (failedToLoad) {
      return null;
    }
    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      if (!meta.d && !meta.t && !message.meta.isLoading) {
        continue;
      }
      const previewCss = {};
      if (meta.i) {
        previewCss.backgroundImage = `url(${  self.getBase64Url(meta.i)  })`;
        previewCss.backgroundRepeat = "no-repeat";
        previewCss.backgroundPosition = "center center";
      }
      var previewContainer;
      if (isLoading) {
        previewContainer = JSX_(MetaRichpreviewLoading, {
          message,
          isLoading: message.meta.isLoading
        });
      } else {
        let domainName = meta.url;
        domainName = domainName.replace("https://", "").replace("http://", "").split("/")[0];
        previewContainer = JSX_("div", {
          className: "message richpreview body"
        }, meta.i ? JSX_("div", {
          className: "message richpreview img-wrapper"
        }, JSX_("div", {
          className: "message richpreview preview",
          style: previewCss
        })) : undefined, JSX_("div", {
          className: "message richpreview inner-wrapper"
        }, JSX_("div", {
          className: "message richpreview data-title selectable-txt"
        }, JSX_("span", {
          className: "message richpreview title"
        }, meta.t)), JSX_("div", {
          className: "message richpreview desc"
        }, ellipsis(meta.d, 'end', 82)), JSX_("div", {
          className: "message richpreview url-container"
        }, meta.ic ? JSX_("span", {
          className: "message richpreview url-favicon"
        }, JSX_("img", {
          src: self.getBase64Url(meta.ic),
          width: 16,
          height: 16,
          onError: e => {
            e.target.parentNode.removeChild(e.target);
          },
          alt: ""
        })) : "", JSX_("span", {
          className: "message richpreview url"
        }, domainName))));
      }
      output.push(JSX_("div", {
        key: meta.url,
        className: `message richpreview container ${  meta.i ? "have-preview" : "no-preview"  } ${  meta.d ? "have-description" : "no-description"  } ${  isLoading ? "is-loading" : "done-loading"}`,
        onClick: function (url) {
          if (!message.meta.isLoading) {
            window.open(url, "_blank", 'noopener,noreferrer');
          }
        }.bind(this, meta.url)
      }, previewContainer, JSX_("div", {
        className: "clear"
      })));
    }
    return JSX_("div", {
      className: "message richpreview previews-container"
    }, output);
  }
}

;// ./js/chat/ui/messages/types/partials/metaRichpreviewConfirmation.jsx


class MetaRichprevConfirmation extends mixin.M {
  doAllow() {
    const {message} = this.props;
    const {megaChat} = this.props.message.chatRoom;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoConfirm();
    megaChat.plugins.richpreviewsFilter.processMessage({}, message);
    message.trackDataChange();
  }
  doNotNow() {
    const {message} = this.props;
    delete message.meta.requiresConfirmation;
    RichpreviewsFilter.confirmationDoNotNow();
    message.trackDataChange();
  }
  doNever() {
    const {message} = this.props;
    msgDialog('confirmation', l[870], l[18687], '', (e) => {
      if (e) {
        delete message.meta.requiresConfirmation;
        RichpreviewsFilter.confirmationDoNever();
        message.trackDataChange();
      }
    });
  }
  render() {
    const self = this;
    let notNowButton = null;
    let neverButton = null;
    if (RichpreviewsFilter.confirmationCount >= 2) {
      neverButton = JSX_("button", {
        className: "mega-button right negative",
        onClick () {
          self.doNever();
        }
      }, JSX_("span", null, l[1051]));
    }
    notNowButton = JSX_("button", {
      className: "mega-button right",
      onClick () {
        self.doNotNow();
      }
    }, JSX_("span", null, l[18682]));
    return JSX_("div", {
      className: "message richpreview previews-container"
    }, JSX_("div", {
      className: "message richpreview container confirmation"
    }, JSX_("div", {
      className: "message richpreview body"
    }, JSX_("div", {
      className: "message richpreview img-wrapper"
    }, JSX_("div", {
      className: " message richpreview preview-confirmation sprite-fm-illustration img-chat-url-preview "
    })), JSX_("div", {
      className: "message richpreview inner-wrapper"
    }, JSX_("div", {
      className: "message richpreview data-title selectable-txt"
    }, JSX_("span", {
      className: "message richpreview title"
    }, l[18679])), JSX_("div", {
      className: "message richpreview desc"
    }, l[18680])), JSX_("div", {
      className: "buttons-block"
    }, JSX_("button", {
      className: "mega-button right positive",
      onClick: () => {
        self.doAllow();
      }
    }, JSX_("span", null, l[18681])), notNowButton, neverButton)), JSX_("div", {
      className: "clear"
    })));
  }
}

;// ./js/chat/ui/messages/types/partials/geoLocation.jsx

function GeoLocation(props) {
  const {
    latitude,
    lng
  } = props;
  const handleOnclick = (lat, lng) => {
    const openGmaps = () => {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
    };
    if (GeoLocationLinks.gmapsConfirmation === -1 || GeoLocationLinks.gmapsConfirmation === false) {
      msgDialog('confirmation', 'geolocation-link', l[20788], l.confirm_ext_link, answer => {
        if (answer) {
          GeoLocationLinks.confirmationDoConfirm();
          closeDialog();
          openGmaps();
        } else {
          GeoLocationLinks.confirmationDoNever();
        }
      });
    } else if (GeoLocationLinks.gmapsConfirmation) {
      openGmaps();
    }
  };
  return JSX_("div", {
    className: "geolocation-container"
  }, JSX_("div", {
    className: "geolocation",
    onClick: () => handleOnclick(latitude, lng)
  }, JSX_("div", {
    className: "geolocation__details"
  }, JSX_("div", {
    className: "geolocation__icon"
  }, JSX_("i", {
    className: "sprite-fm-mono icon-location"
  })), JSX_("ul", {
    className: "geolocation__data-list"
  }, JSX_("li", null, JSX_("span", {
    className: "geolocation__title"
  }, l[20789])), JSX_("li", null, JSX_("p", null, JSX_("span", {
    className: "geolocation__coordinates-icon"
  }), JSX_("span", {
    className: "geolocation__coordinates"
  }, "https://maps.google.com")))))));
}
 const geoLocation = GeoLocation;
;// ./js/chat/ui/messages/types/partials/metaRichpreviewMegaLinks.jsx





class MetaRichpreviewMegaLinks extends mixin.M {
  render() {
    const {message} = this.props;
    const {chatRoom} = this.props.message;
    let previewContainer;
    const output = [];
    const megaLinks = message.megaLinks ? message.megaLinks : [];
    for (let i = 0; i < megaLinks.length; i++) {
      const megaLinkInfo = megaLinks[i];
      if (megaLinkInfo.failed) {
        continue;
      }
      if (megaLinkInfo.hadLoaded() === false) {
        if (megaLinkInfo.startedLoading() === false) {
          megaLinkInfo.getInfo().then(() => {
            const {
              megaLinks
            } = this.props.message;
            const contactLinkHandles = megaLinks.filter(link => link.is_contactlink).map(link => link.info.h);
            if (contactLinkHandles.length) {
              this.addContactListenerIfMissing(contactLinkHandles);
            }
          }).catch(reportError).finally(() => {
            message.trackDataChange();
            onIdle(() => {
              this.safeForceUpdate();
            });
          });
        }
        previewContainer = JSX_(MetaRichpreviewLoading, {
          message,
          isLoading: megaLinkInfo.hadLoaded()
        });
      } else if (megaLinkInfo.is_contactlink) {
        const fakeContact = M.u[megaLinkInfo.info.h] ? M.u[megaLinkInfo.info.h] : {
          'u': megaLinkInfo.info.h,
          'm': megaLinkInfo.info.e,
          'firstName': megaLinkInfo.info.fn,
          'lastName': megaLinkInfo.info.ln,
          'name': `${megaLinkInfo.info.fn  } ${  megaLinkInfo.info.ln}`
        };
        if (!M.u[fakeContact.u]) {
          M.u.set(fakeContact.u, new MegaDataObject(MEGA_USER_STRUCT, {
            'u': fakeContact.u,
            'name': `${fakeContact.firstName  } ${  fakeContact.lastName}`,
            'm': fakeContact.m ? fakeContact.m : "",
            'c': undefined
          }));
        }
        const contact = M.u[megaLinkInfo.info.h];
        previewContainer = JSX_("div", {
          key: megaLinkInfo.info.h,
          className: "message shared-block contact-link"
        }, JSX_("div", {
          className: "message shared-info"
        }, JSX_("div", {
          className: "message data-title selectable-txt"
        }, contact.name), JSX_(ui_contacts.n4, {
          className: "right-align",
          contact
        }), JSX_("div", {
          className: "user-card-email selectable-txt"
        }, contact.m)), JSX_("div", {
          className: "message shared-data"
        }, JSX_("div", {
          className: "data-block-view semi-big"
        }, JSX_(ui_contacts.i1, {
          className: "small",
          contact
        }), JSX_(ui_contacts.eu, {
          className: "avatar-wrapper medium-avatar",
          contact,
          chatRoom
        })), JSX_("div", {
          className: "clear"
        })));
      } else {
        var desc;
        const is_icon = megaLinkInfo.is_dir ? true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);
        if (megaLinkInfo.is_chatlink) {
          desc = l[8876].replace('%1', megaLinkInfo.info.ncm);
        } else if (!megaLinkInfo.is_dir) {
          desc = bytesToSize(megaLinkInfo.info.size);
        } else {
          const totalNumberOfFiles = megaLinkInfo.info.s[1];
          const numOfVersionedFiles = megaLinkInfo.info.s[4];
          const folderCount = megaLinkInfo.info.s[2];
          const totalFileSize = megaLinkInfo.info.size;
          const versionsSize = megaLinkInfo.info.s[3];
          desc = JSX_("span", null, fm_contains(totalNumberOfFiles - numOfVersionedFiles, folderCount - 1), JSX_("br", null), bytesToSize(totalFileSize - versionsSize));
        }
        previewContainer = JSX_("div", {
          className: `message richpreview body ${  is_icon ? "have-icon" : "no-icon"  } ${  megaLinkInfo.is_chatlink ? "is-chat" : ""}`
        }, megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ? JSX_("div", {
          className: "message richpreview img-wrapper"
        }, JSX_("div", {
          className: "message richpreview preview",
          style: {
            "backgroundImage": `url(${  megaLinkInfo.info.preview_url  })`
          }
        })) : JSX_("div", {
          className: "message richpreview img-wrapper"
        }, megaLinkInfo.is_chatlink ? JSX_("i", {
          className: "huge-icon conversations"
        }) : JSX_("div", {
          className: `message richpreview icon item-type-icon-90 icon-${  megaLinkInfo.is_dir ? "folder" : fileIcon(megaLinkInfo.info)  }-90`
        })), JSX_("div", {
          className: "message richpreview inner-wrapper"
        }, JSX_("div", {
          className: "message richpreview data-title selectable-txt"
        }, JSX_("span", {
          className: "message richpreview title"
        }, JSX_(utils.zT, null, megaLinkInfo.info.name || megaLinkInfo.info.topic || ""))), JSX_("div", {
          className: "message richpreview desc"
        }, desc), JSX_("div", {
          className: "message richpreview url-container"
        }, JSX_("span", {
          className: "message richpreview url-favicon"
        }, JSX_("img", {
          src: `https://mega.${mega.tld}/favicon.ico?v=3&c=1`,
          width: 16,
          height: 16,
          onError: e => {
            if (e && e.target && e.target.parentNode) {
              e.target.parentNode.removeChild(e.target);
            }
          },
          alt: ""
        })), JSX_("span", {
          className: "message richpreview url"
        }, ellipsis(megaLinkInfo.getLink(), 'end', 40)))));
      }
      output.push(JSX_("div", {
        key: `${megaLinkInfo.node_key  }_${  output.length}`,
        className: `message richpreview container ${  megaLinkInfo.havePreview() ? "have-preview" : "no-preview"  } ${  megaLinkInfo.d ? "have-description" : "no-description"  } ${  !megaLinkInfo.hadLoaded() ? "is-loading" : "done-loading"}`,
        onClick: function (url, megaLinkInfo) {
          if (megaLinkInfo.hadLoaded()) {
            if (window.sfuClient && megaLinkInfo.is_chatlink) {
              const {
                chatRoom: callRoom
              } = megaChat.activeCall;
              const peers = callRoom ? callRoom.getParticipantsExceptMe(callRoom.getCallParticipants()).map(h => M.getNameByHandle(h)) : [];
              const body = peers.length ? mega.utils.trans.listToString(peers, l.cancel_with_to_join) : l.cancel_to_join;
              return msgDialog('confirmation', undefined, l.call_in_progress, body, e => e && window.open(url, '_blank', 'noopener,noreferrer'));
            }
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        }.bind(this, megaLinkInfo.getLink(), megaLinkInfo)
      }, previewContainer, JSX_("div", {
        className: "clear"
      })));
    }
    return JSX_("div", {
      className: "message richpreview previews-container"
    }, output);
  }
}

// EXTERNAL MODULE: ./js/chat/ui/typingArea.jsx + 5 modules
const typingArea = REQ_(4762);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/chat/ui/messages/types/text.jsx












class Text extends AbstractGenericMessage {
  constructor(props) {
    super(props);
    this.state = {
      editText: ''
    };
  }
  isRichPreview(message) {
    return message.metaType === Message.MESSAGE_META_TYPE.RICH_PREVIEW;
  }
  isGeoLocation(message) {
    return message.metaType === Message.MESSAGE_META_TYPE.GEOLOCATION;
  }
  getClassNames() {
    const {
      message,
      isBeingEdited,
      grouped
    } = this.props;
    const REQUIRES_CONFIRMATION = this.isRichPreview(message) && message.meta.requiresConfirmation && !isBeingEdited() && (message.source === Message.SOURCE.SENT || message.confirmed === true);
    return `
            ${REQUIRES_CONFIRMATION ? 'preview-requires-confirmation-container' : ''}
            ${grouped ? 'grouped' : ''}
        `;
  }
  renderMessageIndicators() {
    const {
      message,
      spinnerElement,
      isBeingEdited,
      onRetry,
      onCancelRetry
    } = this.props;
    if (!message || spinnerElement || isBeingEdited()) {
      return null;
    }
    const state = message.getState == null ? void 0 : message.getState();
    if (![Message.STATE.NOT_SENT, Message.STATE.NOT_SENT_EXPIRED].includes(state)) {
      return null;
    }
    const props = {
      'data-simpletipposition': 'top',
      'data-simpletipoffset': 8
    };
    return message.requiresManualRetry ? JSX_("div", {
      className: "not-sent-indicator clickable"
    }, JSX_("span", (0,esm_extends.A)({
      className: "simpletip"
    }, props, {
      "data-simpletip": l[8883],
      onClick: ev => onRetry(ev, message)
    }), JSX_("i", {
      className: "small-icon refresh-circle"
    })), JSX_("span", (0,esm_extends.A)({
      className: "simpletip"
    }, props, {
      "data-simpletip": l[8884],
      onClick: ev => onCancelRetry(ev, message)
    }), JSX_("i", {
      className: "sprite-fm-mono icon-dialog-close"
    }))) : JSX_("div", (0,esm_extends.A)({
      className: "not-sent-indicator simpletip"
    }, props, {
      "data-simpletip": l[8882]
    }), JSX_("i", {
      className: "small-icon yellow-triangle"
    }));
  }
  getMessageActionButtons() {
    const {
      chatRoom,
      message,
      isBeingEdited
    } = this.props;
    if (isBeingEdited()) {
      return [];
    }
    let extraPreButtons = [];
    let messageActionButtons = null;
    const IS_GEOLOCATION = this.isGeoLocation(message);
    if (!message.deleted && this.isRichPreview(message)) {
      if (!message.meta.requiresConfirmation) {
        if (message.isEditable()) {
          if (message.meta.isLoading) {
            extraPreButtons = [...extraPreButtons, JSX_(dropdowns.tJ, {
              icon: "sprite-fm-mono icon-eye-hidden",
              key: "stop-link-preview",
              label: l[18684],
              className: "",
              onClick: e => {
                e.stopPropagation();
                e.preventDefault();
                chatRoom.megaChat.plugins.richpreviewsFilter.cancelLoading(chatRoom, message);
              }
            })];
          } else {
            extraPreButtons = [...extraPreButtons, JSX_(dropdowns.tJ, {
              key: "remove-link-preview",
              icon: "sprite-fm-mono icon-eye-hidden",
              label: l[18684],
              className: "",
              onClick: e => {
                e.stopPropagation();
                e.preventDefault();
                chatRoom.megaChat.plugins.richpreviewsFilter.revertToText(chatRoom, message);
              }
            })];
          }
        }
      } else if (!isBeingEdited() && !(message.source === Message.SOURCE.SENT || message.confirmed === true)) {
        extraPreButtons = [...extraPreButtons, JSX_(dropdowns.tJ, {
          key: "insert-link-preview",
          icon: "icons-sprite bold-eye",
          label: l[18683],
          className: "",
          onClick: e => {
            e.stopPropagation();
            e.preventDefault();
            chatRoom.megaChat.plugins.richpreviewsFilter.insertPreview(message);
          }
        })];
      }
    }
    if (!message.deleted && message.isEditable() && !isBeingEdited() && !chatRoom.isReadOnly() && !message.requiresManualRetry) {
      const editButton = !IS_GEOLOCATION && JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-rename",
        label: l[1342],
        onClick: () => this.props.onEditToggle(true)
      });
      messageActionButtons = JSX_(buttons.$, {
        key: "delete-msg",
        className: "tiny-button",
        icon: "sprite-fm-mono icon-options"
      }, JSX_(dropdowns.ms, {
        className: "white-context-menu attachments-dropdown",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, extraPreButtons, editButton, editButton ? JSX_("hr", null) : null, JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-dialog-close",
        label: l[1730],
        onClick: e => this.props.onDelete(e, message)
      })));
    }
    let parentButtons;
    if (super.getMessageActionButtons) {
      parentButtons = super.getMessageActionButtons();
    }
    const returnedButtons = [];
    if (messageActionButtons) {
      returnedButtons.push(messageActionButtons);
    }
    if (message.messageHtml && message.messageHtml.includes('<pre class="rtf-multi">') && message.messageHtml.includes('</pre>')) {
      returnedButtons.push(JSX_(buttons.$, {
        key: "copy-msg",
        className: "tiny-button simpletip copy-txt-block",
        icon: "sprite-fm-mono icon-copy",
        attrs: {
          'data-simpletip': l.copy_txt_block_tip,
          'data-simpletipoffset': '3',
          'data-simpletipposition': 'top'
        },
        onClick: () => {
          copyToClipboard(message.textContents.replace(/```/g, ''), l.copy_txt_block_toast);
        }
      }));
    }
    if (parentButtons) {
      returnedButtons.push(parentButtons);
    }
    return returnedButtons;
  }
  getContents() {
    const {
      message,
      chatRoom,
      onUpdate,
      isBeingEdited,
      spinnerElement
    } = this.props;
    let textMessage = message.messageHtml;
    const IS_GEOLOCATION = this.isGeoLocation(message);
    const {
      lng,
      la: latitude
    } = IS_GEOLOCATION && message.meta.extra[0];
    if (message.textContents === '' && !message.dialogType) {
      message.deleted = true;
    }
    let subMessageComponent = [];
    if (!message.deleted) {
      if (this.isRichPreview(message)) {
        if (!message.meta.requiresConfirmation) {
          subMessageComponent = [...subMessageComponent, JSX_(MetaRichpreview, {
            key: "richprev",
            message,
            chatRoom
          })];
        } else if (!isBeingEdited()) {
          if (message.source === Message.SOURCE.SENT || message.confirmed === true) {
            subMessageComponent = [...subMessageComponent, JSX_(MetaRichprevConfirmation, {
              key: "confirm",
              message,
              chatRoom
            })];
          }
        }
      }
      if (message.megaLinks) {
        subMessageComponent = [...subMessageComponent, JSX_(MetaRichpreviewMegaLinks, {
          key: "richprevml",
          message,
          chatRoom
        })];
      }
    }
    let messageDisplayBlock;
    if (isBeingEdited() === true) {
      let msgContents = message.textContents;
      msgContents = megaChat.plugins.emoticonsFilter.fromUtfToShort(msgContents);
      messageDisplayBlock = JSX_(typingArea.T, {
        iconClass: "small-icon writing-pen textarea-icon",
        initialText: msgContents,
        text: this.state.editText || msgContents,
        chatRoom,
        showButtons: true,
        editing: true,
        className: "edit-typing-area",
        onUpdate: () => onUpdate ? onUpdate : null,
        onConfirm: messageContents => {
          this.props.onEditToggle(false);
          if (this.props.onEditDone) {
            Soon(() => {
              const tmpMessageObj = {
                textContents: messageContents
              };
              megaChat.plugins.emoticonsFilter.processOutgoingMessage({}, tmpMessageObj);
              this.props.onEditDone(tmpMessageObj.textContents);
              if (this.isMounted()) {
                this.forceUpdate();
              }
            });
          }
          return true;
        },
        onResized: this.props.onResized ? this.props.onResized : false,
        onValueChanged: val => {
          this.setState({
            editText: val
          });
        }
      });
    } else {
      if (message.updated > 0 && !message.metaType) {
        textMessage = `${textMessage} <em class="edited simpletip"
                    data-simpletip="${toLocaleTime(this.getTimestamp(true))}"
                    data-simpletipposition="top" data-simpletipoffset="4"> ${l[8887]} </em>`;
      }
      if (this.props.initTextScrolling) {
        messageDisplayBlock = JSX_(perfectScrollbar.O, {
          className: "message text-block scroll"
        }, JSX_("div", {
          className: "message text-scroll"
        }, JSX_(utils.P9, null, textMessage)));
      } else {
        messageDisplayBlock = JSX_("div", {
          className: "message text-block"
        }, JSX_(utils.P9, null, textMessage));
      }
    }
    return JSX_(REaCt().Fragment, null, this.renderMessageIndicators(), IS_GEOLOCATION ? null : messageDisplayBlock, subMessageComponent, spinnerElement, IS_GEOLOCATION && JSX_(geoLocation, {
      latitude,
      lng
    }));
  }
}
// EXTERNAL MODULE: ./js/chat/ui/gifPanel/utils.jsx
const gifPanel_utils = REQ_(1635);
;// ./js/chat/ui/messages/types/giphy.jsx





class Giphy extends AbstractGenericMessage {
  constructor(...args) {
    super(...args);
    this.gifRef = REaCt().createRef();
    this.viewStateListener = `viewstateChange.giphy--${this.getUniqueId()}`;
    this.state = {
      src: undefined
    };
  }
  componentDidMount() {
    super.componentDidMount();
    megaChat.rebind(this.viewStateListener, ({
      data
    }) => {
      const gifRef = this.gifRef && this.gifRef.current;
      if (gifRef) {
        const {
          state
        } = data;
        if (state === 'active' && gifRef.paused || state !== 'active' && !gifRef.paused) {
          this.toggle();
        }
      }
    });
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    megaChat.off(this.viewStateListener);
  }
  onVisibilityChange(isIntersecting) {
    this.setState({
      src: isIntersecting ? gifPanel_utils.nC.convert(this.props.message.meta.src) : undefined
    }, () => {
      let _this$gifRef;
      (_this$gifRef = this.gifRef) == null || (_this$gifRef = _this$gifRef.current) == null || _this$gifRef[isIntersecting ? 'load' : 'pause']();
      this.safeForceUpdate();
    });
  }
  toggle() {
    const video = this.gifRef.current;
    Promise.resolve(video[video.paused ? 'play' : 'pause']()).catch(nop);
  }
  getMessageActionButtons() {
    const {
      onDelete,
      message
    } = this.props;
    const $$BUTTONS = [message.isEditable() && JSX_(buttons.$, {
      key: "delete-GIPHY-button",
      className: "tiny-button",
      icon: "sprite-fm-mono icon-options"
    }, JSX_(dropdowns.ms, {
      className: "white-context-menu attachments-dropdown",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      horizOffset: 4
    }, JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-dialog-close",
      label: l[1730],
      onClick: e => onDelete(e, message)
    }))), super.getMessageActionButtons && super.getMessageActionButtons()];
    return $$BUTTONS.filter(button => button);
  }
  getContents() {
    const {
      message,
      hideActionButtons
    } = this.props;
    const {
      s,
      w,
      h,
      src
    } = message.meta;
    const autoPlay = parseInt(s, 10) < 4e6;
    return JSX_("video", {
      className: "giphy-block",
      ref: this.gifRef,
      title: message.textContents,
      autoPlay,
      loop: true,
      muted: true,
      controls: false,
      width: w,
      height: h,
      style: {
        cursor: autoPlay ? 'default' : 'pointer',
        height: `${h}px`
      },
      onClick: () => !autoPlay && this.toggle(),
      src: hideActionButtons ? gifPanel_utils.nC.convert(src) : this.state.src
    });
  }
}
;// ./js/chat/ui/messages/generic.jsx










class GenericConversationMessage extends mixin.M {
  constructor(props) {
    super(props);
    this.containerRef = REaCt().createRef();
    this.state = {
      editing: this.props.editing
    };
    this.pid = `__geom_${  String(Math.random()).substr(2)}`;
  }
  isBeingEdited() {
    return this.state.editing === true || this.props.editing === true;
  }
  componentDidUpdate(oldProps, oldState) {
    const isBeingEdited = this.isBeingEdited();
    const isMounted = this.isMounted();
    if (isBeingEdited && isMounted) {
      let _this$containerRef;
      const $generic = $((_this$containerRef = this.containerRef) == null ? void 0 : _this$containerRef.current);
      const $textarea = $('textarea', $generic);
      if ($textarea.length > 0 && !$textarea.is(":focus")) {
        $textarea.trigger("focus");
        moveCursortoToEnd($textarea[0]);
      }
      if (!oldState.editing && this.props.onEditStarted) {
        this.props.onEditStarted($generic);
        moveCursortoToEnd($textarea);
      }
    }
    if (isMounted && !isBeingEdited && oldState.editing === true && this.props.onUpdate) {
      this.props.onUpdate();
    }
  }
  componentDidMount() {
    let _this$containerRef2;
    super.componentDidMount();
    const $node = $((_this$containerRef2 = this.containerRef) == null ? void 0 : _this$containerRef2.current);
    if (this.isBeingEdited() && this.isMounted()) {
      const $textarea = $('textarea', $node);
      if ($textarea.length > 0 && !$textarea.is(':focus')) {
        $textarea.trigger('focus');
        moveCursortoToEnd($textarea[0]);
      }
    }
  }
  haveMoreContactListeners() {
    if (!this.props.message || !this.props.message.meta) {
      return false;
    }
    if (this.props.message.meta && this.props.message.meta.participants) {
      return this.props.message.meta.participants;
    }
    return false;
  }
  doDelete(e, msg) {
    e.preventDefault(e);
    e.stopPropagation(e);
    if (msg.getState() === Message.STATE.NOT_SENT_EXPIRED) {
      this.doCancelRetry(e, msg);
    } else {
      this.props.onDeleteClicked(this.props.message);
    }
  }
  doCancelRetry(e, msg) {
    e.preventDefault(e);
    e.stopPropagation(e);
    const {chatRoom} = this.props.message;
    const {messageId} = msg;
    chatRoom.messagesBuff.messages.removeByKey(messageId);
    chatRoom.megaChat.plugins.chatdIntegration.discardMessage(chatRoom, messageId);
  }
  doRetry(e, msg) {
    e.preventDefault(e);
    e.stopPropagation(e);
    const {chatRoom} = this.props.message;
    this.doCancelRetry(e, msg);
    chatRoom._sendMessageToTransport(msg).then(internalId => {
      msg.internalId = internalId;
      this.safeForceUpdate();
    });
  }
  _favourite(h) {
    if (M.isInvalidUserStatus()) {
      return;
    }
    const newFavState = Number(!M.isFavourite(h));
    M.favourite([h], newFavState);
  }
  _addFavouriteButtons(h, arr) {
    const self = this;
    if (M.getNodeRights(h) > 1) {
      const isFav = M.isFavourite(h);
      arr.push(JSX_(dropdowns.tJ, {
        icon: `
                        sprite-fm-mono
                        context
                        ${isFav ? 'icon-favourite-removed' : 'icon-favourite'}
                    `,
        label: isFav ? l[5872] : l[5871],
        isFav,
        key: "fav",
        disabled: mega.paywall,
        onClick: e => {
          self._favourite(h);
          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }));
      return isFav;
    }
    return false;
  }
  _isNodeHavingALink(h) {
    return M.getNodeShare(h) !== false;
  }
  _addLinkButtons(h, arr) {
    const self = this;
    const haveLink = self._isNodeHavingALink(h) === true;
    const getManageLinkText = haveLink ? l[6909] : l[5622];
    arr.push(JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-link",
      key: "getLinkButton",
      label: getManageLinkText,
      disabled: mega.paywall,
      onClick: self._getLink.bind(self, h)
    }));
    if (haveLink) {
      arr.push(JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono context icon-link-remove",
        key: "removeLinkButton",
        label: l[6821],
        disabled: mega.paywall,
        onClick: self._removeLink.bind(self, h)
      }));
      return true;
    }
    return false;
  }
  _startDownload(v) {
    M.addDownload([v]);
  }
  _addToCloudDrive(v, openSendToChat) {
    $.selected = [v.h];
    $.chatAttachmentShare = true;
    if ($.dialog === 'onboardingDialog') {
      closeDialog();
    }
    if (openSendToChat) {
      openSendToChatDialog();
      return;
    }
    openSaveToDialog(v, (node, target) => {
      target = target || M.RootID;
      M.injectNodes(node, target, res => {
        if (!Array.isArray(res) || !res.length) {
          if (d) {
            console.warn('Unable to inject nodes... no longer existing?', res);
          }
        } else {
          mega.ui.toast.show(mega.icu.format(l.toast_import_file, res.length).replace('%s', M.getNameByHandle(target)), 4, l[16797], {
            actionButtonCallback() {
              M.openFolder(target).then(() => {
                if (window.selectionManager) {
                  let reset = false;
                  for (let i = res.length; i--;) {
                    const n = M.getNodeByHandle(res[i]);
                    if (n.p === target) {
                      if (reset) {
                        selectionManager.add_to_selection(n.h);
                      } else {
                        selectionManager.resetTo(n.h);
                        reset = true;
                      }
                    }
                  }
                }
              }).catch(dump);
            }
          });
        }
      });
    }, false);
  }
  _getLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      $.selected = [h];
      mega.Share.initCopyrightsDialog([h]);
    }
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  _removeLink(h, e) {
    if (u_type === 0) {
      ephemeralDialog(l[1005]);
    } else {
      const exportLink = new mega.Share.ExportLink({
        'updateUI': true,
        'nodesToProcess': [h]
      });
      exportLink.removeExportLink();
    }
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  _startPreview(v, e) {
    if ($(e && e.target).is('.tiny-button')) {
      return;
    }
    assert(M.chat, 'Not in chat.');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    M.viewMediaFile(v);
  }
  render() {
    const {
      message,
      chatRoom
    } = this.props;
    const {megaChat} = this.props.message.chatRoom;
    const {textContents} = message;
    let additionalClasses = "";
    let spinnerElement = null;
    let messageIsNowBeingSent = false;
    if (this.props.className) {
      additionalClasses += this.props.className;
    }
    if (message instanceof Message) {
      if (!message.wasRendered || !message.messageHtml) {
        message.messageHtml = htmlentities(textContents).replace(/\n/gi, "<br/>").replace(/\t/g, '    ');
        message.processedBy = {};
        const evtObj = {
          message,
          room: chatRoom
        };
        megaChat.trigger('onPreBeforeRenderMessage', evtObj);
        const event = new MegaDataEvent('onBeforeRenderMessage');
        megaChat.trigger(event, evtObj);
        megaChat.trigger('onPostBeforeRenderMessage', evtObj);
        if (event.isPropagationStopped()) {
          this.logger.warn(`Event propagation stopped receiving (rendering) of message: ${message}`);
          return false;
        }
        message.wasRendered = 1;
      }
      const state = message.getState();
      const stateText = message.getStateText(state);
      if (state === Message.STATE.NOT_SENT) {
        messageIsNowBeingSent = unixtime() - message.delay < 5;
        if (messageIsNowBeingSent) {
          additionalClasses += ' sending';
          spinnerElement = JSX_("div", {
            className: "small-blue-spinner"
          });
          if (!message.sending) {
            message.sending = true;
            delay(this.pid + message.messageId, () => {
              if (chatRoom.messagesBuff.messages[message.messageId] && message.sending === true) {
                chatRoom.messagesBuff.trackDataChange();
                if (this.isMounted()) {
                  this.forceUpdate();
                }
              }
            }, (5 - (unixtime() - message.delay)) * 1000);
          }
        } else {
          additionalClasses += ' not-sent';
          if (message.sending === true) {
            message.sending = false;
            message.trigger('onChange', [message, 'sending', true, false]);
          }
          if (message.requiresManualRetry) {
            additionalClasses += ' retrying requires-manual-retry';
          } else {
            additionalClasses += ' retrying';
          }
        }
      } else {
        additionalClasses += ` ${  stateText}`;
      }
    }
    const MESSAGE = {
      TYPE: {
        ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.ATTACHMENT,
        CONTACT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.CONTACT,
        REVOKE_ATTACHMENT: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.REVOKE_ATTACHMENT,
        VOICE_CLIP: textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP,
        GIPHY: message.metaType && message.metaType === Message.MESSAGE_META_TYPE.GIPHY,
        TEXT: textContents[0] !== Message.MANAGEMENT_MESSAGE_TYPES.MANAGEMENT,
        INLINE: !(message instanceof Message) && message.type && !!message.type.length,
        REVOKED: message.revoked
      },
      props: {
        ...this.props,
        additionalClasses
      },
      isBeingEdited: () => this.isBeingEdited(),
      onDelete: (e, message) => this.doDelete(e, message)
    };
    const $$CONTAINER = children => JSX_("div", {
      ref: this.containerRef
    }, children);
    switch (true) {
      case MESSAGE.TYPE.REVOKED || MESSAGE.TYPE.REVOKE_ATTACHMENT:
        return null;
      case MESSAGE.TYPE.ATTACHMENT:
        return $$CONTAINER(JSX_(Attachment, (0,esm_extends.A)({}, MESSAGE.props, {
          onPreviewStart: (v, e) => this._startPreview(v, e),
          onDownloadStart: v => this._startDownload(v),
          onAddLinkButtons: (h, arr) => this._addLinkButtons(h, arr),
          onAddToCloudDrive: (v, openSendToChat) => this._addToCloudDrive(v, openSendToChat),
          onAddFavouriteButtons: (h, arr) => this._addFavouriteButtons(h, arr)
        })));
      case MESSAGE.TYPE.CONTACT:
        return $$CONTAINER(JSX_(Contact, (0,esm_extends.A)({}, MESSAGE.props, {
          onDelete: MESSAGE.onDelete
        })));
      case MESSAGE.TYPE.VOICE_CLIP:
        return $$CONTAINER(JSX_(VoiceClip, (0,esm_extends.A)({}, MESSAGE.props, {
          isBeingEdited: MESSAGE.isBeingEdited,
          onDelete: MESSAGE.onDelete
        })));
      case MESSAGE.TYPE.INLINE:
        return $$CONTAINER(JSX_(Local, MESSAGE.props));
      case MESSAGE.TYPE.GIPHY:
        return $$CONTAINER(JSX_(Giphy, (0,esm_extends.A)({}, MESSAGE.props, {
          onDelete: MESSAGE.onDelete
        })));
      case MESSAGE.TYPE.TEXT:
        return $$CONTAINER(JSX_(Text, (0,esm_extends.A)({}, MESSAGE.props, {
          onEditToggle: editing => this.setState({
            editing
          }),
          onDelete: MESSAGE.onDelete,
          onRetry: (e, message) => this.doRetry(e, message),
          onCancelRetry: (e, message) => this.doCancelRetry(e, message),
          isBeingEdited: MESSAGE.isBeingEdited,
          spinnerElement
        })));
      default:
        return null;
    }
  }
}

 },

 8491
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  ChatToaster
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _mixins1__ = REQ_(8264);
 const _meetings_utils_jsx2__ = REQ_(3901);
 const _ui_buttons3__ = REQ_(5155);




const NAMESPACE = 'chat-toast';
class ChatToaster extends react0___default().Component {
  constructor(props) {
    super(props);
    this.uid = `${this.constructor.name}--${(0,_mixins1__ .LP)()}`;
    this.domRef = react0___default().createRef();
    this.state = {
      toast: null,
      endTime: 0,
      fmToastId: null,
      persistentToast: null
    };
    this.toasts = [];
    this.persistentToasts = [];
  }
  enqueueToast(e) {
    if (this.props.showDualNotifications && e.data.options && e.data.options.persistent) {
      this.persistentToasts.push(e.data);
    } else {
      this.toasts.push(e.data);
    }
    this.pollToasts();
  }
  pollToasts() {
    const {
      toast: shownToast,
      persistentToast: shownPersistentToast
    } = this.state;
    const {
      isRootToaster,
      showDualNotifications,
      onShownToast
    } = this.props;
    const now = Date.now();
    if (this.toasts.length + this.persistentToasts.length) {
      if (this.domRef.current && (!isRootToaster && (0,_meetings_utils_jsx2__ .Av)() || M.chat)) {
        if (this.toasts.length && !shownToast) {
          this.dispatchToast(this.toasts.shift(), now);
        }
        if (showDualNotifications && this.persistentToasts.length && !shownPersistentToast) {
          const persistentToast = this.persistentToasts.shift();
          this.setState({
            persistentToast
          }, () => this.pollToasts());
          if (typeof onShownToast === 'function') {
            onShownToast(persistentToast);
          }
        }
      } else if (isRootToaster && this.toasts.length && !shownToast) {
        const toast = this.toasts.shift();
        this.dispatchToast(toast, now, {
          fmToastId: 'tmp'
        });
        this.dispatchFMToast(toast);
      }
    }
  }
  dispatchFMToast(toast, redraw) {
    window.toaster.alerts.medium(...toast.renderFM()).then(fmToastId => {
      if (!redraw) {
        toast.onShown(fmToastId);
      }
      this.setState({
        fmToastId
      });
      if (toast.updater && typeof toast.updater === 'function') {
        toast.updater();
        toast.updateInterval = setInterval(() => {
          toast.updater();
          const value = toast.render();
          if (!value) {
            window.toaster.alerts.hide(fmToastId);
            return this.onClose(toast.options && toast.options.persistent);
          }
          if (value !== $('span', `#${fmToastId}`).text()) {
            $('span', `#${fmToastId}`).text(value);
          }
        }, 250);
      }
    });
  }
  dispatchToast(toast, now, options = {}) {
    const {
      fmToastId,
      endTime,
      silent
    } = options;
    const {
      onShownToast,
      onHideToast
    } = this.props;
    this.setState({
      toast,
      endTime: endTime || now + toast.getTTL(),
      fmToastId
    }, () => {
      if (!silent) {
        toast.onShown();
      }
      this.timeout = setTimeout(() => {
        delete this.timeout;
        this.setState({
          toast: null,
          endTime: 0
        }, () => this.pollToasts());
        if (typeof toast.onEnd === 'function') {
          toast.onEnd();
        }
        if (typeof onHideToast === 'function') {
          onHideToast(toast);
        }
        if (toast.updateInterval) {
          clearInterval(toast.updateInterval);
          delete toast.updateInterval;
        }
      }, endTime ? endTime - now : toast.getTTL());
    });
    if (typeof onShownToast === 'function') {
      onShownToast(toast);
    }
  }
  onClose(persistent) {
    const {
      showDualNotifications,
      onHideToast
    } = this.props;
    const {
      toast,
      persistentToast
    } = this.state;
    if (showDualNotifications && persistent) {
      if (typeof persistentToast.onEnd === 'function') {
        persistentToast.onEnd();
      }
      this.setState({
        persistentToast: null
      }, () => this.pollToasts());
      if (typeof onHideToast === 'function') {
        onHideToast(persistentToast);
      }
      return;
    }
    if (toast.updateInterval) {
      clearInterval(toast.updateInterval);
      delete toast.updateInterval;
    }
    clearTimeout(this.timeout);
    delete this.timeout;
    if (typeof toast.onEnd === 'function') {
      toast.onEnd();
    }
    if (typeof onHideToast === 'function') {
      onHideToast(toast);
    }
    this.setState({
      toast: null,
      endTime: 0
    }, () => this.pollToasts());
  }
  flush() {
    const {
      toast,
      persistentToast,
      fmToastId
    } = this.state;
    this.endToastIntervals();
    if (fmToastId && fmToastId !== 'tmp') {
      window.toaster.alerts.hide(fmToastId);
    }
    this.toasts = [];
    this.persistentToasts = [];
    if (this.timeout) {
      clearTimeout(this.timeout);
      delete this.timeout;
    }
    if (toast) {
      this.onClose(toast.persistent);
    }
    if (persistentToast) {
      this.onClose(true);
    }
    this.setState({
      toast: null,
      endTime: 0,
      fmToastId: null,
      persistentToast: null
    });
  }
  endToastIntervals() {
    if (!this.props.isRootToaster) {
      return;
    }
    for (const toast of this.toasts) {
      if (toast.updateInterval) {
        clearInterval(toast.updateInterval);
      }
    }
    for (const toast of this.persistentToasts) {
      if (toast.updateInterval) {
        clearInterval(toast.updateInterval);
      }
    }
  }
  componentDidMount() {
    megaChat.rebind(`onChatToast.toaster${this.uid}`, e => this.enqueueToast(e));
    megaChat.rebind(`onChatToastFlush.toaster${this.uid}`, () => this.flush());
    onIdle(() => this.pollToasts());
    if (this.props.isRootToaster) {
      this.bpcListener = mBroadcaster.addListener('beforepagechange', tpage => {
        const {
          toast,
          endTime,
          fmToastId
        } = this.state;
        const now = Date.now();
        if (toast && endTime - 500 > now) {
          const toChat = tpage.includes('chat') && tpage !== 'securechat';
          if (toChat && !M.chat) {
            clearTimeout(this.timeout);
            window.toaster.alerts.hide(fmToastId);
            if (toast.updateInterval) {
              clearInterval(toast.updateInterval);
              delete toast.updateInterval;
            }
            this.dispatchToast(toast, now, {
              endTime,
              silent: true
            });
          } else if (!toChat && M.chat) {
            clearTimeout(this.timeout);
            this.dispatchToast(toast, now, {
              fmToastId: 'tmp',
              endTime,
              silent: true
            });
            this.dispatchFMToast(toast, true);
          }
        } else if (toast && typeof toast.onEnd === 'function') {
          toast.onEnd();
        }
      });
    }
  }
  componentWillUnmount() {
    megaChat.off(`onChatToast.toaster${this.uid}`);
    megaChat.off(`onChatToastFlush.toaster${this.uid}`);
    if (this.bpcListener) {
      mBroadcaster.removeListener(this.bpcListener);
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.endToastIntervals();
  }
  render() {
    const {
      hidden,
      isRootToaster,
      showDualNotifications
    } = this.props;
    const {
      toast,
      fmToastId,
      persistentToast
    } = this.state;
    return !hidden && !fmToastId && JSX_("div", {
      ref: this.domRef,
      className: `chat-toast-bar ${isRootToaster ? 'toaster-root' : ''}`
    }, showDualNotifications && persistentToast && JSX_(ChatToastMsg, {
      toast: persistentToast,
      isRootToaster,
      usePersistentStyle: true,
      onClose: p => this.onClose(p)
    }), toast && JSX_(ChatToastMsg, {
      toast,
      isRootToaster,
      isDualToast: !!persistentToast,
      onClose: p => this.onClose(p)
    }));
  }
}
class ChatToastMsg extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.state = {
      value: ''
    };
  }
  componentDidMount() {
    const {
      toast,
      onClose
    } = this.props;
    if (toast.updater && typeof toast.updater === 'function') {
      toast.updater();
      this.updateInterval = setInterval(() => {
        toast.updater();
        const value = toast.render();
        if (!value) {
          return onClose(toast.options && toast.options.persistent);
        }
        if (value !== this.state.value) {
          this.setState({
            value
          });
        }
      }, 250);
    }
    const value = toast.render();
    if (value) {
      this.setState({
        value
      });
    } else {
      onClose(toast.options && toast.options.persistent);
    }
  }
  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  render() {
    const {
      toast,
      isRootToaster,
      isDualToast,
      usePersistentStyle,
      onClose
    } = this.props;
    const {
      value
    } = this.state;
    if (usePersistentStyle && toast.options.persistent) {
      return JSX_("div", {
        className: `${NAMESPACE} chat-persistent-toast`
      }, value || toast.render());
    }
    const closeButton = toast.close && JSX_(_ui_buttons3__ .$, {
      className: "chat-toast-close",
      icon: "sprite-fm-mono icon-close-component",
      onClick: onClose
    });
    const icon = toast.icon && JSX_("i", {
      className: toast.icon
    });
    if (isRootToaster) {
      return JSX_("div", {
        className: `${NAMESPACE} chat-toast-wrapper root-toast`
      }, JSX_("div", {
        className: "toast-value-wrapper"
      }, icon, JSX_("div", {
        className: "toast-value"
      }, value || toast.render())), closeButton);
    }
    return JSX_("div", {
      className: `${NAMESPACE} chat-toast-wrapper theme-light-forced ${isDualToast ? 'dual-toast' : ''}`
    }, JSX_("div", {
      className: "toast-value"
    }, value || toast.render()));
  }
}

 },

 8596
(_, EXP_, REQ_) {

REQ_.r(EXP_);
 REQ_.d(EXP_, {
   "default": () =>  EmptyConversationsPanel
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _ui_buttons_jsx1__ = REQ_(5155);
 const _link_jsx2__ = REQ_(4649);
 const _ui_utils_jsx3__ = REQ_(6411);




const Tile = ({
  title,
  desc,
  imgClass,
  buttonPrimary,
  buttonSecondary,
  onClickPrimary,
  onClickSecondary
}) => JSX_("div", {
  className: "conversations-empty-tile"
}, JSX_("span", {
  className: `chat-tile-img ${imgClass}`
}), JSX_("div", {
  className: "tile-content"
}, JSX_("h2", null, title), JSX_("div", null, desc), JSX_(_ui_buttons_jsx1__ .$, {
  className: "mega-button positive",
  label: buttonPrimary,
  onClick: onClickPrimary
}), buttonSecondary && JSX_(_ui_buttons_jsx1__ .$, {
  className: "mega-button action positive",
  icon: "sprite-fm-mono icon-link",
  label: buttonSecondary,
  onClick: onClickSecondary
})));
class EmptyConversationsPanel extends react0___default().Component {
  constructor(...args) {
    super(...args);
    this.domRef = react0___default().createRef();
    this.state = {
      linkData: ''
    };
  }
  componentDidMount() {
    (M.account && M.account.contactLink ? Promise.resolve(M.account.contactLink) : api.send('clc')).then(res => {
      let _this$domRef;
      if ((_this$domRef = this.domRef) != null && _this$domRef.current && typeof res === 'string') {
        const prefix = res.startsWith('C!') ? '' : 'C!';
        this.setState({
          linkData: `${getBaseUrl()}/${prefix}${res}`
        });
      }
    }).catch(dump);
  }
  render() {
    const {
      isMeeting,
      onNewChat,
      onStartMeeting,
      onScheduleMeeting
    } = this.props;
    const {
      linkData
    } = this.state;
    return JSX_("div", {
      ref: this.domRef,
      className: "conversations-empty"
    }, JSX_("div", {
      className: "conversations-empty-header"
    }, JSX_("h1", null, isMeeting ? l.meetings_empty_header : l.chat_empty_header), JSX_("h3", null, (0,_ui_utils_jsx3__ .lI)(isMeeting ? l.meetings_empty_subheader : l.chat_empty_subheader, '[A]', _link_jsx2__ .A, {
      onClick: () => {
        window.open('https://mega.io/chatandmeetings', '_blank', 'noopener,noreferrer');
        eventlog(this.props.isMeeting ? 500281 : 500280);
      }
    }))), JSX_("div", {
      className: "conversations-empty-content"
    }, JSX_(Tile, {
      title: isMeeting ? l.meetings_empty_calls_head : l.invite_friend_btn,
      desc: isMeeting ? l.meetings_empty_calls_desc : l.chat_empty_contact_desc,
      imgClass: isMeeting ? 'empty-meetings-call' : 'empty-chat-contacts',
      buttonPrimary: isMeeting ? l.new_meeting_start : l[71],
      buttonSecondary: !isMeeting && linkData && l.copy_contact_link_btn,
      onClickPrimary: () => {
        if (isMeeting) {
          onStartMeeting();
          eventlog(500275);
        } else {
          contactAddDialog();
          eventlog(500276);
        }
      },
      onClickSecondary: () => {
        copyToClipboard(linkData, `${l[371]}<span class="link-text">${linkData}</span>`);
        delay('chat-event-copy-contact-link', () => eventlog(500277));
      }
    }), JSX_(Tile, {
      title: isMeeting ? l.meetings_empty_schedule_head : l.chat_empty_add_chat_header,
      desc: isMeeting ? l.meetings_empty_schedule_desc : l.chat_empty_add_chat_desc,
      imgClass: isMeeting ? 'empty-meetings-schedule' : 'empty-chat-new',
      buttonPrimary: isMeeting ? l.schedule_meeting_start : l.add_chat,
      onClickPrimary: () => {
        if (isMeeting) {
          onScheduleMeeting();
          eventlog(500278);
        } else {
          onNewChat();
          eventlog(500279);
        }
      }
    })));
  }
}

 },

 8956
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   Q: () =>  InviteParticipantsPanel
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _meetings_utils_jsx1__ = REQ_(3901);
 const _ui_miniui_jsx2__ = REQ_(5009);
 const _ui_buttons_jsx3__ = REQ_(5155);
 const _ui_dropdowns_jsx4__ = REQ_(1510);





const NAMESPACE = 'invite-panel';
class InviteParticipantsPanel extends react0___default().Component {
  constructor(props) {
    super(props);
    this.domRef = react0___default().createRef();
    this.state = {
      link: '',
      copied: false
    };
    this.retrieveChatLink();
  }
  retrieveChatLink(cim) {
    const {
      chatRoom
    } = this.props;
    if (!chatRoom.topic) {
      return;
    }
    this.loading = chatRoom.updatePublicHandle(false, cim).always(() => {
      delete this.loading;
      if (this.domRef.current) {
        if (chatRoom.publicLink) {
          this.setState({
            link: `${getBaseUrl()}/${chatRoom.publicLink}`
          });
        } else {
          this.setState({
            link: false
          });
        }
      }
    });
  }
  getInviteBody(encode) {
    const {
      chatRoom
    } = this.props;
    const {
      link
    } = this.state;
    const {
      scheduledMeeting
    } = chatRoom;
    let body = l.invite_body_text;
    if (scheduledMeeting) {
      const {
        nextOccurrenceStart
      } = chatRoom.scheduledMeeting;
      body = l.invite_body_text_scheduled.replace('%4', time2date(nextOccurrenceStart / 1000, 20)).replace('%5', toLocaleTime(nextOccurrenceStart));
    }
    body = body.replace(/\[BR]/g, '\n').replace('%1', u_attr.name).replace('%2', chatRoom.getRoomTitle()).replace('%3', link);
    if (encode) {
      return typeof body.toWellFormatted === 'function' ? body.toWellFormatted() : body.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\uD800-\uDBFF]/g, '\uFFFD').replace(/[\uDC00-\uDFFF]/g, '\uFFFD');
    }
    return body;
  }
  render() {
    const {
      chatRoom,
      disableLinkToggle,
      onAddParticipants
    } = this.props;
    const {
      link,
      copied
    } = this.state;
    const inCall = (0,_meetings_utils_jsx1__ .Av)();
    if (this.loading) {
      return JSX_("div", {
        ref: this.domRef,
        className: `
                        ${NAMESPACE}
                        ${inCall ? 'theme-dark-forced' : ''}
                    `
      }, JSX_("header", null), JSX_("section", {
        className: "content"
      }, JSX_("div", {
        className: "content-block"
      })));
    }
    const canInvite = !!(chatRoom.iAmOperator() || chatRoom.options[MCO_FLAGS.OPEN_INVITE]) && onAddParticipants;
    const canToggleLink = !disableLinkToggle && chatRoom.iAmOperator() && (chatRoom.isMeeting || chatRoom.topic);
    const mailto = `mailto:?to=&subject=${l.invite_subject_text}&body=${this.getInviteBody(true)}`;
    const copyText = chatRoom.isMeeting ? l.copy_meeting_link : l[1394];
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    ${NAMESPACE}
                    ${inCall ? 'theme-dark-forced' : ''}
                `
    }, JSX_("header", null, JSX_("h3", null, l.invite_participants)), JSX_("section", {
      className: "content"
    }, canToggleLink && chatRoom.type !== 'group' && JSX_("div", {
      className: "content-block link-block"
    }, JSX_("div", {
      className: "text-wrapper"
    }, JSX_("span", {
      className: "link-label"
    }, l.invite_toggle_link_label), JSX_("div", {
      className: `link-description ${inCall ? '' : 'hidden'}`
    }, l.invite_toggle_link_desc)), JSX_(_ui_miniui_jsx2__ .A.ToggleCheckbox, {
      className: "meeting-link-toggle",
      checked: !!link,
      value: !!link,
      onToggle: () => {
        if (this.loading) {
          return;
        }
        if (link) {
          this.loading = chatRoom.updatePublicHandle(true).always(() => {
            delete this.loading;
            if (this.domRef.current) {
              this.setState({
                link: false
              });
            }
          });
        } else {
          this.retrieveChatLink(true);
        }
      }
    })), link && JSX_("div", {
      className: "content-block"
    }, JSX_(_ui_buttons_jsx3__ .$, {
      className: "flat-button",
      icon: `sprite-fm-mono icon-${copied ? 'check' : 'link-thin-outline'}`,
      label: copied ? l.copied : copyText,
      onClick: () => {
        if (copied) {
          return;
        }
        delay('chat-event-inv-copylink', () => eventlog(99964));
        copyToClipboard(link);
        this.setState({
          copied: true
        }, () => {
          tSleep(3).then(() => {
            if (this.domRef.current) {
              this.setState({
                copied: false
              });
            }
          });
        });
      }
    })), link && JSX_("div", {
      className: "content-block"
    }, JSX_(_ui_buttons_jsx3__ .$, {
      className: "flat-button",
      label: l.share_chat_link,
      icon: "sprite-fm-mono icon-share-02-thin-outline"
    }, JSX_(_ui_dropdowns_jsx4__ .ms, {
      className: `
                                    button-group-menu
                                    invite-dropdown
                                    ${inCall ? 'theme-dark-forced' : ''}
                                `,
      noArrow: true,
      positionAt: "left bottom",
      collision: "none",
      horizOffset: 79,
      vertOffset: 6,
      ref: r => {
        this.dropdownRef = r;
      },
      onBeforeActiveChange: e => {
        if (e) {
          delay('chat-event-inv-dropdown', () => eventlog(99965));
          $(document.body).trigger('closeAllDropdownsExcept', this.dropdownRef);
        }
      }
    }, JSX_(_ui_dropdowns_jsx4__ .tJ, {
      key: "send-invite",
      className: `
                                        ${inCall ? 'theme-dark-forced' : ''}
                                    `,
      icon: "sprite-fm-mono icon-mail-thin-outline",
      label: l.share_chat_link_invite,
      onClick: () => {
        delay('chat-event-inv-email', () => eventlog(99966));
        window.open(mailto, '_self', 'noopener,noreferrer');
      }
    }), JSX_(_ui_dropdowns_jsx4__ .tJ, {
      key: "copy-invite",
      className: `
                                        ${inCall ? 'theme-dark-forced' : ''}
                                    `,
      label: l.copy_chat_link_invite,
      icon: "sprite-fm-mono icon-square-copy",
      onClick: () => {
        delay('chat-event-inv-copy', () => eventlog(99967));
        copyToClipboard(this.getInviteBody(), l.invite_copied);
      }
    })))), canInvite && (link || canToggleLink) && chatRoom.type !== 'group' && JSX_("div", {
      className: "content-block invite-panel-divider"
    }, l.invite_dlg_divider), canInvite && JSX_("div", {
      className: "content-block add-participant-block"
    }, JSX_(_ui_buttons_jsx3__ .$, {
      className: "flat-button",
      icon: "sprite-fm-mono icon-user-square-thin-outline",
      label: l.add_participants,
      onClick: () => {
        delay('chat-event-inv-add-participant', () => eventlog(99968));
        onAddParticipants();
      }
    }))));
  }
}

 }

}]);