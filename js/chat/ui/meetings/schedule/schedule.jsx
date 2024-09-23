import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';
import Invite from './invite.jsx';
import { getTimeIntervals, getNearestHalfHour, getUserTimezone, addMonths } from './helpers.jsx';
import Recurring from './recurring.jsx';
import { DateTime } from './datetime.jsx';
import { MCO_FLAGS } from '../../../chatRoom.jsx';
import { ParsedHTML } from '../../../../ui/utils';

export class Schedule extends MegaRenderMixin {
    static NAMESPACE = 'schedule-dialog';
    static dialogName = `meetings-${Schedule.NAMESPACE}`;

    wrapperRef = React.createRef();
    scheduledMeetingRef = null;
    localStreamRef = '.float-video';
    datepickerRefs = [];

    incomingCallListener = 'onPrepareIncomingCallDialog.scheduleDialog';
    ringingStoppedListener = 'onRingingStopped.scheduleDialog';

    interval = ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    nearestHalfHour = getNearestHalfHour();

    state = {
        topic: '',
        startDateTime: this.nearestHalfHour,
        endDateTime: this.nearestHalfHour + this.interval,
        timezone: getUserTimezone(),
        recurring: false,
        participants: [],
        link: false,
        sendInvite: false,
        waitingRoom: false,
        openInvite: false,
        description: '',

        closeDialog: false,
        isEdit: false,
        isDirty: false,
        isLoading: false,
        topicInvalid: false,
        invalidTopicMsg: '',
        descriptionInvalid: false,
        overlayed: false,
    };

    /**
     * syncPublicLink
     * @description Sets the `link` state property based on the current chat's `publicLink` field.
     * @return {void} void
     */

    syncPublicLink() {
        if (this.state.isEdit) {
            const {chatRoom} = this.props;

            chatRoom.updatePublicHandle()
                .then(() => this.isMounted() && this.setState({link: !!chatRoom.publicLink}))
                .catch(dump);
        }
    }

    /**
     * getFilteredTimeIntervals
     * @description Returns filtered time intervals for the passed timestamp, incl. optionally a duration string
     * for each of the generated intervals based on passed additional offset timestamp. Time intervals
     * prior `Date.now()` are filtered out.
     *
     * ex.:
     * const now = offset = Date.now();
     * time2date(now / 1000) -> `10/28/2022, 14:38`
     *
     *  getFilteredTimeIntervals(now, offset)
     * [
     *     {value: 1666958411784, label: '15:00', duration: 1440000},
     *     {value: 1666960211784, label: '15:30', duration: 3240000},
     *     {value: 1666962023055, label: '16:00', duration: 4980000},
     *     {value: 1666963823055, label: '16:30', duration: 6780000}
     *     ...
     * ]
     *
     * @param {number} timestamp Timestamp to generate intervals based on
     * @param {number} [offsetFrom] Timestamp used as offset to generate duration strings
     * @see getTimeIntervals
     * @return [{ value: number, label: string, duration: number }] Filtered time intervals
     */

    getFilteredTimeIntervals(timestamp, offsetFrom) {
        const timeIntervals = getTimeIntervals(timestamp, offsetFrom);

        // Editing a past scheduled meeting -> include all available time intervals, e.g. including past ones
        const { end } = this.scheduledMeetingRef || {};
        if (this.state.isEdit && end < Date.now()) {
            return timeIntervals;
        }

        // New scheduled meeting -> only show time intervals forward from now
        return timeIntervals.filter(o => {
            return offsetFrom ? o.value > this.nearestHalfHour : o.value > Date.now();
        });
    }

    /**
     * onTopicChange
     * @param value
     * [...] TODO: add documentation
     */

    onTopicChange = value => {
        if (value.length > ChatRoom.TOPIC_MAX_LENGTH) {
            /* `Enter fewer than 30 characters` */
            this.setState({ invalidTopicMsg: l.err_schedule_title_long, topicInvalid: true });
            value = value.substring(0, ChatRoom.TOPIC_MAX_LENGTH);
        }
        else if (value.length === 0) {
            /* `Meeting name is required` */
            this.setState({ invalidTopicMsg: l.schedule_title_missing, topicInvalid: true });
        }
        else if (this.state.invalidTopicMsg) {
            this.setState({ invalidTopicMsg: '', topicInvalid: false });
        }
        this.handleChange('topic', value);
    };

