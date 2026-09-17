import React from 'react';
import ModalDialogsUI from './modalDialogs.jsx';
import Breadcrumbs from "./jsx/fm/breadcrumbs.jsx";
import FMView from "./jsx/fm/fmView.jsx";

const MIN_SEARCH_LENGTH = 2;

class CloudBrowserDialog extends ModalDialogsUI.SafeShowDialogController {
    domRef = React.createRef();
    dialogName = 'attach-cloud-dialog';

    static defaultProps = {
        'selectLabel': l[8023],
        'openLabel': l[1710],
        'cancelLabel': l.msg_dlg_cancel,
        'hideable': true,
        'className': ''
    };

    static getFilterFunction(customFilterFn, skipIncoming) {
        // XXX: Carefully check usages around the codebase before making any changes here...
        return tryCatch((n) => {
            // Filter non S4-container items

            if (n.s4 && n.p === M.RootID && M.getS4NodeType(n) === 'container') {
                return false;
            }

            if (!n.name || missingkeys[n.h] || M.getNodeShare(n).down) {
                return false;
            }

            if (skipIncoming && n.su) {
                return false;
            }

            return !customFilterFn || customFilterFn(n);
        });
    }

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
        this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
        this.onExpand = this.onExpand.bind(this);
    }

    getHeaderButtonsClass() {
        const classes = ['fm-header-buttons'];
        if (this.state.isActiveSearch) {
            classes.push('active-search');
        }
        return classes.join(' ');
    }

    getSearchPlaceholder() {
        switch (this.state.selectedTab) {
            case 's4': return l.dlg_search_s4;
            case 'shares': return l.dlg_search_share;
            default: return l.dlg_search_cd;
        }
    }

    getSearchIconClass() {
        const classes = ['sprite-fm-mono', 'icon-search-light-outline', 'left-icon'];
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
            loadingDialog.show('fmSearchNodes');
            M.fmSearchNodes(searchText).then(() => {
                newState.searchValue = searchText;
                newState.currentlyViewedEntry = 'search';
                this.clearSelectionAndHighlight();
            }).catch(dump).finally(() => {
                newState.nodeLoading = false;
                this.setState(newState);
                loadingDialog.hide('fmSearchNodes');
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

        // Clear the FMView's own selection manager (not the global one) so the
        // previously selected node loses its `ui-selected` state on tab/view change.
        if (this.fmView && this.fmView.selectionManager) {
            this.fmView.selectionManager.clear_selection();
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
        if (M.getNodeByHandle(nodeId).t) {
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
        assert(this.dialogBecameVisible);
        var self = this;

        const classes = `dialog-template-tool item-picker-type ${self.props.className}`;

        let folderIsHighlighted = false;
        let share = false;
        let isS4Cn = false;
        let isSearch = this.state.currentlyViewedEntry === 'search';
        const entryId = isSearch ? self.state.highlighted[0] : self.state.currentlyViewedEntry;
        const filterFn = CloudBrowserDialog.getFilterFunction(
            this.props.customFilterFn, !!this.props.hideIncoming
        );

        // Flag that the specific node is part of the `Incoming Shares` node chain;
        // The `Attach` button is not available for isIncomingShare nodes.
        let isIncomingShare = M.getNodeRoot(entryId) === "shares";

        this.state.highlighted.forEach(nodeId => {
            if (M.getNodeByHandle(nodeId).t) {
                folderIsHighlighted = true;

                // Is S4 Container selected
                if (M.tree.s4 && M.tree.s4[nodeId]) {
                    isS4Cn = true;
                }
            }
            share = M.getNodeShare(nodeId);
        });

        let buttons = [{
            label: this.props.cancelLabel,
            key: 'cancel',
            defaultClassname: 'nav-elem normal button action secondary',
            onClick: e => {
                e.preventDefault();
                e.stopPropagation();
                if (this.props.onCancel) {
                    this.props.onCancel(this);
                }
                this.props.onClose(this);
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
                    label: this.props.openLabel,
                    key: 'select',
                    className: `${className} ${highlighted.length > 1 ? 'disabled' : ''}`,
                    defaultClassname: 'nav-elem normal button action',
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
                    label: l[8023],
                    key: 'attach',
                    defaultClassname: 'nav-elem normal button action secondary',
                    className,
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
                                const fldName = frs.length > 1 ? l.fr_action_links_cancel : l.fr_action_link_cancel;
                                msgDialog(
                                    `warninga:!^${l.file_request_action_remove_prompt_button}!${l[82]}`,
                                    l[1003],
                                    l.file_request_action_remove_prompt_title,
                                    fldName,
                                    (e) => {
                                        if (e === false) {
                                            mega.fileRequest
                                                .removeList(frs)
                                                .then(() => {
                                                    for (let i = 0; i < frs.length; i++) {
                                                        createPublicLink(frs[i]);
                                                    }
                                                })
                                                .catch(dump);
                                        }
                                    },
                                    1
                                );
                            }
                        });
                    }
                } : null
            );
        }

        if (!folderIsHighlighted || this.props.folderSelectable &&
            (!this.props.noShareFolderAttach || !(isIncomingShare && folderIsHighlighted))
        ) {
            buttons.push({
                label: this.props.selectLabel,
                key: 'select',
                defaultClassname: 'nav-elem normal button action',
                className: this.state.selected.length === 0
                    || share && share.down || isS4Cn ? "disabled" : "",
                onClick: e => {
                    if (this.state.selected.length > 0) {
                        this.props.onSelected(this.state.selected);
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
                    className="sprite-fm-mono icon-dialog-close-thin"
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
                className={`${classes} ${this.dialogName}`}
                onClose={() => {
                    self.props.onClose(self);
                }}
                dialogName="attach-cloud-dialog"
                popupDidMount={self.onPopupDidMount}
                hideCloseBtn={true}
                viewMode={0}
                buttons={buttons}>

                <section className="left-panel">
                    <div className="fm-picker-dialog-tree-panel">
                        <button
                            className={
                                `nav-elem text-only full-width` +
                                `${self.state.selectedTab === 'quick-access' ? ' active' : ''}`
                            }
                            onClick={() => self.handleTabChange('quick-access')}>
                            <i className="sprite-fm-mono icon-clock-thin-solid" />
                            <div className="text-box-wrapper">
                                <span className="primary-text">
                                    {l.frequent_access /* `Frequently accessed` */}
                                </span>
                            </div>
                        </button>
                        <button
                            className={
                                `nav-elem text-only full-width` +
                                `${self.state.selectedTab === M.RootID ? ' active' : ''}`
                            }
                            onClick={() => self.handleTabChange(M.RootID)}>
                            <i className="sprite-fm-mono icon-cloud-thin-outline" />
                            <div className="text-box-wrapper">
                                <span className="primary-text">
                                    {l[164] /* `Cloud Drive` */}
                                </span>
                            </div>
                        </button>
                        {!self.props.hideIncoming &&
                            <button
                                className={
                                    `nav-elem text-only full-width` +
                                    `${self.state.selectedTab === 'shares' ? ' active' : ''}`
                                }
                                onClick={() => self.handleTabChange('shares')}>
                                <i className="sprite-fm-mono icon-folder-users-thin-outline" />
                                <div className="text-box-wrapper">
                                    <span className="primary-text">
                                        {l[5542] /* `Incoming Shares` */}
                                    </span>
                                </div>
                            </button>
                        }
                        <button
                            className={
                                `nav-elem text-only full-width` +
                                `${self.state.selectedTab === 's4' ? ' active' : ''}` +
                                `${u_attr.s4 ? '' : ' hidden'}`
                            }
                            onClick={() => self.handleTabChange('s4')}>
                            <i className="sprite-fm-mono icon-bucket-triangle-thin-outline" />
                            <div className="text-box-wrapper">
                                <span className="primary-text">
                                    {l.obj_storage /* `S4 Object storage` */}
                                </span>
                            </div>
                        </button>
                    </div>
                </section>

                <section
                    ref={this.domRef}
                    className="content">
                    <div className="content-block header">
                        <h2>{self.props.title || l[8011]}</h2>
                        {self.state.selectedTab !== 'quick-access' &&
                            <div className="search-bar mega-input pm box-style">
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
                                    type="search"
                                    placeholder={self.getSearchPlaceholder()}
                                    value={self.state.searchText}
                                    onChange={self.onSearchChange}
                                    onBlur={() => {
                                        self.onSearchBlur();
                                    }}
                                />
                                {clearSearchBtn}
                            </div>
                        }
                    </div>

                    <div className="content-block breadcrumbs">
                        <div className="body">
                            {breadcrumbPath.length > 0 &&
                                <Breadcrumbs
                                    className="add-from-cloud"
                                    nodeId={entryId}
                                    path={breadcrumbPath}
                                    onNodeClick={this.onBreadcrumbNodeClick}
                                    isSearch={isSearch}
                                    /* trigger re-render */
                                    highlighted={this.state.highlighted}
                                    currentlyViewedEntry={this.state.currentlyViewedEntry}
                                />
                            }
                        </div>
                    </div>

                    <div className="content-block folder-container">
                        <FMView
                            ref={(fmView) => {
                                this.fmView = fmView;
                            }}
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
                            searchScope={this.state.selectedTab}
                            showOwner={true}
                            megaListItemHeight={34}
                            minSearchLength={MIN_SEARCH_LENGTH}
                            onExpand={this.onExpand}
                            viewMode={0}
                            shortGrid={this.props.shortGrid || true}
                            hideIncoming={this.props.hideIncoming}

                            /* fmconfig.sortmodes integration/support */
                            initialSortBy={['name', 'asc']}
                            fmConfigSortEnabled={true}
                            fmConfigSortId="cbd"
                        />
                    </div>
                </section>
            </ModalDialogsUI.ModalDialog>
        );
    }
}

Object.defineProperty(mega, 'CloudBrowserDialog', {value: CloudBrowserDialog});

export default {
    CloudBrowserDialog
};
