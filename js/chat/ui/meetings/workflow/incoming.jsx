import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import { Avatar } from '../../contacts.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';

export default class Incoming extends MegaRenderMixin {
    static NAMESPACE = 'incoming-dialog';

    state = {
        video: false
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        this._old$dialog = $.dialog;
        $.dialog = "chat-incoming-call";
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $.dialog = this._old$dialog;
    }

    render() {
        const { chatRoom } = this.props;

        if (chatRoom) {
            const { callerId, onClose, onReject, onAnswer, onToggleVideo } = this.props;
            const { video } = this.state;
            const { NAMESPACE } = Incoming;
            const SIMPLETIP_PROPS = { position: 'top' };
            const isPrivateRoom = chatRoom.type === 'private';
            const rejectLabel = isPrivateRoom ? l[20981] /* `Reject` */ : l[82] /* `Cancel` */;

            return (
                <ModalDialogsUI.ModalDialog
                    {...this.state}
                    name={NAMESPACE}
                    className={NAMESPACE}
                    noCloseOnClickOutside={true}
                    onClose={() => onClose()}>
                    <div className="fm-dialog-body">
                        <div className={`${NAMESPACE}-avatar`}>
                            <Avatar contact={M.u[callerId]} />
                        </div>
                        <div className={`${NAMESPACE}-info`}>
                            <h1>{chatRoom.getRoomTitle()}</h1>
                            <span>
                                {isPrivateRoom ? l[17878] /* `Incoming call` */ : l[19995] /* `Incoming group call` */}
                            </span>
                        </div>
                        <div className={`${NAMESPACE}-controls`}>
                            <Button
                                className="mega-button large round negative"
                                icon="icon-end-call"
                                simpletip={{ ...SIMPLETIP_PROPS, label: rejectLabel }}
                                onClick={onReject}>
                                <span>{rejectLabel}</span>
                            </Button>
                            <Button
                                className="mega-button positive answer"
                                icon="icon-phone"
                                simpletip={{ ...SIMPLETIP_PROPS, label: l[7205] /* `Answer` */ }}
                                onClick={onAnswer}>
                                <span>{l[7205] /* `Answer` */}</span>
                            </Button>
                            <Button
                                className={`
                                    mega-button
                                    large round
                                    video
                                    ${video ? '' : 'negative'}
                                `}
                                icon={video ? 'icon-video-call-filled' : 'icon-video-off'}
                                simpletip={{
                                    ...SIMPLETIP_PROPS,
                                    label: video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */
                                }}
                                onClick={() =>
                                    this.setState({ video: !video }, () =>
                                        onToggleVideo(video)
                                    )
                                }>
                                <span>{video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */}</span>
                            </Button>
                        </div>
                    </div>
                </ModalDialogsUI.ModalDialog>
            );
        }

        console.error('Incoming dialog received missing chatRoom prop.');
        return null;
    }
}

window.ChatCallIncomingDialog = Incoming;
