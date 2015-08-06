var advert = advert || {};

/** 
 *  Used to initialise and trigger popunder functionality on the site.
 */
advert.megaPopunder = {
    
    popurls: [""],
    popTimes: 1,
    popIndex: 0,
    
    // Cookies prevent multiple popunders within short periods of time
    cookieTime:30,
    cookieName: "megapopobjx1",

    // To stop multiple popunders in a row
    block: 0,
    stopListening: true,

    // The window itself
    popunder: null,

    $button: null,

    /**
     *  Initialises the popunder to launch on a click
     *  @param {jquery element} button The element to trigger click events from
     */
    init: function(button) {
        if (typeof (button) === 'undefined' || button == null) return;
        this.$button = button;

        var parent = this;
        popIndex = parseInt(this.getCookie());

        (function () {
            var addEvent = function (element, event, fn) {
                if (element.addEventListener)
                    element.addEventListener(event, fn, false);
                else if (element.attachEvent)
                    element.attachEvent("on" + event, fn)
            };
            addEvent(window, "load", parent.setupPopunder(parent.popurls[parent.popIndex]) );
        })();
    },
    
    /**
     *  Is flash available?
     */
    hasFlash: function() {
        return !(!navigator.mimeTypes["application/x-shockwave-flash"]);
    },

    /**
     *  Set up an object that flags which browser is available, as different behaviour needs to trigger depending on the browser
     */
    getBrowser: function() {
        var n = navigator.userAgent.toLowerCase();
        var b = {
            webkit: /webkit/.test(n),
            mozilla: (/mozilla/.test(n)) && (!/(compatible|webkit)/.test(n)),
            chrome: /chrome/.test(n),
            msie: (/msie/.test(n)) && (!/opera/.test(n)),
            firefox: /firefox/.test(n),
            safari: (/safari/.test(n) && !(/chrome/.test(n))),
            opera: /opera/.test(n)
        };
        b.version = (b.safari) ? (n.match(/.+(?:ri)[\/: ]([\d.]+)/) || [])[1] : (n.match(/.+(?:ox|me|ra|ie)[\/: ]([\d.]+)/) || [])[1];
        b.opera = (navigator.userAgent.match(/Opera|OPR\//) ? true : false);
        return b;
    },

    /**
     *  Set the popunder specific cookie
     *  @param {integer} cvalue The cookie value
     */
    setCookie: function(cvalue) {
        var extime  = this.cookieTime;
        var cname = this.cookieName;
        var d = new Date();
        d.setTime(d.getTime() + (extime*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    },

    /**
     *  Get the popunder specific cookie 
     */
    getCookie: function() {
        var name = this.cookieName + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
        }
        return "";
    },

    /**
     *  Bind the event to the entire page
     *  @param {function} handler The handler function to bind to the document click
     */
    bindOnDocumentClick: function(handler) {    
        var topWindow = self;
        if (top != self) {
            try {
                if (top.document.location.toString())
                    topWindow = top;
            } catch (err) {
            }
        }
        if (topWindow.document.addEventListener) {
            topWindow.document.addEventListener("click", handler, false);
        } else {
            topWindow.document.attachEvent("onclick", handler);
        }
    },

    /**
     *  Bind the event to just the button object
     *  @param {function} handler The handler function to bind to the button click
     */
    bindOnButtonClick: function(handler) {
        this.$button.click(handler);
    },


    /**
     *  We do not have the ability to do a standard popunder, so we fall back to a sad popup
     */
    triggerAlternatePopunder: function(sUrl) {
        if (this.block == 0 && this.popIndex < this.popTimes && navigator.cookieEnabled) {
            this.block = 1;
            this.setCookie(this.popIndex + 1);
            // We have to do a popup in this situation or it screws with the download functionality
            window.open(sUrl);
        }
    },

    /**
     *  Sets up the event to launch the window upon a click
     */
    setupPopunder: function(sUrl, sConfig) {
        if (sUrl.length===0) return;

        sConfig      = (sConfig || {});
        var sName    = (sConfig.name   || Math.floor((Math.random() * 1000) + 1));
        var sWidth   = (sConfig.width  || window.outerWidth  || window.innerWidth);
        var sHeight  = (sConfig.height || (window.outerHeight-100) || window.innerHeight);

        var sPosX    = (typeof(sConfig.left) != 'undefined') ? sConfig.left.toString() : window.screenX;
        var sPosY    = (typeof(sConfig.top)  != 'undefined') ? sConfig.top.toString()  : window.screenY;

        var sOptions = 'toolbar=no,scrollbars=yes,location=yes,statusbar=yes,menubar=no,resizable=1,width=' + sWidth.toString() + ',height=' + sHeight.toString() + ',screenX=' + sPosX + ',screenY=' + sPosY;

        var parent = this;
        var parentWindow  = (top != self && typeof(top.document.location.toString()) === 'string') ? top : self;

        var listenerEvent = function(e) {
            if (parent.stopListening==false) return;
            parent.stopListening = false;

            if (parent.block == 0 && parent.popIndex < parent.popTimes && navigator.cookieEnabled)
            {
                if(/*(!parent.getBrowser().webkit || parent.hasFlash()) && */!parent.getBrowser().opera) {
                    if (document.readyState === "complete") {
                        parent.popunder = parentWindow.window.open(sUrl, sName, sOptions);
                        if (parent.popunder)
                        {
                            parent.setCookie(popIndex + 1);
                            parent.triggerSpecialBehaviour();
                        }
                    }
                }
                else {     
                    parent.triggerAlternatePopunder(sUrl);
                    return false;
                }
            }
        };

        this.bindOnButtonClick(listenerEvent);
    },

    /**
     *  Attempts to trigger the window to move behind
     */
    triggerSpecialBehaviour: function() {
        this.block = 1;

        var browser = this.getBrowser();

        try {
            this.popunder.blur();
            this.popunder.opener.window.focus();
            window.self.window.focus();
            window.focus();

            if (browser.chrome) this.doChromePopunder();
            if (browser.firefox) this.openCloseWindow();
            if (browser.webkit) this.openCloseTab();
            if (browser.msie) this.doMsiePopunder();
        } catch (e) {}
    },

    /**
     *  Specific code for ie
     */
    doMsiePopunder: function() {
        setTimeout(function() {
            popunder.blur();
            popunder.opener.window.focus();
            window.self.window.focus();
            window.focus();
        }, 1000);
    },

    /**
     *  Specific code for chrome
     */
    doChromePopunder: function()
    {
        var fakeLink = document.createElement('A');
        fakeLink.id = 'inffake';
        document.body.appendChild(fakeLink);
        fakeLink.href = "javascript:alert('o')";
        var e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", false, true, window, 0, 0, 0, 0, 0, false, false, true, false, 0, null);
        setTimeout(function () {
            window.getSelection().empty();
        }, 250);
    },

    /**
     *  Used for firefox
     */
    openCloseWindow: function() {
        var ghost = window.open('about:blank');
        ghost.focus();
        ghost.close();
    },

    /**
     *  Used for webkit
     */
    openCloseTab: function() {
        var nothing = '';
        var ghost = document.createElement("a");
        ghost.href   = "data:text/html,<scr"+nothing+"ipt>window.close();</scr"+nothing+"ipt>";
        document.getElementsByTagName("body")[0].appendChild(ghost);

        var clk = document.createEvent("MouseEvents");
        clk.initMouseEvent("click", false, true, window, 0, 0, 0, 0, 0, true, false, false, true, 0, null);
        ghost.dispatchEvent(clk);

        ghost.parentNode.removeChild(ghost);
    }
};
