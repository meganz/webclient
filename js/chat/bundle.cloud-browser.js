/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[313],{

 9512
(_, EXP_, REQ_) {

// ESM COMPAT FLAG
REQ_.r(EXP_);

// EXPORTS
REQ_.d(EXP_, {
  "default": () =>  cloudBrowserModalDialog
});

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/ui/modalDialogs.jsx + 1 modules
const modalDialogs = REQ_(8120);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/ui/jsx/fm/breadcrumbs.jsx


class Breadcrumbs extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      'breadcrumbDropdownVisible': false
    };
    this.onGlobalClickHandler = this.onGlobalClickHandler.bind(this);
    this.onBreadcrumbNodeClick = this.onBreadcrumbNodeClick.bind(this);
  }
  getBreadcrumbNodeText(nodeId, prevNodeId) {
    const backupsId = M.BackupsId || 'backups';
    switch (nodeId) {
      case M.RootID:
        return l[164];
      case M.RubbishID:
        return l[167];
      case backupsId:
        return l.restricted_folder_button;
      case 'shares':
        return prevNodeId && M.d[prevNodeId] ? M.d[prevNodeId].m : l[5589];
      default:
        return M.d[nodeId] && M.d[nodeId].name;
    }
  }
  getBreadcrumbDropdownContents(items) {
    const contents = [];
    for (const item of items) {
      if (!item.name) {
        continue;
      }
      contents.push(JSX_("a", {
        className: "crumb-drop-link",
        key: `drop_link_${  item.nodeId}`,
        onClick: e => this.onBreadcrumbNodeClick(e, item.nodeId)
      }, JSX_("span", null, item.name)));
    }
    return contents;
  }
  onBreadcrumbNodeClick(e, nodeId) {
    e.preventDefault();
    e.stopPropagation();
    if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
      this.setState({
        'breadcrumbDropdownVisible': false
      });
    }
    this.props.onNodeClick(nodeId);
  }
  customIsEventuallyVisible() {
    return true;
  }
  onGlobalClickHandler(e) {
    let _this$domRef;
    const node = (_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current;
    if (node.contains(e.target) || node === e.target) {
      return;
    }
    if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
    }
    this.setState({
      'breadcrumbDropdownVisible': false
    });
  }
  removeGlobalClickHandler() {
    this._clickToHideListener = false;
    document.body.removeEventListener("click", this.onGlobalClickHandler);
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    if (this.state.breadcrumbDropdownVisible) {
      if (!this._clickToHideListener) {
        this._clickToHideListener = true;
        document.body.addEventListener("click", this.onGlobalClickHandler);
      }
    } else if (this._clickToHideListener) {
      this.removeGlobalClickHandler();
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    this.removeGlobalClickHandler();
  }
  render() {
    const {
      className,
      highlighted,
      currentlyViewedEntry,
      isSearch,
      path
    } = this.props;
    const breadcrumb = [];
    const extraPathItems = [];
    let breadcrumbDropdownContents = [];
    const entryId = isSearch ? highlighted[0] : currentlyViewedEntry;
    if (entryId !== undefined) {
      (path || M.getPath(entryId)).forEach((nodeId, k, path) => {
        let breadcrumbClasses = '';
        let folderType = 'folder';
        if (nodeId === M.RootID) {
          breadcrumbClasses += " cloud-drive";
        } else {
          breadcrumbClasses += " folder";
        }
        if (nodeId.length === 11 && M.u[nodeId]) {
          return;
        }
        if (nodeId === "shares") {
          breadcrumbClasses += " shared-with-me";
        }
        const prevNodeId = path[k - 1];
        let nodeName = this.getBreadcrumbNodeText(nodeId, prevNodeId);
        if ('utils' in s4) {
          const data = s4.utils.getBreadcrumbsData(nodeId);
          if (data) {
            ({
              type: folderType,
              localeName: nodeName
            } = data);
          }
        }
        if (!nodeName) {
          return;
        }
        ((nodeId, k) => {
          if (k < 4) {
            breadcrumb.unshift(JSX_("a", {
              className: `fm-breadcrumbs contains-directories ${  breadcrumbClasses}`,
              key: nodeId,
              onClick: e => this.onBreadcrumbNodeClick(e, nodeId)
            }, JSX_("span", {
              className: "right-arrow-bg simpletip selectable-txt",
              "data-simpletip": nodeName
            }, JSX_("span", {
              className: "selectable-txt"
            }, nodeName)), k !== 0 && JSX_("i", {
              className: "sprite-fm-mono icon-chevron-right-thin-outline"
            })));
          } else {
            folderType = nodeId === M.RootID ? 'cloud-drive' : folderType;
            if (M.BackupsId && nodeId === M.BackupsId) {
              folderType = 'backups';
            }
            extraPathItems.push({
              name: nodeName,
              type: folderType,
              nodeId
            });
          }
        })(nodeId, k);
      });
      if (extraPathItems.length > 0) {
        breadcrumbDropdownContents = this.getBreadcrumbDropdownContents(extraPathItems);
      }
    }
    return JSX_("div", {
      ref: this.domRef,
      className: `
                    fm-breadcrumbs-wrapper
                    ${className || ''}
                `
    }, JSX_("div", {
      className: "fm-breadcrumbs-block"
    }, breadcrumbDropdownContents.length ? JSX_(REaCt().Fragment, null, JSX_("div", {
      className: "crumb-overflow-link"
    }, JSX_("a", {
      className: "breadcrumb-dropdown-link dropdown",
      onClick: () => {
        this.setState({
          breadcrumbDropdownVisible: !this.state.breadcrumbDropdownVisible
        });
      }
    }, JSX_("i", {
      className: "menu-icon sprite-fm-mono icon-options icon16"
    })), JSX_("i", {
      className: "sprite-fm-mono icon-arrow-right icon16"
    })), breadcrumb) : breadcrumb), breadcrumbDropdownContents.length ? JSX_("div", {
      className: this.state.breadcrumbDropdownVisible ? 'breadcrumb-dropdown active' : 'breadcrumb-dropdown'
    }, breadcrumbDropdownContents) : '');
  }
}
// EXTERNAL MODULE: ./js/ui/jsx/fm/fmView.jsx + 10 modules
const fmView = REQ_(872);
;// ./js/ui/cloudBrowserModalDialog.jsx




