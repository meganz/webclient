import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import { isToday, isTomorrow } from './helpers.jsx';
import { Button } from '../../../../ui/buttons.jsx';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';

export default class Occurrences extends MegaRenderMixin {
    domRef = React.createRef();
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

        return chatRoom.hasMessages(true) ?
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
                            <div className="chat-occurrence-date"/>
                            <div className="chat-occurrence-content">
                                <div className="chat-occurrence-title"/>
                                <div className="chat-occurrence-time"/>
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
        return (
            <div
                ref={this.domRef}
                className="chat-occurrences-list">
                <PerfectScrollbar
                    chatRoom={this.props.chatRoom}
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
        );
    }
}
