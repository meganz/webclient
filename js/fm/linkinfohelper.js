/**
 * Helper tool based on html/js/download.js & crypto.js to retrieve meta data for a specific node (file or folder link)
 * For direct parsing and handling of links, please see: LinkInfoHelper.extractMegaLinksFromString
 *
 * @param node_handle {String}
 * @param node_key {String}
 * @param is_dir {Boolean}
 * @param [is_chatlink] {Boolean}
 * @param [is_contactlink] {Boolean}
 * @param [url] {String}
 * @constructor
 */
var LinkInfoHelper = function(node_handle, node_key, is_dir, is_chatlink, is_contactlink, url) {
    "use strict";
    this.node_handle = node_handle;
    this.node_key = node_key;
    this.is_dir = is_dir;
    this.is_chatlink = is_chatlink;
    this.is_contactlink = is_contactlink;
    this._url = url;
    this.info = Object.create(null);
};

LinkInfoHelper._CACHE = {};

/** @property LinkInfoHelper.MEGA_LINKS_REGEXP_COMPILED */
lazy(LinkInfoHelper, 'MEGA_LINKS_REGEXP_COMPILED', () => {
    'use strict';
    const res = [];
    const MEGA_LINKS_REGEXP = [
        "\\b(?:mega\\.co\\.nz|mega\\.nz)/(C!)([\\w#-]+)",
        "\\b(?:mega\\.co\\.nz|mega\\.nz)/#(!|F!)([\\w!-]+)",
        "\\b(?:mega\\.co\\.nz|mega\\.nz)/(chat)/([\\w#-]+)",
        "\\b(?:mega\\.co\\.nz|mega\\.nz)/(file|folder)/([\\w#-]+)",
    ];

    for (let i = 0; i < MEGA_LINKS_REGEXP.length; ++i) {
        let rex = MEGA_LINKS_REGEXP[i];

        if (d && !is_livesite) {
            rex = rex.replace('|mega\\.nz', `|mega\\.nz|${location.host.replace(/(\W)/g, '\\$1')}`);
        }

        res.push(new RegExp(rex, "gmi"));
    }
    return res;
});

/**
 * Returns true/false if the passed URL is a valid mega link
 *
 * @param url
 * @returns {Boolean}
 */
