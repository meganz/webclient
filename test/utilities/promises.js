var internalAssert = function (evaled, msg) {
    if(!evaled) {
        console.error("AssertFailed: ", msg);
        assert(false, msg);
    }
};

var PromiseHelpers = function() {
    this.promiseCount = 0;
    this._testIsWaitingForPromises = [];
    mStub(MegaPromise, 'debugPreStack', true);
    if (typeof window.promisesDebug === 'undefined') {
        window.promisesDebug = false;
    }
    mStub(window, 'promisesDebug', true);
};

PromiseHelpers.prototype.destroy = function() {
    this._testIsWaitingForPromises = [];
    this.promiseCount = 0;
    mStub.restore();
};

PromiseHelpers.prototype.queueTestPromise = function(promise) {
    this._testIsWaitingForPromises.push(promise);

    return promise;
};

PromiseHelpers.prototype.testWaitForAllPromises = function(doneCb) {
    return MegaPromise.allDone(this._testIsWaitingForPromises).always(function() {
        doneCb();
    });
};

PromiseHelpers.prototype.failTestIfPromiseTimeouts = function(promise, timeoutMs, promiseName) {
    if (!promiseName) {
        promiseName = "promise#" + this.promiseCount++;
    }

    var timer = null;

    timer = setTimeout(function() {
        internalAssert(false, 'Promise ' + promiseName + ' timed out for this test.');

        // force reject, so that the test can finish.
        promise.reject();
    }, timeoutMs);

    promise.always(function() {
        clearTimeout(timer);
    });

    return promise;
};

PromiseHelpers.prototype.expectPromiseToBeResolved = function(promise, promiseResolvedValue, promiseName) {
    if (!promiseName) {
        promiseName = "promise#" + this.promiseCount++;
    }

    promise
        .done(function(r) {
            var eql = JSON.stringify(r) === JSON.stringify(promiseResolvedValue);
            internalAssert(eql, 'Promise ' + promiseName + ' was not resolved with the ' +
                'expected value of: ' + JSON.stringify(promiseResolvedValue) + ', but with: ' + JSON.stringify(r) +
                ', promise pre stack: ' + promise.stack);
        })
        .fail(function(e) {
            internalAssert(false, 'Promise ' + promiseName + ' failed with error: ' + JSON.stringify(e) +
                ', promise pre stack: ' + promise.stack);
        });

    this.failTestIfPromiseTimeouts(promise, 5000, promiseName);


    this.queueTestPromise(promise);
    return promise;
};

PromiseHelpers.prototype.expectPromiseToFail = function(promise, promiseFailedValue, promiseName) {
    if (!promiseName) {
        promiseName = "promise#" + this.promiseCount++;
    }

    promise
        .done(function(r) {
            internalAssert(false, 'Promise ' + promiseName + ' resolved with value: ' + JSON.stringify(r) +
                ', promise pre stack: ' + promise.stack);
        })
        .fail(function(e) {
            internalAssert(JSON.stringify(e) === JSON.stringify(promiseFailedValue),
                'Promise ' + promiseName + ' did not failed with the ' +
                'expected value of: ' + JSON.stringify(promiseFailedValue) + ', but with: ' + JSON.stringify(e) +
                ', promise pre stack: ' + promise.stack);
        });

    this.failTestIfPromiseTimeouts(promise, 1000, promiseName);

    this.queueTestPromise(promise);
    return promise;
};


PromiseHelpers.prototype.promiseQueue = function() {
    return MegaPromise.QueuedPromiseCallbacks();
};
