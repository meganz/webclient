var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

var TopicChange = React.createClass({
    mixins: [ConversationMessageMixin],

    render: function () {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time"
                                       title={time2date(timestampInt)}>{timestamp}</div>;

        var displayName;
        if (contact) {
            displayName = generateAvatarMeta(contact.u).fullName;
        }
        else {
            displayName = contact;
        }

        var messages = [];


        var avatar = <ContactsUI.Avatar contact={contact}
                                        className="message avatar-wrapper small-rounded-avatar"/>;

        var topic = message.meta.topic;

        var text = __(l[9081])
            .replace(
                "%s",
                '<strong className="dark-grey-txt">"' +
                    megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(topic)) +
                '"</strong>'
            );


        messages.push(
            <div className="message body" data-id={"id" + message.messageId} key={message.messageId}>
                {avatar}

                <div className="message content-area small-info-txt">
                    <ContactsUI.ContactButton contact={contact} className="message" label={displayName} />
                    {datetime}

                    <div className="message text-block" dangerouslySetInnerHTML={{__html:text}}></div>
                </div>
            </div>
        )


        return <div>{messages}</div>;
    }
});

module.exports = {
    TopicChange
};