    /**
     * onTextareaChange
     * @param value
     * [...] TODO: add documentation
     */

    onTextareaChange = value => {
        const maxLength = 3000;
        if (value.length > maxLength) {
            this.setState({ descriptionInvalid: true });
            value = value.substring(0, maxLength);
        }
        else if (this.state.descriptionInvalid) {
            this.setState({ descriptionInvalid: false });
        }
        this.handleChange('description', value);
    };

    /**
     * onStartDateSelect
     * [...] TODO: add documentation
     */

    onStartDateSelect = () => {
        this.datepickerRefs.endDateTime.selectDate(new Date(this.state.startDateTime + this.interval));
    };

    /**
     * onEndDateSelect
     * [...] TODO: add documentation
     */

    onEndDateSelect = () => {
        const { startDateTime, endDateTime } = this.state;
        if (endDateTime < startDateTime) {
            if (endDateTime < Date.now()) {
                return this.setState({ endDateTime: startDateTime + this.interval });
            }
            this.datepickerRefs.startDateTime.selectDate(new Date(endDateTime - this.interval));
        }
    };

    // --

    /**
     * handleToggle
     * @description Updates conditionally the state based on the passed `prop`. See checkbox and toggle components,
     * e.g. `recurring`, `link`, `sendInvite`, etc.
     * @param {string} prop State property to update
     * @return {false|void}
     */

    handleToggle = prop => {
        return Object.keys(this.state).includes(prop) &&
            this.setState(state => ({ [prop]: !state[prop], isDirty: true }));
    };

    /**
     * handleChange
     * @description Updates the state based on the passed `props` and `value`. See text inputs and textarea components,
     * e.g. `topic`, `description`.
     * @param {string} prop State property to update
     * @param {string|number} value The value being assigned to the given state prop
     * @return {false|void}
     */

    handleChange = (prop, value) => {
        return Object.keys(this.state).includes(prop) && this.setState({ [prop]: value, isDirty: true });
    };

    /**
     * handleDateSelect
     * @description Handles the date selection on the `Datepicker` components; sets the
     * `startDateTime` and `endDateTime` conditionally, marks the form as updated. Optionally invokes passed callback
     * function, e.g. to sync the `Datepicker` instances.
     * @param {number} [startDateTime] Timestamp in milliseconds for the `startDateTime` state prop
     * @param {number} [endDateTime] Timestamp in milliseconds for the `endDateTime` state prop
     * @param {function} [callback] Optional `setState` callback; used to sync the `Datepicker` components, e.g.
     * when `startDateTime` > `endDateTime` or `endDateTime` < `startDateTime`.
     * @see Datepicker
     * @return {void}
     */

    handleDateSelect = ({ startDateTime, endDateTime }, callback) => {
        this.setState(
            state => ({
                startDateTime: startDateTime || state.startDateTime,
                endDateTime: endDateTime || state.endDateTime,
                isDirty: true
            }),
            () => {
                // Sync the recurring `End` field based on the selected start date for the main meeting
                const { recurring } = this.state;
                if (recurring && recurring.end) {
                    const recurringEnd = addMonths(this.state.startDateTime, 6);
                    this.datepickerRefs.recurringEnd.selectDate(new Date(recurringEnd));
                }

                if (callback) {
                    callback();
                }
            }
        );
    };

    /**
     * handleTimeSelect
     * @description Handles the time selection on the `Select` components; sets the `startDateTime` and `endDateTime`
     * and marks the form as updated. Conditionally increments or decrements 30 minutes when the selected
     * `startDateTime` > `endDateTime` or `endDateTime` < `startDateTime`.
     * @param {number} [startDateTime] Timestamp in milliseconds for the `startDateTime` state prop
     * @param {number} [endDateTime] Timestamp in milliseconds for the `endDateTime` state prop
     * @see Select
     * @return {void}
     */

    handleTimeSelect = ({ startDateTime, endDateTime }) => {
        startDateTime = startDateTime || this.state.startDateTime;
        endDateTime = endDateTime || this.state.endDateTime;

        this.setState(state => {
            return {
                startDateTime: endDateTime <= state.startDateTime ? endDateTime - this.interval : startDateTime,
                endDateTime: startDateTime >= state.endDateTime ? startDateTime + this.interval : endDateTime,
                isDirty: true
            };
        });
    };

