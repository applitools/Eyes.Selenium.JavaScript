import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, FixedCutProvider} from '../index';

const appName = "Eyes.Selenium.JavaScript - cutprovider";
let driver = null, eyes = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
});

test.beforeEach(t => {
    const testName = t.title.replace("beforeEach for ", "");
    return eyes.open(driver, appName, testName, {width: 1000, height: 700}).then(function (browser) {
        driver = browser;
    });
});

test('TestHtmlPages with ImageCut', () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    // cut params: header, footer, left, right.
    eyes.setImageCut(new FixedCutProvider(60, 100, 50, 120));

    eyes.checkWindow("Full window without 20px border");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
