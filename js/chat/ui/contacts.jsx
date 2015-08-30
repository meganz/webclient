var React = require("react");
var MegaRenderMixin = require("../../stores/mixins.js").MegaRenderMixin;
var RenderDebugger = require("../../stores/mixins.js").RenderDebugger;


var ContactsListItem = React.createClass({
    mixins: [MegaRenderMixin, RenderDebugger],
    render: function() {
        var classString = "nw-conversations-item";

        var contact = this.props.contact;

        var contactJid = this.props.megaChat.getJidFromNodeId(contact.u);
        var id = 'whatever'; //'contact_' + htmlentities(contact.u);

        classString += " " + this.props.megaChat.xmppPresenceToCssClass(
            contact.presence
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

        var $avatar = $(useravatar.contact(contact));

        var classes = this.props.classesName ? this.props.classesName : 'nw-contact-avatar ' + contact.u;

        var displayedAvatar;

        if($avatar.find("img").length > 0) {
            displayedAvatar = <img src={$("img", $avatar).attr("src")} style={this.props.imgStyles}/>;
        } else {
            displayedAvatar = <span>{$(useravatar.contact(contact)).text()}</span>;

            var tempClasses = $avatar.attr('class');
            var colorNum = tempClasses.split("color")[1].split(" ")[0];
            classes += " color" + colorNum;
        }

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