    /**
     * handleParticipantSelect
     * @description Updates the state based on added and/or removed set of participant user handles.
     * @param {String[]} participants User handles of the selected participants
     * @see Invite
     * @return {void}
     */

    handleParticipantSelect = participants => {
        return (
            participants &&
            Array.isArray(participants) &&
            this.setState({ participants, isDirty: true }, () => {
                const wrapperRef = this.wrapperRef && this.wrapperRef.current;
                if (wrapperRef) {
                    wrapperRef.reinitialise();
                }
            })
        );
    };

    // --

    /**
     * handleSubmit
     * @description Creates a new scheduled meeting based on the selected options. Alternatively,
     * assuming `chatRoom` is present -- updates the current one.
     * @return {void}
     */

    handleSubmit = () => {
        if (this.state.topic) {
            return (
                this.setState(
                    { isLoading: true },
                    async() => {
                        const { chatRoom, onClose } = this.props;
                        const params = [this.state, chatRoom];
                        if (chatRoom) {
                            delay('chat-event-sm-edit-meeting', () => eventlog(99923));
                        }
                        else {
                            delay('chat-event-sm-button-create', () => eventlog(99922));
                        }
                        delay('chat-events-sm-settings', () => this.submitStateEvents({ ...this.state }));

                        await megaChat.plugins.meetingsManager[chatRoom ? 'updateMeeting' : 'createMeeting'](...params);
                        this.setState({ isLoading: false }, () => onClose());
                    })
            );
        }

        /* `Meeting name is required` */
        return this.setState({ topicInvalid: true, invalidTopicMsg: l.schedule_title_missing });
    };

    /**
     * Event logs after completing the scheduled meeting create/edit flow
     *
     * @param state
     */
    submitStateEvents(state) {
        if (state.link) {
            eventlog(500162);
        }
        if (state.sendInvite) {
            eventlog(500163);
        }
        if (state.waitingRoom) {
            eventlog(500164);
        }
        if (state.openInvite) {
            eventlog(500165);
        }
        if (state.description) {
            eventlog(500166);
        }
        if (state.recurring) {
            eventlog(500167);
        }
        else {
            eventlog(500168);
        }
        eventlog(500169, state.topic.length);
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        if ($.dialog === Schedule.dialogName) {
            closeDialog();
        }

        [document, this.localStreamRef].map(el => $(el).unbind(`.${Schedule.NAMESPACE}`));
        megaChat.off(this.incomingCallListener);
    }

    componentWillMount() {
        const { chatRoom } = this.props;
        if (chatRoom) {
            const { scheduledMeeting, publicLink, options } = chatRoom;

            this.state.topic = scheduledMeeting.title;
            this.state.startDateTime = scheduledMeeting.start;
            this.state.endDateTime = scheduledMeeting.end;
            this.state.timezone = scheduledMeeting.timezone || getUserTimezone();
            this.state.recurring = scheduledMeeting.recurring;
            this.state.participants = chatRoom.getParticipantsExceptMe();
            this.state.link = !!publicLink;
            this.state.description = scheduledMeeting.description || '';
            this.state.sendInvite = scheduledMeeting.flags;
            this.state.waitingRoom = options[MCO_FLAGS.WAITING_ROOM];
            this.state.openInvite = options[MCO_FLAGS.OPEN_INVITE];
            this.state.isEdit = true;

            this.scheduledMeetingRef = scheduledMeeting;
        }
    }

