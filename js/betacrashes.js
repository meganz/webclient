if (false) {
/* window.location.hostname == "beta.mega.nz" *//* ||
     window.location.hostname == "mega.dev" ||
     location.hostname.indexOf("developers.") > -1*/
    if (d)
    {
        window.onerror = function __MEGAExceptionHandler(msg, url, ln, cn, errobj)
        {
            function mTrim(s)
            {
                return s
                    .replace(/resource:.+->\s/,'')
                    .replace(/blob:[^:\s]+/, '..')
                    .replace(/\.\.:\/\/[^:\s]+/, '..')
                    .replace('chrome://mega/content','..')
                    .replace(/file:.+extensions/,'..fx')
                    .replace(/(?: line \d+ > eval)+/g,' >.eval')
            }

            var dump = {
                m : ('' + msg).replace(/'(\w+:\/\/+[^/]+)[^']+'/,"'$1...'").replace(/^Uncaught\s*/,''),
                f : mTrim('' + url), l : ln
            }, cc;

            if (errobj)
            {
                if (errobj.udata) dump.d = errobj.udata;
                if (errobj.stack)
                {
                    dump.s = ('' + errobj.stack).split("\\n").splice(0,9).map(mTrim).join("\\n");
                }
            } else {
                try {
                    throw Error();
                } catch(e) {
                    dump.s = ('' + e.stack).split("\\n").splice(0,9).map(mTrim).join("\\n");
                }
            }

            if (cn) dump.c = cn;

            if (ln == 0 && !dump.s)
            {
                if (dump.m.toLowerCase().indexOf('out of memory') != -1) dump.m = '!Fatal! Out Of Memory.';
                else dump.m = dump.m.replace(/[^\s\w]/gi,'') || ('[!] ' + msg);
            }
            if (location.hostname === 'beta.mega.nz' || location.hostname.indexOf("developers.") > -1) dump.m = '[' + location.hostname + '] ' + dump.m;


            var ids = [], uds = [], r = 1;


            var report = {};
            report.ua = navigator.userAgent;
            report.io = window.dlMethod && dlMethod.name;
            report.sb = +(''+$('script[src*="secureboot"]').attr('src')).split('=').pop();
            report.tp = $.transferprogress;
            report.id = ids.join(",");
            report.ud = uds;

            if (typeof megaChat !== 'undefined') {
                report.karereState = megaChat.karere.getConnectionState();
                report.myPresence = megaChat.getPresence(megaChat.karere.getJid());
                report.karereServer = megaChat.karere.connection.service;
                report.numOpenedChats = Object.keys(megaChat.chats).length;

                var chatStates = [];

                megaChat.chats.forEach(function (v) {
                    var participants = v.getParticipants();
                    var k = v.roomId;

                    participants.forEach(function (v, k) {
                        var cc = megaChat.getContactFromJid(v);
                        participants[k] = cc ? cc : v;
                    });

                    chatStates.push({
                        'roomUniqueId': k,
                        'roomState': v.getStateAsText(),
                        'roomParticipants': participants
                    });
                });

                report.chatRoomState = chatStates;
            }


            report.cc = cc;

            if (is_chrome_firefox)
            {
                report.mo = mozBrowserID + '::' + is_chrome_firefox + '::' + mozMEGAExtensionVersion;
            }
            try {
                report = JSON.stringify(r ? report : {});
            } catch(e) {
            }


            var sendReport = function() {
                try {
                    $.get(
                        "./logger/",
                        {c: JSON.stringify(dump), v: report, uh: u_handle, ver: window.megaVersion}
                    );
                }
                catch(e) {

                }
            };
            if (window.megaVersion) {
                sendReport();
            } else {
                $.get("./current_ver.txt")
                    .done(function(r) {
                        r = $.trim(r);
                        if (r.length == 40) {
                            if (window.megaPrevVersion && window.megaPrevVersion != r) {
                                alert("You are using an outdated version. Please update!");
                                window.megaVersion = window.megaPrevVersion;
                            } else {
                                window.megaVersion = r;
                                window.megaPrevVersion = r;
                            }
                            setTimeout(function() {
                                delete window.megaVersion;
                            }, 10000);
                        } else {
                            window.megaVersion = "verNotFound";
                        }
                    })
                    .fail(function() {
                        window.megaVersion = "verLookupFailed";
                    })
                    .always(function() {
                        sendReport();
                    });
            }



            return false;
        };
    }
}
