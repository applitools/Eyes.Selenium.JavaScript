var Eyes = require('../index').Eyes;
var ConsoleLogHandler = require('../index').ConsoleLogHandler;
var StitchMode = require('../index').StitchMode;

var eyes;

describe("Eyes.Selenium.JavaScript - scaleprovider", function() {

    beforeAll(function(){
        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
        eyes.setStitchMode(StitchMode.CSS);
        eyes.setForceFullPageScreenshot(true);
    });

    beforeEach(function(done){
        eyes.open(browser, global.appName, global.testName, {width: 1000, height: 700}).then(function () {
            done();
        });
    });

    it("TestHtmlPages with scaling", function(done) {
        browser.get('https://astappev.github.io/test-html-pages/');

        eyes.checkWindow("Initial");

        eyes.checkElementBy(by.id("overflowing-div"), null, "Text block");

        eyes.close().then(function () {
            done();
        });
    });

    afterEach(function(done) {
        eyes.abortIfNotClosed().then(function () {
            done();
        });
    });
});
