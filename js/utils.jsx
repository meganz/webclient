export function altersData(fn) {
    fn.altersData = true;
    return fn;
};
export function prefixedKeyMirror(prefix, vals) {
    var result = {};

    Object.keys(vals).forEach(function(k) {
        result[k] = prefix + ":" + k;
    });
    return result;
};

export function extendActions(prefix, src, toBeAppended) {
    var actions = Object.keys(src).concat(Object.keys(toBeAppended));
    var result = {};

    actions.forEach(function(k) {
        result[k] = prefix + ":" + k;
    });
    return result;
};
