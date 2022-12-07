lazy(mega.slideshow, 'file', () => {
    'use strict';

    return new class SlideshowFile {
        /**
         * Slideshow file handler to fetch all subtree MegaNodes and media files to be displayed on slideshow playlist
         * @returns {SlideshowFile} instance
         */
        constructor() {
            // state properties defining this function behavior
            this.state = {
                isReady: true,
                isAbort: false
            };

            Object.freeze(this);
        }

        /**
         * Update state to abort node fetching immediately
         * @returns {void}
         */
        abort() {
            this.setState({isReady: true, isAbort: true});
        }

        /**
         * Fetch all subtree MegaNodes on chunks and fetch those files not already available.
         * Fetched and filtered files will be added to slideshow playlist
         * @returns {Promise<*>} void
         */
        async fetch() {
            const {utils, manager} = mega.slideshow;

            const {filter} = manager.state;
            const opts = Object.assign({limit: 200, offset: 0});
            const inflight = [];

            this.setState({isReady: false, isAbort: false});

            await fmdb.getchunk('f', opts, (chunk) => {
                if (this.state.isAbort) {
                    return false;
                }
                opts.offset += opts.limit;
                // TODO check! large chunk causes UI block
                // opts.limit = Math.min(122880, opts.limit << 1);

                const updateIds = [];
                const fetchIds = [];

                for (let i = chunk.length; i--;) {
                    const n = chunk[i];

                    if (n && !n.fv && !n.rr && filter(n)) {
                        if (!M.d[n.h]) {
                            fetchIds.push(n.h);
                        }
                        else if (!M.v.some((v) => v.h === n.h) && utils.isNodeInCurrentTree(n)) {
                            updateIds.push(n.h);
                        }
                    }
                }

                if (updateIds.length) {
                    this._update(updateIds);
                }

                if (fetchIds.length) {
                    inflight.push(
                        dbfetch.geta(fetchIds)
                            .then(() => this._update(fetchIds))
                            .catch(dump)
                    );
                }
            });

            if (this.state.isAbort) {
                this.setState({isReady: true});
                return;
            }

            return Promise.allSettled(inflight).finally(() => {
                this.setState({isReady: true, isAbort: true});
            });
        }

        /**
         * Filter nodes to get only those included in current dir subtree.
         * Update M.v and playlist with those nodes
         * @param {String[]} nodeIds - node id list
         * @returns {void}
         */
        _update(nodeIds) {
            const {utils, playlist} = mega.slideshow;

            if (nodeIds && nodeIds.length) {
                const nodes = nodeIds
                    .map(h => M.d[h])
                    .filter(utils.isNodeInCurrentTree);

                if (nodes.length) {
                    M.v.push(...nodes);
                    playlist.add(nodes);
                }
            }
        }

        /**
         * Update state properties
         * @param {Object} behavior definition
         * @returns {void}
         */
        setState({isReady, isAbort}) {
            this.state.isReady = isReady === undefined ? this.state.isReady : isReady;
            this.state.isAbort = isAbort === undefined ? this.state.isAbort : isAbort;
        }
    };
});
