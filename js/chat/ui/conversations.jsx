import { hot } from 'react-hot-loader/root';
import React from 'react';
import { MegaRenderMixin } from '../mixins.js';
import { ConversationPanels, EmptyConvPanel } from './conversationpanel.jsx';
import ContactsPanel from './contactsPanel/contactsPanel.jsx';
import { Start as StartMeetingDialog } from './meetings/workflow/start.jsx';
import { Schedule as ScheduleMeetingDialog } from './meetings/schedule/schedule.jsx';
import { StartGroupChatWizard } from './startGroupChatWizard.jsx';
import MeetingsCallEndedDialog from "./meetings/meetingsCallEndedDialog.jsx";
import { inProgressAlert } from './meetings/call.jsx';
import ChatToaster from './chatToaster.jsx';
import LeftPanel from './leftPanel/leftPanel.jsx';

export const CONVERSATIONS_APP_VIEWS = {
    CHATS: 0x00,
    MEETINGS: 0x01,
    LOADING: 0x02
};

export const CONVERSATIONS_APP_EVENTS = {
    NAV_RENDER_VIEW: 'navRenderView',
};

class ConversationsApp extends MegaRenderMixin {
    chatRoomRef = null;

    VIEWS = CONVERSATIONS_APP_VIEWS;
    EVENTS = CONVERSATIONS_APP_EVENTS;

    state = {
        leftPaneWidth: Math.min(mega.config.get('leftPaneWidth') | 0, 400) || 384,
        startGroupChatDialog: false,
        startMeetingDialog: false,
        scheduleMeetingDialog: false,
        view: this.VIEWS.LOADING
    };

