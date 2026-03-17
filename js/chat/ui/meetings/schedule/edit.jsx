import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import { CloseDialog, Column, dialogName, NAMESPACE, Row, UpgradeNotice } from './utils.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import { reactStringWrap } from '../../../../ui/utils.jsx';
import Link from '../../link.jsx';
import { DateTime } from './datetime.jsx';
import { getTimeIntervals } from './helpers.jsx';
import Button from '../button.jsx';

export default class Edit extends MegaRenderMixin {
    occurrenceRef = null;
    datepickerRefs = [];

    interval = ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    incomingCallListener = 'onPrepareIncomingCallDialog.recurringEdit';

    state = {
        startDateTime: undefined,
        endDateTime: undefined,
        isDirty: false,
        closeDialog: false,
        overlayed: false,
    };

    constructor(props) {
        super(props);

        // --

        const { scheduledMeeting, occurrenceId } = this.props;
        this.occurrenceRef = scheduledMeeting.occurrences[occurrenceId];
        if (this.occurrenceRef) {
            this.state.startDateTime = this.occurrenceRef.start;
            this.state.endDateTime = this.occurrenceRef.end;
        }
    }

    onStartDateSelect = startDateTime => {
        this.setState({ startDateTime, isDirty: true }, () => {
            this.datepickerRefs.endDateTime.selectDate(new Date(startDateTime + this.interval));
        });
    };

    onEndDateSelect = endDateTime => {
        this.setState({ endDateTime, isDirty: true }, () => {
            const { startDateTime, endDateTime } = this.state;
            if (endDateTime < startDateTime) {
                if (endDateTime < Date.now()) {
                    return this.setState({ endDateTime: startDateTime + this.interval });
                }
                this.handleTimeSelect({ startDateTime: endDateTime - this.interval });
            }
        });
    };

    // [...] TODO: unify w/ the behavior on `Schedule` re: date/time selection handing
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

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.incomingCallListener) {
            megaChat.off(this.incomingCallListener);
        }
        if ($.dialog === dialogName) {
            closeDialog();
        }
    }

    componentDidMount() {
        super.componentDidMount();
        M.safeShowDialog(dialogName, () => {
            if (!this.isMounted()) {
                throw Error(`Edit dialog: component not mounted.`);
            }

            megaChat.rebind(this.incomingCallListener, () => {
                // If the incoming call dialog will show mark this as overlayed.
                if (this.isMounted()) {
                    this.setState({ overlayed: true, closeDialog: false });
                    // Clear when ringing stops.
                    megaChat.plugins.callManager2.rebind('onRingingStopped.recurringEdit', () => {
                        megaChat.plugins.callManager2.off('onRingingStopped.recurringEdit');
                        this.setState({ overlayed: false });
                        fm_showoverlay();
                    });
                }
            });

            return $(`#${NAMESPACE}`);
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.callExpanded && !this.props.callExpanded) {
            if (!$.dialog) {
                // The call opening clears $.dialog so since the dialog is still mounted update it.
                M.safeShowDialog(dialogName, `#${NAMESPACE}`);
            }
            fm_showoverlay();
            this.setState({ closeDialog: false });
        }
        if (!prevProps.callExpanded && this.props.callExpanded) {
            this.setState({ closeDialog: false });
        }
    }

    render() {
        const { chatRoom, callExpanded, onClose } = this.props;
        const { startDateTime, endDateTime, isDirty, closeDialog, overlayed } = this.state;

        const dialogClasses = ['fluid'];
        if (closeDialog) {
            dialogClasses.push('with-confirmation-dialog');
        }
        if (callExpanded || overlayed) {
            dialogClasses.push('hidden');
        }
        const withUpgrade = !u_attr.p && endDateTime - startDateTime > 36e5;
        if (withUpgrade) {
            dialogClasses.push('upgrade');
        }

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                id={NAMESPACE}
                className={dialogClasses.join(' ')}
                dialogName={dialogName}
                dialogType="main"
                onClose={() => {
                    return isDirty ? this.setState({ closeDialog: true }) : onClose();
                }}>
                <header>
                    <h2>{l.edit_meeting_title}</h2>
                </header>
                <div className="fm-dialog-body">
                    <Row>
                        <div className="mega-banner body recurring-edit-banner">
                            <div className="cell">
                                {reactStringWrap(l.scheduled_edit_occurrence_note, '[A]', Link, {
                                    onClick: () => {
                                        onClose();
                                        megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.EDIT, chatRoom);
                                    }
                                })}
                            </div>
                        </div>
                    </Row>
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
                                filteredTimeIntervals={getTimeIntervals(startDateTime)}
                                label={l.schedule_start_date /* `Start date` */}
                                onMount={datepicker => {
                                    this.datepickerRefs.startDateTime = datepicker;
                                }}
                                onSelectDate={startDateTime => this.onStartDateSelect(startDateTime)}
                                onSelectTime={({ value: startDateTime }) => this.handleTimeSelect({ startDateTime })}
                                onChange={value => this.setState({ startDateTime: value })}
                                onBlur={timestamp => {
                                    if (timestamp) {
                                        timestamp = timestamp < Date.now() ? this.occurrenceRef.start : timestamp;
                                        this.onStartDateSelect(timestamp);
                                    }
                                }}
                            />

                            <DateTime
                                name="endDateTime"
                                altField="endTime"
                                datepickerRef={this.datepickerRefs.endDateTime}
                                startDate={endDateTime}
                                value={endDateTime}
                                filteredTimeIntervals={getTimeIntervals(endDateTime, startDateTime)}
                                label={l.schedule_end_date /* `End date` */}
                                onMount={datepicker => {
                                    this.datepickerRefs.endDateTime = datepicker;
                                }}
                                onSelectDate={endDateTime => this.onEndDateSelect(endDateTime)}
                                onSelectTime={({ value: endDateTime }) => this.handleTimeSelect({ endDateTime })}
                                onChange={timestamp => this.setState({ endDateTime: timestamp })}
                                onBlur={timestamp => timestamp && this.onEndDateSelect(timestamp)}
                            />
                        </div>
                    </Row>

                    {
                        withUpgrade &&
                        <UpgradeNotice
                            onUpgradeClicked={() => {
                                onClose();
                                loadSubPage('pro');
                                eventlog(500257);
                            }}
                        />
                    }

                </div>
                <footer>
                    <div className="footer-container">
                        <Button
                            className="mega-button positive"
                            onClick={() => {
                                const { startDateTime, endDateTime } = this.state;
                                if (
                                    startDateTime !== this.occurrenceRef.start || endDateTime !== this.occurrenceRef.end
                                ) {
                                    delay('chat-event-sm-edit-meeting', () => eventlog(99923));
                                    this.occurrenceRef.update(startDateTime, endDateTime);
                                }
                                onClose();
                            }}>
                            <span>{l.update_meeting_button}</span>
                        </Button>
                    </div>
                </footer>

                {!(overlayed || callExpanded) && closeDialog &&
                    <CloseDialog
                        onToggle={() => this.setState({ closeDialog: false })}
                        onClose={onClose}
                    />
                }
            </ModalDialogsUI.ModalDialog>
        );
    }
}
