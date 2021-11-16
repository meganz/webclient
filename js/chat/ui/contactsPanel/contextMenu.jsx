import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins.js';
import { DropdownItem } from '../../../ui/dropdowns.jsx';
import { Avatar, ContactPresence } from '../contacts.jsx';
import ContactsPanel from './contactsPanel.jsx';

export default class ContextMenu extends MegaRenderMixin {
    EVENT_CLOSE = new Event('closeDropdowns');

    constructor(props) {
        super(props);
    }

    close = callback => {
        if (callback && typeof callback === 'function' && !M.isInvalidUserStatus()) {
            callback();
        }
        document.dispatchEvent(this.EVENT_CLOSE);
    };

    handleSetNickname = handle =>
        this.close(() =>
            nicknames.setNicknameDialog.init(handle)
        );

    handleAddContact = handle => {
        M.syncContactEmail(handle, new MegaPromise(), true)
            .done(email => {
                const OPC = Object.values(M.opc);
                const ALREADY_SENT = OPC && OPC.length && OPC.some(opc => opc.m === email);
                this.close(() => {
                    if (ALREADY_SENT) {
                        return msgDialog('warningb', '', l[17545]);
                    }
                    msgDialog('info', l[150], l[5898]);
                    M.inviteContact(M.u[u_handle].m, email);
                });
            });
    };

    render() {
        const { contact, selected, withProfile } = this.props;
        if (ContactsPanel.hasRelationship(contact)) {
            return (
                <>
                    {withProfile &&
                        <div className="dropdown-avatar rounded" onClick={(e) => {
                            e.stopPropagation();
                            loadSubPage('fm/chat/contacts/' + contact.h);
                        }}>
                            <Avatar
                                contact={contact}
                                className="avatar-wrapper context-avatar"
                            />
                            <div className="dropdown-profile">
                                <span>{M.getNameByHandle(contact.u)}</span>
                                <ContactPresence contact={contact} />
                            </div>
                        </div>
                    }
                    <DropdownItem
                        icon="sprite-fm-mono icon-chat"
                        label={l[8632]}
                        onClick={() =>
                            this.close(() => {
                                if (selected && selected.length) {
                                    return megaChat.createAndShowGroupRoomFor(selected, '', true, false);
                                }
                                return loadSubPage('fm/chat/p/' + contact.u);
                            })
                        }
                    />
                    <DropdownItem
                        icon="sprite-fm-mono icon-send-files"
                        label={l[6834]}
                        onClick={() =>
                            this.close(() =>
                                megaChat.openChatAndSendFilesDialog(contact.u)
                            )
                        }
                    />
                    <DropdownItem
                        icon="sprite-fm-mono icon-folder-outgoing-share"
                        label={l[5631]}
                        onClick={() =>
                            this.close(() =>
                                openCopyShareDialog(contact.u)
                            )
                        }
                    />
                    <DropdownItem
                        submenu={true}
                        icon="sprite-fm-mono icon-phone"
                        className="sprite-fm-mono-before icon-arrow-right-before"
                        label={l[19125]}
                    />
                    <div className="dropdown body submenu">
                        <DropdownItem
                            icon="sprite-fm-mono icon-phone"
                            disabled={!megaChat.hasSupportForCalls}
                            label={l[5896]}
                            onClick={() =>
                                this.close(() =>
                                    megaChat.createAndShowPrivateRoom(contact.u)
                                        .then(room => {
                                            room.setActive();
                                            room.startAudioCall();
                                        })
                                )
                            }
                        />
                        <DropdownItem
                            icon="sprite-fm-mono icon-video-call-filled"
                            disabled={!megaChat.hasSupportForCalls}
                            label={l[5897]}
                            onClick={() =>
                                this.close(() =>
                                    megaChat.createAndShowPrivateRoom(contact.u)
                                        .then(room => {
                                            room.setActive();
                                            room.startVideoCall();
                                        })
                                )
                            }
                        />
                    </div>
                    <hr />
                    {withProfile &&
                        <DropdownItem
                            icon="sprite-fm-mono icon-my-account"
                            label={l[5868]}
                            onClick={() =>
                                loadSubPage('fm/chat/contacts/' + contact.u)
                            }
                        />
                    }
                    <DropdownItem
                        icon="sprite-fm-mono icon-rename"
                        label={contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label}
                        onClick={() => this.handleSetNickname(contact.u)}
                    />
                    <hr />
                    <DropdownItem
                        submenu={true}
                        icon="sprite-fm-mono icon-key"
                        className="sprite-fm-mono-before icon-arrow-right-before"
                        label={l[6872]}
                    />
                    <div className="dropdown body white-context-menu submenu">
                        {ContactsPanel.isVerified(contact) ?
                            <DropdownItem
                                label={l[742]}
                                onClick={() => this.close(() => ContactsPanel.resetCredentials(contact))} /> :
                            <DropdownItem
                                label={l[1960]}
                                onClick={() => this.close(() => ContactsPanel.verifyCredentials(contact))} />
                        }
                    </div>
                    <div className="dropdown-credentials">
                        {ContactsPanel.getUserFingerprint(contact.u)}
                    </div>
                    <hr />
                    <DropdownItem
                        icon="sprite-fm-mono icon-disable"
                        label={l[1001]}
                        disabled={!!contact.b}
                        className=""
                        onClick={() =>
                            this.close(() =>
                                fmremove(contact.u)
                            )
                        }
                    />
                </>
            );
        }

        return (
            <>
                <DropdownItem
                    icon="sprite-fm-mono icon-disabled-filled"
                    label={l[71]}
                    onClick={() => this.handleAddContact(contact.u)}
                />
                <DropdownItem
                    icon="sprite-fm-mono icon-rename"
                    label={contact.nickname === '' ? l.set_nickname_label : l.edit_nickname_label}
                    onClick={() => this.handleSetNickname(contact.u)}
                />
            </>
        );
    }
}
