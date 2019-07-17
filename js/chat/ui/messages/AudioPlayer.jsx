import React from 'react';

class AudioPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentTime: null,
            progressWidth: 0,
            isBeingPlayed: false,
            isPaused: false,
        }

        this.handleOnPlaying = this.handleOnPlaying.bind(this);
        this.handleOnTimeUpdate = this.handleOnTimeUpdate.bind(this);
        this.handleOnEnded = this.handleOnEnded.bind(this);
        this.handleOnPause = this.handleOnPause.bind(this);
        this.handleOnMouseDown = this.handleOnMouseDown.bind(this);
    }

    play(e) {
        const self = this;
        const audio = self.audioEl;

        if (audio.paused) {
            const result = audio.play();
            if (result instanceof Promise) {
                result.catch(e => {
                    console.error(e);
                })
            }

            const audios = document.getElementsByClassName('audio-player__player');

            // Pause all others audio elements
            Array.prototype.filter
            .call(audios, audioElement => audioElement.id !== self.props.audioId)
            .forEach(audioElement => {
                if (!audioElement.paused) {
                    audioElement.pause();
                }
            });

            self.setState({
                isPaused: false
            })
        } else {
            audio.pause();
            self.setState({
                isPaused: true
            })
        }
    }

    handleOnPause(e) {
        this.setState({
            isPaused: true
        })
    }

    handleOnPlaying(e) {
        this.setState((prevState) => {
            return {
                isBeingPlayed: true
            }
        })
    }

    handleOnTimeUpdate(e) {
        const { currentTime, duration } = this.audioEl;
        const percent = (currentTime / duration) * 100;

        this.setState((prevState) => {
            return {
                currentTime: secondsToTimeShort(currentTime),
                progressWidth: percent
            }
        });
    }

    handleOnEnded(e) {
        this.setState((prevState) => {
            return {
                progressWidth: 0,
                isBeingPlayed: false,
                currentTime: 0
            }
        });
    }

    handleOnMouseDown(event) {
        event.preventDefault();
        const self = this;
        const sliderPin = self.sliderPin;
        const slider = self.slider;
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
        
            const newTime = Math.ceil(self.props.playtime * pinPosition)
            const newCurrentTime = secondsToTimeShort(newTime);
            self.audioEl.currentTime = newTime;

            self.setState((prevState) => {
                return {
                    currentTime: newCurrentTime,
                    progressWidth: pinPosition > 1 ? 100 : pinPosition * 100
                }
            });
        }

        function onMouseUp() {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
        }

        sliderPin.ondragstart = () => false;
    }

    render() {
        const self = this;
        const { source, audioId, loading, playtime } = self.props;
        const { progressWidth, isBeingPlayed, isPaused, currentTime } = self.state;

        const progressStyles = {
            width: `${progressWidth}%`,
        }

        let playtimeStyles = null;

        if (isBeingPlayed) {
            playtimeStyles = {
                color: '#EB4444'
            }
        }

        let btnClass = 'audio-player__pause-btn';
        if (!isBeingPlayed || isPaused) {
            btnClass = 'audio-player__play-btn';
        }

        let controls = (
            <span 
                className={btnClass}
                onClick={() => {
                    if (self.props.source === null) {
                        self.props.getAudioFile()
                        .then(() => {self.play()});
                    }
                    else {
                        self.play()
                    }
                }}>
            </span>
        );

        if (loading) {
            controls = (
                <div className="small-blue-spinner audio-player__spinner">
                </div>
            );
        }

        return (
            <div className="audio-player">
                {controls}
                <div className="slider" ref={(slider) => {this.slider = slider;}}>
                    <div className="slider__progress" style={progressStyles}>
                    </div>
                    <div
                        className="slider__progress__pin"
                        style={{left: `${progressWidth}%`}}
                        ref={(sliderPin) => {this.sliderPin = sliderPin;}}
                        onMouseDown={this.handleOnMouseDown}
                    >
                    </div>
                </div>
                <span className="audio-player__time" style={playtimeStyles}>
                    {currentTime ? currentTime : secondsToTimeShort(playtime)}
                </span>
                <audio
                    src={source}
                    className="audio-player__player"
                    onPause={self.handleOnPause}
                    id={audioId}
                    ref={(audio) => {this.audioEl = audio;}}
                    onPlaying={self.handleOnPlaying}
                    onPause={self.handleOnPause}
                    onEnded={self.handleOnEnded}
                    onTimeUpdate={self.handleOnTimeUpdate}
                >
                </audio>
            </div>
        );
    }
}

AudioPlayer.propTypes = {
    source: React.PropTypes.string,
    audioId: React.PropTypes.string.isRequired,
    loading: React.PropTypes.bool.isRequired,
    getAudioFile: React.PropTypes.func.isRequired,
    playtime: React.PropTypes.number.isRequired
}

export default AudioPlayer;