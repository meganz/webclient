import React from 'react';

export default class AudioPlayer extends React.Component {
    state = {
        currentTime: null,
        progressWidth: 0,
        isBeingPlayed: false,
        isPaused: false,
    };

    constructor(props) {
        super(props);
    }

    play = () => {
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
    };

    handleOnPause = () => this.setState({ isPaused: true });

    handleOnPlaying = () => this.setState({ isBeingPlayed: true });

    handleOnTimeUpdate = () => {
        const { currentTime, duration } = this.audioEl;
        const percent = (currentTime / duration) * 100;

        this.setState({
            currentTime: secondsToTimeShort(currentTime),
            progressWidth: percent
        });
    }

    handleOnEnded = () => this.setState({ progressWidth: 0, isBeingPlayed: false, currentTime: 0 });

    handleOnMouseDown = event => {
        event.preventDefault();

        const self = this;
        const sliderPin = this.sliderPin;
        const slider = this.slider;
        const shiftX = event.clientX - sliderPin.getBoundingClientRect().left;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        function onMouseMove(event) {
            let newLeft = event.clientX - shiftX - slider.getBoundingClientRect().left;

            if (newLeft < 0) {
                newLeft = 0;
            }
            let rightEdge = slider.offsetWidth - sliderPin.offsetWidth;
            if (newLeft > rightEdge) {
                newLeft = rightEdge;
            }

            sliderPin.style.left = `${newLeft}px`;

            const pinPosition = newLeft / slider.getBoundingClientRect().width;

            const newTime = Math.ceil(self.props.playtime * pinPosition);
            const newCurrentTime = secondsToTimeShort(newTime);
            self.audioEl.currentTime = newTime;

            self.setState({
                currentTime: newCurrentTime,
                progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
            });
        }

        function onMouseUp() {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
        }

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
                color: '#EB4444'
            };
        }

        let btnClass = 'audio-player__pause-btn';
        if (!isBeingPlayed || isPaused) {
            btnClass = 'audio-player__play-btn';
        }

        let controls = (
            <span
                className={btnClass}
                onClick={() => {
                    this.play();
                    if (this.props.source === null) {
                        this.props.getAudioFile();
                    }
                }}>
            </span>
        );

        if (loading) {
            controls = <div className="small-blue-spinner audio-player__spinner" />;
        }

        return (
            <div className="audio-player">
                {controls}
                <div className="slider" ref={(slider) => {
                    this.slider = slider;
                }}>
                    <div className="slider__progress" style={progressStyles} />
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
                    {currentTime ? currentTime : secondsToTimeShort(playtime)}
                </span>
                <audio
                    src={source}
                    className="audio-player__player"
                    id={audioId}
                    ref={(audio) => {
                        this.audioEl = audio;
                    }}
                    onPlaying={this.handleOnPlaying}
                    onPause={this.handleOnPause}
                    onEnded={this.handleOnEnded}
                    onTimeUpdate={this.handleOnTimeUpdate}
                >
                </audio>
            </div>
        );
    }
}
