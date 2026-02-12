/** @file automatically generated, do not edit it. */
"use strict";
(self.webpackChunk_meganz_webclient = self.webpackChunk_meganz_webclient || []).push([[253],{

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
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/applyDecoratedDescriptor.js
const applyDecoratedDescriptor = REQ_(793);
// EXTERNAL MODULE: ./js/ui/perfectScrollbar.jsx
const perfectScrollbar = REQ_(1301);
;// ./js/ui/jsx/megaList/megaList2.jsx


let _dec, _class;



const MegaList2 = (_dec = (0,mixins.hG)(30, true), _class = class MegaList2 extends mixins.w9 {
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
      if (this.adapterChangedDoRepaint) {
        return 0;
      }
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
    return [this.props.entries.length, this._calculated.scrollHeight, this._calculated.itemWidth, this._calculated.itemHeight, this._calculated.contentWidth, this._calculated.itemsPerRow, this._calculated.contentHeight, this._calculated.visibleFirstItemNum, this._calculated.visibleLastItemNum];
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
    const oldCalc = JSON.stringify(this._getCalcsThatTriggerChange());
    this._contentUpdated();
    const newCalc = JSON.stringify(this._getCalcsThatTriggerChange());
    if (oldCalc !== newCalc) {
      this.forceUpdate();
    }
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
    this._firstRender = this._firstRender || this.props.viewmode !== M.viewmode;
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
}, (0,applyDecoratedDescriptor.A)(_class.prototype, "onPsUserScroll", [_dec], Object.getOwnPropertyDescriptor(_class.prototype, "onPsUserScroll"), _class.prototype), _class);
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
      className: "sprite-fm-mono icon-link"
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
    const columnsRendered = [];
    for (let i = 0; i < columns.length; i++) {
      var _colProps;
      let col = columns[i];
      let colProps;
      if (Array.isArray(col)) {
        colProps = col[1];
        col = col[0];
      }
      let sortable;
      if (col.sortable) {
        let classes = "";
        if (sortBy[0] === col.id) {
          const ordClass = sortBy[1] === "desc" ? "icon-arrow-down" : "icon-arrow-up";
          classes = `${classes} ${ordClass}`;
        }
        if (col.id === 'fav') {
          classes += ' hidden';
        }
        sortable = JSX_("i", {
          className: `sprite-fm-mono ${col.id} ${classes}`
        });
      }
      columnsRendered.push(JSX_("th", {
        megatype: col.megatype,
        className: col.headerClassName || col.megatype || "",
        key: `${col.id  }_${  i}`,
        onClick: e => {
          e.preventDefault();
          if (col.sortable) {
            this.props.onClick(col.id);
          }
        }
      }, JSX_("span", null, ((_colProps = colProps) == null ? void 0 : _colProps.label) || col.label), col.icon && JSX_("i", {
        className: `sprite-fm-mono ${  col.icon}`
      }), sortable));
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
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node,
      requestThumbnailCb
    } = nodeAdapter.props;
    const src = this.state.src || thumbnails.get(node.fa);
    return JSX_("td", {
      megatype: ColumnNodeName.megatype
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
    }, nodeAdapter.nodeProps.title));
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
      className: "sprite-fm-mono icon-link"
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
  render() {
    const {viewMode} = this.props;
    const listAdapterOpts = this.props.listAdapterOpts || {};
    if (!viewMode) {
      listAdapterOpts.columns = [columnFavIcon.$, ColumnNodeName, ColumnSize, ColumnTimeAdded, ColumnExtras];
    }
    if (this.props.listAdapterColumns) {
      listAdapterOpts.columns = this.props.listAdapterColumns;
    }
    if (this.props.isLoading) {
      return JSX_("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, JSX_("div", {
        className: "dialog-empty-pad"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-cloud-drive"
      }), JSX_("div", {
        className: "dialog-empty-header"
      }, l[5533])));
    } else if (!this.props.entries.length && this.props.currentlyViewedEntry === 'search') {
      return JSX_("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, JSX_("div", {
        className: "dialog-empty-pad"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-preview-reveal"
      }), JSX_("div", {
        className: "dialog-empty-header"
      }, l[978])));
    } else if (!this.props.entries.length) {
      const nilComp = this.props.NilComponent;
      return nilComp && (typeof nilComp === "function" ? nilComp() : nilComp) || JSX_("div", {
        className: "dialog-empty-block active dialog-fm folder"
      }, this.props.currentlyViewedEntry === 'shares' ? JSX_("div", {
        className: "dialog-empty-pad"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-folder-incoming-share-filled"
      }), JSX_("div", {
        className: "dialog-empty-header"
      }, l[6871])) : JSX_("div", {
        className: "dialog-empty-pad"
      }, JSX_("i", {
        className: "sprite-fm-mono icon-folder-filled"
      }), JSX_("div", {
        className: "dialog-empty-header"
      }, this.props.currentlyViewedEntry === M.RootID ? l[1343] : M.u[this.props.currentlyViewedEntry] ? l[6787] : l[782])));
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
      this._listener = this.dataSource.addChangeListener(() => {
        if (!this.isMounted()) {
          return;
        }
        this.setState({
          'entries': this.getEntries()
        });
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
      filterFunc = M.getFilterBySearchFn(self.props.searchValue);
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
      this.changeListener = this.changeListener.bind(this);
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

 },

 5392
(_, EXP_, REQ_) {

// ESM COMPAT FLAG
REQ_.r(EXP_);

// EXPORTS
REQ_.d(EXP_, {
  "default": () =>  ContactsPanel
});

// EXTERNAL MODULE: external "React"
const external_React_ = REQ_(1594);
const REaCt = REQ_.n(external_React_);
// EXTERNAL MODULE: ./js/chat/mixins.js
const mixins = REQ_(8264);
// EXTERNAL MODULE: ./js/ui/buttons.jsx
const buttons = REQ_(5155);
// EXTERNAL MODULE: ./js/chat/ui/contactsPanel/utils.jsx
const utils = REQ_(836);
;// ./js/chat/ui/contactsPanel/navigation.jsx



const Navigation = ({
  view,
  receivedRequestsCount
}) => {
  return JSX_("div", {
    className: "contacts-navigation"
  }, JSX_("ul", null, Object.keys(utils.gR).map(key => {
    let activeClass = view === utils.gR[key] ? 'active' : '';
    if (view === utils.gR.PROFILE && utils.gR[key] === utils.gR.CONTACTS) {
      activeClass = 'active';
    }
    if (utils.gR[key] !== utils.gR.PROFILE) {
      return JSX_("li", {
        key,
        onClick: () => {
          let page = key.toLowerCase().split("_")[0];
          page = page === 'contacts' ? '' : page;
          loadSubPage(`fm/chat/contacts/${page}`);
        }
      }, JSX_(buttons.$, {
        className: `
                                        mega-button
                                        action
                                        ${activeClass}
                                    `,
        receivedRequestsCount
      }, JSX_("span", null, utils.d_[key]), receivedRequestsCount > 0 && utils.gR[key] === utils.gR.RECEIVED_REQUESTS && JSX_("div", {
        className: "notifications-count"
      }, receivedRequestsCount > 9 ? '9+' : receivedRequestsCount)));
    }
    return null;
  })));
};
 const navigation = Navigation;
// EXTERNAL MODULE: ./js/ui/utils.jsx
const ui_utils = REQ_(6411);
;// ./js/chat/ui/contactsPanel/nil.jsx



class Nil extends REaCt().Component {
  componentDidMount() {
    setContactLink();
  }
  render() {
    const {
      title
    } = this.props;
    return JSX_("div", {
      className: "fm-empty-section fm-empty-contacts"
    }, JSX_("div", {
      className: "fm-empty-pad"
    }, JSX_("i", {
      className: "section-icon sprite-fm-mono icon-contacts"
    }), JSX_("div", {
      className: "fm-empty-cloud-txt"
    }, title), JSX_("div", {
      className: "fm-empty-description"
    }, l[19115]), JSX_(buttons.$, {
      className: "mega-button positive large fm-empty-button",
      onClick: () => contactAddDialog()
    }, JSX_("span", null, l[71])), JSX_("div", {
      className: "empty-share-public"
    }, JSX_("i", {
      className: "sprite-fm-mono icon-link-circle"
    }), JSX_(ui_utils.P9, null, l[19111]))));
  }
}
// EXTERNAL MODULE: ./js/ui/jsx/fm/fmView.jsx + 10 modules
const fmView = REQ_(872);
// EXTERNAL MODULE: ./js/chat/ui/contacts.jsx
const contacts = REQ_(8022);
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/genericNodePropsComponent.jsx + 1 modules
const genericNodePropsComponent = REQ_(4285);
;// ./js/ui/jsx/fm/nodes/columns/columnContactName.jsx




class ColumnContactName extends genericNodePropsComponent.B {
  constructor(...args) {
    super(...args);
    this.Mail = (0,ui_utils.T9)(() => JSX_("span", {
      className: "contact-item-email"
    }, this.props.nodeAdapter.props.node.m));
  }
  static get label() {
    return l[86];
  }
  get name() {
    const {
      nodeAdapter,
      node
    } = this.props;
    if (nodeAdapter.nodeProps) {
      return nodeAdapter.nodeProps.title;
    }
    return M.getNameByEmail(node.m);
  }
  _renderAvatar() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    if (nodeAdapter.nodeProps || node.name !== '') {
      return JSX_(contacts.eu, {
        contact: node,
        className: "avatar-wrapper box-avatar"
      });
    } else if (node.name === '') {
      return JSX_(ui_utils.P9, null, useravatar.contact(node.m, 'box-avatar'));
    }
    return null;
  }
  render() {
    return JSX_("td", null, this._renderAvatar(), JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-user"
    }, JSX_(ui_utils.sp, null, this.name)), JSX_(this.Mail, null)), JSX_("div", {
      className: "clear"
    }));
  }
}
ColumnContactName.sortable = true;
ColumnContactName.id = "name";
ColumnContactName.megatype = "name";
;// ./js/ui/jsx/fm/nodes/columns/columnContactStatus.jsx


