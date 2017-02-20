const test = require('ava'),
    webdriver = require('selenium-webdriver'),
    eyesSelenium = require("../index");

let driver = null, eyes = null, promise = null;

test.before(() => {
    driver = new webdriver.Builder()
        .forBrowser('chrome')
        .usingServer('http://localhost:4444/wd/hub')
        .build();

    eyes = new eyesSelenium.Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new eyesSelenium.ConsoleLogHandler(true));
});

test.beforeEach(t => {
    const testTitle = t.title.replace('beforeEach for ', '');
    promise = eyes.open(driver, "CutProvider test", testTitle, {width: 1000, height: 700});
    return promise;
});

test.afterEach(() => {
    return promise.then(function (driver) {
        eyes.close();
        return driver;
    });
});

test.after.always(() => {
    return promise.then(function (driver) {
        driver.quit();
        eyes.abortIfNotClosed();
    });
});

test('test1', t => {
    return promise.then(function (driver) {
        driver.get('https://github.com');
        eyes.setImageCut(new eyesSelenium.FixedCutProvider(20, 20, 20, 20));
        eyes.checkWindow("Full window without 20px border");
        t.pass();
        return driver;
    });
});