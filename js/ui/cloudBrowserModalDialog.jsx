import { Component } from 'react';
import utils from "./utils.jsx";
import MegaRenderMixin from "../stores/mixins.js";
import ModalDialogsUI from './modalDialogs.jsx';
import Tooltips from "./tooltips.jsx";

function BrowserCol({ id, className = '', label, sortBy, onClick }) {
    let classes = `${id} ${className}`;

    if (sortBy[0] === id) {
        const ordClass = sortBy[1] == "desc" ? "asc" : "desc";
        classes = `${classes} ${ordClass}`;
    }

    return (
        <th onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick(id);
        }}>
            <span className={`arrow ${classes}`}>{label}</span>
        </th>
    );
};

class BrowserEntries extends MegaRenderMixin(Component) {
    static defaultProps = {
        'hideable': true,
        'requiresUpdateOnResize': true
    };
    constructor(props) {
        super(props);

        this.state = {
            'highlighted': this.props.initialHighlighted || [],
            'selected': this.props.initialSelected || []
        }
    }
    componentWillMount() {
        this.lastCursor = false;
        this.lastCharKeyPressed = false;
        this.lastCharKeyIndex = -1;
    }
    componentDidUpdate() {
        var self = this;

        if (!self.lastCursor || self.lastCursor !== self.state.cursor) {
            self.lastCursor = self.state.cursor;
            var tr = self.findDOMNode().querySelector('.node_' + self.lastCursor);
            var $jsp = $(tr).parents('.jspScrollable').data('jsp');
            if (tr && $jsp) {
                $jsp.scrollToElement(tr, undefined, false);
            }
        }
    }
    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }
    getNodesInIndexRange(firstIndex, lastIndex) {
        var self = this;
        return self.props.entries
            .filter((node, index) => {
                return index >= firstIndex && index <= lastIndex && (
                    !self.props.folderSelectNotAllowed ? true : (node.t === 0)
                );
            })
            .map((node) => { return node.h });
    }
    getIndexByNodeId(nodeId, notFoundValue) {
        var self = this;
        var foundIndex = typeof(notFoundValue) === 'undefined' ? -1 : notFoundValue;
        self.props.entries.find(function (r, index) {
            if (r.h === nodeId) {
                foundIndex = index;
                return true;
            }
        });
        return foundIndex;
    }
    setSelectedAndHighlighted(highlighted, cursor) {
        var self = this;

        // highlighted requires to be sorted!
        var currentViewOrderMap = {};
        self.props.entries.forEach(function (v, k) {
            currentViewOrderMap[v.h] = k;
        });

        highlighted.sort(function (a, b) {
            var aa = currentViewOrderMap[a];
            var bb = currentViewOrderMap[b];
            if (aa < bb) {
                return -1;
            }
            if (aa > bb) {
                return 1;
            }

            return 0;
        });


        self.setState({'highlighted': highlighted, 'cursor': cursor});
        self.props.onHighlighted(highlighted);

        var selected = highlighted.filter(function(nodeId) {
            var node = M.getNodeByHandle(nodeId);
            return !self.props.folderSelectNotAllowed || (node && node.t === 0);
        });


        self.setState({'selected': selected});
        self.props.onSelected(selected);
    }
    _doSelect(selectionIncludeShift, currentIndex, targetIndex) {
        var self = this;
        if (targetIndex >= self.props.entries.length) {
            if (selectionIncludeShift) {
                // shift + select down after the last item in the list was selected? do nothing.
                return;
            }
            else {
                targetIndex = self.props.entries.length - 1;
            }
        }

        if (targetIndex < 0 || !self.props.entries[targetIndex]) {
            targetIndex = Math.min(0, currentIndex);
        }

        if (
            self.props.entries.length === 0 ||
            !self.props.entries[targetIndex]
        ) {
            return;
        }

        var highlighted;

        if (selectionIncludeShift) {
            var firstIndex;
            var lastIndex;
            if (targetIndex < currentIndex) {
                // up
                if (self.state.highlighted && self.state.highlighted.length > 0) {
                    // more items already selected..append to selection by altering last index
                    if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
                        // target is already selected, shrink selection
                        firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
                        lastIndex = self.getIndexByNodeId(
                            self.state.highlighted[self.state.highlighted.length - 2],
                            self.state.highlighted.length - 2
                        );
                    }
                    else {
                        firstIndex = targetIndex;
                        lastIndex = self.getIndexByNodeId(
                            self.state.highlighted[self.state.highlighted.length - 1],
                            -1
                        );
                    }
                }
                else {
                    firstIndex = targetIndex;
                    lastIndex = currentIndex;
                }
            }
            else {
                // down
                if (self.state.highlighted && self.state.highlighted.length > 0) {
                    // more items are already selected, alter current selection only
                    if (self.state.highlighted.indexOf(self.props.entries[targetIndex].h) > -1) {
                        // target is already selected, shrink selection
                        firstIndex = self.getIndexByNodeId(self.state.highlighted[1], 1);
                        lastIndex = self.getIndexByNodeId(
                            self.state.highlighted[self.state.highlighted.length - 1],
                            self.state.highlighted.length - 1
                        );
                    }
                    else {
                        // more items already selected..append to selection by altering first index
                        firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
                        lastIndex = targetIndex;

                    }
                }
                else {
                    firstIndex = currentIndex;
                    lastIndex = targetIndex;

                }

            }

            highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);

            self.setSelectedAndHighlighted(highlighted, self.props.entries[targetIndex].h);
        }
        else {
            highlighted = [self.props.entries[targetIndex].h];
            self.setSelectedAndHighlighted(highlighted, highlighted[0]);
        }
    }
    bindEvents() {
        var self = this;

        var KEY_A = 65;
        var KEY_UP = 38;
        var KEY_DOWN = 40;

        var KEY_LEFT = 37;
        var KEY_RIGHT = 39;

        var KEY_ENTER = 13;
        var KEY_BACKSPACE = 8;


        $(document.body).rebind('keydown.cloudBrowserModalDialog', function(e) {
            var charTyped = false;
            var keyCode = e.which || e.keyCode;
            var selectionIncludeShift = e.shiftKey;
            if ($('input:focus, textarea:focus').length > 0) {
                return;
            }

            var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

            if (keyCode === KEY_A && (e.ctrlKey || e.metaKey)) {
                // select all
                var newCursor = false;

                var highlighted = [];
                if (self.props.entries && self.props.entries.length > 0) {
                    var firstIndex = 0;
                    var lastIndex = self.props.entries.length - 1;
                    newCursor = self.props.entries[lastIndex].h;
                    highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);
                }

                self.setSelectedAndHighlighted(highlighted, newCursor);
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.metaKey && keyCode === KEY_UP || keyCode === KEY_BACKSPACE) {
                if (viewMode === "0") {
                    // back
                    var currentFolder = M.getNode(self.props.currentlyViewedEntry);
                    if (currentFolder.p) {
                        self.expandFolder(currentFolder.p);
                    }
                }
            }
            else if (!e.metaKey &&
                (
                    viewMode === "0" && (keyCode === KEY_UP || keyCode === KEY_DOWN) ||
                    viewMode === "1" && (keyCode === KEY_LEFT || keyCode === KEY_RIGHT)
                )
            ) {
                // up/down
                var dir = keyCode === (viewMode === "1" ? KEY_LEFT : KEY_UP) ? -1 : 1;

                var lastHighlighted = self.state.cursor || false;
                if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
                    lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
                }

                var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);


                var targetIndex = currentIndex + dir;

                while(
                        selectionIncludeShift &&
                        self.props.folderSelectNotAllowed &&
                        self.props.entries &&
                        self.props.entries[targetIndex] &&
                        self.props.entries[targetIndex].t === 1
                    ) {
                    targetIndex = targetIndex + dir;
                    if (targetIndex < 0) {
                        return;
                    }
                }

                self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
            }
            else if (viewMode === "1" && (keyCode === KEY_UP || keyCode === KEY_DOWN)) {
                var containerWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible').outerWidth();
                var itemWidth = $('.add-from-cloud .fm-dialog-scroll .content:visible .data-block-view:first')
                    .outerWidth();
                var itemsPerRow = Math.floor(containerWidth/itemWidth);


                var dir = keyCode === KEY_UP ? -1 : 1;

                var lastHighlighted = self.state.cursor || false;
                if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
                    lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
                }

                var currentIndex = self.getIndexByNodeId(lastHighlighted, -1);


                var targetIndex = currentIndex + dir * itemsPerRow;
                if (self.props.entries.length - 1 < targetIndex || targetIndex < 0) {
                    // out of range.
                    return;
                }

                self._doSelect(selectionIncludeShift, currentIndex, targetIndex);
            }
            else if (
                (keyCode >= 48 && keyCode <= 57) ||
                (keyCode >= 65 && keyCode <= 123) ||
                keyCode > 255
            ) {
                charTyped = String.fromCharCode(keyCode).toLowerCase();

                var foundMatchingNodes = self.props.entries.filter(function(node, index) {
                    return node.name && node.name.substr(0, 1).toLowerCase() === charTyped;
                });

                if (self.lastCharKeyPressed === charTyped) {
                    self.lastCharKeyIndex++;
                }

                self.lastCharKeyPressed = charTyped;

                if (foundMatchingNodes.length > 0) {
                    if (!foundMatchingNodes[self.lastCharKeyIndex]) {
                        // start from the first entry
                        self.lastCharKeyIndex = 0;
                    }
                    var foundNode = foundMatchingNodes[self.lastCharKeyIndex];

                    self.setSelectedAndHighlighted([foundNode.h], foundNode.h);
                }
            }
            else if (keyCode === KEY_ENTER || (e.metaKey && keyCode === KEY_DOWN)) {
                var selectedNodes = [];

                if (self.props.folderSelectNotAllowed === true) {
                    // remove all folders from highlighted
                    self.state.highlighted.forEach(function (h) {
                        var node = self.props.entries.find((entry) => {
                            return entry.h === h;
                        });

                        if (node && node.t === 0) {
                            selectedNodes.push(h);
                        }
                    });
                    // if only folders were selected and no files..do open the cursor OR first folder selected
                    if (selectedNodes.length === 0) {
                        var cursorNode = self.state.cursor && M.getNodeByHandle(self.state.cursor);
                        if (cursorNode.t === 1) {
                            self.expandFolder(cursorNode.h);
                            return;
                        }
                        else if (self.state.highlighted.length > 0) {
                            // open/expand the first node, we know its a folder already.
                            var firstNodeId = self.state.highlighted[0];
                            self.expandFolder(firstNodeId);
                            return;
                        }
                        else {
                            // nothing selected, do nothing.
                            return;
                        }
                    }
                }
                else {
                    selectedNodes = self.state.highlighted;
                }

                self.setState({'selected': selectedNodes});
                self.props.onSelected(selectedNodes);
                self.props.onAttachClicked(selectedNodes);
            }
            else {
                // do nothing.
            }

            // reset the quick finding feature vars if this was not a "quick find", e.g. charTyped was left empty.
            if (!charTyped) {
                self.lastCharKeyPressed = false;
                self.lastCharKeyIndex = -1;
            }
            // enter
        });
    }
    unbindEvents() {
        $(document.body).off('keydown.cloudBrowserModalDialog');
    }
    onEntryClick(e, node) {
        var self = this;

        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1;

        e.stopPropagation();
        e.preventDefault();

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            self.setSelectedAndHighlighted([node.h], node.h);
        }
        else if (e.shiftKey) {
            // click + shift
            var targetIndex = self.getIndexByNodeId(node.h, 0);
            var firstIndex = 0;
            if (self.state.highlighted && self.state.highlighted.length > 0) {
                firstIndex = self.getIndexByNodeId(self.state.highlighted[0], 0);
            }
            var lastIndex = 0;
            if (self.state.highlighted && self.state.highlighted.length > 0) {
                lastIndex = self.getIndexByNodeId(
                    self.state.highlighted[self.state.highlighted.length - 1],
                    0
                );
            }

            if (targetIndex < firstIndex) {
                firstIndex = targetIndex;
            }
            if (targetIndex > lastIndex) {
                lastIndex = targetIndex;
            }
            var highlighted = self.getNodesInIndexRange(firstIndex, lastIndex);

            self.setSelectedAndHighlighted(highlighted, node.h);
        }
        else if (e.ctrlKey || e.metaKey) {
            // ctrl or cmd/meta, e.g. add to selection
            if (!self.state.highlighted || self.state.highlighted.indexOf(node.h) === -1) {
                var highlighted = clone(self.state.highlighted || []);
                if (self.props.folderSelectNotAllowed) {
                    if (node.t === 1 && highlighted.length > 0) {
                        return;
                    }
                    else if (
                        highlighted.filter(function(nodeId) {
                            var node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1
                        }).length > 0) {
                        // contains folders in selection
                        highlighted = [];
                    }
                }
                highlighted.push(node.h);
                self.setSelectedAndHighlighted(highlighted, node.h);
            }
            else if (self.state.highlighted && self.state.highlighted.indexOf(node.h) !== -1) {
                var highlighted = clone(self.state.highlighted || []);
                if (self.props.folderSelectNotAllowed) {
                    if (node.t === 1) {
                        return;
                    }
                    else if (
                        highlighted.filter(function(nodeId) {
                            var node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1
                        }).length > 0) {
                        // contains folders in selection
                        highlighted = [];
                    }
                }
                array.remove(highlighted, node.h);
                self.setSelectedAndHighlighted(highlighted, highlighted.length == 0 ? false : highlighted[0]);
            }
        }
    }
    expandFolder(nodeId) {
        var self = this;
        var node = M.getNodeByHandle(nodeId);
        if (node) {
            // reset quick search selection indexes
            self.lastCharKeyPressed = false;
            self.lastCharKeyIndex = -1;

            // expand folder
            self.setState({'selected': [], 'highlighted': [], 'cursor': false});
            self.props.onSelected([]);
            self.props.onHighlighted([]);
            self.props.onExpand(node);
            self.forceUpdate();
        }
    }
    onEntryDoubleClick(e, node) {
        var self = this;

        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1;

        e.stopPropagation();
        e.preventDefault();

        if (node.t) {
            // expand folder
            self.setState({'selected': [], 'highlighted': [], 'cursor': false});
            self.props.onSelected([]);
            self.props.onHighlighted([]);
            self.props.onExpand(node);
            self.forceUpdate();
        }
        else {
            self.onEntryClick(e, node);
            self.props.onSelected(self.state.selected);
            self.props.onAttachClicked(self.state.selected);
        }
    }
    componentSpecificIsComponentEventuallyVisible() {
        return true;
    }
    render() {
        var self = this;

        var items = [];
        var viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

        var imagesThatRequireLoading = [];
        self.props.entries.forEach(function(node) {
            if (node.t !== 0 && node.t !== 1) {
                // continue
                return;
            }

            if (!node.name) {
                // continue
                return;
            }

            const isFolder = node.t;
            var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;
            const fileIconType = fileIcon(node);
            // megadrop or shared folder
            const isSharedFolder = (fileIconType === 'puf-folder' || fileIconType === 'folder-shared');
            let sharedFolderClass = '';

            if (isSharedFolder) {
                sharedFolderClass = fileIconType;
            }

            var tooltipElement = null;

                var icon = <span
                className={"transfer-filetype-icon " + (isFolder ? " folder " : "") + '' + fileIconType}> </span>;

            var image = null;
            var src = null;
            if ((is_image(node) || is_video(node)) && node.fa) {
                src = thumbnails[node.h];
                if (!src) {
                    node.imgId = "chat_" + node.h;
                    imagesThatRequireLoading.push(node);

                    if (!node.seen) {
                        node.seen = 1; // HACK
                    }
                    src = window.noThumbURI || '';
                }
                icon = <Tooltips.Tooltip withArrow={true}>
                    <Tooltips.Handler className={"transfer-filetype-icon " + fileIcon(node)}> </Tooltips.Handler>
                    <Tooltips.Contents className={"img-preview"}>
                        <div className="dropdown img-wrapper img-block" id={node.h}>
                            <img alt=""
                                 className={"thumbnail-placeholder " + node.h}
                                 src={src}
                                 width="156"
                                 height="156"
                            />
                        </div>
                    </Tooltips.Contents>
                </Tooltips.Tooltip>;

                if (src) {
                    image = <img alt="" src={src} />;
                }
                else {
                    image = <img alt="" />;
                }
            }

            const share = M.getNodeShare(node);

            let hasPublicLink = null;
            let classLinked = null;
            if (share) {
                classLinked = 'linked';
                hasPublicLink = (
                    <span className="data-item-icon public-link-icon"></span>
                );
            }

            if (viewMode === "0") {
                items.push(
                    <tr className={
                            "node_" + node.h + " " + (isFolder ? " folder" :"") + (isHighlighted ? " ui-selected" : "")
                        }
                        onClick={(e) => {
                            self.onEntryClick(e, node);
                        }}
                        onDoubleClick={(e) => {
                            self.onEntryDoubleClick(e, node);
                        }}
                        key={node.h}
                    >
                        <td>
                            <span className={"grid-status-icon" + (node.fav ? " star" : "")}></span>
                        </td>
                        <td>
                            {icon}
                            <span className={"tranfer-filetype-txt"}>{node.name}</span>
                        </td>
                        <td>{!isFolder ? bytesToSize(node.s) : ""}</td>
                        <td className={classLinked}>{time2date(node.ts)} {hasPublicLink}</td>
                    </tr>
                );
            } else {
                var playtime = MediaAttribute(node).data.playtime;
                if (playtime) {
                    playtime = secondsToTimeShort(playtime);
                }

                var colorLabelClasses = "";
                if (node.lbl) {
                    var colourLabel = M.getLabelClassFromId(node.lbl);
                    colorLabelClasses +=  ' colour-label';
                    colorLabelClasses += ' ' + colourLabel;
                }

                items.push(
                    <div
                        className={
                            "data-block-view node_" + node.h + " " + (isFolder ? " folder" :" file") +
                            (isHighlighted ? " ui-selected" : "") +
                            (share ? " linked" : "") +
                            colorLabelClasses
                        }
                        onClick={(e) => {
                            self.onEntryClick(e, node);
                        }}
                        onDoubleClick={(e) => {
                            self.onEntryDoubleClick(e, node);
                        }}
                        id={"chat_" + node.h}
                        key={"block_" + node.h}
                        title={node.name}
                    >
                        <div className={
                            (src ? "data-block-bg thumb" : "data-block-bg") +
                            (is_video(node) ? " video" : "")
                        }>
                            <div className="data-block-indicators">
                                <div className={"file-status-icon indicator" + (node.fav ? " star" : "")}></div>
                                <div className="data-item-icon indicator" />
                            </div>
                            <div className={"block-view-file-type " +
                                (isFolder ? " folder " :" file " + fileIcon(node)) + sharedFolderClass
                            }>
                                {image}
                            </div>
                            {
                                is_video(node) ? (
                                    <div className="video-thumb-details">
                                        <i className="small-icon small-play-icon"></i>
                                        <span>{
                                            playtime ? playtime : "00:00"
                                        }</span>
                                    </div>
                                ) : null
                            }
                        </div>
                        <div className="file-block-title">{node.name}</div>
                    </div>
                );
            }
        });
        if (imagesThatRequireLoading.length > 0) {
            fm_thumbnails('standalone', imagesThatRequireLoading);
        }

        if (items.length > 0) {
            if (viewMode === "0") {
                return (
                    <utils.JScrollPane className="fm-dialog-scroll grid"
                                       selected={this.state.selected}
                                       highlighted={this.state.highlighted}
                                       entries={this.props.entries}
                                       ref={(jsp) => {
                                            self.jsp = jsp;
                                       }}
                    >
                        <table className="grid-table fm-dialog-table">
                            <tbody>
                                {items}
                            </tbody>
                        </table>
                    </utils.JScrollPane>
                );
            } else {
                return (
                    <utils.JScrollPane className="fm-dialog-scroll blocks"
                                           selected={this.state.selected}
                                           highlighted={this.state.highlighted}
                                           entries={this.props.entries}
                                           ref={(jsp) => {
                                                self.jsp = jsp;
                                           }}
                        >
                       <div className="content">
                           {items}
                           <div className="clear"></div>
                       </div>
                    </utils.JScrollPane>
                );
            }
        } else if (self.props.isLoading) {
            return (
                <div className="dialog-empty-block dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <div className="dialog-empty-icon"></div>
                        <div className="dialog-empty-header">
                            {__(l[5533])}
                        </div>
                    </div>
                </div>
            );
        }
        else if (!self.props.entries.length && self.props.currentlyViewedEntry === 'search') {
            return (
                <div className="dialog-empty-block dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <div className="fm-empty-search-bg"></div>
                        <div className="dialog-empty-header">
                            {l[978]}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="dialog-empty-block dialog-fm folder">
                {
                    self.props.currentlyViewedEntry === 'shares' ? (
                        <div className="dialog-empty-pad">
                            <div className="fm-empty-incoming-bg"></div>
                            <div className="dialog-empty-header">
                                {l[6871]}
                            </div>
                        </div>
                    ) : (
                        <div className="dialog-empty-pad">
                            <div className="fm-empty-folder-bg"></div>
                            <div className="dialog-empty-header">
                                {self.props.currentlyViewedEntry === M.RootID ? l[1343] : l[782]}
                            </div>
                        </div>
                    )
                }
            </div>
        );
    }
};


