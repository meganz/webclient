/**
 * @fileOverview
 * Test of the `time_checker` module.
 */

 describe("time_checker unit test", function() {
    "use strict";
    var assert = chai.assert;
    var ns = stringcrypt;

    const WEEK_SECONDS = 7 * 24 * 60 * 60;
    const FORTNIGHT_SECONDS = 2 * WEEK_SECONDS; // 2 WEEKS
    const MONTH_SECONDS = 2 * FORTNIGHT_SECONDS;

    const TYPE_WEEK = 0;
    const TYPE_FORTNIGHT = 1;
    const TYPE_MONTH = 2;

    const TIMES_WEEK = 5;
    const TIMES_FORTNIGHT = 5;

    afterEach(function() {
        mStub.restore();
    });

    describe('time_checker week test', function() {
        it("increments time within limit", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test1');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns(null);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true; // First
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.true; // Second
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(2);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.true; // Third
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(3);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.true; // Fourth
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(4);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.true; // Fifth

            // More than limit
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(5);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.false;
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(6);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.false;
        });

        it("changes type after time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test2');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (WEEK_SECONDS + 1),
                6,
                TYPE_WEEK
            ]);
            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true;
            timeChecker.update();
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.shouldShow()).to.be.true;
        });

        it("changes type before time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test3');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                (Date.now() + 10) - WEEK_SECONDS,
                5,
                TYPE_WEEK
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.false;
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(6);
            expect(timeChecker.getType()).to.eql(TYPE_WEEK);
            expect(timeChecker.shouldShow()).to.be.false;
        });
    });

    describe('time_checker fortnight test', function() {
        it("increments time within limit", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test4');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (WEEK_SECONDS + 1),
                6,
                TYPE_WEEK
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true; // First
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.true; // Second
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(2);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.true; // Third
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(3);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.true; // Fourth
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(4);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.true; // Fifth

            // More than limit
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(5);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.false;
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(6);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.false;
        });

        it("changes type after time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test5');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (FORTNIGHT_SECONDS + 1),
                6,
                TYPE_FORTNIGHT
            ]);
            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true;
            timeChecker.update();
            expect(timeChecker.getType()).to.eql(TYPE_MONTH);
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.shouldShow()).to.be.false; // Once a month
        });

        it("changes type before time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test6');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                (Date.now() + 10) - FORTNIGHT_SECONDS,
                5,
                TYPE_FORTNIGHT
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.false;
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(6);
            expect(timeChecker.getType()).to.eql(TYPE_FORTNIGHT);
            expect(timeChecker.shouldShow()).to.be.false;
        });
    });

    describe('time_checker month test', function() {
        it("increments time within limit", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test7');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (FORTNIGHT_SECONDS + 1),
                6,
                TYPE_FORTNIGHT
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true; // First
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.getType()).to.eql(TYPE_MONTH);
            expect(timeChecker.shouldShow()).to.be.false; // Second
        });

        it("changes type after time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test8');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (MONTH_SECONDS + 1),
                1,
                TYPE_MONTH
            ]);
            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.true;
            timeChecker.update();
            expect(timeChecker.getType()).to.eql(TYPE_MONTH);
            expect(timeChecker.getTimes()).to.eql(1);
            expect(timeChecker.shouldShow()).to.be.false; // Once a month
        });

        it("changes type before time elapsed", async function() {
            const timeCheckerContext = new mega.TimeChecker.Context('test9');
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                (Date.now() + 10) - MONTH_SECONDS,
                1,
                TYPE_MONTH
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            await timeChecker.init();

            expect(timeChecker.shouldShow()).to.be.false;
            timeChecker.update();
            expect(timeChecker.getTimes()).to.eql(2);
            expect(timeChecker.getType()).to.eql(TYPE_MONTH);
            expect(timeChecker.shouldShow()).to.be.false;
        });
    });

     /**
      describe('time_checker delay test', function() {
        it("saves within delay", function(done) {
            const timeCheckerContext = new mega.TimeChecker.Context('test10', null, 300);
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (FORTNIGHT_SECONDS + 1),
                6,
                TYPE_FORTNIGHT
            ]);

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            timeChecker.init().finally(() => {
                expect(timeChecker.shouldShow()).to.be.true; // First
                const currentTimestamp = Date.now();

                new Promise((resolve, reject) => {
                    timeChecker.delayedUpdate(function () {
                        const recentTimestamp = Date.now();
                        const delta = recentTimestamp - currentTimestamp;
                        expect(delta > 300).to.be.true;
                        expect(timeChecker.getTimes()).to.eql(1);
                        expect(timeChecker.getType()).to.eql(TYPE_MONTH);
                        expect(timeChecker.shouldShow()).to.be.false;

                        done();
                        resolve();
                    });
                });
            });
        });
    });
      /**/

    describe('time_checker allow save callback test', function() {
        it("save on context", function(done) {
            const timeCheckerContext = new mega.TimeChecker.Context('test11', function () {
                return true;
            });
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (FORTNIGHT_SECONDS + 1),
                6,
                TYPE_FORTNIGHT
            ]);

            let save = 0;
            let oldSave = timeCheckerContext.save;
            timeCheckerContext.save = () => {
                save++;
            }

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            timeChecker.init().finally(() => {
                expect(timeChecker.shouldShow()).to.be.true; // First
                timeChecker.update();

                expect(timeChecker.getTimes()).to.eql(1);
                expect(save).to.eql(1);
                expect(timeChecker.getType()).to.eql(TYPE_MONTH);
                expect(timeChecker.shouldShow()).to.be.false; // Second

                timeCheckerContext.save = oldSave;
                done();
            });
        });

        it("not save on context", function(done) {
            const timeCheckerContext = new mega.TimeChecker.Context('test12', function () {
                return false;
            });
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([
                Date.now() - (FORTNIGHT_SECONDS + 1),
                6,
                TYPE_FORTNIGHT
            ]);

            let save = 0;
            let oldSave = timeCheckerContext.save;
            timeCheckerContext.save = () => {
                save++;
            }

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            timeChecker.init().finally(() => {
                expect(timeChecker.shouldShow()).to.be.true; // First
                timeChecker.update();
                expect(save).to.eql(0);
                timeCheckerContext.save = oldSave;
                done();
            });
        });
    });

     /**
      describe('time_checker allow save callback with delay test', function() {
        it("save on context", function(done) {
            let updated = false;
            const timeCheckerContext = new mega.TimeChecker.Context('test13', () => {
                return !updated;
            }, 300);
            sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([]);

            // let save = 0;
            // let oldSave = timeCheckerContext.save;

            // timeCheckerContext.save = () => {
            //     save++;
            // }

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            timeChecker.init().finally(() => {
                expect(timeChecker.shouldShow()).to.be.true; // First
                const currentTimestamp = Date.now();

                timeChecker.update();
                updated = true;

                new Promise((resolve, reject) => {
                    timeChecker.delayedUpdate(function () {
                        const recentTimestamp = Date.now();
                        const delta = recentTimestamp - currentTimestamp;
                        expect(delta > 300).to.be.true; // Second
                        //expect(save).to.eql(1);
                        expect(timeChecker.getTimes()).to.eql(1);
                        expect(timeChecker.getType()).to.eql(TYPE_WEEK);
                        expect(timeChecker.shouldShow()).to.be.true;

                        // timeCheckerContext.save = oldSave;
                        done();
                        resolve();
                    });
                });
            });
        });
    });
      /**/

    describe('time_checker check hasUpdated', function() {
        it("save on context", function(done) {
            let updated = false;
            const timeCheckerContext = new mega.TimeChecker.Context('test14', () => {
                return !updated;
            }, 300);
            //sinon.stub(timeCheckerContext, 'save').returns('');
            sinon.stub(timeCheckerContext, 'get').returns([]);

            let save = 0;
            let oldSave = timeCheckerContext.save;
            timeCheckerContext.save = () => {
                save++;
            }

            const timeChecker = new mega.TimeChecker(timeCheckerContext);
            timeChecker.init().finally(() => {
                expect(timeChecker.shouldShow()).to.be.true; // First

                timeChecker.update();
                expect(timeChecker.hasUpdated()).to.be.true;
                expect(timeChecker.requestId).to.eql(requesti);
                expect(timeChecker.getTimes()).to.eql(1);
                expect(save).to.eql(1);
                timeCheckerContext.save = oldSave;
                done();
            });
        });
    });
});
