/**
 * This is an example of how to use the onSendMessage to alter messages before they are actually sent.
 *
 * @param megaChat
 * @returns {CapslockFilterDemo}
 * @constructor
 */
var CapslockFilterDemo = function(megaChat) {
    var self = this;


    /**
     * This event is thrown before the message sent to the XMPP
     */
    megaChat.bind("onSendMessage", function(e, eventData) {
        self.processMessage(e, eventData);
    });

    /**
     * In case that the message is going to be queued
     *
     * PS: Not sure if this is going to be helpful for the encryption, but in this example I had to change the message
     * content BEFORE it got queued AND rendered, just a cosmetics for the demo :)
     */
    megaChat.bind("onQueueMessage", function(e, eventData) {
        self.processMessage(e, eventData);
    });

    return this;
};

CapslockFilterDemo.prototype.processMessage = function(e, eventData) {
    var self = this;

    if(eventData.messageHtml) {
        eventData.messageHtml = eventData.messageHtml.toUpperCase();
    }
    if(eventData.message) {
        eventData.message = eventData.message.toUpperCase();
    }
};