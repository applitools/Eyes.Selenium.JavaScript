import test from 'ava';
import {Builder as WebDriverBuilder} from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler} from '../index';

const appName = "Eyes.Selenium.JavaScript - appium";
let driver = null, eyes = null;

test.before(() => {
    driver = new WebDriverBuilder()
        .withCapabilities({
            'platformName': 'Android',
            'deviceName': 'android-24-google_apis-x86_64-v24.4.1-wd-manager',
            'platformVersion': '7.0',
            'app': 'http://saucelabs.com/example_files/ContactManager.apk',
            'browserName': '',
            'clearSystemFiles': 'true',
            'noReset': 'true'
        })
        .usingServer('http://localhost:4723/wd/hub')
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

test("test check window in Contacts app", () => {

    eyes.checkWindow("Contact list!");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
