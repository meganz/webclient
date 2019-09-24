import React from 'react';
import MegaRenderMixin from '../../stores/mixins.js';
import utils from '../../ui/utils.jsx';
import { PerfectScrollbar } from '../../ui/perfectScrollbar.jsx';
import { Button } from '../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';

export class ContactsListItem extends MegaRenderMixin(React.Component) {
    render() {
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
                     onClick={this.props.onContactClicked.bind(this)}>
                    <div className="nw-contact-status"></div>
                    <div className="nw-conversations-unread">0</div>
                    <div className="nw-conversations-name">
                        {M.getNameByHandle(contact.u)}
                    </div>
                </div>
            </div>
        );
    }
};

export class ContactButton extends MegaRenderMixin(React.Component) {
    render() {
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
                    <div className="dropdown-user-name" onClick={() => {
                        if (contact.c === 2) {
                            loadSubPage('fm/account');
                        }
                        if (contact.c === 1) {
                            loadSubPage('fm/' + contact.u);
                        }}}>
                         <div className="name">
                            {username}
                            <ContactPresence className="small" contact={contact} />
                        </div>
                        <span className="email">
                            {contact.m}
                        </span>
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
                    <DropdownItem
                        key="view0" icon="human-profile" label={__(l[187])} onClick={() => {
                            loadSubPage('fm/account');
                        }} />
                );
            }
            if (contact.c === 1) {

                if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
                    moreDropdowns.push(
                        <DropdownItem
                            key="startCall" className="contains-submenu" icon="context handset" label={__(l[19125])}
                            onClick={() => {
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
                                <DropdownItem
                                        key="startAudio" icon="context handset" label={__(l[1565])} onClick={() => {
                                            megaChat.createAndShowPrivateRoomFor(contact.u)
                                                .then(function(room) {
                                                    room.setActive();
                                                    room.startAudioCall();
                                                });
                                        }} />
                            </div>
                            <div>
                                <DropdownItem
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
                            <DropdownItem
                                key="startChat" icon="context conversation" label={__(l[5885])} onClick={() => {
                                    loadSubPage('fm/chat/p/' + contact.u);
                                }} />
                    );
                }

                moreDropdowns.push(
                    <hr key="files-separator" />
                );

                moreDropdowns.push(
                    <DropdownItem
                        key="send-files-item" icon="context arrow-in-circle" label={__(l[6834])} onClick={() => {
                        megaChat.openChatAndSendFilesDialog(contact.u);
                    }} />
                );
                moreDropdowns.push(
                    <DropdownItem
                        key="share-item" icon="context share-folder" label={__(l[6775])} onClick={() => {
                            openCopyShareDialog(contact.u);
                    }} />
                );
            }
            else if (!contact.c) {
                moreDropdowns.push(
                    <DropdownItem
                        key="view2"
                        icon="small-icon icons-sprite grey-plus"
                        label={__(l[101])}
                        onClick={() => {
                            loadingDialog.show();
                            const isAnonymousUser = (!u_handle || u_type !== 3);
                            const ADD_CONTACT = 'addContact';
                            if (anonymouschat && isAnonymousUser) {
                                megaChat.loginOrRegisterBeforeJoining(undefined, undefined, undefined, true);
                                if (localStorage.getItem(ADD_CONTACT) === null) {
                                    localStorage.setItem(
                                        ADD_CONTACT,
                                        JSON.stringify({u: contact.u, unixTime: unixtime()})
                                    );
                                }
                            } else {
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
                                        msgDialog('warningb', '', l[17545]);
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
                            }
                            return;
                        }
                    }/>
                );
            }

            // Don't show Set Nickname button if not logged in or clicking your own name
            if (u_attr && contact.u !== u_handle) {

                // Add a Set Nickname button for contacts and non-contacts (who are visible in a group chat)
                moreDropdowns.push(
                    <hr key="nicknames-separator" />
                );
                moreDropdowns.push(
                    <DropdownItem
                        key="set-nickname" icon="small-icon context writing-pen" label={__(l[20828])} onClick={() => {
                            nicknames.setNicknameDialog.init(contact.u);
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
                buttonComponent = <Button
                    className={classes}
                    icon={icon}
                    disabled={moreDropdowns.length === 0 || self.props.dropdownDisabled}
                    label={label}
                    >
                    <Dropdown className="contact-card-dropdown"
                                          positionMy={dropdownPosition}
                                          positionAt={dropdownPosition}
                                          vertOffset={vertOffset}
                                          horizOffset={horizOffset}
                                          noArrow={true}
                    >
                        {moreDropdowns}
                    </Dropdown>
                </Button>;
            }
        }

        return buttonComponent
    }
};

export class ContactVerified extends MegaRenderMixin(React.Component) {
    componentWillMount() {
        var self = this;

        var contact = this.props.contact;
        if (contact && contact.addChangeListener) {
            self._contactListener = contact.addChangeListener(function () {
                self.safeForceUpdate();
            });
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;

        var contact = this.props.contact;
        if (contact && self._contactListener) {
            contact.removeChangeListener(self._contactListener);
        }
    }
    render() {
        if (anonymouschat) {
            return null;
        }
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

            !pubEd25519[contact.u] && crypt.getPubEd25519(contact.u)
                .done(function() {
                    onIdle(function() {
                        if (pubEd25519[contact.u] && self.isMounted()) {
                            self.safeForceUpdate();
                        }
                    });
                });
        }


        return verifiedElement;
    }
};

export const ContactPresence = ({ contact, megaChat = window.megaChat, className = ''}) => {
    if (!contact || !contact.c) {
        return null;
    }

    const pres = megaChat.userPresenceToCssClass(contact.presence);

    return (
        <div className={`user-card-presence ${pres} ${className}`}>
        </div>
    );
};

export class ContactFingerprint extends MegaRenderMixin(React.Component) {
    render() {
        var self = this;
        var contact = this.props.contact;
        if (!contact || !contact.u || anonymouschat) {
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
                verifyButton = <Button
                    className="dropdown-verify active"
                    label={__(l[7692])}
                    icon="grey-key"
                    onClick={() => {
                        $(document).trigger('closeDropdowns');
                        fingerprintDialog(contact.u);
                    }} />
            }
        }

        var fingerprintCode = null;
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
};

var _noAvatars = {};

export class Avatar extends MegaRenderMixin(React.Component) {
    render() {
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        if (!contact.m && contact.email) {
            contact.m = contact.email;
        }

        var avatarMeta = useravatar.generateContactAvatarMeta(contact);

        var classes = (
            this.props.className ? this.props.className : ' avatar-wrapper small-rounded-avatar'
        ) + ' ' + contact.u + ' in-chat';

        classes += " chat-avatar";

        var displayedAvatar;


        var verifiedElement = null;

        if (!this.props.hideVerifiedBadge && !anonymouschat) {
            verifiedElement = <ContactVerified contact={this.props.contact} className={this.props.verifiedClassName} />
        }

        if (!avatars[contact.u] && !_noAvatars[contact.u]) {
            useravatar.loadAvatar(contact.u, pchandle)
                .done(function() {
                    self.safeForceUpdate();
                })
                .fail(function(e) {
                    _noAvatars[contact.u] = true;
                });
        }

        var extraProps = {};
        if (this.props.simpletip) {
            classes += " simpletip";
            extraProps['data-simpletip'] = this.props.simpletip;
            if (this.props.simpletipWrapper) {
                extraProps['data-simpletipwrapper'] = this.props.simpletipWrapper;
            }
            if (this.props.simpletipOffset) {
                extraProps['data-simpletipoffset'] = this.props.simpletipOffset;
            }
            if (this.props.simpletipPosition) {
                extraProps['data-simpletipposition'] = this.props.simpletipPosition;
            }
        }
        if(avatarMeta.type === "image") {
            displayedAvatar = <div className={classes} style={this.props.style}
                    {...extraProps}
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
                    {...extraProps}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        self.props.onClick(e);
                    } : self.onClick}>
                        {verifiedElement}
                        <span>
                            {avatarMeta.avatar.letters}
                        </span>
                </div>;

        }

        return displayedAvatar;
    }
};

