var React = require("react");
var ConversationMessageMixin = require('./mixin.jsx').ConversationMessageMixin;

class MetaRichprevConfirmation extends ConversationMessageMixin {
    doAllow() {
        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;

        delete message.meta.requiresConfirmation;
        RichpreviewsFilter.confirmationDoConfirm();
        megaChat.plugins.richpreviewsFilter.processMessage({}, message);
        message.trackDataChange();
    }
    doNotNow() {
        var message = this.props.message;
        delete message.meta.requiresConfirmation;
        RichpreviewsFilter.confirmationDoNotNow();
        message.trackDataChange();
    }
    doNever() {
        var message = this.props.message;
        msgDialog(
            'confirmation',
            l[870],
            l[18687],
            '',
            function(e) {
                if (e) {
                    delete message.meta.requiresConfirmation;
                    RichpreviewsFilter.confirmationDoNever();
                    message.trackDataChange();
                }
                else {
                    // do nothing.
                }
            });

    }
    render() {
        var self = this;

        var notNowButton = null;
        var neverButton = null;


        if (RichpreviewsFilter.confirmationCount >= 2) {
            neverButton = <div className="default-white-button small-text small right red"
                onClick={function() {
                    self.doNever();
                }}>
                <span>{l[1051]}</span>
            </div>;
        }

        notNowButton = <div className="default-white-button small-text small grey-txt right"
            onClick={function() {
                self.doNotNow();
            }}>
            <span>{l[18682]}</span>
        </div>;





        return <div className="message richpreview previews-container">
            <div className="message richpreview container confirmation">
                <div className="message richpreview body">
                    <div className="message richpreview img-wrapper">
                        <div className="message richpreview preview confirmation-icon"></div>
                    </div>
                    <div className="message richpreview inner-wrapper">
                        <div className="message richpreview data-title">
                            <span className="message richpreview title">{l[18679]}</span>
                        </div>
                        <div className="message richpreview desc">
                            {l[18680]}
                        </div>
                        <div className="buttons-block">
                            <div className="default-grey-button small-text small right" onClick={function() {
                                self.doAllow();
                            }}>
                                <span>{l[18681]}</span>
                            </div>
                            {notNowButton}
                            {neverButton}
                        </div>
                    </div>
                </div>
                <div className="clear"></div>
            </div>
        </div>;
    }
}

export {
    MetaRichprevConfirmation
};
