var Eyes = require('../index').Eyes;
var ConsoleLogHandler = require('../index').ConsoleLogHandler;

var eyes;

describe("Eyes.Selenium.JavaScript - simple", function() {

    beforeAll(function(){
        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
    });

    beforeEach(function(done){
        eyes.open(browser, global.appName, global.testName, {width: 800, height: 560}).then(function () {
            done();
        });
    });

    it("TestHtmlPages simple", function(done) {
        browser.get('https://astappev.github.io/test-html-pages/');

        eyes.addProperty("MyProp", "I'm correct!");

        eyes.checkWindow("Entire window");

        eyes.checkRegionByElement(element(by.css('body > h1')), 'logo heading');

        eyes.checkRegionBy(by.id('overflowing-div-image'), 'single part of image');

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
