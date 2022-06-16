import React from 'react';
import {MegaRenderMixin} from "../chat/mixins";
import ModalDialogsUI from './modalDialogs.jsx';
import ViewModeSelector from "./jsx/fm/viewModeSelector.jsx";
import Breadcrumbs from "./jsx/fm/breadcrumbs.jsx";
import FMView from "./jsx/fm/fmView.jsx";

class CloudBrowserDialog extends MegaRenderMixin {
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
            'selected': [],
            'highlighted': [],
            'currentlyViewedEntry': M.RootID,
            'selectedTab': 'clouddrive',
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
    onSearchIconClick(e, node) {
        var $parentBlock = $(e.target).closest(".fm-header-buttons");

        if ($parentBlock.hasClass("active-search")) {
            $parentBlock.removeClass("active-search");
        }
        else {
            $parentBlock.addClass("active-search");
            $('input', $parentBlock).trigger("focus");
        }
    }
    onClearSearchIconClick() {
        var self = this;


        self.setState({
            'searchValue': '',
            'searchText': '',
            'currentlyViewedEntry': M.RootID
        });
    }

    handleTabChange(selectedTab) {
        this.setState({
            selectedTab,
            currentlyViewedEntry: selectedTab === 'shares' ? 'shares' : M.RootID,
            searchValue: '',
            searchText: '',
            isLoading: false
        });
    }
    onSearchChange(e) {
        var searchValue = e.target.value;
        const newState = {
            searchText: searchValue
        };
        if (searchValue && searchValue.length >= 3) {
            this.setState(newState);
            delay('cbd:search-proc', this.searchProc.bind(this), 500);
            return;
        }
        if (this.state.currentlyViewedEntry === 'search' && (!searchValue || searchValue.length < 3)) {
            newState.currentlyViewedEntry = M.RootID;
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
        if (searchText && searchText.length >= 3) {
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
    }
    onPopupDidMount(elem) {
        this.domNode = elem;
    }
    onAttachClicked() {
        this.props.onAttachClicked();
    }
    onBreadcrumbNodeClick(nodeId) {
        if (nodeId === 'shares') {
            // Switch the active tab to `Incoming Shares`
            return this.handleTabChange('shares');
        }

        // Click to open allowed only on folders as breadcrumb nodes
        if (M.d[nodeId] && M.d[nodeId].t) {
            const nodeRoot = M.getNodeRoot(nodeId);
            this.setState({
                selectedTab: nodeRoot === 'shares' || nodeRoot === "contacts" ? 'shares' : 'clouddrive',
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
        let isSearch = this.state.currentlyViewedEntry === 'search';
        const entryId = isSearch ? self.state.highlighted[0] : self.state.currentlyViewedEntry;

        // Flag that the specific node is part of the `Incoming Shares` node chain;
        // The `Attach` button is not available for isIncomingShare nodes.
        let isIncomingShare = M.getNodeRoot(entryId) === "shares";


        this.state.highlighted.forEach(nodeId => {
            if (M.d[nodeId] && M.d[nodeId].t === 1) {
                folderIsHighlighted = true;
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
                !isIncomingShare
            );

            buttons.push(
                {
                    "label": this.props.openLabel,
                    "key": "select",
                    className: "positive " + className,
                    onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();

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
                            const createPublicLink = () => {
                                M.createPublicLink(highlightedNode)
                                    .then(({ link }) =>
                                        this.props.room.sendMessage(link)
                                    );
                            };

                            return (
                                mega.megadrop.isDropExist(highlightedNode).length ?
                                    msgDialog(
                                        'confirmation',
                                        // `Confirm removal`
                                        l[1003],
                                        // `By doing this you will cancel your MEGAdrop setup for the folder named %1`
                                        l[17403].replace('%1', escapeHTML(highlightedNode.name)),
                                        // `Do you want to proceed?`
                                        l[18229],
                                        (e) => {
                                            if (e) {
                                                mega.megadrop.pufRemove([highlightedNode]);
                                                mega.megadrop.pufCallbacks[highlightedNode] = { del: createPublicLink };
                                            }
                                        }
                                    ) :
                                    createPublicLink()
                            );
                        });
                    }
                } : null,
            );
        }

        if (!folderIsHighlighted || this.props.folderSelectable) {
            buttons.push({
                "label": this.props.selectLabel,
                "key": "select",
                "className": "positive " +
                    (this.state.selected.length === 0 || (share && share.down) ? "disabled" : ""),
                "onClick": e => {
                    if (this.state.selected.length > 0) {
                        this.props.onSelected(
                            this.state.selected.filter(node => !M.getNodeShare(node).down)
                        );
                        this.props.onAttachClicked();
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        var clearSearchBtn = null;
        if (self.state.searchText.length >= 3) {
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

                <section className="content">
                    <div className="content-block">
                        <div className="fm-dialog-tabs">
                            <div
                                className={`
                                    fm-dialog-tab cloud
                                    ${self.state.selectedTab === 'clouddrive' ? 'active' : ''}
                                `}
                                onClick={() => self.handleTabChange('clouddrive')}>
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
                            <div className="clear"></div>
                        </div>
                        <div className="fm-picker-header">
                            <div className="fm-header-buttons">
                                <ViewModeSelector viewMode={viewMode} onChange={this.onViewModeSwitch} />
                                <div className="fm-files-search">
                                    <i className="sprite-fm-mono icon-preview-reveal"
                                        onClick={(e) => {
                                            self.onSearchIconClick(e);
                                        }}>
                                    </i>
                                    <input type="search" placeholder={l[102]} value={self.state.searchText}
                                        onChange={self.onSearchChange} />
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
                            folderSelectNotAllowed={this.props.folderSelectNotAllowed}
                            onSelected={this.onSelected}
                            onHighlighted={this.onHighlighted}
                            onAttachClicked={this.onAttachClicked}
                            initialSelected={this.state.selected}
                            initialHighlighted={this.state.highlighted}
                            searchValue={this.state.searchValue}
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
