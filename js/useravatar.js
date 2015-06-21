var useravatar = {
    _colors: [
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
    ],

    registerColors: function() {
        var css = "";
        for (var i in this._colors) {
            css += ".color" + (parseInt(i)+1) + " { background-color: " + this._colors[i] + "; }";
        }
        var css = mObjectURL([css], "text/css");
        mCreateElement('link', {type: 'text/css', rel: 'stylesheet'}, 'head').href = css;
    },

    /**
     *  List of TWO-letters avatars that we ever generated. It's useful to replace
     *  the moment we discover the real avatar associate with that avatar
     */
    _watching: {},
    top: function() {
        if (avatars[u_handle]) {
            return avatars[u_handle].url;
        }
        return this.contact(u_handle, '', 'ximg');
    },
    imgUrl: function(contact) {
        if (avatars[contact]) {
            return avatars[contact].url;
        }
        return this.contact(contact, '', 'ximg');
    },
    mine: function() {
        if (avatars[u_handle]) {
            return avatars[u_handle].url;
        }
        return this.contact(u_handle, '', 'ximg');
    },

    _twoLettersImg: function(letters) {
        var s = this._twoLettersSettings(letters);
        var tpl = $('#avatar-svg').clone().removeClass('hidden')
            .find('svg').css('background-color', s.color).end()
            .find('text').text(s.letters).end();

        tpl = window.btoa(unescape(tpl.html()));
        return 'data:image/svg+xml;base64,' + tpl;
    },

    _twoLettersSettings: function(letters) {
        var words = letters.split(/\s+/);
        if (words.length === 1) {
            letters = words[0].substr(0, 2);
        } else {
            letters = words[0][0]  + words[1][0];
        }
        var colors = parseInt(this._colors.length/2)+1
        var color = letters.charCodeAt(0) % colors + letters.charCodeAt(1) % colors;
        return {letters: letters.toUpperCase(), color: this._colors[color], colorIndex: color};
    },

    /**
     *  Return the HTML to represent a two letter avatar.
     *
     *  @param letters      String used to generate the avatar
     *  @param id           ID associate with the avatar (uid, email)
     *  @param className Any extra CSS classes that we want to append to the HTML
     *  
     *  @return HTML
     */
    _twoLetters: function(letters, id, className, element) {
        if (element == 'ximg') {
            return this._twoLettersImg(letters);
        }
        var s = this._twoLettersSettings(letters);
        if (!this._watching[id]) {
            this._watching[id] = {};
        }
        this._watching[id][className] = true;
        return '<' + element + ' class="avatar-wrapper ' + className + ' ' + id +  ' color' + s.colorIndex + '">'
                    + s.letters
                + '</' + element + '>';
    },

    /**
     *  Return an image HTML from an URL
     *
     *  @param url          Image URL
     *  @param id           ID associate with the avatar (uid)
     *  @param className Any extra CSS classes that we want to append to the HTML
     */
    _image: function(url, id, className, type) {
        return '<' + type + ' class="avatar-wrapper ' + id + ' ' + className + '">'
                + '<img src="' + url + '">'
         + '</' + type + '>';
    },

    isEmail: function(email) {
        return typeof email == "string" && email.match(/.+@.+/);
    },

    /**
     *  A new contact has been loaded, let's see if they have any two-letters avatars, if 
     *  that is the case we replace that old avatar *everywhere* with their proper avatar
     */
    loaded: function(user) {
        if (typeof user != "object") {
            return false;
        }

        if (user.u == u_handle) {
            // my avatar!
            $('.fm-avatar img,.fm-account-avatar img').attr('src', this.imgUrl(user.u));
        }

        var avatar = $(this.contact(user)).html();
        $('.avatar-wrapper.' + user.u).empty().html(avatar);
        $('.avatar-wrapper.' + user.m.replace(/[\.@]/g, "\\$1")).empty().html(avatar)
    },

    contact : function(user, className, element) {
        className = className || "avatar";
        element   = element || "div";
        if (this.isEmail(user)) {
            // User is an email, we should look if the user
            // exists, if it does exists we use the user Object.
            for (var u in M.u) {
                if (M.u[u].m == user) {
                    // found the user object
                    return this.contact(M.u[u]);
                }
            }
            return this._twoLetters(user.substr(0, 2), user, className, element);
        } else if (typeof user == "string" && M.u[user]) {
            // It's an user ID
            user = M.u[user];
        } else if (typeof user == "string") {
            return this._twoLetters(user, user, className, element);
        }

        if (avatars[user.u]) {
            //return this._image(avatars[user.u].url, user.u, className, element);
        }
        
        return this._twoLetters(user.name || user.m, user.u, className, element);
    },
};

useravatar.registerColors();
