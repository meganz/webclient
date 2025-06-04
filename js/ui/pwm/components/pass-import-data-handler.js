class MegaImportPassDataHandler {
    constructor(data) {
        this.data = data;
        this.container = document.createElement('div');

        this.dataList0 = new MegaPassList({
            parentNode: this.container,
            componentClassname: 'handler-data-list',
            items: [
                {
                    subtitle: mega.icu.format(l.import_selected_items_count, 0).replace('%1', 0),
                    checkbox: {
                        checkboxAlign: 'right',
                        checkboxName: 'all',
                        checked: true
                    }
                }
            ]
        });

        const items = this.data.map(item => {
            const passwordData = mega.ui.pm.settings.utils.getPasswordData(item, mega.ui.pm.settings.importSelected);
            return {
                leftIcon: this.createFavicon(passwordData.name, passwordData.pwm.url),
                title: passwordData.name,
                subtitle: passwordData.pwm.url,
                checkbox: {
                    checkboxAlign: 'right',
                    checkboxName: passwordData.name,
                    checked: true
                }
            };
        });

        this.dataList = new MegaPassList({
            parentNode: this.container,
            componentClassname: 'handler-data-list',
            items
        });

        this.dataList.listNode.classList.add('scrollable');

        const multiCheckbox = this.dataList0.listNode.componentSelector('.mega-checkbox');
        const checkboxes = this.dataList.listNode.componentSelectorAll('.mega-checkbox');
        const statusNode = this.dataList0.listNode.querySelector('.mega-item-list-subtitle');

        const updateButtonState = () => {
            const anyChecked = [...checkboxes, multiCheckbox].some(checkbox => checkbox.checked);
            const primaryButton = mega.ui.pm.utils.getButton(this.container, 'primary');
            primaryButton.disabled = !anyChecked;
        };

        this.checkboxGroup = new MegaCheckboxGroup({
            multiCheckbox,
            checkboxes,
            statusNode,
            onUpdate: updateButtonState
        });

        this.infoMessage = mega.ui.pm.utils.createMessage(
            l.import_info_message,
            'info',
            '<i class="sprite-pm-mono icon-info-thin-outline"></i>'
        );
        this.errorMessage = mega.ui.pm.utils.createMessage(
            l.import_fail_message,
            'error',
            '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>',
            'hidden'
        );
        this.container.append(this.infoMessage, this.errorMessage);
    }

    createFavicon(name, url) {
        const outer = document.createElement('div');
        outer.className = 'favicon';
        const span = document.createElement('span');
        outer.append(span);
        mega.ui.pm.utils.generateFavicon(name, url, outer);
        return outer;
    }


    saveData() {
        const checkedCheckboxes = new Set(
            this.container.componentSelectorAll('.mega-checkbox')
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.checkboxName)
        );

        const matchingData = this.data.filter(item =>
            checkedCheckboxes.has(item.name) ||
            checkedCheckboxes.has(item.Title) ||
            checkedCheckboxes.has(item.title)
        );
        const primaryButton = mega.ui.pm.utils.getButton(this.container, 'primary');
        primaryButton.loading = true;
        const secondaryButton = mega.ui.pm.utils.getButton(this.container, 'secondary');
        secondaryButton.disabled = true;

        this.errorMessage.classList.add('hidden');
        this.infoMessage.classList.remove('hidden');

        return mega.ui.pm.settings.utils.saveImportedData([matchingData, {}])
            .then(() => {
                mega.ui.toast.show(mega.icu.format(l.import_success_toast_count, matchingData.length));
                return true;
            })
            .catch(() => {
                this.errorMessage.classList.remove('hidden');
                this.infoMessage.classList.add('hidden');
            })
            .finally(() => {
                primaryButton.loading = false;
                if (!mega.ui.pm.settings.importInFlight) {
                    secondaryButton.disabled = false;
                }
            });
    }
}