class CloudBrowserDialog extends MegaRenderMixin(Component) {
    static defaultProps = {
        'selectLabel': __(l[8023]),
        'openLabel': __(l[1710]),
        'cancelLabel': __(l[82]),
        'hideable': true,
        className: ''
    };
    constructor(props) {
        super(props);
        this.state = {
            'sortBy': [
                'name', 'asc'
            ],
            'selected': [],
            'highlighted': [],
            'currentlyViewedEntry': M.RootID,
            'selectedTab': 'clouddrive',
            'searchValue': ''
        };
        this.onAttachClicked = this.onAttachClicked.bind(this);
        this.onClearSearchIconClick = this.onClearSearchIconClick.bind(this);
        this.onHighlighted = this.onHighlighted.bind(this);
        this.onPopupDidMount = this.onPopupDidMount.bind(this);
        this.onSearchChange = this.onSearchChange.bind(this);
        this.onSearchIconClick = this.onSearchIconClick.bind(this);
        this.onSelected = this.onSelected.bind(this);
        this.onTabButtonClick = this.onTabButtonClick.bind(this);
        this.onViewButtonClick = this.onViewButtonClick.bind(this);
        this.toggleSortBy = this.toggleSortBy.bind(this);
    }
    toggleSortBy(colId) {
        if (this.state.sortBy[0] === colId) {
            this.setState({'sortBy': [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"]});
        }
        else {
            this.setState({'sortBy': [colId, "asc"]});
        }
    }
    onViewButtonClick(e, node) {
        var self = this;
        var $this = $(e.target);

        if ($this.hasClass("active")) {
            return false;
        }

        if ($this.hasClass("block-view")) {
            localStorage.dialogViewMode = "1";
        } else {
            localStorage.dialogViewMode = "0";
        }

        self.setState({
            entries: self.getEntries(),
            selected: self.state.selected,
            highlighted: self.state.highlighted,
        });

        $this.parent().find('.active').removeClass("active");
        $this.addClass("active");
    }
    onSearchIconClick(e, node) {
        var $parentBlock = $(e.target).closest(".fm-header-buttons");

        if ($parentBlock.hasClass("active-search")) {
            $parentBlock.removeClass("active-search");
        } else {
            $parentBlock.addClass("active-search");
            $('input', $parentBlock).trigger("focus");
        }
    }
    onClearSearchIconClick() {
        var self = this;


        self.setState({
            'searchValue': '',
            'currentlyViewedEntry': M.RootID
        })
    }
    onTabButtonClick(e, selectedTab) {
        var $this = $(e.target);

        $this.parent().find('.active').removeClass("active");
        $this.addClass("active");

        var newState = {
            'selectedTab': selectedTab,
            'searchValue': '',
        };
        if (selectedTab === 'shares') {
            newState['currentlyViewedEntry'] = 'shares';
        }
        else {
            newState['currentlyViewedEntry'] = M.RootID;
        }
        newState['isLoading'] = false;
        this.setState(newState);
        this.onSelected([]);
        this.onHighlighted([]);
    }
    onSearchChange(e) {
        var searchValue = e.target.value;
        var newState = {
            'selectedTab': 'search',
            'searchValue': searchValue
        };
        if (searchValue && searchValue.length >= 3) {
            newState['currentlyViewedEntry'] = 'search';
        }
        else if (this.state.currentlyViewedEntry === 'search') {
            if (!searchValue || searchValue.length < 3) {
                newState['currentlyViewedEntry'] = M.RootID;
            }
        }

        this.setState(newState);
        this.onSelected([]);
        this.onHighlighted([]);
    }
    resizeBreadcrumbs() {
        var $breadcrumbsWrapper = $('.fm-breadcrumbs-wrapper.add-from-cloud', this.findDOMNode());
        var $breadcrumbs = $breadcrumbsWrapper.find('.fm-breadcrumbs-block');

        setTimeout(function() {
            var wrapperWidth = $breadcrumbsWrapper.outerWidth();
            var $el = $breadcrumbs.find('.right-arrow-bg');
            var i = 0;
            var j = 0;
            $el.removeClass('short-foldername ultra-short-foldername invisible');

            $breadcrumbsWrapper.removeClass('long-path overflowed-path');
            if ($breadcrumbs.outerWidth() > wrapperWidth) {
                $breadcrumbsWrapper.addClass('long-path');
            }


            while ($breadcrumbs.outerWidth() > wrapperWidth) {
                if (i < $el.length - 1) {
                    $($el[i]).addClass('short-foldername');
                    i++;
                } else if (j < $el.length - 1) {
                    $($el[j]).addClass('ultra-short-foldername');
                    j++;
                } else if (!$($el[j]).hasClass('short-foldername')) {
                    $($el[j]).addClass('short-foldername');
                } else {
                    $($el[j]).addClass('ultra-short-foldername');
                    $breadcrumbsWrapper.addClass('overflowed-path');
                    break;
                }
            }
        }, 0);
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevState.currentlyViewedEntry !== this.state.currentlyViewedEntry) {
            var self = this;

            this.resizeBreadcrumbs();
            var handle = this.state.currentlyViewedEntry;
            if (handle === 'shares') {
                self.setState({'isLoading': true});

                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise())
                    .done(function() {
                        self.setState({
                            'isLoading': false,
                            'entries': null
                        });
                    });
                return;
            }
            if (!M.d[handle] || (M.d[handle].t && !M.c[handle])) {
                self.setState({'isLoading': true});
                dbfetch.get(handle)
                    .always(function() {
                        self.setState({
                            'isLoading': false,
                            'entries': null
                        });
                    });
                return;
            }

            var $jspElem = $(self.findDOMNode()).find('.jspScrollable');
            if ($jspElem) {
                var $jsp = $jspElem.data('jsp');
                if ($jsp) {
                    Soon(function() {
                        // seems like there is a bug in JSP, if I call this too early the scroll won't move, but the area
                        // would scroll to 0, 0
                        $jsp.scrollTo(0, 0, false);
                    });
                }

            }

            this.setState({entries: null});
        }

    }
    getEntries() {
        var self = this;
        var order = self.state.sortBy[1] === "asc" ? 1 : -1;
        var entries = [];

        if (
            self.state.currentlyViewedEntry === "search" &&
            self.state.searchValue &&
            self.state.searchValue.length >= 3
        ) {
            M.getFilterBy(M.getFilterBySearchFn(self.state.searchValue))
                .forEach(function(n) {
                    // skip contacts and invalid data.
                    if (!n.h || n.h.length === 11) {
                        return;
                    }
                    if (self.props.customFilterFn && !self.props.customFilterFn(n)) {
                        return;
                    }
                    entries.push(n);
                })
        }
        else {
            Object.keys(M.c[self.state.currentlyViewedEntry] || {}).forEach((h) => {
                if (M.d[h]) {
                    if (self.props.customFilterFn) {
                        if (self.props.customFilterFn(M.d[h])) {
                            entries.push(M.d[h]);
                        }
                    }
                    else {
                        entries.push(M.d[h]);
                    }
                }
            });
        }

        var sortFunc;

        if (self.state.sortBy[0] === "name") {
            sortFunc = M.getSortByNameFn();
        }
        else if(self.state.sortBy[0] === "size") {
            sortFunc = M.getSortBySizeFn();
        }
        else if(self.state.sortBy[0] === "ts") {
            sortFunc = M.getSortByDateTimeFn();
            // invert
            order = order === 1 ? -1 : 1;
        }
        else /*if(self.state.sortBy[0] === "grid-header-star")*/ {
            sortFunc = M.sortByFavFn(order);
        }

        // always return first the folders and then the files
        var folders = [];

        for (var i = entries.length; i--;) {
            if (entries[i] && entries[i].t) {
                folders.unshift(entries[i]);
                entries.splice(i, 1);
            }
        }

        folders.sort(function(a, b) {
            return sortFunc(a, b, order);
        });

        entries.sort(function(a, b) {
            return sortFunc(a, b, order);
        });

        return folders.concat(entries);
    }
    onSelected(nodes) {
        this.setState({'selected': nodes});
        this.props.onSelected(nodes);
    }
    onHighlighted(nodes) {
        this.setState({'highlighted': nodes});

        if (this.props.onHighlighted) {
            this.props.onHighlighted(nodes);
        }
    }
    onPopupDidMount(elem) {
        this.domNode = elem;
    }
    onAttachClicked() {
        this.props.onAttachClicked();
    }
    render() {
        var self = this;

        const entries = self.getEntries();
        const viewMode = localStorage.dialogViewMode ? localStorage.dialogViewMode : "0";

        const classes = `add-from-cloud ${self.props.className}`;

        var folderIsHighlighted = false;

        var breadcrumb = [];

        M.getPath(self.state.currentlyViewedEntry)
            .forEach(function(breadcrumbNodeId, k) {
                // skip [share owner handle] when returned by M.getPath.
                if (M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].h && M.d[breadcrumbNodeId].h.length === 11) {
                    return;
                }

                var breadcrumbClasses = "";
                if (breadcrumbNodeId === M.RootID) {
                    breadcrumbClasses += " cloud-drive";

                    if (self.state.currentlyViewedEntry !== M.RootID) {
                        breadcrumbClasses += " has-next-button";
                    }
                }
                else {
                    breadcrumbClasses += " folder";
                }

                if (k !== 0) {
                    breadcrumbClasses += " has-next-button";
                }
                if (breadcrumbNodeId === "shares") {
                    breadcrumbClasses += " shared-with-me";
                }

                var folderName = breadcrumbNodeId === M.RootID ? __(l[164]) :
                    (
                        breadcrumbNodeId === "shares" ?
                            l[5589] :
                            M.d[breadcrumbNodeId] && M.d[breadcrumbNodeId].name
                    );

                (function (breadcrumbNodeId) {
                    breadcrumb.unshift(
                        <a className={"fm-breadcrumbs contains-directories " + breadcrumbClasses}
                           key={breadcrumbNodeId}
                           onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               self.setState({
                                   'currentlyViewedEntry': breadcrumbNodeId,
                                   'selected': [],
                                   'searchValue': ''
                               });
                               self.onSelected([]);
                               self.onHighlighted([]);
                           }}>
                        <span className="right-arrow-bg simpletip" data-simpletip={folderName}>
                            <span>{folderName}</span>
                        </span>
                        </a>
                    );
                })(breadcrumbNodeId);
            });

        self.state.highlighted.forEach(function(nodeId) {
            if (M.d[nodeId] && M.d[nodeId].t === 1) {
                folderIsHighlighted = true;
            }
        });

        var buttons = [];

        if (!folderIsHighlighted || self.props.folderSelectable) {
            buttons.push({
                "label": self.props.selectLabel,
                "key": "select",
                "className": "default-grey-button "
                + (self.state.selected.length === 0 ? "disabled" : null),
                "onClick": function(e) {
                    if (self.state.selected.length > 0) {
                        self.props.onSelected(self.state.selected);
                        self.props.onAttachClicked();
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
        else if (folderIsHighlighted) {
            buttons.push({
                "label": self.props.openLabel,
                "key": "select",
                "className": "default-grey-button",
                "onClick": function(e) {
                    if (self.state.highlighted.length > 0) {
                        self.setState({'currentlyViewedEntry': self.state.highlighted[0]});
                        self.onSelected([]);
                        self.onHighlighted([]);
                        self.browserEntries.setState({
                            'selected': [],
                            'searchValue': '',
                            'highlighted': []
                        });
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        buttons.push({
            "label": self.props.cancelLabel,
            "key": "cancel",
            "onClick": function(e) {
                self.props.onClose(self);
                e.preventDefault();
                e.stopPropagation();
            }
        });

        var gridHeader = [];

        if (viewMode === "0") {
            gridHeader.push(
                <table className="grid-table-header fm-dialog-table" key={"grid-table-header"}>
                    <tbody>
                    <tr>
                        <BrowserCol id="grid-header-star" sortBy={self.state.sortBy} onClick={self.toggleSortBy} />
                        <BrowserCol id="name" label={__(l[86])} sortBy={self.state.sortBy}
                                    onClick={self.toggleSortBy}/>
                        <BrowserCol id="size" label={__(l[87])} sortBy={self.state.sortBy}
                                    onClick={self.toggleSortBy}/>
                        <BrowserCol id="ts" label={__(l[16169])}
                                    sortBy={
                                        self.state.sortBy && self.state.sortBy[0] === "ts" ?
                                            ["ts", self.state.sortBy[1] === "desc" ? "asc" : "desc"] :
                                            self.state.sortBy
                                    }
                                    onClick={self.toggleSortBy}/>
                    </tr>
                    </tbody>
                </table>
            );
        }

        var clearSearchBtn = null;
        if (self.state.searchValue.length >= 3) {
            clearSearchBtn = (
                <i
                    className="top-clear-button"
                    style={{'right': '85px'}}
                    onClick={() => {
                        self.onClearSearchIconClick();
                    }}
                >
                </i>
            );
        }

        return (
            <ModalDialogsUI.ModalDialog
                title={self.props.title || __(l[8011])}
                className={classes}
                onClose={() => {
                    self.props.onClose(self);
                }}
                popupDidMount={self.onPopupDidMount}
                buttons={buttons}>
                <div className="fm-dialog-tabs">
                    <div className={"fm-dialog-tab cloud active"}
                        onClick={(e) => {
                            self.onTabButtonClick(e, 'clouddrive');
                        }}>
                            {__(l[164])}
                        </div>
                    <div className={"fm-dialog-tab incoming"}
                        onClick={(e) => {
                            self.onTabButtonClick(e, 'shares');
                        }}>
                            {__(l[5542])}
                        </div>
                    <div className="clear"></div>
                </div>
                <div className="fm-picker-header">
                    <div className="fm-header-buttons">
                        <a className={"fm-files-view-icon block-view" + (viewMode === "1" ? " active" : "")}
                            title="Thumbnail view"
                            onClick={(e) => {
                                self.onViewButtonClick(e);
                            }}>
                        </a>
                        <a className={"fm-files-view-icon listing-view" + (viewMode === "0" ? " active" : "")}
                            title="List view"
                            onClick={(e) => {
                                    self.onViewButtonClick(e);
                            }}>
                        </a>
                        <div className="fm-files-search">
                            <i className="search"
                                onClick={(e) => {
                                    self.onSearchIconClick(e);
                                }}>
                            ></i>
                            <input type="search" placeholder={__(l[102])}  value={self.state.searchValue}
                                onChange={self.onSearchChange} />
                            {clearSearchBtn}
                        </div>
                        <div className="clear"></div>
                    </div>
                    <div className="fm-breadcrumbs-wrapper add-from-cloud">
                         <div className="fm-breadcrumbs-block">
                            {breadcrumb}
                            <div className="clear"></div>
                        </div>
                    </div>
                </div>

                {gridHeader}

                <BrowserEntries
                    isLoading={self.state.isLoading}
                    currentlyViewedEntry={self.state.currentlyViewedEntry}
                    entries={entries}
                    onExpand={(node) => {
                        self.onSelected([]);
                        self.onHighlighted([]);
                        self.setState({
                            'currentlyViewedEntry': node.h,
                            'searchValue': ''
                        });
                    }}
                    folderSelectNotAllowed={self.props.folderSelectNotAllowed}
                    onSelected={self.onSelected}
                    onHighlighted={self.onHighlighted}
                    onAttachClicked={self.onAttachClicked}
                    viewMode={localStorage.dialogViewMode}
                    initialSelected={self.state.selected}
                    initialHighlighted={self.state.highlighted}
                    ref={
                        (browserEntries) => {
                            self.browserEntries = browserEntries;
                        }
                    }
                />
            </ModalDialogsUI.ModalDialog>
        );
    }
};

window.CloudBrowserModalDialogUI = {
    CloudBrowserDialog,
};

export default {
    CloudBrowserDialog
}
