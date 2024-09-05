import ScheduleMetaChange from './ui/messages/scheduleMetaChange.jsx';
import { MCO_FLAGS } from './chatRoom.jsx';

class Occurrence {
    constructor(megaChat, occurrence) {
        const { decodeData } = megaChat.plugins.meetingsManager;

        this.megaChat = megaChat;

        this.id = occurrence.id;
        this.uid = `${occurrence.cid}-${occurrence.o || occurrence.s}`;
        this.chatId = occurrence.cid;
        this.parentId = occurrence.p;
        this.start = occurrence.s * 1000;
        this.startInitial = parseInt(occurrence.o) * 1000 || undefined;
        this.end = occurrence.e * 1000;
        this.timezone = decodeData(occurrence.tz);
        this.title = decodeData(occurrence.t);
        this.description = decodeData(occurrence.d);
        this.ownerHandle = occurrence.u;
        this.flags = occurrence.f;
        this.canceled = occurrence.c;

        this.scheduledMeeting = occurrence.scheduledMeeting;
    }

    get isUpcoming() {
        return !this.canceled && this.end > Date.now();
    }

    cancel() {
        const { encodeData } = this.megaChat.plugins.meetingsManager;
        const req = {
            a: 'mcsmp',
            p: this.parentId || this.id,
            ...this.parentId && { id: this.id },
            cid: this.chatId,
            o: this.start / 1000,
            s: this.start / 1000,
            e: this.end / 1000,
            tz: encodeData(this.timezone),
            t: encodeData(this.title),
            d: encodeData(this.description) || '',
            f: this.scheduledMeeting.flags,
            c: 1
        };

        asyncApiReq(req)
            .catch(ex => console.error('Occurrence > cancel ->', ex));
    }

    update(startDateTime, endDateTime) {
        const { encodeData } = this.megaChat.plugins.meetingsManager;
        const req = {
            a: 'mcsmp',
            cid: this.chatId,
            p: this.parentId || this.id,
            ...this.parentId && { id: this.id },
            o: this.start / 1000,
            s: startDateTime / 1000,
            e: endDateTime / 1000,
            tz: encodeData(this.timezone),
            t: encodeData(this.title),
            d: encodeData(this.description) || '',
            f: this.scheduledMeeting.flags
        };

        asyncApiReq(req)
            .catch(ex => console.error('Occurrence > update ->', ex));
    }
}

// --

class ScheduledMeeting {
    constructor(megaChat, meetingInfo, fromActionPacket) {
        const { decodeData } = megaChat.plugins.meetingsManager;

        this.megaChat = megaChat;
        this.id = meetingInfo.id;
        this.chatId = meetingInfo.cid;
        this.parentId = meetingInfo.p;
        this.start = meetingInfo.s * 1000;
        this.startInitial = parseInt(meetingInfo.o) * 1000 || undefined;
        this.end = meetingInfo.e * 1000;
        this.timezone = decodeData(meetingInfo.tz);
        this.title = decodeData(meetingInfo.t);
        this.description = decodeData(meetingInfo.d);
        this.flags = meetingInfo.f;
        this.canceled = meetingInfo.c;
        this.recurring = meetingInfo.r && {
            frequency: meetingInfo.r.f || undefined,
            interval: meetingInfo.r.i || 0,
            // TODO not undefined. Needs a better never ending value.
            end: meetingInfo.r.u * 1000 || undefined,
            weekDays: meetingInfo.r.wd || [],
            monthDays: meetingInfo.r.md || [],
            // TODO: refactor re: tuple format
            offset: meetingInfo.r.mwd && meetingInfo.r.mwd.length ?
                { value: meetingInfo.r.mwd[0][0], weekDay: meetingInfo.r.mwd[0][1] } :
                []
        };

        this.occurrences = new MegaDataMap();
        this.nextOccurrenceStart = this.start;
        this.nextOccurrenceEnd = this.end;
        this.isPast = (this.isRecurring ? this.recurring.end : this.end) < Date.now();
        this.ownerHandle = meetingInfo.u;
        this.chatRoom = meetingInfo.chatRoom;
        this.chatRoom.scheduledMeeting = this.isRoot ? this : this.parent;

        if (fromActionPacket) {
            this.initializeFromActionPacket();
        }
    }

    get isRoot() {
        return !this.parentId;
    }

    get isCanceled() {
        return !!this.canceled;
    }

    get isUpcoming() {
        return !this.isCanceled && !this.isPast && this.chatRoom.members[u_handle] >= 0;
    }

    get isRecurring() {
        return !!this.recurring;
    }

    get isNear() {
        return this.start - Date.now() < ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    }

    get iAmOwner() {
        if (this.ownerHandle) {
            return this.ownerHandle === u_handle;
        }
        return null;
    }

    get parent() {
        return this.isRoot ? null : this.megaChat.plugins.meetingsManager.getMeetingById(this.parentId);
    }

    setNextOccurrence() {
        if (!this.didFetchOccurrences) {
            return;
        }
        const upcomingOccurrences = Object.values(this.occurrences).filter(o => o.isUpcoming);

        if (!upcomingOccurrences || !upcomingOccurrences.length) {
            // We consider the recurring meeting as a past meeting once its last occurrence had passed, i.e.
            // irrespective of the meeting's recurrence end date.
            this.isPast = this.isRecurring || this.end < Date.now();
            return;
        }

        const sortedOccurrences = upcomingOccurrences.sort((a, b) => a.start - b.start);
        this.nextOccurrenceStart = sortedOccurrences[0].start;
        this.nextOccurrenceEnd = sortedOccurrences[0].end;
    }

    async getOccurrences(options) {
        const { from, to, count } = options || {};
        const { meetingsManager } = this.megaChat.plugins;
        const req = {
            a: 'mcsmfo',
            cid: this.chatId,
            ...from && { cf: Math.round(from / 1000) },
            ...to && { ct: Math.round(to / 1000) },
            ...count && { cc: count }
        };

        if (is_chatlink) {
            req.ph = is_chatlink.ph;
            delete req.cid;
        }

        const occurrences = await asyncApiReq(req);
        this.didFetchOccurrences = true;
        if (Array.isArray(occurrences)) {
            if (!options) {
                this.occurrences.clear();
            }
            for (let i = 0; i < occurrences.length; i++) {
                const occurrence = new Occurrence(
                    this.megaChat,
                    { scheduledMeeting: this, ...occurrences[i] }
                );
                this.occurrences.set(occurrence.uid, occurrence);
            }
            this.setNextOccurrence();
            this.megaChat.trigger(meetingsManager.EVENTS.OCCURRENCES_UPDATE, this);
        }
        return this.occurrences;
    }

