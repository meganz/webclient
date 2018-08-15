var React = require("react");
var MegaRenderMixin = require("../../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../../stores/mixins.js").RenderDebugger;
var utils = require("../../ui/utils.jsx");
var PerfectScrollbar = require("../../ui/perfectScrollbar.jsx").PerfectScrollbar;

var ContactsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        classString += " " + this.props.megaChat.userPresenceToCssClass(
            contact.presence
        );

        return (
            <div>
                <div className={classString}
                     onClick={this.props.onContactClicked}>
                    <div className="nw-contact-status"></div>
                    <div className="nw-conversations-unread">0</div>
                    <div className="nw-conversations-name">
                        {M.getNameByHandle(contact.u)}
                    </div>
                </div>
            </div>
        );
    }
});

var ContactButton = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;

        var label = self.props.label ? self.props.label : "";
        var classes = self.props.className ? self.props.className : "";
        var contact = self.props.contact;
        var dropdowns = self.props.dropdowns ? self.props.dropdowns : [];
        var icon = self.props.dropdownIconClasses ? self.props.dropdownIconClasses : [];
        var dropdownPosition = "left top";
        var vertOffset = 0;
        var horizOffset = -30;
        var megaChat = self.props.megaChat ? self.props.megaChat : window.megaChat;

        if (label) {
            classes = "user-card-name " + classes;
            icon = "";
            dropdownPosition = "left bottom";
            vertOffset = 25;
            horizOffset = 0;
        }

        if (!contact) {
            return null;
        }

        var username = M.getNameByHandle(contact.u);

        var buttonComponent = null;
        if (!self.props.noContextMenu) {
            var ButtonsUI = require('./../../ui/buttons.jsx');
            var DropdownsUI = require('./../../ui/dropdowns.jsx');

            var moreDropdowns = [];

            moreDropdowns.push(
                <div className="dropdown-avatar rounded" key="mainContactInfo">
                    <Avatar className="avatar-wrapper context-avatar"
                            contact={contact} hideVerifiedBadge="true" onClick={() => {
                                if (contact.c === 2) {
                                    loadSubPage('fm/account');
                                }
                                if (contact.c === 1) {
                                    loadSubPage('fm/' + contact.u);
                                }
                    }} />
                    <div className="dropdown-user-name">
                        {username}
                        <ContactPresence className="small" contact={contact} />
                    </div>
                </div>
            );

            moreDropdowns.push(
                <ContactFingerprint key="fingerprint" contact={contact} />
            );

            if (dropdowns.length && contact.c !== 2) {
                moreDropdowns.push(dropdowns);

                moreDropdowns.push(
                    <hr key="top-separator" />
                );
            }

            if (contact.c === 2) {
                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                        key="view0" icon="human-profile" label={__(l[187])} onClick={() => {
                            loadSubPage('fm/account');
                        }} />
                );
            }
            if (contact.c === 1) {

                if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
                    moreDropdowns.push(
                        <DropdownsUI.DropdownItem
                            key="startCall" className="contains-submenu" icon="context handset" label={__(l[19125])} onClick={() => {

                                megaChat.createAndShowPrivateRoomFor(contact.u)
                                    .then(function(room) {
                                        room.setActive();
                                        room.startAudioCall();
                                    });
                            }} />
                    );
                    moreDropdowns.push(
                        <div className="dropdown body submenu" key="dropdownGroup">
                            <div>
                                <DropdownsUI.DropdownItem
                                        key="startAudio" icon="context handset" label={__(l[1565])} onClick={() => {
                                    megaChat.createAndShowPrivateRoomFor(contact.u)
                                        .then(function(room) {
                                            room.setActive();
                                            room.startAudioCall();
                                        });
                                        }} />
                            </div>
                            <div>
                                <DropdownsUI.DropdownItem
                                    key="startVideo" icon="context videocam" label={__(l[1566])} onClick={() => {
                                    megaChat.createAndShowPrivateRoomFor(contact.u)
                                        .then(function(room) {
                                            room.setActive();
                                            room.startVideoCall();
                                        });
                                    }} />
                            </div>
                        </div>
                    );
                }
                else {
                    moreDropdowns.push(
                            <DropdownsUI.DropdownItem
                                key="startChat" icon="context conversation" label={__(l[5885])} onClick={() => {
                                    loadSubPage('fm/chat/' + contact.u);
                                }} />
                    );
                }

                moreDropdowns.push(
                    <hr key="files-separator" />
                );

                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                        key="send-files-item" icon="context arrow-in-circle" label={__(l[6834])} onClick={() => {
                        megaChat.openChatAndSendFilesDialog(contact.u);
                    }} />
                );
                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                        key="share-item" icon="context share-folder" label={__(l[6775])} onClick={() => {
                            openCopyShareDialog(contact.u);
                    }} />
                );
            }
            else if (contact.c === 0) {
                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                        key="view2" icon="small-icon icons-sprite grey-plus" label={__(l[101])} onClick={() => {
                        loadingDialog.show();

                        M.syncContactEmail(contact.u)
                            .done(function(email) {
                                var exists = false;
                                Object.keys(M.opc).forEach(function (k) {
                                    if (!exists && M.opc[k].m === email) {
                                        exists = true;
                                        return false;
                                    }
                                });

                                if (exists) {
                                    closeDialog();
                                    msgDialog('warningb', '', l[7413]);
                                } else {
                                    M.inviteContact(M.u[u_handle].m, email);
                                    var title = l[150];

                                    var msg = l[5898].replace('[X]', email);

                                    closeDialog();
                                    msgDialog('info', title, msg);
                                }
                            })
                            .always(function() {
                                loadingDialog.hide();
                            });
                    }} />
                );
            }

            if (self.props.dropdownRemoveButton && self.props.dropdownRemoveButton.length) {
                moreDropdowns.push(
                    <hr key="remove-separator" />
                );
                moreDropdowns.push(
                    self.props.dropdownRemoveButton
                );
            }

            if (moreDropdowns.length > 0) {
                buttonComponent = <ButtonsUI.Button
                    className={classes}
                    icon={icon}
                    disabled={moreDropdowns.length === 0 || self.props.dropdownDisabled}
                    label={label}
                    >
                    <DropdownsUI.Dropdown className="contact-card-dropdown"
                                          positionMy={dropdownPosition}
                                          positionAt={dropdownPosition}
                                          vertOffset={vertOffset}
                                          horizOffset={horizOffset}
                                          noArrow={true}
                    >
                        {moreDropdowns}
                    </DropdownsUI.Dropdown>
                </ButtonsUI.Button>;
            }
        }

        return buttonComponent
    }
});

