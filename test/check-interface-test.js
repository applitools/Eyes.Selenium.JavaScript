import test from 'ava';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import {Eyes, ConsoleLogHandler, Target} from '../index';

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

test('CheckInterface test - example', t => {
    return eyes.open(driver, "Eyes Selenium SDK - check-interface", t.title, {width: 1000, height: 700}).then(function (driver) {
        driver.get('https://astappev.github.io/test-html-pages/');

        // Entire window
        eyes.check("Entire window", Target.Window().ignore({left: 50, top: 150, width: 50, height: 50}, {left: 150, top: 175, width: 50, height: 50}));

        // Region by rect
        eyes.check("Region by rect", Target.Region({left: 50, top: 50, width: 200, height: 200})
            .floating({left: 50, top: 50, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
            .floating({left: 150, top: 75, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10}));

        // Region by element
        eyes.check("Region by element", Target.Region(driver.findElement(webdriver.By.id("overflowing-div"))));

        // Entire content of element
        eyes.check("Entire element", Target.Region(webdriver.By.id("overflowing-div")).stitchContent(true));

        // Entire region in frame
        eyes.check("Entire region in frame", Target.Region(webdriver.By.id("inner-frame-div"), "frame1").stitchContent(true));

        // Entire frame content
        eyes.check("Entire frame", Target.Frame("frame1"));

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
