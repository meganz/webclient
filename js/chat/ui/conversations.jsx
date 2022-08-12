// libs
import { hot } from 'react-hot-loader/root';
import React from 'react';
import utils, { Emoji, ParsedHTML } from './../../ui/utils.jsx';
import { MegaRenderMixin } from '../mixins.js';
import { Button } from '../../ui/buttons.jsx';
import { ConversationPanels, EmptyConvPanel } from "./conversationpanel.jsx";
import ContactsPanel from './contactsPanel/contactsPanel.jsx';
import ModalDialogsUI from './../../ui/modalDialogs.jsx';
import { Start as StartMeetingDialog } from "./meetings/workflow/start.jsx";
import { StartGroupChatWizard } from './startGroupChatWizard.jsx';
import MeetingsCallEndedDialog from "./meetings/meetingsCallEndedDialog.jsx";
import { inProgressAlert } from './meetings/call.jsx';
import Nil from './contactsPanel/nil.jsx';
import ChatToaster from "./chatToaster";
import LeftPanel from './leftPanel/leftPanel';

var getRoomName = function(chatRoom) {
    return chatRoom.getRoomTitle();
};

class ArchConversationsListItem extends MegaRenderMixin {
    componentWillMount() {
        const { chatRoom } = this.props;
        this.chatRoomChangeListener = SoonFc(200 + Math.random() * 400 | 0, () => {
            this.safeForceUpdate();
        });
        chatRoom.addChangeListener(this.chatRoomChangeListener);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        const { chatRoom } = this.props;
        chatRoom.removeChangeListener(this.chatRoomChangeListener);
    }
    render() {
        const { chatRoom, onConversationSelected, onConversationClick, onUnarchiveClicked } = this.props;
        let classString = 'arc-chat-list ui-droppable ui-draggable ui-draggable-handle';

        if (!chatRoom || !chatRoom.chatId) {
            return null;
        }

        const roomId = chatRoom.chatId;

        // selected
        if (chatRoom.archivedSelected === true) {
            classString += ' ui-selected';
        }

        let nameClassString = 'user-card-name conversation-name';
        let contactId;
        let id;

        if (chatRoom.type === 'private') {
            const contact = M.u[chatRoom.getParticipantsExceptMe()[0]];
            if (!contact) {
                return null;
            }
            if (!this.fetchingNonContact && !chatRoom.getRoomTitle()) {
                this.fetchingNonContact = true;
                MegaPromise.allDone([
                    M.syncUsersFullname(contact.h, undefined, new MegaPromise(nop)),
                    M.syncContactEmail(contact.h, new MegaPromise(nop))
                ]).always(() => {
                    this.safeForceUpdate();
                });
            }
            id = `conversation_${escapeHTML(contact.u)}`;
        }
        else if (chatRoom.type === 'group') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat';
        }
        else if (chatRoom.type === 'public') {
            contactId = roomId;
            id = `conversation_${contactId}`;
            classString += ' groupchat public';
        }
        else {
            return `Unknown room type: ${chatRoom.roomId}`;
        }

        let lastMessageDiv;
        let lastMessageDatetimeDiv = null;
        let emptyMessage = null;
        const lastMessage = chatRoom.messagesBuff.getLatestTextMessage();
        if (lastMessage) {
            const renderableSummary = lastMessage.renderableSummary || chatRoom.messagesBuff.getRenderableSummary(
                lastMessage
            );
            lastMessage.renderableSummary = renderableSummary;

            lastMessageDiv =
                <div className="conversation-message">
                    <ParsedHTML>{renderableSummary}</ParsedHTML>
                </div>;

            lastMessageDatetimeDiv = <div className="date-time">{getTimeMarker(lastMessage.delay, true)}</div>;
        }
        else {
            /**
             * Show "Loading" until:
             * 1. I'd fetched chats from the API.
             * 2. I'm retrieving history at the moment.
             * 3. I'd connected to chatd and joined the room.
              */
            emptyMessage = chatRoom.messagesBuff.messagesHistoryIsLoading()
                || this.loadingShown
                || chatRoom.messagesBuff.joined === false
                ? l[7006] /* Loading */ : l[8000] /* No conversation history */;

            lastMessageDiv =
                <div>
                    <div className="conversation-message">
                        {emptyMessage}
                    </div>
                </div>;
        }
        if (chatRoom.type !== 'public') {
            nameClassString += ' privateChat';
        }

