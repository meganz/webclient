import React from 'react';
import {MegaRenderMixin} from "../../../chat/mixins";
import {MegaList2} from "../megaList/megaList2.jsx";
import GenericGrid from "./nodes/genericGrid.jsx";
import GenericTable, {GenericTableHeader}
    from "./nodes/genericTable.jsx";
import {Grid, Table} from "../megaList/adapters.jsx";
import {ColumnFavIcon} from "./nodes/columns/columnFavIcon.jsx";
import {ColumnNodeName} from "./nodes/columns/columnNodeName.jsx";
import {ColumnSize} from "./nodes/columns/columnSize.jsx";
import {ColumnTimeAdded} from "./nodes/columns/columnTimeAdded.jsx";
import {ColumnExtras} from "./nodes/columns/columnExtras.jsx";

export default class BrowserEntries extends MegaRenderMixin {
    static KEYS = {
        A: 65,
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        ENTER: 13,
        BACKSPACE: 8
    };

    static defaultProps = {
        'hideable': true,
        'requiresUpdateOnResize': true
    };
    constructor(props) {
        super(props);

        this.state = {
            'sortBy': props.sortBy || [
                'name', 'asc'
            ]
        };

        this.toggleSortBy = this.toggleSortBy.bind(this);
    }

    componentWillMount() {
        this.lastCharKeyPressed = false;
        this.lastCharKeyIndex = -1;
    }

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }
    componentDidUpdate(oldProps, oldState) {
        if (
            oldProps.sortBy && (
                oldProps.sortBy[0] !== this.props.sortBy[0] ||
                oldProps.sortBy[1] !== this.props.sortBy[1]
            )
        ) {
            this.setState({'sortBy': this.props.sortBy});
        }
    }
    handleKeyNavigation(selectionManager, shiftKey, keyCode, viewMode) {
        let KEYS = BrowserEntries.KEYS;
        if (viewMode) {
            if (keyCode === KEYS.LEFT) {
                selectionManager.select_prev(shiftKey, true);
            }
            else if (keyCode === KEYS.RIGHT) {
                selectionManager.select_next(shiftKey, true);
            }
            else if (keyCode === KEYS.UP) {
                selectionManager.select_grid_up(shiftKey, true);
            }
            else {
                selectionManager.select_grid_down(shiftKey, true);
            }
        }
        else if (keyCode === KEYS.UP) {
            selectionManager.select_prev(shiftKey, true);
        }
        else {
            selectionManager.select_next(shiftKey, true);
        }
    }
    bindEvents() {
        var self = this;
        let KEYS = BrowserEntries.KEYS;



        $(document.body).rebind('keydown.be' + this.getUniqueId(), (e) => {
            var charTyped = false;
            var keyCode = e.which || e.keyCode;
            var $searchField = $('div.fm-files-search input');
            var $typingArea = $('textarea.messages-textarea');
            let { selectionManager } = this.props;

            if (e.target && (
                e.target.tagName === "INPUT" ||
                e.target.tagName === "BUTTON" ||
                (e.target.tagName === "TEXTAREA" && !e.target.classList.contains("messages-textarea")) ||
                e.target.tagName === "SELECT"
            )) {
                return;
            }
            // prevent further behavior if currently interacting w/ the dialog search field
            if ($searchField.is(':focus')) {
                return;
            }

            // remove the focus from the chat typing area to prevent
            // unnecessary character insertion while interacting with the dialog
            if ($typingArea.is(':focus')) {
                $typingArea.trigger('blur');
            }

            var viewMode = this.props.viewMode;

            if (keyCode === KEYS.A && (e.ctrlKey || e.metaKey)) {
                // select all
                selectionManager.select_all();
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.metaKey && keyCode === KEYS.UP || keyCode === KEYS.BACKSPACE) {
                if (!viewMode) {
                    // back
                    var currentFolder = M.getNode(self.props.currentlyViewedEntry);
                    if (currentFolder.p) {
                        self.expandFolder(currentFolder.p);
                    }
                }
            }
            else if (!e.metaKey &&
                (
                    !viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN) ||
                    viewMode && (
                        keyCode === KEYS.UP || keyCode === KEYS.DOWN || keyCode === KEYS.LEFT || keyCode === KEYS.RIGHT
                    )
                )
            ) {
                this.handleKeyNavigation(selectionManager, e.shiftKey, keyCode, viewMode);
            }
            else if (
                keyCode >= 48 && keyCode <= 57 ||
                keyCode >= 65 && keyCode <= 123 ||
                keyCode > 255
            ) {
                charTyped = String.fromCharCode(keyCode).toLowerCase();

                var foundMatchingNodes = self.props.entries.filter(function(node) {
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
                    selectionManager.clear_selection();
                    selectionManager.set_currently_selected(foundNode[self.props.keyProp], true);
                }
            }
            else if (keyCode === KEYS.ENTER || e.metaKey && keyCode === KEYS.DOWN) {
                var selectedNodes = [];

                if (self.props.folderSelectNotAllowed === true) {
                    // remove all folders from highlighted
                    self.props.highlighted.forEach(function(h) {
                        var node = self.props.entries.find((entry) => {
                            return entry[self.props.keyProp] === h;
                        });

                        if (node && node.t === 0) {
                            selectedNodes.push(h);
                        }
                    });
                    // if only folders were selected and no files..do open the cursor OR first folder selected
                    if (selectedNodes.length === 0) {
                        var cursorNode = this.props.highlighted[0] && M.getNodeByHandle(this.props.highlighted[0]);
                        if (cursorNode.t === 1) {
                            self.expandFolder(cursorNode[self.props.keyProp]);
                            return;
                        }
                        else if (self.props.highlighted.length > 0) {
                            // open/expand the first node, we know its a folder already.
                            var firstNodeId = self.props.highlighted[0];
                            self.expandFolder(firstNodeId);
                            return;
                        }
                        // else, nothing selected, do nothing.
                        return;
                    }
                }
                else {
                    selectedNodes = self.props.highlighted;
                }
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
        $(document.body).off('keydown.be' + this.getUniqueId());
    }
    onEntryClick(e, node) {
        var self = this;
        let { selectionManager } = this.props;

        self.lastCharKeyPressed = false;
        self.lastCharKeyIndex = -1;

        e.stopPropagation();
        e.preventDefault();

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            selectionManager.clear_selection();
            selectionManager.set_currently_selected(node[self.props.keyProp]);
        }
        else if (e.shiftKey) {
            selectionManager.shift_select_to(node[self.props.keyProp], false, true, false);
        }
        else if (e.ctrlKey || e.metaKey) {
            // ctrl or cmd/meta, e.g. add to selection
            if (!self.props.highlighted || self.props.highlighted.indexOf(node[self.props.keyProp]) === -1) {
                let  highlighted = clone(self.props.highlighted || []);
                if (self.props.folderSelectNotAllowed) {
                    if (node.t === 1 && highlighted.length > 0) {
                        return;
                    }
                    else if (
                        highlighted.filter(function(nodeId) {
                            var node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1;
                        }).length > 0) {
                        // contains folders in selection
                        selectionManager.clear_selection();
                    }
                }
                selectionManager.add_to_selection(node[self.props.keyProp]);
            }
            else if (self.props.highlighted && self.props.highlighted.indexOf(node[self.props.keyProp]) !== -1) {
                let highlighted = clone(self.props.highlighted || []);
                if (self.props.folderSelectNotAllowed) {
                    if (node.t === 1) {
                        return;
                    }
                    else if (
                        highlighted.filter(function(nodeId) {
                            var node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1;
                        }).length > 0) {
                        // contains folders in selection
                        selectionManager.clear();
                    }
                }
                selectionManager.remove_from_selection(node[self.props.keyProp]);
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

        var share = M.getNodeShare(node);
        if (share && share.down) {
            // node is taken down -> no interactions available
            return;
        }

        if (node.t) {
            // expand folder
            self.props.onExpand(node);
            self.forceUpdate();
        }
        else {
            self.onEntryClick(e, node);
            self.props.onAttachClicked();
        }
    }
    customIsEventuallyVisible() {
        return true;
    }
    toggleSortBy(colId) {
        var newState = {};
        if (this.state.sortBy[0] === colId) {
            newState.sortBy = [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"];
        }
        else {
            newState.sortBy = [colId, "asc"];
        }

        this.setState(newState);

        this.props.onSortByChanged(newState.sortBy);
    }
    render() {
        var viewMode = this.props.viewMode;

        let listAdapterOpts = this.props.listAdapterOpts || {};

        if (!viewMode) {
            listAdapterOpts.columns = [
                ColumnFavIcon,
                ColumnNodeName,
                ColumnSize,
                ColumnTimeAdded,
                ColumnExtras
            ];
        }
        if (this.props.listAdapterColumns) {
            listAdapterOpts.columns = this.props.listAdapterColumns;
        }

        if (this.props.isLoading) {
            return (
                <div className="dialog-empty-block active dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <i className="sprite-fm-mono icon-cloud-drive" />
                        <div className="dialog-empty-header">
                            {l[5533]}
                        </div>
                    </div>
                </div>
            );
        }
        else if (!this.props.entries.length && this.props.currentlyViewedEntry === 'search') {
            return (
                <div className="dialog-empty-block active dialog-fm folder">
                    <div className="dialog-empty-pad">
                        <i  className="sprite-fm-mono icon-preview-reveal" />
                        <div className="dialog-empty-header">
                            {l[978]}
                        </div>
                    </div>
                </div>
            );
        }
        else if (!this.props.entries.length) {
            const nilComp = this.props.NilComponent;
            return (
                nilComp && (typeof nilComp === "function" ? nilComp() : nilComp) ||
                <div className="dialog-empty-block active dialog-fm folder">
                    {
                        this.props.currentlyViewedEntry === 'shares' ?
                            <div className="dialog-empty-pad">
                                <i className="sprite-fm-mono icon-folder-incoming-share-filled"/>
                                <div className="dialog-empty-header">
                                    {l[6871]}
                                </div>
                            </div>
                            :
                            <div className="dialog-empty-pad">
                                <i className="sprite-fm-mono icon-folder-filled"/>
                                <div className="dialog-empty-header">
                                    {this.props.currentlyViewedEntry === M.RootID ? l[1343] : (
                                        M.u[this.props.currentlyViewedEntry] ? l[6787] : l[782]
                                    )}
                                </div>
                            </div>
                    }
                </div>
            );
        }

        return <MegaList2
            viewMode={viewMode}
            sortBy={this.state.sortBy}
            currentlyViewedEntry={this.props.currentlyViewedEntry}
            selected={this.props.selected}
            highlighted={this.props.highlighted}
            containerClassName={this.props.containerClassName}
            nodeAdapterProps={{
                'onClick': (e, node) => {
                    this.onEntryClick(e, node);
                },
                'onDoubleClick': (e, node) => {
                    this.onEntryDoubleClick(e, node);
                },
                'className': (node) => {
                    return this.props.highlighted.indexOf(node[this.props.keyProp]) > -1 ? " ui-selected" : "";
                }
            }}
            ref={(r) => {
                this.megaList = r;
            }}
            listAdapter={viewMode ? Grid : Table}
            nodeAdapter={viewMode ? GenericGrid : GenericTable}
            listAdapterOpts={listAdapterOpts}
            entries={this.props.entries}
            itemHeight={this.props.megaListItemHeight}
            headerHeight={viewMode ? 0 : 36}
            header={!viewMode && <GenericTableHeader
                columns={listAdapterOpts.columns}
                sortBy={this.state.sortBy}
                onClick={this.toggleSortBy}
                headerContainerClassName={this.props.headerContainerClassName}
            />}
            currentdirid={this.props.currentdirid}
            onContextMenu={this.props.onContextMenu}
            keyProp={this.props.keyProp}
        />;
    }
}

