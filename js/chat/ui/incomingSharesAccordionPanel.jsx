var React = require("react");
var ReactDOM = require("react-dom");
import MegaRenderMixin from "../../stores/mixins.js";

class SharedFolderItem extends MegaRenderMixin(React.Component) {
    render() {
        var self = this;
        var node = this.props.node;

        return (<div className={"chat-shared-block incoming " + (self.props.isLoading ? "is-loading" : "")}
                     key={node.h}
                     onClick={function(e) {
                         M.openFolder(node.h);
                    }}
                    onDoubleClick={function(e) {
                        M.openFolder(node.h);
                    }}>
                    <div className={"medium-file-icon inbound-share"}></div>
                    <div className="chat-shared-info">
                        <span className="txt">{node.name}</span>
                        <span className="txt small">{fm_contains(node.tf, node.td)}</span>
                    </div>
                </div>);
    }
};

class IncomingSharesAccordionPanel extends MegaRenderMixin(React.Component) {
    componentWillMount() {
        this.hadLoaded = false;
    }
    getContactHandle() {
        var self = this;
        var room = self.props.chatRoom;
        var contactHandle = room.getParticipantsExceptMe()[0];
        if (!contactHandle || room.type !== "private") {
            return {};
        }
        return contactHandle;
    }
    render() {
        var self = this;
        var room = self.props.chatRoom;
        var contactHandle = self.getContactHandle();
        var contents = null;
        var MAX_ITEMS = 10;


        if (this.props.expanded) {
            if (!this.hadLoaded) {
                this.hadLoaded = true;

                // load shares
                self.isLoadingMore = true;
                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise())
                    .always(function() {
                        self.isLoadingMore = false;
                        Soon(function() {
                            if (self.isComponentEventuallyVisible()) {
                                self.safeForceUpdate();
                            }
                        }, 5000);
                    }.bind(this));
            }
            var incomingSharesContainer = null;
            var sharedFolders = M.c[contactHandle] && Object.keys(M.c[contactHandle]) || [];

            if (!self.isLoadingMore && (!sharedFolders || sharedFolders.length === 0)) {
                incomingSharesContainer =  <div className="chat-dropdown empty-txt">
                    {l[19986]}
                </div>;
            }
            else {
                var haveMore = sharedFolders.length > MAX_ITEMS;
                // do sort
                var defSortFn = M.getSortByNameFn();
                sharedFolders.sort(function(a, b) {
                    var nodeA = M.d[a];
                    var nodeB = M.d[b];
                    return defSortFn(nodeA, nodeB, -1);
                });

                var renderNodes = [];
                for (var i = 0; i < Math.min(sharedFolders.length, MAX_ITEMS); i++) {
                    var nodeHandle = sharedFolders[i];
                    var node = M.d[nodeHandle];
                    if (!node) {
                        continue;
                    }
                    renderNodes.push(
                        <SharedFolderItem key={node.h} isLoading={self.isLoadingMore}
                                        node={node}
                                        chatRoom={room} s/>
                    );
                }

                incomingSharesContainer =  <div>
                    {renderNodes}
                    {haveMore ?
                    <div className="chat-share-nav body">
                        <div className="chat-share-nav show-all" onClick={function(e) {
                               M.openFolder(contactHandle);
                        }}>
                                    <span className="transfer-filetype-icon inbound-share">
                                        <span className="transfer-filetype-icon inbound-share"></span>
                                    </span>
                            <span className="txt">{__(l[19797]) ? __(l[19797]) : "Show All"}</span>
                        </div>
                    </div> : null}
                </div>;
            }
            contents = <div className="chat-dropdown content have-animation">
                {incomingSharesContainer}
                {self.isLoadingMore ?
                    <div className="chat-dropdown empty-txt">
                        <div className="loading-spinner light small"><div className="main-loader"></div></div>
                    </div> :
                    null
                }
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
    SharedFolderItem,
    IncomingSharesAccordionPanel
};
