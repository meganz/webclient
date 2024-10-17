class MegaMobileRadioGroup extends MegaMobileComponentGroup {

    constructor(options) {

        super();

        this.value = '';

        for (const radio of options.radios) {
            const radioButton = new MegaMobileRadioButton({
                parentNode: radio.parentNode,
                componentClassname: `mega-radio-button ${radio.className || ''}`,
                radioName: options.name,
                radioAlign: options.align,
                radioValue: radio.value,
                labelTitle: radio.label,
                subLabelTitle: radio.subLabel,
                checked: radio.checked,
                disabled: radio.disabled,
                disabledReason: radio.disabledReason,
                group: this
            });

            this.addChild(radio.value, radioButton);

            if (radioButton.checked) {

                this.value = radioButton.value;
                radioButton.toggleDom();
            }

            radioButton.on('tap.radioChanged', function(...args) {

                if (this.group.value === this.value || this.disabled) {
                    return;
                }

                this.group.value = this.value;

                if (typeof options.onChange === 'function') {
                    options.onChange.call(this, ...args);
                }
            });
        }
    }

    applyDomChange() {

        for (const radioButton of Object.values(this.children)) {
            radioButton.toggleDom();
        }
    }

    setValue(value) {

        if (value !== this.value && this.children[value]) {
            this.children[value].trigger('tap');
        }
    }
}