        return (
            <tr
                className={classString}
                id={id}
                data-room-id={roomId}
                data-jid={contactId}
                onClick={onConversationSelected}
                onDoubleClick={onConversationClick}>
                <td>
                    <div className="fm-chat-user-info todo-star">
                        <div className={nameClassString}>
                            <Emoji>{chatRoom.getRoomTitle()}</Emoji>
                            {(chatRoom.type === 'group' || chatRoom.type === 'private')
                                && <i className="sprite-fm-uni icon-ekr-key"/>}
                        </div>
                        <div className="last-message-info">
                            {lastMessageDiv}
                            {emptyMessage ? null : (
                                <div className="conversations-separator">
                                    <i className="sprite-fm-mono icon-dot"/>
                                </div>
                            )}
                            {lastMessageDatetimeDiv}
                        </div>
                    </div>
                    <div className="archived-badge">{l[19067] /* `Archived` */}</div>
                </td>
                <td width="330">
                    <div className="archived-on">
                        <div className="archived-date-time">{lastMessageDatetimeDiv}</div>
                        <div className="clear"/>
                    </div>
                    <Button
                        className="mega-button action unarchive-chat right"
                        icon="sprite-fm-mono icon-rewind"
                        onClick={onUnarchiveClicked}>
                        <span>{l[19065] /* `Unarchive` */}</span>
                    </Button>
                </td>
            </tr>
        );
    }
}

export class ArchivedConversationsList extends MegaRenderMixin {
    constructor (props) {
        super(props);
        this.state = this.getInitialState();

        this.onSortNameClicked = this.onSortNameClicked.bind(this);
        this.onSortTimeClicked = this.onSortTimeClicked.bind(this);
    }

