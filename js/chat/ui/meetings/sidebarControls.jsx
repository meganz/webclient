import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { VIEW } from './call.jsx';

export default class SidebarControls extends MegaRenderMixin {
    render() {
        const {
            npeers, view, sidebar, call, chatRoom, onChatToggle, onParticipantsToggle, onInviteToggle
        } = this.props;
        const notifications = chatRoom.getUnreadCount();
        const isOnHold = !!(call?.av & Av.onHold);
        const canInvite = chatRoom.type !== 'private' && !!(
            chatRoom.iAmOperator() ||
            chatRoom.options[MCO_FLAGS.OPEN_INVITE] ||
            chatRoom.publicLink
        );

        //
        // `SidebarControls`
        // -------------------------------------------------------------------------

        return (
            <div className="sidebar-controls">
                <ul className={isOnHold ? 'disabled' : ''}>
                    {canInvite && <li onClick={isOnHold ? null : onInviteToggle}>
                        <Button
                            className={`
                                mega-button
                                theme-dark-forced
                                call-action
                                round
                            `}
                            icon="icon-user-plus-thin-outline"
                        />
                        <span className="control-label">{l[8726] /* `Invite` */}</span>
                    </li>}
                    <li onClick={isOnHold ? null : onChatToggle}>
                        <Button
                            className={`
                                mega-button
                                theme-dark-forced
                                call-action
                                round
                                ${sidebar && view === VIEW.CHAT ? 'selected' : ''}
                                ${isOnHold ? 'disabled' : ''}
                            `}
                            icon={sidebar && view === VIEW.CHAT ? 'icon-chat-filled' : 'icon-message-chat-circle-thin'}
                        />
                        <span className="control-label">{l.chat_call_button /* `Chat` */}</span>
                        {notifications > 0 &&
                            <span className="notification-badge notifications-count">
                                {notifications > 9 ? '9+' : notifications }
                            </span>
                        }
                    </li>
                    <li onClick={isOnHold ? null : onParticipantsToggle}>
                        <Button
                            className={`
                                mega-button
                                theme-dark-forced
                                call-action
                                round
                                ${sidebar && view === VIEW.PARTICIPANTS ? 'selected' : ''}
                                ${isOnHold ? 'disabled' : ''}
                            `}
                            icon={
                                sidebar && view === VIEW.PARTICIPANTS ?
                                    'icon-users-thin-solid' :
                                    'icon-users-thin-outline'
                            }
                        />
                        <span className="control-label">{l.participants_call_button /* `Participants` */}</span>
                        <span className="notification-badge participants-count theme-dark-forced">{npeers + 1}</span>
                    </li>
                </ul>
            </div>
        );
    }
}
