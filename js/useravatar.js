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
            color   = letters.charCodeAt(0) % _colors.length;
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
        return '<' + element + ' class="avatar-wrapper ' + className + ' ' + id +  ' color' + s.colorIndex + '"><span>'
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

        return '<' + type + ' class="avatar-wrapper ' + id + ' ' + className + '">'
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
            authSystemPromise.always(isUserVerified_Callback);
        }
        else {
            Soon(isUserVerified_Callback);
        }

        function isUserVerified_Callback() {
            var verifyState = u_authring.Ed25519[userHandle] || {};
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
            return staticpath + 'images/mega/default-top-avatar.png';
        }

        try {
            return ns.imgUrl(u_handle);
        }
        catch (ex) {
            console.error(ex);
            return '';
        }
    };


    /**
     * Return the current user's avatar in image URL.
     */
    ns.mine = function() {

        // If no user, return default avatar
        if (!u_handle) {
            return staticpath + 'images/mega/default-avatar.png';
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
            return false;
        }

        if (user === u_handle) {
            // my avatar!
            $('.fm-avatar img,.fm-account-avatar img').attr('src', ns.imgUrl(user));
        }

        if (M.u[user]) {
            // .trackDataChange() will trigger some parts in the Chat UI to re-render.
            M.u[user].trackDataChange();
        }
        var avatar = $(ns.contact(user)).html();
        $('.avatar-wrapper.' + user).empty().html(avatar);

        if ((M.u[user] || {}).m) {
            $('.avatar-wrapper.' + M.u[user].m.replace(/[\.@]/g, "\\$1")).empty().html(avatar);
        }
    };

    /**
     * Returns a contact avatar
     * @param {String} user
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

        var letters = user.firstname || user.name || user.m;

        return _letters(letters, user.u, className, element);
    };

    Soon(registerCssColors);

    return ns;
})();
