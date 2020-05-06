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
    if (u && megaChatIsReady) {
        var e = $('.ustatus.' + u.u);
        if (e.length > 0) {
            $(e).removeClass('offline online busy away');
            $(e).addClass(this.onlineStatusClass(status)[1]);
        }
        e = $('#contact_' + u.u);
        if (e.length > 0) {
            $(e).removeClass('offline online busy away');
            $(e).addClass(this.onlineStatusClass(status)[1]);
        }

        e = $('.fm-chat-user-status.' + u.u);
        if (e.length > 0) {
            $(e).safeHTML(this.onlineStatusClass(status)[0]);
        }
    }
};


/**
 *
 * @param {array.<JSON_objects>} ipc - received requests
 * @param {bool} clearGrid
 *
 */
MegaData.prototype.drawReceivedContactRequests = function(ipc, clearGrid) {
    if (d) console.debug('Draw received contacts grid.');
    var html;
    var email;
    var ps;
    var ts;
    var trClass;
    var id;
    var type = '';
    var drawn = false;
    var t = '.grid-table.contact-requests';
    var contactName = '';

    if (this.currentdirid === 'ipc') {

        if (clearGrid) {
            $(t + ' tr').remove();
        }

        for (var i in ipc) {
            id = ipc[i].p;
            // Make sure that denied and ignored requests are shown properly
            // don't be fooled, we need M.ipc here and not ipc
            if (this.ipc[id]) {
                if (this.ipc[id].dts || (this.ipc[id].s && (this.ipc[id].s === 3))) {
                    type = 'deleted';
                }
                else if (this.ipc[id].s && this.ipc[id].s === 1) {
                    type = 'ignored';
                }
                trClass = (type !== '') ? ' class="' + type + '"' : '';
                email = ipc[i].m;

                if (ipc[i].ts) {
                    ts = time2last(ipc[i].ts);
                }
                html = '<tr id="ipc_' + id + '"' + trClass + '>' +
                    '<td>' +
                    useravatar.contact(email) +
                    '<div class="fm-chat-user-info">' +
                    '<div class="fm-chat-user">' + htmlentities(contactName) + '</div>' +
                    '<div class="contact-email">' + htmlentities(email) + '</div>' +
                    '</div>' +
                    '</td>' +
                    '<td>' + ts + '</td>' +
                    '<td class="right-textalign">' +
                    '<div class="contact-request-button default-white-button green-txt inline accept">' +
                    '<i class="small-icon icons-sprite tiny-green-tick"></i>' +
                    '<span>' + l[5856] + '</span></div>' +
                    '<div class="contact-request-button default-white-button grey-txt inline ignore">' +
                    '<i class="small-icon icons-sprite stop dark"></i>' +
                    '<span>' + l[20980] + '</span></div>' +
                    '<div class="contact-request-button default-white-button red-txt inline delete">' +
                    '<i class="small-icon icons-sprite tiny-red-cross"></i>' +
                    '<span>' + l[20981] + '</span></div>' +
                    '<div class="contact-request-ignored"><span>' + l[5864] + '</span></div>' +
                    '<div class="clear"></div>' +
                    '</td>' +
                    '</tr>';

                $(t).append(html);

                drawn = true;
            }
        }

        // If at least one new item is added then ajust grid
        if (drawn) {
            $('.fm-empty-contacts').addClass('hidden');
            $('.button.link-button.accept-all').removeClass('hidden');

            // Update IPC indicator
            delay('updateIpcRequests', updateIpcRequests);

            // hide/show sent/received grid
            $('.sent-requests-grid').addClass('hidden');
            $('.contact-requests-grid').removeClass('hidden');

            fm_resize_handler(true);

            /**
             * Bind actions to Received Pending Conctact Request buttons
             */
            $('.contact-requests-grid .contact-request-button').rebind('click', function() {
                var $self = $(this);
                var $reqRow = $self.closest('tr');
                var ipcId = $reqRow.attr('id').replace('ipc_', '');

                if ($self.is('.accept')) {
                    if (M.acceptPendingContactRequest(ipcId) === 0) {
                        $reqRow.remove();
                    }
                }
                else if ($self.is('.delete')) {
                    if (M.denyPendingContactRequest(ipcId) === 0) {
                        $reqRow.remove();
                    }
                }
                else if ($self.is('.ignore')) {
                    if (M.ignorePendingContactRequest(ipcId) === 0) {
                        $reqRow.remove();
                    }
                }
            });

            $('.contact-requests-grid td').rebind('dblclick.shownewcontact', function(e) {
                var $this = $(this);
                var u_handle = $this.parent('tr').attr('id').replace('ipc_', '');

                if ($(e.target).parent('.contact-request-button').length) {
                    return false;
                }

                newContactDialog(u_handle);

                return false; // stop propagation!
            });

            $('.button.link-button.accept-all').rebind('click', function() {
                var $requestsList= $('.grid-table.contact-requests tr');
                var ipcId = '';

                $requestsList.each(function() {
                    ipcId = $(this).attr('id').replace('ipc_', '');

                    if (M.acceptPendingContactRequest(ipcId) === 0) {
                        $(this).remove();
                    }
                });
            });
        }
    }
};

