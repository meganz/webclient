import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import SearchField from './SearchField.jsx';
import { ResultTable } from './ResultTable.jsx';

export const STATUS = {
    IN_PROGRESS: 1,
    PAUSED: 2,
    COMPLETED: 3,
};

export default class SearchPanel extends MegaRenderMixin {
    state = {
        value: '',
        searching: false,
        status: undefined,
        recent: [],
        results: []
    };

    constructor(props) {
        super(props);
    }

    getRecent = () => {
        megaChat.getFrequentContacts()
            .then(frequentContacts => {
                this.setState({
                    recent: frequentContacts.map(frequentContact => M.u[frequentContact.userId])
                });
            });
    };

    doSearch = s => {
        const self = this;
        return new MegaPromise((res, rej) => {
            delay('chat-search', function() {
                console.error('SearchPanel > doSearch() ->', s);
                return ChatSearch.doSearch(
                    s,
                    function(room, result, results) {
                        // console.error('SearchPanel > doSearch() -> onResult');
                        self.setState({ results, status: STATUS.IN_PROGRESS });
                    },
                    function() {
                        // console.error('SearchPanel > doSearch() -> onComplete');
                        self.setState({ status: STATUS.COMPLETED });
                    }).done(res).fail(rej);
            }, 600);
        });
    };

    handleFocus = () => {
        this.getRecent();
    };

    handleBlur = () => {
        // this.props.onBlur();
    };

    handleChange = ev => {
        const value = ev.target.value;
        const searching = value.length >= 3;

        this.setState({ value, searching, status: STATUS.IN_PROGRESS }, () =>
            searching ? this.doSearch(value) : this.setState({ results: [] })
        );
    };

    handleSearchToggle = () => {
        const megaPromise = window.megaPromiseTemp;

        if (megaPromise && megaPromise.cs) {
            const SEARCH_IN_PROGRESS = this.state.status === STATUS.IN_PROGRESS;

            this.setState({ status: SEARCH_IN_PROGRESS ? STATUS.PAUSED : STATUS.IN_PROGRESS }, () =>
                SEARCH_IN_PROGRESS ? megaPromise.cs.pause() : megaPromise.cs.resume()
            );
        }
    };

    render() {
        const { value, searching, status, recent, results } = this.state;

        return (
            <div className="search-area">
                <SearchField
                    value={value}
                    searching={searching}
                    status={status}
                    onFocus={this.handleFocus}
                    onBlur={this.handleBlur}
                    onChange={this.handleChange}
                    onSearchToggle={this.handleSearchToggle} />

                {!!recent.length && !searching && (
                    <ResultTable heading="Recent" recent={recent} />
                )}

                {!!results.length && searching && (
                    <ResultTable heading="Contacts and chats" results={results} />
                )}
            </div>
        );
    }
}
