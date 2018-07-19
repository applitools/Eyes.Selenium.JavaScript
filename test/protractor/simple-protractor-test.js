var SeleniumSDK = require('../../index');
var Eyes = SeleniumSDK.Eyes;
var ConsoleLogHandler = SeleniumSDK.ConsoleLogHandler;
var FixedCutProvider = SeleniumSDK.FixedCutProvider;

var eyes;

describe("Eyes.Selenium.JavaScript - Protractor", function() {

    beforeAll(function(){
        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
        eyes.getLogHandler().setPrintSessionId(true);
    });

    beforeEach(function(done){
        eyes.open(browser, global.appName, global.testName, {width: 800, height: 560}).then(function () {
            done();
        });
    });

    it("simple protractor", function(done) {
        browser.get("https://astappiev.github.io/test-html-pages/");

        eyes.addProperty("MyProp", "I'm correct!");

        // cut params: header, footer, left, right.
        eyes.setImageCut(new FixedCutProvider(60, 100, 50, 120));

        eyes.checkWindow("Entire window");

        element(by.name("name")).sendKeys("Test User");
        element(by.name("email")).sendKeys("username@example.com");
        element(by.id("submit-form")).click();

        eyes.checkWindow("Entire window with cut borders");

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
