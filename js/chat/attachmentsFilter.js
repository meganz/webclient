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

    // depending on the type and count of the attachments, we have different ways to render them:
    // 1. one file
    // 2. one folder
    // 3. multiple files/folders

    var nodeIds = Object.keys(eventData.message.meta.attachments);
    var attachments = eventData.message.meta.attachments; // alias

    // case 1 & 2

    if(nodeIds.length == 1) {
        var attachment = attachments[nodeIds[0]]; //alias

        var $element = $(
            '<div class="attachments-container">'+
                '<div class="block-view-file-type"></div>' +
                '<div class="fm-chat-filename">' +
                    'FileName.doc' +
                '</div>' +
                '<div class="fm-chat-filesize">' +
                    '750 kb' +
                '</div>' +
                '<div class="fm-chat-button-pad">' +
                    '<div class="fm-chat-file-button save-button">Save...</div>' +
                '</div>' +
            '</div>'
        );
        $element.attr('data-message-id', eventData.message.id)
        $('.fm-chat-filename', $element).text(attachment.name);

        if(attachment.t == 0) {
            // case 1 - one file
            $('.fm-chat-size', $element).text(bytesToSize(attachment.s));
            $('.block-view-file-type', $element).addClass('generic');
            // TBD

        } else if(attachment.t == 1) {
            // case 2 - one folder
            $('.block-view-file-type', $element).addClass('folder');
            $('.fm-chat-filesize', $element).remove();
        } else { // unknown type?
            assert(false, "unknown attachment type");
        }
        $element.attr('data-node-id', nodeIds[0]);

        var $saveButton = $('.save-button', $element);
        $saveButton.text('Save...'); //todo: use ll[]

        $('.fm-chat-message', $m).append(
            $element
        );
    } else {
        // case 3 - multiple files/folders
        // TODO: TBD
    }




};