import React from 'react';
import { MegaRenderMixin } from '../../mixins.js';
import { PerfectScrollbar } from '../../../ui/perfectScrollbar.jsx';
import ConversationsListItem from './conversationsListItem.jsx';
import { FILTER, NAMESPACE } from './leftPanel.jsx';
import Button from '../meetings/button.jsx';

export const ConversationsList = ({ conversations, className, children }) => {
    return (
        <PerfectScrollbar
            className="chat-lp-scroll-area"
            didMount={(id, ref) => {
                megaChat.$chatTreePanePs = [...megaChat.$chatTreePanePs, { id, ref }];
            }}
            willUnmount={id => {
                megaChat.$chatTreePanePs = megaChat.$chatTreePanePs.filter(ref => ref.id !== id);
            }}
            conversations={conversations}>
            <ul
                className={`
                    conversations-pane
                    ${className || ''}
                `}>
                {children ||
                    conversations.map(c =>
                        c.roomId &&
                        <ConversationsListItem
                            key={c.roomId}
                            chatRoom={c}
                            {...(c.type === 'private' && { contact: M.u[c.getParticipantsExceptMe()[0]] })}
                        />
                    )
                }
            </ul>
        </PerfectScrollbar>
    );
};

// --

export const Chats = ({ conversations, onArchivedClicked, filter }) => {
    conversations = Object.values(conversations || {})
        .filter(c =>
            !c.isMeeting &&
            c.isDisplayable() &&
            (!filter ||
                filter === FILTER.UNREAD && c.messagesBuff.getUnreadCount() > 0 ||
                filter === FILTER.MUTED && c.isMuted()
            )
        )
        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
    const noteChat = megaChat.getNoteChat();

    return (
        <>
            <div className="conversations-holder">
                {filter ?
                    null :
                    <div className="conversations-category">
                        <span>{l.filter_heading__recent}</span>
                    </div>
                }

                {conversations && conversations.length >= 1 ?
                    <ConversationsList conversations={conversations}>
                        {megaChat.WITH_SELF_NOTE && noteChat && noteChat.isDisplayable() ?
                            filter ? null : <ConversationsListItem chatRoom={noteChat}/> :
                            null
                        }
                        {conversations.map(c =>
                            c.roomId &&
                            !c.isNote &&
                            <ConversationsListItem
                                key={c.roomId}
                                chatRoom={c}
                                {...(c.type === 'private' && { contact: M.u[c.getParticipantsExceptMe()[0]] })}
                            />
                        )}
                    </ConversationsList> :
                    <div
                        className={`
                            ${NAMESPACE}-nil
                            ${filter ? `${NAMESPACE}-nil--chats` : ''}
                        `}>
                        {filter ?
                            <>
                                {filter === FILTER.MUTED &&
                                    <>
                                        <i className="sprite-fm-mono icon-notification-off-filled" />
                                        <h3>{l.filter_nil__muted_chats}</h3>
                                    </>
                                }
                                {filter === FILTER.UNREAD &&
                                    <>
                                        <i className="sprite-fm-mono icon-eye-thin-solid" />
                                        <h3>{l.filter_nil__unread_messages}</h3>
                                    </>
                                }
                            </> :
                            <span>{l.no_chats_lhp}</span>
                        }
                    </div>
                }

                {megaChat.WITH_SELF_NOTE && conversations && conversations.length === 1 && noteChat &&
                    <ConversationsList conversations={conversations}>
                        <ConversationsListItem chatRoom={noteChat} />
                    </ConversationsList>
                }
            </div>

            <div className={`${NAMESPACE}-bottom`}>
                <div className={`${NAMESPACE}-bottom-control`}>
                    <div
                        className="conversations-category"
                        onClick={onArchivedClicked}>
                        <span>{l.filter_archived__chats}</span>
                        <i className="sprite-fm-mono icon-arrow-right"/>
                    </div>
                </div>
            </div>
        </>
    );
};

// --

export const Archived = ({ conversations, archivedUnmounting, onClose }) => {
    const archivedChats = Object.values(conversations || {})
        .filter(c => !c.isMeeting && c.isArchived())
        .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));

    return (
        <div
            className={`
                ${NAMESPACE}-archived
                ${archivedUnmounting ? 'with-unmount-animation' : ''}
            `}>
            <div className={`${NAMESPACE}-archived-head`}>
                <Button
                    className="mega-button round"
                    icon="sprite-fm-mono icon-arrow-left-regular-outline"
                    onClick={onClose}
                />
                <h2>{l.filter_archived__chats}</h2>
            </div>
            <div className={`${NAMESPACE}-archived-content`}>
                {archivedChats && archivedChats.length ?
                    <ConversationsList conversations={archivedChats}/> :
                    <div className={`${NAMESPACE}-archived-empty`}>
                        <i className="sprite-fm-mono icon-archive"/>
                        <h3>{l.filter_archived__nil_chats}</h3>
                    </div>
                }
            </div>
        </div>
    );
};

