class MegaComponent extends MegaDataEmitter {

    constructor(options) {

        super();

        // If parent node is not passed do not build anything
        if (!options.parentNode) {

            if (d) {
                console.error('MegaComponent - error: Target parent node to attach component is not passed');
            }

            return;
        }

        this.parentNode = options.parentNode;

        // If parent node is defined start build
        this.domNode = document.createElement(options.nodeType || 'div');
        this.domNode.className = 'mega-component';

        if (options.componentClassname) {
            this.domNode.className += ` ${options.componentClassname}`;
        }

        // Registered Custom Event list
        this.rCE = [];

        const ref = new WeakRef(this);

        Object.defineProperty(this.domNode, 'component', {get: () => ref.deref()});

        if (options.prepend) {
            options.parentNode.prepend(this.domNode);
        }
        else {
            options.parentNode.appendChild(this.domNode);
        }

        if (options.skLoading) {
            this.skLoading = true;
        }

        if (options.id) {
            this.domNode.id = options.id;
        }

        if (options.name) {
            this.domNode.name = options.name;
        }

        if (options.attr) {
            for (const key in options.attr) {
                this.attr(key, options.attr[key]);
            }
        }
    }

    // Extended on for bind it with dom event
    on(event, handler, data, one) {

        const emitter = MegaDataEmitter.getEmitter(event, this);
        const existEvent = !!emitter.events[emitter.event];

        super.on(event, handler, data, one);

        // This is existing event no need to go further.
        if (existEvent) {
            return this;
        }

        // Check this is custom event
        const customEvent = MegaComponent.customEvents[emitter.event];

        // If it is custom event in list and not registered prepare custom event by adding related native handlers.
        if (customEvent && !this.rCE.includes(emitter.event)) {

            const nk = Object.keys(customEvent.natives);

            for (let i = nk.length; i--;) {

                const passiveOpt = customEvent.passive.includes(nk[i]) ? {passive: true} : undefined;

                this.domNode.addEventListener(nk[i], customEvent.natives[nk[i]].bind(this), passiveOpt);
            }

            this.rCE.push(emitter.event);
        }

        this.domNode.addEventListener(emitter.event, this);

        return this;
    }

    // Extended off for remove dom event
    off(event, handler) {

        super.off(event, handler);

        if (event instanceof MegaDataEvent) {
            return this;
        }

        const emitter = MegaDataEmitter.getEmitter(event, this);

        if (!emitter.events[emitter.event]) {
            this.domNode.removeEventListener(emitter.event, this);
        }

        return this;
    }

    set domNode(n) {

        Object.defineProperty(this, 'domNode', {
            value: n,
            writable: false
        });
    }

    set parentNode(n) {

        Object.defineProperty(this, 'parentNode', {
            value: n,
            writable: false
        });
    }

    handleEvent(event) {
        this.trigger(event);
    }

    // Util methods

    addClass(...classes) {
        this.domNode.classList.add(...classes.filter(Boolean));
        return this;
    }

    removeClass(...classes) {
        this.domNode.classList.remove(...classes.filter(Boolean));
        return this;
    }

    hasClass(sel) {
        return this.domNode.classList.contains(sel);
    }

    toggleClass(...classes) {

        let state;
        let res;

        if (typeof classes[classes.length - 1] === 'boolean') {
            state = classes.pop();
        }

        classes.forEach(cls => {
            res = this.domNode.classList.toggle(cls, state);
        });

        if (classes.length === 1) {
            return res;
        }

        return this;
    }

    attr(attrName, attrValue) {
        if (attrValue === undefined) {
            return this.domNode.getAttribute(attrName);
        }
        this.domNode.setAttribute(attrName, attrValue);
    }

    get visible() {
        return !this.domNode.classList.contains('hidden');
    }

    show() {
        this.removeClass('hidden');
    }

    hide() {
        this.addClass('hidden');
    }

    get skLoading() {
        return this.domNode.classList.contains('sk-loading');
    }

    set skLoading(stateBool) {
        if (this.skLoading === stateBool) {
            return;
        }

        if (stateBool) {
            this.domNode.classList.add('sk-loading');
        }
        else {
            this.domNode.classList.remove('sk-loading');
        }
    }

    getSubNode(className, type) {
        let subNode = this.domNode.querySelector(`.${className}`);
        if (subNode) {
            return subNode;
        }
        subNode = document.createElement(type || 'div');
        subNode.className = className;
        this.domNode.appendChild(subNode);
        return subNode;
    }

    destroy() {

        if (typeof this[MegaDataEmitter.expando] === 'object') {

            // Kill all emittor events
            const ekeys = Object.keys(this[MegaDataEmitter.expando]);

            for (let i = ekeys.length; i--;) {
                this.off(ekeys[i]);
            }
        }

        // Remove dom node
        this.domNode.remove();
    }

    // Helper getter for debugging to give all binded events for the component and show where listener locates
    get events() {

        if (typeof this[MegaDataEmitter.expando] === 'object') {

            const res = {};

            // Gather all events
            const ekeys = Object.keys(this[MegaDataEmitter.expando]);

            for (let i = ekeys.length; i--;) {

                if (this[MegaDataEmitter.expando][ekeys[i]].length === 1) {
                    res[ekeys[i]] = this[MegaDataEmitter.expando][ekeys[i]][0].handler;
                }
                else {
                    res[ekeys[i]] = this[MegaDataEmitter.expando][ekeys[i]].map(event => event.handler);
                }
            }

            return res;
        }

        return null;
    }

    static factory(options) {
        return new this(options);
    }
}

// Custom events list, this is used to prepare required native event for custom event and also bind element with it
MegaComponent.customEvents = Object.create(null);

// Tap event
lazy(MegaComponent.customEvents, 'tap', () => {

    'use strict';

    return {
        natives: {
            touchmove: function() {
                this.__touchMoved = true;
            },
            touchend: function(event) {

                if (this.__touchMoved) {
                    delete this.__touchMoved;
                }
                else {
                    const custEvent = new CustomEvent('tap', event);

                    Object.defineProperty(custEvent, 'target', {value: event.target});
                    Object.defineProperty(custEvent, 'currentTarget', {value: event.currentTarget});
                    Object.defineProperty(custEvent, 'srcElement', {value: event.srcElement});

                    const res = this.trigger(custEvent);

                    // This requires to stop event bubble for original event
                    if (res === false) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            },
            click: function(event) {
                // Only allow anchor links on another component to able to do click for take the user to a linked page
                if (this.domNode === event.target || event.target.tagName !== 'A') {
                    event.preventDefault();
                }
            }
        },
        passive: ['touchmove']
    };
});

// Extended verions of native document.querySelector to select component instead
document.componentSelector = HTMLElement.prototype.componentSelector = function(sel) {
    'use strict';

    const elm = this.querySelector(sel);

    if (elm && elm.component) {
        return elm.component;
    }

    return null;
};

document.componentSelectorAll = HTMLElement.prototype.componentSelectorAll = function(sel) {
    'use strict';

    const res = [];

    this.querySelectorAll(sel).forEach(elm => elm.component && res.push(elm.component));

    return res;
};
