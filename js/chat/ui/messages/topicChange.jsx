var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
import MegaRenderMixin from './../../../stores/mixins.js';
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

class TopicChange extends ConversationMessageMixin {
    render() {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var contact = self.getContact();
        var timestampInt = self.getTimestamp();
        var timestamp = self.getTimestampAsString();



        var datetime = <div className="message date-time simpletip"
                            data-simpletip={time2date(timestampInt)}>{timestamp}</div>;

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

        var formattedTopic = this._formattedTopic;
        if (this._oldTopic !== topic) {
            this._oldTopic = topic;
            formattedTopic = megaChat.plugins.emoticonsFilter.processHtmlMessage(htmlentities(topic));
            this._formattedTopic = formattedTopic;
        }

        var text = __(l[9081])
            .replace(
                "%s",
                '<strong className="dark-grey-txt">"' +
                    formattedTopic +
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
};

export {
    TopicChange
};