class ColumnContactStatus extends genericNodePropsComponent.B {
  static get label() {
    return l[89];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {onlineStatus} = nodeAdapter.nodeProps;
    return JSX_("td", {
      megatype: ColumnContactStatus.megatype,
      className: ColumnContactStatus.megatype
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-status"
    }, JSX_("div", {
      className: `user-card-presence ${  onlineStatus[1]}`
    }), onlineStatus[0])));
  }
}
ColumnContactStatus.sortable = true;
ColumnContactStatus.id = "status";
ColumnContactStatus.megatype = "status";
;// ./js/ui/jsx/fm/nodes/columns/columnContactLastInteraction.jsx


class ColumnContactLastInteraction extends genericNodePropsComponent.B {
  constructor(...args) {
    super(...args);
    this.getLastInteractionIcon = handle => {
      const {
        interactions
      } = this.props;
      const interaction = interactions[handle];
      const {
        type,
        time
      } = interaction || {
        type: undefined,
        time: undefined
      };
      return JSX_("i", {
        className: `
                    sprite-fm-mono
                    ${parseInt(type, 10) === 0 ? 'icon-cloud' : ''}
                    ${parseInt(type, 10) === 1 ? 'icon-chat' : ''}
                    ${!time ? 'icon-minimise' : ''}
                `
      });
    };
    this.getLastInteractionTime = handle => {
      const {
        interactions
      } = this.props;
      const interaction = interactions[handle];
      return interaction ? time2last(interaction.time) : l[1051];
    };
  }
  static get label() {
    return l[5904];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      megatype: ColumnContactLastInteraction.megatype,
      className: ColumnContactLastInteraction.megatype
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-time"
    }, this.getLastInteractionIcon(node.h), this.getLastInteractionTime(node.h))));
  }
}
ColumnContactLastInteraction.sortable = true;
ColumnContactLastInteraction.id = "interaction";
ColumnContactLastInteraction.megatype = "interaction";
;// ./js/ui/jsx/fm/nodes/columns/columnContactVerifiedStatus.jsx



