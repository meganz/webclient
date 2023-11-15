import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import utils, { Emoji, ParsedHTML } from '../../../../ui/utils.jsx';
import Preview from '../workflow/preview.jsx';
import Button from '../button.jsx';
import Link from '../../link.jsx';

const NAMESPACE = 'waiting-room';

export const VIEW = {
    INTRO: 0,
    ACCOUNT: 1,
    GUEST: 2,
    AWAIT: 3,
    UNSUPPORTED: 4,
    REDIRECT: 5
};

export default class WaitingRoom extends MegaRenderMixin {
    redirectInterval = undefined;

    state = {
        view: VIEW.ACCOUNT,
        call: false,
        audio: false,
        video: false,
        firstName: '',
        lastName: '',
        countdown: 4,
        loading: false
    };

    constructor(props) {
        super(props);
        this.state.call = this.props.havePendingCall;
        this.state.view = megaChat.hasSupportForCalls ? this.setInitialView() : VIEW.UNSUPPORTED;
        if (sessionStorage.previewMedia) {
            const { audio, video } = JSON.parse(sessionStorage.previewMedia);
            this.state.audio = audio;
            this.state.video = video;
            sessionStorage.removeItem('previewMedia');
        }
    }

    renderLeaveDialog = () =>
        msgDialog(
            `confirmation:!^${l.wr_leave}!${l.wr_do_not_leave}`,
            null,
            l.wr_leave_confirmation,
            '',
            cb => cb && this.doLeave(),
            1
        );

    renderDeniedDialog = () =>
        msgDialog(
            'error',
            '',
            l.wr_denied,
            l.wr_denied_details,
            this.doLeave
        );

    renderTimeoutDialog = () =>
        msgDialog(
            'error',
            '',
            l.wr_timeout,
            l.wr_timeout_details,
            this.doLeave
        );

    renderWaitingRoomInfo = () => {
        const { chatRoom } = this.props;
        const { nextOccurrenceStart, nextOccurrenceEnd } = chatRoom.scheduledMeeting || {};

        return (
            <>
                <ParsedHTML
                    tag="h2"
                    content={megaChat.html(chatRoom.topic)}
                />
                <div className={`${NAMESPACE}-schedule`}>
                    <span>{time2date(nextOccurrenceStart / 1000, 20)}</span>
                    <span>{toLocaleTime(nextOccurrenceStart)} - {toLocaleTime(nextOccurrenceEnd)}</span>
                </div>
            </>
        );
    };

    doLeave = () =>
        this.setState({ view: VIEW.REDIRECT }, () => {
            tSleep(this.state.countdown).then(() => this.props.onWaitingRoomLeave());
            this.redirectInterval = setInterval(() =>
                this.setState(({ countdown }) => ({ countdown: countdown > 0 ? countdown - 1 : 0 })), 1e3);
            sessionStorage.removeItem('previewMedia');
        });

    setInitialView = () => {
        if (u_type || is_eplusplus) {
            return this.props.chatRoom?.iAmInRoom() ? VIEW.AWAIT : VIEW.ACCOUNT;
        }
        return VIEW.INTRO;
    };

    requestJoin = () => {
        const { audio, video } = this.state;
        this.props.chatRoom?.joinCall(audio, video);
    };

