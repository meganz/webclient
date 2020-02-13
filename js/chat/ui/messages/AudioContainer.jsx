import React from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import PropTypes from 'prop-types';

class AudioContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            audioBlobUrl: null,
            loading: false
        }

        this.getAudioFile = this.getAudioFile.bind(this);
    }

    getAudioFile() {
        const self = this;
        const {mime, h} = this.props;

        self.setState({
            loading: true
        });

        if (mime !== 'audio/mp4') {
            if (d) {
                console.warn('cannot play this file type (%s)', mime, h, [self]);
            }
            return false;
        }

        M.gfsfetch(h, 0, -1)
            .then(({buffer}) => {
                self.setState(() => {
                    return {
                        audioBlobUrl: mObjectURL([buffer], 'audio/mp4'),
                        loading: false
                    };
                });
            })
            .catch((ex) => {
                console.error(ex);
            });

        return true;
    }

    render() {
        const self = this;
        const { audioBlobUrl, loading } = self.state;
        const { playtime, mime} = self.props;

        return (
            <div className="audio-container">
                <AudioPlayer
                    source={(audioBlobUrl ? audioBlobUrl : null)}
                    audioId={self.props.audioId}
                    loading={loading}
                    mime={mime}
                    getAudioFile={self.getAudioFile}
                    playtime={playtime}
                />
            </div>
        );
    }
}

AudioContainer.propTypes = {
    h: PropTypes.string.isRequired,
    mime: PropTypes.string.isRequired,
}

AudioContainer.defaultProps = {
    h: null,
    mime: null,
}

export default AudioContainer;
