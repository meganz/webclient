var React = require("react");
var ReactDOM = require("react-dom");
import {MegaRenderMixin} from "../../stores/mixins.js";
import utils from './../../ui/utils.jsx';

class SharedFileItem extends MegaRenderMixin {
    render() {
        var self = this;
        var message = this.props.message;
        var contact = Message.getContactForMessage(message);
        var name = M.getNameByHandle(contact.u);
        var timestamp = time2date(message.delay);
        var node = this.props.node;
        var icon = this.props.icon;

        return (<div className={"chat-shared-block " + (self.props.isLoading ? "is-loading" : "")}
                     key={message.messageId + "_" + node.h}
                     onClick={function(e) {
                         if (self.props.isPreviewable) {
                             slideshow(node.ch, undefined, true);
                         }
                         else {
                             M.addDownload([node]);
                         }
                    }}
                    onDoubleClick={function(e) {
                        M.addDownload([node]);
                    }}>
                    <div className={"icon-or-thumb " + (thumbnails[node.h] ? "thumb" : "")}>
                        <div className={"medium-file-icon " + icon}></div>
                        <div className="img-wrapper" id={this.props.imgId}>
                            <img alt="" src={thumbnails[node.h] || ""} />
                        </div>
                    </div>
                    <div className="chat-shared-info">
                        <span className="txt">{node.name}</span>
                        <span className="txt small">{name}</span>
                        <span className="txt small grey">{timestamp}</span>
                    </div>
                </div>);
    }
};

