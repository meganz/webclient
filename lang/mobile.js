(function(window) {
    var strings = {
    "en": []
};

    window.setLanguage = function(lang) {
        if (!strings[lang]) {
            throw new Error("Cannot find language " + lang);
        }

        window.l = strings[lang];
        for (var k in strings.alias) {
            if (strings.alias.hasOwnProperty(k)) {
                l[k] = strings.alias[k];
            }
        }
    };

})(window);
