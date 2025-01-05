import React from 'react';
import { MegaRenderMixin } from '../../../../mixins.js';

export default class AudioPlayer extends MegaRenderMixin {
    domRef = React.createRef();

    state = {
        currentTime: null,
        progressWidth: 0,
        isBeingPlayed: false,
        isPaused: false,
    };

    constructor(props) {
        super(props);
        this.handleOnTimeUpdate = this.handleOnTimeUpdate.bind(this);
        this.handleOnMouseDown = this.handleOnMouseDown.bind(this);
    }

    play() {
        const audio = this.audioEl;

        if (audio.paused) {
            const result = audio.play();
            if (result instanceof Promise) {
                result.catch(ex => {
                    // We may get AbortError (in Safari, at least) when the src is changed after play has been issued.
                    if (ex.name !== 'AbortError') {
                        console.error(ex);
                    }
                });
            }

            const audios = document.getElementsByClassName('audio-player__player');

            // Pause all others audio elements
            Array.prototype.filter
                .call(audios, audioElement => audioElement.id !== this.props.audioId)
                .forEach(audioElement => {
                    if (!audioElement.paused) {
                        audioElement.pause();
                    }
                });

            this.setState({
                isPaused: false
            });
        }
        else {
            audio.pause();
            this.setState({
                isPaused: true
            });
        }
    }

    handleOnTimeUpdate() {
        const { currentTime, duration } = this.audioEl;
        const percent = (currentTime / duration) * 100;

        this.setState({
            currentTime: secondsToTimeShort(currentTime),
            progressWidth: percent
        });
    }

    handleOnMouseDown(event) {
        event.preventDefault();

        const { sliderPin, slider } = this;
        const shiftX = event.clientX - sliderPin.getBoundingClientRect().left;

        const onMouseMove = event => {
            let newLeft = event.clientX - shiftX - slider.getBoundingClientRect().left;

            if (newLeft < 0) {
                newLeft = 0;
            }
            const rightEdge = slider.offsetWidth - sliderPin.offsetWidth;
            if (newLeft > rightEdge) {
                newLeft = rightEdge;
            }

            sliderPin.style.left = `${newLeft}px`;

            const pinPosition = newLeft / slider.getBoundingClientRect().width;

            const newTime = Math.ceil(this.props.playtime * pinPosition);
            const newCurrentTime = secondsToTimeShort(newTime);
            this.audioEl.currentTime = newTime;

            this.setState({
                currentTime: newCurrentTime,
                progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
            });
        };

        function onMouseUp() {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        sliderPin.ondragstart = () => false;
    }

    render() {
        const { source, audioId, loading, playtime } = this.props;
        const { progressWidth, isBeingPlayed, isPaused, currentTime } = this.state;

        const progressStyles = {
            width: `${progressWidth}%`,
        };

        let playtimeStyles = null;

        if (isBeingPlayed) {
            playtimeStyles = {
                color: 'var(--secondary-red)'
            };
        }

        let btnClass = 'icon-pause';
        if (!isBeingPlayed || isPaused) {
            btnClass = 'icon-play';
        }

        let controls = (
            <span
                onClick={() => {
                    this.play();
                    if (this.props.source === null) {
                        this.props.getAudioFile();
                    }
                }}>
                <i className={`sprite-fm-mono ${btnClass}`} />
            </span>
        );

        if (loading) {
            controls = <div className="small-blue-spinner audio-player__spinner" />;
        }

        return (
            <div
                ref={this.domRef}
                className="audio-player">
                {controls}
                <div
                    className="slider"
                    ref={(slider) => {
                        this.slider = slider;
                    }}>
                    <div className="slider__progress" style={progressStyles}/>
                    <div
                        className="slider__progress__pin"
                        style={{ left: `${progressWidth}%` }}
                        ref={(sliderPin) => {
                            this.sliderPin = sliderPin;
                        }}
                        onMouseDown={this.handleOnMouseDown}
                    />
                </div>
                <span className="audio-player__time" style={playtimeStyles}>
                    {currentTime || secondsToTimeShort(playtime)}
                </span>
                <audio
                    src={source}
                    className="audio-player__player"
                    id={audioId}
                    ref={(audio) => {
                        this.audioEl = audio;
                    }}
                    onPlaying={() => this.setState({ isBeingPlayed: true })}
                    onPause={() => this.setState({ isPaused: true })}
                    onEnded={() => this.setState({ progressWidth: 0, isBeingPlayed: false, currentTime: 0 })}
                    onTimeUpdate={this.handleOnTimeUpdate}
                />
            </div>
        );
    }
}
