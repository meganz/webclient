export const EXPANDED_FLAG = 'in-call';

/**
 * MODE
 * @description Describes the available call modes.
 * @enum {number}
 * @property {number} THUMBNAIL
 * @property {number} MAIN
 * @readonly
 */

export const MODE = {
    THUMBNAIL: 1,
    MAIN: 2,
    MINI: 3
};

/**
 * VIEW
 * @description Describes the available view states.
 * @enum {number}
 * @property {number} DEFAULT
 * @property {number} CHAT
 * @property {number} PARTICIPANTS
 * @readonly
 */

export const VIEW = {
    DEFAULT: 0,
    CHAT: 1,
    PARTICIPANTS: 2
};

/**
 * TYPE
 * @description Describes the available call types.
 * @type {{VIDEO: number, AUDIO: number}}
 * @enum {number}
 * @property {number} AUDIO
 * @property {number} VIDEO
 * @readonly
 */

export const TYPE = {
    AUDIO: 1,
    VIDEO: 2
};

export const STREAM_ACTIONS = { ADD: 1, REMOVE: 2 };
export const PAGINATION = { PREV: -1, NEXT: 1 };
export const MAX_STREAMS = 99; // 99 + me -> 100
export const STREAMS_PER_PAGE = { MIN: 9, MED: 21, MAX: 49 };

/**
 * isGuest
 * @description Returns the true if the current user is a guest.
 * @returns {boolean}
 */

export const isGuest = () => !u_type;

/**
 * inProgressAlert
 * @description Renders conditionally message dialog if there is another active call currently. Attached to the
 * audio/video call controls on various places across the UI.
 * @returns {Promise}
 */

export const inProgressAlert = (isJoin, chatRoom) => {
    return new Promise((resolve, reject) => {
        if (megaChat.haveAnyActiveCall()) {
            if (window.sfuClient) {
                // Active call w/ the current client
                const { chatRoom: activeCallRoom } = megaChat.activeCall;
                const peers = activeCallRoom ?
                    activeCallRoom.getParticipantsExceptMe(activeCallRoom.getCallParticipants())
                        .map(h => M.getNameByHandle(h)) :
                    [];
                let body = isJoin ? l.cancel_to_join : l.cancel_to_start;
                if (peers.length) {
                    body = mega.utils.trans.listToString(
                        peers,
                        isJoin ? l.cancel_with_to_join : l.cancel_with_to_start
                    );
                }
                msgDialog('warningb', null, l.call_in_progress, body, null, 1);
                return reject();
            }

            // Active call on another client; incl. current user already being in the call ->
            // skip warning notification
            if (chatRoom.getCallParticipants().includes(u_handle)) {
                return resolve();
            }

            // Active call on another client
            return (
                msgDialog(
                    `warningb:!^${l[2005]}!${isJoin ? l.join_call_anyway : l.start_call_anyway}`,
                    null,
                    isJoin ? l.join_multiple_calls_title : l.start_multiple_calls_title,
                    isJoin ? l.join_multiple_calls_text : l.start_multiple_calls_text,
                    join => {
                        if (join) {
                            return resolve();
                        }
                        return reject();
                    },
                    1
                )
            );
        }
        resolve();
    });
};
window.inProgressAlert = inProgressAlert;

/**
 * isModerator
 * @description Given `chatRoom` and `handle` -- returns true if the user is moderator.
 * @param chatRoom {ChatRoom}
 * @param handle {string}
 * @returns {boolean}
 */

export const isModerator = (chatRoom, handle) => {
    if (chatRoom && handle) {
        return chatRoom.members[handle] === ChatRoom.MembersSet.PRIVILEGE_STATE.OPERATOR;
    }
    return false;
};


/**
 * isExpanded
 * @description Returns true if the in-call UI is expanded; false when minimized.
 * @returns {boolean}
 */

export const isExpanded = () => document.body.classList.contains(EXPANDED_FLAG);

/**
 * getUnsupportedBrowserMessage
 * @description Returns conditionally message for unsupported browser; used along w/ feature detection within
 * `megaChat.hasSupportForCalls`. The two message variants concern a) outdated browser version (e.g. Chromium-based)
 * or b) completely unsupported browsers, such as Safari/Firefox.
 * @see megaChat.hasSupportForCalls
 * @see Alert
 * @returns {String}
 */

export const getUnsupportedBrowserMessage = () =>
    navigator.userAgent.match(/Chrom(e|ium)\/(\d+)\./) ?
        l.alert_unsupported_browser_version :
        l.alert_unsupported_browser;

export const renderLeaveConfirm = (onConfirm, onRecordingToggle) =>
    msgDialog(
        `confirmation:!^${l.leave_call_recording_dialog_cta}!${l.leave_call_recording_dialog_nop_cta}`,
        undefined,
        l.leave_call_recording_dialog_heading,
        l.leave_call_recording_dialog_body,
        cb => {
            if (cb) {
                onRecordingToggle();
                onConfirm();
            }
        },
        1
    );

export const renderEndConfirm = (onConfirm, onRecordingToggle) =>
    msgDialog(
        `confirmation:!^${l.end_call_recording_dialog_cta}!${l.end_call_recording_dialog_nop_cta}`,
        undefined,
        l.end_call_recording_dialog_heading,
        l.end_call_recording_dialog_body,
        cb => {
            if (cb) {
                onRecordingToggle();
                onConfirm();
            }
        },
        1
    );
