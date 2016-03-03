describe("time2lastSeparator Unit Test", function() {
    var today;
    beforeEach(function(done) {
        today = "2015-11-11T22:01:01.000Z";
        done();
    });


    afterEach(function(done) {
        done();
    });

    it("basic test", function() {
        // Today;
        expect(time2lastSeparator(today, today)).to.eql(l[1301]);
        expect(time2lastSeparator("2015-11-11T22:01:01.000Z", today)).to.eql(l[1301]);

        // Yesterday;
        expect(time2lastSeparator("2015-11-11T07:30:25.000Z", today)).to.eql(l[1302]);
        expect(time2lastSeparator("2015-11-10T22:01:01.000Z", today)).to.eql(l[1302]);

        // This week
        expect(time2lastSeparator("2015-11-08T22:01:01.000Z", today)).to.eql(l[1303]);
        expect(time2lastSeparator("2015-11-09T22:01:01.000Z", today)).to.eql(l[1303]);
        
        // Last week
        expect(time2lastSeparator("2015-11-07T22:01:01.000Z", today)).to.eql(l[1304]);
        expect(time2lastSeparator("2015-11-04T22:01:01.000Z", today)).to.eql(l[1304]);
        expect(time2lastSeparator("2015-11-05T21:59:01.000Z", today)).to.eql(l[1304]);

        // This month
        expect(time2lastSeparator("2015-11-01T02:01:01.000Z", today)).to.eql(l[1305]);
        
        // This year
        expect(time2lastSeparator("2015-10-26T01:59:01.000Z", today)).to.eql(l[1306]);
        expect(time2lastSeparator("2015-09-30T22:00:00.000Z", today)).to.eql(l[1306]);
        expect(time2lastSeparator("2015-09-30T22:00:01.000Z", today)).to.eql(l[1306]);

        // Older
        expect(time2lastSeparator("2014-12-30T22:00:01.000Z", today)).to.eql(l[1307]);
        expect(time2lastSeparator("2014-11-30T22:00:01.000Z", today)).to.eql(l[1307]);
    });
});
