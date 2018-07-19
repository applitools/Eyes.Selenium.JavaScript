var webdriver = require('selenium-webdriver');
var Builder = webdriver.Builder;

var SeleniumSDK = require('../../index');
var Eyes = SeleniumSDK.Eyes;
var ConsoleLogHandler = SeleniumSDK.ConsoleLogHandler;

var serverUrl = "http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com:80/wd/hub";

var driver = null, eyes = null;
describe('Eyes.Selenium.JavaScript - Android Native Appium via SauseLab', function () {

    this.timeout(5 * 60 * 1000);

    before(function () {
        driver = new Builder()
            .withCapabilities({
                'platformName': 'Android',
                'deviceName': 'android-24-google_apis-x86_64-v24.4.1-wd-manager',
                'platformVersion': '6.0',
                'app': 'http://saucelabs.com/example_files/ContactManager.apk',
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

        eyes.checkWindow("Contact list!");

        return eyes.close();
    });

    afterEach(function () {
        return driver.quit().then(function () {
            return eyes.abortIfNotClosed();
        });
    });
});
