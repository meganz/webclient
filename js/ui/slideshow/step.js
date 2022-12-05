lazy(mega.slideshow, 'step', () => {
    'use strict';

    /**
     * Slideshow step handler to determine playlist next iteration use cases
     */
    return {
        /**
         * Return info about next playlist iteration
         * @param {Number} playIndex - playlist index
         * @returns {Object} - backward & forward node ids for next steps
         */
        next: (playIndex) => {
            const {file, settings, playlist, manager} = mega.slideshow;

            const {isPlayMode} = manager.state;
            const isRepeat = settings.repeat.getValue();
            const playListLength = playlist.items.length;
            const nextStep = {};

            let prevPlayIndex;
            let nextPlayIndex;

            switch (playIndex) {
                case undefined:
                case -1:
                    break;
                case 0:
                    if (!isPlayMode || isRepeat) {
                        prevPlayIndex = playListLength - 1;
                    }
                    nextPlayIndex = 1;
                    break;
                case playListLength - 1:
                    prevPlayIndex = playIndex - 1;
                    if (!isPlayMode || isRepeat) {
                        nextPlayIndex = 0;
                    }
                    break;
                default:
                    prevPlayIndex = playIndex - 1;
                    nextPlayIndex = playIndex + 1;
            }

            if (prevPlayIndex !== undefined) {
                nextStep.backward = playlist.getNodeIdOnIndex(prevPlayIndex);
            }
            if (nextPlayIndex !== undefined) {
                nextStep.forward = playlist.getNodeIdOnIndex(nextPlayIndex);
            }
            else if (!file.state.isReady) {
                nextStep.forward = playlist.getNodeIdOnIndex(playIndex);
            }

            return nextStep;
        },

        /**
         * Return info about next playlist iteration when playlist is re-started from first item
         * @param {Number} playIndex - playlist index
         * @returns {Object} - backward & forward node ids for next steps
         */
        reset: (playIndex) => {
            const {playlist} = mega.slideshow;

            const playlistLength = playlist.items.length;

            let prevPlayIndex;
            let nextPlayIndex;

            if (playIndex === -1) {
                prevPlayIndex = playlistLength - 1;
                nextPlayIndex = 0;
            }
            else {
                prevPlayIndex = playlistLength - (playIndex === playlistLength - 1 ? 2 : 1);
                nextPlayIndex = playIndex === 0 ? 1 : 0;
            }

            return {
                backward: playlist.getNodeIdOnIndex(prevPlayIndex),
                forward: playlist.getNodeIdOnIndex(nextPlayIndex)
            };
        },
    };
});
