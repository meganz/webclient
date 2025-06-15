class MegaTopNav extends MegaComponent {
    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        const loggedContainer = document.createElement('div');
        loggedContainer.className = 'logged-header';

        const subNode = document.querySelector('.top-container');
        subNode.append(loggedContainer);

        const searchInput = document.createElement('input');
        searchInput.className = 'form-element pmText no-title-top clearButton';
        searchInput.placeholder = l[102];
        searchInput.disabled = true;
        searchInput.dataset.icon = 'sprite-pm-mono icon-search-light-outline left-icon';
        loggedContainer.append(searchInput);

        const searchMegaInput = new mega.ui.MegaInputs($(searchInput));
        this.searchMegaInput = searchMegaInput;
        searchMegaInput.$wrapper.addClass('search-bar disabled');

        let wasBlurred = true;
        let isFocused = false;

        searchMegaInput.$input.on('focus', () => {
            if (searchMegaInput.$input.val().length === 0) {
                isFocused = true;
            }
        });

        searchMegaInput.$input.on('input', () => {
            const inputValue = searchMegaInput.$input.val();

            delay('passwordlist.search', () => {
                mega.ui.pm.list.searchList(inputValue);
                if (wasBlurred && isFocused && !!inputValue) {
                    eventlog(500540);
                    wasBlurred = false;
                }
            }, 1000);
        });

        searchMegaInput.$input.on('blur', () => {
            isFocused = false;
            wasBlurred = true;
        });

        const addItemBtn = new MegaButton({
            parentNode: loggedContainer,
            text: l.add_item_btn,
            icon: 'sprite-pm-mono icon-plus-light-solid',
            componentClassname: 'add-btn',
            iconSize: 24
        });
        addItemBtn.on('click', () => {
            if (!mega.ui.passform) {
                mega.ui.passform = new PasswordItemForm();
            }

            mega.ui.passform.show({
                type: 'create'
            });

            eventlog(500535);
        });
    }

    update() {
        if (u_sid) {
            this.addClass('logged-in');
        }
        else {
            this.removeClass('logged-in');
        }
    }

    enableSearch() {
        this.searchMegaInput.$input[0].disabled = false;
        this.searchMegaInput.$wrapper.removeClass('disabled');
    }

    disableSearch() {
        this.searchMegaInput.$input[0].disabled = true;
        this.searchMegaInput.$wrapper.addClass('disabled');
        this.resetSearch();
    }

    resetSearch() {
        this.searchMegaInput.$input.val('');
        this.searchMegaInput.$input.blur();
    }
}

(mega => {
    "use strict";

    lazy(mega.ui, 'topnav', () => new MegaTopNav({
        parentNode: pmlayout.querySelector('.password-list-panel'),
        componentClassname: 'top-container',
        prepend: true
    }));

})(window.mega);
