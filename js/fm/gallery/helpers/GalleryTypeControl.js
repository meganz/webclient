lazy(mega.gallery, 'GalleryTypeControl', () => {
    'use strict';

    const scope = mega.gallery;

    const prefixes = ['cloud-drive-', 'camera-uploads-'];

    let selectedIndex = 0;

    /**
     * @param {String} type File type to work with
     * @returns {String} Location of the file type
     */
    const getLocation = (type) => {
        const section = scope.sections[M.currentdirid];

        if (section) {
            for (let i = 0; i < prefixes.length; i++) {
                const p = prefixes[i];

                if (section.path.startsWith(p)) {
                    return p + type;
                }
            }
        }

        return type;
    };

    class GalleryTypeControl extends MComponent {
        constructor(parent) {
            super(parent, null);

            this.attachTitle();
            this.attachCaret();
            this.attachEvent('click', this.toggleMenu.bind(this));

            this._parent.prepend(this.el);
        }

        buildElement() {
            this.el = document.createElement('div');
            this.el.className = 'fm-filter-chip-button flex flex-row gap-2';
        }

        attachTitle() {
            this.titleEl = document.createElement('span');
            this.el.appendChild(this.titleEl);
        }

        attachCaret() {
            const caret = document.createElement('span');
            caret.classList.add('nw-fm-tree-arrow', 'rot-90', 'ml-1');
            this.el.appendChild(caret);
        }

        updateTitle(root) {
            if (root === 'images') {
                this.titleEl.textContent = l.gallery_images;
                this.el.classList.add('selected');
                selectedIndex = 1;
            }
            else if (root === 'videos') {
                this.titleEl.textContent = l.gallery_videos;
                this.el.classList.add('selected');
                selectedIndex = 2;
            }
            else {
                this.titleEl.textContent = l[93];
                this.el.classList.remove('selected');
                selectedIndex = 0;
            }
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
            if (!this._menu) {
                this.initMenu();
                this._menu.options = [
                    {
                        label: l.filter_chip_type_all,
                        click: () => {
                            M.openFolder(getLocation('photos'), true);
                        },
                        selected: true,
                        selectable: true
                    },
                    {
                        label: l.gallery_images,
                        click: () => {
                            M.openFolder(getLocation('images'), true);
                        },
                        selectable: true
                    },
                    {
                        label: l.gallery_videos,
                        click: () => {
                            M.openFolder(getLocation('videos'), true);
                        },
                        selectable: true
                    }
                ];
            }

            this._menu.selectItem(selectedIndex);
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
    }

    return GalleryTypeControl;
});
