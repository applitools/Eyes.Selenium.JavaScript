import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, FixedCutProvider} from '../index';

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

test('CutProvider test - GitHub', t => {
    return eyes.open(driver, "Eyes Selenium SDK - cutprovider", t.title, {width: 1000, height: 700}).then(function (driver) {
        driver.get('https://github.com');

        eyes.setImageCut(new FixedCutProvider(60, 100, 50, 10)); // cut params: header, footer, left, right.
        eyes.checkWindow("Full window without 20px border");

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
