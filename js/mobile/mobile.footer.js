class MegaMobileFooter extends MegaMobileComponent {

    constructor(options) {

        super(options);

        const plusButton = new MegaMobileButton({
            parentNode: this.domNode,
            type: 'icon',
            icon: 'sprite-mobile-fm-mono icon-plus-thin-outline',
            iconSize: 24
        });

        plusButton.on('tap.expand', () => {
            this.showGeneralActions();
            return false;
        });

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'upload-select-file hidden';
        fileInput.id = 'fileselect1';
        fileInput.multiple = true;
        this.domNode.appendChild(fileInput);

        this.menuOpts = {
            type: 'fullwidth',
            componentClassname: 'text-icon',
            iconSize: 24
        };

        this.menuItems = [
            {
                text: l[99],
                icon: 'sprite-mobile-fm-mono icon-file-upload-thin-outline',
                binding: () => {
                    if (!validateUserAction()) {
                        return false;
                    }

                    if (ulmanager.ulOverStorageQuota) {
                        ulmanager.ulShowOverStorageQuotaDialog();

                        return false;
                    }

                    // Clear file input so change handler works again in Chrome
                    fileInput.value = '';

                    // Open the file picker
                    fileInput.click();
                }
            },
            {
                text: l[68],
                icon: 'sprite-mobile-fm-mono icon-folder-plus-thin-outline',
                binding: () => {
                    if (!validateUserAction()) {
                        return false;
                    }

                    // Show the create folder sheet
                    if (!mobile.createFolder) {
                        mobile.createFolder = new MobileNodeNameControl({type: 'create'});
                    }
                    mobile.createFolder.show();
                }
            }
        ];
        if (mega.flags.ab_ads) {
            mega.commercials.init();
        }
    }

    static init() {

        const fmBlock = document.querySelector('#fmholder .file-manager-block');

        if (!fmBlock) {

            if (d) {
                console.error('Something is wrong, file manager block seems missing');
            }

            return;
        }

        if (!mega.ui.footer) {
            mega.ui.footer = new MegaMobileFooter({
                parentNode: fmBlock,
                componentClassname: 'mega-footer hidden'
            });
        }

        if (!document.contains(mega.ui.footer.domNode)) {
            fmBlock.appendChild(mega.ui.footer.domNode);
        }
    }

    showGeneralActions() {
        M.safeShowDialog('mobile-footer-actions', () => {
            mega.ui.sheet.clear();

            mega.ui.sheet.showClose = true;

            const menuNode = document.createElement('div');
            menuNode.className = 'general-actions';
            mega.ui.sheet.addContent(menuNode);

            const buildItem = (item) => {
                const buttonItem = new MegaMobileButton({
                    ...this.menuOpts,
                    ...item,
                    parentNode: menuNode
                });
                buttonItem.on('tap', () => {
                    mega.ui.sheet.hide();

                    item.binding();
                    return false;
                });
            };

            for (const item of this.menuItems) {
                buildItem(item);
            }

            mega.ui.sheet.show();
        });
    }

    showButton(val = 0) {

        if (this.domNode.style.bottom !== `${val}px`) {

            this.domNode.style.bottom = val;

            if (val === 0) {
                mega.ui.toast.rack.addClass('above-fab');
            }
        }
    }

    hideButton(val = this.domNode.offsetHeight) {

        if (this.domNode.style.bottom !== `-${val}px`) {

            this.domNode.style.bottom = `-${val}px`;

            if (val === this.domNode.offsetHeight) {
                mega.ui.toast.rack.removeClass('above-fab');
            }
        }
    }
}
