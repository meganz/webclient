/**
 * Semantic and accessible context menu creator/API.
 * Not yet used for the main context menu, only menu bar menus.
 *
 * Menus can have any depth by nesting them adjacent to the <button> element, i.e.:
 *
 * <template>
 *   <nav aria-expanded="false">
 *     <ul>
 *       <li>
 *         <button />
 *         <nav  aria-expanded="false" /><!-- second nested nav here -->
 *       </li>
 *     </ul>
 *   </button>
 * </template>
 *
 * Note the use of a <template> element to reduce the size of the rendered DOM until necessary.
 * See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
 *
 * - Optional transitions by setting them in the CSS and passing animationDuration > 0 to create.
 * - Can be used to automate menus for testing/demos using open/close/toggle.
 * - The menu should be put in a positioned parent element, and the menu will appear above/below the parent element
 *
 * @global
 * @name contextMenu
 * @memberOf window
 * @param {boolean} defaultIsRTL - the default value for whether the menu should have a RTL layout
 * @param {number} defaultAnimationDuration - value to use for the animationDuration if not specified
 */
lazy(window, 'contextMenu', () => {
    'use strict';

    const defaultAnimationDuration = 150;
    const defaultIsRTL = document.body.classList.contains('rtl');

    /**
     * Attaches the menu to the DOM.
     *
     * @private
     * @param {HTMLElement} menu - The menu element created from a template
     * @param {HTMLElement} sibling - The element to attach the menu next to
     * @returns {undefined}
     */
    function attach(menu, sibling) {
        sibling.insertAdjacentElement('afterend', menu);
    }

    /**
     * Creates the instance of the menu from a template.
     *
     * @private
     * @param {HTMLElement} template - The template to create the menu from
     * @param {boolean} isRTL - Whether the layout is RTL
     * @param {HTMLElement} boundingElement - The element the menu should not extend outside of
     * @param {number} [animationDuration] - The duration of the close animation (in ms)
     * @returns {HTMLElement} The instance of the menu
     */
    function createMenuElement(template, isRTL, boundingElement, animationDuration) {
        const elem = template.content.firstElementChild.cloneNode(true);
        elem.dataset.menuRoot = true;
        elem.style.direction = isRTL ? 'rtl' : 'ltr';
        elem.boundingElement = boundingElement;
        elem.animationDuration = animationDuration;
        return elem;
    }

    /**
     * Add hover events to show/hide submenus.
     *
     * @private
     * @param {HTMLElement} menu - The menu element to add events to
     * @returns {undefined}
     */
    function submenuHovers(menu) {
        const submenus = menu.querySelectorAll('nav');

        submenus.forEach(submenu => {
            const li = submenu.closest('li');
            let closeTimer;

            li.addEventListener('mouseover', () => {
                // if the submenu is not already open
                if (!submenu.classList.contains('visible')) {
                    open(submenu);
                    closeOtherSubmenus(submenu);
                }
                if (closeTimer) {
                    closeTimer.abort();
                    closeTimer = null;
                }
            });
            li.addEventListener('mouseleave', () => {
                (closeTimer = tSleep(0.5)).then(() => close(submenu));
            });
        });
    }

    /**
     * Closes all submenus except the specified one.
     *
     * @private
     * @param {HTMLElement} submenu - The submenu that should stay open
     * @returns {undefined}
     */
    function closeOtherSubmenus(submenu) {
        submenu.closest('ul').querySelectorAll(':scope > li nav').forEach(menu => {
            if (menu !== submenu) {
                close(menu);
            }
        });
    }

    /**
     * Sets the direction the menu will appear from, so that is it always visible to the user.
     * The bounding element does not have to be a parent of the menu.
     * The parent is used to calculate which direction the menu should open.
     *
     * @private
     * @param {HTMLElement} menu - The menu to set the open direction on
     * @returns {undefined}
     */
    function setOpenDirection(menu) {

        // Handle RTL and keeping within bottom boundary
        if (menu.classList.contains('open-horizontal') || menu.classList.contains('avoid-bottom')) {
            const menuRoot = menu.closest('[data-menu-root]');
            const boundingElement = menuRoot.boundingElement;
            const isRTL = menuRoot.style.direction === 'rtl';
            const parentRect = menu.parentNode.getBoundingClientRect();
            let directionClass = ['open-right'];
            let boundingElementRect;

            if (boundingElement === window) {
                boundingElementRect = {
                    left: 0,
                    right: window.innerWidth,
                    top: 0,
                    bottom: window.innerHeight
                };
            }
            else {
                boundingElementRect = boundingElement.getBoundingClientRect();
            }

            // Slide out sideways
            if (menu.classList.contains('open-horizontal')) {

                menu.classList.remove('open-right', 'open-left');

                // if it's RTL and there's space, or LTR and no space, open to the left
                if (isRTL && parentRect.left - boundingElementRect.left >= menu.offsetWidth
                    || !isRTL && boundingElementRect.right - parentRect.right < menu.offsetWidth) {
                    directionClass = ['open-left'];
                }
            }

            // if the submenu will go outside the boundary, move it up
            menu.classList.remove('open-above');
            if (parentRect.bottom + (menu.offsetHeight - parentRect.height) > boundingElementRect.bottom) {
                directionClass.push('open-above');
            }

            menu.classList.add(...directionClass);
        }
    }

    /**
     * Create the menu from a template and append it to a parent element
     *
     * @private
     * @param {HTMLElement} template - The template to be used for the menu
     * @param {HTMLElement} sibling - The element the menu will be attached after
     * @param {function} [callback] - Called after the menu is created (for click handlers, etc.)
     * @param {boolean} [isRTL=defaultIsRTL] - Whether the layout is RTL
     * @param {HTMLElement} [boundingElement=document.body] - The element the menu should not extend outside of
     * @param {number} [animationDuration=defaultAnimationDuration] - The duration of the close animation (in ms)
     * @returns {HTMLElement} The menu element
     */
    function create({
        template,
        sibling,
        callback,
        isRTL = defaultIsRTL,
        boundingElement = window,
        animationDuration = defaultAnimationDuration
    }) {
        const menuElement = createMenuElement(template, isRTL, boundingElement, animationDuration);
        submenuHovers(menuElement);
        attach(menuElement, sibling);
        if (callback) {
            callback();
        }
        return menuElement;
    }

    /**
     * @param {HTMLElement} menu - The menu/submenu to clean up
     * @private
     */
    const _cleanup = (menu) => {
        if (menu.openingTimeout) {
            menu.openingTimeout.abort();
            menu.openingTimeout = null;
        }
        if (menu.closingTimeout) {
            menu.closingTimeout.abort();
            menu.closingTimeout = null;
        }
    };

    /**
     * Open a menu or submenu.
     *
     * @private
     * @async
     * @param {HTMLElement} menu - The menu/submenu to open
     * @returns {Promise} Resolves after the animation is complete
     */
    async function open(menu) {
        const menuRoot = menu.closest('[data-menu-root]');

        _cleanup(menu);
        menu.classList.remove('closing');
        menu.classList.add('opening');
        menu.setAttribute('aria-expanded', 'true');
        setOpenDirection(menu);
        requestAnimationFrame(() => menu.classList.add('visible'));
        menu.openingTimeout = tSleep((menuRoot.animationDuration + 10) / 1e3);
        return menu.openingTimeout.then(() => menu.classList.remove('opening'));
    }

    /**
     * Close a menu or submenu.
     *
     * @private
     * @param {HTMLElement} menu - The menu/submenu to close
     * @returns {Promise} Resolves after the animation is complete
     */
    async function close(menu) {
        if (menu) {
            _cleanup(menu);
            const menuRoot = menu.closest('[data-menu-root]');

            if (menuRoot) {
                menu.classList.add('closing');
                menu.classList.remove('opening', 'visible');
                menu.closingTimeout = tSleep(menuRoot.animationDuration / 1e3);
                return menu.closingTimeout.then(() => {
                    menu.classList.remove('closing');
                    menu.setAttribute('aria-expanded', false);
                });
            }
        }
    }

    /**
     * Toggle a menu open/closed.
     *
     * @private
     * @async
     * @param {HTMLElement} menu - The menu/submenu to toggle
     * @returns {undefined}
     */
    async function toggle(menu) {
        // closed or closing
        if (menu.getAttribute('aria-expanded') === 'false' || menu.classList.contains('closing')) {
            await open(menu);
        }
        else {
            await close(menu);
        }
    }

    /**
     * Removes the menu from the DOM.
     *
     * @private
     * @async
     * @param {HTMLElement} menu - The menu to be removed
     * @param {function} [callback] - Called after the menu is destroyed
     * @returns {undefined}
     */
    async function destroy(menu, callback) {
        await close(menu);
        menu.remove();
        if (callback) {
            callback();
        }
    }

    // API
    return freeze({
        /**
         * Create the menu from a template and append it to a parent element
         *
         * @public
         * @see create
         */
        create,

        /**
         * Open a menu or submenu.
         *
         * @public
         * @see open
         */
        open,

        /**
         * Close a menu or submenu.
         *
         * @public
         * @see close
         */
        close,

        /**
         * Toggle a menu open/closed.
         *
         * @public
         * @async
         * @see toggle
         */
        toggle,

        /**
         * Removes the menu from the DOM.
         *
         * @public
         * @async
         * @see destroy
         */
        destroy
    });
});
