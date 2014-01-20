beforeEach(function () {
    jasmine.addMatchers({
//        toBePlaying: function () {
//            return {
//                compare: function (actual, expected) {
//                    var player = actual;
//
//                    return {
//                        pass: player.currentlyPlayingSong === expected && player.isPlaying
//                    }
//                }
//            };
//        },
        forceFail: function () {
            return {
                compare: function (actual, msg) {
                    var $promise = actual;

                    var result = {
                        pass: false
                    };


                    result.message = "Test failed: " + msg;
                    console.error(result.message);

                    return result;
                }
            };
        }
    });
});
