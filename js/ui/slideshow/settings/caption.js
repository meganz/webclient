lazy(mega.slideshow.settings, 'caption', () => {
    'use strict';

    const name = 'caption';

    return new class SlideshowCaptionSetting extends mega.slideshow.settings.switch {
        constructor() {
            super(name, 0);

            this.$captions = $('.media-viewer-container .content .slideshow-caption');
            this.captions = this.$captions.toArray().map((el) => ({
                $caption: $(el),
                $name: $('.caption-name', el),
                $date: $('.caption-date', el),
                $desc: $('.caption-desc', el)
            }));
            this.shown = null;
            this.next = null;
            this.size = null;
        }

        position() {
            const $media = $('.media-viewer-container .content img.active, .media-viewer-container .content video');
            this.positionTo($media.first());
        }

        /**
         * Draw the caption for the current file: name, description, and date
         * @param {*} [n] node to describe
         * @returns {void}
         */
        draw(n) {
            if (typeof n === 'string') {
                n = M.getNodeByHandle(n);
            }
            if (!n) {
                n = M.getNodeByHandle(slideshow_handle());
            }

            const value = this.getValue();
            if (!n || !value) {
                this.$captions.addClass('hidden').removeClass('active');
                this.shown = null;
                this.next = null;
                return;
            }

            const next = this.shown === this.captions[0] ? this.captions[1] : this.captions[0];
            if (!next) {
                return;
            }

            if (this.shown) {
                this.shown.$caption.removeClass('active');
            }

            const des = n.des || '';
            if (!des) {
                this.next = null;
                return;
            }

            next.$name.text(des);
            // @todo add back handling for time + name with new options
            // const ts = n.mtime || n.ts;
            // const des = n.des;
            // next.$name.text(n.name || '');
            // next.$date.text(ts ? time2date(ts) : '').toggleClass('hidden', !ts);
            // next.$desc.text(des || '').toggleClass('hidden', !des);

            next.$caption.removeClass('hidden');
            this.next = next;
        }

        onConfigChange(_, name, cfg) {
            if (name !== this.name || cfg === undefined) {
                return;
            }
            this.$captions.addClass('no-trans');
            this.draw();
            this.position();
            requestAnimationFrame(() => requestAnimationFrame(() => this.$captions.removeClass('no-trans')));
        }

        positionTo($target, size) {
            if (size !== undefined) {
                this.size = size;
            }
            const caption = this.next || this.shown;
            if (!$target.length || !caption) {
                return;
            }
            const { $caption } = caption;
            if ($caption.hasClass('hidden') || !$caption[0].offsetParent) {
                return;
            }

            let { videoWidth, videoHeight } = $target[0];
            const { top, left, width, height } = $target[0].getBoundingClientRect();
            if (!width) {
                return;
            }

            if (videoWidth === 0 && this.size) {
                videoWidth = this.size.width;
                videoHeight = this.size.height;
            }

            const scale = videoWidth ? Math.min(width / videoWidth, height / videoHeight) : 0;
            const shownWidth = scale ? videoWidth * scale : width;
            const shownHeight = scale ? videoHeight * scale : height;
            const right = left + (width + shownWidth) / 2;
            const bottom = top + (height + shownHeight) / 2;
            const { top: parentTop, left: parentLeft } = $caption[0].offsetParent.getBoundingClientRect();
            $caption.css('left', `${right - parentLeft - 16}px`);
            $caption.css('top', `${bottom - parentTop - 16}px`);
            $caption.css('max-width', `${shownWidth - 32}px`);

            if (this.next) {
                $caption.toggleClass('no-fade', videoWidth !== undefined);
                this.$captions.removeClass('active');
                $caption.addClass('active');
                this.shown = this.next;
                this.next = null;
            }
        }
    };
});
