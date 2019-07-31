
function startMega() {
    "use strict";

    mBroadcaster.sendMessage("startMega");
    if (!startMega.eventlog) {
        startMega.eventlog = 1;
        var xhr = getxhr();
        xhr.onloadend = console.debug.bind(console);
        xhr.open("POST", apipath + 'cs?id=0' + mega.urlParams(), true);
        xhr.send(JSON.stringify([{a: 'log', e: 99690}]));
    }
    init_page();
}

function init_page() {
    "use strict";

    if (!is_drop) {
        throw new Error("Unexpected access...");
    }

    var tmp = String(page)
        .split("!")
        .map(function(s) {
            return s.replace(/[^\w-]+/g, "");
        });

    var id = tmp[1];
    var theme = tmp[2] === 'l' ? 'light-theme' : 'dark-theme';

    var textNode = mCreateElement('div', {'class': 'embed-action-text'});
    textNode.textContent = l[18215] || '(translation-missing)';
    document.body.textContent = '';

    mCreateElement('div', {id: "MEGAdrop", 'class': "embed-button centre-button"}, [
        mCreateElement('div', {'class': "embed-content-wrapper"}, [
            mCreateElement('div', {'class': "embed-mega-icon"}), textNode
        ])
    ], 'body');

    var elm = document.getElementById("MEGAdrop");

    if (d) {
        console.debug('megadrop', id);
    }

    if (id) {
        elm.classList.add(theme);
        elm.addEventListener("click", function() {
            window.open(
                getAppBaseUrl() + (is_extension ? '#' : '/') + 'megadrop/' + id, "_blank",
                "width=750, height=738, resizable=no, status=no, location=no, titlebar=no, toolbar=no",
                true
            );
        });
    }
    else {
        console.info(404, tmp);
        if (elm) {
            elm.classList.add('hidden');
        }
    }
}

function getAppBaseUrl() {
    "use strict";

    var l = location;
    var base = (l.origin !== "null" && l.origin) || l.protocol + "//" + l.hostname;
    if (is_extension) {
        base += l.pathname;
    }
    return base;
}
