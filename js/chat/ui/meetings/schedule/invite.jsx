import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';
import { Avatar, ContactAwareName, MAX_FREQUENTS } from '../../contacts.jsx';

export default class Invite extends MegaRenderMixin {
    static NAMESPACE = 'meetings-invite';

    containerRef = React.createRef();
    wrapperRef = React.createRef();

    state = {
        value: '',
        expanded: false,
        loading: true,
        frequents: [],
        frequentsInitial: [],
        contacts: [],
        contactsInitial: [],
        selected: [],
    };

    constructor(props) {
        super(props);
        this.handleSearch = this.handleSearch.bind(this);
        this.state.selected = this.props.participants || [];
    }

    reinitializeWrapper() {
        const wrapperRef = this.wrapperRef && this.wrapperRef.current;
        if (wrapperRef) {
            wrapperRef.reinitialise();
            wrapperRef.scrollToY(0);
        }
    }

    handleMousedown = ({ target }) =>
        this.containerRef &&
        this.containerRef.current &&
        this.containerRef.current.contains(target) ? null : this.setState({ expanded: false });

    getSortedContactsList = frequents => {
        const filteredContacts = [];
        M.u.forEach(contact => {
            if (contact.c === 1 && !frequents.includes(contact.u) && !this.state.selected.includes(contact.u)) {
                filteredContacts.push(contact);
            }
        });

        const sortFn = M.getSortByNameFn2(1);
        filteredContacts.sort((a, b) => sortFn(a, b));

        return filteredContacts;
    };

    buildContactsList() {
        megaChat.getFrequentContacts()
            .then(frequentContacts => {
                if (this.isMounted()) {
                    const frequents = frequentContacts.slice(-MAX_FREQUENTS).map(c => c.userId);
                    const contacts = this.getSortedContactsList(frequents);
                    this.setState({
                        frequents,
                        frequentsInitial: frequents,
                        contacts,
                        contactsInitial: contacts,
                        loading: false
                    });
                }
            });
    }

    // TODO: unify w/ the workflow's `Invite`
    doMatch = (value, collection) => {
        value = value.toLowerCase();
        return collection.filter(contact => {
            contact = typeof contact === 'string' ? M.getUserByHandle(contact) : contact;
            const name = M.getNameByHandle(contact.u).toLowerCase();
            const email = contact.m && contact.m.toLowerCase();
            return name.includes(value) || email.includes(value);
        });
    };

    handleSearch(ev) {
        const { value } = ev.target;
        const searching = value.length >= 2;
        const frequents = searching ? this.doMatch(value, this.state.frequentsInitial) : this.state.frequentsInitial;
        const contacts = searching ? this.doMatch(value, this.state.contactsInitial) : this.state.contactsInitial;
        this.setState({ value, contacts, frequents }, () => this.reinitializeWrapper());
    }

    handleSelect(userHandle, expanded = false) {
        this.setState(
            state => ({
                value: '',
                expanded,
                selected: state.selected.includes(userHandle) ?
                    state.selected.filter(c => c !== userHandle) :
                    [...state.selected, userHandle]
            }), () => {
                this.props.onSelect(this.state.selected);
                // TODO: rebuild directly within this `setState` call
                this.buildContactsList();
                this.reinitializeWrapper();
            });
    }

    getFilteredContacts(contacts) {
        if (contacts && contacts.length) {
            return contacts.map(contact => {
                contact = contact instanceof MegaDataMap ? contact : M.u[contact];
                return this.state.selected.includes(contact.u) ?
                    null :
                    <div
                        key={contact.u}
                        className="invite-section-item"
                        onClick={() => {
                            this.handleSelect(contact.u);
                        }}>
                        <Avatar contact={contact}/>
                        <div className="invite-item-data">
                            <div className="invite-item-name">
                                <ContactAwareName overflow={true} simpletip={{ offset: 10 }} contact={contact} />
                            </div>
                            <div className="invite-item-mail">{contact.m}</div>
                        </div>
                    </div>;
            });
        }
        return null;
    }

    renderContent() {
        const { frequents, contacts, selected } = this.state;
        const hasMoreFrequents = frequents.length && frequents.some(h => !selected.includes(h));
        const $$SECTION = (title, children) =>
            <div className="invite-section">
                <div className="invite-section-title">{title}</div>
                {children && <div className="invite-section-list">{children}</div>}
            </div>;

        if (hasMoreFrequents || contacts.length) {
            return (
                <PerfectScrollbar
                    ref={this.wrapperRef}
                    className="invite-scroll-wrapper"
                    options={{ 'suppressScrollX': true }}>
                    {hasMoreFrequents ? $$SECTION(l.recent_contact_label, this.getFilteredContacts(frequents)) : ''}
                    {contacts.length ? $$SECTION(l.all_contact_label, this.getFilteredContacts(contacts)) : ''}
                    {frequents.length === 0 && contacts.length === 0 && $$SECTION(l.invite_no_results_found, null)}
                </PerfectScrollbar>
            );
        }

        return $$SECTION(l.invite_no_contacts_to_add, null);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('mousedown', this.handleMousedown);
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('mousedown', this.handleMousedown);
        this.buildContactsList();
    }

    render() {
        const { value, expanded, loading, selected } = this.state;

        return (
            <div
                ref={this.containerRef}
                className={`
                    ${Invite.NAMESPACE}
                    ${this.props.className || ''}
                `}>
                <div className="multiple-input">
                    <ul
                        className="token-input-list-mega"
                        onClick={ev =>
                            ev.target.classList.contains('token-input-list-mega') && this.setState({ expanded: true })
                        }>
                        {selected.map(handle => {
                            return (
                                <li
                                    key={handle}
                                    className="token-input-token-mega">
                                    <div className="contact-tag-item">
                                        <Avatar contact={M.u[handle]} className="avatar-wrapper box-avatar"/>
                                        <ContactAwareName contact={M.u[handle]} overflow={true} />
                                        <i
                                            className="sprite-fm-mono icon-close-component"
                                            onClick={() => {
                                                this.handleSelect(handle);
                                            }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                        <li className="token-input-input-token-mega">
                            <input
                                type="text"
                                name="participants"
                                className={`${Invite.NAMESPACE}-input`}
                                autoComplete="off"
                                placeholder={
                                    selected.length ? '' : l.schedule_participant_input /* `Add participants` */
                                }
                                value={value}
                                onFocus={() => this.setState({ expanded: true })}
                                onChange={this.handleSearch}
                                onKeyDown={({ target, keyCode }) => {
                                    const { selected } = this.state;
                                    return (
                                        keyCode === 8 /* Backspace */ &&
                                        target.value === '' &&
                                        selected.length &&
                                        this.handleSelect(selected[selected.length - 1], true)
                                    );
                                }}
                            />
                        </li>
                    </ul>
                </div>
                {loading ? null : (
                    <div className={`mega-input-dropdown ${expanded ? '' : 'hidden'}`}>
                        {this.renderContent()}
                    </div>
                )}
            </div>
        );
    }
}
