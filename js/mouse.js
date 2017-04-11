/* Collect entropy from mouse motion and key press events
 * Note that this is coded to work with either DOM2 or Internet Explorer
 * style events.
 * We don't use every successive mouse movement event.
 * Instead, we use some bits from random() to determine how many
 * subsequent mouse movements we ignore before capturing the next one.
 *
 * Collected entropy is used to salt asmCrypto's PRNG.
 *
 * mouse motion event code originally from John Walker
 * key press timing code thanks to Nigel Johnstone */

var lastactive = Date.now();

var bioSeed = new Uint32Array(256);
var bioCounter = 0;

var mouseMoveSkip = 0; // Delay counter for mouse entropy collection

// ----------------------------------------

if (window.performance !== undefined && window.performance.now !== undefined) {
    // Though `performance.now()` SHOULD be accurate to a microsecond,
    // spec says it's implementation-dependant (http://www.w3.org/TR/hr-time/#sec-DOMHighResTimeStamp)
    // That's why 16 least significan bits are returned
    var timeValue = function() {
        return (window.performance.now() * 1000) & 0xffff
    };
}
else {
    if (d) {
        console.warn("Entropy collector uses low-precision Date.now()");
    }
    var timeValue = function() {
        return Date.now() & 0xffff
    };
}

function keyPressEntropy(e) {
    bioSeed[bioCounter++ & 255] ^= (e.keyCode << 16) | timeValue();
}

var mouseApiRetryT = false;

function mouseMoveEntropy(e) {

    lastactive = Date.now();

    var v = (((e.screenX << 8) | (e.screenY & 255)) << 16) | timeValue();

    if (!localStorage.randseed) {
        if (bioCounter < 45) {
            // `bioCounter` is incremented once per 4 move events in average
            // 45 * 4 = 180 first move events should provide at about 270 bits of entropy
            // (conservative estimation is 1.5 bits of entropy per move event)
            asmCrypto.random.seed(new Uint32Array([v]));
        }
        else {
            if (d) {
                console.log("Got the first seed for future PRNG reseeding");
            }
            saveRandSeed();
        }
    }

    if (mouseMoveSkip-- <= 0) {
        bioSeed[bioCounter++ & 255] ^= v;

        mouseMoveSkip = (Math.random() * 8) | 0;

        if ((bioCounter & 255) === 0) {
            if (d) {
                console.log("Reseeding PRNG with collected entropy");
            }
            asmCrypto.random.seed(bioSeed);
            saveRandSeed();
        }

        if (typeof arkanoid_entropy !== 'undefined') {
            arkanoid_entropy();
        }
    }

    if (!mouseApiRetryT || mouseApiRetryT < lastactive) {
        mouseApiRetryT = lastactive + 2000;
        api_retry();
    }
}

// Store some random bits for reseeding RNG in the future
function saveRandSeed() {
    var randseed = new Uint8Array(32);
    asmCrypto.getRandomValues(randseed);
    localStorage.randseed = base64urlencode(asmCrypto.bytes_to_string(randseed));
}

// ----------------------------------------

function eventsEnd() {
    if (document.removeEventListener) {
        document.removeEventListener("mousemove", mouseMoveEntropy, false);
        document.removeEventListener("keypress", keyPressEntropy, false);
    }
    else if (document.detachEvent) {
        document.detachEvent("onmousemove", mouseMoveEntropy);
        document.detachEvent("onkeypress", keyPressEntropy);
    }
}

// Start collection of entropy.

function eventsCollect() {
    if (!d) {
        asmCrypto.random.skipSystemRNGWarning = true;
    }

    if (localStorage.randseed) {
        if (d) {
            console.log("Initially seeding PRNG with a stored seed");
        }
        asmCrypto.random.seed(asmCrypto.string_to_bytes(base64urldecode(localStorage.randseed)));
    }

    if ((document.implementation.hasFeature("Events", "2.0"))
        && document.addEventListener) // Document Object Model (DOM) 2 events
    {
        document.addEventListener("mousemove", mouseMoveEntropy, false);
        document.addEventListener("keypress", keyPressEntropy, false);
    }
    else if (document.attachEvent) // IE 5 and above event model
    {
        document.attachEvent("onmousemove", mouseMoveEntropy);
        document.attachEvent("onkeypress", keyPressEntropy);
    }
}

// keyboard/mouse entropy
mBroadcaster.once('boot_done', eventsCollect);
