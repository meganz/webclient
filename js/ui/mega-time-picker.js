/**
 *
 * Renders an hh:mm text input with an arrow-driven hours/minutes popover.
 * Instance state (hours, minutes, isSet) lives on `this`.
 *
 * Public instance API:
 *   - `value`           getter, returns {h, m} or null when unset
 *   - `setTime(h, m)`   programmatically set value; fires 'change'
 *   - `clear()`         reset to unset; fires 'change'
 *   - `closePopover()`  hide the hours/minutes popover
 *   - inherited `on/off/trigger` from MegaComponent (events: 'change', 'destroy')
 */
class MegaTimePicker extends MegaComponent {

    /**
     * @param {Object} options
     * @param {HTMLElement} options.parentNode Container the picker is appended to.
     * @param {string} [options.componentClassname] Extra class(es) added to the host node.
     * @param {string} [options.frontInputID] DOM id for the visible hh:mm input.
     */
    constructor(options) {

        super({
            parentNode: options.parentNode,
            componentClassname: options.componentClassname
                ? `time-picker-host ${options.componentClassname}`
                : 'time-picker-host'
        });

        if (!this.domNode) {
            return;
        }

        this._hours = 0;
        this._mins = 0;
        this._isSet = false;

        this._frontInput = new MegaInputComponent({
            parentNode: this.domNode,
            className: 'underlinedText no-title-top with-icon',
            placeholder: '--:--',
            icon: `${mega.ui.sprites.mono} icon-clock-thin-outline`,
            wrapperClasses: 'box-style mobile'
        });
        const input = this._frontInput.input;
        input.id = options.frontInputID || '';
        input.setAttribute('maxlength', '5');
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        this._input = input;

        const popover = mCreateElement('div', {class: 'time-picker-popover hidden'}, this.domNode);
        MegaTimePicker.col(popover, 'hours', l.hour);
        MegaTimePicker.col(popover, 'mins', l.minutes_plain);
        mCreateElement('div', {class: 'time-sep'}, popover).textContent = ':';
        this._popover = popover;
        this._timeValues = this._popover.querySelectorAll('.time-value');

        // event binding
        this.on('mousedown', e => !(e.target.closest('.time-picker-popover') &&
            !e.target.closest('.time-value')));
        this.on('click', (e) => {
            const arrow = e.target.closest('.time-arrow');
            if (arrow) {
                this._bump(arrow.dataset.unit, parseInt(arrow.dataset.dir, 10));
                return false;
            }
            if (!e.target.closest('.time-picker-popover')) {
                this._input.focus();
                this._popover.classList.remove('hidden');
            }
            return false;
        });
        this.on('focusin', (e) => {
            if (e.target.classList.contains('time-value')) {
                e.target.select();
            }
        });
        this.on('input', (e) => {
            const el = e.target;
            if (el.classList.contains('time-value')) {
                const {unit} = el.dataset;
                const raw = el.value.replace(/\D/g, '').slice(0, 2);
                el.value = raw;
                this._setUnit(unit, raw === '' ? 0 : parseInt(raw, 10) % MegaTimePicker.maxFor(unit));
                this._renderInput();
            }
            else if (el === this._input) {
                this._syncFromInput();
            }
        });
        this.on('focusout', (e) => {
            const el = e.target;
            if (el.classList.contains('time-value')) {
                el.value = datepickerUtils.pad2(this._getUnit(el.dataset.unit));
            }
            else if (el === this._input) {
                // Normalize on blur. _renderInput() writes the canonical hh:mm when
                // set, or blanks the field when unset - which also discards any
                // unparseable text the user typed (e.g. "my text", which
                // _syncFromInput strips to empty), so invalid values can't linger.
                // It fires change either way, keeping the cross-validation handler in
                // sync whether the user typed-and-cleared or never typed at all.
                this._renderInput();
            }

            const next = e.originalEvent && e.originalEvent.relatedTarget;
            if (!this.domNode.contains(next)) {
                this.closePopover();
            }
        });
        this.on('keydown', (e) => {
            const el = e.target;
            if (!el.classList.contains('time-value')) {
                return;
            }
            const key = e.originalEvent && e.originalEvent.key;
            if (key === 'ArrowUp') {
                this._bump(el.dataset.unit, 1);
            }
            else if (key === 'ArrowDown') {
                this._bump(el.dataset.unit, -1);
            }
            else if (key === 'Enter') {
                el.blur();
            }
            else {
                return;
            }
            return false;
        });
        // event binding - end

        this._renderPopover();
    }

    /**
     * @returns {?{h:number, m:number}} Current time, or null when unset.
     */
    get value() {
        return this._isSet ? {h: this._hours, m: this._mins} : null;
    }

    /**
     * Programmatically set the picker value and fire 'change'.
     * @param {number} h Hours (any integer; wrapped to 0-23).
     * @param {number} m Minutes (any integer; wrapped to 0-59).
     * @returns {void}
     */
    setTime(h, m) {
        this._hours = ((h % 24) + 24) % 24;
        this._mins = ((m % 60) + 60) % 60;
        this._isSet = true;
        this._renderPopover();
        this._renderInput();
    }

    /**
     * Reset to the unset state (value getter returns null) and fire 'change'.
     * @returns {void}
     */
    clear() {
        this._resetUnset();
        this._renderInput();
    }

    /**
     * Hide the hours/minutes popover; no-op if already hidden or already destroyed.
     * @returns {void}
     */
    closePopover() {
        if (this._popover) {
            this._popover.classList.add('hidden');
        }
    }

