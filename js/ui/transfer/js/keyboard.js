/**
 * @file keyboard.js
 * @desc Keyboard shortcuts handler.
 */
mBroadcaster.once('startMega', () => {
    "use strict";

    // -----------------------------------------------------------------------

    const inputReactiveKeys = freeze({
        Escape: 1
    });

    const is = freeze({
        get dialogShown() {
            return $.dialog || $.msgDialog;
        },
        get otherSubSec() {
            return false; // @todo
        },
        get onCleanView() {
            return !self.slideshowid && !this.dialogShown;
        },
        get viewListing() {
            return this.onCleanView && (M.search || M.currentrootid) && !this.otherSubSec;
        },
        get readOnlyView() {
            return !this.viewListing || !(M.getNodeRights(M.currentdirid) > 1);
        }
    });

    const keyMap = freeze({
        Enter() {
            // @todo
        },
        Escape() {
            if (!$.dialog || $.msgDialog !== 'confirmation') {
                // @todo
            }

            if ($.hideTopMenu) {
                $.hideTopMenu();
            }
            if ($.hideContextMenu) {
                $.hideContextMenu();
            }
        },
        KeyC(ev) {
            if ((ev.ctrlKey || ev.metaKey) && is.viewListing) {
                // @todo support multiple nodes
                const {id} = document.querySelector('.ui-selected') || !1;

                if (id) {
                    T.ui.copyLinkToClipboard(`${self.xhid}/${id}`);
                }
            }
        },
        KeyX(ev) {
            return keyMap.KeyC(ev, !!is.readOnlyView);
        }
    });

    const keyViewNav = (...a) => {

        // @todo

        return !a;
    };

    // -----------------------------------------------------------------------

    const combo = [];

    $(window).rebind('keyup.it-key-events', (ev) => {
        if (String(combo.slice(-1)) === ev.code) {
            combo.pop();
        }
        delay('it-combo-clear', () => {
            combo.length = 0;
        }, 768);
    });

    $(window).rebind('keydown.it-key-events', (ev) => {
        let returnValue = null;
        const {key, code, target} = ev;
        const $target = $(target);
        const $input = $target.filter("input,textarea,select");

        if ($input.length && !inputReactiveKeys[key]) {

            returnValue = true;
        }
        else {

            combo.push(code);
            if (code === 'KeyA') {
                mBroadcaster.sendMessage('it-key-combo', combo.map((k) => k.slice(-1)).join(''));
            }

            switch (key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (is.viewListing) {
                        returnValue = keyViewNav(ev, key.slice(5).toLowerCase());
                    }
                    break;

                default: {
                    const handler = keyMap[key] || keyMap[code];

                    if (handler) {

                        returnValue = tryCatch(handler)(ev);
                    }
                }
            }
        }

        return returnValue;
    });
});
