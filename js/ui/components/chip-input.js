class MegaChip {
    constructor(editor, value, data) {
        const ce = (n, t, a) => mCreateElement(n, a, t);

        this.editor = editor;
        this.value = value;
        this.data = data || {};

        this.node = ce('span', null, {
            class: 'chip',
            contenteditable: false
        });

        // Optional avatar (requires a contact handle in the chip's data)
        if (editor.options.avatars && this.data.handle && typeof MegaAvatarComponent !== 'undefined') {
            MegaAvatarComponent.factory({
                parentNode: ce('div', this.node, {class: 'chip-avatar'}),
                userHandle: this.data.handle,
                size: 20
            });
        }

        this.label = ce('span', this.node, {
            class: 'chip-label'
        });

        // Label prefers the display name, falling back to the raw value (email)
        this.label.textContent = this.data.name || value;

        // Optionally expose the email as a tooltip
        if (editor.options.simpletip) {
            this.node.classList.add('simpletip');
            this.node.dataset.simpletip = value;
            this.node.dataset.simpletipposition = 'top';
            this.node.dataset.simpletipoffset = '4';
        }

        this.removeBtn = ce('button', this.node, {
            class: 'chip-remove',
            type: 'button'
        });

        ce('i', this.removeBtn, {
            class: `${mega.ui.sprites.mono} icon-dialog-close`
        });

        this.removeBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            this.editor.remove(this);
            this.editor.focus();
        });

        this.node.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            this.editor.focus(true);
            this.editor.select(this);
        });
    }

    select() {
        this.node.classList.add('chip-selected');
    }

    deselect() {
        this.node.classList.remove('chip-selected');
    }

    destroy() {
        this.node.remove();
    }
}

class MegaChipEditor extends MegaComponent {
    constructor(options) {
        super(options);

        this.options = options || {};

        const ce = (n, t, a) => mCreateElement(n, a, t);

        this.chips = [];
        this.selectedChip = null;
        this.chipZwsp = '\u200B'; // Zero width space

        this.domNode.classList.add('chip-input');

        this.field = ce('div', this.domNode, {
            class: 'chip-field'
        });

        this.editor = ce('div', this.field, {
            class: 'chip-editor',
            contenteditable: 'plaintext-only',
            spellcheck: false
        });

        this.textNode = document.createTextNode(this.chipZwsp);

        this.editor.appendChild(this.textNode);

        this.errorNode = ce('div', this.domNode, {
            class: 'chip-error'
        });

        this.placeholder = this.options.placeholder || '';

        this._bindEvents();

        this._updatePlaceholder();
    }

    set placeholder(text) {
        this.editor.dataset.placeholder = text || '';
    }

    get placeholder() {
        return this.editor.dataset.placeholder || '';
    }

    get pendingValue() {
        return this._pendingText().trim();
    }

    get anchorNode() {
        return this.editor;
    }

    _updatePlaceholder() {
        this.editor.classList.toggle('is-empty', !this.chips.length && !this._pendingText());
    }

    clearInput() {
        this._clearText();
        this._updatePlaceholder();
    }

    setError(message) {
        this.errorNode.textContent = message || '';
        this.domNode.classList.toggle('has-error', !!message);
    }

    clearError() {
        this.setError('');
    }

    /**
     * Commit the pending text as a chip, same as pressing Enter.
     * @param {Boolean} [placeCaret] Re-place the caret afterwards (skip on blur)
     * @returns {void}
     */
    commit(placeCaret = true) {
        this._commit(placeCaret);
    }

    _bindEvents() {
        this.editor.addEventListener('keydown', this._onKeyDown.bind(this));
        this.editor.addEventListener('beforeinput', this._onBeforeInput.bind(this));
        this.editor.addEventListener('input', this._onInput.bind(this));
        this.editor.addEventListener('mousedown', e => {

            const last = this.chips[this.chips.length - 1];

            if (e.target === this.editor && last && e.clientX < last.node.getBoundingClientRect().right) {
                e.preventDefault();
                this.focus();
            }
        });

        this.editor.addEventListener('click', () => {
            if (this.selectedChip) {
                this.clearSelection();
            }
        });

        this.editor.addEventListener('paste', this._onPaste.bind(this));
    }

    values() {
        return this.chips.map(c => c.value);
    }

