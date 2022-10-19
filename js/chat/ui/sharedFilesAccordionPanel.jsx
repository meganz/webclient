var React = require("react");
import {ContactAwareComponent, MegaRenderMixin} from "../mixins";
import utils, { Emoji } from './../../ui/utils.jsx';

class SharedFileItem extends ContactAwareComponent {
    render() {
        var self = this;
        var message = this.props.message;
        var contact = Message.getContactForMessage(message);
        var name = M.getNameByHandle(contact.u);
        var timestamp = time2date(message.delay);
        var node = this.props.node;
        var icon = this.props.icon;

        return (
            <div
                className={"chat-shared-block " + (self.props.isLoading ? "is-loading" : "")}
                key={message.messageId + "_" + node.h}
                onClick={() => this.props.isPreviewable ? M.viewMediaFile(node) : M.addDownload([node])}
                onDoubleClick={() => M.addDownload([node])}>
                <div className={`icon-or-thumb ${thumbnails.has(node.fa) ? "thumb" : ""}`}>
                    <div className={"medium-file-icon " + icon}></div>
                    <div className="img-wrapper" id={this.props.imgId}>
                        <img alt="" src={thumbnails.get(node.fa) || ""}/>
                    </div>
                </div>
                <div className="chat-shared-info">
                    <span className="txt">{node.name}</span>
                    <span className="txt small">
                        <Emoji>{name}</Emoji>
                    </span>
                    <span className="txt small grey">{timestamp}</span>
                </div>
            </div>
        );
    }
}

class SharedFilesAccordionPanel extends MegaRenderMixin {
    @utils.SoonFcWrap(350)
    eventuallyRenderThumbnails() {
        if (this.allShownNodes) {
            var pending = [];
            const nodes = new Map(this.allShownNodes);
            const render = (n) => {
                if (thumbnails.has(n.fa)) {
                    const src = thumbnails.get(n.fa);
                    const batch = [...nodes.get(n.fa)];

                    for (var i = batch.length; i--;) {
                        const n = batch[i];
                        let img = document.getElementById(`sharedFiles!${n.ch}`);

                        if (img && (img = img.querySelector('img'))) {
                            img.src = src;

                            if ((img = Object(img.parentNode).parentNode)) {
                                img.classList.add('thumb');
                            }
                        }
                    }

                    return true;
                }
            };

            for (const [, [n]] of nodes) {
                if (!render(n)) {
                    pending.push(n);
                }
            }

            this.allShownNodes.clear();

            if (pending.length) {
                fm_thumbnails('standalone', pending, render);
            }
        }
    }
    componentWillMount() {
        this.allShownNodes = new MapSet();
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
                mb.haveMoreSharedFiles = false;
                sharedNodesContainer = <div className="chat-dropdown empty-txt">
                    {l[19985]}
                </div>;
            }
            else {
                var keys = clone(mb.sharedFiles.keys()).reverse();
                for (var i = startPos; i < endPos; i++) {
                    var message = mb.sharedFiles[keys[i]];
                    if (!message) {
                        continue;
                    }
                    var nodes = message.getAttachmentMeta();
                    nodes.forEach(function(node) {
                        var imgId = "sharedFiles!" + node.ch;
                        const {icon, showThumbnail, isPreviewable} = M.getMediaProperties(node);

                        files.push(
                            <SharedFileItem
                                message={message}
                                key={`${node.h}_${message.messageId}`}
                                isLoading={self.isLoadingMore}
                                node={node}
                                icon={icon}
                                imgId={imgId}
                                showThumbnail={showThumbnail}
                                isPreviewable={isPreviewable}
                                chatRoom={room}
                                contact={Message.getContactForMessage(message)}
                            />
                        );

                        if (showThumbnail) {
                            self.allShownNodes.set(node.fa, node);
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
                <i className="sprite-fm-mono icon-arrow-down" />
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
