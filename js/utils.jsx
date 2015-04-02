module.exports = {
    'altersData': function(fn) {
        fn.altersData = true;
        return fn;
    },
    'prefixedKeyMirror': function(prefix, vals) {
        var result = {};

        Object.keys(vals).forEach(function(k) {
            result[k] = prefix + ":" + k;
        });
        return result;
    },
    'extendActions': function(prefix, src, toBeAppended) {
        var actions = Object.keys(src).concat(Object.keys(toBeAppended));
        var result = {};

        actions.forEach(function(k) {
            result[k] = prefix + ":" + k;
        });
        return result;
    }
};
