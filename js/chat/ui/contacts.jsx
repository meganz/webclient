var React = require("react");
var MegaRenderMixin = require("../../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../../stores/mixins.js").RenderDebugger;


var ContactsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

        var contactJid = this.props.megaChat.getJidFromNodeId(contact.u);
        var id = 'contact_' + htmlentities(contact.u);

        classString += " " + this.props.megaChat.xmppPresenceToCssClass(
            this.props.megaChat.karere.getPresence(contactJid)
        );

        return (
            <div>
                <div className={classString} id={id} onClick={this.props.onContactClicked}>
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

        var avatarMeta = generateAvatarMeta(contact.u);

        var displayedAvatar = avatarMeta.shortName;

        if(avatarMeta.avatarUrl) {
            displayedAvatar = <img src={avatarMeta.avatarUrl} />;
        }

        var classes = "nw-contact-avatar todo-green-tick";

        classes += " color" + avatarMeta.color;

        return (
            <div className={classes}>
                <div className="not-supported-yet-nw-verified-icon"></div>
                {displayedAvatar}
            </div>
        )
    }
});

module.exports = {
    ContactsListItem,
    Avatar
};