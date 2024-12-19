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
    domRef = React.createRef();

    ToggleCrop = ({videoNodeRef}) => {
        const videoNode = videoNodeRef?.current;
        if (!videoNode) {
            return null;
        }
        // FIXME: Translate strings, re-enable forceUpdate() calls
        return videoNode.isVideoCropped() ?
            <Button
                icon="sprite-fm-mono grid-main"
                onClick={() => {
                    videoNode.uncropVideo();
                    this.forceUpdate();
                }}>
                <span>Uncrop video</span>
            </Button> :
            <Button
                icon="sprite-fm-mono grid-main"
                onClick={() => {
                    videoNode.cropVideo();
                    this.forceUpdate();
                }}>
                <span>Crop video</span>
            </Button>;
    };

    render() {
        const { NAMESPACE } = VideoNodeMenu;
        const { stream, isPresenterNode, mode, onSpeakerChange, onModeChange } = this.props;
        const { userHandle, clientId } = stream;

        if (isPresenterNode) {
            return (
                <div
                    ref={this.domRef}
                    className={`
                        ${NAMESPACE}
                        theme-dark-forced
                        ${mode === MODE.THUMBNAIL ? '' : 'presenter'}
                    `}>
                    <div className={`${NAMESPACE}-toggle`}>
                        <i
                            className={`sprite-fm-mono call-node-pin icon-pin${mode === MODE.MAIN ? '-off' : ''}`}
                            onClick={() => mode === MODE.THUMBNAIL ?
                                onSpeakerChange?.(stream) :
                                onModeChange?.(MODE.THUMBNAIL)
                            }
                        />
                    </div>
                </div>
            );
        }

        if (userHandle !== u_handle) {
            const $$CONTROLS = { Contact, Pin, Privilege /* , ToggleCrop: this.ToggleCrop */};

            return (
                <div
                    ref={this.domRef}
                    className={`
                        ${NAMESPACE}
                        theme-dark-forced
                    `}>
                    <div className={`${NAMESPACE}-toggle`}>
                        <i className="sprite-fm-mono icon-more-horizontal-thin-outline"/>
                    </div>
                    <div className={`${NAMESPACE}-content`}>
                        <ul>
                            {Object.values($$CONTROLS).map(($$CONTROL, i) =>
                                <li
                                    key={`${Object.keys($$CONTROLS)[i]}-${clientId}-${userHandle}`}>
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