class ColumnContactVerifiedStatus extends genericNodePropsComponent.B {
  constructor(...args) {
    super(...args);
    this.getFingerPrintDialogLink = handle => {
      const onVerifyContactClicked = handle => {
        (0,utils.qH)(this.props.contacts[handle]);
      };
      return JSX_("div", {
        className: "verify-contact-link-container"
      }, JSX_("div", {
        className: "verify-contact-link",
        onClick: () => onVerifyContactClicked(handle)
      }, l.verify_credentials));
    };
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      megatype: ColumnContactVerifiedStatus.megatype,
      className: ColumnContactVerifiedStatus.megatype
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-verification"
    }, (0,utils.p4)(this.props.contacts[node.h]) ? ColumnContactVerifiedStatus.verifiedLabel : this.getFingerPrintDialogLink(node.h))));
  }
}
ColumnContactVerifiedStatus.sortable = true;
ColumnContactVerifiedStatus.id = "verification";
ColumnContactVerifiedStatus.megatype = "verification";
ColumnContactVerifiedStatus.label = JSX_(REaCt().Fragment, null, l.contact_ver_verification, "\xA0", JSX_("i", {
  className: "simpletip sprite-fm-mono contacts-verification-icon icon-info",
  "data-simpletip": l.contact_ver_tooltip_content,
  "data-simpletip-class": "contacts-verification-icon-simpletip"
}));
ColumnContactVerifiedStatus.verifiedLabel = JSX_("div", {
  className: "verified-contact-label-container"
}, JSX_("i", {
  className: "small-icon icons-sprite tiny-green-tick"
}), l[6776]);
// EXTERNAL MODULE: ./js/ui/dropdowns.jsx
const dropdowns = REQ_(1510);
// EXTERNAL MODULE: ./js/chat/ui/meetings/utils.jsx
const meetings_utils = REQ_(3901);
// EXTERNAL MODULE: ./js/chat/ui/conversations.jsx + 2 modules
const conversations = REQ_(4904);
;// ./js/chat/ui/contactsPanel/contextMenu.jsx







class ContextMenu extends REaCt().Component {
  constructor(...args) {
    super(...args);
    this.EVENT_CLOSE = new Event('closeDropdowns');
    this.close = callback => {
      if (callback && typeof callback === 'function' && !M.isInvalidUserStatus()) {
        callback();
      }
      document.dispatchEvent(this.EVENT_CLOSE);
    };
    this.handleSetNickname = handle => this.close(() => nicknames.setNicknameDialog.init(handle));
    this.handleAddContact = handle => {
      M.syncContactEmail(handle, true).then(email => {
        const OPC = Object.values(M.opc);
        const ALREADY_SENT = OPC && OPC.length && OPC.some(opc => opc.m === email);
        this.close(() => {
          if (ALREADY_SENT) {
            return msgDialog('warningb', '', l[17545]);
          }
          msgDialog('info', l[150], l[5898]);
          M.inviteContact(M.u[u_handle].m, email);
        });
      }).catch(nop);
    };
  }
  render() {
    const {
      contact,
      selected,
      withProfile
    } = this.props;
    if ((0,utils.X7)(contact)) {
      return JSX_(REaCt().Fragment, null, withProfile && JSX_("div", {
        className: "dropdown-avatar rounded",
        onClick: e => {
          e.stopPropagation();
          loadSubPage(`fm/chat/contacts/${contact.h}`);
        }
      }, JSX_(contacts.eu, {
        contact,
        className: "avatar-wrapper context-avatar"
      }), JSX_("div", {
        className: "dropdown-profile"
      }, JSX_("span", null, JSX_(ui_utils.zT, null, M.getNameByHandle(contact.u))), JSX_(contacts.i1, {
        contact
      }))), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-chat",
        label: l[8632],
        onClick: () => this.close(() => {
          if (selected && selected.length) {
            return megaChat.createAndShowGroupRoomFor(selected, '', {
              keyRotation: true,
              createChatLink: false
            });
          }
          loadSubPage(`fm/chat/p/${contact.u}`);
          megaChat.trigger(conversations.qY.NAV_RENDER_VIEW, conversations.Vw.CHATS);
        })
      }), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-send-files",
        label: l[6834],
        onClick: () => this.close(() => megaChat.openChatAndSendFilesDialog(contact.u))
      }), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-folder-outgoing-share",
        label: l[5631],
        onClick: () => this.close(() => openCopyShareDialog(contact.u))
      }), JSX_("div", {
        "data-simpletipposition": "top",
        className: "simpletip",
        "data-simpletip": !megaChat.hasSupportForCalls ? l.call_not_suported : ''
      }, JSX_(dropdowns.tJ, {
        submenu: megaChat.hasSupportForCalls,
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        icon: "sprite-fm-mono icon-phone",
        className: "sprite-fm-mono-before icon-arrow-right-before",
        label: l[19125]
      }), JSX_("div", {
        className: "dropdown body submenu"
      }, JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-phone",
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        label: l[5896],
        onClick: () => (0,meetings_utils.dQ)().then(() => this.close(() => megaChat.createAndShowPrivateRoom(contact.u).then(room => {
          room.setActive();
          room.startAudioCall();
        }))).catch(() => d && console.warn('Already in a call.'))
      }), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-video-call-filled",
        disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
        label: l[5897],
        onClick: () => (0,meetings_utils.dQ)().then(() => this.close(() => megaChat.createAndShowPrivateRoom(contact.u).then(room => {
          room.setActive();
          room.startVideoCall();
        }))).catch(() => d && console.warn('Already in a call.'))
      }))), JSX_("hr", null), withProfile && JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-my-account",
        label: l[5868],
        onClick: () => loadSubPage(`fm/chat/contacts/${contact.u}`)
      }), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-rename",
        label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
        onClick: () => this.handleSetNickname(contact.u)
      }), JSX_("hr", null), JSX_(dropdowns.tJ, {
        submenu: true,
        icon: "sprite-fm-mono icon-key",
        className: "sprite-fm-mono-before icon-arrow-right-before",
        label: l[6872]
      }), JSX_("div", {
        className: "dropdown body white-context-menu submenu"
      }, (0,utils.p4)(contact) ? JSX_(dropdowns.tJ, {
        label: l[742],
        onClick: () => this.close(() => (0,utils.U_)(contact))
      }) : JSX_(dropdowns.tJ, {
        label: l[1960],
        onClick: () => this.close(() => (0,utils.qH)(contact))
      })), JSX_("div", {
        className: "dropdown-credentials"
      }, (0,utils.ym)(contact.u)), JSX_("hr", null), JSX_(dropdowns.tJ, {
        icon: "sprite-fm-mono icon-disable",
        label: l[1001],
        disabled: !!contact.b,
        className: "",
        onClick: () => this.close(() => fmremove(contact.u))
      }));
    }
    return JSX_(REaCt().Fragment, null, JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-disabled-filled",
      label: l[71],
      onClick: () => this.handleAddContact(contact.u)
    }), JSX_(dropdowns.tJ, {
      icon: "sprite-fm-mono icon-rename",
      label: contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label,
      onClick: () => this.handleSetNickname(contact.u)
    }));
  }
}
;// ./js/ui/jsx/fm/nodes/columns/columnContactButtons.jsx







