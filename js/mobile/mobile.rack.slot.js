/**
 * Generates a Rack slot that can be used to rack any MegaMobileComponent
 * object within a MegaRack. Handles animations, positioning and timing the childComponent.
 *
 * NB: It's best to think of this class as a mixin, rather than a separate component class.
 * We are adding "Rails" to a component that then allow it to exist in a MegaMobileRack, not
 * creating a separate component.
 *
 * @param {MegaMobileComponent} childComponent The component to be wrapped in a slot.
 *
 * @returns {Object} Anonymous ES6 child class.
 * @constructor
 */
function RackSlot(childComponent) {
    'use strict';

    return class extends childComponent {

        /**
         * Class slot constructor.
         *
         * @param {Object} options Instance options.
         * @param {HTMLElement} options.parentNode Node to place the outer wrapperNode in.
         */
        constructor(options) {

            super(options);

            this.wrapperNode = mCreateElement('div', {'class': `mobile-slot`}, [
                mCreateElement('div', {'class': 'mobile-inner'}, [
                    this.domNode
                ])
            ]);

            options.parentNode.append(this.wrapperNode);
        }

        /**
         * Show the slot and inner object for a specified period.
         *
         * @param {Number} [timeout=4] The period to show for. 0 or -1 for infinite.
         *
         * @returns {Promise} Async completion.
         */
        async show(timeout = 4) {

            // If this component is not yet "taken", take it
            if (this.free) {
                this.take();
            }

            this.wrapperNode.classList.remove('close');
            this.wrapperNode.classList.remove('non-blocking');
            if (typeof super.show === 'function') {
                await super.show();
            }

            // The user handles the lifecycle
            if (timeout <= 0) {
                return;
            }

            /* Timeout Code */
            const timeoutHash = this._sessionHash;

            // Expiration after timeout
            await tSleep(timeout);

            // If we are still in the same session, run the timeout
            if (this._sessionHash === timeoutHash) {
                this.trigger('timeoutAction');
                await this.hide();
            }

        }

        /**
         * Hide the slot and inner object. Call callback once hidden, or
         * right away if sleep is false.
         *
         * @param {Boolean} [sleep=true] Whether to sleep before calling callback.
         * @param {Boolean} [release=true] Whether to release the component after hiding
         *
         * @returns {Promise} Async completion.
         */
        async hide(sleep = true, release = true) {

            this.wrapperNode.classList.add('close');

            const timeoutHash = this._sessionHash;

            await tSleep(sleep ? 1 : 0);

            if (timeoutHash !== this._sessionHash) {
                return;
            }

            if (typeof super.hide === 'function') {
                await super.hide();
            }

            this.wrapperNode.classList.add('non-blocking');

            // Release the component
            if (!this.free && release) {
                this.clear();

                // Release control
                this._sessionHash = undefined;
            }
        }

        /**
         * Get whether the current rackslot is hidden or not.
         *
         * @returns {Boolean} Whether the current rackslot is hidden
         */
        get visible() {

            return !this.wrapperNode.classList.contains('close') && super.visible;
        }


        /**
         * Clear the inner contents of the slot, by reseting common bindings, the timer
         * and calling the interior clear function.
         *
         * @returns {undefined}
         */
        clear() {

            // Reset user button bindings
            this.off('timeoutAction');

            if (typeof super.clear === 'function') {
                super.clear();
            }
        }

        /**
         * Returns whether the slot is currently free/expired.
         *
         * @returns {boolean} Whether the slot is currently free.
         */
        get free() {

            return !this._sessionHash;
        }

        /**
         * Take exclusive control of a rackslot.
         *
         * @returns {undefined}
         */
        take() {

            // Create a unique session hash.
            this._sessionHash = Math.random().toString(36);
        }

    };
}
