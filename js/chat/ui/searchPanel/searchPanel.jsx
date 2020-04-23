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
            // Focus and mark the text as selected on re-opening from minimize
            if (!nextProps.minimized) {
                Soon(() => {
                    this.doToggle('resume');
                    SearchField.focus();
                    SearchField.select();
                });
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
            .rebind('click.searchPanel', ev => {
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
        this.doToggle('pause');
        this.props.onToggle();
    };

    getRecents = () => {
        megaChat.getFrequentContacts()
            .then(frequentContacts => {
                frequentContacts = frequentContacts.slice(0, 30);
                let recents = [];
                for (let i = frequentContacts.length; i--;) {
                    const recent = frequentContacts[i];
                    recents = [...recents, { data: recent.userId, room: recent.chatRoom, contact: M.u[recent.userId] }];
                }
                this.setState({ recents });
            });
    };

    doSearch = s => {
        const self = this;
        return new MegaPromise((res, rej) => {
            delay('chat-search', function() {
                return ChatSearch.doSearch(
                    RegExpEscape(s),
                    function(room, result, results) {
                        self.setState({
                            results
                        });
                    },
                    function() {
                        self.setState({ status: STATUS.COMPLETED });
                    }).done(res).fail(rej);
            }, 1600);
        });
    };

    doToggle = action /* pause || resume || destroy */ => {
        const megaPromise = ChatSearch.doSearch.megaPromise;
        if (action && megaPromise && megaPromise.cs) {
            megaPromise.cs[action]();
        }
    };

    handleChange = ev => {
        const value = ev.target.value;
        const searching = value.length >= 3;

        this.setState({
            value,
            searching,
            status: STATUS.IN_PROGRESS,
            results: []
        }, () =>
            searching ? this.doSearch(value) : this.setState({ results: [] })
        );
    };

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
        this.setState({
            value: '',
            searching: false,
            status: undefined,
            results: []
        }, () => {
            this.doToggle('destroy');
            Soon(() => SearchField.focus());
        });
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
        // https://mega.nz/file/lRkwyYwR#XsLtcMV6fe_HiBZ1shOdt0FvJrB-rr6agoIh0N8xQys
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
                    onFocus={() => !searching && this.getRecents()}
                    onChange={this.handleChange}
                    onToggle={this.handleToggle}
                    onReset={this.handleReset} />

                <div className="search-results-wrapper">
                    <PerfectScrollbar options={{ 'suppressScrollX': true }}>
                        {!!recents.length && !searching && (
                            <ResultContainer recents={recents} />
                        )}

                        {searching && (
                            <ResultContainer status={status} results={results} />
                        )}
                    </PerfectScrollbar>
                </div>
            </div>
        );
    }
}
