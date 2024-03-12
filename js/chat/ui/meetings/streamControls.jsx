import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import { withMicObserver } from './micObserver.jsx';
import { withPermissionsObserver } from './permissionsObserver.jsx';
import Call from './call.jsx';
import { withHostsObserver } from './hostsObserver.jsx';

export const renderLeaveConfirm = (onConfirm, onRecordingToggle) =>
    msgDialog(
        `confirmation:!^${l.leave_call_recording_dialog_cta}!${l.leave_call_recording_dialog_nop_cta}`,
        undefined,
        l.leave_call_recording_dialog_heading,
        l.leave_call_recording_dialog_body,
        cb => {
            if (cb) {
                onRecordingToggle();
                onConfirm();
            }
        },
        1
    );

export const renderEndConfirm = (onConfirm, onRecordingToggle) =>
    msgDialog(
        `confirmation:!^${l.end_call_recording_dialog_cta}!${l.end_call_recording_dialog_nop_cta}`,
        undefined,
        l.end_call_recording_dialog_heading,
        l.end_call_recording_dialog_body,
        cb => {
            if (cb) {
                onRecordingToggle();
                onConfirm();
            }
        },
        1
    );

// --

class StreamControls extends MegaRenderMixin {
    static NAMESPACE = 'stream-controls';

    endContainerRef = React.createRef();
    endButtonRef = React.createRef();
    SIMPLETIP = { position: 'top', offset: 8, className: 'theme-dark-forced' };

    state = {
        endCallOptions: false,
        endCallPending: false
    };

    LeaveButton = withHostsObserver(
        ({ hasHost, chatRoom, confirmLeave, onLeave }) => {
            const doLeave = () =>
                hasHost(chatRoom.getCallParticipants()) ?
                    // Leave the call directly w/o any further actions if
                    // there are other hosts already present in the call.
                    onLeave() :
                    // Show the `Assign host and leave call` confirmation dialog
                    confirmLeave({
                        title: l.assign_host_leave_call /* `Assign host to leave call` */,
                        body: l.assign_host_leave_call_details /* `You're the only host...` */,
                        cta: l.assign_host_button /* `Assign host` */,
                        altCta: l.leave_anyway /* `Leave anyway` */
                    });

            return (
                <Button
                    className="mega-button"
                    onClick={() => {
                        const { recorder, onRecordingToggle } = this.props;
                        return (
                            recorder && recorder === u_handle ?
                                renderLeaveConfirm(doLeave, onRecordingToggle) :
                                doLeave()
                        );
                    }}>
                    <span>{l.leave /* `Leave` */}</span>
                </Button>
            );
        }
    );

    handleMousedown = ({ target }) =>
        this.endContainerRef &&
        this.endContainerRef.current &&
        this.endContainerRef.current.contains(target) ?
            null :
            this.isMounted() && this.setState({ endCallOptions: false });

    renderDebug = () => {
        return (
            <div
                className="stream-debug"
                style={{
                    position: 'absolute',
                    left: 25,
                    bottom: 36,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'tomato'
                }}>
                <Button
                    className="mega-button round small theme-dark-forced positive"
                    simpletip={{ ...this.SIMPLETIP, label: 'Add Stream' }}
                    onClick={() => this.props.onStreamToggle(STREAM_ACTIONS.ADD)}>
                    <span>{l.add}</span>
                </Button>
                <Button
                    className="mega-button round small theme-dark-forced negative"
                    simpletip={{ ...this.SIMPLETIP, label: 'Remove Stream' }}
                    onClick={() => this.props.peers.length > 1 && this.props.onStreamToggle(STREAM_ACTIONS.REMOVE)}>
                    <span>{l[83]}</span>
                </Button>
                <span>{this.props.peers.length + 1}</span>
            </div>
        );
    };

    renderEndCallOptions = () => {
        const { chatRoom, recorder, onRecordingToggle, onCallEnd } = this.props;
        const { endCallOptions, endCallPending } = this.state;
        const doEnd = () => this.setState({ endCallPending: true }, () => chatRoom.endCallForAll());

        return (
            <div
                className={`
                    end-options
                    theme-dark-forced
                    ${endCallOptions ? '' : 'hidden'}
                `}>
                <div className="end-options-content">
                    <this.LeaveButton
                        chatRoom={chatRoom}
                        recorder={recorder}
                        participants={chatRoom.getCallParticipants()}
                        onLeave={onCallEnd}
                        onConfirmDenied={onCallEnd}
                    />
                    <Button
                        className={`
                            mega-button
                            positive
                            ${endCallPending ? 'disabled' : ''}
                        `}
                        onClick={() => {
                            if (recorder && recorder === u_handle) {
                                return renderEndConfirm(doEnd, onRecordingToggle);
                            }
                            return doEnd();
                        }}>
                        <span>{l.end_for_all /* `End for all` */}</span>
                    </Button>
                </div>
            </div>
        );
    };

