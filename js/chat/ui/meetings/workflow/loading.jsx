import React from 'react';
import { MegaRenderMixin } from '../../../mixins';

export default class Loading extends MegaRenderMixin {
    static NAMESPACE = 'meetings-loading';

    PERMISSIONS = {
        VIDEO: 'camera',
        AUDIO: 'microphone'
    };

    state = {
        pendingPermissions: false
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        megaChat.unbind(`onLocalMediaQueryError.${Loading.NAMESPACE}`);
    }

    componentDidMount() {
        super.componentDidMount();
        // Close dropdown elements, popups
        document.dispatchEvent(new Event('closeDropdowns'));
        closeDialog?.();
        notify?.closePopup();
        alarm?.hideAllWarningPopups();
        document.querySelectorAll('.js-dropdown-account').forEach(({ classList }) =>
            classList.contains('show') && classList.remove('show')
        );

        // --

        const { chatRoom } = this.props;
        const { audio, video } = chatRoom.meetingsLoading;
        const isAudioCall = audio && !video;
        const isVideoCall = audio && video;

        // Audio call: query only for the `microphone` permissions state
        if (isAudioCall) {
            this.queryPermissions(this.PERMISSIONS.AUDIO);
        }

        // Call with audio and video: query both `microphone` and `camera` permissions state. Note, the
        // permissions are being prompted for in this specific order
        if (isVideoCall) {
            Object.values(this.PERMISSIONS).forEach(name => this.queryPermissions(name));
        }

        // Assuming audio call, query the `camera` permissions after dismissing
        // the permissions prompt for `microphone`
        megaChat.rebind(`onLocalMediaQueryError.${Loading.NAMESPACE}`, (ev, { type, err }) => {
            if (isVideoCall && type === 'mic' && String(err).includes('dismissed')) {
                this.queryPermissions(this.PERMISSIONS.VIDEO);
            }
        });
    }

    queryPermissions = name => {
        navigator.permissions.query({ name })
            .then(status => {
                const { name, state } = status;

                // Query the permissions status again
                // after accepting or declining the current prompt
                status.onchange = () => name === 'audio_capture' && this.queryPermissions(this.PERMISSIONS.VIDEO);

                if (state === 'prompt') {
                    return this.isMounted() && this.setState({ pendingPermissions: name });
                }
            })
            .catch(ex => console.warn(`Failed to get permissions state: ${ex}`));
    };

    renderLoading = () => {
        return (
            <>
                <span>
                    <i className="sprite-fm-mono icon-video-call-filled" />
                </span>
                <h3>{this.props.title || l.starting /* `Starting` */}</h3>
                <div className="loading-container">
                    <div className="loading-indication" />
                </div>
            </>
        );
    };

    renderDebug = () => {
        const { chatRoom } = this.props;
        if (chatRoom && chatRoom.call) {
            return (
                <div className={`${Loading.NAMESPACE}-debug`}>
                    <div>callId: {chatRoom.call.callId}</div>
                    <div>roomId: {chatRoom.roomId}</div>
                    <div>isMeeting: {chatRoom.isMeeting ? 'true' : 'false'}</div>
                </div>
            );
        }
    };

    render() {
        const { pendingPermissions } = this.state;

        return (
            <div className={Loading.NAMESPACE}>
                <div className={`${Loading.NAMESPACE}-content`}>
                    {pendingPermissions ?
                        <h2>
                            {pendingPermissions === 'audio_capture' ?
                                l.permissions_allow_mic :
                                l.permissions_allow_camera
                            }
                        </h2> :
                        this.renderLoading()
                    }
                </div>
                {d ? this.renderDebug() : ''}
            </div>
        );
    }
}
