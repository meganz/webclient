
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
	var timeByte = function() { return ((window.performance.now()%512)>>>1)&255 };
} else {
	var timeByte = function() { return (Date.now()>>>2)&255 };
}

function keyPressEntropy(e) { bioSeed[bioCounter++ & 255] ^= timeByte() | ( e.keyCode << 8 ); }

function mouseMoveEntropy(e)
{
 lastactive = Date.now();

 if( !u_storage.randseed && bioCounter < 40 )
 {
   // bioCounter is incremented once per 4 move events in avegare
   // 40 * 4 = 160 first move events should provide at about 240 bits of entropy
   // (conservative estimation is 1.5 bits of entropy per move event)
   asmCrypto.random.seed( new Uint32Array([ e.screenX, e.screenY, timeByte() ]) );
 }
 else if(mouseMoveSkip-- <= 0)
 {
  var c = ((e.screenX << 4) | (e.screenY & 15));

  if (typeof arkanoid_entropy !== 'undefined') arkanoid_entropy();
  bioSeed[bioCounter++ & 255] ^= timeByte() | ( c << 8 );
  mouseMoveSkip = ( Math.random() * 8 ) | 0;

  if ( (bioCounter & 255) == 0 ) {
    if (d) console.log("Reseeding PRNG");

    asmCrypto.random.seed(bioSeed);

    if ( u_storage ) {
        var randseed = new Uint8Array(32);
        asmCrypto.getRandomValues(randseed);
        u_storage.randseed = base64urlencode( asmCrypto.bytes_to_string(randseed) );
    }
  }
 }
}

// ----------------------------------------

function eventsEnd()
{
 if(document.removeEventListener)
 {
  document.removeEventListener("mousemove", mouseMoveEntropy, false);
  document.removeEventListener("keypress", keyPressEntropy, false);
 }
 else if(document.detachEvent)
 {
  document.detachEvent("onmousemove", mouseMoveEntropy);
  document.detachEvent("onkeypress", keyPressEntropy);
 }
}

// Start collection of entropy.
	
function eventsCollect()
{
 if (!d)
    asmCrypto.random.skipSystemRNGWarning = true;

 if ( u_storage.randseed )
    asmCrypto.random.seed( asmCrypto.string_to_bytes( base64urldecode(u_storage.randseed) ) );

 if((document.implementation.hasFeature("Events", "2.0"))
  && document.addEventListener) // Document Object Model (DOM) 2 events
 {
  document.addEventListener("mousemove", mouseMoveEntropy, false);
  document.addEventListener("keypress", keyPressEntropy, false);
 }
 else if(document.attachEvent) // IE 5 and above event model
 {
  document.attachEvent("onmousemove", mouseMoveEntropy);
  document.attachEvent("onkeypress", keyPressEntropy);
 }
}

// keyboard/mouse entropy
eventsCollect();
