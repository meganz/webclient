import React from 'react';
import {MegaRenderMixin} from "../chat/mixins";
import ModalDialogsUI from './modalDialogs.jsx';
import ViewModeSelector from "./jsx/fm/viewModeSelector.jsx";
import Breadcrumbs from "./jsx/fm/breadcrumbs.jsx";
import FMView from "./jsx/fm/fmView.jsx";

const MIN_SEARCH_LENGTH = 2;

class CloudBrowserDialog extends MegaRenderMixin {
    domRef = React.createRef();

    static defaultProps = {
        'selectLabel': l[8023],
        'openLabel': l[1710],
        'cancelLabel': l[82],
        'hideable': true,
        'className': ''
    };

    constructor(props) {
        super(props);
        this.state = {
            'isActiveSearch': false,
            'selected': [],
            'highlighted': [],
            'currentlyViewedEntry': M.RootID,
            'selectedTab': M.RootID,
            'searchValue': '',
            'searchText': '',
        };

        this.onAttachClicked = this.onAttachClicked.bind(this);
        this.onClearSearchIconClick = this.onClearSearchIconClick.bind(this);
        this.onPopupDidMount = this.onPopupDidMount.bind(this);
        this.onSearchChange = this.onSearchChange.bind(this);
        this.onSearchIconClick = this.onSearchIconClick.bind(this);
        this.onSelected = this.onSelected.bind(this);
        this.onHighlighted = this.onHighlighted.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.onViewModeSwitch = this.onViewModeSwitch.bind(this);
        this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
        this.onExpand = this.onExpand.bind(this);
    }

    onViewModeSwitch(newMode) {
        let currentViewMode = mega.config.get('cbvm') | 0;
        if (newMode === currentViewMode) {
            return;
        }

        mega.config.set('cbvm', newMode);

        this.forceUpdate();
    }

    getHeaderButtonsClass() {
        const classes = ['fm-header-buttons'];
        if (this.state.isActiveSearch) {
            classes.push('active-search');
        }
        return classes.join(' ');
    }

    getSearchIconClass() {
        const classes = ['sprite-fm-mono', 'icon-preview-reveal'];
        if (this.state.isActiveSearch && this.state.searchText.length > 0) {
            classes.push('disabled');
        }
        return classes.join(' ');
    }

    onSearchIconClick() {
        const isActiveSearch = !this.state.isActiveSearch;

        if (isActiveSearch) {
            this.searchInput.focus();
            this.setState({
                'isActiveSearch': isActiveSearch
            });
        }
    }

    onClearSearchIconClick() {
        this.setState({
            'isActiveSearch': false,
            'searchValue': '',
            'searchText': '',
            'currentlyViewedEntry': this.state.selectedTab
        });
    }

    handleTabChange(selectedTab) {
        const s4Cn = selectedTab === 's4' && M.tree.s4 && Object.keys(M.tree.s4);

        // Clear selections when switching the tabs
        this.clearSelectionAndHighlight();

        this.setState({
            selectedTab,
            // Show the contents of S4 container if it is the only one
            currentlyViewedEntry: s4Cn && s4Cn.length === 1 ? s4Cn[0] : selectedTab,
            searchValue: '',
            searchText: '',
            isLoading: false
        });
    }

    onSearchBlur() {
        if (this.state.searchText === '') {
            this.setState({
                'isActiveSearch': false
            });
        }
    }

    onSearchChange(e) {
        var searchValue = e.target.value;
        const newState = {
            searchText: searchValue,
            nodeLoading: searchValue.length >= MIN_SEARCH_LENGTH,
        };
        if (searchValue && searchValue.length >= MIN_SEARCH_LENGTH) {
            this.setState(newState);
            delay('cbd:search-proc', this.searchProc.bind(this), 500);
            return;
        }
        if (this.state.currentlyViewedEntry === 'search' && (!searchValue || searchValue.length < MIN_SEARCH_LENGTH)) {
            newState.currentlyViewedEntry = this.state.selectedTab;
            newState.searchValue = undefined;
        }

        this.setState(newState);
        this.clearSelectionAndHighlight();
    }

