
/* Collect entropy from mouse motion and key press events
 * Note that this is coded to work with either DOM2 or Internet Explorer
 * style events.
 * We don't use every successive mouse movement event.
 * Instead, we use some bits from random() to determine how many
 * subsequent mouse movements we ignore before capturing the next one.
 *
 * Collected entropy is used to salt ISAAC PRNG.
 *
 * mouse motion event code originally from John Walker
 * key press timing code thanks to Nigel Johnstone */

var lastactive = new Date().getTime();

var bioSeed = new Array(256);
var bioCounter = 0;

var mouseMoveSkip = 0; // Delay counter for mouse entropy collection

// ----------------------------------------

if (window.performance !== undefined && window.performance.now !== undefined) {
	var timeByte = function() { return ((window.performance.now()%512)>>>1)&255 };
} else {
	var timeByte = function() { return ((new Date().getTime())>>>2)&255 };
}

function keyPressEntropy(e) { bioSeed[bioCounter++ & 255] ^= timeByte() | ( e.keyCode << 8 ); }

function mouseMoveEntropy(e)
{
 lastactive = new Date().getTime();

 if(mouseMoveSkip-- <= 0)
 {
  var c = ((e.screenX << 4) | (e.screenY & 15));
  if (typeof arkanoid_entropy !== 'undefined') arkanoid_entropy();
  bioSeed[bioCounter++ & 255] ^= timeByte() | ( c << 8 );
  mouseMoveSkip = ( Math.random() * 8 ) | 0;
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