class ColumnContactButtons extends genericNodePropsComponent.B {
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node,
      selected
    } = nodeAdapter.props;
    const handle = node.h;
    return JSX_("td", {
      megatype: ColumnContactButtons.megatype,
      className: ColumnContactButtons.megatype
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-controls"
    }, JSX_(buttons.$, {
      className: "mega-button action simpletip",
      icon: "sprite-fm-mono icon-phone",
      attrs: {
        'data-simpletip': !megaChat.hasSupportForCalls ? l.unsupported_browser_audio : l[5896]
      },
      disabled: !navigator.onLine || !megaChat.hasSupportForCalls,
      onClick: () => (0,meetings_utils.dQ)().then(() => megaChat.createAndShowPrivateRoom(handle).then(room => {
        room.setActive();
        room.startAudioCall();
      })).catch(() => d && console.warn('Already in a call.'))
    }), JSX_(buttons.$, {
      className: "mega-button action simpletip",
      icon: "sprite-fm-mono icon-chat",
      attrs: {
        'data-simpletip': l[8632]
      },
      onClick: () => {
        loadSubPage(`fm/chat/p/${handle}`);
        megaChat.trigger(conversations.qY.NAV_RENDER_VIEW, conversations.Vw.CHATS);
      }
    }), JSX_(buttons.$, {
      className: "mega-button action simpletip",
      icon: "sprite-fm-mono icon-send-files",
      attrs: {
        'data-simpletip': l[6834]
      },
      onClick: () => megaChat.openChatAndSendFilesDialog(handle)
    }), JSX_(buttons.$, {
      ref: node => {
        this.props.onContextMenuRef(handle, node);
      },
      className: "mega-button action contact-more",
      icon: "sprite-fm-mono icon-options"
    }, JSX_(dropdowns.ms, {
      className: "context",
      noArrow: true,
      positionMy: "left bottom",
      positionAt: "right bottom",
      positionLeft: this.props.contextMenuPosition || null,
      horizOffset: 4,
      onActiveChange: opened => {
        this.props.onActiveChange(opened);
      }
    }, JSX_(ContextMenu, {
      contact: node,
      selected,
      withProfile: true
    }))))));
  }
}
ColumnContactButtons.sortable = false;
ColumnContactButtons.id = "grid-url-header-nw";
ColumnContactButtons.label = "";
ColumnContactButtons.megatype = "grid-url-header-nw";
// EXTERNAL MODULE: ./js/chat/ui/updateObserver.jsx
const updateObserver = REQ_(4372);
;// ./js/chat/ui/contactsPanel/contactList.jsx