export class ContactCard extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        'dropdownButtonClasses': "default-white-button tiny-button",
        'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
        presenceClassName: ''
    }
    specificShouldComponentUpdate(nextProps, nextState) {
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
    }
    render() {

        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var pres =
            (this.props.megaChat ? this.props.megaChat : window.megaChat).userPresenceToCssClass(contact.presence);
        var avatarMeta = generateAvatarMeta(contact.u);
        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

        if (contact.u == u_handle) {
            username += " (Me)";
        }
        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
        var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
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

        var userCard = null;
        var className = this.props.className || "";
        if (className.indexOf("short") >=0) {
            var presenceRow;
            var lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
            if (this.props.showLastGreen && contact.presence <= 2 && lastActivity) {
                presenceRow = (l[19994] || "Last seen %s").replace("%s", time2last(lastActivity));
            }
            else {
                presenceRow = M.onlineStatusClass(contact.presence)[0];
            }

            userCard = <div className="user-card-data">
                {usernameBlock}
                <div className="user-card-status">
                    <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                    {
                        this.props.isInCall ?
                            <i className="small-icon audio-call"></i> :
                            null
                    }
                    <span>{presenceRow}</span>
                </div>
            </div>
        }
        else {
            userCard = <div className="user-card-data">
                {usernameBlock}
                <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                {
                    this.props.isInCall ?
                        <i className="small-icon audio-call"></i> :
                        null
                }
                <div className="user-card-email">{contact.m}</div>
            </div>
        }

        var selectionTick = null;
        if (this.props.selectable) {
            selectionTick = <div className="user-card-tick-wrap">
                <i className="small-icon mid-green-tick"></i>
            </div>
        }

        return <div
                    className={
                        "contacts-info body " +
                        (pres === "offline" ? "offline" : "") +
                        (className ? " " + className : "")
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

                {
                    anonymouschat || noContextButton ? null :
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
                }
                {selectionTick}
                {userCard}
            </div>;
    }
};