class SharedFilesAccordionPanel extends MegaRenderMixin {
    @utils.SoonFcWrap(350)
    eventuallyRenderThumbnails() {
        if (this.allShownNodes) {
            var pending = [];
            var nodes = this.allShownNodes;
            var handles = Object.keys(nodes);
            var render = function(h) {
                if (thumbnails[h]) {
                    var batch = nodes[h];

                    for (var i = batch.length; i--;) {
                        var n = batch[i];
                        var img = document.getElementById('sharedFiles!' + n.ch);

                        if (img && (img = img.querySelector('img'))) {
                            img.src = thumbnails[h];

                            if ((img = Object(img.parentNode).parentNode)) {
                                img.classList.add('thumb');
                            }
                        }
                    }

                    return true;
                }
            };

            for (var i = handles.length; i--;) {
                var h = handles[i];

                if (!render(h)) {
                    pending.push(nodes[h][0])
                }
            }
            this.allShownNodes = {};

            if (pending.length) {
                fm_thumbnails('standalone', pending, render);
            }
        }
    }
    componentWillMount() {
        this.allShownNodes = {};
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        delete this.allShownNodes;
    }
    componentDidUpdate() {
        this.eventuallyRenderThumbnails();
    }
    render() {
        var self = this;
        var room = self.props.chatRoom;
        var mb = room.messagesBuff;

        var contents = null;

        var currentPage = mb.sharedFilesPage;
        var perPage = 12;
        var startPos = currentPage * perPage;
        var endPos = startPos + perPage;
        var totalPages = mb.haveMoreSharedFiles ? "..." : Math.ceil(mb.sharedFiles.length / perPage);
        totalPages = mb.sharedFiles.length && !totalPages ? 1 : totalPages;
        var haveMore = mb.haveMoreSharedFiles || currentPage + 1 < totalPages;
        var files = [];

        if (!mb.haveMoreSharedFiles && currentPage === totalPages) {
            // when initially loading, we may go 1 page after the last..so go to previous/last page.
            currentPage = mb.sharedFilesPage = Math.max(totalPages - 1, 0);
        }

        if (this.props.expanded) {
            var prev = null;
            var next = null;

            if (currentPage > 0) {
                prev = <div className="chat-share-nav button prev" onClick={function() {
                    mb.sharedFilesPage--;
                    self.safeForceUpdate();
                }}></div>;
            }

            if (haveMore) {
                next = <div className="chat-share-nav button next" onClick={function() {
                    if (self.isLoadingMore) {
                        return;
                    }
                    if (mb.sharedFiles.length < endPos + perPage) {
                        self.isLoadingMore = true;
                        mb.retrieveSharedFilesHistory(perPage)
                            .always(function () {
                                self.isLoadingMore = false;
                                mb.sharedFilesPage++;
                                if (!mb.haveMoreSharedFiles && mb.sharedFilesPage > totalPages) {
                                    // someone clicked too fast.
                                    mb.sharedFilesPage = totalPages - 1;
                                }
                                Soon(function() {
                                    self.safeForceUpdate();
                                });
                            });
                    }
                    else {
                        // already in memory
                        mb.sharedFilesPage++;
                    }
                    Soon(function() {
                        self.safeForceUpdate();
                    });
                }}></div>;
            }

            if (!mb.sharedFilesLoadedOnce) {
                mb.retrieveSharedFilesHistory(perPage)
                    .always(function() {
                        Soon(function() {
                            self.safeForceUpdate();
                        });
                    })
            }
            var sharedNodesContainer = null;
            if (mb.isRetrievingSharedFiles && !self.isLoadingMore) {
                sharedNodesContainer =  <div className="chat-dropdown empty-txt loading-initial">
                    <div className="loading-spinner light small"><div className="main-loader"></div></div>
                </div>;
            }
            else if (mb.sharedFiles.length === 0) {
                sharedNodesContainer =  <div className="chat-dropdown empty-txt">
                    {l[19985]}
                </div>;
            }
            else {
                var keys = mb.sharedFiles.keys().reverse();
                for (var i = startPos; i < endPos; i++) {
                    var message = mb.sharedFiles[keys[i]];
                    if (!message) {
                        continue;
                    }
                    var nodes = message.getAttachmentMeta();
                    nodes.forEach(function(node) {
                        var icon = fileIcon(node);
                        var mediaType = is_video(node);
                        var isImage = is_image2(node);
                        var isVideo = mediaType > 0;
                        var showThumbnail = String(node.fa).indexOf(':0*') > 0;
                        var isPreviewable = isImage || isVideo;
                        var imgId = "sharedFiles!" + node.ch;

                        files.push(
                            <SharedFileItem message={message} key={node.h + "_" + message.messageId}
                                            isLoading={self.isLoadingMore}
                                            node={node}
                                            icon={icon}
                                            imgId={imgId}
                                            showThumbnail={showThumbnail}
                                            isPreviewable={isPreviewable}
                                            chatRoom={room}/>
                        );

                        if (showThumbnail) {
                            if (self.allShownNodes[node.h]) {
                                if (self.allShownNodes[node.h].indexOf(node) < 0) {
                                    self.allShownNodes[node.h].push(node);
                                }
                            }
                            else {
                                self.allShownNodes[node.h] = [node];
                            }
                        }
                    });
                }

                sharedNodesContainer =  <div>
                    {files}
                </div>;
            }
            contents = <div className="chat-dropdown content have-animation">
                {sharedNodesContainer}
                {self.isLoadingMore ?
                    <div className="loading-spinner light small"><div className="main-loader"></div></div> :
                    null
                }
                {files.length > 0 ?
                    <div className="chat-share-nav body">
                        {prev}
                        {next}
                        <div className="chat-share-nav pages">
                            {(l[19988] ? l[19988] : "Page %1")
                                .replace("%1", currentPage + 1)}
                        </div>
                    </div> : null}
            </div>;
        }

        return <div className="chat-dropdown container">
            <div className={"chat-dropdown header " + (this.props.expanded ? "expanded" : "")} onClick={function(e) {
                self.props.onToggle(e);
            }}>
                <span>{this.props.title}</span>
                <i className="tiny-icon right-arrow"></i>
            </div>
            <div className={"chat-shared-files-container" + (self.isLoadingMore ? "is-loading" : "")}>
                {contents}
            </div>
        </div>;
    }
};


export {
    SharedFileItem,
    SharedFilesAccordionPanel
};
