var webdriver = require('selenium-webdriver');
var Builder = webdriver.Builder;

var SeleniumSDK = require('../../index');
var Eyes = SeleniumSDK.Eyes;
var ConsoleLogHandler = SeleniumSDK.ConsoleLogHandler;

var serverUrl = "http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com:80/wd/hub";

var driver = null, eyes = null;
describe('Eyes.Selenium.JavaScript - IOS Native Appium via SauseLab', function () {

    this.timeout(5 * 60 * 1000);

    before(function () {
        driver = new Builder()
            .withCapabilities({
                'platformName': 'iOS',
                'deviceName': 'iPhone 7 Simulator',
                'platformVersion': '10.0',
                'app': 'https://store.applitools.com/download/iOS.TestApp.app.zip',
                'browserName': '',
                'clearSystemFiles': 'true',
                'noReset': 'true'
            })
            .usingServer(serverUrl)
            .build();

        eyes = new Eyes();
        eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
        eyes.setLogHandler(new ConsoleLogHandler(true));
    });

    beforeEach(function () {
        var appName = this.test.parent.title;
        var testName = this.currentTest.title;

        return eyes.open(driver, appName, testName).then(function (browser) {
            driver = browser;
        });
    });

    it("check window base", function () {

        eyes.checkWindow("Entire window");

        return eyes.close();
    });

    afterEach(function () {
        return driver.quit().then(function () {
            return eyes.abortIfNotClosed();
        });
    });
});
