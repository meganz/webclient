/**
 * Service worker for mega.nz.
 */
(() => {
    'use strict';

    const logger = {
        log(...args) {
            this.print('log', ...args);
        },
        warn(...args) {
            this.print('warn', ...args);
        },
        error(...args) {
            this.print('error', ...args);
        },
        print(type, ...args) {
            const date = new Date().toISOString();
            let ll = `%c${date} [MEGA-SERVICEWORKER] ${type.toUpperCase()}`;
            if (typeof args[0] === 'string') {
                ll = `${ll}: ${args.shift()}`;
            }
            console[type](ll, `${this.style}${this.colors[type]}`, ...args);
        },
        colors: {log: '#000000', warn: '#C25700', error: '#FF0000'},
        style: 'color: white; padding-left: 1px; padding-right: 1px; background-color: ',
    };

    const dump = logger.print.bind(logger, 'warn', '[dump]');

    self.addEventListener('install', (ev) => {
        logger.log('Service worker installed. Activating immediately.');
        ev.waitUntil(self.skipWaiting());
    });

    self.addEventListener('activate', (ev) => {
        logger.log('Service worker activated. Claiming clients.');
        ev.waitUntil(self.clients.claim());
    });

    async function getClient(url) {
        const cs = await self.clients.matchAll({ type: 'window' });
        if (!cs.length) {
            // No clients open currently. Open a new one.
            if (!url) {
                throw Error('No URL to open');
            }
            if (!url.startsWith(self.location.origin)) {
                throw Error(`Unrelated URL being opened: ${url}`);
            }
            return self.clients.openWindow(url);
        }
        for (let i = 0; i < cs.length; i++) {
            // Prefer using clients that already have chat open.
            if (cs[i].url.includes('/chat')) {
                return cs[i];
            }
        }
        return cs[0];
    }

    self.addEventListener('notificationclick', (ev) => {
        ev.notification.close();

        // If there isn't a client open this is the URL that will be opened.
        const url = ev.notification.data && ev.notification.data.url || self.location.origin;
        let clientPromise;

        if (ev.action === 'click' || ev.action === 'close' || String(ev.action).startsWith('sched_starting_')) {
            clientPromise = getClient(url).then(client => {
                // Default to focus a client and posting back the action + any data from the initiating client.
                client.postMessage({
                    action: ev.action,
                    data: ev.notification.data,
                });
                if (!client.focused) {
                    return client.focus();
                }
            });
        }
        else {
            if (ev.action) {
                logger.error('Unsupported notification action:', ev.action);
            }
            clientPromise = getClient(url).then(client => {
                client.postMessage({
                    action: 'click',
                    data: ev.notification.data,
                });
            }).catch(dump);
        }
        ev.waitUntil(clientPromise);
    });

    self.addEventListener('notificationclose', (ev) => {
        // If there isn't already a window open don't bother making a new one.
        ev.waitUntil(getClient(false).then(client => {
            client.postMessage({
                action: 'close',
                data: ev.notification.data,
            });
        }).catch(dump));
    });
})();
