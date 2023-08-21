/**
 * MegaNotifications is a v2 compatible notifications mini-frameworks with audio, desktop, title/favicon and last,
 * but not least flexible way of managing notifications for MEGA's webclient
 *
 * Dependencies:
 *  - http://ionden.com/a/plugins/ion.sound/en.html
 *  - http://adodson.com/notification.js/
 *  - http://lab.ejci.net/favico.js/
 */

(function($) {
    /**
     * Initialise the main entry point for managing notifications
     *
     * @param options {Object} see {MegaNotifications.DEFAULT_OPTIONS}
     * @returns {MegaNotifications}
     * @constructor
     */
    var MegaNotifications = function(options) {
        var self = this;

        self.options = $.extend({}, MegaNotifications.DEFAULT_OPTIONS, options);
        self.logger = new MegaLogger("notifications", {}, options.parentLogger);
        self._notifications = [];
        self._counters = {};
        self._lastBadgeCounter = 0;


        var sounds = [];

        self.options.sounds.forEach(function(v) {
            sounds.push({
                name: v
            });
        });

        sounds = {
            sounds: sounds,
            volume: self.options.soundsVolume,
            path: self.options.soundsPath,
            preload: self.options.soundsPreload,
            allow_cache: false
        };
        try {
            ion.sound(sounds);
        }
        catch (ex) {
            console.warn(ex);
        }

        if (self.options.showFaviconCounter) {
            assert(Favico, 'Favico.js is missing.');


            $('link[rel="icon"]').attr('href',
                (location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath) + 'favicon.ico'
            );

            self.favico = new Favico({
                type : 'rectangle',
                animation: 'popFade',
                bgColor : '#fff',
                textColor : '#d00'
            });

            self
                .rebind("onCounterUpdated.favicon", function() {
                    var count = 0;
                    obj_values(self._counters).forEach(function(v) {
                        count += v ? v : 0;
                    });


                    var badge = count > 9 ? "9+" : count;
                    if (self._lastBadgeCounter !== badge) {
                        delay('notifFavicoUpd', function () {
                            self.favico.reset();
                            self.favico.badge(badge);
                        });
                        self._lastBadgeCounter = badge;
                    }
                });
        }

        return self;
    };

    makeObservable(MegaNotifications);

    MegaNotifications.DEFAULT_OPTIONS = {
        individualNotificationsDefaults: {
            group: "generic",
            incrementCounter: false,
            sound: null,
            soundLoop: false,
            soundVolume: null,
            icon: null,
            anfFlag: false,
            params: {}
        },
        textMessages: {
        },
        sounds: [],
        soundsPath: staticpath + "sounds/",
        soundsPreload: true,
        soundsVolume: 0.07,
        showFaviconCounter: false,
        desktopNotifications: true,
        anfFlag: false
    };

    /**
     * Create new notification
     *
     * @param type {String} type of the notification (can be used for reseting counters and generating text messages for
     * the showing UI for the notification via the MegaNotifications.options.textMessages[type]...)
     *
     * @param options {Object} see: {MegaNotifications.DEFAULT_OPTIONS.individualNotificationsDefaults}
     * @param unread {Boolean}
     * @returns {*}
     */
    MegaNotifications.prototype.notify = function(type, options, unread) {
        var self = this;

        var evt = new $.Event('onBeforeNotificationCreated');
        self.trigger(evt, [type, options, unread]);
        if (evt.isPropagationStopped()) {
            return self;
        }

        options = $.extend({}, self.options.individualNotificationsDefaults, options);

        var notification = new MegaNotification(
            self,
            type,
            options,
            unread
        );

        self._notifications.push(
            notification
        );

        if (!self._counters[options.group] && options.incrementCounter) {
            self._counters[options.group] = 0;
        }

        return notification;
    };

    /**
     * Reset counter for a specific group (and optionally type) to 0
     *
     * @param group {String}
     * @param [type] {String}
     * @returns {MegaNotifications}
     */
    MegaNotifications.prototype.resetCounterGroup = function(group, type) {
        var self = this;

        var oldVal = self._counters[group];

        self._notifications.forEach(function(notification) {
            if (notification.options.group === group) {
                if (!type || type === notification.type) {
                    notification.setUnread(false, true);
                }
            }
        });

        if (self._counters[group] !== 0) {
            self._counters[group] = 0;
        }
        if (oldVal != self._counters[group]) {
            self.trigger("onCounterUpdated", [self, group, type]);
        }

        if (window.megaChatIsReady) {
            megaChat.updateSectionUnreadCount();
        }

        return this;
    };

    /**
     * Decrease the counter for a specific group
     *
     * @param group {String}
     * @param notificationObj {MegaNotification} object which triggered the decrease operation
     * @returns {MegaNotifications}
     */
    MegaNotifications.prototype.decreaseCounterGroup = function(group, notificationObj) {
        var oldVal = this._counters[group];

        if (this._counters[group] > 0) {
            this._counters[group]--;
        } else {
            this._counters[group] = 0;
        }

        if (oldVal != this._counters[group]) {
            this.trigger("onCounterUpdated", [this, group, notificationObj]);
        }

        if (window.megaChatIsReady) {
            megaChat.updateSectionUnreadCount();
        }

        return this;
    };

    /**
     * Increase the counter for a specific group
     *
     * @param group {String}
     * @param notificationObj {MegaNotification} object which triggered the increase operation
     * @returns {MegaNotifications}
     */
    MegaNotifications.prototype.increaseCounterGroup = function(group, notificationObj) {
        var oldVal = this._counters[group];

        if (!this._counters[group]) {
            this._counters[group] = 0;
        }

        if (this._counters[group] >= 0) {
            this._counters[group]++;
        } else {
            this._counters[group] = 0;
        }
        if (oldVal != this._counters[group]) {
            this.trigger("onCounterUpdated", [this, group, notificationObj]);
        }

        if (window.megaChatIsReady) {
            megaChat.updateSectionUnreadCount();
        }

        return this;
    };

    /**
     * Returns number (or undefined/falsy val) of unread notifications in a specific group
     *
     * @param group {String}
     * @returns {Integer|undefined}
     */
    MegaNotifications.prototype.getCounterGroup = function(group) {
        if (!this._counters[group]) {
            return 0;
        } else {
            return this._counters[group];
        }
    };

    MegaNotifications.prototype.isBusy = function() {
        if (!u_handle || !M.u[u_handle]) {
            // should never happen.
            return;
        }
        return M.u[u_handle].presence === UserPresence.PRESENCE.DND;
    };


    /**
     * Represents a single notification
     *
     * @param megaNotification {MegaNotifications} the master Notification object, which created this notification
     * @param type {String}
     * @param options {Object} see: {MegaNotifications.DEFAULT_OPTIONS.individualNotificationsDefaults}
     * @param unread {Boolean}
     * @returns {MegaNotification}
     * @constructor
     */
    var MegaNotification = function(megaNotification, type, options, unread) {
        var self = this;

        self.megaNotifications = megaNotification;
        self.type = type;
        self.options = options;
        self.unread = unread ? unread : false;
        if (Array.isArray(this.options.actions)) {
            // Service worker notifications should have these options set as below.
            this.options.incrementCount = false;
            this.options.soundLoop = false;
        }

        self.megaNotifications.trigger('onNotificationCreated', self);

        if (this.options.incrementCounter === true) {
            self.setUnread(unread);
        }

        if (!self.megaNotifications.isBusy() && (unread === true || self.options.alwaysPlaySound === true)) {
            if (self.options.anfFlag && mega.notif.has(self.options.anfFlag) !== 0) {
                if (
                    self.options.sound
                    && !(
                        ['upcoming-scheduled-occurrence', 'starting-scheduled-occurrence'].includes(this.type)
                        && Notification.permission !== 'granted'
                    )
                ) {
                    var playSound = function() {
                        ion.sound.stop(self.options.sound);
                        ion.sound.play(self.options.sound, {
                            loop: self.options.soundLoop,
                            volume: self.options.soundVolume !== null ?
                                self.options.soundVolume : self.megaNotifications.options.soundsVolume
                        });
                    };

                    // if soundLoop is not true, then use 'delay' to eventually skip multiple sounds trying to play
                    // at the same time
                    if (!self.options.soundLoop) {
                        delay('singletonSoundNotif', function () {
                            playSound();
                        });
                    }
                    else {
                        playSound();
                    }


                }
            }
        }

        if (unread === true) {
            if (!self.megaNotifications.isBusy() && self.options.anfFlag && mega.notif.has(self.options.anfFlag) !== 0) {
                self._showDesktopNotification();
            }
        }

        self.megaNotifications.trigger('onAfterNotificationCreated', self);

        return self;
    };

    makeObservable(MegaNotification);


    /**
     * Mark this notification as read/unread
     *
     * @param val {Boolean}
     * @param [silentUpdate] {Boolean} if true, will NOT trigger an event (e.g. UI update)
     * @returns {MegaNotification}
     */
    MegaNotification.prototype.setUnread = function(val, silentUpdate) {
        var self = this;
        var oldVal = self.unread;
        self.unread = val;

        if (val === true && self.options.incrementCounter === true) {
            self.megaNotifications.increaseCounterGroup(self.options.group, this);
        } else if (val === false && this.options.incrementCounter === true) {
            self.megaNotifications.decreaseCounterGroup(self.options.group, this);
        }

        if (self.options.soundLoop === true) {
            if (!self.options.alwaysPlaySound) {
                ion.sound.stop(self.options.sound);
            }
        }
        if (!val && self._desktopNotification) {
            self._desktopNotification.close();
        }

        if (!silentUpdate && oldVal != val) {
            self.megaNotifications.trigger('onUnreadChanged', [self, val]);
        }

        return self;
    };


    MegaNotification.prototype.forceStopSound = function(sound) {
        sound = sound || this.options.sound;
        if (sound) {
            ion.sound.stop(sound);
        }
    };

    /**
     * Internal function that will show desktop notifications (if they are enabled) + request permissions
     *
     * @private
     */
    MegaNotification.prototype._showDesktopNotification = function() {
        if (this.megaNotifications.options.desktopNotifications) {
            if (Notification.permission !== 'granted') {
                if (Notification.permission === 'denied') {
                    this.megaNotifications.logger.warn('Notification permission denied.');
                }
                else {
                    Notification.requestPermission().then(res => {
                        if (res === 'granted') {
                            this._showDesktopNotification();
                        }
                        else {
                            this.megaNotifications.logger.warn('Notification permission rejected: ', res);
                        }
                    });
                }
                return;
            }

            const textMessage = this.megaNotifications.options.textMessages[this.type];
            if (textMessage) {
                const { params, group, actions, data } = this.options;
                const title = typeof textMessage.title === 'function'
                    ? textMessage.title(this, params) : textMessage.title;
                const body = typeof textMessage.body === 'function' ? textMessage.body(this, params) : textMessage.body;
                let icon = typeof textMessage.icon === 'function' ? textMessage.icon(this, params) : textMessage.icon;

                if (icon === null) {
                    icon = undefined;
                }

                if (Array.isArray(actions)) {
                    if (navigator.serviceWorker) {
                        navigator.serviceWorker.ready
                            .then(swr => {
                                return swr.showNotification(
                                    title,
                                    {
                                        body,
                                        icon,
                                        tag: `${this.type}_${group}}`,
                                        actions,
                                        data: data || {}
                                    }
                                );
                            })
                            .catch((ex) => {
                                this.megaNotifications.logger.error(
                                    'Service worker failed to be ready. Using default notification'
                                );
                                const report = [
                                    1,
                                    buildVersion.website || 'dev',
                                    is_extension | 0,
                                    is_mobile | 0,
                                    String(ex && ex.message || ex).replace(/\s+/g, ' ').substr(0, 64),
                                ];
                                eventlog(99830, JSON.stringify(report));
                                delete this.options.actions;
                                this._showDesktopNotification();
                            });
                        return;
                    }
                    this.megaNotifications.logger.warn('Service worker unavailable. Using default notification');
                }

                this._desktopNotification = new Notification(title, {
                    body,
                    icon,
                    tag: `${this.type}_${group}`
                });

                this._desktopNotification.onclick = () => {
                    this.trigger('onClick');
                };
                this._desktopNotification.onclose = () => {
                    delete this._desktopNotification;
                    this.setUnread(false);
                    this.trigger('onClose');
                };
            } else {
                this.megaNotifications.logger.warn(
                    "Will skip showing desktop notification, since the text message is missing for type: ",
                    this.type,
                    this
                );
            }
        }

    };


    window.MegaNotifications = MegaNotifications;
})(jQuery);