    constructor(props) {
        super(props);
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

    hasOpenDialog() {
        return [...document.querySelectorAll('.mega-dialog')]
            .some(dialog => !!(dialog.offsetParent || dialog.offsetWidth || dialog.offsetHeight));
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

        $(document).rebind('keydown.megaChatTextAreaFocus', e => {
            // prevent recursion!
            if (!M.chat || e.megaChatHandled) {
                return;
            }

            const { currentlyOpenedChat } = megaChat;
            const currentRoom = megaChat.getCurrentRoom();
            if (currentlyOpenedChat) {
                // don't do ANYTHING if the current focus is already into an input/textarea/select or a .mega-dialog
                // is visible/active at the moment
                if (
                    (currentRoom && currentRoom.isReadOnly()) ||
                    $(e.target).is(".messages-textarea, input, textarea") ||
                    ((e.ctrlKey || e.metaKey || e.which === 19) && (e.keyCode === 67)) ||
                    e.keyCode === 91 /* cmd+... */ ||
                    e.keyCode === 17 /* ctrl+... */ ||
                    e.keyCode === 27 /* esc */ ||
                    e.altKey || e.metaKey || e.ctrlKey || e.shiftKey ||
                    this.hasOpenDialog() ||
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

        $(document).rebind('mouseup.megaChatTextAreaFocus', e => {
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
                    $target.closest('.mega-dialog').length > 0 ||
                    this.hasOpenDialog() ||
                    document.querySelector('textarea:focus,select:focus,input:focus')
                    || window.getSelection().toString()
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

            $.leftPaneResizableChat = new FMResizablePane(megaChat.$leftPane, {
                ...$.leftPaneResizable.options,
                maxWidth: 400,
                pagechange: () => function() {
                    this.setWidth();
                }
            });

            $($.leftPaneResizableChat).rebind('resize.clp', () => {
                var w = megaChat.$leftPane.width();
                if (w >= $.leftPaneResizableChat.options.maxWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'w-resize');
                }
                else if (w <= $.leftPaneResizableChat.options.minWidth) {
                    $('.left-pane-drag-handle').css('cursor', 'e-resize');
                }
                else {
                    $('.left-pane-drag-handle').css('cursor', 'we-resize');
                }
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

        // --

        megaChat.rebind(megaChat.plugins.meetingsManager.EVENTS.EDIT, (ev, chatRoom) => {
            this.chatRoomRef = chatRoom;
            this.setState({ scheduleMeetingDialog: true });
        });

        megaChat.rebind(this.EVENTS.NAV_RENDER_VIEW, (ev, view) => {
            if (Object.values(this.VIEWS).includes(view)) {
                this.renderView(view);
            }
        });
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        $(document).off('keydown.megaChatTextAreaFocus');
        mBroadcaster.removeListener(this.fmConfigLeftPaneListener);
        delete this.props.megaChat.$conversationsAppInstance;
    }

    componentDidUpdate() {
        this.handleOnboardingStep();
    }

    handleOnboardingStep() {
        if (this.state.view === this.VIEWS.LOADING) {
            return;
        }
        megaChat.plugins.chatOnboarding.checkAndShowStep();
    }

    createMeetingEndDlgIfNeeded() {
        if (megaChat.initialPubChatHandle || megaChat.initialChatId) {
            const chatRoom = megaChat.getCurrentRoom();

            if (
                !chatRoom ||
                chatRoom.scheduledMeeting ||
                !chatRoom.initialMessageHistLoaded /* haven't received the CALL info yet */ ||
                megaChat.meetingDialogClosed === chatRoom.chatId
            ) {
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

    renderView(view) {
        this.setState({ view }, () => {
            const { $chatTreePanePs, routingSection } = megaChat;
            $chatTreePanePs?.reinitialise();
            if (routingSection !== 'chat') {
                loadSubPage('fm/chat');
            }
        });
    }

    render() {
        const { CHATS, MEETINGS } = this.VIEWS;
        const { routingSection, chatUIFlags, currentlyOpenedChat, chats } = megaChat;
        const { view, startGroupChatDialog, startMeetingDialog, scheduleMeetingDialog, leftPaneWidth } = this.state;
        const isEmpty =
            chats &&
            chats.every(c => c.isArchived()) &&
            routingSection === 'chat' &&
            !currentlyOpenedChat &&
            !is_chatlink;
        const isLoading =
            !currentlyOpenedChat &&
            megaChat.allChatsHadInitialLoadedHistory() === false &&
            routingSection !== 'contacts';

        const rightPane = (
            <div
                className={`
                    fm-right-files-block
                    in-chat
                    ${is_chatlink ? 'chatlink' : ''}
                `}>
                {!isLoading && <ChatToaster isRootToaster={true}/>}
                {!isLoading && routingSection === 'contacts' && (
                    <ContactsPanel megaChat={megaChat} contacts={M.u} received={M.ipc} sent={M.opc}/>
                )}
                {!isLoading && routingSection === 'notFound' && <span><center>Section not found</center></span>}
                {!isLoading && this.createMeetingEndDlgIfNeeded()}
                {!isLoading && isEmpty &&
                    <EmptyConvPanel
                        isMeeting={view === MEETINGS}
                        onNewChat={() => this.setState({ startGroupChatDialog: true })}
                        onStartMeeting={() => this.startMeeting()}
                        onScheduleMeeting={() => this.setState({ scheduleMeetingDialog: true })}
                    />
                }
                {!isLoading && (
                    <ConversationPanels
                        {...this.props}
                        className={routingSection === 'chat' ? '' : 'hidden'}
                        routingSection={routingSection}
                        currentlyOpenedChat={currentlyOpenedChat}
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

                {scheduleMeetingDialog && (
                    <ScheduleMeetingDialog
                        chatRoom={this.chatRoomRef}
                        onClose={() => {
                            this.setState({ scheduleMeetingDialog: false }, () => {
                                this.chatRoomRef = null;
                            });
                        }}
                    />
                )}

                <LeftPanel
                    view={view}
                    views={this.VIEWS}
                    routingSection={routingSection}
                    conversations={chats}
                    leftPaneWidth={leftPaneWidth}
                    renderView={view => this.renderView(view)}
                    startMeeting={() => this.startMeeting()}
                    scheduleMeeting={() => this.setState({ scheduleMeetingDialog: true })}
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