class ContactList extends mixins.w9 {
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.contextMenuRefs = [];
    this.state = {
      selected: [],
      searchValue: null,
      interactions: {},
      contextMenuPosition: null
    };
    this.onSelected = this.onSelected.bind(this);
    this.onHighlighted = this.onHighlighted.bind(this);
    this.onExpand = this.onExpand.bind(this);
    this.onAttachClicked = this.onAttachClicked.bind(this);
    this.getLastInteractions = this.getLastInteractions.bind(this);
  }
  getLastInteractions() {
    const {
      contacts
    } = this.props;
    const promises = [];
    const push = handle => {
      promises.push(Promise.resolve(getLastInteractionWith(handle, true, true)).then(ts => [ts, handle]));
    };
    for (const handle in contacts) {
      if (contacts[handle].c === 1) {
        push(handle);
      }
    }
    Promise.allSettled(promises).then(res => {
      if (this.isMounted()) {
        const interactions = {};
        for (let i = res.length; i--;) {
          if (res[i].status !== 'fulfilled') {
            if (d && res[i].reason !== false) {
              console.warn('getLastInteractions', res[i].reason);
            }
          } else {
            const [ts, u] = res[i].value;
            const [type, time] = ts.split(':');
            interactions[u] = {
              u,
              type,
              time
            };
          }
        }
        this.setState({
          interactions
        });
      }
    }).catch(ex => {
      console.error("Failed to handle last interactions!", ex);
    });
  }
  handleContextMenu(ev, handle) {
    ev.preventDefault();
    ev.persist();
    if (this.state.selected.length > 1) {
      return null;
    }
    const $$REF = this.contextMenuRefs[handle];
    if ($$REF && $$REF.isMounted()) {
      let _$$REF$domRef;
      const refNodePosition = ((_$$REF$domRef = $$REF.domRef) == null ? void 0 : _$$REF$domRef.current) && $$REF.domRef.current.getBoundingClientRect().x;
      this.setState({
        contextMenuPosition: ev.clientX > refNodePosition ? null : ev.clientX
      }, () => $$REF.onClick(ev));
    }
  }
  onSelected(handle) {
    this.setState({
      'selected': handle
    });
  }
  onHighlighted(handle) {
    this.setState({
      'highlighted': handle
    });
  }
  onExpand(handle) {
    loadSubPage(`/fm/chat/contacts/${  handle}`);
  }
  onAttachClicked() {
    if (this.state.selected[0]) {
      this.onExpand(this.state.selected[0]);
    }
  }
  componentDidMount() {
    super.componentDidMount();
    this.getLastInteractions();
  }
  render() {
    const {
      contacts
    } = this.props;
    if (contacts && contacts.length > 1) {
      return JSX_("div", {
        ref: this.domRef,
        className: "contacts-list"
      }, JSX_(fmView.A, {
        dataSource: contacts,
        customFilterFn: r => {
          return r.c === 1;
        },
        currentlyViewedEntry: "contacts",
        onSelected: this.onSelected,
        onHighlighted: this.onHighlighted,
        searchValue: this.state.searchValue,
        onExpand: this.onExpand,
        onAttachClicked: this.onAttachClicked,
        viewMode: 0,
        currentdirid: "contacts",
        megaListItemHeight: 59,
        headerContainerClassName: "contacts-table contacts-table-head",
        containerClassName: "contacts-table contacts-table-results",
        onContextMenu: (ev, handle) => this.handleContextMenu(ev, handle),
        listAdapterColumns: [ColumnContactName, ColumnContactStatus, [ColumnContactLastInteraction, {
          interactions: this.state.interactions
        }], [ColumnContactVerifiedStatus, {
          contacts
        }], [ColumnContactButtons, {
          onContextMenuRef: (handle, node) => {
            this.contextMenuRefs[handle] = node;
          },
          onActiveChange: opened => {
            if (!opened) {
              this.setState({
                contextMenuPosition: null
              });
            }
          },
          contextMenuPosition: this.state.contextMenuPosition
        }]],
        initialSortBy: ['status', 'asc'],
        fmConfigSortEnabled: true,
        fmConfigSortId: "contacts",
        NilComponent: JSX_(Nil, {
          title: l[5737]
        })
      }));
    }
    return JSX_(Nil, {
      title: l[5737]
    });
  }
}
ContactList.updateListener = 'getLastInteractions';
ContactList.updateInterval = 6e4;
 const contactList = (0,mixins.Zz)(updateObserver.Y)(ContactList);
;// ./js/ui/jsx/fm/nodes/columns/columnContactRequestsEmail.jsx



class ColumnContactRequestsEmail extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  static get label() {
    return l[95];
  }
  render() {
    const {
      nodeAdapter,
      currView
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      ref: this.domRef
    }, currView && currView === 'opc' ? JSX_("span", null, JSX_("i", {
      className: "sprite-fm-uni icon-send-requests"
    })) : JSX_(ui_utils.P9, null, useravatar.contact(node.m, 'box-avatar')), JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-user"
    }, node.m)), JSX_("div", {
      className: "clear"
    }));
  }
}
ColumnContactRequestsEmail.sortable = true;
ColumnContactRequestsEmail.id = "email";
ColumnContactRequestsEmail.megatype = "email";
;// ./js/ui/jsx/fm/nodes/columns/columnContactRequestsTs.jsx


class ColumnContactRequestsTs extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  static get label() {
    return l[19506];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    let timestamp = node.rts || node.ts;
    if (timestamp) {
      timestamp = time2last(timestamp);
    } else {
      timestamp = node.dts ? l[6112] : "";
    }
    return JSX_("td", {
      ref: this.domRef
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-time"
    }, timestamp)), JSX_("div", {
      className: "clear"
    }));
  }
}
ColumnContactRequestsTs.sortable = true;
ColumnContactRequestsTs.id = "ts";
ColumnContactRequestsTs.megatype = "ts";
;// ./js/ui/jsx/fm/nodes/columns/columnContactRequestsRcvdBtns.jsx



class ColumnContactRequestsRcvdBtns extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      ref: this.domRef,
      megatype: ColumnContactRequestsRcvdBtns.megatype,
      className: ColumnContactRequestsRcvdBtns.megatype
    }, JSX_("div", {
      className: "contact-item-controls"
    }, JSX_(buttons.$, {
      className: "mega-button action contact-reject",
      icon: "sprite-fm-mono icon-close-component",
      label: l[20981],
      onClick: () => this.props.onReject(node.p)
    }), JSX_(buttons.$, {
      className: "mega-button action contact-block",
      icon: "sprite-fm-mono icon-disable",
      label: l[20980],
      onClick: () => this.props.onBlock(node.p)
    }), JSX_(buttons.$, {
      className: "mega-button action contact-accept",
      icon: "sprite-fm-mono icon-check",
      label: l[5856],
      onClick: () => this.props.onAccept(node.p)
    })));
  }
}
ColumnContactRequestsRcvdBtns.sortable = true;
ColumnContactRequestsRcvdBtns.id = "grid-url-header-nw";
ColumnContactRequestsRcvdBtns.label = "";
ColumnContactRequestsRcvdBtns.megatype = "grid-url-header-nw contact-controls-container";
;// ./js/chat/ui/contactsPanel/receivedRequests.jsx







