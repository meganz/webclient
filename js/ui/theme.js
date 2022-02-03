// Global theme functions
(function(scope) {
    'use strict';

    // the MediaQueryList relating to the system theme
    let query = null;

    /**
     * Sets the theme class on the body
     *
     * @param {*} theme - the name of the theme class
     * @return {undefined}
     */
    const setBodyClass = function(theme) {
        const themeClass = 'theme-' + theme;
        if (!document.body.classList.contains(themeClass)) {
            document.body.classList.remove('theme-dark', 'theme-light');
            document.body.classList.add('theme-' + theme);
        }
    };

    /**
     * The event listener, used for add/remove operations
     *
     * @param {object} e - the event object
     * @return {undefined}
     */
    const listener = function(e) {
        if (
            !(
                (page.substr(0, 2) === 'P!' && page.length > 2)
                || page.substr(0, 5) === 'chat/'
                || is_chatlink
                || (is_fm() && page.substr(0, 5) !== 'start')
                || (page === 'download' && !is_mobile)
            )
        ) {
            return;
        }
        if (e.matches) {
            setBodyClass('dark');
        }
        else {
            setBodyClass('light');
        }
    };

    /**
     * Sets the current theme, by value.
     * Does not store the change to localStorage, purely presentational.
     *
     * @param {string | Number} rawVal - the value of the theme to set [0/"0":  follow system, 1/"1": light, 2/"2": dark]
     * @return {undefined}
     */
    const setTheme = function(rawVal) {
        const val = rawVal | 0;
        if (query) {
            if (query.removeEventListener) {
                query.removeEventListener('change', listener);
            }
            else if (query.removeListener) { // old Safari
                query.removeListener(listener);
            }
        }
        if (val === 1) {
            setBodyClass('light');
        }
        else if (val === 2) {
            setBodyClass('dark');
        }
        else if (val === 0 && window.matchMedia) {
            query = window.matchMedia('(prefers-color-scheme: dark)');
            if (query.addEventListener) {
                query.addEventListener('change', listener);
            }
            else if (query.addListener) { // old Safari
                query.addListener(listener);
            }

            if (query.matches) {
                setBodyClass('dark');
            }
            else {
                setBodyClass('light');
            }
        }
        else if (val === 0) {
            // if the browser doesn't support matching the system theme, set light mode
            setBodyClass('light');
        }
    };

    const setThemeWithUA = function() {
        const theme = u_attr && u_attr['^!webtheme'] !== undefined ? u_attr['^!webtheme'] : 0;
        setTheme(theme);
    }

    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.theme = {
        set: setTheme,
        setWithUA: setThemeWithUA
    };
})(window);
