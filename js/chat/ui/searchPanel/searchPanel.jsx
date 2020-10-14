import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import SearchField from './searchField.jsx';
import ResultContainer  from './resultContainer.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';

export const STATUS = {
    IN_PROGRESS: 1,
    PAUSED: 2,
    COMPLETED: 3
};

const SEARCH_PANEL_CLASS = `search-panel`;

export default class SearchPanel extends MegaRenderMixin {
    wrapperRef = null;

    state = {
        value: '',
        searching: false,
        status: undefined,
        isFirstQuery: true,
        recents: [],
        results: []
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
    }

    componentWillReceiveProps(nextProps, nextContext) {
        super.componentWillReceiveProps(nextProps, nextContext);

        if (nextProps.minimized !== this.props.minimized) {
            this.safeForceUpdate();
            // Focus and mark the text as selected on re-opening from minimize
            if (!nextProps.minimized) {
                Soon(() => {
                    SearchField.focus();
                    SearchField.select();
                });
            }
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }

    unbindEvents = () => {
        if (this.pageChangeListener) {
            mBroadcaster.removeListener(this.pageChangeListener);
        }
        $(document).unbind('.searchPanel');
    }

    bindEvents = () => {
        // Pause on page change
        this.pageChangeListener = mBroadcaster.addListener('pagechange', () => this.doToggle('pause'));
        $(document)
            // Clicked on search result
            .rebind('chatSearchResultOpen.searchPanel', () => this.toggleMinimize())
            // Clicked outside the search panel component
            .rebind('mousedown.searchPanel', ev => {
                if (this.clickedOutsideComponent(ev) && !this.props.minimized) {
                    this.toggleMinimize();
                }
            })
            // `ESC` keypress
            .rebind('keydown.searchPanel', ({ keyCode }) => {
                if (keyCode && keyCode === 27 /* ESC */ && !this.props.minimized) {
                    // Clear the text on the first `ESC` press; minimize on the second
                    return SearchField.hasValue() ? this.handleReset() : this.toggleMinimize();
                }
            });
    }

    clickedOutsideComponent = ev => {
        const $target = ev && $(ev.target);
        const outsideElements = [
            'div.conversationsApp',
            'div.fm-main',
            'div.fm-left-panel',
            'i.tiny-reset',
            'div.small-icon.thin-search-icon',
            'div.search-messages, div.search-messages a'
        ];

        return (
            $target &&
            // current parents !== root component
            $target.parents(`.${SEARCH_PANEL_CLASS}`).length === 0 &&
            // current element !== left sidebar container
            $target.parents('div.fm-left-menu.conversations').length === 0 &&
            // current element !== left sidebar icon controls
            $target.parents('div.nw-fm-left-icons-panel').length === 0 &&
            // current element !== generic outside element
            outsideElements.every(outsideElement => !$target.is(outsideElement))
        );
    }

    toggleMinimize = () => {
        this.doToggle('pause');
        this.props.onToggle();
    };

    doSearch = (s, searchMessages) => {
        return ChatSearch.doSearch(
            s,
            (room, result, results) => this.setState({ results }),
            searchMessages
        )
            .catch(ex => d && console.error('Search failed (or was reset)', ex))
            .always(() => this.setState({ status: STATUS.COMPLETED }));
    };

    doToggle = action /* pause || resume */ => {
        const { IN_PROGRESS, PAUSED, COMPLETED } = STATUS;
        const searching = this.state.status === IN_PROGRESS || this.state.status === PAUSED;

        if (action && searching) {
            const chatSearch = ChatSearch.doSearch.cs;

            if (!chatSearch) {
                return delay('chat-toggle', () => this.doToggle(action), 600);
            }

            this.setState({
                status: action === 'pause' ? PAUSED : action === 'resume' ? IN_PROGRESS : COMPLETED
            }, () =>
                chatSearch[action]()
            );
        }
    };

    doDestroy = () => ChatSearch && ChatSearch.doSearch && ChatSearch.doSearch.cs && ChatSearch.doSearch.cs.destroy();

    handleChange = ev => {
        const value = ev.target.value;
        const searching = value.length > 0;

        this.doDestroy();
        this.setState({
            value,
            searching,
            // Only contacts are retrieved when the query is less than 2 characters; given that the operation is
            // synchronous and results might be returned quickly, we don't want to show the `IN_PROGRESS` status,
            // because `pause search` will not be available yet. Additionally, searching `CONTACTS AND CHATS`
            // does not perform decryption in any form and the `IN_PROGRESS` status is needed only when retrieving
            // `MESSAGES`. Hence, we do status reset to `undefined`.
            status: undefined,
            isFirstQuery: true,
            results: []
        }, () =>
            searching && delay('chat-search', () => this.doSearch(value, false), 1600)
        );

        this.wrapperRef.scrollToY(0);
    }

    handleToggle = () => {
        const inProgress = this.state.status === STATUS.IN_PROGRESS;

        this.setState({
            status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
        }, () => {
            Soon(() => SearchField.focus());
            return this.doToggle(inProgress ? 'pause' : 'resume');
        });
    };

    handleReset = () => {
        return (
            // Clear the text on the first reset; minimize on the second
            SearchField.hasValue() ?
                this.setState({ value: '', searching: false, status: undefined, results: [] }, () => {
                    this.wrapperRef.scrollToY(0);
                    onIdle(() => SearchField.focus());
                    this.doDestroy();
                }) :
                this.toggleMinimize()
        );
    };

    handleSearchMessages = () =>
        SearchField.hasValue() && (
            this.setState({ status: STATUS.IN_PROGRESS, isFirstQuery: false }, () => {
                this.doSearch(this.state.value, true);
                SearchField.focus();
                SearchField.select();
            })
        );

    render() {
        const { value, searching, status, isFirstQuery, recents, results } = this.state;

        //
        // `SearchPanel`
        // https://mega.nz/file/UZUz0A5C#j4ctadWqhVT2_m3qyNfgrle11B8NNZgrKTafg1htd1Y
        // https://mega.nz/file/UR1VjYKR#FhY3j9WZDJlCYYj2skuCScIHnrIsr7OI4KBfTiQLnHQ
        // https://mega.nz/file/QFExTYpD#Jp9R0CV3ri9B081k1i36kDa57ZEe2W2JPp5havIn8Ww
        //
        // Component hierarchy
        // https://mega.nz/file/lRkwyYwR#XsLtcMV6fe_HiBZ1shOdt0FvJrB-rr6agoIh0N8xQys
        // -------------------------------------------------------------------------

        return (
            <div className={`
                ${SEARCH_PANEL_CLASS}
                ${searching ? 'expanded' : ''}
                ${this.props.minimized ? 'hidden' : ''}
            `}>
                <SearchField
                    value={value}
                    searching={searching}
                    status={status}
                    onChange={this.handleChange}
                    onToggle={this.handleToggle}
                    onReset={this.handleReset} />

                <div className="search-results-wrapper">
                    <PerfectScrollbar
                        ref={wrapper => {
                            this.wrapperRef = wrapper;
                        }}
                        options={{ 'suppressScrollX': true }}>
                        {!!recents.length && !searching && (
                            <ResultContainer recents={recents} />
                        )}

                        {searching && (
                            <ResultContainer
                                status={status}
                                results={results}
                                isFirstQuery={isFirstQuery}
                                onSearchMessages={this.handleSearchMessages} />
                        )}
                    </PerfectScrollbar>
                </div>
            </div>
        );
    }
}
