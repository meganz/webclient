var useravatar = {
    /**
     *  List of TWO-letters avatars that we ever generated. It's useful to replace
     *  the moment we discover the real avatar associate with that avatar
     */
    _watching: {},
    top: function() {
        if (avatars[u_handle]) {
            return avatars[u_handle].url;
        }
        return staticpath + 'images/mega/default-top-avatar.png';
    },
    imgUrl: function(contact) {
        if (avatars[contact]) {
            return avatars[user.u].url;
        }
        return staticpath + 'images/mega/default-avatar.png';
    },
    mine: function() {
        if (avatars[u_handle]) {
            return avatars[u_handle].url;
        }
        return staticpath + 'images/mega/default-avatar.png';
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
        var words = letters.split(/\s+/);
        if (words.length === 1) {
            letters = words[0].substr(0, 2);
        } else {
            letters = words[0][0]  + words[1][0];
        }
        var color = letters.charCodeAt(0) % 6 + letters.charCodeAt(1) % 6;
        if (!this._watching[id]) {
            this._watching[id] = {};
        }
        this._watching[id][className] = true;
        return '<' + element + ' class="avatar-wrapper ' + className + ' ' + id +  ' color' + color +'">'
                    + letters.toUpperCase() 
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

        if (user.u == u_handle && avatars[user.u]) {
            // my avatar!
            $('.fm-avatar img,.fm-account-avatar img').attr('src',
                    avatars[user.u].url);
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
            return this._image(avatars[user.u].url, user.u, className, element);
        }
        
        return this._twoLetters(user.name || user.m, user.u, className, element);
    },
};

