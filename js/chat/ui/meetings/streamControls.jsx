import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import { withMicObserver } from './micObserver.jsx';
import { withPermissionsObserver } from './permissionsObserver.jsx';
import Call from './call.jsx';
import { withHostsObserver } from './hostsObserver.jsx';

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
            return (
                <Button
                    className="mega-button"
                    onClick={() =>
                        hasHost(chatRoom.getCallParticipants()) ?
                            // Leave the call directly w/o any further actions if
                            // there are other hosts already present in the call.
                            onLeave() :
                            // Show the `Assign host and leave call` confirmation dialog
                            confirmLeave({
                                title: l.assign_host_leave_call /* `Assign host to leave call` */,
                                body: l.assign_host_leave_call_details /* `You're the only host on this call...` */,
                                cta: l.assign_host_button /* `Assign host` */
                            })
                    }>
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
                style={{ position: 'absolute', left: 25, bottom: 36 }}>
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
            </div>
        );
    };

    renderEndCallOptions = () => {
        const { chatRoom, onCallEnd } = this.props;
        const { endCallOptions, endCallPending } = this.state;

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
                        participants={chatRoom.getCallParticipants()}
                        onLeave={onCallEnd}
                    />
                    <Button
                        className={`
                            mega-button
                            positive
                            ${endCallPending ? 'disabled' : ''}
                        `}
                        onClick={() =>
                            endCallPending ?
                                null :
                                this.setState({ endCallPending: true }, () => chatRoom.endCallForAll())
                        }>
                        <span>{l.end_for_all /* `End for all` */}</span>
                    </Button>
                </div>
            </div>
        );
    };

    renderEndCall = () => {
        const { chatRoom, peers, onCallEnd } = this.props;
        return (
            <div
                ref={this.endContainerRef}
                className="end-call-container">
                {this.renderEndCallOptions()}
                <Button
                    simpletip={{ ...this.SIMPLETIP, label: l[5884] /* `End call` */ }}
                    className="mega-button theme-dark-forced round large negative end-call"
                    icon="icon-end-call"
                    didMount={button => {
                        this.endButtonRef = button.buttonRef;
                    }}
                    onClick={() =>
                        chatRoom.type !== 'private' && peers.length && Call.isModerator(chatRoom, u_handle) ?
                            this.setState(state => ({ endCallOptions: !state.endCallOptions }), () =>
                                this.endButtonRef && $(this.endButtonRef.current).trigger('simpletipClose')
                            ) :
                            onCallEnd()
                    }>
                    <span>{l[5884] /* `End call` */}</span>
                </Button>
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
            call, chatRoom, signal, onAudioClick, onVideoClick, onScreenSharingClick, onHoldClick, renderSignalWarning,
            hasToRenderPermissionsWarning, renderPermissionsWarning, resetError, blocked, renderBlockedWarning
        } = this.props;
        const avFlags = call.av;
        const audioLabel = avFlags & Av.Audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */;
        const videoLabel = avFlags & Av.Camera ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */;
        const screenSharingLabel = avFlags & Av.Screen
            ? l[22890] /* `End screen sharing` */
            : l[22889]; /* `Start screen sharing` */
        const callHoldLabel = avFlags & Av.onHold ? l[23459] /* `Resume call` */ : l[23460] /* `Hold call` */;

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
            <>
                {blocked && renderBlockedWarning()}
                <div className={StreamControls.NAMESPACE}>
                    {d ? this.renderDebug() : ''}
                    <ul>
                        <li>
                            <Button
                                simpletip={{ ...this.SIMPLETIP, label: audioLabel }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & Av.onHold ? 'disabled' : ''}
                                    ${avFlags & Av.Audio ? '' : 'inactive'}
                                `}
                                icon={`${avFlags & Av.Audio ? 'icon-audio-filled' : 'icon-audio-off'}`}
                                onClick={() => {
                                    resetError(Av.Audio);
                                    onAudioClick();
                                }}>
                                <span>{audioLabel}</span>
                            </Button>
                            {signal ? null : renderSignalWarning()}
                            {hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null}
                        </li>
                        <li>
                            <Button
                                simpletip={{ ...this.SIMPLETIP, label: videoLabel }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & Av.onHold ? 'disabled' : ''}
                                    ${avFlags & Av.Camera ? '' : 'inactive'}
                                `}
                                icon={`${avFlags & Av.Camera ? 'icon-video-call-filled' : 'icon-video-off'}`}
                                onClick={() => {
                                    resetError(Av.Camera);
                                    onVideoClick();
                                }}>
                                <span>{videoLabel}</span>
                            </Button>
                            {hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null}
                        </li>
                        <li>
                            <Button
                                key="screen-sharing"
                                simpletip={{ ...this.SIMPLETIP, label: screenSharingLabel }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & Av.onHold ? 'disabled' : ''}
                                    ${avFlags & Av.Screen ? 'active' : ''}
                                `}
                                icon={avFlags & Av.Screen ? 'icon-end-screenshare' : 'icon-screen-share'}
                                onClick={() => {
                                    resetError(Av.Screen);
                                    onScreenSharingClick();
                                }}>
                                <span>{screenSharingLabel}</span>
                            </Button>
                            {
                                hasToRenderPermissionsWarning(Av.Screen)
                                    ? renderPermissionsWarning(Av.Screen, this)
                                    : null
                            }
                        </li>
                        <li>
                            <Button
                                key="call-hold"
                                simpletip={{ ...this.SIMPLETIP, label: callHoldLabel }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & Av.onHold ? 'active' : ''}
                                `}
                                icon={avFlags & Av.onHold ? 'icon-play' : 'icon-pause'}
                                onClick={onHoldClick}>
                                <span>{callHoldLabel}</span>
                            </Button>
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
