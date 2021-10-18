import React from 'react';
import { MegaRenderMixin } from '../../../../stores/mixins';
import { Avatar } from '../../contacts.jsx';
import Call from '../call.jsx';
import Button from '../button.jsx';

export default class Preview extends MegaRenderMixin {
    static NAMESPACE = 'preview-meeting';

    static STREAMS = {
        AUDIO: 1,
        VIDEO: 2
    };

    videoRef = React.createRef();
    stream = null;

    state = {
        audio: false,
        video: false
    };

    constructor(props) {
        super(props);
    }

    getTrackType = type => !type ? 'getTracks' : type === Preview.STREAMS.AUDIO ? 'getAudioTracks' : 'getVideoTracks';

    startStream = () => {
        // cleanup previous streams, if any
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
            .catch(ex => console.error(ex.name + ": " + ex.message));
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
        if (Call.isGuest() || is_chatlink) {
            return (
                <div className="avatar-guest">
                    <i className="sprite-fm-uni icon-owner" />
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
    }

    render() {
        const { NAMESPACE } = Preview;
        const { audio, video } = this.state;
        const SIMPLETIP_PROPS = { label: undefined, position: 'top', className: 'theme-dark-forced' };

        return (
            <div className={NAMESPACE}>
                {video && <div className={`${NAMESPACE}-video-overlay`} />}
                <video className={video ? 'streaming' : ''} muted={true} autoPlay={true} ref={this.videoRef} />
                {!video && this.renderAvatar()}

                <div className={`${NAMESPACE}-controls`}>
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
                        onClick={() => this.toggleStream(Preview.STREAMS.AUDIO)}>
                        <span>{audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */}</span>
                    </Button>
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
                </div>
            </div>
        );
    }
}
