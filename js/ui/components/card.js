class MegaCard extends MegaButton {
    constructor(options) {
        super(options);

        this.addClass('card');

        if (options.value) {
            this.value = options.value;
        }
    }
}
