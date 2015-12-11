var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;

var ModalDialog = React.createClass({
    mixins: [MegaRenderMixin],
    componentDidMount: function() {
        var self = this;
        $(document.body).addClass('overlayed');
        $('.fm-dialog-overlay').removeClass('hidden');

        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

        $(document).rebind('keyup.modalDialog' + self.megaInstanceId, function(e) {
            if (e.keyCode == 27) { // escape key maps to keycode `27`
                self.onBlur();
            }
        });
    },
    onBlur: function(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if(
            (!e || !$(e.target).parents(".fm-dialog").is($element))
        ) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            this.onCloseClicked();
        }


    },
    componentWillUnmount: function() {
        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        $(document).unbind('keyup.modalDialog' + this.megaInstanceId);
        $(document.body).removeClass('overlayed');
        $('.fm-dialog-overlay').addClass('hidden');
    },
    onCloseClicked: function(e) {
        var self = this;

        if (self.props.onClose) {
            self.props.onClose(self);
        }
    },
    renderChildren: function () {
        return React.Children.map(this.props.children, function (child) {
            return React.cloneElement(child, {});
        }.bind(this))
    },
    render: function() {
        var self = this;

        var classes = "fm-dialog " + self.props.className;

        var footer = null;

        if(self.props.buttons) {
            var buttons = [];
            self.props.buttons.forEach(function(v) {
                buttons.push(
                    <a href="javascript:;" className={"default-white-button right" + (v.className ? " " + v.className : "")} onClick={(e) => {
                        if (v.onClick) {
                            v.onClick(e, self);
                        }
                    }} key={v.key}>
                        {v.label}
                    </a>
                );
            })

            footer = <div className="fm-dialog-footer">
                {buttons}
                <div className="clear"></div>
            </div>;
        }

        return (
            <utils.RenderTo element={document.body} className={classes}>
                <div>
                    <div className="fm-dialog-close" onClick={self.onCloseClicked}></div>
                    {
                        self.props.title ? <div className="fm-dialog-title">{self.props.title}</div> : null
                    }

                    <div className="fm-dialog-content">
                        {self.renderChildren()}
                    </div>

                    {footer}
                </div>
            </utils.RenderTo>
        );
    }
});

var BrowserCol = React.createClass({
    mixins: [MegaRenderMixin],
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
    getInitialState: function() {
        return {
            'selected': []
        }
    },
    onEntryClick: function(e, node) {
        e.stopPropagation();
        e.preventDefault();

        if (this.props.folderSelectNotAllowed === true && node.t === 1) {
            // halt on folder selection

            return;
        }
        this.setState({'selected': [node.h]});
        this.props.onSelected([node.h]);
    },
    onEntryDoubleClick: function(e, node) {
        var self = this;

        e.stopPropagation();
        e.preventDefault();

        if (node.t === 1) {
            // expand folder
            self.setState({'selected': []});
            self.props.onSelected([]);
            self.props.onExpand(node);
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

            var isFolder = node.t === 1;
            var isSelected = self.state.selected.indexOf(node.h) !== -1;

            items.push(
                <tr
                    className={(isFolder ? " folder" :"") + (isSelected ? " ui-selected" : "")}
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
                        <span className={"transfer-filtype-icon " + fileIcon(node)}> </span>
                        <span className={"tranfer-filetype-txt"}>{node.name}</span>
                    </td>
                    <td>{!isFolder ? bytesToSize(node.s) : ""}</td>
                </tr>
            )
        });
        return <utils.JScrollPane className="fm-dialog-grid-scroll">
            <table className="grid-table fm-dialog-table">
                <tbody>
                {items}
                </tbody>
            </table>
        </utils.JScrollPane>;
    }
});
var CloudBrowserDialog = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'selectLabel': __("Attach"),
            'cancelLabel': __("Cancel"),
        }
    },
    getInitialState: function() {
        return {
            'sortBy': [
                'name', 'asc'
            ],
            'selected': [],
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
    getEntries: function() {
        var self = this;
        var entries = [];

        obj_values(M.d).forEach(function(v) {
            if (v.p === self.state.currentlyViewedEntry) {
                entries.push(v);
            }
        });
        var sortKey;
        var order = 1;

        if (self.state.sortBy[0] === "name") {
            sortKey = "name";
        }
        else if(self.state.sortBy[0] === "size") {
            sortKey = "s";
        }
        else if(self.state.sortBy[0] === "grid-header-star") {
            sortKey = "fav";
        }

        order = self.state.sortBy[1] === "asc" ? 1 : -1;

        entries.sort(function(a, b) {
            // compare diff cols by diff methods... (string VS int VS int + undefined)
            if (sortKey === "name") {
                return ((a[sortKey] ? a[sortKey] : "").localeCompare(b[sortKey])) * order;
            }
            else {
                var _a = a[sortKey] || 0;
                var _b = b[sortKey] || 0;
                if (_a > _b) {
                    return 1 * order;
                }
                if (_a < _b) {
                    return -1 * order;
                }

                return 0;
            }
        });

        return entries;
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        this.props.onSelected(nodes);
    },
    onAttachClicked: function() {
        this.props.onAttachClicked();
    },
    render: function() {
        var self = this;

        var classes = "add-from-cloud " + self.props.className;

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
                        self.props.onSelected([]);
                    }}>
                        <span className="right-arrow-bg">
                            <span>{p.h === M.RootID ? __("Cloud Drive") : p.name}</span>
                        </span>
                    </a>
                );
            })(p);
        } while (p = M.d[M.d[p.h].p]);

        return (
            <ModalDialog
                title={__("Add from your Cloud Drive")}
                className={classes}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                        {
                            "label": self.props.selectLabel,
                            "key": "select",
                            "className": self.state.selected.length === 0 ? "disabled" : null,
                            "onClick": function(e) {
                                if (self.state.selected.length > 0) {
                                    self.props.onSelected(self.state.selected);
                                    self.props.onAttachClicked();
                                }
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
                        {
                            "label": self.props.cancelLabel,
                            "key": "cancel",
                            "onClick": function(e) {
                                self.props.onClose(self);
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        },
            ]}>
                <div className="fm-breadcrumbs-block">
                    {breadcrumb}
                    <div className="clear"></div>
                </div>

                <table className="grid-table-header fm-dialog-table">
                    <tbody>
                        <tr>
                            <BrowserCol id="grid-header-star" sortBy={self.state.sortBy} onClick={self.toggleSortBy} />
                            <BrowserCol id="name" label={__("Name")} sortBy={self.state.sortBy} onClick={self.toggleSortBy} />
                            <BrowserCol id="size" label={__("Size")} sortBy={self.state.sortBy} onClick={self.toggleSortBy} />
                        </tr>
                    </tbody>
                </table>


                <BrowserEntries
                    entries={self.getEntries()}
                    onExpand={(node) => {
                        self.setState({'currentlyViewedEntry': node.h});
                    }}
                    folderSelectNotAllowed={self.props.folderSelectNotAllowed}
                    onSelected={self.onSelected}
                    onAttachClicked={self.onAttachClicked}
                />
            </ModalDialog>
        );
    }
});
module.exports = window.ModalDialogUI = {
    ModalDialog,
    CloudBrowserDialog,
};
