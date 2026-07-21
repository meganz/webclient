lazy(mega.slideshow.settings, 'caption', () => {
    'use strict';

    const name = 'caption';

    return new class SlideshowCaptionSetting extends mega.slideshow.settings.switch {
        constructor() {
            super(name, 0);
        }

        /**
         * Draw the caption for the current file: name, description, and date
         * @param {*} [n] node to describe
         * @returns {void}
         */
        draw(n) {
            const $caption = $('.media-viewer-container .content .slideshow-caption');

            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }
            if (!n) {
                n = M.getNodeByHandle(slideshow_handle());
            }

            if (!n || !this.getValue()) {
                $caption.addClass('hidden');
                return;
            }

            const ts = n.mtime || n.ts;
            $('.caption-name', $caption).text(n.name || '');
            $('.caption-date', $caption).text(ts ? time2date(ts) : '').toggleClass('hidden', !ts);
            $('.caption-desc', $caption).text(n.des || '').toggleClass('hidden', !n.des);
            $caption.removeClass('hidden');
        }

        onConfigChange(_, name, cfg) {
            if (name === this.name && cfg !== undefined) {
                this.draw();
            }
        }
    };
});