    getInitialState() {
        return {
            'items': megaChat.chats,
            'orderby': 'lastActivity',
            'nameorder': 1,
            'timeorder': -1,
            'confirmUnarchiveChat': null,
            'confirmUnarchiveDialogShown': false,
        };
    }
    conversationClicked(room, e) {
        room.showArchived = true;
        loadSubPage(room.getRoomUrl());
        e.stopPropagation();
    }
    conversationSelected(room, e) {
        var self = this;
        var previousState = room.archivedSelected ? room.archivedSelected : false;
        var sortedConversations = obj_values(megaChat.chats.toJS());
        sortedConversations.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }
            if (chatRoom.chatId !== room.chatId) {
                chatRoom.archivedSelected = false;
            }
            else {
                chatRoom.archivedSelected = !chatRoom.archivedSelected;
            }
        });
        room.archivedSelected = !previousState;
        self.setState({
            'items': sortedConversations
        });
        e.stopPropagation();
    }
    unarchiveConversationClicked(room, e) {
        var self = this;
        self.setState({
            'confirmUnarchiveDialogShown': true,
            'confirmUnarchiveChat': room.roomId
        });
    }
    onSortNameClicked(e) {
        this.setState({
            'orderby': 'name',
            'nameorder': this.state.nameorder * -1
        });
    }
    onSortTimeClicked(e) {
        this.setState({
            'orderby': 'lastActivity',
            'timeorder': this.state.timeorder * -1
        });
    }
    render() {
        const { view, views } = this.props;
        var self = this;
        var currConvsList = [];

        var sortedConversations = obj_values(megaChat.chats.toJS());
        var orderValue = -1;
        var orderKey = "lastActivity";

        var nameOrderClass = "";
        var timerOrderClass = "";
        if (self.state.orderby === "name") {
            orderKey = getRoomName;
            orderValue = self.state.nameorder;
            nameOrderClass = self.state.nameorder === 1 ? "down" : "up";
        } else {
            orderKey = "lastActivity";
            orderValue = self.state.timeorder;
            timerOrderClass = self.state.timeorder === 1 ? "down" : "up";
        }

        sortedConversations.sort(M.sortObjFn(orderKey, orderValue));
        sortedConversations.forEach((chatRoom) => {
            var contact;
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }
            if (
                view === views.MEETINGS && !chatRoom.isMeeting
                || view === views.CHATS && chatRoom.isMeeting
            ) {
                return;
            }

            if (chatRoom.type === "private") {
                contact = chatRoom.getParticipantsExceptMe()[0];
                if (!contact) {
                    return;
                }
                contact = M.u[contact];

                if (contact) {
                    if (!chatRoom.privateReadOnlyChat && !contact.c) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = true;
                        });
                    }
                    else if (chatRoom.privateReadOnlyChat && contact.c) {
                        // a non-contact conversation, e.g. contact removed - mark as read only
                        Soon(function () {
                            chatRoom.privateReadOnlyChat = false;
                        });
                    }
                }
            }

            currConvsList.push(
                <ArchConversationsListItem
                    key={chatRoom.roomId}
                    chatRoom={chatRoom}
                    contact={contact}
                    messages={chatRoom.messagesBuff}
                    onConversationClick={(e) => {
                        self.conversationClicked(chatRoom, e);
                }}
                    onConversationSelected={(e) => {
                        self.conversationSelected(chatRoom, e);
                }}
                    onUnarchiveClicked={(e) => {
                        self.unarchiveConversationClicked(chatRoom, e);
                }}/>
            );
        });

        var confirmUnarchiveDialog = null;
        if (self.state.confirmUnarchiveDialogShown === true) {
            var room = megaChat.chats[self.state.confirmUnarchiveChat];
            if (room) {
                confirmUnarchiveDialog = <ModalDialogsUI.ConfirmDialog
                    chatRoom={room}
                    title={l[19063]}
                    subtitle={l[19064]}
                    icon="sprite-fm-uni icon-question"
                    name="unarchive-conversation"
                    pref="5"
                    onClose={() => {
                        self.setState({'confirmUnarchiveDialogShown': false});
                    }}
                    onConfirmClicked={() => {
                        room.unarchive();
                        self.setState({'confirmUnarchiveDialogShown': false});
                    }}
                />;
            }
        }

        return (
            <div className="chat-content-block archived-chats">
                <>
                    {currConvsList && currConvsList.length ?
                        <div className="files-grid-view archived-chat-view">
                            <div className="grid-scrolling-table archive-chat-list">
                                <div className="grid-wrapper">
                                    <table className="grid-table arc-chat-messages-block table-hover">
                                        <thead>
                                            <tr>
                                                <th className="calculated-width" onClick={self.onSortNameClicked}>
                                                    <div className="is-chat arrow name">
                                                        <i
                                                            className={
                                                                nameOrderClass ?
                                                                    `sprite-fm-mono icon-arrow-${nameOrderClass}` :
                                                                    ''
                                                            }
                                                        />
                                                        {l[86] /* `Name` */}
                                                    </div>
                                                </th>
                                                <th width="330" onClick={self.onSortTimeClicked}>
                                                    <div className={`is-chat arrow interaction ${timerOrderClass}`}>
                                                        <i
                                                            className={
                                                                timerOrderClass ?
                                                                    `sprite-fm-mono icon-arrow-${timerOrderClass}` :
                                                                    ''
                                                            }
                                                        />
                                                        {l[5904] /* `Last interaction` */}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currConvsList}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div> :
                        <Nil title={l.archived_nil /* `No archived chats` */} />
                    }
                </>
                {confirmUnarchiveDialog}
            </div>
        );
    }
}

class ConversationsApp extends MegaRenderMixin {
    requestReceivedListener = null;

    VIEWS = {
        CHATS: 0x00,
        MEETINGS: 0x01,
        LOADING: 0x02
    };

    state = {
        leftPaneWidth: mega.config.get('leftPaneWidth'),
        startGroupChatDialog: false,
        startMeetingDialog: false,
        view: this.VIEWS.LOADING
    };

    constructor(props) {
        super(props);
        this.handleWindowResize = this.handleWindowResize.bind(this);
        this._cacheRouting();
        megaChat.rebind('onStartNewMeeting.convApp', () => this.startMeeting());
    }

    startMeeting() {
        if (megaChat.hasSupportForCalls) {
            return inProgressAlert()
                .then(() => this.setState({ startMeetingDialog: true }))
                .catch(() => d && console.warn('Already in a call.'));
        }
        return showToast('warning', l[7211] /* `Your browser does not have the required audio/video capabilities` */);
    }

    _cacheRouting() {
        this.routingSection = this.props.megaChat.routingSection;
        this.routingSubSection = this.props.megaChat.routingSubSection;
        this.routingParams = this.props.megaChat.routingParams;
    }

