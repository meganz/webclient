(function(global) {
    'use strict'; /* jshint -W089 */

    var patchAccountData;
    var storage = Object.create(null);
    var debloat = function(data) {
        var keys = Object.keys(storage);
        var result = Object.create(null);

        for (var key in data) {
            if (parseInt(key) !== (key | 0) && !keys.includes(key)) {
                result[key] = data[key];
            }
        }
        return result;
    };

    var dialog = storage.dialog = function() {
        console.error('Unhandled condition.', arguments);
    };

    dialog.quota = function(data) {
        // REGISTERED = 1
        // ACHIEVEMENTS = 4
        // REGISTERED + PRO = 3
        // REGISTERED + ACHIEVEMENTS = 5
        // REGISTERED + PRO + ACHIEVEMENTS = 7
        var flags = parseInt(data.flags) | 0;

        if (flags & 1) {
            u_type = 3;
            u_attr = Object(window.u_attr);
            u_handle = u_handle || "AAAAAAAAAAA";
            u_attr.flags = Object(u_attr.flags);
            u_attr.flags.ach = flags & 4;
        }

        if (flags & 2 && !u_attr.p) {
            u_attr.p = u_attr.p || 1;
            patchAccountData();
        }

        if (data.type === 'limited') {
            dlmanager.showLimitedBandwidthDialog(1, closeDialog, flags);
        }
        else if (data.type === 'upload') {
            dlmanager.lmtUserFlags = flags;
            ulmanager.ulShowOverStorageQuotaDialog();
        }
        else if (data.type === 'import' || data.type === 'storage') {
            var val = 4294967297;
            var cur = 210453397504;

            if (data.state === 'full') {
                val = -1;
                cur = 214748364800;
            }

            patchAccountData({cstrg: cur});

            if (data.type === 'import') {
                M.checkGoingOverStorageQuota(val);
            }
            else {
                M.checkStorageQuota(1);
            }
        }
        else {
            if (data.efq) {
                dlmanager.efq = true;
            }
            else {
                delete dlmanager.efq;
            }
            dlmanager.showOverQuotaDialog(null, flags);
        }
    };

    var set = storage.set = function(data) {
        data = debloat(data);

        var rsv = ['sid', 'k', 'privk', 'v', 'handle', 'fmconfig', 'attr', 'link'];
        for (var key in data) {
            if (!rsv.includes(key)) {
                var value = data[key];

                if (key === 'apipath') {
                    value = value || 'prod';
                    var target = ['prod', 'staging'].includes(value) ? 'api' : 'developers';
                    value = apipath = 'https://' + value + '.' + target + '.mega.co.nz/';
                }

                if (value) {
                    if (localStorage[key] !== String(value)) {
                        console.log('"%s" changed to "%s" from "%s"', key, value, localStorage[key]);
                    }
                    else {
                        console.log('"%s" set to "%s"', key, value);
                    }
                    localStorage[key] = value;
                }
                else {
                    if (localStorage[key]) {
                        console.log('Removed "%s", was "%s"', key, localStorage[key]);
                    }
                    delete localStorage[key];
                }
            }
        }

        top.location = getAppBaseUrl() + '#' + (data.link || 'fm');
    };

    set.dl = function(data) {
        data = debloat(data);

        for (var key in data) {
            if (key !== 'link') {
                sessionStorage['dltf' + key] = data[key] || 1;
            }
        }

        set({apipath: 'staging', link: data.link, d: 1, minLogLevel: '0', jj: location.host !== 'mega.nz'});
    };

    patchAccountData = function(data) {
        data = Object.assign({
            "mstrg": 214748364800,
            "pstrg": 214748364800,
            "mxfer": 1099511627776,
            "pxfer": 1099511627776,
            "caxfer": 609161627,
            "csxfer": 0,
            "cstrgn": {
                "cERvbHpM": [172403889248, 297153, 59114, 1290742857, 2732],
                "WmFKaUFE": [1496628, 1, 1, 0, 0],
                "WVhKSG5a": [0, 0, 0, 0, 0],
                "OVRvM0JM": [4126895, 7, 1, 0, 0],
                "QzRObFVB": [203630834, 3, 1, 0, 0]
            },
            "servbw_limit": 10,
            "downbw_used": 6091616270004,
            "cstrg": 176492551747, "uslw": 9800, "srvratio": 0, "balance": [["5.01", "EUR"]], "utype": 4, "smixed": 0,
            "stype": "O", "suntil": 1556535999, "bt": 19809, "tah": [0, 0, 0, 0, 0, 0], "tar": 0, "tuo": 0, "tua": 0,
            "ruo": 0, "rua": 0, "rtt": 1, "type": 4, "expiry": 1556535999, "space": 214748364800, "vouchers": [],
            "space_used": 176492551747, "bw": 1099511627776, "servbw_used": 0, "ssrs": 19294,
            "transactions": [["YjBLNXhhZFE", 1509922004, "10.00", "EUR"], ["TmZWTmFyNlE", 1509922318, "-4.99", "EUR"]],
            "contactLink": "C!d0w1RzFT", "purchases": [["bVhVLXNuSUI", 1509922318, "4.99", "EUR", 0, 4, 1]],
            "tfsq": {
                "max": 1099511627776,
                "used": 609161627,
                "left": 1098902466149,
                "perc": 0
            }
        }, data);

        M['account' + 'Data'] = function(cb) {
            return cb(data);
        };

        M['getStor' + 'ageQuota'] = function() {
            var res = data;
            return MegaPromise.resolve(Object.assign({}, res, {
                max: res.mstrg,
                used: res.cstrg,
                isFull: res.cstrg / res.mstrg >= 1,
                percent: Math.floor(res.cstrg / res.mstrg * 100),
                isAlmostFull: res.cstrg / res.mstrg >= res.uslw / 10000
            }));
        };
    };

    global.test = function(data) {
        data = String(data).split(/(\.\w+=?)/);

        for (var i = 1; i < data.length; i += 2) {
            data[data[i] = String(data[i]).replace(/\W/g, '')] = mURIDecode(data[i + 1]);
        }
        window.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }, true);

        var name = data[1];
        return storage[name] ? (storage[name][data[name]] || storage[name])(data) : loadSubPage('debug');
    };
})(self);
