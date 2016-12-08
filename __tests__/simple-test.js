const test = require('ava'),
    webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until,
    eyesSelenium = require("../index");

const ScaleMethod = eyesSelenium.ScaleMethod,
    StitchMode = eyesSelenium.Eyes.StitchMode;

let driver = null,
    eyes = null,
    promise = null;

test.before(() => {
    const options = new chrome.Options().addArguments("--force-device-scale-factor=1.25");
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    eyes = new eyesSelenium.Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new eyesSelenium.ConsoleLogHandler(true));
    eyes.setStitchMode(StitchMode.CSS);
    eyes.setForceFullPageScreenshot(true);
    eyes.setScaleMethod(ScaleMethod.SPEED);
});

test.beforeEach(t => {
    const testTitle = t.title.replace('beforeEach for ', '');
    promise = eyes.open(driver, "Eyes Selenium SDK", testTitle);
    return promise;
});

test.afterEach(() => {
    return promise.then(function (driver) {
        eyes.close();
        return driver;
    });
});

test.after(() => {
    return promise.then(function (driver) {
        driver.quit();
        eyes.abortIfNotClosed();
    });
});

test('home1', t => {
    return promise.then(function (driver) {
        driver.get('https://astappev.github.io/test-html-pages/');
        eyes.checkWindow("Initial");
        eyes.checkElementBy(By.id("overflowing-div"), null, "Initial");
        eyes.checkRegionInFrame("frame1", By.id("inner-frame-div"), null, "Inner frame div", true);
        eyes.checkElementBy(By.id("overflowing-div-image"), null, "minions");
        t.pass();
        return driver;
    });
});