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


        var verifyState = u_authring.Ed25519[contact.h] || {};
        var verifiedElement = (
            verifyState.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON ?
                <div className="user-card-verified"></div> : ""
        );

        if($avatar.find("img").length > 0) {
            displayedAvatar = <div className={classes}>
                {verifiedElement}
                <img src={$("img", $avatar).attr("src")} style={this.props.imgStyles}/>
            </div>;
        } else {
            var tempClasses = $avatar.attr('class');
            var colorNum = tempClasses.split("color")[1].split(" ")[0];
            classes += " color" + colorNum;

            displayedAvatar = <div className={classes}>
                {verifiedElement}
                {$(useravatar.contact(contact)).text()}
            </div>;


        }

        return displayedAvatar;
    }
});

module.exports = {
    ContactsListItem,
    Avatar
};
