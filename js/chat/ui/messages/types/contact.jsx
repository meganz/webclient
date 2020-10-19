import React from 'react';
import AbstractGenericMessage from '../abstractGenericMessage.jsx';
import { Avatar, ContactFingerprint, ContactPresence, ContactVerified } from '../../contacts.jsx';
import { Dropdown, DropdownItem } from '../../../../ui/dropdowns.jsx';
import { Button } from '../../../../ui/buttons.jsx';

export default class Contact extends AbstractGenericMessage {
    constructor(props) {
        super(props);
    }

    _handleAddContact = (contactEmail) => {
        let exists = false;

        Object.keys(M.opc).forEach(function(k) {
            if (!exists && M.opc[k].m === contactEmail && !M.opc[k].hasOwnProperty('dts')) {
                exists = true;
                return false;
            }
        });

        if (exists) {
            closeDialog();
            msgDialog(
                'warningb',
                '',
                l[17545] /* `Invite already sent, waiting for response.` */
            );
        }
        else {
            M.inviteContact(M.u[u_handle].m, contactEmail);
            closeDialog();
            msgDialog(
                'info',
                // `Contact invited`
                l[150],
                // `The user [X] has been invited and will appear in your contact list once accepted.`
                l[5898].replace('[X]', contactEmail)
            );
        }
    }

    _getContactAvatar = (contact, className) => (
        <Avatar
            className={`avatar-wrapper ${className}`}
            contact={M.u[contact.u]}
            chatRoom={this.props.chatRoom}
        />
    );

    _getContactDeleteButton(message) {
        if (message.userId === u_handle && unixtime() - message.delay < MESSAGE_NOT_EDITABLE_TIMEOUT) {
            return (
                <>
                    <hr/>
                    <DropdownItem
                        icon="red-cross"
                        label={l[83] /* `Remove` */}
                        className="red"
                        onClick={e => this.props.onDelete(e, message)}
                    />
                </>
            );
        }
    }

    _getContactCard(message, contact, contactEmail) {
        const HAS_RELATIONSHIP = M.u[contact.u].c === 1;
        const name = M.getNameByHandle(contact.u);

        return (
            <Button
                className="default-white-button tiny-button"
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
                        <div className="dropdown-user-name">
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
                        </div>
                    </div>
                    <ContactFingerprint contact={M.u[contact.u]} />

                    {HAS_RELATIONSHIP && (
                        <>
                            <DropdownItem
                                icon="human-profile"
                                label={l[5868] /* `View profile` */}
                                onClick={() => {
                                    loadSubPage("fm/" + contact.u);
                                }}
                            />
                            <hr/>
                            <DropdownItem
                                icon="conversations"
                                label={l[8632] /* `Start new chat` */}
                                onClick={() => {
                                    loadSubPage("fm/chat/p/" + contact.u);
                                }}
                            />
                        </>
                    )}

                    {!HAS_RELATIONSHIP && (
                        <DropdownItem
                            icon="rounded-grey-plus"
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
        const { message } = this.props;
        const textContents = message.textContents.substr(2, message.textContents.length);
        const attachmentMeta = JSON.parse(textContents);

        if (!attachmentMeta) {
            return console.error(`Message w/ type: ${message.type} -- no attachment meta defined. Message: ${message}`);
        }

        let contacts = [];

        attachmentMeta.forEach((v) => {
            const contact = M.u && M.u[v.u] ? M.u[v.u] : v;
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
                    <div className="message shared-info">
                        <div className="message data-title">{M.getNameByHandle(contact.u)}</div>
                        {M.u[contact.u] ?
                            <ContactVerified className="right-align" contact={M.u[contact.u]}/> :
                            null}
                        <div className="user-card-email">{contactEmail}</div>
                    </div>
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
