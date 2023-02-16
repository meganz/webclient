lazy(mega.slideshow, 'utils', () => {
    'use strict';

    /**
     * Slideshow utils for MegaData operations
     */
    return {
        /**
         * Check if node is in current dir tree (root or subtree)
         * @param {MegaNode} node - node to check
         * @returns {Boolean} whether node is in current dir tree
         */
        isNodeInCurrentTree: (node) => {
            return M.getPath(node.h).includes(M.currentdirid.replace('out-shares/', ''));
        },

        /**
         * Return node id (handler) for chat or default
         * @param {MegaNode} node - node to check
         * @returns {String} node id
         */
        getNodeIdOnIndex: (node) => {
            if (node !== undefined) {
                return node[M.chat ? 'ch' : 'h'];
            }
        },

        /**
         * Open current folder
         * @returns {void}
         */
        setCurrentDir: ()=> {
            M.openFolder(M.currentdirid, true);
        },

        /**
         * Filter nodes argument depending on current situation
         * @param {MegaNode[]} nodes - list of nodes to filter
         * @param {Boolean} isPlayMode - whether slideshow is on play mode or not
         * @returns {Function}
         */
        filterNodes: (nodes, isPlayMode) => {
            if (nodes !== undefined) {
                return () => true;
            }
            else if (isPlayMode) {
                return (n) => n.s && (n.fa || !M.getNodeShare(n).down) && is_image3(n);
            }
            else if (is_mobile) {
                return (n) => (n.fa || !M.getNodeShare(n).down) && (is_video(n) || is_image3(n));
            }
            return (n) => (n.fa || !M.getNodeShare(n).down) && (is_image2(n) || is_video(n));
        },

        /**
         * Check if current dir is a default flat (no sub-folders)
         * @returns {Boolean} whether current dir is flat
         */
        isCurrentDirFlat: () => {
            // TODO replace isCurrentDirFlat function body with line below once WEB-14237 MR is merged into develop
            // M.chat ||
            //   M.isDynPage(M.currentdirid) ||
            //   ['recents','photos','images','favourites'].includes(M.currentdirid);

            return M.chat ||
                ['recents', 'photos', 'images', 'favourites', 'faves'].includes(M.currentdirid);
        },
    };
});
