/**
 * @typedef {Object} MEGA_USER_STRUCT
 *      Access using namespace mega.u
 *      Access using global variable M.u
 *      An object holding informations about specific contacts/user identified
 *      by "handle" as base64 URL encoded 88-bit value.
 *      Caches informations for current/past full contacts.
 *      Pending contacts informations are not stored here.
 * @property {String} u
 *     Mega user handle as base64 URL encoded 88-bit value.
 * @property {Number} c
 *     Contact access right/status: 2: owner, 1: active contact, 0: inactive/deleted.
 * @property {String} m
 *     Email address of the contact.
 * @property {Array} m2
 *     Array of all emails/phone numbers of a user.
 * @property {String} name
 *     Combines users First and Last name defined in user profile.
 *     If First and Last name in user profile are undefined holds users email.
 *     It's used at least like index field for search contacts in share dialog.
 *     It combines `firstname` and `lastname` of user attributes.
 * @property {String} nickname
 *     A custom nickname for a contact, it won't be set for the current user.
 *     This information comes from a private encrypted attribute !*>alias which
 *     stores all contact nicknames for the user.
 * @property {String} h
 *     Holds user handle, value equal to 'u' param. Used only when synching with
 *     M.d, deeply rooted in code. should not be removed.
 *     Reason behind it should be searched in file/folders caching structure,
 *     'h' represents file/folder "handle" as base64 URL encoded 64-bit value.
 * @property {Number} t
 *     For active contacts but not for the owner 't' is set to 1. For non active
 *     contacts and owner it's 'undefined'. Used when synching with M.d, deeply
 *     rooted in code. should not be removed.
 *     Reason behind it should be searched in file/folders caching structure,
 *     't' represents type of item: 2: Cloud Drive root, 1: folder, 0: file
 * @property {String} p
 *     Logic inherited from file manager where parent directory 'p' is
 *     represented by base64 URL encoded 64-bit value.
 *     Root directory for Cloud Drive is cached in M.RootID.
 *     This parameter represents top level/root/parent for 'Contacts' tab.
 *     All contacts are bind to account owner but instead of owners "handle"
 *     as base64 URL encoded 88-bit value we are using 'contacts'.
 * @property {Number} ts
 *     UNIX epoch time stamp as an integer in seconds to record last change of
 *     parameters values.
  * @property {Number} rTimeStamp
 *     UNIX epoch time stamp as an integer in seconds to record last change of
 *     time stamp.
 * @property {Number} lastChatActivity
 *     UNIX epoch time stamp as an integer in seconds for the last chat
 *     activity.
 */

mBroadcaster.once('boot_done', function() {
    'use strict';

    const value = freeze({
        "u": undefined,
        "c": undefined,
        "m": undefined,
        // "m2": undefined,
        "name": undefined,
        "h": undefined,
        "t": undefined,
        "p": undefined,
        "presence": 'unavailable',
        "presenceMtime": undefined,
        "firstName": "",
        "lastName": "",
        "nickname": "",
        "ts": undefined,
        "ats": undefined,
        // "rTimeStamp": undefined,
        "avatar": undefined,
        "lastGreen": undefined
    });

    Object.defineProperty(window, 'MEGA_USER_STRUCT', {value});
});


