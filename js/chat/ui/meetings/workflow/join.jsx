import React from 'react';
import { MegaRenderMixin } from '../../../../stores/mixins';
import utils from '../../../../ui/utils.jsx';
import Button from '../button.jsx';
import Preview from './preview.jsx';
import HistoryPanel from "../../historyPanel.jsx";

export default class Join extends MegaRenderMixin {
    static NAMESPACE = 'join-meeting';

    static VIEW = {
        INITIAL: 0,
        GUEST: 1,
        ACCOUNT: 2,
        LOGIN: 3,
        UNSUPPORTED: 4
    };

    state = {
        preview: false,
        view: Join.VIEW.INITIAL,
        firstName: '',
        lastName: '',
        previewAudio: false,
        previewVideo: false
    };

    constructor(props) {
        super(props);
        this.state.view = props.initialView || this.state.view;
    }

    handleKeyDown = ({ key }) => {
        return key && key === 'Escape' ? this.props.onClose?.() : true;
    };

    showPanels = () => {
        return [
            document.querySelector('.nw-fm-left-icons-panel'),
            document.querySelector('.chat-app-container'),
        ]
            .map(el => el && el.classList.remove('hidden'));
    };

    hidePanels = () => {
        return [
            document.querySelector('.nw-fm-left-icons-panel'),
            document.querySelector('.chat-app-container')
        ]
            .map(el => el && el.classList.add('hidden'));
    };

    Head = () => {
        return (
            <div className={`${Join.NAMESPACE}-head`}>
                <div className={`${Join.NAMESPACE}-logo`}>
                    <i
                        className={`
                            sprite-fm-illustration-wide
                            ${document.body.classList.contains('theme-dark') ? 'mega-logo-dark' : 'img-mega-logo-light'}
                        `}
                    />
                </div>
                <h1>{l.you_have_invitation.replace('%1', this.props.chatRoom?.topic)}</h1>
            </div>
        );
    };

    Intro = () =>
        <>
            <div className={`${Join.NAMESPACE}-content`}>
                <Button
                    className="mega-button positive"
                    onClick={() => this.setState({ view: Join.VIEW.GUEST })}>
                    {l.join_as_guest /* `Join as guest` */}
                </Button>
                <Button
                    className="mega-button"
                    onClick={() => {
                        megaChat.loginOrRegisterBeforeJoining(
                            this.props.chatRoom?.publicChatHandle,
                            false,
                            true,
                            undefined,
                            () => this.setState({ view: Join.VIEW.ACCOUNT })
                        );
                    }}>
                    {l[171] /* `Login` */}
                </Button>
                <p>
                    <span
                        dangerouslySetInnerHTML={{ __html: l[20635] }}
                        onClick={e => {
                            e.preventDefault();
                            megaChat.loginOrRegisterBeforeJoining(
                                this.props.chatRoom.publicChatHandle,
                                true,
                                undefined,
                                undefined,
                                () => this.setState({ view: Join.VIEW.ACCOUNT })
                            );
                        }}
                    />
                </p>
            </div>
            {this.Chat()}
        </>;

    Chat = () => {
        const { chatRoom } = this.props;
        const { preview } = this.state;

        return (
            <div
                className={`
                    ${Join.NAMESPACE}-chat
                    ${preview ? 'expanded' : ''}
                `}>
                <div className="chat-content">
                    <div
                        className="chat-content-head"
                        onClick={() => this.setState({ preview: !preview })}>
                        {chatRoom.topic}
                        <Button icon="icon-minimise">
                            <span>Toggle</span>
                        </Button>
                    </div>
                    {preview && (
                        <div className="chat-body">
                            <HistoryPanel
                                chatRoom={chatRoom}
                                onMount={(cmp) => cmp.messagesListScrollable.scrollToBottom()}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    Card = ({ children }) =>
        <div className="card">
            <div className="card-body">
                {children}
                <div>
                    <a href="/securechat">Learn more about MEGA Meetings</a>
                </div>
            </div>
            <div className="card-preview">
                <Preview onToggle={(audio, video) => this.setState({ previewAudio: audio, previewVideo: video })} />
            </div>
        </div>;

    Field = ({ name, children }) => {
        return (
            <div
                className={`
                    mega-input
                    title-ontop
                    ${this.state[name]?.length ? 'valued' : ''}
                `}>
                <div className="mega-input-title">
                    {children}
                    <span className="required-red">*</span>
                </div>
                <input
                    type="text"
                    name={name}
                    className="titleTop required megaInputs"
                    placeholder={children}
                    value={this.state[name] || ''}
                    onChange={ev => this.setState({ [name]: ev.target.value })}
                />
            </div>
        );
    };

    Guest = () =>
        <this.Card>
            <h2>Enter your name to join the meeting</h2>
            <div className="card-fields">
                <this.Field name="firstName">First Name</this.Field>
                <this.Field name="lastName">Last Name</this.Field>
            </div>
            <Button
                className={`
                    mega-button
                    positive
                    large
                    ${this.state.firstName.length && this.state.lastName.length ? '' : 'disabled'}
                    ${this.state.joining && " loading disabled"}
                `}
                onClick={() => {
                    if (this.state.joining) {
                        return;
                    }
                    let { firstName, lastName, previewAudio, previewVideo } = this.state;
                    firstName = firstName && firstName.trim();
                    lastName = lastName && lastName.trim();
                    if (firstName && lastName && firstName.length > 0 && lastName.length > 0) {
                        this.setState({'joining': true});

                        this.props.onJoinGuestClick(
                            firstName,
                            lastName,
                            previewAudio,
                            previewVideo
                        );
                    }
                }}>
                Join
            </Button>
        </this.Card>;

    Account = () =>
        <this.Card>
            <h4>Join meeting now?</h4>
            <Button
                className={`mega-button positive large ${this.state.joining && " loading disabled"}`}
                onClick={() => {
                    if (!this.state.joining) {
                        this.setState({'joining': true});
                        this.props.onJoinClick(this.state.previewAudio, this.state.previewVideo);
                    }
                }}>
                Join
            </Button>
        </this.Card>;

    Login = () =>
        <div>
            <h1>LOGIN DIALOG</h1>
        </div>;

    Unsupported = () =>
        <div className="unsupported-container">
            <i className="sprite-fm-uni icon-error" />
            <div className="unsupported-info">
                <h3>Your browser can&apos;t support MEGA meeting</h3>
                <h3>You can join meeting via the following approaches:</h3>
                <ul>
                    <li>Open the link via Chrome version XXX</li>
                    <li>Join via Mobile apps <a href="#">Download Mobile App</a></li>
                </ul>
            </div>
        </div>;

    View = (view) => {
        switch (view) {
            default:
                return this.Intro();
            case Join.VIEW.GUEST:
                return this.Guest();
            case Join.VIEW.ACCOUNT:
                return this.Account();
            case Join.VIEW.LOGIN:
                return this.Login();
            case Join.VIEW.UNSUPPORTED:
                return this.Unsupported();
        }
    };

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('keydown', this.handleKeyDown);
        this.hidePanels();
        megaChat._joinDialogIsShown = true;

        alarm.hideAllWarningPopups();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('keydown', this.handleKeyDown);
        this.showPanels();
        megaChat._joinDialogIsShown = false;
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    render() {
        if (!this.props.chatRoom) {
            return null;
        }

        return (
            <utils.RenderTo element={document.body}>
                <div className={Join.NAMESPACE}>
                    {this.Head()}
                    {this.View(this.state.view)}
                </div>
            </utils.RenderTo>
        );
    }
}
