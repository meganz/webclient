class GalleryEmptyDiscovery extends MEmptyPad {
    constructor(parent) {
        super(parent);
        this.setContents();
    }

    setContents() {
        this.el.append(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-photos'));
        this.el.append(MEmptyPad.createTxt(l.gallery_no_photos, 'fm-empty-cloud-txt empty-md-title'));
        this.el.append(MEmptyPad.createTxt(l.md_empty_descr, 'fm-empty-description empty-md-description'));
    }
}