    getOccurrencesById(occurrenceId) {
        const occurrences = Object.values(this.occurrences.toJS()).filter(o => o.id === occurrenceId);
        return occurrences.length ? occurrences : false;
    }

    initializeFromActionPacket() {
        const { megaChat, isUpcoming, isCanceled, isRecurring, parent } = this;
        if (isUpcoming && isRecurring || parent) {
            return parent ?
                (() => {
                    const occurrences = Object.values(parent.occurrences);
                    if (occurrences.length <= 20) {
                        // Only have the initial fetch so just clear them all and fetch new.
                        return parent.getOccurrences().catch(nop);
                    }
                    // Need to replace the occurrences from where it was to the end of the direction it was moved to
                    // as the order may be different. Don't need to fetch the other way as they shouldn't change
                    occurrences.sort((a, b) => a.start - b.start);
                    const { chatId, start, startInitial } = this;
                    const uid = `${chatId}-${(startInitial || start) / 1000}`;
                    const currentIndex = occurrences.findIndex(o => o.uid === uid);
                    const previous = occurrences[currentIndex - 1];
                    if (!previous) {
                        // Can't find the previous occurrence so just clear and refetch them
                        return parent.getOccurrences().catch(nop);
                    }
                    const movedBack = start <= previous.start;
                    let tmp = 0;
                    let newStart = movedBack ? Date.now() : previous.end;
                    const maxIdx = movedBack ? currentIndex + 1 : occurrences.length;
                    const startIdx = movedBack ? 0 : currentIndex;
                    for (let i = startIdx; i < maxIdx; i++) {
                        // Fetch by chunks of 20 occurrences.
                        if ((++tmp % 20) === 0) {
                            parent.getOccurrences({ from: newStart, to: occurrences[i].end, count: 20 }).catch(dump);
                            newStart = occurrences[i].end;
                            tmp = 0;
                        }
                        parent.occurrences.remove(occurrences[i].uid);
                    }
                    if (tmp) {
                        parent.getOccurrences({
                            from: newStart,
                            count: tmp,
                            to: movedBack ? occurrences[currentIndex].end : occurrences[occurrences.length - 1].end
                        }).catch(dump);
                    }
                })() :
                // Root meeting -- fetch the default list of occurrences based on the meeting's repetition rules, e.g.
                // first 20 occurrences.
                this.getOccurrences().catch(nop);
        }
        megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS[isCanceled ? 'CANCEL' : 'INITIALIZE'], this);
    }

    isSameAsOpts(opts) {
        const { timezone, startDateTime, endDateTime, topic, description, f, recurring } = opts;
        if (this.timezone !== timezone || this.start !== startDateTime || this.end !== endDateTime) {
            return false;
        }
        if (this.title !== topic) {
            return false;
        }
        if (this.description !== description) {
            return false;
        }
        if (this.flags !== f) {
            return false;
        }
        if (!!this.recurring ^ !!recurring) {
            return false;
        }
        if (this.recurring) {
            if (
                this.recurring.frequency !== recurring.frequency
                || this.recurring.interval !== (recurring.interval || 0)
            ) {
                return false;
            }
            if (this.recurring.end !== recurring.end) {
                return false;
            }
            let diff = array.diff(this.recurring.weekDays, recurring.weekDays || []);
            if (diff.removed.length + diff.added.length) {
                return false;
            }
            diff = array.diff(this.recurring.monthDays, recurring.monthDays || []);
            if (diff.removed.length + diff.added.length) {
                return false;
            }
            if (
                Array.isArray(this.recurring.offset) && !Array.isArray(recurring.offset)
                || !Array.isArray(this.recurring.offset) && Array.isArray(recurring.offset)
            ) {
                return false;
            }
            if (
                (this.recurring.offset.value || 0) !== (recurring.offset.value || 0)
                || (this.recurring.offset.weekDay || 0) !== (recurring.offset.weekDay || 0)
            ) {
                return false;
            }
        }
        return true;
    }
}

// --

class MeetingsManager {
    EVENTS = {
        INITIALIZE: 'onMeetingInitialize',
        EDIT: 'onMeetingEdit',
        CANCEL: 'onMeetingCancel',
        LEAVE: 'onMeetingLeave',
        OCCURRENCES_UPDATE: 'onOccurrencesUpdate'
    };

    constructor(megaChat) {
        this.megaChat = megaChat;
        this.scheduledMeetings = megaChat.scheduledMeetings || new MegaDataMap();

        // Three states for unknown occurrences, Don't know (-1), Does exist (0), Doesn't exist (1)
        this._goneOccurrences = {};

        // --

        this.megaChat.rebind(this.EVENTS.CANCEL, ({ data }) => this.archiveMeeting(data));
        this.megaChat.rebind(this.EVENTS.LEAVE, ({ data }) => this.detachMeeting(data));
        this.megaChat.rebind(`${this.EVENTS.OCCURRENCES_UPDATE}.tracker`, ({ data }) => {
            // Handle out of sync action packets for management messages/notifications of occurrences
            // As the action packet is handled before mcsmfo is resolved the state of the occurrence is not always known
            // So as the occurrences that aren't found in memory are received via aps add them to _goneOccurrences
            // Then when the mcsmfo is completed this function will update the map for the occurrences that were fetched
            // Then on the next render of the notification/message it will be more correct.
            // Also needed for occurrences that were regenerated by editing the series after an occurrence was edited
            if (!this._goneOccurrences[data.chatId]) {
                return;
            }
            const { chatId } = data;
            for (const scheduledId of Object.keys(this._goneOccurrences[chatId])) {
                if (this._goneOccurrences[chatId][scheduledId] === -1) {
                    this._goneOccurrences[chatId][scheduledId] = this.scheduledMeetings[scheduledId] ? 0 : 1;
                }
            }
        });
    }