    clear() {
        while (this.chips.length) {
            this.chips.pop().destroy();
        }

        this.selectedChip = null;

        this._clearText();
        this.clearError();
        this._updatePlaceholder();
    }

    /**
     * Add a chip with the given value and data.
     * @param {String} value Chip value.
     * @param {Object} [data] Chip display data.
     * @returns {Object|Boolean} The added or existing chip, or false if invalid
     */
    add(value, data) {
        value = value && value.replace(/\u200B/g, '').trim();

        if (!value) {
            return false;
        }

        const result = this.validate(value);

        if (result !== true) {
            this._invalidMessage = typeof result === 'string' ? result : null;
            this.trigger('invalid', value);
            return false;
        }

        // Return the existing chip for duplicates
        const existing = this.chips.find(c => c.value === value);

        if (existing) {
            return existing;
        }

        // Resolve display data when not provided
        if (!data && typeof this.options.resolve === 'function') {
            data = this.options.resolve(value);
        }

        const chip = new MegaChip(this, value, data);

        // Restore the anchor text node if it was removed
        this._ensureTextNode();

        this.editor.insertBefore(
            chip.node,
            this.textNode
        );

        this.chips.push(chip);
        this._updatePlaceholder();

        this.trigger('add', chip);
        this.trigger('change', this.values());

        return chip;
    }

    remove(chip) {
        let index = chip;

        if (typeof chip !== 'number') {
            index = this.chips.indexOf(chip);
        }

        if (index < 0) {
            return;
        }

        chip = this.chips[index];
        chip.destroy();

        this.chips.splice(index, 1);

        if (this.selectedChip === chip) {
            this.selectedChip = null;
        }

        this._updatePlaceholder();

        this.trigger('remove', chip);
        this.trigger('change', this.values());
    }

    setValues(values) {
        this.clear();

        for (const value of values) {
            this.add(value);
        }
    }

    select(chip) {
        if (this.selectedChip === chip) {
            return;
        }

        this.clearSelection();
        this.selectedChip = chip;

        chip.select();

        chip.node.scrollIntoView({
            inline: 'nearest',
            block: 'nearest'
        });
    }

    clearSelection() {
        if (!this.selectedChip) {
            return;
        }

        this.selectedChip.deselect();
        this.selectedChip = null;
    }

    focus(preventScroll) {
        this.editor.focus({preventScroll});
        this._placeCaretEnd(!preventScroll);
    }

