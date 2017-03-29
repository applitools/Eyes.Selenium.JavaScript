import test from 'ava';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import {Eyes, ConsoleLogHandler} from '../index';

let driver = null, eyes = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
    eyes.setStitchMode(Eyes.StitchMode.CSS);
    eyes.setForceFullPageScreenshot(true);
});

test('ElementsFramesTest - example', t => {
    return eyes.open(driver, "Eyes Selenium SDK - elements-frames", t.title, {width: 1000, height: 700}).then(function (driver) {
        driver.get('https://astappev.github.io/test-html-pages/');

        eyes.checkWindow("Initial");
        eyes.checkElementBy(webdriver.By.id("overflowing-div"), null, "Initial");
        eyes.checkRegionInFrame("frame1", webdriver.By.id("inner-frame-div"), null, "Inner frame div", true);
        eyes.checkElementBy(webdriver.By.id("overflowing-div-image"), null, "minions");

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
