class MComponent {
    /**
     * @param {String|HtmlElement} parent Either DOM element or a query selector
     * @param {Boolean} [appendToParent=true] Append to parent right away or skip
     */
    constructor(parent, appendToParent = true) {
        this.disposeEvents = {};

        this.buildElement();

        if (typeof parent === 'string') {
            parent = document.querySelector(parent);
        }

        if (parent) {
            if (appendToParent) {
                parent.appendChild(this.el);
            }

            this._parent = parent;
        }

        if (this.el) {
            this.el.mComponent = this;
        }
    }

    /**
     * Attaching an event to the directly related element (this.el)
     * @param {String} eventName Event name to work with as per `addeventlistener` documentation
     * @param {Function} handler Handler for the element click
     * @param {any} [options] Options as per AddEventListener guidelines
     * @param {HTMLElement} [domNode] A specific DOM node to attach the event to
     */
    attachEvent(eventName, handler, options, domNode) {
        this.disposeEvent(eventName);
        this.disposeEvents[eventName] = MComponent.listen(
            domNode || this.el,
            eventName.split('.')[0],
            handler,
            options
        );
    }

    /**
     * Detaching an event by name if any
     * @param {String} eventName Event name to listen
     * @returns {void}
     */
    disposeEvent(eventName) {
        if (typeof this.disposeEvents[eventName] === 'function') {
            this.disposeEvents[eventName]();
        }
    }

    /**
     * Detaching this.el
     * This removes this.el reference,
     * so it is better to use it before complete removal or resetting with buildElement()
     */
    detachEl() {
        if (!this.el) {
            return;
        }

        const parent = this.el.parentNode;

        if (parent) {
            parent.removeChild(this.el);
        }

        // Disposing all events attached via MComponent.listen()
        const eventNames = Object.keys(this.disposeEvents);

        for (let i = 0; i < eventNames.length; i++) {
            this.disposeEvent(eventNames[i]);
        }

        $(this.el).off('dialog-closed.mDialog');

        delete this.el;
    }

    appendCss(classes) {
        if (classes) {
            this.el.classList.add(...classes.split(' '));
        }
    }

    /**
     * Listening for an event and conveniently removing listener disposer
     * @param {HTMLElement|String} node DOM element to listen the event on
     * @param {Event} event An event to listen
     * @param {Function} handler A callback to trigger
     * @param {Object} options Event options as per MDN for addEventListener
     * @returns {Function} Returning function should be called when the listener needs to be disposed
     */
    static listen(node, event, handler, options) {
        if (typeof node === 'string') {
            node = document.querySelector(node);
        }

        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }

    /**
     * Resetting array of specific internal elements
     * @param {MComponent} mComponent The ref to mComponent
     * @param {String} key Key of the list to reset
     * @param {String|Boolean} [containerKey] The this.ref of the DOM element to clear (if any)
     * @returns {void}
     */
    static resetSubElements(mComponent, key, containerKey = 'el') {
        if (!Array.isArray(mComponent[key])) {
            mComponent[key] = [];
            return;
        }

        for (let i = 0; i < mComponent[key].length; i++) {
            if (mComponent[key][i].remove) {
                mComponent[key][i].remove();
            }

            delete mComponent[key][i];
        }

        if (containerKey) {
            const container = mComponent[containerKey];

            if (container) {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }
        }

        mComponent[key] = [];
    }
}
