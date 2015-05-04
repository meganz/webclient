var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";
var b64a = b64.split('');


// unsubstitute standard base64 special characters, restore padding
function base64urldecode(data)
{
    data += '=='.substr((2-data.length*3)&3)

    if (typeof atob === 'function')
    {
        data = data.replace(/\-/g,'+').replace(/_/g,'/').replace(/,/g,'');

        try {
            return atob(data);
        } catch (e) {
            return '';
        }
    }

    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Thunder.m
    // +      input by: Aman Gupta
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
    // *     returns 1: 'Kevin van Zonneveld'
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    //if (typeof this.window['atob'] == 'function') {
    //    return atob(data);
    //}
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

    if (!data) {
        return data;
    }

    data += '';

    do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
    } while (i < data.length);

    dec = tmp_arr.join('');

    return dec;
}

// substitute standard base64 special characters to prevent JSON escaping, remove padding
function base64urlencode(data)
{
    if (typeof btoa === 'function') return btoa(data).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = "",
        tmp_arr = [];

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64a[h1] + b64a[h2] + b64a[h3] + b64a[h4];
    } while (i < data.length);

    enc = tmp_arr.join('');
    var r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc);
}

function parsetopmenu() {};
function sectionUIopen() {};

is_chrome_firefox = true; /* to be used for phantomjs */
mozRunAsync = false;

function is_fm() { return false; };

function rand(n) { return Math.floor(Math.random() * n) + 1; };


var mBroadcaster = {
    _topics : {},

    addListener: function mBroadcaster_addListener(topic, options) {
        if (typeof options === 'function') {
            options = {
                callback : options
            };
        }
        if (typeof options.callback !== 'function') {
            return false;
        }

        if (!this._topics.hasOwnProperty(topic)) {
            this._topics[topic] = {};
        }

        var id = Math.random().toString(26);
        this._topics[topic][id] = options;

        if (d) console.log('Adding broadcast listener', topic, id, options);

        return id;
    },

    removeListener: function mBroadcaster_removeListenr(token) {
        if (d) console.log('Removing broadcast listener', token);
        for (var topic in this._topics) {
            if (this._topics[topic][token]) {
                delete this._topics[topic][token];
                if (!Object.keys(this._topics[topic]).length) {
                    delete this._topics[topic];
                }
                return true;
            }
        }
        return false;
    },

    sendMessage: function mBroadcaster_sendMessage(topic) {
        if (d) console.log('Broadcasting ' + topic);
        if (this._topics.hasOwnProperty(topic)) {
            var args = Array.prototype.slice.call(arguments, 1);
            var idr = [];

            for (var id in this._topics[topic]) {
                var ev = this._topics[topic][id];
                try {
                    ev.callback.apply(ev.scope, args);
                } catch (ex) {
                    if (d) console.error(ex);
                }
                if (ev.once)
                    idr.push(id);
            }
            if (idr.length)
                idr.forEach(this.removeListener.bind(this));
        }
    },

    once: function mBroadcaster_once(topic, callback) {
        this.addListener(topic, {
            once : true,
            callback : callback
        });
    }
};
if (typeof Object.freeze === 'function') {
    mBroadcaster = Object.freeze(mBroadcaster);
}


window.d = 1;
is_extension = false;

apipath = "http://localhost/"; // some invalid api path
staticpath = "/js/";