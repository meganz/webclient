var React = require("react");
var ReactDOM = require("react-dom");
var utils = require("./utils.jsx");
var MegaRenderMixin = require("../stores/mixins.js").MegaRenderMixin;
var Tooltips = require("./tooltips.jsx");
var Forms = require("./forms.jsx");

var ContactsUI = require('./../chat/ui/contacts.jsx');

var ExtraFooterElement = React.createClass({
    render() {
        return this.props.children;
    }
});

var ModalDialog = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps() {
        return {
            'hideable': true
        }
    },
    componentDidMount: function() {
        var self = this;
        $(document.body).addClass('overlayed');
        $('.fm-dialog-overlay').removeClass('hidden');

        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        document.querySelector('.conversationsApp').addEventListener('click', this.onBlur);

        $(document).rebind('keyup.modalDialog' + self.getUniqueId(), function(e) {
            if (e.keyCode == 27) { // escape key maps to keycode `27`
                self.onBlur();
            }
        });
    },
    onBlur: function(e) {
        var $element = $(ReactDOM.findDOMNode(this));

        if(
            (!e || !$(e.target).closest(".fm-dialog").is($element))
        ) {
            document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
            this.onCloseClicked();
        }


    },
    componentWillUnmount: function() {
        document.querySelector('.conversationsApp').removeEventListener('click', this.onBlur);
        $(document).unbind('keyup.modalDialog' + this.getUniqueId());
        $(document.body).removeClass('overlayed');
        $('.fm-dialog-overlay').addClass('hidden');

    },
    onCloseClicked: function(e) {
        var self = this;

        if (self.props.onClose) {
            self.props.onClose(self);
        }
    },
    onPopupDidMount: function(elem) {
        this.domNode = elem;
        if (this.props.popupDidMount) {
            // bubble up...
            this.props.popupDidMount(elem);
        }
    },
    render: function() {
        var self = this;

        var classes = "fm-dialog " + self.props.className;

        var footer = null;

        var extraFooterElements = [];
        var otherElements = [];

        var x = 0;
        React.Children.forEach(self.props.children, function (child) {
            if (!child) {
                // skip if undefined
                return;
            }

            if (
                child.type.displayName === 'ExtraFooterElement'
            ) {
                extraFooterElements.push(React.cloneElement(child, {
                    key: x++
                }));
            }
            else {
                otherElements.push(
                    React.cloneElement(child, {
                        key: x++
                    })
                );
            }
        }.bind(this));


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
            });

            footer = <div className="fm-dialog-footer">
                {extraFooterElements}
                {buttons}
                <div className="clear"></div>
            </div>;
        }

        return (
            <utils.RenderTo element={document.body} className={classes} popupDidMount={this.onPopupDidMount}>
                <div>
                    <div className="fm-dialog-close" onClick={self.onCloseClicked}></div>
                    {
                        self.props.title ? <div className="fm-dialog-title">{self.props.title}</div> : null
                    }

                    <div className="fm-dialog-content">
                        {otherElements}
                    </div>

                    {footer}
                </div>
            </utils.RenderTo>
        );
    }
});

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
            if (!node.name) {
                // continue
                return;
            }

            var isFolder = node.t === 1;
            var isSelected = self.state.selected.indexOf(node.h) !== -1;

            var tooltipElement = null;

            var icon = <span className={"transfer-filtype-icon " + fileIcon(node)}> </span>;

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
                    <Tooltips.Handler className={"transfer-filtype-icon " + fileIcon(node)}> </Tooltips.Handler>
                    <Tooltips.Contents className={"img-preview"}>
                        <div className="dropdown img-wrapper img-block" id={node.h}>
                            <img alt=""
                                 className={"thumbnail-placeholder " + node.h}
                                 src={src}
                                 width="120"
                                 height="120"
                            />
                        </div>
                    </Tooltips.Contents>
                </Tooltips.Tooltip>;
            }

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
                        {icon}
                        <span className={"tranfer-filetype-txt"}>{node.name}</span>
                    </td>
                    <td>{!isFolder ? bytesToSize(node.s) : ""}</td>
                </tr>
            )
        });
        return <utils.JScrollPane className="fm-dialog-grid-scroll" selected={this.state.selected}>
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
            'hideable': true
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

        // always return first the folders and then the files
        var files = [];
        var folders = [];

        entries.forEach(function(v) {
            if(v.t === 1) {
                folders.push(v);
            }
            else if(v.t === 0) {
                files.push(v);
            }
        });

        return folders.concat(files);
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        this.props.onSelected(nodes);
    },
    onAttachClicked: function() {
        this.props.onAttachClicked();
    },
    onPopupDidMount: function(elem) {
        this.domNode = elem;
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
                popupDidMount={self.onPopupDidMount}
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

var SelectContactDialog = React.createClass({
    mixins: [MegaRenderMixin],
    clickTime: 0,
    getDefaultProps: function() {
        return {
            'selectLabel': __("Send"),
            'cancelLabel': __("Cancel"),
            'hideable': true
        }
    },
    getInitialState: function() {
        return {
            'selected': []
        }
    },
    onSelected: function(nodes) {
        this.setState({'selected': nodes});
        this.props.onSelected(nodes);
        this.forceUpdate();
    },
    onSelectClicked: function() {
        this.props.onSelectClicked();
    },
    render: function() {
        var self = this;

        var classes = "send-contact " + self.props.className;


        return (
            <ModalDialog
                title={__("Send Contact")}
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
                                    self.props.onSelectClicked();
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
            <ContactsUI.ContactPickerWidget
                megaChat={self.props.megaChat}
                contacts={self.props.contacts}
                onClick={(contact, e) => {
                    var contactHash = contact.h;

                        // differentiate between a click and a double click.
                        if ((new Date() - self.clickTime) < 500) {
                            // is a double click
                            self.onSelected([contact.h]);
                            self.props.onSelectClicked();
                        }
                        else {
                            // is a single click
                            if (self.state.selected.indexOf(contactHash) === -1) {
                                self.state.selected.push(contact.h);
                                self.onSelected(self.state.selected);
                            }
                            else {
                                removeValue(self.state.selected, contactHash);
                                self.onSelected(self.state.selected);
                            }
                        }
                        self.clickTime = new Date();

                }}
                selected={self.state.selected}
                headerClasses="left-aligned"
                />
            </ModalDialog>
        );
    }
});

var ConfirmDialog = React.createClass({
    mixins: [MegaRenderMixin],
    getDefaultProps: function() {
        return {
            'confirmLabel': __("Continue"),
            'cancelLabel': __("Cancel"),
            'hideable': true
        }
    },
    getInitialState: function() {
        return {
        }
    },
    onConfirmClicked: function() {
        if (this.props.onConfirmClicked) {
            this.props.onConfirmClicked();
        }
    },
    render: function() {
        var self = this;

        if (mega.config.get('confirmModal_' + self.props.name) === true)  {
            if (this.props.onConfirmClicked) {
                // this would most likely cause a .setState, so it should be done in a separate cycle/call stack.
                setTimeout(function() {
                    self.props.onConfirmClicked();
                }, 75);
            }
            return null;
        }

        var classes = "delete-message " + self.props.name + " " + self.props.className;

        return (
            <ModalDialog
                title={this.props.title}
                className={classes}
                onClose={() => {
                    self.props.onClose(self);
                }}
                buttons={[
                        {
                            "label": self.props.confirmLabel,
                            "key": "select",
                            "className": null,
                            "onClick": function(e) {
                                self.onConfirmClicked();
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
                <div className="fm-dialog-content">
                    {self.props.children}
                </div>
                <ExtraFooterElement>
                    <div className="footer-checkbox">
                        <Forms.Checkbox
                            name="delete-confirm"
                            id="delete-confirm"
                            onLabelClick={(e, state) => {
                                if (state === true) {
                                    mega.config.set('confirmModal_' + self.props.name, true);
                                }
                                else {
                                    mega.config.set('confirmModal_' + self.props.name, false);
                                }
                            }}
                            >
                            {l['7039']}
                            </Forms.Checkbox>
                    </div>
                </ExtraFooterElement>
            </ModalDialog>
        );
    }
});

module.exports = window.ModalDialogUI = {
    ModalDialog,
    CloudBrowserDialog,
    SelectContactDialog,
    ConfirmDialog,
    ExtraFooterElement
};