MegaData.prototype.handleEmptyContactGrid = function() {

    var haveActiveContact = false;

    // If focus is on contacts tab
    if (this.currentdirid === 'contacts') {
        this.u.forEach(function(v, k) {
            if (v.c === 1) {
                haveActiveContact = true;
                return false; // break
            }
        });

        // We do NOT have active contacts, set empty contacts grid
        if (!haveActiveContact) {
            $('.files-grid-view.contacts-view').addClass('hidden');
            $('.fm-empty-contacts .fm-empty-cloud-txt').text(l[784]);
            $('.fm-empty-contacts').removeClass('hidden');
        }
    }

    return haveActiveContact;
};

/**
 *
 * @param {array.<JSON_objects>} opc - sent requests
 * @param {bool} clearGrid
 *
 */
MegaData.prototype.drawSentContactRequests = function(opc, clearGrid) {

    if (d) console.debug('Draw sent invites.');

    var html;
    var hideCancel;
    var hideReinvite;
    var hideOPC;
    var drawn = false;
    var TIME_FRAME = 60 * 60 * 24 * 14;// 14 days in seconds
    var utcDateNow = Math.floor(Date.now() / 1000);
    var rts;
    var t = '.grid-table.sent-requests';

    if (this.currentdirid === 'opc') {

        if (clearGrid) {
            $(t + ' tr').remove();
        }

        for (var i in opc) {
            if (opc.hasOwnProperty(i)) {
                hideCancel = '';
                hideReinvite = '';
                hideOPC = '';
                if (opc[i].dts) {
                    hideOPC = 'deleted';
                    hideReinvite = 'hidden';
                    hideCancel = 'hidden';
                }
                else {
                    if (utcDateNow < (opc[i].rts + TIME_FRAME)) {
                        hideReinvite = 'hidden';
                    }
                }

                if (opc[i].rts) {
                    rts = time2last(opc[i].rts);
                }
                else {
                    // if action packet does not contains rts, it is treated as canceled
                    rts = l[6112];
                }

                hideOPC = (hideOPC !== '') ? ' class="' + hideOPC + '"' : '';
                html = '<tr id="opc_' + htmlentities(opc[i].p) + '"' + hideOPC + '>' +
                    '<td>' +
                    '<div class="left email">' +
                    '<div class="avatar-wrapper small-rounded-avatar"></div>' +
                    '<div class="fm-chat-user-info">' +
                    '<div class="contact-email">' + htmlentities(opc[i].m) + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</td>' +
                    '<td>' + rts + '</td>' +
                    '<td class="right-textalign">' +
                    '<div class="default-white-button grey-txt ' +
                    'contact-request-button inline reinvite ' + hideReinvite + '">' +
                    '<i class="small-icon icons-sprite reverted dark"></i>' +
                    '<span>' + escapeHTML(l[5861]) + '</span>' +
                    '</div>' +
                    '<div class="default-white-button red-txt ' +
                    'contact-request-button inline cancel ' + hideCancel + '">' +
                    '<i class="small-icon icons-sprite tiny-red-cross"></i>' +
                    '<span>' + escapeHTML(l[82]) + '</span>' +
                    '</div>' +
                    '</td></tr>';

                $(t).append(html);

                drawn = true;
            }
        }

        if (drawn) {
            $('.fm-empty-contacts').addClass('hidden');

            // hide/show received/sent grids
            $('.contact-requests-grid').addClass('hidden');
            $('.sent-requests-grid').removeClass('hidden');

            fm_resize_handler(true);

            /**
             * Bind actions to Received pending contacts requests buttons
             */

            $('.sent-requests-grid .contact-request-button').rebind('click', function() {
                var $self = $(this);
                var $reqRow = $self.closest('tr');
                var opcId = $reqRow.attr('id').replace('opc_', '');

                if ($self.is('.reinvite')) {
                    M.reinvitePendingContactRequest(M.opc[opcId].m);
                    $reqRow.addClass('hidden');
                    $reqRow.children().children('.contact-request-button.reinvite').addClass('hidden');
                    contactsInfoDialog(l[19126], M.opc[opcId].m, l[19127]);
                }
                else if ($self.is('.cancel')) {

                    // If successfully deleted, grey column and hide buttons
                    if (M.cancelPendingContactRequest(M.opc[opcId].m) === 0) {
                        $reqRow.remove();
                    }
                }
            });
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

// Contacts left panel handling
MegaData.prototype.contacts = function() {
    // Contacts rendering not used on mobile
    if (is_mobile) {
        return true;
    }

    var i;
    var activeContacts = this.getActiveContacts()
        .map(function(handle) {
            return M.d[handle];
        });

    var sortBy = $.sortTreePanel['contacts'].by;
    var sortDirection = $.sortTreePanel['contacts'].dir;
    var sortFn;

    if (sortBy === 'last-interaction') {
        sortFn = this.getSortByInteractionFn();
    }
    else if (sortBy === 'name') {
        sortFn = this.getSortByNameFn();
    }
    else if (sortBy === 'status') {
        sortFn = this.getSortByStatusFn();
    }
    else if (sortBy === 'created') {
        sortFn = this.getSortByDateTimeFn();
    }
    else if (sortBy === 'fav') {
        sortFn = this.sortByFavFn(sortDirection);
    }

    if (typeof sortFn === 'function') {
        activeContacts.sort(
            function(a, b) {
                return sortFn(a, b, sortDirection);
            }
        );
    }

    var html = '';
    var onlinestatus;

    // status can be: "online"/"away"/"busy"/"offline"
    for (i in activeContacts) {
        if (activeContacts.hasOwnProperty(i)) {
            if (megaChatIsReady && activeContacts[i].u) {
                onlinestatus = this.onlineStatusClass(
                    activeContacts[i].presence ? activeContacts[i].presence : 'unavailable'
                );
            }
            else {
                onlinestatus = [l[5926], 'offline'];
            }

            var name = this.getNameByHandle(activeContacts[i].u);

            if (!treesearch || name.toLowerCase().indexOf(treesearch.toLowerCase()) > -1) {

                html += '<div class="nw-contact-item ui-droppable '
                    + onlinestatus[1] + '" id="contact_' + htmlentities(activeContacts[i].u)
                    + '"><div class="nw-contact-status"></div><div class="nw-contact-name">'
                    + htmlentities(name)
                    + '<a class="button start-chat-button"><span></span></a></div></div>';
            }
            $('.fm-start-chat-dropdown').addClass('hidden');
        }
    }

    $('.content-panel.contacts').html(html);

    if (megaChatIsReady) {
        var $dropdown = $('.fm-start-chat-dropdown');

        $('.fm-tree-panel').rebind('click.megaChat', '.start-chat-button', function() {
            var scrollPos = 0;

            var $this = $(this);
            var $userDiv = $this.parent().parent();

            $.hideContextMenu();

            if (!$this.is('.active')) {
                var docHeight = $(document).height();
                var dropdownHeight = $dropdown.outerHeight();
                var buttonPos = $this.offset().top;

                $('.start-chat-button').removeClass('active');

                $this.addClass('active');
                var y = buttonPos + 21;

                if (y + dropdownHeight > docHeight) {
                    y = buttonPos - dropdownHeight - 5;
                }

                $dropdown
                    .css('top', y)
                    .removeClass('hidden')
                    .addClass('active')
                    .data("triggeredBy", $this);

                $dropdown.find('.startchat-item').rebind('click.treePanel', function() {
                    var $this = $(this);

                    if (!$this.is(".disabled")) {
                        var user_handle = $.selected && $.selected[0];
                        loadSubPage("fm/chat/p/" + user_handle);
                    }
                });

                $dropdown.find('.startaudio-item').rebind('click.treePanel', function() {
                    if (u_attr && u_attr.b && u_attr.b.s === -1) {
                        M.showExpiredBusiness();
                        return;
                    }

                    var $this = $(this);
                    var $triggeredBy = $this.parent().data("triggeredBy");
                    var $userDiv = $triggeredBy.parent().parent();

                    if (!$this.is('.disabled')) {
                        var user_handle = $userDiv.attr('id').replace('contact_', '');

                        megaChat.createAndShowPrivateRoomFor(user_handle)
                            .then(function(room) {
                                room.setActive();
                                room.startAudioCall();
                            });
                    }
                });

                $dropdown.find('.startvideo-item').rebind('click.treePanel', function() {
                    if (u_attr && u_attr.b && u_attr.b.s === -1) {
                        M.showExpiredBusiness();
                        return;
                    }

                    var $this = $(this);
                    var $triggeredBy = $this.parent().data('triggeredBy');
                    var $userDiv = $triggeredBy.parent().parent();

                    if (!$this.is('.disabled')) {
                        var user_handle = $userDiv.attr('id').replace('contact_', '');

                        megaChat.createAndShowPrivateRoomFor(user_handle)
                            .then(function(room) {
                                room.setActive();
                                room.startVideoCall();
                            });
                    }
                });
            }
            else {
                $this.removeClass('active');
                $dropdown
                    .removeClass('active')
                    .addClass('hidden')
                    .removeData("triggeredBy");
            }

            $.selected = [$userDiv.attr('id').replace('contact_', '')];

            return false; // stop propagation!
        });

    }

    $('.fm-tree-panel').rebind('click', '.nw-contact-item', function() {
        var id = $(this).attr('id');
        if (id) {
            id = id.replace('contact_', '');
        }
        M.openFolder(id);

        return false; // stop propagation!
    });

    // On the Contacts screen, double clicking a contact name in the left panel changes to the conversation screen
    $('.fm-tree-panel').rebind('dblclick.treepanel', '.nw-contact-item', function() {

        // Get the element ID
        var $this = $(this);
        var id = $this.attr('id');

        // Get the user handle and change to conversations screen
        var user_handle = id.replace('contact_', '');
        loadSubPage('fm/chat/p/' + user_handle);
    });

    M.addTreeUI();
};

MegaData.prototype.getContacts = function(n) {
    var folders = [];
    for (var i in this.c[n.h])
        if (this.d[i].t == 1 && this.d[i].name) {
            folders.push(this.d[i]);
        }

    return folders;
};

MegaData.prototype.syncUsersFullname = function(userId, chatHandle) {
    "use strict";
    var self = this;

    if (this.u[userId].firstName || this.u[userId].lastName) {
        // already loaded.
        return MegaPromise.resolve();
    }

    // eslint-disable-next-line local-rules/hints
    var promise = new MegaPromise();

    var lastName = {name: 'lastname', value: null};
    var firstName = {name: 'firstname', value: null};

    var fnameEncoded = '';
    var lnameEncoded = '';

    MegaPromise.allDone([
        mega.attr.get(userId, 'firstname', -1, false, undefined, undefined, chatHandle)
            .done(function(r) {
                firstName.value = r;
                fnameEncoded = r;
            }),
        mega.attr.get(userId, 'lastname', -1, false, undefined, undefined, chatHandle)
            .done(function(r) {
                lastName.value = r;
                lnameEncoded = r;
            })
    ]).done(function() {
        if (!self.u[userId]) {
            promise.reject();
            return;
        }

        [firstName, lastName].forEach(function(obj) {

            // -1, -9, -2, etc...
            if (typeof obj.value === 'string') {
                try {
                    obj.value = from8(base64urldecode(obj.value));
                }
                catch (ex) {
                    obj.value = ex;
                }
            }

            if (typeof obj.value !== 'string' || !obj.value) {
                obj.value = '';
            }
        });

        lastName = lastName.value;
        firstName = firstName.value;

        self.u[userId].firstName = firstName;
        self.u[userId].lastName = lastName;
        var user = self.u[userId];

        if (firstName && $.trim(firstName).length > 0 || lastName && $.trim(lastName).length > 0) {
            self.u[userId].name = "";

            if (firstName && $.trim(firstName).length > 0) {
                self.u[userId].name = firstName;
            }
            if (lastName && $.trim(lastName).length > 0) {
                self.u[userId].name += (self.u[userId].name.length > 0 ? " " : "") + lastName;
            }

            // Get the nickname (if available) and name
            var userName = nicknames.getNicknameAndName(userId);

            if (M.currentdirid === 'shares') {// Update right panel list and block view
                $('.shared-grid-view .' + userId + ' .fm-chat-user').text(userName);
                $('.inbound-share .' + userId).next().find('.shared-folder-info')
                    .text(l[17590].replace('%1', userName));
            }
            else if (M.getNodeRoot(M.currentdirid) === 'shares') {
                $('.shared-details-info-block .' + userId).next()
                    .find('.fm-chat-user').text(userName + ' <' + user.m + '>');
            }
            else if (M.getNodeRoot(M.currentdirid) === 'contacts' && $.sortTreePanel) {

                // Update left panel if it has been initialised
                M.contacts();
            }
        }
        else {
            self.u[userId].name = "";
        }

        if (nicknames.cache[userId]) {
            self.u[userId].nickname = nicknames.cache[userId];
        }

        if (self.u[userId].avatar && self.u[userId].avatar.type != "image") {
            self.u[userId].avatar = false;
            useravatar.loaded(userId);
        }

        if (userId === u_handle) {
            u_attr.firstname = firstName;
            u_attr.lastname = lastName;
            u_attr.name = self.u[userId].name;

            $('.user-name').text(u_attr.fullname);
            $('.membership-big-txt.name').text(u_attr.fullname);
            if (M.currentdirid === 'account') {
                accountUI.account.profiles.renderFirstName();
                accountUI.account.profiles.renderLastName();
            }
        }
        // check if this first name + last belongs to business sub-user
        // we added here to avoid re-calling get attribute + minimize the need of code refactoring
        if (u_attr && u_attr.b && u_attr.b.m) {
            if (M.suba && M.suba[userId]) {
                M.require('businessAcc_js', 'businessAccUI_js').done(
                    function () {
                        var business = new BusinessAccount();

                        var subUser = M.suba[userId];
                        subUser.firstname = fnameEncoded;
                        subUser.lastname = lnameEncoded;

                        business.parseSUBA(subUser, false, true);
                    }
                );
            }
        }
        promise.resolve();
    });

    return promise;
};

MegaData.prototype.syncContactEmail = function(userHash) {
    var promise = new MegaPromise();
    if (anonymouschat) {
        return promise.reject();
    }

    if (M.u[userHash]) {
        if (!M.u[userHash].m) {
            attribCache.getItem(userHash + "_uge")
                .done(function (r) {
                    M.u[userHash].m = r;
                    promise.resolve(r);
                })
                .fail(function () {
                    asyncApiReq({
                        'a': 'uge',
                        'u': userHash
                    })
                        .done(function (r) {
                            if (r && isString(r)) {
                                if (M.u[userHash]) {
                                    M.u[userHash].m = r;
                                    attribCache.setItem(userHash + "_uge", r);
                                    promise.resolve(r);
                                }
                                else {
                                    promise.reject();
                                }
                            }
                            else {
                                promise.reject();
                            }
                        });
                });
        } else {
            promise.resolve(M.u[userHash].m);
        }
    }
    else {
        promise.reject();
    }

    return promise;
};

(function(global) {
    "use strict";

    var eventuallyReorderContactsTreePane = function() {
        if (
            (
                M.currentdirid === "contacts" ||
                M.currentdirid === "ipc" ||
                M.currentdirid === "opc" ||
                M.u[M.currentdirid]
            ) &&
            typeof $.sortTreePanel !== 'undefined' &&
            typeof $.sortTreePanel.contacts !== 'undefined' &&
            $.sortTreePanel.contacts.by === 'status'
        ) {
            M.contacts(); // we need to resort
        }
    };

    /**
     * Callback, that would be called when a contact is changed.
     */
    var onContactChanged = function(contact) {
        if (fminitialized) {
            // throttle updates, since a lot of batched updates may come at
            // pretty much the same moment (+/- few ms, enough to trigger tons of updates)
            delay('onContactChanged', function() {
                if (getSitePath() === '/fm/' + contact.u) {
                    // re-render the contact view page if the presence had changed
                    M.addContactUI();
                }
                else if (M.currentdirid === 'contacts') {
                    M.openFolder(M.currentdirid, true);
                }
                if (M.u[contact.h] && M.u[contact.h].c) {
                    eventuallyReorderContactsTreePane();
                }
            }, 1000);
        }
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
            var userId = u.u;

            if (this.u[userId]) {
                for (var key in u) {
                    if (MEGA_USER_STRUCT.hasOwnProperty(key) && key !== 'name') {
                        this.u[userId][key] = u[key];
                    }
                    else if (d) {
                        console.warn('addUser: property "%s" not updated.', key, u[key]);
                    }
                }

                u = this.u[userId];
            }
            else {
                this.u.set(userId, new MegaDataObject(MEGA_USER_STRUCT, true, u));
            }

            this.u[userId].addChangeListener(onContactChanged);

            if (fmdb && !ignoreDB && !pfkey) {
                // convert MegaDataObjects -> JS
                var cleanedUpUserData = clone(u.toJS ? u.toJS() : u);
                delete cleanedUpUserData.presence;
                delete cleanedUpUserData.presenceMtime;
                delete cleanedUpUserData.shortName;
                delete cleanedUpUserData.firstName;
                delete cleanedUpUserData.lastName;
                delete cleanedUpUserData.name;
                delete cleanedUpUserData.avatar;
                delete cleanedUpUserData.ats;
                fmdb.add('u', {u: u.u, d: cleanedUpUserData});
                M.u[userId].firstName = '';
                M.u[userId].lastName = '';
                attribCache.removeItem(userId + "_firstname");
                attribCache.removeItem(userId + "_lastname");
            }

            this.syncUsersFullname(userId);
            if (!megaChatIsDisabled && typeof megaChat !== 'undefined' && megaChat.plugins.presencedIntegration) {
                megaChat.plugins.presencedIntegration.eventuallyAddPeer(userId);
            }
        }
    };
})(this);

// Update M.opc and related localStorage
MegaData.prototype.addOPC = function(u, ignoreDB) {
    this.opc[u.p] = u;
    if (fmdb && !ignoreDB && !pfkey) {
        fmdb.add('opc', {p: u.p, d: u});
    }
};

/**
 * Delete opc record from localStorage using id
 *
 * @param {string} id
 *
 */
MegaData.prototype.delOPC = function(id) {
    if (fmdb && !pfkey) {
        fmdb.del('opc', id);
    }
};

// Update M.ipc and related localStorage
MegaData.prototype.addIPC = function(u, ignoreDB) {
    this.ipc[u.p] = u;
    if (fmdb && !pfkey) {
        fmdb.add('ipc', {p: u.p, d: u});
    }
};

/**
 * Delete ipc record from indexedDb using id
 *
 * @param {string} id
 *
 */
MegaData.prototype.delIPC = function(id) {
    if (fmdb && !pfkey) {
        fmdb.del('ipc', id);
    }
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
 * This uses API 2.0
 *
 * @param {String} owner, account owner email address.
 * @param {String} target, target email address.
 * @param {String} msg, optional custom text message.
 * @param {String} contactLink, optional contact link.
 * @returns {Integer} proceed, API response code, if negative something is wrong
 * look at API response code table.
 */
MegaData.prototype.inviteContact = function (owner, target, msg, contactLink) {
    "use strict";

    var invitePromise = new MegaPromise();

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
        console.debug('inviteContact');
    }
    var request = { 'a': 'upc', 'u': target, 'e': owner, 'aa': 'a', i: requesti };
    if (contactLink && contactLink.length) {
        request.cl = contactLink;
    }
    if (msg && msg.length) {
        request.msg = msg;
    }
    api_req(request, {
        callback: function(resp) {
            if (typeof resp === 'object' && resp.p) {

                // In case of invite-dialog we will use notifications
                if ($.dialog !== 'invite-friend') {
                    M.inviteContactMessageHandler(resp.p);
                    invitePromise.resolve(resp.m);
                }
            }
            if (typeof resp !== 'object' && contactLink) {
                M.inviteContactMessageHandler(resp);
            }
            invitePromise.reject(false);
        }
    });
    return invitePromise;
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
};

MegaData.prototype.cancelPendingContactRequest = function(target) {
    if (d) console.debug('cancelPendingContactRequest');
    var proceed = this.checkCancelContactPrerequisites(target);

    if (proceed === 0) {
        api_req({'a': 'upc', 'u': target, 'aa': 'd', i: requesti}, {
            callback: function(resp) {
                proceed = resp;
            }
        });
    }

    this.cancelContactMessageHandler(proceed);

    return proceed;
};

MegaData.prototype.cancelContactMessageHandler = function(errorCode) {
    if (errorCode === -2) {
        msgDialog('info', '', 'This pending contact is already deleted.');
    }
};

MegaData.prototype.checkCancelContactPrerequisites = function(email) {

    // Check pending invitations
    var opc = M.opc;
    var foundEmail = false;
    for (var i in opc) {
        if (M.opc[i].m === email) {
            foundEmail = true;
            if (M.opc[i].dts) {
                return -2;// opc is already deleted
            }
        }
    }
    if (!foundEmail) {
        return -2;// opc doesn't exist for given email
    }

    return 0;
};

MegaData.prototype.reinvitePendingContactRequest = function(target) {

    if (d) console.debug('reinvitePendingContactRequest');
    api_req({'a': 'upc', 'u': target, 'aa': 'r', i: requesti});
};

// Answer on 'aa':'a', {"a":"upc","p":"0uUure4TCJw","s":2,"uts":1416434431,"ou":"fRSlXWOeSfo","i":"UAouV6Kori"}
// Answer on 'aa':'i', "{"a":"upc","p":"t17TPe65rMM","s":1,"uts":1416438884,"ou":"nKv9P8pn64U","i":"qHzMjvvqTY"}"
// ToDo, update M.ipc so we can have info about ipc status for view received requests
MegaData.prototype.ipcRequestHandler = function(id, action) {
    if (d) console.debug('ipcRequestHandler');
    var proceed = this.checkIpcRequestPrerequisites(id);

    if (proceed === 0) {
        api_req({'a': 'upca', 'p': id, 'aa': action, i: requesti}, {
            callback: function(resp) {
                proceed = resp;
            }
        });
    }

    this.ipcRequestMessageHandler(proceed);

    return proceed;
};

MegaData.prototype.ipcRequestMessageHandler = function(errorCode) {
    if (errorCode === -2) {
        msgDialog('info', 'Already processed', 'Already handled request, something went wrong.');
    }

    // Server busy, ask them to retry the request
    else if (errorCode === -3 || errorCode === -4) {
        msgDialog('warninga', 'Server busy', 'The server was busy, please try again later.');
    }

    // Repeated request
    else if (errorCode === -12) {
        msgDialog('info', 'Repeated request', 'The contact has already been accepted.');
    }
};

MegaData.prototype.checkIpcRequestPrerequisites = function(id) {
    var ipc = this.ipc;
    for (var i in ipc) {
        if (this.ipc[i].p === id) {
            return -0;
        }
    }

    return 0;
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

MegaData.prototype.addContactUI = function() {
    "use strict";

    var $container = $('.contact-top-details');

    $('.nw-contact-item').removeClass('selected');

    var n = this.u[this.currentdirid];
    if (n && n.u) {
        var u_h = this.currentdirid;
        var user = this.u[u_h];
        var avatar = $(useravatar.contact(u_h, 'medium-avatar'));

        var onlinestatus = this.onlineStatusClass(
            megaChatIsReady &&
            this.u[u_h] ? this.u[u_h].presence : "unavailable"
        );

        $container.find('.nw-contact-block-avatar').empty().append(avatar);
        $container.find('.onlinestatus').removeClass('away offline online busy').addClass(onlinestatus[1]);
        $container.find('.fm-chat-user-status').text(onlinestatus[0]);
        $container.find('.contact-details-user-name').text(this.getNameByHandle(user.u));
        $container.find('.contact-details-email').text(user.m);
        $('.contact-share-notification').text(l[20435].replace('%1', this.getNameByHandle(user.u)));

        // Display the current fingerpring
        showAuthenticityCredentials(user, $container);

        // Set authentication state of contact from authring.
        // To be called on settled authring promise.
        authring.onAuthringReady('contactUI').done(function _setVerifiedState() {

            var handle = user.u || user;
            var verificationState = u_authring.Ed25519[handle] || {};
            var isVerified = (verificationState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            // Show the user is verified
            if (isVerified) {
                $('.fm-verify').addClass('verified').find('span').text(l[6776]);
            }
            else {
                // Otherwise show the Verify... button.
                enableVerifyFingerprintsButton(handle);
            }
        });

        // Reset seen or verified fingerprints and re-enable the Verify button
        $('.fm-reset-stored-fingerprint').rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            authring.resetFingerprintsForUser(user.u);
            enableVerifyFingerprintsButton(user.u);

            // Refetch the key
            showAuthenticityCredentials(user, $container);

            // Trigger manual UI updates
            if (M.u[user.u]) {
                M.u[user.u].trackDataChange();
            }
        });

        $('.fm-share-folders').rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }
            openCopyShareDialog(M.currentdirid);
        });

        // Initialise the Set nickname button on the contact details page
        $('.fm-set-nickname').rebind('click', function() {

            nicknames.setNicknameDialog.init(u_h);
        });

        // Remove contact button on contacts page
        $('.fm-remove-contact').rebind('click', function() {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            fmremove([M.currentdirid]);
        });

        if (!megaChatIsDisabled) {

            // Bind the "Start conversation" button
            $('.fm-start-conversation').rebind('click.megaChat', function() {
                loadSubPage('fm/chat/p/' + u_h);
                return false;
            });
        }

        $('.nw-contact-item#contact_' + u_h).addClass('selected');
    }
};

