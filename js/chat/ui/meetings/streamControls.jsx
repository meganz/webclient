import React from 'react';
import { MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import StreamExtendedControls from './streamExtendedControls.jsx';
import { withMicObserver } from './micObserver.jsx';

class StreamControls extends MegaRenderMixin {
    static NAMESPACE = 'stream-controls';

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
        const SIMPLETIP = { position: 'top', offset: 8, className: 'theme-dark-forced' };

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
            <div className={StreamControls.NAMESPACE}>
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
                                ${avFlags & SfuClient.Av.onHold ? 'disabled' : ''}
                                ${avFlags & SfuClient.Av.Audio ? '' : 'inactive'}
                            `}
                            icon={`${avFlags & SfuClient.Av.Audio ? 'icon-audio-filled' : 'icon-audio-off'}`}
                            onClick={this.props.onAudioClick}>
                            <span>{audioLabel}</span>
                        </Button>
                        {this.props.signal ? null : this.props.renderSignalWarning()}
                    </li>
                    <li>
                        <Button
                            simpletip={{ ...SIMPLETIP, label: videoLabel }}
                            className={`
                                mega-button
                                theme-light-forced
                                round
                                large
                                ${avFlags & SfuClient.Av.onHold ? 'disabled' : ''}
                                ${avFlags & SfuClient.Av.Camera ? '' : 'inactive'}
                            `}
                            icon={`${avFlags & SfuClient.Av.Camera ? 'icon-video-call-filled' : 'icon-video-off'}`}
                            onClick={this.props.onVideoClick}>
                            <span>{videoLabel}</span>
                        </Button>
                    </li>
                    <li>
                        <StreamExtendedControls
                            call={this.props.call}
                            onScreenSharingClick={this.props.onScreenSharingClick}
                            onHoldClick={this.props.onHoldClick}
                        />
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

export default withMicObserver(StreamControls);
