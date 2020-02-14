// libs
var React = require("react");
var ReactDOM = require("react-dom");
import {MegaRenderMixin} from './../../stores/mixins.js';
import { DropdownEmojiSelector } from './../../ui/emojiDropdown.jsx';
import { Button } from './../../ui/buttons.jsx';
import { EmojiAutocomplete } from './emojiAutocomplete.jsx';
import utils from './../../ui/utils.jsx';

export class TypingArea extends MegaRenderMixin {
    static validEmojiCharacters = new RegExp("[\w\:\-\_0-9]", "gi");
    static defaultProps = {
        'textareaMaxHeight': "40%"
    };
    constructor(props) {
        super(props);

        var initialText = this.props.initialText;

        this.state ={
            emojiSearchQuery: false,
            typedMessage: initialText ? initialText : "",
            textareaHeight: 20
        };
    }
    onEmojiClicked(e, slug, meta) {
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
    }

    stoppedTyping() {
        if (this.props.disabled) {
            return;
        }
        var self = this;
        var room = this.props.chatRoom;

        self.iAmTyping = false;

        delete self.lastTypingStamp;

        room.trigger('stoppedTyping');
    }
    typing() {
        if (this.props.disabled) {
            return;
        }

        var self = this;
        var room = this.props.chatRoom;

        if (self.stoppedTypingTimeout) {
            clearTimeout(self.stoppedTypingTimeout);
        }

        self.stoppedTypingTimeout = setTimeout(function() {
            if (room && self.iAmTyping) {
                self.stoppedTyping();
            }
        }, 4000);

        if (
            (room && !self.iAmTyping) ||
            (room && self.iAmTyping && (unixtime() - self.lastTypingStamp) >= 4)
        ) {
            self.iAmTyping = true;
            self.lastTypingStamp = unixtime();
            room.trigger('typing');
        }
    }
    triggerOnUpdate(forced) {
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
    }
    onCancelClicked(e) {
        var self = this;
        self.setState({typedMessage: ""});
        if (self.props.chatRoom && self.iAmTyping) {
            self.stoppedTyping();
        }
        self.onConfirmTrigger(false);
        self.triggerOnUpdate();
    }
    onSaveClicked(e) {
        var self = this;

        if (self.props.disabled || !self.isMounted()) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(self));
        var val = $.trim($('.chat-textarea:visible textarea:visible', $container).val());

