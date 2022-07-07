import React from 'react';
import { MegaRenderMixin } from '../../../../mixins';
import ModalDialogsUI from '../../../../../ui/modalDialogs.jsx';
import Button from '../../button.jsx';
import { ContactCard, MAX_FREQUENTS } from '../../../contacts.jsx';
import { PerfectScrollbar } from '../../../../../ui/perfectScrollbar.jsx';
import Search from './search.jsx';
import Footer from './footer.jsx';
import Nil from './nil.jsx';
import Link from '../../../link.jsx';

export const HAS_CONTACTS = () => {
    const keys = M.u.keys();
    for (let i = 0; i < keys.length; i++) {
        if (M.u[keys[i]].c === 1) {
            return true;
        }
    }
};

export default class Invite extends MegaRenderMixin {
    wrapperRef = React.createRef();

    static NAMESPACE = 'invite-meeting';

    state = {
        loading: true,
        value: '',
        searching: false,
        contacts: [],
        contactsInitial: [],
        frequents: [],
        frequentsInitial: [],
        selected: [],
        excluded: [],
        input: false
    };

    getSortedContactsList = (frequents, excluded) => {
        frequents = frequents || this.state.frequents;
        excluded = excluded || this.state.excluded;

        const filteredContacts = [];
        (this.props.contacts || M.u).forEach((contact) => {
            if (contact.c === 1 && !frequents.includes(contact.u) && !excluded.includes(contact.u)) {
                filteredContacts.push(contact);
            }
        });

        const sortFn = M.getSortByNameFn2(1);
        filteredContacts.sort((a, b) => sortFn(a, b));

        return filteredContacts;
    };

    constructor(props) {
        super(props);
        this.state.excluded = this.props.chatRoom ? this.props.chatRoom.getParticipantsExceptMe() : [];
        this.state.contacts = this.state.contactsInitial = this.getSortedContactsList();
    }

    doMatch = (value, collection) => {
        value = value.toLowerCase();
        return collection.filter(contact => {
            const name = M.getNameByHandle(contact.u || contact).toLowerCase();
            return name.includes(value);
        });
    };

    handleSearch = ev => {
        const { value } = ev.target;
        const searching = value.length >= 2;
        const frequents = searching ? this.doMatch(value, this.state.frequentsInitial) : this.state.frequentsInitial;
        const contacts = searching ? this.doMatch(value, this.state.contactsInitial) : this.state.contactsInitial;

        this.setState({ value, searching, frequents, contacts }, () => {
            const wrapperRef = this.wrapperRef && this.wrapperRef.current;
            if (wrapperRef && searching) {
                wrapperRef.reinitialise();
                wrapperRef.scrollToY(0);
            }
        });
    };

    handleSelect = userHandle => {
        this.setState(
            state => ({
                selected: state.selected.includes(userHandle)
                    ? state.selected.filter(c => c !== userHandle)
                    : [...state.selected, userHandle]
            }),
            () => Search.focus()
        );
    };

    handleAdd = () => {
        const { selected } = this.state;
        const { chatRoom, onClose } = this.props;

        if (selected.length > 0) {
            chatRoom?.trigger('onAddUserRequest', [selected]);
            onClose?.();
        }
    };

    getFrequentContacts = () =>
        megaChat.getFrequentContacts()
            .then(response => {
                if (!this.isMounted()) {
                    return;
                }

                const frequents = [];
                const maxFreq = Math.max(response.length - MAX_FREQUENTS, 0);
                for (let i = response.length - 1; i >= maxFreq; i--) {
                    const contact = response[i];
                    if (!this.state.excluded.includes(contact.userId)) {
                        frequents.push(contact.userId);
                    }
                }

                this.setState({
                    frequents,
                    frequentsInitial: frequents,
                    contacts: this.getSortedContactsList(frequents),
                    loading: false
                });
            });

    getFilteredFrequents = () => {
        const { frequents, selected, searching } = this.state;

        if (frequents.length === 0) {
            return false;
        }

        return frequents.map(userHandle => {
            return (
                <ContactCard
                    key={userHandle}
                    contact={M.u[userHandle]}
                    chatRoom={false}
                    className={`
                        contacts-search
                        short
                        ${selected.includes(userHandle) ? 'selected' : ''}
                    `}
                    noContextButton={true}
                    noContextMenu={true}
                    selectable={true}
                    onClick={() => this.handleSelect(userHandle)}
                />
            );
        });
    };

