var test = require('ava');
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
var eyesSelenium = require("../index");

var driver = null;
var eyes = null;
var promise = null;

test.before(() => {
    driver = new webdriver.Builder().withCapabilities(webdriver.Capabilities.chrome()).build();

    eyes = new eyesSelenium.Eyes();
    eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    eyes.setLogHandler(new eyesSelenium.ConsoleLogHandler(true));
    eyes.setStitchMode(eyesSelenium.Eyes.StitchMode.CSS);
    eyes.setForceFullPageScreenshot(true);
});

test.beforeEach(t => {
    var testTitle = t.title.replace('beforeEach for ', '');
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