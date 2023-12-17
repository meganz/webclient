class MDialog extends MComponent {
    /**
     * @param {Object.<String, any>} data An enclosing data object
     * @param {Boolean|{label: String, callback: Function?, classes: String}} data.ok
     * @param {Boolean|{label: String, callback: Function?, classes: String}} data.cancel
     * @param {String} [data.dialogClasses] Additional classes for dialog
     * @param {String} [data.contentClasses] Additional classes for dialog content
     * @param {String} [data.leftIcon] Classes for the side icon on the left
     * @param {Function} [onclose] Callback to trigger when the dialog is closed
     */
    constructor({ ok, cancel, dialogClasses, contentClasses, leftIcon, onclose, doNotShowCheckboxText, dialogName }) {
        super('section.mega-dialog-container:not(.common-container)', false);

        this._ok = ok;
        this._cancel = cancel;
        this._contentClasses = contentClasses;

        this._title = document.createElement('h3');
        this._title.className = 'text-ellipsis';

        this.onclose = onclose;

        this._doNotShowCheckboxText = doNotShowCheckboxText;

        this._dialogName = dialogName || 'm-dialog';

        if (leftIcon) {
            this.leftIcon = document.createElement('i');
            this.leftIcon.className = 'icon-left ' + leftIcon;
        }

        this.appendCss(dialogClasses);
    }

    get slot() {
        return this._slot;
    }

    /**
     * Providing the internal contents of the dialog
     * @param {HTMLElement} slot DOM element to insert within the dialog
     * @returns {void}
     */
    set slot(slot) {
        this._slot = slot;
    }

    /**
     * Filling the title text
     * @param {String} text Text to fill the title with
     * @returns {void}
     */
    set title(text) {
        this._title.textContent = text;
    }

    /**
     * @param {Function(any):boolean} getFn
     * @param {Function(any):void} setFn
     * @returns {void}
     */
    addConfirmationCheckbox(getFn, setFn) {
        this._doNotShowGetFn = getFn;
        this._doNotShowSetFn = setFn;
    }

    /**
     * Filling the text underneath the dialog
     * @param {String} text Text to fill with
     * @returns {void}
     */
    set actionTitle(text) {
        this._actionTitle.textContent = text;
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'mega-dialog m-dialog dialog-template-main';
    }

    triggerCancelAction() {
        if (typeof this._cancel === 'function') {
            this._cancel();
        }
        else if (this._cancel.callback) {
            this._cancel.callback();
        }

        this.hide();
    }

    show() {
        // use *unique* names per dialog
        M.safeShowDialog(this._dialogName, () => {
            this._show();

            if (this.onMDialogShown) {
                onIdle(() => this.onMDialogShown());
            }

            return $(this.el).rebind('dialog-closed.mDialog', () => {
                delete this.isShowing;
                this.detachEl();

                if (typeof this.onclose === 'function') {
                    this.onclose();
                }
            });
        });
    }

    _show() {
        this.setWrapper();

        if (this._ok || this._cancel) {
            this.setButtons();
        }

        if (this._parent) {
            this._parent.appendChild(this.el);

            const overlay = this._parent.querySelector('.fm-dialog-overlay');
            overlay.classList.add('m-dialog-overlay');

            this.attachEvent(
                'click.dialog.overlay',
                () => {
                    this.hide();
                },
                null,
                overlay
            );

            this.attachEvent(
                'keyup.dialog.escape',
                ({ key }) => {
                    if (key === 'Escape') {
                        this.hide();
                    }
                },
                null,
                document
            );
        }

        if (this._slot) {
            this._contentWrapper.appendChild(this._slot);
        }

        if (this.leftIcon) {
            this.el.prepend(this.leftIcon);
            this.el.classList.add('with-icon');
            this._contentWrapper.classList.add('px-6');

            if (this._aside) {
                this._aside.classList.add('-ml-18');
            }
        }
        else {
            this.el.classList.remove('with-icon');
            this._contentWrapper.classList.remove('px-6');

            if (this._aside) {
                this._aside.classList.remove('-ml-18');
            }
        }

        this.isShowing = true;
    }

    hide(ignoreNewOnes = false) {
        if (!this.isShowing) {
            return;
        }

        const nextDialog = this.el.nextElementSibling;

        if (!ignoreNewOnes && nextDialog && nextDialog.classList.contains('m-dialog')) {
            return; // No need to close this dialog, as it will be closed by the new opened one
        }

        if (this._doNotShowCheckbox) {
            this._doNotShowCheckbox.detachEl();

            delete this._aside;
            delete this._doNotShowCheckbox;
        }

        assert($.dialog === this._dialogName);
        closeDialog();
    }

    disable() {
        if (this.okBtn && !this.okBtn.el.disabled) {
            this.okBtn.disable();
        }
    }

    enable() {
        if (this.okBtn && this.okBtn.el.disabled === true) {
            this.okBtn.enable();
        }
    }

    setWrapper() {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close m-dialog-close';
        this.el.appendChild(closeBtn);

        const closeIcon = document.createElement('i');
        closeIcon.className = 'sprite-fm-mono icon-dialog-close';
        closeBtn.appendChild(closeIcon);

        this.el.appendChild(this._title);

        const content = document.createElement('section');
        content.className = 'content';
        this.el.appendChild(content);

        this._contentWrapper = document.createElement('div');
        this._contentWrapper.className = (typeof this._contentClasses === 'string') ? this._contentClasses : '';
        content.appendChild(this._contentWrapper);

        this.attachEvent(
            'click.dialog.close',
            () => {
                this.triggerCancelAction();
            },
            null,
            closeBtn
        );
    }

    setButtons() {
        const footer = document.createElement('footer');
        const footerContainer = document.createElement('div');
        footerContainer.className = 'p-6 flex justify-end items-center';
        footer.appendChild(footerContainer);
        this.el.appendChild(footer);

        this._actionTitle = document.createElement('div');
        this._actionTitle.className = 'flex flex-1';
        footerContainer.appendChild(this._actionTitle);

        if (this._cancel) {
            this.cancelBtn = new MButton(
                this._cancel.label || l[1597],
                null,
                () => {
                    this.triggerCancelAction();
                },
                (this._cancel.classes) ? this._ok.classes.join(' ') : 'mega-button'
            );

            footerContainer.appendChild(this.cancelBtn.el);
        }

        if (this._ok) {
            this.okBtn = new MButton(
                this._ok.label || l[1596],
                null,
                async() => {
                    let result = true;

                    if (typeof this._ok === 'function') {
                        result = this._ok();
                    }
                    else if (this._ok.callback && this._ok.callback[Symbol.toStringTag] === 'AsyncFunction') {
                        result = await this._ok.callback();
                    }
                    else if (this._ok.callback) {
                        result = this._ok.callback();
                    }

                    if (result !== false) {
                        if (this._doNotShowCheckbox && this._doNotShowSetFn) {
                            this._doNotShowSetFn(this._doNotShowCheckbox.checked);
                        }

                        this.hide();
                    }
                },
                this._ok.classes ? this._ok.classes.join(' ') : 'mega-button positive'
            );

            footerContainer.appendChild(this.okBtn.el);

            this.attachEvent(
                'keyup.dialog.enter',
                (evt) => {
                    if (this.okBtn.el.disabled) {
                        return;
                    }

                    if (evt.key === 'Enter') {
                        this.okBtn.el.click();
                        return false;
                    }
                },
                null,
                document
            );
        }

        if (this._doNotShowGetFn) {
            this._aside = document.createElement('aside');
            this._aside.className = 'align-start with-condition';

            this._doNotShowCheckbox = new MCheckbox({
                label: this._doNotShowCheckboxText || l[229],
                id: 'do-not-show-again-confirmation',
                checked: !!this._doNotShowGetFn && this._doNotShowGetFn()
            });

            this._aside.appendChild(this._doNotShowCheckbox.el);
            footer.appendChild(this._aside);
        }
    }
}