    getFilteredContacts = () => {
        const { contacts, frequents, excluded, selected, searching } = this.state;
        const $$CONTACTS = [];

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const { u: userHandle } = contact;

            if (!frequents.includes(userHandle) && !excluded.includes(userHandle)) {
                $$CONTACTS.push(
                    <ContactCard
                        key={userHandle}
                        contact={contact}
                        chatRoom={false}
                        className={`
                            contacts-search
                            short
                            ${selected.includes(userHandle) ? 'selected' : ''}
                        `}
                        noContextButton={true}
                        noContextMenu={true}
                        selectable={true}
                        onClick={() => this.handleSelect(userHandle)}
                    />
                );
            }
        }

        return $$CONTACTS.length === 0 && searching ? <Nil /> : $$CONTACTS;
    };

    renderContent = () => {
        var frequentContacts = this.getFilteredFrequents();

        if (HAS_CONTACTS()) {
            const { contacts, frequents } = this.state;
            const $$RESULT_TABLE = (header, children) =>
                <div className="contacts-search-subsection">
                    <div className="contacts-list-header">
                        {header}
                    </div>
                    <div className="contacts-search-list">
                        {children}
                    </div>
                </div>;

            if (frequents.length === 0 && contacts.length === 0) {
                // No results for both `Frequents` and `Contacts` -> render single `No Results`
                return <Nil />;
            }

            return (
                <PerfectScrollbar
                    ref={this.wrapperRef}
                    options={{ 'suppressScrollX': true }}>
                    {frequentContacts ? $$RESULT_TABLE(l[20141] /* `Recents` */, frequentContacts) : ''}
                    {$$RESULT_TABLE(l[165] /* `Contacts` */, this.getFilteredContacts())}
                </PerfectScrollbar>
            );
        }

        // User has no contacts -> render `No Contacts`
        return <Nil />;
    };

    renderLoading = () => {
        return (
            <div className={`${Invite.NAMESPACE}-loading`}>
                <h2>Loading</h2>
            </div>
        );
    };

    getPublicLink = () => {
        const { chatRoom } = this.props;
        if (chatRoom && chatRoom.isMeeting) {
            chatRoom.updatePublicHandle(
                undefined,
                () => {
                    if (this.isMounted()) {
                        this.setState({
                            link: chatRoom.publicLink ? `${getBaseUrl()}/${chatRoom.publicLink}` : l[20660]
                        });
                    }
                }
            );
        }
    };

    componentDidMount() {
        super.componentDidMount();
        this.getFrequentContacts();
        this.getPublicLink();
    }

    render() {
        const { NAMESPACE } = Invite;
        const { link, value, loading, frequents, contacts, selected, field } = this.state;
        const { chatRoom, onClose } = this.props;
        const IS_MEETING = chatRoom && chatRoom.isMeeting;

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                name={NAMESPACE}
                className={`
                    ${NAMESPACE}
                    dialog-template-tool
                `}
                hideOverlay={true}
                onClose={onClose}>
                <div className={`${NAMESPACE}-head`}>
                    <h2>{IS_MEETING ? l.invite_participants /* `Invite participants` */ : l[8726] /* `Invite` */}</h2>
                    {IS_MEETING && (
                        <>
                            <p>{l.copy_and_share /* `Copy this link to send your invite` */}</p>
                            <div className="link-input-container">
                                <Button
                                    className="mega-button large positive"
                                    onClick={() => link && copyToClipboard(link, 'Done!')}
                                    disabled={!link}>
                                    {!link ? l[7006] /* `Loading...` */ : l[1394] /* `Copy link` */}
                                </Button>
                                <Link
                                    className="view-link-control"
                                    field={field}
                                    onClick={() => this.setState({ field: !field })}>
                                    {field ? l.collapse_meeting_link : l.expand_meeting_link}
                                    <i className={`sprite-fm-mono ${field ? 'icon-arrow-up' : 'icon-arrow-down'}`} />
                                </Link>
                                {field && link && (
                                    <div className="chat-link-input">
                                        <i className="sprite-fm-mono icon-link"/>
                                        <input type="text" readOnly={true} value={link}/>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {HAS_CONTACTS() && (
                        <Search
                            value={value}
                            contacts={contacts}
                            placeholder={contacts.length + frequents.length}
                            onChange={this.handleSearch}
                        />
                    )}
                </div>
                <div className="fm-dialog-body">
                    <div className={`${NAMESPACE}-contacts`}>
                        {loading ? this.renderLoading() : this.renderContent()}
                    </div>
                </div>
                <Footer
                    selected={selected}
                    onAdd={this.handleAdd}
                    onClose={onClose}
                />
            </ModalDialogsUI.ModalDialog>
        );
    }
}
