/**
 * Helper tool based on html/js/download.js & crypto.js to retrieve meta data for a specific node (file or folder link)
 * For direct parsing and handling of links, please see: LinkInfoHelper.extractMegaLinksFromString
 *
 * @param node_handle {String}
 * @param node_key {String}
 * @param is_dir {Boolean}
 * @constructor
 */
var LinkInfoHelper = function(node_handle, node_key, is_dir) {
    "use strict";
    this.node_handle = node_handle;
    this.node_key = node_key;
    this.is_dir = is_dir;
    this.info = {};
};

LinkInfoHelper.MEGA_LINKS_REGEXP = "(http(s?):\\/\\/)?mega.(co\\.nz|nz)\\/#(!|F!)([a-zA-Z\!0-9\-_]+)";
LinkInfoHelper._CACHE = {};

/**
 * Returns true/false if the passed URL is a valid mega link
 *
 * @param url
 * @returns {Boolean}
 */
LinkInfoHelper.isMegaLink = function(url) {
    "use strict";
    if (LinkInfoHelper.MEGA_LINKS_REGEXP.substr) {
        LinkInfoHelper.MEGA_LINKS_REGEXP = new RegExp(LinkInfoHelper.MEGA_LINKS_REGEXP, "gmi");
    }
    if (!url || !url.match) {
        return false;
    }
    else {
        return url.match(LinkInfoHelper.MEGA_LINKS_REGEXP);
    }
};

/**
 * Returns an array of LinkInfoHelpers (in-memory - per url cached) that can be accessed to retrieve link info
 *
 * @param s {String} any string that may contain MEGA URLs
 * @returns {Array}
 */
LinkInfoHelper.extractMegaLinksFromString = function(s) {
    "use strict";

    if (LinkInfoHelper.MEGA_LINKS_REGEXP.substr) {
        LinkInfoHelper.MEGA_LINKS_REGEXP = new RegExp(LinkInfoHelper.MEGA_LINKS_REGEXP, "gmi");
    }

    var found = [];

    if (s.substr) {
        var m;
        while ((m = LinkInfoHelper.MEGA_LINKS_REGEXP.exec(s)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === LinkInfoHelper.MEGA_LINKS_REGEXP.lastIndex) {
                LinkInfoHelper.MEGA_LINKS_REGEXP.lastIndex++;
            }

            if (m[4] === "F!" || m[4] === "!") {
                var handleAndKey = m[5].split("!");
                var handle = handleAndKey[0];
                var key = handleAndKey[1];
                var is_dir = m[4] === "F!";
                var cacheKey = handle + ":" + key;

                if (!LinkInfoHelper._CACHE[cacheKey]) {
                    LinkInfoHelper._CACHE[cacheKey] = new LinkInfoHelper(handle, key, is_dir);
                }

                found.push(
                    LinkInfoHelper._CACHE[cacheKey]
                );
            }
        }
    }
    return found;
};