    /**
     * Destroy the front-input sub-component, then delegate to MegaComponent.destroy()
     * which removes the host node and detaches every listener bound via `this.on()`.
     * @returns {void}
     */
    destroy() {
        if (this._frontInput) {
            this._frontInput.destroy();
            this._frontInput = null;
        }
        this._input = null;
        this._popover = null;
        this._timeValues = null;
        super.destroy();
    }

    /**
     * @private
     * Write a value into hours or minutes and mark the picker as set.
     * @param {('hours'|'mins')} unit
     * @param {number} n Caller-supplied value (already range-checked).
     * @returns {void}
     */
    _setUnit(unit, n) {
        if (unit === 'hours') {
            this._hours = n;
        }
        else {
            this._mins = n;
        }
        this._isSet = true;
    }

    /**
     * @private
     * Gets the value
     * @param {('hours'|'mins')} unit
     * @returns {number} Current value of the requested field.
     */
    _getUnit(unit) {
        return unit === 'hours' ? this._hours : this._mins;
    }

    /**
     * @private
     * Reset to the unset state and blank every popover cell. Shared by clear() and
     * the empty-input path of _syncFromInput(); neither renders the front input, so
     * callers decide whether to follow with _renderInput().
     * @returns {void}
     */
    _resetUnset() {
        this._hours = 0;
        this._mins = 0;
        this._isSet = false;
        this._timeValues.forEach((el) => {
            el.value = '';
        });
    }

    /**
     * @private
     * Sync popover input cells from internal state.
     * @returns {void}
     */
    _renderPopover() {
        this._timeValues.forEach(el => {
            el.value = this._isSet
                ? datepickerUtils.pad2(this._getUnit(el.dataset.unit))
                : '';
            if (el === document.activeElement) {
                el.setSelectionRange(el.value.length, el.value.length);
            }
        });
    }

    /**
     * @private
     * Render the front input from internal state and fire 'change'.
     * @returns {void}
     */
    _renderInput() {
        const {pad2} = datepickerUtils;
        this._input.value = this._isSet ? `${pad2(this._hours)}:${pad2(this._mins)}` : '';
        this.trigger('change');
    }

    /**
     * @private
     * Sync internal state from whatever the user has typed into the front input,
     * then refresh the popover cells. Reads the live value so it is safe to run
     * more than once per keystroke.
     * @returns {void}
     */
    _syncFromInput() {
        const raw = this._input.value.replace(/[^\d:]/g, '');
        if (raw === '') {
            this._resetUnset();
            return;
        }
        const [h, m] = raw.split(':');
        const parsedH = parseInt(h, 10);
        const parsedM = parseInt(m, 10);
        if (Number.isFinite(parsedH) && parsedH >= 0) {
            this._hours = parsedH % 24;
            this._isSet = true;
        }
        if (Number.isFinite(parsedM) && parsedM >= 0) {
            this._mins = parsedM % 60;
            this._isSet = true;
        }
        this._renderPopover();
    }

    /**
     * @private
     * Adjust hours or minutes by one step, wrapping at the field's boundary.
     * @param {('hours'|'mins')} unit
     * @param {(1|-1)} dir Step direction.
     * @returns {void}
     */
    _bump(unit, dir) {
        const max = MegaTimePicker.maxFor(unit);
        this._setUnit(unit, (this._getUnit(unit) + dir + max) % max);
        this._renderPopover();
        this._renderInput();
    }

    /**
     * @param {('hours'|'mins')} unit
     * @returns {(24|60)} Exclusive upper bound used for modulo-wrap in `_bump`.
     */
    static maxFor(unit) {
        return unit === 'hours' ? 24 : 60;
    }

    /**
     * Render an arrow icon used to bump a field up or down and append it to `parent`.
     * @param {HTMLElement} parent Node the arrow is appended to.
     * @param {('hours'|'mins')} unit
     * @param {(1|-1)} dir Bound to the click handler via the `data-dir` attribute.
     * @param {string} dirClass Visual-direction CSS class ('up'|'down').
     * @param {string} icon Sprite icon suffix (e.g. 'up'|'down').
     * @returns {HTMLElement} The created arrow node.
     */
    static arrow(parent, unit, dir, dirClass, icon) {
        return mCreateElement('i', {
            class: `sprite-fm-mono icon-chevron-${icon}-thin-outline time-arrow ${dirClass}`,
            'data-unit': unit,
            'data-dir': `${dir}`
        }, parent);
    }

    /**
     * Render the four popover cells for one unit (hours or minutes) - label,
     * up arrow, editable numeric cell, down arrow - and append them to `parent`.
     * The cells are direct children of `.time-picker-popover`; the grid in CSS
     * positions them by `data-unit` (column) and class (row).
     * @param {HTMLElement} parent The `.time-picker-popover` node.
     * @param {('hours'|'mins')} unit
     * @param {string} label Localized label text.
     * @returns {void}
     */
    static col(parent, unit, label) {
        mCreateElement('div', {class: 'time-label', 'data-unit': unit}, parent).textContent = label;
        MegaTimePicker.arrow(parent, unit, 1, 'up', 'up');
        mCreateElement('input', {
            type: 'text',
            class: 'time-value',
            'data-unit': unit,
            maxlength: '2',
            inputmode: 'numeric',
            placeholder: '00',
            'aria-label': label
        }, parent);
        MegaTimePicker.arrow(parent, unit, -1, 'down', 'down');
    }
}
