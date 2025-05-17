/**
 * @file broadcast's messaging system.
 * @global mBroadcaster
 */
(() => {
    'use strict';
    const storage = localStorage;

    if (!self.BroadcastChannel) {
        // Simple BroadcastChannel Polyfill,
        // based on https://gist.github.com/sechel/e6aff22d9e56df02c5bd09c4afc516e6
        const channels = Object.create(null);
        self.BroadcastChannel = class BroadcastChannel {
            constructor(name) {
                this._closed = false;
                this._name = String(name);
                this._id = `$BroadcastChannel$${this._name}$`;
                this._mc = new MessageChannel();
                this._mc.port1.start();
                this._mc.port2.start();
                window.addEventListener('storage', (ev) => {
                    if (ev.newValue && ev.storageArea === storage && ev.key.startsWith(this._id)) {
                        this._mc.port2.postMessage(JSON.parse(ev.newValue));
                    }
                });
                if (!channels[this._id]) {
                    channels[this._id] = new Set();
                }
                channels[this._id].add(this);
            }

            postMessage(message) {
                if (!this._closed) {
                    const key = this._id + makeUUID();
                    const value = JSON.stringify(message);

                    storage.setItem(key, value);
                    setTimeout(() => storage.removeItem(key), 768);

                    for (const ch of channels[this._id]) {
                        if (ch !== this) {
                            ch._mc.port2.postMessage(JSON.parse(value));
                        }
                    }
                }
            }

            close() {
                if (!this._closed) {
                    this._closed = true;
                    this._mc.port1.close();
                    this._mc.port2.close();
                    channels[this._id].delete(this);
                }
            }

            addEventListener(...args) {
                return this._mc.port1.addEventListener(...args);
            }

            removeEventListener(...args) {
                return this._mc.port1.removeEventListener(...args);
            }

            dispatchEvent(...args) {
                return this._mc.port1.dispatchEvent(...args);
            }

            get name() {
                return this._name;
            }

            get onmessage() {
                return this._mc.port1.onmessage;
            }

            set onmessage(value) {
                this._mc.port1.onmessage = value;
            }
        };
    }

    // ------------------------------------------------------------------------------------------

    const ME = Symbol(`<m-bro>`);

    const isAttachable = (what) => {
        return what !== self
            && what !== self.mBroadcaster
            && what !== self.mBroadcaster.crossTab
            && typeof(what && what.handleEvent || what) === 'function';
    };
    const reportError = (ex) => {
        if (buildVersion.timestamp * 1000 + 3e8 > Date.now()) {

            self.reportError(ex);
        }
        dump(ex && ex.message || ex);
    };

    class MEGABroadcastChannel extends BroadcastChannel {
        constructor(name) {
            super(`[MEGA(${name})]`);

            Object.defineProperty(this, 'origin', {
                value: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
            });

            if (!(self.d > 2)) {
                Object.defineProperty(this, 'debug', {value: false});
            }
            this.onmessageerror = reportError;

            this.dispatchEvent = tryCatch(this.dispatchEvent, reportError);

            /** @property MEGABroadcastChannel.logger */
            lazy(this, 'logger', () => {
                const tag = this.origin.toString(36);
                const name = `${this.name.replace('MEGA', 'BROADCAST').slice(1, -2)}:${tag})`;

                return new MegaLogger(name, {
                    showLogLevelTag: false,
                    printDate: 'rad' in mega,
                    levelColors: {
                        LOG: '#5f63a1',
                        WARN: `#9c8c3c`,
                        INFO: `#1f3f6e`,
                        DEBUG: `#4c3b4a`,
                        ERROR: `#d8545f`
                    }
                });
            });
        }

        attachEvent(lst, tgt) {
            if (lst === ME) {
                super.addEventListener('message', tgt, true);
            }
            else if (isAttachable(lst)) {
                super.addEventListener('message', lst, true);
            }
        }

        detachEvent(lst, tgt) {
            if (lst === ME) {
                super.removeEventListener('message', tgt, true);
            }
            else if (isAttachable(lst)) {
                super.removeEventListener('message', lst, true);
            }
        }

        dispatchEvent(message, data) {
            if (this.debug) {
                this.debug(`\u{1F4EF} Sending message ${message}...`, data);
            }
            super.postMessage({message, data, origin: this.origin});
        }

        addEventListener() {
            assert(0);
        }

        removeEventListener() {
            assert(0);
        }

        debug(msg, ...args) {
            args = /sid|key|log|rsa/i.test(JSON.stringify(args) + msg) ? ["\u{1F512}"] : args;
            return this.logger.debug(msg, ...args);
        }

        get [Symbol.toStringTag]() {
            return 'MEGABroadcastChannel';
        }
    }

    // ------------------------------------------------------------------------------------------

    const mbl = new Map();
    const channels = new Map();

    const getBroadcastChannel = (name = 'gbl') => {
        if (!channels.has(name)) {
            channels.set(name, new MEGABroadcastChannel(name));
        }
        return channels.get(name);
    };
    const crossTab = lazy(Object.create(null), 'channel', () => {

        Object.defineProperties(crossTab, {
            actors: {
                value: []
            },
            primary: {
                value: false,
                writable: true
            },
            handle: {
                value: false,
                writable: true
            },
            logger: {
                get() {
                    return this.channel.logger;
                }
            }
        });
        /** @class crossTab.channel */
        return getBroadcastChannel('crosstab');
    });
    const str = (s) => !!s && ` ${s}`.slice(1);
    const hasOwn = (o, p) => Object.hasOwnProperty.call(o || !1, p);

    // ------------------------------------------------------------------------------------------

    /** @class mBroadcaster */
    const mBroadcaster = freeze({
        isAttachable,
        getBroadcastChannel,

        /**
         * Add broadcast event listener.
         * @param {String} topic A string representing the event type to listen for.
         * @param {Object|Function} options Event options or function to invoke.
         * @returns {String|Boolean} The ID identifying the event, or falsy.
         * @memberOf mBroadcaster
         */
        addListener(topic, options) {

            if (typeof options === 'function') {
                options = {
                    onBroadcast: tryCatch(options, reportError)
                };
            }
            else if (hasOwn(options, 'handleEvent')) {
                options = {
                    scope: options,
                    onBroadcast: tryCatch(options.handleEvent, reportError)
                };
            }
            else if (!hasOwn(options, 'onBroadcast')
                || typeof options.onBroadcast !== 'function') {

                console.error(topic, options);
                return false;
            }

            if (!mbl.has(topic)) {
                mbl.set(topic, new Map());
            }

            const id = makeUUID();
            mbl.get(topic).set(id, freeze(options));

            // if (d) console.log('Adding broadcast listener', topic, id, options);

            return id;
        },

        /**
         * Check whether someone is listening for an event
         * @param {String} topic A string representing the event type we may be listening for.
         * @returns {Boolean}
         */
        hasListener(topic) {

            return mbl.has(topic);
        },

        /**
         * Remove all broadcast events for an specific topic.
         * @param {String} topic The string representing the event type we were listening for.
         * @returns {Boolean} Whether the event was found.
         * @memberOf mBroadcaster
         */
        removeListeners(topic) {

            return mbl.delete(topic);
        },

        /**
         * Remove an specific event based on the ID given by addListener()
         * @param {String} token The ID identifying the event.
         * @param {EventListener} [listener] Optional DOM event listener.
         * @returns {Boolean} Whether the event was found.
         * @memberOf mBroadcaster
         */
        removeListener(token, listener) {

            // if (d) console.log('Removing broadcast listener', token);

            if (listener) {
                // Remove an EventListener interface.
                let found;
                for (const [k, v] of mbl.get(token)) {
                    if (v.scope === listener) {
                        found = k;
                        break;
                    }
                }
                token = found;
            }

            for (const [topic, map] of mbl) {
                if (map.has(token)) {
                    map.delete(token);
                    if (!map.size) {
                        mbl.delete(topic);
                    }
                    return true;
                }
            }
            return false;
        },

        /**
         * Send a broadcast event
         * @param {String} topic A string representing the event type to notify.
         * @param {*} [args] additional parameters to pass through.
         * @returns {Boolean} Whether anyone was listening.
         * @memberOf mBroadcaster
         */
        sendMessage(topic, ...args) {

            if (mbl.has(topic)) {
                const map = mbl.get(topic);
                const blk = [...map];

                if (!args.length) {
                    args = [{type: topic}];
                }

                if (self.d > 1) {
                    console.warn(`\u{1F4FB} Broadcasting message '${topic}'`, args);
                }

                for (let i = 0; i < blk.length; ++i) {
                    const [id, obj] = blk[i];

                    if (obj.onBroadcast.apply(obj.scope, args) === 0xDEAD || obj.once) {

                        map.delete(id);
                        if (!map.size) {
                            mbl.delete(topic);
                        }
                    }
                }

                return true;
            }

            return false;
        },

        /**
         * Wrapper around addListener() that will listen for the event just once.
         * @param {String} topic A string representing the event type to listen for.
         * @param {Function} callback function to invoke on broadcast message
         * @memberOf mBroadcaster
         */
        once(topic, callback) {

            this.addListener(topic, {once: true, onBroadcast: callback});
        },

        /**
         * Wrapper around once() using Promise/A+
         * @param {String} topic A string representing the event type to listen for.
         * @returns {Promise<*>} *first* argument of the dispatched broadcast message
         * @memberOf mBroadcaster
         */
        when(topic) {
            return new Promise((resolve) => this.once(topic, resolve));
        },

        /**
         * Creates a new broadcaster instance
         * @param {*} [name] id
         * @returns {*} object
         * @private
         */
        create(name = 'unk') {
            name = `#${name}${makeUUID().slice(-13)}-${crossTab.channel.origin}`;
            return Object.create(mBroadcaster, Object.getOwnPropertyDescriptors({
                addListener(x, y) {
                    return mBroadcaster.addListener(`${x}${name}`, y);
                },
                sendMessage(x, ...y) {
                    return mBroadcaster.sendMessage(`${x}${name}`, ...y);
                },
                crossTab: Object.assign({}, mBroadcaster.crossTab)
            }));
        },

        crossTab: freeze({

            get owner() {
                return str(crossTab.primary);
            },

            get actors() {
                return (crossTab.actors || []).map(str);
            },

            get handle() {
                return str(crossTab.handle);
            },

            get origin() {
                return crossTab.channel.origin;
            },

            get peers() {
                return !crossTab.primary || crossTab.actors && crossTab.actors.length;
            },

            initialize() {
                return new Promise((resolve, reject) => {
                    const setup = (ev) => {
                        const msg = str(ev && ev.data.message);

                        if (resolve && (!ev || msg === 'pong')) {
                            let type = 'ACTOR';

                            this.detach(setup);

                            if (msg === 'pong') {
                                this.notify('ack-pong');
                            }
                            else {
                                type = 'OWNER';
                                this.takeOwnership();
                            }
                            this.attach(ME);

                            if (self.d) {
                                crossTab.logger.info(`\u{1F9F2} CROSS-TAB MESSAGING INITIALIZED AS ${type} \u{1F440}`);

                                console.log(str(self.ua));
                                console.log(self.buildVersion);
                                if (self.browserdetails) {
                                    console.log(browserdetails(ua).prod + u_handle);
                                }
                            }
                            mBroadcaster.sendMessage('crossTab:setup', this.owner);

                            resolve(this.owner);
                            resolve = null;
                        }
                    };

                    this.attach(setup);
                    this.notify('ping');

                    crossTab.actors.length = 0;
                    crossTab.handle = u_handle;

                    // if multiple tabs are reloaded/opened at the same time,
                    // they would both see .ctInstances as === 0, so we need
                    // to increase this as early as possible, e.g., now.
                    storage.ctInstances = 1 + (parseInt(storage.ctInstances) | 0);

                    tSleep(parseInt(storage.ctInstances) === 1 ? 0 : 3 + Math.random())
                        .then(setup)
                        .catch(reject);
                });
            },

            notify(message, data) {
                crossTab.channel.dispatchEvent(message, data);
            },

            attach(aListener) {
                crossTab.channel.attachEvent(aListener, this);
            },

            detach(aListener) {
                crossTab.channel.detachEvent(aListener, this);
            },

            leave() {
                if (crossTab.handle) {
                    const owner = crossTab.primary;

                    if (owner) {
                        if (parseInt(storage.ctInstances) > 1) {
                            storage.ctInstances--;
                        }
                        else {
                            storage.ctInstances = 0;
                        }
                        crossTab.primary = false;
                    }

                    this.detach(ME);
                    this.notify('leaving', {
                        owner,
                        election: owner && crossTab.actors[0]
                    });

                    crossTab.handle = null;
                    crossTab.channel.close();
                    mBroadcaster.sendMessage('crossTab:leave', owner);
                }
            },

            takeOwnership() {
                crossTab.primary = 1 + String.fromCharCode.apply(null, mega.getRandomValues(32)).replace(/[^--~]/g, '');

                storage.ctInstances = crossTab.actors.length + 1;
                mBroadcaster.sendMessage('crossTab:owner', this.owner);

                this.notify('pong');
            },

            handleEvent({data: {message, data, origin}}) {
                if (crossTab.channel.debug) {
                    crossTab.channel.debug(`\u{1F4E9} Received '${message}' message from ${origin.toString(36)}`, data);
                }

                if (origin === crossTab.channel.origin) {
                    if (self.d) {
                        crossTab.logger.warn('Ignoring crossTab event!', message);
                    }
                    return;
                }

                switch (message) {
                    case 'ack-pong':
                        if (!crossTab.primary || crossTab.actors.includes(origin)) {
                            break;
                        }
                    /* fallthrough */
                    case 'ping':
                        crossTab.actors.push(origin);

                        if (crossTab.primary) {
                            storage.ctInstances = crossTab.actors.length + 1;
                        }

                        mBroadcaster.sendMessage('crossTab:actor', origin);
                        this.notify('pong');
                        break;

                    case 'leaving': {
                        const idx = crossTab.actors.indexOf(origin);

                        if (idx !== -1) {
                            crossTab.actors.splice(idx, 1);

                            if (crossTab.primary) {
                                storage.ctInstances = crossTab.actors.length + 1;
                            }
                        }

                        if (data.election === crossTab.channel.origin) {

                            if (self.d) {
                                crossTab.logger.info('\u{1F630} Taking cross-tab ownership.');
                            }
                            this.takeOwnership();
                        }
                    }
                    /* fallthrough */
                    default:
                        mBroadcaster.sendMessage(`crossTab:${message}`, {data, origin});
                        break;
                }
            }
        }),

        [Symbol(`__private__`)]: self.d > 0 && [mbl, crossTab, channels]
    });

    if (self.mBroadcaster) {
        const {mbl} = self.mBroadcaster;
        if (self.d && mbl.length) {
            console.info('#%d runtime broadcast listeners...', mbl.length / 3, mbl);
        }

        for (let i = 0; i < mbl.length; i += 3) {
            const once = mbl[i];
            const topic = mbl[i + 1];
            const options = mbl[i + 2];
            mBroadcaster[once ? 'once' : 'addListener'](topic, options);
        }

        delete self.mBroadcaster;
    }

    Object.defineProperty(self, 'mBroadcaster', {value: mBroadcaster});
})();
