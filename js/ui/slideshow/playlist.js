lazy(mega.slideshow, 'playlist', () => {
    'use strict';

    // playlist max items allowed
    const maxItems = 1000;

    return new class SlideshowPlaylist {
        /**
         * Slideshow playlist handler holding MegaNode references to play on slideshow.
         * Playlist items will be ordered, pruned and placed based on slideshow state.
         *
         * Sample:
         *
         * - playlist items: [3, 1, 378, 23]
         * - nodes: [
         *      MegaNode_A // nodes[0] => - not in playlist -
         *      MegaNode_B // nodes[1] => playlist[1]
         *      MegaNode_C // nodes[2] => - not in playlist -
         *      MegaNode_D // nodes[3] => playlist[0]
         *      ...
         *      MegaNode_X // nodes[23] => playlist[3]
         *      ...
         *      MegaNode_Y // nodes[378] => playlist[2]
         *      ...
         *   ]
         * - so playlist de-referenced is: [MegaNode_D, MegaNode_B, MegaNode_Y, MegaNode_X]
         *
         * @returns {SlideshowPlaylist} instance
         */
        constructor() {
            // playlist items containing MegaNode indexes in a determined order
            this.items = [];

            Object.freeze(this);
        }

        /**
         * Build playlist items references based on slideshow state and MegaNodes available
         * Behavior changes when isPlayMode:
         * - playlist max length
         * - playlist ordering
         * - not absolute ordering may affect playlist first item
         * @param {String} nodeId - node id
         * @returns {void}
         */
        build(nodeId) {
            const {settings, manager} = mega.slideshow;
            const {isPlayMode, filter} = manager.state;
            const nodes = manager.state.nodes();
            const isAbsoluteOrder = settings.order.isAbsolute();

            let nodeIndex = -1;
            this.items.length = 0;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (filter(node)) {
                    if (!isAbsoluteOrder && isPlayMode && nodeId !== undefined && node.h === nodeId) {
                        nodeIndex = i;
                    }
                    else {
                        this.items.push(i);
                    }
                }
            }

            if (isPlayMode) {
                settings.order.getValue()(this.items, nodes);
            }

            if (nodeIndex !== -1) {
                this.items.unshift(nodeIndex);
            }

            if (this.isFull()) {
                this.items.splice(maxItems);
            }
        }

        /**
         * Add ordered MegaNode references to playlist not exceeding playlist max length if applicable
         * @param {MegaNode[]} addNodes - nodes to add to playlist
         * @returns {void}
         */
        add(addNodes) {
            const {file, settings, manager} = mega.slideshow;
            const nodes = manager.state.nodes();

            if (addNodes.length) {
                if (this.isFull()) {
                    file.abort();
                    return;
                }

                const items = [];
                const maxItemsAllowed = maxItems - this.items.length;

                if (addNodes.length > maxItemsAllowed) {
                    if (addNodes.length > 1) {
                        settings.order.getValue()(addNodes, nodes);
                    }
                    addNodes.splice(maxItemsAllowed);
                }

                for (let i = 0; i < addNodes.length; i++) {
                    const index = nodes.findIndex((node) => node.h === addNodes[i].h);
                    if (index !== -1) {
                        items.push(index);
                    }
                }

                if (items.length > 1) {
                    settings.order.getValue()(items, nodes);
                }
                this.items.push(...items);

                if (this.isFull()) {
                    file.abort();
                    this.items.splice(maxItems);
                }
            }
        }

        /**
         * Return index on playlist and node in case id argument is related to a playlist item node.
         * Otherwise returns { playIndex: -1, node: undefined }
         * @param {String} id - node id
         * @returns {Object} playlist info about node id argument
         */
        findNode(id) {
            const {manager} = mega.slideshow;

            let playIndex = -1;
            let node;

            if (id !== undefined) {
                const nodes = manager.state.nodes();
                playIndex = this.items.findIndex(
                    (nodeIndex) => manager.state.getNodeIdOnIndex(nodeIndex) === id
                );
                node = nodes[this.items[playIndex]];
            }
            return {playIndex, node};
        }

        /**
         * Return node id related to a playlist item defined by index passed as argument
         * @param {Number} playIndex - playlist item index
         * @returns {String} node id
         */
        getNodeIdOnIndex(playIndex) {
            return mega.slideshow.manager.state.getNodeIdOnIndex(this.items[playIndex]);
        }

        /**
         * Check if playlist is full. Only applicable if isPlayMode.
         * Otherwise playlist has no limit.
         * This is a network & performance optimization when nodes from subfolders
         * can be fetched in case huge node trees
         * @returns {Boolean} wheter playlist is full
         */
        isFull() {
            return mega.slideshow.manager.state.isPlayMode && this.items.length >= maxItems;
        }
    };
});
