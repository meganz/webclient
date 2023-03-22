import React from 'react';
import { ConversationMessageMixin } from './mixin.jsx';
import { Avatar, ContactButton } from '../contacts.jsx';
import { Emoji, ParsedHTML } from "../../../ui/utils.jsx";
import { Button } from '../../../ui/buttons.jsx';

export default class ScheduleMetaChange extends ConversationMessageMixin {

    static MODE = {
        CREATED: 1,
        EDITED: 2,
        CANCELLED: 3,
    };

    state = {
        link: '',
    };

    componentDidMount() {
        super.componentDidMount();
        if (this.props.mode === ScheduleMetaChange.MODE.CREATED) {
            const val = is_chatlink ? `chat/${is_chatlink.ph}#${is_chatlink.key}` : this.props.chatRoom.getPublicLink();
            if (typeof val === 'string') {
                this.setState({ link: `${getBaseUrl()}/${val}`});
            }
            else if (val instanceof MegaPromise) {
                val.done(() => {
                    if (this.isMounted() && !this.state.link && this.props.chatRoom.publicLink) {
                        this.setState({ link: `${getBaseUrl()}/${this.props.chatRoom.publicLink}`});
                    }
                });
            }
        }
        if (this.props.message.meta.ap) {
            const { meetingsManager } = megaChat.plugins;
            this.redrawListener = `${meetingsManager.EVENTS.OCCURRENCES_UPDATE}.redraw${this.getUniqueId()}`;
            megaChat.rebind(this.redrawListener, () => {
                onIdle(() => {
                    const { meta } = this.props.message;
                    if (!meta.ap) {
                        return;
                    }
                    this.props.message.meta = meetingsManager.noCsMeta(meta.handle, meta.ap, megaChat.chats[meta.cid]);
                    this.safeForceUpdate();
                });
                megaChat.off(this.redrawListener);
                delete this.redrawListener;
            });
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.redrawListener) {
            megaChat.off(this.redrawListener);
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.mode === ScheduleMetaChange.MODE.CREATED && prevProps.link !== this.props.link) {
            this.setState({ link: this.props.link ? `${getBaseUrl()}/${this.props.link}` : ''});
        }
    }

    onAddToCalendar() {
        const { chatRoom } = this.props;
        const { id, title } = chatRoom && chatRoom.scheduledMeeting || {};
        // Reduce chances of spamming
        if (id) {
            delay(`fetchical${id}`, () => {
                asyncApiReq({ a: 'mcsmfical', id })
                    .then(res => {
                        delay(`saveical${id}`, () => {
                            M.saveAs(base64urldecode(res), `${title.replace(/\W/g, '')}.ics`).then(nop).catch(() => {
                                msgDialog('error', '', l.calendar_add_failed, '');
                            });
                        }, 1000);
                    })
                    .catch(() => {
                        msgDialog('error', '', l.calendar_add_failed, '');
                    });
            }, 250);
        }
    }

    static getTitleText(meta) {
        const { mode, recurring, occurrence, converted, prevTiming } = meta;
        const { MODE } = ScheduleMetaChange;
        switch (mode) {
            case MODE.CREATED: {
                return recurring
                    ? l.schedule_mgmt_new_recur /* `Created a recurring meeting` */
                    : l.schedule_mgmt_new /* `Created a meeting` */;
            }
            case MODE.EDITED: {
                if (converted) {
                    return recurring
                        ? l.schedule_mgmt_update_convert_recur/* `Updated the one-off meeting to a recurring meeting` */
                        : l.schedule_mgmt_update_convert; /* `Changed the meeting to a one-off meeting` */
                }
                if (occurrence) {
                    return l.schedule_mgmt_update_occur;  /* `Updated an occurrence as below:` */
                }
                if (prevTiming) {
                    return recurring
                        ? l.schedule_mgmt_update_recur /* `Updated the recurring meeting as below:` */
                        : l.schedule_mgmt_update; /* `Updated the meeting as below:` */
                }
                return l.schedule_mgmt_update_desc; /* `Updated the meeting description` */
            }
            case MODE.CANCELLED: {
                if (recurring) {
                    return occurrence
                        ? l.schedule_mgmt_cancel_occur /* `Cancelled an occurrence` */
                        : l.schedule_mgmt_cancel_recur; /* `Cancelled the recurring meeting` */
                }
                return l.schedule_mgmt_cancel; /* `Cancelled the meeting` */
            }
        }
        return '';
    }


    renderTimingBlock() {
        const { message, mode } = this.props;
        const { meta } = message;
        const { MODE } = ScheduleMetaChange;

        if (mode === MODE.CANCELLED && !meta.occurrence) {
            return null;
        }

        const [now, prev] = megaChat.plugins.meetingsManager.getOccurrenceStrings(meta);

        return (
            <div className="schedule-timing-block">
                {meta.prevTiming && <s>{prev || ''}</s>}
                {now}
            </div>
        );
    }


