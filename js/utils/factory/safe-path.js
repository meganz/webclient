factory.define('safe-path', () => {
    'use strict';
    const {getSafeName} = factory.require('safe-name');

    return freeze({
        getSafePath(path, file) {
            const res = `${path || ''}`.split(/[/\\]+/).map(getSafeName).filter(String);
            if (file) {
                res.push(getSafeName(file));
            }
            return res;
        }
    });
});
