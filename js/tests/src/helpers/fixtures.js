function Fixtures(path) {
    if(window.location.toString().indexOf("context.html") != -1) {
        path = "/base/" + path;
    }
    this.path = path;
    this.loaded = {};

    return this;
}

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