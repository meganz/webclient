class MegaExtensionPassSelector {
    constructor() {
        this.container = document.createElement('div');

        const selectBrowserTitle = document.createElement('span');
        selectBrowserTitle.className = 'select-title';
        selectBrowserTitle.textContent = l.install_extension_select_browser;

        const extensionCardList = this.createExtensionCardList();
        this.container.append(selectBrowserTitle, extensionCardList);
    }

    createExtensionCardList() {
        const cardList = document.createElement('div');
        cardList.className = 'card-select-container';

        this.cardGroup = new CardGroup({
            cards: this.getExtensionCardData(cardList),
            onClick: () => {
                mega.ui.pm.utils.toggleButtonState(this.container, 'primary', false);
            }
        });

        return cardList;
    }

    getExtensionCardData(parentNode) {
        return [
            { value: 'Google', icon: 'sprite-fm-uni icon-chrome', title: l.google },
            { value: 'Edgium', icon: 'sprite-fm-uni icon-edge', title: l.edge },
            { value: 'Firefox', icon: 'sprite-fm-uni icon-firefox', title: l.firefox },
        ].map(item => ({ ...item, parentNode, selected: false, iconSize: 48 }));
    }

    installExtension() {
        const url = mega.ui.header.getPwmExtensionUrl(this.cardGroup.value);
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
