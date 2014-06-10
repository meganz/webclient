/**
 * Fixtures loader helper
 *
 * @param path {String} Base path (dir) where the fixtures can be found.
 * @returns {Fixtures}
 * @constructor
 */
function Fixtures(path) {
    if(window.location.toString().indexOf("context.html") != -1) {
        path = "/base/" + path;
    }
    this.path = path;
    this.loaded = {};

    return this;
}

/**
 * Returns a Deferred object which will get resolved when the fixture is loaded with 2 arguments:
 * 1) filename
 * 2) file contents (text/String)
 *
 * @param filename
 * @returns {Deferred}
 */
Fixtures.prototype.get = function(filename) {
    var self = this;
    var $promise = new $.Deferred();

    if(self.loaded[filename]) {
        $promise.resolve(filename, self.loaded[filename]);
    } else {
        $.get(self.path + filename, function(response) {
            self.loaded[filename] = response;
            $promise.resolve(filename, self.loaded[filename]);
        }).fail(function() {
            $promise.reject(
                toArray(arguments)
            );
        })
    }
    return $promise;
};