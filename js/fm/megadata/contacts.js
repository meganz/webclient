MegaData.prototype.contactstatus = function(h, wantTimeStamp) {
    var folders = 0;
    var files = 0;
    var ts = 0;
    if (this.d[h]) {
        if (!wantTimeStamp || !this.d[h].ts) {
            // FIXME: include root?
            var a = this.getNodesSync(h);

            for (var i = a.length; i--;) {
                var n = this.d[a[i]];
                if (n) {
                    if (ts < n.ts) {
                        ts = n.ts;
                    }
                    if (n.t) {
                        folders++;
                    }
                    else if (!n.fv) {
                        files++;
                    }
                }
            }
            if (!this.d[h].ts) {
                this.d[h].ts = ts;
            }
        }
        else {
            ts = this.d[h].ts;
        }
    }

    return {files: files, folders: folders, ts: ts};
};

MegaData.prototype.onlineStatusClass = function(os) {
    if (os === 4 || os === 'dnd') {
        // UserPresence.PRESENCE.DND
        return [l[5925], 'busy'];
    }
    else if (os === 2 || os === 'away') {
        // UserPresence.PRESENCE.AWAY
        return [l[5924], 'away'];
    }
    else if (os === 3 || os === 'chat' || os === 'available') {
        // UserPresence.PRESENCE.ONLINE
        return [l[5923], 'online'];
    }
    else if (os === 1 || os === 'offline') {
        return [l[5926], 'offline'];
    }
    else {
        return ['', 'black'];
    }
};

MegaData.prototype.onlineStatusEvent = function(u, status) {
    'use strict';

    if (u instanceof MegaDataObject) {
        var $elm = $('.ustatus.' + u.u);
        if ($elm.length) {
            $elm.removeClass('offline online busy away');
            $elm.addClass(this.onlineStatusClass(status)[1]);
        }

        $elm = $('.fm-chat-user-status.' + u.u);
        if ($elm.length) {
            u = this.onlineStatusClass(status)[0];

            if (u) {
                $elm.safeHTML(u);
            }
            else {
                $elm.text('');
            }
        }
    }
};

/**
 * getContactsEMails
 *
 * Loop through all available contacts, full and pending ones (outgoing and incomming)
 * and creates a list of contacts email addresses.
 * @returns {Array} contacts, array of contacts email.
 */
MegaData.prototype.getContactsEMails = function(excludeRequests) {
    var contact;
    var contacts = [];
    var contactName;

    // Loop through full contacts
    M.u.forEach(function(contact) {
        // Active contacts with email set
        if (contact.c === 1 && contact.m) {
            contacts.push({
                id: contact.m, name: M.getNameByHandle(contact.u), handle: contact.u,
                contactType: 'active'
            });
        }
    });

    if (!excludeRequests) {
        // Loop through outgoing pending contacts
        for (var k in M.opc) {
            contact = M.opc[k];
            contactName = M.getNameByHandle(M.opc[k].p);

            // Is contact deleted
            if (!contact.dts) {
                contacts.push({ id: contact.m, name: contactName, handle: M.opc[k].p, contactType: 'opc' });
            }
        }

        // Loop through incomming pending contacts
        for (var m in M.ipc) {
            contact = M.ipc[m];
            contactName = M.getNameByHandle(M.ipc[m].p);

            // Is there a email available
            if (contact.m) {
                contacts.push({ id: contact.m, name: contactName, handle: M.ipc[m].p, contactType: 'ipc' });
            }
        }
    }

    // Sort contacts by name in ascending order
    contacts.sort(function(contactA, contactB) {
        return contactA.name.localeCompare(contactB.name);
    });

    return contacts;
};

MegaData.prototype.getActiveContacts = function() {
    var res = [];

    if (typeof this.c.contacts === 'object') {
        Object.keys(this.c.contacts)
            .forEach(function(userHandle) {
                if (Object(M.u[userHandle]).c === 1) {
                    res.push(userHandle);
                }
            });
    }

    return res;
};

