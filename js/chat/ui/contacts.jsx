var React = require("react");
var MegaRenderMixin = require("../../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../../stores/mixins.js").RenderDebugger;
var utils = require("../../ui/utils.jsx");


var ContactsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

        if (!contact) {
            return null;
        }

        classString += " " + this.props.megaChat.xmppPresenceToCssClass(
            contact.presence
        );

        return (
            <div>
                <div className={classString} onClick={this.props.onContactClicked}>
                    <div className="nw-contact-status"></div>
                    <div className="nw-conversations-unread">0</div>
                    <div className="nw-conversations-name">
                        {generateContactName(contact.u)}
                    </div>
                </div>
            </div>
        );
    }
});


var ContactVerified = React.createClass({
    mixins: [MegaRenderMixin],
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
                        self.forceUpdate();
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

        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).xmppPresenceToCssClass(contact.presence);

        return <div className={"user-card-presence " + pres + " " + this.props.className}></div>;
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

        var $avatar = $(useravatar.contact(contact));

        var classes = (this.props.className ? this.props.className : 'small-rounded-avatar') + ' ' + contact.u;
        
        var letterClass = 'avatar-letter';

        var displayedAvatar;


        var verifiedElement = null;

        if (!this.props.hideVerifiedBadge) {
            verifiedElement = <ContactVerified contact={this.props.contact} className={this.props.verifiedClassName} />
        }

        if($avatar.find("img").length > 0) {
            displayedAvatar = <div className={classes} style={this.props.style}>
                {verifiedElement}
                <img src={$("img", $avatar).attr("src")} style={this.props.imgStyles}/>
            </div>;
        } else {
            var tempClasses = $avatar.attr('class');
            var colorNum = tempClasses.split("color")[1].split(" ")[0];
            classes += " color" + colorNum;

            displayedAvatar = <div className={classes} style={this.props.style}>{verifiedElement}<div className={letterClass} data-user-letter={$(useravatar.contact(contact)).text()}></div></div>;

        }

        return displayedAvatar;
    }
});

var AvatarImage = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var contact = this.props.contact;

        var imgUrl = useravatar.imgUrl(contact.u);

        var displayedAvatar;

        displayedAvatar = <img src={imgUrl} style={this.props.imgStyles} className="avatar-img" />;

        if (!avatars[contact.u] && (!_noAvatars[contact.u] || _noAvatars[contact.u] !== true)) {
            var self = this;

            var loadAvatarPromise;
            if (!_noAvatars[contact.u]) {
                loadAvatarPromise = mega.attr.get(contact.u, 'a', true, false);
            }
            else {
                loadAvatarPromise = _noAvatars[contact.u];
            }

            loadAvatarPromise
                .done(function(r) {
                    if (typeof r !== 'number' && r.length > 5) {
                        var blob = new Blob([str_to_ab(base64urldecode(r))], {type: 'image/jpeg'});
                        avatars[contact.u] = {
                            data: blob,
                            url: myURL.createObjectURL(blob)
                        };
                    }

                    useravatar.loaded(contact);

                    delete _noAvatars[contact.u];

                    self.forceUpdate();
                })
                .fail(function(e) {
                    _noAvatars[contact.u] = true;
                });

        }

        return displayedAvatar;
    }
});

var ContactCard = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;

        var contact = this.props.contact;
        if (!contact) {
            return null;
        }

        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).xmppPresenceToCssClass(contact.presence);
        var avatarMeta = generateAvatarMeta(contact.u);

        var contextMenu;
        if (!this.props.noContextMenu) {
            var ButtonsUI = require('./../../ui/buttons.jsx');
            var DropdownsUI = require('./../../ui/dropdowns.jsx');

            var moreDropdowns = this.props.dropdowns ? this.props.dropdowns : [];

            if (contact.c === 1) {
                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                            key="view" icon="human-profile" label={__("View Profile")} onClick={() => {
                                window.location = '#fm/' + contact.u;
                            }} />
                );
                if (window.location.hash != '#fm/chat/' + contact.u) {
                    moreDropdowns.push(
                        <DropdownsUI.DropdownItem
                            key={"start_conv_" + contact.u}
                            icon="conversations" label={__("Open/start Chat")} onClick={() => {
                                        window.location = '#fm/chat/' + contact.u;
                                    }}/>
                    );
                }
            }

            contextMenu = <ButtonsUI.Button
                className="default-white-button tiny-button"
                icon="tiny-icon grey-down-arrow">
                <DropdownsUI.Dropdown className="contact-card-dropdown"
                    positionMy="right top"
                    positionAt="right bottom"
                    vertOffset={4}
                    noArrow={true}
                >
                    {moreDropdowns}
                </DropdownsUI.Dropdown>
            </ButtonsUI.Button>;
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
                    >
                <ContactPresence contact={contact} className={this.props.presenceClassName}/>
                <Avatar contact={contact} className="small-rounded-avatar" />

                {contextMenu}

                <div className="user-card-data">
                    <div className="user-card-name small">{avatarMeta.fullName}</div>
                    <div className="user-card-email small">{contact.m}</div>
                </div>
            </div>;
    }
});

var ContactPickerWidget = React.createClass({
    mixins: [MegaRenderMixin],
    getInitialState: function() {
        return {
            'searchValue': ''
        }
    },
    onSearchChange: function(e) {
        var self = this;
        self.setState({searchValue: e.target.value});
    },
    render: function() {
        var self = this;

        var contacts = [];

        self.props.contacts.forEach(function(v, k) {
            if (self.props.exclude && self.props.exclude.indexOf(v.u) > -1) {
                // continue;
                return;
            }

            var pres = self.props.megaChat.karere.getPresence(
                self.props.megaChat.getJidFromNodeId(v.u)
            );

            if (v.c == 0 || v.u == u_handle) {
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
            if (self.props.selected && self.props.selected.indexOf(v.h) !== -1) {
                selectedClass = "selected";
            }
            contacts.push(
                <ContactCard
                    contact={v}
                    className={"contacts-search " + selectedClass}
                    onClick={(contact, e) => {
                        if (self.props.onClick) {
                            self.props.onClick(contact, e);
                        }
                    }}
                    noContextMenu={true}
                    key={v.u + "_" + selectedClass}
                />
            );
        });

        return <div>
            <div className={"contacts-search-header " + this.props.headerClasses}>
                <i className="small-icon search-icon"></i>
                <input
                    type="search"
                    placeholder={__(l[8010])}
                    ref="contactSearchField"
                    onChange={this.onSearchChange}
                    value={this.state.searchValue}
                />
            </div>

            <utils.JScrollPane className="contacts-search-scroll">
                <div>
                    {contacts}
                </div>
            </utils.JScrollPane>
        </div>;
    }
});

module.exports = {
    ContactsListItem,
    ContactCard,
    Avatar,
    ContactPickerWidget,
    ContactVerified,
    ContactPresence,
    AvatarImage
};
