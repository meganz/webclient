import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import utils, { Emoji, ParsedHTML } from '../../../../ui/utils.jsx';
import Button from '../button.jsx';
import Preview from './preview.jsx';
import HistoryPanel from "../../historyPanel.jsx";
import Link from '../../link.jsx';

export default class Join extends MegaRenderMixin {
    static NAMESPACE = 'join-meeting';

    static VIEW = {
        INITIAL: 0,
        GUEST: 1,
        ACCOUNT: 2,
        UNSUPPORTED: 4
    };

    state = {
        preview: false,
        view: Join.VIEW.INITIAL,
        firstName: '',
        lastName: '',
        previewAudio: true,
        previewVideo: false,
        ephemeralDialog: false
    };

    constructor(props) {
        super(props);
        this.state.view = sessionStorage.guestForced ? Join.VIEW.GUEST : props.initialView || this.state.view;
        if (localStorage.awaitingConfirmationAccount) {
            this.showConfirmationDialog();
        }
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

    showConfirmationDialog = () => {
        megaChat.destroy();
        return mega.ui.sendSignupLinkDialog(JSON.parse(localStorage.awaitingConfirmationAccount), () => {
            delete localStorage.awaitingConfirmationAccount;
            u_logout(true).then(() => location.reload());
        });
    };

    Ephemeral = () => {
        const onCancel = () => this.setState({ ephemeralDialog: false });
        const onConfirm = () => {
            u_logout(true).then(() => location.reload());
            sessionStorage.guestForced = true;
        };
        const msgFragments = l.ephemeral_data_lost.split(/\[A]|\[\/A]/);

        return (
            <ModalDialogsUI.ModalDialog
                name="end-ephemeral"
                dialogType="message"
                icon="sprite-fm-uni icon-warning"
                title={l.ephemeral_data_lost_title}
                noCloseOnClickOutside={true}
                buttons={[
                    { key: 'cancel', label: l[82] /* Cancel */, onClick: onCancel },
                    { key: 'continue', label: l[507] /* Continue */, className: 'positive', onClick: onConfirm }
                ]}
                onClose={onCancel}>
                <p>
                    {msgFragments[0]}
                    <Link to="/register" onClick={() => loadSubPage('register')}>
                        {msgFragments[1]}
                    </Link>
                    {msgFragments[2]}
                </p>
            </ModalDialogsUI.ModalDialog>
        );
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
                <h1>
                    <Emoji>{l.you_have_invitation.replace('%1', this.props.chatRoom?.topic)}</Emoji>
                </h1>
                {isEphemeral() && (
                    <div className="ephemeral-info">
                        <i className="sprite-fm-uni icon-warning" />
                        <p>
                            {l.ephemeral_data_store_lost}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    Intro = () => {
        const $$CONTAINER = ({ children }) =>
            <>
                <div className={`${Join.NAMESPACE}-content`}>{children}</div>
                {this.Chat()}
            </>;

        //
        // Ephemeral session, w/ `Join as guest` and `Create account` controls
        // -------------------------------------------------------------------------

        if (isEphemeral()) {
            return (
                <$$CONTAINER>
                    <Button
                        className="mega-button positive"
                        onClick={() => this.setState({ ephemeralDialog: true })}>
                        {l.join_as_guest /* `Join as guest` */}
                    </Button>
                    <Button
                        className="mega-button"
                        onClick={() => loadSubPage('register')}>
                        {l[5582] /* `Create account` */}
                    </Button>
                    <span>
                        {l[5585] /* `Already have an account?` */}
                        <a
                            href="#"
                            onClick={() =>
                                mega.ui.showLoginRequiredDialog({ minUserType: 3, skipInitialDialog: 1 })
                                    .done(() =>
                                        this.setState({ view: Join.VIEW.ACCOUNT })
                                    )
                            }>
                            {l[171] /* `Login` */}
                        </a>
                    </span>
                </$$CONTAINER>
            );
        }


        //
        // Default state for guests, w/ `Join as guest`, `Login` and `Create account` controls
        // -------------------------------------------------------------------------

        return (
            <$$CONTAINER>
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
                    <ParsedHTML
                        onClick={e => {
                            e.preventDefault();
                            megaChat.loginOrRegisterBeforeJoining(
                                this.props.chatRoom.publicChatHandle,
                                true,
                                undefined,
                                undefined,
                                () => this.setState({ view: Join.VIEW.ACCOUNT })
                            );
                        }}>
                        {l[20635] /* `Don't have an account? Create one now` */}
                    </ParsedHTML>
                </p>
            </$$CONTAINER>
        );
    };

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
                        <Emoji>{chatRoom.topic}</Emoji>
                        <Button icon="icon-minimise" />
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

    Card = ({ children }) => {
        const { previewAudio, previewVideo } = this.state;
        return (
            <div className="card">
                <div className="card-body">
                    {children}
                    <div>
                        <Link to="https://mega.io/chatandmeetings" target="_blank">
                            {l.how_meetings_work /* `Learn more about MEGA Meetings` */}
                        </Link>
                    </div>
                </div>
                <div className="card-preview">
                    <Preview
                        audio={previewAudio}
                        video={previewVideo}
                        context={Join.NAMESPACE}
                        onToggle={(audio, video) => this.setState({ previewAudio: audio, previewVideo: video })}
                    />
                </div>
            </div>
        );
    };

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
            <h2>{l.enter_name_join_meeting}</h2>
            <div className="card-fields">
                <this.Field name="firstName">{l[1096]}</this.Field>
                <this.Field name="lastName">{l[1097]}</this.Field>
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
                {l.join_chat_button}
            </Button>
        </this.Card>;

    Account = () =>
        <this.Card>
            <h4>{l.join_meeting}</h4>
            <Button
                className={`mega-button positive large ${this.state.joining && " loading disabled"}`}
                onClick={() => {
                    if (!this.state.joining) {
                        this.setState({'joining': true});
                        this.props.onJoinClick(this.state.previewAudio, this.state.previewVideo);
                    }
                }}>
                {l.join_chat_button /* `Join` */}
            </Button>
        </this.Card>;

    Unsupported = () =>
        <div className="meetings-unsupported-container">
            <i className="sprite-fm-uni icon-error" />
            <div className="unsupported-info">
                <h3>{l.heading_unsupported_browser}</h3>
                <h3>{l.join_meeting_methods}</h3>
                <ul>
                    <li>{l.join_via_link}</li>
                    <li>
                        <ParsedHTML>
                            {l.join_via_mobile
                                .replace('[A]', '<a href="https://mega.io/mobile" target="_blank" class="clickurl">')
                                .replace('[/A]', '</a>')}
                        </ParsedHTML>
                    </li>
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
        sessionStorage.removeItem('guestForced');
        if (!megaChat.hasSupportForCalls) {
            this.setState({ view: Join.VIEW.UNSUPPORTED });
        }
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
        const { view, ephemeralDialog } = this.state;
        return (
            <utils.RenderTo element={document.body}>
                <div className={Join.NAMESPACE}>
                    {this.Head()}
                    {this.View(view)}
                    {ephemeralDialog && <this.Ephemeral />}
                </div>
            </utils.RenderTo>
        );
    }
}
