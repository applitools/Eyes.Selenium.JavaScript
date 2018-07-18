var webdriver = require('selenium-webdriver');
var Builder = webdriver.Builder;

var SeleniumSDK = require('../../index');
var Eyes = SeleniumSDK.Eyes;
var ConsoleLogHandler = SeleniumSDK.ConsoleLogHandler;

var serverUrl = "http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com:80/wd/hub";

var driver = null, eyes = null;
describe('Eyes.Selenium.JavaScript - IOS Simple Appium via SauseLab', function () {

    this.timeout(5 * 60 * 1000);

    before(function () {
        driver = new Builder()
        /*.withCapabilities({
            'screenResolution': '1600x1200',
            'version': '10.0',
            'platform': 'macOS 10.12',
            'browserName': 'Safari'
        })*/
            .withCapabilities({
                'appiumVersion': '1.6.4',
                'deviceName': 'iPhone SE Simulator',
                'deviceOrientation': 'landscape',
                'platformVersion': '10.3',
                'platformName': 'iOS',
                'browserName': 'Safari'
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
        driver.get('https://astappiev.github.io/test-html-pages/');

        eyes.checkWindow("Entire window");

        return eyes.close();
    });

    afterEach(function () {
        return driver.quit().then(function () {
            return eyes.abortIfNotClosed();
        });
    });
});
