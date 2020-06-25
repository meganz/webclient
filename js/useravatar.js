/**
 * Handle all logic for rendering for users' avatar
 */
var useravatar = (function() {

    'use strict';

    var _colors = [
        "#69F0AE",
        "#13E03C",
        "#31B500",
        "#00897B",
        "#00ACC1",
        "#61D2FF",
        "#2BA6DE",
        "#FFD300",
        "#FFA500",
        "#FF6F00",
        "#E65100",
        "#FF5252",
        "#FF1A53",
        "#C51162",
        "#880E4F"
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
     * Return a SVG image representing the Letter avatar
     * @param {Object} user The user object or email
     * @returns {String}
     * @private
     */
    function _getAvatarSVGDataURI(user) {

        var s = _getAvatarProperties(user);
        var $template = $('#avatar-svg').clone().removeClass('hidden')
            .find('svg').addClass('color' + s.colorIndex).end()
            .find('text').text(s.letters).end();

        $template = window.btoa(to8($template.html()));

        return 'data:image/svg+xml;base64,' + $template;
    }

    /**
     * Return two letters and the color for a given string.
     * @param {Object|String} user The user object or email
     * @returns {Object}
     * @private
     */
    function _getAvatarProperties(user) {
        user = String(user.u || user);
        var name  = M.getNameByHandle(user) || user;
        if (name === user && M.suba[user] && M.suba[user].firstname) {
            // Acquire the avatar matches the first letter for pending accounts in business account
            name = from8(base64urldecode(M.suba[user].firstname)).trim();
        }
        var color = UH64(user).mod(_colors.length);

        if (color === false) {
            color = user.charCodeAt(0) % _colors.length;
        }

        return {letters: name.toUpperCase()[0], color: _colors[color], colorIndex: color + 1};
    }

    /**
     * Return the HTML to represent a two letter avatar.
     *
     * @param {Object} user The user object or email
     * @param {String} className Any extra CSS classes that we want to append to the HTML
     * @param {String} element The HTML tag
     * @returns {String} Returns the HTML
     * @returns {Boolean} Adds addition blured background block
     * @private
     */
    function _getAvatarContent(user, className, element, bg) {
        var id = user.u || user;
        var bgBlock = '';

        if (element === 'ximg') {
            return _getAvatarSVGDataURI(user);
        }

        var s = _getAvatarProperties(user);

        if (!_watching[id]) {
            _watching[id] = {};
        }

        if (bg) {
            bgBlock = '<div class="avatar-bg colorized">' +
                '<span class="colorized color' + s.colorIndex + '"></span></div>';
        }

        _watching[id][className] = true;

        id        = escapeHTML(id);
        element   = escapeHTML(element);

        if (className && className !== '') {
            className = 'avatar-wrapper ' + escapeHTML(className);
        }
        else {
            className = 'avatar-wrapper small-rounded-avatar';
        }

        return  bgBlock +
            '<' + element + ' data-color="color' + s.colorIndex + '" class="' +
                id + ' color' + s.colorIndex + ' ' + className + '">' +
                '<i class="verified_icon"></i>' + s.letters +
            '</' + element + '>';
    }

    /**
     * Return an image HTML from an URL.
     *
     * @param {String} url The image URL
     * @param {String} id The ID associated with the avatar (uid)
     * @param {String} className Any extra CSS classes that we want to append to the HTML
     * @param {String} type The HTML tag type
     * @returns {String} The image HTML
     * @returns {Boolean} Adds addition blured background block
     * @private
     */
    function _getAvatarImageContent(url, id, className, type, bg) {
        var bgBlock = '';
        id        = escapeHTML(id);
        url       = escapeHTML(url);
        type      = escapeHTML(type);

        if (className && className !== '') {
            className = 'avatar-wrapper ' + escapeHTML(className);
        }
        else {
            className = 'avatar-wrapper small-rounded-avatar';
        }

        if (bg) {
            bgBlock = '<div class="avatar-bg colorized">' +
                    '<span class="colorized"></span>' +
                '</div>';
        }

        return bgBlock +
            '<' + type + ' data-color="" class="' + id + ' ' + className + '">' +
                '<i class="verified_icon"></i>' +
                '<img src="' + url + '">' +
            '</' + type + '>';
    }

    /**
     * Check if the current user is verified by the current user. It
     * is asynchronous and waits for `u_authring.Ed25519` is ready.
     * @param {String} userHandle The user handle
     * @private
     */
    var pendingVerifyQuery = {};
    function isUserVerified(userHandle) {
        if (u_type !== 3 || userHandle === u_handle || pendingVerifyQuery[userHandle]) {
            return;
        }
        pendingVerifyQuery[userHandle] = Date.now();

        if (d > 1) {
            logger.log('isUserVerified', userHandle);
        }

        authring.onAuthringReady('avatar-v').done(function isUserVerified_Callback() {
            var ed25519 = u_authring.Ed25519;
            var verifyState = ed25519 && ed25519[userHandle] || {};
            var isVerified = (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            if (isVerified) {
                $('.avatar-wrapper.' + userHandle.replace(/[^\w-]/g, '')).addClass('verified');
            }
        }).always(function() {
            delete pendingVerifyQuery[userHandle];
        });
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
    ns.mine = function() {

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
     * A new contact has been loaded, let's see if they have any two-letters avatars, if
     * that is the case we replace that old avatar *everywhere* with their proper avatar.
     * @param {String} user The user handle
     */
    ns.loaded = function(user) {

        if (typeof user !== "string") {
            logger.warn('Invalid user-handle provided!', user);
            return false;
        }
        if (d > 1) {
            logger.debug('Processing loaded user-avatar', user);
        }

        if (user === u_handle) {
            var myavatar = ns.mine();

            $('.fm-avatar img,.fm-account-avatar img, .top-menu-popup .avatar-block', 'body')
                .attr('src', myavatar);
            $('.fm-account-avatar .avatar-bg span').css('background-image', 'url(' + myavatar + ')');
            $('.fm-avatar').show();

            // we recreate the top-menu on each navigation, so...
            ns.my = myavatar;
        }

        if (M.u[user]) {
            // .trackDataChange() will trigger some parts in the Chat UI to re-render.
            M.u[user].trackDataChange(M.u[user], "avatar");
        }

        var $avatar = null;
        var updateAvatar = function() {
            if ($avatar === null) {
                // only do a $(....) call IF .updateAvatar is called.
                $avatar = $(ns.contact(user));
            }

            var $this = $(this);
            if (this.classList.contains("chat-avatar")) {
                // don't touch chat avatars. they update on their own.
                return;
            }

            $this.removeClass($this.data('color'))
                .addClass($avatar.data('color'))
                .data('color', $avatar.data('color'))
                .safeHTML($avatar.html());
        };

        $('.avatar-wrapper.' + user.replace(/[^\w-]/g, '') + ':not(.in-chat)').each(updateAvatar);

        if ((M.u[user] || {}).m) {
            var eem = String(M.u[user].m).replace(/[^\w@.,+-]/g, '').replace(/\W/g, '\\$&');
            $('.avatar-wrapper.' + eem).each(updateAvatar);
        }
    };

    ns.generateContactAvatarMeta = function(user) {
        user = M.getUser(user) || String(user);

        if (user.avatar) {
            return user.avatar;
        }

        if (user.u) {
            isUserVerified(user.u);

            if (avatars[user.u]) {
                user.avatar = {
                    'type': 'image',
                    'avatar': avatars[user.u].url
                };
            }
            else {
                user.avatar = {
                    'type': 'text',
                    'avatar': _getAvatarProperties(user)
                };
            }

            return user.avatar;
        }

        return {
            'type': 'text',
            'avatar': _getAvatarProperties(user)
        };
    };
    /**
     * Returns a contact avatar
     * @param {String|Object} user
     * @param {String} className
     * @param {String} element
     * @returns {String}
     * @returns {Boolean} Adds addition blured background block
     */
    ns.contact = function(user, className, element, bg) {
        user = M.getUser(user) || String(user);

        element   = element || 'div';
        className = className || 'small-rounded-avatar';

        if (user.u) {
            isUserVerified(user.u);
        }

        if (avatars[user.u]) {
            return _getAvatarImageContent(avatars[user.u].url, user.u, className, element, bg);
        }

        return _getAvatarContent(user, className, element, bg);
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
         * @param {String} chathandle The chat handle
         * @return {MegaPromise}
         */
        ns.loadAvatar = function(handle, chathandle) {
            // Ensure this is a sane call...
            if (typeof handle !== 'string' || handle.length !== 11) {
                logger.error('Unable to retrieve user-avatar, invalid handle!', handle);
                return MegaPromise.reject(EARGS);
            }
            if (missingAvatars[handle]) {
                // If the retrieval already failed for the current session
                if (d > 1) {
                    logger.warn('User-avatar retrieval for "%s" had failed...', handle, missingAvatars[handle]);
                }
                return MegaPromise.reject(missingAvatars[handle]);
            }
            if (pendingGetters[handle]) {
                // It's already pending, return associated promise
                if (d > 1) {
                    logger.warn('User-avatar retrieval for "%s" already pending...', handle);
                }
                return pendingGetters[handle];
            }
            if (avatars[handle]) {
                if (d > 1) {
                    logger.warn('User-avatar for "%s" is already loaded...', handle, avatars[handle]);
                }
                return MegaPromise.resolve(EEXIST);
            }

            var promise = new MegaPromise();
            pendingGetters[handle] = promise;

            var reject = function(error) {
                if (d > 1) {
                    logger.warn('User-avatar retrieval for "%s" failed...', handle, error);
                }

                missingAvatars[handle] = error;
                promise.reject.apply(promise, arguments);
            };

            if (d > 1) {
                logger.debug('Initiating user-avatar retrieval for "%s"...', handle);
            }

            mega.attr.get(handle, 'a', true, false, undefined, undefined, chathandle)
                .fail(reject)
                .done(function(res) {
                    var error = res;

                    if (typeof res !== 'number' && res.length > 5) {
                        try {
                            var ab = base64_to_ab(res);
                            ns.setUserAvatar(handle, ab);

                            if (d > 1) {
                                logger.info('User-avatar retrieval for "%s" successful.', handle, ab, avatars[handle]);
                            }

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
            if (d > 1) {
                logger.debug('Invalidating user-avatar for "%s"...', handle);
            }

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

    return ns;
})();
