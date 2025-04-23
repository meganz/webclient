/** @property T.ui.dialog */
lazy(T.ui, 'dialog', () => {
    'use strict';

    const content = mCreateElement('div', {class: 'global-dialog-container'}, 'body');
    T.ui.appendTemplate('js_ui_transfer_dialogs', content);
    const inert = tryCatch((selector, value = true) => {
        const pcn = document.querySelector(selector);
        if (pcn) {
            pcn.inert = value;
        }
    });

    return freeze({
        dialogs: [],

        get content() {
            return content;
        },

        show(cn) {
            if (cn && cn.classList.contains('hidden')) {
                // this.hide();
                this.dialogs.push(cn);

                cn.classList.remove('hidden');
                cn.focus();
                inert('.global-page-container');

                $(cn).rebind('keyup.closeDialog', (ev) => {
                    if (ev.key === 'Escape')   {
                        const dialog = this.dialogs[this.dialogs.length - 1];
                        if (dialog.classList.contains('js-msg-dialog')) {
                            T.ui.msgDialog.hide();
                        }
                        else {
                            this.hide(dialog);
                        }
                    }
                });
            }
        },

        hide(cn) {
            if (cn) {
                const i = this.dialogs.indexOf(cn);
                if (i > -1) {
                    this.dialogs.splice(i, 1);
                }
                cn.classList.add('hidden');
            }
            else {
                for (const holder of content.querySelectorAll('.it-dialog-holder')) {
                    holder.classList.add('hidden');
                }
                this.dialogs.length = 0;
            }

            if (this.dialogs.length) {
                this.dialogs[this.dialogs.length - 1].focus();
            }
            else {
                $(document).unbind('keyup.closeDialog');
                inert('.global-page-container', false);
            }
        }
    });
});
