var page, doSearch, displayResults;
page = require('webpage').create();

doSearch = function() {
    console.log('Searching...');
    page.evaluate(function() {
	var xml = "<asd type='asdType'><body>hey</body></asd>";
	console.log($);
	console.log($.parseXML(xml).documentElement.tagName);			
        console.log($.parseXML(xml).documentElement.getAttribute("type"));
        return true;
    });
};


page.onLoadFinished = function(status) {
    if (status === 'success') {
        page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js', function() {
            if (!phantom.state) {
                doSearch();
		phantom.state = 'done';
            } else {
                phantom.exit();
            }
        });
    } else {
        console.log('Connection failed.');
        phantom.exit();
    }
};

page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.open('http://example.com');