const MIN_SEARCH_LENGTH = 2;
class CloudBrowserDialog extends modalDialogs.A.SafeShowDialogController {
  static getFilterFunction(customFilterFn, skipIncoming) {
    return tryCatch(n => {
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
    this.domRef = REaCt().createRef();
    this.dialogName = 'attach-cloud-dialog';
    this.state = {
      'isActiveSearch': false,
      'selected': [],
      'highlighted': [],
      'currentlyViewedEntry': M.RootID,
      'selectedTab': M.RootID,
      'searchValue': '',
      'searchText': ''
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
      case 's4':
        return l.dlg_search_s4;
      case 'shares':
        return l.dlg_search_share;
      default:
        return l.dlg_search_cd;
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
        isActiveSearch
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
    this.clearSelectionAndHighlight();
    this.setState({
      selectedTab,
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
    const searchValue = e.target.value;
    const newState = {
      searchText: searchValue,
      nodeLoading: searchValue.length >= MIN_SEARCH_LENGTH
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
    const {
      searchText
    } = this.state;
    const newState = {
      nodeLoading: true
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
    this.setState({
      'selected': nodes
    });
    this.props.onSelected(nodes);
  }
  onHighlighted(nodes) {
    this.setState({
      'highlighted': nodes
    });
    if (this.props.onHighlighted) {
      this.props.onHighlighted(nodes);
    }
  }
  clearSelectionAndHighlight() {
    this.onSelected([]);
    this.onHighlighted([]);
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
      return this.handleTabChange(nodeId);
    }
    if (M.getNodeByHandle(nodeId).t) {
      const nodeRoot = M.getNodeRoot(nodeId);
      this.setState({
        selectedTab: nodeRoot === "contacts" ? 'shares' : nodeRoot,
        currentlyViewedEntry: nodeId,
        selected: [],
        searchValue: '',
        searchText: ''
      });
    }
  }
  onExpand(nodeId) {
    this.setState({
      'currentlyViewedEntry': nodeId,
      'searchValue': '',
      'searchText': '',
      'selected': [],
      'highlighted': []
    });
  }
  render() {
    assert(this.dialogBecameVisible);
    const self = this;
    const classes = `dialog-template-tool item-picker-type ${self.props.className}`;
    let folderIsHighlighted = false;
    let share = false;
    let isS4Cn = false;
    const isSearch = this.state.currentlyViewedEntry === 'search';
    const entryId = isSearch ? self.state.highlighted[0] : self.state.currentlyViewedEntry;
    const filterFn = CloudBrowserDialog.getFilterFunction(this.props.customFilterFn, !!this.props.hideIncoming);
    const isIncomingShare = M.getNodeRoot(entryId) === "shares";
    this.state.highlighted.forEach(nodeId => {
      if (M.getNodeByHandle(nodeId).t) {
        folderIsHighlighted = true;
        if (M.tree.s4 && M.tree.s4[nodeId]) {
          isS4Cn = true;
        }
      }
      share = M.getNodeShare(nodeId);
    });
    const buttons = [{
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
      const {
        highlighted
      } = this.state;
      const className = `${share && share.down ? 'disabled' : ''}`;
      const highlightedNode = highlighted && highlighted.length && highlighted[0];
      const allowAttachFolders = this.props.allowAttachFolders && !isIncomingShare && !isS4Cn;
      buttons.push({
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
          this.setState({
            currentlyViewedEntry: highlightedNode
          });
          this.clearSelectionAndHighlight();
          this.setState({
            selected: [],
            searchValue: '',
            searchText: '',
            highlighted: []
          });
        }
      }, allowAttachFolders ? {
        label: l[8023],
        key: 'attach',
        defaultClassname: 'nav-elem normal button action secondary',
        className,
        onClick: () => {
          this.props.onClose();
          onIdle(() => {
            const createPublicLink = h => {
              M.createPublicLink(h).then(({
                link
              }) => this.props.room.sendMessage(link));
            };
            const frs = [];
            const files = [];
            for (let i = 0; i < highlighted.length; i++) {
              const node = M.getNodeByHandle(highlighted[i]);
              if (node && M.isFileNode(node)) {
                if (!M.getNodeShare(node).down) {
                  files.push(node);
                }
              } else if (mega.fileRequestCommon.storage.isDropExist(highlighted[i]).length) {
                frs.push(highlighted[i]);
              } else {
                createPublicLink(highlighted[i]);
              }
            }
            if (files.length) {
              this.props.onSelected(files);
              this.props.onAttachClicked();
            }
            if (frs.length) {
              const fldName = frs.length > 1 ? l.fr_action_links_cancel : l.fr_action_link_cancel;
              msgDialog(`warninga:!^${l.file_request_action_remove_prompt_button}!${l[82]}`, l[1003], l.file_request_action_remove_prompt_title, fldName, e => {
                if (e === false) {
                  mega.fileRequest.removeList(frs).then(() => {
                    for (let i = 0; i < frs.length; i++) {
                      createPublicLink(frs[i]);
                    }
                  }).catch(dump);
                }
              }, 1);
            }
          });
        }
      } : null);
    }
    if (!folderIsHighlighted || this.props.folderSelectable && (!this.props.noShareFolderAttach || !(isIncomingShare && folderIsHighlighted))) {
      buttons.push({
        label: this.props.selectLabel,
        key: 'select',
        defaultClassname: 'nav-elem normal button action',
        className: this.state.selected.length === 0 || share && share.down || isS4Cn ? "disabled" : "",
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
    let clearSearchBtn = null;
    if (self.state.searchText.length >= MIN_SEARCH_LENGTH) {
      clearSearchBtn = JSX_("i", {
        className: "sprite-fm-mono icon-dialog-close-thin",
        onClick: () => {
          self.onClearSearchIconClick();
        }
      });
    }
    const breadcrumbPath = M.getPath(entryId);
    return JSX_(modalDialogs.A.ModalDialog, {
      className: `${classes} ${this.dialogName}`,
      onClose: () => {
        self.props.onClose(self);
      },
      dialogName: "attach-cloud-dialog",
      popupDidMount: self.onPopupDidMount,
      hideCloseBtn: true,
      viewMode: 0,
      buttons
    }, JSX_("section", {
      className: "left-panel"
    }, JSX_("div", {
      className: "fm-picker-dialog-tree-panel"
    }, JSX_("button", {
      className: `nav-elem text-only full-width` + `${self.state.selectedTab === 'quick-access' ? ' active' : ''}`,
      onClick: () => self.handleTabChange('quick-access')
    }, JSX_("i", {
      className: "sprite-fm-mono icon-clock-thin-solid"
    }), JSX_("div", {
      className: "text-box-wrapper"
    }, JSX_("span", {
      className: "primary-text"
    }, l.frequent_access))), JSX_("button", {
      className: `nav-elem text-only full-width` + `${self.state.selectedTab === M.RootID ? ' active' : ''}`,
      onClick: () => self.handleTabChange(M.RootID)
    }, JSX_("i", {
      className: "sprite-fm-mono icon-cloud-thin-outline"
    }), JSX_("div", {
      className: "text-box-wrapper"
    }, JSX_("span", {
      className: "primary-text"
    }, l[164]))), !self.props.hideIncoming && JSX_("button", {
      className: `nav-elem text-only full-width` + `${self.state.selectedTab === 'shares' ? ' active' : ''}`,
      onClick: () => self.handleTabChange('shares')
    }, JSX_("i", {
      className: "sprite-fm-mono icon-folder-users-thin-outline"
    }), JSX_("div", {
      className: "text-box-wrapper"
    }, JSX_("span", {
      className: "primary-text"
    }, l[5542]))), JSX_("button", {
      className: `nav-elem text-only full-width` + `${self.state.selectedTab === 's4' ? ' active' : ''}` + `${u_attr.s4 ? '' : ' hidden'}`,
      onClick: () => self.handleTabChange('s4')
    }, JSX_("i", {
      className: "sprite-fm-mono icon-bucket-triangle-thin-outline"
    }), JSX_("div", {
      className: "text-box-wrapper"
    }, JSX_("span", {
      className: "primary-text"
    }, l.obj_storage))))), JSX_("section", {
      ref: this.domRef,
      className: "content"
    }, JSX_("div", {
      className: "content-block header"
    }, JSX_("h2", null, self.props.title || l[8011]), self.state.selectedTab !== 'quick-access' && JSX_("div", {
      className: "search-bar mega-input pm box-style"
    }, JSX_("i", {
      className: self.getSearchIconClass(),
      onClick: () => {
        self.onSearchIconClick();
      }
    }), JSX_("input", {
      ref: input => {
        this.searchInput = input;
      },
      type: "search",
      placeholder: self.getSearchPlaceholder(),
      value: self.state.searchText,
      onChange: self.onSearchChange,
      onBlur: () => {
        self.onSearchBlur();
      }
    }), clearSearchBtn)), JSX_("div", {
      className: "content-block breadcrumbs"
    }, JSX_("div", {
      className: "body"
    }, breadcrumbPath.length > 0 && JSX_(Breadcrumbs, {
      className: "add-from-cloud",
      nodeId: entryId,
      path: breadcrumbPath,
      onNodeClick: this.onBreadcrumbNodeClick,
      isSearch,
      highlighted: this.state.highlighted,
      currentlyViewedEntry: this.state.currentlyViewedEntry
    }))), JSX_("div", {
      className: "content-block folder-container"
    }, JSX_(fmView.A, {
      ref: fmView => {
        this.fmView = fmView;
      },
      nodeLoading: this.state.nodeLoading,
      sortFoldersFirst: true,
      currentlyViewedEntry: this.state.currentlyViewedEntry,
      customFilterFn: filterFn,
      folderSelectNotAllowed: this.props.folderSelectNotAllowed,
      folderSelectable: this.props.folderSelectable,
      onSelected: this.onSelected,
      onHighlighted: this.onHighlighted,
      onAttachClicked: this.onAttachClicked,
      initialSelected: this.state.selected,
      initialHighlighted: this.state.highlighted,
      searchValue: this.state.searchValue,
      searchScope: this.state.selectedTab,
      showOwner: true,
      megaListItemHeight: 34,
      minSearchLength: MIN_SEARCH_LENGTH,
      onExpand: this.onExpand,
      viewMode: 0,
      shortGrid: this.props.shortGrid || true,
      hideIncoming: this.props.hideIncoming,
      initialSortBy: ['name', 'asc'],
      fmConfigSortEnabled: true,
      fmConfigSortId: "cbd"
    }))));
  }
}
CloudBrowserDialog.defaultProps = {
  'selectLabel': l[8023],
  'openLabel': l[1710],
  'cancelLabel': l.msg_dlg_cancel,
  'hideable': true,
  'className': ''
};
 const cloudBrowserModalDialog = CloudBrowserDialog;

 },

 872
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  A: () =>  FMView
});

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
const esm_extends = REQ_(8168);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/ui/jsx/megaList/megaList2.jsx




class MegaList2 extends mixins.w9 {
  constructor(props) {
    super(props);
    this._calculated = false;
    this._firstRender = true;
    this.customIsEventuallyVisible = true;
    this.requiresUpdateOnResize = true;
    this.adapterChangedDoRepaint = false;
    assert(props.listAdapter, 'missing `listAdapter` for MegaList2');
    assert(props.nodeAdapter, 'missing `nodeAdapter` for MegaList2');
    assert(props.entries, 'missing `entries` for MegaList2');
    this.options = {
      extraRows: 8,
      batchPages: 0,
      perfectScrollOptions: {
        'handlers': ['click-rail', 'drag-thumb', 'wheel', 'touch'],
        'minScrollbarLength': 20
      }
    };
    this.onPsUserScroll = this.onPsUserScroll.bind(this);
    this.thumbsLoadingHandlers = new MapSet();
    this.thumbsThatRequireLoading = new MapSet();
    this.requestThumbnailCb = this.requestThumbnailCb.bind(this);
    this._throttledStage = 0;
  }
  specShouldComponentUpdate(nextProps) {
    let invalidate = false;
    if (nextProps.listAdapter.prototype.constructor.name !== this.props.listAdapter.prototype.constructor.name || nextProps.entries !== this.props.entries || nextProps.viewMode !== this.props.viewMode) {
      invalidate = true;
    }
    if (nextProps.sortBy !== this.props.sortBy || nextProps.currentlyViewedEntry !== this.props.currentlyViewedEntry) {
      invalidate = true;
      this.domRef.scrollToY(0);
    }
    if (invalidate) {
      this._calculated = false;
      this.adapterChangedDoRepaint = true;
      return true;
    }
    return null;
  }
  _recalculate() {
    if (this._calculated) {
      return this._calculated;
    }
    const calculated = this._calculated = Object.create(null);
    lazy(calculated, 'scrollWidth', () => {
      return this.domRef.getClientWidth();
    });
    lazy(calculated, 'scrollHeight', () => this.domRef.getClientHeight() - calculated.headerHeight);
    lazy(calculated, 'itemWidth', () => {
      if (this.props.listAdapter.itemWidth === false) {
        return calculated.scrollWidth;
      }
      return this.props.listAdapter.itemWidth;
    });
    lazy(calculated, 'itemHeight', () => {
      return this.props.itemHeight || this.props.listAdapter.itemHeight;
    });
    lazy(calculated, 'headerHeight', () => this.props.headerHeight || 0);
    lazy(calculated, 'contentWidth', () => {
      const contentWidth = this.domRef.getContentWidth();
      if (contentWidth) {
        return contentWidth;
      }
      return calculated.itemWidth;
    });
    lazy(calculated, 'itemsPerRow', () => {
      if (this.props.listAdapter.itemsPerRow) {
        return this.props.listAdapter.itemsPerRow;
      }
      return Math.max(1, Math.floor(calculated.contentWidth / calculated.itemWidth));
    });
    lazy(calculated, 'contentHeight', () => {
      return Math.ceil(this.props.entries.length / calculated.itemsPerRow) * calculated.itemHeight;
    });
    lazy(calculated, 'scrollLeft', () => {
      return this.domRef.getScrollPositionX();
    });
    lazy(calculated, 'scrollTop', () => {
      return this.domRef.getScrollPositionY();
    });
    lazy(calculated, 'scrolledPercentX', () => {
      return 100 / calculated.scrollWidth * calculated.scrollLeft;
    });
    lazy(calculated, 'scrolledPercentY', () => {
      return 100 / calculated.scrollHeight * calculated.scrollTop;
    });
    lazy(calculated, 'isAtTop', () => {
      return calculated.scrollTop === 0;
    });
    lazy(calculated, 'isAtBottom', () => {
      return calculated.scrollTop === calculated.scrollHeight;
    });
    lazy(calculated, 'itemsPerPage', () => {
      return Math.ceil(calculated.scrollHeight / calculated.itemHeight) * calculated.itemsPerRow;
    });
    lazy(calculated, 'visibleFirstItemNum', () => {
      let value = 0;
      value = Math.floor(Math.floor(calculated.scrollTop / calculated.itemHeight) * calculated.itemsPerRow);
      if (value > 0) {
        value = Math.max(0, value - this.options.extraRows * calculated.itemsPerRow);
      }
      return value;
    });
    lazy(calculated, 'visibleLastItemNum', () => {
      let value = Math.min(this.props.entries.length, Math.ceil(Math.ceil(calculated.scrollTop / calculated.itemHeight) * calculated.itemsPerRow + calculated.itemsPerPage));
      if (value < this.props.entries.length) {
        value = Math.min(this.props.entries.length, value + this.options.extraRows * calculated.itemsPerRow);
      }
      return value;
    });
    if (this.options.batchPages > 0) {
      const perPage = calculated.itemsPerPage;
      const visibleF = calculated.visibleFirstItemNum;
      calculated.visibleFirstItemNum = Math.max(0, ((visibleF - visibleF % perPage) / perPage - 1 - this.options.batchPages) * perPage);
      const visibleL = calculated.visibleLastItemNum;
      calculated.visibleLastItemNum = Math.min(this.props.entries.length, ((visibleL - visibleL % perPage) / perPage + 1 + this.options.batchPages) * perPage);
    }
    Object.defineProperty(M, 'rmItemsInView', {
      get: () => {
        const c = this.domRef && this._calculated || !1;
        return c.itemsPerPage + c.itemsPerRow | 0;
      },
      configurable: true
    });
  }
  _contentUpdated() {
    this._calculated = false;
    this._recalculate();
    if (this.listContent && this._lastContentHeight !== this._calculated.contentHeight) {
      this._lastContentHeight = this._calculated.contentHeight;
      this.listContent.style.height = `${this._calculated.contentHeight  }px`;
    }
    if (this.domRef && this._calculated.scrollHeight + this._calculated.scrollTop > this._calculated.contentHeight) {
      this.domRef.scrollToY(this._calculated.contentHeight - this._calculated.scrollHeight);
    }
    if (this.listAdapterInstance && this.listAdapterInstance.onContentUpdated) {
      this.listAdapterInstance.onContentUpdated();
    }
  }
  _getCalcsThatTriggerChange() {
    return `
            ${this.props.entries.length},${this._calculated.scrollHeight},${this._calculated.itemWidth},
            ${this._calculated.itemHeight},${this._calculated.contentWidth},${this._calculated.itemsPerRow}
            ${this._calculated.contentHeight},${this._calculated.visibleFirstItemNum},
            ${this._calculated.visibleLastItemNum}
        `;
  }
  indexOfEntry(nodeHandle, prop) {
    prop = prop || 'h';
    for (let i = 0; i < this.props.entries.length; i++) {
      const entry = this.props.entries[i];
      if (entry[prop] === nodeHandle) {
        return i;
      }
    }
    return -1;
  }
  scrollToItem(nodeHandle) {
    const elementIndex = this.indexOfEntry(nodeHandle);
    if (elementIndex === -1) {
      return false;
    }
    let shouldScroll = false;
    const itemOffsetTop = Math.floor(elementIndex / this._calculated.itemsPerRow) * this._calculated.itemHeight;
    const itemOffsetTopPlusHeight = itemOffsetTop + this._calculated.itemHeight;
    if (itemOffsetTop < this._calculated.scrollTop || itemOffsetTopPlusHeight > this._calculated.scrollTop + this._calculated.scrollHeight) {
      shouldScroll = true;
    }
    if (shouldScroll) {
      this.domRef.scrollToY(itemOffsetTop);
      onIdle(() => {
        this.safeForceUpdate();
      });
      return true;
    }
    return false;
  }
  onPsUserScroll() {
    if (!this.isMounted()) {
      return;
    }
    if (this._throttledStage++) {
      return;
    }
    const oldCalc = this._getCalcsThatTriggerChange();
    this._contentUpdated();
    const newCalc = this._getCalcsThatTriggerChange();
    if (oldCalc !== newCalc) {
      this.forceUpdate();
    }
    this._throttledStage = 0;
  }
  onResizeDoUpdate() {
    super.onResizeDoUpdate();
    this._contentUpdated();
  }
  componentDidMount() {
    super.componentDidMount();
    this._contentUpdated();
    this.forceUpdate();
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    this._contentUpdated();
    if (this.adapterChangedDoRepaint) {
      this.adapterChangedDoRepaint = false;
      this._calculated = false;
      this._recalculate();
    }
    if (this.thumbsThatRequireLoading.size) {
      delay('chat:mega-list2:thumb-loader', () => this.enqueueThumbnailRetrieval(), 20);
    }
    this._firstRender = this._firstRender || this.props.viewMode !== M.viewmode;
    if (this._firstRender && this.domRef) {
      let _this$domRef;
      this._firstRender = false;
      Ps.update((_this$domRef = this.domRef) == null ? void 0 : _this$domRef.$Node);
    }
  }
  enqueueThumbnailRetrieval() {
    const loaders = new Map(this.thumbsLoadingHandlers);
    const nodes = new Map(this.thumbsThatRequireLoading);
    const pending = [];
    const defaultCallback = (n, src, id) => {
      let img = document.getElementById(id || `chat_${n.h}`);
      if (img && (img = img.querySelector('img'))) {
        let _img$parentNode$paren;
        img.src = src;
        (_img$parentNode$paren = img.parentNode.parentNode) == null || _img$parentNode$paren.classList.add('thumb');
      }
    };
    const setSource = n => {
      if (thumbnails.has(n.fa)) {
        const src = thumbnails.get(n.fa);
        const batch = [...nodes.get(n.fa)];
        for (let i = batch.length; i--;) {
          const n = batch[i];
          const handlers = [...loaders.get(n.h)];
          for (let i = handlers.length; i--;) {
            let callback = handlers[i];
            if (typeof callback !== 'function') {
              callback = defaultCallback;
            }
            tryCatch(() => {
              const id = callback(n, src);
              if (id) {
                defaultCallback(n, src, id);
              }
            })();
          }
        }
        return true;
      }
    };
    for (const [, [n]] of nodes) {
      if (!setSource(n)) {
        pending.push(n);
      }
    }
    if (pending.length) {
      fm_thumbnails('standalone', pending, setSource);
    }
    this.thumbsLoadingHandlers.clear();
    this.thumbsThatRequireLoading.clear();
  }
  requestThumbnailCb(node, immediate, callback) {
    if (node && node.fa) {
      if (typeof immediate === 'function') {
        callback = immediate;
        immediate = 0;
      }
      node.seen = node.seen || -7;
      this.thumbsLoadingHandlers.set(node.h, callback);
      this.thumbsThatRequireLoading.set(node.fa, node);
      delay('chat:mega-list2:thumb-loader', () => this.enqueueThumbnailRetrieval(), immediate || 480);
    }
  }
  render() {
    if (this.isMounted() && !this._calculated) {
      this._recalculate();
    }
    const {
      listAdapter,
      listAdapterOpts,
      entries,
      nodeAdapterProps,
      viewMode,
      header,
      onContextMenu
    } = this.props;
    const className = `${listAdapter.containerClassName  } megaList megaList2`;
    const first = this._calculated.visibleFirstItemNum;
    const last = this._calculated.visibleLastItemNum;
    const nodes = [];
    for (let i = first; i < last; i++) {
      const node = entries[i];
      nodes.push(JSX_(this.props.nodeAdapter, (0,esm_extends.A)({
        key: `${i  }_${  node[this.props.keyProp]}`,
        h: node[this.props.keyProp],
        index: i,
        megaList: this,
        listAdapter,
        node,
        calculated: this._calculated,
        listAdapterOpts,
        onContextMenu,
        selected: this.props.selected ? this.props.selected.indexOf(node[this.props.keyProp]) > -1 : false,
        highlighted: this.props.highlighted ? this.props.highlighted.indexOf(node[this.props.keyProp]) > -1 : false,
        requestThumbnailCb: this.requestThumbnailCb,
        keyProp: this.props.keyProp || 'h'
      }, nodeAdapterProps)));
    }
    const listAdapterName = listAdapter.prototype.constructor.name;
    return JSX_(REaCt().Fragment, null, JSX_(perfectScrollbar.O, {
      key: `ps_${  listAdapterName  }_${  viewMode}`,
      options: this.options.perfectScrollOptions,
      onUserScroll: this.onPsUserScroll,
      className,
      style: {
        'position': 'relative'
      },
      ref: instance => {
        this.domRef = instance;
      }
    }, JSX_(this.props.listAdapter, (0,esm_extends.A)({
      containerClassName: this.props.containerClassName,
      key: `ps_${  listAdapterName  }_${  this.props.viewMode  }_la`,
      ref: listAdapterInstance => {
        this.listAdapterInstance = listAdapterInstance;
      },
      listContentRef: listContent => {
        this.listContent = listContent;
      },
      header,
      megaList: this,
      calculated: this._calculated
    }, listAdapterOpts), nodes)));
  }
}
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx + 1 modules
const genericNodePropsComponent = REQ_(4285);
;// ./js/ui/jsx/fm/nodes/genericGrid.jsx


class GenericGrid extends genericNodePropsComponent.B {
  render() {
    const {
      node,
      calculated,
      index,
      listAdapter,
      className,
      keyProp
    } = this.props;
    const style = {};
    listAdapter.repositionItem(node, calculated, index, style);
    const toApplySensitive = !!mega.sensitives.isSensitive(node) && (mega.sensitives.showGlobally ? 1 : 2);
    let image = null;
    let src = null;
    let isThumbClass = "";
    if (node.fa && (is_image2(node) || is_video(node))) {
      src = thumbnails.get(node.fa);
      if (!src) {
        this.props.requestThumbnailCb(node);
        src = window.noThumbURI || '';
      }
      image = src ? JSX_("img", {
        alt: "",
        src
      }) : JSX_("img", {
        alt: ""
      });
      isThumbClass = " thumb";
    } else {
      image = JSX_("img", null);
    }
    let fileStatusClass = "";
    if (node.fav) {
      fileStatusClass += " icon-favourite-filled";
    }
    return JSX_("a", {
      className: `data-block-view megaListItem ui-droppable ui-draggable ui-draggable-handle ${  this.nodeProps.classNames.join(" ")  }${className && className(node) || ""  }${toApplySensitive ? toApplySensitive === 1 ? ' is-sensitive' : ' hidden-as-sensitive' : ''}`,
      id: `chat_${  node[keyProp]}`,
      onClick: e => {
        this.props.onClick(e, this.props.node);
      },
      onDoubleClick: e => {
        this.props.onDoubleClick(e, this.props.node);
      },
      title: this.nodeProps.title,
      style
    }, JSX_("span", {
      className: `data-block-bg ${  isThumbClass}`
    }, JSX_("span", {
      className: "data-block-indicators"
    }, JSX_("span", {
      className: `file-status-icon indicator sprite-fm-mono${  fileStatusClass}`
    }), JSX_("span", {
      className: "versioning-indicator"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-versions-previous"
    })), JSX_("i", {
      className: "sprite-fm-mono icon-link-thin-outline"
    })), JSX_("span", {
      className: `item-type-icon-90 icon-${  this.nodeProps.icon  }-90`
    }, image), JSX_("div", {
      className: "video-thumb-details"
    }, JSX_("i", {
      className: "small-icon small-play-icon"
    }), JSX_("span", null, "00:00"))), JSX_("span", {
      className: "file-block-title"
    }, this.nodeProps.title));
  }
}
;// ./js/ui/jsx/fm/nodes/genericTable.jsx



class GenericTableHeader extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  render() {
    const {
      sortBy,
      columns
    } = this.props;
    const headerSortable = this.props.sortable !== false;
    const columnsRendered = [];
    for (let i = 0; i < columns.length; i++) {
      var _colProps;
      let col = columns[i];
      let colProps;
      if (Array.isArray(col)) {
        colProps = col[1];
        col = col[0];
      }
      const colSortable = col.sortable && headerSortable;
      let sortable;
      if (colSortable) {
        let classes = "";
        if (sortBy[0] === col.id) {
          const ordClass = sortBy[1] === "desc" ? "asc" : "desc";
          classes = `${classes} ${ordClass}`;
        }
        if (col.id === 'fav') {
          classes += ' hidden';
        }
        sortable = `arrow sprite-fm-mono icon-arrow-left-thin-solid ${col.id} ${classes}`;
      }
      columnsRendered.push(JSX_("th", {
        megatype: col.megatype,
        className: col.headerClassName || col.megatype || "",
        key: `${col.id  }_${  i}`,
        onClick: e => {
          e.preventDefault();
          if (colSortable) {
            this.props.onClick(col.id);
          }
        }
      }, JSX_("span", {
        className: sortable || ''
      }, ((_colProps = colProps) == null ? void 0 : _colProps.label) || col.label), col.icon && JSX_("i", {
        className: `sprite-fm-mono ${  col.icon}`
      })));
    }
    return JSX_("thead", {
      ref: this.domRef
    }, JSX_("tr", null, columnsRendered));
  }
}
class GenericTable extends genericNodePropsComponent.B {
  render() {
    let _this$nodeProps;
    const {
      node,
      index,
      listAdapterOpts,
      className,
      keyProp
    } = this.props;
    const toApplySensitive = !!mega.sensitives.isSensitive(node) && (mega.sensitives.showGlobally ? 1 : 2);
    const columns = [];
    for (let i = 0; i < listAdapterOpts.columns.length; i++) {
      const customColumn = listAdapterOpts.columns[i];
      if (Array.isArray(customColumn)) {
        columns.push(JSX_(customColumn[0], {
          ...customColumn[1],
          'nodeAdapter': this,
          'h': node[keyProp],
          node,
          'key': `${i  }_${  customColumn[0].prototype.constructor.name}`,
          keyProp
        }));
      } else {
        columns.push(JSX_(customColumn, {
          'nodeAdapter': this,
          'h': node[keyProp],
          node,
          'key': `${i  }_${  customColumn.prototype.constructor.name}`,
          keyProp
        }));
      }
    }
    const listClassName = listAdapterOpts.className;
    return JSX_("tr", {
      className: `node_${  node[keyProp]  } ${  className && className(node) || ""  } ${  listClassName && listClassName(node) || ""  } ${  (_this$nodeProps = this.nodeProps) == null ? void 0 : _this$nodeProps.classNames.join(" ")  }${toApplySensitive ? toApplySensitive === 1 ? ' is-sensitive' : ' hidden-as-sensitive' : ''}`,
      id: node[keyProp],
      onContextMenu: ev => {
        if (this.props.onContextMenu) {
          this.props.onContextMenu(ev, node[keyProp]);
        }
      },
      onClick: e => {
        this.props.onClick(e, this.props.node);
      },
      onDoubleClick: e => {
        this.props.onDoubleClick(e, this.props.node);
      },
      key: `${index  }_${  node[keyProp]}`
    }, columns);
  }
}
;// ./js/ui/jsx/megaList/adapters.jsx


class GenericListAdapter extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.customIsEventuallyVisible = true;
  }
}
class Grid extends GenericListAdapter {
  static repositionItem(node, calculated, index, style) {
    style.position = "absolute";
    style.top = calculated.itemHeight * Math.floor(index / calculated.itemsPerRow);
    if (calculated.itemsPerRow > 1) {
      style.left = index % calculated.itemsPerRow * calculated.itemWidth;
    }
  }
  render() {
    return JSX_("div", {
      className: "megaList-content",
      ref: this.props.listContentRef,
      style: {
        'position': 'relative'
      }
    }, this.props.children);
  }
}
Grid.itemWidth = 212;
Grid.itemHeight = 212;
Grid.containerClassName = "file-block-scrolling megaListContainer";
class Table extends GenericListAdapter {
  onContentUpdated() {
    const {
      calculated
    } = this.props;
    const pusherHeight = calculated.visibleFirstItemNum * calculated.itemHeight | 0;
    if (this.topPusher) {
      this.topPusher.style.height = `${pusherHeight  }px`;
    }
    if (this.bottomPusher) {
      this.bottomPusher.style.height = `${calculated.contentHeight - pusherHeight - (calculated.visibleLastItemNum - calculated.visibleFirstItemNum) * calculated.itemHeight | 0  }px`;
    }
  }
  componentDidUpdate() {
    super.componentDidUpdate();
    this.onContentUpdated();
  }
  render() {
    return JSX_("table", {
      width: "100%",
      className: this.props.containerClassName || "grid-table table-hover fm-dialog-table"
    }, this.props.header, JSX_("tbody", {
      ref: this.props.listContentRef
    }, JSX_("tr", {
      className: "megalist-pusher top",
      ref: r => {
        this.topPusher = r;
      }
    }), this.props.children, JSX_("tr", {
      className: "megalist-pusher bottom",
      ref: r => {
        this.bottomPusher = r;
      }
    })));
  }
}
Table.itemHeight = 32;
Table.itemsPerRow = 1;
Table.containerClassName = "grid-scrolling-table megaListContainer";
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/columns/columnFavIcon.jsx
const columnFavIcon = REQ_(6794);
;// ./js/ui/tooltips.jsx


class Handler extends REaCt().Component {
  render() {
    const {
      className,
      onMouseOver,
      onMouseOut,
      children
    } = this.props;
    return JSX_("span", {
      className: `
                    tooltip-handler
                    ${className || ''}
                `,
      onMouseOver,
      onMouseOut
    }, children);
  }
}
class Contents extends REaCt().Component {
  render() {
    let className = `tooltip-contents dropdown body tooltip ${  this.props.className ? this.props.className : ""}`;
    if (this.props.active) {
      className += " visible";
      return JSX_("div", {
        className
      }, this.props.withArrow ? JSX_("i", {
        className: "dropdown-white-arrow"
      }) : null, this.props.children);
    } else {
      return null;
    }
  }
}
class Tooltip extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.state = {
      'active': false
    };
  }
  componentDidUpdate(oldProps, oldState) {
    const self = this;
    if (oldState.active === true && this.state.active === false) {
      chatGlobalEventManager.removeEventListener('resize', `tooltip${  this.getUniqueId()}`);
    }
    if (self.state.active === true) {
      self.repositionTooltip();
      chatGlobalEventManager.addEventListener('resize', `tooltip${  this.getUniqueId()}`, () => {
        self.repositionTooltip();
      });
      if (this.props.onShown) {
        this.props.onShown();
      }
    }
  }
  repositionTooltip() {
    let _this$domRef;
    let elLeftPos, elTopPos, elWidth, elHeight;
    let tooltipLeftPos, tooltipTopPos, tooltipWidth, tooltipHeight;
    let docHeight;
    let arrowClass;
    if (!this.isMounted()) {
      return;
    }
    const $container = $((_this$domRef = this.domRef) == null ? void 0 : _this$domRef.current);
    const $el = $('.tooltip-handler', $container);
    const $tooltip = $('.tooltip-contents', $container);
    let {tooltipOffset} = this.props;
    const arrow = this.props.withArrow;
    if ($el && $tooltip) {
      elWidth = $el.outerWidth();
      elHeight = $el.outerHeight();
      elLeftPos = $el.offset().left;
      elTopPos = $el.offset().top;
      tooltipWidth = $tooltip.outerWidth();
      tooltipHeight = $tooltip.outerHeight();
      docHeight = $(window).height();
      $tooltip.removeClass('dropdown-arrow left-arrow right-arrow up-arrow down-arrow').removeAttr('style');
      if (!tooltipOffset) {
        tooltipOffset = 7;
      }
      if (elTopPos - tooltipHeight - tooltipOffset > 10) {
        tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
        tooltipTopPos = elTopPos - tooltipHeight - tooltipOffset;
        arrowClass = arrow ? 'dropdown-arrow down-arrow' : '';
      } else if (docHeight - (elTopPos + elHeight + tooltipHeight + tooltipOffset) > 10) {
        tooltipLeftPos = elLeftPos + elWidth / 2 - tooltipWidth / 2;
        tooltipTopPos = elTopPos + elHeight + tooltipOffset;
        arrowClass = arrow ? 'dropdown-arrow up-arrow' : '';
      } else if (elLeftPos - tooltipWidth - tooltipOffset > 10) {
        tooltipLeftPos = elLeftPos - tooltipWidth - tooltipOffset;
        tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
        arrowClass = arrow ? 'dropdown-arrow right-arrow' : '';
      } else {
        tooltipLeftPos = elLeftPos + elWidth + tooltipOffset;
        tooltipTopPos = elTopPos + elHeight / 2 - tooltipHeight / 2;
        arrowClass = arrow ? 'dropdown-arrow left-arrow' : '';
      }
      $tooltip.css({
        'left': tooltipLeftPos,
        'top': tooltipTopPos - 5
      });
      $tooltip.addClass(arrowClass);
    }
  }
  onHandlerMouseOver() {
    this.setState({
      'active': true
    });
  }
  onHandlerMouseOut() {
    this.setState({
      'active': false
    });
  }
  render() {
    const self = this;
    const others = [];
    let handler = null;
    let contents = null;
    let x = 0;
    REaCt().Children.forEach(this.props.children, (child) => {
      if (child.type.name === 'Handler') {
        handler = REaCt().cloneElement(child, {
          onMouseOver () {
            self.onHandlerMouseOver();
          },
          onMouseOut () {
            self.onHandlerMouseOut();
          }
        });
      } else if (child.type.name === 'Contents') {
        contents = REaCt().cloneElement(child, {
          active: self.state.active,
          withArrow: self.props.withArrow
        });
      } else {
        const tmp = REaCt().cloneElement(child, {
          key: x++
        });
        others.push(tmp);
      }
    });
    return JSX_("span", {
      ref: this.domRef,
      className: this.props.className || ''
    }, handler, contents, others);
  }
}
Tooltip.defaultProps = {
  'hideable': true
};
 const tooltips = {
  Tooltip,
  Handler,
  Contents
};
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
;// ./js/ui/jsx/fm/nodes/columns/columnNodeName.jsx




