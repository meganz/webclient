import React from 'react';
import AudioPlayer from './audioPlayer.jsx';
import { MegaRenderMixin } from '../../../../mixins.js';

export default class AudioContainer extends MegaRenderMixin {
    state = {
        audioBlobUrl: null,
        loading: false
    };

    constructor(props) {
        super(props);
        this.getAudioFile = this.getAudioFile.bind(this);
    }

    getAudioFile() {
        const { mime, h } = this.props;

        this.setState({
            loading: true
        });

        if (mime !== 'audio/mp4') {
            if (d) {
                console.warn('cannot play this file type (%s)', mime, h, [this]);
            }
            return false;
        }

        M.gfsfetch(h, 0, -1)
            .then(({ buffer }) => {
                this.setState(() => {
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

    componentWillUnmount() {
        if (super.componentWillUnmount) {
            super.componentWillUnmount();
        }
        URL.revokeObjectURL(this.state.audioBlobUrl);
    }

    render() {
        const { audioBlobUrl, loading } = this.state;
        const { playtime, mime, audioId } = this.props;

        return (
            <div className="audio-container">
                <AudioPlayer
                    source={audioBlobUrl}
                    audioId={audioId}
                    loading={loading}
                    mime={mime}
                    getAudioFile={this.getAudioFile}
                    playtime={playtime}
                />
            </div>
        );
    }
}

AudioContainer.defaultProps = {
    h: null,
    mime: null,
};
