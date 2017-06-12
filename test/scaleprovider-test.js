import test from 'ava';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import {Eyes, ConsoleLogHandler} from '../index';

const appName = "Eyes.Selenium.JavaScript - scaleprovider";
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

test.beforeEach(t => {
    const testName = t.title.replace("beforeEach for ", "");
    return eyes.open(driver, appName, testName, {width: 1000, height: 700}).then(function (browser) {
        driver = browser;
    });
});

test('TestHtmlPages with scaling', () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    eyes.checkWindow("Initial");

    eyes.checkElementBy(webdriver.By.id("overflowing-div"), null, "Text block");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