// eslint-disable-next-line complexity
MegaData.prototype.syncUsersFullname = async function(userId, chatHandle) {
    "use strict";
    const user = userId in this.u && this.u[userId] || false;
    const {name} = user;

    if (user.firstName || user.lastName) {
        // already loaded.
        return name;
    }

    const attrs = await Promise.allSettled([
        mega.attr.get(userId, 'lastname', -1, false, undefined, undefined, chatHandle),
        mega.attr.get(userId, 'firstname', -1, false, undefined, undefined, chatHandle)
    ]);

    for (let i = attrs.length; i--;) {
        const obj = attrs[i];

        // -1, -9, -2, etc...
        if (typeof obj.value === 'string') {
            // eslint-disable-next-line local-rules/hints
            try {
                obj.value = from8(base64urldecode(obj.value));
            }
            catch (ex) {
                obj.value = null;
            }
        }

        if (typeof obj.value !== 'string' || !obj.value) {
            obj.value = '';
        }
    }

    user.name = "";
    user.lastName = attrs[0].value.trim();
    user.firstName = attrs[1].value.trim();

    if (user.firstName || user.lastName) {
        user.name = `${user.firstName}${user.firstName.length ? " " : ""}${user.lastName}`;

        // Get the nickname if available otherwise get the user name
        const userName = nicknames.getNickname(userId);

        if (M.currentdirid === 'shares') {// Update right panel list and block view
            $(`.shared-grid-view .${userId} .fm-chat-user`).text(userName);
            $(`.inbound-share .${userId} ~> .shared-folder-info`).text(l[17590].replace('%1', userName));
        }
        else if (M.currentrootid === 'shares') {
            $(`.shared-details-info-block .${userId} ~> .fm-chat-user`).text(`${userName} <${user.m}>`);
        }
    }

    if (nicknames.cache[userId]) {
        user.nickname = nicknames.cache[userId];
    }

    // only clear old avatar if the old one was a text one and was different then the new names
    if (user.avatar && user.avatar.type !== "image" && name !== user.name) {
        user.avatar = false;
        useravatar.loaded(userId);
    }

    if (userId === u_handle) {
        u_attr.firstname = user.firstName;
        u_attr.lastname = user.lastName;
        u_attr.name = user.name;

        $('.user-name, .top-menu-logged .name, .membership-big-txt.name').text(u_attr.fullname);
        if (!is_mobile && M.currentdirid === 'account') {
            accountUI.account.profiles.renderFirstName();
            accountUI.account.profiles.renderLastName();
        }
    }

    // check if this first name + last belongs to business sub-user
    // we added here to avoid re-calling get attribute + minimize the need of code refactoring
    if (u_attr && u_attr.b && u_attr.b.m && M.suba && M.suba[userId]) {
        M.require('businessAcc_js', 'businessAccUI_js')
            .then(() => {
                var business = new BusinessAccount();
                var subUser = M.suba[userId];
                subUser.lastname = base64urlencode(to8(user.lastName));
                subUser.firstname = base64urlencode(to8(user.firstName));

                business.parseSUBA(subUser, false, true);
            });
    }

    if ($.dialog === 'share') {
        // Re-render the content of access list in share dialog to update contacts' latest names
        renderShareDialogAccessList();
    }

    return user.name;
};

// eslint-disable-next-line complexity
MegaData.prototype.syncContactEmail = async function(userHash, forced) {
    'use strict';
    const user = userHash in this.u && this.u[userHash] || false;
    if (user.m) {
        return user.m;
    }

    if (megaChatIsReady && megaChat.FORCE_EMAIL_LOADING) {
        forced = true;
    }

    if (!forced && (is_chatlink || !user || user.c !== 1 && user.c !== 2)) {
        return Promise.reject(EINCOMPLETE);
    }

    let cache = false;
    let data = await Promise.resolve(attribCache.getItem(`${userHash}_uge+`)).catch(nop);

    if (!data) {
        cache = true;
        data = await api.send({a: 'uge', u: userHash}).catch(echo);
    }

    if (typeof data === 'string' && data[0] === '[') {
        data = JSON.parse(data);
    }

    if (!Array.isArray(data)) {
        data = [data, Infinity];
    }

    let email = data[0];
    const expiry = data[1];

    console.assert(typeof email !== 'string' || email.includes('@'));
    if (typeof email !== 'string' || !email.includes('@')) {
        console.assert(email === ENOENT, `email is ${email}`);
        email = ENOENT;
    }

    if (cache === true) {
        attribCache.setItem(`${userHash}_uge+`, JSON.stringify([email, Date.now() + 7e6]));
    }

    if (email === ENOENT) {
        if (Date.now() > expiry) {
            console.assert(!cache);
            throw EEXPIRED;
        }

        email = undefined;
    }
    else if (user && user.m !== email) {
        user.m = email;
    }

    return email || Promise.reject(ENOENT);
};

