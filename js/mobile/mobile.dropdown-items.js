class MegaMobileDropdownItemList {
    constructor(options) {
        const listItems = {};
        const keys = Object.keys(options.dropdownItems);
        this.sheet = mega.ui.sheet;
        this.sheetHeight = options.sheetHeight;

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
            subNode.className = 'search-box underlinedText clearButton no-title-top with-icon';
            this.searchNode.append(subNode);

            this.sheet.on('tap', () => {
                // Only clear input if sheet is active
                if (!(this.sheet.domNode.classList.contains('active'))) {
                    this.$megaInput.$input.val('');
                    this.searchList(_filterItems);
                }
            });

            this.sheet.addContent(this.searchNode);

            // megainputs
            this.$megaInput = new mega.ui.MegaInputs($(subNode)
                .data('icon', 'sprite-mobile-fm-mono icon-search-thin-outline'));
            this.$megaInput.$wrapper.addClass('box-style mobile');
            this.$megaInput.$input.rebind('input.search', e =>
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

            this.sheet.addContent(this.noResults);
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
                rightIcon: 'sprite-mobile-fm-mono icon-check-thin-outline hidden',
                rightIconSize: '24',
                nodeType: 'li',
                componentClassname: 'text-only list-item'
            };

            const tappableListItem = new MegaMobileTappable(dItemContainerOptions);
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

            tappableListItem.on('tap', (e) => {
                const item = e.target.domNode.dataset.value;

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
                this.dropdown.setSelectedOption(listItems[item].innerText, item);

                this.sheet.hide();

                this.dropdown.trigger('selectItem');

                // clear search and rerender the list
                if (options.dropdownOptions.search && this.$megaInput.$input.val()) {
                    this.$megaInput.$input.val('');
                    this.searchList(_filterItems);
                }
            });
        }

        this.sheet.addContent(this.listContainer);
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

    rerender() {
        this.sheet.clear();

        if (this.title) {
            this.setTitle();
        }

        if (this.searchNode) {
            this.sheet.addContents([this.searchNode, this.noResults]);
        }

        this.sheet.addContent(this.listContainer);
    }

    show() {
        if (this.selected) {
            this.sheet.scrollTo(this.selected);
        }

        this.sheet.height = this.sheetHeight;

        this.sheet.show();
    }

    setTitle() {
        this.sheet.addTitle(this.title);
    }
}
