import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import SearchField from './SearchField.jsx';
import ResultContainer  from './ResultContainer.jsx';
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

    // TODO: validate if really necessary; currently needed because render is not invoked on prop update from the parent
    componentWillReceiveProps(nextProps, nextContext) {
        super.componentWillReceiveProps(nextProps, nextContext);

        if (nextProps.minimized !== this.props.minimized) {
            this.safeForceUpdate();
            // Focus on re-opening from minimize
            if (!nextProps.minimized) {
                Soon(() => SearchField.focus());
            }
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $(document).unbind('.searchPanel');
    }

    bindEvents = () =>
        $(document)
            // Clicked on search result
            .rebind('chatSearchResultOpen.searchPanel', () => this.toggleMinimize())
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

    clickedOutsideComponent = ev => {
        const $target = ev && $(ev.target);
        return (
            $target &&
            // current parents !== root component
            $target.parents(`.${SEARCH_PANEL_CLASS}`).length === 0 &&
            // current element !== left sidebar container; applicable due occasional click misfire/s on scroll
            $target.parents('div.fm-left-menu.conversations').length === 0 &&
            // current element !== main chat area; applicable due occasional click misfire/s on scroll
            !$target.is('div.conversationsApp') &&
            // current element !== reset search element
            !$target.is('i.reset-icon') &&
            // current element !== toggle search icon
            !$target.is('div.small-icon.thin-search-icon')
        );
    }

    toggleMinimize = () => {
        this.props.onToggle();
    };

    getRecents = () => {
        megaChat.getFrequentContacts()
            .then(frequentContacts => {
                this.setState({
                    recents: frequentContacts.map(frequentContact => ({
                        data: frequentContact.userId,
                        room: frequentContact.chatRoom,
                        contact: M.u[frequentContact.userId]
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

    handleToggle = () => {
        const megaPromise = window.megaPromiseTemp;

        if (megaPromise && megaPromise.cs) {
            const inProgress = this.state.status === STATUS.IN_PROGRESS;

            this.setState({
                status: inProgress ? STATUS.PAUSED : STATUS.IN_PROGRESS
            }, () => {
                Soon(() => SearchField.focus());
                return inProgress ? megaPromise.cs.pause() : megaPromise.cs.resume();
            });
        }
    };

    handleReset = () => {
        this.setState({
            value: '',
            searching: false,
            status: undefined
        }, () =>
            Soon(() => SearchField.focus())
        );
    };

    render() {
        const { value, searching, status, recents, results } = this.state;

        //
        // `SearchPanel`
        // https://mega.nz/file/UZUz0A5C#j4ctadWqhVT2_m3qyNfgrle11B8NNZgrKTafg1htd1Y
        // https://mega.nz/file/UR1VjYKR#FhY3j9WZDJlCYYj2skuCScIHnrIsr7OI4KBfTiQLnHQ
        // https://mega.nz/file/QFExTYpD#Jp9R0CV3ri9B081k1i36kDa57ZEe2W2JPp5havIn8Ww
        //
        // Component hierarchy
        // https://mega.nz/file/kZEhFQxa#uuR2BQ6DXFJPi002eKZbzBpf25pDtddNeMSMsZ1EzPs
        // -------------------------------------------------------------------------

        return (
            <div className={`
                ${SEARCH_PANEL_CLASS}
                ${this.props.minimized ? 'hidden' : ''}
            `}>
                <SearchField
                    value={value}
                    searching={searching}
                    status={status}
                    onFocus={this.getRecents}
                    onChange={this.handleChange}
                    onToggle={this.handleToggle}
                    onReset={this.handleReset} />

                <PerfectScrollbar options={{ 'suppressScrollX': true }}>
                    {!!recents.length && !searching && (
                        <ResultContainer recents={recents} />
                    )}

                    {searching && (
                        <ResultContainer status={status} results={results} />
                    )}
                </PerfectScrollbar>
            </div>
        );
    }
}