    componentDidMount() {
        super.componentDidMount();
        this.syncPublicLink();

        if ($.dialog === 'onboardingDialog') {
            closeDialog();
        }

        M.safeShowDialog(Schedule.dialogName, () => {
            if (!this.isMounted()) {
                throw new Error(`${Schedule.dialogName} dialog: component ${Schedule.NAMESPACE} not mounted.`);
            }

            // Invoke submit on hitting enter, excl. while typing in the `description` text area or
            // if the confirmation dialog is currently shown
            $(document).rebind(`keyup.${Schedule.NAMESPACE}`, ({ keyCode, target }) => {
                return this.state.closeDialog || target instanceof HTMLTextAreaElement ?
                    null :
                    keyCode === 13 /* Enter */ && this.handleSubmit();
            });

            // Clicked on the `Local` component (the call's mini view) while the `Schedule meeting`
            // dialog is opened -> ask for close confirmation if any changes have been done or close the dialog
            // immediately
            $(this.localStreamRef).rebind(`click.${Schedule.NAMESPACE}`, () => {
                if (this.state.isDirty) {
                    this.handleToggle('closeDialog');
                    return false;
                }
            });

            // Manually handle the stacking of dialogs when receiving incoming call -- mark `Schedule` as overlayed,
            // if the incoming call dialog is shown
            megaChat.rebind(this.incomingCallListener, () => {
                if (this.isMounted()) {
                    this.setState({ overlayed: true, closeDialog: false });
                    // Clear when ringing stops.
                    megaChat.plugins.callManager2.rebind(this.ringingStoppedListener, () => {
                        megaChat.plugins.callManager2.off(this.ringingStoppedListener);
                        this.setState({ overlayed: false });
                        fm_showoverlay();
                    });
                }
            });

            return $(`#${Schedule.NAMESPACE}`);
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.callExpanded && !this.props.callExpanded) {
            if (!$.dialog) {
                // The call opening clears $.dialog so since the dialog is still mounted update it.
                M.safeShowDialog(Schedule.dialogName, `#${Schedule.NAMESPACE}`);
            }
            fm_showoverlay();
            this.setState({ closeDialog: false });
        }
        if (!prevProps.callExpanded && this.props.callExpanded) {
            this.setState({ closeDialog: false });
        }
    }

    render() {
        const {
            topic,
            startDateTime,
            endDateTime,
            recurring,
            participants,
            link,
            sendInvite,
            waitingRoom,
            openInvite,
            description,
            closeDialog,
            isEdit,
            isDirty,
            isLoading,
            topicInvalid,
            invalidTopicMsg,
            descriptionInvalid,
            overlayed,
        } = this.state;

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                id={Schedule.NAMESPACE}
                className={`
                    ${closeDialog ? 'with-confirmation-dialog' : ''}
                    ${this.props.callExpanded || overlayed ? 'hidden' : ''}
                `}
                dialogName={Schedule.dialogName}
                dialogType="main"
                onClose={() => isDirty ? this.handleToggle('closeDialog') : this.props.onClose()}>
                <Header
                    chatRoom={isEdit && this.props.chatRoom}
                />

                <PerfectScrollbar
                    ref={this.wrapperRef}
                    className="fm-dialog-body"
                    options={{ suppressScrollX: true }}>
                    <Input
                        name="topic"
                        placeholder={l.schedule_title_input /* `Meeting name` */}
                        value={topic}
                        invalid={topicInvalid}
                        invalidMessage={invalidTopicMsg}
                        autoFocus={true}
                        isLoading={isLoading}
                        onFocus={() => topicInvalid && this.setState({ topicInvalid: false })}
                        onChange={this.onTopicChange}
                    />

                    <Row className={`unencrypted-warning-row ${topicInvalid ? 'with-topic-err' : ''}`}>
                        <Column/>
                        <Column>
                            <div className="unencrypted-warning">
                                <i className="sprite-fm-mono icon-info"/>
                                <span>{l.schedule_encryption_note /* `MEGA can see your meeting name...` */}</span>
                            </div>
                        </Column>
                    </Row>

                    {/* --- */}

                    <Row className="start-aligned">
                        <Column>
                            <i className="sprite-fm-mono icon-recents-filled"/>
                        </Column>
                        <div className="schedule-date-container">
                            <DateTime
                                name="startDateTime"
                                altField="startTime"
                                datepickerRef={this.datepickerRefs.startDateTime}
                                startDate={startDateTime}
                                value={startDateTime}
                                filteredTimeIntervals={this.getFilteredTimeIntervals(startDateTime)}
                                label={l.schedule_start_date /* `Start date` */}
                                isLoading={isLoading}
                                onMount={datepicker => {
                                    this.datepickerRefs.startDateTime = datepicker;
                                }}
                                onSelectDate={startDateTime => {
                                    this.handleDateSelect({ startDateTime }, this.onStartDateSelect);
                                }}
                                onSelectTime={({ value: startDateTime }) => this.handleTimeSelect({ startDateTime })}
                                onChange={value => this.handleChange('startDateTime', value)}
                                onBlur={timestamp => {
                                    if (timestamp) {
                                        const startDateTime = timestamp < Date.now() ? this.nearestHalfHour : timestamp;
                                        this.handleDateSelect({ startDateTime }, this.onStartDateSelect);
                                    }
                                }}
                            />

                            <DateTime
                                name="endDateTime"
                                altField="endTime"
                                datepickerRef={this.datepickerRefs.endDateTime}
                                isLoading={isLoading}
                                startDate={endDateTime}
                                value={endDateTime}
                                filteredTimeIntervals={this.getFilteredTimeIntervals(endDateTime, startDateTime)}
                                label={l.schedule_end_date /* `End date` */}
                                onMount={datepicker => {
                                    this.datepickerRefs.endDateTime = datepicker;
                                }}
                                onSelectDate={endDateTime => {
                                    this.handleDateSelect({ endDateTime }, this.onEndDateSelect);
                                }}
                                onSelectTime={({ value: endDateTime }) => this.handleTimeSelect({ endDateTime })}
                                onChange={value => this.handleChange('endDateTime', value)}
                                onBlur={timestamp => {
                                    this.handleDateSelect({ endDateTime: timestamp }, this.onEndDateSelect);
                                }}
                            />
                        </div>
                    </Row>

                    {
                        !u_attr.p &&
                        endDateTime - startDateTime > 36e5 &&
                        <UpgradeNotice
                            onUpgradeClicked={() => {
                                this.props.onClose();
                                loadSubPage('pro');
                                eventlog(500258);
                            }}
                        />
                    }

                    {/* --- */}

                    <Checkbox
                        name="recurring"
                        checked={recurring}
                        label={l.schedule_recurring_label /* `Recurring meeting` */}
                        isLoading={isLoading}
                        onToggle={prop => {
                            this.handleToggle(prop);
                            delay('chat-event-sm-recurring', () => eventlog(99919));
                        }}
                    />

                    {recurring &&
                        <Recurring
                            chatRoom={this.props.chatRoom}
                            startDateTime={startDateTime}
                            endDateTime={endDateTime}
                            onMount={datepicker => {
                                this.datepickerRefs.recurringEnd = datepicker;
                            }}
                            onUpdate={state => {
                                this.setState({ recurring: state });
                            }}
                        />
                    }

                    {/* --- */}

                    <Row>
                        <Column>
                            <i className="sprite-fm-mono icon-contacts"/>
                        </Column>
                        <Column>
                            <Invite
                                className={isLoading ? 'disabled' : ''}
                                participants={participants}
                                onSelect={this.handleParticipantSelect}
                            />
                        </Column>
                    </Row>

                    {/* --- */}

                    <Switch
                        name="link"
                        toggled={link}
                        label={l.schedule_link_label /* `Meeting link` */}
                        isLoading={isLoading}
                        subLabel={l.schedule_link_info}
                        onToggle={prop => {
                            this.handleToggle(prop);
                            delay('chat-event-sm-meeting-link', () => eventlog(99920));
                        }}
                    />

                    {/* --- */}

                    <Checkbox
                        name="sendInvite"
                        checked={sendInvite}
                        label={l.schedule_invite_label /* `Send calendar invite` */}
                        isLoading={isLoading}
                        onToggle={prop => {
                            this.handleToggle(prop);
                            delay('chat-event-sm-calendar-invite', () => eventlog(99921));
                        }}
                    />

                    {/* --- */}

                    <Checkbox
                        name="waitingRoom"
                        className={this.props.chatRoom?.havePendingCall() ? 'disabled' : ''}
                        checked={waitingRoom}
                        label={l.waiting_room /* `Waiting room` */}
                        subLabel={l.waiting_room_info /* `Only users admitted by the host can join the call.` */}
                        isLoading={isLoading}
                        onToggle={waitingRoom => {
                            if (this.props.chatRoom?.havePendingCall()) {
                                return;
                            }
                            this.handleToggle(waitingRoom);
                            delay('chat-event-sm-waiting-room', () => eventlog(500297));
                        }}
                    />

                    {/* --- */}

                    <Checkbox
                        name="openInvite"
                        checked={openInvite}
                        label={l.open_invite_desc /* `Allow non-hosts to add participants` */}
                        isLoading={isLoading}
                        onToggle={(ev) => {
                            this.handleToggle(ev);
                            delay('chat-event-sm-open-invite', () => eventlog(500298));
                        }}
                    />

                    {/* --- */}

                    {waitingRoom && openInvite ?
                        <Row>
                            <div className="schedule-dialog-banner warn">
                                <ParsedHTML>
                                    {l.waiting_room_invite
                                        .replace(
                                            '[A]',
                                            `<a
                                                href="${l.mega_help_host}/wp-admin/post.php?post=3005&action=edit"
                                                target="_blank"
                                                class="clickurl">
                                            `
                                        )
                                        .replace('[/A]', '</a>')
                                    }
                                </ParsedHTML>
                            </div>
                        </Row> : null
                    }

                    {/* --- */}

                    <Textarea
                        name="description"
                        invalid={descriptionInvalid}
                        placeholder={l.schedule_description_input /* `Add a description` */}
                        value={description}
                        onFocus={() => descriptionInvalid && this.setState({ descriptionInvalid: false })}
                        onChange={this.onTextareaChange}
                    />
                </PerfectScrollbar>

                <Footer
                    isLoading={isLoading}
                    isEdit={isEdit}
                    topic={topic}
                    onSubmit={this.handleSubmit}
                />

                {!(overlayed || this.props.callExpanded) && closeDialog &&
                    <CloseDialog
                        onToggle={this.handleToggle}
                        onClose={this.props.onClose}
                    />
                }
            </ModalDialogsUI.ModalDialog>
        );
    }
}

