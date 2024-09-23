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
        let curr;
        const { folderSelectNotAllowed } = this.props;
        if (shiftKey && folderSelectNotAllowed) {
            curr = selectionManager.last_selected;
        }

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

        if (shiftKey && folderSelectNotAllowed && $.selected.length > 1) {
            const folderNodes = $.selected.filter(n => !M.isFileNode(M.getNodeByHandle(n)));
            // To not suddenly lose a selection remove any other folders so only one is selected.
            if (folderNodes.length > 1) {
                if (!M.isFileNode(M.getNodeByHandle(curr))) {
                    array.remove(folderNodes, curr);
                }
                if (folderNodes.length) {
                    const newCurr = selectionManager.last_selected;
                    for (let i = 0; i < folderNodes.length; i++) {
                        selectionManager.remove_from_selection(folderNodes[i]);
                    }
                    // Reset the selectionManager to have the last_selected be an appropriate node.
                    if (M.isFileNode(M.getNodeByHandle(newCurr))) {
                        selectionManager.set_currently_selected(curr);
                    }
                    else if (curr && $.selected.includes(curr)) {
                        selectionManager.set_currently_selected(curr);
                    }
                    else if ($.selected.length) {
                        selectionManager.set_currently_selected($.selected[0]);
                    }
                }
            }
        }
    }

    _invalidKeydownTarget(e) {
        return e.target && (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'BUTTON' ||
            (e.target.tagName === 'TEXTAREA' && !e.target.classList.contains('messages-textarea')) ||
            e.target.tagName === 'SELECT');
    }

    _isNavigationKeyDown(e, keyCode) {
        const { KEYS } = BrowserEntries;
        const { viewMode } = this.props;
        return !e.metaKey &&
        (
            !viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN) ||
            viewMode && (
                keyCode === KEYS.UP || keyCode === KEYS.DOWN || keyCode === KEYS.LEFT || keyCode === KEYS.RIGHT
            )
        );
    }

    bindEvents() {
        const { KEYS } = BrowserEntries;

        $(document.body).rebind(`keydown.be${this.getUniqueId()}`, (e) => {
            let charTyped = false;
            const keyCode = e.which || e.keyCode;
            const $searchField = $('div.fm-files-search input');
            const $typingArea = $('textarea.messages-textarea');
            const { selectionManager, viewMode } = this.props;

            if (this._invalidKeydownTarget(e)) {
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

            if (keyCode === KEYS.A && (e.ctrlKey || e.metaKey)) {
                this.handleSelectAll();
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.metaKey && keyCode === KEYS.UP || keyCode === KEYS.BACKSPACE) {
                this.handleKeyBack();
            }
            else if (this._isNavigationKeyDown(e, keyCode)) {
                this.handleKeyNavigation(selectionManager, e.shiftKey, keyCode, viewMode);
            }
            else if (
                keyCode >= 48 && keyCode <= 57 ||
                keyCode >= 65 && keyCode <= 123 ||
                keyCode > 255
            ) {
                charTyped = String.fromCharCode(keyCode).toLowerCase();
                this.handleCharTyped(charTyped);
            }
            else if (keyCode === KEYS.ENTER || e.metaKey && keyCode === KEYS.DOWN) {
                this.handleAttach();
            }

            // Re-render selected node/s to info panel
            mega.ui.mInfoPanel.reRenderIfVisible($.selected);

            // reset the quick finding feature vars if this was not a "quick find", e.g. charTyped was left empty.
            if (!charTyped) {
                this.lastCharKeyPressed = false;
                this.lastCharKeyIndex = -1;
            }
            // enter
        });
    }

    handleSelectAll() {
        const { selectionManager, folderSelectNotAllowed, entries } = this.props;
        selectionManager.select_all();
        if (folderSelectNotAllowed) {
            const folders = entries.filter(h => !M.isFileNode(M.getNodeByHandle(h)));
            for (let i = 0; i < folders.length; i++) {
                selectionManager.remove_from_selection(folders[i].h);
            }
        }
    }

    handleKeyBack() {
        const { viewMode, currentlyViewedEntry } = this.props;
        if (!viewMode) {
            const currentFolder = M.getNode(currentlyViewedEntry);
            if (currentFolder.p) {
                this.expandFolder(currentFolder.p);
            }
        }
    }

    handleCharTyped(charTyped) {
        const { entries, keyProp, selectionManager } = this.props;
        const foundMatchingNodes = entries.filter((node) => {
            return node.name && node.name.substring(0, 1).toLowerCase() === charTyped;
        });

        if (this.lastCharKeyPressed === charTyped) {
            this.lastCharKeyIndex++;
        }

        this.lastCharKeyPressed = charTyped;

        if (foundMatchingNodes.length > 0) {
            if (!foundMatchingNodes[this.lastCharKeyIndex]) {
                // start from the first entry
                this.lastCharKeyIndex = 0;
            }
            const foundNode = foundMatchingNodes[this.lastCharKeyIndex];
            selectionManager.clear_selection();
            selectionManager.set_currently_selected(foundNode[keyProp], true);
        }
    }

    handleAttach() {
        const { highlighted, folderSelectNotAllowed, entries, keyProp, onAttachClicked } = this.props;
        let selectedNodes = highlighted;

        if (folderSelectNotAllowed) {
            // remove all folders from highlighted
            selectedNodes = highlighted.filter(h => {
                const node = entries.find(e => e[keyProp] === h);
                return node && node.t === 0;
            });
            // if only folders were selected and no files do open the cursor OR first folder selected
            if (selectedNodes.length === 0) {
                const cursorNode = highlighted[0] && M.getNodeByHandle(highlighted[0]);
                if (cursorNode.t === 1) {
                    this.expandFolder(cursorNode[keyProp]);
                    return;
                }
                else if (highlighted.length > 0) {
                    // open/expand the first node, we know it's a folder already.
                    this.expandFolder(highlighted[0]);
                    return;
                }
                // else, nothing selected, do nothing.
                return;
            }
        }
        onAttachClicked(selectedNodes);
    }

    unbindEvents() {
        $(document.body).off('keydown.be' + this.getUniqueId());
    }

    onEntryClick(e, node) {
        const { selectionManager, keyProp, folderSelectNotAllowed, highlighted = [] } = this.props;

        this.lastCharKeyPressed = false;
        this.lastCharKeyIndex = -1;

        e.stopPropagation();
        e.preventDefault();

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            selectionManager.clear_selection();
            selectionManager.set_currently_selected(node[keyProp]);
        }
        else if (e.shiftKey) {
            if ($.selected && $.selected.length) {
                let selFolders;
                if (folderSelectNotAllowed) {
                    selFolders = $.selected.filter(n => !M.isFileNode(M.getNodeByHandle(n)));
                }
                selectionManager.shift_select_to(node[keyProp], false, true, false);
                if (folderSelectNotAllowed && $.selected.length > 1) {
                    const folderNodes = $.selected.filter(n => !M.isFileNode(M.getNodeByHandle(n)));
                    if (folderNodes.length > 1) {
                        array.remove(folderNodes, selFolders[0] || folderNodes[0]);
                        for (let i = 0; i < folderNodes.length; i++) {
                            selectionManager.remove_from_selection(folderNodes[i]);
                        }
                    }
                }
            }
            else {
                selectionManager.set_currently_selected(node[keyProp]);
            }
        }
        else if (e.ctrlKey || e.metaKey) {
            // ctrl or cmd/meta, e.g. add to selection
            if (!highlighted || !highlighted.includes(node[keyProp])) {
                if (folderSelectNotAllowed) {
                    if (node.t === 1 && highlighted.length > 0) {
                        return;
                    }
                    else if (
                        highlighted.some((nodeId) => {
                            const node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1;
                        })) {
                        // contains folders in selection
                        selectionManager.clear_selection();
                    }
                }
                selectionManager.add_to_selection(node[keyProp]);
            }
            else if (highlighted && highlighted.includes(node[keyProp])) {
                if (folderSelectNotAllowed) {
                    if (node.t === 1) {
                        return;
                    }
                    else if (
                        highlighted.some((nodeId) => {
                            const node = M.getNodeByHandle(nodeId);
                            return node && node.t === 1;
                        })) {
                        // contains folders in selection
                        selectionManager.clear();
                    }
                }
                selectionManager.remove_from_selection(node[keyProp]);
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

                    // Re-render selected node/s to info panel
                    mega.ui.mInfoPanel.reRenderIfVisible($.selected);
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

