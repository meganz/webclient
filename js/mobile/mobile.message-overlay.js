/**
 * Shows a custom message e.g. error or success message in a popup overlay
 */
mobile.messageOverlay = (() => {
    'use strict';

    let targetSheet;

    /* Button variables */
    let buttonTemplate;
    let confirmButton;
    let buttons = [];

    /**
     * Handle messageOverlay close event and clean up after ourselves.
     *
     * @param {Object} callbacks Argument object of callbacks.
     * @param {Bool|*} callbackArg The argument(s) provided to the onInteraction callback.
     * @param {MegaMobileButton} [actionButton] The button the handler is applied too.
     * @param {number} [index] The index of the button provided to the callback.
     *
     * @returns {Function}
     */
    const closeHandler = (callbacks, callbackArg, actionButton, index) => {
        return function() {
            /* Cleanup */
            if (actionButton) {
                actionButton.off('tap');
                targetSheet.hide();
            }
            targetSheet.off('close.mobileSheet');
            targetSheet.clear();

            if (callbacks) {
                if (callbacks.onInteraction && typeof callbacks.onInteraction === 'function') {
                    callbacks.onInteraction(callbackArg || false, index);
                }

                if (callbackArg && callbacks.onSuccess && typeof callbacks.onSuccess === 'function') {
                    callbacks.onSuccess(index);
                }

                if (!callbackArg && callbacks.onFailure && typeof callbacks.onFailure === 'function') {
                    callbacks.onFailure(index);
                }
            }
        };
    };

    /**
     * Renders the checkbox from the callback.
     *
     * @param {Function} checkboxCallback The callback on checkbox state change.
     *
     * @returns {undefined}
     */
    function renderCheckbox(checkboxCallback) {
        if (checkboxCallback && typeof checkboxCallback === 'function') {
            const checkboxNode = new MegaMobileCheckbox({
                parentNode: targetSheet.actionsNode,
                componentClassname: 'mega-checkbox',
                checkboxName: 'show-again',
                checkboxAlign: 'left',
                labelTitle: l[229], // Do not show again
                checked: false
            });
            checkboxNode.on('tap', () => {
                // We haven't hit the rising or falling edge yet, so it's actually
                // the inverse of the current state.
                // Looks like tap is called before click...
                checkboxCallback(!checkboxNode.checked);
            });
        }
    }

    function generateAdditionalButtons(buttonsArg) {
        if (buttonsArg) {
            if (Array.isArray(buttonsArg)) {
                let button;
                for (let i = 0; i < buttonsArg.length; i++) {
                    button = buttonsArg[i];
                    if (i === 0) {
                        button = typeof button === 'string' ? {
                            ...buttonTemplate,
                            text: button,
                        } : button;
                        confirmButton = button;
                    }
                    else {
                        button = typeof button === 'string' ? {
                            ...buttonTemplate,
                            text: button,
                            componentClassname: 'secondary',
                        } : button;
                        buttons.push(button);
                    }
                }
            }
            else {
                buttons.push(typeof buttonsArg === 'string' ? {
                    ...buttonTemplate,
                    text: buttonsArg,
                } : buttonsArg);
            }
        }
    }

    /**
     * Render the provided icon sheetClass vs DomNode class.
     *
     * @param {String} icon Icon classes for warning messages
     *
     * @returns {undefined}
     */
    function renderIcon(icon) {
        if (icon) {
            targetSheet.addImage(icon);
        }
    }

    /**
     * Render the buttons in the confirmButton and buttons variables if
     * they are avaliable.
     *
     * @param {Object} callbacks Argument object of callbacks.
     *
     * @returns {undefined}
     */
    function renderButtons(callbacks) {
        let subNode;
        if (confirmButton) {
            subNode = new MegaMobileButton(confirmButton);
            subNode.on('tap', closeHandler(callbacks, true, subNode));
        }

        if (buttons) {
            for (let i = 0; i < buttons.length; i++) {
                subNode = new MegaMobileButton(buttons[i]);
                subNode.on('tap', closeHandler(callbacks, false, subNode, i));
            }
        }
    }


    return {
        /**
         * Full featured messageOverlay display function, of which other functions (msgDialog,
         * messageOverlay.show) take a feature subset.
         *
         * @param {String} [title] The overlay title.
         * @param {String} [message] The primary message in the overlay.
         * @param {String} [subMessage] The sub message in the overlay.
         * @param {Object} [callbacks] Object containing callbacks for the overlay.
         * @param {Function} [callbacks.onSuccess] Called on success (user pressing primary button).
         * @param {Function} [callbacks.onFailure] Called on failure (user pressing cancel button or sheet close).
         * @param {Function} [callbacks.onInteraction] Called on any interaction with callback({Bool} interactionType).
         * @param {Function} [callbacks.checkbox] Shows the "Do not show again" checkbox and callback with state.
         * @param {Object} [options] Object containing additional options for the overlay.
         * @param {String|Object} [options.icon] Sheet icon class to display. May be string or sheet icon class.
         * @param {String|List} [options.buttons] Additional buttons to display. If string, button is added
         * as secondary "Failure/cancel" button. If array, i=0 is confirm, i>0 is cancel and index is passed.
         * @param {Boolean} [safeShow] Whether to use M.safeShowDialog or not, mainly for msgDialogs which in
         * desktop web are shown without this mechanism.
         * @param {Boolean} [closeButton] Show close button or not. also use for background tap close.
         *
         * @returns {undefined}
         */
        render: function(title, message, subMessage, callbacks, options, safeShow, closeButton) {
            let dialogName;
            if (title) {
                dialogName = title.toLowerCase().replace(/\s+/g, '');
            }
            else {
                dialogName = Math.random();
            }

            const _sheet = () => {
                targetSheet = mega.ui.sheet;

                targetSheet.clear();
                targetSheet.type = 'modal';
                targetSheet.showClose = closeButton || false;
                targetSheet.preventBgClosing = typeof closeButton === 'boolean' ? !closeButton : true;

                buttonTemplate = {
                    parentNode: targetSheet.actionsNode,
                    type: 'normal',
                    componentClassname: 'block',
                };
                confirmButton = {
                    ...buttonTemplate,
                    text: l.ok_button, // OK, got it!
                };
                buttons = [];

                // Pre-revamp dialog ignores the title, so most of the
                // current calls treat the first msg as the title
                if (title) {
                    targetSheet.addTitle(title);
                }

                let subNode;

                if (message) {
                    subNode = document.createElement('div');
                    subNode.classList.add('primary-message');
                    subNode.append(parseHTML(message));
                    targetSheet.addContent(subNode);
                }

                if (subMessage) {
                    subNode = document.createElement('div');
                    subNode.classList.add('sub-message');
                    subNode.append(parseHTML(subMessage.message || subMessage));
                    targetSheet.addContent(subNode);
                }

                if (callbacks) {
                    renderCheckbox(callbacks.checkbox);
                }

                if (options) {
                    renderIcon(options.icon);
                    generateAdditionalButtons(options.buttons);
                }

                // Bind to the sheet actions
                targetSheet.on('close.mobileSheet', closeHandler(callbacks, false));

                renderButtons(callbacks);
            };

            if (safeShow) {
                M.safeShowDialog(`mobile-messageOverlay-${dialogName}`, () => {
                    _sheet();
                    targetSheet.show();
                });
            }
            else {
                _sheet();
                targetSheet.show();
            }
        },

        /**
         * Shows the error overlay
         *
         * @param {String} message The main message to be displayed
         * @param {String} [subMessage] An optional second message to be displayed after the first
         * @param {String} [icon] An optional class name to show an icon, empty-icon classes can be found in mobile.css
         * @param {String} [buttons] An optional second button in place of text-link close
         * @param {Function} [checkboxCallback] An optional function callback for a "Do not show again" checkbox
         * @param {Boolean} [closeButton] Show close button or not. also use for background tap close.
         * Note: for case that using .catch() on show, you have to set closeButton as true, in order to make it works
         *       on the other hand if you have closeButton true or have 2 buttons which one of them cause fail,
         *       you have to set catch to prevent exception.
         *
         *
         * @returns {undefined}
         */
        show: function(message, subMessage, icon, buttons, checkboxCallback, closeButton) {

            return new Promise((resolve, reject) => this.render(
                '',
                message,
                subMessage,
                {
                    onSuccess: resolve,
                    onFailure: reject,
                    checkbox: checkboxCallback,
                },
                {
                    icon: icon,
                    buttons: buttons,
                },
                true,
                closeButton
            ));
        }
    };
})();
