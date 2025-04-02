lazy(mega.gallery, 'GalleryTitleControl', () => {
    'use strict';

    const scope = mega.gallery;

    class GalleryTitleControl extends MComponent {
        constructor(parent) {
            super(parent, null);

            this.attachTitle();
            this._parent.prepend(this.el);
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'fm-filter-chip-button flex flex-row gap-2';
        }

        get filterSection() {
            return this._filterSection || '';
        }

        /**
         * Set the filter section
         * @param {String} section Gallery section to filter
         * @type {String}
         */
        set filterSection(section) {
            if (!scope.sections[section]) {
                return;
            }

            this.isClickable = section !== 'favourites';

            section = scope.sections[section].root;

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
            return `camera-uploads-${this._filterSection}`;
        }

        /**
         * @type {String}
         */
        get cdFolder() {
            return `cloud-drive-${this._filterSection}`;
        }

        /**
         * @param {String} location Location preference to push to API
         * @returns {void}
         */
        pushNewLocationPreference(location) {
            if (this.mediaLink) {
                this.mediaLink.href = `/fm/${location}`;
                this.mediaLink.dataset.section = this.mediaLink.href;
                this.mediaLink.dataset.locationPref = location;
            }

            mega.ccPrefs.setItem(`web.locationPref.${this.filterSection}`, location).catch(tell);
        }

        clearLocationPreference() {
            if (this.mediaLink && this.mediaLink.dataset.locationPref) {
                delete this.mediaLink.dataset.locationPref;
                this.mediaLink.href = '/fm/photos';
                this.mediaLink.dataset.section = this.mediaLink.href;
            }

            mega.ccPrefs.removeItem('web.locationPref.photos').catch(dump);
        }

        /**
         * @param {String} location Location to open
         * @returns {void}
         */
        openLocationFolder(location) {
            if (this.mediaLink && this.mediaLink.dataset.locationPref) {
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
            this.titleEl.className = 'whitespace-nowrap';
            this.el.appendChild(this.titleEl);
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

        attachCaret() {
            if (this._caret) {
                return;
            }

            this._caret = document.createElement('span');
            this._caret.classList.add('nw-fm-tree-arrow', 'rot-90', 'ml-1');
            this.el.appendChild(this._caret);
        }

        detachCaret() {
            if (this._caret) {
                this.el.removeChild(this._caret);
                delete this._caret;
            }
        }

        toggleHighlight(id) {
            if (id === this.cuFolder || id === this.cdFolder) {
                this.el.classList.add('selected');
            }
            else {
                this.el.classList.remove('selected');
            }
        }

        resetItemOptions() {
            this.mediaLink = mega.ui.topmenu.menuNode.querySelector('.media');

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

                        mega.ccPrefs.getItem('web.locationPref.photos')
                            .then((location) => {
                                checkbox.checked = typeof location === 'string';
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
                this._menu = new MMenuSelect(this.el, [], false);
                this._menu.width = 200;
                this._menu.onHide = () => {
                    if (this.onResize) {
                        window.removeEventListener('resize', this.onResize);
                        delete this.onResize;
                    }
                };
            }
        }

        toggleMenu() {
            this.initMenu();
            this._menu.toggle();
            const rtl = document.body.classList.contains('rtl');
            if (this._menu.isShowing && rtl && !this.onResize) {
                this.onResize = SoonFc(90, () => {
                    let { x, bottom, width } = this.el.getBoundingClientRect();
                    bottom += MContextMenu.offsetVert;
                    x += width;
                    this._menu.setPositionByCoordinates(x, bottom);
                });
                window.addEventListener('resize', this.onResize);
            }
            else if (rtl && this.onResize) {
                window.removeEventListener('resize', this.onResize);
                delete this.onResize;
            }
        }

        hide() {
            if (this._menu) {
                this._menu.hide();
            }
        }
    }

    return GalleryTitleControl;
});
