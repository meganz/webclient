import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import Call from './call.jsx';

export default class StreamControls extends MegaRenderMixin {
    constructor(props) {
        super(props);
    }

    renderDebug = () => {
        const SIMPLETIP = { position: 'top', offset: 5, className: 'theme-dark-forced' };
        return (
            <div
                className="stream-debug"
                style={{ position: 'absolute', left: 25, bottom: 36 }}>
                <Button
                    className="mega-button round small theme-dark-forced positive"
                    simpletip={{ ...SIMPLETIP, label: 'Add stream' }}
                    onClick={() => this.props.onStreamToggle(STREAM_ACTIONS.ADD)}>
                    <span>Add</span>
                </Button>
                <Button
                    className="mega-button round small theme-dark-forced negative"
                    simpletip={{ ...SIMPLETIP, label: 'Remove stream' }}
                    onClick={() => this.props.streams.length > 1 && this.props.onStreamToggle(STREAM_ACTIONS.REMOVE)}>
                    <span>Remove</span>
                </Button>
            </div>
        );
    };

    render() {
        const avFlags = this.props.call.av;
        const audioLabel = avFlags & SfuClient.Av.Audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */;
        const videoLabel =
            avFlags & SfuClient.Av.Camera ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */;
        const screenSharingLabel =
            avFlags & SfuClient.Av.Screen ? l[22890] /* `End screen sharing` */ : l[22889] /* `Start screen sharing` */;
        const callHoldLabel = avFlags & SfuClient.Av.onHold ? l[23459] /* `Resume call` */ : l[23460] /* `Hold call` */;
        const SIMPLETIP = { position: 'top', offset: 8, className: 'theme-dark-forced' };

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
            <div className="stream-controls">
                {d ? this.renderDebug() : ''}
                <ul>
                    <li>
                        <Button
                            simpletip={{ ...SIMPLETIP, label: audioLabel }}
                            className={`
                                mega-button
                                theme-light-forced
                                round
                                large
                                ${avFlags & SfuClient.Av.Audio ? '' : 'inactive'}
                            `}
                            icon={`${avFlags & SfuClient.Av.Audio ? 'icon-audio-filled' : 'icon-audio-off'}`}
                            onClick={this.props.onAudioClick}>
                            <span>{audioLabel}</span>
                        </Button>
                    </li>
                    <li>
                        <Button
                            simpletip={{ ...SIMPLETIP, label: videoLabel }}
                            className={`
                                mega-button
                                theme-light-forced
                                round
                                large
                                ${avFlags & SfuClient.Av.Camera ? '' : 'inactive'}
                            `}
                            icon={`${avFlags & SfuClient.Av.Camera ? 'icon-video-call-filled' : 'icon-video-off'}`}
                            onClick={this.props.onVideoClick}>
                            <span>{videoLabel}</span>
                        </Button>
                    </li>
                    <li>
                        <Button.Group active={!!(avFlags & SfuClient.Av.Screen)}>
                            <Button
                                simpletip={{ ...SIMPLETIP, label: screenSharingLabel }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & SfuClient.Av.Screen ? 'active' : ''}
                                `}
                                icon={`
                                    ${avFlags & SfuClient.Av.Screen ? 'icon-end-screenshare' : 'icon-screen-share'}
                                `}
                                onClick={this.props.onScreenSharingClick}>
                                <span>{screenSharingLabel}</span>
                            </Button>
                            <Button
                                simpletip={{ ...SIMPLETIP, label: callHoldLabel, position: 'left' }}
                                className={`
                                    mega-button
                                    theme-light-forced
                                    round
                                    large
                                    ${avFlags & SfuClient.Av.onHold ? 'active' : ''}
                                `}
                                icon={avFlags & SfuClient.Av.onHold ? "icon-play" : "icon-pause"}
                                onClick={this.props.onHoldClick}>
                                <span>{callHoldLabel}</span>
                            </Button>
                        </Button.Group>
                    </li>
                    <li>
                        <Button
                            simpletip={{ ...SIMPLETIP, label: l[5884] /* `End call` */ }}
                            className="mega-button theme-dark-forced round large negative end-call"
                            icon="icon-end-call"
                            onClick={this.props.onCallEnd}>
                            <span>
                                {l[5884] /* `End call` */}
                            </span>
                        </Button>
                    </li>
                </ul>
            </div>
        );
    }
}
