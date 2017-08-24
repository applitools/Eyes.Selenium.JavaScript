import test from 'ava';
import {Builder as WebDriverBuilder, By} from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler, Target, MatchLevel, StitchMode} from '../index';

const appName = "Eyes.Selenium.JavaScript - check-interface";
let driver = null, eyes = null;

test.before(() => {
    driver = new WebDriverBuilder()
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

test("Different check methods on TestHtmlPages", () => {
    driver.get("https://astappev.github.io/test-html-pages/");

    // Entire window, equivalent to eyes.checkWindow()
    eyes.check("Entire window", Target.window()
        .matchLevel(MatchLevel.Layout)
        .ignore(By.id("overflowing-div"))
        .ignore({element: driver.findElement(By.name("frame1"))})
        .ignore({left: 400, top: 100, width: 50, height: 50}, {left: 400, top: 200, width: 50, height: 100})
        .floating({left: 500, top: 100, width: 75, height: 100, maxLeftOffset: 25, maxRightOffset: 10, maxUpOffset: 30, maxDownOffset: 15})
        .floating({element: By.id("overflowing-div-image"), maxLeftOffset: 5, maxRightOffset: 25, maxUpOffset: 10, maxDownOffset: 25})
        // .floating({element: driver.findElement(By.tagName("h1")), maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
    );

    // Region by rect, equivalent to eyes.checkFrame()
    eyes.check("Region by rect", Target.region({left: 50, top: 50, width: 200, height: 200})
        // .floating({left: 50, top: 50, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
        // .floating({left: 150, top: 75, width: 60, height: 50, maxLeftOffset: 10, maxRightOffset: 10, maxUpOffset: 10, maxDownOffset: 10})
    );

    // Region by element, equivalent to eyes.checkRegionByElement()
    eyes.check("Region by element", Target.region(driver.findElement(By.css("body > h1"))));

    // Region by locator, equivalent to eyes.checkRegionBy()
    eyes.check("Region by locator", Target.region(By.id("overflowing-div-image")));

    // Entire element by element, equivalent to eyes.checkElement()
    eyes.check("Entire element by element", Target.region(driver.findElement(By.id("overflowing-div-image"))).fully());

    // Entire element by locator, equivalent to eyes.checkElementBy()
    eyes.check("Entire element by locator", Target.region(By.id("overflowing-div")).fully());

    // Entire frame by locator, equivalent to eyes.checkFrame()
    eyes.check("Entire frame by locator", Target.frame(By.name("frame1")));

    // Entire region in frame by frame name and region locator, equivalent to eyes.checkRegionInFrame()
    eyes.check("Entire region in frame by frame name and region locator", Target.region(By.id("inner-frame-div"), "frame1").fully());

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