// --

export const CloseDialog = ({ onToggle, onClose }) => {
    return (
        <>
            <ModalDialogsUI.ModalDialog
                name={`${Schedule.NAMESPACE}-confirmation`}
                dialogType="message"
                className={`
                    with-close-btn
                    ${Schedule.NAMESPACE}-confirmation
                `}
                title={l.schedule_discard_dlg_title /* `Discard meeting or keep editing?` */}
                icon="sprite-fm-uni icon-question"
                buttons={[
                    { key: 'n', label: l.schedule_discard_cancel, onClick: () => onToggle('closeDialog') },
                    { key: 'y', label: l.schedule_discard_confirm, className: 'positive', onClick: onClose }
                ]}
                noCloseOnClickOutside={true}
                stopKeyPropagation={true}
                hideOverlay={true}
                onClose={() => onToggle('closeDialog')}
            />
            <div
                className={`${Schedule.NAMESPACE}-confirmation-overlay`}
                onClick={() => onToggle('closeDialog')}
            />
        </>
    );
};

export const Row = ({ children, className }) =>
    <div
        className={`
            ${Schedule.NAMESPACE}-row
            ${className || ''}
        `}>
        {children}
    </div>;

export const Column = ({ children, className }) =>
    <div
        className={`
            ${Schedule.NAMESPACE}-column
            ${className || ''}
        `}>
        {children}
    </div>;

