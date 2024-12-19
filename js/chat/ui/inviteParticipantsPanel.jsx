import React from 'react';
import Call from './meetings/call.jsx';
import MiniUI from '../../ui/miniui.jsx';
import { Button } from '../../ui/buttons.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';

const NAMESPACE = 'invite-panel';

export class InviteParticipantsPanel extends React.Component {
    domRef = React.createRef();

    state = {
        link: '',
        copied: false,
    };

    constructor(props) {
        super(props);
        this.retrieveChatLink();
    }

    retrieveChatLink(cim) {
        const { chatRoom } = this.props;
        if (!chatRoom.topic) {
            return;
        }

        this.loading = chatRoom.updatePublicHandle(false, cim)
            .always(() => {
                delete this.loading;
                if (this.domRef.current) {
                    if (chatRoom.publicLink) {
                        this.setState({ link: `${getBaseUrl()}/${chatRoom.publicLink}` });
                    }
                    else {
                        this.setState({ link: false });
                    }
                }
            });
    }

    getInviteBody(encode) {
        const { chatRoom } = this.props;
        const { link } = this.state;
        const { scheduledMeeting } = chatRoom;
        let body = l.invite_body_text; /* %1 is inviting you to a MEGA call[BR] MEGA meeting: %2[BR] Meeting link: %3 */
        if (scheduledMeeting) {
            const { nextOccurrenceStart } = chatRoom.scheduledMeeting;
            // %1 is inviting you to a MEGA call[BR] MEGA meeting: %2[BR] Time: %4 %5[BR] Meeting link: %3
            body = l.invite_body_text_scheduled
                .replace('%4', time2date(nextOccurrenceStart / 1000, 20))
                .replace('%5', toLocaleTime(nextOccurrenceStart));
        }
        body = body
            .replace(/\[BR]/g, '\n')
            .replace('%1', u_attr.name)
            .replace('%2', chatRoom.getRoomTitle())
            .replace('%3', link);
        return encode ? encodeURIComponent(body) : body;
    }

    render() {
        const { chatRoom, disableLinkToggle, onAddParticipants } = this.props;
        const { link, copied } = this.state;
        const inCall = Call.isExpanded();

        if (this.loading) {
            return (
                <div
                    ref={this.domRef}
                    className={`
                        ${NAMESPACE}
                        ${inCall ? 'theme-dark-forced' : ''}
                    `}>
                    <header/>
                    <section className="content">
                        <div className="content-block"/>
                    </section>
                </div>
            );
        }

        const canInvite = !!(chatRoom.iAmOperator() || chatRoom.options[MCO_FLAGS.OPEN_INVITE]) && onAddParticipants;
        const canToggleLink = !disableLinkToggle && chatRoom.iAmOperator() && (chatRoom.isMeeting || chatRoom.topic);
        const mailto = `mailto:?to=&subject=${l.invite_subject_text}&body=${this.getInviteBody(true)}`;
        const copyText = chatRoom.isMeeting ? l.copy_meeting_link : l[1394]; /* `Copy (meeting) link` */

        return (
            <div
                ref={this.domRef}
                className={`
                    ${NAMESPACE}
                    ${inCall ? 'theme-dark-forced' : ''}
                `}>
                <header>
                    <h3>{l.invite_participants /* `Invite participants` */}</h3>
                </header>
                <section className="content">
                    {
                        canToggleLink && chatRoom.type !== 'group'
                        &&
                            <div className="content-block link-block">
                                <div className="text-wrapper">
                                    <span className="link-label">
                                        {l.invite_toggle_link_label /* `Allow joining via link` */}
                                    </span>
                                    <div className={`link-description ${inCall ? '' : 'hidden'}`}>
                                        {l.invite_toggle_link_desc /* `Anybody with a link can join, ...` */}
                                    </div>
                                </div>
                                <MiniUI.ToggleCheckbox
                                    className="meeting-link-toggle"
                                    checked={!!link}
                                    value={!!link}
                                    onToggle={() => {
                                        if (this.loading) {
                                            return;
                                        }
                                        if (link) {
                                            this.loading = chatRoom.updatePublicHandle(true).always(() => {
                                                delete this.loading;
                                                if (this.domRef.current) {
                                                    this.setState({ link: false });
                                                }
                                            });
                                        }
                                        else {
                                            this.retrieveChatLink(true);
                                        }
                                    }}
                                />
                            </div>
                    }
                    {link && <div className="content-block">
                        <Button
                            className="flat-button"
                            icon={`sprite-fm-mono icon-${copied ? 'check' : 'link-thin-outline'}`}
                            label={copied ? l.copied /* `Copied` */ : copyText}
                            onClick={() => {
                                if (copied) {
                                    return;
                                }
                                delay('chat-event-inv-copylink', () => eventlog(99964));
                                copyToClipboard(link);
                                this.setState({ copied: true }, () => {
                                    tSleep(3).then(() => {
                                        if (this.domRef.current) {
                                            this.setState({ copied: false });
                                        }
                                    });
                                });
                            }}
                        />
                    </div>}
                    {link && <div className="content-block">
                        <Button
                            className="flat-button"
                            label={l.share_chat_link /* `Share link` */}
                            icon="sprite-fm-mono icon-share-02-thin-outline">
                            <Dropdown
                                className={`
                                    button-group-menu
                                    invite-dropdown
                                    ${inCall ? 'theme-dark-forced' : ''}
                                `}
                                noArrow={true}
                                positionAt="left bottom"
                                collision="none"
                                horizOffset={79}
                                vertOffset={6}
                                ref={r => {
                                    this.dropdownRef = r;
                                }}
                                onBeforeActiveChange={e => {
                                    if (e) {
                                        delay('chat-event-inv-dropdown', () => eventlog(99965));
                                        $(document.body).trigger('closeAllDropdownsExcept', this.dropdownRef);
                                    }
                                }}>
                                <DropdownItem
                                    key="send-invite"
                                    className={`
                                        ${inCall ? 'theme-dark-forced' : ''}
                                    `}
                                    icon="sprite-fm-mono icon-mail-thin-outline"
                                    label={l.share_chat_link_invite /* `Send invite` */}
                                    onClick={() => {
                                        delay('chat-event-inv-email', () => eventlog(99966));
                                        window.open(mailto, '_self', 'noopener,noreferrer');
                                    }}
                                />
                                <DropdownItem
                                    key="copy-invite"
                                    className={`
                                        ${inCall ? 'theme-dark-forced' : ''}
                                    `}
                                    label={l.copy_chat_link_invite /* `Copy invite` */}
                                    icon="sprite-fm-mono icon-square-copy"
                                    onClick={() => {
                                        delay('chat-event-inv-copy', () => eventlog(99967));
                                        copyToClipboard(
                                            this.getInviteBody(),
                                            l.invite_copied /* `Invite copied to clipboard` */
                                        );
                                    }}
                                />
                            </Dropdown>
                        </Button>
                    </div>}
                    {canInvite && (link || canToggleLink) && chatRoom.type !== 'group' &&
                        <div className="content-block invite-panel-divider">
                            {l.invite_dlg_divider /* `Or` */}
                        </div>
                    }
                    {canInvite &&
                        <div className="content-block add-participant-block">
                            <Button
                                className="flat-button"
                                icon="sprite-fm-mono icon-user-square-thin-outline"
                                label={l.add_participants /* `Add participants` */}
                                onClick={() => {
                                    delay('chat-event-inv-add-participant', () => eventlog(99968));
                                    onAddParticipants();
                                }}
                            />
                        </div>
                    }
                </section>
            </div>
        );
    }
}
