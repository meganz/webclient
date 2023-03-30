import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import Call from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';

export default class VideoNodeMenu extends MegaRenderMixin {
    static NAMESPACE = 'node-menu';

    constructor(props) {
        super(props);
        this.Contact = this.Contact.bind(this);
        this.Pin = this.Pin.bind(this);
        this.Privilege = this.Privilege.bind(this);
    }

    Contact() {
        const { stream, ephemeralAccounts, onCallMinimize } = this.props;
        const { userHandle } = stream;
        const IS_GUEST = Call.isGuest() || ephemeralAccounts && ephemeralAccounts.includes(userHandle);
        const HAS_RELATIONSHIP = M.u[userHandle].c === 1;

        if (HAS_RELATIONSHIP) {
            return (
                <Button
                    icon="sprite-fm-mono icon-chat-filled"
                    onClick={() => {
                        onCallMinimize();
                        loadSubPage(`fm/chat/p/${userHandle}`);
                    }}>
                    <span>{l[7997] /* `Chat` */}</span>
                </Button>
            );
        }

        return (
            <Button
                className={IS_GUEST ? 'disabled' : ''}
                icon="sprite-fm-mono icon-add"
                onClick={() => {
                    return (
                        IS_GUEST ?
                            false :
                            M.syncContactEmail(userHandle, new MegaPromise(), true)
                                .done(email => {
                                    const OPC = Object.values(M.opc);
                                    if (OPC && OPC.length && OPC.some(opc => opc.m === email)) {
                                        return msgDialog('warningb', '', l[17545]);
                                    }
                                    msgDialog('info', l[150], l[5898]);
                                    M.inviteContact(M.u[u_handle].m, email);
                                })
                                .catch(() => mBroadcaster.sendMessage('meetings:ephemeralAdd', userHandle))
                    );
                }}>
                <span>{l[24581] /* `Add Contact` */}</span>
            </Button>
        );
    }

    Pin() {
        const { stream, onSpeakerChange } = this.props;
        if (onSpeakerChange) {
            return (
                <Button
                    icon="sprite-fm-mono icon-speaker-view"
                    onClick={() => onSpeakerChange(stream)}>
                    <span>{l.display_in_main_view /* `Display in main view` */}</span>
                </Button>
            );
        }
        return null;
    }

    Privilege() {
        const { stream, chatRoom } = this.props;
        const { call, userHandle } = stream;

        if (call && call.isPublic) {
            const { FULL, OPERATOR } = ChatRoom.MembersSet.PRIVILEGE_STATE;
            const currentUserModerator = chatRoom.members[u_handle] === FULL;
            const targetUserModerator = chatRoom.members[userHandle] === FULL;

            return (
                currentUserModerator &&
                    <Button
                        targetUserModerator={targetUserModerator}
                        icon="sprite-fm-mono icon-admin"
                        onClick={() => {
                            ['alterUserPrivilege', 'onCallPrivilegeChange'].map(event =>
                                chatRoom.trigger(event, [userHandle, targetUserModerator ? OPERATOR : FULL])
                            );
                        }}>
                        <span>
                            {targetUserModerator ?
                                l.remove_moderator /* `Remmove moderator` */ :
                                l.make_moderator /* `Make moderator` */ }
                        </span>
                    </Button>
            );
        }

        return null;
    }

    render() {
        const { NAMESPACE } = VideoNodeMenu;
        const { userHandle } = this.props.stream;

        if (userHandle !== u_handle) {
            return (
                <div
                    className={`
                        ${NAMESPACE}
                        theme-dark-forced
                    `}>
                    <div className={`${NAMESPACE}-toggle`}>
                        <Emoji>{M.getNameByHandle(userHandle)}</Emoji>
                        <i className="sprite-fm-mono icon-side-menu"/>
                    </div>
                    <div className={`${NAMESPACE}-content`}>
                        <ul>
                            {[this.Contact, this.Pin, this.Privilege].map((button, index) =>
                                <li key={index}>{button()}</li>
                            )}
                        </ul>
                    </div>
                </div>
            );
        }

        return null;
    }
}