/**
 * Retrieve info for the current link
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.retrieve = function() {
    "use strict";

    if (this._promise) {
        return this._promise;
    }

    var self = this;

    var key = this.node_key;
    var base64key = String(key).trim();
    key = base64_to_a32(base64key).slice(0, 8);

    if (self.info['at']) {
        return MegaPromise.resolve();
    }
    if (!self.is_dir) {
        self._promise = asyncApiReq({a: 'g', p: self.node_handle, 'ad': showAd()})
            .done(function (r) {
                self.info['size'] = r.s;
                self.info['at'] = r.at;
                self.info['fa'] = r.fa;

            })
            .fail(function (e) {
                self.failed = true;
                if (d) {
                    console.error("Failed to retrieve link info: ", e);
                }
            });
    }
    else {
        // dir handling
        self._promise = asyncApiReq({a: 'pli', ph: self.node_handle})
            .done(function (r) {
                if (typeof r === 'number' || r === EFAILED) {
                    self.failed = true;
                    return;
                }
                self.info['at'] = r['attrs'];
                self.info['s'] = r['s'];
                self.info['size'] = r['s'][0];
                self.info['files_count'] = r['s'][1];
                self.info['dirs_count'] = r['s'][2];
                self.info['user'] = r['u'];
                if (r['k'] && r['k'].split) {
                    self.info['rid'] = r['k'].split(":")[0];
                    self.info['k'] = r['k'].split(":")[1];
                    self.info['k'] = String(self.info['k']).trim();
                    self.info['k'] = base64_to_a32(self.info['k']).slice(0, 8);
                }

                var dl_a = base64_to_ab(self.info['at']);
                try {
                    var actual_key = decrypt_key(new sjcl.cipher.aes(key), self.info['k']);
                    var decr_meta = dec_attr(dl_a, actual_key);
                    if (!decr_meta.n) {
                        self.failed = true;
                    }
                    self.info['name'] = M.getSafeName(decr_meta.n || 'unknownName') || 'unknownName';
                }
                catch (e) {
                    self.failed = true;
                }
            })
            .fail(function (e) {
                self.failed = true;
                if (d) {
                    console.error("Failed to retrieve link info (dir): ", e);
                }
            });
    }

    return self._promise;
};

/**
 * Like retrieve, but internally would call .retrieve IF needed. Please use this as the main way of accessing/getting
 * link info
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.getInfo = function() {
    "use strict";

    var self = this;

    var promise = new MegaPromise();

    if (
        (!self.is_dir && !self.info['size'] && !self.info['at'] && !self.info['fa']) ||
        (self.is_dir && !self.info['at'])
    ) {
        promise.linkFailTo(
            self.retrieve().done(function() {
                promise.linkDoneAndFailTo(self.getInfo());
            })
        );
        return promise;
    }

    if (!self.is_dir && !self.info['name']) {
        var key = this.node_key;
        var base64key = String(key).trim();
        key = base64_to_a32(base64key).slice(0, 8);
        if (key.length === 8) {
            this.info['node_key_ab'] = key;
            var dl_a = base64_to_ab(self.info['at']);
            var decr_meta = dec_attr(dl_a, key);
            if (!decr_meta.n) {
                self.failed = true;
                return MegaPromise.reject();
            }
            var filename = M.getSafeName(decr_meta.n) || 'unknownName';
            this.info['name'] = filename;
            this.info['icon'] = fileIcon({ name: filename });

            if (is_image(filename) || is_video(filename)) {
                this.info['preview_text'] = l[16274];

                if (filetype(filename) === 'PDF Document') {
                    this.info['preview_text'] = l[17489];
                }
                else if (is_video(filename)) {
                    // TODO: no translations?
                    this.info['preview_text'] = l[17732];
                }
            }

            if (self.info['fa']) {
                // load thumbnail
                api_getfileattr(
                    [{fa: self.info['fa'], k: key}],
                    0,
                    function(a, b, data) {
                        if (data !== 0xDEAD) {
                            data = mObjectURL([data.buffer || data], 'image/jpeg');

                            self.info['preview_url'] = data;
                        }
                        promise.resolve(self.info);
                    },
                    function() {
                        promise.resolve(self.info);
                    }
                );
            }
            else {
                promise.resolve(this.info);
            }
        }
        else {
            promise.resolve(this.info);
        }
    }
    else {
        promise.resolve(this.info);
    }


    return promise;
};


/**
 * Opens a preview of the current mega link
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.openPreview = function() {
    "use strict";

    var promise = new MegaPromise();

    var self = this;

    if (!self.info['size'] && !self.info['at'] && !self.info['fa']) {
        promise.linkFailTo(
            self.getInfo().done(function() {
                promise.linkDoneAndFailTo(self.openPreview());
            })
        );
        return promise;
    }


    slideshow({
        k: this.info['node_key_ab'],
        fa: this.info['fa'],
        h: this.node_handle,
        name: this.info['name'],
        link: this.node_handle + '!' + this.node_key
    });

    promise.resolve(this.info);

    return promise;
};


/**
 * Returns true/false if the link info meta is loaded and ready
 *
 * @returns {Boolean}
 */
LinkInfoHelper.prototype.hadLoaded = function() {
    "use strict";
    return !(!this._promise || this._promise.state() === 'pending');
};

/**
 * Returns true if the link info is now being loaded
 *
 * @returns {Boolean}
 */
LinkInfoHelper.prototype.startedLoading = function() {
    "use strict";
    return !!this._promise;
};

/**
 * Returns true if the current link have a preview
 *
 * @returns {Boolean}
 */
LinkInfoHelper.prototype.havePreview = function() {
    "use strict";
    return !!this.info['preview_url'];
};


/**
 * Returns the actual (absolute) url
 *
 * @returns {String|*}
 */
LinkInfoHelper.prototype.getLink = function() {
    "use strict";
    if (!this._url) {
        this._url = "https://mega.nz/#" + (this.is_dir ? "F" : "") + "!" + this.node_handle + "!" + this.node_key;
    }
    return this._url;
};
