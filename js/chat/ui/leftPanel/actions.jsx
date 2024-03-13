import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import { Button } from '../../../ui/buttons.jsx';
import { Dropdown, DropdownContactsSelector, DropdownItem } from '../../../ui/dropdowns.jsx';
import ContactsPanel from '../contactsPanel/contactsPanel.jsx';
import LeftPanel, { FILTER } from './leftPanel.jsx';

export default class Actions extends MegaRenderMixin {
    render() {
        const {
            view,
            views,
            filter,
            routingSection,
            startMeeting,
            scheduleMeeting,
            createGroupChat,
            onFilter
        } = this.props;
        const { CHATS, MEETINGS, LOADING } = views;

        if (is_eplusplus || is_chatlink) {
            return null;
        }

        return (
            <div className={`${LeftPanel.NAMESPACE}-action-buttons`}>
                {view === LOADING &&
                    <Button
                        className="mega-button action loading-sketch">
                        <i />
                        <span />
                    </Button>
                }
                {view === CHATS && routingSection !== 'contacts' &&
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
                }
                {view === MEETINGS && routingSection !== 'contacts' &&
                    <Button
                        className="mega-button action"
                        icon="sprite-fm-mono icon-add-circle"
                        label={l.create_meeting /* `Create meeting` */}>
                        <i className="sprite-fm-mono icon-arrow-down"/>
                        <Dropdown
                            className="light"
                            noArrow="true"
                            vertOffset={4}
                            positionMy="left top"
                            positionAt="left bottom">
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-video-plus"
                                label={l.new_meeting_start /* `Start meeting now` */}
                                onClick={startMeeting}
                            />
                            <hr/>
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-calendar2"
                                label={l.schedule_meeting_start /* `Schedule meeting` */}
                                onClick={scheduleMeeting}
                            />
                        </Dropdown>
                    </Button>
                }
                {routingSection !== 'contacts' &&
                    <div className="lhp-filter">
                        <div className="lhp-filter-control">
                            <Button icon="sprite-fm-mono icon-sort-thin-solid">
                                <Dropdown
                                    className="light"
                                    noArrow="true">
                                    <DropdownItem
                                        className="link-button"
                                        icon="sprite-fm-mono icon-eye-reveal"
                                        label={l.filter_unread /* `Unread messages` */}
                                        onClick={() => onFilter(FILTER.UNREAD)}
                                    />
                                    <DropdownItem
                                        className="link-button"
                                        icon="sprite-fm-mono icon-notification-off"
                                        label={
                                            view === MEETINGS ?
                                                l.filter_muted__meetings /* `Muted meetings` */ :
                                                l.filter_muted__chats /* `Muted chats` */
                                        }
                                        onClick={() => onFilter(FILTER.MUTED)}
                                    />
                                </Dropdown>
                            </Button>
                        </div>
                        {filter &&
                            <>
                                {filter === FILTER.MUTED &&
                                    <div
                                        className="lhp-filter-tag"
                                        onClick={() => onFilter(FILTER.MUTED)}>
                                        <span>
                                            {view === MEETINGS ?
                                                l.filter_muted__meetings /* `Muted meetings` */ :
                                                l.filter_muted__chats /* `Muted chats` */
                                            }
                                        </span>
                                        <i className="sprite-fm-mono icon-close-component" />
                                    </div>
                                }
                                {filter === FILTER.UNREAD &&
                                    <div
                                        className="lhp-filter-tag"
                                        onClick={() => onFilter(FILTER.UNREAD)}>
                                        <span>{l.filter_unread /* `Unread messages` */}</span>
                                        <i className="sprite-fm-mono icon-close-component" />
                                    </div>
                                }
                            </>
                        }
                    </div>
                }
                {routingSection === 'contacts' &&
                    <Button
                        className="mega-button action"
                        icon="sprite-fm-mono icon-add-circle"
                        label={l[71] /* `Add contact` */}
                        onClick={() => contactAddDialog()}
                    />
                }
            </div>
        );
    }
}
