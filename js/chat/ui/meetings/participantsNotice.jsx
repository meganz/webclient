import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import {LocalVideoHiRes} from './videoNode.jsx';
import { Emoji, ParsedHTML } from '../../../ui/utils.jsx';
import { InviteParticipantsPanel } from "../inviteParticipantsPanel.jsx";

export default class ParticipantsNotice extends MegaRenderMixin {
    static NAMESPACE = 'participants-notice';
    domRef = React.createRef();

    constructor(props) {
        super(props);
        this.av = this.props.call.sfuClient.availAv;
    }

    /**
     * specShouldComponentUpdate
     * @description Determine if the component should update based on props/new props.
     * @see MegaRenderMixin.shouldComponentUpdate
     * @param {object} newProps The incoming props
     * @returns {boolean} If the component should updated
     */
    specShouldComponentUpdate(newProps) {
        const { stayOnEnd, hasLeft, isOnHold, call } = this.props;
        const currAv = this.av;
        this.av = call.sfuClient.availAv;
        return newProps.stayOnEnd !== stayOnEnd
            || newProps.hasLeft !== hasLeft
            || newProps.isOnHold !== isOnHold
            || this.av !== currAv;
    }

    /**
     * renderUserAlone
     * @description Rendered after all other participants have left the call.
     * @see Stream.renderStreamContainer
     * @returns {JSX.Element}
     */

    renderUserAlone = () =>
        <div
            className={`
                ${ParticipantsNotice.NAMESPACE}
                theme-dark-forced
                user-alone
            `}>
            {this.props.stayOnEnd
                ? <div className={`${ParticipantsNotice.NAMESPACE}-heading`}>
                    <h1>
                        {this.props.everHadPeers
                            ? l.only_one_here /* `You are the only one here...` */
                            : l.waiting_for_others /* `Waiting for others to join...` */}
                    </h1>
                </div>
                : <div className={`${ParticipantsNotice.NAMESPACE}-content user-alone`}>
                    <h3>{l.only_one_here /* `You are the only one here...` */}</h3>
                    <p className="theme-dark-forced">
                        <ParsedHTML>
                            {l.empty_call_dlg_text.replace('%s', '2')}
                        </ParsedHTML>
                    </p>
                    <div className="notice-footer">
                        <Button
                            className="mega-button large stay-on-call"
                            onClick={this.props.onStayConfirm}>
                            <span>{l.empty_call_stay_button /* `Stay on call` */}</span>
                        </Button>
                        <Button
                            className="mega-button positive large stay-on-call"
                            onClick={this.props.onCallEnd}>
                            <span>{l.empty_call_dlg_end /* `End call now` */}</span>
                        </Button>
                    </div>
                </div>
            }
        </div>;

    /**
     * renderUserWaiting
     * @description Rendered initially when the participant joins the meeting and they are the only one within the call.
     * @see Stream.renderStreamContainer
     * @returns {JSX.Element}
     */

    renderUserWaiting = () => {
        const { chatRoom, onInviteToggle } = this.props;

        return (
            <div
                className={`
                    ${ParticipantsNotice.NAMESPACE}
                    ${chatRoom.isMeeting ? '' : 'user-alone'}
                    theme-dark-forced
                `}>
                <div className={`${ParticipantsNotice.NAMESPACE}-heading`}>
                    {chatRoom.type === 'private' ?
                        <h1>
                            <Emoji>{l.waiting_for_peer.replace('%NAME', chatRoom.getRoomTitle())}</Emoji>
                        </h1> :
                        <h1>{l.waiting_for_others /* `Waiting for others to join...` */}</h1>
                    }
                </div>
                {chatRoom.isMeeting && chatRoom.publicLink &&
                    <div className={`${ParticipantsNotice.NAMESPACE}-content-invite`}>
                        <InviteParticipantsPanel
                            chatRoom={chatRoom}
                            disableLinkToggle={true}
                            onAddParticipants={() => {
                                this.setState({ inviteDialog: false }, () => onInviteToggle());
                            }}
                        />
                    </div>
                }
            </div>
        );
    };


    render() {
        const { call, hasLeft, streamContainer, chatRoom } = this.props;

        if (call.isDestroyed) {
            return null;
        }

        return (
            <div ref={this.domRef}>
                {call.isSharingScreen() ? null : (
                    <LocalVideoHiRes
                        className="local-stream-mirrored"
                        chatRoom={chatRoom}
                        source={call.getLocalStream()}
                    />
                )}
                {streamContainer(hasLeft ? this.renderUserAlone() : this.renderUserWaiting())}
            </div>
        );
    }
}
