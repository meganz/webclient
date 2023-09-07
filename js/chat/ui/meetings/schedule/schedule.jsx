import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import Button from '../button.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';
import Invite from './invite.jsx';
import { getTimeIntervals, getNearestHalfHour, getUserTimezone, addMonths } from './helpers.jsx';
import Recurring from './recurring.jsx';
import { DateTime } from './datetime.jsx';

export class Schedule extends MegaRenderMixin {
    static NAMESPACE = 'schedule-dialog';
    static dialogName = `meetings-${Schedule.NAMESPACE}`;

    wrapperRef = React.createRef();
    scheduledMeetingRef = null;
    localStreamRef = '.float-video';
    datepickerRefs = [];

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
        openInvite: true,
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
        if (!this.state.topic) {
            this.setState({
                topicInvalid: true,
                invalidTopicMsg: l.schedule_title_missing /* `Meeting name is required` */
            });
            return;
        }
        this.setState({ isLoading: true }, async() => {
            const { chatRoom, onClose } = this.props;
            await megaChat.plugins.meetingsManager[chatRoom ? 'updateMeeting' : 'createMeeting'](this.state, chatRoom);
            this.setState({ isLoading: false }, () => onClose());
        });
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.callDlgListener) {
            megaChat.off(this.callDlgListener);
        }
        if ($.dialog === Schedule.dialogName) {
            closeDialog();
        }
        [document, this.localStreamRef].map(el => $(el).unbind(`.${Schedule.NAMESPACE}`));
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
            this.state.openInvite = options.oi;
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

            this.callDlgListener = 'onIncomingCall.scheduledlg';
            megaChat.rebind(this.callDlgListener, ({ data }) => {
                // If the incoming call dialog will show mark this as overlayed.
                if (
                    this.isMounted()
                    && !is_chatlink
                    && pushNotificationSettings.isAllowedForChatId(data[0].chatId)
                ) {
                    this.setState({ overlayed: true, closeDialog: false });
                    // Clear when ringing stops.
                    megaChat.plugins.callManager2.rebind('onRingingStopped.scheduledlg', () => {
                        megaChat.plugins.callManager2.off('onRingingStopped.scheduledlg');
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
        const { callExpanded } = this.props;

        const dialogClasses = [];
        if (closeDialog) {
            dialogClasses.push('with-confirmation-dialog');
        }
        if (callExpanded || overlayed) {
            dialogClasses.push('hidden');
        }

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                id={Schedule.NAMESPACE}
                className={dialogClasses.join(' ')}
                dialogName={Schedule.dialogName}
                dialogType="main"
                onClose={() => {
                    return isDirty ? this.handleToggle('closeDialog') : this.props.onClose();
                }}>
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

                    {/* --- */}

                    <Row className="start-aligned">
                        <Column>
                            <i className="sprite-fm-mono icon-recents-filled" />
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
                                onSelectTime={({ value: startDateTime }) => {
                                    this.handleTimeSelect({
                                        startDateTime: startDateTime < Date.now() ?
                                            this.nearestHalfHour :
                                            startDateTime
                                    });
                                }}
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
                                onSelectTime={({ value: endDateTime }) => {
                                    this.handleTimeSelect({
                                        endDateTime: endDateTime < Date.now() ?
                                            this.nearestHalfHour + this.interval :
                                            endDateTime
                                    });
                                }}
                                onChange={value => this.handleChange('endDateTime', value)}
                                onBlur={timestamp => {
                                    this.handleDateSelect({ endDateTime: timestamp }, this.onEndDateSelect);
                                }}
                            />
                        </div>
                    </Row>

                    {/* --- */}

                    <Checkbox
                        name="recurring"
                        checked={recurring}
                        label={l.schedule_recurring_label /* `Recurring meeting` */}
                        isLoading={isLoading}
                        onToggle={this.handleToggle}
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
                        onToggle={this.handleToggle}
                    />

                    {/* --- */}

                    <Checkbox
                        name="sendInvite"
                        checked={sendInvite}
                        label={l.schedule_invite_label /* `Send calendar invite` */}
                        isLoading={isLoading}
                        onToggle={this.handleToggle}
                    />

                    {/* --- */}

                    <Checkbox
                        name="openInvite"
                        checked={openInvite}
                        label={l.open_invite_desc /* `Allow non-hosts to add participants` */}
                        isLoading={isLoading}
                        onToggle={this.handleToggle}
                    />

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

                {!(overlayed || callExpanded) && closeDialog &&
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
 * @param checked
 * @param label
 * @param onToggle
 * @param isLoading
 * @return {React.Element}
 */

const Checkbox = ({ name, checked, label, isLoading, onToggle }) => {
    return (
        <Row>
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
            <Column>
                <label
                    htmlFor={`${Schedule.NAMESPACE}-${name}`}
                    className={isLoading ? 'disabled' : ''}
                    onClick={() => onToggle(name)}>
                    {label}
                </label>
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

const Switch = ({ name, toggled, label, isLoading, onToggle }) => {
    return (
        <Row>
            <Column>
                <i className="sprite-fm-uni icon-mega-logo"/>
            </Column>
            <Column>
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
