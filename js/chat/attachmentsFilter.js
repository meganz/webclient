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

AttachmentsFilter.prototype.processMessage = function(e, eventObject) {
    var self = this;


    if(!eventObject.getMeta() || !eventObject.getMeta().attachments) {
        return; // ignore, this is not an attachments message
    }

    eventObject.setContents("Is sharing a document with you:"); // XX: use ll[]

};

AttachmentsFilter.prototype.processBeforeRenderMessage = function(e, eventData) {
    var self = this;

    var meta = eventData.message.getMeta();

    if(!meta || !meta.attachments) {
        return; // ignore, this is not an attachments message
    }

    var $m = eventData.$message;
    var m = eventData.message;

    // depending on the type and count of the attachments, we have different ways to render them:
    // 1. one file/folder
    // 2. more then 1 file/folder

    var nodeIds = Object.keys(meta.attachments);
    var attachments = meta.attachments; // alias

    var i = 0;

    var $container = $('<div class="attachments-container"></div>');


    $.each(attachments, function(k, attachment) {
        if(attachment.canceled) {
            return; // continue;
        }

        var $element = $(
            '<div class="nw-chat-sharing-body">' +
                '<div class="nw-chat-icons-area">' +
                    '<span class="block-view-file-type text"></span>' +
                '</div>' +
                '<div class="nw-chat-sharing-filename">' +
                    'FileName.doc' +
                '</div>' +
                '<div class="nw-chat-sharing-filesize">' +
                    '750 kb' +
                '</div>' +
                '<div class="nw-chat-button red active save-button">Save...</div>' +
                '<div class="nw-chat-button cancel-button">Cancel</div>' +
                '<div class="clear"></div>' +
            '</div>'
        );

        if(i == 0) {
            $element.addClass("main-body");
        }

        $('.nw-chat-sharing-filename', $element).text(attachment.name);

        if(attachment.t == 0) {
            // is file
            $('.block-view-file-type', $element).addClass(
                fileicon({'name': attachment.name})
            );

            $('.nw-chat-sharing-filesize', $element).text(bytesToSize(attachment.s));
        } else if(attachment.t == 1) {
            // is folder
            $('.block-view-file-type', $element).addClass('folder');
            $('.nw-chat-sharing-filesize', $element).remove();
        } else { // unknown type?
            assert(false, "unknown attachment type");
        }
        $element.attr('data-node-id', k);

        $container.append(
            $element
        );

        i++;
    });

    $container.attr('data-message-id', m.getMessageId());

    $('.fm-chat-message', $m)
        .addClass('chat-sharing')
        .append($container);

    if(Object.keys(attachments).length > 1) {
        $('.fm-chat-message', $m)
            .addClass('multiple-sharing');

        var $more = $('<span class="nw-chat-expand-arrow"></span>');
        $('.chat-message-txt', $m).append($more);
        $more.on('click', function() {
            var $m = $(this).parents('.fm-chat-messages-pad');
            $('.fm-chat-message', $m).toggleClass('expanded');

            // trigger refresh of the UI, because height was changed.
            eventData.room.refreshUI(false);
        });
    }
};