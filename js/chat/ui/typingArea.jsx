import React from 'react';
import { Emoji } from '../../ui/utils.jsx';
import { MegaRenderMixin, SoonFcWrap } from '../mixins.js';
import { DropdownEmojiSelector } from '../../ui/emojiDropdown.jsx';
import { Button } from '../../ui/buttons.jsx';
import { EmojiAutocomplete } from './emojiAutocomplete.jsx';
import GifPanel from './gifPanel/gifPanel.jsx';
import { PerfectScrollbar } from './../../ui/perfectScrollbar.jsx';

export class TypingArea extends MegaRenderMixin {
    typingAreaRef = React.createRef();

    state = {
        emojiSearchQuery: false,
        typedMessage: '',
        textareaHeight: 20,
        gifPanelActive: false
    };

    constructor(props) {
        super(props);
        const {chatRoom} = props;
        this.logger = d && MegaLogger.getLogger("TypingArea", {}, chatRoom && chatRoom.logger || megaChat.logger);

        // TODO: deprecate `bind` in favor of arrow functions
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

        const textarea = $('.messages-textarea', this.typingAreaRef.current)[0];
        const cursorPosition = this.getCursorPosition(textarea);

        this.setState({
            typedMessage:
                this.state.typedMessage.slice(0, cursorPosition) +
                slug +
                this.state.typedMessage.slice(cursorPosition)
        }, () => {
            // `Sample |message` -> `Sample :smile:| message`
            textarea.selectionEnd = cursorPosition + slug.length;

            this.onTypeAreaChange(e, this.state.typedMessage);
        });
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

        var self = this;
        var now = Date.now();

        delay(this.getReactId(), () => self.iAmTyping && self.stoppedTyping(), 4e3);

        if (!self.iAmTyping || now - self.lastTypingStamp > 4e3) {
            self.iAmTyping = true;
            self.lastTypingStamp = now;
            self.props.chatRoom.trigger('typing');
        }
    }