MegaData.prototype.contactsUI = function() {
    "use strict";

    var $container = $('.contacts-view');
    var $contactBlocks = $container.find('.data-block-view, .contacts tr');
    var $buttons = $contactBlocks.find('.default-white-button');

    setContactLink();

    mega.achievem.enabled()
        .done(function() {
            $container.find('.contact-green-info').text(l[19107]);
            $('.fm-empty-contacts .fm-empty-description.small').text(l[19115]);
        })
        .fail(function() {
            $container.find('.contact-green-info').text(l[19106]);
            $('.fm-empty-contacts .fm-empty-description.small').text(l[19114]);
        });

    $('.contacts-tab-lnk').rebind('click', function() {
        var $this = $(this);
        var folder = escapeHTML($this.attr('data-folder'));

        if (folder === "ipc") {
            M.openFolder('ipc');
        }
        else if (folder === "opc") {
            M.openFolder('opc');
        }
        else {
            M.openFolder('contacts');
        }
    });

    $contactBlocks.rebind('mouseover.contacts', function() {
        var $this = $(this);

        if (megaChatIsDisabled) {
            $this.find('.contact-chat-buttons').addClass('hidden');
        }
        else {
            $this.find('.contact-chat-buttons').removeClass('hidden');
        }
    });

    $buttons.rebind('click.contacts', function() {

        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            M.showExpiredBusiness();
            return;
        }

        var $this = $(this);
        var user_handle = $this.closest('.data-block-view, tr').attr('id');

        if ($this.hasClass('disabled') || !user_handle) {
            return;
        }

        if ($this.hasClass('start-conversation')) {
            loadSubPage("fm/chat/p/" + user_handle);
        }
        else if ($this.hasClass('start-audio-call')) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startAudioCall();
                });
        }
        else if ($this.hasClass('start-video-call')) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startVideoCall();
                });
        }
    });

    $('.fm-empty-contacts .fm-empty-button, .add-new-contact, .fm-add-user')
        .rebind('mousedown.addcontact1', function(e) {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            $.hideContextMenu();
            contactAddDialog();
            e.stopPropagation();
        });

};

