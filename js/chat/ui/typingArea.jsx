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
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;

        var txt = ":" + slug + ":";
        if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
            txt = slug;
        }

        self.setState({
            typedMessage: self.state.typedMessage + " " + txt + " "
        });

        var $container = $(ReactDOM.findDOMNode(this));
        var $textarea = $('.chat-textarea:visible textarea:visible', $container);

        setTimeout(function () {
            $textarea.click();
            moveCursortoToEnd($textarea[0]);
        }, 100);
    },

    typing: function () {
        if (this.props.disabled) {
            return;
        }

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
    triggerOnUpdate: function() {
        if (!this.props.onUpdate || !this.isMounted()) {
            return;
        }

        var shouldTriggerUpdate = false;
        if (this.state.typedMessage != this.lastTypedMessage) {
            this.lastTypedMessage = this.state.typedMessage;
            shouldTriggerUpdate = true;
        }
        if (!shouldTriggerUpdate) {
            var $container = $(ReactDOM.findDOMNode(this));
            var $textarea = $('.chat-textarea:visible textarea:visible', $container);
            if (!this._lastTextareaHeight || this._lastTextareaHeight !== $textarea.height()) {
                this._lastTextareaHeight = $textarea.height();
                shouldTriggerUpdate = true;
            }
        }

        if (shouldTriggerUpdate) {
            this.props.onUpdate();
        }
    },
    stoppedTyping: function () {
        if (this.props.disabled) {
            return;
        }

        var self = this;
        var room = this.props.chatRoom;

        if (self.typingTimeout) {
            clearTimeout(self.typingTimeout);
            self.typingTimeout = null;
        }

        if (self.iAmTyping) {
            // only trigger event if needed.
            self.triggerOnUpdate();
        }
        if (room && room.state === ChatRoom.STATE.READY && self.iAmTyping === true) {
            room.megaChat.karere.sendComposingPaused(room.roomJid);
            self.iAmTyping = false;
        }
    },
    onCancelClicked: function(e) {
        var self = this;
        self.setState({typedMessage: ""});
        self.props.onConfirm(false);
        self.triggerOnUpdate();
    },
    onSaveClicked: function(e) {
        var self = this;

        if (self.props.disabled || !self.isMounted()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));
        var val = $('.chat-textarea:visible textarea:visible', $container).val();

        if ($.trim(val).length > 0) {
            if (self.props.onConfirm(val) !== true) {
                self.setState({typedMessage: ""});
            }
            self.triggerOnUpdate();
            return;
        }
        else {
            // if the val is empty, then trigger a cancel edit message...
            self.onCancelClicked(e);
        }

    },
    onTypeAreaKeyDown: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = element.value;

        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {

            if (self.props.onConfirm(val) !== true) {
                self.setState({typedMessage: ""});
            }
            self.stoppedTyping();
            e.preventDefault();
            return;
        }
        else if (key === 13) {
            if ($.trim(val).length === 0) {
                self.stoppedTyping();
                e.preventDefault();
            }
        }
        else if (key === 38) {
            /* arrow up! */
            if ($.trim(val).length === 0) {
                if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
                    self.stoppedTyping();
                    e.preventDefault();
                    return;
                }
            }
        }
        else if (key === 27) {
            /* ESC */
            if (self.props.showButtons === true) {
                self.stoppedTyping();
                e.preventDefault();
                self.onCancelClicked(e);
                return;
            }
        }
    },
    onTypeAreaBlur: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;

        self.stoppedTyping();
    },
    onTypeAreaChange: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;

        self.setState({typedMessage: e.target.value});

        if ($.trim(e.target.value).length) {
            self.typing();
        }

        // if (self.props.onUpdate) {
        //     self.props.onUpdate();
        // }
    },
    focusTypeArea: function () {
        if (this.props.disabled) {
            return;
        }

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

        var $container = $(ReactDOM.findDOMNode(this));
        initTextareaScrolling($('.chat-textarea-scroll textarea', $container), 100, true);
        $('.chat-textarea-scroll textarea', $container).rebind('autoresized.typingArea', function() {
            self.handleWindowResize();
        });
        self.triggerOnUpdate();

    },
    componentWillUnmount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        self.triggerOnUpdate();
        window.removeEventListener('resize', self.handleWindowResize);
    },
    componentDidUpdate: function () {
        var self = this;
        var room = this.props.chatRoom;

        if (room.isCurrentlyActive && self.isMounted()) {
            if ($('textarea:focus,select:focus,input:focus').size() === 0) {
                // no other element is focused...
                this.focusTypeArea();
            }

            self.handleWindowResize();
        }
    },
    handleWindowResize: function (e, scrollToBottom) {
        var self = this;
        if(!self.isMounted()) {
            return;
        }
        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        self.triggerOnUpdate();

    },
    isActive: function () {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    },
    render: function () {
        var self = this;

        var room = this.props.chatRoom;

        var messageTextAreaClasses = "messages-textarea";


        var buttons = null;

        if (self.props.showButtons === true) {
            buttons = [
                <ButtonsUI.Button
                    key="save"
                    className="default-white-button right"
                    icon=""
                    onClick={self.onSaveClicked}
                    label={__(l[776])} />,

                <ButtonsUI.Button
                    key="cancel"
                    className="default-white-button right"
                    icon=""
                    onClick={self.onCancelClicked}
                    label={__(l[1718])} />
            ];
        }
        return <div className={"typingarea-component" + self.props.className}>
            <div className="chat-textarea">
                <i className={self.props.iconClass ? self.props.iconClass : "small-icon conversations"}></i>
                <div className="chat-textarea-buttons">
                    <ButtonsUI.Button
                        className="popup-button"
                        icon="smiling-face"
                        disabled={this.props.disabled}
                    >
                        <DropdownsUI.DropdownEmojiSelector
                            className="popup emoji-one"
                            vertOffset={12}
                            onClick={self.onEmojiClicked}
                        />
                    </ButtonsUI.Button>

                    {self.props.children}
                </div>
                <div className="chat-textarea-scroll textarea-scroll">
                        <textarea
                            className={messageTextAreaClasses}
                            placeholder={__(l[8009])}
                            onKeyDown={self.onTypeAreaKeyDown}
                            onBlur={self.onTypeAreaBlur}
                            onChange={self.onTypeAreaChange}
                            value={self.state.typedMessage}
                            ref="typearea"
                            disabled={room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false}
                            readOnly={room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false}
                        ></textarea>
                        <div className="message-preview"></div>
                </div>
            </div>
            {buttons}
        </div>
    }
});


module.exports = {
    TypingArea
};