        if (self.onConfirmTrigger(val) !== true) {
            self.setState({typedMessage: ""});
        }
        if (self.props.chatRoom && self.iAmTyping) {
            self.stoppedTyping();
        }
        self.triggerOnUpdate();
    }
    onConfirmTrigger(val) {
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
            if (megaChat.plugins.persistedTypeArea) {
                megaChat.plugins.persistedTypeArea.removePersistedTypedValue(
                    this.props.chatRoom
                );
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

        var self = this;
        var key = e.keyCode || e.which;
        var element = e.target;
        var val = $.trim(element.value);

        if (self.state.emojiSearchQuery) {
            return;
        }
        if (key === 13 && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            if (e.isPropagationStopped() || e.isDefaultPrevented()) {
                return;
            }

            if (self.onConfirmTrigger(val) !== true) {
                self.setState({typedMessage: ""});
                $(document).trigger('closeDropdowns');
            }
            e.preventDefault();
            e.stopPropagation();
            if (self.props.chatRoom && self.iAmTyping) {
                self.stoppedTyping();
            }
            return;
        }
    }
    onTypeAreaKeyUp(e) {
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
            if (self.state.emojiSearchQuery) {
                return;
            }

            // Alt+Enter
            if (e.altKey) {
                var content = element.value;
                var cursorPos = self.getCursorPosition(element);
                content = content.substring(0, cursorPos) + "\n" + content.substring(
                        cursorPos,
                        content.length
                    );

                self.setState({typedMessage: content});
                self.onUpdateCursorPosition = cursorPos + 1;
                e.preventDefault();
            }
            else if ($.trim(val).length === 0) {
                e.preventDefault();
            }
        }
        else if (key === 38) {
            if (self.state.emojiSearchQuery) {
                return;
            }

            /* arrow up! */
            if ($.trim(val).length === 0) {
                if (self.props.onUpEditPressed && self.props.onUpEditPressed() === true) {
                    e.preventDefault();
                    return;
                }
            }
        }
        else if (key === 27) {
            if (self.state.emojiSearchQuery) {
                return;
            }

            /* ESC */
            if (self.props.showButtons === true) {
                e.preventDefault();
                self.onCancelClicked(e);
                return;
            }
        }
        else {
            if (self.prefillMode && (
                    key === 8 /* backspace */ ||
                    key === 32 /* space */ ||
                    key === 186 /* : */ ||
                    key === 13 /* backspace */
                )
            ) {
                // cancel prefill mode.
                self.prefillMode = false;
            }

            var currentContent = element.value;
            var currentCursorPos = self.getCursorPosition(element) - 1;
            if (self.prefillMode && (
                    currentCursorPos > self.state.emojiEndPos ||
                    currentCursorPos < self.state.emojiStartPos
                )
            ) {
                // cancel prefill mode, user typed some character, out of the current emoji position.
                self.prefillMode = false;

                self.setState({
                    'emojiSearchQuery': false,
                    'emojiStartPos': false,
                    'emojiEndPos': false
                });
                return;
            }

            var char = String.fromCharCode(key);
            if (self.prefillMode) {
                return; // halt next checks if its in prefill mode.
            }

            if (
                key === 16 /* shift */ ||
                key === 17 /* ctrl */ ||
                key === 18 /* option */ ||
                key === 91 /* cmd*/ ||
                key === 8 /* backspace */ ||
                key === 37 /* left */ ||
                key === 39 /* right */ ||
                key === 40 /* down */ ||
                key === 38 /* up */ ||
                key === 9 /* tab */ ||
                char.match(self.validEmojiCharacters)
            ) {


                var parsedResult = mega.utils.emojiCodeParser(currentContent, currentCursorPos);

                self.setState({
                    'emojiSearchQuery': parsedResult[0],
                    'emojiStartPos': parsedResult[1],
                    'emojiEndPos': parsedResult[2]
                });

                return;
            }
            if (self.state.emojiSearchQuery) {
                self.setState({'emojiSearchQuery': false});
            }
        }

        self.updateScroll(true);
    }
    onTypeAreaBlur(e) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        var self = this;

        if (self.state.emojiSearchQuery) {
            // delay is required, otherwise the onBlur -> setState may cause halt of child onclick handlers, in case
            // of a onClick in the emoji autocomplete.
            setTimeout(function() {
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
    onTypeAreaChange(e) {
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
        else {
            self.stoppedTyping();
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
    }
    focusTypeArea() {
        if (this.props.disabled) {
            return;
        }

        var $container = $(ReactDOM.findDOMNode(this));
        if ($('.chat-textarea:visible textarea:visible', $container).length > 0) {
            if (!$('.chat-textarea:visible textarea:visible:first', $container).is(":focus")) {
                moveCursortoToEnd($('.chat-textarea:visible:first textarea', $container)[0]);
            }
        }
    }
    componentDidMount() {
        super.componentDidMount();
        var self = this;
        $(window).rebind('resize.typingArea' + self.getUniqueId(), self.handleWindowResize.bind(this));

        var $container = $(ReactDOM.findDOMNode(this));
        // initTextareaScrolling($('.chat-textarea-scroll textarea', $container), 100, true);
        self._lastTextareaHeight = 20;
        if (self.props.initialText) {
            self.lastTypedMessage = this.props.initialText;
        }

        $('.jScrollPaneContainer', $container).rebind('forceResize.typingArea' + self.getUniqueId(), function() {
            self.updateScroll(false);
        });
        self.triggerOnUpdate(true);
        if ($container.is(":visible")) {
            self.updateScroll(false);
        }

    }
    componentWillMount() {
        var self = this;
        var chatRoom = self.props.chatRoom;
        var megaChat = chatRoom.megaChat;
        var initialText = self.props.initialText;


        if (this.props.persist && megaChat.plugins.persistedTypeArea) {
            if (!initialText) {
                megaChat.plugins.persistedTypeArea.getPersistedTypedValue(chatRoom)
                    .done(function (r) {
                        if (typeof r != 'undefined') {
                            if (!self.state.typedMessage && self.state.typedMessage !== r) {
                                self.setState({
                                    'typedMessage': r
                                });
                            }
                        }
                    })
                    .fail(function(e) {
                        if (d) {
                            console.warn(
                                "Failed to retrieve persistedTypeArea value for",
                                chatRoom,
                                "with error:",
                                e
                            );
                        }
                    });
            }
            $(megaChat.plugins.persistedTypeArea.data).rebind(
                'onChange.typingArea' + self.getUniqueId(),
                function(e, k, v) {
                    if (chatRoom.roomId == k) {
                        self.setState({'typedMessage': v ? v : ""});
                        self.triggerOnUpdate(true);
                    }
                }
            );
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var chatRoom = self.props.chatRoom;
        self.triggerOnUpdate();
        // window.removeEventListener('resize', self.handleWindowResize);
        $(window).unbind('resize.typingArea' + self.getUniqueId());
    }
    componentDidUpdate() {
        var self = this;
        var room = this.props.chatRoom;

        if (room.isCurrentlyActive && self.isMounted()) {
            if ($(
                document.querySelector('textarea:focus,select:focus,input:focus')
            ).filter(":visible").length === 0) {
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
        if (self.onUpdateCursorPosition) {
            var $container = $(ReactDOM.findDOMNode(this));
            var el = $('.chat-textarea:visible:first textarea:visible', $container)[0];
            el.selectionStart = el.selectionEnd = self.onUpdateCursorPosition;
            self.onUpdateCursorPosition = false;
        }
    }
    initScrolling() {
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
    }
    getTextareaMaxHeight() {
        var self = this;
        var textareaMaxHeight = self.props.textareaMaxHeight;

        if (String(textareaMaxHeight).indexOf("%") > -1) {
            textareaMaxHeight = (parseInt(textareaMaxHeight.replace("%", "")) || 0) /100;
            if (textareaMaxHeight === 0) {
                textareaMaxHeight = 100;
            }
            else {
                var $messagesContainer = $('.messages-block:visible');
                textareaMaxHeight = $messagesContainer.height() * textareaMaxHeight;
            }
        }
        return textareaMaxHeight;
    }
    @utils.SoonFcWrap(10)
    updateScroll(keyEvents) {
        var self = this;

        // DONT update if not visible...
        if (!this.props.chatRoom.isCurrentlyActive) {
            return;
        }
        if (!this.isMounted()) {
            return;
        }

        var $node = self.$node = self.$node || $(self.findDOMNode());

        var $textarea = self.$textarea = self.$textarea || $('textarea:first', $node);
        var $textareaClone = self.$textareaClone = self.$textareaClone || $('.message-preview', $node);
        var textareaMaxHeight = self.getTextareaMaxHeight();

        var $textareaScrollBlock = self.$textareaScrollBlock = self.$textareaScrollBlock ||
            $('.textarea-scroll', $node);


        var textareaContent = $textarea.val();
        var cursorPosition = self.getCursorPosition($textarea[0]);
        var $textareaCloneSpan;

        var viewLimitTop = 0;
        var scrPos = 0;
        var viewRatio = 0;

        // try NOT to update the DOM twice if nothing had changed (and this is NOT a resize event).
        if (
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
            var textareaIsFocused = $textarea.is(":focus");
            jsp = $textareaScrollBlock.data('jsp');

            if (!textareaIsFocused) {
                moveCursortoToEnd($textarea[0]);
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

        var textareaWasFocusedBeforeReinit = $textarea.is(":focus");
        var selectionPos = false;
        if (textareaWasFocusedBeforeReinit) {
            selectionPos = [$textarea[0].selectionStart, $textarea[0].selectionEnd];
        }

        jsp.reinitialise();

        // requery to get the new <textarea/> that JSP had just replaced in the DOM.
        $textarea = $('textarea:first', $node);

        if (textareaWasFocusedBeforeReinit) {
            // restore selection after JSP.reinit!
            $textarea[0].selectionStart = selectionPos[0];
            $textarea[0].selectionEnd = selectionPos[1];
        }


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

                // because jScrollPane may think that there is no scrollbar, it would NOT scroll back to 0?!
                if (scrPos < 0) {
                    $textareaScrollBlock.find('.jspPane').css('top', 0);
                }
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
    }
    getCursorPosition(el) {
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
    }
    onTypeAreaSelect(e) {
        this.updateScroll(true);
    }
    handleWindowResize(e, scrollToBottom) {
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

    }
    isActive() {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    }
    resetPrefillMode() {
        this.prefillMode = false;
    }
    onCopyCapture(e) {
        this.resetPrefillMode();
    }
    onCutCapture(e) {
        this.resetPrefillMode();
    }
    onPasteCapture(e) {
        this.resetPrefillMode();
    }
    render() {
        var self = this;

        var room = this.props.chatRoom;

        var messageTextAreaClasses = "messages-textarea";


        var buttons = null;

        if (self.props.showButtons === true) {
            buttons = [
                <Button
                    key="save"
                    className="default-white-button right"
                    icon=""
                    onClick={self.onSaveClicked.bind(self)}
                    label={__(l[776])} />,

                <Button
                    key="cancel"
                    className="default-white-button right"
                    icon=""
                    onClick={self.onCancelClicked.bind(self)}
                    label={__(l[1718])} />
            ];
        }

        var textareaStyles = {
            height: self.state.textareaHeight
        };

        var textareaScrollBlockStyles = {};
        var newHeight = Math.min(self.state.textareaHeight, self.getTextareaMaxHeight());

        if (newHeight > 0) {
            textareaScrollBlockStyles['height'] = newHeight;
        }


        var emojiAutocomplete = null;
        if (self.state.emojiSearchQuery) {

            emojiAutocomplete = <EmojiAutocomplete
                emojiSearchQuery={self.state.emojiSearchQuery}
                emojiStartPos={self.state.emojiStartPos}
                emojiEndPos={self.state.emojiEndPos}
                typedMessage={self.state.typedMessage}
                onPrefill={function(e, emojiAlias) {
                    if (
                        $.isNumeric(self.state.emojiStartPos) &&
                        $.isNumeric(self.state.emojiEndPos)
                    ) {
                        var msg = self.state.typedMessage;
                        var pre = msg.substr(0, self.state.emojiStartPos);
                        var post = msg.substr(self.state.emojiEndPos + 1, msg.length);
                        var startPos = self.state.emojiStartPos;
                        var fwdPos = startPos + emojiAlias.length;
                        var endPos = fwdPos;

                        self.onUpdateCursorPosition = fwdPos;

                        self.prefillMode = true;

                        // console.error("prefilling", [pre, emojiAlias, post], self.state.emojiStartPos,
                        // self.state.emojiStartPos + emojiAlias.length, (
                        //     post ? (post.substr(0, 1) !== " " ? 1 : 0) : 1
                        // ));

                        // in case of concat'ed emojis like:
                        // :smile::smile:

                        if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
                            emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
                            endPos -= 1;
                        }
                        else {
                            post = post ? (post.substr(0, 1) !== " " ? " " + post : post) : " ";
                            self.onUpdateCursorPosition++;
                        }

                        self.setState({
                            'typedMessage': pre + emojiAlias + post,
                            'emojiEndPos': endPos
                        });
                    }
                }}
                onSelect={function (e, emojiAlias, forceSend) {
                    if (
                        $.isNumeric(self.state.emojiStartPos) &&
                        $.isNumeric(self.state.emojiEndPos)
                    ) {
                        var msg = self.state.typedMessage;
                        var pre = msg.substr(0, self.state.emojiStartPos);
                        var post = msg.substr(self.state.emojiEndPos + 1, msg.length);

                        // in case of concat'ed emojis like:
                        // :smile::smile:

                        if (post.substr(0, 2) == "::" && emojiAlias.substr(-1) == ":") {
                            emojiAlias = emojiAlias.substr(0, emojiAlias.length - 1);
                        }
                        else {
                            post = post ? (post.substr(0, 1) !== " " ? " " + post : post) : " ";
                        }

                        var val = pre + emojiAlias + post;

                        self.prefillMode = false;

                        self.setState({
                            'typedMessage': val,
                            'emojiSearchQuery': false,
                            'emojiStartPos': false,
                            'emojiEndPos': false
                        });
                        if (forceSend) {
                            if (self.onConfirmTrigger($.trim(val)) !== true) {
                                self.setState({typedMessage: ""});
                            }
                        }
                    }
                }}
                onCancel={function () {
                    self.prefillMode = false;
                    self.setState({
                        'emojiSearchQuery': false,
                        'emojiStartPos': false,
                        'emojiEndPos': false
                    });
                }}
            />;
        }
        var placeholder = l[18669];
        placeholder = placeholder.replace("%s", room.getRoomTitle(false, true));

        var disabledTextarea = room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false;

        return <div className={"typingarea-component" + self.props.className + (disabledTextarea ? " disabled" : "")}>
            <div className={"chat-textarea " + self.props.className}>
                {emojiAutocomplete}
                {self.props.children}
                <Button
                    className="popup-button"
                    icon="smiling-face"
                    disabled={this.props.disabled}
                >
                    <DropdownEmojiSelector
                        className="popup emoji"
                        vertOffset={17}
                        onClick={self.onEmojiClicked.bind(self)}
                    />
                </Button>
                <hr />
                <div className="chat-textarea-scroll textarea-scroll jScrollPaneContainer"
                     style={textareaScrollBlockStyles}>
                    <textarea
                        className={messageTextAreaClasses}
                        placeholder={placeholder}
                        onKeyUp={self.onTypeAreaKeyUp.bind(self)}
                        onKeyDown={self.onTypeAreaKeyDown.bind(self)}
                        onBlur={self.onTypeAreaBlur.bind(self)}
                        onChange={self.onTypeAreaChange.bind(self)}
                        onSelect={self.onTypeAreaSelect.bind(self)}
                        value={self.state.typedMessage}
                        ref="typearea"
                        style={textareaStyles}
                        disabled={disabledTextarea ? true : false}
                        readOnly={disabledTextarea ? true : false}
                        onCopyCapture={self.onCopyCapture.bind(self)}
                        onPasteCapture={self.onPasteCapture.bind(self)}
                        onCutCapture={self.onCutCapture.bind(self)}
                    ></textarea>
                    <div className="message-preview"></div>
                </div>
            </div>
            {buttons}
        </div>
    }
};