LinkInfoHelper.isMegaLink = function(url) {
    "use strict";
    if (!url || !url.match) {
        return false;
    }

    for (let i = LinkInfoHelper.MEGA_LINKS_REGEXP_COMPILED.length; i--;) {
        if (url.match(LinkInfoHelper.MEGA_LINKS_REGEXP_COMPILED[i])) {
            return true;
        }
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
    var found = [];

    if (s.substr) {
        let m;
        for (let i = LinkInfoHelper.MEGA_LINKS_REGEXP_COMPILED.length; i--;) {
            const regExp = LinkInfoHelper.MEGA_LINKS_REGEXP_COMPILED[i];

            while ((m = regExp.exec(s)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regExp.lastIndex) {
                    regExp.lastIndex++;
                }
                const [, type, data] = m;

                if (type === "F!" || type === "!" || type === "file" || type === "folder") {
                    const is_dir = type === "F!" || type === 'folder';
                    const [handle, key] = data.split(/[^\w-]/);
                    const cacheKey = `${handle}:${key}`;

                    if (!LinkInfoHelper._CACHE[cacheKey]) {
                        LinkInfoHelper._CACHE[cacheKey] = new LinkInfoHelper(handle, key, is_dir, false, false, m[0]);
                    }

                    found.push(
                        LinkInfoHelper._CACHE[cacheKey]
                    );
                }
                else if (type === "chat") {
                    // is chat
                    const [chatHandle, chatKey] = data.split(/[^\w-]/);
                    const chatCacheKey = `${chatHandle}:${chatKey}`;

                    if (!LinkInfoHelper._CACHE[chatCacheKey]) {
                        LinkInfoHelper._CACHE[chatCacheKey] = new LinkInfoHelper(chatHandle, chatKey, false, true);
                    }

                    found.push(
                        LinkInfoHelper._CACHE[chatCacheKey]
                    );
                }
                else if (type === "C!") {
                    // is chat
                    const contactHash = data;
                    const contactHashKey = `C!${contactHash}`;

                    if (!LinkInfoHelper._CACHE[contactHashKey]) {
                        LinkInfoHelper._CACHE[contactHashKey] = new LinkInfoHelper(
                            contactHash,
                            undefined,
                            false,
                            false,
                            true
                        );
                    }

                    found.push(
                        LinkInfoHelper._CACHE[contactHashKey]
                    );
                }
                else if (d) {
                    console.warn('Unhandled link...', m);
                }
            }
        }
    }
    return found;
};

/**
 * Tells whether the data for this link has been retrieved.
 */
LinkInfoHelper.prototype.isDataAvailable = function() {
    'use strict';

    if (this.failed) {
        return -1;
    }

    if (this.is_contactlink) {
        return !!this.info.e;
    }

    if (this.is_chatlink) {
        return !!this.info.ct;
    }

    // public file/folder-link
    return !!this.info.at;
};

/**
 * Retrieve info for the current link
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.retrieve = async function() {
    "use strict";

    if (this._promise || this.failed || this.info.at || this.info.ct) {
        return this._promise;
    }
    const key = base64_to_a32(String(this.node_key).trim()).slice(0, 8);

    const fail = (ex) => {
        this.failed = ex || true;
    };
    const ready = () => {
        this._loaded = true;
    };

    if (this.is_chatlink) {
        if (window.is_chatlink && is_chatlink.pnh === this.node_handle) {
            this.info.ncm = is_chatlink.ncm;
            this.info.ct = is_chatlink.ct;
            this._promise = Promise.resolve();
            return ready();
        }

        this._promise = api.send({a: 'mcphurl', v: Chatd.VERSION, ph: this.node_handle})
            .then((res) => {
                this.info.ncm = res.ncm;
                this.info.ct = res.ct;
                this.info.mr = res.mr;
            })
            .catch(fail)
            .finally(ready);
    }
    else if (this.is_contactlink) {
        this._promise = api.send({a: 'clg', 'cl': this.node_handle})
            .then((res) => {
                this.info.e = res.e;
                this.info.fn = res.fn;
                this.info.ln = res.ln;
                this.info.h = res.h;
            })
            .catch(fail)
            .finally(ready);
    }
    else if (this.is_dir) {
        // dir handling
        this._promise = api.send({a: 'pli', ph: this.node_handle})
            .then((res) => {
                this.info.s = res.s;
                this.info.user = res.u;
                this.info.at = res.attrs;
                this.info.size = res.s[0];
                this.info.name = 'unknown';
                this.info.dirs_count = res.s[2];
                this.info.files_count = res.s[1];

                if (res.k && res.k.split) {
                    this.info.rid = res.k.split(":")[0];
                    this.info.k = base64_to_a32(String(res.k.split(":")[1]).trim()).slice(0, 8);
                }
                if (this.info.k) {
                    const decr_meta = tryCatch(() => {
                        const actual_key = decrypt_key(new sjcl.cipher.aes(key), this.info.k);
                        return dec_attr(base64_to_ab(this.info.at), actual_key);
                    }, false)();

                    if (decr_meta) {
                        this.info.name = decr_meta.n && M.getSafeName(decr_meta.n) || this.info.name;
                    }
                }
            })
            .catch(fail)
            .finally(ready);
    }
    else {
        this._promise = api.send({a: 'g', p: this.node_handle})
            .then((res) => {
                this.info.k = key;
                this.info.at = res.at;
                this.info.fa = res.fa;
                this.info.size = res.s;
                this.info.name = 'unknown';

                const meta = dec_attr(base64_to_ab(this.info.at), key);
                if (meta.n) {
                    const name = meta.n && M.getSafeName(meta.n) || this.info.name;
                    this.info.name = name;
                    this.info.icon = fileIcon({name});
                }
            })
            .catch(fail)
            .finally(ready);
    }

    return this._promise;
};

/**
 * Like retrieve, but internally would call .retrieve IF needed. Please use this as the main way of accessing/getting
 * link info
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.getInfo = async function() {
    "use strict";

    if (!this.isDataAvailable()) {
        await this.retrieve()
            .catch((ex) => {
                this.failed = ex || this.failed || true;
            });
    }

    if (this.failed) {
        if (d) {
            console.warn('LinkInfoHelper data retrieval failed.', this.failed, [this]);
        }
    }
    else if (this.is_chatlink) {
        if (this.info.topic === undefined) {
            const fakeRoom = {
                'ct': this.info.ct,
                'publicChatHandle': this.node_handle,
                'chatId': `fakeChat#${this.node_handle}`
            };

            const ph = new strongvelope.ProtocolHandler(null, null, null, null, strongvelope.CHAT_MODE.PUBLIC);
            ph.chatRoom = fakeRoom;
            ph.unifiedKey = base64urldecode(this.node_key);

            fakeRoom.protocolHandler = ph;
            await megaChat.plugins.chatdIntegration.decryptTopic(fakeRoom).catch(dump);
            this.info.topic = fakeRoom.topic || '';
        }
    }
    else if (!this.is_dir && this.info.at) {
        this.info.h = this.node_handle;
        const n = new MegaNode(this.info);
        const v = is_video(n);

        if (v || is_image(n)) {
            this.info.preview_text = l[16274];

            if (fileext(n.name) === 'pdf') {
                this.info.preview_text = l[17489];
            }
            else if (v) {
                this.info.preview_text = l[17732];
            }
        }

        if (this.info.fa) {
            // load thumbnail
            this.info.preview_url = await getImage(n).catch(nop);
        }
        this.info.n = n;
    }

    return this.info;
};


/**
 * Opens a preview of the current mega link
 *
 * @returns {MegaPromise}
 */
LinkInfoHelper.prototype.openPreview = async function() {
    "use strict";

    if (!this.info.at) {
        await this.getInfo();
    }

    slideshow({
        k: this.info.k,
        fa: this.info.fa,
        h: this.node_handle,
        name: this.info.name,
        link: `${this.node_handle}!${this.node_key}`
    });
};


/**
 * Returns true/false if the link info meta is loaded and ready
 *
 * @returns {Boolean}
 */
LinkInfoHelper.prototype.hadLoaded = function() {
    "use strict";
    return !!this._promise && this._loaded > 0;
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
    return !!this.info.preview_url;
};


/**
 * Returns the actual (absolute) url
 *
 * @returns {String|*}
 */
LinkInfoHelper.prototype.getLink = function() {
    "use strict";
    if (!this._url || !String(this._url).includes('://')) {

        if (this.is_contactlink) {
            this._url = `${getBaseUrl()}/C!${this.node_handle}`;
        }
        else if (this.is_chatlink) {
            this._url = `${getBaseUrl()}/chat/${this.node_handle}#${this.node_key}`;
        }
        else {
            this._url = `${getBaseUrl()}/#${this.is_dir ? "F" : ""}!${this.node_handle}!${this.node_key}`;
        }
    }
    return this._url;
};
