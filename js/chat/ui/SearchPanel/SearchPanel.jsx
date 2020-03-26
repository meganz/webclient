import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import SearchField from './SearchField.jsx';
import { ResultTable } from './ResultTable.jsx';

export default class SearchPanel extends MegaRenderMixin {
    state = {
        value: '',
        searching: false,
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
                        self.setState({ results });
                    },
                    function() {
                        // [...] onComplete
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

        this.setState({
            value,
            searching
        }, () =>
            searching ? this.doSearch(value) : this.setState({ results: [] })
        );
    };

    render() {
        const { value, searching, recent, results } = this.state;

        return (
            <div className="search-area">
                <SearchField
                    value={value}
                    searching={searching}
                    onFocus={this.handleFocus}
                    onBlur={this.handleBlur}
                    onChange={this.handleChange} />

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
