import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, StitchMode} from '../index';

const appName = "Eyes.Selenium.JavaScript - elements-frames";
let driver = null, eyes = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new ConsoleLogHandler(true));
    eyes.setStitchMode(StitchMode.CSS);
    eyes.setForceFullPageScreenshot(true);
});

test.beforeEach(t => {
    const testName = t.title.replace("beforeEach for ", "");
    return eyes.open(driver, appName, testName, {width: 1000, height: 700}).then(function (browser) {
        driver = browser;
    });
});

test('TestHtmlPages with frames', () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    eyes.checkWindow("Initial");

    eyes.checkElementBy(webdriver.By.id("overflowing-div"), null, "Initial");

    eyes.checkRegionInFrame("frame1", webdriver.By.id("inner-frame-div"), null, "Inner frame div", true);

    eyes.checkElementBy(webdriver.By.id("overflowing-div-image"), null, "minions");

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
