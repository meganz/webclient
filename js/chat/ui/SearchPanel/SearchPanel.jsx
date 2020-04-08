import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import SearchField from './SearchField.jsx';
import { ResultContainer } from './ResultContainer.jsx';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';

export const STATUS = {
    IN_PROGRESS: 1,
    PAUSED: 2,
    COMPLETED: 3
};

const SEARCH_PANEL_CLASS = `search-panel`;

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

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
    }

    componentWillReceiveProps(nextProps, nextContext) {
        super.componentWillReceiveProps(nextProps, nextContext);
        if (nextProps.minimized !== this.props.minimized) {
            this.safeForceUpdate();
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $(document).unbind('.searchPanel');
    }

    bindEvents = () =>
        $(document)
            // Clicked on search result
            .rebind('resultOpen.searchPanel', () => this.toggleMinimize())
            // Clicked outside the search panel component
            .rebind('click.searchPanel', ev =>
                this.clickedOutsideComponent(ev) && !this.props.minimized && this.toggleMinimize()
            )
            // `ESC` keypress
            .rebind('keydown.searchPanel', ({ keyCode }) => {
                if (keyCode && keyCode === 27 /* ESC */ && !this.props.minimized) {
                    this.toggleMinimize();
                }
            });

    clickedOutsideComponent = ev =>
        ev &&
        $(ev.target).parents(`.${SEARCH_PANEL_CLASS}`).length === 0 && /* current container !== root component */
        !$(ev.target).is('i.reset-icon') && /* current element !== reset search element */
        !$(ev.target).is('.small-icon.thin-search-icon'); /* current element !== toggle search icon */

    toggleMinimize = () => {
        this.props.onToggle();
    };

    getRecent = () => {
        megaChat.getFrequentContacts()
            .then(frequentContacts => {
                this.setState({
                    recent: frequentContacts.map(frequentContact => ({
                        data: frequentContact.userId,
                        room: frequentContact.chatRoom
                    }))
                });
            });
    };

    doSearch = s => {
        const self = this;
        return new MegaPromise((res, rej) => {
            delay('chat-search', function() {
                return ChatSearch.doSearch(
                    s,
                    function(room, result, results) {
                        self.setState({
                            results,
                            status: STATUS.IN_PROGRESS
                        });
                    },
                    function() {
                        self.setState({ status: STATUS.COMPLETED });
                    }).done(res).fail(rej);
            }, 600);
        });
    };

    handleFocus = () => {
        this.getRecent();
    };

    handleChange = ev => {
        const value = ev.target.value;
        const searching = value.length >= 3;

        this.setState({
            value,
            searching,
            status: STATUS.IN_PROGRESS
        }, () =>
            searching ? this.doSearch(value) : this.setState({ results: [] })
        );
    };

    handleSearchToggle = () => {
        const megaPromise = window.megaPromiseTemp;

        if (megaPromise && megaPromise.cs) {
            const inProgress = this.state.status === STATUS.IN_PROGRESS;

            this.setState({
                status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
            }, () =>
                inProgress ? megaPromise.cs.pause() : megaPromise.cs.resume()
            );
        }
    };

    handleSearchReset = inputRef => {
        this.setState({
            value: '',
            searching: false,
            status: undefined
        }, () =>
            inputRef && inputRef.current.focus()
        );
    };

    render() {
        const { value, searching, status, recent, results } = this.state;

        return (
            <div className={`
                ${SEARCH_PANEL_CLASS}
                ${this.props.minimized ? 'hidden' : ''}
            `}>
                <PerfectScrollbar>
                    <SearchField
                        value={value}
                        searching={searching}
                        status={status}
                        onFocus={this.handleFocus}
                        onChange={this.handleChange}
                        onSearchToggle={this.handleSearchToggle}
                        onSearchReset={this.handleSearchReset} />

                    {!!recent.length && !searching && (
                        <ResultContainer recent={recent} />
                    )}

                    {searching && (
                        <ResultContainer status={status} results={results} />
                    )}
                </PerfectScrollbar>
            </div>
        );
    }
}
