class MDialog {
    /**
     * @param {Object.<String, any>} data An enclosing data object
     * @param {Boolean|Function|{label: String, callback: Function?, classes: String}} data.ok OK dialog data
     * @param {Boolean|Function|{label: String, callback: Function?, classes: String}} data.cancel Cancel dialog data
     * @param {String} [data.icon] Classes for the side icon on the left
     * @param {String} [data.dialogName] Unique name for the dialog
     * @param {Function} [data.onclose] Callback to trigger when the dialog is closed
     * @param {Function} [data.setContent] Default content function
     */
    constructor({
        ok,
        cancel,
        icon,
        onclose,
        dialogName,
        setContent
    }) {
        const actions = [];

        if (ok) {
            actions.push({
                type: 'normal',
                text: ok.label || l[81],
                onClick: async() => {
                    let result = true;

                    if (typeof ok === 'function') {
                        result = await ok();
                    }
                    else if (ok.callback) {
                        result = await ok.callback();
                    }

                    if (result !== false) {
                        mega.ui.sheet.hide();

                        if (onclose) {
                            onclose();
                        }
                    }
                }
            });
        }

        if (cancel) {
            actions.push({
                type: 'normal',
                className: 'secondary',
                text: cancel.label || l[82],
                onClick: async() => {
                    if (typeof cancel === 'function') {
                        await cancel();
                    }
                    else if (cancel.callback) {
                        await cancel.callback();
                    }

                    mega.ui.sheet.hide();

                    if (onclose) {
                        onclose();
                    }
                }
            });
        }

        this.options = {
            name: dialogName || 'm-dialog',
            type: 'modal',
            showClose: true,
            preventBgClosing: false,
            icon,
            actions,
            onClose: onclose
        };

        if (setContent) {
            setContent.call(this);
        }
    }

    /**
     * Filling the title text
     * @param {String} text Text to fill the title with
     * @returns {void}
     */
    set title(text) {
        this.options.title = text;
    }

    /**
     * Providing the internal contents of the dialog
     * @param {HTMLElement|String} slot DOM element or string to insert within the dialog
     * @returns {void}
     */
    set slot(slot) {
        this.options.contents = [slot];
    }

    show() {
        mega.ui.sheet.show(this.options);
    }

    hide() {
        mega.ui.sheet.hide();
    }
}
