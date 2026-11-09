export const GIF_PANEL_CLASS = 'gif-panel-wrapper';
export const MAX_HEIGHT = 550;

export const API = {
    HOSTNAME: 'https://giphy.mega.nz/',
    ENDPOINT: 'v1/gifs',
    SCHEME: 'giphy://',
    convert: path => {
        if (path && typeof path === 'string') {
            const FORMAT = [API.SCHEME, API.HOSTNAME];
            if (path.indexOf(API.SCHEME) === 0 || path.indexOf(API.HOSTNAME) === 0) {
                return (
                    String.prototype.replace.apply(path, path.indexOf(API.SCHEME) === 0 ? FORMAT : FORMAT.reverse())
                );
            }
        }
    },
    LIMIT: 50,
    OFFSET: 50
};

export const LABELS = freeze({
    get SEARCH() {
        return l[24025];
    },
    get NO_RESULTS() {
        return l[24050];
    },
    get NOT_AVAILABLE() {
        return l[24512];
    },
    get END_OF_RESULTS() {
        return l[24156];
    }
});
