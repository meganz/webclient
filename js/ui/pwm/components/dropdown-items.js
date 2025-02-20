class MegaDropdownItemList {
    constructor(options) {
        const listItems = {};
        const keys = Object.keys(options.dropdownItems);

        this.dropdownMenu = options.dropdown.dropdownMenu = new MegaPMMenu({
            parentNode: options.optionsWrap,
            componentClassname: 'menu-container dropdown-menu',
            wrapperClassname: 'dropdown'
        });

        this.dropdownMenu.calcPosition = () => {
            if (!this.dropdownMenu.visible) {
                return;
            }

            var POPUP_HEIGHT = window.innerHeight;
            var POPUP_WIDTH = window.innerWidth;

            options.optionsWrap.classList.remove('top', 'right');

            const {bottom, left} = this.dropdown.domNode.getBoundingClientRect();
            const menuWidth = parseFloat(this.dropdownMenu.domNode.offsetWidth);
            const menuHeight = parseFloat(this.dropdownMenu.domNode.offsetHeight);

            // check if top is at the second half of the popup.
            // if so, show the context menu dialog above the target element
            if (bottom + menuHeight > POPUP_HEIGHT - mega.ui.pm.POPUP_TOP_MARGIN) {
                options.optionsWrap.classList.add('top');
            }

            // show the dialog right side of the target element if position exceeds the max width
            if (left + mega.ui.pm.POPUP_SIDE_MARGIN + menuWidth > POPUP_WIDTH - mega.ui.pm.POPUP_SIDE_MARGIN) {
                options.optionsWrap.classList.add('right');
            }
        };

        this.dropdown = options.dropdown;

        // if title exists
        if (options.dropdownOptions.titleText) {
            this.title = options.dropdownOptions.titleText;

            this.setTitle();
        }

        // Create the list items domNode early so we can reference it throughout
        // our code
        this.listContainer = mCreateElement('ul', {'class': 'list-items'});

        // filter items with search term
        const _filterItems = (val) => {
            let hideResultNode = false;

            for (let i = keys.length; i--;) {
                const item = listItems[keys[i]];

                if (!val || item.textContent.toLowerCase().includes(val)) {
                    item.classList.remove('hidden');
                    hideResultNode = true;
                }
                else {
                    item.classList.add('hidden');
                }
            }

            if (hideResultNode) {
                this.listContainer.classList.remove('hidden');
                this.noResults.classList.add('hidden');
                return;
            }

            this.listContainer.classList.add('hidden');
            this.noResults.classList.remove('hidden');
        };

        // if search field is required
        if (options.dropdownOptions.search) {
            this.searchNode = document.createElement('div');
            this.searchNode.className = 'search-box-wrapper';

            const subNode = document.createElement('input');
            subNode.type = 'text';
            subNode.placeholder = options.dropdownOptions.placeholderText;
            subNode.id = 'dropdown_search';
            subNode.className = 'search-box pmText clearButton no-title-top with-icon';
            this.searchNode.append(subNode);

            this.dropdownMenu.on('click', () => {
                // Only clear input if dropdownMenu is active
                if (this.dropdownMenu.visible) {
                    this.searchInput.setValue('');
                    this.searchList(_filterItems);
                }
            });

            // megainputs
            this.searchInput = new mega.ui.MegaInputs($(subNode)
                .data('icon', 'sprite-pm-mono icon-search-thin-outline'));
            this.searchInput.$input.rebind('input.search', e =>
                this.searchList(_filterItems, e.target.value.trim()));

            // no results
            this.noResults = mCreateElement('div', {'class': 'no-results hidden'}, [
                mCreateElement('h2', {}, [document.createTextNode(options.resultText.title || "")]),
                mCreateElement('span', {}, [
                    document.createTextNode(options.resultText.caption || options.resultText || "")
                ])
            ]);
            this.noResults.templates = Object.create(null);
            this.noResults.templates.title = (options.resultText.title || '').includes("%") && options.resultText.title;
            this.noResults.templates.caption = (options.resultText.caption || '').includes("%")
                && options.resultText.caption;
        }

        // build dropdown items list
        if (options.listContainerClass) {
            this.listContainer.classList.add(options.listContainerClass);
        }

        this.listContainer.tabindex = 0;
        this.selected = false;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            const dItemContainerOptions = {
                parentNode: this.listContainer,
                text: options.dropdownItems[key].text || options.dropdownItems[key],
                subtext: options.dropdownItems[key].subtext,
                type: 'fullwidth',
                rightIcon: 'sprite-pm-mono icon-check-thin-outline hidden',
                rightIconSize: '24',
                nodeType: 'li',
                componentClassname: 'text-only list-item'
            };

            const tappableListItem = new MegaInteractable(dItemContainerOptions);
            const targetNode = tappableListItem.domNode;

            targetNode.dataset.value = key;

            // set selected option
            if (options.selected && key === options.selected) {
                targetNode.ariaSelected = true;
                targetNode.classList.add('focused');
                targetNode.lastElementChild.classList.remove('hidden');
                this.selected = targetNode;
            }
            else {
                targetNode.ariaSelected = false;
            }

            listItems[key] = targetNode;

            tappableListItem.on('click', ({currentTarget}) => {
                const item = currentTarget.domNode.dataset.value;

                if (this.selected) {
                    this.selected.classList.remove('focused');
                    this.selected.lastElementChild.classList.add('hidden');
                    this.selected.ariaSelected = false;
                }

                listItems[item].classList.add('focused');
                listItems[item].lastElementChild.classList.remove('hidden');
                listItems[item].ariaSelected = true;
                this.selected = listItems[item];

                // replace placeholder with the selected text
                this.dropdown.selected = item;
                this.dropdownMenu.hide();
                this.dropdownMenu.trigger('close');
                this.dropdown.trigger('selectItem');

                // clear search and rerender the list
                if (options.dropdownOptions.search && this.searchInput.$input.val()) {
                    this.searchInput.$input.val('');
                    this.searchList(_filterItems);
                }

                return false;
            });
        }
    }

    searchList(filterItems, val) {
        if (!this.searchNode) {
            return;
        }

        delay('dropdown.search', () => {
            // Pass lowercase value (if it exists) to filterItems
            if (val) {
                val = val.toLowerCase();
            }

            filterItems(val);
        }, 300);

        if (val) {
            if (this.noResults.templates.title) {
                this.noResults.querySelector('h2').innerText = this.noResults.templates.title.replace("%1", val);
            }
            if (this.noResults.templates.caption) {
                this.noResults.querySelector('span').innerText = this.noResults.templates.caption.replace("%1", val);
            }
        }
    }

    rerender(options) {
        const option = {
            name: options.name,
            contents: [this.searchNode, this.noResults, this.listContainer],
            event: options.event
        };

        if (this.selected && options.scrollTo) {
            this.dropdownMenu.scrollTo(this.selected);
        }

        if (this.title) {
            this.setTitle();
        }

        this.dropdownMenu.show(option);
    }

    setTitle() {
        this.dropdownMenu.addTitle(this.title);
    }
}
