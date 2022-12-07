lazy(mega.slideshow, 'manager', () => {
    'use strict';

    return new class SlideshowManager {
        /**
         * Slideshow manager / facade exposing slideshow playlist items operations.
         * Handle 2 different slideshow modes pointed out by "isPlayMode" state property
         * @returns {SlideshowManager} instance
         */
        constructor() {
            // state properties defining this function behavior
            this.state = {
                isPlayMode: false,
                isReset: false,
                nodes: null,
                filter: null,
                getNodeIdOnIndex: null
            };

            Object.freeze(this);
        }

        /**
         * Update state properties and playlist items
         * "mega.slideshow.file.fetch" can be fired while is in progress. In that case, current fetch will be aborted
         * before starting a new one
         * @param {Object} behavior definition
         * @returns {void}
         */
        setState({
            nodes,
            currentNodeId,
            isPlayMode,
            isReset,
            isAbortFetch,
            isChangeOrder,
            isNotBuildPlaylist
        }) {
            const {utils, file, settings, playlist} = mega.slideshow;

            this.state.isPlayMode = isPlayMode === undefined ? this.state.isPlayMode : isPlayMode;
            this.state.isReset = isReset === undefined ? this.state.isReset : isReset;
            this.state.nodes = nodes ? () => nodes : () => M.v;
            this.state.filter = utils.filterNodes(nodes, this.state.isPlayMode);
            this.state.getNodeIdOnIndex = (i) => utils.getNodeIdOnIndex(this.state.nodes()[i]);

            let hasToBuildPlaylist = !isNotBuildPlaylist && (!isAbortFetch || !this.state.isPlayMode);
            if (isAbortFetch) {
                file.abort();
                if (!isNotBuildPlaylist && settings.sub.getValue() && !utils.isCurrentDirFlat()) {
                    utils.setCurrentDir();
                    hasToBuildPlaylist = false;
                }
            }
            else if (!isChangeOrder && this._isFetchAllowed()) {
                if (!file.state.isReady) {
                    file.abort();
                }
                // give "file.abort" time to be effective
                delay('slideshow:fetch', () => file.fetch().catch(dump), 200);
            }

            if (hasToBuildPlaylist) {
                playlist.build(currentNodeId);
            }
        }

        /**
         * Return info about next playlist iteration
         * @param {String} nodeId - node id
         * @returns {Object} next playlist iteration
         */
        next(nodeId) {
            const {step, playlist} = mega.slideshow;

            const playLength = playlist.items.length;
            let next = {playLength};

            if (playlist.items.length > 1) {
                const {playIndex, node} = playlist.findNode(nodeId);

                const nextStep = node === undefined || this.state.isPlayMode && this.state.isReset ?
                    step.reset(playIndex) :
                    step.next(playIndex);

                next = {...next, node, playIndex, ...nextStep};
            }

            this.state.isReset = false;
            return next;
        }

        /**
         * Check if playlist item on index passed as argument is the last no the playlist
         * @param {Number} playIndex - playlist index
         * @returns {Boolean} whether current item is the last on the playlist
         */
        isLast(playIndex) {
            const {file, settings, playlist} = mega.slideshow;

            return playlist.items.length < 2 ||
                file.state.isReady &&
                !settings.repeat.getValue() &&
                playIndex === playlist.items.length - 1;
        }

        /**
         * Check if fetching items is allowed
         * @returns {Boolean} whether fetching items is allowed
         */
        _isFetchAllowed() {
            const {utils, settings, playlist} = mega.slideshow;

            return this.state.isPlayMode &&
                !utils.isCurrentDirFlat() &&
                settings.sub.getValue() &&
                !playlist.isFull();
        }
    };
});