    triggerOnUpdate(forced) {
        var self = this;
        if (!self.props.onUpdate || !self.isMounted()) {
            return;
        }

        var shouldTriggerUpdate = forced ? forced : false;

        if (!shouldTriggerUpdate && self.state.typedMessage !== self.lastTypedMessage) {
            self.lastTypedMessage = self.state.typedMessage;
            shouldTriggerUpdate = true;
        }

        if (!shouldTriggerUpdate) {
            var $textarea = $('.chat-textarea:visible textarea:visible', self.typingAreaRef.current);
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
        var self = this;
        self.setState({typedMessage: ""});
        if (self.props.chatRoom && self.iAmTyping) {
            self.stoppedTyping();
        }
        self.onConfirmTrigger(false);
        self.triggerOnUpdate();
    }

    onSaveClicked() {
        var self = this;

        if (self.props.disabled || !self.isMounted()) {
            return;
        }

        var val = $.trim($('.chat-textarea:visible textarea:visible', this.typingAreaRef.current).val());

        if (self.onConfirmTrigger(val) !== true) {
            self.setState({typedMessage: ""});
        }
        if (self.props.chatRoom && self.iAmTyping) {
            self.stoppedTyping();
        }
        self.triggerOnUpdate();
    }

    onConfirmTrigger(val) {
        const { onConfirm, persist, chatRoom } = this.props;
        const result = onConfirm(val);

        if (val !== false && result !== false) {
            // scroll To 0 after sending a message.
            $('.textarea-scroll', this.typingAreaRef.current).scrollTop(0);
        }

        if (persist) {
            const {persistedTypeArea} = chatRoom.megaChat.plugins;
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

            if (self.prefillMode) {
                return; // halt next checks if its in prefill mode.
            }
            var char = String.fromCharCode(key);

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
                /[\w:-]/.test(char)
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

    onTypeAreaChange(e, value) {
        if (this.props.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        var self = this;
        value = String(value || e.target.value || '').replace(/^\s+/, '');

        if (self.state.typedMessage !== value) {
            self.setState({typedMessage: value});
            self.forceUpdate();
        }

        if (value.length) {
            self.typing();
        }
        else {
            self.stoppedTyping();
        }

        // persist typed values
        if (this.props.persist) {
            const {chatRoom} = this.props;
            const {megaChat} = chatRoom;
            const {persistedTypeArea} = megaChat.plugins;

            if (persistedTypeArea) {
                if (d > 2) {
                    this.logger.debug('%s persisted-typed value...', value.length ? 'Updating' : 'Removing');
                }

                if (value.length) {
                    persistedTypeArea.updatePersistedTypedValue(chatRoom, value);
                }
                else {
                    persistedTypeArea.removePersistedTypedValue(chatRoom);
                }
            }
        }

        self.updateScroll();

        // if (self.props.onUpdate) {
        //     self.props.onUpdate();
        // }
    }

    focusTypeArea() {
        if (this.props.disabled) {
            return;
        }

        if (
            $('.chat-textarea:visible textarea:visible', this.typingAreaRef.current).length > 0 &&
            !$('.chat-textarea:visible textarea:visible:first', this.typingAreaRef.current).is(":focus")
        ) {
            moveCursortoToEnd($('.chat-textarea:visible:first textarea', this.typingAreaRef.current)[0]);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this._lastTextareaHeight = 20;
        this.lastTypedMessage = this.props.initialText || this.lastTypedMessage;

        chatGlobalEventManager.addEventListener('resize', `typingArea${this.getUniqueId()}`, () =>
            this.handleWindowResize()
        );

        this.triggerOnUpdate(true);
        this.updateScroll();
    }

    componentWillMount() {
        const {chatRoom, initialText, persist} = this.props;
        const {megaChat, roomId} = chatRoom;
        const {persistedTypeArea} = megaChat.plugins;

        if (persist && persistedTypeArea) {

            if (!initialText) {

                persistedTypeArea.getPersistedTypedValue(chatRoom)
                    .then((res) => {

                        if (res && this.isMounted() && !this.state.typedMessage) {

                            this.setState({'typedMessage': res});
                        }
                    })
                    .catch((ex) => {
                        if (this.logger && ex !== undefined) {
                            this.logger.warn(`Failed to retrieve persistedTypeArea for ${roomId}: ${ex}`, [ex]);
                        }
                    });
            }

            persistedTypeArea.addChangeListener(this.getUniqueId(), (e, k, v) => {
                if (roomId === k) {
                    this.setState({'typedMessage': v || ''});
                    this.triggerOnUpdate(true);
                }
            });
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        self.triggerOnUpdate();
        // window.removeEventListener('resize', self.handleWindowResize);
        if (megaChat.plugins.persistedTypeArea) {
            megaChat.plugins.persistedTypeArea.removeChangeListener(self.getUniqueId());
        }
        chatGlobalEventManager.removeEventListener('resize', 'typingArea' + self.getUniqueId());
    }

    componentDidUpdate() {

        if (this.isComponentEventuallyVisible() && $(
                document.querySelector('textarea:focus,select:focus,input:focus')
            ).filter(":visible").length === 0) {
            // no other element is focused...
            this.focusTypeArea();
        }

        this.updateScroll();

        if (this.onUpdateCursorPosition) {
            var el = $('.chat-textarea:visible:first textarea:visible', this.typingAreaRef.current)[0];
            el.selectionStart = el.selectionEnd = this.onUpdateCursorPosition;
            this.onUpdateCursorPosition = false;
        }
    }

    /**
     * getTextareaMaxHeight
     * @description Returns the max height allowed for the textarea element based on the current viewport size.
     * @returns {number} the textarea max height
     */

    getTextareaMaxHeight = () => {
        const { containerRef } = this.props;
        if (containerRef && containerRef.current) {
            return this.isMounted() ? containerRef.current.offsetHeight * 0.4 : 100;
        }
        return 100;
    };

    updateScroll() {

        // DONT update if not visible...
        if (!this.isComponentEventuallyVisible()
            || !this.$node && !this.typingAreaRef && !this.typingAreaRef.current) {

            return;
        }

        var $node = this.$node = this.$node || this.typingAreaRef.current;
        const $textarea = this.$textarea = this.$textarea || $('textarea:first', $node);
        const $scrollBlock = this.$scrollBlock = this.$scrollBlock || $textarea.closest('.textarea-scroll');
        const $preview = $('.message-preview', $scrollBlock)
            .safeHTML(`${$textarea.val().replace(/\n/g, '<br />')} <br>`);
        const textareaHeight = $preview.height();

        $scrollBlock.height(
            Math.min(
                textareaHeight,
                this.getTextareaMaxHeight()
            )
        );

        if (textareaHeight !== this._lastTextareaHeight) {

            this._lastTextareaHeight = textareaHeight;

            this.setState({
                'textareaHeight': textareaHeight
            });
            if (this.props.onResized) {
                this.props.onResized();
            }
            $textarea.height(textareaHeight);
        }

        this.textareaScroll.reinitialise();
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

    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    @SoonFcWrap(54, true)
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
        var self = this;

        var room = this.props.chatRoom;

        var messageTextAreaClasses = "messages-textarea";


        var buttons = null;

        if (self.props.showButtons === true) {
            const className = 'mega-button right';
            buttons = [
                <Button
                    key="save"
                    className={`${className} positive`}
                    label={l[776] /* `Save` */}
                    onClick={self.onSaveClicked.bind(self)}
                />,
                <Button
                    key="cancel"
                    className={className}
                    label={l[1718] /* `Cancel` */}
                    onClick={self.onCancelClicked.bind(self)}
                />
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
        var roomTitle = room.getRoomTitle(false, true);
        // If room title contains quote, use translation with translated quote
        if (roomTitle[0] === '"' && roomTitle[roomTitle.length - 1] === '"') {
            placeholder = l[18763];
            roomTitle = roomTitle.slice(1, -1);
        }
        placeholder = placeholder.replace("%s", roomTitle);

        var disabledTextarea = room.pubCu25519KeyIsMissing === true || this.props.disabled ? true : false;

        return (
            <div
                ref={this.typingAreaRef}
                className={`
                    typingarea-component
                    ${this.props.className}
                `}>
                {this.state.gifPanelActive &&
                    <GifPanel
                        chatRoom={this.props.chatRoom}
                        onToggle={() =>
                            this.setState({ gifPanelActive: false })
                        }
                    />
                }
                <div
                    className={`
                        chat-textarea
                        ${this.props.className}
                    `}>
                    {emojiAutocomplete}
                    {self.props.children}
                    {self.props.editing ? null : (
                        <Button
                            className={`
                                popup-button
                                gif-button
                                ${this.state.gifPanelActive ? 'active' : ''}
                            `}
                            icon="small-icon gif"
                            disabled={this.props.disabled}
                            onClick={() =>
                                this.setState(state => ({ gifPanelActive: !state.gifPanelActive }))
                            }
                        />
                    )}
                    <Button
                        className="popup-button emoji-button"
                        icon="sprite-fm-theme icon-emoji"
                        iconHovered="sprite-fm-theme icon-emoji-active"
                        disabled={this.props.disabled}>
                        <DropdownEmojiSelector
                            className="popup emoji"
                            vertOffset={17}
                            onClick={this.onEmojiClicked}
                        />
                    </Button>
                    <hr />
                    <PerfectScrollbar
                        chatRoom={self.props.chatRoom}
                        className="chat-textarea-scroll textarea-scroll"
                        options={{ 'suppressScrollX': true }}
                        style={textareaScrollBlockStyles}
                        ref={(ref) => {
                            self.textareaScroll = ref;
                        }}>
                        <div className="messages-textarea-placeholder">
                            {self.state.typedMessage ? null : <Emoji>{placeholder}</Emoji>}
                        </div>
                        <textarea
                            className={`
                                ${messageTextAreaClasses}
                                ${disabledTextarea ? 'disabled' : ''}
                            `}
                            onKeyUp={this.onTypeAreaKeyUp}
                            onKeyDown={this.onTypeAreaKeyDown}
                            onBlur={this.onTypeAreaBlur}
                            onChange={this.onTypeAreaChange}
                            onCopyCapture={this.onCopyCapture}
                            onPasteCapture={this.onPasteCapture}
                            onCutCapture={this.onCutCapture}
                            value={self.state.typedMessage}
                            style={textareaStyles}
                            disabled={disabledTextarea}
                            readOnly={disabledTextarea}
                        />
                        <div className="message-preview" />
                    </PerfectScrollbar>
                </div>
                {buttons}
            </div>
        );
    }
}
