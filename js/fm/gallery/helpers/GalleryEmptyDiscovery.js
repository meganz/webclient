class GalleryEmptyDiscovery extends MEmptyPad {
    constructor(parent) {
        super(parent);
        this.setContents();
    }

    setContents() {
        this.el.append(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-photos'));
        this.el.append(MEmptyPad.createTxt(l.gallery_media_discovery, 'fm-empty-cloud-txt'));
        this.el.append(MEmptyPad.createTxt(l.gallery_get_start, 'fm-empty-description'));

        this.appendOptions([
            [l.gallery_get_start_instruction_4, 'sprite-fm-mono icon-camera-uploads']
        ]);
    }
}