(function() {
    "use strict";

    /**
     * Set new user into map store and returns it
     * @param {String} u_h user handle
     * @param {MegaDataObject|Object} [obj] store
     * @returns {MegaDataObject} stored user
     */
    MegaData.prototype.setUser = function(u_h, obj) {
        if (!(u_h in this.u)) {
            if (!(obj instanceof MegaDataObject)) {

                obj = new MegaDataObject(MEGA_USER_STRUCT, Object.assign({h: u_h, u: u_h, m: '', c: undefined}, obj));
            }
            this.u.set(u_h, obj);
        }
        return this.u[u_h];
    };

    /**
     * addUser, updates global .u variable with new user data
     * adds/updates user indexedDB with newest user data
     *
     * @param {object} u, user object data
     * @param {boolean} ignoreDB, don't write to indexedDB
     */
    MegaData.prototype.addUser = function(u, ignoreDB) {
        if (u && u.u) {
            var user = u.u in this.u && this.u[u.u];

            if (user) {
                for (var key in u) {
                    if (key !== 'name' && key in MEGA_USER_STRUCT) {

                        if (u[key] !== user[key]) {

                            user[key] = u[key];
                        }
                    }
                    else if (d) {
                        console.warn('addUser: property "%s" not updated.', key, u[key]);
                    }
                }
            }
            else {
                user = this.setUser(u.u, u);
            }

            if (fmdb && !ignoreDB) {
                fmdb.add('u', {u: u.u, d: {...user.toJS()}});
            }

            if (user.c === 1 || user.u === window.u_handle) {

                if (!ignoreDB) {
                    user.lastName = '';
                    user.firstName = '';
                    attribCache.removeItem(`${user.u}_lastname`);
                    attribCache.removeItem(`${user.u}_firstname`);
                }

                if (!user.m) {
                    // If the email isn't already present, try to fetch it.
                    this.syncContactEmail(user.u, true).catch(nop);
                }
                this.syncUsersFullname(user.u, is_chatlink.ph).catch(dump);

                if (megaChatIsReady && megaChat.plugins.presencedIntegration) {
                    megaChat.plugins.presencedIntegration.eventuallyAddPeer(user.u);
                }
            }
        }
    };
})();

// Update M.opc and related localStorage
MegaData.prototype.addOPC = function(u, ignoreDB) {
    'use strict';

    if (fmdb && !ignoreDB && !pfkey) {
        const d = {...u};

        // Filter out values we don't need to persist.
        delete d.a;
        delete d.i;
        delete d.st;
        delete d.usn;
        if (!d.msg || d.msg === l[17738]) {
            // default invite message.
            delete d.msg;
        }

        fmdb.add('opc', {p: d.p, d});
    }
    this.opc[u.p] = u;
};

/**
 * Delete opc record from localStorage using id
 *
 * @param {string} id
 *
 */
MegaData.prototype.delOPC = function(id) {
    'use strict';

    if (fmdb && !pfkey) {
        fmdb.del('opc', id);
    }
    delete this.opc[id];
};

