(mega => {
    "use strict";

    lazy(mega.ui.pm, 'delete', () => {
        return {
            showConfirm() {
                if (!navigator.onLine) {
                    this.checkConnection();
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
                                this.checkConnection();
                                return;
                            }

                            const currentIndex = mega.ui.pm.list.vaultPasswords
                                .findIndex(node => node.h === mega.ui.pm.list.passwordItem.item.h);

                            const newSelectedId = currentIndex === mega.ui.pm.list.vaultPasswords.length - 1
                                ? currentIndex - 1 : currentIndex + 1;

                            const newSelected = mega.ui.pm.list.vaultPasswords[newSelectedId] &&
                                                    mega.ui.pm.list.vaultPasswords[newSelectedId].h;

                            mega.ui.pm.comm.saveLastSelected(newSelected);
                            mega.ui.pm.comm.deleteItem(mega.ui.pm.list.passwordItem.item.h)
                                .then(() => {
                                    mega.ui.toast.show(parseHTML(l.item_deleted.replace('%1', title)));
                                    return mega.ui.pm.list.loadList();
                                })
                                .catch((ex) => {
                                    // show dialog on api request errors
                                    megaMsgDialog.render(
                                        l.unsuccessful_action,
                                        l.request_failed,
                                        `${l.error_code}: ${ex}`,
                                        '',
                                        {
                                            icon: 'sprite-pm-mono icon-alert-triangle-thin-outline warning',
                                            buttons: [l.ok_button]
                                        },
                                        false,
                                        true
                                    );
                                });
                        }
                    },
                    {
                        buttons: [l[1730], l[82]]
                    },
                    false,
                    true
                );
            },

            checkConnection() {
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
