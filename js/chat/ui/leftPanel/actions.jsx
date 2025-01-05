import React from 'react';
import { Button } from '../../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../../ui/dropdowns.jsx';
import { FILTER, NAMESPACE } from './leftPanel.jsx';

const Actions = ({
    view,
    views,
    filter,
    routingSection,
    startMeeting,
    scheduleMeeting,
    createNewChat,
    onFilter
}) => {
    const { CHATS, MEETINGS, LOADING } = views;

    if (is_eplusplus || is_chatlink) {
        return null;
    }

    return (
        <div className={`${NAMESPACE}-action-buttons`}>
            {view === LOADING &&
                <Button
                    className="mega-button action loading-sketch">
                    <i/>
                    <span/>
                </Button>
            }

            {view === CHATS && routingSection !== 'contacts' &&
                <>
                    <Button
                        className="mega-button small positive new-chat-action"
                        label={l.add_chat /* `New chat` */}
                        onClick={() => {
                            createNewChat();
                            eventlog(500284);
                        }}
                    />
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
                                        <i className="sprite-fm-mono icon-close-component"/>
                                    </div>
                                }
                                {filter === FILTER.UNREAD &&
                                    <div
                                        className="lhp-filter-tag"
                                        onClick={() => onFilter(FILTER.UNREAD)}>
                                        <span>{l.filter_unread /* `Unread messages` */}</span>
                                        <i className="sprite-fm-mono icon-close-component"/>
                                    </div>
                                }
                            </>
                        }
                    </div>
                </>
            }

            {view === MEETINGS && routingSection !== 'contacts' &&
                <Button
                    className="mega-button small positive new-meeting-action"
                    label={l.new_meeting /* `New meeting` */}>
                    <i className="dropdown-indicator sprite-fm-mono icon-arrow-down"/>
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

            {routingSection === 'contacts' &&
                <Button
                    className="mega-button small positive"
                    label={l[71] /* `Add contact` */}
                    onClick={() => {
                        contactAddDialog();
                        eventlog(500285);
                    }}
                />
            }
        </div>
    );
};

export default Actions;
