import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import { Avatar } from '../../contacts.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import { Emoji } from '../../../../ui/utils.jsx';

export default class Incoming extends MegaRenderMixin {
    static NAMESPACE = 'incoming-dialog';

    state = {
        video: false,
        hoveredSwitch: true
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
        const { video } = this.state;
        const { onAnswer, onToggleVideo } = this.props;

        return (
            <>
                <Button
                    className="mega-button positive answer"
                    icon="icon-phone"
                    simpletip={{ position: 'top', label: l[7205] /* `Answer` */ }}
                    onClick={onAnswer}>
                    <span>{l[7205] /* `Answer` */}</span>
                </Button>
                <Button
                    className={`
                        mega-button
                        large
                        round
                        video
                        ${video ? '' : 'negative'}
                    `}
                    icon={video ? 'icon-video-call-filled' : 'icon-video-off'}
                    simpletip={{
                        position: 'top',
                        label: video ?
                            l[22894] /* `Disable video` */ :
                            l[22893] /* `Enable video` */
                    }}
                    onClick={() => this.setState({ video: !video }, () => onToggleVideo(video))}>
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
            const { callerId, onClose, onReject } = this.props;
            const { NAMESPACE } = Incoming;
            const CALL_IN_PROGRESS = window.sfuClient;
            const isPrivateRoom = chatRoom.type === 'private';
            const rejectLabel = isPrivateRoom ? l[20981] /* `Reject` */ : l[82] /* `Cancel` */;

            return (
                <ModalDialogsUI.ModalDialog
                    {...this.state}
                    name={NAMESPACE}
                    className={NAMESPACE}
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
                                className="mega-button large round negative"
                                icon="icon-end-call"
                                simpletip={{ position: 'top', label: rejectLabel }}
                                onClick={onReject}>
                                <span>{rejectLabel}</span>
                            </Button>
                            {CALL_IN_PROGRESS ? this.renderSwitchControls() : this.renderAnswerControls()}
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
