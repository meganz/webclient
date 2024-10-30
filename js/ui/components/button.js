class MegaButton extends MegaInteractable {

    constructor(options) {

        options.nodeType = 'button';
        super(options);

        this.domNode.classList.add('button');

        if (options.typeAttr) {
            this.type = options.typeAttr;
        }
    }

    get disabled() {
        return super.disabled;
    }

    set disabled(value) {
        // Call the disabled setter in MegaInteractable
        super.disabled = value;

        // Apply to the semantic element
        this.domNode.disabled = value;
    }

    get type() {
        return this.domNode.type;
    }

    set type(value) {
        this.domNode.type = value;
    }
}
