/**
 * The most dummies lazy load ever... but no need for something more complicated, until we get the new __(...)
 */
var getMessageString;
(function() {
    var MESSAGE_STRINGS;
    getMessageString = function(type) {
        if (!MESSAGE_STRINGS) {
            MESSAGE_STRINGS = {
                'outgoing-call': l[5891],
                'incoming-call': l[5893],
                'call-timeout': "Call to [X] was not answered in a timely manner.",
                'call-starting': l[7206],
                'call-feedback': l[7998],
                'call-initialising': l[7207],
                'call-ended': [["Call to [X] ended.", l[5889]], l[7208]],
                'remoteCallEnded': [["Call to [X] ended.", l[5889]], l[7208]],
                'call-failed-media': l[7204],
                'call-failed': [["Call to [X] failed.", l[7209]], l[7208]],
                'call-handled-elsewhere': [["Call with [X] was handled on some other device.", l[5895]]],
                'call-missed': l[7210],
                'call-rejected': [["Call to [X] was rejected.", l[5892]]],
                'call-canceled': [["Call to [X] was canceled.", l[5894]]],
                'call-started': l[5888],
                'alterParticipants': undefined,
                'privilegeChange': l[8915],
                'truncated': l[8905]

            };
        }
        return MESSAGE_STRINGS[type];
    };
})();

mega.ui.chat.getMessageString = getMessageString;

module.exports = {
    getMessageString
};