// Update M.ipc and related localStorage
MegaData.prototype.addIPC = function(u, ignoreDB) {
    'use strict';

    if (fmdb && !ignoreDB && !pfkey) {
        const d = {...u};

        // Filter out values we don't need to persist.
        delete d.a;
        delete d.i;
        delete d.st;
        delete d.usn;
        if (!d.msg || d.msg === l[17738]) {
            // default invite message.
            delete d.msg;
        }

        fmdb.add('ipc', {p: d.p, d});
    }
    this.ipc[u.p] = u;
};

/**
 * Delete ipc record from indexedDb using id
 *
 * @param {string} id
 *
 */
MegaData.prototype.delIPC = function(id) {
    'use strict';

    if (fmdb && !pfkey) {
        fmdb.del('ipc', id);
    }
    delete this.ipc[id];
};

/**
 * Update M.ps and indexedDb
 *
 * Structure of M.ps
 * <shared_item_id>:
 * [
 *  <pending_contact_request_id>:
 *  {h, p, r, ts},
 * ]
 * @param {JSON} ps, pending share
 * @param {boolean} ignoreDB
 *
 *
 */
MegaData.prototype.addPS = function(ps, ignoreDB) {
    if (!this.ps[ps.h]) {
        this.ps[ps.h] = Object.create(null);
    }
    this.ps[ps.h][ps.p] = ps;

    if (fmdb && !ignoreDB && !pfkey) {
        fmdb.add('ps', {h_p: ps.h + '*' + ps.p, d: ps});
    }

    // maintain special outgoing shares index by user:
    if (!this.su[ps.p]) {
        this.su[ps.p] = Object.create(null);
    }
    this.su[ps.p][ps.h] = 2;
};

/**
 * Maintain .ps and related indexedDb
 *
 * @param {string} pcrId, pending contact request id
 * @param {string} nodeId, shared item id
 *
 *
 */
MegaData.prototype.delPS = function(pcrId, nodeId) {

    // Delete the pending share
    if (this.ps[nodeId]) {
        if (this.ps[nodeId][pcrId]) {
            delete this.ps[nodeId][pcrId];
        }

        // If there's no pending shares for node left, clean M.ps
        if (Object.keys(this.ps[nodeId]).length === 0) {
            delete this.ps[nodeId];
        }
    }

    // clear pending share history from M.su
    if (M.su[pcrId] && M.su[pcrId][nodeId] === 2) {
        delete M.su[pcrId][nodeId];
    }

    if (fmdb && !pfkey) {
        fmdb.del('ps', nodeId + '*' + pcrId);
    }
};

/**
 * Invite contacts using email address, also known as ongoing pending contacts.
 * This uses API 3.0
 *
 * @param {String} owner, account owner email address.
 * @param {String} target, target email address.
 * @param {String} msg, optional custom text message.
 * @param {String} contactLink, optional contact link.
 * @returns {Promise<Number|String>} proceed, API response code, if negative something is wrong
 * look at API response code table.
 */
MegaData.prototype.inviteContact = async function(owner, target, msg, contactLink) {
    "use strict";

    // since we have the possibility of having cached attributes of the user we are inviting
    // we will remove the cached attrs to allow API request.
    // this was done due to cases when a user changes his name, then we invite him
    // in other cases when the user is in contacts list, it will be updated with APs.
    // 1- check if we have cache
    if (attribCache) {
        var userHandle = null;
        // 2- check if we cache this user. then get his handle
        for (var us in M.u) {
            if (M.u[us] && M.u[us].m && M.u[us].m === target) {
                userHandle = us;
                break;
            }
        }
        // 3- if we found the user, remove the cached attrs.
        if (userHandle) {
            var userKeys = [userHandle + '_lastname', userHandle + '_firstname'];
            for (var k = 0; k < userKeys.length; k++) {
                attribCache.removeItem(userKeys[k]);
            }
            M.u[userHandle].firstName = '';
            M.u[userHandle].lastName = '';

            M.syncUsersFullname(userHandle);
        }
    }

    if (d) {
        console.group('inviteContact', target);
    }

    const request = {'a': 'upc', 'u': target, 'e': owner, 'aa': 'a'};
    if (contactLink && contactLink.length) {
        request.cl = contactLink;
    }
    if (msg && msg.length) {
        request.msg = msg;
    }

    return api.screq(request)
        .then(({result}) => {

            // In case of invite-dialog we will use notifications
            if ($.dialog !== 'invite-friend') {
                this.inviteContactMessageHandler(result.p);
            }

            return result.m;
        })
        .catch((ex) => this.inviteContactMessageHandler(ex))
        .finally(() => d && console.groupEnd());
};

