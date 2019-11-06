// jscs:disable disallowImplicitTypeConversion
/**
 * Controller for the account notifications preferences.
 */
// Account Notifications (preferences)
(function(map) {
    'use strict';

    var _enum = [];
    var _tag = 'ACCNOTIF_';

    Object.keys(map)
        .forEach(function(k) {
            map[k] = map[k].map(function(m) {
                return k.toUpperCase() + '_' + m.toUpperCase();
            });

            var rsv = 0;
            var memb = clone(map[k]);

            while (memb.length < 10) {
                memb.push(k.toUpperCase() + '_RSV' + (++rsv));
            }

            if (memb.length > 10) {
                throw new Error('Stack overflow..');
            }

            _enum = _enum.concat(memb);
        });

    makeEnum(_enum, _tag, mega);

    Object.defineProperty(mega, 'notif', {
        value: Object.freeze((function(flags) {
            function check(flag, tag) {
                if (typeof flag === 'string') {
                    if (tag !== undefined) {
                        flag = tag + '_' + flag;
                    }
                    flag = String(flag).toUpperCase();
                    flag = mega[flag] || mega[_tag + flag] || 0;
                }
                return flag;
            }
            return {
                get flags() {
                    return flags;
                },

                setup: function setup(oldFlags) {
                    if (oldFlags === undefined) {
                        // Initialize account notifications to defaults (all enabled)
                        assert(!fmconfig.anf, 'Account notification flags already set');

                        Object.keys(map)
                            .forEach(function(k) {
                                var grp = map[k];
                                var len = grp.length;

                                while (len--) {
                                    this.set(grp[len]);
                                }
                            }.bind(this));
                    }
                    else {
                        flags = oldFlags;
                    }
                },

                has: function has(flag, tag) {
                    return flags & check(flag, tag);
                },

                set: function set(flag, tag) {
                    flags |= check(flag, tag);
                    mega.config.set('anf', flags);
                },

                unset: function unset(flag, tag) {
                    flags &= ~check(flag, tag);
                    mega.config.set('anf', flags);
                }
            };
        })(0))
    });

    _enum = undefined;

})({
    chat: ['ENABLED'],
    cloud: ['ENABLED', 'NEWSHARE', 'DELSHARE', 'NEWFILES'],
    contacts: ['ENABLED', 'FCRIN', 'FCRACPT', 'FCRDEL']
});