/**
 * Header
 * @param chatRoom
 * @return {React.Element}
 */

const Header = ({ chatRoom }) => {
    const $$container = title =>
        <header>
            <h2>{title}</h2>
        </header>;

    if (chatRoom) {
        const { scheduledMeeting } = chatRoom;
        return $$container(scheduledMeeting.isRecurring ? l.edit_meeting_series_title : l.edit_meeting_title);
    }

    return $$container(l.schedule_meeting_title);
};

/**
 * Input
 * @param name
 * @param placeholder
 * @param value
 * @param invalid
 * @param invalidMessage
 * @param autoFocus
 * @param isLoading
 * @param onFocus
 * @param onChange
 * @return {React.Element}
 */

const Input = ({ name, placeholder, value, invalid, invalidMessage, autoFocus, isLoading, onFocus, onChange }) => {
    return (
        <Row className={invalid ? 'invalid-aligned' : ''}>
            <Column>
                <i className="sprite-fm-mono icon-rename"/>
            </Column>
            <Column>
                <div
                    className={`
                        mega-input
                        ${invalid ? 'error msg' : ''}
                    `}>
                    <input
                        type="text"
                        name={`${Schedule.NAMESPACE}-${name}`}
                        className={isLoading ? 'disabled' : ''}
                        autoFocus={autoFocus}
                        autoComplete="off"
                        placeholder={placeholder}
                        value={value}
                        onFocus={onFocus}
                        onChange={({ target }) => onChange(target.value)}
                    />
                    {invalid &&
                        <div className="message-container mega-banner">
                            {invalidMessage}
                        </div>
                    }
                </div>
            </Column>
        </Row>
    );
};

/**
 * Checkbox
 * @param name
 * @param className
 * @param checked
 * @param label
 * @param subLabel
 * @param onToggle
 * @param isLoading
 * @return {React.Element}
 */