    renderEndCall = () => {
        const { chatRoom, peers, recorder, onRecordingToggle, onCallEnd } = this.props;

        return (
            <div
                ref={this.endContainerRef}
                className="end-call-container"
                onClick={() => {
                    // Host on a group call w/ other peers in the call -> show the end call options menu;
                    // see `renderEndCallOptions`
                    if (chatRoom.type !== 'private' && peers.length && Call.isModerator(chatRoom, u_handle)) {
                        return (
                            this.setState(state => ({ endCallOptions: !state.endCallOptions }), () =>
                                this.endButtonRef && $(this.endButtonRef.current).trigger('simpletipClose')
                            )
                        );
                    }

                    // Call recording is ongoing -> confirm before ending the call
                    if (recorder && recorder === u_handle) {
                        return chatRoom.type === 'private' ?
                            renderEndConfirm(onCallEnd, onRecordingToggle) :
                            renderLeaveConfirm(onCallEnd, onRecordingToggle);
                    }

                    return onCallEnd();
                }}>
                {this.renderEndCallOptions()}
                <Button
                    simpletip={{ ...this.SIMPLETIP, label: l[5884] /* `End call` */ }}
                    className="mega-button theme-dark-forced round negative end-call"
                    icon="icon-phone-02"
                    didMount={button => {
                        this.endButtonRef = button.buttonRef;
                    }}
                />
                <span>{l.end_button /* `End` */}</span>
            </div>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('mousedown', this.handleMousedown);
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('mousedown', this.handleMousedown);
    }

    render() {
        const {
            call, signal, onAudioClick, onVideoClick, onScreenSharingClick, onHoldClick, renderSignalWarning,
            hasToRenderPermissionsWarning, renderPermissionsWarning, resetError, blocked, renderBlockedWarning
        } = this.props;
        const avFlags = call.av;
        const isOnHold = avFlags & Av.onHold;

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
            <>
                {blocked && renderBlockedWarning()}
                <div className={StreamControls.NAMESPACE}>
                    {d && localStorage.callDebug ? this.renderDebug() : ''}
                    <ul>
                        <li
                            className={isOnHold ? 'disabled' : ''}
                            onClick={() => {
                                if (isOnHold) {
                                    return;
                                }
                                resetError(Av.Audio);
                                onAudioClick();
                            }}>
                            <Button
                                className={`
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Audio || isOnHold ? '' : 'with-fill'}
                                `}
                                icon={avFlags & Av.Audio ? 'icon-mic-thin-outline' : 'icon-mic-off-thin-outline'}
                            />
                            <span>{l.mic_button /* `Mic` */}</span>
                            {signal ? null : renderSignalWarning()}
                            {hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null}
                        </li>
                        <li
                            className={isOnHold ? 'disabled' : ''}
                            onClick={() => {
                                if (isOnHold) {
                                    return;
                                }
                                resetError(Av.Camera);
                                onVideoClick();
                            }}>
                            <Button
                                className={`
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Camera || isOnHold ? '' : 'with-fill'}
                                `}
                                icon={avFlags & Av.Camera ? 'icon-video-thin-outline' : 'icon-video-off-thin-outline'}
                            />
                            <span>{l.camera_button /* `Camera` */}</span>
                            {hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null}
                        </li>
                        <li
                            className={isOnHold ? 'disabled' : ''}
                            onClick={() => {
                                if (isOnHold) {
                                    return;
                                }
                                resetError(Av.Screen);
                                onScreenSharingClick();
                            }}>
                            <Button
                                key="screen-sharing"
                                className={`
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'disabled' : ''}
                                    ${avFlags & Av.Screen ? 'with-fill' : ''}
                                `}
                                icon={avFlags & Av.Screen ? 'icon-monitor-off' : 'icon-monitor'}
                            />
                            <span>
                                {avFlags & Av.Screen ?
                                    l.screenshare_stop_button /* `Stop sharing` */ :
                                    l.screenshare_button /* `Share` */
                                }
                            </span>
                            {hasToRenderPermissionsWarning(Av.Screen) ?
                                renderPermissionsWarning(Av.Screen, this) :
                                null
                            }
                        </li>
                        <li onClick={onHoldClick}>
                            <Button
                                key="call-hold"
                                className={`
                                    mega-button
                                    theme-light-forced
                                    call-action
                                    round
                                    ${isOnHold ? 'with-fill' : ''}
                                `}
                                icon={
                                    isOnHold ?
                                        'icon-play-small-regular-outline' :
                                        'icon-pause-small-regular-outline'
                                }
                            />
                            <span>{isOnHold ? l.resume_call_button /* `Resume` */ : l.hold_button /* `Hold` */}</span>
                        </li>
                        <li>
                            {this.renderEndCall()}
                        </li>
                    </ul>
                </div>
            </>
        );
    }
}

export default compose(withMicObserver, withPermissionsObserver)(StreamControls);