    specShouldComponentUpdate() {
        // Since this is a root component, there are issues with it (or the hotreload) causing it to not properly
        // update when needed, so we need to cache important root re-updates in here.
        if (
            this.routingSection !== this.props.megaChat.routingSection ||
            this.routingSubSection !== this.props.megaChat.routingSubSection ||
            this.routingParams !== this.props.megaChat.routingParams
        ) {
            this._cacheRouting();
            return true;
        }
    }

    componentDidMount() {
        super.componentDidMount();
        var self = this;

        window.addEventListener('resize', this.handleWindowResize);
        $(document).rebind('keydown.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (!M.chat || e.megaChatHandled) {
                return;
            }

            const currentlyOpenedChat = megaChat.currentlyOpenedChat;
            const currentRoom = megaChat.getCurrentRoom();
            if (currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .mega-dialog
                // is visible/active at the moment
                if (
                    (currentlyOpenedChat && currentRoom && currentRoom.isReadOnly()) ||
                    $(e.target).is(".messages-textarea, input, textarea") ||
                    ((e.ctrlKey || e.metaKey || e.which === 19) && (e.keyCode === 67)) ||
                    e.keyCode === 91 /* cmd+... */ ||
                    e.keyCode === 17 /* ctrl+... */ ||
                    e.keyCode === 27 /* esc */ ||
                    e.altKey ||  e.metaKey || e.ctrlKey || e.shiftKey ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                moveCursortoToEnd($typeArea);
                e.megaChatHandled = true;
                $typeArea.triggerHandler(e);
                e.preventDefault();
                e.stopPropagation();
                return false;

            }
        });

        $(document).rebind('mouseup.megaChatTextAreaFocus', function(e) {
            // prevent recursion!
            if (!M.chat || e.megaChatHandled || slideshowid) {
                return;
            }

            var $target = $(e.target);

            if (megaChat.currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .mega-dialog
                // is visible/active at the moment
                if (
                    $target.is(".messages-textarea,a,input,textarea,select,button") ||
                    $target.closest('.messages.scroll-area').length > 0 ||
                    ($('.call-block').is(":visible") && !$('.call-block:visible').is('.small-block')) ||
                    $(document.querySelector('.mega-dialog, .dropdown')).is(':visible') ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                ) {
                    return;
                }

                var $typeArea = $('.messages-textarea:visible:first');
                if ($typeArea.length === 1 && !$typeArea.is(":focus")) {
                    $typeArea.trigger("focus");
                    e.megaChatHandled = true;
                }

            }
        });


        self.fmConfigLeftPaneListener = mBroadcaster.addListener('fmconfig:leftPaneWidth', function(value) {
            if (value > 0) {
                megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
                delay('CoApp:fmc:thr', function() {
                    self.setState({leftPaneWidth: value});
                }, 75);
                megaChat.$leftPane.width(value);
                $('.fm-tree-panel', megaChat.$leftPane).width(value);
                self.onResizeDoUpdate();
            }
        });


