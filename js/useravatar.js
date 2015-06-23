/**
 *  @fileOverview
 *  
 *  Handle all logic for rendering for users' avatar
 */


var useravatar = (function() {
    "use strict";
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
	    '#ffcc00',
    ];

    /**
     *  List of TWO-letters avatars that we ever generated. It's useful to replace
     *  the moment we discover the real avatar associate with that avatar
     */
    var _watching = {};
    
    /**
     *  Public methods
     */ 
    var ns = {};

    /**
     *  Take the class colors and create a inject as a CSS.
     */
    function registerCssColors() {
        var css = "";
        for (var i in _colors) {
            css += ".color" + (parseInt(i)+1) + " { background-color: " + _colors[i] + "; }";
        }
        css = mObjectURL([css], "text/css");
        mCreateElement('link', {type: 'text/css', rel: 'stylesheet'}, 'head').href = css;
    }

    /**
     *  private method
     *
     *  Return a SVG image representing the TWO-Letters avatar
     */
     function _twoLettersImg(letters) {
        var s = _twoLettersSettings(letters);
        var tpl = $('#avatar-svg').clone().removeClass('hidden')
            .find('svg').css('background-color', s.color).end()
            .find('text').text(s.letters).end();

        tpl = window.btoa(unescape(tpl.html()));
        return 'data:image/svg+xml;base64,' + tpl;
    }

    /**
     *  private method
     *
     *  Return two letters and the color for a given string
     *
     *  @return string
     */
    function _twoLettersSettings(letters) {
        var words = letters.split(/\W+/);
        if (words.length === 1) {
            letters = words[0].substr(0, 2);
        } else {
            letters = words[0][0]  + words[1][0];
        }
        var colors = parseInt(_colors.length/2)+1;
        var color = letters.charCodeAt(0) % colors + letters.charCodeAt(1) % colors;
        return {letters: letters.toUpperCase(), color: _colors[color], colorIndex: color};
    }

    /**
     *  Return the HTML to represent a two letter avatar.
     *
     *  @param letters      String used to generate the avatar
     *  @param id           ID associate with the avatar (uid, email)
     *  @param className Any extra CSS classes that we want to append to the HTML
     *  
     *  @return HTML
     */
    function _twoLetters(letters, id, className, element) {
        if (element === 'ximg') {
            return _twoLettersImg(letters);
        }
        var s = _twoLettersSettings(letters);
        if (!_watching[id]) {
            _watching[id] = {};
        }
        _watching[id][className] = true;
        return '<' + element + ' class="avatar-wrapper ' + className + ' ' + id +  ' color' + s.colorIndex + '">'
                    + s.letters
                + '</' + element + '>';
    }

    /**
     *  Return an image HTML from an URL
     *
     *  @param url          Image URL
     *  @param id           ID associate with the avatar (uid)
     *  @param className Any extra CSS classes that we want to append to the HTML
     */
    function _image(url, id, className, type) {
        return '<' + type + ' class="avatar-wrapper ' + id + ' ' + className + '">'
                + '<img src="' + url + '">'
         + '</' + type + '>';
    }

    /**
     *  Check if the input is an email address or not.
     */
    function isEmail(email) {
        return typeof email === "string" && email.match(/.+@.+/);
    }

    /**
     *  Like the `contact` method but instead of returning a
     *  div with the avatar inside it returns an image URL.
     */
    ns.imgUrl = function(contact) {
        if (avatars[contact]) {
            return avatars[contact].url;
        }
        return ns.contact(contact, '', 'ximg');
    };

    /**
     *  Return the current user's avatar in image URL.
     */
    ns.mine = function() {
        return ns.imgUrl(u_handle);
    };

    /**
     *  A new contact has been loaded, let's see if they have any two-letters avatars, if 
     *  that is the case we replace that old avatar *everywhere* with their proper avatar
     */
    ns.loaded = function(user) {
        if (typeof user !== "object") {
            return false;
        }

        if (user.u === u_handle) {
            // my avatar!
            $('.fm-avatar img,.fm-account-avatar img').attr('src', ns.imgUrl(user.u));
        }

        var avatar = $(ns.contact(user)).html();
        $('.avatar-wrapper.' + user.u).empty().html(avatar);
        $('.avatar-wrapper.' + user.m.replace(/[\.@]/g, "\\$1")).empty().html(avatar);
    };

    ns.contact = function(user, className, element) {
        className = className || "avatar";
        element   = element || "div";
        if (typeof user === "string") {
            if (isEmail(user)) {
                // User is an email, we should look if the user
                // exists, if it does exists we use the user Object.
                for (var u in M.u) {
                    if (M.u[u].m === user) {
                        // found the user object
                        return ns.contact(M.u[u], className, element);
                    }
                }
                return _twoLetters(user.substr(0, 2), user, className, element);
            } else if (M.u[user]) {
                // It's an user ID
                user = M.u[user];
            } else {
                return _twoLetters(user, user, className, element);
            }
        }

        if (typeof user != "object" || !user) {
            throw new Error("Unexpected value" + typeof(user));
        }

        if (avatars[user.u]) {
            return _image(avatars[user.u].url, user.u, className, element);
        }
        
        return _twoLetters(user.name || user.m, user.u, className, element);
    };
    
    return ns;
})();
