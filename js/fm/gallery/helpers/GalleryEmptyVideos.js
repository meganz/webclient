class GalleryEmptyVideos extends MEmptyPad {
    constructor(parent) {
        super(parent);
        this.setContents();
    }

    setContents() {
        this.el.append(MEmptyPad.createIcon('section-icon sprite-fm-theme icon-gallery-videos'));
        this.el.append(MEmptyPad.createTxt(l.gallery_no_videos, 'fm-empty-cloud-txt'));
        this.el.append(MEmptyPad.createTxt(l.gallery_get_start, 'fm-empty-description'));

        this.appendOptions([
            [l.gallery_get_start_instruction_1, 'sprite-fm-mono icon-camera-uploads'],
            [l.gallery_get_start_instruction_2, 'sprite-fm-mono icon-mobile'],
            [l.gallery_get_start_instruction_3, 'sprite-fm-mono icon-pc']
        ]);
    }
}