class ColumnNodeName extends genericNodePropsComponent.B {
  constructor(...args) {
    super(...args);
    this.state = {
      src: null
    };
  }
  static get label() {
    return l[86];
  }
  componentDidMount() {
    super.componentDidMount();
  }
  _renderOwner() {
    const {
      showOwner,
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    if (!showOwner || !node.su) {
      return null;
    }
    const owner = M.getUserByHandle(node.su);
    if (!owner) {
      return null;
    }
    return JSX_("span", {
      className: "node-owner simpletip",
      "data-simpletip": owner.m,
      "data-simpletipposition": "top"
    }, JSX_(contacts.eu, {
      contact: owner.h,
      className: "avatar-wrapper"
    }), JSX_("span", {
      className: "node-owner-name"
    }, owner.name || owner.m));
  }
  render() {
    const {
      showOwner,
      nodeAdapter
    } = this.props;
    const {
      node,
      requestThumbnailCb
    } = nodeAdapter.props;
    const src = this.state.src || thumbnails.get(node.fa);
    return JSX_("td", {
      megatype: ColumnNodeName.megatype
    }, JSX_("div", {
      className: showOwner ? 'owner-wrap' : ''
    }, src || is_image2(node) || is_video(node) ? JSX_(tooltips.Tooltip, {
      withArrow: true,
      className: "tooltip-handler-container",
      onShown: () => {
        if (!src) {
          requestThumbnailCb(node, true, (n, src) => {
            this.setState({
              src
            });
            return `preview_${n.h}`;
          });
        }
      }
    }, JSX_(tooltips.Handler, {
      className: `item-type-icon icon-${fileIcon(node)}-24`
    }), JSX_(tooltips.Contents, {
      className: "img-preview"
    }, JSX_("div", {
      className: "dropdown img-wrapper img-block",
      id: `preview_${node.h}`
    }, JSX_("img", {
      alt: "",
      className: `thumbnail-placeholder ${node.h}`,
      src: node.fa || src ? src || `${staticpath}/images/mega/ajax-loader-tiny.gif` : window.noThumbURI
    })))) : JSX_("span", {
      className: `
                                item-type-icon icon-${fileIcon(node)}-24
                            `
    }), JSX_("span", {
      className: "tranfer-filetype-txt"
    }, nodeAdapter.nodeProps.title), this._renderOwner()));
  }
}
ColumnNodeName.sortable = true;
ColumnNodeName.id = 'name';
ColumnNodeName.megatype = 'fname';
;// ./js/ui/jsx/fm/nodes/columns/columnSize.jsx


class ColumnSize extends genericNodePropsComponent.B {
  static get label() {
    return l[87];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    return JSX_("td", {
      megatype: ColumnSize.megatype,
      className: "size"
    }, nodeAdapter.nodeProps.size);
  }
}
ColumnSize.sortable = true;
ColumnSize.id = "size";
ColumnSize.megatype = "size";
;// ./js/ui/jsx/fm/nodes/columns/columnTimeAdded.jsx


class ColumnTimeAdded extends genericNodePropsComponent.B {
  static get label() {
    return l[16169];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    return JSX_("td", {
      megatype: ColumnTimeAdded.megatype,
      className: "time ad"
    }, nodeAdapter.nodeProps.timestamp);
  }
}
ColumnTimeAdded.sortable = true;
ColumnTimeAdded.id = "ts";
ColumnTimeAdded.megatype = "timeAd";
;// ./js/ui/jsx/fm/nodes/columns/columnExtras.jsx


class ColumnExtras extends genericNodePropsComponent.B {
  render() {
    return JSX_("td", {
      megatype: ColumnExtras.megatype,
      className: "grid-url-field own-data extras-column"
    }, JSX_("span", {
      className: "versioning-indicator"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-versions-previous"
    })), JSX_("i", {
      className: "sprite-fm-mono icon-link-thin-outline"
    }));
  }
}
ColumnExtras.sortable = false;
ColumnExtras.id = "extras";
ColumnExtras.label = "";
ColumnExtras.megatype = "extras";
ColumnExtras.headerClassName = "grid-url-header";
;// ./js/ui/jsx/fm/browserEntries.jsx











