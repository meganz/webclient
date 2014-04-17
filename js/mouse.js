
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

var mouseMoveSkip = 0; // Delay counter for mouse entropy collection
var lastactive = new Date().getTime();

var randomSeed = new Array(256);
var randomCounter = 0;

// ----------------------------------------

if (window.performance !== undefined && window.performance.now !== undefined) {
	var timeByte = function() { return ((window.performance.now()%512)>>>1)&255 };
} else {
	var timeByte = function() { return ((new Date().getTime())>>>2)&255 };
}

function randomByte() { return Math.round(Math.random()*256)&255; }

function keyPressEntropy(e) { randomSeed[randomCounter++ & 255] ^= timeByte(); }

function mouseMoveEntropy(e)
{
 lastactive = new Date().getTime();

 if(mouseMoveSkip-- <= 0)
 {
  var c = ((e.screenX << 4) | (e.screenY & 15));
  if (typeof arkanoid_entropy !== 'undefined') arkanoid_entropy();
  randomSeed[randomCounter++ & 255] ^= ( timeByte() ^ c );
  mouseMoveSkip = randomByte() & 7;
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
