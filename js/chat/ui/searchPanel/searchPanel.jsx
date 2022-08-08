import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import SearchField from './searchField.jsx';
import ResultContainer  from './resultContainer.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';

export const STATUS = {
    IN_PROGRESS: 1,
    PAUSED: 2,
    COMPLETED: 3
};

export const EVENTS = {
    RESULT_OPEN: 'chatSearchResultOpen',
    KEYDOWN: 'keydown'
};

const ACTIONS = {
    PAUSE: 'pause',
    RESUME: 'resume'
};

const SEARCH_PANEL_CLASS = `search-panel`;

export default class SearchPanel extends MegaRenderMixin {
    wrapperRef = null;

    state = {
        value: '',
        searching: false,
        status: undefined,
        isFirstQuery: true,
        results: []
    };

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.unbindEvents();
    }

    unbindEvents = () => {
        if (this.pageChangeListener) {
            mBroadcaster.removeListener(this.pageChangeListener);
        }
        document.removeEventListener(EVENTS.RESULT_OPEN, this.doPause);
        document.removeEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
        megaChat.plugins.chatdIntegration.chatd.off('onClose.search');
        megaChat.plugins.chatdIntegration.chatd.off('onOpen.search');
    };

    bindEvents = () => {
        // Pause on page change
        this.pageChangeListener = mBroadcaster.addListener('pagechange', this.doPause);

        // Clicked on search result
        document.addEventListener(EVENTS.RESULT_OPEN, this.doPause);
        document.addEventListener(EVENTS.KEYDOWN, this.handleKeyDown);
        megaChat.plugins.chatdIntegration.chatd.rebind('onClose.search', () =>
            this.state.searching && this.doToggle(ACTIONS.PAUSE)
        );
        megaChat.plugins.chatdIntegration.chatd.rebind('onOpen.search', () =>
            this.state.searching && this.doToggle(ACTIONS.RESUME)
        );
    };

    doPause = () => {
        if (this.state.status === STATUS.IN_PROGRESS) {
            this.doToggle(ACTIONS.PAUSE);
        }
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

            this.setState(
                { status: action === ACTIONS.PAUSE ? PAUSED : action === ACTIONS.RESUME ? IN_PROGRESS : COMPLETED },
                () => chatSearch[action]()
            );
        }
    };

    doDestroy = () => ChatSearch && ChatSearch.doSearch && ChatSearch.doSearch.cs && ChatSearch.doSearch.cs.destroy();

    handleKeyDown = ev => {
        const { keyCode } = ev;
        if (keyCode && keyCode === 27 /* ESC */) {
            // Clear the text on the first `ESC` press; pause on the second
            return SearchField.hasValue() ? this.handleReset() : this.doPause();
        }
    };

    handleChange = ev => {
        if (SearchField.isVisible()) {
            const { value } = ev.target;
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
    };

    handleToggle = () => {
        const inProgress = this.state.status === STATUS.IN_PROGRESS;

        this.setState({
            status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
        }, () => {
            delay('chat-toggled', () => SearchField.focus());
            return this.doToggle(inProgress ? ACTIONS.PAUSE : ACTIONS.RESUME);
        });

    };

    handleReset = () =>
        this.setState({ value: '', searching: false, status: undefined, results: [] }, () => {
            this.wrapperRef.scrollToY(0);
            onIdle(() => SearchField.focus());
            this.doDestroy();
        });

    handleSearchMessages = () =>
        SearchField.hasValue() && (
            this.setState({ status: STATUS.IN_PROGRESS, isFirstQuery: false }, () => {
                this.doSearch(this.state.value, true);
                SearchField.focus();
                SearchField.select();
            })
        );

    render() {
        const { value, searching, status, isFirstQuery, results } = this.state;

        //
        // `SearchPanel`
        // -------------------------------------------------------------------------

        return (
            <div
                className={`
                    ${SEARCH_PANEL_CLASS}
                    ${searching ? 'expanded' : ''}
                `}>
                <SearchField
                    value={value}
                    searching={searching}
                    status={status}
                    onChange={this.handleChange}
                    onToggle={this.handleToggle}
                    onReset={this.handleReset}
                />

                <PerfectScrollbar
                    className="search-results-wrapper"
                    ref={wrapper => {
                        this.wrapperRef = wrapper;
                    }}
                    options={{ 'suppressScrollX': true }}>
                    {searching && (
                        <ResultContainer
                            status={status}
                            results={results}
                            isFirstQuery={isFirstQuery}
                            onSearchMessages={this.handleSearchMessages}
                        />
                    )}
                </PerfectScrollbar>
            </div>
        );
    }
}
