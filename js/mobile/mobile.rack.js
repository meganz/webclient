/**
 * Generate a reusable rack of slots.
 */
class MegaMobileRack extends MegaMobileComponent {

    /**
     * Create a MegaMobileRack
     *
     * @param {Object} options Instance options.
     * @param {HTMLElement} options.parentNode Node to append too.
     * @param {Object|Function} options.childComponent The child component that is passed to RackSlot().
     * @param {Boolean} [options.prependRack=false] Whether to prepend to parentNode children.
     * @param {Number} [options.maxSlots=5] The max number of slots on the screen at once.
     * @param {Number} [options.defaultTimeout=4] The default timeout if undefined/null is passed to the rack show().
     * @param {Number} [options.instanceOptions={}] Any additional arguments to pass when a new slot is created.
     *
     * @returns {MegaMobileRack} The built object.
     */
    constructor(options) {

        super(options);

        // Move to top of list
        if (options.prependRack) {
            options.parentNode.prepend(this.domNode);
        }

        // Additional classes added with componentClassname
        this.domNode.classList.add('mobile-rack');

        if (options.childComponent) {
            this.slotConstructor = RackSlot(options.childComponent);
        }
        else {
            console.error("You must provide a `childComponent` for the rackSlot to rack.");
        }

        this.slotList = [];
        this.maxSlots = options.maxSlots || 5;
        this.defaultTimeout = options.defaultTimeout || 0;
        this._instanceOptions = options.instanceOptions || {};
        this._instanceOptions.parentNode = this.domNode;
    }

    /**
     * Update an object with updateFunction, show the object and then hide it after timeout seconds.
     *
     * @param {Function} [updateFunction] The function to run to update the object before display.
     * @param {Number} [timeout] The timeout in seconds to remove the object after, 0 is infinite.
     *
     * @returns {Object} The slot that is being updated/shown.
     */
    show(updateFunction, timeout = this.defaultTimeout) {
        const slot = MegaMobileRack.getSlot.call(this);

        if (slot) {

            if (typeof updateFunction === 'function') {
                updateFunction.call(slot);
            }

            slot.show(timeout);

            return slot;
        }
    }

    /**
     * Loop over and hide all slots.
     *
     * @returns {undefined}
     */
    hideSlots() {
        let i = this.slotList.length;
        while (i--) {
            this.slotList[i].hide();
        }
    }
}

/**
 * Static function uses this.slotConstructor to generate a new slot object.
 * Must be called with `.call(this)`.
 *
 * @returns {Object} The new slot object.
 */
MegaMobileRack.newSlot = function() {
    'use strict';

    const slot = new this.slotConstructor(this._instanceOptions);

    this.slotList.push(slot);
    slot.take();
    return slot;
};

/**
 * Static function finds and empty slot or returns a new slot if there are
 * less than this.maxSlots.
 * Must be called with `.call(this)`.
 *
 * @returns {Object|Boolean} Slot object on success, Boolean on failure.
 */
MegaMobileRack.getSlot = function() {
    'use strict';

    let i = this.slotList.length;
    let slot;

    /* Iterate through toasts and find one where the timer has expired (free) */
    while (i--) {
        slot = this.slotList[i];
        if (slot.free) {
            this.domNode.appendChild(slot.wrapperNode);
            slot.take();
            return slot;
        }
    }

    /* No free toasts found */
    if (this.slotList.length >= this.maxSlots) {
        console.error("Too many slots");
        return false;
    }

    return MegaMobileRack.newSlot.call(this);
};