    // @TODO Web push notifications?
    checkForNotifications() {
        const time = Date.now();
        const upcomingMeetings = Object.values(this.scheduledMeetings.toJS()).filter(c => c.isUpcoming);
        for (const meeting of upcomingMeetings) {
            if (pushNotificationSettings.isAllowedForChatId(meeting.chatId)) {
                if (meeting.nextOccurrenceStart >= time + 9e5 && meeting.nextOccurrenceStart <= time + 96e4) {
                    // The next occurrence is at least 15 minutes away but less than 16 minutes away.
                    const ss = Math.floor(meeting.nextOccurrenceStart / 1000);
                    const ns = Math.floor(time / 1000) + 15 * 60;
                    if (ss - ns <= 10) {
                        // Is within 10 secs so dispatch now
                        this.megaChat.trigger('onScheduleUpcoming', meeting);
                    }
                    else {
                        // Sleep the difference and dispatch;
                        tSleep(ss - ns).always(() => {
                            this.megaChat.trigger('onScheduleUpcoming', meeting);
                        });
                    }
                }
                else if (meeting.nextOccurrenceStart >= time && meeting.nextOccurrenceStart < time + 6e4) {
                    // The occurrence starts when the next clock event happens
                    const ss = Math.floor(meeting.nextOccurrenceStart / 1000);
                    const ns = Math.floor(time / 1000);
                    tSleep(ss - ns).always(() => {
                        this.megaChat.trigger('onScheduleStarting', meeting);
                    });
                }
            }
        }
    }

    encodeData(data) {
        return data && base64urlencode(to8(data));
    }

    decodeData(data) {
        return data && from8(base64urldecode(data));
    }

    getMeetingById(meetingId) {
        return this.scheduledMeetings[meetingId];
    }

    getMeetingOrOccurrenceParent(meetingId) {
        const meeting = this.scheduledMeetings[meetingId];
        if (!meeting) {
            return false;
        }
        if (meeting.parentId) {
            return this.getMeetingOrOccurrenceParent(meeting.parentId);
        }
        return meeting;

    }

    getRoomByMeetingId() {
        // [...] TBD
    }

    async createMeeting(meetingInfo) {
        await this.megaChat.createAndShowGroupRoomFor(meetingInfo.participants, meetingInfo.topic, {
            keyRotation: false,
            createChatLink: meetingInfo.link,
            isMeeting: true,
            openInvite: meetingInfo.openInvite,
            waitingRoom: meetingInfo.waitingRoom,
            scheduledMeeting: {
                a: 'mcsmp',
                s: meetingInfo.startDateTime / 1000,
                e: meetingInfo.endDateTime / 1000,
                tz: this.encodeData(meetingInfo.timezone),
                t: this.encodeData(meetingInfo.topic),
                d: this.encodeData(meetingInfo.description),
                f: meetingInfo.sendInvite ? 0x01 : 0x00,
                // [...] TODO: refactor, clean-up, unify w/ `updateMeeting`
                ...meetingInfo.recurring && {
                    r: {
                        f: meetingInfo.recurring.frequency,
                        wd: meetingInfo.recurring.weekDays,
                        md: meetingInfo.recurring.monthDays,
                        mwd: meetingInfo.recurring.offset,
                        ...meetingInfo.recurring.end && {
                            u: meetingInfo.recurring.end / 1000
                        },
                        ...meetingInfo.recurring.interval && { i: meetingInfo.recurring.interval }
                    }
                }
            }
        });
    }

    async updateMeeting(meetingInfo, chatRoom) {
        // [...] TODO: see `getRoomByMeetingId` over `chatRoom` param
        const { scheduledMeeting, chatId, publicLink, options } = chatRoom;
        await megaChat.plugins.chatdIntegration.updateScheduledMeeting(meetingInfo, scheduledMeeting.id, chatId);

        const nextParticipants = meetingInfo.participants;
        const prevParticipants = chatRoom.getParticipantsExceptMe();
        const participantsDiff = JSON.stringify(nextParticipants) !== JSON.stringify(prevParticipants);
        if (participantsDiff) {
            const removed = prevParticipants.filter(h => !nextParticipants.includes(h));
            const added = nextParticipants.filter(h => !prevParticipants.includes(h));

            if (removed.length) {
                for (let i = removed.length; i--;) {
                    chatRoom.trigger('onRemoveUserRequest', [removed[i]]);
                }
            }

            if (added.length) {
                chatRoom.trigger('onAddUserRequest', [added]);
            }
        }

        // Public link
        if (!!meetingInfo.link !== !!publicLink) {
            chatRoom.updatePublicHandle(!meetingInfo.link, meetingInfo.link);
        }

        // Waiting room
        if (meetingInfo.waitingRoom !== options[MCO_FLAGS.WAITING_ROOM]) {
            chatRoom.toggleWaitingRoom();
        }

        // Open invite
        if (meetingInfo.openInvite !== options[MCO_FLAGS.OPEN_INVITE]) {
            chatRoom.toggleOpenInvite();
        }
    }

    cancelMeeting(scheduledMeeting, chatId) {
        // [...] TODO: see `getRoomByMeetingId` over `chatdId` param
        return this.megaChat.plugins.chatdIntegration.cancelScheduledMeeting(scheduledMeeting, chatId);
    }

    deleteMeeting(scheduledMeetingId, chatId) {
        return this.megaChat.plugins.chatdIntegration.deleteScheduledMeeting(scheduledMeetingId, chatId);
    }

    attachMeeting(meetingInfo, fromActionPacket) {
        const chatRoom = meetingInfo.chatRoom || this.megaChat.getChatById(meetingInfo.cid);
        if (chatRoom) {
            const scheduledMeeting = new ScheduledMeeting(
                this.megaChat,
                { chatRoom, ...meetingInfo },
                fromActionPacket
            );
            this.scheduledMeetings.set(meetingInfo.id, scheduledMeeting);
            return scheduledMeeting;
        }
    }

    detachMeeting(scheduledMeeting) {
        if (scheduledMeeting) {
            this.archiveMeeting(scheduledMeeting);
            scheduledMeeting.chatRoom.scheduledMeeting = null;
            this.scheduledMeetings.remove(scheduledMeeting.id);
            if (fmdb) {
                fmdb.del('mcsm', scheduledMeeting.id);
            }
        }
    }

