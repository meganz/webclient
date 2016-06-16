var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

var AlterParticipantsConversationMessage = React.createClass({
    mixins: [ConversationMessageMixin],

    render: function () {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.chatRoom.megaChat;
        var chatRoom = this.props.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time"
                                       title={time2date(timestampInt)}>{timestamp}</div>;

        var displayName;
        if (contact) {
            displayName = contact.u === u_handle ? __(l[8885]) : generateAvatarMeta(contact.u).fullName;
        }
        else {
            displayName = contact;
        }

        var messages = [];


        //if (message.meta.excluded.length === 0) {
        //    debugger;
        //}
        //console.error(message.meta);

        message.meta.included.forEach(function(h) {
            var otherContact = M.u[h] ? M.u[h] : {
                'u': h,
                'h': h,
                'c': 0,
            };

            var avatar = <ContactsUI.Avatar contact={otherContact} className="message small-rounded-avatar"/>;
            var otherDisplayName = otherContact.u === u_handle ? __("Me") : generateAvatarMeta(otherContact.u).fullName;

            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={h}>
                    {avatar}

                    <div className="message content-area small-info-txt">
                        <div className="message user-card-name">{otherDisplayName}</div>
                        {datetime}

                        <div className="message text-block">
                            Joined the group chat by invitation from <strong className="dark-grey-txt">{displayName}</strong>
                        </div>
                    </div>
                </div>
            )
        });

        message.meta.excluded.forEach(function(h) {
            var otherContact = M.u[h] ? M.u[h] : {
                'u': h,
                'h': h,
                'c': 0,
            };

            var avatar = <ContactsUI.Avatar contact={otherContact} className="message small-rounded-avatar"/>;
            var otherDisplayName = otherContact.u === u_handle ? __("Me") : generateAvatarMeta(otherContact.u).fullName;

            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={h}>
                    {avatar}

                    <div className="message content-area small-info-txt">
                        <div className="message user-card-name">{otherDisplayName}</div>
                        {datetime}

                        <div className="message text-block">
                            Was removed from the group chat by <strong className="dark-grey-txt">{displayName}</strong>
                        </div>
                    </div>
                </div>
            )
        });

        return <div>{messages}</div>;
    }
});

module.exports = {
    AlterParticipantsConversationMessage
};
