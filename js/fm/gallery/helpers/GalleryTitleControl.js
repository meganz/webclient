class GalleryTitleControl extends MComponent {
    buildElement() {
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'flex flex-row items-center text-ellipsis');

        this.attachIcon();
        this.attachTitle();
    }

    get filterSection() {
        return this._filterSection || '';
    }

    get locationPrefKey() {
        return `web.locationPref.${this.filterSection}`;
    }

    /**
     * Set the filter section
     * @param {String} section Gallery section to filter
     * @type {String}
     */
    set filterSection(section) {
        if (!mega.gallery.sections[section]) {
            return;
        }

        this.isClickable = section !== 'favourites';

        section = mega.gallery.sections[section].root;

        if (this.isClickable) {
            this._filterSection = section;
            this.initMenu();
            this.resetItemOptions();
        }
    }

    get title() {
        return this._title || '';
    }

    /**
     * @param {String} title Title of the block
     */
    set title(title) {
        if (this._title !== title) {
            this._title = title;
            this.titleEl.textContent = title;
        }
    }

    get icon() {
        return this._icon || '';
    }

    /**
     * @param {String} icon Icon prepending the title
     */
    set icon(icon) {
        if (this._icon !== icon) {
            this._icon = icon;
            this.iconEl.setAttribute('class', 'sprite-fm-mono icon-' + icon);
        }
    }

    get isClickable() {
        return this._isClickable === true;
    }

    /**
     * @param {Boolean} status Whether control is clickable at the moment or not
     */
    set isClickable(status) {
        this._isClickable = status;

        if (status) {
            this.el.classList.add('cursor-pointer');
            this.attachCaret();

            this.attachEvent('click', () => {
                this.toggleMenu();
            });
        }
        else {
            this.el.classList.remove('cursor-pointer');
            this.detachCaret();
            this.disposeEvent('click');
        }
    }

    /**
     * @type {String}
     */
    get allItemsTitle() {
        return l.gallery_all_locations;
    }

    /**
     * @type {String}
     */
    get cuFolder() {
        return 'camera-uploads-' + this._filterSection;
    }

    /**
     * @type {String}
     */
    get cdFolder() {
        return 'cloud-drive-' + this._filterSection;
    }

    /**
     * @param {String} location Location preference to push to API
     * @returns {void}
     */
    pushNewLocationPreference(location) {
        if (this.rootBtn) {
            this.rootBtn.dataset.locationPref = location;
        }

        if (this.filterSection === 'photos') {
            const galleryBtn = document.querySelector('.nw-fm-left-icon.gallery');

            if (galleryBtn) {
                galleryBtn.dataset.locationPref = location;
            }
        }

        mega.gallery.prefs.init().then(({ setItem }) => {
            setItem(this.locationPrefKey, location);
        });
    }

    clearLocationPreference() {
        if (this.rootBtn && this.rootBtn.dataset.locationPref) {
            delete this.rootBtn.dataset.locationPref;
        }

        mega.gallery.prefs.init().then(({ removeItem }) => {
            removeItem(this.locationPrefKey);
        });
    }

    /**
     * @param {String} location Location to open
     * @returns {void}
     */
    openLocationFolder(location) {
        if (this.rootBtn && this.rootBtn.dataset.locationPref) {
            tryCatch(
                () => {
                    this.pushNewLocationPreference(location);
                },
                () => {
                    console.warn('Cannot set the preference for the location');
                }
            )();
        }

        this._menu.ignorePageNavigationOnce = true;
        M.openFolder(location, true);
    }

    attachTitle() {
        this.titleEl = document.createElement('span');
        this.el.append(this.titleEl);
    }

    addTooltipToTitle() {
        if (this.titleEl) {
            this.titleEl.classList.add('text-ellipsis', 'simpletip', 'simpletip-tc');
        }
    }

    removeTooltipFromTitle() {
        if (this.titleEl) {
            this.titleEl.classList.remove('text-ellipsis', 'simpletip', 'simpletip-tc');
        }
    }

    attachIcon() {
        this.iconEl = document.createElement('i');
        this.el.append(this.iconEl);
    }

    attachCaret() {
        if (this._caret) {
            return;
        }

        this._caret = document.createElement('span');
        this._caret.classList.add('nw-fm-tree-arrow', 'rot-90', 'ml-1');
        this.el.append(this._caret);
    }

    detachCaret() {
        if (this._caret) {
            this.el.removeChild(this._caret);
            delete this._caret;
        }
    }

    resetItemOptions() {
        this.rootBtn = document.querySelector(`.js-lp-gallery .btn-galleries[data-link=${this.filterSection}]`);

        this._menu.options = [
            {
                label: l.show_items_from
            },
            {
                label: this.allItemsTitle,
                click: () => {
                    this.openLocationFolder(this._filterSection);
                },
                selectable: true,
                selected: M.currentdirid === this._filterSection
            },
            {
                label: l.gallery_from_cloud_drive,
                click: () => {
                    this.openLocationFolder(this.cdFolder);
                },
                selectable: true,
                selected: M.currentdirid === this.cdFolder
            },
            {
                label: l.gallery_camera_uploads,
                click: () => {
                    this.openLocationFolder(this.cuFolder);
                },
                selectable: true,
                selected: M.currentdirid === this.cuFolder
            },
            {
                label: () => {
                    const label = document.createElement('div');
                    label.className = 'flex-1 flex flex-row items-center remember-location-pref';

                    const span = document.createElement('span');
                    span.className = 'flex-1';
                    span.textContent = l.gallery_remember_location_pref;

                    const checkbox = new MCheckbox({
                        name: 'remember_location_pref',
                        id: 'remember-location-pref',
                        checked: false,
                        passive: true
                    });

                    mega.gallery.prefs.init().then(({ getItem }) => {
                        const location = getItem(this.locationPrefKey);
                        checkbox.checked = typeof(location || null) === 'string';
                    });

                    const onChange = (status) => {
                        checkbox.disabled = true;

                        tryCatch(
                            () => {
                                if (status) {
                                    this.pushNewLocationPreference(M.currentdirid);
                                }
                                else {
                                    this.clearLocationPreference();
                                }

                                checkbox.disabled = false;
                                checkbox.checked = status;
                            },
                            () => {
                                console.warn('Could not update location preference...');
                            }
                        )();
                    };

                    span.onclick = () => {
                        onChange(!checkbox.checked);
                    };

                    checkbox.onChange = (status) => {
                        onChange(status);
                    };

                    label.appendChild(span);
                    label.appendChild(checkbox.el);
                    return label;
                },
                additionalClasses: 'px-6'
            }
        ];
    }

    initMenu() {
        if (!this._menu) {
            this._menu = new MMenuSelect(this.el, ['item-bold'], false);
            this._menu.width = 200;
        }
    }

    toggleMenu() {
        this.initMenu();
        this._menu.toggle();
    }

    hide() {
        if (this._menu) {
            this._menu.hide();
        }
    }
}
