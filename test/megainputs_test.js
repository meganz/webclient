/**
 * @fileOverview
 * Notifications unit tests.
 */

describe("MegaInputs Unit Test", function() {
    "use strict";

    it("can trigger input change", function(done) {
        let $inputElement = $('<input/>');
        let $megaInput = new mega.ui.MegaInputs($inputElement);
        let changeCounter = 0;

        $inputElement.on('change', function () {
            changeCounter++;
        });

        setTimeout(function () {
            $megaInput.setValue('test');
            expect(changeCounter).to.eql(1);
            expect($inputElement.val()).to.eql('test');
            done();
        }, 1);
    });

    it("can trigger input change for underlinedText", function(done) {
        let $parentElement = $('<div/>');
        let $inputElement = $('<input/>');
        let $inputElementPrev = $('<input/>');
        $inputElementPrev.addClass('no-trans');

        $parentElement.prepend($inputElement);
        $parentElement.prepend($inputElementPrev);

        let $megaInput = new mega.ui.MegaInputs($inputElement);
        $megaInput.underlinedText();

        sinon.spy($megaInput, 'hideError');
        let changeCounter = 0;

        $inputElement.on('change', function () {
            changeCounter++;
        });

        $inputElement.on('change', function () {
            changeCounter++;
        });

        setTimeout(function () {
            let onIdleBak = onIdle;
            $megaInput.setValue('test');

            onIdle = function (callback) {
                callback();
                changeCounter++;
                expect($inputElementPrev.hasClass('no-trans')).to.be.false;
                onIdle = onIdleBak;
            }

            expect($megaInput.hideError.callCount).to.eql(1);
            expect(changeCounter).to.eql(2);
            expect($inputElement.val()).to.eql('test');
            done();
        }, 1);
    });
});
