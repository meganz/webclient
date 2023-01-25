import React from 'react';
import { compose, MegaRenderMixin } from '../../../mixins.js';
import { Avatar } from '../../contacts.jsx';
import Call from '../call.jsx';
import Button from '../button.jsx';
import { withPermissionsObserver } from '../permissionsObserver';

class Preview extends MegaRenderMixin {
    static NAMESPACE = 'preview-meeting';

    static STREAMS = {
        AUDIO: 1,
        VIDEO: 2
    };

    videoRef = React.createRef();
    stream = null;
    avatarMeta = null;

    state = {
        audio: false,
        video: false
    };

    getTrackType = type => !type ? 'getTracks' : type === Preview.STREAMS.AUDIO ? 'getAudioTracks' : 'getVideoTracks';

    startStream = type => {
        // Cleanup previous streams, if any
        this.stopStream();

        const { audio, video } = this.state;
        navigator.mediaDevices.getUserMedia({ audio, video })
            .then(stream => {
                const videoRef = this.videoRef.current;
                if (videoRef) {
                    videoRef.srcObject = stream;
                    this.stream = stream;
                    if (this.props.onToggle) {
                        this.props.onToggle(this.state.audio, this.state.video);
                    }
                }
            })
            .catch(ex => {
                // Unable to start audio/video -> trigger media error, w/o enabling the control
                const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
                this.setState(state => ({ [stream]: !state[stream] }), () => {
                    megaChat.trigger('onLocalMediaError', {
                        [type === Preview.STREAMS.AUDIO ? 'mic' : 'camera']: `${ex.name}: ${ex.message}`
                    });
                    console.error(`${ex.name}: ${ex.message}`);
                });
            });
    };

    stopStream = type => {
        if (this.stream) {
            const trackType = this.getTrackType(type);
            const tracks = this.stream[trackType]();
            for (const track of tracks) {
                track.stop();
            }
        }
    };

    toggleStream = type => {
        const stream = type === Preview.STREAMS.AUDIO ? 'audio' : 'video';
        this.setState(state => ({ [stream]: !state[stream] }), () => {
            if (this.props.onToggle) {
                this.props.onToggle(this.state.audio, this.state.video);
            }
            return this.state[stream] ? this.startStream(type) : this.stopStream(type);
        });
    };

    renderAvatar = () => {
        if (Call.isGuest()) {
            return (
                <div className="avatar-guest">
                    <i className="sprite-fm-uni icon-owner" />
                </div>
            );
        }

        if (is_chatlink) {
            const { avatarUrl, color, shortName } = this.avatarMeta || {};
            return (
                <div
                    className={`
                        avatar-wrapper
                        ${color ? (`color${color}`) : ''}
                    `}>
                    {avatarUrl && <img src={avatarUrl} alt=""/>}
                    {color && <span>{shortName}</span>}
                </div>
            );
        }

        return <Avatar contact={M.u[u_handle]} />;
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        this.stopStream();
    }

    componentDidMount() {
        super.componentDidMount();
        if (this.props.onToggle) {
            this.props.onToggle(this.state.audio, this.state.video);
        }
        this.toggleStream(Preview.STREAMS.AUDIO);
        this.avatarMeta = is_chatlink ? generateAvatarMeta(u_handle) : null;
    }

    render() {
        const { NAMESPACE } = Preview;
        const { hasToRenderPermissionsWarning, renderPermissionsWarning, resetError } = this.props;
        const { audio, video } = this.state;
        const SIMPLETIP_PROPS = { label: undefined, position: 'top', className: 'theme-dark-forced' };

        return (
            <div
                className={`
                    ${NAMESPACE}
                    local-stream-mirrored
                `}>
                {video && <div className={`${NAMESPACE}-video-overlay`} />}
                <video className={video ? 'streaming' : ''} muted={true} autoPlay={true} ref={this.videoRef} />
                {!video && this.renderAvatar()}

                <div className={`${NAMESPACE}-controls`}>
                    <div className="preview-control-wrapper">
                        <Button
                            simpletip={{
                                ...SIMPLETIP_PROPS,
                                label: audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */
                            }}
                            className={`
                                mega-button
                                round
                                large
                                theme-light-forced
                                ${audio ? '' : 'inactive'}
                            `}
                            icon={audio ? 'icon-audio-filled' : 'icon-audio-off'}
                            onClick={() => {
                                resetError(Av.Audio);
                                this.toggleStream(Preview.STREAMS.AUDIO);
                            }}>
                            <span>{audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */}</span>
                        </Button>
                        {hasToRenderPermissionsWarning(Av.Audio) ? renderPermissionsWarning(Av.Audio) : null}
                    </div>
                    <div className="preview-control-wrapper">
                        <Button
                            simpletip={{
                                ...SIMPLETIP_PROPS,
                                label: video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video`*/
                            }}
                            className={`
                                mega-button
                                round
                                large
                                theme-light-forced
                                ${video ? '' : 'inactive'}
                            `}
                            icon={video ? 'icon-video-call-filled' : 'icon-video-off'}
                            onClick={() => this.toggleStream(Preview.STREAMS.VIDEO)}>
                            <span>{video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */}</span>
                        </Button>
                        {hasToRenderPermissionsWarning(Av.Camera) ? renderPermissionsWarning(Av.Camera) : null}
                    </div>
                </div>
            </div>
        );
    }
}

export default compose(withPermissionsObserver)(Preview);
