import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { isGuest, MODE } from './call.jsx';
import { Emoji } from '../../../ui/utils.jsx';

export const Privilege = ({ chatRoom, stream }) => {
    const { call, userHandle } = stream || {};

    if (call && call.isPublic) {
        const { OPERATOR, FULL } = ChatRoom.MembersSet.PRIVILEGE_STATE;
        const currentUserModerator = chatRoom.members[u_handle] === OPERATOR;
        const targetUserModerator = chatRoom.members[userHandle] === OPERATOR;

        return (
            currentUserModerator &&
            <Button
                targetUserModerator={targetUserModerator}
                icon="sprite-fm-mono icon-admin-outline"
                onClick={() => {
                    ['alterUserPrivilege', 'onCallPrivilegeChange'].map(event =>
                        chatRoom.trigger(event, [userHandle, targetUserModerator ? FULL : OPERATOR])
                    );
                }}>
                <span>
                    {targetUserModerator ?
                        l.remove_moderator /* `Remmove moderator` */ :
                        l.make_moderator /* `Make moderator` */
                    }
                </span>
            </Button>
        );
    }

    return null;
};

const Contact = ({ stream, ephemeralAccounts, onCallMinimize }) => {
    const { userHandle } = stream;
    const IS_GUEST = isGuest() || ephemeralAccounts && ephemeralAccounts.includes(userHandle);
    const HAS_RELATIONSHIP = M.u[userHandle].c === 1;

    if (HAS_RELATIONSHIP) {
        return (
            <Button
                icon="sprite-fm-mono icon-chat"
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
                        M.syncContactEmail(userHandle, true)
                            .then(email => {
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
};

export const Pin = ({ stream, mode, onSpeakerChange, onModeChange })  => {
    return (
        <Button
            icon="sprite-fm-mono grid-main"
            onClick={() => mode === MODE.THUMBNAIL ? onSpeakerChange?.(stream) : onModeChange?.(MODE.THUMBNAIL)}>
            <span>
                {mode === MODE.THUMBNAIL ?
                    l.display_in_main_view /* `Display in main view` */ :
                    l.switch_to_thumb_view /* `Switch to thumbnail view` */
                }
            </span>
        </Button>
    );
};

export default class VideoNodeMenu extends MegaRenderMixin {
    static NAMESPACE = 'node-menu';

    render() {
        const { NAMESPACE } = VideoNodeMenu;
        const { stream } = this.props;
        const $$CONTROLS = { Contact, Pin, Privilege };

        if (stream.userHandle !== u_handle) {
            return (
                <div
                    className={`
                        ${NAMESPACE}
                        theme-dark-forced
                    `}>
                    <div className={`${NAMESPACE}-toggle`}>
                        <Emoji>{M.getNameByHandle(stream.userHandle)}</Emoji>
                        <i className="sprite-fm-mono icon-side-menu"/>
                    </div>
                    <div className={`${NAMESPACE}-content`}>
                        <ul>
                            {Object.values($$CONTROLS).map(($$CONTROL, i) =>
                                <li
                                    key={`${Object.keys($$CONTROLS)[i]}-${stream.clientId}-${stream.userHandle}`}>
                                    <$$CONTROL {...this.props} />
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            );
        }

        return null;
    }
}
