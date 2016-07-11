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

function FileIO(dl_id, dl) {
    var file;

    this.write = function(buffer, offset, done) {
        file = new File([file, buffer], file.name, {
            type: file.type,
            lastModified: Date.now()
        });
        Soon(done);
    };

    this.download = function(name, path) {
        var file_url = myURL.createObjectURL(file);
        var dlLinkNode = document.getElementById('dllink');
        dlLinkNode.download = name;
        dlLinkNode.href = file_url;
        dlLinkNode.click();
        Later(function() {
            myURL.revokeObjectURL(file_url);
            file_url = undefined;
        });
    };

    this.setCredentials = function(url, size, name) {
        if (this.is_zip || !dl.zipid) {
            file = new File([""], name, {
                type: "application/octet-stream",
                lastModified: Date.now()
            });
        }
        this.begin();
    };
}

FileIO.usable = function() {
    var r = false;

    if (typeof File !== 'undefined') {
        try {
            var f = new File(["M"], "M.txt", {
                type: "text/plain"
            });
            r = f.size === 1 && f.name === 'M.txt';
        }
        catch (e) {}
    }

    return r;
};
