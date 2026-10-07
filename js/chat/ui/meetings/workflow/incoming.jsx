import React from 'react';
import { Avatar } from '../../contacts.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import { OFlowEmoji } from '../../../../ui/utils.jsx';
import { getUnsupportedBrowserMessage } from '../utils.jsx';

export default class Incoming extends React.Component {
    static NAMESPACE = 'incoming-dialog';

    state = {
        video: false,
        unsupported: undefined,
        hideOverlay: false,
    };

    constructor(props) {
        super(props);
        this.state.unsupported = !megaChat.hasSupportForCalls;
        this.state.hideOverlay = document.body.classList.contains('overlayed') && !$.msgDialog;
    }

    componentDidMount() {
        this._old$dialog = $.dialog;
        $.dialog = "chat-incoming-call";
    }

    componentWillUnmount() {
        $.dialog = this._old$dialog;
    }

    renderSwitchControls = () => {
        const className = 'mega-component nav-elem icon-only switch';

        return (
            <div className="switch-button">
                <div
                    className="switch-button-container simpletip"
                    data-simpletip={l.end_and_answer /* `End & Answer` */}
                    data-simpletipposition="top"
                    onClick={ev => {
                        ev.stopPropagation();
                        this.props.onSwitch();
                    }}>
                    <Button className={`${className} negative`} icon="icon-phone-02-thin-outline"/>
                    <Button className={`${className} positive`} icon="icon-phone-01-thin-outline"/>
                </div>
            </div>
        );
    };

    renderAnswerControls = () => {
        const { video, unsupported } = this.state;
        const { onAnswer, onToggleVideo } = this.props;

        return (
            <>
                <Button
                    className={`
                        mega-component
                        nav-elem
                        icon-only
                        answer
                        ${unsupported ? 'disabled' : ''}
                    `}
                    icon="icon-phone-01-thin-outline"
                    simpletip={unsupported ? null : { position: 'top', label: l[7205] /* `Answer` */ }}
                    onClick={unsupported ? null : onAnswer}>
                </Button>
                <Button
                    className={`
                        mega-component
                        nav-elem
                        icon-only
                        secondary
                        video
                        ${unsupported ? 'disabled' : ''}
                    `}
                    icon={video ? 'icon-video-regular-outline' : 'icon-video-off-regular-outline'}
                    simpletip={
                        unsupported ?
                            null :
                            {
                                position: 'top',
                                label: video ? l[22894] /* `Disable camera` */ : l[22893] /* `Enable camera` */
                            }
                    }
                    onClick={() => unsupported ? null : this.setState({ video: !video }, () => onToggleVideo(video))}>
                </Button>
            </>
        );
    };

    render() {
        const { chatRoom } = this.props;

        if (chatRoom) {
            const { NAMESPACE } = Incoming;
            const { callerId, onClose, onReject } = this.props;
            const { unsupported } = this.state;
            const CALL_IN_PROGRESS = window.sfuClient;
            const isPrivateRoom = chatRoom.type === 'private';
            const rejectLabel = isPrivateRoom ? l[20981] /* `Reject` */ : l.msg_dlg_cancel;

            return (
                <ModalDialogsUI.ModalDialog
                    {...this.state}
                    name={NAMESPACE}
                    className={NAMESPACE}
                    roomName={chatRoom.getRoomTitle()}
                    onClose={() => onClose()}>
                    <div className="fm-dialog-body">
                        <div className={`${NAMESPACE}-avatar`}>
                            <Avatar contact={M.u[callerId]} />
                        </div>
                        <div className={`${NAMESPACE}-info`}>
                            <h1>
                                <OFlowEmoji>{chatRoom.getRoomTitle()}</OFlowEmoji>
                            </h1>
                            <span>
                                {isPrivateRoom ? l[17878] /* `Incoming call` */ : l[19995] /* `Incoming group call` */}
                            </span>
                        </div>
                        <div
                            className={`
                                ${NAMESPACE}-controls
                                ${CALL_IN_PROGRESS ? 'call-in-progress' : ''}
                            `}>
                            <Button
                                className={`
                                    mega-component
                                    nav-elem
                                    icon-only
                                    negative
                                `}
                                icon="icon-phone-02-thin-outline"
                                simpletip={{ position: 'top', label: rejectLabel }}
                                onClick={onReject}>
                            </Button>
                            {CALL_IN_PROGRESS ? this.renderSwitchControls() : this.renderAnswerControls()}
                        </div>
                        {unsupported && (
                            <div className={`${NAMESPACE}-unsupported`}>
                                <div className="unsupported-message">{getUnsupportedBrowserMessage()}</div>
                            </div>
                        )}
                    </div>
                </ModalDialogsUI.ModalDialog>
            );
        }

        console.error('Incoming dialog received missing chatRoom prop.');
        return null;
    }
}
