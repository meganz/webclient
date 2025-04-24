factory.define('safe-name', () => {
    'use strict';

    return freeze({
        getSafeName(name) {
            // http://msdn.microsoft.com/en-us/library/aa365247(VS.85)
            name = `${name}`.replace(/["*/:<>?\\|]+/g, '.');

            if (name.length > 240) {
                name = `${name.slice(0, 240)}.${name.split('.').pop()}`;
            }
            name = name.replace(/[\t\n\v\f\r\u200E\u200F\u202E]+/g, ' ');

            let end = name.lastIndexOf('.');
            end = ~end && end || name.length;
            if (/^(?:con|prn|aux|nul|com\d|lpt\d)$/i.test(name.slice(0, end))) {
                name = `!${name}`;
            }
            return name;
        }
    });
});
