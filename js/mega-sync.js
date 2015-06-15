
function MegaSync()
{
    this._url     = "https://localhost.megasyncloopback.mega.nz:6342/";
    this._enabled = false;
    this._version = 0;
    this._api({a: "v"});
}

MegaSync.prototype.handle_v = function(version) {
    this._enabled = true;
    this._version = version;
};

MegaSync.prototype.download = function(pubkey, privkey) {
    if (!this._enabled) {
        return false;
    }

    this._api({a: "l", h: pubkey, k: privkey});
    return true;
};

MegaSync.prototype.handle = function(response) {
    if (response === 0) {
        // alright!
        return;
    }

    if (typeof response != "object") {
        // some error
        this._enabled = false;
        return;
    }

    for (var i in response) {
        this['handle_' + i](response[i]);
    }
};

MegaSync.prototype._api = function(args) {
    $.post(this._url, JSON.stringify(args), this.handle.bind(this), "json");
};

var megasync = new MegaSync;
