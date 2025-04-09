class CardGroup extends MegaComponentGroup {
    constructor(options) {
        super();

        this.value = '';

        for (const card of options.cards) {
            const cardComponent = new MegaCard({
                parentNode: card.parentNode,
                icon: card.icon,
                iconSize: card.iconSize,
                text: card.title,
                subtext: card.subtitle,
                value: card.value,
                onClick: options.onClick,
                selected: card.selected || false,
                group: this
            });

            this.addChild(card.value, cardComponent);

            if (card.selected) {
                this.value = card.value;
                cardComponent.addClass('selected');
            }

            cardComponent.on('click.cardgroup', () => {
                this.value = card.value;

                this.applyDomChange();
            });
        }
    }

    applyDomChange() {
        this.each(card => {
            if (card.value === this.value) {
                card.addClass('selected');
            }
            else {
                card.removeClass('selected');
            }
        });
    }

    setValue(value) {
        if (value !== this.value) {

            const child = this.getChild(value);

            if (child) {
                child.trigger('click');
            }
        }
    }
}
