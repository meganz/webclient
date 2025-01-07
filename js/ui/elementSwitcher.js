lazy(mega, 'elementSwitcher', () => {
    'use strict';

    const setUpSwitchers = {};

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
            const elementChaged = elementKey !== currentElement;


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

                if (elementChaged) {
                    const {onElementChange} = elements;
                    if (typeof onElementChange === 'function') {
                        onElementChange($element);
                    }
                }
            }
        };

        const remove = (elementKey) => {
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
