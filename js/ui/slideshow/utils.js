lazy(mega.slideshow, 'utils', () => {
    'use strict';

    const { speed, order } = mega.slideshow.settings;
    const SPEED_VALS = freeze({
        slow: speed.getCfgByName('slow'),
        normal: speed.getCfgByName('normal'),
        fast: speed.getCfgByName('fast')
    });
    const ORDER_VALS = freeze({
        shuffle: order.getCfgByName('shuffle'),
        newest: order.getCfgByName('newest'),
        oldest: order.getCfgByName('oldest'),
        'default': order.getCfgByName('default-order')
    });
    const NO_REPEAT = 'norepeat';
    const VIDEO = 'playvideo';
    const CAPTION = 'caption';
    const RANDOM_START = 'randomstart';
    const AUTO_START = 'autostart';
    const START_HANDLE_DELIM = 'startat';
    const startHandleRegExp = new RegExp(`^${START_HANDLE_DELIM}=([\\w-]{8})$`, 'i');
    const DEFAULT_OPTIONS = freeze({
        speed: SPEED_VALS.normal,
        order: ORDER_VALS.oldest,
        repeat: 1,
        playVid: 0,
        caption: 0,
        autoStart: 0,
    });

    /**
     * Slideshow utils for MegaData operations
     */
    return {
        speedVals: SPEED_VALS,
        orderVals: ORDER_VALS,

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
                return (n) => n.s && (n.fa || !M.getNodeShare(n).down) &&
                    (mega.slideshow.settings.playVid.getValue() && is_video(n) === 1 || is_image3(n));
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

        /**
         * Parse the autoplay parameter
         * Unknown option names are ignored. Last of a kind wins.
         * @param {String} value Comma separated option names
         * @returns {Object} The autoplay settings
         */
        parseAutoplayParam(value) {
            value = String(value).slice(0, 100);
            const opts = { ...DEFAULT_OPTIONS };
            const tokens = value.split(',');

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].toLowerCase();

                if (SPEED_VALS[token] > 0) {
                    opts.speed = SPEED_VALS[token];
                }
                else if (ORDER_VALS[token] > 0) {
                    opts.order = ORDER_VALS[token];
                }
                else if (token === NO_REPEAT) {
                    opts.repeat = 0;
                }
                else if (token === VIDEO) {
                    opts.playVid = 1;
                }
                else if (token === RANDOM_START) {
                    opts.startRandom = 1;
                }
                else if (token === AUTO_START) {
                    opts.autoStart = 1;
                }
                else if (token === CAPTION) {
                    opts.caption = 1;
                }
                else {
                    // Don't grab the handle as lowercase.
                    const startHandle = startHandleRegExp.exec(tokens[i]);
                    if (startHandle) {
                        opts.startHandle = startHandle[1];
                    }
                }
            }

            return opts;
        },

        /**
         * Build the autoplay parameter value from slideshow settings
         * @param {Object} options The autoplay settings to encode
         * @returns {String} The link parameter
         */
        getAutoplayParam(options) {
            if (!options) {
                return '';
            }
            const tokens = [];
            if (options.speed !== DEFAULT_OPTIONS.speed) {
                tokens.push(Object.keys(SPEED_VALS).find((name) => SPEED_VALS[name] === options.speed));
            }
            if (options.order !== DEFAULT_OPTIONS.order) {
                tokens.push(Object.keys(ORDER_VALS).find((name) => ORDER_VALS[name] === options.order));
            }
            if (!options.repeat) {
                tokens.push(NO_REPEAT);
            }
            if (options.playVid) {
                tokens.push(VIDEO);
            }
            if (options.caption) {
                tokens.push(CAPTION);
            }
            if (options.autoStart) {
                tokens.push(AUTO_START);
            }
            if (options.startRandom) {
                tokens.push(RANDOM_START);
            }
            else if (options.startHandle) {
                tokens.push(`${START_HANDLE_DELIM}=${options.startHandle}`);
            }
            if (!tokens.length) {
                return '?autoplay=1';
            }
            return `?autoplay=${tokens.filter(String).join(',')}`;
        },
    };
});
