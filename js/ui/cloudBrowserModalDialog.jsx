var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var Tooltips = require("./tooltips.jsx");
var ModalDialogsUI = require('./modalDialogs.jsx');

var BrowserCol = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps() {
        return {
            'hideable': true
        }
    },
    render: function() {
        var self = this;

        var classes = self.props.id + " " + (self.props.className ? self.props.className : "");

        if (self.props.sortBy[0] === self.props.id) {
            classes += " " + self.props.sortBy[1];
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
    getDefaultProps() {
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
    componentDidMount: function() {
        this.bindEvents();
    },
    componentWillUnmount: function() {
        this.unbindEvents();
    },
    bindEvents: function() {
        var self = this;

        var KEY_UP = 38;
        var KEY_DOWN = 40;
        var KEY_ENTER = 13;

        $(document.body).rebind('keydown.cloudBrowserModalDialog', function(e) {
            var keyCode = e.which || e.keyCode;
            var selectionIncludeShift = e.shiftKey;

            // up/down
            if (keyCode === KEY_UP || keyCode === KEY_DOWN) {
                var lastHighlighted = self.state.cursor || false;
                if (!self.state.cursor && self.state.highlighted && self.state.highlighted.length > 0) {
                    lastHighlighted = self.state.highlighted[self.state.highlighted.length - 1];
                }
                var currentIndex = 0;

                self.props.entries.find(function (r, index) {
                    if (r.h === lastHighlighted) {
                        currentIndex = index;
                        return true;
                    }
                }) || 0;


                var targetIndex = currentIndex + (keyCode === KEY_UP ? -1 : 1);
                if (targetIndex < 0 || !self.props.entries[targetIndex]) {
                    targetIndex = currentIndex;
                }


                console.error('cursor: ', self.props.entries[targetIndex].h);

                var highlighted;

                if (selectionIncludeShift) {
                    var firstIndex;
                    var lastIndex;
                    if (targetIndex < currentIndex) {
                        // up
                        firstIndex = targetIndex;
                        lastIndex = currentIndex;
                    }
                    else {
                        // down
                        firstIndex = currentIndex;
                        lastIndex = targetIndex;
                    }

                    console.error([firstIndex, lastIndex, currentIndex, targetIndex]);

                    highlighted = self.props.entries
                        .filter((n, index) => {
                            return index >= firstIndex && index <= lastIndex;
                        })
                        .map((node) => { return node.h });

                    console.error(highlighted);
                    self.setState({'highlighted': highlighted, cursor: self.props.entries[targetIndex].h});
                    self.props.onHighlighted(highlighted);
                }
                else {
                    highlighted = [self.props.entries[targetIndex].h];
                    self.setState({'highlighted': highlighted, 'cursor': highlighted[0]});
                    self.props.onHighlighted(highlighted);
                }
            }
            else if (keyCode === KEY_ENTER) {
                var selectedNodes = [];

                if (self.props.folderSelectNotAllowed === true) {
                    // remove all folders from highlighted
                    self.state.highlighted.forEach(function (h) {
                        var node = self.props.entries.find((entry) => {
                            return entry.h === h;
                        });

                        if (node && !node.t) {
                            selectedNodes.push(h);
                        }
                    });
                }
                else {
                    selectedNodes = self.state.highlighted;
                }

                self.setState({'selected': selectedNodes});
                self.props.onSelected(selectedNodes);
                self.props.onAttachClicked(selectedNodes);
            }
            else {
                console.error(keyCode);
            }
            // enter
        });
    },
    unbindEvents: function() {
        $(document.body).unbind('keydown.cloudBrowserModalDialog');
    },
    onEntryClick: function(e, node) {
        e.stopPropagation();
        e.preventDefault();

        this.setState({'highlighted': [node.h], 'cursor': false});
        if (this.props.onHighlighted) {
            this.props.onHighlighted([node.h]);
        }
        // If folder selected
        if (this.props.folderSelectNotAllowed === true && node.t) {
            this.setState({'selected': []});
            this.props.onSelected([]);
        } else {
            this.setState({'selected': [node.h]});
            this.props.onSelected([node.h]);
        }
    },
    onEntryDoubleClick: function(e, node) {
        var self = this;

        e.stopPropagation();
        e.preventDefault();

        if (node.t) {
            // expand folder
            self.setState({'selected': [], 'highlighted': []});
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

            var icon = <span className={"transfer-filetype-icon " + fileIcon(node)}> </span>;

            if (fileIcon(node) === "graphic" && node.fa) {
                var src = thumbnails[node.h];
                if (!src) {
                    src = M.getNodeByHandle(node.h);


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
                <tr
                    className={(isFolder ? " folder" :"") + (isHighlighted ? " ui-selected" : "")}
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
                <div className="dialog-empty-block dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <div className="dialog-empty-icon"></div>
                        <div className="dialog-empty-header">
                            {__(l[782])}
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

                dbfetch.get(handle)
                    .always(function() {
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
            sortFunc = M.getSortByFavFn();
        }

        entries.sort(function(a, b) {
            return sortFunc(a, b, order);
        });

        // always return first the folders and then the files
        var folders = [];

        for (var i = entries.length; i--;) {
            if (entries[i].t) {
                folders.unshift(entries[i]);
                entries.splice(i, 1);
            }
        }

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

        // TODO: @lp show a 'loading' in place of the "empty folder" placeholder while dbfetch'ing nodes
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
                    <a className={"fm-breadcrumbs contains-directories " + breadcrumbClasses} key={p.h} onClick={(e) => {
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
            buttons.push(
                {
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
                }
            )
        }
        else if (folderIsHighlighted) {
            buttons.push(
                {
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
                }
            )
        }

        buttons.push(
            {
                "label": self.props.cancelLabel,
                "key": "cancel",
                "onClick": function(e) {
                    self.props.onClose(self);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        );

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
                        <BrowserCol id="name" label={__(l[86])} sortBy={self.state.sortBy} onClick={self.toggleSortBy}/>
                        <BrowserCol id="size" label={__(l[87])} sortBy={self.state.sortBy} onClick={self.toggleSortBy}/>
                        <BrowserCol id="ts" label={__(l[16169])} sortBy={self.state.sortBy} onClick={self.toggleSortBy}/>
                    </tr>
                    </tbody>
                </table>


                <BrowserEntries
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
