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
import Call, { EXPANDED_FLAG, inProgressAlert } from './meetings/call.jsx';
import HistoryPanel from "./historyPanel.jsx";
import ComposedTextArea from "./composedTextArea.jsx";
import Loading from "./meetings/workflow/loading.jsx";
import Join from "./meetings/workflow/join.jsx";
import Alert from './meetings/workflow/alert.jsx';
import { isSameDay, isToday, isTomorrow } from './meetings/schedule/helpers.jsx';
import { Edit } from './meetings/schedule/recurring.jsx';

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

    renderButton({ label, onClick, children = null }) {
        return (
            <Button
                className="link-button light red dropdown-element"
                icon="small-icon colorized horizontal-red-handset"
                label={label}
                onClick={onClick}>
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
                return this.renderButton({
                    label: l[5884],
                    onClick: peers ? null : () => call.hangUp(),
                    children: peers && (
                        <Dropdown
                            className="wide-dropdown send-files-selector light"
                            noArrow="true"
                            vertOffset={4}
                            horizOffset={0}>
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-leave-call"
                                label={l.leave}
                                onClick={() => call.hangUp()}
                            />
                            <DropdownItem
                                className="link-button"
                                icon="sprite-fm-mono icon-contacts"
                                label={l.end_for_all}
                                onClick={() => chatRoom.endCallForAll()}
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
                            )
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
        const { chatRoom, onStartCall } = this.props;

        if (chatRoom.call || !megaChat.hasSupportForCalls) {
            return null;
        }

        return (
            <div
                className="in-call-notif neutral start"
                onClick={() => onStartCall(Call.TYPE.AUDIO)}>
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
        const { chatRoom } = this.props;

        if (chatRoom.call) {
            return null;
        }

        if (!megaChat.hasSupportForCalls) {
            // `There is an active call in this room, but your browser does not support calls.`
            return <Alert type={Alert.TYPE.MEDIUM} content={l.active_call_not_supported} />;
        }

        return (
            <div className="in-call-notif neutral join">
                <i className="sprite-fm-mono icon-phone"/>
                <ParsedHTML
                    onClick={() =>
                        inProgressAlert(true, chatRoom)
                            .then(() => chatRoom.joinCall())
                            .catch((ex) => d && console.warn('Already in a call.', ex))
                    }>
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
                                                        this.setState({
                                                            editDialog: true,
                                                            occurrenceId: occurrence.uid
                                                        });
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
                {editDialog &&
                    <Edit
                        chatRoom={chatRoom}
                        scheduledMeeting={scheduledMeeting}
                        occurrenceId={occurrenceId}
                        onClose={() => {
                            this.setState({ editDialog: false });
                        }}
                    />
                }
            </>
        );
    }
}

export class ConversationRightArea extends MegaRenderMixin {
    static defaultProps = {
        'requiresUpdateOnResize': true
    };

    constructor(props) {
        super(props);
        this.state = { contactPickerDialog: false };
    }

    customIsEventuallyVisible() {
        return this.props.chatRoom.isCurrentlyActive;
    }

    setRetention(chatRoom, retentionTime) {
        chatRoom.setRetention(retentionTime);
        $(document).trigger('closeDropdowns');
    }

    cancelScheduledMeeting() {
        const { chatRoom } = this.props;
        const { scheduledMeeting, chatId } = chatRoom;

        if (scheduledMeeting) {
            const doCancel = () => megaChat.plugins.meetingsManager.cancelMeeting(scheduledMeeting, chatId);
            return (
                scheduledMeeting.isRecurring ?
                    msgDialog(
                        `confirmation:!^${l.cancel_meeting_series_button}!${l.schedule_cancel_abort}`,
                        null,
                        l.schedule_cancel_series_dlg_title,
                        l.schedule_cancel_series_dlg_text,
                        cb => cb && doCancel(),
                        1
                    ) :
                    msgDialog(
                        `confirmation:!^${l.cancel_meeting_button}!${l.schedule_cancel_abort}`,
                        null,
                        l.schedule_cancel_dlg_title,
                        l.schedule_cancel_dlg_text,
                        cb => cb && doCancel(),
                        1
                    )
            );
        }
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
        const { chatRoom: room, onStartCall, occurrencesLoading } = self.props;

        if (!room || !room.roomId) {
            // destroyed
            return null;
        }

        // room is not active, don't waste DOM nodes, CPU and Memory (and save some avatar loading calls...)
        if (!room.isCurrentlyActive && !self._wasAppendedEvenOnce) {
            return null;
        }
        self._wasAppendedEvenOnce = true;

        var startCallDisabled = isStartCallDisabled(room);
        var startCallButtonClass = startCallDisabled ? " disabled" : "";
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
                    data-simpletip={`${l.unsupported_browser_audio}`}
                    data-simpletipposition="top"
                    data-simpletipoffset="7"
                    className={`${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        link-button light ${startCallButtonClass}`}
                    onClick={() => onStartCall(Call.TYPE.AUDIO)}>
                    <i className="sprite-fm-mono icon-phone" />
                    <span>{l[5896] /* `Start Audio Call` */}</span>
                </div>;
        }
        if (startVideoCallButton !== null) {
            startVideoCallButton =
                <div
                    data-simpletip={`${l.unsupported_browser_video}`}
                    data-simpletipposition="top"
                    data-simpletipoffset="7"
                    className={`${megaChat.hasSupportForCalls ? '' : 'simpletip'}
                        link-button light ${startCallButtonClass}`}
                    onClick={() => onStartCall(Call.TYPE.VIDEO)}>
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
            ${Call.isGuest() || room.isReadOnly() || !room.iAmOperator() ? 'disabled' : ''}
        `;

        const getChatLinkClass = `
            link-button
            light
            ${Call.isGuest() || room.isReadOnly() ? 'disabled' : ''}
        `;

        let participantsList = null;
        if (room.type === "group" || room.type === "public") {
            participantsList = (
                <div>
                    {isReadOnlyElement}
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

        const addParticipantBtn = (
            <Button
                className="link-button light"
                icon="sprite-fm-mono icon-add-small"
                label={l[8007]}
                disabled={Call.isGuest() || room.isReadOnly() || !(room.iAmOperator()
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

        //
        // Push notification settings
        // ----------------------------------------------------------------------

        const { pushSettingsValue, onPushSettingsToggled, onPushSettingsClicked, onShowScheduledDescription }
            = this.props;
        const pushSettingsIcon = pushSettingsValue || pushSettingsValue === 0 ?
            'icon-notification-off-filled' :
            'icon-notification-filled';
        const pushSettingsBtn = !is_chatlink && room.membersSetFromApi.members.hasOwnProperty(u_handle) && (
            <div className="push-settings">
                {AVseperator}
                <Button
                    className={`
                        link-button
                        light
                        push-settings-button
                        ${Call.isGuest() ? 'disabled' : ''}
                    `}
                    icon={`
                        sprite-fm-mono
                        ${pushSettingsIcon}
                    `}
                    label={l[16709] /* `Mute chat` */}
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
                    toggle={Call.isGuest() ? null : {
                        enabled: !pushSettingsValue && pushSettingsValue !== 0,
                        onClick: () =>
                            !pushSettingsValue && pushSettingsValue !== 0 ?
                                onPushSettingsClicked() :
                                onPushSettingsToggled()
                    }}
                    onClick={() => Call.isGuest() ? null : onPushSettingsClicked()}>
                </Button>
                {AVseperator}
            </div>
        );

        const openInviteBtn = room.type !== 'private' && (
            <div className="open-invite-settings">
                <Button
                    className={`
                        link-button
                        light
                        open-invite-settings-button
                    `}
                    disabled={!room.iAmOperator()}
                    icon={`
                        sprite-fm-mono
                        icon-user-filled
                    `}
                    label={l.open_invite_label /* `Chat invitations` */}
                    secondLabel={l.open_invite_desc /* `Non-host can add participants to the chat` */}
                    secondLabelClass="label--green"
                    toggle={{
                        enabled: room.options[MCO_FLAGS.OPEN_INVITE],
                        onClick: () => room.toggleOpenInvite()
                    }}
                    onClick={() => room.toggleOpenInvite()}
                />
                {AVseperator}
            </div>
        );

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
            disabled={!room.iAmOperator() || room.isReadOnly() || Call.isGuest()}
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
                            <span>{l[7070]}</span>
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
                                // Group chat -> `Chat Participants` expanded by default
                                participants: (room.type === 'group' || room.type === 'public') && !isMeeting,
                                // 1-on-1 chat or meeting -> default to `Options`
                                options: room.type === 'private' || (isMeeting && !isRecurring),
                                // Scheduled meeting (recurring)
                                occurrences: isMeeting && scheduledMeeting && isRecurring
                            }}>
                            {participantsList ?
                                <AccordionPanel
                                    className="small-pad"
                                    title={l[8876]}
                                    chatRoom={room}
                                    key="participants">
                                    {participantsList}
                                </AccordionPanel> :
                                null
                            }
                            {room.type === 'public' && room.observers > 0 ?
                                <div className="accordion-text observers">
                                    {l[20466] /* `Observers` */}
                                    <span className="observers-count">
                                        <i className="sprite-fm-mono icon-eye-reveal"/>
                                        {room.observers}
                                    </span>
                                </div> :
                                <div/>
                            }

                            {isRecurring && isUpcoming &&
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
                                            <span>{l[9080] /* `Rename group` */}</span>
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
                                    {room.type === "public" ?
                                        <div
                                            className={getChatLinkClass}
                                            onClick={e => {
                                                if ($(e.target).closest('.disabled').length > 0) {
                                                    return false;
                                                }
                                                this.props.onGetManageChatLinkClicked();
                                            }}>
                                            <i className="sprite-fm-mono icon-link-filled"/>
                                            <span>
                                                {/* `Share meeting` || `Get chat link` */}
                                                {scheduledMeeting ? l.share_meeting_button : l[20481]}
                                            </span>
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
                                                    this.cancelScheduledMeeting();
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
                                    {pushSettingsBtn}
                                    {openInviteBtn}
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
                                            {l[8871] /* Clear Chat History */}
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
                                    {
                                        room.type !== 'private' ?
                                            <div
                                                className={`
                                                    link-button
                                                    light
                                                    ${room.type !== 'private' && !is_chatlink &&
                                                    room.membersSetFromApi.members.hasOwnProperty(u_handle) &&
                                                    room.membersSetFromApi.members[u_handle] !== -1 &&
                                                    !room.call ? '' : 'disabled'}
                                                `}
                                                onClick={(e) => {
                                                    if ($(e.target).closest('.disabled').length > 0) {
                                                        return false;
                                                    }
                                                    if (self.props.onLeaveClicked) {
                                                        self.props.onLeaveClicked();
                                                    }
                                                }}>
                                                <i className="sprite-fm-mono icon-disabled-filled"/>
                                                <span>{l[8633] /* `Leave Chat` */}</span>
                                            </div> :
                                            null
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
                        singleSelectedButtonLabel={l[8869] /* `Add to Group Conversation` */}
                        multipleSelectedButtonLabel={l[8869] /* `Add to Group Conversation` */}
                        nothingSelectedButtonLabel={l[8870] /* `Select one or more contacts to continue` */}
                        onSelectDone={selected => {
                            this.props.onAddParticipantSelected(selected);
                            this.setState({contactPickerDialog: false});
                        }}
                        onClose={() => this.setState({contactPickerDialog: false})}
                        selectFooter={true}
                    />
                )}
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
        occurrencesLoading: false
    };

    constructor(props) {
        super(props);

        const { chatRoom } = this.props;
        chatRoom.rebind(`openAttachCloudDialog.${this.getUniqueId()}`, () => this.openAttachCloudDialog());
        chatRoom.rebind(`openSendContactDialog.${this.getUniqueId()}`, () => this.openSendContactDialog());
        chatRoom.rebind(`openSchedDescDialog.${this.getUniqueId()}`, () => this.openSchedDescDialog());

        this.handleKeyDown = SoonFc(120, (ev) => this._handleKeyDown(ev));
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
        return document.body.classList[Call.isExpanded() ? 'remove' : 'add'](EXPANDED_FLAG);
    }

    startCall(type, scheduled) {
        const { chatRoom } = this.props;

        if (isStartCallDisabled(chatRoom)) {
            return false;
        }

        return type === Call.TYPE.AUDIO ? chatRoom.startAudioCall(scheduled) : chatRoom.startVideoCall(scheduled);
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
        var self = this;
        self.$container = $('.conversation-panel', '#fmholder');
        self.$messages = $('.messages.scroll-area > .perfectScrollbarContainer', self.$container);

        window.addEventListener('keydown', self.handleKeyDown);

        self.props.chatRoom.rebind('call-ended.jspHistory call-declined.jspHistory', function () {
            self.callJustEnded = true;
        });

        self.props.chatRoom.rebind('onSendMessage.scrollToBottom', function () {
            self.props.chatRoom.scrolledToBottom = true;
            if (self.messagesListScrollable) {
                self.messagesListScrollable.scrollToBottom();
            }
        });
        self.props.chatRoom.rebind('openSendFilesDialog.cpanel', function() {
            self.setState({'attachCloudDialog': true});
        });
        self.props.chatRoom.rebind('showGetChatLinkDialog.ui', function () {
            createTimeoutPromise(function() {
                return self.props.chatRoom.topic && self.props.chatRoom.state === ChatRoom.STATE.READY;
            }, 350, 15000)
                .always(function() {
                    if (self.props.chatRoom.isCurrentlyActive) {
                        self.setState({
                            'chatLinkDialog': true
                        });
                    }
                    else {
                        // not visible anymore, proceed w/ generating a link silently.
                        self.props.chatRoom.updatePublicHandle();
                    }
                });
        });

        if (self.props.chatRoom.type === "private") {
            var otherContactHash = self.props.chatRoom.getParticipantsExceptMe()[0];
            if (otherContactHash in M.u) {
                self._privateChangeListener = M.u[otherContactHash].addChangeListener(function() {
                    if (!self.isMounted()) {
                        // theoretical chance of leaking - M.u[...] removed before the listener is removed
                        return 0xDEAD;
                    }
                    self.safeForceUpdate();
                });
            }
        }


        self.eventuallyInit();
        if (is_chatlink && !self.props.chatRoom.isMeeting) {
            self.state.setNonLoggedInJoinChatDlgTrue = setTimeout(function() {
                M.safeShowDialog('chat-links-preview-desktop', () => {
                    if (self.isMounted()) {
                        // may not be mounted in case of getting redirected to existing room to the fm -> chat ->
                        // chatroom
                        self.setState({'nonLoggedInJoinChatDialog': true});
                    }
                });
            }, rand_range(5, 10) * 1000);
        }
        if (is_chatlink && self.props.chatRoom.isMeeting && u_type !== false && u_type < 3) {
            eventlog(99747, JSON.stringify([1, u_type | 0]), true);
        }
        self.props.chatRoom._uiIsMounted = true;
        self.props.chatRoom.$rConversationPanel = self;
        self.props.chatRoom.trigger('onComponentDidMount');

        ChatdIntegration._waitForProtocolHandler(this.props.chatRoom, () => {
            if (this.isMounted()) {
                const hasInvalidKeys = this.props.chatRoom.hasInvalidKeys();
                this.setState({ hasInvalidKeys, invalidKeysBanner: hasInvalidKeys }, () => this.safeForceUpdate());
            }
        });

        // --

        megaChat.rebind(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`, () =>
            this.isMounted() && this.setState({ occurrencesLoading: false })
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

        this.props.chatRoom.unbind("openAttachCloudDialog." + this.getUniqueId());
        this.props.chatRoom.unbind("openSendContactDialog." + this.getUniqueId());
        this.props.chatRoom.unbind(`openSchedDescDialog.${this.getUniqueId()}`);
        window.removeEventListener('keydown', self.handleKeyDown);
        $(document).off("fullscreenchange.megaChat_" + chatRoom.roomId);
        $(document).off('keydown.keyboardScroll_' + chatRoom.roomId);
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
                folderSelectNotAllowed={true}
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

                    room.attachNodes(
                        selected
                    );
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

                                attachmentMetadata.forEach((v) => {
                                    M.moveToRubbish(v.h);
                                });
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
                title={l[8871]}
                subtitle={l[8881]}
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
                title={l[19068]}
                subtitle={l[19069]}
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
                title={l[19063]}
                subtitle={l[19064]}
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
                title={l[9080]}
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
                    <Emoji>
                        {
                            room.scheduledMeeting.description.replace(/\n/g, '<br>')
                            || l.schedule_no_desc /* `The description has been removed` */
                        }
                    </Emoji>

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
                            {isUpcoming ? this.renderUpcomingInfo() : <MembersAmount chatRoom={room} />}
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

        var startCallDisabled = isStartCallDisabled(room);
        return (
            <div
                className={conversationPanelClasses}
                onMouseMove={() => self.onMouseMove()}
                data-room-id={self.props.chatRoom.chatId}>
                {room.meetingsLoading && <Loading chatRoom={room} title={room.meetingsLoading} />}
                {room.call && (
                    <Call
                        chatRoom={room}
                        streams={room.call.peers}
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
                                    closeDialog();
                                    loadSubPage('fm/chat');
                                    room.show();
                                    this.toggleExpandedFlag();
                                });
                        }}
                        didMount={() => {
                            this.toggleExpandedFlag();
                            if (room.isMeeting) {
                                room.getPublicLink();
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
                        onLeaveClicked={function() {
                            room.leave(true);
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
                        onAddParticipantSelected={function(contactHashes) {
                            self.props.chatRoom.scrolledToBottom = true;

                            if (self.props.chatRoom.type == "private") {
                                var megaChat = self.props.chatRoom.megaChat;
                                const options = {
                                    keyRotation: false,
                                    topic: ''
                                };

                                loadingDialog.show();

                                megaChat.trigger(
                                    'onNewGroupChatRequest',
                                    [
                                        self.props.chatRoom.getParticipantsExceptMe().concat(
                                            contactHashes
                                        ),
                                        options
                                    ],
                                );
                            }
                            else {
                                self.props.chatRoom.trigger('onAddUserRequest', [contactHashes]);
                            }
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
                            <Button
                                className="right"
                                disableCheckingVisibility={true}
                                icon="sprite-fm-mono icon-info-filled"
                                onClick={() => room.megaChat.toggleUIFlag('convPanelCollapse')} />
                            <div data-simpletip={`${l.unsupported_browser_video}`}
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
                                                .then(() => this.startCall(Call.TYPE.VIDEO))
                                                .catch(() => d && console.warn('Already in a call.'))
                                    }
                                />
                            </div>
                            <div data-simpletip={`${l.unsupported_browser_audio}`}
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
                                                .then(() => this.startCall(Call.TYPE.AUDIO))
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
                        {this.props.alert && !mega.config.get('nocallsup') && !room.havePendingCall() && (
                            <Alert
                                type={Alert.TYPE.MEDIUM}
                                content={Call.getUnsupportedBrowserMessage()}
                                onClose={this.props.onAlertClose}
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
                            !startCallDisabled ?
                                <StartMeetingNotification
                                    chatRoom={room}
                                    onStartCall={mode => {
                                        return startCallDisabled ?
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
                                <JoinCallNotification chatRoom={room}/> :
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
    state = {
        alert: undefined
    };

    constructor(props) {
        super(props);
        this.state.alert = !megaChat.hasSupportForCalls;
    }

    handleAlertClose = () => this.setState({ alert: false }, () => mega.config.set('nocallsup', 1));

    componentDidMount() {
        super.componentDidMount();
        this.props.onMount?.();
        megaChat.chats.forEach(chatRoom => {
            const { scheduledMeeting } = chatRoom;
            if (scheduledMeeting && scheduledMeeting.isUpcoming && scheduledMeeting.isRecurring) {
                scheduledMeeting.getOccurrences().catch(nop);
            }
        });
    }

    render() {
        const { className, chatUIFlags } = this.props;
        const now = Date.now();

        return (
            <div
                className={`
                    conversation-panels
                    ${className || ''}
                `}>
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
                                alert={this.state.alert}
                                onAlertClose={this.handleAlertClose}
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
                    label={l.create_meeting /* `Create meeting` */}>
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
    if (Call.isGuest()) {
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
