/**
 * Rich text formatting filter (e.g. markdown-like rich text formatting when parsing text messages)
 *
 * @param megaChat
 * @returns {RtfFilter}
 * @constructor
 */

var RtfFilter = function(megaChat) {
    'use strict';

    this.regexps = {

        // Strikethrough with bold and italic
        // -------------------------------------------------------------------------------------------------------------
        // ~*_strike/bold/italic_*~
        '(^|\\s)~\\*_([^_\\n]{1,})_\\*~': ['gi', '$1<s><strong><em class="rtf-italic">$2</em></strong></s>', '$1 $2'],
        // *_~strike/bold/italic~_*
        '(^|\\s)\\*_~([^~\\n]{1,})~_\\*': ['gi', '$1<strong><em class="rtf-italic"><s>$2</s></em></strong>', '$1 $2'],
        // *~_strike/bold/italic_~*
        '(^|\\s)\\*~_([^~\\n]{1,})_~\\*': ['gi', '$1<strong><em class="rtf-italic"><s>$2</s></em></strong>', '$1 $2'],
        // ~_*strike/bold/italic*_~
        '(^|\\s)~_\\*([^\\*\\n]{1,})\\*_~': ['gi', '$1<s><em class="rtf-italic"><strong>$2</strong></em></s>', '$1 $2'],
        // _*~strike/bold/italic~*_
        '(^|\\s)_\\*~([^~\\n]{1,})~\\*_': ['gi', '$1<em class="rtf-italic"><strong><s>$2</s></strong></em>', '$1 $2'],
        // _~*strike/bold/italic*~_
        '(^|\\s)_~\\*([^~\\n]{1,})\\*~_': ['gi', '$1<em class="rtf-italic"><strong><s>$2</s></strong></em>', '$1 $2'],

        // Bold and italic
        // -------------------------------------------------------------------------------------------------------------
        // ***bold/italic***
        '(^|\\s)\\*{3}([^\\*\\n]{1,})\\*{3}': ['gi', '$1<strong><em class="rtf-italic">$2</em></strong>', '$1 $2'],
        // _*bold/italic*_
        '(^|\\s)_\\*([^\\*\\n]+)\\*_': ['gi', '$1<em class="rtf-italic"><strong>$2</strong></em>', '$1 $2'],
        // *_bold/italic_*
        '(^|\\s)\\*_([^_\\n]+)_\\*': ['gi', '$1<strong><em class="rtf-italic">$2</em></strong>', '$1 $2'],

        // Strikethrough and bold
        // -------------------------------------------------------------------------------------------------------------
        // ~*strike/bold*~ / ~**strike/bold**~
        '(^|\\s)~\\*{1,2}([^\\*\\n]{1,})\\*{1,2}~': ['gi', '$1<s><strong>$2</strong></s>', '$1 $2'],
        // *~strike/bold~* / **~strike/bold~**
        '(^|\\s)\\*{1,2}~([^~\\n]{1,})~\\*{1,2}': ['gi', '$1<strong><s>$2</s></strong>', '$1 $2'],

        // Strikethrough and italic
        // -------------------------------------------------------------------------------------------------------------
        // ~_strike/italic_~ / ~__strike/italic__~
        '(^|\\s)~_{1,2}([^_\\n]{1,})_{1,2}~': ['gi', '$1<s><em class="rtf-italic">$2</em></s>', '$1 $2'],
        // _~strike/italic~_ / __~strike/italic~__
        '(^|\\s)_{1,2}~([^~\\n]{1,})~_{1,2}': ['gi', '$1<em class="rtf-italic"><s>$2</s></em>', '$1 $2'],

        // Bold
        // -------------------------------------------------------------------------------------------------------------
        // *bold* / **bold**
        '(^|\\s)\\*{1,2}([^\\*\\n]{1,})\\*{1,2}': ['gi', '$1<strong>$2</strong>', '$1 $2'],

        // Italic
        // -------------------------------------------------------------------------------------------------------------
        // _italic_ / __italic__
        '(^|\\s)_{1,2}([^_\\n]{1,})_{1,2}': ['gi', '$1<em class="rtf-italic">$2</em>', '$1 $2'],

        // Strikethrough
        // -------------------------------------------------------------------------------------------------------------
        // ~strike~ / ~~strike~~
        '(^|\\s)~{1,2}([^~\\n]{1,})~{1,2}': ['gi', '$1<s>$2</s>', '$1 $2'],

        // Quote
        // -------------------------------------------------------------------------------------------------------------
        // > This is a quote
        '^&gt;(.*)': ['gm', '<pre class="rtf-quote">$1</pre>', '$1'], // support > style.

        // Headings
        // -------------------------------------------------------------------------------------------------------------
        // # Heading 1
        '^#\\s+(.*)': ['gm', '<h1 class="chat-message-heading">$1</h1>', '$1'],
        // ## Heading 2
        '^##\\s+(.*)': ['gm', '<h2 class="chat-message-heading">$1</h2>', '$1'],
        // ### Heading 3
        '^###\\s+(.*)': ['gm', '<h3 class="chat-message-heading">$1</h3>', '$1'],
        // #### Heading 4
        '^####\\s+(.*)': ['gm', '<h4 class="chat-message-heading">$1</h4>', '$1'],
        // ##### Heading 5
        '^#####\\s+(.*)': ['gm', '<h5 class="chat-message-heading">$1</h5>', '$1'],

        // Horizontal rule separator
        // -------------------------------------------------------------------------------------------------------------
        // ***
        '^\\s*\\*{3,}\\s*$': ['gm', '<hr>', ''],

        // Lists
        // -------------------------------------------------------------------------------------------------------------
        // - List item / + List item
        '^\\s*[\\*\\-\\+]\\s+(.*?)$': ['gm', '<li>$1</li>', '$1']
    };

    megaChat.on('onBeforeRenderMessage', (e, eventData) => this.processMessage(e, eventData));

    return this;
};

RtfFilter.prototype.parse = function(message, strip) {
    'use strict';
    return Object.entries(this.regexps)
        .reduce((message, [pattern, [flags, format, replacement]]) =>
            message.replace(new RegExp(pattern, flags), strip ? replacement : format), message
        );
};

RtfFilter.prototype.processStripRtfFromMessage = function(message) {
    'use strict';

    if (!message) {
        return '';
    }

    return this.parse(message, true);
};

RtfFilter.prototype.processMessage = function(e, eventData) {
    'use strict';

    const { message } = eventData;

    if (message.decrypted === false || !message.textContents || message.processedBy.rtfFltr) {
        return;
    }

    message.processedBy = message.processedBy || {};

    // Use the HTML version of the message if such exists (the HTML version should be generated by hooks/filters on the
    // client side.
    let messageContents = message.messageHtml || message.textContents;
    if (!messageContents) {
        return; // Ignore, maybe it's a system message (or composing/paused composing notification)
    }

    messageContents = messageContents ? $.trim(messageContents) : '';
    messageContents = messageContents.replace(/<br\/>/gi, '\n');
    messageContents = this.parse(messageContents);
    messageContents = messageContents
        .replace(/\n/gi, '<br/>')
        .replace(/<\/li>\s*<br\/>\s*<li>/gi, '</li><li>');
    message.messageHtml = messageContents;
    message.processedBy.rtfFltr = true;

    return messageContents;
};