        var lPaneResizableInit = function() {
            megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
            $.leftPaneResizableChat = new FMResizablePane(megaChat.$leftPane, $.leftPaneResizable.options);

            if (fmconfig.leftPaneWidth) {
                megaChat.$leftPane.width(Math.min(
                    $.leftPaneResizableChat.options.maxWidth,
                    Math.max($.leftPaneResizableChat.options.minWidth, fmconfig.leftPaneWidth)
                ));
            }

            $($.leftPaneResizableChat).on('resize', function() {
                var w = megaChat.$leftPane.width();
                if (w >= $.leftPaneResizableChat.options.maxWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'w-resize')
                } else if (w <= $.leftPaneResizableChat.options.minWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'e-resize')
                } else {
                    $('.left-pane-drag-handle').css('cursor', 'we-resize')
                }
            });

            $($.leftPaneResizableChat).on('resizestop', function() {
                $('.fm-left-panel').width(
                    megaChat.$leftPane.width()
                );

                setTimeout(function() {
                    $('.hiden-when-dragging').removeClass('hiden-when-dragging');
                }, 100);
            });
        };

        if (typeof($.leftPaneResizable) === 'undefined') {
            mBroadcaster.once('fm:initialized', function() {
                lPaneResizableInit();
            });
        }
        else {
            lPaneResizableInit();

        }

        megaChat.$leftPane = megaChat.$leftPane || $('.conversationsApp .fm-left-panel');
        if (is_chatlink && !is_eplusplus) {
            megaChat.$leftPane.addClass('hidden');
        }
        else {
            megaChat.$leftPane.removeClass('hidden');
        }
        this.handleWindowResize();
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        window.removeEventListener('resize', this.handleWindowResize);
        $(document).off('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
        delete this.props.megaChat.$conversationsAppInstance;
    }

    componentDidUpdate() {
        this.handleWindowResize();
        if (megaChat.routingSection === "archived") {
            this.initArchivedChatsScrolling();
        }
        delay('mcob-update', () => this.handleOnboardingStep(), 1000);
    }

    handleOnboardingStep() {
        if (
            M.chat
            && mega.ui.onboarding
            && mega.ui.onboarding.sections.chat
            && !mega.ui.onboarding.sections.chat.isComplete
            && this.state.view !== this.VIEWS.LOADING
            && (!this.$obDialog || !this.$obDialog.is(':visible'))
            && (this.obToggleDrawn || $('.toggle-panel-heading', '.conversationsApp').length)
        ) {
            this.obToggleDrawn = true;
            const { chat : obChat } = mega.ui.onboarding.sections;
            const nextIdx = obChat.searchNextOpenStep();
            if (
                nextIdx === false
                || obChat.steps
                && obChat.steps[nextIdx]
                && obChat.steps[nextIdx].isComplete
            ) {
                // If the next section is done skip until the next update with the correct step.
                return;
            }
            mega.ui.onboarding.sections.chat.startNextOpenSteps(nextIdx);
            this.$obDialog = $('#obDialog');
        }
    }

    @utils.SoonFcWrap(80)
    handleWindowResize() {
        if (!M.chat) {
            return;
        }
        // small piece of what is done in fm_resize_handler...
        if (is_chatlink && !is_eplusplus) {
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-left': "0px"
                });
        }
        else {
            if (megaChat.$leftPane && megaChat.$leftPane.hasClass('resizable-pane-active')) {
                return;
            }
            const lhpWidth = this.state.leftPaneWidth || $('.fm-left-panel').width();
            const newMargin = `${lhpWidth + $('.nw-fm-left-icons-panel').width()}px`;
            $('.fm-right-files-block, .fm-right-account-block')
                .filter(':visible')
                .css({
                    'margin-inline-start': newMargin,
                    '-webkit-margin-start:': newMargin
                });
        }
    }

    initArchivedChatsScrolling() {
        const scrollBlock = document.querySelector('.conversationsApp .archive-chat-list');

        if (!scrollBlock) {
            return false;
        }

        if (scrollBlock.classList.contains('ps')) {
            Ps.update(scrollBlock);
        }
        else {
            Ps.initialize(scrollBlock);
        }
    }

    getArchivedCount() {
        let count = 0;
        const { view } = this.state;
        megaChat.chats.forEach((chatRoom) => {
            if (!chatRoom || !chatRoom.roomId) {
                return;
            }
            if (!chatRoom.isArchived()) {
                return;
            }
            if (
                view === this.VIEWS.MEETINGS && chatRoom.isMeeting
                || view === this.VIEWS.CHATS && !chatRoom.isMeeting
            ) {
                count++;
            }
        });
        return count;
    }

    createMeetingEndDlgIfNeeded() {
        if (megaChat.initialPubChatHandle || megaChat.initialChatId) {

            let chatRoom = megaChat.getCurrentRoom();
            if (!chatRoom) {
                return null;
            }
            if (!chatRoom.initialMessageHistLoaded /* haven't received the CALL info yet */) {
                return null;
            }

            if (megaChat.meetingDialogClosed === chatRoom.chatId) {
                return null;
            }

            const activeCallIds = chatRoom.activeCallIds.keys();
            if (
                chatRoom.isMeeting &&
                activeCallIds.length === 0 &&
                (
                    megaChat.initialPubChatHandle && chatRoom.publicChatHandle === megaChat.initialPubChatHandle ||
                    chatRoom.chatId === megaChat.initialChatId
                )
            ) {
                return (
                    <MeetingsCallEndedDialog
                        onClose={() => {
                            // temporary, only available during the Standalone page when anonymous
                            megaChat.meetingDialogClosed = chatRoom.chatId;
                            megaChat.trackDataChange();
                        }}
                    />
                );
            }
        }
        return null;
    }

    getConversations() {
        return Object.values(megaChat.chats).filter(c => {
            // return c.isDisplayable() && (this.state.view === this.VIEWS.MEETINGS ? c.isMeeting : !c.isMeeting);
            return this.state.view === this.VIEWS.MEETINGS ? c.isMeeting : !c.isMeeting;
        });
    }

    renderView(view) {
        this.setState({ view }, () => {
            const { $chatTreePanePs, routingSection } = megaChat;
            $chatTreePanePs.reinitialise();
            if (routingSection !== 'chat') {
                loadSubPage('fm/chat');
            }
        });
    }

    render() {
        const { CHATS, MEETINGS } = this.VIEWS;
        const { routingSection, chatUIFlags, currentlyOpenedChat } = megaChat;
        const { view, startGroupChatDialog, startMeetingDialog, leftPaneWidth } = this.state;
        const conversations = this.getConversations();
        const isEmpty =
            conversations &&
            conversations.length === 0 &&
            routingSection === 'chat' &&
            !currentlyOpenedChat &&
            !is_chatlink;
        const isLoading =
            !currentlyOpenedChat &&
            megaChat.allChatsHadInitialLoadedHistory() === false &&
            routingSection !== 'archived' &&
            routingSection !== 'contacts';

        const rightPane = (
            <div
                className={`
                    fm-right-files-block
                    in-chat
                    ${is_chatlink ? 'chatlink' : ''}
                `}>
                {!isLoading && <ChatToaster isRootToaster={true}/>}
                {!isLoading && routingSection === 'archived' && (
                    <ArchivedConversationsList
                        key="archivedchats"
                        view={view}
                        views={this.VIEWS}
                    />
                )}
                {!isLoading && routingSection === 'contacts' && (
                    <ContactsPanel megaChat={megaChat} contacts={M.u} received={M.ipc} sent={M.opc}/>
                )}
                {!isLoading && routingSection === 'notFound' && <span><center>Section not found</center></span>}
                {!isLoading && this.createMeetingEndDlgIfNeeded()}
                {!isLoading && isEmpty &&
                    <EmptyConvPanel
                        isMeeting={view === MEETINGS}
                        onNewClick={() =>
                            view === MEETINGS ?
                                this.startMeeting() :
                                this.setState({ startGroupChatDialog: true })
                        }
                    />
                }
                {!isLoading && (
                    <ConversationPanels
                        {...this.props}
                        className={routingSection === 'chat' ? '' : 'hidden'}
                        conversations={conversations}
                        routingSection={routingSection}
                        currentlyOpenedChat={currentlyOpenedChat}
                        displayArchivedChats={routingSection === 'archived'}
                        chatUIFlags={chatUIFlags}
                        onMount={() => {
                            const chatRoom = megaChat.getCurrentRoom();
                            return chatRoom ?
                                this.setState({ view: chatRoom.isMeeting ? MEETINGS : CHATS }) :
                                this.setState({ view: CHATS });
                        }}
                    />
                )}
            </div>
        );

        return (
            <div
                key="conversationsApp"
                className="conversationsApp">
                {startGroupChatDialog && (
                    <StartGroupChatWizard
                        name="start-group-chat"
                        flowType={1}
                        onClose={() => this.setState({ startGroupChatDialog: false })}
                        onConfirmClicked={() => this.setState({ startGroupChatDialog: false })}
                    />
                )}

                {startMeetingDialog && (
                    <StartMeetingDialog
                        onStart={(topic, audio, video) => {
                            megaChat.createAndStartMeeting(topic, audio, video);
                            this.setState({ startMeetingDialog: false });
                        }}
                        onClose={() => this.setState({ startMeetingDialog: false })}
                    />
                )}

                <LeftPanel
                    view={view}
                    views={this.VIEWS}
                    routingSection={routingSection}
                    conversations={conversations}
                    leftPaneWidth={leftPaneWidth}
                    renderView={view => this.renderView(view)}
                    startMeeting={() => this.startMeeting()}
                    createGroupChat={() => this.setState({ startGroupChatDialog: true })}
                />

                {rightPane}
            </div>
        );
    }
}


if (module.hot) {
    module.hot.accept();
    ConversationsApp = hot(ConversationsApp);
}

export default {
    ConversationsApp: ConversationsApp
};
