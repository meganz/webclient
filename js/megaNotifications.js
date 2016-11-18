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


            $('link[rel="icon"]').attr('href', (location.hostname === 'mega.nz' ? 'https://mega.nz/' : bootstaticpath) + 'favicon.ico');

            self.favico = new Favico({
                type : 'rectangle',
                animation: 'popFade',
                bgColor : '#fff',
                textColor : '#d00'
            });

            self
                .unbind("onCounterUpdated.favicon")
                .bind("onCounterUpdated.favicon", function(e) {
                    var count = 0;
                    obj_values(self._counters).forEach(function(v) {
                        count += v ? v : 0;
                    });

                    self.favico.badge(count);

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
            params: {}
        },
        textMessages: {
        },
        sounds: [],
        soundsPath: staticpath + "sounds/",
        soundsPreload: true,
        soundsVolume: 1,
        showFaviconCounter: true,
        desktopNotifications: true
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

        self.megaNotifications.trigger('onNotificationCreated', self);

        if (options.incrementCounter === true) {
            self.setUnread(unread);
        }

        if (unread === true || self.options.alwaysPlaySound === true) {
            if (self.options.sound) {
                ion.sound.stop(self.options.sound);
                ion.sound.play(self.options.sound, {
                    loop: self.options.soundLoop,
                    volume: self.options.soundVolume !== null ? self.options.soundVolume : self.megaNotifications.options.soundsVolume
                });
            }
        }

        if (unread === true) {
            self._showDesktopNotification();
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


    MegaNotification.prototype.forceStopSound = function() {
        var self = this;
        if (self.options.sound) {
            ion.sound.stop(self.options.sound);
        }
    };

    /**
     * Internal function that will show desktop notifications (if they are enabled) + request permissions
     *
     * @private
     */
    MegaNotification.prototype._showDesktopNotification = function() {
        var self = this;
        if (self.megaNotifications.options.desktopNotifications) {
            if (Notification.permission !== 'granted') {
                Notification.requestPermission();
            }


            var params = self.options.params;

            var textMessage = self.megaNotifications.options.textMessages[self.type];
            if (textMessage) {
                var title = $.isFunction(textMessage.title) ? textMessage.title(self, params) : textMessage.title;
                var body = $.isFunction(textMessage.body) ? textMessage.body(self, params) : textMessage.body;
                var icon = $.isFunction(textMessage.icon) ? textMessage.icon(self, params) : textMessage.icon;

                if (icon === null) {
                    icon = undefined;
                }

                self._desktopNotification = new Notification(title, {
                    body: body,
                    icon: icon,
                    tag: self.type + "_" + self.options.group
                });

                self._desktopNotification.onclick = function() {
                    self.trigger('onClick');
                };
                self._desktopNotification.onclose = function() {
                    delete self._desktopNotification;
                    self.setUnread(false);
                    self.trigger('onClose');
                };
            } else {
                self.megaNotifications.logger.warn("Will skip showing desktop notification, since the text message is missing for type: ", self.type, self);
            }
        }

    };


    window.MegaNotifications = MegaNotifications;
})(jQuery);