class BrowserEntries extends mixins.w9 {
  constructor(props) {
    super(props);
    this.state = {
      'sortBy': props.sortBy || ['name', 'asc']
    };
    this.toggleSortBy = this.toggleSortBy.bind(this);
  }
  UNSAFE_componentWillMount() {
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
  componentDidUpdate(oldProps) {
    if (oldProps.sortBy && (oldProps.sortBy[0] !== this.props.sortBy[0] || oldProps.sortBy[1] !== this.props.sortBy[1])) {
      this.setState({
        'sortBy': this.props.sortBy
      });
    }
  }
  handleKeyNavigation(selectionManager, shiftKey, keyCode, viewMode) {
    let curr;
    const {
      folderSelectNotAllowed
    } = this.props;
    if (shiftKey && folderSelectNotAllowed) {
      curr = selectionManager.last_selected;
    }
    const {KEYS} = BrowserEntries;
    if (viewMode) {
      if (keyCode === KEYS.LEFT) {
        selectionManager.select_prev(shiftKey, true);
      } else if (keyCode === KEYS.RIGHT) {
        selectionManager.select_next(shiftKey, true);
      } else if (keyCode === KEYS.UP) {
        selectionManager.select_grid_up(shiftKey, true);
      } else {
        selectionManager.select_grid_down(shiftKey, true);
      }
    } else if (keyCode === KEYS.UP) {
      selectionManager.select_prev(shiftKey, true);
    } else {
      selectionManager.select_next(shiftKey, true);
    }
    if (shiftKey && folderSelectNotAllowed && $.selected.length > 1) {
      const folderNodes = $.selected.filter(n => !M.isFileNode(M.getNodeByHandle(n)));
      if (folderNodes.length > 1) {
        if (!M.isFileNode(M.getNodeByHandle(curr))) {
          array.remove(folderNodes, curr);
        }
        if (folderNodes.length) {
          const newCurr = selectionManager.last_selected;
          for (let i = 0; i < folderNodes.length; i++) {
            selectionManager.remove_from_selection(folderNodes[i]);
          }
          if (M.isFileNode(M.getNodeByHandle(newCurr))) {
            selectionManager.set_currently_selected(curr);
          } else if (curr && $.selected.includes(curr)) {
            selectionManager.set_currently_selected(curr);
          } else if ($.selected.length) {
            selectionManager.set_currently_selected($.selected[0]);
          }
        }
      }
    }
  }
  _invalidKeydownTarget(e) {
    return e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' && !e.target.classList.contains('messages-textarea') || e.target.tagName === 'SELECT');
  }
  _isNavigationKeyDown(e, keyCode) {
    const {
      KEYS
    } = BrowserEntries;
    const {
      viewMode
    } = this.props;
    return !e.metaKey && (!viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN) || viewMode && (keyCode === KEYS.UP || keyCode === KEYS.DOWN || keyCode === KEYS.LEFT || keyCode === KEYS.RIGHT));
  }
  bindEvents() {
    const {
      KEYS
    } = BrowserEntries;
    $(document.body).rebind(`keydown.be${this.getUniqueId()}`, e => {
      let charTyped = false;
      const keyCode = e.which || e.keyCode;
      const $searchField = $('div.fm-files-search input');
      const $typingArea = $('textarea.messages-textarea');
      const {
        selectionManager,
        viewMode
      } = this.props;
      if (this._invalidKeydownTarget(e)) {
        return;
      }
      if ($searchField.is(':focus')) {
        return;
      }
      if ($typingArea.is(':focus')) {
        $typingArea.trigger('blur');
      }
      if (keyCode === KEYS.A && (e.ctrlKey || e.metaKey)) {
        this.handleSelectAll();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.metaKey && keyCode === KEYS.UP || keyCode === KEYS.BACKSPACE) {
        this.handleKeyBack();
      } else if (this._isNavigationKeyDown(e, keyCode)) {
        this.handleKeyNavigation(selectionManager, e.shiftKey, keyCode, viewMode);
      } else if (keyCode >= 48 && keyCode <= 57 || keyCode >= 65 && keyCode <= 123 || keyCode > 255) {
        charTyped = String.fromCharCode(keyCode).toLowerCase();
        this.handleCharTyped(charTyped);
      } else if (keyCode === KEYS.ENTER || e.metaKey && keyCode === KEYS.DOWN) {
        this.handleAttach();
      }
      mega.ui.mInfoPanel.reRenderIfVisible($.selected);
      if (!charTyped) {
        this.lastCharKeyPressed = false;
        this.lastCharKeyIndex = -1;
      }
    });
  }
  handleSelectAll() {
    const {
      selectionManager,
      folderSelectNotAllowed,
      entries
    } = this.props;
    selectionManager.select_all();
    if (folderSelectNotAllowed) {
      const folders = entries.filter(h => !M.isFileNode(M.getNodeByHandle(h)));
      for (let i = 0; i < folders.length; i++) {
        selectionManager.remove_from_selection(folders[i].h);
      }
    }
  }
  handleKeyBack() {
    const {
      viewMode,
      currentlyViewedEntry
    } = this.props;
    if (!viewMode) {
      const currentFolder = M.getNode(currentlyViewedEntry);
      if (currentFolder.p) {
        this.expandFolder(currentFolder.p);
      }
    }
  }
  handleCharTyped(charTyped) {
    const {
      entries,
      keyProp,
      selectionManager
    } = this.props;
    const foundMatchingNodes = entries.filter(node => {
      return node.name && node.name.substring(0, 1).toLowerCase() === charTyped;
    });
    if (this.lastCharKeyPressed === charTyped) {
      this.lastCharKeyIndex++;
    }
    this.lastCharKeyPressed = charTyped;
    if (foundMatchingNodes.length > 0) {
      if (!foundMatchingNodes[this.lastCharKeyIndex]) {
        this.lastCharKeyIndex = 0;
      }
      const foundNode = foundMatchingNodes[this.lastCharKeyIndex];
      selectionManager.clear_selection();
      selectionManager.set_currently_selected(foundNode[keyProp], true);
    }
  }
  handleAttach() {
    const {
      highlighted,
      folderSelectNotAllowed,
      entries,
      keyProp,
      onAttachClicked
    } = this.props;
    let selectedNodes = highlighted;
    if (folderSelectNotAllowed) {
      selectedNodes = highlighted.filter(h => {
        const node = entries.find(e => e[keyProp] === h);
        return node && node.t === 0;
      });
      if (selectedNodes.length === 0) {
        const cursorNode = highlighted[0] && M.getNodeByHandle(highlighted[0]);
        if (cursorNode.t === 1) {
          this.expandFolder(cursorNode[keyProp]);
          return;
        } else if (highlighted.length > 0) {
          this.expandFolder(highlighted[0]);
          return;
        }
        return;
      }
    }
    onAttachClicked(selectedNodes);
  }
  unbindEvents() {
    $(document.body).off(`keydown.be${  this.getUniqueId()}`);
  }
  onEntryClick(e, node) {
    const {
      selectionManager,
      keyProp,
      folderSelectNotAllowed,
      highlighted = []
    } = this.props;
    this.lastCharKeyPressed = false;
    this.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      selectionManager.clear_selection();
      selectionManager.set_currently_selected(node[keyProp]);
    } else if (e.shiftKey) {
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
      } else {
        selectionManager.set_currently_selected(node[keyProp]);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (!highlighted || !highlighted.includes(node[keyProp])) {
        if (folderSelectNotAllowed) {
          if (node.t === 1 && highlighted.length > 0) {
            return;
          } else if (highlighted.some(nodeId => {
            const node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          })) {
            selectionManager.clear_selection();
          }
        }
        selectionManager.add_to_selection(node[keyProp]);
      } else if (highlighted && highlighted.includes(node[keyProp])) {
        if (folderSelectNotAllowed) {
          if (node.t === 1) {
            return;
          } else if (highlighted.some(nodeId => {
            const node = M.getNodeByHandle(nodeId);
            return node && node.t === 1;
          })) {
            selectionManager.clear();
          }
        }
        selectionManager.remove_from_selection(node[keyProp]);
      }
    }
  }
  expandFolder(nodeId) {
    const self = this;
    const node = M.getNodeByHandle(nodeId);
    if (node) {
      self.lastCharKeyPressed = false;
      self.lastCharKeyIndex = -1;
      self.setState({
        'selected': [],
        'highlighted': [],
        'cursor': false
      });
      self.props.onExpand(node);
      self.forceUpdate();
    }
  }
  onEntryDoubleClick(e, node) {
    const self = this;
    self.lastCharKeyPressed = false;
    self.lastCharKeyIndex = -1;
    e.stopPropagation();
    e.preventDefault();
    const share = M.getNodeShare(node);
    if (share && share.down) {
      return;
    }
    if (node.t) {
      self.props.onExpand(node);
      self.forceUpdate();
    } else {
      self.onEntryClick(e, node);
      self.props.onAttachClicked();
    }
  }
  customIsEventuallyVisible() {
    return true;
  }
  toggleSortBy(colId) {
    const newState = {};
    if (this.state.sortBy[0] === colId) {
      newState.sortBy = [colId, this.state.sortBy[1] === "asc" ? "desc" : "asc"];
    } else {
      newState.sortBy = [colId, "asc"];
    }
    this.setState(newState);
    this.props.onSortByChanged(newState.sortBy);
  }
  _getEmptyState() {
    const {
      currentlyViewedEntry: cve,
      searchScope: section
    } = this.props;
    if (cve === 'search') {
      return {
        icon: 'glass-details',
        title: l.no_search_results,
        subtitle: l.search_again
      };
    }
    if (cve === 'quick-access') {
      return {
        icon: 'glass-clock',
        title: l.dlg_empty_title_frequents,
        subtitle: l.dlg_empty_text_frequents
      };
    }
    if (cve === 'shares') {
      return {
        icon: 'glass-shared-folder',
        title: l[6871],
        subtitle: l.dlg_empty_text_share
      };
    }
    if (cve === M.RootID) {
      return {
        icon: 'glass-cloud-circle',
        title: l.empty_cloud_title
      };
    }
    if (section === 's4') {
      const type = M.getS4NodeType(cve);
      if (type === 'container' || type === 'bucket') {
        return {
          icon: 'glass-object-bucket',
          title: {
            container: l.dlg_empty_title_s4,
            bucket: l.dlg_empty_title_bucket
          }[type]
        };
      }
    }
    return {
      icon: 'glass-folder',
      title: M.u[cve] ? l[6787] : l[782]
    };
  }
  _renderEmptyState({
    icon,
    title,
    subtitle
  }) {
    return JSX_("div", {
      className: 'dialog-empty-block active'
    }, JSX_("div", {
      className: "image"
    }, JSX_("i", {
      className: icon
    })), JSX_("div", {
      className: "title"
    }, JSX_("h1", null, title)), subtitle && JSX_("div", {
      className: "subtitle"
    }, subtitle));
  }
  render() {
    const {
      shortGrid,
      listAdapterColumns,
      listAdapterOpts = {},
      viewMode
    } = this.props;
    if (!viewMode) {
      const nameColumn = this.props.showOwner ? [ColumnNodeName, {
        showOwner: true
      }] : ColumnNodeName;
      listAdapterOpts.columns = shortGrid ? [nameColumn, ColumnExtras] : [columnFavIcon.$, nameColumn, ColumnSize, ColumnTimeAdded, ColumnExtras];
    }
    if (listAdapterColumns) {
      listAdapterOpts.columns = listAdapterColumns;
    }
    if (this.props.isLoading) {
      return this._renderEmptyState({
        icon: 'loader sprite-fm-mono icon-loader-grad-small-regular-outline',
        title: l[5533]
      });
    } else if (!this.props.entries.length) {
      const nilComp = this.props.NilComponent;
      const nil = this.props.currentlyViewedEntry !== 'search' && nilComp && (typeof nilComp === "function" ? nilComp() : nilComp);
      return nil || this._renderEmptyState(this._getEmptyState());
    }
    return JSX_(MegaList2, {
      viewMode,
      sortBy: this.state.sortBy,
      currentlyViewedEntry: this.props.currentlyViewedEntry,
      selected: this.props.selected,
      highlighted: this.props.highlighted,
      containerClassName: this.props.containerClassName,
      nodeAdapterProps: {
        'onClick': (e, node) => {
          this.onEntryClick(e, node);
          mega.ui.mInfoPanel.reRenderIfVisible($.selected);
        },
        'onDoubleClick': (e, node) => {
          this.onEntryDoubleClick(e, node);
        },
        'className': node => {
          return this.props.highlighted.indexOf(node[this.props.keyProp]) > -1 ? " ui-selected" : "";
        }
      },
      ref: r => {
        this.megaList = r;
      },
      listAdapter: viewMode ? Grid : Table,
      nodeAdapter: viewMode ? GenericGrid : GenericTable,
      listAdapterOpts,
      entries: this.props.entries,
      itemHeight: this.props.megaListItemHeight,
      headerHeight: viewMode ? 0 : 56,
      header: !viewMode && JSX_(GenericTableHeader, {
        columns: listAdapterOpts.columns,
        sortBy: this.state.sortBy,
        sortable: this.props.currentlyViewedEntry !== 'quick-access',
        onClick: this.toggleSortBy,
        headerContainerClassName: this.props.headerContainerClassName
      }),
      currentdirid: this.props.currentdirid,
      onContextMenu: this.props.onContextMenu,
      keyProp: this.props.keyProp
    });
  }
}
BrowserEntries.KEYS = {
  A: 65,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ENTER: 13,
  BACKSPACE: 8
};
BrowserEntries.defaultProps = {
  'hideable': true,
  'requiresUpdateOnResize': true
};
;// ./js/ui/jsx/fm/fmView.jsx



