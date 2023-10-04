class MegaMobileDatePicker extends MegaMobileComponent {

    /**
     * Date picker constructor.
     *
     * @param {Object} options Instance options.
     * @param {Object} options.parentNode The node to append the date picker to.
     * @param {Object} [options.componentClassname] ...
     */
    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        const frontInput = document.createElement('input');
        frontInput.type = 'text';
        frontInput.disabled = true;
        frontInput.className = 'underlinedText no-title-top with-icon';
        frontInput.id = options.frontInputID || '';

        this.domNode.append(frontInput);

        this.frontInput = new mega.ui.MegaInputs(
            $(frontInput).data('icon', 'sprite-mobile-fm-mono icon-calendar-01-thin-outline')
        );

        this.frontInput.$wrapper.addClass('box-style mobile');

        // Set min (1 day in future) and max (Dec 31, 2060) dates
        var minDate = new Date();
        minDate.setDate(minDate.getDate() + 1);

        const targetNode = this.domNode;
        this.picker = document.createElement('input');
        this.picker.type = 'date';
        this.picker.min = MegaMobileDatePicker.tsToDate(minDate.getTime() / 1000);
        this.picker.max = "2060-12-31";

        if (is_ios) {
            this.domNode.classList.add('ios');
            this.picker.addEventListener('touchend', () => {
                this.picker.focus();
            });
        }

        if (options.defaultValue) {
            this.value = options.defaultValue;
        }

        targetNode.appendChild(this.picker);
    }

    /**
     * Show the native date picker.
     * This currently not supporting for FF
     *
     * @returns {undefined}
     */
    show() {

        if (typeof this.picker.showPicker === 'function' && !is_ios) {
            delay('show-picker', () => {
                this.picker.showPicker();
            }, 50);
        }
        // showPicker() can only be called on iOS from a user gesture, so
        // dispatching a touchend event is used as a workaround
        else if (is_ios) {
            const touchendEvent = new Event('touchend');
            this.picker.dispatchEvent(touchendEvent);
        }
        else {
            this.picker.focus();
        }
    }

    get min() {
        return this.picker.min;
    }

    set min(minDate) {
        this.picker.min = minDate;
    }

    get value() {
        return this.picker.ts;
    }

    set value(ts) {

        if (ts) {

            this.picker.ts = ts;
            this.picker.value = MegaMobileDatePicker.tsToDate(ts);
            this.frontInput.setValue(time2date(ts, 2));
        }
        else {
            this.picker.value = is_ios ? this.min : "";
            this.frontInput.setValue('');
        }
    }

    static tsToDate(ts) {

        const date = new Date(ts * 1000);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }
}