const ReceivedRequests = ({
  received
}) => {
  const nameOrEmailColumn = received.mixed ? ColumnContactName : [ColumnContactRequestsEmail, {
    currView: "ipc"
  }];
  return JSX_("div", {
    className: "contacts-list"
  }, JSX_(fmView.A, {
    sortFoldersFirst: false,
    dataSource: received.data,
    customFilterFn: r => {
      return !r.dts;
    },
    currentlyViewedEntry: "ipc",
    onSelected: nop,
    onHighlighted: nop,
    onExpand: nop,
    onAttachClicked: nop,
    viewMode: 0,
    currentdirid: "ipc",
    megaListItemHeight: 59,
    headerContainerClassName: "contacts-table requests-table contacts-table-head",
    containerClassName: "contacts-table requests-table contacts-table-results",
    listAdapterColumns: [nameOrEmailColumn, [ColumnContactRequestsTs, {
      label: l[19505]
    }], [ColumnContactRequestsRcvdBtns, {
      onReject: handle => {
        M.denyPendingContactRequest(handle).catch(dump);
      },
      onBlock: handle => {
        M.ignorePendingContactRequest(handle).catch(dump);
      },
      onAccept: handle => {
        M.acceptPendingContactRequest(handle).catch(dump);
      }
    }]],
    keyProp: "p",
    nodeAdapterProps: {
      'className': node => {
        return `
                        ${node.dts || node.s && node.s === 3 ? 'deleted' : ''}
                        ${node.s && node.s === 1 ? 'ignored' : ''}
                    `;
      }
    },
    NilComponent: () => {
      return JSX_(Nil, {
        title: l[6196]
      });
    },
    initialSortBy: ['email', 'asc'],
    fmConfigSortEnabled: true,
    fmConfigSortId: "ipc"
  }));
};
 const receivedRequests = ReceivedRequests;
;// ./js/ui/jsx/fm/nodes/columns/columnContactRequestsSentBtns.jsx



class ColumnContactRequestsSentBtns extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.reinviteAllowed = rts => {
      const UTC_DATE_NOW = Math.floor(Date.now() / 1000);
      return UTC_DATE_NOW > rts + 1209600;
    };
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      ref: this.domRef,
      megatype: ColumnContactRequestsSentBtns.megatype,
      className: ColumnContactRequestsSentBtns.megatype
    }, JSX_("div", {
      className: "contact-item-controls contact-request-sent"
    }, !node.dts && this.reinviteAllowed(node.rts) && JSX_(buttons.$, {
      className: "mega-button action",
      icon: "sprite-fm-mono icon-rewind",
      label: l[5861],
      onClick: () => this.props.onReinvite(node.m)
    }), !node.dts && JSX_(buttons.$, {
      className: "mega-button action contact-reject",
      icon: "sprite-fm-mono icon-close-component",
      label: l.msg_dlg_cancel,
      onClick: () => this.props.onReject(node.m)
    })));
  }
}
ColumnContactRequestsSentBtns.sortable = true;
ColumnContactRequestsSentBtns.id = "grid-url-header-nw";
ColumnContactRequestsSentBtns.label = "";
ColumnContactRequestsSentBtns.megatype = "grid-url-header-nw contact-controls-container";
;// ./js/ui/jsx/fm/nodes/columns/columnContactRequestsRts.jsx


class ColumnContactRequestsRts extends ColumnContactRequestsTs {
  static get label() {
    return l[19506];
  }
}
ColumnContactRequestsRts.sortable = true;
ColumnContactRequestsRts.id = "rts";
ColumnContactRequestsRts.megatype = "rts";
;// ./js/chat/ui/contactsPanel/sentRequests.jsx






const SentRequests = ({
  sent
}) => {
  return JSX_("div", {
    className: "contacts-list"
  }, JSX_(fmView.A, {
    sortFoldersFirst: false,
    dataSource: sent,
    currentlyViewedEntry: "opc",
    onSelected: nop,
    onHighlighted: nop,
    onExpand: nop,
    onAttachClicked: nop,
    viewMode: 0,
    currentdirid: "opc",
    megaListItemHeight: 59,
    headerContainerClassName: "contacts-table requests-table contacts-table-head",
    containerClassName: "contacts-table requests-table contacts-table-results",
    listAdapterColumns: [[ColumnContactRequestsEmail, {
      currView: "opc"
    }], ColumnContactRequestsRts, [ColumnContactRequestsSentBtns, {
      onReject: email => {
        M.cancelPendingContactRequest(email).catch(ex => {
          if (ex === EARGS) {
            msgDialog('info', '', 'This pending contact is already deleted.');
          } else {
            tell(ex);
          }
        });
      },
      onReinvite: email => {
        M.reinvitePendingContactRequest(email).then(() => contactsInfoDialog(l[19126], email, l[19127])).catch(tell);
      }
    }]],
    NilComponent: () => {
      return JSX_(Nil, {
        title: l[6196]
      });
    },
    listAdapterOpts: {
      'className': node => node.dts && ' disabled'
    },
    keyProp: "p",
    initialSortBy: ['email', 'asc'],
    fmConfigSortEnabled: true,
    fmConfigSortMap: {
      'rts': 'rTimeStamp'
    },
    fmConfigSortId: "opc"
  }));
};
 const sentRequests = SentRequests;
// EXTERNAL MODULE: ./js/ui/jsx/fm/nodes/columns/columnFavIcon.jsx
const columnFavIcon = REQ_(6794);
;// ./js/ui/jsx/fm/nodes/columns/columnSharedFolderName.jsx


class ColumnSharedFolderName extends genericNodePropsComponent.B {
  static get label() {
    return l[86];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    return JSX_("td", {
      megatype: ColumnSharedFolderName.megatype,
      className: ColumnSharedFolderName.megatype
    }, JSX_("div", {
      className: "item-type-icon-90 icon-folder-incoming-90 sprite-fm-uni-after icon-warning-after"
    }), JSX_("div", {
      className: "shared-folder-info-block"
    }, JSX_("div", {
      className: "shared-folder-name"
    }, missingkeys[node.h] ? l[8686] : nodeAdapter.nodeProps.title), JSX_("div", {
      className: "shared-folder-info"
    }, fm_contains(node.tf, node.td))));
  }
}
ColumnSharedFolderName.sortable = true;
ColumnSharedFolderName.id = "name";
ColumnSharedFolderName.megatype = "name";
;// ./js/ui/jsx/fm/nodes/columns/columnSharedFolderAccess.jsx


