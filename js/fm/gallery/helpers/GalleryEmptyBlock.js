class GalleryEmptyBlock {
    constructor(parent) {
        if (typeof parent === 'string') {
            parent = document.querySelector(parent);
        }

        this.el = document.createElement('div');

        if (parent) {
            parent.append(this.el);
        }
    }

    /**
     * @param {String} type Section type for showing as empty
     */
    set type(type) {
        this._type = type;
        this.el.setAttribute('class', 'fm-empty-section fm-empty-' + type);
    }

    show() {
        this.removeChild();

        switch (this._type) {
            case mega.gallery.sections.photos.path:
            case mega.gallery.sections[mega.gallery.secKeys.cuphotos].path:
            case mega.gallery.sections[mega.gallery.secKeys.cdphotos].path:
                this._child = new GalleryEmptyPhotos(this.el);
                break;
            case mega.gallery.sections.images.path:
            case mega.gallery.sections[mega.gallery.secKeys.cuimages].path:
            case mega.gallery.sections[mega.gallery.secKeys.cdimages].path:
                this._child = new GalleryEmptyImages(this.el);
                break;
            case mega.gallery.sections.videos.path:
            case mega.gallery.sections[mega.gallery.secKeys.cuvideos].path:
            case mega.gallery.sections[mega.gallery.secKeys.cdvideos].path:
                this._child = new GalleryEmptyVideos(this.el);
                break;
            case mega.gallery.sections.favourites.path:
                this._child = new GalleryEmptyFavourites(this.el);
                break;
            default:
                if (M.currentrootid === 'discovery' || M.gallery) {
                    this._child = new GalleryEmptyDiscovery(this.el);
                }
                break;
        }
    }

    removeChild() {
        if (this._child) {
            this._child.remove();
            delete this._child;
        }
    }

    hide() {
        this.removeChild();
        this.el.removeAttribute('class');
    }
}