// --

export class Meetings extends MegaRenderMixin {
    TABS = { UPCOMING: 0x00, PAST: 0x01 };

    domRef = React.createRef();
    ongoingRef = React.createRef();
    navigationRef = React.createRef();

    state = {
        tab: this.TABS.UPCOMING
    };

    constructor(props) {
        super(props);
        this.state.tab = this.TABS[megaChat.getCurrentMeeting()?.isPast ? 'PAST' : 'UPCOMING'];
    }

    Navigation = ({ conversations }) => {
        const { UPCOMING, PAST } = this.TABS;
        const { tab } = this.state;
        const unreadMeetings = Object.values(conversations || {})
            .reduce((acc, curr) => {
                if (curr.isDisplayable() && curr.isMeeting && curr.messagesBuff.getUnreadCount()) {
                    acc[curr.scheduledMeeting?.isUpcoming ? UPCOMING : PAST]++;
                }
                return acc;
            }, {[UPCOMING]: 0, [PAST]: 0 });

        return (
            <div
                ref={this.navigationRef}
                className={`
                    ${NAMESPACE}-meetings--navigation
                    ${this.props.leftPaneWidth < 230 ? 'narrow-width' : ''}
                `}>
                <Button
                    converstaions={conversations}
                    className={`
                        mega-button
                        action
                        ${tab === UPCOMING ? 'is-active' : ''}
                    `}
                    onClick={() => this.setState({ tab: UPCOMING })}>
                    <span>
                        {l.meetings_tab_upcoming /* `Upcoming` */}
                        {!!unreadMeetings[UPCOMING] && <div className="notification-indication" />}
                    </span>
                </Button>
                <Button
                    converstaions={conversations}
                    className={`
                        mega-button
                        action
                        ${tab === PAST ? 'is-active' : ''}
                    `}
                    onClick={() => this.setState({ tab: PAST }, () => eventlog(500254))}>
                    <span>
                        {l.meetings_tab_past /* `Past` */}
                        {!!unreadMeetings[PAST] && <div className="notification-indication" />}
                    </span>
                </Button>
            </div>
        );
    };

    Holder = ({ heading, className, children }) =>
        <div
            className={`
                conversations-holder
                ${className || ''}
            `}>
            <div
                className={`
                    conversations-category
                `}>
                {heading && <span>{heading}</span>}
            </div>
            {children}
        </div>;

    Ongoing = ({ ongoingMeetings }) =>
        ongoingMeetings?.length ?
            <div
                ref={this.ongoingRef}
                className={`${NAMESPACE}-meetings--ongoing`}>
                <strong>{l.happening_now /* `Happening now` */}</strong>
                <ConversationsList conversations={ongoingMeetings}/>
            </div> :
            null;

    Upcoming = () => {
        const { upcomingMeetings, nextOccurrences } =
            megaChat.plugins.meetingsManager.filterUpcomingMeetings(this.props.conversations);
        const upcomingItem = chatRoom => <ConversationsListItem key={chatRoom.roomId} chatRoom={chatRoom} />;

        return (
            <this.Holder>
                {upcomingMeetings && upcomingMeetings.length ?
                    <ConversationsList conversations={upcomingMeetings}>
                        {nextOccurrences.today && nextOccurrences.today.length ?
                            <div className="conversations-group">
                                <div className="conversations-category category--label">
                                    <span>{l.upcoming__today /* `Today` */}</span>
                                </div>
                                {nextOccurrences.today.map(upcomingItem)}
                            </div> :
                            null
                        }
                        {nextOccurrences.tomorrow && nextOccurrences.tomorrow.length ?
                            <div className="conversations-group">
                                <div className="conversations-category category--label">
                                    <span>{l.upcoming__tomorrow /* `Tomorrow` */}</span>
                                </div>
                                {nextOccurrences.tomorrow.map(upcomingItem)}
                            </div> :
                            null
                        }
                        {Object.keys(nextOccurrences.rest).length ?
                            Object.keys(nextOccurrences.rest).map(date =>
                                <div
                                    key={date}
                                    className="conversations-group">
                                    <div
                                        className="conversations-category category--label">
                                        <span>{date}</span>
                                    </div>
                                    {nextOccurrences.rest[date].map(upcomingItem)}
                                </div>
                            ) :
                            null
                        }
                    </ConversationsList> :
                    <div className={`${NAMESPACE}-nil`}>
                        <i className="sprite-fm-mono icon-calendar-plus-thin-solid"/>
                        <span>{l.meetings_upcoming_nil}</span>
                    </div>
                }
            </this.Holder>
        );
    };

