const test = require('ava'),
    webdriver = require('selenium-webdriver'),
    Eyes = require("../index").Eyes,
    ConsoleLogHandler = require("../index").ConsoleLogHandler,
    FixedCutProvider = require("../index").FixedCutProvider;

let driver = null, eyes = null, promise = null;

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
        eyes.setImageCut(new FixedCutProvider(20, 20, 20, 20)); // cut params: header, footer, left, right.
        eyes.checkWindow("Full window without 20px border");
        t.pass();
        return driver;
    });
});