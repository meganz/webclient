import React from 'react';
import {ContactAwareComponent} from '../../stores/mixins.js';
import {MegaRenderMixin} from '../../stores/mixins.js';
import utils from '../../ui/utils.jsx';
import { PerfectScrollbar } from '../../ui/perfectScrollbar.jsx';
import { Button } from '../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';

const EMPTY_ARR = [];

var _attchRerenderCbContacts = function(others) {
    this.addDataStructListenerForProperties(this.props.contact, [
        'name',
        'firstName',
        'lastName',
        'nickname',
        'm',
        'avatar'
    ].concat(others ? others : EMPTY_ARR));
};


export class ContactsListItem extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallback = _attchRerenderCbContacts;
    render() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        classString += " " + megaChat.userPresenceToCssClass(
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
}

export class ContactButton extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks = _attchRerenderCbContacts;
    customIsEventuallyVisible() {
        if (this.props.chatRoom) {
            return this.props.chatRoom.isCurrentlyActive;
        }
        return -1;
    }
    dropdownItemGenerator() {
        var self = this;
        var contact = self.props.contact;
        var dropdowns = self.props.dropdowns ? self.props.dropdowns : [];

        var moreDropdowns = [];

        var username = M.getNameByHandle(contact.u);

        var onContactClicked = function() {
            if (contact.c === 2) {
                loadSubPage('fm/account');
            }
            if (contact.c === 1) {
                loadSubPage('fm/' + contact.u);
            }
        };

        moreDropdowns.push(
            <div className="dropdown-avatar rounded" key="mainContactInfo">
                <Avatar className="avatar-wrapper context-avatar"
                        chatRoom={this.props.chatRoom}
                        contact={contact} hideVerifiedBadge="true" onClick={onContactClicked} />
                <div className="dropdown-user-name" onClick={onContactClicked}>
                    <div className="name">
                        {username}
                        <ContactPresence className="small" contact={contact} />
                    </div>
                    {contact && (contact.c === 1 || contact.c === 2) && <span className="email">{contact.m}</span>}
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

            if (contact.c === 2 && contact.u === u_handle) {
                moreDropdowns.push(
                    <DropdownItem
                        key="view0" icon="human-profile" label={l[187]} onClick={() => {
                            loadSubPage('fm/account');
                        }} />
                );
            }
            if (contact.c === 1) {

            var startAudioCall = function() {
                megaChat.createAndShowPrivateRoom(contact.u)
                    .then(function(room) {
                        room.setActive();
                        room.startAudioCall();
                    });
            };

            if (megaChat.currentlyOpenedChat && megaChat.currentlyOpenedChat === contact.u) {
                moreDropdowns.push(
                    <DropdownItem
                        key="startCall" className="contains-submenu" icon="context handset" label={l[19125]}
                        onClick={startAudioCall} />
                );



                moreDropdowns.push(
                    <div className="dropdown body submenu" key="dropdownGroup">
                        <div>
                            <DropdownItem
                                key="startAudio" icon="context handset" label={l[1565]}
                                onClick={startAudioCall} />
                        </div>
                        <div>
                            <DropdownItem
                                key="startVideo" icon="context videocam" label={l[1566]} onClick={() => {
                                    megaChat.createAndShowPrivateRoom(contact.u)
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
                        key="startChat" icon="context conversation" label={l[5885]} onClick={() => {
                            loadSubPage('fm/chat/p/' + contact.u);
                        }} />
                );
            }

            moreDropdowns.push(
                <hr key="files-separator" />
            );

            moreDropdowns.push(
                <DropdownItem
                    key="send-files-item" icon="context arrow-in-circle" label={l[6834]} onClick={() => {
                        megaChat.openChatAndSendFilesDialog(contact.u);
                    }} />
            );
            moreDropdowns.push(
                <DropdownItem
                    key="share-item" icon="context share-folder" label={l[6775]} onClick={() => {
                        openCopyShareDialog(contact.u);
                    }} />
                );
            }
            else if (!contact.c || (contact.c === 2 && contact.u !== u_handle)) {
                moreDropdowns.push(
                    <DropdownItem
                        key="view2"
                        icon="small-icon icons-sprite grey-plus"
                        label={l[101]}
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
                            }
                            else {
                                M.syncContactEmail(contact.u, new MegaPromise(), true)
                                    .done(function(email) {
                                        var exists = false;
                                        var opcKeys = Object.keys(M.opc);
                                        for (var i = 0; i < opcKeys.length; i++) {
                                            if (!exists && M.opc[opcKeys[i]].m === email) {
                                                exists = true;
                                                break;
                                            }
                                        }

                                    if (exists) {
                                        closeDialog();
                                        msgDialog('warningb', '', l[17545]);
                                    }
                                    else {
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
                    }
                    } />
            );
        }

        // Don't show Set Nickname button if not logged in or clicking your own name
        if (u_attr && contact.u !== u_handle) {

            // Add a Set Nickname button for contacts and non-contacts (who are visible in a group chat)

            if (
                moreDropdowns.length > 0 &&
                !(moreDropdowns.length === 2 && moreDropdowns[1] && moreDropdowns[1].key === "fingerprint")
            ) {
                moreDropdowns.push(
                    <hr key="nicknames-separator" />
                );
            }
            moreDropdowns.push(
                <DropdownItem
                    key="set-nickname" icon="small-icon context writing-pen" label={l[20828]} onClick={() => {
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

        return moreDropdowns;
    }
    render() {
        var self = this;

        var label = self.props.label ? self.props.label : "";
        var classes = self.props.className ? self.props.className : "";
        var contact = self.props.contact;
        var icon = self.props.dropdownIconClasses ? self.props.dropdownIconClasses : [];
        var dropdownPosition = "left top";
        var vertOffset = 0;
        var horizOffset = -30;

        if (!contact) {
            return null;
        }

        if (label) {
            classes = "user-card-name " + classes;
            icon = "";
            dropdownPosition = "left bottom";
            vertOffset = 25;
            horizOffset = 0;
        }

        if (!contact.name && !contact.m && !self.props.noLoading && this.isLoadingContactInfo()) {
            label = <em className="contact-name-loading" />;
        }

        return (
            this.props.noContextMenu ?
                <div className="user-card-name light">{label}</div> :
                <Button
                    className={classes}
                    icon={icon}
                    disabled={self.props.dropdownDisabled}
                    label={label}>
                    <Dropdown
                        className="contact-card-dropdown"
                        positionMy={dropdownPosition}
                        positionAt={dropdownPosition}
                        vertOffset={vertOffset}
                        horizOffset={horizOffset}
                        dropdownItemGenerator={self.dropdownItemGenerator.bind(this)}
                        noArrow={true}/>
                </Button>
        );
    }
}

export class ContactVerified extends MegaRenderMixin {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks() {
        this.addDataStructListenerForProperties(this.props.contact, [
            'fingerprint',
        ]);
    }
    render() {
        if (anonymouschat) {
            return null;
        }
        var contact = this.props.contact;
        if (!contact) {
            return null;
        }

        if (u_authring && u_authring.Ed25519) {
            var verifyState = u_authring.Ed25519[contact.u] || {};
            if (verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) {
                return <div className={"user-card-verified " + this.props.className}/>;
            }
        }
        else if (!pubEd25519[contact.u]) {
            crypt.getPubEd25519(contact.u)
                .then(() => {
                    if (pubEd25519[contact.u]) {
                        this.safeForceUpdate();
                    }
                });
        }

        return null;
    }
};

export class ContactPresence extends MegaRenderMixin {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    render() {
        var contact = this.props.contact;
        var className = this.props.className || '';

        if (!contact || !contact.c) {
            return null;
        }

        const pres = megaChat.userPresenceToCssClass(contact.presence);

        return (
            <div className={`user-card-presence ${pres} ${className}`}>
            </div>
        );
    }
};

export class LastActivity extends ContactAwareComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { contact, showLastGreen } = this.props;

        if (!contact) {
            return null;
        }

        const lastActivity = !contact.ats || contact.lastGreen > contact.ats ? contact.lastGreen : contact.ats;
        const SECONDS = new Date().getTime() / 1000 - lastActivity;
        const FORTY_FIVE_DAYS = 3888000; // seconds
        const timeToLast = SECONDS > FORTY_FIVE_DAYS ? l[20673] : time2last(lastActivity, true);
        const hasActivityStatus = showLastGreen && contact.presence <= 2 && lastActivity;

        return (
            <span>
                {hasActivityStatus ?
                    (l[19994] || "Last seen %s").replace("%s", timeToLast) :
                    M.onlineStatusClass(contact.presence)[0]}
            </span>
        );
    }
}

export class ContactAwareName extends ContactAwareComponent {
    render() {
        return this.props.contact ? <span>{this.props.children}</span> : null;
    }
}

export class MembersAmount extends ContactAwareComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { room } = this.props;

        return room ?
            <span>
                {(l[20233] || "%s Members").replace("%s", Object.keys(room.members).length)}
            </span> :
            null;
    }
}

export class ContactFingerprint extends MegaRenderMixin {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks() {
        this.addDataStructListenerForProperties(this.props.contact, [
            'fingerprint'
        ]);
    }
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
                    label={l[7692]}
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
                    <span>{l[6872]}</span>
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


export class Avatar extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks = _attchRerenderCbContacts;
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
            verifiedElement = <ContactVerified
                contact={this.props.contact}
                className={this.props.verifiedClassName} />;
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

        if (avatarMeta.type === "image") {
            displayedAvatar = <div className={classes} style={this.props.style}
                    {...extraProps}
                    onClick={self.props.onClick ? (e) => {
                        $(document).trigger('closeDropdowns');
                        self.props.onClick(e);
                    } : self.onClick}>
                        {verifiedElement}
                        <img src={avatarMeta.avatar} style={this.props.imgStyles}/>
            </div>;
        }
        else {
            classes += " color" + avatarMeta.avatar.colorIndex;
            var isLoading = self.isLoadingContactInfo();
            if (isLoading) {
                classes += " default-bg";
            }

            displayedAvatar = <div className={classes} style={this.props.style}
                {...extraProps}
                onClick={self.props.onClick ? (e) => {
                    $(document).trigger('closeDropdowns');
                    self.props.onClick(e);
                } : self.onClick}>
                {verifiedElement}
                <span>
                    {isLoading ? "" : avatarMeta.avatar.letters}
                </span>
            </div>;

        }

        return displayedAvatar;
    }
}

export class ContactCard extends ContactAwareComponent {
    static defaultProps = {
        'dropdownButtonClasses': "default-white-button tiny-button",
        'dropdownIconClasses': "tiny-icon icons-sprite grey-dots",
        'presenceClassName': '',
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks() {
        _attchRerenderCbContacts.call(this, ['presence']);
    }
    specShouldComponentUpdate(nextProps, nextState) {
        var self = this;

        var foundKeys = Object.keys(self.props);
        if (foundKeys.indexOf('dropdowns') >= 0) {
            array.remove(foundKeys, 'dropdowns', true);
        }

        let shouldUpdate;
        if (foundKeys.length) {
            let k = foundKeys[0];
            shouldUpdate = shallowEqual(nextProps[k], self.props[k]);
        }

        if (!shouldUpdate) {
            // ^^ if false or undefined.
            shouldUpdate = shallowEqual(nextState, self.state);
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

        var pres = megaChat.userPresenceToCssClass(contact.presence);
        var username = (this.props.namePrefix ? this.props.namePrefix : "") +
            (M.getNameByHandle(contact.u) || contact.m);

        if (contact.u === u_handle) {
            username += " (" + escapeHTML(l[8885]) + ")";
        }
        var dropdowns = this.props.dropdowns ? this.props.dropdowns : [];
        var noContextMenu = this.props.noContextMenu ? this.props.noContextMenu : "";
        var noContextButton = this.props.noContextButton ? this.props.noContextButton : "";
        var dropdownRemoveButton = self.props.dropdownRemoveButton ? self.props.dropdownRemoveButton : [];
        var highlightSearchValue = self.props.highlightSearchValue ? self.props.highlightSearchValue : false;
        var emailTooltips = self.props.emailTooltips ? self.props.emailTooltips : false;
        var searchValue = self.props.searchValue ? self.props.searchValue : "";

        var usernameBlock;
        if (!noContextMenu) {
            usernameBlock = <ContactButton key="lnk" dropdowns={dropdowns}
                noContextMenu={noContextMenu}
                contact={contact}
                className="light"
                label={username}
                chatRoom={this.props.chatRoom}
                dropdownRemoveButton={dropdownRemoveButton}
            />;
        }
        else {
            if (highlightSearchValue && searchValue.length > 0) {
                var matches = [];
                var regex = new RegExp(searchValue, 'gi');
                var result;

                // eslint-disable-next-line no-cond-assign
                while (result = regex.exec(username)) {
                    matches.push({idx: result.index, str: result[0]});
                }

                username = <span dangerouslySetInnerHTML={{
                    __html: megaChat.highlight(
                        username,
                        matches,
                        false
                    )
                }}></span>;
            }
            if (emailTooltips) {
                usernameBlock = <div
                    className="user-card-name light simpletip"
                    data-simpletip={contact.m}
                    data-simpletipposition="top">{username}</div>;
            }
            else {
                usernameBlock = <div className="user-card-name light">{username}</div>;
            }
        }

        var userCard = null;
        var className = this.props.className || "";
        if (className.indexOf("short") >= 0) {
            userCard = <div className="user-card-data">
                {usernameBlock}
                <div className="user-card-status">
                    <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                    {
                        this.props.isInCall ?
                            <i className="small-icon audio-call"></i> :
                            null
                    }
                    <LastActivity contact={contact} showLastGreen={this.props.showLastGreen} />
                </div>
            </div>;
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
            style={self.props.style}>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar"
                chatRoom={this.props.chatRoom} />

            {
                anonymouschat || noContextButton ? null :
                <ContactButton
                    key="button"
                    dropdowns={dropdowns}
                    dropdownIconClasses={self.props.dropdownIconClasses ? self.props.dropdownIconClasses : ""}
                    disabled={self.props.dropdownDisabled}
                    noContextMenu={noContextMenu}
                    contact={contact}
                    className={self.props.dropdownButtonClasses}
                    dropdownRemoveButton={dropdownRemoveButton}
                    noLoading={self.props.noLoading}
                    chatRoom={self.props.chatRoom}
                />
            }
            {selectionTick}
            {userCard}
        </div>;
    }
}

export class ContactItem extends ContactAwareComponent {
    static defaultProps = {
        'manualDataChangeTracking': true,
        'skipQueuedUpdatesOnResize': true
    }
    attachRerenderCallbacks = _attchRerenderCbContacts;
    render() {
        var classString = "nw-conversations-item";
        var self = this;
        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        var username = this.props.namePrefix ? this.props.namePrefix : "" + M.getNameByHandle(contact.u);

        return <div className="selected-contact-card short">
            {/* eslint-disable-next-line sonarjs/no-identical-functions */}
            <div className="remove-contact-bttn"  onClick={(e) => {
                if (self.props.onClick) {
                    self.props.onClick(contact, e);
                }
            }}>
                <i className="tiny-icon small-cross"></i>
            </div>
            <Avatar contact={contact} className="avatar-wrapper small-rounded-avatar" hideVerifiedBadge={true}
                chatRoom={this.props.chatRoom} />
            <div className="user-card-data">
                <ContactButton
                    noContextMenu={this.props.noContextMenu}
                    contact={contact}
                    className="light"
                    label={username}
                    chatRoom={this.props.chatRoom} />
            </div>
        </div>;
    }
}

export class ContactPickerWidget extends MegaRenderMixin {
    static defaultProps = {
        multipleSelectedButtonLabel: false,
        singleSelectedButtonLabel: false,
        nothingSelectedButtonLabel: false,
        allowEmpty: false,
        disableFrequents: false,
        notSearchInEmails: false,
        autoFocusSearchField: false,
        disableDoubleClick: false,
        newEmptySearchResult: false,
        newNoContact: false,
        emailTooltips: false
    }
    constructor(props) {
        super(props);
        this.state = {
            'searchValue': '',
            'selected': this.props.selected || false,
        };
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
        if (super.componentWillMount) {
            super.componentWillMount();
        }

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
            self._foundFrequents = self.props.disableFrequents ? [] : clone(r).reverse().splice(0, 30);
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
        if (!forced && (v.c !== 1 || v.u === u_handle)) {
            return false;
        }
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

        var pres = megaChat.getPresence(
            v.u
        );


        var avatarMeta = generateAvatarMeta(v.u);

        if (self.state.searchValue && self.state.searchValue.length > 0) {
            var userName = ChatSearch._normalize_str(avatarMeta.fullName.toLowerCase());
            var userEmail = ChatSearch._normalize_str(v.m.toLowerCase());

            // DON'T add to the contacts list if the contact's name or email does not match the search value
            if (
                userName.indexOf(self.state.searchValue.toLowerCase()) === -1 &&
                (userEmail.indexOf(self.state.searchValue.toLowerCase()) === -1 || self.props.notSearchInEmails)
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
                chatRoom={false}
                className={"contacts-search short " + selectedClass + (isDisabled ? " disabled" : "")}
                noContextButton="true"
                selectable={selectableContacts}
                onClick={self.props.readOnly ? () => {} : (contact, e) => {
                    if (isDisabled) {
                        return false;
                    }
                    var contactHash = contact.u;

                    // differentiate between a click and a double click.
                    // disable the doulbe click for add contacts to share dialog
                    if (
                        (contactHash === self.lastClicked && (new Date() - self.clickTime) < 500
                            && !self.props.disableDoubleClick) || !self.props.multiple
                    ) {
                        // is a double click
                        if (self.props.onSelected) {
                            self.props.onSelected([contactHash]);
                        }
                        self.props.onSelectDone([contactHash]);
                        $(document).trigger('closeDropdowns');
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
                        if (self.props.autoFocusSearchField) {
                            self.refs.contactSearchField.focus();
                        }
                    }
                    self.clickTime = new Date();
                    self.lastClicked = contactHash;
                }}
                noContextMenu={true}
                searchValue={self.state.searchValue}
                highlightSearchValue={self.props.highlightSearchValue}
                emailTooltips={self.props.emailTooltips}
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
            var sel = self.state.selected || [];
            for (var i = 0; i < sel.length; i++) {
                var v = sel[i];
                contactsSelected.push(<ContactItem contact={M.u[v]} key={v} chatRoom={self.props.chatRoom} />);
            }
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
                    if (self.props.autoFocusSearchField) {
                        self.refs.contactSearchField.focus();
                    }
                }
                self.clickTime = new Date();
                self.lastClicked = contactHash;
            };
            var selectedWidthSize = self.props.selectedWidthSize || 54;
            var selectedWidth = self.state.selected.length * selectedWidthSize;

            if (!self.state.selected || self.state.selected.length === 0) {
                selectedContacts = false;
                var emptySelectionMsg = self.props.emptySelectionMsg || l[8889];

                multipleContacts = <div className="horizontal-contacts-list">
                    <div className="contacts-list-empty-txt">{
                        self.props.nothingSelectedButtonLabel ?
                            self.props.nothingSelectedButtonLabel
                            : emptySelectionMsg
                    }</div>
                </div>;
            }
            else {
                selectedContacts = true;

                onContactSelectDoneCb = onContactSelectDoneCb.bind(self);
                var sel2 = self.state.selected || [];
                for (var i2 = 0; i2 < sel2.length; i2++) {
                    var v2 = sel2[i2];
                    contactsSelected.push(
                        <ContactItem
                            noContextMenu={true}
                            contact={M.u[v2]}
                            onClick={onContactSelectDoneCb}
                            chatRoom={self.props.chatRoom || false}
                            key={v2} />
                    );
                }

                multipleContacts =
                    <div className="horizontal-contacts-list">
                        <PerfectScrollbar className="perfectScrollbarContainer selected-contact-block horizontal-only"
                            selected={this.state.selected}
                            ref={function(psSelected) {
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
        var sortFn = M.getSortByNameFn2(1);
        contacts.sort(function(a, b) {
            return sortFn(a.props.contact, b.props.contact);
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
                if (self.props.newEmptySearchResult) {
                    contactsList = <div className="chat-contactspicker-no-contacts searching">
                        <div className="fm-empty-contacts-bg"></div>
                        <div className="fm-empty-cloud-txt small">{l[8674]}</div>
                    </div>;
                }
                else {
                    contactsList = <div className="chat-contactspicker-no-contacts">
                        <div className="contacts-list-header">
                            {l[165]}
                        </div>
                        <div className="fm-empty-contacts-bg"></div>
                        <div className="fm-empty-cloud-txt small">{l[784]}</div>
                        <div className="fm-empty-description small">{l[19115]}</div>
                    </div>;
                }
            }
            else {
                contactsList = <utils.JScrollPane className="contacts-search-scroll"
                    selected={this.state.selected}
                    changedHashProp={this.props.changedHashProp}
                    contacts={contacts}
                    frequentContacts={frequentContacts}
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
                                    {frequentContacts && frequentContacts.length === 0 ? (
                                        self.props.readOnly ? l[16217] : l[165]
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
        else if (self.props.newNoContact) {
            multipleContacts = "";
            contactsList = <div className="chat-contactspicker-no-contacts">
                <div className="fm-empty-contacts-bg"></div>
                <div className="fm-empty-cloud-txt small">{l[784]}</div>
                <div className="fm-empty-description small">{l[19115]}</div>
            </div>;

            extraClasses += " no-contacts";
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
        var totalContactsNum = contacts.length + frequentContacts.length;
        var searchPlaceholderMsg = totalContactsNum === 1 ? l[23749] : l[23750].replace("[X]", totalContactsNum);
        return <div className={this.props.className + " " + extraClasses}>
            {multipleContacts}
            {!self.props.readOnly && haveContacts ?
                <div className={"contacts-search-header " + this.props.headerClasses}>
                    <i className="small-icon thin-search-icon"></i>
                    <input
                        autoFocus
                        type="search"
                        placeholder={searchPlaceholderMsg}
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