var ContactVerified = React.createClass({
    mixins: [MegaRenderMixin],
    componentWillMount:function() {
        var self = this;

        var contact = this.props.contact;
        if (contact && contact.addChangeListener) {
            self._contactListener = contact.addChangeListener(function () {
                self.safeForceUpdate();
            });
        }
    },
    componentWillUnmount: function() {
        var self = this;

        var contact = this.props.contact;
        if (contact && self._contactListener) {
            contact.removeChangeListener(self._contactListener);
        }
    },
    render: function() {
        var self = this;

        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var verifiedElement = null;

        if (u_authring && u_authring.Ed25519) {
            var verifyState = u_authring.Ed25519[contact.u] || {};
            verifiedElement = (
                verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON ?
                    <div className={"user-card-verified " + this.props.className}></div> : null
            );
        }
        else {
            var self = this;

            crypt.getPubEd25519(contact.u)
                .done(function() {
                    if(self.isMounted()) {
                        self.safeForceUpdate();
                    }
                })
        }


        return verifiedElement;
    }
});
var ContactPresence = React.createClass({
    mixins: [MegaRenderMixin],
    render: function() {
        var self = this;
        var contact = this.props.contact;
        if (!contact) {
            return null;
        }

        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).userPresenceToCssClass(contact.presence);

        return <div className={"user-card-presence " + pres + " " + this.props.className}></div>;
    }
});

