// Set up the testing environment.
var devhost = window.location.host;
var pathSuffix = window.location.pathname;
pathSuffix = pathSuffix.split("/").slice(0, -2).join("/");

try {
    localStorage.clear();
}
catch (ex) {
    cookiesDisabled = ex.code && ex.code === DOMException.SECURITY_ERR
        || e.message === 'SecurityError: DOM Exception 18';

    if (!cookiesDisabled) {
        throw ex;
    }

    Object.defineProperty(window, 'localStorage', {
        value: Object.create({}, {
            length:     { get: function() { return Object.keys(this).length; }},
            key:        { value: function(pos) { return Object.keys(this)[pos]; }},
            removeItem: { value: function(key) { delete this[key]; }},
            setItem:    { value: function(key, value) { this[key] = String(value); }},
            getItem:    { value: function(key) {
                if (this.hasOwnProperty(key)) {
                    return this[key];
                }
                return null;
            }},
            clear: {
                value: function() {
                    var obj = this;
                    Object.keys(obj).forEach(function(memb) {
                        if (obj.hasOwnProperty(memb)) {
                            delete obj[memb];
                        }
                    });
                }
            }
        })
    });
    Object.defineProperty(window, 'sessionStorage', {
        value: localStorage
    });
}
localStorage.staticpath = window.location.protocol + "//"
                        + devhost + pathSuffix + "/";
