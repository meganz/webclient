/* ***************** BEGIN MEGA LIMITED CODE REVIEW LICENCE *****************
 *
 * Copyright (c) 2016 by Mega Limited, Auckland, New Zealand
 * All rights reserved.
 *
 * This licence grants you the rights, and only the rights, set out below,
 * to access and review Mega's code. If you take advantage of these rights,
 * you accept this licence. If you do not accept the licence,
 * do not access the code.
 *
 * Words used in the Mega Limited Terms of Service [https://mega.nz/#terms]
 * have the same meaning in this licence. Where there is any inconsistency
 * between this licence and those Terms of Service, these terms prevail.
 *
 * 1. This licence does not grant you any rights to use Mega's name, logo,
 *    or trademarks and you must not in any way indicate you are authorised
 *    to speak on behalf of Mega.
 *
 * 2. If you issue proceedings in any jurisdiction against Mega because you
 *    consider Mega has infringed copyright or any patent right in respect
 *    of the code (including any joinder or counterclaim), your licence to
 *    the code is automatically terminated.
 *
 * 3. THE CODE IS MADE AVAILABLE "AS-IS" AND WITHOUT ANY EXPRESS OF IMPLIED
 *    GUARANTEES AS TO FITNESS, MERCHANTABILITY, NON-INFRINGEMENT OR OTHERWISE.
 *    IT IS NOT BEING PROVIDED IN TRADE BUT ON A VOLUNTARY BASIS ON OUR PART
 *    AND YOURS AND IS NOT MADE AVAILABE FOR CONSUMER USE OR ANY OTHER USE
 *    OUTSIDE THE TERMS OF THIS LICENCE. ANYONE ACCESSING THE CODE SHOULD HAVE
 *    THE REQUISITE EXPERTISE TO SECURE THEIR OWN SYSTEM AND DEVICES AND TO
 *    ACCESS AND USE THE CODE FOR REVIEW PURPOSES. YOU BEAR THE RISK OF
 *    ACCESSING AND USING IT. IN PARTICULAR, MEGA BEARS NO LIABILITY FOR ANY
 *    INTERFERENCE WITH OR ADVERSE EFFECT ON YOUR SYSTEM OR DEVICES AS A
 *    RESULT OF YOUR ACCESSING AND USING THE CODE.
 *
 * Read the full and most up-to-date version at:
 *    https://github.com/meganz/webclient/blob/master/LICENCE.md
 *
 * ***************** END MEGA LIMITED CODE REVIEW LICENCE ***************** */

function idbDownloadIO(dl_id, dl) {
    var db;
    var schema = {
        chunks: {
            key: {
                keyPath: 'id',
                autoIncrement: true
            }
        }
    };

    this.write = function(buffer, offset, done) {
        if (d) {
            console.log('iDB Writing...', buffer.byteLength, offset);
        }

        db.server.update('chunks', new Blob([buffer]))
            .then(done, function(e) {
                dlFatalError(dl, e.reason);
            });
    };

    this.download = function(name, path) {
        var blobs = [];
        var self = this;
        var idb = db.server.idbRequestInstance;

        idb.transaction("chunks", 'readonly')
            .objectStore("chunks")
            .openCursor().onsuccess = function(ev) {
                try {
                    var cursor = ev.target.result;

                    if (cursor) {
                        blobs.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        __completeDownload();
                    }
                }
                catch (e) {
                    console.error(e);
                    dlFatalError(dl, e);
                }
            };

        function __completeDownload() {
            var dlLinkNode = document.getElementById('dllink');
            var file_url = myURL.createObjectURL(new Blob(blobs));
            blobs.length = 0;
            dlLinkNode.download = name;
            dlLinkNode.href = file_url;
            dlLinkNode.click();
            Later(function() {
                myURL.revokeObjectURL(file_url);
                file_url = undefined;
                self.abort();
            });
        }
    };
    this.download1 = function(name, path) {
        var self = this;
        db.query('chunks').execute()
            .done(function(chunks) {

            }).fail(function(e) {
                dlFatalError(dl, e);
            });
    };

    this.abort = function(err) {
        if (db) {
            db.drop();
            db = null;
        }
    };

    this.setCredentials = function(url, size, name) {
        if (this.is_zip || !dl.zipid) {
            var __onDbStateChange = function(ev) {
                db.unbind('onDbStateReady').unbind('onDbStateFailed');

                if (ev.type === 'onDbStateFailed') {
                    dlFatalError(dl, Error('iDB State Error'));
                }
                else {
                    db.clear('chunks').then(this.begin.bind(this), function() {
                        dlFatalError(dl, Error('iDB Clear Error'));
                    });
                }
            }.bind(this);

            db = new MegaDB('dl', dl_id, schema);

            db.bind('onDbStateReady', __onDbStateChange)
                .bind('onDbStateFailed', __onDbStateChange);

        }
        else {
            this.begin();
        }
    };
}

idbDownloadIO.usable = function() {
    try {
        return !!window.indexedDB;
    }
    catch (ex) {}

    return false;
};
