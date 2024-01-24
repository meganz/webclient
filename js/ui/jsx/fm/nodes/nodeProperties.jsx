/**
 * A class that provides UI-related primitive labels, titles, classes, etc and info per node.
 * Uses a global cache, so that we are 100% sure the same cached data won't be required to be recomputed twice.
 *
 * Note: This is a concept mix of LRU and expiration based cache.
 */
export class NodeProperties {
    // internal static stuff
    static _cache = new Map();
    static _usages = new WeakMap();
    static _globalCleanupTimer;

    /**
     * MAX size of the cache. If cache is < this, it won't be cleaned and left in memory.
     *
     * If needed, set to 0 to disable and always clean unused node properties (not good for UIs switching between
     * different views - Chat <-> FM).
     * @type {number}
     */
    static MAX_CACHE_SIZE = 100;

    /**
     * Singleton way of getting a NodeProperties instance.
     *
     * @param {MegaNode} node
     * @param {Function} [changeListener] to call on update
     * @returns {NodeProperties}
     */
    static get(node, changeListener) {
        assert(node.h, 'missing handle for node');

        if (NodeProperties._globalCleanupTimer) {
            NodeProperties._globalCleanupTimer.abort();
        }
        (NodeProperties._globalCleanupTimer = tSleep(120))
            .then(() => {
                NodeProperties.cleanup(0);
            });

        let nodeProps;
        if (!NodeProperties._cache.has(node.h)) {
            nodeProps = new NodeProperties(node, changeListener);
            NodeProperties._cache.set(node.h, nodeProps);
        }
        return nodeProps || NodeProperties._cache.get(node.h);
    }

    /**
     * Mark node property as unused (call in case of componentWillUnmount).
     *
     * @param {Function} [changeListener] optional change listener to remove
     */
    unuse(changeListener) {
        let node = this.node;
        if (!node) {
            // already frozen, shouldn't happen
            if (d) {
                console.warn("This should not happen.");
            }
            return;
        }

        this.changeListeners.delete(changeListener);

        let usages = NodeProperties._usages.get(this);
        if (usages) {
            NodeProperties._usages.set(this, --usages);
            if (
                usages === 0 &&
                NodeProperties._cache.size > NodeProperties.MAX_CACHE_SIZE
            ) {
                delay('nodePropCleanup', NodeProperties.cleanup, 1000);
            }
        }
    }


    /**
     * Does cleanup of ._usages
     *
     * @param {number} [maxCacheSize] optionally pass different then the MAX_CACHE_SIZE value here (used for the timed
     * out cleanup)
     */
    static cleanup(maxCacheSize) {
        maxCacheSize = typeof maxCacheSize === "undefined" ? NodeProperties.MAX_CACHE_SIZE : maxCacheSize;

        let len = NodeProperties._cache.size;
        let removed = 0;
        // remove old first.
        for (let entry of NodeProperties._cache) {
            let id = entry[0];
            let node = entry[1];
            let usage = NodeProperties._usages.get(node);

            if (usage === 0) {
                NodeProperties._usages.delete(node);
                node._cleanup();
                NodeProperties._cache.delete(id);
                removed++;
                if (len - removed < maxCacheSize) {
                    return;
                }
            }
        }
    }

    /**
     * Don't use directly, use MegaProperties.get(node);
     *
     * @param {MegaNode} node
     * @param {Function} [changeListener] optional changeListener to be called on change if triggered by mBroadcaster
     */
    constructor(node, changeListener) {
        this.node = node;
        // TODO: Replace with IWeakSet, when merged.
        this.changeListeners = new Set();

        if (changeListener) {
            this.changeListeners.add(changeListener);
        }

        /**
         * Internal callback that gets called on change in the target node.
         *
         * @private
         */
        let _onChange = () => {
            this.initProps();
            for (let listener of this.changeListeners) {
                listener();
            }
        };

        if (this.node.addChangeListener) {
            this._listener = this.node.addChangeListener(_onChange);
        }
        else {
            this._mbListener = mBroadcaster.addListener("nodeUpdated:" + node.h, _onChange);
        }

        this.initProps();
    }


    /**
     * Mark as used (componentWillMount)
     *
     * @param {Function} [changeListener] optional change listener to add
     */
    use(changeListener) {
        if (changeListener) {
            this.changeListeners.add(changeListener);
        }

        NodeProperties._usages.set(
            this,
            (NodeProperties._usages.get(this) | 0) + 1
        );
    }

    /**
     * Called internally to cleanup node and mark it as totally unused (not even in cache).
     *
     * @param {Function} [changeListener] optional change listener to remove
     */
    _cleanup() {
        if (this._listener) {
            this.node.removeChangeListener(this._listener);
        }
        if (this._mbListener) {
            mBroadcaster.removeListener(this._mbListener);
        }
        oDestroy(this);
    }

    /**
     * (Re)Inits the lazy properties
     */
    initProps() {
        let node = this.node;

        lazy(this, 'title', () => {
            if (missingkeys[node.h]) {
                /* `undecryptable file/folder` */
                return node.t ? l[8686] : l[8687];
            }
            return M.getNameByHandle(node.h);
        });
        lazy(this, 'classNames', () => {
            let classNames = [];

            if (node.su) {
                classNames.push('inbound-share');
            }

            if (node.t) {
                classNames.push('folder');
            }
            else {
                classNames.push('file');
            }


            var share = this.shareData;

            if (missingkeys[node.h] || share.down) {

                // Taken down item
                if (share.down) {
                    classNames.push('taken-down');
                }

                // Undecryptable node
                if (missingkeys[node.h]) {
                    classNames.push('undecryptable');
                }
            }

            if (share) {
                classNames.push('linked');
            }


            // Colour label
            if (node.lbl && !folderlink) {
                var colourLabel = M.getLabelClassFromId(node.lbl);
                classNames.push('colour-label');
                classNames.push(colourLabel);
            }

            return classNames;
        });

        lazy(this, 'icon', () => {
            return fileIcon(node);
        });
        lazy(this, 'isFolder', () => {
            return !!node.t;
        });
        lazy(this, 'shareData', () => {
            return M.getNodeShare(node);
        });
        lazy(this, 'isTakendown', () => {
            return this.shareData && !!this.shareData.down;
        });
        lazy(this, 'fav', () => {
            return !!node.fav;
        });
        lazy(this, 'size', () => {
            return bytesToSize(node.s);
        });
        lazy(this, 'timestamp', () => {
            return time2date(node.ts);
        });
        lazy(this, 'root', () => {
            return M.getNodeRoot(node.h);
        });
        lazy(this, 'incomingShareData', () => {
            let result = {};
            if (node.r === 1) {
                result.accessLabel = l[56];
                result.accessIcon = 'icon-permissions-write';
            }
            else if (node.r === 2) {
                result.accessLabel = l[57];
                result.accessIcon = 'icon-star';
            }
            else {
                result.accessLabel = l[55];
                result.accessIcon = 'icon-read-only';
            }
            return result;
        });
        lazy(this, 'timestamp', () => {
            return time2date(node.ts);
        });
        lazy(this, 'onlineStatus', () => {
            return M.onlineStatusClass(node.presence ? node.presence : "unavailable");
        });
    }
}

if (d) {
    window.NodeProperties = NodeProperties;
}
