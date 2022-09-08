import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Avatar, ContactFingerprint, ContactPresence, ContactVerified } from '../../contacts.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import { Emoji } from '../../../../ui/utils.jsx';

export default class Contact extends AbstractGenericMessage {
    DIALOG = {
        ADDED: addedEmail =>
            // `Contact invited`
            // `The user has been invited and will appear in your contact list once accepted.`
            msgDialog('info', l[150], l[5898].replace('[X]', addedEmail)),
        DUPLICATE: () =>
            // `Invite already sent, waiting for response.`
            msgDialog('warningb', '', l[17545])
    };

    _doAddContact(contactEmail) {
        return M.inviteContact(M.u[u_handle] ? M.u[u_handle].m : u_attr.email, contactEmail);
    }

    _handleAddContact(contactEmail) {
        // Anonymous view -> no `M.opc` available for this state; invoke directly contact request.
        // Render the resulting message dialog (`The user has been invited [...]` or `Invite already sent [...]`)
        // based on the actual API response.
        if (this.props.chatRoom?.isAnonymous()) {
            return this._doAddContact(contactEmail)
                .done(addedEmail => this.DIALOG.ADDED(addedEmail))
                .catch(this.DIALOG.DUPLICATE);
        }

        return (
            // Look into if contact request was already sent (`M.opc`) before invoking API request.
            Object.values(M.opc).some(opc => opc.m === contactEmail) ?
                this.DIALOG.DUPLICATE() :
                this._doAddContact(contactEmail)
                    .done(addedEmail => this.DIALOG.ADDED(addedEmail))
        );
    }

    _getContactAvatar(contact, className) {
        return (
            <Avatar
                className={`avatar-wrapper ${className}`}
                contact={M.u[contact.u]}
                chatRoom={this.props.chatRoom}
            />
        );
    }

    _getContactDeleteButton(message) {
        if (message.userId === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT) {
            return (
                <>
                    <hr/>
                    <DropdownItem
                        icon="sprite-fm-mono icon-dialog-close"
                        label={l[83] /* `Remove` */}
                        onClick={e => this.props.onDelete(e, message)}
                    />
                </>
            );
        }
    }

    _getContactCard(message, contact, contactEmail) {
        const HAS_RELATIONSHIP = M.u[contact.u].c === 1;
        let name = <Emoji>{M.getNameByHandle(contact.u)}</Emoji>;
        const { chatRoom } = this.props;
        const isAnonView = chatRoom.isAnonymous();
        if (megaChat.FORCE_EMAIL_LOADING) {
            name += "(" + contact.m + ")";
        }

        return (
            <Button
                className="tiny-button"
                icon="tiny-icon icons-sprite grey-dots">
                <Dropdown
                    className="white-context-menu shared-contact-dropdown"
                    noArrow={true}
                    positionMy="left bottom"
                    positionAt="right bottom"
                    horizOffset={4}
                >
                    <div className="dropdown-avatar rounded">
                        {this._getContactAvatar(contact, 'context-avatar')}
                        {!isAnonView ?  <div className="dropdown-user-name">
                            <div className="name">
                                {HAS_RELATIONSHIP && (
                                    // Contact is present within the contact list,
                                    // i.e. contact relationship already established
                                    this.isLoadingContactInfo() ? <em className="contact-name-loading"/> : name
                                )}
                                {!HAS_RELATIONSHIP && name}
                                <ContactPresence className="small" contact={contact} />
                            </div>
                            <div className="email">
                                {M.u[contact.u].m}
                            </div>
                        </div> : <div className="dropdown-user-name"></div>}
                    </div>
                    <ContactFingerprint contact={M.u[contact.u]} />

                    {HAS_RELATIONSHIP && (
                        <>
                            <DropdownItem
                                icon="sprite-fm-mono icon-user-filled"
                                label={l[5868] /* `View profile` */}
                                onClick={() => {
                                    loadSubPage("fm/chat/contacts/" + contact.u);
                                    mBroadcaster.sendMessage('contact:open');
                                }}
                            />
                            <hr/>
                            <DropdownItem
                                icon="sprite-fm-mono icon-chat-filled"
                                label={l[8632] /* `Start new chat` */}
                                onClick={() => {
                                    loadSubPage("fm/chat/p/" + contact.u);
                                    mBroadcaster.sendMessage('chat:open');
                                }}
                            />
                        </>
                    )}

                    {u_type && u_type > 2 && contact.u !== u_handle && !HAS_RELATIONSHIP && !is_eplusplus && (
                        <DropdownItem
                            icon="sprite-fm-mono icon-add"
                            label={l[71] /* `Add contact` */}
                            onClick={() => this._handleAddContact(contactEmail)}
                        />
                    )}

                    {this._getContactDeleteButton(message)}
                </Dropdown>
            </Button>
        );
    }

    getContents() {
        const { message, chatRoom } = this.props;
        const textContents = message.textContents.substr(2, message.textContents.length);
        const attachmentMeta = JSON.parse(textContents);
        const isAnonView = chatRoom.isAnonymous();

        if (!attachmentMeta) {
            return console.error(`Message w/ type: ${message.type} -- no attachment meta defined. Message: ${message}`);
        }

        let contacts = [];

        attachmentMeta.forEach((v) => {
            const contact = M.u && v.u in M.u ? M.u[v.u] : v;
            const contactEmail = contact.email ? contact.email : contact.m;

            if (!M.u[contact.u]) {
                M.u.set(contact.u, new MegaDataObject(MEGA_USER_STRUCT, {
                    'u': contact.u,
                    'name': contact.name,
                    'm': contact.email ? contact.email : contactEmail,
                    'c': undefined
                }));
            }
            else if (M.u[contact.u] && !M.u[contact.u].m) {
                // if already added from group chat...add the email,
                // since that contact got shared in a chat room
                M.u[contact.u].m = contact.email ? contact.email : contactEmail;
            }

            contacts = [
                ...contacts,
                <div key={contact.u}>
                    {!isAnonView ? <div className="message shared-info">
                        <div className="message data-title">
                            <Emoji>{M.getNameByHandle(contact.u)}</Emoji>
                        </div>
                        {M.u[contact.u] ?
                            <ContactVerified className="right-align" contact={M.u[contact.u]}/> :
                            null}
                        <div className="user-card-email">{contactEmail}</div>
                    </div> : <div className="message shared-info"></div>}
                    <div className="message shared-data">
                        <div className="data-block-view semi-big">
                            {
                                M.u[contact.u] ?
                                    <ContactPresence className="small" contact={M.u[contact.u]} /> :
                                    null
                            }
                            {this._getContactCard(message, contact, contactEmail)}
                            {this._getContactAvatar(contact, 'medium-avatar')}
                        </div>
                        <div className="clear" />
                    </div>
                </div>
            ];
        });

        return (
            <div className="message shared-block">
                {contacts}
            </div>
        );
    }
}
