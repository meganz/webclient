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
    getDefaultProps: function() {
        return {
            'textareaMaxHeight': 100
        };
    },
    getInitialState: function () {
        var initialText = this.props.initialText;

        return {
            typedMessage: initialText ? initialText : "",
            textareaHeight: 20
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
    triggerOnUpdate: function(forced) {
        var self = this;
        if (!self.props.onUpdate || !self.isMounted()) {
            return;
        }

        var shouldTriggerUpdate = forced ? forced : false;

        if (!shouldTriggerUpdate && self.state.typedMessage != self.lastTypedMessage) {
            self.lastTypedMessage = self.state.typedMessage;
            shouldTriggerUpdate = true;
        }

        if (!shouldTriggerUpdate) {
            var $container = $(ReactDOM.findDOMNode(this));
            var $textarea = $('.chat-textarea:visible textarea:visible', $container);
            if (!self._lastTextareaHeight || self._lastTextareaHeight !== $textarea.height()) {
                self._lastTextareaHeight = $textarea.height();
                shouldTriggerUpdate = true;
                if (self.props.onResized) {
                    self.props.onResized();
                }
            }
        }



        if (shouldTriggerUpdate) {
            if (self.onUpdateThrottling) {
                clearTimeout(self.onUpdateThrottling);
            }

            self.onUpdateThrottling = setTimeout(function() {
                self.props.onUpdate();
            }, 70);
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
        self.onConfirmTrigger(false);
        self.triggerOnUpdate();
    },
    onSaveClicked: function(e) {
        var self = this;

        if (self.props.disabled || !self.isMounted()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));
        var val = $.trim($('.chat-textarea:visible textarea:visible', $container).val());

        if (val.length > 0) {
            if (self.onConfirmTrigger(val) !== true) {
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
    onConfirmTrigger: function(val) {
        var result = this.props.onConfirm(val);

        if (val !== false && result !== false) {
            // scroll To 0 after sending a message.
            var $node = $(this.findDOMNode());
            var $textareaScrollBlock = $('.textarea-scroll', $node);
            var jsp = $textareaScrollBlock.data('jsp');
            jsp.scrollToY(0);
            $('.jspPane', $textareaScrollBlock).css({'top': 0});
        }

        if (this.props.persist) {
            var megaChat = this.props.chatRoom.megaChat;
            megaChat.plugins.persistedTypeArea.removePersistedTypedValue(
                this.props.chatRoom
            );
        }
        return result;
    },
    onTypeAreaKeyDown: function(e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = $.trim(element.value);

        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {

            if (self.onConfirmTrigger(val) !== true) {
                self.setState({typedMessage: ""});
            }
            self.stoppedTyping();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    },
    onTypeAreaKeyUp: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = $.trim(element.value);

        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            // send already handled in onKeyDown
            e.preventDefault();
            e.stopPropagation();
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


        self.updateScroll(true);
    },
    onTypeAreaBlur: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;

    },
    onTypeAreaChange: function (e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        var self = this;

        if (self.state.typedMessage !== e.target.value) {
            self.setState({typedMessage: e.target.value});
            self.forceUpdate();
        }

        if ($.trim(e.target.value).length > 0) {
            self.typing();
        }

        // persist typed values
        if (this.props.persist) {
            var megaChat = self.props.chatRoom.megaChat;
            if (megaChat.plugins.persistedTypeArea) {
                if ($.trim(e.target.value).length > 0) {
                    megaChat.plugins.persistedTypeArea.updatePersistedTypedValue(
                        self.props.chatRoom,
                        e.target.value
                    );
                }
                else {
                    megaChat.plugins.persistedTypeArea.removePersistedTypedValue(
                        self.props.chatRoom
                    );
                }
            }
        }

        self.updateScroll(true);

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
        // initTextareaScrolling($('.chat-textarea-scroll textarea', $container), 100, true);
        self._lastTextareaHeight = 20;
        if (self.props.initialText) {
            self.lastTypedMessage = this.props.initialText;
        }

        var $container = $(self.findDOMNode());
        $('.jScrollPaneContainer', $container).rebind('forceResize.typingArea' + self.getUniqueId(), function() {
            self.updateScroll(false);
        });
        self.triggerOnUpdate(true);

    },
    componentWillMount: function() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;
        var initialText = self.props.initialText;


        if (this.props.persist && megaChat.plugins.persistedTypeArea) {
            if (!initialText) {
                megaChat.plugins.persistedTypeArea.hasPersistedTypedValue(chatRoom).done(function () {
                    megaChat.plugins.persistedTypeArea.getPersistedTypedValue(chatRoom).done(function (r) {
                        if (self.state.typedMessage !== r) {
                            self.setState({
                                'typedMessage': r
                            });
                        }
                    });

                });
            }
            megaChat.plugins.persistedTypeArea.data.rebind(
                'onChange.typingArea' + self.getUniqueId(),
                function(e, k, v) {
                    if (chatRoom.roomJid.split("@")[0] == k) {
                        self.setState({'typedMessage': v ? v : ""});
                        self.triggerOnUpdate(true);
                    }
                }
            );
        }
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
        if (!this.scrollingInitialised) {
            this.initScrolling();
        }
        else {
            this.updateScroll();
        }
    },
    initScrolling: function() {
        var self = this;
        self.scrollingInitialised = true;
        var $node = $(self.findDOMNode());
        var $textarea = $('textarea:first', $node);
        var $textareaClone = $('message-preview', $node);
        self.textareaLineHeight = parseInt($textarea.css('line-height'));
        var $textareaScrollBlock = $('.textarea-scroll', $node);
        $textareaScrollBlock.jScrollPane({
            enableKeyboardNavigation: false,
            showArrows: true,
            arrowSize: 5,
            animateScroll: false,
            maintainPosition: false
        });
    },
    updateScroll: function(keyEvents) {
        var self = this;

        // DONT update if not visible...
        if (!self.isComponentEventuallyVisible()) {
            return;
        }


        var $node = $(self.findDOMNode());

        var $textarea = $('textarea:first', $node);
        var $textareaClone = $('.message-preview', $node);
        var textareaMaxHeight = self.props.textareaMaxHeight;
        var $textareaScrollBlock = $('.textarea-scroll', $node);

        var textareaContent = $textarea.val();
        var cursorPosition = self.getCursorPosition($textarea[0]);
        var $textareaCloneSpan;

        var viewLimitTop = 0;
        var scrPos = 0;
        var viewRatio = 0;



        // try NOT to update the DOM twice if nothing had changed (and this is NOT a resize event).
        if (
            keyEvents &&
            self.lastContent === textareaContent &&
            self.lastPosition === cursorPosition
        ) {
                return;
        }
        else {
            self.lastContent = textareaContent;
            self.lastPosition = cursorPosition;

            // Set textarea height according to  textarea clone height
            textareaContent = '@[!'+textareaContent.substr(0, cursorPosition) +
                '!]@' + textareaContent.substr(cursorPosition, textareaContent.length);

            // prevent self-xss
            textareaContent = htmlentities(textareaContent);

            // convert the cursor position/selection markers to html tags
            textareaContent = textareaContent.replace(/@\[!/g, '<span>');
            textareaContent = textareaContent.replace(/!\]@/g, '</span>');


            textareaContent = textareaContent.replace(/\n/g, '<br />');
            $textareaClone.html(textareaContent + '<br />');
        }

        var textareaCloneHeight = $textareaClone.height();
        $textarea.height(textareaCloneHeight);
        $textareaCloneSpan = $textareaClone.children('span');
        var textareaCloneSpanHeight = $textareaCloneSpan.height();

        var jsp = $textareaScrollBlock.data('jsp');

        if (!jsp) {
            $textareaScrollBlock.jScrollPane(
                {
                    enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: false
                }
            );
            var textareaWasFocused = $textarea.is(":focus");
            jsp = $textareaScrollBlock.data('jsp');

            if (textareaWasFocused) {
                moveCursortoToEnd($('textarea:first', $node)[0]);
            }
        }

        scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
        viewRatio = Math.round(textareaCloneSpanHeight + scrPos);

        $textareaScrollBlock.height(
            Math.min(
                textareaCloneHeight,
                textareaMaxHeight
            )
        );

        jsp.reinitialise();

        // Scrolling according cursor position
        if (textareaCloneHeight > textareaMaxHeight && textareaCloneSpanHeight < textareaMaxHeight) {
            jsp.scrollToY(0);
        }
        else if (viewRatio > self.textareaLineHeight || viewRatio < viewLimitTop) {
            if (
                textareaCloneSpanHeight > 0 &&
                jsp &&
                textareaCloneSpanHeight > textareaMaxHeight
            ) {
                jsp.scrollToY(textareaCloneSpanHeight - self.textareaLineHeight);
            } else if (jsp) {
                jsp.scrollToY(0);
            }
        }


        if (textareaCloneHeight < textareaMaxHeight) {
            $textareaScrollBlock.addClass('noscroll');
        }
        else {
            $textareaScrollBlock.removeClass('noscroll');
        }
        if (textareaCloneHeight !== self.state.textareaHeight) {
            self.setState({
                'textareaHeight': textareaCloneHeight
            });
            if (self.props.onResized) {
                self.props.onResized();
            }
        }
        else {
            self.handleWindowResize();
        }
    },
    getCursorPosition: function(el) {
        var pos = 0;
        if ('selectionStart' in el) {
            pos=el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var sel = document.selection.createRange(),
                selLength = document.selection.createRange().text.length;

            sel.moveStart('character', -el.value.length);
            pos = sel.text.length - selLength;
        }
        return pos;
    },
    onTypeAreaSelect: function(e) {
        this.updateScroll(true);
    },
    handleWindowResize: function (e, scrollToBottom) {
        var self = this;
        if(!self.isMounted()) {
            return;
        }
        if (!self.props.chatRoom.isCurrentlyActive) {
            return;
        }

        if (e) {
            self.updateScroll(false);
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

        var textareaStyles = {
            height: self.state.textareaHeight
        };

        var textareaScrollBlockStyles = {
            height: Math.min(
                    self.state.textareaHeight,
                    self.props.textareaMaxHeight
                )
        };

        return <div className={"typingarea-component" + self.props.className}>
            <div className={"chat-textarea " + self.props.className}>
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
                <div className="chat-textarea-scroll textarea-scroll jScrollPaneContainer"
                     style={textareaScrollBlockStyles}>
                    <textarea
                        className={messageTextAreaClasses}
                        placeholder={__(l[8009])}
                        onKeyUp={self.onTypeAreaKeyUp}
                        onKeyDown={self.onTypeAreaKeyDown}
                        onBlur={self.onTypeAreaBlur}
                        onChange={self.onTypeAreaChange}
                        onSelect={self.onTypeAreaSelect}
                        value={self.state.typedMessage}
                        ref="typearea"
                        style={textareaStyles}
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

