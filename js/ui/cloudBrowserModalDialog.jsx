var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var Tooltips = require("./tooltips.jsx");
var ModalDialogsUI = require('./modalDialogs.jsx');

var BrowserCol = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'hideable': true
        }
    },
    render: function() {
        var self = this;

        var classes = self.props.id + " " + (self.props.className ? self.props.className : "");

        if (self.props.sortBy[0] === self.props.id) {
            var ordClass = self.props.sortBy[1] == "desc" ? "asc" : "desc";
            classes = classes + " " + ordClass;
        }
        return (
            <th onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                self.props.onClick(self.props.id);
            }}>
                <span className={"arrow " + classes}>{self.props.label}</span>
            </th>
        );
    }
});
var BrowserEntries = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'hideable': true
        }
    },
    getInitialState: function() {
        return {
            'highlighted': [],
            'selected': []
        }
    },
    componentWillMount: function() {
        this.lastCursor = false;
        this.lastCharKeyPressed = false;
        this.lastCharKeyIndex = -1;
    },
    componentDidUpdate: function() {
        var self = this;

        if (!self.lastCursor || self.lastCursor !== self.state.cursor) {
            self.lastCursor = self.state.cursor;
            var tr = self.findDOMNode().querySelector('tr.node_' + self.lastCursor);
            var $jsp = $(tr).parents('.jspScrollable').data('jsp');
            if (tr && $jsp) {
                $jsp.scrollToElement(tr, undefined, false);
            }
        }
    },
    componentDidMount: function() {
        this.bindEvents();
    },
    componentWillUnmount: function() {
        this.unbindEvents();
    },
    getNodesInIndexRange: function(firstIndex, lastIndex) {
        var self = this;
        return self.props.entries
            .filter((node, index) => {
                return index >= firstIndex && index <= lastIndex && (
                    !self.props.folderSelectNotAllowed ? true : (node.t === 0)
                );
            })
            .map((node) => { return node.h });
    },
    getIndexByNodeId: function(nodeId, notFoundValue) {
        var self = this;
        var foundIndex = typeof(notFoundValue) === 'undefined' ? -1 : notFoundValue;
        self.props.entries.find(function (r, index) {
            if (r.h === nodeId) {
                foundIndex = index;
                return true;
            }
        });
        return foundIndex;
    },
    setSelectedAndHighlighted: function(highlighted, cursor) {
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
    },
    bindEvents: function() {
        var self = this;

        var KEY_A = 65;
        var KEY_UP = 38;
        var KEY_DOWN = 40;
        var KEY_ENTER = 13;
        var KEY_BACKSPACE = 8;


        $(document.body).rebind('keydown.cloudBrowserModalDialog', function(e) {
            var charTyped = false;
            var keyCode = e.which || e.keyCode;
            var selectionIncludeShift = e.shiftKey;

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
                // back
                var currentFolder = M.getNode(self.props.currentlyViewedEntry);
                if (currentFolder.p) {
                    self.expandFolder(currentFolder.p);
                }
            }
            else if (!e.metaKey && (keyCode === KEY_UP || keyCode === KEY_DOWN)) {
                // up/down
                var dir = keyCode === KEY_UP ? -1 : 1;

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
    },
    unbindEvents: function() {
        $(document.body).unbind('keydown.cloudBrowserModalDialog');
    },
    onEntryClick: function(e, node) {
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
    },
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
    },
    onEntryDoubleClick: function(e, node) {
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
    },
    render: function() {
        var self = this;

        var items = [];

        var entry = self.props.entries;
        self.props.entries.forEach(function(node) {
            if (node.t !== 0 && node.t !== 1) {
                // continue
                return;
            }
            if (!node.name) {
                // continue
                return;
            }

            var isFolder = node.t;
            var isHighlighted = self.state.highlighted.indexOf(node.h) !== -1;

            var tooltipElement = null;

            var icon = <span
                className={"transfer-filetype-icon " + (isFolder ? " folder " : "") + fileIcon(node)}> </span>;

            if (is_image(node) && node.fa) {
                var src = thumbnails[node.h];
                if (!src) {
                    M.v.push(node);
                    if (!node.seen) {
                        node.seen = 1; // HACK
                    }
                    delay('thumbnails', fm_thumbnails, 90);
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
            }

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
                    <td>{time2date(node.ts)}</td>
                </tr>
            )
        });
        if (items.length > 0) {
            return (
                <utils.JScrollPane className="fm-dialog-grid-scroll"
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
        else {
            return (
                <div className="dialog-empty-block dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <div className="dialog-empty-icon"></div>
                        <div className="dialog-empty-header">
                            {self.props.currentlyViewedEntry === M.RootID ? l[1343] : l[782]}
                        </div>
                    </div>
                </div>
            );
        }
    }
});
var CloudBrowserDialog = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'selectLabel': __(l[8023]),
            'openLabel': __(l[1710]),
            'cancelLabel': __(l[82]),
            'hideable': true
        }
    },
    getInitialState: function() {
        return {
            'sortBy': [
                'name', 'asc'
            ],
            'selected': [],
            'highlighted': [],
            'currentlyViewedEntry': M.RootID
        }
    },
    toggleSortBy: function(colId) {
        if (this.state.sortBy[0] === colId) {
            this.setState({'sortBy': [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"]});
        }
        else {
            this.setState({'sortBy': [colId, "asc"]});
        }
    },
    resizeBreadcrumbs: function() {
        var $breadcrumbs = $('.fm-breadcrumbs-block.add-from-cloud', this.findDOMNode());
        var $breadcrumbsWrapper = $breadcrumbs.find('.breadcrumbs-wrapper');

        setTimeout(function() {
            var breadcrumbsWidth = $breadcrumbs.outerWidth();
            var $el = $breadcrumbs.find('.right-arrow-bg');
            var i = 0;
            var j = 0;
            $el.removeClass('short-foldername ultra-short-foldername invisible');

            while ($breadcrumbsWrapper.outerWidth() > breadcrumbsWidth) {
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
                    break;
                }
            }
        }, 0);
    },
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.currentlyViewedEntry !== this.state.currentlyViewedEntry) {
            this.resizeBreadcrumbs();

            var handle = this.state.currentlyViewedEntry;
            if (!M.d[handle] || (M.d[handle].t && !M.c[handle])) {
                var self = this;
                self.setState({'isLoading': true});
                dbfetch.get(handle)
                    .always(function() {
                        self.setState({'isLoading': false});
                        self.setState({entries: self.getEntries()});
                    });
                return;
            }
        }

        this.setState({entries: null});
    },
    getEntries: function() {
        var self = this;
        var order = self.state.sortBy[1] === "asc" ? 1 : -1;
        var entries = Object.keys(M.c[self.state.currentlyViewedEntry] || {}).map(h => M.d[h]);
        var sortFunc;

        if (self.state.sortBy[0] === "name") {
            sortFunc = M.getSortByNameFn();
        }
        else if(self.state.sortBy[0] === "size") {
            sortFunc = M.getSortBySizeFn();
        }
        else if(self.state.sortBy[0] === "ts") {
            sortFunc = M.getSortByDateTimeFn();
        }
        else /*if(self.state.sortBy[0] === "grid-header-star")*/ {
            sortFunc = M.sortByFavFn(order);
        }

        // always return first the folders and then the files
        var folders = [];

        for (var i = entries.length; i--;) {
            if (entries[i].t) {
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
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        this.props.onSelected(nodes);
    },
    onHighlighted: function(nodes) {
        this.setState({'highlighted': nodes});

        if (this.props.onHighlighted) {
            this.props.onHighlighted(nodes);
        }
    },
    onAttachClicked: function() {
        this.props.onAttachClicked();
    },
    onPopupDidMount: function(elem) {
        this.domNode = elem;
    },
    render: function() {
        var self = this;

        var entries = self.state.entries || self.getEntries();

        var classes = "add-from-cloud " + self.props.className;

        var folderIsHighlighted = false;

        var breadcrumb = [];

        var p = M.d[self.state.currentlyViewedEntry];
        do {
            var breadcrumbClasses = "";
            if (p.h === M.RootID) {
                breadcrumbClasses += " cloud-drive";

                if (self.state.currentlyViewedEntry !== M.RootID) {
                    breadcrumbClasses += " has-next-button";
                }
            }
            else {
                breadcrumbClasses += " folder";
            }

            (function(p) {
                if (self.state.currentlyViewedEntry !== p.h) {
                    breadcrumbClasses += " has-next-button";
                }
                breadcrumb.unshift(
                    <a className={"fm-breadcrumbs contains-directories " + breadcrumbClasses} key={p.h}
                       onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           self.setState({'currentlyViewedEntry': p.h, 'selected': []});
                           self.onSelected([]);
                           self.onHighlighted([]);
                        }}>
                        <span className="right-arrow-bg invisible">
                            <span>{p.h === M.RootID ? __(l[164]) : p.name}</span>
                        </span>
                    </a>
                );
            })(p);
        } while (p = M.d[M.d[p.h].p]);

        self.state.highlighted.forEach(function(nodeId) {
            if (M.d[nodeId] && M.d[nodeId].t === 1) {
                folderIsHighlighted = true;
            }
        });

        var buttons = [];

        if (!folderIsHighlighted) {
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
                        self.setState({'currentlyViewedEntry':
                            self.state.highlighted[0]
                        });
                        self.onSelected([]);
                        self.onHighlighted([]);
                        self.browserEntries.setState({
                            'selected': [],
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

        return (
            <ModalDialogsUI.ModalDialog
                title={__(l[8011])}
                className={classes}
                onClose={() => {
                    self.props.onClose(self);
                }}
                popupDidMount={self.onPopupDidMount}
                buttons={buttons}>
                <div className="fm-breadcrumbs-block add-from-cloud">
                    <div className="breadcrumbs-wrapper">
                        {breadcrumb}
                        <div className="clear"></div>
                    </div>
                </div>

                <table className="grid-table-header fm-dialog-table">
                    <tbody>
                    <tr>
                        <BrowserCol id="grid-header-star" sortBy={self.state.sortBy} onClick={self.toggleSortBy} />
                        <BrowserCol id="name" label={__(l[86])} sortBy={self.state.sortBy}
                                    onClick={self.toggleSortBy}/>
                        <BrowserCol id="size" label={__(l[87])} sortBy={self.state.sortBy}
                                    onClick={self.toggleSortBy}/>
                        <BrowserCol id="ts" label={__(l[16169])} sortBy={self.state.sortBy}
                                    onClick={self.toggleSortBy}/>
                    </tr>
                    </tbody>
                </table>


                <BrowserEntries
                    isLoading={self.state.isLoading}
                    currentlyViewedEntry={self.state.currentlyViewedEntry}
                    entries={entries}
                    onExpand={(node) => {
                        self.onSelected([]);
                        self.onHighlighted([]);
                        self.setState({'currentlyViewedEntry': node.h});
                    }}
                    folderSelectNotAllowed={self.props.folderSelectNotAllowed}
                    onSelected={self.onSelected}
                    onHighlighted={self.onHighlighted}
                    onAttachClicked={self.onAttachClicked}
                    ref={
                        (browserEntries) => {
                            self.browserEntries = browserEntries;
                        }
                    }
                />
            </ModalDialogsUI.ModalDialog>
        );
    }
});

module.exports = window.CloudBrowserModalDialogUI = {
    CloudBrowserDialog,
};
