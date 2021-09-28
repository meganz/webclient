import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import Button from './button';
import Call from './call';
import StreamNode from './streamNode';

export default class ParticipantsNotice extends MegaRenderMixin {
    static NAMESPACE = 'participants-notice';

    constructor(props) {
        super(props);
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
            <div className={`${ParticipantsNotice.NAMESPACE}-heading`}>
                <h1>{l.only_one_here /* `You are the only one here...` */}</h1>
            </div>
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
                    <h1>{l.waiting_for_others /* `Waiting for others to join...` */}</h1>
                </div>
                {chatRoom.isMeeting && (
                    <div className={`${ParticipantsNotice.NAMESPACE}-content`}>
                        <h3>{l.copy_and_share /* `Copy this link to send your invite` */}</h3>
                        <div className="mega-input with-icon box-style">
                            <i className="sprite-fm-mono icon-link" />
                            <input type="text" className="megaInputs" readOnly={true} defaultValue={this.props.link} />
                        </div>
                        <Button
                            className="mega-button positive large copy-to-clipboard"
                            onClick={() => copyToClipboard(this.props.link, l[7654])}>
                            <span>{l[17835] /* `Copy Link` */}</span>
                        </Button>
                        {Call.isModerator(chatRoom, u_handle) && (
                            <div className="peers-invite">
                                <hr/>
                                <Button
                                    className="mega-button action"
                                    onClick={onInviteToggle}>
                                    {l.invite_from_contact_list /* `Or invite people form your contact list` */}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };


    render() {
        const { sfuApp, call, streamContainer } = this.props;

        if (sfuApp.isDestroyed) {
            return null;
        }

        return (
            <>
                <StreamNode stream={call.getLocalStream()} />
                {streamContainer(call.left ? this.renderUserAlone() : this.renderUserWaiting())}
            </>
        );
    }
}
