/**
 * Initialises methods for a toast rack.
 *
 * @global
 * @module toastRack
 * @returns {function} a factory method for creating a new toast rack
 */
window.toastRack = (() => {
    'use strict';

    /**
     * Create the toast rack (container) and attach it to the DOM, unless there is an existing rack in the parent.
     *
     * @private
     * @param {HTMLElement} parentElement - The parent to attach the rack to
     * @param {string} addTo - Position the new notifications should appear in (top/bottom/start/end). RTL aware.
     * @returns {HTMLElement} the new toast rack element
     */
    function createRack(parentElement, addTo = 'bottom') {

        const existRack = parentElement.querySelector('.toast-rack');
        const validPos = new Set(['top', 'bottom', 'start', 'end']);

        if (existRack) {

            if (addTo && validPos.has(addTo) && existRack.addTo !== addTo) {

                existRack.classList.remove(existRack.addTo);
                existRack.classList.add(addTo);
                existRack.addTo = addTo;
            }

            return existRack;
        }

        const rack = document.createElement('section');
        rack.className = 'toast-rack';
        rack.cleanupTimer = `toast-rack:${makeUUID()}`;
        rack.expiry = Infinity;

        // set direction
        if (addTo && validPos.has(addTo)) {
            rack.classList.add(addTo);
            rack.addTo = addTo;
        }

        // attach the rack to the parent
        parentElement.appendChild(rack);

        return rack;
    }

    /**
     * Creates a toast slot element.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {object} options - options for creating the toast
     * @param {number} [options.timeout] - The approximate time to display the toast for.
     *                                     Will be rounded up to the next 0.5s.
     * @param {string} [options.icon] - the icon name (class) to use for the toast
     * @param {Array} [options.buttons] - buttons to add to the toast
     * @param {boolean} [options.hasClose] - whether to show a close button
     * @param {function} [options.onClose] - called when the toast is closed
     * @param {Array} [options.classes] - extra classes to add to the toast
     * @param {(string|HTMLElement)} [options.content] - the text/HTML content of the toast
     * @param {Array} [options.groups] - an array of groups to use for the toast, used for filtering
     * @param {Array} [options.zIndex = true] - if false, no z-index will be applied to the toast slot
     * @returns {{toastSlot: object, toast: object}} the toast and its slot within the rack
     */
    function createToastSlot(rack, {
        timeout,
        icons,
        buttons,
        hasClose = true,
        onClose,
        classes,
        content,
        groups,
        zIndex = true
    }) {

        const toastSlot = document.createElement('div');
        toastSlot.className = 'toast-slot';
        toastSlot.id = `toast_${[Math.random().toString(36).substr(2, 9)]}`;

        // set classes
        if (Array.isArray(classes) && classes.length > 0) {
            toastSlot.classList.add(...classes);
        }

        // Get the last toast and it's z-index so the new slot can be higher
        if (zIndex && rack.addTo === 'top') {
            toastSlot.style.zIndex = getNextZIndex(rack);
        }

        if (Array.isArray(groups)) {
            toastSlot.groups = new Set(groups);
        }
        else {
            toastSlot.groups = new Set();
        }

        // set hide after timeout
        timeout = timeout || 3000;
        if (timeout > 0) {
            toastSlot.expiry = Date.now() + timeout;

            if (toastSlot.expiry < rack.expiry || rack.expiry < Date.now()) {
                rack.expiry = toastSlot.expiry;
                resetCleanupTimer(rack);
            }
        }

        const toast = createToast(rack, toastSlot.id, {
            icons,
            buttons,
            hasClose,
            onClose,
            classes,
            content
        });

        toastSlot.appendChild(toast);
        rack.appendChild(toastSlot);

        // set a height so the transitions work properly
        const toastStyle = getComputedStyle(toast);
        const minToastHeight = parseInt(toastStyle.getPropertyValue('--min-toast-height')) || 0;
        const toastHeight = toast.offsetHeight > minToastHeight ? toast.offsetHeight : minToastHeight;
        toastSlot.style.setProperty('--toast-height', toastHeight + 'px');

        // get the transition durations, as transition events are unreliable
        toastSlot.transitionDuration = parseFloat(getComputedStyle(toastSlot).transitionDuration) * 1000;
        toast.transitionDuration = parseFloat(toastStyle.transitionDuration) * 1000;

        return {toastSlot, toast};
    }

    /**
     * Creates a toast element.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID attribute of the toast slot
     * @param {object} options - options for creating the toast
     * @param {Array} [options.icons] - the icon names (classes) to use for the toast's icons
     * @param {Array} [options.buttons] - buttons to add to the toast
     * @param {boolean} [options.hasClose] - whether to show a close button
     * @param {function} [options.onClose] - called when the toast is closed
     * @param {Array} [options.classes] - extra classes to add to the toast
     * @param {(string|HTMLElement)} [options.content] - the text/HTML content of the toast, overrides html option
     * @returns {HTMLElement} a toast element
     */
    function createToast(rack, toastSlotId, {
        icons,
        buttons,
        hasClose,
        onClose,
        content
    }) {
        const toast = document.createElement('div');
        toast.className = 'toast';

        // set icons
        if (Array.isArray(icons)) {
            icons.forEach(i => {
                if (typeof i === 'string') {
                    toast.appendChild(createIcon(i));
                }
            });
        }

        // set content
        if (typeof content === 'string') {
            const span = document.createElement('span');
            span.className = 'message';
            span.textContent = content;
            toast.appendChild(span);
        }
        else if (content instanceof HTMLElement) {
            toast.appendChild(content);
        }

        // set buttons
        if (Array.isArray(buttons) && buttons.length > 0) {
            toast.append(...createButtons(buttons));
        }

        // set close
        if (typeof hasClose === 'boolean' && hasClose) {
            toast.appendChild(createCloseButton(rack, toastSlotId, onClose));
        }

        // get the transition duration, as transition events are unreliable
        toast.transitionDuration = parseFloat(getComputedStyle(toast).transitionDuration) * 1000;

        return toast;
    }

    /**
     * Gets the next value to use for a z-index so that shadows do not overlap.
     *
     * Note: only really applicable for addTo = 'top' as shadows tend to be bigger on the bottom and horizonally
     * symmetrical.
     *
     * Note 2: Arbitrarily uses 100 as the maximum value, feel free to change it.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @returns {number} the value to use for a z-index.
     */
    function getNextZIndex(rack) {
        const slots = rack.querySelectorAll('.toast-slot');

        if (slots.length > 0) {
            const lastSlot = slots[slots.length - 1];
            const previousZ = parseInt(lastSlot.style.zIndex);

            return previousZ - 1;
        }

        return 100;
    }

    /**
     * Removes expired toasts from the rack.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @returns {undefined}
     */
    function removeColdToast(rack) {
        let soonestUnexpired = Infinity;

        rack.querySelectorAll('.toast-slot').forEach(elem => {
            if (typeof elem.expiry !== 'undefined') {
                if (elem.expiry < Date.now()) {
                    hide(rack, elem.id);
                }
                else if (elem.expiry < soonestUnexpired) {
                    soonestUnexpired = elem.expiry;
                }
            }
        });

        rack.expiry = soonestUnexpired;
        if (soonestUnexpired !== Infinity) {
            resetCleanupTimer(rack);
        }
    }

    /**
     * Enables the timer for clearing expired toasts from the rack.
     * Stops the timer when the mouse is over the rack.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @returns {undefined}
     */
    function enableCleanupTimer(rack) {
        resetCleanupTimer(rack);
        rack.addEventListener('mouseover', eventEndTimer);
        rack.addEventListener('mouseleave', eventStartTimer);
    }

    /**
     * Disables the timer for clearing expired toasts from the rack.
     * Stops the timer when the mouse is over the rack.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @returns {undefined}
     */
    function disableCleanupTimer(rack) {
        delay.cancel(rack.cleanupTimer);
        rack.removeEventListener('mouseover', eventEndTimer);
        rack.removeEventListener('mouseleave', eventStartTimer);
    }

    /**
     * Event handler to start the cleanup timer on a rack.
     *
     * @private
     * @param {EventTarget} e - the event object
     * @returns {undefined}
     */
    function eventStartTimer(e) {
        const rack = e.currentTarget;
        rack.timerPaused = false;
        resetCleanupTimer(rack);
    }

    /**
     * Event handler to clear the cleanup timer on a rack.
     *
     * @private
     * @param {EventTarget} e - the event object
     * @returns {undefined}
     */
    function eventEndTimer(e) {
        const rack = e.currentTarget;
        delay.cancel(rack.cleanupTimer);
        rack.timerPaused = true;
    }

    /**
     * Clears the old timer and creates a new one based on the rack's expiry.
     *
     * @param {HTMLElement} rack - the toast rack
     * @returns {undefined}
     */
    function resetCleanupTimer(rack) {
        if (!rack.timerPaused) {
            const now = Date.now();

            if (rack.expiry < now) {
                delay.cancel(rack.cleanupTimer);
                removeColdToast(rack);
            }
            else {
                delay(rack.cleanupTimer, () => removeColdToast(rack), rack.expiry - now);
            }
        }
    }

    /**
     * Create an icon element for the toast.
     *
     * @private
     * @param {string} icon - the (class) name of the icon
     * @returns {HTMLElement} the new icon element
     */
    function createIcon(icon) {
        const iconElement = document.createElement('i');
        iconElement.className = `toast-icon ${icon}`;
        return iconElement;
    }

    /**
     * Creates button elements based on provided parameters.
     *
     * @private
     * @param {Array} buttons - buttons to be created
     * @param {string} buttons.text - the text content of the button
     * @param {Array} buttons.classes - extra classes to add to the button
     * @param {function} buttons.onClick - the click event for the button
     * @returns {HTMLElement[]} an array of button elements
     */
    function createButtons(buttons) {
        return buttons.map(({
            text,
            classes,
            onClick
        }) => {
            const button = document.createElement('button');
            button.className = 'action';

            // set classes
            if (Array.isArray(classes)) {
                button.classList.add(...classes);
            }

            // set click event
            if (typeof onClick === 'function') {
                button.addEventListener('click', onClick);
            }

            // set content
            if (typeof text === 'string') {
                button.textContent = text;
            }

            return button;
        });
    }

    /**
     * Create a close button and attach a click handler.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID of the toast slot the button will close
     * @param {function} [onClose] - called on close
     * @returns {HTMLElement} the new close button element
     */
    function createCloseButton(rack, toastSlotId, onClose) {
        const closeElement = document.createElement('button');
        closeElement.className = 'close';

        const iconElem = document.createElement('i');
        iconElem.className = 'sprite-fm-mono icon-close-component';
        closeElement.appendChild(iconElem);

        // set close event
        closeElement.addEventListener('click', async () => {
            await hide(rack, toastSlotId);
            if (typeof onClose === 'function') {
                onClose();
            }
        });

        return closeElement;
    }

    /**
     * Creates new slot and shows a new toast.
     *
     * @private
     * @async
     * @param {HTMLElement} rack - the toast rack
     * @param {object} options - options for creating the toast
     * @returns {string} the ID of the new toast slot
     */
    async function show(rack, options) {

        if (rack.querySelectorAll('.toast-slot').length === 0) {
            enableCleanupTimer(rack);
        }

        const {toastSlot, toast} = createToastSlot(rack, options);

        await openItem(toastSlot);
        await showToast(toast);

        return toastSlot.id;
    }

    /**
     * Hides a toast and removes the slot from the DOM.
     *
     * @private
     * @async
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID of the toast slot to close
     * @returns {undefined}
     */
    async function hide(rack, toastSlotId) {
        const toastSlot = document.getElementById(toastSlotId);
        if (toastSlot) {
            const toast = toastSlot.querySelector('.toast');

            await hideToast(toast);
            await closeItem(toastSlot);
        }
        if (rack.querySelectorAll('.toast-slot').length === 0) {
            disableCleanupTimer(rack);
        }
    }

    /**
     * Hides and remove all toasts in the rack.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @returns {Promise} completes when all toasts have been hidden and removed
     */
    function hideAll(rack) {
        const promises = [];

        // Find all the toasts and hide them
        rack.querySelectorAll('.toast-slot').forEach(toastSlot => promises.push(hide(rack, toastSlot.id)));

        return Promise.allSettled(promises);
    }

    /**
     * Hide all the toasts/toast slots provided.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {Array} ids - toast slot IDs to hide
     * @returns {Promise} completes when all toasts have been hidden and removed
     */
    function hideMany(rack, ids) {
        const promises = [];

        for (const id of ids) {
            promises.push(hide(rack, id));
        }

        return Promise.allSettled(promises);
    }

    /**
     * Hides and removes all toasts in the rack, except the IDs in the array.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {Array} exceptions - the exceptions that should remain visible
     * @returns {Promise} completes when all toasts have been hidden and removed
     */
    function hideAllExcept(rack, exceptions) {
        const promises = [];

        // Find all the toasts and hide them, unless they are an exception
        rack.querySelectorAll('.toast-slot').forEach(toastSlot => {
            if (!exceptions.includes(toastSlot.id)) {
                promises.push(hide(rack, toastSlot.id));
            }
        });

        return Promise.allSettled(promises);
    }

    /**
     * Hides and removes all toasts in the rack, except those in any of the groups in the array.
     *
     * Note: Worst case is O(number of toasts * number of exceptionGroups)
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {Array} exceptionGroups - the exceptions that should remain visible
     * @returns {Promise} completes when all toasts have been hidden and removed
     */
    function hideAllExceptGroups(rack, exceptionGroups) {
        const promises = [];

        // Find all the toasts and hide them, unless they are an exception
        for (const toastSlot of rack.querySelectorAll('.toast-slot')) {
            let ignore = false;
            for (const exception of exceptionGroups) {
                if (toastSlot.groups.has(exception)) {
                    ignore = true;
                    break;
                }
            }
            if (!ignore) {
                promises.push(hide(rack, toastSlot.id));
            }
        }

        return Promise.allSettled(promises);
    }

    /**
     * Updates the severity of a toast.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID of the toast slot to update
     * @param {string} [newSeverity] - the new level of severity to set (low/medium/high/undefined)
     * @returns {undefined}
     */
    function setSeverity(rack, toastSlotId, newSeverity) {
        const toastSlot = rack.querySelector(`#${toastSlotId}`);

        if (typeof toastSlot !== 'undefined') {
            const toast = toastSlot.querySelector('.toast');

            toast.classList.remove('low', 'medium', 'high');

            if (['low', 'medium', 'high'].includes(newSeverity)) {
                toast.classList.add(newSeverity);
            }
        }
    }

    /**
     * Opens (animates) a slot in the rack.
     *
     * @private
     * @param {HTMLElement} toastSlot - the slot to open
     * @returns {Promise} completes when the slot has finished animating
     */
    function openItem(toastSlot) {
        return new Promise(resolve => {
            toastSlot.classList.add('open');
            setTimeout(resolve, toastSlot.transitionDuration);
        });
    }

    /**
     * Shows (animates) a toast.
     *
     * @private
     * @param {HTMLElement} toast - the toast to show
     * @returns {Promise} completes when the toast has finished animating
     */
    function showToast(toast) {
        return new Promise(resolve => {
            toast.classList.add('visible');
            setTimeout(resolve, toast.transitionDuration);
        });
    }

    /**
     * Closes (animates) a slot in the rack and removes it from the DOM.
     *
     * @private
     * @param {HTMLElement} toastSlot - the slot to close
     * @returns {Promise} completes when the slot has finished animating and is removed
     */
    function closeItem(toastSlot) {
        return new Promise(resolve => {
            toastSlot.classList.remove('open');

            setTimeout(() => {
                toastSlot.remove();
                resolve();
            }, toastSlot.transitionDuration);
        });
    }

    /**
     * Hides (animates) a toast.
     *
     * @private
     * @param {HTMLElement} toast - the toast to hide
     * @returns {Promise} completes when the toast has finished animating
     */
    function hideToast(toast) {
        return new Promise(resolve => {
            toast.classList.remove('visible');
            setTimeout(resolve, toast.transitionDuration);
        });
    }

    /**
     * Hides all toasts, cleans up and removes the rack from the DOM.
     *
     * @private
     * @async
     * @param {HTMLElement} rack - the toast rack
     * @returns {undefined}
     */
    async function destroy(rack) {
        await hideAll(rack);
        rack.remove();
    }

    /**
     * Adds filtering groups to a toast.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID of the toast slot to add groups to
     * @param {Array} groups - an array of groups to add
     * @returns {undefined}
     */
    function addGroups(rack, toastSlotId, groups) {
        const toast = rack.querySelector(`#${toastSlotId}`);

        if (typeof toast !== 'undefined') {
            for (const group of groups) {
                toast.groups.add(group);
            }
        }
    }

    /**
     * Removes filtering groups to a toast.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {string} toastSlotId - the ID of the toast slot to add groups to
     * @param {Array} groups - an array of groups to remove
     * @returns {undefined}
     */
    function removeGroups(rack, toastSlotId, groups) {
        const toast = rack.querySelector(`#${toastSlotId}`);

        if (typeof toast !== 'undefined') {
            for (const group of groups) {
                toast.groups.delete(group);
            }
        }
    }

    /**
     * Returns the IDs of toast slots based on an array of groups.
     *
     * You can use 'and' or 'or' as operators.
     *
     * @private
     * @param {HTMLElement} rack - the toast rack
     * @param {Array} groups - the groups to match
     * @param {string} [operator] - and/or, not needed if groups.length === 1
     * @returns {Array} an array of toast slot IDs that match the criteria
     */
    function getIdsByGroups(rack, groups, operator) {
        const results = [];

        function or(groups, toastSlot) {
            for (const group of groups) {
                if (toastSlot.groups.has(group)) {
                    results.push(toastSlot.id);
                    break;
                }
            }
        }

        function and(groups, toastSlot) {
            let ignore = false;

            for (const group of groups) {
                if (!toastSlot.groups.has(group)) {
                    ignore = true;
                }
            }

            if (!ignore) {
                results.push(toastSlot.id);
            }
        }

        if (groups.length > 0) {
            for (const toastSlot of rack.querySelectorAll('.toast-slot')) {
                if (groups.length > 1) {
                    if (operator === 'or') {
                        or(groups, toastSlot);
                    }
                    else if (operator === 'and') {
                        and(groups, toastSlot);
                    }
                }
                else if (toastSlot.groups.has(groups[0])) {
                    results.push(toastSlot.id);
                }
            }
        }

        return results;
    }

    function testRack(rack, parentElementClass, addTo) {

        // Seems like rack is not visible one. lets try get visible one instead from another fmholder
        if (rack.offsetParent === null) {

            const pElms = document.getElementsByClassName(parentElementClass);

            for (let i = pElms.length; i--;) {

                if (pElms[i].offsetParent) {

                    rack = createRack(pElms[i], addTo);
                    break;
                }
            }
        }

        return rack;
    }

    /**
     * Create and display a toast notification from a batch
     *
     * @param {object} data - Configuration data
     * @param {HTMLElement} rack - The rack to display the toast on
     * @returns {string} - The ID of the new toast slot
     */
    function dispatchBatch(data, rack) {
        const opts = Object.create(null);
        if (data.level !== 'neutral') {
            opts.classes = [data.level];
        }
        opts.content = data.joiner(data.content);
        opts.icons = data.icon;
        opts.hasClose = true;
        return show(rack, Object.assign(opts, data.overrideOptions));
    }

    /**
     * Create the toast rack (container), attach it to the DOM and return methods to control it.
     *
     * @private
     * @param {HTMLElement} parentElement - the parent to attach the rack to
     * @param {string} addTo - position the new notifications should appear in (top/bottom/start/end). RTL aware.
     * @returns {object} control methods for the new toast rack
     */
    return (parentElement, parentElementClass, addTo) => {
        // Create a new rack, or connect to an existing one
        let rack = createRack(parentElement, addTo);
        const batches = Object.create(null);

        return {
            /**
             * Show a custom toast.
             *
             * @public
             * @async
             * @param {object} options - options for creating the toast
             * @returns {string} the ID of the new toast slot
             * @see show
             */
            show: async options => {

                rack = testRack(rack, parentElementClass);

                return show(rack, options);
            },

            /**
             * Hide a toast.
             *
             * @public
             * @async
             *
             * @param {string} toastSlotId - the ID of the toast slot to close
             * @returns {undefined}
             * @see hide
             */
            hide: async toastSlotId => hide(rack, toastSlotId),

            /**
             * Hide and remove all toasts in the rack.
             *
             * @public
             * @async
             * @returns {Promise} completes when all toasts have been hidden and removed
             * @see hideAll
             */
            hideAll: async () => await hideAll(rack),

            /**
             * Hide all the toasts/toast slots provided.
             *
             * @public
             * @async
             * @param {Array} ids - toast slot IDs to hide
             * @returns {Promise} completes when all toasts have been hidden and removed
             * @see hideMany
             */
            hideMany: async ids => await hideMany(rack, ids),

            /**
             * Hide and remove all toasts in the rack, except the IDs in the array.
             *
             * @public
             * @async
             * @param {Array} exceptions - the exceptions that should remain visible
             * @returns {Promise} completes when all toasts have been hidden and removed
             * @see hideAllExcept
             */
            hideAllExcept: async exceptions => await hideAllExcept(rack, exceptions),

            /**
             * Hides all toasts, cleans up and removes the rack from the DOM.
             *
             * @public
             * @async
             * @returns {undefined}
             * @see destroy
             */
            destroy: async () => destroy(rack),

            /**
             * Show a neutral priority toast.
             *
             * @public
             * @async
             * @param {(string|HTMLElement)} content - text/HTML to show in the teast
             * @param {string} [icon] - icon name (class) to use for the toast
             * @param {object} [overrideOptions] - an options object to override the defaults @see show
             * @returns {string} the ID of the new toast slot
             */
            neutral: async(content, icon, overrideOptions) => {

                rack = testRack(rack, parentElementClass);

                return show(rack, Object.assign({
                    content,
                    icons: [icon],
                    hasClose: true
                }, overrideOptions));
            },

            /**
             * Show a high priority toast.
             *
             * @public
             * @async
             * @param {(string|HTMLElement)} content - text/HTML to show in the teast
             * @param {string} [icon] - icon name (class) to use for the toast
             * @param {object} [overrideOptions] - an options object to override the defaults @see show
             * @returns {string} the ID of the new toast slot
             */
            high: async(content, icon, overrideOptions) => {

                rack = testRack(rack, parentElementClass);

                return show(rack, Object.assign({
                    classes: ['high'],
                    content,
                    icons: [icon],
                    hasClose: true
                }, overrideOptions));
            },

            /**
             * Show a medium priority toast.
             *
             * @public
             * @async
             * @param {(string|HTMLElement)} content - text/HTML to show in the teast
             * @param {string} [icon] - icon name (class) to use for the toast
             * @param {object} [overrideOptions] - an options object to override the defaults @see show
             * @returns {string} the ID of the new toast slot
             */
            medium: async(content, icon, overrideOptions) => {

                rack = testRack(rack, parentElementClass);

                return show(rack, Object.assign({
                    classes: ['medium'],
                    content,
                    icons: [icon],
                    hasClose: true
                }, overrideOptions));
            },

            /**
             * Show a low priority toast.
             *
             * @public
             * @async
             * @param {(string|HTMLElement)} content - text/HTMLElement to show in the teast
             * @param {string} [icon] - icon name (class) to use for the toast
             * @param {object} [overrideOptions] - an options object to override the defaults @see show
             * @returns {string} the ID of the new toast slot
             */
            low: async(content, icon, overrideOptions) => {

                rack = testRack(rack, parentElementClass);

                return show(rack, Object.assign({
                    classes: ['low'],
                    content,
                    icons: [icon],
                    hasClose: true
                }, overrideOptions));
            },

            /**
             * Batch similar toasts into a single toast.
             *
             * Batches based on level as well
             * e.g: `batch('a', 'a', 'neutral');` is a different batch than `batch('a', 'a', 'high');`
             *
             * @param {string} batchId              - The base id for the batch
             * @param {string} content              - The text/HTML to add to the toast
             * @param {string} [level]              - The toast level. One of: [neutral (default), low, medium, high]
             * @param {function} [joiner]           - Optional function to join the batched values.
             *                                        Receives an array of strings then return a string combining them
             *                                        Default: ['a', 'b'] => 'a and b'; ['a', 'b', 'c'] => 'a, b and c';
             * @param {string} [icon]               - The icon name (class) to use for the toast
             * @param {object} [overrideOptions]    - An options object to override the defaults @see show
             * @param {function} [cb]               - Optional call back that is called when the toast is dispatched.
             *                                        A promise with the ID of the new toast slot is provided as
             *                                        the first argument
             * @returns {void} void
             */
            batch: (batchId, content, {level, joiner, icon, overrideOptions, cb} = {}) => {
                level = level || 'neutral';
                batchId = `${batchId}${level}`;
                if (typeof batches[batchId] === 'undefined') {
                    batches[batchId] = Object.create(null);
                    batches[batchId].content = [];
                    batches[batchId].joiner = (arr) => {
                        return mega.utils.trans.listToString(arr, '[X]');
                    };
                    batches[batchId].level = level;
                }
                batches[batchId].content.push(content);
                if (icon) {
                    batches[batchId].icon = [icon];
                }
                if (overrideOptions) {
                    batches[batchId].overrideOptions = overrideOptions;
                }
                if (typeof joiner === 'function') {
                    batches[batchId].joiner = joiner;
                }
                if (typeof cb === 'function') {
                    batches[batchId].cb = cb;
                }
                const now = Date.now();
                if (typeof batches[batchId].maxTime === 'undefined') {
                    batches[batchId].maxTime = now + 2000;
                }
                const dsp = () => {
                    rack = testRack(rack, parentElementClass);
                    const id = dispatchBatch(batches[batchId], rack);
                    if (typeof batches[batchId].cb === 'function') {
                        batches[batchId].cb(id);
                    }
                    delete batches[batchId];
                };
                if (typeof batches[batchId].listener === 'undefined') {
                    batches[batchId].listener = setTimeout(dsp, 1000);
                    batches[batchId].dispTime = now + 1000;
                }
                else if (batches[batchId].dispTime !== batches[batchId].maxTime) {
                    clearTimeout(batches[batchId].listener);
                    batches[batchId].listener = setTimeout(
                        dsp,
                        batches[batchId].maxTime - batches[batchId].dispTime
                    );
                    batches[batchId].dispTime = batches[batchId].maxTime;
                }
            },

            /**
             * Updates the severity of a toast.
             *
             * @public
             * @param {string} toastSlotId - the ID of the toast slot to update
             * @param {string} [newSeverity] - the new level of severity to set (low/medium/high/undefined)
             * @returns {undefined}
             * @see setSeverity
             */
            setSeverity: (toastSlotId, newSeverity) => setSeverity(rack, toastSlotId, newSeverity),

            /**
             * Adds filtering groups to a toast.
             *
             * @public
             * @param {string} toastSlotId - the ID of the toast slot to add groups to
             * @param {Array} groups - an array of groups to add
             * @returns {undefined}
             * @see addGroups
             */
            addGroups: (toastSlotId, groups) => addGroups(rack, toastSlotId, groups),

            /**
             * Removes filtering groups to a toast.
             *
             * @public
             * @param {string} toastSlotId - the ID of the toast slot to add groups to
             * @param {Array} groups - an array of groups to remove
             * @returns {undefined}
             * @see removeGroups
             */
            removeGroups: (toastSlotId, groups) => removeGroups(rack, toastSlotId, groups),

            /**
             * Hides and removes all toasts in the rack, except those in any of the groups in the array.
             *
             * @public
             * @async
             * @param {Array} exceptionGroups - the exceptions that should remain visible
             * @returns {Promise} completes when all toasts have been hidden and removed
             * @see hideAllExceptGroups
             */
            hideAllExceptGroups: async exceptionGroups => hideAllExceptGroups(rack, exceptionGroups),

            /**
             * Returns the IDs of toast slots based on an array of groups.
             *
             * @public
             * @param {Array} groups - the groups to match
             * @param {string} [operator] - and/or, not needed if groups.length === 1
             * @returns {Array} an array of toast slot IDs that match the criteria
             * @see getIdsByGroups
             */
            getIdsByGroups: (groups, operator) => getIdsByGroups(rack, groups, operator),
        };
    };
})();

