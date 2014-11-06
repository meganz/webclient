$(window).bind('megaAuthenticationFinished', function() {
    if(window.location.toString().indexOf("scrubKeys") > 0) {
        if(!localStorage.keysScrubbed || localStorage.keysScrubbed == "1") {
            authring.scrubEd25519KeyPair();
            localStorage.keysScrubbed = 2;

            setTimeout(function() {
                window.location = "/";
            }, 1000);
        }
    }
});