    Past = () => {
        const conversations = Object.values(this.props.conversations || {});
        const pastMeetings = conversations
            .filter(c => {
                const { isCanceled, isPast, isCompleted } = c.scheduledMeeting || {};
                return (
                    c.isMeeting &&
                    c.isDisplayable() &&
                    (!c.scheduledMeeting || isCanceled || isPast || isCompleted) &&
                    !c.havePendingCall()
                );
            })
            .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));
        const archivedMeetings = conversations
            .filter(c => c.isMeeting && c.isArchived())
            .sort(M.sortObjFn(c => c.lastActivity || c.ctime, -1));

        return (
            <this.Holder>
                <ConversationsList conversations={pastMeetings}>
                    {pastMeetings.length ?
                        pastMeetings.map(chatRoom =>
                            chatRoom.roomId &&
                            <ConversationsListItem
                                key={chatRoom.roomId}
                                chatRoom={chatRoom}
                            />
                        ) :
                        <div
                            className={`
                                ${NAMESPACE}-nil
                                ${archivedMeetings.length ? 'half-sized' : ''}
                            `}>
                            {archivedMeetings.length ?
                                <strong>{l.meetings_past_nil_heading /* `Past meetings` */}</strong> :
                                null
                            }
                            <i className="sprite-fm-mono icon-video-thin-solid" />
                            <span>{l.meetings_past_nil}</span>
                        </div>
                    }

                    {archivedMeetings.length ?
                        <>
                            <div className="archived-separator" />
                            <div className="conversations-category category--label">
                                <span>{l.meetings_label_archived /* `Archived` */}</span>
                            </div>
                            {archivedMeetings.map(chatRoom =>
                                chatRoom.roomId &&
                                <ConversationsListItem
                                    key={chatRoom.roomId}
                                    chatRoom={chatRoom}
                                />
                            )}
                        </> :
                        null
                    }
                </ConversationsList>
            </this.Holder>
        );
    };

    getContainerStyles = ongoingMeetings => {
        if (ongoingMeetings?.length) {
            const ongoingHeight = this.ongoingRef?.current?.clientHeight;
            const navigationHeight = this.navigationRef?.current?.clientHeight;
            return {
                style: {
                    maxHeight: `calc(100% - ${ongoingHeight + navigationHeight + 30 /* buffer */}px)`
                }
            };
        }
        return null;
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        megaChat.off(`${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`);
    }

    componentDidMount() {
        super.componentDidMount();
        megaChat.rebind(
            `${megaChat.plugins.meetingsManager.EVENTS.OCCURRENCES_UPDATE}.${this.getUniqueId()}`,
            () => this.safeForceUpdate()
        );
        megaChat.rebind(
            megaChat.plugins.meetingsManager.EVENTS.INITIALIZE,
            (ev, scheduledMeeting) =>
                this.isMounted() &&
                this.setState({ tab: this.TABS[scheduledMeeting?.isPast ? 'PAST' : 'UPCOMING'] })
        );
    }

    render() {
        const { UPCOMING, PAST } = this.TABS;
        const { tab } = this.state;
        const ongoingMeetings = Object.values(this.props.conversations || {})
            .filter(c => c.isDisplayable() && c.isMeeting && c.havePendingCall());

        return (
            <div
                ref={this.domRef}
                className={`${NAMESPACE}-meetings`}>
                <this.Ongoing ongoingMeetings={ongoingMeetings} />
                <this.Navigation conversations={this.props.conversations} />
                <div
                    className={`
                        ${NAMESPACE}-meetings--content
                        ${tab === UPCOMING ? 'is-upcoming' : ''}
                        ${tab === PAST ? 'is-past' : ''}
                    `}
                    {...this.getContainerStyles(ongoingMeetings)}>
                    {tab === UPCOMING && <this.Upcoming />}
                    {tab === PAST && <this.Past />}
                </div>
            </div>
        );
    }
}
