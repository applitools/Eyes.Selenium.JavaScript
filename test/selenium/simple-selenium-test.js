require('chromedriver');
var webdriver = require('selenium-webdriver');
var Builder = webdriver.Builder;

var EyesSDK = require('eyes.sdk');
var ConsoleLogHandler = EyesSDK.ConsoleLogHandler;
var FixedCutProvider = EyesSDK.FixedCutProvider;
var Eyes = require('../../src/Eyes');

var driver = null, eyes = null;
describe('Eyes.Selenium.JavaScript - Selenium', function () {

    this.timeout(5 * 60 * 1000);

    before(function () {
        driver = new Builder()
            .forBrowser('chrome')
            .build();

        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
    });

    beforeEach(function () {
        var appName = this.test.parent.title;
        var testName = this.currentTest.title;

        return eyes.open(driver, appName, testName, {width: 800, height: 560}).then(function (browser) {
            driver = browser;
        });
    });

    it("simple selenium", function () {
        driver.get('https://astappev.github.io/test-html-pages/');

        eyes.addProperty("MyProp", "I'm correct!");

        eyes.checkWindow("Entire window");

        // cut params: header, footer, left, right.
        eyes.setImageCut(new FixedCutProvider(60, 100, 50, 120));

        eyes.checkWindow("Entire window with cut borders");

        return eyes.close();
    });

    afterEach(function () {
        return driver.quit().then(function () {
            return eyes.abortIfNotClosed();
        });
    });
});
