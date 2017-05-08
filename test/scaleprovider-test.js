import test from 'ava';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import {Eyes, ConsoleLogHandler} from '../index';

const testName = "Eyes.Selenium.JavaScript - scaleprovider";
let driver = null, eyes = null;

test.before(() => {
    const options = new chrome.Options().addArguments("--force-device-scale-factor=1.25");
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
    eyes.setForceFullPageScreenshot(true);
});

test('GitHub with scaling', t => {
    return eyes.open(driver, testName, t.title, {width: 1000, height: 700}).then(function (driver) {
        driver.get('https://astappev.github.io/test-html-pages/');

        eyes.checkWindow("Initial");
        eyes.checkElementBy(webdriver.By.id("overflowing-div"), null, "Text block");

        return eyes.close();
    }).catch(function (err) {
        t.fail(err.message);
    });
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