    searchProc() {
        const { searchText } = this.state;
        const newState = {
            nodeLoading: true,
        };
        if (searchText && searchText.length >= MIN_SEARCH_LENGTH) {
            this.setState(newState);
            M.fmSearchNodes(searchText).then(() => {
                newState.nodeLoading = false;
                newState.searchValue = searchText;
                newState.currentlyViewedEntry = 'search';
                this.setState(newState);
                this.clearSelectionAndHighlight();
            });
        }
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

    clearSelectionAndHighlight() {
        this.onSelected([]);
        this.onHighlighted([]);
        if (selectionManager) {
            selectionManager.clear_selection();
        }
    }

    onPopupDidMount(elem) {
        this.domNode = elem;
    }

    onAttachClicked() {
        this.props.onAttachClicked();
    }

    onBreadcrumbNodeClick(nodeId) {
        if (nodeId === 'shares' || nodeId === 's4') {
            // Switch the active tab to `Incoming Shares`
            return this.handleTabChange(nodeId);
        }

        // Click to open allowed only on folders as breadcrumb nodes
        if (M.d[nodeId] && M.d[nodeId].t) {
            const nodeRoot = M.getNodeRoot(nodeId);

            this.setState({
                selectedTab: nodeRoot === "contacts" ? 'shares' : nodeRoot,
                currentlyViewedEntry: nodeId,
                selected: [],
                searchValue: '',
                searchText: '',
            });
        }
    }

    onExpand(nodeId) {
        this.setState({
            'currentlyViewedEntry': nodeId,
            'searchValue': '',
            'searchText': '',
            'selected': [],
            'highlighted': [],
        });
    }

    render() {
        var self = this;

        const viewMode = mega.config.get('cbvm') | 0;

        const classes = `add-from-cloud ${self.props.className} dialog-template-tool `;

        let folderIsHighlighted = false;
        let share = false;
        let isS4Cn = false;
        let isSearch = this.state.currentlyViewedEntry === 'search';
        const entryId = isSearch ? self.state.highlighted[0] : self.state.currentlyViewedEntry;

        // Filter non S4-container items
        const filterFn = entryId === M.RootID && M.tree.s4 ? n => !M.tree.s4[n.h] : null;

        // Flag that the specific node is part of the `Incoming Shares` node chain;
        // The `Attach` button is not available for isIncomingShare nodes.
        let isIncomingShare = M.getNodeRoot(entryId) === "shares";

        this.state.highlighted.forEach(nodeId => {
            if (M.d[nodeId] && M.d[nodeId].t === 1) {
                folderIsHighlighted = true;

                // Is S4 Container selected
                if (M.tree.s4 && M.tree.s4[nodeId]) {
                    isS4Cn = true;
                }
            }
            share = M.getNodeShare(nodeId);
        });

        let buttons = [{
            "label": this.props.cancelLabel,
            "key": "cancel",
            "onClick": e => {
                this.props.onClose(this);
                e.preventDefault();
                e.stopPropagation();
            }
        }];

        if (folderIsHighlighted) {
            const { highlighted } = this.state;
            const className = `${share && share.down ? 'disabled' : ''}`;
            const highlightedNode = highlighted && highlighted.length && highlighted[0];
            const allowAttachFolders = (
                this.props.allowAttachFolders &&
                !isIncomingShare &&
                !isS4Cn
            );

            buttons.push(
                {
                    "label": this.props.openLabel,
                    "key": "select",
                    className: `positive ${className} ${highlighted.length > 1 ? 'disabled' : ''}`,
                    onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (highlighted.length > 1) {
                            return;
                        }
                        this.setState({ currentlyViewedEntry: highlightedNode });
                        this.clearSelectionAndHighlight();
                        this.setState({ selected: [], searchValue: '', searchText: '', highlighted: [] });
                    }
                },
                allowAttachFolders ? {
                    "label": l[8023],
                    "key": "attach",
                    className: "positive " + className,
                    onClick: () => {
                        this.props.onClose();
                        onIdle(() => {
                            const createPublicLink = (h) => {
                                M.createPublicLink(h)
                                    .then(({link}) =>
                                        this.props.room.sendMessage(link)
                                    );
                            };
                            const frs = [];
                            const files = [];
                            for (let i = 0; i < highlighted.length; i++) {
                                const node = M.getNodeByHandle(highlighted[i]);
                                if (node && M.isFileNode(node)) {
                                    if (!M.getNodeShare(node).down) {
                                        files.push(node);
                                    }
                                }
                                else if (mega.fileRequestCommon.storage.isDropExist(highlighted[i]).length) {
                                    frs.push(highlighted[i]);
                                }
                                else {
                                    createPublicLink(highlighted[i]);
                                }
                            }

                            if (files.length) {
                                this.props.onSelected(files);
                                this.props.onAttachClicked();
                            }
                            if (frs.length) {
                                const fldName = frs.length > 1
                                    ? l[17626]
                                    : l[17403].replace('%1', escapeHTML(M.getNameByHandle(frs[0])) || l[1049]);
                                msgDialog('confirmation', l[1003], fldName, l[18229], (e) => {
                                    if (e) {
                                        mega.fileRequest
                                            .removeList(frs)
                                            .then(() => {
                                                for (let i = 0; i < frs.length; i++) {
                                                    createPublicLink(frs[i]);
                                                }
                                            })
                                            .catch(dump);
                                    }
                                });
                            }
                        });
                    }
                } : null
            );
        }

        if (!folderIsHighlighted || this.props.folderSelectable) {
            buttons.push({
                "label": this.props.selectLabel,
                "key": "select",
                "className": "positive " +
                    (this.state.selected.length === 0 || share && share.down || isS4Cn ? "disabled" : ""),
                "onClick": e => {
                    if (this.state.selected.length > 0) {
                        this.props.onSelected(
                            this.state.selected.filter(node => {
                                return !M.getNodeShare(node).down && !(M.tree.s4 && M.tree.s4[node.h]);
                            })
                        );
                        this.props.onAttachClicked();
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        var clearSearchBtn = null;
        if (self.state.searchText.length >= MIN_SEARCH_LENGTH) {
            clearSearchBtn = (
                <i
                    className="sprite-fm-mono icon-close-component"
                    onClick={() => {
                        self.onClearSearchIconClick();
                    }}
                >
                </i>
            );
        }

        let breadcrumbPath = M.getPath(entryId);

        return (
            <ModalDialogsUI.ModalDialog
                title={self.props.title || l[8011]}
                className={
                    classes +
                    // Amend the container height when the bottom breadcrumb is visible,
                    // i.e. in search mode, incl. having file/folder selected
                    (isSearch && this.state.selected.length > 0 ? 'has-breadcrumbs-bottom' : '')
                }
                onClose={() => {
                    self.props.onClose(self);
                }}
                dialogName="add-from-cloud-dialog dialog-template-tool"
                popupDidMount={self.onPopupDidMount}
                buttons={buttons}>

                <section
                    ref={this.domRef}
                    className="content">
                    <div className="content-block">
                        <div className="fm-dialog-tabs">
                            <div
                                className={`
                                    fm-dialog-tab cloud
                                    ${self.state.selectedTab === M.RootID ? 'active' : ''}
                                `}
                                onClick={() => self.handleTabChange(M.RootID)}>
                                {l[164] /* `Cloud Drive` */}
                            </div>
                            <div
                                className={`
                                    fm-dialog-tab incoming
                                    ${self.state.selectedTab === 'shares' ? 'active' : ''}
                                `}
                                onClick={() => self.handleTabChange('shares')}>
                                {l[5542] /* `Incoming Shares` */}
                            </div>
                            <div
                                className={`
                                    fm-dialog-tab s4
                                    ${self.state.selectedTab === 's4' ? 'active' : ''}
                                    ${u_attr.s4 ? '' : 'hidden'}
                                `}
                                onClick={() => self.handleTabChange('s4')}>
                                {l.obj_storage /* `S4 Object storage` */}
                            </div>
                            <div className="clear"></div>
                        </div>
                        <div className="fm-picker-header">
                            <div className={self.getHeaderButtonsClass()}>
                                <ViewModeSelector viewMode={viewMode} onChange={this.onViewModeSwitch} />
                                <div className="fm-files-search">
                                    <i
                                        className={self.getSearchIconClass()}
                                        onClick={() => {
                                            self.onSearchIconClick();
                                        }}
                                    />
                                    <input
                                        ref={(input) => {
                                            this.searchInput = input;
                                        }}
                                        type="search" placeholder={l[102]} value={self.state.searchText}
                                        onChange={self.onSearchChange}
                                        onBlur={() => {
                                            self.onSearchBlur();
                                        }}
                                    />
                                    {clearSearchBtn}
                                </div>
                                <div className="clear"></div>
                            </div>
                            {!isSearch &&
                                <Breadcrumbs
                                    className="add-from-cloud"
                                    nodeId={entryId}
                                    path={breadcrumbPath}
                                    onNodeClick={this.onBreadcrumbNodeClick}
                                    isSearch={isSearch}
                                    /* trigger re-render */
                                    highlighted={this.state.highlighted}
                                    currentlyViewedEntry={this.state.currentlyViewedEntry}
                                />}
                        </div>

                        <FMView
                            nodeLoading={this.state.nodeLoading}
                            sortFoldersFirst={true}
                            currentlyViewedEntry={this.state.currentlyViewedEntry}
                            customFilterFn={filterFn}
                            folderSelectNotAllowed={this.props.folderSelectNotAllowed}
                            folderSelectable={this.props.folderSelectable}
                            onSelected={this.onSelected}
                            onHighlighted={this.onHighlighted}
                            onAttachClicked={this.onAttachClicked}
                            initialSelected={this.state.selected}
                            initialHighlighted={this.state.highlighted}
                            searchValue={this.state.searchValue}
                            minSearchLength={MIN_SEARCH_LENGTH}
                            onExpand={this.onExpand}
                            viewMode={viewMode}

                            /* fmconfig.sortmodes integration/support */
                            initialSortBy={['name', 'asc']}
                            fmConfigSortEnabled={true}
                            fmConfigSortId="cbd"
                        />

                        {isSearch && breadcrumbPath.length > 0 && <div className={`
                            fm-breadcrumbs-wrapper add-from-cloud breadcrumbs-bottom
                        `}>
                            <div className="fm-breadcrumbs-block">
                                <Breadcrumbs
                                    nodeId={entryId}
                                    path={breadcrumbPath}
                                    onNodeClick={this.onBreadcrumbNodeClick}
                                    isSearch={isSearch}
                                    /* trigger re-render */
                                    highlighted={this.state.highlighted}
                                    currentlyViewedEntry={this.state.currentlyViewedEntry}
                                />
                                <div className="clear"></div>
                            </div>
                        </div>}
                    </div>
                </section>
            </ModalDialogsUI.ModalDialog>
        );
    }
}

window.CloudBrowserModalDialogUI = {
    CloudBrowserDialog,
};

export default {
    CloudBrowserDialog
};
