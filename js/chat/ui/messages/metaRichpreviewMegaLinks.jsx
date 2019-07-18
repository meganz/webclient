import React from 'react';
import utils from './../../../ui/utils.jsx';
import { ConversationMessageMixin } from './mixin.jsx';
import { MetaRichpreviewLoading } from './metaRichPreviewLoading.jsx';

var MetaRichpreviewMegaLinks = React.createClass({
    mixins: [ConversationMessageMixin],
    render: function () {
        var self = this;
        var cssClasses = "message body";

        var message = this.props.message;
        var megaChat = this.props.message.chatRoom.megaChat;
        var chatRoom = this.props.message.chatRoom;
        var previewContainer;

        var output = [];

        var megaLinks = message.megaLinks && message.megaLinks ? message.megaLinks : [];
        for (var i = 0; i < megaLinks.length; i++) {
            var megaLinkInfo = megaLinks[i];
            if (megaLinkInfo.failed) {
                continue;
            }

            if (megaLinkInfo.hadLoaded() === false) {
                if (megaLinkInfo.startedLoading() === false) {
                    megaLinkInfo.getInfo()
                        .always(function() {
                            Soon(function() {
                                message.trackDataChange();
                                self.safeForceUpdate();
                            });
                        });
                }

                previewContainer = <MetaRichpreviewLoading message={message} isLoading={megaLinkInfo.hadLoaded()} />;
            } else {
                var desc;

                var is_icon = megaLinkInfo.is_dir ?
                    true : !(megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url);

                if(megaLinkInfo.is_chatlink) {
                    desc = l[8876] + ": " + megaLinkInfo.info['ncm'];
                }
                else if (!megaLinkInfo.is_dir) {
                    desc = bytesToSize(megaLinkInfo.info.size);
                }
                else {
                    desc = <span>
                        {fm_contains(megaLinkInfo.info.s[1], megaLinkInfo.info.s[2] - 1)}<br/>
                        {bytesToSize(megaLinkInfo.info.size)}
                    </span>;
                }

                previewContainer = <div className={"message richpreview body " + (
                    (is_icon ? "have-icon" : "no-icon") + " " +
                    (megaLinkInfo.is_chatlink ? "is-chat" : "")
                )}>
                    {megaLinkInfo.havePreview() && megaLinkInfo.info.preview_url ?
                        <div className="message richpreview img-wrapper">
                            <div className="message richpreview preview"
                                 style={{"backgroundImage": 'url(' + megaLinkInfo.info.preview_url + ')'}}></div>
                        </div> :
                        <div className="message richpreview img-wrapper">
                            {megaLinkInfo.is_chatlink ?
                                <i className="huge-icon conversations"></i>
                                :
                                <div className={"message richpreview icon block-view-file-type " + (
                                    megaLinkInfo.is_dir ?
                                        "folder" :
                                        fileIcon(megaLinkInfo.info)
                                )}></div>
                            }
                        </div>
                        }
                    <div className="message richpreview inner-wrapper">
                        <div className="message richpreview data-title">
                            <span className="message richpreview title">
                                <utils.EmojiFormattedContent>
                                    {megaLinkInfo.info.name || megaLinkInfo.info.topic || ""}
                                </utils.EmojiFormattedContent>
                            </span>
                        </div>
                        <div className="message richpreview desc">{desc}</div>
                        <div className="message richpreview url-container">
                            <span className="message richpreview url-favicon">
                                <img src="https://mega.nz/favicon.ico?v=3&c=1" width={16} height={16}
                                     onError={(e) => {
                                         e.target.parentNode.removeChild(e.target);
                                     }}
                                     alt=""
                                />
                            </span>
                            <span className="message richpreview url">
                            {ellipsis(megaLinkInfo.getLink(), 'end', 40)}
                            </span>
                        </div>
                    </div>
                </div>;
            }

            output.push(
                <div key={megaLinkInfo.node_key + "_" + output.length} className={"message richpreview container " +
                        (megaLinkInfo.havePreview() ? "have-preview" : "no-preview") + " " +
                        (megaLinkInfo.d ? "have-description" : "no-description") + " " +
                        (!megaLinkInfo.hadLoaded() ? "is-loading" : "done-loading")
                    }
                            onClick={function (url) {
                                if (megaLinkInfo.hadLoaded()) {
                                    window.open(url, '_blank', 'noopener');
                                }
                            }.bind(this, megaLinkInfo.getLink())}>
                    {previewContainer}
                    <div className="clear"></div>
                </div>
            );
        }
        return <div className="message richpreview previews-container">{output}</div>;
    }
});

module.exports = {
    MetaRichpreviewMegaLinks
};