var ContactFingerprint = React.createClass({
    mixins: [MegaRenderMixin],
    render: function() {
        var self = this;
        var contact = this.props.contact;
        if (!contact || !contact.u) {
            return null;
        }

        var infoBlocks = [];

        userFingerprint(contact.u, function(fingerprints) {
            fingerprints.forEach(function(v, k) {
                infoBlocks.push(
                    <span key={"fingerprint-" + k}>
                        {v}
                    </span>
                );
            });
        });

        var verifyButton = null;

        if (contact.c === 1 && u_authring && u_authring.Ed25519) {
            var verifyState = u_authring.Ed25519[contact.u] || {};
            if (
                typeof verifyState.method === "undefined" ||
                verifyState.method < authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON
            ) {
                verifyButton = <ButtonsUI.Button
                    className="dropdown-verify active"
                    label={__(l[7692])}
                    icon="grey-key"
                    onClick={() => {
                        $(document).trigger('closeDropdowns');

                        fingerprintDialog(contact.u);
                    }} />
            }
        }

        var fingerprintCode;
        if (infoBlocks.length > 0) {
            fingerprintCode = <div className="dropdown-fingerprint">
                <div className="contact-fingerprint-title">
                    <span>{__(l[6872])}</span>
                    <ContactVerified contact={contact} />
                </div>
                <div className="contact-fingerprint-txt">
                    {infoBlocks}
                </div>
                {verifyButton}
            </div>;
        }

        return fingerprintCode;
    }
});

var _noAvatars = {};

var Avatar = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        if (!contact.m && contact.email) {
            contact.m = contact.email;
        }

        var avatarMeta = useravatar.generateContactAvatarMeta(contact);

        var classes = (this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar') + ' ' + contact.u;

        classes += " chat-avatar";

        var displayedAvatar;


        var verifiedElement = null;

        if (!this.props.hideVerifiedBadge) {
            verifiedElement = <ContactVerified contact={this.props.contact} className={this.props.verifiedClassName} />
        }

        if (!avatars[contact.u] && !_noAvatars[contact.u]) {
            useravatar.loadAvatar(contact.u)
                .done(function() {
                    self.safeForceUpdate();
                })
                .fail(function(e) {
                    _noAvatars[contact.u] = true;
                });
        }

        if(avatarMeta.type === "image") {
            displayedAvatar = <div className={classes} style={this.props.style}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        self.props.onClick(e);
                    } : self.onClick}>
                        {verifiedElement}
                        <img src={avatarMeta.avatar} style={this.props.imgStyles}/>
            </div>;
        } else {
            classes += " color" + avatarMeta.avatar.colorIndex;

            displayedAvatar = <div className={classes} style={this.props.style}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        self.props.onClick(e);
                    } : self.onClick}>
                        {verifiedElement}
                        {avatarMeta.avatar.letters}
                </div>;

        }

        return displayedAvatar;
    }
});

