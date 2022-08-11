import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import { Button } from '../../../ui/buttons.jsx';
import { DropdownContactsSelector } from '../../../ui/dropdowns.jsx';
import ContactsPanel from '../contactsPanel/contactsPanel.jsx';
import LeftPanel from './leftPanel.jsx';

export default class Actions extends MegaRenderMixin {
    render() {
        const { view, views, routingSection, startMeeting, createGroupChat } = this.props;
        const { CHATS, MEETINGS, LOADING } = views;

        if (is_eplusplus || is_chatlink) {
            return null;
        }

        return (
            <div className={`${LeftPanel.NAMESPACE}-action-buttons`}>
                {view === LOADING && (
                    <Button
                        className="mega-button action loading-sketch">
                        <i />
                        <span />
                    </Button>
                )}
                {view === CHATS && routingSection !== 'contacts' && (
                    <Button
                        className="mega-button action"
                        icon="sprite-fm-mono icon-add-circle"
                        label={l.add_chat /* `New chat` */}>
                        <DropdownContactsSelector
                            className={`
                                main-start-chat-dropdown
                                ${LeftPanel.NAMESPACE}-contact-selector
                            `}
                            onSelectDone={selected => {
                                if (selected.length === 1) {
                                    return megaChat.createAndShowPrivateRoom(selected[0])
                                        .then(room => room.setActive());
                                }
                                megaChat.createAndShowGroupRoomFor(selected);
                            }}
                            multiple={false}
                            horizOffset={70}
                            topButtons={[
                                {
                                    key: 'newGroupChat',
                                    title: l[19483] /* `New group chat` */,
                                    icon: 'sprite-fm-mono icon-chat-filled',
                                    onClick: createGroupChat
                                }
                            ]}
                            showAddContact={ContactsPanel.hasContacts()}
                        />
                    </Button>
                )}
                {view === MEETINGS && routingSection !== 'contacts' && (
                    <Button
                        className="mega-button action"
                        icon="sprite-fm-mono icon-add-circle"
                        label={l.new_meeting /* `New meeting` */}
                        onClick={startMeeting}
                    />
                )}
                {routingSection === 'contacts' && (
                    <Button
                        className="mega-button action"
                        icon="sprite-fm-mono icon-add-circle"
                        label={l[71] /* `Add contact` */}
                        onClick={() => contactAddDialog()}
                    />
                )}
            </div>
        );
    }
}
