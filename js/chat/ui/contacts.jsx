var React = require("react");
var MegaRenderMixin = require("../../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../../stores/mixins.js").RenderDebugger;


var ContactsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

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


var Avatar = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var contact = this.props.contact;

        var $avatar = $(useravatar.contact(contact));

        var classes = (this.props.className ? this.props.className : 'small-rounded-avatar') + ' ' + contact.u;

        var displayedAvatar;


        var verifiedElement = null;

        if (!this.props.hideVerifiedBadge) {
            var verifyState = u_authring.Ed25519[contact.h] || {};
            verifiedElement = (
                verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON ?
                    <div className="user-card-verified"></div> : undefined
            );
        }

        if($avatar.find("img").length > 0) {
            displayedAvatar = <div className={classes}>
                {verifiedElement}
                <img src={$("img", $avatar).attr("src")} style={this.props.imgStyles}/>
            </div>;
        } else {
            var tempClasses = $avatar.attr('class');
            var colorNum = tempClasses.split("color")[1].split(" ")[0];
            classes += " color" + colorNum;

            displayedAvatar = <div className={classes}>{verifiedElement}<div>{$(useravatar.contact(contact)).text()}</div></div>;


        }

        return displayedAvatar;
    }
});

var ContactCard = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var self = this;

        var contact = this.props.contact;
        var pres = (this.props.megaChat ? this.props.megaChat : megaChat).xmppPresenceToCssClass(contact.presence);
        var avatarMeta = generateAvatarMeta(contact.u);

        var contextMenu;
        if (!this.props.noContextMenu) {
            var ButtonsUI = require('./../../ui/buttons.jsx');
            var DropdownsUI = require('./../../ui/dropdowns.jsx');

            var moreDropdowns = [];

            if(window.location.hash != '#fm/chat/' + contact.u) {
                moreDropdowns.push(
                    <DropdownsUI.DropdownItem
                        key={"start_conv_" + contact.u}
                        icon="conversations" label={__("Open/start Chat")} onClick={() => {
                                    window.location = '#fm/chat/' + contact.u;
                                }} />
                );
            }
            contextMenu = <ButtonsUI.Button
                className="default-white-button tiny-button"
                icon="tiny-icon grey-down-arrow">
                <DropdownsUI.Dropdown className="contact-card-dropdown">
                    <DropdownsUI.DropdownItem icon="human-profile" label={__("View Profile")} onClick={() => {
                                    window.location = '#fm/' + contact.u;
                                }} />
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
                <div className={"user-card-presence " + pres}></div>
                <Avatar contact={contact} className="small-rounded-avatar" />

                {contextMenu}

                <div className="user-card-data">
                    <div className="user-card-name small">{avatarMeta.fullName}</div>
                    <div className="user-card-email small">{contact.m}</div>
                </div>
            </div>;
    }
});

module.exports = {
    ContactsListItem,
    ContactCard,
    Avatar
};