var ContactCard = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    getDefaultProps: function() {
        return {
            'dropdownButtonClasses': "default-white-button tiny-button",
            'dropdownIconClasses': "tiny-icon icons-sprite grey-dots"
        }
    },
    specificShouldComponentUpdate: function(nextProps, nextState) {
        var self = this;

        var foundKeys = Object.keys(self.props);
        if (foundKeys.indexOf('dropdowns') >= 0) {
            array.remove(foundKeys, 'dropdowns', true);
        }
        var shouldUpdate = undefined;
        foundKeys.forEach(function(k) {
            if (typeof(shouldUpdate) === 'undefined') {
                if (!shallowEqual(nextProps[k], self.props[k])) {
                    shouldUpdate = false;
                }
                else {
                    shouldUpdate = true;
                }
            }
        });

        if (!shouldUpdate) {
            // ^^ if false or undefined.
            if (!shallowEqual(nextState, self.state)) {
                shouldUpdate = false;
            }
            else {
                shouldUpdate = true;
            }
        }
        if (!shouldUpdate && self.state.props.dropdowns && nextProps.state.dropdowns) {
            // ^^ if still false or undefined.
            if (self.state.props.dropdowns.map && nextProps.state.dropdowns.map) {
                var oldKeys = self.state.props.dropdowns.map(child => child.key);
                var newKeys = nextProps.state.dropdowns.map(child => child.key);
                if (!shallowEqual(oldKeys, newKeys)) {
                    shouldUpdate = true;
                }
            }
        }

        return shouldUpdate;
    },
    render: function() {
        var self = this;

        var contact = this.props.contact;
        if (!contact) {
            return null;
        }

        var pres =
            (this.props.megaChat ? this.props.megaChat : window.megaChat).userPresenceToCssClass(contact.presence);
        var avatarMeta = generateAvatarMeta(contact.u);
        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);
        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
        var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];

        var usernameBlock;
        if (!noContextMenu) {
            usernameBlock = <ContactButton key="lnk" dropdowns={dropdowns}
                    noContextMenu={noContextMenu}
                    contact={contact}
                    className="light"
                    label={username}
                    dropdownRemoveButton={dropdownRemoveButton}
            />
        }
        else {
            usernameBlock = <div className="user-card-name light">{username}</div>
        }

        return <div
                    className={
                        "contacts-info body " +
                        (pres === "offline" ? "offline" : "") +
                        (this.props.className ? " " + this.props.className : "")
                    }
                    onClick={(e) => {
                        if (self.props.onClick) {
                            self.props.onClick(contact, e);
                        }
                    }}
                    onDoubleClick={(e) => {
                        if (self.props.onDoubleClick) {
                            self.props.onDoubleClick(contact, e);
                        }
                    }}
                    style={self.props.style}
                    >
                <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar" />

                <ContactButton key="button"
                        dropdowns={dropdowns}
                        dropdownIconClasses={self.props.dropdownIconClasses ? self.props.dropdownIconClasses : ""}
                        disabled={self.props.dropdownDisabled}
                        noContextMenu={noContextMenu}
                        contact={contact}
                        className={self.props.dropdownButtonClasses}
                        dropdownRemoveButton={dropdownRemoveButton}
                        megaChat={self.props.megaChat ? this.props.megaChat : window.megaChat}
                />

                <div className="user-card-data">
                    {usernameBlock}
                    <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                    <div className="user-card-email">{contact.m}</div>
                </div>
            </div>;
    }
});

var ContactItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

        return <div className="selected-contact-card">
            <div className="remove-contact-bttn"  onClick={(e) => {
                        if (self.props.onClick) {
                            self.props.onClick(contact, e);
                        }
                    }}>
                <div className="remove-contact-icon">
                </div>
            </div>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar"/>
            <div className="user-card-data">
                    <ContactButton contact={contact} className="light" label={username} />
            </div>
        </div>;
    }
});

