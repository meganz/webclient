import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { VIEW } from './call.jsx';

export default class SidebarControls extends MegaRenderMixin {
    render() {
        const { npeers, view, sidebar, chatRoom, onChatToggle, onParticipantsToggle } = this.props;
        const SIMPLETIP = { position: 'top', offset: 5, className: 'theme-dark-forced' };
        const notifications = chatRoom.getUnreadCount();

        //
        // `SidebarControls`
        // -------------------------------------------------------------------------

        return (
            <div className="sidebar-controls">
                <ul>
                    <li>
                        <Button
                            className={`
                                mega-button
                                theme-dark-forced
                                round
                                large
                                ${sidebar && view === VIEW.CHAT ? 'selected' : ''}
                            `}
                            simpletip={{ ...SIMPLETIP, label: l.chats /* `Chats` */ }}
                            icon="icon-chat-filled"
                            onClick={onChatToggle}>
                            <span>{l.chats /* `Chats` */}</span>
                        </Button>
                        {notifications > 0 &&
                        <span className="notifications-count">{notifications > 9 ? '9+' : notifications }</span>}
                    </li>
                    <li>
                        <Button
                            className={`
                                mega-button
                                theme-dark-forced
                                round
                                large
                                ${sidebar && view === VIEW.PARTICIPANTS ? 'selected' : ''}
                            `}
                            simpletip={{ ...SIMPLETIP, label: l[16217] /* `Participants` */ }}
                            icon="icon-contacts"
                            onClick={onParticipantsToggle}>
                            <span>{l[16217] /* `Participants` */}</span>
                        </Button>
                        <span className="participants-count">{npeers + 1}</span>
                    </li>
                </ul>
            </div>
        );
    }
}
