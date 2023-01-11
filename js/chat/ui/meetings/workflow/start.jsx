import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import Preview from './preview.jsx';
import Link from '../../link.jsx';
import { Emoji } from '../../../../ui/utils';

export class Start extends MegaRenderMixin {
    static NAMESPACE = 'start-meeting';
    static dialogName = `${Start.NAMESPACE}-dialog`;

    static CLASS_NAMES = {
        EDIT: 'call-title-edit',
        INPUT: 'call-title-input'
    };

    static STREAMS = {
        AUDIO: 1,
        VIDEO: 2
    };

    inputRef = React.createRef();
    defaultTopic = l.default_meeting_topic.replace('%NAME', M.getNameByHandle(u_handle));

    state = {
        audio: false,
        video: false,
        editing: false,
        previousTopic: undefined,
        topic: undefined,
        mounted: false
    };

    constructor(props) {
        super(props);
        this.state.topic = this.defaultTopic;
    }

    handleChange = ev => this.setState({ topic: ev.target.value });

    toggleEdit = () =>  {
        this.setState(state => {
            const topic = state.topic.trim() || this.defaultTopic; // Default to `${CURRENT_USER}'s meeting` as topic
            return { editing: !state.editing, topic, previousTopic: topic };
        }, () =>
            onIdle(this.doFocus)
        );
    };

    doFocus = () => {
        if (this.state.editing) {
            const input = this.inputRef.current;
            input.focus();
            input.setSelectionRange(0, input.value.length);
        }
    };

    doReset = () => this.setState(state => ({ editing: false, topic: state.previousTopic, previousTopic: undefined }));

    bindEvents = () =>
        $(document)
            .rebind(`mousedown.${Start.NAMESPACE}`, ev => {
                if (
                    this.state.editing &&
                    !ev.target.classList.contains(Start.CLASS_NAMES.EDIT) &&
                    !ev.target.classList.contains(Start.CLASS_NAMES.INPUT)
                ) {
                    this.toggleEdit();
                }
            })
            .rebind(`keyup.${Start.NAMESPACE}`, ({ keyCode }) => {
                if (this.state.editing) {
                    const [ENTER, ESCAPE] = [13, 27];
                    return keyCode === ENTER ? this.toggleEdit() : keyCode === ESCAPE ? this.doReset() : null;
                }
            });

    Input = () =>
        <input
            type="text"
            ref={this.inputRef}
            className={Start.CLASS_NAMES.INPUT}
            value={this.state.topic}
            maxLength={ChatRoom.TOPIC_MAX_LENGTH}
            onChange={this.handleChange}
        />;

    onStreamToggle = (audio, video) => this.setState({ audio, video });

    startMeeting = () => {
        const { onStart } = this.props;
        const { topic, audio, video } = this.state;

        if (onStart) {
            onStart(topic.trim() || this.defaultTopic, audio, video);
        }
    };

    componentDidMount() {
        super.componentDidMount();
        this.bindEvents();
        M.safeShowDialog(Start.dialogName, () => this.setState({ mounted: true }));
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $(document).unbind(`.${Start.NAMESPACE}`);
        if ($.dialog === Start.dialogName) {
            closeDialog();
        }
    }

    render() {
        const { NAMESPACE, CLASS_NAMES } = Start;
        const { editing, topic } = this.state;

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                name={NAMESPACE}
                className={NAMESPACE}
                stopKeyPropagation={editing}
                noCloseOnClickOutside={true}
                onClose={() => this.props.onClose()}>
                <div className={`${NAMESPACE}-preview`}>
                    <Preview
                        context={NAMESPACE}
                        onToggle={this.onStreamToggle}
                    />
                </div>
                <div className="fm-dialog-body">
                    <div className={`${NAMESPACE}-title`}>
                        {editing ?
                            <this.Input /> :
                            <h2 onClick={this.toggleEdit}>
                                <Emoji>{topic}</Emoji>
                            </h2>
                        }
                        <Button
                            className={`
                                mega-button
                                action
                                small
                                ${CLASS_NAMES.EDIT}
                                ${editing ? 'editing' : ''}
                            `}
                            icon="icon-rename"
                            simpletip={{ label: l[1342] /* `Edit` */, position: 'top' }}
                            onClick={this.toggleEdit}>
                            <span>{l[1342] /* `Edit` */}</span>
                        </Button>
                    </div>
                    <Button
                        className="mega-button positive large start-meeting-button"
                        onClick={this.startMeeting}>
                        <span>{l[7315] /* `Start` */}</span>
                    </Button>
                    <Link to="/securechat">{l.how_meetings_work /* `Learn more about MEGA Meetings` */}</Link>
                </div>
            </ModalDialogsUI.ModalDialog>
        );
    }
}