var ContactPickerWidget = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'searchValue': '',
            'selected': false,
        }
    },
    getDefaultProps: function() {
        return {
            multipleSelectedButtonLabel: false,
            singleSelectedButtonLabel: false,
            nothingSelectedButtonLabel: false
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({searchValue: e.target.value});
    },
    componentDidUpdate: function() {

        var self = this;
        if (self.scrollToLastSelected && self.jspSelected) {
            // set the flag back to false, so on next updates we won't scroll to the last item again.
            self.scrollToLastSelected = false;
            var $jsp = $(self.jspSelected.findDOMNode()).data('jsp');
            if ($jsp) {
                $jsp.scrollToPercentX(1, false);
            }
        }

    },
    render: function() {
        var self = this;

        var contacts = [];

        var contactsSelected = [];

        var footer = null;

        if (self.props.multiple) {
            var onSelectDoneCb = (e) => {

                e.preventDefault();
                e.stopPropagation();

                $(document).trigger('closeDropdowns');

                if (self.props.onSelectDone) {
                    self.props.onSelectDone(self.state.selected);
                }
            };
            var clearSearch = (e) => {
                self.setState({searchValue: ''});
                self.refs.contactSearchField.focus();
            };
            var onAddContact = (e) => {

                e.preventDefault();
                e.stopPropagation();

                contactAddDialog();
            };
            var onContactSelectDoneCb = (contact, e) => {

                var contactHash = contact.u;

                // differentiate between a click and a double click.
                if (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500) {
                    // is a double click
                    if (self.props.onSelected) {
                        self.props.onSelected([contactHash]);
                    }
                    self.props.onSelectDone([contactHash]);
                    return;
                }
                else {
                    var selected = clone(self.state.selected || []);

                    // is a single click
                    if (selected.indexOf(contactHash) === -1) {
                        selected.push(contactHash);
                        // only set the scrollToLastSelected if a contact was added, so that the user can scroll
                        // left/right and remove contacts form the list using the X buttons in the UI
                        self.scrollToLastSelected = true;

                        if (self.props.onSelected) {
                            self.props.onSelected(selected);
                        }
                    }
                    else {
                        if (selected.indexOf(contactHash) >= 0) {
                            array.remove(selected, contactHash);
                        }
                        if (self.props.onSelected) {
                            self.props.onSelected(selected);
                        }
                    }
                    self.setState({'selected': selected});
                    self.setState({'searchValue': ''});
                    self.refs.contactSearchField.focus();
                }
                self.clickTime = new Date();
                self.lastClicked = contactHash;
            };
            var selectedWidth = self.state.selected.length * 60;
            if (!self.state.selected || self.state.selected.length === 0) {
                footer = <div className="fm-dialog-footer">
                    <a href="javascript:;" className="default-white-button left" onClick={onAddContact}>
                        {l[71]}
                    </a>
                    <div className="fm-dialog-footer-txt right">{
                        self.props.nothingSelectedButtonLabel ?
                            self.props.nothingSelectedButtonLabel
                            :
                            __(l[8889])
                    }</div>
                </div>;
            }
            else if (self.state.selected.length === 1) {
                self.state.selected.forEach(function(v, k) {
                    contactsSelected.push(<ContactItem contact={self.props.contacts[v]} onClick={onContactSelectDoneCb}
                                                       key={v}
                    /> );
                });
                footer = <div className="contacts-search-footer">
                        <PerfectScrollbar className="selected-contact-block" selected={this.state.selected}>
                            <div className="select-contact-centre" style={{width : selectedWidth}}>
                                {contactsSelected}
                            </div>
                        </PerfectScrollbar>
                    <div className="fm-dialog-footer">
                        <span className="selected-contact-amount">
                            {self.state.selected.length} contacts selected
                        </span>
                        <a href="javascript:;" className="default-grey-button right" onClick={onSelectDoneCb}>
                            {self.props.singleSelectedButtonLabel ? self.props.singleSelectedButtonLabel : l[5885]}
                        </a>
                    </div>
                </div>
            }
            else if (self.state.selected.length > 1) {
                self.state.selected.forEach(function(v, k) {
                    contactsSelected.push(<ContactItem contact={self.props.contacts[v]} onClick={onContactSelectDoneCb}
                                                       key={v}
                    /> );
                });

                footer =
                    <div className="contacts-search-footer">
                        <utils.JScrollPane className="selected-contact-block horizontal-only"
                                          selected={this.state.selected}
                                          ref={function(jspSelected) {
                                              self.jspSelected = jspSelected;
                                          }}>
                            <div className="select-contact-centre" style={{width : selectedWidth}}>
                                {contactsSelected}
                            </div>
                        </utils.JScrollPane>
                        <div className="fm-dialog-footer">
                            <span className="selected-contact-amount">
                                {self.state.selected.length} contacts selected
                            </span>
                            <a href="javascript:;" className="default-grey-button right" onClick={onSelectDoneCb}>
                                {
                                    self.props.multipleSelectedButtonLabel ?
                                        self.props.multipleSelectedButtonLabel
                                        :
                                        __(l[8890])
                                }
                            </a>
                        </div>
                    </div>;
            }
        }


        self.props.contacts.forEach(function(v, k) {
            if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
                // continue;
                return;
            }

            var pres = self.props.megaChat.getPresence(
                v.u
            );

            if (v.c != 1 || v.u == u_handle) {
                return;
            }

            var avatarMeta = generateAvatarMeta(v.u);

            if (self.state.searchValue && self.state.searchValue.length > 0) {
                // DON'T add to the contacts list if the contact's name or email does not match the search value
                if (
                    avatarMeta.fullName.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1 &&
                    v.m.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1
                ) {
                    return;
                }
            }


            if (pres === "chat") {
                pres = "online";
            }

            var selectedClass = "";
            if (self.state.selected && self.state.selected.indexOf(v.u) !== -1) {
                selectedClass = "selected";
            }
            contacts.push(
                <ContactCard
                    contact={v}
                    className={"contacts-search " + selectedClass}
                    onClick={(contact, e) => {
                        var contactHash = contact.u;

                        // differentiate between a click and a double click.
                        if (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500) {
                            // is a double click
                            if (self.props.onSelected) {
                                self.props.onSelected([contactHash]);
                            }
                            self.props.onSelectDone([contactHash]);
                            return;
                        }
                        else {
                            var selected = clone(self.state.selected || []);

                            // is a single click
                            if (selected.indexOf(contactHash) === -1) {
                                selected.push(contactHash);
                                // only set the scrollToLastSelected if a contact was added,
                                // so that the user can scroll left/right and remove contacts
                                // form the list using the X buttons in the UI.
                                self.scrollToLastSelected = true;
                                if (self.props.onSelected) {
                                    self.props.onSelected(selected);
                                }
                            }
                            else {
                                if (selected.indexOf(contactHash) >= 0) {
                                    array.remove(selected, contactHash);
                                }
                                if (self.props.onSelected) {
                                    self.props.onSelected(selected);
                                }
                            }
                            self.setState({'selected': selected});
                            self.setState({'searchValue': ''});
                            self.refs.contactSearchField.focus();
                        }
                        self.clickTime = new Date();
                        self.lastClicked = contactHash;
                    }}
                    noContextMenu={true}
                    key={v.u}
                />
            );
        });

        var innerDivStyles = {};

        if (contacts.length < 6) {
            innerDivStyles['height'] = Math.max(48, contacts.length * 48);
            innerDivStyles['overflow'] = "visible";
        }

        if (contacts.length === 0) {
            var noContactsMsg = "";
            if (M.u.length < 2) {
                noContactsMsg = __(l[8877]);
            }
            else {
                noContactsMsg = __(l[8878]);
            }

            contacts = <em>{noContactsMsg}</em>;
        }
        var displayStyle = (self.state.searchValue && self.state.searchValue.length > 0) ? "" : "none";
        return <div className={this.props.className + " " }>
            <div className={"contacts-search-header " + this.props.headerClasses}>
                <i className="small-icon search-icon"></i>
                <input
                    type="search"
                    placeholder={__(l[8010])}
                    ref="contactSearchField"
                    onChange={this.onSearchChange}
                    value={this.state.searchValue}
                />
                <div className="search-result-clear" style={{display : displayStyle}} onClick={clearSearch}></div>
            </div>

            <utils.JScrollPane className="contacts-search-scroll" selected={this.state.selected}>
                <div style={innerDivStyles}>
                    {contacts}
                </div>
            </utils.JScrollPane>
            {footer}
        </div>;
    }
});

module.exports = {
    ContactsListItem,
    ContactButton,
    ContactCard,
    Avatar,
    ContactPickerWidget,
    ContactVerified,
    ContactPresence,
    ContactFingerprint
};
