var Eyes = require('../index').Eyes;
var ConsoleLogHandler = require('../index').ConsoleLogHandler;
var FixedCutProvider = require('../index').FixedCutProvider;

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

    it("Simple methods on TestHtmlPages", function(done) {
        browser.get("https://astappev.github.io/test-html-pages/");

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
