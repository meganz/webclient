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
 * Words used in the Mega Limited Terms of Service [https://mega.nz/terms]
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

(function(scope) {
    var MediaSource = scope.MediaSource || scope.WebKitMediaSource;

    var hideOverlay = function() {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    };

    var showOverlay = function() {
        $('.fm-dialog-overlay').removeClass('hidden');
        $('body').addClass('overlayed');
    };

    function MediaSourceIO(dl_id, dl) {
        var logger;
        var mimeType;
        var ownPlayer;
        var mediaSource;
        var sourceBuffer;
        var videoElement;
        var chunksLeft;
        var totalChunks;
        var doneCallbacks = [];
        var events = [
            'error', 'abort', 'progress',
            'timeupdate', 'canplay', 'seeking', 'ended',
            'updateend'
        ];

        this.handleEvent = function(ev) {
            var target = ev.target;

            logger.debug('Event(%s)', ev.type, target, ev);

            switch(ev.type) {
                case 'sourceopen':
                case 'webkitsourceopen':
                    mediaSource.removeEventListener('sourceopen', this);
                    mediaSource.removeEventListener('webkitsourceopen', this);

                    try {
                        sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                        // sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
                    }
                    catch (ex) {
                        logger.error(ex);
                        return dlFatalError(dl, ex);
                    }

                    events.forEach(function(evt) {
                        videoElement.addEventListener(evt, this, false);
                        sourceBuffer.addEventListener(evt, this, false);
                    }.bind(this));

                    this.begin();
                    break;

                case 'canplay':
                    logger.debug('Duration: %s', videoElement.duration);
                    videoElement.play();
                    break;

                case 'updateend':
                    var callback = doneCallbacks.shift();

                    logger.debug('chunksLeft', chunksLeft);

                    if (typeof callback !== 'function') {
                        logger.error('Unexpected event.');
                    }
                    else {
                        if (!--chunksLeft) {
                            mediaSource.endOfStream();
                        }
                        Soon(callback);
                    }
                    break;

            }
        }

        this.write = function(buffer, offset, done) {
            if (d) {
                logger.debug('Bufering...', buffer, offset);
            }

            doneCallbacks.push(done);

            try {
                sourceBuffer.appendBuffer(buffer);
            }
            catch (ex) {
                logger.error(ex);
                dlFatalError(dl, ex);
            }
        };

        this.abort = function(err) {

        };

        this.download = function(name, path) {

        };

        this.setCredentials = function(url, size, name, chunks) {
            mimeType = filemime(name);

            if (mimeType.substr(0, 6) !== 'video/') {
                return dlFatalError(dl, l[7272]);
            }

            logger = new MegaLogger('MediaSourceIO', {}, dl.writer.logger);
            logger.info('MediaSourceIO Begin', dl_id, arguments);

            videoElement = document.querySelector('video');
            if (!videoElement) {
                var attrs = {
					autoplay: 1,
					controls: 1,
                    width: Math.floor(scope.innerWidth * 80 / 100),
                    style: 'position:absolute;top:10%;left:10%;z-index:123456'
                };
                videoElement = mCreateElement("video", attrs, 'body');
                showOverlay();
                ownPlayer = true;
            }
            mediaSource = new MediaSource();
            videoElement.src = myURL.createObjectURL(mediaSource);

            mediaSource.addEventListener('sourceopen', this, false);
            mediaSource.addEventListener('webkitsourceopen', this, false);

            // segments = chunks.map(function(v) { return !v; });

            chunksLeft = totalChunks = chunks.length;
        };
    }

    var itWorks;
    MediaSourceIO.usable = function() {
        var rc = false;

        if (itWorks !== undefined) {
            return itWorks;
        }

        if (MediaSource !== undefined) {

            try {
                var mediaSource = new MediaSource();
                var uri = myURL.createObjectURL(mediaSource);
                myURL.revokeObjectURL(uri);
                rc = true;
            }
            catch (e) {
                console.error(e)
            }
        }

        itWorks = rc;
        return rc;
    };

    scope.MediaSourceIO = MediaSourceIO;

})(this);
