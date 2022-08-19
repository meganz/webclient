class MComponent {
    /**
     * @param {String|HtmlElement} parent Either DOM element or a query selector
     * @param {Boolean} [appendToParent=true] Append to parent right away or skip
     */
    constructor(parent, appendToParent = true) {
        this.disposeEvents = {
            click: null
        };

        this.buildElement();

        if (typeof parent === 'string') {
            parent = document.querySelector(parent);
        }

        if (parent) {
            if (appendToParent) {
                parent.append(this.el);
            }

            this.mParent = parent;
        }

        this.el.mComponent = this;
    }

    /**
     * Attaching a click event to the directly related element (this.el)
     * @param {Function} handler Handler for the element click
     * @param {*} options options as per AddEventListener guidelines
     */
    click(handler, options) {
        this.disposeClick();
        this.disposeEvents.click = MComponent.listen(this.el, 'click', handler, options);
    }

    disposeClick() {
        if (typeof this.disposeEvents.click === 'function') {
            this.disposeEvents.click();
        }
    }

    /**
     * Detaching this.el
     * This removes any reference, so it is better to use it before complete removal or resetting with buildElement()
     */
    detach() {
        const parent = this.el.parentNode;

        if (parent) {
            parent.removeChild(this.el);
        }

        // Disposing all events attached via MComponent.listen()
        this.disposeClick();
    }
}

MComponent.listen = (node, event, handler, options) => {
    'use strict';

    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
};