    checkAndFakeOccurrenceMeta(meta) {
        const { MODE } = ScheduleMetaChange;
        if (meta.occurrence && meta.mode === MODE.CANCELLED && !meta.calendar) {
            // As the occurrence may not exist before just add a calendar + time rules here
            const meeting = megaChat.plugins.meetingsManager.getMeetingOrOccurrenceParent(meta.handle);
            if (meeting) {
                const occurrences = meeting.getOccurrencesById(meta.handle);
                if (occurrences) {
                    meta.calendar = {
                        date: new Date(occurrences[0].start).getDate(),
                        month: time2date(Math.floor(occurrences[0].start / 1000), 12),
                    };
                    meta.timeRules.startTime = Math.floor(occurrences[0].start / 1000);
                    meta.timeRules.endTime = Math.floor(occurrences[0].end / 1000);
                }
            }
        }
    }

    render() {
        const { chatRoom, message, mode, contact } = this.props;
        const { meta, messageId } = message;
        const { scheduledMeeting } = chatRoom;
        const { MODE } = ScheduleMetaChange;
        const { link } = this.state;

        if (meta.gone) {
            // If the gone flag is set then the occurrence no longer exists so skip it.
            return null;
        }

        this.checkAndFakeOccurrenceMeta(meta);

        return (
            <div>
                <div className="message body" data-id={`id${messageId}`} key={messageId}>
                    <Avatar
                        contact={contact.u}
                        className="message avatar-wrapper small-rounded-avatar"
                        chatRoom={chatRoom}
                    />
                    <div className="message schedule-message content-area small-info-txt selectable-txt">
                        <ContactButton
                            className="message"
                            chatRoom={chatRoom}
                            contact={contact}
                            label={<Emoji>{M.getNameByHandle(contact.u)}</Emoji>}
                        />
                        <div className="message date-time simpletip" data-simpletip={time2date(this.getTimestamp())}>
                            {this.getTimestampAsString()}
                        </div>
                        <div className="message text-block">
                            {ScheduleMetaChange.getTitleText(meta)} {d && meta.handle}
                        </div>
                        <div className="message body-block">
                            {(
                                meta.prevTiming
                                || meta.calendar
                                || meta.topic && meta.onlyTitle
                                || meta.recurring
                            ) && <div className="schedule-detail-block">
                                {
                                    meta.calendar &&
                                    scheduledMeeting && (
                                        meta.recurring && !scheduledMeeting.recurring
                                        || meta.occurrence && meta.mode === MODE.CANCELLED
                                        || !meta.recurring
                                    ) &&
                                    <div className="schedule-calendar-icon">
                                        <div className="schedule-date">{meta.calendar.date}</div>
                                        <div className="schedule-month">{meta.calendar.month}</div>
                                    </div>
                                }
                                <div className="schedule-detail-main">
                                    <div className="schedule-meeting-title">
                                        {mode === MODE.CANCELLED
                                            ? <s>{meta.topic || chatRoom.topic}</s>
                                            : meta.topic || chatRoom.topic}
                                    </div>
                                    {this.renderTimingBlock()}
                                </div>
                                {chatRoom.iAmInRoom() && scheduledMeeting && mode !== MODE.CANCELLED &&
                                    <Button
                                        className="mega-button"
                                        onClick={() => this.onAddToCalendar()}>
                                        <span>
                                            {mode === MODE.CREATED && !meta.occurrence
                                                ? l.schedule_add_calendar /* `Add to calendar` */
                                                : l.schedule_update_calendar /* `Update calendar` */}
                                        </span>
                                    </Button>
                                }
                            </div>}
                            {mode === MODE.CREATED && scheduledMeeting && scheduledMeeting.description &&
                                <div className="schedule-description">
                                    <ParsedHTML>
                                        {megaChat.html(scheduledMeeting.description).replace(/\n/g, '<br>')}
                                    </ParsedHTML>
                                </div>
                            }
                            {link && (
                                <div>
                                    <div className="schedule-meeting-link">
                                        <span>{link}</span>
                                        <Button
                                            className="mega-button positive"
                                            onClick={() => {
                                                copyToClipboard(link, l[7654]);
                                            }}>
                                            <span>{l[63] /* `Copy` */}</span>
                                        </Button>
                                    </div>
                                    <span>{
                                        /* `Anyone with this link can join the meeting and via the meeting chat` */
                                        l.schedule_link_note
                                    }</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

window.ScheduleMetaChange = ScheduleMetaChange;
