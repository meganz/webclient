if(window.location.hostname == "beta.mega.nz" || window.location.hostname == "mega.dev") {
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
            if (location.hostname === 'beta.mega.nz') dump.m = '[Beta] ' + dump.m;


            var ids = [], uds = [], r = 1;


            var report = {};
            report.ua = navigator.userAgent;
            report.io = window.dlMethod && dlMethod.name;
            report.sb = +(''+$('script[src*="secureboot"]').attr('src')).split('=').pop();
            report.tp = $.transferprogress;
            report.id = ids.join(",");
            report.ud = uds;
            report.karereState = self.megaChat.karere.getConnectionState();
            report.myPresence = self.megaChat.karere.getPresence(self.megaChat.karere.getJid());
            report.karereServer = self.megaChat.karere.connection.service;
            report.numOpenedChats = Object.keys(self.megaChat.chats).length;

            var chatStates = [];

            Object.keys(megaChat.chats).forEach(function(k) {
                var v = megaChat.chats[k];

                var participants = v.getParticipants();

                participants.forEach(function(v, k) {
                    var cc = megaChat.getContactFromJid(v);
                    participants[k] = cc ? cc : v;
                });

                chatStates.push({
                    'roomUniqueId': k,
                    'roomState': v.getStateAsText(),
                    'roomParticipants': participants,
                    'encState': v.encryptionHandler ? v.encryptionHandler.state : "not defined",
                    'opQueueQueueCount': v.encryptionOpQueue ? v.encryptionOpQueue._queue.length : "not defined",
                    'opQueueErrRetries': v.encryptionOpQueue ? v.encryptionOpQueue._error_retries : "not defined",
                    'opQueueCurrentOp': v.encryptionOpQueue && v.encryptionOpQueue._queue.length > 0 ? v.encryptionOpQueue._queue[0][0] : "not defined"
                });
            });

            report.chatRoomState = chatStates;


            report.cc = cc;

            if (is_chrome_firefox)
            {
                report.mo = mozBrowserID + '::' + is_chrome_firefox + '::' + mozMEGAExtensionVersion;
            }
            report = JSON.stringify(r? report:{});


            var sendReport = function() {
                $.get(
                    "./logger/",
                    { c : JSON.stringify(dump), v : report, uh: u_handle, ver: window.megaVersion }
                );
            };
            if(window.megaVersion) {
                sendReport();
            } else {
                $.get("./current_ver.txt")
                    .done(function(r) {
                        r = $.trim(r);
                        if(r.length == 40) {
                            if(window.megaPrevVersion && window.megaPrevVersion != r) {
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