export class ContactItem extends MegaRenderMixin(React.Component) {
    render() {
        var classString = "nw-conversations-item";
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

        return <div className="selected-contact-card short">
            <div className="remove-contact-bttn"  onClick={(e) => {
                        if (self.props.onClick) {
                            self.props.onClick(contact, e);
                        }
                    }}>
                <i className="tiny-icon small-cross"></i>
            </div>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar" hideVerifiedBadge={true} />
            <div className="user-card-data">
                    <ContactButton contact={contact} className="light" label={username} />
            </div>
        </div>;
    }
};

export class ContactPickerWidget extends MegaRenderMixin(React.Component) {
    static defaultProps = {
        multipleSelectedButtonLabel: false,
        singleSelectedButtonLabel: false,
        nothingSelectedButtonLabel: false,
        allowEmpty: false
    }
    constructor(props) {
        super(props);
        this.state = {
            'searchValue': '',
            'selected': this.props.selected || false,
        }
    }
    onSearchChange(e) {
        var self = this;
        self.setState({searchValue: e.target.value});
    }
    componentDidMount() {
        super.componentDidMount();
        setContactLink();
    }
    componentDidUpdate() {

        var self = this;
        if (self.scrollToLastSelected && self.psSelected) {
            // set the flag back to false, so on next updates we won't scroll to the last item again.
            self.scrollToLastSelected = false;
            self.psSelected.scrollToPercentX(100, false);
        }

        setContactLink();
    }
    componentWillMount() {
        var self = this;

        if (self.props.multiple) {
            var KEY_ENTER = 13;

            $(document.body).rebind('keypress.contactPicker' + self.getUniqueId(), function(e) {
                var keyCode = e.which || e.keyCode;
                if (keyCode === KEY_ENTER) {
                    if (self.state.selected) {
                        e.preventDefault();
                        e.stopPropagation();

                        $(document).trigger('closeDropdowns');

                        if (self.props.onSelectDone) {
                            self.props.onSelectDone(self.state.selected);
                        }
                    }
                }
            });
        }

        self._frequents = megaChat.getFrequentContacts();
        self._frequents.always(function(r) {
            self._foundFrequents = r.reverse().splice(0, 30);
            self.safeForceUpdate();
        });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;

        delete self._foundFrequents;
        delete self._frequents;

        if (self.props.multiple) {
            $(document.body).off('keypress.contactPicker' + self.getUniqueId());
        }
    }
    _eventuallyAddContact(v, contacts, selectableContacts, forced) {
        var self = this;
        if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
            // continue;
            return false;
        }
        var isDisabled = false;
        if (!self.wasMissingKeysForContacts) {
            self.wasMissingKeysForContacts = {};
        }
        if (!self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
            // we don't want to preload keys each time...e.g. we want to only load them when needed, so ensure they
            // are loaded here
            self.wasMissingKeysForContacts[v.u] = true;

            ChatdIntegration._ensureKeysAreLoaded(undefined, [v.u])
                .always(function() {
                    if (self.isMounted()) {
                        self.safeForceUpdate();
                    }
                });
            isDisabled = true;
            return true;
        }
        else if (self.wasMissingKeysForContacts[v.u] && (!pubCu25519[v.u] || !pubEd25519[v.u])) {
            // keys not loaded, don't allow starting of new chats/any interaction with that user yet
            return false;
        }

        var pres = self.props.megaChat.getPresence(
            v.u
        );

        if (!forced && (v.c != 1 || v.u == u_handle)) {
            return false;
        }

        var avatarMeta = generateAvatarMeta(v.u);

