var Eyes = require('../index').Eyes;
var ConsoleLogHandler = require('../index').ConsoleLogHandler;
var StitchMode = require('../index').StitchMode;

var eyes;

describe("Eyes.Selenium.JavaScript - scaling methods", function() {

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

    it("Using scaling methods on TestHtmlPages", function(done) {
        browser.get("https://astappev.github.io/test-html-pages/");

        eyes.checkWindow("Initial");

        eyes.checkElementBy(by.id("overflowing-div"), null, "Text block");

        eyes.checkElementBy(by.id("overflowing-div-image"), null, "Minions");

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