    archiveMeeting(scheduledMeeting) {
        const { chatRoom } = scheduledMeeting;
        // TODO: temp timeout, ping api and remove re: race condition where `mcfpc` is received twice
        // w/ toggled `f` attribute?
        tSleep(2).then(() => chatRoom.hasUserMessages() ? null : chatRoom.archive());
    }

    // --

    // To be used when at the start of a sentence.
    startDayStrings = [
        l.schedule_occur_sun, /* `Sunday` */
        l.schedule_occur_mon, /* `Monday` */
        l.schedule_occur_tue, /* `Tuesday` */
        l.schedule_occur_wed, /* `Wednesday` */
        l.schedule_occur_thu, /* `Thursday` */
        l.schedule_occur_fri, /* `Friday` */
        l.schedule_occur_sat, /* `Saturday` */
    ];
    // To be used when in the middle of a sentence.
    midDayStrings = [
        l.schedule_occur_sun_mid, /* `Sunday` */
        l.schedule_occur_mon_mid, /* `Monday` */
        l.schedule_occur_tue_mid, /* `Tuesday` */
        l.schedule_occur_wed_mid, /* `Wednesday` */
        l.schedule_occur_thu_mid, /* `Thursday` */
        l.schedule_occur_fri_mid, /* `Friday` */
        l.schedule_occur_sat_mid, /* `Saturday` */
    ];

    NOTIF_TITLES = {
        recur: {
            desc: {
                update: l.schedule_notif_update_desc, /* `Updated the description of the following meeting:` */
            },
            name: {
                update: l.schedule_mgmt_title /* `Updated the meeting name from "%1" to "%s"` */
            },
            time: {
                occur: l.schedule_mgmt_update_occur, /* `Updated an occurrence as below:` */
                all: l.schedule_mgmt_update_recur /* `Updated the recurring meeting as below:` */
            },
            convert: l.schedule_mgmt_update_convert_recur, /* `Changed the one-off meeting to a recurring meeting` */
            inv: l.schedule_notif_invite_recur, /* `Invited you to a recurring meeting` */
            multi: l.schedule_notif_update_multi,  /* `Updated the meeting details:` */
            cancel: {
                occur: l.schedule_mgmt_cancel_occur, /* `Cancelled an occurrence` */
                all: l.schedule_mgmt_cancel_recur, /* `Cancelled the recurring meeting and all its occurrences` */
            }
        },
        once: {
            desc: {
                update: l.schedule_notif_update_desc, /* `Updated the description of the following meeting:` */
            },
            name: {
                update: l.schedule_mgmt_title, /* `Updated the meeting name from "%1" to "%s"` */
            },
            time: {
                occur: '',
                all: l.schedule_mgmt_update, /* `Updated the meeting as below:` */
            },
            convert: l.schedule_mgmt_update_convert, /* `Changed the recurring meeting to a one-off meeting` */
            inv: l.schedule_notif_invite, /* `Invited you to a meeting` */
            multi: l.schedule_notif_update_multi, /* `Updated the meeting details:` */
            cancel: {
                occur: '',
                all: l.schedule_mgmt_cancel /* `Cancelled the meeting` */
            },
        },
    };

