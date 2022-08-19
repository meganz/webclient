class GalleryEmptyFavourites extends MEmptyPad {
    constructor(parent) {
        super(parent);
        this.setContents();
    }

    setContents() {
        this.el.append(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-empty-state-favourite'));
        this.el.append(MEmptyPad.createTxt(l.gallery_favourites_empty, 'fm-empty-cloud-txt'));
    }
}