    // --

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
                    maxLength={40}
                    onChange={ev => this.setState({ [name]: ev.target.value })}
                />
            </div>
        );
    };

    Card = ({ className, children }) => {
        const { audio, video } = this.state;
        return (
            <div
                className={`
                    card
                    ${className || ''}
                 `}>
                <div className="card-body">{children}</div>
                <div className="card-preview">
                    <Preview
                        audio={audio}
                        video={video}
                        onToggle={(audio, video) => {
                            this.setState({ audio, video }, () => {
                                sessionStorage.previewMedia = JSON.stringify({ audio, video });
                            });
                        }}
                    />
                </div>
            </div>
        );
    };

    Head = ({ title }) => {
        const hasDarkMode =
            Object.values(document.body.classList).some(c => c === 'theme-dark' || c === 'theme-dark-forced');

        return (
            <div className={`${NAMESPACE}-head`}>
                <div className={`${NAMESPACE}-logo`}>
                    <i
                        className={`
                        sprite-fm-illustration-wide
                        ${hasDarkMode ? 'mega-logo-dark' : 'img-mega-logo-light'}
                    `}
                    />
                </div>
                <h1
                    className={
                        (megaChat.initialChatId || is_chatlink) && this.state.view !== VIEW.INTRO ? 'hidden' : ''
                    }>
                    <Emoji>{title || l.you_have_invitation.replace('%1', this.props.chatRoom?.topic)}</Emoji>
                </h1>
            </div>
        );
    };

    Await = () => {
        return (
            <>
                {megaChat.initialChatId ? <this.Head /> : null}
                <this.Card className={megaChat.initialChatId ? '' : 'fit-spacing'}>
                    {this.renderWaitingRoomInfo()}
                    <div className={`${NAMESPACE}-message`}>
                        {this.state.call ? l.wr_wait_to_admit : l.wr_wait_to_start}
                    </div>
                    <Button
                        icon="sprite-fm-mono icon-log-out-thin-solid"
                        className={`${NAMESPACE}-leave`}
                        onClick={() => this.renderLeaveDialog()}>
                        {l.wr_leave /* `Leave` */}
                    </Button>
                </this.Card>
            </>
        );
    };

    Account = () => {
        const { loading, audio, video } = this.state;

        return (
            <>
                <this.Head/>
                <this.Card>
                    {this.renderWaitingRoomInfo()}
                    <Button
                        className={`
                           mega-button
                           positive
                           large
                           ${loading ? 'disabled' : ''}
                        `}
                        onClick={() => {
                            return loading ?
                                null :
                                this.setState({ loading: true }, () => {
                                    const { chatRoom } = this.props;
                                    const { chatId, publicChatHandle, publicChatKey } = chatRoom;

                                    if (chatRoom.iAmInRoom()) {
                                        return megaChat.routing.reinitAndOpenExistingChat(chatId, publicChatHandle)
                                            .then(() => {
                                                megaChat.getChatById(chatId).joinCall(audio, video);
                                            })
                                            .catch(ex =>
                                                console.error(`Failed to open existing room and join call: ${ex}`)
                                            );
                                    }

                                    megaChat.routing.reinitAndJoinPublicChat(
                                        chatId,
                                        publicChatHandle,
                                        publicChatKey
                                    )
                                        .then(() => {
                                            delete megaChat.initialPubChatHandle;
                                        })
                                        .catch(ex => console.error(`Failed to join room: ${ex}`));
                                });
                        }}>
                        {l.wr_ask_to_join /* `Ask to join` */}
                    </Button>
                    <div>
                        <Link to="https://mega.io/chatandmeetings" target="_blank">
                            {l.how_meetings_work /* `Learn more about MEGA Meetings` */}
                        </Link>
                    </div>
                </this.Card>
            </>
        );
    };

    Redirect = () =>
        <>
            <this.Head title={l.wr_left_heading} />
            <h5>{l.wr_left_countdown.replace('%1', this.state.countdown)}</h5>
        </>;

    Guest = () => {
        const { chatRoom } = this.props;
        const { loading, firstName, lastName } = this.state;
        const isDisabled = !firstName.length || !lastName.length;

        return (
            <>
                <this.Head/>
                <this.Card>
                    {this.renderWaitingRoomInfo()}
                    <div className="card-fields">
                        <this.Field name="firstName">{l[1096] /* `First name` */}</this.Field>
                        <this.Field name="lastName">{l[1097] /* `Last name` */}</this.Field>
                    </div>
                    <Button
                        className={`
                            mega-button
                            positive
                            large
                            ${isDisabled || loading ? 'disabled' : ''}
                        `}
                        onClick={() => {
                            if (isDisabled || loading) {
                                return false;
                            }
                            return this.setState({ loading: true }, () => {
                                u_eplusplus(this.state.firstName, this.state.lastName)
                                    .then(() => {
                                        return megaChat.routing.reinitAndJoinPublicChat(
                                            chatRoom.chatId,
                                            chatRoom.publicChatHandle,
                                            chatRoom.publicChatKey
                                        );
                                    })
                                    .catch(ex => d && console.error(`E++ account failure: ${ex}`));
                            });
                        }}>
                        {l.wr_ask_to_join}
                    </Button>
                    <div>
                        <Link to="https://mega.io/chatandmeetings" target="_blank">
                            {l.how_meetings_work /* `Learn more about MEGA Meetings` */}
                        </Link>
                    </div>
                </this.Card>
            </>
        );
    };

    Intro = () => {
        const { chatRoom } = this.props;
        return (
            <>
                <this.Head/>
                <div className="join-meeting-content">
                    <Button
                        className="mega-button positive"
                        onClick={() => {
                            megaChat.loginOrRegisterBeforeJoining(
                                chatRoom.publicChatHandle,
                                false,
                                true,
                                undefined,
                                () => this.setState({ view: VIEW.ACCOUNT })
                            );
                        }}>
                        {l[171] /* `Login` */}
                    </Button>
                    <Button
                        className="mega-button"
                        onClick={() => this.setState({ view: VIEW.GUEST })}>
                        {l.join_as_guest /* `Join as guest` */}
                    </Button>
                    <p>
                        <ParsedHTML
                            onClick={e => {
                                e.preventDefault();
                                megaChat.loginOrRegisterBeforeJoining(
                                    chatRoom.publicChatHandle,
                                    true,
                                    undefined,
                                    undefined,
                                    () => this.setState({ view: VIEW.ACCOUNT })
                                );
                            }}>
                            {l[20635] /* `Don't have an account? Create one now` */}
                        </ParsedHTML>
                    </p>
                </div>
            </>
        );
    };

    Unsupported = () =>
        <>
            <this.Head />
            <h1>{l.you_have_invitation.replace('%1', this.props.chatRoom?.topic)}</h1>
            <div className="meetings-unsupported-container">
                <i className="sprite-fm-uni icon-error"/>
                <div className="unsupported-info">
                    <h3>{l.heading_unsupported_browser}</h3>
                    <h3>{l.join_meeting_methods}</h3>
                    <ul>
                        <li>{l.join_via_link}</li>
                        <li>
                            <ParsedHTML>
                                {l.join_via_mobile
                                    .replace(
                                        '[A]',
                                        '<a href="https://mega.io/mobile" target="_blank" class="clickurl">'
                                    )
                                    .replace('[/A]', '</a>')
                                }
                            </ParsedHTML>
                        </li>
                    </ul>
                </div>
            </div>
        </>;

    renderView = view => {
        switch (view) {
            default:
                return this.Await();
            case VIEW.INTRO:
                return this.Intro();
            case VIEW.GUEST:
                return this.Guest();
            case VIEW.ACCOUNT:
                return this.Account();
            case VIEW.REDIRECT:
                return this.Redirect();
            case VIEW.UNSUPPORTED:
                return this.Unsupported();
        }
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.havePendingCall !== nextProps.havePendingCall) {
            this.setState({ call: nextProps.havePendingCall }, () =>
                this.state.view === VIEW.AWAIT && nextProps.havePendingCall && this.requestJoin()
            );
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        clearInterval(this.redirectInterval);
        this.props.chatRoom.unbind(`onCallLeft.${NAMESPACE}`);
    }

    componentDidMount() {
        super.componentDidMount();
        const { chatRoom } = this.props;
        const { call, view } = this.state;

        if (call && view === VIEW.AWAIT) {
            this.requestJoin();
        }

        chatRoom.rebind(`onCallLeft.${NAMESPACE}`, (ev, { termCode }) => {
            if (termCode === SfuClient.TermCode.kKickedFromWaitingRoom) {
                return this.renderDeniedDialog();
            }
            if (termCode === SfuClient.TermCode.kWaitingRoomAllowTimeout) {
                return this.renderTimeoutDialog();
            }
        });

        // Bypass the waiting room if the current waiting participants had been granted host permissions
        chatRoom.rebind(`onModeratorAdd.${NAMESPACE}`, (ev, user) => {
            if (user === u_handle) {
                chatRoom.meetingsLoading = false;
                this.requestJoin();
            }
        });
    }

    render() {
        const { view } = this.state;
        return (
            <utils.RenderTo element={document.body}>
                <div
                    className={`
                        ${NAMESPACE}
                        join-meeting
                        ${view === VIEW.AWAIT ? `${NAMESPACE}--await` : ''}
                        ${view === VIEW.AWAIT && !megaChat.initialChatId ? 'theme-dark-forced' : ''}
                        ${view === VIEW.REDIRECT ? `${NAMESPACE}--redirect` : ''}
                        ${megaChat.initialChatId || is_chatlink ? `${NAMESPACE}--chatlink-landing` : ''}
                    `}>
                    {this.renderView(view)}
                </div>
            </utils.RenderTo>
        );
    }
}
