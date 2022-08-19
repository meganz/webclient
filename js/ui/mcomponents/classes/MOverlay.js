class MOverlay extends MComponent {
    constructor() {
        super(document.body);
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.setAttribute('id', 'm-overlay-' + Date.now());
        this.el.setAttribute('class', 'm-overlay');
    }
}