class FMView extends mixins.w9 {
  constructor(props) {
    let _this$dataSource;
    super(props);
    this.domRef = REaCt().createRef();
    let initialSortBy = props.initialSortBy || ['name', 'asc'];
    if (props.fmConfigSortEnabled) {
      let _fmconfig$sortmodes;
      const sortId = props.fmConfigSortId;
      assert(sortId, 'missing fmConfigSortId');
      if ((_fmconfig$sortmodes = fmconfig.sortmodes) != null && (_fmconfig$sortmodes = _fmconfig$sortmodes[sortId]) != null && _fmconfig$sortmodes.n) {
        let _fmconfig$sortmodes2;
        initialSortBy = this._translateFmConfigSortMode((_fmconfig$sortmodes2 = fmconfig.sortmodes) == null ? void 0 : _fmconfig$sortmodes2[sortId]);
      }
    }
    this.state = {
      'sortBy': initialSortBy,
      'selected': [],
      'highlighted': [],
      'entries': null
    };
    this.dataSource = this.props.dataSource;
    this.state.entries = this.getEntries();
    this.onAttachClicked = this.onAttachClicked.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    if ((_this$dataSource = this.dataSource) != null && _this$dataSource.addChangeListener) {
      this._listener = this.dataSource.addChangeListener((...args) => {
        if (!this.isMounted()) {
          return;
        }
        if (args.length > 2 && args[3] === 'ats') {
          return;
        }
        delay('fmviewcl', () => this.setState({
          'entries': this.getEntries()
        }), 500);
      });
    }
    this.initSelectionManager();
  }
  getDataSourceNode(h) {
    return this.dataSource && this.dataSource[h] || M.getNodeByHandle(h);
  }
  _translateFmConfigSortMode(currentSortModes) {
    const sortId = this.props.fmConfigSortId;
    assert(sortId, 'missing fmConfigSortId');
    const sortByArr = [];
    if (currentSortModes != null && currentSortModes.n) {
      sortByArr[0] = currentSortModes.n;
      const sortMap = this.props.fmConfigSortMap;
      const aliasKeys = sortMap && Object.keys(sortMap) || [];
      for (const alias of aliasKeys) {
        if (sortByArr[0] === sortMap[alias]) {
          sortByArr[0] = alias;
          break;
        }
      }
      sortByArr[1] = currentSortModes.d === 1 ? "asc" : "desc";
    }
    return sortByArr;
  }
  initSelectionManager(entries) {
    this.selectionManager = new SelectionManager2_React(entries || this.state.entries, this.props.currentdirid || "cloud-drive", () => {
      let _this$browserEntries;
      return (_this$browserEntries = this.browserEntries) == null || (_this$browserEntries = _this$browserEntries.megaList) == null || (_this$browserEntries = _this$browserEntries._calculated) == null ? void 0 : _this$browserEntries.itemsPerRow;
    }, nodeHandle => {
      if (this.browserEntries && this.browserEntries.megaList) {
        this.browserEntries.megaList.scrollToItem(nodeHandle);
      }
    }, {
      'onSelectedUpdated': selectedList => {
        this.onSelectionUpdated(selectedList);
      }
    });
  }
  onSelectionUpdated(selectedList) {
    selectedList = [...selectedList];
    const highlighted = selectedList;
    if (this.props.folderSelectNotAllowed && !this.props.folderSelectable) {
      selectedList = selectedList.filter(nodeId => !this.getDataSourceNode(nodeId).t);
    }
    this.setState({
      'selected': selectedList,
      highlighted
    });
    this.props.onSelected(selectedList);
    this.props.onHighlighted(highlighted);
    $.selected = highlighted;
  }
  _quickAccessDataSource() {
    const dataSource = Object.create(null);
    const top = mega.quickAccessLocations.top();
    for (let i = 0; i < top.length; i++) {
      const n = this.getDataSourceNode(top[i]);
      if (n) {
        if (this.props.hideIncoming && n.su) {
          continue;
        }
        dataSource[top[i]] = n;
      }
    }
    return dataSource;
  }
  _searchFilter(searchValue, scope) {
    const searchFilter = M.getFilterBySearchFn(searchValue);
    if (!scope) {
      return searchFilter;
    }
    return n => searchFilter(n) && M.getNodeRoot(n.h) === scope;
  }
  getEntries(newState) {
    const self = this;
    const sortBy = newState && newState.sortBy || self.state.sortBy;
    const order = sortBy[1] === "asc" ? 1 : -1;
    const entries = [];
    let sortFunc, filterFunc, dataSource;
    const minSearchLength = self.props.minSearchLength || 3;
    const showSen = mega.sensitives.showGlobally;
    if (self.props.currentlyViewedEntry === "search" && self.props.searchValue && self.props.searchValue.length >= minSearchLength) {
      dataSource = this.dataSource || {
        ...M.tnd,
        ...M.d
      };
      filterFunc = this._searchFilter(self.props.searchValue, self.props.searchScope);
    } else if (self.props.currentlyViewedEntry === 'quick-access') {
      dataSource = this._quickAccessDataSource();
    } else {
      const tmp = M.getChildren(self.props.currentlyViewedEntry) || M.tree[self.props.currentlyViewedEntry] || this.props.dataSource;
      dataSource = Object.create(null);
      for (const h in tmp) {
        const n = this.getDataSourceNode(h);
        if (n) {
          dataSource[h] = n;
        }
      }
    }
    const {
      customFilterFn
    } = this.props;
    for (const h in dataSource) {
      const n = dataSource[h];
      const e = n && (!n.h || n.h.length === 8 && crypto_keyok(n) || n.h.length === 11);
      const s = e && !n.fv && (showSen || !mega.sensitives.isSensitive(n));
      if (s && (!customFilterFn || customFilterFn(n)) && (!filterFunc || filterFunc(n))) {
        entries.push(n);
      }
    }
    if (self.props.currentlyViewedEntry === 'quick-access') {
      return entries;
    }
    if (sortBy[0] === "name") {
      sortFunc = M.getSortByNameFn();
    } else if (sortBy[0] === "size") {
      sortFunc = M.getSortBySizeFn();
    } else if (sortBy[0] === "ts") {
      sortFunc = M.getSortByDateTimeFn();
    } else if (sortBy[0] === "rts") {
      sortFunc = M.getSortByRtsFn();
    } else if (sortBy[0] === "status") {
      sortFunc = M.getSortByStatusFn();
    } else if (sortBy[0] === "interaction") {
      sortFunc = M.getSortByInteractionFn();
    } else if (sortBy[0] === "verification") {
      sortFunc = M.getSortByVerificationFn();
    } else if (sortBy[0] === "email") {
      sortFunc = M.getSortByEmail();
    } else if (sortBy[0] === 'access') {
      sortFunc = (a, b, o) => typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && (a.r < b.r ? -1 : 1) * o;
    } else {
        sortFunc = M.sortByFavFn(order);
      }
    const folders = [];
    if (this.props.sortFoldersFirst) {
      for (let i = entries.length; i--;) {
        if (entries[i] && entries[i].t) {
          folders.unshift(entries[i]);
          entries.splice(i, 1);
        }
      }
    }
    folders.sort((a, b) => {
      return sortFunc(a, b, order);
    });
    entries.sort((a, b) => {
      return sortFunc(a, b, order);
    });
    return folders.concat(entries);
  }
  onHighlighted(nodes) {
    this.setState({
      'highlighted': nodes
    });
    if (this.props.onHighlighted) {
      this.props.onHighlighted(nodes);
    }
  }
  finishedLoading(newState) {
    newState.isLoading = false;
    newState.entries = this.getEntries();
    this.initSelectionManager(newState.entries);
    this.setState(newState);
  }
  addOrUpdRawListener() {
    if (this._rawListener) {
      mBroadcaster.removeListener(this._rawListener);
    }
    this._rawListener = mBroadcaster.addListener(`fmViewUpdate:${  this.props.currentlyViewedEntry}`, () => {
      this.setState({
        'entries': this.getEntries()
      }, () => {
        if (this.browserEntries.isMounted()) {
          this.browserEntries.forceUpdate();
        }
      });
    });
  }
  componentDidMount() {
    let _this$dataSource2;
    super.componentDidMount();
    if (!((_this$dataSource2 = this.dataSource) != null && _this$dataSource2.addChangeListener)) {
      this.addOrUpdRawListener();
    }
    if (this.props.fmConfigSortEnabled) {
      this._sortModeListener = mBroadcaster.addListener("fmconfig:sortmodes", sortModes => {
        this.onFmConfigSortModeChanged(sortModes);
      });
    }
  }
  componentDidUpdate(prevProps) {
    const {
      currentlyViewedEntry: currEntry,
      searchValue: currSearch
    } = this.props;
    const {
      currentlyViewedEntry: prevEntry,
      searchValue: prevSearch
    } = prevProps;
    const dataSourceChanged = this.props.dataSource !== prevProps.dataSource;
    if (dataSourceChanged || prevEntry !== currEntry || currSearch !== prevSearch) {
      let _this$dataSource3;
      this.dataSource = this.props.dataSource;
      const newState = {
        'selected': [],
        'highlighted': []
      };
      if (!((_this$dataSource3 = this.dataSource) != null && _this$dataSource3.addChangeListener)) {
        this.addOrUpdRawListener();
      }
      const handle = currEntry;
      if (handle === 'shares') {
        newState.isLoading = true;
        this.setState(newState);
        dbfetch.geta(Object.keys(M.c.shares || {})).always(() => {
          this.finishedLoading(newState);
        });
        return;
      }
      if (handle === 'quick-access') {
        newState.isLoading = true;
        this.setState(newState);
        (async () => {
          await mega.quickAccessLocations.load();
          const top = mega.quickAccessLocations.top();
          if (top.length) {
            await dbfetch.geta(top);
          }
        })().catch(dump).finally(() => this.finishedLoading(newState));
        return;
      }
      if (this.getDataSourceNode(handle).t && !M.getChildren(handle)) {
        this.setState({
          'isLoading': true
        });
        dbfetch.get(handle).always(() => {
          this.finishedLoading(newState);
        });
        return;
      }
      const entries = this.getEntries();
      this.initSelectionManager(entries);
      this.setState({
        entries
      });
    }
  }
  onAttachClicked() {
    this.props.onAttachClicked();
  }
  onContextMenu() {}
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this._listener) {
      let _this$dataSource4;
      (_this$dataSource4 = this.dataSource) == null || _this$dataSource4.removeChangeListener(this._listener);
    }
    if (this._rawListener) {
      mBroadcaster.removeListener(this._rawListener);
    }
    if (this._sortModeListener) {
      mBroadcaster.removeListener(this._sortModeListener);
    }
    $.selected = [];
    this.selectionManager.destroy();
    this.selectionManager = undefined;
    $('.dropdown.body.files-menu.context').css('z-index', '');
  }
  onSortByChanged(newState) {
    if (newState[0] === this.state.sortBy[0] && newState[1] === this.state.sortBy[1]) {
      return;
    }
    const entries = this.getEntries({
      'sortBy': newState
    });
    this.setState({
      'sortBy': newState,
      entries,
      'selected': [],
      'highlighted': []
    }, () => {
      if (this.props.onSortByChanged) {
        this.props.onSortByChanged(newState);
      }
      if (this.props.fmConfigSortEnabled) {
        const sortId = this.props.fmConfigSortId;
        assert(sortId, 'fmConfigSortId missing');
        if (newState[0] === this.props.initialSortBy[0] && newState[1] === this.props.initialSortBy[1]) {
          const sortModes = typeof fmconfig.sortmodes !== 'undefined' ? fmconfig.sortmodes : Object.create(null);
          delete sortModes[sortId];
          mega.config.set('sortmodes', sortModes);
          return;
        }
        const map = this.props.fmConfigSortMap || Object.create(null);
        const name = map[newState[0]] || newState[0];
        const direction = newState[1] === "asc" ? 1 : -1;
        fmsortmode(sortId, name, direction);
      }
    });
    this.initSelectionManager(entries);
  }
  onFmConfigSortModeChanged(sortModes) {
    const currentSortMode = sortModes[this.props.fmConfigSortId];
    if (!currentSortMode) {
      this.onSortByChanged(this.props.initialSortBy || ['name', 'asc']);
    } else {
      const newSortMode = this._translateFmConfigSortMode(currentSortMode);
      if (this.state.sortBy[0] !== newSortMode[0] || this.state.sortBy[1] !== newSortMode[1]) {
        this.onSortByChanged(newSortMode);
      }
    }
  }
  render() {
    return JSX_("div", {
      ref: this.domRef,
      className: "content-container",
      onClick: ev => {
        $.hideContextMenu(ev);
      }
    }, JSX_(BrowserEntries, {
      isLoading: this.state.isLoading || this.props.nodeLoading,
      currentlyViewedEntry: this.props.currentlyViewedEntry,
      entries: this.state.entries || [],
      searchScope: this.props.searchScope,
      onExpand: node => {
        this.setState({
          'selected': [],
          'highlighted': []
        });
        this.props.onExpand(node[this.props.keyProp || 'h']);
      },
      sortBy: this.state.sortBy,
      folderSelectNotAllowed: this.props.folderSelectNotAllowed,
      onAttachClicked: this.onAttachClicked,
      viewMode: this.props.viewMode,
      showOwner: this.props.showOwner,
      shortGrid: this.props.shortGrid,
      selected: this.state.selected,
      highlighted: this.state.highlighted,
      onContextMenu: this.props.onContextMenu || this.onContextMenu,
      selectionManager: this.selectionManager,
      ref: browserEntries => {
        this.browserEntries = browserEntries;
      },
      onSortByChanged: newState => {
        this.onSortByChanged(newState);
      },
      listAdapterColumns: this.props.listAdapterColumns,
      currentdirid: this.props.currentdirid,
      containerClassName: this.props.containerClassName,
      headerContainerClassName: this.props.headerContainerClassName,
      megaListItemHeight: this.props.megaListItemHeight,
      keyProp: this.props.keyProp || 'h',
      NilComponent: this.props.NilComponent,
      listAdapterOpts: this.props.listAdapterOpts
    }));
  }
}

 },

 6794
