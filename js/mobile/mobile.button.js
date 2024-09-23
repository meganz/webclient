class MegaMobileButton extends MegaMobileTappable {

    constructor(options) {

        options.nodeType = 'button';
        super(options);

        this.domNode.classList.add('button');

    }

    get disabled() {
        return super.disabled;
    }

    set disabled(value) {
        // Call the disabled setter in MegaMobileTappable
        super.disabled = value;

        // Apply to the semantic element
        this.domNode.disabled = value;
    }
}
