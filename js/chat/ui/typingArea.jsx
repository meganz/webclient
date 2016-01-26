// libs
var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../ui/utils.jsx');
var RenderDebugger = require('./../../stores/mixins.js').RenderDebugger;
var MegaRenderMixin = require('./../../stores/mixins.js').MegaRenderMixin;
var ButtonsUI = require('./../../ui/buttons.jsx');
var ModalDialogsUI = require('./../../ui/modalDialogs.jsx');
var DropdownsUI = require('./../../ui/dropdowns.jsx');
var ContactsUI = require('./../ui/contacts.jsx');
var ConversationsUI = require('./../ui/conversations.jsx');

var TypingArea = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],

    getInitialState: function () {
        return {
            typedMessage: this.props.initialText ? this.props.initialText : ""
        };
    },
    onEmojiClicked: function (e, slug, meta) {
        var self = this;

        var txt = ":" + slug + ":";
        if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
            txt = slug;
        }

        self.setState({
            typedMessage: self.state.typedMessage + " " + txt + " "
        });

        setTimeout(function () {
            $('.chat-textarea:visible textarea').click();
            moveCursortoToEnd($('.chat-textarea:visible textarea')[0]);
        }, 100);
    },

    typing: function () {
        var self = this;
        var room = this.props.chatRoom;

        if (!self.typingTimeout) {
            if (room && room.state === ChatRoom.STATE.READY && !self.iAmTyping) {
                self.iAmTyping = true;
                room.megaChat.karere.sendIsComposing(room.roomJid);
            }
        }
        else if (self.typingTimeout) {
            clearTimeout(self.typingTimeout);
        }

        self.typingTimeout = setTimeout(function () {
            self.stoppedTyping();
        }, 2000);
    },
    stoppedTyping: function () {
        var self = this;
        var room = this.props.chatRoom;

        if (self.typingTimeout) {
            clearTimeout(self.typingTimeout);
            self.typingTimeout = null;
        }

        if (room && room.state === ChatRoom.STATE.READY && self.iAmTyping === true) {
            room.megaChat.karere.sendComposingPaused(room.roomJid);
            self.iAmTyping = false;
        }
    },
    onTypeAreaKeyDown: function (e) {
        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = element.value;

        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            if ($.trim(val).length > 0) {
                if (self.props.onConfirm(val) !== true) {
                    self.setState({typedMessage: ""});
                }
                self.stoppedTyping();
                e.preventDefault();
                return;
            }
            else {
                self.stoppedTyping();
                e.preventDefault();
            }
        }
        else if (key === 13) {
            if ($.trim(val).length === 0) {
                self.stoppedTyping();
                e.preventDefault();
            }
        }

        this.setState({typedMessage: e.target.value});
    },
    onTypeAreaBlur: function (e) {
        var self = this;

        self.stoppedTyping();
    },
    onTypeAreaChange: function (e) {
        var self = this;

        self.setState({typedMessage: e.target.value});

        if ($.trim(e.target.value).length) {
            self.typing();
        }

        if (self.props.onUpdate) {
            self.props.onUpdate();
        }
    },
    focusTypeArea: function () {
        var $container = $(ReactDOM.findDOMNode(this));
        if ($('.chat-textarea:visible textarea:visible', $container).length > 0) {
            if (!$('.chat-textarea:visible textarea:visible', $container).is(":focus")) {
                moveCursortoToEnd($('.chat-textarea:visible textarea', $container)[0]);
            }
        }
    },
    componentDidMount: function() {
        var self = this;
        window.addEventListener('resize', self.handleWindowResize);
    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;

        window.removeEventListener('resize', self.handleWindowResize);
    },
    componentDidUpdate: function () {
        var self = this;
        var room = this.props.chatRoom;

        if (room.isCurrentlyActive) {
            this.focusTypeArea();
        }

        self.handleWindowResize();
    },
    handleWindowResize: function (e, scrollToBottom) {
        var $container = $(ReactDOM.findDOMNode(this));
        var self = this;

        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        // typeArea resizing
        var $textarea = $('textarea.messages-textarea', $container);
        var textareaHeight = $textarea.outerHeight();
        var $hiddenDiv = $('.message-preview', $container);
        var $pane = $('.chat-textarea-scroll', $container);
        var $jsp;

        if (textareaHeight != $hiddenDiv.height()) {
            $textarea.css('height', $hiddenDiv.height());

            if ($hiddenDiv.outerHeight() > 100) {
                $pane.jScrollPane({
                    enableKeyboardNavigation: false,
                    showArrows: true,
                    arrowSize: 5
                });
                $jsp = $pane.data('jsp');
                $textarea.blur();
                $textarea.focus();
                $jsp.scrollByY(0);
            }
            else {
                $jsp = $pane.data('jsp');
                if ($jsp) {
                    $jsp.destroy();
                    $textarea.blur();
                    $textarea.focus();
                }
            }

            if (self.props.onUpdate) {
                self.props.onUpdate();
            }
        }

    },
    isActive: function () {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    },
    render: function () {
        var self = this;

        var room = this.props.chatRoom;

        var messageTextAreaClasses = "messages-textarea";

        // typing area
        var typedMessage = htmlentities(self.state.typedMessage).replace(/\n/g, '<br/>');
        typedMessage = typedMessage + '<br/>';

        return <div className={"typingarea-component" + self.props.className}>
            <div className="chat-textarea">
                <i className={self.props.iconClass ? self.props.iconClass : "small-icon conversations"}></i>
                <div className="chat-textarea-buttons">
                    <ButtonsUI.Button
                        className="popup-button"
                        icon="smiling-face"
                    >
                        <DropdownsUI.DropdownEmojiSelector
                            className="popup emoji-one"
                            vertOffset={12}
                            onClick={self.onEmojiClicked}
                        />
                    </ButtonsUI.Button>

                    {self.props.children}
                </div>
                <div className="chat-textarea-scroll">
                    <div className="textarea-wrapper">
                        <textarea
                            className={messageTextAreaClasses}
                            placeholder={__(l[8009])}
                            onKeyDown={self.onTypeAreaKeyDown}
                            onBlur={self.onTypeAreaBlur}
                            onChange={self.onTypeAreaChange}
                            value={self.state.typedMessage}
                            ref="typearea"
                            disabled={room.pubCu25519KeyIsMissing === true ? true : false}
                            readOnly={room.pubCu25519KeyIsMissing === true ? true : false}
                        ></textarea>
                        <div className="message-preview" dangerouslySetInnerHTML={{
                                                __html: typedMessage.replace(/\s/g, "&nbsp;")
                                            }}></div>
                    </div>
                </div>
            </div>
        </div>
    }
});


module.exports = {
    TypingArea
};

