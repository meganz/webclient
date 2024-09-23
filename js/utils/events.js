function MegaEvents() {
    'use strict';
    this._events = Object.create(null);
}

MegaEvents.prototype.trigger = function(name, args) {
    'use strict';

    var count = false;

    if (!this._events) {
        console.error('MegaEvents: This instance is destroyed and cannot dispatch any more events.', name, args);
        return false;
    }

    if (this._events[name]) {

        if (d > 1) {
            console.log(' >>> Triggering ' + name, this._events[name].length, args);
        }
        args = args || [];

        var evs = this._events[name];
        for (var i = 0; i < evs.length; ++i) {
            try {
                evs[i].apply(null, args);
            }
            catch (ex) {
                console.error(ex);

                onIdle(function() {
                    // Let window.onerror catch it
                    throw ex;
                });
            }
            ++count;
        }
    }

    return count;
};

MegaEvents.prototype.on = function(name, callback) {
    'use strict';

    if (this._events[name]) {
        this._events[name].push(callback);
    }
    else {
        this._events[name] = [callback];
    }
    return this;
};


// ---------------------------------------------------------------------------

mBroadcaster.once('startMega', tryCatch(() => {
    'use strict';

    if (is_livesite && self.buildOlderThan10Days || localStorage.nomjs) {
        return;
    }
    const state = Object.create(null);
    const eventlog = self.d ? dump : self.eventlog;

    const sendMediaJourneyEvent = tryCatch((id) => {
        let value;

        if (self.pfcol) {
            value = id + 3;
        }
        else if (self.pfid) {
            value = id + 1;
        }
        else if (self.page === 'download') {
            value = id + 2;
        }
        else if (self.fminitialized) {

            if (M.currentrootid === M.RootID) {
                value = id;
            }
            else if (M.currentdirid === 'photos') {
                value = id + 4;
            }
            else if (M.currentdirid === 'videos') {
                value = id + 5;
            }
            else if (M.albums) {
                value = id + 6;
            }
        }

        if (value > 5e5) {
            eventlog(value, true);
        }
    });

    const setMediaPlaybackState = () => {

        if (state.mediaPlayback) {
            console.assert(false, 'already running...');
            return;
        }
        const evs = [];
        const cleanup = () => {

            for (let i = evs.length; i--;) {
                mBroadcaster.removeListener(evs[i]);
            }
            state.mediaPlayback = false;
        };
        evs.push(
            mBroadcaster.addListener('slideshow:next', cleanup),
            mBroadcaster.addListener('slideshow:prev', cleanup),
            mBroadcaster.addListener('slideshow:close', cleanup)
        );

        state.mediaPlayback = true;
    };
    const actions = freeze({
        'preview': {
            audio() {
                setMediaPlaybackState();
            },
            video() {
                setMediaPlaybackState();
            },
            'send-chat'() {
                if (state.mediaPlayback) {
                    sendMediaJourneyEvent(500140);
                }
            },
            'close-btn'() {
                if (state.mediaPlayback) {
                    state.mediaPlayback = -1;
                    sendMediaJourneyEvent(500170);
                }
            },
            'arrow-key'() {
                if (state.mediaPlayback) {
                    sendMediaJourneyEvent(500180);
                }
            },
            'close-nav'() {
                if (state.mediaPlayback > 0) {
                    sendMediaJourneyEvent(500220);
                }
            }
        },
        'videostream': {
            playing({options}) {
                const userClick = !options.autoplay || 'preBuffer' in options || options.uclk;

                if (userClick) {
                    sendMediaJourneyEvent(500050);
                }
                else {
                    sendMediaJourneyEvent(500040);
                }
            }
        },
        'breadcrumb': {
            click() {
                if (state.mediaPlayback) {
                    state.mediaPlayback = -1;
                    sendMediaJourneyEvent(500120);
                }
            }
        },
        'properties-dialog': {
            click(on) {
                if (state.mediaPlayback && on === 'file-version') {
                    state.mediaPlayback = -1;
                    sendMediaJourneyEvent(500130);
                }
            }
        },
        'move-to-rubbish': {
            remove() {
                if (state.mediaPlayback) {
                    state.mediaPlayback = -1;
                    sendMediaJourneyEvent(500150);
                }
            }
        },
        'media-journey': {
            playback(state) {
                if (state === 'ended') {
                    sendMediaJourneyEvent(500210);
                }
                else if (state === 'watch-again') {
                    sendMediaJourneyEvent(500200);
                }
                else if (state === 'pause-click') {
                    sendMediaJourneyEvent(500110);
                }
            },
            subtitles(op) {
                if (op === 'open') {
                    sendMediaJourneyEvent(500190);
                }
                else if (op === 'add') {
                    sendMediaJourneyEvent(500100);
                }
                else if (op === 'cancel') {
                    sendMediaJourneyEvent(500090);
                }
                else if (op === 'close') {
                    sendMediaJourneyEvent(500080);
                }
                else if (op === 'select') {
                    sendMediaJourneyEvent(500070);
                }
                else if (op === 'off') {
                    sendMediaJourneyEvent(500060);
                }
            }
        }
    });

    mBroadcaster.addListener('trk:event', (category, action, name, value) => {

        if (actions[category] && (action = actions[category][action])) {

            tryCatch(action)(name, value);
        }
    });
}));
