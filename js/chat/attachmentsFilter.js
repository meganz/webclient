/**
 * AttachmentsFilter
 *
 * Responsible for the rendering and handling of attachments
 *
 * @param megaChat
 * @returns {UrlFilter}
 * @constructor
 */
var AttachmentsFilter = function(megaChat) {
    var self = this;

    megaChat.bind("onReceiveMessage", function(e, eventData) {
        self.processMessage(e, eventData);
    });

    megaChat.bind("onBeforeRenderMessage", function(e, eventData) {
        self.processBeforeRenderMessage(e, eventData);
    });

    return this;
};

AttachmentsFilter.prototype.processMessage = function(e, eventData) {
    var self = this;


    if(!eventData.meta || !eventData.meta.attachments) {
        return; // ignore, this is not an attachments message
    }

    eventData.message = "Is sharing a document with you:"; // XX: use ll[]

};

AttachmentsFilter.prototype.processBeforeRenderMessage = function(e, eventData) {
    var self = this;

    if(!eventData.message.meta || !eventData.message.meta.attachments) {
        return; // ignore, this is not an attachments message
    }

    var $m = eventData.$message;
    var m = eventData.message;

    $('.fm-chat-message', $m).append(
        "<strong>[attachments]</strong>"
    );

    // depending on the type and count of the attachments, we have different ways to render them:
    // 1. one file
    // 2. one folder
    // 3. multiple files/folders

};