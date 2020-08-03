(function() {

    'use strict';

    // Support local static for testing purpose only, live should using static server.
    if (localStorage.testie11) {

        var newStyle = document.createElement('style');

        newStyle.appendChild(document.createTextNode(
            "@font-face {" +
            "    font-family: 'source_sans_proregular';" +
            "    src: url('/fonts/SourceSansPro-Regular.eot');" +
            "    src: url('/fonts/SourceSansPro-Regular.eot?#iefix') format('embedded-opentype')," +
            "    url('/fonts/SourceSansPro-Regular.woff2') format('woff2')," +
            "    url('/fonts/SourceSansPro-Regular.woff') format('woff')," +
            "    url('/fonts/SourceSansPro-Regular.ttf') format('truetype')," +
            "    url('/fonts/SourceSansPro-Regular.svg#source_sans_proregular') format('svg');" +
            "    font-weight: normal;" +
            "    font-style: normal;" +
            "}" +
            "@font-face {" +
            "    font-family: 'Open Sans Semibold Italic';" +
            "    src: url('/fonts/OpenSans-SemiboldItalic_v3.eot');" +
            "    src: url('/fonts/OpenSans-SemiboldItalic_v3.eot?#iefix') format('embedded-opentype')," +
            "    url('/fonts/OpenSans-SemiboldItalic.woff2') format('woff2')," +
            "    url('/fonts/OpenSans-SemiboldItalic_v3.woff') format('woff')," +
            "    url('/fonts/OpenSans-SemiboldItalic_v3.ttf') format('truetype')," +
            "    url('/fonts/OpenSans-SemiboldItalic_v3.svg#open_sanssemibold_italic') format('svg');" +
            "    font-weight: normal;" +
            "    font-style: normal;" +
            "}"
        ));

        document.head.appendChild(newStyle);

        var nodes = document.querySelectorAll('.logo, .browsers-notification, .browsers-logo-lnk');

        for (var i = nodes.length; i--;) {

            nodes[i].style.backgroundImage = 'url(\'/images/mega/browsers-page-v3.png\')';
        }

        nodes = document.querySelectorAll('.nw-bottom-copyrights, .nw-bottom-social');

        for (var j = nodes.length; j--;) {

            nodes[j].style.backgroundImage = 'url(\'/images/mega/bottom-sprite-ie6.png\')';
        }
    }
})();
