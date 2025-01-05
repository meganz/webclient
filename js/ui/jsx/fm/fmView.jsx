import React from 'react';
import {MegaRenderMixin} from "../../../chat/mixins";
import BrowserEntries from "./browserEntries.jsx";

/**
 * For now, this is just a wrapper around BrowserEntries that generates the entries and passes them down to
 * BrowserEntries for rendering, but the logic is that anything that needs to be added around the list of entries
 * should be added here (tool bars, status bars, etc)
 */

export default class FMView extends MegaRenderMixin {
    domRef = React.createRef();

    constructor(props) {
        super(props);

        let initialSortBy = props.initialSortBy || [
            'name', 'asc'
        ];

        if (props.fmConfigSortEnabled) {
            const sortId = props.fmConfigSortId;
            assert(sortId, 'missing fmConfigSortId');

            if (fmconfig.sortmodes?.[sortId]?.n) {
                initialSortBy = this._translateFmConfigSortMode(fmconfig.sortmodes?.[sortId]);
            }
        }

        this.state = {
            'sortBy': initialSortBy,
            'selected': [],
            'highlighted': [],
            'entries': null
        };

        if (this.props.dataSource) {
            this.dataSource = this.props.dataSource;
        }
        else {
            this.dataSource = M.d;
        }
        this.state.entries = this.getEntries();

        this.onAttachClicked = this.onAttachClicked.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        if (this.dataSource?.addChangeListener) {
            this._listener = this.dataSource.addChangeListener(() => {
                if (!this.isMounted()) {
                    return;
                }

                this.setState({'entries': this.getEntries()});
            });
        }
        this.initSelectionManager();
    }
    _translateFmConfigSortMode(currentSortModes) {
        const sortId = this.props.fmConfigSortId;
        assert(sortId, 'missing fmConfigSortId');

        const sortByArr = [];

        if (currentSortModes?.n) {
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
        this.selectionManager = new SelectionManager2_React(
            entries || this.state.entries,
            this.props.currentdirid || "cloud-drive",
            () => {
                return this.browserEntries?.megaList?._calculated?.itemsPerRow;
            },
            (nodeHandle) => {
                if (this.browserEntries && this.browserEntries.megaList) {
                    this.browserEntries.megaList.scrollToItem(nodeHandle);
                }
            },
            {
                'onSelectedUpdated': (selectedList) => {
                    this.onSelectionUpdated(selectedList);
                }
            }
        );
    }
    onSelectionUpdated(selectedList) {
        // folderSelectNotAllowed={this.props.folderSelectNotAllowed}
        // onSelected={this.onSelected}
        // onHighlighted={this.onHighlighted}
        // onAttachClicked={this.onAttachClicked}
        selectedList = [...selectedList];
        let highlighted = selectedList;
        // If folderSelectNotAllowed and folderSelectable select a single folder
        // Browser entries should handle only allowing a single folder selection in this case.
        if (this.props.folderSelectNotAllowed && !this.props.folderSelectable) {
            selectedList = selectedList.filter((nodeId) => this.dataSource[nodeId].t !== 1);
        }

        this.setState({'selected': selectedList, 'highlighted': highlighted});
        this.props.onSelected(selectedList);
        this.props.onHighlighted(highlighted);
        $.selected = highlighted;
    }
    getEntries(newState) {
        var self = this;
        var sortBy = newState && newState.sortBy || self.state.sortBy;
        var order = sortBy[1] === "asc" ? 1 : -1;
        var entries = [];

        const minSearchLength = self.props.minSearchLength || 3;
        const showSen = mega.sensitives.showGlobally;

        if (
            self.props.currentlyViewedEntry === "search" &&
            self.props.searchValue &&
            self.props.searchValue.length >= minSearchLength
        ) {
            M.getFilterBy(M.getFilterBySearchFn(self.props.searchValue))
                .forEach(function(n) {
                    // skip contacts and invalid data.
                    if (
                        !n.h
                        || n.h.length === 11
                        || n.fv
                        || (!showSen && mega.sensitives.isSensitive(n))
                    ) {
                        return;
                    }
                    if (self.props.customFilterFn && !self.props.customFilterFn(n)) {
                        return;
                    }
                    entries.push(n);
                });
        }
        else {
            Object.keys(
                M.c[self.props.currentlyViewedEntry]
                || M.tree[self.props.currentlyViewedEntry]
                || self.props.dataSource || {}
            ).forEach((h) => {
                if (this.dataSource[h]) {
                    if (!showSen && mega.sensitives.isSensitive(this.dataSource[h])) {
                        return;
                    }
                    if (self.props.customFilterFn) {
                        if (self.props.customFilterFn(this.dataSource[h])) {
                            entries.push(this.dataSource[h]);
                        }
                    }
                    else {
                        entries.push(this.dataSource[h]);
                    }
                }
            });
        }

        var sortFunc;

        if (sortBy[0] === "name") {
            sortFunc = M.getSortByNameFn();
        }
        else if (sortBy[0] === "size") {
            sortFunc = M.getSortBySizeFn();
        }
        else if (sortBy[0] === "ts") {
            sortFunc = M.getSortByDateTimeFn();
        }
        else if (sortBy[0] === "rts") {
            sortFunc = M.getSortByRtsFn();
        }
        else if (sortBy[0] === "status") {
            sortFunc = M.getSortByStatusFn();
        }
        else if (sortBy[0] === "interaction") {
            sortFunc = M.getSortByInteractionFn();
        }
        else if (sortBy[0] === "verification") {
            sortFunc = M.getSortByVerificationFn();
        }
        else if (sortBy[0] === "email") {
            sortFunc = M.getSortByEmail();
        }
        else if (sortBy[0] === 'access') {
            sortFunc = (a, b, o) =>
                typeof a.r !== 'undefined' && typeof b.r !== 'undefined' && (a.r < b.r ? -1 : 1) * o;
        }
        else /* if(self.state.sortBy[0] === "grid-header-star") */ {
            sortFunc = M.sortByFavFn(order);
        }

        // always return first the folders and then the files
        var folders = [];

        if (this.props.sortFoldersFirst) {
            for (var i = entries.length; i--;) {
                if (entries[i] && entries[i].t) {
                    folders.unshift(entries[i]);
                    entries.splice(i, 1);
                }
            }
        }

        folders.sort(function(a, b) {
            return sortFunc(a, b, order);
        });

        entries.sort(function(a, b) {
            return sortFunc(a, b, order);
        });

        return folders.concat(entries);
    }
    onHighlighted(nodes) {
        this.setState({'highlighted': nodes});

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
        this._rawListener = mBroadcaster.addListener("fmViewUpdate:" + this.props.currentlyViewedEntry, () => {
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
        super.componentDidMount();

        if (!this.dataSource?.addChangeListener) {
            this.addOrUpdRawListener();
        }
        if (this.props.fmConfigSortEnabled) {
            this._sortModeListener = mBroadcaster.addListener("fmconfig:sortmodes", (sortModes) => {
                this.onFmConfigSortModeChanged(sortModes);
            });

        }
    }
    componentDidUpdate(prevProps) {
        const { currentlyViewedEntry: currEntry, searchValue: currSearch } = this.props;
        const { currentlyViewedEntry: prevEntry, searchValue: prevSearch } = prevProps;
        if (prevEntry !== currEntry || currSearch !== prevSearch) {
            let newState = {
                'selected': [],
                'highlighted': []
            };

            // currentlyViewedEntry changed, remove old and add new listener
            if (!this.dataSource?.addChangeListener) {
                this.addOrUpdRawListener();
            }

            const handle = currEntry;
            if (handle === 'shares') {
                newState.isLoading = true;
                this.setState(newState);

                dbfetch.geta(Object.keys(M.c.shares || {}))
                    .always(() => {
                        this.finishedLoading(newState);
                    });
                return;
            }
            if (!this.dataSource[handle] || this.dataSource[handle].t && !M.c[handle]) {
                this.setState({'isLoading': true});
                dbfetch.get(handle)
                    .always(() => {
                        this.finishedLoading(newState);
                    });
                return;
            }

            let entries = this.getEntries();
            this.initSelectionManager(entries);
            this.setState({entries: entries});
        }
    }
    onAttachClicked() {
        this.props.onAttachClicked();
    }
    onContextMenu(targetElement, ev, container) {
        // Not implemented yet, because of issues with dialogs and general logic of the current M.contextMenuUI.

        return;

        // ev.persist();
        //
        // ev.delegateTarget = ev.target;
        // // TODO: Copied and adapted off `cmIconHandler`, but it would be best to be implemented separately.
        //
        // var target = container === "tr" ? $(targetElement).closest('tr') :
        //     $(targetElement).parents('.data-block-view');
        //
        // if (!target.hasClass('ui-selected')) {
        //     target.parent().find(container).removeClass('ui-selected');
        //     this.selectionManager.clear_selection();
        // }
        // target.addClass('ui-selected');
        //
        // this.selectionManager.add_to_selection(target.attr('id'));
        // $.gridLastSelected = target[0];
        //
        // ev.preventDefault();
        // ev.stopPropagation(); // do not treat it as a regular click on the file
        // ev.currentTarget = target;
        //
        // // delay('render:search_breadcrumbs', () => M.renderSearchBreadcrumbs());
        //
        // if (!$(targetElement).hasClass('active')) {
        //     M.contextMenuUI(ev, 1);
        //     $(targetElement).addClass('active');
        // }
        // else {
        //     $.hideContextMenu();
        //     $(targetElement).removeClass('active');
        // }
        // $('.dropdown.body.files-menu.context')
        //     .css('z-index', '1116')
        //     .removeClass('hidden');
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        if (this._listener) {
            this.dataSource?.removeChangeListener(this._listener);
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
            // sort by is already the same.
            return;
        }

        const entries = this.getEntries({'sortBy': newState});
        this.setState({
            'sortBy': newState,
            'entries': entries,
            'selected': [],
            'highlighted': []
        }, () => {
            if (this.props.onSortByChanged) {
                this.props.onSortByChanged(newState);
            }

            if (this.props.fmConfigSortEnabled) {
                const sortId = this.props.fmConfigSortId;
                assert(sortId, 'fmConfigSortId missing');

                if (
                    newState[0] === this.props.initialSortBy[0] &&
                    newState[1] === this.props.initialSortBy[1]
                ) {
                    // delete if set to default sorting
                    const sortModes = typeof fmconfig.sortmodes !== 'undefined' ? fmconfig.sortmodes :
                        Object.create(null);
                    delete sortModes[sortId];
                    mega.config.set('sortmodes', sortModes);
                    return;
                }

                const map = this.props.fmConfigSortMap || Object.create(null);
                const name = map[newState[0]] || newState[0];

                const direction = newState[1] === "asc" ? 1 : -1;

                // save new sorting mode
                fmsortmode(sortId, name, direction);
            }
        });

        this.initSelectionManager(entries);
    }
    onFmConfigSortModeChanged(sortModes) {
        const currentSortMode = sortModes[this.props.fmConfigSortId];
        if (!currentSortMode) {
            // reset
            this.onSortByChanged(this.props.initialSortBy || ['name', 'asc']);
        }
        else {
            const newSortMode = this._translateFmConfigSortMode(currentSortMode);
            if (
                this.state.sortBy[0] !== newSortMode[0] ||
                this.state.sortBy[1] !== newSortMode[1]
            ) {
                this.onSortByChanged(newSortMode);
            }
        }
    }
    render() {
        return (
            <div
                ref={this.domRef}
                className="content-container"
                onClick={(ev) => {
                    $.hideContextMenu(ev);
                }}>
                <BrowserEntries
                    isLoading={this.state.isLoading || this.props.nodeLoading}
                    currentlyViewedEntry={this.props.currentlyViewedEntry}
                    entries={this.state.entries || []}
                    onExpand={(node) => {
                        this.setState({
                            'selected': [],
                            'highlighted': []
                        });

                        this.props.onExpand(node[this.props.keyProp || 'h']);
                    }}
                    sortBy={this.state.sortBy}
                    folderSelectNotAllowed={this.props.folderSelectNotAllowed}
                    onAttachClicked={this.onAttachClicked}
                    viewMode={this.props.viewMode}
                    selected={this.state.selected}
                    highlighted={this.state.highlighted}
                    onContextMenu={this.props.onContextMenu || this.onContextMenu}
                    selectionManager={this.selectionManager}
                    ref={
                        (browserEntries) => {
                            this.browserEntries = browserEntries;
                        }
                    }
                    onSortByChanged={(newState) => {
                        this.onSortByChanged(newState);
                    }}
                    listAdapterColumns={this.props.listAdapterColumns}
                    currentdirid={this.props.currentdirid}
                    containerClassName={this.props.containerClassName}
                    headerContainerClassName={this.props.headerContainerClassName}
                    megaListItemHeight={this.props.megaListItemHeight}
                    keyProp={this.props.keyProp || 'h'}
                    NilComponent={this.props.NilComponent}
                    listAdapterOpts={this.props.listAdapterOpts}
                />
            </div>
        );
    }
}
