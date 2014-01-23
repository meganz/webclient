function expect() {
    return chai.expect.apply(this, toArray(arguments))
};

function fail(msg) {
    console.error(msg + " " + (Array.prototype.splice.call(arguments, 1)).join(" "));
    expect(true).toBeFalsy();
}

function expectToBeResolved($promise, msg) {
    $promise
        .fail(function() {
            debugger;
            expect(true).to.equal(false, msg + ", fail arguments: " + toArray(arguments).join(", "));
        });

    return $promise;
}


var stringToXml = function(str) {
    // helper method for unit tests which will be mocking XML stanzas
    // main assumption is that Strophe is loaded
    return Strophe.xmlHtmlNode(str).children[0];
};