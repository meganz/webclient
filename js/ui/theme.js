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
                || page === 'download'
                || page.substr(0, 11) === 'filerequest'
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
     * Set based on the matching system theme.
     * @returns {void}
     */
    const setByMediaQuery = () => {
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
    };

    /**
     * Sets the current theme, by value.
     * Does not store the change to localStorage, purely presentational.
     *
     * @param {*} [value] the value of the theme to set [0/"0":  follow system, 1/"1": light, 2/"2": dark]
     * @return {undefined}
     */
    mega.ui.setTheme = (value) => {
        if (query) {
            if (query.removeEventListener) {
                query.removeEventListener('change', listener);
            }
            else if (query.removeListener) { // old Safari
                query.removeListener(listener);
            }
        }

        if (value === undefined) {
            value = (window.u_attr && u_attr['^!webtheme'] || fmconfig.webtheme) | 0;
        }
        else {
            value = Math.max(0, value | 0);

            if (value < 3 && window.u_attr) {
                u_attr['^!webtheme'] = String(value);
            }
        }

        if (value === 2) {
            setBodyClass('dark');
        }
        else if (value !== 1 && window.matchMedia) {
            setByMediaQuery();
        }
        else {
            // if the browser doesn't support matching the system theme, set light mode
            setBodyClass('light');
        }
    };
})(window);
