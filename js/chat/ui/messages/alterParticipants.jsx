var React = require("react");
var ReactDOM = require("react-dom");
var utils = require('./../../../ui/utils.jsx');
var MegaRenderMixin = require('./../../../stores/mixins.js').MegaRenderMixin;
var ContactsUI = require('./../contacts.jsx');
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;
var getMessageString = require('./utils.jsx').getMessageString;

var AlterParticipantsConversationMessage = React.createClass({
    mixins: [ConversationMessageMixin],

    _ensureNameIsLoaded: function(h) {
        var self = this;
        var contact = M.u[h] ? M.u[h] : {
            'u': h,
            'h': h,
            'c': 0,
        };
        var displayName = generateAvatarMeta(contact.u).fullName;


        if (!displayName) {
            M.u.addChangeListener(function () {
                displayName = generateAvatarMeta(contact.u).fullName;
                if (displayName) {
                    self.safeForceUpdate();

                    return 0xDEAD;
                }
            });
        }
    },
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

        message.meta.included.forEach(function(h) {
            var otherContact = M.u[h] ? M.u[h] : {
                'u': h,
                'h': h,
                'c': 0,
            };

            var avatar = <ContactsUI.Avatar contact={otherContact}
                                            className="message avatar-wrapper small-rounded-avatar"/>;
            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

            var text = __(l[8907]).replace(
                "%s",
                '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>'
            );

            self._ensureNameIsLoaded(otherContact.u);
            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={h}>
                    {avatar}

                    <div className="message content-area small-info-txt">
                        <ContactsUI.ContactButton contact={otherContact} className="message" label={otherDisplayName} />
                        {datetime}

                        <div className="message text-block" dangerouslySetInnerHTML={{__html:text}}></div>
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

            var avatar = <ContactsUI.Avatar contact={otherContact}
                                            className="message avatar-wrapper small-rounded-avatar"/>;
            var otherDisplayName = generateAvatarMeta(otherContact.u).fullName;

            self._ensureNameIsLoaded(otherContact.u);

            var text;
            if (otherContact.u === contact.u) {
                text = __(l[8908]);
            }
            else {
                text = __(l[8906]).replace(
                    "%s",
                    '<strong className="dark-grey-txt">' + htmlentities(displayName) + '</strong>'
                );
            }

            messages.push(
                <div className="message body" data-id={"id" + message.messageId} key={h}>
                    {avatar}

                    <div className="message content-area small-info-txt">
                        <ContactsUI.ContactButton contact={otherContact} className="message" label={otherDisplayName} />
                        {datetime}

                        <div className="message text-block" dangerouslySetInnerHTML={{__html:text}}></div>
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
