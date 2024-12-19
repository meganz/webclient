import React from 'react';
import { Avatar } from '../../contacts.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import Call from '../call.jsx';
import { Emoji } from '../../../../ui/utils.jsx';

export default class Incoming extends React.Component {
    static NAMESPACE = 'incoming-dialog';

    state = {
        video: false,
        unsupported: undefined,
        hoveredSwitch: true,
        hideOverlay: false,
    };

    constructor(props) {
        super(props);
        this.state.unsupported = !megaChat.hasSupportForCalls;
        this.state.hideOverlay = document.body.classList.contains('overlayed');
    }

    componentDidMount() {
        this._old$dialog = $.dialog;
        $.dialog = "chat-incoming-call";
    }

    componentWillUnmount() {
        $.dialog = this._old$dialog;
    }

    renderSwitchControls = () => {
        const className = `mega-button large round switch ${this.state.hoveredSwitch ? 'hovered' : ''}`;
        const toggleHover = () => this.setState(state => ({ hoveredSwitch: !state.hoveredSwitch }));

        return (
            <div className="switch-button">
                <div
                    className="switch-button-container simpletip"
                    data-simpletip={l.end_and_answer /* `End & Answer` */}
                    data-simpletipposition="top"
                    onMouseEnter={toggleHover}
                    onMouseLeave={toggleHover}
                    onClick={ev => {
                        ev.stopPropagation();
                        this.props.onSwitch();
                    }}>
                    <Button className={`${className} negative`} icon="icon-end-call"/>
                    <Button className={`${className} positive`} icon="icon-phone"/>
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
                        mega-button
                        positive
                        answer
                        ${unsupported ? 'disabled' : ''}
                    `}
                    icon="icon-phone"
                    simpletip={unsupported ? null : { position: 'top', label: l[7205] /* `Answer` */ }}
                    onClick={unsupported ? null : onAnswer}>
                    <span>{l[7205] /* `Answer` */}</span>
                </Button>
                <Button
                    className={`
                        mega-button
                        large
                        round
                        video
                        ${video ? '' : 'negative'}
                        ${unsupported ? 'disabled' : ''}
                    `}
                    icon={video ? 'icon-video-call-filled' : 'icon-video-off'}
                    simpletip={
                        unsupported ?
                            null :
                            {
                                position: 'top',
                                label: video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */
                            }
                    }
                    onClick={() => unsupported ? null : this.setState({ video: !video }, () => onToggleVideo(video))}>
                    <span>
                        {video ? l[22894] /* `Disable video` */ : l[22893] /* `Enable video` */}
                    </span>
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
            const rejectLabel = isPrivateRoom ? l[20981] /* `Reject` */ : l[82] /* `Cancel` */;

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
                                <Emoji>{chatRoom.getRoomTitle()}</Emoji>
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
                                    mega-button
                                    large
                                    round
                                    negative
                                `}
                                icon="icon-end-call"
                                simpletip={{ position: 'top', label: rejectLabel }}
                                onClick={onReject}>
                                <span>{rejectLabel}</span>
                            </Button>
                            {CALL_IN_PROGRESS ? this.renderSwitchControls() : this.renderAnswerControls()}
                        </div>
                        {unsupported && (
                            <div className={`${NAMESPACE}-unsupported`}>
                                <div className="unsupported-message">{Call.getUnsupportedBrowserMessage()}</div>
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

window.ChatCallIncomingDialog = Incoming;