function MegaData() {
    "use strict";

    this.reset();

    this.csortd = -1;
    this.csort = 'name';
    this.storageQuotaCache = null;
    this.tfsdomqueue = Object.create(null);
    this.sortTreePanel = Object.create(null);
    this.lastColumn = null;
    this.account = false;

    Object.defineProperty(this, 'fsViewSel', {
        value: '.files-grid-view.fm .grid-scrolling-table, .fm-blocks-view.fm .file-block-scrolling',
        configurable: false
    });

    (function(self) {
        var maf = false;
        var saved = 0;

        Object.defineProperty(self, 'maf', {
            get: function() {
                if (Object(self.account).maf && saved !== self.account.maf) {
                    saved = self.account.maf;
                    maf = mega.achievem.prettify(self.account.maf);
                }
                return maf;
            }
        });
    })(this);

    // XXX: do NOT change the order, add new entries at the tail, and ask before removing anything..
    const sortRules = {
        'name': this.sortByName.bind(this),
        'size': this.sortBySize.bind(this),
        'type': this.sortByType.bind(this),
        'date': this.sortByDateTime.bind(this),
        'ts': this.sortByDateTime.bind(this),
        'rTimeStamp': this.sortByRts.bind(this),
        'owner': this.sortByOwner.bind(this),
        'modified': this.sortByModTime.bind(this),
        'mtime': this.sortByModTime.bind(this),
        'interaction': this.sortByInteraction.bind(this),
        'access': this.sortByAccess.bind(this),
        'status': this.sortByStatus.bind(this),
        'fav': this.sortByFav.bind(this),
        'email': this.sortByEmail.bind(this),
        'label': this.sortByLabel.bind(this),
        'sharedwith': this.sortBySharedWith.bind(this),
        'versions': this.sortByVersion.bind(this),
        'playtime': this.sortByPlaytime.bind(this)
    };
    Object.setPrototypeOf(sortRules, null);
    Object.defineProperty(this, 'sortRules', {value: Object.freeze(sortRules)});

    /** EventListener interface. */
    this.handleEvent = function(ev) {
        if (d > 1) {
            console.debug(ev.type, ev);
        }

        var ttl;
        if (ev.type === 'ps-y-reach-end' && !$.isTfsPsUpdate) {
            ttl = M.getTransferTableLengths();
            if (ttl.left > -100) {
                this.doFlushTransfersDynList(ttl.size);
            }
        }
        else if (ev.type === 'tfs-dynlist-flush') {
            ttl = M.getTransferTableLengths();
            if (ttl.left > -10) {
                this.doFlushTransfersDynList(ttl.size);
            }
        }
    };

    if (is_mobile) {
        /* eslint-disable no-useless-concat */
        mobile.shim(this);
    }
    else if (is_megadrop) {
        Object.defineProperty(this, 'ul' + 'progress', {
            value: function(ul, perc, bl, bt, bps) {
                if (!bl || !ul.starttime || uldl_hold) {
                    return false;
                }

                if (d) {
                    console.assert(mega.fileRequestUpload.isUploadPageInitialized(), 'Check this...');
                }

                const {id} = ul;
                const remainingTime = bps > 1000 ? (bt - bl) / bps : -1;

                $.transferprogress[`ul_${id}`] = [bl, bt, bps];

                delay('percent_megatitle', percent_megatitle, 50);

                mega.fileRequestUpload.onItemUploadProgress(ul, bps, remainingTime, perc, bl);
            }
        });
    }

    /** @name M.IS_TREE */
    /** @name M.IS_FAV */
    /** @name M.IS_LINKED */
    /** @name M.IS_SHARED */
    /** @name M.IS_TAKENDOWN */
    makeEnum(['TREE', 'FAV', 'LINKED', 'SHARED', 'TAKENDOWN'], 'IS_', this);

    const seal = new Set();
    (function shield(ctx) {
        const proto = Object.getPrototypeOf(ctx);
        if (proto) {
            const desc = Object.getOwnPropertyDescriptors(proto);
            for (const p in desc) {
                if (typeof desc[p].value === 'function') {
                    seal.add(p);
                }
            }
            shield(proto);
        }
    })(this);

    // Think twice before adding anything new here.
    const safe = [
        'getTransferElements'
    ];
    for (let i = safe.length; i--;) {
        seal.delete(safe[i]);
    }

    return new Proxy(this, {
        defineProperty(target, prop, descriptor) {
            if (seal.has(prop)) {
                throw new MEGAException('Invariant', prop, 'DataCloneError');
            }
            return Reflect.defineProperty(target, prop, descriptor);
        }
    });
}

MegaData.prototype = new MegaUtils();
MegaData.prototype.constructor = MegaData;

// Initialize affiliate dataset on-demand
lazy(MegaData.prototype, 'affiliate', () => {
    'use strict';
    return new AffiliateData();
});
