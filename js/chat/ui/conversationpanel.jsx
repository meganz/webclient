import React from 'react';
import utils, { Emoji, ParsedHTML } from './../../ui/utils.jsx';
import { MegaRenderMixin, timing } from '../mixins.js';
import { Button } from '../../ui/buttons.jsx';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import CloudBrowserModalDialog from './../../ui/cloudBrowserModalDialog.jsx';
import { HistoryRetentionDialog } from '../../ui/historyRetentionDialog.jsx';
import { Dropdown, DropdownItem } from '../../ui/dropdowns.jsx';
import { ContactCard, ContactPickerDialog, MembersAmount } from './contacts.jsx';
import { PerfectScrollbar } from '../../ui/perfectScrollbar.jsx';
import { Accordion, AccordionPanel } from '../../ui/accordion.jsx';
import { ParticipantsList } from './participantsList.jsx';
import GenericConversationMessage from './messages/generic.jsx';
import { SharedFilesAccordionPanel } from './sharedFilesAccordionPanel.jsx';
import { IncSharesAccordionPanel } from './incomingSharesAccordionPanel.jsx';
import { ChatlinkDialog } from './chatlinkDialog.jsx';
import PushSettingsDialog from './pushSettingsDialog.jsx';
import Call, { EXPANDED_FLAG, TYPE, inProgressAlert, isGuest } from './meetings/call.jsx';
import HistoryPanel from "./historyPanel.jsx";
import ComposedTextArea from "./composedTextArea.jsx";
import Loading from "./meetings/workflow/loading.jsx";
import Join from "./meetings/workflow/join.jsx";
import Alert from './meetings/workflow/alert.jsx';
import { isSameDay, isToday, isTomorrow } from './meetings/schedule/helpers.jsx';
import { withHostsObserver } from './meetings/hostsObserver.jsx';
import WaitingRoom from './meetings/waitingRoom/waitingRoom.jsx';
import { renderEndConfirm, renderLeaveConfirm } from './meetings/streamControls';
import { InviteParticipantsPanel } from "./inviteParticipantsPanel.jsx";

const ENABLE_GROUP_CALLING_FLAG = true;
const MAX_USERS_CHAT_PRIVATE = 100;

class EndCallButton extends MegaRenderMixin {
    IS_MODERATOR = Call.isModerator(this.props.chatRoom, u_handle);

    EVENTS = ['onCallPeerJoined.endCallButton', 'onCallPeerLeft.endCallButton'];

    shouldComponentUpdate() {
        return true;
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        this.EVENTS.map(ev => this.props.chatRoom.unbind(ev));
    }

    componentDidMount() {
        super.componentDidMount();
        this.EVENTS.map(ev => this.props.chatRoom.rebind(ev, () => this.safeForceUpdate()));
    }

    LeaveButton = withHostsObserver(
        ({ hasHost, chatRoom, confirmLeave, onLeave }) => {
            return (
                <DropdownItem
                    className="link-button"
                    icon="sprite-fm-mono icon-leave-call"
                    label={l.leave}
                    persistent={true}
                    onClick={() => {
                        const doLeave = () =>
                            hasHost(chatRoom.getCallParticipants()) ?
                                onLeave() :
                                confirmLeave({
                                    title: l.assign_host_leave_call /* `Assign host to leave call` */,
                                    body: l.assign_host_leave_call_details /* `You're the only host on...` */,
                                    cta: l.assign_host_button /* `Assign host` */,
                                    altCta: l.leave_anyway /* `Leave anyway` */,
                                });

                        const { recorder, sfuClient } = chatRoom.call;
                        return recorder && recorder === u_handle ?
                            renderLeaveConfirm(doLeave, () => sfuClient.recordingStop()) :
                            doLeave();
                    }}
                />
            );
        }
    );

    renderButton({ label, onClick, children = null, disabled }) {
        return (
            <Button
                className={`
                    link-button
                    light
                    red
                    dropdown-element
                    ${disabled ? 'disabled' : ''}
                `}
                icon="small-icon colorized horizontal-red-handset"
                label={label}
                onClick={disabled ? null : onClick}>
                {children}
            </Button>
        );
    }

    render() {
        const { chatRoom } = this.props;
        const { type, call } = chatRoom;

        if (call) {
            const peers = call.peers && call.peers.length;

            // 1-on-1 call -> `End call`
            if (type === 'private') {
                return this.renderButton({ label: l[5884], onClick: () => call.hangUp() });
            }

            // Moderator in a public call: render `End call...` drop down w/ `Leave` and `End for all` options.
            if (this.IS_MODERATOR) {
                const doEnd = () => chatRoom.endCallForAll();
                return this.renderButton({
                    label: l[5884],
                    onClick: peers ? null : () => call.hangUp(),
                    children: peers && (
                        <Dropdown
                            className="wide-dropdown light end-call-selector"
                            noArrow="true"
                            vertOffset={4}
                            horizOffset={0}>
                            <this.LeaveButton
                                chatRoom={chatRoom}
                                participants={chatRoom.getCallParticipants()}
                                onLeave={() => call.hangUp()}
                                onConfirmDenied={() => call.hangUp()}
                            />
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-contacts"
                                label={l.end_for_all}
                                onClick={() => {
                                    const { recorder, sfuClient } = call;
                                    return recorder && recorder === u_handle ?
                                        renderEndConfirm(doEnd, () => sfuClient.recordingStop()) :
                                        doEnd();
                                }}
                            />
                        </Dropdown>
                    )
                });
            }

            return (
                // Public call w/o being a moderator:
                // render `Leave call` if there are other call peers present or `End call...` if the current user is
                // alone in the call.
                this.renderButton({
                    label: peers ? l[5883] : l[5884],
                    onClick: () => call.hangUp()
                })
            );
        }

        // Public call currently ongoing, where the current user is not present within the call:
        // `End call for all` if the current user is a moderator.
        if (chatRoom.havePendingGroupCall()) {
            return (
                this.IS_MODERATOR ?
                    this.renderButton({
                        label: l.end_call_for_all,
                        onClick: () =>
                            msgDialog(
                                'confirmation',
                                null,
                                l.end_call_for_all_title,
                                l.end_call_for_all_text,
                                cb => cb ? chatRoom.endCallForAll() : 0xDEAD
                            ),
                        disabled: !chatRoom.iAmInRoom()
                    }) :
                    null
            );
        }

        return null;
    }
}

class StartMeetingNotification extends MegaRenderMixin {
    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    render() {
        const { chatRoom, offset, onWaitingRoomJoin, onStartCall } = this.props;

        if (chatRoom.call || !megaChat.hasSupportForCalls) {
            return null;
        }

        return (
            <div
                className="in-call-notif neutral start"
                style={{ marginTop: offset }}
                onClick={() => {
                    if (chatRoom.options.w && !chatRoom.iAmOperator()) {
                        return onWaitingRoomJoin();
                    }
                    return onStartCall(TYPE.AUDIO);
                }}>
                <button className="mega-button positive small">{l.schedule_start_aot}</button>
            </div>
        );
    }
}

export class JoinCallNotification extends MegaRenderMixin {
    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    render() {
        const { chatRoom, offset } = this.props;

        if (chatRoom.call) {
            return null;
        }

        if (!megaChat.hasSupportForCalls) {
            // `There is an active call in this room, but your browser does not support calls.`
            return <Alert type={Alert.TYPE.MEDIUM} content={l.active_call_not_supported} />;
        }

        return (
            <div
                className="in-call-notif neutral join"
                style={{ marginTop: offset }}>
                <i className="sprite-fm-mono icon-phone"/>
                <ParsedHTML
                    onClick={() => {
                        return inProgressAlert(true, chatRoom)
                            .then(() => chatRoom.joinCall())
                            .catch((ex) => d && console.warn('Already in a call.', ex));
                    }}>
                    {(l[20460] || 'There is an active group call. [A]Join[/A]')
                        .replace('[A]', '<button class="mega-button positive joinActiveCall small">')
                        .replace('[/A]', '</button>')}
                </ParsedHTML>
            </div>
        );
    }
}

export const allContactsInChat = (participants) => {
    var currentContacts = M.u.keys();
    for (var i = 0; i < currentContacts.length; i++) {
        var k = currentContacts[i];
        if (M.u[k].c === 1 && !participants.includes(k)) {
            return false;
        }
    }
    return true;
};

export const excludedParticipants = (room) => {
    const excParticipants = room.type === "group" || room.type === "public" ?
        room.members && Object.keys(room.members).length > 0 ? Object.keys(room.members) :
            room.getParticipants()
        :
        room.getParticipants();

    if (excParticipants.includes(u_handle)) {
        array.remove(excParticipants, u_handle, false);
    }
    return excParticipants;
};

class Occurrences extends MegaRenderMixin {
    loadingMore = false;

    state = {
        editDialog: false,
        occurrenceId: undefined
    };

    loadOccurrences() {
        if (!this.loadingMore) {
            const { scheduledMeeting, occurrences } = this.props;
            const occurrenceItems = Object.values(occurrences || {});
            const lastOccurrence = occurrenceItems[occurrenceItems.length - 1];

            if (lastOccurrence) {
                this.loadingMore = true;
                scheduledMeeting.getOccurrences({ from: lastOccurrence.start })
                    .catch(dump)
                    .finally(() => {
                        this.loadingMore = false;
                    });
            }
        }
    }