class ColumnSharedFolderAccess extends genericNodePropsComponent.B {
  static get label() {
    return l[5906];
  }
  render() {
    const {
      nodeAdapter
    } = this.props;
    return JSX_("td", {
      megatype: ColumnSharedFolderAccess.megatype,
      className: ColumnSharedFolderAccess.megatype
    }, JSX_("div", {
      className: "shared-folder-access"
    }, JSX_("i", {
      className: `
                            sprite-fm-mono
                            ${nodeAdapter.nodeProps.incomingShareData.accessIcon}
                        `
    }), JSX_("span", null, nodeAdapter.nodeProps.incomingShareData.accessLabel)));
  }
}
ColumnSharedFolderAccess.sortable = true;
ColumnSharedFolderAccess.id = 'access';
ColumnSharedFolderAccess.megatype = 'access';
;// ./js/ui/jsx/fm/nodes/columns/columnSharedFolderButtons.jsx



class ColumnSharedFolderButtons extends genericNodePropsComponent.B {
  render() {
    const {
      nodeAdapter
    } = this.props;
    const {
      node
    } = nodeAdapter.props;
    const handle = node.h;
    return JSX_("td", {
      megatype: ColumnSharedFolderButtons.megatype,
      className: ColumnSharedFolderButtons.megatype
    }, JSX_("div", {
      className: "contact-item"
    }, JSX_("div", {
      className: "contact-item-controls"
    }, JSX_(buttons.$, {
      className: "mega-button action contact-more",
      icon: "sprite-fm-mono icon-options",
      onClick: (button, e) => {
        e.persist();
        $.selected = [handle];
        e.preventDefault();
        e.stopPropagation();
        e.delegateTarget = $(e.target).parents('td')[0];
        e.currentTarget = $(e.target).parents('tr');
        if (!$(e.target).hasClass('active')) {
          M.contextMenuUI(e, 1);
          $(this).addClass('active');
        } else {
          $.hideContextMenu();
          $(e.target).removeClass('active');
        }
      }
    }))));
  }
}
ColumnSharedFolderButtons.sortable = true;
ColumnSharedFolderButtons.id = "grid-url-header-nw";
ColumnSharedFolderButtons.label = "";
ColumnSharedFolderButtons.megatype = "grid-url-header-nw";
// EXTERNAL MODULE: ./js/chat/ui/link.jsx
const ui_link = REQ_(4649);
;// ./js/chat/ui/contactsPanel/contactProfile.jsx
















class ContactProfile extends mixins.w9 {
  constructor(...args) {
    super(...args);
    this.domRef = REaCt().createRef();
    this.state = {
      selected: [],
      loading: true
    };
    this.onAttachClicked = () => {
      const {
        selected
      } = this.state;
      if (selected[0]) {
        this.onExpand(selected[0]);
      }
    };
    this.onExpand = handle => loadSubPage(`fm/${handle}`);
    this.Breadcrumb = () => {
      const {
        handle
      } = this.props;
      return JSX_("div", {
        className: "profile-breadcrumb"
      }, JSX_("ul", null, JSX_("li", null, JSX_(ui_link.A, {
        to: "/fm/chat/contacts"
      }, utils.d_.CONTACTS), JSX_("i", {
        className: "sprite-fm-mono icon-arrow-right"
      })), JSX_("li", null, JSX_(ui_utils.zT, null, M.getNameByHandle(handle)))));
    };
    this.Credentials = () => {
      const {
        handle
      } = this.props;
      const contact = M.u[handle];
      if (handle && contact && contact.c === 1) {
        const IS_VERIFIED = (0,utils.p4)(contact);
        return JSX_("div", {
          className: "profile-credentials"
        }, JSX_("span", {
          className: "credentials-head"
        }, l[6872]), JSX_("div", {
          className: "credentials-fingerprints"
        }, (0,utils.ym)(handle)), JSX_("button", {
          className: `
                            mega-button
                            small
                            ${IS_VERIFIED ? '' : 'positive'}
                        `,
          onClick: () => (IS_VERIFIED ? utils.U_ : utils.qH)(contact)
        }, IS_VERIFIED ? l[742] : l.verify_credentials));
      }
      return null;
    };
    this.handleContextMenu = (e, handle) => {
      e.persist();
      e.preventDefault();
      e.stopPropagation();
      e.delegateTarget = e.target.tagName === "TR" ? e.target : $(e.target).parents('tr')[0];
      e.currentTarget = $(e.delegateTarget);
      $.selected = [handle];
      M.contextMenuUI(e, 1);
    };
  }
  UNSAFE_componentWillMount() {
    if (super.UNSAFE_componentWillMount) {
      super.UNSAFE_componentWillMount();
    }
    const {
      handle
    } = this.props;
    if (handle) {
      const contact = M.u[handle];
      if (contact) {
        this._listener = contact.addChangeListener(() => {
          if (contact && contact.c === 1) {
            this.safeForceUpdate();
          } else {
            loadSubPage("/fm/chat/contacts");
            return 0xDEAD;
          }
        });
      }
    }
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    if (this._listener) {
      const {
        handle
      } = this.props;
      const contact = M.u[handle];
      contact.removeChangeListener(this._listener);
    }
  }
  componentDidMount() {
    super.componentDidMount();
    dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise()).finally(() => {
      if (this.isMounted()) {
        this.setState({
          'loading': false
        });
      }
    });
  }
  getSharedFoldersView() {
    return this.state.loading ? null : JSX_(fmView.A, {
      currentlyViewedEntry: this.props.handle,
      onSelected: handle => this.setState({
        selected: handle
      }),
      onHighlighted: nop,
      searchValue: this.state.searchValue,
      onExpand: this.onExpand,
      onAttachClicked: this.onAttachClicked,
      viewMode: 0,
      currentdirid: "shares",
      megaListItemHeight: 65,
      headerContainerClassName: "grid-table-header",
      containerClassName: "grid-table shared-with-me",
      onContextMenu: (ev, handle) => this.handleContextMenu(ev, handle),
      listAdapterColumns: [columnFavIcon.$, [ColumnSharedFolderName, {
        'label': `${l.shared_folders_from.replace('%NAME', M.getNameByHandle(this.props.handle))}`
      }], ColumnSharedFolderAccess, ColumnSharedFolderButtons]
    });
  }
  render() {
    const {
      handle
    } = this.props;
    if (handle) {
      const contact = M.u[handle];
      if (!contact || contact.c !== 1) {
        return JSX_(Nil, {
          title: l.contact_not_found
        });
      }
      const HAS_RELATIONSHIP = (0,utils.X7)(contact);
      return JSX_("div", {
        ref: this.domRef,
        className: "contacts-profile"
      }, JSX_(this.Breadcrumb, null), JSX_("div", {
        className: "profile-content"
      }, JSX_("div", {
        className: "profile-head"
      }, HAS_RELATIONSHIP && JSX_(this.Credentials, null), JSX_(contacts.eu, {
        contact,
        className: "profile-photo avatar-wrapper contacts-medium-avatar"
      }), JSX_("div", {
        className: "profile-info"
      }, JSX_("h2", null, JSX_(ui_utils.zT, null, M.getNameByHandle(handle)), JSX_(contacts.i1, {
        contact
      })), JSX_("span", null, contact.m)), HAS_RELATIONSHIP && JSX_("div", {
        className: "profile-controls"
      }, JSX_(buttons.$, {
        className: "mega-button round simpletip",
        icon: "sprite-fm-mono icon-chat-filled",
        attrs: {
          'data-simpletip': l[8632]
        },
        onClick: () => {
          loadSubPage(`fm/chat/p/${handle}`);
          megaChat.trigger(conversations.qY.NAV_RENDER_VIEW, conversations.Vw.CHATS);
        }
      }), JSX_(buttons.$, {
        className: "mega-button round simpletip",
        icon: "sprite-fm-mono icon-send-files",
        attrs: {
          'data-simpletip': l[6834]
        },
        onClick: () => {
          if (M.isInvalidUserStatus()) {
            return;
          }
          megaChat.openChatAndSendFilesDialog(handle);
        }
      }), JSX_(buttons.$, {
        className: "mega-button round",
        icon: "sprite-fm-mono icon-options"
      }, JSX_(dropdowns.ms, {
        className: "context",
        noArrow: true,
        positionMy: "left bottom",
        positionAt: "right bottom",
        horizOffset: 4
      }, JSX_(ContextMenu, {
        contact
      }))))), JSX_("div", {
        className: "profile-shared-folders"
      }, this.getSharedFoldersView())));
    }
    return null;
  }
}
;// ./js/chat/ui/contactsPanel/contactsPanel.jsx








