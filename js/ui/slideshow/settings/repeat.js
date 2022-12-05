lazy(mega.slideshow.settings, 'repeat', () => {
    'use strict';

    const name = 'repeat';

    return new class SlideshowRepeatSetting extends mega.slideshow.settings.switch {
        /**
         * repeat setting handler
         * @returns {SlideshowRepeatSetting} instance
         */
        constructor() {
            super(name, 1);
        }
    };
});