(_, EXP_, REQ_) {

 REQ_.d(EXP_, {
   $: () =>  ColumnFavIcon
 });
 const react0__ = REQ_(1594);
 const react0___default = REQ_.n(react0__);
 const _genericNodePropsComponent1__ = REQ_(4285);


class ColumnFavIcon extends _genericNodePropsComponent1__ .B {
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    const isFavouritable = node.r === 2;
    return JSX_("td", {
      megatype: ColumnFavIcon.megatype,
      className: ColumnFavIcon.megatype
    }, JSX_("span", {
      className: `grid-status-icon sprite-fm-mono ${  missingkeys[node.h] ? " icon-info" : nodeAdapter.nodeProps.fav ? " icon-favourite-filled" : " icon-dot"  }${!isFavouritable && " disabled" || ""}`,
      onClick: () => {
        if (isFavouritable) {
          M.favourite([node.h], !node.fav);
        }
      }
    }));
  }
}
ColumnFavIcon.sortable = true;
ColumnFavIcon.id = "fav";
ColumnFavIcon.label = "";
ColumnFavIcon.icon = "icon-favourite-filled";
ColumnFavIcon.megatype = "fav";
ColumnFavIcon.headerClassName = "grid-first-th fav";

 },

 4285
(_, EXP_, REQ_) {


// EXPORTS
REQ_.d(EXP_, {
  B: () =>  GenericNodePropsComponent
});

// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
;// ./js/ui/jsx/fm/nodes/nodeProperties.jsx
class NodeProperties {
  static get(node, changeListener) {
    assert(node.h, 'missing handle for node');
    if (NodeProperties._globalCleanupTimer) {
      NodeProperties._globalCleanupTimer.abort();
    }
    (NodeProperties._globalCleanupTimer = tSleep(120)).then(() => {
      NodeProperties.cleanup(0);
    });
    let nodeProps;
    if (!NodeProperties._cache.has(node.h)) {
      nodeProps = new NodeProperties(node, changeListener);
      NodeProperties._cache.set(node.h, nodeProps);
    }
    return nodeProps || NodeProperties._cache.get(node.h);
  }
  unuse(changeListener) {
    const {node} = this;
    if (!node) {
      if (d) {
        console.warn("This should not happen.");
      }
      return;
    }
    this.changeListeners.delete(changeListener);
    let usages = NodeProperties._usages.get(this);
    if (usages) {
      NodeProperties._usages.set(this, --usages);
      if (usages === 0 && NodeProperties._cache.size > NodeProperties.MAX_CACHE_SIZE) {
        delay('nodePropCleanup', NodeProperties.cleanup, 1000);
      }
    }
  }
  static cleanup(maxCacheSize) {
    maxCacheSize = typeof maxCacheSize === "undefined" ? NodeProperties.MAX_CACHE_SIZE : maxCacheSize;
    const len = NodeProperties._cache.size;
    let removed = 0;
    for (const entry of NodeProperties._cache) {
      const id = entry[0];
      const node = entry[1];
      const usage = NodeProperties._usages.get(node);
      if (usage === 0) {
        NodeProperties._usages.delete(node);
        node._cleanup();
        NodeProperties._cache.delete(id);
        removed++;
        if (len - removed < maxCacheSize) {
          return;
        }
      }
    }
  }
  constructor(node, changeListener) {
    this.node = node;
    this.changeListeners = new Set();
    if (changeListener) {
      this.changeListeners.add(changeListener);
    }
    const _onChange = () => {
      this.initProps();
      for (const listener of this.changeListeners) {
        listener();
      }
    };
    if (this.node.addChangeListener) {
      this._listener = this.node.addChangeListener(_onChange);
    } else {
      this._mbListener = mBroadcaster.addListener(`nodeUpdated:${  node.h}`, _onChange);
    }
    this.initProps();
  }
  use(changeListener) {
    if (changeListener) {
      this.changeListeners.add(changeListener);
    }
    NodeProperties._usages.set(this, (NodeProperties._usages.get(this) | 0) + 1);
  }
  _cleanup() {
    if (this._listener) {
      this.node.removeChangeListener(this._listener);
    }
    if (this._mbListener) {
      mBroadcaster.removeListener(this._mbListener);
    }
    oDestroy(this);
  }
  initProps() {
    const {node} = this;
    lazy(this, 'title', () => {
      if (missingkeys[node.h]) {
        return node.t ? l[8686] : l[8687];
      }
      return M.getNameByHandle(node.h);
    });
    lazy(this, 'classNames', () => {
      const classNames = [];
      if (node.su) {
        classNames.push('inbound-share');
      }
      if (node.t) {
        classNames.push('folder');
      } else {
        classNames.push('file');
      }
      const share = this.shareData;
      if (missingkeys[node.h] || share.down) {
        if (share.down) {
          classNames.push('taken-down');
        }
        if (missingkeys[node.h]) {
          classNames.push('undecryptable');
        }
      }
      if (share) {
        classNames.push('linked');
      }
      if (node.lbl && !folderlink) {
        const colourLabel = M.getLabelClassFromId(node.lbl);
        classNames.push('colour-label');
        classNames.push(colourLabel);
      }
      return classNames;
    });
    lazy(this, 'icon', () => {
      return fileIcon(node);
    });
    lazy(this, 'isFolder', () => {
      return !!node.t;
    });
    lazy(this, 'shareData', () => {
      return M.getNodeShare(node);
    });
    lazy(this, 'isTakendown', () => {
      return this.shareData && !!this.shareData.down;
    });
    lazy(this, 'fav', () => {
      return !!node.fav;
    });
    lazy(this, 'size', () => {
      return bytesToSize(node.tb || node.s);
    });
    lazy(this, 'timestamp', () => {
      return time2date(node.ts);
    });
    lazy(this, 'root', () => {
      return M.getNodeRoot(node.h);
    });
    lazy(this, 'incomingShareData', () => {
      const result = {};
      if (node.r === 1) {
        result.accessLabel = l[56];
        result.accessIcon = 'icon-permissions-write';
      } else if (node.r === 2) {
        result.accessLabel = l[57];
        result.accessIcon = 'icon-star';
      } else {
        result.accessLabel = l[55];
        result.accessIcon = 'icon-read-only';
      }
      return result;
    });
    lazy(this, 'timestamp', () => {
      return time2date(node.ts);
    });
    lazy(this, 'onlineStatus', () => {
      return M.onlineStatusClass(node.presence ? node.presence : "unavailable");
    });
  }
}
NodeProperties._cache = new Map();
NodeProperties._usages = new WeakMap();
NodeProperties._globalCleanupTimer = void 0;
NodeProperties.MAX_CACHE_SIZE = 100;
if (d) {
  window.NodeProperties = NodeProperties;
}
;// ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx


class GenericNodePropsComponent extends mixins.w9 {
  constructor(props) {
    super(props);
    if (this.props.node.h) {
      this.nodeProps = NodeProperties.get(this.props.node);
      this.changeListener = this.props.node instanceof MegaDataObject ? null : this.changeListener.bind(this);
    }
  }
  changeListener() {
    if (this.isMounted()) {
      this.safeForceUpdate();
    }
  }
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.highlighted !== this.props.highlighted) {
      this.safeForceUpdate();
    }
  }
  UNSAFE_componentWillMount() {
    let _this$nodeProps;
    if (super.UNSAFE_componentWillMount) {
      super.UNSAFE_componentWillMount();
    }
    (_this$nodeProps = this.nodeProps) == null || _this$nodeProps.use(this.changeListener);
  }
  componentWillUnmount() {
    let _this$nodeProps2;
    super.componentWillUnmount();
    (_this$nodeProps2 = this.nodeProps) == null || _this$nodeProps2.unuse(this.changeListener);
  }
}

 }

}]);