    validate(value) {
        if (typeof this.options.validate === 'function') {
            return this.options.validate(value);
        }

        if (typeof isValidEmail === 'function') {
            return isValidEmail(value);
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    /**
     * Get the pending text outside of chips.
     * @returns {String} The current pending text.
     */
    _pendingText() {
        let text = '';

        for (const node of this.editor.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.data;
            }
        }

        return text.replace(/\u200B/g, '');
    }

    /**
     * Restore the anchor text node if it was removed (select-all + delete)
     * @returns {void}
     */
    _ensureTextNode() {
        if (this.textNode.parentNode !== this.editor) {
            this.textNode = document.createTextNode(this.chipZwsp);
            this.editor.appendChild(this.textNode);
        }
    }

    /**
     * Reset the text node after the last chip
     * @returns {void}
     */
    _clearText() {
        for (const node of [...this.editor.childNodes]) {
            if (node.nodeType === Node.TEXT_NODE) {
                node.remove();
            }
        }

        this.textNode = document.createTextNode(this.chipZwsp);

        this.editor.appendChild(this.textNode);
    }

    _placeCaretEnd(scroll = true) {
        const selection = window.getSelection();

        if (!selection) {
            return;
        }

        tryCatch(() => selection.collapse(
            this.textNode, this.textNode.length
        ))();

        if (scroll) {
            this._scrollCaretIntoView();
        }
    }

    _scrollCaretIntoView() {

        const selection = window.getSelection();

        if (!selection || !selection.rangeCount) {
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const crect = this.editor.getBoundingClientRect();

        if (rect.right > crect.right) {
            this.editor.scrollLeft += rect.right - crect.right + 20;
        }
        else if (rect.left < crect.left) {
            this.editor.scrollLeft -= crect.left - rect.left + 20;
        }
    }

    _commit(placeCaret = true) {
        const text = this._pendingText().trim();

        if (!text) {
            return;
        }

        const tokens = text.split(/[\n,;]+/);
        const invalid = [];
        let message = null;

        this._clearText();

        for (const token of tokens) {
            const value = token.trim();

            if (!value) {
                continue;
            }

            if (!this.add(value)) {
                invalid.push(value);

                if (this._invalidMessage) {
                    message = this._invalidMessage;
                }
            }
        }

        if (invalid.length) {
            this.textNode.data = this.chipZwsp + invalid.join(', ');
            this.setError(message || this.options.invalidMessage || l[141]);
        }
        else {
            this.clearError();
        }

        this._updatePlaceholder();

        // Skip re-placing the caret when committing on blur, so focus isn't grabbed back
        if (placeCaret) {
            this._placeCaretEnd();
        }

        this.trigger('commit', this.values());
    }

    _onPaste(e) {
        e.preventDefault();

        const text = (e.clipboardData || window.clipboardData).getData('text');
        const range = window.getSelection().getRangeAt(0);

        range.deleteContents();
        range.insertNode(document.createTextNode(text));

        this._commit();
    }

    /**
     * Aviod inserting a line break (<br>)
     * @param {InputEvent} e Event
     * @returns {void}
     */
    _onBeforeInput(e) {
        if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
            e.preventDefault();
        }
    }

    _onInput(e) {
        // Prevent the native input event from reaching MegaComponent
        if (e) {
            e.stopPropagation();
        }

        // Strip any stray <br> the browser may still insert
        for (const br of this.editor.querySelectorAll('br')) {
            br.remove();
        }

        const text = this.pendingValue;

        this.trigger('input', text);

        if (/[\n,;]/.test(text)) {
            this._commit();
        }
        else {
            this.clearError();
        }

        this._updatePlaceholder();
    }

    /**
     * Move the chip selection by "dir" (-1 left, +1 right)
     * With no current selection, a left step selects the last chip and vise versa
     * @param {Number} dir Direction, -1 or +1.
     * @returns {void}
     */
    _selectRelative(dir) {

        let index;

        if (this.selectedChip) {
            index = this.chips.indexOf(this.selectedChip) + dir;
        }
        else {
            index = dir < 0 ? this.chips.length - 1 : this.chips.length;
        }

        if (index < 0) {
            index = 0;
        }

        if (index > this.chips.length - 1) {
            this.clearSelection();
            this.focus();
            return;
        }

        this.select(this.chips[index]);
    }

    _removeSelected() {

        const index = this.chips.indexOf(this.selectedChip);

        this.remove(this.selectedChip);

        const next = Math.min(index, this.chips.length - 1);

        if (next >= 0) {
            this.select(this.chips[next]);
        }
        else {
            this.focus();
        }
    }

    _onKeyDown(e) {
        // Non-native event name to avoid MegaComponent.on double-binding the
        // native keydown (which would deliver the handler twice)
        // Listeners may call preventDefault() to claim key and skip chip's own logic
        this.trigger('keys', e);

        if (e.defaultPrevented) {
            return;
        }

        switch (e.key) {
            case ',':
            case ';':
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                this._commit();
                return;

            case ' ':
                // Space commits only a complete valid address
                if (this.validate(this.pendingValue) === true) {
                    e.preventDefault();
                    this._commit();
                }
                return;

            case 'Backspace':
                if (this.selectedChip) {
                    e.preventDefault();
                    this._removeSelected();
                    return;
                }

                if (!this._pendingText()) {
                    e.preventDefault();

                    if (this.chips.length) {
                        this.remove(this.chips.length - 1);
                        this.focus();
                    }
                }
                return;

            case 'ArrowLeft':
                if (!this._pendingText() && this.chips.length) {
                    e.preventDefault();
                    this._selectRelative(-1);
                }

                return;

            case 'ArrowRight':
                if (this.selectedChip) {
                    e.preventDefault();
                    this._selectRelative(1);
                }

                return;

            default:
                this._clearSelectionOnType(e);
        }
    }

    /**
     * Typing a printable character drops the chip selection
     * @param {KeyboardEvent} e Event
     * @returns {void}
     */
    _clearSelectionOnType(e) {
        if (this.selectedChip && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            this.clearSelection();
        }
    }
}