/**
 * Legacy patch for existing toast calls. Not to be used for new toasts.
 *
 * @param {string} type - the type that defines the icons to be used on the toast
 * @param {string} content - the text/HTML (as text) content of the toast
 * @param {string} [firstButtonText] - the text content of the first button
 * @param {string} [secondButtonText] - the text content of the second button
 * @param {function} [firstButtonOnClick] - the click event for the first button
 * @param {function} [secondButtonOnClick] - the click event for the second button
 * @param {Number} [timeout] -  - The approximate time to display the toast for. Will be rounded up to the next 0.5s.
 * @returns {undefined}
 */
window.showToast = function(
    type,
    content,
    firstButtonText,
    secondButtonText,
    firstButtonOnClick,
    secondButtonOnClick,
    timeout
) {
    'use strict';

    const iconEquivalents = {
        settings: 'sprite-fm-mono icon-settings',
        megasync: 'sprite-fm-mono icon-sync',
        recoveryKey: 'sprite-fm-mono icon-key',
        warning: 'sprite-fm-mono icon-warning-triangle',
        clipboard: 'sprite-fm-mono icon-link',
        download: 'sprite-fm-mono icon-download-filled',
        password: 'sprite-fm-mono icon-lock-filled',
        'send-chat': 'sprite-fm-mono icon-chat-filled',
        'megasync-transfer': ['sprite-fm-uni icon-mega-logo', 'sprite-fm-mono icon-down green'],
        'megasync-transfer upload': ['sprite-fm-uni icon-mega-logo', 'sprite-fm-mono icon-up blue'],
        success: 'sprite-fm-uni icon-check',
        'clipboard-copy': 'sprite-fm-mono icon-copy',
        warning2: 'sprite-fm-uni icon-warning',
        'clipboard-embed-code': 'sprite-fm-mono icon-embed-code',
    };

    const icons = typeof iconEquivalents[type] === 'string' ? [iconEquivalents[type]] : iconEquivalents[type];

    // content
    const span = document.createElement('span');
    span.className = 'message';
    $(span).safeHTML(content);

    // buttons
    let buttons;
    if (firstButtonText) {
        buttons = [
            {
                text: firstButtonText,
                onClick: firstButtonOnClick
            }
        ];

        if (secondButtonText) {
            buttons.push({
                text: secondButtonText,
                onClick: secondButtonOnClick
            });
        }
    }

    window.toaster.main.show({
        content: span,
        icons,
        buttons,
        hasClose: true,
        timeout
    });
};

// Create all the toasters
lazy(window, 'toaster', () => {
    'use strict';

    const toaster = {};

    lazy(toaster, 'main', () => {
        const mainToaster = document.createElement('section');
        mainToaster.className = 'global-toast-container';
        document.body.appendChild(mainToaster);
        return window.toastRack(mainToaster, 'global-toast-container', 'top');
    });

    lazy(toaster, 'alerts', () => window.toastRack(
        document.querySelector('.alert-toast-container'),
        'alert-toast-container',
        'top'
    ));

    return toaster;
});
