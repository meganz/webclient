$(window).bind('megaAuthenticationFinished', function() {
    if(window.location.toString().indexOf("scrubKeys") > 0) {
        if(!localStorage.keysScrubbed) {
            authring.scrubEd25519KeyPair();
            localStorage.keysScrubbed = 1;
        }
    }
});