class ContactsPanel extends mixins.w9 {
  get view() {
    switch (megaChat.routingSubSection) {
      case null:
        return utils.gR.CONTACTS;
      case "contact":
        return utils.gR.PROFILE;
      case "received":
        return utils.gR.RECEIVED_REQUESTS;
      case "sent":
        return utils.gR.SENT_REQUESTS;
      default:
        console.error("Shouldn't happen.");
        return false;
    }
  }
  constructor(props) {
    super(props);
    this.domRef = REaCt().createRef();
    this.requestReceivedListener = null;
    this.state = {
      receivedRequestsCount: 0
    };
    this.handleToggle = ({
      keyCode
    }) => {
      if (keyCode === 27) {
        const HAS_DIALOG_OPENED = $.dialog || ['.contact-nickname-dialog', '.fingerprint-dialog', '.context'].some(selector => {
          const dialog = document.querySelector(selector);
          return dialog && dialog.offsetHeight > 0;
        });
        return HAS_DIALOG_OPENED ? keyCode : loadSubPage('fm/chat');
      }
    };
    this.handleAcceptAllRequests = () => {
      const {
        data: received
      } = this.props.received;
      const receivedKeys = Object.keys(received || {});
      if (receivedKeys.length) {
        for (let i = receivedKeys.length; i--;) {
          M.acceptPendingContactRequest(receivedKeys[i]).catch(dump);
        }
      }
    };
    this.renderView = () => {
      const {
        contacts,
        received,
        sent
      } = this.props;
      const {
        view
      } = this;
      switch (view) {
        case utils.gR.CONTACTS:
          return JSX_(contactList, {
            contacts
          });
        case utils.gR.PROFILE:
          return JSX_(ContactProfile, {
            handle: view === utils.gR.PROFILE && megaChat.routingParams
          });
        case utils.gR.RECEIVED_REQUESTS:
          return JSX_(receivedRequests, {
            received
          });
        case utils.gR.SENT_REQUESTS:
          return JSX_(sentRequests, {
            sent
          });
      }
    };
    this.state.receivedRequestsCount = Object.keys(M.ipc).length;
  }
  componentWillUnmount() {
    super.componentWillUnmount();
    document.documentElement.removeEventListener(utils.qY.KEYDOWN, this.handleToggle);
    if (this.requestReceivedListener) {
      mBroadcaster.removeListener(this.requestReceivedListener);
    }
  }
  componentDidMount() {
    super.componentDidMount();
    document.documentElement.addEventListener(utils.qY.KEYDOWN, this.handleToggle);
    this.requestReceivedListener = mBroadcaster.addListener('fmViewUpdate:ipc', () => this.setState({
      receivedRequestsCount: Object.keys(M.ipc).length
    }));
  }
  render() {
    const {
      view,
      state
    } = this;
    const {
      receivedRequestsCount
    } = state;
    return JSX_("div", {
      ref: this.domRef,
      className: "contacts-panel"
    }, JSX_(navigation, {
      view,
      contacts: this.props.contacts,
      receivedRequestsCount
    }), view !== utils.gR.PROFILE && JSX_("div", {
      className: "contacts-actions"
    }, view === utils.gR.RECEIVED_REQUESTS && receivedRequestsCount > 1 && JSX_("button", {
      className: "mega-button action",
      onClick: this.handleAcceptAllRequests
    }, JSX_("i", {
      className: "sprite-fm-mono icon-check"
    }), JSX_("span", null, l[19062]))), JSX_("div", {
      className: "contacts-content"
    }, this.renderView()));
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

 }

}]);