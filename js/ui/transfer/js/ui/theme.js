// Global theme functions
(() => {
    'use strict';

    // the MediaQueryList relating to the system theme
    let query = null;

    /**
     * Sets the theme class on the html
     *
     * @param {*} theme - the name of the theme class
     * @return {undefined}
     */
    const setThemeClass = function(theme) {
        const themeClass = `theme-${theme}`;

        if (!document.documentElement.classList.contains(themeClass)) {
            document.documentElement.classList.remove('theme-dark', 'theme-light');
            document.documentElement.classList.add(`theme-${theme}`);
        }

        const switchBtn = document.querySelector('header.page-header .js-set-theme');

        if (switchBtn) {
            if (theme === 'dark') {
                switchBtn.querySelector('i').className = 'sprite-it-x24-mono icon-sun';
            }
            else {
                switchBtn.querySelector('i').className = 'sprite-it-x24-mono icon-moon';
            }
        }
    };

    /**
     * The event listener, used for add/remove operations
     *
     * @param {object} e - the event object
     * @return {undefined}
     */
    const listener = function(e) {
        if (e.matches) {
            setThemeClass('dark');
        }
        else {
            setThemeClass('light');
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
            setThemeClass('dark');
        }
        else {
            setThemeClass('light');
        }
    };


    /**
     * Check if the dark mode theme is currently applied
     *
     * @returns {boolean} If the dark theme is applied
     */
    T.ui.isDarkTheme = () => {
        const {classList} = document.documentElement;
        return classList.contains('theme-dark') || classList.contains('theme-dark-forced');
    };


    /**
     * Sets the current theme, by value
     * Does not store the change to localStorage, purely presentational.
     *
     * @param {*} [value] the value of the theme to set [0/"0":  follow system, 1/"1": light, 2/"2": dark]
     * @return {undefined}
     */
    T.ui.setTheme = (value) => {
        if (query) {
            if (query.removeEventListener) {
                query.removeEventListener('change', listener);
            }
            else if (query.removeListener) { // old Safari
                query.removeListener(listener);
            }
        }

        if (value === undefined) {
            value = (localStorage.webtheme || window.u_attr && u_attr['^!webtheme']) | 0;
            if (!value && u_type === false) {
                value = self.darkloader ? 2 : 1;
            }
        }
        else {
            value = Math.max(0, value | 0);

            if (value < 3) {
                if (window.u_attr && mega.attr) {
                    mega.attr.set('webtheme', value, -2, 1);
                    delete localStorage.webtheme;
                }
                else {
                    localStorage.webtheme = String(value);
                }
            }
        }

        if (value === 2) {
            setThemeClass('dark');
        }
        else if (value !== 1 && window.matchMedia) {
            setByMediaQuery();
        }
        else {
            // if the browser doesn't support matching the system theme, set light mode
            setThemeClass('light');
        }
    };
})();
