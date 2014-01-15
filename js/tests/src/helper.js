function fail(msg) {
    console.error(msg + " " + (Array.prototype.splice.call(arguments, 1)).join(" "));
    expect(true).toBeFalsy();
}

function expectToBeResolved($promise, msg) {
    $promise.always(function() {
        expect($promise).toBeResolved(msg);
    });

    return $promise;
}