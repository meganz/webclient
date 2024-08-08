/**
 * The most dummiest lazy load ever... but no need for something more complicated
 */
var getMessageString;
(function() {
    var MESSAGE_STRINGS;
    var MESSAGE_STRINGS_GROUP;
    let MESSAGE_STRINGS_MEETING;
    var _sanitizeStrings = function(arg) {
        if (typeof arg === "undefined") {
            return arg;
        }
        else if (typeof arg === "string") {
            return escapeHTML(arg);
        }
        else if (arg.forEach) {
            arg.forEach(function(v, k) {
                arg[k] = _sanitizeStrings(v);
            });
        }
        else if (typeof arg === "object") {
            Object.keys(arg).forEach(function( k) {
                arg[k] = _sanitizeStrings(arg[k]);
            });
        }
        return arg;
    };

    getMessageString = function(type, isGroupCall, isMeeting) {
        if (!MESSAGE_STRINGS) {
            MESSAGE_STRINGS = {
                'outgoing-call': l[5891].replace("[X]", "[[[X]]]"),
                'incoming-call': l[19964] || "[[%s]] is calling...",
                'call-timeout': [l[18698].replace("[X]", "[[[X]]]")],
                'call-starting': l[7206].replace("[X]", "[[[X]]]"),
                'call-feedback': l[7998].replace("[X]", "[[[X]]]"),
                'call-initialising': l[7207].replace("[X]", "[[[X]]]"),
                'call-ended': [l[19965] || "Call ended.", l[7208]],
                'remoteCallEnded': [l[19965] || "Call ended.", l[7208]],
                'call-failed-media': l[7204],
                'call-failed': [l[19966] || "Call failed.", l[7208]],
                'call-handled-elsewhere': l[5895].replace("[X]", "[[[X]]]"),
                'call-missed': l[17870],
                'call-rejected': l[19040],
                'call-canceled': l[19041],
                'remoteCallStarted': l[5888],
                'call-started': l[5888].replace("[X]", "[[[X]]]"),
                'alterParticipants': undefined,
                'privilegeChange': undefined,
                'truncated': l[8905],
            };
            _sanitizeStrings(MESSAGE_STRINGS);
        }
        if (isGroupCall && !MESSAGE_STRINGS_GROUP) {
            MESSAGE_STRINGS_GROUP = {
                'call-ended': [l[19967], l[7208]],
                'remoteCallEnded': [l[19967], l[7208]],
                'call-handled-elsewhere': l[19968],
                'call-canceled': l[19969],
                'call-started': l[19970],
            };
            _sanitizeStrings(MESSAGE_STRINGS_GROUP);
        }
        if (isMeeting && !MESSAGE_STRINGS_MEETING) {
            MESSAGE_STRINGS_MEETING = {
                'call-ended': [l.meeting_mgmt_call_ended /* `Meeting ended` */, l[7208] /* `Call duration: [X]` */],
                'remoteCallEnded': [l.meeting_mgmt_call_ended /* `Meeting ended` */, l[7208]/* `Call duration: [X]` */],
                'call-started': l.meeting_mgmt_call_started /* `Meeting started` */,
            };
        }
        if (isMeeting && MESSAGE_STRINGS_MEETING[type]) {
            return MESSAGE_STRINGS_MEETING[type];
        }
        if (isGroupCall && MESSAGE_STRINGS_GROUP[type]) {
            return MESSAGE_STRINGS_GROUP[type];
        }
        return MESSAGE_STRINGS[type];
    };
})();

mega.ui = mega.ui || {};
mega.ui.chat = mega.ui.chat || {};
mega.ui.chat.getMessageString = getMessageString;

export {
    getMessageString
};
