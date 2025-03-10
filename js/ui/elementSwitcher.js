lazy(mega, 'elementSwitcher', () => {
    'use strict';

    const setUpSwitchers = {};


    /**
     * Creates an element switcher for managing the visibility and lifecycle of multiple elements, when only one should
     * be shown at a time.
     *
     * @param {Object} elements - An object where each key corresponds to an element configuration.
     * @param {JQuery} elements[].$element - A jQuery object representing the element to manage.
     * @param {JQuery} elements[].$target - A jQuery object where the element will be appended.
     * @param {Boolean} [elements[].initialised] - Indicates whether the element has been initialized (default: false).
     * @param {Function} [elements[].onElementAppend] - Callback triggered after the element is appended.
     * @param {Function} [elements[].onElementShow] - Callback triggered when the element is shown.
     * @param {Function} [elements[].onElementChange] - Callback triggered when the visible element changes.
     * @param {Object} [elements[].extras] - Additional data to be passed to the callbacks.
     * @param {String} [initialState] - The key of the initial element to display.
     * @param {String} switcherName - A unique name for the switcher instance to prevent duplication.
     * @param {Boolean} [hideAllOnInit] - Whether to hide all elements during initialization.
     * @returns {Object} - An object containing methods to interact with the switcher:
     *   - {Function} showElement(elementKey): Shows the specified element.
     *   - {Function} remove(elementKey): Removes the specified element or all elements if no key is provided.
     *   - {Function} hide(): Hides the currently visible element.
     *   - {Function} getVal(): Returns the key of the currently visible element.
     */
    return (elements, initialState, switcherName, hideAllOnInit) => {

        if (d && !switcherName) {
            console.warn('Please provide a switcher name for the elementSwitcher to reduce the risk of duplication.');
        }

        if (switcherName && setUpSwitchers[switcherName]) {
            return setUpSwitchers[switcherName];
        }

        elements = {...elements};

        let elementKeys = Object.keys(elements);
        let currentElement;

        const appendElement = (elementKey) => {

            const {initialised, $target, onElementAppend, extras} = elements[elementKey];
            let {$element} = elements[elementKey];

            if (initialised) {
                return $element;
            }

            if (!$element) {
                return false;
            }

            let id = $element.attr('id');
            const keepID = !!id;

            if (!keepID) {
                id = 'es-temp';
                $element.attr('id', id);
            }

            $target.safeAppend($element.prop('outerHTML'));
            $element = $(`#${id}`, $target);

            if (!keepID) {
                $element.removeAttr('id');
                const duplicatedID = document.getElementById('es-temp');
                if (duplicatedID) {
                    console.assert(!d, 'Duplicated id "es-temp", something has broken in elementSwitcher!');
                    duplicatedID.remove();
                }
            }

            if (typeof onElementAppend === 'function') {
                onElementAppend($element, extras);
            }

            elements[elementKey].$element = $element;
            elements[elementKey].initialised = true;
            elements[elementKey].appendedBySwitcher = true;

            return $element;
        };

        const showElement = (elementKey) => {

            if (!elements[elementKey]) {
                return;
            }

            const {onElementShow, extras} = elements[elementKey];

            const $element = appendElement(elementKey);
            const elementChanged = elementKey !== currentElement;


            const doOnElementShow = () => {
                if ((typeof onElementShow === 'function') && $element) {
                    onElementShow($element, extras);
                }
            };

            if (currentElement === elementKey) {
                doOnElementShow();
                return;
            }

            if ($element) {
                if (currentElement !== undefined && elements[currentElement]) {
                    elements[currentElement].$element.addClass('hidden');
                }

                currentElement = elementKey;
                $element.removeClass('hidden');

                doOnElementShow();

                if (elementChanged) {
                    const {onElementChange} = elements;
                    if (typeof onElementChange === 'function') {
                        onElementChange($element);
                    }
                }
            }
        };

        const remove = (elementKey) => {
            if (!setUpSwitchers[switcherName]) {
                return;
            }
            if (elements[elementKey]) {
                if (elements[elementKey].appendedBySwitcher) {
                    elements[elementKey].$element.remove();
                }
                delete elements[elementKey];
                elementKeys = Object.keys(elements);
            }
            else if (!elementKey) {
                for (const key in elements) {
                    if (elements.hasOwnProperty(key)) {
                        remove(key);
                    }
                }
                delete setUpSwitchers[switcherName];
            }
        };

        const hide = () => {
            if (currentElement) {
                const {onElementChange} = elements;
                const $element = elements[currentElement].$element;
                $element.addClass('hidden');
                if (typeof onElementChange === 'function') {
                    onElementChange($element);
                }
                currentElement = undefined;
            }
        };

        const getVal = () => currentElement;

        const init = () => {
            if (hideAllOnInit) {
                for (const key in elements) {
                    if (elements.hasOwnProperty(key) && (key !== 'onElementChange')) {
                        appendElement(key).addClass('hidden');
                    }
                }
            }

            if (elementKeys.length && (typeof initialState !== 'undefined')) {
                showElement(initialState || elementKeys[0]);
            }

            setUpSwitchers[switcherName] = {
                showElement,
                remove,
                hide,
                getVal,
            };
        };

        init();

        return setUpSwitchers[switcherName];
    };
});
