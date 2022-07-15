/**
 * @fileOverview
 * webgl.js unit tests.
 */

describe("MegaUtils validatePhoneNumber test", function() {
    "use strict";
    let megaUtil;

    beforeEach(function() {
        megaUtil = new MegaUtils();
    });

    afterEach(function() {
        megaUtil = null;
    });

    describe("full phone number test", function () {
        let testData = {
            '1 (234) 567-8901': '12345678901',
            '1.234.567.8901': '12345678901',
            '1/234/567/8901': '12345678901',
            '12345678901': '12345678901',
            '1-234-567-8901 ext. 1234': false,
            '(+351) 282 433 5050': '+3512824335050',
            '+(123) 282 433 5050': '+1232824335050',
            '1-234-asd567': false,
            '1-123': '1123',
            '(234) 567-8901 ext. 123': false,
            '+12345678901': '+12345678901',
            '+1 234-567-8901 ext. 123': false,
            '1 (234) 567-8901 ext. 123': false,
            '00 1 234-567-8901 ext. 123': false,
            '1-234-567-8901': '12345678901',
            '1-234-567-8901 x1234': false,
            '1-234-567-8901 ext1234': false,
            '1.234.567.8901': '12345678901',
            '+63 912 345 8378': '+639123458378',
            '+63-912-345-8378': '+639123458378',
            '+6391': '+6391',
            '+639': false,
            'not a phone number': false,
            '1800 801 920': '1800801920',
            '+44 20 8759 9036': '+442087599036',
            '+1 800 444 4444': '+18004444444',
            '+1 213 621 0002': '+12136210002',
            '+64 9 887 6986': '+6498876986',
            '+1 213 6asd21 0002': false,
            '+64 9 88asd7 6986': false,
            '+() 9 887 6986': '+98876986',
            '+-64 9 887 6986': '+6498876986',
            '+(+64 9 887 6986': false,
            '+(.64 9 887 6986': '+6498876986',
            '4353+++++aaa+bbbb+34534534+34534534': false,
            '4353+++++34534534+34534534': false
        };

        var assert = chai.assert;

        for (let key in testData) {
            it ('validates phone number ' + key, function () {
                assert.isTrue(megaUtil.validatePhoneNumber(key) == testData[key]);
            });
        }

        it ('validates phone non string', function () {
            assert.isFalse(megaUtil.validatePhoneNumber({}));
        });
    });
    

    describe("full phone number with country call code", function () {
        let testData = [
            {
                phone: '912 345 6778',
                code: '+63',
                result: '+639123456778'
            },
            {
                phone: '912 345 6778',
                code: '63',
                result: '639123456778'
            },
            {
                phone: '12',
                code: '63',
                result: false
            },
            {
                phone: '12',
                code: '63',
                result: false
            },
            {
                phone: '1234',
                code: '63',
                result: '631234'
            },
            {
                phone: '12asd',
                code: '63',
                result: false
            },
            {
                phone: '1234',
                code: '+-63',
                result: false
            },
            {
                phone: '12',
                code: '+-63',
                result: false
            },
            {
                phone: '12',
                code: '-+63',
                result: false
            },
            {
                phone: '1234',
                code: '-+63',
                result: false
            },
        ];

        var assert = chai.assert;

        testData.forEach(function (value) {
            it ('validates phone number with call code ' + `${value.code}${value.phone}`, function () {
                assert.isTrue(megaUtil.validatePhoneNumber(value.phone, value.code) == value.result);
            });
        });
    });
});
