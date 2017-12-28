import test from 'ava';
import {Builder as WebDriverBuilder} from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler} from '../index';

const serverUrl = "http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com:80/wd/hub";
const appName = "Eyes.Selenium.JavaScript - simple";
let driver = null, eyes = null;

test.before(() => {
    driver = new WebDriverBuilder()
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

test.beforeEach(t => {
    const testName = t.title.replace("beforeEach for ", "");
    return eyes.open(driver, appName, testName).then(function (browser) {
        driver = browser;
    });
});

test("Simple methods on TestHtmlPages", () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    eyes.checkWindow("Entire window");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
