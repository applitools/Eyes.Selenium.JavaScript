import test from 'ava';
import webdriver from 'selenium-webdriver';
import {Eyes, ConsoleLogHandler} from '../index';

const appName = "Eyes.Selenium.JavaScript - simple";
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
    return eyes.open(driver, appName, testName, {width: 800, height: 560}).then(function (browser) {
        driver = browser;
    });
});

test('TestHtmlPages simple', () => {
    driver.get('https://astappev.github.io/test-html-pages/');

    eyes.addProperty("MyProp", "I'm correct!");

    eyes.checkWindow("Entire window");

    eyes.checkRegionByElement(driver.findElement(webdriver.By.css('body > h1')), 'logo heading');

    eyes.checkRegionBy(webdriver.By.id('overflowing-div-image'), 'single part of image');

    return eyes.close();
});

test.after.always(() => {
    return driver.quit().then(function () {
        return eyes.abortIfNotClosed();
    });
});