    renderCancelConfirmation(occurrence) {
        const { scheduledMeeting, chatRoom } = this.props;
        const nextOccurrences = Object.values(scheduledMeeting.occurrences).filter(o => o.isUpcoming);

        if (nextOccurrences.length > 1) {
            return (
                msgDialog(
                    `confirmation:!^${l.cancel_meeting_occurrence_button}!${l.schedule_cancel_abort}`,
                    'cancel-occurrence',
                    l.schedule_cancel_occur_dlg_title,
                    l.schedule_cancel_occur_dlg_text,
                    cb => cb && occurrence.cancel(),
                    1
                )
            );
        }

        return chatRoom.hasUserMessages() ?
            msgDialog(
                `confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`,
                'cancel-occurrence',
                l.schedule_cancel_all_dialog_title,
                l.schedule_cancel_all_dialog_move,
                cb => cb && megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, scheduledMeeting.chatId),
                1
            ) :
            msgDialog(
                `confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`,
                'cancel-occurrence',
                l.schedule_cancel_all_dialog_title,
                l.schedule_cancel_all_dialog_archive,
                cb => cb && megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, scheduledMeeting.chatId),
                1
            );
    }

    renderLoading() {
        return (
            <div className="loading-sketch">
                {Array.from({ length: 10 }, (el, i) => {
                    return (
                        <div
                            key={i}
                            className="chat-occurrence">
                            <div className="chat-occurrence-date" />
                            <div className="chat-occurrence-content">
                                <div className="chat-occurrence-title" />
                                <div className="chat-occurrence-time" />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    renderOccurrences() {
        const { chatRoom, occurrences, occurrencesLoading, scheduledMeeting } = this.props;

        if (occurrencesLoading) {
            return this.renderLoading();
        }

        if (occurrences && occurrences.length > 0) {
            const sortedOccurrences = Object.values(occurrences).sort((a, b) => a.start - b.start);
            return (
                <>
                    {sortedOccurrences.map(occurrence =>
                        occurrence.isUpcoming ?
                            <div
                                key={occurrence.uid}
                                className={`
                                    chat-occurrence
                                    ${occurrence.uid}
                                `}>
                                <div className="chat-occurrence-date">
                                    {isToday(occurrence.start) && <span>{l.today_occurrence_label} -</span>}
                                    {isTomorrow(occurrence.start) && <span>{l.tomorrow_occurrence_label} -</span>}
                                    <span>{time2date(occurrence.start / 1000, 19)}</span>
                                </div>
                                <div className="chat-occurrence-content">
                                    <div className="chat-occurrence-title">{scheduledMeeting.title}</div>
                                    <div className="chat-occurrence-time">
                                        {toLocaleTime(occurrence.start)} -
                                        &nbsp;
                                        {toLocaleTime(occurrence.end)}
                                    </div>
                                    {chatRoom.iAmOperator() &&
                                        <div className="chat-occurrence-controls">
                                            <div
                                                className="chat-occurrence-control simpletip"
                                                data-simpletip={l[1342]}
                                                data-simpletipposition="top"
                                                data-simpletipoffset="5">
                                                <Button
                                                    icon="sprite-fm-mono icon-rename"
                                                    onClick={() => {
                                                        megaChat.trigger(
                                                            megaChat.plugins.meetingsManager.EVENTS.EDIT,
                                                            occurrence
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <div
                                                className="chat-occurrence-control simpletip"
                                                data-simpletip={l[82]}
                                                data-simpletipposition="top"
                                                data-simpletipoffset="5">
                                                <Button
                                                    icon="sprite-fm-mono icon-bin"
                                                    onClick={() => this.renderCancelConfirmation(occurrence)}
                                                />
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div> :
                            null
                    )}
                </>
            );
        }

        return <span>{l.no_occurrences_remain}</span>;
    }

    render() {
        const { chatRoom, scheduledMeeting } = this.props;
        const { editDialog, occurrenceId } = this.state;

        return (
            <>
                <div className="chat-occurrences-list">
                    <PerfectScrollbar
                        chatRoom={chatRoom}
                        ref={ref => {
                            this.contactsListScroll = ref;
                        }}
                        disableCheckingVisibility={true}
                        onUserScroll={ps => ps.isCloseToBottom(30) && this.loadOccurrences()}
                        isVisible={this.isCurrentlyActive}
                        options={{ suppressScrollX: true }}>
                        <div className="chat-occurrences-list-inner">{this.renderOccurrences()}</div>
                    </PerfectScrollbar>
                </div>
            </>
        );
    }
}

export class ConversationRightArea extends MegaRenderMixin {
    static defaultProps = {
        'requiresUpdateOnResize': true
    };

    state = {
        contactPickerDialog: false,
        inviteDialog: false,
    };

    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    setRetention(chatRoom, retentionTime) {
        chatRoom.setRetention(retentionTime);
        $(document).trigger('closeDropdowns');
    }

    LeaveButton = withHostsObserver(
        ({ chatRoom, hasHost, confirmLeave, onLeave }) => {
            const isDisabled = chatRoom.call || is_chatlink || !chatRoom.iAmInRoom();
            const participants = chatRoom.getParticipantsExceptMe();

            return (
                <div
                    className={`
                        link-button
                        light
                        ${isDisabled ? 'disabled' : ''}
                    `}
                    onClick={
                        isDisabled ?
                            null :
                            () =>
                                hasHost(participants) || !participants.length ?
                                    // Leave the given room directly w/o any further actions if
                                    // there are other hosts already present or if the user is alone in the room.
                                    onLeave() :
                                    // Show the `Assign host and leave` confirmation dialog
                                    confirmLeave({
                                        title: chatRoom.isMeeting ?
                                            /* `Assign host to leave meeting` */
                                            l.assign_host_to_leave :
                                            /* `Assign host to leave group` */
                                            l.assign_host_to_leave_group,
                                        /* `You're the only host in this...` */
                                        body: chatRoom.isMeeting ?
                                            l.assign_host_to_details :
                                            l.assign_host_to_details_group,
                                        /* `Assign host` */
                                        cta: l.assign_host_button
                                    })
                    }>
                    <i className="sprite-fm-mono icon-disabled-filled"/>
                    <span>
                        {chatRoom.isMeeting ? l.meeting_leave /* `Leave Meeting` */ : l[8633] /* `Leave Chat` */}
                    </span>
                </div>
            );
        }
    );

    OptionsButton = ({ icon, label, secondLabel, toggled, disabled, onClick }) => {
        const { chatRoom } = this.props;
        const isDisabled = !chatRoom.iAmOperator() || disabled;

        return (
            <Button
                className={`
                    link-button
                    light
                    room-settings-button
                `}
                disabled={isDisabled}
                icon={`
                    sprite-fm-mono
                    ${icon}
                `}
                label={label}
                secondLabel={secondLabel}
                secondLabelClass="label--green"
                toggle={{ enabled: toggled, onClick: isDisabled ? null : onClick }}
                onClick={isDisabled ? null : onClick}
            />
        );
    };

    renderOptionsBanner() {
        const { chatRoom } = this.props;

        return !!chatRoom.options[MCO_FLAGS.WAITING_ROOM] && !!chatRoom.options[MCO_FLAGS.OPEN_INVITE] ?
            <div className="room-settings-banner">
                <i className="sprite-fm-mono icon-info"/>
                <ParsedHTML>
                    {l.waiting_room_invite
                        .replace(
                            '[A]',
                            `<a
                                href="${l.mega_help_host}/wp-admin/post.php?post=3005&action=edit"
                                target="_blank"
                                class="ulickurl">`
                        )
                        .replace('[/A]', '</a>')
                    }
                </ParsedHTML>
            </div> :
            null;
    }

    handleCancelMeeting = () => {
        const { chatRoom } = this.props;
        const { scheduledMeeting, chatId } = chatRoom || {};

        if (scheduledMeeting) {
            const { isRecurring, title } = scheduledMeeting;
            const doConfirm = res => {
                if (res) {
                    megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, chatId);
                    delay('chat-event-sm-cancel', () => eventlog(99925));
                }
            };

            if (isRecurring) {
                return chatRoom.hasUserMessages() ?
                    msgDialog(
                        `confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`,
                        null,
                        l.schedule_cancel_dialog_title.replace('%s', title),
                        l.schedule_cancel_dialog_move_recurring,
                        doConfirm,
                        1
                    ) :
                    msgDialog(
                        `confirmation:!^${l.schedule_cancel_dialog_confirm}!${l.schedule_cancel_abort}`,
                        null,
                        l.schedule_cancel_dialog_title.replace('%s', title),
                        l.schedule_cancel_dialog_archive_recurring,
                        doConfirm,
                        1
                    );
            }

            return chatRoom.hasUserMessages() ?
                msgDialog(
                    `confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`,
                    null,
                    l.schedule_cancel_dialog_title.replace('%s', title),
                    l.schedule_cancel_dialog_move_single,
                    doConfirm,
                    1
                ) :
                msgDialog(
                    `confirmation:!^${l.schedule_cancel_dialog_confirm}!${l.schedule_cancel_abort}`,
                    null,
                    l.schedule_cancel_dialog_title.replace('%s', title),
                    l.schedule_cancel_dialog_archive_single,
                    doConfirm,
                    1
                );
        }
    };

    handleAddParticipants() {
        if (M.u.length > 1) {
            if (allContactsInChat(excludedParticipants(this.props.chatRoom))) {
                return msgDialog(
                    `confirmationa:!^${l[8726]}!${l[82]}`,
                    null,
                    `${l.all_contacts_added}`,
                    `${l.all_contacts_added_to_chat}`,
                    (res) => {
                        if (res) {
                            contactAddDialog(null, false);
                        }
                    },
                    1
                );
            }
            return this.setState({ contactPickerDialog: true });
        }
        msgDialog( // new user adding a partcipant
            `confirmationa:!^${l[8726]}!${l[82]}`,
            null,
            `${l.no_contacts}`,
            `${l.no_contacts_text}`,
            (resp) => {
                if (resp) {
                    contactAddDialog(null, false);
                }
            },
            1
        );
    }

    renderPushSettingsButton() {
        const { pushSettingsValue, chatRoom, onPushSettingsToggled, onPushSettingsClicked } = this.props;
        const icon = pushSettingsValue || pushSettingsValue === 0 ?
            'icon-notification-off-filled' :
            'icon-notification-filled';

        return (
            <div className="push-settings">
                <div className="chat-button-separator" />
                <Button
                    className={`
                        link-button
                        light
                        push-settings-button
                        ${chatRoom.isReadOnly() ? 'disabled' : ''}
                    `}
                    icon={`
                        sprite-fm-mono
                        ${icon}
                    `}
                    label={
                        chatRoom.isMeeting ?
                            l.meeting_notifications /* `Meeting notifications` */ :
                            l[16709] /* `Chat notifications` */
                    }
                    secondLabel={(() => {
                        if (pushSettingsValue !== null && pushSettingsValue !== undefined) {
                            return pushSettingsValue === 0 ?
                                // `Until I Turn It On Again``
                                PushSettingsDialog.options[Infinity] :
                                // `Muted until %s`
                                l[23539].replace(
                                    '%s',
                                    toLocaleTime(pushSettingsValue)
                                );
                        }
                    })()}
                    secondLabelClass="label--green"
                    toggle={
                        chatRoom.isReadOnly() ?
                            null :
                            {
                                enabled: !pushSettingsValue && pushSettingsValue !== 0,
                                onClick: () =>
                                    !pushSettingsValue && pushSettingsValue !== 0 ?
                                        onPushSettingsClicked() :
                                        onPushSettingsToggled()
                            }
                    }
                    onClick={() => chatRoom.isReadOnly() ? null : onPushSettingsClicked()}
                />
                <div className="chat-button-separator" />
            </div>
        );
    }

    componentDidMount() {
        super.componentDidMount();
        megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () => {
            if (this.isMounted()) {
                this.safeForceUpdate();
            }
        });
    }

    render() {
        const self = this;
        const { chatRoom: room, onStartCall, occurrencesLoading, onShowScheduledDescription } = self.props;

        if (!room || !room.roomId) {
            // destroyed
            return null;
        }

        // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
            return null;
        }
        self._wasAppendedEvenOnce = true;

        var startCallDisabled = isStartCallDisabled(room) || room.iAmWaitingRoomPeer();
        var startAudioCallButton;
        var startVideoCallButton;

        var isInCall = !!room.call;
        if (isInCall) {
            startAudioCallButton = startVideoCallButton = null;
        }

        if (room.type === "group" || room.type === "public") {
            if (!ENABLE_GROUP_CALLING_FLAG ||
                ((room.getCallParticipants().length > 0) && !isInCall)
            ){
                // call is active, but I'm not in
                startAudioCallButton = startVideoCallButton = null;
            }
        }

        if (startAudioCallButton !== null) {
            startAudioCallButton =
                <div
                    data-simpletip={
                        /* `Your browser doesn't support audio calls. Try a different browser.` */
                        l.unsupported_browser_audio
                    }
                    data-simpletipposition="top"
                    data-simpletipoffset="7"
                    className={`
                        link-button light
                        ${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        ${startCallDisabled ? 'disabled' : ''}
                    `}
                    onClick={() => onStartCall(TYPE.AUDIO)}>
                    <i className="sprite-fm-mono icon-phone" />
                    <span>{l[5896] /* `Start Audio Call` */}</span>
                </div>;
        }
        if (startVideoCallButton !== null) {
            startVideoCallButton =
                <div
                    data-simpletip={
                        /* `Your browser doesn't support video calls. Try a different browser.` */
                        l.unsupported_browser_video
                    }
                    data-simpletipposition="top"
                    data-simpletipoffset="7"
                    className={`
                        link-button light
                        ${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        ${startCallDisabled ? 'disabled' : ''}
                    `}
                    onClick={() => onStartCall(TYPE.VIDEO)}>
                    <i className="sprite-fm-mono icon-video-call-filled"/>
                    <span>{l[5897] /* `Start Video Call` */}</span>
                </div>;
        }
        var AVseperator = <div className="chat-button-separator" />;
        var isReadOnlyElement = null;

        if (room.isReadOnly()) {
            isReadOnlyElement = <center className="center" style={{margin: "6px"}}>{l.read_only_chat}</center>;
        }
        const exParticipants = excludedParticipants(room);

        var dontShowTruncateButton = false;
        if (
            !room.iAmOperator() ||
            room.isReadOnly() ||
            room.messagesBuff.messages.length === 0 ||
            (
                room.messagesBuff.messages.length === 1 &&
                room.messagesBuff.messages.getItem(0).dialogType === "truncated"
            )
        ) {
            dontShowTruncateButton = true;
        }

        const renameButtonClass = `
            link-button
            light
            ${isGuest() || room.isReadOnly() || !room.iAmOperator() ? 'disabled' : ''}
        `;

        const getChatLinkClass = `
            link-button
            light
            ${isGuest() || room.isReadOnly() ? 'disabled' : ''}
        `;

        let participantsList = null;
        if (room.type === "group" || room.type === "public") {
            participantsList = (
                <div>
                    {isReadOnlyElement}
                    <Button
                        className="mega-button action invite-dialog-btn"
                        icon="sprite-fm-mono icon-user-plus-thin-outline"
                        label={l[8726] /* `Invite` */}
                        disabled={
                            isGuest()
                            || room.isReadOnly()
                            || (
                                !room.iAmOperator()
                                && !room.publicLink
                                && !room.options[MCO_FLAGS.OPEN_INVITE]
                            )}
                        onClick={() => {
                            delay('chat-event-inv-rhp', () => eventlog(99963));
                            if (room.type === 'group') {
                                return this.handleAddParticipants();
                            }
                            loadingDialog.show('fetchchatlink');
                            room.updatePublicHandle(false, false, true).catch(dump).always(() => {
                                loadingDialog.hide('fetchchatlink');
                                if (!this.isMounted()) {
                                    return;
                                }
                                if (!room.iAmOperator() && room.options[MCO_FLAGS.OPEN_INVITE] && !room.publicLink) {
                                    this.handleAddParticipants();
                                }
                                else if (room.type === 'public' && !room.topic) {
                                    this.handleAddParticipants();
                                }
                                else {
                                    this.setState({ inviteDialog: true });
                                }
                            });
                        }}
                    />
                    <ParticipantsList
                        ref={function(r) {
                            self.participantsListRef = r;
                        }}
                        chatRoom={room}
                        members={room.members}
                        isCurrentlyActive={room.isCurrentlyActive}
                    />
                </div>
            );
        }

        const addParticipantBtn = room.type === 'private' && (
            <Button
                className="link-button light"
                icon="sprite-fm-mono icon-add-small"
                label={l[8007]}
                disabled={isGuest() || room.isReadOnly() || !(room.iAmOperator()
                    || room.type !== 'private' && room.options[MCO_FLAGS.OPEN_INVITE])}
                onClick={() =>
                    M.u.length > 1 ?
                        !allContactsInChat(exParticipants)
                            ? this.setState({ contactPickerDialog: true }) :
                            msgDialog(
                                `confirmationa:!^${l[8726]}!${l[82]}`,
                                null,
                                `${l.all_contacts_added}`,
                                `${l.all_contacts_added_to_chat}`,
                                (res) => {
                                    if (res) {
                                        contactAddDialog(null, false);
                                    }
                                }, 1) :
                        msgDialog( // new user adding a partcipant
                            `confirmationa:!^${l[8726]}!${l[82]}`,
                            null,
                            `${l.no_contacts}`,
                            `${l.no_contacts_text}`,
                            (resp) => {
                                if (resp) {
                                    contactAddDialog(null, false);
                                }
                            }, 1)
                }
            >
            </Button>
        );
        const waitingRoomButton = {
            icon: 'icon-clock-user-thin-solid',
            label: l.waiting_room,
            secondLabel: l.waiting_room_info,
            toggled: room.options[MCO_FLAGS.WAITING_ROOM],
            disabled: room.havePendingCall(),
            onClick: () => {
                room.toggleWaitingRoom();
                delay('chat-event-wr-create-button', () => eventlog(99937));
            }
        };
        const openInviteButton = {
            icon: 'icon-user-filled',
            label: room.isMeeting ? l.meeting_open_invite_label : l.chat_open_invite_label,
            secondLabel: l.open_invite_desc,
            toggled: room.options[MCO_FLAGS.OPEN_INVITE],
            onClick: () => {
                room.toggleOpenInvite();
                if (room.scheduledMeeting) {
                    delay('chat-event-sm-allow-non-hosts', () => eventlog(99928));
                }
            }
        };

        //
        // History Retention
        // ----------------------------------------------------------------------

        let retentionTime = room.retentionTime ? secondsToDays(room.retentionTime) : 0;
        const BASE_CLASSNAME = 'dropdown-item link-button';
        const ELEM_CLASSNAME = `${BASE_CLASSNAME} retention-history-menu__list__elem`;
        const ICON_ACTIVE = <i className="sprite-fm-mono icon-check" />;
        const retentionHistoryBtn = <Button
            className="link-button light history-retention-btn"
            icon="sprite-fm-mono icon-recents-filled"
            label={l[23436]}
            disabled={!room.iAmOperator() || room.isReadOnly() || isGuest()}
            secondLabel={room.getRetentionLabel()}
            secondLabelClass="label--red"
            chatRoom={room}>
            {room.iAmOperator() ?
                <Dropdown
                    className="retention-history-menu light"
                    noArrow="false"
                    vertOffset={-53}
                    horizOffset={-205}>
                    <div className="retention-history-menu__list">
                        <div
                            className={ELEM_CLASSNAME}
                            onClick={() => this.setRetention(room, 0)}>
                            <span>{l.disabled_chat_history_cleaning_status}</span>
                            {retentionTime === 0 && ICON_ACTIVE}
                        </div>
                        <div
                            className={ELEM_CLASSNAME}
                            onClick={() => this.setRetention(room, daysToSeconds(1))}>
                            <span>{l[23437]}</span>
                            {retentionTime === 1 && ICON_ACTIVE}
                        </div>
                        <div
                            className={ELEM_CLASSNAME}
                            onClick={() => this.setRetention(room, daysToSeconds(7))}>
                            <span>{l[23438]}</span>
                            {retentionTime === 7 && ICON_ACTIVE}
                        </div>
                        <div
                            className={ELEM_CLASSNAME}
                            onClick={() => this.setRetention(room, daysToSeconds(30))}>
                            <span>{l[23439]}</span>
                            {retentionTime === 30 && ICON_ACTIVE}
                        </div>
                        <div
                            className={ELEM_CLASSNAME}
                            onClick={() => {
                                $(document).trigger('closeDropdowns');
                                self.props.onHistoryRetentionConfig();
                            }}>
                            <span>{l[23440]}</span>
                            {[0, 1, 7, 30].indexOf(retentionTime) === -1 && ICON_ACTIVE}
                        </div>
                    </div>
                </Dropdown> :
                null
            }
        </Button>;

        const MEMBERS_LIMITED = Object.keys(room.members).length > MAX_USERS_CHAT_PRIVATE;
        const { scheduledMeeting, isMeeting } = room;
        const { isRecurring, isUpcoming, occurrences } = scheduledMeeting || {};

        /* `Archive chat/meeting` */
        let archiveText = room.isMeeting ? l.archive_meeting_btn : l.archive_chat_btn;
        if (room.isArchived()) {
            /* `Unarchive chat/meeting` */
            archiveText = room.isMeeting ? l.unarchive_meeting_btn : l[19065];
        }

        return (
            <div className="chat-right-area">
                <PerfectScrollbar
                    className="chat-right-area conversation-details-scroll"
                    options={{ 'suppressScrollX': true }}
                    ref={ref => {
                        this.rightScroll = ref;
                    }}
                    triggerGlobalResize={true}
                    isVisible={room.isCurrentlyActive}
                    chatRoom={room}>
                    <div
                        className={`
                            chat-right-pad
                            ${room.haveActiveCall() ? 'in-call' : ''}
                        `}>
                        <Accordion
                            {...this.state}
                            chatRoom={room}
                            onToggle={SoonFc(20, () => {
                                // wait for animations.
                                if (this.rightScroll) {
                                    this.rightScroll.reinitialise();
                                }
                                if (this.participantsListRef) {
                                    this.participantsListRef.safeForceUpdate();
                                }
                            })}
                            expandedPanel={{
                                // [...] TODO: refactor
                                // Old rules
                                // Group chat -> `Chat Participants` expanded by default
                                // participants: (room.type === 'group' || room.type === 'public') && !isMeeting,
                                // 1-on-1 chat or meeting -> default to `Options`
                                // options: room.type === 'private' || (isMeeting && !isRecurring),
                                // All collapsed by default except for recurring meetings occurrences.
                                participants: false,
                                options: false,
                                // Scheduled meeting (recurring)
                                occurrences: isMeeting && scheduledMeeting && isRecurring
                            }}>
                            {participantsList ?
                                <AccordionPanel
                                    className="small-pad"
                                    title={room.isMeeting
                                        ? l.meeting_participants /* `Meeting participants` */
                                        : l.chat_participants /* `Chat participants` */}
                                    chatRoom={room}
                                    key="participants">
                                    {participantsList}
                                </AccordionPanel> :
                                null
                            }
                            {room.type === 'public' && room.observers > 0 && !room.options.w ?
                                <div className="accordion-text observers">
                                    {l[20466] /* `Observers` */}
                                    <span className="observers-count">
                                        <i className="sprite-fm-mono icon-eye-reveal"/>
                                        {room.observers}
                                    </span>
                                </div> :
                                <div/>
                            }

                            {isRecurring && isUpcoming && scheduledMeeting.occurrences.some(o => o.isUpcoming) &&
                                <AccordionPanel
                                    key="occurrences"
                                    className="chat-occurrences-panel"
                                    accordionClass="chatroom-occurrences-panel"
                                    title={l.occurrences_heading}
                                    chatRoom={room}
                                    scheduledMeeting={scheduledMeeting}
                                    occurrences={occurrences}>
                                    <Occurrences
                                        chatRoom={room}
                                        scheduledMeeting={scheduledMeeting}
                                        occurrences={occurrences}
                                        occurrencesLoading={occurrencesLoading}
                                    />
                                </AccordionPanel>
                            }

                            <AccordionPanel
                                key="options"
                                className="have-animation buttons"
                                accordionClass="chatroom-options-panel"
                                title={l[7537]}
                                chatRoom={room}
                                sfuClient={window.sfuClient}>
                                <>
                                    {addParticipantBtn}
                                    {startAudioCallButton}
                                    {startVideoCallButton}
                                    <EndCallButton
                                        call={room.havePendingGroupCall() || room.haveActiveCall()}
                                        chatRoom={room}
                                    />
                                    {scheduledMeeting && <div
                                        className={`
                                            link-button light schedule-view-desc
                                            ${room.isReadOnly() || !scheduledMeeting.description ? 'disabled' : ''}
                                        `}
                                        onClick={() => {
                                            if (!room.isReadOnly() && scheduledMeeting.description) {
                                                onShowScheduledDescription();
                                            }
                                        }}>
                                        <i className="sprite-fm-mono icon-description" />
                                        <span>{l.schedule_view_desc /* `View description` */}</span>
                                    </div>}
                                    {(room.type === 'group' || room.type === 'public') && !scheduledMeeting ?
                                        <div
                                            className={renameButtonClass}
                                            onClick={(e) => {
                                                if ($(e.target).closest('.disabled').length > 0) {
                                                    return false;
                                                }
                                                if (this.props.onRenameClicked) {
                                                    this.props.onRenameClicked();
                                                }
                                            }}>
                                            <i className="sprite-fm-mono icon-rename"/>
                                            <span>{room.isMeeting
                                                ? l.rename_meeting /* `Rename Meeting` */
                                                : l[9080] /* `Rename group` */}</span>
                                        </div> :
                                        null
                                    }
                                    {scheduledMeeting ?
                                        <div
                                            className={`
                                                link-button
                                                light
                                                ${room.iAmOperator() ? '' : 'disabled'}
                                            `}
                                            onClick={() => {
                                                const { plugins } = megaChat;
                                                return room.iAmOperator() ?
                                                    megaChat.trigger(plugins.meetingsManager.EVENTS.EDIT, room) :
                                                    null;
                                            }}>
                                            <i className="sprite-fm-mono icon-rename"/>
                                            {scheduledMeeting.isRecurring ?
                                                <span>{l.edit_meeting_series_button /* `Edit entire series` */}</span> :
                                                <span>{l.edit_meeting_button /* `Edit meeting` */}</span>}
                                        </div> :
                                        null
                                    }
                                    {room.type === 'public' && !room.isMeeting ?
                                        <div
                                            className={getChatLinkClass}
                                            onClick={e => {
                                                if ($(e.target).closest('.disabled').length > 0) {
                                                    return false;
                                                }
                                                this.props.onGetManageChatLinkClicked();
                                            }}>
                                            <i className="sprite-fm-mono icon-link-filled"/>
                                            <span>{l[20481] /* `Get chat link */}</span>
                                        </div> :
                                        null
                                    }
                                    {scheduledMeeting ?
                                        <div
                                            className={`
                                                link-button
                                                light
                                                ${room.iAmOperator() && !scheduledMeeting.canceled ? '' : 'disabled'}
                                            `}
                                            onClick={() => {
                                                if (room.iAmOperator() && !scheduledMeeting.canceled) {
                                                    this.handleCancelMeeting();
                                                }
                                            }}>
                                            <i className="sprite-fm-mono icon-bin-filled"/>
                                            {scheduledMeeting.isRecurring ?
                                                <span>
                                                    {l.cancel_meeting_series_button /* `Cancel entire series` */}
                                                </span> :
                                                <span>{l.cancel_meeting_button /* `Cancel meeting` */}</span>}
                                        </div> :
                                        null
                                    }
                                    {
                                        !room.membersSetFromApi.members.hasOwnProperty(u_handle) &&
                                        room.type === 'public' &&
                                        !is_chatlink &&
                                        room.publicChatHandle &&
                                        room.publicChatKey ?
                                            <div
                                                className="link-button light"
                                                onClick={(e) => {
                                                    if ($(e.target).closest('.disabled').length > 0) {
                                                        return false;
                                                    }
                                                    this.props.onJoinViaPublicLinkClicked();
                                                }}>
                                                <i className="sprite-fm-mono icon-rename"/>
                                                <span>{l[20597] /* `Join Group` */}</span>
                                            </div> :
                                            null
                                    }
                                    {scheduledMeeting ?
                                        null :
                                        <>
                                            {AVseperator}
                                            <Button
                                                className="link-button light dropdown-element"
                                                icon="sprite-fm-mono icon-upload-filled"
                                                label={l[23753]}
                                                disabled={room.isReadOnly()}>
                                                <Dropdown
                                                    className="wide-dropdown send-files-selector light"
                                                    noArrow="true"
                                                    vertOffset={4}
                                                    onClick={() => false}>
                                                    <div className="dropdown info-txt">
                                                        {l[23753] || 'Send...'}
                                                    </div>
                                                    <DropdownItem
                                                        className="link-button"
                                                        icon="sprite-fm-mono icon-cloud-drive"
                                                        label={l[19794] || 'My Cloud Drive'}
                                                        disabled={mega.paywall}
                                                        onClick={() => {
                                                            this.props.onAttachFromCloudClicked();
                                                        }}
                                                    />
                                                    <DropdownItem
                                                        className="link-button"
                                                        icon="sprite-fm-mono icon-session-history"
                                                        label={l[19795] || 'My computer'}
                                                        disabled={mega.paywall}
                                                        onClick={() => {
                                                            this.props.onAttachFromComputerClicked();
                                                        }}
                                                    />
                                                </Dropdown>
                                            </Button>
                                        </>
                                    }
                                    {this.renderPushSettingsButton()}
                                    {room.type === 'private' ?
                                        null :
                                        <>
                                            {room.scheduledMeeting && this.OptionsButton(waitingRoomButton)}
                                            {this.OptionsButton(openInviteButton)}
                                            {this.renderOptionsBanner()}
                                            {AVseperator}
                                        </>
                                    }
                                    <Button
                                        className="link-button light export-chat-button"
                                        disabled={room.messagesBuff.messages.length === 0 || room.exportIo}
                                        onClick={() => {
                                            room.exportToFile();
                                        }}
                                    >
                                        <i className="sprite-fm-mono icon-export-chat-filled"/>
                                        <span>
                                            {room.isMeeting ? l.export_meeting_rhp : l.export_chat_rhp}
                                        </span>
                                    </Button>
                                    <Button
                                        className="link-button light clear-history-button"
                                        disabled={dontShowTruncateButton || !room.members.hasOwnProperty(u_handle)}
                                        onClick={() => {
                                            if (this.props.onTruncateClicked) {
                                                this.props.onTruncateClicked();
                                            }
                                        }}>
                                        <i className="sprite-fm-mono icon-remove"/>
                                        <span className="accordion-clear-history-text">
                                            {room.isMeeting
                                                ? l.meeting_clear_hist /* `Clear Meeting History` */
                                                : l[8871] /* `Clear Chat History` */}
                                        </span>
                                    </Button>
                                    {retentionHistoryBtn}
                                    {room.iAmOperator() && room.type === 'public' && !scheduledMeeting ?
                                        <div className="chat-enable-key-rotation-paragraph">
                                            {AVseperator}
                                            <div
                                                className={`
                                                    link-button
                                                    light
                                                    ${MEMBERS_LIMITED ? 'disabled' : ''}
                                                `}
                                                onClick={(e) => {
                                                    if (
                                                        MEMBERS_LIMITED ||
                                                        $(e.target).closest('.disabled').length > 0
                                                    ) {
                                                        return false;
                                                    }
                                                    this.props.onMakePrivateClicked();
                                                }}>
                                                <i className="sprite-fm-mono icon-key"/>
                                                <span>{l[20623] /* `Enable key rotation` */}</span>
                                            </div>
                                            <p>
                                                <span>{l[20454] /* `Encryption key rotation is slightly...` */}</span>
                                            </p>
                                        </div> :
                                        null
                                    }
                                    {AVseperator}
                                    {
                                        <div
                                            className={`
                                                link-button
                                                light
                                                ${(room.members.hasOwnProperty(u_handle) ||
                                                room.state === ChatRoom.STATE.LEFT) &&
                                                !is_chatlink ? '' : 'disabled'}
                                            `}
                                            onClick={(e) => {
                                                if ($(e.target).closest('.disabled').length > 0) {
                                                    return false;
                                                }
                                                if (room.isArchived()) {
                                                    if (this.props.onUnarchiveClicked) {
                                                        this.props.onUnarchiveClicked();
                                                    }
                                                }
                                                else if (this.props.onArchiveClicked) {
                                                    this.props.onArchiveClicked();
                                                }
                                            }}>
                                            <i
                                                className={`
                                                sprite-fm-mono
                                                ${room.isArchived() ? 'icon-unarchive' : 'icon-archive'}
                                            `}
                                            />
                                            <span>
                                                {archiveText}
                                            </span>
                                        </div>
                                    }
                                    {room.type === 'private' ?
                                        null :
                                        <this.LeaveButton
                                            chatRoom={room}
                                            participants={room.getParticipantsExceptMe()}
                                            onLeave={() => room.leave(true)}
                                        />
                                    }
                                </>
                            </AccordionPanel>
                            <SharedFilesAccordionPanel
                                key="sharedFiles"
                                title={l[19796] || 'Shared Files'}
                                chatRoom={room}
                                sharedFiles={room.messagesBuff.sharedFiles}
                            />
                            {room.type === "private" ?
                                <IncSharesAccordionPanel key="incomingShares" title={l[5542]} chatRoom={room} /> :
                                null
                            }
                        </Accordion>
                    </div>
                </PerfectScrollbar>
                {this.state.contactPickerDialog && (
                    <ContactPickerDialog
                        exclude={exParticipants}
                        megaChat={room.megaChat}
                        multiple={true}
                        className="popup add-participant-selector"
                        singleSelectedButtonLabel={room.isMeeting
                            ? l.meeting_add_participant /* `Add to meeting` */
                            : l[8869] /* `Add to Group Conversation` */}
                        multipleSelectedButtonLabel={room.isMeeting
                            ? l.meeting_add_participant /* `Add to meeting` */
                            : l[8869] /* `Add to Group Conversation` */}
                        nothingSelectedButtonLabel={l[8870] /* `Select one or more contacts to continue` */}
                        onSelectDone={selected => {
                            this.props.onAddParticipantSelected(selected);
                            this.setState({contactPickerDialog: false});
                        }}
                        onClose={() => this.setState({contactPickerDialog: false})}
                        selectFooter={true}
                    />
                )}
                {this.state.inviteDialog &&
                    <ModalDialogsUI.ModalDialog
                        onClose={() => {
                            this.setState({ inviteDialog: false });
                        }}
                        dialogName="chat-link-dialog"
                        chatRoom={room}>
                        <InviteParticipantsPanel
                            chatRoom={room}
                            onAddParticipants={() => {
                                this.setState({ inviteDialog: false }, () => this.handleAddParticipants());
                            }}
                        />
                    </ModalDialogsUI.ModalDialog>
                }
            </div>
        );
    }
}

export class ConversationPanel extends MegaRenderMixin {
    containerRef = React.createRef();
    $container = null;
    $messages = null;

    state = {
        startCallPopupIsActive: false,
        localVideoIsMinimized: false,
        isFullscreenModeEnabled: false,
        mouseOverDuringCall: false,
        attachCloudDialog: false,
        messagesToggledInCall: false,
        sendContactDialog: false,
        confirmDeleteDialog: false,
        pasteImageConfirmDialog: false,
        nonLoggedInJoinChatDialog: false,
        pushSettingsDialog: false,
        pushSettingsValue: null,
        messageToBeDeleted: null,
        callMinimized: false,
        editing: false,
        showHistoryRetentionDialog: false,
        setNonLoggedInJoinChatDlgTrue: null,
        hasInvalidKeys: null,
        invalidKeysBanner: null,
        descriptionDialog: false,
        occurrencesLoading: false,
        waitingRoom: false
    };

    constructor(props) {
        super(props);

        const { chatRoom } = this.props;
        chatRoom.rebind(`openAttachCloudDialog.${this.getUniqueId()}`, () => this.openAttachCloudDialog());
        chatRoom.rebind(`openSendContactDialog.${this.getUniqueId()}`, () => this.openSendContactDialog());
        chatRoom.rebind(`openSchedDescDialog.${this.getUniqueId()}`, () => this.openSchedDescDialog());

        this.handleKeyDown = SoonFc(120, (ev) => this._handleKeyDown(ev));

        // Render the waiting room flow by default for chat links, E++ accounts
        this.state.waitingRoom =
            chatRoom.options.w && (chatRoom.isAnonymous() || megaChat.initialChatId || is_eplusplus);
    }

    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    openAttachCloudDialog() {
        this.setState({ 'attachCloudDialog': true });
    }

    openSendContactDialog() {
        this.setState({ 'sendContactDialog': true });
    }

    openSchedDescDialog() {
        this.setState({ descriptionDialog: true });
    }

    @utils.SoonFcWrap(360)
    onMouseMove() {
        if (this.isComponentEventuallyVisible()) {
            this.props.chatRoom.trigger("onChatIsFocused");
        }
    }

    _handleKeyDown() {
        if (this.__isMounted) {
            const chatRoom = this.props.chatRoom;
            if (chatRoom.isActive() && !chatRoom.isReadOnly()) {
                chatRoom.trigger("onChatIsFocused");
            }
        }
    }

    handleDeleteDialog(msg) {
        if (msg) {
            this.setState({ editing: false, confirmDeleteDialog: true, messageToBeDeleted: msg });
        }
    }

    toggleExpandedFlag() {
        if (this.props.onToggleExpandedFlag) {
            this.props.onToggleExpandedFlag();
        }
        return document.body.classList[Call.isExpanded() ? 'remove' : 'add'](EXPANDED_FLAG);
    }

    startCall(type, scheduled) {
        const { chatRoom } = this.props;

        if (isStartCallDisabled(chatRoom) || chatRoom.iAmWaitingRoomPeer()) {
            return false;
        }

        return type === TYPE.AUDIO ? chatRoom.startAudioCall(scheduled) : chatRoom.startVideoCall(scheduled);
    }

    renderUpcomingInfo() {
        const { scheduledMeeting } = this.props.chatRoom;
        if (scheduledMeeting) {
            const { recurring, nextOccurrenceStart, nextOccurrenceEnd, isUpcoming } = scheduledMeeting;
            const until = `${isSameDay(nextOccurrenceStart, nextOccurrenceEnd) ?
                '' :
                time2date(nextOccurrenceEnd / 1000, 4)} ${toLocaleTime(nextOccurrenceEnd)}`;

            return (
                <>
                    {isUpcoming && recurring && <span>{l.next_meeting}</span>}
                    <span>
                        {(l.schedule_formatted_date || '%1 from %2 to %3')
                            .replace('%1', time2date(nextOccurrenceStart / 1000, 4))
                            .replace('%2', toLocaleTime(nextOccurrenceStart))
                            .replace('%3', until)}
                    </span>
                </>
            );
        }
        return null;
    }

    componentDidMount() {
        super.componentDidMount();
        const { chatRoom } = this.props;
        this.$container = $('.conversation-panel', '#fmholder');
        this.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', this.$container);

        window.addEventListener('keydown', this.handleKeyDown);

        chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', () => {
            this.callJustEnded = true;
        });

        chatRoom.rebind('onSendMessage.scrollToBottom', () => {
            chatRoom.scrolledToBottom = true;
            if (this.messagesListScrollable) {
                this.messagesListScrollable.scrollToBottom();
            }
        });

        chatRoom.rebind('openSendFilesDialog.cpanel', () => {
            this.setState({ attachCloudDialog: true });
        });

        chatRoom.rebind('showGetChatLinkDialog.ui', () => {
            createTimeoutPromise(() => chatRoom.topic && chatRoom.state === ChatRoom.STATE.READY, 350, 15000)
                .always(() => {
                    return chatRoom.isCurrentlyActive ?
                        this.setState({ chatLinkDialog: true }, () => affiliateUI.registeredDialog.show()) :
                        chatRoom.updatePublicHandle(false, true);
                });
        });

        if (chatRoom.type === 'private') {
            const otherContactHash = chatRoom.getParticipantsExceptMe()[0];
            if (otherContactHash in M.u) {
                this._privateChangeListener = M.u[otherContactHash].addChangeListener(() => {
                    if (!this.isMounted()) {
                        // theoretical chance of leaking - M.u[...] removed before the listener is removed
                        return 0xDEAD;
                    }
                    this.safeForceUpdate();
                });
            }
        }

        if (is_chatlink && !chatRoom.isMeeting) {
            this.state.setNonLoggedInJoinChatDlgTrue = setTimeout(() => {
                M.safeShowDialog('chat-links-preview-desktop', () => {
                    if (this.isMounted()) {
                        // may not be mounted in case of getting redirected to existing room to the fm -> chat ->
                        // chatroom
                        this.setState({ nonLoggedInJoinChatDialog: true });
                    }
                });
            }, rand_range(5, 10) * 1000);
        }

        if (is_chatlink && chatRoom.isMeeting && u_type !== false && u_type < 3) {
            eventlog(99747, JSON.stringify([1, u_type | 0]), true);
        }
        chatRoom._uiIsMounted = true;
        chatRoom.$rConversationPanel = this;
        chatRoom.trigger('onComponentDidMount');

        ChatdIntegration._waitForProtocolHandler(chatRoom, () => {
            if (this.isMounted()) {
                const hasInvalidKeys = chatRoom.hasInvalidKeys();
                this.setState({ hasInvalidKeys, invalidKeysBanner: hasInvalidKeys }, () => this.safeForceUpdate());
            }
        });

        this.eventuallyInit();

        // --

        megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () => {
            return this.isMounted() && this.setState({ occurrencesLoading: false });
        });

        chatRoom.rebind(`wrOnJoinNotAllowed.${this.getUniqueId()}`, () => {
            return this.isMounted() && this.setState({ waitingRoom: true });
        });

        chatRoom.rebind(`wrOnJoinAllowed.${this.getUniqueId()}`, () => {
            return this.isMounted() && this.setState({ waitingRoom: false });
        });

        // Waiting room link where the current user is already a participant -> join the room automatically and mount
        // the waiting room UI w/o going through the `Ask to join` workflow; hosts are bypassing the waiting room here.
        if (chatRoom.options.w) {
            chatRoom.rebind(`onMembersUpdated.${this.getUniqueId()}`, (ev, { userId, priv }) => {
                if (userId === u_handle && priv !== ChatRoom.MembersSet.PRIVILEGE_STATE.LEFT) {
                    chatRoom.unbind(`onMembersUpdated.${this.getUniqueId()}`);
                    if (is_chatlink) {
                        return megaChat.routing.reinitAndOpenExistingChat(chatRoom.chatId, chatRoom.publicChatHandle)
                            .then(chatRoom =>
                                chatRoom.havePendingCall() &&
                                priv === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR &&
                                chatRoom.joinCall()
                            )
                            .catch(dump);
                    }
                    return (
                        this.state.waitingRoom &&
                        this.setState({ waitingRoom: priv !== ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR })
                    );
                }
            });
        }

        this.pageChangeListener = mBroadcaster.addListener('beforepagechange', () =>
            M.chat &&
            this.state.waitingRoom &&
            this.setState({ waitingRoom: false }, () => this.safeForceUpdate())
        );
    }

    eventuallyInit() {
        var self = this;

        // because..JSP would hijack some DOM elements, we need to wait with this...
        if (self.initialised) {
            return;
        }
        var $container = $(self.findDOMNode());

        if ($container.length > 0) {
            self.initialised = true;
        }
        else {
            return;
        }

        var room = self.props.chatRoom;

        // collapse on ESC pressed (exited fullscreen)
        $(document)
            .rebind("fullscreenchange.megaChat_" + room.roomId, function() {
                if (self.isComponentEventuallyVisible()) {
                    self.setState({isFullscreenModeEnabled: !!$(document).fullScreen()});
                    self.forceUpdate();
                }
            });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        var self = this;
        var chatRoom = self.props.chatRoom;

        chatRoom._uiIsMounted = true;

        if (this._privateChangeListener) {
            var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];
            if (otherContactHash in M.u) {
                M.u[otherContactHash].removeChangeListener(this._privateChangeListener);
                delete this._privateChangeListener;
            }
        }

        mBroadcaster.removeListener(this.pageChangeListener);

        this.props.chatRoom.unbind("openAttachCloudDialog." + this.getUniqueId());
        this.props.chatRoom.unbind("openSendContactDialog." + this.getUniqueId());
        this.props.chatRoom.unbind(`openSchedDescDialog.${this.getUniqueId()}`);
        window.removeEventListener('keydown', self.handleKeyDown);
        $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
        $(document).off('keydown.keyboardScroll_' + chatRoom.roomId);
        this.props.chatRoom.unbind(`wrOnJoinNotAllowed.${this.getUniqueId()}`);
        this.props.chatRoom.unbind(`wrOnJoinAllowed.${this.getUniqueId()}`);
        megaChat.unbind(`onIncomingCall.${this.getUniqueId()}`);
    }

    componentDidUpdate(prevProps, prevState) {
        var self = this;
        var room = this.props.chatRoom;

        self.eventuallyInit(false);

        room.megaChat.updateSectionUnreadCount();

        var domNode = self.findDOMNode();

        if (prevState.messagesToggledInCall !== self.state.messagesToggledInCall || self.callJustEnded) {
            if (self.callJustEnded) {
                self.callJustEnded = false;
            }
            self.$messages.trigger('forceResize', [
                true,
                1
            ]);
            Soon(function() {
                self.messagesListScrollable.scrollToBottom(true);
            });
        }

        if (prevProps.isActive === false && self.props.isActive === true) {
            var $typeArea = $('.messages-textarea:visible:first', domNode);
            if ($typeArea.length === 1) {
                $typeArea.trigger("focus");
                moveCursortoToEnd($typeArea[0]);
            }
        }
        if (!prevState.renameDialog && self.state.renameDialog === true) {
            Soon(function() {
                var $input = $('.chat-rename-dialog input');
                if ($input && $input[0] && !$($input[0]).is(":focus")) {
                    $input.trigger("focus");
                    $input[0].selectionStart = 0;
                    $input[0].selectionEnd = $input.val().length;
                }
            });
        }



        if (self.$messages && self.isComponentEventuallyVisible()) {
            $(window).rebind('pastedimage.chatRoom', function(e, blob, fileName) {
                if (self.$messages && self.isComponentEventuallyVisible()) {
                    self.setState({'pasteImageConfirmDialog': [blob, fileName, URL.createObjectURL(blob)]});
                    e.preventDefault();
                }
            });
            self.props.chatRoom.trigger("onComponentDidUpdate");
        }
    }

    isActive() {
        return document.hasFocus() && this.$messages && this.$messages.is(":visible");
    }

    @timing(0.7, 9)
    render() {
        var self = this;

        var room = this.props.chatRoom;
        if (!room || !room.roomId) {
            return null;
        }
        // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
            return null;
        }
        self._wasAppendedEvenOnce = true;

        var contacts = room.getParticipantsExceptMe();
        var contactHandle;
        var contact;

        var conversationPanelClasses = "conversation-panel " + (room.type === "public" ? "group-chat " : "") +
            room.type + "-chat";

        if (!room.isCurrentlyActive || megaChat._joinDialogIsShown) {
            conversationPanelClasses += " hidden";
        }

        var topicBlockClass = "chat-topic-block";
        if (room.type !== "public") {
            topicBlockClass += " privateChat";
        }


        var attachCloudDialog = null;
        if (self.state.attachCloudDialog === true) {
            var selected = [];
            attachCloudDialog = <CloudBrowserModalDialog.CloudBrowserDialog
                allowAttachFolders={true}
                room={room}
                onClose={() => {
                    self.setState({'attachCloudDialog': false});
                    selected = [];
                }}
                onSelected={(nodes) => {
                    selected = nodes;
                }}
                onAttachClicked={() => {
                    self.setState({'attachCloudDialog': false});

                    self.props.chatRoom.scrolledToBottom = true;

                    room.attachNodes(selected).catch(dump);
                }}
            />;
        }

        var nonLoggedInJoinChatDialog = null;
        if (self.state.nonLoggedInJoinChatDialog === true) {
            var usersCount = Object.keys(room.members).length;
            let closeJoinDialog = () => {
                onIdle(() => {
                    if ($.dialog === 'chat-links-preview-desktop') {
                        closeDialog();
                    }
                });
                self.setState({'nonLoggedInJoinChatDialog': false});
            };
            nonLoggedInJoinChatDialog =
                <ModalDialogsUI.ModalDialog
                    title={l[20596]}
                    className={"mega-dialog chat-links-preview-desktop dialog-template-graphic"}
                    chatRoom={room}
                    onClose={closeJoinDialog}>
                    <section className="content">
                        <div className="chatlink-contents">
                            <div className="huge-icon group-chat" />
                            <h3>
                                <Emoji>
                                    {room.getRoomTitle()}
                                </Emoji>
                            </h3>
                            <h5>{usersCount ? mega.icu.format(l[20233], usersCount) : ''}</h5>
                            <p>{l[20595]}</p>
                        </div>
                    </section>
                    <footer>
                        <div className="bottom-buttons">
                            <button
                                className="mega-button positive"
                                onClick={() => {
                                    closeJoinDialog();
                                    megaChat.loginOrRegisterBeforeJoining(
                                        room.publicChatHandle,
                                        false,
                                        false,
                                        false,
                                        () => {
                                            megaChat.routing.reinitAndJoinPublicChat(
                                                room.chatId,
                                                room.publicChatHandle,
                                                room.publicChatKey
                                            ).then(
                                                () => {
                                                    delete megaChat.initialPubChatHandle;
                                                },
                                                (ex) => {
                                                    console.error("Failed to join room:", ex);
                                                }
                                            );
                                        }
                                    );
                                }}>
                                {l[20597]}
                            </button>
                            <button className="mega-button" onClick={closeJoinDialog}>{l[18682]}</button>
                        </div>
                    </footer>
                </ModalDialogsUI.ModalDialog>;
        }

        var chatLinkDialog;
        if (self.state.chatLinkDialog === true) {
            chatLinkDialog = <ChatlinkDialog
                chatRoom={self.props.chatRoom}
                onClose={() => {
                    self.setState({'chatLinkDialog': false});
                }}
            />
        }

        let privateChatDialog;
        if (self.state.privateChatDialog === true) {
            const onClose = () => this.setState({ privateChatDialog: false });
            privateChatDialog = (
                <ModalDialogsUI.ModalDialog
                    title={l[20594]}
                    className="mega-dialog create-private-chat"
                    chatRoom={room}
                    onClose={onClose}
                    dialogType="action"
                    dialogName="create-private-chat-dialog">

                    <section className="content">
                        <div className="content-block">
                            <i className="huge-icon lock" />
                            <div className="dialog-body-text">
                                <strong>{l[20590]}</strong>
                                <br />
                                <span>{l[20591]}</span>
                            </div>
                        </div>
                    </section>

                    <footer>
                        <div className="footer-container">
                            <button
                                className="mega-button positive large"
                                onClick={() => {
                                    this.props.chatRoom.switchOffPublicMode();
                                    onClose();
                                }}>
                                <span>{l[20593]}</span>
                            </button>
                        </div>
                    </footer>
                </ModalDialogsUI.ModalDialog>
            );
        }

        var sendContactDialog = null;
        if (self.state.sendContactDialog === true) {
            var excludedContacts = [];
            if (room.type == "private") {
                room.getParticipantsExceptMe().forEach(function(userHandle) {
                    if (userHandle in M.u) {
                        excludedContacts.push(
                            M.u[userHandle].u
                        );
                    }
                });
            }

            sendContactDialog = <ModalDialogsUI.SelectContactDialog
                chatRoom={room}
                exclude={excludedContacts}
                onClose={() => {
                    self.setState({'sendContactDialog': false});
                    selected = [];
                }}
                onSelectClicked={(selected) => {
                    self.setState({'sendContactDialog': false});

                    room.attachContacts(selected);
                }}
            />
        }

        var confirmDeleteDialog = null;
        if (self.state.confirmDeleteDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                chatRoom={room}
                dialogType="main"
                title={l[8004]}
                subtitle={l[8879]}
                name="delete-message"
                pref="1"
                onClose={() => {
                    self.setState({'confirmDeleteDialog': false});
                }}
                onConfirmClicked={() => {
                    var msg = self.state.messageToBeDeleted;
                    if (!msg) {
                        return;
                    }
                    var chatdint = room.megaChat.plugins.chatdIntegration;
                    if (msg.getState() === Message.STATE.SENT ||
                        msg.getState() === Message.STATE.DELIVERED ||
                        msg.getState() === Message.STATE.NOT_SENT) {
                            const textContents = msg.textContents || '';

                            if (textContents[1] === Message.MANAGEMENT_MESSAGE_TYPES.VOICE_CLIP) {
                                const attachmentMetadata = msg.getAttachmentMeta() || [];

                            Promise.all(attachmentMetadata.map((v) => M.moveToRubbish(v.h))).catch(dump);
                            }

                            chatdint.deleteMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
                            msg.deleted = true;
                            msg.textContents = "";
                    }
                    else if (
                        msg.getState() === Message.STATE.NOT_SENT_EXPIRED
                    ) {
                        chatdint.discardMessage(room, msg.internalId ? msg.internalId : msg.orderValue);
                    }


                    self.setState({
                        'confirmDeleteDialog': false,
                        'messageToBeDeleted': false
                    });

                    if (
                        msg.getState &&
                        msg.getState() === Message.STATE.NOT_SENT &&
                        !msg.requiresManualRetry
                    ) {
                        msg.message = "";
                        msg.textContents = "";
                        msg.messageHtml = "";
                        msg.deleted = true;

                        msg.trigger(
                            'onChange',
                            [
                                msg,
                                "deleted",
                                false,
                                true
                            ]
                        );
                    }

                }}
            >

                <section className="content">
                    <div className="content-block">
                        <GenericConversationMessage
                            className=" dialog-wrapper"
                            message={self.state.messageToBeDeleted}
                            hideActionButtons={true}
                            initTextScrolling={true}
                            dialog={true}
                            chatRoom={self.props.chatRoom}
                        />
                    </div>
                </section>
            </ModalDialogsUI.ConfirmDialog>
        }

        if (self.state.pasteImageConfirmDialog) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                chatRoom={room}
                title={l[20905]}
                subtitle={l[20906]}
                icon="sprite-fm-uni icon-question"
                name="paste-image-chat"
                pref="2"
                onClose={() => {
                    self.setState({'pasteImageConfirmDialog': false});
                }}
                onConfirmClicked={() => {
                    var meta = self.state.pasteImageConfirmDialog;
                    if (!meta) {
                        return;
                    }

                    try {
                        Object.defineProperty(meta[0], 'name', {
                            configurable: true,
                            writeable: true,
                            value: Date.now() + '.' + M.getSafeName(meta[1] || meta[0].name)
                        });
                    }
                    catch (e) {}

                    self.props.chatRoom.scrolledToBottom = true;

                    M.addUpload([meta[0]]);

                    self.setState({
                        'pasteImageConfirmDialog': false
                    });

                    URL.revokeObjectURL(meta[2]);
                }}
            >
                <img
                    src={self.state.pasteImageConfirmDialog[2]}
                    style={{
                        maxWidth: "90%",
                        height: "auto",
                        maxHeight: $(document).outerHeight() * 0.3,
                        margin: '10px auto',
                        display: 'block',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                    }}
                    onLoad={function(e) {
                        $(e.target).parents('.paste-image-chat').position({
                            of: $(document.body)
                        });
                    }}
                />
            </ModalDialogsUI.ConfirmDialog>
        }

        //
        // Push notification settings
        // ----------------------------------------------------------------------

        let pushSettingsDialog = null;
        if (self.state.pushSettingsDialog === true) {
            const state = { pushSettingsDialog: false, pushSettingsValue: null };
            pushSettingsDialog = (
                <PushSettingsDialog
                    room={room}
                    pushSettingsValue={this.state.pushSettingsValue}
                    onClose={() =>
                        this.setState({ ...state, pushSettingsValue: this.state.pushSettingsValue })
                    }
                    onConfirm={pushSettingsValue =>
                        self.setState({ ...state, pushSettingsValue }, () =>
                            pushNotificationSettings.setDnd(
                                room.chatId,
                                pushSettingsValue === Infinity ? 0 : unixtime() + pushSettingsValue * 60
                            )
                        )
                    }
                />
            );
        }

        var confirmTruncateDialog = null;
        if (self.state.truncateDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                chatRoom={room}
                title={room.isMeeting
                    ? l.meeting_clear_hist /* `Clear Meeting History` */
                    : l[8871] /* `Clear Chat History` */}
                subtitle={room.isMeeting
                    ? l.meeting_trunc_txt/* `Are you sure you want to clear the full message history of this meeting?`*/
                    : l[8881] /* `Are you sure you want to clear the full message history of this conversation?` */}
                icon="sprite-fm-uni icon-question"
                name="truncate-conversation"
                pref="3"
                dontShowAgainCheckbox={false}
                onClose={() => {
                    self.setState({'truncateDialog': false});
                }}
                onConfirmClicked={() => {
                    self.props.chatRoom.scrolledToBottom = true;

                    room.truncate();

                    self.setState({
                        'truncateDialog': false
                    });
                }}
            />;
        }

        if (self.state.archiveDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                chatRoom={room}
                title={room.isMeeting
                    ? l.meeting_archive_dlg /* `Archive meeting` */
                    : l[19068] /* `Archive chat` */}
                subtitle={room.isMeeting
                    ? l.meeting_archive_dlg_text /* `Are you sure you want to archive this meeting?` */
                    : l[19069] /* `Are you sure you want to archive this chat?` */}
                icon="sprite-fm-uni icon-question"
                name="archive-conversation"
                pref="4"
                onClose={() => {
                    self.setState({'archiveDialog': false});
                }}
                onConfirmClicked={() => {
                    self.props.chatRoom.scrolledToBottom = true;

                    room.archive();

                    self.setState({
                        'archiveDialog': false
                    });
                }}
            />;
        }
        if (self.state.unarchiveDialog === true) {
            confirmDeleteDialog = <ModalDialogsUI.ConfirmDialog
                chatRoom={room}
                title={room.isMeeting
                    ? l.meeting_unarchive_dlg /* `Unarchive meeting` */
                    : l[19063] /* `Unarchive chat` */}
                subtitle={room.isMeeting
                    ? l.meeting_unarchive_dlg_text /* `Are you sure you want to unarchive this meeting?` */
                    : l[19064] /* `Are you sure you want to unarchive this conversation?` */}
                icon="sprite-fm-uni icon-question"
                name="unarchive-conversation"
                pref="5"
                onClose={() => {
                    self.setState({'unarchiveDialog': false});
                }}
                onConfirmClicked={() => {
                    self.props.chatRoom.scrolledToBottom = true;

                    room.unarchive();

                    self.setState({
                        'unarchiveDialog': false
                    });
                }}
            />;
        }
        if (self.state.renameDialog === true) {
            var onEditSubmit = function(e) {
                if (self.props.chatRoom.setRoomTitle(self.state.renameDialogValue)) {
                    self.setState({'renameDialog': false, 'renameDialogValue': undefined});
                }
                e.preventDefault();
                e.stopPropagation();
            };
            var renameDialogValue = typeof(self.state.renameDialogValue) !== 'undefined' ?
                self.state.renameDialogValue :
                self.props.chatRoom.getRoomTitle();

            confirmDeleteDialog = <ModalDialogsUI.ModalDialog
                chatRoom={room}
                title={room.isMeeting
                    ? l.rename_meeting /* `Rename Meeting` */
                    : l[9080] /* `Rename Group` */}
                name="rename-group"
                className="chat-rename-dialog dialog-template-main"
                onClose={() => {
                    self.setState({'renameDialog': false, 'renameDialogValue': undefined});
                }}
                buttons={[
                    {
                        "label": l[1686],
                        "key": "cancel",
                        "onClick": function(e) {
                            self.setState({'renameDialog': false, 'renameDialogValue': undefined});
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    },
                    {
                        "label": l[61],
                        "key": "rename",
                        "className": (
                            $.trim(self.state.renameDialogValue).length === 0 ||
                            self.state.renameDialogValue === self.props.chatRoom.getRoomTitle() ?
                                "positive disabled" : "positive"
                        ),
                        "onClick": function(e) {
                            onEditSubmit(e);
                        }
                    },
                ]}>
                <section className="content">
                    <div className="content-block">
                        <div className="dialog secondary-header">
                            <div className="rename-input-bl">
                                <input
                                    type="text"
                                    className="chat-rename-group-dialog"
                                    name="newTopic"
                                    value={renameDialogValue}
                                    maxLength={ChatRoom.TOPIC_MAX_LENGTH}
                                    onChange={(e) => {
                                        self.setState({
                                            'renameDialogValue': e.target.value.substr(0, 30)
                                        });
                                    }}
                                    onKeyUp={(e) => {
                                        if (e.which === 13) {
                                            onEditSubmit(e);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </ModalDialogsUI.ModalDialog>
        }

        let { descriptionDialog } = this.state;
        descriptionDialog = descriptionDialog ? <ModalDialogsUI.ModalDialog
            className="scheduled-description-dialog"
            meeting={room.scheduledMeeting}
            onClose={() => {
                this.setState({ descriptionDialog: false });
            }}>
            <header>
                <h3>{l.schedule_desc_dlg_title /* `Meeting description` */}</h3>
            </header>
            <section className="content">
                <PerfectScrollbar className="description-scroller">
                    <ParsedHTML>
                        {
                            megaChat.html(room.scheduledMeeting.description).replace(/\n/g, '<br>')
                            || l.schedule_no_desc /* `The description has been removed` */
                        }
                    </ParsedHTML>

                </PerfectScrollbar>
            </section>
        </ModalDialogsUI.ModalDialog> : null;

        var additionalClass = "";

        var topicInfo = null;
        const isUpcoming = room.scheduledMeeting && room.scheduledMeeting.isUpcoming;
        const isRecurring = room.scheduledMeeting && room.scheduledMeeting.isRecurring;
        if (room.type === 'group' || room.type === 'public') {
            topicInfo =
                <div className="chat-topic-info">
                    <div
                        className={`
                            chat-topic-icon
                            ${room.isMeeting ? 'meeting-icon' : ''}
                        `}>
                        <i
                            className={
                                room.isMeeting ?
                                    'sprite-fm-mono icon-video-call-filled' :
                                    'sprite-fm-uni icon-chat-group'
                            }
                        />
                    </div>
                    <div className="chat-topic-text">
                        <span className="txt">
                            <Emoji>{room.getRoomTitle()}</Emoji>
                            {isUpcoming && isRecurring && <i className="sprite-fm-mono icon-repeat" />}
                        </span>
                        <span className="txt small">
                            {is_chatlink && isUpcoming && !isRecurring ?
                                this.renderUpcomingInfo() :
                                <MembersAmount chatRoom={room} />
                            }
                        </span>
                    </div>
                </div>;
        }
        else {
            contactHandle = contacts[0];
            contact = M.u[contactHandle];

            topicInfo = <ContactCard
                className="short"
                chatRoom={room}
                noContextButton="true"
                contact={contact}
                showLastGreen={true}
                key={contact.u} />;
        }
        let historyRetentionDialog = null;
        if (self.state.showHistoryRetentionDialog === true) {
            historyRetentionDialog = <HistoryRetentionDialog
                chatRoom={room}
                title={''}
                name="rename-group"
                className=""
                onClose={() => {
                    self.setState({ showHistoryRetentionDialog: false });
                }}
            />;
        }

        if (this.state.waitingRoom) {
            return (
                <WaitingRoom
                    chatRoom={room}
                    havePendingCall={room.havePendingCall()}
                    onWaitingRoomLeave={() => {
                        room.call?.destroy();

                        if (is_eplusplus) {
                            room.leave(true);
                            return onIdle(M.logout);
                        }

                        return (
                            this.setState({ waitingRoom: false }, () => {
                                onIdle(() => {
                                    if (megaChat.initialChatId) {
                                        megaChat.initialChatId = undefined;
                                        loadSubPage(getLandingPage());
                                    }
                                });
                            })
                        );
                    }}
                />
            );
        }

        const startCallDisabled = isStartCallDisabled(room) || room.iAmWaitingRoomPeer();

        return (
            <div
                className={conversationPanelClasses}
                onMouseMove={() => self.onMouseMove()}
                data-room-id={self.props.chatRoom.chatId}>
                {room.meetingsLoading && <Loading chatRoom={room} title={room.meetingsLoading.title} />}
                {room.call && (
                    <Call
                        chatRoom={room}
                        peers={room.call.peers}
                        call={room.call}
                        minimized={this.state.callMinimized}
                        onCallMinimize={() => {
                            return this.state.callMinimized ?
                                null :
                                this.setState({ callMinimized: true }, () => {
                                    this.toggleExpandedFlag();
                                    this.safeForceUpdate();
                                });
                        }}
                        onCallExpand={() => {
                            return this.state.callMinimized &&
                                this.setState({ callMinimized: false }, () => {
                                    $.hideTopMenu();
                                    if ($.dialog) {
                                        closeDialog();
                                    }
                                    loadSubPage('fm/chat');
                                    room.show();
                                    this.toggleExpandedFlag();
                                });
                        }}
                        didMount={() => {
                            this.toggleExpandedFlag();
                            if (room.isMeeting) {
                                room.updatePublicHandle().catch(dump);
                            }
                        }}
                        willUnmount={minimised =>
                            this.setState({ callMinimized: false }, () =>
                                minimised ? null : this.toggleExpandedFlag()
                            )
                        }
                        onCallEnd={() => this.safeForceUpdate()}
                        onDeleteMessage={msg => this.handleDeleteDialog(msg)}
                        parent={this}
                    />
                )}
                {megaChat.initialPubChatHandle && room.publicChatHandle === megaChat.initialPubChatHandle &&
                    !room.call && (
                    room.isMeeting && !room.call && room.activeCallIds.length > 0
                ) &&
                    <Join
                        initialView={u_type || is_eplusplus ? Join.VIEW.ACCOUNT : Join.VIEW.INITIAL}
                        chatRoom={room}
                        onJoinGuestClick={(firstName, lastName, audioFlag, videoFlag) => {
                            room.meetingsLoading = l.joining;
                            u_eplusplus(firstName, lastName)
                                .then(() => {
                                    return megaChat.routing.reinitAndJoinPublicChat(
                                        room.chatId,
                                        room.publicChatHandle,
                                        room.publicChatKey
                                    );
                                })
                                .then(() => {
                                    delete megaChat.initialPubChatHandle;
                                    return megaChat.getChatById(room.chatId).joinCall(audioFlag, videoFlag);
                                })
                                .catch((ex) => {
                                    if (d) {
                                        console.error('E++ account failure!', ex);
                                    }

                                    setTimeout(() => {
                                        msgDialog(
                                            'warninga',
                                            l[135],
                                            /* Failed to create E++ account. Please try again later. */
                                            l.eplusplus_create_failed,
                                            escapeHTML(api_strerror(ex) || ex)
                                        );
                                    }, 1234);

                                    eventlog(99745, JSON.stringify([1, String(ex).split('\n')[0]]));
                                });
                        }}
                        onJoinClick={(audioFlag, videoFlag) => {
                            const chatId = room.chatId;

                            if (room.members[u_handle]) {
                                delete megaChat.initialPubChatHandle;

                                megaChat.routing.reinitAndOpenExistingChat(chatId, room.publicChatHandle)
                                    .then(() => {
                                        return megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
                                    })
                                    .catch((ex) => {
                                        console.error("Failed to open existing room and join call:", ex);
                                    });
                            }
                            else {
                                megaChat.routing.reinitAndJoinPublicChat(
                                    chatId,
                                    room.publicChatHandle,
                                    room.publicChatKey
                                ).then(() => {
                                    delete megaChat.initialPubChatHandle;
                                    return megaChat.getChatById(chatId).joinCall(audioFlag, videoFlag);
                                }).catch((ex) => {
                                    console.error("Failed to join room:", ex);
                                });
                            }

                        }}
                    />
                }
                <div className={"chat-content-block " + (!room.megaChat.chatUIFlags['convPanelCollapse'] ?
                    "with-pane" : "no-pane")}>
                    {!room.megaChat.chatUIFlags['convPanelCollapse'] ? <ConversationRightArea
                        isVisible={this.props.chatRoom.isCurrentlyActive}
                        chatRoom={this.props.chatRoom}
                        roomFlags={this.props.chatRoom.flags}
                        members={this.props.chatRoom.membersSetFromApi}
                        messagesBuff={room.messagesBuff}
                        pushSettingsValue={pushNotificationSettings.getDnd(this.props.chatRoom.chatId)}
                        occurrencesLoading={this.state.occurrencesLoading}
                        onStartCall={(mode) =>
                            inProgressAlert()
                                .then(() => this.startCall(mode))
                                .catch(() => d && console.warn('Already in a call.'))
                        }
                        onAttachFromComputerClicked={function() {
                            self.props.chatRoom.uploadFromComputer();
                        }}
                        onTruncateClicked={function() {
                            self.setState({'truncateDialog': true});
                        }}
                        onArchiveClicked={function() {
                            self.setState({'archiveDialog': true});
                        }}
                        onUnarchiveClicked={function() {
                            self.setState({'unarchiveDialog': true});
                        }}
                        onRenameClicked={function() {
                            self.setState({
                                'renameDialog': true,
                                'renameDialogValue': self.props.chatRoom.getRoomTitle()
                            });
                        }}
                        onGetManageChatLinkClicked={function() {
                            self.setState({
                                'chatLinkDialog': true
                            });
                        }}
                        onMakePrivateClicked={function() {
                            self.setState({'privateChatDialog': true});
                        }}
                        onCloseClicked={function() {
                            room.destroy();
                        }}
                        onJoinViaPublicLinkClicked={function() {
                            room.joinViaPublicHandle();
                        }}
                        onSwitchOffPublicMode = {function(topic) {
                            room.switchOffPublicMode(topic);
                        }}
                        onAttachFromCloudClicked={function() {
                            self.setState({'attachCloudDialog': true});
                        }}
                        onPushSettingsClicked={function() {
                            self.setState({ 'pushSettingsDialog': true });
                        }}
                        onPushSettingsToggled={function() {
                            return room.dnd || room.dnd === 0 ?
                                self.setState({ pushSettingsValue: null }, () =>
                                    pushNotificationSettings.disableDnd(room.chatId)
                                ) :
                                pushNotificationSettings.setDnd(room.chatId, 0);
                        }}
                        onHistoryRetentionConfig={function() {
                            self.setState({showHistoryRetentionDialog: true});
                        }}
                        onAddParticipantSelected={contactHashes => {
                            room.scrolledToBottom = true;

                            if (room.type === 'group' || room.type === 'public') {
                                // Waiting rooms -- allow the invited peer to join the call immediately without having
                                // them go through the waiting room list.
                                if (room.options.w && room.call) {
                                    room.call.sfuClient?.wrAllowJoin(contactHashes);
                                }
                                return room.trigger('onAddUserRequest', [contactHashes]);
                            }

                            loadingDialog.show();
                            megaChat.trigger(
                                'onNewGroupChatRequest',
                                [
                                    [...room.getParticipantsExceptMe(), ...contactHashes],
                                    { keyRotation: false, topic: '' }
                                ]
                            );
                        }}
                        onShowScheduledDescription={() => {
                            if (room.scheduledMeeting) {
                                this.setState({ descriptionDialog: true });
                            }
                        }}
                    /> : null}

                    {privateChatDialog}
                    {chatLinkDialog}
                    {nonLoggedInJoinChatDialog}
                    {attachCloudDialog}
                    {sendContactDialog}
                    {confirmDeleteDialog}
                    {historyRetentionDialog}
                    {confirmTruncateDialog}
                    {pushSettingsDialog}
                    {descriptionDialog}


                    <div className="dropdown body dropdown-arrow down-arrow tooltip not-sent-notification hidden">
                        <i className="dropdown-white-arrow"></i>
                        <div className="dropdown notification-text">
                            <i className="small-icon conversations"></i>
                            {l[8882]}
                        </div>
                    </div>


                    <div
                        className={`
                            chat-topic-block
                            ${topicBlockClass}
                            ${room.haveActiveCall() ? 'in-call' : ''}
                        `}>
                        <div className="chat-topic-buttons">
                            {room.type === 'public' && room.isMeeting &&
                                <Button
                                    className="mega-button small share-meeting-button"
                                    label={l.share_meeting_button /* `Share meeting` */}
                                    onClick={() => this.setState({ chatLinkDialog: true }, () => eventlog(500230))}
                                />
                            }
                            <Button
                                className="right"
                                disableCheckingVisibility={true}
                                icon="sprite-fm-mono icon-info-filled"
                                onClick={() => room.megaChat.toggleUIFlag('convPanelCollapse')}
                            />
                            <div
                                data-simpletip={
                                    /* `Your browser doesn't support video calls. Try a different browser.` */
                                    l.unsupported_browser_video
                                }
                                data-simpletipposition="top"
                                data-simpletipoffset="5"
                                className={`
                                    ${!megaChat.hasSupportForCalls ? 'simpletip' : ''}
                                    right
                                    ${startCallDisabled ? 'disabled' : ''}
                                `}>
                                <Button
                                    icon="sprite-fm-mono icon-video-call-filled"
                                    onClick={() =>
                                        startCallDisabled ?
                                            false :
                                            inProgressAlert()
                                                .then(() => this.startCall(TYPE.VIDEO))
                                                .catch(() => d && console.warn('Already in a call.'))
                                    }
                                />
                            </div>
                            <div
                                data-simpletip={
                                    /* `Your browser doesn't support audio calls. Try a different browser.` */
                                    l.unsupported_browser_audio
                                }
                                data-simpletipposition="top"
                                data-simpletipoffset="5"
                                className={`
                                    ${!megaChat.hasSupportForCalls ? 'simpletip' : ''}
                                    right
                                    ${startCallDisabled ? 'disabled' : ''}
                                `}>
                                <Button
                                    icon="sprite-fm-mono icon-phone"
                                    onClick={() =>
                                        startCallDisabled ?
                                            false :
                                            inProgressAlert()
                                                .then(() => this.startCall(TYPE.AUDIO))
                                                .catch(() => d && console.warn('Already in a call.'))
                                    }
                                />
                            </div>
                        </div>
                        {topicInfo}
                    </div>

                    <div
                        ref={this.containerRef}
                        className={`
                            messages-block
                            ${additionalClass}
                        `}>
                        {this.state.hasInvalidKeys && this.state.invalidKeysBanner && (
                            /* `Unable to join the chat. Reload MEGA Chat and try again. [A]Reload MEGA Chat[/A]` */
                            <Alert
                                type={Alert.TYPE.HIGH}
                                content={
                                    <>
                                        {l.chat_key_failed_banner.split('[A]')[0]}
                                        <a onClick={() => M.reload()}>
                                            {l.chat_key_failed_banner.substring(
                                                l.chat_key_failed_banner.indexOf('[A]') + 3,
                                                l.chat_key_failed_banner.indexOf('[/A]')
                                            )}
                                        </a>
                                        {l.chat_key_failed_banner.split('[/A]')[1]}
                                    </>
                                }
                                onClose={() => this.setState({ invalidKeysBanner: false })}
                            />
                        )}

                        <HistoryPanel
                            {...this.props}
                            onMessagesListScrollableMount={mls => {
                                this.messagesListScrollable = mls;
                            }}
                            ref={historyPanel => {
                                this.historyPanel = historyPanel;
                            }}
                            onDeleteClicked={msg => this.handleDeleteDialog(msg)}
                        />

                        {
                            !is_chatlink &&
                            room.state !== ChatRoom.STATE.LEFT &&
                            navigator.onLine &&
                            room.scheduledMeeting &&
                            !room.isArchived() &&
                            !isStartCallDisabled(room) ?
                                <StartMeetingNotification
                                    chatRoom={room}
                                    offset={this.props.offset}
                                    onWaitingRoomJoin={() => this.setState({ waitingRoom: true })}
                                    onStartCall={mode => {
                                        return isStartCallDisabled(room) ?
                                            null :
                                            inProgressAlert(true, room)
                                                .then(() => this.startCall(mode, true))
                                                .catch((ex) => d && console.warn(`Already in a call. ${ex}`));
                                    }}
                                /> :
                                null
                        }

                        {
                            !is_chatlink &&
                            room.state !== ChatRoom.STATE.LEFT &&
                            (room.havePendingGroupCall() || room.havePendingCall()) &&
                            navigator.onLine ?
                                <JoinCallNotification
                                    chatRoom={room}
                                    offset={this.props.offset}
                                /> :
                                null
                        }

                        {room.isAnonymous() ?
                            <div className="join-chat-block">
                                <div
                                    className="mega-button large positive"
                                    onClick={() => {
                                        const join = () => {
                                            megaChat.routing.reinitAndJoinPublicChat(
                                                room.chatId,
                                                room.publicChatHandle,
                                                room.publicChatKey
                                            ).then(
                                                () => delete megaChat.initialPubChatHandle,
                                                ex => console.error("Failed to join room:", ex)
                                            );
                                        };

                                        if (u_type === 0) {
                                            return loadSubPage('register');
                                        }

                                        if (u_type === false) {
                                            clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
                                            megaChat.loginOrRegisterBeforeJoining(
                                                room.publicChatHandle,
                                                false,
                                                false,
                                                false,
                                                join
                                            );
                                            return;
                                        }

                                        clearTimeout(self.state.setNonLoggedInJoinChatDlgTrue);
                                        join();
                                    }}>
                                    {l[20597] /* `Join Group` */}
                                </div>
                            </div> :
                            <ComposedTextArea chatRoom={room} parent={this} containerRef={this.containerRef}/>
                        }
                    </div>
                </div>
            </div>
        );
    }
}

export class ConversationPanels extends MegaRenderMixin {
    alertsOffset = 4;
    notificationListener = 'meetings:notificationPermissions';
    notificationGranted = undefined;
    notificationHelpURL =
        `${l.mega_help_host}/chats-meetings/meetings/enable-notification-browser-system-permission`;

    state = {
        supportAlert: undefined,
        notificationsPermissions: undefined,
        alertsOffset: this.alertsOffset
    };

    constructor(props) {
        super(props);
        this.state.supportAlert = !megaChat.hasSupportForCalls;
        this.state.notificationsPermissions = window.Notification ? Notification.permission : 'granted';
    }

    closeSupportAlert = () => this.setState({ supportAlert: false }, () => mega.config.set('nocallsup', 1));

    onNotificationsGranted = () => {
        msgDialog(
            'info',
            '',
            l.notifications_permissions_granted_title,
            l.notifications_permissions_granted_info
                .replace('[A]', `<a href="${this.notificationHelpURL}" target="_blank" class="clickurl">`)
                .replace('[/A]', '</a>')
        );
        this.notificationGranted =
            new Notification(l.notification_granted_title, { body: l.notification_granted_body });
    };

    renderNotificationsPending() {
        return (
            <Alert
                type={Alert.TYPE.LIGHT}
                className={`
                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                    ${this.props.isEmpty ? 'empty-state' : ''}
                `}
                onTransition={ref =>
                    this.setState({ alertsOffset: ref ? ref.current.offsetHeight : this.alertsOffset })
                }
                onClose={() => {
                    this.setState({ notificationsPermissions: undefined }, () => {
                        showToast(
                            'success',
                            l.notifications_permissions_toast_title,
                            l.notifications_permissions_toast_control,
                            '',
                            () => loadSubPage('fm/account/notifications')
                        );
                    });
                }}>
                {l.notifications_permissions_pending}
                <div className="meetings-alert-control">
                    <a
                        href="#"
                        onClick={ev => {
                            ev.preventDefault();
                            Notification.requestPermission()
                                .then(status => {
                                    this.setState({ notificationsPermissions: status }, () =>
                                        onIdle(() =>
                                            this.state.notificationsPermissions === 'granted' &&
                                            this.onNotificationsGranted()
                                        )
                                    );
                                })
                                .catch(ex => d && console.warn(`Failed to retrieve permissions: ${ex}`));
                        }}>
                        {l.notifications_permissions_enable}
                    </a>
                </div>
            </Alert>
        );
    }

    renderNotificationsBlocked() {
        return (
            <Alert
                type={Alert.TYPE.MEDIUM}
                className={`
                    ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                    ${this.props.isEmpty ? 'empty-state' : ''}
                `}
                onTransition={ref =>
                    this.setState({ alertsOffset: ref ? ref.current.offsetHeight : this.alertsOffset })
                }
                onClose={() => this.setState({ notificationsPermissions: undefined })}>
                <ParsedHTML
                    content={
                        l.notifications_permissions_denied_info
                            .replace(
                                '[A]',
                                `<a href="${this.notificationHelpURL}" target="_blank" class="clickurl">`
                            )
                            .replace('[/A]', '</a>')
                    }
                />
            </Alert>
        );
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        mBroadcaster.removeListener(this.notificationListener);
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.onMount?.();

        megaChat.chats.forEach(chatRoom => {
            const { scheduledMeeting } = chatRoom;
            if (scheduledMeeting && scheduledMeeting.isUpcoming && scheduledMeeting.isRecurring) {
                scheduledMeeting.getOccurrences().catch(nop);
            }
        });

        mBroadcaster.addListener(this.notificationListener, notificationsPermissions =>
            this.isMounted() && this.setState({ notificationsPermissions })
        );
    }

    render() {
        const { routingSection, chatUIFlags, isEmpty, onToggleExpandedFlag } = this.props;
        const { notificationsPermissions, supportAlert, alertsOffset } = this.state;
        const now = Date.now();

        return (
            <div className="conversation-panels">
                {routingSection === 'contacts' || notificationsPermissions === 'granted' ?
                    null :
                    <>
                        {notificationsPermissions === 'default' && this.renderNotificationsPending()}
                        {notificationsPermissions === 'denied' && this.renderNotificationsBlocked()}
                    </>
                }

                {routingSection === 'contacts' ?
                    null :
                    supportAlert && !mega.config.get('nocallsup') && !notificationsPermissions &&
                        <Alert
                            type={Alert.TYPE.MEDIUM}
                            className={`
                                ${megaChat.chatUIFlags.convPanelCollapse ? 'full-span' : ''}
                                ${isEmpty ? 'empty-state' : ''}
                            `}
                            content={Call.getUnsupportedBrowserMessage()}
                            onClose={this.closeSupportAlert}
                        />
                }

                {megaChat.chats.map(chatRoom => {
                    if (chatRoom.isCurrentlyActive || now - chatRoom.lastShownInUI < 15 * 60 * 1000) {
                        return (
                            <ConversationPanel
                                key={`${chatRoom.roomId}_${chatRoom.instanceIndex}`}
                                chatRoom={chatRoom}
                                roomType={chatRoom.type}
                                isExpanded={chatRoom.megaChat.chatUIFlags.convPanelCollapse}
                                isActive={chatRoom.isCurrentlyActive}
                                messagesBuff={chatRoom.messagesBuff}
                                chatUIFlags={chatUIFlags}
                                offset={alertsOffset}
                                onToggleExpandedFlag={onToggleExpandedFlag}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        );
    }
}

export class EmptyConvPanel extends MegaRenderMixin {
    renderActions() {
        const { isMeeting, onNewChat, onStartMeeting, onScheduleMeeting } = this.props;

        if (isMeeting) {
            return (
                <Button
                    className="mega-button large positive"
                    label={l.new_meeting /* `New meeting` */}>
                    <Dropdown
                        className="light"
                        noArrow="true"
                        vertOffset={4}>
                        <DropdownItem
                            className="link-button"
                            icon="sprite-fm-mono icon-video-plus"
                            label={l.new_meeting_start /* `Start meeting now` */}
                            onClick={onStartMeeting}
                        />
                        <hr/>
                        <DropdownItem
                            className="link-button"
                            icon="sprite-fm-mono icon-calendar2"
                            label={l.schedule_meeting_start /* `Schedule meeting` */}
                            onClick={onScheduleMeeting}
                        />
                    </Dropdown>
                </Button>
            );
        }

        return (
            <Button
                className="mega-button large positive"
                label={l.add_chat /* `New chat` */}
                onClick={onNewChat}
            />
        );
    }

    render() {
        return (
            <div className="conversations-empty">
                <div className="conversations-empty-content">
                    <i className="sprite-fm-mono icon-chat-filled" />
                    {this.props.isMeeting ?
                        <>
                            <h1>{l.start_meeting /* `Start a meeting` */}</h1>
                            <p>{l.onboard_megachat_dlg3_text}</p>
                        </> :
                        <>
                            <h1>{l.start_chat /* `Start chatting now` */}</h1>
                            <p>{l.onboard_megachat_dlg2_text}</p>
                        </>
                    }
                    {this.renderActions()}
                </div>
            </div>
        );
    }
}

function isStartCallDisabled(room) {
    if (isGuest()) {
        return true;
    }
    if (!megaChat.hasSupportForCalls) {
        return true;
    }
    return !room.isOnlineForCalls() || room.isReadOnly() || !room.chatId || room.call ||
        (
            (room.type === "group" || room.type === "public")
            && !ENABLE_GROUP_CALLING_FLAG
        )
        || (room.getCallParticipants().length > 0);
}
