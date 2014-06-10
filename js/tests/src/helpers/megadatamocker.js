/**
 * Mocker that will mock MegaData's `M` instance with some fixture data and spy methods.
 *
 * @returns {MegaDataMocker}
 * @constructor
 */
var MegaDataMocker = function() {
    var self = this;

    self.objectMocker = new ObjectMocker(
        window,
        {
            'u_handle': "A_123456789",
            'u_sid': "c5N5zoeMFzja_tScIA3QQVo2aWpwS0NsT184ggY0ta9BlkYxFfmIDdkvig",
            'avatars': {},
            'M': {
                'u': {
                    "A_123456789": {
                        "u": "A_123456789", "c": 2, "m": "lpetrov@me.com", "presence": "chat", "presenceMtime": 1391783363.743, "h": "A_123456789"
                    },
                    "B_123456789": {
                        "u": "B_123456789", "c": 1, "m": "lp@mega.co.nz", "ts": 1390835777, "name": "lp@mega.co.nz", "h": "B_123456789", "t": 1, "p": "B_123456789", "presence": "chat", "presenceMtime": 1392042647
                    }
                },
                'd': {
                    'd1123456': {"h":"d1123456","p":"ROOTID","u":"A_123456789","t":1,"a":"aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8","k":"A_123456789:Qof93iBM8wG6rRJNCiCnwg","ts":1384600611,"key":[1919488715,1389955760,1439516433,407573463],"ar":{"n":"dir1"},"name":"dir1"},
                    'd2123456': {"h":"d2123456","p":"ROOTID","u":"A_123456789","t":1,"a":"aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8","k":"A_123456789:Qof93iBM8wG6rRJNCiCnwg","ts":1384600611,"key":[1919488715,1389955760,1439516433,407573463],"ar":{"n":"dir2"},"name":"dir2"},
                    'f1123456': {"h":"f1123456","p":"ROOTID","u":"A_123456789","t":1,"a":"aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8","k":"A_123456789:Qof93iBM8wG6rRJNCiCnwg","ts":1384600611,"key":[1919488715,1389955760,1439516433,407573463],"ar":{"n":"file1"},"name":"file1"},
                    'f2123456': {"h":"f2123456","p":"ROOTID","u":"A_123456789","t":1,"a":"aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8","k":"A_123456789:Qof93iBM8wG6rRJNCiCnwg","ts":1384600611,"key":[1919488715,1389955760,1439516433,407573463],"ar":{"n":"file2"},"name":"file2"},
                    'cf112345': {"h":"cf112345","p":"d1123456","u":"A_123456789","t":1,"a":"aFAWhoQFmmLYXUK5VZpswJByb6ICMBIxjnfjz_IBpa8","k":"A_123456789:Qof93iBM8wG6rRJNCiCnwg","ts":1384600611,"key":[1919488715,1389955760,1439516433,407573463],"ar":{"n":"dir1 file1"},"name":"dir1 file1"}
                },
                'RootID': 'ROOTID'
            }
        });

    self.restore = function() {
        self.objectMocker.restore();
    }
};