        if (self.state.searchValue && self.state.searchValue.length > 0) {
            // DON'T add to the contacts list if the contact's name or email does not match the search value
            if (
                avatarMeta.fullName.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1 &&
                v.m.toLowerCase().indexOf(self.state.searchValue.toLowerCase()) === -1
            ) {
                return false;
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
                disabled={isDisabled}
                contact={v}
                className={"contacts-search short " + selectedClass + (isDisabled ? " disabled" : "")}
                noContextButton="true"
                selectable={selectableContacts}
                onClick={self.props.readOnly ? () => {} : (contact, e) => {
                    if (isDisabled) {
                        return false;
                    }
                    var contactHash = contact.u;

                    // differentiate between a click and a double click.
                    if (
                        (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500) ||
                        !self.props.multiple
                    ) {
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
        return true;
    }
    render() {
        var self = this;

        var contacts = [];
        var frequentContacts = [];
        var extraClasses = "";

        var contactsSelected = [];

        var multipleContacts = null;
        var topButtons = null;
        var selectableContacts = false;
        var selectFooter = null;
        var selectedContacts = false;
        var isSearching = !!self.state.searchValue;


        var onAddContact = (e) => {

            e.preventDefault();
            e.stopPropagation();

            contactAddDialog();
        };

        if (self.props.readOnly) {
            (self.state.selected || []).forEach(function (v, k) {
                contactsSelected.push(<ContactItem contact={self.props.contacts[v]} key={v} />);
            });
        }
        else if (self.props.multiple) {
            selectableContacts = true;

            var onSelectDoneCb = (e) => {

                e.preventDefault();
                e.stopPropagation();

                $(document).trigger('closeDropdowns');

                if (self.props.onSelectDone) {
                    self.props.onSelectDone(self.state.selected);
                }
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
            var selectedWidth = self.state.selected.length * 54;

            if (!self.state.selected || self.state.selected.length === 0) {
                selectedContacts = false;

                multipleContacts = <div className="horizontal-contacts-list">
                    <div className="contacts-list-empty-txt">{
                        self.props.nothingSelectedButtonLabel ?
                            self.props.nothingSelectedButtonLabel
                            : l[8889]
                    }</div>
                </div>;
            }
            else {
                selectedContacts = true;

                onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
                (self.state.selected || []).forEach(function (v, k) {
                    contactsSelected.push(<ContactItem contact={self.props.contacts[v]}
                                                       onClick={onContactSelectDoneCb}
                                                       key={v}
                    />);
                });

                multipleContacts =
                    <div className="horizontal-contacts-list">
                        <PerfectScrollbar className="perfectScrollbarContainer selected-contact-block horizontal-only"
                                          selected={this.state.selected}
                                          ref={function (psSelected) {
                                              self.psSelected = psSelected;
                                          }}>
                            <div className="select-contact-centre" style={{width: selectedWidth}}>
                                {contactsSelected}
                            </div>
                        </PerfectScrollbar>
                    </div>;
            }

            if (self.props.selectFooter) {

                selectFooter = <div className="fm-dialog-footer">
                    <a className="default-white-button left" onClick={onAddContact.bind(self)}>
                        {l[71]}
                    </a>

                    <a className={"default-grey-button right " + (!selectedContacts ? "disabled" : "")}
                        onClick = {function(e) {
                                if (self.state.selected.length > 0) {
                                    onSelectDoneCb(e);
                                }
                            }}>
                        {
                            this.props.multipleSelectedButtonLabel ?
                                this.props.multipleSelectedButtonLabel
                                : l[8890]
                        }
                    </a>
                </div>;
            }
        }

        if (self.props.showTopButtons) {
            var _topButtons = [];

            self.props.showTopButtons.forEach(function(button) {
                _topButtons.push(
                    <div className={"link-button light"} key={button.key} onClick = {function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // trigger dropdown close.
                        $(document).trigger('closeDropdowns');

                        button.onClick(e);
                    }}>
                        <i className={"small-icon " + button.icon}></i>
                        <span>{button.title}</span>
                    </div>
                )
            });
            topButtons = <div className="contacts-search-buttons">
                {_topButtons}
            </div>;
        }

        var alreadyAdded = {};
        var hideFrequents = !self.props.readOnly && !self.state.searchValue && frequentContacts.length > 0;
        var frequentsLoading = false;
        if (self._frequents && !self._foundFrequents) {
            if (self._frequents.state() === 'pending') {
                hideFrequents = false;
                frequentsLoading = true;
            }
        } else if (!self.props.readOnly && self._foundFrequents) {
            var totalFound = 0;
            self._foundFrequents.forEach(function(v) {
                if (totalFound < 5 && M.u[v.userId]) {
                    if (self._eventuallyAddContact(M.u[v.userId], frequentContacts, selectableContacts)) {
                        alreadyAdded[v.userId] = 1;
                        totalFound++;
                    }
                }
            });
        }

        self.props.contacts.forEach(function(v, k) {
            !alreadyAdded[v.h] && self._eventuallyAddContact(v, contacts, selectableContacts);
        });

        if (Object.keys(alreadyAdded).length === 0) {
            hideFrequents = true;
        }
        var innerDivStyles = {};

        // if (contacts.length < 6) {
            // innerDivStyles['height'] = Math.max(48, contacts.length * 48);
            // innerDivStyles['overflow'] = "visible";
        // }

        if (this.props.showMeAsSelected) {
            self._eventuallyAddContact(M.u[u_handle], contacts, selectableContacts, true);
        }
        var noOtherContacts = false;
        if (contacts.length === 0) {
            noOtherContacts = true;
            var noContactsMsg = "";
            if (M.u.length < 2) {
                noContactsMsg = l[8877];
            }
            else {
                noContactsMsg = l[8878];
            }

            if (hideFrequents) {
                contacts = <em>{noContactsMsg}</em>;
            }
        }

        var haveContacts = isSearching || frequentContacts.length !== 0 || !noOtherContacts;

        var contactsList;
        if (haveContacts) {
            if (frequentContacts.length === 0 && noOtherContacts) {
                contactsList = <div className="chat-contactspicker-no-contacts">
                    <div className="contacts-list-header">
                        {l[165]}
                    </div>
                    <div className="fm-empty-contacts-bg"></div>
                    <div className="fm-empty-cloud-txt small">{l[784]}</div>
                    <div className="fm-empty-description small">{l[19115]}</div>
                </div>;
            }
            else {
                contactsList = <utils.JScrollPane className="contacts-search-scroll"
                                                  selected={this.state.selected}
                                                  changedHashProp={this.props.changedHashProp}
                                                  searchValue={this.state.searchValue}>
                    <div>
                        <div className="contacts-search-subsection"
                             style={{'display': (!hideFrequents ? "" : "none")}}>
                            <div className="contacts-list-header">
                                {l[20141]}
                            </div>

                            {frequentsLoading ?
                                <div className="loading-spinner">...</div> :
                                <div className="contacts-search-list" style={innerDivStyles}>
                                    {frequentContacts}
                                </div>
                            }
                        </div>

                        {contacts.length > 0 ?
                            <div className="contacts-search-subsection">
                                <div className="contacts-list-header">
                                    {!frequentsLoading && frequentContacts.length === 0 ? (
                                        !self.props.readOnly ? l[165] : l[16217]
                                    ) : l[165]}
                                </div>

                                <div className="contacts-search-list" style={innerDivStyles}>
                                    {contacts}
                                </div>
                            </div> : undefined}
                    </div>
                </utils.JScrollPane>;
            }
        }
        else {
            contactsList = <div className="chat-contactspicker-no-contacts">
                <div className="contacts-list-header">
                    {l[165]}
                </div>
                <div className="fm-empty-contacts-bg"></div>
                <div className="fm-empty-cloud-txt small">{l[784]}</div>
                <div className="fm-empty-description small">{l[19115]}</div>
                <div className=" big-red-button fm-empty-button" onClick={function(e) {
                    contactAddDialog();
                }}>
                    {l[101]}
                </div>
                <div className="empty-share-public">
                    <i className="small-icon icons-sprite grey-chain"></i>
                    <span dangerouslySetInnerHTML={{__html: l[19111]}}></span>
                </div>
            </div>;

            extraClasses += " no-contacts";
        }

        var displayStyle = (self.state.searchValue && self.state.searchValue.length > 0) ? "" : "none";
        return <div className={this.props.className + " " + extraClasses}>
            {multipleContacts}
            {!self.props.readOnly && haveContacts ?
                <div className={"contacts-search-header " + this.props.headerClasses}>
                    <i className="small-icon thin-search-icon"></i>
                    <input
                        autoFocus
                        type="search"
                        placeholder={__(l[8010])}
                        ref="contactSearchField"
                        onChange={this.onSearchChange.bind(this)}
                        value={this.state.searchValue}
                    />
                    <div
                        onClick={function(e) {
                            self.setState({searchValue: ''});
                            self.refs.contactSearchField.focus();
                        }}
                        className="search-result-clear"
                        style={{display : displayStyle}}
                    ></div>
                </div> : null}

            {topButtons}
            {contactsList}
            {selectFooter}
        </div>;
    }
};