/**
 * Handle all error codes for contact invitations and shows message
 *
 * @param {int} errorCode
 * @param {string} msg Can be undefined
 * @param {email} email  Can be undefined
 *
 */
MegaData.prototype.inviteContactMessageHandler = function(errorCode) {
    if (errorCode === -12) {

        // Invite already sent, and not expired
        msgDialog('info', '', 'Invite already sent, waiting for response');
    }
    else if (errorCode === -10) {

        // User already sent you an invitation
        msgDialog('info', '', 'User already sent you an invitation, check incoming contacts dialog');
    }
    else if (errorCode === -2) {

        // User already exist or owner
        msgDialog('info', '', l[1783]);
    }
    // EOVERQUOTA err
    else if (errorCode === -17) {
        msgDialog('info', '', l.invalid_invitation_sent);
    }
};

MegaData.prototype.cancelPendingContactRequest = async function(target) {
    'use strict';

    if (d) {
        console.debug('cancelPendingContactRequest', target);
    }

    const {opc} = M;
    let foundEmail = false;

    for (const i in opc) {
        if (opc[i].m === target) {
            // opc is already deleted
            if (!opc[i].dts) {
                foundEmail = true;
            }
            break;
        }
    }

    if (!foundEmail) {
        // opc doesn't exist for given email
        return Promise.reject(EARGS);
    }

    return api.screq({'a': 'upc', 'u': target, 'aa': 'd'});
};

MegaData.prototype.reinvitePendingContactRequest = function(target) {
    'use strict';

    if (d) {
        console.debug('reinvitePendingContactRequest');
    }
    return api.screq({'a': 'upc', 'u': target, 'aa': 'r'});
};

// Answer on 'aa':'a', {"a":"upc","p":"0uUure4TCJw","s":2,"uts":1416434431,"ou":"fRSlXWOeSfo","i":"UAouV6Kori"}
// Answer on 'aa':'i', "{"a":"upc","p":"t17TPe65rMM","s":1,"uts":1416438884,"ou":"nKv9P8pn64U","i":"qHzMjvvqTY"}"
MegaData.prototype.ipcRequestHandler = async function(id, action) {
    'use strict';
    if (d) {
        console.group('ipcRequestHandler', id, action);
    }

    let found = false;
    const {ipc} = this;
    for (const i in ipc) {
        if (ipc[i].p === id) {
            found = true;
            break;
        }
    }

    if (!found) {
        return Promise.reject(EARGS);
    }

    return api.screq({'a': 'upca', 'p': id, 'aa': action})
        .catch((ex) => {
            if (ex === -2) {
                msgDialog('info', 'Already processed', 'Already handled request, something went wrong.');
            }
            else if (ex === -3 || ex === -4) {
                // Server busy, ask them to retry the request
                msgDialog('warninga', 'Server busy', 'The server was busy, please try again later.');
            }
            else if (ex === -12) {
                // Repeated request
                msgDialog('info', 'Repeated request', 'The contact has already been accepted.');
            }
            throw ex;
        })
        .finally(() => d && console.groupEnd());
};

MegaData.prototype.acceptPendingContactRequest = function(id) {
    return this.ipcRequestHandler(id, 'a');
};

MegaData.prototype.denyPendingContactRequest = function(id) {
    return this.ipcRequestHandler(id, 'd');
};

MegaData.prototype.ignorePendingContactRequest = function(id) {
    return this.ipcRequestHandler(id, 'i');
};

// Searches M.opc for the pending contact
MegaData.prototype.findOutgoingPendingContactIdByEmail = function(email) {
    for (var index in this.opc) {
        var opc = this.opc[index];

        if (opc.m === email) {
            return opc.p;
        }
    }
};
