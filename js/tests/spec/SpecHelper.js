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
        toBeResolved: function () {
            return {
                compare: function (actual, msg) {
                    var $promise = actual;

                    var result = {
                        pass: $promise.state() === "resolved"
                    };

                    if(!result.pass) {
                        result.message = "Expected promise to be resolved: " + msg;
                        console.error(result.message);
                    }

                    return result;
                }
            };
        }
    });
});
