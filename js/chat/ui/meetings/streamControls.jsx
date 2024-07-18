import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import { withMicObserver } from './micObserver.jsx';
import { withPermissionsObserver } from './permissionsObserver.jsx';
import Call from './call.jsx';
import { withHostsObserver } from './hostsObserver.jsx';
import { Dropdown, DropdownItem } from "../../../ui/dropdowns.jsx";

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
        endCallPending: false,
        devices: {},
        audioSelectDropdown: false,
        videoSelectDropdown: false,
        loading: false
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

    setActiveElement = () =>
        this.props.setActiveElement(
            this.state.audioSelectDropdown || this.state.videoSelectDropdown || this.state.endCallOptions
        );

    handleMousedown = ({ target }) => {
        if (!this.isMounted()) {
            return;
        }
        const state = {};
        const { audioSelectDropdown, videoSelectDropdown } = this.state;
        const $target = $(target);
        const isOpenerParent = (audioSelectDropdown || videoSelectDropdown) &&
            $target.parents('.input-source-opener').length;
        if (audioSelectDropdown && $target.parents('.audio-sources').length === 0 && !isOpenerParent) {
            state.audioSelectDropdown = false;
        }
        if (videoSelectDropdown && $target.parents('.video-sources').length === 0 && !isOpenerParent) {
            state.videoSelectDropdown = false;
        }
        if (!(this.endContainerRef && this.endContainerRef.current && this.endContainerRef.current.contains(target))) {
            state.endCallOptions = false;
        }
        this.setState(state, this.setActiveElement);
    };

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
                            this.setState(state => ({ endCallOptions: !state.endCallOptions }), () => {
                                if (this.endButtonRef) {
                                    $(this.endButtonRef.current).trigger('simpletipClose');
                                }
                                this.setActiveElement();
                            })
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
                    className="mega-button theme-dark-forced round negative end-call call-action"
                    icon="icon-phone-02"
                    didMount={button => {
                        this.endButtonRef = button.buttonRef;
                    }}
                />
                <span>{l.end_button /* `End` */}</span>
            </div>
        );
    };

    renderSoundDropdown() {
        const { call } = this.props;
        const { micDeviceId, audioOutDeviceId } = SfuClient;
        const { audioIn = {}, audioOut = {} } = this.state.devices;
        let selectedIn;
        // For selected devices
        // 1) Check the current active devices
        // 2) Otherwise check if there is a previously selected device
        // 3) Otherwise use the default device label.
        const inTrack = call.sfuClient.localAudioTrack();
        if (inTrack) {
            const { deviceId } = inTrack.getCapabilities();
            selectedIn = deviceId in audioIn ? deviceId : 'default';
            if (deviceId === 'default' && inTrack.label !== audioIn.default) {
                this.micDefaultRenamed = inTrack.label;
            }
        }
        else if (micDeviceId) {
            selectedIn = micDeviceId in audioIn ? micDeviceId : 'default';
        }
        else {
            selectedIn = 'default';
        }
        if (this.micDefaultRenamed) {
            audioIn.default = this.micDefaultRenamed;
        }
        let selectedOut;
        let peerPlayer;
        if (call.sfuClient.peers.size) {
            peerPlayer = call.sfuClient.peers.values().next().audioPlayer;
        }
        if (peerPlayer && peerPlayer.playerElem && peerPlayer.playerElem.sinkId) {
            const { sinkId } = peerPlayer.playerElem;
            selectedOut = sinkId in audioOut ? sinkId : 'default';
        }
        else if (audioOutDeviceId) {
            selectedOut = audioOutDeviceId in audioOut ? audioOutDeviceId : 'default';
        }
        else {
            selectedOut = 'default';
        }

        const mics = Object.entries(audioIn).map(([id, name]) => {
            return <DropdownItem
                key={id}
                onClick={() => {
                    call.sfuClient.setMicDevice(id === 'default' ? null : id);
                    this.setState({ audioSelectDropdown: false }, this.setActiveElement);
                }}>
                <>
                    <div className="av-device-name">{name}</div>
                    {selectedIn === id &&
                        <i className="sprite-fm-mono icon-check-small-regular-outline"/>}
                </>
            </DropdownItem>;
        });
        const speakers = Object.entries(audioOut).map(([id, name]) => {
            return <DropdownItem
                key={id}
                onClick={() => {
                    Promise.resolve(call.sfuClient.setAudioOutDevice(id === 'default' ? null : id)).catch(dump);
                    this.setState({ audioSelectDropdown: false }, this.setActiveElement);
                }}>
                <>
                    <div className="av-device-name">{name}</div>
                    {selectedOut === id &&
                        <i className="sprite-fm-mono icon-check-small-regular-outline"/>}
                </>
            </DropdownItem>;
        });

        return <Dropdown
            className="input-sources audio-sources theme-dark-forced"
            active={true}
            noArrow={true}
            positionMy="center top"
            positionAt="center bottom"
            horizOffset={-50}
            vertOffset={16}
            closeDropdown={() => this.setState({ audioSelectDropdown: false }, this.setActiveElement)}>
            <div className="source-label">{l.microphone}</div>
            {mics.length ? mics : <DropdownItem label={l.no_mics}/>}
            <hr/>
            <div className="source-label">{l.speaker}</div>
            {speakers.length ? speakers : <DropdownItem label={l.no_speakers}/>}
            <hr/>
            <DropdownItem
                icon="sprite-fm-mono icon-volume-max-small-regular-outline"
                label={l.test_speaker}
                disabled={speakers.length === 0}
                onClick={() => {
                    delay('call-test-speaker', () => {
                        this.testAudioOut().catch(ex => {
                            console.error('Failed to test audio on the selected device', ex, audioOutDeviceId);
                        });
                    });
                }}
            />
        </Dropdown>;
    }

    renderVideoDropdown() {
        const { call } = this.props;
        const { videoIn = {} } = this.state.devices;
        const { camDeviceId } = SfuClient;
        let selectedCam;
        if (call.sfuClient.localCameraTrack()) {
            const { deviceId } = call.sfuClient.localCameraTrack().getCapabilities();
            selectedCam = deviceId in videoIn ? deviceId : 'default';
        }
        else if (camDeviceId) {
            selectedCam = camDeviceId in videoIn ? camDeviceId : 'default';
        }
        else {
            selectedCam = 'default';
        }
        const cameras = Object.entries(videoIn).map(([id, name]) => {
            return <DropdownItem
                key={id}
                onClick={() => {
                    call.sfuClient.setCameraDevice(id === 'default' ? null : id);
                    this.setState({ videoSelectDropdown: false }, this.setActiveElement);
                }}>
                <>
                    <div className="av-device-name">{name}</div>
                    {selectedCam === id &&
                        <i className="sprite-fm-mono icon-check-small-regular-outline"/>}
                </>
            </DropdownItem>;
        });

        return <Dropdown
            className="input-sources video-sources theme-dark-forced"
            active={true}
            noArrow={true}
            positionMy="center top"
            positionAt="center bottom"
            horizOffset={-50}
            vertOffset={16}
            closeDropdown={() => this.setState({ videoSelectDropdown: false }, this.setActiveElement)}>
            <div className="source-label">{l.camera_button}</div>
            {cameras.length ? cameras : <DropdownItem label={l.no_cameras}/>}
        </Dropdown>;
    }

    renderSourceOpener = ({ type, eventId }) => {
        return (
            <div
                className={`
                    input-source-opener
                    button
                    ${this.state[type] ? 'active-dropdown' : ''}
                `}
                onClick={async ev => {
                    ev.stopPropagation();
                    this.setState(
                        () => ({ loading: true }),
                        async() => {
                            const devices = await this.updateMediaDevices();
                            const updated = JSON.stringify(devices) !== JSON.stringify(this.state.devices);
                            this.setState(
                                state => ({
                                    loading: false,
                                    audioSelectDropdown: false,
                                    videoSelectDropdown: false,
                                    devices: updated ? devices : this.state.devices,
                                    [type]: !state[type]
                                }),
                                () => {
                                    const { audioSelectDropdown, videoSelectDropdown } = this.state;
                                    this.props.setActiveElement(audioSelectDropdown || videoSelectDropdown);
                                    eventlog(eventId);
                                }
                            );
                        }
                    );
                }}>
                <i className="sprite-fm-mono icon-arrow-up" />
            </div>
        );
    };

    async updateMediaDevices() {
        let devices = await SfuClient.enumMediaDevices().catch(dump);
        devices = devices || {
            audioIn: {},
            audioOut: {},
            videoIn: {},
        };
        const removeEmptyDevices = (devices) => {
            for (const key of Object.keys(devices)) {
                if (!key || !devices[key]) {
                    delete devices[key];
                }
            }
        };
        removeEmptyDevices(devices.audioIn);
        removeEmptyDevices(devices.audioOut);
        removeEmptyDevices(devices.videoIn);
        if (devices.audioIn.communications) {
            delete devices.audioIn.communications;
        }
        return devices;
    }

    async testAudioOut() {
        if (!SfuClient.audioOutDeviceId) {
            return megaChat.playSound(megaChat.SOUNDS.SPEAKER_TEST);
        }
        const currentDevices = await this.updateMediaDevices();
        if (
            currentDevices.audioOut && !(SfuClient.audioOutDeviceId in currentDevices.audioOut)
        ) {
            return megaChat.playSound(megaChat.SOUNDS.SPEAKER_TEST);
        }
        // eslint-disable-next-line compat/compat -- Redefined in secureboot
        const ctx = new AudioContext({ sinkId: SfuClient.audioOutDeviceId });
        if (ctx.state !== 'running') {
            throw new Error('The audio context failed to start');
        }
        const soundBuffer = await megaChat.fetchSoundBuffer(megaChat.SOUNDS.SPEAKER_TEST);
        const buffer = await ctx.decodeAudioData(soundBuffer);
        const gain = ctx.createGain();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.07;
        source.start();
    }

    handleDeviceChange = () => {
        this.micDefaultRenamed = false;
        this.updateMediaDevices().always(devices => {
            if (!this.isMounted()) {
                return;
            }
            const { devices: oldDevices } = this.state;
            const { sfuClient, av } = this.props.call;
            // Handle the case where the default device label has changed but the track doesn't match
            if (
                (av & Av.Audio) &&
                !SfuClient.micDeviceId &&
                sfuClient.localAudioTrack()?.getCapabilities().deviceId === 'default' &&
                oldDevices?.audioIn?.default &&
                devices.audioIn.default &&
                oldDevices.audioIn.default !== devices.audioIn.default
            ) {
                for (const [key, value] of Object.entries(devices.audioIn)) {
                    if (key !== 'default' && devices.audioIn.default.indexOf(value) > -1) {
                        sfuClient.setMicDevice(key).then(() => SfuClient.persistMicDevice(null));
                        break;
                    }
                }
            }
            this.setState({ devices, audioSelectDropdown: false, videoSelectDropdown: false }, this.setActiveElement);
        });
    };

    renderOnboardingRaise = () => {
        const { chatRoom, onOnboardingRaiseDismiss } = this.props;

        return (
            <div className="meetings-call-onboarding">
                <div
                    className="mega-dialog mega-onboarding-dialog dialog-template-message onboarding-raise"
                    id="ob-dialog"
                    role="dialog"
                    aria-labelledby="ob-dialog-title"
                    aria-modal="true">
                    <i
                        className="sprite-fm-mono icon-tooltip-arrow tooltip-arrow bottom" id="ob-dialog-arrow"
                    />
                    <header>
                        <div>
                            <h2 id="ob-dialog-title">{l.raise_onboarding_title}</h2>
                            <p id="ob-dialog-text">
                                {chatRoom.isMeeting ? l.raise_onboarding_body : l.raise_onboarding_group_body}
                            </p>
                        </div>
                    </header>
                    <footer>
                        <div className="footer-container">
                            <button
                                className="mega-button js-next small theme-light-forced"
                                onClick={onOnboardingRaiseDismiss}>
                                <span>{l.ok_button /* `OK, got it` */}</span>
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        );
    };

    renderRaiseButton = () => {
        const { call, raisedHandPeers, onboardingRaise } = this.props;
        const isOnHold = call.av & Av.onHold;
        const hasRaisedHand = raisedHandPeers.includes(u_handle);

        return (
            <li className={isOnHold ? 'disabled' : ''}>
                {onboardingRaise && this.renderOnboardingRaise()}
                <Button
                    className={`
                        mega-button
                        theme-light-forced
                        call-action
                        round
                        ${isOnHold ? 'disabled' : ''}
                        ${hasRaisedHand ? 'with-fill' : ''}
                    `}
                    icon="icon-raise-hand"
                    onClick={
                        isOnHold ? null : () => {
                            if (hasRaisedHand) {
                                call.sfuClient.lowerHand();
                                eventlog(500311);
                                return;
                            }
                            call.sfuClient.raiseHand();
                            eventlog(500249);
                        }
                    }
                />
                <span>{l.raise_button /* `Raise` */}</span>
            </li>
        );
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('mousedown', this.handleMousedown);
        navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('mousedown', this.handleMousedown);
        navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    }

    render() {
        const {
            call, signal, chatRoom, renderSignalWarning, hasToRenderPermissionsWarning, renderPermissionsWarning,
            resetError, blocked, renderBlockedWarning, onAudioClick, onVideoClick, onScreenSharingClick, onHoldClick
        } = this.props;
        const { audioSelectDropdown, videoSelectDropdown } = this.state;
        const avFlags = call.av;
        const isOnHold = avFlags & Av.onHold;

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
            <>
                {blocked && renderBlockedWarning()}
                <div
                    className={StreamControls.NAMESPACE}>
                    {d && localStorage.callDebug ? this.renderDebug() : ''}
                    <ul>
                        <li
                            className={`
                                ${isOnHold ? 'disabled' : ''}
                                with-input-selector
                            `}
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
                            {this.renderSourceOpener({
                                type: 'audioSelectDropdown',
                                eventId: chatRoom.isMeeting ? 500299 : 500300
                            })}
                        </li>
                        {audioSelectDropdown && this.renderSoundDropdown()}
                        <li
                            className={`
                                ${isOnHold ? 'disabled' : ''}
                                with-input-selector
                            `}
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
                            {this.renderSourceOpener({
                                type: 'videoSelectDropdown',
                                eventId: chatRoom.isMeeting ? 500301 : 500302
                            })}
                        </li>
                        {videoSelectDropdown && this.renderVideoDropdown()}
                        <li
                            className={isOnHold ? 'disabled' : ''}
                            onClick={() => {
                                if (isOnHold) {
                                    return;
                                }
                                resetError(Av.Screen);
                                onScreenSharingClick();
                                if (chatRoom.isMeeting) {
                                    eventlog(500303);
                                }
                                else {
                                    eventlog(500304);
                                }
                            }}>
                            <Button
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
                        {chatRoom.type === 'private' ? null : this.renderRaiseButton()}
                        <li onClick={onHoldClick}>
                            <Button
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
