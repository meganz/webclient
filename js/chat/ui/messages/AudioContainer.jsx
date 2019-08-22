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
        const { mime, h } = this.props;
        let blobUrl = null;

        self.setState({
            loading: true
        });

        if (mime === 'audio/mp4') {
            blobUrl =  new Promise((resolve, reject) => {

                M.gfsfetch(h, 0, -1, null).done(function(data) {
                    resolve({
                        buffer: data.buffer,
                    });
                }).fail((e) => {reject(e)})
            })
            .then(({ buffer }) => {
                const uint8Array  = new Uint8Array(buffer);
                const arrayBuffer = uint8Array.buffer;

                    self.setState((prevState) => {
                        return {
                            audioBlobUrl: mObjectURL([arrayBuffer], 'audio/mp4'),
                            loading: false
                        }
                    });
            }).catch((e) => {
                console.error(e);
            });
        }

        return blobUrl;
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
