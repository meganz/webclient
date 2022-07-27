import React from 'react';
import { compose, MegaRenderMixin } from '../../mixins';
import Button from './button.jsx';
import { STREAM_ACTIONS } from './stream.jsx';
import StreamExtendedControls from './streamExtendedControls.jsx';
import { withMicObserver } from './micObserver.jsx';
import { withPermissionsObserver } from './permissionsObserver.jsx';
import Call from './call.jsx';

class StreamControls extends MegaRenderMixin {
    static NAMESPACE = 'stream-controls';

    endContainerRef = React.createRef();
    endButtonRef = React.createRef();
    SIMPLETIP = { position: 'top', offset: 8, className: 'theme-dark-forced' };

    state = {
        options: false
    };

    handleMousedown = ({ target }) =>
        this.endContainerRef?.current.contains(target) ? null : this.setState({ options: false });

    renderDebug = () => {
        return (
            <div
                className="stream-debug"
                style={{ position: 'absolute', left: 25, bottom: 36 }}>
                <Button
                    className="mega-button round small theme-dark-forced positive"
                    simpletip={{ ...this.SIMPLETIP, label: l.add_stream }}
                    onClick={() => this.props.onStreamToggle(STREAM_ACTIONS.ADD)}>
                    <span>{l.add}</span>
                </Button>
                <Button
                    className="mega-button round small theme-dark-forced negative"
                    simpletip={{ ...this.SIMPLETIP, label: l.remove_stream }}
                    onClick={() => this.props.streams.length > 1 && this.props.onStreamToggle(STREAM_ACTIONS.REMOVE)}>
                    <span>{l[83]}</span>
                </Button>
            </div>
        );
    };

    renderEndCall = () => {
        const { chatRoom, streams, onCallEnd } = this.props;
        return (
            <div
                ref={this.endContainerRef}
                className="end-call-container">
                {this.state.options && (
                    <div className="end-options theme-dark-forced">
                        <div className="end-options-content">
                            <Button
                                className="mega-button"
                                onClick={onCallEnd}>
                                <span>{l.leave}</span>
                            </Button>
                            <Button
                                className="mega-button positive"
                                onClick={() => chatRoom.endCallForAll()}>
                                <span>{l.end_for_all}</span>
                            </Button>
                        </div>
                    </div>
                )}
                <Button
                    simpletip={{ ...this.SIMPLETIP, label: l[5884] /* `End call` */ }}
                    className="mega-button theme-dark-forced round large negative end-call"
                    icon="icon-end-call"
                    didMount={button => {
                        this.endButtonRef = button.buttonRef;
                    }}
                    onClick={() =>
                        chatRoom.type !== 'private' && streams.length && Call.isModerator(chatRoom, u_handle) ?
                            this.setState(state => ({ options: !state.options }), () =>
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
            call, signal, errAv, onAudioClick, onVideoClick, onScreenSharingClick, onHoldClick, renderSignalWarning,
            renderPermissionsWarning
        } = this.props;
        const avFlags = call.av;
        const audioLabel = avFlags & Av.Audio ? l[16214] /* `Mute` */ : l[16708] /* `Unmute` */;
        const videoLabel = avFlags & Av.Camera ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */;

        //
        // `StreamControls`
        // -------------------------------------------------------------------------

        return (
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
                            onClick={onAudioClick}>
                            <span>{audioLabel}</span>
                        </Button>
                        {signal ? null : renderSignalWarning()}
                        {errAv & Av.Audio ? renderPermissionsWarning(Av.Audio) : null}
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
                            onClick={onVideoClick}>
                            <span>{videoLabel}</span>
                        </Button>
                        {errAv & Av.Camera ? renderPermissionsWarning(Av.Camera) : null}
                    </li>
                    <li>
                        <StreamExtendedControls
                            call={call}
                            onScreenSharingClick={onScreenSharingClick}
                            onHoldClick={onHoldClick}
                        />
                    </li>
                    <li>
                        {this.renderEndCall()}
                    </li>
                </ul>
            </div>
        );
    }
}

export default compose(withMicObserver, withPermissionsObserver)(StreamControls);
