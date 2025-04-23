factory.define('mkdir', () => {
    'use strict';
    const kind = Symbol('~\\:<p*>');
    const {getSafePath} = factory.require('safe-path');

    // paths walker to create hierarchy
    const traverse = (paths, s) => {
        const p = paths.shift();

        if (p) {
            s = traverse(paths, s[p] = s[p] || Object.create(null));
        }
        return s;
    };

    const walk = (paths) => {
        const res = Object.create(null);

        if (paths instanceof FileList) {
            paths = [...paths].map((o) => o.path);
        }
        if (!Array.isArray(paths)) {
            paths = typeof paths === 'object' ? Object.keys(paths) : [paths];
        }

        // create folder hierarchy
        for (let i = paths.length; i--;) {
            const value = paths[i];
            Object.defineProperty(traverse(getSafePath(value), res), kind, {value});
        }

        return res;
    };

    return freeze({
        kind,
        walk,
        async mkdir(target, paths, stub) {
            const {promise, resolve, reject} = Promise.withResolvers();

            if (!Array.isArray(paths)
                && Symbol.iterator in paths) {

                paths = [...paths];
            }
            if (Array.isArray(paths)) {
                const tmp = Object.create(null);
                for (let i = paths.length; i--;) {
                    const p = paths[i];
                    const t = p && p.path || typeof p === 'string' && p;
                    if (t) {
                        tmp[t] = null;
                    }
                }
                paths = tmp;
            }
            let folders = Object.keys(paths);
            const tree = walk(folders);

            folders = folders.length;
            (function _mkdir(s, t) {
                Object.keys(s).forEach((name) => {
                    stub(t, name)
                        .then((h) => {
                            const c = s[name]; // children for the just created folder
                            if (c[kind]) {
                                console.assert(paths[c[kind]] === null);

                                // record the created folder node handle
                                paths[c[kind]] = h;
                                folders--;
                            }
                            queueMicrotask(_mkdir.bind(null, c, h));
                        })
                        .catch(reject);
                });
                return !folders && resolve(paths);
            })(tree, target);

            return promise;
        }
    });
});
