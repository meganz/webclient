class MegaRangeSlider extends MegaComponent {
    constructor(options) {
        options.componentClassname = 'mega-slider';
        super(options);
        this.min = options.min || 8;
        this.max = options.max || 64;
        this.step = options.step || 1;
        this.defaultValue = options.defaultValue || 16;
        this.showNumberInput = options.showNumberInput || true;
        this.maxLengthInput = options.maxLengthInput || 2;

        this.container = document.createElement('div');
        this.container.className = 'slider-container';
        this.domNode.appendChild(this.container);

        // Create the slider
        this.rangeInput = document.createElement('input');
        this.rangeInput.type = 'range';
        this.rangeInput.className = 'range-input';
        this.rangeInput.min = this.min;
        this.rangeInput.max = this.max;
        this.rangeInput.step = this.step;
        this.rangeInput.value = this.defaultValue;

        const _setValStyle = val => {
            this.rangeInput.style.setProperty('--val', `${(val - this.min) / (this.max - this.min) * 100}%`);
        };

        _setValStyle(this.defaultValue);

        // Bind the input to the range input
        this.rangeInput.addEventListener('input', () => {
            const value = parseInt(this.rangeInput.value, 10);
            _setValStyle(value);
            if (this.showNumberInput) {
                this.numberInput.setValue(value);
            }
            this.trigger('update');
        });

        if (options.event) {
            this.rangeInput.addEventListener('change', () => {
                eventlog(options.event);
            });
        }

        // Append elements to the container
        this.container.appendChild(this.rangeInput);

        // Create the number input
        if (this.showNumberInput) {
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.className = 'number-input form-element pmText';
            numberInput.min = this.min;
            numberInput.max = this.max;
            numberInput.step = this.step;
            numberInput.value = this.defaultValue;
            numberInput.maxLength = this.maxLengthInput;
            numberInput.minLength = 1;
            numberInput.pattern = '[0-9]*';

            this.domNode.appendChild(numberInput);
            this.numberInput = new mega.ui.MegaInputs($(numberInput));
            this.numberInput.$wrapper.addClass('number');

            // Bind the input to the range input
            numberInput.addEventListener('input', () => {
                const value = parseInt(numberInput.value, 10);
                if (isNaN(value) || value < this.min) {
                    _setValStyle(this.min);
                    this.rangeInput.value = this.min;
                    this.trigger('update');
                }
                else if (value > this.max) {
                    _setValStyle(this.max);
                    this.rangeInput.value = this.max;
                    this.numberInput.setValue(this.max);
                    this.trigger('update');
                }
                else {
                    _setValStyle(value);
                    this.rangeInput.value = value;
                    this.trigger('update');
                }
            });

            numberInput.addEventListener('change', () => {
                let value = numberInput.value | 0;
                value = Math.max(this.min, Math.min(this.max, value));
                this.numberInput.setValue(value);
                if (parseInt(this.rangeInput.value, 10) !== value) {
                    _setValStyle(value);
                    this.rangeInput.value = value;
                    this.trigger('update');
                }
            });
        }
    }
}
