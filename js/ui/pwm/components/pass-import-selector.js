class MegaImportPassSelector {
    constructor() {
        this.container = document.createElement('div');
        this.file = null;

        const selectFileTitle = document.createElement('span');
        selectFileTitle.className = 'select-title';
        selectFileTitle.textContent = l.import_password_select_file;

        const managerCardList = this.createManagerCardList();
        this.fileInput = this.createFileInput();
        this.errorMessage = mega.ui.pm.utils.createMessage(
            l.upload_fail_message,
            'error',
            '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>',
            'hidden'
        );
        this.errorType = mega.ui.pm.utils.createMessage(
            l.import_type_message,
            'error',
            '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>',
            'hidden'
        );
        this.container.append(selectFileTitle, managerCardList, this.fileInput);
        this.fileField = this.createFileField();
        this.container.append(this.errorMessage, this.errorType);
    }

    createManagerCardList() {
        const cardList = document.createElement('div');
        cardList.className = 'card-select-container scrollable';

        const cardGroup = new CardGroup({
            cards: this.getManagerCardData(cardList),
            onClick: (e) => {
                this.clearFileSelection();
                mega.ui.pm.settings.utils.getFile();
                mega.ui.pm.settings.importSelected = e.currentTarget.value;
            }
        });
        console.log(cardGroup.value); // Log the selected card group value

        return cardList;
    }

    getManagerCardData(parentNode) {
        return [
            { value: '1password', icon: 'sprite-fm-uni icon-1password', title: l['1password'] },
            { value: 'bitwarden', icon: 'sprite-fm-uni icon-bitwarden', title: l.bitwarden },
            { value: 'google', icon: 'sprite-fm-uni icon-chrome', title: l.google },
            { value: 'dashlane', icon: 'sprite-fm-uni icon-dashlane', title: l.dashlane },
            { value: 'keepass', icon: 'sprite-fm-uni icon-keepassxc', title: l.keepass },
            { value: 'lastpass', icon: 'sprite-fm-uni icon-lastpass', title: l.lastpass },
            { value: 'nordpass', icon: 'sprite-fm-uni icon-nordpass', title: l.nordpass },
            { value: 'proton', icon: 'sprite-fm-uni icon-protonpass', title: l.proton },
            { value: 'other', icon: 'sprite-fm-mime-90 icon-generic-90', title: l.generic_csv }
        ].map(item => ({ ...item, parentNode, selected: false, iconSize: 48 }));
    }

    createFileInput() {
        const fileInput = document.createElement('input');
        fileInput.style.display = 'none';
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.id = 'file-select';

        fileInput.addEventListener('change', (e) => this.handleFileInput(e));

        return fileInput;
    }

    createFileField() {
        const fileField = new MegaReadOnlyField({
            parentNode: this.container,
            id: 'fileField',
            actions: [{
                icon: 'sprite-pm-mono icon-x-thin-outline',
                onClick: () => this.clearFileSelection()
            }],
            label: l[372]
        });

        fileField.addClass('hidden', 'fileField');
        return fileField;
    }

    handleFileInput(event) {
        this.file = event.target.files[0];
        if (this.file) {
            this.fileField.inputValue = this.file.name;
            this.fileField.removeClass('hidden');
            this.errorMessage.classList.add('hidden');
            this.errorType.classList.add('hidden');
            mega.ui.pm.utils.toggleButtonState(this.container, 'primary', false);
        }
    }

    clearFileSelection() {
        this.fileField.addClass('hidden');
        this.fileInput.value = '';
        this.errorMessage.classList.add('hidden');
        this.errorType.classList.add('hidden');
        mega.ui.pm.utils.toggleButtonState(this.container, 'primary', true);
    }

    uploadFile() {
        const primaryButton = mega.ui.pm.utils.getButton(this.container, 'primary');
        return mega.ui.pm.settings.utils.processFile(this.file, primaryButton, this.errorMessage)
            .then((data) => {
                primaryButton.disabled = false;
                return data;
            })
            .catch((ex) => {
                if (ex === 'Invalid file type.') {
                    this.clearFileSelection();
                    this.errorType.classList.remove('hidden');
                }
                else {
                    this.errorMessage.classList.remove('hidden');
                    this.errorType.classList.add('hidden');
                    primaryButton.disabled = false;
                }
            })
            .finally(() => {
                mega.ui.pm.settings.importInFlight = false;
                primaryButton.loading = false;
            });
    }
}
