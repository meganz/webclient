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

                megaMsgDialog.render(
                    parseHTML(`<h2 class="text-container">
                        ${l.delete_confirmation_title.replace('%1', title)}</h2>`),
                    l.permanent_action,
                    '',
                    {
                        onSuccess: () => {
                            if (!navigator.onLine) {
                                this.showConnectionErrorDialog();
                                return;
                            }

                            const currentIndex = mega.ui.pm.list.vaultPasswords
                                .findIndex(node => node.h === mega.ui.pm.list.passwordItem.item.h);

                            const newSelectedId = currentIndex === mega.ui.pm.list.vaultPasswords.length - 1
                                ? currentIndex - 1 : currentIndex + 1;

                            const newSelected = mega.ui.pm.list.vaultPasswords[newSelectedId] &&
                                                    mega.ui.pm.list.vaultPasswords[newSelectedId].h;

                            mega.ui.pm.comm.saveLastSelected(newSelected);
                            mega.ui.pm.comm.deleteItem([mega.ui.pm.list.passwordItem.item.h])
                                .then(() => {
                                    mega.ui.toast.show(parseHTML(l.item_deleted.replace('%1', title)));
                                    mega.ui.pm.list.passwordItem.domNode.classList.remove('active');
                                    return mega.ui.pm.list.loadList();
                                })
                                .catch(tell);
                        }
                    },
                    {
                        buttons: [l[1730], l[82]]
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
                                    mega.ui.pm.list.passwordItem.domNode.classList.remove('active');
                                    return mega.ui.pm.list.loadList();
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
                megaMsgDialog.render(
                    l.unable_to_delete,
                    l.check_connection,
                    '',
                    '',
                    {
                        icon: 'sprite-pm-mono icon-alert-triangle-thin-outline warning',
                    },
                    false,
                    true
                );
            }
        };
    });

})(window.mega);
