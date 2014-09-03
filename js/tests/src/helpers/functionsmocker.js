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
            },
            'a32_to_base64': function(v) {
                return "cmkSy1LZCrBVzUcRGEsT1w";
            },
            'api_req': function(op, ctx) {
                if(ctx['callback']) {
                    ctx['callback']({}, ctx);
                }
            }
        });

    var origFullscreenPlug = $.fn.fullScreen;

    $.fn.fullScreen = function() { return false; };

    self.restore = function() {
        $.fn.fullScreen = origFullscreenPlug;
        self.objectMocker.restore();
    }
};