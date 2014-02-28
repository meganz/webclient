/**
 * Mocker that will mock all MEGA's functions (global functions) which should be mocked while running the unit tests.
 *
 * @returns {FunctionsMocker}
 * @constructor
 */
var FunctionsMocker = function() {
    var self = this;

    self.objectMocker = new ObjectMocker(
        window,
        {
            'fastHashFunction': function(val) {
                return simpleStringHashCode(val);
            }
        });

    self.restore = function() {
        self.objectMocker.restore();
    }
};