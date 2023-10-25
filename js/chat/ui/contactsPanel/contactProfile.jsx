import React from 'react';
import {MegaRenderMixin} from '../../mixins';
import {Avatar, ContactPresence} from '../contacts.jsx';
import {Button} from '../../../ui/buttons.jsx';
import {Dropdown} from '../../../ui/dropdowns.jsx';
import { Emoji } from '../../../ui/utils.jsx';
import ContactsPanel from './contactsPanel.jsx';
import ContextMenu from './contextMenu.jsx';
import FMView from "../../../ui/jsx/fm/fmView.jsx";
import {ColumnFavIcon} from "../../../ui/jsx/fm/nodes/columns/columnFavIcon.jsx";
import {ColumnSharedFolderName} from "../../../ui/jsx/fm/nodes/columns/columnSharedFolderName.jsx";
import {ColumnSharedFolderAccess} from "../../../ui/jsx/fm/nodes/columns/columnSharedFolderAccess.jsx";
import {ColumnSharedFolderButtons} from "../../../ui/jsx/fm/nodes/columns/columnSharedFolderButtons.jsx";
import Nil from './nil.jsx';
import Link from '../link.jsx';
import { inProgressAlert } from '../meetings/call.jsx';

export default class ContactProfile extends MegaRenderMixin {
    state = {
        selected: [],
        loading: true
    };

    componentWillMount() {
        if (super.componentWillMount) {
            super.componentWillMount();
        }

        const { handle } = this.props;
        if (handle) {
            const contact = M.u[handle];
            if (contact) {
                this._listener = contact.addChangeListener(() => {
                    if (contact && contact.c === 1) {
                        this.safeForceUpdate();
                    }
                    else {
                        loadSubPage("/fm/chat/contacts");
                        return 0xDEAD;
                    }
                });
            }
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this._listener) {
            const {handle} = this.props;
            const contact = M.u[handle];
            contact.removeChangeListener(this._listener);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise())
            .finally(() => {
                if (this.isMounted()) {
                    this.setState({'loading': false});
                }
            });
    }

    onAttachClicked = () => {
        const { selected } = this.state;
        if (selected[0]) {
            this.onExpand(selected[0]);
        }
    };

    onExpand = handle => loadSubPage(`fm/${handle}`);

    Breadcrumb = () => {
        const { handle } = this.props;
        return (
            <div className="profile-breadcrumb">
                <ul>
                    <li>
                        <Link to="/fm/chat/contacts">{ContactsPanel.LABEL.CONTACTS}</Link>
                        <i className="sprite-fm-mono icon-arrow-right" />
                    </li>
                    <li>
                        <Emoji>{M.getNameByHandle(handle)}</Emoji>
                    </li>
                </ul>
            </div>
        );
    };

    Credentials = () => {
        const { handle } = this.props;
        const contact = M.u[handle];

        if (handle && contact && contact.c === 1) {
            const IS_VERIFIED = ContactsPanel.isVerified(contact);
            return (
                <div className="profile-credentials">
                    <span className="credentials-head">{l[6872]}</span>
                    <div className="credentials-fingerprints">
                        {ContactsPanel.getUserFingerprint(handle)}
                    </div>
                    <button
                        className={`
                            mega-button
                            small
                            ${IS_VERIFIED ? '' : 'positive'}
                        `}
                        onClick={() => ContactsPanel[IS_VERIFIED ? 'resetCredentials' : 'verifyCredentials'](contact)}>
                        {IS_VERIFIED ? l[742] : l.verify_credentials}
                    </button>
                </div>
            );
        }
        return null;
    };

    handleContextMenu = (e, handle) => {
        e.persist();
        e.preventDefault();
        e.stopPropagation(); // do not treat it as a regular click on the file
        e.delegateTarget = e.target.tagName === "TR" ? e.target : $(e.target).parents('tr')[0];
        e.currentTarget = $(e.delegateTarget);
        $.selected = [handle];

        M.contextMenuUI(e, 1);
    };

    getSharedFoldersView() {
        return this.state.loading ? null : <FMView
            currentlyViewedEntry={this.props.handle}
            // folderSelectNotAllowed={this.props.folderSelectNotAllowed}
            onSelected={handle => this.setState({ selected: handle })}
            onHighlighted={nop}
            searchValue={this.state.searchValue}
            onExpand={this.onExpand}
            onAttachClicked={this.onAttachClicked}
            viewMode={0}
            currentdirid="shares"
            megaListItemHeight={65}
            headerContainerClassName="grid-table-header"
            /* Don't pass grid-table or the FM would mess up the DOM when coming back from viewing a Shared folder */
            /* Don't pass contact-details-view, since addGridUI would mess it up */
            /* Don't pass files-grid-view or the megaChatRenderListing would mess it up */
            containerClassName="grid-table shared-with-me"
            onContextMenu={(ev, handle) => this.handleContextMenu(ev, handle)}
            listAdapterColumns={[
                ColumnFavIcon,
                [ColumnSharedFolderName, {
                    'label': `${l.shared_folders_from.replace('%NAME', M.getNameByHandle(this.props.handle))}`
                }],
                ColumnSharedFolderAccess,
                ColumnSharedFolderButtons
            ]}
        />;
    }

    render() {
        const { handle } = this.props;
        if (handle) {
            const contact = M.u[handle];

            if (!contact || contact.c !== 1) {
                return <Nil title={l.contact_not_found /* Contact not found */} />;
            }

            const HAS_RELATIONSHIP = ContactsPanel.hasRelationship(contact);

            return (
                <div className="contacts-profile">
                    <this.Breadcrumb />
                    <div className="profile-content">
                        <div className="profile-head">
                            {HAS_RELATIONSHIP && <this.Credentials />}
                            <Avatar contact={contact} className="profile-photo avatar-wrapper contacts-medium-avatar"/>

                            <div className="profile-info">
                                <h2>
                                    <Emoji>{M.getNameByHandle(handle)}</Emoji>
                                    <ContactPresence contact={contact} />
                                </h2>
                                <span>{contact.m}</span>
                            </div>

                            {HAS_RELATIONSHIP &&
                                <div className="profile-controls">
                                    <Button
                                        className="mega-button round simpletip"
                                        icon="sprite-fm-mono icon-chat-filled"
                                        attrs={{ 'data-simpletip': l[8632] /* `Start new chat` */ }}
                                        onClick={() => loadSubPage(`fm/chat/p/${handle}`)}
                                    />
                                    <Button
                                        className="mega-button round simpletip"
                                        icon="sprite-fm-mono icon-send-files"
                                        attrs={{ 'data-simpletip': l[6834] /* `Send files` */ }}
                                        onClick={() => {
                                            if (M.isInvalidUserStatus()) {
                                                return;
                                            }
                                            megaChat.openChatAndSendFilesDialog(handle);
                                        }}
                                    />
                                    <Button
                                        className="mega-button round"
                                        icon="sprite-fm-mono icon-options">
                                        <Dropdown
                                            className="context"
                                            noArrow={true}
                                            positionMy="left bottom"
                                            positionAt="right bottom"
                                            horizOffset={4}>
                                            <ContextMenu contact={contact} />
                                        </Dropdown>
                                    </Button>
                                </div>
                            }
                        </div>
                        <div className="profile-shared-folders">{this.getSharedFoldersView()}</div>
                    </div>
                </div>
            );
        }
        return null;
    }
}
