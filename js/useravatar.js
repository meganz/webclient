/**
 * Handle all logic for rendering for users' avatar
 */
var useravatar = (function() {

    'use strict';

    var _colors = [
        '#FF6A19',
        '#5856d6',
        '#007aff',
        '#34aadc',
        '#5ac8fa',
        '#4cd964',
        '#ff1a53',
        '#d90007',
        '#ff9500',
        '#ffcc00'
    ];

    var logger = MegaLogger.getLogger('useravatar');

    /**
     * List of TWO-letters avatars that we ever generated. It's useful to replace
     * the moment we discover the real avatar associate with that avatar
     */
    var _watching = {};

    /**
     *  Public methods
     */
    var ns = {};

    /**
     * Take the class colors and create a inject as a CSS.
     */
    function registerCssColors() {

        var css = '';
        var color = '';

        for (var i in _colors) {
            if (!_colors.hasOwnProperty(i)) {
                continue;
            }
            color = '.color' + (parseInt(i) + 1);
            css += color + ', .nw-contact-avatar' + color + ', .contacts-avatar' + color
                + ', .avatar' + color + ' { background-color: '
                + _colors[i] + '; }';
        }

        css = mObjectURL([css], 'text/css');
        mCreateElement('link', { type: 'text/css', rel: 'stylesheet' }, 'head').href = css;
    };

    /**
     * Return a SVG image representing the TWO-Letters avatar
     * @private
     * @param {String} letters
     * @returns {String}
     */
    function _lettersImg(letters) {

        var s = _lettersSettings(letters);
        var $template = $('#avatar-svg').clone().removeClass('hidden')
            .find('svg').css('background-color', s.color).end()
            .find('text').text(s.letters).end();

        $template = window.btoa(to8($template.html()));

        return 'data:image/svg+xml;base64,' + $template;
    };

    /**
     * Return two letters and the color for a given string.
     * @private
     * @param {String} word
     * @returns {String}
     */
    function _lettersSettings(word) {

        var letters = '';
        var color   = 1;

        if (word && word !== u_handle) {
            letters = $.trim(word).toUpperCase()[0];
            // letters[0] can be undefined in case that word == ' '...
            if (letters) {
                color = letters.charCodeAt(0) % _colors.length;
            } else {
                color = 0;
            }
        }

        return { letters: letters, color: _colors[color], colorIndex: color + 1 };
    };

    /**
     * Return the HTML to represent a two letter avatar.
     *
     * @param {String} letters The string used to generate the avatar e.g. first name, full name or email address
     * @param {String} id The ID associate with the avatar (uid, email)
     * @param {String} className Any extra CSS classes that we want to append to the HTML
     * @param {String} element The HTML tag
     * @return {String} Returns the HTML
     */
    function _letters(letters, id, className, element) {

        if (element === 'ximg') {
            return _lettersImg(letters);
        }

        var s = _lettersSettings(letters);

        if (!_watching[id]) {
            _watching[id] = {};
        }

        _watching[id][className] = true;
        return '<' + element + ' data-color="color' + s.colorIndex + '" class="avatar-wrapper ' + className + ' ' + id +  ' color' + s.colorIndex + '"><span>'
                    + '<div class="verified_icon"></div>'
                    + s.letters
                + '</span></' + element + '>';
    };

    /**
     * Return an image HTML from an URL.
     *
     * @param {String} url The image URL
     * @param {String} id The ID associated with the avatar (uid)
     * @param {String} className Any extra CSS classes that we want to append to the HTML
     * @param {String} type The HTML tag type
     * @returns {String} The image HTML
     */
    function _image(url, id, className, type) {

        return '<' + type + ' data-color="" class="avatar-wrapper ' + id + ' ' + className + '">'
                + '<div class="verified_icon"></div>'
                + '<img src="' + url + '">'
         + '</' + type + '>';
    };

    /**
     * Render an avatar based on given email. We try to find
     * the contact object by their email, if we cannot, we render
     * the first two letters of the email address.
     *
     * @param {String} email Email address
     * @param {String} className Any extra class attribute to inject
     * @param {String} element Wrap the output with `element` tag
     * @returns HTML
     */
    function emailAvatar(email, className, element) {

        var found = false;
        // User is an email, we should look if the user
        // exists, if it does exists we use the user Object.
        M.u.every(function(contact, u) {
            if (M.u[u].m === email) {
                // Found the user object
                found = ns.contact(M.u[u], className, element);
                return false;
            }
            else {
                return true;
            }
        });

        if (found) {
            return found;
        }

        return _letters(email.substr(0, 2), email, className, element);
    }


    /**
     * Check if the current user is verified by the current user. It
     * is asynchronous and waits for `u_authring.Ed25519` is ready.
     * @param {String} userHandle The user handle
     * @private
     */
    function isUserVerified(userHandle) {
        if (u_type !== 3) {
            return;
        }

        if (authring.hadInitialised() === false) {
            var authSystemPromise = authring.initAuthenticationSystem();
            authSystemPromise.done(isUserVerified_Callback);
        }
        else {
            Soon(isUserVerified_Callback);
        }

        function isUserVerified_Callback() {
            var ed25519 = u_authring.Ed25519;
            var verifyState = ed25519 && ed25519[userHandle] || {};
            var isVerified = (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            if (isVerified) {
                $('.avatar-wrapper.' + userHandle).addClass('verified');
            }
        }
    }

    /**
     * Check if the input is an email address or not.
     * @param {String} email The email address
     * @returns {Boolean}
     */
    function isEmail(email) {

        return ((typeof email === 'string') && email.match(/.+@.+/));
    }

    /**
     * Like the `contact` method but instead of returning a
     * div with the avatar inside it returns an image URL.
     * @param {String} contact The contact's user handle
     * @returns {String} The HTML to be rendered
     */
    ns.imgUrl = function(contact) {

        if (avatars[contact]) {
            return avatars[contact].url;
        }

        return ns.contact(contact, '', 'ximg');
    };

    /**
     * Return the current user's avatar in image URL.
     */
    ns.top = function() {

        if (!u_handle) {
            /* No user */
            return '';
        }

        try {
            return ns.imgUrl(u_handle);
        }
        catch (ex) {
            logger.error(ex);
            return '';
        }
    };


    /**
     * Return the current user's avatar in image URL.
     */
    ns.mine = function() {

        // If no user, return default avatar
        if (!u_handle) {
            return '';
        }

        return ns.imgUrl(u_handle);
    };

    /**
     * A new contact has been loaded, let's see if they have any two-letters avatars, if
     * that is the case we replace that old avatar *everywhere* with their proper avatar.
     * @param {String} user The user handle
     */
    ns.loaded = function(user) {

        if (typeof user !== "string") {
            logger.warn('Invalid user-handle provided!', user);
            return false;
        }
        logger.debug('Processing loaded user-avatar', user);

        if (user === u_handle) {
            // my avatar!
            $('.fm-avatar img,.fm-account-avatar img').attr('src', ns.imgUrl(user));
        }

        if (M.u[user]) {
            // .trackDataChange() will trigger some parts in the Chat UI to re-render.
            M.u[user].trackDataChange();
        }

        var $avatar = null;
        function updateAvatar() {
            if ($avatar === null) {
                // only do a $(....) call IF .updateAvatar is called.
                $avatar = $(ns.contact(user));
            }

            var $this = $(this);
            $this.removeClass($this.data('color'))
                .addClass($avatar.data('color'))
                .data('color', $avatar.data('color'))
                .safeHTML($avatar.html());
        }

        $('.avatar-wrapper.' + user).each(updateAvatar);

        if ((M.u[user] || {}).m) {
            $('.avatar-wrapper.' + M.u[user].m.replace(/[\.@]/g, "\\$1")).each(updateAvatar);
        }
    };

    ns.generateContactAvatarMeta = function(user) {
        if (M.u[user]) {
            user = M.u[user];
        }
        else if (user === u_handle) {
            user = u_attr;
        }
        else if (M.u[user]) {
            // It's an user ID
            user = M.u[user];
        }

        if (user && user.u && user.avatar) {
            return user.avatar;
        }


        if (typeof user === 'string' && user.length > 0 && user.indexOf("@") > -1) {
            // "@" is faster then isEmail's greping for non-contacts!
            if (isEmail(user)) {
                var email = user;
                var found = false;
                // User is an email, we should look if the user
                // exists, if it does exists we use the user Object.
                M.u.every(function(contact, u) {
                    if (M.u[u].m === email) {
                        // Found the user object
                        found = ns.generateContactAvatarMeta(M.u[u]);
                        return false;
                    }
                    else {
                        return true;
                    }
                });

                if (found) {
                    return found;
                }

                return {
                    'type': 'text',
                    'avatar': _lettersSettings(email.substr(0, 2))
                };
            }
            else {
                return {
                    'type': 'text',
                    'avatar': _lettersSettings(user.substr(0, 2))
                };
            }
        }

        if (!user || typeof user !== 'object' || !user.u) {
            return {
                'type': 'text',
                'avatar': ''
            };
        }

        isUserVerified(user.u);

        if (avatars[user.u]) {
            user.avatar = {
                'type': 'image',
                'avatar': avatars[user.u].url
            };

            return user.avatar;
        }

        var letters = M.getNameByHandle(user.u);

        if (!letters) {
            // XXX: not a known user?
            letters = user.name2 && $.trim(user.name2) || user.u;
        }

        if (user && user.u) {
            user.avatar = {
                'type': 'text',
                'avatar': _lettersSettings(letters.substr(0, 2))
            };
            return user.avatar;
        }
        else {
            return {
                'type': 'text',
                'avatar': _lettersSettings(letters.substr(0, 2))
            }
        }
    };
    /**
     * Returns a contact avatar
     * @param {String|Object} user
     * @param {String} className
     * @param {String} element
     * @returns {String}
     */
    ns.contact = function(user, className, element) {
        if (!className) {
            className = 'avatar';
        }

        element = element || 'div';

        if (typeof user === 'string' && user.length > 0) {
            if (isEmail(user)) {
                return emailAvatar(user, className, element);
            }
            else if (user === u_handle) {
                user = u_attr;
            }
            else if (M.u[user]) {
                // It's an user ID
                user = M.u[user];
            }
            else {
                return _letters(user, user, className, element);
            }
        }

        if (!user || typeof user !== 'object' || !user.u) {
            return '';
        }

        isUserVerified(user.u);

        if (avatars[user.u]) {
            return _image(avatars[user.u].url, user.u, className, element);
        }

        var letters = M.getNameByHandle(user.u);

        if (!letters) {
            // XXX: not a known user?
            letters = user.name2 && $.trim(user.name2) || user.u;
        }

        return _letters(letters, user.u, className, element);
    };

    // Generic logic to retrieve and process user-avatars
    // from either server-side or local-cache
    (function loadAvatarStub(ns) {
        // hold pending promises waiting for avatar data
        var pendingGetters = {};
        // hold user-avatar handle who failed to retrieve
        var missingAvatars = {};

        /**
         * Load the avatar associated with an user handle
         * @param {String} handle The user handle
         * @return {MegaPromise}
         */
        ns.loadAvatar = function(handle) {
            // Ensure this is a sane call...
            if (typeof handle !== 'string' || handle.length !== 11) {
                logger.error('Unable to retrieve user-avatar, invalid handle!', handle);
                return MegaPromise.reject(EARGS);
            }
            if (missingAvatars[handle]) {
                // If the retrieval already failed for the current session
                logger.warn('User-avatar retrieval for "%s" had failed...', handle, missingAvatars[handle]);
                return MegaPromise.reject(missingAvatars[handle]);
            }
            if (pendingGetters[handle]) {
                // It's already pending, return associated promise
                logger.warn('User-avatar retrieval for "%s" already pending...', handle);
                return pendingGetters[handle];
            }
            if (avatars[handle]) {
                logger.warn('User-avatar for "%s" is already loaded...', handle, avatars[handle]);
                return MegaPromise.resolve(EEXIST);
            }

            var promise = new MegaPromise();
            pendingGetters[handle] = promise;

            var reject = function(error) {
                logger.warn('User-avatar retrieval for "%s" failed...', handle, error);

                missingAvatars[handle] = error;
                promise.reject.apply(promise, arguments);
            };

            logger.debug('Initiating user-avatar retrieval for "%s"...', handle);

            mega.attr.get(handle, 'a', true, false)
                .fail(reject)
                .done(function(res) {
                    var error = res;

                    if (typeof res !== 'number' && res.length > 5) {
                        try {
                            var ab = base64_to_ab(res);
                            ns.setUserAvatar(handle, ab);

                            logger.info('User-avatar retrieval for "%s" successful.', handle, ab, avatars[handle]);

                            return promise.resolve();
                        }
                        catch (ex) {
                            error = ex;
                        }
                    }

                    reject(error);
                })
                .always(function() {
                    delete pendingGetters[handle];
                    ns.loaded(handle);
                });

            return promise;
        };

        /**
         * Set user-avatar based on its handle
         * @param {String} handle The user handle
         * @param {String} ab     ArrayBuffer with the avatar data
         * @param {String} mime   mime-type (optional)
         */
        ns.setUserAvatar = function(handle, ab, mime) {
            // deal with typedarrays
            ab = ab.buffer || ab;

            if (ab instanceof ArrayBuffer) {
                // check if overwritting and cleanup
                if (avatars[handle]) {
                    try {
                        myURL.revokeObjectURL(avatars[handle].url);
                    }
                    catch (ex) {
                        logger.warn(ex);
                    }
                }

                var blob = new Blob([ab], {type: mime || 'image/jpeg'});

                avatars[handle] = {
                    data: blob,
                    url: myURL.createObjectURL(blob)
                };
                if (M.u[handle]) {
                    M.u[handle].avatar = false;
                }
            }
            else {
                logger.warn('setUserAvatar: Provided data is not an ArrayBuffer.', ab);
            }
        };

        /**
         * Invalidate user-avatar cache, if any
         * @param {String} handle The user handle
         */
        ns.invalidateAvatar = function(handle) {
            logger.debug('Invalidating user-avatar for "%s"...', handle);

            if (pendingGetters[handle]) {
                // this could indicate an out-of-sync flow, or calling M.avatars() twice...
                logger.error('Invalidating user-avatar which is being retrieved!', handle);
            }

            avatars[handle] = missingAvatars[handle] = undefined;

            if (M.u[handle]) {
                M.u[handle].avatar = false;
            }
        };

        if (d) {
            ns._pendingGetters = pendingGetters;
            ns._missingAvatars = missingAvatars;
        }

    })(ns);

    Soon(registerCssColors);

    return ns;
})();
