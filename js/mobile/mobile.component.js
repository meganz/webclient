class MegaMobileComponent extends MegaDataEmitter {

    constructor(options) {

        super();

        // If parent node is not passed do not build anything
        if (!options.parentNode) {

            if (d) {
                console.error('MegaMobileComponent - error: Target parent node to attach component is not passed');
            }

            return;
        }

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
        const customEvent = MegaMobileComponent.customEvents[emitter.event];

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
        this.domNode.classList.add(...classes);
        return this;
    }

    removeClass(...classes) {
        this.domNode.classList.remove(...classes);
        return this;
    }

    hasClass(sel) {
        return this.domNode.classList.contains(sel);
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
}

// Custom events list, this is used to prepare required native event for custom event and also bind element with it
MegaMobileComponent.customEvents = Object.create(null);

// Tap event
lazy(MegaMobileComponent.customEvents, 'tap', () => {

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
                    const res = this.trigger('tap', event);

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