const Checkbox = ({ name, className, checked, label, subLabel, isLoading, onToggle }) => {
    return (
        <Row
            className={`
                ${subLabel ? 'start-aligned' : ''}
                ${className || ''}
            `}>
            <Column>
                <div
                    className={`
                        checkdiv
                        ${checked ? 'checkboxOn' : 'checkboxOff'}
                    `}>
                    <input
                        name={`${Schedule.NAMESPACE}-${name}`}
                        className={isLoading ? 'disabled' : ''}
                        type="checkbox"
                        onChange={() => onToggle(name)}
                    />
                </div>
            </Column>
            <Column className={subLabel ? 'with-sub-label' : ''}>
                <label
                    htmlFor={`${Schedule.NAMESPACE}-${name}`}
                    className={isLoading ? 'disabled' : ''}
                    onClick={() => onToggle(name)}>
                    {label}
                </label>
                {subLabel && <div className="sub-label">{subLabel}</div>}
            </Column>
        </Row>
    );
};

/**
 * Switch
 * @param name
 * @param toggled
 * @param label
 * @param isLoading
 * @param onToggle
 * @return {React.Element}
 */

const Switch = ({ name, toggled, label, isLoading, subLabel, onToggle }) => {
    const className = `${Schedule.NAMESPACE}-switch`;
    return (
        <Row>
            <Column>
                <i className="sprite-fm-uni icon-mega-logo"/>
            </Column>
            <Column className={subLabel ? `with-sub-label ${className}` : className}>
                <span
                    className={`
                        schedule-label
                        ${isLoading ? 'disabled' : ''}
                    `}
                    onClick={() => onToggle(name)}>
                    {label}
                </span>
                <div
                    className={`
                        mega-switch
                        ${toggled ? 'toggle-on' : ''}
                        ${isLoading ? 'disabled' : ''}
                    `}
                    onClick={() => onToggle(name)}>
                    <div
                        className={`
                            mega-feature-switch
                            sprite-fm-mono-after
                            ${toggled ? 'icon-check-after' : 'icon-minimise-after'}
                        `}
                    />
                </div>
                {subLabel && <div className="sub-label">{subLabel}</div>}
            </Column>
        </Row>
    );
};

/**
 * Textarea
 * @param name
 * @param placeholder
 * @param isLoading
 * @param value
 * @param invalid
 * @param onChange
 * @param onFocus
 * @return {React.Element}
 */

const Textarea = ({ name, placeholder, isLoading, value, invalid, onChange, onFocus }) => {
    return (
        <Row className="start-aligned">
            <Column>
                <i className="sprite-fm-mono icon-description"/>
            </Column>
            <Column>
                <div className={`mega-input box-style textarea ${invalid ? 'error' : ''}`}>
                    <textarea
                        name={`${Schedule.NAMESPACE}-${name}`}
                        className={isLoading ? 'disabled' : ''}
                        placeholder={placeholder}
                        value={value}
                        onChange={({ target }) => onChange(target.value)}
                        onFocus={onFocus}
                    />
                </div>
                {invalid &&
                    <div className="mega-input error msg textarea-error">
                        <div className="message-container mega-banner">
                            {l.err_schedule_desc_long /* `Enter fewer than 3000 characters` */}
                        </div>
                    </div>
                }
            </Column>
        </Row>
    );
};

/**
 * Footer
 * @param isLoading
 * @param isEdit
 * @param topic
 * @param onSubmit
 * @param onInvalid
 * @return {React.Element}
 */

const Footer = ({ isLoading, isEdit, topic, onSubmit }) => {
    return (
        <footer>
            <div className="footer-container">
                <Button
                    className={`
                        mega-button
                        positive
                        ${isLoading ? 'disabled' : ''}
                    `}
                    onClick={() => !isLoading && onSubmit()}
                    topic={topic}>
                    <span>{isEdit ? l.update_meeting_button : l.schedule_meeting_button}</span>
                </Button>
            </div>
        </footer>
    );
};


/**
 * Upgrade notice for free users
 *
 * @returns {React.Element}
 */
export const UpgradeNotice = ({ onUpgradeClicked }) => {
    return !!mega.flags.ff_chmon && (
        <Row className="schedule-upgrade-notice">
            <h3>{l.schedule_limit_title}</h3>
            <div>{l.schedule_limit_upgrade_features}</div>
            <Button
                className="mega-button positive"
                onClick={onUpgradeClicked}>
                <span>{l.upgrade_now}</span>
            </Button>
        </Row>
    );
};