    // String placeholder replacement rules:
    // %1 = Start time (5:00 pm) localised by toLocaleTime(x)
    // %2 = End time (5:30 pm) localised by toLocaleTime(x)
    // %3 = Start day (30 September 2022) localised by time2date(x, 2)
    // %4 = End day (30 October 2022) localised by time2date(x, 2)
    // %5 = Counter for the specific day in a month (6)
    // %6 = Day date month occurrence (Fri, 30 Sept 2022) localised by time2date(x, 20)
    // %s = Day name (Monday) localised by time2date(x, 11)
    OCCUR_STRINGS = {
        recur: {
            daily: {
                continuous: {
                    /* `Everyday effective %3 from %1 to %2` */
                    occur: l.schedule_recur_time_daily_cont,
                    /* `Every # days effective %3 from %1 to %2` */
                    skip: l.scheduled_recur_time_daily_skip_cont,
                },
                limited: {
                    /* `Everyday effective %3 until %4 from %1 to %2` */
                    occur: l.schedule_recur_time_daily,
                    /* `Every # days effective %3 until %4 from %1 to %2` */
                    skip: l.scheduled_recur_time_daily_skip,
                }
            },
            weekly: {
                continuous: {
                    /* `%s every # week(s) effective %3 from %1 to %2` */
                    list: l.schedule_recur_time_week_cont_list,
                    spec: l.schedule_recur_time_week_cont
                },
                limited: {
                    /* `%s every # week(s) effective %3 until %4 from %1 to %2` */
                    list: l.schedule_recur_time_week_list,
                    spec: l.schedule_recur_time_week
                }
            },
            monthly: {
                continuous: {
                    /* `Day %5 of every # month(s) effective %3 from %1 to %2` */
                    num: l.schedule_recur_time_num_day_month_cont,
                    pos: [
                        [
                            /* `First Sunday of every # month(s) effective %3 from %1 to %2` */
                            l.schedule_recur_time_first_day_month_6_cont,
                            l.schedule_recur_time_first_day_month_0_cont, // Monday
                            l.schedule_recur_time_first_day_month_1_cont, // Tuesday
                            l.schedule_recur_time_first_day_month_2_cont, // Wednesday
                            l.schedule_recur_time_first_day_month_3_cont, // Thursday
                            l.schedule_recur_time_first_day_month_4_cont, // Friday
                            l.schedule_recur_time_first_day_month_5_cont, // Saturday
                        ],
                        [
                            /* `Second Sunday of every # month(s) effective %3 from %1 to %2` */
                            l.schedule_recur_time_second_day_month_6_cont,
                            l.schedule_recur_time_second_day_month_0_cont, // Monday
                            l.schedule_recur_time_second_day_month_1_cont, // Tuesday
                            l.schedule_recur_time_second_day_month_2_cont, // Wednesday
                            l.schedule_recur_time_second_day_month_3_cont, // Thursday
                            l.schedule_recur_time_second_day_month_4_cont, // Friday
                            l.schedule_recur_time_second_day_month_5_cont, // Saturday
                        ],
                        [
                            /* `Third Sunday of every # month(s) effective %3 from %1 to %2` */
                            l.schedule_recur_time_third_day_month_6_cont,
                            l.schedule_recur_time_third_day_month_0_cont, // Monday
                            l.schedule_recur_time_third_day_month_1_cont, // Tuesday
                            l.schedule_recur_time_third_day_month_2_cont, // Wednesday
                            l.schedule_recur_time_third_day_month_3_cont, // Thursday
                            l.schedule_recur_time_third_day_month_4_cont, // Friday
                            l.schedule_recur_time_third_day_month_5_cont, // Saturday
                        ],
                        [
                            /* `Fourth Sunday of every # month(s) effective %3 from %1 to %2` */
                            l.schedule_recur_time_fourth_day_month_6_cont,
                            l.schedule_recur_time_fourth_day_month_0_cont, // Monday
                            l.schedule_recur_time_fourth_day_month_1_cont, // Tuesday
                            l.schedule_recur_time_fourth_day_month_2_cont, // Wednesday
                            l.schedule_recur_time_fourth_day_month_3_cont, // Thursday
                            l.schedule_recur_time_fourth_day_month_4_cont, // Friday
                            l.schedule_recur_time_fourth_day_month_5_cont, // Saturday
                        ],
                        [
                            /* `Fifth Sunday of every # month(s) effective %3 from %1 to %2` */
                            l.schedule_recur_time_fifth_day_month_6_cont,
                            l.schedule_recur_time_fifth_day_month_0_cont, // Monday
                            l.schedule_recur_time_fifth_day_month_1_cont, // Tuesday
                            l.schedule_recur_time_fifth_day_month_2_cont, // Wednesday
                            l.schedule_recur_time_fifth_day_month_3_cont, // Thursday
                            l.schedule_recur_time_fifth_day_month_4_cont, // Friday
                            l.schedule_recur_time_fifth_day_month_5_cont, // Saturday
                        ],
                    ],
                    last: [
                        /* `Last Sunday of every # month(s) effective %3 from %1 to %2` */
                        l.schedule_recur_time_fifth_day_month_6_cont,
                        l.schedule_recur_time_fifth_day_month_0_cont, // Monday
                        l.schedule_recur_time_fifth_day_month_1_cont, // Tuesday
                        l.schedule_recur_time_fifth_day_month_2_cont, // Wednesday
                        l.schedule_recur_time_fifth_day_month_3_cont, // Thursday
                        l.schedule_recur_time_fifth_day_month_4_cont, // Friday
                        l.schedule_recur_time_fifth_day_month_5_cont, // Saturday
                    ]
                },
                limited: {
                    /* `Day %5 of every # month(s) effective %3 until %4 from %1 to %2` */
                    num: l.schedule_recur_time_num_day_month,
                    pos: [
                        [
                            /* `First Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                            l.schedule_recur_time_first_day_month_6,
                            l.schedule_recur_time_first_day_month_0, // Monday
                            l.schedule_recur_time_first_day_month_1, // Tuesday
                            l.schedule_recur_time_first_day_month_2, // Wednesday
                            l.schedule_recur_time_first_day_month_3, // Thursday
                            l.schedule_recur_time_first_day_month_4, // Friday
                            l.schedule_recur_time_first_day_month_5, // Saturday
                        ],
                        [
                            /* `Second Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                            l.schedule_recur_time_second_day_month_6,
                            l.schedule_recur_time_second_day_month_0, // Monday
                            l.schedule_recur_time_second_day_month_1, // Tuesday
                            l.schedule_recur_time_second_day_month_2, // Wednesday
                            l.schedule_recur_time_second_day_month_3, // Thursday
                            l.schedule_recur_time_second_day_month_4, // Friday
                            l.schedule_recur_time_second_day_month_5, // Saturday
                        ],
                        [
                            /* `Third Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                            l.schedule_recur_time_third_day_month_6,
                            l.schedule_recur_time_third_day_month_0, // Monday
                            l.schedule_recur_time_third_day_month_1, // Tuesday
                            l.schedule_recur_time_third_day_month_2, // Wednesday
                            l.schedule_recur_time_third_day_month_3, // Thursday
                            l.schedule_recur_time_third_day_month_4, // Friday
                            l.schedule_recur_time_third_day_month_5, // Saturday
                        ],
                        [
                            /* `Fourth Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                            l.schedule_recur_time_fourth_day_month_6,
                            l.schedule_recur_time_fourth_day_month_0, // Monday
                            l.schedule_recur_time_fourth_day_month_1, // Tuesday
                            l.schedule_recur_time_fourth_day_month_2, // Wednesday
                            l.schedule_recur_time_fourth_day_month_3, // Thursday
                            l.schedule_recur_time_fourth_day_month_4, // Friday
                            l.schedule_recur_time_fourth_day_month_5, // Saturday
                        ],
                        [
                            /* `Fifth Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                            l.schedule_recur_time_fifth_day_month_6,
                            l.schedule_recur_time_fifth_day_month_0, // Monday
                            l.schedule_recur_time_fifth_day_month_1, // Tuesday
                            l.schedule_recur_time_fifth_day_month_2, // Wednesday
                            l.schedule_recur_time_fifth_day_month_3, // Thursday
                            l.schedule_recur_time_fifth_day_month_4, // Friday
                            l.schedule_recur_time_fifth_day_month_5, // Saturday
                        ],
                    ],
                    last: [
                        /* `Last Sunday of every # month(s) effective %3 until %4 from %1 to %2` */
                        l.schedule_recur_time_last_day_month_6,
                        l.schedule_recur_time_last_day_month_0, // Monday
                        l.schedule_recur_time_last_day_month_1, // Tuesday
                        l.schedule_recur_time_last_day_month_2, // Wednesday
                        l.schedule_recur_time_last_day_month_3, // Thursday
                        l.schedule_recur_time_last_day_month_4, // Friday
                        l.schedule_recur_time_last_day_month_5, // Saturday
                    ]
                }
            },
            [ScheduleMetaChange.MODE.CANCELLED]: {
                /* `%s from %1 to %2` */
                occur: l.schedule_occurrence_time,
                all: '',
            }
        },
        once: {
            [ScheduleMetaChange.MODE.CREATED]: {
                /* `%s from %1 to %2` */
                occur: l.schedule_occurrence_time,
            },
            [ScheduleMetaChange.MODE.EDITED]: {
                /* `%6 from %1 to %2` */
                occur: l.schedule_occurrence_time_recur,
            },
            [ScheduleMetaChange.MODE.CANCELLED]: {
                occur: '',
            }
        },
    };

    /**
     * Returns the appropriate scheduled meeting parsed string(s) for the given meta with values as appropriate
     *
     * @param {object} meta The meta object for the meeting
     * @see getFormattingMeta
     * @returns {*[]} The string(s) selected and formatted as appropriate
     */
    getOccurrenceStrings(meta) {
        const res = [];
        const { prevTiming, timeRules, mode, occurrence, recurring, converted } = meta;
        const { MODE } = ScheduleMetaChange;
        if (!mode) {
            return res;
        }

        const { OCCUR_STRINGS } = this;

        let string;
        if (recurring) {
            res.push(this._parseOccurrence(timeRules, mode, occurrence));
            if (prevTiming && !(occurrence && mode === MODE.CANCELLED)) {
                res.push(this._parseOccurrence(prevTiming, mode, occurrence));
            }
        }
        else {
            const { startTime, endTime } = timeRules;
            string = OCCUR_STRINGS.once[mode].occur;
            res.push(
                string
                    .replace('%1', toLocaleTime(startTime))
                    .replace('%2', toLocaleTime(endTime))
                    .replace('%6', time2date(startTime, 20))
                    .replace('%s', time2date(startTime, 11))
            );
            if (prevTiming) {
                const { startTime: pStartTime, endTime: pEndTime } = prevTiming;
                if (converted) {
                    res.push(this._parseOccurrence(prevTiming, mode, occurrence));
                }
                else {
                    res.push(
                        string
                            .replace('%1', toLocaleTime(pStartTime))
                            .replace('%2', toLocaleTime(pEndTime))
                            .replace('%6', time2date(pStartTime, 20))
                            .replace('%s', time2date(pStartTime, 11))
                    );
                }
            }
        }

        return res;
    }

    _parseOccurrence(timeRules, mode, occurrence) {
        const { startTime, endTime, days, dayInt, interval, month, recurEnd, skipDay } = timeRules;
        const { recur, once } = this.OCCUR_STRINGS;
        const occurrenceEnd = recurEnd ? 'limited' : 'continuous';

        let string = '';
        if (recur[mode]) {
            return occurrence
                ? recur[mode].occur
                    .replace('%1', toLocaleTime(startTime))
                    .replace('%2', toLocaleTime(endTime))
                    .replace('%s', time2date(startTime, 11))
                : recur[mode].all;
        }
        else if (month) {
            // What position in the month, the day of the occurrence, how many months apart
            const { count, occur } = month;
            string =
                count < 0
                    ? mega.icu.format(recur.monthly[occurrenceEnd].last[occur], interval)
                    : mega.icu.format(recur.monthly[occurrenceEnd].pos[count][occur], interval);
            return string
                .replace('%1', toLocaleTime(startTime))
                .replace('%2', toLocaleTime(endTime))
                .replace('%3', time2date(startTime, 2))
                .replace('%4', time2date(recurEnd, 2));
        }
        else if (days) {
            // Weekdays for a meeting
            if (days.length > 1) {
                if (days.length === 7) {
                    return recur.daily[occurrenceEnd].occur
                        .replace('%1', toLocaleTime(startTime))
                        .replace('%2', toLocaleTime(endTime))
                        .replace('%3', time2date(startTime, 2))
                        .replace('%4', time2date(recurEnd, 2));
                }
                const weekDays = days.map((day, idx) => {
                    if (idx) {
                        return this.midDayStrings[day];
                    }
                    return this.startDayStrings[day];
                });
                string = mega.icu.format(recur.weekly[occurrenceEnd].list, interval);
                string = mega.utils.trans.listToString(weekDays, string);
            }
            else {
                string = mega.icu.format(recur.weekly[occurrenceEnd].spec, interval)
                    .replace('%s', this.startDayStrings[days[0]]);
            }
            return string
                .replace('%1', toLocaleTime(startTime))
                .replace('%2', toLocaleTime(endTime))
                .replace('%3', time2date(startTime, 2))
                .replace('%4', time2date(recurEnd, 2));
        }
        else if (dayInt) {
            string = mega.icu.format(recur.monthly[occurrenceEnd].num, interval);
            return string
                .replace('%1', toLocaleTime(startTime))
                .replace('%2', toLocaleTime(endTime))
                .replace('%3', time2date(startTime, 2))
                .replace('%4', time2date(recurEnd, 2))
                .replace('%5', dayInt);
        }
        else if (skipDay) {
            string = mega.icu.format(recur.daily[occurrenceEnd].skip, interval);
            return string
                .replace('%1', toLocaleTime(startTime))
                .replace('%2', toLocaleTime(endTime))
                .replace('%3', time2date(startTime, 2))
                .replace('%4', time2date(recurEnd, 2));
        }

        string = once[mode].occur;
        return string
            .replace('%1', toLocaleTime(startTime))
            .replace('%2', toLocaleTime(endTime))
            .replace('%6', time2date(startTime, 20))
            .replace('%s', time2date(startTime, 11));
    }

    /**
     * Returns an object based on the action packet/management message for a scheduled meeting update
     *
     * If there is a change set the fixed values of the change set will be used
     * If there is not a change set the current values of the meeting/occurrence will be used
     *
     * Object:
     * {
     *     timeRules: {
     *          // The current time rules for the meeting/occurrence. Includes parsed recurring info if relevant
     *          startTime: 'The start time of the occurrence/scheduled meeting',
     *          endTime: 'The end time of the occurrence/scheduled meeting',
     *          [recurEnd]: 'The time the recurring series ends or false',
     *          [interval]: 'The interval between occurrences',
     *          [days]: [ // The week day numbers (0-6 Sun-Sat) the occurrence falls on],
     *          [dayInt]: 'The first of the specific days of a month the occurrence falls on',
     *          [month]: {
     *              // The first of the xth day of each month the occurrence falls on
     *              count: 'The position in the month (1st - 5th)',
     *              occur: 'The day (0-6 Sun-Sat)',
     *          }
     *     },
     *     [prevTiming]: {
     *          // Optional object for the previous timing of the scheduled meeting/occurrence. Same format as above
     *     },
     *     handle: 'The handle for the scheduled meeting that generated this message',
     *     mode: 'Value from ScheduleMetaChange.MODE to indicate the action that generated this message',
     *     recurring: 'Boolean if the meeting is currently a recurring meeting',
     *     occurrence: 'Boolean if this is related to an occurrence or the whole series',
     *     cid: 'The chat room id the meeting belongs to',
     *     [description]: 'Boolean if the description has changed',
     *     [topic]: 'The new topic if changed',
     *     [oldTopic]: 'The previous topic if the new topic is different',
     *     [topicChange]: 'Boolean if the title changed',
     *     [onlyTitle]: 'Boolean if the title is the only field that changed in the meeting',
     *     [calendar]: {
     *         // Object for calendar widget render
     *         date: 'The date (e.g: 20) for the occurrence/scheduled meeting start time',
     *         month: 'The month string for the occurrence/scheduled meeting start time'
     *     },
     *     [gone]: 'Boolean if this is for an occurrence that no longer exists',
     * }
     *
     * @see noCsMeta
     * @param {string} scheduledId The scheduled meeting id for the management message/action packet
     * @param {object} data Management message/action packet content
     * @param {ChatRoom} chatRoom The chat room related to the management message/action packet
     * @returns {object} Meta object for formatting notifications/titles/management messages. Attributes as above
     */
    getFormattingMeta(scheduledId, data, chatRoom) {
        const { MODE } = ScheduleMetaChange;
        const meta = {
            userId: data.sender || false,
            timeRules: {},
            mode: MODE.EDITED,
            handle: scheduledId,
            cid: chatRoom.chatId,
        };

        // Is there a change set
        const changeSet = data.schedChange || data.cs || false;

        if (changeSet) {
            const { s, e, c, r, t, d: desc } = changeSet;

            let onlyTitle = typeof t !== 'undefined';

            if (Array.isArray(c) && c[1]) {
                meta.mode = MODE.CANCELLED;
            }

            if (Array.isArray(s)) {
                meta.prevTiming = {
                    startTime: s[0],
                };
                meta.timeRules.startTime = s[1] || s[0];
            }
            const meeting = this.getMeetingOrOccurrenceParent(scheduledId);
            if (Array.isArray(e)) {
                if (!meta.prevTiming) {
                    // Handling for historic messages that don't have the `s` field but `e` is present.
                    // Assume start time of the meeting has not changed from the default
                    meta.prevTiming = {
                        startTime: meeting ? Math.floor(meeting.start / 1000) : 0,
                    };
                    meta.timeRules.startTime = meta.prevTiming.startTime;
                }
                meta.prevTiming.endTime = e[0];
                meta.timeRules.endTime = e[1] || e[0];
                onlyTitle = false;
            }

            if (desc) {
                meta.description = true;
                onlyTitle = false;
            }

            if (Array.isArray(r)) {
                const parseR = r => r ? typeof r === 'string' ? JSON.parse(r) : r : false;
                const prev = parseR(r[0]);
                const next = parseR(r[1]);

                if (r.length === 1) {
                    meta.converted = false;
                    meta.timeRules = this._recurringTimings(prev, meta.timeRules || {});
                    meta.prevTiming = this._recurringTimings(prev, meta.prevTiming);
                    meta.recurring = r[0] !== '';
                }
                else {
                    meta.converted = !!(!!prev ^ !!next);
                    if (prev) {
                        meta.prevTiming = this._recurringTimings(prev, meta.prevTiming || {});
                    }
                    meta.timeRules = this._recurringTimings(next, meta.timeRules || {});
                    meta.recurring = next !== false;
                }
                onlyTitle = false;
            }

            if (!meeting || meeting.id !== scheduledId) {
                // Likely an occurrence
                // Don't try pull data from the meeting object that might not exist. Let the renderer handle it instead.
                meta.occurrence = true;
                meta.recurring = true;
            }

            if (Array.isArray(t)) {
                meta.topicChange = true;
                meta.onlyTitle = onlyTitle;
                meta.topic = this.decodeData(t[1]);
                meta.oldTopic = this.decodeData(t[0]);
            }
            return meta;
        }

        return this.noCsMeta(scheduledId, data, chatRoom);
    }

    _recurringTimings(meta, obj) {
        if (!meta) {
            return obj;
        }

        obj.recurEnd = meta.u || false;
        obj.interval = meta.i || 1;

        if (meta.wd) {
            obj.days = meta.wd.sort((a, b) => a - b).map(wd => wd === 7 ? 0 : wd);
        }

        if (meta.md) {
            obj.dayInt = meta.md[0];
        }

        if (meta.mwd) {
            // The mwd option supports multiple but the designs support only one
            obj.month = meta.mwd.map(oc => {
                return {
                    count: (oc[0] || 1) - 1,
                    occur: oc[1] ? oc[1] === 7 ? 0 : oc[1] : 1,
                };
            })[0];
        }

        if (meta.f === 'd' && meta.i > 1) {
            obj.skipDay = true;
        }
        else if (meta.f === 'd' && meta.i === 1) {
            obj.days = [1, 2, 3, 4, 5, 6, 0];
        }

        return obj;
    }

    /**
     * Create a formatting meta based on the current state of the meeting. This happens as the message/ap doesn't
     * have a change set so the content will vary based on the state at the time this is called.
     *
     * @see getFormattingMeta
     * @param {string} scheduledId The scheduled meeting id for the management message/action packet
     * @param {object} data Management message/action packet content
     * @param {ChatRoom} chatRoom The chat room related to the management message/action packet
     * @returns {object} Meta object for formatting notifications/titles/management messages
     */
    noCsMeta(scheduledId, data, chatRoom) {
        const meta = {
            timeRules: {},
            userId: data.sender || false,
            ap: data,
            handle: scheduledId,
            cid: chatRoom.chatId,
        };
        // We need the meeting object to pull data from.
        // Check if it exists and if not it is probably a missing occurrence that will be fetched later
        if (!this.getMeetingOrOccurrenceParent(scheduledId) && !chatRoom.scheduledMeeting) {
            const res = this._checkOccurrenceAwait(chatRoom, scheduledId, meta);
            if (res) {
                return res;
            }
        }

        const meeting = this.getMeetingOrOccurrenceParent(scheduledId) || chatRoom.scheduledMeeting;
        assert(meeting, `Invalid scheduled meeting state for ${scheduledId} msg`);

        const toS = ms => Math.floor(ms / 1000);

        const { MODE } = ScheduleMetaChange;

        meta.timeRules.startTime = toS(meeting.start);
        meta.timeRules.endTime = toS(meeting.end);
        meta.topic = meeting.title;
        meta.recurring = !!meeting.recurring;

        meta.mode = meeting.canceled ? MODE.CANCELLED : MODE.CREATED;
        meta.occurrence = meta.recurring && meeting.id !== scheduledId;
        if (!meta.occurrence && !meeting.canceled) {
            meta.mode = MODE.CREATED;
        }

        const cal = ms => {
            const date = new Date(ms);
            return {
                date: date.getDate(),
                month: time2date(toS(ms), 12)
            };
        };

        if (meta.occurrence) {
            // Something happened with an occurrence
            const occurrences = meeting.getOccurrencesById(scheduledId);
            if (!occurrences) {
                meta.mode = MODE.EDITED; // Fake as EDITED until the update is confirmed.
                const res = this._checkOccurrenceAwait(chatRoom, scheduledId, meta);
                if (res) {
                    return res;
                }
                // In this case the occurrence may be known but not updated on the scheduledMeeting via mcsmfo
                meta.ap = data;
                return meta;
            }
            meta.mode = occurrences.some(o => o.canceled) ? MODE.CANCELLED : MODE.EDITED;
            meta.calendar = cal(occurrences[0].start);
            // How long the meeting originally would have been
            const timeDiff = meta.timeRules.endTime - meta.timeRules.startTime;
            meta.timeRules.startTime = toS(occurrences[0].start);
            meta.timeRules.endTime = toS(occurrences[0].end);
            if (occurrences.length === 1 && occurrences[0].startInitial) {
                meta.prevTiming = {
                    startTime: toS(occurrences[0].startInitial),
                };
                meta.prevTiming.endTime = meta.prevTiming.startTime + timeDiff;
            }
        }
        else if (meta.recurring) {
            // Created a recurring meeting
            const { end, weekDays = [], interval, monthDays = [], offset, frequency } = meeting.recurring;
            meta.recurring = true;
            meta.timeRules.recurEnd = end ? toS(end) : false;
            meta.timeRules.interval = interval || 1;

            if (frequency === 'd' && interval > 1) {
                meta.timeRules.skipDay = true;
            }
            else if (frequency === 'd' && interval === 1) {
                meta.timeRules.days = [1, 2, 3, 4, 5, 6, 0];
            }

            if (weekDays.length) {
                // Sort into Mon-Sun order then fix index for strings
                meta.timeRules.days = weekDays.sort((a, b) => a - b).map(wd => wd === 7 ? 0 : wd);
            }

            if (monthDays.length) {
                meta.timeRules.dayInt = monthDays[0];
            }

            if (!Array.isArray(offset)) {
                meta.timeRules.month = {
                    count: (offset.value || 1) - 1,
                    // Fix Sunday to 0 for string indexing
                    occur: offset.weekDay ? offset.weekDay === 7 ? 0 : offset.weekDay : 1
                };
            }
            meta.calendar = cal(meeting.start);
        }
        else {
            // Create a scheduled meeting
            meta.calendar = cal(meeting.start);
        }

        if (!meta.occurrence && meeting.canceled && $.len(meta.timeRules)) {
            // Edge case in cancelled meetings where the first message shows as cancelled when it should be created.
            meta.mode = MODE.CREATED;
        }


        // Got a complete packet so remove the ap field
        delete meta.ap;
        return meta;
    }

    _checkOccurrenceAwait(chatRoom, scheduledId, meta) {
        if (!this._goneOccurrences[chatRoom.chatId]) {
            this._goneOccurrences[chatRoom.chatId] = {};
        }
        if (typeof this._goneOccurrences[chatRoom.chatId][scheduledId] === 'undefined') {
            // Haven't seen this occurrence before so skip for now with the ap flag.
            this._goneOccurrences[chatRoom.chatId][scheduledId] = -1;
            return meta;
        }
        const datum = this._goneOccurrences[chatRoom.chatId];
        if (datum[scheduledId] === -1) {
            // Listener still hasn't noticed this occurrence so continue to skip with the ap flag.
            return meta;
        }
        else if (datum[scheduledId] === 1) {
            // This meeting no longer exists so indicate it is gone
            meta.gone = true;
            return meta;
        }
        return false;
    }

    /**
     * Fuzzy object comparison w/o JSON.stringify
     *
     * e.g: {
     *     a: [2, 3, 5],
     *     b: 'test'
     * }
     * will test the same as {
     *     a: [3, 2, 5],
     *     b: 'test'
     * }
     * @see MeetingsManager.getFormattingMeta
     * @param {object} obj1 First object
     * @param {object} obj2 Second object
     * @returns {boolean} If they are the same
     */

    areMetaObjectsSame(obj1, obj2) {
        if (obj1 && !obj2 || !obj1 && obj2) {
            return false;
        }
        const keys = Object.keys(obj1);
        if (keys.length !== $.len(obj2)) {
            return false;
        }
        const diff = array.diff(keys, Object.keys(obj2));
        if (diff.removed.length + diff.added.length) {
            return false;
        }
        for (const key of keys) {
            if (!obj2.hasOwnProperty(key)) {
                return false;
            }
            if (obj1[key] instanceof Object && obj2[key] instanceof Object) {
                if (!this.areMetaObjectsSame(obj1[key], obj2[key])) {
                    return false;
                }
            }
            else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
                const keyDiff = array.diff(obj1[key], obj2[key]);
                if (keyDiff.removed.length + keyDiff.added.length) {
                    return false;
                }
            }
            else if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
        return true;
    }
}

export default MeetingsManager;
window.MeetingsManager = MeetingsManager;
