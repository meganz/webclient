(mega => {
    "use strict";

    lazy(mega.ui.pm, 'delete', () => {
        return {
            showConfirm() {
                if (!navigator.onLine) {
                    this.showConnectionErrorDialog();
                    return;
                }

                const title = mega.ui.pm.list.passwordItem.item.name;

                const footerElements = mCreateElement('div', { class: 'flex flex-row-reverse' });

                MegaButton.factory({
                    parentNode: footerElements,
                    text: l[1730],
                    componentClassname: 'slim font-600',
                    type: 'normal'
                }).on('click', () => {
                    if (!navigator.onLine) {
                        this.showConnectionErrorDialog();
                        return;
                    }

                    const nodeHandle = mega.ui.pm.list.passwordItem.item.h;
                    const node = M.getNodeByHandle(nodeHandle);

                    const currentIndex = mega.ui.pm.list.vaultPasswords
                        .findIndex(item => item.h === nodeHandle);

                    const newSelectedId = currentIndex === mega.ui.pm.list.vaultPasswords.length - 1
                        ? currentIndex - 1 : currentIndex + 1;

                    const newSelected = mega.ui.pm.list.vaultPasswords[newSelectedId] &&
                                            mega.ui.pm.list.vaultPasswords[newSelectedId].h;

                    mega.ui.pm.comm.saveLastSelected(newSelected);
                    mega.ui.pm.comm.deleteItem([nodeHandle])
                        .then(() => {
                            mega.ui.toast.show(parseHTML(l.item_deleted.replace('%1', title)));
                        })
                        .catch(tell);

                    mega.ui.sheet.hide();

                    if (node && node.pwm && node.pwm.t === 'c') {
                        eventlog(500860);
                    }
                });

                MegaButton.factory({
                    parentNode: footerElements,
                    text: l[82],
                    componentClassname: 'slim font-600 mx-2 secondary',
                    type: 'normal'
                }).on('click', () => {
                    const nodeHandle = mega.ui.pm.list.passwordItem.item.h;
                    const node = M.getNodeByHandle(nodeHandle);

                    mega.ui.sheet.hide();

                    if (node && node.pwm && node.pwm.t === 'c') {
                        eventlog(500859);
                    }
                });

                megaMsgDialog.render(
                    parseHTML(`<h2 class="text-container">
                        ${l.delete_confirmation_title.replace('%1', title)}</h2>`),
                    l.permanent_action,
                    '',
                    {},
                    {
                        sheetType: 'normal',
                        footer: {
                            slot: [footerElements],
                            confirmButton: false
                        }
                    },
                    false,
                    true
                );
            },

            showConfirmAll(currentTarget) {
                if (!navigator.onLine) {
                    this.showConnectionErrorDialog();
                    return;
                }

                megaMsgDialog.render(
                    parseHTML(`<h2 class="text-container">${l.delete_all_dialog_title}</h2>`),
                    l.delete_all_dialog_msg,
                    '',
                    {
                        onSuccess: () => {
                            if (!navigator.onLine) {
                                this.showConnectionErrorDialog();
                                return;
                            }

                            eventlog(500602);

                            currentTarget.loading = true;

                            mega.ui.pm.comm.deleteItem(Object.keys(M.c[mega.pwmh] || []))
                                .then(() => {
                                    mega.ui.toast.show(l.succesfull_deletion_toast);
                                })
                                .catch(tell)
                                .finally(() => {
                                    currentTarget.loading = false;
                                });
                        }
                    },
                    {
                        icon: 'sprite-pm-mono icon-x-circle-thin-outline error',
                        buttons: [l.delete_item, l[82]],
                        confirmButtonClass: 'destructive'
                    },
                    false,
                    true
                );
            },

            showConnectionErrorDialog() {
                const footerElements = mCreateElement('div', { class: 'flex flex-row-reverse' });

                megaMsgDialog.render(
                    l.unable_to_delete,
                    l.check_connection,
                    '',
                    '',
                    {
                        icon: 'sprite-pm-mono icon-alert-triangle-thin-outline warning',
                        sheetType: 'normal',
                        footer: {
                            slot: [footerElements],
                            confirmButton: {
                                parentNode: footerElements,
                                type: 'normal',
                                componentClassname: 'slim font-600',
                                text: l.ok_button
                            }
                        }
                    },
                    false,
                    true
                );
            }
        };
    });

})(window.mega);
